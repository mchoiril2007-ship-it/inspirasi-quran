// Mengubah blok mentah naskah menjadi struktur halaman web (lihat content/surat/*.json).
import { findSurah, surahByName } from '../../lib/match.mjs';

const AR = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/g;
const LATIN = /[A-Za-z]/g;
export const isArabic = (s) => {
  const a = (s.match(AR) || []).length;
  const l = (s.match(LATIN) || []).length;
  return a > 3 && a > l * 2;
};

const LABELS = ['kata kunci', 'kenapa ayat ini ada di sini', 'cermin kehidupan', 'allah menjawab', 'coba hari ini'];
const CALLOUT_LABELS = /^(INTI PESAN SURAT|GOLDEN SENTENCE PENUTUP|GOLDEN SENTENCE|PESAN UTAMA|CATATAN)\s*:?\s*/;
const REF = /^\(?\s*Q\.?\s*S\.?\s*([^:()]+?)\s*:\s*([\d\s–\-,]+?)\s*\)?\s*$/i;
const KEYWORD = /^([^():]{2,90}?)\s*\(([^)]*[؀-ۿ][^)]*)\)\s*:\s*([\s\S]+)$/;
const H2 = /^(\d{1,2})\s*\\?\.\s+(\S.{1,70})$/;
const AYAT_HEADING = /^Ayat\s+\d+(\s*[–\-]\s*\d+)?\s*[:.]/i;

export const slugify = (s) =>
  s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

