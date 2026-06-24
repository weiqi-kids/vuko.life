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
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT_DIR = ROOT / "content"
I18N_DIR = ROOT / "i18n"
APP_DIR = ROOT / "app"
BRAND = "Vuko"

START = "<!-- seo-content:start -->"
END = "<!-- seo-content:end -->"

# Static, crawlable language links injected into every page's footer so Google
# can discover all language versions via <a> links (hreflang alone doesn't
# guarantee crawling). English canonical lives at the site root "/".
LN_START = "<!-- lang-nav:start -->"
LN_END = "<!-- lang-nav:end -->"
LANG_LINKS = [
    ("/", "English"), ("/app/zh-tw.html", "繁體中文"), ("/app/zh-hk.html", "繁體中文(香港)"),
    ("/app/zh-cn.html", "简体中文"), ("/app/ja.html", "日本語"), ("/app/ko.html", "한국어"),
    ("/app/es.html", "Español"), ("/app/pt.html", "Português"), ("/app/fr-fr.html", "Français"),
    ("/app/fr-ca.html", "Français(CA)"), ("/app/fr-be.html", "Français(BE)"), ("/app/de-de.html", "Deutsch"),
    ("/app/de-at.html", "Deutsch(AT)"), ("/app/de-ch.html", "Deutsch(CH)"), ("/app/ru.html", "Русский"),
    ("/app/uk.html", "Українська"), ("/app/pl.html", "Polski"), ("/app/tr.html", "Türkçe"),
    ("/app/vi.html", "Tiếng Việt"), ("/app/th.html", "ไทย"), ("/app/id.html", "Indonesia"),
    ("/app/ms.html", "Melayu"), ("/app/hi.html", "हिन्दी"), ("/app/bn.html", "বাংলা"),
    ("/app/ta.html", "தமிழ்"), ("/app/pa.html", "ਪੰਜਾਬੀ"), ("/app/my.html", "မြန်မာ"),
    ("/app/ar.html", "العربية"), ("/app/he.html", "עברית"), ("/app/sw.html", "Kiswahili"),
]


def esc(s: str) -> str:
    return html.escape(str(s), quote=False)


def render(c: dict) -> str:
    out = ['<section class="seo-content" aria-label="About Vuko">']

    intro = c.get("intro", {})
    if intro:
        out.append(f'<h2>{esc(intro["h2"])}</h2>')
        for p in intro.get("p", []):
            out.append(f"<p>{esc(p)}</p>")

    # The differentiator, given its own H2 high on the page (the long-tail
    # wedge: "binaural beats that adapt to your breathing"). Optional: only
    # rendered for languages whose content/<lang>.json defines it.
    wedge = c.get("wedge", {})
    if wedge:
        out.append(f'<h2>{esc(wedge["h2"])}</h2>')
        for p in wedge.get("p", []):
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


def render_lang_nav() -> str:
    items = "".join(f'<a href="{h}">{esc(n)}</a>' for h, n in LANG_LINKS)
    return f'<nav class="lang-footer" aria-label="Choose your language">{items}</nav>'


def apply_seo_head(doc: str, data: dict) -> str:
    """Rewrite the static <title> and meta description/OG tags from i18n
    `data` so crawlers see keyword-rich, localized tags (js/i18n.js builds
    the same string at runtime for users).

    Title formula (keyword-first): "{seoKeywords}｜Vuko".
    Description comes from i18n `seoDescription`; if absent, the existing
    static description tags are left untouched (never clobber with a worse one).
    """
    kw = (data.get("seoKeywords") or "").strip()
    desc = (data.get("seoDescription") or "").strip()

    if kw:
        title = f"{kw}｜{BRAND}"
        t = esc(title)
        a = html.escape(title, quote=True)
        subs = [
            (r"(<title>).*?(</title>)", f"\\g<1>{t}\\g<2>"),
            (r'(<meta property="og:title" content=")[^"]*(")', f"\\g<1>{a}\\g<2>"),
            (r'(<meta name="twitter:title" content=")[^"]*(")', f"\\g<1>{a}\\g<2>"),
        ]
        for pat, repl in subs:
            doc, n = re.subn(pat, repl, doc, count=1, flags=re.DOTALL)
    if desc:
        a = html.escape(desc, quote=True)
        subs = [
            (r'(<meta name="description" content=")[^"]*(")', f"\\g<1>{a}\\g<2>"),
            (r'(<meta property="og:description" content=")[^"]*(")', f"\\g<1>{a}\\g<2>"),
            (r'(<meta name="twitter:description" content=")[^"]*(")', f"\\g<1>{a}\\g<2>"),
        ]
        for pat, repl in subs:
            doc, n = re.subn(pat, repl, doc, count=1, flags=re.DOTALL)
    return doc


