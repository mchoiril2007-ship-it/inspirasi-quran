import crypto from 'node:crypto';

export type Comment = { id: string; time: string; slug: string; name: string; text: string };

export const LINK_RE = /(https?:\/\/|www\.|\b[a-z0-9][a-z0-9-]*\.(com|net|org|id|io|co|me|xyz|info|biz|ly|link|site|online|shop|store|app|dev|tv|cc|top|club|vip)\b|\bt\.me\/|\bwa\.me\/|bit\.ly|\bdot\s*(com|net|org)\b)/i;

export const cleanName = (v: unknown) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60);
export const cleanText = (v: unknown) => String(v ?? '').replace(/[\u0000-\u0009\u000b-\u001f]/g, '').replace(/\n{3,}/g, '\n\n').trim().slice(0, 1000);

/** Sidik jari perangkat (tidak menyimpan IP asli) untuk batas kiriman per menit. */
export function deviceHash(req: Request) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('x-real-ip') || 'x';
  const ua = req.headers.get('user-agent') || '';
  return crypto.createHash('sha256').update(`${ip}|${ua}|${process.env.BRIDGE_KEY || ''}`).digest('hex').slice(0, 40);
}

// Lapisan batas kedua di sisi web (per instans server): 3 komentar per menit per perangkat
const hits = new Map<string, number[]>();
export function limited(key: string) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < 60000);
  if (list.length >= 3) {
    hits.set(key, list);
    return true;
  }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 2000) for (const k of hits.keys()) { hits.delete(k); break; }
  return false;
}
