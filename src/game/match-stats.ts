import type { Team } from '../domain/seats';
import type { GameLogEntry, SettlementKind } from '../engine/types';

/** The partida in numbers: what each pair won across every reparto. */
export interface MatchStats {
  readonly hands: Record<Team, number>;
  readonly envidos: Record<Team, number>;
  readonly flores: Record<Team, number>;
  readonly trucos: Record<Team, number>;
}

const COUNTED_SETTLEMENTS: ReadonlySet<SettlementKind> = new Set(['envido', 'flor', 'truco']);

const EMPTY: Record<Team, number> = { nosotros: 0, ellos: 0 };

function countKind(stats: MatchStats, kind: SettlementKind, team: Team): MatchStats {
  switch (kind) {
    case 'envido':
      return { ...stats, envidos: { ...stats.envidos, [team]: stats.envidos[team] + 1 } };
    case 'flor':
      return { ...stats, flores: { ...stats.flores, [team]: stats.flores[team] + 1 } };
    case 'truco':
      return { ...stats, trucos: { ...stats.trucos, [team]: stats.trucos[team] + 1 } };
    case 'prive':
      return stats;
    default: {
      const exhaustive: never = kind;
      return exhaustive;
    }
  }
}

/**
 * Read the partida's public log: each closed reparto counts as a hand for its
 * winner, and each paid envido, flor or truco counts for the team that took it.
 * The log survives every reparto, so the match-end summary can be audited.
 */
export function matchStatsFromLog(log: readonly GameLogEntry[]): MatchStats {
  let stats: MatchStats = {
    hands: EMPTY,
    envidos: EMPTY,
    flores: EMPTY,
    trucos: EMPTY,
  };

  for (const entry of log) {
    if (entry.kind === 'handOver') {
      stats = {
        ...stats,
        hands: { ...stats.hands, [entry.winnerTeam]: stats.hands[entry.winnerTeam] + 1 },
      };
      continue;
    }

    if (entry.kind === 'points' && COUNTED_SETTLEMENTS.has(entry.settlement.kind)) {
      stats = countKind(stats, entry.settlement.kind, entry.settlement.team);
    }
  }

  return stats;
}
