/**
 * features/wallet/state.ts — pure state + reducers.
 */
import type { WalletState } from './types';

export function initialState(): WalletState {
  return { address: null, chainId: null, role: 'Visitor', packBalance: null, networkNotice: null };
}
