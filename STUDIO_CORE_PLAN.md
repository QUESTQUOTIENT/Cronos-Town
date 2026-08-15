# Chronos Studio Core — the studio platform phase

> Following the architecture audit (~55–65% migration complete), this phase turns
> Cronos Town from a *single game project* into a *studio + engine platform*.
> No new gameplay content — foundational engine systems only, each pure and
> test-locked (the same discipline as the migration so far).

## Goal

Make it feel like Unity + Godot + Blender: a reusable runtime where the world,
the editor, the wallet, the AI, and future features are all **observable systems**
connected through the EventBus + HistoryEngine.

## What's already built this phase (Chronos Studio Core · waves 1–2)

| System | Module | Status |
|---|---|---|
| **Entity/component system (ECS)** | `engine/entity/EntityManager.ts` | ✅ pure, serializable, queryable |
| **Entity systems runner** | `engine/entity/SystemRunner.ts` | ✅ register/enable/run, deterministic |
| **Scene system** | `engine/scenes/SceneManager.ts` | ✅ owns entities, (de)serializes |
| **Project system** | `engine/projects/ProjectManager.ts` | ✅ create/open/recent/serialize |
| **Workspace system** | `engine/workspaces/WorkspaceManager.ts` | ✅ dockable panels, 5 default workspaces |
| **UI design system (tokens)** | `ui/theme.ts` | ✅ palette/spacing/radius/motion/type/world |
| **UI component contracts** | `ui/components.ts` | ✅ Button/Panel/Tab/Toolbar/Inspector/Status specs |
| **Dock layout engine** | `ui/layout.ts` | ✅ weighted row/column splits → pixel rects |
| **DOM adapter** | `ui/DomUiAdapter.ts` | ✅ renders specs → DOM (injectable factory) |
| **Observable events** | `engine/events/events.ts` | ✅ Project/Asset/Map/Editor/Quest/Workspace/Scene/Automation |
| **Studio shell** | `studio/StudioShell.ts` + `studio/index.html` | ✅ dockable workspace UI, hierarchy, inspector, asset browser, event log, command palette (Ctrl+K) |

398 tests lock all of it; the legacy `index.html` remains byte-identical.

## Wave 10 — Studio wiring (this phase)

The editor tools + components are now **wired into the live studio** (not just
data models): the OS owns command-backed editors + a live pipeline + debugger
surfaces, and the shell renders them + adds undo/redo.

| Change | Detail |
|---|---|
| **OS → live surfaces** | `StudioOS` now owns `graphEditor` / `entityEditor` (command-backed), `importPipeline` (hot-reload), `commandLog` / `eventMonitor` / `profiler` / `notifications`, and a seeded `animationTimeline` |
| **Undo/redo** | Ctrl+Z / Ctrl+Shift+Z wired through the shared CommandStack (entity + graph edits are undoable) |
| **New panels** | Timeline (keyframe blocks), Console (command log + event monitor + profiler), Notifications (queue + unread) |
| **New workspace preset** | "Animation" (timeline + inspector), and "Scripting" gained a Notifications panel — 7 presets total |

The studio is now genuinely interactive: create/move entities and graph nodes,
undo/redo with keyboard shortcuts, watch the timeline/keyframes, inspect
everything, and get live notifications — all driven by the tested engine systems.

## Wave 9 — Chronos Studio Creator Experience (this phase)

The audit's remaining 0.1: component breadth + universal inspector + editable
graph + asset pipeline. All four landed as pure, test-locked systems.

| System | Module | Status |
|---|---|---|
| **Component breadth** | `ui/components/` | ✅ `notification-center` (queue/ttl/unread), `window` (min/max/focus/float/close), `dock` (panel rects + split), `timeline` (lanes/keyframes/playhead), `graph` (node/edge specs), `inspector` (section/row specs) — each atomic |
| **Universal inspector** | `engine/inspector/Inspector.ts` | ✅ now emits History + Events sections when the scope provides them |
| **Editable project graph** | `engine/graph/GraphEditor.ts` | ✅ node/edge CRUD as undoable commands |
| **Asset import pipeline** | `engine/assets/pipeline/importer.ts` | ✅ orchestrator (validate → register → refs → graph edges) + hot-reload + dedup |

The component library now covers the full editor vocabulary (NotificationCenter,
Window, Dock, Timeline, Graph, Inspector — beyond just Button), the inspector is
"universal" (properties + references + dependencies + history + events), the
project graph is editable via commands, and the asset pipeline is a single
orchestrated flow with hot-reload.

## Wave 8 — Editor decomposition + runtime services (this phase)

The audit's #1 gap: the editor was 2 files vs 24 engine modules. This wave
decomposes the editor into specialized, independently-loadable tools (each with
pure data models + validation), plus the missing runtime services.

