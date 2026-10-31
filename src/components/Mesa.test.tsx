import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { chooseSimpleAction } from '../ai/simpleBot';
import { LocaleProvider } from '../content/LocaleProvider';
import { cardKey, type Card, type Rank, type Suit } from '../domain/cards';
import { actingSeat, createGame, reduce, viewFor } from '../engine/game';
import type { GameState } from '../engine/types';
import { GameProvider } from '../game/GameProvider';
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

  while (state.phase !== 'handOver' && guard < 400) {
    guard += 1;

    if (state.phase === 'matchOver') {
      state = reduce(state, { type: 'rematch', seed: `${seed}-${guard}` });
      continue;
    }

    state = reduce(state, chooseSimpleAction(viewFor(state, actingSeat(state))));
  }

  expect(state.phase).toBe('handOver');
  return state;
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

    state = reduce(state, chooseSimpleAction(viewFor(state, actingSeat(state))));

    if (state.tricks.length > 0) {
      return state;
    }
  }

  throw new Error('The simulation never resolved a baza.');
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

    expect(screen.queryByRole('button', { name: /^Cantar / })).not.toBeInTheDocument();

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

    expect(within(dialog).getByText('At stake: 6 stones.')).toBeVisible();
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
    const points = finished.result?.points ?? 1;
    const pointsLabel =
      points === 'match' ? 'La partida' : points === 1 ? '1 piedra' : `${points} piedras`;

    renderTableState(finished);

    const dialog = screen.getByRole('dialog', { name: `Ganó ${winnerName}` });

    expect(within(dialog).getAllByText(pointsLabel).length).toBeGreaterThan(0);
    expect(within(dialog).getByText('Las bazas')).toBeVisible();
    expect(within(dialog).getByText('Las manos sobre la mesa')).toBeVisible();

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

  it('shows the accepted stake and the baza payout', () => {
    const finished = playBazaHand(rigBazaHand({ truco: { level: 2, acceptedByTeam: 'nosotros' } }));

    renderTableState(finished);

    const dialog = screen.getByRole('dialog', { name: 'Ganó Nosotros' });

    expect(within(dialog).getByText('Retruco querido')).toBeVisible();
    expect(within(dialog).getByText('Bazas ganadas')).toBeVisible();
    expect(within(dialog).getAllByText('6 piedras').length).toBeGreaterThan(0);
    expect(within(dialog).getByText('Las bazas')).toBeVisible();
  });

  it('shows a 24-piedra match winner and offers another partida', async () => {
    const user = userEvent.setup();
    const finished = matchPoint();

    expect(finished.phase).toBe('matchOver');
    expect(finished.scores).toEqual({ nosotros: 24, ellos: 10 });

    renderTableState(finished);

    const dialog = screen.getByRole('dialog', { name: 'Ganó la partida Nosotros' });

    expect(within(dialog).getByText('Partida cerrada')).toBeVisible();
    expect(within(dialog).getAllByText('La partida').length).toBeGreaterThan(0);
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
