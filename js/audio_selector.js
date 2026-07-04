// 音樂清單搜尋、載入與播放

let MUSIC_LIBRARY = {};
let selectedMusicItem = null;
let allMusicItems = [];
let extractor = null;
let isMusicLoading = false;
let preloadedAudioBuffer = null;
let currentLoadingAbortController = null;

let embeddingModelPromise = null;
let embeddingModelFailed = false;

// 語意模型改為「背景載入、可有可無」。先前 searchMusic 會 await 這個
// ~25MB 的模型下載，CDN 被擋或很慢時整條搜尋鏈直接 reject——用戶輸入
// 任何關鍵字都得不到結果。現在：不 await、失敗只降級為關鍵字搜尋。
function ensureEmbeddingModel() {
    if (extractor || embeddingModelFailed || embeddingModelPromise) return;
    embeddingModelPromise = (async () => {
        const { pipeline, env } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.14.0/dist/transformers.min.js');
        env.allowLocalModels = false; // 不探測本站 /models/（避免一串 404 console error）
        extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    })().catch(e => {
        embeddingModelFailed = true;
        console.warn('語意搜尋模型載入失敗，改用關鍵字搜尋:', e);
    });
}

// 舊名保留（相容既有呼叫點/舊快取），語意同 ensureEmbeddingModel。
async function loadEmbeddingModel() {
    ensureEmbeddingModel();
    if (embeddingModelPromise) await embeddingModelPromise;
}

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

function initMusicLibrary() {
    allMusicItems = [];
    if (Array.isArray(MUSIC_LIBRARY)) {
        MUSIC_LIBRARY.forEach(item => {
            allMusicItems.push({
                name: item.title,
                name_en: item.title,
                url: item.file,
                keywords: item.tag || [],
                description: item.desc || '',
                embedding: item.embedding || [],
                category: ''
            });
        });
    } else {
        Object.keys(MUSIC_LIBRARY).forEach(category => {
            MUSIC_LIBRARY[category].forEach(item => {
                allMusicItems.push({
                    ...item,
                    category: category,
                    embedding: item.embedding || []
                });
            });
        });
    }
}

function fuzzySearch(query, text) {
    if (!query || !text) return 0;
    query = query.toLowerCase();
    text = text.toLowerCase();
    if (text.includes(query)) return 100;
    const editDistance = calculateEditDistance(query, text);
    const maxLen = Math.max(query.length, text.length);
    const similarity = ((maxLen - editDistance) / maxLen) * 100;
    return similarity;
}

