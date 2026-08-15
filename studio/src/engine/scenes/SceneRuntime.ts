/**
 * engine/scenes/SceneRuntime.ts — the scene runtime (load/activate/transition).
 *
 * The editor *edits* scenes (via SceneManager); the runtime *runs* them. This is
 * the independent runtime layer: a SceneLoader (activate a scene's entities),
 * a SceneSerializer (typed wrapper over the ECS snapshot), a SceneRuntime (tracks
 * the active scene + its entity set), and SceneTransitions (a deterministic
 * state machine for scene changes).
 *
 * Pure + deterministic. No DOM.
 */
import { EntityManager, type Component, type EntityId } from '../entity/EntityManager';

export type SceneLoadStatus = 'idle' | 'loading' | 'active' | 'unloading';

export interface SerializedScene {
  id: string;
  name: string;
  entities: Array<{ id: EntityId; components: Component[] }>;
}

export class SceneSerializer {
  constructor(private readonly entities: EntityManager) {}

  serialize(sceneId: string, sceneName: string, entityIds: EntityId[]): SerializedScene {
    const all = this.entities.serialize();
    return {
      id: sceneId,
      name: sceneName,
      entities: entityIds
        .map((id) => all.find((e) => e.id === id))
        .filter((e): e is { id: EntityId; components: Component[] } => Boolean(e)),
    };
  }

  deserialize(scene: SerializedScene): void {
    this.entities.deserialize(scene.entities);
  }
}

export class SceneLoader {
  private readonly statuses = new Map<string, SceneLoadStatus>();

  constructor(private readonly serializer: SceneSerializer) {}

  status(sceneId: string): SceneLoadStatus {
    return this.statuses.get(sceneId) ?? 'idle';
  }

  /** Load (deserialize) a scene into the ECS and mark it active. */
  load(scene: SerializedScene): void {
    this.statuses.set(scene.id, 'loading');
    this.serializer.deserialize(scene);
    this.statuses.set(scene.id, 'active');
  }

  /** Mark a scene as unloading (does not destroy its entities). */
  unload(sceneId: string): void {
    this.statuses.set(sceneId, 'unloading');
  }
}

export interface SceneRuntimeState {
  activeSceneId: string | null;
  sceneEntities: Map<string, EntityId[]>;
}

export class SceneRuntime {
  private readonly state: SceneRuntimeState = { activeSceneId: null, sceneEntities: new Map() };

  constructor(private readonly entities: EntityManager) {}

  /** Bind a scene id → entity ids and set it active. */
  activate(sceneId: string, entityIds: EntityId[]): void {
    this.state.activeSceneId = sceneId;
    this.state.sceneEntities.set(sceneId, [...entityIds]);
  }

  deactivate(): void {
    this.state.activeSceneId = null;
  }

  get activeSceneId(): string | null {
    return this.state.activeSceneId;
  }

  /** Entities belonging to a scene. */
  entitiesFor(sceneId: string): EntityId[] {
    return this.state.sceneEntities.get(sceneId) ?? [];
  }

  /** All entities in the active scene. */
  activeEntities(): EntityId[] {
    return this.state.activeSceneId ? this.entitiesFor(this.state.activeSceneId) : [];
  }

  /** Entity ids present in the ECS that belong to a scene (live re-query). */
  liveActiveEntities(): EntityId[] {
    return this.activeEntities().filter((id) => this.entities.entityIds().includes(id));
  }
}

export type TransitionPhase = 'none' | 'out' | 'in' | 'done';

export interface SceneTransition {
  from: string | null;
  to: string | null;
  phase: TransitionPhase;
}

export class SceneTransitions {
  private current: SceneTransition = { from: null, to: null, phase: 'none' };

  get state(): SceneTransition {
    return { ...this.current };
  }

  /** Begin a transition out of `from` toward `to`. */
  begin(from: string | null, to: string | null): void {
    this.current = { from, to, phase: 'out' };
  }

  /** Advance the transition (out → in → done). Deterministic. */
  advance(): TransitionPhase {
    if (this.current.phase === 'out') this.current.phase = 'in';
    else if (this.current.phase === 'in') this.current.phase = 'done';
    return this.current.phase;
  }

  reset(): void {
    this.current = { from: null, to: null, phase: 'none' };
  }
}
