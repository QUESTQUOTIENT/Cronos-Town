/**
 * features/token-launch/state.ts
 *
 * The feature owns its own state as plain data. No other module mutates it;
 * transitions happen only through these pure reducers.
 */
import type { TokenLaunchState } from './types';

export const initialTokenLaunchState: TokenLaunchState = {
  form: { name: 'Wolf Street Token', symbol: 'WOLF', supply: 1000000, tax: 0 },
  walletAddress: null,
  status: 'idle',
  lastError: null,
  deployed: null,
};

export function readForm(state: TokenLaunchState): TokenLaunchState['form'] {
  return {
    name: state.form.name.trim() || 'Wolf Street Token',
    symbol: state.form.symbol.trim().toUpperCase() || 'WOLF',
    supply: state.form.supply || 1000000,
    tax: state.form.tax || 0,
  };
}
