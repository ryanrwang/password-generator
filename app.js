const DEFAULT_SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?';
const CHAR_SETS = {
    upper:   'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower:   'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
};
const HTML_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };

const elPassword      = document.getElementById('password');
const elCopyBtn       = document.getElementById('copy-btn');
const elStrengthBar   = document.getElementById('strength-bar');
const elTopPanel      = document.querySelector('.fullscreen-display');

// Sparkle field — inserted as first child so z-index: -1 works within panel context
const elSparkleField = document.createElement('div');
elSparkleField.className = 'sparkle-field';
elSparkleField.style.opacity = '0';
elTopPanel.insertBefore(elSparkleField, elTopPanel.firstChild);

// Electric sparks container — child of strength bar so they follow its width
const elElecSparks = document.createElement('div');
elElecSparks.className = 'strength-sparks';
elElecSparks.style.opacity = '0';
elStrengthBar.appendChild(elElecSparks);

const elLengthNum     = document.getElementById('length-num');
const elLengthSlider  = document.getElementById('length-slider');
const elSymOptions    = document.getElementById('symbol-options');
const elLimitSym      = document.getElementById('opt-limit-sym');
const elMaxSymNum     = document.getElementById('max-sym-num');
const elMaxSymSlider  = document.getElementById('max-sym-slider');
const elMaxSymDisplay = document.getElementById('max-sym-display');
const elSymFirst      = document.getElementById('opt-sym-first');
const elSymPicker     = document.getElementById('symbol-picker');

const checkboxes = {
    upper:   document.getElementById('opt-upper'),
    lower:   document.getElementById('opt-lower'),
    numbers: document.getElementById('opt-numbers'),
    symbols: document.getElementById('opt-symbols'),
};

let currentPassword = '';
let sparkleState    = null;   // null | 'green' | 'amazing' | 'warp-low' | 'warp-med' | 'warp-high'
let elecSparkState  = null;   // null | 'low' | 'med' | 'high'

// ── Slider fill gradient ──
function updateSliderTrack(slider, color) {
    const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.background =
        `linear-gradient(to right, ${color} ${pct}%, #1e1e3a ${pct}%)`;
}
updateSliderTrack(elLengthSlider, '#7f5af0');
updateSliderTrack(elMaxSymSlider, '#fb923c');

// ── Password rendering ──
function charClass(ch) {
    if (CHAR_SETS.upper.includes(ch))   return 'ch-upper';
    if (CHAR_SETS.lower.includes(ch))   return 'ch-lower';
    if (CHAR_SETS.numbers.includes(ch)) return 'ch-num';
    return 'ch-sym';
}
function renderPassword(pw) {
    currentPassword = pw;
    elPassword.innerHTML = [...pw]
        .map(ch => `<span class="${charClass(ch)}">${HTML_ESC[ch] ?? ch}</span>`)
        .join('');
}
function clearDisplay() { currentPassword = ''; elPassword.innerHTML = ''; }
function showError(msg) {
    currentPassword = '';
    elPassword.innerHTML = `<span class="pw-error">${msg}</span>`;
}

// ── Copy ──
let copyTimer = null;
function copyPassword() {
    if (!currentPassword) return;
    navigator.clipboard.writeText(currentPassword).then(() => {
        spawnCopySparks();
        elCopyBtn.textContent = 'Copied!';
        elCopyBtn.classList.add('copied');
        clearTimeout(copyTimer);
        copyTimer = setTimeout(() => {
            elCopyBtn.textContent = 'Copy';
            elCopyBtn.classList.remove('copied');
        }, 2000);
    });
}
elPassword.addEventListener('click', copyPassword);
elCopyBtn.addEventListener('click',  copyPassword);

// ── Impact effect on generate ──
function triggerImpact() {
    elPassword.classList.remove('impact');
    void elPassword.offsetWidth;
    elPassword.classList.add('impact');
}

