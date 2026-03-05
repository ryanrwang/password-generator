# Password Generator

Client-side password generator with entropy-based strength scoring, visual effects (sparkles, warp streaks, electric sparks), and a mobile-first pull-up settings card. No framework, no build step — static files served as-is.

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
index.html      – single-page UI
app.js          – all logic (generation, strength calc, UI, animations)
style.css       – all styles including responsive breakpoints + animations
.github/workflows/deploy.yml – FTP deploy to Bluehost
.claude/launch.json          – dev server config for Claude preview
```

## Rules / Constraints
- **No build step exists.** Do not introduce bundlers, transpilers, or package.json. All code must run directly in the browser.
- **Always use `crypto.getRandomValues()`** for randomness — never `Math.random()`. This is a security tool.
- **Password length range is 4–64.** These bounds are enforced in HTML attributes and JS logic — keep them in sync.
- **FTP deploy secrets** (`FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`) are in GitHub repo settings. The deploy uploads `./` to `/apps/passgen/` on the server.
- **Mobile breakpoints:** 480px (grid reflow) and 768px (toggle switches hidden, cards act as tappable toggles). Preserve this behavior.
- **Do not modify** `.claude/settings.local.json`.

## Environment
- `gh` CLI is installed at `/c/Program Files/GitHub CLI/gh.exe` — use this full path since it's not on the bash PATH.

## Repo Hygiene

### On session start
- Run `git status`, `git stash list`, and `git branch -a` to check for uncommitted changes, lingering stashes, stale branches, or divergence from remote.
- Flag any issues to the user before starting work.

### After push or PR
- Run `git status`, `git stash list`, `git branch -a`, and `git fetch --prune` to verify clean state.
- Flag any stale branches, uncommitted changes, or divergence.
- Ask the user what they'd like to work on next.
