const DEFAULT_SYMBOLS = '!@#$%^&*()-_=+[]{}|;:,.<>?';
// Authoritative length bounds — applied to the length input and slider at
// startup, so the HTML attributes are only a no-JS fallback.
const MIN_LENGTH = 4;
const MAX_LENGTH = 64;
const FALLBACK_LENGTH = 16;
const CHAR_SETS = {
    upper:   'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
    lower:   'abcdefghijklmnopqrstuvwxyz',
    numbers: '0123456789',
};
const HTML_ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
const escapeHtml = str => [...str].map(ch => HTML_ESC[ch] ?? ch).join('');

const elPassword      = document.getElementById('password');
const elCopyBtn       = document.getElementById('copy-btn');
const elStrengthBar   = document.getElementById('strength-bar');
const elTopPanel      = document.querySelector('.fullscreen-display');
const elModeSwitch    = document.querySelector('.mode-switch');

// Sparkle field — inserted as first child so z-index: -1 works within panel context
const elSparkleField = document.createElement('div');
elSparkleField.className = 'sparkle-field';
elSparkleField.style.opacity = '0';
elSparkleField.setAttribute('aria-hidden', 'true');
elTopPanel.insertBefore(elSparkleField, elTopPanel.firstChild);

// Electric sparks container — child of strength bar so they follow its width
const elElecSparks = document.createElement('div');
elElecSparks.className = 'strength-sparks';
elElecSparks.style.opacity = '0';
elElecSparks.setAttribute('aria-hidden', 'true');
elStrengthBar.appendChild(elElecSparks);

// ── Motion preference ──
// Every effect in this file is decoration, so honour the OS setting: skip
// building the elements entirely rather than just animating them to nowhere.
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion = () => motionQuery.matches;

const elLengthNum     = document.getElementById('length-num');
const elLengthSlider  = document.getElementById('length-slider');
const elSymOptions    = document.getElementById('symbol-options');
const elSymPctSlider  = document.getElementById('sym-pct-slider');
const elSymPctDisplay = document.getElementById('sym-pct-display');
const elSymPicker     = document.getElementById('symbol-picker');

const checkboxes = {
    upper:   document.getElementById('opt-upper'),
    lower:   document.getElementById('opt-lower'),
    numbers: document.getElementById('opt-numbers'),
    symbols: document.getElementById('opt-symbols'),
};

let currentOutput = '';
let mode = 'password';   // 'password' | 'username' — set via setMode()
let sparkleState    = null;   // null | 'green' | 'amazing' | 'warp-low' | 'warp-med' | 'warp-high'
let elecSparkState  = null;   // null | 'low' | 'med' | 'high'

// ── Length helpers ──
function clampLength(v) {
    return Math.min(MAX_LENGTH, Math.max(MIN_LENGTH, v));
}
// Single source of truth for the length used to generate + score.
// The raw field may hold an out-of-range value mid-typing; blur normalises it.
function getLength() {
    const v = parseInt(elLengthNum.value, 10);
    return isNaN(v) ? FALLBACK_LENGTH : clampLength(v);
}

// JS owns the bounds; the HTML attributes mirror them for the no-JS case
elLengthNum.min = elLengthSlider.min = MIN_LENGTH;
elLengthNum.max = elLengthSlider.max = MAX_LENGTH;

// ── Slider fill gradient ──
// Each slider declares its own --fill in CSS, so the colour lives there.
function updateSliderTrack(slider) {
    const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.background =
        `linear-gradient(to right, var(--fill) ${pct}%, var(--slider-track) ${pct}%)`;
}
updateSliderTrack(elLengthSlider);
updateSliderTrack(elSymPctSlider);

// ── Password rendering ──
function charClass(ch) {
    if (CHAR_SETS.upper.includes(ch))   return 'ch-upper';
    if (CHAR_SETS.lower.includes(ch))   return 'ch-lower';
    if (CHAR_SETS.numbers.includes(ch)) return 'ch-num';
    return 'ch-sym';
}
function renderPassword(pw) {
    currentOutput = pw;
    elPassword.innerHTML = [...pw]
        .map(ch => `<span class="${charClass(ch)}">${HTML_ESC[ch] ?? ch}</span>`)
        .join('');
}
function showError(msg) {
    currentOutput = '';
    elPassword.innerHTML = `<span class="pw-error">${msg}</span>`;
}

