// Membuat audio "podcast" satu surat dari naskah:
// - teks bahasa Indonesia dibacakan suara AI (Microsoft Edge Neural TTS, gratis, lewat paket edge-tts)
// - setiap kutipan ayat diganti rekaman murattal asli per ayat (EveryAyah, Syekh Abdurrahman As-Sudais)
// - setelah ayat, AI membacakan rujukan (QS. Surat: ayat) dan terjemahan Kemenag
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { applyDict } from './pronounce.mjs';

const run = promisify(execFile);
const AR = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]+/g;

export function speakable(text) {
  return String(text || '')
    .replace(/ﷺ/g, ' shallallahu alaihi wa sallam ')
    .replace(/\bSWT\b/g, 'subhanahu wa taala')
    .replace(/\(\s*Q\.?\s*S\.?\s*([^:()]+?)\s*:\s*(\d+)\s*[–-]\s*(\d+)\s*\)/g, '(Quran Surat $1 ayat $2 sampai $3)')
    .replace(/\(\s*Q\.?\s*S\.?\s*([^:()]+?)\s*:\s*(\d+)\s*\)/g, '(Quran Surat $1 ayat $2)')
    .replace(/\bQ\.?\s*S\.\s*/g, 'Quran Surat ')
    .replace(/(\d)\s*[–-]\s*(\d)/g, '$1 sampai $2')
    .replace(AR, ' ')
    .replace(/\(\s*[,;:]?\s*\)/g, ' ')
    .replace(/&/g, ' dan ')
    .replace(/@[\w.]+/g, ' ')
    .replace(/[◆•|]/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Susun daftar segmen audio dari struktur naskah. */
export function buildScript(doc, dict = null) {
  const seg = [];
  const say = (text, chapter) => {
    const t = dict ? applyDict(speakable(text), dict) : speakable(text);
    if (t && /[a-z0-9]/i.test(t)) seg.push({ kind: 'tts', text: t, chapter });
  };
  const pause = (ms) => seg.push({ kind: 'silence', ms });

  say(`${doc.title}. ${doc.tagline || ''}`, 'Pembuka');
  pause(900);
  for (const b of doc.blocks) {
    switch (b.type) {
      case 'h2':
        pause(900);
        say(`Bagian ${b.num || ''}. ${b.text}.`, b.text);
        pause(600);
        break;
      case 'h3':
        pause(700);
        say(b.text.replace(/^Ayat\s+(\d+)\s*[–-]\s*(\d+)\s*:/i, 'Ayat $1 sampai $2.').replace(/:/, '.') + '.', b.text);
        pause(400);
        break;
      case 'label':
        pause(300);
        say(b.text + '.');
        pause(200);
        break;
      case 'p':
      case 'faq':
      case 'li':
        say(b.type === 'li' ? `${b.n}. ${b.text}` : b.text);
        pause(250);
        break;
      case 'keyword':
        say(`${b.term}: ${b.text}`);
        pause(250);
        break;
      case 'callout':
        pause(300);
        say(`${b.label ? b.label + '. ' : ''}${b.text}`);
        pause(500);
        break;
      case 'table':
        for (const row of b.rows) {
          say(row.map((c, i) => (b.head[i] ? `${b.head[i]}: ${c}` : c)).join('. ') + '.');
          pause(300);
        }
        break;
      case 'ayah':
        pause(500);
        for (const a of b.ayahs) seg.push({ kind: 'ayah', surah: b.surahNumber, ayah: a });
        pause(500);
        say(`${b.ref.replace(/^QS\.\s*/, 'Quran Surat ').replace(/:\s*/, ', ayat ')}.`);
        pause(200);
        if (b.translation) say(b.translation);
        pause(600);
        break;
      default:
        break;
    }
  }
  return seg;
}

export function scriptHash(segments, config) {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify({ v: 2, voice: config.ttsVoice, rate: config.ttsRate, ...(config.ttsPitch ? { pitch: config.ttsPitch } : {}), reciter: config.reciter, segments }))
    .digest('hex')
    .slice(0, 16);
}

async function ffprobeDuration(file) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]);
  return parseFloat(stdout.trim()) || 0;
}

