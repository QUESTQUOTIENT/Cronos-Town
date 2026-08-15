import { describe, expect, it } from 'vitest';
import { RuntimeSession } from '../src/engine/projects/RuntimeSession';
import { RuntimeEventBus, StudioSubscriptionEngine } from '../src/engine/projects/StudioSubscriptions';

describe('RuntimeSession', () => {
  it('turns subscription events into traceable effects without canonical mutation', () => {
    const subscriptions = new StudioSubscriptionEngine();
    subscriptions.register({ id: 'sub', objectId: 'npc', identity: 'token:gold', kind: 'token', mode: 'transactional', enabled: true });
    const event = new RuntimeEventBus(() => 1).emit({ type: 'token-changed', identity: 'token:gold', transactionId: 'tx-1', revisionId: 'rev-1', payload: { symbol: 'GOLD' } });
    const session = new RuntimeSession('playtest', 'economy', 'rev-1');
    const effects = session.queueFromEvent(event, subscriptions);
    expect(effects[0]).toMatchObject({ sourceIdentity: 'token:gold', targetObjectId: 'npc', transactionId: 'tx-1', revisionId: 'rev-1', phase: 'transactional' });
    expect(session.process([{ id: 'npc', kind: 'npc', name: 'NPC', data: {}, references: [], updatedAt: 1 }])[0].status).toBe('requires-transaction');
    expect(session.snapshot().branch).toBe('economy');
  });
});
