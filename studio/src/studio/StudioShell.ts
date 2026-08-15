/**
 * studio/StudioShell.ts — the Chronos Studio shell (presentation layer).
 *
 * This is the DOM half of the studio: it boots the pure engine managers
 * (EntityManager / SceneManager / ProjectManager / WorkspaceManager /
 * SystemRunner / EventBus) and renders the dockable workspace UI. All *logic*
 * (which workspace is active, which entity is selected, panel ordering) is
 * delegated to those managers; this class only projects state into the DOM and
 * reports intents back.
 *
 * It is intentionally the one place allowed to touch `document` directly.
 */
import type { EventBus } from '../engine/events/EventBus';
import type { EntityManager, Component } from '../engine/entity/EntityManager';
import type { SystemRunner } from '../engine/entity/SystemRunner';
import type { SceneManager } from '../engine/scenes/SceneManager';
import type { ProjectManager } from '../engine/projects/ProjectManager';
import type { WorkspaceManager } from '../engine/workspaces/WorkspaceManager';
import type { StudioOS } from './StudioOS';
import { layoutDock, simpleRowDock } from '../ui/layout';
import { StudioColors } from '../ui/theme';
import { SPRITE_PRESETS } from '../features/sprite-lab/presets';
import { Inspector } from '../engine/inspector/Inspector';
import { layoutEdges, layoutGraph } from '../engine/graph/GraphLayout';
import { ShortcutManager } from '../ui/systems/ShortcutManager';
import { FocusManager } from '../ui/systems/FocusManager';
import { buildTimelineSpec } from '../ui/components/timeline';

export interface StudioShellOptions {
  root: HTMLElement;
  /** The operating system the shell renders (injected, not owned). */
  os: StudioOS;
}

/** A single command-palette entry. */
export interface StudioCommand {
  id: string;
  label: string;
  run: () => void;
}

export class StudioShell {
  private readonly os: StudioOS;
  private readonly bus: EventBus;
  private readonly entities: EntityManager;
  private readonly scenes: SceneManager;
  private readonly projects: ProjectManager;
  private readonly workspaces: WorkspaceManager;
  private readonly systems: SystemRunner;

  private selectedEntity: number | null = null;
  private selectedNodeId: string | null = null;
  private readonly inspector: Inspector;
  private readonly shortcuts = new ShortcutManager();
  private readonly focus = new FocusManager();
  private eventCount = 0;

  private readonly root: HTMLElement;
  private readonly dock: HTMLElement;
  private readonly wsTabs: HTMLElement;
  private readonly palette: HTMLElement;
  private readonly paletteInput: HTMLInputElement;
  private readonly paletteList: HTMLElement;
  private readonly eventLog: HTMLElement;

  private commands: StudioCommand[] = [];
  private paletteOpen = false;

  constructor(options: StudioShellOptions) {
    this.root = options.root;
    this.os = options.os;
    // Delegate to the OS-owned systems (single source of truth).
    this.bus = this.os.bus;
    this.entities = this.os.entities;
    this.scenes = this.os.scenes;
    this.projects = this.os.projects;
    this.workspaces = this.os.workspaces;
    this.systems = this.os.systems;

    this.dock = this.q('#dock');
    this.wsTabs = this.q('#ws-tabs');
    this.palette = this.q('#palette');
    this.paletteInput = this.q<HTMLInputElement>('#palette-input');
    this.paletteList = this.q('#palette-list');
    this.eventLog = this.mk('div');
    this.eventLog.id = 'event-log';
    this.inspector = new Inspector({ entities: this.entities, graph: this.os.graph, assets: this.os.assets });

    // Seed starter entities into the OS's bootstrapped scene (hierarchy demo).
    const scene = this.scenes.active;
    if (scene) {
      const player = this.entities.createEntity();
      this.entities.addComponent(player, { type: 'transform', x: 3, y: 3 });
      this.entities.addComponent(player, { type: 'sprite', asset: 'sprites/player.png' });
      this.entities.addComponent(player, { type: 'player', name: 'Traveler' });
      this.scenes.addEntity(scene.id, player);
      const npc = this.entities.createEntity();
      this.entities.addComponent(npc, { type: 'transform', x: 12, y: 8 });
      this.entities.addComponent(npc, { type: 'npc', name: '@Flippy' });
      this.scenes.addEntity(scene.id, npc);
    }

    // Register a demo movement system (proves the SystemRunner works live).
    this.systems.register('npc-wander', (world, dt) => {
      const seconds = dt / 1000;
      for (const id of world.query('transform', 'npc')) {
        const t = world.getComponent<{ x: number; y: number } & Component>(id, 'transform');
        if (t) t.x = Number((t.x + 0.01 * seconds).toFixed(3));
      }
    });

    // Wire the event bus to the log + status bar (observability demo).
    this.wireObservability();

    this.buildCommands();
    this.bindUi();
    this.render();
  }

