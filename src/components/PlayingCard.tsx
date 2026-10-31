import type { ReactNode } from 'react';

import { useLocale } from '../content/locale-context';
import { describeCard } from '../content/types';
import { isCourtRank, type Card, type CourtRank, type Piece } from '../domain/cards';
import { SuitIcon } from './icons';

export type CardSize = 'hand' | 'trick' | 'vira' | 'mini' | 'welcome';

interface PlayingCardProps {
  readonly card: Card;
  readonly size?: CardSize;
  readonly piece?: Piece;
  readonly faceDown?: boolean;
  readonly burned?: boolean;
  readonly className?: string;
}

interface CardBackProps {
  readonly size?: CardSize;
  readonly className?: string;
}

function Corner({ card, corner }: { card: Card; corner: 'tl' | 'br' }) {
  return (
    <span className={`card__corner card__corner--${corner}`} aria-hidden="true">
      <span className="card__rank">{card.rank}</span>
      <SuitIcon className="card__corner-suit" suit={card.suit} />
    </span>
  );
}

function NumeralArt({ card }: { card: Card }) {
  return (
    <div
      className={`card__numeral${card.rank === 1 ? ' card__numeral--ace' : ''}`}
      aria-hidden="true"
    >
      <span className="card__numeral-ghost">{card.rank}</span>
      <span className="card__numeral-diamond" />
      <SuitIcon className="card__pip" suit={card.suit} />
    </div>
  );
}

function CourtFrame({ children }: { children: ReactNode }) {
  return (
    <svg className="card__court-svg" viewBox="0 0 64 84" aria-hidden="true" focusable="false">
      <path className="court__wash" d="M5 82V29C5 15 15.5 6 32 6s27 9 27 23v53H5Z" />
      <path className="court__frame" d="M5 82V29C5 15 15.5 6 32 6s27 9 27 23v53H5Z" />
      <path className="court__frame-inner" d="M9 78V30c0-11 9-19 23-19s23 8 23 19v48H9Z" />
      {children}
    </svg>
  );
}

function KnaveArt() {
  return (
    <>
      <path className="court__robe" d="M10 82c1.2-9 8.7-14 22-14s20.8 5 22 14H10Z" />
      <path
        className="court__robe-shadow"
        d="M16 82c1-7 4.5-11 10-12.5L22 82h-6ZM48 82c-1-7-4.5-11-10-12.5L42 82h6Z"
      />
      <path
        className="court__cream"
        d="M23.5 70.5c2.6 3.4 5.4 5.1 8.5 5.1s5.9-1.7 8.5-5.1l-3.4-2.2L32 72l-5.1-3.7-3.4 2.2Z"
      />
      <path className="court__skin-shade" d="M28.5 59.5h7v8.9c0 2.9-7 2.9-7 0v-8.9Z" />
      <ellipse className="court__skin" cx="32" cy="46" rx="8.7" ry="9.9" />
      <ellipse className="court__skin-shade" cx="23.5" cy="47.5" rx="1.6" ry="2.1" />
      <ellipse className="court__skin-shade" cx="40.5" cy="47.5" rx="1.6" ry="2.1" />
      <path
        className="court__hair"
        d="M23 45.5c-.8-6 3.2-10.6 9-10.6s9.8 4.6 9 10.6c-1.2-3.2-3.2-5.2-6-5.9-1.9 1.1-4.1 1.1-6 0-2.8.7-4.8 2.7-6 5.9Z"
      />
      <path
        className="court__cap"
        d="M22.4 39.6c0-5.2 4-9.2 9.6-9.2s9.6 4 9.6 9.2c-2.9-2.1-6.1-3.2-9.6-3.2s-6.7 1.1-9.6 3.2Z"
      />
      <path
        className="court__cap-shadow"
        d="M22.6 39.6c3.4 1.8 15.6 1.8 18.8 0-1.5 2.5-5.2 3.6-9.4 3.6s-7.9-1.1-9.4-3.6Z"
      />
      <path
        className="court__feather"
        d="M39.8 35.2c3.8-7.9 8.9-10.9 13.4-9.5-1.3 4.3-4.8 8.3-9.9 10.1l-3.5-.6Z"
      />
      <path className="court__feather-line" d="M41.8 34.5c3.4-4.7 6.9-7.3 10.7-8.2" />
      <path
        className="court__line"
        strokeWidth="1.9"
        d="M26.8 43.7c1.4-.9 3-.8 4.3.2M32.9 43.9c1.3-1 2.9-1.1 4.3-.2"
      />
      <ellipse className="court__ink" cx="29" cy="46.4" rx="1" ry="1.15" />
      <ellipse className="court__ink" cx="35" cy="46.4" rx="1" ry="1.15" />
      <circle className="court__glint" cx="29.4" cy="46" r="0.35" />
      <circle className="court__glint" cx="35.4" cy="46" r="0.35" />
      <path className="court__line" d="M32 46v3.1c0 .7.4 1.1 1 1.1" />
      <path className="court__line" d="M29.3 52.1c1.7 1.1 3.7 1.1 5.4 0" />
      <path className="court__skin-shade" d="M29 54.4c2 1 4 1 6 0" opacity="0.35" />
      <circle className="court__gold" cx="32" cy="64.5" r="2.2" />
      <g className="court__flower">
        <circle cx="32" cy="59.5" r="2.1" />
        <circle cx="28" cy="62.8" r="2.1" />
        <circle cx="36" cy="62.8" r="2.1" />
        <circle cx="29.8" cy="66.7" r="2.1" />
        <circle cx="34.2" cy="66.7" r="2.1" />
      </g>
    </>
  );
}

