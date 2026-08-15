import { describe, expect, it } from 'vitest';
import { CommandStack } from '../src/engine/commands/Command';
import { ProjectGraph } from '../src/engine/projects/ProjectGraph';
import { StudioObjectEditor } from '../src/engine/projects/StudioObjectEditor';
import { StudioProject } from '../src/engine/projects/StudioProject';

describe('StudioObjectEditor', () => {
  it('uses the shared command history for object creation, edits and deletion', () => {
    const commands = new CommandStack();
    const project = new StudioProject(new ProjectGraph(), () => 1);
    const editor = new StudioObjectEditor(project, commands);
    const input = { id: 'npc-ada', kind: 'npc' as const, name: 'Ada', data: { portrait: 'ada.png' }, references: [] };
    editor.save(input);
    expect(project.get('npc-ada')?.name).toBe('Ada');
    expect(commands.undoLabels()[0]).toContain('Save npc');
    commands.undo({ world: {}, studioProject: project });
    expect(project.get('npc-ada')).toBeUndefined();
    commands.redo({ world: {}, studioProject: project });
    editor.remove('npc-ada');
    expect(project.get('npc-ada')).toBeUndefined();
    commands.undo({ world: {}, studioProject: project });
    expect(project.get('npc-ada')?.data).toEqual({ portrait: 'ada.png' });
  });

  it('makes network and economy propagation one undoable transaction', () => {
    const commands = new CommandStack();
    const project = new StudioProject(new ProjectGraph(), () => 1);
    const editor = new StudioObjectEditor(project, commands);
    editor.configureNetwork('net', 'Testnet', { chainId: 1, rpcUrl: 'https://rpc.example', currency: 'ETH', gasToken: 'ETH' });
    editor.save({ id: 'shop', kind: 'npc', name: 'Shop', data: {}, references: [] });
    editor.createTokenAndBind('gold', 'Gold', { contract: '0xabc', networkId: 'net', decimals: 18, symbol: 'GOLD' });
    expect(project.get('shop')?.data.currencyToken).toBe('gold');
    commands.undo({ world: {}, studioProject: project });
    expect(project.get('gold')).toBeUndefined();
    expect(project.get('shop')?.data.currencyToken).toBeUndefined();
  });
});
