// Sinkron otomatis: Drive (naskah) + YouTube (video) + audio. Dijalankan tiap jam oleh GitHub Actions.
// Prinsip: kalau ada yang gagal, lewati dan catat; jangan pernah merusak isi web yang sudah ada.
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { makeBridge } from './bridge.mjs';
import { docxToRawBlocks } from './docx.mjs';
import { parseNaskah } from './parse.mjs';
import { buildScript, scriptHash, renderAudio } from './audio.mjs';
import { findSurah } from '../../lib/match.mjs';

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CONTENT = path.join(ROOT, 'content');
const SURAT_DIR = path.join(CONTENT, 'surat');
const WORK = path.join(ROOT, '.sync');
const MAX_AUDIO_PER_RUN = +(process.env.MAX_AUDIO_PER_RUN || 3);

const readJson = (f, d) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return d;
  }
};
const writeJson = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 1) + '\n');

fs.mkdirSync(WORK, { recursive: true });
const config = readJson(path.join(CONTENT, 'config.json'), {});
const status = {
  lastSync: new Date().toISOString(),
  bridge: 'belum diatur',
  naskah: [],
  audio: [],
  youtube: null,
  errors: [],
};
const log = (...a) => console.log('[sync]', ...a);

function loadDocs() {
  const docs = {};
  for (const f of fs.readdirSync(SURAT_DIR).filter((f) => f.endsWith('.json'))) {
    const d = readJson(path.join(SURAT_DIR, f), null);
    if (d) docs[d.slug] = d;
  }
  return docs;
}

async function syncNaskah(bridge) {
  const docs = loadDocs();
  const files = await bridge.list();
  log(`${files.length} naskah di Drive`);
  // Kelompokkan per surat; kalau ada dua file untuk surat yang sama, pakai yang terbaru.
  const bySlug = {};
  for (const f of files) {
    const s = findSurah(f.name.replace(/\.[a-z]+$/i, ''), { strict: false });
    if (!s) {
      status.naskah.push({ file: f.name, status: 'error', message: 'Nama file tidak cocok dengan nama surat mana pun. Ubah nama file, misalnya "Inspirasi Quran Al-Ikhlas".' });
      continue;
    }
    const prev = bySlug[s.slug];
    if (prev) {
      const older = prev.f.modifiedTime > f.modifiedTime ? f : prev.f;
      status.naskah.push({ file: older.name, slug: s.slug, status: 'warning', message: `Ada lebih dari satu naskah untuk ${s.name}; yang dipakai adalah yang terbaru.` });
      if (older === prev.f) bySlug[s.slug] = { f, s };
    } else bySlug[s.slug] = { f, s };
  }

  for (const { f, s } of Object.values(bySlug)) {
    const existing = docs[s.slug];
    if (existing?.source?.fileId === f.id && existing?.source?.modifiedTime === f.modifiedTime) {
      status.naskah.push({ file: f.name, slug: s.slug, status: 'ok', message: 'Tidak berubah' });
      continue;
    }
    try {
      log(`memproses ${f.name}`);
      const dl = await bridge.download(f.id);
      const raw = await docxToRawBlocks(dl.buffer);
      const doc = parseNaskah(raw, { fileName: f.name, surah: s });
      const ayahCount = doc.blocks.filter((b) => b.type === 'ayah').length;
      if (doc.blocks.length < 8) throw new Error('Isi naskah terlalu sedikit atau formatnya tidak terbaca');
      doc.source = { fileId: f.id, fileName: f.name, modifiedTime: f.modifiedTime, updatedAt: f.modifiedTime };
      writeJson(path.join(SURAT_DIR, `${s.slug}.json`), doc);
      status.naskah.push({ file: f.name, slug: s.slug, status: 'ok', message: existing ? `Diperbarui (${ayahCount} kutipan ayat)` : `Halaman baru dibuat (${ayahCount} kutipan ayat)` });
    } catch (e) {
      status.naskah.push({ file: f.name, slug: s.slug, status: 'error', message: 'Gagal diproses: ' + e.message });
    }
  }

  // Naskah yang sudah tidak ada di folder Drive → halamannya dihapus dari web (file Drive tidak disentuh).
  if (files.length > 0) {
    const liveIds = new Set(files.map((f) => f.id));
    for (const d of Object.values(docs)) {
      if (d.source?.fileId && !liveIds.has(d.source.fileId) && !bySlug[d.slug]) {
        fs.rmSync(path.join(SURAT_DIR, `${d.slug}.json`));
        status.naskah.push({ file: d.source.fileName, slug: d.slug, status: 'warning', message: 'Naskah tidak ada lagi di folder Drive, halaman disembunyikan dari web.' });
      }
    }
  }
}

