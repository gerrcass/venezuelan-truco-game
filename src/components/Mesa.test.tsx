import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { chooseSimpleAction } from '../ai/simpleBot';
import { LocaleProvider } from '../content/LocaleProvider';
import { createGame, reduce, viewFor } from '../engine/game';
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

function renderSummary(state: GameState) {
  return render(
    <LocaleProvider>
      <GameProvider initialState={state} botDelayMs={SLOW_BOT}>
        <Mesa />
      </GameProvider>
    </LocaleProvider>,
  );
}

function playToHandOver(seed: string): GameState {
  let state = createGame({ seed });
  let guard = 0;

  while (state.phase === 'playing' && guard < 80) {
    guard += 1;
    state = reduce(state, chooseSimpleAction(viewFor(state, state.turn)));
  }

  expect(state.phase).toBe('handOver');
  return state;
}

function playToMatchOver(seed: string): GameState {
  let state = createGame({ seed, target: 1 });
  let guard = 0;

  while (state.phase === 'playing' && guard < 80) {
    guard += 1;
    state = reduce(state, chooseSimpleAction(viewFor(state, state.turn)));
  }

  expect(state.phase).toBe('matchOver');
  return state;
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
});

describe('the hand summary', () => {
  it('shows the winner, the bazas and all four hands, then starts the next reparto', async () => {
    const user = userEvent.setup();
    const finished = playToHandOver('resumen-12');
    const winner = finished.result?.winnerTeam ?? 'nosotros';
    const winnerName = winner === 'nosotros' ? 'Nosotros' : 'Ellos';

    renderSummary(finished);

    const dialog = screen.getByRole('dialog', { name: `Ganó ${winnerName}` });

    expect(within(dialog).getByText('1 piedra')).toBeVisible();
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

  it('shows the match winner and offers another partida', async () => {
    const user = userEvent.setup();
    const finished = playToMatchOver('partida-corta');
    const winner = finished.matchWinner ?? 'nosotros';
    const winnerName = winner === 'nosotros' ? 'Nosotros' : 'Ellos';

    renderSummary(finished);

    const dialog = screen.getByRole('dialog', { name: `Ganó la partida ${winnerName}` });

    expect(within(dialog).getByText('1 piedra')).toBeVisible();

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