const NORM = ['-ar', '44100', '-ac', '1', '-c:a', 'pcm_s16le'];

async function tts(text, out, config) {
  const txt = out + '.txt';
  fs.writeFileSync(txt, text);
  for (let i = 0; i < 4; i++) {
    try {
      const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
      const args = ['--voice', config.ttsVoice, `--rate=${config.ttsRate}`, `--pitch=${config.ttsPitch || '+0Hz'}`, '--file', txt, '--write-media', out + '.mp3'];
      if (proxy) args.unshift('--proxy', proxy);
      await run('edge-tts', args, { timeout: 120000 });
      if (fs.statSync(out + '.mp3').size > 500) break;
    } catch (e) {
      if (i === 3) throw new Error('Suara AI gagal: ' + (e.stderr || e.message).slice(0, 200));
      await new Promise((r) => setTimeout(r, 3000 * (i + 1)));
    }
  }
  await run('ffmpeg', ['-y', '-v', 'error', '-i', out + '.mp3', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', ...NORM, out]);
}

async function murattal(surah, ayah, out, config, cacheDir) {
  const id = String(surah).padStart(3, '0') + String(ayah).padStart(3, '0');
  const cached = path.join(cacheDir, `${config.reciter}-${id}.mp3`);
  if (!fs.existsSync(cached)) {
    const urls = [`https://everyayah.com/data/${config.reciter}/${id}.mp3`, `https://everyayah.com/data/Abdurrahmaan_As-Sudais_192kbps/${id}.mp3`];
    let ok = false;
    for (const u of urls) {
      for (let i = 0; i < 3 && !ok; i++) {
        try {
          const res = await fetch(u);
          if (res.ok) {
            fs.writeFileSync(cached, Buffer.from(await res.arrayBuffer()));
            ok = true;
          }
        } catch {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
      if (ok) break;
    }
    if (!ok) throw new Error(`Rekaman murattal QS ${surah}:${ayah} tidak bisa diunduh`);
  }
  await run('ffmpeg', ['-y', '-v', 'error', '-i', cached, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', ...NORM, out]);
}

async function silence(ms, out) {
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', String(ms / 1000), ...NORM, out]);
}

async function pool(items, n, fn) {
  let idx = 0;
  const workers = Array.from({ length: n }, async () => {
    while (idx < items.length) {
      const i = idx++;
      await fn(items[i], i);
    }
  });
  await Promise.all(workers);
}

/** Membuat file mp3. Mengembalikan { file, duration, chapters }. */
export async function renderAudio(doc, segments, config, workDir) {
  const dir = path.join(workDir, doc.slug);
  const cacheDir = path.join(workDir, '_murattal');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  fs.mkdirSync(cacheDir, { recursive: true });

  const files = segments.map((_, i) => path.join(dir, String(i).padStart(4, '0') + '.wav'));
  await pool(segments, 6, async (s, i) => {
    if (s.kind === 'tts') await tts(s.text, files[i], config);
    else if (s.kind === 'ayah') await murattal(s.surah, s.ayah, files[i], config, cacheDir);
    else await silence(s.ms, files[i]);
  });

  // Hitung penanda bab (waktu mulai setiap judul)
  const chapters = [];
  let t = 0;
  for (let i = 0; i < segments.length; i++) {
    if (segments[i].chapter) chapters.push({ title: segments[i].chapter, start: Math.round(t) });
    t += await ffprobeDuration(files[i]);
  }

  const list = path.join(dir, 'list.txt');
  fs.writeFileSync(list, files.map((f) => `file '${f}'`).join('\n'));
  const out = path.join(workDir, `${doc.slug}.mp3`);
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c:a', 'libmp3lame', '-b:a', '64k', '-ar', '44100', '-ac', '1',
    '-metadata', `title=${doc.title}`, '-metadata', 'artist=Quran Inspiration', '-metadata', 'album=Inspirasi Quran', out], { maxBuffer: 1 << 26 });
  const duration = await ffprobeDuration(out);
  fs.rmSync(dir, { recursive: true, force: true });
  return { file: out, duration: Math.round(duration), chapters };
}
