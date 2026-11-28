'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';

type C = { id: string; time: string; name: string; text: string };

const fmt = (iso: string) => {
  const d = new Date(iso);
  return isNaN(+d) ? '' : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
};

export default function Comments({ slug }: { slug: string }) {
  const [items, setItems] = useState<C[]>([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [off, setOff] = useState(false); // penyimpanan komentar belum aktif → bagian ini disembunyikan
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'err' | 'ok'>('idle');
  const [msg, setMsg] = useState('');
  const startedAt = useRef(Date.now());

  useEffect(() => {
    try {
      const n = localStorage.getItem('qi-nama');
      if (n) setName(n);
    } catch {}
  }, []);

  useEffect(() => {
    let live = true;
    setLoaded(false);
    setItems([]);
    setTotal(0);
    fetch(`/api/comments?slug=${encodeURIComponent(slug)}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (!live) return;
        setOff(d.ok === false);
        setItems(d.comments || []);
        setTotal(d.total ?? (d.comments || []).length);
      })
      .catch(() => {})
      .finally(() => live && setLoaded(true));
    return () => {
      live = false;
    };
  }, [slug]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState('sending');
    setMsg('');
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, name, text, website: fd.get('website'), elapsed: Date.now() - startedAt.current }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) throw new Error(d.error || 'Komentar belum bisa dikirim.');
      if (d.comment) {
        setItems((cur) => [d.comment, ...cur]);
        setTotal((n) => n + 1);
      }
      try {
        localStorage.setItem('qi-nama', name.trim());
      } catch {}
      setText('');
      setState('ok');
      setMsg('Terima kasih, komentar Anda sudah tampil.');
      startedAt.current = Date.now();
    } catch (err: any) {
      setState('err');
      setMsg(err?.message || 'Komentar belum bisa dikirim.');
    }
  }

  if (off) return null;

  return (
    <section className="comments read" id="komentar" aria-labelledby="cm-title">
      <h2 id="cm-title" className="cm-title">
        Komentar <span className="cm-count">{total}</span>
      </h2>

      <form className="cm-form" onSubmit={onSubmit}>
        <label htmlFor="cm-name" className="cm-label">
          Nama
        </label>
        <input id="cm-name" className="cm-input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} autoComplete="name" placeholder="Nama Anda" />
        <label htmlFor="cm-text" className="cm-label">
          Komentar
        </label>
        <textarea id="cm-text" className="cm-input cm-area" value={text} onChange={(e) => setText(e.target.value)} required maxLength={1000} rows={4} placeholder="Tulis komentar Anda" />
        <div className="hp" aria-hidden="true">
          <label htmlFor="cm-web">Website</label>
          <input id="cm-web" name="website" tabIndex={-1} autoComplete="off" />
        </div>
        <div className="cm-actions">
          <button type="submit" className="cm-send" disabled={state === 'sending'}>
            {state === 'sending' ? 'Mengirim…' : 'Kirim'}
          </button>
          <span className="cm-limit">{text.length}/1000</span>
        </div>
        {msg ? (
          <p className={`cm-msg ${state === 'err' ? 'err' : 'ok'}`} role={state === 'err' ? 'alert' : 'status'}>
            {msg}
          </p>
        ) : null}
      </form>

      {items.length ? (
        <ul className="cm-list">
          {items.map((c) => (
            <li key={c.id} className="cm-item">
              <div className="cm-head">
                <strong className="cm-name">{c.name}</strong>
                <time className="cm-date" dateTime={c.time}>
                  {fmt(c.time)}
                </time>
              </div>
              <p className="cm-text">{c.text}</p>
            </li>
          ))}
        </ul>
      ) : loaded ? (
        <p className="cm-empty">Belum ada komentar. Jadilah yang pertama.</p>
      ) : null}
    </section>
  );
}
