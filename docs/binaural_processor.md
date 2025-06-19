# binaural_processor.js 核心演算法說明

本文件詳細說明 `js/binaural_processor.js` 的輸入格式、輸出結果與主要計算步驟。

此模組負責依據使用者設定與偵測到的呼吸頻率計算導引音的拍頻、音量以及背景音比例，
並將相關資訊記錄於 `log` 物件，供後續除錯或分析使用。

---

## 目錄

1. [輸入參數（Input）](#輸入參數input)
2. [輸出參數（Output）](#輸出參數output)
3. [核心運作公式（Core Logic）](#核心運作公式core-logic)
4. [補充與注意事項](#補充與注意事項)

---

## 輸入參數（Input）

---
### 配置物件格式

| 欄位 | 類型 | 說明 | 範例 |
| --- | --- | --- | --- |
| `breath.target` | float | 目標呼吸頻率 (Hz) | `0.2` |
| `breath.curve` | array<float> | 呼吸頻率引導曲線 | `[0.18,0.19,0.2]` |
| `breath.range` | array<float> | 可接受的呼吸頻率範圍 | `[0.18,0.22]` |
| `breath.threshold` | float | 偏離觸發門檻 (Hz) | `0.02` |
| `breath.max_diff` | float | 最大容許偏差 (Hz) | `0.07` |
| `bgm.main_freq` | float | 背景音基頻 (Hz) | `741` |
| `bgm.file` | string | 背景音檔案 URL | `https://.../rainforest.mp3` |
| `bgm.type` | string | 背景音類型 | `rainforest` |
| `bgm.volume` | float | 背景音音量比例 (0~1) | `0.5` |
| `beat.init` | float | 拍頻初始值 (Hz) | `12` |
| `beat.target` | float | 拍頻目標值 (Hz) | `8` |
| `beat.curve` | array<float> | 拍頻引導曲線 | `[12,10,8]` |
| `meta.version` | string | 設定檔版本號 | `"1.0"` |
| `noiseDb` | float | 測得的背景噪音值 (dB) | `42` |
| `noiseThresholdDb` | float | 噪音警告門檻 (dB) | `50` |

## 輸出參數（Output）

| 參數名   | 類型         | 說明                                                     | 範例                      |
|----------|--------------|----------------------------------------------------------|---------------------------|
| `F_beat` | float        | 推薦導引音拍頻（Hz）                                     | 0.22                      |
| `V`      | float        | 導引音音量（0~1）                                        | 0.65                      |
| `R_bg`   | float        | 背景音權重（0~1，值大代表環境音比重高）                  | 0.4                       |
| `F_base` | float        | 建議的基礎頻率（Hz，依據所選音樂類型/情境）              | 528                       |
| `warning`| string/null  | 噪音或偵測警告訊息，如有異常會提供建議                  | "高噪音，請靠近麥克風"    |
| `log`    | object       | 除錯或分析用的參數記錄                                   | {"delta_b": 0.05, ...}    |

---

## 核心邏輯（Core Logic）

本模組的主要流程如下：

1. **解析輸入**：從傳入的物件中取得 `breath`、`bgm`、`beat` 與 `meta` 等設定，若缺少欄位則套用預設值。
2. **背景音處理**：當 `bgm` 為陣列時取第一個項目，並擷取其 `main_freq`、`type`、`volume` 等資訊。
3. **拍頻計算**：若 `beat.curve` 有值則以陣列最後一個數字作為導引拍頻 (`F_beat`)，否則直接使用 `beat.target`。
4. **參數輸出**：
   - `V` 固定為 `1`，代表導引音的基礎音量。
   - `R_bg` 依 `bgm.volume` 限制在 `0`～`1` 之間。
   - `F_base` 取自 `bgm.main_freq`。
   - `warning` 依 `noiseDb` 與 `noiseThresholdDb` 判斷，過高則回傳警告字串。
5. **記錄與回傳**：將計算過程中的參數整理於 `log`，最終回傳 `{ F_beat, V, R_bg, F_base, warning, log }`。

---

## 設備、用戶資訊、歷史與回饋紀錄（用戶自願參與 Flywheel）

本系統支援紀錄裝置資訊、使用者標識、平台來源，並可選擇性保存個人呼吸歷史及體驗回饋（Flywheel）。
這些資料**完全尊重用戶意願與隱私**，主要用於：
- 幫助用戶追蹤自身呼吸/專注訓練成效
- 協助系統自動優化參數、個人化推薦
- 用於匿名性統計分析與功能迭代

| 參數名稱       | 類型           | 說明                                               | 範例                    |
| -------------- | -------------- | -------------------------------------------------- | ---------------------- |
| device_label   | string         | 收音裝置名稱（僅於用戶授權下取得）                  | "iPhoneMic_1"          |
| user_id        | string         | 用戶唯一識別（僅於登入/授權時產生，保障匿名性）      | "u123456"              |
| platform       | string         | 執行平台/版本（如 Web、iOS、Android）               | "web"                  |
| history        | object/array   | 過往呼吸、偏離、音量等紀錄（用戶可選擇開啟/關閉）     | [{...}, {...}]         |
| feedback       | object         | 用戶自願回饋（自評分、問卷、意見建議等）             | {"guide_effect": 4}    |

> 歷史資料與回饋紀錄均採「用戶自主回報」，可隨時啟用/停用，**所有資料僅用於功能優化，不作為商業用途或對外公開。**

---

## 補充與注意事項

此演算法範例僅展示整體流程，實際應用中可依裝置能力或使用場景擴充更複雜的
呼吸偵測與動態調整策略。