function KnightArt() {
  return (
    <>
      <path
        className="court__horse"
        d="M12.8 48.2c0-3.9 2.3-7.6 6.2-9.2l8-3.2 3-11c.2-1 1.5-1.4 2.3-.6l4.5 4.7 5.3-.2c7.9 1 12.8 7.2 12.8 14.8 0 6.3-3.2 11.9-8.5 15.3L47 82H27.6l-1.4-18.4c-6.6-3.4-11.2-8.7-13.4-15.4Z"
      />
      <path
        className="court__horse-shade"
        d="M18.5 41.5c2-2.7 5.1-4.2 8.5-4.8l2.7 5.1c-3.7.8-6.6 3-8.2 6.4l-3-6.7Z"
      />
      <path className="court__horse-ear" d="M28.3 37.5l1.5-11.6 5.5 9-7 2.6Z" />
      <path className="court__horse-ear" d="M35.7 35.4l4.5-8.2 3.4 9.4-7.9-1.2Z" />
      <path
        className="court__mane"
        d="M32.2 25.8c3.4-4.9 8.7-6.9 13.3-4.2 4.4 2.6 6.4 7.6 6.4 13 0 5.5-1.3 10.3.1 16.3L55 82H43.4l-3.8-30.7c-1-7.9-2.8-14.5-7.4-25.5Z"
      />
      <path
        className="court__mane-line"
        d="M40.7 30.8c3.5 4.7 4.5 10.5 4 16.8M36.8 34.4c2.5 3.8 3.1 8.2 2.8 12.8"
      />
      <path className="court__mane-light" d="M33.6 27.2c3.1-2.4 6.2-3.1 9.3-2.2" />
      <path
        className="court__bridle"
        d="M13.2 46c4.4 1.7 9.2 2.1 14.4 1.1M27.2 45.5c2.3 3.3 3.1 7 2.5 11.2M26.6 46.2l5.3-1.3"
      />
      <circle className="court__gold" cx="28.8" cy="49.9" r="2.2" />
      <circle className="court__gold-hole" cx="28.8" cy="49.9" r="1" />
      <ellipse className="court__ink" cx="34.3" cy="41.2" rx="1.1" ry="1.25" />
      <circle className="court__glint" cx="34.7" cy="40.7" r="0.35" />
      <path className="court__line" d="M32.7 38.3c1.3-.9 2.7-.8 4 .2" />
      <ellipse className="court__nose" cx="16.8" cy="48.6" rx="1.1" ry="0.8" />
      <path className="court__line" d="M14.2 51.4c1.5.6 3 .7 4.4.2" />
      <path className="court__mane" d="M31.2 27.7c1.8-.7 3.3-.5 4.7.5l-3.2 3.1-1.5-3.6Z" />
      <path
        className="court__cream"
        d="M23.5 80c.3-5.4 3.4-8.5 8.5-8.5s8.2 3.1 8.5 8.5H23.5Z"
        opacity="0.14"
      />
    </>
  );
}

