// Pencocokan teks bebas (nama file naskah, judul video YouTube) dengan nama surat.
// "Al-Ikhlas", "Al Ikhlas", "Ikhlas", "Surah Al Ikhlaas" dianggap sama.
import SURAH from './surah-data.mjs';

const ARTICLES = new Set(['al', 'an', 'ar', 'as', 'asy', 'ash', 'at', 'ad', 'adz', 'az', 'ats', 'el', 'ad', 'aš']);
const CONTEXT = new Set(['surat', 'surah', 'suroh', 'sura', 'qs', 'q', 'quran']);

// Nama surat yang juga kata umum (nama nabi, waktu shalat, dll). Hanya dianggap cocok
// bila didahului "surat/surah/QS" atau ditulis dengan awalan "Al-/An-/...".
const AMBIGUOUS = new Set([
  'yunus', 'hud', 'yusuf', 'ibrahim', 'maryam', 'muhammad', 'nuh', 'luqman', 'saba', 'taha', 'sad', 'qaf',
  'fajr', 'asr', 'duha', 'lail', 'qadr', 'hajj', 'nur', 'fath', 'nasr', 'insan', 'jinn', 'tin', 'fil', 'rum',
  'mulk', 'qalam', 'hadid', 'najm', 'qamar', 'balad', 'syams', 'nas', 'taubah', 'quraisy', 'hijr', 'kahf', 'naml',
  'munafik', 'munafiqin', 'syuara', 'ala', 'haqqah', 'zumar', 'saff', 'tur', 'naba', 'lahab', 'falaq', 'kautsar', 'alaq', 'talaq', 'hasyr', 'ahzab',
].map((w) => fold(w)));

export function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’‘`ʼʿʾ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Menyamakan variasi transliterasi: sy/sh/ts→s, dz→z, dh→d, th→t, gh→g, kh→h, q→k, huruf ganda, h di akhir.
export function fold(word) {
  let w = word.replace(/[^a-z]/g, '');
  w = w
    .replace(/aw/g, 'au')
    .replace(/sy|sh|ts/g, 's')
    .replace(/dz/g, 'z')
    .replace(/dh/g, 'd')
    .replace(/th/g, 't')
    .replace(/gh/g, 'g')
    .replace(/kh/g, 'h')
    .replace(/q/g, 'k')
    .replace(/e/g, 'i')
    .replace(/o/g, 'u')
    .replace(/(.)\1+/g, '$1');
  if (w.length > 3) w = w.replace(/h$/, '');
  return w;
}

function keyOf(phrase) {
  const toks = normalize(phrase).split(' ').filter(Boolean);
  while (toks.length > 1 && ARTICLES.has(toks[0])) toks.shift();
  return fold(toks.join(''));
}

const KEY_TO_SURAH = new Map();
for (const s of SURAH) {
  for (const variant of [s.name, ...s.aliases]) {
    const k = keyOf(variant);
    if (k && !KEY_TO_SURAH.has(k)) KEY_TO_SURAH.set(k, s);
  }
}

export function surahByNumber(n) {
  return SURAH[n - 1] || null;
}
export function surahBySlug(slug) {
  return SURAH.find((s) => s.slug === slug) || null;
}
export function surahByName(name) {
  return KEY_TO_SURAH.get(keyOf(name)) || null;
}

/**
 * Cari surat di dalam teks. strict=true (untuk judul video) menolak kata umum tanpa konteks.
 * Mengembalikan objek surat atau null.
 */
export function findSurah(text, { strict = true, requireContext = false } = {}) {
  const toks = normalize(text).split(' ').filter(Boolean);
  // Nomor surat: "QS 63", "Surat ke 63", "Surah 63"
  for (let i = 0; i < toks.length - 1; i++) {
    if (CONTEXT.has(toks[i])) {
      let j = i + 1;
      if (toks[j] === 'ke' && toks[j + 1]) j++;
      if (/^\d{1,3}$/.test(toks[j]) && +toks[j] >= 1 && +toks[j] <= 114) {
        const named = findByName(toks, strict, requireContext);
        return named || SURAH[+toks[j] - 1];
      }
    }
  }
  return findByName(toks, strict, requireContext);
}

function findByName(toks, strict, requireContext = false) {
  const candidates = [];
  for (let i = 0; i < toks.length; i++) {
    for (let len = 4; len >= 1; len--) {
      if (i + len > toks.length) continue;
      const phrase = toks.slice(i, i + len);
      let hadArticle = false;
      while (phrase.length > 1 && ARTICLES.has(phrase[0])) {
        phrase.shift();
        hadArticle = true;
      }
      if (ARTICLES.has(phrase[0]) || phrase.some((t) => CONTEXT.has(t))) continue;
      const key = fold(phrase.join(''));
      if (key.length < 2) continue;
      const s = KEY_TO_SURAH.get(key);
      if (!s) continue;
      const prev = toks[i - 1];
      const hasContext = hadArticle || (prev && CONTEXT.has(prev)) || (prev && ARTICLES.has(prev) && CONTEXT.has(toks[i - 2]));
      if (strict && AMBIGUOUS.has(key) && !hasContext) continue;
      if (requireContext && !hasContext) continue;
      candidates.push({ s, hasContext, len: phrase.length, pos: i });
      break;
    }
  }
  if (!candidates.length) return null;
  const withCtx = candidates.find((c) => c.hasContext);
  return (withCtx || candidates[0]).s;
}

const TAG_STOP = new Set(['allah', 'alah', 'suara', 'nas', 'tin', 'fil', 'rum', 'sad', 'nur', 'ala', 'insan', 'jin', 'qadar', 'fajar', 'asar', 'duha', 'malam'].map((w) => fold(w)));

/** Cocokkan satu hashtag/tag, mis. "#AlMunafiqun", "AshShaff", "surat yasin". */
export function findSurahInTag(tag) {
  const raw = String(tag || '').replace(/^#/, '');
  const spaced = findSurah(raw.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' '), { strict: true });
  if (spaced) return spaced;
  const t = normalize(raw).replace(/\s+/g, '');
  if (t.length < 3) return null;
  // Kata umum yang kebetulan mirip nama surat (Allah→Al-A'la, suara→Asy-Syu'ara') tidak dipakai tanpa awalan.
  const direct = TAG_STOP.has(fold(t)) ? null : KEY_TO_SURAH.get(fold(t));
  if (direct) return direct;
  for (const a of ['adz', 'asy', 'ash', 'ats', 'al', 'an', 'ar', 'as', 'at', 'ad', 'az']) {
    if (t.startsWith(a) && t.length > a.length + 2) {
      const s = KEY_TO_SURAH.get(fold(t.slice(a.length)));
      if (s) return s;
    }
  }
  if (t.startsWith('surat') || t.startsWith('surah')) return findSurahInTag(t.slice(5));
  if (t.startsWith('qs')) return findSurahInTag(t.slice(2));
  return null;
}

export { SURAH };
