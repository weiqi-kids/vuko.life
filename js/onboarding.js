// Onboarding Tutorial Module
// Shows a step-by-step guide for first-time users to reduce bounce rate

const ONBOARDING_STORAGE_KEY = 'vuko_onboarding_completed';
const DEMO_MODE_KEY = 'vuko_demo_mode';

let currentStep = 0;
let isDemoMode = false;
let demoAudioContext = null;
let demoBinauralOscillators = [];
let demoBackgroundSource = null;
let demoBackgroundGain = null;

// Get onboarding content based on current language
function getOnboardingContent() {
    const content = getLanguageContent();
    return content.onboarding || {
        welcome: {
            title: "Welcome to Vuko",
            text: "Use binaural beats to guide yourself into different states of consciousness - meditation, focus, relaxation, or sleep."
        },
        step1: {
            title: "Step 1: Wear Headphones",
            text: "Binaural beats require stereo headphones to work. The left and right ears receive slightly different frequencies, creating a perceived beat in your brain."
        },
        step2: {
            title: "Step 2: Choose Your Music",
            text: "Select background music that helps you relax. You can search by mood (calm, focus) or instrument (piano, nature sounds)."
        },
        step3: {
            title: "Step 3: Start Your Session",
            text: "Click 'Start' to begin. For the full experience, allow microphone access so we can adapt the beats to your breathing rhythm."
        },
        buttons: {
            next: "Next",
            prev: "Back",
            skip: "Skip",
            start: "Get Started",
            tryDemo: "Try Demo First",
            gotIt: "Got It"
        },
        demo: {
            indicator: "Demo Mode",
            upgrade: "Enable Full Features"
        }
    };
}

// Check if user has completed onboarding
function hasCompletedOnboarding() {
    return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'true';
}

// Mark onboarding as completed
function completeOnboarding() {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
}

