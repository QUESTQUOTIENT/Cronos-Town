/**
 * ui/tree.ts — TreeView spec + helpers (pure).
 *
 * A hierarchical tree (used by the Hierarchy panel, asset browser, project
 * graph, and quest/dialogue editors). The spec is data; the adapter renders it.
 * Helpers flatten/expand/serialize the tree deterministically.
 */

export interface TreeNode {
  id: string;
  label: string;
  icon?: string;
  expanded?: boolean;
  selected?: boolean;
  children?: TreeNode[];
}

/** Depth-first flatten with depth info (for the adapter's indentation). */
export function flattenTree(root: TreeNode): Array<{ node: TreeNode; depth: number }> {
  const out: Array<{ node: TreeNode; depth: number }> = [];
  const walk = (node: TreeNode, depth: number): void => {
    out.push({ node, depth });
    if (node.expanded !== false) {
      for (const child of node.children ?? []) walk(child, depth + 1);
    }
  };
  walk(root, 0);
  return out;
}

/** Find a node by id (depth-first). */
export function findNode(root: TreeNode, id: string): TreeNode | null {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return null;
}

/** Toggle a node's expanded state (returns a new tree, immutable). */
export function toggleExpanded(root: TreeNode, id: string): TreeNode {
  if (root.id === id) {
    return { ...root, expanded: root.expanded === false, children: root.children };
  }
  return { ...root, children: (root.children ?? []).map((c) => toggleExpanded(c, id)) };
}

/** Set a node's selected state (returns a new tree, immutable). */
export function selectNode(root: TreeNode, id: string): TreeNode {
  return {
    ...root,
    selected: root.id === id,
    children: (root.children ?? []).map((c) => selectNode(c, id)),
  };
}

/** Serialize a tree to a JSON-safe structure. */
export function serializeTree(root: TreeNode): TreeNode {
  return JSON.parse(JSON.stringify(root)) as TreeNode;
}
