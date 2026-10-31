import { useLocale } from '../content/locale-context';
import { PERSONA_BY_SEAT, type Seat } from '../domain/seats';
import { Avatar } from './Avatar';

interface SpeechBubbleProps {
  readonly seat: Seat;
  readonly quote: string;
}

export function SpeechBubble({ seat, quote }: SpeechBubbleProps) {
  const { content } = useLocale();
  const persona = PERSONA_BY_SEAT[seat];
  const person = content.personas[persona];

  return (
    <figure className="bubble" aria-label={content.trick.bubbleAria}>
      <span className="bubble__avatar">
        <Avatar persona={persona} />
      </span>
      <div className="bubble__body">
        <figcaption className="bubble__name">{person.name}</figcaption>
        <blockquote className="bubble__quote" aria-live="polite" aria-atomic="true">
          {quote}
        </blockquote>
      </div>
    </figure>
  );
}
