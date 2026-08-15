/** Runtime sessions consume subscription effects as an ephemeral projection.
 * They never mutate StudioProject or ProjectGraph; canonical changes require a
 * new StudioTransaction produced by the coordinator. */
import type { StudioObject } from './StudioProject';
import type { RuntimeEvent, StudioSubscriptionEngine, SubscriptionEffect } from './StudioSubscriptions';
import type { RuntimeIdentity } from './RuntimeIdentity';

export type RuntimeEffectPhase = 'immediate' | 'deferred' | 'transactional' | 'runtime' | 'export';
export type RuntimeEffectStatus = 'queued' | 'applied' | 'requires-transaction' | 'failed';
export interface RuntimeEffect {
  id: string; sourceIdentity: string; targetObjectId: string; transactionId?: string; revisionId?: string;
  reason: string; priority: number; phase: RuntimeEffectPhase; payload: Record<string, unknown>; status: RuntimeEffectStatus;
}
export interface RuntimeAdapter {
  readonly kind: StudioObject['kind'];
  reflect(object: StudioObject, identity: RuntimeIdentity): Record<string, unknown>;
  applyEphemeral?(effect: RuntimeEffect): void;
}
export interface RuntimeSessionSnapshot { id: string; branch: string; revision: string | null; effects: RuntimeEffect[]; }

export class RuntimeSession {
  private readonly effects: RuntimeEffect[] = [];
  private readonly adapters = new Map<StudioObject['kind'], RuntimeAdapter>();
  private sequence = 0;
  constructor(readonly id: string, private branch: string, private revision: string | null = null) {}
  activate(branch: string, revision: string | null): void { this.branch = branch; this.revision = revision; }
  registerAdapter(adapter: RuntimeAdapter): void { this.adapters.set(adapter.kind, adapter); }
  queueFromEvent(event: RuntimeEvent, subscriptions: StudioSubscriptionEngine): RuntimeEffect[] {
    const effects = subscriptions.route(event).map((subscription) => this.createEffect(event, subscription));
    this.effects.push(...effects); return effects.map((effect) => ({ ...effect, payload: { ...effect.payload } }));
  }
  reflect(object: StudioObject, identity: RuntimeIdentity): Record<string, unknown> | undefined {
    return this.adapters.get(object.kind)?.reflect(object, identity);
  }
  process(objects: StudioObject[]): RuntimeEffect[] {
    const byId = new Map(objects.map((object) => [object.id, object]));
    for (const effect of this.effects.filter((item) => item.status === 'queued')) {
      if (effect.phase === 'transactional') { effect.status = 'requires-transaction'; continue; }
      const object = byId.get(effect.targetObjectId); const adapter = object && this.adapters.get(object.kind);
      try { if (adapter) adapter.applyEphemeral?.(effect); effect.status = 'applied'; } catch { effect.status = 'failed'; }
    }
    return this.effects.map((effect) => ({ ...effect, payload: { ...effect.payload } }));
  }
  snapshot(): RuntimeSessionSnapshot { return { id: this.id, branch: this.branch, revision: this.revision, effects: this.effects.map((effect) => ({ ...effect, payload: { ...effect.payload } })) }; }
  private createEffect(event: RuntimeEvent, subscription: SubscriptionEffect): RuntimeEffect {
    return { id: `effect-${++this.sequence}`, sourceIdentity: event.identity ?? 'runtime:unknown', targetObjectId: subscription.objectId, transactionId: event.transactionId, revisionId: event.revisionId, reason: `Subscription ${subscription.subscriptionId} triggered by ${event.type}`, priority: subscription.mode === 'reactive' ? 100 : 0, phase: subscription.mode === 'transactional' ? 'transactional' : subscription.mode === 'deferred' ? 'deferred' : subscription.mode === 'export' ? 'export' : 'runtime', payload: { ...event.payload }, status: 'queued' };
  }
}