# Right-to-left languages: their <html> needs dir="rtl".
RTL_LANGS = {"ar", "he", "fa", "ur"}

FAQ_START = "<!-- faq:start -->"
FAQ_END = "<!-- faq:end -->"


def set_html_dir(doc: str, lang: str) -> str:
    """Ensure <html> carries dir="rtl" for RTL languages (and no stray dir
    for LTR ones). Idempotent: strips any existing dir before re-adding."""
    want = ' dir="rtl"' if lang in RTL_LANGS else ""

    def repl(m):
        attrs = re.sub(r'\s+dir="[^"]*"', "", m.group(1))
        return f"<html{attrs}{want}>"

    return re.sub(r"<html([^>]*)>", repl, doc, count=1)


def render_faq_details(faq: dict) -> str:
    rows = []
    for it in faq.get("items", []):
        q = esc(it.get("q", ""))
        a = esc(it.get("a", ""))
        rows.append(
            f'<details class="faq-item"><summary class="faq-question">{q}</summary>'
            f'<div class="faq-answer">{a}</div></details>'
        )
    return "\n            ".join(rows)


def set_faq(doc: str, faq) -> str:
    """Bake the static FAQ <details> list from i18n `faq` into #faqList.
    Marker-delimited so it's idempotent; on first run (no markers) it replaces
    the hand-baked inner content of the faqList container. js/i18n.js rebuilds
    this list at runtime, so the static copy is for crawlers/AEO."""
    if not faq or not faq.get("items"):
        return doc
    block = f"{FAQ_START}\n            {render_faq_details(faq)}\n            {FAQ_END}"
    if FAQ_START in doc and FAQ_END in doc:
        return doc[: doc.index(FAQ_START)] + block + doc[doc.index(FAQ_END) + len(FAQ_END):]
    # First run: faqList holds only <details> (which close with </details>, not
    # </div>), so the first "</div>\n</div>" is faqList-close + faq-section-close.
    m = re.search(r'(<div id="faqList"[^>]*>)(.*?)(\n[ \t]*</div>\n[ \t]*</div>)',
                  doc, re.DOTALL)
    if not m:
        print("  faq: no #faqList anchor, skipped")
        return doc
    return doc[: m.start()] + m.group(1) + "\n            " + block + m.group(3) + doc[m.end():]


def apply_jsonld_faq(doc: str, faq) -> str:
    """Regenerate the FAQPage node's mainEntity in the JSON-LD @graph from
    i18n `faq`, keeping every other node untouched."""
    if not faq or not faq.get("items"):
        return doc
    m = re.search(r'(<script type="application/ld\+json">\s*)(\{.*?\})(\s*</script>)',
                  doc, re.DOTALL)
    if not m:
        return doc
    try:
        data = json.loads(m.group(2))
    except json.JSONDecodeError:
        print("  jsonld: parse failed, skipped")
        return doc
    graph = data.get("@graph")
    nodes = graph if isinstance(graph, list) else [data]
    changed = False
    for node in nodes:
        if isinstance(node, dict) and node.get("@type") == "FAQPage":
            node["mainEntity"] = [
                {
                    "@type": "Question",
                    "name": it.get("q", ""),
                    "acceptedAnswer": {"@type": "Answer", "text": it.get("a", "")},
                }
                for it in faq["items"]
            ]
            changed = True
    if not changed:
        return doc
    new_json = json.dumps(data, ensure_ascii=False, indent=4)
    return doc[: m.start()] + m.group(1) + new_json + m.group(3) + doc[m.end():]


def put_block(doc: str, start: str, end: str, body: str, anchors) -> str:
    """Idempotently place start+body+end in doc: replace between existing
    markers, otherwise insert before the first matching anchor."""
    block = f"{start}\n{body}\n{end}"
    if start in doc and end in doc:
        return doc[: doc.index(start)] + block + doc[doc.index(end) + len(end):]
    for a in anchors:
        if a in doc:
            i = doc.index(a)
            return doc[:i] + block + "\n    " + doc[i:]
    raise RuntimeError(f"no insertion anchor among {anchors}")