function KingArt() {
  return (
    <>
      <path className="court__robe" d="M10 82c1.5-9.5 9.2-14.5 22-14.5s20.5 5 22 14.5H10Z" />
      <path
        className="court__robe-shadow"
        d="M16 82c1.1-7.4 6-12 13-13.9L25.5 82H16ZM48 82c-1.1-7.4-6-12-13-13.9L38.5 82H48Z"
      />
      <path
        className="court__ermine"
        d="M19.5 70.5c3.3 3.9 7.6 5.9 12.5 5.9s9.2-2 12.5-5.9l-3.4-2.7L32 72.8l-9.1-5-3.4 2.7Z"
      />
      <path
        className="court__ink"
        d="M22.8 71.8c.8.5 1.2 1.5 1 2.4-.9-.2-1.6-1-1.7-1.9l.7-.5ZM42 72.2c-.7.6-.9 1.6-.6 2.5.9-.3 1.4-1.2 1.4-2.1l-.8-.4Z"
      />
      <path className="court__skin-shade" d="M28.3 56.5h7.4v9.2c0 3-7.4 3-7.4 0v-9.2Z" />
      <ellipse className="court__skin" cx="32" cy="43.7" rx="9" ry="10.1" />
      <ellipse className="court__skin-shade" cx="23.1" cy="45.3" rx="1.7" ry="2.2" />
      <ellipse className="court__skin-shade" cx="40.9" cy="45.3" rx="1.7" ry="2.2" />
      <path
        className="court__hair"
        d="M22.7 44.8c-.9-6.8 3.3-11.8 9.3-11.8s10.2 5 9.3 11.8c-1.2-3.3-3-5.4-5.4-6.2-2.5 1.1-5.3 1.1-7.8 0-2.4.8-4.2 2.9-5.4 6.2Z"
      />
      <path
        className="court__hair"
        d="M23.2 43.5c-.3 2.3 0 4.1 1 5.9l3.2-1.5c-1.2-2-2.2-3.6-4.2-4.4ZM40.8 43.5c.3 2.3 0 4.1-1 5.9l-3.2-1.5c1.2-2 2.2-3.6 4.2-4.4Z"
      />
      <path
        className="court__crown"
        d="M20.7 28.2l1.7-10.4 5.5 5.3 4.1-8.4 4.1 8.4 5.5-5.3 1.7 10.4H20.7Z"
      />
      <path className="court__crown-band" d="M20.2 28h23.6v3.5H20.2z" />
      <circle className="court__jewel" cx="22.5" cy="29.8" r="0.9" />
      <circle className="court__jewel" cx="32" cy="29.8" r="0.9" />
      <circle className="court__jewel" cx="41.5" cy="29.8" r="0.9" />
      <path
        className="court__line"
        strokeWidth="1.9"
        d="M26.5 40.6c1.4-1 3.1-1 4.5 0M33 40.6c1.4-1 3.1-1 4.5 0"
      />
      <ellipse className="court__ink" cx="28.7" cy="42.9" rx="1" ry="1.2" />
      <ellipse className="court__ink" cx="35.3" cy="42.9" rx="1" ry="1.2" />
      <circle className="court__glint" cx="29.1" cy="42.4" r="0.35" />
      <circle className="court__glint" cx="35.7" cy="42.4" r="0.35" />
      <path className="court__line" d="M32 42.5v3.6c0 .7.4 1.1 1.1 1.1" />
      <path
        className="court__hair"
        d="M28.4 49.1c1.2-.8 2.4-.8 3.6-.1 1.2-.7 2.4-.7 3.6.1-1.1 1.3-2.3 1.8-3.6 1.8s-2.5-.5-3.6-1.8Z"
      />
      <path className="court__line" d="M29.3 52.7c1.8 1.1 3.6 1.1 5.4 0" />
      <path className="court__skin-shade" d="M29 55.3c2 1 4 1 6 0" opacity="0.28" />
      <path className="court__gold-stroke" d="M24.5 63c3.4-2.1 11.6-2.1 15 0" />
      <circle className="court__gold" cx="32" cy="66.2" r="2.6" />
      <path className="court__jewel" d="M31 66.2l1-1.4 1 1.4-1 1.4-1-1.4Z" />
    </>
  );
}

function CourtArt({ card }: { card: Card & { rank: CourtRank } }) {
  return (
    <div className={`card__court card__court--${card.rank}`} aria-hidden="true">
      <CourtFrame>
        {card.rank === 10 && <KnaveArt />}
        {card.rank === 11 && <KnightArt />}
        {card.rank === 12 && <KingArt />}
      </CourtFrame>
    </div>
  );
}

function BackLayers() {
  return (
    <>
      <span className="card__back-frame" />
      <span className="card__back-weave" />
      <span className="card__back-emblem">
        <span className="card__back-diamond" />
        <span className="card__back-stone" />
      </span>
    </>
  );
}

export function CardBack({ size = 'mini', className }: CardBackProps) {
  return (
    <span
      className={`card card--${size} card--back${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      <BackLayers />
    </span>
  );
}

export function PlayingCard({
  card,
  size = 'hand',
  piece,
  faceDown = false,
  burned = false,
  className,
}: PlayingCardProps) {
  const { content } = useLocale();
  const label = faceDown
    ? content.cards.faceDown
    : burned
      ? content.cards.burned
      : `${describeCard(card, content.cards)}${piece ? `, ${content.cards.piece[piece]}` : ''}`;
  const classes = [
    'card',
    `card--${size}`,
    `card--${card.suit}`,
    piece ? `card--${piece}` : '',
    faceDown ? 'card--face-down' : '',
    burned ? 'card--burned' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  if (faceDown || burned) {
    return (
      <div className={classes} role="img" aria-label={label}>
        <BackLayers />
        {burned && (
          <span className="card__burn-label" aria-hidden="true">
            {content.cards.burned}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={classes} role="img" aria-label={label}>
      <span className="card__inner" aria-hidden="true">
        <Corner card={card} corner="tl" />
        <div className="card__art">
          {isCourtRank(card.rank) ? (
            <CourtArt card={{ suit: card.suit, rank: card.rank }} />
          ) : (
            <NumeralArt card={card} />
          )}
        </div>
        <span className="card__foot" />
        <Corner card={card} corner="br" />
        {piece && (
          <span className="card__piece">
            <span className="card__piece-mark" />
            {content.cards.piece[piece]}
          </span>
        )}
      </span>
    </div>
  );
}
