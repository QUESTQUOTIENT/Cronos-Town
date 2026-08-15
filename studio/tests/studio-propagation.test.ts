import { describe, expect, it } from 'vitest';
import { planPropagation } from '../src/engine/projects/StudioPropagation';
import type { StudioObject } from '../src/engine/projects/StudioProject';

const object = (id: string, kind: StudioObject['kind'], data: Record<string, unknown> = {}): StudioObject => ({ id, kind, name: id, data, references: [], updatedAt: 1 });

describe('Studio propagation contracts', () => {
  it('declares token consumers rather than making editor-specific links', () => {
    const plan = planPropagation([object('gold', 'token'), object('shop', 'npc'), object('market', 'marketplace')], 'gold');
    expect(plan.changes.map((change) => change.id)).toEqual(['shop', 'market']);
    expect(plan.changes[0].data.currencyToken).toBe('gold');
  });

  it('only binds state-driven narrative consumers to world state', () => {
    const plan = planPropagation([object('night', 'world-state'), object('chapter', 'story', { stateDriven: true }), object('other', 'dialogue')], 'night');
    expect(plan.changes.map((change) => change.id)).toEqual(['chapter']);
  });
});