  // --- DOM helpers -----------------------------------------------------------

  private q<T extends HTMLElement = HTMLElement>(sel: string): T {
    const el = this.root.querySelector<T>(sel);
    if (!el) throw new Error(`Missing element: ${sel}`);
    return el;
  }

  private mk(tag: string, className = ''): HTMLElement {
    const el = document.createElement(tag);
    if (className) el.className = className;
    return el;
  }

  // --- Observability ---------------------------------------------------------

  private wireObservability(): void {
    const log = (msg: string) => {
      this.eventCount += 1;
      this.q('#sb-events').textContent = String(this.eventCount);
      const row = this.mk('div', 'ev');
      row.innerHTML = msg;
      this.eventLog.prepend(row);
      while (this.eventLog.children.length > 50) this.eventLog.lastElementChild?.remove();
    };
    const on = (event: string, label: string) => {
      this.bus.on<unknown>(event, () => log(`<b>${label}</b>`));
    };
    on('project:created', 'project:created');
    on('project:opened', 'project:opened');
    on('scene:entity-added', 'scene:entity-added');
    on('editor:selection-changed', 'editor:selection-changed');
    on('map:modified', 'map:modified');
    on('asset:imported', 'asset:imported');
  }

  // --- Command palette -------------------------------------------------------

  private buildCommands(): void {
    const cmd = (id: string, label: string, run: () => void): StudioCommand => ({ id, label, run });

    this.commands = [
      cmd('new-entity', '➕ New Entity', () => this.createEntity()),
      cmd('new-scene', '🗺️ New Scene', () => this.createScene()),
      cmd('new-project', '📁 New Project', () => this.createProject()),
      cmd('run-systems', '▶ Run Systems (1 frame)', () => this.runSystems()),
      cmd('save-project', '💾 Save Project (serialize)', () => this.saveProject()),
      ...this.workspaces.list().map((ws) => cmd(`ws-${ws.id}`, `Workspace: ${ws.name}`, () => this.setWorkspace(ws.id))),
    ];
  }

  private openPalette(): void {
    this.paletteOpen = true;
    this.palette.classList.add('open');
    this.paletteInput.value = '';
    this.renderPalette('');
    this.paletteInput.focus();
  }

  private closePalette(): void {
    this.paletteOpen = false;
    this.palette.classList.remove('open');
  }

  private renderPalette(query: string): void {
    this.paletteList.replaceChildren();
    const q = query.trim().toLowerCase();

    // 1. Studio commands (local actions).
    const matches = this.commands.filter((c) => c.label.toLowerCase().includes(q));
    for (const cmd of matches) {
      const row = this.mk('div', 'cmd');
      row.innerHTML = `<b>⌘</b> ${cmd.label}`;
      row.addEventListener('click', () => {
        cmd.run();
        this.closePalette();
      });
      this.paletteList.appendChild(row);
    }

    // 2. Universal search across the project graph / assets / entities / settings.
    const results = this.os.search.search(query, 15);
    for (const result of results) {
      const row = this.mk('div', 'cmd');
      const icon = result.source === 'asset' ? '▦' : result.source === 'entity' ? '◉' : result.source === 'node' ? '◆' : result.source === 'setting' ? '⚙' : '·';
      row.innerHTML = `${icon} <span class="muted">${result.source}</span> ${result.title} <span class="muted">· ${result.subtitle}</span>`;
      row.addEventListener('click', () => {
        this.paletteResultAction(result);
        this.closePalette();
      });
      this.paletteList.appendChild(row);
    }

    if (this.paletteList.children.length === 0) {
      const empty = this.mk('div', 'cmd');
      empty.textContent = 'No matches.';
      this.paletteList.appendChild(empty);
    }
  }

