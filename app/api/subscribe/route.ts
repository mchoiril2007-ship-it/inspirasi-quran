import { NextResponse } from 'next/server';
import { bridgeCall } from '@/lib/bridge';

export const runtime = 'nodejs';

const clean = (v: unknown, n: number) => String(v ?? '').replace(/[\u0000-\u001f]/g, '').trim().slice(0, n);

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Permintaan tidak valid' }, { status: 400 });
  }
  // Perangkap bot: kolom tersembunyi terisi, atau formulir dikirim terlalu cepat
  if (body.website || (typeof body.elapsed === 'number' && body.elapsed < 1500)) return NextResponse.json({ ok: true });
  const name = clean(body.name, 100);
  const email = clean(body.email, 150).toLowerCase();
  const whatsapp = clean(body.whatsapp, 30).replace(/[^0-9+\-\s()]/g, '');
  if (!name) return NextResponse.json({ ok: false, error: 'Nama wajib diisi' }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return NextResponse.json({ ok: false, error: 'Alamat email belum benar' }, { status: 400 });
  try {
    const r = await bridgeCall({ action: 'subscribe', name, email, whatsapp, page: clean(body.page, 200) }, true);
    if (!r.ok) throw new Error(r.error);
    return NextResponse.json({ ok: true, duplicate: !!r.duplicate });
  } catch (e) {
    console.error('subscribe failed', e);
    return NextResponse.json({ ok: false, error: 'Maaf, pendaftaran sedang bermasalah. Coba lagi beberapa saat lagi.' }, { status: 502 });
  }
}
