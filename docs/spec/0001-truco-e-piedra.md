## Problem Statement

Venezuelan Truco is a beloved table game, but the web versions a player finds today are usually ad-heavy, built around the Argentine ruleset, or quietly drop the things that make the Venezuelan game distinctive: the **vira** turning a court card into the **perico** or **perica**, **flor** cancelling **envido**, **flor reservada**, the **prive** at 23, **quemar**, and a partner sending **señas**. A player who wants a quick, beautiful, free game that actually teaches the Venezuelan rules has nowhere obvious to go.

The problem is not "make a card game". It is "make the mesa feel real": the vocabulary, the timing of the cantos, the jokes, the little rituals, and a rules engine that does not hand-wave the weird parts.

## Solution

**Truco e' Piedra** is a free, single-player, browser-based 2v2 Venezuelan Truco game played to **24 piedras**. The player sits with **El Pana** against **La Comadre** and **El Catire** at a warm Caracas kitchen table. The game implements the full researched ruleset — vira/perico/perica hierarchy, envido ladder, flor and flor reservada, truco/retruco/vale nueve/vale juego, parda resolution, prive, quemar, irse al mazo and partner señas — with a deterministic engine, fair bots, a bilingual ES/EN interface, a rules school, synthesized sound, and a live GitHub Pages deployment.

It is a complete product, not a prototype: a stranger can open the link, learn the game, play a full partida, and get a rematch without reading a developer README.

## User Stories

1. As a curious player, I want to open a public link and start a game without installing anything, so that the table is one click away.
2. As a player, I want the goal ("first to 24 piedras") visible at all times, so that I always know what I am playing for.
3. As a new player, I want a short welcome that explains the three-card hand and the two-of-three-bazas goal, so that I can make my first move with confidence.
4. As a new player, I want a rules school that covers the vira, perico/perica, envido, flor, truco, prive, quemar and señas, so that I can learn without leaving the table.
5. As a Spanish speaker, I want the table to speak Venezuelan Spanish by default, so that the game feels like the mesa I grew up with.
6. As an English speaker, I want a complete English mode, so that I can play and learn the game without a translator.
7. As a player, I want to see the **vira** and which cards are the **perico** and **perica**, so that I understand why a court card suddenly beats an ace.
8. As a player, I want each card to show its rank and palo clearly, so that I can read the table at a glance.
9. As a player, I want the current trick, the cards already played, and who won each baza, so that I can follow the hand.
10. As a player, I want to play a card by clicking it or pressing 1–3, so that the table is fast on desktop and mobile.
11. As a player, I want the game to prevent illegal moves instead of punishing me, so that I never lose a hand to a UI mistake.
12. As a player, I want to see whose turn it is and when a bot is thinking, so that the table never feels frozen.
13. As a player, I want my partner and both rivals to have names, faces and personalities, so that the game feels like a table of people.
14. As a player, I want the scoreboard to show both teams' piedras, the current stake, the vira, and the hand number, so that I can read the state of the partida.
15. As a player, I want to call **envido** before the first card, so that I can bet on my best two-card tanto.
16. As a player, I want to raise envido through **Quiero y envido**, **Quiero y 5 piedras más** and **Envido la falta**, so that the betting ladder is real.
17. As a player, I want to accept, decline or raise an envido called by a rival, so that I can use my cards and my nerve.
18. As a player, I want to see the envido tantos at resolution and understand who won and why, so that I learn the formula.
19. As a player, I want to declare **flor** before my first card and see it cancel the envido, so that the Venezuelan rule is respected.
20. As a player, I want **flor reservada** (perico + perica) to score 5 automatically, so that the rarest hand feels special.
21. As a player, I want both flors compared when both teams have one, so that the flor is never a free point for the wrong team.
22. As a player, I want to call **truco**, **retruco**, **vale nueve** and **vale juego** on my turn, so that the mind games escalate.
23. As a player, I want to accept, decline or raise a truco, so that I can fold a bad hand or punish a bluff.
24. As a player, I want to **irme al mazo** when the hand is lost, so that I can concede without pretending.
25. As a player, I want **parda** ties resolved by the first baza winner or the mano, so that the rule is predictable.
26. As a player, I want to **quemar** a card (play it face down), so that I can hide information and bluff.
27. As a player, I want to call **prive** when a team is one piedra from winning, so that the 23–24 moment has its own drama.
28. As a player, I want El Pana to send me one **seña** per hand, so that the partnership feels alive and I get a fair hint.
29. As a player, I want the seña to use the real gesture vocabulary (wink, tongue, cheeks), so that I learn the table language.
30. As a player, I want the bots to play legally and believably, so that the game is fair and not a random-card simulator.
31. As a player, I want the bots to have different risk appetites, so that El Catire's reckless truco feels different from La Comadre's patient one.
32. As a player, I want short, affectionate Venezuelan table talk from the bots, so that the mesa has humor without becoming a meme dump.
33. As a player, I want a hand summary that shows each point source (flor, envido, truco, prive), so that I can audit the score.
34. As a player, I want to start the next hand with one button, so that the rhythm of the mesa is preserved.
35. As a player, I want a match-end screen with the final score, the winner, and a rematch button, so that the partida has a real ending.
36. As a player, I want to change language and sound at any time, so that the table fits my context.
37. As a player, I want my language, sound and bot-speed choices remembered, so that I do not reconfigure every visit.
38. As a player, I want the game to work on a 360 px phone, so that I can play on the bus.
39. As a player using a keyboard, I want every action reachable without a mouse, so that the game is inclusive.
40. As a screen-reader user, I want buttons with meaningful names, a live action log and announced score changes, so that I can follow the table.
41. As a player with motion sensitivity, I want reduced-motion support, so that the game is comfortable.
42. As a player, I want the table to feel alive with card sounds and stone clinks, but I want to mute it, so that I can play quietly.
43. As a player, I want to see the rules sources and the house rulings in the rules school, so that I trust the implementation.
44. As a player, I want the game to explain an unfamiliar canto in context, so that I do not have to memorize the rules before playing.
45. As a player, I want a clear "no quiero" outcome and a clear "son buenas" moment, so that declining a bet is not confusing.
46. As a player, I want the game to never show me another player's hand during play, so that the bluff is real.
47. As a player, I want the table to recover cleanly from every ending (fold, decline, parda, flor, match), so that I never hit a dead end.
48. As a player, I want to start a fresh partida from the match-end screen, so that I can keep playing without a refresh.
49. As a returning player, I want a deterministic seed option for demos and screenshots, so that a good table can be reproduced.
50. As a maintainer, I want the rules engine covered by table-driven tests and whole-hand simulations, so that a future change cannot silently break the scoring.
51. As a maintainer, I want a Playwright journey against the production build, so that the deployed game is proven to work end to end.
52. As a maintainer, I want CI to run typecheck, lint, unit tests, build and E2E, so that `main` is always shippable.
53. As a maintainer, I want a representative screenshot and the live link in the README, so that the repo shows what it is.
54. As a maintainer, I want every ticket closed with evidence and no orphaned PRs, so that the project history is clean.
55. As a player, I want the app to load fast and work offline after the first visit, so that a flaky connection does not end the mesa. (Best-effort; no service worker required in v1.)

