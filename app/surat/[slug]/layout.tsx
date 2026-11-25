import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Tabs } from '@/components/Client';
import { SuratStats } from '@/components/Stats';
import { ShareButton } from '@/components/Share';
import { getDoc, getDocs, getSurah } from '@/lib/content';

export const dynamicParams = false;
export function generateStaticParams() {
  return getDocs().map((d) => ({ slug: d.slug }));
}

export default async function SuratLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDoc(slug);
  const s = getSurah(slug);
  if (!doc || !s) notFound();
  const all = getDocs();
  const i = all.findIndex((d) => d.slug === slug);
  const prevDoc = i > 0 ? all[i - 1] : null;
  const nextDoc = i < all.length - 1 ? all[i + 1] : null;
  const prev = prevDoc ? getSurah(prevDoc.slug) : null;
  const next = nextDoc ? getSurah(nextDoc.slug) : null;
  return (
    <>
      <header className="surat-head wrap">
        <div className="eyebrow">Surat ke-{s.number}</div>
        <div className="surat-title-row">
          <h1>
            <span className="sr-only">Inspirasi Quran Surat </span>
            {s.name.replace(/-/g, '\u2011')}
          </h1>
          <ShareButton
            className="share-btn"
            label={`Bagikan Surat ${s.name}`}
            data={{ title: `Inspirasi Quran Surat ${s.name}`, text: `Inspirasi Quran Surat ${s.name}${doc.tagline ? ' — ' + doc.tagline : ''}`, path: `/surat/${slug}` }}
          />
        </div>
        <p className="surat-meaning">{s.meaning}</p>
        <p className="surat-ar" lang="ar" dir="rtl">
          {s.arabic}
        </p>
        {doc.tagline ? <p className="tagline">{doc.tagline}</p> : null}
        <p className="meta">
          {s.ayat} ayat · {s.place}
        </p>
        <SuratStats slug={slug} />
      </header>
      <Tabs slug={slug} />
      {children}
      <nav className="surat-pager read" aria-label="Surat lain">
        {prev ? (
          <Link href={`/surat/${prev.slug}`} className="pager-prev">
            <span className="pager-dir">‹ Surat sebelumnya</span>
            <span className="pager-name">{prev.name}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/surat/${next.slug}`} className="pager-next">
            <span className="pager-dir">Surat berikutnya ›</span>
            <span className="pager-name">{next.name}</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </>
  );
}
