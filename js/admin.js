/* ==========================================================================
 * SIPENA — admin.js : panel administrasi. Dashboard pemantauan, pengguna &
 * kode aktivasi, organisasi & penugasan admin, template (isian, struktur,
 * format, terbit berversi), kategori, log aktivitas, impor akun CSV,
 * pengaturan aplikasi, backup, migrasi data dari aplikasi lama.
 * ========================================================================== */
(function () {
  'use strict';
  const A = window.App, esc = A.esc, I = A.icon, M = window.SipenaModel, S = A.session;
  const ADM = ['superadmin', 'admin'], SA = ['superadmin'];
  const isSA = () => S.role === 'superadmin';
  const orgs = () => (S.boot && S.boot.adminOrgs) || [];
  const orgOpts = (sel, all) => (all ? '<option value="">' + esc(all) + '</option>' : '') + orgs().map(o => '<option value="' + esc(o.id) + '" ' + (o.id === sel ? 'selected' : '') + '>' + esc(o.nama) + (o.singkatan ? ' (' + esc(o.singkatan) + ')' : '') + '</option>').join('');
  const copy = async (txt) => { try { await navigator.clipboard.writeText(txt); A.toast('Disalin ke papan klip.'); } catch (e) { const t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); A.toast('Disalin ke papan klip.'); } catch (x) { A.toast('Salin manual: pilih teks lalu Ctrl+C.', 'warn'); } t.remove(); } };
  const dl = r => { if (!r.success) return A.toast(r.message, 'bad'); A.download(r.data.b64, r.data.mime, r.data.nama); A.toast('Laporan diunduh — ' + r.data.nama); };
  const report = async (btn, kind, format, filters) => { A.busy(btn, true, 'Menyusun…'); const r = await A.api('adm.report', { kind: kind, format: format, filters: filters || {} }, { timeout: 180000 }); A.busy(btn, false); dl(r); };
  const reportMenu = (btn, kind, filters) => A.menu(btn, [{ label: 'Unduh Excel (.xlsx)', icon: 'download', act: () => report(btn, kind, 'xlsx', filters) }, { label: 'Unduh PDF', icon: 'file', act: () => report(btn, kind, 'pdf', filters) }]);

  /* ---------------- laci samping ---------------- */
  A.drawer = function (o) {
    const bd = document.createElement('div'); bd.className = 'drawer-bd';
    const dr = document.createElement('aside'); dr.className = 'drawer'; if (o.width) dr.style.width = 'min(' + o.width + 'px,100vw)'; dr.setAttribute('role', 'dialog'); dr.setAttribute('aria-label', o.title);
    dr.innerHTML = '<div class="modal-head"><div>' + (o.eyebrow ? '<div class="eyebrow">' + esc(o.eyebrow) + '</div>' : '') + '<h2 style="font-size:17px;margin-top:4px">' + esc(o.title) + '</h2></div><button class="icon-btn" data-x aria-label="Tutup">' + I('x') + '</button></div><div class="dr-body" style="flex:1;overflow:auto;padding:18px 20px">' + (o.body || '') + '</div>' + (o.foot ? '<div class="modal-foot">' + o.foot + '</div>' : '');
    const prev = document.activeElement;
    const key = e => { if (e.key === 'Escape') close(); };
    const close = () => { bd.remove(); dr.remove(); document.removeEventListener('keydown', key); if (prev && prev.focus) prev.focus(); if (o.onClose) o.onClose(); };
    bd.onclick = close; A.on(dr, 'click', '[data-x]', close); document.addEventListener('keydown', key);
    document.body.appendChild(bd); document.body.appendChild(dr);
    setTimeout(() => { const f = dr.querySelector('.dr-body input,.dr-body select,.dr-body textarea'); (f || dr.querySelector('[data-x]')).focus(); }, 30);
    A.cleanup.push(() => { if (dr.isConnected) close(); });
    return { el: dr, body: dr.querySelector('.dr-body'), close: close };
  };

  /* ---------------- penanda status ---------------- */
  const UST = { aktif: ['ok', 'check-c', 'Aktif'], belum_aktif: ['warn', 'clock', 'Belum aktivasi'], terkunci: ['bad', 'lock', 'Terkunci'], nonaktif: ['', 'x', 'Nonaktif'] };
  const ustTag = s => { const x = UST[s] || ['', 'info', s]; return '<span class="tag ' + x[0] + '">' + I(x[1], 'sm') + x[2] + '</span>'; };
  const HASIL = { OK: ['ok', 'check-c', 'Berhasil'], GAGAL: ['bad', 'alert', 'Gagal'], DITOLAK: ['bad', 'lock', 'Ditolak'], TERCATAT: ['warn', 'eye', 'Tercatat'] };
  const hasilTag = h => { const x = HASIL[h] || ['', 'info', h || '—']; return '<span class="tag ' + x[0] + '">' + I(x[1], 'sm') + x[2] + '</span>'; };
  const roleTag = (r, label) => '<span class="tag ' + (r === 'superadmin' ? 'ink' : r === 'admin' ? 'blue' : '') + '">' + esc(label || r) + '</span>';

  /* ---------------- kode aktivasi (tampil sekali) ---------------- */
  A.showCode = function (user, ak, title) {
    const app = ((S.boot || {}).settings || {}).nama_aplikasi || 'SIPENA', link = location.origin + location.pathname + '#/aktivasi';
    const pesan = 'Halo ' + user.nama + ',\nakun ' + app + ' Anda sudah disiapkan.\n\n1. Buka: ' + link + '\n2. Nomor identitas: ' + user.identity_no + '\n3. Kode aktivasi: ' + ak.code + '\n\nKode berlaku sampai ' + A.fmtDateTime(ak.expires_at) + ' WIB dan hanya dapat dipakai sekali. Jangan bagikan kode ini kepada orang lain.';
    const m = A.modal({ title: title || 'Kode aktivasi', sticky: true, body: '<div class="banner warn mb16">' + I('alert') + '<div><b>Kode hanya ditampilkan sekali.</b> Salin sekarang — server hanya menyimpan versi tersandi dan tidak dapat menampilkannya lagi.</div></div>' +
      '<div class="lbl mb8">Kode untuk ' + esc(user.nama) + ' · <span class="mono">' + esc(user.identity_no) + '</span></div><div class="code-box" aria-label="Kode aktivasi">' + esc(ak.code) + '</div><p class="help mt8">Berlaku sampai ' + esc(A.fmtDateTime(ak.expires_at)) + ' WIB (' + (ak.hari || 7) + ' hari).</p>' +
      '<div class="field mt16"><label for="akmsg">Pesan siap kirim (WhatsApp/email)</label><textarea class="textarea" rows="8" readonly id="akmsg">' + esc(pesan) + '</textarea></div>',
      foot: '<button class="btn btn-secondary" id="cpk">' + I('copy', 'sm') + 'Salin kode</button><button class="btn btn-secondary" id="cpm">' + I('copy', 'sm') + 'Salin pesan</button><button class="btn btn-primary" data-x>Sudah dicatat</button>' });
    A.$('#cpk', m.el).onclick = () => copy(ak.code);
    A.$('#cpm', m.el).onclick = () => copy(pesan);
  };

  /* ---------------- grafik batang vertikal (satu seri) ---------------- */
  function niceMax(v) { if (v <= 5) return 5; const p = Math.pow(10, Math.floor(Math.log10(v))), f = v / p; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p; }
  const rbar = (x, y, w, h, r) => { r = Math.min(r, w / 2, h); return 'M' + x + ',' + (y + h) + 'V' + (y + r) + 'Q' + x + ',' + y + ' ' + (x + r) + ',' + y + 'H' + (x + w - r) + 'Q' + (x + w) + ',' + y + ' ' + (x + w) + ',' + (y + r) + 'V' + (y + h) + 'Z'; };
  A.vbars = function (rows, unit, title) {
    const W = 680, H = 230, pl = 34, pr = 8, pt = 22, pb = 28, iw = W - pl - pr, ih = H - pt - pb;
    const mx = niceMax(Math.max.apply(null, rows.map(r => r.n).concat([1]))), step = iw / Math.max(1, rows.length), bw = Math.max(8, Math.min(30, step * 0.6));
    const ys = v => pt + ih - v / mx * ih, peak = rows.reduce((b, r, i) => r.n > rows[b].n ? i : b, 0), lastI = rows.length - 1, every = step < 40 ? 2 : 1;
    let g = '<g class="grid">';
    [0, 0.2, 0.4, 0.6, 0.8, 1].forEach(f => { const v = Math.round(mx * f), y = ys(v); g += '<line x1="' + pl + '" x2="' + (W - pr) + '" y1="' + y + '" y2="' + y + '"' + (f === 0 ? ' class="axis"' : '') + '/><text x="' + (pl - 6) + '" y="' + (y + 4) + '" text-anchor="end">' + v + '</text>'; });
    g += '</g>';
    rows.forEach((r, i) => {
      const cx = pl + step * i + step / 2, x = cx - bw / 2, y = ys(r.n), h = pt + ih - y;
      g += '<g class="m"><rect class="hit" x="' + (pl + step * i) + '" y="' + pt + '" width="' + step + '" height="' + ih + '" data-i="' + i + '" tabindex="0" role="img" aria-label="' + esc(r.label + ': ' + r.n + ' ' + unit) + '"></rect>' + (r.n ? '<path class="bar" d="' + rbar(x, y, bw, h, 4) + '"></path>' : '') + '</g>';
      if (r.n && (i === peak || i === lastI)) g += '<text class="val" x="' + cx + '" y="' + (y - 6) + '" text-anchor="middle">' + r.n + '</text>';
      if (i % every === 0 || i === lastI) g += '<text x="' + cx + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(r.label) + '</text>';
    });
    return '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="group" aria-label="' + esc(title) + '">' + g + '</svg>' +
      '<details class="mt8"><summary class="help" style="cursor:pointer">Lihat sebagai tabel</summary><table class="tbl compact mt8"><thead><tr><th>Periode</th><th class="num">' + esc(unit) + '</th></tr></thead><tbody>' + rows.map(r => '<tr><td>' + esc(r.label) + '</td><td class="num">' + r.n + '</td></tr>').join('') + '</tbody></table></details>';
  };
  function bindTip(box, rows, unit) {
    const show = (e, el) => { const r = rows[+el.dataset.i]; if (!r) return; const ev = e.clientX ? e : (() => { const b = el.getBoundingClientRect(); return { clientX: b.left + b.width / 2, clientY: b.top + 30 }; })(); A.tip(ev, '<b>' + esc(r.label) + '</b><br>' + r.n + ' ' + esc(unit)); };
    A.on(box, 'mousemove', '.hit', show);
    A.on(box, 'focusin', '.hit', show);
    box.addEventListener('mouseleave', () => A.tip(null));
    box.addEventListener('focusout', () => A.tip(null));
  }

  /* ======================= DASHBOARD ADMIN ======================= */
  A.route('/admin', async function (root, p, q) {
    const st = { org_id: q.org || '', gran: q.g === 'minggu' ? 'minggu' : 'hari', to: q.to || '' };
    const multi = orgs().length > 1 || isSA();
    root.innerHTML = '<div class="ph"><div><div class="tags"><span class="tag ink">Pemantauan</span><span class="tag" id="cak">' + I('clock', 'sm') + 'Memuat…</span></div><h1>Dashboard Admin</h1><p class="sub">Ringkasan pemakaian aplikasi: pengguna, naskah yang dibuat, template yang dipakai, dan aktivitas terbaru' + (isSA() ? ' di seluruh organisasi' : ' di organisasi yang Anda kelola') + '.</p></div>' +
      '<div class="acts"><button class="btn btn-secondary" id="fr">' + I('refresh', 'sm') + 'Segarkan</button><button class="btn btn-primary" id="ex">' + I('download', 'sm') + 'Ekspor Laporan ' + I('chev-d', 'sm') + '</button></div></div>' +
      '<section class="card"><div class="toolbar">' + (multi ? '<select class="select" id="org" aria-label="Organisasi">' + orgOpts(st.org_id, isSA() ? 'Semua organisasi' : 'Semua organisasi kelolaan') + '</select>' : '') +
      '<div class="seg" role="group" aria-label="Rentang"><button data-g="hari" aria-pressed="' + (st.gran === 'hari') + '">14 hari</button><button data-g="minggu" aria-pressed="' + (st.gran === 'minggu') + '">8 minggu</button></div>' +
      '<label class="row" style="gap:8px;font-size:13px;color:var(--muted)">Sampai <input class="input" type="date" id="to" value="' + esc(st.to) + '" style="width:auto"></label><span class="grow"></span><span class="help" id="scope"></span></div></section>' +
      '<div class="grid g4 mt16" id="stats">' + A.skel(1, 128).repeat(4) + '</div>' +
      '<div class="grid mt16" style="grid-template-columns:minmax(0,2fr) minmax(0,1fr);gap:16px" id="row2"><section class="card"><div class="card-head"><h3>' + I('chart') + 'Naskah dibuat per periode</h3><span class="eyebrow" id="tlx"></span></div><div class="card-body" id="tl">' + A.skel(6) + '</div></section>' +
      '<section class="card"><div class="card-head"><h3>' + I('layers') + 'Status naskah</h3></div><div class="card-body" id="sts">' + A.skel(4) + '</div></section></div>' +
      '<div class="grid g2 mt16"><section class="card"><div class="card-head"><h3>' + I('hash') + 'Naskah per kategori</h3></div><div class="card-body" id="kat">' + A.skel(4) + '</div></section>' +
      '<section class="card"><div class="card-head"><h3>' + I('layout') + 'Template paling sering dipakai</h3></div><div class="card-body" id="tpl">' + A.skel(4) + '</div></section></div>' +
      '<section class="card mt16"><div class="card-head"><h3>' + I('activity') + 'Aktivitas terbaru</h3><a class="btn btn-ghost btn-sm" href="#/admin/log">Lihat semua log ' + I('arrow-r', 'sm') + '</a></div><div class="tbl-wrap" id="act">' + A.skel(5) + '</div></section>';
    const sync = () => A.setQuery({ org: st.org_id, g: st.gran === 'minggu' ? 'minggu' : '', to: st.to });
    const load = async fresh => {
      const data = { org_id: st.org_id, gran: st.gran, to: st.to }; if (fresh) data._fresh = true;
      const r = await A.q('adm.dash', data);
      if (!r.success) { A.$('#stats', root).innerHTML = '<div style="grid-column:1/-1">' + A.errorBox(r) + '</div>'; return; }
      const d = r.data, unit = 'naskah', delta = d.periodeIni - d.periodeLalu;
      A.$('#cak', root).innerHTML = I(r.cached ? 'database' : 'cloud-ok', 'sm') + (r.cached ? 'Data cache server' : 'Data terbaru') + ' · ' + A.fmtTime(new Date().toISOString());
      A.$('#scope', root).textContent = 'Cakupan: ' + d.organisasi;
      const pctAktif = d.pengguna ? Math.round(d.aktif / d.pengguna * 100) : 0;
      A.$('#stats', root).innerHTML =
        '<div class="stat"><div class="hd"><span class="eyebrow">Total pengguna</span>' + I('users') + '</div><div class="val"><b>' + A.fmtNum(d.pengguna) + '</b><span>akun</span></div><div class="ft"><span>Baru bulan ini</span><span class="mono">+' + d.penggunaBaru + '</span></div></div>' +
        '<div class="stat"><div class="hd"><span class="eyebrow">Pengguna aktif</span>' + I('activity') + '</div><div class="val"><b>' + A.fmtNum(d.aktif) + '</b><span>' + pctAktif + '% dari akun</span></div><div class="ft"><span>Masuk dalam ' + d.hariAktif + ' hari terakhir</span></div></div>' +
        '<div class="stat"><div class="hd"><span class="eyebrow">Total naskah</span>' + I('file') + '</div><div class="val"><b>' + A.fmtNum(d.dokumen) + '</b><span>naskah</span></div><div class="ft"><span>Tidak termasuk sampah</span></div></div>' +
        '<div class="stat"><div class="hd"><span class="eyebrow">Dibuat ' + (d.gran === 'minggu' ? '8 minggu' : '14 hari') + ' terakhir</span>' + I('file-plus') + '</div><div class="val"><b>' + A.fmtNum(d.periodeIni) + '</b><span>naskah</span></div><div class="ft"><span>vs periode sebelumnya (' + d.periodeLalu + ')</span><span class="' + (delta > 0 ? 'up' : delta < 0 ? 'down' : '') + '">' + (delta > 0 ? '▲ naik ' + delta : delta < 0 ? '▼ turun ' + Math.abs(delta) : '= sama') + '</span></div></div>';
      A.$('#tlx', root).textContent = d.gran === 'minggu' ? 'Per minggu' : 'Per hari';
      A.$('#tl', root).innerHTML = d.timeline.some(x => x.n) ? A.vbars(d.timeline, unit, 'Jumlah naskah dibuat per ' + (d.gran === 'minggu' ? 'minggu' : 'hari')) : A.empty('chart', 'Belum ada naskah pada periode ini', 'Grafik terisi otomatis saat pengguna membuat naskah.');
      bindTip(A.$('#tl', root), d.timeline, unit);
      const ps = d.perStatus, tot = (ps.draft + ps.penyuntingan + ps.selesai) || 1;
      A.$('#sts', root).innerHTML = '<div class="col" style="gap:14px">' + [['draft', ps.draft], ['penyuntingan', ps.penyuntingan], ['selesai', ps.selesai]].map(x => '<div><div class="row between mb8">' + A.statusTag(x[0]) + '<span class="mono" style="font-weight:600">' + x[1] + ' <span class="muted" style="font-weight:400">· ' + Math.round(x[1] / tot * 100) + '%</span></span></div><div class="progress"><i style="width:' + (x[1] / tot * 100) + '%"></i></div></div>').join('') + '</div>' +
        '<p class="help mt16">Status diatur oleh penyusun naskah: Draft → Proses Penyuntingan → Selesai.</p>';
      A.$('#kat', root).innerHTML = d.perKategori.length ? A.hbars(d.perKategori, unit) : '<p class="muted">Belum ada data.</p>';
      A.$('#tpl', root).innerHTML = (d.perTemplate.length ? A.hbars(d.perTemplate, unit) : '<p class="muted">Belum ada data.</p>') +
        (d.templateTakTerpakai.length ? '<div class="well mt16"><div class="lbl mb8">' + I('info', 'sm') + ' Template aktif yang belum pernah dipakai</div><div class="row wrap" style="gap:6px">' + d.templateTakTerpakai.map(t => '<span class="tag">' + esc(t) + '</span>').join('') + '</div><p class="help mt8">Pertimbangkan memperbarui atau menonaktifkannya agar daftar template tetap ringkas.</p></div>' : '');
      A.$('#act', root).innerHTML = d.aktivitas.length ? '<table class="tbl cards"><thead><tr><th>Waktu</th><th>Pengguna</th><th>Aktivitas</th><th>Objek</th><th>Hasil</th></tr></thead><tbody>' + d.aktivitas.map(a => '<tr><td data-l="Waktu" class="mono" style="white-space:nowrap;font-size:12.5px">' + esc(A.fmtDateTime(a.waktu)) + '</td><td data-l="Pengguna"><div class="t-title">' + esc(a.user_nama) + '</div>' + (a.org ? '<div class="t-sub">' + esc(a.org) + '</div>' : '') + '</td><td data-l="Aktivitas">' + esc(A.aksiLabel(a.aksi)) + (a.ringkasan ? '<div class="t-sub">' + esc(a.ringkasan) + '</div>' : '') + '</td><td data-l="Objek" class="mono" style="font-size:12.5px">' + esc(a.objek || '—') + '</td><td data-l="Hasil">' + hasilTag(a.hasil) + '</td></tr>').join('') + '</tbody></table>' : '<div class="card-body"><p class="muted">Belum ada aktivitas.</p></div>';
    };
    if (A.$('#org', root)) A.$('#org', root).onchange = e => { st.org_id = e.target.value; sync(); load(); };
    A.on(root, 'click', '[data-g]', (e, b) => { st.gran = b.dataset.g; A.$$('[data-g]', root).forEach(x => x.setAttribute('aria-pressed', x === b)); sync(); load(); });
    A.$('#to', root).onchange = e => { st.to = e.target.value; sync(); load(); };
    A.$('#fr', root).onclick = async e => { A.busy(e.currentTarget, true, 'Menyegarkan…'); await load(true); A.busy(e.currentTarget, false); };
    A.$('#ex', root).onclick = e => A.menu(e.currentTarget, [
      { label: 'Daftar pengguna — Excel', icon: 'users', act: () => report(e.target.closest('button'), 'users', 'xlsx', { org_id: st.org_id }) },
      { label: 'Daftar pengguna — PDF', icon: 'users', act: () => report(e.target.closest('button'), 'users', 'pdf', { org_id: st.org_id }) }, '-',
      { label: 'Rekap naskah — Excel', icon: 'file', act: () => report(e.target.closest('button'), 'docs', 'xlsx', { org_id: st.org_id }) },
      { label: 'Rekap naskah — PDF', icon: 'file', act: () => report(e.target.closest('button'), 'docs', 'pdf', { org_id: st.org_id }) }, '-',
      { label: 'Log aktivitas — Excel', icon: 'activity', act: () => report(e.target.closest('button'), 'logs', 'xlsx', { org_id: st.org_id }) },
      { label: 'Log aktivitas — PDF', icon: 'activity', act: () => report(e.target.closest('button'), 'logs', 'pdf', { org_id: st.org_id }) }
    ]);
    load();
  }, { nav: 'admin', roles: ADM, crumbs: ['Administrasi', 'Dashboard'] });

  /* ======================= PENGGUNA ======================= */
  function userForm(u, done) {
    u = u || { role: 'user', org_id: (S.boot.org || {}).id || (orgs()[0] || {}).id };
    const roles = [['user', 'Pengguna — menyusun naskah'], ['viewer', 'Viewer — hanya melihat naskah yang dibagikan']].concat(isSA() ? [['admin', 'Administrator — mengelola organisasi'], ['superadmin', 'Super Admin — seluruh sistem']] : []);
    const m = A.modal({ title: u.id ? 'Ubah data pengguna' : 'Tambah pengguna', size: 'lg', body:
      '<div class="fgrid">' + A.field({ id: 'un', label: 'Nama lengkap', req: 1, cls: 'w-half', input: '<input class="input" id="un" value="' + esc(u.nama) + '" maxlength="120" autocomplete="off">' }) +
      A.field({ id: 'ui', label: 'Nomor identitas (NIM/NIP/NISN)', req: 1, cls: 'w-half', help: 'Dipakai sebagai nama pengguna saat masuk. Angka 0 di depan tetap disimpan.', input: '<input class="input mono" id="ui" value="' + esc(u.identity_no) + '" maxlength="40" autocomplete="off" inputmode="text">' }) +
      A.field({ id: 'ue', label: 'Email (opsional)', cls: 'w-half', help: 'Untuk notifikasi berbagi & komentar.', input: '<input class="input" type="email" id="ue" value="' + esc(u.email) + '" maxlength="120">' }) +
      A.field({ id: 'uj', label: 'Jabatan (opsional)', cls: 'w-half', input: '<input class="input" id="uj" value="' + esc(u.jabatan) + '" maxlength="80" placeholder="mis. Sekretaris Umum">' }) +
      A.field({ id: 'ur', label: 'Peran', req: 1, cls: 'w-half', input: '<select class="select" id="ur" ' + (u.id && u.id === S.me.id ? 'disabled' : '') + '>' + roles.map(r => '<option value="' + r[0] + '" ' + (u.role === r[0] ? 'selected' : '') + '>' + esc(r[1]) + '</option>').join('') + (roles.some(r => r[0] === u.role) ? '' : '<option selected value="' + esc(u.role) + '">' + esc(u.role) + '</option>') + '</select>' }) +
      A.field({ id: 'uo', label: 'Organisasi', req: 1, cls: 'w-half', input: '<select class="select" id="uo">' + orgOpts(u.org_id) + '</select>' }) + '</div>' +
      '<label class="switch mt16" id="ubp"><input type="checkbox" id="ub" ' + (u.boleh_profil ? 'checked' : '') + '> Izinkan mengubah Profil Organisasi (kop, logo, pengurus)</label>' +
      (u.id ? '' : '<div class="banner mt16">' + I('key') + '<div>Setelah disimpan, sistem menerbitkan <b>kode aktivasi sekali pakai</b>. Serahkan kode kepada pengguna — ia membuat PIN sendiri saat aktivasi. Administrator tidak pernah mengetahui PIN pengguna.</div></div>'),
      foot: '<button class="btn btn-secondary" data-x>Batal</button><button class="btn btn-primary" id="us">' + I('save', 'sm') + (u.id ? 'Simpan perubahan' : 'Buat akun & kode aktivasi') + '</button>' });
    const sync = () => { const r = A.$('#ur', m.el).value; A.$('#uo', m.el).closest('.field').style.display = r === 'superadmin' ? 'none' : ''; A.$('#ubp', m.el).style.display = r === 'user' ? '' : 'none'; };
    A.$('#ur', m.el).onchange = sync; sync();
    A.$('#us', m.el).onclick = async e => {
      const v = id => A.$('#' + id, m.el).value.trim();
      const user = { id: u.id, nama: v('un'), identity_no: v('ui'), email: v('ue'), jabatan: v('uj'), role: A.$('#ur', m.el).value, org_id: v('uo'), boleh_profil: A.$('#ub', m.el).checked };
      if (!user.nama || !user.identity_no) return A.toast('Nama dan nomor identitas wajib diisi.', 'warn');
      A.busy(e.currentTarget, true, 'Menyimpan…');
      const r = await A.api('adm.user.save', { user: user });
      A.busy(e.currentTarget, false);
      if (!r.success) return A.toast(r.message, 'bad');
      m.close(); A.toast(r.message);
      if (r.data.aktivasi) A.showCode(r.data.user, r.data.aktivasi, 'Akun dibuat — kode aktivasi');
      done && done(r.data.user);
    };
  }
  A.route('/admin/pengguna', async function (root, p, q) {
    const st = { q: q.q || '', role: q.role || '', org_id: q.org || '', status: q.st || '', page: +q.page || 1 };
    root.innerHTML = '<div class="ph"><div><div class="tags"><span class="tag ink">Akun</span><span class="tag">Pendaftaran tertutup</span></div><h1>Manajemen Pengguna</h1><p class="sub">Buat akun, terbitkan kode aktivasi, reset PIN, dan atur peran. Pengguna tidak dapat mendaftar sendiri.</p></div>' +
      '<div class="acts"><a class="btn btn-secondary" href="#/admin/impor-akun">' + I('import', 'sm') + 'Impor CSV</a><button class="btn btn-secondary" id="ex">' + I('download', 'sm') + 'Ekspor</button><button class="btn btn-primary" id="add">' + I('plus', 'sm') + 'Tambah Pengguna</button></div></div>' +
      '<section class="card"><div id="tabs" style="padding:0 16px"></div><div class="toolbar"><div class="search">' + I('search', 'sm') + '<input class="input" id="q" placeholder="Cari nama, nomor identitas, email…" value="' + esc(st.q) + '" aria-label="Cari pengguna"></div>' +
      '<select class="select" id="role" aria-label="Peran"><option value="">Semua peran</option><option value="user">Pengguna</option><option value="viewer">Viewer</option><option value="admin">Administrator</option>' + (isSA() ? '<option value="superadmin">Super Admin</option>' : '') + '</select>' +
      (orgs().length > 1 ? '<select class="select" id="org" aria-label="Organisasi">' + orgOpts(st.org_id, 'Semua organisasi') + '</select>' : '') + '</div><div class="tbl-wrap" id="list">' + A.skel(6, 36) + '</div><div id="pg"></div></section>';
    A.$('#role', root).value = st.role;
    const sync = () => A.setQuery({ q: st.q, role: st.role, org: st.org_id, st: st.status, page: st.page > 1 ? st.page : '' });
    let items = [];
    const load = async () => {
      const r = await A.q('adm.users', { q: st.q, role: st.role, org_id: st.org_id, status: st.status, page: st.page, per: 12 });
      if (!r.success) { A.$('#list', root).innerHTML = A.errorBox(r); return; }
      const d = r.data, c = d.counts; items = d.items;
      A.$('#tabs', root).innerHTML = A.tabs([['', 'Semua', c.semua], ['aktif', 'Aktif', c.aktif || 0], ['belum_aktif', 'Belum aktivasi', c.belum_aktif || 0], ['terkunci', 'Terkunci', c.terkunci || 0], ['nonaktif', 'Nonaktif', c.nonaktif || 0]], st.status);
      A.$('#list', root).innerHTML = items.length ? '<table class="tbl cards"><thead><tr><th>Pengguna</th><th>Peran</th><th>Organisasi</th><th>Status</th><th>Terakhir masuk</th><th class="t-act"><span class="sr-only">Aksi</span></th></tr></thead><tbody>' + items.map(u =>
        '<tr><td data-l="Pengguna"><div class="row" style="gap:10px;flex-wrap:nowrap"><span class="avatar sm soft">' + esc(A.initials(u.nama)) + '</span><div style="min-width:0"><div class="t-title">' + esc(u.nama) + (u.id === S.me.id ? ' <span class="tag">Anda</span>' : '') + '</div><div class="t-sub mono">' + esc(u.identity_no) + (u.email ? ' · ' + esc(u.email) : '') + '</div></div></div></td>' +
        '<td data-l="Peran">' + roleTag(u.role, u.roleLabel) + (u.jabatan ? '<div class="t-sub">' + esc(u.jabatan) + '</div>' : '') + '</td><td data-l="Organisasi">' + esc(u.org_singkatan || u.org_nama) + '</td><td data-l="Status">' + ustTag(u.status) + '</td>' +
        '<td data-l="Terakhir masuk" class="mono" style="font-size:12.5px">' + (u.last_login ? esc(A.fmtRel(u.last_login)) : '<span class="muted">Belum pernah</span>') + '</td><td class="t-act">' + (u.canManage ? '<button class="btn btn-ghost btn-icon btn-sm" data-act="' + esc(u.id) + '" aria-label="Aksi untuk ' + esc(u.nama) + '">' + I('more') + '</button>' : '') + '</td></tr>').join('') + '</tbody></table>'
        : A.empty('users', 'Tidak ada pengguna', st.q || st.role || st.status ? 'Ubah filter pencarian.' : 'Tambahkan pengguna pertama organisasi Anda.');
      A.$('#pg', root).innerHTML = A.pager(d, 'pengguna');
    };
    const act = async (u, a, label, danger, conf) => {
      if (conf && !(await A.confirm({ title: label + '?', text: conf, ok: label, danger: danger }))) return;
      const r = await A.api('adm.user.action', { id: u.id, act: a });
      if (!r.success) return A.toast(r.message, 'bad');
      A.toast(r.message);
      if (r.data.aktivasi) A.showCode(r.data.user, r.data.aktivasi, a === 'reset' ? 'PIN direset — kode aktivasi baru' : 'Kode aktivasi baru');
      load();
    };
    A.on(root, 'click', '[data-act]', (e, b) => {
      const u = items.find(x => x.id === b.dataset.act); if (!u) return;
      A.menu(b, [
        { label: 'Ubah data', icon: 'edit', act: () => userForm(Object.assign({}, u), load) },
        u.status === 'belum_aktif' ? { label: 'Terbitkan kode aktivasi baru', icon: 'key', act: () => act(u, 'kode', 'Terbitkan kode', false, 'Kode aktivasi lama milik ' + u.nama + ' tidak berlaku lagi.') } : { label: 'Reset PIN', icon: 'key', act: () => act(u, 'reset', 'Reset PIN', true, 'PIN ' + u.nama + ' dihapus, semua sesinya diakhiri, dan kode aktivasi baru diterbitkan. Pengguna membuat PIN baru saat aktivasi.') },
        u.status === 'terkunci' ? { label: 'Buka kunci akun', icon: 'unlock', act: () => act(u, 'buka_kunci', 'Buka kunci') } : null,
        { label: 'Akhiri semua sesi', icon: 'logout', act: () => act(u, 'cabut_sesi', 'Akhiri sesi', false, u.nama + ' harus masuk kembali di semua perangkat.') },
        '-',
        u.status === 'nonaktif' ? { label: 'Aktifkan kembali', icon: 'check-c', act: () => act(u, 'aktifkan', 'Aktifkan') } : { label: 'Nonaktifkan akun', icon: 'x', danger: true, act: () => act(u, 'nonaktif', 'Nonaktifkan', true, u.nama + ' tidak dapat masuk sampai diaktifkan kembali. Naskah miliknya tetap tersimpan.') },
        isSA() ? { label: 'Hapus akun', icon: 'trash', danger: true, act: () => act(u, 'hapus', 'Hapus akun', true, 'Akun ' + u.nama + ' dihapus permanen dari daftar. Naskah miliknya tetap tersimpan.') } : null
      ].filter(Boolean));
    });
    A.on(root, 'click', '[data-tab]', (e, b) => { st.status = b.dataset.tab; st.page = 1; sync(); load(); });
    A.on(root, 'click', '[data-page]', (e, b) => { st.page = +b.dataset.page; sync(); load(); });
    A.$('#q', root).oninput = A.debounce(e => { st.q = e.target.value.trim(); st.page = 1; sync(); load(); }, 350);
    A.$('#role', root).onchange = e => { st.role = e.target.value; st.page = 1; sync(); load(); };
    if (A.$('#org', root)) A.$('#org', root).onchange = e => { st.org_id = e.target.value; st.page = 1; sync(); load(); };
    A.$('#add', root).onclick = () => userForm(null, () => { st.status = ''; load(); });
    A.$('#ex', root).onclick = e => reportMenu(e.currentTarget, 'users', { role: st.role, org_id: st.org_id, status: st.status === 'terkunci' ? '' : st.status });
    load();
  }, { nav: 'adm-pengguna', roles: ADM, crumbs: ['Administrasi', 'Pengguna'] });

  /* ======================= ORGANISASI ======================= */
  A.route('/admin/organisasi', async function (root) {
    root.innerHTML = '<div class="ph"><div><div class="tags"><span class="tag ink">Isolasi data</span><span class="tag">Per organisasi</span></div><h1>Organisasi</h1><p class="sub">Setiap organisasi memiliki naskah, berkas, dan pengguna sendiri yang terpisah. ' + (isSA() ? 'Tetapkan Administrator tambahan untuk organisasi tertentu.' : 'Anda mengelola organisasi berikut.') + '</p></div><div class="acts">' + (isSA() ? '<button class="btn btn-primary" id="add">' + I('plus', 'sm') + 'Tambah Organisasi</button>' : '') + '</div></div>' +
      '<section class="card"><div class="toolbar"><div class="search">' + I('search', 'sm') + '<input class="input" id="q" placeholder="Cari nama atau singkatan…" aria-label="Cari organisasi"></div></div><div class="tbl-wrap" id="list">' + A.skel(5, 40) + '</div></section>';
    let data = { items: [], admins: [] }, q = '';
    const load = async () => {
      const r = await A.api('adm.orgs', {});
      if (!r.success) { A.$('#list', root).innerHTML = A.errorBox(r); return; }
      data = r.data; draw();
    };
    const draw = () => {
      const list = data.items.filter(o => !q || (o.nama + ' ' + o.singkatan).toLowerCase().indexOf(q) > -1);
      A.$('#list', root).innerHTML = list.length ? '<table class="tbl cards"><thead><tr><th>Organisasi</th><th class="num">Pengguna</th><th class="num">Naskah</th><th>Penyimpanan</th><th>Administrator</th><th>Status</th><th class="t-act"></th></tr></thead><tbody>' + list.map(o => {
        const pct = o.usage ? Math.min(100, Math.round(o.usage.used / o.usage.quota * 100)) : 0;
        return '<tr><td data-l="Organisasi"><div class="t-title">' + esc(o.nama) + '</div><div class="t-sub">' + esc([o.singkatan, o.jenis].filter(Boolean).join(' · ') || '—') + '</div></td><td data-l="Pengguna" class="num mono">' + o.jumlah_pengguna + '</td><td data-l="Naskah" class="num mono">' + o.jumlah_dokumen + '</td>' +
          '<td data-l="Penyimpanan" style="min-width:150px"><div class="progress' + (pct >= 90 ? ' bad' : '') + '"><i style="width:' + pct + '%"></i></div><div class="t-sub mono">' + (o.usage ? A.fmtBytes(o.usage.used) + ' / ' + A.fmtBytes(o.usage.quota) + ' · ' + pct + '%' : '—') + '</div></td>' +
          '<td data-l="Administrator">' + (o.admins.length ? o.admins.map(a => '<div style="font-size:13.5px">' + esc(a.nama) + (a.utama ? '' : ' <span class="tag" style="font-size:10px;padding:2px 5px">tambahan</span>') + '</div>').join('') : '<span class="muted">Belum ada</span>') + '</td>' +
          '<td data-l="Status">' + (o.status === 'nonaktif' ? '<span class="tag">' + I('x', 'sm') + 'Nonaktif</span>' : '<span class="tag ok">' + I('check-c', 'sm') + 'Aktif</span>') + '</td><td class="t-act"><button class="btn btn-ghost btn-icon btn-sm" data-o="' + esc(o.id) + '" aria-label="Aksi untuk ' + esc(o.nama) + '">' + I('more') + '</button></td></tr>';
      }).join('') + '</tbody></table>' : A.empty('building', 'Tidak ada organisasi', '');
    };
    const form = o => {
      o = o || { status: 'aktif', kuota_mb: 100 };
      const extra = data.admins.filter(a => a.org_id !== o.id), cur = o.id ? (data.items.find(x => x.id === o.id) || {}).admins || [] : [];
      const dr = A.drawer({ title: o.id ? 'Ubah organisasi' : 'Tambah organisasi', eyebrow: 'Organisasi', width: 520, body:
        '<div class="col" style="gap:16px">' + A.field({ id: 'on', label: 'Nama organisasi', req: 1, input: '<input class="input" id="on" value="' + esc(o.nama) + '" maxlength="160">' }) +
        '<div class="grid g2" style="gap:12px">' + A.field({ id: 'os', label: 'Singkatan', input: '<input class="input" id="os" value="' + esc(o.singkatan) + '" maxlength="40">' }) + A.field({ id: 'oj', label: 'Jenis', input: '<input class="input" id="oj" value="' + esc(o.jenis) + '" maxlength="60" placeholder="mis. Himpunan Mahasiswa">' }) + '</div>' +
        (isSA() ? '<div class="grid g2" style="gap:12px">' + A.field({ id: 'ok', label: 'Kuota penyimpanan (MB)', input: '<input class="input mono" type="number" min="10" max="5000" id="ok" value="' + esc(o.kuota_mb || 100) + '">' }) + A.field({ id: 'ost', label: 'Status', input: '<select class="select" id="ost"><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></select>' }) + '</div>' : '') +
        (isSA() && o.id ? '<div><div class="lbl mb8">Administrator tambahan</div><p class="help mb8">Administrator dari organisasi lain yang juga boleh mengelola organisasi ini.</p>' + (extra.length ? extra.map(a => '<label class="check" style="display:flex;margin:6px 0"><input type="checkbox" data-adm="' + esc(a.id) + '" ' + (cur.some(c => c.id === a.id) ? 'checked' : '') + '> ' + esc(a.nama) + '</label>').join('') : '<p class="muted">Belum ada akun Administrator lain.</p>') + '</div>' : '') +
        (o.id ? '<a class="btn btn-secondary" href="#/profil?org=' + esc(o.id) + '">' + I('building', 'sm') + 'Kelola profil, logo & pengurus</a>' : '<div class="banner">' + I('info') + '<div>Folder Drive organisasi dibuat otomatis saat pertama kali dipakai. Lengkapi profil (alamat, logo, pengurus) setelah disimpan.</div></div>') + '</div>',
        foot: '<button class="btn btn-secondary" data-x>Batal</button><button class="btn btn-primary" id="os2">' + I('save', 'sm') + 'Simpan</button>' });
      if (A.$('#ost', dr.el)) A.$('#ost', dr.el).value = o.status || 'aktif';
      A.$('#os2', dr.el).onclick = async e => {
        const v = id => (A.$('#' + id, dr.el) || {}).value;
        A.busy(e.currentTarget, true, 'Menyimpan…');
        const r = await A.api('adm.org.save', { org: { id: o.id, nama: v('on'), singkatan: v('os'), jenis: v('oj'), kuota_mb: v('ok'), status: v('ost') } });
        if (r.success && isSA() && o.id && A.$('[data-adm]', dr.el)) {
          const ids = A.$$('[data-adm]', dr.el).filter(x => x.checked).map(x => x.dataset.adm);
          const r2 = await A.api('adm.org.scope', { org_id: o.id, admin_ids: ids });
          if (!r2.success) A.toast(r2.message, 'bad');
        }
        A.busy(e.currentTarget, false);
        if (!r.success) return A.toast(r.message, 'bad');
        A.toast(r.message); dr.close(); load();
        A.api('boot', {}).then(b => { if (b.success) S.update(b.data); });
      };
    };
    A.$('#q', root).oninput = e => { q = e.target.value.toLowerCase().trim(); draw(); };
    if (A.$('#add', root)) A.$('#add', root).onclick = () => form(null);
    A.on(root, 'click', '[data-o]', (e, b) => {
      const o = data.items.find(x => x.id === b.dataset.o); if (!o) return;
      A.menu(b, [{ label: 'Ubah data organisasi', icon: 'edit', act: () => form(o) }, { label: 'Kelola profil, logo & pengurus', icon: 'building', act: () => A.go('#/profil?org=' + o.id) }, { label: 'Lihat pengguna', icon: 'users', act: () => A.go('#/admin/pengguna?org=' + o.id) }, { label: 'Lihat statistik', icon: 'chart', act: () => A.go('#/admin?org=' + o.id) }]);
    });
    load();
  }, { nav: 'adm-org', roles: ADM, crumbs: ['Administrasi', 'Organisasi'] });

  /* ======================= TEMPLATE: DAFTAR ======================= */
  const TSTAT = { aktif: ['ok', 'check-c', 'Aktif'], nonaktif: ['', 'x', 'Nonaktif'], draf: ['warn', 'edit', 'Draf — belum terbit'] };
  const tstTag = s => { const x = TSTAT[s] || ['', 'info', s]; return '<span class="tag ' + x[0] + '">' + I(x[1], 'sm') + x[2] + '</span>'; };
  A.route('/admin/template', async function (root) {
    root.innerHTML = '<div class="ph"><div><div class="tags"><span class="tag ink">Template</span><span class="tag">Berversi</span></div><h1>Template Naskah</h1><p class="sub">Atur isian formulir, struktur bab, teks baku, dan format halaman. Perubahan disimpan sebagai draf dan baru berlaku setelah diterbitkan — naskah lama tetap memakai versinya.</p></div><div class="acts"><button class="btn btn-primary" id="add">' + I('plus', 'sm') + 'Template Baru</button></div></div>' +
      '<section class="card"><div class="toolbar"><div class="search">' + I('search', 'sm') + '<input class="input" id="q" placeholder="Cari template…" aria-label="Cari template"></div><select class="select" id="cat" aria-label="Kategori"><option value="">Semua kategori</option></select></div><div class="tbl-wrap" id="list">' + A.skel(5, 40) + '</div></section>';
    let data = { items: [], categories: [] }, q = '', cat = '';
    const load = async () => { const r = await A.api('adm.tpl.list', {}); if (!r.success) { A.$('#list', root).innerHTML = A.errorBox(r); return; } data = r.data; A.$('#cat', root).innerHTML = '<option value="">Semua kategori</option>' + data.categories.map(c => '<option value="' + esc(c.id) + '">' + esc(c.nama) + '</option>').join(''); A.$('#cat', root).value = cat; draw(); };
    const draw = () => {
      const list = data.items.filter(t => (!q || (t.nama + ' ' + t.deskripsi).toLowerCase().indexOf(q) > -1) && (!cat || t.category_id === cat));
      A.$('#list', root).innerHTML = list.length ? '<table class="tbl cards"><thead><tr><th>Template</th><th>Kategori</th><th>Versi</th><th class="num">Dipakai</th><th>Status</th><th>Diubah</th><th class="t-act"></th></tr></thead><tbody>' + list.map(t =>
        '<tr><td data-l="Template"><div class="t-title"><a href="#/admin/template/' + esc(t.id) + '">' + esc(t.nama) + '</a></div><div class="t-sub">' + esc(t.deskripsi || '') + '</div><div class="t-sub">' + (t.scope === 'org' ? I('building', 'sm') + ' Khusus organisasi' : I('layers', 'sm') + ' Semua organisasi') + ' · ' + (t.ringkasan.isian || 0) + ' isian · ' + (t.ringkasan.tahap || 0) + ' tahap</div></td>' +
        '<td data-l="Kategori"><span class="tag">' + esc(t.kategori) + '</span></td><td data-l="Versi" class="mono" style="font-size:12.5px">' + (t.versi_aktif ? 'v' + t.versi_aktif + ' terbit' : '—') + (t.versi_draf ? '<div><span class="tag warn" style="font-size:10px;padding:2px 6px">draf v' + t.versi_draf + '</span></div>' : '') + '</td>' +
        '<td data-l="Dipakai" class="num mono">' + t.dipakai + '</td><td data-l="Status">' + tstTag(t.status) + '</td><td data-l="Diubah" class="mono" style="font-size:12.5px">' + esc(A.fmtRel(t.updated_at)) + '</td>' +
        '<td class="t-act">' + (t.canEdit ? '<a class="btn btn-secondary btn-sm" href="#/admin/template/' + esc(t.id) + '">' + I('edit', 'sm') + 'Sunting</a> <button class="btn btn-ghost btn-icon btn-sm" data-t="' + esc(t.id) + '" aria-label="Aksi lain untuk ' + esc(t.nama) + '">' + I('more') + '</button>' : '') + '</td></tr>').join('') + '</tbody></table>' : A.empty('layout', 'Tidak ada template', 'Buat template pertama atau ubah filter.');
    };
    A.$('#q', root).oninput = e => { q = e.target.value.toLowerCase().trim(); draw(); };
    A.$('#cat', root).onchange = e => { cat = e.target.value; draw(); };
    A.on(root, 'click', '[data-t]', (e, b) => {
      const t = data.items.find(x => x.id === b.dataset.t); if (!t) return;
      A.menu(b, [
        { label: 'Pratinjau', icon: 'eye', disabled: !t.versi_aktif, act: () => A.previewTemplate(t) },
        { label: 'Duplikat sebagai template baru', icon: 'copy', act: async () => { const r = await A.api('adm.tpl.duplicate', { id: t.id }); if (!r.success) return A.toast(r.message, 'bad'); A.toast('Template diduplikat.'); A.go('#/admin/template/' + r.data.id); } },
        t.status === 'aktif' ? { label: 'Nonaktifkan', icon: 'x', act: async () => { if (!(await A.confirm({ text: 'Template "' + t.nama + '" tidak akan muncul di pilihan Naskah Baru. Naskah yang sudah memakainya tidak terpengaruh.', ok: 'Nonaktifkan' }))) return; const r = await A.api('adm.tpl.toggle', { id: t.id, aktif: false }); A.toast(r.message, r.success ? 'ok' : 'bad'); load(); } }
          : { label: 'Aktifkan', icon: 'check-c', disabled: !t.versi_aktif, act: async () => { const r = await A.api('adm.tpl.toggle', { id: t.id, aktif: true }); A.toast(r.message, r.success ? 'ok' : 'bad'); load(); } }
      ]);
    });
    A.$('#add', root).onclick = () => {
      if (!data.categories.length) return A.toast('Buat kategori terlebih dahulu.', 'warn');
      const m = A.modal({ title: 'Template baru', body: A.field({ id: 'tn', label: 'Nama template', req: 1, input: '<input class="input" id="tn" maxlength="120" placeholder="mis. Proposal Kegiatan Bakti Sosial">' }) +
        '<div class="mt16">' + A.field({ id: 'tc', label: 'Kategori', req: 1, input: '<select class="select" id="tc">' + data.categories.map(c => '<option value="' + esc(c.id) + '">' + esc(c.nama) + '</option>').join('') + '</select>' }) + '</div>' +
        '<div class="mt16">' + A.field({ id: 'tb', label: 'Mulai dari', input: '<select class="select" id="tb"><option value="">Kerangka kosong</option>' + data.items.map(t => '<option value="' + esc(t.id) + '">Salinan: ' + esc(t.nama) + '</option>').join('') + '</select>' }) + '</div>',
        foot: '<button class="btn btn-secondary" data-x>Batal</button><button class="btn btn-primary" id="tok">Buat & sunting</button>' });
      A.$('#tok', m.el).onclick = async e => {
        const nama = A.$('#tn', m.el).value.trim(), base = A.$('#tb', m.el).value, cid = A.$('#tc', m.el).value;
        if (!nama) return A.toast('Nama template wajib diisi.', 'warn');
        A.busy(e.currentTarget, true, 'Membuat…');
        let r;
        if (base) {
          r = await A.api('adm.tpl.duplicate', { id: base });
          if (r.success) { const g = await A.api('adm.tpl.get', { id: r.data.id }); if (g.success) r = await A.api('adm.tpl.save', { meta: Object.assign({}, g.data.template, { id: r.data.id, nama: nama, category_id: cid }), schema: g.data.schema, catatan: 'Draf awal' }); }
        } else {
          r = await A.api('adm.tpl.save', { meta: { nama: nama, category_id: cid, scope: 'global' }, schema: { page: { kop: 'first', pnum: 'skipFirst', headNum: true }, fdefs: [{ k: 'judul_kegiatan', l: 'Judul kegiatan', t: 'text', req: true }], steps: [{ id: 'umum', t: 'Informasi Umum', f: ['judul_kegiatan'] }], blocks: [{ t: 'h1', c: [{ x: 'Pendahuluan' }] }, { t: 'p', c: [{ x: 'Kegiatan ' }, { p: 'judul_kegiatan' }, { x: ' diselenggarakan oleh ' }, { p: 'org_nama' }, { x: '.' }], a: 'j', ind: true }] }, catatan: 'Draf awal' });
        }
        A.busy(e.currentTarget, false);
        if (!r.success) return A.toast(r.message, 'bad');
        m.close(); A.go('#/admin/template/' + r.data.id);
      };
    };
    load();
  }, { nav: 'adm-template', roles: ADM, crumbs: ['Administrasi', 'Template'] });

  /* ======================= TEMPLATE: EDITOR ======================= */
  const FT = { text: 'Teks singkat', textarea: 'Paragraf panjang', date: 'Tanggal', daterange: 'Rentang tanggal', number: 'Angka', currency: 'Nominal rupiah', select: 'Pilihan (dropdown)', list: 'Daftar butir', table: 'Tabel', rab: 'Rencana Anggaran Biaya', nomor_surat: 'Nomor surat' };
  const PREFILL = [['', '— tidak —'], ['org.nama', 'Nama organisasi'], ['org.singkatan', 'Singkatan organisasi'], ['org.alamat', 'Alamat organisasi'], ['org.email', 'Email organisasi'], ['org.periode', 'Periode kepengurusan'], ['org.officer:Ketua', 'Nama Ketua'], ['org.officer:Sekretaris', 'Nama Sekretaris'], ['org.officer:Bendahara', 'Nama Bendahara'], ['org.officer:Pembina', 'Nama Pembina']];
  const slug = s => { let k = String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 36); if (!/^[a-z]/.test(k)) k = 'isian_' + k; return k.replace(/_+$/, '') || 'isian'; };
  const sampleOrg = () => M.orgSnapshot({ nama: 'Himpunan Mahasiswa Contoh', singkatan: 'HMC', induk: 'Universitas Contoh\nFakultas Teknik', alamat: 'Jl. Contoh No. 1, Kota', email: 'hmc@contoh.ac.id', telepon: '0812-0000-0000', periode_mulai: A.today().slice(0, 4) + '-01-01', periode_selesai: A.today().slice(0, 4) + '-12-31' }, [{ jabatan: 'Ketua', nama: 'Nama Ketua', nomor: '0012345678' }, { jabatan: 'Sekretaris', nama: 'Nama Sekretaris', nomor: '0012345679' }, { jabatan: 'Bendahara', nama: 'Nama Bendahara' }, { jabatan: 'Pembina', nama: 'Nama Pembina', nomor: '198001012005011001' }]);

  function fieldDialog(schema, f, done) {
    const isNew = !f; f = M.clone(f || { k: '', l: '', t: 'text' });
    const keys = schema.fdefs.map(x => x.k).filter(k => k !== f.k);
    const m = A.modal({ title: isNew ? 'Tambah isian' : 'Ubah isian', size: 'lg', body: '<div class="fgrid" id="fd"></div>', foot: '<button class="btn btn-secondary" data-x>Batal</button><button class="btn btn-primary" id="fok">' + (isNew ? 'Tambah isian' : 'Simpan') + '</button>' });
    let keyTouched = !isNew;
    const draw = () => {
      const t = f.t;
      A.$('#fd', m.el).innerHTML =
        A.field({ id: 'fl', label: 'Label (tampil di formulir)', req: 1, cls: 'w-half', input: '<input class="input" id="fl" value="' + esc(f.l) + '" maxlength="80">' }) +
        A.field({ id: 'fk', label: 'Kunci placeholder', req: 1, cls: 'w-half', help: 'Dipakai di naskah sebagai {{kunci}}. Huruf kecil, angka, garis bawah.', input: '<div class="input-group"><span class="addon pre mono">{{</span><input class="input mono" id="fk" value="' + esc(f.k) + '" maxlength="40" ' + (isNew ? '' : 'readonly title="Kunci isian yang sudah ada tidak dapat diubah agar placeholder di naskah tetap terhubung."') + '><span class="addon mono">}}</span></div>' }) +
        A.field({ id: 'ft', label: 'Jenis isian', cls: 'w-half', input: '<select class="select" id="ft">' + Object.keys(FT).map(k => '<option value="' + k + '" ' + (t === k ? 'selected' : '') + '>' + FT[k] + '</option>').join('') + '</select>' }) +
        A.field({ id: 'fw', label: 'Lebar di formulir', cls: 'w-half', input: '<select class="select" id="fw"><option value="full">Penuh</option><option value="half">Setengah</option><option value="third">Sepertiga</option></select>' }) +
        A.field({ id: 'fp', label: 'Teks bantuan di dalam kolom (placeholder)', cls: 'w-half', input: '<input class="input" id="fp" value="' + esc(f.ph) + '" maxlength="160">' }) +
        A.field({ id: 'fh', label: 'Petunjuk di bawah kolom', cls: 'w-half', input: '<input class="input" id="fh" value="' + esc(f.help) + '" maxlength="300">' }) +
        (/^(text|textarea)$/.test(t) ? A.field({ id: 'fpr', label: 'Isi otomatis dari profil organisasi', cls: 'w-half', input: '<select class="select" id="fpr">' + PREFILL.map(x => '<option value="' + x[0] + '" ' + ((f.prefill || '') === x[0] ? 'selected' : '') + '>' + esc(x[1]) + '</option>').join('') + '</select>' }) : '') +
        (t === 'date' ? A.field({ id: 'ffm', label: 'Format tanggal', cls: 'w-half', input: '<select class="select" id="ffm"><option value="">17 Agustus 2026</option><option value="hari" ' + (f.fmt === 'hari' ? 'selected' : '') + '>Senin, 17 Agustus 2026</option></select>' }) : '') +
        (t === 'select' ? A.field({ id: 'fo', label: 'Pilihan (satu per baris)', cls: 'w-full', input: '<textarea class="textarea" id="fo" rows="4">' + esc((f.opts || []).join('\n')) + '</textarea>' }) : '') +
        (t === 'table' ? '<div class="field w-full"><label>Kolom tabel</label><div id="fcols"></div><button class="btn btn-dashed btn-sm mt8" id="fca" type="button">' + I('plus', 'sm') + 'Tambah kolom</button><label class="check mt8" style="display:flex"><input type="checkbox" id="fsum" ' + (f.sum ? 'checked' : '') + '> Hitung total untuk kolom nominal (tersedia {{total_kunci}} & {{terbilang_kunci}})</label></div>' : '') +
        (t === 'rab' ? '<div class="banner w-full">' + I('info') + '<div>Tabel RAB memiliki kolom tetap: Uraian, Volume, Satuan, Harga Satuan, dan Jumlah (otomatis), dengan total & terbilang.</div></div>' : '') +
        (/^(text|textarea|number|currency|select|date)$/.test(t) ? A.field({ id: 'fs', label: 'Contoh nilai (untuk pratinjau template)', cls: 'w-full', input: '<input class="input" id="fs" value="' + esc(typeof f.sample === 'string' ? f.sample : '') + '" maxlength="300">' }) : '') +
        '<label class="switch w-full"><input type="checkbox" id="fr" ' + (f.req ? 'checked' : '') + '> Wajib diisi</label>';
      A.$('#fw', m.el).value = f.w || 'full';
      if (t === 'table') {
        f.cols = f.cols && f.cols.length ? f.cols : [{ k: 'uraian', l: 'Uraian', t: 'text', w: 3 }];
        const dc = () => { A.$('#fcols', m.el).innerHTML = f.cols.map((c, i) => '<div class="grid" style="grid-template-columns:2fr 1.2fr 0.8fr 36px;gap:8px;margin-bottom:8px"><input class="input" data-c="' + i + '" data-p="l" value="' + esc(c.l) + '" aria-label="Judul kolom ' + (i + 1) + '"><select class="select" data-c="' + i + '" data-p="t" aria-label="Jenis kolom ' + (i + 1) + '">' + [['text', 'Teks'], ['number', 'Angka'], ['currency', 'Rupiah'], ['date', 'Tanggal']].map(x => '<option value="' + x[0] + '" ' + (c.t === x[0] ? 'selected' : '') + '>' + x[1] + '</option>').join('') + '</select><input class="input mono" type="number" step="0.1" min="0.3" max="6" data-c="' + i + '" data-p="w" value="' + c.w + '" title="Lebar relatif" aria-label="Lebar relatif kolom ' + (i + 1) + '"><button class="btn btn-ghost btn-icon btn-sm" type="button" data-crm="' + i + '" aria-label="Hapus kolom">' + I('trash', 'sm') + '</button></div>').join(''); };
        dc();
        A.$('#fcols', m.el).oninput = e => { const x = e.target; if (x.dataset.c === undefined) return; const c = f.cols[+x.dataset.c]; if (x.dataset.p === 'w') c.w = +x.value || 1; else c[x.dataset.p] = x.value; if (x.dataset.p === 'l') c.k = slug(x.value) || ('kolom' + x.dataset.c); };
        A.$('#fcols', m.el).onchange = A.$('#fcols', m.el).oninput;
        A.$('#fca', m.el).onclick = () => { if (f.cols.length >= 8) return A.toast('Maksimal 8 kolom.', 'warn'); f.cols.push({ k: 'kolom' + (f.cols.length + 1), l: 'Kolom ' + (f.cols.length + 1), t: 'text', w: 1 }); dc(); };
        A.on(A.$('#fcols', m.el), 'click', '[data-crm]', (e, b) => { if (f.cols.length < 2) return; f.cols.splice(+b.dataset.crm, 1); dc(); });
      }
    };
    const read = () => {
      const v = id => { const el = A.$('#' + id, m.el); return el ? (el.type === 'checkbox' ? el.checked : el.value) : undefined; };
      f.l = v('fl').trim(); f.k = v('fk').trim(); f.t = v('ft'); f.w = v('fw'); f.ph = v('fp'); f.help = v('fh'); f.req = v('fr');
      if (v('fpr') !== undefined) f.prefill = v('fpr'); else delete f.prefill;
      if (v('ffm') !== undefined) f.fmt = v('ffm'); else delete f.fmt;
      if (v('fo') !== undefined) f.opts = v('fo').split('\n').map(x => x.trim()).filter(Boolean);
      if (v('fsum') !== undefined) f.sum = v('fsum');
      if (v('fs') !== undefined) { const s = v('fs').trim(); if (s) f.sample = f.t === 'currency' ? s.replace(/[^\d]/g, '') : s; else delete f.sample; }
    };
    draw();
    m.el.addEventListener('input', e => { if (e.target.id === 'fl' && !keyTouched) A.$('#fk', m.el).value = slug(e.target.value); if (e.target.id === 'fk') keyTouched = true; });
    m.el.addEventListener('change', e => { if (e.target.id === 'ft') { read(); draw(); } });
    A.$('#fok', m.el).onclick = () => {
      read();
      if (!f.l) return A.toast('Label wajib diisi.', 'warn');
      if (!/^[a-z][a-z0-9_]{0,39}$/.test(f.k)) return A.toast('Kunci harus diawali huruf kecil dan hanya berisi huruf kecil, angka, atau garis bawah.', 'warn');
      if (keys.indexOf(f.k) > -1 || M.isKnownKey(f.k) && M.BUILTINS.some(b => b[0] === f.k)) return A.toast('Kunci {{' + f.k + '}} sudah dipakai.', 'warn');
      if (f.t === 'select' && !(f.opts || []).length) return A.toast('Isi minimal satu pilihan.', 'warn');
      m.close(); done(f);
    };
  }

  A.route('/admin/template/:id', async function (root, p) {
    root.innerHTML = A.skel(3, 60) + A.skel(8, 30);
    const [r, rc] = await Promise.all([A.api('adm.tpl.get', { id: p.id }), A.q('adm.cat.list', {})]);
    if (!r.success) { root.innerHTML = A.errorBox(r); return; }
    const d = r.data, cats = rc.success ? rc.data : [];
    const meta = { id: d.template.id, nama: d.template.nama, category_id: d.template.category_id, deskripsi: d.template.deskripsi || '', scope: d.template.scope || 'global', org_id: d.org_id || d.template.org_id || '' };
    const schema = M.sanitize(Object.assign({}, d.schema, { fields: {}, org: sampleOrg(), stage: 'builder' }));
    schema.org = sampleOrg();
    let tab = A.LS.get('tpltab') || 'isian', dirty = false, view = null, ver = d.versions;
    A.crumbs(['Administrasi', 'Template', meta.nama]);
    A.beforeLeave = async () => !dirty || A.confirm({ title: 'Perubahan belum disimpan', text: 'Simpan sebagai draf terlebih dahulu, atau perubahan akan hilang.', ok: 'Tinggalkan tanpa menyimpan', danger: true });
    const onUnload = e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', onUnload); A.cleanup.push(() => window.removeEventListener('beforeunload', onUnload));
    const head = () => '<div class="row wrap" style="gap:8px"><a class="btn btn-ghost btn-sm" href="#/admin/template">' + I('arrow-l', 'sm') + 'Template</a>' + tstTag(d.template.status) + (d.template.versi_aktif ? '<span class="tag">v' + d.template.versi_aktif + ' terbit</span>' : '') + (d.template.versi_draf ? '<span class="tag warn">draf v' + d.template.versi_draf + '</span>' : '') + '<span class="tag">' + d.dokumen + ' naskah memakai template ini</span>' + (dirty ? '<span class="tag warn" id="dt">' + I('edit', 'sm') + 'Belum disimpan</span>' : '') + '</div>';
    root.innerHTML = '<div class="ph" style="align-items:flex-start"><div class="grow" style="min-width:280px"><div id="hd">' + head() + '</div><h1 class="mt8" id="ttl">' + esc(meta.nama) + '</h1></div>' +
      '<div class="acts"><button class="btn btn-secondary" id="sv">' + I('save', 'sm') + 'Simpan Draf</button><button class="btn btn-primary" id="pub">' + I('send', 'sm') + 'Terbitkan</button></div></div>' +
      '<div id="orph"></div><div class="card" style="overflow:visible"><div style="padding:0 16px">' + A.tabs([['umum', 'Umum'], ['isian', 'Isian & Tahap Formulir'], ['struktur', 'Struktur & Teks Naskah'], ['format', 'Format Halaman'], ['pratinjau', 'Pratinjau & Versi']], tab) + '</div></div><div id="body" class="mt16"></div>';
    const mark = () => { if (!dirty) { dirty = true; A.$('#hd', root).innerHTML = head(); } orphans(); };
    const orphans = A.debounce(() => {
      const o = M.orphans(schema), lost = schema.fdefs.filter(f => !schema.steps.some(s => (s.f || []).indexOf(f.k) > -1));
      A.$('#orph', root).innerHTML = (o.length ? '<div class="banner warn mb16">' + I('alert') + '<div><b>Placeholder belum terhubung ke isian:</b> ' + o.map(k => '<span class="code">{{' + esc(k) + '}}</span>').join(' ') + '<div class="help mt8">Template tidak dapat diterbitkan sampai setiap placeholder punya isian. Tambahkan isian dengan kunci yang sama atau hapus placeholder dari naskah.</div><div class="row mt8 wrap">' + o.filter(k => /^[a-z][a-z0-9_]*$/.test(k)).map(k => '<button class="btn btn-secondary btn-xs" data-mkf="' + esc(k) + '">' + I('plus', 'sm') + 'Buat isian ' + esc(k) + '</button>').join('') + '</div></div></div>' : '') +
        (lost.length ? '<div class="banner warn mb16">' + I('alert') + '<div><b>Isian belum masuk tahap formulir:</b> ' + lost.map(f => esc(f.l)).join(', ') + '. Masukkan ke salah satu tahap di tab Isian & Tahap Formulir.</div></div>' : '');
    }, 250);
    A.on(root, 'click', '[data-mkf]', (e, b) => { const k = b.dataset.mkf; fieldDialog(schema, { k: k, l: k.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()), t: 'text' }, f => { schema.fdefs.push(f); (schema.steps[0] || (schema.steps[0] = { id: A.uid(), t: 'Informasi Umum', f: [] })).f.push(f.k); mark(); draw(); }); });
    A.on(root, 'click', '[data-tab]', (e, b) => { tab = b.dataset.tab; A.LS.set('tpltab', tab); A.$$('[data-tab]', root).forEach(x => x.setAttribute('aria-selected', x === b)); draw(); });
    const draw = () => {
      const B0 = A.$('#body', root), B = B0.cloneNode(false); B0.replaceWith(B); A.tip(null); view = null;
      if (tab === 'umum') {
        B.innerHTML = '<section class="card card-pad"><div class="fgrid">' + A.field({ id: 'mn', label: 'Nama template', req: 1, cls: 'w-half', input: '<input class="input" id="mn" value="' + esc(meta.nama) + '" maxlength="120">' }) +
          A.field({ id: 'mc', label: 'Kategori', req: 1, cls: 'w-half', input: '<select class="select" id="mc">' + cats.map(c => '<option value="' + esc(c.id) + '" ' + (c.id === meta.category_id ? 'selected' : '') + '>' + esc(c.nama) + (c.aktif ? '' : ' (nonaktif)') + '</option>').join('') + '</select>' }) +
          A.field({ id: 'md', label: 'Deskripsi singkat', cls: 'w-full', input: '<textarea class="textarea" id="md" rows="3" maxlength="400">' + esc(meta.deskripsi) + '</textarea>' }) +
          A.field({ id: 'ms', label: 'Tersedia untuk', cls: 'w-half', input: '<select class="select" id="ms"><option value="global">Semua organisasi</option><option value="org">Organisasi tertentu saja</option></select>' }) +
          A.field({ id: 'mo', label: 'Organisasi', cls: 'w-half', input: '<select class="select" id="mo">' + orgOpts(meta.org_id) + '</select>' }) + '</div>' +
          '<div class="banner mt16">' + I('info') + '<div>Menerbitkan versi baru <b>tidak mengubah naskah yang sudah dibuat</b> — naskah lama tetap memakai versi template saat naskah dibuat. Naskah baru otomatis memakai versi terbit terakhir.</div></div></section>';
        A.$('#ms', B).value = meta.scope; A.$('#mo', B).closest('.field').style.display = meta.scope === 'org' ? '' : 'none';
        B.oninput = B.onchange = e => { const t = e.target; if (t.id === 'mn') { meta.nama = t.value; A.$('#ttl', root).textContent = t.value; } if (t.id === 'mc') meta.category_id = t.value; if (t.id === 'md') meta.deskripsi = t.value; if (t.id === 'ms') { meta.scope = t.value; A.$('#mo', B).closest('.field').style.display = t.value === 'org' ? '' : 'none'; if (!meta.org_id) meta.org_id = A.$('#mo', B).value; } if (t.id === 'mo') meta.org_id = t.value; mark(); };
      } else if (tab === 'isian') {
        const fm = M.fdefMap(schema), used = M.usedKeys(schema);
        const fieldRow = (f, si, fi, n) => '<div class="li-item" style="padding:10px 12px;align-items:center"><span class="grip" aria-hidden="true">' + I('grip', 'sm') + '</span><div class="grow" style="min-width:0"><div style="font-weight:600;color:var(--ink)">' + esc(f.l) + (f.req ? ' <span class="req">*</span>' : '') + '</div><div class="help"><span class="code">{{' + esc(f.k) + '}}</span> · ' + esc(FT[f.t] || f.t) + (f.prefill ? ' · otomatis dari profil' : '') + (used.indexOf(f.k) < 0 && !/^(table|rab|list)$/.test(f.t) ? ' · <span style="color:var(--warn-t)">belum dipakai di naskah</span>' : '') + '</div></div>' +
          '<select class="select" style="width:auto;min-width:150px" data-mv="' + esc(f.k) + '" aria-label="Pindahkan ' + esc(f.l) + ' ke tahap"><option value="">— Tanpa tahap —</option>' + schema.steps.map((s, i) => '<option value="' + i + '" ' + (i === si ? 'selected' : '') + '>' + esc(s.t) + '</option>').join('') + '</select>' +
          (si > -1 ? '<button class="btn btn-ghost btn-icon btn-sm" data-fu="' + si + ':' + fi + '" aria-label="Naikkan" ' + (fi ? '' : 'disabled') + '>' + I('arrow-u', 'sm') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-fd="' + si + ':' + fi + '" aria-label="Turunkan" ' + (fi < n - 1 ? '' : 'disabled') + '>' + I('arrow-d', 'sm') + '</button>' : '') +
          '<button class="btn btn-ghost btn-icon btn-sm" data-fe="' + esc(f.k) + '" aria-label="Ubah ' + esc(f.l) + '">' + I('edit', 'sm') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-fx="' + esc(f.k) + '" aria-label="Hapus ' + esc(f.l) + '">' + I('trash', 'sm') + '</button></div>';
        const lost = schema.fdefs.filter(f => !schema.steps.some(s => (s.f || []).indexOf(f.k) > -1));
        B.innerHTML = '<div class="banner ink mb16">' + I('info') + '<div>Formulir naskah disusun per <b>tahap</b>. Setiap isian menjadi placeholder <span class="code" style="background:#fff">{{kunci}}</span> yang dapat disisipkan ke teks naskah (tab Struktur & Teks). Tahap “Profil Organisasi” dan “Hasilkan & Pratinjau” ditambahkan otomatis.</div></div>' +
          schema.steps.map((s, si) => '<section class="sect mb16"><div class="sect-head" style="flex-wrap:wrap"><span class="tag ink">Tahap ' + String(si + 2).padStart(2, '0') + '</span><input class="input" style="flex:1;min-width:200px;font-weight:600" data-st="' + si + '" value="' + esc(s.t) + '" aria-label="Nama tahap ' + (si + 1) + '">' +
            '<label class="check" title="Tahap berisi editor pohon AD/ART"><input type="checkbox" data-sad="' + si + '" ' + (s.type === 'adart' ? 'checked' : '') + '> Penyusun AD/ART</label><button class="btn btn-ghost btn-icon btn-sm" data-su="' + si + '" aria-label="Naikkan tahap" ' + (si ? '' : 'disabled') + '>' + I('arrow-u', 'sm') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-sdn="' + si + '" aria-label="Turunkan tahap" ' + (si < schema.steps.length - 1 ? '' : 'disabled') + '>' + I('arrow-d', 'sm') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-sx="' + si + '" aria-label="Hapus tahap">' + I('trash', 'sm') + '</button></div>' +
            '<div class="sect-body"><input class="input mb12" data-sdesc="' + si + '" value="' + esc(s.desc || '') + '" placeholder="Petunjuk singkat untuk tahap ini (opsional)" aria-label="Petunjuk tahap"><div class="col" style="gap:8px">' + ((s.f || []).map((k, fi) => fm[k] ? fieldRow(fm[k], si, fi, s.f.length) : '').join('') || (s.type === 'adart' ? '<p class="help">Tahap ini menampilkan editor bab/pasal/ayat AD/ART. Isian tambahan boleh dikosongkan.</p>' : '<p class="muted">Belum ada isian di tahap ini.</p>')) + '</div><button class="btn btn-dashed btn-sm mt12" data-fa="' + si + '">' + I('plus', 'sm') + 'Tambah isian ke tahap ini</button></div></section>').join('') +
          (lost.length ? '<section class="sect mb16"><div class="sect-head"><span class="tag warn">Belum bertahap</span><h2>Isian tanpa tahap</h2></div><div class="sect-body col" style="gap:8px">' + lost.map(f => fieldRow(f, -1, 0, 0)).join('') + '</div></section>' : '') +
          '<button class="btn btn-secondary" id="sa">' + I('plus', 'sm') + 'Tambah tahap formulir</button>';
        B.oninput = e => { const t = e.target; if (t.dataset.st !== undefined) { schema.steps[+t.dataset.st].t = t.value; mark(); } if (t.dataset.sdesc !== undefined) { schema.steps[+t.dataset.sdesc].desc = t.value; mark(); } };
        B.onchange = e => {
          const t = e.target;
          if (t.dataset.sad !== undefined) { const s = schema.steps[+t.dataset.sad]; if (t.checked) { s.type = 'adart'; if (!schema.adart || !schema.adart.parts || !schema.adart.parts.length) schema.adart = { parts: [{ id: A.uid(), kode: 'AD', judul: 'ANGGARAN DASAR', sub: [{ p: 'org_nama' }], mukadimah: [], babs: [] }] }; if (!schema.blocks.some(b => b.t === 'adart')) schema.blocks.push({ id: A.uid(), t: 'adart', part: 'all' }); } else delete s.type; mark(); }
          if (t.dataset.mv !== undefined) { const k = t.dataset.mv; schema.steps.forEach(s => { s.f = (s.f || []).filter(x => x !== k); }); if (t.value !== '') schema.steps[+t.value].f.push(k); mark(); draw(); }
        };
        B.onclick = async e => {
          const b = e.target.closest('button'); if (!b) return; const dd = b.dataset;
          if (b.id === 'sa') { schema.steps.push({ id: A.uid(), t: 'Tahap baru', f: [] }); mark(); draw(); const ins = A.$$('[data-st]', B); ins[ins.length - 1].select(); return; }
          if (dd.fa !== undefined) return fieldDialog(schema, null, f => { schema.fdefs.push(f); schema.steps[+dd.fa].f.push(f.k); mark(); draw(); });
          if (dd.fe) return fieldDialog(schema, M.fdefMap(schema)[dd.fe], f => { const i = schema.fdefs.findIndex(x => x.k === dd.fe); schema.fdefs[i] = f; mark(); draw(); });
          if (dd.fx) { const f = M.fdefMap(schema)[dd.fx]; if (!(await A.confirm({ title: 'Hapus isian?', text: 'Isian "' + f.l + '" dihapus. Placeholder {{' + f.k + '}} di naskah akan menjadi yatim dan harus dihapus sebelum terbit.', ok: 'Hapus', danger: true }))) return; schema.fdefs = schema.fdefs.filter(x => x.k !== dd.fx); schema.steps.forEach(s => { s.f = (s.f || []).filter(x => x !== dd.fx); }); mark(); draw(); return; }
          if (dd.fu || dd.fd) { const [si, fi] = (dd.fu || dd.fd).split(':').map(Number), arr = schema.steps[si].f, j = fi + (dd.fu ? -1 : 1); const x = arr[fi]; arr[fi] = arr[j]; arr[j] = x; mark(); draw(); return; }
          if (dd.su || dd.sdn) { const i = +(dd.su || dd.sdn), j = i + (dd.su ? -1 : 1); const x = schema.steps[i]; schema.steps[i] = schema.steps[j]; schema.steps[j] = x; mark(); draw(); return; }
          if (dd.sx) { const s = schema.steps[+dd.sx]; if (!(await A.confirm({ text: 'Hapus tahap "' + s.t + '"? Isian di dalamnya dipindahkan ke daftar "tanpa tahap".', ok: 'Hapus tahap', danger: true }))) return; schema.steps.splice(+dd.sx, 1); mark(); draw(); }
        };
      } else if (tab === 'struktur') {
        const hasAd = schema.adart && schema.adart.parts && schema.adart.parts.length;
        const sub = A.LS.get('tplsub') === 'adart' && hasAd ? 'adart' : 'blok';
        B.innerHTML = (hasAd ? '<div class="seg mb16" role="group" aria-label="Bagian"><button data-sub="blok" aria-pressed="' + (sub === 'blok') + '">Blok naskah</button><button data-sub="adart" aria-pressed="' + (sub === 'adart') + '">Isi awal AD/ART</button></div>' : '') + '<div id="sb"></div>';
        A.on(B, 'click', '[data-sub]', (e, b) => { A.LS.set('tplsub', b.dataset.sub); draw(); });
        const SB = A.$('#sb', B);
        if (sub === 'adart') { A.AdartEditor(SB, schema, {}, mark); return; }
        const zoom = +(A.LS.get('zoom') || 1) > 1 ? 1 : +(A.LS.get('zoom') || 0.9);
        SB.innerHTML = '<div class="banner mb12">' + I('info') + '<div>Sunting teks baku naskah. Sisipkan isian melalui tombol <b>Data</b>; chip biru menandai placeholder. Blok tabel, tanda tangan, dan daftar isi diatur melalui tombol ⋯ di kiri blok.</div></div>' +
          '<div class="ed tpl-mode" style="height:auto;min-height:0;border:1px solid var(--line-2);border-radius:var(--r-lg);overflow:hidden">' + A.Tools.html(schema.page, zoom) + '<div class="ed-center" style="height:72vh;background:var(--well)" id="tc"><div class="sheets" id="tsh" style="zoom:' + zoom + '"></div></div></div>';
        view = new (A.EditView)(A.$('#tsh', SB), { content: schema, meta: { today: A.today(), kode: 'NSK-CONTOH', judul: meta.nama }, readOnly: false, onChange: () => mark(), onSign: b => A.signDialog(view, b, mark), onChip: () => { } });
        view.bind(); view.render();
        A.Tools.bind(SB, view, { signDialog: b => A.signDialog(view, b, mark) });
      } else if (tab === 'format') {
        const P = schema.page;
        B.innerHTML = '<section class="card card-pad"><div class="grid g2" style="gap:24px"><div class="col" style="gap:16px">' +
          A.field({ id: 'psz', label: 'Ukuran kertas', input: '<select class="select" id="psz">' + [['A4', 'A4 (21 × 29,7 cm)'], ['F4', 'F4 / Folio (21,5 × 33 cm)'], ['Letter', 'Letter (21,6 × 27,9 cm)']].map(x => '<option value="' + x[0] + '">' + x[1] + '</option>').join('') + '</select>' }) +
          '<div class="grid g2" style="gap:12px">' + A.field({ id: 'pfo', label: 'Huruf', input: '<select class="select" id="pfo">' + M.FONTS.map(f => '<option>' + f + '</option>').join('') + '</select>' }) + A.field({ id: 'pfs', label: 'Ukuran (pt)', input: '<select class="select" id="pfs">' + [10, 11, 12, 13, 14].map(n => '<option value="' + n + '">' + n + '</option>').join('') + '</select>' }) + '</div>' +
          A.field({ id: 'pls', label: 'Spasi baris', input: '<select class="select" id="pls">' + [1, 1.15, 1.5, 2].map(n => '<option value="' + n + '">' + n + '</option>').join('') + '</select>' }) +
          '<div class="well"><b style="color:var(--ink)">Margin (cm)</b><div class="grid g2 mt8" style="gap:10px">' + [['ml', 'Kiri'], ['mt', 'Atas'], ['mr', 'Kanan'], ['mb', 'Bawah']].map(m => A.field({ id: 'p' + m[0], label: m[1], input: '<input class="input mono" type="number" step="0.25" min="1" max="6" id="p' + m[0] + '" data-m="' + m[0] + '">' })).join('') + '</div></div></div>' +
          '<div class="col" style="gap:16px">' + A.field({ id: 'pkop', label: 'Kop surat', input: '<select class="select" id="pkop"><option value="none">Tanpa kop</option><option value="first">Halaman pertama saja</option><option value="all">Semua halaman</option></select>' }) +
          A.field({ id: 'ppn', label: 'Nomor halaman', input: '<select class="select" id="ppn"><option value="skipFirst">Mulai halaman 2</option><option value="all">Semua halaman</option><option value="none">Tanpa nomor</option></select>' }) +
          A.field({ id: 'ppp', label: 'Posisi nomor halaman', input: '<select class="select" id="ppp"><option value="center">Tengah bawah</option><option value="right">Kanan bawah</option></select>' }) +
          '<label class="switch"><input type="checkbox" id="phn"> Penomoran otomatis BAB I, II… & sub-judul A, B…</label><label class="switch"><input type="checkbox" id="pbh"> Setiap BAB dimulai di halaman baru</label>' +
          '<div class="banner">' + I('info') + '<div>Huruf dibatasi pada Times New Roman, Arial, Cambria, dan Calibri agar hasil DOCX/PDF sama di Word & Google Docs.</div></div></div></div></section>';
        const set = () => { A.$('#psz', B).value = P.size; A.$('#pfo', B).value = P.font; A.$('#pfs', B).value = P.fs; A.$('#pls', B).value = P.ls; ['ml', 'mt', 'mr', 'mb'].forEach(k => { A.$('#p' + k, B).value = P[k]; }); A.$('#pkop', B).value = P.kop; A.$('#ppn', B).value = P.pnum; A.$('#ppp', B).value = P.pnumPos; A.$('#phn', B).checked = P.headNum; A.$('#pbh', B).checked = P.babHal; };
        set();
        B.onchange = e => { const t = e.target, P2 = schema.page; if (t.id === 'psz') P2.size = t.value; if (t.id === 'pfo') P2.font = t.value; if (t.id === 'pfs') P2.fs = +t.value; if (t.id === 'pls') P2.ls = +t.value; if (t.dataset.m) P2[t.dataset.m] = +t.value; if (t.id === 'pkop') P2.kop = t.value; if (t.id === 'ppn') P2.pnum = t.value; if (t.id === 'ppp') P2.pnumPos = t.value; if (t.id === 'phn') P2.headNum = t.checked; if (t.id === 'pbh') P2.babHal = t.checked; schema.page = M.cleanPage(P2); mark(); };
      } else if (tab === 'pratinjau') {
        B.innerHTML = '<div class="grid" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:16px"><section class="card"><div class="card-head"><h3>' + I('eye') + 'Pratinjau dengan data contoh</h3><span class="eyebrow">Draf saat ini</span></div><div class="card-body well" id="pv" style="display:flex;justify-content:center;max-height:78vh;overflow:auto;border:0;border-radius:0 0 8px 8px">' + A.skel(6) + '</div></section>' +
          '<section class="card"><div class="card-head"><h3>' + I('clock') + 'Riwayat versi</h3></div><div class="card-body">' + (ver.length ? ver.map(v => '<div class="ver"><span class="vn">v' + v.versi + '</span><div class="grow"><div class="row" style="gap:6px">' + (v.status === 'terbit' ? '<span class="tag ok">' + I('check-c', 'sm') + 'Terbit</span>' : '<span class="tag warn">' + I('edit', 'sm') + 'Draf</span>') + (v.versi === d.template.versi_aktif ? '<span class="tag ink">Dipakai naskah baru</span>' : '') + '</div><div class="help mt8">' + esc(v.catatan || '') + '</div><div class="help mono">' + esc(A.fmtDateTime(v.waktu)) + ' · ' + esc(v.oleh) + '</div></div></div>').join('') : '<p class="muted">Belum ada versi.</p>') +
          '<div class="banner mt16">' + I('info') + '<div>Contoh nilai diambil dari kolom “Contoh nilai” tiap isian. Isian tanpa contoh ditandai kuning.</div></div></div></section></div>';
        const doc = M.newDoc(schema, sampleOrg(), { sample: true });
        A.Doc.mountPreview(A.$('#pv', B), doc, { scale: 0.62, meta: { today: A.today(), kode: 'NSK-CONTOH', judul: meta.nama }, miss: true, maxPages: 12 });
      }
    };
    const save = async (btn, silent) => {
      if (!meta.nama.trim()) { A.toast('Nama template wajib diisi (tab Umum).', 'warn'); return false; }
      if (btn) A.busy(btn, true, 'Menyimpan…');
      const body = M.clone(schema); body.fields = {}; body.org = {};
      const x = await A.api('adm.tpl.save', { meta: meta, schema: body });
      if (btn) A.busy(btn, false);
      if (!x.success) { A.toast(x.message, 'bad'); return false; }
      dirty = false; d.template.versi_draf = x.data.versi_draf; A.$('#hd', root).innerHTML = head();
      if (!silent) A.toast(x.message + (x.data.orphans.length ? ' Masih ada placeholder yatim.' : ''), x.data.orphans.length ? 'warn' : 'ok');
      const g = await A.api('adm.tpl.get', { id: meta.id }); if (g.success) { ver = g.data.versions; d.template = g.data.template; A.$('#hd', root).innerHTML = head(); }
      return true;
    };
    A.$('#sv', root).onclick = e => save(e.currentTarget);
    A.$('#pub', root).onclick = async e => {
      const o = M.orphans(schema); if (o.length) return A.toast('Masih ada placeholder yatim — lihat peringatan di atas.', 'warn');
      const cat = await A.prompt({ title: 'Terbitkan template', text: 'Versi baru langsung dipakai untuk naskah baru. Naskah lama tetap memakai versinya masing-masing.', label: 'Catatan perubahan (opsional)', ph: 'mis. Menambah bab Evaluasi', ok: 'Terbitkan' });
      if (cat === null) return;
      const btn = e.currentTarget;
      if ((dirty || !d.template.versi_draf) && !(await save(btn, true))) return;
      A.busy(btn, true, 'Menerbitkan…');
      const x = await A.api('adm.tpl.publish', { id: meta.id, catatan: cat });
      A.busy(btn, false);
      if (!x.success) return A.toast(x.message, 'bad');
      A.toast(x.message); A.invalidate();
      const g = await A.api('adm.tpl.get', { id: meta.id }); if (g.success) { ver = g.data.versions; d.template = g.data.template; } A.$('#hd', root).innerHTML = head(); if (tab === 'pratinjau') draw();
    };
    const keys = e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(A.$('#sv', root)); } };
    document.addEventListener('keydown', keys); A.cleanup.push(() => document.removeEventListener('keydown', keys));
    draw(); orphans();
  }, { nav: 'adm-template', roles: ADM, crumbs: ['Administrasi', 'Template'] });

  /* ======================= KATEGORI ======================= */
  A.route('/admin/kategori', async function (root) {
    root.innerHTML = '<div class="ph"><div><div class="tags"><span class="tag ink">Klasifikasi</span></div><h1>Kategori Naskah</h1><p class="sub">Jenis dokumen yang muncul saat pengguna membuat naskah baru, mis. Proposal, AD/ART, Program Kerja, LPJ, dan Surat.</p></div><div class="acts">' + (isSA() ? '<button class="btn btn-primary" id="add">' + I('plus', 'sm') + 'Tambah Kategori</button>' : '') + '</div></div><section class="card"><div class="tbl-wrap" id="list">' + A.skel(5, 40) + '</div></section>' + (isSA() ? '' : '<p class="help mt12">' + I('info', 'sm') + ' Kategori dikelola Super Admin.</p>');
    let list = [];
    const draw = () => {
      A.$('#list', root).innerHTML = list.length ? '<table class="tbl cards"><thead><tr><th style="width:90px">Urutan</th><th>Kategori</th><th class="num">Template</th><th class="num">Naskah</th><th>Status</th><th class="t-act"></th></tr></thead><tbody>' + list.map((c, i) =>
        '<tr><td data-l="Urutan"><div class="row" style="gap:2px">' + (isSA() ? '<button class="btn btn-ghost btn-icon btn-sm" data-up="' + i + '" aria-label="Naikkan" ' + (i ? '' : 'disabled') + '>' + I('arrow-u', 'sm') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-dn="' + i + '" aria-label="Turunkan" ' + (i < list.length - 1 ? '' : 'disabled') + '>' + I('arrow-d', 'sm') + '</button>' : '<span class="mono">' + (i + 1) + '</span>') + '</div></td>' +
        '<td data-l="Kategori"><div class="t-title">' + esc(c.nama) + '</div><div class="t-sub"><span class="code">' + esc(c.kode) + '</span> ' + esc(c.deskripsi || '') + '</div></td><td data-l="Template" class="num mono">' + c.jumlah_template + '</td><td data-l="Naskah" class="num mono">' + c.jumlah_dokumen + '</td>' +
        '<td data-l="Status">' + (c.aktif ? '<span class="tag ok">' + I('check-c', 'sm') + 'Aktif</span>' : '<span class="tag">' + I('x', 'sm') + 'Nonaktif</span>') + '</td><td class="t-act">' + (isSA() ? '<button class="btn btn-ghost btn-sm" data-ed="' + i + '">' + I('edit', 'sm') + 'Ubah</button><button class="btn btn-ghost btn-icon btn-sm" data-rm="' + i + '" aria-label="Hapus ' + esc(c.nama) + '">' + I('trash', 'sm') + '</button>' : '') + '</td></tr>').join('') + '</tbody></table>' : A.empty('hash', 'Belum ada kategori', '');
    };
    const load = async () => { const r = await A.api('adm.cat.list', {}); if (!r.success) { A.$('#list', root).innerHTML = A.errorBox(r); return; } list = r.data; draw(); };
    const form = c => {
      c = c || { aktif: true };
      const m = A.modal({ title: c.id ? 'Ubah kategori' : 'Tambah kategori', body: '<div class="col" style="gap:14px">' + A.field({ id: 'cn', label: 'Nama', req: 1, input: '<input class="input" id="cn" value="' + esc(c.nama) + '" maxlength="60">' }) + A.field({ id: 'ck', label: 'Kode', req: 1, help: 'Huruf kecil tanpa spasi, mis. "proposal". Tidak dapat diubah bila sudah dipakai template.', input: '<input class="input mono" id="ck" value="' + esc(c.kode) + '" maxlength="20">' }) + A.field({ id: 'cd', label: 'Deskripsi', input: '<input class="input" id="cd" value="' + esc(c.deskripsi) + '" maxlength="200">' }) + '<label class="switch"><input type="checkbox" id="ca" ' + (c.aktif ? 'checked' : '') + '> Aktif (tampil di pilihan naskah baru)</label></div>', foot: '<button class="btn btn-secondary" data-x>Batal</button><button class="btn btn-primary" id="cs">Simpan</button>' });
      A.$('#cn', m.el).oninput = e => { if (!c.id) A.$('#ck', m.el).value = e.target.value.toLowerCase().replace(/[^a-z]+/g, '_').replace(/^_|_$/g, '').slice(0, 20); };
      A.$('#cs', m.el).onclick = async e => { A.busy(e.currentTarget, true); const r = await A.api('adm.cat.save', { cat: { id: c.id, nama: A.$('#cn', m.el).value, kode: A.$('#ck', m.el).value, deskripsi: A.$('#cd', m.el).value, aktif: A.$('#ca', m.el).checked } }); A.busy(e.currentTarget, false); if (!r.success) return A.toast(r.message, 'bad'); list = r.data; m.close(); draw(); A.toast('Kategori disimpan.'); A.invalidate(); };
    };
    const reorder = async (i, j) => { const x = list[i]; list[i] = list[j]; list[j] = x; draw(); const r = await A.api('adm.cat.save', { urutan: list.map(c => c.id) }); if (r.success) list = r.data; else A.toast(r.message, 'bad'); draw(); };
    if (A.$('#add', root)) A.$('#add', root).onclick = () => form(null);
    A.on(root, 'click', '[data-ed]', (e, b) => form(list[+b.dataset.ed]));
    A.on(root, 'click', '[data-up]', (e, b) => reorder(+b.dataset.up, +b.dataset.up - 1));
    A.on(root, 'click', '[data-dn]', (e, b) => reorder(+b.dataset.dn, +b.dataset.dn + 1));
    A.on(root, 'click', '[data-rm]', async (e, b) => { const c = list[+b.dataset.rm]; if (!(await A.confirm({ title: 'Hapus kategori?', text: 'Kategori "' + c.nama + '" dihapus. Kategori yang dipakai template tidak dapat dihapus — nonaktifkan saja.', ok: 'Hapus', danger: true }))) return; const r = await A.api('adm.cat.delete', { id: c.id }); if (!r.success) return A.toast(r.message, 'bad'); list = r.data; draw(); });
    load();
  }, { nav: 'adm-kategori', roles: ADM, crumbs: ['Administrasi', 'Kategori'] });

  /* ======================= LOG AKTIVITAS ======================= */
  const AKSI = [['', 'Semua aktivitas'], ['LOGIN', 'Masuk / gagal masuk'], ['AKTIVASI', 'Aktivasi akun'], ['DOK_', 'Naskah'], ['KOMENTAR', 'Komentar'], ['BERKAS_', 'Berkas'], ['PENGGUNA_', 'Pengelolaan pengguna'], ['ORG_', 'Organisasi'], ['TEMPLATE_', 'Template'], ['AKSES_', 'Akses ditolak / dukungan'], ['PENGATURAN', 'Pengaturan'], ['BACKUP', 'Backup'], ['IMPOR', 'Impor data'], ['LAPORAN', 'Ekspor laporan']];
  A.route('/admin/log', async function (root, p, q) {
    const st = { q: q.q || '', aksi: q.aksi || '', hasil: q.hasil || '', from: q.from || '', to: q.to || '', org_id: q.org || '', page: +q.page || 1 };
    root.innerHTML = '<div class="ph"><div><div class="tags"><span class="tag ink">Audit</span><span class="tag">Tidak dapat diubah</span></div><h1>Log Aktivitas</h1><p class="sub">Catatan siapa melakukan apa dan kapan: masuk, pembuatan & ekspor naskah, berbagi, perubahan akun, serta percobaan akses yang ditolak. PIN dan isi naskah tidak pernah dicatat.</p></div><div class="acts"><button class="btn btn-primary" id="ex">' + I('download', 'sm') + 'Ekspor ' + I('chev-d', 'sm') + '</button></div></div>' +
      '<section class="card"><div class="toolbar"><div class="search">' + I('search', 'sm') + '<input class="input" id="q" value="' + esc(st.q) + '" placeholder="Cari pengguna, objek, rincian…" aria-label="Cari log"></div><select class="select" id="aksi" aria-label="Jenis aktivitas">' + AKSI.map(a => '<option value="' + a[0] + '">' + esc(a[1]) + '</option>').join('') + '</select>' +
      '<select class="select" id="hasil" aria-label="Hasil"><option value="">Semua hasil</option><option value="OK">Berhasil</option><option value="GAGAL">Gagal</option><option value="DITOLAK">Ditolak</option><option value="TERCATAT">Tercatat (akses dukungan)</option></select>' +
      (orgs().length > 1 ? '<select class="select" id="org" aria-label="Organisasi">' + orgOpts(st.org_id, 'Semua organisasi') + '</select>' : '') +
      '<label class="row" style="gap:6px;font-size:13px;color:var(--muted)">Dari <input class="input" type="date" id="from" value="' + esc(st.from) + '" style="width:auto"></label><label class="row" style="gap:6px;font-size:13px;color:var(--muted)">s.d. <input class="input" type="date" id="to" value="' + esc(st.to) + '" style="width:auto"></label></div><div class="tbl-wrap" id="list">' + A.skel(8, 30) + '</div><div id="pg"></div></section>';
    A.$('#aksi', root).value = st.aksi; A.$('#hasil', root).value = st.hasil;
    const filt = () => ({ q: st.q, aksi: st.aksi, hasil: st.hasil, from: st.from, to: st.to, org_id: st.org_id });
    const sync = () => A.setQuery({ q: st.q, aksi: st.aksi, hasil: st.hasil, from: st.from, to: st.to, org: st.org_id, page: st.page > 1 ? st.page : '' });
    const load = async () => {
      const r = await A.q('adm.logs', Object.assign(filt(), { page: st.page, per: 20 }));
      if (!r.success) { A.$('#list', root).innerHTML = A.errorBox(r); return; }
      const d = r.data;
      A.$('#list', root).innerHTML = d.items.length ? '<table class="tbl cards"><thead><tr><th>Waktu (WIB)</th><th>Pengguna</th><th>Aktivitas</th><th>Objek</th><th>Hasil</th></tr></thead><tbody>' + d.items.map(l =>
        '<tr><td data-l="Waktu" class="mono" style="white-space:nowrap;font-size:12.5px">' + esc(A.fmtDateTime(l.waktu)) + '</td><td data-l="Pengguna"><div class="t-title">' + esc(l.user_nama) + '</div><div class="t-sub">' + esc(l.org) + '</div></td><td data-l="Aktivitas"><div>' + esc(A.aksiLabel(l.aksi)) + ' <span class="code" style="font-size:10.5px">' + esc(l.aksi) + '</span></div>' + (l.ringkasan ? '<div class="t-sub">' + esc(l.ringkasan) + '</div>' : '') + '</td><td data-l="Objek" class="mono" style="font-size:12.5px;word-break:break-all">' + esc(l.objek || '—') + '</td><td data-l="Hasil">' + hasilTag(l.hasil) + '</td></tr>').join('') + '</tbody></table>' : A.empty('activity', 'Tidak ada catatan', 'Ubah filter atau rentang tanggal.');
      A.$('#pg', root).innerHTML = A.pager(d, 'catatan');
    };
    const re = () => { st.page = 1; sync(); load(); };
    A.$('#q', root).oninput = A.debounce(e => { st.q = e.target.value.trim(); re(); }, 350);
    ['aksi', 'hasil', 'from', 'to'].forEach(id => A.$('#' + id, root).onchange = e => { st[id] = e.target.value; re(); });
    if (A.$('#org', root)) A.$('#org', root).onchange = e => { st.org_id = e.target.value; re(); };
    A.on(root, 'click', '[data-page]', (e, b) => { st.page = +b.dataset.page; sync(); load(); });
    A.$('#ex', root).onclick = e => reportMenu(e.currentTarget, 'logs', filt());
    load();
  }, { nav: 'adm-log', roles: ADM, crumbs: ['Administrasi', 'Log aktivitas'] });

  /* ======================= IMPOR AKUN (CSV) ======================= */
  function parseCsv(text) {
    text = text.replace(/^﻿/, '');
    const first = text.split(/\r?\n/)[0] || '', sep = (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : (first.indexOf('\t') > -1 && first.indexOf(',') < 0 ? '\t' : ',');
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; continue; }
      if (ch === '"') q = true; else if (ch === sep) { row.push(cur); cur = ''; } else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; } else cur += ch;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows.filter(r => r.some(c => String(c).trim() !== ''));
  }
  const HMAP = { nama: 'nama', nama_lengkap: 'nama', name: 'nama', identity_no: 'identity_no', nomor_identitas: 'identity_no', no_identitas: 'identity_no', nim: 'identity_no', nip: 'identity_no', nisn: 'identity_no', nik: 'identity_no', username: 'identity_no', email: 'email', surel: 'email', role: 'role', peran: 'role', jabatan: 'jabatan', organisasi: 'organisasi', org: 'organisasi', singkatan_organisasi: 'organisasi' };
  A.route('/admin/impor-akun', async function (root) {
    let rows = [], hasil = null, kode = [];
    root.innerHTML = '<div class="ph"><div><div class="tags"><span class="tag ink">Akun massal</span><span class="tag">CSV</span></div><h1>Impor Akun dari CSV</h1><p class="sub">Buat banyak akun sekaligus. Setiap akun mendapat kode aktivasi sekali pakai — pengguna membuat PIN sendiri.</p></div></div>' +
      '<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.6fr);gap:16px"><section class="card card-pad"><h3 style="font-size:15px" class="mb8">1. Siapkan berkas</h3><p class="help">Kolom: <span class="code">nama</span>, <span class="code">identity_no</span>, <span class="code">email</span>, <span class="code">role</span> (user/viewer), <span class="code">jabatan</span>, <span class="code">organisasi</span> (nama/singkatan; kosong = organisasi bawaan di bawah). Pemisah koma atau titik koma.</p>' +
      '<button class="btn btn-secondary btn-sm mt12" id="tpl">' + I('download', 'sm') + 'Unduh contoh CSV</button><div class="banner warn mt16">' + I('alert') + '<div>Excel dapat menghapus angka 0 di depan nomor identitas. Format kolom nomor identitas sebagai <b>Teks</b> sebelum mengisi, atau sunting CSV dengan editor teks.</div></div>' +
      '<h3 style="font-size:15px" class="mt24 mb8">2. Pilih berkas & organisasi bawaan</h3>' + A.field({ id: 'dorg', label: 'Organisasi bawaan', input: '<select class="select" id="dorg">' + orgOpts((S.boot.org || {}).id) + '</select>' }) +
      '<div class="drop mt12" id="drop" tabindex="0" role="button" aria-label="Pilih berkas CSV">' + I('upload', 'lg') + '<b>Tarik berkas CSV ke sini</b><span class="help">atau klik untuk memilih · maks. 1.000 baris</span></div></section>' +
      '<section class="card"><div class="card-head"><h3>' + I('table') + 'Pratinjau & hasil</h3><span class="eyebrow" id="cnt"></span></div><div class="tbl-wrap" id="pv" style="max-height:60vh;overflow:auto"><div class="card-body">' + A.empty('import', 'Belum ada berkas', 'Pilih berkas CSV untuk melihat pratinjau.') + '</div></div><div class="tbl-foot" id="acts" style="display:none"><span class="help" id="sum"></span><div class="row"><button class="btn btn-secondary" id="chk">' + I('check', 'sm') + 'Periksa (tanpa menyimpan)</button><button class="btn btn-primary" id="run" disabled>' + I('import', 'sm') + 'Buat akun</button></div></div></section></div>';
    const draw = () => {
      const res = hasil ? hasil.hasil : null;
      A.$('#cnt', root).textContent = rows.length + ' baris';
      A.$('#pv', root).innerHTML = '<table class="tbl compact"><thead><tr><th>Baris</th><th>Nama</th><th>Nomor identitas</th><th>Peran</th><th>Organisasi</th><th>Status</th></tr></thead><tbody>' + rows.slice(0, 1000).map((r, i) => { const h = res && res[i]; const k = kode.find(x => x.identity_no === r.identity_no); return '<tr><td class="mono">' + (i + 2) + '</td><td>' + esc(r.nama) + '</td><td class="mono">' + esc(r.identity_no) + '</td><td>' + esc(r.role || 'user') + '</td><td>' + esc(r.organisasi || '(bawaan)') + '</td><td>' + (k ? '<span class="tag ok">' + I('check-c', 'sm') + 'Dibuat</span> <span class="code">' + esc(k.kode) + '</span>' : h ? (h.ok ? '<span class="tag ok">' + I('check-c', 'sm') + esc(h.pesan) + '</span>' : '<span class="tag bad">' + I('alert', 'sm') + esc(h.pesan) + '</span>') : '<span class="muted">—</span>') + '</td></tr>'; }).join('') + '</tbody></table>';
      A.$('#acts', root).style.display = rows.length ? '' : 'none';
      A.$('#sum', root).textContent = hasil ? (hasil.dryRun ? hasil.siap + ' siap dibuat · ' + hasil.gagal + ' ditolak' : kode.length + ' akun dibuat · ' + hasil.gagal + ' ditolak') : 'Periksa dulu sebelum membuat akun.';
      A.$('#run', root).disabled = !(hasil && hasil.dryRun && hasil.siap);
    };
    const load = file => {
      if (!file) return; if (file.size > 2e6) return A.toast('Berkas terlalu besar (maks 2 MB).', 'bad');
      const fr = new FileReader();
      fr.onload = () => {
        const data = parseCsv(String(fr.result)); if (data.length < 2) return A.toast('CSV kosong atau tanpa baris data.', 'warn');
        const head = data[0].map(h => HMAP[String(h).trim().toLowerCase().replace(/[\s.-]+/g, '_')] || '');
        if (head.indexOf('nama') < 0 || head.indexOf('identity_no') < 0) return A.toast('Kolom "nama" dan "identity_no" wajib ada di baris judul.', 'bad');
        rows = data.slice(1, 1001).map(r => { const o = {}; head.forEach((k, i) => { if (k) o[k] = String(r[i] === undefined ? '' : r[i]).trim(); }); return o; });
        hasil = null; kode = []; draw();
        if (data.length > 1001) A.toast('Hanya 1.000 baris pertama yang diproses.', 'warn');
      };
      fr.readAsText(file, 'utf-8');
    };
    const pick = () => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.csv,text/csv,text/plain'; i.onchange = () => load(i.files[0]); i.click(); };
    const drop = A.$('#drop', root);
    drop.onclick = pick; drop.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(); } };
    drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); }; drop.ondragleave = () => drop.classList.remove('over');
    drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); load(e.dataTransfer.files[0]); };
    A.$('#tpl', root).onclick = () => { const csv = '﻿nama,identity_no,email,role,jabatan,organisasi\nAnisa Rahma,0012345678,anisa@contoh.ac.id,user,Sekretaris,\nBudi Santoso,0012345679,,viewer,Anggota,\n'; const b64 = btoa(unescape(encodeURIComponent(csv))); A.download(b64, 'text/csv', 'contoh-impor-akun.csv'); };
    const send = async (dryRun, btn) => {
      A.busy(btn, true, dryRun ? 'Memeriksa…' : 'Membuat akun…');
      const r = await A.api('adm.import.users', { rows: rows, dryRun: dryRun, org_id: A.$('#dorg', root).value }, { timeout: 300000 });
      A.busy(btn, false);
      if (!r.success) return A.toast(r.message, 'bad');
      hasil = r.data; kode = r.data.kode || []; draw(); A.toast(r.message);
      if (!dryRun && kode.length) {
        const m = A.modal({ title: kode.length + ' akun dibuat', sticky: true, body: '<div class="banner warn mb16">' + I('alert') + '<div><b>Kode aktivasi hanya ditampilkan sekali.</b> Unduh daftarnya sekarang dan bagikan secara pribadi kepada masing-masing pengguna.</div></div><table class="tbl compact"><thead><tr><th>Nama</th><th>Nomor identitas</th><th>Kode</th></tr></thead><tbody>' + kode.slice(0, 50).map(k => '<tr><td>' + esc(k.nama) + '</td><td class="mono">' + esc(k.identity_no) + '</td><td class="mono" style="font-weight:700">' + esc(k.kode) + '</td></tr>').join('') + '</tbody></table>' + (kode.length > 50 ? '<p class="help mt8">… dan ' + (kode.length - 50) + ' lainnya di berkas unduhan.</p>' : ''), foot: '<button class="btn btn-primary" id="dlk">' + I('download', 'sm') + 'Unduh daftar kode (CSV)</button><button class="btn btn-secondary" data-x>Selesai</button>' });
        A.$('#dlk', m.el).onclick = () => { const csv = '﻿nama,identity_no,kode_aktivasi,berlaku_sampai\n' + kode.map(k => ['"' + k.nama.replace(/"/g, '""') + '"', '="' + k.identity_no + '"', k.kode, A.fmtDateTime(k.berlaku_sampai)].join(',')).join('\n'); A.download(btoa(unescape(encodeURIComponent(csv))), 'text/csv', 'kode-aktivasi-' + A.today() + '.csv'); };
      }
    };
    A.$('#chk', root).onclick = e => send(true, e.currentTarget);
    A.$('#run', root).onclick = async e => { if (!(await A.confirm({ title: 'Buat ' + hasil.siap + ' akun?', text: 'Akun dibuat dengan status "Belum aktivasi" dan kode aktivasi diterbitkan untuk masing-masing.', ok: 'Buat akun' }))) return; send(false, e.currentTarget); };
  }, { nav: 'adm-csv', roles: ADM, crumbs: ['Administrasi', 'Impor akun'] });

  /* ======================= PENGATURAN APLIKASI (SA) ======================= */
  const lum = hex => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return 0; return [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16) / 255).map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0); };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const crTag = c => c >= 4.5 ? '<span class="tag ok">' + I('check-c', 'sm') + c.toFixed(1) + ':1 · lulus AA</span>' : c >= 3 ? '<span class="tag warn">' + I('alert', 'sm') + c.toFixed(1) + ':1 · hanya teks besar/ikon</span>' : '<span class="tag bad">' + I('x', 'sm') + c.toFixed(1) + ':1 · ditolak</span>';
  A.route('/admin/pengaturan', async function (root) {
    root.innerHTML = A.skel(3, 60) + A.skel(6, 40);
    const r = await A.api('sa.settings.get', {});
    if (!r.success) { root.innerHTML = A.errorBox(r); return; }
    let d = r.data, s = Object.assign({}, d.settings), logo = d.logo, logoB64 = null, hapusLogo = false, dirty = false;
    A.beforeLeave = async () => !dirty || A.confirm({ title: 'Perubahan belum disimpan', text: 'Tinggalkan halaman tanpa menyimpan pengaturan?', ok: 'Tinggalkan', danger: true });
    const num = (k, l, a, b, help) => A.field({ id: 's_' + k, label: l, cls: 'w-third', help: help, input: '<input class="input mono" type="number" min="' + a + '" max="' + b + '" id="s_' + k + '" data-k="' + k + '" value="' + esc(s[k]) + '">' });
    root.innerHTML = '<div class="ph"><div><div class="tags"><span class="tag ink">' + I('lock', 'sm') + 'Super Admin</span></div><h1>Pengaturan Aplikasi</h1><p class="sub">Identitas, warna, keamanan masuk, kuota, dan retensi data. Rahasia (secret sesi, pepper PIN, ID spreadsheet) hanya tersimpan di Script Properties dan tidak pernah ditampilkan.</p></div></div>' +
      '<div class="grid" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:16px;align-items:start"><div class="col" style="gap:16px">' +
      '<section class="card"><div class="card-head"><h3>' + I('palette') + 'Identitas & tampilan</h3></div><div class="card-body"><div class="fgrid">' + A.field({ id: 's_nama_aplikasi', label: 'Nama aplikasi', req: 1, cls: 'w-half', input: '<input class="input" id="s_nama_aplikasi" data-k="nama_aplikasi" maxlength="40" value="' + esc(s.nama_aplikasi) + '">' }) + A.field({ id: 's_subjudul', label: 'Subjudul', cls: 'w-half', input: '<input class="input" id="s_subjudul" data-k="subjudul" maxlength="80" value="' + esc(s.subjudul) + '">' }) + '</div>' +
      '<div class="lbl mt16 mb8">Logo aplikasi</div><div class="row" style="gap:16px;align-items:center"><div class="brand-mark" id="lgp" style="width:72px;height:72px;border-radius:12px"></div><div class="col" style="gap:8px;align-items:flex-start"><span class="help">PNG/JPG/SVG (SVG diubah ke PNG), maks. 1 MB. Ditampilkan sebagai thumbnail di bilah samping & halaman masuk.</span><div class="row"><button class="btn btn-secondary btn-sm" id="lgu">' + I('upload', 'sm') + 'Unggah logo</button><button class="btn btn-ghost btn-sm" id="lgx">' + I('trash', 'sm') + 'Hapus</button></div></div></div>' +
      '<div class="fgrid mt16">' + ['warna_primer', 'warna_aksen'].map(k => '<div class="field w-half"><label for="c_' + k + '">' + (k === 'warna_primer' ? 'Warna utama (bilah, judul, tombol utama)' : 'Warna aksen (tautan, sorotan)') + '</label><div class="row" style="gap:8px"><input type="color" id="c_' + k + '" data-c="' + k + '" value="' + esc(s[k]) + '" style="width:46px;height:40px;border:1px solid var(--ctl);border-radius:var(--r);padding:2px;background:#fff" aria-label="Pilih warna"><input class="input mono" id="h_' + k + '" data-h="' + k + '" value="' + esc(s[k]) + '" maxlength="7" style="width:110px" aria-label="Kode warna heks"></div><div class="mt8" id="cr_' + k + '"></div></div>').join('') + '</div>' +
      A.field({ id: 's_banner', label: 'Pengumuman (tampil di atas semua halaman)', input: '<input class="input" id="s_banner" data-k="banner" maxlength="200" value="' + esc(s.banner) + '" placeholder="Kosongkan bila tidak ada">' }) + '</div></section>' +
      '<section class="card"><div class="card-head"><h3>' + I('shield') + 'Keamanan masuk</h3></div><div class="card-body"><div class="fgrid">' + num('maks_gagal_login', 'Batas gagal masuk', 3, 10, 'Akun dikunci setelah jumlah ini.') + num('menit_kunci', 'Lama kunci (menit)', 5, 120) + num('jam_sesi', 'Masa sesi (jam)', 1, 24) + num('kedaluwarsa_kode_hari', 'Kode aktivasi berlaku (hari)', 1, 30) + num('hari_aktif', 'Definisi pengguna aktif (hari)', 7, 180) + '</div></div></section>' +
      '<section class="card"><div class="card-head"><h3>' + I('database') + 'Penyimpanan & retensi</h3></div><div class="card-body"><div class="fgrid">' + num('maks_berkas_mb', 'Maks. ukuran berkas (MB)', 1, 25) + num('kuota_org_mb', 'Kuota bawaan organisasi (MB)', 10, 5000) + num('simpan_versi_otomatis', 'Versi otomatis disimpan', 5, 100, 'Per naskah. Versi manual & final tidak dihapus.') + num('hari_sampah', 'Sampah dikosongkan (hari)', 7, 90) + num('hari_ekspor', 'Arsip ekspor disimpan (hari)', 1, 60) + num('backup_simpan', 'Backup disimpan (jumlah)', 1, 20) + '</div>' +
      '<label class="switch mt16"><input type="checkbox" id="s_notif" ' + (s.notif_email === '1' ? 'checked' : '') + '> Kirim notifikasi email (berbagi naskah, komentar, ekspor)</label><p class="help mt8">Sisa kuota email hari ini: <b class="mono">' + (d.kuota.emailSisa === null ? '—' : d.kuota.emailSisa) + '</b> · PDF dibuat hari ini: <b class="mono">' + d.kuota.pdfHariIni + '</b></p></div></section></div>' +
      '<div class="col" style="gap:16px"><section class="card"><div class="card-head"><h3>' + I('eye') + 'Pratinjau tampilan</h3></div><div class="card-body" id="pvw"></div></section>' +
      '<section class="card"><div class="card-head"><h3>' + I('key') + 'Rahasia di Script Properties</h3></div><div class="card-body"><ul class="check-list">' + [['session_secret', 'SESSION_SECRET — tanda tangan sesi'], ['pin_pepper', 'PIN_PEPPER — pengaman hash PIN'], ['spreadsheet', 'SPREADSHEET_ID — basis data']].map(x => '<li class="' + (d.rahasia[x[0]] ? '' : 'no') + '">' + I(d.rahasia[x[0]] ? 'check-c' : 'alert', 'sm') + '<span class="grow mono" style="font-size:12.5px">' + esc(x[1]) + '</span>' + (d.rahasia[x[0]] ? '<span class="tag ok">Tersimpan</span>' : '<span class="tag bad">Belum ada</span>') + '</li>').join('') + '</ul><p class="help mt12">Nilai tidak pernah dikirim ke browser. Untuk mengeluarkan semua pengguna, jalankan <span class="code">rotasiSecretSesi()</span> dari editor Apps Script.</p></div></section>' +
      '<section class="card"><div class="card-head"><h3>' + I('activity') + 'Performa server</h3><button class="btn btn-ghost btn-xs" id="pf">' + I('refresh', 'sm') + 'Periksa</button></div><div class="card-body" id="perf"><p class="help">Klik Periksa untuk melihat status cache, pemanas (keepWarm), trigger, dan antrean email.</p></div></section>' +
      '<section class="card"><div class="card-head"><h3>' + I('lock') + 'Akses dukungan naskah</h3></div><div class="card-body"><p class="help mb12">Membuka isi naskah organisasi lain (hanya baca) untuk keperluan dukungan teknis. Setiap akses <b>dicatat di log audit beserta alasannya</b>.</p>' + A.field({ id: 'sdk', label: 'Kode atau ID naskah', input: '<input class="input mono" id="sdk" placeholder="NSK-2026-001">' }) + '<div class="mt12">' + A.field({ id: 'sda', label: 'Alasan akses (min. 10 karakter)', input: '<input class="input" id="sda" maxlength="300">' }) + '</div><button class="btn btn-secondary btn-sm mt12" id="sdo">' + I('eye', 'sm') + 'Buka (tercatat)</button></div></section></div></div>' +
      '<div class="sticky-bar"><button class="btn btn-ghost" id="rst">' + I('refresh', 'sm') + 'Kembalikan tampilan bawaan</button><span class="note" id="dn">Tidak ada perubahan.</span><span class="sp"></span><button class="btn btn-primary" id="sv">' + I('save', 'sm') + 'Simpan Pengaturan</button></div>';
    const preview = () => {
      A.$('#lgp', root).innerHTML = logo ? '<img alt="Logo" src="' + logo + '" style="width:100%;height:100%;object-fit:contain">' : I('file-plus', 'lg');
      ['warna_primer', 'warna_aksen'].forEach(k => { A.$('#cr_' + k, root).innerHTML = '<span class="help">Kontras dengan teks putih: </span>' + crTag(contrast(s[k], '#FFFFFF')); });
      A.$('#pvw', root).innerHTML = '<div style="border:1px solid var(--line-2);border-radius:10px;overflow:hidden;display:grid;grid-template-columns:120px 1fr;min-height:180px"><div style="background:#fff;border-right:1px solid var(--line-2);padding:12px"><div class="row" style="gap:8px;flex-wrap:nowrap"><div style="width:28px;height:28px;border-radius:6px;background:' + esc(s.warna_primer) + ';display:grid;place-items:center;overflow:hidden;flex:none">' + (logo ? '<img alt="" src="' + logo + '" style="width:100%;height:100%;object-fit:contain;background:#fff">' : '') + '</div><b style="font-size:12px;color:' + esc(s.warna_primer) + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(s.nama_aplikasi) + '</b></div><div style="margin-top:14px;padding:6px 8px;border-radius:6px;background:' + esc(s.warna_primer) + ';color:#fff;font-size:11px">Beranda</div><div style="margin-top:4px;padding:6px 8px;font-size:11px;color:#5A636C">Naskah Saya</div></div>' +
        '<div style="padding:14px;background:#F7F8FA"><div style="font-weight:700;color:' + esc(s.warna_primer) + ';font-size:15px">Judul halaman</div><div style="font-size:11.5px;color:#5A636C;margin:4px 0 10px">' + esc(s.subjudul) + '</div><div class="row" style="gap:6px"><span style="background:' + esc(s.warna_primer) + ';color:#fff;padding:6px 10px;border-radius:6px;font-size:11.5px;font-weight:600">Tombol utama</span><span style="color:' + esc(s.warna_aksen) + ';font-size:11.5px;text-decoration:underline">Tautan</span></div>' + (s.banner ? '<div style="margin-top:10px;font-size:11px;background:#FEF7E0;color:#8A5A00;padding:6px 8px;border-radius:6px">' + esc(s.banner) + '</div>' : '') + '</div></div>';
    };
    const touch = () => { dirty = true; A.$('#dn', root).textContent = 'Ada perubahan yang belum disimpan.'; preview(); };
    preview();
    root.addEventListener('input', e => {
      const t = e.target;
      if (t.dataset.k) { s[t.dataset.k] = t.value; touch(); }
      if (t.dataset.c) { s[t.dataset.c] = t.value.toUpperCase(); A.$('#h_' + t.dataset.c, root).value = s[t.dataset.c]; touch(); }
      if (t.dataset.h && /^#[0-9a-f]{6}$/i.test(t.value)) { s[t.dataset.h] = t.value.toUpperCase(); A.$('#c_' + t.dataset.h, root).value = t.value; touch(); }
      if (t.id === 's_notif') { s.notif_email = t.checked ? '1' : '0'; touch(); }
    });
    A.$('#s_notif', root).onchange = e => { s.notif_email = e.target.checked ? '1' : '0'; touch(); };
    A.$('#lgu', root).onclick = () => {
      const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/png,image/jpeg,image/svg+xml';
      inp.onchange = async () => { const f = inp.files[0]; if (!f) return; try { const x = await A.readFile(f); if (x.size > 1048576) return A.toast('Ukuran logo maksimal 1 MB.', 'bad'); logoB64 = x.b64; hapusLogo = false; logo = 'data:image/' + (/\.png$/i.test(x.nama) || x.converted ? 'png' : 'jpeg') + ';base64,' + x.b64; touch(); } catch (e) { A.toast(e.message, 'bad'); } };
      inp.click();
    };
    A.$('#lgx', root).onclick = () => { logo = ''; logoB64 = null; hapusLogo = true; touch(); };
    A.$('#rst', root).onclick = async () => { if (!(await A.confirm({ text: 'Kembalikan nama, subjudul, warna, dan logo ke bawaan SIPENA?', ok: 'Kembalikan' }))) return; save({ reset: true }); };
    const save = async (extra) => {
      const btn = A.$('#sv', root);
      const bad = ['warna_primer', 'warna_aksen'].filter(k => contrast(s[k], '#FFFFFF') < 3);
      if (bad.length && !(extra && extra.reset)) return A.toast('Kontras warna terlalu rendah — pilih warna yang lebih gelap.', 'bad');
      A.busy(btn, true, 'Menyimpan…');
      const body = { settings: { nama_aplikasi: s.nama_aplikasi, subjudul: s.subjudul, banner: s.banner, warna_primer: s.warna_primer, warna_aksen: s.warna_aksen, notif_email: s.notif_email === '1' } };
      ['maks_gagal_login', 'menit_kunci', 'jam_sesi', 'hari_aktif', 'maks_berkas_mb', 'kuota_org_mb', 'simpan_versi_otomatis', 'hari_sampah', 'hari_ekspor', 'backup_simpan', 'kedaluwarsa_kode_hari'].forEach(k => { body.settings[k] = s[k]; });
      if (logoB64) body.logo_b64 = logoB64; if (hapusLogo) body.hapus_logo = true;
      const x = await A.api('sa.settings.save', Object.assign(body, extra || {}));
      A.busy(btn, false);
      if (!x.success) return A.toast(x.message, 'bad');
      d = x.data; s = Object.assign({}, d.settings); logo = d.logo; logoB64 = null; hapusLogo = false; dirty = false;
      const pub = {}; ['nama_aplikasi', 'subjudul', 'warna_primer', 'warna_aksen', 'banner', 'maks_berkas_mb', 'hari_aktif'].forEach(k => { pub[k] = s[k]; }); pub.logo = logo;
      A.LS.set('pub', pub);
      const boot = Object.assign({}, S.boot); boot.settings = Object.assign({}, boot.settings, pub); S.update(boot);
      A._shell = null; A.toast('Pengaturan disimpan.'); A.render();
    };
    A.$('#sv', root).onclick = () => save();
    A.$('#pf', root).onclick = async e => {
      A.busy(e.currentTarget, true, 'Memeriksa…');
      const x = await A.api('sa.perf', {});
      A.busy(e.currentTarget, false);
      if (!x.success) return A.toast(x.message, 'bad');
      const p = x.data;
      A.$('#perf', root).innerHTML = '<table class="tbl compact"><tbody>' + Object.keys(p.cache).map(k => '<tr><td>Cache ' + esc(k) + '</td><td class="num">' + (p.cache[k] === 'HANGAT' ? '<span class="tag ok">' + I('check-c', 'sm') + 'Hangat</span>' : '<span class="tag">' + I('clock', 'sm') + 'Dingin</span>') + '</td></tr>').join('') +
        '<tr><td>Pemanas otomatis (keepWarm)</td><td class="num">' + (p.keepWarm === 'aktif' ? '<span class="tag ok">Aktif</span>' : '<span class="tag">Nonaktif</span>') + '</td></tr><tr><td>Trigger terpasang</td><td class="num mono" style="font-size:12px">' + esc(p.trigger.join(', ') || '—') + '</td></tr><tr><td>Antrean email</td><td class="num mono">' + p.antreanEmail + (p.emailGagal ? ' · ' + p.emailGagal + ' gagal' : '') + '</td></tr><tr><td>Script Properties</td><td class="num mono">' + p.scriptPropertiesKB + ' / ' + p.batasPropertiesKB + ' KB</td></tr>' +
        Object.keys(p.baris || {}).map(k => '<tr><td>Baris ' + esc(k) + '</td><td class="num mono">' + A.fmtNum(p.baris[k]) + '</td></tr>').join('') + '<tr><td>Pemanasan terakhir</td><td class="num mono" style="font-size:12px">' + (p.pemanasanTerakhir ? esc(A.fmtRel(p.pemanasanTerakhir.at)) + ' (' + esc(p.pemanasanTerakhir.scope) + ')' : '—') + '</td></tr></tbody></table><p class="help mt8">Versi server ' + esc(p.versi) + '. Ukur kecepatan dari browser dengan <span class="code">Perf.table()</span> di Console.</p>';
    };
    A.$('#sdo', root).onclick = async e => {
      const id = A.$('#sdk', root).value.trim(), alasan = A.$('#sda', root).value.trim();
      if (!id) return A.toast('Isi kode naskah.', 'warn');
      A.busy(e.currentTarget, true, 'Membuka…');
      const x = await A.api('sa.doc.open', { id: id, alasan: alasan });
      A.busy(e.currentTarget, false);
      if (!x.success) return A.toast(x.message, 'bad');
      const m = A.modal({ title: x.data.doc.kode + ' · ' + x.data.doc.judul, size: 'xl', body: '<div class="banner warn mb16">' + I('eye') + '<div>Akses dukungan — hanya baca. Akses ini telah dicatat di log audit.</div></div><div class="well" id="sdv" style="display:flex;justify-content:center;max-height:70vh;overflow:auto"></div>' });
      A.Doc.mountPreview(A.$('#sdv', m.el), x.data.content, { scale: 0.62, docId: x.data.doc.id, meta: { today: A.today(), kode: x.data.doc.kode, judul: x.data.doc.judul } });
    };
  }, { nav: 'sa-set', roles: SA, crumbs: ['Super Admin', 'Pengaturan aplikasi'] });

  /* ======================= BACKUP (SA) ======================= */
  A.route('/admin/backup', async function (root) {
    root.innerHTML = '<div class="ph"><div><div class="tags"><span class="tag ink">' + I('lock', 'sm') + 'Super Admin</span><span class="tag">Otomatis tiap Minggu 01.00 WIB</span></div><h1>Backup Data</h1><p class="sub">Setiap backup menyalin spreadsheet basis data dan mengemas isi seluruh naskah & template (JSON) ke folder Drive tersendiri. Backup lama dibersihkan otomatis.</p></div><div class="acts"><button class="btn btn-primary" id="run">' + I('database', 'sm') + 'Backup Sekarang</button></div></div>' +
      '<section class="card"><div class="tbl-wrap" id="list">' + A.skel(5, 36) + '</div></section>' +
      '<div class="banner mt16">' + I('info') + '<div><b>Memulihkan data:</b> buka folder backup di Drive, buat salinan spreadsheet “Database SIPENA — …”, lalu ganti nilai <span class="code">SPREADSHEET_ID</span> di Script Properties dengan ID salinan tersebut. Isi naskah tersimpan sebagai berkas JSON di arsip ZIP pada folder yang sama.</div></div>';
    const draw = d => {
      A.$('#list', root).innerHTML = d.items.length ? '<table class="tbl cards"><thead><tr><th>Waktu</th><th>Jenis</th><th class="num">Berkas</th><th class="num">Ukuran isi</th><th>Status</th><th>Catatan</th><th class="t-act"></th></tr></thead><tbody>' + d.items.map(b => '<tr><td data-l="Waktu" class="mono" style="font-size:12.5px;white-space:nowrap">' + esc(A.fmtDateTime(b.waktu)) + '</td><td data-l="Jenis">' + esc(b.jenis) + '</td><td data-l="Berkas" class="num mono">' + b.berkas + '</td><td data-l="Ukuran" class="num mono">' + A.fmtBytes(b.ukuran) + '</td><td data-l="Status">' + (b.status === 'berhasil' ? '<span class="tag ok">' + I('check-c', 'sm') + 'Berhasil</span>' : b.status === 'dihapus' ? '<span class="tag">' + I('trash', 'sm') + 'Dibersihkan</span>' : '<span class="tag bad">' + I('alert', 'sm') + 'Gagal</span>') + '</td><td data-l="Catatan" class="help">' + esc(b.catatan) + '</td><td class="t-act">' + (b.folder_url && b.status === 'berhasil' ? '<a class="btn btn-ghost btn-sm" target="_blank" rel="noopener" href="' + esc(b.folder_url) + '">' + I('external', 'sm') + 'Buka di Drive</a>' : '') + '</td></tr>').join('') + '</tbody></table><div class="tbl-foot"><span class="help">Menyimpan ' + d.simpan + ' backup berhasil terakhir (atur di Pengaturan).</span></div>' : A.empty('database', 'Belum ada backup', 'Jalankan backup pertama sekarang.');
    };
    const load = async () => { const r = await A.api('sa.backup.list', {}); if (!r.success) { A.$('#list', root).innerHTML = A.errorBox(r); return; } draw(r.data); };
    A.$('#run', root).onclick = async e => {
      if (!(await A.confirm({ title: 'Jalankan backup sekarang?', text: 'Proses dapat memakan waktu hingga beberapa menit tergantung jumlah naskah.', ok: 'Mulai backup' }))) return;
      A.busy(e.currentTarget, true, 'Mencadangkan…');
      const r = await A.api('sa.backup.run', {}, { timeout: 360000 });
      A.busy(e.currentTarget, false);
      if (!r.success) return A.toast(r.message, 'bad');
      A.toast('Backup selesai.'); draw(r.data);
    };
    load();
  }, { nav: 'sa-backup', roles: SA, crumbs: ['Super Admin', 'Backup'] });

  /* ======================= MIGRASI DATA (SA) ======================= */
  const PLAN = [['Organizations', 'Organisasi', 1], ['OrgOfficers', 'Pengurus organisasi', 1], ['Categories', 'Kategori', 1], ['Templates', 'Template', 1], ['TemplateVersions', 'Versi template', 1], ['Users', 'Pengguna', 1], ['AdminScope', 'Penugasan admin', 1], ['Documents', 'Naskah', 1], ['DocumentVersions', 'Riwayat versi naskah', 1], ['DocumentShares', 'Berbagi naskah', 1], ['Comments', 'Komentar', 1], ['Files', 'Berkas pustaka', 1], ['ActivityLog', 'Log aktivitas (besar, opsional)', 0]];
  A.route('/admin/migrasi', async function (root) {
    root.innerHTML = '<div class="ph"><div><div class="tags"><span class="tag ink">' + I('lock', 'sm') + 'Super Admin</span><span class="tag">Aman diulang</span></div><h1>Migrasi Data dari SIPENA Lama</h1><p class="sub">Salin data dari spreadsheet aplikasi versi sebelumnya. Spreadsheet lama <b>hanya dibaca</b> — tidak ada yang diubah. Data dicocokkan berdasarkan kunci (ID, nomor identitas, kode kategori), sehingga impor ulang tidak membuat data ganda.</p></div></div>' +
      '<div class="grid" style="grid-template-columns:minmax(0,1fr) minmax(0,1.4fr);gap:16px;align-items:start"><section class="card card-pad">' + A.field({ id: 'src', label: 'URL atau ID spreadsheet lama', req: 1, help: 'Harus milik akun Google yang sama dengan aplikasi ini agar berkas Drive (logo, gambar, isi naskah) tetap terbaca.', input: '<input class="input mono" id="src" placeholder="https://docs.google.com/spreadsheets/d/…">' }) +
      '<div class="lbl mt16 mb8">Data yang diimpor</div><div class="col" style="gap:6px">' + PLAN.map(x => '<label class="check" style="display:flex"><input type="checkbox" data-sh="' + x[0] + '" ' + (x[2] ? 'checked' : '') + '> ' + esc(x[1]) + '</label>').join('') + '</div>' +
      '<label class="switch mt16"><input type="checkbox" id="ow"> Timpa data yang sudah ada di aplikasi ini</label><p class="help mt8">Biarkan nonaktif: data yang sudah diubah di aplikasi baru tidak akan ditimpa. Naskah hanya diperbarui bila versi di aplikasi lama lebih baru.</p>' +
      '<div class="row mt16 wrap"><button class="btn btn-secondary" id="scan">' + I('search', 'sm') + 'Pindai (tanpa menulis)</button><button class="btn btn-primary" id="go" disabled>' + I('import', 'sm') + 'Jalankan Impor</button></div></section>' +
      '<section class="card"><div class="card-head"><h3>' + I('table') + 'Laporan</h3><span class="eyebrow" id="mode"></span></div><div id="rep"><div class="card-body">' + A.empty('refresh', 'Belum dipindai', 'Tempel alamat spreadsheet lama lalu klik Pindai.') + '</div></div></section></div>' +
      '<section class="card card-pad mt16"><h3 style="font-size:15px" class="mb8">' + I('clipboard', 'sm') + ' Langkah pindah (cutover)</h3><ol style="margin:0;padding-left:20px;line-height:1.9;font-size:14px"><li>Pindai, periksa laporan & peringatan, lalu <b>Jalankan Impor</b>.</li><li>Periksa Pengguna, Organisasi, Template, dan beberapa naskah. Uji masuk dengan satu akun pengguna.</li><li>Tepat sebelum pindah, <b>jalankan impor sekali lagi</b> untuk menyalin data baru dari aplikasi lama (delta).</li><li>Umumkan alamat baru. Sesi masuk lama tidak ikut pindah — pengguna cukup masuk ulang.</li><li>PIN lama hanya berlaku bila <span class="code">PIN_PEPPER</span> sama dengan proyek lama; bila tidak, gunakan Reset PIN.</li></ol></section>';
    let scanned = false;
    const sheets = () => A.$$('[data-sh]', root).filter(x => x.checked).map(x => x.dataset.sh);
    const draw = d => {
      A.$('#mode', root).textContent = (d.dryRun ? 'Hasil pindai' : 'Hasil impor') + ' · ' + d.source.name;
      const rep = d.report, ks = Object.keys(rep);
      A.$('#rep', root).innerHTML = (d.dryRun ? '<div class="banner mb0" style="border-radius:0">' + I('info') + '<div>Pindai tidak menulis apa pun. Angka di bawah adalah perkiraan bila impor dijalankan.</div></div>' : '<div class="banner ok" style="border-radius:0">' + I('check-c') + '<div>Impor selesai. Cache aplikasi sudah dibersihkan.</div></div>') +
        '<table class="tbl compact"><thead><tr><th>Data</th><th class="num">Di aplikasi lama</th><th class="num">Ditambah</th><th class="num">Diperbarui</th><th class="num">Dilewati</th></tr></thead><tbody>' + ks.map(k => { const x = rep[k], lb = (PLAN.find(p => p[0] === k) || [k, k])[1]; return '<tr><td>' + esc(lb) + (x.catatan ? '<div class="t-sub">' + esc(x.catatan) + '</div>' : '') + '</td><td class="num mono">' + x.source + '</td><td class="num mono">' + (x.inserted ? '+' + x.inserted : '0') + '</td><td class="num mono">' + x.updated + '</td><td class="num mono">' + x.skipped + '</td></tr>'; }).join('') + '</tbody></table>' +
        (d.warnings.length ? '<div class="card-body"><div class="lbl mb8">' + I('alert', 'sm') + ' Peringatan</div><ul style="margin:0;padding-left:18px;line-height:1.7;font-size:13.5px">' + d.warnings.map(w => '<li>' + esc(w) + '</li>').join('') + '</ul></div>' : '');
    };
    const run = async (dry, btn) => {
      const src = A.$('#src', root).value.trim(); if (!src) return A.toast('Tempel URL atau ID spreadsheet lama.', 'warn');
      if (!sheets().length) return A.toast('Pilih minimal satu jenis data.', 'warn');
      A.busy(btn, true, dry ? 'Memindai…' : 'Mengimpor…');
      const r = await A.api('sa.import', { source: src, sheets: sheets(), dryRun: dry, overwrite: A.$('#ow', root).checked }, { timeout: 360000 });
      A.busy(btn, false);
      if (!r.success) return A.toast(r.message, 'bad');
      draw(r.data); A.toast(r.message);
      if (dry) { scanned = true; A.$('#go', root).disabled = false; } else { A.invalidate(); A.fileCache.clear(); }
    };
    A.$('#src', root).oninput = () => { scanned = false; A.$('#go', root).disabled = true; };
    A.$('#scan', root).onclick = e => run(true, e.currentTarget);
    A.$('#go', root).onclick = async e => { if (!scanned) return; if (!(await A.confirm({ title: 'Jalankan impor?', text: 'Data dari spreadsheet lama ditambahkan ke aplikasi ini. Proses aman diulang (tidak membuat data ganda).', ok: 'Jalankan impor' }))) return; run(false, e.currentTarget); };
  }, { nav: 'sa-import', roles: SA, crumbs: ['Super Admin', 'Migrasi data'] });
})();
