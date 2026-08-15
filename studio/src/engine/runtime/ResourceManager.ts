/**
 * engine/runtime/ResourceManager.ts — resource management (memory budgeting).
 *
 * Tracks loaded resources with sizes, enforces a memory budget, and evicts
 * least-recently-used resources when over budget. This is the "asset unloading /
 * memory budgeting" capability the runtime needs — textures, tilesets, audio,
 * and other GPU/memory-backed resources all register here.
 *
 * Pure + deterministic (LRU by explicit access order, not wall-clock).
 */

export interface LoadedResource {
  id: string;
  kind: string;
  /** Estimated size in bytes. */
  sizeBytes: number;
}

export interface ResourceManagerOptions {
  /** Memory budget in bytes. */
  budgetBytes?: number;
}

export class ResourceManager {
  private readonly resources = new Map<string, LoadedResource>();
  private readonly accessOrder: string[] = []; // least → most recently used
  private readonly budgetBytes: number;
  private totalBytes = 0;

  constructor(options: ResourceManagerOptions = {}) {
    this.budgetBytes = options.budgetBytes ?? 64 * 1024 * 1024; // 64 MB default
  }

  /** Register a loaded resource (or update its size). */
  load(resource: LoadedResource): void {
    const existing = this.resources.get(resource.id);
    if (existing) {
      this.totalBytes -= existing.sizeBytes;
      this.accessOrder.splice(this.accessOrder.indexOf(resource.id), 1);
    }
    this.resources.set(resource.id, resource);
    this.totalBytes += resource.sizeBytes;
    this.accessOrder.push(resource.id);
    this.evictIfNeeded();
  }

  /** Unload a resource (frees its memory). */
  unload(id: string): boolean {
    const existing = this.resources.get(id);
    if (!existing) return false;
    this.resources.delete(id);
    this.accessOrder.splice(this.accessOrder.indexOf(id), 1);
    this.totalBytes -= existing.sizeBytes;
    return true;
  }

  /** Touch a resource (marks it most-recently-used). */
  touch(id: string): void {
    const idx = this.accessOrder.indexOf(id);
    if (idx === -1) return;
    this.accessOrder.splice(idx, 1);
    this.accessOrder.push(id);
  }

  get(id: string): LoadedResource | undefined {
    return this.resources.get(id);
  }

  isLoaded(id: string): boolean {
    return this.resources.has(id);
  }

  get usedBytes(): number {
    return this.totalBytes;
  }

  get budget(): number {
    return this.budgetBytes;
  }

  /** Utilization (0..1) — how full the budget is. */
  get utilization(): number {
    return this.budgetBytes > 0 ? Math.min(1, this.totalBytes / this.budgetBytes) : 0;
  }

  loaded(): LoadedResource[] {
    return this.accessOrder.map((id) => this.resources.get(id) as LoadedResource);
  }

  /** Evict least-recently-used resources until under budget. Returns evicted ids. */
  evictIfNeeded(): string[] {
    const evicted: string[] = [];
    while (this.totalBytes > this.budgetBytes && this.accessOrder.length > 0) {
      const lruId = this.accessOrder[0];
      this.unload(lruId);
      evicted.push(lruId);
    }
    return evicted;
  }

  clear(): void {
    this.resources.clear();
    this.accessOrder.length = 0;
    this.totalBytes = 0;
  }
}
