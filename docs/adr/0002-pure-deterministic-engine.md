# Pure deterministic engine with a seat-scoped view

The rules engine is a pure reducer over an explicit state machine, driven by a seeded PRNG. Every card, call, turn and payout is a function of the state and the action. This makes the weird edge cases — vira flipping a rey into perico, flor cancelling envido, prive at 23, a parda that decides the reparto — cheap to test and replay. It also makes the bots honest: the AI consumes `viewFor(seat)`, which contains that seat's hand plus public table information, never the other hands.

**Alternatives rejected:** a mutable class (harder to snapshot/replay, easy to leak hidden state), a server-authoritative engine (adds hosting and latency for a local game), and testing only through the UI (slow and brittle).

**Consequences:** the engine is the primary test seam. UI and AI are projections of the same state.
