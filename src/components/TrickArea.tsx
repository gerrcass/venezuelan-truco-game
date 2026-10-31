import { useLocale } from '../content/locale-context';
import type { Card } from '../domain/cards';
import { PERSONA_BY_SEAT, SEAT_POSITION, SEATS } from '../domain/seats';
import { pieceOf } from '../engine/cards';
import type { GameView } from '../engine/types';
import { PlayingCard } from './PlayingCard';

interface TrickAreaProps {
  readonly view: GameView;
}

const BURNED_PLACEHOLDER: Card = { rank: 1, suit: 'oro' };

export function TrickArea({ view }: TrickAreaProps) {
  const { content } = useLocale();
  const showingLast = view.currentTrick.length === 0 && view.lastTrick !== null;
  const shownTrick = showingLast ? view.lastTrick : null;
  const plays = shownTrick?.plays ?? view.currentTrick;
  const winnerName =
    shownTrick && shownTrick.winnerSeat !== null
      ? content.personas[PERSONA_BY_SEAT[shownTrick.winnerSeat]].name
      : null;
  const verdict = shownTrick
    ? shownTrick.parda || !winnerName
      ? content.trick.parda
      : content.trick.won(winnerName)
    : content.trick.label(view.trickIndex);
  const label = shownTrick
    ? content.trick.resultAria(shownTrick.baza, verdict)
    : content.trick.aria(view.trickIndex);

  return (
    <div className={`trick${showingLast ? ' trick--settled' : ''}`} role="group" aria-label={label}>
      {SEATS.map((seat) => {
        const played = plays.find((entry) => entry.seat === seat);
        const person = content.personas[PERSONA_BY_SEAT[seat]];
        const position = SEAT_POSITION[seat];
        const isTurn = view.phase === 'playing' && view.turn === seat;

        return (
          <div
            key={seat}
            className={`trick__slot trick__slot--${position}${isTurn ? ' trick__slot--turn' : ''}`}
          >
            <span className="trick__owner">
              {isTurn && <span className="trick__owner-dot" aria-hidden="true" />}
              {person.name}
            </span>
            {played ? (
              played.burned || !played.card ? (
                <div className="trick__burned">
                  <PlayingCard card={BURNED_PLACEHOLDER} size="trick" burned />
                  <span className="trick__burned-label">{content.cards.faceDown}</span>
                </div>
              ) : (
                <PlayingCard
                  card={played.card}
                  size="trick"
                  piece={pieceOf(played.card, view.vira) ?? undefined}
                />
              )
            ) : (
              <div className="trick__empty">
                <span className="trick__empty-diamond" aria-hidden="true" />
                <span>{content.trick.empty}</span>
              </div>
            )}
          </div>
        );
      })}

      <div className="trick__center" aria-hidden="true">
        <span className="trick__center-ring" />
        <span className={`trick__center-label${shownTrick ? ' trick__center-label--verdict' : ''}`}>
          {verdict}
        </span>
      </div>
    </div>
  );
}