function calculateEditDistance(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
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

function cosineSimilarity(vecA, vecB) {
    let dot = 0,
        normA = 0,
        normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dot += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

async function searchMusic(query) {
    if (!query.trim()) return [];
    // 關鍵字比對（tag/title/desc，中英雙語）為主要門檻；語意向量只作
    // 排序加分。理由：(1) 模型可能載不進來（見 ensureEmbeddingModel）；
    // (2) 舊寫法 result[0][0] 取的是第一個 token 的原始向量而非
    // mean-pooled 句向量，與 CI 端 sentence-transformers 產的庫內向量
    // 對不上（實測同字查詢 cosine≈0.40、無關曲目≈0.37，幾乎無鑑別度），
    // 不能單獨作為過濾門檻。庫內 embedding 與模型皆不動。
    ensureEmbeddingModel();
    let queryEmbedding = null;
    if (extractor) {
        try {
            const result = await extractor(query, { pooling: 'mean', normalize: true });
            queryEmbedding = Array.from(result.data);
        } catch (e) {
            console.warn('查詢向量計算失敗，僅用關鍵字比對:', e);
        }
    }
    const results = [];
    allMusicItems.forEach(item => {
        let fuzzyScore = 0;
        const nameScore = Math.max(
            fuzzySearch(query, item.name),
            fuzzySearch(query, item.name_en)
        );
        fuzzyScore = Math.max(fuzzyScore, nameScore);
        item.keywords.forEach(keyword => {
            const keywordScore = fuzzySearch(query, keyword);
            fuzzyScore = Math.max(fuzzyScore, keywordScore);
        });
        const descScore = fuzzySearch(query, item.description);
        fuzzyScore = Math.max(fuzzyScore, descScore * 0.7);
        const categoryScore = fuzzySearch(query, item.category);
        fuzzyScore = Math.max(fuzzyScore, categoryScore * 0.5);

        const semanticScore = queryEmbedding
            ? cosineSimilarity(queryEmbedding, item.embedding) * 100
            : 0;

        if (fuzzyScore > 30) {
            results.push({
                ...item,
                score: fuzzyScore + semanticScore * 0.3
            });
        }
    });
    return results.sort((a, b) => b.score - a.score);
}

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
    container.querySelectorAll('.music-item').forEach((element, index) => {
        element.addEventListener('click', async () => {
            const item = results[index];
            await selectMusic(item.url, item.name, item.category);
        });
    });
}

async function selectMusic(url, name, category) {
    selectedMusicItem = { url, name, category };
    CONFIG.MUSIC_CONTENT.TYPE = 'custom';
    CONFIG.MUSIC_CONTENT.CUSTOM_URL = url;
    showCurrentSelection(name);

    // Reset preloaded buffer
    preloadedAudioBuffer = null;

    // Start preloading the music with progress tracking
    await preloadMusicWithProgress(url);

    const query = document.getElementById('musicSearchInput').value;
    if (query.trim()) {
        const results = await searchMusic(query);
        renderSearchResults(results);
    }
    if (isRecording) {
        switchBackgroundMusic(url);
    }
    if (CONFIG.GOOGLE_ANALYTICS.TRACK_EVENTS.START_MONITORING) {
        trackEvent('music_selected', {
            music_name: name,
            music_category: category,
            language: currentLanguage
        });
    }
}

async function preloadMusicWithProgress(url) {
    // Skip preloading for local files (blob URLs)
    if (url.startsWith('blob:')) {
        return;
    }

    // Cancel any existing loading operation
    if (currentLoadingAbortController) {
        currentLoadingAbortController.abort();
    }
    currentLoadingAbortController = new AbortController();
    const signal = currentLoadingAbortController.signal;

    // Show loading state
    setButtonLoadingState(true);
    showLoadingProgress(true);
    updateLoadingProgress(0);

    try {
        const response = await fetch(url, { signal });
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`);
        }

        const contentLength = response.headers.get('content-length');
        const total = contentLength ? parseInt(contentLength, 10) : 0;

        if (!response.body) {
            // Fallback for browsers without ReadableStream support
            const arrayBuffer = await response.arrayBuffer();
            updateLoadingProgress(100);

            // Initialize audio context if needed
            if (typeof audioContext === 'undefined' || !audioContext) {
                window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            // Decode the audio
            preloadedAudioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        } else {
            // Use ReadableStream for progress tracking
            const reader = response.body.getReader();
            const chunks = [];
            let received = 0;

            while (true) {
                // Check for abort
                if (signal.aborted) {
                    reader.cancel();
                    throw new Error('Loading aborted');
                }

                const { done, value } = await reader.read();
                if (done) break;

                chunks.push(value);
                received += value.length;

                if (total > 0) {
                    const percent = (received / total) * 100;
                    updateLoadingProgress(percent);
                } else {
                    // Unknown total size, show indeterminate progress
                    updateLoadingProgress(Math.min(received / 1000000 * 100, 95));
                }
            }

            // Combine chunks into ArrayBuffer
            const arrayBuffer = new Uint8Array(received);
            let position = 0;
            for (const chunk of chunks) {
                arrayBuffer.set(chunk, position);
                position += chunk.length;
            }

            updateLoadingProgress(100);

            // Initialize audio context if needed
            if (typeof audioContext === 'undefined' || !audioContext) {
                window.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            }

            // Decode the audio
            preloadedAudioBuffer = await audioContext.decodeAudioData(arrayBuffer.buffer);
        }

        currentLoadingAbortController = null;
    } catch (error) {
        if (error.name === 'AbortError' || error.message === 'Loading aborted') {
            // Loading was cancelled, don't update UI
            return;
        }
        console.warn('Music preload failed:', error);
        preloadedAudioBuffer = null;
        currentLoadingAbortController = null;
    } finally {
        // Hide loading state after a short delay for visual feedback
        // But only if this is still the current loading operation
        if (!currentLoadingAbortController) {
            setTimeout(() => {
                showLoadingProgress(false);
                setButtonLoadingState(false);
            }, 300);
        }
    }
}

function showCurrentSelection(name) {
    const content = getLanguageContent();
    const container = document.getElementById('currentSelection');
    const label = document.getElementById('currentSelectionLabel');
    const nameElement = document.getElementById('currentSelectionName');
    label.textContent = content.labels.currentMusic;
    nameElement.textContent = name;
    container.style.display = 'block';

    // Ensure progress bar container exists
    ensureProgressBarExists();
}

function ensureProgressBarExists() {
    const container = document.getElementById('currentSelection');
    if (!container) return;

    let progressContainer = document.getElementById('musicLoadingContainer');
    if (!progressContainer) {
        progressContainer = document.createElement('div');
        progressContainer.id = 'musicLoadingContainer';
        progressContainer.className = 'music-loading-container';
        progressContainer.innerHTML = `
            <div class="music-loading-label" id="musicLoadingLabel"></div>
            <div class="music-progress-bar">
                <div class="music-progress-fill" id="musicProgressFill"></div>
            </div>
            <div class="music-progress-text" id="musicProgressText">0%</div>
        `;
        container.appendChild(progressContainer);
    }
}

function showLoadingProgress(show) {
    const progressContainer = document.getElementById('musicLoadingContainer');
    if (progressContainer) {
        if (show) {
            progressContainer.classList.add('visible');
            const content = getLanguageContent();
            const label = document.getElementById('musicLoadingLabel');
            if (label) {
                label.textContent = content.labels.loadingMusic || 'Loading music...';
            }
        } else {
            progressContainer.classList.remove('visible');
        }
    }
}

function updateLoadingProgress(percent) {
    const fill = document.getElementById('musicProgressFill');
    const text = document.getElementById('musicProgressText');
    if (fill) {
        fill.style.width = `${percent}%`;
    }
    if (text) {
        text.textContent = `${Math.round(percent)}%`;
    }
}

function setButtonLoadingState(loading) {
    const toggleBtn = document.getElementById('monitorToggleBtn');
    if (!toggleBtn) return;

    const content = getLanguageContent();
    isMusicLoading = loading;

    if (loading) {
        toggleBtn.classList.add('loading');
        toggleBtn.textContent = content.buttons.loading || 'Loading...';
        toggleBtn.disabled = true;
    } else {
        toggleBtn.classList.remove('loading');
        toggleBtn.disabled = false;
        // Restore button text based on recording state
        if (typeof isRecording !== 'undefined' && isRecording) {
            toggleBtn.textContent = content.buttons.stop;
        } else {
            toggleBtn.textContent = content.buttons.start;
        }
    }
}

function switchBackgroundMusic(url) {
    if (crossfadeTimeout) {
        clearTimeout(crossfadeTimeout);
        crossfadeTimeout = null;
    }
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
    setTimeout(() => {
        if (url && isRecording) {
            loadBackgroundAudio(url);
        }
    }, 1000);
}

function getBackgroundAudioUrl() {
    if (CONFIG.MUSIC_CONTENT.TYPE === 'none') {
        return '';
    }
    if (CONFIG.MUSIC_CONTENT.TYPE === 'custom') {
        return CONFIG.MUSIC_CONTENT.CUSTOM_URL;
    }
    let musicList = MUSIC_LIBRARY[CONFIG.MUSIC_CONTENT.TYPE];
    if (Array.isArray(MUSIC_LIBRARY)) {
        musicList = allMusicItems;
    }
    if (musicList && musicList.length > 0) {
        const randomIndex = Math.floor(Math.random() * musicList.length);
        return musicList[randomIndex].url;
    }
    return '';
}

// 2026-07-04 修正：舊版在此每幀把拍頻 gain 設成 BINAURAL_VOLUME × 音樂瞬時 RMS，
// 一般音樂 RMS 僅 0.05~0.3、安靜段趨近 0 → 音樂一開始播，拍頻就被壓到
// 0.3×RMS（實測 0.085，安靜段 0.0006）幾乎聽不見（用戶回報「拍頻停止」）。
// hero Play 自動帶背景音樂（6577d05）後所有一鍵播放用戶都踩到。
// 正確行為：拍頻音量固定為 CONFIG.BINAURAL_VOLUME(0.3)，與音樂(0.7)並行，
// 因此改為在音樂啟動時重新鎖定拍頻 gain，不再隨音樂 RMS 調變。
function startBackgroundVolumeMonitor() {
    if (!binauralOscillators.length) return;
    const leftGain = binauralOscillators[2];
    const rightGain = binauralOscillators[3];
    leftGain.gain.setTargetAtTime(CONFIG.BINAURAL_VOLUME, audioContext.currentTime, 0.01);
    rightGain.gain.setTargetAtTime(CONFIG.BINAURAL_VOLUME, audioContext.currentTime, 0.01);
}

function stopBackgroundVolumeMonitor() {
    if (bgVolumeMonitorId) cancelAnimationFrame(bgVolumeMonitorId);
    bgVolumeMonitorId = null;
}

function startBackgroundLoop() {
    if (!backgroundAudioBuffer) return;
    const overlap = CONFIG.MUSIC_CONTENT.OVERLAP_DURATION;
    const fadeInDuration = CONFIG.MUSIC_CONTENT.FADE_IN_DURATION;

    const newSource = audioContext.createBufferSource();
    const newGain = audioContext.createGain();
    if (!bgAnalyser) {
        bgAnalyser = audioContext.createAnalyser();
        bgAnalyser.fftSize = 2048;
    }

    newSource.buffer = backgroundAudioBuffer;
    newSource.loop = false;
    newGain.gain.setValueAtTime(0, audioContext.currentTime);
    newGain.gain.exponentialRampToValueAtTime(
        CONFIG.BACKGROUND_VOLUME,
        audioContext.currentTime + fadeInDuration
    );
    newSource.connect(bgAnalyser);
    bgAnalyser.connect(newGain).connect(audioContext.destination);
    newSource.start();

    if (backgroundAudioSource && backgroundGainNode) {
        backgroundGainNode.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime + overlap
        );
        const oldSource = backgroundAudioSource;
        setTimeout(() => {
            try { oldSource.stop(); } catch (e) {}
        }, overlap * 1000);
    }

    backgroundAudioSource = newSource;
    backgroundGainNode = newGain;

    startBackgroundVolumeMonitor();

    if (crossfadeTimeout) {
        clearTimeout(crossfadeTimeout);
    }
    const nextStart = backgroundAudioBuffer.duration - overlap;
    if (nextStart > 0) {
        crossfadeTimeout = setTimeout(() => {
            if (isRecording) startBackgroundLoop();
        }, nextStart * 1000);
    }
}

function loadBackgroundAudio(url) {
    // Use preloaded buffer if available and matches the URL
    if (preloadedAudioBuffer && CONFIG.MUSIC_CONTENT.CUSTOM_URL === url) {
        backgroundAudioBuffer = preloadedAudioBuffer;
        startBackgroundLoop();
        return;
    }

    // Fallback to fetch if no preloaded buffer
    fetch(url).then(response => {
        if (!response.ok) {
            throw new Error(`無法載入背景音檔：${response.statusText} (${url})`);
        }
        return response.arrayBuffer();
    }).then(arrayBuffer => {
        return audioContext.decodeAudioData(arrayBuffer);
    }).then(audioBuffer => {
        backgroundAudioBuffer = audioBuffer;
        startBackgroundLoop();
    }).catch(error => {
        console.warn(`背景音檔載入失敗 (${url}):`, error);
    });
}

function initTabSwitching() {
    const tabLibrary = document.getElementById('tabLibrary');
    const tabLocal = document.getElementById('tabLocal');
    const libraryTab = document.getElementById('libraryTabContent');
    const localTab = document.getElementById('localTabContent');
    if (!tabLibrary || !tabLocal) return;
    tabLibrary.addEventListener('click', () => {
        tabLibrary.classList.add('active');
        tabLocal.classList.remove('active');
        libraryTab.style.display = 'block';
        localTab.style.display = 'none';
    });
    tabLocal.addEventListener('click', () => {
        tabLocal.classList.add('active');
        tabLibrary.classList.remove('active');
        libraryTab.style.display = 'none';
        localTab.style.display = 'block';
    });
}

function initLocalFileSelector() {
    const input = document.getElementById('localFileInput');
    if (!input) return;
    input.addEventListener('change', () => {
        const file = input.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            selectMusic(url, file.name, 'local');
        }
    });
}

function initAudioSelector() {
    const searchInput = document.getElementById('musicSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', async (e) => {
            const query = e.target.value;
            if (query.trim()) {
                const results = await searchMusic(query);
                renderSearchResults(results);
                if (typeof trackEvent === 'function') {
                    trackEvent('search', { term: query.trim() });
                }
            } else {
                document.getElementById('searchResults').style.display = 'none';
            }
        });
    }
    initTabSwitching();
    initLocalFileSelector();
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadMusicLibrary();
    initMusicLibrary();
    // Defer embedding model loading until user actually searches
    // loadEmbeddingModel() will be called lazily in searchMusic()
    initAudioSelector();
});

