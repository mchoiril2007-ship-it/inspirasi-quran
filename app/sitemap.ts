import type { MetadataRoute } from 'next';
import { getDocs, SITE_URL } from '@/lib/content';

export default function sitemap(): MetadataRoute.Sitemap {
  const docs = getDocs();
  return [
    { url: SITE_URL, changeFrequency: 'weekly', priority: 1 },
    ...docs.flatMap((d) => {
      const lastModified = d.source?.updatedAt ? new Date(d.source.updatedAt) : undefined;
      return [
        { url: `${SITE_URL}/surat/${d.slug}`, lastModified, priority: 0.9 },
        { url: `${SITE_URL}/surat/${d.slug}/tonton`, lastModified, priority: 0.6 },
        { url: `${SITE_URL}/surat/${d.slug}/dengarkan`, lastModified, priority: 0.6 },
      ];
    }),
  ];
}
