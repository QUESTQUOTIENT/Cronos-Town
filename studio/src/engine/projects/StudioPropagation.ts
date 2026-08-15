/**
 * Declarative propagation contracts. A schema owns fields; contracts describe
 * what must be linked or refreshed when a source object changes.
 */
import type { StudioObject, StudioObjectKind } from './StudioProject';

export interface PropagationChange {
  id: string;
  kind: StudioObjectKind;
  data: Record<string, unknown>;
  references: string[];
  reason: string;
}

export type PropagationStrategy = 'immediate' | 'deferred' | 'transactional' | 'preview' | 'export-only';

export interface PropagationContract {
  source: StudioObjectKind;
  targets: StudioObjectKind[];
  /** Optional declarative guard; false means the target is not affected. */
  condition?(source: StudioObject, target: StudioObject): boolean;
  /** Build a target patch. Contracts never mutate objects directly. */
  patch(source: StudioObject, target: StudioObject): PropagationChange | null;
}

export interface PropagationOptions {
  strategy?: PropagationStrategy;
  /** A force operation intentionally binds every compatible target. */
  force?: boolean;
}

const tokenCurrencyContract: PropagationContract = {
  source: 'token',
  targets: ['economy', 'marketplace', 'wallet', 'quest', 'npc'],
  // A consumer already bound to a different token is not silently rewritten.
  condition(source, target) { return !target.data.currencyToken || target.data.currencyToken === source.id; },
  patch(source, target) {
    return {
      id: target.id, kind: target.kind,
      data: { ...target.data, currencyToken: source.id },
      references: [...new Set([...target.references, source.id])],
      reason: `Use ${source.name} as shared currency`,
    };
  },
};

const worldStateContract: PropagationContract = {
  source: 'world-state',
  targets: ['story', 'dialogue', 'quest', 'cutscene', 'ui'],
  patch(source, target) {
    // Only objects explicitly opting into state-driven behavior are bound.
    if (target.data.stateDriven !== true) return null;
    return {
      id: target.id, kind: target.kind,
      data: { ...target.data, worldState: source.id },
      references: [...new Set([...target.references, source.id])],
      reason: `Bind world state ${source.name}`,
    };
  },
};

export const STUDIO_PROPAGATION_CONTRACTS: PropagationContract[] = [tokenCurrencyContract, worldStateContract];

export interface PropagationPlan {
  sourceId: string;
  strategy: PropagationStrategy;
  changes: PropagationChange[];
  /** Precomputed impact allows an inspector to render confirmation before mutation. */
  impact: Record<string, number>;
}
export function planPropagation(objects: StudioObject[], sourceId: string, options: PropagationOptions = {}): PropagationPlan {
  const strategy = options.strategy ?? 'transactional';
  const source = objects.find((object) => object.id === sourceId);
  if (!source) return { sourceId, strategy, changes: [], impact: {} };
  const changes: PropagationChange[] = [];
  for (const contract of STUDIO_PROPAGATION_CONTRACTS.filter((item) => item.source === source.kind)) {
    for (const target of objects) {
      if (!contract.targets.includes(target.kind) || target.id === source.id) continue;
      if (!options.force && contract.condition && !contract.condition(source, target)) continue;
      const change = contract.patch(source, target);
      if (change) changes.push(change);
    }
  }
  const impact: Record<string, number> = {};
  for (const change of changes) impact[change.kind] = (impact[change.kind] ?? 0) + 1;
  return { sourceId, strategy, changes, impact };
}
