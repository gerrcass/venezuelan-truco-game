import { expect, test, type Page } from '@playwright/test';

const JOURNEY_URL = '/?seed=e2e-mesa-0&fast=1&skipIntro=1&lang=es';

// The table is self-contained: fonts, art and sound all ship with the build.
// Fail loudly if a test ever reaches for an external host.
test.beforeEach(async ({ context }) => {
  await context.route('**/*', (route) => {
    const host = new URL(route.request().url()).hostname;

    return host === '127.0.0.1' || host === 'localhost' ? route.continue() : route.abort();
  });
});

function responseDialog(page: Page) {
  return page.getByRole('dialog', { name: /cantó|called/i });
}

function handSummary(page: Page) {
  return page.getByRole('dialog', { name: /^Ganó/ });
}

async function acceptResponseIfAsked(page: Page): Promise<boolean> {
  const dialog = responseDialog(page);

  if ((await dialog.count()) === 0) {
    return false;
  }

  const accept = dialog.getByRole('button', { name: /^(Querer el|Accept the)/ });

  if ((await accept.count()) > 0) {
    await accept.first().click();
    return true;
  }

  return false;
}

async function waitForHumanTurn(page: Page): Promise<void> {
  await expect(page.locator('.hand__card-button:not([disabled])').first()).toBeEnabled({
    timeout: 15_000,
  });
}

/**
 * Let the bots finish their sequence and answer any call aimed at the human.
 * The table is stable once the human's hand is playable and no call is pending.
 */
async function settleTable(page: Page): Promise<void> {
  for (let step = 0; step < 40; step += 1) {
    if (await acceptResponseIfAsked(page)) {
      await page.waitForTimeout(100);
      continue;
    }

    if ((await page.locator('.hand__card-button:not([disabled])').count()) > 0) {
      return;
    }

    await page.waitForTimeout(100);
  }

  throw new Error('the table did not settle on the human turn');
}

async function playFirstCard(page: Page): Promise<void> {
  await waitForHumanTurn(page);
  const before = await page.locator('.hand__card-button').count();

  await page.locator('.hand__card-button:not([disabled])').first().click();

  await expect(page.locator('.hand__card-button')).toHaveCount(before - 1);
}

async function playCardWithKeyboard(page: Page): Promise<void> {
  await waitForHumanTurn(page);
  const before = await page.locator('.hand__card-button').count();

  await page.keyboard.press('1');

  await expect(page.locator('.hand__card-button')).toHaveCount(before - 1);
}

