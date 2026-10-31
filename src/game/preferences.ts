import { useSyncExternalStore } from 'react';

import { isBotSpeed, type BotSpeed } from '../domain/preferences';

const SOUND_KEY = 'truco.sound';
const SPEED_KEY = 'truco.speed';
const WELCOME_KEY = 'truco.welcomeSeen';

export interface Preferences {
  readonly sound: boolean;
  readonly speed: BotSpeed;
}

function readPreferences(): Preferences {
  try {
    return {
      sound: window.localStorage.getItem(SOUND_KEY) !== 'off',
      speed: isBotSpeed(window.localStorage.getItem(SPEED_KEY))
        ? (window.localStorage.getItem(SPEED_KEY) as BotSpeed)
        : 'normal',
    };
  } catch {
    return { sound: true, speed: 'normal' };
  }
}

let snapshot = readPreferences();
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function persist(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Settings are optional; the table still works when storage is unavailable.
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

function getSnapshot(): Preferences {
  return snapshot;
}

export function setSoundPreference(sound: boolean): void {
  if (snapshot.sound === sound) {
    return;
  }

  snapshot = { ...snapshot, sound };
  persist(SOUND_KEY, sound ? 'on' : 'off');
  emit();
}

export function setSpeedPreference(speed: BotSpeed): void {
  if (snapshot.speed === speed) {
    return;
  }

  snapshot = { ...snapshot, speed };
  persist(SPEED_KEY, speed);
  emit();
}

/** Re-read storage. Used by the tests and when another tab changes the settings. */
export function resetPreferences(): void {
  snapshot = readPreferences();
  emit();
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function skipIntroFromUrl(): boolean {
  const value = new URLSearchParams(window.location.search).get('skipIntro');

  return value === '1' || value === 'true';
}

export function shouldShowWelcome(): boolean {
  if (skipIntroFromUrl()) {
    return false;
  }

  try {
    return window.localStorage.getItem(WELCOME_KEY) !== '1';
  } catch {
    return true;
  }
}

export function markWelcomeSeen(): void {
  persist(WELCOME_KEY, '1');
}
