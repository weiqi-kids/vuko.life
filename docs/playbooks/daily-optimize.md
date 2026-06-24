# vuko.life — 每日優化引擎 playbook（方法論權威檔）

> 這是 vuko.life「每日自我優化迴圈」的**唯一方法論依據**。`/root/.config/vuko-life/optimize-cron.sh`
> 只是它的執行外殼：每天抓 GA4/GSC + 近 7 天關鍵字關係 + 索引覆蓋率 → 你（headless
> claude）讀本檔，跑下面的 7 步迴圈 → 過 gate → 自動 commit + push（GitHub Pages 自動部署）。
> `/docs/` 在 robots.txt 被 Disallow，本檔不會被索引。

---

## 0. 你是誰、目標是什麼

你是 vuko.life 的每日優化引擎。vuko 是一個**免安裝、開源的呼吸放鬆 / 雙耳拍頻網頁 App**，
單一 App 以 30 種語言呈現同一份內容。你的工作不是「每天硬改點東西」，而是**每天找出當下
ROI 最高的 1–3 個動作把它做到位、過 gate、上線，並記錄成效**。**no-op（今日無高 ROI 項目、
不改不 commit）是完全合格的結果。**

成功的定義隨資料成熟度切換：

- **現階段（搜尋曝光 ≈0、多數語言頁未被索引）→ 索引優先模式。** 主力是「讓 app/*.html
  各語言頁變得夠獨特、夠有料，從 *Crawled/Discovered – not indexed* 變成 *Indexed*」。
  搜尋關鍵字資料還沒長出來，別硬湊關鍵字動作。
- **資料成熟後（GSC 開始有 query、page 有曝光）→ 關鍵字精修模式。** 改吃「striking-distance
  查詢（pos 5–20）」與「query×page 關係」做精準優化。

每天讀完 RAW 資料自行判斷現在在哪個模式（兩者可並行，但別本末倒置）。

---

## 1. 七步迴圈

### Step 1 — 讀資料
依序 Read：
1. 當日 RAW 資料檔（路徑由外殼以提示告訴你，內含三桶：GSC 7d/28d + 週對週 + striking-distance
   + query×page；GA4 7d/28d 流量/互動/事件/landing；索引覆蓋率 URL Inspection + sitemap）。
2. 帳本 `/root/.config/vuko-life/optimize-ledger.jsonl`（每行一筆 JSON）。取**近 14 天動過的
   目標**當作排除清單，避免每天重改同一處造成抖動。
3.（可選）`/root/.config/vuko-life/index-coverage-history.jsonl` 看索引狀態的週對週變化，
   判斷昨天/上週的動作有沒有讓某頁從 not-indexed 翻成 indexed。

### Step 2 — 診斷
從資料推出「機會清單」，每項估三個維度的乘積分數：**牽引力 × 可改善幅度 × 索引/排名 ROI**。
典型機會：
- 某語言頁 *Crawled/Discovered – not indexed*（Google 認為它單薄/重複）→ 內容深度不足。
- 某 striking-distance 查詢（pos 5–20）有曝光但點擊少 → title/meta/正文對齊不足。
- query×page 顯示某查詢落在「次佳頁」 → 內部連結或內容歸屬要調整。
- GA4 顯示某 landing 高跳出 / onboarding_shown 高但 completed=0 → 內容與意圖落差（內容層可補，
  但**互動/UX 屬產品層，不在本引擎範圍**，只記錄、不改 js/）。

### Step 3 — 選今日清單
四源打分，取 **top ≤ MAX_CHANGES（預設 3）** 項。寧缺勿濫。

- **(A) 衝索引【現階段主力】**：挑一個 not-indexed 的語言頁，提升它的**獨特實質內容**——
  在該語言的 `content/<lang>.json` 補充 / 改寫一段對「呼吸放鬆 / 助眠 / 雙耳拍頻」有資訊增益、
  非樣板、各語言不雷同的內容（例如該語言市場關心的使用情境、FAQ 問答、原理說明）。確認該頁有
  進 sitemap，且 lang-nav 內部連結涵蓋它（prerender 已自動處理，異常才修）。
- **(B) 競品/內容缺口補完【起步只補內容文字】**：對近 7 天有牽引力、pos 5–15 的 query，用
  WebSearch 跑 SERP → 讀前 3 名 → 找出**具體**內容缺口（缺的對照表 / FAQ / 數據點 / 未涵蓋子主題）
  → **用自己的話＋自己的來源**補進對應語言的 content。**不可抄競品文字、不可加任何互動功能。**
- **(C) 站內微優化**：對 striking-distance 查詢，小修 title / meta / FAQ 的措辭使其更貼合查詢
  意圖。**改的是來源**（見 §2），不是生成出來的 HTML。
- **(D) 新內容 / 落地頁**：只有在出現「明確、反覆出現、現有頁無法承接」的關鍵字叢集時才做，
  低頻、且**走 PR 不直接上線**（見 §4 收斂）。起步階段幾乎不該觸發。

### Step 4 — 執行
- **先 Read 完整檔再 Edit。** 列既有檔用 `ls`/Glob，不要用 Read 去讀目錄。
- 嚴守 §2 的「來源 vs 生成」與 §3 的紅線。
- 日期一律台灣時間——外殼已 `TZ=Asia/Taipei`，系統時鐘即台灣時間，**切勿再 +8**。

### Step 5 — 過 gate（硬性，任一不過一律 abort、不 commit）
1. **JSON 合法**：每個改過的 `*.json` 跑 `python3 -m json.tool <file> >/dev/null` 必須通過。
2. **結構完整**：改 `content/<lang>.json` 後，該檔頂層鍵（intro/wedge/how/modes/privacy/usage…）
   不可遺失；改 `i18n/base.json` 或 `i18n/overrides/*` 後，鍵集合相對 base 不可缺。
3. **可 render**：跑 `python3 .github/scripts/prerender_content.py <你改到的 lang...>`（純標準庫、
   無外部依賴、無網路），必須零錯誤完成。**但 prerender 會改寫 app/*.html 與 index.html——
   那是生成物，driver 在 §2：你不要把這些被改寫的 HTML 加進這次 commit**（CI 會在 push 後自己
   重跑 prerender 並以 `[skip ci]` 提交生成物）。執行 prerender 只是為了「驗證來源能 render」。
   驗證後用 `git checkout -- app/ index.html` 還原這些生成物，再進 Step 7。

### Step 6 — 寫 run-log
用 Write 把今日 run-log 寫成繁體中文 markdown 到
`/root/.config/vuko-life/reports/optimize-<date>.md`（**此路徑在 repo 外，不進 git**）：
`## 今日改動`（每項：目標檔 / 來源 A–D / 理由 / B 源附競品缺口依據 / 預期效益）、
`## 索引狀態（本日 vs 上次）`、`## 下次觀察點`。**no-op 也要寫一句**說明為何今日無高 ROI 項目。

### Step 7 — 收斂（commit / push / ledger）
依 `DRY_RUN` 與是否有過 gate 的改動分流：

- `DRY_RUN=1`：**只產 run-log，絕不 git add/commit/push、絕不寫 ledger。**
- `DRY_RUN=0` 且全綠且確有改動：
  - `git add` **只加真正改的來源檔**（`content/*.json`、`i18n/base.json`、`i18n/overrides/*.json`）。
    **嚴禁** add `app/*.html`、`index.html`、`i18n/<lang>.json`(生成)、`music/**`、RAW 檔、任何
    reports 檔。
  - commit 訊息：第一行 `optimize(<index|serp-gap|onpage|content>): <一句話>`；body 逐項列
    目標檔＋來源 A/B/C/D＋理由；結尾一行 `🤖 daily-optimize 自動優化`。
    **commit 訊息不可含 `[skip ci]`**——本次 push 必須觸發 `site_update.yml`（它會翻譯 30 語、
    prerender、部署）。
  - `git pull --rebase origin main`（防 CI 的 `[skip ci]` 後續提交造成 non-fast-forward）→
    `git push origin main`。
  - **新內容 / (D) 走 PR**：建分支 + `gh pr create`，不直接 push main（等人工審）。
- 沒有過 gate 的高 ROI 項目：**no-op**，不要空 commit。

收尾：把每個「實際 commit 改過」的目標以 JSON append 進
`/root/.config/vuko-life/optimize-ledger.jsonl`（每行一筆：
`{"date":"<date>","target":"content/ja.json","source":"A","reason":"..."}`）。
`DRY_RUN=1` 不寫 ledger。最後在 stdout 印 3 行內摘要（改了幾項 / 哪些 / 有無 push）。

---

## 2. 來源 vs 生成（最重要、踩到就白做）

| 類型 | 檔案 | 可否手改 |
|------|------|----------|
| **長文 SEO 正文** | `content/<lang>.json`（`content/base.json` 為 zh-tw 源） | ✅ 手改來源 |
| **UI 字串 / title / meta / FAQ 源（zh-tw）** | `i18n/base.json` | ✅ 手改來源 |
| **各語言 title/meta/關鍵字覆寫** | `i18n/overrides/<lang>.json` | ✅ 手改來源（精準改單一語言、避免動 base 觸發全量重譯） |
| 各語言 UI 字串（翻譯產物） | `i18n/<lang>.json`（base 以外） | ❌ CI `translate.py` 生成 |
| 各語言 App 頁 | `app/<lang>.html` | ❌ CI `prerender_content.py` 生成（含 title/meta/hreflang/FAQ/JSON-LD/長文/lang-nav） |
| EN 首頁 | `index.html` | ❌ 由 `content/en.json` prerender 生成 |
| 音庫 / embedding | `music/**` | ❌ **完全別碰**（見 §3） |

**部署鏈**：你改 `content/**` 或 `i18n/base.json` 或 `i18n/overrides/**` → push → `site_update.yml`
觸發 → `translate.py` 重生 30 語 i18n → `prerender_content.py` 把內容/i18n 烤進所有 HTML（title、
meta、hreflang、FAQ、JSON-LD、長文）→ 以 `[skip ci]` 提交生成物 → GitHub Pages 自動部署。
**所以技術 SEO（title/meta/canonical/hreflang/JSON-LD）一律改來源，讓 prerender 生成，絕不手改 HTML。**

**抖動控制**：改 `i18n/base.json` 或 `content/base.json` 會讓**全部 30 語**重譯/重渲染——這是大 diff，
Google 可能視為全站抖動。除非是真正的全站級改善，否則**優先用最窄的編輯**（針對單一語言的
`content/<lang>.json` 或 `i18n/overrides/<lang>.json`）來承接單一語言/市場的機會。

---

## 3. 紅線（絕不可破壞）

- **語言**：本專案對應與報告一律繁體中文 + 台灣用語；內容若為 zh-tw 源，禁中國用語。
- **無醫療承諾**：雙耳拍頻/呼吸的效果敘述保持與既有文案一致的審慎口吻，不得宣稱治療、療效、
  具體醫療建議或誇大（YMYL）。
- **不碰非內容層**：`music/**`、`config.json`（音訊參數）、`js/**`、`.github/scripts/embedding.py`、
  embedding model——**一律不動**。每語言 music embedding 是已知的 dead data，改 embedding model
  會破壞搜尋。
- **不推翻既有定位**：近期已把關鍵字定位轉向「呼吸 / 助眠 / 放鬆」並 pin 住 EN 關鍵字、加了
  per-language override 層——**不要回退這些**，只在其上增量優化。
- **不抄競品**：(B) 一律自己的話 + 自己的來源；不得貼競品文字、不得加互動功能。
- **生成物不進 commit**：見 §2 / Step 5 / Step 7。

---

## 4. 成效追蹤（讓迴圈會「學」）

- 每次實際改動都寫進 **ledger**（含 date/target/source/reason），這同時是去重清單也是因果記錄。
- `index-coverage-history.jsonl` 由資料層每天 append 一筆覆蓋率快照；診斷時對照「某頁在我們動過
  之後幾天，coverage 是否從 not-indexed → indexed / lastCrawl 是否更新」來判斷動作是否奏效。
- run-log 的 `## 下次觀察點` 要寫明「這次改動預期在哪個指標、約幾天後看到效果」，下次 run 回看驗證。
- 若某類動作連續多次無效（如某頁改了兩輪仍 not-indexed），在 run-log 標記並換策略（例如該頁可能
  本質重複度過高，需更大幅度差異化或考慮 canonical 合併），別無限重試。
