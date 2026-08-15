/**
 * features/sprite-lab/index.ts — public surface.
 */
import type { EventBus } from '../../engine/events/EventBus';
import type { HapticsPort, ToastPort } from '../../engine/ports';
import { SpriteLabController, initialState, type SpriteDraft, type SpriteLabState } from './controller';

export interface SpriteLabFeature {
  controller: SpriteLabController;
  state: SpriteLabState;
}

export interface SpriteLabBootstrap {
  bus: EventBus;
  toast: ToastPort;
  haptics: HapticsPort;
  applyStyles: (sprites: Record<string, SpriteDraft>) => void;
  persist: (sprites: Record<string, SpriteDraft>) => void;
}

export function createSpriteLabFeature(bootstrap: SpriteLabBootstrap): SpriteLabFeature {
  const state = initialState();
  const controller = new SpriteLabController(
    { bus: bootstrap.bus, toast: bootstrap.toast, haptics: bootstrap.haptics, applyStyles: bootstrap.applyStyles, persist: bootstrap.persist },
    state,
  );
  return { controller, state };
}

export * from './presets';
export { SpriteLabController, initialState } from './controller';
export type { SpriteDraft, SpriteLabState, SpriteSheet } from './controller';