// Create onboarding modal HTML
function createOnboardingModal() {
    const content = getOnboardingContent();

    const overlay = document.createElement('div');
    overlay.className = 'onboarding-overlay';
    overlay.id = 'onboardingOverlay';

    overlay.innerHTML = `
        <div class="onboarding-modal">
            <button class="onboarding-skip" onclick="skipOnboarding()">${content.buttons.skip}</button>

            <!-- Step 0: Welcome -->
            <div class="onboarding-step active" data-step="0">
                <div class="onboarding-icon">🎧</div>
                <h2 class="onboarding-title">${content.welcome.title}</h2>
                <p class="onboarding-text">${content.welcome.text}</p>
                <div class="onboarding-dots">
                    <span class="onboarding-dot active"></span>
                    <span class="onboarding-dot"></span>
                    <span class="onboarding-dot"></span>
                    <span class="onboarding-dot"></span>
                </div>
                <div class="onboarding-buttons">
                    <button class="onboarding-btn onboarding-btn-primary" onclick="nextOnboardingStep()">${content.buttons.next}</button>
                </div>
            </div>

            <!-- Step 1: Headphones -->
            <div class="onboarding-step" data-step="1">
                <div class="onboarding-icon">🎵</div>
                <h2 class="onboarding-title">${content.step1.title}</h2>
                <p class="onboarding-text">${content.step1.text}</p>
                <div class="onboarding-dots">
                    <span class="onboarding-dot"></span>
                    <span class="onboarding-dot active"></span>
                    <span class="onboarding-dot"></span>
                    <span class="onboarding-dot"></span>
                </div>
                <div class="onboarding-buttons">
                    <button class="onboarding-btn onboarding-btn-secondary" onclick="prevOnboardingStep()">${content.buttons.prev}</button>
                    <button class="onboarding-btn onboarding-btn-primary" onclick="nextOnboardingStep()">${content.buttons.next}</button>
                </div>
            </div>

            <!-- Step 2: Music -->
            <div class="onboarding-step" data-step="2">
                <div class="onboarding-icon">🎶</div>
                <h2 class="onboarding-title">${content.step2.title}</h2>
                <p class="onboarding-text">${content.step2.text}</p>
                <div class="onboarding-dots">
                    <span class="onboarding-dot"></span>
                    <span class="onboarding-dot"></span>
                    <span class="onboarding-dot active"></span>
                    <span class="onboarding-dot"></span>
                </div>
                <div class="onboarding-buttons">
                    <button class="onboarding-btn onboarding-btn-secondary" onclick="prevOnboardingStep()">${content.buttons.prev}</button>
                    <button class="onboarding-btn onboarding-btn-primary" onclick="nextOnboardingStep()">${content.buttons.next}</button>
                </div>
            </div>

            <!-- Step 3: Get Started -->
            <div class="onboarding-step" data-step="3">
                <div class="onboarding-icon">🧘</div>
                <h2 class="onboarding-title">${content.step3.title}</h2>
                <p class="onboarding-text">${content.step3.text}</p>
                <div class="onboarding-dots">
                    <span class="onboarding-dot"></span>
                    <span class="onboarding-dot"></span>
                    <span class="onboarding-dot"></span>
                    <span class="onboarding-dot active"></span>
                </div>
                <div class="onboarding-buttons">
                    <button class="onboarding-btn onboarding-btn-demo" onclick="startDemoMode()">${content.buttons.tryDemo}</button>
                    <button class="onboarding-btn onboarding-btn-primary" onclick="finishOnboarding()">${content.buttons.start}</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    return overlay;
}

// Create demo mode indicator
function createDemoIndicator() {
    const content = getOnboardingContent();

    const indicator = document.createElement('div');
    indicator.className = 'demo-indicator';
    indicator.id = 'demoIndicator';
    indicator.innerHTML = `
        <span class="demo-indicator-pulse"></span>
        <span>${content.demo.indicator}</span>
        <button class="demo-upgrade-btn" onclick="upgradeTrueFromDemo()">${content.demo.upgrade}</button>
    `;

    // Insert after h1
    const h1 = document.querySelector('h1');
    if (h1) {
        h1.parentNode.insertBefore(indicator, h1.nextSibling);
    }
}

// Show onboarding modal (always starts from the first step)
function showOnboarding() {
    let overlay = document.getElementById('onboardingOverlay');
    if (!overlay) {
        overlay = createOnboardingModal();
    }

    // Reset to the first step so re-opening from the help button starts fresh
    currentStep = 0;
    const steps = overlay.querySelectorAll('.onboarding-step');
    steps.forEach((s, i) => s.classList.toggle('active', i === 0));
    updateDots();

    // Small delay for animation
    setTimeout(() => {
        overlay.classList.add('active');
    }, 100);

    // Track event
    if (typeof trackEvent === 'function') {
        trackEvent('onboarding_shown');
    }
}

// Hide onboarding modal
function hideOnboarding() {
    const overlay = document.getElementById('onboardingOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

// Navigate to next step
function nextOnboardingStep() {
    const steps = document.querySelectorAll('.onboarding-step');
    if (currentStep < steps.length - 1) {
        steps[currentStep].classList.remove('active');
        currentStep++;
        steps[currentStep].classList.add('active');
        updateDots();
    }
}

// Navigate to previous step
function prevOnboardingStep() {
    const steps = document.querySelectorAll('.onboarding-step');
    if (currentStep > 0) {
        steps[currentStep].classList.remove('active');
        currentStep--;
        steps[currentStep].classList.add('active');
        updateDots();
    }
}

// Update dot indicators
function updateDots() {
    const allDots = document.querySelectorAll('.onboarding-step.active .onboarding-dot');
    allDots.forEach((dot, index) => {
        dot.classList.toggle('active', index === currentStep);
    });
}

// Skip onboarding
function skipOnboarding() {
    completeOnboarding();
    hideOnboarding();

    if (typeof trackEvent === 'function') {
        trackEvent('onboarding_skipped', { step: currentStep });
    }
}

// Finish onboarding and start full mode
function finishOnboarding() {
    completeOnboarding();
    hideOnboarding();

    if (typeof trackEvent === 'function') {
        trackEvent('onboarding_completed');
    }
}

// Start demo mode (music + binaural without microphone)
function startDemoMode() {
    isDemoMode = true;
    completeOnboarding();
    hideOnboarding();

    // Show demo indicator
    let indicator = document.getElementById('demoIndicator');
    if (!indicator) {
        createDemoIndicator();
        indicator = document.getElementById('demoIndicator');
    }
    indicator.classList.add('active');

    // Start demo audio
    startDemoAudio();

    // Update button text
    const content = getLanguageContent();
    const toggleBtn = document.getElementById('monitorToggleBtn');
    if (toggleBtn) {
        toggleBtn.textContent = content.buttons.stop;
        toggleBtn.onclick = toggleDemoMode;
    }

    if (typeof trackEvent === 'function') {
        trackEvent('demo_mode_started');
    }
}

// Toggle demo mode on/off
function toggleDemoMode() {
    if (isDemoMode) {
        stopDemoMode();
    } else {
        startDemoMode();
    }
}

// Stop demo mode
function stopDemoMode() {
    isDemoMode = false;

    // Hide demo indicator
    const indicator = document.getElementById('demoIndicator');
    if (indicator) {
        indicator.classList.remove('active');
    }

    // Stop demo audio
    stopDemoAudio();

    // Reset button
    const content = getLanguageContent();
    const toggleBtn = document.getElementById('monitorToggleBtn');
    if (toggleBtn) {
        toggleBtn.textContent = content.buttons.start;
        toggleBtn.onclick = function() { toggleAdaptiveMode(); };
    }

    if (typeof trackEvent === 'function') {
        trackEvent('demo_mode_stopped');
    }
}

// Upgrade from demo to full mode
function upgradeTrueFromDemo() {
    stopDemoMode();

    // Start full mode with microphone
    if (typeof toggleAdaptiveMode === 'function') {
        toggleAdaptiveMode();
    }

    if (typeof trackEvent === 'function') {
        trackEvent('demo_upgraded_to_full');
    }
}

// Start demo audio (binaural + background music without microphone)
function startDemoAudio() {
    if (!demoAudioContext) {
        demoAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (demoAudioContext.state === 'suspended') {
        demoAudioContext.resume();
    }

    // Get selected beat frequency from UI or use default
    const beatFreq = typeof currentBeatFreq !== 'undefined' ? currentBeatFreq : 8;
    const baseFreq = typeof CONFIG !== 'undefined' ? CONFIG.BASE_FREQUENCY : 200;
    const binauralVol = typeof CONFIG !== 'undefined' ? CONFIG.BINAURAL_VOLUME : 0.3;
    const bgVol = typeof CONFIG !== 'undefined' ? CONFIG.BACKGROUND_VOLUME : 0.7;

    // Create binaural beats
    const leftOsc = demoAudioContext.createOscillator();
    const rightOsc = demoAudioContext.createOscillator();
    const leftGain = demoAudioContext.createGain();
    const rightGain = demoAudioContext.createGain();
    const merger = demoAudioContext.createChannelMerger(2);

    leftOsc.type = 'sine';
    rightOsc.type = 'sine';
    leftOsc.frequency.setValueAtTime(baseFreq, demoAudioContext.currentTime);
    rightOsc.frequency.setValueAtTime(baseFreq + beatFreq, demoAudioContext.currentTime);
    leftGain.gain.setValueAtTime(binauralVol, demoAudioContext.currentTime);
    rightGain.gain.setValueAtTime(binauralVol, demoAudioContext.currentTime);

    leftOsc.connect(leftGain).connect(merger, 0, 0);
    rightOsc.connect(rightGain).connect(merger, 0, 1);
    merger.connect(demoAudioContext.destination);

    leftOsc.start();
    rightOsc.start();

    demoBinauralOscillators = [leftOsc, rightOsc, leftGain, rightGain, merger];

    // Load and play background music if selected
    const audioUrl = typeof getBackgroundAudioUrl === 'function' ? getBackgroundAudioUrl() : null;
    if (audioUrl) {
        loadDemoBackgroundAudio(audioUrl, bgVol);
    }

    // Show processing status
    const content = getLanguageContent();
    if (typeof showStatus === 'function') {
        const demoStatus = content.status.demoMode || 'Demo mode - enjoying binaural beats without breathing detection';
        showStatus(demoStatus, 'processing');
    }
}

// Load background audio for demo mode
function loadDemoBackgroundAudio(url, volume) {
    fetch(url)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => demoAudioContext.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
            demoBackgroundSource = demoAudioContext.createBufferSource();
            demoBackgroundGain = demoAudioContext.createGain();

            demoBackgroundSource.buffer = audioBuffer;
            demoBackgroundSource.loop = true;
            demoBackgroundGain.gain.setValueAtTime(0.001, demoAudioContext.currentTime);
            demoBackgroundGain.gain.exponentialRampToValueAtTime(
                volume,
                demoAudioContext.currentTime + 3
            );

            demoBackgroundSource.connect(demoBackgroundGain);
            demoBackgroundGain.connect(demoAudioContext.destination);
            demoBackgroundSource.start();
        })
        .catch(err => {
            console.warn('Failed to load demo background audio:', err);
        });
}

// Stop demo audio
function stopDemoAudio() {
    // Stop binaural oscillators
    demoBinauralOscillators.forEach(node => {
        if (node.stop) {
            try { node.stop(); } catch(e) {}
        }
        if (node.disconnect) {
            try { node.disconnect(); } catch(e) {}
        }
    });
    demoBinauralOscillators = [];

    // Stop background audio with fade out
    if (demoBackgroundSource && demoBackgroundGain) {
        demoBackgroundGain.gain.exponentialRampToValueAtTime(
            0.001,
            demoAudioContext.currentTime + 1
        );
        setTimeout(() => {
            if (demoBackgroundSource) {
                try { demoBackgroundSource.stop(); } catch(e) {}
                demoBackgroundSource = null;
                demoBackgroundGain = null;
            }
        }, 1000);
    }

    // Show stopped status
    const content = getLanguageContent();
    if (typeof showStatus === 'function') {
        showStatus(content.status.stopped, 'success');
    }
}

// Create a small, non-intrusive floating button to (re)open the tutorial.
function createHelpButton() {
    if (document.getElementById('onboardingHelpBtn')) return;
    const btn = document.createElement('button');
    btn.id = 'onboardingHelpBtn';
    btn.className = 'onboarding-help-btn';
    btn.setAttribute('aria-label', 'How to use Vuko');
    btn.textContent = '?';
    btn.onclick = function () { showOnboarding(); };
    document.body.appendChild(btn);
}

// Initialize onboarding on page load
function initOnboarding() {
    // Create demo indicator (hidden by default)
    createDemoIndicator();

    // Non-blocking onboarding: the old auto-popup full-screen modal correlated
    // with high bounce (onboarding_shown with almost no onboarding_completed,
    // 6s avg engagement). First-time visitors now land directly on the working
    // app + content; a floating "?" button lets anyone open the tutorial.
    createHelpButton();
}

// Update onboarding content when language changes
function updateOnboardingContent() {
    const overlay = document.getElementById('onboardingOverlay');
    if (overlay) {
        overlay.remove();
    }

    const indicator = document.getElementById('demoIndicator');
    if (indicator) {
        const wasActive = indicator.classList.contains('active');
        indicator.remove();
        createDemoIndicator();
        if (wasActive) {
            document.getElementById('demoIndicator').classList.add('active');
        }
    }
}

// Export for global access
window.initOnboarding = initOnboarding;
window.createHelpButton = createHelpButton;
window.showOnboarding = showOnboarding;
window.hideOnboarding = hideOnboarding;
window.nextOnboardingStep = nextOnboardingStep;
window.prevOnboardingStep = prevOnboardingStep;
window.skipOnboarding = skipOnboarding;
window.finishOnboarding = finishOnboarding;
window.startDemoMode = startDemoMode;
window.stopDemoMode = stopDemoMode;
window.toggleDemoMode = toggleDemoMode;
window.upgradeTrueFromDemo = upgradeTrueFromDemo;
window.updateOnboardingContent = updateOnboardingContent;
window.isDemoMode = isDemoMode;
