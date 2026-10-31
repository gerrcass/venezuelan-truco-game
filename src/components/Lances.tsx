import { useLocale } from '../content/locale-context';
import { PERSONA_BY_SEAT, type Seat } from '../domain/seats';
import { florPoints } from '../engine/cards';
import type { GameView } from '../engine/types';

interface LancesProps {
  readonly view: GameView;
}

interface LanceChip {
  readonly key: string;
  readonly tone: 'envido' | 'flor' | 'prive';
  readonly who: Seat | null;
  readonly text: string;
}

export function Lances({ view }: LancesProps) {
  const { content } = useLocale();

  if (view.phase !== 'playing') {
    return null;
  }

  const chips: LanceChip[] = [];
  const envido = view.envido;

  if (envido.status !== 'none' && envido.status !== 'cancelled' && envido.level !== null) {
    const call = content.envido.names[envido.level];
    const text =
      envido.status === 'pending'
        ? content.lances.envidoPending(call)
        : envido.status === 'accepted'
          ? content.lances.envidoAccepted(call, envido.stake ?? 0)
          : content.lances.envidoDeclined(call, envido.stake ?? 0);

    chips.push({ key: 'envido', tone: 'envido', who: null, text });
  }

  if (!view.flor.settled) {
    for (const declaration of view.flor.declarations) {
      const points = florPoints(declaration.kind);

      chips.push({
        key: `flor-${declaration.seat}`,
        tone: 'flor',
        who: declaration.seat,
        text: content.lances.flor(declaration.kind, points),
      });
    }
  }

  if (view.prive.called && view.prive.tantos) {
    chips.push({
      key: 'prive',
      tone: 'prive',
      who: null,
      text: content.lances.prive(view.prive.points, view.prive.tantos),
    });
  }

  if (chips.length === 0) {
    return <div className="lances" />;
  }

  return (
    <div className="lances">
      <div className="lances__group" role="group" aria-label={content.lances.label}>
        {chips.map((chip) => (
          <p className={`lance lance--${chip.tone}`} key={chip.key}>
            {chip.who !== null && (
              <span className="lance__who">{content.personas[PERSONA_BY_SEAT[chip.who]].name}</span>
            )}
            <span className="lance__text">{chip.text}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
