// Penjelasan setelah gambar peta surat dipecah per poin (daftar bernomor) supaya mudah dibaca.
// Dipakai oleh parse.mjs (naskah baru) dan scripts/pointify.mjs (halaman yang sudah ada).
const SENT = /(?<=[.!?]["”’)]?)\s+(?=[A-Z“"(‘])/;

export function pointifyMap(blocks) {
  const out = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    out.push(b);
    if (b.type !== 'image') continue;
    // Kumpulkan paragraf biasa setelah gambar sampai judul berikutnya
    let j = i + 1;
    const paras = [];
    while (j < blocks.length && blocks[j].type === 'p') paras.push(blocks[j++]);
    if (!paras.length || paras.some((p) => p.pointified)) { continue; }
    const items = [];
    const push = (type, text) => items.push(type === 'li' ? { type: 'li', text } : { type: 'p', text });
    let sawLabelled = false;
    paras.forEach((p, k) => {
      const t = p.text.trim();
      if (/^Peta Surat\b/i.test(t) && t.length < 120) return push('p', t); // keterangan gambar
      if (t.startsWith('•') || (paras.length >= 3 && /^[^:.]{2,45}:\s+[Aa]yat\s+\d/.test(t))) {
        sawLabelled = true;
        return push('li', t.replace(/^•\s*/, ''));
      }
      const sents = t.split(SENT);
      if (!sawLabelled && sents.length >= 3 && t.length > 300) {
        push('p', sents[0]);
        // Kalimat yang terlalu pendek digabung dengan kalimat berikutnya supaya tiap poin utuh maknanya
        let cur = '';
        for (const sn of sents.slice(1)) {
          cur = cur ? `${cur} ${sn}` : sn;
          if (cur.length >= 90) { push('li', cur); cur = ''; }
        }
        if (cur) { if (items.length && items[items.length - 1].type === 'li' && cur.length < 60) items[items.length - 1].text += ' ' + cur; else push('li', cur); }
        return;
      }
      push('p', t);
    });
    let n = 0;
    for (const it of items) out.push(it.type === 'li' ? { type: 'li', n: ++n, text: it.text } : it);
    i = j - 1;
  }
  return out;
}
