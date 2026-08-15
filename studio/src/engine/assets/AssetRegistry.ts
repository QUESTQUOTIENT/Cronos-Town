/**
 * engine/assets/AssetRegistry.ts — the asset pipeline foundation.
 *
 * Assets are typed, versioned, and addressable records (sprites, tilesets,
 * audio, fonts, maps, ui…). The registry indexes them by id and provides
 * type/filter queries — the single source of truth the asset browser, project
 * graph, and importers all share.
 *
 * Pure + deterministic. Metadata is JSON-safe.
 */

export type AssetKind =
  | 'sprite'
  | 'tileset'
  | 'audio'
  | 'music'
  | 'font'
  | 'map'
  | 'ui'
  | 'shader'
  | 'template';

export interface AssetRecord {
  id: string;
  kind: AssetKind;
  name: string;
  /** The source/path or data-URI. */
  source: string;
  version: number;
  metadata: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export type AssetFilter = Partial<Pick<AssetRecord, 'kind'>>;

export class AssetRegistry {
  private readonly assets = new Map<string, AssetRecord>();
  private readonly order: string[] = [];

  constructor(private readonly now: () => number = () => Date.now()) {}

  /** Register (or replace) an asset. Returns the record. */
  register(record: Omit<AssetRecord, 'version' | 'createdAt' | 'updatedAt'>): AssetRecord {
    const existing = this.assets.get(record.id);
    const ts = this.now();
    const full: AssetRecord = {
      ...record,
      version: (existing?.version ?? 0) + 1,
      createdAt: existing?.createdAt ?? ts,
      updatedAt: ts,
    };
    this.assets.set(full.id, full);
    if (!existing) this.order.push(full.id);
    return full;
  }

  /** Update metadata (increments version + updatedAt). */
  touch(id: string, metadata?: Record<string, unknown>): AssetRecord | null {
    const existing = this.assets.get(id);
    if (!existing) return null;
    const updated: AssetRecord = {
      ...existing,
      metadata: metadata ? { ...existing.metadata, ...metadata } : existing.metadata,
      version: existing.version + 1,
      updatedAt: this.now(),
    };
    this.assets.set(id, updated);
    return updated;
  }

  remove(id: string): boolean {
    if (!this.assets.has(id)) return false;
    this.assets.delete(id);
    this.order.splice(this.order.indexOf(id), 1);
    return true;
  }

  get(id: string): AssetRecord | undefined {
    return this.assets.get(id);
  }

  has(id: string): boolean {
    return this.assets.has(id);
  }

  list(filter?: AssetFilter): AssetRecord[] {
    const all = this.order.map((id) => this.assets.get(id) as AssetRecord);
    if (!filter?.kind) return all;
    return all.filter((a) => a.kind === filter.kind);
  }

  kinds(): AssetKind[] {
    return [...new Set(this.list().map((a) => a.kind))];
  }

  /** Count of assets, optionally per kind. */
  count(filter?: AssetFilter): number {
    return this.list(filter).length;
  }

  /** All assets of a kind. */
  byKind(kind: AssetKind): AssetRecord[] {
    return this.list({ kind });
  }

  /** JSON-safe snapshot (for persistence). */
  serialize(): AssetRecord[] {
    return this.list();
  }

  /** Restore from a `serialize()` snapshot. */
  deserialize(records: AssetRecord[]): void {
    this.assets.clear();
    this.order.length = 0;
    for (const record of records) {
      this.assets.set(record.id, record);
      this.order.push(record.id);
    }
  }
}
