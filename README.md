# Password Generator

A visual client-side password generator with real-time strength feedback, animated effects, and customization. Build with Claude. Personal project to learn Git.

## Features

- Configurable character types (uppercase, lowercase, numbers, symbols)
- Granular symbol picker with per-character selection
- Entropy-based strength indicator with animated color bar and glow effects
- Sparkle and warp-streak animations that intensify with strength/length
- Copy to clipboard
- Responsive mobile-first design with draggable settings sheet
- Cryptographically secure generation via `crypto.getRandomValues()`

## Tech Stack

Vanilla HTML/CSS/JS — no frameworks or dependencies.

## Run Locally

```bash
python -m http.server 3000
```

Then open `http://localhost:3000`.

## Project Structure

```
index.html   – Markup
app.js       – Generation logic, strength calc, animations, mobile UX
style.css    – Layout, glass-morphism, strength bar, sparkle effects
```
