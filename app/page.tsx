import { SuratSearch } from '@/components/Client';
import { getAudio, getDocs, getSurah, getVideos } from '@/lib/content';

export default function Home() {
  const items = getDocs().map((d) => {
    const s = getSurah(d.slug)!;
    return {
      slug: d.slug,
      number: d.number,
      name: s.name,
      arabic: s.arabic,
      meaning: s.meaning,
      ayat: s.ayat,
      place: s.place,
      tagline: d.tagline,
      keys: [s.name, s.meaning, d.tagline, ...s.aliases].join(' '),
      hasVideo: getVideos(d.slug).length > 0,
      hasAudio: !!getAudio(d.slug),
    };
  });
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Quran Inspiration',
    description: "Memahami Al-Qur'an, satu surat setiap kali.",
    inLanguage: 'id',
  };
  return (
    <>
      <section className="hero wrap">
        <h1>
          Quran <span>Inspiration</span>
        </h1>
        <p>Memahami Al-Qur&apos;an, satu surat setiap kali.</p>
      </section>
      <SuratSearch items={items} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
