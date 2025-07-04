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

    document.title = content.title || '';
    document.querySelector('h1').textContent = content.title || '';
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
        options.forEach((text, idx) => {
            const li = document.createElement('li');
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = 'radio';
            input.name = 'binauralPreset';
            input.value = text;
            if (idx === 0) input.checked = true;
            label.appendChild(input);
            label.appendChild(document.createTextNode(' ' + text));
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

    resetStatsDisplay();
}

function resetStatsDisplay() {
    const content = getLanguageContent();
    const units = content.units || {};
    document.getElementById('breathRate').textContent = `-- ${units.perMin || ''}`;
    const noiseEl = document.getElementById('noiseLevel');
    if (noiseEl) noiseEl.textContent = `-- ${units.db || ''}`;
}
