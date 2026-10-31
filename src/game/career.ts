import type { GameView } from '../engine/types';

const STORAGE_KEY = 'truco.stats';
const MAX_COUNT = 999_999;

export interface CareerStats {
  readonly matches: number;
  readonly wins: number;
  readonly losses: number;
  readonly hands: number;
  readonly envidos: number;
  readonly flores: number;
}

export const EMPTY_CAREER: CareerStats = {
  matches: 0,
  wins: 0,
  losses: 0,
  hands: 0,
  envidos: 0,
  flores: 0,
};

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.min(MAX_COUNT, Math.floor(value))
    : 0;
}

/** Read the career from this browser. Bad or missing data is simply zero. */
export function readCareerStats(): CareerStats {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return EMPTY_CAREER;
    }

    const parsed: unknown = JSON.parse(raw);

    if (typeof parsed !== 'object' || parsed === null) {
      return EMPTY_CAREER;
    }

    const record = parsed as Record<string, unknown>;

    return {
      matches: count(record.matches),
      wins: count(record.wins),
      losses: count(record.losses),
      hands: count(record.hands),
      envidos: count(record.envidos),
      flores: count(record.flores),
    };
  } catch {
    return EMPTY_CAREER;
  }
}

export function saveCareerStats(stats: CareerStats): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // A private window may refuse storage; the current table still works.
  }
}

export function clearCareerStats(): CareerStats {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to clear when storage is unavailable.
  }

  return EMPTY_CAREER;
}

/**
 * Add one finished partida to the career. Hand wins, envidos and flores are
 * counted from the match log, which survives across the whole partida.
 */
export function recordMatchInCareer(view: GameView, current: CareerStats): CareerStats {
  if (view.phase !== 'matchOver' || view.matchWinner === null) {
    return current;
  }

  const handOvers = view.log.filter((entry) => entry.kind === 'handOver');
  const points = view.log.filter((entry) => entry.kind === 'points');
  const winner = view.matchWinner;

  const next: CareerStats = {
    matches: current.matches + 1,
    wins: current.wins + (winner === 'nosotros' ? 1 : 0),
    losses: current.losses + (winner === 'ellos' ? 1 : 0),
    hands: current.hands + handOvers.filter((entry) => entry.winnerTeam === 'nosotros').length,
    envidos:
      current.envidos +
      points.filter(
        (entry) => entry.settlement.kind === 'envido' && entry.settlement.team === 'nosotros',
      ).length,
    flores:
      current.flores +
      points.filter(
        (entry) => entry.settlement.kind === 'flor' && entry.settlement.team === 'nosotros',
      ).length,
  };

  saveCareerStats(next);

  return next;
}
