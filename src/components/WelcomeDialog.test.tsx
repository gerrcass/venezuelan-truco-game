import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '../App';

const SEED = 'bienvenida';

function renderApp(path = `/?seed=${SEED}`) {
  window.history.replaceState({}, '', path);
  return render(<App />);
}

function firstVisit() {
  window.localStorage.removeItem('truco.welcomeSeen');
}

describe('the first-visit welcome', () => {
  it('shows three steps once, focuses Jugar and remembers the visit', async () => {
    const user = userEvent.setup();
    firstVisit();

    const first = renderApp();
    const dialog = screen.getByRole('dialog', {
      name: 'Tres cartas, una mesa, 24 piedras',
    });

    expect(within(dialog).getByText('Tienes tres cartas')).toBeVisible();
    expect(within(dialog).getByText('Gana dos de tres bazas')).toBeVisible();
    expect(
      within(dialog).getByText('Canta envido, flor y truco para subir la apuesta'),
    ).toBeVisible();
    expect(within(dialog).getByText(/El primero en llegar a 24 piedras gana/)).toBeVisible();

    const play = within(dialog).getByRole('button', { name: 'Jugar' });
    expect(play).toHaveFocus();

    await user.click(play);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('truco.welcomeSeen')).toBe('1');

    first.unmount();
    renderApp();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('respects ?skipIntro=1 without marking the visit as seen', () => {
    firstVisit();
    renderApp(`/?seed=${SEED}&skipIntro=1`);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('truco.welcomeSeen')).toBeNull();
  });

  it('traps focus, closes with Escape and opens the full rules school', async () => {
    const user = userEvent.setup();
    firstVisit();
    const first = renderApp();

    const dialog = screen.getByRole('dialog');
    const play = within(dialog).getByRole('button', { name: 'Jugar' });
    const rules = within(dialog).getByRole('button', { name: 'Ver las reglas' });
    const close = within(dialog).getByRole('button', { name: 'Cerrar el tutorial' });

    expect(play).toHaveFocus();
    await user.tab();
    expect(rules).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab();
    expect(play).toHaveFocus();

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(window.localStorage.getItem('truco.welcomeSeen')).toBe('1');

    first.unmount();
    firstVisit();
    const second = renderApp();
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Ver las reglas' }),
    );

    expect(await screen.findByRole('dialog', { name: 'La escuela de reglas' })).toBeVisible();
    expect(within(screen.getByRole('dialog')).getByRole('tab', { name: 'La mesa' })).toHaveFocus();

    second.unmount();
  });

  it('speaks the welcome in English', () => {
    firstVisit();
    window.localStorage.setItem('truco.locale', 'en');
    renderApp();

    const dialog = screen.getByRole('dialog', {
      name: 'Three cards, one table, 24 piedras',
    });

    expect(within(dialog).getByText('You get three cards')).toBeVisible();
    expect(within(dialog).getByText('Win two of the three bazas')).toBeVisible();
    expect(
      within(dialog).getByText('Call envido, flor and truco to raise the stake'),
    ).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'Play' })).toBeVisible();
    expect(within(dialog).getByRole('button', { name: 'See the rules' })).toBeVisible();
  });
});
