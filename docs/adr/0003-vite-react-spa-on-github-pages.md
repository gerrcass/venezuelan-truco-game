# Vite + React SPA on GitHub Pages

The game is entirely client-side: no accounts, no persistence server, no multiplayer transport. A Vite + React + TypeScript single-page app builds to static files, runs fast on a phone, and deploys to GitHub Pages from a workflow on `main`. Relative asset paths keep the build portable. TypeScript gives the rules model and the bilingual content dictionary a single source of truth.

**Alternatives rejected:** Next.js (server rendering buys nothing for a game with no routes or data fetching), a canvas/game-engine stack (the UI is card-and-button shaped, not sprite shaped), and a backend (would add operational risk and no gameplay value).

**Consequences:** deployment is one workflow, the site is free to host, and the whole game can be exercised by Playwright against the production build.