## Implementation Decisions

### Product and rules

- **Format**: 2v2, fixed partnerships, 24 piedras, single partida with rematch. Seats: human south (0), El Catire east (1), El Pana north (2), La Comadre west (3). Teams: 0+2 ("Nosotros") and 1+3 ("Ellos"). Play is counterclockwise in seat order 0→1→2→3.
- **Rules authority**: `docs/rules/TRUCO-VENEZOLANO.md`, synthesized from Wikipedia's *Truco venezolano*, Ludoteka's rules and El Truco Venezolano's vocabulary. Every ambiguity is resolved there and in ADR-0004.
- **Implemented lances**: vira/perico/perica (including the court-card promotion when the vira is a 10 or 11), full card hierarchy, envido and its four-step ladder, flor and flor reservada, flor cancels envido, both-flor comparison (automatic, no flor-envido subgame), truco/retruco/vale nueve/vale juego, parda, prive at 23, quemar, irse al mazo, señas, son buenas flavor.
- **Flavor only**: `a ley`, `barajo`, `¿llevas?`, `ven a mí`, `quédate`. They can appear as table talk but never change the score.
- **Scoring order**: flor (settled when the first baza closes or the hand ends) → prive (immediate) → envido (hand end) → check 24 → truco stake or 1 → check 24. Flor and prive can end the partida on their own.
- **Match end**: first team to 24. No win-by-two. Rematch resets scores but keeps personas and settings.

### Engine

