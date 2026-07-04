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
            NOISE_THRESHOLD_DB: 50,         // 背景噪音警告門檻 (dB)
            
            // 語言設定
            LANGUAGE: 'auto',                // 'auto' 為自動偵測，或指定 'zh-TW', 'zh-CN', 'en', 'ja', 'ko', 'ar', 'hi', 'fr-FR', 'fr-CA', 'fr-BE', 'ru', 'de-DE', 'de-AT', 'de-CH', 'id', 'tr', 'vi', 'th', 'pl', 'uk', 'he', 'ms', 'sw', 'pa', 'my', 'ta', 'bn'
            FALLBACK_LANGUAGE: 'zh-TW',      // 自動偵測失敗時的預設語言
            
            // IPinfo 地理位置偵測設定
            IPINFO: {
                API_TOKEN: '',               // IPinfo API Token (可留空使用免費額度)
                ENABLE_AUTO_LANGUAGE: false, // 停用：改用 navigator.language（無外部 API、無隱私疑慮、即時）。
                                             // 過去呼叫 ipinfo.io 約 25% 失敗 (language_detection_failed)，且各頁皆已硬設語言、首頁依瀏覽器語言轉址。
                TIMEOUT: 5000               // API 請求超時時間 (毫秒)
            },
            
            // Google Analytics 設定
            GOOGLE_ANALYTICS: {
                GA_ID: 'G-QCQZZ8X2S7',        // GA4 測量ID (例: 'G-XXXXXXXXXX')
                ENABLE_TRACKING: true,        // 是否啟用追蹤
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
                FADE_OUT_DURATION: 3,        // 淡出時間 (秒)
                OVERLAP_DURATION: 5          // 迴圈重疊時間 (秒)
            }
        };

        // 國家代碼對應語言映射定義移至 i18n.js

        // 瀏覽器語言前綴對應支援語言的映射表
        const BROWSER_LANGUAGE_MAP = {
            ja: 'ja', ko: 'ko', en: 'en', ru: 'ru', ar: 'ar',
            hi: 'hi', id: 'id', tr: 'tr', vi: 'vi', th: 'th',
            pl: 'pl', uk: 'uk', he: 'he', ms: 'ms', sw: 'sw',
            pa: 'pa', my: 'my', ta: 'ta', bn: 'bn'
        };

        // 需要區域變體處理的語言設定
        const REGIONAL_LANGUAGE_VARIANTS = {
            zh: {
                variants: { TW: 'zh-TW', HK: 'zh-TW', MO: 'zh-TW' },
                defaultLang: 'zh-CN'
            },
            fr: {
                variants: { CA: 'fr-CA', BE: 'fr-BE' },
                defaultLang: 'fr-FR'
            },
            de: {
                variants: { AT: 'de-AT', CH: 'de-CH' },
                defaultLang: 'de-DE'
            }
        };

        // 預設音樂庫將由外部檔案載入 (移至 audio_selector.js)

        // ===== 配置區域結束 =====

        let audioContext;
        let isRecording = false;
        let mediaStream;
        let analyser;
        let dataArray;
        let binauralOscillators = [];
        let backgroundAudioSource;
        let backgroundGainNode;
        let backgroundAudioBuffer;
        let crossfadeTimeout = null;
        let bgAnalyser;
        let bgDataArray;
        let bgVolumeMonitorId = null;
        let lastNoiseUpdate = 0;
        let currentBeatFreq = 8;
        let currentLanguage = CONFIG.FALLBACK_LANGUAGE;
        let userCountry = null;
        // 選擇狀態移至 audio_selector.js

        // 模糊搜尋算法 (支援拼音和錯字)
        // 相關搜尋與選擇邏輯已移至 audio_selector.js

        // 自動偵測用戶地理位置和語言
        function detectUserLanguage() {
            return new Promise((resolve, reject) => {
                // 如果設定為手動指定語言，直接使用
                if (CONFIG.LANGUAGE !== 'auto') {
                    currentLanguage = CONFIG.LANGUAGE;
                    resolve(currentLanguage);
                    return;
                }

                // 未啟用地理位置偵測：用瀏覽器語言（而非固定 fallback），不呼叫外部 API
                if (!CONFIG.IPINFO.ENABLE_AUTO_LANGUAGE) {
                    currentLanguage = getBrowserLanguage();
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
            const langPrefix = browserLang.slice(0, 2).toLowerCase();

            // 處理需要區域變體的語言 (zh, fr, de)
            const regionalConfig = REGIONAL_LANGUAGE_VARIANTS[langPrefix];
            if (regionalConfig) {
                for (const [region, langCode] of Object.entries(regionalConfig.variants)) {
                    if (browserLang.includes(region)) {
                        return langCode;
                    }
                }
                return regionalConfig.defaultLang;
            }

            // 處理直接映射的語言
            return BROWSER_LANGUAGE_MAP[langPrefix] || CONFIG.FALLBACK_LANGUAGE;
        }

        // 獲取背景音檔URL 移至 audio_selector.js

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

                const bgmName = selectedMusicItem ? selectedMusicItem.name : CONFIG.MUSIC_CONTENT.TYPE;
                trackEvent('play', {
                    bgm: bgmName,
                    beat: currentBeatFreq
                });
                
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

                // 啟動 session 追蹤
                if (typeof startSessionTracking === 'function') {
                    startSessionTracking();
                }

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

            // 停止 session 追蹤
            if (typeof stopSessionTracking === 'function') {
                stopSessionTracking();
            }

            // Google Analytics 追蹤
            if (CONFIG.GOOGLE_ANALYTICS.TRACK_EVENTS.STOP_MONITORING) {
                trackEvent('stop_monitoring', {
                    language: currentLanguage
                });
            }
            trackEvent('stop');

            if (mediaStream) {
                mediaStream.getTracks().forEach(track => track.stop());
            }

            // 停止拍頻
            stopBinauralBeats();
            stopBackgroundVolumeMonitor();
            if (crossfadeTimeout) {
                clearTimeout(crossfadeTimeout);
                crossfadeTimeout = null;
            }

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
            let lastBreathRateUpdate = 0;
            const ANALYSIS_WINDOW = 24; // 約1秒的樣本數
            
            function detectBreath() {
                if (!isRecording) return;

                analyser.getByteTimeDomainData(dataArray);

                // 計算能量並估算背景噪音(dB)
                let energy = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    const sample = (dataArray[i] - 128) / 128;
                    energy += sample * sample;
                }
                energy = Math.sqrt(energy / dataArray.length);

                const noiseDb = 20 * Math.log10(energy + 1e-8);
                updateNoiseLevel(noiseDb);
                const { warning } = processBinaural({ noiseDb, noiseThresholdDb: CONFIG.NOISE_THRESHOLD_DB });
                if (warning) {
                    showStatus(warning, 'warning');
                }


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
                
                // 每秒更新一次呼吸速率
                const now = Date.now();
                if (now - lastBreathRateUpdate >= 1000) {
                    breathTimestamps = breathTimestamps.filter(t => now - t <= 60000);
                    let breathRate = 0;
                    if (breathTimestamps.length > 0) {
                        const duration = now - breathTimestamps[0];
                        if (duration > 0) {
                            breathRate = breathTimestamps.length * 60000 / duration;
                        }
                    }
                    updateBreathingStats(breathRate);
                    lastBreathRateUpdate = now;
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

            for (let i = 0; i < samples.length; i++) {
                const sample = samples[i];
                let scaled = sample;
                if (scale > 1) {
                    scaled = Math.log1p(sample * (scale - 1)) / Math.log(scale);
                }
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

        function updateNoiseLevel(db) {
            const now = Date.now();
            if (typeof db === 'number' && now - lastNoiseUpdate < 1000) {
                return;
            }
            if (typeof db === 'number') {
                lastNoiseUpdate = now;
            }
            const content = getLanguageContent();
            const units = content.units || {};
            const text = (typeof db === 'number') ? `${db.toFixed(1)} ${units.db || ''}` : `${db}`;
            document.getElementById('noiseLevel').textContent = text;
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
            trackEvent('page_enter');

            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    trackEvent('tab_hidden');
                } else {
                    trackEvent('tab_visible');
                }
            });
            
            // 自動偵測用戶語言
            detectUserLanguage().then(async () => {
                await updateLanguageContent();
                initConfigDisplay();
                getLanguageContent();
                // Initialize onboarding for first-time users
                if (typeof initOnboarding === 'function') {
                    initOnboarding();
                }
                // Initialize session tracker
                if (typeof initSessionTracker === 'function') {
                    initSessionTracker();
                }
            }).catch(async error => {
                console.error('語言偵測失敗:', error);
                await updateLanguageContent();
                initConfigDisplay();
                // Initialize onboarding even if language detection fails
                if (typeof initOnboarding === 'function') {
                    initOnboarding();
                }
                // Initialize session tracker
                if (typeof initSessionTracker === 'function') {
                    initSessionTracker();
                }
            });
            
            // 搜尋框事件已在 audio_selector.js 處理

            // 頁面關閉時清理資源
            window.addEventListener('beforeunload', () => {
                if (isRecording) {
                    stopAdaptiveMode();
                }
                trackEvent('page_close');
            });

            // 檢查瀏覽器支援
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                const content = getLanguageContent();
                showStatus(content.status.unsupported, 'error');
                document.getElementById('monitorToggleBtn').disabled = true;
                document.getElementById('deviceTestBtn').disabled = true;
            }
        });

        // ===== Hero 接線（僅新增，不動既有邏輯） =====
        // 首屏大播放鍵走與 #monitorToggleBtn 完全相同的啟動流程
        // （toggleAdaptiveMode → start_monitoring / play GA 事件不變）。
        function heroTogglePlay() {
            trackEvent('hero_play_click', { recording: isRecording });
            toggleAdaptiveMode();
        }

        document.addEventListener('DOMContentLoaded', () => {
            const heroBtn = document.getElementById('heroPlayBtn');
            const mainBtn = document.getElementById('monitorToggleBtn');
            const heroModes = document.getElementById('heroModes');

            // 依 isRecording 同步 hero 播放鍵的圖示/文字/樣式。既有邏輯在每次
            // 啟停（與語言切換）時都會改寫 #monitorToggleBtn 的文字，因此用
            // MutationObserver 跟隨即可，不需修改 start/stop 函式本身。
            function syncHeroPlayBtn() {
                if (!heroBtn) return;
                heroBtn.classList.toggle('playing', isRecording);
                heroBtn.disabled = mainBtn ? mainBtn.disabled : false;
                const content = (typeof getLanguageContent === 'function') ? getLanguageContent() : {};
                const hero = content.hero || {};
                const label = isRecording ? hero.stop : hero.play;
                if (!label) return; // i18n 尚未載入：保留預烤（prerender）的內容
                heroBtn.innerHTML = '';
                const icon = document.createElement('span');
                icon.className = 'hero-play-icon';
                icon.setAttribute('aria-hidden', 'true');
                icon.textContent = isRecording ? '⏸' : '▶';
                const text = document.createElement('span');
                text.className = 'hero-play-label';
                text.textContent = label;
                heroBtn.appendChild(icon);
                heroBtn.appendChild(text);
                heroBtn.setAttribute('aria-label', label);
            }

            if (heroBtn && mainBtn) {
                heroBtn.disabled = mainBtn.disabled; // 瀏覽器不支援時一併停用
                new MutationObserver(syncHeroPlayBtn).observe(mainBtn, {
                    childList: true,
                    characterData: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['disabled']
                });
            }

            // Hero 模式 chip：點擊即勾選對應的既有 binauralPreset radio
            //（沿用既有的模式選擇機制），chip 與 radio 雙向同步。
            function setActiveChip(idx) {
                if (!heroModes) return;
                heroModes.querySelectorAll('.hero-mode-chip').forEach((c, i) => {
                    c.classList.toggle('active', i === idx);
                });
            }

            if (heroModes) {
                heroModes.addEventListener('click', (e) => {
                    const chip = e.target.closest('.hero-mode-chip');
                    if (!chip) return;
                    const idx = parseInt(chip.dataset.modeIdx, 10);
                    const radios = document.querySelectorAll('input[name="binauralPreset"]');
                    if (radios[idx]) {
                        radios[idx].checked = true;
                        radios[idx].dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    setActiveChip(idx);
                    trackEvent('hero_mode_select', {
                        mode: radios[idx] ? radios[idx].value : String(idx)
                    });
                });
            }

            const binauralList = document.getElementById('binauralOptionsList');
            if (binauralList) {
                binauralList.addEventListener('change', (e) => {
                    if (!e.target || e.target.name !== 'binauralPreset') return;
                    const radios = Array.from(document.querySelectorAll('input[name="binauralPreset"]'));
                    setActiveChip(radios.indexOf(e.target));
                });
            }
        });