// ── Copy ──
let copyTimer = null;
function flashCopyState(label, cls) {
    elCopyBtn.textContent = label;
    elCopyBtn.classList.remove('copied', 'copy-failed');
    if (cls) elCopyBtn.classList.add(cls);
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
        elCopyBtn.textContent = 'Copy';
        elCopyBtn.classList.remove('copied', 'copy-failed');
    }, 2000);
}
function copyPassword() {
    if (!currentOutput) return;
    // Absent outside secure contexts (plain http://), and can reject if the
    // permission is denied — either way the user needs to be told.
    if (!navigator.clipboard?.writeText) {
        flashCopyState('Copy failed', 'copy-failed');
        return;
    }
    navigator.clipboard.writeText(currentOutput).then(() => {
        spawnCopySparks();
        flashCopyState('Copied!', 'copied');
    }).catch(() => flashCopyState('Copy failed', 'copy-failed'));
}
elPassword.addEventListener('click', copyPassword);
elCopyBtn.addEventListener('click',  copyPassword);

// ── Impact effect on generate ──
function triggerImpact() {
    if (reducedMotion()) return;
    elPassword.classList.remove('impact');
    void elPassword.offsetWidth;
    elPassword.classList.add('impact');
}

// ── Copy sparks (radiate from each character) ──
function spawnCopySparks() {
    if (reducedMotion()) return;
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
    btn.addEventListener('click', () => { btn.classList.toggle('off'); updateSymbolQuickButtons(); generate(); });
    elSymPicker.appendChild(btn);
}
const elSymAll  = document.getElementById('sym-all');
const elSymNone = document.getElementById('sym-none');

function updateSymbolQuickButtons() {
    const chips = elSymPicker.querySelectorAll('.sym-chip');
    const offCount = elSymPicker.querySelectorAll('.sym-chip.off').length;
    elSymAll.classList.toggle('active', offCount === 0);
    elSymNone.classList.toggle('active', offCount === chips.length);
}

elSymAll.addEventListener('click', () => {
    elSymPicker.querySelectorAll('.sym-chip').forEach(c => c.classList.remove('off'));
    updateSymbolQuickButtons();
    generate();
});
elSymNone.addEventListener('click', () => {
    elSymPicker.querySelectorAll('.sym-chip').forEach(c => c.classList.add('off'));
    updateSymbolQuickButtons();
    generate();
});
function getSelectedSymbols() {
    return [...elSymPicker.querySelectorAll('.sym-chip:not(.off)')]
        .map(c => c.dataset.sym).join('');
}

// ── Percent symbols ──
elSymPctSlider.addEventListener('input', () => {
    elSymPctDisplay.textContent = elSymPctSlider.value + '%';
    updateSliderTrack(elSymPctSlider);
    scheduleGenerate();
});

// ── Crypto RNG ──
// Rejection sampling — a plain `% max` skews toward low indices because 2^32
// is not a multiple of most charset sizes. Discard the uneven tail first.
function cryptoRandInt(max) {
    const limit = Math.floor(0x100000000 / max) * max;
    const a = new Uint32Array(1);
    do {
        crypto.getRandomValues(a);
    } while (a[0] >= limit);
    return a[0] % max;
}
function getEnabledKeys() {
    return Object.keys(checkboxes).filter(k => checkboxes[k].checked);
}

