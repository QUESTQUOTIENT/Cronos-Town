/**
 * engine/entity/SystemRunner.ts — the entity-systems runner (Phase 3 world engine).
 *
 * Systems are functions `(world, deltaMs) => void` that process entities each
 * frame. The runner registers/enables/disables them and runs them in registration
 * order — the deterministic, testable backbone of the world runtime (transform,
 * render, dialogue, quest, collision, animation…).
 *
 * Pure: no DOM, no I/O. Time is injected.
 */

import type { EntityManager } from './EntityManager';

export type System = (world: EntityManager, deltaMs: number) => void;

export interface RegisteredSystem {
  name: string;
  system: System;
  enabled: boolean;
}

export interface SystemRunReport {
  ran: string[];
  skipped: string[];
}

export class SystemRunner {
  private readonly systems: RegisteredSystem[] = [];

  /** Register a system (replaces a same-named system). */
  register(name: string, system: System): this {
    const existing = this.systems.find((s) => s.name === name);
    if (existing) {
      existing.system = system;
      return this;
    }
    this.systems.push({ name, system, enabled: true });
    return this;
  }

  unregister(name: string): boolean {
    const idx = this.systems.findIndex((s) => s.name === name);
    if (idx === -1) return false;
    this.systems.splice(idx, 1);
    return true;
  }

  enable(name: string): boolean {
    const s = this.systems.find((x) => x.name === name);
    if (!s) return false;
    s.enabled = true;
    return true;
  }

  disable(name: string): boolean {
    const s = this.systems.find((x) => x.name === name);
    if (!s) return false;
    s.enabled = false;
    return true;
  }

  isEnabled(name: string): boolean {
    return this.systems.find((s) => s.name === name)?.enabled ?? false;
  }

  names(): string[] {
    return this.systems.map((s) => s.name);
  }

  /** Run every enabled system in registration order. */
  run(world: EntityManager, deltaMs: number): SystemRunReport {
    const ran: string[] = [];
    const skipped: string[] = [];
    for (const s of this.systems) {
      if (!s.enabled) {
        skipped.push(s.name);
        continue;
      }
      s.system(world, deltaMs);
      ran.push(s.name);
    }
    return { ran, skipped };
  }

  /** Run a single named system (no-op if missing or disabled). */
  runOne(world: EntityManager, name: string, deltaMs: number): boolean {
    const s = this.systems.find((x) => x.name === name);
    if (!s || !s.enabled) return false;
    s.system(world, deltaMs);
    return true;
  }
}
