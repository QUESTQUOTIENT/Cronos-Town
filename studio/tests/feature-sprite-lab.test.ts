import { describe, expect, it } from 'vitest';

import {
  allowedPresets,
  clampSheetDimension,
  CUSTOMIZER_SIZE_INFO,
  CUSTOMIZER_TARGET_IDS,
  CUSTOMIZER_TARGETS,
  DEFAULT_SHEET,
  isPresetAllowedForTarget,
  normalizeTarget,
  SPRITE_PRESETS,
} from '../src/features/sprite-lab/presets';

import { createSpriteLabFeature } from '../src/features/sprite-lab';
import { EventBus } from '../src/engine/events/EventBus';
import type { HapticsPort, ToastPort } from '../src/engine/ports';

function noopToast(): ToastPort {
  return { notify: () => {} };
}
function noopHaptics(): HapticsPort {
  return { effect: () => {} };
}

describe('features/sprite-lab/controller — apply/reset/save (legacy parity)', () => {
  function make(overrides: Partial<Parameters<typeof createSpriteLabFeature>[0]> = {}) {
    let persisted: Record<string, unknown> = {};
    return createSpriteLabFeature({
      bus: new EventBus(),
      toast: noopToast(),
      haptics: noopHaptics(),
      applyStyles: () => {},
      persist: (s) => { persisted = s; },
      ...overrides,
    });
  }

  it('targetIsSheet is true only for character/npc', () => {
    const f = make();
    f.controller.setTarget('character');
    expect(f.controller.targetIsSheet()).toBe(true);
    f.controller.setTarget('grass');
    expect(f.controller.targetIsSheet()).toBe(false);
  });

  it('applyDraft stores the sprite under the current target', () => {
    const f = make();
    f.controller.setTarget('grass');
    f.controller.setDraftImage('sprites/grass.png', 1, 1);
    f.controller.applyDraft();
    expect(f.controller.spriteFor('grass')).toEqual({ image: 'sprites/grass.png', sheet: { columns: 1, rows: 1 } });
  });

  it('applyDraft is a no-op without a draft image', () => {
    const f = make();
    f.controller.applyDraft();
    expect(f.controller.spriteFor('grass')).toBeUndefined();
  });

  it('resetTarget clears a single sprite; resetAll clears everything', () => {
    const f = make();
    f.controller.setTarget('grass');
    f.controller.setDraftImage('a.png', 1, 1);
    f.controller.applyDraft();
    f.controller.setTarget('tree');
    f.controller.setDraftImage('b.png', 1, 1);
    f.controller.applyDraft();
    expect(f.controller.spriteFor('grass')).toBeDefined();
    expect(f.controller.spriteFor('tree')).toBeDefined();

    f.controller.resetTarget('grass');
    expect(f.controller.spriteFor('grass')).toBeUndefined();
    expect(f.controller.spriteFor('tree')).toBeDefined();

    f.controller.resetAll();
    expect(f.controller.spriteFor('tree')).toBeUndefined();
  });

  it('clamps sheet dimensions on setDraftImage', () => {
    const f = make();
    f.controller.setDraftImage('x.png', 0, -5);
    expect(f.state.draftSheet).toEqual({ columns: 4, rows: 4 });
  });
});

describe('features/sprite-lab/presets — catalog + targets (legacy parity)', () => {
  it('has 16 targets with the exact labels', () => {
    expect(CUSTOMIZER_TARGET_IDS).toHaveLength(16);
    expect(CUSTOMIZER_TARGETS.grass.label).toBe('Grass tiles');
    expect(CUSTOMIZER_TARGETS.character.label).toBe('Player sprite sheet');
    expect(CUSTOMIZER_TARGETS.character.spriteSheet).toBe(true);
    expect(CUSTOMIZER_TARGETS.npc.spriteSheet).toBe(true);
    expect(CUSTOMIZER_TARGETS.ui.object).toBe(false);
  });

  it('has 58 presets across 8 groups', () => {
    expect(SPRITE_PRESETS).toHaveLength(58);
    const groups = new Set(SPRITE_PRESETS.map((p) => p.group));
    expect([...groups].sort()).toEqual(['arena', 'bosses', 'buildings', 'characters', 'nature', 'scenes', 'terrain', 'ui']);
  });

  it('allowedPresets filters by target group', () => {
    expect(allowedPresets('grass').every((p) => p.group === 'terrain')).toBe(true);
    expect(allowedPresets('tree').every((p) => p.group === 'nature')).toBe(true);
    expect(allowedPresets('character').every((p) => p.group === 'characters' || p.group === 'bosses')).toBe(true);
    expect(allowedPresets('mailbox')).toHaveLength(0);
  });

  it('isPresetAllowedForTarget matches the allowed mapping', () => {
    const grass = SPRITE_PRESETS.find((p) => p.value === 'sprites/grass.png')!;
    const tree = SPRITE_PRESETS.find((p) => p.value === 'sprites/green_tree.png')!;
    expect(isPresetAllowedForTarget(grass, 'grass')).toBe(true);
    expect(isPresetAllowedForTarget(grass, 'tree')).toBe(false);
    expect(isPresetAllowedForTarget(tree, 'tree')).toBe(true);
  });

  it('normalizeTarget defaults to grass', () => {
    expect(normalizeTarget('character')).toBe('character');
    expect(normalizeTarget('bogus')).toBe('grass');
  });

  it('size info is present for every target', () => {
    expect(CUSTOMIZER_SIZE_INFO.grass.tiles).toBe('1 × 1');
    expect(CUSTOMIZER_SIZE_INFO.character.tiles).toBe('4 × 4 sheet');
  });

  it('clampSheetDimension clamps to >= 1 with default 4', () => {
    expect(DEFAULT_SHEET).toEqual({ columns: 4, rows: 4 });
    expect(clampSheetDimension(8)).toBe(8);
    expect(clampSheetDimension(0)).toBe(4);
    expect(clampSheetDimension(-3)).toBe(4);
    expect(clampSheetDimension(NaN)).toBe(4);
  });
});
