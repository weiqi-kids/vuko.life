# Google Search Console 設置指南

本指南說明如何將 vuko.life 提交到 Google Search Console 以提升搜尋引擎曝光。

## 步驟 1：登入 Google Search Console

1. 前往 [Google Search Console](https://search.google.com/search-console/)
2. 使用 Google 帳戶登入

## 步驟 2：新增資源

1. 點擊左上角的「新增資源」
2. 選擇「網址前置字元」
3. 輸入：`https://www.vuko.life`
4. 點擊「繼續」

## 步驟 3：驗證網站所有權

建議使用 **HTML 檔案驗證**（最簡單）：

1. 下載 Google 提供的 HTML 驗證檔案（例如：`google1234567890abcdef.html`）
2. 將檔案上傳到網站根目錄：`/home/user/vuko.life/`
3. 確認檔案可以通過 `https://www.vuko.life/google1234567890abcdef.html` 訪問
4. 回到 Search Console 點擊「驗證」

其他驗證方式：
- DNS 記錄驗證
- Google Analytics 驗證
- Google Tag Manager 驗證

## 步驟 4：提交 Sitemap

1. 在左側選單點擊「Sitemap」
2. 在「新增 Sitemap」輸入：`sitemap.xml`
3. 點擊「提交」

你的 sitemap 已經存在於：`https://www.vuko.life/sitemap.xml`

## 步驟 5：檢查索引狀態

提交後約 1-2 週，可以在以下地方檢查索引狀態：

- **涵蓋範圍**：查看哪些頁面已被索引
- **成效**：查看搜尋曝光次數、點擊次數
- **網址審查**：手動檢查特定頁面的索引狀態

## 步驟 6：要求建立索引（可選）

如果想加快索引速度：

1. 點擊「網址審查」
2. 輸入想要索引的 URL（例如：`https://www.vuko.life/app/zh-tw.html`）
3. 點擊「要求建立索引」

每天有配額限制，建議先提交主要語言頁面。

## 已完成的 SEO 優化

本專案已包含以下 SEO 優化：

- [x] `sitemap.xml` - 包含所有 30 個語言頁面
- [x] `robots.txt` - 正確設定爬蟲規則
- [x] Canonical tags - 每個頁面都有正確的 canonical URL
- [x] Meta description - 每個頁面都有描述
- [x] Open Graph tags - 社交分享優化
- [x] Twitter Card tags - Twitter 分享優化
- [x] Schema.org JSON-LD - 結構化資料

## 監控建議

定期檢查以下項目：

1. **涵蓋範圍錯誤**：修復任何爬取錯誤
2. **Core Web Vitals**：確保頁面載入速度
3. **行動裝置可用性**：確保手機瀏覽體驗
4. **搜尋成效**：追蹤曝光和點擊趨勢

## 相關資源

- [Google Search Console 說明中心](https://support.google.com/webmasters/)
- [Google 搜尋中心](https://developers.google.com/search)
