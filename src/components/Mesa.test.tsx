import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { botPersonaForSeat } from '../ai/personas';
import { chooseBotAction } from '../ai/policy';
import { es } from '../content';
import { LocaleProvider } from '../content/LocaleProvider';
import type { TauntPersona } from '../content/taunts';
import { cardKey, type Card, type Rank, type Suit } from '../domain/cards';
import { actingSeat, createGame, reduce, viewFor } from '../engine/game';
import type { GameState, GameView } from '../engine/types';
import { EMPTY_CAREER } from '../game/career';
import { GameProvider } from '../game/GameProvider';
import { HandSummary } from './HandSummary';
import { Mesa } from './Mesa';

const SLOW_BOT = 100_000;

function renderMesa(seed = 'mano-viva') {
  return render(
    <LocaleProvider>
      <GameProvider seed={seed} botDelayMs={SLOW_BOT}>
        <Mesa />
      </GameProvider>
    </LocaleProvider>,
  );
}

function renderTableState(state: GameState) {
  return render(
    <LocaleProvider>
      <GameProvider initialState={state} botDelayMs={SLOW_BOT}>
        <Mesa />
      </GameProvider>
    </LocaleProvider>,
  );
}

function renderTableStateInEnglish(state: GameState) {
  return render(
    <LocaleProvider initialLocale="en">
      <GameProvider initialState={state} botDelayMs={SLOW_BOT}>
        <Mesa />
      </GameProvider>
    </LocaleProvider>,
  );
}

function renderTableStateWithDelay(state: GameState, botDelayMs: number) {
  return render(
    <LocaleProvider>
      <GameProvider initialState={state} botDelayMs={botDelayMs}>
        <Mesa />
      </GameProvider>
    </LocaleProvider>,
  );
}

function card(rank: Rank, suit: Suit): Card {
  return { rank, suit };
}

const VIRA_REY_BASTO = card(12, 'basto');

function rigGame(overrides: Partial<GameState> = {}): GameState {
  const base = createGame({ seed: 'mesa-rig' });

  return {
    ...base,
    vira: VIRA_REY_BASTO,
    turn: 0,
    lead: 0,
    tricks: [],
    currentTrick: [],
    bazaWins: { nosotros: 0, ellos: 0 },
    lastTrick: null,
    result: null,
    matchWinner: null,
    phase: 'playing',
    scores: { nosotros: 0, ellos: 0 },
    truco: { level: 0, acceptedByTeam: null },
    pending: null,
    log: [],
    nextLogId: 0,
    event: null,
    ...overrides,
  };
}

function rigBazaHand(overrides: Partial<GameState> = {}): GameState {
  const hands: Record<0 | 1 | 2 | 3, readonly Card[]> = {
    0: [card(3, 'oro'), card(3, 'copa'), card(4, 'espada')],
    1: [card(2, 'oro'), card(2, 'copa'), card(3, 'espada')],
    2: [card(4, 'oro'), card(4, 'copa'), card(5, 'espada')],
    3: [card(5, 'oro'), card(5, 'copa'), card(6, 'espada')],
  };

  return rigGame({ hands, dealtHands: hands, ...overrides });
}

function playBazaHand(state: GameState): GameState {
  const plays: ReadonlyArray<readonly [0 | 1 | 2 | 3, Card]> = [
    [0, card(3, 'oro')],
    [1, card(2, 'oro')],
    [2, card(4, 'oro')],
    [3, card(5, 'oro')],
    [0, card(3, 'copa')],
    [1, card(2, 'copa')],
    [2, card(4, 'copa')],
    [3, card(5, 'copa')],
  ];

  return plays.reduce((current, [seat, played]) => {
    const next = reduce(current, { type: 'playCard', seat, cardKey: cardKey(played) });
    expect(next).not.toBe(current);
    return next;
  }, state);
}

const ENVIDO_HANDS: Record<0 | 1 | 2 | 3, readonly Card[]> = {
  0: [card(7, 'oro'), card(6, 'oro'), card(4, 'copa')],
  1: [card(3, 'copa'), card(2, 'copa'), card(5, 'espada')],
  2: [card(5, 'oro'), card(4, 'oro'), card(6, 'espada')],
  3: [card(7, 'espada'), card(3, 'oro'), card(2, 'oro')],
};

const FLOR_HANDS: Record<0 | 1 | 2 | 3, readonly Card[]> = {
  0: [card(7, 'copa'), card(6, 'copa'), card(5, 'copa')],
  1: [card(3, 'oro'), card(4, 'oro'), card(5, 'espada')],
  2: [card(2, 'basto'), card(3, 'basto'), card(4, 'basto')],
  3: [card(12, 'oro'), card(11, 'oro'), card(10, 'oro')],
};

const RESERVADA_HANDS: Record<0 | 1 | 2 | 3, readonly Card[]> = {
  0: [card(7, 'copa'), card(6, 'copa'), card(5, 'copa')],
  1: [card(11, 'basto'), card(10, 'basto'), card(3, 'oro')],
  2: [card(2, 'basto'), card(4, 'basto'), card(5, 'basto')],
  3: [card(12, 'oro'), card(11, 'oro'), card(10, 'oro')],
};

