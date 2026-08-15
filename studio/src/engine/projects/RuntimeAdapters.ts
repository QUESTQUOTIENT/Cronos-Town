/** Concrete schema-kind runtime adapters. They project live-safe state without
 * exposing canonical mutation APIs to the runtime. */
import type { StudioObject } from './StudioProject';
import type { RuntimeIdentity } from './RuntimeIdentity';
import type { RuntimeAdapter, RuntimeEffect } from './RuntimeSession';

const ADAPTER_KINDS: StudioObject['kind'][] = [
  'npc', 'character', 'quest', 'dialogue', 'cutscene', 'ui', 'ui-component',
  'audio', 'sound-zone', 'token', 'network', 'wallet', 'marketplace',
  'nft-collection', 'ai-agent', 'world', 'tile', 'automation',
];

class ObjectRuntimeAdapter implements RuntimeAdapter {
  private readonly effects: RuntimeEffect[] = [];
  constructor(readonly kind: StudioObject['kind']) {}
  reflect(object: StudioObject, identity: RuntimeIdentity): Record<string, unknown> {
    return {
      objectId: object.id, kind: object.kind, runtimeObject: identity.runtimeObject,
      activeBindings: identity, state: { ...object.data }, effectCount: this.effects.filter((effect) => effect.targetObjectId === object.id).length,
    };
  }
  applyEphemeral(effect: RuntimeEffect): void { this.effects.push({ ...effect, payload: { ...effect.payload } }); }
}

/** One adapter per supported runtime-facing schema kind. */
export function createDefaultRuntimeAdapters(): RuntimeAdapter[] {
  return ADAPTER_KINDS.map((kind) => new ObjectRuntimeAdapter(kind));
}
