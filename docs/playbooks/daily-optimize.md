# vuko.life — 每日優化引擎 playbook（方法論權威檔）

> 這是 vuko.life「每日自我優化迴圈」的**唯一方法論依據**。執行分兩段：
> (1) **GitHub Actions** workflow `.github/workflows/seo_data.yml`（每日 UTC 02:00）用 `GA4_SA_KEY`
> secret 抓 GA4/GSC + 近 7 天關鍵字關係 + 索引覆蓋率，寫進 repo 的 `seo/data/latest.raw.md` 並
> commit；(2) 雲端 /schedule 優化 routine（就是你，每日 UTC 03:40）pull 後讀本檔 + RAW，跑下面的
> 7 步迴圈 → 過 gate → commit + push（GitHub Pages 自動部署）。
> `/docs/` 與 `/seo/` 在 robots.txt 皆被 Disallow，本檔與資料不會被索引。

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
依序 Read（皆在 repo 內）：
1. 當日 RAW 資料檔 `seo/data/latest.raw.md`（GitHub Actions `seo_data.yml` 當天稍早寫入並 commit；
   內含三桶：GSC 7d/28d + 週對週 + striking-distance + query×page；GA4 7d/28d 流量/互動/事件/
   landing；索引覆蓋率 URL Inspection + sitemap）。**先確認它的日期是今天**——若是舊的，表示
   `seo_data.yml` 今天還沒跑或失敗，據此謹慎判斷（可 no-op）。
2. 帳本 `seo/data/optimize-ledger.jsonl`（每行一筆 JSON）。取**近 14 天動過的目標**當排除清單，
   避免每天重改同一處造成抖動。
3.（可選）`seo/data/index-coverage-history.jsonl` 看索引狀態的週對週變化，判斷昨天/上週的動作
   有沒有讓某頁從 not-indexed 翻成 indexed。

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
  **優先序**：對照 RAW 的 GA4 country / browser-language 與 GSC by-country——若某語言市場**已有真實
  訪客**（或搜尋曝光）但對應語言頁仍 not-indexed，優先補強它（訪客已在、只差被收錄，ROI 最高）；
  其次才是完全沒流量、純靠內容深度去爭取首次收錄的語言。判斷時留意：資料中心城市/單一來源的量多半
  是爬蟲，別當成真實需求。
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
用 Write 把今日 run-log 寫成繁體中文 markdown 到 `reports/optimize-<date>.md`（**在 repo 內、
會 commit 進去**，作為公開的優化軌跡）：`## 今日改動`（每項：目標檔 / 來源 A–D / 理由 / B 源附
競品缺口依據 / 預期效益）、`## 索引狀態（本日 vs 上次）`、`## 下次觀察點`。**no-op 也要寫一句**
說明為何今日無高 ROI 項目（no-op 當天仍 commit 這份 run-log，但不碰任何內容檔）。

### Step 7 — 收斂（commit / push / ledger）
依是否有過 gate 的改動分流（若本次被指定為 dry-run，則只走前 6 步、產 run-log，**絕不**
git add/commit/push、絕不寫 ledger）：

- **有過 gate 的內容改動**：
  - `git add` **只加真正改的來源檔**（`content/*.json`、`i18n/base.json`、`i18n/overrides/*.json`），
    **再加** 本次的 `seo/data/optimize-ledger.jsonl`（見收尾）與 `reports/optimize-<date>.md`。
    **嚴禁** add `app/*.html`、`index.html`、`i18n/<lang>.json`(生成)、`music/**`、
    `seo/data/latest.raw.md`(資料 cron 所有)、`seo/data/index-coverage-history.jsonl`(同左)。
  - commit 訊息：第一行 `optimize(<index|serp-gap|onpage|content>): <一句話>`；body 逐項列
    目標檔＋來源 A/B/C/D＋理由；結尾一行 `🤖 daily-optimize 自動優化`。
    **commit 訊息不可含 `[skip ci]`**——本次 push 必須觸發 `site_update.yml`
    （它會把 content/i18n 用 `prerender_content.py` 烤進 HTML 並部署；不再有 OpenAI 翻譯）。
  - `git pull --rebase origin main`（防資料 cron 與 CI 的 `[skip ci]` 提交造成 non-fast-forward）→
    `git push origin main`。
  - **新內容 / (D) 走 PR**：建分支 + `gh pr create`，不直接 push main（等人工審）。
- **no-op（無過 gate 的高 ROI 項目）**：不碰任何內容檔，但仍 `git add reports/optimize-<date>.md`
  （說明為何今日 no-op）→ commit（訊息 `optimize(noop): <一句話>`，不含 `[skip ci]`，但因為只動
  `reports/` 不在 `site_update.yml` paths、不會觸發 build）→ pull --rebase → push。