const PRIVE_HANDS: Record<0 | 1 | 2 | 3, readonly Card[]> = {
  0: [card(2, 'oro'), card(3, 'oro'), card(5, 'basto')],
  1: [card(7, 'copa'), card(6, 'copa'), card(2, 'espada')],
  2: [card(5, 'espada'), card(6, 'espada'), card(4, 'basto')],
  3: [card(5, 'copa'), card(4, 'copa'), card(3, 'espada')],
};

const CLEAN_ENVIDO: GameState['envido'] = {
  status: 'none',
  level: null,
  stake: null,
  callerTeam: null,
  acceptedByTeam: null,
  tantos: null,
};

const CLEAN_FLOR: GameState['flor'] = {
  declarations: [],
  settled: false,
  winnerTeam: null,
  winnerSeat: null,
  points: 0,
};

const CLEAN_PRIVE: GameState['prive'] = {
  called: false,
  callerTeam: null,
  winnerTeam: null,
  points: 0,
  tantos: null,
};

function rigLanceGame(
  hands: Record<0 | 1 | 2 | 3, readonly Card[]>,
  overrides: Partial<GameState> = {},
): GameState {
  return rigGame({
    vira: VIRA_REY_BASTO,
    hands,
    dealtHands: hands,
    envido: CLEAN_ENVIDO,
    flor: CLEAN_FLOR,
    prive: CLEAN_PRIVE,
    settlements: [],
    ...overrides,
  });
}

function playFirstBazaUi(state: GameState): GameState {
  let current = state;
  const baza = state.tricks.length;
  let guard = 0;

  while (current.phase === 'playing' && current.tricks.length === baza && guard < 4) {
    guard += 1;
    const seat = current.turn;
    const played = current.hands[seat][0];
    const next = reduce(current, { type: 'playCard', seat, cardKey: cardKey(played) });
    expect(next).not.toBe(current);
    current = next;
  }

  return current;
}

function playOutUi(state: GameState): GameState {
  let current = state;
  let guard = 0;

  while (current.phase === 'playing' && guard < 40) {
    guard += 1;
    const seat = actingSeat(current);
    const played = current.hands[seat][0];
    const next = reduce(current, { type: 'playCard', seat, cardKey: cardKey(played) });
    expect(next).not.toBe(current);
    current = next;
  }

  return current;
}

function pendingEnvido(): GameState {
  const base = rigLanceGame(ENVIDO_HANDS, { scores: { nosotros: 5, ellos: 18 } });
  const ours = reduce(base, { type: 'callEnvido', seat: 0 });

  return reduce(ours, { type: 'respondEnvido', seat: 1, response: 'raise' });
}

function pendingRetruco(): GameState {
  return rigGame({
    turn: 1,
    truco: { level: 1, acceptedByTeam: 'ellos' },
    pending: {
      kind: 'truco',
      level: 2,
      callerSeat: 1,
      callerTeam: 'ellos',
      respondingTeam: 'nosotros',
      returnSeat: 1,
    },
  });
}

function matchPoint(): GameState {
  const state = rigBazaHand({
    scores: { nosotros: 23, ellos: 10 },
    truco: { level: 3, acceptedByTeam: 'nosotros' },
  });
  const called = reduce(state, { type: 'callTruco', seat: 0 });
  const accepted = reduce(called, { type: 'respondTruco', seat: 1, response: 'accept' });

  expect(accepted.pending).toBeNull();
  return playBazaHand(accepted);
}

function playToHandOver(seed: string): GameState {
  let state = createGame({ seed });
  let guard = 0;

  while (guard < 600) {
    guard += 1;

    if (state.phase === 'matchOver') {
      state = reduce(state, { type: 'rematch', seed: `${seed}-${guard}` });
      continue;
    }

    if (state.phase === 'handOver') {
      if (state.tricks.length > 0) {
        return state;
      }

      state = reduce(state, { type: 'nextHand' });
      continue;
    }

    const seat = actingSeat(state);
    state = reduce(
      state,
      chooseBotAction(viewFor(state, seat), botPersonaForSeat(seat), state.seed),
    );
  }

  throw new Error('The simulation never produced a reparto with bazas.');
}

function playToFirstTrick(seed: string): GameState {
  let state = createGame({ seed });
  let guard = 0;

  while (guard < 400) {
    guard += 1;

    if (state.phase === 'handOver') {
      state = reduce(state, { type: 'nextHand' });
      continue;
    }

    if (state.phase === 'matchOver') {
      state = reduce(state, { type: 'rematch', seed: `${seed}-${guard}` });
      continue;
    }

    const seat = actingSeat(state);
    state = reduce(
      state,
      chooseBotAction(viewFor(state, seat), botPersonaForSeat(seat), state.seed),
    );

    if (state.tricks.length > 0) {
      return state;
    }
  }

  throw new Error('The simulation never resolved a baza.');
}

