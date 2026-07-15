#!/usr/bin/env python3
"""驗證 content/*.json 與 i18n/*.json 的頂層 key 與同目錄 base.json 一致。

為什麼需要這支（2026-07-15）：
    prerender_content.py 對「合法 JSON 但結構錯」完全無感 —— 實測把 content/en.json 換成
    {"unexpected": "shape"}，它照樣印「injected en」、**退出碼 0**，卻把 app/en.html 裡的
    67 行 SEO 內容整段刪光。JSON 語法 gate 過、prerender gate 過、CI 也會照樣 commit 並部署，
    整頁英文 SEO 內容就這樣無聲蒸發。

    自動化（seo-ops 的反思/大腦）每天都在改這些檔，這條路是活的，所以補這道結構檢查。

判準：
    每個 <dir>/<lang>.json 的頂層 key 必須與 <dir>/base.json 完全相同（不多不少）。
    建立當下實測：content/ 30 檔、i18n/ 30 檔，全部與各自 base.json 一致 → 零誤判。

要新增一個頂層 key 時：
    連 base.json 一起加（本來就該如此——base.json 是該目錄的結構契約）。
    這道 gate 擋的是「只改了某一個語言、結構跟其他語言不一樣」，那幾乎一定是寫壞了。

用法：python3 .github/scripts/check_content_shape.py   （零參數；非零退出＝有檔不合格）
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DIRS = ("content", "i18n")

def main() -> int:
    problems = []
    checked = 0

    for dname in DIRS:
        d = ROOT / dname
        base_file = d / "base.json"
        if not base_file.exists():
            continue
        try:
            base_keys = set(json.loads(base_file.read_text(encoding="utf-8")).keys())
        except Exception as e:
            problems.append(f"{base_file.relative_to(ROOT)} 讀不動或不是物件：{e}")
            continue

        for f in sorted(d.glob("*.json")):
            if f.name == "base.json":
                continue
            try:
                keys = set(json.loads(f.read_text(encoding="utf-8")).keys())
            except Exception as e:
                problems.append(f"{f.relative_to(ROOT)} 讀不動或不是物件：{e}")
                continue
            checked += 1
            if keys != base_keys:
                missing = sorted(base_keys - keys)
                extra = sorted(keys - base_keys)
                problems.append(
                    f"{f.relative_to(ROOT)} 結構不符 {dname}/base.json："
                    f"缺 {missing or '無'}／多 {extra or '無'}"
                )

    if problems:
        print("[check-content-shape] 未通過：")
        for p in problems:
            print(f"  {p}")
        print("  ↑ prerender 對這種錯無感（退出碼 0 卻把該頁 SEO 內容清空），故在此擋下。")
        print("  要新增頂層 key 請連同該目錄的 base.json 一起加。")
        return 1

    print(f"[check-content-shape] 通過：{checked} 個檔的頂層 key 與各自 base.json 一致")
    return 0

if __name__ == "__main__":
    sys.exit(main())