// ── Copy sparks (radiate from each character) ──
function spawnCopySparks() {
    const spans = elPassword.querySelectorAll('span:not(.pw-error)');
    if (!spans.length) return;
    const maxTotal = 50;
    const perChar = Math.max(1, Math.ceil(maxTotal / spans.length));
    let count = 0;
    const colors = ['#fbbf24', '#f59e0b', '#fb923c', '#fcd34d', '#fff'];
    const glows  = ['rgba(251,191,36,0.6)', 'rgba(245,158,11,0.6)', 'rgba(251,146,60,0.6)', 'rgba(252,211,77,0.6)', 'rgba(255,255,255,0.5)'];
    for (const span of spans) {
        if (count >= maxTotal) break;
        const rect = span.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        for (let j = 0; j < perChar && count < maxTotal; j++) {
            const spark = document.createElement('div');
            spark.className = 'copy-spark';
            const angle = Math.random() * Math.PI * 2;
            const dist = 50 + Math.random() * 130;
            spark.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(1) + 'px');
            spark.style.setProperty('--dy', (Math.sin(angle) * dist).toFixed(1) + 'px');
            spark.style.left = (cx + (Math.random() - 0.5) * rect.width * 0.3) + 'px';
            spark.style.top = (cy + (Math.random() - 0.5) * rect.height * 0.3) + 'px';
            spark.style.setProperty('--spark-size', (3 + Math.random() * 5).toFixed(1) + 'px');
            spark.style.setProperty('--spark-dur', (0.5 + Math.random() * 0.5).toFixed(2) + 's');
            const ci = Math.floor(Math.random() * colors.length);
            spark.style.background = colors[ci];
            spark.style.setProperty('--spark-glow', glows[ci]);
            document.body.appendChild(spark);
            spark.addEventListener('animationend', () => spark.remove());
            count++;
        }
    }
}

// ── Card toggles ──
const elSymSettingsBtn = document.getElementById('sym-settings-btn');

['upper', 'lower', 'numbers', 'symbols'].forEach(key => {
    const cb   = checkboxes[key];
    const card = document.getElementById(`card-${key}`);
    card.classList.toggle('active', cb.checked);
    cb.addEventListener('change', () => {
        card.classList.toggle('active', cb.checked);
        if (key === 'symbols') {
            elSymSettingsBtn.classList.toggle('visible', cb.checked);
            if (!cb.checked) {
                elSymOptions.classList.remove('visible');
                elSymSettingsBtn.classList.remove('active');
                card.classList.remove('expanded');
            }
        }
        generate();
    });
});

// ── Symbol settings icon — toggles symbol sub-options ──
const elCardSymbols = document.getElementById('card-symbols');
elSymSettingsBtn.addEventListener('click', () => {
    elSymOptions.classList.toggle('visible');
    const isVis = elSymOptions.classList.contains('visible');
    elSymSettingsBtn.classList.toggle('active', isVis);
    elCardSymbols.classList.toggle('expanded', isVis);
});

// ── Symbols card — click anywhere on header to toggle (like other cards) ──
document.getElementById('symbols-header').addEventListener('click', (e) => {
    if (e.target.closest('.sym-settings-btn') || e.target.closest('.toggle-switch')) return;
    checkboxes.symbols.click();
});

// ── Symbol chips ──
for (const sym of DEFAULT_SYMBOLS) {
    const btn = document.createElement('button');
    btn.className = 'sym-chip';
    btn.textContent = sym;
    btn.dataset.sym = sym;
    btn.addEventListener('click', () => { btn.classList.toggle('off'); generate(); });
    elSymPicker.appendChild(btn);
}
document.getElementById('sym-all').addEventListener('click', () => {
    elSymPicker.querySelectorAll('.sym-chip').forEach(c => c.classList.remove('off'));
    generate();
});
document.getElementById('sym-none').addEventListener('click', () => {
    elSymPicker.querySelectorAll('.sym-chip').forEach(c => c.classList.add('off'));
    generate();
});
function getSelectedSymbols() {
    return [...elSymPicker.querySelectorAll('.sym-chip:not(.off)')]
        .map(c => c.dataset.sym).join('');
}

// ── Limit-symbols ──
elLimitSym.addEventListener('change', () => {
    elMaxSymNum.disabled    = !elLimitSym.checked;
    elMaxSymSlider.disabled = !elLimitSym.checked;
    updateSliderTrack(elMaxSymSlider, '#fb923c');
    generate();
});
elMaxSymNum.addEventListener('input', () => {
    let v = parseInt(elMaxSymNum.value, 10);
    if (isNaN(v) || v < 1) v = 1;
    v = Math.min(v, parseInt(elLengthNum.value, 10));
    elMaxSymNum.value = v;
    elMaxSymSlider.value = Math.min(v, parseInt(elMaxSymSlider.max, 10));
    elMaxSymDisplay.textContent = v;
    updateSliderTrack(elMaxSymSlider, '#fb923c');
    generate();
});
elMaxSymSlider.addEventListener('input', () => {
    const v = parseInt(elMaxSymSlider.value, 10);
    elMaxSymNum.value = v;
    elMaxSymDisplay.textContent = v;
    updateSliderTrack(elMaxSymSlider, '#fb923c');
    generate();
});
elSymFirst.addEventListener('change', generate);

