import { NextResponse } from 'next/server';
import { bridgeCall, bridgeConfig } from '@/lib/bridge';
import { getDocs } from '@/lib/content';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KINDS = ['baca', 'dengar', 'tonton'];

// Semua hitungan baca/dengar/tonton (disimpan sebentar di CDN agar cepat)
export async function GET() {
  if (!bridgeConfig()) return NextResponse.json({ ok: false, stats: {} });
  try {
    const r = await bridgeCall({ action: 'stats' });
    if (!r.ok) throw new Error(r.error);
    return NextResponse.json({ ok: true, stats: r.stats }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=600' } });
  } catch {
    return NextResponse.json({ ok: false, stats: {} }, { headers: { 'Cache-Control': 'public, s-maxage=30' } });
  }
}

// Tambah satu hitungan
export async function POST(req: Request) {
  const { slug, kind } = await req.json().catch(() => ({}));
  if (!KINDS.includes(kind) || !getDocs().some((d) => d.slug === slug)) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    const r = await bridgeCall({ action: 'hit', slug, kind }, true);
    return NextResponse.json({ ok: !!r.ok, count: r.count ?? null });
  } catch {
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
