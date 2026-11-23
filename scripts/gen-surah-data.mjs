// Membuat lib/surah-data.mjs dari data/surah.tsv (jalankan: node scripts/gen-surah-data.mjs)
import fs from 'node:fs';
const rows = fs.readFileSync(new URL('../data/surah.tsv', import.meta.url), 'utf8').trim().split('\n');
const list = rows.map((r) => {
  const [n, name, arabic, meaning, ayat, place, aliases] = r.split('\t');
  const slug = name.toLowerCase().replace(/['’]/g, '').replace(/\s+/g, '-');
  return { number: +n, name, slug, arabic, meaning, ayat: +ayat, place, aliases: aliases ? aliases.split('|') : [] };
});
fs.writeFileSync(new URL('../lib/surah-data.mjs', import.meta.url),
  '// File ini dibuat otomatis oleh scripts/gen-surah-data.mjs. Jangan diedit manual.\nconst SURAH = ' + JSON.stringify(list, null, 0).replace(/\},\{/g, '},\n{') + ';\nexport default SURAH;\n');
console.log(list.length, 'surat');
