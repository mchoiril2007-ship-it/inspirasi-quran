import type { Metadata } from 'next';
import { VideoEmbed } from '@/components/Client';
import { IconPlayCircle } from '@/components/Icons';
import { getDoc, getVideos } from '@/lib/content';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const doc = getDoc((await params).slug)!;
  return {
    title: `Video ${doc.title}`,
    description: `Tonton video inspirasi Quran Surat ${doc.name}. ${doc.description}`,
    alternates: { canonical: `/surat/${doc.slug}/tonton` },
  };
}

const dateFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

export default async function TontonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const videos = getVideos(slug);
  return (
    <div className="read">
      {videos.length ? (
        <div className="videos">
          {videos.map((v) => (
            <article key={v.id}>
              <VideoEmbed id={v.id} title={v.title} />
              <h2 className="video-title">{v.title}</h2>
              {v.publishedAt ? <div className="video-date">{dateFmt.format(new Date(v.publishedAt))}</div> : null}
            </article>
          ))}
        </div>
      ) : (
        <div className="soon">
          <div className="soon-icon">
            <IconPlayCircle />
          </div>
          <h2>Video segera hadir</h2>
          <p>Daftar di bawah supaya Anda dikabari saat videonya terbit.</p>
        </div>
      )}
    </div>
  );
}
