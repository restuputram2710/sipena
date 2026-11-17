# SIPENA — Sistem Informasi Penyusunan Naskah (frontend)

Frontend statis SIPENA untuk GitHub Pages. Backend berjalan di Google Apps Script sebagai REST API (JSON).

```
index.html            halaman utama (SPA, navigasi #/…)
css/app.css           sistem desain "Blueprint Editorial"
js/config.js          SATU-SATUNYA konfigurasi: URL Web App Apps Script (/exec)
js/model.js           model naskah bersama (identik dengan Model.gs di backend)
js/core.js            API, cache, sesi, router, komponen UI
js/app.js             halaman pengguna (beranda, naskah, template, profil, berkas)
js/editor.js          builder bertahap, editor lembar A4, AD/ART, autosave, ekspor
js/admin.js           panel admin & Super Admin
assets/favicon.svg
PANDUAN-INSTALASI.md  langkah instalasi lengkap
```

Mulai dari **PANDUAN-INSTALASI.md**. Jangan menaruh token, kunci, atau ID spreadsheet di berkas mana pun di repository ini — semua rahasia ada di Script Properties Apps Script.

Versi 1.0.0