  /** Handle a universal-search result (navigate/select). */
  private paletteResultAction(result: { source: string; id: string; action?: string }): void {
    if (result.source === 'entity' && result.action) {
      this.selectEntity(Number(result.action));
      this.bus.emit('editor:selection-changed', { targetId: result.action, targetType: 'entity' });
    } else if (result.source === 'asset') {
      this.bus.emit('asset:imported', { id: result.id, type: 'sprite', name: result.id });
    } else if (result.source === 'node') {
      this.bus.emit('map:loaded', { bounds: { minX: -22, maxX: 116, minY: 0, maxY: 95 } });
    }
    this.render();
  }

  // --- Intents (delegate to the pure managers) --------------------------------

  private createEntity(): void {
    const id = this.os.entityEditor.create(0, 0);
    const scene = this.scenes.active;
    if (scene) this.scenes.addEntity(scene.id, id);
    this.selectedEntity = id;
    this.bus.emit('scene:entity-added', { sceneId: scene?.id ?? '', entityId: id });
    this.render();
  }

  private createScene(): void {
    const scene = this.scenes.createScene(`Scene ${this.scenes.list().length + 1}`);
    this.projects.addSceneToOpen(scene.id);
    this.os.graphEditor.addNode({ id: scene.id, kind: 'map', name: scene.name });
    this.bus.emit('scene:loaded', { sceneId: scene.id });
    this.render();
  }

  private createProject(): void {
    const p = this.projects.createProject(`Project ${this.projects.list().length + 1}`);
    this.scenes.createScene('Main');
    const scene = this.scenes.active;
    if (scene) this.projects.addSceneToOpen(scene.id);
    this.bus.emit('project:created', { id: p.id, name: p.name });
    this.render();
  }

  private runSystems(): void {
    const report = this.systems.run(this.entities, 16);
    this.bus.emit('map:modified', { bounds: { minX: -22, maxX: 116, minY: 0, maxY: 95 } });
    void report;
    this.render();
  }

  private saveProject(): void {
    const snap = this.projects.serializeOpen();
    this.bus.emit('project:saved', { id: snap?.id ?? '', name: snap?.name ?? '' });
    // Serialize to console (a real backend would persist here).
    console.info('[studio] project snapshot', snap);
    this.render();
  }

  private setWorkspace(id: string): void {
    this.workspaces.setActive(id);
    this.bus.emit('workspace:activated', { workspaceId: id });
    this.render();
  }

  private undo(): void {
    if (this.os.commands.undo({ world: this.entities })) {
      this.bus.emit('editor:history-snapshot', {});
      this.render();
    }
  }

  private redo(): void {
    if (this.os.commands.redo({ world: this.entities })) {
      this.bus.emit('editor:history-snapshot', {});
      this.render();
    }
  }

  private selectEntity(id: number): void {
    this.selectedEntity = id;
    this.selectedNodeId = null;
    this.bus.emit('editor:selection-changed', { targetId: String(id), targetType: 'entity' });
    this.render();
  }

  // --- Rendering -------------------------------------------------------------

  private render(): void {
    this.renderWorkspaceTabs();
    this.renderDock();
    this.renderStatus();
  }

  private renderWorkspaceTabs(): void {
    this.wsTabs.replaceChildren();
    for (const ws of this.workspaces.list()) {
      const btn = this.mk('button', `ws-tab${this.workspaces.active?.id === ws.id ? ' active' : ''}`);
      btn.textContent = ws.name.toUpperCase();
      btn.addEventListener('click', () => this.setWorkspace(ws.id));
      this.wsTabs.appendChild(btn);
    }
  }

