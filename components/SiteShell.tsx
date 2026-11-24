'use client';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AudioProvider } from './AudioContext';

export type NavItem = { slug: string; number: number; name: string; arabic: string };

const DESKTOP = '(min-width: 1024px)';
const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/['’`\-\s]/g, '');

export default function SiteShell({ items, children }: { items: NavItem[]; children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false); // panel di HP
  const [collapsed, setCollapsed] = useState(false); // sidebar di laptop disembunyikan
  const [q, setQ] = useState('');
  const closeRef = useRef<HTMLButtonElement>(null);
  const activeSlug = pathname.startsWith('/surat/') ? pathname.split('/')[2] : null;

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('qi-nav-collapsed') === '1');
    } catch {}
  }, []);

  // Tutup panel HP setiap pindah halaman
  useEffect(() => setOpen(false), [pathname]);

  // Kunci gulir halaman & tombol Esc saat panel HP terbuka
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const toggle = () => {
    if (window.matchMedia(DESKTOP).matches) {
      setCollapsed((c) => {
        try {
          localStorage.setItem('qi-nav-collapsed', c ? '0' : '1');
        } catch {}
        return !c;
      });
    } else setOpen((o) => !o);
  };

  const list = useMemo(() => {
    const n = norm(q);
    if (!n) return items;
    return items.filter((it) => norm(it.name).includes(n) || String(it.number) === q.trim());
  }, [q, items]);

  const isAdmin = pathname.startsWith('/admin');

  return (
    <AudioProvider>
    <div className={`shell${collapsed ? ' nav-collapsed' : ''}${open ? ' nav-open' : ''}`}>
      <header className="site-header">
        <div className="header-row">
          <div className="header-left">
            <button className="menu-btn" onClick={toggle} aria-label="Buka menu daftar surat" aria-expanded={open || !collapsed} aria-controls="side-nav">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <Link href="/" className="brand" aria-label="Quran Inspiration, ke beranda">
              <span className="brand-mark" aria-hidden="true">
                ق
              </span>
              <span className="brand-text">Quran Inspiration</span>
            </Link>
          </div>
          {!isAdmin ? (
            <a href="#langganan" className="header-cta">
              Langganan
            </a>
          ) : null}
        </div>
      </header>

      <div className="nav-overlay" onClick={() => setOpen(false)} aria-hidden="true" />

      <aside id="side-nav" className="side-nav" aria-label="Daftar surat">
        <div className="side-top">
          <span className="side-title">Menu</span>
          <button ref={closeRef} className="side-close" onClick={() => setOpen(false)} aria-label="Tutup menu">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <Link href="/" className={`side-home${pathname === '/' ? ' active' : ''}`} aria-current={pathname === '/' ? 'page' : undefined}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 11l9-7 9 7" />
            <path d="M5 10v10h14V10" />
          </svg>
          Beranda
        </Link>
        <div className="side-search">
          <label htmlFor="nav-cari" className="sr-only">
            Cari surat di menu
          </label>
          <input id="nav-cari" type="search" placeholder="Cari surat…" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
        </div>
        <div className="side-label">Surat tersedia ({items.length})</div>
        <nav className="side-list">
          {list.map((it) => {
            const active = it.slug === activeSlug;
            return (
              <Link key={it.slug} href={`/surat/${it.slug}`} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
                <span className="side-num">{it.number}</span>
                <span className="side-name">{it.name}</span>
                <span className="side-ar" lang="ar">
                  {it.arabic}
                </span>
              </Link>
            );
          })}
          {!list.length ? <p className="side-empty">Surat belum tersedia.</p> : null}
        </nav>
      </aside>

      <div className="shell-main">{children}</div>
    </div>
    </AudioProvider>
  );
}
