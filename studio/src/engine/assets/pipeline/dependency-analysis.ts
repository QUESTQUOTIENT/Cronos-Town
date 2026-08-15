/**
 * engine/assets/pipeline/dependency-analysis.ts — asset reference extraction.
 *
 * Assets often reference other assets (a tileset references tiles; a map
 * references sprites; a scene references audio). This extracts those references
 * from an asset's metadata/declared references, so the project graph can record
 * "asset → asset" edges automatically — the basis for reference tracking,
 * safe deletion, and incremental builds.
 */

export interface AssetWithRefs {
  id: string;
  /** Explicit references (ids of other assets). */
  references?: string[];
  /** Metadata that may embed references (e.g. `tiles: ['grass','stone']`). */
  metadata?: Record<string, unknown>;
}

export interface ExtractedReference {
  from: string;
  to: string;
  /** Where the reference came from (explicit list vs a metadata field). */
  source: 'explicit' | 'metadata';
  field?: string;
}

/** Fields whose string/array values are treated as asset references. */
const REFERENCE_FIELDS = new Set(['tiles', 'textures', 'sprites', 'assets', 'audio', 'sheet', 'dependsOn', 'references']);

/** Extract (from → to) references from a set of assets. */
export function extractReferences(assets: AssetWithRefs[]): ExtractedReference[] {
  const refs: ExtractedReference[] = [];
  for (const asset of assets) {
    for (const to of asset.references ?? []) {
      refs.push({ from: asset.id, to, source: 'explicit' });
    }
    for (const [field, value] of Object.entries(asset.metadata ?? {})) {
      if (!REFERENCE_FIELDS.has(field)) continue;
      if (typeof value === 'string' && value) {
        refs.push({ from: asset.id, to: value, source: 'metadata', field });
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (typeof item === 'string' && item) {
            refs.push({ from: asset.id, to: item, source: 'metadata', field });
          }
        }
      }
    }
  }
  return refs;
}

/** Which assets reference a given asset id (reverse index). */
export function referencedBy(assetId: string, refs: ExtractedReference[]): string[] {
  return refs.filter((r) => r.to === assetId).map((r) => r.from);
}
