#!/usr/bin/env python3
import argparse
import json
import os
from io import BytesIO
from pathlib import Path
from typing import List

from PIL import Image
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


def capture_screenshot(url: str) -> bytes:
    """Capture a full page screenshot and return the raw PNG bytes."""
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(url)
        data = page.screenshot(full_page=True)
        browser.close()
    return data


def compress_image(
    data: bytes,
    width: int = 320,
    quality: int = 70,
    max_bytes: int = 60000,
) -> bytes:
    """Resize and convert PNG screenshot bytes to compressed JPEG under max size."""
    with Image.open(BytesIO(data)) as img:
        ratio = width / img.width
        height = int(img.height * ratio)
        img = img.resize((width, height))

        def try_save(im: Image.Image, q: int) -> bytes:
            buf = BytesIO()
            im.save(buf, format="JPEG", quality=q)
            return buf.getvalue()

        # progressively lower quality until size is acceptable
        for q in range(quality, 10, -10):
            out = try_save(img, q)
            if len(out) <= max_bytes:
                return out

        # if still too big, shrink width and retry
        for w in range(width - 40, 80, -40):
            ratio = w / img.width
            h = int(img.height * ratio)
            smaller = img.resize((w, h))
            for q in range(quality, 10, -10):
                out = try_save(smaller, q)
                if len(out) <= max_bytes:
                    return out

        # give up, return smallest attempt
        return try_save(img, 10)


def main() -> None:
    parser = argparse.ArgumentParser(description="Take screenshots for all languages")
    parser.add_argument("--out", help="output directory", default="output")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[2]

    langs = get_all_languages(repo_root)
    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    failed = False
    for lang in langs:
        url = f"https://www.vuko.life/app/{lang}.html"
        try:
            raw = capture_screenshot(url)
            compressed = compress_image(raw)
            (out_dir / f"screenshot-{lang}.jpg").write_bytes(compressed)
            print(f"Captured screenshot for {lang}")
        except Exception as e:
            print(f"Failed to capture screenshot for {lang}: {e}")
            failed = True

    if failed:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
