/** Command-backed universal object editing. Every StudioObject edit participates
 * in the same undo/redo timeline as entity and scene edits. */
import type { Command, CommandContext } from '../commands/Command';
import { CommandStack } from '../commands/Command';
import { StudioProject, type StudioObject } from './StudioProject';

export interface StudioObjectCommandContext extends CommandContext {
  studioProject: StudioProject;
}

type ObjectInput = Omit<StudioObject, 'updatedAt'>;

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)) as T; }

class UpsertStudioObjectCommand implements Command {
  readonly type = 'studio-object.upsert';
  readonly label: string;
  private previous: StudioObject | undefined;
  constructor(private readonly input: ObjectInput) { this.label = `Save ${input.kind}: ${input.name}`; }
  execute(ctx: CommandContext): void {
    const project = (ctx as StudioObjectCommandContext).studioProject;
    this.previous ??= project.get(this.input.id);
    project.upsert(clone(this.input));
  }
  undo(ctx: CommandContext): void {
    const project = (ctx as StudioObjectCommandContext).studioProject;
    if (this.previous) project.upsert(this.previous);
    else project.remove(this.input.id);
  }
}

class RemoveStudioObjectCommand implements Command {
  readonly type = 'studio-object.remove';
  readonly label: string;
  private previous: StudioObject | undefined;
  constructor(private readonly id: string) { this.label = `Delete studio object: ${id}`; }
  execute(ctx: CommandContext): void {
    const project = (ctx as StudioObjectCommandContext).studioProject;
    this.previous ??= project.get(this.id);
    project.remove(this.id);
  }
  undo(ctx: CommandContext): void {
    if (this.previous) (ctx as StudioObjectCommandContext).studioProject.upsert(this.previous);
  }
}

export class StudioObjectEditor {
  constructor(private readonly project: StudioProject, private readonly commands: CommandStack) {}
  private context(): StudioObjectCommandContext { return { world: this.project, studioProject: this.project }; }
  save(input: ObjectInput): StudioObject {
    this.commands.execute(new UpsertStudioObjectCommand(input), this.context());
    return this.project.get(input.id) as StudioObject;
  }
  remove(id: string): void { this.commands.execute(new RemoveStudioObjectCommand(id), this.context()); }
}