// ── Password generation ──
function generatePassword(length, enabledKeys) {
    const selectedSymbols = getSelectedSymbols();
    const symPct = checkboxes.symbols.checked
        ? parseInt(elSymPctSlider.value, 10) : 0;
    const targetSymCount = Math.round(length * symPct / 100);

    const sets = {};
    for (const k of enabledKeys)
        sets[k] = k === 'symbols' ? selectedSymbols : CHAR_SETS[k];

    const validKeys = enabledKeys.filter(k => sets[k] && sets[k].length > 0);
    if (validKeys.length === 0 || length < validKeys.length) return null;

    const chars = [];
    const nonSymKeys = validKeys.filter(k => k !== 'symbols');
    const hasSymbols = validKeys.includes('symbols');

    // At 100% symbols, fill entire password with symbols
    if (hasSymbols && symPct >= 100) {
        for (let i = 0; i < length; i++) {
            chars.push(sets.symbols[cryptoRandInt(sets.symbols.length)]);
        }
    } else {
        // Guarantee at least one character from each enabled non-symbol type
        for (const k of nonSymKeys) {
            chars.push(sets[k][cryptoRandInt(sets[k].length)]);
        }

        // Fill symbol slots to reach targetSymCount
        if (hasSymbols) {
            const symSlots = Math.min(targetSymCount, length - chars.length);
            for (let i = 0; i < symSlots; i++) {
                chars.push(sets.symbols[cryptoRandInt(sets.symbols.length)]);
            }
        }

        // Fill remaining slots from the non-symbol pool. With symbols as the
        // only enabled type there is nothing else to draw from, so the percent
        // target cannot apply — fall back to symbols rather than failing.
        const nonSymPool = nonSymKeys.map(k => sets[k]).join('');
        for (let i = chars.length; i < length; i++) {
            const pool = nonSymPool.length > 0 ? nonSymPool
                : (hasSymbols ? sets.symbols : '');
            if (!pool.length) return null;
            chars.push(pool[cryptoRandInt(pool.length)]);
        }
    }

    // Shuffle
    for (let i = chars.length - 1; i > 0; i--) {
        const j = cryptoRandInt(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    // Never allow symbol as first character
    if (hasSymbols && sets.symbols.includes(chars[0])) {
        const si = chars.findIndex(c => !sets.symbols.includes(c));
        if (si > 0) [chars[0], chars[si]] = [chars[si], chars[0]];
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

// Strength tiers, keyed on password length; `maxLen` is inclusive and the list
// must stay ordered. Each `cls` is styled in style.css — colours, glow and
// pulse all live there, including a --tint the panel glow is built from.
const STRENGTH_TIERS = [
    { maxLen: 5,        cls: 'tier-crimson' },
    { maxLen: 7,        cls: 'tier-red'     },
    { maxLen: 9,        cls: 'tier-orange'  },
    { maxLen: 11,       cls: 'tier-amber'   },
    { maxLen: 13,       cls: 'tier-lime'    },
    { maxLen: 15,       cls: 'tier-green'   },
    { maxLen: Infinity, cls: 'tier-vivid'   },
];
const TIER_CLASSES = STRENGTH_TIERS.map(t => t.cls);

// ── Sparkles (twinkle for score ≥ 44, warp-streaks for length ≥ 30) ──
function updateSparkles(score, len) {
    let newState;
    if      (reducedMotion()) newState = null;
    else if (len >= 56)   newState = 'warp-high';
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
        elStrengthBar.classList.remove(...TIER_CLASSES);
        elStrengthBar.style.width   = '0px';
        elStrengthBar.setAttribute('aria-valuenow', '0');
        elTopPanel.style.background = '';   // falls back to --panel-bg
        updateSparkles(null, 0);
        updateElecSparks(0);
        return;
    }

    const len   = getLength();
    // Width: 40 px (score 0) → 440 px (score 100)
    const width = Math.round(40 + score * 4.0);

    const tier = STRENGTH_TIERS.find(t => len <= t.maxLen);
    elStrengthBar.classList.remove(...TIER_CLASSES);
    elStrengthBar.classList.add(tier.cls);
    elStrengthBar.style.width = width + 'px';
    elStrengthBar.setAttribute('aria-valuenow', Math.round(score));

    const tintRgb = getComputedStyle(elStrengthBar).getPropertyValue('--tint').trim();

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
    bgParts.push('var(--panel-bg)');
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
    if      (reducedMotion()) newState = null;
    else if (len >= 56) newState = 'high';
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

// ── Username mode ──
// Real words from words.js / words-eff.js, joined per the chip options. The
// word lists are plain data; every draw still goes through cryptoRandInt.
const MIN_WORDS = 1;
const MAX_WORDS = 4;
const FALLBACK_WORDS = 2;

const elWordsNum  = document.getElementById('words-num');
const elRequired  = document.getElementById('required-words');
const elWordsDown = document.getElementById('words-arrow-down');
const elWordsUp   = document.getElementById('words-arrow-up');

// Filled from the .active chips at startup, so the HTML is the single source
// of truth for defaults. Keys: list, separator, casing, digits, placement.
const usernameOpts = {};

elWordsNum.min = MIN_WORDS;
elWordsNum.max = MAX_WORDS;

function getWordCount() {
    const v = parseInt(elWordsNum.value, 10);
    return isNaN(v) ? FALLBACK_WORDS : Math.min(MAX_WORDS, Math.max(MIN_WORDS, v));
}
function getRequiredWords() {
    return elRequired.value.split(',').map(w => w.trim()).filter(Boolean);
}

// Shortest entry per pool — reserves room for later slots when fitting words
// under the length cap.
const POOL_MIN = new Map([CURATED_ADJECTIVES, CURATED_NOUNS, EFF_WORDS]
    .map(pool => [pool, pool.reduce((m, w) => Math.min(m, w.length), Infinity)]));

// Curated names read as adjective(s) + noun, so the final random slot draws a
// noun. The dictionary list is one flat pool.
function wordPool(list, slot, slotCount) {
    if (list === 'eff') return EFF_WORDS;
    return slot === slotCount - 1 ? CURATED_NOUNS : CURATED_ADJECTIVES;
}

// Draw `count` distinct words whose combined length fits `budget`. Each slot
// picks uniformly from the words that still leave room for the shortest
// possible remainder, so a tight cap favours shorter words instead of failing.
function pickWords(list, count, budget) {
    const pools = Array.from({ length: count }, (_, i) => wordPool(list, i, count));
    const words = [];
    for (let i = 0; i < count; i++) {
        let reserve = 0;
        for (let j = i + 1; j < count; j++) reserve += POOL_MIN.get(pools[j]);
        const cap = budget - reserve;
        const fit = pools[i].filter(w => w.length <= cap && !words.includes(w));
        if (fit.length === 0) return null;
        const w = fit[cryptoRandInt(fit.length)];
        words.push(w);
        budget -= w.length;
    }
    return words;
}

// Returns display parts [{ type: 'word' | 'sep' | 'digits', text }], or null
// when the cap can't hold the required words plus separators and digits.
function generateUsername(maxLen) {
    const o = usernameOpts;
    const required = getRequiredWords();
    // Required words count toward the word total; extras still all appear.
    const total = Math.max(getWordCount(), required.length);
    const fixed = required.reduce((n, w) => n + w.length, 0)
                + o.separator.length * (total - 1) + o.digits;
    const budget = maxLen - fixed;
    if (budget < 0) return null;
    const random = pickWords(o.list, total - required.length, budget);
    if (!random) return null;

    let words;
    if      (o.placement === 'start') words = [...required, ...random];
    else if (o.placement === 'end')   words = [...random, ...required];
    else {
        words = [...random];
        for (const w of required) words.splice(cryptoRandInt(words.length + 1), 0, w);
    }

    // Casing only touches the first letter, so a required word keeps whatever
    // internal capitalisation the user typed.
    const cased = words.map((w, i) => {
        const upper = o.casing === 'capital' || (o.casing === 'camel' && i > 0);
        return (upper ? w[0].toUpperCase() : w[0].toLowerCase()) + w.slice(1);
    });

    const parts = [];
    cased.forEach((w, i) => {
        if (i > 0 && o.separator) parts.push({ type: 'sep', text: o.separator });
        parts.push({ type: 'word', text: w });
    });
    if (o.digits > 0) {
        let d = '';
        for (let i = 0; i < o.digits; i++) d += cryptoRandInt(10);
        parts.push({ type: 'digits', text: d });
    }
    return parts;
}

// Words alternate two accents so a no-separator join still reads as words.
function renderUsername(parts) {
    currentOutput = parts.map(p => p.text).join('');
    let wordIdx = 0;
    elPassword.innerHTML = parts.map(p => {
        let cls = 'ch-sym';
        if (p.type === 'word')   cls = wordIdx++ % 2 ? 'un-word-b' : 'un-word-a';
        if (p.type === 'digits') cls = 'ch-num';
        return `<span class="${cls}">${escapeHtml(p.text)}</span>`;
    }).join('');
}

// ── Generate ──
function generate() {
    const length = getLength();
    if (mode === 'username') {
        const parts = generateUsername(length);
        if (parts) renderUsername(parts);
        else showError('Max length too short for these options.');
        updateStrengthUI(null);   // a public handle gets no bar, glow or sparkles
        return;
    }
    // Symbols enabled with every symbol deselected contributes nothing, so
    // drop it and generate from whatever is left.
    const enabled = getEnabledKeys()
        .filter(k => k !== 'symbols' || getSelectedSymbols());

    if (enabled.length === 0) {
        showError('Select at least one character type.');
        updateStrengthUI(null); return;
    }
    const pw = generatePassword(length, enabled);
    if (!pw) {
        showError('Length too short for selected options.');
        updateStrengthUI(null); return;
    }
    renderPassword(pw);
    updateStrengthUI(computeStrengthScore(length, enabled));
}

// Dragging a slider can fire `input` faster than the browser paints, and each
// generate() rebuilds the password markup and may rebuild the sparkle field.
// Coalesce to at most one run per frame; the trailing call still lands, so the
// value the user releases on is always the one rendered.
let generateFrame = null;
function scheduleGenerate() {
    if (generateFrame !== null) return;
    generateFrame = requestAnimationFrame(() => {
        generateFrame = null;
        generate();
    });
}

// ── Length sync ──
elLengthSlider.addEventListener('input', () => {
    elLengthNum.value = elLengthSlider.value;
    updateSliderTrack(elLengthSlider);
    scheduleGenerate();
    updateArrowStates();
});
// Don't rewrite the field while typing — that fights the typist mid-entry.
// getLength() clamps whatever is in there; blur normalises the visible value.
elLengthNum.addEventListener('input', () => {
    if (elLengthNum.value.trim() === '') return;
    elLengthSlider.value = getLength();
    updateSliderTrack(elLengthSlider);
    scheduleGenerate();
    updateArrowStates();
});
elLengthNum.addEventListener('blur', () => {
    const v = getLength();
    elLengthNum.value    = v;
    elLengthSlider.value = v;
    updateSliderTrack(elLengthSlider);
    generate();
    updateArrowStates();
});

document.getElementById('generate-btn').addEventListener('click', () => {
    generate();
    if (currentOutput) triggerImpact();
});

// ── Settings card toggle ──
const elSettingsCard   = document.getElementById('settings-card');
const elSettingsHandle = document.getElementById('settings-handle');

// Overlay (scrim behind card)
const elOverlay = document.createElement('div');
elOverlay.className = 'settings-overlay';
elSettingsCard.parentNode.insertBefore(elOverlay, elSettingsCard);
elOverlay.addEventListener('click', () => closeCard());

const elPasswordContent = document.querySelector('.password-content');

function updateContentOffset() {
    const isOpen = elSettingsCard.classList.contains('open');
    if (!isOpen) {
        elTopPanel.style.setProperty('--card-offset', '-24px');
        elOverlay.classList.remove('visible');
        return;
    }

    const viewportH = window.innerHeight;
    const cardH = elSettingsCard.offsetHeight;
    const contentH = elPasswordContent.offsetHeight;
    const naturalTop = (viewportH - contentH) / 2;
    // Keep the content clear of the mode switcher pinned at the panel top
    const minPad = elModeSwitch.offsetTop + elModeSwitch.offsetHeight + 16;

    // Shift content up by half the card height, but never above viewport top
    const maxUpShift = Math.max(0, naturalTop - minPad);
    const offset = Math.max(-cardH / 2, -maxUpShift);

    elTopPanel.style.setProperty('--card-offset', `${offset}px`);

    // Show overlay only when card actually covers the password content
    const cardTop = viewportH - cardH;
    const contentBottom = naturalTop + contentH + offset;
    elOverlay.classList.toggle('visible', cardTop < contentBottom);
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
    const v = getLength();
    elArrowDown.disabled = v <= MIN_LENGTH;
    elArrowUp.disabled   = v >= MAX_LENGTH;
}

function adjustLength(delta) {
    const v = clampLength(getLength() + delta);
    elLengthNum.value    = v;
    elLengthSlider.value = v;
    updateSliderTrack(elLengthSlider);
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

// Rebuild (or tear down) the effects if the OS setting changes mid-session.
// The sentinel has to be a value the state machines never compute: null is the
// reduced-motion result, so using it here would satisfy their memo check and
// leave the existing elements in the DOM.
motionQuery.addEventListener('change', () => {
    sparkleState = elecSparkState = 'invalidated';
    generate();
});

// ── Username controls ──
function updateWordArrowStates() {
    const v = getWordCount();
    elWordsDown.disabled = v <= MIN_WORDS;
    elWordsUp.disabled   = v >= MAX_WORDS;
}
function adjustWords(delta) {
    elWordsNum.value = Math.min(MAX_WORDS, Math.max(MIN_WORDS, getWordCount() + delta));
    updateWordArrowStates();
    generate();
}
elWordsDown.addEventListener('click', () => adjustWords(-1));
elWordsUp.addEventListener('click',   () => adjustWords(1));
elWordsNum.addEventListener('input', () => { updateWordArrowStates(); scheduleGenerate(); });
elWordsNum.addEventListener('blur',  () => {
    elWordsNum.value = getWordCount();
    updateWordArrowStates();
    generate();
});
elRequired.addEventListener('input', scheduleGenerate);

// Radio-style chip groups: data-opt names the usernameOpts key, data-value
// the value. `digits` is numeric; everything else is a string.
function readChip(group, chip) {
    const opt = group.dataset.opt;
    usernameOpts[opt] = opt === 'digits' ? parseInt(chip.dataset.value, 10) : chip.dataset.value;
}
document.querySelectorAll('.chip-group[data-opt]').forEach(group => {
    const chips = group.querySelectorAll('.chip');
    readChip(group, group.querySelector('.chip.active'));
    chips.forEach(chip => chip.addEventListener('click', () => {
        chips.forEach(c => {
            const on = c === chip;
            c.classList.toggle('active', on);
            c.setAttribute('aria-checked', on);
        });
        readChip(group, chip);
        generate();
    }));
});

// ── Mode switcher ──
// body[data-mode] drives which controls and effects the CSS shows; the URL
// hash mirrors it so #username is linkable.
const elModeBtns    = document.querySelectorAll('.mode-btn');
const elLengthLabel = document.getElementById('length-label');
const modeFromHash  = () => location.hash === '#username' ? 'username' : 'password';

// Re-adding the class restarts the CSS flare/sheen keyframes.
function flashModeSwitch() {
    if (reducedMotion()) return;
    elModeSwitch.classList.remove('switched');
    void elModeSwitch.offsetWidth;
    elModeSwitch.classList.add('switched');
}

function setMode(next, { animate = true } = {}) {
    mode = next;
    if (animate) flashModeSwitch();
    document.body.dataset.mode = mode;
    elModeBtns.forEach(b => {
        const on = b.dataset.mode === mode;
        b.classList.toggle('active', on);
        b.setAttribute('aria-selected', on);
    });
    const isUser = mode === 'username';
    elLengthLabel.textContent = isUser ? 'Max length' : 'Length';
    document.title = isUser ? 'Username Generator' : 'Password Generator';
    const hash = isUser ? '#username' : '';
    if (location.hash !== hash) {
        history.replaceState(null, '', location.pathname + location.search + hash);
    }
    generate();
    updateContentOffset();   // strength bar comes and goes with the mode
}
elModeBtns.forEach(b => b.addEventListener('click', () => {
    if (b.dataset.mode !== mode) setMode(b.dataset.mode);
}));
window.addEventListener('hashchange', () => {
    if (modeFromHash() !== mode) setMode(modeFromHash());
});

updateArrowStates();
updateWordArrowStates();
updateSymbolQuickButtons();
setMode(modeFromHash(), { animate: false });
