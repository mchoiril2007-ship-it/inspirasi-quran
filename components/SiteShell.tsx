'use client';
// Header tipis ala apple.com: logo Q (ke beranda) di kiri; "Surat ⌄" dan ikon menu di kanan.
// "Surat" membuka panel putih berisi pencarian + daftar surat. Menu berisi Beranda, Bagikan, Langganan.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AudioProvider } from './AudioContext';
import { ShareButton } from './Share';
import { matchSurat } from '@/lib/search';

export type NavItem = { slug: string; number: number; name: string; arabic: string; meaning?: string; aliases?: string[]; tagline?: string };

const nb = (s: string) => s.replace(/-/g, '‑');

export default function SiteShell({ items, children }: { items: NavItem[]; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [panel, setPanel] = useState<null | 'surat' | 'menu'>(null);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const activeSlug = pathname.startsWith('/surat/') ? pathname.split('/')[2] : null;

  // Tutup panel setiap pindah halaman
  useEffect(() => setPanel(null), [pathname]);

  // Esc menutup panel; gulir halaman dikunci selama panel terbuka
  useEffect(() => {
    if (!panel) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPanel(null);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [panel]);

  // Panel Surat: fokus ke kolom cari hanya di perangkat dengan mouse (di HP keyboard akan menutupi daftar);
  // gulir daftar ke surat yang sedang dibuka; kosongkan pencarian saat ditutup.
  useEffect(() => {
    if (panel !== 'surat') {
      setQ('');
      return;
    }
    const t = setTimeout(() => {
      if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) inputRef.current?.focus();
      listRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ block: 'nearest' });
    }, 60);
    return () => clearTimeout(t);
  }, [panel]);

  const results = useMemo(() => matchSurat(items, q), [q, items]);

  const toggle = (p: 'surat' | 'menu') => setPanel((cur) => (cur === p ? null : p));
  const goSubscribe = () => {
    setPanel(null);
    // Tunggu panel tertutup (kunci gulir dilepas), lalu gulir ke formulir langganan
    setTimeout(() => {
      const el = document.getElementById('langganan');
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 48, behavior: 'smooth' });
    }, 120);
  };

  return (
    <AudioProvider>
      <div className={`shell${panel ? ' panel-open' : ''}`}>
        <header className="site-header">
          <div className="header-row">
            <Link href="/" className="logo" aria-label="Quran Inspiration, ke beranda">
              <span className="brand-mark" aria-hidden="true">
                Q
              </span>
            </Link>
            <div className="header-actions">
              <button className="surat-btn" onClick={() => toggle('surat')} aria-expanded={panel === 'surat'} aria-controls="panel-surat" aria-label={panel === 'surat' ? 'Tutup daftar surat' : 'Buka daftar surat'}>
                Surat
                <svg className={`surat-chev${panel === 'surat' ? ' up' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 9l7 7 7-7" />
                </svg>
              </button>
              <button className="icon-btn" onClick={() => toggle('menu')} aria-label={panel === 'menu' ? 'Tutup menu' : 'Buka menu'} aria-expanded={panel === 'menu'}>
                {panel === 'menu' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M4 8h16M4 16h16" /></svg>
                )}
              </button>
            </div>
          </div>
        </header>

        {panel === 'surat' ? (
          <div id="panel-surat" className="surat-panel" role="dialog" aria-label="Daftar surat">
            <div className="sp-search" role="search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.6-4.6" /></svg>
              <label htmlFor="cari-surat" className="sr-only">
                Cari surat
              </label>
              <input
                ref={inputRef}
                id="cari-surat"
                type="search"
                placeholder="Cari surat, misalnya Yasin atau 36"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                autoComplete="off"
                onKeyDown={(e) => e.key === 'Enter' && results[0] && router.push(`/surat/${results[0].slug}`)}
              />
            </div>
            {results.length ? (
              <ul className="sp-list" ref={listRef}>
                {results.map((it) => (
                  <li key={it.slug}>
                    <Link href={`/surat/${it.slug}`} className="sp-row" aria-current={it.slug === activeSlug ? 'page' : undefined}>
                      <span className="sp-num">{it.number}</span>
                      <span className="sp-main">
                        <span className="sp-name">{nb(it.name)}</span>
                        <span className="sp-theme">{it.tagline || it.meaning}</span>
                      </span>
                      <span className="sp-ar" lang="ar">
                        {it.arabic}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="sp-empty">Surat ini belum tersedia.</p>
            )}
          </div>
        ) : null}

        {panel === 'menu' ? (
          <nav className="drop" aria-label="Menu">
            <div className="drop-inner">
              <ul className="drop-list menu-list">
                <li>
                  <Link href="/" className="menu-big" aria-current={pathname === '/' ? 'page' : undefined}>
                    Beranda
                  </Link>
                </li>
                <li className="menu-share">
                  <ShareButton className="menu-big" label="Bagikan Quran Inspiration" data={{ title: 'Quran Inspiration', text: 'Untuk hati yang rindu memahami', path: '/' }}>
                    Bagikan
                  </ShareButton>
                </li>
                <li>
                  <button className="menu-big" onClick={goSubscribe}>
                    Langganan
                  </button>
                </li>
              </ul>
            </div>
          </nav>
        ) : null}
        {panel ? <div className={`drop-shade${panel === 'surat' ? ' light' : ''}`} onClick={() => setPanel(null)} aria-hidden="true" /> : null}

        <div className="shell-main">{children}</div>
      </div>
    </AudioProvider>
  );
}
