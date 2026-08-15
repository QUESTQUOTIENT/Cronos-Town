/**
 * ui/components.ts — component contracts (the design system's type layer).
 *
 * Every panel/overlay in the studio composes the same primitives. These contracts
 * define the *shape* of a component so features can emit component specs without
 * owning any DOM. A `DomUiAdapter` (renderer) turns specs into elements; the
 * specs themselves are pure data — testable and serializable.
 */

import type { StudioColor } from './theme';

export type ComponentTone = 'default' | 'primary' | 'gold' | 'danger' | 'success';

export interface ButtonSpec {
  kind: 'button';
  id: string;
  label: string;
  tone?: ComponentTone;
  disabled?: boolean;
  /** Optional icon glyph (emoji / symbol). */
  icon?: string;
}

export interface PanelSpec {
  kind: 'panel';
  id: string;
  title: string;
  tone?: ComponentTone;
  /** Child component specs (nested). */
  children?: ComponentSpec[];
}

export interface TabSpec {
  kind: 'tab';
  id: string;
  label: string;
  selected?: boolean;
}

export interface TabGroupSpec {
  kind: 'tab-group';
  id: string;
  tabs: TabSpec[];
}

export interface ToolbarSpec {
  kind: 'toolbar';
  id: string;
  buttons: ButtonSpec[];
}

export interface InspectorSpec {
  kind: 'inspector';
  id: string;
  /** Field label/value pairs. */
  fields: Array<{ label: string; value: string }>;
}

export interface StatusSpec {
  kind: 'status';
  id: string;
  message: string;
  tone?: 'info' | 'good' | 'error';
}

export type ComponentSpec =
  | ButtonSpec
  | PanelSpec
  | TabSpec
  | TabGroupSpec
  | ToolbarSpec
  | InspectorSpec
  | StatusSpec;

/** A dockable panel definition (used by the workspace manager's DOM layer). */
export interface DockablePanelSpec {
  id: string;
  title: string;
  type: string;
  content: ComponentSpec[];
}

/**
 * Resolve a tone to a theme color (the single mapping used by all components).
 * Mirrors the legacy color usage: primary=teal, gold=gold, danger=red, success=green.
 */
export function toneColor(tone: ComponentTone, palette: Record<StudioColor, string>): string {
  switch (tone) {
    case 'primary': return palette.teal;
    case 'gold': return palette.gold;
    case 'danger': return palette.red;
    case 'success': return palette.green;
    default: return palette.teal;
  }
}

/** The canonical studio toolbar (mirrors the World Studio top bar). */
export function defaultStudioToolbar(): ToolbarSpec {
  return {
    kind: 'toolbar',
    id: 'studio-topbar',
    buttons: [
      { kind: 'button', id: 'undo', label: '↶ UNDO', tone: 'default' },
      { kind: 'button', id: 'redo', label: '↷ REDO', tone: 'default' },
      { kind: 'button', id: 'save', label: '💾 SAVE', tone: 'primary' },
      { kind: 'button', id: 'export', label: '📦 EXPORT', tone: 'gold' },
    ],
  };
}
