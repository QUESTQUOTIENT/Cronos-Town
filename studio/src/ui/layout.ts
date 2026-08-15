/**
 * ui/layout.ts — the dockable layout engine (pure split-pane math).
 *
 * The studio docks windows into a tree of row/column splits (like Blender). A
 * `DockNode` is either a leaf (holds a panel id) or a container (splits its space
 * among weighted children). `layoutDock` computes each leaf's pixel rectangle
 * from a root rectangle — pure math, fully testable, DOM-free.
 *
 * The `DomUiAdapter` consumes this to place panels; editors + workspaces share it.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SplitDirection = 'row' | 'column';

export interface DockLeaf {
  kind: 'leaf';
  id: string;
  /** The panel id this leaf hosts. */
  panelId: string;
}

export interface DockContainer {
  kind: 'container';
  id: string;
  direction: SplitDirection;
  /** Children, each with a relative weight. */
  children: Array<{ node: DockNode; weight: number }>;
}

export type DockNode = DockLeaf | DockContainer;

export function leaf(id: string, panelId: string): DockLeaf {
  return { kind: 'leaf', id, panelId };
}

export function container(id: string, direction: SplitDirection, children: Array<{ node: DockNode; weight: number }>): DockContainer {
  return { kind: 'container', id, direction, children };
}

/** Compute each leaf's rectangle from the root rectangle. */
export function layoutDock(root: DockNode, rect: Rect): Map<string, Rect> {
  const out = new Map<string, Rect>();
  const walk = (node: DockNode, r: Rect): void => {
    if (node.kind === 'leaf') {
      out.set(node.id, r);
      return;
    }
    const totalWeight = node.children.reduce((sum, c) => sum + Math.max(0, c.weight), 0);
    if (totalWeight <= 0) return;
    let offset = 0;
    const span = node.direction === 'row' ? r.width : r.height;
    for (const child of node.children) {
      const w = Math.max(0, child.weight);
      const size = Math.floor((span * w) / totalWeight);
      const childRect: Rect =
        node.direction === 'row'
          ? { x: r.x + offset, y: r.y, width: size, height: r.height }
          : { x: r.x, y: r.y + offset, width: r.width, height: size };
      walk(child.node, childRect);
      offset += size;
    }
  };
  walk(root, rect);
  return out;
}

/** Collect every leaf panel id in the tree (for e.g. "which panels are open"). */
export function collectLeafPanelIds(root: DockNode): string[] {
  const ids: string[] = [];
  const walk = (node: DockNode): void => {
    if (node.kind === 'leaf') {
      ids.push(node.panelId);
      return;
    }
    for (const child of node.children) walk(child.node);
  };
  walk(root);
  return ids;
}

/** Build a simple horizontal dock from a list of panel ids (equal weights).
 *  Leaf ids equal the panel ids, so `layoutDock`'s result is keyed by panel id. */
export function simpleRowDock(panelIds: string[]): DockContainer {
  return container('root', 'row', panelIds.map((panelId) => ({ node: leaf(panelId, panelId), weight: 1 })));
}
