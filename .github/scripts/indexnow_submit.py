#!/usr/bin/env python3
"""Submit vuko.life URLs to IndexNow so participating search engines
(Bing, Yandex, Seznam, Naver) recrawl on demand instead of waiting for
their passive schedule.

NOTE: Google does NOT support IndexNow — this does not affect Google
recrawl. Google is nudged only via fresh sitemap <lastmod> + Search
Console. This covers the other engines, which matter for the site's
non-English (ko/ru/…) audiences.

The IndexNow key file (c7c1313313466415389de3886c49865d.txt) must be
reachable at https://www.vuko.life/<key>.txt — it already ships in the
repo root and deploys with the site. Pure stdlib; no dependencies.

Usage:
    python .github/scripts/indexnow_submit.py            # submit every sitemap URL
    python .github/scripts/indexnow_submit.py URL [URL…] # submit only these URLs
"""
import json
import sys
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

HOST = "www.vuko.life"
KEY = "c7c1313313466415389de3886c49865d"
KEY_LOCATION = f"https://{HOST}/{KEY}.txt"
ENDPOINT = "https://api.indexnow.org/indexnow"
ROOT = Path(__file__).resolve().parents[2]
SITEMAP = ROOT / "sitemap.xml"


def sitemap_urls():
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    root = ET.parse(SITEMAP).getroot()
    return [loc.text.strip() for loc in root.findall(".//sm:url/sm:loc", ns) if loc.text]


def submit(urls):
    payload = {
        "host": HOST,
        "key": KEY,
        "keyLocation": KEY_LOCATION,
        "urlList": urls,
    }
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        ENDPOINT,
        data=data,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.status, resp.read().decode("utf-8", "replace")


def main():
    urls = sys.argv[1:] or sitemap_urls()
    if not urls:
        print("No URLs to submit.")
        return 0
    print(f"Submitting {len(urls)} URL(s) to IndexNow ({ENDPOINT}):")
    for u in urls:
        print(f"  {u}")
    try:
        status, body = submit(urls)
    except urllib.error.HTTPError as e:
        print(f"IndexNow HTTP {e.code}: {e.read().decode('utf-8', 'replace')[:300]}")
        # 4xx from IndexNow (e.g. key not yet propagated) shouldn't fail the deploy.
        return 0
    except Exception as e:  # noqa: BLE001 — never break the pipeline on a ping
        print(f"IndexNow submit error (non-fatal): {e}")
        return 0
    # 200 and 202 both mean accepted.
    print(f"IndexNow responded {status}. {body[:200]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
