import { describe, expect, it } from 'vitest';

import { EntityManager, type Component } from '../src/engine/entity/EntityManager';
import { SystemRunner } from '../src/engine/entity/SystemRunner';
import { container, layoutDock, leaf, collectLeafPanelIds, simpleRowDock } from '../src/ui/layout';
import { DomUiAdapter, type DomFactory, type DomNode } from '../src/ui/DomUiAdapter';
import { defaultStudioToolbar } from '../src/ui/components';

// --- minimal DOM stub ---------------------------------------------------------
class StubNode implements DomNode {
  children: StubNode[] = [];
  attrs: Record<string, string> = {};
  _text = '';
  _html = '';
  className = '';
  style: Record<string, string> = {};
  disabled = false;
  listeners: Record<string, Array<() => void>> = {};

  setAttribute(name: string, value: string) { this.attrs[name] = value; }
  appendChild(child: DomNode) { this.children.push(child as StubNode); }
  set textContent(v: string) { this._text = v; }
  get textContent() { return this._text; }
  set innerHTML(v: string) { this._html = v; }
  addEventListener(type: string, listener: () => void) {
    (this.listeners[type] ??= []).push(listener);
  }
  set disabled(v: boolean) { this.disabled = v; }

  findByAttr(name: string, value: string): StubNode | null {
    if (this.attrs[name] === value) return this;
    for (const c of this.children) {
      const found = c.findByAttr(name, value);
      if (found) return found;
    }
    return null;
  }
}

function stubFactory(): { factory: DomFactory; roots: StubNode[] } {
  const roots: StubNode[] = [];
  const factory: DomFactory = {
    createElement() {
      const n = new StubNode();
      roots.push(n);
      return n;
    },
  };
  return { factory, roots };
}

interface Velocity extends Component { type: 'velocity'; dx: number; dy: number; }
interface Position extends Component { type: 'position'; x: number; y: number; }

describe('engine/entity — SystemRunner', () => {
  it('runs enabled systems in registration order and reports skipped', () => {
    const em = new EntityManager();
    const runner = new SystemRunner();
    const order: string[] = [];
    runner.register('a', () => order.push('a'));
    runner.register('b', () => order.push('b'));
    runner.register('c', () => order.push('c'));
    runner.disable('b');

    const report = runner.run(em, 16);
    expect(order).toEqual(['a', 'c']);
    expect(report.ran).toEqual(['a', 'c']);
    expect(report.skipped).toEqual(['b']);
  });

  it('a movement system integrates position from velocity (deterministic)', () => {
    const em = new EntityManager();
    const e = em.createEntity();
    em.addComponent<Position>(e, { type: 'position', x: 10, y: 10 });
    em.addComponent<Velocity>(e, { type: 'velocity', dx: 3, dy: -2 });

    const runner = new SystemRunner();
    runner.register('movement', (world, dt) => {
      const seconds = dt / 1000;
      for (const id of world.query('position', 'velocity')) {
        const p = world.getComponent<Position>(id, 'position')!;
        const v = world.getComponent<Velocity>(id, 'velocity')!;
        p.x += v.dx * seconds;
        p.y += v.dy * seconds;
      }
    });

    runner.run(em, 1000);
    const p = em.getComponent<Position>(e, 'position')!;
    expect(p.x).toBe(13);
    expect(p.y).toBe(8);
  });

  it('register replaces a same-named system; unregister removes', () => {
    const runner = new SystemRunner();
    const calls: string[] = [];
    runner.register('x', () => calls.push('v1'));
    runner.register('x', () => calls.push('v2'));
    runner.run(new EntityManager(), 0);
    expect(calls).toEqual(['v2']);
    expect(runner.unregister('x')).toBe(true);
    expect(runner.unregister('x')).toBe(false);
  });
});

