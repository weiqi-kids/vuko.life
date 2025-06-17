        // ===== 開發者配置區域 =====
        const CONFIG = {
            // 音訊設定
            BASE_FREQUENCY: 200,             // 基頻 (Hz)
            BINAURAL_VOLUME: 0.3,            // 拍頻音量 (0.0-1.0)
            BACKGROUND_VOLUME: 0.7,          // 背景音音量 (0.0-1.0)
            SAMPLE_RATE: 16000,              // 取樣率
            ANALYSIS_DURATION: 10,           // 分析時間長度 (秒)
            BREATH_DETECTION_SENSITIVITY: 0.8, // 呼吸檢測敏感度，建議 0.5~1.5，值越高越不易觸發
            WAVEFORM_SCALE: 100,             // 呼吸波形對數放大倍率
            
            // 語言設定
            LANGUAGE: 'auto',                // 'auto' 為自動偵測，或指定 'zh-TW', 'zh-CN', 'en', 'ja', 'ko'
            FALLBACK_LANGUAGE: 'zh-TW',      // 自動偵測失敗時的預設語言
            
            // IPinfo 地理位置偵測設定
            IPINFO: {
                API_TOKEN: '',               // IPinfo API Token (可留空使用免費額度)
                ENABLE_AUTO_LANGUAGE: true,  // 是否啟用根據地理位置自動切換語言
                TIMEOUT: 5000               // API 請求超時時間 (毫秒)
            },
            
            // Google Analytics 設定
            GOOGLE_ANALYTICS: {
                GA_ID: '',                    // GA4 測量ID (例: 'G-XXXXXXXXXX')
                ENABLE_TRACKING: false,       // 是否啟用追蹤
                TRACK_EVENTS: {
                    START_MONITORING: true,   // 追蹤開始監測事件
                    STOP_MONITORING: true,    // 追蹤停止監測事件
                    BREATH_STATE_CHANGE: true, // 追蹤呼吸狀態變化事件
                    LANGUAGE_DETECTION: true  // 追蹤語言偵測事件
                }
            },
            
            // 音樂內容選擇
            MUSIC_CONTENT: {
                TYPE: 'none',               // 'none', 'nature', 'ambient', 'meditation', 'white_noise', 'custom'
                CUSTOM_URL: '',              // 當 TYPE 為 'custom' 時使用的自訂URL
                LOOP: true,                  // 是否循環播放
                FADE_IN_DURATION: 3,         // 淡入時間 (秒)
                FADE_OUT_DURATION: 3         // 淡出時間 (秒)
            }
        };

        // 國家代碼對應語言映射定義移至 i18n.js

        // 預設音樂庫將由外部檔案載入
        let MUSIC_LIBRARY = {};

        async function loadMusicLibrary() {
            try {
                const res = await fetch('music/base.json');
                if (!res.ok) throw new Error('Load failed');
                MUSIC_LIBRARY = await res.json();
            } catch (e) {
                console.error('Failed to load music library:', e);
                MUSIC_LIBRARY = {};
            }
        }

        // ===== 配置區域結束 =====

        let audioContext;
        let isRecording = false;
        let mediaStream;
        let analyser;
        let dataArray;
        let binauralOscillators = [];
        let backgroundAudioSource;
        let backgroundGainNode;
        let bgAnalyser;
        let bgDataArray;
        let bgVolumeMonitorId = null;
        let currentBeatFreq = 8;
        let currentLanguage = CONFIG.FALLBACK_LANGUAGE;
        let userCountry = null;
        let selectedMusicItem = null;
        let allMusicItems = [];

        // 初始化音樂清單
        function initMusicLibrary() {
            allMusicItems = [];
            Object.keys(MUSIC_LIBRARY).forEach(category => {
                MUSIC_LIBRARY[category].forEach(item => {
                    allMusicItems.push({
                        ...item,
                        category: category
                    });
                });
            });
        }

        // 模糊搜尋算法 (支援拼音和錯字)
        function fuzzySearch(query, text) {
            if (!query || !text) return 0;
            
            query = query.toLowerCase();
            text = text.toLowerCase();
            
            // 完全匹配得分最高
            if (text.includes(query)) return 100;
            
            // 計算編輯距離 (Levenshtein distance)
            const editDistance = calculateEditDistance(query, text);
            const maxLen = Math.max(query.length, text.length);
            const similarity = ((maxLen - editDistance) / maxLen) * 100;
            
            return similarity;
        }

        // 計算編輯距離
        function calculateEditDistance(a, b) {
            const matrix = [];
            
            for (let i = 0; i <= b.length; i++) {
                matrix[i] = [i];
            }
            
            for (let j = 0; j <= a.length; j++) {
                matrix[0][j] = j;
            }
            
            for (let i = 1; i <= b.length; i++) {
                for (let j = 1; j <= a.length; j++) {
                    if (b.charAt(i - 1) === a.charAt(j - 1)) {
                        matrix[i][j] = matrix[i - 1][j - 1];
                    } else {
                        matrix[i][j] = Math.min(
                            matrix[i - 1][j - 1] + 1,
                            matrix[i][j - 1] + 1,
                            matrix[i - 1][j] + 1
                        );
                    }
                }
            }
            
            return matrix[b.length][a.length];
        }

        // 語意搜尋音樂
        function searchMusic(query) {
            if (!query.trim()) return [];
            
            const results = [];
            
            allMusicItems.forEach(item => {
                let maxScore = 0;
                
                // 搜尋音樂名稱
                const nameScore = Math.max(
                    fuzzySearch(query, item.name),
                    fuzzySearch(query, item.name_en)
                );
                maxScore = Math.max(maxScore, nameScore);
                
                // 搜尋關鍵字
                item.keywords.forEach(keyword => {
                    const keywordScore = fuzzySearch(query, keyword);
                    maxScore = Math.max(maxScore, keywordScore);
                });
                
                // 搜尋描述
                const descScore = fuzzySearch(query, item.description);
                maxScore = Math.max(maxScore, descScore * 0.7); // 描述權重較低
                
                // 搜尋分類
                const categoryScore = fuzzySearch(query, item.category);
                maxScore = Math.max(maxScore, categoryScore * 0.5); // 分類權重最低
                
                if (maxScore > 30) { // 設定最低相似度門檻
                    results.push({
                        ...item,
                        score: maxScore
                    });
                }
            });
            
            // 按分數排序
            return results.sort((a, b) => b.score - a.score);
        }

        // 渲染搜尋結果
        function renderSearchResults(results) {
            const content = getLanguageContent();
            const container = document.getElementById('searchResults');
            
            if (results.length === 0) {
                container.innerHTML = `<div class="no-results">${content.labels.noResults}</div>`;
                container.style.display = 'block';
                return;
            }
            
            let html = '';
            results.forEach((item, index) => {
                const isSelected = selectedMusicItem && selectedMusicItem.url === item.url;
                html += `
                    <div class="music-item ${isSelected ? 'selected' : ''}" data-index="${index}">
                        <div class="music-info">
                            <div class="music-name">${item.name} / ${item.name_en}</div>
                            <div class="music-description">${item.description}</div>
                        </div>
                        <div class="music-badge">${item.category}</div>
                    </div>
                `;
            });
            
            container.innerHTML = html;
            container.style.display = 'block';
            
            // 添加點擊事件監聽器
            container.querySelectorAll('.music-item').forEach((element, index) => {
                element.addEventListener('click', () => {
                    const item = results[index];
                    selectMusic(item.url, item.name, item.category);
                });
            });
        }

        // 選擇音樂
        function selectMusic(url, name, category) {
            selectedMusicItem = { url, name, category };
            
            // 更新配置
            CONFIG.MUSIC_CONTENT.TYPE = 'custom';
            CONFIG.MUSIC_CONTENT.CUSTOM_URL = url;
            
            // 顯示當前選擇
            showCurrentSelection(name);
            
            // 重新渲染搜尋結果以更新選中狀態
            const query = document.getElementById('musicSearchInput').value;
            if (query.trim()) {
                const results = searchMusic(query);
                renderSearchResults(results);
            }
            
            // 如果正在監測中，切換背景音樂
            if (isRecording) {
                switchBackgroundMusic(url);
            }
            
            // Google Analytics 追蹤
            if (CONFIG.GOOGLE_ANALYTICS.TRACK_EVENTS.START_MONITORING) {
                trackEvent('music_selected', {
                    music_name: name,
                    music_category: category,
                    language: currentLanguage
                });
            }
        }

        // 顯示當前選擇
        function showCurrentSelection(name) {
            const content = getLanguageContent();
            const container = document.getElementById('currentSelection');
            const label = document.getElementById('currentSelectionLabel');
            const nameElement = document.getElementById('currentSelectionName');
            
            label.textContent = content.labels.currentMusic;
            nameElement.textContent = name;
            container.style.display = 'block';
        }

        // 切換背景音樂
        function switchBackgroundMusic(url) {
            // 停止當前背景音樂
            if (backgroundAudioSource && backgroundGainNode) {
                backgroundGainNode.gain.exponentialRampToValueAtTime(
                    0.001, 
                    audioContext.currentTime + 1
                );
                setTimeout(() => {
                    if (backgroundAudioSource) {
                        backgroundAudioSource.stop();
                        backgroundAudioSource = null;
                        backgroundGainNode = null;
                        bgAnalyser = null;
                    }
                }, 1000);
            }
            
            // 載入新的背景音樂
            setTimeout(() => {
                if (url && isRecording) {
                    loadBackgroundAudio(url);
                }
            }, 1000);
        }

        // 自動偵測用戶地理位置和語言
        function detectUserLanguage() {
            return new Promise((resolve, reject) => {
                // 如果設定為手動指定語言，直接使用
                if (CONFIG.LANGUAGE !== 'auto') {
                    currentLanguage = CONFIG.LANGUAGE;
                    resolve(currentLanguage);
                    return;
                }

                // 如果未啟用自動語言偵測，使用預設語言
                if (!CONFIG.IPINFO.ENABLE_AUTO_LANGUAGE) {
                    currentLanguage = CONFIG.FALLBACK_LANGUAGE;
                    resolve(currentLanguage);
                    return;
                }

                // 建構 IPinfo API URL
                const apiUrl = CONFIG.IPINFO.API_TOKEN ? 
                    `https://ipinfo.io/json?token=${CONFIG.IPINFO.API_TOKEN}` : 
                    'https://ipinfo.io/json';

                // 設定請求超時
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), CONFIG.IPINFO.TIMEOUT);

                fetch(apiUrl, {
                    signal: controller.signal,
                    headers: {
                        'Accept': 'application/json'
                    }
                }).then(response => {
                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        throw new Error(`IPinfo API 請求失敗: ${response.status}`);
                    }

                    return response.json();
                }).then(data => {
                    userCountry = data.country;

                    // 根據國家代碼映射語言
                    if (userCountry && COUNTRY_LANGUAGE_MAP[userCountry]) {
                        currentLanguage = COUNTRY_LANGUAGE_MAP[userCountry];
                    } else {
                        // 如果國家代碼不在映射表中，嘗試使用瀏覽器語言
                        currentLanguage = getBrowserLanguage();
                    }

                    // Google Analytics 追蹤語言偵測
                    if (CONFIG.GOOGLE_ANALYTICS.TRACK_EVENTS.LANGUAGE_DETECTION) {
                        trackEvent('language_detection', {
                            detected_country: userCountry,
                            detected_language: currentLanguage,
                            detection_method: 'ipinfo_api',
                            browser_language: navigator.language
                        });
                    }

                    resolve(currentLanguage);

                }).catch(error => {
                    clearTimeout(timeoutId);
                    console.warn('語言自動偵測失敗:', error.message);
                    
                    // 降級到瀏覽器語言偵測
                    currentLanguage = getBrowserLanguage();

                    // 追蹤偵測失敗事件
                    if (CONFIG.GOOGLE_ANALYTICS.TRACK_EVENTS.LANGUAGE_DETECTION) {
                        trackEvent('language_detection_failed', {
                            error_message: error.message,
                            fallback_language: currentLanguage,
                            detection_method: 'browser_language'
                        });
                    }
                    
                    resolve(currentLanguage);
                });
            });
        }

        // 從瀏覽器語言設定推斷語言
        function getBrowserLanguage() {
            const browserLang = navigator.language || navigator.languages[0] || CONFIG.FALLBACK_LANGUAGE;
            
            // 轉換瀏覽器語言代碼為應用支援的語言
            if (browserLang.startsWith('zh')) {
                if (browserLang.includes('TW') || browserLang.includes('HK') || browserLang.includes('MO')) {
                    return 'zh-TW';
                } else {
                    return 'zh-CN';
                }
            } else if (browserLang.startsWith('ja')) {
                return 'ja';
            } else if (browserLang.startsWith('ko')) {
                return 'ko';
            } else if (browserLang.startsWith('en')) {
                return 'en';
            } else {
                return CONFIG.FALLBACK_LANGUAGE;
            }
        }

        // 獲取背景音檔URL
       function getBackgroundAudioUrl() {
            if (CONFIG.MUSIC_CONTENT.TYPE === 'none') {
                return '';
            }
            if (CONFIG.MUSIC_CONTENT.TYPE === 'custom') {
                return CONFIG.MUSIC_CONTENT.CUSTOM_URL;
            }
            
            const musicList = MUSIC_LIBRARY[CONFIG.MUSIC_CONTENT.TYPE];
            if (musicList && musicList.length > 0) {
                // 隨機選擇一首音樂
                const randomIndex = Math.floor(Math.random() * musicList.length);
                return musicList[randomIndex].url;
            }
            
            return '';
        }

        // 初始化配置顯示
        function initConfigDisplay() {
            const content = getLanguageContent();
            const audioUrl = getBackgroundAudioUrl();
            
            // 顯示音樂類型和國家資訊
            let audioInfo = content.units.none;
            if (audioUrl) {
                if (CONFIG.MUSIC_CONTENT.TYPE === 'custom') {
                    audioInfo = audioUrl.split('/').pop();
                } else {
                    audioInfo = CONFIG.MUSIC_CONTENT.TYPE;
                }
            }
            
            // 如果有偵測到國家，顯示國家資訊
            if (userCountry) {
                audioInfo += ` (${userCountry})`;
            }
        }

        // 初始化 Web Audio API
        function initAudioContext() {
            return new Promise((resolve, reject) => {
                if (!audioContext) {
                    audioContext = new (window.AudioContext || window.webkitAudioContext)();
                }
                if (audioContext.state === 'suspended') {
                    audioContext.resume().then(() => {
                        resolve();
                    }).catch(reject);
                } else {
                    resolve();
                }
            });
        }

        // 切換監測狀態
        function toggleAdaptiveMode() {
            if (isRecording) {
                stopAdaptiveMode();
            } else {
                startAdaptiveMode();
            }
        }

        // 開始智能呼吸監測模式
        function startAdaptiveMode() {
            initAudioContext().then(() => {
                // Google Analytics 追蹤
                if (CONFIG.GOOGLE_ANALYTICS.TRACK_EVENTS.START_MONITORING) {
                    trackEvent('start_monitoring', {
                        language: currentLanguage,
                        music_type: CONFIG.MUSIC_CONTENT.TYPE
                    });
                }
                
                // 取得麥克風權限 - 使用簡化的音訊設定以提高相容性
                return navigator.mediaDevices.getUserMedia({ audio: true });
            }).then(stream => {
                mediaStream = stream;
                
                // 設置音訊分析
                const source = audioContext.createMediaStreamSource(mediaStream);
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                // 降低平滑係數以加快波形反應速度
                analyser.smoothingTimeConstant = 0.1;
                
                source.connect(analyser);
                
                const bufferLength = analyser.frequencyBinCount;
                dataArray = new Uint8Array(bufferLength);
                
                isRecording = true;
                
                // 啟動呼吸檢測
                startBreathDetection();
                
                // 生成初始拍頻
                startBinauralBeats();
                
                // 載入背景音檔（如果有配置）
                const audioUrl = getBackgroundAudioUrl();
                if (audioUrl) {
                    loadBackgroundAudio(audioUrl);
                }
                
                const content = getLanguageContent();
                const toggleBtn = document.getElementById('monitorToggleBtn');
                toggleBtn.textContent = content.buttons.stop;
                showStatus(content.status.monitoring, 'processing');
                
            }).catch(error => {
                console.error('啟動失敗:', error);
                const content = getLanguageContent();
                showStatus(`${content.status.error}${error.message}`, 'error');
            });
        }

        // 停止智能模式
        function stopAdaptiveMode() {
            isRecording = false;

            // Google Analytics 追蹤
            if (CONFIG.GOOGLE_ANALYTICS.TRACK_EVENTS.STOP_MONITORING) {
                trackEvent('stop_monitoring', {
                    language: currentLanguage
                });
            }

            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }

            // 停止拍頻
            stopBinauralBeats();
            stopBackgroundVolumeMonitor();

            // 停止背景音樂（帶淡出效果）
            if (backgroundAudioSource && backgroundGainNode) {
                const fadeOutDuration = CONFIG.MUSIC_CONTENT.FADE_OUT_DURATION;
                backgroundGainNode.gain.exponentialRampToValueAtTime(
                    0.001,
                    audioContext.currentTime + fadeOutDuration
                );
                setTimeout(() => {
                    if (backgroundAudioSource) {
                        backgroundAudioSource.stop();
                        backgroundAudioSource = null;
                        backgroundGainNode = null;
                        bgAnalyser = null;
                    }
                }, fadeOutDuration * 1000);
            }

            const content = getLanguageContent();
            const toggleBtn = document.getElementById('monitorToggleBtn');
            toggleBtn.textContent = content.buttons.start;
            const breathCircle = document.getElementById('breathCircle');
            if (breathCircle) breathCircle.classList.remove('breathing');

            // 重置統計顯示
            resetStatsDisplay();
            showStatus(content.status.stopped, 'success');
        }

        // UI 輔助函數
        function showStatus(message, type) {
            const status = document.getElementById('status');
            status.textContent = message;
            status.className = `status ${type}`;
            status.style.display = 'block';
        }

        // 在 adaptive-mode 區塊的提示文字閃爍
        function flashAdaptiveMode() {
            const items = document.querySelectorAll('.adaptive-mode li');
            items.forEach(li => li.classList.add('flash'));
            setTimeout(() => {
                items.forEach(li => li.classList.remove('flash'));
            }, 2000);
        }

        // 左右聲道播放測試
        function playStereoTest(callback) {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const leftOsc = ctx.createOscillator();
            const rightOsc = ctx.createOscillator();
            const leftGain = ctx.createGain();
            const rightGain = ctx.createGain();
            const merger = ctx.createChannelMerger(2);

            leftOsc.frequency.value = 440;
            rightOsc.frequency.value = 440;

            leftOsc.connect(leftGain).connect(merger, 0, 0);
            rightOsc.connect(rightGain).connect(merger, 0, 1);
            merger.connect(ctx.destination);

            leftOsc.start();
            rightOsc.start();

            leftGain.gain.value = 0.5;
            rightGain.gain.value = 0;
            showStatus('左聲道測試中...', 'processing');
            setTimeout(() => {
                leftGain.gain.value = 0;
                rightGain.gain.value = 0.5;
                showStatus('右聲道測試中...', 'processing');
                setTimeout(() => {
                    leftOsc.stop();
                    rightOsc.stop();
                    ctx.close();
                    if (callback) callback();
                }, 1000);
            }, 1000);
        }

        // 呼吸檢測
        function startBreathDetection() {
            const canvas = document.getElementById('waveform');
            const ctx = canvas.getContext('2d');
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            
            let breathingSamples = [];
            let lastBreathTime = Date.now();
            let breathCount = 0;

            let breathTimestamps = [];
            let lastLogTime = Date.now();
            const ANALYSIS_WINDOW = 24; // 約1秒的樣本數
            
            function detectBreath() {
                if (!isRecording) return;

                analyser.getByteTimeDomainData(dataArray);

                // 計算能量
                let energy = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    const sample = (dataArray[i] - 128) / 128;
                    energy += sample * sample;
                }
                energy = Math.sqrt(energy / dataArray.length);


                // 最近樣本僅用於比較，計算門檻時排除
                if (breathingSamples.length >= ANALYSIS_WINDOW + 2) {
                    const prevEnergy = breathingSamples[breathingSamples.length - 1];
                    const prevPrevEnergy = breathingSamples[breathingSamples.length - 2];

                    const start = Math.max(0, breathingSamples.length - ANALYSIS_WINDOW - 2);
                    const analysis = breathingSamples.slice(start, breathingSamples.length - 2);

                    if (analysis.length) {
                        const sorted = [...analysis].sort((a, b) => a - b);
                        const trim = Math.floor(sorted.length * 0.2);
                        const trimmed = sorted.slice(0, sorted.length - trim);
                        const avgEnergy = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
                        const variance = trimmed.reduce((sum, v) => sum + Math.pow(v - avgEnergy, 2), 0) / trimmed.length;

                        const std = Math.sqrt(variance);
                        const threshold = avgEnergy + std * CONFIG.BREATH_DETECTION_SENSITIVITY;

                        // 前一個樣本高於兩側且超過門檻視為峰值
                        if (prevEnergy > threshold && prevEnergy > prevPrevEnergy && prevEnergy > energy) {
                            const now = Date.now();
                            if (now - lastBreathTime > 1000) {
                                breathCount++;
                                lastBreathTime = now;

                                breathTimestamps.push(now);
                            }
                        }
                    }
                }

                breathingSamples.push(energy);
                if (breathingSamples.length > 300) { // 保持約10秒的數據
                    breathingSamples.shift();
                }

                // 繪製波形
                drawWaveform(ctx, canvas, breathingSamples);
                
                // 每5秒計算一次呼吸速率
                if (breathingSamples.length % 150 === 0) {
                    const now = Date.now();
                    breathTimestamps = breathTimestamps.filter(t => now - t <= 60000);
                    const breathRate = breathTimestamps.length; // 60 秒內的次數即 BPM
                    updateBreathingStats(breathRate);
                }

                // 每10秒輸出一次除錯資訊
                if (Date.now() - lastLogTime >= 10000) {
                    const now = Date.now();
                    breathTimestamps = breathTimestamps.filter(t => now - t <= 60000);
                    const breathRate = breathTimestamps.length;
                    console.log('Breath debug', {
                        time: new Date().toISOString(),
                        breathRate: breathRate.toFixed(1),
                        breathCount,
                        samples: [...breathingSamples]
                    });
                    lastLogTime = Date.now();
                }

                // 每10秒輸出一次除錯資訊
                if (Date.now() - lastLogTime >= 10000) {
                    const breathRate = (breathCount / (breathingSamples.length / 30)) * 60;
                    console.log('Breath debug', {
                        time: new Date().toISOString(),
                        breathRate: breathRate.toFixed(1),
                        breathCount,
                        samples: [...breathingSamples]
                    });
                    lastLogTime = Date.now();
                }
                
                requestAnimationFrame(detectBreath);
            }
            
            detectBreath();
        }

        // 繪製波形
        function drawWaveform(ctx, canvas, samples) {
            // 清除畫布
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // 繪製中線
            ctx.strokeStyle = '#dee2e6';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(0, canvas.height / 2);
            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
            
            // 繪製波形
            ctx.strokeStyle = '#667eea';
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            const sliceWidth = canvas.width / samples.length;
            const scale = CONFIG.WAVEFORM_SCALE || 1;
            let x = 0;
            const EXP = CONFIG.WAVEFORM_EXP || 4; // 可調參數，建議從 1.2 ~ 4 之間試試看

            for (let i = 0; i < samples.length; i++) {
                const sample = samples[i];
                let scaled = sample;
                if (scale > 1) {
                    scaled = Math.log1p(sample * (scale - 1)) / Math.log(scale);
                }
                scaled = Math.sign(scaled) * Math.pow(Math.abs(scaled), EXP);
                const y = (scaled * canvas.height / 2) + canvas.height / 2;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }
            
            ctx.stroke();
        }

        // 更新呼吸統計
        function updateBreathingStats(breathRate) {
            const content = getLanguageContent();
            const units = content.units || {};
            document.getElementById('breathRate').textContent = `${breathRate.toFixed(1)} ${units.perMin || ''}`;

            let beatFreq, stateKey;

            if (breathRate < 10) {
                stateKey = 'deep_relaxed';
                beatFreq = 4;
            } else if (breathRate < 15) {
                stateKey = 'relaxed';
                beatFreq = 6;
            } else if (breathRate < 20) {
                stateKey = 'normal';
                beatFreq = 10;
            } else {
                stateKey = 'tense';
                beatFreq = 14;
            }
            
            // 更新拍頻
            if (beatFreq !== currentBeatFreq) {
                // Google Analytics 追蹤狀態變化
                if (CONFIG.GOOGLE_ANALYTICS.TRACK_EVENTS.BREATH_STATE_CHANGE) {
                    trackEvent('breath_state_change', {
                        from_state: currentBeatFreq,
                        to_state: beatFreq,
                        state_name: stateKey,
                        breath_rate: breathRate,
                        language: currentLanguage
                    });
                }
                
                currentBeatFreq = beatFreq;
                updateBinauralBeats(beatFreq);
            }
        }

        // 生成拍頻音訊
        function startBinauralBeats() {
            // 左耳振盪器
            const leftOsc = audioContext.createOscillator();
            const leftGain = audioContext.createGain();
            leftOsc.type = 'sine';
            leftOsc.frequency.setValueAtTime(CONFIG.BASE_FREQUENCY, audioContext.currentTime);
            leftGain.gain.setValueAtTime(CONFIG.BINAURAL_VOLUME, audioContext.currentTime);
            
            // 右耳振盪器  
            const rightOsc = audioContext.createOscillator();
            const rightGain = audioContext.createGain();
            rightOsc.type = 'sine';
            rightOsc.frequency.setValueAtTime(CONFIG.BASE_FREQUENCY + currentBeatFreq, audioContext.currentTime);
            rightGain.gain.setValueAtTime(CONFIG.BINAURAL_VOLUME, audioContext.currentTime);
            
            // 立體聲分離
            const merger = audioContext.createChannelMerger(2);
            leftOsc.connect(leftGain).connect(merger, 0, 0);
            rightOsc.connect(rightGain).connect(merger, 0, 1);
            merger.connect(audioContext.destination);
            
            leftOsc.start();
            rightOsc.start();
            
            binauralOscillators = [leftOsc, rightOsc, leftGain, rightGain, merger];
        }

        // 更新拍頻頻率
        function updateBinauralBeats(newBeatFreq) {
            if (binauralOscillators.length > 0) {
                const rightOsc = binauralOscillators[1];
                rightOsc.frequency.setValueAtTime(CONFIG.BASE_FREQUENCY + newBeatFreq, audioContext.currentTime);
            }
        }

        // 停止拍頻
        function stopBinauralBeats() {
            binauralOscillators.forEach(node => {
                if (node.stop) {
                    node.stop();
                } else if (node.disconnect) {
                    node.disconnect();
                }
            });
            binauralOscillators = [];
        }

        function startBackgroundVolumeMonitor() {
            if (!bgAnalyser) return;
            if (!binauralOscillators.length) return;
            bgDataArray = new Float32Array(bgAnalyser.fftSize);

            function monitor() {
                if (!bgAnalyser || !binauralOscillators.length) return;
                bgAnalyser.getFloatTimeDomainData(bgDataArray);
                let sum = 0;
                for (let i = 0; i < bgDataArray.length; i++) {
                    const v = bgDataArray[i];
                    sum += v * v;
                }
                const rms = Math.sqrt(sum / bgDataArray.length);
                const leftGain = binauralOscillators[2];
                const rightGain = binauralOscillators[3];
                const target = CONFIG.BINAURAL_VOLUME * rms;
                leftGain.gain.setTargetAtTime(target, audioContext.currentTime, 0.01);
                rightGain.gain.setTargetAtTime(target, audioContext.currentTime, 0.01);
                bgVolumeMonitorId = requestAnimationFrame(monitor);
            }

            if (!bgVolumeMonitorId) {
                bgVolumeMonitorId = requestAnimationFrame(monitor);
            }
        }

        function stopBackgroundVolumeMonitor() {
            if (bgVolumeMonitorId) cancelAnimationFrame(bgVolumeMonitorId);
            bgVolumeMonitorId = null;
        }

        // 載入背景音檔
        function loadBackgroundAudio(url) {
            fetch(url).then(response => {
                if (!response.ok) {
                    throw new Error(`無法載入背景音檔：${response.statusText}`);
                }
                return response.arrayBuffer();
            }).then(arrayBuffer => {
                return audioContext.decodeAudioData(arrayBuffer);
            }).then(audioBuffer => {
                backgroundAudioSource = audioContext.createBufferSource();
                backgroundGainNode = audioContext.createGain();
                bgAnalyser = audioContext.createAnalyser();
                bgAnalyser.fftSize = 2048;
                
                backgroundAudioSource.buffer = audioBuffer;
                backgroundAudioSource.loop = CONFIG.MUSIC_CONTENT.LOOP;
                
                // 設置淡入效果
                const fadeInDuration = CONFIG.MUSIC_CONTENT.FADE_IN_DURATION;
                backgroundGainNode.gain.setValueAtTime(0, audioContext.currentTime);
                backgroundGainNode.gain.exponentialRampToValueAtTime(
                    CONFIG.BACKGROUND_VOLUME, 
                    audioContext.currentTime + fadeInDuration
                );
                
                backgroundAudioSource.connect(bgAnalyser);
                bgAnalyser.connect(backgroundGainNode).connect(audioContext.destination);
                backgroundAudioSource.start();
                startBackgroundVolumeMonitor();
            }).catch(error => {
                console.warn('背景音檔載入失敗:', error);
            });
        }

        // 設備測試功能
        function testDevice() {
            const btn = document.getElementById('deviceTestBtn');
            const originalText = btn.innerHTML;

            btn.disabled = true;
            btn.innerHTML = '🔄 測試中...';
            showStatus('麥克風測試中...', 'processing');

            // 測試麥克風
            navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1
                }
            }).then(stream => {
                // 簡單測試音訊輸入
                const testContext = new (window.AudioContext || window.webkitAudioContext)();
                const source = testContext.createMediaStreamSource(stream);
                const testAnalyser = testContext.createAnalyser();
                source.connect(testAnalyser);
                
                const bufferLength = testAnalyser.frequencyBinCount;
                const dataArray = new Uint8Array(bufferLength);
                
                // 測試3秒
                let maxVolume = 0;
                const testDuration = 3000;
                const startTime = Date.now();
                
                const testInterval = setInterval(() => {
                    testAnalyser.getByteTimeDomainData(dataArray);
                    
                    let volume = 0;
                    for (let i = 0; i < dataArray.length; i++) {
                        const sample = Math.abs(dataArray[i] - 128);
                        volume = Math.max(volume, sample);
                    }
                    
                    maxVolume = Math.max(maxVolume, volume);
                    
                    if (Date.now() - startTime > testDuration) {
                        clearInterval(testInterval);
                        stream.getTracks().forEach(track => track.stop());
                        testContext.close();
                        
                        // 顯示測試結果
                        if (maxVolume > 10) {
                            showStatus('麥克風正常', 'success');
                        } else {
                            showStatus('⚠️ 麥克風音量過低', 'error');
                            flashAdaptiveMode();
                        }

                        playStereoTest(() => {
                            btn.innerHTML = originalText;
                            btn.style.background = 'linear-gradient(45deg, #28a745, #20c997)';
                            btn.disabled = false;
                            showStatus('設備測試完成', 'success');
                        });
                    }
                }, 100);

            }).catch(error => {
                console.error('設備測試失敗:', error);
                btn.innerHTML = '❌ 測試失敗';
                btn.style.background = 'linear-gradient(45deg, #dc3545, #c82333)';
                flashAdaptiveMode();

                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = 'linear-gradient(45deg, #28a745, #20c997)';
                    btn.disabled = false;
                }, 2000);
            });
        }

        // 初始化
        document.addEventListener('DOMContentLoaded', async () => {
            // 從外部檔案載入音樂庫
            await loadMusicLibrary();
            initMusicLibrary();
            
            // 初始化 Google Analytics
            initGoogleAnalytics();
            
            // 自動偵測用戶語言
            detectUserLanguage().then(async () => {
                await updateLanguageContent();
                initConfigDisplay();
                getLanguageContent();
            }).catch(async error => {
                console.error('語言偵測失敗:', error);
                await updateLanguageContent();
                initConfigDisplay();
            });
            
            // 設置搜尋框事件
            const searchInput = document.getElementById('musicSearchInput');
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value;
                if (query.trim()) {
                    const results = searchMusic(query);
                    renderSearchResults(results);
                } else {
                    document.getElementById('searchResults').style.display = 'none';
                }
            });

            // 頁面關閉時清理資源
            window.addEventListener('beforeunload', () => {
                if (isRecording) {
                    stopAdaptiveMode();
                }
            });

            // 檢查瀏覽器支援
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                const content = getLanguageContent();
                showStatus(content.status.unsupported, 'error');
                document.getElementById('monitorToggleBtn').disabled = true;
                document.getElementById('deviceTestBtn').disabled = true;
            }
        });
