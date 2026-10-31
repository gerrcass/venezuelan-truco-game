/** The three table tempos a player can choose for the bots. */
export const BOT_SPEEDS = ['slow', 'normal', 'fast'] as const;

export type BotSpeed = (typeof BOT_SPEEDS)[number];

/** How long a bot waits before acting, in milliseconds. */
export const BOT_DELAYS: Record<BotSpeed, number> = {
  slow: 1500,
  normal: 800,
  fast: 220,
};

export function isBotSpeed(value: string | null): value is BotSpeed {
  return value === 'slow' || value === 'normal' || value === 'fast';
}
