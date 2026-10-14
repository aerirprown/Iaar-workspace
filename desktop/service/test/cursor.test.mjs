import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { childEnvironment, cursorBinary, terminalCommand } from '../agents.mjs';
import { createCursorChat, cursorChatId } from '../cursor.mjs';
import { commandSearchRoots } from '../platform.mjs';

const id = 'a486e926-54e5-4adb-b6da-e50f636aac7d';

test('cursor chat ids are the UUID line create-chat prints', () => {
  assert.equal(cursorChatId(`warning\n${id}\n`), id);
  assert.equal(cursorChatId('not a chat'), null);
  assert.equal(cursorChatId(`see ${id} inside a sentence`), null);
});

test('cursor launch resumes one chat and bypasses prompts only when requested', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'iaar-cursor-'));
  const bin = path.join(home, 'bin');
  await mkdir(bin);
  const name = process.platform === 'win32' ? 'cursor-agent.exe' : 'cursor-agent';
  await writeFile(path.join(bin, name), '');
  const previousPath = process.env.PATH;
  const previousWindowsPath = process.env.Path;
  process.env.PATH = bin;
  process.env.Path = bin;
  try {
    assert.equal(cursorBinary({ PATH: bin, Path: bin }, home), path.join(bin, name));
    assert.deepEqual(terminalCommand('cursor', { bypass: true, resumeId: id, effort: 'xhigh' }).args, ['--resume', id, '--force']);
    assert.deepEqual(terminalCommand('cursor', { bypass: false }).args, []);
  } finally {
    if (previousPath === undefined) delete process.env.PATH; else process.env.PATH = previousPath;
    if (previousWindowsPath === undefined) delete process.env.Path; else process.env.Path = previousWindowsPath;
  }
});

test('an unrelated agent executable is not treated as the Cursor CLI', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'iaar-cursor-alias-'));
  const bin = path.join(home, 'bin');
  const install = path.join(home, 'cursor-agent');
  await mkdir(bin); await mkdir(install);
  const agentName = process.platform === 'win32' ? 'agent.exe' : 'agent';
  await writeFile(path.join(bin, agentName), '');
  assert.equal(cursorBinary({ PATH: bin, Path: bin }, home), null);
  await writeFile(path.join(install, agentName), '');
  assert.equal(cursorBinary({ PATH: install, Path: install }, home), path.join(install, agentName));
  if (process.platform === 'win32') assert.ok(commandSearchRoots({ LOCALAPPDATA: path.join(home, 'AppData', 'Local') }, home).includes(path.join(home, 'AppData', 'Local', 'cursor-agent')));
});

test('create-chat captures the printed id and stops a process that does not exit', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'iaar-cursor-chat-'));
  const bin = path.join(home, 'bin');
  await mkdir(bin);
  const name = process.platform === 'win32' ? 'cursor-agent.exe' : 'cursor-agent';
  const file = path.join(bin, name);
  await writeFile(file, '');
  let killed = false;
  const started = Date.now();
  const created = await createCursorChat({
    env: { PATH: bin, Path: bin }, cwd: home, timeoutMs: 2000,
    spawnImpl(spawnFile, args) {
      assert.equal(spawnFile, file);
      assert.deepEqual(args, ['create-chat', '--workspace', home]);
      const listeners = { exit: [], error: [] };
      return {
        stdout: { on(event, fn) { if (event === 'data') queueMicrotask(() => fn(`${id}\n`)); } },
        kill() { killed = true; for (const fn of listeners.exit) fn(null); },
        on(event, fn) { listeners[event].push(fn); },
      };
    },
  });
  assert.equal(created, id);
  assert.equal(killed, true);
  assert.ok(Date.now() - started < 1500);
});

test('create-chat returns null when the CLI exits without an id', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'iaar-cursor-empty-'));
  const bin = path.join(home, 'bin');
  await mkdir(bin);
  await writeFile(path.join(bin, process.platform === 'win32' ? 'cursor-agent.exe' : 'cursor-agent'), '');
  const created = await createCursorChat({
    env: { PATH: bin, Path: bin }, cwd: home, timeoutMs: 1000,
    spawnImpl: () => ({
      stdout: { on(event, fn) { if (event === 'data') queueMicrotask(() => fn('not signed in\n')); } },
      kill() {},
      on(event, fn) { if (event === 'exit') queueMicrotask(() => fn(1)); },
    }),
  });
  assert.equal(created, null);
});

test('cursor terminals do not inherit the host Cursor conversation', () => {
  const previous = {
    CURSOR_CONVERSATION_ID: process.env.CURSOR_CONVERSATION_ID,
    CURSOR_AGENT: process.env.CURSOR_AGENT,
    CURSOR_API_KEY: process.env.CURSOR_API_KEY,
  };
  process.env.CURSOR_CONVERSATION_ID = 'host-chat';
  process.env.CURSOR_AGENT = '1';
  process.env.CURSOR_API_KEY = 'account-key';
  try {
    const env = childEnvironment(path.join(os.tmpdir(), 'iaar-missing-repo'));
    assert.equal(env.CURSOR_CONVERSATION_ID, undefined);
    assert.equal(env.CURSOR_AGENT, undefined);
    assert.equal(env.CURSOR_API_KEY, 'account-key');
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
