'use client';
// Tampilan pemutar besar di tab "Dengarkan". Audionya sendiri ada di AudioProvider (tetap jalan saat pindah halaman).
import { useEffect } from 'react';
import { fmt, PauseIcon, PlayIcon, useAudio, type Chapter } from './AudioContext';

export default function AudioPlayer({ src, title, arabic, duration, chapters: rawChapters, slug }: { src: string; title: string; arabic: string; duration: number; chapters: Chapter[]; slug: string }) {
  const chapters = rawChapters.filter((c, i) => i === 0 || c.title !== rawChapters[i - 1].title);
  const ctx = useAudio();
  const isCurrent = ctx.track?.slug === slug;
  const track = { slug, src, title, arabic, duration, chapters };

  // Siapkan audio surat ini bila belum ada yang diputar (tanpa memutar otomatis)
  useEffect(() => {
    if (!ctx.track) ctx.load(track);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const time = isCurrent ? ctx.time : 0;
  const dur = isCurrent ? ctx.dur || duration : duration;
  const playing = isCurrent && ctx.playing;
  const toggle = () => (isCurrent ? ctx.toggle() : ctx.load(track, true));
  const current = chapters.reduce((acc, c, i) => (time >= c.start ? i : acc), -1);

  return (
    <div className="player">
      {!isCurrent && ctx.track ? (
        <p className="player-other">
          Sedang diputar: <b>{ctx.track.title}</b>. Tekan putar untuk berganti ke surat ini.
        </p>
      ) : null}
      <div className="player-art">
        <div className="player-cover" aria-hidden="true">
          {arabic}
        </div>
        <div>
          <div className="player-title">{title}</div>
          <div className="player-sub">Versi audio · {fmt(dur)}</div>
        </div>
      </div>
      <input
        className="scrub"
        type="range"
        min={0}
        max={dur || 0}
        step={1}
        value={Math.min(time, dur || 0)}
        onChange={(e) => (isCurrent ? ctx.seek(+e.target.value) : ctx.load(track, false, +e.target.value))}
        aria-label="Posisi audio"
      />
      <div className="times">
        <span>{fmt(time)}</span>
        <span>-{fmt((dur || 0) - time)}</span>
      </div>
      <div className="controls">
        <button className="ctl" onClick={() => (isCurrent ? ctx.skip(-15) : null)} aria-label="Mundur 15 detik">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M4 12a8 8 0 1 0 2.4-5.7" />
            <path d="M4 4v4h4" />
          </svg>
          <small>15</small>
        </button>
        <button className="ctl main" onClick={toggle} aria-label={playing ? 'Jeda' : 'Putar'}>
          {playing ? <PauseIcon size={30} /> : <PlayIcon size={30} />}
        </button>
        <button className="ctl" onClick={() => (isCurrent ? ctx.skip(15) : null)} aria-label="Maju 15 detik">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M20 12a8 8 0 1 1-2.4-5.7" />
            <path d="M20 4v4h-4" />
          </svg>
          <small>15</small>
        </button>
      </div>
      <div className="speed-row">
        <button className="speed" onClick={ctx.cycleSpeed} aria-label="Ubah kecepatan">
          Kecepatan {ctx.speed}×
        </button>
      </div>
      <p className="audio-note">Audio tetap berputar saat Anda pindah ke tab Baca atau Tonton.</p>
      {chapters.length > 1 ? (
        <div className="chapters">
          <h3>Bagian</h3>
          {chapters.map((c, i) => (
            <button
              key={i}
              className={i === current ? 'on' : ''}
              onClick={() => {
                if (!isCurrent) return ctx.load(track, true, c.start);
                ctx.seek(c.start);
                if (!ctx.playing) ctx.toggle();
              }}
            >
              <span>{c.title}</span>
              <span>{fmt(c.start)}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
