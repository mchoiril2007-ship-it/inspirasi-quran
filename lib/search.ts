// Pencarian surat yang sama dipakai di ikon cari (header) dan daftar di halaman depan.
export type Searchable = { number: number; name: string; meaning?: string; aliases?: string[] };

export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`\-\s]/g, '');

/** Cocokkan berdasarkan nama, arti, nama lain (ejaan alternatif), atau nomor surat. */
export function matchSurat<T extends Searchable>(items: T[], query: string): T[] {
  const n = normalize(query);
  if (!n) return items;
  const asNumber = /^\d{1,3}$/.test(query.trim()) ? +query.trim() : null;
  return items.filter((it) => (asNumber !== null && it.number === asNumber) || normalize(`${it.name} ${it.meaning || ''} ${(it.aliases || []).join(' ')}`).includes(n));
}
