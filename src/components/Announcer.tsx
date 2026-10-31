import { useEffect, useState } from 'react';

import { useLocale } from '../content/locale-context';
import { settlementNote, settlementSource } from '../content/settlements';
import type { ShellContent } from '../content/types';
import { PERSONA_BY_SEAT } from '../domain/seats';
import type { GameEvent, GameView } from '../engine/types';

function announcementFor(view: GameView, content: ShellContent): string | null {
  const event: GameEvent | null = view.event;

  if (!event) {
    return null;
  }

  switch (event.type) {
    case 'pointsAwarded':
      return content.log.award(
        content.scoreboard.teams[event.settlement.team].name,
        event.settlement.points,
        settlementSource(event.settlement, content),
        settlementNote(event.settlement, content),
      );
    case 'handEnded':
      return content.log.handOver(
        content.scoreboard.teams[event.winnerTeam].name,
        event.points,
        false,
      );
    case 'matchEnded':
      return content.log.matchOver(content.scoreboard.teams[event.winnerTeam].name);
    case 'trickResolved': {
      const result = event.parda
        ? content.trick.parda
        : content.scoreboard.teams[event.winnerTeam ?? 'nosotros'].name;

      return content.trick.resultAria(event.baza, result);
    }
    case 'trucoCalled':
      return content.log.call(
        content.personas[PERSONA_BY_SEAT[event.seat]].name,
        content.truco.names[event.level],
      );
    case 'envidoCalled':
      return content.log.envidoCall(
        content.personas[PERSONA_BY_SEAT[event.seat]].name,
        content.envido.names[event.level],
      );
    case 'florCalled':
      return content.log.florCall(content.personas[PERSONA_BY_SEAT[event.seat]].name, event.kind);
    case 'priveCalled':
      return content.log.priveCall(content.personas[PERSONA_BY_SEAT[event.seat]].name);
    case 'folded':
      return event.seat === view.seat
        ? content.log.foldYou
        : content.log.fold(content.personas[PERSONA_BY_SEAT[event.seat]].name);
    case 'handDealt':
    case 'cardPlayed':
    case 'trucoResponded':
    case 'envidoResponded':
      return null;
    default: {
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

/**
 * A separate polite region for score and hand results. The log rail keeps its
 * own aria-live; this one covers the table-wide announcements a player needs
 * even when the log is closed on a phone.
 */
export function Announcer({ view }: { readonly view: GameView }) {
  const { content } = useLocale();
  const [message, setMessage] = useState('');

  useEffect(() => {
    const next = announcementFor(view, content);

    if (next !== null) {
      setMessage(next);
    }
  }, [content, view]);

  return (
    <div
      className="sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={content.a11y.announcerLabel}
    >
      {message}
    </div>
  );
}
