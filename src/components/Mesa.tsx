import { useCallback, useEffect, useState } from 'react';

import { useLocale } from '../content/locale-context';
import { SAMPLE_TABLE } from '../data/sampleTable';
import { SEATS } from '../domain/seats';
import { ActionBar } from './ActionBar';
import { HandDock } from './HandDock';
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
  const [rulesOpen, setRulesOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(readSoundPreference);

  const openRules = useCallback(() => setRulesOpen(true), []);
  const closeRules = useCallback(() => setRulesOpen(false), []);
  const openLog = useCallback(() => setLogOpen(true), []);
  const closeLog = useCallback(() => setLogOpen(false), []);
  const toggleSound = useCallback(() => setSoundOn((current) => !current), []);

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

      if (rulesOpen || logOpen) {
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [logOpen, rulesOpen]);

  const table = SAMPLE_TABLE;

  return (
    <div className="app">
      <div className="mesa">
        <TopBar soundOn={soundOn} onToggleSound={toggleSound} onOpenRules={openRules} />

        <main className="shell">
          <div className="stage">
            <Scoreboard table={table} />

            <section className="table" aria-labelledby="table-heading">
              <h2 className="sr-only" id="table-heading">
                {content.table.label}
              </h2>
              <div className="table__surface">
                {SEATS.map((seat) => (
                  <Seat
                    key={seat}
                    seat={seat}
                    cardCount={seat === 0 ? table.hand.length : 3}
                    role={seat === table.manoSeat ? 'mano' : seat === table.pieSeat ? 'pie' : null}
                    isTurn={seat === table.turnSeat}
                  />
                ))}

                <TrickArea table={table} />
                <SpeechBubble seat={table.speechSeat} quote={content.trick.bubble} />
              </div>
            </section>

            <ActionBar />
            <HandDock table={table} />
          </div>

          <aside className="rail">
            <LogRail idPrefix="log" />
          </aside>
        </main>

        <HintStrip onOpenRules={openRules} onOpenLog={openLog} logOpen={logOpen} />
      </div>

      <RulesDialog open={rulesOpen} onClose={closeRules} />

      {logOpen && (
        <Modal
          open
          onClose={closeLog}
          labelledBy="log-drawer-title"
          closeLabel={content.rulesDialog.close}
          variant="drawer"
          panelClassName="log-drawer"
        >
          <LogRail idPrefix="log-drawer" />
        </Modal>
      )}
    </div>
  );
}
