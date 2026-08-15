/**
 * features/liquidity/types.ts
 *
 * Public types for the Crolana V3 liquidity manager (GBA edition).
 */

export interface V3LpPosition {
  id: number;
  txHash: string | null;
  symbolA: string;
  symbolB: string;
  fee: number;
  minP: number;
  maxP: number;
  amountA: number;
  amountB: number;
  accruedA: number;
  accruedB: number;
}

export interface LiquidityState {
  positions: V3LpPosition[];
  feeTier: number;
  web3Connected: boolean;
  web3Address: string | null;
  removePct: number;
}
