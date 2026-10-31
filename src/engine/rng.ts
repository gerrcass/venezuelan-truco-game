/**
 * Seeded randomness. The engine never touches `Math.random` or the clock:
 * every shuffle is a pure function of the RNG state carried in `GameState`.
 */

/** A small, fast 32-bit generator with a stream of well-mixed values. */
export interface SeededRng {
  next(): number;
  /** The value to carry in state after the last draw. */
  readonly state: number;
}

/** Hash a string or number seed to a stable 32-bit value. */
export function hashSeed(seed: string | number): number {
  if (typeof seed === 'number' && Number.isFinite(seed)) {
    return Math.trunc(seed) >>> 0;
  }

  const text = String(seed);
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

/** Mulberry32: 32 bits of state, uniform floats in [0, 1). */
export function createRng(seed: number): SeededRng {
  let value = seed >>> 0;

  return {
    next() {
      value = (value + 0x6d2b79f5) | 0;
      let mixed = value;
      mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
      mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    },
    get state() {
      return value >>> 0;
    },
  };
}

/** Fisher–Yates over a copy, returning the new deck and the advanced RNG state. */
export function shuffle<T>(items: readonly T[], seed: number): { items: T[]; rngState: number } {
  const rng = createRng(seed);
  const deck = [...items];

  for (let index = deck.length - 1; index > 0; index -= 1) {
    const swapAt = Math.floor(rng.next() * (index + 1));
    const held = deck[index];
    deck[index] = deck[swapAt];
    deck[swapAt] = held;
  }

  return { items: deck, rngState: rng.state };
}
