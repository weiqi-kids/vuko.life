import argparse
import base64
import json
import os
from pathlib import Path
from typing import List

import requests
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


def capture_screenshot(url: str, output: Path) -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(url)
        page.screenshot(path=str(output), full_page=True)
        browser.close()


def post_comment(token: str, repo: str, pr_number: str, body: str) -> None:
    api_url = f"https://api.github.com/repos/{repo}/issues/{pr_number}/comments"
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    resp = requests.post(api_url, headers=headers, json={"body": body})
    resp.raise_for_status()


def main() -> None:
    parser = argparse.ArgumentParser(description="Take screenshots for all languages and comment on PR")
    parser.add_argument("--token", help="GitHub token", default=os.environ.get("GITHUB_TOKEN"))
    parser.add_argument("--repo", help="repository", default=os.environ.get("GITHUB_REPOSITORY"))
    parser.add_argument("--pr", help="pull request number", default=os.environ.get("PR_NUMBER"))
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[2]
    if not (args.token and args.repo and args.pr):
        raise SystemExit("Missing required environment variables")

    langs = get_all_languages(repo_root)

    body_parts: List[str] = []
    for lang in langs:
        url = f"https://www.vuko.life/app/{lang}.html"
        out_file = repo_root / f"screenshot_{lang}.png"
        img_b64 = ""
        try:
            capture_screenshot(url, out_file)
            with out_file.open("rb") as f:
                img_b64 = base64.b64encode(f.read()).decode()
        except Exception as e:
            body_parts.append(f"### {lang}\nFailed to capture screenshot: {e}")
            continue
        finally:
            if out_file.exists():
                out_file.unlink()
        body_parts.append(f"### {lang}\n![screenshot](data:image/png;base64,{img_b64})")

    body = "\n\n".join(body_parts)
    post_comment(args.token, args.repo, args.pr, body)


if __name__ == "__main__":
    main()
