/** Saved reactive creator queries over governed objects, subscriptions, and effects. */
import type { StudioObject, StudioObjectKind } from './StudioProject';
import { getStudioSchema, type StudioCapabilities } from './StudioSchemas';
import type { StudioSubscription } from './StudioSubscriptions';
import type { RuntimeEffect } from './RuntimeSession';

export type WatcherQuery = { kind?: StudioObjectKind; capability?: keyof StudioCapabilities; hasSubscriptions?: boolean; effectStatus?: RuntimeEffect['status']; };
export interface StudioWatcher { id: string; name: string; query: WatcherQuery; dashboard: string; enabled: boolean; }
export interface WatcherResult { watcherId: string; objectIds: string[]; updatedAt: number; }

export class StudioWatcherEngine {
  private readonly watchers = new Map<string, StudioWatcher>();
  constructor(private readonly now: () => number = () => Date.now()) {}
  save(watcher: StudioWatcher): void { this.watchers.set(watcher.id, { ...watcher, query: { ...watcher.query } }); }
  remove(id: string): boolean { return this.watchers.delete(id); }
  evaluate(objects: StudioObject[], subscriptions: StudioSubscription[], effects: RuntimeEffect[]): WatcherResult[] {
    return [...this.watchers.values()].filter((watcher) => watcher.enabled).map((watcher) => {
      const ids = objects.filter((object) => {
        if (watcher.query.kind && object.kind !== watcher.query.kind) return false;
        if (watcher.query.capability && !getStudioSchema(object.kind).capabilities[watcher.query.capability]) return false;
        const hasSubscriptions = subscriptions.some((subscription) => subscription.objectId === object.id && subscription.enabled);
        if (watcher.query.hasSubscriptions !== undefined && hasSubscriptions !== watcher.query.hasSubscriptions) return false;
        if (watcher.query.effectStatus && !effects.some((effect) => effect.targetObjectId === object.id && effect.status === watcher.query.effectStatus)) return false;
        return true;
      }).map((object) => object.id);
      return { watcherId: watcher.id, objectIds: ids, updatedAt: this.now() };
    });
  }
  list(): StudioWatcher[] { return [...this.watchers.values()].map((watcher) => ({ ...watcher, query: { ...watcher.query } })); }
}
