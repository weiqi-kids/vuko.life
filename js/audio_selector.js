// 音樂清單搜尋、載入與播放

let MUSIC_LIBRARY = {};
let selectedMusicItem = null;
let allMusicItems = [];

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
    Object.keys(MUSIC_LIBRARY).forEach(category => {
        MUSIC_LIBRARY[category].forEach(item => {
            allMusicItems.push({
                ...item,
                category: category
            });
        });
    });
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

function searchMusic(query) {
    if (!query.trim()) return [];
    const results = [];
    allMusicItems.forEach(item => {
        let maxScore = 0;
        const nameScore = Math.max(
            fuzzySearch(query, item.name),
            fuzzySearch(query, item.name_en)
        );
        maxScore = Math.max(maxScore, nameScore);
        item.keywords.forEach(keyword => {
            const keywordScore = fuzzySearch(query, keyword);
            maxScore = Math.max(maxScore, keywordScore);
        });
        const descScore = fuzzySearch(query, item.description);
        maxScore = Math.max(maxScore, descScore * 0.7);
        const categoryScore = fuzzySearch(query, item.category);
        maxScore = Math.max(maxScore, categoryScore * 0.5);
        if (maxScore > 30) {
            results.push({
                ...item,
                score: maxScore
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
        element.addEventListener('click', () => {
            const item = results[index];
            selectMusic(item.url, item.name, item.category);
        });
    });
}

function selectMusic(url, name, category) {
    selectedMusicItem = { url, name, category };
    CONFIG.MUSIC_CONTENT.TYPE = 'custom';
    CONFIG.MUSIC_CONTENT.CUSTOM_URL = url;
    showCurrentSelection(name);
    const query = document.getElementById('musicSearchInput').value;
    if (query.trim()) {
        const results = searchMusic(query);
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
    const musicList = MUSIC_LIBRARY[CONFIG.MUSIC_CONTENT.TYPE];
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

function initAudioSelector() {
    const searchInput = document.getElementById('musicSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            if (query.trim()) {
                const results = searchMusic(query);
                renderSearchResults(results);
                if (typeof trackEvent === 'function') {
                    trackEvent('search', { term: query.trim() });
                }
            } else {
                document.getElementById('searchResults').style.display = 'none';
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadMusicLibrary();
    initMusicLibrary();
    initAudioSelector();
});

