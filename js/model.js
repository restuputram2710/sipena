/* ==========================================================================
 * SIPENA — Model Dokumen Bersama  (v1)
 * Dipakai IDENTIK oleh frontend (js/model.js) dan backend (Model.gs).
 * Aturan: tidak boleh memakai DOM, window, atau layanan Apps Script.
 * Isi: format Indonesia, placeholder, tabel data (RAB), penomoran AD/ART,
 *      "flow" (urutan elemen siap render), validasi isian, sanitasi.
 * ========================================================================== */
var SipenaModel = (function () {
  'use strict';
  var M = { VERSION: 1 };

  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  M.FONTS = ['Times New Roman', 'Arial', 'Cambria', 'Calibri'];
  M.SIZES = { A4: [21, 29.7], F4: [21.5, 33], Letter: [21.59, 27.94] };
  M.FIELD_TYPES = ['text', 'textarea', 'date', 'daterange', 'number', 'currency', 'select', 'list', 'table', 'rab', 'nomor_surat'];
  M.BLOCK_TYPES = ['h1', 'h2', 'p', 'ul', 'ol', 'table', 'data', 'img', 'pb', 'toc', 'sign', 'adart'];
  M.BUILTINS = [
    ['org_nama', 'Nama organisasi'], ['org_singkatan', 'Singkatan organisasi'], ['org_induk', 'Lembaga induk'],
    ['org_alamat', 'Alamat organisasi'], ['org_telepon', 'Telepon organisasi'], ['org_email', 'Email organisasi'],
    ['org_website', 'Situs organisasi'], ['org_periode', 'Periode kepengurusan'], ['org_ketua', 'Nama ketua'],
    ['org_sekretaris', 'Nama sekretaris'], ['org_bendahara', 'Nama bendahara'], ['org_pembina', 'Nama pembina'],
    ['sys_tahun', 'Tahun berjalan'], ['sys_tanggal', 'Tanggal hari ini'], ['doc_kode', 'Kode naskah'], ['doc_judul', 'Judul naskah']
  ];

  /* ---------- util ---------- */
  M.idgen = function () { return 'b' + Math.random().toString(36).slice(2, 9) + (Date.now() % 1e6).toString(36); };
  M.clone = function (o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); };
  function str(v) { return v === null || v === undefined ? '' : String(v); }
  function isObj(o) { return o && typeof o === 'object' && !Array.isArray(o); }
  M.num = function (v) {
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    var s = str(v).trim(); if (!s) return 0;
    s = s.replace(/[^\d,.\-]/g, '');
    if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.'); else s = s.replace(/[.,]/g, '');
    var n = parseFloat(s); return isFinite(n) ? n : 0;
  };

  /* ---------- format Indonesia ---------- */
  function ymd(s) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str(s)); return m ? [+m[1], +m[2], +m[3]] : null; }
  M.tanggal = function (s) { var p = ymd(s); return p ? p[2] + ' ' + BULAN[p[1] - 1] + ' ' + p[0] : str(s); };
  M.hari = function (s) { var p = ymd(s); return p ? HARI[new Date(Date.UTC(p[0], p[1] - 1, p[2])).getUTCDay()] : ''; };
  M.hariTanggal = function (s) { var h = M.hari(s); return h ? h + ', ' + M.tanggal(s) : str(s); };
  M.rentang = function (a, b) {
    var p = ymd(a), q = ymd(b);
    if (!p) return '';
    if (!q || (p[0] === q[0] && p[1] === q[1] && p[2] === q[2])) return M.tanggal(a);
    if (p[0] === q[0] && p[1] === q[1]) return p[2] + '–' + q[2] + ' ' + BULAN[p[1] - 1] + ' ' + p[0];
    if (p[0] === q[0]) return p[2] + ' ' + BULAN[p[1] - 1] + ' – ' + q[2] + ' ' + BULAN[q[1] - 1] + ' ' + p[0];
    return M.tanggal(a) + ' – ' + M.tanggal(b);
  };
  M.angka = function (n) {
    n = Math.round(M.num(n)); var neg = n < 0; n = Math.abs(n);
    var s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return (neg ? '-' : '') + s;
  };
  M.rupiah = function (n) { return 'Rp ' + M.angka(n); };
  var SATUAN = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan', 'sepuluh', 'sebelas'];
  function tb(n) {
    if (n < 12) return SATUAN[n];
    if (n < 20) return tb(n - 10) + ' belas';
    if (n < 100) return tb(Math.floor(n / 10)) + ' puluh' + (n % 10 ? ' ' + tb(n % 10) : '');
    if (n < 200) return 'seratus' + (n - 100 ? ' ' + tb(n - 100) : '');
    if (n < 1000) return tb(Math.floor(n / 100)) + ' ratus' + (n % 100 ? ' ' + tb(n % 100) : '');
    if (n < 2000) return 'seribu' + (n - 1000 ? ' ' + tb(n - 1000) : '');
    if (n < 1e6) return tb(Math.floor(n / 1000)) + ' ribu' + (n % 1000 ? ' ' + tb(n % 1000) : '');
    if (n < 1e9) return tb(Math.floor(n / 1e6)) + ' juta' + (n % 1e6 ? ' ' + tb(n % 1e6) : '');
    if (n < 1e12) return tb(Math.floor(n / 1e9)) + ' miliar' + (n % 1e9 ? ' ' + tb(n % 1e9) : '');
    return tb(Math.floor(n / 1e12)) + ' triliun' + (n % 1e12 ? ' ' + tb(n % 1e12) : '');
  }
  M.terbilang = function (n) {
    n = Math.round(Math.abs(M.num(n)));
    var s = n === 0 ? 'nol' : tb(n);
    return s.replace(/\s+/g, ' ').trim().replace(/(^|\s)\S/g, function (c) { return c.toUpperCase(); }) + ' Rupiah';
  };
  M.romawi = function (n) {
    var v = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1], r = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'], s = '';
    for (var i = 0; i < v.length; i++) while (n >= v[i]) { s += r[i]; n -= v[i]; }
    return s;
  };
  M.huruf = function (n) { var s = ''; n = n - 1; do { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; } while (n >= 0); return s; };

  /* ---------- organisasi ---------- */
  M.orgSnapshot = function (org, officers) {
    org = org || {};
    return {
      id: str(org.id), nama: str(org.nama), singkatan: str(org.singkatan), jenis: str(org.jenis), induk: str(org.induk),
      alamat: str(org.alamat), telepon: str(org.telepon), email: str(org.email), website: str(org.website),
      logo: str(org.logo_file_id || org.logo), periode_mulai: str(org.periode_mulai), periode_selesai: str(org.periode_selesai),
      format_nomor_surat: str(org.format_nomor_surat),
      officers: (officers || org.officers || []).filter(function (o) { return o && String(o.aktif) !== 'false' && String(o.aktif) !== '0'; })
        .map(function (o) { return { jabatan: str(o.jabatan), nama: str(o.nama), nomor: str(o.nomor_identitas || o.nomor), peran: str(o.peran_ttd || o.peran) }; })
    };
  };
  function officer(doc, jab, field) {
    var list = (doc.org && doc.org.officers) || [], j = str(jab).toLowerCase().trim(), hit = null;
    for (var i = 0; i < list.length && !hit; i++) if (list[i].jabatan.toLowerCase().trim() === j) hit = list[i];
    for (i = 0; i < list.length && !hit; i++) if (list[i].jabatan.toLowerCase().indexOf(j) === 0) hit = list[i];
    for (i = 0; i < list.length && !hit; i++) if (list[i].jabatan.toLowerCase().indexOf(j) > -1) hit = list[i];
    return hit ? str(hit[field || 'nama']) : '';
  }
  function periode(o) {
    var a = /^(\d{4})/.exec(str(o.periode_mulai)), b = /^(\d{4})/.exec(str(o.periode_selesai));
    if (a && b) return a[1] === b[1] ? a[1] : a[1] + '/' + b[1];
    return a ? a[1] : '';
  }

  /* ---------- isian (fields) ---------- */
  M.fdefMap = function (doc) { var m = {}; (doc.fdefs || []).forEach(function (f) { m[f.k] = f; }); return m; };
  M.isEmpty = function (f, v) {
    if (!f) return v === undefined || v === null || v === '';
    if (f.t === 'daterange') return !(v && v.a);
    if (f.t === 'list' || f.t === 'table' || f.t === 'rab') return !(Array.isArray(v) && v.filter(function (x) { return isObj(x) ? Object.keys(x).some(function (k) { return str(x[k]).trim(); }) : str(x).trim(); }).length);
    return str(v).trim() === '';
  };
  M.formatValue = function (f, v) {
    if (M.isEmpty(f, v)) return '';
    switch (f.t) {
      case 'date': return f.fmt === 'hari' ? M.hariTanggal(v) : M.tanggal(v);
      case 'daterange': return M.rentang(v.a, v.b);
      case 'number': return M.angka(v);
      case 'currency': return M.rupiah(v);
      case 'list': return v.map(str).filter(Boolean).join(', ');
      case 'table': case 'rab': return v.length + ' baris';
      default: return str(v);
    }
  };
  /** Data tabel siap tampil (RAB / tabel umum). */
  M.table = function (doc, key) {
    var f = M.fdefMap(doc)[key], rows = (doc.fields && doc.fields[key]) || [];
    if (!f || !Array.isArray(rows)) return { cols: [], rows: [], total: null, sum: 0 };
    rows = rows.filter(function (r) { return isObj(r) && Object.keys(r).some(function (k) { return str(r[k]).trim(); }); });
    if (f.t === 'rab') {
      var sum = 0;
      var out = rows.map(function (r, i) {
        var sub = M.num(r.volume) * M.num(r.harga); sum += sub;
        return [String(i + 1), str(r.uraian), M.angka(r.volume), str(r.satuan), M.angka(r.harga), M.angka(sub)];
      });
      return {
        cols: [{ l: 'No', a: 'c', w: 0.6 }, { l: 'Uraian', a: 'l', w: 2.9 }, { l: 'Volume', a: 'c', w: 1.35 }, { l: 'Satuan', a: 'c', w: 1.1 }, { l: 'Harga Satuan (Rp)', a: 'r', w: 1.7 }, { l: 'Jumlah (Rp)', a: 'r', w: 1.8 }],
        rows: out, total: { label: 'TOTAL', text: M.angka(sum) }, totals: [null, null, null, null, null, M.angka(sum)], sum: sum
      };
    }
    var cols = (f.cols || []).map(function (c) { return { k: c.k, l: c.l + (c.t === 'currency' ? ' (Rp)' : ''), t: c.t || 'text', a: c.t === 'number' || c.t === 'currency' ? 'r' : 'l', w: c.w || 1 }; });
    var withNo = f.no !== false, sums = cols.map(function () { return 0; });
    var data = rows.map(function (r, i) {
      var cells = cols.map(function (c, ci) {
        if (c.t === 'currency') { sums[ci] += M.num(r[c.k]); return M.angka(r[c.k]); }
        if (c.t === 'number') return r[c.k] === '' || r[c.k] === undefined ? '' : M.angka(r[c.k]);
        if (c.t === 'date') return M.tanggal(r[c.k]);
        return str(r[c.k]);
      });
      return withNo ? [String(i + 1)].concat(cells) : cells;
    });
    var hc = cols.map(function (c) { return { l: c.l, a: c.a, w: c.w }; });
    if (withNo) hc.unshift({ l: 'No', a: 'c', w: 0.6 });
    var cur = cols.map(function (c, i) { return c.t === 'currency' ? i : -1; }).filter(function (i) { return i > -1; });
    var last = cur.length ? sums[cur[cur.length - 1]] : 0, totals = null;
    if (f.sum && cur.length) {
      totals = hc.map(function () { return null; });
      cur.forEach(function (ci) { totals[ci + (withNo ? 1 : 0)] = M.angka(sums[ci]); });
    }
    return { cols: hc, rows: data, total: totals ? { label: 'TOTAL', text: M.angka(last) } : null, totals: totals, sum: last };
  };

  /** Nilai placeholder (teks) — '' bila kosong. meta: {kode, judul, today:'YYYY-MM-DD'} */
  M.ph = function (doc, key, meta) {
    meta = meta || {}; key = str(key);
    var fm = M.fdefMap(doc), o = doc.org || {}, m;
    if (fm[key]) return M.formatValue(fm[key], (doc.fields || {})[key]);
    if ((m = /^(total|terbilang|jumlah)_(.+)$/.exec(key)) && fm[m[2]]) {
      var t = M.table(doc, m[2]);
      if (m[1] === 'jumlah') return t.rows.length ? String(t.rows.length) : '';
      if (!t.rows.length) return '';
      return m[1] === 'total' ? M.rupiah(t.sum) : M.terbilang(t.sum);
    }
    if ((m = /^(officer|nomor):(.+)$/.exec(key))) return officer(doc, m[2], m[1] === 'officer' ? 'nama' : 'nomor');
    switch (key) {
      case 'org_nama': return str(o.nama);
      case 'org_singkatan': return str(o.singkatan);
      case 'org_induk': return str(o.induk);
      case 'org_alamat': return str(o.alamat);
      case 'org_telepon': return str(o.telepon);
      case 'org_email': return str(o.email);
      case 'org_website': return str(o.website);
      case 'org_periode': return periode(o);
      case 'org_ketua': return officer(doc, 'Ketua');
      case 'org_sekretaris': return officer(doc, 'Sekretaris');
      case 'org_bendahara': return officer(doc, 'Bendahara');
      case 'org_pembina': return officer(doc, 'Pembina');
      case 'sys_tahun': return str(meta.today || '').slice(0, 4);
      case 'sys_tanggal': return M.tanggal(meta.today || '');
      case 'doc_kode': return str(meta.kode);
      case 'doc_judul': return str(meta.judul);
    }
    return '';
  };
  M.phLabel = function (doc, key) {
    var f = M.fdefMap(doc)[key]; if (f) return f.l;
    for (var i = 0; i < M.BUILTINS.length; i++) if (M.BUILTINS[i][0] === key) return M.BUILTINS[i][1];
    var m = /^(total|terbilang|jumlah)_(.+)$/.exec(key);
    if (m) { var g = M.fdefMap(doc)[m[2]]; return (m[1] === 'total' ? 'Total ' : m[1] === 'terbilang' ? 'Terbilang ' : 'Jumlah ') + (g ? g.l : m[2]); }
    if ((m = /^(officer|nomor):(.+)$/.exec(key))) return (m[1] === 'officer' ? 'Nama ' : 'Nomor ') + m[2];
    return key;
  };
  M.isKnownKey = function (doc, key) {
    var fm = M.fdefMap(doc), m;
    if (fm[key]) return true;
    if ((m = /^(total|terbilang|jumlah)_(.+)$/.exec(key))) return !!fm[m[2]] && /^(table|rab)$/.test(fm[m[2]].t);
    if (/^(officer|nomor):.{1,40}$/.test(key)) return true;
    return M.BUILTINS.some(function (b) { return b[0] === key; });
  };

  /* ---------- AD/ART ---------- */
  M.adartNum = function (adart) {
    var r = { bab: {}, pasal: {}, ayat: {}, part: {} };
    ((adart && adart.parts) || []).forEach(function (part, pi) {
      var ps = 0; r.part[part.id] = pi + 1;
      (part.babs || []).forEach(function (bab, bi) {
        r.bab[bab.id] = { n: bi + 1, part: part.kode };
        (bab.pasals || []).forEach(function (pas) {
          ps++; r.pasal[pas.id] = { n: ps, part: part.kode, count: (pas.ayats || []).length };
          (pas.ayats || []).forEach(function (ay, ai) { r.ayat[ay.id] = { n: ai + 1, pasal: ps, pasalId: pas.id, part: part.kode }; });
        });
      });
    });
    return r;
  };
  M.refText = function (num, id) {
    if (num.ayat[id]) { var a = num.ayat[id]; return 'Pasal ' + a.pasal + ' ayat (' + a.n + ')'; }
    if (num.pasal[id]) return 'Pasal ' + num.pasal[id].n;
    return '[rujukan terhapus]';
  };

  /* ---------- runs ---------- */
  /** runs → [{x,b,i,u,ph?,miss?}] dengan placeholder & rujukan terisi. opt.miss=true → tandai kosong "[Label]". */
  M.runs = function (runs, doc, meta, opt) {
    opt = opt || {}; var out = [];
    (runs || []).forEach(function (r) {
      if (!r) return;
      var st = { b: r.b ? 1 : 0, i: r.i ? 1 : 0, u: r.u ? 1 : 0 };
      if (r.p !== undefined) {
        var v = M.ph(doc, r.p, meta);
        if (!v && opt.miss) out.push({ x: '[' + M.phLabel(doc, r.p) + ']', b: st.b, i: st.i, u: st.u, ph: r.p, miss: 1 });
        else if (v) out.push({ x: v, b: st.b, i: st.i, u: st.u, ph: r.p });
      } else if (r.r !== undefined) {
        out.push({ x: M.refText(opt.num || M.adartNum(doc.adart), r.r, opt.part), b: st.b, i: st.i, u: st.u, ref: r.r });
      } else if (r.x !== undefined && r.x !== '') out.push({ x: str(r.x), b: st.b, i: st.i, u: st.u });
    });
    return out;
  };
  M.runsText = function (runs) { return (runs || []).map(function (r) { return r.x || ''; }).join(''); };
  M.plainRuns = function (s, st) { st = st || {}; return [{ x: str(s), b: st.b ? 1 : 0, i: st.i ? 1 : 0, u: st.u ? 1 : 0 }]; };
  /** Placeholder yang dipakai sebuah daftar blok/struktur. */
  M.usedKeys = function (doc) {
    var set = {};
    function scan(runs) { if (Array.isArray(runs)) runs.forEach(function (r) { if (r && r.p !== undefined) set[r.p] = 1; }); }
    (doc.blocks || []).forEach(function (b) {
      scan(b.c);
      if (b.t === 'ul' || b.t === 'ol') (b.items || []).forEach(scan);
      (b.rows || []).forEach(function (row) { (row || []).forEach(scan); });
      if ((b.t === 'ul' || b.t === 'ol') && b.src) set[b.src] = 1;
      if (b.t === 'data' && b.f) set[b.f] = 1;
      if (b.t === 'sign') { scan(b.place); (b.items || []).forEach(function (it) { scan(it.l); scan(it.n); scan(it.id); }); }
    });
    ((doc.adart && doc.adart.parts) || []).forEach(function (p) {
      scan(p.sub); (p.mukadimah || []).forEach(scan);
      (p.babs || []).forEach(function (b) { (b.pasals || []).forEach(function (s) { (s.ayats || []).forEach(function (a) { scan(a.c); }); }); });
    });
    return Object.keys(set);
  };
  M.orphans = function (doc) { return M.usedKeys(doc).filter(function (k) { return !M.isKnownKey(doc, k); }); };

  /* ---------- validasi kelengkapan ---------- */
  M.missing = function (doc, meta) {
    var fm = M.fdefMap(doc), used = M.usedKeys(doc), wajib = [], kosong = [];
    (doc.fdefs || []).forEach(function (f) { if (f.req && M.isEmpty(f, (doc.fields || {})[f.k])) wajib.push({ k: f.k, l: f.l }); });
    used.forEach(function (k) {
      if (fm[k] && fm[k].req) return;
      if (M.isKnownKey(doc, k) && !M.ph(doc, k, meta) && !(fm[k] && /^(list|table|rab)$/.test(fm[k].t))) kosong.push({ k: k, l: M.phLabel(doc, k) });
    });
    return { wajib: wajib, kosong: kosong };
  };
  M.stepProgress = function (doc) {
    var fm = M.fdefMap(doc);
    return (doc.steps || []).map(function (s) {
      var f = (s.f || []).map(function (k) { return fm[k]; }).filter(Boolean);
      var req = f.filter(function (x) { return x.req; });
      var done = req.filter(function (x) { return !M.isEmpty(x, (doc.fields || {})[x.k]); }).length;
      var filled = f.filter(function (x) { return !M.isEmpty(x, (doc.fields || {})[x.k]); }).length;
      return { id: s.id, t: s.t, req: req.length, done: done, total: f.length, filled: filled, ok: done === req.length };
    });
  };

  /* ---------- FLOW: urutan elemen siap render (DOM & DOCX) ---------- */
  M.flow = function (doc, meta, opt) {
    opt = opt || {}; meta = meta || {};
    var out = [], tocEls = [], heads = [], page = doc.page || {}, h1 = 0, h2 = 0, num = M.adartNum(doc.adart);
    var R = function (runs, part) { return M.runs(runs, doc, meta, { miss: opt.miss, num: num, part: part }); };
    function head(lvl, id, lines, tocText, extra) {
      var el = { k: 'h', lvl: lvl, id: id, lines: lines, a: (extra && extra.a) || (lvl === 1 ? 'c' : 'l') };
      out.push(el); heads.push({ lvl: lvl, text: tocText, id: id });
    }
    (doc.blocks || []).forEach(function (b) {
      var id = b.id || M.idgen(), start = out.length;
      switch (b.t) {
        case 'h1': {
          var r1 = R(b.c), numbered = page.headNum && b.num !== false;
          h1++; h2 = 0;
          var t1 = M.runsText(r1);
          var lines = numbered ? [[{ x: 'BAB ' + M.romawi(h1), b: 1 }], r1.map(function (x) { var y = M.clone(x); y.b = 1; return y; })] : [r1.map(function (x) { var y = M.clone(x); y.b = 1; return y; })];
          head(1, id, lines, (numbered ? 'BAB ' + M.romawi(h1) + ' ' : '') + t1.toUpperCase());
          break;
        }
        case 'h2': {
          var r2 = R(b.c), n2 = page.headNum && b.num !== false;
          h2++;
          var pre = n2 ? M.huruf(h2) + '. ' : '';
          var rr = r2.map(function (x) { var y = M.clone(x); y.b = 1; return y; });
          if (pre) rr.unshift({ x: pre, b: 1 });
          head(2, id, [rr], pre + M.runsText(r2), { a: 'l' });
          break;
        }
        case 'p': {
          var fd = b.c && b.c.length === 1 && b.c[0].p !== undefined ? M.fdefMap(doc)[b.c[0].p] : null;
          if (fd && fd.t === 'textarea') {           // isian paragraf panjang → satu paragraf per baris
            var val = str((doc.fields || {})[fd.k]).split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean);
            if (val.length > 1) {
              val.forEach(function (line, i) { out.push({ k: 'p', id: id + (i ? '_' + i : ''), runs: [{ x: line, b: b.c[0].b ? 1 : 0, i: b.c[0].i ? 1 : 0, u: b.c[0].u ? 1 : 0, ph: fd.k }], a: b.a || 'j', ind: !!b.ind, fs: b.fs || 0, sb: i ? 0 : (b.sb || 0), sa: b.sa || 0 }); });
              break;
            }
          }
          out.push({ k: 'p', id: id, runs: R(b.c), a: b.a || 'j', ind: !!b.ind, fs: b.fs || 0, sb: b.sb || 0, sa: b.sa || 0 });
          break;
        }
        case 'ul': case 'ol': {
          var items = b.src ? (((doc.fields || {})[b.src]) || []).map(function (s) { return M.plainRuns(s); }) : (b.items || []);
          items = items.filter(function (it) { return M.runsText(R(it)).trim() || !b.src; });
          if (b.src && !items.length && opt.miss) items = [[{ p: b.src }]];
          items.forEach(function (it, i) {
            var mk = b.t === 'ul' ? '•' : (b.st === 'a' ? String.fromCharCode(97 + (i % 26)) + '.' : (i + 1) + '.');
            out.push({ k: 'p', id: id + (i ? '_' + i : ''), runs: R(it), a: 'j', list: { marker: mk, lvl: b.lvl || 0 } });
          });
          break;
        }
        case 'table': {
          var rows = (b.rows || []).map(function (row) { return (row || []).map(function (c) { return { runs: R(c) }; }); });
          var w = b.w && b.w.length ? b.w : (rows[0] || []).map(function () { return 1; });
          out.push({ k: 'table', id: id, cols: w.map(function (x) { return { w: x, a: 'l' }; }), head: b.head && rows.length ? rows[0] : null, rows: b.head ? rows.slice(1) : rows, foot: null, border: b.border !== false });
          break;
        }
        case 'data': {
          var t = M.table(doc, b.f);
          if (!t.cols.length) break;
          var hd = t.cols.map(function (c) { return { runs: [{ x: c.l, b: 1 }], a: 'c' }; });
          var body = t.rows.map(function (r) { return r.map(function (x, i) { return { runs: [{ x: x }], a: t.cols[i].a }; }); });
          if (!body.length && opt.miss) body = [[{ runs: [{ x: '[' + M.phLabel(doc, b.f) + ' belum diisi]', miss: 1 }], a: 'c', span: t.cols.length }]];
          var foot = null;
          if (t.totals && t.rows.length) {
            var first = 0; while (first < t.totals.length && t.totals[first] === null) first++;
            foot = [{ runs: [{ x: 'TOTAL', b: 1 }], a: 'c', span: Math.max(1, first) }];
            for (var fi = Math.max(1, first); fi < t.cols.length; fi++) foot.push({ runs: t.totals[fi] ? [{ x: t.totals[fi], b: 1 }] : [], a: 'r' });
          }
          out.push({ k: 'table', id: id, cols: t.cols.map(function (c) { return { w: c.w, a: c.a }; }), head: hd, rows: body, foot: foot, border: true, data: b.f });
          break;
        }
        case 'img': {
          var src = b.src === 'org_logo' ? (doc.org && doc.org.logo ? 'file:' + doc.org.logo : '') : str(b.src);
          if (src || opt.miss) out.push({ k: 'img', id: id, src: src, w: Math.max(5, Math.min(100, +b.w || 30)) / 100, a: b.a || 'c', alt: b.alt || '' });
          break;
        }
        case 'pb': out.push({ k: 'pb', id: id }); break;
        case 'toc': { var te = { k: 'toc', id: id, title: b.title || 'DAFTAR ISI', entries: [] }; out.push(te); tocEls.push(te); break; }
        case 'sign':
          out.push({
            k: 'sign', id: id, place: b.place && b.place.length ? R(b.place) : null, title: b.title ? R(b.title) : null,
            items: (b.items || []).map(function (it) { return { label: R(it.l), name: R(it.n), sub: R(it.id) }; })
          });
          break;
        case 'adart': {
          ((doc.adart && doc.adart.parts) || []).forEach(function (part) {
            if (b.part && b.part !== 'all' && b.part !== part.kode) return;
            var ttl = [[{ x: str(part.judul).toUpperCase(), b: 1 }]];
            if (part.sub && part.sub.length) ttl.push(R(part.sub, part.kode).map(function (x) { var y = M.clone(x); y.b = 1; return y; }));
            head(1, part.id, ttl, str(part.judul).toUpperCase());
            if (part.mukadimah && part.mukadimah.length) {
              head(2, part.id + '_m', [[{ x: 'MUKADIMAH', b: 1 }]], 'MUKADIMAH', { a: 'c' });
              part.mukadimah.forEach(function (pr, i) { out.push({ k: 'p', id: part.id + '_m' + i, runs: R(pr, part.kode), a: 'j', ind: true }); });
            }
            (part.babs || []).forEach(function (bab) {
              var bn = num.bab[bab.id].n;
              head(2, bab.id, [[{ x: 'BAB ' + M.romawi(bn), b: 1 }], [{ x: str(bab.judul).toUpperCase(), b: 1 }]], 'BAB ' + M.romawi(bn) + ' ' + str(bab.judul).toUpperCase(), { a: 'c' });
              (bab.pasals || []).forEach(function (pas) {
                var pn = num.pasal[pas.id];
                out.push({ k: 'p', id: pas.id, runs: [{ x: 'Pasal ' + pn.n, b: 1 }], a: 'c', keep: 1, sb: 12 });
                if (pas.judul) out.push({ k: 'p', id: pas.id + '_j', runs: [{ x: str(pas.judul), b: 1 }], a: 'c', keep: 1 });
                var ays = pas.ayats || [];
                ays.forEach(function (ay, ai) {
                  var el = { k: 'p', id: ay.id, runs: R(ay.c, part.kode), a: 'j' };
                  if (ays.length > 1) el.list = { marker: '(' + (ai + 1) + ')', lvl: 0 };
                  out.push(el);
                });
              });
            });
          });
          break;
        }
      }
      for (var si = start; si < out.length; si++) out[si].src = id;
    });
    tocEls.forEach(function (te) { te.entries = heads.filter(function (h) { return h.id !== te.id; }).map(function (h) { return { lvl: h.lvl, text: h.text, ref: h.id }; }); });
    return out;
  };

  /* ---------- dokumen baru dari template ---------- */
  M.prefill = function (src, org) {
    var m = /^org\.(.+)$/.exec(str(src)); if (!m || !org) return '';
    if (m[1] === 'periode') return periode(org);
    var o = /^officer:(.+)$/.exec(m[1]);
    if (o) return officer({ org: org }, o[1]);
    return str(org[m[1]]);
  };
  M.emptyValue = function (f) {
    if (f.t === 'daterange') return { a: '', b: '' };
    if (f.t === 'list' || f.t === 'table' || f.t === 'rab') return [];
    return '';
  };
  M.newDoc = function (schema, org, opt) {
    opt = opt || {};
    var d = M.clone(schema) || {};
    d.v = M.VERSION; d.org = org || {}; d.fields = {}; d.stage = d.blocks && d.blocks.length ? 'builder' : 'editor';
    (d.fdefs || []).forEach(function (f) {
      var v = f.def !== undefined && f.def !== '' ? M.clone(f.def) : M.emptyValue(f);
      if (f.prefill) { var pv = M.prefill(f.prefill, org); if (pv) v = pv; }
      if (opt.sample && f.sample !== undefined) v = M.clone(f.sample);
      d.fields[f.k] = v;
    });
    (d.blocks || []).forEach(function (b) { if (!b.id) b.id = M.idgen(); });
    return M.sanitize(d);
  };

  /* ---------- SANITASI (server WAJIB memanggil sebelum menyimpan) ---------- */
  var LIM = { blocks: 3000, runs: 400, x: 20000, rows: 300, cols: 12, fdefs: 80, steps: 12, parts: 4, babs: 40, pasals: 150, ayats: 40 };
  function s(v, max) { v = str(v); return v.length > (max || 500) ? v.slice(0, max || 500) : v; }
  function key(v) { v = str(v).trim(); return /^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(v) ? v : ''; }
  function pkey(v) { v = str(v).trim(); return /^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(v) || /^(officer|nomor):[^{}<>\n]{1,40}$/.test(v) ? v : ''; }
  function sid(v) { v = str(v); return /^[A-Za-z0-9_-]{1,40}$/.test(v) ? v : M.idgen(); }
  function enumv(v, list, def) { return list.indexOf(v) > -1 ? v : def; }
  function clampN(v, a, b, d) { var n = +v; return isFinite(n) ? Math.max(a, Math.min(b, n)) : d; }
  M.cleanRuns = function (runs) {
    if (!Array.isArray(runs)) return typeof runs === 'string' ? M.plainRuns(runs) : [];
    var out = [];
    runs.slice(0, LIM.runs).forEach(function (r) {
      if (typeof r === 'string') r = { x: r };
      if (!isObj(r)) return;
      var o = {};
      if (r.p !== undefined) { var k = pkey(r.p); if (!k) return; o.p = k; }
      else if (r.r !== undefined) o.r = sid(r.r);
      else { o.x = s(r.x, LIM.x); if (o.x === '') return; }
      if (r.b) o.b = 1; if (r.i) o.i = 1; if (r.u) o.u = 1;
      out.push(o);
    });
    return out;
  };
  function cleanFdef(f) {
    if (!isObj(f)) return null;
    var k = key(f.k); if (!k) return null;
    var t = enumv(f.t, M.FIELD_TYPES, 'text');
    var o = { k: k, l: s(f.l || k, 80), t: t };
    if (f.req) o.req = true;
    if (f.ph) o.ph = s(f.ph, 160);
    if (f.help) o.help = s(f.help, 300);
    if (f.prefill) o.prefill = s(f.prefill, 60);
    if (t === 'select') o.opts = (Array.isArray(f.opts) ? f.opts : []).slice(0, 50).map(function (x) { return s(x, 120); });
    if (t === 'table') {
      o.cols = (Array.isArray(f.cols) ? f.cols : []).slice(0, 8).map(function (c) {
        return isObj(c) && key(c.k) ? { k: key(c.k), l: s(c.l || c.k, 60), t: enumv(c.t, ['text', 'number', 'currency', 'date'], 'text'), w: clampN(c.w, 0.3, 6, 1) } : null;
      }).filter(Boolean);
      if (f.no === false) o.no = false; if (f.sum) o.sum = true;
    }
    if (f.def !== undefined) o.def = cleanValue(o, f.def);
    if (f.sample !== undefined) o.sample = cleanValue(o, f.sample);
    if (f.w) o.w = enumv(f.w, ['full', 'half', 'third'], 'full');
    if (t === 'date' && f.fmt === 'hari') o.fmt = 'hari';
    return o;
  }
  function cleanValue(f, v) {
    switch (f.t) {
      case 'daterange': return { a: s(v && v.a, 10), b: s(v && v.b, 10) };
      case 'list': return (Array.isArray(v) ? v : []).slice(0, 100).map(function (x) { return s(x, 2000); });
      case 'rab': return (Array.isArray(v) ? v : []).slice(0, LIM.rows).filter(isObj).map(function (r) {
        return { uraian: s(r.uraian, 300), volume: s(r.volume, 20), satuan: s(r.satuan, 40), harga: s(r.harga, 20) };
      });
      case 'table': return (Array.isArray(v) ? v : []).slice(0, LIM.rows).filter(isObj).map(function (r) {
        var o = {}; (f.cols || []).forEach(function (c) { o[c.k] = s(r[c.k], 2000); }); return o;
      });
      case 'textarea': return s(v, LIM.x);
      default: return s(v, 1000);
    }
  }
  function cleanBlock(b) {
    if (!isObj(b) || M.BLOCK_TYPES.indexOf(b.t) < 0) return null;
    var o = { id: sid(b.id), t: b.t };
    switch (b.t) {
      case 'h1': case 'h2': o.c = M.cleanRuns(b.c); if (b.num === false) o.num = false; break;
      case 'p':
        o.c = M.cleanRuns(b.c); o.a = enumv(b.a, ['j', 'l', 'c', 'r'], 'j');
        if (b.ind) o.ind = true; if (b.fs) o.fs = clampN(b.fs, 8, 28, 12);
        if (b.sb) o.sb = clampN(b.sb, 0, 72, 0); if (b.sa) o.sa = clampN(b.sa, 0, 72, 0);
        break;
      case 'ul': case 'ol':
        if (b.src) o.src = key(b.src);
        else o.items = (Array.isArray(b.items) ? b.items : []).slice(0, 200).map(M.cleanRuns);
        if (b.st === 'a') o.st = 'a';
        break;
      case 'table':
        o.rows = (Array.isArray(b.rows) ? b.rows : []).slice(0, LIM.rows).map(function (r) { return (Array.isArray(r) ? r : []).slice(0, LIM.cols).map(M.cleanRuns); });
        var nc = o.rows.reduce(function (m, r) { return Math.max(m, r.length); }, 0);
        o.rows.forEach(function (r) { while (r.length < nc) r.push([]); });
        o.w = (Array.isArray(b.w) ? b.w : []).slice(0, nc).map(function (x) { return clampN(x, 0.2, 10, 1); });
        while (o.w.length < nc) o.w.push(1);
        if (b.head) o.head = true; if (b.border === false) o.border = false;
        break;
      case 'data': o.f = key(b.f); break;
      case 'img':
        o.src = b.src === 'org_logo' ? 'org_logo' : (/^file:[A-Za-z0-9_-]{5,80}$/.test(str(b.src)) ? b.src : '');
        o.w = clampN(b.w, 5, 100, 30); o.a = enumv(b.a, ['l', 'c', 'r'], 'c'); if (b.alt) o.alt = s(b.alt, 120);
        break;
      case 'toc': o.title = s(b.title || 'DAFTAR ISI', 60); break;
      case 'sign':
        o.place = M.cleanRuns(b.place); if (b.title) o.title = M.cleanRuns(b.title);
        o.items = (Array.isArray(b.items) ? b.items : []).slice(0, 8).filter(isObj).map(function (it) { return { l: M.cleanRuns(it.l), n: M.cleanRuns(it.n), id: M.cleanRuns(it.id) }; });
        break;
      case 'adart': o.part = enumv(b.part, ['all', 'AD', 'ART'], 'all'); break;
    }
    return o;
  }
  function cleanAdart(a) {
    if (!isObj(a)) return null;
    return {
      parts: (Array.isArray(a.parts) ? a.parts : []).slice(0, LIM.parts).filter(isObj).map(function (p) {
        return {
          id: sid(p.id), kode: s(p.kode || 'AD', 10).replace(/[^A-Za-z0-9]/g, '') || 'AD', judul: s(p.judul, 120), sub: M.cleanRuns(p.sub),
          mukadimah: (Array.isArray(p.mukadimah) ? p.mukadimah : []).slice(0, 20).map(M.cleanRuns),
          babs: (Array.isArray(p.babs) ? p.babs : []).slice(0, LIM.babs).filter(isObj).map(function (b) {
            return {
              id: sid(b.id), judul: s(b.judul, 160),
              pasals: (Array.isArray(b.pasals) ? b.pasals : []).slice(0, LIM.pasals).filter(isObj).map(function (pa) {
                return { id: sid(pa.id), judul: s(pa.judul, 160), ayats: (Array.isArray(pa.ayats) ? pa.ayats : []).slice(0, LIM.ayats).filter(isObj).map(function (ay) { return { id: sid(ay.id), c: M.cleanRuns(ay.c) }; }) };
              })
            };
          })
        };
      })
    };
  }
  M.cleanPage = function (p) {
    p = isObj(p) ? p : {};
    return {
      size: enumv(p.size, Object.keys(M.SIZES), 'A4'), mt: clampN(p.mt, 1, 6, 3), mr: clampN(p.mr, 1, 6, 3), mb: clampN(p.mb, 1, 6, 3), ml: clampN(p.ml, 1, 6, 4),
      font: enumv(p.font, M.FONTS, 'Times New Roman'), fs: clampN(p.fs, 9, 14, 12), ls: enumv(+p.ls, [1, 1.15, 1.5, 2], 1.5),
      kop: enumv(p.kop, ['none', 'first', 'all'], 'none'), pnum: enumv(p.pnum, ['none', 'all', 'skipFirst'], 'skipFirst'),
      pnumPos: enumv(p.pnumPos, ['center', 'right'], 'center'), headNum: p.headNum !== false, babHal: !!p.babHal
    };
  };
  M.sanitize = function (d) {
    d = isObj(d) ? d : {};
    var o = { v: M.VERSION, jenis: s(d.jenis || 'umum', 30).replace(/[^a-z_]/g, '') || 'umum', page: M.cleanPage(d.page) };
    o.fdefs = (Array.isArray(d.fdefs) ? d.fdefs : []).slice(0, LIM.fdefs).map(cleanFdef).filter(Boolean);
    var seen = {}; o.fdefs = o.fdefs.filter(function (f) { if (seen[f.k]) return false; seen[f.k] = 1; return true; });
    o.steps = (Array.isArray(d.steps) ? d.steps : []).slice(0, LIM.steps).filter(isObj).map(function (st) {
      var x = { id: sid(st.id), t: s(st.t, 60), f: (Array.isArray(st.f) ? st.f : []).map(key).filter(function (k) { return k && seen[k]; }) };
      if (st.type === 'adart') x.type = 'adart'; if (st.desc) x.desc = s(st.desc, 200);
      return x;
    });
    o.fields = {};
    var fv = isObj(d.fields) ? d.fields : {};
    o.fdefs.forEach(function (f) { o.fields[f.k] = fv[f.k] === undefined ? M.emptyValue(f) : cleanValue(f, fv[f.k]); });
    var org = isObj(d.org) ? d.org : {};
    o.org = {};
    ['id', 'nama', 'singkatan', 'jenis', 'induk', 'alamat', 'telepon', 'email', 'website', 'periode_mulai', 'periode_selesai', 'format_nomor_surat'].forEach(function (k) { o.org[k] = s(org[k], 400); });
    o.org.logo = /^[A-Za-z0-9_-]{5,80}$/.test(str(org.logo)) ? org.logo : '';
    o.org.officers = (Array.isArray(org.officers) ? org.officers : []).slice(0, 30).filter(isObj).map(function (x) { return { jabatan: s(x.jabatan, 80), nama: s(x.nama, 120), nomor: s(x.nomor, 40), peran: s(x.peran, 80) }; });
    o.blocks = (Array.isArray(d.blocks) ? d.blocks : []).slice(0, LIM.blocks).map(cleanBlock).filter(Boolean);
    var bseen = {}; o.blocks.forEach(function (b) { if (bseen[b.id]) b.id = M.idgen(); bseen[b.id] = 1; });
    o.adart = cleanAdart(d.adart);
    o.stage = enumv(d.stage, ['builder', 'editor'], 'editor');
    if (d.adartFixed) o.adartFixed = true;
    return o;
  };

  return M;
})();
if (typeof module !== 'undefined' && module.exports) module.exports = SipenaModel;
