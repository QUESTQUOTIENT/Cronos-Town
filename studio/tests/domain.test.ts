/**
 * Domain layer unit tests — lock the EXACT legacy outputs so any future refactor
 * that changes behavior fails loudly.
 */
import { describe, expect, it } from 'vitest';

import {
  computePoolStats,
  formatLpReceived,
  formatPoolSharePct,
  formatV3PriceVal,
  getPoolTvlUsd,
  getTokenUsdPrice,
  getV3ClmmQuoteRatio,
  getV3PairPrice,
} from '../src/domain/dex';

import {
  DEFAULT_STARTER_WOLFIE,
  getWolfieTraitData,
  WOLFIE_SKINS_LIST,
  WOLFIE_TRAIT_TYPE_MAP,
  WOLFIE_TYPE_SYSTEM,
} from '../src/domain/battle';

import { citizenTier, convertXpToChips, FLIPSUITE_QUESTS, XP_TO_CHIPS_RATE } from '../src/domain/economy';

describe('domain/dex — VVS V3 CLMM math', () => {
  it('CRO_PACK resolves to 612.0 (fixes the "1637 CRO" bug, was shadowed 50.0)', () => {
    expect(getV3PairPrice('CRO', 'PACK')).toBe(612.0);
    expect(getV3PairPrice('WCRO', 'PACK')).toBe(612.0);
  });

  it('reverse PACK_CRO resolves to 0.001634', () => {
    expect(getV3PairPrice('PACK', 'CRO')).toBeCloseTo(0.001634, 9);
    expect(getV3PairPrice('PACK', 'WCRO')).toBeCloseTo(0.001634, 9);
  });

  it('CRO/USDC live rate', () => {
    expect(getV3PairPrice('CRO', 'USDC')).toBe(0.04729);
    expect(getV3PairPrice('USDC', 'CRO')).toBe(21.14612);
  });

  it('same-symbol identity and unknown fallback', () => {
    expect(getV3PairPrice('CRO', 'CRO')).toBe(1.0);
    expect(getV3PairPrice('CRO', 'UNKNOWN')).toBe(100.0);
    expect(getV3PairPrice('UNKNOWN', 'CRO')).toBe(0.01);
  });

  it('CLMM quote ratio matches legacy output', () => {
    expect(getV3ClmmQuoteRatio(50, 42.5, 57.5)).toBeCloseTo(57.81564007447312, 9);
    expect(getV3ClmmQuoteRatio(612, 500, 700)).toBeCloseTo(905.488169516199, 9);
  });

  it('out-of-range price returns the raw price; zero returns 1.0', () => {
    expect(getV3ClmmQuoteRatio(50, 60, 70)).toBe(50);
    expect(getV3ClmmQuoteRatio(0, 42.5, 57.5)).toBe(1.0);
  });

  it('USD price table', () => {
    expect(getTokenUsdPrice('CRO')).toBe(0.04718);
    expect(getTokenUsdPrice('WCRO')).toBe(0.04718);
    expect(getTokenUsdPrice('PACK')).toBe(0.00007727);
    expect(getTokenUsdPrice('VVS')).toBe(0.000000821);
    expect(getTokenUsdPrice('USDC')).toBe(1.0);
    expect(getTokenUsdPrice('UNKNOWN')).toBe(1.0);
  });

  it('TVL table + fallback', () => {
    expect(getPoolTvlUsd('CRO', 'USDC')).toBe(4850000);
    expect(getPoolTvlUsd('CRO', 'PACK')).toBe(1420500);
    expect(getPoolTvlUsd('UNKNOWN', 'X')).toBe(1000000);
  });

  it('pool stats: LP = sqrt(amountA * amountB), share % vs TVL', () => {
    const stats = computePoolStats('CRO', 'PACK', 100, 61200);
    expect(stats.lpReceived).toBeCloseTo(Math.sqrt(100 * 61200), 6);
    expect(stats.tvlUsd).toBe(1420500);
    expect(stats.sharePct).toBeGreaterThan(0);
    expect(formatLpReceived(stats.lpReceived)).toBe(`${stats.lpReceived.toFixed(6)} LP`);
  });

  it('share formatting for tiny shares', () => {
    expect(formatPoolSharePct(0.0000001)).toBe('< 0.0001%');
    expect(formatPoolSharePct(1.23456)).toBe('1.2346%');
  });

  it('price value formatting buckets', () => {
    expect(formatV3PriceVal(0)).toBe('0');
    expect(formatV3PriceVal(12345)).toBe('12345');
    expect(formatV3PriceVal(57.5)).toBe('57.50');
    expect(formatV3PriceVal(0.04718)).toBe('0.0472');
    expect(formatV3PriceVal(0.000000821)).toBe('0.00000082');
  });
});

