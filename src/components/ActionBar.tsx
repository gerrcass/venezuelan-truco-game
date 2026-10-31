import { useLocale } from '../content/locale-context';
import { PERSONA_BY_SEAT, TEAM_BY_SEAT } from '../domain/seats';
import type { GameView } from '../engine/types';

interface ActionBarProps {
  readonly view: GameView;
  readonly onCallTruco: () => void;
  readonly onFold: () => void;
}

export function ActionBar({ view, onCallTruco, onFold }: ActionBarProps) {
  const { content } = useLocale();
  const actions = content.actions;
  const truco = content.truco;
  const noteId = 'actions-note';
  const playing = view.phase === 'playing';
  const pending = view.pending?.kind === 'truco' ? view.pending : null;
  const mustRespond =
    playing && pending !== null && pending.respondingTeam === TEAM_BY_SEAT[view.seat];
  const isYourTurn = playing && view.turn === view.seat && pending === null;
  const waitingPerson = content.personas[PERSONA_BY_SEAT[view.turn]];
  const pendingCall = pending ? truco.names[pending.level] : null;
  const callLevel = view.legal.trucoLevel;
  const callName = callLevel === null ? null : truco.names[callLevel];

  const prompt =
    view.phase === 'matchOver'
      ? { title: actions.matchOver, hint: actions.matchOverHint }
      : view.phase === 'handOver'
        ? { title: actions.handOver, hint: actions.handOverHint }
        : mustRespond && pendingCall
          ? { title: actions.respondPrompt(pendingCall), hint: actions.respondPromptHint }
          : pending
            ? {
                title: actions.waitingResponse,
                hint: actions.waitingResponseHint,
              }
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
        {callName !== null && (
          <button
            type="button"
            className="action action--truco action--call"
            onClick={onCallTruco}
            aria-label={truco.callAria(callName)}
          >
            {callName}
          </button>
        )}
      </div>

      <span className="actions__divider" aria-hidden="true" />

      {view.legal.canFold && (
        <button type="button" className="action action--fold" onClick={onFold}>
          {actions.fold}
        </button>
      )}

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
