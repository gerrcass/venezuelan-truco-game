import { useEffect, useMemo, useRef, useState } from 'react';

import { pickTaunt } from '../content/taunts';
import type { ShellContent } from '../content/types';
import type { Seat } from '../domain/seats';
import type { GameView } from '../engine/types';
import { deriveTableBeat, speechForEntry, tauntPersonaForSeat, type TableBeat } from './table-talk';

/** Roughly one persona bubble every two and a half seconds. */
export const TAUNT_INTERVAL_MS = 2500;

interface ActiveTalk {
  readonly beat: TableBeat;
  /** The line shown before this one, so a locale change keeps the same joke. */
  readonly previousLine: string | null;
}

export interface TalkLine {
  readonly seat: Seat;
  readonly quote: string;
}

/**
 * Event-driven table talk. A canto or answer replaces the bubble immediately;
 * a taunt waits its turn behind the rate limit and never repeats a line.
 *
 * New beats that arrive while the timer is pending update the line that will
 * be shown instead of cancelling the timer, so a fast table still gets talk
 * instead of starving it.
 */
export function useTableTalk(view: GameView, content: ShellContent): TalkLine | null {
  const [active, setActive] = useState<ActiveTalk | null>(null);
  const beatRef = useRef<TableBeat | null>(null);
  const timerRef = useRef<number | null>(null);
  const lastBeatId = useRef<number | null>(null);
  const lastShownAt = useRef(0);
  const lastLine = useRef<string | null>(null);
  const beat = useMemo(() => deriveTableBeat(view), [view]);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    beatRef.current = beat;

    if (!beat || beat.id === lastBeatId.current) {
      return;
    }

    if (beat.kind === 'speech') {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }

      setActive({ beat, previousLine: lastLine.current });
      lastBeatId.current = beat.id;
      lastShownAt.current = Date.now();
      return;
    }

    if (timerRef.current !== null) {
      return;
    }

    const elapsed = Date.now() - lastShownAt.current;
    const delay = Math.max(0, TAUNT_INTERVAL_MS - elapsed);

    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      const current = beatRef.current;

      if (!current) {
        return;
      }

      if (current.kind === 'speech') {
        setActive({ beat: current, previousLine: lastLine.current });
        lastBeatId.current = current.id;
        lastShownAt.current = Date.now();
        return;
      }

      const persona = tauntPersonaForSeat(current.seat);
      const line = pickTaunt(
        persona,
        current.event,
        current.seed,
        lastLine.current,
        content.taunts,
      );
      const previousLine = lastLine.current;
      lastLine.current = line;
      lastBeatId.current = current.id;
      lastShownAt.current = Date.now();
      setActive({ beat: current, previousLine });
    }, delay);
  }, [beat, content]);

  const quote = useMemo(() => {
    if (!active) {
      return null;
    }

    if (active.beat.kind === 'speech') {
      return speechForEntry(active.beat.entry, content);
    }

    return pickTaunt(
      tauntPersonaForSeat(active.beat.seat),
      active.beat.event,
      active.beat.seed,
      active.previousLine,
      content.taunts,
    );
  }, [active, content]);

  // A canto keeps its literal bubble without waiting for the effect/timer.
  if (beat?.kind === 'speech' && beat.id !== active?.beat.id) {
    return { seat: beat.seat, quote: speechForEntry(beat.entry, content) };
  }

  return active && quote !== null ? { seat: active.beat.seat, quote } : null;
}
