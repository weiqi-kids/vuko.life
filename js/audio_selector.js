// 音樂清單搜尋、載入與播放

let MUSIC_LIBRARY = {};
let selectedMusicItem = null;
let allMusicItems = [];
let extractor = null;

async function loadEmbeddingModel() {
    if (!extractor) {
        const { pipeline } = await import('https://cdn.jsdelivr.net/npm/@xenova/transformers@2.14.0/dist/transformers.min.js');
        extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
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
    await loadEmbeddingModel();
    const result = await extractor(query);
    const queryEmbedding = result[0][0];
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

        const semanticScore = cosineSimilarity(queryEmbedding, item.embedding) * 100;
        const finalScore = fuzzyScore * 0.4 + semanticScore * 0.6;

        if (finalScore > 30) {
            results.push({
                ...item,
                score: finalScore
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

function showCurrentSelection(name) {
    const content = getLanguageContent();
    const container = document.getElementById('currentSelection');
    const label = document.getElementById('currentSelectionLabel');
    const nameElement = document.getElementById('currentSelectionName');
    label.textContent = content.labels.currentMusic;
    nameElement.textContent = name;
    container.style.display = 'block';
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
    loadEmbeddingModel().catch(console.error);
    initAudioSelector();
});

