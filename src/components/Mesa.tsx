import { useCallback, useEffect, useState } from 'react';

import { useLocale } from '../content/locale-context';
import type { ShellContent } from '../content/types';
import { cardKey } from '../domain/cards';
import { PERSONA_BY_SEAT, SEATS, TEAM_BY_SEAT, type Seat as SeatId } from '../domain/seats';
import { BAZAS_PER_HAND } from '../engine/game';
import type { GameLogEntry, TrucoCallLevel } from '../engine/types';
import { useGame } from '../game/game-context';
import { ActionBar } from './ActionBar';
import { EnvidoDialog } from './EnvidoDialog';
import { HandDock } from './HandDock';
import { HandSummary } from './HandSummary';
import { HintStrip } from './HintStrip';
import { Lances } from './Lances';
import { LogRail } from './LogRail';
import { Modal } from './Modal';
import { RulesDialog } from './RulesDialog';
import { Scoreboard } from './Scoreboard';
import { Seat } from './Seat';
import { SpeechBubble } from './SpeechBubble';
import { TopBar } from './TopBar';
import { TrickArea } from './TrickArea';
import { TrucoDialog } from './TrucoDialog';

const SOUND_KEY = 'truco.sound';

function readSoundPreference(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

/** The last call or answer of the current reparto, for the table-talk bubble. */
function latestTalk(
  entries: readonly GameLogEntry[],
  content: ShellContent,
): { seat: SeatId; quote: string } | null {
  let start = 0;

  for (let index = 0; index < entries.length; index += 1) {
    if (entries[index].kind === 'deal') {
      start = index;
    }
  }

  for (let index = entries.length - 1; index >= start; index -= 1) {
    const entry = entries[index];

    if (entry.kind === 'call') {
      if (entry.call === 'truco') {
        return {
          seat: entry.seat,
          quote: content.truco.speech.call(content.truco.names[entry.level]),
        };
      }

      if (entry.call === 'envido') {
        return {
          seat: entry.seat,
          quote: content.envido.speech.call(content.envido.names[entry.level]),
        };
      }

      if (entry.call === 'flor') {
        return { seat: entry.seat, quote: content.flor.speech.call(entry.flor) };
      }

      return { seat: entry.seat, quote: content.prive.speech.call };
    }

    if (entry.kind === 'respond') {
      if (entry.call === 'envido') {
        if (entry.response === 'accept') {
          return { seat: entry.seat, quote: content.envido.speech.accept };
        }

        if (entry.response === 'decline') {
          return { seat: entry.seat, quote: content.envido.speech.decline };
        }

        return {
          seat: entry.seat,
          quote: content.envido.speech.raise(content.envido.raises[(entry.level + 1) as 2 | 3 | 4]),
        };
      }

      if (entry.response === 'accept') {
        return { seat: entry.seat, quote: content.truco.speech.accept };
      }

      if (entry.response === 'decline') {
        return { seat: entry.seat, quote: content.truco.speech.decline };
      }

      const raised = content.truco.names[(entry.level + 1) as TrucoCallLevel];

      return { seat: entry.seat, quote: content.truco.speech.raise(raised) };
    }
  }

  return null;
}

export function Mesa() {
  const { content } = useLocale();
  const { view, dispatch } = useGame();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(readSoundPreference);
  const [burnArmed, setBurnArmed] = useState(false);

  const openRules = useCallback(() => setRulesOpen(true), []);
  const closeRules = useCallback(() => setRulesOpen(false), []);
  const openLog = useCallback(() => setLogOpen(true), []);
  const closeLog = useCallback(() => setLogOpen(false), []);
  const toggleSound = useCallback(() => setSoundOn((current) => !current), []);
  const toggleBurn = useCallback(() => setBurnArmed((current) => !current), []);
  const playCard = useCallback(
    (key: string) => {
      dispatch({ type: 'playCard', seat: view.seat, cardKey: key, burned: burnArmed });
      setBurnArmed(false);
    },
    [burnArmed, dispatch, view.seat],
  );
  const callTruco = useCallback(
    () => dispatch({ type: 'callTruco', seat: view.seat }),
    [dispatch, view.seat],
  );
  const callEnvido = useCallback(
    () => dispatch({ type: 'callEnvido', seat: view.seat }),
    [dispatch, view.seat],
  );
  const callFlor = useCallback(
    () => dispatch({ type: 'callFlor', seat: view.seat }),
    [dispatch, view.seat],
  );
  const callPrive = useCallback(
    () => dispatch({ type: 'callPrive', seat: view.seat }),
    [dispatch, view.seat],
  );
  const fold = useCallback(
    () => dispatch({ type: 'fold', seat: view.seat }),
    [dispatch, view.seat],
  );
  const respondTruco = useCallback(
    (response: 'accept' | 'decline' | 'raise') =>
      dispatch({ type: 'respondTruco', seat: view.seat, response }),
    [dispatch, view.seat],
  );
  const respondEnvido = useCallback(
    (response: 'accept' | 'decline' | 'raise') =>
      dispatch({ type: 'respondEnvido', seat: view.seat, response }),
    [dispatch, view.seat],
  );

  useEffect(() => {
    setBurnArmed(false);
  }, [view.phase, view.turn, view.trickIndex, view.pending]);

  useEffect(() => {
    try {
      window.localStorage.setItem(SOUND_KEY, soundOn ? 'on' : 'off');
    } catch {
      // Sound is optional; the preference simply is not remembered.
    }
  }, [soundOn]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (rulesOpen || logOpen || view.phase !== 'playing' || view.pending !== null) {
        return;
      }

      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return;
      }

      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault();
        setRulesOpen(true);
        return;
      }

      if (event.key === 'b' || event.key === 'B') {
        if (view.legal.playableCardKeys.length === 0) {
          return;
        }

        event.preventDefault();
        setBurnArmed((current) => !current);
        return;
      }

      if (view.turn !== view.seat) {
        return;
      }

      const index = ['1', '2', '3'].indexOf(event.key);

      if (index < 0) {
        return;
      }

      const card = view.hand[index];

      if (!card) {
        return;
      }

      const key = cardKey(card);

      if (!view.legal.playableCardKeys.includes(key)) {
        return;
      }

      event.preventDefault();
      dispatch({ type: 'playCard', seat: view.seat, cardKey: key, burned: burnArmed });
      setBurnArmed(false);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [burnArmed, dispatch, logOpen, rulesOpen, view]);

  useEffect(() => {
    if (view.phase !== 'playing') {
      setRulesOpen(false);
      setLogOpen(false);
    }
  }, [view.phase]);

  const manoName = content.personas[PERSONA_BY_SEAT[view.mano]].name;
  const pendingTruco = view.pending?.kind === 'truco' ? view.pending : null;
  const pendingEnvido = view.pending?.kind === 'envido' ? view.pending : null;
  const mustRespondTruco =
    view.phase === 'playing' &&
    pendingTruco !== null &&
    pendingTruco.respondingTeam === TEAM_BY_SEAT[view.seat];
  const mustRespondEnvido =
    view.phase === 'playing' &&
    pendingEnvido !== null &&
    pendingEnvido.respondingTeam === TEAM_BY_SEAT[view.seat];
  const talk = latestTalk(view.log, content);

  return (
    <div className="app">
      <div className="mesa">
        <TopBar soundOn={soundOn} onToggleSound={toggleSound} onOpenRules={openRules} />

        <main className="shell">
          <div className="stage">
            <Scoreboard view={view} />

            <p className="statusline">
              <span>{content.status.baza(view.trickIndex, BAZAS_PER_HAND)}</span>
              <span className="statusline__dot" aria-hidden="true">
                {content.status.separator}
              </span>
              <span>{content.status.reparto(view.handNumber)}</span>
              <span className="statusline__dot" aria-hidden="true">
                {content.status.separator}
              </span>
              <span>{content.status.mano(manoName)}</span>
            </p>

            <Lances view={view} />

            <section className="table" aria-labelledby="table-heading">
              <h2 className="sr-only" id="table-heading">
                {content.table.label}
              </h2>
              <div className="table__surface">
                {SEATS.map((seat) => (
                  <Seat
                    key={seat}
                    seat={seat}
                    cardCount={view.handCounts[seat]}
                    role={seat === view.mano ? 'mano' : seat === view.dealer ? 'pie' : null}
                    isTurn={view.phase === 'playing' && seat === view.turn}
                  />
                ))}

                <TrickArea view={view} />
                <SpeechBubble seat={talk?.seat ?? 1} quote={talk?.quote ?? content.trick.bubble} />
              </div>
            </section>

            <ActionBar
              view={view}
              onCallTruco={callTruco}
              onCallEnvido={callEnvido}
              onCallFlor={callFlor}
              onCallPrive={callPrive}
              onFold={fold}
            />
            <HandDock
              view={view}
              burnArmed={burnArmed}
              onToggleBurn={toggleBurn}
              onPlay={playCard}
            />
          </div>

          <aside className="rail">
            <LogRail idPrefix="log" entries={view.log} />
          </aside>
        </main>

        <HintStrip onOpenRules={openRules} onOpenLog={openLog} logOpen={logOpen} />
      </div>

      <RulesDialog open={rulesOpen && view.phase === 'playing'} onClose={closeRules} />

      {logOpen && view.phase === 'playing' && (
        <Modal
          open
          onClose={closeLog}
          labelledBy="log-drawer-title"
          closeLabel={content.rulesDialog.close}
          variant="drawer"
          panelClassName="log-drawer"
        >
          <LogRail idPrefix="log-drawer" entries={view.log} />
        </Modal>
      )}

      {mustRespondTruco && pendingTruco && (
        <TrucoDialog view={view} pending={pendingTruco} onRespond={respondTruco} />
      )}

      {mustRespondEnvido && pendingEnvido && (
        <EnvidoDialog view={view} pending={pendingEnvido} onRespond={respondEnvido} />
      )}

      <HandSummary
        view={view}
        onNextHand={() => dispatch({ type: 'nextHand' })}
        onRematch={() => dispatch({ type: 'rematch' })}
      />
    </div>
  );
}
