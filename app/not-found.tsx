import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="wrap" style={{ textAlign: 'center', padding: '80px 20px' }}>
      <h1 style={{ fontSize: 40, letterSpacing: '-0.02em' }}>Halaman tidak ditemukan</h1>
      <p style={{ color: 'var(--text-2)' }}>Mungkin surat ini belum tersedia.</p>
      <Link href="/" className="btn btn-teal" style={{ display: 'inline-flex', alignItems: 'center', marginTop: 12 }}>
        Kembali ke beranda
      </Link>
    </div>
  );
}
