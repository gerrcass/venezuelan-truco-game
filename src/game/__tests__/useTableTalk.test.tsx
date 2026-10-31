import { act, render, screen } from '@testing-library/react';
import { StrictMode } from 'react';

import { botPersonaForSeat } from '../../ai/personas';
import { chooseBotAction } from '../../ai/policy';
import { LocaleProvider } from '../../content/LocaleProvider';
import { useLocale } from '../../content/locale-context';
import { actingSeat, createGame, reduce, viewFor } from '../../engine/game';
import type { GameView } from '../../engine/types';
import { TAUNT_INTERVAL_MS, useTableTalk } from '../useTableTalk';

function Probe({ view }: { readonly view: GameView }) {
  const { content } = useLocale();
  const talk = useTableTalk(view, content);

  return <p data-testid="line">{talk?.quote ?? ''}</p>;
}

function playToFirstTrick(seed: string): GameView {
  let state = createGame({ seed });

  for (let guard = 0; guard < 200; guard += 1) {
    if (state.phase === 'handOver') {
      state = reduce(state, { type: 'nextHand' });
      continue;
    }

    if (state.phase === 'matchOver') {
      state = reduce(state, { type: 'rematch', seed: `${seed}-${guard}` });
      continue;
    }

    const seat = actingSeat(state);
    state = reduce(
      state,
      chooseBotAction(viewFor(state, seat), botPersonaForSeat(seat), state.seed),
    );

    if (state.tricks.length > 0) {
      return viewFor(state, 0);
    }
  }

  throw new Error('The simulation never resolved a baza.');
}

describe('the table-talk clock', () => {
  it('shows a deal taunt, then holds the next beat for the rate limit', () => {
    vi.useFakeTimers();

    const seed = 'reloj-de-la-mesa';
    const deal = viewFor(createGame({ seed }), 0);
    const trick = playToFirstTrick(seed);
    const { rerender } = render(
      <StrictMode>
        <LocaleProvider>
          <Probe view={deal} />
        </LocaleProvider>
      </StrictMode>,
    );

    act(() => vi.advanceTimersByTime(0));
    const first = screen.getByTestId('line').textContent;

    expect(first).toBeTruthy();

    rerender(
      <StrictMode>
        <LocaleProvider>
          <Probe view={trick} />
        </LocaleProvider>
      </StrictMode>,
    );

    expect(screen.getByTestId('line').textContent).toBe(first);

    act(() => vi.advanceTimersByTime(TAUNT_INTERVAL_MS - 1));
    expect(screen.getByTestId('line').textContent).toBe(first);

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByTestId('line').textContent).not.toBe(first);

    vi.useRealTimers();
  });
});
