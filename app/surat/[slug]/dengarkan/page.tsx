import type { Metadata } from 'next';
import AudioPlayer from '@/components/AudioPlayer';
import { IconHeadphones } from '@/components/Icons';
import { getAudio, getDoc, getSurah } from '@/lib/content';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const doc = getDoc((await params).slug)!;
  return {
    title: `Audio ${doc.title}`,
    description: `Dengarkan versi audio inspirasi Quran Surat ${doc.name}, lengkap dengan murattal Syekh Abdurrahman As-Sudais.`,
    alternates: { canonical: `/surat/${doc.slug}/dengarkan` },
  };
}

export default async function DengarkanPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = getDoc(slug)!;
  const s = getSurah(slug)!;
  const audio = getAudio(slug);
  return (
    <div className="read">
      {audio ? (
        <>
          <AudioPlayer src={`/api/audio/${slug}?v=${audio.hash}`} title={doc.title} arabic={s.arabic} duration={audio.duration} chapters={audio.chapters || []} slug={slug} />
          <p className="audio-note">Ayat dibacakan oleh Syekh Abdurrahman As-Sudais (rekaman EveryAyah). Narasi dibacakan suara AI.</p>
        </>
      ) : (
        <div className="soon">
          <div className="soon-icon">
            <IconHeadphones />
          </div>
          <h2>Audio segera hadir</h2>
          <p>Versi audio surat ini sedang disiapkan. Sementara itu, Anda bisa membaca naskahnya di tab Baca.</p>
        </div>
      )}
    </div>
  );
}
