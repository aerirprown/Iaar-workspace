import { existsSync } from 'node:fs';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PROJECT_TYPES, tabFile, tabMarkdown } from './project-types.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { realFile, saveJson, sleep } from './util.mjs';

const execute = promisify(execFile);
export const localDay = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const brief = ({ id, title, description, status, category, created, updated, pinned, steps }) => ({ id, title, description, status, category, created, updated, pinned: !!pinned, steps: (steps || []).map(({ name }, index) => ({ name, index })) });
const invalid = message => Object.assign(new Error(message), { status: 400 });

// Removes <script> and <style> blocks in one pass. A lazy regex up to the closing
// tag rescans the rest of the text for every unclosed opening tag, which lets a
// report stall the service. An unclosed block hides the rest, as it does in a browser.
export function stripCodeBlocks(text) {
  const opening = /<(script|style)\b/gi, closing = { script: /<\/script>/gi, style: /<\/style>/gi };
  let result = '', kept = 0, match;
  while ((match = opening.exec(text))) {
    const tagEnd = text.indexOf('>', opening.lastIndex);
    if (tagEnd < 0) break;
    const close = closing[match[1].toLowerCase()];
    close.lastIndex = tagEnd + 1;
    result += text.slice(kept, match.index) + ' ';
    if (!close.exec(text)) return result;
    kept = opening.lastIndex = close.lastIndex;
  }
  return result + text.slice(kept);
}

// UI requests can only change card metadata, never report paths or contents.
export function metadataPatch(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Object.keys(value).length || Object.keys(value).some(key => !['status', 'category', 'pinned'].includes(key))) {
    throw invalid('Choose a status, category or pin change.');
  }
  return value;
}

// UI requests create a card from a known project type; the service picks the
// ID, folder and tab files.
export function projectInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !['title', 'category', 'description'].includes(key))) throw invalid('Give the project a name and type.');
  const title = typeof value.title === 'string' ? value.title.trim().replace(/\s+/g, ' ') : '';
  const description = typeof value.description === 'string' ? value.description.trim().replace(/\s+/g, ' ') : '';
  if (!title || title.length > 80) throw invalid('Use a project name of 1 to 80 characters.');
  if (description.length > 300) throw invalid('Keep the description under 300 characters.');
  if (!Object.hasOwn(PROJECT_TYPES, value.category)) throw invalid(`Choose a project type: ${Object.keys(PROJECT_TYPES).join(', ')}.`);
  return { title, category: value.category, description };
}