- Pure TypeScript reducer over an explicit state machine. Phases: `playing`, `handOver`, `matchOver`. Within `playing`, the state carries the trick index, accepted stakes, pending calls and per-hand flags.
- Seeded PRNG carried in state (`mulberry32` or equivalent). Shuffle, bot tie-breaks and any AI randomness consume it. No `Math.random`/`Date.now` inside the engine.
- A single `getLegalActions(state, seat)` drives both the UI and the AI. Illegal actions are no-ops; the UI never offers them.
- `viewFor(state, seat)` is the only information boundary. It returns the seat's hand, public table state, its own envido/flor value, and (for the human) El Pana's seña. Opponent hands are counts, never cards, until the hand summary reveal.
- Calls are modeled as pending team decisions with a responding team, not a responding seat. This lets either partner answer and keeps the UI simple. After a response, the turn returns to the caller.
- **Truco**: accepted levels 3/6/9/match; decline pays 1/3/6/9. Only the team that accepted the previous level may raise it. `vale juego` accepted means the reparto decides the partida.
- **Envido**: accepted stakes 2/4/7/falta; decline pays 1/2/4/7. Comparison at hand end; the best tanto of the partnership counts; ties go to the mano's team.
- **Flor**: declared before the holder's first card; cancels envido; points settle when the first baza closes or the hand ends; both declarations compared; reservada beats every numeric flor and is automatic.
- **Prive**: available at 23 when no envido/flor has been called; compares tantos for 1 piedra; ties to mano; replaces envido for that reparto.
- **Parda**: first team to win a baza wins an unresolved finish; all-parda goes to mano's team; the player who led a tied baza leads the next.
- **Quemar**: a burned card has rank below every face-up card and ties only another burned card; it is hidden from opponents and still counts as the played card.
- **Seña**: computed at deal from El Pana's hand, one per reparto, using the real gesture vocabulary; visible only in the human's view.
- **Log**: structured events (deal, play, call, response, points, trick, hand over, match over), not pre-localized strings, so the UI can render them in either language.

### AI

- Three personas with hand-strength thresholds, risk appetite and taunt banks: El Pana (supportive, steady), La Comadre (patient, needling), El Catire (reckless, loud).
- AI consumes `viewFor(seat)` plus `getLegalActions`. It never reads another hand. Determinism comes from the game seed plus a per-seat decision counter.
- AI policy: score its own envido/flor; call envido above a persona threshold; always declare flor; call/accept/raise truco from a hand-strength estimate and pot odds; play the lowest winning card, duck when the partner is winning, lead high with a strong hand, burn a low card occasionally to hide information; call prive with a strong tanto at 23.
- Table talk is event-driven, one bubble at a time, rate-limited, persona-specific, ES/EN, no profanity, no repeated line back-to-back.

### App and experience

- Vite + React + TypeScript SPA, no router, no backend, no analytics. Relative asset paths; builds for GitHub Pages.
- A single game provider owns the reducer state and schedules bot actions with a configurable delay. UI components receive view models, not the full state.
- Custom SVG Spanish deck (40 faces + back), custom SVG avatars and icons. No stock card art, no external image dependencies.
- Visual direction: warm Caracas kitchen-table night; deep teal felt, cream paper, marigold/terracotta accents, wood rim, papelera texture. Display type: Fraunces (self-hosted via Fontsource); body: DM Sans. No external font CDN.
- Layout: top bar (brand, rules, sound, language), scoreboard (24 stone pips per team, stake, vira, hand number), four-seat table with center trick, human hand and action bar, log rail on desktop / drawer on mobile. Hand-summary and match-end overlays.
- Dynamic action bar: play (and burn toggle), envido ladder, flor, prive, truco ladder, fold. A response dialog shows the call and the legal accepts/declines/raises. Calls that are unavailable are absent, not disabled.
- Hand summary: winner, each point source, both teams' final tantos, all four hands revealed, and the next-hand button. Match end: winner, final score, match stats (hands won, envidos, flores, trucos), rematch and rules buttons.
- Rules school: tabbed modal (La mesa, La vira, Envido, Flor, Truco, Prive y quemar, Señas, Fuentes) with concise ES/EN content and card examples. First-visit welcome overlay with a three-step explanation; skippable and remembered.
- Content: one typed `LocaleContent` dictionary with `es` and `en`; every visible string, taunt, rules section, aria-label and card name comes from it. A missing key is a type error.
- Audio: synthesized WebAudio cues (deal, card slap, stone, call, win, lose), lazy AudioContext, starts after first gesture, mute toggle persisted.
- Motion: 160–320 ms deal/play/sweep/tally animations, reduced-motion fallback. No layout-shifting animation.
- Persistence: `localStorage` for language, sound, bot speed, tutorial-seen and career stats (partidas won/lost, hands won, envidos won). No personal data, no match resume in v1.
- Accessibility: real buttons, focus-visible rings, focus trap in modals, `aria-live` log and score announcements, keyboard shortcuts (1–3 cards, Enter confirm, Esc close), 360 px responsive, color-independent suit/state cues.
- URL options for demos and tests: `seed`, `lang`, `fast` (short bot delay), `skipIntro`. They do not expose hidden information.
- Metadata: Spanish-first title/description, theme color, favicon derived from the icon, Open Graph/Twitter tags and a generated social image from the representative screenshot.

