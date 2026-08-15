/**
 * features/flipsuite/state.ts — pure state + reducers.
 */
import type { FlipsuiteState } from './types';

export function initialState(): FlipsuiteState {
  return { xp: 0, chips: 0, claimedQuestIds: [], airdropClaimedDay: '' };
}
