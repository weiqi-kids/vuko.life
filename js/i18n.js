// 國家代碼對應語言映射
const COUNTRY_LANGUAGE_MAP = {
    'TW': 'zh-TW', 'HK': 'zh-TW', 'MO': 'zh-TW',
    'CN': 'zh-CN', 'SG': 'zh-CN',
    'US': 'en', 'GB': 'en', 'AU': 'en', 'NZ': 'en',
    'CA': 'fr-CA',
    'IN': 'hi',
    'JP': 'ja',
    'KR': 'ko',
    'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es', 'CL': 'es',
    'PT': 'pt', 'BR': 'pt',
    'FR': 'fr-FR', 'BE': 'fr-BE',
    'RU': 'ru',
    'DE': 'de-DE', 'AT': 'de-AT', 'CH': 'de-CH',
    'ID': 'id',
    'TR': 'tr',
    'VN': 'vi',
    'TH': 'th',
    'PL': 'pl',
    'UA': 'uk',
    'IL': 'he',
    'MY': 'ms',
    'KE': 'sw',
    'PK': 'pa',
    'MM': 'my',
    'SA': 'ar', 'AE': 'ar', 'EG': 'ar',
    'BD': 'bn'
};

const FALLBACK_LANGUAGE = 'zh-TW';
const LANGUAGE_CONTENT = {};

async function loadLanguage(lang) {
    const path = `i18n/${lang.toLowerCase()}.json`;
    try {
        const res = await fetch(path);
        if (!res.ok) throw new Error('Load failed');
        LANGUAGE_CONTENT[lang] = await res.json();
    } catch (e) {
        if (lang !== FALLBACK_LANGUAGE) {
            await loadLanguage(FALLBACK_LANGUAGE);
            LANGUAGE_CONTENT[lang] = LANGUAGE_CONTENT[FALLBACK_LANGUAGE];
        } else {
            console.error('Failed to load language file:', e);
            LANGUAGE_CONTENT[lang] = {};
        }
    }
}

function getLanguageContent() {
    return LANGUAGE_CONTENT[currentLanguage] || LANGUAGE_CONTENT[FALLBACK_LANGUAGE] || {};
}

