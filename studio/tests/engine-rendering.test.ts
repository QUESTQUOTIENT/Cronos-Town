import { describe, expect, it } from 'vitest';

import { layoutMinimap, MINIMAP_COLORS } from '../src/engine/rendering/Renderer';

function makeInput() {
  return {
    columns: 117,
    worldRows: 96,
    tileWidth: 5,
    tileHeight: 5,
    worldOriginX: 25,
    cityRows: 32,
    jungleRows: 32,
    townOffsetRows: 64,
    crovegasForestStartX: 45,
    crovegasStartX: 60,
    crovegasEndX: 90,
    roads: new Set<string>(['3,72']),
    ponds: [{ x: 20, y: 77, width: 6, height: 4 }],
    buildings: [{ x: 67, y: 3, width: 15, height: 10, kind: 'casino' as const }],
  };
}

describe('engine/rendering — minimap layout (legacy parity)', () => {
  it('emits the base + 5 band fills first (in order)', () => {
    const cmds = layoutMinimap(makeInput());
    const fills = cmds.filter((c) => c.kind === 'fill');
    expect(fills.length).toBeGreaterThanOrEqual(6);
    expect(fills[0].style.fill).toBe(MINIMAP_COLORS.base);
    expect(fills[1].style.fill).toBe(MINIMAP_COLORS.city);
    expect(fills[2].style.fill).toBe(MINIMAP_COLORS.forestBand);
    expect(fills[3].style.fill).toBe(MINIMAP_COLORS.crovegas);
  });

  it('roads are drawn at world-origin-offset coordinates', () => {
    const cmds = layoutMinimap(makeInput());
    const road = cmds.find((c) => c.kind === 'fill' && c.style.fill === MINIMAP_COLORS.road);
    expect(road).toBeDefined();
    // road key "3,72" -> x = 3 + 25 = 28, y = 72
    expect((road as { rect: { x: number; y: number } }).rect).toMatchObject({ x: 28, y: 72 });
  });

  it('ponds produce a fill + a stroke', () => {
    const cmds = layoutMinimap(makeInput());
    const pondFill = cmds.find((c) => c.kind === 'fill' && c.style.fill === MINIMAP_COLORS.pond);
    const pondStroke = cmds.find((c) => c.kind === 'stroke' && c.style.stroke === MINIMAP_COLORS.pondStroke);
    expect(pondFill).toBeDefined();
    expect(pondStroke).toBeDefined();
    expect((pondFill as { rect: { x: number } }).rect.x).toBe(20 + 25);
  });

  it('casino buildings use the casino color', () => {
    const cmds = layoutMinimap(makeInput());
    const casino = cmds.find((c) => c.kind === 'fill' && c.style.fill === MINIMAP_COLORS.casino);
    expect(casino).toBeDefined();
  });

  it('non-casino/market/exchange buildings use the generic building color', () => {
    const input = makeInput();
    input.buildings = [{ x: 10, y: 10, width: 5, height: 5, kind: 'other' }];
    const cmds = layoutMinimap(input);
    const building = cmds.find((c) => c.kind === 'fill' && c.style.fill === MINIMAP_COLORS.building);
    expect(building).toBeDefined();
  });
});
