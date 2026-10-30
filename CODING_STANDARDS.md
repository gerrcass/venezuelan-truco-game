# Coding standards

These are review rules, not a style essay. The reviewer enforces them; the implementer runs the automated checks.

## Language and types

- TypeScript `strict`; no `any`, no non-null assertions in domain code, no `@ts-ignore` without a written reason.
- Domain values use unions and branded IDs, not loose `string`/`number` where a `Suit`, `Seat`, `Team` or `CardId` is meant.
- Exhaustive switches over unions; the `never` check is mandatory.
- `Readonly` state and readonly arrays at module boundaries. The reducer returns new objects; it never mutates its input.

## Engine

- Pure functions only. No `Date.now()`, `Math.random()`, DOM, storage or network inside the engine. Randomness comes from the seeded RNG carried in state.
- Illegal actions are rejected without partially mutating state. `getLegalActions` is the single source of truth for UI and AI.
- Hidden information crosses only through `viewFor(seat)`. A component must never receive another seat's hand.
- Scoring lives in named, testable functions (`scoreEnvido`, `scoreFlor`, `cardPower`), not inline arithmetic in the reducer.
- Every scoring edge case in `docs/rules/TRUCO-VENEZOLANO.md` has a test that names the rule.

## React and styling

- Function components and hooks. No class components.
- Server state does not exist; local UI state stays local. The game reducer lives in one provider.
- Components receive view models, not the whole engine state, except the provider itself.
- CSS custom properties for palette, spacing, radius, shadows and timing. No hard-coded hex values in components.
- Class names are semantic (`seat`, `card--perico`, `call-dialog`), not visual (`green-box`).
- Animation is short and interruptible; every animation has a reduced-motion fallback.

## Accessibility

- Interactive elements are real buttons or links with accessible names.
- The action log is an `aria-live="polite"` region; score changes are announced.
- Focus is trapped in modals, returns to the trigger, and is visible at all times.
- Color is never the only signal: team, suit and card state also carry text or shape.
- The game is fully playable with the keyboard: 1–3 play cards, `Q`/`W`/`E` focus the call bar? (final shortcuts documented in the rules modal).

## Content

- Every string, taunt, rules section and accessible label lives in the typed ES/EN dictionary. A missing translation is a type error.
- Venezuelan Spanish is the default. Keep the humor affectionate, never punching down; no profanity.
- Card and rule names use the glossary. Do not invent synonyms in the UI.

## Tests

- Test external behaviour: a hand, a call, a score, a rendered action. Do not assert private helper calls.
- Engine tests are table-driven where the rule is a table.
- Reducer tests play whole hands from a seed and assert the final scores and phase.
- AI tests assert legality and information use, not a specific card choice.
- One Playwright journey covers deal → call → play → hand summary → next hand → rules → language toggle.
- A bug fix gets a failing test first.

## Git and PRs

- Small commits with `type(scope): summary`.
- The PR body follows the `pr` skill: Summary, Evidence, Merge Danger. Evidence includes a screenshot or test output.
- No commented-out code, no debug logs, no `console.log` in shipped code.
- Generated artifacts (`dist/`, Playwright reports, test screenshots) are not committed.