async function updateLanguageContent() {
    if (!LANGUAGE_CONTENT[currentLanguage]) {
        await loadLanguage(currentLanguage);
    }
    const content = getLanguageContent();

    document.documentElement.lang = currentLanguage;

    const seoKw = content.seoKeywords || 'Binaural Beats Meditation Focus Sleep';
    const brand = 'Vuko';
    // Keyword-first title to match the static <title> baked by
    // .github/scripts/prerender_content.py (apply_seo_head). The poetic
    // content.title remains the on-page H1, not the document title.
    document.title = seoKw + '｜' + brand;
    document.querySelector('h1').textContent = content.title || '';

    // 更新 h2 區段標題
    const sections = content.sections || {};
    const sectionInstructions = document.getElementById('sectionInstructions');
    if (sectionInstructions) sectionInstructions.textContent = sections.instructions || '';
    const sectionSettings = document.getElementById('sectionSettings');
    if (sectionSettings) sectionSettings.textContent = sections.settings || '';
    const sectionMonitor = document.getElementById('sectionMonitor');
    if (sectionMonitor) sectionMonitor.textContent = sections.monitor || '';
    document.querySelector('.adaptive-mode h3').textContent = content.subtitle || '';

    const headphoneItem = document.getElementById('instructionHeadphones');
    const micItem = document.getElementById('instructionMicrophone');
    if (headphoneItem && micItem && content.instructions) {
        headphoneItem.innerHTML = content.instructions.headphones || '';
        micItem.innerHTML = content.instructions.microphone || '';
    } else if (headphoneItem && micItem) {
        headphoneItem.innerHTML = '';
        micItem.innerHTML = '';
    }

    const labels = content.labels || {};
    document.getElementById('systemConfigTitle').textContent = labels.systemConfig || '';
    document.getElementById('audioSearchTitle').textContent = labels.audioSearch || '';
    document.getElementById('musicSearchInput').placeholder = labels.searchPlaceholder || '';
    document.getElementById('deviceTestBtn').innerHTML = `🎤 ${labels.deviceTest || ''}`;

    const binauralList = document.getElementById('binauralOptionsList');
    if (binauralList) {
        binauralList.innerHTML = '';
        const options = content.binauralOptions || [];
        const descriptions = content.binauralDescriptions || {};
        // 每個模式對應的圖示
        const icons = ['🎯', '🧘', '🌍', '😴', '⚡', '💡'];
        options.forEach((text, idx) => {
            const li = document.createElement('li');
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'binauralPreset';
            input.value = text;
            if (idx === 0) input.checked = true;
            label.appendChild(input);
            // 模式名稱區塊
            const nameSpan = document.createElement('span');
            nameSpan.className = 'binaural-mode-name';
            const iconSpan = document.createElement('span');
            iconSpan.className = 'binaural-mode-icon';
            iconSpan.textContent = icons[idx] || '🎵';
            nameSpan.appendChild(iconSpan);
            nameSpan.appendChild(document.createTextNode(text));
            label.appendChild(nameSpan);
            // 模式說明
            if (descriptions[text]) {
                const desc = document.createElement('span');
                desc.className = 'binaural-desc';
                desc.textContent = descriptions[text];
                label.appendChild(desc);
            }
            li.appendChild(label);
            binauralList.appendChild(li);
        });
    }

    const baseFreqLabel = document.getElementById('baseFreqLabel');
    if (baseFreqLabel) baseFreqLabel.textContent = labels.baseFreq || '';

    const volumeRatioLabel = document.getElementById('volumeRatioLabel');
    if (volumeRatioLabel) volumeRatioLabel.textContent = labels.volumeRatio || '';

    const tabLibrary = document.getElementById('tabLibrary');
    if (tabLibrary) tabLibrary.textContent = labels.libraryTab || '';

    const tabLocal = document.getElementById('tabLocal');
    if (tabLocal) tabLocal.textContent = labels.localFileTab || '';

    const privacyMsg = document.getElementById('filePrivacyMsg');
    if (privacyMsg) privacyMsg.textContent = labels.filePrivacyMsg || '';

    document.querySelector('.breath-visual h3').textContent = labels.breathVisual || '';
    document.querySelector('.breath-stats h3').textContent = labels.realTimeData || '';

    const statLabels = document.querySelectorAll('.stat-label');
    if (statLabels.length >= 1) {
        statLabels[0].textContent = labels.breathRate || '';
    }
    if (statLabels.length >= 2) {
        statLabels[1].textContent = labels.noiseLevel || '';
    }

    const toggleBtn = document.getElementById('monitorToggleBtn');
    const buttons = content.buttons || {};
    toggleBtn.textContent = isRecording ? buttons.stop || '' : buttons.start || '';

    // 更新信任元素
    const trust = content.trust || {};
    const trustFree = document.getElementById('trustFree');
    if (trustFree) trustFree.textContent = '✓ ' + (trust.free || '');
    const trustOpenSource = document.getElementById('trustOpenSource');
    if (trustOpenSource) trustOpenSource.textContent = '✓ ' + (trust.openSource || '');
    const trustPrivacy = document.getElementById('trustPrivacy');
    if (trustPrivacy) trustPrivacy.textContent = '✓ ' + (trust.privacy || '');

    // 更新分享按鈕
    const share = content.share || {};
    const shareTitle = document.getElementById('shareTitle');
    if (shareTitle) shareTitle.textContent = share.title || '';

    const pageUrl = encodeURIComponent(window.location.href);
    const pageTitle = encodeURIComponent(content.title || 'Vuko');

    const shareTwitter = document.getElementById('shareTwitter');
    if (shareTwitter) {
        shareTwitter.href = `https://twitter.com/intent/tweet?url=${pageUrl}&text=${pageTitle}`;
    }
    const shareFacebook = document.getElementById('shareFacebook');
    if (shareFacebook) {
        shareFacebook.href = `https://www.facebook.com/sharer/sharer.php?u=${pageUrl}`;
    }
    const shareLine = document.getElementById('shareLine');
    if (shareLine) {
        shareLine.href = `https://line.me/R/msg/text/?${pageTitle}%0A${pageUrl}`;
    }

    // 更新 FAQ
    const faq = content.faq || {};
    const faqTitle = document.getElementById('faqTitle');
    if (faqTitle) faqTitle.textContent = faq.title || '';
    const faqList = document.getElementById('faqList');
    if (faqList && faq.items) {
        faqList.innerHTML = '';
        faq.items.forEach((item, idx) => {
            const faqItem = document.createElement('details');
            faqItem.className = 'faq-item';
            const summary = document.createElement('summary');
            summary.className = 'faq-question';
            summary.textContent = item.q;
            const answer = document.createElement('div');
            answer.className = 'faq-answer';
            answer.textContent = item.a;
            faqItem.appendChild(summary);
            faqItem.appendChild(answer);
            faqList.appendChild(faqItem);
        });
    }

    resetStatsDisplay();
}

function resetStatsDisplay() {
    const content = getLanguageContent();
    const units = content.units || {};
    document.getElementById('breathRate').textContent = `-- ${units.perMin || ''}`;
    const noiseEl = document.getElementById('noiseLevel');
    if (noiseEl) noiseEl.textContent = `-- ${units.db || ''}`;
}
