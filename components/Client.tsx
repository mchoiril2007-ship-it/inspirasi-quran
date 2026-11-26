'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconBook, IconHeadphones, IconPlayCircle, IconSearch } from './Icons';
import { SuratStats, trackStat } from './Stats';
import { matchSurat } from '@/lib/search';

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

type CardItem = { slug: string; number: number; name: string; arabic: string; meaning: string; ayat: number; place: string; tagline: string; aliases: string[]; hasVideo: boolean; hasAudio: boolean };

export function SuratSearch({ items }: { items: CardItem[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const list = items;
  const [view, setView] = useState<'cards' | 'list'>('cards');
  const [q, setQ] = useState('');
  const filtered = useMemo(() => matchSurat(items, q), [items, q]);

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
      <section id="daftar-surat" className="shelf" aria-labelledby="shelf-title">
        <div className="shelf-head wrap">
          <h2 id="shelf-title" className="shelf-title">
            Surat tersedia.
          </h2>
          <button type="button" className="shelf-toggle" onClick={() => setView((v) => (v === 'cards' ? 'list' : 'cards'))} aria-expanded={view === 'list'}>
            {view === 'cards' ? `Lihat semua (${items.length}) ›` : 'Tampilkan kartu ‹'}
          </button>
          <p className="shelf-sub">{view === 'cards' ? 'Geser, pilih, lalu mulai memahami.' : 'Cari, pilih, lalu mulai memahami.'}</p>
        </div>
        {view === 'list' ? (
          <div className="wrap">
            <div className="list-search" role="search">
              <IconSearch />
              <label htmlFor="cari-daftar" className="sr-only">
                Cari surat
              </label>
              <input id="cari-daftar" type="search" placeholder="Cari surat, misalnya Yasin atau 36" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
            </div>
            {filtered.length ? (
              <ul className="list-view">
                {filtered.map((it) => (
                  <li key={it.slug}>
                    <Link href={`/surat/${it.slug}`} className="list-row">
                      <span className="list-num">{it.number}</span>
                      <span className="list-main">
                        <span className="list-name">{it.name.replace(/-/g, '\u2011')}</span>
                        {it.tagline ? <span className="list-theme">{it.tagline}</span> : <span className="list-theme">{it.meaning}</span>}
                      </span>
                      <span className="list-ar" lang="ar">
                        {it.arabic}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="list-empty">Surat ini belum tersedia.</p>
            )}
          </div>
        ) : list.length ? (
          <>
            <div className="shelf-rail" ref={rail} onScroll={updateEdge}>
              {list.map((it, i) => {
                return (
                  <Link key={it.slug} href={`/surat/${it.slug}`} className="shelf-card">
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
          <p className="empty wrap">Belum ada surat.</p>
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
