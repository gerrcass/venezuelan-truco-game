# Domain docs

This repo is **single-context**: one domain, one vocabulary, one set of decisions.

## Layout

- `GLOSSARY.md` at the root: the canonical language of the mesa. Use its terms in code, tests, commits and UI copy.
- `docs/adr/`: accepted architectural and product decisions. Read the relevant ADR before changing the engine, rules, language model, AI fairness or deployment.
- `docs/rules/TRUCO-VENEZOLANO.md`: the authoritative ruleset and the house rulings. The engine must match it.
- `docs/grilling/`: the design-tree record that produced the objective and the decisions.

## Consumer rules

- Read `GLOSSARY.md` before naming a domain concept. If a new concept appears, add it to the glossary in the same change.
- Read the rules document before touching scoring, card power, turn order or calls.
- If a change contradicts an ADR, do not silently work around it: add a new ADR that supersedes the old one.
- The rules document and the engine are a pair. A rule change needs tests and, when player-visible, a rules-modal update in both languages.
