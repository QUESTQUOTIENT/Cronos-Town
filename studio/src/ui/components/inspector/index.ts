/**
 * ui/components/inspector/index.ts — the Inspector component (atomic).
 *
 * Maps an InspectorSpec (from engine/inspector) into a render spec of sections +
 * property rows, with a tone → color mapping. Pure + testable; the DOM layer
 * renders the rows.
 */
import type { InspectorSpec, InspectorSection } from '../../../engine/inspector/Inspector';

export interface PropertyRowSpec {
  label: string;
  value: string;
  tone: 'default' | 'gold' | 'teal' | 'danger';
}

export interface InspectorSectionSpec {
  title: string;
  rows: PropertyRowSpec[];
}

export interface InspectorViewSpec {
  title: string;
  subtitle: string;
  sections: InspectorSectionSpec[];
}

/** Convert an InspectorSpec into a view spec (flattening fields into rows). */
export function buildInspectorViewSpec(spec: InspectorSpec): InspectorViewSpec {
  return {
    title: spec.title,
    subtitle: spec.subtitle,
    sections: spec.sections.map((section: InspectorSection) => ({
      title: section.title,
      rows: section.fields.map((field) => ({
        label: field.label,
        value: field.value,
        tone: field.tone ?? 'default',
      })),
    })),
  };
}
