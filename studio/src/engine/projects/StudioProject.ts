/**
 * Canonical studio-owned project data.
 *
 * The runtime, editors and exporter use this same store.  It deliberately holds
 * data rather than UI state: a studio edit is an edit to the object that ships.
 */
import { ProjectGraph, type NodeKind } from './ProjectGraph';
import { planPropagation } from './StudioPropagation';

export type StudioObjectKind =
  | 'ui' | 'ui-component' | 'npc' | 'story' | 'dialogue' | 'cutscene' | 'quest' | 'world' | 'tile' | 'world-state'
  | 'network' | 'token' | 'economy' | 'wallet' | 'marketplace' | 'nft-collection' | 'character'
  | 'audio' | 'sound-zone' | 'ai-agent' | 'automation';

export interface StudioObject {
  id: string;
  kind: StudioObjectKind;
  name: string;
  /** Runtime-ready, JSON-safe object configuration. */
  data: Record<string, unknown>;
  /** IDs of objects this object consumes at runtime. */
  references: string[];
  updatedAt: number;
}

export interface StudioProjectSnapshot {
  format: 'chronos-studio-project';
  version: 1;
  objects: StudioObject[];
}

const GRAPH_KIND: Record<StudioObjectKind, NodeKind> = {
  ui: 'ui-screen', 'ui-component': 'component', npc: 'entity', story: 'dialogue', dialogue: 'dialogue', cutscene: 'cutscene',
  quest: 'quest', world: 'world', tile: 'tile', 'world-state': 'world-state', network: 'network', token: 'token',
  economy: 'economy', wallet: 'wallet', marketplace: 'marketplace', 'nft-collection': 'nft-collection',
  character: 'character', audio: 'audio', 'sound-zone': 'sound-zone', 'ai-agent': 'ai-agent', automation: 'automation',
};

function copy<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * One source of truth for all authored objects.  The graph is kept in lockstep
 * so changes immediately participate in search, impact analysis and export.
 */
export class StudioProject {
  private readonly objects = new Map<string, StudioObject>();

  constructor(private readonly graph: ProjectGraph, private readonly now: () => number = () => Date.now()) {}

  upsert(input: Omit<StudioObject, 'updatedAt'>): StudioObject {
    const id = input.id.trim();
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id)) throw new Error('Object id must use letters, numbers, dot, underscore, or dash.');
    if (!input.name.trim()) throw new Error('Object name is required.');
    const references = [...new Set(input.references.map((reference) => reference.trim()).filter(Boolean))];
    if (references.includes(id)) throw new Error('An object cannot reference itself.');
    const object: StudioObject = { ...copy(input), id, name: input.name.trim(), references, updatedAt: this.now() };
    this.objects.set(id, object);
    this.graph.upsertNode({ id, kind: GRAPH_KIND[object.kind], name: object.name, metadata: { studioKind: object.kind } });
    this.graph.replaceOutgoing(id, references.map((to) => ({ to, relation: 'uses' })));
    return copy(object);
  }

  get(id: string): StudioObject | undefined {
    const object = this.objects.get(id);
    return object && copy(object);
  }

  list(kind?: StudioObjectKind): StudioObject[] {
    return [...this.objects.values()].filter((object) => !kind || object.kind === kind).map(copy);
  }

  remove(id: string): boolean {
    if (!this.objects.delete(id)) return false;
    this.graph.removeNode(id);
    return true;
  }

  /** Configure the runtime chain once; economy and wallet objects reference it. */
  configureNetwork(id: string, name: string, config: { chainId: number; rpcUrl: string; explorer?: string; currency: string; gasToken: string }): StudioObject {
    if (!Number.isInteger(config.chainId) || config.chainId <= 0) throw new Error('Network chainId must be a positive integer.');
    if (!/^https?:\/\//.test(config.rpcUrl)) throw new Error('Network RPC URL must start with http:// or https://.');
    return this.upsert({ id, kind: 'network', name, data: copy(config), references: [] });
  }

  /** A token is connected to its network, so runtime consumers need no duplicate chain configuration. */
  configureToken(id: string, name: string, config: { contract: string; networkId: string; decimals: number; symbol: string }): StudioObject {
    if (!this.objects.get(config.networkId)) throw new Error(`Unknown network: ${config.networkId}`);
    if (!Number.isInteger(config.decimals) || config.decimals < 0 || config.decimals > 255) throw new Error('Token decimals must be between 0 and 255.');
    if (!config.symbol.trim()) throw new Error('Token symbol is required.');
    return this.upsert({ id, kind: 'token', name, data: copy(config), references: [config.networkId] });
  }

  /**
   * Make a token the shared currency for authored runtime consumers. References
   * are the propagation contract: runtime, graph impact analysis, and export all
   * see the same token link instead of keeping copied token settings.
   */
  bindTokenToConsumers(tokenId: string): string[] {
    if (this.objects.get(tokenId)?.kind !== 'token') throw new Error(`Unknown token: ${tokenId}`);
    const plan = planPropagation(this.list(), tokenId);
    for (const change of plan.changes) {
      const current = this.objects.get(change.id);
      if (current) this.upsert({ id: change.id, kind: change.kind, name: current.name, data: change.data, references: change.references });
    }
    return plan.changes.map((change) => change.id);
  }

  /** Objects that will react when this object changes, in runtime dependency order. */
  affectedBy(id: string): StudioObject[] {
    return this.graph.impact(id).map((node) => this.get(node.id)).filter((object): object is StudioObject => Boolean(object));
  }

  snapshot(): StudioProjectSnapshot {
    return { format: 'chronos-studio-project', version: 1, objects: this.list() };
  }

  restore(snapshot: StudioProjectSnapshot): void {
    if (snapshot.format !== 'chronos-studio-project' || snapshot.version !== 1) throw new Error('Unsupported studio project snapshot.');
    for (const id of [...this.objects.keys()]) this.remove(id);
    // Create nodes first so reference order in a portable JSON file is irrelevant.
    for (const object of snapshot.objects) this.upsert({ id: object.id, kind: object.kind, name: object.name, data: object.data, references: [] });
    for (const object of snapshot.objects) this.upsert({ id: object.id, kind: object.kind, name: object.name, data: object.data, references: object.references });
  }
}
