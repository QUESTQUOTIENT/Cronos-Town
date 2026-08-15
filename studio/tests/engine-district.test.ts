import { describe, expect, it } from 'vitest';

import { CITY_ROWS, CROVEGAS_FOREST_START_X, CROVEGAS_START_X, TOWN_OFFSET_ROWS } from '../src/engine/world/config';
import { districtAt, minimapLocationLine } from '../src/engine/world/district';

describe('engine/world/district — zone detection (legacy parity)', () => {
  it('CroVegas: east of CROVEGAS_START_X and above the city band', () => {
    expect(districtAt(CROVEGAS_START_X + 1, 5)).toBe('CroVegas');
  });

  it('CroVegas Forest: the corridor band', () => {
    expect(districtAt(CROVEGAS_FOREST_START_X + 1, 5)).toBe('CroVegas Forest');
  });

  it('Liquidity Valley: west of -3, in the lower band', () => {
    expect(districtAt(-10, TOWN_OFFSET_ROWS + 5)).toBe('Liquidity Valley');
  });

  it('Wolf Street: negative x, above the city band', () => {
    expect(districtAt(-5, 5)).toBe('Wolf Street');
  });

  it('jungle: the jungle band (cityRows..townOffsetRows)', () => {
    expect(districtAt(30, CITY_ROWS + 1)).toBe('Cro Springs');
  });

  it('city: above cityRows', () => {
    expect(districtAt(30, 5)).toBe('WolfsCity');
  });

  it('town: everything else (lower band)', () => {
    expect(districtAt(30, TOWN_OFFSET_ROWS + 10)).toBe('Cronos Town');
  });

  it('minimap location line format', () => {
    const line = minimapLocationLine('CroVegas', 61, 5, 30, 70);
    expect(line).toBe('CroVegas · Cursor: 61, 5 · Player: 30, 70');
  });
});
