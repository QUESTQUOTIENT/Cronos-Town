/**
 * features/flipsuite/types.ts
 *
 * Public types for the Flipsuite community economy feature (@Flippy).
 */

export interface FlipsuiteState {
  xp: number;
  chips: number;
  claimedQuestIds: string[];
  airdropClaimedDay: string;
}

export interface FlipsuiteElements {
  xpReadout: { textContent: string } | null;
  tierReadout: { textContent: string } | null;
  airdropStatus: { textContent: string } | null;
  status: { textContent: string } | null;
}
