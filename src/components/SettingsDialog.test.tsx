import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '../App';

const SEED = 'ajustes';

function renderApp() {
  window.history.replaceState({}, '', `/?seed=${SEED}`);
  return render(<App />);
}

async function openSettings() {
  const user = userEvent.setup();
  const trigger = screen.getByRole('button', { name: 'Abrir los ajustes de la mesa' });
  await user.click(trigger);

  return {
    user,
    trigger,
    dialog: screen.getByRole('dialog', { name: 'Ajustes' }),
  };
}

describe('the settings panel', () => {
  it('remembers language, sound and bot tempo and returns focus to the gear', async () => {
    renderApp();
    const { user, trigger, dialog } = await openSettings();

    expect(within(dialog).getByText('Idioma')).toBeVisible();
    expect(within(dialog).getByText('Ritmo de los bots')).toBeVisible();
    expect(within(dialog).getByText('Tu carrera')).toBeVisible();

    await user.click(within(dialog).getByRole('switch', { name: 'Sonido encendido' }));

    expect(within(dialog).getByRole('switch', { name: 'Sonido apagado' })).toBeVisible();
    expect(window.localStorage.getItem('truco.sound')).toBe('off');

    await user.click(within(dialog).getByRole('radio', { name: /Rápida/ }));

    expect(window.localStorage.getItem('truco.speed')).toBe('fast');
    expect(within(dialog).getByRole('radio', { name: /Rápida/ })).toBeChecked();

    await user.click(within(dialog).getByRole('button', { name: 'Ver la mesa en inglés (EN)' }));

    expect(within(dialog).getByText('Settings')).toBeVisible();
    expect(within(dialog).getByText('Bot tempo')).toBeVisible();
    expect(within(dialog).getByText('Your career')).toBeVisible();
    expect(window.localStorage.getItem('truco.locale')).toBe('en');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('reads career stats from storage and clears them with confirmation', async () => {
    window.localStorage.setItem(
      'truco.stats',
      JSON.stringify({
        matches: 3,
        wins: 2,
        losses: 1,
        hands: 12,
        envidos: 4,
        flores: 2,
      }),
    );
    renderApp();
    const { user, dialog } = await openSettings();

    for (const [label, value] of [
      ['Partidas', '3'],
      ['Ganadas', '2'],
      ['Perdidas', '1'],
      ['Manos', '12'],
      ['Envidos', '4'],
      ['Flores', '2'],
    ]) {
      const term = within(dialog).getByText(label);
      expect(term.parentElement).toHaveTextContent(new RegExp(`${label}\\s*${value}`));
    }

    await user.click(within(dialog).getByRole('button', { name: 'Borrar estadísticas' }));

    const confirm = within(dialog).getByRole('alert');
    expect(confirm).toHaveTextContent('¿Seguro? Esto borra tu carrera');

    await user.click(within(confirm).getByRole('button', { name: 'Sí, borrar' }));

    expect(window.localStorage.getItem('truco.stats')).toBeNull();
    expect(within(dialog).getByText(/Todavía no has cerrado una partida/)).toBeVisible();
    expect(within(dialog).getByRole('status')).toHaveTextContent('Carrera borrada');
  });

  it('does not clear anything when the confirmation is cancelled', async () => {
    window.localStorage.setItem(
      'truco.stats',
      JSON.stringify({ matches: 1, wins: 1, losses: 0, hands: 3, envidos: 0, flores: 0 }),
    );
    renderApp();
    const { user, dialog } = await openSettings();

    await user.click(within(dialog).getByRole('button', { name: 'Borrar estadísticas' }));
    await user.click(within(dialog).getByRole('button', { name: 'Cancelar' }));

    expect(window.localStorage.getItem('truco.stats')).not.toBeNull();
    expect(within(dialog).queryByRole('alert')).not.toBeInTheDocument();
  });
});
