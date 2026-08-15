import { describe, expect, it } from 'vitest';
import { planPropagation } from '../src/engine/projects/StudioPropagation';
import type { StudioObject } from '../src/engine/projects/StudioProject';

const object = (id: string, kind: StudioObject['kind'], data: Record<string, unknown> = {}): StudioObject => ({ id, kind, name: id, data, references: [], updatedAt: 1 });

describe('Studio propagation contracts', () => {
  it('declares token consumers rather than making editor-specific links', () => {
    const plan = planPropagation([object('gold', 'token'), object('shop', 'npc'), object('market', 'marketplace')], 'gold');
    expect(plan.changes.map((change) => change.id)).toEqual(['shop', 'market']);
    expect(plan.changes[0].data.currencyToken).toBe('gold');
    expect(plan.strategy).toBe('transactional');
    expect(plan.impact).toEqual({ npc: 1, marketplace: 1 });
  });

  it('honors contract conditions unless a caller explicitly forces a migration', () => {
    const objects = [object('gold', 'token'), object('legacy-shop', 'npc', { currencyToken: 'old-token' })];
    expect(planPropagation(objects, 'gold', { strategy: 'preview' }).changes).toHaveLength(0);
    expect(planPropagation(objects, 'gold', { force: true }).changes).toHaveLength(1);
  });

  it('only binds state-driven narrative consumers to world state', () => {
    const plan = planPropagation([object('night', 'world-state'), object('chapter', 'story', { stateDriven: true }), object('other', 'dialogue')], 'night');
    expect(plan.changes.map((change) => change.id)).toEqual(['chapter']);
  });
});
