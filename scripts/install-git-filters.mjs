// Registers the sample-cards Git filter in this clone's local Git config.
// Runs from npm postinstall; outside a Git checkout it does nothing.
import { execFileSync } from 'node:child_process';

const git = (...args) => execFileSync('git', args, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
try {
  git('rev-parse', '--is-inside-work-tree');
  git('config', 'filter.sample-cards.clean', 'node scripts/registry-clean.mjs');
  // A required filter needs a checkout step too; files are checked out unchanged.
  git('config', 'filter.sample-cards.smudge', 'node -e "process.stdin.pipe(process.stdout)"');
  git('config', 'filter.sample-cards.required', 'true');
  console.log('[iaar] Git keeps personal Workspace cards out of commits.');
} catch {
  // No Git, or not a checkout: nothing to configure.
}
