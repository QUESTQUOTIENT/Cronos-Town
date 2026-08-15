/**
 * studio/StudioOS.ts — the Chronos Studio operating system (composition root).
 *
 * This is the single composition root that wires EVERY engine system together —
 * the "operating system" the studio platform runs on. It owns:
 *
 *   EventBus · CommandStack · EntityManager · SceneManager (+ runtime) ·
 *   ProjectManager · ProjectGraph · AssetRegistry (+ importer) · WorkspaceManager
 *   (+ presets) · SystemRunner · SearchEngine · AutomationEngine · PluginRegistry
 *
 * Every feature becomes a *plugin* loaded into this shell; every system is
 * observable through the bus and searchable through the SearchEngine.
 *
 * This module is pure logic + wiring (no DOM); the presentation layer (the
 * StudioShell UI) consumes a `StudioOS` instance.
 */
import { EventBus } from '../engine/events/EventBus';
import { CommandStack } from '../engine/commands/Command';
import { EntityManager } from '../engine/entity/EntityManager';
import { SystemRunner } from '../engine/entity/SystemRunner';
import { SceneManager } from '../engine/scenes/SceneManager';
import { SceneRuntime, SceneSerializer, SceneTransitions } from '../engine/scenes/SceneRuntime';
import { ProjectManager } from '../engine/projects/ProjectManager';
import { ProjectGraph } from '../engine/projects/ProjectGraph';
import { StudioProject } from '../engine/projects/StudioProject';
import { StudioObjectEditor } from '../engine/projects/StudioObjectEditor';
import { AssetRegistry } from '../engine/assets/AssetRegistry';
import { AssetImporter } from '../engine/assets/AssetImporter';
import { WorkspaceManager } from '../engine/workspaces/WorkspaceManager';
import { buildPresetWorkspaces, WORKSPACE_PRESETS } from '../engine/workspaces/presets';
import { SearchEngine } from '../engine/search/SearchEngine';
import { AutomationEngine } from '../engine/automation/AutomationEngine';
import { PluginRegistry, type Plugin } from '../engine/plugins/PluginSystem';
import { COMPONENT_TYPES } from '../engine/components/Components';
import { GraphEditor } from '../engine/graph/GraphEditor';
import { EntityEditor } from '../features/editor/tools/entity-editor';
import { ImportPipeline } from '../engine/assets/pipeline/importer';
import { CommandLog, EventMonitor, Profiler } from '../engine/debugger/Debugger';
import { NotificationCenter } from '../ui/components/notification-center';
import { addKeyframe, addTrack, emptyTimeline, type AnimationTimeline } from '../features/editor/tools/animation-editor';

export interface StudioOSOptions {
  now?: () => number;
}

export class StudioOS {
  readonly bus = new EventBus();
  readonly commands = new CommandStack();
  readonly entities = new EntityManager();
  readonly systems = new SystemRunner();
  readonly scenes = new SceneManager(this.entities);
  readonly sceneSerializer = new SceneSerializer(this.entities);
  readonly sceneRuntime = new SceneRuntime(this.entities);
  readonly sceneTransitions = new SceneTransitions();
  readonly projects: ProjectManager;
  readonly graph = new ProjectGraph();
  /** Canonical authored objects shared by the runtime, studio, and exporter. */
  readonly studioProject = new StudioProject(this.graph);
  readonly studioEditor = new StudioObjectEditor(this.studioProject, this.commands);
  readonly assets: AssetRegistry;
  readonly importer: AssetImporter;
  readonly workspaces: WorkspaceManager;
  readonly search: SearchEngine;
  readonly automation: AutomationEngine;
  readonly plugins = new PluginRegistry();

  /** Command-backed editors + pipeline (undoable, hot-reloadable). */
  readonly graphEditor: GraphEditor;
  readonly entityEditor: EntityEditor;
  readonly importPipeline: ImportPipeline;

  /** Live debugger surfaces (rendered by the shell). */
  readonly commandLog: CommandLog;
  readonly eventMonitor: EventMonitor;
  readonly profiler: Profiler;
  readonly notifications: NotificationCenter;

  /** A live, editable animation timeline (demo track seeded below). */
  readonly animationTimeline: AnimationTimeline;

  private readonly settings: Record<string, string> = {
    theme: 'gba-dark',
    'tile-size': '32',
    'chain-id': '25',
    network: 'cronos-mainnet',
  };