describe('ui/layout — dock math', () => {
  it('splits a row into weighted columns', () => {
    const root = container('root', 'row', [
      { node: leaf('a', 'panel-a'), weight: 1 },
      { node: leaf('b', 'panel-b'), weight: 2 },
    ]);
    const rects = layoutDock(root, { x: 0, y: 0, width: 300, height: 100 });
    expect(rects.get('a')).toEqual({ x: 0, y: 0, width: 100, height: 100 });
    expect(rects.get('b')).toEqual({ x: 100, y: 0, width: 200, height: 100 });
  });

  it('nests columns inside rows', () => {
    const root = container('root', 'column', [
      { node: leaf('top', 'top'), weight: 1 },
      { node: container('bottom', 'row', [
        { node: leaf('bl', 'bl'), weight: 1 },
        { node: leaf('br', 'br'), weight: 1 },
      ]), weight: 1 },
    ]);
    const rects = layoutDock(root, { x: 0, y: 0, width: 200, height: 200 });
    expect(rects.get('top')).toEqual({ x: 0, y: 0, width: 200, height: 100 });
    expect(rects.get('bl')).toEqual({ x: 0, y: 100, width: 100, height: 100 });
    expect(rects.get('br')).toEqual({ x: 100, y: 100, width: 100, height: 100 });
  });

  it('collectLeafPanelIds lists all panels', () => {
    const root = simpleRowDock(['world', 'entities', 'inspector']);
    expect(collectLeafPanelIds(root)).toEqual(['world', 'entities', 'inspector']);
  });

  it('simpleRowDock keys leaves by panel id (layoutDock lookup by panel id)', () => {
    const root = simpleRowDock(['world', 'entities', 'inspector']);
    const rects = layoutDock(root, { x: 0, y: 0, width: 300, height: 100 });
    expect(rects.get('world')).toBeDefined();
    expect(rects.get('entities')).toBeDefined();
    expect(rects.get('inspector')).toBeDefined();
    expect(rects.get('world')?.width).toBe(100);
  });

  it('ignores zero/negative weights (no NaN rects)', () => {
    const root = container('root', 'row', [
      { node: leaf('a', 'a'), weight: 0 },
      { node: leaf('b', 'b'), weight: 1 },
    ]);
    const rects = layoutDock(root, { x: 0, y: 0, width: 100, height: 50 });
    expect(rects.get('b')).toEqual({ x: 0, y: 0, width: 100, height: 50 });
  });
});

describe('ui/DomUiAdapter — renders specs to DOM', () => {
  it('renders the default toolbar with 4 buttons', () => {
    const { factory } = stubFactory();
    const adapter = new DomUiAdapter({ factory });
    const node = adapter.render(defaultStudioToolbar()) as StubNode;
    expect(node.className).toBe('ui-toolbar');
    const buttons = node.children.filter((c) => c.className.startsWith('ui-button'));
    expect(buttons).toHaveLength(4);
  });

  it('renders a panel with title + nested children', () => {
    const { factory } = stubFactory();
    const adapter = new DomUiAdapter({ factory });
    const node = adapter.render({
      kind: 'panel', id: 'p1', title: 'Inspector',
      children: [{ kind: 'status', id: 's1', message: 'ok', tone: 'good' }],
    }) as StubNode;
    expect(node.attrs['data-panel-id']).toBe('p1');
    const title = node.children.find((c) => c.className === 'ui-panel__title');
    expect(title?.textContent).toBe('Inspector');
  });

  it('fires onClick for button ids', () => {
    const { factory } = stubFactory();
    const clicks: string[] = [];
    const adapter = new DomUiAdapter({ factory, onClick: (id) => clicks.push(id) });
    const node = adapter.render({ kind: 'button', id: 'save', label: 'Save' }) as StubNode;
    node.listeners['click']?.[0]();
    expect(clicks).toEqual(['save']);
  });

  it('renders an inspector with label/value rows', () => {
    const { factory } = stubFactory();
    const adapter = new DomUiAdapter({ factory });
    const node = adapter.render({
      kind: 'inspector', id: 'i1',
      fields: [{ label: 'HP', value: '110' }, { label: 'ATK', value: '90' }],
    }) as StubNode;
    const rows = node.children.filter((c) => c.className === 'ui-inspector__row');
    expect(rows).toHaveLength(2);
  });
});
