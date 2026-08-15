/**
 * features/casino/types.ts
 *
 * Public types for the CroVegas casino feature. Faithful to the legacy
 * `casinoCredits` / `casinoHistory` / `casinoGame` state.
 */

export type CasinoGame = 'slots' | 'roulette' | 'coinflip';

export interface CasinoHistoryEntry {
  game: string;
  bet: number;
  payout: number;
  result: string;
  time: number;
}

export interface CasinoState {
  credits: number;
  history: CasinoHistoryEntry[];
  game: CasinoGame;
  walletAddress: string | null;
}

export interface CasinoElements {
  gameButtons: HTMLButtonElement[];
  slotsPanel: HTMLElement | null;
  roulettePanel: HTMLElement | null;
  coinflipPanel: HTMLElement | null;
  status: HTMLElement | null;
  walletLine: HTMLElement | null;
  reelEls: HTMLElement[];
  betSlots: HTMLInputElement | null;
  betRoulette: HTMLInputElement | null;
  betCoinflip: HTMLInputElement | null;
  roulettePick: HTMLSelectElement | null;
  coinPick: HTMLSelectElement | null;
  rouletteBoard: HTMLElement | null;
  coinResult: HTMLElement | null;
}
