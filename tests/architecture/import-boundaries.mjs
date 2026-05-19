import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const srcRoot = join(root, 'src');

const tsFiles = listFiles(srcRoot).filter((file) => file.endsWith('.ts'));

const rules = [
  {
    name: 'simulation must stay independent from presentation systems',
    include: (file) => relative(srcRoot, file).replaceAll('\\', '/').startsWith('game/simulation/'),
    forbidden: [/from ['"]pixi\.js['"]/, /from ['"].*\/ui\//, /from ['"].*\/render\//, /from ['"].*\/audio\//],
  },
  {
    name: 'commands must not import Pixi',
    include: (file) => relative(srcRoot, file).replaceAll('\\', '/').startsWith('game/commands/'),
    forbidden: [/from ['"]pixi\.js['"]/],
  },
];

for (const rule of rules) {
  const violations = tsFiles
    .filter(rule.include)
    .flatMap((file) => {
      const text = readFileSync(file, 'utf8');
      return rule.forbidden
        .filter((pattern) => pattern.test(text))
        .map((pattern) => `${relative(root, file)} imports forbidden dependency matching ${pattern}`);
    });
  assert.deepEqual(violations, [], rule.name);
}

const mainText = readFileSync(join(srcRoot, 'main.ts'), 'utf8').trim();
assert.match(mainText, /createWambasaRtsApp/, 'src/main.ts should boot through createWambasaRtsApp.');
assert.ok(mainText.split(/\r?\n/).length <= 5, 'src/main.ts should remain a thin boot file.');

const createAppText = readFileSync(join(srcRoot, 'app/createApp.ts'), 'utf8');
assert.doesNotMatch(createAppText, /document\.createElement/, 'src/app/createApp.ts must not directly render DOM panel content; use src/game/ui/.');
assert.doesNotMatch(createAppText, /new Container\(/, 'src/app/createApp.ts must not construct Pixi render layers directly; use src/game/render/.');
assert.doesNotMatch(createAppText, /new (?:Graphics|Text)\(/, 'src/app/createApp.ts must not directly draw Pixi terrain/entities/debug labels; use src/game/render/.');
assert.doesNotMatch(
  createAppText,
  /\.fillRect\(|\.bezierCurveTo\(|\.arc\(/,
  'src/app/createApp.ts must not directly draw minimap canvas primitives; use src/game/ui/minimap/.',
);
assert.doesNotMatch(
  createAppText,
  /function draw(?:Building|Unit|Damage)|function animationFacingVector/,
  'src/app/createApp.ts must not own entity sprite/damage drawing helpers; use src/game/render/entityRenderer.ts.',
);

const createAppLines = createAppText.split(/\r?\n/).length;
assert.ok(createAppLines <= 2600, `src/app/createApp.ts is too large (${createAppLines} lines). Continue architecture extraction before adding gameplay.`);

function listFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? listFiles(path) : [path];
  });
}