  private renderDock(): void {
    this.dock.replaceChildren();
    const ws = this.workspaces.active;
    if (!ws) return;

    // Dock layout: first panel 1/3 width, remaining 2/3 split into two.
    const panelIds = ws.panels.map((p) => p.id);
    const dockRoot = simpleRowDock(panelIds);
    const rects = layoutDock(dockRoot, { x: 0, y: 0, width: this.dock.clientWidth || 900, height: this.dock.clientHeight || 500 });

    for (const panel of ws.panels) {
      const rect = rects.get(panel.id);
      if (!rect) continue;
      const el = this.mk('section', 'dock-panel');
      el.style.left = `${rect.x}px`;
      el.style.top = `${rect.y}px`;
      el.style.width = `${rect.width}px`;
      el.style.height = `${rect.height}px`;
      el.style.borderColor = panel.active ? StudioColors.green : StudioColors.borderStrong;

      const header = this.mk('header');
      header.textContent = panel.title.toUpperCase();
      el.appendChild(header);

      const body = this.mk('div', 'panel-body');
      this.renderPanelBody(panel.type, body);
      el.appendChild(body);

      this.dock.appendChild(el);
    }
  }

  private renderPanelBody(type: string, body: HTMLElement): void {
    switch (type) {
      case 'hierarchy':
      case 'entities':
        this.renderHierarchy(body);
        break;
      case 'inspector':
        this.renderInspector(body);
        break;
      case 'project-graph':
      case 'graph':
        this.renderProjectGraph(body);
        break;
      case 'asset-browser':
      case 'sprites':
        this.renderAssetBrowser(body);
        break;
      case 'console':
      case 'audit':
      case 'history':
      case 'commands':
        this.renderConsole(body);
        break;
      case 'timeline':
        this.renderTimeline(body);
        break;
      case 'notifications':
        this.renderNotifications(body);
        break;
      case 'wallet':
      case 'economy':
        this.renderEconomy(body);
        break;
      default:
        this.renderGeneric(body, type);
    }
  }

  private renderHierarchy(body: HTMLElement): void {
    const add = this.mk('button', 'ui-button');
    add.textContent = '➕ ADD ENTITY';
    add.addEventListener('click', () => this.createEntity());
    body.appendChild(add);
    body.appendChild(this.mk('div')); // spacer
    for (const id of this.entities.entityIds()) {
      const row = this.mk('div', `row${this.selectedEntity === id ? ' selected' : ''}`);
      const comps = this.entities.getComponents(id).map((c) => c.type);
      row.innerHTML = `<span class="id">#${id}</span> <span>${comps.find((c) => c === 'player' || c === 'npc') || 'entity'}</span> <span class="tags">${comps.join(' · ')}</span>`;
      row.addEventListener('click', () => this.selectEntity(id));
      body.appendChild(row);
    }
  }

  private renderInspector(body: HTMLElement): void {
    // Prefer a selected graph node, else a selected entity, else empty state.
    const selection = this.selectedNodeId
      ? ({ kind: 'node', id: this.selectedNodeId } as const)
      : this.selectedEntity !== null
        ? ({ kind: 'entity', id: this.selectedEntity } as const)
        : null;

    const spec = this.inspector.inspect(selection);
    if (!spec) {
      body.appendChild(this.status('info', 'Select an entity or graph node to inspect.'));
      return;
    }
    const title = this.mk('div', 'field');
    title.innerHTML = `<span class="k">${spec.subtitle}</span><span class="v teal">${spec.title}</span>`;
    body.appendChild(title);
    for (const section of spec.sections) {
      const h = this.mk('div', 'field');
      h.innerHTML = `<span class="k">▸ ${section.title}</span>`;
      body.appendChild(h);
      if (section.fields.length === 0) {
        const empty = this.mk('div', 'field');
        empty.innerHTML = `<span class="v">—</span>`;
        body.appendChild(empty);
        continue;
      }
      for (const field of section.fields) {
        const row = this.mk('div', 'field');
        const vcls = field.tone === 'gold' ? 'v' : field.tone === 'danger' ? 'v' : 'v teal';
        row.innerHTML = `<span class="k">${field.label}</span><span class="${vcls}">${field.value}</span>`;
        body.appendChild(row);
      }
    }
  }

