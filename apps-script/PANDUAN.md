# Memasang Jembatan Google (sekali saja, ±5 menit, dari komputer)

Jembatan ini adalah skrip kecil di akun Google Anda. Tugasnya membaca folder Drive "Inspirasi Quran",
membaca daftar video YouTube, menyimpan pendaftar ke Google Sheet, dan menyimpan audio ke subfolder "Audio".

1. Buka https://script.google.com → **Proyek baru**. Ganti nama proyek menjadi `Jembatan Web Quran Inspiration`.
2. Hapus isi `Code.gs`, lalu tempel kode dari file Google Drive **"Kode Jembatan Web Quran Inspiration (RAHASIA).txt"** (di Drive Saya)
   (kode itu sudah berisi kunci rahasia Anda; jangan dibagikan).
3. Klik ikon ⚙️ **Setelan proyek** → centang **Tampilkan file manifes "appsscript.json"**.
   Kembali ke Editor, buka `appsscript.json`, ganti isinya dengan isi file `apps-script/appsscript.json`.
4. Pilih fungsi `izinkanAkses` di atas → klik **Jalankan** → **Tinjau izin** → pilih akun Anda →
   **Lanjutan** → **Buka Jembatan Web Quran Inspiration (tidak aman)** → **Izinkan**.
   (Peringatan "tidak aman" muncul karena skrip ini buatan Anda sendiri, bukan dari Google. Aman.)
5. Klik **Terapkan** → **Deployment baru** → ikon ⚙️ pilih **Aplikasi web**.
   - Jalankan sebagai: **Saya**
   - Yang memiliki akses: **Siapa saja**
   Klik **Terapkan**, lalu salin **URL aplikasi web** (berakhiran `/exec`) dan kirim ke Claude.
