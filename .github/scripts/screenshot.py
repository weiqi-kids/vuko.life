import argparse
import base64
import json
import os
from pathlib import Path

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
    parser = argparse.ArgumentParser(description="Take screenshot and comment on PR")
    parser.add_argument("--lang", help="language code")
    parser.add_argument("--token", help="GitHub token", default=os.environ.get("GITHUB_TOKEN"))
    parser.add_argument("--repo", help="repository", default=os.environ.get("GITHUB_REPOSITORY"))
    parser.add_argument("--pr", help="pull request number", default=os.environ.get("PR_NUMBER"))
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[2]
    lang = args.lang or get_default_language(repo_root)
    if not (args.token and args.repo and args.pr):
        raise SystemExit("Missing required environment variables")

    url = f"https://www.vuko.life/app/{lang}.html"
    out_file = repo_root / "screenshot.png"
    capture_screenshot(url, out_file)

    with out_file.open("rb") as f:
        img_b64 = base64.b64encode(f.read()).decode()

    body = f"![screenshot](data:image/png;base64,{img_b64})"
    post_comment(args.token, args.repo, args.pr, body)


if __name__ == "__main__":
    main()
