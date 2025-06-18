// Google Analytics helper functions
let gaInitialized = false;

function getUserId() {
    const KEY = 'vuko_user_id';
    try {
        let id = localStorage.getItem(KEY);
        if (!id) {
            if (window.crypto && crypto.randomUUID) {
                id = crypto.randomUUID();
            } else {
                id = Date.now().toString(36) + Math.random().toString(36).substr(2);
            }
            localStorage.setItem(KEY, id);
        }
        return id;
    } catch (e) {
        return 'uid_' + Date.now();
    }
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
