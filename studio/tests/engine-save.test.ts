import { describe, expect, it } from 'vitest';

import { deserializeSave, remapBuildingLabel, SAVE_STORAGE_KEY, SAVE_VERSION, serializeSave } from '../src/engine/save/schema';

describe('engine/save/schema — versioned save data', () => {
  it('save version is 1 and key is cronos-town-save', () => {
    expect(SAVE_VERSION).toBe(1);
    expect(SAVE_STORAGE_KEY).toBe('cronos-town-save');
  });

  it('remaps legacy building labels', () => {
    expect(remapBuildingLabel('Huge Mall')).toBe('Marketplace');
    expect(remapBuildingLabel('Taco Place')).toBe('Taco Palace');
    expect(remapBuildingLabel('SmartHouse')).toBe('SmartHouse');
    expect(remapBuildingLabel(null)).toBeNull();
    expect(remapBuildingLabel(undefined)).toBeNull();
  });

  it('deserialize applies player defaults', () => {
    const save = deserializeSave('{}');
    expect(save.player).toEqual({ x: 3, y: 3, mode: 'inside', facing: { x: 0, y: -1 } });
    expect(save.walletRole).toBe('Visitor');
    expect(save.managerLocation).toBe('manager-house');
    expect(save.garageAccessUnlocked).toBe(false);
  });

  it('deserialize remaps activeBuilding label', () => {
    const save = deserializeSave(JSON.stringify({ activeBuilding: 'Huge Mall' }));
    expect(save.activeBuilding).toBe('Marketplace');
  });

  it('deserialize coerces flags to booleans and arrays to arrays', () => {
    const save = deserializeSave(JSON.stringify({ bagOwned: 1, bagItems: 'not-array', wolfieHoldings: ['x'] }));
    expect(save.bagOwned).toBe(true);
    expect(save.bagItems).toEqual([]);
    expect(save.wolfieHoldings).toEqual(['x']);
  });

  it('deserialize: garageAccessUnlocked inherits bagOwned', () => {
    const save = deserializeSave(JSON.stringify({ bagOwned: true }));
    expect(save.garageAccessUnlocked).toBe(true);
  });

  it('serialize -> deserialize round-trips', () => {
    const original = deserializeSave('{}');
    const roundTrip = deserializeSave(serializeSave(original));
    expect(roundTrip).toEqual(original);
  });
});
