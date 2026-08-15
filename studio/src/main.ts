/**
 * main.ts — composition root.
 *
 * Boots Chronos Studio OS: the single composition root that wires every engine
 * system (EventBus, CommandStack, ECS, scenes, projects, graph, assets,
 * workspaces, search, automation, plugins) and mounts the StudioShell UI on top.
 */
import { StudioOS } from './studio/StudioOS';
import { StudioShell } from './studio/StudioShell';

// The operating system — one instance wires every engine system.
const os = new StudioOS();

// The presentation layer — the dockable studio UI, driven by the OS.
const root = document.body;
const shell = new StudioShell({ root, os });
shell.start();

// Expose for the dev console.
(window as unknown as { __chronosStudio: { os: StudioOS; shell: StudioShell } }).__chronosStudio = { os, shell };

console.info('Chronos Studio OS booted — press Ctrl+K for universal search.');
