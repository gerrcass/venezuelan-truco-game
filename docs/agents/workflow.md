# How this feature is being implemented

The spec is issue #1. The tickets are issues #2–#8, connected by native blocking edges. Work the frontier: a ticket starts only when every blocker is closed.

## Ticket graph

```text
#2 Mesa servida
  └─ #3 Primera mano
       └─ #4 La cantina
            └─ #5 Envido, flor y prive
                 └─ #6 Panas y viveza
                      └─ #7 Sabor criollo
                           └─ #8 Fiesta y despliegue
```

## Implementer brief

- Work on the integration branch `feat/truco-e-piedra`. Never commit to `main`.
- Before starting, read the ticket, the spec issue, `docs/rules/TRUCO-VENEZOLANO.md`, `GLOSSARY.md` and the relevant ADRs.
- Build the ticket as a vertical slice: engine, UI, tests and docs together. A ticket is done when its acceptance criteria are demonstrable in the browser or the test output.
- Follow TDD for rules: red test, green implementation, refactor. Every scoring edge gets a test.
- Run `npm run check` before every commit. Commit in small, named steps.
- Update the ticket with a comment containing the evidence (commands, test output, screenshot path) before closing it.
- If a rule is ambiguous, the rules document wins. If the rules document is wrong, change it in the same commit and note why.
- Leave the tree clean: no debug logs, no unused files, no commented-out code.

## Evidence expectations

| Ticket | Evidence |
| --- | --- |
| #2 | screenshot of the table shell; `npm run check` output |
| #3 | seeded hand simulation test; screenshot of a played trick and summary |
| #4 | ladder tests; screenshot of a truco dialog and the 24-piedra score |
| #5 | formula tests; screenshot of envido/flor/prive in the summary |
| #6 | AI legality/determinism tests; screenshot of a seña and a taunt |
| #7 | language toggle and rules-modal tests; mobile and desktop screenshots |
| #8 | `npm run e2e` output and the CI E2E job; README screenshot (`assets/truco-mesa.png`, seed `seed-17`); 1440×900 and 360×800 final table evidence; live URL after Pages |

## Integration

- The integration PR uses the `pr` skill body and attaches evidence.
- Merge into `main` only after CI and the Playwright journey are green.
- Close the spec and tickets with links to the merge commit. Remove worktrees when done.
