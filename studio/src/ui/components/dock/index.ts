/**
 * ui/components/dock/index.ts — the Dock component (atomic).
 *
 * Builds a dock render-spec (panels + pixel rects + splitter positions) from a
 * WindowManager's tab groups + zones. This is the data → render mapping; the DOM
 * layer paints the rects and drag handles. Pure + testable.
 */
import type { WindowManager } from '../../systems/WindowManager';
import { layoutDock, type DockNode, type Rect } from '../../layout';

export interface DockPanelSpec {
  id: string;
  title: string;
  zone: string;
  tabGroup: string;
  rect: Rect;
  active: boolean;
}

export interface DockSpec {
  panels: DockPanelSpec[];
  width: number;
  height: number;
}

/** Build a horizontal dock spec from a WindowManager's active windows. */
export function buildDockSpec(manager: WindowManager, width: number, height: number): DockSpec {
  const windows = manager.list().filter((w) => w.active !== false);
  const root: DockNode = { kind: 'container', id: 'root', direction: 'row', children: windows.map((w) => ({ node: { kind: 'leaf', id: w.id, panelId: w.id }, weight: 1 })) };
  const rects = layoutDock(root, { x: 0, y: 0, width, height });
  const panels: DockPanelSpec[] = windows.map((w) => ({
    id: w.id,
    title: w.title,
    zone: w.zone,
    tabGroup: w.tabGroup,
    rect: rects.get(w.id) ?? { x: 0, y: 0, width: 0, height: 0 },
    active: w.active,
  }));
  return { panels, width, height };
}

/** Split a panel's rect into two (left/right) for a split-view drag. */
export function splitRect(rect: Rect, ratio = 0.5): { first: Rect; second: Rect } {
  const split = Math.floor(rect.width * ratio);
  return {
    first: { x: rect.x, y: rect.y, width: split, height: rect.height },
    second: { x: rect.x + split, y: rect.y, width: rect.width - split, height: rect.height },
  };
}
