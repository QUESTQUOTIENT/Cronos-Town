/**
 * ui/DomUiAdapter.ts — renders component specs to real DOM.
 *
 * This is the DOM half of the design system: `ui/components.ts` defines pure
 * specs (data), and this adapter turns them into actual elements. A minimal DOM
 * factory is injected so the adapter is testable in a headless environment
 * (jsdom, happy-dom, or a lightweight stub) and never hard-depends on `document`.
 *
 * Every feature/workspace panel renders through this adapter, so the visual
 * language stays consistent (the "no duplicated UI logic" guarantee).
 */

import type { ComponentSpec, ButtonSpec, PanelSpec, TabGroupSpec, ToolbarSpec, InspectorSpec, StatusSpec } from './components';
import { toneColor } from './components';
import { StudioColors, type StudioColor } from './theme';

/** Minimal DOM surface the adapter needs (satisfied by real DOM or a test stub). */
export interface DomNode {
  setAttribute(name: string, value: string): void;
  appendChild(child: DomNode): void;
  set textContent(value: string);
  get textContent(): string;
  set innerHTML(value: string);
  className: string;
  style: Record<string, string>;
  addEventListener?(type: string, listener: () => void): void;
  set disabled(value: boolean);
}

export interface DomFactory {
  createElement(tag: string): DomNode;
}

/** The browser-backed factory (real DOM). */
export const browserDomFactory: DomFactory = {
  createElement(tag: string): DomNode {
    return document.createElement(tag) as unknown as DomNode;
  },
};

export interface DomUiAdapterOptions {
  factory: DomFactory;
  palette?: Record<StudioColor, string>;
  /** Click handler per button id. */
  onClick?: (buttonId: string) => void;
}

export class DomUiAdapter {
  private readonly factory: DomFactory;
  private readonly palette: Record<StudioColor, string>;
  private readonly onClick?: (buttonId: string) => void;

  constructor(options: DomUiAdapterOptions) {
    this.factory = options.factory;
    this.palette = options.palette ?? StudioColors;
    this.onClick = options.onClick;
  }

  /** Render a component spec into a DOM node. */
  render(spec: ComponentSpec): DomNode {
    switch (spec.kind) {
      case 'button': return this.button(spec);
      case 'panel': return this.panel(spec);
      case 'tab-group': return this.tabGroup(spec);
      case 'toolbar': return this.toolbar(spec);
      case 'inspector': return this.inspector(spec);
      case 'status': return this.status(spec);
      default: return this.text('(unknown component)');
    }
  }

  private el(tag: string, className: string): DomNode {
    const node = this.factory.createElement(tag);
    node.className = className;
    return node;
  }

  private text(content: string): DomNode {
    const node = this.el('div', 'ui-text');
    node.textContent = content;
    return node;
  }

  private button(spec: ButtonSpec): DomNode {
    const node = this.el('button', `ui-button ui-button--${spec.tone ?? 'default'}`);
    node.setAttribute('data-button-id', spec.id);
    const color = toneColor(spec.tone ?? 'default', this.palette);
    node.style.borderColor = color;
    node.style.color = color;
    node.style.background = this.palette.glassDeep;
    node.textContent = spec.icon ? `${spec.icon} ${spec.label}` : spec.label;
    if (spec.disabled) node.disabled = true;
    if (this.onClick && node.addEventListener) {
      node.addEventListener('click', () => this.onClick?.(spec.id));
    }
    return node;
  }

  private panel(spec: PanelSpec): DomNode {
    const node = this.el('section', 'ui-panel');
    node.setAttribute('data-panel-id', spec.id);
    const title = this.el('header', 'ui-panel__title');
    title.textContent = spec.title;
    node.appendChild(title);
    const body = this.el('div', 'ui-panel__body');
    for (const child of spec.children ?? []) {
      body.appendChild(this.render(child));
    }
    node.appendChild(body);
    return node;
  }

  private tabGroup(spec: TabGroupSpec): DomNode {
    const node = this.el('div', 'ui-tab-group');
    node.setAttribute('role', 'tablist');
    for (const tab of spec.tabs) {
      const btn = this.el('button', `ui-tab${tab.selected ? ' ui-tab--selected' : ''}`);
      btn.setAttribute('data-tab-id', tab.id);
      btn.setAttribute('role', 'tab');
      btn.textContent = tab.label;
      node.appendChild(btn);
    }
    return node;
  }

  private toolbar(spec: ToolbarSpec): DomNode {
    const node = this.el('div', 'ui-toolbar');
    node.setAttribute('data-toolbar-id', spec.id);
    for (const btn of spec.buttons) {
      node.appendChild(this.button(btn));
    }
    return node;
  }

  private inspector(spec: InspectorSpec): DomNode {
    const node = this.el('div', 'ui-inspector');
    node.setAttribute('data-inspector-id', spec.id);
    for (const field of spec.fields) {
      const row = this.el('div', 'ui-inspector__row');
      const label = this.el('span', 'ui-inspector__label');
      label.textContent = field.label;
      const value = this.el('span', 'ui-inspector__value');
      value.textContent = field.value;
      row.appendChild(label);
      row.appendChild(value);
      node.appendChild(row);
    }
    return node;
  }

  private status(spec: StatusSpec): DomNode {
    const node = this.el('div', `ui-status ui-status--${spec.tone ?? 'info'}`);
    node.setAttribute('role', 'status');
    node.textContent = spec.message;
    return node;
  }
}
