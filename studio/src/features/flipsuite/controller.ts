/**
 * features/flipsuite/controller.ts — use-cases (claim quest / airdrop / convert XP).
 *
 * Faithful port of the legacy Flipsuite economy flows from index.html:
 * quest claiming, the daily airdrop, and the XP→chips conversion (1 XP = 2 Chips,
 * minimum 10 XP). Consumes `domain/economy.ts`.
 */
import type { EventBus } from '../../engine/events/EventBus';
import type { AuditPort, HapticsPort, ToastPort } from '../../engine/ports';
import { citizenTier, convertXpToChips, FLIPSUITE_QUESTS, type CommunityQuest } from '../../domain/economy';
import type { FlipsuiteState } from './types';

export interface FlipsuiteDependencies {
  bus: EventBus;
  toast: ToastPort;
  audit: AuditPort;
  haptics: HapticsPort;
  /** Read the current in-game day ("Day N" or game clock). */
  currentDay: () => string;
  /** Live quest-completion checks (read game state). */
  questChecks: Record<string, () => boolean>;
  /** Wallet connected (adds the +500 score bonus, mirrors legacy). */
  walletConnected: () => boolean;
  /** Persist credits + xp + claimed quests + airdrop day. */
  persist: (state: FlipsuiteState) => void;
}

export class FlipsuiteController {
  constructor(
    private readonly deps: FlipsuiteDependencies,
    private readonly state: FlipsuiteState,
    private readonly setStatus: (text: string) => void,
  ) {}

  /** Total score = XP + wallet bonus (mirrors `totalScore`). */
  totalScore(): number {
    return this.state.xp + (this.deps.walletConnected() ? 500 : 0);
  }

  /** Citizen tier label for the readout. */
  tier(): string {
    return citizenTier(this.totalScore());
  }

  /** Which quests are claimable now (unclaimed + their check passes). */
  claimableQuests(): CommunityQuest[] {
    return FLIPSUITE_QUESTS.filter(
      (q) => !this.state.claimedQuestIds.includes(q.id) && (this.deps.questChecks[q.id]?.() ?? false),
    );
  }

  /** Whether a specific quest has been claimed. */
  isClaimed(questId: string): boolean {
    return this.state.claimedQuestIds.includes(questId);
  }

  claimQuest(questId: string): boolean {
    const quest = FLIPSUITE_QUESTS.find((q) => q.id === questId);
    if (!quest) return false;
    if (this.isClaimed(questId)) return false;
    const check = this.deps.questChecks[questId];
    if (!check || !check()) return false;

    this.state.xp += quest.xp;
    this.state.chips += quest.chips;
    this.state.claimedQuestIds = [...this.state.claimedQuestIds, questId];
    this.deps.persist(this.state);
    this.setStatus(`🎉 Quest Claimed: ${quest.title}! Earned +${quest.xp} Flipsuite XP and +${quest.chips} CroVegas Chips!`);
    this.deps.haptics.effect('place');
    this.deps.audit.record('FLIPSUITE_QUEST', `Claimed quest ${quest.title}`, +quest.chips);
    return true;
  }

  claimAirdrop(): string {
    const currentDay = this.deps.currentDay();
    if (this.state.airdropClaimedDay === currentDay) {
      const msg = 'Daily automated community airdrop already claimed today! Check back tomorrow or set a new time.';
      this.setStatus(msg);
      return msg;
    }
    this.state.chips += 150;
    this.state.xp += 50;
    this.state.airdropClaimedDay = currentDay;
    this.deps.persist(this.state);
    this.deps.haptics.effect('place');
    this.deps.audit.record('FLIPSUITE_AIRDROP', 'Daily automated community airdrop', +150);
    const msg = '🎁 Daily Community Airdrop claimed! +150 CroVegas Demo Chips and +50 Flipsuite XP added to your balance!';
    this.setStatus(msg);
    return msg;
  }

  convertXp(): string | null {
    if (this.state.xp < 10) {
      const msg = 'You need at least 10 Flipsuite XP to convert points into chips.';
      this.setStatus(msg);
      return msg;
    }
    const chipsEarned = convertXpToChips(this.state.xp);
    const oldXp = this.state.xp;
    this.state.chips += chipsEarned;
    this.state.xp = 0;
    this.deps.persist(this.state);
    this.deps.haptics.effect('place');
    this.deps.audit.record('FLIPSUITE_CONVERT', 'Converted off-chain XP to demo chips', +chipsEarned);
    const msg = `🔄 Converted ${oldXp} Flipsuite XP into ${chipsEarned} CroVegas Demo Chips! (1 XP = 2 Chips)`;
    this.setStatus(msg);
    return msg;
  }

  /** Award XP for a general interaction (mirrors the `flipsuiteXp += 15` NPC hook). */
  awardXp(amount: number): void {
    this.state.xp += amount;
    this.deps.persist(this.state);
  }
}
