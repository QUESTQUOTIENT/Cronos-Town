/**
 * features/ai-studio/controller.ts — use-cases (draft generation).
 *
 * Faithful port of the local drafting + AI-backed drafting flows from index.html
 * (`localAiStudioDraft`, `generateAiStudioDraft`). The local draft is pure; the
 * AI-backed path delegates to an injected `requestChat` port.
 */
import type { EventBus } from '../../engine/events/EventBus';
import type { ToastPort } from '../../engine/ports';
import type { AiStudioRoleConfig, AiStudioState } from './types';
import { AI_STUDIO_ROLES, normalizeRole } from './roles';

export interface AiStudioDependencies {
  bus: EventBus;
  toast: ToastPort;
  /** OpenAI-compatible chat completion (injected; undefined = local-only). */
  requestChat?: (baseUrl: string, apiKey: string, model: string, messages: Array<{ role: string; content: string }>) => Promise<string>;
}

export class AiStudioController {
  constructor(
    private readonly deps: AiStudioDependencies,
    private readonly state: AiStudioState,
  ) {}

  setRole(role: string): void {
    this.state.role = normalizeRole(role);
  }

  config(): AiStudioRoleConfig {
    return AI_STUDIO_ROLES[this.state.role];
  }

  /** Local draft (mirrors `localAiStudioDraft`). */
  localDraft(prompt: string): string {
    return AI_STUDIO_ROLES[this.state.role].local(prompt.trim());
  }

  /** AI-backed draft, falling back to local (mirrors `generateAiStudioDraft`). */
  async generate(prompt: string): Promise<{ text: string; usedAi: boolean }> {
    const cfg = this.config();
    const messages = [
      { role: 'system', content: cfg.starter },
      { role: 'user', content: `User brief: ${prompt || 'Create a useful starter draft.'}` },
    ];
    if (!this.state.baseUrl || !this.state.model || !this.deps.requestChat) {
      return { text: this.localDraft(prompt), usedAi: false };
    }
    try {
      const output = await this.deps.requestChat(this.state.baseUrl, this.state.apiKey, this.state.model, messages);
      if (!output) throw new Error('The AI endpoint returned no text.');
      return { text: output, usedAi: true };
    } catch {
      return { text: this.localDraft(prompt), usedAi: false };
    }
  }
}
