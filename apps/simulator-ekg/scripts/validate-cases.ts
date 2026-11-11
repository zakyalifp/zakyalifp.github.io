import { validateAll } from './validate-lib';
const r = validateAll();
console.log(`Total ${r.total} kasus (nyata ${r.real}, sintetis ${r.synthetic})`);
for (const [c, v] of Object.entries(r.perCategory)) console.log(`  ${c.padEnd(12)} nyata ${v.nyata}  sintetis ${v.sintetis}`);
if (r.errors.length) {
  console.error(`\n${r.errors.length} masalah:`);
  for (const e of r.errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('Manifest valid ✓');
