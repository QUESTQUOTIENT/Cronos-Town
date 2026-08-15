import { describe, expect, it } from 'vitest';
import { runtimeIdentityFor } from '../src/engine/projects/RuntimeIdentity';
import { reflectRuntime, RuntimeEventBus, StudioSubscriptionEngine } from '../src/engine/projects/StudioSubscriptions';

const npc = { id: 'merchant', kind: 'npc' as const, name: 'Merchant', data: {}, references: [], updatedAt: 1 };

describe('reactive StudioObject subscriptions', () => {
  it('routes runtime identity events to matching enabled subscriptions', () => {
    const bus = new RuntimeEventBus(() => 10); const subscriptions = new StudioSubscriptionEngine();
    subscriptions.register({ id: 'sub-1', objectId: 'merchant', identity: 'token:gold', kind: 'token', mode: 'transactional', enabled: true });
    const event = bus.emit({ type: 'token-changed', identity: 'token:gold', payload: {} });
    expect(subscriptions.route(event)).toEqual([{ subscriptionId: 'sub-1', objectId: 'merchant', mode: 'transactional', eventId: event.id }]);
  });

  it('reflects stable runtime identity, bindings, health, and subscription state', () => {
    const reflection = reflectRuntime(npc, runtimeIdentityFor(npc), [{ id: 'sub', objectId: 'merchant', identity: 'world:rain', kind: 'weather', mode: 'reactive', enabled: true }]);
    expect(reflection.health).toBe('healthy');
    expect(reflection.bindings).toContain('runtime:npc:merchant');
    expect(reflection.diagnostics[0]).toContain('1 active');
  });
});
