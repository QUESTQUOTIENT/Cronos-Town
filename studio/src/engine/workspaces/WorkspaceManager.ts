/**
 * engine/workspaces/WorkspaceManager.ts — the workspace system.
 *
 * A workspace is a named collection of dockable panels (like Blender's layouts):
 * e.g. a "Game" workspace holds world/entities/quests/dialogue/timeline; a "UI"
 * workspace holds canvas/layers/inspector/asset-browser/history. Panels can be
 * opened/closed/activated, and the active workspace is tracked.
 *
 * Pure + deterministic. The DOM docking layout is a renderer concern; this module
 * owns the workspace/panel state model.
 */

export interface Panel {
  id: string;
  title: string;
  type: string;
  active: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  panels: Panel[];
}

export class WorkspaceManager {
  private readonly workspaces = new Map<string, Workspace>();
  private readonly order: string[] = [];
  private activeId: string | null = null;

  /** Create a workspace (unique id). */
  createWorkspace(name: string): Workspace {
    const base = this.slug(name);
    let id = base;
    let n = 1;
    while (this.workspaces.has(id)) {
      n += 1;
      id = `${base}-${n}`;
    }
    return this.insertWorkspace(id, name);
  }

  /**
   * Restore a workspace with an EXPLICIT id (no slugging/uniquifying) — used by
   * the layout serializer to preserve workspace identity across save/load.
   * Returns null if the id is already taken.
   */
  restoreWorkspace(id: string, name: string): Workspace | null {
    if (!id || this.workspaces.has(id)) return null;
    return this.insertWorkspace(id, name);
  }

  private insertWorkspace(id: string, name: string): Workspace {
    const ws: Workspace = { id, name, panels: [] };
    this.workspaces.set(id, ws);
    this.order.push(id);
    if (!this.activeId) this.activeId = id;
    return ws;
  }

  /** Add (or focus) a panel in a workspace. */
  addPanel(workspaceId: string, panel: { id: string; title: string; type: string }): Panel | null {
    const ws = this.workspaces.get(workspaceId);
    if (!ws) return null;
    const existing = ws.panels.find((p) => p.id === panel.id);
    if (existing) {
      this.activatePanel(workspaceId, panel.id);
      return existing;
    }
    const created: Panel = { id: panel.id, title: panel.title, type: panel.type, active: true };
    ws.panels.forEach((p) => (p.active = false));
    ws.panels.push(created);
    return created;
  }

  removePanel(workspaceId: string, panelId: string): boolean {
    const ws = this.workspaces.get(workspaceId);
    if (!ws) return false;
    const idx = ws.panels.findIndex((p) => p.id === panelId);
    if (idx === -1) return false;
    ws.panels.splice(idx, 1);
    return true;
  }

  activatePanel(workspaceId: string, panelId: string): boolean {
    const ws = this.workspaces.get(workspaceId);
    if (!ws) return false;
    const panel = ws.panels.find((p) => p.id === panelId);
    if (!panel) return false;
    ws.panels.forEach((p) => (p.active = p.id === panelId));
    return true;
  }

  /** True if a workspace holds a panel of the given type. */
  hasPanelType(workspaceId: string, type: string): boolean {
    return this.workspaces.get(workspaceId)?.panels.some((p) => p.type === type) ?? false;
  }

  get(id: string): Workspace | undefined {
    return this.workspaces.get(id);
  }

  list(): Workspace[] {
    return this.order.map((id) => this.workspaces.get(id) as Workspace);
  }

  get active(): Workspace | null {
    return this.activeId ? (this.workspaces.get(this.activeId) ?? null) : null;
  }

  setActive(id: string): boolean {
    if (!this.workspaces.has(id)) return false;
    this.activeId = id;
    return true;
  }

  /** The canonical studio workspaces (Game / UI / Economy / Wallet / AI / Assets). */
  static DEFAULT_WORKSPACES(): Array<{ name: string; panels: Array<{ id: string; title: string; type: string }> }> {
    return [
      { name: 'Game', panels: [
        { id: 'world', title: 'World', type: 'world' },
        { id: 'entities', title: 'Entities', type: 'entities' },
        { id: 'quests', title: 'Quests', type: 'quests' },
        { id: 'dialogue', title: 'Dialogue', type: 'dialogue' },
        { id: 'timeline', title: 'Timeline', type: 'timeline' },
      ] },
      { name: 'UI', panels: [
        { id: 'canvas', title: 'Canvas', type: 'canvas' },
        { id: 'layers', title: 'Layers', type: 'layers' },
        { id: 'inspector', title: 'Inspector', type: 'inspector' },
        { id: 'asset-browser', title: 'Asset Browser', type: 'asset-browser' },
        { id: 'history', title: 'History', type: 'history' },
      ] },
      { name: 'Economy', panels: [
        { id: 'economy', title: 'Economy', type: 'economy' },
        { id: 'audit', title: 'Audit Ledger', type: 'audit' },
        { id: 'wallet', title: 'Wallet', type: 'wallet' },
      ] },
      { name: 'AI', panels: [
        { id: 'agents', title: 'Agents', type: 'agents' },
        { id: 'memory', title: 'Memory', type: 'memory' },
        { id: 'prompts', title: 'Prompts', type: 'prompts' },
        { id: 'automation', title: 'Automation', type: 'automation' },
      ] },
      { name: 'Assets', panels: [
        { id: 'sprites', title: 'Sprites', type: 'sprites' },
        { id: 'tilesets', title: 'Tilesets', type: 'tilesets' },
        { id: 'audio', title: 'Audio', type: 'audio' },
        { id: 'templates', title: 'Templates', type: 'templates' },
      ] },
    ];
  }

  /** Build the default workspace set (mirrors the canonical studio layout). */
  static buildDefaults(): { workspace: WorkspaceManager; created: Workspace[] } {
    const manager = new WorkspaceManager();
    const created: Workspace[] = [];
    for (const def of WorkspaceManager.DEFAULT_WORKSPACES()) {
      const ws = manager.createWorkspace(def.name);
      for (const panel of def.panels) manager.addPanel(ws.id, panel);
      created.push(ws);
    }
    return { workspace: manager, created };
  }

  private slug(name: string): string {
    const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    return base || 'workspace';
  }
}
