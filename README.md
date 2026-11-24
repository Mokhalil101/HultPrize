# Startup Tycoon

> Build Your Startup. Solve Real Problems. Change the World.

A student-built, single-player startup simulation inspired by the Hult Prize mission. It runs entirely in the browser: no backend, no database, no accounts, no external APIs. This project is **not** an official Hult Prize product, and scores are not official competition results.

## Play locally

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

(The offline service worker only activates over `http(s)`, not `file://`.)

## Run the tests

Requires Node 18+ (no dependencies to install):

```bash
npm test
```

The suite (23 tests) covers content counts, Arabic coverage, the decision / financial / hiring / MVP / investor / scoring engines, save validation and corruption handling, export/import with checksum, bankruptcy, and 120 bot playthroughs checking for NaN values and dead ends.

## Deploy to GitHub Pages

1. Push this folder to a repo and set **Settings → Pages → Source: GitHub Actions**.
2. Push to `main`. `.github/workflows/deploy.yml` runs the tests and publishes the site.

All asset paths are relative, so it works under `/<repo-name>/` or a custom domain with no config change. Navigation is state-based, so refreshing never causes a 404.

## Project structure

```
index.html            page shell
css/style.css         Hult-inspired theme (Heritage Pink, Midnight, Ink, Sky, Sun, Aloe)
js/data.js            all game content: challenges, models, roles, decisions, events, investors, achievements
js/engine.js          decision, financial, impact, event, investor, scoring and progression logic (no DOM)
js/save.js            the only module that touches localStorage; validation, migrations, export/import
js/i18n.js            translation helpers + short UI labels
js/ar-*.js            full Arabic translation: scenarios (ar-decisions-1/2, notes in ar-decisions-3), events (ar-events, ar-events-2), game tables (ar-data), UI messages (ar-msg-1/2)
icons/                PNG app icons for installing the game as a PWA
js/ui.js              screens and interaction only
sw.js, manifest.webmanifest, favicon.svg   PWA / offline
tests/engine.test.js  engine unit + integration tests
tests/arabic.test.js  checks every decision, event, table and UI string has an Arabic translation with matching placeholders
```

## Gameplay at a glance

- Difficulty: Easy 150k, Normal 100k, Hard 85k starting capital with rising event frequency and severity.
- 12 in-game months across 7 chapters; each chapter has a milestone gate (decision, hire, MVP launch, investor pitch).
- 5 social challenges, 6 business models, 8 hireable roles, 4 investors, 15 achievements, 4 endings, 3 difficulties.
- Profit and cash are tracked separately (B2B customers pay late).
- Social Impact Score and number of people served are separate metrics.
- Final score out of 1000 with the ranks from the SRS.
- Investor pitch has a 3-minute countdown; running over costs points.
- Fully bilingual (English / Arabic, right-to-left layout). Switch in Settings at any time; saved games keep working in either language.

## Content status

Currently **40 decision scenarios** and **45 random events** (30 general + 15 challenge-specific, 3 per social challenge), exceeding the SRS full-release targets. Some choices depend on context (e.g. reputation, quality, customers, team size) and give weaker results if you are not ready. To add more, append entries to `DECISIONS` / `EVENTS` in `js/data.js`; the engine and tests pick them up automatically.

## Notes on the SRS

The SRS recommends React, Vite, Tailwind, Zustand, Framer Motion and Recharts. This build uses plain JavaScript, CSS and inline SVG with no build step, keeping the same architecture rules (engine separate from UI, data separate from logic, storage only through the persistence service). Fonts fall back to system fonts unless Figtree is installed, because the game may not depend on external services.

## Adding content or translations

New decisions/events go in `js/data.js` (English). Add the matching Arabic entry (same `id`, same number of options) to `js/ar-decisions-*.js` or `js/ar-events.js`. New UI sentences are written as `_("English text", args)` in `js/ui.js` / `js/engine.js` and need a key in `js/ar-msg-*.js`. `npm test` fails if any translation is missing or has mismatched placeholders.
