/**
 * domain/wallet.ts — PACK balance formatting + role tiers (pure).
 *
 * Behavior-preserving port of `formatPackBalance` + `roleForPack` from index.html,
 * plus the PACK token address and balanceOf calldata encoder.
 */

export const PACK_TOKEN_ADDRESS = '0x0d0b4a6fc6e7f5635c2ff38de75af2e96d6d6804';
export const WOLFIES_DEFAULT_CONTRACT = '0x719fdfb0ba006747a83438cc8900c8a2b35e0aff';

/** Citizen role derived from PACK balance (mirrors the legacy tier labels). */
export type PackRole = 'Friends' | 'Whale' | 'Shrimp' | 'Knight' | 'Holder' | 'Normie' | 'Visitor';

const SCALE = 10n ** 18n;

/** Format a raw PACK wei balance as "1,234.56" (mirrors `formatPackBalance`). */
export function formatPackBalance(rawBalance: bigint): string {
  const whole = rawBalance / SCALE;
  const fraction = (rawBalance % SCALE).toString().padStart(18, '0').slice(0, 2);
  return `${whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction}`;
}

/** Role tiers, highest first (mirrors `roleForPack`). */
export const PACK_ROLE_TIERS: Array<[bigint, string]> = [
  [25_000_000n, 'Friends'],
  [10_000_000n, 'Whale'],
  [1_000_000n, 'Shrimp'],
  [250_000n, 'Knight'],
  [100_000n, 'Holder'],
  [20_000n, 'Normie'],
];

/** Determine the citizen role from a raw PACK wei balance (mirrors `roleForPack`). */
export function roleForPack(rawBalance: bigint): PackRole {
  const tier = PACK_ROLE_TIERS.find(([amount]) => rawBalance >= amount * SCALE);
  return (tier?.[1] ?? 'Visitor') as PackRole;
}

/** Encode a `balanceOf(address)` call (mirrors the legacy calldata). */
export function packBalanceOfCalldata(address: string): string {
  return `0x70a08231${address.slice(2).padStart(64, '0')}`;
}

/** Parse a raw `eth_call` hex result into a BigInt (mirrors `BigInt(result || '0x0')`). */
export function parseRawBalance(result: string | null | undefined): bigint {
  return BigInt(result || '0x0');
}
