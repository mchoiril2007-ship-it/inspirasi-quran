// Membuat contoh audio pendek (±1 menit) untuk didengar sebelum semua audio dibuat ulang.
// Pakai: node scripts/sample-audio.mjs <slug> <voice> <kamus:1|0> <rate> <pitch> <output.mp3>
import fs from 'node:fs';
import path from 'node:path';
import { buildScript, renderAudio } from './sync/audio.mjs';
import { loadDict } from './sync/pronounce.mjs';

const [slug = 'at-taghabun', voice = 'id-ID-ArdiNeural', useDict = '1', rate = '-4%', pitch = '+0Hz', out = 'contoh.mp3'] = process.argv.slice(2);
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const doc = JSON.parse(fs.readFileSync(path.join(root, 'content/surat', slug + '.json'), 'utf8'));
const config = { ...JSON.parse(fs.readFileSync(path.join(root, 'content/config.json'), 'utf8')), ttsVoice: voice, ttsRate: rate, ttsPitch: pitch };
const dict = useDict === '1' ? loadDict(path.join(root, 'content/pelafalan.json')) : null;
const all = buildScript(doc, dict);

// Ambil pembuka + bagian ayat pertama sampai ±650 karakter narasi
const start = all.findIndex((s) => s.chapter && /^Ayat\s+\d/i.test(s.chapter));
const picked = [all[0], { kind: 'silence', ms: 700 }];
let chars = 0;
for (const s of all.slice(start)) {
  picked.push(s);
  if (s.kind === 'tts') chars += s.text.length;
  if (chars > 650 && s.kind === 'tts') break;
}
console.log(picked.filter((s) => s.kind === 'tts').map((s) => '• ' + s.text).join('\n'));
const work = path.join(root, '.sync', 'sample');
fs.mkdirSync(work, { recursive: true });
const r = await renderAudio({ ...doc, slug: 'contoh' }, picked, config, work);
fs.copyFileSync(r.file, out);
console.log('selesai:', out, r.duration + ' detik');