async function syncVideos(bridge) {
  const handle = config.youtubeHandle || 'QuranInspiration';
  const videosFile = path.join(CONTENT, 'videos.json');
  try {
    const data = await bridge.videos(handle);
    const bySurah = {};
    const unmatched = [];
    for (const v of data.videos) {
      const s = findSurah(v.title, { strict: true });
      const item = { id: v.id, title: v.title, publishedAt: v.publishedAt };
      if (s) (bySurah[s.slug] ||= []).push(item);
      else unmatched.push(item);
    }
    for (const k of Object.keys(bySurah)) bySurah[k].sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
    unmatched.sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
    writeJson(videosFile, { channel: data.channel, bySurah, unmatched });
    status.youtube = { ok: true, channel: data.channel, total: data.videos.length, matched: data.videos.length - unmatched.length, unmatched: unmatched.length };
    log(`YouTube: ${data.videos.length} video, ${unmatched.length} belum cocok`);
  } catch (e) {
    status.youtube = { ok: false, message: e.message, suggestions: e.data?.suggestions || [] };
  }
}

async function haveTools() {
  try {
    await run('ffmpeg', ['-version']);
    await run('edge-tts', ['--help']);
    return true;
  } catch {
    return false;
  }
}

async function uploadRelease(file, name) {
  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) throw new Error('GITHUB_REPOSITORY tidak tersedia');
  try {
    await run('gh', ['release', 'view', 'audio', '--repo', repo]);
  } catch {
    await run('gh', ['release', 'create', 'audio', '--repo', repo, '--title', 'Audio Inspirasi Quran', '--notes', 'File audio dibuat otomatis oleh sinkron terjadwal. Jangan dihapus.', '--latest=false']);
  }
  const target = path.join(path.dirname(file), name);
  if (target !== file) fs.copyFileSync(file, target);
  await run('gh', ['release', 'upload', 'audio', target, '--clobber', '--repo', repo]);
  return `https://github.com/${repo}/releases/download/audio/${name}`;
}

async function syncAudio(bridge) {
  const docs = loadDocs();
  const audioFile = path.join(CONTENT, 'audio.json');
  const audio = readJson(audioFile, {});
  // Hapus audio untuk surat yang halamannya sudah tidak ada
  for (const slug of Object.keys(audio)) if (!docs[slug]) delete audio[slug];

  const todo = [];
  for (const doc of Object.values(docs).sort((a, b) => a.number - b.number)) {
    const segments = buildScript(doc);
    const hash = scriptHash(segments, config);
    if (audio[doc.slug]?.hash === hash) continue;
    todo.push({ doc, segments, hash });
  }
  if (!todo.length) {
    writeJson(audioFile, audio);
    return;
  }
  if (!(await haveTools())) {
    status.audio.push({ status: 'error', message: 'ffmpeg atau edge-tts tidak tersedia di mesin sinkron' });
    return;
  }
  for (const { doc, segments, hash } of todo.slice(0, MAX_AUDIO_PER_RUN)) {
    try {
      log(`membuat audio ${doc.slug} (${segments.length} segmen)`);
      const r = await renderAudio(doc, segments, config, WORK);
      const name = `${String(doc.number).padStart(3, '0')}-${doc.slug}.mp3`;
      const url = await uploadRelease(r.file, name);
      let driveId = audio[doc.slug]?.driveId || null;
      let driveNote = '';
      if (bridge) {
        try {
          driveId = (await bridge.uploadAudio(name, fs.readFileSync(r.file))).id;
        } catch (e) {
          driveNote = ' (salinan ke Drive gagal: ' + e.message + ')';
        }
      }
      audio[doc.slug] = { hash, url, file: name, duration: r.duration, chapters: r.chapters, driveId, generatedAt: new Date().toISOString() };
      writeJson(audioFile, audio);
      status.audio.push({ slug: doc.slug, status: driveNote ? 'warning' : 'ok', message: `Audio dibuat (${Math.round(r.duration / 60)} menit)${driveNote}` });
    } catch (e) {
      status.audio.push({ slug: doc.slug, status: 'error', message: 'Gagal membuat audio: ' + e.message });
    }
  }
  if (todo.length > MAX_AUDIO_PER_RUN) status.audio.push({ status: 'info', message: `${todo.length - MAX_AUDIO_PER_RUN} audio lagi menunggu giliran pada sinkron berikutnya.` });
  writeJson(audioFile, audio);
}

async function main() {
  const bridge = makeBridge(process.env.BRIDGE_URL || config.bridgeUrl, process.env.BRIDGE_KEY);
  if (bridge) {
    try {
      await bridge.ping();
      status.bridge = 'ok';
      await syncNaskah(bridge);
      await syncVideos(bridge);
    } catch (e) {
      status.bridge = 'error: ' + e.message;
      status.errors.push('Jembatan Google: ' + e.message);
    }
  } else {
    status.errors.push('Jembatan Google (Apps Script) belum diatur: BRIDGE_URL / BRIDGE_KEY kosong.');
  }
  if (process.env.SKIP_AUDIO !== '1') {
    try {
      await syncAudio(status.bridge === 'ok' ? bridge : null);
    } catch (e) {
      status.errors.push('Audio: ' + e.message);
    }
  }
  status.finishedAt = new Date().toISOString();
  writeJson(path.join(WORK, 'status.json'), status);
  log(JSON.stringify(status, null, 1));
}

main().catch((e) => {
  status.errors.push('Sinkron berhenti: ' + e.message);
  writeJson(path.join(WORK, 'status.json'), status);
  console.error(e);
  process.exitCode = 0; // jangan gagalkan workflow; status dicatat untuk halaman admin
});
