/**
 * engine/save/schema.ts — versioned save-game schema (pure).
 *
 * Behavior-preserving port of the legacy `saveGame` / `loadGame` data shape and
 * the building-label remap from index.html. The version is `1` (the "versioned
 * dual local/server save schema" from Phase 3.1). localStorage I/O stays in an
 * adapter; this module owns the *shape* and the pure decode/remap rules.
 */

export const SAVE_VERSION = 1;
export const SAVE_STORAGE_KEY = 'cronos-town-save';

export interface SavePlayer {
  x: number;
  y: number;
  mode: 'inside' | 'outside';
  facing: { x: number; y: number };
}

export interface GameSave {
  version: number;
  player: SavePlayer;
  activeBuilding: string | null;
  interiorLevel: number;
  playerName: string;
  friendName: string;
  gameTime: string;
  clockSet: boolean;
  managerVisitRequested: boolean;
  managerVisitUnlocked: boolean;
  managerVisitComplete: boolean;
  managerStoryTold: boolean;
  smartHouseAccessGranted: boolean;
  walletHouseAccessGranted: boolean;
  townWalletReceived: boolean;
  friendStoryTold: boolean;
  friendArrivalStarted: boolean;
  friendArrivalComplete: boolean;
  friendDeparted: boolean;
  managerSmartHouseEventStarted: boolean;
  managerSmartHousePresent: boolean;
  managerLocation: string;
  assistantSteppedAside: boolean;
  playerHasWolfie: boolean;
  wolfieHoldings: unknown[];
  journeyPrepRequired: boolean;
  journeyReady: boolean;
  wolfieHelpAvailable: boolean;
  bagOwned: boolean;
  garageAccessUnlocked: boolean;
  bagItems: unknown[];
  roommateGarageEventStarted: boolean;
  exchangeCityIntroduced: boolean;
  croSpringsFriendEncounterStarted: boolean;
  croSpringsFriendEncounterComplete: boolean;
  walletAddress: string;
  walletRole: string;
}

/**
 * Legacy building-label remap applied on load:
 *   'Huge Mall' -> 'Marketplace', 'Taco Place' -> 'Taco Palace'.
 */
export function remapBuildingLabel(label: string | null | undefined): string | null {
  if (label == null) return null;
  if (label === 'Huge Mall') return 'Marketplace';
  if (label === 'Taco Place') return 'Taco Palace';
  return label;
}

/** Serialize a save object to the exact JSON stored under the save key. */
export function serializeSave(save: GameSave): string {
  return JSON.stringify(save);
}

/**
 * Parse a raw JSON string into a GameSave, tolerating partial/missing data the
 * same way the legacy `loadGame` did (defaults mirror the `?? fallback` chain).
 */
export function deserializeSave(raw: string): GameSave {
  const save = JSON.parse(raw) as Partial<GameSave>;
  return {
    version: SAVE_VERSION,
    player: {
      x: save.player?.x ?? 3,
      y: save.player?.y ?? 3,
      mode: save.player?.mode || 'inside',
      facing: save.player?.facing || { x: 0, y: -1 },
    },
    activeBuilding: remapBuildingLabel(save.activeBuilding),
    interiorLevel: save.interiorLevel || 1,
    playerName: save.playerName || '',
    friendName: save.friendName || '',
    gameTime: save.gameTime || '',
    clockSet: Boolean(save.clockSet),
    managerVisitRequested: Boolean(save.managerVisitRequested),
    managerVisitUnlocked: Boolean(save.managerVisitUnlocked),
    managerVisitComplete: Boolean(save.managerVisitComplete),
    managerStoryTold: Boolean(save.managerStoryTold),
    smartHouseAccessGranted: Boolean(save.smartHouseAccessGranted),
    walletHouseAccessGranted: Boolean(save.walletHouseAccessGranted),
    townWalletReceived: Boolean(save.townWalletReceived),
    friendStoryTold: Boolean(save.friendStoryTold),
    friendArrivalStarted: Boolean(save.friendArrivalStarted),
    friendArrivalComplete: Boolean(save.friendArrivalComplete),
    friendDeparted: Boolean(save.friendDeparted),
    managerSmartHouseEventStarted: Boolean(save.managerSmartHouseEventStarted),
    managerSmartHousePresent: Boolean(save.managerSmartHousePresent),
    managerLocation: save.managerLocation || (save.managerSmartHousePresent ? 'smart-house' : 'manager-house'),
    assistantSteppedAside: Boolean(save.assistantSteppedAside),
    playerHasWolfie: Boolean(save.playerHasWolfie),
    wolfieHoldings: Array.isArray(save.wolfieHoldings) ? save.wolfieHoldings : [],
    journeyPrepRequired: Boolean(save.journeyPrepRequired),
    journeyReady: Boolean(save.journeyReady),
    wolfieHelpAvailable: Boolean(save.wolfieHelpAvailable),
    bagOwned: Boolean(save.bagOwned),
    garageAccessUnlocked: Boolean(save.garageAccessUnlocked || save.bagOwned),
    bagItems: Array.isArray(save.bagItems) ? save.bagItems : [],
    roommateGarageEventStarted: Boolean(save.roommateGarageEventStarted),
    exchangeCityIntroduced: Boolean(save.exchangeCityIntroduced),
    croSpringsFriendEncounterStarted: Boolean(save.croSpringsFriendEncounterStarted),
    croSpringsFriendEncounterComplete: Boolean(save.croSpringsFriendEncounterComplete),
    walletAddress: save.walletAddress || '',
    walletRole: save.walletRole || 'Visitor',
  };
}
