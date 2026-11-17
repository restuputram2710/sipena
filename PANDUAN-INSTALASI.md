# Panduan Instalasi SIPENA v1.0.0

**SIPENA — Sistem Informasi Penyusunan Naskah.** Aplikasi ini terdiri dari dua bagian:

| Bagian | Isi | Tempat dipasang |
|---|---|---|
| **Backend** | 8 berkas `.gs` + `appsscript.json` | Google Apps Script (akun Google pemilik aplikasi) |
| **Frontend** | `index.html`, folder `css/`, `js/`, `assets/` | GitHub Pages (situs statis gratis) |

Data tersimpan di Google Sheets (daftar & metadata) dan Google Drive (isi naskah, logo, berkas, ekspor, backup) milik akun pemilik. Frontend hanya menyimpan **satu** nilai: alamat Web App Apps Script.

Kerjakan berurutan: **A (backend) → B (frontend) → C (masuk pertama) → D (opsional: impor data lama)**.

---

## Sebelum mulai

- **Satu akun Google pemilik.** Semua berkas dimiliki akun ini. Catat siapa pemiliknya dan siapkan akun cadangan.
- **Gmail biasa atau Google Workspace?** Ini menentukan kuota harian:

| Kuota per hari | Gmail biasa | Workspace |
|---|---|---|
| Ekspor PDF (konversi lewat Google Drive) | ± 250 | ± 1.500 |
| Penerima email notifikasi | 100 | 1.500 |
| Total waktu trigger | 90 menit | 6 jam |

Kuota bisa berubah; cek halaman kuota resmi Apps Script. Ekspor **DOCX** tidak memakai kuota konversi — hanya PDF yang memakainya.

---

## A. Memasang backend (Google Apps Script)

### A1. Buat proyek
1. Buka **https://script.google.com** dengan akun pemilik → **Proyek baru**.
2. Ganti nama proyek, misalnya `SIPENA Backend`.
3. Klik ⚙️ **Setelan Proyek** (ikon roda gigi di kiri):
   - centang **"Tampilkan file manifes appsscript.json di editor"**;
   - **Zona waktu:** `(GMT+07:00) Jakarta`.

### A2. Tempel kode
Kembali ke **Editor** (ikon `< >`).

1. Buka `appsscript.json`, hapus seluruh isinya, lalu tempel isi berkas `appsscript.json` dari paket ini.
2. Ganti nama `Kode.gs` bawaan (titik tiga → *Ganti nama*) menjadi `Kode`. Hapus isinya, lalu tempel isi `Kode.gs`.
3. Tambah berkas dengan tombol **+ → Skrip** untuk setiap berkas berikut. Nama di editor ditulis **tanpa** `.gs`, lalu isinya ditempel:

   `Keamanan` · `Dokumen` · `Ekspor` · `Admin` · `Setup` · `Template` · `Model`

4. Klik 💾 **Simpan proyek** (Ctrl+S).

> Urutan berkas di editor tidak berpengaruh; kode sudah dibuat agar tidak bergantung pada urutan.

### A3. Jalankan setup sekali
1. Di bilah atas editor, pilih fungsi **`setupAppEnvironment`**, lalu klik **▶ Jalankan**.
2. Google meminta izin. Pilih akun pemilik → **Lanjutan** → **Buka SIPENA Backend (tidak aman)** → **Izinkan**.
   Peringatan "tidak aman" muncul karena skrip buatan sendiri belum diverifikasi Google; ini normal.
3. Tunggu ±30–60 detik, lalu buka **Log eksekusi**. Contoh hasil:

```
🚀 Menyiapkan SIPENA v1.0.0 ...
   + tabel Organizations
   + tabel Users
   ...
✅ Setup selesai. Database: https://docs.google.com/spreadsheets/d/…
🔐 AKUN SUPER ADMIN PERTAMA — catat sekarang, kode hanya tampil SEKALI:
   Nomor identitas : superadmin
   Kode aktivasi   : ABC-DEF-GHJ  (berlaku 7 hari)
```

