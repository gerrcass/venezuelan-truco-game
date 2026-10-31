import { useLocale } from '../content/locale-context';
import { PERSONA_BY_SEAT } from '../domain/seats';
import type { GameView } from '../engine/types';

interface ActionBarProps {
  readonly view: GameView;
}

export function ActionBar({ view }: ActionBarProps) {
  const { content } = useLocale();
  const actions = content.actions;
  const noteId = 'actions-note';
  const isYourTurn = view.phase === 'playing' && view.turn === view.seat;
  const waitingPerson = content.personas[PERSONA_BY_SEAT[view.turn]];

  const prompt =
    view.phase === 'matchOver'
      ? { title: actions.matchOver, hint: actions.matchOverHint }
      : view.phase === 'handOver'
        ? { title: actions.handOver, hint: actions.handOverHint }
        : isYourTurn
          ? { title: actions.yourTurn, hint: actions.yourTurnHint }
          : { title: actions.waiting(waitingPerson.name), hint: actions.waitingHint };

  return (
    <section className="actions" aria-labelledby="actions-title">
      <h2 className="sr-only" id="actions-title">
        {actions.label}
      </h2>

      <div className="actions__group" role="group" aria-label={actions.cantar}>
        <span className="actions__label">{actions.cantar}</span>
        <span className="actions__soon-chip">{actions.soon}</span>
        <button
          type="button"
          className="action"
          disabled
          title={actions.soon}
          aria-describedby={noteId}
        >
          {actions.envido}
        </button>
        <button
          type="button"
          className="action"
          disabled
          title={actions.soon}
          aria-describedby={noteId}
        >
          {actions.flor}
        </button>
      </div>

      <span className="actions__divider" aria-hidden="true" />

      <button
        type="button"
        className="action action--truco"
        disabled
        title={actions.soon}
        aria-describedby={noteId}
      >
        {actions.truco}
      </button>
      <button
        type="button"
        className="action action--fold"
        disabled
        title={actions.soon}
        aria-describedby={noteId}
      >
        {actions.fold}
      </button>

      <p className="actions__note" id={noteId}>
        {actions.note}
      </p>

      <div
        className={`action action--play action--prompt${isYourTurn ? ' action--prompt-live' : ''}`}
        role="status"
        aria-live="polite"
      >
        <span className="action__play-title">{prompt.title}</span>
        <span className="action__play-hint">{prompt.hint}</span>
      </div>
    </section>
  );
}
