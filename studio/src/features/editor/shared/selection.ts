/**
 * features/editor/shared/selection.ts — editor selection model (pure).
 *
 * A shared selection store for every editor tool: primary + secondary selection,
 * add/remove/toggle, and selection "scope" (entity/tile/node/asset/…). Tools
 * report selection changes through this; the inspector + gizmos read it.
 */

export type SelectionScope = 'entity' | 'tile' | 'node' | 'asset' | 'ui-element' | 'keyframe';

export interface SelectionItem {
  scope: SelectionScope;
  id: string;
}

export interface SelectionState {
  primary: SelectionItem | null;
  /** All selected items (including primary). */
  items: SelectionItem[];
}

export function emptySelection(): SelectionState {
  return { primary: null, items: [] };
}

/** True if two selection items refer to the same thing. */
export function sameItem(a: SelectionItem, b: SelectionItem): boolean {
  return a.scope === b.scope && a.id === b.id;
}

export function selectOne(item: SelectionItem): SelectionState {
  return { primary: item, items: [item] };
}

export function addToSelection(state: SelectionState, item: SelectionItem): SelectionState {
  if (state.items.some((i) => sameItem(i, item))) return state;
  const items = [...state.items, item];
  return { primary: state.primary ?? item, items };
}

export function removeFromSelection(state: SelectionState, item: SelectionItem): SelectionState {
  const items = state.items.filter((i) => !sameItem(i, item));
  const primary = state.primary && sameItem(state.primary, item) ? (items[0] ?? null) : state.primary;
  return { primary, items };
}

export function toggleSelection(state: SelectionState, item: SelectionItem): SelectionState {
  const selected = state.items.some((i) => sameItem(i, item));
  return selected ? removeFromSelection(state, item) : addToSelection(state, item);
}

export function clearSelection(): SelectionState {
  return emptySelection();
}

/** All selected ids of a given scope. */
export function selectedIds(state: SelectionState, scope: SelectionScope): string[] {
  return state.items.filter((i) => i.scope === scope).map((i) => i.id);
}