| System | Module | Status |
|---|---|---|
| **Editor shared** | `features/editor/shared/` | ✅ selection (multi-select/toggle), snapping (32px grid), transform (translate/resize/align/bbox), clipboard (typed copy/paste) |
| **Animation editor** | `tools/animation-editor.ts` | ✅ tracks + keyframes, playhead, frame resolution with looping |
| **Tile editor** | `tools/tile-editor.ts` | ✅ palette + paint/fill/resize/used-tiles |
| **Entity editor** | `tools/entity-editor.ts` | ✅ command-backed CRUD (undoable) |
| **Dialogue/Quest editors** | `tools/graph-editors.ts` | ✅ graph add/remove/connect + validation |
| **UI editor** | `tools/ui-editor.ts` | ✅ GBA-constrained (20×14, 32px snap) place/move/resize/distribute |
| **Scene editor** | `tools/scene-editor.ts` | ✅ prefab save/instantiate (deep-cloned) |
| **World editor** | `tools/world-editor.ts` | ✅ 16×16 chunk grid + dirty tracking |
| **Runtime services** | `engine/runtime/` | ✅ Scheduler (phases), Time (scale/fixed-step), AnimationRuntime (playback), Streaming (chunk load/unload) |

The editor is now 13 modules (shared + 7 tools) instead of 2, and the runtime
gained the scheduler/time/animation/streaming services the audit called "AAA-grade".

## Wave 7 — Creator experience (this phase)

The audit's three 10/10 updates, as pure + test-locked backing systems:

| System | Module | Status |
|---|---|---|
| **Layout persistence** | `engine/workspaces/LayoutSerializer.ts` | ✅ workspace→panel snapshot + restore (exact id preservation via `restoreWorkspace`) |
| **Atomic component** | `ui/components/button/` | ✅ tokens / states (reducer) / controller / index — the per-component ownership reference |
| **Resource management** | `engine/runtime/ResourceManager.ts` | ✅ memory budget + LRU eviction + touch/unload/load |
| **Graph-native editors** | `engine/graph/GraphEditors.ts` | ✅ dialogue / quest / automation graphs + validation (start-exists, dangling edges, unreachable nodes) |

The atomic `button/` folder demonstrates the exact pattern to replicate for
every component (tokens → states → controller → view), and the graph editor data
models give the visual node editors (dialogue/quest/automation) a validated,
serializable backing.

## Wave 6 — Chronos Studio UX Overhaul (this phase)

No more restructuring — tool quality. The UI system became a full component
system (tokens + primitives + components + systems), and the asset pipeline +
runtime debugger landed.

| System | Module | Status |
|---|---|---|
| **UI token split** | `ui/tokens/colors.ts` + `ui/tokens/index.ts` | ✅ colors/spacing/radius/typography/motion/world (theme.ts re-exports) |
| **UI systems** | `ui/systems/` | ✅ FocusManager (focus stack/history), ShortcutManager (scoped combos), WindowManager (dock zones/tab groups), DragDropManager (drag lifecycle) |
| **Asset pipeline** | `engine/assets/pipeline/` | ✅ `atlas` (shelf packing + UV rects + utilization), `dedup` (content-hash aliasing), `dependency-analysis` (reference extraction + reverse index) |
| **Runtime debugger** | `engine/debugger/Debugger.ts` | ✅ CommandLog, EventMonitor (counts/filter), Profiler (rolling min/max/avg/last) |
| **Shell wiring** | `studio/StudioShell.ts` | ✅ shortcuts + focus now routed through the managers |

The studio now has the docking/focus/shortcut *state models* and the asset
pipeline + profiler backends — the remaining work is purely the DOM rendering of
those (drag handles, tab strips, timeline/profiler views).

## Wave 5 — Chronos Studio Intelligence (this phase)

Tool quality over structure: the project graph became the single source of truth,
and the live inspector + visual graph are now wired into the studio shell.

| System | Module | Status |
|---|---|---|
| **Project graph (single source of truth)** | `engine/projects/ProjectGraph.ts` | ✅ 20 node kinds + `dependents` / `impact` / `safeToDelete` / `deleteWithCheck` / `analyze` |
| **Live inspector** | `engine/inspector/Inspector.ts` | ✅ selection → properties / references / dependencies (entity, graph node, asset) |
| **Visual graph layout** | `engine/graph/GraphLayout.ts` | ✅ pure layered DAG layout + edge coords (cycle-safe, deterministic) |
| **UI components (part 2)** | `ui/components2.ts` | ✅ Window / StatusBar / Timeline / PropertyRow / InspectorSection / EmptyState / LoadingState / ErrorState / DialogueBox / InventoryGrid |
| **Shell → visual graph + inspector** | `studio/StudioShell.ts` | ✅ Project Graph panel (SVG edges + clickable nodes) + Inspector reads graph-node selections |

The shell now renders a **visual project graph** (click a node → the inspector
shows its properties, references, dependents, and safe-to-delete status) and a
**live inspector** driven by the `Inspector` data model.

## Wave 4 — Chronos Studio OS (this phase)

