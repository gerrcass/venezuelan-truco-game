import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

import { resetPreferences } from '../game/preferences';

beforeEach(() => {
  // Existing table tests start on a returning-player table. The welcome tests
  // remove this key to exercise the first visit.
  window.localStorage.setItem('truco.welcomeSeen', '1');
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  resetPreferences();
});
