'use client';
// Tombol bagikan: memakai menu bagikan bawaan HP; bila tidak didukung, tampil pilihan WhatsApp & Salin tautan.
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export type ShareData = { title: string; text: string; path: string };

export const ShareIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12" />
    <path d="M8 7l4-4 4 4" />
    <path d="M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
  </svg>
);

export function ShareButton({ data, className, label, children, onBeforeShare }: { data: ShareData; className?: string; label?: string; children?: ReactNode; onBeforeShare?: () => void }) {
  const [sheet, setSheet] = useState(false);
  const [toast, setToast] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(false), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const url = () => (typeof window !== 'undefined' ? window.location.origin : '') + data.path;

  const share = async () => {
    onBeforeShare?.();
    const payload = { title: data.title, text: data.text, url: url() };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch (e: any) {
        if (e?.name === 'AbortError') return; // dibatalkan pengguna
      }
    }
    setSheet(true);
  };

  const copy = async () => {
    const u = url();
    try {
      await navigator.clipboard.writeText(u);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = u;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
      } catch {}
      ta.remove();
    }
    setSheet(false);
    setToast(true);
  };

  const wa = `https://wa.me/?text=${encodeURIComponent(`${data.text}\n${url()}`)}`;

  return (
    <>
      <button type="button" className={className || 'share-btn'} onClick={share} aria-label={label || 'Bagikan'}>
        {children ?? <ShareIcon />}
      </button>
      {mounted && sheet
        ? createPortal(
            <div className="share-overlay" onClick={() => setSheet(false)}>
              <div className="share-sheet" role="dialog" aria-label="Bagikan" onClick={(e) => e.stopPropagation()}>
                <p className="share-title">{data.title}</p>
                <a className="share-opt" href={wa} target="_blank" rel="noopener noreferrer" onClick={() => setSheet(false)}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.1z" />
                    <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-2-1-1 .8a4 4 0 0 1-1.8-1.8l.8-1-1-2z" />
                  </svg>
                  WhatsApp
                </a>
                <button type="button" className="share-opt" onClick={copy}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
                    <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
                  </svg>
                  Salin tautan
                </button>
                <button type="button" className="share-cancel" onClick={() => setSheet(false)}>
                  Batal
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
      {mounted && toast
        ? createPortal(
            <div className="share-toast" role="status">
              Tautan disalin
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
