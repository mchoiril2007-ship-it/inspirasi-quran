import { notFound } from 'next/navigation';
import { Tabs } from '@/components/Client';
import { SuratStats } from '@/components/Stats';
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
  return (
    <>
      <header className="surat-head wrap">
        <div className="eyebrow">Surat ke-{s.number}</div>
        <p className="surat-ar" lang="ar" dir="rtl">
          {s.arabic}
        </p>
        <h1>{doc.title.replace(/-/g, "\u2011")}</h1>
        {doc.tagline ? <p className="tagline">{doc.tagline}</p> : null}
        <p className="meta">
          {s.meaning} · {s.ayat} ayat · {s.place}
        </p>
        <SuratStats slug={slug} />
      </header>
      <Tabs slug={slug} />
      {children}
    </>
  );
}
