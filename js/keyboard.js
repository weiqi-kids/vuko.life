// P2-3: 鍵盤快捷鍵
(function() {
    const SHORTCUTS = {
        'Space': 'toggle',      // 空白鍵：開始/停止
        'KeyP': 'toggle',       // P：開始/停止
        'KeyS': 'stop',         // S：停止
        'KeyD': 'darkMode',     // D：切換深色模式
        'Slash': 'help'         // ?：顯示快捷鍵說明
    };

    let helpVisible = false;

    function createHelpModal() {
        const modal = document.createElement('div');
        modal.id = 'keyboardHelpModal';
        modal.className = 'keyboard-help-modal';
        modal.innerHTML = `
            <div class="keyboard-help-content">
                <h3>鍵盤快捷鍵</h3>
                <ul>
                    <li><kbd>Space</kbd> / <kbd>P</kbd> - 開始/停止</li>
                    <li><kbd>S</kbd> - 停止</li>
                    <li><kbd>D</kbd> - 切換深色模式</li>
                    <li><kbd>?</kbd> - 顯示此說明</li>
                    <li><kbd>Esc</kbd> - 關閉說明</li>
                </ul>
                <button class="keyboard-help-close">關閉</button>
            </div>
        `;
        document.body.appendChild(modal);

        modal.addEventListener('click', function(e) {
            if (e.target === modal || e.target.classList.contains('keyboard-help-close')) {
                hideHelp();
            }
        });

        return modal;
    }

    function showHelp() {
        let modal = document.getElementById('keyboardHelpModal');
        if (!modal) {
            modal = createHelpModal();
        }
        modal.classList.add('visible');
        helpVisible = true;
    }

    function hideHelp() {
        const modal = document.getElementById('keyboardHelpModal');
        if (modal) {
            modal.classList.remove('visible');
        }
        helpVisible = false;
    }

    function handleShortcut(action) {
        switch (action) {
            case 'toggle':
                if (typeof toggleAdaptiveMode === 'function') {
                    toggleAdaptiveMode();
                }
                break;
            case 'stop':
                if (typeof isRecording !== 'undefined' && isRecording && typeof toggleAdaptiveMode === 'function') {
                    toggleAdaptiveMode();
                }
                break;
            case 'darkMode':
                const toggle = document.getElementById('themeToggle');
                if (toggle) toggle.click();
                break;
            case 'help':
                if (helpVisible) {
                    hideHelp();
                } else {
                    showHelp();
                }
                break;
        }
    }

    document.addEventListener('keydown', function(e) {
        // 忽略在輸入框中的按鍵
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }

        // Escape 關閉說明
        if (e.code === 'Escape' && helpVisible) {
            hideHelp();
            return;
        }

        // ? 鍵需要檢查 Shift
        if (e.code === 'Slash' && e.shiftKey) {
            e.preventDefault();
            handleShortcut('help');
            return;
        }

        // 其他快捷鍵
        const action = SHORTCUTS[e.code];
        if (action && action !== 'help') {
            e.preventDefault();
            handleShortcut(action);
        }
    });
})();
