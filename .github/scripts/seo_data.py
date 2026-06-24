#!/usr/bin/env python3
"""vuko.life daily-optimize DATA layer (the "sensor") — runs in GitHub Actions.

Pulls GA4 + GSC into ONE machine-readable RAW dump that the daily-optimize cloud
routine reads. Three buckets:

  1. GSC search presence — 7d + 28d totals, top query×page relationships (7d),
     week-over-week (last7 vs prev7), and a "striking distance" list (pos 5-20).
  2. GA4 traffic/engagement — 7d + 28d channels, engagement, key conversion
     events, top landing paths.
  3. Index coverage — URL Inspection on representative URLs + sitemap
     submitted/indexed; one snapshot appended to index-coverage-history.jsonl.

Credentials: reads the service-account JSON from the GA4_SA_KEY env var (the
GitHub Actions secret). Falls back to the host key file for local/manual runs.
Read-only against Google; writes only its RAW file (argv[1]) and the coverage
history jsonl. Any single section failing is caught and noted inline.

Usage (CI):   GA4_SA_KEY=<json> python .github/scripts/seo_data.py seo/data/latest.raw.md
Usage (host): python .github/scripts/seo_data.py [/path/to/out.raw.md]
"""
import datetime
import json
import os
import sys

# Host fallback key (used only when GA4_SA_KEY env is absent).
KEY = "/root/.config/ga4-insights/sa-key.json"
PROP = "properties/493871596"
SITE = "sc-domain:vuko.life"
# In CI the checkout root is GITHUB_WORKSPACE; locally fall back to repo path.
REPO = os.environ.get("GITHUB_WORKSPACE") or os.environ.get("VUKO_REPO") or "/root/vuko.life"
DATA_DIR = os.path.join(REPO, "seo", "data")
COV_HISTORY = os.path.join(DATA_DIR, "index-coverage-history.jsonl")

INSPECT_URLS = [
    "https://www.vuko.life/",
    "https://www.vuko.life/app/zh-tw.html",
    "https://www.vuko.life/app/ja.html",
    "https://www.vuko.life/app/es.html",
    "https://www.vuko.life/app/de-de.html",
]

OUT = []
def w(line=""):
    OUT.append(line)


def credentials(scopes=None):
    """Load SA credentials from GA4_SA_KEY env (CI) or the host key file."""
    from google.oauth2 import service_account
    raw = os.environ.get("GA4_SA_KEY")
    if raw:
        info = json.loads(raw)
        cred = service_account.Credentials.from_service_account_info(info)
    else:
        cred = service_account.Credentials.from_service_account_file(KEY)
    return cred.with_scopes(scopes) if scopes else cred


