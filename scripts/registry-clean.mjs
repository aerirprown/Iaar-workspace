// Git clean filter for workspace/workspace.json: Git stores only the starter
// cards (`sample: true`), so personal projects never reach a commit while the
// app keeps reading the full local registry. Installed by install-git-filters.mjs.
let source = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { source += chunk; });
process.stdin.on('end', () => {
  try {
    const registry = JSON.parse(source);
    if (!Array.isArray(registry.entities)) throw new Error('No entities');
    registry.entities = registry.entities.filter(entity => entity?.sample === true);
    process.stdout.write(JSON.stringify(registry, null, 2) + '\n');
  } catch {
    // A half-written registry is passed through unchanged rather than lost.
    process.stdout.write(source);
  }
});
