/**
 * features/battle-cards/state.ts — pure state + reducers (single owner).
 */
import { DEFAULT_STARTER_WOLFIE, type WolfieCard, type WolfieStats } from '../../domain/battle';
import type { BattleCard, BattleCardsState, ScanResult } from './types';
import { PARTY_CAP } from './types';

export function initialState(): BattleCardsState {
  return { storage: [], party: [], scanned: [DEFAULT_STARTER_WOLFIE], selectedTokenId: null };
}

/** Normalize a scan result: empty → default starter (mirrors `scanWalletForNfts`). */
export function normalizeScan(data: ScanResult | null | undefined): WolfieCard[] {
  if (data?.nfts && Array.isArray(data.nfts) && data.nfts.length > 0) return data.nfts;
  return [DEFAULT_STARTER_WOLFIE];
}

/** True when only the default starter is present (mirrors `hasOnlyDefault`). */
export function isOnlyStarter(cards: WolfieCard[]): boolean {
  return !cards || cards.length === 0 || (cards.length === 1 && Boolean(cards[0].isDefaultStarter));
}

/** Build a converted BattleCard (mirrors `convertSelectedNftToCard`). */
export function convertToCard(
  nft: WolfieCard,
  customName: string,
  trait: string,
  element: string,
  stats: WolfieStats,
  abilities: string[],
  id: string,
): BattleCard {
  const finalName = customName || nft.name || 'Cyber Wolfie #001';
  return {
    id,
    tokenId: nft.tokenId,
    name: `${element.split(' ')[0]} ${finalName} (${trait})`,
    collection: 'Wolfies (Cronos Mainnet · 0x719f...e0aff)',
    contract: nft.contract || '0x719fdfb0ba006747a83438cc8900c8a2b35e0aff',
    species: 'Wolfie',
    element,
    suitTrait: trait,
    trait,
    stats,
    abilities,
    evolutionPath: nft.evolutionPath,
    pveLevel: 1,
    pveXp: 0,
    pvpRating: 1000,
    stage: 1,
    owner: nft.owner,
  };
}

/** Equip a card (cap 3, no duplicates). Returns false + reason when blocked. */
export function equipCard(state: BattleCardsState, cardId: string): { ok: boolean; error?: string } {
  const card = state.storage.find((c) => c.id === cardId);
  if (!card) return { ok: false };
  if (state.party.some((c) => c.id === cardId)) return { ok: false };
  if (state.party.length >= PARTY_CAP) {
    return { ok: false, error: 'Active Party is already at maximum capacity (3/3)! Unequip a card first.' };
  }
  state.party.push(card);
  return { ok: true };
}

/** Unequip a card. Returns the removed card or null. */
export function unequipCard(state: BattleCardsState, cardId: string): BattleCard | null {
  const idx = state.party.findIndex((c) => c.id === cardId);
  if (idx === -1) return null;
  const [card] = state.party.splice(idx, 1);
  return card;
}
