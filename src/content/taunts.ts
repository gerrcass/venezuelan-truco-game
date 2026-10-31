import type { PersonaKey } from '../domain/seats';
import { hashSeed } from '../engine/rng';

/** The beats that can earn a line of table talk. */
export type TauntEvent =
  | 'deal'
  | 'turn'
  | 'call'
  | 'accept'
  | 'decline'
  | 'flor'
  | 'prive'
  | 'trickWin'
  | 'trickLose'
  | 'handWin'
  | 'handLose'
  | 'matchWin'
  | 'matchLose'
  | 'burn';

/** Only the three people who sit at the table talk; the human speaks for themselves. */
export type TauntPersona = Exclude<PersonaKey, 'you'>;

export type TauntBank = Record<TauntPersona, Record<TauntEvent, readonly string[]>>;

/**
 * Pick a line from a persona's bank without repeating the last one. The choice
 * is a pure function of the persona, the beat and the event seed, so a replay
 * of the same partida tells the same jokes.
 */
export function pickTaunt(
  persona: TauntPersona,
  event: TauntEvent,
  seed: number,
  lastLine: string | null,
  bank: TauntBank,
): string {
  const lines = bank[persona][event];

  if (lines.length === 0) {
    throw new Error(`No taunts for ${persona}/${event}.`);
  }

  const pool =
    lastLine !== null && lines.length > 1 ? lines.filter((line) => line !== lastLine) : lines;
  const index = hashSeed(`${persona}:${event}:${seed}`) % pool.length;
  const line = pool[index];

  if (line === undefined) {
    throw new Error(`No taunts for ${persona}/${event}.`);
  }

  return line;
}
