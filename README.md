# vuko.life 智能呼吸拍頻處理器

![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)
![Release](https://img.shields.io/github/release/yourname/project.svg)
![update](https://img.shields.io/badge/updated-weekly-blue)
![Security](https://img.shields.io/snyk/vulnerabilities/github/weiqi-kids/vuko.life)

---

## 🧘 vuko.life 智能呼吸拍頻處理器

> AI 驅動的個人化呼吸節奏、環境音樂自動導引，
> 結合聲音科技與即時偵測，幫助你隨時進入冥想、專注或療癒狀態。

### [🌐 線上體驗 DEMO https://www.vuko.life/](https://www.vuko.life/)

---

## 功能特點

- 🎧 **AI 智能拍頻與音樂引導**（根據呼吸調整拍頻與聲音組成）
- 🔎 **語意/向量化音樂搜尋**（支援自然語言/embedding 智慧推薦）
- 🌎 **多語支援**（繁體中文／英文／日文／韓文，介面自動偵測）
- 🔌 **模組化程式碼架構**（JS/i18n/config/music 分離易擴充）
- 📈 **公開網站數據看板**（Plausible 儀表板）
- 🤝 **歡迎貢獻、支援 Pull Requests & Issue 討論**

---

## 專案目錄結構

```
/
├── index.html                  # 網站首頁，主要 UI 入口，引用 JS 與資源
├── config.json                 # 全域設定（如預設語言、拍頻參數、音量、AI 閾值等）
├── README.md                   # 專案說明文件（含徽章、安裝教學、結構說明等）
│
├── js/                         # 前端主要 JavaScript 程式碼
│   ├── binaural_processor.js   # 拍頻音訊與呼吸推論演算法
│   ├── audio_selector.js       # 音檔搜尋、載入與播放控制
│   ├── ga.js                   # GA 分析
│   └── i18n.js                 # 多語界面切換/載入邏輯
│
├── i18n/                       # 多語系介面文案資料夾
│   ├── zh-tw.json              # 繁體中文界面文字
│   ├── en.json                 # 英文界面文字
│   ├── ja.json                 # 日文界面文字
│   └── ko.json                 # 韓文界面文字
│
├── music/                      # 多語音樂資料（標題、標籤、描述、embedding等）
│   ├── zh-tw.json              # 中文音樂清單與標籤
│   ├── en.json                 # 英文音樂清單與標籤
│   └── base.json               # 共用音樂 embedding 資料（語意搜尋向量）
│
├── img/                        # 網站圖片與品牌資源
│   └── logo.svg                # vuko.life Logo 向量檔
│
└── assets/                     # 其他靜態資源（CSS 樣式、圖標、文件等）
```

---

## 📦 快速開始

1. `index.html` 直接用瀏覽器打開即可（支援 Github Pages 靜態部署）
2. 所有 JS/音樂資料皆為靜態載入（無需後端）

## 更新音樂向量 (Embeddings)

執行 `.github/scripts/embedding.py` 會根據 `music/base.json`
中的 `title`、`desc` 與 `tag` 欄位，透過 `all-MiniLM-L6-v2` 模型生成
embedding 並寫回檔案。此步驟需要下載 `sentence-transformers` 套件及模型
權重，必須具備網路連線。若在離線環境，建議預先建置虛擬環境或快取依賴。

---

## 授權

[MIT License](LICENSE)

---
