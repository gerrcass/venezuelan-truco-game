# AGENTS.md

Truco e' Piedra is a single-player, 2v2 Venezuelan Truco game at 24 piedras. It runs entirely in the browser and deploys to GitHub Pages.

## Read first

- `GLOSSARY.md` — the mesa's vocabulary. Use these terms in code, tests, commits and copy.
- `docs/rules/TRUCO-VENEZOLANO.md` — the rules authority. Engine changes must match it.
- `docs/adr/` — decisions already made. Do not reopen one without a superseding ADR.
- `docs/agents/issue-tracker.md` — GitHub issues, labels and blocking edges.
- `docs/agents/domain.md` — domain-doc layout and consumer rules.
- `docs/agents/workflow.md` — the ticket graph and the evidence expected for each ticket.
- `docs/grilling/2026-10-30-truco.md` — the objective and the design tree behind it.

## Shape of the codebase

- **Engine** — pure TypeScript: cards, scoring, reducer, legal actions, seat-scoped views. No React, no DOM, no ambient randomness.
- **AI** — consumes only a seat's view and a seeded RNG. It must never read another seat's hand.
- **App** — React components, hooks, audio, storage, and the ES/EN content dictionary.
- **E2E** — Playwright against the production build.

The engine is the primary test seam. Prefer testing a rule through `createGame` / `reduce` / `viewFor` over testing a component.

## Non-negotiables

- Every player-visible string exists in **both** Spanish and English in the typed content dictionary.
- The game is playable to 24 piedras without a dead end, refresh, or developer console.
- Bots only see `viewFor(seat)`. No hidden-hand peeking.
- Any new rule or scoring path gets a unit test and a reducer test.
- The table works at 360 px wide and with keyboard only.
- `npm run check` is green before every commit; CI runs the same command.
- Respect `prefers-reduced-motion`; sound is optional and remembered.

## Git and review

- Work on an integration branch, never directly on `main`.
- Commit messages: `type(scope): summary` (for example `feat(engine): resolve parda on the third baza`).
- One PR per integration effort. Use the `pr` skill for the body and attach evidence.
- Do not leave open issues or PRs without a reason. Close tickets when their acceptance criteria are demonstrably met.

## Commands

The source of truth is `package.json`. The short version:

- `npm run dev` — local table.
- `npm run check` — typecheck, lint, unit tests, production build.
- `npm run e2e` — Playwright journey against the production build.
- `npm run format` — write Prettier formatting.
