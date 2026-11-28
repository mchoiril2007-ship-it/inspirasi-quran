import { NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { bridgeCall, bridgeConfig } from '@/lib/bridge';
import { getAudio, getDocs, getVideosData } from '@/lib/content';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function same(a: string, b: string) {
  const x = crypto.createHash('sha256').update(a).digest();
  const y = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(x, y);
}

export async function POST(req: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return NextResponse.json({ ok: false, error: 'ADMIN_PASSWORD belum diatur di Vercel' }, { status: 503 });
  const { password } = await req.json().catch(() => ({}));
  if (typeof password !== 'string' || !same(password, expected)) {
    await new Promise((r) => setTimeout(r, 800));
    return NextResponse.json({ ok: false, error: 'Kata sandi salah' }, { status: 401 });
  }

  let subscribers: any = { ok: false, error: 'Jembatan Google belum diatur', rows: [] };
  if (bridgeConfig()) {
    try {
      subscribers = await bridgeCall({ action: 'subscribers' });
    } catch (e: any) {
      subscribers = { ok: false, error: e.message, rows: [] };
    }
  }

  let comments: any = { ok: false, comments: [] };
  if (bridgeConfig()) {
    try {
      comments = await bridgeCall({ action: 'allComments' });
    } catch (e: any) {
      comments = { ok: false, error: e.message, comments: [] };
    }
  }

  const owner = process.env.VERCEL_GIT_REPO_OWNER;
  const repo = process.env.VERCEL_GIT_REPO_SLUG;
  let status: any = null;
  if (owner && repo) {
    try {
      const r = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/status/status.json?t=${Date.now()}`, { cache: 'no-store' });
      if (r.ok) status = await r.json();
    } catch {}
  }

  const vd = getVideosData();
  return NextResponse.json({
    ok: true,
    subscribers,
    comments,
    status,
    repo: owner && repo ? `${owner}/${repo}` : null,
    channel: vd.channel,
    unmatchedVideos: vd.unmatched || [],
    docs: getDocs().map((d) => ({ slug: d.slug, name: d.name, number: d.number, file: d.source?.fileName, updatedAt: d.source?.updatedAt, videos: (vd.bySurah?.[d.slug] || []).length, audio: !!getAudio(d.slug) })),
    deployedAt: process.env.VERCEL_GIT_COMMIT_SHA ? process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 7) : null,
  });
}
