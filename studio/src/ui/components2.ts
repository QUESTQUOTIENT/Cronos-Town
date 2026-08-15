/**
 * ui/components2.ts — design-system components (spec layer, part 2).
 *
 * Window, StatusBar, Timeline, PropertyRow, InspectorSection, EmptyState,
 * LoadingState, ErrorState, DialogueBox, InventoryGrid. Pure data specs — the
 * adapter renders them. This rounds out the component vocabulary so every screen
 * is composed from the same primitives/components instead of bespoke markup.
 */
import type { ComponentSpec, ComponentTone } from './components';

export interface WindowSpec {
  kind: 'window';
  id: string;
  title: string;
  tone?: ComponentTone;
  children?: ComponentSpec[];
}

export interface StatusBarSpec {
  kind: 'status-bar';
  id: string;
  items: Array<{ label: string; value: string }>;
}

export interface TimelineSpec {
  kind: 'timeline';
  id: string;
  /** Timeline entries, oldest → newest. */
  entries: Array<{ id: string; label: string; at: number }>;
}

export interface PropertyRowSpec {
  kind: 'property-row';
  id: string;
  label: string;
  value: string;
  tone?: ComponentTone;
}

export interface InspectorSectionSpec {
  kind: 'inspector-section';
  id: string;
  title: string;
  rows: PropertyRowSpec[];
}

export interface EmptyStateSpec {
  kind: 'empty-state';
  id: string;
  title: string;
  hint?: string;
}

export interface LoadingStateSpec {
  kind: 'loading-state';
  id: string;
  label?: string;
}

export interface ErrorStateSpec {
  kind: 'error-state';
  id: string;
  message: string;
}

export interface DialogueBoxSpec {
  kind: 'dialogue-box';
  id: string;
  speaker: string;
  lines: string[];
}

export interface InventoryGridSpec {
  kind: 'inventory-grid';
  id: string;
  columns: number;
  items: Array<{ id: string; name: string; count: number }>;
}

export type StudioComponentSpec =
  | WindowSpec
  | StatusBarSpec
  | TimelineSpec
  | PropertyRowSpec
  | InspectorSectionSpec
  | EmptyStateSpec
  | LoadingStateSpec
  | ErrorStateSpec
  | DialogueBoxSpec
  | InventoryGridSpec;

/** Build an InspectorSectionSpec from an InspectorSpec-like section (convenience). */
export function inspectorSection(id: string, title: string, fields: Array<{ label: string; value: string; tone?: ComponentTone }>): InspectorSectionSpec {
  return {
    kind: 'inspector-section',
    id,
    title,
    rows: fields.map((f, i) => ({ kind: 'property-row', id: `${id}-row-${i}`, label: f.label, value: f.value, tone: f.tone })),
  };
}

/** A status-bar item list → StatusBarSpec (convenience). */
export function statusBar(id: string, items: Array<{ label: string; value: string }>): StatusBarSpec {
  return { kind: 'status-bar', id, items };
}
