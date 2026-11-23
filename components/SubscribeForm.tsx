'use client';
import { useState, type FormEvent } from 'react';
import { usePathname } from 'next/navigation';
import { track } from '@vercel/analytics';

export default function SubscribeForm() {
  const pathname = usePathname();
  const [state, setState] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle');
  const [msg, setMsg] = useState('');
  const [startedAt] = useState(() => Date.now());

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setState('sending');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fd.get('name'),
          email: fd.get('email'),
          whatsapp: fd.get('whatsapp'),
          website: fd.get('website'),
          page: pathname,
          elapsed: Date.now() - startedAt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'Gagal mengirim');
      setState('ok');
      setMsg(data.duplicate ? 'Email ini sudah terdaftar. Terima kasih!' : 'Alhamdulillah, Anda sudah terdaftar. Inspirasi surat terbaru akan kami kirimkan.');
      try {
        track('Langganan', { page: pathname });
      } catch {}
    } catch (err: any) {
      setState('err');
      setMsg(err?.message || 'Maaf, terjadi kesalahan. Coba lagi sebentar lagi.');
    }
  }

  return (
    <section className="subscribe" id="langganan" aria-labelledby="sub-title">
      <div className="wrap">
        <div className="sub-box">
          <h2 id="sub-title">Dapatkan inspirasi surat terbaru</h2>
          <p>Setiap ada surat baru, kami kabari lewat email atau WhatsApp. Gratis.</p>
          {state === 'ok' ? (
            <p className="form-msg ok" role="status">
              {msg}
            </p>
          ) : (
            <form className="sub-form" onSubmit={onSubmit}>
              <div className="field">
                <label htmlFor="sub-name">Nama</label>
                <input id="sub-name" name="name" required maxLength={100} autoComplete="name" placeholder="Nama Anda" />
              </div>
              <div className="field">
                <label htmlFor="sub-email">Email</label>
                <input id="sub-email" name="email" type="email" required maxLength={150} autoComplete="email" placeholder="nama@email.com" inputMode="email" />
              </div>
              <div className="field">
                <label htmlFor="sub-wa">WhatsApp (opsional)</label>
                <input id="sub-wa" name="whatsapp" type="tel" maxLength={30} autoComplete="tel" placeholder="08xx xxxx xxxx" inputMode="tel" pattern="[0-9+\-\s()]{8,30}" />
              </div>
              <div className="hp" aria-hidden="true">
                <label htmlFor="sub-web">Website</label>
                <input id="sub-web" name="website" tabIndex={-1} autoComplete="off" />
              </div>
              <button className="btn btn-orange" type="submit" disabled={state === 'sending'}>
                {state === 'sending' ? 'Mengirim…' : 'Daftar Sekarang'}
              </button>
              {state === 'err' ? (
                <p className="form-msg err" role="alert">
                  {msg}
                </p>
              ) : null}
              <p className="privacy">Data Anda hanya dipakai untuk mengirim inspirasi Quran, tidak dibagikan ke pihak lain.</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