### Delivery

- One integration branch and one PR using the `pr` skill; spec issue + tracer-bullet tickets with native blocking edges. The PR closes the spec and the tickets.
- GitHub Actions: `ci.yml` runs typecheck, lint, unit tests, production build and Playwright on PRs and `main`; `pages.yml` builds and deploys `main` to GitHub Pages.
- Definition of done: CI green, Playwright journey green, Pages live, README with live link + screenshot + rules summary, every issue closed with evidence, no orphan PRs.

## Testing Decisions

A good test asserts **external behaviour**: a hand's tanto, a card's power, the points paid after a call, the phase after a fold, the action a player is offered, the text a player sees. It does not assert private helper calls, internal field names or CSS classes.

- **Primary seam**: the engine public API (`createGame`, `reduce`, `getLegalActions`, `viewFor`, `scoreEnvido`, `scoreFlor`, `cardPower`). This is the highest seam and the only one the rules need.
- **Cards**: deck composition (40 unique, no 8/9), hierarchy, tie groups, perico/perica promotion for every vira rank, card naming.
- **Envido**: both-cards-same-palo, three-same-palo (best two), figures worth zero, perico/perica bonuses, max 37, team best-of-two, ties to mano.
- **Flor**: three of a palo, piece + two of a palo, flor reservada, values, both-flor comparison, cancellation of envido, declaration window.
- **Reducer**: whole-hand simulations from fixed seeds; every phase transition (deal → call → response → play → trick → hand over → next hand → match over); all four lances accepted/declined/raised/folded; parda in every position; quemar; prive at 23; scoring order; no dead ends.
- **Legal actions**: no play out of turn, no card twice, no envido after the first card, no truco raise by the wrong team, no response by the wrong team, no next hand before hand over.
- **AI**: every chosen action is legal; the AI never mutates state; two runs with the same seed and view produce the same action; bots do not receive hidden hands (type-level and a runtime assertion in tests).
- **Components**: the table renders the human hand and hides rival cards; clicking a card dispatches; the call bar offers only legal calls; the response dialog accepts/declines; the rules modal opens/closes and traps focus; language toggle swaps every visible label; the hand summary lists each point source.
- **E2E (Playwright)**: open the app with a fixed seed and `skipIntro`, play a card, call envido, respond to a bot, reach a hand summary, start the next hand, open the rules, switch to English, and assert no console errors. Take the README screenshot from this run or a dedicated fixed-seed demo run.
- **Prior art**: there is no existing test suite; this establishes the pattern. Engine tests live beside the engine, component tests beside the components, and the E2E journey in `e2e/`.

## Out of Scope

- Online multiplayer, accounts, matchmaking, chat, leaderboards.
- A backend, database, analytics, ads, monetization.
- Resume an in-progress partida after refresh (settings and career stats persist; the match does not).
- 1v1 truco, 12-piedra matches, best-of-two partidas, tournament mode.
- The optional flor-envido betting subgame; both flors are compared automatically.
- Simulated misdeals or the `barajo` penalty; `a ley` as a mechanical bluff.
- Native mobile apps, desktop wrappers, gamepad support.
- Additional languages beyond Spanish and English.
- Custom deck editors, user-uploaded art, user accounts, cloud saves.
- Recorded voice acting or licensed music; audio is synthesized.

## Further Notes

- The rules sources and the house rulings must be visible in the rules school, not buried in the repo. The player should be able to see why flor reservada is 5 and why prive exists.
- The tone is affectionate costeño humor: "pana", "ladilla", "nojoda" (mild), "chévere", "burda", "más perdido que guagua en autopista". No slurs, no politics, no punching down, no profanity.
- The representative screenshot should show a live mid-hand table with the vira, perico/perica treatment, a call bubble, the scoreboard and the human's hand — not the welcome modal.
- The live URL is expected to be `https://gerrcass.github.io/venezuelan-truco-game/`. The README must link it and show the screenshot.
- Performance budget: first meaningful paint under 2 s on a fast connection, no layout shift after the hand mounts, 60 fps for card/tally transitions on a mid-range phone.
- Browser support: current Chrome, Firefox and Safari; no IE.
- License: MIT for the code and the original art. Card games themselves are not copyrightable; the SVG deck is original work.
