/**
 * engine/commands/Command.ts — the command architecture.
 *
 * Every user/automation action becomes a `Command` with an `execute()` + `undo()`.
 * A CommandStack holds executed commands and supports undo/redo, so history
 * becomes *automatic* (no per-feature snapshot code), automation becomes
 * *replayable*, and collaboration becomes *possible* (commands are serializable).
 *
 * This is the central command system the studio needs: CreateEntity,
 * DeleteEntity, MoveEntity, EditSprite, ChangeTheme, LaunchToken, CreateQuest,
 * ImportAsset, ConnectWallet — all the same shape.
 */

export interface CommandContext {
  /** Shared state the command mutates (e.g. the EntityManager). */
  world: unknown;
}

export interface Command {
  /** Stable type tag (e.g. "entity.create"). */
  readonly type: string;
  /** Human-readable label for history/undo UI. */
  readonly label: string;
  /** Apply the command. */
  execute(ctx: CommandContext): void;
  /** Revert the command. */
  undo(ctx: CommandContext): void;
}

export interface SerializedCommand {
  type: string;
  label: string;
  payload: unknown;
}

/** A command that can serialize itself for persistence/replay. */
export interface SerializableCommand extends Command {
  serialize(): SerializedCommand;
}

export class CommandStack {
  private readonly undoStack: Command[] = [];
  private readonly redoStack: Command[] = [];
  private readonly capacity: number;

  constructor(capacity = 100) {
    this.capacity = capacity;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get undoDepth(): number {
    return this.undoStack.length;
  }

  get redoDepth(): number {
    return this.redoStack.length;
  }

  /** Execute a command and push it onto the undo stack (clearing redo). */
  execute(command: Command, ctx: CommandContext): void {
    command.execute(ctx);
    this.undoStack.push(command);
    if (this.undoStack.length > this.capacity) this.undoStack.shift();
    this.redoStack.length = 0;
  }

  /** Undo the most recent command. Returns the undone command or null. */
  undo(ctx: CommandContext): Command | null {
    const command = this.undoStack.pop();
    if (!command) return null;
    command.undo(ctx);
    this.redoStack.push(command);
    return command;
  }

  /** Redo the most recent undone command. Returns the redone command or null. */
  redo(ctx: CommandContext): Command | null {
    const command = this.redoStack.pop();
    if (!command) return null;
    command.execute(ctx);
    this.undoStack.push(command);
    return command;
  }

  /** Labels of the undo stack (newest first) for the history/timeline UI. */
  undoLabels(): string[] {
    return [...this.undoStack].reverse().map((c) => c.label);
  }

  /** Labels of the redo stack (newest first). */
  redoLabels(): string[] {
    return [...this.redoStack].reverse().map((c) => c.label);
  }

  clear(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
  }
}
