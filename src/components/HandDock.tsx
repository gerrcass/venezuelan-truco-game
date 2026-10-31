import { useLocale } from '../content/locale-context';
import { describeCard } from '../content/types';
import { cardKey } from '../domain/cards';
import { pieceOf } from '../engine/cards';
import type { GameView } from '../engine/types';
import { PlayingCard } from './PlayingCard';

interface HandDockProps {
  readonly view: GameView;
  readonly burnArmed: boolean;
  readonly onToggleBurn: () => void;
  readonly onPlay: (cardKey: string) => void;
}

export function HandDock({ view, burnArmed, onToggleBurn, onPlay }: HandDockProps) {
  const { content } = useLocale();
  const playable = new Set(view.legal.playableCardKeys);
  const canPlay = view.phase === 'playing' && view.turn === view.seat && view.pending === null;
  const hint = burnArmed
    ? content.hand.burnHint
    : view.pending !== null
      ? content.hand.pending
      : canPlay
        ? content.hand.hint
        : view.phase === 'playing'
          ? content.hand.waiting
          : content.hand.closed;

  return (
    <section className="hand" aria-labelledby="hand-title">
      <div className="hand__heading">
        <h2 className="hand__title" id="hand-title">
          {content.hand.title}
        </h2>
        <span className="hand__count">{content.hand.count(view.hand.length)}</span>
        <button
          type="button"
          className={`hand__burn${burnArmed ? ' hand__burn--armed' : ''}`}
          aria-pressed={burnArmed}
          aria-label={content.hand.burnAria}
          disabled={!canPlay}
          onClick={onToggleBurn}
        >
          <span className="hand__burn-mark" aria-hidden="true" />
          {burnArmed ? content.hand.burnArmed : content.hand.burn}
        </button>
      </div>

      {view.hand.length > 0 ? (
        <ul className="hand__cards" aria-label={content.hand.aria}>
          {view.hand.map((card, index) => {
            const key = cardKey(card);
            const isPlayable = playable.has(key);
            const piece = pieceOf(card, view.vira);
            const cardName = `${describeCard(card, content.cards)}${
              piece ? `, ${content.cards.piece[piece]}` : ''
            }`;

            return (
              <li className="hand__slot" key={key}>
                <span className="hand__key" aria-hidden="true">
                  {index + 1}
                </span>
                <button
                  type="button"
                  className="hand__card-button"
                  aria-label={content.hand.playCard(cardName)}
                  disabled={!isPlayable}
                  onClick={() => onPlay(key)}
                >
                  <PlayingCard card={card} piece={piece ?? undefined} size="hand" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="hand__empty">{content.hand.empty}</p>
      )}

      <p className="hand__hint">{hint}</p>
    </section>
  );
}
