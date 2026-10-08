// Compares two .heapsnapshot files by constructor/name counts and self size.
// Usage: node scripts/profiling/heap-snapshot-diff.mjs early.heapsnapshot late.heapsnapshot [top=30]
import fs from 'node:fs';

function summarize(file) {
  const snap = JSON.parse(fs.readFileSync(file, 'utf8'));
  const fields = snap.snapshot.meta.node_fields;
  const types = snap.snapshot.meta.node_types[0];
  const stride = fields.length;
  const typeIdx = fields.indexOf('type');
  const nameIdx = fields.indexOf('name');
  const sizeIdx = fields.indexOf('self_size');
  const { nodes, strings } = snap;
  const byKey = new Map();
  for (let i = 0; i < nodes.length; i += stride) {
    const type = types[nodes[i + typeIdx]];
    if (type === 'hidden' || type === 'synthetic') continue;
    let name = type === 'object' || type === 'native' || type === 'closure' ? strings[nodes[i + nameIdx]] : `(${type})`;
    if (name.length > 60) name = `${name.slice(0, 57)}...`;
    const key = `${type}:${name}`;
    const entry = byKey.get(key) ?? { count: 0, size: 0 };
    entry.count += 1;
    entry.size += nodes[i + sizeIdx];
    byKey.set(key, entry);
  }
  return byKey;
}

const [earlyFile, lateFile, topArg] = process.argv.slice(2);
const top = Number(topArg ?? 30);
const early = summarize(earlyFile);
const late = summarize(lateFile);
const keys = new Set([...early.keys(), ...late.keys()]);
const rows = [...keys].map((key) => {
  const a = early.get(key) ?? { count: 0, size: 0 };
  const b = late.get(key) ?? { count: 0, size: 0 };
  return { key, early: a.count, late: b.count, dCount: b.count - a.count, dKb: (b.size - a.size) / 1024 };
});
const total = (m) => [...m.values()].reduce((s, e) => s + e.size, 0) / 1048576;
console.log(`self size total: early ${total(early).toFixed(1)} MB, late ${total(late).toFixed(1)} MB`);
console.log('\nTop growth by count:');
for (const r of rows.sort((x, y) => y.dCount - x.dCount).slice(0, top)) {
  console.log(`${String(r.dCount).padStart(8)} ${String(r.early).padStart(8)} -> ${String(r.late).padEnd(8)} ${r.dKb.toFixed(0).padStart(7)} KB  ${r.key}`);
}
console.log('\nTop growth by size:');
for (const r of rows.sort((x, y) => y.dKb - x.dKb).slice(0, top)) {
  console.log(`${r.dKb.toFixed(0).padStart(7)} KB ${String(r.early).padStart(8)} -> ${String(r.late).padEnd(8)} ${r.key}`);
}
