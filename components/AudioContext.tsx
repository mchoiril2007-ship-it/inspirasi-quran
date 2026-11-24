'use client';
// Satu pemutar audio untuk seluruh web: tetap berputar saat pindah tab (Baca/Tonton) atau ke surat lain.
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export type Chapter = { title: string; start: number };
export type Track = { slug: string; src: string; title: string; arabic: string; duration: number; chapters: Chapter[] };

export const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];

export function fmt(t: number) {
  if (!isFinite(t) || t < 0) t = 0;
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(s).padStart(2, '0');
}

type Ctx = {
  track: Track | null;
  playing: boolean;
  time: number;
  dur: number;
  speed: number;
  load: (t: Track, autoplay?: boolean, startAt?: number) => void;
  toggle: () => void;
  seek: (t: number) => void;
  skip: (d: number) => void;
  cycleSpeed: () => void;
  stop: () => void;
};

const AudioCtx = createContext<Ctx | null>(null);
export const useAudio = () => useContext(AudioCtx)!;

const posKey = (slug: string) => 'qi-pos-' + slug;
const store = {
  get(k: string) {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set(k: string, v: string) {
    try {
      localStorage.setItem(k, v);
    } catch {}
  },
  del(k: string) {
    try {
      localStorage.removeItem(k);
    } catch {}
  },
};

export function AudioProvider({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [speed, setSpeed] = useState(1);
  const pendingSeek = useRef(0);

  useEffect(() => {
    const sp = parseFloat(store.get('qi-speed') || '1');
    if (SPEEDS.includes(sp)) setSpeed(sp);
  }, []);

  const load = useCallback(
    (t: Track, autoplay = false, startAt?: number) => {
      const a = ref.current!;
      if (track?.slug === t.slug && startAt != null) a.currentTime = startAt;
      if (track?.slug !== t.slug) {
        if (track) store.set(posKey(track.slug), String(a.currentTime || 0));
        setTrack(t);
        setDur(t.duration || 0);
        const saved = parseFloat(store.get(posKey(t.slug)) || '0');
        pendingSeek.current = startAt != null ? startAt : saved > 5 ? saved : 0;
        setTime(pendingSeek.current);
        a.src = t.src;
        a.playbackRate = speed;
        a.load();
      }
      if (autoplay) a.play().catch(() => {});
    },
    [track, speed],
  );

  const toggle = useCallback(() => {
    const a = ref.current!;
    if (!track) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }, [track]);

  const seek = useCallback((t: number) => {
    const a = ref.current!;
    a.currentTime = Math.max(0, t);
    setTime(a.currentTime);
  }, []);

  const skip = useCallback(
    (d: number) => {
      const a = ref.current!;
      a.currentTime = Math.max(0, Math.min((a.duration || dur) - 0.5, a.currentTime + d));
    },
    [dur],
  );

  const cycleSpeed = useCallback(() => {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    if (ref.current) ref.current.playbackRate = next;
    setSpeed(next);
    store.set('qi-speed', String(next));
  }, [speed]);

  const stop = useCallback(() => {
    const a = ref.current!;
    if (track) store.set(posKey(track.slug), String(a.currentTime || 0));
    a.pause();
    a.removeAttribute('src');
    a.load();
    setTrack(null);
    setPlaying(false);
  }, [track]);

  // Kontrol di layar kunci / notifikasi HP
  useEffect(() => {
    if (!track || !('mediaSession' in navigator)) return;
    const a = ref.current!;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
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
  }, [track]);

  return (
    <AudioCtx.Provider value={{ track, playing, time, dur, speed, load, toggle, seek, skip, cycleSpeed, stop }}>
      <audio
        ref={ref}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onLoadedMetadata={(e) => {
          const a = e.currentTarget;
          setDur(a.duration || track?.duration || 0);
          a.playbackRate = speed;
          if (pendingSeek.current) {
            a.currentTime = pendingSeek.current;
            pendingSeek.current = 0;
          }
        }}
        onRateChange={(e) => setSpeed(e.currentTarget.playbackRate)}
        onTimeUpdate={(e) => {
          const t = e.currentTarget.currentTime;
          setTime(t);
          if (track && Math.floor(t) % 5 === 0) store.set(posKey(track.slug), String(t));
        }}
        onEnded={() => track && store.del(posKey(track.slug))}
      />
      {children}
      <MiniPlayer />
    </AudioCtx.Provider>
  );
}

const PlayIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M8 5.5v13a1 1 0 0 0 1.5.86l11-6.5a1 1 0 0 0 0-1.72l-11-6.5A1 1 0 0 0 8 5.5z" />
  </svg>
);
const PauseIcon = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <rect x="6" y="5" width="4" height="14" rx="1" />
    <rect x="14" y="5" width="4" height="14" rx="1" />
  </svg>
);
export { PlayIcon, PauseIcon };

// Pemutar mini di bawah layar, muncul di halaman lain selama audio berjalan/dijeda
function MiniPlayer() {
  const { track, playing, time, dur, toggle, skip, stop } = useAudio();
  const pathname = usePathname();
  const visible = !!track && pathname !== `/surat/${track.slug}/dengarkan`;
  useEffect(() => {
    document.body.classList.toggle('has-mini', visible);
  }, [visible]);
  if (!visible || !track) return null;
  const pct = dur ? Math.min(100, (time / dur) * 100) : 0;
  return (
    <div className="mini" role="region" aria-label="Pemutar audio">
      <div className="mini-bar">
        <i style={{ width: pct + '%' }} />
      </div>
      <div className="mini-row">
        <Link href={`/surat/${track.slug}/dengarkan`} className="mini-info">
          <span className="mini-cover" aria-hidden="true">
            {track.arabic}
          </span>
          <span className="mini-text">
            <span className="mini-title">{track.title.replace(/^Inspirasi Quran\s+/i, '')}</span>
            <span className="mini-time">
              {fmt(time)} / {fmt(dur)}
            </span>
          </span>
        </Link>
        <button className="mini-btn" onClick={() => skip(-15)} aria-label="Mundur 15 detik">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M4 12a8 8 0 1 0 2.4-5.7" />
            <path d="M4 4v4h4" />
          </svg>
        </button>
        <button className="mini-btn main" onClick={toggle} aria-label={playing ? 'Jeda' : 'Putar'}>
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button className="mini-btn" onClick={() => skip(15)} aria-label="Maju 15 detik">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M20 12a8 8 0 1 1-2.4-5.7" />
            <path d="M20 4v4h-4" />
          </svg>
        </button>
        <button className="mini-btn close" onClick={stop} aria-label="Tutup pemutar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
