import { SuratSearch } from '@/components/Client';
import { getAudio, getDocs, getSurah, getVideos } from '@/lib/content';

const ic = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
const BENEFITS = [
  {
    title: 'Paham intinya',
    text: 'Tahu pesan utama surat dalam sekali baca.',
    icon: (
      <svg {...ic}>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="0.8" fill="currentColor" />
      </svg>
    ),
  },
  {
    title: 'Lihat alurnya',
    text: 'Mengerti kenapa ayat seolah berpindah topik.',
    icon: (
      <svg {...ic}>
        <circle cx="5" cy="6" r="2" />
        <circle cx="19" cy="18" r="2" />
        <path d="M7 6h7a3 3 0 0 1 0 6h-4a3 3 0 0 0 0 6h7" />
      </svg>
    ),
  },
  {
    title: 'Temukan benang merahnya',
    text: 'Surat ini terhubung dengan surat sebelum dan sesudahnya.',
    icon: (
      <svg {...ic}>
        <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" />
        <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
      </svg>
    ),
  },
  {
    title: 'Bawa ke hidup',
    text: 'Pesan yang relevan untuk kita hari ini.',
    icon: (
      <svg {...ic}>
        <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />
      </svg>
    ),
  },
];

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
    description: "Untuk hati yang rindu memahami Al-Qur'an.",
    inLanguage: 'id',
  };
  return (
    <>
      <section className="hero wrap">
        <h1>
          Quran <span>Inspiration</span>
        </h1>
        <p className="tagline-1">Untuk hati yang rindu memahami</p>
        <p className="tagline-2">Al-Qur&apos;an</p>
      </section>
      <section className="wrap" aria-label="Yang Anda dapatkan">
        <ul className="benefits">
          {BENEFITS.map((b, i) => (
            <li key={b.title} className={i === 3 ? 'benefit accent' : 'benefit'}>
              <span className="benefit-icon" aria-hidden="true">
                {b.icon}
              </span>
              <span>
                <b>{b.title}</b>
                <span className="benefit-text">{b.text}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="start-row">
          <a href="#daftar-surat" className="btn btn-teal start-btn">
            Mulai Membaca
          </a>
        </div>
      </section>
      <SuratSearch items={items} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
