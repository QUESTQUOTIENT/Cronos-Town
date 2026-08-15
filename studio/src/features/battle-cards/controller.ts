/**
 * features/battle-cards/controller.ts — use-cases (scan / select / convert / equip).
 *
 * Faithful port of the Wolfies battle-card flows from index.html. The DOM
 * rendering (scan grid, storage grid, party list) stays in the view; this module
 * owns the state transitions and the exact message strings.
 */
import type { EventBus } from '../../engine/events/EventBus';
import type { AuditPort, HapticsPort, ToastPort } from '../../engine/ports';
import { DEFAULT_STARTER_WOLFIE, getWolfieTraitData, type WolfieCard } from '../../domain/battle';
import type { BattleCardsState, ScanResult } from './types';
import { convertToCard, equipCard, isOnlyStarter, normalizeScan, unequipCard } from './state';

export interface BattleCardsDependencies {
  bus: EventBus;
  toast: ToastPort;
  audit: AuditPort;
  haptics: HapticsPort;
  /** POST /api/battle-cards/scan */
  scan: (wallet: string) => Promise<ScanResult>;
  /** Current connected wallet (crolana first, then SmartHouse). */
  wallet: () => string;
  /** Unique card id source (mirrors `String(Date.now()).slice(-4)`). */
  nextId: () => string;
  /** When locked (no wallet), the access-denied handler. */
  onLocked?: () => void;
  /** Whether a wallet is connected (the SmartHouse PC lock gate). */
  isWalletConnected: () => boolean;
}

export class BattleCardsController {
  constructor(
    private readonly deps: BattleCardsDependencies,
    private readonly state: BattleCardsState,
  ) {}

  /** Gate: the Manager Assistant PC requires a connected wallet first. */
  canOpen(): boolean {
    return this.deps.isWalletConnected();
  }

  async scan(): Promise<void> {
    const wallet = this.deps.wallet();
    const data = await this.deps.scan(wallet).catch(() => null);
    this.state.scanned = normalizeScan(data);
    this.state.selectedTokenId = null;
    this.deps.haptics.effect('place');
  }

  scanMessage(): string {
    if (isOnlyStarter(this.state.scanned)) {
      return '❌ user still dont have any wolfie yet -> Granted Default Starter Wolfie (⚡ ELECTRIC TYPE)!';
    }
    return `✅ Found ${this.state.scanned.length} Wolfies NFTs ready for Battle Card conversion.`;
  }

  select(tokenId: string): void {
    this.state.selectedTokenId = tokenId;
  }

  selected(): WolfieCard | null {
    return this.state.scanned.find((n) => n.tokenId === this.state.selectedTokenId) ?? null;
  }

  /** The auto-assigned suit trait for a scanned NFT (mirrors the trait auto-assign). */
  suitTraitFor(nft: WolfieCard): string {
    return nft.suitTrait || nft.trait || 'Astronaut';
  }

  convert(customName: string): boolean {
    const nft = this.selected();
    if (!nft) {
      this.deps.toast.notify('❌ Please select an NFT from the scan grid first!', 'error');
      return false;
    }
    const finalName = customName.trim() || (nft.name || 'Cyber Wolfie #001').replace(/⚡|🔥|💧|🌿|🐉|🌑|⚔️/g, '').trim();
    const trait = this.suitTraitFor(nft);
    const traitData = getWolfieTraitData(trait);
    const card = convertToCard(nft, finalName, trait, traitData.element, traitData.stats, traitData.abilities, this.deps.nextId());

    this.state.storage.push(card);
    this.deps.toast.notify(`✨ Converted ${card.name} and saved to PC Storage Network!`, 'good');
    this.deps.audit.record('NFT_BATTLE_CARD_CONVERT', `Converted ${card.name} [Trait: ${trait}] into playable Battle Card`, 0);
    this.deps.haptics.effect('place');
    return true;
  }

  equip(cardId: string): boolean {
    const result = equipCard(this.state, cardId);
    if (result.error) this.deps.toast.notify(`❌ ${result.error}`, 'error');
    else {
      const card = this.state.storage.find((c) => c.id === cardId);
      if (card) {
        this.deps.toast.notify(`⚔️ Equipped ${card.name} to Active Party (${this.state.party.length}/3)!`, 'good');
        this.deps.haptics.effect('click');
      }
    }
    return result.ok;
  }

  unequip(cardId: string): boolean {
    const card = unequipCard(this.state, cardId);
    if (card) {
      this.deps.toast.notify(`➖ Unequipped ${card.name} from Active Party.`, 'normal');
      this.deps.haptics.effect('click');
      return true;
    }
    return false;
  }

  partyCount(): number {
    return this.state.party.length;
  }

  storageCount(): number {
    return this.state.storage.length;
  }

  defaultStarter(): WolfieCard {
    return DEFAULT_STARTER_WOLFIE;
  }
}
