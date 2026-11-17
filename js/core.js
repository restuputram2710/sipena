/* ==========================================================================
 * SIPENA — core.js : klien API (fetch text/plain, batch otomatis, dedupe,
 * pengukur), sesi, cache SWR, router hash, kerangka aplikasi, komponen UI.
 * ========================================================================== */
(function () {
  'use strict';
  const CFG = window.APP_CONFIG || {};
  const App = window.App = { v: '1.0.0', pages: {}, cleanup: [] };

  /* ---------------- util ---------------- */
  const esc = App.esc = s => String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  App.$ = (s, el) => (el || document).querySelector(s);
  App.$$ = (s, el) => Array.from((el || document).querySelectorAll(s));
  App.debounce = (fn, ms) => { let t; const f = function () { clearTimeout(t); const a = arguments; t = setTimeout(() => fn.apply(null, a), ms); }; f.cancel = () => clearTimeout(t); f.flush = function () { clearTimeout(t); fn.apply(null, arguments); }; return f; };
  App.on = (root, ev, sel, fn) => { const h = e => { const t = e.target.closest(sel); if (t && root.contains(t)) fn(e, t); }; root.addEventListener(ev, h); return () => root.removeEventListener(ev, h); };
  App.uid = () => 'b' + Math.random().toString(36).slice(2, 9) + (Date.now() % 1e6).toString(36);
  App.clone = o => JSON.parse(JSON.stringify(o));
  App.sleep = ms => new Promise(r => setTimeout(r, ms));
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  App.fmtDate = iso => { if (!iso) return '—'; const d = new Date(iso); if (isNaN(d)) return esc(iso); return d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear(); };
  App.fmtTime = iso => { const d = new Date(iso); return isNaN(d) ? '' : String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
  App.fmtDateTime = iso => iso ? App.fmtDate(iso) + ', ' + App.fmtTime(iso) : '—';
  App.fmtRel = iso => {
    if (!iso) return '—'; const d = new Date(iso), now = new Date(), diff = (now - d) / 1000;
    if (diff < 60) return 'Baru saja'; if (diff < 3600) return Math.floor(diff / 60) + ' menit lalu';
    const sameDay = (a, b) => a.toDateString() === b.toDateString(), y = new Date(now); y.setDate(now.getDate() - 1);
    if (sameDay(d, now)) return 'Hari ini, ' + App.fmtTime(iso);
    if (sameDay(d, y)) return 'Kemarin, ' + App.fmtTime(iso);
    return App.fmtDate(iso);
  };
  App.fmtBytes = n => { n = +n || 0; if (n < 1024) return n + ' B'; if (n < 1048576) return (n / 1024).toFixed(n < 10240 ? 1 : 0).replace('.', ',') + ' KB'; return (n / 1048576).toFixed(1).replace('.', ',') + ' MB'; };
  App.fmtNum = n => SipenaModel.angka(n);
  App.initials = s => String(s || '?').split(/\s+/).filter(w => /^[A-Za-z]/.test(w)).slice(0, 2).map(w => w[0].toUpperCase()).join('') || '?';
  App.today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  App.JENIS = { proposal: 'Proposal', adart: 'AD/ART', proker: 'Program Kerja', laporan: 'Laporan', surat: 'Surat', umum: 'Umum' };
  App.STATUS = { draft: ['Draft', 'warn dash', 'edit'], penyuntingan: ['Proses Penyuntingan', 'blue', 'dot'], selesai: ['Selesai', 'ok', 'check'] };
  App.statusTag = s => { const x = App.STATUS[s] || [s, '', 'dot']; return '<span class="tag ' + x[1] + '">' + (x[2] === 'dot' ? '<span class="dot"></span>' : App.icon(x[2], 'sm')) + esc(x[0]) + '</span>'; };

  /* ---------------- ikon (garis, 24px) ---------------- */
  const IC = {
    grid: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z', file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h6',
    'file-plus': 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M12 12v6M9 15h6', share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75', user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
    'user-plus': 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 8v6M23 11h-6', building: 'M4 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18M16 9h3a2 2 0 0 1 2 2v11M2 22h20M8 7h4M8 11h4M8 15h4',
    images: 'M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21', archive: 'M3 4h18v4H3zM5 8v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4',
    sliders: 'M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6', layers: 'M12 2 2 7l10 5 10-5zM2 17l10 5 10-5M2 12l10 5 10-5', plus: 'M12 5v14M5 12h14',
    search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35', bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
    help: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3M12 17h.01', logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
    'chev-r': 'M9 18l6-6-6-6', 'chev-l': 'M15 18l-6-6 6-6', 'chev-d': 'M6 9l6 6 6-6', 'chev-u': 'M18 15l-6-6-6 6', 'arrow-r': 'M5 12h14M12 5l7 7-7 7', 'arrow-l': 'M19 12H5M12 19l-7-7 7-7',
    'arrow-u': 'M12 19V5M5 12l7-7 7 7', 'arrow-d': 'M12 5v14M19 12l-7 7-7-7', x: 'M18 6 6 18M6 6l12 12', check: 'M20 6 9 17l-5-5', 'check-c': 'M22 11.08V12a10 10 0 1 1-5.93-9.14M22 4 12 14.01l-3-3',
    alert: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01', info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
    history: 'M3 3v5h5M3.05 13A9 9 0 1 0 6 5.3L3 8M12 7v5l4 2', clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2', eye: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
    download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3', upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
    'cloud-up': 'M16 16l-4-4-4 4M12 12v9M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3', 'cloud-ok': 'M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3M9 15l2 2 4-4',
    edit: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z', copy: 'M9 9h11v11H9zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1',
    trash: 'M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2', more: 'M12 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM12 6a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM12 20a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
    filter: 'M22 3H2l8 9.46V19l4 2v-8.54z', refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15', save: 'M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8',
    printer: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z', link: 'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
    lock: 'M5 11h14v10H5zM8 11V7a4 4 0 1 1 8 0v4', unlock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 7.9-1', key: 'M15.5 7.5 19 4l3 3-3.5 3.5M21 2l-9.6 9.6M7.5 21a5.5 5.5 0 1 1 0-11 5.5 5.5 0 0 1 0 11z',
    list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01', 'list-o': 'M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1', table: 'M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18',
    image: 'M3 3h18v18H3zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM21 15l-5-5L5 21', bold: 'M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z', italic: 'M19 4h-9M14 20H5M15 4 9 20', underline: 'M6 3v7a6 6 0 0 0 12 0V3M4 21h16',
    'al-l': 'M17 10H3M21 6H3M21 14H3M17 18H3', 'al-c': 'M18 10H6M21 6H3M21 14H3M18 18H6', 'al-r': 'M21 10H7M21 6H3M21 14H3M21 18H7', 'al-j': 'M21 10H3M21 6H3M21 14H3M21 18H3',
    indent: 'M3 8l4 4-4 4M21 12H11M21 6H11M21 18H11', undo: 'M3 7v6h6M21 17a9 9 0 0 0-15-6.7L3 13', redo: 'M21 7v6h-6M3 17a9 9 0 0 1 15-6.7L21 13', msg: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
    mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM22 6l-10 7L2 6', calendar: 'M3 4h18v18H3zM16 2v4M8 2v4M3 10h18',
    database: 'M12 8c4.97 0 9-1.34 9-3s-4.03-3-9-3-9 1.34-9 3 4.03 3 9 3zM21 12c0 1.66-4 3-9 3s-9-1.34-9-3M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5', shield: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
    chart: 'M12 20V10M18 20V4M6 20v-4', activity: 'M22 12h-4l-3 9L9 3l-3 9H2', grip: 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01', menu: 'M3 12h18M3 6h18M3 18h18',
    type: 'M4 7V4h16v3M9 20h6M12 4v16', cut: 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12',
    braces: 'M8 3H7a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2 2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h1M16 21h1a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2 2 2 0 0 1-2-2V5a2 2 0 0 0-2-2h-1', tree: 'M3 3h6v6H3zM15 15h6v6h-6zM6 9v3a3 3 0 0 0 3 3h6',
    sign: 'M12 19l7-7 3 3-7 7zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18zM2 2l7.59 7.59M11 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z', scale: 'M12 3v18M5 21h14M3 7h18M6 7l-3 7a3 3 0 0 0 6 0zM18 7l-3 7a3 3 0 0 0 6 0z',
    clipboard: 'M9 2h6v4H9zM16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 12h6M9 16h4', report: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 18v-3M12 18v-6M16 18v-4',
    send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z', external: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3', layout: 'M3 3h18v18H3zM3 9h18M9 21V9',
    hash: 'M4 9h16M4 15h16M10 3 8 21M16 3l-2 18', palette: 'M12 22a10 10 0 1 1 10-10c0 2.8-2.2 4-4 4h-2a2 2 0 0 0-1 3.7A2 2 0 0 1 12 22zM7.5 10.5h.01M12 7.5h.01M16.5 10.5h.01',
    wand: 'M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M15 9h.01M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5', power: 'M18.36 6.64a9 9 0 1 1-12.73 0M12 2v10', play: 'M5 3l14 9-14 9z',
    import: 'M12 3v12M7 10l5 5 5-5M5 21h14', home: 'M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z', columns: 'M12 3v18M3 3h18v18H3z', zoom: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.35-4.35M11 8v6M8 11h6'
  };
  App.icon = (n, cls) => '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true"><path d="' + (IC[n] || IC.info) + '"/></svg>';
  const I = App.icon;

  /* ---------------- pengukur kinerja ---------------- */
  const Perf = window.Perf = { log: [],
    add(e) { this.log.push(e); if (this.log.length > 300) this.log.shift(); },
    table() { console.table(this.log.slice(-40).map(e => ({ aksi: e.a, total_ms: e.t, server_ms: e.s, jaringan_ms: e.t - (e.s || 0), cache: e.c ? '✓' : '', batch: e.b || '' }))); },
    summary() { const g = {}; this.log.forEach(e => { (g[e.a] = g[e.a] || []).push(e.t); }); console.table(Object.keys(g).map(a => ({ aksi: a, n: g[a].length, rata2_ms: Math.round(g[a].reduce((x, y) => x + y, 0) / g[a].length) }))); } };

  /* ---------------- sesi ---------------- */
  const LS = { get: k => { try { return JSON.parse(localStorage.getItem('sipena.' + k)); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem('sipena.' + k, JSON.stringify(v)); } catch (e) { /* penuh */ } }, del: k => { try { localStorage.removeItem('sipena.' + k); } catch (e) { /* abaikan */ } } };
  App.LS = LS;
  const Sess = App.session = {
    token: LS.get('token') || '', boot: LS.get('boot') || null,
    set(token, boot) { this.token = token; this.boot = boot; LS.set('token', token); LS.set('boot', boot); App.applyTheme(boot && boot.settings); },
    update(boot) { this.boot = boot; LS.set('boot', boot); App.applyTheme(boot.settings); },
    clear() { this.token = ''; this.boot = null; LS.del('token'); LS.del('boot'); Object.keys(localStorage).filter(k => /^sipena\.c\./.test(k)).forEach(k => localStorage.removeItem(k)); App.fileCache.clear(); },
    get me() { return this.boot && this.boot.me; }, get role() { return this.me ? this.me.role : ''; },
    isAdmin() { return this.role === 'admin' || this.role === 'superadmin'; }, isSA() { return this.role === 'superadmin'; },
    expired() { if (!this.token) return; this.clear(); App.toast('Sesi berakhir. Silakan masuk kembali.', 'warn'); App.go('#/masuk'); }
  };

  /* ---------------- klien API ---------------- */
  const READ = /^(boot|app\.public|dash\.get|org\.get|tpl\.(list|get)|doc\.(list|sources|get|versions|version\.get|syncOrg)|share\.list|shared\.list|users\.lookup|comment\.list|file\.(list|get)|log\.mine|adm\.(dash|users|orgs|tpl\.list|tpl\.get|cat\.list|logs)|sa\.(settings\.get|backup\.list|perf))$/;
  const inflight = {}; let epoch = 0;
  App.configured = () => !!CFG.GAS_URL && !/GANTI|XXXX/.test(CFG.GAS_URL);
  async function run(action, data, opts) {
    opts = opts || {};
    if (!App.configured()) return { success: false, code: 'CONFIG', message: 'Konfigurasi belum lengkap: isi GAS_URL di js/config.js dengan URL /exec dari Apps Script.' };
    const t0 = performance.now(); let res;
    try {
      const ctl = new AbortController(), tm = setTimeout(() => ctl.abort(), opts.timeout || 90000);
      const r = await fetch(CFG.GAS_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: action, token: Sess.token, data: data || {} }), signal: ctl.signal, redirect: 'follow' });
      clearTimeout(tm);
      res = await r.json();
    } catch (e) {
      res = { success: false, code: 'NET', message: e.name === 'AbortError' ? 'Server terlalu lama merespons. Coba lagi.' : 'Tidak dapat terhubung ke server. Periksa koneksi internet Anda.' };
    }
    Perf.add({ a: action, t: Math.round(performance.now() - t0), s: res.ms, c: !!res.cached, b: opts.batch });
    App.net(res.code !== 'NET');
    if (res.code === 'AUTH' && action !== 'auth.login') Sess.expired();
    if (res.nq > 0) scheduleDrain();
    return res;
  }
  App.api = function (action, data, opts) {
    if (!READ.test(action)) { epoch++; return run(action, data, opts); }
    const k = epoch + '|' + action + '|' + JSON.stringify(data || {});
    if (inflight[k]) return inflight[k];
    const p = run(action, data, opts); inflight[k] = p;
    p.then(() => delete inflight[k], () => delete inflight[k]);
    return p;
  };
  /** Penggabung otomatis: panggilan baca pada tik yang sama → satu eksekusi 'batch'. */
  const Batcher = { q: null,
    add(action, data) { return new Promise(res => { if (!this.q) { this.q = []; setTimeout(() => this.flush(), 0); } this.q.push({ action: action, data: data || {}, res: res }); }); },
    async flush() {
      const q = this.q; this.q = null;
      const uniq = []; q.forEach(c => { const k = c.action + JSON.stringify(c.data); let u = uniq.find(x => x.k === k); if (!u) { u = { k: k, action: c.action, data: c.data, cbs: [] }; uniq.push(u); } u.cbs.push(c.res); });
      for (let i = 0; i < uniq.length; i += 10) {
        const part = uniq.slice(i, i + 10);
        if (part.length === 1) { const r = await App.api(part[0].action, part[0].data); part[0].cbs.forEach(cb => cb(r)); continue; }
        const r = await run('batch', { calls: part.map(u => ({ action: u.action, data: u.data })) }, { batch: part.length });
        part.forEach((u, j) => { const x = r.success ? r.data[j] : r; u.cbs.forEach(cb => cb(x)); });
      }
    } };
  App.q = (action, data) => READ.test(action) ? Batcher.add(action, data) : App.api(action, data);
  /** Ambil dengan cache lokal (SWR): tampil seketika dari cache, segarkan bila usia > maxAge. */
  App.swr = async function (key, action, data, maxAge, onData) {
    const c = LS.get('c.' + key);
    if (c && onData) onData(c.d, true);
    if (c && Date.now() - c.t < (maxAge || 30000)) return c.d;
    const r = await App.q(action, data);
    if (r.success) { LS.set('c.' + key, { t: Date.now(), d: r.data }); if (onData && JSON.stringify(c && c.d) !== JSON.stringify(r.data)) onData(r.data, false); return r.data; }
    if (!c) throw r;
    return c.d;
  };
  App.invalidate = prefix => Object.keys(localStorage).filter(k => k.indexOf('sipena.c.' + (prefix || '')) === 0).forEach(k => localStorage.removeItem(k));
  const scheduleDrain = App.debounce(async function () {
    for (let i = 0; i < 3; i++) { const r = await run('drain', {}); if (!r.success || !r.data || !r.data.left) break; }
  }, 400);
  App.warm = function (scope) {
    if (!App.configured()) return;
    const k = 'sipena.warm.' + scope, last = +sessionStorage.getItem(k) || 0;
    if (Date.now() - last < 240000) return;
    sessionStorage.setItem(k, String(Date.now()));
    fetch(CFG.GAS_URL + '?w=' + scope, { mode: 'no-cors' }).catch(() => {});
  };
  App.net = function (ok) { const s = App.$('#sess'); if (s) { s.classList.toggle('off', !ok); s.querySelector('span:last-child').textContent = ok ? 'Tersambung' : 'Luring'; } };
  App.must = function (res) { if (!res.success) { App.toast(res.message || 'Terjadi kesalahan.', 'bad'); throw res; } return res.data; };

  /* ---------------- berkas (data URL di memori) ---------------- */
  App.fileCache = new Map();
  App.fileUrl = function (id, docId) {
    if (!id) return Promise.resolve('');
    const k = id + '|' + (docId || '');
    if (App.fileCache.has(k)) return App.fileCache.get(k);
    const p = App.api('file.get', { id: id, doc_id: docId || '' }).then(r => r.success ? 'data:' + r.data.mime + ';base64,' + r.data.b64 : '');
    App.fileCache.set(k, p);
    p.then(u => { if (!u) App.fileCache.delete(k); });
    return p;
  };
  App.download = function (b64, mime, name) {
    const bin = atob(b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([u8], { type: mime })), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    return url;
  };
  App.b64Blob = (b64, mime) => { const bin = atob(b64), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i); return new Blob([u8], { type: mime }); };
  /** Baca berkas → base64; SVG dikonversi ke PNG; gambar besar diperkecil (maks 2000 px). */
  App.readFile = function (file) {
    return new Promise((resolve, reject) => {
      const isSvg = /svg/.test(file.type) || /\.svg$/i.test(file.name), isImg = /^image\/(png|jpe?g|webp|gif)$/.test(file.type) || isSvg;
      const fr = new FileReader();
      fr.onerror = () => reject(new Error('Berkas tidak dapat dibaca.'));
      if (!isImg) { fr.onload = () => resolve({ nama: file.name, b64: String(fr.result).split(',')[1], size: file.size }); fr.readAsDataURL(file); return; }
      fr.onload = () => {
        const img = new Image();
        img.onload = () => {
          let w = img.naturalWidth || 800, h = img.naturalHeight || 800;
          if (isSvg && w < 800) { const s = 1200 / Math.max(w, h); w = Math.round(w * s); h = Math.round(h * s); }
          const max = 2000, sc = Math.min(1, max / Math.max(w, h)); w = Math.round(w * sc); h = Math.round(h * sc);
          if (!isSvg && sc === 1 && file.size < 1.5e6 && /png|jpe?g/.test(file.type)) { resolve({ nama: file.name, b64: String(fr.result).split(',')[1], size: file.size, w: w, h: h }); return; }
          const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
          const cx = cv.getContext('2d'); cx.drawImage(img, 0, 0, w, h);
          const png = isSvg || /png|gif|webp/.test(file.type), out = cv.toDataURL(png ? 'image/png' : 'image/jpeg', 0.88);
          resolve({ nama: file.name.replace(/\.(svg|webp|gif)$/i, '.png'), b64: out.split(',')[1], size: Math.round(out.length * 0.75), w: w, h: h, converted: isSvg });
        };
        img.onerror = () => reject(new Error('Gambar tidak valid.'));
        img.src = String(fr.result);
      };
      fr.readAsDataURL(file);
    });
  };

  /* ---------------- tema dari pengaturan ---------------- */
  App.applyTheme = function (s) {
    if (!s) return;
    const r = document.documentElement.style;
    if (/^#[0-9a-f]{6}$/i.test(s.warna_primer || '')) r.setProperty('--ink', s.warna_primer);
    if (/^#[0-9a-f]{6}$/i.test(s.warna_aksen || '')) { r.setProperty('--blue', s.warna_aksen); r.setProperty('--ink-hover', s.warna_aksen); }
    document.title = (s.nama_aplikasi || 'SIPENA') + ' — ' + (s.subjudul || 'Sistem Informasi Penyusunan Naskah');
    const lg = s.logo || (App.LS.get('pub') || {}).logo, ic = document.querySelector('link[rel="icon"]');
    if (ic) { if (lg && /^data:image\//.test(lg)) { ic.href = lg; ic.removeAttribute('type'); } else if (!lg) { ic.href = 'assets/favicon.svg'; ic.type = 'image/svg+xml'; } }
  };

  /* ---------------- toast, modal, menu, konfirmasi ---------------- */
  App.toast = function (msg, type, opts) {
    opts = opts || {};
    let box = App.$('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
    const el = document.createElement('div'); el.className = 'toast ' + (type || 'ok');
    el.innerHTML = I(type === 'bad' ? 'alert' : type === 'warn' ? 'alert' : type === 'info' ? 'info' : 'check-c') + '<span>' + esc(msg) + '</span>' + (opts.action ? '<button class="btn btn-secondary btn-xs">' + esc(opts.action) + '</button>' : '');
    if (opts.action) el.querySelector('button').onclick = () => { el.remove(); opts.onAction(); };
    box.appendChild(el);
    setTimeout(() => el.remove(), opts.ms || (type === 'bad' ? 6500 : 3500));
  };
  App.modal = function (o) {
    const bd = document.createElement('div'); bd.className = 'backdrop';
    bd.innerHTML = '<div class="modal ' + (o.size || '') + '" role="dialog" aria-modal="true" aria-label="' + esc(o.title) + '"><div class="modal-head"><h2>' + esc(o.title) + '</h2><button class="icon-btn" data-x aria-label="Tutup">' + I('x') + '</button></div><div class="modal-body">' + (o.body || '') + '</div>' + (o.foot !== false ? '<div class="modal-foot">' + (o.foot || '<button class="btn btn-secondary" data-x>Tutup</button>') + '</div>' : '') + '</div>';
    const prev = document.activeElement;
    const close = v => { if (bd.parentNode) { bd.remove(); document.removeEventListener('keydown', key); if (prev && prev.focus) prev.focus(); if (o.onClose) o.onClose(v); } };
    const key = e => { if (e.key === 'Escape' && !o.sticky) close(); };
    bd.addEventListener('mousedown', e => { if (e.target === bd && !o.sticky) close(); });
    App.on(bd, 'click', '[data-x]', () => close());
    document.addEventListener('keydown', key);
    document.body.appendChild(bd);
    const m = bd.querySelector('.modal'), f = m.querySelector('input,select,textarea,button:not([data-x])');
    setTimeout(() => (f || m).focus && (f || m).focus(), 30);
    const api = { el: m, close: close, body: m.querySelector('.modal-body'), foot: m.querySelector('.modal-foot') };
    if (o.onOpen) o.onOpen(api);
    return api;
  };
  App.confirm = function (o) {
    return new Promise(res => {
      App.modal({ title: o.title || 'Konfirmasi', size: 'sm', body: '<p style="font-size:14.5px">' + (o.html || esc(o.text)) + '</p>',
        foot: '<button class="btn btn-secondary" data-x>Batal</button><button class="btn ' + (o.danger ? 'btn-danger' : 'btn-primary') + '" data-ok>' + esc(o.ok || 'Lanjutkan') + '</button>',
        onOpen: m => { m.el.querySelector('[data-ok]').onclick = () => { m.close(true); }; }, onClose: v => res(!!v) });
    });
  };
  App.prompt = function (o) {
    return new Promise(res => {
      App.modal({ title: o.title, size: 'sm', body: (o.text ? '<p class="help mb8">' + esc(o.text) + '</p>' : '') + '<div class="field">' + (o.label ? '<label>' + esc(o.label) + '</label>' : '') + (o.multi ? '<textarea class="textarea" data-v rows="3">' + esc(o.value || '') + '</textarea>' : '<input class="input" data-v value="' + esc(o.value || '') + '" placeholder="' + esc(o.ph || '') + '">') + '</div>',
        foot: '<button class="btn btn-secondary" data-x>Batal</button><button class="btn btn-primary" data-ok>' + esc(o.ok || 'Simpan') + '</button>',
        onOpen: m => { const inp = m.el.querySelector('[data-v]'); const done = () => m.close(inp.value); m.el.querySelector('[data-ok]').onclick = done; if (!o.multi) inp.addEventListener('keydown', e => { if (e.key === 'Enter') done(); }); inp.select && inp.select(); },
        onClose: v => res(typeof v === 'string' ? v : null) });
    });
  };
  App.menu = function (anchor, items) {
    App.closeMenu();
    const m = document.createElement('div'); m.className = 'menu'; m.setAttribute('role', 'menu');
    m.innerHTML = items.map((it, i) => it === '-' ? '<hr>' : '<button role="menuitem" data-i="' + i + '" class="' + (it.danger ? 'danger' : '') + '"' + (it.disabled ? ' disabled style="opacity:.5"' : '') + '>' + (it.icon ? I(it.icon, 'sm') : '') + esc(it.label) + '</button>').join('');
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect(), mw = m.offsetWidth, mh = m.offsetHeight;
    m.style.left = Math.max(8, Math.min(window.innerWidth - mw - 8, r.right - mw)) + 'px';
    m.style.top = (r.bottom + mh + 8 > window.innerHeight ? Math.max(8, r.top - mh - 6) : r.bottom + 6) + 'px';
    m.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (!b || b.disabled) return; App.closeMenu(); items[+b.dataset.i].act(); });
    setTimeout(() => document.addEventListener('mousedown', App._menuOut = e => { if (!m.contains(e.target)) App.closeMenu(); }), 0);
    App._menu = m; const f = m.querySelector('button'); if (f) f.focus();
    m.addEventListener('keydown', e => { if (e.key === 'Escape') { App.closeMenu(); anchor.focus(); } });
  };
  App.closeMenu = () => { if (App._menu) { App._menu.remove(); App._menu = null; document.removeEventListener('mousedown', App._menuOut); } };
  App.tip = function (e, html) { let t = App.$('.tip'); if (!html) { if (t) t.remove(); return; } if (!t) { t = document.createElement('div'); t.className = 'tip'; document.body.appendChild(t); } t.innerHTML = html; t.style.left = Math.min(window.innerWidth - t.offsetWidth - 8, e.clientX + 12) + 'px'; t.style.top = (e.clientY - t.offsetHeight - 10) + 'px'; };
  App.busy = function (btn, on, label) {
    if (!btn) return;
    if (on) { btn.dataset.html = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spin"></span>' + esc(label || 'Memproses…'); }
    else { btn.disabled = false; if (btn.dataset.html) btn.innerHTML = btn.dataset.html; }
  };

  /* ---------------- potongan tampilan ---------------- */
  App.skel = (n, h) => Array.from({ length: n || 3 }, () => '<div class="skel" style="height:' + (h || 18) + 'px;margin:10px 0"></div>').join('');
  App.empty = (icon, title, text, action) => '<div class="empty"><div class="em-ic">' + I(icon || 'file') + '</div><h3>' + esc(title) + '</h3>' + (text ? '<p>' + esc(text) + '</p>' : '') + (action || '') + '</div>';
  App.errorBox = (res, retry) => '<div class="empty"><div class="em-ic" style="color:var(--bad-t);border-color:var(--bad)">' + I('alert') + '</div><h3>Gagal memuat data</h3><p>' + esc((res && res.message) || 'Terjadi kesalahan.') + '</p>' + (retry ? '<button class="btn btn-secondary btn-sm" data-act="retry">' + I('refresh', 'sm') + 'Coba lagi</button>' : '') + '</div>';
  App.noAccess = () => App.empty('lock', 'Tidak memiliki akses', 'Halaman ini hanya untuk peran tertentu. Hubungi Administrator bila Anda memerlukan akses.');
  App.pager = function (pg, label) {
    if (!pg) return '';
    const from = pg.total ? (pg.page - 1) * pg.per + 1 : 0, to = Math.min(pg.total, pg.page * pg.per);
    const nums = []; for (let i = 1; i <= pg.pages; i++) if (i === 1 || i === pg.pages || Math.abs(i - pg.page) <= 1) nums.push(i); else if (nums[nums.length - 1] !== '…') nums.push('…');
    return '<div class="tbl-foot"><span class="mono" style="font-size:12.5px;color:var(--muted)">Menampilkan <b style="color:var(--text)">' + from + '–' + to + '</b> dari <b style="color:var(--text)">' + pg.total + '</b> ' + esc(label || 'data') + '</span>' +
      (pg.pages > 1 ? '<div class="pager"><button data-page="' + (pg.page - 1) + '" ' + (pg.page <= 1 ? 'disabled' : '') + ' aria-label="Sebelumnya">' + I('chev-l', 'sm') + '</button>' + nums.map(n => n === '…' ? '<span class="muted">…</span>' : '<button data-page="' + n + '" ' + (n === pg.page ? 'aria-current="page"' : '') + '>' + n + '</button>').join('') + '<button data-page="' + (pg.page + 1) + '" ' + (pg.page >= pg.pages ? 'disabled' : '') + ' aria-label="Berikutnya">' + I('chev-r', 'sm') + '</button></div>' : '') + '</div>';
  };
  App.tabs = (items, cur) => '<div class="tabs" role="tablist">' + items.map(t => '<button role="tab" data-tab="' + esc(t[0]) + '" aria-selected="' + (t[0] === cur) + '">' + esc(t[1]) + (t[2] !== undefined ? ' <span class="ct">' + t[2] + '</span>' : '') + '</button>').join('') + '</div>';
  App.field = (o) => '<div class="field ' + (o.cls || '') + '"><label for="' + esc(o.id) + '">' + esc(o.label) + (o.req ? ' <span class="req">*</span>' : '') + (o.extra || '') + '</label>' + o.input + (o.help ? '<div class="help">' + esc(o.help) + '</div>' : '') + '</div>';

  /* ---------------- router & kerangka ---------------- */
  const routes = [];
  App.route = (pattern, fn, opt) => routes.push({ re: new RegExp('^' + pattern.replace(/:(\w+)/g, '([^/?]+)') + '(?:\\?.*)?$'), keys: (pattern.match(/:(\w+)/g) || []).map(k => k.slice(1)), fn: fn, opt: opt || {} });
  App.go = h => { if (location.hash === h) App.render(); else location.hash = h; };
  App.query = () => { const q = {}; const s = (location.hash.split('?')[1] || ''); s.split('&').filter(Boolean).forEach(p => { const [k, v] = p.split('='); q[decodeURIComponent(k)] = decodeURIComponent(v || ''); }); return q; };
  App.setQuery = (obj) => { const base = location.hash.split('?')[0], q = Object.assign(App.query(), obj); Object.keys(q).forEach(k => { if (q[k] === '' || q[k] === undefined || q[k] === null) delete q[k]; }); const s = Object.keys(q).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(q[k])).join('&'); history.replaceState(null, '', base + (s ? '?' + s : '')); };
  App.beforeLeave = null;
  let lastHash = location.hash;
  window.addEventListener('hashchange', async () => {
    if (App.beforeLeave) { const okLeave = await App.beforeLeave(); if (!okLeave) { history.replaceState(null, '', lastHash); return; } }
    App.render();
  });
  App.render = async function () {
    App.closeMenu(); App.tip(null);
    App.cleanup.splice(0).forEach(f => { try { f(); } catch (e) { /* abaikan */ } });
    App.beforeLeave = null;
    const hash = location.hash || '#/';
    lastHash = hash;
    const path = hash.slice(1).split('?')[0] || '/';
    if (!App.configured() && path !== '/masuk') { location.hash = '#/masuk'; return; }
    let hit = null, params = {};
    for (const r of routes) { const m = r.re.exec(path); if (m) { hit = r; r.keys.forEach((k, i) => { params[k] = decodeURIComponent(m[i + 1]); }); break; } }
    if (!Sess.token && !(hit && hit.opt.public)) { location.hash = '#/masuk'; return; }
    if (!hit) { location.hash = Sess.token ? App.home() : '#/masuk'; return; }
    if (hit.opt.roles && hit.opt.roles.indexOf(Sess.role) < 0) { App.shell(hit.opt); App.$('#page').innerHTML = App.noAccess(); return; }
    if (hit.opt.shell === false) { document.getElementById('root').innerHTML = '<div id="page"></div>'; App._shell = null; }
    else App.shell(hit.opt);
    window.scrollTo(0, 0);
    const old = App.$('#page'), page = old.cloneNode(false); old.replaceWith(page);   // buang pendengar halaman sebelumnya
    try { await hit.fn(page, params, App.query()); }
    catch (e) { console.error(e); if (App.$('#page')) App.$('#page').innerHTML = App.errorBox(e && e.message ? e : { message: 'Terjadi kesalahan saat memuat halaman.' }); }
  };
  App.home = () => Sess.role === 'viewer' ? '#/dibagikan' : '#/beranda';
  const NAV = [
    ['#/beranda', 'grid', 'Beranda', 'beranda', ['superadmin', 'admin', 'user']],
    ['#/dokumen', 'file', 'Naskah Saya', 'dokumen', ['superadmin', 'admin', 'user']],
    ['#/template', 'layers', 'Template Naskah', 'template', ['superadmin', 'admin', 'user']],
    ['#/dibagikan', 'share', 'Dibagikan', 'dibagikan'],
    ['#/berkas', 'images', 'Pustaka Berkas', 'berkas', ['superadmin', 'admin', 'user']],
    ['#/profil', 'building', 'Profil Organisasi', 'profil', ['superadmin', 'admin', 'user']],
    ['#/akun', 'user', 'Akun Saya', 'akun']
  ];
  const NAV_ADM = [
    ['#/admin', 'chart', 'Dashboard Admin', 'admin'], ['#/admin/pengguna', 'users', 'Pengguna', 'adm-pengguna'], ['#/admin/organisasi', 'building', 'Organisasi', 'adm-org'],
    ['#/admin/template', 'layout', 'Template', 'adm-template'], ['#/admin/kategori', 'hash', 'Kategori', 'adm-kategori'], ['#/admin/log', 'activity', 'Log Aktivitas', 'adm-log'], ['#/admin/impor-akun', 'import', 'Impor Akun (CSV)', 'adm-csv']
  ];
  const NAV_SA = [['#/admin/pengaturan', 'palette', 'Pengaturan Aplikasi', 'sa-set'], ['#/admin/backup', 'database', 'Backup', 'sa-backup'], ['#/admin/migrasi', 'refresh', 'Migrasi Data', 'sa-import']];
  App.shell = function (opt) {
    App._opt = opt;
    const b = Sess.boot || {}, me = b.me || {}, s = b.settings || {}, org = b.org;
    const navLink = n => (!n[4] || n[4].indexOf(me.role) > -1) ? '<a href="' + n[0] + '" data-nav="' + n[3] + '" class="' + (opt.nav === n[3] ? 'on' : '') + '">' + I(n[1]) + '<span>' + esc(n[2]) + '</span>' + (n[3] === 'dibagikan' && App._sharedCt ? '<b class="ct">' + App._sharedCt + '</b>' : '') + '</a>' : '';
    if (!App._shell) {
      document.getElementById('root').innerHTML =
        '<div class="app"><aside class="side" id="side" aria-label="Navigasi utama"></aside><div class="main-wrap">' +
        (s.banner ? '<div class="maint">' + I('alert', 'sm') + esc(s.banner) + '</div>' : '') +
        '<header class="top"><button class="icon-btn menu-btn" id="menuBtn" aria-label="Buka menu">' + I('menu') + '</button><nav class="crumbs" id="crumbs" aria-label="Lokasi"></nav>' +
        '<div class="search" role="search">' + I('search', 'sm') + '<input class="input" id="gsearch" placeholder="Cari naskah, kode, judul…" aria-label="Cari naskah"><span class="kbd">/</span></div>' +
        '<div class="top-actions"><span class="sess" id="sess"><span class="dot"></span><span>Tersambung</span></span>' +
        (org ? '<a class="btn btn-secondary btn-sm hide-sm" href="#/profil">' + I('building', 'sm') + esc(org.singkatan || org.nama) + '</a>' : '') +
        '<button class="icon-btn" id="helpBtn" aria-label="Bantuan">' + I('help') + '</button></div></header><main class="main" id="page"></main></div></div>';
      App._shell = true;
      App.$('#menuBtn').onclick = () => App.$('#side').classList.toggle('open');
      App.$('#gsearch').addEventListener('keydown', e => { if (e.key === 'Enter') App.go('#/dokumen?q=' + encodeURIComponent(e.target.value.trim())); });
      document.addEventListener('keydown', e => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable && App.$('#gsearch')) { e.preventDefault(); App.$('#gsearch').focus(); } });
      App.$('#helpBtn').onclick = App.help;
    }
    const isAdm = me.role === 'admin' || me.role === 'superadmin';
    App.$('#side').innerHTML =
      '<div class="brand"><div class="brand-mark">' + ((s.logo || (LS.get('pub') || {}).logo) ? '<img alt="" src="' + esc(s.logo || LS.get('pub').logo) + '">' : I('file-plus', 'lg')) + '</div><div class="brand-txt"><div class="brand-name">' + esc(s.nama_aplikasi || 'SIPENA') + '</div><div class="brand-sub">' + esc(isAdm ? 'Panel ' + (me.role === 'superadmin' ? 'Super Admin' : 'Admin') : 'Penyusunan Naskah') + '</div></div></div>' +
      (org ? '<div class="org-card"><div class="row between"><span class="eyebrow">Organisasi</span><span class="tag blue" style="padding:3px 6px;font-size:9.5px">' + esc(b.roleLabel || '') + '</span></div><div class="nm">' + esc(org.nama) + '</div>' + (org.periode_mulai ? '<div class="pr">Periode ' + esc(SipenaModel.ph({ org: org, fdefs: [] }, 'org_periode')) + '</div>' : '') + '</div>' : '') +
      (me.role !== 'viewer' ? '<a class="btn btn-primary btn-block btn-new" href="#/buat">' + I('plus') + '<span class="new-txt">Naskah Baru</span></a>' : '') +
      '<nav class="nav">' + NAV.map(navLink).join('') +
      (isAdm ? '<div class="nav-label">Administrasi</div>' + NAV_ADM.map(navLink).join('') : '') +
      (me.role === 'superadmin' ? '<div class="nav-label">' + I('lock', 'sm') + 'Khusus Super Admin</div>' + NAV_SA.map(navLink).join('') : '') + '</nav>' +
      '<div class="side-foot"><div class="avatar">' + esc(App.initials(me.nama)) + '</div><div class="who grow"><div class="n ellipsis">' + esc(me.nama || '') + '</div><div class="r">' + esc(me.jabatan || b.roleLabel || '') + '</div></div><button class="icon-btn" id="logoutBtn" aria-label="Keluar" title="Keluar">' + I('logout') + '</button></div>';
    App.$('#logoutBtn').onclick = App.logout;
    App.$('#side').classList.remove('open');
    App.crumbs(opt.crumbs || []);
  };
  App.crumbs = list => { const c = App.$('#crumbs'); if (c) c.innerHTML = list.map((x, i) => i === list.length - 1 ? '<b>' + esc(x) + '</b>' : '<span>' + esc(x) + '</span><span class="sep">/</span>').join(''); };
  App.logout = async function () {
    if (App.beforeLeave && !(await App.beforeLeave())) return;
    App.api('auth.logout', {}); Sess.clear(); App._shell = null; App.go('#/masuk');
  };
  App.help = function () {
    App.modal({ title: 'Bantuan singkat', size: 'lg', body:
      '<div class="grid g2"><div><h3 style="font-size:15px" class="mb8">Menyusun naskah</h3><ol style="margin:0;padding-left:18px;line-height:1.8;font-size:14px"><li>Klik <b>Naskah Baru</b>, pilih jenis dokumen & template.</li><li>Isi formulir per tahap — tersimpan otomatis.</li><li>Klik <b>Hasilkan Naskah</b> untuk membuka editor A4.</li><li>Sunting, lalu <b>Ekspor</b> ke PDF/DOCX.</li></ol></div>' +
      '<div><h3 style="font-size:15px" class="mb8">Pintasan keyboard</h3><table class="tbl compact"><tbody><tr><td><span class="kbd">/</span></td><td>Cari naskah</td></tr><tr><td><span class="kbd">Ctrl</span> + <span class="kbd">S</span></td><td>Simpan versi di editor</td></tr><tr><td><span class="kbd">Ctrl</span> + <span class="kbd">B/I/U</span></td><td>Tebal / miring / garis bawah</td></tr><tr><td><span class="kbd">Ctrl</span> + <span class="kbd">Z</span></td><td>Urungkan</td></tr></tbody></table></div></div>' +
      '<div class="banner mt16">' + I('info') + '<div>Lupa PIN? Hubungi Administrator organisasi Anda untuk mendapatkan kode aktivasi baru. Ukur kecepatan server dengan mengetik <code>Perf.table()</code> di Console browser.</div></div>' });
  };

  /* ---------------- awal ---------------- */
  document.addEventListener('DOMContentLoaded', function () {
    if (Sess.boot) App.applyTheme(Sess.boot.settings);
    App.render();
    if (Sess.token) setTimeout(() => App.api('boot', {}).then(r => { if (r.success) { Sess.update(r.data); if (App._shell && App._opt) App.shell(App._opt); } }), 50);
  });
})();
