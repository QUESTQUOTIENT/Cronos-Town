/**
 * domain/casino.ts — CroVegas demo-game outcome rules (pure).
 *
 * Behavior-preserving port of the legacy payout logic from index.html. Randomness
 * is injected (via a `randomInt` function) so this module stays pure and testable;
 * the feature layer supplies crypto-backed or Math.random randomness.
 */

export const SLOT_SYMBOLS = ['🍒', '🍋', '🔔', '💎', '7️⃣'] as const;
export type SlotSymbol = (typeof SLOT_SYMBOLS)[number];

export const ROULETTE_MAX = 15; // CroVegas 0–14 table (randomInt(15) => 0..14)
export type RouletteColor = 'red' | 'black' | 'zero';
export type CoinSide = 'heads' | 'tails';

export type RandomInt = (max: number) => number;

export interface SlotOutcome {
  reels: SlotSymbol[];
  multiplier: number;
  payout: number;
}

/** Spin three reels and compute the payout (bet * multiplier). */
export function playSlots(randomInt: RandomInt, bet: number): SlotOutcome {
  const reels: SlotSymbol[] = [
    SLOT_SYMBOLS[randomInt(SLOT_SYMBOLS.length)],
    SLOT_SYMBOLS[randomInt(SLOT_SYMBOLS.length)],
    SLOT_SYMBOLS[randomInt(SLOT_SYMBOLS.length)],
  ];
  const triple = reels[0] === reels[1] && reels[1] === reels[2];
  const pair = reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2];
  const multiplier = triple ? (reels[0] === '7️⃣' ? 20 : 8) : pair ? 2 : 0;
  return { reels, multiplier, payout: bet * multiplier };
}

export function rouletteColor(number: number): RouletteColor {
  return number === 0 ? 'zero' : number <= 7 ? 'red' : 'black';
}

export interface RouletteOutcome {
  number: number;
  color: RouletteColor;
  payout: number;
}

export function playRoulette(randomInt: RandomInt, bet: number, pick: string): RouletteOutcome {
  const number = randomInt(ROULETTE_MAX);
  const color = rouletteColor(number);
  const payout = color === pick ? (color === 'zero' ? bet * 14 : bet * 2) : 0;
  return { number, color, payout };
}

export interface CoinflipOutcome {
  result: CoinSide;
  payout: number;
}

export function playCoinflip(randomInt: RandomInt, bet: number, pick: string): CoinflipOutcome {
  const result: CoinSide = randomInt(2) === 0 ? 'heads' : 'tails';
  const payout = result === pick ? bet * 2 : 0;
  return { result, payout };
}
