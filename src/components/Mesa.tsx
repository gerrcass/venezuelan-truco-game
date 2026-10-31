import { useCallback, useEffect, useState } from 'react';

import { useLocale } from '../content/locale-context';
import { cardKey } from '../domain/cards';
import { PERSONA_BY_SEAT, SEATS } from '../domain/seats';
import { useGame } from '../game/game-context';
import { ActionBar } from './ActionBar';
import { HandDock } from './HandDock';
import { HandSummary } from './HandSummary';
import { HintStrip } from './HintStrip';
import { LogRail } from './LogRail';
import { Modal } from './Modal';
import { RulesDialog } from './RulesDialog';
import { Scoreboard } from './Scoreboard';
import { Seat } from './Seat';
import { SpeechBubble } from './SpeechBubble';
import { TopBar } from './TopBar';
import { TrickArea } from './TrickArea';

const SOUND_KEY = 'truco.sound';

function readSoundPreference(): boolean {
  try {
    return window.localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function Mesa() {
  const { content } = useLocale();
  const { view, dispatch } = useGame();
  const [rulesOpen, setRulesOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(readSoundPreference);

  const openRules = useCallback(() => setRulesOpen(true), []);
  const closeRules = useCallback(() => setRulesOpen(false), []);
  const openLog = useCallback(() => setLogOpen(true), []);
  const closeLog = useCallback(() => setLogOpen(false), []);
  const toggleSound = useCallback(() => setSoundOn((current) => !current), []);
  const playCard = useCallback(
    (key: string) => dispatch({ type: 'playCard', seat: view.seat, cardKey: key }),
    [dispatch, view.seat],
  );

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

      if (rulesOpen || logOpen || view.phase !== 'playing') {
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
      dispatch({ type: 'playCard', seat: view.seat, cardKey: key });
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, logOpen, rulesOpen, view]);

  useEffect(() => {
    if (view.phase !== 'playing') {
      setRulesOpen(false);
      setLogOpen(false);
    }
  }, [view.phase]);

  const manoName = content.personas[PERSONA_BY_SEAT[view.mano]].name;

  return (
    <div className="app">
      <div className="mesa">
        <TopBar soundOn={soundOn} onToggleSound={toggleSound} onOpenRules={openRules} />

        <main className="shell">
          <div className="stage">
            <Scoreboard view={view} />

            <p className="statusline">
              <span>{content.status.baza(view.trickIndex, 3)}</span>
              <span className="statusline__dot" aria-hidden="true">
                {content.status.separator}
              </span>
              <span>{content.status.reparto(view.handNumber)}</span>
              <span className="statusline__dot" aria-hidden="true">
                {content.status.separator}
              </span>
              <span>{content.status.mano(manoName)}</span>
            </p>

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
                <SpeechBubble seat={1} quote={content.trick.bubble} />
              </div>
            </section>

            <ActionBar view={view} />
            <HandDock view={view} onPlay={playCard} />
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

      <HandSummary
        view={view}
        onNextHand={() => dispatch({ type: 'nextHand' })}
        onRematch={() => dispatch({ type: 'rematch' })}
      />
    </div>
  );
}
