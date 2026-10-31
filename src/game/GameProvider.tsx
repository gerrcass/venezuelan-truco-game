import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { chooseSimpleAction } from '../ai/simpleBot';
import { createGame, reduce, viewFor } from '../engine/game';
import type { GameAction, GameState } from '../engine/types';
import { GameContext } from './game-context';

const HUMAN_SEAT = 0;
const DEFAULT_BOT_DELAY = 800;
const FAST_BOT_DELAY = 60;

function seedFromUrl(): string | number | null {
  const value = new URLSearchParams(window.location.search).get('seed');

  if (value === null) {
    return null;
  }

  const numeric = Number(value);

  return value.trim() !== '' && Number.isFinite(numeric) ? numeric : value;
}

function fastFromUrl(): boolean {
  const value = new URLSearchParams(window.location.search).get('fast');

  return value === '1' || value === 'true';
}

function randomSeed(): number {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buffer = new Uint32Array(1);
    crypto.getRandomValues(buffer);
    return buffer[0];
  }

  return Date.now();
}

interface GameProviderProps {
  readonly seed?: string | number;
  readonly initialState?: GameState;
  readonly botDelayMs?: number;
}

export function GameProvider({
  children,
  seed,
  initialState,
  botDelayMs,
}: PropsWithChildren<GameProviderProps>) {
  const [state, setState] = useState<GameState>(
    () => initialState ?? createGame({ seed: seed ?? seedFromUrl() ?? randomSeed() }),
  );

  const dispatch = useCallback((action: GameAction) => {
    setState((current) => reduce(current, action));
  }, []);

  const delay = botDelayMs ?? (fastFromUrl() ? FAST_BOT_DELAY : DEFAULT_BOT_DELAY);
  const view = useMemo(() => viewFor(state, HUMAN_SEAT), [state]);
  const value = useMemo(() => ({ view, dispatch, botDelayMs: delay }), [delay, dispatch, view]);

  useEffect(() => {
    if (state.phase !== 'playing' || state.turn === HUMAN_SEAT || state.pending !== null) {
      return;
    }

    const botView = viewFor(state, state.turn);

    if (botView.legal.playableCardKeys.length === 0) {
      return;
    }

    const action = chooseSimpleAction(botView);
    const timer = window.setTimeout(() => dispatch(action), delay);

    return () => window.clearTimeout(timer);
  }, [delay, dispatch, state]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
