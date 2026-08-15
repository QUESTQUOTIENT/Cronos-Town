/**
 * features/flipsuite/index.ts — public surface.
 */
import type { EventBus } from '../../engine/events/EventBus';
import type { AuditPort, HapticsPort, ToastPort } from '../../engine/ports';
import { FlipsuiteController } from './controller';
import { initialState } from './state';
import type { FlipsuiteElements, FlipsuiteState } from './types';

export interface FlipsuiteFeature {
  controller: FlipsuiteController;
  state: FlipsuiteState;
}

export interface FlipsuiteBootstrap {
  bus: EventBus;
  toast: ToastPort;
  audit: AuditPort;
  haptics: HapticsPort;
  currentDay: () => string;
  questChecks: Record<string, () => boolean>;
  walletConnected: () => boolean;
  persist: (state: FlipsuiteState) => void;
  elements: FlipsuiteElements;
}

export function createFlipsuiteFeature(bootstrap: FlipsuiteBootstrap): FlipsuiteFeature {
  const state = initialState();
  const setStatus = (text: string) => {
    if (bootstrap.elements.status) bootstrap.elements.status.textContent = text;
  };
  const controller = new FlipsuiteController(
    {
      bus: bootstrap.bus,
      toast: bootstrap.toast,
      audit: bootstrap.audit,
      haptics: bootstrap.haptics,
      currentDay: bootstrap.currentDay,
      questChecks: bootstrap.questChecks,
      walletConnected: bootstrap.walletConnected,
      persist: bootstrap.persist,
    },
    state,
    setStatus,
  );
  return { controller, state };
}

export * from './types';
