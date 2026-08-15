/**
 * engine/commands/builtins.ts — the canonical command implementations.
 *
 * The concrete commands the studio ships with. Each is a self-contained
 * `execute`/`undo` pair, so global undo/redo, automation replay, and (later)
 * collaboration all work without any feature-specific history code.
 */
import type { Command, CommandContext, SerializableCommand, SerializedCommand } from './Command';

/**
 * A typed command context carrying the systems commands operate on. The studio
 * supplies a richer context; commands declare the shape they need.
 */
export interface EntityCommandContext extends CommandContext {
  world: EntityWorldLike;
}

export interface EntityWorldLike {
  createEntity(): number;
  destroyEntity(id: number): void;
  addComponent<T>(id: number, component: T): void;
  removeComponent(id: number, type: string): void;
  getComponent<T>(id: number, type: string): T | undefined;
}

/** CreateEntity — create an entity and undo by destroying it. */
export class CreateEntityCommand implements Command, SerializableCommand {
  readonly type = 'entity.create';
  readonly label = 'Create Entity';
  private createdId: number | null = null;

  execute(ctx: CommandContext): void {
    const world = (ctx as EntityCommandContext).world;
    this.createdId = world.createEntity();
  }

  undo(ctx: CommandContext): void {
    const world = (ctx as EntityCommandContext).world;
    if (this.createdId !== null) world.destroyEntity(this.createdId);
  }

  serialize(): SerializedCommand {
    return { type: this.type, label: this.label, payload: { createdId: this.createdId } };
  }
}

/** DeleteEntity — destroy an entity and undo by re-creating it (with components). */
export class DeleteEntityCommand implements Command, SerializableCommand {
  readonly type = 'entity.delete';
  readonly label = 'Delete Entity';
  private readonly id: number;
  private backup: Array<{ type: string; component: unknown }> | null = null;

  constructor(id: number) {
    this.id = id;
  }

  execute(ctx: CommandContext): void {
    const world = (ctx as EntityCommandContext).world;
    // Backup components before destruction so undo can restore them.
    this.backup = (world as unknown as { getComponents?(id: number): Array<{ type: string }> }).getComponents?.(this.id)?.map((c) => ({
      type: c.type,
      component: c,
    })) ?? null;
    world.destroyEntity(this.id);
  }

  undo(ctx: CommandContext): void {
    const world = (ctx as EntityCommandContext).world;
    const restored = world.createEntity();
    // Restore backed-up components onto the new entity (best effort).
    for (const { type, component } of this.backup ?? []) {
      world.addComponent(restored, { ...(component as object), type } as never);
    }
  }

  serialize(): SerializedCommand {
    return { type: this.type, label: this.label, payload: { id: this.id, backup: this.backup } };
  }
}

/** MoveEntity — change a transform component, undo restores the prior value. */
export class MoveEntityCommand implements Command, SerializableCommand {
  readonly type = 'entity.move';
  readonly label = 'Move Entity';
  private readonly id: number;
  private readonly to: { x: number; y: number };
  private previous: { x: number; y: number } | null = null;

  constructor(id: number, to: { x: number; y: number }) {
    this.id = id;
    this.to = to;
  }

  execute(ctx: CommandContext): void {
    const world = (ctx as EntityCommandContext).world;
    const current = world.getComponent<{ x: number; y: number }>(this.id, 'transform');
    this.previous = current ? { x: current.x, y: current.y } : null;
    world.addComponent(this.id, { type: 'transform', x: this.to.x, y: this.to.y });
  }

  undo(ctx: CommandContext): void {
    const world = (ctx as EntityCommandContext).world;
    if (this.previous) {
      world.addComponent(this.id, { type: 'transform', x: this.previous.x, y: this.previous.y });
    } else {
      world.removeComponent(this.id, 'transform');
    }
  }

  serialize(): SerializedCommand {
    return { type: this.type, label: this.label, payload: { id: this.id, to: this.to, previous: this.previous } };
  }
}

/** SetComponent — add/replace a component, undo restores the prior value. */
export class SetComponentCommand<T> implements Command, SerializableCommand {
  readonly type: string;
  readonly label: string;
  private readonly id: number;
  private readonly component: T;
  private previous: unknown | undefined;

  constructor(id: number, component: T) {
    this.id = id;
    this.component = component;
    this.type = `component.set`;
    this.label = `Set ${(component as { type?: string }).type ?? 'component'}`;
  }

  execute(ctx: CommandContext): void {
    const world = (ctx as EntityCommandContext).world;
    this.previous = world.getComponent(this.id, (this.component as { type: string }).type);
    world.addComponent(this.id, this.component);
  }

  undo(ctx: CommandContext): void {
    const world = (ctx as EntityCommandContext).world;
    const type = (this.component as { type: string }).type;
    if (this.previous !== undefined) {
      world.addComponent(this.id, this.previous as T);
    } else {
      world.removeComponent(this.id, type);
    }
  }

  serialize(): SerializedCommand {
    return { type: this.type, label: this.label, payload: { id: this.id, component: this.component, previous: this.previous } };
  }
}