async function expectTableTaunt(events: readonly ('deal' | 'trickWin' | 'trickLose')[]) {
  await waitFor(() => {
    const bubble = screen.getByLabelText('Lo que se dice en la mesa');
    const name = within(bubble).getByText(/^(El Pana|La Comadre|El Catire)$/).textContent;
    const persona: TauntPersona =
      name === 'El Pana' ? 'pana' : name === 'La Comadre' ? 'comadre' : 'catire';
    const quote = bubble.querySelector('.bubble__quote')?.textContent ?? '';
    const lines = events.flatMap((event) => es.taunts[persona][event]);

    expect(lines).toContain(quote);
  });
}

describe('the live table', () => {
  it('renders the dealt hand and plays a card on click', async () => {
    const user = userEvent.setup();
    renderMesa();

    const hand = screen.getByRole('region', { name: 'Tu mano' });
    const cards = within(hand).getAllByRole('button', { name: /^Jugar / });

    expect(cards).toHaveLength(3);

    const playedName = cards[0].getAttribute('aria-label')?.replace('Jugar ', '') ?? '';
    await user.click(cards[0]);

    expect(within(hand).getAllByRole('button', { name: /^Jugar / })).toHaveLength(2);

    const trick = screen.getByRole('group', { name: 'Baza 1 en curso' });
    expect(within(trick).getByRole('img', { name: playedName })).toBeVisible();
  });

  it('plays the second card with the keyboard and disables the rest out of turn', async () => {
    const user = userEvent.setup();
    renderMesa('teclado-1');

    const hand = screen.getByRole('region', { name: 'Tu mano' });
    const cards = within(hand).getAllByRole('button', { name: /^Jugar / });
    const secondName = cards[1].getAttribute('aria-label')?.replace('Jugar ', '') ?? '';

    await user.keyboard('2');

    expect(within(hand).getAllByRole('button', { name: /^Jugar / })).toHaveLength(2);

    const trick = screen.getByRole('group', { name: 'Baza 1 en curso' });
    expect(within(trick).getByRole('img', { name: secondName })).toBeVisible();

    for (const card of within(hand).getAllByRole('button', { name: /^Jugar / })) {
      expect(card).toBeDisabled();
    }
  });

  it('keeps the resolved baza on the table with its four cards and verdict', () => {
    const state = playToFirstTrick('primera-baza');
    const last = state.lastTrick;
    const winnerSeat = last?.winnerSeat ?? null;
    const names = ['Tú', 'El Catire', 'El Pana', 'La Comadre'];
    const verdict = last?.parda || winnerSeat === null ? 'Parda' : `Ganó ${names[winnerSeat]}`;

    renderTableState(state);

    const trick = screen.getByRole('group', { name: /^Baza 1: / });

    expect(within(trick).getAllByRole('img')).toHaveLength(4);
    expect(within(trick).getByText(verdict)).toBeVisible();
  });

  it('shows El Pana’s seña and reveals the gesture and card on click', async () => {
    const user = userEvent.setup();
    const base = rigGame();
    const panaHand = [card(11, 'basto'), card(4, 'oro'), card(6, 'copa')];
    const hands = { ...base.hands, 2: panaHand } as const;

    renderTableState(rigGame({ hands, dealtHands: hands }));

    const trigger = screen.getByRole('button', { name: /La seña del Pana/ });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('region', { name: 'La seña del Pana' })).not.toBeInTheDocument();

    await user.click(trigger);

    const panel = screen.getByRole('region', { name: 'La seña del Pana' });

    expect(panel).toHaveTextContent('Guiño del ojo derecho');
    expect(panel).toHaveTextContent('El Pana te señala 11 de basto.');
  });

  it('renders no speech bubble when there is no table talk', () => {
    renderTableState(rigGame());

    expect(screen.queryByLabelText('Lo que se dice en la mesa')).not.toBeInTheDocument();
  });

  it('fills the deal with persona table talk', async () => {
    renderMesa('mesa-habladora');
    await expectTableTaunt(['deal']);
  });

  it('fills the quiet beat after a trick with persona table talk', async () => {
    renderTableState(playToFirstTrick('mesa-habladora-baza'));
    await expectTableTaunt(['trickWin', 'trickLose']);
  });
});

