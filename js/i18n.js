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
                title: '🧘 智能呼吸拍頻處理器',
                subtitle: '🤖 智能呼吸監測',
                description: '系統會即時監測你的呼吸狀態，並自動調整拍頻來引導你進入不同的意識狀態：',
                states: {
                    deep_relaxed: '深度放鬆',
                    relaxed: '放鬆狀態', 
                    normal: '正常狀態',
                    tense: '緊張狀態'
                },
                stateDescriptions: {
                    deep_relaxed: '(&lt;10次/分)：Delta波 4Hz - 深度冥想與修復',
                    relaxed: '(10-15次/分)：Theta波 6Hz - 創意與直覺',
                    normal: '(15-20次/分)：Alpha波 10Hz - 專注與平靜',
                    tense: '(&gt;20次/分)：Beta波 14Hz - 提升專注力'
                },
                labels: {
                    breathRate: '呼吸速率：',
                    currentState: '當前狀態：',
                    beatFreq: '拍頻頻率：',
                    brainwave: '腦波類型：',
                    baseFreq: '基頻頻率：',
                    audioFile: '背景音檔：',
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
                    start: '🎙️ 開始呼吸監測',
                    stop: '⏹️ 停止監測'
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
            },
            'zh-CN': {
                title: '🧘 智能呼吸拍频处理器',
                subtitle: '🤖 智能呼吸监测',
                description: '系统会实时监测你的呼吸状态，并自动调整拍频来引导你进入不同的意识状态：',
                states: {
                    deep_relaxed: '深度放松',
                    relaxed: '放松状态',
                    normal: '正常状态', 
                    tense: '紧张状态'
                },
                stateDescriptions: {
                    deep_relaxed: '(&lt;10次/分)：Delta波 4Hz - 深度冥想与修复',
                    relaxed: '(10-15次/分)：Theta波 6Hz - 创意与直觉',
                    normal: '(15-20次/分)：Alpha波 10Hz - 专注与平静',
                    tense: '(&gt;20次/分)：Beta波 14Hz - 提升专注力'
                },
                labels: {
                    breathRate: '呼吸速率：',
                    currentState: '当前状态：',
                    beatFreq: '拍频频率：',
                    brainwave: '脑波类型：',
                    baseFreq: '基频频率：',
                    audioFile: '背景音档：',
                    volumeRatio: '音量比例：',
                    breathVisual: '呼吸可视化',
                    realTimeData: '实时数据',
                    systemConfig: '🔧 系统配置',
                    audioSearch: '🎵 背景音乐搜寻',
                    searchPlaceholder: '搜寻音乐... (例如: 森林、海浪、冥想)',
                    noResults: '找不到相关音乐',
                    currentMusic: '目前选择',
                    deviceTest: '设备测试'
                },
                buttons: {
                    start: '🎙️ 开始呼吸监测',
                    stop: '⏹️ 停止监测'
                },
                status: {
                    monitoring: '🎙️ 呼吸监测中... 请保持自然呼吸',
                    stopped: '监测已停止',
                    error: '❌ 无法启动：',
                    unsupported: '⚠️ 您的浏览器不支持麦克风功能，无法使用呼吸监测',
                    waiting: '待检测'
                },
                units: {
                    perMin: '次/分',
                    hz: 'Hz',
                    none: '无'
                },
                waves: {
                    delta: 'Delta波',
                    theta: 'Theta波',
                    alpha: 'Alpha波', 
                    beta: 'Beta波'
                }
            },
            'en': {
                title: '🧘 Smart Breathing Binaural Processor',
                subtitle: '🤖 Smart Breathing Monitor',
                description: 'The system monitors your breathing patterns in real-time and automatically adjusts binaural beats to guide you into different states of consciousness:',
                states: {
                    deep_relaxed: 'Deep Relaxed',
                    relaxed: 'Relaxed',
                    normal: 'Normal',
                    tense: 'Tense'
                },
                stateDescriptions: {
                    deep_relaxed: '(&lt;10/min): Delta 4Hz - Deep meditation & restoration',
                    relaxed: '(10-15/min): Theta 6Hz - Creativity & intuition',
                    normal: '(15-20/min): Alpha 10Hz - Focus & calm',
                    tense: '(&gt;20/min): Beta 14Hz - Enhanced concentration'
                },
                labels: {
                    breathRate: 'Breath Rate:',
                    currentState: 'Current State:',
                    beatFreq: 'Beat Frequency:',
                    brainwave: 'Brainwave:',
                    baseFreq: 'Base Frequency:',
                    audioFile: 'Background Audio:',
                    volumeRatio: 'Volume Ratio:',
                    breathVisual: 'Breath Visualization',
                    realTimeData: 'Real-time Data',
                    systemConfig: '🔧 System Configuration',
                    audioSearch: '🎵 Background Music Search',
                    searchPlaceholder: 'Search music... (e.g: forest, ocean, meditation)',
                    noResults: 'No matching music found',
                    currentMusic: 'Currently Selected',
                    deviceTest: 'Device Test'
                },
                buttons: {
                    start: '🎙️ Start Monitoring',
                    stop: '⏹️ Stop Monitoring'
                },
                status: {
                    monitoring: '🎙️ Monitoring breathing... Please breathe naturally',
                    stopped: 'Monitoring stopped',
                    error: '❌ Failed to start:',
                    unsupported: '⚠️ Your browser does not support microphone access',
                    waiting: 'Waiting'
                },
                units: {
                    perMin: '/min',
                    hz: 'Hz',
                    none: 'None'
                },
                waves: {
                    delta: 'Delta',
                    theta: 'Theta',
                    alpha: 'Alpha',
                    beta: 'Beta'
                }
            },
            'ja': {
                title: '🧘 スマート呼吸バイノーラルプロセッサー',
                subtitle: '🤖 スマート呼吸モニタリング',
                description: 'システムがリアルタイムで呼吸パターンを監視し、異なる意識状態に導くためにバイノーラルビートを自動調整します：',
                states: {
                    deep_relaxed: '深いリラックス',
                    relaxed: 'リラックス',
                    normal: '通常',
                    tense: '緊張'
                },
                stateDescriptions: {
                    deep_relaxed: '(&lt;10回/分)：デルタ波 4Hz - 深い瞑想と回復',
                    relaxed: '(10-15回/分)：シータ波 6Hz - 創造性と直感',
                    normal: '(15-20回/分)：アルファ波 10Hz - 集中と平静',
                    tense: '(&gt;20回/分)：ベータ波 14Hz - 集中力向上'
                },
                labels: {
                    breathRate: '呼吸数：',
                    currentState: '現在の状態：',
                    beatFreq: 'ビート周波数：',
                    brainwave: '脳波：',
                    baseFreq: '基本周波数：',
                    audioFile: 'バックグラウンド音声：',
                    volumeRatio: '音量比：',
                    breathVisual: '呼吸可視化',
                    realTimeData: 'リアルタイムデータ',
                    systemConfig: '🔧 システム設定',
                    audioSearch: '🎵 背景音楽検索',
                    searchPlaceholder: '音楽を検索... (例: 森、海、瞑想)',
                    noResults: '該当する音楽が見つかりません',
                    currentMusic: '現在選択中',
                    deviceTest: 'デバイステスト'
                },
                buttons: {
                    start: '🎙️ モニタリング開始',
                    stop: '⏹️ モニタリング停止'
                },
                status: {
                    monitoring: '🎙️ 呼吸をモニタリング中... 自然に呼吸してください',
                    stopped: 'モニタリングが停止しました',
                    error: '❌ 開始に失敗しました：',
                    unsupported: '⚠️ お使いのブラウザはマイクアクセスをサポートしていません',
                    waiting: '待機中'
                },
                units: {
                    perMin: '回/分',
                    hz: 'Hz',
                    none: 'なし'
                },
                waves: {
                    delta: 'デルタ波',
                    theta: 'シータ波',
                    alpha: 'アルファ波',
                    beta: 'ベータ波'
                }
            },
            'ko': {
                title: '🧘 스마트 호흡 바이노럴 프로세서',
                subtitle: '🤖 스마트 호흡 모니터링',
                description: '시스템이 실시간으로 호흡 패턴을 모니터링하고 다양한 의식 상태로 안내하기 위해 바이노럴 비트를 자동 조정합니다:',
                states: {
                    deep_relaxed: '깊은 이완',
                    relaxed: '이완',
                    normal: '정상',
                    tense: '긴장'
                },
                stateDescriptions: {
                    deep_relaxed: '(&lt;10회/분): 델타파 4Hz - 깊은 명상과 회복',
                    relaxed: '(10-15회/분): 세타파 6Hz - 창의성과 직감',
                    normal: '(15-20회/분): 알파파 10Hz - 집중과 평온',
                    tense: '(&gt;20회/분): 베타파 14Hz - 집중력 향상'
                },
                labels: {
                    breathRate: '호흡 속도:',
                    currentState: '현재 상태:',
                    beatFreq: '비트 주파수:',
                    brainwave: '뇌파:',
                    baseFreq: '기본 주파수:',
                    audioFile: '배경 오디오:',
                    volumeRatio: '볼륨 비율:',
                    breathVisual: '호흡 시각화',
                    realTimeData: '실시간 데이터',
                    systemConfig: '🔧 시스템 구성',
                    audioSearch: '🎵 배경음악 검색',
                    searchPlaceholder: '음악 검색... (예: 숲, 바다, 명상)',
                    noResults: '일치하는 음악을 찾을 수 없음',
                    currentMusic: '현재 선택됨',
                    deviceTest: '장치 테스트'
                },
                buttons: {
                    start: '🎙️ 모니터링 시작',
                    stop: '⏹️ 모니터링 중지'
                },
                status: {
                    monitoring: '🎙️ 호흡 모니터링 중... 자연스럽게 호흡하세요',
                    stopped: '모니터링이 중지되었습니다',
                    error: '❌ 시작에 실패했습니다:',
                    unsupported: '⚠️ 브라우저가 마이크 액세스를 지원하지 않습니다',
                    waiting: '대기 중'
                },
                units: {
                    perMin: '회/분',
                    hz: 'Hz',
                    none: '없음'
                },
                waves: {
                    delta: '델타파',
                    theta: '세타파',
                    alpha: '알파파',
                    beta: '베타파'
                }
            },
            'es': {
                title: '🧘 Procesador Binaural de Respiración Inteligente',
                subtitle: '🤖 Monitor de Respiración Inteligente',
                description: 'El sistema monitorea tu respiración en tiempo real y ajusta automáticamente los latidos binaurales para guiarte a diferentes estados de conciencia:',
                states: {
                    deep_relaxed: 'Relajación profunda',
                    relaxed: 'Relajado',
                    normal: 'Normal',
                    tense: 'Tenso'
                },
                stateDescriptions: {
                    deep_relaxed: '(<10/min): Delta 4Hz - Meditación profunda y restauración',
                    relaxed: '(10-15/min): Theta 6Hz - Creatividad e intuición',
                    normal: '(15-20/min): Alpha 10Hz - Enfoque y calma',
                    tense: '(>20/min): Beta 14Hz - Mayor concentración'
                },
                labels: {
                    breathRate: 'Frecuencia respiratoria:',
                    currentState: 'Estado actual:',
                    beatFreq: 'Frecuencia de pulsos:',
                    brainwave: 'Tipo de onda:',
                    baseFreq: 'Frecuencia base:',
                    audioFile: 'Archivo de fondo:',
                    volumeRatio: 'Proporción de volumen:',
                    breathVisual: 'Visualización de la respiración',
                    realTimeData: 'Datos en tiempo real',
                    systemConfig: '🔧 Configuración del sistema',
                    audioSearch: '🎵 Búsqueda de música de fondo',
                    searchPlaceholder: 'Buscar música... (p.ej., bosque, océano, meditación)',
                    noResults: 'No se encontró música coincidente',
                    currentMusic: 'Selección actual',
                    deviceTest: 'Prueba de dispositivo'
                },
                buttons: {
                    start: '🎙️ Iniciar monitoreo',
                    stop: '⏹️ Detener monitoreo'
                },
                status: {
                    monitoring: '🎙️ Monitoreando respiración... Respira naturalmente',
                    stopped: 'Monitoreo detenido',
                    error: '❌ Error al iniciar:',
                    unsupported: '⚠️ Tu navegador no soporta acceso al micrófono',
                    waiting: 'Esperando'
                },
                units: {
                    perMin: '/min',
                    hz: 'Hz',
                    none: 'Ninguno'
                },
                waves: {
                    delta: 'Delta',
                    theta: 'Theta',
                    alpha: 'Alpha',
                    beta: 'Beta'
                }
            },
            'pt': {
                title: '🧘 Processador Binaural de Respiração Inteligente',
                subtitle: '🤖 Monitor de Respiração Inteligente',
                description: 'O sistema monitora sua respiração em tempo real e ajusta automaticamente os batimentos binaurais para guiá-lo a diferentes estados de consciência:',
                states: {
                    deep_relaxed: 'Relaxamento profundo',
                    relaxed: 'Relaxado',
                    normal: 'Normal',
                    tense: 'Tenso'
                },
                stateDescriptions: {
                    deep_relaxed: '(<10/min): Delta 4Hz - Meditação profunda e restauração',
                    relaxed: '(10-15/min): Theta 6Hz - Criatividade e intuição',
                    normal: '(15-20/min): Alpha 10Hz - Foco e calma',
                    tense: '(>20/min): Beta 14Hz - Concentração aprimorada'
                },
                labels: {
                    breathRate: 'Taxa de respiração:',
                    currentState: 'Estado atual:',
                    beatFreq: 'Frequência de batida:',
                    brainwave: 'Tipo de onda:',
                    baseFreq: 'Frequência base:',
                    audioFile: 'Arquivo de fundo:',
                    volumeRatio: 'Proporção de volume:',
                    breathVisual: 'Visualização de respiração',
                    realTimeData: 'Dados em tempo real',
                    systemConfig: '🔧 Configurações do sistema',
                    audioSearch: '🎵 Busca de música de fundo',
                    searchPlaceholder: 'Buscar música... (ex.: floresta, oceano, meditação)',
                    noResults: 'Nenhuma música encontrada',
                    currentMusic: 'Selecionado atualmente',
                    deviceTest: 'Teste do dispositivo'
                },
                buttons: {
                    start: '🎙️ Iniciar monitoramento',
                    stop: '⏹️ Parar monitoramento'
                },
                status: {
                    monitoring: '🎙️ Monitorando respiração... Respire naturalmente',
                    stopped: 'Monitoramento parado',
                    error: '❌ Falha ao iniciar:',
                    unsupported: '⚠️ Seu navegador não suporta acesso ao microfone',
                    waiting: 'Aguardando'
                },
                units: {
                    perMin: '/min',
                    hz: 'Hz',
                    none: 'Nenhum'
                },
                waves: {
                    delta: 'Delta',
                    theta: 'Theta',
                    alpha: 'Alpha',
                    beta: 'Beta'
                }
            }
        };