- **資料過舊或抓取失敗**（`latest.raw.md` 非今日）：同 no-op，run-log 註明資料問題。

收尾：把每個「實際 commit 改過」的目標以 JSON append 進 `seo/data/optimize-ledger.jsonl`
（每行一筆：`{"date":"<date>","target":"content/ja.json","source":"A","reason":"..."}`），
並把這次 append 一起納入上面的 commit。最後在 stdout 印 3 行內摘要（改了幾項 / 哪些 / 有無 push）。

### Step 8 — Slack 回報（每次都做，無論有無改動）
完成上面全部後，用 Bash 執行 `/root/.config/vuko-life/slack-notify.sh C0BCS1RAZ3L "<摘要>"`（或把摘要
寫成檔再 `cat 檔 | /root/.config/vuko-life/slack-notify.sh C0BCS1RAZ3L`，避免引號問題）post 一則**繁體
中文**摘要到 #拍頻-vuko-life（≤ 15 行，給人看的通知、不是資料）。
**不要用 Slack MCP 工具**——本機 cron 的 headless claude 沒有它；`slack-notify.sh` 用 bot token 直發。
若發送失敗，不中斷，記一行到 run-log 即可。

**格式要可一眼掃讀**：用 emoji+粗體當小標、條列、區段間空一行；**不要寫成一整段文字**。
數字靠左對齊、用 `·` 或 ` / ` 分隔。嚴格照下面兩個範本（依當天有無改動擇一）：

有改動：
```
📊 *vuko 每日優化｜<date>*

*✅ 今日改動（<N> 項）*
• `content/fr-fr.json` — 補法國市場情境＋關鍵字　_(A·衝索引)_
• `content/ru.json` — 補俄語市場情境　_(A·衝索引)_

*🔍 索引覆蓋*
• 已索引　1 / 31（首頁 `/`）
• 待索引　zh-tw · de-de · ja · es · ko · pt
• sitemap　0 / 30

🚀 *已部署* commit `ad91029`　｜　👀 *下次觀察* fr-fr/ru 約 1–2 週後是否轉 indexed
```

no-op：
```
😴 *vuko 每日優化｜<date>｜今日 no-op*

今日無高 ROI 項目（近 14 天動過的頁排除中），未改內容。
*🔍 索引覆蓋*　已索引 1 / 31　·　sitemap 0 / 30　·　待索引 6 頁
一句說明為何今日 no-op（例：可動的語言頁近期都已補過，等收錄結果）。
```

`<date>` 用台灣日期；`<N>`、檔名、來源、索引數字都換成當天實際值。

---

## 2. 來源 vs 生成（最重要、踩到就白做）

| 類型 | 檔案 | 可否手改 |
|------|------|----------|
| **長文 SEO 正文** | `content/<lang>.json`（`content/base.json` 為 zh-tw 源） | ✅ 手改來源 |
| **UI 字串 / title / meta / FAQ 源（zh-tw）** | `i18n/base.json` | ✅ 手改來源 |
| **各語言 title/meta/關鍵字覆寫** | `i18n/overrides/<lang>.json` | ✅ 手改來源（精準改單一語言） |
| 各語言 UI 字串 | `i18n/<lang>.json`（base 以外） | ⚠️ 靜態檔（原 OpenAI 翻譯已移除、不再自動重生）；勿由本引擎手改 |
| 各語言 App 頁 | `app/<lang>.html` | ❌ CI `prerender_content.py` 生成（含 title/meta/hreflang/FAQ/JSON-LD/長文/lang-nav） |
| EN 首頁 | `index.html` | ❌ 由 `content/en.json` prerender 生成 |
| 音庫 / embedding | `music/**` | ❌ **完全別碰**（見 §3） |

**部署鏈**：你改 `content/**` 或 `i18n/base.json` 或 `i18n/overrides/**` → push → `site_update.yml`
觸發 → `prerender_content.py` 把內容/i18n 烤進所有 HTML（title、meta、hreflang、FAQ、JSON-LD、長文）
→ 以 `[skip ci]` 提交生成物 → GitHub Pages 自動部署。**已無 OpenAI 翻譯步驟**；各語言 `i18n/<lang>.json`
為靜態檔，改 `i18n/base.json` 不會自動傳播到其他語言（只影響 zh-tw 與 prerender 重烤）。
**技術 SEO（title/meta/canonical/hreflang/JSON-LD）一律改來源，讓 prerender 生成，絕不手改 HTML。**

**抖動控制**：仍**優先用最窄的編輯**（針對單一語言的 `content/<lang>.json` 或
`i18n/overrides/<lang>.json`）來承接單一語言/市場的機會；非全站級改善別動 `base.json`，避免一次
重渲染過多頁面被 Google 視為全站抖動。

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
