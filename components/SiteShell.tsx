'use client';
// Header tipis ala apple.com: logo ق (ke beranda) di kiri, ikon cari & menu di kanan.
// Pencarian dan menu muncul sebagai panel putih di bawah header.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AudioProvider } from './AudioContext';
import { ShareButton } from './Share';

export type NavItem = { slug: string; number: number; name: string; arabic: string; meaning?: string; keys?: string };

const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/['’`\-\s]/g, '');

export default function SiteShell({ items, children }: { items: NavItem[]; children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [panel, setPanel] = useState<null | 'search' | 'menu'>(null);
  const [q, setQ] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
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
    if (panel === 'search') setTimeout(() => inputRef.current?.focus(), 60);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [panel]);

  const results = useMemo(() => {
    const n = norm(q);
    if (!n) return [];
    return items.filter((it) => norm(`${it.name} ${it.meaning || ''} ${it.keys || ''}`).includes(n) || String(it.number) === q.trim());
  }, [q, items]);

  const toggle = (p: 'search' | 'menu') => setPanel((cur) => (cur === p ? null : p));
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
              <button className="icon-btn" onClick={() => toggle('search')} aria-label={panel === 'search' ? 'Tutup pencarian' : 'Cari surat'} aria-expanded={panel === 'search'}>
                {panel === 'search' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.6-4.6" /></svg>
                )}
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

        {panel === 'search' ? (
          <div className="drop" role="dialog" aria-label="Cari surat">
            <div className="drop-inner">
              <div className="drop-search">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.6-4.6" /></svg>
                <label htmlFor="cari-surat" className="sr-only">
                  Cari surat
                </label>
                <input ref={inputRef} id="cari-surat" type="search" placeholder="Cari surat" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" onKeyDown={(e) => e.key === 'Enter' && results[0] && router.push(`/surat/${results[0].slug}`)} />
              </div>
              {q.trim() ? (
                results.length ? (
                  <ul className="drop-list">
                    {results.map((it) => (
                      <li key={it.slug}>
                        <Link href={`/surat/${it.slug}`}>
                          <span className="drop-num">{it.number}</span>
                          <span className="drop-name">{it.name.replace(/-/g, '‑')}</span>
                          <span className="drop-sub">{it.meaning}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="drop-empty">Surat ini belum tersedia.</p>
                )
              ) : (
                <p className="drop-hint">Ketik nama surat atau artinya, misalnya “Al-Jumu’ah” atau “barisan”.</p>
              )}
            </div>
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
                {items.map((it) => (
                  <li key={it.slug}>
                    <Link href={`/surat/${it.slug}`} aria-current={it.slug === activeSlug ? 'page' : undefined}>
                      <span className="drop-num">{it.number}</span>
                      <span className="drop-name">{it.name.replace(/-/g, '‑')}</span>
                    </Link>
                  </li>
                ))}
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
        {panel ? <div className="drop-shade" onClick={() => setPanel(null)} aria-hidden="true" /> : null}

        <div className="shell-main">{children}</div>
      </div>
    </AudioProvider>
  );
}
