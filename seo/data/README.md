# vuko.life SEO data channel

（2026-07-20 更新）本站感測層已移交 host 端 seo-ops `seo-collect.mjs`，每日把 GA4/GSC/索引覆蓋
快照寫成 `seo/local-data/<date>.json`（**留本機、不進公開 repo**）。舊的 GitHub Actions
`seo_data.yml`＋`.github/scripts/seo_data.py`（原本寫 `latest.raw.md` 與 `index-coverage-history.jsonl`）
已停用並刪除。

本目錄現在**只保留一個活檔**：

- `optimize-ledger.jsonl` — 優化引擎（seo-ops brain 層）每實際出貨一次改動就 append 一行
  （含 date/target/source/reason），同時是 14 天去重清單與因果記錄。**追蹤進公開 repo，勿誤刪。**

Disallowed in robots.txt — not for indexing.
