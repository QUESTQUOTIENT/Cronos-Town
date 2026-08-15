/**
 * features/liquidity/state.ts — pure state + reducers (single owner).
 */
import type { LiquidityState, V3LpPosition } from './types';

export function initialState(): LiquidityState {
  return { positions: [], feeTier: 0.3, web3Connected: false, web3Address: null, removePct: 50 };
}

/** Accrued fees on a fresh position (mirrors `Math.round(amount * 0.05 * 10) / 10`). */
export function accruedFees(amount: number): number {
  return Math.round(amount * 0.05 * 10) / 10;
}

/** Build a new position (mirrors the `newPos` construction in mintVvsV3LpPosition). */
export function buildPosition(
  id: number,
  txHash: string | null,
  symbolA: string,
  symbolB: string,
  fee: number,
  minP: number,
  maxP: number,
  amountA: number,
  amountB: number,
): V3LpPosition {
  return {
    id,
    txHash,
    symbolA,
    symbolB,
    fee,
    minP,
    maxP,
    amountA,
    amountB,
    accruedA: accruedFees(amountA),
    accruedB: accruedFees(amountB),
  };
}

/** Collect fees from a position (zeroes accrued amounts). Returns the position or null. */
export function collectFees(state: LiquidityState, posId: number): V3LpPosition | null {
  const pos = state.positions.find((p) => p.id === posId);
  if (!pos) return null;
  pos.accruedA = 0;
  pos.accruedB = 0;
  return pos;
}

/** Remove (burn) a position. Returns the removed position or null. */
export function removePosition(state: LiquidityState, posId: number): V3LpPosition | null {
  const idx = state.positions.findIndex((p) => p.id === posId);
  if (idx === -1) return null;
  const [removed] = state.positions.splice(idx, 1);
  return removed;
}

/** Remove a percentage of the last position (mirrors `handleCrolanaRemoveLiquidity`). */
export function removeLastByPct(state: LiquidityState): V3LpPosition | null {
  if (!state.positions.length) return null;
  const removed = state.positions[state.positions.length - 1];
  state.positions.pop();
  return removed;
}
