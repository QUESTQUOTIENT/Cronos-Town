/** Transaction-aware reactive identity subscriptions and runtime events. */
import type { StudioObject } from './StudioProject';
import type { RuntimeIdentity } from './RuntimeIdentity';

export type SubscriptionMode = 'reactive' | 'transactional' | 'deferred' | 'export' | 'diagnostic';
export type IdentityKind = 'token' | 'network' | 'world-state' | 'weather' | 'reputation' | 'faction' | 'quest' | 'nft-ownership' | 'wallet' | 'ai-state' | 'audio-zone';
export interface StudioSubscription { id: string; objectId: string; identity: string; kind: IdentityKind; mode: SubscriptionMode; enabled: boolean; }
export type RuntimeEventType = 'identity-changed' | 'transaction-committed' | 'transaction-rolled-back' | 'revision-created' | 'network-changed' | 'token-changed' | 'world-state-changed' | 'quest-completed' | 'nft-ownership-changed' | 'audio-zone-entered' | 'ai-state-changed';
export interface RuntimeEvent { id: string; type: RuntimeEventType; identity?: string; transactionId?: string; revisionId?: string; payload: Record<string, unknown>; timestamp: number; }
export interface SubscriptionEffect { subscriptionId: string; objectId: string; mode: SubscriptionMode; eventId: string; }

export class RuntimeEventBus {
  private readonly events: RuntimeEvent[] = [];
  private sequence = 0;
  constructor(private readonly now: () => number = () => Date.now()) {}
  emit(event: Omit<RuntimeEvent, 'id' | 'timestamp'>): RuntimeEvent {
    const result: RuntimeEvent = { ...event, id: `event-${++this.sequence}`, timestamp: this.now() }; this.events.push(result); return { ...result, payload: { ...result.payload } };
  }
  all(): RuntimeEvent[] { return this.events.map((event) => ({ ...event, payload: { ...event.payload } })); }
}

export class StudioSubscriptionEngine {
  private readonly subscriptions = new Map<string, StudioSubscription>();
  register(subscription: StudioSubscription): void { this.subscriptions.set(subscription.id, { ...subscription }); }
  remove(id: string): boolean { return this.subscriptions.delete(id); }
  forObject(objectId: string): StudioSubscription[] { return [...this.subscriptions.values()].filter((subscription) => subscription.objectId === objectId).map((subscription) => ({ ...subscription })); }
  route(event: RuntimeEvent): SubscriptionEffect[] {
    if (!event.identity) return [];
    return [...this.subscriptions.values()].filter((subscription) => subscription.enabled && subscription.identity === event.identity).map((subscription) => ({ subscriptionId: subscription.id, objectId: subscription.objectId, mode: subscription.mode, eventId: event.id }));
  }
  diagnostics(objects: StudioObject[]): Array<{ subscriptionId: string; message: string }> {
    const known = new Set(objects.map((object) => object.id));
    return [...this.subscriptions.values()].filter((subscription) => !known.has(subscription.objectId)).map((subscription) => ({ subscriptionId: subscription.id, message: `Subscriber object ${subscription.objectId} no longer exists.` }));
  }
}

export interface RuntimeReflection { identity: RuntimeIdentity; health: 'healthy' | 'warning' | 'error'; hotReload: 'ready' | 'pending' | 'unsupported'; bindings: string[]; diagnostics: string[]; performanceMs: number; }
export function reflectRuntime(object: StudioObject, identity: RuntimeIdentity, subscriptions: StudioSubscription[]): RuntimeReflection {
  const bindings = [identity.runtimeObject, identity.saveIdentity, identity.exportIdentity, ...(identity.networkIdentity ? [identity.networkIdentity] : [])];
  return { identity, health: 'healthy', hotReload: 'ready', bindings, diagnostics: subscriptions.length ? [`${object.name}: ${subscriptions.length} active subscription(s).`] : [], performanceMs: 0, };
}
