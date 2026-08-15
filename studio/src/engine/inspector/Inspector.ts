/**
 * engine/inspector/Inspector.ts — the live inspector data model.
 *
 * Selecting anything (an entity, a project-graph node, an asset) produces a
 * structured `InspectorSpec`: properties, references, dependents, history, and
 * events. This is the "Unity-style inspector" data — the DOM layer renders it,
 * but the selection → spec mapping is pure + testable.
 */
import type { EntityManager, Component } from '../entity/EntityManager';
import type { ProjectGraph } from '../projects/ProjectGraph';
import type { AssetRegistry, AssetRecord } from '../assets/AssetRegistry';
import type { StudioProject } from '../projects/StudioProject';
import { getStudioSchema, validateStudioObject } from '../projects/StudioSchemas';

export interface InspectorField {
  label: string;
  value: string;
  /** Optional emphasis (e.g. 'gold', 'teal'). */
  tone?: 'default' | 'gold' | 'teal' | 'danger';
}

export interface InspectorSection {
  title: string;
  fields: InspectorField[];
}

export interface InspectorSpec {
  /** The selected target's display title. */
  title: string;
  subtitle: string;
  sections: InspectorSection[];
}

export interface InspectorScope {
  entities: EntityManager;
  graph: ProjectGraph;
  assets: AssetRegistry;
  /** Canonical authored object store; makes this inspector universal. */
  studioProject?: StudioProject;
  /** Optional: a history of events involving a target (for the "events" section). */
  eventsFor?: (id: string) => string[];
  /** Optional: undo/redo labels relevant to a target (for the "history" section). */
  historyFor?: (id: string) => string[];
}

export type Selection =
  | { kind: 'entity'; id: number }
  | { kind: 'node'; id: string }
  | { kind: 'asset'; id: string };

export class Inspector {
  constructor(private readonly scope: InspectorScope) {}

  /** Build the inspector spec for a selection (null → empty "nothing selected"). */
  inspect(selection: Selection | null): InspectorSpec | null {
    if (!selection) return null;
    switch (selection.kind) {
      case 'entity': return this.entity(selection.id);
      case 'node': return this.node(selection.id);
      case 'asset': return this.asset(selection.id);
    }
  }

  private entity(id: number): InspectorSpec | null {
    const comps = this.scope.entities.getComponents(id);
    if (comps.length === 0 && !this.scope.entities.entityIds().includes(id)) return null;
    return {
      title: `Entity #${id}`,
      subtitle: comps.map((c) => c.type).join(' · ') || 'no components',
      sections: [
        {
          title: 'Components',
          fields: comps.map((c) => ({ label: c.type, value: this.summary(c), tone: 'teal' as const })),
        },
      ],
    };
  }

  private node(id: string): InspectorSpec | null {
    const node = this.scope.graph.get(id);
    if (!node) return null;
    const analysis = this.scope.graph.analyze(id);
    const studioObject = this.scope.studioProject?.get(id);
    const sections: InspectorSection[] = [
      {
        title: 'Properties',
        fields: [
          { label: 'id', value: node.id, tone: 'teal' },
          { label: 'kind', value: node.kind, tone: 'gold' },
          ...(node.metadata ? Object.entries(node.metadata).map(([k, v]) => ({ label: k, value: String(v) })) : []),
        ],
      },
      {
        title: 'References',
        fields: analysis.references.map((r) => ({ label: r.kind, value: r.name, tone: 'teal' as const })),
      },
      {
        title: 'Dependencies',
        fields: [
          { label: 'dependents', value: String(analysis.dependents.length), tone: analysis.dependents.length ? 'danger' as const : 'default' as const },
          { label: 'impact', value: String(analysis.impact.length), tone: analysis.impact.length ? 'danger' as const : 'default' as const },
          { label: 'safe to delete', value: analysis.safeToDelete ? 'yes' : 'no', tone: analysis.safeToDelete ? 'teal' as const : 'danger' as const },
        ],
      },
    ];

    if (studioObject) {
      const schema = getStudioSchema(studioObject.kind);
      sections.splice(1, 0, {
        title: 'Runtime Object',
        fields: [
          { label: 'schema', value: schema.title, tone: 'gold' },
          { label: 'graph role', value: schema.graphRole },
          { label: 'capabilities', value: Object.entries(schema.capabilities).filter(([, enabled]) => enabled).map(([name]) => name).join(' · '), tone: 'teal' },
          { label: 'updated', value: new Date(studioObject.updatedAt).toISOString() },
          ...Object.entries(studioObject.data).map(([key, value]) => ({
            label: key,
            value: typeof value === 'object' ? JSON.stringify(value) : String(value),
            tone: 'teal' as const,
          })),
        ],
      });
    }
    if (studioObject) {
      const diagnostics = validateStudioObject(studioObject);
      sections.push({
        title: 'Diagnostics',
        fields: diagnostics.length
          ? diagnostics.map((diagnostic) => ({ label: diagnostic.severity.toUpperCase(), value: diagnostic.message, tone: diagnostic.severity === 'error' ? 'danger' as const : 'gold' as const }))
          : [{ label: 'status', value: 'Schema valid', tone: 'teal' }],
      });
    }

    // Universal inspector: history + events when the scope provides them.
    const history = this.scope.historyFor?.(id);
    if (history && history.length > 0) {
      sections.push({ title: 'History', fields: history.map((h) => ({ label: '↶', value: h })) });
    }
    const events = this.scope.eventsFor?.(id);
    if (events && events.length > 0) {
      sections.push({ title: 'Events', fields: events.map((e) => ({ label: '⚡', value: e })) });
    }

    return { title: node.name, subtitle: node.kind, sections };
  }

  private asset(id: string): InspectorSpec | null {
    const asset = this.scope.assets.get(id);
    if (!asset) return null;
    return {
      title: asset.name,
      subtitle: asset.kind,
      sections: [
        {
          title: 'Properties',
          fields: [
            { label: 'id', value: asset.id, tone: 'teal' },
            { label: 'kind', value: asset.kind, tone: 'gold' },
            { label: 'source', value: asset.source },
            { label: 'version', value: `v${asset.version}` },
          ],
        },
        {
          title: 'Metadata',
          fields: Object.entries(asset.metadata).map(([k, v]) => ({ label: k, value: String(v) })),
        },
      ],
    };
  }

  private summary(comp: Component): string {
    const entries = Object.entries(comp).filter(([k]) => k !== 'type');
    return entries.map(([k, v]) => `${k}=${String(v)}`).join(' · ') || '—';
  }
}

export type { AssetRecord };
