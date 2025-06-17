// 國家代碼對應語言映射
const COUNTRY_LANGUAGE_MAP = {
    'TW': 'zh-TW', 'HK': 'zh-TW', 'MO': 'zh-TW',
    'CN': 'zh-CN', 'SG': 'zh-CN',
    'US': 'en', 'GB': 'en', 'CA': 'en', 'AU': 'en',
    'NZ': 'en', 'IN': 'en',
    'JP': 'ja',
    'KR': 'ko',
    'ES': 'es', 'MX': 'es', 'AR': 'es', 'CO': 'es', 'CL': 'es',
    'PT': 'pt', 'BR': 'pt'
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

    document.getElementById('baseFreqLabel').textContent = labels.baseFreq || '';
    document.getElementById('audioFileLabel').textContent = labels.audioFile || '';
    document.getElementById('volumeRatioLabel').textContent = labels.volumeRatio || '';

    document.querySelector('.breath-visual h3').textContent = labels.breathVisual || '';
    document.querySelector('.breath-stats h3').textContent = labels.realTimeData || '';

    const statLabels = document.querySelectorAll('.stat-label');
    if (statLabels.length >= 3) {
        statLabels[0].textContent = labels.breathRate || '';
        statLabels[1].textContent = labels.currentState || '';
        statLabels[2].textContent = labels.brainwave || '';
    }

    const toggleBtn = document.getElementById('monitorToggleBtn');
    const buttons = content.buttons || {};
    toggleBtn.textContent = isRecording ? buttons.stop || '' : buttons.start || '';

    resetStatsDisplay();
}

function resetStatsDisplay() {
    const content = getLanguageContent();
    const units = content.units || {};
    const status = content.status || {};
    document.getElementById('breathRate').textContent = `-- ${units.perMin || ''}`;
    document.getElementById('currentState').textContent = status.waiting || '';
    document.getElementById('brainwaveType').textContent = '--';
}
