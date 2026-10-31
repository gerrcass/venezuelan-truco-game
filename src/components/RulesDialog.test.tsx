import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { LocaleProvider } from '../content/LocaleProvider';
import { RulesDialog } from './RulesDialog';

function renderRules(locale: 'es' | 'en' = 'es') {
  const onClose = vi.fn();
  const onOpenWelcome = vi.fn();

  render(
    <LocaleProvider initialLocale={locale}>
      <RulesDialog open onClose={onClose} onOpenWelcome={onOpenWelcome} />
    </LocaleProvider>,
  );

  return { onClose, onOpenWelcome };
}

describe('the rules school', () => {
  it('exposes the eight sections as a tablist and starts on La mesa', () => {
    renderRules();

    const dialog = screen.getByRole('dialog', { name: 'La escuela de reglas' });
    const tabs = within(dialog).getByRole('tablist', { name: 'Secciones de las reglas' });
    const tabNames = within(tabs)
      .getAllByRole('tab')
      .map((tab) => tab.textContent);

    expect(tabNames).toEqual([
      'La mesa',
      'La vira',
      'Envido',
      'Flor',
      'Truco',
      'Prive y quemar',
      'Señas',
      'Fuentes',
    ]);
    expect(within(tabs).getByRole('tab', { name: 'La mesa' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(within(tabs).getByRole('tab', { name: 'La mesa' })).toHaveFocus();
    expect(within(dialog).getByRole('tabpanel')).toHaveTextContent('Lo esencial');
    expect(within(dialog).getByRole('tabpanel')).toHaveTextContent('Sin ganar por dos');
  });

  it('switches sections by click and by arrow, Home and End', async () => {
    const user = userEvent.setup();
    renderRules();

    const tabs = screen.getByRole('tablist');
    await user.click(within(tabs).getByRole('tab', { name: 'Envido' }));

    expect(within(tabs).getByRole('tab', { name: 'Envido' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveTextContent('La escalera del envido');
    expect(panel).toHaveTextContent('Tres tantos de ejemplo');
    expect(panel).toHaveTextContent('35');
    expect(panel).toHaveTextContent('36');
    expect(panel).toHaveTextContent('33');

    await user.keyboard('{ArrowLeft}');
    expect(within(tabs).getByRole('tab', { name: 'La vira' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('De la más brava a la más floja');

    await user.keyboard('{Home}');
    expect(within(tabs).getByRole('tab', { name: 'La mesa' })).toHaveFocus();

    await user.keyboard('{End}');
    expect(within(tabs).getByRole('tab', { name: 'Fuentes' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Los acuerdos de esta mesa');

    const wikipedia = within(screen.getByRole('tabpanel')).getByRole('link', {
      name: 'Wikipedia: Truco venezolano',
    });
    expect(wikipedia).toHaveAttribute('href', 'https://es.wikipedia.org/wiki/Truco_venezolano');
    expect(wikipedia).toHaveAttribute('target', '_blank');
    expect(wikipedia).toHaveAttribute('rel', 'noreferrer');
  });

  it('shows the seña table with the real gestures', async () => {
    const user = userEvent.setup();
    renderRules();

    await user.click(screen.getByRole('tab', { name: 'Señas' }));

    const panel = screen.getByRole('tabpanel');
    expect(panel).toHaveTextContent('Guiño del ojo derecho');
    expect(panel).toHaveTextContent('Perico');
    expect(panel).toHaveTextContent('Punta de lengua a la derecha');
    expect(panel).toHaveTextContent('7 de espada');
    expect(panel).toHaveTextContent('Guiño izquierdo y luego derecho');
    expect(panel).toHaveTextContent('Flor reservada');
  });

  it('closes with the back button, Escape and the backdrop', async () => {
    const user = userEvent.setup();
    const { onClose, onOpenWelcome } = renderRules();
    const dialog = screen.getByRole('dialog');

    await user.click(within(dialog).getByRole('button', { name: 'Volver a la mesa' }));
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);

    fireEvent.mouseDown(document.querySelector('.modal') as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(3);

    await user.click(within(dialog).getByRole('button', { name: /Cómo se juega/ }));
    expect(onOpenWelcome).toHaveBeenCalledTimes(1);
  });

  it('speaks the whole school in English', async () => {
    const user = userEvent.setup();
    renderRules('en');

    const dialog = screen.getByRole('dialog', { name: 'The rules school' });

    expect(within(dialog).getByRole('tab', { name: 'The table' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(within(dialog).getByRole('tabpanel')).toHaveTextContent('The essentials');
    expect(within(dialog).getByRole('tabpanel')).toHaveTextContent('No win by two');

    await user.click(within(dialog).getByRole('tab', { name: 'Prive & burning' }));
    expect(within(dialog).getByRole('tabpanel')).toHaveTextContent('Prive is not a truco');
    expect(within(dialog).getByRole('tabpanel')).toHaveTextContent('Burning');
  });
});
