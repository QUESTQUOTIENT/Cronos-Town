/**
 * engine/workspaces/LayoutSerializer.ts — workspace layout persistence.
 *
 * A workspace layout (which panels are open in which workspace, plus the active
 * workspace) can be snapshotted and restored — the "save layout / restore layout
 * / workspace presets" capability a professional docking environment needs.
 *
 * Dock zones + tab groups are a `WindowManager` concern (see ui/systems) and are
 * persisted separately; this module owns the workspace→panel composition, which
 * is the layer users actually switch between.
 *
 * Pure + deterministic; JSON-safe.
 */
import { WorkspaceManager } from './WorkspaceManager';

export interface SerializedPanel {
  id: string;
  title: string;
  type: string;
  active: boolean;
}

export interface SerializedWorkspace {
  id: string;
  name: string;
  panels: SerializedPanel[];
}

export interface SerializedLayout {
  version: number;
  activeWorkspaceId: string | null;
  workspaces: SerializedWorkspace[];
}

export const LAYOUT_VERSION = 1;

export class LayoutSerializer {
  /** Snapshot the full workspace layout. */
  serialize(manager: WorkspaceManager): SerializedLayout {
    return {
      version: LAYOUT_VERSION,
      activeWorkspaceId: manager.active?.id ?? null,
      workspaces: manager.list().map((ws) => ({
        id: ws.id,
        name: ws.name,
        panels: ws.panels.map((p) => ({ id: p.id, title: p.title, type: p.type, active: p.active })),
      })),
    };
  }

  /** Restore a layout into a fresh manager (preserving workspace + panel ids). */
  deserialize(snapshot: SerializedLayout): { manager: WorkspaceManager; restored: number } {
    const manager = new WorkspaceManager();
    let restored = 0;
    for (const ws of snapshot.workspaces) {
      const created = manager.restoreWorkspace(ws.id, ws.name) ?? manager.createWorkspace(ws.name);
      for (const panel of ws.panels) {
        manager.addPanel(created.id, { id: panel.id, title: panel.title, type: panel.type });
        if (panel.active) manager.activatePanel(created.id, panel.id);
        restored += 1;
      }
    }
    if (snapshot.activeWorkspaceId) manager.setActive(snapshot.activeWorkspaceId);
    return { manager, restored };
  }
}
