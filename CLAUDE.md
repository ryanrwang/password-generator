# Password Generator

Client-side password generator with entropy-based strength scoring, visual effects (sparkles, warp streaks, electric sparks), and a mobile-first pull-up settings card. A second mode generates real-word usernames (adjective + noun or EFF dictionary words) with separator, casing, digit and required-word controls. No framework, no build step — static files served as-is.

## Tech Stack
- Vanilla HTML / CSS / JavaScript (no framework, no bundler)
- Google Fonts: Arvo (password display), Noto Sans (UI)
- `crypto.getRandomValues()` for cryptographically secure RNG
- GitHub Actions → FTP deploy to Bluehost

## Key Commands
- **Dev server:** `python -m http.server 3000` (or use Claude preview via `.claude/launch.json`)
- **Deploy:** Automatic on push to `main` via `.github/workflows/deploy.yml`
- **No build/test/lint steps** — files are production-ready as written

## Folder Structure
```
index.html      – single-page UI (both modes; username controls are in #username-options)
app.js          – all logic (generation, strength calc, UI, animations, mode switch)
style.css       – all styles including responsive breakpoints + animations
words.js        – curated adjective/noun lists for username mode (CURATED_ADJECTIVES, CURATED_NOUNS)
words-eff.js    – EFF large wordlist as EFF_WORDS (CC BY 3.0, generated — don't hand-edit)
.github/workflows/deploy.yml – FTP deploy to Bluehost
.claude/launch.json          – dev server config for Claude preview
```

## Rules / Constraints
- **No build step exists.** Do not introduce bundlers, transpilers, or package.json. All code must run directly in the browser.
- **Always use `crypto.getRandomValues()`** for randomness — never `Math.random()`. This is a security tool.
- **Password length range is 4–64.** `MIN_LENGTH` / `MAX_LENGTH` in `app.js` are authoritative and are applied to the input and slider at startup; the matching HTML attributes are only a no-JS fallback. Read the length via `getLength()`, which clamps — never `parseInt` the field directly.
- **Colours live in CSS custom properties** on `:root` in `style.css` (`--accent-*`, `--card-*`, `--panel-bg`, …). Don't hardcode hex values in `app.js` — if JS needs a colour, read it back with `getComputedStyle`, or emit `var(--token)` into the style string. Gradient stops local to one effect (strength tiers, spark palettes) may stay literal.
- **Strength bar appearance is CSS.** `STRENGTH_TIERS` in `app.js` maps a length to a `.tier-*` class; every colour, glow and pulse lives in `style.css`, including a `--tint` that JS reads back to build the panel glow. JS sets only the class and the width. To retune the ramp, edit the CSS.
- **FTP deploy secrets** (`FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`) are in GitHub repo settings. The deploy uploads `./` to `/apps/passgen/` on the server, minus the `exclude` list in the workflow — specifying `exclude` replaces the action's defaults, so `.git*`/`node_modules`/`.DS_Store` must stay listed alongside `.claude/` and `CLAUDE.md`.
- **Modes.** `body[data-mode]` is `password` or `username`; `setMode()` in `app.js` is the only entry point (it runs the page-shift animation around `applyMode()`, which does the DOM swap) and mirrors it to the `#username` URL hash. CSS keys every per-mode show/hide off that attribute — don't toggle visibility from JS. Username mode hides the strength bar and effects (`updateStrengthUI(null)`) and relabels the shared length card as a maximum.
- **Username chips.** Radio-style `.chip-group[data-opt]` buttons; the `.active` chip in the HTML is the default JS reads at startup, so change defaults in `index.html`, not `app.js`. `data-value` for `digits` is numeric; everything else is a string (the separator is the literal join string).
- **Word lists.** Curated entries must be lowercase letters only, 3–8 chars, no duplicates — they are joined without a separator by default. Words are drawn with `cryptoRandInt()` like everything else. `words-eff.js` is generated from the EFF list with hyphenated entries removed; regenerate rather than edit.
- **Mobile breakpoints:** 480px (grid reflow) and 768px (toggle switches hidden, cards act as tappable toggles). Preserve this behavior.
- **Do not modify** `.claude/settings.local.json`.

