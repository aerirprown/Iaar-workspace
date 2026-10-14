import { spawn } from 'node:child_process';
import { cursorInvocation } from './agents.mjs';
import { processSpawnOptions } from './platform.mjs';

const cursorChatLine = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function cursorChatId(text) {
  const lines = String(text || '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index--) if (cursorChatLine.test(lines[index])) return lines[index];
  return null;
}

// `create-chat` prints a UUID and, on some CLI versions, keeps running.
// Capture the id and stop the process so opening a tab does not wait on it.
export function createCursorChat({ env = process.env, cwd, spawnImpl = spawn, timeoutMs = 8000 } = {}) {
  const command = cursorInvocation(['create-chat', '--workspace', cwd], env);
  if (!command || typeof cwd !== 'string' || !cwd) return Promise.resolve(null);
  return new Promise(resolve => {
    let output = '';
    let settled = false;
    let child;
    const finish = id => { if (!settled) { settled = true; clearTimeout(timer); resolve(id); } };
    const timer = setTimeout(() => { try { child?.kill(); } catch { /* already gone */ } finish(cursorChatId(output)); }, timeoutMs);
    try {
      child = spawnImpl(command.file, command.args, { cwd, env, stdio: ['ignore', 'pipe', 'pipe'], ...processSpawnOptions() });
    } catch { finish(null); return; }
    child.stdout?.on('data', chunk => {
      output += chunk;
      const id = cursorChatId(output);
      if (!id) return;
      try { child.kill(); } catch { /* already gone */ }
      finish(id);
    });
    child.on('error', () => finish(null));
    child.on('exit', () => finish(cursorChatId(output)));
  });
}
