import type { Metadata } from 'next';
import Article from '@/components/Article';
import { ReadingProgress } from '@/components/Client';
import { getDoc, SITE_URL } from '@/lib/content';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const doc = getDoc((await params).slug)!;
  const title = doc.tagline ? `${doc.title}: ${doc.tagline}` : doc.title;
  return {
    title,
    description: doc.description,
    alternates: { canonical: `/surat/${doc.slug}` },
    openGraph: { title, description: doc.description, type: 'article', url: `/surat/${doc.slug}` },
  };
}

export default async function BacaPage({ params }: { params: Promise<{ slug: string }> }) {
  const doc = getDoc((await params).slug)!;
  const toc = doc.blocks.filter((b) => b.type === 'h2') as { text: string; id: string }[];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: doc.title,
    description: doc.description,
    inLanguage: 'id',
    author: { '@type': 'Person', name: 'M. Choiril Alam' },
    publisher: { '@type': 'Organization', name: 'Quran Inspiration' },
    mainEntityOfPage: `${SITE_URL}/surat/${doc.slug}`,
    dateModified: doc.source?.updatedAt,
  };
  return (
    <div className="read">
      <ReadingProgress />
      {toc.length > 2 ? (
        <details className="toc" style={{ marginTop: 24 }}>
          <summary>Daftar isi</summary>
          <ol>
            {toc.map((t) => (
              <li key={t.id}>
                <a href={`#${t.id}`}>{t.text}</a>
              </li>
            ))}
          </ol>
        </details>
      ) : null}
      <Article blocks={doc.blocks} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </div>
  );
}
