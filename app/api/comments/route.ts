import { NextResponse } from 'next/server';
import { bridgeCall, bridgeConfig } from '@/lib/bridge';
import { getDocs } from '@/lib/content';
import { LINK_RE, cleanName, cleanText, deviceHash, limited } from '@/lib/comments';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' };

// Daftar komentar satu surat (terbaru di atas)
export async function GET(req: Request) {
  const slug = new URL(req.url).searchParams.get('slug') || '';
  if (!getDocs().some((d) => d.slug === slug)) return NextResponse.json({ ok: false, comments: [], total: 0 }, { status: 400, headers: NO_STORE });
  if (!bridgeConfig()) return NextResponse.json({ ok: false, comments: [], total: 0 }, { headers: NO_STORE });
  try {
    const r = await bridgeCall({ action: 'comments', slug });
    if (!r.ok) throw new Error(r.error);
    return NextResponse.json({ ok: true, comments: r.comments || [], total: r.total ?? (r.comments || []).length }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ ok: false, comments: [], total: 0 }, { headers: NO_STORE });
  }
}

// Kirim komentar baru: langsung tampil, tanpa persetujuan
export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Permintaan tidak valid' }, { status: 400 });
  }
  // Perangkap bot: kolom tersembunyi terisi atau formulir dikirim terlalu cepat → pura-pura berhasil
  if (body.website || (typeof body.elapsed === 'number' && body.elapsed < 2000)) return NextResponse.json({ ok: true, ignored: true });
  const slug = String(body.slug || '');
  const name = cleanName(body.name);
  const text = cleanText(body.text);
  if (!getDocs().some((d) => d.slug === slug)) return NextResponse.json({ ok: false, error: 'Surat tidak ditemukan' }, { status: 400 });
  if (!name) return NextResponse.json({ ok: false, error: 'Nama wajib diisi' }, { status: 400 });
  if (!text) return NextResponse.json({ ok: false, error: 'Komentar belum diisi' }, { status: 400 });
  if (LINK_RE.test(`${name} ${text}`)) return NextResponse.json({ ok: false, error: 'Komentar yang berisi tautan tidak bisa dikirim.' }, { status: 400 });
  const dev = deviceHash(req);
  if (limited(dev)) return NextResponse.json({ ok: false, error: 'Terlalu cepat. Tunggu sebentar lalu kirim lagi.' }, { status: 429 });
  try {
    const r = await bridgeCall({ action: 'addComment', slug, name, text, ipHash: dev }, true);
    if (!r.ok) return NextResponse.json({ ok: false, error: r.error || 'Komentar gagal dikirim' }, { status: r.limited ? 429 : 400 });
    return NextResponse.json({ ok: true, comment: r.comment });
  } catch (e) {
    console.error('comment failed', e);
    return NextResponse.json({ ok: false, error: 'Maaf, komentar belum bisa dikirim. Coba lagi beberapa saat lagi.' }, { status: 502 });
  }
}
