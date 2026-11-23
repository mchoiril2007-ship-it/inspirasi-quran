import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Analytics } from '@vercel/analytics/next';
import SubscribeForm from '@/components/SubscribeForm';
import { SITE_URL } from '@/lib/content';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Quran Inspiration · Memahami Al-Qur'an, satu surat setiap kali", template: '%s · Quran Inspiration' },
  description: "Inspirasi Al-Qur'an per surat dalam bahasa Indonesia: baca naskahnya, tonton videonya, dan dengarkan versi audionya dengan murattal ayat Al-Qur'an.",
  applicationName: 'Quran Inspiration',
  alternates: { canonical: '/' },
  openGraph: { type: 'website', siteName: 'Quran Inspiration', locale: 'id_ID', url: '/' },
  twitter: { card: 'summary_large_image' },
  icons: { icon: '/icon.svg', apple: '/icon-512.png' },
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
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <header className="site-header">
          <div className="wrap">
            <Link href="/" className="brand" aria-label="Quran Inspiration, ke beranda">
              <span className="brand-mark" aria-hidden="true">ق</span>
              Quran Inspiration
            </Link>
            <a href="#langganan" className="header-cta">
              Langganan
            </a>
          </div>
        </header>
        <main>{children}</main>
        <SubscribeForm />
        <footer className="site-footer">
          <div className="wrap">
            <span>© {new Date().getFullYear()} Quran Inspiration · M. Choiril Alam</span>
            <span>
              <a href="https://www.instagram.com/quran.insp/" rel="noopener" target="_blank">Instagram @quran.insp</a>
              {' · '}
              <a href="https://www.youtube.com/@QuranInspiration" rel="noopener" target="_blank">YouTube</a>
            </span>
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
