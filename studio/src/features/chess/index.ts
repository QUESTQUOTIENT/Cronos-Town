/**
 * features/chess/index.ts — public surface.
 */
import type { EventBus } from '../../engine/events/EventBus';
import type { AuditPort, HapticsPort, ToastPort } from '../../engine/ports';
import { ChessController } from './controller';
import { initialState } from './state';
import type { ChessState } from './types';

export interface ChessFeature {
  controller: ChessController;
  state: ChessState;
}

export interface ChessBootstrap {
  bus: EventBus;
  toast: ToastPort;
  audit: AuditPort;
  haptics: HapticsPort;
  randomInt: (max: number) => number;
  onPlayerCheckmate: () => void;
}

export function createChessFeature(bootstrap: ChessBootstrap): ChessFeature {
  const state = initialState();
  const controller = new ChessController({
    bus: bootstrap.bus,
    toast: bootstrap.toast,
    audit: bootstrap.audit,
    haptics: bootstrap.haptics,
    randomInt: bootstrap.randomInt,
    onPlayerCheckmate: bootstrap.onPlayerCheckmate,
  });
  return { controller, state };
}

export * from './types';
