/* ==========================================================================
 * SIPENA — app.js : halaman ruang kerja (masuk, aktivasi, beranda, buat
 * dokumen, template, naskah saya, dibagikan, profil organisasi, pustaka
 * berkas, akun saya).
 * ========================================================================== */
(function () {
  'use strict';
  const A = window.App, esc = A.esc, I = A.icon, M = window.SipenaModel;
  const MEM = ['superadmin', 'admin', 'user'];
  const JENIS_IC = { proposal: 'file', adart: 'scale', proker: 'clipboard', laporan: 'report', surat: 'mail' };

  /* ================= MASUK ================= */
  function authFrame(inner) {
    const pub = A.LS.get('pub') || {};
    return '<div class="auth"><header class="auth-top"><div class="row"><div class="brand-mark" style="width:30px;height:30px">' + (pub.logo ? '<img alt="" src="' + esc(pub.logo) + '">' : I('file-plus', 'sm')) + '</div><span class="brand-name">' + esc(pub.nama_aplikasi || 'SIPENA') + '</span><span class="sep muted">/</span><span class="eyebrow">Portal akses terbatas</span></div>' +
      (location.protocol === 'https:' ? '<span class="sess hide-sm"><span class="dot"></span>Koneksi HTTPS</span>' : '<span class="sess off hide-sm"><span class="dot"></span>Bukan HTTPS</span>') + '</header><main class="auth-main">' + inner + '</main>' +
      '<footer class="auth-foot"><span>' + esc(pub.subjudul || 'Sistem Informasi Penyusunan Naskah') + '</span><span>' + esc(pub.nama_aplikasi || 'SIPENA') + ' v' + A.v + '</span></footer></div>';
  }
  function brandHead(sub) {
    const pub = A.LS.get('pub') || {};
    return '<div class="logo">' + (pub.logo ? '<img alt="Logo" src="' + esc(pub.logo) + '">' : I('file-plus', 'lg')) + '</div><h1>' + esc(pub.nama_aplikasi || 'SIPENA') + '</h1><p class="sub">' + esc(sub) + '</p>';
  }
  function loadPublic(root, rerender) {
    A.warm('pub');
    A.api('app.public').then(r => { if (r.success) { const old = JSON.stringify(A.LS.get('pub')); A.LS.set('pub', r.data); A.applyTheme(r.data); if (old !== JSON.stringify(r.data) && rerender) rerender(); } });
  }
  A.route('/masuk', function (root) {
    if (A.session.token) return A.go(A.home());
    const draw = () => {
      if (!A.configured()) {
        root.innerHTML = authFrame('<div class="auth-card">' + brandHead('Konfigurasi belum lengkap') + '<div class="banner warn mt16">' + I('alert') + '<div><b>GAS_URL belum diisi.</b> Buka berkas <code>js/config.js</code> dan isi URL Web App (<code>…/exec</code>) dari Apps Script, lalu unggah ulang. Lihat PANDUAN-INSTALASI.md bagian 5.</div></div></div>');
        return;
      }
      root.innerHTML = authFrame('<form class="auth-card" id="f" novalidate>' + brandHead('Sistem Informasi Penyusunan Naskah — Portal Akses Terbatas') +
        '<div class="banner warn mt16" style="font-size:13px">' + I('info') + '<div>Akun dikunci sementara setelah beberapa kali salah memasukkan PIN.</div></div>' +
        '<div class="col mt16" style="gap:16px"><div class="field"><label for="id">Nomor Identitas (NISN / NIP / NIK)</label><input class="input" id="id" autocomplete="username" inputmode="text" placeholder="Contoh: 0012345678" required><div class="help">Gunakan nomor identitas yang didaftarkan Administrator.</div></div>' +
        '<div class="field"><label for="pin" class="row between" style="width:100%"><span>PIN / Kata Sandi</span><a href="#" id="lupa" style="font-weight:500">Lupa PIN?</a></label><div class="input-group"><input class="input" id="pin" type="password" autocomplete="current-password" required><button type="button" class="addon" id="eye" aria-label="Tampilkan PIN" style="cursor:pointer;border-left:0">' + I('eye', 'sm') + '</button></div></div>' +
        '<div id="msg" role="alert"></div><button class="btn btn-primary btn-block" style="min-height:46px;font-size:15px" id="go">Masuk ke Sistem ' + I('arrow-r') + '</button>' +
        '<a href="#/aktivasi" class="row" style="justify-content:center;font-weight:500">' + I('key', 'sm') + 'Aktivasi akun baru dengan kode sekali pakai</a></div>' +
        '<hr class="divider"><div class="well row" style="align-items:flex-start;gap:12px;font-size:12.5px;color:var(--text-2)">' + I('lock') + '<div>Akses terbatas untuk pengurus organisasi & administrator. Aktivitas masuk dicatat di log audit sesuai prinsip UU Pelindungan Data Pribadi No. 27/2022.</div></div></form>');
      const f = A.$('#f', root);
      A.$('#eye', root).onclick = () => { const p = A.$('#pin', root); p.type = p.type === 'password' ? 'text' : 'password'; };
      A.$('#lupa', root).onclick = e => { e.preventDefault(); A.modal({ title: 'Lupa PIN', size: 'sm', body: '<p>Demi keamanan, PIN tidak dapat dipulihkan sendiri. Hubungi <b>Administrator</b> organisasi Anda untuk <b>Reset PIN</b>. Anda akan menerima kode aktivasi baru, lalu buat PIN baru di halaman Aktivasi.</p>' }); };
      f.onsubmit = async e => {
        e.preventDefault();
        const id = A.$('#id', root).value.trim(), pin = A.$('#pin', root).value, msg = A.$('#msg', root), btn = A.$('#go', root);
        msg.innerHTML = '';
        if (!id || !pin) { msg.innerHTML = '<div class="err-msg">' + I('alert', 'sm') + 'Isi nomor identitas dan PIN.</div>'; return; }
        A.busy(btn, true, 'Memeriksa…');
        const r = await A.api('auth.login', { identity: id, pin: pin });
        A.busy(btn, false);
        if (!r.success) { msg.innerHTML = '<div class="banner ' + (r.code === 'LOCKED' ? 'bad' : 'warn') + '">' + I('alert') + '<div>' + esc(r.message) + (r.code === 'NOT_ACTIVE' ? ' <a href="#/aktivasi">Aktivasi sekarang →</a>' : '') + '</div></div>'; A.$('#pin', root).select(); return; }
        A.session.set(r.data.token, r.data.boot); A._shell = null;
        A.go(A.home());
      };
      setTimeout(() => A.$('#id', root) && A.$('#id', root).focus(), 50);
    };
    draw(); loadPublic(root, draw);
  }, { public: true, shell: false });

  /* ================= AKTIVASI ================= */
  A.route('/aktivasi', function (root) {
    const st = { step: 1, identity: '', code: '', nama: '' };
    const policy = () => A.modal({ title: 'Kebijakan Privasi Singkat', body: '<ol style="padding-left:18px;line-height:1.75;margin:0"><li>SIPENA menyimpan nama, nomor identitas, email (opsional), peran, dan organisasi Anda hanya untuk keperluan akses dan penyusunan naskah.</li><li>PIN disimpan dalam bentuk acak satu arah (hash) dan tidak dapat dibaca siapa pun, termasuk administrator.</li><li>Aktivitas penting (masuk, membuat, mengekspor, membagikan) dicatat di log audit organisasi.</li><li>Dokumen Anda hanya dapat dibuka oleh Anda dan orang yang Anda bagikan. Super Admin dapat membukanya untuk dukungan teknis dengan alasan yang tercatat.</li><li>Untuk perbaikan atau penghapusan data, hubungi Administrator organisasi.</li></ol>' });
    const draw = () => {
      const steps = '<div class="steps-mini"><span class="' + (st.step > 1 ? 'done' : 'on') + '">1 · Verifikasi</span><span class="' + (st.step === 2 ? 'on' : st.step > 2 ? 'done' : '') + '">2 · Buat PIN</span><span class="' + (st.step === 3 ? 'on' : '') + '">3 · Selesai</span></div>';
      let body = '';
      if (st.step === 1) body = '<div class="col" style="gap:16px"><div class="field"><label for="id">Nomor Identitas</label><input class="input" id="id" value="' + esc(st.identity) + '" autocomplete="username"></div><div class="field"><label for="code">Kode Aktivasi</label><input class="input mono" id="code" placeholder="XXX-XXX-XXX" style="letter-spacing:.12em;text-transform:uppercase" autocomplete="one-time-code"><div class="help">Kode diberikan Administrator, berlaku sekali pakai dan memiliki masa berlaku.</div></div><div id="msg" role="alert"></div><button class="btn btn-primary btn-block" id="go" style="min-height:44px">Lanjut ' + I('arrow-r') + '</button></div>';
      if (st.step === 2) body = '<div class="banner ok">' + I('check-c') + '<div>Halo, <b>' + esc(st.nama) + '</b>. Buat PIN atau kata sandi untuk akun Anda.</div></div><div class="col mt16" style="gap:16px"><div class="field"><label for="p1">PIN / Kata Sandi baru</label><input class="input" type="password" id="p1" autocomplete="new-password"><div class="strength" id="str"><i></i><i></i><i></i><i></i></div><ul class="rules" id="rules"><li data-r="len">' + I('check', 'sm') + 'Minimal 6 karakter</li><li data-r="id">' + I('check', 'sm') + 'Tidak sama dengan nomor identitas</li><li data-r="pat">' + I('check', 'sm') + 'Bukan angka berurutan / berulang (mis. 123456)</li></ul></div><div class="field"><label for="p2">Ulangi PIN</label><input class="input" type="password" id="p2" autocomplete="new-password"></div><label class="check"><input type="checkbox" id="ok"> <span>Saya menyetujui <a href="#" id="pol">Kebijakan Privasi</a></span></label><div id="msg" role="alert"></div><button class="btn btn-primary btn-block" id="go" style="min-height:44px">Aktifkan Akun</button></div>';
      if (st.step === 3) body = '<div class="empty" style="padding:12px 0 0"><div class="em-ic" style="border-style:solid;border-color:var(--ok);color:var(--ok-t)">' + I('check', 'lg') + '</div><h3>Akun aktif</h3><p>Selamat datang di ' + esc((A.LS.get('pub') || {}).nama_aplikasi || 'SIPENA') + '. Gunakan nomor identitas dan PIN Anda setiap kali masuk.</p><button class="btn btn-primary mt8" id="go">Masuk ke Ruang Kerja ' + I('arrow-r') + '</button></div>';
      root.innerHTML = authFrame('<div class="auth-card">' + brandHead('Aktivasi akun baru') + steps + body + (st.step < 3 ? '<p class="mt16" style="text-align:center;font-size:13.5px"><a href="#/masuk">← Kembali ke halaman masuk</a></p>' : '') + '</div>');
      const go = A.$('#go', root), msg = A.$('#msg', root), err = t => { msg.innerHTML = '<div class="err-msg mt8">' + I('alert', 'sm') + esc(t) + '</div>'; };
      if (st.step === 1) {
        go.onclick = async () => {
          st.identity = A.$('#id', root).value.trim(); st.code = A.$('#code', root).value.trim().toUpperCase();
          if (!st.identity || !st.code) return err('Isi nomor identitas dan kode aktivasi.');
          A.busy(go, true, 'Memeriksa…'); const r = await A.api('auth.activate.check', { identity: st.identity, code: st.code }); A.busy(go, false);
          if (!r.success) return err(r.message);
          st.nama = r.data.nama; st.step = 2; draw();
        };
        A.$('#code', root).addEventListener('keydown', e => { if (e.key === 'Enter') go.click(); });
      }
      if (st.step === 2) {
        A.$('#pol', root).onclick = e => { e.preventDefault(); policy(); };
        const p1 = A.$('#p1', root);
        p1.oninput = () => {
          const v = p1.value, rules = { len: v.length >= 6, id: v && v.toLowerCase() !== st.identity.toLowerCase(), pat: v && !/^(.)\1+$/.test(v) && !('01234567890'.indexOf(v) > -1 || '09876543210'.indexOf(v) > -1) };
          A.$$('#rules li', root).forEach(li => li.classList.toggle('ok', !!rules[li.dataset.r]));
          let sc = 0; if (v.length >= 6) sc++; if (v.length >= 10) sc++; if (/[A-Za-z]/.test(v) && /\d/.test(v)) sc++; if (/[^A-Za-z0-9]/.test(v)) sc++;
          A.$('#str', root).className = 'strength s' + Math.min(4, sc);
        };
        go.onclick = async () => {
          const a = p1.value, b = A.$('#p2', root).value;
          if (a !== b) return err('Ulangan PIN tidak sama.');
          if (!A.$('#ok', root).checked) return err('Centang persetujuan kebijakan privasi.');
          A.busy(go, true, 'Mengaktifkan…'); const r = await A.api('auth.activate', { identity: st.identity, code: st.code, pin: a, setuju: true }); A.busy(go, false);
          if (!r.success) return err(r.message);
          A.session.set(r.data.token, r.data.boot); A._shell = null; st.step = 3; draw();
        };
      }
      if (st.step === 3) go.onclick = () => A.go(A.home());
    };
    draw(); loadPublic(root, null);
  }, { public: true, shell: false });

  /* ================= BERANDA ================= */
  A.route('/beranda', async function (root) {
    const me = A.session.me, org = A.session.boot.org;
    root.innerHTML = '<section class="ph-card ph"><div><div class="tags"><span class="tag ink">Panel kerja anggota</span>' + (org ? '<span class="tag">' + esc(org.singkatan || org.nama) + '</span>' : '') + '</div><h1>Beranda Penyusunan Naskah</h1><p class="sub">Selamat datang, <b style="color:var(--text)">' + esc(me.nama) + '</b>. Kelola draf dan selesaikan naskah formal organisasi Anda.</p></div>' +
      '<div class="acts"><a class="btn btn-secondary" href="#/dokumen">' + I('history') + 'Naskah Saya</a><a class="btn btn-primary" href="#/buat">' + I('plus') + 'Buat Dokumen Baru</a></div></section>' +
      '<div class="grid g4 keep2" id="stats">' + A.skel(4, 120).replace(/<div class="skel"/g, '<div class="skel stat"') + '</div>' +
      '<div class="grid mt24" style="grid-template-columns:minmax(0,1fr) 360px;align-items:start" id="cols"><div class="col" style="gap:20px"><section class="card"><div class="card-head"><div><h3>Dokumen Terakhir Dikerjakan</h3><p class="help">Akses cepat naskah yang sedang Anda kerjakan</p></div><div class="seg" id="seg" role="group" aria-label="Saring jenis"><button aria-pressed="true" data-j="">Semua</button><button data-j="proposal" aria-pressed="false">Proposal</button><button data-j="adart" aria-pressed="false">AD/ART</button><button data-j="laporan" aria-pressed="false">Laporan</button></div></div><div id="recent">' + A.skel(4, 40) + '</div></section>' +
      '<section class="card"><div class="card-head"><h3>' + I('chart') + 'Dokumen per jenis</h3><span class="eyebrow">Naskah aktif Anda</span></div><div class="card-body" id="perjenis">' + A.skel(3) + '</div></section></div>' +
      '<div class="col" style="gap:20px"><section class="card"><div class="card-head"><h3>' + I('layers') + 'Mulai Cepat</h3><span class="eyebrow">Template</span></div><div class="card-body" id="quick">' + A.skel(3, 54) + '</div></section>' +
      '<section class="card"><div class="card-head"><h3>' + I('clock') + 'Aktivitas Terbaru</h3><span class="eyebrow">Log saya</span></div><div class="card-body" id="act">' + A.skel(3) + '</div></section>' +
      '<section class="card"><div class="card-body" id="quota">' + A.skel(2) + '</div></section></div></div>';
    const mq = window.matchMedia('(max-width: 1100px)'); if (mq.matches) A.$('#cols', root).style.gridTemplateColumns = 'minmax(0,1fr)';
    let jenisF = '', dash = null;
    const drawRecent = () => {
      const list = (dash.recent || []).filter(d => !jenisF || d.jenis === jenisF);
      A.$('#recent', root).innerHTML = list.length ? '<div class="tbl-wrap"><table class="tbl cards"><thead><tr><th>Kode naskah</th><th>Judul dokumen</th><th>Kategori</th><th>Status</th><th>Terakhir diubah</th></tr></thead><tbody>' +
        list.map(d => '<tr><td data-l="Kode"><span class="mono" style="font-weight:600;color:var(--ink);white-space:nowrap">' + esc(d.kode) + '</span></td><td data-l="Judul"><div class="t-title"><a href="#/naskah/' + esc(d.id) + '">' + esc(d.judul) + '</a></div><div class="t-sub">Versi ' + d.versi_terakhir + (d.halaman ? ' · ' + d.halaman + ' halaman' : '') + '</div></td><td data-l="Kategori"><span class="tag">' + esc(A.JENIS[d.jenis] || d.jenis) + '</span></td><td data-l="Status">' + A.statusTag(d.status) + '</td><td data-l="Diubah" class="mono nowrap" style="font-size:12.5px;color:var(--muted)">' + esc(A.fmtRel(d.updated_at)) + '</td></tr>').join('') + '</tbody></table></div>' +
        '<div class="tbl-foot"><span class="mono" style="font-size:12.5px;color:var(--muted)">Menampilkan ' + list.length + ' dari ' + dash.total + ' naskah</span><a class="btn btn-secondary btn-sm" href="#/dokumen">Lihat semua ' + I('arrow-r', 'sm') + '</a></div>'
        : A.empty('file-plus', jenisF ? 'Belum ada naskah jenis ini' : 'Belum ada naskah', 'Mulai dengan memilih template, lalu isi formulir bertahap.', '<a class="btn btn-primary btn-sm" href="#/buat">' + I('plus', 'sm') + 'Buat Dokumen</a>');
    };
    const draw = d => {
      dash = d; const ps = d.perStatus || {};
      const st = (lbl, n, unit, tag, ft, ftR) => '<div class="stat"><div class="hd"><span class="eyebrow">' + lbl + '</span>' + tag + '</div><div class="val"><b>' + n + '</b><span>' + unit + '</span></div><div class="ft">' + ft + (ftR ? '<span>' + ftR + '</span>' : '') + '</div></div>';
      A.$('#stats', root).innerHTML = st('Total dokumen', d.total, 'naskah aktif', '<span class="tag">Semua</span>', '<span class="up">+' + d.baruBulanIni + ' bulan ini</span>', d.arsip ? d.arsip + ' diarsipkan' : '') +
        st('Draft', ps.draft || 0, 'perlu dilengkapi', '<span class="tag warn dash">Draft</span>', '<span>Belum difinalisasi</span>') +
        st('Proses penyuntingan', ps.penyuntingan || 0, 'dalam penyuntingan', '<span class="tag blue"><span class="dot"></span>Proses</span>', '<span>Sedang disunting</span>') +
        st('Selesai', ps.selesai || 0, 'siap dicetak', '<span class="tag ok">' + I('check', 'sm') + 'Selesai</span>', '<span style="color:var(--ok-t)">Siap ekspor DOCX/PDF</span>');
      drawRecent();
      const pj = Object.keys(d.perJenis || {}).map(k => ({ label: A.JENIS[k] || k, n: d.perJenis[k] })).sort((a, b) => b.n - a.n);
      A.$('#perjenis', root).innerHTML = pj.length ? A.hbars(pj, 'naskah') : '<p class="muted">Grafik muncul setelah Anda membuat naskah pertama.</p>';
      A.$('#act', root).innerHTML = d.activity && d.activity.length ? '<div class="timeline">' + d.activity.map(a => '<div class="tl-item ' + (/EKSPOR/.test(a.aksi) ? 'ok' : /KOMENTAR|BAGI/.test(a.aksi) ? 'blue' : /GAGAL|HAPUS/.test(a.aksi) ? 'bad' : '') + '"><div class="w">' + esc(A.fmtRel(a.waktu)) + '</div><div class="x">' + esc(A.aksiLabel(a.aksi)) + (a.ringkasan ? ' — <span class="muted">' + esc(a.ringkasan) + '</span>' : '') + '</div></div>').join('') + '</div>' : '<p class="muted">Belum ada aktivitas.</p>';
      if (d.usage) { const pct = Math.min(100, Math.round(d.usage.used / d.usage.quota * 100)); A.$('#quota', root).innerHTML = '<div class="row between"><span class="eyebrow">Kuota penyimpanan organisasi</span><b class="mono" style="color:var(--ink)">' + pct + '%</b></div><div class="progress mt12"><i style="width:' + pct + '%"></i></div><div class="row between mt12 mono" style="font-size:12.5px;color:var(--muted)"><span>' + A.fmtBytes(d.usage.used) + ' terpakai</span><span>Batas ' + A.fmtBytes(d.usage.quota) + '</span></div><div class="row between mt12" style="font-size:13px"><span class="muted">' + d.usage.count + ' berkas</span><a href="#/berkas">Kelola berkas</a></div>'; }
      else A.$('#quota', root).innerHTML = '<p class="muted">Akun belum terhubung ke organisasi.</p>';
    };
    A.on(A.$('#seg', root), 'click', 'button', (e, b) => { jenisF = b.dataset.j; A.$$('#seg button', root).forEach(x => x.setAttribute('aria-pressed', x === b)); if (dash) drawRecent(); });
    A.swr('dash', 'dash.get', {}, 20000, draw).catch(r => { A.$('#stats', root).innerHTML = ''; A.$('#recent', root).innerHTML = A.errorBox(r); });
    A.swr('tpl', 'tpl.list', {}, 300000, d => {
      const top = d.templates.slice().sort((a, b) => b.dipakai - a.dipakai).slice(0, 4);
      A.$('#quick', root).innerHTML = top.map(t => '<button class="li-item" data-t="' + esc(t.id) + '"><span class="li-ic">' + I(JENIS_IC[t.jenis] || 'file') + '</span><span class="grow"><div class="t ellipsis">' + esc(t.nama) + '</div><div class="s">' + esc(t.kategori) + ' · v' + t.versi + '</div></span>' + I('chev-r', 'sm') + '</button>').join('') || '<p class="muted">Belum ada template aktif.</p>';
      A.$$('[data-t]', root).forEach(b => b.onclick = () => A.startDoc(d.templates.find(t => t.id === b.dataset.t)));
    }).catch(() => {});
  }, { nav: 'beranda', crumbs: ['Ruang kerja', 'Beranda'], roles: MEM });

  A.aksiLabel = a => ({ LOGIN: 'Masuk ke sistem', LOGIN_GAGAL: 'Percobaan masuk gagal', LOGOUT: 'Keluar', AKTIVASI: 'Aktivasi akun', DOK_BUAT: 'Membuat naskah', DOK_SIMPAN: 'Menyimpan versi', DOK_STATUS: 'Mengubah status', DOK_EKSPOR: 'Mengekspor naskah', DOK_PRATINJAU: 'Pratinjau PDF', DOK_BAGI: 'Membagikan naskah', DOK_CABUT_BAGI: 'Mencabut akses', DOK_HAPUS: 'Memindahkan ke sampah', DOK_PULIH: 'Memulihkan naskah', DOK_ARSIP: 'Mengarsipkan', DOK_DUPLIKAT: 'Menduplikasi naskah', DOK_PULIH_VERSI: 'Memulihkan versi', KOMENTAR: 'Menambah komentar', BERKAS_UNGGAH: 'Mengunggah berkas', BERKAS_HAPUS: 'Menghapus berkas', ORG_UBAH: 'Memperbarui profil organisasi', UBAH_PIN: 'Mengubah PIN', NOMOR_SURAT: 'Membuat nomor surat', AKSES_DITOLAK: 'Akses ditolak', AKSES_SUPERADMIN: 'Akses dukungan Super Admin' })[a] || a.replace(/_/g, ' ').toLowerCase().replace(/^\w/, c => c.toUpperCase());

  /** Batang horizontal (satu seri) — label & nilai langsung, tanpa legenda. */
  A.hbars = function (rows, unit) {
    const max = Math.max.apply(null, rows.map(r => r.n).concat([1]));
    return '<div class="hbar" role="list">' + rows.map(r => '<div class="hb-row" role="listitem" title="' + esc(r.label + ': ' + r.n + ' ' + unit) + '"><span class="hb-l">' + esc(r.label) + '</span><span class="hb-v">' + r.n + '</span><span class="hb-t"><i style="width:' + Math.max(1.5, r.n / max * 100) + '%"></i></span></div>').join('') + '</div>';
  };

  /* ================= MULAI DOKUMEN ================= */
  A.startDoc = async function (tpl) {
    if (!tpl) return;
    const src = await A.api('doc.sources', { jenis: tpl.jenis });
    const opts = src.success && src.data.length ? src.data : [];
    A.modal({ title: 'Mulai naskah baru', body:
      '<div class="row" style="gap:14px;align-items:flex-start"><span class="li-ic">' + I(JENIS_IC[tpl.jenis] || 'file') + '</span><div><div style="font-weight:700;color:var(--ink)">' + esc(tpl.nama) + '</div><div class="help">' + esc(tpl.kategori) + ' · versi ' + tpl.versi + ' · ' + esc((tpl.ringkasan && tpl.ringkasan.format) || '') + '</div></div></div>' +
      '<div class="col mt16" style="gap:16px"><div class="field"><label for="jd">Judul naskah</label><input class="input" id="jd" value="' + esc(tpl.nama) + '"><div class="help">Dapat diubah kapan saja.</div></div>' +
      (opts.length ? '<div class="field"><label for="from">Isi awal</label><select class="select" id="from"><option value="">Mulai dari isian kosong</option>' + opts.map(o => '<option value="' + esc(o.id) + '">Salin data dari: ' + esc(o.judul) + ' (' + esc(o.kode) + ')</option>').join('') + '</select><div class="help">Data kegiatan, panitia, dan anggaran yang sama jenisnya akan disalin — Anda tinggal menyesuaikan.</div></div>' : '') + '</div>',
      foot: '<button class="btn btn-secondary" data-x>Batal</button><button class="btn btn-primary" id="mk">' + I('file-plus') + 'Buat & Mulai Mengisi</button>',
      onOpen: m => { m.el.querySelector('#mk').onclick = async e => {
        A.busy(e.currentTarget, true, 'Menyiapkan…');
        const r = await A.api('doc.create', { template_id: tpl.id, judul: m.el.querySelector('#jd').value.trim(), from_doc: (m.el.querySelector('#from') || {}).value || '' });
        A.busy(e.currentTarget, false);
        if (!r.success) return A.toast(r.message, 'bad');
        A.LS.set('doc.' + r.data.doc.id, { doc: r.data.doc, content: r.data.content, t: Date.now() });
        A.invalidate('dash'); m.close(); A.go('#/naskah/' + r.data.doc.id);
      }; } });
  };

  /* ================= BUAT DOKUMEN ================= */
  A.route('/buat', async function (root) {
    root.innerHTML = '<div class="ph"><div><div class="tags"><span class="tag ink">Langkah 1</span><span class="tag">Pilih jenis dokumen</span></div><h1>Buat Dokumen</h1><p class="sub">Pilih jenis dokumen yang ingin disusun. Formulir bertahap menyesuaikan jenis yang dipilih dan tersimpan otomatis sebagai draf.</p></div><div class="acts"><a class="btn btn-secondary" href="#/template">' + I('layers') + 'Jelajahi semua template</a></div></div><div class="grid g3" id="types">' + A.skel(5, 170) + '</div><h2 class="mt24 mb16" style="font-size:18px">Template yang sering dipakai</h2><div class="grid g3" id="pop"></div>';
    try {
      await A.swr('tpl', 'tpl.list', {}, 300000, d => {
        A.$('#types', root).innerHTML = d.categories.map(c => {
          const n = d.templates.filter(t => t.category_id === c.id).length;
          return '<button class="type-card" data-c="' + esc(c.id) + '" ' + (n ? '' : 'disabled style="opacity:.55;cursor:not-allowed"') + '><div class="k"><span class="li-ic">' + I(JENIS_IC[c.kode] || 'file') + '</span><span class="tag">' + n + ' template</span></div><div class="t">' + esc(c.nama) + '</div><div class="d">' + esc(c.deskripsi || '') + '</div><span class="row" style="font-weight:600;color:var(--ink);font-size:13.5px">Mulai ' + I('arrow-r', 'sm') + '</span></button>';
        }).join('');
        A.$$('[data-c]', root).forEach(b => b.onclick = () => {
          const list = d.templates.filter(t => t.category_id === b.dataset.c);
          if (list.length === 1) return A.startDoc(list[0]);
          A.modal({ title: 'Pilih template', body: '<div class="list">' + list.map(t => '<button class="li-item" data-t="' + esc(t.id) + '"><span class="li-ic">' + I(JENIS_IC[t.jenis] || 'file') + '</span><span class="grow"><div class="t">' + esc(t.nama) + '</div><div class="help" style="margin-top:4px">' + esc(t.deskripsi) + '</div></span>' + I('chev-r', 'sm') + '</button>').join('') + '</div>', onOpen: m => A.$$('[data-t]', m.el).forEach(x => x.onclick = () => { m.close(); A.startDoc(list.find(t => t.id === x.dataset.t)); }) });
        });
        A.$('#pop', root).innerHTML = d.templates.slice().sort((a, b) => b.dipakai - a.dipakai).slice(0, 3).map(t => '<button class="li-item" data-t="' + esc(t.id) + '"><span class="li-ic">' + I(JENIS_IC[t.jenis] || 'file') + '</span><span class="grow"><div class="t">' + esc(t.nama) + '</div><div class="s">Dipakai ' + t.dipakai + '× · ' + esc(t.kategori) + '</div></span>' + I('arrow-r', 'sm') + '</button>').join('');
        A.$$('#pop [data-t]', root).forEach(b => b.onclick = () => A.startDoc(d.templates.find(t => t.id === b.dataset.t)));
      });
    } catch (r) { A.$('#types', root).innerHTML = A.errorBox(r); }
  }, { nav: '', crumbs: ['Ruang kerja', 'Naskah baru'], roles: MEM });

  /* ================= TEMPLATE LIBRARY ================= */
  A.route('/template', async function (root, p, q) {
    let cat = q.kat || '', term = '';
    root.innerHTML = '<div class="ph"><div><div class="tags"><span class="tag ink">Katalog</span></div><h1>Template Naskah</h1><p class="sub">Koleksi template resmi organisasi. Pratinjau struktur & format sebelum dipakai — dokumen Anda tidak berubah walau template diperbarui.</p></div>' + (A.session.isAdmin() ? '<div class="acts"><a class="btn btn-secondary" href="#/admin/template">' + I('layout') + 'Kelola template</a></div>' : '') + '</div>' +
      '<section class="card"><div class="toolbar"><div class="search">' + I('search', 'sm') + '<input class="input" id="q" placeholder="Cari nama template…" aria-label="Cari template"></div><div id="chips" class="row wrap"></div></div><div class="card-body"><div class="grid g4" id="grid">' + A.skel(4, 260) + '</div></div></section>';
    let data;
    const draw = () => {
      A.$('#chips', root).innerHTML = '<div class="seg" role="group" aria-label="Kategori"><button data-k="" aria-pressed="' + (!cat) + '">Semua</button>' + data.categories.map(c => '<button data-k="' + esc(c.id) + '" aria-pressed="' + (cat === c.id) + '">' + esc(c.nama.replace(/ Organisasi| Kegiatan| & Administrasi/g, '')) + '</button>').join('') + '</div>';
      const list = data.templates.filter(t => (!cat || t.category_id === cat) && (!term || t.nama.toLowerCase().indexOf(term) > -1));
      A.$('#grid', root).innerHTML = list.length ? list.map(t => '<article class="tpl-card"><div class="tpl-thumb" data-pv="' + esc(t.id) + '" role="button" tabindex="0" aria-label="Pratinjau ' + esc(t.nama) + '"><span class="tag">' + esc(t.kategori) + '</span><div class="mini-sheet"><i class="h"></i><i class="c"></i>' + (t.ringkasan.bab || []).slice(0, 6).map((b, i) => '<i class="' + (i % 3 === 2 ? 's' : '') + '"></i>').join('') + '<i></i><i class="s"></i></div></div>' +
        '<div class="tpl-body"><div class="t">' + esc(t.nama) + '</div><div class="m">v' + t.versi + ' · ' + (t.ringkasan.bab || []).length + ' bagian · ' + esc((t.ringkasan.format || '').split(' · ')[0]) + ' · dipakai ' + t.dipakai + '×</div><p class="help" style="margin-top:4px">' + esc(t.deskripsi) + '</p></div>' +
        '<div class="tpl-foot"><button class="btn btn-secondary btn-sm grow" data-pv="' + esc(t.id) + '">' + I('eye', 'sm') + 'Pratinjau</button><button class="btn btn-primary btn-sm grow" data-use="' + esc(t.id) + '">Gunakan</button></div></article>').join('')
        : '<div style="grid-column:1/-1">' + A.empty('search', 'Template tidak ditemukan', 'Coba kata kunci atau kategori lain.') + '</div>';
    };
    try { data = await A.swr('tpl', 'tpl.list', {}, 300000, d => { data = d; draw(); }); data = data; draw(); } catch (r) { A.$('#grid', root).innerHTML = A.errorBox(r); return; }
    A.$('#q', root).oninput = A.debounce(e => { term = e.target.value.toLowerCase().trim(); draw(); }, 150);
    A.on(root, 'click', '[data-k]', (e, b) => { cat = b.dataset.k; A.setQuery({ kat: cat }); draw(); });
    A.on(root, 'click', '[data-use]', (e, b) => A.startDoc(data.templates.find(t => t.id === b.dataset.use)));
    A.on(root, 'click', '[data-pv]', (e, b) => A.previewTemplate(data.templates.find(t => t.id === b.dataset.pv)));
    A.on(root, 'keydown', '.tpl-thumb', (e, b) => { if (e.key === 'Enter') A.previewTemplate(data.templates.find(t => t.id === b.dataset.pv)); });
  }, { nav: 'template', crumbs: ['Ruang kerja', 'Template naskah'], roles: MEM });

  A.previewTemplate = async function (t) {
    const bd = document.createElement('div'); bd.className = 'drawer-bd';
    const dr = document.createElement('aside'); dr.className = 'drawer'; dr.style.width = 'min(620px,100vw)'; dr.setAttribute('aria-label', 'Pratinjau template');
    dr.innerHTML = '<div class="modal-head"><div><div class="eyebrow">Pratinjau template</div><h2 style="font-size:17px;margin-top:4px">' + esc(t.nama) + '</h2></div><button class="icon-btn" data-x aria-label="Tutup">' + I('x') + '</button></div>' +
      '<div style="flex:1;overflow:auto;padding:18px 20px"><div class="well" id="pvw" style="display:flex;justify-content:center;padding:16px;min-height:300px">' + A.skel(6) + '</div>' +
      '<div class="grid g2 mt16"><div><h3 style="font-size:14px" class="mb8">Struktur</h3><ul class="outline-list">' + (t.ringkasan.bab || []).map(b => '<li>' + esc(b) + '</li>').join('') + '</ul></div><div><h3 style="font-size:14px" class="mb8">Format</h3><table class="tbl compact"><tbody>' + (t.ringkasan.format || '').split(' · ').map(x => '<tr><td style="padding:6px 0">' + esc(x) + '</td></tr>').join('') + '<tr><td style="padding:6px 0">' + t.ringkasan.isian + ' isian · ' + t.ringkasan.tahap + ' tahap formulir</td></tr><tr><td style="padding:6px 0">Kop surat: ' + (t.ringkasan.kop ? 'ya' : 'tidak') + '</td></tr></tbody></table></div></div></div>' +
      '<div class="modal-foot"><span class="help grow">Pratinjau memakai data contoh.</span><button class="btn btn-secondary" data-x>Tutup</button><button class="btn btn-primary" data-use>' + I('file-plus') + 'Gunakan Template</button></div>';
    const close = () => { bd.remove(); dr.remove(); };
    bd.onclick = close; A.on(dr, 'click', '[data-x]', close); dr.querySelector('[data-use]').onclick = () => { close(); A.startDoc(t); };
    document.body.appendChild(bd); document.body.appendChild(dr);
    const r = await A.api('tpl.get', { id: t.id });
    if (!r.success) { A.$('#pvw', dr).innerHTML = A.errorBox(r); return; }
    const orgSnap = M.orgSnapshot({ nama: 'Nama Organisasi Anda', singkatan: 'ORG', induk: 'Lembaga Induk', alamat: 'Alamat sekretariat', periode_mulai: A.today() }, [{ jabatan: 'Ketua', nama: 'Nama Ketua' }, { jabatan: 'Sekretaris', nama: 'Nama Sekretaris' }, { jabatan: 'Pembina', nama: 'Nama Pembina' }]);
    const doc = M.newDoc(r.data.schema, orgSnap, { sample: true });
    A.Doc.mountPreview(A.$('#pvw', dr), doc, { scale: 0.62, meta: { today: A.today(), kode: 'NSK-CONTOH' }, maxPages: 6, miss: true });
  };

  /* ================= NASKAH SAYA ================= */
  A.route('/dokumen', async function (root, p, q) {
    const st = { tab: q.tab || 'semua', q: q.q || '', jenis: q.jenis || '', from: q.from || '', to: q.to || '', sort: q.sort || 'baru', page: +q.page || 1 };
    root.innerHTML = '<div class="ph"><div><div class="tags"><span class="tag ink">Repositori</span></div><h1>Naskah Saya</h1><p class="sub">Kelola seluruh naskah kegiatan, produk hukum organisasi, dan laporan Anda.</p></div><div class="acts"><a class="btn btn-primary" href="#/buat">' + I('plus') + 'Buat Dokumen</a></div></div>' +
      '<div id="tabs"></div><section class="card mt16"><div class="toolbar"><div class="search">' + I('search', 'sm') + '<input class="input" id="q" placeholder="Cari judul atau kode naskah…" value="' + esc(st.q) + '" aria-label="Cari"></div>' +
      '<select class="select" id="jenis" aria-label="Jenis"><option value="">Semua jenis</option>' + Object.keys(A.JENIS).filter(k => k !== 'umum').map(k => '<option value="' + k + '" ' + (st.jenis === k ? 'selected' : '') + '>' + A.JENIS[k] + '</option>').join('') + '</select>' +
      '<input class="input" type="date" id="from" value="' + esc(st.from) + '" style="width:auto" aria-label="Diubah sejak"><input class="input" type="date" id="to" value="' + esc(st.to) + '" style="width:auto" aria-label="Diubah sampai">' +
      '<select class="select" id="sort" aria-label="Urutkan"><option value="baru">Terakhir diubah (terbaru)</option><option value="lama">Terakhir diubah (terlama)</option><option value="judul">Judul (A–Z)</option></select></div><div id="list">' + A.skel(6, 44) + '</div></section>' +
      '<div class="banner mt16">' + I('info') + '<div><b>Kebijakan retensi:</b> naskah yang dihapus disimpan di Tempat Sampah selama 30 hari sebelum dihapus permanen. Anda dapat memulihkannya kapan saja sebelum itu.</div></div>';
    A.$('#sort', root).value = st.sort;
    const load = async () => {
      A.setQuery(st);
      const r = await A.q('doc.list', { tab: st.tab, q: st.q, jenis: st.jenis, from: st.from, to: st.to, sort: st.sort, page: st.page, per: 10 });
      if (!r.success) { A.$('#list', root).innerHTML = A.errorBox(r, true); return; }
      const d = r.data, c = d.counts;
      A.$('#tabs', root).innerHTML = A.tabs([['semua', 'Semua Naskah', c.semua], ['draft', 'Draft', c.draft], ['penyuntingan', 'Proses Penyuntingan', c.penyuntingan], ['selesai', 'Selesai', c.selesai], ['arsip', 'Diarsipkan', c.arsip], ['sampah', 'Tempat Sampah', c.sampah]], st.tab);
      A.$('#list', root).innerHTML = d.items.length ? '<div class="tbl-wrap"><table class="tbl cards"><thead><tr><th>Kode naskah</th><th>Judul dokumen & rincian</th><th>Kategori</th><th>Status</th><th>Terakhir diubah</th><th class="t-act">Aksi</th></tr></thead><tbody>' +
        d.items.map(x => '<tr><td data-l="Kode"><span class="code">' + esc(x.kode) + '</span></td><td data-l="Judul"><div class="t-title">' + (st.tab === 'sampah' ? esc(x.judul) : '<a href="#/naskah/' + esc(x.id) + '">' + esc(x.judul) + '</a>') + '</div><div class="t-sub"><span class="mono">v' + x.versi_terakhir + '</span>' + (x.halaman ? ' · ' + x.halaman + ' halaman' : '') + (x.dihapus_at ? ' · dihapus ' + esc(A.fmtRel(x.dihapus_at)) : '') + '</div></td><td data-l="Kategori"><span class="tag">' + esc(A.JENIS[x.jenis] || x.jenis) + '</span></td><td data-l="Status">' + A.statusTag(x.status) + '</td><td data-l="Diubah" class="mono" style="font-size:12.5px;color:var(--muted)">' + esc(A.fmtRel(x.updated_at)) + '</td>' +
          '<td class="t-act">' + (st.tab !== 'sampah' ? '<a class="btn btn-ghost btn-icon btn-sm" href="#/naskah/' + esc(x.id) + '" aria-label="Sunting" title="Sunting">' + I('edit', 'sm') + '</a>' : '') + '<button class="btn btn-ghost btn-icon btn-sm" data-more="' + esc(x.id) + '" aria-label="Aksi lain">' + I('more', 'sm') + '</button></td></tr>').join('') + '</tbody></table></div>' + A.pager(d, 'naskah')
        : A.empty(st.tab === 'sampah' ? 'trash' : 'file', st.tab === 'sampah' ? 'Tempat Sampah kosong' : 'Belum ada naskah di sini', st.q ? 'Tidak ada hasil untuk "' + st.q + '".' : '', st.tab === 'semua' && !st.q ? '<a class="btn btn-primary btn-sm" href="#/buat">' + I('plus', 'sm') + 'Buat Dokumen</a>' : '');
      A.$$('[data-more]', root).forEach(b => b.onclick = () => {
        const x = d.items.find(i => i.id === b.dataset.more), act = async (a, data, msg) => { const r2 = await A.api(a, data); if (!r2.success) return A.toast(r2.message, 'bad'); A.toast(r2.message || msg); A.invalidate('dash'); load(); };
        A.menu(b, st.tab === 'sampah' ? [
          { label: 'Pulihkan', icon: 'refresh', act: () => act('doc.restore', { id: x.id }) },
          { label: 'Hapus permanen', icon: 'trash', danger: true, act: async () => { if (await A.confirm({ title: 'Hapus permanen?', text: '"' + x.judul + '" beserta seluruh riwayat versinya akan dihapus dan tidak dapat dipulihkan.', ok: 'Hapus permanen', danger: true })) act('doc.purge', { id: x.id }); } }
        ] : [
          { label: 'Buka', icon: 'edit', act: () => A.go('#/naskah/' + x.id) },
          { label: 'Duplikasi', icon: 'copy', act: () => act('doc.duplicate', { id: x.id }) },
          { label: 'Bagikan…', icon: 'share', act: () => A.shareDialog(x) },
          x.arsip ? { label: 'Kembalikan dari arsip', icon: 'archive', act: () => act('doc.archive', { id: x.id, arsip: false }) } : { label: 'Arsipkan', icon: 'archive', act: () => act('doc.archive', { id: x.id, arsip: true }) },
          '-', { label: 'Hapus', icon: 'trash', danger: true, act: async () => { if (await A.confirm({ title: 'Pindahkan ke Tempat Sampah?', text: '"' + x.judul + '" dapat dipulihkan dalam 30 hari.', ok: 'Pindahkan', danger: true })) act('doc.trash', { id: x.id }); } }
        ]);
      });
    };
    A.on(root, 'click', '[data-tab]', (e, b) => { st.tab = b.dataset.tab; st.page = 1; load(); });
    A.on(root, 'click', '[data-page]', (e, b) => { st.page = +b.dataset.page; load(); });
    A.on(root, 'click', '[data-act=retry]', load);
    A.$('#q', root).oninput = A.debounce(e => { st.q = e.target.value.trim(); st.page = 1; load(); }, 300);
    ['jenis', 'from', 'to', 'sort'].forEach(k => A.$('#' + k, root).onchange = e => { st[k] = e.target.value; st.page = 1; load(); });
    load();
  }, { nav: 'dokumen', crumbs: ['Ruang kerja', 'Naskah saya'], roles: MEM });

  /* ================= BERBAGI (dialog) ================= */
  A.shareDialog = async function (doc) {
    const m = A.modal({ title: 'Bagikan naskah', size: 'lg', body: '<p class="help mb16">' + esc(doc.judul) + ' · <span class="mono">' + esc(doc.kode) + '</span></p><div class="grid" style="grid-template-columns:minmax(0,1fr) 170px 150px auto;gap:10px;align-items:end"><div class="field"><label for="su">Pengguna (organisasi yang sama)</label><select class="select" id="su"><option value="">Memuat…</option></select></div><div class="field"><label for="iz">Izin</label><select class="select" id="iz"><option value="lihat">Hanya lihat</option><option value="komentar">Komentar</option><option value="edit">Sunting</option></select></div><label class="check" style="margin-bottom:10px"><input type="checkbox" id="ud" checked> Boleh unduh</label><button class="btn btn-primary" id="add">' + I('user-plus') + 'Bagikan</button></div><div class="mt16" id="sl">' + A.skel(2) + '</div><div class="banner mt16">' + I('info') + '<div>Penerima dengan peran <b>Viewer</b> hanya dapat melihat atau berkomentar. Akses dapat dicabut kapan saja.</div></div>' });
    const [u, s] = await Promise.all([A.q('users.lookup', { q: '' }), A.q('share.list', { doc_id: doc.id })]);
    const users = u.success ? u.data : [];
    A.$('#su', m.el).innerHTML = users.length ? '<option value="">Pilih pengguna…</option>' + users.map(x => '<option value="' + esc(x.id) + '">' + esc(x.nama) + (x.jabatan ? ' — ' + esc(x.jabatan) : '') + (x.role === 'viewer' ? ' (Viewer)' : '') + '</option>').join('') : '<option value="">Belum ada pengguna lain di organisasi</option>';
    const drawList = list => {
      A.$('#sl', m.el).innerHTML = list.length ? '<table class="tbl compact"><thead><tr><th>Pengguna</th><th>Izin</th><th>Unduh</th><th></th></tr></thead><tbody>' + list.map(x => '<tr><td><div class="row"><span class="avatar sm soft">' + esc(A.initials(x.nama)) + '</span><div><div style="font-weight:600">' + esc(x.nama) + '</div><div class="help">' + esc(x.jabatan || x.role) + '</div></div></div></td><td><span class="tag ' + (x.izin === 'edit' ? 'blue' : x.izin === 'komentar' ? 'warn' : '') + '">' + esc({ edit: 'Dapat menyunting', komentar: 'Komentar saja', lihat: 'Hanya lihat' }[x.izin]) + '</span></td><td>' + (x.unduh ? 'Ya' : 'Tidak') + '</td><td class="t-act"><button class="btn btn-ghost btn-sm" data-rm="' + esc(x.id) + '">Cabut</button></td></tr>').join('') + '</tbody></table>' : '<p class="muted">Naskah ini belum dibagikan.</p>';
    };
    drawList(s.success ? s.data : []);
    A.$('#add', m.el).onclick = async e => {
      const uid = A.$('#su', m.el).value; if (!uid) return A.toast('Pilih pengguna.', 'warn');
      A.busy(e.currentTarget, true, 'Membagikan…');
      const r = await A.api('share.save', { doc_id: doc.id, user_id: uid, izin: A.$('#iz', m.el).value, unduh: A.$('#ud', m.el).checked });
      A.busy(e.currentTarget, false);
      if (!r.success) return A.toast(r.message, 'bad');
      drawList(r.data); A.toast('Naskah dibagikan.');
    };
    A.on(m.el, 'click', '[data-rm]', async (e, b) => { const r = await A.api('share.remove', { doc_id: doc.id, share_id: b.dataset.rm }); if (r.success) { drawList(r.data); A.toast('Akses dicabut.'); } else A.toast(r.message, 'bad'); });
  };

  /* ================= DIBAGIKAN KEPADA SAYA ================= */
  A.route('/dibagikan', async function (root, p, q) {
    const st = { izin: q.izin || '', q: '', page: 1 };
    root.innerHTML = '<div class="ph"><div><div class="tags"><span class="tag ink">Kolaborasi</span><span class="tag">Hak akses dokumen</span></div><h1>Dibagikan kepada Saya</h1><p class="sub">Naskah organisasi yang dibagikan pengguna lain untuk Anda tinjau, komentari, atau sunting.</p></div></div><div class="grid g3" id="cards"></div><section class="card mt24"><div id="tabs" style="padding:0 12px"></div><div class="toolbar"><div class="search">' + I('search', 'sm') + '<input class="input" id="q" placeholder="Cari judul, pemilik, atau kode…" aria-label="Cari"></div></div><div id="list">' + A.skel(5, 44) + '</div></section>' +
      '<div class="banner mt16">' + I('shield') + '<div><b>Prinsip kolaborasi & akses terbatas.</b> Hak akses ditentukan pemilik naskah. Perubahan yang Anda buat dengan izin sunting tersimpan di riwayat versi atas nama Anda.</div></div>';
    const load = async () => {
      const r = await A.q('shared.list', { izin: st.izin, q: st.q, page: st.page });
      if (!r.success) { A.$('#list', root).innerHTML = A.errorBox(r); return; }
      const d = r.data, c = d.counts;
      A._sharedCt = c.semua;
      const card = (cls, lbl, ic, n, a, b) => '<div class="stat"><div class="hd"><span class="eyebrow row"><span class="dot" style="width:8px;height:8px;border-radius:50%;background:' + cls + '"></span>' + lbl + '</span>' + I(ic) + '</div><div class="val"><b>' + n + '</b><span>naskah</span></div><div class="ft"><b style="color:var(--text)">' + a + '</b><span>' + b + '</span></div></div>';
      A.$('#cards', root).innerHTML = card('var(--blue)', 'Izin sunting', 'edit', c.edit, 'Dapat disunting', 'Penuh') + card('var(--warn)', 'Izin komentar', 'msg', c.komentar, 'Dapat dikomentari', 'Catatan') + card('var(--ctl)', 'Hanya baca', 'eye', c.lihat, 'Hanya lihat', 'Pratinjau');
      A.$('#tabs', root).innerHTML = A.tabs([['', 'Semua Dokumen', c.semua], ['edit', 'Dapat Disunting', c.edit], ['komentar', 'Komentar', c.komentar], ['lihat', 'Hanya Lihat', c.lihat]], st.izin);
      A.$('#list', root).innerHTML = d.items.length ? '<div class="tbl-wrap"><table class="tbl cards"><thead><tr><th>Kode naskah</th><th>Judul dokumen & unit</th><th>Pemilik</th><th>Izin akses</th><th>Status</th><th>Dibagikan</th><th></th></tr></thead><tbody>' +
        d.items.map(x => '<tr><td data-l="Kode" class="mono" style="font-size:12.5px">' + esc(x.kode) + '</td><td data-l="Judul"><div class="t-title"><a href="#/naskah/' + esc(x.id) + '">' + esc(x.judul) + '</a></div><div class="t-sub">Unit: ' + esc(x.unit || '-') + '</div></td><td data-l="Pemilik"><div class="row"><span class="avatar sm soft">' + esc(A.initials(x.owner_nama)) + '</span>' + esc(x.owner_nama) + '</div></td><td data-l="Izin"><span class="tag ' + (x.izin === 'edit' ? 'blue' : x.izin === 'komentar' ? 'warn' : '') + '">' + I(x.izin === 'edit' ? 'edit' : x.izin === 'komentar' ? 'msg' : 'eye', 'sm') + esc({ edit: 'Dapat disunting', komentar: 'Komentar saja', lihat: 'Hanya lihat' }[x.izin]) + '</span></td><td data-l="Status">' + A.statusTag(x.status) + '</td><td data-l="Dibagikan" class="mono" style="font-size:12.5px;color:var(--muted)">' + esc(A.fmtRel(x.dibagikan_at)) + '</td><td class="t-act"><a class="btn btn-' + (x.izin === 'edit' ? 'primary' : 'secondary') + ' btn-sm" href="#/naskah/' + esc(x.id) + '">' + (x.izin === 'edit' ? 'Sunting' : 'Buka') + '</a></td></tr>').join('') + '</tbody></table></div>' + A.pager(d, 'dokumen')
        : A.empty('share', 'Belum ada naskah yang dibagikan', 'Naskah yang dibagikan pengguna lain kepada Anda akan muncul di sini.');
    };
    A.on(root, 'click', '[data-tab]', (e, b) => { st.izin = b.dataset.tab; st.page = 1; load(); });
    A.on(root, 'click', '[data-page]', (e, b) => { st.page = +b.dataset.page; load(); });
    A.$('#q', root).oninput = A.debounce(e => { st.q = e.target.value; st.page = 1; load(); }, 300);
    load();
  }, { nav: 'dibagikan', crumbs: ['Ruang kerja', 'Dibagikan'] });

  /* ================= PROFIL ORGANISASI ================= */
  A.route('/profil', async function (root, p, q) {
    root.innerHTML = A.skel(8, 30);
    const r = await A.api('org.get', { id: q.org || '' });
    if (!r.success) { root.innerHTML = A.errorBox(r); return; }
    const d = r.data, o = d.org, ro = !d.canEdit;
    let officers = d.officers.map(x => Object.assign({}, x)), logo = o.logo_file_id, dirty = false;
    const inp = (id, v, extra) => '<input class="input" id="' + id + '" value="' + esc(v) + '" ' + (ro ? 'readonly' : '') + ' ' + (extra || '') + '>';
    root.innerHTML = '<div class="ph"><div><div class="tags"><span class="tag ink">Profil</span><span class="tag">Identitas & penandatangan</span></div><h1>Profil Organisasi</h1><p class="sub">Identitas resmi, logo, dan susunan pengurus penandatangan naskah. Data ini otomatis mengisi kop surat & lembar pengesahan naskah baru.</p></div>' +
      '<div class="acts"><button class="btn btn-secondary" id="pv">' + I('eye') + 'Pratinjau Kop Surat</button>' + (ro ? '' : '<button class="btn btn-primary" data-save>' + I('check') + 'Simpan Perubahan</button>') + '</div></div>' +
      (ro ? '<div class="banner warn mb16">' + I('lock') + '<div>Anda hanya dapat melihat profil ini. Kewenangan mengubah diberikan oleh Administrator.</div></div>' : '') +
      '<div class="banner mb16">' + I('info') + '<div><b>Integritas naskah.</b> Perubahan profil menjadi data baku untuk naskah baru. Naskah berstatus <span class="tag ok" style="padding:2px 6px">Selesai</span> tidak berubah; draf dapat disinkronkan dari editor.</div></div>' +
      '<div class="grid g2" style="align-items:start"><div class="col" style="gap:20px"><section class="card"><div class="card-head"><h3>' + I('building') + 'Identitas Resmi Organisasi</h3><span class="eyebrow">Modul 01</span></div><div class="card-body"><div class="fgrid">' +
      A.field({ id: 'nama', label: 'Nama lengkap organisasi', req: 1, cls: 'w-full', input: inp('nama', o.nama) }) +
      A.field({ id: 'singkatan', label: 'Singkatan / akronim', req: 1, cls: 'w-half', input: inp('singkatan', o.singkatan) }) +
      A.field({ id: 'jenis', label: 'Jenis lembaga', cls: 'w-half', input: '<select class="select" id="jenis" ' + (ro ? 'disabled' : '') + '>' + ['Badan Eksekutif', 'Himpunan', 'OSIS', 'Unit Kegiatan', 'Kepanitiaan', 'Organisasi', 'Komunitas', 'Instansi'].map(x => '<option ' + (o.jenis === x ? 'selected' : '') + '>' + x + '</option>').join('') + '</select>' }) +
      A.field({ id: 'induk', label: 'Lembaga induk (baris kop surat)', cls: 'w-full', help: 'Satu baris per tingkat, mis. "Universitas Nusantara" lalu "Fakultas Teknik".', input: '<textarea class="textarea" id="induk" rows="2" style="min-height:64px" ' + (ro ? 'readonly' : '') + '>' + esc(o.induk) + '</textarea>' }) +
      A.field({ id: 'alamat', label: 'Alamat sekretariat', cls: 'w-full', input: '<textarea class="textarea" id="alamat" rows="2" style="min-height:64px" ' + (ro ? 'readonly' : '') + '>' + esc(o.alamat) + '</textarea>' }) +
      A.field({ id: 'email', label: 'Email resmi', cls: 'w-half', input: inp('email', o.email, 'type="email"') }) + A.field({ id: 'telepon', label: 'Telepon', cls: 'w-half', input: inp('telepon', o.telepon, 'inputmode="tel"') }) +
      A.field({ id: 'website', label: 'Situs web', cls: 'w-full', input: inp('website', o.website, 'placeholder="https://"') }) + '</div>' +
      '<div class="well mt16"><div class="row between"><b style="color:var(--ink)">Periode kepengurusan aktif</b><span class="mono" style="color:var(--blue-txt);font-weight:600" id="per"></span></div><div class="grid g2 mt12">' + A.field({ id: 'pm', label: 'Mulai berlaku', input: inp('pm', o.periode_mulai, 'type="date"') }) + A.field({ id: 'ps', label: 'Berakhir pada', input: inp('ps', o.periode_selesai, 'type="date"') }) + '</div></div></div></section>' +
      '<section class="card"><div class="card-head"><h3>' + I('images') + 'Lambang & Penomoran Surat</h3><span class="eyebrow">Modul 02</span></div><div class="card-body"><div class="lbl mb8">Logo resmi organisasi</div><div class="drop" style="min-height:0;flex-direction:row;justify-content:flex-start;text-align:left;gap:18px;cursor:default" id="logoBox"></div>' +
      '<div class="field mt16"><label for="fns">Format nomor surat otomatis</label>' + inp('fns', o.format_nomor_surat || '{{no_urut}}/{{kode_org}}/{{bulan}}/{{tahun}}', 'class="input mono"') + '<div class="help">Variabel: <span class="code">{{no_urut}}</span> <span class="code">{{kode_org}}</span> <span class="code">{{kode_bidang}}</span> <span class="code">{{bulan}}</span> (romawi) <span class="code">{{bulan_angka}}</span> <span class="code">{{tahun}}</span></div><div class="help">Contoh hasil: <b class="mono" id="fnsx"></b></div></div></div></section></div>' +
      '<div class="col" style="gap:20px"><section class="card"><div class="card-head"><div><h3>' + I('sign') + 'Pejabat & Pengurus Berwenang</h3><div class="eyebrow mt8">Penandatangan naskah resmi</div></div>' + (ro ? '' : '<button class="btn btn-primary btn-sm" id="addOf">' + I('user-plus', 'sm') + 'Tambah</button>') + '</div><div class="card-body"><p class="well help mb16">Nama & nomor identitas ini otomatis dipakai blok tanda tangan (mis. <span class="code">{{org_ketua}}</span>, <span class="code">{{org_pembina}}</span>).</p><div id="ofs"></div></div></section>' +
      '<section class="card"><div class="card-head"><h3>' + I('eye') + 'Pratinjau Kop & Tanda Tangan</h3><span class="eyebrow">Skala 1:2</span></div><div class="card-body"><div class="well" id="kopPv" style="display:flex;justify-content:center;padding:14px;overflow:hidden"></div></div></section></div></div>' +
      (ro ? '' : '<div class="sticky-bar"><span class="note">' + I('history', 'sm') + (d.lastEdit ? 'Terakhir diperbarui ' + esc(A.fmtDateTime(d.lastEdit.waktu)) + ' oleh ' + esc(d.lastEdit.oleh) : 'Belum pernah diperbarui') + '</span><span class="sp"></span><button class="btn btn-secondary" id="batal">Batal</button><button class="btn btn-primary" data-save>' + I('save') + 'Simpan Profil</button></div>');
    const val = id => A.$('#' + id, root).value.trim();
    const cur = () => ({ id: o.id, nama: val('nama'), singkatan: val('singkatan'), jenis: val('jenis'), induk: A.$('#induk', root).value, alamat: A.$('#alamat', root).value, email: val('email'), telepon: val('telepon'), website: val('website'), periode_mulai: val('pm'), periode_selesai: val('ps'), format_nomor_surat: val('fns'), logo_file_id: logo });
    const preview = () => {
      const c = cur(), snap = M.orgSnapshot(c, officers);
      A.$('#per', root).textContent = M.ph({ org: snap, fdefs: [] }, 'org_periode') || '—';
      const now = new Date(); A.$('#fnsx', root).textContent = (c.format_nomor_surat || '').replace(/\{\{\s*no_urut\s*\}\}/g, '001').replace(/\{\{\s*bulan\s*\}\}/g, M.romawi(now.getMonth() + 1)).replace(/\{\{\s*bulan_angka\s*\}\}/g, String(now.getMonth() + 1).padStart(2, '0')).replace(/\{\{\s*tahun\s*\}\}/g, now.getFullYear()).replace(/\{\{\s*kode_org\s*\}\}/g, c.singkatan || 'ORG').replace(/\{\{\s*kode_bidang\s*\}\}/g, 'SEK');
      const two = officers.filter(x => x.aktif !== false).slice(0, 2);
      const doc = { page: { kop: 'first', pnum: 'none', size: 'A4', font: 'Times New Roman', fs: 12, ls: 1.5 }, fdefs: [], fields: {}, org: snap, blocks: [{ t: 'p', c: [{ x: ' ' }] }, { t: 'sign', place: [{ x: (c.alamat || 'Kota').split(',').pop().trim() + ', ' + M.tanggal(A.today()) }], items: two.map((x, i) => ({ l: [{ x: (i ? 'Mengetahui,\n' : '') + x.jabatan + ',' }], n: [{ x: x.nama }], id: [{ x: x.nomor_identitas ? 'NIM/NIP. ' + x.nomor_identitas : '' }] })) }] };
      A.Doc.mountPreview(A.$('#kopPv', root), doc, { scale: 0.5, maxPages: 1, crop: 520 });
    };
    const drawLogo = async () => {
      const box = A.$('#logoBox', root), url = logo ? await A.fileUrl(logo) : '';
      box.innerHTML = '<div class="org-snap"><div class="lg" style="width:96px;height:96px">' + (url ? '<img alt="Logo" src="' + url + '">' : esc((o.singkatan || 'ORG').slice(0, 4))) + '</div></div><div class="col" style="gap:8px;align-items:flex-start"><b style="color:var(--ink)">' + (logo ? 'Logo terpasang' : 'Belum ada logo') + '</b><span class="help">PNG/JPG/SVG (SVG otomatis diubah ke PNG), maks. ' + esc((A.session.boot.settings || {}).maks_berkas_mb || 10) + ' MB. Disarankan latar transparan.</span>' + (ro ? '' : '<div class="row wrap"><button class="btn btn-secondary btn-sm" id="upL">' + I('upload', 'sm') + 'Unggah logo</button><button class="btn btn-ghost btn-sm" id="pickL">' + I('images', 'sm') + 'Pilih dari pustaka</button>' + (logo ? '<button class="btn btn-ghost btn-sm" id="rmL">' + I('trash', 'sm') + 'Lepas</button>' : '') + '</div>') + '</div>';
      if (ro) return;
      A.$('#upL', root).onclick = () => A.pickUpload({ kategori: 'logo', accept: 'image/png,image/jpeg,image/svg+xml' }, f => { logo = f.id; dirty = true; drawLogo(); preview(); });
      A.$('#pickL', root).onclick = () => A.pickFile({ gambar: true }, f => { logo = f.id; dirty = true; drawLogo(); preview(); });
      if (A.$('#rmL', root)) A.$('#rmL', root).onclick = () => { logo = ''; dirty = true; drawLogo(); preview(); };
    };
    const drawOf = () => {
      A.$('#ofs', root).innerHTML = officers.length ? '<table class="tbl compact"><thead><tr><th>Nama & identitas</th><th>Jabatan formal</th><th>Status</th>' + (ro ? '' : '<th></th>') + '</tr></thead><tbody>' + officers.map((x, i) => '<tr><td><div style="font-weight:600;color:var(--ink)">' + esc(x.nama) + '</div><div class="t-sub mono">' + esc(x.nomor_identitas || '—') + '</div></td><td><div>' + esc(x.jabatan) + '</div><div class="t-sub mono">' + esc(x.peran_ttd || '') + '</div></td><td><span class="tag ' + (x.aktif !== false ? 'ok' : '') + '">' + (x.aktif !== false ? 'Aktif' : 'Nonaktif') + '</span></td>' + (ro ? '' : '<td class="t-act"><button class="btn btn-ghost btn-icon btn-sm" data-ed="' + i + '" aria-label="Ubah">' + I('edit', 'sm') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-up="' + i + '" aria-label="Naikkan" ' + (i ? '' : 'disabled') + '>' + I('arrow-u', 'sm') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-rm="' + i + '" aria-label="Hapus">' + I('trash', 'sm') + '</button></td>') + '</tr>').join('') + '</tbody></table>' : '<p class="muted">Belum ada pengurus. Tambahkan Ketua, Sekretaris, Bendahara, dan Pembina.</p>';
    };
    const editOf = i => {
      const x = i === undefined ? { jabatan: '', nama: '', nomor_identitas: '', peran_ttd: '', aktif: true } : officers[i];
      A.modal({ title: i === undefined ? 'Tambah pejabat' : 'Ubah pejabat', body: '<div class="fgrid">' + A.field({ id: 'oj', label: 'Jabatan', req: 1, cls: 'w-half', help: 'Mis. Ketua, Sekretaris Jenderal, Pembina', input: '<input class="input" id="oj" value="' + esc(x.jabatan) + '" list="jabs"><datalist id="jabs"><option>Ketua</option><option>Wakil Ketua</option><option>Sekretaris</option><option>Bendahara</option><option>Pembina</option></datalist>' }) + A.field({ id: 'on', label: 'Nama lengkap & gelar', req: 1, cls: 'w-half', input: '<input class="input" id="on" value="' + esc(x.nama) + '">' }) + A.field({ id: 'oi', label: 'NIM / NIP / NIS (opsional)', cls: 'w-half', input: '<input class="input mono" id="oi" value="' + esc(x.nomor_identitas) + '">' }) + A.field({ id: 'op', label: 'Peran tanda tangan', cls: 'w-half', input: '<input class="input" id="op" value="' + esc(x.peran_ttd) + '" placeholder="Penandatangan utama / Mengetahui">' }) + '<label class="switch w-full"><input type="checkbox" id="oa" ' + (x.aktif !== false ? 'checked' : '') + '> Aktif sebagai penandatangan</label></div>',
        foot: '<button class="btn btn-secondary" data-x>Batal</button><button class="btn btn-primary" id="ok">Simpan</button>', onOpen: m => { m.el.querySelector('#ok').onclick = () => {
          const v = { id: x.id, jabatan: m.el.querySelector('#oj').value.trim(), nama: m.el.querySelector('#on').value.trim(), nomor_identitas: m.el.querySelector('#oi').value.trim(), peran_ttd: m.el.querySelector('#op').value.trim(), aktif: m.el.querySelector('#oa').checked };
          if (!v.jabatan || !v.nama) return A.toast('Jabatan dan nama wajib diisi.', 'warn');
          if (i === undefined) officers.push(v); else officers[i] = v;
          dirty = true; m.close(); drawOf(); preview();
        }; } });
    };
    drawOf(); drawLogo(); preview();
    if (!ro) {
      A.$('#addOf', root).onclick = () => editOf();
      A.on(A.$('#ofs', root), 'click', '[data-ed]', (e, b) => editOf(+b.dataset.ed));
      A.on(A.$('#ofs', root), 'click', '[data-up]', (e, b) => { const i = +b.dataset.up; [officers[i - 1], officers[i]] = [officers[i], officers[i - 1]]; dirty = true; drawOf(); preview(); });
      A.on(A.$('#ofs', root), 'click', '[data-rm]', async (e, b) => { if (await A.confirm({ text: 'Hapus ' + officers[+b.dataset.rm].nama + ' dari daftar pengurus?', ok: 'Hapus', danger: true })) { officers.splice(+b.dataset.rm, 1); dirty = true; drawOf(); preview(); } });
      root.addEventListener('input', A.debounce(() => { dirty = true; preview(); }, 250));
      A.$('#batal', root).onclick = () => A.render();
      A.$$('[data-save]', root).forEach(b => b.onclick = async () => {
        A.busy(b, true, 'Menyimpan…');
        const r2 = await A.api('org.save', { org: cur(), officers: officers });
        A.busy(b, false);
        if (!r2.success) return A.toast(r2.message, 'bad');
        dirty = false; A.toast('Profil organisasi disimpan.');
        A.api('boot', {}).then(x => { if (x.success) { A.session.update(x.data); A.shell(A._opt); } });
      });
      A.beforeLeave = async () => !dirty || A.confirm({ title: 'Perubahan belum disimpan', text: 'Tinggalkan halaman tanpa menyimpan perubahan profil?', ok: 'Tinggalkan', danger: true });
    }
    A.$('#pv', root).onclick = () => { const m = A.modal({ title: 'Pratinjau kop surat', size: 'lg', body: '<div class="well" style="display:flex;justify-content:center;padding:16px" id="kp"></div>' }); const c = cur(); A.Doc.mountPreview(A.$('#kp', m.el), { page: { kop: 'first', pnum: 'none' }, fdefs: [], fields: {}, org: M.orgSnapshot(c, officers), blocks: [{ t: 'p', c: [{ x: 'Isi naskah dimulai di sini…', i: 1 }] }] }, { scale: 0.85, maxPages: 1, crop: 380 }); };
  }, { nav: 'profil', crumbs: ['Ruang kerja', 'Profil organisasi'], roles: MEM });

  /* ================= PUSTAKA BERKAS ================= */
  const KAT = [['', 'Semua Berkas'], ['logo', 'Logo'], ['kop', 'Kop Surat'], ['gambar', 'Gambar'], ['lampiran', 'Lampiran'], ['referensi', 'Dokumen Referensi']];
  A.pickUpload = function (o, done) {
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = o.accept || 'image/png,image/jpeg,image/svg+xml,application/pdf,.docx';
    inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      const max = (+(A.session.boot.settings || {}).maks_berkas_mb || 10) * 1048576;
      if (f.size > max * 3) return A.toast('Berkas terlalu besar.', 'bad');
      A.toast('Mengunggah ' + f.name + '…', 'info', { ms: 2500 });
      try {
        const x = await A.readFile(f);
        if (x.size > max) return A.toast('Ukuran berkas melebihi batas ' + (max / 1048576) + ' MB.', 'bad');
        const r = await A.api('file.upload', { nama: x.nama, b64: x.b64, kategori: o.kategori || (/^image/.test(f.type) || x.converted ? 'gambar' : /\.docx$/i.test(f.name) ? 'referensi' : 'lampiran') });
        if (!r.success) return A.toast(r.message, 'bad');
        A.toast(x.converted ? 'SVG dikonversi ke PNG dan diunggah.' : 'Berkas diunggah.'); A.invalidate('dash'); done && done(r.data);
      } catch (e) { A.toast(e.message || 'Gagal membaca berkas.', 'bad'); }
    };
    inp.click();
  };
  A.pickFile = async function (o, done) {
    const m = A.modal({ title: 'Pilih dari Pustaka Berkas', size: 'lg', body: '<div class="row mb16"><div class="search grow">' + I('search', 'sm') + '<input class="input" id="fq" placeholder="Cari berkas…"></div><button class="btn btn-secondary" id="fu">' + I('upload', 'sm') + 'Unggah baru</button></div><div class="grid g4" id="fg">' + A.skel(4, 120) + '</div>' });
    const load = async q => {
      const r = await A.api('file.list', { gambar: !!o.gambar, q: q || '', per: 24 });
      if (!r.success) { A.$('#fg', m.el).innerHTML = A.errorBox(r); return; }
      A.$('#fg', m.el).innerHTML = r.data.items.length ? r.data.items.map(f => '<button class="file-card" data-f="' + esc(f.id) + '" style="cursor:pointer;text-align:left;padding:0"><div class="file-prev" style="aspect-ratio:4/3" data-img="' + (/^image/.test(f.mime) ? esc(f.id) : '') + '">' + (/^image/.test(f.mime) ? '' : '<span class="doc-ic">' + (/pdf/.test(f.mime) ? 'PDF' : 'DOCX') + '</span>') + '</div><div class="file-body"><div class="t ellipsis">' + esc(f.nama) + '</div><div class="m">' + esc(f.kategori) + ' · ' + A.fmtBytes(f.ukuran) + '</div></div></button>').join('') : '<div style="grid-column:1/-1">' + A.empty('images', 'Belum ada berkas', 'Unggah logo atau gambar terlebih dahulu.') + '</div>';
      A.$$('[data-img]', m.el).forEach(async el => { if (el.dataset.img) { const u = await A.fileUrl(el.dataset.img); if (u) el.innerHTML = '<img alt="" src="' + u + '">'; } });
      A.$$('[data-f]', m.el).forEach(b => b.onclick = () => { m.close(); done(r.data.items.find(f => f.id === b.dataset.f)); });
    };
    A.$('#fq', m.el).oninput = A.debounce(e => load(e.target.value), 300);
    A.$('#fu', m.el).onclick = () => A.pickUpload({ kategori: o.gambar ? 'gambar' : '', accept: o.gambar ? 'image/png,image/jpeg,image/svg+xml' : '' }, f => { m.close(); done(f); });
    load('');
  };
  A.route('/berkas', async function (root, p, q) {
    const st = { kategori: q.kat || '', q: '', sort: 'baru', page: 1, view: A.LS.get('fview') || 'grid' };
    root.innerHTML = '<div class="ph"><div><div class="tags"><span class="tag ink">Aset</span><span class="tag">Penyimpanan organisasi</span></div><h1>Pustaka Berkas & Lampiran</h1><p class="sub">Logo, kop surat, gambar kegiatan, dan dokumen referensi organisasi — unggah sekali, pakai berulang di naskah.</p></div><div class="acts"><button class="btn btn-primary" id="up">' + I('upload') + 'Unggah Berkas Baru</button></div></div>' +
      '<section class="card card-pad" id="usage">' + A.skel(2) + '</section><div class="row mt16 wrap" style="gap:12px"><div id="tabs" class="grow" style="min-width:0"></div><div class="search" style="width:240px">' + I('search', 'sm') + '<input class="input" id="q" placeholder="Cari nama berkas…" aria-label="Cari berkas"></div><div class="seg" role="group" aria-label="Tampilan"><button data-v="grid" aria-pressed="' + (st.view === 'grid') + '" aria-label="Kisi">' + I('grid', 'sm') + '</button><button data-v="list" aria-pressed="' + (st.view === 'list') + '" aria-label="Daftar">' + I('list', 'sm') + '</button></div><select class="select" id="sort" style="width:auto" aria-label="Urutkan"><option value="baru">Terbaru diunggah</option><option value="nama">Nama (A–Z)</option><option value="ukuran">Ukuran terbesar</option></select></div><div id="list" class="mt16">' + A.skel(4, 160) + '</div>' +
      '<div class="banner mt24">' + I('shield') + '<div><b>Keamanan berkas.</b> Jenis berkas diperiksa ulang di server (PNG, JPG, PDF, DOCX); SVG diubah menjadi PNG di browser sebelum diunggah. Berkas tidak dibagikan publik dan hanya dapat dibuka anggota organisasi atau penerima naskah yang memuatnya.</div></div>';
    const load = async () => {
      const r = await A.q('file.list', { kategori: st.kategori, q: st.q, sort: st.sort, page: st.page, per: 11 });
      if (!r.success) { A.$('#list', root).innerHTML = A.errorBox(r); return; }
      const d = r.data, u = d.usage, pct = Math.min(100, Math.round(u.used / u.quota * 100)), pk = u.perKategori || {};
      A.$('#usage', root).innerHTML = '<div class="row wrap" style="gap:24px;align-items:center"><div style="min-width:220px"><div class="row between"><span class="eyebrow">Kapasitas organisasi</span><b class="mono">' + pct + '%</b></div><div class="progress soft mt8"><i style="width:' + pct + '%"></i></div><div class="help mt8 mono">' + A.fmtBytes(u.used) + ' / ' + A.fmtBytes(u.quota) + '</div></div><div class="row wrap grow">' +
        Object.keys(pk).map(k => '<span class="tag" style="padding:7px 10px;text-transform:none;letter-spacing:0;font-size:12px"><span class="dot" style="background:' + (k === 'logo' || k === 'kop' ? 'var(--blue)' : k === 'gambar' ? 'var(--ink)' : 'var(--ok)') + '"></span>' + esc((KAT.find(x => x[0] === k) || [k, k])[1]) + ': ' + A.fmtBytes(pk[k].size) + ' (' + pk[k].n + ')</span>').join('') + '</div></div><p class="help mt12">' + I('info', 'sm') + ' Batas unggah per berkas ' + esc((A.session.boot.settings || {}).maks_berkas_mb || 10) + ' MB · format PNG, JPG, SVG, PDF, DOCX.</p>';
      A.$('#tabs', root).innerHTML = '<div class="tabs box">' + KAT.map(k => '<button data-tab="' + k[0] + '" aria-selected="' + (st.kategori === k[0]) + '">' + k[1] + ' <span class="ct">' + (k[0] ? d.counts[k[0]] || 0 : d.counts.semua) + '</span></button>').join('') + '</div>';
      const card = f => '<article class="file-card"><div class="file-prev" data-img="' + (/^image/.test(f.mime) ? esc(f.id) : '') + '"><span class="tag">' + esc(f.kategori) + '</span>' + (/^image/.test(f.mime) ? '<div class="skel" style="width:60%;height:60%"></div>' : '<span class="doc-ic">' + (/pdf/.test(f.mime) ? 'PDF' : 'DOCX') + '</span>') + '<button class="icon-btn" data-more="' + esc(f.id) + '" aria-label="Aksi berkas">' + I('more', 'sm') + '</button></div><div class="file-body"><div class="t ellipsis" title="' + esc(f.nama) + '">' + esc(f.nama) + '</div><div class="m"><span class="code" style="padding:1px 5px">' + esc((f.mime.split('/')[1] || '').replace('vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx').replace('jpeg', 'jpg').toUpperCase()) + '</span>' + A.fmtBytes(f.ukuran) + (f.lebar ? ' · ' + f.lebar + '×' + f.tinggi + 'px' : '') + '</div><div class="help mt8">Oleh ' + esc(f.owner_nama) + ' · ' + esc(A.fmtDate(f.created_at)) + '</div></div><div class="file-foot"><button class="btn btn-secondary btn-sm grow" data-dl="' + esc(f.id) + '">' + I('download', 'sm') + 'Unduh</button></div></article>';
      A.$('#list', root).innerHTML = st.view === 'grid' ? '<div class="grid g4">' + d.items.map(card).join('') + '<button class="drop" id="drop">' + '<span class="em-ic">' + I('cloud-up') + '</span><b>Unggah Berkas Baru</b><span>Tarik berkas ke sini atau <u>pilih berkas</u></span><span class="mono" style="font-size:11px">PNG · JPG · SVG · PDF · DOCX</span></button></div>' + A.pager(d, 'berkas')
        : (d.items.length ? '<section class="card"><table class="tbl cards"><thead><tr><th>Nama</th><th>Kategori</th><th>Ukuran</th><th>Diunggah</th><th></th></tr></thead><tbody>' + d.items.map(f => '<tr><td data-l="Nama"><div class="t-title">' + esc(f.nama) + '</div><div class="t-sub">' + esc(f.owner_nama) + '</div></td><td data-l="Kategori"><span class="tag">' + esc(f.kategori) + '</span></td><td data-l="Ukuran" class="mono">' + A.fmtBytes(f.ukuran) + '</td><td data-l="Diunggah">' + esc(A.fmtDate(f.created_at)) + '</td><td class="t-act"><button class="btn btn-ghost btn-icon btn-sm" data-dl="' + esc(f.id) + '" aria-label="Unduh">' + I('download', 'sm') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-more="' + esc(f.id) + '" aria-label="Aksi">' + I('more', 'sm') + '</button></td></tr>').join('') + '</tbody></table>' + A.pager(d, 'berkas') + '</section>' : A.empty('images', 'Belum ada berkas', 'Unggah logo organisasi terlebih dahulu.', '<button class="btn btn-primary btn-sm" id="drop">Unggah</button>'));
      A.$$('[data-img]', root).forEach(async el => { if (!el.dataset.img) return; const url = await A.fileUrl(el.dataset.img); const sk = el.querySelector('.skel'); if (sk) sk.outerHTML = url ? '<img alt="" src="' + url + '" loading="lazy">' : ''; });
      const drop = A.$('#drop', root);
      if (drop) {
        drop.onclick = () => A.pickUpload({ kategori: st.kategori }, () => load());
        ['dragover', 'dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('over'); }));
        drop.addEventListener('dragleave', () => drop.classList.remove('over'));
        drop.addEventListener('drop', async e => { e.preventDefault(); drop.classList.remove('over'); const f = e.dataTransfer.files[0]; if (!f) return; try { const x = await A.readFile(f); const r2 = await A.api('file.upload', { nama: x.nama, b64: x.b64, kategori: st.kategori || (/^image/.test(f.type) || x.converted ? 'gambar' : 'lampiran') }); if (!r2.success) return A.toast(r2.message, 'bad'); A.toast('Berkas diunggah.'); load(); } catch (er) { A.toast(er.message, 'bad'); } });
      }
      A.$$('[data-dl]', root).forEach(b => b.onclick = async () => { const r2 = await A.api('file.get', { id: b.dataset.dl }); if (r2.success) A.download(r2.data.b64, r2.data.mime, r2.data.nama); else A.toast(r2.message, 'bad'); });
      A.$$('[data-more]', root).forEach(b => b.onclick = e => {
        e.stopPropagation(); const f = d.items.find(x => x.id === b.dataset.more);
        A.menu(b, [
          { label: 'Ganti nama', icon: 'edit', act: async () => { const n = await A.prompt({ title: 'Ganti nama berkas', value: f.nama }); if (n) { const r2 = await A.api('file.rename', { id: f.id, nama: n }); r2.success ? load() : A.toast(r2.message, 'bad'); } } },
          { label: 'Ubah kategori…', icon: 'hash', act: () => A.menu(b, KAT.slice(1).map(k => ({ label: k[1], act: async () => { const r2 = await A.api('file.rename', { id: f.id, nama: f.nama, kategori: k[0] }); r2.success ? load() : A.toast(r2.message, 'bad'); } }))) },
          '-', { label: 'Hapus', icon: 'trash', danger: true, act: async () => { if (await A.confirm({ title: 'Hapus berkas?', text: 'Naskah yang memakai berkas ini akan kehilangan gambarnya. Logo organisasi yang memakai berkas ini akan dilepas.', ok: 'Hapus', danger: true })) { const r2 = await A.api('file.delete', { id: f.id }); r2.success ? (A.toast('Berkas dihapus.'), load()) : A.toast(r2.message, 'bad'); } } }
        ]);
      });
    };
    A.$('#up', root).onclick = () => A.pickUpload({ kategori: st.kategori }, () => load());
    A.on(root, 'click', '[data-tab]', (e, b) => { st.kategori = b.dataset.tab; st.page = 1; load(); });
    A.on(root, 'click', '[data-page]', (e, b) => { st.page = +b.dataset.page; load(); });
    A.on(root, 'click', '[data-v]', (e, b) => { st.view = b.dataset.v; A.LS.set('fview', st.view); A.$$('[data-v]', root).forEach(x => x.setAttribute('aria-pressed', x === b)); load(); });
    A.$('#q', root).oninput = A.debounce(e => { st.q = e.target.value; st.page = 1; load(); }, 300);
    A.$('#sort', root).onchange = e => { st.sort = e.target.value; load(); };
    load();
  }, { nav: 'berkas', crumbs: ['Ruang kerja', 'Pustaka berkas'], roles: MEM });

  /* ================= AKUN SAYA ================= */
  A.route('/akun', async function (root) {
    const me = A.session.me, b = A.session.boot;
    root.innerHTML = '<div class="ph"><div><div class="tags"><span class="tag ink">Akun</span></div><h1>Akun Saya</h1><p class="sub">Data akun dikelola Administrator. Anda dapat mengatur email notifikasi dan mengubah PIN.</p></div></div><div class="grid g2" style="align-items:start"><div class="col" style="gap:20px">' +
      '<section class="card"><div class="card-head"><h3>' + I('user') + 'Identitas</h3><span class="tag blue">' + esc(b.roleLabel) + '</span></div><div class="card-body"><div class="row" style="gap:16px"><div class="avatar" style="width:56px;height:56px;font-size:18px">' + esc(A.initials(me.nama)) + '</div><div><div style="font-weight:700;font-size:17px;color:var(--ink)">' + esc(me.nama) + '</div><div class="mono help">' + esc(me.identity_no) + '</div><div class="help">' + esc(me.jabatan || '') + (b.org ? ' · ' + esc(b.org.nama) : '') + '</div></div></div></div></section>' +
      '<section class="card"><div class="card-head"><h3>' + I('mail') + 'Notifikasi</h3></div><div class="card-body col" style="gap:14px">' + A.field({ id: 'em', label: 'Email (opsional)', help: 'Dipakai untuk pemberitahuan naskah dibagikan & diekspor.', input: '<input class="input" type="email" id="em" value="' + esc(me.email || '') + '" placeholder="nama@contoh.id">' }) + '<label class="switch"><input type="checkbox" id="nt" ' + (me.notif_email ? 'checked' : '') + '> Kirim notifikasi email</label><div><button class="btn btn-secondary" id="svN">Simpan</button></div></div></section></div>' +
      '<div class="col" style="gap:20px"><section class="card"><div class="card-head"><h3>' + I('key') + 'Ubah PIN</h3></div><div class="card-body col" style="gap:14px">' + A.field({ id: 'p0', label: 'PIN lama', input: '<input class="input" type="password" id="p0" autocomplete="current-password">' }) + A.field({ id: 'p1', label: 'PIN baru', help: 'Minimal 6 karakter, bukan angka berurutan/berulang, tidak sama dengan nomor identitas.', input: '<input class="input" type="password" id="p1" autocomplete="new-password">' }) + A.field({ id: 'p2', label: 'Ulangi PIN baru', input: '<input class="input" type="password" id="p2" autocomplete="new-password">' }) + '<div><button class="btn btn-primary" id="svP">Ubah PIN</button></div><p class="help">Setelah PIN diubah, sesi di perangkat lain otomatis berakhir.</p></div></section>' +
      '<section class="card"><div class="card-head"><h3>' + I('shield') + 'Keamanan sesi</h3></div><div class="card-body"><p class="help mb16">Curiga akun dipakai orang lain? Akhiri semua sesi lalu ubah PIN.</p><button class="btn btn-danger" id="all">' + I('power', 'sm') + 'Keluar dari semua perangkat</button></div></section></div></div>';
    A.$('#svN', root).onclick = async e => { A.busy(e.currentTarget, true); const r = await A.api('me.save', { email: A.$('#em', root).value.trim(), notif_email: A.$('#nt', root).checked }); A.busy(e.currentTarget, false); if (!r.success) return A.toast(r.message, 'bad'); b.me = r.data; A.session.update(b); A.toast('Pengaturan disimpan.'); };
    A.$('#svP', root).onclick = async e => { const p1 = A.$('#p1', root).value; if (p1 !== A.$('#p2', root).value) return A.toast('Ulangan PIN baru tidak sama.', 'warn'); A.busy(e.currentTarget, true); const r = await A.api('auth.changePin', { lama: A.$('#p0', root).value, baru: p1 }); A.busy(e.currentTarget, false); if (!r.success) return A.toast(r.message, 'bad'); A.session.set(r.data.token, b); A.$$('input[type=password]', root).forEach(i => { i.value = ''; }); A.toast('PIN berhasil diubah.'); };
    A.$('#all', root).onclick = async () => { if (!(await A.confirm({ title: 'Keluar dari semua perangkat?', text: 'Semua sesi, termasuk sesi ini, akan diakhiri.', ok: 'Keluar semua', danger: true }))) return; await A.api('auth.logoutAll', {}); A.session.clear(); A._shell = null; A.go('#/masuk'); };
  }, { nav: 'akun', crumbs: ['Akun', 'Akun saya'] });

  A.route('/', function () { A.go(A.session.token ? A.home() : '#/masuk'); }, { public: true, shell: false });
})();
