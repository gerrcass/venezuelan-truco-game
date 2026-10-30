import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from './App';
import { LocaleProvider } from './content/LocaleProvider';
import { PlayingCard } from './components/PlayingCard';
import { SPANISH_DECK } from './domain/cards';

describe('the mesa shell', () => {
  it('serves the brand, the four seats and both 24-piedra scoreboards', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: /truco e' piedra/i })).toBeVisible();

    for (const name of ['Tú', 'El Catire', 'El Pana', 'La Comadre']) {
      expect(screen.getByRole('heading', { level: 3, name })).toBeVisible();
    }

    const nosotros = screen.getByRole('region', { name: 'Nosotros' });
    const ellos = screen.getByRole('region', { name: 'Ellos' });
    const ourPips = within(nosotros).getByRole('img', { name: '7 de 24 piedras' });
    const theirPips = within(ellos).getByRole('img', { name: '5 de 24 piedras' });

    expect(ourPips.querySelectorAll('[data-stone]')).toHaveLength(24);
    expect(theirPips.querySelectorAll('[data-stone]')).toHaveLength(24);
  });

  it('switches every label between Spanish and English', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(document.documentElement).toHaveAttribute('lang', 'es');
    expect(screen.getByRole('heading', { name: 'La mesa dice' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: /ver la mesa en inglés/i }));

    expect(document.documentElement).toHaveAttribute('lang', 'en');
    expect(screen.getByRole('heading', { name: 'You' })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'The table says' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Play a card' })).toBeVisible();
    expect(window.localStorage.getItem('truco.locale')).toBe('en');

    await user.click(screen.getByRole('button', { name: /view the table in spanish/i }));

    expect(screen.getByRole('heading', { name: 'Tú' })).toBeVisible();
  });

  it('toggles the sound preference and remembers it', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Silenciar sonido' }));

    expect(screen.getByRole('button', { name: 'Activar sonido' })).toBeVisible();
    expect(window.localStorage.getItem('truco.sound')).toBe('off');
  });

  it('opens the rules placeholder, traps focus and returns it to the trigger', async () => {
    const user = userEvent.setup();
    render(<App />);

    const trigger = screen.getByRole('button', { name: 'Abrir la escuela de reglas' });
    await user.click(trigger);

    const dialog = await screen.findByRole('dialog', { name: 'La escuela de reglas' });
    const close = within(dialog).getByRole('button', { name: 'Cerrar' });
    expect(close).toHaveFocus();

    await user.tab();
    const back = within(dialog).getByRole('button', { name: 'Volver a la mesa' });
    expect(back).toHaveFocus();

    await user.tab();
    expect(close).toHaveFocus();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('opens the log drawer and closes it with Escape', async () => {
    const user = userEvent.setup();
    render(<App />);

    const trigger = screen.getByRole('button', { name: 'Abrir La mesa dice' });
    await user.click(trigger);

    const drawer = await screen.findByRole('dialog', { name: 'La mesa dice' });
    expect(within(drawer).getByText('Te toca a ti. La mesa espera.')).toBeVisible();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});

describe('the Spanish deck', () => {
  it('renders all 40 faces with a unique accessible name', () => {
    render(
      <LocaleProvider>
        {SPANISH_DECK.map((card) => (
          <PlayingCard key={`${card.rank}-${card.suit}`} card={card} size="hand" />
        ))}
      </LocaleProvider>,
    );

    const cards = screen.getAllByRole('img');
    const names = cards.map((card) => card.getAttribute('aria-label'));

    expect(cards).toHaveLength(40);
    expect(new Set(names).size).toBe(40);
    expect(screen.getByRole('img', { name: '7 de espada' })).toBeVisible();
    expect(screen.getByRole('img', { name: '12 de basto (rey)' })).toBeVisible();
  });

  it('marks a perico and exposes face-down and burned states', () => {
    render(
      <LocaleProvider>
        <PlayingCard card={{ rank: 12, suit: 'basto' }} piece="perico" />
        <PlayingCard card={{ rank: 2, suit: 'copa' }} faceDown />
        <PlayingCard card={{ rank: 5, suit: 'oro' }} burned />
      </LocaleProvider>,
    );

    const perico = screen.getByRole('img', { name: '12 de basto (rey), PERICO' });
    expect(within(perico).getByText('PERICO')).toBeVisible();
    expect(screen.getByRole('img', { name: 'Carta boca abajo' })).toBeVisible();
    expect(screen.getByRole('img', { name: 'Carta quemada' })).toBeVisible();
  });
});
