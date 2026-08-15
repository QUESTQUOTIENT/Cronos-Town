/**
 * engine/entity/EntityManager.ts — the entity/component system (ECS core).
 *
 * A minimal, dependency-free ECS: entities are integer ids, components are typed
 * data, and queries select entities that hold ALL of a set of component types.
 * This is the extensibility foundation for the whole studio — the world editor,
 * dialogue editor, quest editor, and runtime all build on the same entity store.
 *
 * Pure and deterministic: no DOM, no randomness, no I/O. Serialization helpers
 * produce JSON-safe snapshots so scenes can persist entities + components.
 */

export type EntityId = number;
export type ComponentType = string;

export interface Component {
  /** Discriminator. By convention, `${namespace}.${kind}` (e.g. "transform", "npc.dialogue"). */
  readonly type: ComponentType;
}

export type ComponentOf<T extends Component> = Omit<T, 'type'>;

export class EntityManager {
  private readonly entities = new Map<EntityId, Map<ComponentType, Component>>();
  private readonly byType = new Map<ComponentType, Map<EntityId, Component>>();
  private nextId: EntityId = 1;

  /** Create a new entity (bare; add components after). */
  createEntity(): EntityId {
    const id = this.nextId;
    this.nextId += 1;
    this.entities.set(id, new Map());
    return id;
  }

  /** Destroy an entity and remove it from every component index. */
  destroyEntity(id: EntityId): void {
    const components = this.entities.get(id);
    if (!components) return;
    for (const type of components.keys()) {
      this.byType.get(type)?.delete(id);
    }
    this.entities.delete(id);
  }

  /** Attach a component to an entity (replaces any existing component of the same type). */
  addComponent<T extends Component>(id: EntityId, component: T): void {
    let bucket = this.entities.get(id);
    if (!bucket) {
      bucket = new Map();
      this.entities.set(id, bucket);
    }
    bucket.set(component.type, component);

    let index = this.byType.get(component.type);
    if (!index) {
      index = new Map();
      this.byType.set(component.type, index);
    }
    index.set(id, component);
  }

  /** Remove a component of the given type (no-op if absent). */
  removeComponent(id: EntityId, type: ComponentType): void {
    this.entities.get(id)?.delete(type);
    this.byType.get(type)?.delete(id);
  }

  /** Get a component by type (undefined if absent). */
  getComponent<T extends Component>(id: EntityId, type: ComponentType): T | undefined {
    return this.entities.get(id)?.get(type) as T | undefined;
  }

  /** All components on an entity (in insertion order). */
  getComponents(id: EntityId): Component[] {
    return [...(this.entities.get(id)?.values() ?? [])];
  }

  /** True if the entity holds every component type in `types`. */
  hasComponents(id: EntityId, ...types: ComponentType[]): boolean {
    const bucket = this.entities.get(id);
    if (!bucket) return false;
    return types.every((t) => bucket.has(t));
  }

  /**
   * Query entities that hold ALL of the given component types (AND semantics).
   * Empty `types` returns every entity. Order is deterministic (creation order).
   */
  query(...types: ComponentType[]): EntityId[] {
    if (types.length === 0) return [...this.entities.keys()];
    // Iterate the smallest component index for efficiency + determinism.
    let smallest: ComponentType = types[0];
    let smallestIndex = this.byType.get(smallest);
    for (const t of types.slice(1)) {
      const index = this.byType.get(t);
      if (index && (!smallestIndex || index.size < smallestIndex.size)) {
        smallest = t;
        smallestIndex = index;
      }
    }
    if (!smallestIndex) return [];
    const result: EntityId[] = [];
    for (const id of smallestIndex.keys()) {
      if (this.hasComponents(id, ...types)) result.push(id);
    }
    return result;
  }

  /** Live entity count. */
  get count(): number {
    return this.entities.size;
  }

  /** All entity ids (creation order). */
  entityIds(): EntityId[] {
    return [...this.entities.keys()];
  }

  /** Clear every entity + index. */
  clear(): void {
    this.entities.clear();
    this.byType.clear();
  }

  /** JSON-safe snapshot of every entity + its components (for scene persistence). */
  serialize(): Array<{ id: EntityId; components: Component[] }> {
    return [...this.entities.entries()].map(([id, components]) => ({
      id,
      components: [...components.values()],
    }));
  }

  /** Restore from a `serialize()` snapshot (clears existing state first). */
  deserialize(snapshot: Array<{ id: EntityId; components: Component[] }>): void {
    this.clear();
    let maxId = 0;
    for (const { id, components } of snapshot) {
      this.entities.set(id, new Map(components.map((c) => [c.type, c])));
      for (const c of components) {
        let index = this.byType.get(c.type);
        if (!index) {
          index = new Map();
          this.byType.set(c.type, index);
        }
        index.set(id, c);
      }
      if (id > maxId) maxId = id;
    }
    this.nextId = maxId + 1;
  }
}
