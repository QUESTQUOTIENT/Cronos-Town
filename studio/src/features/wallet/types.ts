/**
 * features/wallet/types.ts
 *
 * Public types for the SmartHouse wallet feature.
 */
import type { PackRole } from '../../domain/wallet';

export type WalletRole = PackRole;

export interface WalletState {
  address: string | null;
  chainId: string | null;
  role: WalletRole;
  packBalance: string | null;
  networkNotice: string | null;
}

export interface WalletElements {
  status: { textContent: string } | null;
}

/** A PACK balance provider (injected wallet or public RPC). */
export interface PackBalanceProvider {
  balanceOf(address: string): Promise<bigint>;
}
