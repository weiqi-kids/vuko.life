# vuko.life

AI 智能呼吸拍頻引導 Web App，透過雙耳拍頻（Binaural Beats）與即時呼吸監測，幫助使用者進入冥想、睡眠、專注等狀態。

**專案狀態**：維運期

## 目標用戶

- 冥想/睡眠需求者
- 專注/工作者
- 身心靈練習者

## 技術棧

- **前端**：純 HTML/CSS/Vanilla JS（無框架）
- **音訊處理**：Web Audio API（拍頻生成）
- **呼吸偵測**：MediaStream API + Canvas 視覺化
- **多語系**：30 種語言，翻譯檔在 `i18n/` 目錄
- **部署**：GitHub Pages + jsDelivr CDN（音樂檔）
- **CI/CD**：GitHub Actions（翻譯、Embedding、截圖、部署）
- **自動化腳本**：Python（OpenAI 翻譯、sentence-transformers Embedding、Playwright 截圖）

## 目錄結構

```
/
├── index.html          # 入口頁（語言偵測重定向）
├── config.json         # 全域設定（拍頻參數、音量、噪音門檻）
├── app/                # 各語言版本頁面（30 個 HTML）
├── js/                 # 核心 JavaScript
│   ├── app.js              # 主應用邏輯
│   ├── audio_selector.js   # 音樂搜尋與播放
│   ├── binaural_processor.js # 拍頻與呼吸演算法
│   └── i18n.js             # 多語系切換
├── i18n/               # UI 文案翻譯（JSON）
│   └── base.json           # 繁中母版（其他語言由此翻譯）
├── music/              # 音樂資料庫（含 Embedding 向量）
│   └── base.json           # 音樂母版（含 embedding）
├── assets/             # CSS 與 OG 圖片
├── .github/
│   ├── workflows/      # CI/CD 工作流程
│   └── scripts/        # Python 自動化腳本
├── seo/                # SEO + AEO 優化規則庫
└── revamp/             # 網站改版工作流程
```

## 開發注意事項

- 無 Node.js 依賴，不使用 npm
- 修改 `i18n/base.json` 或 `music/base.json` 後，CI 會自動觸發翻譯和 Embedding 更新
- 音樂檔案透過 jsDelivr CDN 提供：`cdn.jsdelivr.net/gh/weiqi-kids/vuko.life@main/music/suno/`

## 常用指令

```bash
# 本地開發（任意靜態伺服器即可）
python -m http.server 8000

# 手動執行翻譯（需設定 OPENAI_API_KEY）
python .github/scripts/translate.py

# 手動執行 Embedding 更新
python .github/scripts/embedding.py
```

## 專案現況

- **當前分支**：`codex/檢查-sitemap.xml-排除重複網頁錯誤`（已完成，待合併到 main）

## 品質提升工作流程

維運期目標：
1. **SEO 優化** - 改善搜尋引擎排名
2. **技術健檢** - 效能、安全性、Core Web Vitals
3. **改版規劃** - 執行 revamp 流程做完整改版

### seo/ - SEO + AEO 優化規則庫

定義所有 SEO 和 AEO（AI 答案引擎優化）標準：
- JSON-LD Schema 類型（WebPage、Article、Person、Organization 等）
- SGE/AEO 標記規範（.key-answer、.key-takeaway 等）
- E-E-A-T 信號要求
- SEO 檢查清單
- Meta 標籤規範

**注意**：此規則庫原為內容網站設計，vuko.life 作為 Web App 適用的部分：
- WebPage / SoftwareApplication Schema
- Meta 標籤規範
- Core Web Vitals 優化
- 圖片優化

包含 Writer 和 Reviewer 兩個角色：
- `seo/writer/CLAUDE.md` - 執行 SEO 優化
- `seo/review/CLAUDE.md` - 檢查優化結果

### revamp/ - 網站改版工作流程

6 階段改版流程（尚未開始執行）：

| 階段 | 目的 | 輸出 |
|------|------|------|
| 0-positioning | 釐清品牌定位 | 定位文件 |
| 1-discovery | 現況盤點 + 技術健檢 | 健檢報告 |
| 2-competitive | 競品分析 | 競品報告 |
| 3-analysis | 受眾分析 + 內容差距 | 差距分析 |
| 4-strategy | 改版計劃 + 優先級 | 計劃書 |
| 5-content-spec | 每頁內容規格 | 規格書 |

每個階段有對應的 `CLAUDE.md` 和 `review/CLAUDE.md`。

自動化工具（在 `revamp/tools/`）：
```bash
# 網站健檢
./revamp/tools/site-audit.sh https://www.vuko.life

# 競品分析
./revamp/tools/competitive-audit.sh https://www.vuko.life https://competitor.com
```