  private renderProjectGraph(body: HTMLElement): void {
    const { positions, width, height } = layoutGraph(this.os.graph, { layerSpacing: 220, nodeSpacing: 60 });
    const edges = layoutEdges(this.os.graph, positions);
    if (positions.length === 0) {
      body.appendChild(this.status('info', 'The project graph is empty. Create a project + scene first.'));
      return;
    }
    const canvas = this.mk('div', 'graph-canvas');
    canvas.style.position = 'relative';
    canvas.style.width = `${Math.max(width, 400)}px`;
    canvas.style.height = `${Math.max(height + 60, 200)}px`;
    canvas.style.overflow = 'auto';

    // Edges (SVG lines).
    if (edges.length) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', String(Math.max(width, 400)));
      svg.setAttribute('height', String(Math.max(height + 60, 200)));
      svg.style.position = 'absolute';
      svg.style.inset = '0';
      svg.style.pointerEvents = 'none';
      for (const edge of edges) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(edge.x1 + 80));
        line.setAttribute('y1', String(edge.y1 + 20));
        line.setAttribute('x2', String(edge.x2 + 80));
        line.setAttribute('y2', String(edge.y2 + 20));
        line.setAttribute('stroke', StudioColors.border);
        line.setAttribute('stroke-width', '2');
        svg.appendChild(line);
      }
      canvas.appendChild(svg);
    }

    // Nodes.
    for (const pos of positions) {
      const node = this.mk('div', 'graph-node');
      node.style.position = 'absolute';
      node.style.left = `${pos.x}px`;
      node.style.top = `${pos.y}px`;
      node.style.width = '160px';
      node.style.minHeight = '40px';
      node.style.background = this.selectedNodeId === pos.node.id ? '#1f3d2f' : StudioColors.glassDeep;
      node.style.border = `1px solid ${this.selectedNodeId === pos.node.id ? StudioColors.green : StudioColors.border}`;
      node.style.borderRadius = '6px';
      node.style.padding = '6px 10px';
      node.style.cursor = 'pointer';
      node.style.display = 'flex';
      node.style.flexDirection = 'column';
      node.style.gap = '2px';
      node.innerHTML = `<span style="color:${StudioColors.gold}; font-weight:700; font-size:11px;">${pos.node.name}</span><span style="color:${StudioColors.teal}; font-size:9px;">${pos.node.kind}</span>`;
      node.addEventListener('click', () => this.selectGraphNode(pos.node.id));
      canvas.appendChild(node);
    }

    body.appendChild(canvas);
  }

  private selectGraphNode(id: string): void {
    this.selectedNodeId = id;
    this.selectedEntity = null;
    this.bus.emit('editor:selection-changed', { targetId: id, targetType: 'graph-node' });
    this.render();
  }

  private renderAssetBrowser(body: HTMLElement): void {
    const groups = new Set(SPRITE_PRESETS.map((p) => p.group));
    for (const group of groups) {
      const h = this.mk('div', 'field');
      h.innerHTML = `<span class="k">${group.toUpperCase()}</span>`;
      body.appendChild(h);
      for (const preset of SPRITE_PRESETS.filter((p) => p.group === group)) {
        const row = this.mk('div', 'row');
        row.innerHTML = `<span class="id">▦</span> <span>${preset.label}</span> <span class="tags">${preset.value}</span>`;
        row.addEventListener('click', () => this.bus.emit('asset:imported', { id: preset.value, type: 'sprite', name: preset.label }));
        body.appendChild(row);
      }
    }
  }

  private renderConsole(body: HTMLElement): void {
    // Command log (undo/redo history) + event monitor + profiler, all live.
    const log = this.mk('div', 'field');
    log.innerHTML = `<span class="k">▸ Command Log</span>`;
    body.appendChild(log);
    const commands = this.os.commandLog.all().slice(-20);
    if (commands.length === 0) {
      body.appendChild(this.status('info', 'No commands executed yet. Ctrl+Z/Ctrl+Shift+Z to undo/redo.'));
    } else {
      for (const entry of commands) {
        const row = this.mk('div', 'field');
        row.innerHTML = `<span class="k">${entry.direction === 'execute' ? '▶' : entry.direction === 'undo' ? '↶' : '↷'} ${entry.label}</span>`;
        body.appendChild(row);
      }
    }

    const events = this.mk('div', 'field');
    events.innerHTML = `<span class="k">▸ Event Monitor (${this.os.eventMonitor.all().length})</span>`;
    body.appendChild(events);
    for (const rec of this.os.eventMonitor.all().slice(-15)) {
      const row = this.mk('div', 'field');
      row.innerHTML = `<span class="k">${rec.event}</span>`;
      body.appendChild(row);
    }

    const prof = this.mk('div', 'field');
    prof.innerHTML = `<span class="k">▸ Profiler</span>`;
    body.appendChild(prof);
    for (const stat of this.os.profiler.stats()) {
      const row = this.mk('div', 'field');
      row.innerHTML = `<span class="k">${stat.phase}</span><span class="v">${stat.avg.toFixed(2)}ms avg (${stat.count})</span>`;
      body.appendChild(row);
    }
  }

  private renderTimeline(body: HTMLElement): void {
    const spec = buildTimelineSpec(this.os.animationTimeline);
    const addBtn = this.mk('button', 'ui-button');
    addBtn.textContent = '➕ ADD KEYFRAME';
    addBtn.addEventListener('click', () => {
      for (const track of this.os.animationTimeline.tracks) {
        const idx = track.keyframes.length;
        this.os.animationTimeline.tracks = this.os.animationTimeline.tracks.map((t) =>
          t.id === track.id
            ? { ...t, keyframes: [...t.keyframes, { id: `k-${Date.now()}-${idx}`, frameIndex: idx, durationMs: 125 }] }
            : t,
        );
      }
      this.render();
    });
    body.appendChild(addBtn);
    body.appendChild(this.mk('div'));
    for (const lane of spec.lanes) {
      const laneHeader = this.mk('div', 'field');
      laneHeader.innerHTML = `<span class="k">▸ ${lane.name}</span><span class="v">${lane.keyframes.length} frames</span>`;
      body.appendChild(laneHeader);
      const laneEl = this.mk('div');
      laneEl.style.cssText = 'display:flex; gap:2px; margin:2px 0 6px;';
      for (const kf of lane.keyframes) {
        const block = this.mk('div');
        block.style.cssText = `flex:${kf.widthMs}; min-width:18px; height:22px; background:${StudioColors.glassDeep}; border:1px solid ${StudioColors.border}; border-radius:3px; display:flex; align-items:center; justify-content:center; font-size:9px; color:${StudioColors.teal};`;
        block.textContent = String(kf.frameIndex);
        laneEl.appendChild(block);
      }
      body.appendChild(laneEl);
    }
    const duration = this.mk('div', 'field');
    duration.innerHTML = `<span class="k">Duration</span><span class="v teal">${spec.durationMs}ms · playhead ${spec.playheadMs}ms</span>`;
    body.appendChild(duration);
  }

  private renderNotifications(body: HTMLElement): void {
    const nc = this.os.notifications;
    const pushBtn = this.mk('button', 'ui-button');
    pushBtn.textContent = '➕ PUSH TEST NOTIFICATION';
    pushBtn.addEventListener('click', () => {
      nc.push(`n-${Date.now()}`, 'info', `Studio event at ${Date.now()}`, Date.now());
      this.render();
    });
    body.appendChild(pushBtn);
    body.appendChild(this.mk('div'));

    if (nc.snapshot.items.length === 0) {
      body.appendChild(this.status('info', 'No notifications.'));
      return;
    }
    for (const n of nc.snapshot.items) {
      const row = this.mk('div', 'field');
      row.innerHTML = `<span class="k">${n.read ? '✓' : '•'} ${n.severity}</span><span class="v">${n.message}</span>`;
      body.appendChild(row);
    }
    const unread = this.mk('div', 'field');
    unread.innerHTML = `<span class="k">Unread</span><span class="v teal">${nc.unread}</span>`;
    body.appendChild(unread);
  }

  private renderEconomy(body: HTMLElement): void {
    const wallet = this.mk('div', 'field');
    wallet.innerHTML = `<span class="k">Wallet</span><span class="v teal">not connected</span>`;
    body.appendChild(wallet);
    const chips = this.mk('div', 'field');
    chips.innerHTML = `<span class="k">Demo Chips</span><span class="v">1,000</span>`;
    body.appendChild(chips);
    const xp = this.mk('div', 'field');
    xp.innerHTML = `<span class="k">Flipsuite XP</span><span class="v">0</span>`;
    body.appendChild(xp);
    body.appendChild(this.status('info', 'Token Launch + Casino features mount here in the full build.'));
  }

  private renderGeneric(body: HTMLElement, type: string): void {
    body.appendChild(this.status('info', `Panel "${type}" — content mounts here.`));
  }

  private status(tone: 'info' | 'good' | 'error', message: string): HTMLElement {
    const el = this.mk('div', `ui-status ui-status--${tone}`);
    el.textContent = message;
    return el;
  }

  private renderStatus(): void {
    const project = this.projects.current;
    const scene = this.scenes.active;
    this.q('#sb-project').textContent = project?.name ?? '—';
    this.q('#sb-scene').textContent = scene?.name ?? '—';
    this.q('#sb-entities').textContent = String(this.entities.count);
    this.q('#project-name').textContent = project ? `${project.name} · ${project.settings.author || 'no author'}` : 'no project';
  }

  // --- UI binding ------------------------------------------------------------

  private bindUi(): void {
    // Register shortcuts through the ShortcutManager (single source of truth).
    this.shortcuts.register({ id: 'command-palette', key: 'k', ctrl: true, scope: 'global' });
    this.shortcuts.register({ id: 'close-overlay', key: 'Escape', scope: 'global' });
    this.shortcuts.register({ id: 'undo', key: 'z', ctrl: true, scope: 'global' });
    this.shortcuts.register({ id: 'redo', key: 'z', ctrl: true, shift: true, scope: 'global' });

    window.addEventListener('keydown', (e) => {
      const action = this.shortcuts.resolve(e);
      if (action === 'command-palette') {
        e.preventDefault();
        this.paletteOpen ? this.closePalette() : this.openPalette();
      } else if (action === 'close-overlay' && this.paletteOpen) {
        this.closePalette();
      } else if (action === 'undo') {
        e.preventDefault();
        this.undo();
      } else if (action === 'redo') {
        e.preventDefault();
        this.redo();
      }
    });
    this.paletteInput.addEventListener('input', () => this.renderPalette(this.paletteInput.value));
    this.paletteInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const first = this.paletteList.querySelector('.cmd');
        if (first) (first as HTMLElement).click();
      }
    });
    // Focus tracking (the shell records where keyboard focus moves).
    this.paletteInput.addEventListener('focus', () => this.focus.focus({ id: 'palette-input', scope: 'palette' }));
    // Recompute dock on resize.
    window.addEventListener('resize', () => this.render());
  }

  /** Start the studio (also kicks the demo system loop). */
  start(): void {
    // A lightweight tick so the NPC wander system visibly runs.
    window.setInterval(() => {
      this.systems.run(this.entities, 16);
      if (this.workspaces.active?.panels.some((p) => p.type === 'hierarchy')) {
        this.renderDock();
      }
    }, 1000);
  }
}
