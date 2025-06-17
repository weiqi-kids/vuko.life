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

        const LANGUAGE_CONTENT = {
            'zh-TW': {
                title: '🧘 3 分鐘 vuko time，轉動生命每一天',
                subtitle: '🤖 使用說明',
                description: '系統會即時監測你的呼吸狀態，並自動調整拍頻來引導你進入不同的意識狀態：',
                instructions: {
                    headphones: '請使用<strong>雙聲道耳機</strong>，這樣才能達成腦中拍頻的效果。',
                    microphone: '若您同意使用您的<strong>麥克風</strong>，我們會嘗試監測狀態，引導你進入不同的狀態。'
                },
                volumeRatioDetail: '拍頻 {binaural}% / 背景音 {background}%',
                labels: {
                    breathRate: '呼吸速率：',
                    currentState: '當前狀態：',
                    beatFreq: '拍頻頻率：',
                    brainwave: '腦波類型：',
                    baseFreq: '基頻頻率：',
                    audioFile: '背景音檔：',
                    headphones: '耳機：',
                    microphone: '麥克風：',
                    volumeRatio: '音量比例：',
                    breathVisual: '呼吸視覺化',
                    realTimeData: '即時數據',
                    systemConfig: '🔧 系統配置',
                    audioSearch: '🎵 背景音樂搜尋',
                    searchPlaceholder: '搜尋音樂... (例如: 森林、海浪、冥想)',
                    noResults: '找不到相關音樂',
                    currentMusic: '目前選擇',
                    deviceTest: '設備測試'
                },
                buttons: {
                    start: '🎶 開始',
                    stop: '🍂停止'
                },
                status: {
                    monitoring: '🎙️ 呼吸監測中... 請保持自然呼吸',
                    stopped: '監測已停止',
                    error: '❌ 無法啟動：',
                    unsupported: '⚠️ 您的瀏覽器不支援麥克風功能，無法使用呼吸監測',
                    waiting: '待檢測'
                },
                units: {
                    perMin: '次/分',
                    hz: 'Hz',
                    none: '無'
                },
                waves: {
                    delta: 'Delta波',
                    theta: 'Theta波', 
                    alpha: 'Alpha波',
                    beta: 'Beta波'
                }
            }
        };

