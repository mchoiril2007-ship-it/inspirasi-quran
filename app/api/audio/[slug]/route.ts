import audio from '@/content/audio.json';

export const runtime = 'edge';

// Meneruskan file audio dari GitHub Releases dengan tipe audio/mpeg agar bisa diputar & digeser di semua HP.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const info = (audio as Record<string, { url: string }>)[slug];
  if (!info) return new Response('Audio tidak ditemukan', { status: 404 });
  const headers: Record<string, string> = {};
  const range = req.headers.get('range');
  if (range) headers.range = range;
  const upstream = await fetch(info.url, { headers, redirect: 'follow' });
  if (!upstream.ok && upstream.status !== 206) return new Response('Audio sedang tidak tersedia', { status: 502 });
  const out = new Headers({
    'Content-Type': 'audio/mpeg',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=86400',
  });
  for (const h of ['content-length', 'content-range', 'etag', 'last-modified']) {
    const v = upstream.headers.get(h);
    if (v) out.set(h, v);
  }
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

export async function HEAD(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const r = await GET(req, ctx);
  return new Response(null, { status: r.status, headers: r.headers });
}