describe('the truco action bar', () => {
  it('offers the next call and the fold only when they are legal', async () => {
    const user = userEvent.setup();
    renderTableState(rigGame({ truco: { level: 1, acceptedByTeam: 'nosotros' } }));

    const call = screen.getByRole('button', { name: 'Cantar Retruco' });

    expect(call).toHaveTextContent('Retruco');
    expect(screen.getByRole('button', { name: 'Irse al mazo' })).toBeVisible();

    await user.click(call);

    expect(screen.getByText('Los rivales están decidiendo…')).toBeVisible();
    expect(screen.queryByRole('button', { name: /^Cantar / })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Irse al mazo' })).not.toBeInTheDocument();
  });

  it('does not offer a call when the other team accepted the level', () => {
    renderTableState(rigGame({ truco: { level: 1, acceptedByTeam: 'ellos' } }));

    expect(screen.queryByRole('button', { name: 'Cantar Retruco' })).not.toBeInTheDocument();

    const hand = screen.getByRole('region', { name: 'Tu mano' });
    expect(within(hand).getAllByRole('button', { name: /^Jugar / })).toHaveLength(3);
  });

  it('shows the rivals answer in the bubble and the log after the human calls', () => {
    const called = reduce(rigGame(), { type: 'callTruco', seat: 0 });
    const accepted = reduce(called, { type: 'respondTruco', seat: 1, response: 'accept' });

    renderTableState(accepted);

    const bubble = screen.getByLabelText('Lo que se dice en la mesa');

    expect(within(bubble).getByText('El Catire')).toBeVisible();
    expect(within(bubble).getByText('¡Quiero!')).toBeVisible();
    expect(screen.getByText('El Catire: Quiero · Truco.')).toBeVisible();
  });

  it('schedules the rival answer after the human calls', async () => {
    const user = userEvent.setup();
    const base = rigGame();
    const strongHand = [card(3, 'oro'), card(3, 'copa'), card(2, 'espada')];
    const hands = { ...base.hands, 1: strongHand } as const;

    renderTableStateWithDelay(rigGame({ hands, dealtHands: hands }), 10);

    await user.click(screen.getByRole('button', { name: 'Cantar Truco' }));

    const dialog = await screen.findByRole('dialog', { name: 'El Catire cantó Retruco' });

    expect(within(dialog).getByText('En juego: 6 piedras.')).toBeVisible();
    expect(screen.getByText('El Catire: Quiero y Retruco · Truco.')).toBeVisible();
  });
});

describe('the truco response dialog', () => {
  it('shows the caller, the call and the proposed stake, and traps focus', async () => {
    const user = userEvent.setup();
    renderTableState(pendingRetruco());

    const dialog = screen.getByRole('dialog', { name: 'El Catire cantó Retruco' });
    const accept = within(dialog).getByRole('button', { name: 'Querer el Retruco' });
    const decline = within(dialog).getByRole('button', { name: 'No querer el Retruco' });
    const raise = within(dialog).getByRole('button', { name: 'Querer y cantar Vale nueve' });

    expect(within(dialog).getByText('En juego: 6 piedras.')).toBeVisible();
    expect(accept).toHaveFocus();

    await user.tab();
    expect(decline).toHaveFocus();

    await user.tab();
    expect(raise).toHaveFocus();

    await user.tab();
    expect(accept).toHaveFocus();

    await user.click(accept);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('group', { name: 'En juego: 6 piedras' })).toBeVisible();
  });

  it('declines the call, ends the reparto and explains the payout', async () => {
    const user = userEvent.setup();
    renderTableState(pendingRetruco());

    const dialog = screen.getByRole('dialog', { name: 'El Catire cantó Retruco' });
    await user.click(within(dialog).getByRole('button', { name: 'No querer el Retruco' }));

    const summary = await screen.findByRole('dialog', { name: 'Ganó Ellos' });

    expect(within(summary).getByText('No quisieron el canto')).toBeVisible();
    expect(within(summary).getByText('Truco querido')).toBeVisible();
    expect(within(summary).getAllByText('3 piedras').length).toBeGreaterThan(0);
  });

  it('raises the call and leaves the rivals to answer', async () => {
    const user = userEvent.setup();
    renderTableState(pendingRetruco());

    const dialog = screen.getByRole('dialog', { name: 'El Catire cantó Retruco' });
    await user.click(within(dialog).getByRole('button', { name: 'Querer y cantar Vale nueve' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Los rivales están decidiendo…')).toBeVisible();
    expect(screen.getByText('Quiero y Vale nueve · Retruco.')).toBeVisible();
    expect(screen.getByRole('group', { name: 'En juego: 6 piedras' })).toBeVisible();
  });

  it('speaks the call and the answer in English', () => {
    renderTableStateInEnglish(pendingRetruco());

    const dialog = screen.getByRole('dialog', { name: 'El Catire called Retruco' });

    expect(within(dialog).getByText('At stake: 6 piedras.')).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Accept the Retruco' })).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Decline the Retruco' })).toBeVisible();
    expect(
      within(dialog).getByRole('button', { name: 'Accept and call Vale nueve' }),
    ).toBeVisible();
  });

  it('offers the next call in English on the human turn', () => {
    renderTableStateInEnglish(rigGame({ truco: { level: 1, acceptedByTeam: 'nosotros' } }));

    expect(screen.getByRole('button', { name: 'Call Retruco' })).toBeVisible();
  });
});

