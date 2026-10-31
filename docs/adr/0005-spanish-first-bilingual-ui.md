# Spanish-first bilingual interface

The game is Venezuelan, so the table speaks Venezuelan Spanish first: `piedras`, `vira`, `perico`, `flor`, `prive`, `pana`. An English mode is included because the people most likely to open a GitHub Pages link may not speak Spanish, and a game that cannot explain its own rules is not finished. All UI strings, taunts, rules sections and accessible labels live in a typed dictionary with `es` and `en` variants; no string is hard-coded in a component. Spanish terms that have no clean English equivalent stay in Spanish with a short gloss in English.

**Consequences:** adding a string means adding both languages or TypeScript fails. The rules modal must stay in sync in both languages. The default language is Spanish; the choice persists locally.
