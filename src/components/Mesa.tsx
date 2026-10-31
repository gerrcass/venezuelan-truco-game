import { useCallback, useEffect, useRef, useState } from 'react';

import { cueForEvent, TableAudio } from '../audio/table-audio';
import { useLocale } from '../content/locale-context';
import { cardKey } from '../domain/cards';
import { PERSONA_BY_SEAT, SEATS, TEAM_BY_SEAT } from '../domain/seats';
import { BAZAS_PER_HAND } from '../engine/game';
import {
  clearCareerStats,
  readCareerStats,
  recordMatchInCareer,
  type CareerStats,
} from '../game/career';
import { useGame } from '../game/game-context';
import {
  markWelcomeSeen,
  setSoundPreference,
  shouldShowWelcome,
  usePreferences,
} from '../game/preferences';
import { useTableTalk } from '../game/useTableTalk';
import { ActionBar } from './ActionBar';
import { Announcer } from './Announcer';
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
import { SenaPanel } from './SenaPanel';
import { SettingsDialog } from './SettingsDialog';
import { SpeechBubble } from './SpeechBubble';
import { TopBar } from './TopBar';
import { TrickArea } from './TrickArea';
import { TrucoDialog } from './TrucoDialog';
import { WelcomeDialog } from './WelcomeDialog';

export function Mesa() {
  const { content } = useLocale();
  const { view, dispatch } = useGame();
  const talk = useTableTalk(view, content);
  const preferences = usePreferences();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [welcomeOpen, setWelcomeOpen] = useState(shouldShowWelcome);
  const [burnArmed, setBurnArmed] = useState(false);
  const [career, setCareer] = useState<CareerStats>(readCareerStats);
  const [audio] = useState(() => new TableAudio());
  const recordedMatchSeed = useRef<number | null>(null);

  const openRules = useCallback(() => {
    setWelcomeOpen(false);
    setSettingsOpen(false);
    setRulesOpen(true);
  }, []);
  const closeRules = useCallback(() => setRulesOpen(false), []);
  const openWelcome = useCallback(() => {
    setRulesOpen(false);
    setSettingsOpen(false);
    setWelcomeOpen(true);
  }, []);
  const closeWelcome = useCallback(() => {
    markWelcomeSeen();
    setWelcomeOpen(false);
  }, []);
  const openSettings = useCallback(() => {
    setRulesOpen(false);
    setWelcomeOpen(false);
    setSettingsOpen(true);
  }, []);
  const closeSettings = useCallback(() => setSettingsOpen(false), []);
  const openLog = useCallback(() => setLogOpen(true), []);
  const closeLog = useCallback(() => setLogOpen(false), []);
  const toggleSound = useCallback(
    () => setSoundPreference(!preferences.sound),
    [preferences.sound],
  );
  const clearStats = useCallback(() => setCareer(clearCareerStats()), []);
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
    if (welcomeOpen) {
      markWelcomeSeen();
    }
  }, [welcomeOpen]);

  useEffect(() => {
    audio.setEnabled(preferences.sound);
  }, [audio, preferences.sound]);

  useEffect(() => {
    audio.arm();

    return () => audio.disarm();
  }, [audio]);

  useEffect(() => {
    const cue = cueForEvent(view.event);

    if (cue !== null) {
      audio.play(cue);
    }
  }, [audio, view.event]);

  useEffect(() => {
    if (view.phase !== 'matchOver' || view.matchWinner === null) {
      return;
    }

    if (recordedMatchSeed.current === view.matchSeed) {
      return;
    }

    recordedMatchSeed.current = view.matchSeed;
    setCareer(recordMatchInCareer(view, readCareerStats()));
  }, [view]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      const target = event.target;

      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
      ) {
        return;
      }

      // Enter confirms the primary action of a summary or response dialog when
      // focus is not already on a button (a focused button activates natively).
      if (event.key === 'Enter') {
        if (rulesOpen || logOpen || settingsOpen || welcomeOpen) {
          return;
        }

        if (document.activeElement instanceof HTMLButtonElement) {
          return;
        }

        const primary = document.querySelector<HTMLElement>('[data-primary-action]');

        if (primary) {
          event.preventDefault();
          primary.click();
        }

        return;
      }

      if (
        rulesOpen ||
        logOpen ||
        settingsOpen ||
        welcomeOpen ||
        view.phase !== 'playing' ||
        view.pending !== null
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
  }, [burnArmed, dispatch, logOpen, rulesOpen, settingsOpen, view, welcomeOpen]);

  useEffect(() => {
    if (view.phase !== 'playing') {
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

  useEffect(() => {
    if (mustRespondTruco || mustRespondEnvido) {
      setRulesOpen(false);
      setSettingsOpen(false);
      setWelcomeOpen(false);
      setLogOpen(false);
    }
  }, [mustRespondEnvido, mustRespondTruco]);

  return (
    <div className="app">
      <Announcer view={view} />
      <div className="mesa">
        <TopBar
          soundOn={preferences.sound}
          onToggleSound={toggleSound}
          onOpenRules={openRules}
          onOpenSettings={openSettings}
        />

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

                {view.phase === 'playing' && view.sena && (
                  <SenaPanel sena={view.sena} dealKey={`${view.matchSeed}:${view.handNumber}`} />
                )}

                <TrickArea view={view} />
                {talk && <SpeechBubble seat={talk.seat} quote={talk.quote} />}
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

      <WelcomeDialog open={welcomeOpen} onClose={closeWelcome} onOpenRules={openRules} />

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
        <TrucoDialog
          view={view}
          pending={pendingTruco}
          onRespond={respondTruco}
          onCallFlor={callFlor}
        />
      )}

      {mustRespondEnvido && pendingEnvido && (
        <EnvidoDialog
          view={view}
          pending={pendingEnvido}
          onRespond={respondEnvido}
          onCallFlor={callFlor}
        />
      )}

      <HandSummary
        view={view}
        stats={career}
        onNextHand={() => dispatch({ type: 'nextHand' })}
        onRematch={() => dispatch({ type: 'rematch' })}
        onOpenRules={openRules}
        onOpenSettings={openSettings}
      />

      {/* Rendered after the summary so their portals stack above it. */}
      <RulesDialog open={rulesOpen} onClose={closeRules} onOpenWelcome={openWelcome} />

      <SettingsDialog
        open={settingsOpen}
        onClose={closeSettings}
        onOpenWelcome={openWelcome}
        stats={career}
        onClearStats={clearStats}
      />
    </div>
  );
}
