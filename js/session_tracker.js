// Session Tracker Module
// Tracks meditation time, streaks, and session statistics

const SESSION_STORAGE_KEY = 'vuko_session_stats';

let sessionStartTime = null;
let sessionTimer = null;
let currentSessionDuration = 0;

// Default stats structure
function getDefaultStats() {
    return {
        totalMinutes: 0,
        totalSessions: 0,
        currentStreak: 0,
        bestStreak: 0,
        lastSessionDate: null,
        todayMinutes: 0,
        todayDate: null
    };
}

// Load stats from localStorage
function loadSessionStats() {
    try {
        const saved = localStorage.getItem(SESSION_STORAGE_KEY);
        if (saved) {
            const stats = JSON.parse(saved);
            // Check if today has changed
            const today = new Date().toDateString();
            if (stats.todayDate !== today) {
                // Reset today's minutes
                stats.todayMinutes = 0;
                stats.todayDate = today;

                // Check streak
                if (stats.lastSessionDate) {
                    const lastDate = new Date(stats.lastSessionDate);
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);

                    if (lastDate.toDateString() !== yesterday.toDateString() &&
                        lastDate.toDateString() !== today) {
                        // Streak broken
                        stats.currentStreak = 0;
                    }
                }
                saveSessionStats(stats);
            }
            return stats;
        }
    } catch (e) {
        console.warn('Failed to load session stats:', e);
    }
    return getDefaultStats();
}

// Save stats to localStorage
function saveSessionStats(stats) {
    try {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(stats));
    } catch (e) {
        console.warn('Failed to save session stats:', e);
    }
}

// Start tracking a session
function startSessionTracking() {
    sessionStartTime = Date.now();
    currentSessionDuration = 0;

    // Update timer every second
    sessionTimer = setInterval(() => {
        currentSessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
        updateSessionDisplay();
    }, 1000);

    updateSessionDisplay();
}

// Stop tracking and save session
function stopSessionTracking() {
    if (sessionTimer) {
        clearInterval(sessionTimer);
        sessionTimer = null;
    }

    if (sessionStartTime) {
        const durationMinutes = Math.floor((Date.now() - sessionStartTime) / 60000);

        if (durationMinutes >= 1) {
            // Only count sessions of at least 1 minute
            const stats = loadSessionStats();
            const today = new Date().toDateString();

            stats.totalMinutes += durationMinutes;
            stats.totalSessions += 1;
            stats.todayMinutes += durationMinutes;
            stats.todayDate = today;

            // Update streak
            if (stats.lastSessionDate !== today) {
                const lastDate = stats.lastSessionDate ? new Date(stats.lastSessionDate) : null;
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);

                if (!lastDate || lastDate.toDateString() === yesterday.toDateString()) {
                    // Continue streak
                    stats.currentStreak += 1;
                } else if (lastDate.toDateString() !== today) {
                    // New streak
                    stats.currentStreak = 1;
                }

                // Update best streak
                if (stats.currentStreak > stats.bestStreak) {
                    stats.bestStreak = stats.currentStreak;
                }
            }

            stats.lastSessionDate = today;
            saveSessionStats(stats);

            // Track event
            if (typeof trackEvent === 'function') {
                trackEvent('session_completed', {
                    duration_minutes: durationMinutes,
                    total_minutes: stats.totalMinutes,
                    current_streak: stats.currentStreak
                });
            }
        }

        sessionStartTime = null;
        currentSessionDuration = 0;
    }

    updateSessionDisplay();
}

// Format time for display
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function formatMinutes(minutes) {
    if (minutes < 60) {
        return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Update the session display in UI
function updateSessionDisplay() {
    const stats = loadSessionStats();
    const content = typeof getLanguageContent === 'function' ? getLanguageContent() : {};
    const tracker = content.tracker || {};

    // Update current session timer
    const timerEl = document.getElementById('sessionTimer');
    if (timerEl) {
        timerEl.textContent = formatTime(currentSessionDuration);
    }

    // Update today's time
    const todayEl = document.getElementById('todayTime');
    if (todayEl) {
        const todayTotal = stats.todayMinutes + Math.floor(currentSessionDuration / 60);
        todayEl.textContent = formatMinutes(todayTotal);
    }

    // Update streak
    const streakEl = document.getElementById('currentStreak');
    if (streakEl) {
        const days = tracker.days || 'days';
        streakEl.textContent = `${stats.currentStreak} ${days}`;
    }

    // Update total time
    const totalEl = document.getElementById('totalTime');
    if (totalEl) {
        totalEl.textContent = formatMinutes(stats.totalMinutes);
    }
}

// Create the session stats UI
function createSessionStatsUI() {
    const content = typeof getLanguageContent === 'function' ? getLanguageContent() : {};
    const tracker = content.tracker || {
        title: 'Your Progress',
        currentSession: 'This Session',
        todayTime: 'Today',
        streak: 'Streak',
        totalTime: 'Total Time',
        days: 'days'
    };

    // Check if stats panel already exists
    if (document.getElementById('sessionStatsPanel')) {
        return;
    }

    const statsPanel = document.createElement('div');
    statsPanel.id = 'sessionStatsPanel';
    statsPanel.className = 'session-stats-panel';
    statsPanel.innerHTML = `
        <h4 class="stats-panel-title">${tracker.title}</h4>
        <div class="stats-grid">
            <div class="stats-item">
                <span class="stats-icon">⏱️</span>
                <span class="stats-value" id="sessionTimer">00:00</span>
                <span class="stats-label">${tracker.currentSession}</span>
            </div>
            <div class="stats-item">
                <span class="stats-icon">📅</span>
                <span class="stats-value" id="todayTime">0m</span>
                <span class="stats-label">${tracker.todayTime}</span>
            </div>
            <div class="stats-item">
                <span class="stats-icon">🔥</span>
                <span class="stats-value" id="currentStreak">0 ${tracker.days}</span>
                <span class="stats-label">${tracker.streak}</span>
            </div>
            <div class="stats-item">
                <span class="stats-icon">🏆</span>
                <span class="stats-value" id="totalTime">0m</span>
                <span class="stats-label">${tracker.totalTime}</span>
            </div>
        </div>
    `;

    // Insert before the control buttons
    const controlButtons = document.querySelector('.control-buttons');
    if (controlButtons) {
        controlButtons.parentNode.insertBefore(statsPanel, controlButtons);
    }

    // Initial display update
    updateSessionDisplay();
}

// Update stats panel content when language changes
function updateSessionStatsContent() {
    const panel = document.getElementById('sessionStatsPanel');
    if (panel) {
        panel.remove();
        createSessionStatsUI();
    }
}

// Initialize session tracker
function initSessionTracker() {
    createSessionStatsUI();
    updateSessionDisplay();
}

// Export for global access
window.initSessionTracker = initSessionTracker;
window.startSessionTracking = startSessionTracking;
window.stopSessionTracking = stopSessionTracking;
window.updateSessionDisplay = updateSessionDisplay;
window.updateSessionStatsContent = updateSessionStatsContent;
window.loadSessionStats = loadSessionStats;
