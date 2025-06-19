#!/usr/bin/env python3
"""Comment debug suggestions on GitHub issues using OpenAI."""

from __future__ import annotations

import argparse
import os
import re
import time
from pathlib import Path
from typing import List

import requests
import openai

MAX_FILE_CHARS = 10000
# glob patterns for fallback when issue does not mention files
FILE_PATTERNS = ["src/**/*.py", "lib/**/*.js"]


def get_issue_body(token: str, repo: str, number: int) -> str:
    """Fetch issue body from GitHub."""
    url = f"https://api.github.com/repos/{repo}/issues/{number}"
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    for attempt in range(3):
        resp = requests.get(url, headers=headers)
        if resp.status_code == 429 or resp.status_code >= 500:
            time.sleep(2 ** attempt)
            continue
        if resp.status_code >= 300:
            raise RuntimeError(f"Failed to fetch issue: {resp.status_code} {resp.text}")
        data = resp.json()
        return str(data.get("body", ""))
    raise RuntimeError("Failed to fetch issue after retries")


def get_comment_body(token: str, repo: str, comment_id: int) -> str:
    """Fetch issue comment body from GitHub."""
    url = f"https://api.github.com/repos/{repo}/issues/comments/{comment_id}"
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    for attempt in range(3):
        resp = requests.get(url, headers=headers)
        if resp.status_code == 429 or resp.status_code >= 500:
            time.sleep(2 ** attempt)
            continue
        if resp.status_code >= 300:
            raise RuntimeError(f"Failed to fetch comment: {resp.status_code} {resp.text}")
        data = resp.json()
        return str(data.get("body", ""))
    raise RuntimeError("Failed to fetch comment after retries")


def collect_files(repo_root: Path, issue_body: str) -> List[Path]:
    """Collect files mentioned in issue or via glob patterns."""
    mentioned = set()
    for match in re.findall(r"\b\S+\.(py|js)\b", issue_body):
        path = repo_root / match
        if path.is_file():
            mentioned.add(path)
    if mentioned:
        return sorted(mentioned)

    files: List[Path] = []
    for pattern in FILE_PATTERNS:
        files.extend(p for p in repo_root.glob(pattern) if p.is_file())
    return sorted(files)


def read_snippet(path: Path) -> str:
    """Read file content up to MAX_FILE_CHARS and wrap in markdown."""
    try:
        text = path.read_text(encoding="utf-8")[:MAX_FILE_CHARS]
    except Exception as e:  # pragma: no cover - filesystem errors
        return f"### {path}\nFailed to read file: {e}\n"
    return f"### {path}\n```\n{text}\n```\n"


def call_chat_completion(api_key: str, messages: List[dict]) -> str:
    """Call OpenAI ChatCompletion with retries."""
    if hasattr(openai, "OpenAI"):
        client = openai.OpenAI(api_key=api_key)
        func = lambda **k: client.chat.completions.create(**k)
    else:
        openai.api_key = api_key
        func = openai.ChatCompletion.create  # type: ignore

    for attempt in range(3):
        try:
            resp = func(model="gpt-4o", messages=messages)
            return resp.choices[0].message.content.strip()
        except Exception as e:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)
    raise RuntimeError("OpenAI API failed")


def post_comment(token: str, repo: str, number: int, body: str) -> None:
    """Post comment on GitHub issue."""
    url = f"https://api.github.com/repos/{repo}/issues/{number}/comments"
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/vnd.github+json"}
    data = {"body": body}
    for attempt in range(3):
        resp = requests.post(url, headers=headers, json=data)
        if resp.status_code == 429 or resp.status_code >= 500:
            time.sleep(2 ** attempt)
            continue
        if resp.status_code >= 300:
            raise RuntimeError(f"Failed to post comment: {resp.status_code} {resp.text}")
        return
    raise RuntimeError("Failed to post comment after retries")


def main() -> None:
    parser = argparse.ArgumentParser(description="Debug multiple files via OpenAI")
    parser.add_argument("issue_number", type=int)
    parser.add_argument("repo")
    parser.add_argument("--comment-id", type=int, default=0)
    args = parser.parse_args()

    token = os.getenv("GITHUB_TOKEN")
    api_key = os.getenv("OPENAI_API_KEY")
    if not token or not api_key:
        raise SystemExit("GITHUB_TOKEN and OPENAI_API_KEY required")

    repo_root = Path(__file__).resolve().parents[2]

    issue_body = get_issue_body(token, args.repo, args.issue_number)[:MAX_FILE_CHARS]
    comment_body = ""
    comment_id = args.comment_id or int(os.getenv("COMMENT_ID", "0") or 0)
    if comment_id:
        comment_body = get_comment_body(token, args.repo, comment_id)[:MAX_FILE_CHARS]
    files = collect_files(repo_root, issue_body + "\n" + comment_body)
    snippets = [read_snippet(p) for p in files]

    user_content = "## Issue\n" + issue_body
    if comment_body:
        user_content += "\n\n## Comment\n" + comment_body
    user_content += "\n\n" + "\n".join(snippets)
    messages = [
        {
            "role": "system",
            "content": (
                "你是專業軟體工程師，讀取下列 GitHub Issue、回覆與相關程式檔案，"
                "請分析並提供詳細除錯與排查建議，用條列方式，各步驟可輔以 markdown code 範例，"
                "並附上可直接複製貼上的 openai codex markdown 除錯語法。"
            ),
        },
        {"role": "user", "content": user_content},
    ]

    try:
        response = call_chat_completion(api_key, messages)
    except Exception as e:
        response = f"Failed to call OpenAI API: {e}"

    post_comment(token, args.repo, args.issue_number, response)


if __name__ == "__main__":
    main()
