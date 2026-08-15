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

export interface PropagationContract {
  source: StudioObjectKind;
  targets: StudioObjectKind[];
  /** Build a target patch. Contracts never mutate objects directly. */
  patch(source: StudioObject, target: StudioObject): PropagationChange | null;
}

const tokenCurrencyContract: PropagationContract = {
  source: 'token',
  targets: ['economy', 'marketplace', 'wallet', 'quest', 'npc'],
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

export interface PropagationPlan { sourceId: string; changes: PropagationChange[]; }
export function planPropagation(objects: StudioObject[], sourceId: string): PropagationPlan {
  const source = objects.find((object) => object.id === sourceId);
  if (!source) return { sourceId, changes: [] };
  const changes: PropagationChange[] = [];
  for (const contract of STUDIO_PROPAGATION_CONTRACTS.filter((item) => item.source === source.kind)) {
    for (const target of objects) {
      if (!contract.targets.includes(target.kind) || target.id === source.id) continue;
      const change = contract.patch(source, target);
      if (change) changes.push(change);
    }
  }
  return { sourceId, changes };
}
