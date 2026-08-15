/**
 * features/ai-studio/index.ts — public surface.
 */
import type { EventBus } from '../../engine/events/EventBus';
import type { ToastPort } from '../../engine/ports';
import { AiStudioController } from './controller';
import { initialState } from './state';
import type { AiStudioState } from './types';

export interface AiStudioFeature {
  controller: AiStudioController;
  state: AiStudioState;
}

export interface AiStudioBootstrap {
  bus: EventBus;
  toast: ToastPort;
  requestChat?: (baseUrl: string, apiKey: string, model: string, messages: Array<{ role: string; content: string }>) => Promise<string>;
}

export function createAiStudioFeature(bootstrap: AiStudioBootstrap): AiStudioFeature {
  const state = initialState();
  const controller = new AiStudioController(
    { bus: bootstrap.bus, toast: bootstrap.toast, requestChat: bootstrap.requestChat },
    state,
  );
  return { controller, state };
}

export * from './types';
export { AI_STUDIO_ROLES, AI_STUDIO_ROLE_IDS, normalizeRole } from './roles';
