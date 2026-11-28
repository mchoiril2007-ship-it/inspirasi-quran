import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { bridgeCall } from '@/lib/bridge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const same = (a: string, b: string) => crypto.timingSafeEqual(crypto.createHash('sha256').update(a).digest(), crypto.createHash('sha256').update(b).digest());

// Hapus satu komentar (hanya admin)
export async function POST(req: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return NextResponse.json({ ok: false, error: 'ADMIN_PASSWORD belum diatur di Vercel' }, { status: 503 });
  const { password, id } = await req.json().catch(() => ({}));
  if (typeof password !== 'string' || !same(password, expected)) return NextResponse.json({ ok: false, error: 'Kata sandi salah' }, { status: 401 });
  if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/.test(id)) return NextResponse.json({ ok: false, error: 'ID tidak valid' }, { status: 400 });
  try {
    const r = await bridgeCall({ action: 'deleteComment', id }, true);
    if (!r.ok) throw new Error(r.error);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || 'Gagal menghapus' }, { status: 502 });
  }
}
