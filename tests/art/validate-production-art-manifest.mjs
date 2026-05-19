import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const manifestPath = join(root, 'public/assets/runtime/g8-production/production-art-manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

assert.equal(manifest.schemaVersion, 1, 'Unexpected production art manifest schema.');
assert.ok(manifest.runtimeRoot.startsWith('/assets/runtime/g8-production/'), 'Runtime root must stay inside runtime assets.');

const requiredGroups = ['backdrop', 'buildings', 'units', 'resources', 'blockers', 'effects'];
for (const group of requiredGroups) {
  assert.ok(Array.isArray(manifest.requiredProductionBatch[group]), `Missing required production batch group: ${group}`);
  assert.ok(manifest.requiredProductionBatch[group].length > 0, `Production batch group must not be empty: ${group}`);
}

for (const [assetId, asset] of Object.entries(manifest.assets)) {
  assert.ok(asset.path, `Asset ${assetId} must declare a path.`);
  assert.ok(asset.kind, `Asset ${assetId} must declare a kind.`);
  assert.ok(asset.anchor, `Asset ${assetId} must declare an anchor.`);
  assert.ok(typeof asset.anchor.x === 'number' && typeof asset.anchor.y === 'number', `Asset ${assetId} anchor must be numeric.`);
  assert.ok(asset.notes, `Asset ${assetId} must include integration notes.`);
  assert.ok(asset.path.startsWith('/assets/'), `Asset ${assetId} path must stay within /assets.`);

  const diskPath = join(root, 'public', asset.path.replace(/^\/assets\//, 'assets/'));
  assert.ok(existsSync(diskPath), `Missing production art asset file: ${diskPath}`);

  if (asset.kind.includes('runtime') || asset.kind === 'building' || asset.kind === 'vehicle' || asset.kind === 'boat' || asset.kind === 'resource' || asset.kind === 'resource-marker' || asset.kind === 'terrain-prop' || asset.kind === 'effect' || asset.kind === 'unit-static') {
    assert.ok(!asset.path.includes('/generated/'), `Runtime-facing asset ${assetId} cannot point into generated assets.`);
  }
}

for (const assetId of manifest.requiredProductionBatch.buildings) {
  assert.ok(manifest.assets[assetId], `Missing required building asset entry: ${assetId}`);
}
for (const assetId of manifest.requiredProductionBatch.units) {
  assert.ok(manifest.assets[assetId], `Missing required unit asset entry: ${assetId}`);
}
for (const assetId of manifest.requiredProductionBatch.resources) {
  assert.ok(manifest.assets[assetId], `Missing required resource asset entry: ${assetId}`);
}
for (const assetId of manifest.requiredProductionBatch.blockers) {
  assert.ok(manifest.assets[assetId], `Missing required blocker asset entry: ${assetId}`);
}
for (const assetId of manifest.requiredProductionBatch.effects) {
  assert.ok(manifest.assets[assetId], `Missing required effect asset entry: ${assetId}`);
}

console.log('ok - production art manifest and runtime asset coverage are valid');
