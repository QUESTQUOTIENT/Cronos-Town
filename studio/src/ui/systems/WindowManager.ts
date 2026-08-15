/**
 * ui/systems/WindowManager.ts — window/dock management (pure state).
 *
 * Tracks open windows (panels) per workspace, tab groups, and the active window.
 * This is the state model behind drag-to-dock: windows have a dock zone + tab
 * group, and can be moved/closed/focused. The DOM layer applies these state
 * changes to the actual dock layout.
 *
 * Pure + deterministic.
 */

export type DockZone = 'left' | 'right' | 'center' | 'bottom' | 'top';

export interface WindowState {
  id: string;
  title: string;
  type: string;
  zone: DockZone;
  tabGroup: string;
  active: boolean;
}

export class WindowManager {
  private readonly windows = new Map<string, WindowState>();
  private readonly order: string[] = [];
  private activeId: string | null = null;

  /** Open (or focus) a window. */
  open(window: Omit<WindowState, 'active'>): WindowState {
    const existing = this.windows.get(window.id);
    if (existing) {
      this.focus(window.id);
      return existing;
    }
    const created: WindowState = { ...window, active: true };
    this.windows.set(window.id, created);
    this.order.push(window.id);
    this.activeId = window.id;
    return created;
  }

  close(id: string): boolean {
    if (!this.windows.has(id)) return false;
    this.windows.delete(id);
    this.order.splice(this.order.indexOf(id), 1);
    if (this.activeId === id) {
      this.activeId = this.order[this.order.length - 1] ?? null;
      if (this.activeId && this.windows.has(this.activeId)) {
        this.windows.get(this.activeId)!.active = true;
      }
    }
    return true;
  }

  focus(id: string): boolean {
    if (!this.windows.has(id)) return false;
    for (const w of this.windows.values()) w.active = w.id === id;
    this.activeId = id;
    return true;
  }

  /** Move a window to a dock zone / tab group. */
  dock(id: string, zone: DockZone, tabGroup: string): boolean {
    const w = this.windows.get(id);
    if (!w) return false;
    w.zone = zone;
    w.tabGroup = tabGroup;
    return true;
  }

  /** Move a window to a different tab group (or create one). */
  moveToTab(id: string, tabGroup: string): boolean {
    const w = this.windows.get(id);
    if (!w) return false;
    w.tabGroup = tabGroup;
    return true;
  }

  get active(): WindowState | null {
    return this.activeId ? (this.windows.get(this.activeId) ?? null) : null;
  }

  get(id: string): WindowState | undefined {
    return this.windows.get(id);
  }

  list(): WindowState[] {
    return this.order.map((id) => this.windows.get(id) as WindowState);
  }

  /** Windows grouped by tab group (for tab-strip rendering). */
  tabGroups(): Map<string, WindowState[]> {
    const groups = new Map<string, WindowState[]>();
    for (const w of this.list()) {
      const group = groups.get(w.tabGroup) ?? [];
      group.push(w);
      groups.set(w.tabGroup, group);
    }
    return groups;
  }

  /** Windows in a dock zone. */
  inZone(zone: DockZone): WindowState[] {
    return this.list().filter((w) => w.zone === zone);
  }
}
