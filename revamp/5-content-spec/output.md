# 內容規格書

## Phase 1：技術修復

### Spec-1：修復 HTML 結構

**修改檔案**：`app/*.html`（30 個語言版本）

#### 1.1 移動 `<base>` 標籤

**現況**：
```html
<link rel="canonical" href="..." />
<base href="../">
<link rel="canonical" href="..." />  <!-- 重複 -->
```

**目標**：
```html
<base href="../">
<link rel="canonical" href="..." />
<!-- 移除重複的 canonical -->
```

#### 1.2 修復標題層級

**現況**：h1 直接跳到 h3

**目標**：加入 h2 結構

```html
<h1>用聲音，帶你遇見更好的自己</h1>

<h2>使用說明</h2>  <!-- 新增 -->
<div class="adaptive-mode">
    <h3>...</h3>  <!-- 改為現有內容 -->
</div>

<h2>設定</h2>  <!-- 新增 -->
<div class="config-audio-container">...</div>

<h2>呼吸監測</h2>  <!-- 新增 -->
<div class="breathing-monitor">...</div>
```

---

## Phase 2：內容補強

### Spec-2：模式說明

**修改檔案**：`i18n/base.json`

**新增欄位**：
```json
{
  "binauralDescriptions": {
    "專注": "10Hz Alpha 波，幫助你進入專注狀態，適合工作、學習時使用",
    "冥想": "7Hz Theta 波，引導你進入深層放鬆，適合靜坐冥想",
    "舒曼共振": "7.83Hz 地球自然頻率，平衡身心能量",
    "睡眠": "3Hz Delta 波，幫助你快速入睡",
    "提神": "15Hz Beta 波，提升精神活力",
    "激發靈感": "40Hz Gamma 波，提升創意思維"
  }
}
```

**UI 呈現**：在選擇模式時顯示說明文字

### Spec-3：信任元素

**修改檔案**：`i18n/base.json`、`app/*.html`

**新增文案**：
```json
{
  "trust": {
    "free": "完全免費，無需註冊",
    "openSource": "開源專案，程式碼公開透明",
    "privacy": "音訊僅在本機處理，絕不上傳伺服器"
  }
}
```

**UI 位置**：頁面底部或設定區塊上方

### Spec-4：社群分享

**修改檔案**：`app/*.html`

**新增 HTML**：
```html
<div class="share-buttons">
    <a href="https://twitter.com/intent/tweet?url=...&text=..." target="_blank">Twitter</a>
    <a href="https://www.facebook.com/sharer/sharer.php?u=..." target="_blank">Facebook</a>
    <a href="https://line.me/R/msg/text/?..." target="_blank">LINE</a>
</div>
```

---

## Phase 3：SEO 優化

### Spec-5：優化 meta description

**現況**：
```html
<meta name="description" content="Vuko 智能呼吸節奏處理器 - 透過雙耳拍頻引導你進入冥想、專注、放鬆或睡眠狀態。即時監測呼吸，自動調整頻率。">
```

**目標**：
```html
<meta name="description" content="免費線上雙耳拍頻工具 - AI 即時監測呼吸，自動調整拍頻引導你進入冥想、睡眠、專注狀態。無需註冊，開源透明。">
```

**關鍵改變**：
- 加入「免費」關鍵字
- 強調「AI」差異化
- 加入「無需註冊」降低門檻
- 加入「開源」增加信任

---

## 多語系處理

**策略**：
1. 修改 `i18n/base.json`（繁中母版）
2. 提交後 CI 自動觸發翻譯
3. HTML 結構修改需同步 30 個檔案（可用腳本）

**腳本建議**：
```bash
# 批次修改所有語言版本的 HTML 結構
for file in app/*.html; do
    # 執行修改...
done
```

---

## 驗收標準

| 項目 | 驗收條件 |
|------|----------|
| HTML 錯誤 | W3C Validator 0 errors |
| 標題層級 | h1 → h2 → h3 正確巢狀 |
| Canonical | 只有一個 |
| 模式說明 | 每個模式都有說明文字 |
| 信任元素 | 頁面可見「免費」「開源」「隱私」說明 |
