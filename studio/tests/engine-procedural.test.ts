import { describe, expect, it } from 'vitest';
import buildings from './fixtures/buildings.json';

import {
  addBlockedArea,
  generateBlocked,
  generateRoads,
  isTallGrass,
  PONDS,
  tileHash,
  type BuildingFootprint,
} from '../src/engine/world/procedural';

function footprints(): BuildingFootprint[] {
  return buildings.map((b) => ({ x: b.x, y: b.y, width: b.w, height: b.h, mailboxX: b.mx, mailboxY: b.my }));
}

describe('engine/world/procedural — tile hash + tall grass + footprint filler', () => {
  it('tileHash is deterministic and in [0, 6)', () => {
    const a = tileHash(12, 34);
    const b = tileHash(12, 34);
    expect(a).toBe(b);
    expect(a).toBeGreaterThanOrEqual(0);
    expect(a).toBeLessThan(6);
  });

  it('addBlockedArea fills an x/y/width/height rectangle', () => {
    const set = new Set<string>();
    addBlockedArea(set, 3, 4, 2, 2);
    expect(set.size).toBe(4);
    expect(set.has('3,4')).toBe(true);
    expect(set.has('4,5')).toBe(true);
    expect(set.has('5,4')).toBe(false);
  });

  it('isTallGrass resolves the lower-town patch', () => {
    // patch row 4 (index 4) has 'g' at x=9..17; world y = 64 + 4 = 68
    expect(isTallGrass(9, 64 + 4)).toBe(true);
    expect(isTallGrass(0, 64 + 0)).toBe(false);
  });
});

describe('engine/world/procedural — road generation (byte-parity locked)', () => {
  it('produces exactly 1515 road cells (matches legacy output)', () => {
    expect(generateRoads().size).toBe(1515);
  });

  it('contains key district road markers', () => {
    const roads = generateRoads();
    // Liquidity Valley north-south road (x=-10/-9)
    expect(roads.has('-10,50')).toBe(true);
    expect(roads.has('-9,50')).toBe(true);
    // CroVegas vertical road (x=60/61)
    expect(roads.has('60,20')).toBe(true);
    expect(roads.has('61,20')).toBe(true);
    // Wolf Street west road (x=-21)
    expect(roads.has('-21,10')).toBe(true);
    // Lower-town road (shifted down by 64)
    expect(roads.has('3,72')).toBe(true);
  });
});

describe('engine/world/procedural — blocked generation (byte-parity locked)', () => {
  it('produces exactly 1955 blocked cells with the real footprints', () => {
    const roads = generateRoads();
    expect(generateBlocked(footprints(), PONDS, roads).size).toBe(1955);
  });

  it('blocks building footprints + mailboxes', () => {
    const roads = new Set<string>();
    const blocked = generateBlocked([{ x: 5, y: 5, width: 2, height: 2, mailboxX: 9, mailboxY: 9 }], PONDS, roads);
    expect(blocked.has('5,5')).toBe(true);
    expect(blocked.has('6,6')).toBe(true);
    expect(blocked.has('9,9')).toBe(true); // mailbox
  });

  it('blocks the three ponds', () => {
    const roads = new Set<string>();
    const blocked = generateBlocked([], PONDS, roads);
    expect(blocked.has('20,77')).toBe(true); // main pond (13 + 64 = 77)
    expect(blocked.has('-18,85')).toBe(true); // valley pond
    expect(blocked.has('16,5')).toBe(true); // city pond
  });

  it('leaves the Liquidity Valley road gap at y=75 open on x=-2', () => {
    const roads = generateRoads();
    const blocked = generateBlocked(footprints(), PONDS, roads);
    expect(blocked.has('-2,75')).toBe(false);
    expect(blocked.has('-2,70')).toBe(true);
  });
});
