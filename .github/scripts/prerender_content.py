#!/usr/bin/env python3
"""Inject long-form SEO content from content/<lang>.json into app/<lang>.html.

The block is written between HTML comment markers so the script is idempotent:
re-running replaces the previous block instead of appending a new one. Content
lives in content/*.json (decoupled from i18n/*.json, which the translation CI
regenerates from base.json) so it is never clobbered by the UI-string pipeline.

Usage:
    python .github/scripts/prerender_content.py            # all app/*.html
    python .github/scripts/prerender_content.py en es ja   # specific languages
"""
import html
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT_DIR = ROOT / "content"
APP_DIR = ROOT / "app"

START = "<!-- seo-content:start -->"
END = "<!-- seo-content:end -->"


def esc(s: str) -> str:
    return html.escape(str(s), quote=False)


def render(c: dict) -> str:
    out = ['<section class="seo-content" aria-label="About Vuko">']

    intro = c.get("intro", {})
    if intro:
        out.append(f'<h2>{esc(intro["h2"])}</h2>')
        for p in intro.get("p", []):
            out.append(f"<p>{esc(p)}</p>")

    how = c.get("how", {})
    if how:
        out.append(f'<h2>{esc(how["h2"])}</h2>')
        if how.get("p"):
            out.append(f'<p>{esc(how["p"])}</p>')
        for key in ("binaural", "breath"):
            sub = how.get(key)
            if sub:
                out.append(f'<h3>{esc(sub["h3"])}</h3>')
                out.append(f'<p>{esc(sub["p"])}</p>')

    modes = c.get("modes", {})
    if modes:
        out.append(f'<h2>{esc(modes["h2"])}</h2>')
        if modes.get("p"):
            out.append(f'<p>{esc(modes["p"])}</p>')
        cols = modes.get("cols", {})
        out.append('<table class="modes-table"><thead><tr>')
        for col in ("mode", "freq", "wave", "use"):
            out.append(f"<th>{esc(cols.get(col, ''))}</th>")
        out.append("</tr></thead><tbody>")
        for row in modes.get("rows", []):
            out.append("<tr>")
            for col in ("mode", "freq", "wave", "use"):
                out.append(f"<td>{esc(row.get(col, ''))}</td>")
            out.append("</tr>")
        out.append("</tbody></table>")

    privacy = c.get("privacy", {})
    if privacy:
        out.append(f'<h2>{esc(privacy["h2"])}</h2>')
        for p in privacy.get("p", []):
            out.append(f"<p>{esc(p)}</p>")

    usage = c.get("usage", {})
    if usage:
        out.append(f'<h2>{esc(usage["h2"])}</h2>')
        out.append("<ol>")
        for step in usage.get("steps", []):
            out.append(f"<li>{esc(step)}</li>")
        out.append("</ol>")

    out.append("</section>")
    return "\n".join(out)


def inject(lang: str) -> bool:
    cfile = CONTENT_DIR / f"{lang}.json"
    hfile = APP_DIR / f"{lang}.html"
    if not cfile.exists():
        print(f"skip {lang}: no content/{lang}.json")
        return False
    if not hfile.exists():
        print(f"skip {lang}: no app/{lang}.html")
        return False

    content = json.loads(cfile.read_text(encoding="utf-8"))
    block = f"{START}\n{render(content)}\n{END}"
    doc = hfile.read_text(encoding="utf-8")

    if START in doc and END in doc:
        pre = doc[: doc.index(START)]
        post = doc[doc.index(END) + len(END):]
        doc = pre + block + post
    else:
        # Insert before the FAQ section (falling back to the footer) so the
        # reading order is: app UI -> SEO content -> FAQ -> footer.
        for marker in ('<div class="faq-section">', '<div class="footer">'):
            if marker in doc:
                insert_at = doc.index(marker)
                doc = doc[:insert_at] + block + "\n    " + doc[insert_at:]
                break
        else:
            raise RuntimeError(f"{lang}: no insertion anchor found")

    hfile.write_text(doc, encoding="utf-8")
    print(f"injected {lang}")
    return True


def main() -> None:
    langs = sys.argv[1:]
    if not langs:
        langs = sorted(p.stem for p in CONTENT_DIR.glob("*.json") if p.stem != "base")
    count = sum(inject(l) for l in langs)
    print(f"done: {count} page(s)")


if __name__ == "__main__":
    main()
