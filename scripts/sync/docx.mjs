// Membaca file .docx menjadi daftar blok mentah: paragraf (teks + gaya) dan tabel.
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({ preserveOrder: true, ignoreAttributes: false, attributeNamePrefix: '', trimValues: false });

const tag = (node) => Object.keys(node).find((k) => k !== ':@');
const kids = (node) => node[tag(node)] || [];
const attr = (node, name) => node[':@']?.[name];

function findAll(nodes, name, out = []) {
  for (const n of nodes) {
    const t = tag(n);
    if (t === name) out.push(n);
    else if (t && Array.isArray(n[t])) findAll(n[t], name, out);
  }
  return out;
}

function runText(r) {
  let s = '';
  for (const c of kids(r)) {
    const t = tag(c);
    if (t === 'w:t') s += kids(c).map((x) => x['#text'] ?? '').join('');
    else if (t === 'w:tab') s += ' ';
    else if (t === 'w:br' || t === 'w:cr') s += '\n';
    else if (t === 'w:noBreakHyphen') s += '-';
  }
  return s;
}

function isBold(r) {
  const rPr = kids(r).find((c) => tag(c) === 'w:rPr');
  if (!rPr) return false;
  const b = kids(rPr).find((c) => tag(c) === 'w:b');
  return !!b && attr(b, 'w:val') !== '0' && attr(b, 'w:val') !== 'false';
}

function paragraph(p, ctx) {
  const pPr = kids(p).find((c) => tag(c) === 'w:pPr');
  let style = '';
  let numbered = null;
  let align = '';
  if (pPr) {
    for (const c of kids(pPr)) {
      const t = tag(c);
      if (t === 'w:pStyle') style = attr(c, 'w:val') || '';
      if (t === 'w:jc') align = attr(c, 'w:val') || '';
      if (t === 'w:numPr') {
        const numId = kids(c).find((x) => tag(x) === 'w:numId');
        const ilvl = kids(c).find((x) => tag(x) === 'w:ilvl');
        numbered = { numId: attr(numId || {}, 'w:val'), level: +(attr(ilvl || {}, 'w:val') || 0) };
      }
    }
  }
  // Gambar (w:drawing → a:blip r:embed)
  const images = [];
  for (const d of findAll(kids(p), 'w:drawing')) {
    const blip = findAll(kids(d), 'a:blip')[0];
    const rid = blip && attr(blip, 'r:embed');
    const target = rid && ctx.rels[rid];
    if (!target) continue;
    const docPr = findAll(kids(d), 'wp:docPr')[0];
    const ext = findAll(kids(d), 'wp:extent')[0];
    images.push({ target, alt: attr(docPr || {}, 'descr') || attr(docPr || {}, 'title') || '', cx: +attr(ext || {}, 'cx') || 0, cy: +attr(ext || {}, 'cy') || 0 });
  }
  const runs = findAll(kids(p), 'w:r');
  let text = '';
  let boldChars = 0;
  let chars = 0;
  for (const r of runs) {
    const t = runText(r);
    text += t;
    const n = t.replace(/\s/g, '').length;
    chars += n;
    if (isBold(r)) boldChars += n;
  }
  const styleName = ctx.styles[style] || style;
  let prefix = '';
  if (numbered && numbered.numId && numbered.numId !== '0') {
    const fmt = ctx.numFormats[numbered.numId]?.[numbered.level] || 'decimal';
    const key = numbered.numId + ':' + numbered.level;
    ctx.counters[key] = (ctx.counters[key] || 0) + 1;
    if (fmt === 'decimal') prefix = ctx.counters[key] + '. ';
    else if (fmt !== 'none') prefix = '• ';
  }
  return {
    t: 'p',
    images,
    text: (prefix + text).replace(/ /g, ' ').replace(/[ \t]+/g, ' ').trim(),
    style: styleName,
    bold: chars > 0 && boldChars / chars > 0.85,
    align,
  };
}

function table(tbl, ctx) {
  const rows = [];
  for (const tr of kids(tbl).filter((c) => tag(c) === 'w:tr')) {
    const cells = [];
    for (const tc of kids(tr).filter((c) => tag(c) === 'w:tc')) {
      const paras = findAll(kids(tc), 'w:p').map((p) => paragraph(p, ctx)).filter((p) => p.text);
      cells.push(paras);
    }
    rows.push(cells);
  }
  return { t: 'table', rows };
}

async function readStyles(zip) {
  const map = {};
  const f = zip.file('word/styles.xml');
  if (!f) return map;
  const xml = parser.parse(await f.async('string'));
  for (const s of findAll(xml, 'w:style')) {
    const name = kids(s).find((c) => tag(c) === 'w:name');
    if (name) map[attr(s, 'w:styleId')] = attr(name, 'w:val');
  }
  return map;
}

async function readNumbering(zip) {
  const f = zip.file('word/numbering.xml');
  if (!f) return {};
  const xml = parser.parse(await f.async('string'));
  const abstract = {};
  for (const a of findAll(xml, 'w:abstractNum')) {
    const lv = {};
    for (const l of kids(a).filter((c) => tag(c) === 'w:lvl')) {
      const fmt = kids(l).find((c) => tag(c) === 'w:numFmt');
      lv[+attr(l, 'w:ilvl')] = attr(fmt || {}, 'w:val') || 'decimal';
    }
    abstract[attr(a, 'w:abstractNumId')] = lv;
  }
  const nums = {};
  for (const n of findAll(xml, 'w:num')) {
    const a = kids(n).find((c) => tag(c) === 'w:abstractNumId');
    nums[attr(n, 'w:numId')] = abstract[attr(a || {}, 'w:val')] || {};
  }
  return nums;
}

/** @returns {Promise<Array<{t:'p',text:string,style:string,bold:boolean,align:string}|{t:'table',rows:any[][][]}>>} */
export async function docxToRawBlocks(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const rels = {};
  const relFile = zip.file('word/_rels/document.xml.rels');
  if (relFile) {
    for (const r of findAll(parser.parse(await relFile.async('string')), 'Relationship')) {
      if (/image/.test(attr(r, 'Type') || '')) rels[attr(r, 'Id')] = 'word/' + String(attr(r, 'Target')).replace(/^\/?word\//, '').replace(/^\.\.\//, '');
    }
  }
  const ctx = { styles: await readStyles(zip), numFormats: await readNumbering(zip), counters: {}, rels };
  const doc = parser.parse(await zip.file('word/document.xml').async('string'));
  const body = findAll(doc, 'w:body')[0];
  const out = [];
  const walk = (nodes) => {
    for (const n of nodes) {
      const t = tag(n);
      if (t === 'w:p') {
        const p = paragraph(n, ctx);
        for (const im of p.images) {
          const f = zip.file(im.target);
          if (f) out.push({ t: 'image', alt: im.alt, cx: im.cx, cy: im.cy, ext: (im.target.split('.').pop() || 'png').toLowerCase(), data: '__pending__', file: f });
        }
        if (p.text) out.push(p);
      } else if (t === 'w:tbl') out.push(table(n, ctx));
      else if (t === 'w:sdt' || t === 'w:sdtContent' || t === 'w:customXml') walk(kids(n));
    }
  };
  walk(kids(body));
  for (const b of out) if (b.t === 'image') b.data = await b.file.async('nodebuffer'), delete b.file;
  return out;
}
