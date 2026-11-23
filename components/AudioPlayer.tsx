'use client';
import { useEffect, useRef, useState } from 'react';

type Chapter = { title: string; start: number };
const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];

function fmt(t: number) {
  if (!isFinite(t) || t < 0) t = 0;
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
}

export default function AudioPlayer({ src, title, arabic, duration, chapters, slug }: { src: string; title: string; arabic: string; duration: number; chapters: Chapter[]; slug: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(duration || 0);
  const [speed, setSpeed] = useState(1);
  const posKey = 'qi-pos-' + slug;

  // Lanjutkan dari posisi terakhir
  useEffect(() => {
    const a = ref.current;
    if (!a) return;
    try {
      const saved = parseFloat(localStorage.getItem(posKey) || '0');
      if (saved > 5) a.currentTime = saved;
      const sp = parseFloat(localStorage.getItem('qi-speed') || '1');
      if (SPEEDS.includes(sp)) {
        a.playbackRate = sp;
        setSpeed(sp);
      }
    } catch {}
  }, [posKey]);

  // Kontrol di layar kunci / notifikasi HP
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const a = ref.current!;
    navigator.mediaSession.metadata = new MediaMetadata({
      title,
      artist: 'Quran Inspiration',
      album: 'Inspirasi Quran',
      artwork: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png' }],
    });
    const set = (k: MediaSessionAction, fn: MediaSessionActionHandler | null) => {
      try {
        navigator.mediaSession.setActionHandler(k, fn);
      } catch {}
    };
    set('play', () => a.play());
    set('pause', () => a.pause());
    set('seekbackward', () => (a.currentTime = Math.max(0, a.currentTime - 15)));
    set('seekforward', () => (a.currentTime = Math.min(a.duration || 1e9, a.currentTime + 15)));
    set('seekto', (d) => {
      if (d.seekTime != null) a.currentTime = d.seekTime;
    });
    return () => {
      (['play', 'pause', 'seekbackward', 'seekforward', 'seekto'] as MediaSessionAction[]).forEach((k) => set(k, null));
    };
  }, [title]);

  const a = () => ref.current!;
  const toggle = () => (a().paused ? a().play() : a().pause());
  const skip = (d: number) => (a().currentTime = Math.max(0, Math.min((a().duration || dur) - 0.5, a().currentTime + d)));
  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    a().playbackRate = next;
    setSpeed(next);
    try {
      localStorage.setItem('qi-speed', String(next));
    } catch {}
  };

  const current = chapters.reduce((acc, c, i) => (time >= c.start ? i : acc), -1);

  return (
    <div className="player">
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration || duration)}
        onRateChange={(e) => setSpeed(e.currentTarget.playbackRate)}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          setTime(t);
          if (Math.floor(t) % 5 === 0) {
            try {
              localStorage.setItem(posKey, String(t));
            } catch {}
          }
        }}
        onEnded={() => {
          try {
            localStorage.removeItem(posKey);
          } catch {}
        }}
      />
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
        onChange={(e) => (a().currentTime = +e.target.value)}
        aria-label="Posisi audio"
      />
      <div className="times">
        <span>{fmt(time)}</span>
        <span>-{fmt((dur || 0) - time)}</span>
      </div>
      <div className="controls">
        <button className="ctl" onClick={() => skip(-15)} aria-label="Mundur 15 detik">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 12a8 8 0 1 0 2.4-5.7" /><path d="M4 4v4h4" /></svg>
          <small>15</small>
        </button>
        <button className="ctl main" onClick={toggle} aria-label={playing ? 'Jeda' : 'Putar'}>
          {playing ? (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          ) : (
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z" /></svg>
          )}
        </button>
        <button className="ctl" onClick={() => skip(15)} aria-label="Maju 15 detik">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M20 12a8 8 0 1 1-2.4-5.7" /><path d="M20 4v4h-4" /></svg>
          <small>15</small>
        </button>
      </div>
      <div className="speed-row">
        <button className="speed" onClick={cycleSpeed} aria-label="Ubah kecepatan">
          Kecepatan {speed}×
        </button>
      </div>
      {chapters.length > 1 ? (
        <div className="chapters">
          <h3>Bagian</h3>
          {chapters.map((c, i) => (
            <button
              key={i}
              className={i === current ? 'on' : ''}
              onClick={() => {
                a().currentTime = c.start;
                a().play();
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
