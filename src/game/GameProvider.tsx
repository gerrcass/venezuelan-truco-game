import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { chooseBotAction } from '../ai/policy';
import { BOT_DELAYS } from '../domain/preferences';
import { PERSONA_BY_SEAT, TEAM_BY_SEAT } from '../domain/seats';
import { actingSeat, createGame, reduce, viewFor } from '../engine/game';
import type { GameAction, GameState } from '../engine/types';
import { GameContext } from './game-context';
import { usePreferences } from './preferences';

const HUMAN_SEAT = 0;
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
  const preferences = usePreferences();
  const [state, setState] = useState<GameState>(
    () => initialState ?? createGame({ seed: seed ?? seedFromUrl() ?? randomSeed() }),
  );

  const dispatch = useCallback((action: GameAction) => {
    setState((current) => reduce(current, action));
  }, []);

  const delay = botDelayMs ?? (fastFromUrl() ? FAST_BOT_DELAY : BOT_DELAYS[preferences.speed]);
  const view = useMemo(() => viewFor(state, HUMAN_SEAT), [state]);
  const value = useMemo(() => ({ view, dispatch, botDelayMs: delay }), [delay, dispatch, view]);

  useEffect(() => {
    if (state.phase !== 'playing') {
      return;
    }

    // A pending call is a team decision. If the human's team must answer, the
    // response dialog owns the table; otherwise a bot on the responding team
    // answers. Without a call, the turn seat acts.
    if (state.pending !== null && state.pending.respondingTeam === TEAM_BY_SEAT[HUMAN_SEAT]) {
      return;
    }

    const actor = actingSeat(state);

    if (actor === HUMAN_SEAT) {
      return;
    }

    const botView = viewFor(state, actor);

    if (
      !botView.legal.canRespondTruco &&
      !botView.legal.canRespondEnvido &&
      botView.legal.playableCardKeys.length === 0 &&
      !botView.legal.canCallTruco &&
      !botView.legal.canCallEnvido &&
      !botView.legal.canCallFlor &&
      !botView.legal.canCallPrive &&
      !botView.legal.canFold
    ) {
      return;
    }

    const action = chooseBotAction(botView, PERSONA_BY_SEAT[actor], botView.matchSeed);
    const timer = window.setTimeout(() => dispatch(action), delay);

    return () => window.clearTimeout(timer);
  }, [delay, dispatch, state]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}
