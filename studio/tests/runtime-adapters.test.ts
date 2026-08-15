import { describe, expect, it } from 'vitest';
import { createDefaultRuntimeAdapters } from '../src/engine/projects/RuntimeAdapters';
import { RuntimeSession } from '../src/engine/projects/RuntimeSession';
import { runtimeIdentityFor } from '../src/engine/projects/RuntimeIdentity';

describe('default runtime adapters', () => {
  it('provides runtime projections for core governed object kinds', () => {
    const session = new RuntimeSession('s', 'main');
    for (const adapter of createDefaultRuntimeAdapters()) session.registerAdapter(adapter);
    const npc = { id: 'npc-a', kind: 'npc' as const, name: 'Ada', data: { personality: 'calm' }, references: [], updatedAt: 1 };
    expect(session.reflect(npc, runtimeIdentityFor(npc))).toMatchObject({ objectId: 'npc-a', kind: 'npc', state: { personality: 'calm' } });
    expect(createDefaultRuntimeAdapters().map((adapter) => adapter.kind)).toContain('sound-zone');
    expect(createDefaultRuntimeAdapters().map((adapter) => adapter.kind)).toContain('token');
  });
});
