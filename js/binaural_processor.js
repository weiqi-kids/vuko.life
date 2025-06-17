// 拍頻與呼吸處理主邏輯

/**
 * Process breathing input data and compute recommended sound parameters.
 * The input structure follows docs/binaural_processor.md
 * @param {Object} input - Input parameters
 * @param {Array<number>} input.B_user_raw - raw breathing signal
 * @param {number} input.B_user - current breathing frequency
 * @param {number} input.B_user_quality - quality score 0~1
 * @param {boolean} input.B_user_stable - is breathing stable
 * @param {Array<number>} input.S_breath_raw - raw breath waveform
 * @param {number} input.N_bg_level - background noise level 0~1
 * @param {Array<number>} input.N_bg_freq - noise main frequencies
 * @param {number} input.N_bg_quality - recording quality 0~1
 * @param {number} input.N_bg_corr - correlation between breath and noise
 * @param {number} input.B_target - target breathing frequency
 * @param {Array<number>} input.target_curve - optional target curve
 * @param {Object} input.context - guidance settings
 * @param {string} [input.device_label] - recorder label
 * @param {string} [input.user_id] - user identifier
 * @param {string} [input.platform] - running platform
 * @param {Object|Array|null} [input.history] - optional history
 * @param {Object|null} [input.feedback] - optional feedback
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
        B_user_raw = [],
        B_user = 0,
        B_user_quality = 1,
        B_user_stable = true,
        S_breath_raw = [],
        N_bg_level = 0,
        N_bg_freq = [],
        N_bg_quality = 1,
        N_bg_corr = 0,
        B_target = B_user,
        target_curve = [],
        context = {},
        device_label = '',
        user_id = '',
        platform = '',
        history = null,
        feedback = null
    } = input;

    const {
        mode = 'relax',
        music_type = 'binaural',
        base_freq = 528,
        bg_type = 'none',
        bg_weight = 0.5,
        threshold = 0.03,
        max_diff = 0.15,
        accept_range = [B_target * 0.9, B_target * 1.1]
    } = context;

    const desired = target_curve.length ? target_curve[target_curve.length - 1] : B_target;
    const diff = desired - B_user;

    let F_beat;
    if (Math.abs(diff) <= threshold &&
        B_user >= accept_range[0] &&
        B_user <= accept_range[1] &&
        B_user_quality > 0.4 &&
        N_bg_corr < 0.7) {
        F_beat = B_user;
    } else {
        let limited = Math.max(-max_diff, Math.min(max_diff, diff));
        if (!B_user_stable) limited *= 0.5;
        if (N_bg_corr > 0.7 || B_user_quality < 0.3) {
            limited = diff; // rely more on target when quality is poor
        }
        F_beat = B_user + limited;
    }

    let V = (1 - N_bg_level) * B_user_quality * (1 - N_bg_corr);
    const modeVolume = mode === 'relax' ? 0.8 : 1;
    V *= modeVolume;
    V = Math.max(0, Math.min(1, V));

    let R_bg = bg_weight * (1 - N_bg_level);
    if (bg_type === 'silent') R_bg = 0;
    R_bg = Math.max(0, Math.min(1, R_bg));

    let F_base = base_freq;
    if (music_type !== 'binaural') {
        F_base = base_freq * 1;
    }

    let warning = null;
    if (N_bg_level > 0.7) warning = "高噪音，請靠近麥克風";
    if (B_user_quality < 0.4) warning = "呼吸訊號品質低";
    if (N_bg_quality < 0.4) warning = "收音品質不佳";
    if (N_bg_corr > 0.7) warning = "背景噪音干擾呼吸訊號";
    if (Math.abs(diff) > max_diff) warning = "呼吸與目標差異過大";

    const log = {
        delta_b: diff,
        stable: B_user_stable,
        bg_level: N_bg_level,
        corr: N_bg_corr,
        desired,
        mode,
        music_type,
        bg_freq: N_bg_freq,
        raw_length: B_user_raw.length,
        breath_samples: S_breath_raw.length,
        device_label,
        user_id,
        platform,
        history,
        feedback
    };

    return { F_beat, V, R_bg, F_base, warning, log };
}

if (typeof module !== 'undefined') {
    module.exports = { processBinaural };
}
