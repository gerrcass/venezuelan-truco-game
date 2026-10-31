import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LocaleProvider } from '../content/LocaleProvider';
import type { Sena } from '../engine/types';
import { SenaPanel } from './SenaPanel';

const PERICO: Sena = { kind: 'perico', card: { rank: 11, suit: 'basto' } };

describe('El Pana’s seña panel', () => {
  it('invites the human, reveals on click and names the gesture and the card', async () => {
    const user = userEvent.setup();

    render(
      <LocaleProvider>
        <SenaPanel sena={PERICO} dealKey="seed:1" />
      </LocaleProvider>,
    );

    const trigger = screen.getByRole('button', { name: /La seña del Pana/ });

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveTextContent('El Pana te hace una seña');
    expect(screen.queryByRole('region', { name: 'La seña del Pana' })).not.toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveTextContent('Ocultar la seña');

    const panel = screen.getByRole('region', { name: 'La seña del Pana' });

    expect(panel).toHaveTextContent('Guiño del ojo derecho');
    expect(panel).toHaveTextContent(/Tiene el perico/);
    expect(panel).toHaveTextContent('El Pana te señala 11 de basto.');
  });

  it('collapses on the next reparto and on a rematch', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <LocaleProvider>
        <SenaPanel sena={PERICO} dealKey="seed:1" />
      </LocaleProvider>,
    );

    await user.click(screen.getByRole('button', { name: /La seña del Pana/ }));
    expect(screen.getByRole('region', { name: 'La seña del Pana' })).toBeVisible();

    rerender(
      <LocaleProvider>
        <SenaPanel sena={{ kind: 'none', card: null }} dealKey="seed:2" />
      </LocaleProvider>,
    );

    expect(screen.getByRole('button', { name: /La seña del Pana/ })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('region', { name: 'La seña del Pana' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /La seña del Pana/ }));
    expect(screen.getByRole('region', { name: 'La seña del Pana' })).toBeVisible();

    rerender(
      <LocaleProvider>
        <SenaPanel sena={PERICO} dealKey="otra-partida:1" />
      </LocaleProvider>,
    );

    expect(screen.queryByRole('region', { name: 'La seña del Pana' })).not.toBeInTheDocument();
  });

  it('speaks English and shrugs when there is nothing to signal', async () => {
    const user = userEvent.setup();

    render(
      <LocaleProvider initialLocale="en">
        <SenaPanel sena={{ kind: 'none', card: null }} dealKey="seed:1" />
      </LocaleProvider>,
    );

    const trigger = screen.getByRole('button', { name: /El Pana's seña/ });

    expect(trigger).toHaveTextContent('El Pana gives you a look');

    await user.click(trigger);

    const panel = screen.getByRole('region', { name: "El Pana's seña" });

    expect(panel).toHaveTextContent('A shrug');
    expect(panel).toHaveTextContent(/nothing to signal/);
    expect(panel).not.toHaveTextContent(/points to/);
  });
});
