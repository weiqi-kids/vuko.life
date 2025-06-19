// 拍頻與呼吸處理主邏輯

/**
 * Process binaural configuration and compute sound parameters.
 *
 * Input example:
 * {
 *   breath: {
 *     target: 0.2,
 *     curve: [0.18, 0.19, 0.2],
 *     range: [0.18, 0.22],
 *     threshold: 0.02,
 *     max_diff: 0.07
 *   },
 *   bgm: {
 *     main_freq: 741,
 *     file: 'https://.../rainforest.mp3',
 *     type: 'rainforest',
 *     volume: 0.5
 *   },
 *   beat: {
 *     init: 12,
 *     target: 8,
 *     curve: [12, 10, 8]
 *   },
 *   meta: {
 *     version: '1.0'
 *   }
 * }
 *
 * @param {Object} input - Input parameters
 * @param {Object} input.breath - breathing guidance config
 * @param {Object|Array} input.bgm - background music config(s)
 * @param {Object} input.beat - binaural beat config
 * @param {Object} input.meta - meta information
 * @returns {Object} Output parameters
 * @property {number} F_beat - recommended beat frequency
 * @property {number} V - guidance volume
 * @property {number} R_bg - background ratio
 * @property {number} F_base - suggested base frequency
 * @property {string|null} warning - warning message if any
 * @property {Object} log - debug info
 */
function processBinaural(input) {
    if (!input) input = {};
    const {
        breath = {},
        bgm = {},
        beat = {},
        meta = {},
        noiseDb = 0,
        noiseThresholdDb = 50
    } = input;

    const {
        target = 0,
        curve = [],
        range = [target * 0.9, target * 1.1],
        threshold = 0.03,
        max_diff = 0.15
    } = breath;

    const bgItem = Array.isArray(bgm) ? (bgm[0] || {}) : bgm;
    const {
        main_freq = 528,
        type: bg_type = 'none',
        volume: bg_volume = 1
    } = bgItem;

    const {
        init = 0,
        target: beat_target = init,
        curve: beat_curve = []
    } = beat;

    const desiredBeat = beat_curve.length
        ? beat_curve[beat_curve.length - 1]
        : beat_target;

    const F_beat = desiredBeat;
    const V = 1;
    const R_bg = Math.max(0, Math.min(1, bg_volume));
    const F_base = main_freq;
    let warning = null;
    if (noiseDb > noiseThresholdDb) {
        warning = 'HIGH_NOISE';
    }

    const log = {
        breath: { target, curve, range, threshold, max_diff },
        bgm: bgItem,
        beat: { init, target: beat_target, curve: beat_curve },
        meta,
        noiseDb
    };

    return { F_beat, V, R_bg, F_base, warning, log };
}

// export to global scope for browser usage
if (typeof window !== 'undefined') {
    window.processBinaural = processBinaural;
}