4. **Catat kode aktivasi Super Admin sekarang.** Kode ini dipakai di langkah C.

Setup membuat:
- folder Drive `📁 SIPENA — Penyusunan Naskah` (berisi `_system`, `_backup`, `orgs`);
- spreadsheet database dengan semua tabel (kolom diformat Teks agar angka 0 di depan nomor identitas tidak hilang);
- kategori dan 6 template bawaan (Proposal Kegiatan, AD/ART, Program Kerja, LPJ, Surat Undangan, Surat Permohonan);
- organisasi awal "Organisasi Utama", akun `superadmin`, dan trigger terjadwal.

**Aman dijalankan ulang.** Setup tidak menimpa rahasia, data, atau folder yang sudah ada. Bila kode Super Admin hilang, jalankan fungsi **`buatKodeAktivasiSuperAdmin`**.

### A4. Script Properties (rahasia)
Lihat di ⚙️ **Setelan Proyek → Properti Skrip**. Semua terisi otomatis oleh setup:

| Kunci | Fungsi | Boleh diubah? |
|---|---|---|
| `SESSION_SECRET` | Kunci tanda tangan sesi masuk | ❌ Jangan. Untuk mengeluarkan semua pengguna, jalankan `rotasiSecretSesi` |
| `PIN_PEPPER` | Pengaman tambahan hash PIN | ❌ **Jangan pernah.** Bila berubah, semua PIN tidak berlaku |
| `SPREADSHEET_ID` | Database | Hanya saat memulihkan backup (Bagian E3) |
| `ROOT_FOLDER_ID`, `SYSTEM_FOLDER_ID`, `BACKUP_FOLDER_ID`, `ORGS_FOLDER_ID`, `TEMPLATE_FOLDER_ID`, `TEMP_FOLDER_ID` | Folder Drive | Tidak perlu |
| `KEEP_WARM` | Muncul bila pemanas dimatikan (`off`) | Lewat fungsi `matikanKeepWarm` / `nyalakanKeepWarm` |

Rahasia ini **tidak pernah** dikirim ke browser, ditulis ke Sheets, atau dicatat di log. Siapa pun yang punya akses **edit** ke proyek Apps Script bisa melihatnya, jadi jangan menambah editor sembarangan.

### A5. Deploy sebagai Web App
1. Klik **Terapkan → Deployment baru**.
2. Klik ⚙️ di samping "Pilih jenis" → **Aplikasi web**.
3. Isi:
   - **Deskripsi:** `v1.0.0`
   - **Jalankan sebagai:** **Saya** (akun pemilik)
   - **Siapa yang memiliki akses:** **Siapa saja**
4. Klik **Terapkan**, lalu **salin URL aplikasi web** (berakhiran `/exec`).
5. Uji di browser: buka URL tersebut ditambah `?w=pub`, misalnya `https://script.google.com/macros/s/AKfy…/exec?w=pub`. Hasil yang benar berupa teks JSON yang diawali `{"success":true`.

> **"Siapa saja" aman?** Ya. Pengguna SIPENA tidak memakai akun Google; keamanan dijaga oleh login SIPENA (nomor identitas + PIN), token sesi bertanda tangan, dan pemeriksaan peran/organisasi di server pada **setiap** permintaan.

**Memperbarui kode nanti:** tempel kode baru → Simpan → **Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru → Terapkan**. Jangan memakai "Deployment baru", karena URL akan berubah dan frontend harus diubah lagi.

---

## B. Memasang frontend di GitHub Pages

### B1. Isi alamat backend **sebelum** mengunggah
1. Ekstrak `sipena-frontend.zip`. Hasilnya folder **`sipena-frontend`** yang langsung berisi `index.html`.
2. Buka `sipena-frontend/js/config.js` dengan Notepad, lalu ganti alamatnya dengan URL `/exec` dari langkah A5:

```js
window.APP_CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfy…ID-ANDA…/exec'
};
```

Selama tulisan `GANTI_DENGAN_ID_DEPLOYMENT` masih ada, aplikasi menampilkan pesan "konfigurasi belum lengkap".