// ── Crypto RNG ──
function cryptoRandInt(max) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return a[0] % max;
}
function getEnabledKeys() {
    return Object.keys(checkboxes).filter(k => checkboxes[k].checked);
}

// ── Password generation ──
function generatePassword(length, enabledKeys) {
    const selectedSymbols = getSelectedSymbols();
    const maxSymbols = (checkboxes.symbols.checked && elLimitSym.checked)
        ? parseInt(elMaxSymNum.value, 10) : Infinity;
    const symbolsNotFirst = checkboxes.symbols.checked && !elSymFirst.checked;

    const sets = {};
    for (const k of enabledKeys)
        sets[k] = k === 'symbols' ? selectedSymbols : CHAR_SETS[k];

    const validKeys = enabledKeys.filter(k => sets[k] && sets[k].length > 0);
    if (validKeys.length === 0 || length < validKeys.length) return null;

    const chars = [];
    let symCount = 0;
    for (const k of validKeys) {
        const ch = sets[k][cryptoRandInt(sets[k].length)];
        chars.push(ch);
        if (k === 'symbols') symCount++;
    }
    for (let i = chars.length; i < length; i++) {
        const pool = validKeys
            .filter(k => k !== 'symbols' || symCount < maxSymbols)
            .map(k => sets[k]).join('');
        if (!pool.length) return null;
        const ch = pool[cryptoRandInt(pool.length)];
        if (validKeys.includes('symbols') && sets.symbols.includes(ch)) symCount++;
        chars.push(ch);
    }
    for (let i = chars.length - 1; i > 0; i--) {
        const j = cryptoRandInt(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    if (symbolsNotFirst && validKeys.includes('symbols') && sets.symbols.length > 0) {
        if (sets.symbols.includes(chars[0])) {
            const si = chars.findIndex(c => !sets.symbols.includes(c));
            if (si > 0) [chars[0], chars[si]] = [chars[si], chars[0]];
        }
    }
    return chars.join('');
}

// ── Strength — entropy-based, 0–100 score ──
function computeStrengthScore(length, enabledKeys) {
    if (enabledKeys.length === 0) return 0;
    let charsetSize = 0;
    for (const k of enabledKeys) {
        if (k === 'symbols') charsetSize += getSelectedSymbols().length;
        else charsetSize += CHAR_SETS[k].length;
    }
    if (charsetSize <= 1) return 0;
    const entropy = length * Math.log2(charsetSize);
    // 10 bits → score 0, 175 bits → score 100  (max ~28 chars with all types)
    return Math.min(100, Math.max(0, (entropy - 10) / 165 * 100));
}

const BASE_BG = 'linear-gradient(160deg, #12122a 0%, #1a1a2e 100%)';

// ── Sparkles (twinkle for score ≥ 44, warp-streaks for length ≥ 30) ──
function updateSparkles(score, len) {
    let newState;
    if      (len >= 56)   newState = 'warp-high';
    else if (len >= 42)   newState = 'warp-med';
    else if (len >= 30)   newState = 'warp-low';
    else if (score >= 90) newState = 'amazing';
    else if (score >= 44) newState = 'green';
    else                  newState = null;

    if (newState === sparkleState) return;
    sparkleState = newState;

    elSparkleField.innerHTML = '';
    if (!newState) { elSparkleField.style.opacity = '0'; return; }

    let count, color, warping = false, warpX = 1;
    if (newState === 'green') {
        count = 14; color = 'rgba(134,239,172,0.82)';
    } else if (newState === 'amazing') {
        count = 26; color = 'rgba(200,255,220,0.9)';
    } else if (newState === 'warp-low') {
        count = 60;  color = 'rgba(134,239,172,0.76)'; warping = true; warpX = 7;
    } else if (newState === 'warp-med') {
        count = 150; color = 'rgba(167,243,208,0.84)'; warping = true; warpX = 12;
    } else { // warp-high
        count = 225; color = 'rgba(200,250,230,0.9)';  warping = true; warpX = 18;
    }

    for (let i = 0; i < count; i++) {
        const s = document.createElement('span');
        s.className = 'sparkle' + (warping ? ' warping' : '');
        s.style.left   = warping ? '50%' : (3 + Math.random() * 94) + '%';
        s.style.top    = warping ? '50%' : (3 + Math.random() * 94) + '%';
        const sz = (warping ? 2 + Math.random() * 8 : 2 + Math.random() * 4).toFixed(1);
        s.style.width  = warping ? '1px' : sz + 'px';
        s.style.height = sz + 'px';
        const warpSpeed = newState === 'warp-high' ? 0.25 + Math.random() * 0.45
                       : newState === 'warp-med'  ? 0.35 + Math.random() * 0.65
                       :                            0.5  + Math.random() * 0.9;
        const baseDur = warping ? warpSpeed : 0.9 + Math.random() * 2.2;
        s.style.setProperty('--dur',         baseDur.toFixed(2) + 's');
        s.style.setProperty('--delay',       (-Math.random() * (warping ? 2 : 3)).toFixed(2) + 's');
        s.style.setProperty('--spark-color', color);
        if (warping) {
            s.style.setProperty('--angle',   (Math.random() * 360).toFixed(1) + 'deg');
            s.style.setProperty('--wx',      (warpX * (0.5 + Math.random())).toFixed(1));
            s.style.setProperty('--peak-op', (0.45 + Math.random() * 0.55).toFixed(2));
            s.style.setProperty('--start-op', Math.random() < 0.2 ? (0.3 + Math.random() * 0.5).toFixed(2) : '0');
            const travel = 350 + Math.random() * 450;
            s.style.setProperty('--travel',  travel.toFixed(0) + 'px');
            s.style.setProperty('--travel2', (travel * 1.4).toFixed(0) + 'px');
        }
        elSparkleField.appendChild(s);
    }
    elSparkleField.style.opacity = '1';
}

function updateStrengthUI(score) {
    if (score === null) {
        elStrengthBar.style.width         = '0px';
        elStrengthBar.style.background    = 'transparent';
        elStrengthBar.style.boxShadow     = 'none';
        elStrengthBar.style.animationName = 'none';
        elTopPanel.style.background       = BASE_BG;
        updateSparkles(null, 0);
        updateElecSparks(0);
        return;
    }

    const len   = parseInt(elLengthNum.value, 10);
    // Width: 40 px (score 0) → 440 px (score 100)
    const width = Math.round(40 + score * 4.0);

    let bg, shadow, dur, tintRgb, animName = 'flamePulse';

    // Color based on password length (red at 4 → orange at 10 → green at 16+)
    if (len <= 5) {
        // Bright red (4 and 5 similar brightness)
        bg       = 'linear-gradient(90deg,#b91c1c,#dc2626,#ef4444,#dc2626,#b91c1c)';
        shadow   = '0 0 6px 2px rgba(239,68,68,0.5),'
                 + '0 0 14px 3px rgba(185,28,28,0.22)';
        dur      = '3.5s'; tintRgb = '220,38,38';
    } else if (len <= 7) {
        // Red-orange
        bg       = 'linear-gradient(90deg,#991b1b,#dc2626,#ea580c,#dc2626,#991b1b)';
        shadow   = '0 0 7px 2px rgba(220,38,38,0.52),'
                 + '0 0 18px 4px rgba(153,27,27,0.24)';
        dur      = '3s'; tintRgb = '210,55,20';
    } else if (len <= 9) {
        // Orange
        bg       = 'linear-gradient(90deg,#c2410c,#ea580c,#f97316,#ea580c,#c2410c)';
        shadow   = '0 0 8px 2px rgba(234,88,12,0.54),'
                 + '0 0 20px 4px rgba(194,65,12,0.26),'
                 + '0 0 32px 5px rgba(127,29,29,0.1)';
        dur      = '2.5s'; tintRgb = '234,88,12';
    } else if (len <= 11) {
        // Golden amber — peak orange at length 10
        bg       = 'linear-gradient(90deg,#d97706,#f59e0b,#fbbf24,#f59e0b,#d97706)';
        shadow   = '0 0 9px 3px rgba(251,191,36,0.54),'
                 + '0 0 22px 5px rgba(245,158,11,0.28),'
                 + '0 0 38px 6px rgba(217,119,6,0.12)';
        dur      = '2s'; tintRgb = '245,158,11';
    } else if (len <= 13) {
        // Lime / yellow-green
        bg       = 'linear-gradient(90deg,#65a30d,#84cc16,#a3e635,#84cc16,#65a30d)';
        shadow   = '0 0 9px 3px rgba(163,230,53,0.52),'
                 + '0 0 22px 5px rgba(132,204,22,0.28),'
                 + '0 0 38px 6px rgba(101,163,13,0.12)';
        dur      = '1.4s'; tintRgb = '132,204,22';
    } else if (len <= 15) {
        // Medium green — crisper pulse
        bg       = 'linear-gradient(90deg,#15803d,#22c55e,#4ade80,#22c55e,#15803d)';
        shadow   = '0 0 8px 2px rgba(74,222,128,0.9),'
                 + '0 0 20px 5px rgba(34,197,94,0.6),'
                 + '0 0 36px 8px rgba(22,163,74,0.3),'
                 + '0 0 50px 10px rgba(22,163,74,0.12)';
        dur      = '1.1s'; tintRgb = '34,197,94'; animName = 'crispPulse';
    } else {
        // Full green (16+) — bright glow
        bg       = 'linear-gradient(90deg,#22c55e,#4ade80,#a7f3d0,#4ade80,#22c55e)';
        shadow   = '0 0 8px 2px rgba(134,239,172,0.95),'
                 + '0 0 18px 5px rgba(74,222,128,0.78),'
                 + '0 0 34px 8px rgba(34,197,94,0.45),'
                 + '0 0 52px 11px rgba(22,163,74,0.22),'
                 + '0 0 70px 14px rgba(22,163,74,0.08)';
        dur      = '0.65s'; tintRgb = '80,240,120'; animName = 'crispPulse';
    }

    elStrengthBar.style.width      = width + 'px';
    elStrengthBar.style.background = bg;
    elStrengthBar.style.boxShadow  = shadow;

    if (len >= 10) {
        elStrengthBar.style.animationName     = animName;
        elStrengthBar.style.animationDuration = dur;
    } else {
        elStrengthBar.style.animationName = 'none';
    }

    // Background: tint alpha scales with score (more intense as length grows),
    // plus a deepening blue-purple warp-core glow for length >= 30
    const tintAlpha = (0.05 + (score / 100) * 0.17).toFixed(3);
    const bgParts   = [];
    if (len >= 30) {
        const warpGlow = Math.min(1, (len - 30) / 38);
        const warpA    = (0.07 + warpGlow * 0.28).toFixed(3);
        bgParts.push(`radial-gradient(ellipse 52% 62% at 50% 50%, rgba(45,75,215,${warpA}) 0%, transparent 65%)`);
    }
    bgParts.push(`radial-gradient(ellipse 75% 85% at 50% 50%, rgba(${tintRgb},${tintAlpha}) 0%, transparent 70%)`);
    bgParts.push(BASE_BG);
    elTopPanel.style.background = bgParts.join(', ');

    updateSparkles(score, len);
    updateElecSparks(len);
}

// ── Electric sparks on strength bar (length 40+) ──
function setupSpark(spark, zagRange) {
    const goRight = Math.random() > 0.5;
    const dist = 40 + Math.random() * 80;
    spark.style.left = (Math.random() * 100) + '%';
    spark.style.top = (20 + Math.random() * 60) + '%';
    spark.style.setProperty('--travel-x', (goRight ? dist : -dist) + 'px');
    spark.style.setProperty('--zag', (3 + Math.random() * zagRange).toFixed(1) + 'px');
    // Trail shadows point opposite to travel direction
    spark.style.setProperty('--trail-x', (goRight ? -2 : 2) + 'px');
}
function updateElecSparks(len) {
    let newState;
    if      (len >= 56) newState = 'high';
    else if (len >= 48) newState = 'med';
    else if (len >= 40) newState = 'low';
    else                newState = null;

    if (newState === elecSparkState) return;
    elecSparkState = newState;

    elElecSparks.innerHTML = '';
    if (!newState) { elElecSparks.style.opacity = '0'; return; }

    let count, speedBase, zagRange;
    if      (newState === 'low')  { count = 30;  speedBase = 0.35; zagRange = 5;  }
    else if (newState === 'med')  { count = 60;  speedBase = 0.22; zagRange = 7;  }
    else                          { count = 100; speedBase = 0.14; zagRange = 10; }

    const elecColors = ['#60a5fa', '#93c5fd', '#3b82f6', '#a5f3fc', '#e0f2fe', '#fff'];
    for (let i = 0; i < count; i++) {
        const spark = document.createElement('span');
        spark.className = 'elec-spark';
        setupSpark(spark, zagRange);
        // Timing — fast with slight variation
        spark.style.setProperty('--dur', (speedBase + Math.random() * 0.15).toFixed(2) + 's');
        spark.style.setProperty('--delay', (-Math.random() * 1.5).toFixed(2) + 's');
        // Size — short line segments
        spark.style.setProperty('--spark-w', (1 + Math.random() * 2).toFixed(1) + 'px');
        spark.style.setProperty('--spark-h', (0.5 + Math.random() * 0.8).toFixed(1) + 'px');
        const color = elecColors[Math.floor(Math.random() * elecColors.length)];
        spark.style.setProperty('--spark-color', color);
        // Re-randomize on each animation cycle
        spark.addEventListener('animationiteration', () => {
            setupSpark(spark, zagRange);
        });
        elElecSparks.appendChild(spark);
    }
    elElecSparks.style.opacity = '1';
}

// ── Generate ──
function generate() {
    const length  = parseInt(elLengthNum.value, 10);
    const enabled = getEnabledKeys();
    if (enabled.length === 0) {
        showError('Select at least one character type.');
        updateStrengthUI(null); return;
    }
    // If symbols enabled but none selected, just exclude symbols
    if (checkboxes.symbols.checked && !getSelectedSymbols()) {
        const filtered = enabled.filter(k => k !== 'symbols');
        if (filtered.length === 0) {
            showError('Select at least one character type.');
            updateStrengthUI(null); return;
        }
        const pw = generatePassword(length, filtered);
        if (!pw) {
            showError('Length too short for selected options.');
            updateStrengthUI(null); return;
        }
        renderPassword(pw);
        updateStrengthUI(computeStrengthScore(length, filtered));
        return;
    }
    const pw = generatePassword(length, enabled);
    if (!pw) {
        showError('Length too short for selected options.');
        updateStrengthUI(null); return;
    }
    renderPassword(pw);
    updateStrengthUI(computeStrengthScore(length, enabled));
}

// ── Length sync ──
elLengthSlider.addEventListener('input', () => {
    elLengthNum.value = elLengthSlider.value;
    updateSliderTrack(elLengthSlider, '#7f5af0');
    syncMaxSymMax(+elLengthSlider.value);
    generate();
    updateArrowStates();
});
elLengthNum.addEventListener('input', () => {
    let v = parseInt(elLengthNum.value, 10);
    if (isNaN(v) || v < 1) return;
    elLengthSlider.value = Math.min(64, Math.max(4, v));
    updateSliderTrack(elLengthSlider, '#7f5af0');
    syncMaxSymMax(Math.min(64, Math.max(4, v)));
    generate();
    updateArrowStates();
});
elLengthNum.addEventListener('blur', () => {
    let v = parseInt(elLengthNum.value, 10);
    if (isNaN(v)) v = 16;
    v = Math.min(64, Math.max(4, v));
    elLengthNum.value    = v;
    elLengthSlider.value = v;
    updateSliderTrack(elLengthSlider, '#7f5af0');
    syncMaxSymMax(v);
    generate();
    updateArrowStates();
});
function syncMaxSymMax(len) {
    elMaxSymSlider.max = len;
    if (+elMaxSymNum.value > len) {
        elMaxSymNum.value = len;
        elMaxSymSlider.value = len;
        elMaxSymDisplay.textContent = len;
    }
    updateSliderTrack(elMaxSymSlider, '#fb923c');
}

document.getElementById('generate-btn').addEventListener('click', () => {
    generate();
    if (currentPassword) triggerImpact();
});

// ── Settings card toggle ──
const elSettingsCard   = document.getElementById('settings-card');
const elSettingsHandle = document.getElementById('settings-handle');

function updateContentOffset() {
    const isOpen = elSettingsCard.classList.contains('open');
    if (isOpen) {
        const cardH = elSettingsCard.offsetHeight;
        elTopPanel.style.setProperty('--card-offset', `${-cardH / 2}px`);
    } else {
        elTopPanel.style.setProperty('--card-offset', '-24px');
    }
}

function openCard() {
    elSettingsCard.style.transform = '';
    elSettingsCard.classList.add('open');
    updateContentOffset();
}
function closeCard() {
    elSettingsCard.style.transform = '';
    elSettingsCard.classList.remove('open');
    updateContentOffset();
}

// ── Mobile drag-to-open/close on handle ──
let dragDidMove = false;
let dragState = null;

function getCurrentTranslateY() {
    return new DOMMatrix(getComputedStyle(elSettingsCard).transform).m42;
}

function getMaxTranslateY() {
    return elSettingsCard.offsetHeight - 48;
}

function onDragMove(e) {
    if (!dragState) return;
    e.preventDefault();
    const touchY = e.touches[0].clientY;
    const deltaY = touchY - dragState.startY;
    if (Math.abs(deltaY) > 5) dragState.moved = true;
    const maxY = getMaxTranslateY();
    const newY = Math.max(0, Math.min(maxY, dragState.startTranslateY + deltaY));
    elSettingsCard.style.transform = `translateY(${newY}px)`;
    const now = Date.now();
    const dt = now - dragState.lastTime;
    if (dt > 0) dragState.velocity = (touchY - dragState.lastY) / dt;
    dragState.lastY = touchY;
    dragState.lastTime = now;
}

function onDragEnd() {
    document.removeEventListener('touchmove', onDragMove);
    document.removeEventListener('touchend', onDragEnd);
    if (!dragState) return;
    const { moved, velocity } = dragState;
    dragState = null;
    elSettingsCard.classList.remove('dragging');
    if (!moved) return; // let click handler deal with taps
    dragDidMove = true;
    // Flick detection: fast swipe overrides position
    if (Math.abs(velocity) > 0.3) {
        if (velocity > 0) closeCard(); else openCard();
    } else {
        const currentY = getCurrentTranslateY();
        if (currentY > getMaxTranslateY() * 0.4) closeCard(); else openCard();
    }
}

elSettingsHandle.addEventListener('touchstart', (e) => {
    dragState = {
        startY: e.touches[0].clientY,
        startTranslateY: getCurrentTranslateY(),
        lastY: e.touches[0].clientY,
        lastTime: Date.now(),
        velocity: 0,
        moved: false,
    };
    elSettingsCard.classList.add('dragging');
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('touchend', onDragEnd);
}, { passive: true });

elSettingsHandle.addEventListener('click', () => {
    if (dragDidMove) { dragDidMove = false; return; }
    if (elSettingsCard.classList.contains('open')) closeCard();
    else openCard();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elSettingsCard.classList.contains('open')) {
        closeCard();
    }
});

// Keep offset in sync when card content resizes (e.g. symbol options expand)
new ResizeObserver(() => updateContentOffset()).observe(elSettingsCard);
updateContentOffset();

// ── Custom length arrow buttons ──
const elArrowDown = document.getElementById('length-arrow-down');
const elArrowUp   = document.getElementById('length-arrow-up');

function updateArrowStates() {
    const v = parseInt(elLengthNum.value, 10);
    elArrowDown.disabled = v <= 4;
    elArrowUp.disabled   = v >= 64;
}

function adjustLength(delta) {
    let v = parseInt(elLengthNum.value, 10);
    if (isNaN(v)) v = 16;
    v = Math.min(64, Math.max(4, v + delta));
    elLengthNum.value    = v;
    elLengthSlider.value = v;
    updateSliderTrack(elLengthSlider, '#7f5af0');
    syncMaxSymMax(v);
    generate();
    updateArrowStates();
}

// Long-press for rapid adjustment
let holdTimer, holdInterval;
function startHold(delta) {
    adjustLength(delta);
    holdTimer = setTimeout(() => {
        holdInterval = setInterval(() => adjustLength(delta), 80);
    }, 400);
}
function stopHold() { clearTimeout(holdTimer); clearInterval(holdInterval); }

elArrowDown.addEventListener('mousedown',  () => startHold(-1));
elArrowDown.addEventListener('touchstart', (e) => { e.preventDefault(); startHold(-1); });
elArrowUp.addEventListener('mousedown',    () => startHold(1));
elArrowUp.addEventListener('touchstart',   (e) => { e.preventDefault(); startHold(1); });
document.addEventListener('mouseup',  stopHold);
document.addEventListener('touchend', stopHold);

updateArrowStates();
generate();