test.describe('la mesa de producción', () => {
  test('recorre un reparto completo, las reglas, el idioma y el teléfono', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(`console: ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => {
      errors.push(`pageerror: ${error.message}`);
    });

    await page.goto(JOURNEY_URL);

    // 1. The shell: brand, scoreboard, four seats and three hand cards.
    await expect(page.getByRole('heading', { name: "Truco e' Piedra", level: 1 })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Marcador' })).toBeVisible();

    for (const persona of ['Tú', 'El Catire', 'El Pana', 'La Comadre']) {
      await expect(page.getByRole('article', { name: persona })).toBeVisible();
    }

    await expect(page.getByRole('list', { name: 'Tu mano' }).getByRole('button')).toHaveCount(3);

    // 2. Call envido before the first card. The bots answer; if the table
    // asks the human's team, accept the call so the journey continues.
    await page.getByRole('button', { name: 'Cantar envido' }).click();
    await expect(page.getByRole('list', { name: 'Registro de la mesa' })).toContainText(
      'Cantaste Envido.',
    );

    await expect
      .poll(
        async () =>
          (await responseDialog(page).count()) > 0 ||
          (await page.locator('.log__entry--respond').count()) > 0,
        { message: 'the envido should be answered by the table' },
      )
      .toBe(true);

    await acceptResponseIfAsked(page);
    await expect(page.getByRole('list', { name: 'Registro de la mesa' })).toContainText(
      /El Catire: (Quiero|No quiero) · Envido/,
    );

    // 3. One card by click, then one by keyboard. The bots answer both.
    await playFirstCard(page);
    await expect(page.locator('.log__entry--play')).not.toHaveCount(0);

    await expect
      .poll(
        async () =>
          (await responseDialog(page).count()) > 0 ||
          (await page.locator('.hand__card-button:not([disabled])').count()) > 0,
        { message: 'the table should answer or hand the turn back' },
      )
      .toBe(true);
    await acceptResponseIfAsked(page);

    await playCardWithKeyboard(page);

    // 4. Walk the rest of the reparto to the summary. Every prompt gets a
    // legal answer; every human turn gets a card.
    for (let step = 0; step < 40; step += 1) {
      if ((await handSummary(page).count()) > 0) {
        break;
      }

      if (await acceptResponseIfAsked(page)) {
        await page.waitForTimeout(100);
        continue;
      }

      const playable = page.locator('.hand__card-button:not([disabled])');

      if ((await playable.count()) > 0) {
        await playable.first().click();
        await page.waitForTimeout(120);
        continue;
      }

      await page.waitForTimeout(100);
    }

    // 5. The itemized ledger, the bazas, all four hands and the next deal.
    const summary = handSummary(page);
    await expect(summary).toBeVisible();

    const ledgerRows = summary.locator('tbody tr');
    expect(await ledgerRows.count()).toBeGreaterThan(0);
    await expect(ledgerRows.first()).toContainText('+');
    await expect(summary.getByText('Total del reparto')).toBeVisible();
    await expect(summary.getByText('Las bazas')).toBeVisible();
    await expect(summary.getByText('Baza 1')).toBeVisible();

    for (const persona of ['Tú', 'El Catire', 'El Pana', 'La Comadre']) {
      await expect(summary.getByText(persona, { exact: true }).first()).toBeVisible();
    }

    await expect(summary.getByRole('button', { name: 'Siguiente reparto' })).toBeVisible();
    await summary.getByRole('button', { name: 'Siguiente reparto' }).click();
    await expect(summary).toBeHidden();
    await expect(page.locator('.statusline')).toContainText('Reparto 2');
    await expect(page.getByRole('list', { name: 'Tu mano' }).getByRole('button')).toHaveCount(3);

    // The next deal is live. Let the bots take their first actions (and answer
    // any truco they call) before opening a modal, so the table is stable.
    await settleTable(page);
    await expect(page.locator('.statusline')).toContainText('Reparto 2');

    // 6. The rules school: the envido tab must show its ladder table, and
    // Escape must return focus to the trigger that opened it.
    const rulesTrigger = page.getByRole('button', { name: 'Abrir la escuela de reglas' });
    await rulesTrigger.click();

    const rules = page.getByRole('dialog', { name: 'La escuela de reglas' });
    await expect(rules).toBeVisible();

    await rules.getByRole('tab', { name: 'Envido', exact: true }).click();

    const envidoPanel = rules.getByRole('tabpanel');
    await expect(envidoPanel).toBeVisible();
    await expect(envidoPanel.getByRole('table')).toBeVisible();
    await expect(envidoPanel.getByText('La escalera del envido')).toBeVisible();
    await expect(
      envidoPanel.getByText('Dos cartas del mismo palo: 20 + sus dos valores.'),
    ).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(rules).toBeHidden();
    await expect(rulesTrigger).toBeFocused();

    // 7. English and back. The topbar, rules and hand labels must change.
    await page.getByRole('button', { name: 'Ver la mesa en inglés (EN)' }).click();
    await expect(page.getByRole('button', { name: 'Open the rules school' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your hand' })).toBeVisible();
    await expect(page.locator('.brand__tagline')).toHaveText('A 24-piedra table');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');

    await page.getByRole('button', { name: 'View the table in Spanish (ES)' }).click();
    await expect(page.getByRole('button', { name: 'Abrir la escuela de reglas' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Tu mano' })).toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');

    // 8. A 360 px phone: no horizontal scroll and the playable table still
    // reachable. The topbar controls must stay inside the viewport.
    await page.setViewportSize({ width: 360, height: 800 });

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
      'the table must not scroll sideways at 360 px',
    ).toBeLessThanOrEqual(360);

    await expect(page.getByRole('list', { name: 'Tu mano' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Cantos' })).toBeVisible();

    for (const control of [
      'Abrir la escuela de reglas',
      'Abrir los ajustes de la mesa',
      'Silenciar sonido',
      'Idioma',
    ]) {
      const target =
        control === 'Idioma'
          ? page.getByRole('group', { name: 'Idioma' })
          : page.getByRole('button', { name: control });

      const box = await target.boundingBox();

      expect(box, `${control} should have a box`).not.toBeNull();
      expect(box!.x + box!.width, `${control} should fit on the phone`).toBeLessThanOrEqual(360);
    }

    expect(errors).toEqual([]);
  });

  test('el tutorial aparece una vez y Jugar lo cierra', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        errors.push(`console: ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => {
      errors.push(`pageerror: ${error.message}`);
    });

    await page.goto('/?seed=e2e-welcome&fast=1&lang=es');

    const welcome = page.getByRole('dialog', { name: 'Tres cartas, una mesa, 24 piedras' });
    await expect(welcome).toBeVisible();
    await expect(welcome.getByRole('button', { name: 'Jugar' })).toBeVisible();

    await welcome.getByRole('button', { name: 'Jugar' }).click();
    await expect(welcome).toBeHidden();

    await page.reload();
    await expect(page.getByRole('heading', { name: "Truco e' Piedra", level: 1 })).toBeVisible();
    await expect(welcome).toBeHidden();

    expect(errors).toEqual([]);
  });
});