### B2. Pasang Git & buat repository
1. Pasang Git dari **https://git-scm.com/download/win** (Windows; pengaturan bawaan). Cek di PowerShell: `git --version`.
2. Atur identitas sekali saja:
   ```
   git config --global user.name "Nama Anda"
   git config --global user.email "email-akun-github@contoh.com"
   ```
3. Di **github.com**: **+ → New repository** → nama misalnya `sipena` → **Public** (wajib untuk Pages gratis) → **jangan** centang README/.gitignore/license → **Create repository**.

### B3. Unggah lewat terminal (jangan lewat tombol "Upload files" di web)
Upload lewat web GitHub meratakan semua berkas tanpa folder `css/` dan `js/`, sehingga tampilan rusak. Pakai terminal.

1. Buka folder **`sipena-frontend`** di File Explorer, klik address bar, ketik `powershell`, lalu tekan Enter.
2. **Periksa dulu** dengan `dir`. Yang harus terlihat langsung di daftar: `index.html`, `css`, `js`, `assets`, `README.md`, `PANDUAN-INSTALASI.md`.
   Bila yang terlihat malah folder `sipena-frontend`, Anda satu tingkat terlalu atas — jalankan `cd sipena-frontend` dulu. **Folder yang berisi `index.html` inilah tempat `git init` dijalankan.**
3. Jalankan satu per satu:
   ```
   git init
   git add .
   git commit -m "SIPENA v1.0.0"
   git branch -M main
   git remote add origin https://github.com/USERNAME/sipena.git
   git push -u origin main
   ```
   Perhatikan **titik** di `git add .`.
4. Saat diminta **Password**, tempelkan **Personal Access Token**, bukan kata sandi akun GitHub. Saat mengetik/menempel, layar tampak kosong; itu normal.
   Cara membuat token: **https://github.com/settings/tokens → Generate new token (classic)** → centang **repo** → Generate → salin `ghp_…` (hanya tampil sekali).

### B4. Aktifkan Pages
Di repository: **Settings → Pages**
- **Source:** Deploy from a branch
- **Branch:** `main` · `/ (root)` → **Save**
- centang **Enforce HTTPS**

Setelah 1–2 menit muncul alamat `https://USERNAME.github.io/sipena/`. Buka alamat itu, lalu tekan **Ctrl+Shift+R**.

**Memperbarui frontend nanti** (dari folder yang sama):
```
git add .
git commit -m "Perbarui frontend"
git push
```

---

## C. Masuk pertama kali

1. Buka situs SIPENA → **Aktivasi akun baru dengan kode sekali pakai**.
2. Isi **Nomor identitas** `superadmin` dan **Kode aktivasi** dari log setup (A3), lalu buat PIN.
   PIN minimal 6 karakter, tidak sama dengan nomor identitas, dan bukan pola mudah (123456, 111111, dsb).
3. Lengkapi **Profil Organisasi**: nama, induk organisasi, alamat, kontak, logo, pengurus (Ketua, Sekretaris, Bendahara, Pembina), periode, dan format nomor surat. Data ini otomatis mengisi kop surat dan blok tanda tangan semua naskah baru.
4. **Administrasi → Organisasi:** tambah organisasi lain bila perlu.
5. **Administrasi → Pengguna → Tambah Pengguna:** sistem menampilkan **kode aktivasi sekali pakai** (hanya sekali). Kirim kode ke pengguna lewat WhatsApp/email; ia membuat PIN sendiri saat aktivasi. Untuk banyak akun sekaligus, pakai **Impor Akun (CSV)**.
6. **Super Admin → Pengaturan Aplikasi:** nama aplikasi, logo (thumbnail), warna utama & aksen (dengan cek kontras), batas keamanan, kuota, dan retensi.

