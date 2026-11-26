import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import SubscribeForm from '@/components/SubscribeForm';
import SiteShell from '@/components/SiteShell';
import { SITE_URL, getDocs, getSurah } from '@/lib/content';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Quran Inspiration · Untuk hati yang rindu memahami Al-Qur'an", template: '%s · Quran Inspiration' },
  description: "Inspirasi Al-Qur'an per surat dalam bahasa Indonesia: baca naskahnya, tonton videonya, dan dengarkan versi audionya dengan murattal ayat Al-Qur'an.",
  applicationName: 'Quran Inspiration',
  alternates: { canonical: '/' },
  openGraph: { type: 'website', siteName: 'Quran Inspiration', locale: 'id_ID', url: '/' },
  twitter: { card: 'summary_large_image' },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const navItems = getDocs().map((d) => {
    const su = getSurah(d.slug);
    return { slug: d.slug, number: d.number, name: su?.name || d.name, arabic: su?.arabic || '', meaning: su?.meaning || '', aliases: su?.aliases || [], tagline: d.tagline || '' };
  });
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <SiteShell items={navItems}>
          <main>{children}</main>
          <SubscribeForm />
          <footer className="site-footer">
            <div className="footer-inner">
              <a href="/" className="footer-logo" aria-label="Quran Inspiration, ke beranda">
                <span className="brand-mark" aria-hidden="true">
                  Q
                </span>
              </a>
              <a href="https://www.instagram.com/quran.insp/" target="_blank" rel="noopener noreferrer" className="footer-ig">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.9" fill="currentColor" stroke="none" />
                </svg>
                Ikuti di Instagram @quran.insp
              </a>
              <p className="footer-copy">© 2026 Quran Inspiration</p>
            </div>
          </footer>
        </SiteShell>
        <Analytics />
      </body>
    </html>
  );
}
