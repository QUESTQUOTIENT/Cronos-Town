import { describe, expect, it } from 'vitest';

import { StudioColors, StudioMotion, StudioSpacing, StudioWorld, studioTheme } from '../src/ui/theme';
import { defaultStudioToolbar, toneColor } from '../src/ui/components';

describe('ui/theme — design-system tokens', () => {
  it('locks the Neo-GBA palette', () => {
    expect(StudioColors.bg).toBe('#0a0f0d');
    expect(StudioColors.glass).toBe('#141f1a');
    expect(StudioColors.teal).toBe('#83d1c7');
    expect(StudioColors.gold).toBe('#f3d575');
    expect(StudioColors.red).toBe('#a8403d');
    expect(StudioColors.green).toBe('#79f2c0');
  });

  it('locks the 120ms hard-cut motion', () => {
    expect(StudioMotion.hardCut).toBe(120);
  });

  it('locks the 1:1 tile world invariants', () => {
    expect(StudioWorld.viewportAspectRatio).toBeCloseTo(1.4285714285714286, 12);
    expect(StudioWorld.worldAspectRatioCss).toBe('20 / 14');
    expect(StudioWorld.worldWidthClamp).toBe('min(100vw, calc(100vh * 1.428571))');
    expect(StudioWorld.tileSize).toBe(32);
  });

  it('exposes spacing scale', () => {
    expect(StudioSpacing.sm).toBe(8);
    expect(StudioSpacing.lg).toBe(16);
  });

  it('theme object carries every token group', () => {
    expect(studioTheme.bg).toBe(StudioColors.bg);
    expect(studioTheme.spacing).toBe(StudioSpacing);
    expect(studioTheme.motion.hardCut).toBe(120);
    expect(studioTheme.world.tileSize).toBe(32);
  });
});

describe('ui/components — contracts', () => {
  it('toneColor maps tones to palette colors', () => {
    expect(toneColor('primary', StudioColors)).toBe(StudioColors.teal);
    expect(toneColor('gold', StudioColors)).toBe(StudioColors.gold);
    expect(toneColor('danger', StudioColors)).toBe(StudioColors.red);
    expect(toneColor('success', StudioColors)).toBe(StudioColors.green);
    expect(toneColor('default', StudioColors)).toBe(StudioColors.teal);
  });

  it('defaultStudioToolbar mirrors the World Studio top bar', () => {
    const bar = defaultStudioToolbar();
    expect(bar.kind).toBe('toolbar');
    expect(bar.buttons.map((b) => b.id)).toEqual(['undo', 'redo', 'save', 'export']);
    expect(bar.buttons.find((b) => b.id === 'export')?.tone).toBe('gold');
  });
});
