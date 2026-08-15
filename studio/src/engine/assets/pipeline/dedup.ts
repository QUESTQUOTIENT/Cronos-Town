/**
 * engine/assets/pipeline/dedup.ts — asset deduplication (pure).
 *
 * Content-based dedup: identical assets (same source/content) are collapsed into
 * a single canonical entry, with duplicate ids recorded as aliases. Reduces
 * redundant storage + lets the pipeline flag accidental re-imports.
 */

export interface ContentHash {
  /** A stable content hash (injected — e.g. SHA-256 of the source). */
  hash: string;
  id: string;
}

export interface DedupResult {
  /** Canonical id → its content hash. */
  canonical: Map<string, string>;
  /** Duplicate id → canonical id. */
  aliases: Map<string, string>;
  /** Number of duplicates removed. */
  removed: number;
}

/** A content-hash function (injected so tests are deterministic). */
export type HashFn = (source: string) => string;

/** Default content hash (identity is fine for dedup by exact source). */
export const identityHash: HashFn = (source) => source;

/**
 * Deduplicate a list of (id, source) pairs by content. The first-seen id for a
 * given content becomes canonical; subsequent ids become aliases.
 */
export function deduplicateAssets(
  items: Array<{ id: string; source: string }>,
  hash: HashFn = identityHash,
): DedupResult {
  const canonical = new Map<string, string>(); // id -> hash
  const aliases = new Map<string, string>(); // dup id -> canonical id
  const byHash = new Map<string, string>(); // hash -> first id

  for (const item of items) {
    const h = hash(item.source);
    const existing = byHash.get(h);
    if (existing !== undefined) {
      aliases.set(item.id, existing);
    } else {
      byHash.set(h, item.id);
      canonical.set(item.id, h);
    }
  }

  return { canonical, aliases, removed: aliases.size };
}

/** Resolve an id to its canonical id (following aliases). */
export function resolveAlias(id: string, aliases: Map<string, string>): string {
  return aliases.get(id) ?? id;
}
