/**
 * engine/debugger/Debugger.ts — runtime debugger (command log, event monitor, profiler).
 *
 * Three pure, injectable-time debug tools for the studio's runtime debugging:
 *   - CommandLog: records executed commands (with undo/redo) for replay/inspection.
 *   - EventMonitor: records events emitted on the bus (with payload + timestamp).
 *   - Profiler: frame/phase timing with rolling averages (min/max/avg/ms).
 *
 * No DOM, no randomness. The shell renders these logs; the data model is here.
 */

export interface CommandLogEntry {
  index: number;
  direction: 'execute' | 'undo' | 'redo';
  label: string;
  at: number;
}

export class CommandLog {
  private readonly entries: CommandLogEntry[] = [];
  private counter = 0;

  constructor(private readonly now: () => number = () => Date.now()) {}

  record(direction: 'execute' | 'undo' | 'redo', label: string): CommandLogEntry {
    const entry: CommandLogEntry = { index: this.counter++, direction, label, at: this.now() };
    this.entries.push(entry);
    if (this.entries.length > 500) this.entries.shift();
    return entry;
  }

  entriesFor(label: string): CommandLogEntry[] {
    return this.entries.filter((e) => e.label === label);
  }

  all(): CommandLogEntry[] {
    return [...this.entries];
  }

  /** Timeline-ordered view (already chronological). */
  clear(): void {
    this.entries.length = 0;
    this.counter = 0;
  }
}

export interface EventRecord {
  event: string;
  payload: unknown;
  at: number;
  seq: number;
}

export class EventMonitor {
  private readonly records: EventRecord[] = [];
  private seq = 0;

  constructor(private readonly now: () => number = () => Date.now()) {}

  record(event: string, payload: unknown): EventRecord {
    const rec: EventRecord = { event, payload, at: this.now(), seq: this.seq++ };
    this.records.push(rec);
    if (this.records.length > 1000) this.records.shift();
    return rec;
  }

  filter(event: string): EventRecord[] {
    return this.records.filter((r) => r.event === event);
  }

  all(): EventRecord[] {
    return [...this.records];
  }

  /** Distinct event names seen, with counts (for a "which events fire most" view). */
  counts(): Map<string, number> {
    const map = new Map<string, number>();
    for (const r of this.records) map.set(r.event, (map.get(r.event) ?? 0) + 1);
    return map;
  }

  clear(): void {
    this.records.length = 0;
    this.seq = 0;
  }
}

export interface ProfilerFrame {
  phase: string;
  durationMs: number;
}

export interface PhaseStats {
  phase: string;
  count: number;
  min: number;
  max: number;
  avg: number;
  last: number;
}

export class Profiler {
  private readonly phases = new Map<string, number[]>();

  /** Record a phase duration (ms). */
  record(phase: string, durationMs: number): void {
    const list = this.phases.get(phase) ?? [];
    list.push(durationMs);
    // Keep a rolling window (last 200 samples).
    if (list.length > 200) list.shift();
    this.phases.set(phase, list);
  }

  /** Rolling stats per phase (deterministic). */
  stats(): PhaseStats[] {
    const out: PhaseStats[] = [];
    for (const [phase, samples] of [...this.phases.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      if (samples.length === 0) continue;
      const sum = samples.reduce((a, b) => a + b, 0);
      out.push({
        phase,
        count: samples.length,
        min: Math.min(...samples),
        max: Math.max(...samples),
        avg: sum / samples.length,
        last: samples[samples.length - 1],
      });
    }
    return out;
  }

  /** The total time spent in each phase (for "where does the frame go" views). */
  totals(): Map<string, number> {
    const map = new Map<string, number>();
    for (const [phase, samples] of this.phases.entries()) {
      map.set(phase, samples.reduce((a, b) => a + b, 0));
    }
    return map;
  }

  clear(): void {
    this.phases.clear();
  }
}