### Peran
| Peran | Bisa |
|---|---|
| **Super Admin** | Semua organisasi, pengaturan aplikasi, backup, migrasi. Bisa membuka isi naskah orang lain hanya lewat "Akses dukungan", dan setiap akses tercatat beserta alasannya |
| **Administrator** | Pengguna, template, kategori, log, dan statistik untuk organisasinya (plus organisasi tambahan yang ditugaskan). Tidak bisa membuka isi naskah orang lain |
| **Pengguna** | Menyusun, menyunting, mengekspor, dan membagikan naskah miliknya; mengubah profil organisasi bila diberi izin |
| **Viewer** | Melihat/mengomentari naskah yang dibagikan kepadanya |

---

## D. (Opsional) Impor data dari SIPENA lama

Pakai bagian ini bila sudah ada spreadsheet SIPENA versi sebelumnya.

1. Pastikan aplikasi baru dipasang di **akun Google yang sama** dengan aplikasi lama, supaya logo, gambar, dan isi naskah di Drive tetap terbaca.
2. **Super Admin → Migrasi Data** → tempel URL spreadsheet lama → pilih data yang diimpor → **Pindai (tanpa menulis)**.
3. Periksa tabel laporan dan peringatan, lalu klik **Jalankan Impor**.
4. Cek pengguna, organisasi, template, dan beberapa naskah. Uji masuk dengan satu akun.
5. **Tepat sebelum pindah**, jalankan impor **sekali lagi** untuk menyalin data baru dari aplikasi lama. Data ganda tidak akan tercipta.
6. Umumkan alamat baru. Sesi masuk lama tidak ikut pindah, jadi pengguna cukup masuk ulang.

Catatan:
- Spreadsheet lama **hanya dibaca**, tidak pernah diubah.
- PIN lama hanya berlaku bila `PIN_PEPPER` proyek baru **sama** dengan proyek lama (salin nilainya ke Script Properties **sebelum** pengguna mulai masuk). Bila tidak, gunakan **Reset PIN** per pengguna.
- Akun `superadmin` lama tidak diimpor; pakai akun Super Admin aplikasi baru.

---

## E. Operasional & pemeliharaan

### E1. Trigger terjadwal (dipasang otomatis oleh setup)
| Trigger | Jadwal | Tugas |
|---|---|---|
| `keepWarm` | tiap 1 menit | menjaga cache tetap hangat + mengirim antrean email |
| `workerTiap5Menit` | tiap 5 menit | antrean email & pemanasan data admin |
| `tugasHarian` | 02.00 WIB | kosongkan sampah > 30 hari, ekspor lama, berkas sementara |
| `tugasMingguan` | Minggu 01.00 WIB | backup otomatis, arsip log aktivitas lama |

`keepWarm` membuat halaman lebih cepat tetapi memakai waktu trigger harian. Perkiraannya belasan sampai puluhan menit per hari; cek angka sebenarnya di menu **Eksekusi** Apps Script. Pada akun Gmail biasa (batas 90 menit/hari), bila mendekati batas, jalankan **`matikanKeepWarm`**. Aplikasi tetap berjalan, hanya pemuatan pertama setelah sepi sedikit lebih lambat. Nyalakan lagi dengan `nyalakanKeepWarm`.

### E2. Fungsi yang bisa dijalankan dari editor
| Fungsi | Kegunaan |
|---|---|
| `setupAppEnvironment` | setup / perbaikan struktur (aman diulang) |
| `buatKodeAktivasiSuperAdmin` | kode baru bila Super Admin lupa PIN |
| `jalankanBackupSekarang` | backup manual |
| `rotasiSecretSesi` | mengeluarkan semua pengguna dari semua perangkat |
| `cekPerforma` | status cache, trigger, antrean email, ukuran Properties |
| `installTriggers` | memasang ulang trigger |

### E3. Backup & pemulihan
- Backup otomatis tiap Minggu; manual lewat **Super Admin → Backup → Backup Sekarang**. Yang disimpan: salinan spreadsheet + ZIP isi seluruh naskah/template (JSON). Disimpan 4 backup terakhir (dapat diatur).
- **Memulihkan:** buka folder backup di Drive → buat salinan spreadsheet backup → salin ID-nya (bagian URL di antara `/d/` dan `/edit`) → ganti nilai `SPREADSHEET_ID` di Script Properties → jalankan `setupAppEnvironment` (memeriksa struktur, tidak menimpa data). Uji prosedur ini sekali di lingkungan uji sebelum dipakai sungguhan.

