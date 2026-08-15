/**
 * engine/search/SearchEngine.ts — universal search.
 *
 * The command palette's backend: search across EVERYTHING — project-graph nodes
 * (maps/NPCs/quests/assets/AI agents/…), the asset registry, entities, commands,
 * and settings — returning a single ranked result list. This is the "Ctrl+K
 * searches everything" capability.
 *
 * Pure + deterministic. Results are JSON-safe.
 */

import type { ProjectGraph, NodeKind } from '../projects/ProjectGraph';
import type { AssetRegistry } from '../assets/AssetRegistry';
import type { EntityManager, Component } from '../entity/EntityManager';

export type SearchSource = 'node' | 'asset' | 'entity' | 'command' | 'setting';

export interface SearchResult {
  source: SearchSource;
  id: string;
  title: string;
  /** Secondary line (kind / type / value). */
  subtitle: string;
  /** For grouping + icons. */
  kind: NodeKind | string;
  /** Optional action payload (e.g. command id, node id). */
  action?: string;
}

export interface SearchScope {
  graph: ProjectGraph;
  assets: AssetRegistry;
  entities: EntityManager;
  commands: Array<{ id: string; label: string }>;
  settings: Record<string, string>;
}

export class SearchEngine {
  private readonly scope: SearchScope;

  constructor(scope: SearchScope) {
    this.scope = scope;
  }

  /** Search everything, returning results ranked by (source priority, match). */
  search(query: string, limit = 50): SearchResult[] {
    const q = query.trim().toLowerCase();
    const results: SearchResult[] = [];

    // Commands (highest priority for the palette).
    for (const cmd of this.scope.commands) {
      if (!q || cmd.label.toLowerCase().includes(q)) {
        results.push({ source: 'command', id: cmd.id, title: cmd.label, subtitle: 'command', kind: 'command', action: cmd.id });
      }
    }

    // Project-graph nodes.
    for (const node of this.scope.graph.allNodes()) {
      if (!q || node.id.toLowerCase().includes(q) || node.name.toLowerCase().includes(q)) {
        results.push({ source: 'node', id: node.id, title: node.name, subtitle: node.kind, kind: node.kind, action: node.id });
      }
    }

    // Assets.
    for (const asset of this.scope.assets.list()) {
      if (!q || asset.id.toLowerCase().includes(q) || asset.name.toLowerCase().includes(q)) {
        results.push({ source: 'asset', id: asset.id, title: asset.name, subtitle: `${asset.kind} · v${asset.version}`, kind: asset.kind, action: asset.id });
      }
    }

    // Entities.
    for (const id of this.scope.entities.entityIds()) {
      const comps = this.scope.entities.getComponents(id);
      const label = this.entityLabel(id, comps);
      const match = !q || label.toLowerCase().includes(q) || comps.some((c) => c.type.toLowerCase().includes(q));
      if (match) {
        results.push({ source: 'entity', id: `#${id}`, title: `Entity #${id}`, subtitle: comps.map((c) => c.type).join(' · '), kind: 'entity', action: String(id) });
      }
    }

    // Settings.
    for (const [key, value] of Object.entries(this.scope.settings)) {
      if (!q || key.toLowerCase().includes(q) || value.toLowerCase().includes(q)) {
        results.push({ source: 'setting', id: key, title: key, subtitle: value, kind: 'setting', action: key });
      }
    }

    return results.slice(0, limit);
  }

  private entityLabel(id: number, comps: Component[]): string {
    const named = comps.find((c) => 'name' in c) as { name?: string } | undefined;
    return named?.name ? `${named.name} #${id}` : `entity #${id}`;
  }
}
