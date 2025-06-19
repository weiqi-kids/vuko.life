import argparse
import base64
import json
import os
from pathlib import Path
from typing import List
from io import BytesIO

from PIL import Image

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


def post_comment(token: str, repo: str, pr_number: str, body: str) -> bool:
    api_url = f"https://api.github.com/repos/{repo}/issues/{pr_number}/comments"
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    resp = requests.post(api_url, headers=headers, json={"body": body})
    if resp.status_code >= 300:
        print(f"Failed to post comment: {resp.status_code} {resp.text}")
        return False
    return True


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

    body_parts = []
    for lang in langs:
        url = f"https://www.vuko.life/app/{lang}.html"
        try:
            raw = capture_screenshot(url)
            compressed = compress_image(raw)
            img_b64 = base64.b64encode(compressed).decode()
            body_parts.append(f"### {lang}\n![screenshot](data:image/jpeg;base64,{img_b64})")
        except Exception as e:
            err = f"Failed to capture screenshot for {lang}: {e}"
            print(err)
            body_parts.append(f"### {lang}\n{err}")

    body = "\n\n".join(body_parts)
    if len(body.encode()) > 60000:
        print("Warning: comment body may be too large")
    success = post_comment(args.token, args.repo, args.pr, body)
    if not success:
        print("Failed to create PR comment")


if __name__ == "__main__":
    main()
