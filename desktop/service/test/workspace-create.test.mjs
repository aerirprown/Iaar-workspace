import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { localDay, projectInput, Workspace } from '../workspace.mjs';
import { PROJECT_TYPES } from '../project-types.mjs';

async function repoWith(entities = []) {
  const repo = await mkdtemp(path.join(os.tmpdir(), 'iaar-create-'));
  await mkdir(path.join(repo, 'workspace'));
  await writeFile(path.join(repo, 'workspace/workspace.json'), JSON.stringify({ entities }));
  return repo;
}

test('a book project starts with its type tabs and is registered first', async () => {
  const repo = await repoWith([{ id: 'older', title: 'Older', folder: 'older', steps: [] }]);
  let changed = 0;
  const card = await new Workspace(repo, () => changed++).create(projectInput({ title: '  The  Long Night ', category: 'book', description: '' }));
  const { entities } = JSON.parse(await readFile(path.join(repo, 'workspace/workspace.json'), 'utf8'));
  const entity = entities[0];
  assert.equal(card.id, 'the-long-night');
  assert.equal(entity.title, 'The Long Night');
  assert.equal(entity.folder, `${localDay()}_the-long-night`);
  assert.deepEqual(entity.steps.map(step => step.name), ['Overview', 'Characters', 'Story Board', 'Chapters', 'World', 'Research']);
  assert.equal(entities[1].id, 'older');
  assert.equal(changed, 1);
  const files = await readdir(path.join(repo, 'workspace', entity.folder));
  assert.deepEqual(files.sort(), entity.steps.map(step => step.path).sort());
  assert.match(await readFile(path.join(repo, 'workspace', entity.folder, 'story-board.md'), 'utf8'), /^# The Long Night: Story Board\n/);
});

test('a repeated name gets a unique ID and folder', async () => {
  const repo = await repoWith();
  const workspace = new Workspace(repo);
  const [first, second] = await Promise.all([1, 2].map(() => workspace.create(projectInput({ title: 'Example Game', category: 'game' }))));
  assert.deepEqual([first.id, second.id], ['example-game', 'example-game-2']);
  assert.ok(PROJECT_TYPES.game.some(item => item.name === 'Art & Audio'));
  assert.ok(first.steps.some(step => step.name === 'Art & Audio'));
});

test('project input rejects unknown types, empty names and extra fields', () => {
  assert.throws(() => projectInput({ title: 'X', category: 'research' }), /project type/);
  assert.throws(() => projectInput({ title: '   ', category: 'app' }), /1 to 80/);
  assert.throws(() => projectInput({ title: 'X', category: 'app', folder: '../escape' }), /name and type/);
  assert.throws(() => projectInput({ title: 'X', category: 'toString' }), /project type/);
  assert.deepEqual(projectInput({ title: 'Site', category: 'website' }), { title: 'Site', category: 'website', description: '' });
});

test('deleting a card unregisters it and offers only its own folder for the Recycle Bin', async () => {
  const repo = await repoWith();
  const workspace = new Workspace(repo);
  const card = await workspace.create(projectInput({ title: 'Gone', category: 'dev' }));
  await mkdir(path.join(repo, 'workspace/_shared'));
  const { entities } = JSON.parse(await readFile(path.join(repo, 'workspace/workspace.json'), 'utf8'));
  entities.push({ id: 'root', title: 'Root', folder: '.', steps: [] }, { id: 'shared', title: 'Shared', folder: '_shared', steps: [] }, { id: 'escape', title: 'Escape', folder: '../outside', steps: [] });
  await writeFile(path.join(repo, 'workspace/workspace.json'), JSON.stringify({ entities }));
  const removed = await workspace.remove(card.id);
  assert.equal(removed.folder, await realpath(path.join(repo, 'workspace', `${localDay()}_gone`)));
  for (const id of ['root', 'shared', 'escape']) assert.equal((await workspace.remove(id)).folder, null, id);
  assert.deepEqual(JSON.parse(await readFile(path.join(repo, 'workspace/workspace.json'), 'utf8')).entities, []);
  await assert.rejects(workspace.remove('missing'), /not found/);
});

test('a folder shared with another card is kept when one of them is deleted', async () => {
  const repo = await repoWith([{ id: 'a', title: 'A', folder: 'both', steps: [] }, { id: 'b', title: 'B', folder: 'both/inner', steps: [] }]);
  await mkdir(path.join(repo, 'workspace/both/inner'), { recursive: true });
  assert.equal((await new Workspace(repo).remove('a')).folder, null);
});

test('a new tab is appended as a blank page with a unique file', async () => {
  const repo = await repoWith();
  const workspace = new Workspace(repo);
  const card = await workspace.create(projectInput({ title: 'Example Game', category: 'game' }));
  const added = await workspace.addTab(card.id, { name: ' Level  Ideas ' });
  const again = await workspace.addTab(card.id, { name: 'Overview' });
  const { entities } = JSON.parse(await readFile(path.join(repo, 'workspace/workspace.json'), 'utf8'));
  const steps = entities[0].steps;
  assert.equal(added.steps.at(-1).name, 'Level Ideas');
  assert.deepEqual(steps.slice(-2), [{ name: 'Level Ideas', path: 'level-ideas.md' }, { name: 'Overview', path: 'overview-2.md' }]);
  assert.equal(again.steps.length, 8);
  assert.equal(await readFile(path.join(repo, 'workspace', entities[0].folder, 'level-ideas.md'), 'utf8'), '# Example Game: Level Ideas\n');
  await assert.rejects(workspace.addTab(card.id, { name: '  ' }), /1 to 60/);
  await assert.rejects(workspace.addTab('missing', { name: 'X' }), /not found/);
});
