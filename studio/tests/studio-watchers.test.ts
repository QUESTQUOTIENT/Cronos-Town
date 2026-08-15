import { describe, expect, it } from 'vitest';
import { StudioWatcherEngine } from '../src/engine/projects/StudioWatchers';

describe('StudioWatcherEngine', () => {
  it('evaluates saved capability and subscription queries', () => {
    const engine = new StudioWatcherEngine(() => 7);
    engine.save({ id: 'blockchain', name: 'Blockchain objects', dashboard: 'Economy', enabled: true, query: { capability: 'blockchain' } });
    engine.save({ id: 'subscribed', name: 'Subscribed NPCs', dashboard: 'Runtime', enabled: true, query: { kind: 'npc', hasSubscriptions: true } });
    const objects = [{ id: 'gold', kind: 'token' as const, name: 'Gold', data: {}, references: [], updatedAt: 1 }, { id: 'npc', kind: 'npc' as const, name: 'NPC', data: {}, references: [], updatedAt: 1 }];
    const results = engine.evaluate(objects, [{ id: 's', objectId: 'npc', identity: 'token:gold', kind: 'token', mode: 'reactive', enabled: true }], []);
    expect(results).toEqual([{ watcherId: 'blockchain', objectIds: ['gold'], updatedAt: 7 }, { watcherId: 'subscribed', objectIds: ['npc'], updatedAt: 7 }]);
  });
});
