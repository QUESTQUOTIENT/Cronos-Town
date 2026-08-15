import { describe, expect, it } from 'vitest';

import {
  formatPackBalance,
  packBalanceOfCalldata,
  parseRawBalance,
  PACK_TOKEN_ADDRESS,
  roleForPack,
  WOLFIES_DEFAULT_CONTRACT,
} from '../src/domain/wallet';

const E18 = 10n ** 18n;

describe('domain/wallet — PACK balance + roles', () => {
  it('formats whole + 2-decimal fraction with thousands separators', () => {
    expect(formatPackBalance(0n)).toBe('0.00');
    expect(formatPackBalance(1n * E18)).toBe('1.00');
    expect(formatPackBalance(1234n * E18 + 56n * 10n ** 16n)).toBe('1,234.56');
    expect(formatPackBalance(1_000_000n * E18)).toBe('1,000,000.00');
  });

  it('formats sub-whole balances', () => {
    expect(formatPackBalance(56n * 10n ** 16n)).toBe('0.56');
    expect(formatPackBalance(1n * 10n ** 15n)).toBe('0.00'); // 0.001 rounds to 0.00 (2 dp truncation)
  });

  it('role tiers (highest first)', () => {
    expect(roleForPack(0n)).toBe('Visitor');
    expect(roleForPack(20_000n * E18)).toBe('Normie');
    expect(roleForPack(100_000n * E18)).toBe('Holder');
    expect(roleForPack(250_000n * E18)).toBe('Knight');
    expect(roleForPack(1_000_000n * E18)).toBe('Shrimp');
    expect(roleForPack(10_000_000n * E18)).toBe('Whale');
    expect(roleForPack(25_000_000n * E18)).toBe('Friends');
  });

  it('role boundary: just below a tier falls to the lower tier', () => {
    expect(roleForPack(99_999n * E18)).toBe('Normie');
    expect(roleForPack(19_999n * E18)).toBe('Visitor');
  });

  it('encodes balanceOf calldata', () => {
    const data = packBalanceOfCalldata('0x00000000000000000000000000000000000000ab');
    expect(data).toBe('0x70a08231' + '0'.repeat(24) + '00000000000000000000000000000000000000ab');
  });

  it('parses raw hex balance', () => {
    expect(parseRawBalance('0x0')).toBe(0n);
    expect(parseRawBalance('0xde0b6b3a7640000')).toBe(1n * E18);
    expect(parseRawBalance(null)).toBe(0n);
  });

  it('exposes the PACK + Wolfies contract addresses', () => {
    expect(PACK_TOKEN_ADDRESS).toBe('0x0d0b4a6fc6e7f5635c2ff38de75af2e96d6d6804');
    expect(WOLFIES_DEFAULT_CONTRACT).toBe('0x719fdfb0ba006747a83438cc8900c8a2b35e0aff');
  });
});
