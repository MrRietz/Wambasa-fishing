import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const requiredFolders = ['source', 'generated', 'processed', 'runtime'].map((stage) => join(root, 'public/assets', stage, 'units'));
for (const folder of requiredFolders) {
  assert.ok(existsSync(folder), `Missing unit asset pipeline folder: ${folder}`);
}

const manifestPath = join(root, 'public/assets/runtime/units/unit-animation-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

assert.equal(manifest.schemaVersion, 1, 'Unexpected unit animation manifest schema.');
assert.deepEqual(manifest.frameSize, { width: 64, height: 64 }, 'Runtime unit frames must be normalized to 64x64.');
assert.deepEqual(manifest.anchor, { x: 0.5, y: 0.82 }, 'Runtime unit anchor must stay consistent.');
assert.deepEqual(manifest.directions, ['east', 'south', 'west', 'north'], 'Directions must use RTS 4-way naming.');

for (const [unit, actions] of Object.entries(manifest.requiredActions)) {
  const definition = manifest.units[unit];
  assert.ok(definition, `Missing animation definition for ${unit}.`);
  assert.ok(/^#[0-9a-f]{6}$/i.test(definition.palette.body), `${unit} body palette must be a hex color.`);
  for (const action of actions) {
    const animation = definition.actions[action];
    assert.ok(animation, `${unit} missing required ${action} animation.`);
    assert.ok(Number.isInteger(animation.frameCount) && animation.frameCount >= 2, `${unit}/${action} must have at least 2 frames.`);
    assert.ok(Number.isInteger(animation.fps) && animation.fps > 0, `${unit}/${action} must have positive fps.`);
    const extension = definition.format ?? 'svg';
    assert.ok(['svg', 'png'].includes(extension), `${unit} runtime format must be svg or png.`);
    for (const direction of manifest.directions) {
      for (let frame = 0; frame < animation.frameCount; frame += 1) {
        const framePath = join(root, 'public/assets/runtime/units', unit, action, direction, `${String(frame).padStart(2, '0')}.${extension}`);
        assert.ok(existsSync(framePath), `Missing runtime sprite frame: ${framePath}`);
      }
    }
  }
}

const requiredVehicleFrames = {
  truck: { move: 4, harvest: 4 },
  boat: { move: 4, fish: 5 },
};
for (const [unit, actions] of Object.entries(requiredVehicleFrames)) {
  for (const [action, frameCount] of Object.entries(actions)) {
    for (const direction of manifest.directions) {
      for (let frame = 0; frame < frameCount; frame += 1) {
        const framePath = join(root, 'public/assets/runtime/units', unit, action, direction, `${String(frame).padStart(2, '0')}.png`);
        assert.ok(existsSync(framePath), `Missing runtime vehicle sprite frame: ${framePath}`);
      }
    }
  }
}

const requiredBuildingSprites = [
  'public/assets/runtime/g8-production/buildings/factory-command-center-v1.png',
  'public/assets/runtime/g8-production/buildings/dock-v1.png',
  'public/assets/runtime/g8-production/buildings/house-v1.png',
  'public/assets/runtime/g8-production/buildings/guard-tower-v1.png',
];
for (const spritePath of requiredBuildingSprites) {
  assert.ok(existsSync(join(root, spritePath)), `Missing runtime building sprite: ${spritePath}`);
}

console.log('ok - unit animation manifest folders and metadata are valid');