const endsLikeSentence = (s) => /[.!?:;,"”'’)\]]$/.test(s);

function isHeadingStyle(style) {
  return /heading|judul|title/i.test(style || '');
}

function cellText(paras) {
  return paras.map((p) => p.text).join('\n').trim();
}

function toCallout(paras) {
  let texts = paras.map((p) => p.text).filter(Boolean);
  let label = '';
  if (texts.length > 1 && /^[A-Z0-9 &:'’-]{4,40}$/.test(texts[0])) {
    label = texts.shift().replace(/:$/, '');
  } else if (texts.length) {
    const m = texts[0].match(CALLOUT_LABELS);
    if (m) {
      label = m[1];
      texts[0] = texts[0].slice(m[0].length);
    }
  }
  const text = texts.join('\n').trim();
  let variant = 'reflection';
  if (/GOLDEN/i.test(label)) variant = 'golden';
  else if (/RENUNG|REFLEKSI|PERTANYAAN|COBA/i.test(label)) variant = 'reflection';
  else if (label) variant = 'key';
  return { type: 'callout', variant, label: label ? titleCase(label) : '', text };
}

function titleCase(s) {
  return s.toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());
}

/**
 * @param raw blok mentah dari docx.mjs
 * @param meta { fileName }
 */
export function parseNaskah(raw, { fileName = '', surah: forced = null } = {}) {
  // 1) Pisahkan bagian sampul (sebelum heading bernomor pertama) dari isi.
  let firstH2 = raw.findIndex((b) => b.t === 'p' && H2.test(b.text) && !endsLikeSentence(b.text));
  if (firstH2 < 0) firstH2 = 0;
  const cover = raw.slice(0, firstH2).filter((b) => b.t === 'p').map((b) => b.text);
  const body = raw.slice(firstH2);
  const coverStart = raw.slice(0, firstH2);

  // Surat: dari judul sampul, lalu nama file
  const titleLine = cover.find((t) => /surat|surah/i.test(t)) || '';
  const surah = forced || findSurah(titleLine, { strict: false }) || findSurah(fileName.replace(/\.[a-z]+$/i, ''), { strict: false });
  if (!surah) throw new Error('Nama surat tidak dikenali dari judul atau nama file');

  const metaLine = cover.find((t) => /ayat/i.test(t) && /•|·|\|/.test(t)) || '';
  const authorLine = cover.find((t) => /@/.test(t)) || '';
  const tagline =
    cover.find(
      (t) =>
        !isArabic(t) &&
        t !== metaLine &&
        t !== authorLine &&
        !/^inspirasi quran/i.test(t) &&
        !/^(surat|surah)\b/i.test(t) &&
        t.length > 8,
    ) || '';

  // 2) Klasifikasi isi
  const blocks = [];
  let pendingArabic = null;
  const usedIds = new Set();
  const uid = (s) => {
    let id = slugify(s) || 'bagian';
    let i = 2;
    while (usedIds.has(id)) id = slugify(s) + '-' + i++;
    usedIds.add(id);
    return id;
  };

  for (let i = 0; i < body.length; i++) {
    const b = body[i];
    if (b.t === 'image') {
      const lastH2 = [...blocks].reverse().find((x) => x.type === 'h2');
      const altText = b.alt || (lastH2 && /peta/i.test(lastH2.text) ? `Peta struktur Surat ${surah.name}` : `Gambar dari naskah Surat ${surah.name}`);
      if (b.data && b.data.length > 2000) blocks.push({ type: 'image', alt: altText, width: Math.round(b.cx / 9525) || 0, height: Math.round(b.cy / 9525) || 0, ext: b.ext, data: b.data });
      continue;
    }
    if (b.t === 'table') {
      const rows = b.rows.filter((r) => r.some((c) => c.length));
      if (rows.length === 1 && rows[0].length === 1) {
        blocks.push(toCallout(rows[0][0]));
      } else if (rows.length) {
        const all = rows.map((r) => r.map(cellText));
        blocks.push({ type: 'table', head: all[0], rows: all.slice(1) });
      }
      continue;
    }
    const text = b.text.replace(/\\([.!\-*_#()[\]])/g, '$1').trim();
    if (!text) continue;

    // Ayat Arab → kutipan ayat (Arab, rujukan, terjemahan)
    if (isArabic(text)) {
      pendingArabic = text;
      const next = body[i + 1];
      const nextText = next?.t === 'p' ? next.text.replace(/\\/g, '') : '';
      const m = nextText.match(REF);
      if (m) {
        const ref = parseRef(m[1], m[2], surah);
        const trans = body[i + 2];
        const transText = trans?.t === 'p' && !isArabic(trans.text) && !REF.test(trans.text) && !LABELS.includes(trans.text.toLowerCase()) ? trans.text : '';
        // Beberapa paragraf Arab berturut-turut sebelum satu rujukan (mis. QS: 2–4) → satu kutipan
        const parts = [text];
        while (ref.ayahs.length > 1 && blocks.length && blocks[blocks.length - 1].type === 'arabic' && parts.length < ref.ayahs.length) {
          parts.unshift(blocks.pop().text);
        }
        blocks.push({
          type: 'ayah',
          arabic: parts.join('\n'),
          surahNumber: ref.surah.number,
          surahName: ref.surah.name,
          ayahs: ref.ayahs,
          ref: `QS. ${ref.surahLabel}: ${ref.ayahLabel}`,
          translation: transText.replace(/\\/g, ''),
        });
        i += transText ? 2 : 1;
        pendingArabic = null;
        continue;
      }
      blocks.push({ type: 'arabic', text });
      continue;
    }

    const lower = text.toLowerCase();
    if (/^[◆◇•*·\s-]{3,}$/.test(text)) {
      blocks.push({ type: 'divider' });
      continue;
    }
    if (/^[—–-]\s*\S/.test(text) && text.length < 80) {
      blocks.push({ type: 'signature', text: text.replace(/^[—–-]\s*/, '') });
      continue;
    }
    if (/@\S+\s*•/.test(text) && text.length < 120 && i > body.length - 4) continue; // footer
    if (/@[\w.]+/.test(text) && text.length < 60 && i > body.length - 4 && !/•/.test(text)) {
      blocks.push({ type: 'signature', text: text.replace(/^[—–-]\s*/, '') });
      continue;
    }
    if (H2.test(text) && !endsLikeSentence(text) && text.length < 70) {
      const m = text.match(H2);
      blocks.push({ type: 'h2', text: m[2].trim(), num: +m[1], id: uid(m[2]) });
      continue;
    }
    if (AYAT_HEADING.test(text) && text.length < 120) {
      blocks.push({ type: 'h3', text, id: uid(text.split(/[:.]/)[0]) });
      continue;
    }
    if (LABELS.includes(lower)) {
      blocks.push({ type: 'label', text });
      continue;
    }
    const km = text.match(KEYWORD);
    if (km && text.indexOf('(') < 90) {
      blocks.push({ type: 'keyword', term: km[1].trim(), arabic: km[2].trim(), text: km[3].trim() });
      continue;
    }
    if (/^["“].+\?["”]$/.test(text)) {
      blocks.push({ type: 'faq', text: text.replace(/^["“]|["”]$/g, '') });
      continue;
    }
    const words = text.split(/\s+/).length;
    if ((isHeadingStyle(b.style) || b.bold || (words <= 6 && !endsLikeSentence(text))) && text.length < 80 && /^[A-Z0-9"“]/.test(text) && !/^\d+\.\s/.test(text)) {
      blocks.push({ type: 'h3', text, id: uid(text) });
      continue;
    }
    const li = text.match(/^(\d{1,2})\.\s+([\s\S]+)$/);
    if (li) {
      blocks.push({ type: 'li', n: +li[1], text: li[2] });
      continue;
    }
    blocks.push({ type: 'p', text });
  }

  const firstP = blocks.find((b) => b.type === 'p');
  const description = firstP ? clip(firstP.text, 155) : `Inspirasi Quran Surat ${surah.name}: ${surah.meaning}.`;

  return {
    slug: surah.slug,
    number: surah.number,
    name: surah.name,
    title: `Inspirasi Quran Surat ${surah.name}`,
    tagline,
    meta: metaLine,
    author: authorLine,
    description,
    blocks,
  };
}

function clip(s, n) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  return cut.slice(0, cut.lastIndexOf(' ')).replace(/[,;:]$/, '') + '…';
}

function parseRef(name, ayahStr, fallback) {
  const s = surahByName(name.trim()) || findSurah(name, { strict: false }) || fallback;
  const parts = ayahStr.replace(/\s/g, '').split(',');
  const ayahs = [];
  for (const p of parts) {
    const [a, b] = p.split(/[–-]/).map(Number);
    if (!a) continue;
    for (let x = a; x <= (b || a); x++) ayahs.push(x);
  }
  return { surah: s, ayahs, surahLabel: s.name, ayahLabel: ayahStr.replace(/\s/g, '').replace(/-/g, '–') };
}

/** Untuk pengujian: mengubah teks hasil ekspor (markdown sederhana) menjadi blok mentah. */
export function textToRawBlocks(text) {
  const out = [];
  const lines = text.split('\n');
  let tableRows = null;
  const flushTable = () => {
    if (tableRows) {
      const rows = tableRows
        .filter((r) => !/^\|\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?$/.test(r))
        .map((r) =>
          r
            .replace(/^\||\|$/g, '')
            .split('|')
            .map((c) => c.trim().replace(/\\"/g, '"'))
            .map((c) => (c ? [{ t: 'p', text: c }] : [])),
        )
        .filter((r) => r.some((c) => c.length));
      out.push({ t: 'table', rows });
      tableRows = null;
    }
  };
  for (const line of lines) {
    if (line.startsWith('|')) {
      (tableRows ||= []).push(line);
      continue;
    }
    flushTable();
    const t = line.replace(/\\([.!\-*_#()[\]"])/g, '$1').trim();
    if (t) out.push({ t: 'p', text: t, style: '', bold: false });
  }
  flushTable();
  return out;
}
