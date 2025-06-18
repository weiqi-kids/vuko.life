// Google Analytics helper functions
let gaInitialized = false;

// 回傳指定長度的隨機 16 進位字串
function genRandHex(length) {
  return Array.from(crypto.getRandomValues(new Uint8Array(Math.ceil(length/2))))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, length);
}

// 產生自訂格式的 UID
function getUserId() {
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

function initGoogleAnalytics() {
    if (!CONFIG.GOOGLE_ANALYTICS.ENABLE_TRACKING || !CONFIG.GOOGLE_ANALYTICS.GA_ID || gaInitialized) {
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