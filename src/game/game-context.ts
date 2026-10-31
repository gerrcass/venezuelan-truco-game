import { createContext, useContext, type Dispatch } from 'react';

import type { GameAction, GameView } from '../engine/types';

export interface GameContextValue {
  readonly view: GameView;
  readonly dispatch: Dispatch<GameAction>;
  readonly botDelayMs: number;
}

export const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const value = useContext(GameContext);

  if (!value) {
    throw new Error('useGame must be used inside a GameProvider.');
  }

  return value;
}
