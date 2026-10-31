import { useLocale } from '../content/locale-context';
import { PERSONA_BY_SEAT } from '../domain/seats';
import { stakeForLevel } from '../engine/game';
import type { GameView, PendingTrucoCall, TrucoCallLevel } from '../engine/types';
import { Modal } from './Modal';

interface TrucoDialogProps {
  readonly view: GameView;
  readonly pending: PendingTrucoCall;
  readonly onRespond: (response: 'accept' | 'decline' | 'raise') => void;
  readonly onCallFlor: () => void;
}

export function TrucoDialog({ view, pending, onRespond, onCallFlor }: TrucoDialogProps) {
  const { content } = useLocale();
  const truco = content.truco;
  const call = truco.names[pending.level];
  const caller = content.personas[PERSONA_BY_SEAT[pending.callerSeat]].name;
  const raiseLevel: TrucoCallLevel | null =
    pending.level < 4 ? ((pending.level + 1) as TrucoCallLevel) : null;
  const raiseCall = raiseLevel === null ? null : truco.names[raiseLevel];

  return (
    <Modal
      open
      onClose={() => undefined}
      labelledBy="truco-dialog-title"
      closeLabel={truco.dialogLabel}
      panelClassName="truco-dialog"
      dismissible={false}
    >
      <header className="truco-dialog__head">
        <p className="eyebrow">{truco.dialogLabel}</p>
        <h2 className="truco-dialog__title" id="truco-dialog-title">
          {truco.calledBy(caller, call)}
        </h2>
        <p className="truco-dialog__stake">{truco.stakeNote(stakeForLevel(pending.level))}</p>
      </header>

      <p className="truco-dialog__note">{truco.answerNote}</p>

      <div className="truco-dialog__actions">
        <button
          type="button"
          className="button button--primary truco-dialog__accept"
          data-primary-action
          onClick={() => onRespond('accept')}
          aria-label={truco.acceptAria(call)}
        >
          {truco.accept}
        </button>
        <button
          type="button"
          className="button button--quiet"
          onClick={() => onRespond('decline')}
          aria-label={truco.declineAria(call)}
        >
          {truco.decline}
        </button>
        {raiseCall && (
          <button
            type="button"
            className="button button--raise"
            onClick={() => onRespond('raise')}
            aria-label={truco.raiseAria(raiseCall)}
          >
            {truco.raise(raiseCall)}
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
