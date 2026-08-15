import { describe, expect, it } from 'vitest';

import {
  defaultMapEditorState,
  defaultWorldStudioState,
  normalizeMapEditorState,
  STUDIO_MODULES,
} from '../src/features/editor/studio-state';

describe('features/editor/studio-state — schema + normalization (legacy parity)', () => {
  it('default state has the exact studio defaults', () => {
    const s = defaultWorldStudioState();
    expect(s.module).toBe('terrain');
    expect(s.brush).toBe('paint');
    expect(s.activeAsset).toBe('sprites/grass.png');
    expect(s.activeFootprint).toEqual({ width: 1, height: 1 });
    expect(s.newNpcName).toBe('New NPC');
    expect(s.activeLayers).toEqual({ terrain: true, buildings: true, characters: true, objects: true, collision: false, events: false, lighting: false });
    expect(s.lighting).toEqual({ preset: 'day', intensity: 1 });
    expect(s.audio.volume).toBe(0.7);
    expect(s.audio.effects).toHaveProperty('expand', '');
  });

  it('7 studio modules', () => {
    expect(STUDIO_MODULES).toEqual(['terrain', 'buildings', 'characters', 'objects', 'ui', 'audio', 'export']);
  });

  it('normalizeMapEditorState tolerates null/undefined', () => {
    const s = normalizeMapEditorState(null);
    expect(s.exterior).toEqual([]);
    expect(s.bounds.minX).toBe(-22);
    expect(s.studio.module).toBe('terrain');
  });

  it('normalizes invalid bounds + truncates to integers', () => {
    const s = normalizeMapEditorState({ bounds: { minX: 40, maxX: 10, minY: 'x', maxY: 8.9 } });
    expect(s.bounds.minX).toBe(10);
    expect(s.bounds.maxX).toBe(40);
  });

  it('merges partial studio with defaults and clamps footprint', () => {
    const s = normalizeMapEditorState({ studio: { module: 'objects', activeFootprint: { width: 0, height: -3 } } });
    expect(s.studio.module).toBe('objects');
    expect(s.studio.activeFootprint).toEqual({ width: 1, height: 1 });
    expect(s.studio.activeAsset).toBe('sprites/grass.png'); // default preserved
  });

  it('whitelists module/characterTarget/newNpcBehavior', () => {
    const s = normalizeMapEditorState({ studio: { module: 'bogus', characterTarget: 'npc', newNpcBehavior: 'rotate' } });
    expect(s.studio.module).toBe('terrain');
    expect(s.studio.characterTarget).toBe('npc');
    expect(s.studio.newNpcBehavior).toBe('rotate');

    const s2 = normalizeMapEditorState({ studio: { characterTarget: 'weird', newNpcBehavior: 'weird' } });
    expect(s2.studio.characterTarget).toBe('character');
    expect(s2.studio.newNpcBehavior).toBe('idle');
  });

  it('coerces events/dialogues to arrays and merges lighting/audio/effects', () => {
    const s = normalizeMapEditorState({ studio: { events: 'not-array', dialogues: null, lighting: { intensity: 2 }, audio: { volume: 0.3 } } });
    expect(s.studio.events).toEqual([]);
    expect(s.studio.dialogues).toEqual([]);
    expect(s.studio.lighting).toEqual({ preset: 'day', intensity: 2 });
    expect(s.studio.audio.volume).toBe(0.3);
    expect(s.studio.audio.effects.move).toBe(''); // effect default preserved
  });

  it('restores Jim\'s Garage from removedExterior', () => {
    const s = normalizeMapEditorState({
      removedExterior: [
        { id: "jim's garage", label: "Jim's Garage" },
        { id: 'some-other-building', label: 'Some Building' },
      ],
    });
    expect(s.removedExterior).toHaveLength(1);
    expect(s.removedExterior[0]).toMatchObject({ id: 'some-other-building' });
  });

  it('preserves non-Jim removals', () => {
    const s = normalizeMapEditorState({ removedExterior: [{ id: 'house-x' }, { label: 'Gym' }] });
    expect(s.removedExterior).toHaveLength(2);
  });
});
