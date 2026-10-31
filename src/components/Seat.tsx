import { useLocale } from '../content/locale-context';
import { PERSONA_BY_SEAT, SEAT_POSITION, TEAM_BY_SEAT, type Seat as SeatId } from '../domain/seats';
import type { PersonaKey } from '../domain/seats';
import { Avatar } from './Avatar';
import { CardBack } from './PlayingCard';

interface SeatProps {
  readonly seat: SeatId;
  readonly cardCount: number;
  readonly role: 'mano' | 'pie' | null;
  readonly isTurn: boolean;
}

export function Seat({ seat, cardCount, role, isTurn }: SeatProps) {
  const { content } = useLocale();
  const persona = PERSONA_BY_SEAT[seat] as PersonaKey;
  const person = content.personas[persona];
  const position = SEAT_POSITION[seat];
  const team = TEAM_BY_SEAT[seat];
  const nameId = `seat-${persona}-name`;

  return (
    <article
      className={`seat seat--${position} seat--${team}${isTurn ? ' seat--turn' : ''}`}
      aria-labelledby={nameId}
    >
      <div className="seat__avatar">
        <Avatar persona={persona} />
      </div>
      <div className="seat__body">
        <div className="seat__headline">
          <h3 className="seat__name" id={nameId}>
            {person.name}
          </h3>
          {role && (
            <span
              className={`seat__badge seat__badge--${role}`}
              title={role === 'mano' ? content.seats.manoHint : content.seats.pieHint}
            >
              {role === 'mano' ? content.seats.mano : content.seats.pie}
            </span>
          )}
        </div>
        <p className="seat__persona">{person.persona}</p>
        <div className="seat__footer">
          <span className="seat__cards">
            {cardCount > 0 && (
              <span className="seat__fan" aria-hidden="true">
                {Array.from({ length: cardCount }, (_, index) => (
                  <CardBack key={index} size="mini" />
                ))}
              </span>
            )}
            {content.seats.cardCount(cardCount)}
          </span>
          {isTurn && (
            <span
              className="seat__turn"
              role="status"
              aria-label={content.seats.turnAria(person.name)}
            >
              <span className="seat__turn-dot" aria-hidden="true" />
              {content.seats.turn}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
