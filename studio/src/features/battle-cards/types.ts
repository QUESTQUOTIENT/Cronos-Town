/**
 * features/battle-cards/types.ts
 *
 * Public types for the Wolfies Battle Card feature.
 */
import type { WolfieCard } from '../../domain/battle';

export interface BattleCard extends WolfieCard {
  id: string;
  pveXp: number;
  stage: number;
}

export interface BattleCardsState {
  storage: BattleCard[];
  party: BattleCard[];
  /** The last scan result (or the default starter when empty). */
  scanned: WolfieCard[];
  selectedTokenId: string | null;
}

export interface ScanResult {
  nfts: WolfieCard[];
  count: number;
  message: string;
}

export const PARTY_CAP = 3;

export interface BattleCardElements {
  partyCountLabel: { textContent: string } | null;
  storageCountLabel: { textContent: string } | null;
  partyDisplay: { textContent: string } | null;
  convertCount: { textContent: string } | null;
}
