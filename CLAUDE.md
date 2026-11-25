# Quran Inspiration (web publik) — panduan untuk Claude Code

Pemilik proyek bukan orang IT. Ambil keputusan teknis sendiri; tanyakan hanya hal yang memengaruhi tampilan atau isi.
Balas dalam bahasa Indonesia yang sederhana. Proyek ini TERPISAH dari dashboard internal Quran Inspiration yang lama: jangan sentuh dashboard itu.

## Arsitektur (semua di cloud)
- **Web**: Next.js 15 (App Router) di Vercel. Push ke `main` = web terbit ulang otomatis.
- **Isi**: `content/surat/<slug>.json` (hasil ubah naskah), `content/videos.json`, `content/audio.json`, `content/config.json`.
  File-file ini DITULIS OLEH SINKRON OTOMATIS. Jangan edit manual isi naskah; ubah naskahnya di Google Drive.
- **Sinkron 2x per jam** (menit 17 & 47): `.github/workflows/sync.yml` → `scripts/sync/index.mjs`
  - Naskah: folder Drive "Inspirasi Quran" (id `1-1ZW84uj74cpH4s7Hq6HdzPzq7y4PitP`), .docx / Google Docs. Nama file dicocokkan ke surat (`lib/match.mjs`).
  - Ubah .docx → blok halaman: `scripts/sync/docx.mjs` + `scripts/sync/parse.mjs`.
  - Video: channel YouTube "M.Choiril Alam" `@quraninspiration` (`content/config.json` → `youtubeHandle`). Dicocokkan berurutan lewat
    judul → hashtag (#AlMunafiqun) → tag → playlist bernama surat → deskripsi ("Surat …"/"QS …"). Pencocokan manual:
    `content/video-manual.json` (`{"ID_VIDEO": "al-munafiqun"}`; `null` = sembunyikan). Kalau pemilik minta "video X masuk surat Y", isi file itu.
  - Audio: `scripts/sync/audio.mjs` — narasi suara AI Edge TTS laki-laki (`id-ID-ArdiNeural`, disetujui pemilik) + kamus pelafalan + murattal per ayat
    Syekh Yasser Ad-Dossary dari EveryAyah (`config.reciter` = `Yasser_Ad-Dussary_128kbps`),
    disimpan sebagai aset GitHub Release `audio` dan disalin ke subfolder Drive "Audio". Web memutarnya lewat `/api/audio/<slug>`.
  - Kamus pelafalan suara: `content/pelafalan.json` (`manual` = ditulis tangan, `otomatis` = istilah Arab baru dari naskah,
    ditambahkan sinkron). Hanya untuk suara, teks web tidak berubah. Aktif bila `config.ttsDictionary` = true.
    Contoh audio: `node scripts/sample-audio.mjs <slug> <voice> <kamus 1|0> <rate> <pitch> out.mp3` (lokal perlu `NODE_USE_ENV_PROXY=1`).
  - Kata Arab di dalam kalimat (kata kunci, dll.) dibacakan (`config.arabicWords` = true) dengan suara AI Arab
    `ar-SA-HamedNeural` (`arabicWordSource: 'ai'`, pilihan pemilik). Opsi `'qari'` = rekaman per kata Quran.com.
    Ayat utama tetap murattal utuh dari EveryAyah.
  - "Ikuti bacaan": tiap segmen audio diberi indeks blok (`b`); `renderAudio` mencatat `marks` [blok, detik] ke audio.json.
    Tab Baca (`components/ReadAlong.tsx`) menyorot blok `[data-b]` yang sedang dibacakan, gulir otomatis, ketuk paragraf = lompat.
    Audio diputar oleh satu pemutar global (`components/AudioContext.tsx`) + pemutar mini, tetap jalan saat pindah halaman.
  - Penghitung publik baca/dengar/tonton per surat: `/api/stats` (GET semua, POST {slug, kind}) → jembatan Apps Script
    aksi `hit`/`stats` (Script Properties). Ditampilkan oleh `components/Stats.tsx` di header surat & kartu beranda.
    Dibaca = tiap buka tab Baca, didengar = tiap mulai putar audio, ditonton = tiap putar video (orang sama bisa terhitung berkali-kali).
  - Status (gagal/peringatan, video tak cocok, waktu sinkron) ditulis ke branch `status` → dibaca halaman `/admin`.
- **Jembatan Google**: `apps-script/Code.gs` (Google Apps Script milik pemilik) untuk Drive, YouTube, dan Google Sheet pendaftar.
  Kunci rahasianya TIDAK ada di repo (repo ini publik).

## Rahasia (secret)
- GitHub Actions secrets: `BRIDGE_KEY` (wajib), opsional `BRIDGE_URL` (default: `content/config.json` → `bridgeUrl`) dan `VERCEL_DEPLOY_HOOK`.
- Vercel env: `BRIDGE_KEY`, `ADMIN_PASSWORD` (URL jembatan dibaca dari `content/config.json`).
Jangan pernah menulis nilai rahasia ke file repo, commit, atau chat.

## Tugas umum
- Menambah surat: cukup taruh naskah di folder Drive "Inspirasi Quran" dengan nama surat di nama file. Tunggu ≤1 jam.
  Untuk mempercepat: jalankan workflow "Sinkron otomatis" (tab Actions → Run workflow), atau `gh workflow run sync.yml`.
- Mengubah tampilan: `app/globals.css` (warna brand teal #1A7A6E, oranye #C45000), komponen di `components/`.
- Menambah alias nama surat: `data/surah.tsv` lalu `node scripts/gen-surah-data.mjs`.
- Uji: `npm install && npm run build`. Uji parser: lihat `scripts/sync/fixtures/`.
