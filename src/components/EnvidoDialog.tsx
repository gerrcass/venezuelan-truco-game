import { useLocale } from '../content/locale-context';
import { PERSONA_BY_SEAT } from '../domain/seats';
import { envidoDeclinePayout, envidoStake } from '../engine/game';
import type { GameView, PendingEnvidoCall } from '../engine/types';
import { Modal } from './Modal';

interface EnvidoDialogProps {
  readonly view: GameView;
  readonly pending: PendingEnvidoCall;
  readonly onRespond: (response: 'accept' | 'decline' | 'raise') => void;
  readonly onCallFlor: () => void;
}

export function EnvidoDialog({ view, pending, onRespond, onCallFlor }: EnvidoDialogProps) {
  const { content } = useLocale();
  const envido = content.envido;
  const call = envido.names[pending.level];
  const caller = content.personas[PERSONA_BY_SEAT[pending.callerSeat]].name;
  const stake = envidoStake(pending.level, view.scores, view.target);
  const raiseLevel = pending.level < 4 ? ((pending.level + 1) as 2 | 3 | 4) : null;
  const raiseCall = raiseLevel === null ? null : envido.raises[raiseLevel];
  const stakeNote = pending.level === 4 ? envido.faltaNote(stake) : envido.stakeNote(stake);

  return (
    <Modal
      open
      onClose={() => undefined}
      labelledBy="envido-dialog-title"
      closeLabel={envido.dialogLabel}
      panelClassName="truco-dialog envido-dialog"
      dismissible={false}
    >
      <header className="truco-dialog__head">
        <p className="eyebrow">{envido.dialogLabel}</p>
        <h2 className="truco-dialog__title" id="envido-dialog-title">
          {envido.calledBy(caller, call)}
        </h2>
        <p className="truco-dialog__stake">{stakeNote}</p>
      </header>

      <p className="truco-dialog__note">{envido.answerNote}</p>
      <p className="envido-dialog__decline">
        {envido.declineNote(envidoDeclinePayout(pending.level))}
      </p>

      <div className="truco-dialog__actions">
        <button
          type="button"
          className="button button--primary truco-dialog__accept"
          onClick={() => onRespond('accept')}
          aria-label={envido.acceptAria(call)}
        >
          {envido.accept}
        </button>
        <button
          type="button"
          className="button button--quiet"
          onClick={() => onRespond('decline')}
          aria-label={envido.declineAria(call)}
        >
          {envido.decline}
        </button>
        {raiseCall && (
          <button type="button" className="button button--raise" onClick={() => onRespond('raise')}>
            {raiseCall}
          </button>
        )}
      </div>

      {view.legal.canCallFlor && (
        <button
          type="button"
          className="button button--quiet truco-dialog__flor"
          onClick={onCallFlor}
          aria-label={content.flor.callAria}
        >
          {content.flor.callAria}
        </button>
      )}

      <p className="truco-dialog__score">
        {content.summary.score(view.scores.nosotros, view.scores.ellos)}
      </p>
    </Modal>
  );
}
