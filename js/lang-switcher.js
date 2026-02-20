// P2-4: 語言切換器
(function() {
    const LANGUAGES = [
        { code: 'zh-tw', name: '繁體中文', flag: '🇹🇼' },
        { code: 'zh-cn', name: '简体中文', flag: '🇨🇳' },
        { code: 'zh-hk', name: '香港中文', flag: '🇭🇰' },
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'ja', name: '日本語', flag: '🇯🇵' },
        { code: 'ko', name: '한국어', flag: '🇰🇷' },
        { code: 'es', name: 'Español', flag: '🇪🇸' },
        { code: 'pt', name: 'Português', flag: '🇧🇷' },
        { code: 'fr-fr', name: 'Français', flag: '🇫🇷' },
        { code: 'de-de', name: 'Deutsch', flag: '🇩🇪' },
        { code: 'ru', name: 'Русский', flag: '🇷🇺' },
        { code: 'ar', name: 'العربية', flag: '🇸🇦' },
        { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
        { code: 'th', name: 'ไทย', flag: '🇹🇭' },
        { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
        { code: 'id', name: 'Indonesia', flag: '🇮🇩' },
        { code: 'ms', name: 'Melayu', flag: '🇲🇾' },
        { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
        { code: 'pl', name: 'Polski', flag: '🇵🇱' },
        { code: 'uk', name: 'Українська', flag: '🇺🇦' },
        { code: 'he', name: 'עברית', flag: '🇮🇱' },
        { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
        { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
        { code: 'pa', name: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
        { code: 'my', name: 'မြန်မာ', flag: '🇲🇲' },
        { code: 'sw', name: 'Kiswahili', flag: '🇰🇪' },
        { code: 'fr-ca', name: 'Français (CA)', flag: '🇨🇦' },
        { code: 'fr-be', name: 'Français (BE)', flag: '🇧🇪' },
        { code: 'de-at', name: 'Deutsch (AT)', flag: '🇦🇹' },
        { code: 'de-ch', name: 'Deutsch (CH)', flag: '🇨🇭' }
    ];

    function getCurrentLang() {
        const path = window.location.pathname;
        const match = path.match(/\/app\/([a-z]{2}(?:-[a-z]{2})?)\./i);
        return match ? match[1].toLowerCase() : 'zh-tw';
    }

    function switchLanguage(langCode) {
        const currentPath = window.location.pathname;
        const newPath = currentPath.replace(/\/app\/[a-z]{2}(?:-[a-z]{2})?\.html/i, `/app/${langCode}.html`);
        window.location.href = newPath;
    }

    function createSwitcher() {
        const currentLang = getCurrentLang();
        const currentLangObj = LANGUAGES.find(l => l.code === currentLang) || LANGUAGES[0];

        const container = document.createElement('div');
        container.className = 'lang-switcher';
        container.innerHTML = `
            <button class="lang-switcher-btn" id="langSwitcherBtn" aria-label="Switch language">
                <span class="lang-flag">${currentLangObj.flag}</span>
                <span class="lang-code">${currentLangObj.code.toUpperCase()}</span>
                <span class="lang-arrow">▼</span>
            </button>
            <div class="lang-dropdown" id="langDropdown">
                ${LANGUAGES.map(lang => `
                    <button class="lang-option ${lang.code === currentLang ? 'active' : ''}" data-lang="${lang.code}">
                        <span class="lang-flag">${lang.flag}</span>
                        <span class="lang-name">${lang.name}</span>
                    </button>
                `).join('')}
            </div>
        `;

        document.body.appendChild(container);

        // 綁定事件
        const btn = document.getElementById('langSwitcherBtn');
        const dropdown = document.getElementById('langDropdown');

        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            dropdown.classList.toggle('visible');
        });

        dropdown.addEventListener('click', function(e) {
            const option = e.target.closest('.lang-option');
            if (option) {
                const lang = option.dataset.lang;
                if (lang !== currentLang) {
                    switchLanguage(lang);
                }
                dropdown.classList.remove('visible');
            }
        });

        // 點擊外部關閉
        document.addEventListener('click', function() {
            dropdown.classList.remove('visible');
        });
    }

    document.addEventListener('DOMContentLoaded', createSwitcher);
})();
