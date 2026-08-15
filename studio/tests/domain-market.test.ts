import { describe, expect, it } from 'vitest';

import {
  formatUnits,
  isValidAddress,
  listingKey,
  listingName,
  listingPrice,
  listingSeller,
  listingTokenId,
  normalizeFeature,
  normalizeProvider,
  normalizeTab,
  shortAddress,
  tokenSymbol,
} from '../src/domain/market';

describe('domain/market — data helpers (legacy parity)', () => {
  it('validates EVM addresses', () => {
    expect(isValidAddress('0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23')).toBe(true);
    expect(isValidAddress('0x5c7f8a570d578ed84e63fdfa7b1ee72deae1ae23')).toBe(true);
    expect(isValidAddress('0x1234')).toBe(false);
    expect(isValidAddress('')).toBe(false);
  });

  it('shortens addresses', () => {
    expect(shortAddress('')).toBe('—');
    expect(shortAddress('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x1234…5678');
  });

  it('resolves token symbols (PACK/WCRO/CRO/fallback)', () => {
    expect(tokenSymbol('0x0d0b4a6fc6e7f5635c2ff38de75af2e96d6d6804')).toBe('PACK');
    expect(tokenSymbol('0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23')).toBe('WCRO');
    expect(tokenSymbol('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')).toBe('CRO');
    expect(tokenSymbol('0x1234567890abcdef1234567890abcdef12345678')).toBe('0x1234…5678');
  });

  it('formats units (whole + 4-decimal fraction, trailing zeros trimmed)', () => {
    expect(formatUnits('0')).toBe('0');
    expect(formatUnits('1000000000000000000')).toBe('1');
    expect(formatUnits('1234560000000000000')).toBe('1.2345');
    expect(formatUnits('1500000000000000000')).toBe('1.5');
    expect(formatUnits('not-a-number')).toBe('—');
  });

  it('extracts listing record fields', () => {
    const record = {
      nftToken: '0xabc', nftTokenId: '42', price: 2.5,
      seller: '0xmaker', nft: { name: 'Cool NFT' },
    };
    expect(listingKey(record, '0xabc')).toBe('0xabc:42');
    expect(listingTokenId(record)).toBe('42');
    expect(listingName(record)).toBe('Cool NFT');
    expect(listingSeller(record)).toBe('0xmaker');
    expect(listingPrice(record)).toBe(2.5); // `price` is used as-is (display units)
  });

  it('listingPrice falls back to erc20TokenAmount / 1e18', () => {
    expect(listingPrice({ erc20TokenAmount: '5000000000000000000' })).toBe(5);
    expect(listingPrice({ price: null, erc20TokenAmount: undefined })).toBe(0);
  });

  it('listingName falls back to NFT #tokenId', () => {
    expect(listingName({ nftTokenId: '7' })).toBe('NFT #7');
  });

  it('normalizes feature/provider/tab', () => {
    expect(normalizeFeature('bogus')).toBe('collection');
    expect(normalizeFeature('offers')).toBe('offers');
    expect(normalizeProvider('trader')).toBe('trader');
    expect(normalizeProvider('anything')).toBe('ebisus');
    expect(normalizeTab('nfts')).toBe('nfts');
    expect(normalizeTab('create')).toBe('create');
    expect(normalizeTab('bogus')).toBe('browse');
  });
});
