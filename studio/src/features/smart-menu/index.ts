/**
 * features/smart-menu/index.ts — public surface.
 */
import type { EventBus } from '../../engine/events/EventBus';
import type { HapticsPort } from '../../engine/ports';
import { SmartMenuController } from './controller';
import { initialState } from './state';
import type { SmartMenuState, SmartMenuView } from './types';

export interface SmartMenuFeature {
  controller: SmartMenuController;
  state: SmartMenuState;
}

export interface SmartMenuBootstrap {
  bus: EventBus;
  haptics: HapticsPort;
  openPanel: (view: SmartMenuView) => void;
  openBattleCardsParty: () => void;
}

export function createSmartMenuFeature(bootstrap: SmartMenuBootstrap): SmartMenuFeature {
  const state = initialState();
  const controller = new SmartMenuController(
    { bus: bootstrap.bus, haptics: bootstrap.haptics, openPanel: bootstrap.openPanel, openBattleCardsParty: bootstrap.openBattleCardsParty },
    state,
  );
  return { controller, state };
}

export * from './types';
