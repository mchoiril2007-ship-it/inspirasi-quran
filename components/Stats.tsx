'use client';
// Penghitung baca/dengar/tonton per surat (satu orang bisa terhitung berkali-kali).
import { useEffect, useState } from 'react';
import { IconBook, IconHeadphones, IconPlayCircle } from './Icons';

export type Kind = 'baca' | 'dengar' | 'tonton';
type Counts = Record<string, Record<Kind, number>>;

let cache: Counts | null = null;
let loading: Promise<Counts | null> | null = null;
const listeners = new Set<() => void>();

function load() {
  if (!loading) {
    loading = fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => (cache = d.ok ? d.stats || {} : null))
      .catch(() => null);
  }
  return loading;
}

/** Catat satu kunjungan/putaran dan naikkan angka di layar. */
export function trackStat(slug: string, kind: Kind) {
  try {
    fetch('/api/stats', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, kind }), keepalive: true }).catch(() => {});
  } catch {}
  if (cache) {
    cache[slug] = Object.assign({ baca: 0, dengar: 0, tonton: 0 }, cache[slug] || {});
    cache[slug][kind]++;
    listeners.forEach((f) => f());
  }
}

export function useStats() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    listeners.add(f);
    load().then(f);
    return () => {
      listeners.delete(f);
    };
  }, []);
  return cache;
}

const fmt = (n: number) => new Intl.NumberFormat('id-ID').format(n || 0);

export function SuratStats({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const stats = useStats();
  if (!stats) return null;
  const c = stats[slug] || { baca: 0, dengar: 0, tonton: 0 };
  return (
    <p className={compact ? 'stats-mini' : 'stats-row'} aria-label="Jumlah akses surat ini">
      <span title="Berapa kali dibaca">
        <IconBook /> {fmt(c.baca)}
        {compact ? '' : ' kali dibaca'}
      </span>
      <span title="Berapa kali didengarkan">
        <IconHeadphones /> {fmt(c.dengar)}
        {compact ? '' : ' kali didengar'}
      </span>
      <span title="Berapa kali ditonton">
        <IconPlayCircle /> {fmt(c.tonton)}
        {compact ? '' : ' kali ditonton'}
      </span>
    </p>
  );
}

/** Dipasang di halaman Baca: hitung satu kali setiap halaman dibuka. */
export function TrackView({ slug, kind }: { slug: string; kind: Kind }) {
  useEffect(() => {
    trackStat(slug, kind);
  }, [slug, kind]);
  return null;
}
