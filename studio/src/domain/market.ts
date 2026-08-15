/**
 * domain/market.ts — marketplace data helpers (pure).
 *
 * Behavior-preserving port of the legacy marketplace helpers from index.html:
 * address validation/shortening, token symbol resolution, unit formatting, and
 * listing record extraction (key/tokenId/name/seller/price/attributes).
 */

export const MARKETPLACE_PACK_TOKEN = '0x0d0b4a6fc6e7f5635c2ff38de75af2e96d6d6804';
export const MARKETPLACE_WCRO_TOKEN = '0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23';
export const DEX_NATIVE = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

export const MARKETPLACE_FEATURES = [
  'collection', 'items', 'watchlist', 'favorites', 'history', 'offers', 'auctions', 'activity', 'alerts',
] as const;
export type MarketplaceFeature = (typeof MARKETPLACE_FEATURES)[number];

export type MarketplaceProvider = 'ebisus' | 'trader';
export type MarketplaceTab = 'browse' | 'nfts' | 'create';

export function isValidAddress(address: unknown): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(String(address || '').trim());
}

export function shortAddress(address: unknown): string {
  if (!address) return '—';
  const s = String(address);
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

export function tokenSymbol(address: unknown): string {
  const normalized = String(address || '').toLowerCase();
  if (normalized === MARKETPLACE_PACK_TOKEN.toLowerCase()) return 'PACK';
  if (normalized === MARKETPLACE_WCRO_TOKEN.toLowerCase()) return 'WCRO';
  if (normalized === DEX_NATIVE.toLowerCase()) return 'CRO';
  return shortAddress(address);
}

export function formatUnits(raw: unknown, decimals = 18): string {
  try {
    const value = BigInt(String(raw || '0'));
    const scale = 10n ** BigInt(decimals);
    const whole = value / scale;
    const fraction = (value % scale).toString().padStart(decimals, '0').slice(0, 4).replace(/0+$/, '');
    return `${whole.toString()}${fraction ? `.${fraction}` : ''}`;
  } catch {
    return '—';
  }
}

/** A marketplace listing record (union of Ebisu's Bay / 0x shapes). */
export interface ListingRecord {
  nftToken?: string;
  nftTokenId?: string | number;
  nftId?: string | number;
  tokenId?: string | number;
  name?: string;
  price?: number | string | null;
  seller?: string;
  maker?: string;
  erc20TokenAmount?: string | number;
  erc721Token?: string;
  erc721TokenId?: string | number;
  nft?: {
    name?: string;
    image?: string;
    original_image?: string;
    attributes?: unknown[];
  };
  metadata?: { attributes?: unknown[] };
  attributes?: unknown[];
  image?: string;
  listingId?: string | number;
  order?: {
    erc721Token?: string;
    erc721TokenId?: string | number;
    maker?: string;
    erc20TokenAmount?: string | number;
    nonce?: string | number;
  };
}

export function listingKey(record: ListingRecord, currentContract: string): string {
  const order = (record?.order || record || {}) as ListingRecord;
  const token = String(record?.nftToken || order.erc721Token || currentContract).toLowerCase();
  const tokenId = String(record?.nftTokenId ?? order.erc721TokenId ?? record?.nftId ?? '');
  return `${token}:${tokenId}`;
}

export function listingTokenId(record: ListingRecord): string {
  return String(record?.nftTokenId ?? record?.nftId ?? record?.tokenId ?? record?.order?.erc721TokenId ?? '');
}

export function listingName(record: ListingRecord): string {
  return record?.nft?.name || record?.name || `NFT #${listingTokenId(record)}`;
}

export function listingSeller(record: ListingRecord): string {
  return String(record?.seller || record?.order?.maker || record?.maker || '');
}

export function listingPrice(record: ListingRecord): number {
  if (record?.price !== undefined && record?.price !== null) return Number(record.price) || 0;
  const raw = record?.erc20TokenAmount || record?.order?.erc20TokenAmount || '0';
  try {
    return Number(raw) / 1e18;
  } catch {
    return 0;
  }
}

export function listingAttributes(record: ListingRecord): unknown[] {
  const attributes = record?.nft?.attributes || record?.metadata?.attributes || record?.attributes || [];
  return Array.isArray(attributes) ? attributes : [];
}

export function normalizeFeature(feature: string): MarketplaceFeature {
  return (MARKETPLACE_FEATURES as readonly string[]).includes(feature) ? (feature as MarketplaceFeature) : 'collection';
}

export function normalizeProvider(provider: string): MarketplaceProvider {
  return provider === 'trader' ? 'trader' : 'ebisus';
}

export function normalizeTab(tab: string): MarketplaceTab {
  return tab === 'nfts' || tab === 'create' ? tab : 'browse';
}
