'use client';
// "Ikuti bacaan": sorot paragraf/ayat yang sedang dibacakan audio di tab Baca, dan gulir mengikutinya.
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAudio, PauseIcon, PlayIcon, type Track } from './AudioContext';

export default function ReadAlong({ track, marks }: { track: Track; marks: [number, number][] }) {
  const ctx = useAudio();
  const active = ctx.track?.slug === track.slug;
  const [follow, setFollow] = useState(true);
  const lastEl = useRef<HTMLElement | null>(null);
  const autoScrolling = useRef(false);

  // Blok yang sedang dibacakan
  const current = useMemo(() => {
    if (!active || !marks.length) return null;
    let lo = 0;
    let hi = marks.length - 1;
    let ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (marks[mid][1] <= ctx.time + 0.25) {
        ans = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return ans >= 0 ? marks[ans][0] : null;
  }, [active, marks, ctx.time]);

  useEffect(() => {
    const el = current != null ? (document.querySelector(`.article [data-b="${current}"]`) as HTMLElement | null) : null;
    if (lastEl.current && lastEl.current !== el) lastEl.current.classList.remove('reading');
    if (el) {
      el.classList.add('reading');
      if (el !== lastEl.current && follow && ctx.playing) {
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        if (r.top < 130 || r.bottom > vh - 110) {
          autoScrolling.current = true;
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          setTimeout(() => (autoScrolling.current = false), 900);
        }
      }
    }
    lastEl.current = el;
  }, [current, follow, ctx.playing]);

  // Bersihkan sorotan saat keluar halaman / audio dihentikan
  useEffect(() => () => lastEl.current?.classList.remove('reading'), []);
  useEffect(() => {
    if (!active) lastEl.current?.classList.remove('reading');
  }, [active]);

  // Pengguna menggulir sendiri → berhenti mengikuti
  useEffect(() => {
    const stop = () => {
      if (!autoScrolling.current) setFollow(false);
    };
    window.addEventListener('wheel', stop, { passive: true });
    window.addEventListener('touchmove', stop, { passive: true });
    return () => {
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchmove', stop);
    };
  }, []);

  // Ketuk paragraf untuk memutar audio dari bagian itu
  useEffect(() => {
    if (!marks.length) return;
    const start = new Map<number, number>();
    for (const [b, t] of marks) if (!start.has(b)) start.set(b, t);
    const onClick = (e: MouseEvent) => {
      if (!active) return;
      const target = e.target as HTMLElement;
      if (target.closest('a, button, summary, input')) return;
      if (window.getSelection()?.toString()) return;
      const el = target.closest('.article [data-b]') as HTMLElement | null;
      if (!el) return;
      const t = start.get(+el.dataset.b!);
      if (t == null) return;
      ctx.seek(t);
      setFollow(true);
      if (!ctx.playing) ctx.toggle();
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [marks, active, ctx]);

  if (!marks.length) return null;

  const start = () => {
    setFollow(true);
    if (active) ctx.toggle();
    else ctx.load(track, true);
  };

  return (
    <>
      <div className="readalong">
        <button className="readalong-btn" onClick={start}>
          {active && ctx.playing ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
          {active && ctx.playing ? 'Jeda audio' : active && ctx.time > 1 ? 'Lanjutkan dengarkan sambil membaca' : 'Dengarkan sambil membaca'}
        </button>
        {active ? <span className="readalong-hint">Bagian yang sedang dibacakan disorot. Ketuk paragraf untuk memutar dari situ.</span> : null}
      </div>
      {active && ctx.playing && !follow ? (
        <button
          className="follow-btn"
          onClick={() => {
            setFollow(true);
            lastEl.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        >
          ↓ Ikuti bacaan
        </button>
      ) : null}
    </>
  );
}
