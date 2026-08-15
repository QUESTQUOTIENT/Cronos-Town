/**
 * features/casino/state.ts — pure state + reducers (single owner).
 */
import type { CasinoGame, CasinoHistoryEntry, CasinoState } from './types';

export const INITIAL_CASINO_CREDITS = 1000;

export function initialState(): CasinoState {
  return {
    credits: INITIAL_CASINO_CREDITS,
    history: [],
    game: 'slots',
    walletAddress: null,
  };
}

/** Read a numeric bet from an input, mirroring `casinoReadBet` (throws on invalid). */
export function readBet(input: { value: string }, credits: number): number {
  const bet = Number.parseInt(input.value, 10);
  if (!Number.isFinite(bet) || bet < 1) throw new Error('Enter a demo-chip bet of at least 1.');
  if (bet > credits) throw new Error('That bet is higher than your demo-chip balance.');
  return bet;
}

/** Normalize a game id (mirrors `setCasinoGame`). */
export function normalizeGame(game: string): CasinoGame {
  return game === 'roulette' || game === 'coinflip' ? game : 'slots';
}

/** Append a history entry and cap at 25 (mirrors `slice(-25)`). */
export function pushHistory(history: CasinoHistoryEntry[], entry: CasinoHistoryEntry): CasinoHistoryEntry[] {
  return [...history, entry].slice(-25);
}