describe('domain/battle — Wolfies 7-element type system', () => {
  it('maps all 60 skin traits across 7 elements', () => {
    expect(WOLFIE_SKINS_LIST).toHaveLength(60);
    expect(Object.keys(WOLFIE_TYPE_SYSTEM)).toHaveLength(7);
  });

  it('Astronaut -> ELECTRIC with exact stats', () => {
    const data = getWolfieTraitData('Astronaut');
    expect(data.typeKey).toBe('ELECTRIC');
    expect(data.element).toBe('⚡ ELECTRIC TYPE');
    expect(data.stats).toEqual({ hp: 110, maxHp: 110, atk: 90, def: 70, spd: 110, crit: 25 });
    expect(data.abilities).toContain('⚡ THUNDER BITE');
  });

  it('Pharaoh Suit -> FIRE', () => {
    expect(getWolfieTraitData('Pharaoh Suit').typeKey).toBe('FIRE');
  });

  it('unknown trait falls back to ELECTRIC', () => {
    expect(getWolfieTraitData('Not A Trait').typeKey).toBe('ELECTRIC');
  });

  it('returns cloned stats/abilities (no shared mutation)', () => {
    const a = getWolfieTraitData('Astronaut');
    a.stats.hp = 999;
    const b = getWolfieTraitData('Astronaut');
    expect(b.stats.hp).toBe(110);
  });

  it('default starter is the Electric starter Wolfie', () => {
    expect(DEFAULT_STARTER_WOLFIE.isDefaultStarter).toBe(true);
    expect(DEFAULT_STARTER_WOLFIE.element).toBe('⚡ ELECTRIC TYPE');
    expect(DEFAULT_STARTER_WOLFIE.tokenId).toBe('000');
    expect(DEFAULT_STARTER_WOLFIE.contract).toBe('0x719fdfb0ba006747a83438cc8900c8a2b35e0aff');
    expect(DEFAULT_STARTER_WOLFIE.abilities).toHaveLength(4);
  });
});

describe('domain/economy — Flipsuite rules', () => {
  it('XP -> chips at 1 XP = 2 Chips', () => {
    expect(XP_TO_CHIPS_RATE).toBe(2);
    expect(convertXpToChips(50)).toBe(100);
    expect(convertXpToChips(0)).toBe(0);
  });

  it('5 community quests with legacy xp/chips', () => {
    expect(FLIPSUITE_QUESTS).toHaveLength(5);
    const wallet = FLIPSUITE_QUESTS.find((q) => q.id === 'wallet');
    expect(wallet).toMatchObject({ title: 'Citizen Sovereignty', xp: 250, chips: 100 });
  });

  it('citizen tier thresholds', () => {
    expect(citizenTier(0)).toBe('VISITOR 🐋');
    expect(citizenTier(51)).toBe('NORMIE 👤');
    expect(citizenTier(201)).toBe('CITIZEN 🏛️');
    expect(citizenTier(501)).toBe('KNIGHT 🛡️');
    expect(citizenTier(1001)).toBe('WHALE 🐋');
  });
});
