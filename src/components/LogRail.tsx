import { useLocale } from '../content/locale-context';
import { shortCardName, type ShellContent } from '../content/types';
import { SUITS } from '../domain/cards';
import { PERSONA_BY_SEAT, type Seat } from '../domain/seats';
import type { GameLogEntry, TrucoCallLevel } from '../engine/types';
import { SuitIcon } from './icons';

interface LogRailProps {
  readonly idPrefix: string;
  readonly entries: readonly GameLogEntry[];
}

function personaName(content: ShellContent, seat: Seat): string {
  return content.personas[PERSONA_BY_SEAT[seat]].name;
}

function entryText(entry: GameLogEntry, content: ShellContent): string {
  switch (entry.kind) {
    case 'deal':
      return content.log.deal(
        entry.handNumber,
        personaName(content, entry.dealer),
        personaName(content, entry.mano),
        shortCardName(entry.vira, content.cards),
      );
    case 'play':
      if (entry.burned || !entry.card) {
        return entry.seat === 0
          ? content.log.burnYou
          : content.log.burn(personaName(content, entry.seat));
      }

      return entry.seat === 0
        ? content.log.playYou(shortCardName(entry.card, content.cards))
        : content.log.play(
            personaName(content, entry.seat),
            shortCardName(entry.card, content.cards),
          );
    case 'trick':
      if (entry.parda || entry.winnerSeat === null) {
        return content.log.trickParda(entry.baza);
      }

      return entry.winnerSeat === 0
        ? content.log.trickWinYou(entry.baza)
        : content.log.trickWin(entry.baza, personaName(content, entry.winnerSeat));
    case 'points':
      return content.log.points(
        content.scoreboard.teams[entry.team].name,
        entry.points,
        content.summary.reasons[entry.reason],
      );
    case 'handOver':
      return content.log.handOver(content.scoreboard.teams[entry.winnerTeam].name, entry.points);
    case 'matchOver':
      return content.log.matchOver(content.scoreboard.teams[entry.winnerTeam].name);
    case 'turn':
      return content.log.turn(personaName(content, entry.seat), entry.baza);
    case 'call': {
      const call = content.truco.names[entry.level];

      return entry.seat === 0
        ? content.log.callYou(call)
        : content.log.call(personaName(content, entry.seat), call);
    }
    case 'respond': {
      const call = content.truco.names[entry.level];
      const response =
        entry.response === 'accept'
          ? content.truco.accept
          : entry.response === 'decline'
            ? content.truco.decline
            : content.truco.raise(content.truco.names[(entry.level + 1) as TrucoCallLevel]);

      return entry.seat === 0
        ? content.log.respondYou(response, call)
        : content.log.respond(personaName(content, entry.seat), response, call);
    }
    case 'fold':
      return entry.seat === 0
        ? content.log.foldYou
        : content.log.fold(personaName(content, entry.seat));
    default: {
      const exhaustive: never = entry;
      return exhaustive;
    }
  }
}

export function LogRail({ idPrefix, entries }: LogRailProps) {
  const { content } = useLocale();
  const log = content.log;
  const titleId = `${idPrefix}-title`;

  return (
    <div className="log">
      <header className="log__head">
        <div className="log__suits" aria-hidden="true">
          {SUITS.map((suit) => (
            <SuitIcon key={suit} suit={suit} className={`log__suit log__suit--${suit}`} />
          ))}
        </div>
        <p className="log__eyebrow">{log.subtitle}</p>
        <h2 className="log__title" id={titleId}>
          {log.title}
        </h2>
      </header>

      <ol
        className="log__entries"
        aria-label={log.label}
        aria-live="polite"
        aria-relevant="additions text"
      >
        {entries.map((entry) => (
          <li className={`log__entry log__entry--${entry.kind}`} key={entry.id}>
            <span className="log__kind">{log.kinds[entry.kind]}</span>
            <p className="log__text">{entryText(entry, content)}</p>
          </li>
        ))}
      </ol>

      <div className="log__seal" aria-hidden="true">
        {log.stamp}
      </div>

      <p className="log__footer">{log.footer}</p>
    </div>
  );
}
