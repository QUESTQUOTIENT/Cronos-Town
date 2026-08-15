import { describe, expect, it } from 'vitest';

import { EventBus } from '../src/engine/events/EventBus';
import type { ToastPort } from '../src/engine/ports';
import { createAiStudioFeature } from '../src/features/ai-studio';
import { AI_STUDIO_ROLE_IDS, AI_STUDIO_ROLES } from '../src/features/ai-studio';

function noopToast(): ToastPort {
  return { notify: () => {} };
}

describe('features/ai-studio — workstations (legacy parity)', () => {
  it('has all 5 workstations with exact titles', () => {
    expect(AI_STUDIO_ROLE_IDS).toEqual(['coding', 'image', 'social', 'company', 'brand']);
    expect(AI_STUDIO_ROLES.coding.title).toBe('CODING PC · APP + WEBSITE BUILDER');
    expect(AI_STUDIO_ROLES.image.title).toBe('IMAGE PC · ASSET + LOGO STUDIO');
    expect(AI_STUDIO_ROLES.social.title).toBe('SOCIAL PC · POST IDEA GENERATOR');
    expect(AI_STUDIO_ROLES.company.title).toBe('COMPANY PC · BUILDING GUIDE');
    expect(AI_STUDIO_ROLES.brand.title).toBe('BRAND PC · ASSET BRAND STRATEGY');
  });

  it('local draft uses the role template + prompt', () => {
    const f = createAiStudioFeature({ bus: new EventBus(), toast: noopToast() });
    f.controller.setRole('coding');
    const draft = f.controller.localDraft('a swap app');
    expect(draft).toContain('CODING PLAN');
    expect(draft).toContain('a swap app');
    expect(draft).toContain('chain ID 25');
  });

  it('social draft includes the 3 post ideas and the no-profit disclaimer', () => {
    const f = createAiStudioFeature({ bus: new EventBus(), toast: noopToast() });
    f.controller.setRole('social');
    const draft = f.controller.localDraft('');
    expect(draft).toContain('SOCIAL POST IDEAS');
    expect(draft).toContain('Avoid promises of profit');
  });

  it('generate falls back to local when no model/url is configured', async () => {
    const f = createAiStudioFeature({ bus: new EventBus(), toast: noopToast() });
    const res = await f.controller.generate('anything');
    expect(res.usedAi).toBe(false);
    expect(res.text).toContain('CODING PLAN'); // default role = coding
  });

  it('generate uses the AI endpoint when configured and returns its text', async () => {
    const f = createAiStudioFeature({
      bus: new EventBus(),
      toast: noopToast(),
      requestChat: async () => 'AI-GENERATED OUTPUT',
    });
    f.state.baseUrl = 'https://api.example.com';
    f.state.model = 'gpt-test';
    const res = await f.controller.generate('brief');
    expect(res.usedAi).toBe(true);
    expect(res.text).toBe('AI-GENERATED OUTPUT');
  });

  it('generate falls back to local when the AI endpoint throws', async () => {
    const f = createAiStudioFeature({
      bus: new EventBus(),
      toast: noopToast(),
      requestChat: async () => {
        throw new Error('down');
      },
    });
    f.state.baseUrl = 'https://api.example.com';
    f.state.model = 'gpt-test';
    const res = await f.controller.generate('brief');
    expect(res.usedAi).toBe(false);
    expect(res.text).toContain('CODING PLAN');
  });
});
