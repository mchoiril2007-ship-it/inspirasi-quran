// Kamus pelafalan khusus suara AI (content/pelafalan.json). Teks di web tidak diubah.
import fs from 'node:fs';
import SURAH from '../../lib/surah-data.mjs';

export function loadDict(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return { manual: {}, otomatis: {} };
  }
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Ganti istilah sesuai kamus (entri terpanjang dulu, batas kata, tidak peka huruf besar/kecil). */
export function applyDict(text, dict) {
  const entries = { ...(dict.otomatis || {}), ...(dict.manual || {}) };
  const keys = Object.keys(entries).filter((k) => !k.startsWith('_') && entries[k]).sort((a, b) => b.length - a.length);
  if (!keys.length) return text;
  const lower = Object.fromEntries(keys.map((k) => [k.toLowerCase(), entries[k]]));
  const re = new RegExp(`(?<![\\p{L}'’])(${keys.map(esc).join('|')})(?![\\p{L}])`, 'giu');
  return text.replace(re, (m) => lower[m.toLowerCase()] ?? m);
}

// Ejaan otomatis sederhana untuk istilah baru: sambung kata sandang, "Allah" → "Alloh".
function autoSpell(term) {
  return term
    .replace(/^(Al|An|Ar|As|Asy|At|Ad|Az|Adz)-/i, '$1 ')
    .replace(/llah\b/gi, 'lloh')
    .replace(/’/g, "'");
}

const SURAH_NAMES = new Set(SURAH.flatMap((s) => [s.name, ...s.aliases]).map((x) => x.toLowerCase()));

/** Cari istilah Arab/Islami baru di naskah yang belum ada di kamus. */
export function collectTerms(doc, dict) {
  const known = new Set(Object.keys({ ...(dict.manual || {}), ...(dict.otomatis || {}) }).map((k) => k.toLowerCase()));
  const texts = [];
  for (const b of doc.blocks) {
    for (const k of ['text', 'term', 'translation', 'label']) if (typeof b[k] === 'string') texts.push(b[k]);
    if (b.type === 'table') texts.push(...b.head, ...b.rows.flat());
  }
  texts.push(doc.title, doc.tagline || '');
  const found = {};
  const add = (t) => {
    const term = t.replace(/[’]/g, "'").replace(/[.,;:!?)"”]+$/, '');
    if (term.length < 4 || known.has(term.toLowerCase()) || found[term]) return;
    found[term] = autoSpell(term);
  };
  for (const txt of texts) {
    const plain = txt.replace(/[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]+/g, ' ');
    // 1) Nama berkata sandang: Al-Kahfi, At-Taghabun, Ar-Rahman
    for (const m of plain.matchAll(/\b(?:Al|An|Ar|As|Asy|At|Ad|Az|Adz)-[A-Z][\p{L}'’]+/gu)) add(m[0]);
    // 2) Kata bercorak Arab: mengandung q, dz, kh, gh, th, apostrof di tengah, atau berakhiran -uun/-iin
    for (const m of plain.matchAll(/\b[\p{L}][\p{L}'’]{2,}\b/gu)) {
      const w = m[0];
      const lw = w.toLowerCase();
      if (/^(quran|qur'an|inspirasi)$/.test(lw)) continue;
      const proper = /^\p{Lu}/u.test(w);
      // Nama diri (huruf besar): q, dz, kh, th, gh (bukan "ngh"), apostrof. Kata biasa: hanya q, dz, apostrof, -uun/-iin.
      const arabProper = /q|dz|kh|th|(?<!n)gh|\p{L}['’]\p{L}/u.test(lw);
      const arabWord = /q|dz|\p{L}['’]\p{L}|uun$|iin$/u.test(lw);
      if ((proper ? arabProper : arabWord) && !known.has(lw) && !Object.keys(found).some((f) => f.toLowerCase() === lw)) add(w);
    }
  }
  // Nama surat yang muncul di naskah
  for (const txt of texts) for (const name of SURAH_NAMES) if (name.includes('-') && txt.toLowerCase().includes(name)) add(SURAH.find((s) => s.name.toLowerCase() === name)?.name || name);
  return found;
}
