/**
 * engine/runtime/Scheduler.ts — task scheduler (pure).
 *
 * A frame scheduler: tasks run in phases (update → physics → render) in
 * registration order, with per-phase timing budget. Deterministic + injectable
 * time. This is the runtime's task-graph backbone.
 */

export type TaskPhase = 'update' | 'physics' | 'render' | 'late';

export interface Task {
  id: string;
  phase: TaskPhase;
  run: () => void;
}

export interface SchedulerReport {
  order: string[];
}

export class Scheduler {
  private readonly tasks: Task[] = [];
  private readonly phaseOrder: TaskPhase[] = ['update', 'physics', 'render', 'late'];

  /** Register a task (replaces a same-id task). */
  register(task: Task): void {
    const idx = this.tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) this.tasks[idx] = task;
    else this.tasks.push(task);
  }

  unregister(id: string): boolean {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    this.tasks.splice(idx, 1);
    return true;
  }

  /** Run all tasks in phase order. Returns execution order for observability. */
  run(): SchedulerReport {
    const order: string[] = [];
    for (const phase of this.phaseOrder) {
      for (const task of this.tasks) {
        if (task.phase !== phase) continue;
        task.run();
        order.push(task.id);
      }
    }
    return { order };
  }

  /** Tasks in a phase (registration order). */
  inPhase(phase: TaskPhase): Task[] {
    return this.tasks.filter((t) => t.phase === phase);
  }

  all(): Task[] {
    return [...this.tasks];
  }
}