The StudioShell is now driven by **`StudioOS`** — the single composition root that
wires *every* engine system (the "operating system" of the studio):

```
StudioOS
├── EventBus · CommandStack · EntityManager (+ components library) ·
├── SceneManager + SceneRuntime + SceneSerializer + SceneTransitions ·
├── ProjectManager + ProjectGraph · AssetRegistry + AssetImporter ·
├── WorkspaceManager (+ presets) · SystemRunner ·
├── SearchEngine · AutomationEngine · PluginRegistry
└── (StudioShell = presentation layer on top)
```

| System | Module | Status |
|---|---|---|
| **Component library** | `engine/components/Components.ts` | ✅ 13 typed components (transform/sprite/animation/collision/dialogue/quest/inventory/wallet/npc/player/interactable/light/audio) + registry/factories |
| **Scene runtime** | `engine/scenes/SceneRuntime.ts` | ✅ SceneSerializer/SceneLoader/SceneRuntime/SceneTransitions (independent of the editor) |
| **Universal search** | `engine/search/SearchEngine.ts` | ✅ Ctrl+K searches nodes/assets/entities/commands/settings |
| **Automation engine** | `engine/automation/AutomationEngine.ts` | ✅ command + trigger workflows (pause/resume/complete, undoable via CommandStack) |
| **Workspace presets** | `engine/workspaces/presets.ts` | ✅ Game Design / UI Design / Economy / AI / Assets / Scripting (one-click) |
| **StudioOS** | `studio/StudioOS.ts` | ✅ the composition root wiring all of the above |
| **Shell → OS** | `studio/StudioShell.ts` + `main.ts` | ✅ shell now *renders* the OS instead of owning managers; palette uses SearchEngine |

## Wave 3 — Chronos Studio Core v2 (this phase)

| System | Module | Status |
|---|---|---|
| **Command system** | `engine/commands/Command.ts` + `builtins.ts` | ✅ Command/CommandStack + CreateEntity/DeleteEntity/MoveEntity/SetComponent (undo/redo automatic) |
| **Asset pipeline** | `engine/assets/AssetRegistry.ts` + `AssetImporter.ts` | ✅ typed/versioned registry + validated import (sprite/audio rules) |
| **Project graph** | `engine/projects/ProjectGraph.ts` | ✅ nodes + typed edges, references/reachable/search, serializable |
| **Serialization layer** | `engine/serialization/Versioned.ts` | ✅ versioned envelope + migration chain |
| **Plugin system** | `engine/plugins/PluginSystem.ts` | ✅ manifest + registry + activate/deactivate/cleanup lifecycle |
| **UI primitives** | `ui/primitives.ts` | ✅ Input/Checkbox/Slider/Toggle/Dropdown specs |
| **UI tree** | `ui/tree.ts` | ✅ TreeView spec + flatten/find/toggle/select |

The command system is the key unlock: every action becomes a command, so
history/automation/collaboration become automatic rather than per-feature.

## The studio shell (new this wave)

`npm run dev` now boots **Chronos Studio** — a real dockable studio UI (not a game
screen): a top bar with workspace tabs (Game / UI / Economy / AI / Assets), a
weighted-split dock of panels rendered from the active workspace, a **hierarchy**
(entity list), **inspector** (selected entity's components), **asset browser**
(all sprite presets), **event log** (live EventBus observability), a **status bar**
(project / scene / entity / event counts), and a **command palette** (Ctrl+K:
new entity / scene / project, run systems, save, switch workspace).

Everything delegates to the pure managers (ECS / Scene / Project / Workspace /
SystemRunner); the shell is the presentation layer only.

## Roadmap (aligned to the audit)

### Phase 2 — Studio architecture (next)
- [ ] `DomUiAdapter` — turn `ui/components.ts` specs into real DOM (docking windows, inspector, hierarchy, command palette, asset browser)
- [ ] `ui/layout` engine (split panes, dock zones)
- [ ] `ui/animation` engine (driven by `StudioMotion` tokens)

### Phase 3 — World engine
- [ ] Entity *systems* runner (process entities each frame: transform, render, dialogue, quest)
- [ ] World streaming (load scenes by camera region)
- [ ] Map/save runtime wired to the ECS + SceneManager

### Phase 4 — UI engine
- [ ] Full component library (buttons/panels/windows/inspectors/tabs/menus/toolbars)
- [ ] Theme engine (runtime-swappable themes)
- [ ] Responsive editor layouts

### Phase 5 — Collaboration engine
- [ ] Project history (branches, change tracking, review mode) — builds on HistoryEngine
- [ ] Multiplayer editing (future)

### Phase 6 — AI operating system
- [ ] Agent manager, long-term memory, workflow automation, NPC intelligence

## Design principles (unchanged from the migration)

1. Features never reach into each other — they emit events.
2. Domain + engine logic stays pure (no DOM), locked by tests.
3. The legacy `index.html` stays the byte-identical source of truth.
4. `python3 tools/verify_regression.py --smoke` must stay green at every step.
