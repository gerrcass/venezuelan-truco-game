# Fair bots with personas

Three bots fill the table. El Pana is the human's partner; La Comadre and El Catire are the rivals. None of them may read the human's hand or each other's hands: every decision is made from `viewFor(seat)`, the same information boundary the UI uses. Difficulty and personality come from hand-strength thresholds, risk appetite and table talk, not from hidden information. El Pana also produces the one seña per reparto, which is an explicit, rule-bound hint rather than a cheat.

**Alternatives rejected:** bots that see all hands (make bluffs meaningless and feel unfair), a single generic opponent (loses the partnership fantasy), and a full search/Monte Carlo AI (overkill for a casual game and much harder to keep deterministic and fast).

**Consequences:** the AI is testable from a public view, and every bot action is reproducible from the seed and the visible state.
