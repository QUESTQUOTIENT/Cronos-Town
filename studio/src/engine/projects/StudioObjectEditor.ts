/** Command-backed universal object editing. Every StudioObject edit participates
 * in the same undo/redo timeline as entity and scene edits. */
import type { Command, CommandContext } from '../commands/Command';
import { CommandStack } from '../commands/Command';
import { StudioProject, type StudioObject, type StudioProjectSnapshot } from './StudioProject';

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

/** A transaction for operations that update several linked objects at once. */
class RestoreStudioProjectCommand implements Command {
  readonly type = 'studio-project.transaction';
  constructor(readonly label: string, private readonly before: StudioProjectSnapshot, private readonly after: StudioProjectSnapshot) {}
  execute(ctx: CommandContext): void { (ctx as StudioObjectCommandContext).studioProject.restore(this.after); }
  undo(ctx: CommandContext): void { (ctx as StudioObjectCommandContext).studioProject.restore(this.before); }
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

  configureNetwork(id: string, name: string, config: { chainId: number; rpcUrl: string; explorer?: string; currency: string; gasToken: string }): StudioObject {
    return this.transaction(`Configure network: ${name}`, () => this.project.configureNetwork(id, name, config), id);
  }

  createTokenAndBind(id: string, name: string, config: { contract: string; networkId: string; decimals: number; symbol: string }): { token: StudioObject; consumers: string[] } {
    const before = this.project.snapshot();
    const token = this.project.configureToken(id, name, config);
    const consumers = this.project.bindTokenToConsumers(id);
    const after = this.project.snapshot();
    this.project.restore(before);
    this.commands.execute(new RestoreStudioProjectCommand(`Create token and wire economy: ${name}`, before, after), this.context());
    return { token: this.project.get(token.id) as StudioObject, consumers };
  }

  private transaction(label: string, operation: () => StudioObject, id: string): StudioObject {
    const before = this.project.snapshot();
    operation();
    const after = this.project.snapshot();
    this.project.restore(before);
    this.commands.execute(new RestoreStudioProjectCommand(label, before, after), this.context());
    return this.project.get(id) as StudioObject;
  }
}
