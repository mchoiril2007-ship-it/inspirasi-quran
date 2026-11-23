import fs from 'node:fs';
import path from 'node:path';
// @ts-ignore - modul JS bersama dengan skrip sinkron
import SURAH from './surah-data.mjs';
import videosJson from '../content/videos.json';
import audioJson from '../content/audio.json';
import configJson from '../content/config.json';

export type Surah = { number: number; name: string; slug: string; arabic: string; meaning: string; ayat: number; place: string; aliases: string[] };

export type Block =
  | { type: 'h2'; text: string; num?: number; id: string }
  | { type: 'h3'; text: string; id: string }
  | { type: 'label'; text: string }
  | { type: 'p'; text: string }
  | { type: 'li'; n: number; text: string }
  | { type: 'faq'; text: string }
  | { type: 'keyword'; term: string; arabic: string; text: string }
  | { type: 'callout'; variant: 'key' | 'golden' | 'reflection'; label: string; text: string }
  | { type: 'ayah'; arabic: string; surahNumber: number; surahName: string; ayahs: number[]; ref: string; translation: string }
  | { type: 'arabic'; text: string }
  | { type: 'table'; head: string[]; rows: string[][] }
  | { type: 'image'; src: string; alt: string; width: number; height: number }
  | { type: 'divider' }
  | { type: 'signature'; text: string };

export type Doc = {
  slug: string;
  number: number;
  name: string;
  title: string;
  tagline: string;
  meta: string;
  author: string;
  description: string;
  blocks: Block[];
  source?: { fileId: string; fileName: string; modifiedTime: string; updatedAt?: string };
};

export type Video = { id: string; title: string; publishedAt: string };
export type AudioInfo = { url: string; file: string; hash: string; duration: number; chapters: { title: string; start: number }[]; generatedAt: string; reciterName?: string };

export const config = configJson as { siteUrl: string; youtubeHandle: string; bridgeUrl: string };
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || config.siteUrl).replace(/\/$/, '');
export const surahList = SURAH as Surah[];

const DIR = path.join(process.cwd(), 'content', 'surat');

let cache: Doc[] | null = null;
export function getDocs(): Doc[] {
  if (cache && process.env.NODE_ENV === 'production') return cache;
  const docs: Doc[] = [];
  for (const f of fs.readdirSync(DIR)) {
    if (!f.endsWith('.json')) continue;
    try {
      docs.push(JSON.parse(fs.readFileSync(path.join(DIR, f), 'utf8')));
    } catch {
      /* lewati file rusak */
    }
  }
  docs.sort((a, b) => a.number - b.number);
  cache = docs;
  return docs;
}

export function getDoc(slug: string): Doc | null {
  return getDocs().find((d) => d.slug === slug) || null;
}

export function getSurah(slug: string): Surah | null {
  return surahList.find((s) => s.slug === slug) || null;
}

export function getVideos(slug: string): Video[] {
  return ((videosJson as any).bySurah?.[slug] as Video[]) || [];
}

export function getVideosData() {
  return videosJson as { channel: { id: string; title: string; handle?: string } | null; bySurah: Record<string, Video[]>; unmatched: Video[] };
}

export function getAudio(slug: string): AudioInfo | null {
  return ((audioJson as any)[slug] as AudioInfo) || null;
}

export function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  return m >= 60 ? `${Math.floor(m / 60)} jam ${m % 60} menit` : `${m} menit`;
}
