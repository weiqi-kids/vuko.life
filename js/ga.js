// Google Analytics helper functions
let gaInitialized = false;

// 回傳指定長度的隨機 16 進位字串
function genRandHex(length) {
  return Array.from(crypto.getRandomValues(new Uint8Array(Math.ceil(length/2))))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length);
}

// 產生自訂格式的 UID（僅在無法取得既有 UID 時呼叫）
function _generateUid() {
  const random8 = genRandHex(8);
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const dd = now.getDate().toString().padStart(2, '0');
  const hh = now.getHours().toString().padStart(2, '0');
  let weekday = now.getDay();
  weekday = weekday === 0 ? 7 : weekday; // 週日設為7，其餘1~6
  const wxxx = weekday + genRandHex(3); // w1~7 + 3位亂數
  const random12 = genRandHex(12);
  return `${random8}-${yy}${mm}-${dd}${hh}-${wxxx}-${random12}`;
}

// 回傳穩定的跨 session UID；優先從 localStorage 讀取，首次訪問才產生並儲存
function getUserId() {
  const LS_KEY = 'vuko_uid';
  try {
    const stored = localStorage.getItem(LS_KEY);
    if (stored) return stored;
    const uid = _generateUid();
    localStorage.setItem(LS_KEY, uid);
    return uid;
  } catch (e) {
    // localStorage 不可用（例如私密模式被封鎖）→ 退回單次 session 行為
    return _generateUid();
  }
}

// 偵測自動化／無頭瀏覽器（Playwright / Selenium / Puppeteer 等）。
// CI 的截圖工作（.github/scripts/screenshot.py）會用 Playwright 載入線上站台並觸發
// GA，這些來自資料中心的命中會污染本來就很小的樣本（GA4 顯示為 Unassigned /
// 資料中心城市），因此自動化流量一律不初始化 GA。
function isAutomatedBrowser() {
    try {
        if (navigator.webdriver) return true;
        if (/HeadlessChrome|PhantomJS|Puppeteer|Playwright|Selenium|\bbot\b|crawler|spider/i.test(navigator.userAgent || '')) return true;
    } catch (e) {}
    return false;
}

function initGoogleAnalytics() {
    if (!CONFIG.GOOGLE_ANALYTICS.ENABLE_TRACKING || !CONFIG.GOOGLE_ANALYTICS.GA_ID || gaInitialized) {
        return;
    }

    if (isAutomatedBrowser()) {
        return;
    }

    if (!window.gtag) {
        const script1 = document.createElement('script');
        script1.async = true;
        script1.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.GOOGLE_ANALYTICS.GA_ID}`;
        document.head.appendChild(script1);

        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', CONFIG.GOOGLE_ANALYTICS.GA_ID);
    }

    const lang = (navigator.language || '').toLowerCase().split('-')[0];
    const uid = getUserId();
    gtag('set', {'user_id': uid});
    gtag('set', 'user_properties', { 'lang': lang });

    gaInitialized = true;
}

function trackEvent(eventName, parameters = {}) {
    if (!CONFIG.GOOGLE_ANALYTICS.ENABLE_TRACKING || !window.gtag) {
        return;
    }

    window.gtag('event', eventName, {
        event_category: 'binaural_beats',
        ...parameters
    });
}