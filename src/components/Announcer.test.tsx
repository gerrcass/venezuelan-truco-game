import { render, screen, waitFor } from '@testing-library/react';

import { LocaleProvider } from '../content/LocaleProvider';
import { createGame, viewFor } from '../engine/game';
import type { GameView } from '../engine/types';
import { Announcer } from './Announcer';

function viewWith(event: GameView['event'], locale: 'es' | 'en' = 'es') {
  const base = viewFor(createGame({ seed: 'anuncio' }), 0);

  return { view: { ...base, event }, locale };
}

describe('the table announcer', () => {
  it('announces a hand result politely', async () => {
    const { view, locale } = viewWith({
      type: 'handEnded',
      winnerTeam: 'ellos',
      points: 3,
      reason: 'bazas',
    });

    render(
      <LocaleProvider initialLocale={locale}>
        <Announcer view={view} />
      </LocaleProvider>,
    );

    const status = screen.getByRole('status', { name: 'Anuncios de la mesa' });

    await waitFor(() => expect(status).toHaveTextContent('Ellos se llevan el reparto: 3 piedras.'));
  });

  it('announces a settlement with its source and tantos', async () => {
    const { view, locale } = viewWith({
      type: 'pointsAwarded',
      settlement: {
        kind: 'envido',
        team: 'nosotros',
        points: 4,
        detail: 'accepted',
        tantos: { nosotros: 31, ellos: 27 },
      },
    });

    render(
      <LocaleProvider initialLocale={locale}>
        <Announcer view={view} />
      </LocaleProvider>,
    );

    const status = screen.getByRole('status', { name: 'Anuncios de la mesa' });

    await waitFor(() =>
      expect(status).toHaveTextContent('Nosotros +4 (Envido · querido · tantos 31–27).'),
    );
  });

  it('speaks the match result in English', async () => {
    const { view, locale } = viewWith({ type: 'matchEnded', winnerTeam: 'ellos' }, 'en');

    render(
      <LocaleProvider initialLocale={locale}>
        <Announcer view={view} />
      </LocaleProvider>,
    );

    const status = screen.getByRole('status', { name: 'Table announcements' });

    await waitFor(() => expect(status).toHaveTextContent('Them win the match.'));
  });
});
