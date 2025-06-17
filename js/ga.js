// Google Analytics helper functions
let gaInitialized = false;

function initGoogleAnalytics() {
    if (!CONFIG.GOOGLE_ANALYTICS.ENABLE_TRACKING || !CONFIG.GOOGLE_ANALYTICS.GA_ID || gaInitialized) {
        return;
    }

    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${CONFIG.GOOGLE_ANALYTICS.GA_ID}`;
    document.head.appendChild(script1);

    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', CONFIG.GOOGLE_ANALYTICS.GA_ID);

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
