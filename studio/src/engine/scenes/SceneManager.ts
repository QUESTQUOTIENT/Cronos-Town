/**
 * engine/scenes/SceneManager.ts — the scene system.
 *
 * A scene owns a name and a set of entities (backed by an EntityManager). The
 * SceneManager tracks multiple scenes, an active scene, and (de)serializes them
 * through the ECS so worlds/maps/dialogue/quests can all be scenes.
 *
 * Pure + deterministic; serialization is JSON-safe via the ECS snapshot.
 */
import { EntityManager, type Component, type EntityId } from '../entity/EntityManager';

export interface Scene {
  id: string;
  name: string;
  /** Entities owned by this scene. */
  entities: EntityId[];
}

export interface SceneSnapshot {
  id: string;
  name: string;
  entities: Array<{ id: EntityId; components: Component[] }>;
}

export class SceneManager {
  private readonly scenes = new Map<string, Scene>();
  private readonly order: string[] = [];
  private activeId: string | null = null;

  constructor(private readonly entities: EntityManager) {}

  /** Create a scene with a unique id derived from the name. */
  createScene(name: string): Scene {
    const base = this.slug(name);
    let id = base;
    let n = 1;
    while (this.scenes.has(id)) {
      n += 1;
      id = `${base}-${n}`;
    }
    const scene: Scene = { id, name, entities: [] };
    this.scenes.set(id, scene);
    this.order.push(id);
    if (!this.activeId) this.activeId = id;
    return scene;
  }

  /** Remove a scene (its entities remain in the ECS unless the caller cleans up). */
  removeScene(id: string): boolean {
    if (!this.scenes.has(id)) return false;
    this.scenes.delete(id);
    this.order.splice(this.order.indexOf(id), 1);
    if (this.activeId === id) {
      this.activeId = this.order[this.order.length - 1] ?? null;
    }
    return true;
  }

  /** Attach an entity to a scene (the entity must exist in the ECS). */
  addEntity(sceneId: string, entityId: EntityId): boolean {
    const scene = this.scenes.get(sceneId);
    if (!scene || scene.entities.includes(entityId)) return false;
    scene.entities.push(entityId);
    return true;
  }

  /** Remove an entity from a scene (does NOT destroy it in the ECS). */
  removeEntity(sceneId: string, entityId: EntityId): boolean {
    const scene = this.scenes.get(sceneId);
    if (!scene) return false;
    const idx = scene.entities.indexOf(entityId);
    if (idx === -1) return false;
    scene.entities.splice(idx, 1);
    return true;
  }

  get(id: string): Scene | undefined {
    return this.scenes.get(id);
  }

  list(): Scene[] {
    return this.order.map((id) => this.scenes.get(id) as Scene);
  }

  get active(): Scene | null {
    return this.activeId ? (this.scenes.get(this.activeId) ?? null) : null;
  }

  setActive(id: string): boolean {
    if (!this.scenes.has(id)) return false;
    this.activeId = id;
    return true;
  }

  /** Serialize every scene + their entities (JSON-safe). */
  serialize(): SceneSnapshot[] {
    return this.list().map((scene) => ({
      id: scene.id,
      name: scene.name,
      entities: scene.entities
        .map((entityId) => this.entities.serialize().find((e) => e.id === entityId))
        .filter((e): e is { id: EntityId; components: Component[] } => Boolean(e)),
    }));
  }

  /** Restore scenes + entities from a `serialize()` snapshot. */
  deserialize(snapshots: SceneSnapshot[]): void {
    this.scenes.clear();
    this.order.length = 0;
    this.activeId = null;
    const allEntities: Array<{ id: EntityId; components: Component[] }> = [];
    for (const s of snapshots) {
      const scene: Scene = { id: s.id, name: s.name, entities: s.entities.map((e) => e.id) };
      this.scenes.set(s.id, scene);
      this.order.push(s.id);
      allEntities.push(...s.entities);
    }
    this.entities.deserialize(allEntities);
    if (this.order.length) this.activeId = this.order[0];
  }

  private slug(name: string): string {
    const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return base || 'scene';
  }
}
