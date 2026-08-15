/**
 * engine/automation/AutomationEngine.ts — the automation/workflow engine.
 *
 * A workflow is a named sequence of steps. A step is either a command (runs
 * through the CommandStack, so it's undoable + replayable) or a trigger (a
 * conditional gate: when its predicate passes, the workflow advances). This is
 * the "no code required" automation backbone — e.g. player enters district →
 * trigger quest → play dialogue → mint NFT → update wallet → notify.
 *
 * Pure + deterministic. Time + randomness are injectable.
 */

import { CommandStack, type Command, type CommandContext } from '../commands/Command';

export type StepId = string;

export interface CommandStep {
  id: StepId;
  kind: 'command';
  command: Command;
}

export interface TriggerStep {
  id: StepId;
  kind: 'trigger';
  /** A predicate over the shared context. */
  condition: (ctx: unknown) => boolean;
  label?: string;
}

export type WorkflowStep = CommandStep | TriggerStep;

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
}

export type WorkflowStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed';

export interface AutomationEngineOptions {
  /** Max steps executed per `run()` call (safety). */
  maxStepsPerRun?: number;
}

export class AutomationEngine {
  private readonly workflows = new Map<string, Workflow>();
  private readonly statuses = new Map<string, WorkflowStatus>();
  private readonly stepIndexes = new Map<string, number>();
  private readonly maxStepsPerRun: number;

  constructor(private readonly stack: CommandStack, options: AutomationEngineOptions = {}) {
    this.maxStepsPerRun = options.maxStepsPerRun ?? 100;
  }

  /** Register a workflow (replaces a same-id workflow). */
  register(workflow: Workflow): void {
    this.workflows.set(workflow.id, workflow);
    this.statuses.set(workflow.id, 'idle');
    this.stepIndexes.set(workflow.id, 0);
  }

  get(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  list(): Workflow[] {
    return [...this.workflows.values()];
  }

  status(id: string): WorkflowStatus {
    return this.statuses.get(id) ?? 'idle';
  }

  reset(id: string): void {
    this.statuses.set(id, 'idle');
    this.stepIndexes.set(id, 0);
  }

  /**
   * Run a workflow until it completes, pauses on a failing trigger, or hits the
   * per-run step cap. Command steps execute through the CommandStack (undoable);
   * trigger steps gate further progress.
   */
  run(id: string, ctx: CommandContext): { status: WorkflowStatus; stepsRun: number } {
    const workflow = this.workflows.get(id);
    if (!workflow) return { status: 'failed', stepsRun: 0 };

    let index = this.stepIndexes.get(id) ?? 0;
    let stepsRun = 0;
    this.statuses.set(id, 'running');

    while (index < workflow.steps.length && stepsRun < this.maxStepsPerRun) {
      const step = workflow.steps[index];
      if (step.kind === 'command') {
        this.stack.execute(step.command, ctx);
        index += 1;
        stepsRun += 1;
      } else {
        // Trigger step: pause here if the condition isn't met.
        if (!step.condition(ctx)) {
          this.stepIndexes.set(id, index);
          this.statuses.set(id, 'paused');
          return { status: 'paused', stepsRun };
        }
        index += 1;
      }
    }

    this.stepIndexes.set(id, index);
    if (index >= workflow.steps.length) {
      this.statuses.set(id, 'completed');
      return { status: 'completed', stepsRun };
    }
    // hit the cap
    this.statuses.set(id, 'running');
    return { status: 'running', stepsRun };
  }
}
