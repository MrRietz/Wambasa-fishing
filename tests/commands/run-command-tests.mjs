import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';

const outfile = resolve('.tmp-command-tests/command-validation.spec.mjs');
await mkdir(dirname(outfile), { recursive: true });

await build({
  entryPoints: ['tests/commands/command-validation.spec.ts'],
  outfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: 'inline',
  logLevel: 'silent',
});

await import(`${pathToFileURL(outfile).href}?cacheBust=${Date.now()}`);

const pathfindingOutfile = resolve('.tmp-command-tests/pathfinding-performance.spec.mjs');
await build({
  entryPoints: ['tests/commands/pathfinding-performance.spec.ts'],
  outfile: pathfindingOutfile,
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: 'inline',
  logLevel: 'silent',
});
await import(`${pathToFileURL(pathfindingOutfile).href}?cacheBust=${Date.now()}`);
