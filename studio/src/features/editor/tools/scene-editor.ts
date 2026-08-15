/**
 * features/editor/tools/scene-editor.ts — scene editor + prefabs (pure).
 *
 * Prefab-style workflows: save an entity (with its components) as a named
 * prefab, then instantiate it (deep-cloned) into a scene. Uses the ECS
 * serialization so prefabs are JSON-safe and reusable.
 */
import { EntityManager, type Component, type EntityId } from '../../../engine/entity/EntityManager';

export interface Prefab {
  id: string;
  name: string;
  components: Component[];
}

export class PrefabLibrary {
  private readonly prefabs = new Map<string, Prefab>();

  /** Save an entity as a prefab (deep-cloning its components). */
  saveFromEntity(id: string, name: string, entityId: EntityId, world: EntityManager): Prefab {
    const snapshot = world.serialize().find((e) => e.id === entityId);
    const components = snapshot ? (JSON.parse(JSON.stringify(snapshot.components)) as Component[]) : [];
    const prefab: Prefab = { id, name, components };
    this.prefabs.set(id, prefab);
    return prefab;
  }

  get(id: string): Prefab | undefined {
    return this.prefabs.get(id);
  }

  list(): Prefab[] {
    return [...this.prefabs.values()];
  }

  remove(id: string): boolean {
    return this.prefabs.delete(id);
  }

  /** Instantiate a prefab into the world (deep-cloned components). */
  instantiate(id: string, world: EntityManager): EntityId | null {
    const prefab = this.prefabs.get(id);
    if (!prefab) return null;
    const entityId = world.createEntity();
    for (const component of prefab.components) {
      world.addComponent(entityId, JSON.parse(JSON.stringify(component)) as Component);
    }
    return entityId;
  }
}
