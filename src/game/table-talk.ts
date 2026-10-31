import type { ShellContent } from '../content/types';
import type { TauntEvent, TauntPersona } from '../content/taunts';
import { PERSONA_BY_SEAT, TEAM_BY_SEAT, type Seat, type Team } from '../domain/seats';
import { hashSeed } from '../engine/rng';
import type { CallLogEntry, GameView, RespondLogEntry, TrucoCallLevel } from '../engine/types';

const BOT_SEATS = [1, 2, 3] as const;
export type BotSeat = (typeof BOT_SEATS)[number];

/** A bot waiting to say something. The line itself is chosen by `pickTaunt`. */
export interface TauntBeat {
  readonly kind: 'taunt';
  readonly id: number;
  readonly seat: BotSeat;
  readonly event: TauntEvent;
  readonly seed: number;
}

/** A canto or answer that keeps its immediate, literal bubble. */
export interface SpeechBeat {
  readonly kind: 'speech';
  readonly id: number;
  readonly seat: Seat;
  readonly entry: CallLogEntry | RespondLogEntry;
}

export type TableBeat = SpeechBeat | TauntBeat;

function pickBotSeat(seed: number): BotSeat {
  return BOT_SEATS[seed % BOT_SEATS.length] ?? 1;
}

function beatSeed(view: GameView, id: number): number {
  return hashSeed(`${view.seed}:${view.handNumber}:${id}`);
}

function tauntBeat(view: GameView, id: number, seat: BotSeat, event: TauntEvent): TauntBeat {
  return { kind: 'taunt', id, seat, event, seed: beatSeed(view, id) };
}

function teamEvent(
  view: GameView,
  id: number,
  winnerTeam: Team,
  winEvent: TauntEvent,
  loseEvent: TauntEvent,
): TauntBeat {
  const seat = pickBotSeat(beatSeed(view, id));
  const event = TEAM_BY_SEAT[seat] === winnerTeam ? winEvent : loseEvent;

  return tauntBeat(view, id, seat, event);
}

/** The literal bubble for a canto or an answer, in the current language. */
export function speechForEntry(
  entry: CallLogEntry | RespondLogEntry,
  content: ShellContent,
): string {
  if (entry.kind === 'call') {
    if (entry.call === 'truco') {
      return content.truco.speech.call(content.truco.names[entry.level]);
    }

    if (entry.call === 'envido') {
      return content.envido.speech.call(content.envido.names[entry.level]);
    }

    if (entry.call === 'flor') {
      return content.flor.speech.call(entry.flor);
    }

    return content.prive.speech.call;
  }

  if (entry.call === 'envido') {
    if (entry.response === 'accept') {
      return content.envido.speech.accept;
    }

    if (entry.response === 'decline') {
      return content.envido.speech.decline;
    }

    return content.envido.speech.raise(content.envido.raises[(entry.level + 1) as 2 | 3 | 4]);
  }

  if (entry.response === 'accept') {
    return content.truco.speech.accept;
  }

  if (entry.response === 'decline') {
    return content.truco.speech.decline;
  }

  const raised = content.truco.names[(entry.level + 1) as TrucoCallLevel];

  return content.truco.speech.raise(raised);
}

/**
 * Find the newest beat worth a bubble in the current reparto. Calls and
 * answers speak immediately; deals, tricks, hand endings, burns and the start
 * of the human's turn are handled by the persona taunt bank.
 *
 * Walking backwards skips `turn` and `points` so a trick still gets its line
 * after the engine logs the next lead or the flor payout.
 */
export function deriveTableBeat(view: GameView): TableBeat | null {
  let start = 0;

  for (let index = 0; index < view.log.length; index += 1) {
    if (view.log[index]?.kind === 'deal') {
      start = index;
    }
  }

  for (let index = view.log.length - 1; index >= start; index -= 1) {
    const entry = view.log[index];

    if (!entry) {
      continue;
    }

    if (entry.kind === 'matchOver') {
      return teamEvent(view, entry.id, entry.winnerTeam, 'matchWin', 'matchLose');
    }

    if (entry.kind === 'handOver') {
      return teamEvent(view, entry.id, entry.winnerTeam, 'handWin', 'handLose');
    }

    if (entry.kind === 'trick') {
      const winnerTeam = entry.winnerTeam ?? TEAM_BY_SEAT[view.mano];

      return teamEvent(view, entry.id, winnerTeam, 'trickWin', 'trickLose');
    }

    if (entry.kind === 'call' || entry.kind === 'respond') {
      return { kind: 'speech', id: entry.id, seat: entry.seat, entry };
    }

    if (entry.kind === 'play') {
      if (entry.burned) {
        const seat = entry.seat === 0 ? pickBotSeat(beatSeed(view, entry.id)) : entry.seat;

        return tauntBeat(view, entry.id, seat, 'burn');
      }

      if (view.phase === 'playing' && view.turn === 0 && entry.seat !== 0) {
        return tauntBeat(view, entry.id, entry.seat, 'turn');
      }

      continue;
    }

    if (entry.kind === 'deal') {
      return tauntBeat(view, entry.id, pickBotSeat(beatSeed(view, entry.id)), 'deal');
    }

    // Points and plain turn markers are not their own beat.
  }

  return null;
}

/** The persona that owns a taunt seat. */
export function tauntPersonaForSeat(seat: BotSeat): TauntPersona {
  return PERSONA_BY_SEAT[seat] as TauntPersona;
}
