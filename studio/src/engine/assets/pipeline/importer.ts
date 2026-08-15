/**
 * engine/assets/pipeline/importer.ts — the asset import pipeline orchestrator.
 *
 * The full import flow as a single pipeline: validate → register → dedup →
 * extract dependency references → register graph edges → (hot-reload on
 * re-import). Each stage is a pure, testable function; the orchestrator chains
 * them deterministically.
 */
import { AssetRegistry } from '../AssetRegistry';
import { AssetImporter, validateImport, type ImportInput } from '../AssetImporter';
import { deduplicateAssets } from './dedup';
import { extractReferences } from './dependency-analysis';
import type { ProjectGraph, NodeKind } from '../../projects/ProjectGraph';
import type { AssetKind } from '../AssetRegistry';

/** Map an AssetKind to the closest ProjectGraph NodeKind. */
function assetToNodeKind(kind: AssetKind): NodeKind {
  switch (kind) {
    case 'sprite': return 'sprite';
    case 'tileset': return 'tileset';
    case 'audio':
    case 'music': return 'audio';
    case 'map': return 'map';
    case 'ui': return 'ui-screen';
    default: return 'asset';
  }
}

export interface ImportOutcome {
  ok: boolean;
  assetId: string;
  error?: string;
  /** True when this was a re-import (hot reload) of an existing asset. */
  hotReloaded: boolean;
  /** References extracted from the imported asset (asset → other asset). */
  references: Array<{ to: string; source: 'explicit' | 'metadata'; field?: string }>;
}

export class ImportPipeline {
  constructor(
    private readonly registry: AssetRegistry,
    private readonly importer: AssetImporter,
    private readonly graph?: ProjectGraph,
  ) {}

  /** Run the full import pipeline for a single asset. */
  import(input: ImportInput): ImportOutcome {
    const validationError = validateImport(input);
    if (validationError) return { ok: false, assetId: input.id, error: validationError, hotReloaded: false, references: [] };

    const existed = this.registry.has(input.id);
    const result = this.importer.import(input);
    if (!result.ok || !result.asset) {
      return { ok: false, assetId: input.id, error: result.error ?? 'Import failed.', hotReloaded: false, references: [] };
    }

    // Dependency analysis: extract references from the asset's metadata (the
    // `references` field lives in metadata, not as a separate top-level field).
    const refs = extractReferences([{ id: input.id, metadata: input.metadata }]);
    const references = refs.map((r) => ({ to: r.to, source: r.source, field: r.field }));

    // Register a graph node + dependency edges if a graph is provided.
    if (this.graph) {
      this.graph.addNode({ id: input.id, kind: assetToNodeKind(input.kind), name: input.name });
      for (const ref of refs) {
        if (this.graph.has(ref.to)) this.graph.addEdge(input.id, ref.to, 'references');
      }
    }

    return { ok: true, assetId: input.id, hotReloaded: existed, references };
  }

  /** Deduplicate the whole registry (content-hash aliasing). */
  deduplicate(): { removed: number; aliases: Map<string, string> } {
    const items = this.registry.list().map((a) => ({ id: a.id, source: a.source }));
    const result = deduplicateAssets(items);
    return { removed: result.removed, aliases: result.aliases };
  }
}
