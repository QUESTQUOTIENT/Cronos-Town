/**
 * engine/plugins/PluginSystem.ts — the plugin architecture.
 *
 * A plugin is a manifest (id/name/version/api) + an activation function. The
 * registry loads, activates, deactivates, and unloads plugins; the `PluginApi`
 * is the injectable surface a plugin can use (emit events, register commands,
 * register panels, register asset importers). This lets new editor tools be
 * added WITHOUT modifying engine code.
 *
 * Pure + deterministic (activation order = load order). No sandboxing here —
 * that is a future concern; this is the registry + lifecycle.
 */

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  /** Semver-range of the engine API this plugin targets (informational). */
  api?: string;
  description?: string;
}

export interface PluginApi {
  /** Emit an event on the studio bus. */
  emit(event: string, payload: unknown): void;
  /** Register a command (id → { label, run }). */
  registerCommand(id: string, label: string, run: () => void): void;
  /** Register a dockable panel type. */
  registerPanel(id: string, title: string, type: string): void;
}

export interface Plugin {
  readonly manifest: PluginManifest;
  /** Called on activation. Return a cleanup fn or void. */
  activate(api: PluginApi): void | (() => void);
}

export class PluginRegistry {
  private readonly plugins = new Map<string, { plugin: Plugin; cleanup?: () => void }>();
  private readonly order: string[] = [];

  /** Load a plugin (validate manifest, de-dupe). Returns error if invalid. */
  load(plugin: Plugin): string | null {
    if (!plugin.manifest?.id || !plugin.manifest?.name || !plugin.manifest?.version) {
      return 'Plugin manifest must include id, name, and version.';
    }
    if (this.plugins.has(plugin.manifest.id)) {
      return `Plugin "${plugin.manifest.id}" is already loaded.`;
    }
    this.plugins.set(plugin.manifest.id, { plugin });
    this.order.push(plugin.manifest.id);
    return null;
  }

  /** Activate all loaded plugins in load order. */
  activateAll(api: PluginApi): void {
    for (const id of this.order) {
      const entry = this.plugins.get(id);
      if (entry && !entry.cleanup) {
        entry.cleanup = entry.plugin.activate(api) ?? undefined;
      }
    }
  }

  /** Deactivate a single plugin (runs its cleanup). */
  deactivate(id: string): boolean {
    const entry = this.plugins.get(id);
    if (!entry) return false;
    entry.cleanup?.();
    entry.cleanup = undefined;
    return true;
  }

  /** Unload (deactivate + remove) a plugin. */
  unload(id: string): boolean {
    if (!this.plugins.has(id)) return false;
    this.deactivate(id);
    this.plugins.delete(id);
    this.order.splice(this.order.indexOf(id), 1);
    return true;
  }

  get(id: string): Plugin | undefined {
    return this.plugins.get(id)?.plugin;
  }

  list(): Plugin[] {
    return this.order.map((id) => this.plugins.get(id)?.plugin as Plugin).filter(Boolean);
  }

  isActive(id: string): boolean {
    return Boolean(this.plugins.get(id)?.cleanup) || (this.plugins.has(id) && this.plugins.get(id)?.cleanup !== undefined);
  }
}
