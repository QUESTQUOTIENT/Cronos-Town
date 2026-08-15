/**
 * features/editor/tools/entity-editor.ts — entity editor (pure).
 *
 * Entity CRUD through the command system: create/destroy/move/set-component all
 * become commands, so entity editing is undoable/redoable automatically. This is
 * the specialized entity editor on top of the generic ECS + CommandStack.
 */
import { EntityManager } from '../../../engine/entity/EntityManager';
import { CommandStack, type CommandContext } from '../../../engine/commands/Command';
import {
  CreateEntityCommand,
  DeleteEntityCommand,
  MoveEntityCommand,
  SetComponentCommand,
} from '../../../engine/commands/builtins';

export interface EntityEditorContext extends CommandContext {
  world: EntityManager;
}

export class EntityEditor {
  constructor(
    private readonly world: EntityManager,
    private readonly stack: CommandStack,
  ) {}

  private ctx(): EntityEditorContext {
    return { world: this.world };
  }

  create(x = 0, y = 0): number {
    // Create then position via two commands (both undoable).
    this.stack.execute(new CreateEntityCommand(), this.ctx());
    const ids = this.world.entityIds();
    const id = ids[ids.length - 1];
    this.stack.execute(new SetComponentCommand(id, { type: 'transform', x, y }), this.ctx());
    return id;
  }

  destroy(id: number): void {
    this.stack.execute(new DeleteEntityCommand(id), this.ctx());
  }

  move(id: number, x: number, y: number): void {
    this.stack.execute(new MoveEntityCommand(id, { x, y }), this.ctx());
  }

  setComponent<T>(id: number, component: T): void {
    this.stack.execute(new SetComponentCommand(id, component), this.ctx());
  }

  undo(): boolean {
    return this.stack.undo(this.ctx()) !== null;
  }

  redo(): boolean {
    return this.stack.redo(this.ctx()) !== null;
  }

  get canUndo(): boolean {
    return this.stack.canUndo;
  }

  get canRedo(): boolean {
    return this.stack.canRedo;
  }
}
