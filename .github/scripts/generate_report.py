#!/usr/bin/env python3
"""
Generate weekly analytics report from traffic and audit data.
"""

import os
import json
from datetime import datetime
from pathlib import Path

def load_json_file(path):
    """Load JSON file if exists."""
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return None

def format_number(n):
    """Format number with comma separators."""
    if n is None:
        return 'N/A'
    return f'{n:,}'

def generate_traffic_section(traffic_data):
    """Generate traffic overview section."""
    if not traffic_data:
        return "## 流量概況\n\n⚠️ 無法取得流量數據\n"

    lines = ["## 流量概況\n"]

    # Views
    views = traffic_data.get('views', {})
    clones = traffic_data.get('clones', {})

    lines.append("| 指標 | 總數 | 獨立訪客/使用者 |")
    lines.append("|------|------|-----------------|")
    lines.append(f"| 瀏覽量 (14天) | {format_number(views.get('count'))} | {format_number(views.get('uniques'))} |")
    lines.append(f"| Clone 數 (14天) | {format_number(clones.get('count'))} | {format_number(clones.get('uniques'))} |")
    lines.append("")

    return '\n'.join(lines)

def generate_popular_paths_section(traffic_data):
    """Generate popular paths section."""
    if not traffic_data or not traffic_data.get('popular_paths'):
        return ""

    paths = traffic_data['popular_paths']
    if not paths:
        return ""

    lines = ["## 熱門頁面\n"]
    lines.append("| 排名 | 路徑 | 瀏覽量 | 獨立訪客 |")
    lines.append("|------|------|--------|----------|")

    for i, path in enumerate(paths[:10], 1):
        lines.append(f"| {i} | `{path.get('path', 'N/A')}` | {format_number(path.get('count'))} | {format_number(path.get('uniques'))} |")

    lines.append("")
    return '\n'.join(lines)

def generate_referrers_section(traffic_data):
    """Generate referrers section."""
    if not traffic_data or not traffic_data.get('popular_referrers'):
        return ""

    referrers = traffic_data['popular_referrers']
    if not referrers:
        return ""

    lines = ["## 流量來源\n"]
    lines.append("| 來源 | 瀏覽量 | 獨立訪客 |")
    lines.append("|------|--------|----------|")

    for ref in referrers[:10]:
        lines.append(f"| {ref.get('referrer', 'N/A')} | {format_number(ref.get('count'))} | {format_number(ref.get('uniques'))} |")

    lines.append("")
    return '\n'.join(lines)

def generate_audit_section(audit_data):
    """Generate technical audit section."""
    if not audit_data:
        return "## 技術健檢\n\n⚠️ 無法取得健檢數據（可手動執行 site-audit.sh）\n"

    lines = ["## 技術健檢\n"]

    # Lighthouse scores
    lighthouse = audit_data.get('lighthouse', {})
    if lighthouse:
        lines.append("### Lighthouse 分數\n")
        lines.append("| 項目 | 分數 | 狀態 |")
        lines.append("|------|------|------|")

        for key in ['performance', 'accessibility', 'best-practices', 'seo']:
            score = lighthouse.get(key)
            if score is not None:
                score_val = int(score * 100) if score <= 1 else int(score)
                status = '✅' if score_val >= 90 else ('⚠️' if score_val >= 50 else '❌')
                lines.append(f"| {key.title()} | {score_val} | {status} |")

        lines.append("")

    # Core Web Vitals
    cwv = audit_data.get('core_web_vitals', {})
    if cwv:
        lines.append("### Core Web Vitals\n")
        lines.append("| 指標 | 數值 |")
        lines.append("|------|------|")
        for key, value in cwv.items():
            lines.append(f"| {key} | {value} |")
        lines.append("")

    # Security
    security = audit_data.get('security', {})
    if security:
        lines.append("### 安全性\n")
        lines.append("| 項目 | 狀態 |")
        lines.append("|------|------|")
        for key, value in security.items():
            lines.append(f"| {key} | {value} |")
        lines.append("")

    return '\n'.join(lines)

def generate_suggestions(traffic_data, audit_data):
    """Generate optimization suggestions based on data."""
    lines = ["## 優化建議\n"]
    suggestions = []

    # Traffic-based suggestions
    if traffic_data:
        paths = traffic_data.get('popular_paths', [])
        if paths:
            top_langs = []
            for path in paths[:5]:
                p = path.get('path', '')
                if '/app/' in p and '.html' in p:
                    lang = p.split('/app/')[-1].replace('.html', '')
                    top_langs.append(lang)

            if top_langs:
                suggestions.append(f"- [ ] 熱門語言版本: {', '.join(top_langs)} - 優先優化這些版本的體驗")

    # Audit-based suggestions
    if audit_data:
        lighthouse = audit_data.get('lighthouse', {})
        for key in ['accessibility', 'performance', 'seo']:
            score = lighthouse.get(key)
            if score is not None:
                score_val = int(score * 100) if score <= 1 else int(score)
                if score_val < 90:
                    suggestions.append(f"- [ ] {key.title()} 分數 {score_val} < 90，需要改進")

    if not suggestions:
        suggestions.append("- [x] 目前各項指標良好，持續監控")

    lines.extend(suggestions)
    lines.append("")
    return '\n'.join(lines)

def main():
    # Load data
    traffic_data = load_json_file('/tmp/traffic.json')
    audit_data = load_json_file('/tmp/audit.json')

    # Generate report date
    report_date = datetime.utcnow().strftime('%Y-%m-%d')

    # Build report
    report_lines = [
        f"# 週報 {report_date}\n",
        f"> 自動產生於 {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}\n",
        "",
        generate_traffic_section(traffic_data),
        generate_popular_paths_section(traffic_data),
        generate_referrers_section(traffic_data),
        generate_audit_section(audit_data),
        generate_suggestions(traffic_data, audit_data),
        "---\n",
        "*此報告由 [Weekly Analytics Report](.github/workflows/weekly_report.yml) 自動產生*"
    ]

    report_content = '\n'.join(report_lines)

    # Ensure reports directory exists
    reports_dir = Path('reports')
    reports_dir.mkdir(exist_ok=True)

    # Write report
    report_path = reports_dir / f'weekly-{report_date}.md'
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(report_content)

    print(f"✓ Report generated: {report_path}")

    # Also print summary
    print("\n" + "="*50)
    print("REPORT SUMMARY")
    print("="*50)
    if traffic_data and traffic_data.get('views'):
        views = traffic_data['views']
        print(f"Views: {views.get('count', 0)} total, {views.get('uniques', 0)} unique")
    if traffic_data and traffic_data.get('popular_paths'):
        print(f"Top page: {traffic_data['popular_paths'][0].get('path', 'N/A')}")
    print("="*50)

if __name__ == '__main__':
    main()
