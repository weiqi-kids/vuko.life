#!/usr/bin/env python3
import argparse
import json
from pathlib import Path
from typing import List

from playwright.sync_api import sync_playwright


def get_default_language(repo_root: Path) -> str:
    config_path = repo_root / "config.json"
    try:
        with config_path.open("r", encoding="utf-8") as f:
            data = json.load(f)
        return str(data.get("defaultLanguage", "en"))
    except Exception:
        return "en"


def get_all_languages(repo_root: Path) -> List[str]:
    """Return all language codes based on HTML files in the app directory."""
    app_dir = repo_root / "app"
    langs = sorted(p.stem for p in app_dir.glob("*.html") if p.stem != "index")
    if not langs:
        langs.append(get_default_language(repo_root))
    return langs


def capture_screenshot(url: str, path: Path) -> None:
    """Capture a full page screenshot and save to given path."""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(url)
        page.screenshot(path=str(path), full_page=True, type="jpeg", quality=80)
        browser.close()

def main() -> None:
    parser = argparse.ArgumentParser(description="Take screenshots for all languages")
    parser.add_argument("--out", help="output directory", default="screenshots")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[2]

    langs = get_all_languages(repo_root)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    failed = False
    for lang in langs:
        url = f"https://www.vuko.life/app/{lang}.html"
        try:
            outfile = out_dir / f"{lang}.jpg"
            capture_screenshot(url, outfile)
            print(f"Saved {outfile} ({outfile.stat().st_size} bytes)")
            print(f"Captured screenshot for {lang}")
        except Exception as e:
            print(f"Failed to capture screenshot for {lang}: {e}")
            failed = True

    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