def main():
    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    from google.analytics.data_v1beta.types import (
        RunReportRequest, DateRange, Dimension, Metric, OrderBy)
    from googleapiclient.discovery import build

    today = datetime.date.today()
    today_s = today.isoformat()

    ga = BetaAnalyticsDataClient(credentials=credentials())
    sc = build("searchconsole", "v1",
               credentials=credentials(["https://www.googleapis.com/auth/webmasters"]),
               cache_discovery=False)

    w(f"# vuko.life daily-optimize RAW data — {today_s}")
    w(f"_generated {datetime.datetime.now().strftime('%F %T')} UTC (GitHub Actions)_")
    w()

    d7_end = today - datetime.timedelta(days=3)
    d7_start = d7_end - datetime.timedelta(days=6)
    p7_end = d7_start - datetime.timedelta(days=1)
    p7_start = p7_end - datetime.timedelta(days=6)
    d28_end = today
    d28_start = today - datetime.timedelta(days=28)

    def gsc(body):
        return sc.searchanalytics().query(siteUrl=SITE, body=body).execute().get("rows", [])

    # ============ BUCKET 1: GSC search presence ============
    w("## 1. GSC search presence")
    w(f"windows: last7={d7_start}..{d7_end}  prev7={p7_start}..{p7_end}  28d={d28_start}..{d28_end}")
    w()

    for label, s, e in [("last7", d7_start, d7_end), ("prev7", p7_start, p7_end),
                        ("28d", d28_start, d28_end)]:
        try:
            rows = gsc({"startDate": s.isoformat(), "endDate": e.isoformat(), "dimensions": []})
            if rows:
                r = rows[0]
                w(f"- total {label}: impressions={r['impressions']} clicks={r['clicks']} "
                  f"ctr={r['ctr']*100:.1f}% pos={r['position']:.1f}")
            else:
                w(f"- total {label}: 0 impressions")
        except Exception as ex:
            w(f"- total {label}: ERROR {str(ex)[:120]}")
    w()

    def qmap(s, e):
        out = {}
        try:
            for r in gsc({"startDate": s.isoformat(), "endDate": e.isoformat(),
                          "dimensions": ["query"], "rowLimit": 200}):
                out[r["keys"][0]] = r
        except Exception as ex:
            w(f"- (query fetch error {str(ex)[:80]})")
        return out

    last = qmap(d7_start, d7_end)
    prev = qmap(p7_start, p7_end)
    w(f"### query week-over-week (last7 vs prev7) — {len(last)} queries last7")
    if last:
        for q in sorted(last, key=lambda k: -last[k]["impressions"])[:30]:
            r = last[q]
            pr = prev.get(q)
            delta = f" (prev impr {pr['impressions']}, pos {pr['position']:.1f})" if pr else " (NEW)"
            w(f"- \"{q}\" impr={r['impressions']} clicks={r['clicks']} "
              f"ctr={r['ctr']*100:.1f}% pos={r['position']:.1f}{delta}")
    else:
        w("- (no query rows yet — search presence still near zero)")
    w()

    w("### striking-distance queries (pos 5-20, last7) — closest to page-1 wins")
    sd = [r for r in last.values() if 5 <= r["position"] <= 20 and r["impressions"] >= 1]
    if sd:
        for r in sorted(sd, key=lambda x: -x["impressions"])[:20]:
            w(f"- \"{r['keys'][0]}\" pos={r['position']:.1f} impr={r['impressions']} "
              f"clicks={r['clicks']} ctr={r['ctr']*100:.1f}%")
    else:
        w("- (none yet)")
    w()

    w("### query×page relationships (last7) — which page ranks for which query")
    try:
        qp = gsc({"startDate": d7_start.isoformat(), "endDate": d7_end.isoformat(),
                  "dimensions": ["page", "query"], "rowLimit": 50})
        if qp:
            for r in sorted(qp, key=lambda x: -x["impressions"])[:30]:
                w(f"- {r['keys'][0]}  ←  \"{r['keys'][1]}\"  impr={r['impressions']} pos={r['position']:.1f}")
        else:
            w("- (none yet)")
    except Exception as ex:
        w(f"- ERROR {str(ex)[:120]}")
    w()

    w("### top pages by impressions (28d)")
    try:
        pr = gsc({"startDate": d28_start.isoformat(), "endDate": d28_end.isoformat(),
                  "dimensions": ["page"], "rowLimit": 25})
        if pr:
            for r in sorted(pr, key=lambda x: -x["impressions"])[:20]:
                w(f"- {r['keys'][0]}  impr={r['impressions']} clicks={r['clicks']} pos={r['position']:.1f}")
        else:
            w("- (none yet)")
    except Exception as ex:
        w(f"- ERROR {str(ex)[:120]}")
    w()

    # ============ BUCKET 2: GA4 traffic / engagement ============
    w("## 2. GA4 traffic & engagement")
    w()

    def report(dims, mets, days, limit=25, order_metric=None):
        kw = dict(
            property=PROP,
            dimensions=[Dimension(name=d) for d in dims],
            metrics=[Metric(name=m) for m in mets],
            date_ranges=[DateRange(start_date=f"{days}daysAgo", end_date="today")],
            limit=limit)
        if order_metric:
            kw["order_bys"] = [OrderBy(metric=OrderBy.MetricOrderBy(metric_name=order_metric),
                                       desc=True)]
        return ga.run_report(RunReportRequest(**kw))

    for days in (7, 28):
        try:
            r = report([], ["sessions", "totalUsers", "engagementRate", "bounceRate",
                            "averageSessionDuration"], days)
            if r.rows:
                m = r.rows[0].metric_values
                w(f"- {days}d overall: sessions={m[0].value} users={m[1].value} "
                  f"engRate={float(m[2].value)*100:.0f}% bounce={float(m[3].value)*100:.0f}% "
                  f"avgDur={float(m[4].value):.1f}s")
        except Exception as ex:
            w(f"- {days}d overall: ERROR {str(ex)[:100]}")

    try:
        r = report(["sessionDefaultChannelGroup"], ["sessions"], 28, order_metric="sessions")
        w("- channels (28d sessions): " + ", ".join(
            f"{row.dimension_values[0].value}={row.metric_values[0].value}" for row in r.rows))
    except Exception as ex:
        w(f"- channels: ERROR {str(ex)[:100]}")

    try:
        r = report(["pagePath"], ["screenPageViews", "totalUsers"], 28, limit=20,
                   order_metric="screenPageViews")
        w("- top landing paths (28d views/users):")
        for row in r.rows:
            w(f"    - {row.dimension_values[0].value}: {row.metric_values[0].value}/{row.metric_values[1].value}")
    except Exception as ex:
        w(f"- landing paths: ERROR {str(ex)[:100]}")

    try:
        r = report(["eventName"], ["eventCount", "totalUsers"], 28, limit=50)
        found = {row.dimension_values[0].value: (row.metric_values[0].value, row.metric_values[1].value)
                 for row in r.rows}
        w("- key events (28d count/users):")
        for ev in ["onboarding_shown", "onboarding_completed", "play", "session_completed",
                   "music_selected", "demo_mode_started", "start_monitoring"]:
            c, u = found.get(ev, ("0", "0"))
            w(f"    - {ev}: {c}/{u}")
    except Exception as ex:
        w(f"- events: ERROR {str(ex)[:100]}")
    w()

    # ============ BUCKET 3: index coverage ============
    w("## 3. Index coverage (URL Inspection + sitemap)")
    w()
    snap = {"date": today_s, "urls": {}, "sitemap": {}}
    for url in INSPECT_URLS:
        try:
            r = sc.urlInspection().index().inspect(
                body={"inspectionUrl": url, "siteUrl": SITE}).execute()
            idx = r.get("inspectionResult", {}).get("indexStatusResult", {})
            cov = idx.get("coverageState", "?")
            verdict = idx.get("verdict", "?")
            crawl = (idx.get("lastCrawlTime") or "NEVER")[:10]
            gcanon = idx.get("googleCanonical", "?")
            w(f"- {url}")
            w(f"    coverage={cov} | verdict={verdict} | lastCrawl={crawl} | googleCanonical={gcanon}")
            snap["urls"][url] = {"coverage": cov, "verdict": verdict,
                                "lastCrawl": crawl, "googleCanonical": gcanon}
        except Exception as ex:
            w(f"- {url} — inspection ERROR {str(ex)[:100]}")
            snap["urls"][url] = {"error": str(ex)[:100]}
    try:
        sm = sc.sitemaps().list(siteUrl=SITE).execute()
        for s in sm.get("sitemap", []):
            for c in s.get("contents", []):
                sub, idxd = c.get("submitted"), c.get("indexed", "n/a")
                w(f"- sitemap {s['path']}: submitted={sub} indexed={idxd}")
                snap["sitemap"][s["path"]] = {"submitted": sub, "indexed": idxd}
    except Exception as ex:
        w(f"- sitemap ERROR {str(ex)[:100]}")
    w()

    try:
        os.makedirs(DATA_DIR, exist_ok=True)
        with open(COV_HISTORY, "a", encoding="utf-8") as f:
            f.write(json.dumps(snap, ensure_ascii=False) + "\n")
    except Exception as ex:
        w(f"- (coverage history append failed: {str(ex)[:80]})")

    w("---")
    w("_end of RAW data. Sparse search data is expected while the site is still "
      "being indexed — fall back to indexing/content-depth work per the playbook._")


if __name__ == "__main__":
    out_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(DATA_DIR, "latest.raw.md")
    try:
        main()
    except Exception as e:
        import traceback
        OUT.append(f"\n[seo-data] TOP-LEVEL FAILURE: {e}")
        OUT.append(traceback.format_exc())
    os.makedirs(os.path.dirname(out_path) or ".", exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        f.write("\n".join(OUT) + "\n")
    print(f"[seo-data] RAW written: {out_path}")
    print("\n".join(OUT))