describe('the hand summary', () => {
  it('shows the winner, the stake, the bazas and all four hands, then starts the next reparto', async () => {
    const user = userEvent.setup();
    const finished = playToHandOver('resumen-12');
    const winner = finished.result?.winnerTeam ?? 'nosotros';
    const winnerName = winner === 'nosotros' ? 'Nosotros' : 'Ellos';
    const total = finished.result?.totalPoints ?? 1;
    const pointsLabel =
      finished.result?.points === 'match'
        ? 'La partida'
        : total === 1
          ? '1 piedra'
          : `${total} piedras`;

    renderTableState(finished);

    const dialog = screen.getByRole('dialog', { name: `Ganó ${winnerName}` });

    expect(within(dialog).getAllByText(pointsLabel).length).toBeGreaterThan(0);
    expect(within(dialog).getByText('Las bazas')).toBeVisible();
    expect(within(dialog).getByText('Las manos sobre la mesa')).toBeVisible();
    expect(dialog.querySelector('.summary__talk')).not.toBeNull();

    for (const name of ['Tú', 'El Catire', 'El Pana', 'La Comadre']) {
      expect(within(dialog).getAllByText(name).length).toBeGreaterThan(0);
    }

    expect(within(dialog).getAllByText(/^(PERICO|PERICA)$/).length).toBeGreaterThan(0);

    const next = within(dialog).getByRole('button', { name: 'Siguiente reparto' });
    expect(next).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog', { name: `Ganó ${winnerName}` })).toBeVisible();

    await user.click(next);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    const hand = screen.getByRole('region', { name: 'Tu mano' });
    expect(within(hand).getAllByRole('button', { name: /^Jugar / })).toHaveLength(3);
    expect(screen.getByRole('region', { name: winnerName })).toBeVisible();
  });

  it('summarizes the match with hands, envidos, flores and trucos for each team', () => {
    const finished = matchPoint();

    expect(finished.phase).toBe('matchOver');
    renderTableState(finished);

    const dialog = screen.getByRole('dialog', { name: 'Ganó la partida Nosotros' });
    const rows = dialog.querySelectorAll('.summary__match-stats tbody tr');

    expect(within(dialog).getByText('La partida en números')).toBeVisible();
    expect(within(dialog).getByRole('columnheader', { name: 'Manos' })).toBeVisible();
    expect(within(dialog).getByRole('columnheader', { name: 'Envidos' })).toBeVisible();
    expect(within(dialog).getByRole('columnheader', { name: 'Flores' })).toBeVisible();
    expect(within(dialog).getByRole('columnheader', { name: 'Trucos' })).toBeVisible();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(/Nosotros\s*1\s*0\s*0\s*1/);
    expect(rows[1]).toHaveTextContent(/Ellos\s*0\s*0\s*0\s*0/);
  });

  it('opens the rules and the settings from the summary and returns focus', async () => {
    const user = userEvent.setup();
    const finished = playToHandOver('resumen-ajustes');

    renderTableState(finished);

    const summary = screen.getByRole('dialog', { name: /^Ganó/ });
    const rulesButton = within(summary).getByRole('button', { name: 'Ver reglas' });

    await user.click(rulesButton);

    const rules = await screen.findByRole('dialog', { name: 'La escuela de reglas' });
    expect(rules).toBeVisible();

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'La escuela de reglas' }),
      ).not.toBeInTheDocument(),
    );
    expect(rulesButton).toHaveFocus();

    const settingsButton = within(summary).getByRole('button', { name: 'Ajustes' });

    await user.click(settingsButton);

    expect(await screen.findByRole('dialog', { name: 'Ajustes' })).toBeVisible();

    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Ajustes' })).not.toBeInTheDocument(),
    );
    expect(settingsButton).toHaveFocus();
  });

  it('confirms the summary action with Enter when focus is not on a button', async () => {
    const user = userEvent.setup();
    const finished = playToHandOver('resumen-enter');

    renderTableState(finished);

    const summary = screen.getByRole('dialog', { name: /^Ganó/ });

    summary.focus();
    await user.keyboard('{Enter}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Reparto 2')).toBeVisible();
  });

  it('shows the accepted stake and the baza payout', () => {
    const finished = playBazaHand(rigBazaHand({ truco: { level: 2, acceptedByTeam: 'nosotros' } }));

    renderTableState(finished);

    const dialog = screen.getByRole('dialog', { name: 'Ganó Nosotros' });

    expect(within(dialog).getByText('Retruco querido')).toBeVisible();
    expect(within(dialog).getByText('Bazas ganadas')).toBeVisible();
    expect(within(dialog).getAllByText('6 piedras').length).toBeGreaterThan(0);
    expect(within(dialog).getByText('Las bazas')).toBeVisible();
  });

  it('shows both tantos when the envido was declined', () => {
    const base = rigLanceGame(ENVIDO_HANDS);
    const opened = reduce(base, { type: 'callEnvido', seat: 0 });
    const declined = reduce(opened, { type: 'respondEnvido', seat: 1, response: 'decline' });
    const finished = playOutUi(declined);

    expect(finished.phase).toBe('handOver');
    renderTableState(finished);

    const dialog = screen.getByRole('dialog');

    expect(within(dialog).getByText(/tantos 33–25/)).toBeVisible();
    expect(within(dialog).getByText('Envido')).toBeVisible();
  });

  it('shows a 24-piedra match winner and offers another partida', async () => {
    const user = userEvent.setup();
    const finished = matchPoint();

    expect(finished.phase).toBe('matchOver');
    expect(finished.scores).toEqual({ nosotros: 24, ellos: 10 });

    renderTableState(finished);

    const dialog = screen.getByRole('dialog', { name: 'Ganó la partida Nosotros' });

    expect(within(dialog).getByText('Partida cerrada')).toBeVisible();
    expect(within(dialog).queryByText('La partida')).not.toBeInTheDocument();
    expect(within(dialog).getByText('Nosotros 24 · Ellos 10')).toBeVisible();
    expect(within(dialog).getByText('Las bazas')).toBeVisible();
    expect(within(dialog).getByText('Las manos sobre la mesa')).toBeVisible();

    const rematch = within(dialog).getByRole('button', { name: 'Otra partida' });
    expect(rematch).toHaveFocus();
    await user.click(rematch);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    expect(screen.getByText('Reparto 1')).toBeVisible();
    expect(screen.getAllByRole('img', { name: '0 de 24 piedras' })).toHaveLength(2);

    const hand = screen.getByRole('region', { name: 'Tu mano' });
    expect(within(hand).getAllByRole('button', { name: /^Jugar / })).toHaveLength(3);
  });
});