def set_text_by_id(doc: str, el_id: str, text: str) -> str:
    """Replace the inner text of the (single-text) element with id=el_id.
    Idempotent — re-running writes the same value. Used to bake the
    above-the-fold UI strings that js/i18n.js otherwise fills at runtime."""
    pat = re.compile(
        r'(<(\w+)([^>]*\sid="' + re.escape(el_id) + r'"[^>]*)>)(.*?)(</\2>)',
        re.DOTALL)
    return pat.sub(lambda m: m.group(1) + esc(text) + m.group(5), doc, count=1)


def set_app_chrome(doc: str, i18n: dict) -> str:
    """Bake the above-the-fold interactive strings that js/i18n.js fills at
    runtime (h1 title, section headings, the start button, FAQ title, trust
    badges) so non-English pages render in-language immediately instead of
    flashing the English/blank static placeholder before hydration. Each value
    mirrors exactly what updateLanguageContent() sets, so runtime hydration is a
    no-op refresh rather than a visible swap."""
    labels = i18n.get("labels", {})
    sections = i18n.get("sections", {})
    buttons = i18n.get("buttons", {})
    trust = i18n.get("trust", {})
    faq = i18n.get("faq", {})
    for el_id, text in [
        ("mainTitle", i18n.get("title", "")),
        ("sectionInstructions", sections.get("instructions", "")),
        ("sectionSettings", sections.get("settings", "")),
        ("sectionMonitor", sections.get("monitor", "")),
        ("systemConfigTitle", labels.get("systemConfig", "")),
        ("audioSearchTitle", labels.get("audioSearch", "")),
        ("monitorToggleBtn", buttons.get("start", "")),
        ("faqTitle", faq.get("title", "")),
    ]:
        if text:
            doc = set_text_by_id(doc, el_id, text)
    for el_id, key in [("trustFree", "free"), ("trustOpenSource", "openSource"),
                       ("trustPrivacy", "privacy")]:
        if trust.get(key):
            doc = set_text_by_id(doc, el_id, "✓ " + trust[key])
    return doc


def inject_file(cfile, hfile, label, lang) -> bool:
    if not cfile.exists():
        print(f"skip {label}: no {cfile}")
        return False
    if not hfile.exists():
        print(f"skip {label}: no {hfile}")
        return False

    content = json.loads(cfile.read_text(encoding="utf-8"))
    doc = hfile.read_text(encoding="utf-8")
    # SEO long-form before the FAQ; crawlable language nav before the footer.
    doc = put_block(doc, START, END, render(content),
                    ('<div class="faq-section">', '<div class="footer">'))
    doc = put_block(doc, LN_START, LN_END, render_lang_nav(),
                    ('<div class="footer">',))
    # Everything below is driven by i18n/<lang>.json (translated by CI), so the
    # static <title>/meta, the crawlable FAQ, the JSON-LD FAQPage, and <html dir>
    # never drift from the translations again.
    ifile = I18N_DIR / f"{lang}.json"
    if ifile.exists():
        i18n = json.loads(ifile.read_text(encoding="utf-8"))
        doc = apply_seo_head(doc, i18n)
        doc = set_app_chrome(doc, i18n)
        faq = i18n.get("faq")
        doc = set_faq(doc, faq)
        doc = apply_jsonld_faq(doc, faq)
    else:
        print(f"  {label}: no {ifile}, i18n-driven tags skipped")
    doc = set_html_dir(doc, lang)
    hfile.write_text(doc, encoding="utf-8")
    print(f"injected {label}")
    return True


def inject(lang: str) -> bool:
    return inject_file(CONTENT_DIR / f"{lang}.json", APP_DIR / f"{lang}.html", lang, lang)


def main() -> None:
    langs = sys.argv[1:]
    if not langs:
        langs = sorted(p.stem for p in CONTENT_DIR.glob("*.json") if p.stem != "base")
    count = sum(inject(l) for l in langs)
    # The site root (index.html) is the English canonical page — keep its
    # long-form block in sync with content/en.json too.
    count += inject_file(CONTENT_DIR / "en.json", ROOT / "index.html", "index.html", "en")
    print(f"done: {count} page(s)")


if __name__ == "__main__":
    main()
