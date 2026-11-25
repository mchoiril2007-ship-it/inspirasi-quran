'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconBook, IconHeadphones, IconPlayCircle, IconSearch } from './Icons';
import { SuratStats, trackStat } from './Stats';

export function Tabs({ slug }: { slug: string }) {
  const p = usePathname();
  const base = `/surat/${slug}`;
  const items = [
    { href: base, label: 'Baca', icon: <IconBook /> },
    { href: `${base}/tonton`, label: 'Tonton', icon: <IconPlayCircle /> },
    { href: `${base}/dengarkan`, label: 'Dengarkan', icon: <IconHeadphones /> },
  ];
  return (
    <nav className="tabs-bar" aria-label="Pilih cara menikmati">
      <div className="wrap">
        <div className="tabs">
          {items.map((it) => (
            <Link key={it.href} href={it.href} aria-current={p === it.href ? 'page' : undefined} scroll={false}>
              {it.icon}
              {it.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}

export function ReadingProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const on = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      if (ref.current) ref.current.style.transform = `scaleX(${max > 0 ? h.scrollTop / max : 0})`;
    };
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return <div ref={ref} className="progress" aria-hidden="true" />;
}

type CardItem = { slug: string; number: number; name: string; arabic: string; meaning: string; ayat: number; place: string; tagline: string; keys: string; hasVideo: boolean; hasAudio: boolean };

// Palet kartu: warna lembut (atas) + warna lebih dalam (bawah). Berurutan sesuai posisi kartu.
const PALETTE = [
  { top: '#CFE5D6', bottom: '#4E7B62', ink: '#1F3B2D' }, // hijau sage
  { top: '#FBEDC2', bottom: '#B8862B', ink: '#4A3A12' }, // kuning mentega
  { top: '#D3E3F1', bottom: '#5C7FA6', ink: '#1F3550' }, // biru kabut
  { top: '#F4DAD3', bottom: '#BF7766', ink: '#4D2A22' }, // merah muda tanah
  { top: '#DED8EE', bottom: '#7C6CA8', ink: '#2E2650' }, // lavender
  { top: '#CFE8E3', bottom: '#1A7A6E', ink: '#123F39' }, // teal brand
  { top: '#EFE2CF', bottom: '#A6814F', ink: '#43331C' }, // pasir
];

export function SuratSearch({ items }: { items: CardItem[] }) {
  const [q, setQ] = useState('');
  const rail = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/['’`\-\s]/g, '');
  const list = useMemo(() => {
    const n = norm(q);
    if (!n) return items;
    return items.filter((it) => norm(it.keys).includes(n) || String(it.number) === q.trim());
  }, [q, items]);

  const updateEdge = () => {
    const r = rail.current;
    if (!r) return;
    setEdge({ start: r.scrollLeft < 8, end: r.scrollLeft + r.clientWidth > r.scrollWidth - 8 });
  };
  useEffect(() => {
    updateEdge();
    rail.current?.scrollTo({ left: 0 });
  }, [list]);
  const slide = (dir: number) => {
    const r = rail.current;
    if (!r) return;
    const card = r.querySelector('.shelf-card') as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : r.clientWidth * 0.8;
    r.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  return (
    <>
      <div id="daftar-surat" className="search" role="search">
        <IconSearch />
        <label htmlFor="cari" className="sr-only">
          Cari surat
        </label>
        <input id="cari" type="search" placeholder="Cari surat, misalnya Al-Ikhlas atau 112" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
      </div>
      <section className="shelf" aria-labelledby="shelf-title">
        <h2 id="shelf-title" className="shelf-title wrap">
          {q ? (
            <>
              <b>Hasil pencarian.</b> {list.length} surat ditemukan.
            </>
          ) : (
            <>
              <b>Surat tersedia.</b> Geser, pilih, lalu mulai membaca.
            </>
          )}
        </h2>
        {list.length ? (
          <>
            <div className="shelf-rail" ref={rail} onScroll={updateEdge}>
              {list.map((it, i) => {
                const c = PALETTE[i % PALETTE.length];
                return (
                  <Link key={it.slug} href={`/surat/${it.slug}`} className="shelf-card" style={{ ['--top' as any]: c.top, ['--bottom' as any]: c.bottom, ['--ink' as any]: c.ink }}>
                    <div className="shelf-upper">
                      <span className="shelf-eyebrow">Surat ke-{it.number}</span>
                      <h3>{it.name.replace(/-/g, '\u2011')}</h3>
                      <p className="shelf-meaning">{it.meaning}</p>
                      {it.tagline ? <p className="shelf-tagline">{it.tagline}</p> : null}
                      <SuratStats slug={it.slug} compact />
                    </div>
                    <div className="shelf-lower">
                      <span className="shelf-ar" lang="ar">
                        {it.arabic}
                      </span>
                      <span className="shelf-facts">
                        {it.ayat} ayat · {it.place}
                        {it.hasVideo ? ' · Video' : ''}
                        {it.hasAudio ? ' · Audio' : ''}
                      </span>
                      <span className="shelf-go" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M9 6l6 6-6 6" />
                        </svg>
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
            <div className="shelf-nav wrap">
              <button onClick={() => slide(-1)} disabled={edge.start} aria-label="Surat sebelumnya">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M15 6l-6 6 6 6" /></svg>
              </button>
              <button onClick={() => slide(1)} disabled={edge.end} aria-label="Surat berikutnya">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 6l6 6-6 6" /></svg>
              </button>
            </div>
          </>
        ) : (
          <p className="empty wrap">{q ? 'Surat ini belum tersedia. Daftar di bawah supaya Anda dikabari saat terbit.' : 'Belum ada surat.'}</p>
        )}
      </section>
    </>
  );
}

export function VideoEmbed({ id, title, slug }: { id: string; title: string; slug?: string }) {
  const [on, setOn] = useState(false);
  return (
    <div className="video-frame">
      {on ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <button onClick={() => { setOn(true); if (slug) trackStat(slug, 'tonton'); }} style={{ backgroundImage: `url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)` }} aria-label={`Putar video: ${title}`}>
          <span className="play">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z" /></svg>
          </span>
        </button>
      )}
    </div>
  );
}