describe('the envido dialog', () => {
  it('shows the caller, the call and the stake, and traps focus', async () => {
    const user = userEvent.setup();
    renderTableState(pendingEnvido());

    const dialog = screen.getByRole('dialog', { name: 'El Catire cantó Envido' });
    const accept = within(dialog).getByRole('button', { name: 'Querer el Envido' });
    const decline = within(dialog).getByRole('button', { name: 'No querer el Envido' });
    const raise = within(dialog).getByRole('button', { name: 'Quiero y 5 piedras más' });

    expect(within(dialog).getByText('En juego: 4 piedras.')).toBeVisible();
    expect(
      within(dialog).getByText('Si no quieres, los cantores se llevan 2 piedras.'),
    ).toBeVisible();
    expect(accept).toHaveFocus();

    await user.tab();
    expect(decline).toHaveFocus();

    await user.tab();
    expect(raise).toHaveFocus();

    await user.tab();
    expect(accept).toHaveFocus();
  });

  it('accepts the envido, closes the dialog and leaves the turn on the table', async () => {
    const user = userEvent.setup();
    renderTableState(pendingEnvido());

    const dialog = screen.getByRole('dialog', { name: 'El Catire cantó Envido' });
    await user.click(within(dialog).getByRole('button', { name: 'Querer el Envido' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Envido querido · 4 piedras')).toBeVisible();
    expect(screen.getByText('Quiero · Envido.')).toBeVisible();
    expect(screen.getByText('Tu turno')).toBeVisible();
  });

  it('declines the envido and keeps the reparto alive', async () => {
    const user = userEvent.setup();
    renderTableState(pendingEnvido());

    const dialog = screen.getByRole('dialog', { name: 'El Catire cantó Envido' });
    await user.click(within(dialog).getByRole('button', { name: 'No querer el Envido' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Envido no querido · 2 para los cantores')).toBeVisible();
    expect(screen.getByText('No quiero · Envido.')).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('raises the envido and leaves the rivals to answer', async () => {
    const user = userEvent.setup();
    renderTableState(pendingEnvido());

    const dialog = screen.getByRole('dialog', { name: 'El Catire cantó Envido' });
    await user.click(within(dialog).getByRole('button', { name: 'Quiero y 5 piedras más' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Los rivales están decidiendo…')).toBeVisible();
    expect(screen.getByText('Quiero y 5 piedras más · Envido.')).toBeVisible();
  });

  it('speaks the envido dialog in English', () => {
    renderTableStateInEnglish(pendingEnvido());

    const dialog = screen.getByRole('dialog', { name: 'El Catire called Envido' });

    expect(within(dialog).getByText('At stake: 4 piedras.')).toBeVisible();
    expect(within(dialog).getByText('Declining pays the callers 2 piedras.')).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Accept the Envido' })).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Decline the Envido' })).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Quiero y 5 piedras más' })).toBeVisible();
  });
});

describe('the flor and prive calls', () => {
  it('declares a flor with a bubble, a log line and a pending chip', async () => {
    const user = userEvent.setup();
    renderTableState(rigLanceGame(FLOR_HANDS));

    const call = screen.getByRole('button', { name: 'Cantar flor' });
    await user.click(call);

    expect(screen.queryByRole('button', { name: 'Cantar flor' })).not.toBeInTheDocument();
    expect(screen.getByText('¡Flor!')).toBeVisible();
    expect(screen.getByText('Cantaste flor.')).toBeVisible();
    expect(screen.getByText('Flor +3 al cerrar la primera baza')).toBeVisible();
    expect(screen.getAllByRole('img', { name: '0 de 24 piedras' })).toHaveLength(2);
  });

  it('calls prive at 23, pays immediately and closes envido', async () => {
    const user = userEvent.setup();
    renderTableState(rigLanceGame(PRIVE_HANDS, { scores: { nosotros: 23, ellos: 20 } }));

    const call = screen.getByRole('button', { name: 'Cantar prive' });
    expect(screen.getByRole('button', { name: 'Cantar envido' })).toBeVisible();

    await user.click(call);

    expect(screen.queryByRole('button', { name: 'Cantar prive' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cantar envido' })).not.toBeInTheDocument();
    expect(screen.getByText('Prive +1 · tantos 31–33')).toBeVisible();
    expect(screen.getByText('Cantaste prive.')).toBeVisible();
    expect(screen.getByRole('img', { name: '21 de 24 piedras' })).toBeVisible();
    expect(screen.getByRole('region', { name: 'Tu mano' })).toBeVisible();
  });

  it('offers flor while answering an envido and cancels the envido', async () => {
    const user = userEvent.setup();
    const base = rigLanceGame(FLOR_HANDS, { turn: 1, lead: 1 });
    const called = reduce(base, { type: 'callEnvido', seat: 1 });

    renderTableState(called);

    const dialog = screen.getByRole('dialog', { name: 'El Catire cantó Envido' });
    const flor = within(dialog).getByRole('button', { name: 'Cantar flor' });

    await user.click(flor);

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByText('Cantaste flor.')).toBeVisible();
    expect(screen.getByText('Flor +3 al cerrar la primera baza')).toBeVisible();
  });
});

describe('quemar in the interface', () => {
  it('arms the toggle, plays the next card face down and resets', async () => {
    const user = userEvent.setup();
    renderMesa('quemar-toggle');

    const hand = screen.getByRole('region', { name: 'Tu mano' });
    const toggle = screen.getByRole('button', {
      name: 'Quemar la próxima carta (jugar boca abajo)',
    });

    expect(toggle).toHaveAttribute('aria-pressed', 'false');

    await user.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(toggle).toHaveTextContent('Boca abajo');

    await user.click(within(hand).getAllByRole('button', { name: /^Jugar / })[0]);

    const trick = screen.getByRole('group', { name: 'Baza 1 en curso' });
    expect(within(trick).getByRole('img', { name: 'Carta quemada' })).toBeVisible();
    expect(within(trick).getByText('Carta boca abajo')).toBeVisible();
    expect(screen.getByText('Quemas una carta boca abajo.')).toBeVisible();
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('arms the toggle with B and plays with 1', async () => {
    const user = userEvent.setup();
    renderMesa('quemar-teclado');

    const toggle = screen.getByRole('button', {
      name: 'Quemar la próxima carta (jugar boca abajo)',
    });

    await user.keyboard('b');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');

    await user.keyboard('1');

    const trick = screen.getByRole('group', { name: 'Baza 1 en curso' });
    expect(within(trick).getByRole('img', { name: 'Carta quemada' })).toBeVisible();
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
  });

  it('reveals the burned card in the summary', () => {
    const state = rigLanceGame(ENVIDO_HANDS);
    const afterBurn = reduce(state, {
      type: 'playCard',
      seat: 0,
      cardKey: cardKey(ENVIDO_HANDS[0][0]),
      burned: true,
    });
    const finished = playOutUi(afterBurn);

    expect(finished.phase).toBe('handOver');
    renderTableState(finished);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('quemada')).toBeVisible();
    expect(within(dialog).getAllByText('Las manos sobre la mesa').length).toBeGreaterThan(0);
  });
});

describe('the itemized summary', () => {
  function florAndTrucoHand(): GameState {
    const state = rigLanceGame(FLOR_HANDS, {
      truco: { level: 1, acceptedByTeam: 'nosotros' },
    });
    const declared = reduce(state, { type: 'callFlor', seat: 0 });
    const afterFirst = playFirstBazaUi(declared);

    return playOutUi(afterFirst);
  }

  function envidoAndTrucoHand(): GameState {
    const state = rigLanceGame(ENVIDO_HANDS, {
      truco: { level: 1, acceptedByTeam: 'nosotros' },
    });
    const opened = reduce(state, { type: 'callEnvido', seat: 0 });
    const accepted = reduce(opened, { type: 'respondEnvido', seat: 1, response: 'accept' });

    return playOutUi(accepted);
  }

  it('lists flor and truco with a total in Spanish', () => {
    const finished = florAndTrucoHand();

    expect(finished.phase).toBe('handOver');
    renderTableState(finished);

    const dialog = screen.getByRole('dialog');

    expect(within(dialog).getByText('Cada piedra, con su cuenta')).toBeVisible();
    expect(within(dialog).getByText('Fuente')).toBeVisible();
    expect(within(dialog).getByText('Total del reparto')).toBeVisible();
    expect(within(dialog).getAllByText('+3')).toHaveLength(2);
    expect(within(dialog).getByText('+6')).toBeVisible();
    expect(within(dialog).getByText('tantos 38–0')).toBeVisible();
    expect(within(dialog).getByText('Las bazas')).toBeVisible();
  });

  it('renders exactly one ledger row per settlement and no duplicate account block', () => {
    const finished = florAndTrucoHand();

    renderTableState(finished);

    const dialog = screen.getByRole('dialog');
    const ledgerRows = dialog.querySelectorAll('.summary__statement tbody tr');

    expect(ledgerRows).toHaveLength(finished.result?.settlements.length ?? 0);
    expect(ledgerRows.length).toBeGreaterThan(0);
    expect(within(dialog).queryByText('La cuenta')).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/piedras en la mesa/)).not.toBeInTheDocument();
    expect(within(dialog).getByText('Flor')).toBeVisible();
  });

  it('names both teams when a settlement splits the points', () => {
    const finished = florAndTrucoHand();
    const view = viewFor(finished, 0);
    const result = view.result;

    expect(result).not.toBeNull();

    if (!result) {
      throw new Error('The hand should have a result.');
    }

    const splitView: GameView = {
      ...view,
      result: {
        ...result,
        winnerTeam: 'ellos',
        settlements: [
          {
            kind: 'flor',
            team: 'nosotros',
            points: 3,
            tantos: { nosotros: 38, ellos: 0 },
          },
          { kind: 'truco', team: 'ellos', points: 3, detail: 'bazas' },
        ],
        totalPoints: 6,
      },
    };

    render(
      <LocaleProvider>
        <HandSummary
          view={splitView}
          stats={EMPTY_CAREER}
          onNextHand={vi.fn()}
          onRematch={vi.fn()}
          onOpenRules={vi.fn()}
          onOpenSettings={vi.fn()}
        />
      </LocaleProvider>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Ganó Ellos' });
    const rows = dialog.querySelectorAll('.summary__statement tbody tr');

    expect(within(dialog).getByText('+6')).toBeVisible();
    expect(within(dialog).queryByText(/piedras en la mesa/)).not.toBeInTheDocument();
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Nosotros');
    expect(rows[1]).toHaveTextContent('Ellos');
  });

  it('shows the career line when a partida ends', async () => {
    const finished = matchPoint();

    expect(finished.phase).toBe('matchOver');

    renderTableState(finished);

    const dialog = screen.getByRole('dialog', { name: 'Ganó la partida Nosotros' });

    expect(
      await within(dialog).findByText(/Tu carrera: 1 partida · 1 ganada · \d+ mano(?:s)?/),
    ).toBeVisible();
  });

  it('lists envido and truco with the tantos in English', () => {
    const finished = envidoAndTrucoHand();

    expect(finished.phase).toBe('handOver');
    renderTableStateInEnglish(finished);

    const dialog = screen.getByRole('dialog');

    expect(within(dialog).getByText('Every piedra, itemized')).toBeVisible();
    expect(within(dialog).getByText('Source')).toBeVisible();
    expect(within(dialog).getByText('Total of the deal')).toBeVisible();
    expect(within(dialog).getByText(/tantos 33–25/)).toBeVisible();
    expect(within(dialog).getByText('+2')).toBeVisible();
    expect(within(dialog).getAllByText('+3')).toHaveLength(1);
    expect(within(dialog).getByText('+5')).toBeVisible();
  });

  it('shows a flor ended partida and offers a rematch', () => {
    const state = rigLanceGame(FLOR_HANDS, { scores: { nosotros: 22, ellos: 10 } });
    const declared = reduce(state, { type: 'callFlor', seat: 0 });
    const finished = playFirstBazaUi(declared);

    expect(finished.phase).toBe('matchOver');
    renderTableState(finished);

    const dialog = screen.getByRole('dialog', { name: 'Ganó la partida Nosotros' });

    expect(within(dialog).getByText('Partida cerrada')).toBeVisible();
    expect(within(dialog).getByText('La flor')).toBeVisible();
    expect(within(dialog).getByText('Nosotros 24 · Ellos 10')).toBeVisible();
    expect(within(dialog).getByText(/La última mano · \+2/)).toBeVisible();
    expect(within(dialog).getAllByText('+2').length).toBeGreaterThan(0);
    expect(within(dialog).getByRole('button', { name: 'Otra partida' })).toBeVisible();
  });

  it('names the reservada in the flor comparison instead of a numeric weight', () => {
    const state = rigLanceGame(RESERVADA_HANDS);
    const ours = reduce(state, { type: 'callFlor', seat: 0 });
    const afterOurCard = reduce(ours, {
      type: 'playCard',
      seat: 0,
      cardKey: cardKey(RESERVADA_HANDS[0][0]),
    });
    const theirs = reduce(afterOurCard, { type: 'callFlor', seat: 1 });
    const afterFirst = playFirstBazaUi(theirs);
    const finished = playOutUi(afterFirst);

    expect(finished.phase).toBe('handOver');
    renderTableState(finished);

    const dialog = screen.getByRole('dialog');

    expect(within(dialog).getByText('Flor reservada')).toBeVisible();
    expect(within(dialog).getByText('tantos 38–reservada')).toBeVisible();
  });
});
