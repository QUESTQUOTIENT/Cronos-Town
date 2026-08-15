/**
 * features/battle-cards/index.ts — public surface.
 */
import type { EventBus } from '../../engine/events/EventBus';
import type { AuditPort, HapticsPort, ToastPort } from '../../engine/ports';
import { BattleCardsController } from './controller';
import { initialState } from './state';
import type { BattleCardsState, ScanResult } from './types';

export interface BattleCardsFeature {
  controller: BattleCardsController;
  state: BattleCardsState;
}

export interface BattleCardsBootstrap {
  bus: EventBus;
  toast: ToastPort;
  audit: AuditPort;
  haptics: HapticsPort;
  scan: (wallet: string) => Promise<ScanResult>;
  wallet: () => string;
  nextId: () => string;
  isWalletConnected: () => boolean;
}

export function createBattleCardsFeature(bootstrap: BattleCardsBootstrap): BattleCardsFeature {
  const state = initialState();
  const controller = new BattleCardsController(
    {
      bus: bootstrap.bus,
      toast: bootstrap.toast,
      audit: bootstrap.audit,
      haptics: bootstrap.haptics,
      scan: bootstrap.scan,
      wallet: bootstrap.wallet,
      nextId: bootstrap.nextId,
      isWalletConnected: bootstrap.isWalletConnected,
    },
    state,
  );
  return { controller, state };
}

export * from './types';
