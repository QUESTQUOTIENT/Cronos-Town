/**
 * engine/projects/ProjectManager.ts — the project system.
 *
 * A project owns a name, settings, and a set of scenes (via the SceneManager).
 * The manager tracks the open project, recent-project history, and serializes the
 * whole project (settings + scenes) for persistence/export. A professional engine
 * manages many projects; this is that boundary.
 *
 * Pure + deterministic.
 */
import { SceneManager, type SceneSnapshot } from '../scenes/SceneManager';

export interface ProjectSettings {
  author: string;
  description: string;
  [key: string]: unknown;
}

export interface Project {
  id: string;
  name: string;
  createdAt: number;
  modifiedAt: number;
  settings: ProjectSettings;
  sceneIds: string[];
}

export interface ProjectSnapshot {
  id: string;
  name: string;
  createdAt: number;
  modifiedAt: number;
  settings: ProjectSettings;
  scenes: SceneSnapshot[];
}

export interface ProjectManagerOptions {
  now?: () => number;
  maxRecent?: number;
}

export class ProjectManager {
  private readonly projects = new Map<string, Project>();
  private readonly recent: string[] = [];
  private openId: string | null = null;
  private readonly now: () => number;
  private readonly maxRecent: number;

  constructor(
    private readonly scenes: SceneManager,
    options: ProjectManagerOptions = {},
  ) {
    this.now = options.now ?? (() => Date.now());
    this.maxRecent = options.maxRecent ?? 10;
  }

  /** Create a project (unique id) and open it. */
  createProject(name: string, settings: ProjectSettings = { author: '', description: '' }): Project {
    const base = this.slug(name);
    let id = base;
    let n = 1;
    while (this.projects.has(id)) {
      n += 1;
      id = `${base}-${n}`;
    }
    const ts = this.now();
    const project: Project = { id, name, createdAt: ts, modifiedAt: ts, settings: { ...settings }, sceneIds: [] };
    this.projects.set(id, project);
    this.open(id);
    return project;
  }

  /** Open a project (records it in recents). */
  open(id: string): boolean {
    if (!this.projects.has(id)) return false;
    this.openId = id;
    this.recent.splice(0, 0, id);
    // de-duplicate, cap
    const unique = [...new Set(this.recent)];
    this.recent.length = 0;
    this.recent.push(...unique.slice(0, this.maxRecent));
    return true;
  }

  close(): void {
    this.openId = null;
  }

  get current(): Project | null {
    return this.openId ? (this.projects.get(this.openId) ?? null) : null;
  }

  get(id: string): Project | undefined {
    return this.projects.get(id);
  }

  list(): Project[] {
    return [...this.projects.values()];
  }

  recentProjects(): Project[] {
    return this.recent
      .map((id) => this.projects.get(id))
      .filter((p): p is Project => Boolean(p));
  }

  /** Associate a scene with the open project (by scene id). */
  addSceneToOpen(sceneId: string): boolean {
    const current = this.current;
    if (!current || current.sceneIds.includes(sceneId)) return false;
    current.sceneIds.push(sceneId);
    this.touch(current);
    return true;
  }

  /** Serialize the open project + its scenes (JSON-safe). */
  serializeOpen(): ProjectSnapshot | null {
    const current = this.current;
    if (!current) return null;
    return {
      id: current.id,
      name: current.name,
      createdAt: current.createdAt,
      modifiedAt: current.modifiedAt,
      settings: { ...current.settings },
      scenes: this.scenes.serialize().filter((s) => current.sceneIds.includes(s.id)),
    };
  }

  private touch(project: Project): void {
    project.modifiedAt = this.now();
  }

  private slug(name: string): string {
    const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return base || 'project';
  }
}