  constructor(options: StudioOSOptions = {}) {
    const now = options.now ?? (() => Date.now());
    this.projects = new ProjectManager(this.scenes, { now });
    this.assets = new AssetRegistry(now);
    this.importer = new AssetImporter(this.assets);

    const { workspace, created } = buildPresetWorkspaces();
    this.workspaces = workspace;
    void created;

    this.search = new SearchEngine({
      graph: this.graph,
      assets: this.assets,
      entities: this.entities,
      commands: this.commands.undoLabels().map((label, i) => ({ id: `undo-${i}`, label: `Undo: ${label}` })),
      settings: this.settings,
    });
    this.automation = new AutomationEngine(this.commands);

    // Command-backed editors + pipeline + debugger surfaces.
    this.graphEditor = new GraphEditor(this.graph, this.commands);
    this.entityEditor = new EntityEditor(this.entities, this.commands);
    this.importPipeline = new ImportPipeline(this.assets, this.importer, this.graph);
    this.commandLog = new CommandLog(now);
    this.eventMonitor = new EventMonitor(now);
    this.profiler = new Profiler();
    this.notifications = new NotificationCenter(8000, 50);
    this.animationTimeline = this.seedTimeline();

    // Seed a starter project + scene + graph node so the OS boots into a usable state.
    this.bootstrap();
  }

  /** A demo animation track so the timeline panel renders something immediately. */
  private seedTimeline(): AnimationTimeline {
    let timeline = emptyTimeline(8);
    timeline = addTrack(timeline, 'walk', 'Player Walk');
    for (let i = 0; i < 4; i += 1) {
      timeline = addKeyframe(timeline, 'walk', { id: `k${i}`, frameIndex: i, durationMs: 125 });
    }
    return timeline;
  }

  private bootstrap(): void {
    const project = this.projects.createProject('Cronos Town', { author: 'Dev', description: 'Neo-GBA crypto RPG' });
    this.graph.addNode({ id: project.id, kind: 'project', name: project.name });

    const scene = this.scenes.createScene('Hometown');
    this.projects.addSceneToOpen(scene.id);
    this.graph.addNode({ id: scene.id, kind: 'map', name: scene.name });
    this.graph.addEdge(project.id, scene.id, 'contains');

    // A richer starter graph so the visual project graph has something to show.
    this.graph.addNode({ id: 'quest-main', kind: 'quest', name: 'Main Quest' });
    this.graph.addNode({ id: 'npc-flippy', kind: 'entity', name: '@Flippy' });
    this.graph.addNode({ id: 'sprite-player', kind: 'sprite', name: 'Player Sprite' });
    this.graph.addEdge(scene.id, 'quest-main', 'contains');
    this.graph.addEdge('quest-main', 'npc-flippy', 'requires');
    this.graph.addEdge(scene.id, 'sprite-player', 'references');
    // Register the sprite so it's also searchable/inspectable.
    this.assets.register({ id: 'sprite-player', kind: 'sprite', name: 'Player Sprite', source: 'sprites/player.png', metadata: { size: '32' } });

    // These are authored objects, not a second set of editor-only settings.
    // Runtime systems and exports resolve their links through the same store.
    this.studioProject.configureNetwork('network-cronos', 'Cronos Mainnet', {
      chainId: 25, rpcUrl: 'https://evm.cronos.org', explorer: 'https://cronoscan.com', currency: 'CRO', gasToken: 'CRO',
    });
    this.studioProject.configureToken('token-gold', 'Cronos Gold', {
      contract: '0x0000000000000000000000000000000000000000', networkId: 'network-cronos', decimals: 18, symbol: 'GOLD',
    });
    this.studioProject.upsert({
      id: 'economy-main', kind: 'economy', name: 'Main Economy',
      data: { shopCurrency: 'token-gold', rewardCurrency: 'token-gold' }, references: ['token-gold'],
    });
  }

  /** Set a runtime setting (searchable). */
  setSetting(key: string, value: string): void {
    this.settings[key] = value;
  }

  getSetting(key: string): string | undefined {
    return this.settings[key];
  }

  /** Load a feature plugin into the OS. */
  loadPlugin(plugin: Plugin): string | null {
    return this.plugins.load(plugin);
  }

  /** Activate all loaded plugins against the studio API. */
  activatePlugins(): void {
    this.plugins.activateAll({
      emit: (event, payload) => this.bus.emit(event, payload),
      registerCommand: (id, label, run) => {
        void id;
        void label;
        void run;
        // Commands are surfaced through the search engine via `commands`.
      },
      registerPanel: () => {},
    });
  }

  /** Known component types (for the inspector). */
  get componentTypes(): string[] {
    return [...COMPONENT_TYPES];
  }

  /** The preset workspace list (for one-click switching). */
  get workspacePresets(): Array<{ id: string; name: string }> {
    return WORKSPACE_PRESETS.map((p) => ({ id: p.id, name: p.name }));
  }

  /** A full OS snapshot (for persistence/export). */
  snapshot(): {
    project: ReturnType<ProjectManager['serializeOpen']>;
    graph: ReturnType<ProjectGraph['serialize']>;
    assets: ReturnType<AssetRegistry['serialize']>;
    scenes: ReturnType<SceneManager['serialize']>;
    studio: ReturnType<StudioProject['snapshot']>;
  } {
    return {
      project: this.projects.serializeOpen(),
      graph: this.graph.serialize(),
      assets: this.assets.serialize(),
      scenes: this.scenes.serialize(),
      studio: this.studioProject.snapshot(),
    };
  }
}
