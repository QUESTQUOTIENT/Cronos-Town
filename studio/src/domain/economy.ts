/**
 * domain/economy.ts — off-chain Flipsuite economy rules (pure).
 *
 * Behavior-preserving port of the legacy XP → Demo Chips conversion
 * (`1 XP = 2 Chips`), the 5-quest community board data, and the citizen tier
 * calculation from index.html. The `check()` closures (which read live
 * game/wallet state) remain in the feature layer and are injected there.
 */

export const XP_TO_CHIPS_RATE = 2;

export interface CommunityQuest {
  id: string;
  title: string;
  desc: string;
  xp: number;
  chips: number;
}

export const FLIPSUITE_QUESTS: CommunityQuest[] = [
  { id: 'wallet', title: 'Citizen Sovereignty', desc: 'Connect your Cronos wallet in SmartHouse', xp: 250, chips: 100 },
  { id: 'dex', title: 'Slippage Scholar', desc: 'Simulate a DEX swap quote in WolfsCity Exchange', xp: 100, chips: 50 },
  { id: 'token', title: 'Token Foundry Founder', desc: 'Prepare an ERC-20 token launch plan in Wolf Lab', xp: 200, chips: 100 },
  { id: 'hodl', title: 'Diamond Hands Test', desc: 'Speak with @HodlHero in Diamond Hands District', xp: 150, chips: 75 },
  { id: 'casino', title: 'CroVegas High Roller', desc: 'Play any demo game in CroVegas Casino', xp: 100, chips: 50 },
];

/** Convert off-chain Flipsuite XP into CroVegas demo chips (1 XP = 2 Chips). */
export function convertXpToChips(xp: number): number {
  return xp * XP_TO_CHIPS_RATE;
}

/** Citizen tier from total score (Flipsuite XP + wallet bonus). */
export function citizenTier(totalScore: number): string {
  if (totalScore > 1000) return 'WHALE 🐋';
  if (totalScore > 500) return 'KNIGHT 🛡️';
  if (totalScore > 200) return 'CITIZEN 🏛️';
  if (totalScore > 50) return 'NORMIE 👤';
  return 'VISITOR 🐋';
}
