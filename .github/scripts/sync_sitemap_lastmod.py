#!/usr/bin/env python3
"""Keep sitemap.xml <lastmod> in step with real content changes.

sitemap.xml is hand-maintained. Until 2026-10-29 the reflect layer bumped
<lastmod> by hand when it edited a page; the decide layer that replaced it
edits guides/*.html without touching the sitemap, so lastmod froze while the
pages kept changing (found 2026-11-21).

Rule: each sitemap URL maps to a file. We fingerprint the page's content
(<title>, meta description, and the text of <main>, or <body> when there is
no <main>; scripts, styles and comments stripped, whitespace collapsed) and
keep the last fingerprint in seo/lastmod-state.json. lastmod moves to today
(Asia/Taipei) only when the fingerprint changes, so a commit that touches a
file without changing what a reader sees does not refresh its date, and git
dates / shallow clones play no part.

Usage: python .github/scripts/sync_sitemap_lastmod.py [--check]
  --check  exit 1 if any lastmod would change (no write)
"""
import hashlib
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SITEMAP = os.path.join(ROOT, 'sitemap.xml')
STATE = os.path.join(ROOT, 'seo', 'lastmod-state.json')
ORIGIN = 'https://www.vuko.life/'


def url_to_file(loc):
    if not loc.startswith(ORIGIN):
        return None
    p = loc[len(ORIGIN):]
    if p == '' or p.endswith('/'):
        p += 'index.html'
    return os.path.join(ROOT, p)


def fingerprint(html):
    h = re.sub(r'(?is)<!--.*?-->', ' ', html)
    h = re.sub(r'(?is)<(script|style|noscript)\b.*?</\1>', ' ', h)
    title = re.search(r'(?is)<title[^>]*>(.*?)</title>', h)
    desc = re.search(r'(?is)<meta\s+name=["\']description["\']\s+content=["\']([^"\']*)', h)
    body = re.search(r'(?is)<main\b[^>]*>(.*)</main>', h) or re.search(r'(?is)<body\b[^>]*>(.*)</body>', h)
    text = body.group(1) if body else h
    text = re.sub(r'(?s)<[^>]+>', ' ', text)
    parts = [title.group(1) if title else '', desc.group(1) if desc else '', text]
    norm = re.sub(r'\s+', ' ', ' '.join(parts)).strip()
    return hashlib.sha256(norm.encode('utf-8')).hexdigest()


def main():
    check = '--check' in sys.argv
    today = (datetime.now(timezone.utc) + timedelta(hours=8)).strftime('%Y-%m-%d')
    sm = open(SITEMAP, encoding='utf-8').read()
    try:
        state = json.load(open(STATE, encoding='utf-8'))
    except FileNotFoundError:
        state = {}
    changed = []

    def rep(m):
        loc, lm = m.group(1).strip(), m.group(2).strip()
        f = url_to_file(loc)
        if not f or not os.path.exists(f):
            print(f'warn: {loc} has no file, lastmod left as {lm}', file=sys.stderr)
            return m.group(0)
        fp = fingerprint(open(f, encoding='utf-8').read())
        prev = state.get(loc)
        if prev is None:
            # first sight: trust the current sitemap date, just record the fingerprint
            state[loc] = {'hash': fp, 'lastmod': lm}
            return m.group(0)
        if prev['hash'] == fp:
            return m.group(0)
        new = max(today, lm)
        state[loc] = {'hash': fp, 'lastmod': new}
        if new != lm:
            changed.append((loc, lm, new))
            return m.group(0).replace(f'<lastmod>{m.group(2)}</lastmod>', f'<lastmod>{new}</lastmod>')
        return m.group(0)

    out = re.sub(r'<loc>([^<]+)</loc>\s*<lastmod>([^<]+)</lastmod>', rep, sm)
    for loc, old, new in changed:
        print(f'{loc}: {old} -> {new}')
    if check:
        sys.exit(1 if changed else 0)
    if out != sm:
        open(SITEMAP, 'w', encoding='utf-8').write(out)
    os.makedirs(os.path.dirname(STATE), exist_ok=True)
    with open(STATE, 'w', encoding='utf-8') as fh:
        json.dump(dict(sorted(state.items())), fh, ensure_ascii=False, indent=1)
        fh.write('\n')
    print(f'{len(changed)} lastmod updated')


if __name__ == '__main__':
    main()
