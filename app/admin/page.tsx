'use client';
import { useEffect, useState, type FormEvent } from 'react';

type Row = { time: string; name: string; email: string; whatsapp: string; page: string };
type Item = { file?: string; slug?: string; status: string; message: string };
const TARGET = 200;
const dt = (s?: string) => (s ? new Date(s).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }) + ' WIB' : '-');

function toCsv(rows: Row[]) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return ['Waktu,Nama,Email,WhatsApp,Halaman', ...rows.map((r) => [r.time, r.name, r.email, r.whatsapp, r.page].map(esc).join(','))].join('\n');
}

export default function Admin() {
  const [pw, setPw] = useState('');
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);

  async function load(password: string) {
    setBusy(true);
    setErr('');
    try {
      const r = await fetch('/api/admin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
      const d = await r.json();
      if (!d.ok) throw new Error(d.error);
      setData(d);
      sessionStorage.setItem('qi-admin', password);
    } catch (e: any) {
      setErr(e.message || 'Gagal memuat');
      sessionStorage.removeItem('qi-admin');
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const saved = sessionStorage.getItem('qi-admin');
    if (saved) {
      setPw(saved);
      load(saved);
    }
  }, []);

  if (!data) {
    return (
      <div className="wrap admin">
        <form
          className="login"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            load(pw);
          }}
        >
          <h1>Admin</h1>
          <div className="field">
            <label htmlFor="pw">Kata sandi</label>
            <input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" required />
          </div>
          <button className="btn btn-teal" disabled={busy}>
            {busy ? 'Memuat…' : 'Masuk'}
          </button>
          {err ? <p className="form-msg err">{err}</p> : null}
        </form>
      </div>
    );
  }

  const rows: Row[] = data.subscribers?.rows || [];
  const st = data.status;
  const problems: Item[] = [...(st?.naskah || []), ...(st?.audio || [])].filter((x: Item) => x.status !== 'ok');
  const download = () => {
    const blob = new Blob(['﻿' + toCsv(rows)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `pendaftar-quran-inspiration-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  return (
    <div className="wrap admin">
      <h1>Admin Quran Inspiration</h1>
      <div className="stats">
        <div className="stat">
          <b>{rows.length}</b>
          <span>pendaftar dari target {TARGET}</span>
          <div className="bar">
            <i style={{ width: Math.min(100, (rows.length / TARGET) * 100) + '%' }} />
          </div>
        </div>
        <div className="stat">
          <b>{data.docs.length}</b>
          <span>surat tayang</span>
        </div>
        <div className="stat">
          <b>{data.unmatchedVideos.length}</b>
          <span>video belum cocok</span>
        </div>
        <div className="stat">
          <b style={{ fontSize: 18 }}>{dt(st?.lastSync)}</b>
          <span>sinkron terakhir</span>
        </div>
      </div>

      <h2>Pendaftar</h2>
      {data.subscribers?.ok === false ? <p className="form-msg err">{data.subscribers.error}</p> : null}
      <div className="actions">
        <button className="btn btn-orange" onClick={download} disabled={!rows.length}>
          Unduh CSV (Excel)
        </button>
        {data.subscribers?.sheetUrl ? (
          <a className="btn btn-ghost" style={{ display: 'inline-flex', alignItems: 'center' }} href={data.subscribers.sheetUrl} target="_blank" rel="noopener">
            Buka di Google Sheets
          </a>
        ) : null}
      </div>
      <div className="scroll-x list">
        <table>
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Nama</th>
              <th>Email</th>
              <th>WhatsApp</th>
              <th>Halaman</th>
            </tr>
          </thead>
          <tbody>
            {rows
              .slice()
              .reverse()
              .map((r, i) => (
                <tr key={i}>
                  <td>{dt(r.time)}</td>
                  <td>{r.name}</td>
                  <td>{r.email}</td>
                  <td>{r.whatsapp}</td>
                  <td>{r.page}</td>
                </tr>
              ))}
            {!rows.length ? (
              <tr>
                <td colSpan={5}>Belum ada pendaftar.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <h2>Naskah atau audio yang gagal diproses</h2>
      {!st ? <p>Belum ada data sinkron. Sinkron pertama berjalan otomatis setiap jam.</p> : null}
      {st?.errors?.length ? (
        <div className="list" style={{ marginBottom: 12 }}>
          {st.errors.map((e: string, i: number) => (
            <div className="row" key={i}>
              <span className="tag error">Error</span>
              {e}
            </div>
          ))}
        </div>
      ) : null}
      {st ? (
        problems.length ? (
          <div className="list">
            {problems.map((p, i) => (
              <div className="row" key={i}>
                <span className={`tag ${p.status}`}>{p.status === 'error' ? 'Gagal' : 'Catatan'}</span>
                {p.file || p.slug}
                <small>{p.message}</small>
              </div>
            ))}
          </div>
        ) : (
          <p>Semua naskah dan audio aman. ✓</p>
        )
      ) : null}

      <h2>Video YouTube yang belum cocok dengan surat ({data.unmatchedVideos.length})</h2>
      <p style={{ color: 'var(--text-2)', fontSize: 16 }}>
        Channel: {data.channel ? `${data.channel.title} ${data.channel.handle || ''}` : st?.youtube?.message || 'belum terbaca'}. Tambahkan nama surat di judul video (misalnya &quot;Al-Ikhlas&quot;), maka
        video akan muncul otomatis pada sinkron berikutnya.
      </p>
      {st?.youtube?.suggestions?.length ? (
        <p className="form-msg err">Mungkin maksudnya: {st.youtube.suggestions.map((s: any) => s.title).join(', ')}</p>
      ) : null}
      <div className="list">
        {data.unmatchedVideos.slice(0, showAll ? undefined : 30).map((v: any) => (
          <div className="row" key={v.id}>
            <a href={`https://www.youtube.com/watch?v=${v.id}`} target="_blank" rel="noopener">
              {v.title}
            </a>
            <small>{dt(v.publishedAt)}</small>
          </div>
        ))}
        {!data.unmatchedVideos.length ? <div className="row">Tidak ada. ✓</div> : null}
      </div>
      {data.unmatchedVideos.length > 30 && !showAll ? (
        <div className="actions">
          <button className="btn btn-ghost" onClick={() => setShowAll(true)}>
            Tampilkan semua ({data.unmatchedVideos.length})
          </button>
        </div>
      ) : null}

      <h2>Surat yang tayang</h2>
      <div className="list">
        {data.docs.map((d: any) => (
          <div className="row" key={d.slug}>
            <a href={`/surat/${d.slug}`}>
              {d.number}. {d.name}
            </a>
            <small>
              {d.file} · {d.videos} video · {d.audio ? 'audio siap' : 'audio belum ada'}
            </small>
          </div>
        ))}
      </div>
      <p style={{ color: 'var(--text-3)', fontSize: 14, marginTop: 30 }}>
        Statistik pengunjung: buka vercel.com → proyek ini → tab Analytics.{data.repo ? ` Repository: github.com/${data.repo}` : ''}
      </p>
    </div>
  );
}
