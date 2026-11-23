'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconBook, IconHeadphones, IconPlayCircle, IconSearch } from './Icons';

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

export function SuratSearch({ items }: { items: CardItem[] }) {
  const [q, setQ] = useState('');
  const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/['’`\-\s]/g, '');
  const list = useMemo(() => {
    const n = norm(q);
    if (!n) return items;
    return items.filter((it) => norm(it.keys).includes(n) || String(it.number) === q.trim());
  }, [q, items]);

  return (
    <>
      <div className="search" role="search">
        <IconSearch />
        <label htmlFor="cari" className="sr-only">
          Cari surat
        </label>
        <input id="cari" type="search" placeholder="Cari surat, misalnya Al-Ikhlas atau 112" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
      </div>
      <div className="wrap">
        <h2 className="section-title">{q ? `Hasil pencarian (${list.length})` : 'Surat yang sudah tersedia'}</h2>
        {list.length ? (
          <div className="grid">
            {list.map((it) => (
              <Link key={it.slug} href={`/surat/${it.slug}`} className="card">
                <div className="card-top">
                  <span className="num">{it.number}</span>
                  <span className="card-ar" lang="ar">
                    {it.arabic}
                  </span>
                </div>
                <h3>{it.name.replace(/-/g, "\u2011")}</h3>
                <p className="meaning">{it.meaning}</p>
                <div className="facts">
                  <span>{it.ayat} ayat</span>
                  <span>·</span>
                  <span>{it.place}</span>
                  {it.hasVideo ? <span className="pill"><IconPlayCircle /> Video</span> : null}
                  {it.hasAudio ? <span className="pill"><IconHeadphones /> Audio</span> : null}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty">{q ? 'Surat ini belum tersedia. Daftar di bawah supaya Anda dikabari saat terbit.' : 'Belum ada surat.'}</p>
        )}
      </div>
    </>
  );
}

export function VideoEmbed({ id, title }: { id: string; title: string }) {
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
        <button onClick={() => setOn(true)} style={{ backgroundImage: `url(https://i.ytimg.com/vi/${id}/hqdefault.jpg)` }} aria-label={`Putar video: ${title}`}>
          <span className="play">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z" /></svg>
          </span>
        </button>
      )}
    </div>
  );
}