### E4. Kinerja
- Panggilan pertama setelah lama sepi bisa 3–8 detik (*cold start* Google). Pemanas dan cache mengurangi ini.
- Di browser, tekan F12 → Console → ketik `Perf.table()` untuk melihat waktu setiap permintaan (total, server, jaringan, dari cache).

---

## F. Kendala umum

| Gejala | Penyebab | Solusi |
|---|---|---|
| "Konfigurasi belum lengkap" | `js/config.js` masih berisi `GANTI_DENGAN_ID_DEPLOYMENT` | Isi URL `/exec` (B1), lalu `git add .` → `commit` → `push` |
| Situs GitHub menampilkan 404 | `git init` dijalankan di folder induk | Pastikan `index.html` terlihat di root repository. Push ulang dari folder yang berisi `index.html` dengan `git push -u origin main --force` |
| Tampilan polos tanpa warna | Berkas diunggah lewat web GitHub sehingga folder `css/` hilang | Unggah ulang lewat terminal (B3) |
| "Tidak dapat terhubung ke server" | URL salah, atau deployment tidak "Siapa saja" | Uji `…/exec?w=pub` di browser; periksa setelan deployment |
| Perubahan kode backend tidak berlaku | Lupa membuat versi deployment baru | Kelola deployment → Edit → **Versi baru** |
| `Password authentication is not supported` | GitHub menolak kata sandi akun | Pakai Personal Access Token (B3) |
| Akun terkunci | 5 kali salah PIN | Tunggu 15 menit, atau Administrator → Pengguna → ⋯ → **Buka kunci akun** |
| Lupa PIN | — | Administrator → **Reset PIN** → kode aktivasi baru |
| Ekspor PDF gagal "kuota" | Batas konversi harian tercapai | Pakai **Unduh DOCX** atau **Cetak / Simpan PDF dari browser**; coba PDF lagi besok |
| Nomor identitas kehilangan 0 di depan (impor CSV) | Excel mengubah kolom menjadi angka | Format kolom sebagai Teks, atau sunting CSV dengan editor teks |
| Halaman masih versi lama setelah update | Cache browser | Ctrl+Shift+R atau jendela Incognito |

---

## G. Catatan teknis singkat

- **Pratinjau cepat vs Pratinjau akurat.** Tata letak di editor adalah perkiraan di browser. **Pratinjau Akurat** adalah PDF yang disusun server dari berkas DOCX yang sama dengan hasil unduhan — itulah acuan cetak. Huruf dibatasi pada Times New Roman, Arial, Cambria, dan Calibri agar hasil sama di Word dan Google Docs.
- **DOCX** dibuat langsung oleh server (kop di header, nomor halaman, daftar isi sebagai field Word). **PDF** dibuat dengan mengonversi DOCX itu lewat Google Drive. Bila Word menampilkan pesan "perbarui field", pilih **Ya** agar daftar isi diperbarui.
- **Autosave**: tersimpan ±3 detik setelah berhenti mengetik, saat berpindah tab, dan saat menutup halaman. Salinan juga disimpan di perangkat. Bila naskah diubah di tab/perangkat lain, muncul pilihan **Bandingkan / Muat ulang / Timpa** sehingga tidak ada perubahan yang hilang diam-diam.
- **Keamanan**: PIN disimpan sebagai hash bergaram + pepper; sesi berupa token bertanda tangan HMAC (8 jam, dapat diatur); semua izin diperiksa di server; percobaan akses lintas organisasi ditolak dan dicatat di log.
- Antarmuka mengikuti DESIGN.md "Blueprint Editorial". Beberapa warna teks status digelapkan agar lulus kontras WCAG AA. Label seperti "Enkripsi AES-256" atau "TLS 1.3" dari gambar referensi **tidak dipakai**, karena aplikasi tidak bisa menjaminnya; label HTTPS di halaman masuk hanya muncul bila situs benar-benar dibuka lewat HTTPS.
