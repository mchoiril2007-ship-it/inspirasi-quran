// Terapkan pemecahan per poin ke halaman surat yang sudah ada: node scripts/pointify.mjs
import fs from 'node:fs';
import path from 'node:path';
import { pointifyMap } from './sync/points.mjs';
const dir = path.join(process.cwd(), 'content', 'surat');
for (const f of fs.readdirSync(dir)) {
  const p = path.join(dir, f);
  const d = JSON.parse(fs.readFileSync(p, 'utf8'));
  const before = JSON.stringify(d.blocks);
  d.blocks = pointifyMap(d.blocks);
  if (JSON.stringify(d.blocks) !== before) {
    fs.writeFileSync(p, JSON.stringify(d, null, 1) + '\n');
    console.log('diubah', f);
  }
}
