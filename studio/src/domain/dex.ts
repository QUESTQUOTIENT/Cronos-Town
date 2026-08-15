/**
 * domain/dex.ts — VVS V3 Concentrated Liquidity (CLMM) math + price tables.
 *
 * Behavior-preserving port of the legacy `getV3PairPrice`, `formatV3PriceVal`,
 * `getV3ClmmQuoteRatio`, `getTokenUsdPrice`, `getPoolTvlUsd`, and the pure math
 * of `updateCrolanaPoolStats` (share %, LP tokens, USD valuation) from index.html.
 *
 * NOTE (legacy quirk, preserved): the original `getV3PairPrice` object literal
 * declared `CRO_PACK: 50.0` then re-declared `CRO_PACK: 612.0`. The later value
 * wins in JS, so the effective price is 612.0 — this is the fix for the
 * "1637 CRO" bug when quoting 70794.20 PACK. We encode the final value only.
 */

export interface PoolStats {
  usdValA: number;
  usdValB: number;
  totalUsd: number;
  tvlUsd: number;
  sharePct: number;
  lpReceived: number;
}

const PAIR_PRICES: Record<string, number> = {
  CRO_PACK: 612.0,
  CRO_USDC: 0.04729,
  WCRO_USDC: 0.04729,
  CRO_USDT: 0.04729,
  WCRO_USDT: 0.04729,
  USDC_CRO: 21.14612,
  USDT_CRO: 21.14612,
  CRO_VVS: 57590.25,
  WCRO_VVS: 57590.25,
  VVS_CRO: 0.00001736,
  VVS_WCRO: 0.00001736,
  VVS_USDC: 0.000000821,
  VVS_USDT: 0.000000821,
  WCRO_PACK: 612.0,
  PACK_CRO: 0.001634,
  PACK_WCRO: 0.001634,
  PACK_USDC: 0.00007727,
  PACK_USDT: 0.00007727,
  USDC_USDT: 1.0,
  USDT_USDC: 1.0,
};

const POOL_TVLS: Record<string, number> = {
  CRO_USDC: 4850000,
  WCRO_USDC: 5257192,
  CRO_PACK: 1420500,
  WCRO_PACK: 1420500,
  WCRO_VVS: 2910000,
  CRO_VVS: 3100000,
  VVS_USDC: 5200000,
  PACK_USDC: 620000,
};

export function getV3PairPrice(symbolA: string, symbolB: string): number {
  if (symbolA === symbolB) return 1.0;
  const pairKey = `${symbolA}_${symbolB}`;
  const revKey = `${symbolB}_${symbolA}`;
  if (PAIR_PRICES[pairKey] !== undefined) return PAIR_PRICES[pairKey];
  if (PAIR_PRICES[revKey] !== undefined) return 1.0 / PAIR_PRICES[revKey];
  return symbolA === 'CRO' || symbolA === 'WCRO' ? 100.0 : 0.01;
}

export function formatV3PriceVal(val: number): string {
  if (!val || val === 0) return '0';
  if (val >= 1000) return String(Math.round(val));
  if (val >= 10) return val.toFixed(2);
  if (val >= 0.01) return val.toFixed(4);
  return val.toFixed(8);
}

export function getV3ClmmQuoteRatio(curPrice: number, minPrice: number, maxPrice: number): number {
  if (!curPrice || curPrice <= 0) return 1.0;
  const sqrtP = Math.sqrt(curPrice);
  const sqrtMin = Math.sqrt(Math.max(curPrice * 0.0001, minPrice));
  const sqrtMax = Math.sqrt(Math.max(curPrice * 1.0001, maxPrice));
  if (curPrice >= minPrice && curPrice <= maxPrice && sqrtMax - sqrtP > 1e-9) {
    const ratio = ((sqrtP - sqrtMin) * sqrtP * sqrtMax) / (sqrtMax - sqrtP);
    if (isFinite(ratio) && ratio > 0) return ratio;
  }
  return curPrice;
}

export function getTokenUsdPrice(symbol: string): number {
  const s = (symbol || '').toUpperCase();
  if (s === 'USDC' || s === 'USDT') return 1.0;
  if (s === 'CRO' || s === 'WCRO') return 0.04718;
  if (s === 'PACK') return 0.00007727;
  if (s === 'VVS') return 0.000000821;
  return 1.0;
}

export function getPoolTvlUsd(symbolA: string, symbolB: string): number {
  const pairKey = `${symbolA}_${symbolB}`;
  const revKey = `${symbolB}_${symbolA}`;
  return POOL_TVLS[pairKey] ?? POOL_TVLS[revKey] ?? 1000000;
}

/**
 * Pure math from `updateCrolanaPoolStats` — pool share %, LP tokens, USD value.
 * The DOM updates stay in the view layer; this returns the computed numbers.
 */
export function computePoolStats(symbolA: string, symbolB: string, amountA: number, amountB: number): PoolStats {
  const priceA = getTokenUsdPrice(symbolA);
  const priceB = getTokenUsdPrice(symbolB);
  const usdValA = amountA * priceA;
  const usdValB = amountB * priceB;
  const totalUsd = usdValA + usdValB;
  const tvlUsd = getPoolTvlUsd(symbolA, symbolB);
  const sharePct = tvlUsd > 0 ? (totalUsd / tvlUsd) * 100 : 0.01;
  const lpReceived = Math.sqrt(amountA * amountB) || 0;
  return { usdValA, usdValB, totalUsd, tvlUsd, sharePct, lpReceived };
}

export function formatPoolSharePct(sharePct: number): string {
  return sharePct < 0.0001 ? '< 0.0001%' : `${sharePct.toFixed(4)}%`;
}

export function formatLpReceived(lpReceived: number): string {
  return `${lpReceived.toFixed(6)} LP`;
}