export class Workspace {
  constructor(repo, changed = () => {}) { this.repo = repo; this.file = path.join(repo, 'workspace', 'workspace.json'); this.changed = changed; this.writes = Promise.resolve(); }
  async registry() {
    const registry = JSON.parse(await readFile(this.file, 'utf8'));
    if (!Array.isArray(registry.entities)) throw new Error('Workspace registry is not ready.');
    return registry;
  }
  async list({ query = '', date, status } = {}) {
    const { entities } = await this.registry();
    return entities.filter(item => (!query || `${item.id} ${item.title} ${item.description}`.toLowerCase().includes(query.toLowerCase())) && (!date || item.created === date || item.updated === date) && (!status || item.status === status)).map(brief);
  }
  async read(id, step = 0) {
    const entity = (await this.registry()).entities.find(item => item.id === id);
    if (!entity) throw new Error('Workspace card was not found.');
    const result = { ...brief(entity), text: '' };
    const selected = entity.steps?.[step];
    if (!selected) return result;
    const relative = path.join(entity.folder, selected.path.split('?')[0]);
    const { file } = await realFile(path.join(this.repo, 'workspace'), relative);
    if (!/\.(html?|md|txt)$/i.test(file) || (await stat(file)).size > 3 * 1024 * 1024) return { ...result, note: 'The card uses a visual or large report. Open it for the full content.' };
    const text = await readFile(file, 'utf8');
    result.text = stripCodeBlocks(text).replace(/<[^<>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim().slice(0, 12000);
    return result;
  }
  async activity(date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) throw new Error('Use a date in YYYY-MM-DD format.');
    const registry = await this.registry();
    const { stdout = '' } = await execute('git', ['log', `--since=${date}T00:00:00`, `--until=${date}T23:59:59`, '--format=%s', '--name-only', '--max-count=45', '--', 'workspace'], { cwd: this.repo, windowsHide: true, maxBuffer: 128 * 1024 }).catch(() => ({}));
    const lines = stdout.split(/\r?\n/).filter(Boolean);
    const paths = lines.filter(line => line.startsWith('workspace/'));
    const cards = registry.entities.filter(item => item.created === date || item.updated === date || paths.some(file => file.startsWith(`workspace/${item.folder}/`))).map(brief);
    return { date, cards, commits: [...new Set(lines.filter(line => !line.startsWith('workspace/')))].slice(0, 15), basis: 'Workspace dates and recorded Git changes; not a complete record of unsaved work.' };
  }
  update(id, patch) {
    return this.#serialize(async () => {
      if (patch.status !== undefined && !['active', 'done', 'archived'].includes(patch.status)) throw invalid('Use active, done or archived status.');
      if (patch.pinned !== undefined && typeof patch.pinned !== 'boolean') throw invalid('Pinned must be true or false.');
      if (patch.category !== undefined && (typeof patch.category !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(patch.category))) throw invalid('Use a category with lowercase letters, numbers and hyphens.');
      if (patch.status === undefined && patch.pinned === undefined && patch.category === undefined) throw invalid('Choose a status, category or pin change.');
      return this.#commit(registry => {
        const entity = registry.entities.find(item => item.id === id);
        if (!entity) throw Object.assign(new Error('Workspace card was not found.'), { status: 404 });
        if (patch.status !== undefined) entity.status = patch.status;
        if (patch.pinned !== undefined) entity.pinned = patch.pinned;
        if (patch.category !== undefined) entity.category = patch.category;
        entity.updated = localDay();
        return entity;
      });
    });
  }
  // Creates a dated card folder with the type's starter tabs, then registers it.
  create({ title, category, description }) {
    return this.#serialize(async () => {
      const { entities } = await this.registry();
      const base = title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/, '') || 'project';
      const day = localDay();
      let id = base;
      for (let n = 2; entities.some(item => item.id === id) || existsSync(path.join(this.repo, 'workspace', `${day}_${id}`)); n++) id = `${base}-${n}`;
      const folder = `${day}_${id}`, directory = path.join(this.repo, 'workspace', folder);
      const tabs = PROJECT_TYPES[category];
      await mkdir(directory);
      try {
        for (const item of tabs) await writeFile(path.join(directory, tabFile(item.name)), tabMarkdown(title, item), { flag: 'wx' });
        return await this.#commit(registry => {
          if (registry.entities.some(item => item.id === id)) throw new Error('Another task created a card with this name. Try again.');
          const entity = { id, title, description, type: 'group', category, created: day, updated: day, folder, steps: tabs.map(item => ({ name: item.name, path: tabFile(item.name) })), status: 'active', pinned: false, defaultStep: 0 };
          registry.entities.unshift(entity);
          return entity;
        });
      } catch (error) {
        await rm(directory, { recursive: true, force: true });
        throw error;
      }
    });
  }
  #serialize(task) {
    const operation = this.writes.catch(() => {}).then(task);
    this.writes = operation;
    return operation;
  }
  async #commit(apply) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const source = await readFile(this.file, 'utf8');
      const registry = JSON.parse(source);
      const entity = apply(registry);
      // Preserve other agents' latest registry changes instead of saving a stale snapshot.
      if (await readFile(this.file, 'utf8') !== source) continue;
      try { await saveJson(this.file, registry); }
      catch (error) {
        // Windows indexers/readers can briefly lock atomic replacements. Retry
        // from a fresh registry so another agent's edits are still retained.
        if (!['EPERM', 'EACCES', 'EBUSY'].includes(error.code) || attempt === 5) throw error;
        await sleep(40 * (attempt + 1));
        continue;
      }
      this.changed();
      return brief(entity);
    }
    throw new Error('Workspace is being updated by another task. Try the change again.');
  }
}
