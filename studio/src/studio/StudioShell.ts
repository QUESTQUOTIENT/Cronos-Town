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
import type { CommandContext } from '../engine/commands/Command';
import type { EntityManager, Component } from '../engine/entity/EntityManager';
import type { SystemRunner } from '../engine/entity/SystemRunner';
import type { SceneManager } from '../engine/scenes/SceneManager';
import type { ProjectManager } from '../engine/projects/ProjectManager';
import type { WorkspaceManager } from '../engine/workspaces/WorkspaceManager';
import type { StudioOS } from './StudioOS';
import type { StudioObject, StudioObjectKind, StudioProject, StudioProjectSnapshot } from '../engine/projects/StudioProject';
import { getStudioSchema, validateStudioObject } from '../engine/projects/StudioSchemas';
import { layoutDock, simpleRowDock } from '../ui/layout';
import { StudioColors } from '../ui/theme';
import { SPRITE_PRESETS } from '../features/sprite-lab/presets';
import { Inspector } from '../engine/inspector/Inspector';
import { layoutEdges, layoutGraph } from '../engine/graph/GraphLayout';
import { transactionGraphOverlays } from '../engine/graph/GraphOverlays';
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
  private selectedStudioObjectId: string | null = null;
  private creatorStep = 0;
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
    this.inspector = new Inspector({ entities: this.entities, graph: this.os.graph, assets: this.os.assets, studioProject: this.os.studioProject, runtimeSession: this.os.runtimeSession });

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
    const context: CommandContext & { studioProject: StudioProject } = { world: this.entities, studioProject: this.os.studioProject };
    if (this.os.commands.undo(context)) {
      this.bus.emit('editor:history-snapshot', {});
      this.render();
    }
  }

  private redo(): void {
    const context: CommandContext & { studioProject: StudioProject } = { world: this.entities, studioProject: this.os.studioProject };
    if (this.os.commands.redo(context)) {
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
      case 'canvas':
        this.renderUiCanvas(body);
        break;
      case 'layers':
        this.renderUiLayers(body);
        break;
      case 'nft-pipeline':
        this.renderNftPipeline(body);
        break;
      case 'story-graph':
        this.renderStoryGraph(body);
        break;
      case 'token':
        this.renderTokenEconomyBuilder(body);
        break;
      case 'audio':
        this.renderAudioStudio(body);
        break;
      case 'notifications':
        this.renderNotifications(body);
        break;
      case 'wallet':
      case 'economy':
        this.renderEconomy(body);
        break;
      case 'creator-workspace':
        this.renderCreatorWorkspace(body);
        break;
      case 'studio-objects':
        this.renderStudioObjects(body);
        break;
      case 'studio-object-editor':
        this.renderStudioObjectEditor(body);
        break;
      case 'network-manager':
        this.renderNetworkManager(body);
        break;
      case 'project-export':
        this.renderProjectExport(body);
        break;
      case 'transaction-center':
        this.renderTransactionCenter(body);
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
    const latestTransaction = this.os.transactions.all().slice(-1)[0];
    const overlays = latestTransaction ? new Map(transactionGraphOverlays(this.os.graph, latestTransaction).map((overlay) => [overlay.nodeId, overlay])) : new Map();
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
      const overlay = overlays.get(pos.node.id);
      const overlayColors: Record<string, string> = { preview: '#24507a', added: '#1f5a3a', removed: '#6a3030', narrative: '#5b3b76', economy: '#6f5b1c', blockchain: '#24507a', ui: '#235a60', audio: '#4b3d70', ai: '#5a405a', world: '#375b39', runtime: '#3f4e67', export: '#66523d' };
      node.style.background = this.selectedNodeId === pos.node.id ? '#1f3d2f' : (overlay ? overlayColors[overlay.tone] : StudioColors.glassDeep);
      node.style.border = `1px solid ${this.selectedNodeId === pos.node.id ? StudioColors.green : (overlay ? StudioColors.gold : StudioColors.border)}`;
      if (overlay) node.title = overlay.label;
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

    const transactions = this.mk('div', 'field');
    transactions.innerHTML = `<span class="k">▸ Governed Transactions</span><span class="v teal">${this.os.transactions.all().length}</span>`;
    body.appendChild(transactions);
    for (const tx of this.os.transactions.all().slice(-8).reverse()) {
      const row = this.mk('div', 'field');
      row.innerHTML = `<span class="k">${tx.state.toUpperCase()} · ${tx.title}</span><span class="v">${tx.branch} · ${tx.intent}</span>`;
      body.appendChild(row);
    }
    const revisions = this.os.transactions.revisionsList();
    if (revisions.length) body.appendChild(this.status('good', `Active revision: ${revisions[revisions.length - 1].id} · branch ${revisions[revisions.length - 1].branch}`));

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

  /** Single entry point for creator workflows; all destinations use the same object graph. */
  private renderCreatorWorkspace(body: HTMLElement): void {
    body.appendChild(this.status('good', 'CREATOR WORKSPACE · schema objects, governed transactions, runtime sessions, graph, and deterministic export.'));
    const steps = ['Create world', 'Create first NPC', 'Create first quest', 'Choose network', 'Add token', 'Import NFT collection', 'Design UI', 'Add audio zone', 'Simulate', 'Export'];
    const guide = this.mk('button', 'ui-button');
    guide.textContent = this.creatorStep === 0 ? 'START CREATOR MODE' : `CREATOR MODE · ${this.creatorStep}/${steps.length}: ${steps[this.creatorStep - 1]}`;
    guide.addEventListener('click', () => {
      if (this.creatorStep === 0) { this.creatorStep = 1; }
      else if (this.creatorStep === 1 && !this.os.studioProject.get('world-main')) this.saveSchemaTransaction({ id: 'world-main', kind: 'world', name: 'My World', data: { weather: 'clear' }, references: [] });
      else this.creatorStep = Math.min(steps.length, this.creatorStep + 1);
      this.render();
    });
    body.appendChild(guide);
    if (this.creatorStep > 0) body.appendChild(this.status('info', `Next: ${steps[this.creatorStep - 1] ?? 'Project ready to export'}. Creator Mode creates governed StudioObjects and routes you to the relevant workspace.`));
    const routes: Array<[string, string, string]> = [
      ['WORLD', 'game-design', 'World, tiles, scenes, and graph'], ['STORY', 'game-design', 'Narrative graph and quests'],
      ['NPCS', 'game-design', 'NPC objects and runtime state'], ['UI', 'ui-design', 'Visual canvas and UI components'],
      ['AUDIO', 'assets', 'Audio zones and assets'], ['BLOCKCHAIN', 'game-design', 'Network manager and identities'],
      ['ECONOMY', 'economy', 'Tokens and propagation'], ['NFTS', 'assets', 'NFT character pipeline'],
      ['AI', 'ai', 'Agents and automation'], ['RUNTIME', 'scripting', 'Session, events, and reflection'],
      ['TRANSACTIONS', 'game-design', 'Preview, approval, revisions'], ['GRAPH', 'game-design', 'Dependencies and effects'], ['EXPORT', 'game-design', 'Committed project export'],
    ];
    for (const [label, workspace, detail] of routes) {
      const button = this.mk('button', 'ui-button'); button.textContent = `${label} · ${detail}`; button.style.width = '100%'; button.style.marginBottom = '4px';
      button.addEventListener('click', () => { this.setWorkspace(workspace); }); body.appendChild(button);
    }
    const session = this.os.runtimeSession.snapshot();
    body.appendChild(this.status('info', `Runtime session ${session.id} · branch ${session.branch} · revision ${session.revision ?? 'uncommitted'} · ${session.effects.length} effect(s).`));
  }

  /** The creator surface: all authored runtime objects live in StudioProject. */
  private renderStudioObjects(body: HTMLElement): void {
    const kinds: StudioObjectKind[] = ['ui', 'ui-component', 'npc', 'story', 'dialogue', 'cutscene', 'quest', 'world', 'tile', 'world-state', 'network', 'token', 'economy', 'wallet', 'marketplace', 'nft-collection', 'character', 'audio', 'sound-zone', 'ai-agent', 'automation'];
    const create = this.mk('select') as HTMLSelectElement;
    for (const kind of kinds) {
      const option = document.createElement('option');
      option.value = kind;
      option.textContent = `New ${kind}`;
      create.appendChild(option);
    }
    const add = this.mk('button', 'ui-button');
    add.textContent = '➕ CREATE OBJECT';
    add.addEventListener('click', () => {
      const kind = create.value as StudioObjectKind;
      const id = `${kind}-${Date.now()}`;
      const data: Record<string, unknown> = kind === 'npc'
        ? { sprite: 'sprite-player', dialogue: [], schedule: [], relationships: [], personality: 'friendly' }
        : kind === 'ui' ? { layout: 'gba-20x14', components: [], theme: 'gba-dark' }
          : kind === 'audio' ? { music: '', ambience: '', volumeGroup: 'world', triggers: [] }
            : kind === 'quest' ? { objectives: [], rewards: [], consequences: [] } : {};
      this.os.studioEditor.save({ id, kind, name: `New ${kind}`, data, references: [] });
      this.selectedStudioObjectId = id;
      this.selectedNodeId = id;
      this.bus.emit('studio:object-created', { id, kind });
      this.render();
    });
    body.append(create, add);
    const objects = this.os.studioProject.list();
    if (!objects.length) body.appendChild(this.status('info', 'Create a UI, NPC, quest, network, token, audio zone, or any other runtime object.'));
    for (const object of objects) {
      const row = this.mk('div', `row${this.selectedStudioObjectId === object.id ? ' selected' : ''}`);
      row.textContent = `${object.kind.toUpperCase()}  ${object.name}`;
      row.title = object.id;
      row.addEventListener('click', () => {
        this.selectedStudioObjectId = object.id;
        this.selectedNodeId = object.id;
        this.selectedEntity = null;
        this.bus.emit('editor:selection-changed', { targetId: object.id, targetType: 'studio-object' });
        this.render();
      });
      body.appendChild(row);
    }
  }

  private renderStudioObjectEditor(body: HTMLElement): void {
    const object = this.selectedStudioObjectId ? this.os.studioProject.get(this.selectedStudioObjectId) : undefined;
    if (!object) {
      body.appendChild(this.status('info', 'Select an object from Universal Objects. The same object is used by runtime, graph, and export.'));
      return;
    }
    if (object.kind === 'npc') {
      this.renderNpcCreator(body, object);
      return;
    }
    this.renderSchemaObjectEditor(body, object);
  }

  private renderNetworkManager(body: HTMLElement): void {
    body.appendChild(this.status('info', 'Select a chain and save once. Tokens, economies, quests, shops, and wallet UI reference this network object.'));
    const network = this.mk('select') as HTMLSelectElement;
    const presets = [
      ['Cronos Mainnet', '25', 'https://evm.cronos.org', 'CRO'], ['Ethereum', '1', 'https://ethereum-rpc.publicnode.com', 'ETH'],
      ['Base', '8453', 'https://mainnet.base.org', 'ETH'], ['Arbitrum One', '42161', 'https://arb1.arbitrum.io/rpc', 'ETH'],
      ['Polygon', '137', 'https://polygon-rpc.com', 'POL'], ['BNB Chain', '56', 'https://bsc-dataseed.binance.org', 'BNB'],
      ['Avalanche C-Chain', '43114', 'https://api.avax.network/ext/bc/C/rpc', 'AVAX'], ['Solana', '101', 'https://api.mainnet-beta.solana.com', 'SOL'],
      ['XLM / Stellar', '148', 'https://horizon.stellar.org', 'XLM'], ['Robinhood Chain', '46630', 'https://rpc.chain.robinhood.com', 'ETH'], ['Custom RPC', '', '', ''],
    ];
    for (const preset of presets) { const option = document.createElement('option'); option.value = preset.join('|'); option.textContent = preset[0]; network.appendChild(option); }
    const chainId = this.mk('input') as HTMLInputElement;
    const rpc = this.mk('input') as HTMLInputElement;
    const currency = this.mk('input') as HTMLInputElement;
    const fill = () => { const [, id, url, token] = network.value.split('|'); chainId.value = id; rpc.value = url; currency.value = token; };
    network.addEventListener('change', fill); fill();
    const save = this.mk('button', 'ui-button');
    save.textContent = 'SAVE NETWORK';
    save.addEventListener('click', () => {
      try {
        const id = `network-${network.options[network.selectedIndex].textContent!.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        this.os.studioEditor.configureNetwork(id, network.options[network.selectedIndex].textContent!, { chainId: Number(chainId.value), rpcUrl: rpc.value, currency: currency.value, gasToken: currency.value });
        this.selectedStudioObjectId = id; this.selectedNodeId = id; this.render();
      } catch (error) { body.appendChild(this.status('error', error instanceof Error ? error.message : 'Could not save network.')); }
    });
    body.append(network, this.labeled('CHAIN ID', chainId), this.labeled('RPC URL', rpc), this.labeled('CURRENCY / GAS TOKEN', currency), save);
  }

  private renderProjectExport(body: HTMLElement): void {
    body.appendChild(this.status('good', `${this.os.studioProject.list().length} canonical objects will travel with this export.`));
    const exportButton = this.mk('button', 'ui-button');
    exportButton.textContent = 'EXPORT FULL PROJECT ZIP';
    exportButton.addEventListener('click', async () => {
      exportButton.setAttribute('disabled', 'true');
      exportButton.textContent = 'BUILDING ZIP…';
      try {
        const response = await fetch('/api/export-project', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studioProject: this.os.snapshot().studio }),
        });
        const result = await response.json() as { downloadUrl?: string; error?: string };
        if (!response.ok || !result.downloadUrl) throw new Error(result.error ?? 'Export failed.');
        const link = document.createElement('a'); link.href = result.downloadUrl; link.download = ''; link.click();
        body.appendChild(this.status('good', 'Project ZIP created with studio/project.json included.'));
      } catch (error) {
        body.appendChild(this.status('error', error instanceof Error ? error.message : 'Export failed. Start the Chronos backend and try again.'));
      } finally {
        exportButton.removeAttribute('disabled');
        exportButton.textContent = 'EXPORT FULL PROJECT ZIP';
      }
    });
    body.appendChild(exportButton);
    const importer = this.mk('input') as HTMLInputElement;
    importer.type = 'file'; importer.accept = 'application/json,.json';
    importer.addEventListener('change', async () => {
      const file = importer.files?.[0];
      if (!file) return;
      try {
        const parsed = JSON.parse(await file.text()) as { studio?: unknown; format?: string; version?: number; objects?: unknown[] };
        const snapshot = parsed.studio ?? parsed;
        if (!snapshot || typeof snapshot !== 'object') throw new Error('No StudioObject snapshot found.');
        this.os.studioProject.restore(snapshot as StudioProjectSnapshot);
        this.os.commands.clear();
        this.selectedStudioObjectId = null; this.selectedNodeId = null;
        body.appendChild(this.status('good', 'Studio project imported. Runtime objects, graph links, and export source are synchronized.'));
        this.render();
      } catch (error) {
        body.appendChild(this.status('error', error instanceof Error ? error.message : 'Could not import studio project.'));
      }
    });
    body.appendChild(this.labeled('IMPORT STUDIO SNAPSHOT', importer));
    body.appendChild(this.status('info', 'The exported ZIP includes the same canonical objects used here, at studio/project.json. Import accepts either that snapshot or a full StudioOS snapshot.'));
  }

  /** Governance command center: inspect/advance transaction lifecycle and revisions. */
  private renderTransactionCenter(body: HTMLElement): void {
    const transactions = this.os.transactions.all().slice().reverse();
    body.appendChild(this.status('info', `${transactions.length} transaction(s) · ${this.os.transactions.branchesList().length} branches.`));
    for (const tx of transactions) {
      const row = this.mk('div', 'field');
      row.innerHTML = `<span class="k">${tx.state.toUpperCase()} · ${tx.title}</span><span class="v">${tx.branch} · ${tx.intent}</span>`;
      body.appendChild(row);
      const actions = this.mk('div'); actions.style.cssText = 'display:flex; gap:4px; margin:3px 0 7px;';
      if (tx.state === 'draft') {
        const preview = this.mk('button', 'ui-button'); preview.textContent = 'PREVIEW'; preview.addEventListener('click', () => { this.os.transactions.preview(tx.id); this.render(); }); actions.appendChild(preview);
      }
      if (tx.state === 'preview' && tx.policies.includes('requires-approval')) {
        const approve = this.mk('button', 'ui-button'); approve.textContent = 'APPROVE'; approve.addEventListener('click', () => { this.os.transactions.approve(tx.id); this.render(); }); actions.appendChild(approve);
      }
      if (['draft', 'preview', 'approved'].includes(tx.state)) {
        const commit = this.mk('button', 'ui-button'); commit.textContent = 'COMMIT'; commit.addEventListener('click', () => { this.os.transactions.commit(tx.id); this.render(); }); actions.appendChild(commit);
      }
      if (tx.state === 'committed') {
        const rollback = this.mk('button', 'ui-button'); rollback.textContent = 'ROLLBACK'; rollback.addEventListener('click', () => { this.os.transactions.rollback(tx.id, 'creator'); this.render(); }); actions.appendChild(rollback);
      }
      body.appendChild(actions);
      if (tx.validation.length) body.appendChild(this.status('error', tx.validation.map((item) => item.message).join(' ')));
      else body.appendChild(this.status('good', `Impact: ${Object.entries(tx.impactSummary).map(([kind, count]) => `${kind} ${count}`).join(', ') || 'none'} · ${tx.graphDiff.addedNodes.length} nodes added / ${tx.graphDiff.removedNodes.length} removed.`));
    }
    const revisions = this.os.transactions.revisionsList();
    const history = this.mk('div', 'field'); history.innerHTML = `<span class="k">▸ Revision History</span><span class="v teal">${revisions.length}</span>`; body.appendChild(history);
    for (const revision of revisions.slice(-8).reverse()) { const row = this.mk('div', 'field'); row.innerHTML = `<span class="k">${revision.id} · ${revision.branch}</span><span class="v">${revision.author}</span>`; body.appendChild(row); }
  }

  private labeled(label: string, control: HTMLElement): HTMLElement {
    const group = this.mk('label');
    group.style.cssText = 'display:flex; flex-direction:column; gap:3px; margin:7px 0; color:var(--muted); font-size:10px;';
    group.textContent = label;
    control.style.width = '100%';
    control.style.background = StudioColors.glassDeep;
    control.style.color = StudioColors.teal;
    control.style.border = `1px solid ${StudioColors.border}`;
    control.style.fontFamily = 'inherit';
    group.appendChild(control);
    return group;
  }

  /**
   * Default visual edits enter the governed pipeline. Protected domains stop at
   * preview for approval in Transaction Center; all other domains commit a new
   * graph revision immediately after validation.
   */
  private saveSchemaTransaction(input: Omit<StudioObject, 'updatedAt'>): void {
    const domains: Record<StudioObjectKind, Array<'narrative' | 'economy' | 'blockchain' | 'world' | 'ui' | 'audio' | 'ai' | 'runtime' | 'export'>> = {
      ui: ['ui'], 'ui-component': ['ui'], npc: ['ai', 'runtime'], story: ['narrative'], dialogue: ['narrative'], cutscene: ['narrative'], quest: ['narrative'], world: ['world'], tile: ['world'], 'world-state': ['world', 'narrative'], network: ['blockchain'], token: ['blockchain', 'economy'], economy: ['economy'], wallet: ['blockchain'], marketplace: ['blockchain', 'economy'], 'nft-collection': ['blockchain'], character: ['blockchain', 'runtime'], audio: ['audio'], 'sound-zone': ['audio'], 'ai-agent': ['ai'], automation: ['ai', 'runtime'],
    };
    const transaction = this.os.transactions.draft({ title: `Save ${input.kind}: ${input.name}`, author: 'creator', domains: domains[input.kind], intent: 'modify' }, () => {
      this.os.studioProject.upsert(input); return { [input.kind]: 1 };
    });
    this.os.transactions.preview(transaction.id);
    const latest = this.os.transactions.all().find((item) => item.id === transaction.id);
    if (latest && !latest.policies.includes('requires-approval')) this.os.transactions.commit(transaction.id);
  }

  /** Schema-generated default editor; JSON is deliberately an advanced escape hatch. */
  private renderSchemaObjectEditor(body: HTMLElement, object: StudioObject): void {
    const schema = getStudioSchema(object.kind);
    const name = this.mk('input') as HTMLInputElement; name.value = object.name;
    const controls = new Map<string, HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>();
    body.appendChild(this.status('info', `${schema.title} schema · ${schema.graphRole} graph role`));
    body.appendChild(this.labeled('NAME', name));
    for (const field of schema.fields) {
      let control: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (field.widget === 'textarea') control = this.mk('textarea') as HTMLTextAreaElement;
      else if (field.widget === 'select') {
        control = this.mk('select') as HTMLSelectElement;
        for (const value of field.options ?? []) { const option = document.createElement('option'); option.value = value; option.textContent = value; control.appendChild(option); }
      } else {
        control = this.mk('input') as HTMLInputElement;
        control.type = field.widget === 'number' || field.widget === 'range' ? field.widget : 'text';
        if (field.min !== undefined) control.min = String(field.min);
        if (field.max !== undefined) control.max = String(field.max);
        if (field.widget === 'range') control.step = '0.05';
      }
      control.value = String(object.data[field.key] ?? (field.widget === 'range' ? '1' : ''));
      if (control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement) control.placeholder = field.placeholder ?? '';
      controls.set(field.key, control); body.appendChild(this.labeled(field.label.toUpperCase(), control));
    }
    const refs = this.mk('input') as HTMLInputElement; refs.value = object.references.join(', '); refs.placeholder = 'comma-separated object IDs'; body.appendChild(this.labeled('REFERENCES', refs));
    const save = this.mk('button', 'ui-button'); save.textContent = 'SAVE SCHEMA OBJECT';
    save.addEventListener('click', () => {
      const data: Record<string, unknown> = { ...object.data };
      for (const field of schema.fields) {
        const value = controls.get(field.key)!.value;
        data[field.key] = field.widget === 'number' || field.widget === 'range' ? Number(value) : value;
      }
      this.saveSchemaTransaction({ id: object.id, kind: object.kind, name: name.value, data, references: refs.value.split(',').map((value) => value.trim()).filter(Boolean) });
      this.render();
    });
    body.appendChild(save);
    const diagnostics = validateStudioObject(object);
    if (diagnostics.length) body.appendChild(this.status('error', diagnostics.map((diagnostic) => diagnostic.message).join(' ')));
    const advanced = document.createElement('details');
    const summary = document.createElement('summary'); summary.textContent = 'Advanced JSON data'; advanced.appendChild(summary);
    const raw = this.mk('textarea') as HTMLTextAreaElement; raw.value = JSON.stringify(object.data, null, 2); raw.rows = 6; raw.readOnly = true; advanced.appendChild(raw); body.appendChild(advanced);
  }

  /** Visual, grid-constrained UI composition. Components are stored on a UI StudioObject. */
  private renderUiCanvas(body: HTMLElement): void {
    let screen: StudioObject | undefined = this.os.studioProject.list('ui')[0];
    if (!screen) {
      this.os.studioEditor.save({ id: 'ui-main', kind: 'ui', name: 'Main HUD', data: { layout: 'gba-20x14', components: [], theme: 'gba-dark' }, references: [] });
      screen = this.os.studioProject.get('ui-main');
    }
    if (!screen) return;
    const components = Array.isArray(screen.data.components) ? screen.data.components as Array<Record<string, unknown>> : [];
    const toolbar = this.mk('div');
    toolbar.style.cssText = 'display:flex; flex-wrap:wrap; gap:4px; margin-bottom:8px;';
    for (const type of ['panel', 'button', 'dialogue', 'inventory', 'wallet', 'battle']) {
      const button = this.mk('button', 'ui-button'); button.textContent = `+ ${type.toUpperCase()}`;
      button.addEventListener('click', () => {
        const n = components.length;
        const next = [...components, { id: `ui-${Date.now()}`, type, label: type === 'button' ? 'ACTION' : type.toUpperCase(), x: (n % 4) * 4, y: Math.floor(n / 4) * 3, w: type === 'dialogue' ? 12 : 4, h: type === 'dialogue' ? 3 : 2 }];
        this.os.studioEditor.save({ id: screen!.id, kind: 'ui', name: screen!.name, data: { ...screen!.data, components: next }, references: screen!.references });
        this.render();
      });
      toolbar.appendChild(button);
    }
    body.appendChild(toolbar);
    const stage = this.mk('div');
    stage.style.cssText = `position:relative; width:100%; aspect-ratio:20/14; min-height:230px; overflow:hidden; background:repeating-linear-gradient(0deg, transparent, transparent calc(7.14% - 1px), #315a45 7.14%), repeating-linear-gradient(90deg, transparent, transparent calc(5% - 1px), #315a45 5%); border:2px solid ${StudioColors.teal}; image-rendering:pixelated;`;
    for (const component of components) {
      const element = this.mk('button');
      const x = Number(component.x ?? 0); const y = Number(component.y ?? 0); const w = Number(component.w ?? 4); const h = Number(component.h ?? 2);
      element.textContent = String(component.label ?? component.type ?? 'component');
      element.title = 'Click to select; use arrow buttons to move on the tile grid.';
      element.style.cssText = `position:absolute; left:${x * 5}%; top:${y * 7.142857}%; width:${w * 5}%; height:${h * 7.142857}%; overflow:hidden; background:${component.type === 'dialogue' ? '#26352c' : '#164b3b'}; color:${StudioColors.gold}; border:1px solid ${StudioColors.green}; font:9px 'Courier New'; cursor:pointer;`;
      element.addEventListener('click', () => this.renderUiComponentControls(body, screen!, String(component.id)));
      stage.appendChild(element);
    }
    body.appendChild(stage);
    body.appendChild(this.status('info', '20 × 14 GBA tile canvas. Add components, then select one to nudge or remove it.'));
  }

  private renderUiComponentControls(body: HTMLElement, screen: StudioObject, id: string): void {
    const components = Array.isArray(screen.data.components) ? screen.data.components as Array<Record<string, unknown>> : [];
    const component = components.find((item) => item.id === id);
    if (!component) return;
    const controls = this.mk('div'); controls.style.cssText = 'display:flex; gap:4px; flex-wrap:wrap; margin-top:7px;';
    for (const [label, dx, dy] of [['←', -1, 0], ['↑', 0, -1], ['↓', 0, 1], ['→', 1, 0]] as Array<[string, number, number]>) {
      const button = this.mk('button', 'ui-button'); button.textContent = label;
      button.addEventListener('click', () => {
        const next = components.map((item) => item.id === id ? { ...item, x: Math.max(0, Math.min(19 - Number(item.w ?? 1), Number(item.x ?? 0) + dx)), y: Math.max(0, Math.min(13 - Number(item.h ?? 1), Number(item.y ?? 0) + dy)) } : item);
        this.os.studioEditor.save({ id: screen.id, kind: 'ui', name: screen.name, data: { ...screen.data, components: next }, references: screen.references }); this.render();
      }); controls.appendChild(button);
    }
    for (const [label, field] of [['W+', 'w'], ['H+', 'h']] as Array<[string, 'w' | 'h']>) {
      const button = this.mk('button', 'ui-button'); button.textContent = label;
      button.addEventListener('click', () => {
        const next = components.map((item) => item.id === id ? { ...item, [field]: Math.min(field === 'w' ? 20 - Number(item.x ?? 0) : 14 - Number(item.y ?? 0), Number(item[field] ?? 1) + 1) } : item);
        this.os.studioEditor.save({ id: screen.id, kind: 'ui', name: screen.name, data: { ...screen.data, components: next }, references: screen.references }); this.render();
      }); controls.appendChild(button);
    }
    const remove = this.mk('button', 'ui-button'); remove.textContent = 'REMOVE';
    remove.addEventListener('click', () => { this.os.studioEditor.save({ id: screen.id, kind: 'ui', name: screen.name, data: { ...screen.data, components: components.filter((item) => item.id !== id) }, references: screen.references }); this.render(); });
    controls.appendChild(remove); body.appendChild(controls);
  }

  private renderUiLayers(body: HTMLElement): void {
    const screen = this.os.studioProject.list('ui')[0];
    const components = screen && Array.isArray(screen.data.components) ? screen.data.components as Array<Record<string, unknown>> : [];
    if (!screen || !components.length) { body.appendChild(this.status('info', 'The canvas has no UI components yet.')); return; }
    for (const component of components) {
      const row = this.mk('div', 'row'); row.textContent = `${String(component.type).toUpperCase()} · ${String(component.label)} · ${component.x},${component.y}`;
      row.addEventListener('click', () => this.selectGraphNode(screen.id)); body.appendChild(row);
    }
  }

  /** Complete non-code NPC form. Advanced values remain normal StudioObject data. */
  private renderNpcCreator(body: HTMLElement, npc: StudioObject): void {
    const data = npc.data;
    const fields: Array<[string, string, string]> = [
      ['Sprite', 'sprite', 'sprites/npc.png'], ['Animation', 'animation', 'idle, walk'], ['Portrait', 'portrait', 'portraits/npc.png'],
      ['Dialogue / branches', 'dialogue', 'Hello, traveler.'], ['Quest IDs', 'quests', 'quest-main'], ['Schedule', 'schedule', 'morning:town; night:inn'],
      ['Location', 'location', 'town-square'], ['Relationships', 'relationships', 'player:neutral'], ['Reputation', 'reputation', '0'],
      ['Shop inventory', 'inventory', 'potion, map'], ['Combat / AI behavior', 'combatBehavior', 'passive'], ['AI personality', 'personality', 'friendly'],
      ['Memory', 'memory', ''], ['Voice', 'voice', ''], ['Sound', 'sound', ''], ['NFT token ID', 'nftTokenId', ''], ['Blockchain identity', 'blockchainIdentity', ''],
    ];
    const controls = new Map<string, HTMLInputElement>();
    const name = this.mk('input') as HTMLInputElement; name.value = npc.name; body.appendChild(this.labeled('NPC NAME', name));
    for (const [label, key, placeholder] of fields) {
      const input = this.mk('input') as HTMLInputElement; input.value = String(data[key] ?? ''); input.placeholder = placeholder; controls.set(key, input); body.appendChild(this.labeled(label.toUpperCase(), input));
    }
    const save = this.mk('button', 'ui-button'); save.textContent = 'SAVE NPC TO RUNTIME';
    save.addEventListener('click', () => {
      const next: Record<string, unknown> = { ...data };
      controls.forEach((control, key) => { next[key] = control.value; });
      this.os.studioEditor.save({ id: npc.id, kind: 'npc', name: name.value, data: next, references: npc.references });
      this.bus.emit('studio:npc-updated', { id: npc.id }); this.render();
    });
    body.append(save, this.status('info', 'This NPC object is linked to graph, undo/redo history, runtime snapshot, and export.'));
  }

  /** Collection → metadata/traits → pixel preview → linked character object. */
  private renderNftPipeline(body: HTMLElement): void {
    body.appendChild(this.status('info', 'Import collection metadata, choose a retro style, preview a generated sprite, then create a runtime-owned blockchain character.'));
    const collection = this.mk('input') as HTMLInputElement; collection.placeholder = 'Collection name';
    const contract = this.mk('input') as HTMLInputElement; contract.placeholder = '0x contract address';
    const tokenId = this.mk('input') as HTMLInputElement; tokenId.placeholder = 'Token ID';
    const traits = this.mk('input') as HTMLInputElement; traits.placeholder = 'Traits, e.g. blue, robot, visor';
    const style = this.mk('select') as HTMLSelectElement;
    for (const value of ['GBA Pixel', 'HD Pixel', 'Portrait']) { const option = document.createElement('option'); option.value = value; option.textContent = value; style.appendChild(option); }
    const preview = this.mk('div'); preview.style.cssText = 'width:96px; height:96px; margin:8px auto; border:2px solid #79f2c0; image-rendering:pixelated; background:#0c1411;';
    const makePreview = (): string => {
      const seed = [...`${collection.value}|${tokenId.value}|${traits.value}`].reduce((total, char) => (total * 31 + char.charCodeAt(0)) >>> 0, 7);
      const colors = ['#83d1c7', '#f3d575', '#a8403d', '#79f2c0', '#5e79bc'];
      const pixels = Array.from({ length: 64 }, (_, i) => ((seed >>> (i % 24)) & 1) ? `<rect x="${(i % 8) * 4}" y="${Math.floor(i / 8) * 4}" width="4" height="4" fill="${colors[(seed + i) % colors.length]}"/>` : '').join('');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" shape-rendering="crispEdges"><rect width="32" height="32" fill="#14251d"/>${pixels}</svg>`;
      const url = `data:image/svg+xml;base64,${btoa(svg)}`; preview.style.backgroundImage = `url('${url}')`; preview.style.backgroundSize = '100% 100%'; return url;
    };
    for (const control of [collection, tokenId, traits]) control.addEventListener('input', makePreview);
    const generate = this.mk('button', 'ui-button'); generate.textContent = 'GENERATE & CREATE CHARACTER';
    generate.addEventListener('click', () => {
      const collectionId = `nft-${(collection.value || 'collection').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      const existing = this.os.studioProject.get(collectionId);
      if (!existing) this.os.studioEditor.save({ id: collectionId, kind: 'nft-collection', name: collection.value || 'NFT Collection', data: { contract: contract.value, metadata: { traits: traits.value.split(',').map((value) => value.trim()).filter(Boolean) } }, references: [] });
      const id = `character-${collectionId}-${tokenId.value || Date.now()}`.replace(/[^a-zA-Z0-9._-]/g, '-');
      this.os.studioEditor.save({ id, kind: 'character', name: `${collection.value || 'NFT'} #${tokenId.value || 'new'}`, data: { contract: contract.value, tokenId: tokenId.value, traits: traits.value.split(',').map((value) => value.trim()).filter(Boolean), style: style.value, sprite: makePreview(), animations: ['idle', 'walk'], portrait: makePreview(), owner: '' }, references: [collectionId] });
      this.selectedStudioObjectId = id; this.selectedNodeId = id; this.render();
    });
    body.append(this.labeled('COLLECTION', collection), this.labeled('CONTRACT', contract), this.labeled('TOKEN ID', tokenId), this.labeled('TRAITS', traits), this.labeled('STYLE', style), preview, generate);
  }

  /** Visual narrative authoring: story nodes are ordinary linked StudioObjects. */
  private renderStoryGraph(body: HTMLElement): void {
    body.appendChild(this.status('info', 'Create chapters, dialogue, choices, cutscenes, consequences, and endings. Links are live project-graph references.'));
    const kind = this.mk('select') as HTMLSelectElement;
    const options: Array<[StudioObjectKind, string]> = [['story', 'Chapter'], ['dialogue', 'Dialogue'], ['quest', 'Quest'], ['cutscene', 'Cutscene'], ['world-state', 'Consequence / World State']];
    for (const [value, label] of options) { const option = document.createElement('option'); option.value = value; option.textContent = label; kind.appendChild(option); }
    const name = this.mk('input') as HTMLInputElement; name.placeholder = 'Node title';
    const linkTo = this.mk('select') as HTMLSelectElement;
    const none = document.createElement('option'); none.value = ''; none.textContent = 'No parent / start node'; linkTo.appendChild(none);
    for (const object of this.os.studioProject.list().filter((object) => ['story', 'dialogue', 'quest', 'cutscene', 'world-state'].includes(object.kind))) { const option = document.createElement('option'); option.value = object.id; option.textContent = `${object.kind}: ${object.name}`; linkTo.appendChild(option); }
    const add = this.mk('button', 'ui-button'); add.textContent = 'ADD STORY NODE';
    add.addEventListener('click', () => {
      const nodeKind = kind.value as StudioObjectKind;
      const id = `${nodeKind}-${Date.now()}`;
      this.os.studioEditor.save({ id, kind: nodeKind, name: name.value || `New ${nodeKind}`, data: nodeKind === 'dialogue' ? { lines: [], choices: [] } : nodeKind === 'world-state' ? { changes: {} } : {}, references: linkTo.value ? [linkTo.value] : [] });
      this.selectedStudioObjectId = id; this.selectedNodeId = id; this.render();
    });
    body.append(kind, this.labeled('NODE TITLE', name), this.labeled('LINKS FROM', linkTo), add);
    const nodes = this.os.studioProject.list().filter((object) => ['story', 'dialogue', 'quest', 'cutscene', 'world-state'].includes(object.kind));
    for (const node of nodes) {
      const row = this.mk('div', 'row'); row.textContent = `${node.kind.toUpperCase()}  ${node.name} → ${node.references.join(', ') || 'start'}`;
      row.addEventListener('click', () => { this.selectedStudioObjectId = node.id; this.selectGraphNode(node.id); }); body.appendChild(row);
    }
  }

  /** One-click token configuration plus automatic currency propagation. */
  private renderTokenEconomyBuilder(body: HTMLElement): void {
    const networks = this.os.studioProject.list('network');
    const network = this.mk('select') as HTMLSelectElement;
    for (const item of networks) { const option = document.createElement('option'); option.value = item.id; option.textContent = item.name; network.appendChild(option); }
    if (!networks.length) body.appendChild(this.status('error', 'Create a network in Creator Control → Network Manager first.'));
    const symbol = this.mk('input') as HTMLInputElement; symbol.placeholder = 'GOLD';
    const contract = this.mk('input') as HTMLInputElement; contract.placeholder = '0x token contract';
    const decimals = this.mk('input') as HTMLInputElement; decimals.type = 'number'; decimals.value = '18';
    const save = this.mk('button', 'ui-button'); save.textContent = 'CREATE TOKEN & WIRE ECONOMY';
    save.addEventListener('click', () => {
      try {
        const tokenId = `token-${(symbol.value || 'currency').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
        const { consumers: changed } = this.os.studioEditor.createTokenAndBind(tokenId, symbol.value || 'Game Currency', { contract: contract.value, networkId: network.value, decimals: Number(decimals.value), symbol: symbol.value || 'TOKEN' });
        body.appendChild(this.status('good', `Token linked to ${changed.length} runtime consumers: ${changed.join(', ') || 'none yet'}.`));
        this.selectedStudioObjectId = tokenId; this.selectedNodeId = tokenId; this.render();
      } catch (error) { body.appendChild(this.status('error', error instanceof Error ? error.message : 'Could not wire token.')); }
    });
    body.append(this.labeled('NETWORK', network), this.labeled('SYMBOL', symbol), this.labeled('CONTRACT', contract), this.labeled('DECIMALS', decimals), save);
    const token = this.os.studioProject.list('token')[0];
    if (token) body.appendChild(this.status('info', `${token.name} impact: ${this.os.studioProject.affectedBy(token.id).map((object) => object.name).join(', ') || 'no consumers'}.`));
  }

  /** Audio zones, buses, triggers, and mix values share the standard object pipeline. */
  private renderAudioStudio(body: HTMLElement): void {
    const name = this.mk('input') as HTMLInputElement; name.placeholder = 'Forest ambience';
    const music = this.mk('input') as HTMLInputElement; music.placeholder = 'music/forest.ogg';
    const ambience = this.mk('input') as HTMLInputElement; ambience.placeholder = 'audio/wind.ogg';
    const trigger = this.mk('input') as HTMLInputElement; trigger.placeholder = 'on-enter:forest';
    const volume = this.mk('input') as HTMLInputElement; volume.type = 'range'; volume.min = '0'; volume.max = '1'; volume.step = '0.05'; volume.value = '0.7';
    const save = this.mk('button', 'ui-button'); save.textContent = 'CREATE AUDIO ZONE';
    save.addEventListener('click', () => {
      const id = `sound-zone-${Date.now()}`;
      this.os.studioEditor.save({ id, kind: 'sound-zone', name: name.value || 'Audio Zone', data: { music: music.value, ambience: ambience.value, triggers: trigger.value.split(',').map((value) => value.trim()).filter(Boolean), volume: Number(volume.value), mixGroup: 'world', reverb: 0 }, references: [] });
      this.selectedStudioObjectId = id; this.selectedNodeId = id; this.render();
    });
    body.append(this.labeled('ZONE NAME', name), this.labeled('MUSIC', music), this.labeled('AMBIENCE', ambience), this.labeled('RUNTIME TRIGGERS', trigger), this.labeled('VOLUME', volume), save);
    for (const zone of this.os.studioProject.list('sound-zone')) { const row = this.mk('div', 'row'); row.textContent = `${zone.name} · ${String(zone.data.volume ?? 1)} · ${String(zone.data.triggers ?? '')}`; row.addEventListener('click', () => this.selectGraphNode(zone.id)); body.appendChild(row); }
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
    const session = this.os.runtimeSession.snapshot();
    const revisions = this.os.transactions.revisionsList();
    this.q('#ctx-branch').textContent = session.branch;
    this.q('#ctx-revision').textContent = session.revision ?? revisions[revisions.length - 1]?.id ?? '—';
    this.q('#ctx-session').textContent = session.id;
    this.q('#ctx-effects').textContent = String(session.effects.length);
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
