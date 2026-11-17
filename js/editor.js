/* ==========================================================================
 * SIPENA — editor.js : renderer & paginator A4, isian dinamis, penyimpan
 * otomatis (autosave + cadangan lokal + konflik), builder bertahap, editor
 * pohon AD/ART, editor lembar kerja, ekspor/cetak, versi, komentar.
 * ========================================================================== */
(function () {
  'use strict';
  const A = window.App, esc = A.esc, I = A.icon, M = window.SipenaModel;
  const PX = 37.7953;                                              // px per cm (96 dpi)
  const FONT = { 'Times New Roman': "'Times New Roman', Tinos, 'Liberation Serif', serif", Arial: "Arial, Arimo, 'Liberation Sans', sans-serif", Cambria: 'Cambria, Caladea, serif', Calibri: 'Calibri, Carlito, sans-serif' };
  const meta0 = d => ({ today: A.today(), kode: d && d.kode, judul: d && d.judul });

  /* ======================= RENDERER & PAGINATOR ======================= */
  const Doc = A.Doc = {};
  Doc.vars = function (page) {
    const p = M.cleanPage(page), sz = M.SIZES[p.size];
    const v = { pw: sz[0] * PX, ph: sz[1] * PX, mt: p.mt * PX, mr: p.mr * PX, mb: p.mb * PX, ml: p.ml * PX, fs: p.fs * 4 / 3, lh: Math.round(1.15 * p.ls * 1000) / 1000, font: FONT[p.font] || FONT['Times New Roman'], page: p };
    v.cw = v.pw - v.ml - v.mr;
    v.style = '--pw:' + v.pw + 'px;--ph:' + v.ph + 'px;--mt:' + v.mt + 'px;--mr:' + v.mr + 'px;--mb:' + v.mb + 'px;--ml:' + v.ml + 'px;--docfs:' + v.fs + 'px;--doclh:' + v.lh + ';--docfont:' + v.font;
    return v;
  };
  Doc.runsHtml = function (runs, ex) {
    ex = ex || {};
    return (runs || []).map(r => {
      let t = esc(r.x).replace(/\n/g, '<br>');
      if (r.miss) t = '<span class="miss-mark">' + t + '</span>';
      if (r.u || ex.u) t = '<u>' + t + '</u>'; if (r.i) t = '<i>' + t + '</i>'; if (r.b || ex.b) t = '<b>' + t + '</b>';
      return t;
    }).join('');
  };
  Doc.imgHtml = function (src, wpx, ctx, cls) {
    const im = ctx.imgs[src];
    if (!im || !im.url) return '<span class="ph-img" style="width:' + Math.round(wpx) + 'px"><span>[GAMBAR]</span></span>';
    return '<img alt="" src="' + im.url + '" style="width:' + Math.round(wpx) + 'px;height:' + Math.round(wpx * im.h / im.w) + 'px" class="' + (cls || '') + '">';
  };
  Doc.html = function (el, ctx) {
    const V = ctx.V, st = [];
    if (el.fs) st.push('font-size:' + (el.fs * 4 / 3) + 'px');
    if (el.sb) st.push('padding-top:' + (el.sb * 4 / 3) + 'px');
    if (el.sa && !el.partial) st.push('padding-bottom:' + (el.sa * 4 / 3) + 'px');
    const sty = st.length ? ' style="' + st.join(';') + '"' : '';
    switch (el.k) {
      case 'h': return '<div class="dk-h l' + el.lvl + ' a-' + (el.a || 'l') + '" data-ref="' + esc(el.id) + '">' + el.lines.map(l => '<span class="ln">' + Doc.runsHtml(l, { b: 1 }) + '</span>').join('') + '</div>';
      case 'p': {
        const cls = ['dk-p', 'a-' + (el.a || 'j')];
        if (el.ind && !el.cont) cls.push('ind'); if (el.cont) cls.push('cont'); if (el.partial && (el.a || 'j') === 'j') cls.push('just-last');
        if (el.list) { cls.push('li'); const hang = el.list.marker && el.list.marker.length > 3 ? '1cm' : '0.75cm'; return '<p class="' + cls.join(' ') + '" style="--hang:' + hang + (st.length ? ';' + st.join(';') : '') + '"><span class="mk">' + (el.cont ? '' : esc(el.list.marker)) + '</span>' + Doc.runsHtml(el.runs) + '</p>'; }
        return '<p class="' + cls.join(' ') + '"' + sty + '>' + (Doc.runsHtml(el.runs) || '&#8203;') + '</p>';
      }
      case 'table': {
        const tot = el.cols.reduce((s, c) => s + (+c.w || 1), 0);
        const cell = (c, tag, i) => '<' + tag + ' class="a-' + (c.a || el.cols[i] && el.cols[i].a || 'l') + '"' + (c.span > 1 ? ' colspan="' + c.span + '"' : '') + '>' + (Doc.runsHtml(c.runs) || '&nbsp;') + '</' + tag + '>';
        const row = (cells, tag) => { let i = 0; return '<tr>' + cells.map(c => { const h = cell(c, tag, i); i += c.span || 1; return h; }).join('') + '</tr>'; };
        return '<div class="dk-tw" style="padding-bottom:' + (V.fs * 1.15 + 4) + 'px"><table class="dk-table ' + (el.border ? 'bd' : 'nb') + '"><colgroup>' + el.cols.map(c => '<col style="width:' + ((+c.w || 1) / tot * 100) + '%">').join('') + '</colgroup>' +
          (el.head ? '<thead>' + row(el.head, 'th') + '</thead>' : '') + '<tbody>' + (el.rows || []).map(r => row(r, 'td')).join('') + '</tbody>' + (el.foot ? '<tfoot>' + row(el.foot, 'td') + '</tfoot>' : '') + '</table></div>';
      }
      case 'img': return '<div class="dk-img a-' + (el.a || 'c') + '">' + Doc.imgHtml(el.src, V.cw * el.w, ctx) + '</div>';
      case 'toc': return '<div class="dk-toc"><div class="tt">' + esc(el.title) + '</div>' + (el.entries.length ? el.entries : [{ lvl: 1, text: '(Belum ada judul bab)', ref: '' }]).map(e => '<div class="te l' + e.lvl + '"><span class="tx">' + esc(e.text) + '</span><span class="dots"></span><span class="pg">' + (ctx.toc[e.ref] || '') + '</span></div>').join('') + '</div>';
      case 'sign': {
        const it = el.items || [];
        const cell = (x, cls) => '<div class="cell ' + (cls || '') + '">' + (Doc.runsHtml(x.label) || '&nbsp;') + '<div class="gap"></div><div class="nm">' + (Doc.runsHtml(x.name) || '(........................................)') + '</div>' + (M.runsText(x.sub).replace(/^[A-Za-z]+\.\s*$/, '').trim() ? '<div>' + Doc.runsHtml(x.sub) + '</div>' : '') + '</div>';
        let g = '';
        if (it.length === 1) g = cell(it[0], 'right');
        else for (let i = 0; i < it.length; i += 2) g += i + 1 < it.length ? cell(it[i]) + cell(it[i + 1]) : cell(it[i], 'full');
        return '<div class="dk-sign">' + (el.place ? '<div class="pl">' + Doc.runsHtml(el.place) + '</div>' : '') + (el.title ? '<div class="ti">' + Doc.runsHtml(el.title) + '</div>' : '') + '<div class="grid2">' + g + '</div></div>';
      }
    }
    return '';
  };
  Doc.kopHtml = function (org, ctx) {
    if (!org) return '';
    const logo = org.logo ? 'file:' + org.logo : '', lines = [];
    String(org.induk || '').split('\n').filter(Boolean).forEach(t => lines.push('<div class="k1">' + esc(t.toUpperCase()) + '</div>'));
    lines.push('<div class="k2">' + esc(String(org.nama || 'NAMA ORGANISASI').toUpperCase()) + '</div>');
    const kontak = [org.alamat, org.telepon ? 'Telp. ' + org.telepon : '', org.email ? 'Email: ' + org.email : '', org.website].filter(Boolean).join(' · ');
    if (kontak) lines.push('<div class="k3">' + esc(kontak) + '</div>');
    return '<div class="dk-kop ' + (logo && ctx.imgs[logo] ? '' : 'nologo') + '">' + (logo && ctx.imgs[logo] ? '<div class="kl">' + Doc.imgHtml(logo, ctx.V.cw * 0.16 - 8, ctx) + '</div>' : '') + '<div>' + lines.join('') + '</div></div><div class="dk-kop-line"></div>';
  };
  Doc.node = function (el, ctx) { const t = document.createElement('div'); t.innerHTML = Doc.html(el, ctx); const n = t.firstElementChild || document.createElement('div'); n.dataset.src = el.src || ''; return n; };
  Doc.preload = async function (doc, flow, docId) {
    const srcs = new Set(); flow.forEach(e => { if (e.k === 'img' && e.src) srcs.add(e.src); });
    if (doc.org && doc.org.logo && doc.page && doc.page.kop !== 'none') srcs.add('file:' + doc.org.logo);
    const imgs = {};
    await Promise.all(Array.from(srcs).map(async s => {
      const url = await A.fileUrl(s.replace(/^file:/, ''), docId);
      if (!url) return;
      await new Promise(res => { const im = new Image(); im.onload = () => { imgs[s] = { url: url, w: im.naturalWidth || 1, h: im.naturalHeight || 1 }; res(); }; im.onerror = res; im.src = url; });
    }));
    return imgs;
  };
  function host() { let h = document.getElementById('measure'); if (!h) { h = document.createElement('div'); h.id = 'measure'; h.style.cssText = 'position:absolute;left:-30000px;top:0;visibility:hidden;pointer-events:none'; document.body.appendChild(h); } return h; }
  Doc.sheet = function (V, n, ctx) {
    const p = V.page, s = document.createElement('div');
    s.className = 'sheet fixed'; s.setAttribute('style', V.style);
    const kop = p.kop === 'all' || (p.kop === 'first' && n === 1);
    const num = p.pnum === 'all' || (p.pnum === 'skipFirst' && n > 1);
    s.innerHTML = '<div class="s-head">' + (kop ? Doc.kopHtml(ctx.org, ctx) : '') + '</div><div class="s-body"></div><div class="s-foot ' + (p.pnumPos === 'right' ? 'r' : '') + '">' + (num ? n : '') + '</div>';
    return s;
  };
  function tokens(runs) { const out = []; (runs || []).forEach(r => { String(r.x || '').match(/\S+\s*|\s+/g) && String(r.x).match(/\S+\s*|\s+/g).forEach(w => out.push(Object.assign({}, r, { x: w }))); }); return out; }
  function joinTok(t) { const out = []; t.forEach(x => { const l = out[out.length - 1]; if (l && l.b === x.b && l.i === x.i && l.u === x.u && !!l.miss === !!x.miss) l.x += x.x; else out.push(Object.assign({}, x)); }); return out; }
  /** Paginasi tepat (pratinjau, cetak, nomor daftar isi). */
  Doc.paginate = async function (doc, opts) {
    opts = opts || {};
    const meta = opts.meta || meta0();
    const flow = M.flow(doc, meta, { miss: !!opts.miss });
    const imgs = await Doc.preload(doc, flow, opts.docId);
    const V = Doc.vars(doc.page), ctx = { V: V, imgs: imgs, toc: {}, org: doc.org };
    const once = toc => {
      ctx.toc = toc; const h = host(); h.innerHTML = '';
      const pages = [], heads = {};
      let sheet, body, avail, items, prevK = '';
      const newPage = () => {
        sheet = Doc.sheet(V, pages.length + 1, ctx); h.appendChild(sheet);
        body = sheet.querySelector('.s-body'); const head = sheet.querySelector('.s-head');
        const top = head.firstChild ? Math.max(V.mt, 37.8 + head.offsetHeight + 4) : V.mt;
        body.style.top = top + 'px'; avail = V.ph - top - V.mb; pages.push(sheet); items = [];
      };
      const fits = () => body.offsetHeight <= avail + 0.5;
      newPage();
      const queue = flow.slice();
      while (queue.length) {
        const el = queue.shift();
        if (el.k === 'pb') { newPage(); prevK = 'pb'; continue; }
        if (el.k === 'h' && el.lvl === 1 && V.page.babHal && prevK && prevK !== 'pb' && items.length) newPage();
        let node = Doc.node(el, ctx); body.appendChild(node); items.push({ el: el, node: node });
        if (!fits()) {
          let rest = null;
          if (el.k === 'p' && (el.runs || []).length) {                        // pecah paragraf per kata
            const tk = tokens(el.runs);
            let lo = 1, hi = tk.length - 1, best = 0;
            while (lo <= hi) { const mid = (lo + hi) >> 1; const n2 = Doc.node(Object.assign({}, el, { runs: joinTok(tk.slice(0, mid)), partial: true }), ctx); body.replaceChild(n2, node); node = n2; if (fits()) { best = mid; lo = mid + 1; } else hi = mid - 1; }
            if (best) { const n2 = Doc.node(Object.assign({}, el, { runs: joinTok(tk.slice(0, best)), partial: true }), ctx); body.replaceChild(n2, node); node = n2; items[items.length - 1].node = node; rest = Object.assign({}, el, { runs: joinTok(tk.slice(best)), cont: true, sb: 0 }); }
            else { body.replaceChild(Doc.node(el, ctx), node); node = body.lastChild; items[items.length - 1].node = node; }
          } else if (el.k === 'table' && (el.rows || []).length > 1) {           // pecah tabel per baris, header diulang
            let lo = 1, hi = el.rows.length - 1, best = 0;
            while (lo <= hi) { const mid = (lo + hi) >> 1; const n2 = Doc.node(Object.assign({}, el, { rows: el.rows.slice(0, mid), foot: null }), ctx); body.replaceChild(n2, node); node = n2; if (fits()) { best = mid; lo = mid + 1; } else hi = mid - 1; }
            if (best) { const n2 = Doc.node(Object.assign({}, el, { rows: el.rows.slice(0, best), foot: null }), ctx); body.replaceChild(n2, node); node = n2; items[items.length - 1].node = node; rest = Object.assign({}, el, { rows: el.rows.slice(best) }); }
            else { const n2 = Doc.node(el, ctx); body.replaceChild(n2, node); node = n2; items[items.length - 1].node = node; }
          } else if (el.k === 'toc' && el.entries.length > 1) {
            let lo = 1, hi = el.entries.length - 1, best = 0;
            while (lo <= hi) { const mid = (lo + hi) >> 1; const n2 = Doc.node(Object.assign({}, el, { entries: el.entries.slice(0, mid) }), ctx); body.replaceChild(n2, node); node = n2; if (fits()) { best = mid; lo = mid + 1; } else hi = mid - 1; }
            if (best) { const n2 = Doc.node(Object.assign({}, el, { entries: el.entries.slice(0, best) }), ctx); body.replaceChild(n2, node); node = n2; items[items.length - 1].node = node; rest = Object.assign({}, el, { entries: el.entries.slice(best), title: '' }); }
          }
          if (rest) { queue.unshift(rest); newPage(); }
          else if (!fits() && items.length > 1) {                          // pindah utuh + bawa judul (keep with next)
            const move = [items.pop()];
            while (items.length > 1 && (items[items.length - 1].el.k === 'h' || items[items.length - 1].el.keep)) move.unshift(items.pop());
            move.forEach(m => body.removeChild(m.node));
            newPage();
            move.forEach(m => { body.appendChild(m.node); items.push(m); });
          }
        }
        if (el.k === 'h') heads[el.id] = pages.length;
        prevK = el.k;
      }
      return { pages: pages, heads: heads };
    };
    let res = once({});
    if (flow.some(e => e.k === 'toc')) { const map = res.heads; res = once(map); res.toc = map; }
    else res.toc = res.heads;
    res.count = res.pages.length; res.V = V;
    return res;
  };
  Doc.mountPreview = async function (container, doc, opts) {
    opts = opts || {};
    container.innerHTML = '<div class="col" style="align-items:center;width:100%">' + A.skel(4) + '</div>';
    const res = await Doc.paginate(doc, opts);
    const s = opts.scale || 0.6, wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:' + Math.round(18 * s) + 'px;align-items:center';
    res.pages.slice(0, opts.maxPages || 999).forEach((pg, i) => {
      const box = document.createElement('div');
      box.style.cssText = 'width:' + res.V.pw * s + 'px;height:' + (opts.crop ? opts.crop : res.V.ph) * s + 'px;overflow:hidden;flex:none;position:relative;' + (opts.crop ? 'border:1px solid var(--line-2)' : '');
      pg.style.transform = 'scale(' + s + ')'; pg.style.transformOrigin = 'top left';
      box.appendChild(pg); wrap.appendChild(box);
      if (opts.onPage) opts.onPage(box, i);
    });
    if (opts.maxPages && res.pages.length > opts.maxPages) wrap.insertAdjacentHTML('beforeend', '<p class="help">… dan ' + (res.pages.length - opts.maxPages) + ' halaman lainnya</p>');
    container.innerHTML = ''; container.appendChild(wrap);
    return res;
  };

  /* ======================= ISIAN DINAMIS ======================= */
  const Fields = A.Fields = {};
  const numIn = v => String(v || '').replace(/[^\d]/g, '');
  Fields.render = function (box, content, keys, opt, onChange) {
    opt = opt || {};
    const fm = M.fdefMap(content), F = content.fields, ro = !!opt.readOnly, dis = ro ? 'disabled' : '';
    const wcls = f => opt.compact ? 'w-full' : f.w === 'half' ? 'w-half' : f.w === 'third' ? 'w-third' : 'w-full';
    const html = keys.map(k => fm[k]).filter(Boolean).map(f => {
      const v = F[f.k], id = 'f_' + f.k, lab = '<label for="' + id + '">' + esc(f.l) + (f.req ? ' <span class="req">*</span>' : '') + '</label>';
      let ctl = '';
      switch (f.t) {
        case 'textarea': ctl = '<textarea class="textarea" id="' + id + '" data-k="' + f.k + '" rows="' + (opt.compact ? 4 : 6) + '" placeholder="' + esc(f.ph || '') + '" ' + dis + '>' + esc(v) + '</textarea>'; break;
        case 'date': ctl = '<input class="input" type="date" id="' + id + '" data-k="' + f.k + '" value="' + esc(v) + '" ' + dis + '>'; break;
        case 'daterange': ctl = '<div class="grid g2" style="gap:10px"><div class="input-group"><span class="addon pre">Mulai</span><input class="input" type="date" id="' + id + '" data-k="' + f.k + '" data-part="a" value="' + esc(v && v.a) + '" ' + dis + '></div><div class="input-group"><span class="addon pre">Selesai</span><input class="input" type="date" data-k="' + f.k + '" data-part="b" value="' + esc(v && v.b) + '" ' + dis + ' aria-label="' + esc(f.l) + ' selesai"></div></div>'; break;
        case 'number': ctl = '<input class="input" inputmode="numeric" id="' + id + '" data-k="' + f.k + '" data-num="1" value="' + esc(v) + '" placeholder="' + esc(f.ph || '') + '" ' + dis + '>'; break;
        case 'currency': ctl = '<div class="input-group"><span class="addon pre">Rp</span><input class="input mono" inputmode="numeric" id="' + id + '" data-k="' + f.k + '" data-cur="1" value="' + esc(v ? M.angka(v) : '') + '" ' + dis + '></div>'; break;
        case 'select': ctl = '<select class="select" id="' + id + '" data-k="' + f.k + '" ' + dis + '><option value="">— Pilih —</option>' + (f.opts || []).map(o => '<option ' + (o === v ? 'selected' : '') + '>' + esc(o) + '</option>').join('') + (v && (f.opts || []).indexOf(v) < 0 ? '<option selected>' + esc(v) + '</option>' : '') + '</select>'; break;
        case 'nomor_surat': ctl = '<div class="input-group"><input class="input mono" id="' + id + '" data-k="' + f.k + '" value="' + esc(v) + '" placeholder="001/ORG/XI/2026" ' + dis + '>' + (ro ? '' : '<button type="button" class="addon" data-nomor="' + f.k + '" style="cursor:pointer;gap:6px">' + I('wand', 'sm') + 'Nomor otomatis</button>') + '</div>'; break;
        case 'list': ctl = '<div class="list-edit" data-list="' + f.k + '">' + (v && v.length ? v : ['']).map((x, i) => '<div class="li-row"><span class="mk">' + String.fromCharCode(97 + (i % 26)) + '.</span><input class="input" data-li="' + i + '" value="' + esc(x) + '" ' + dis + ' aria-label="' + esc(f.l) + ' butir ' + (i + 1) + '"><button type="button" class="btn btn-secondary btn-icon btn-sm" data-li-rm="' + i + '" aria-label="Hapus butir" ' + dis + '>' + I('x', 'sm') + '</button></div>').join('') + (ro ? '' : '<button type="button" class="btn btn-dashed btn-sm mt8" data-li-add>' + I('plus', 'sm') + 'Tambah butir</button>') + '</div>'; break;
        case 'table': case 'rab': ctl = Fields.tableHtml(f, v || [], ro); break;
        default: ctl = '<input class="input" id="' + id + '" data-k="' + f.k + '" value="' + esc(v) + '" placeholder="' + esc(f.ph || '') + '" ' + dis + '>';
      }
      return '<div class="field ' + (f.t === 'table' || f.t === 'rab' || f.t === 'textarea' || f.t === 'list' ? 'w-full' : wcls(f)) + '" data-field="' + f.k + '">' + lab + ctl + (f.help ? '<div class="help">' + esc(f.help) + '</div>' : '') + '<div class="err-slot"></div></div>';
    }).join('');
    box.innerHTML = '<div class="fgrid">' + html + '</div>';
    if (ro) return;
    const fire = k => { if (onChange) onChange(k); };
    box.oninput = e => {
      const t = e.target, k = t.dataset.k;
      if (k) {
        if (t.dataset.part) { F[k] = Object.assign({ a: '', b: '' }, F[k]); F[k][t.dataset.part] = t.value; }
        else if (t.dataset.cur) { const n = numIn(t.value); F[k] = n; }
        else if (t.dataset.num) { t.value = t.value.replace(/[^\d.,]/g, ''); F[k] = t.value; }
        else F[k] = t.value;
        const fe = t.closest('.field'); if (fe) { t.classList.remove('invalid'); fe.querySelector('.err-slot').innerHTML = ''; }
        fire(k); return;
      }
      const lk = t.closest('[data-list]');
      if (lk && t.dataset.li !== undefined) { const key = lk.dataset.list; F[key] = A.$$('[data-li]', lk).map(x => x.value); fire(key); return; }
      const tb = t.closest('[data-tbl]');
      if (tb && t.dataset.c) { const key = tb.dataset.tbl, rows = F[key] = F[key] || []; const ri = +t.closest('tr').dataset.r; rows[ri] = rows[ri] || {}; rows[ri][t.dataset.c] = t.dataset.cur ? numIn(t.value) : t.value; Fields.recalc(tb, fm[key], rows); fire(key); }
    };
    box.addEventListener('focusout', e => { const t = e.target; if (t.dataset.cur && t.value) t.value = M.angka(numIn(t.value)); });
    box.onclick = async e => {
      const b = e.target.closest('button'); if (!b) return;
      const lk = b.closest('[data-list]'), tb = b.closest('[data-tbl]');
      if (lk && (b.dataset.liAdd !== undefined || b.dataset.liRm !== undefined)) {
        const key = lk.dataset.list, arr = (F[key] || []).slice();
        if (b.dataset.liAdd !== undefined) arr.push(''); else arr.splice(+b.dataset.liRm, 1);
        F[key] = arr; Fields.render(box, content, keys, opt, onChange); fire(key);
        if (b.dataset.liAdd !== undefined) { const ins = A.$$('[data-list="' + key + '"] [data-li]', box); ins[ins.length - 1].focus(); }
        return;
      }
      if (tb && (b.dataset.rowAdd !== undefined || b.dataset.rowRm !== undefined || b.dataset.rowUp !== undefined)) {
        const key = tb.dataset.tbl, rows = (F[key] || []).slice();
        if (b.dataset.rowAdd !== undefined) rows.push({});
        else if (b.dataset.rowRm !== undefined) rows.splice(+b.dataset.rowRm, 1);
        else { const i = +b.dataset.rowUp; if (i > 0) { const x = rows[i]; rows[i] = rows[i - 1]; rows[i - 1] = x; } }
        F[key] = rows; Fields.render(box, content, keys, opt, onChange); fire(key);
        if (b.dataset.rowAdd !== undefined) { const trs = A.$$('[data-tbl="' + key + '"] tbody tr', box); const inp = trs.length && trs[trs.length - 1].querySelector('input'); if (inp) inp.focus(); }
        return;
      }
      if (b.dataset.nomor) {
        const kb = await A.prompt({ title: 'Nomor surat otomatis', text: 'Nomor urut berikutnya diambil dari server sesuai format organisasi. Isi kode bidang bila format memakai {{kode_bidang}}.', label: 'Kode bidang (opsional)', value: 'UM', ok: 'Buat nomor' });
        if (kb === null) return;
        const r = await A.api('doc.nomorSurat', { kode_bidang: kb });
        if (!r.success) return A.toast(r.message, 'bad');
        F[b.dataset.nomor] = r.data.nomor; A.$('#f_' + b.dataset.nomor, box).value = r.data.nomor; fire(b.dataset.nomor);
      }
    };
  };
  Fields.cols = f => f.t === 'rab' ? [{ k: 'uraian', l: 'Uraian kebutuhan / pos pengeluaran', t: 'text', w: 3 }, { k: 'volume', l: 'Volume', t: 'number', w: 0.9 }, { k: 'satuan', l: 'Satuan', t: 'text', w: 1 }, { k: 'harga', l: 'Harga satuan (Rp)', t: 'currency', w: 1.5 }] : (f.cols || []);
  Fields.tableHtml = function (f, rows, ro) {
    const cols = Fields.cols(f), dis = ro ? 'disabled' : '';
    const tw = cols.reduce((t, c) => t + (+c.w || 1), 0);
    let h = '<div data-tbl="' + f.k + '"><div class="tbl-wrap"><table class="dtable resp"><colgroup><col style="width:40px">' + cols.map(c => '<col style="width:' + Math.round((+c.w || 1) / tw * 100) + '%">').join('') + (f.t === 'rab' ? '<col style="width:130px">' : '') + (ro ? '' : '<col style="width:84px">') + '</colgroup><thead><tr><th style="width:36px">No</th>' + cols.map(c => '<th>' + esc(c.l) + '</th>').join('') + (f.t === 'rab' ? '<th style="text-align:right">Subtotal (Rp)</th>' : '') + (ro ? '' : '<th style="width:76px"></th>') + '</tr></thead><tbody>';
    h += (rows.length ? rows : []).map((r, i) => '<tr data-r="' + i + '"><td class="no">' + (i + 1) + '</td>' + cols.map(c => '<td data-l="' + esc(c.l) + '" class="' + (c.k === 'uraian' || c.k === 'kegiatan' || c.w >= 2.5 ? 'wide' : '') + '"><input class="input ' + (c.t === 'currency' ? 'mono' : '') + '" data-c="' + c.k + '" ' + (c.t === 'currency' ? 'data-cur="1" inputmode="numeric"' : c.t === 'number' ? 'inputmode="numeric"' : '') + ' type="' + (c.t === 'date' ? 'date' : 'text') + '" value="' + esc(c.t === 'currency' && r[c.k] ? M.angka(r[c.k]) : (r[c.k] || '')) + '" aria-label="' + esc(c.l) + ' baris ' + (i + 1) + '" ' + dis + '></td>').join('') +
      (f.t === 'rab' ? '<td class="calc" data-sub>' + M.angka(M.num(r.volume) * M.num(r.harga)) + '</td>' : '') + (ro ? '' : '<td class="x"><div class="row" style="gap:4px"><button type="button" class="btn btn-ghost btn-icon btn-sm" data-row-up="' + i + '" aria-label="Naikkan baris" ' + (i ? '' : 'disabled') + '>' + I('arrow-u', 'sm') + '</button><button type="button" class="btn btn-ghost btn-icon btn-sm" data-row-rm="' + i + '" aria-label="Hapus baris">' + I('trash', 'sm') + '</button></div></td>') + '</tr>').join('');
    h += '</tbody></table></div>' + (rows.length ? '' : '<p class="help" style="padding:12px 4px">Belum ada baris.</p>') + (ro ? '' : '<button type="button" class="btn btn-dashed add-row" data-row-add>' + I('plus', 'sm') + 'Tambah baris</button>');
    if (f.t === 'rab') { const t = M.table({ fdefs: [f], fields: { [f.k]: rows } }, f.k); h += '<div class="total-box" data-total><div class="eyebrow">Total rencana anggaran biaya</div><div class="v">' + M.rupiah(t.sum) + '</div><div class="tb">Terbilang: <b>' + esc(t.sum ? M.terbilang(t.sum) : '—') + '</b></div><div class="help mt8">Otomatis dipakai di naskah sebagai <span class="code">{{total_' + f.k + '}}</span> dan <span class="code">{{terbilang_' + f.k + '}}</span>.</div></div>'; }
    else if (f.sum) { const t = M.table({ fdefs: [f], fields: { [f.k]: rows } }, f.k); h += '<div class="total-box" data-total style="width:min(320px,100%)"><div class="eyebrow">Total</div><div class="v">' + M.rupiah(t.sum) + '</div></div>'; }
    return h + '</div>';
  };
  Fields.recalc = function (tb, f, rows) {
    if (f.t === 'rab') A.$$('tbody tr', tb).forEach((tr, i) => { const r = rows[+tr.dataset.r] || {}; const c = tr.querySelector('[data-sub]'); if (c) c.textContent = M.angka(M.num(r.volume) * M.num(r.harga)); });
    const box = tb.querySelector('[data-total]'); if (!box) return;
    const t = M.table({ fdefs: [f], fields: { [f.k]: rows } }, f.k);
    box.querySelector('.v').textContent = M.rupiah(t.sum);
    const tbx = box.querySelector('.tb b'); if (tbx) tbx.textContent = t.sum ? M.terbilang(t.sum) : '—';
  };
  Fields.validate = function (box, content, keys) {
    const fm = M.fdefMap(content); let bad = [];
    keys.forEach(k => { const f = fm[k]; if (f && f.req && M.isEmpty(f, content.fields[k])) bad.push(f); });
    bad.forEach(f => { const fe = A.$('[data-field="' + f.k + '"]', box); if (fe) { fe.querySelector('.err-slot').innerHTML = '<div class="err-msg">' + I('alert', 'sm') + 'Wajib diisi.</div>'; const inp = fe.querySelector('input,textarea,select'); if (inp) inp.classList.add('invalid'); } });
    if (bad.length) { const fe = A.$('[data-field="' + bad[0].k + '"]', box); if (fe) { fe.scrollIntoView({ block: 'center', behavior: 'smooth' }); const inp = fe.querySelector('input,textarea,select'); if (inp) inp.focus({ preventScroll: true }); } }
    return bad;
  };

  /* ======================= PENYIMPAN (AUTOSAVE) ======================= */
  function Saver(doc, content, opt) {
    this.doc = doc; this.content = content; this.ev = doc.edit_version; this.opt = opt || {};
    this.dirty = false; this.saving = false; this.again = false; this.fail = 0; this.lastAt = doc.updated_at; this.inds = [];
    this.timer = null; const self = this;
    this.onHide = () => { if (self.dirty) self.beacon(); };
    window.addEventListener('pagehide', this.onHide);
    this.onUnload = e => { if (self.dirty || self.saving) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', this.onUnload);
    this.onVis = () => { if (document.visibilityState === 'hidden' && self.dirty) self.save('auto'); };
    document.addEventListener('visibilitychange', this.onVis);
  }
  Saver.prototype.dispose = function () { clearTimeout(this.timer); window.removeEventListener('pagehide', this.onHide); window.removeEventListener('beforeunload', this.onUnload); document.removeEventListener('visibilitychange', this.onVis); };
  Saver.prototype.ind = function (el) { this.inds.push(el); this.paint(); };
  Saver.prototype.paint = function () {
    const s = this.conflict ? ['err', 'Konflik versi'] : this.saving ? ['saving', 'Menyimpan…'] : this.fail ? ['err', 'Gagal menyimpan — mencoba lagi'] : this.dirty ? ['dirty', 'Belum tersimpan'] : ['', 'Tersimpan ' + A.fmtTime(this.lastAt) + ' · v' + (this.doc.versi_terakhir || 0)];
    this.inds.forEach(el => { if (el && el.isConnected) { el.className = 'save-ind ' + s[0]; el.innerHTML = '<span class="dot"></span>' + esc(s[1]); el.setAttribute('aria-live', 'polite'); } });
  };
  Saver.prototype.touch = function () {
    if (this.opt.readOnly) return;
    this.dirty = true; this.paint();
    A.LS.set('draft.' + this.doc.id, { ev: this.ev, t: Date.now(), content: this.content, judul: this.doc.judul });
    clearTimeout(this.timer); this.timer = setTimeout(() => this.save('auto'), 3000);
  };
  Saver.prototype.save = async function (kind, extra) {
    if (this.opt.readOnly) return { success: false };
    clearTimeout(this.timer);
    if (this.saving) { this.again = kind || 'auto'; return this.pending; }
    if (!this.dirty && kind !== 'manual' && !extra) return { success: true };
    this.saving = true; this.paint();
    const body = Object.assign({ id: this.doc.id, content: this.content, ev: this.ev, kind: kind || 'auto', judul: this.doc.judul, halaman: this.doc.halaman || undefined }, extra || {});
    const wasDirtyAt = A.LS.get('draft.' + this.doc.id);
    this.pending = A.api('doc.save', body);
    const r = await this.pending;
    this.saving = false;
    if (r.success) {
      this.ev = r.data.edit_version; this.lastAt = r.data.saved_at; this.fail = 0; this.conflict = null;
      this.doc.versi_terakhir = r.data.versi; this.doc.status = r.data.status; this.doc.edit_version = this.ev;
      const cur = A.LS.get('draft.' + this.doc.id);
      if (!cur || !wasDirtyAt || cur.t === wasDirtyAt.t) { this.dirty = false; A.LS.del('draft.' + this.doc.id); }
      if (r.data.info) A.toast(r.data.info, 'info');
      if (this.opt.onSaved) this.opt.onSaved(r.data);
      A.invalidate('dash');
    } else if (r.code === 'CONFLICT') { this.conflict = r.data; this.showConflict(); }
    else if (r.code === 'AUTH' || r.code === 'FORBIDDEN' || r.code === 'NOT_FOUND') { this.fail = 1; }
    else { this.fail++; const wait = Math.min(60000, 5000 * Math.pow(2, this.fail - 1)); this.timer = setTimeout(() => this.save('auto'), wait); }
    this.paint();
    if (this.again && !this.conflict) { const k = this.again; this.again = false; if (this.dirty) return this.save(k); }
    return r;
  };
  Saver.prototype.flush = async function () { if (this.dirty || this.saving) { await this.save('auto'); if (this.saving) await this.pending; } return !this.dirty; };
  Saver.prototype.beacon = function () {
    try {
      const cfg = window.APP_CONFIG || {};
      navigator.sendBeacon(cfg.GAS_URL, new Blob([JSON.stringify({ action: 'doc.save', token: A.session.token, data: { id: this.doc.id, content: this.content, ev: this.ev, kind: 'auto', judul: this.doc.judul } })], { type: 'text/plain;charset=utf-8' }));
    } catch (e) { /* cadangan lokal tetap ada */ }
  };
  Saver.prototype.showConflict = function () {
    const old = A.$('.conflict'); if (old) old.remove();
    const c = this.conflict || {}, bar = document.createElement('div'), self = this;
    bar.className = 'conflict'; bar.setAttribute('role', 'alertdialog');
    bar.innerHTML = I('alert') + '<div><b>Versi lebih baru ditemukan di server</b><div class="help">Diubah ' + esc(c.oleh || 'pengguna lain') + ' · ' + esc(A.fmtRel(c.at)) + '. Perubahan Anda tersimpan di perangkat ini.</div></div><button class="btn btn-secondary btn-sm" data-c="cmp">Bandingkan</button><button class="btn btn-secondary btn-sm" data-c="reload">Muat ulang</button><button class="btn btn-primary btn-sm" data-c="force">Timpa versi server</button>';
    document.body.appendChild(bar);
    bar.onclick = async e => {
      const b = e.target.closest('[data-c]'); if (!b) return;
      if (b.dataset.c === 'force') { bar.remove(); self.conflict = null; self.dirty = true; await self.save('manual', { force: true, catatan: 'Menimpa versi server (konflik)' }); A.toast('Versi Anda disimpan sebagai versi terbaru.'); }
      if (b.dataset.c === 'reload') { if (!(await A.confirm({ title: 'Muat ulang dari server?', text: 'Perubahan lokal yang belum tersimpan akan dibuang.', ok: 'Muat ulang', danger: true }))) return; bar.remove(); self.dirty = false; A.LS.del('draft.' + self.doc.id); A.LS.del('doc.' + self.doc.id); A.render(); }
      if (b.dataset.c === 'cmp') {
        const r = await A.api('doc.get', { id: self.doc.id });
        if (!r.success) return A.toast(r.message, 'bad');
        const m = A.modal({ title: 'Bandingkan versi', size: 'xl', body: '<div class="grid g2"><div><div class="eyebrow mb8">Versi server (v' + r.data.doc.edit_version + ')</div><div class="well" id="ca" style="display:flex;justify-content:center;max-height:62vh;overflow:auto"></div></div><div><div class="eyebrow mb8">Versi Anda (belum tersimpan)</div><div class="well" id="cb" style="display:flex;justify-content:center;max-height:62vh;overflow:auto"></div></div></div>' });
        Doc.mountPreview(A.$('#ca', m.el), r.data.content, { scale: 0.42, docId: self.doc.id, meta: meta0(self.doc) });
        Doc.mountPreview(A.$('#cb', m.el), self.content, { scale: 0.42, docId: self.doc.id, meta: meta0(self.doc) });
      }
    };
  };

  /* ======================= MEMUAT DOKUMEN ======================= */
  async function loadDoc(id) {
    const c = A.LS.get('doc.' + id);
    if (c && Date.now() - c.t < 15000) { A.LS.del('doc.' + id); return { success: true, data: { doc: c.doc, content: c.content } }; }
    return A.api('doc.get', { id: id });
  }
  async function offerLocal(saver) {
    const d = A.LS.get('draft.' + saver.doc.id);
    if (!d || d.ev !== saver.ev || saver.opt.readOnly) { if (d && d.ev !== saver.ev) A.LS.del('draft.' + saver.doc.id); return; }
    if (await A.confirm({ title: 'Pulihkan perubahan lokal?', html: 'Ada perubahan yang belum tersimpan ke server dari <b>' + esc(A.fmtRel(new Date(d.t).toISOString())) + '</b> di perangkat ini. Pulihkan dan simpan sekarang?', ok: 'Pulihkan & simpan' })) {
      Object.keys(saver.content).forEach(k => delete saver.content[k]); Object.assign(saver.content, d.content);
      saver.dirty = true; await saver.save('auto'); return true;
    }
    A.LS.del('draft.' + saver.doc.id);
  }
  A.loadDoc = loadDoc;

  /* ======================= EKSPOR & CETAK ======================= */
  A.exportDoc = async function (saver, fmt, opts) {
    opts = opts || {};
    if (saver && !(await saver.flush())) { if (!(await A.confirm({ text: 'Perubahan terakhir belum tersimpan ke server. Ekspor tetap memakai versi terakhir di server. Lanjutkan?' }))) return; }
    const content = saver.content, miss = M.missing(content, meta0(saver.doc));
    if (miss.wajib.length && !opts.preview && !(await A.confirm({ title: 'Isian wajib belum lengkap', html: 'Isian berikut masih kosong dan tidak akan muncul di naskah:<ul style="margin:8px 0 0;padding-left:18px">' + miss.wajib.map(x => '<li>' + esc(x.l) + '</li>').join('') + '</ul>', ok: 'Tetap ekspor' }))) return;
    A.toast('Menyusun ' + (fmt === 'pdf' ? 'PDF' : 'DOCX') + '… (biasanya 5–20 detik)', 'info', { ms: 4500 });
    const pg = await Doc.paginate(content, { docId: saver.doc.id, meta: meta0(saver.doc) });
    const r = await A.api('doc.export', { id: saver.doc.id, format: fmt, toc: pg.toc, preview: !!opts.preview }, { timeout: 180000 });
    if (!r.success) return A.toast(r.message, 'bad');
    if ((r.data.peringatan || []).length) A.toast(r.data.peringatan.join('; '), 'warn');
    if (opts.preview) return r.data;
    A.download(r.data.b64, r.data.mime, r.data.nama);
    A.toast('Ekspor berhasil — ' + r.data.nama);
    return r.data;
  };
  A.printDoc = async function (content, docId, meta) {
    A.toast('Menyiapkan lembar cetak…', 'info');
    const pg = await Doc.paginate(content, { docId: docId, meta: meta });
    let root = document.getElementById('print-root'); if (root) root.remove();
    root = document.createElement('div'); root.id = 'print-root';
    const size = M.cleanPage(content.page).size, st = document.createElement('style');
    st.textContent = '@media print{@page{size:' + (size === 'F4' ? '215mm 330mm' : size === 'Letter' ? 'letter' : 'A4') + ';margin:0}}';
    root.appendChild(st); pg.pages.forEach(p => root.appendChild(p));
    document.body.appendChild(root);
    setTimeout(() => { window.print(); setTimeout(() => root.remove(), 1000); }, 300);
  };
  A.serverPreview = async function (saver) {
    const m = A.modal({ title: 'Pratinjau akurat (PDF dari server)', size: 'xl', body: '<div class="banner mb16">' + I('info') + '<div>Pratinjau di layar editor bersifat perkiraan; PDF berikut disusun server dari berkas DOCX yang sama dengan hasil unduhan — inilah acuan hasil cetak.</div></div><div id="pp" style="height:66vh;display:grid;place-items:center" class="well">' + A.skel(5) + '</div>', foot: '<button class="btn btn-secondary" data-x>Kembali menyunting</button><button class="btn btn-primary" id="dl" disabled>' + I('download') + 'Unduh PDF</button>' });
    const d = await A.exportDoc(saver, 'pdf', { preview: true });
    if (!d) { m.close(); return; }
    const url = URL.createObjectURL(A.b64Blob(d.b64, 'application/pdf'));
    A.$('#pp', m.el).innerHTML = '<iframe title="Pratinjau PDF" src="' + url + '" style="width:100%;height:100%;border:1px solid var(--line-2);background:#fff"></iframe>';
    const dl = A.$('#dl', m.el); dl.disabled = false; dl.onclick = () => { A.download(d.b64, 'application/pdf', d.nama); };
  };

  /* ======================= EDITOR POHON AD/ART ======================= */
  A.AdartEditor = function (box, content, opt, onChange) {
    opt = opt || {};
    const ro = !!opt.readOnly;
    if (!content.adart || !content.adart.parts || !content.adart.parts.length) content.adart = { parts: [{ id: A.uid(), kode: 'AD', judul: 'ANGGARAN DASAR', sub: [], mukadimah: [], babs: [] }] };
    const st = { part: 0, bab: null, pasal: null, q: '', open: {} };
    const parts = () => content.adart.parts, P = () => parts()[st.part];
    const find = () => { const p = P(); const bab = (p.babs || []).find(b => b.id === st.bab); const pas = bab && (bab.pasals || []).find(x => x.id === st.pasal); return { bab: bab, pas: pas }; };
    const pick = () => { const p = P(); if (!st.bab && p.babs.length) st.bab = p.babs[0].id; const f = find(); if (f.bab && !f.pas && f.bab.pasals.length && st.pasal !== '_bab') st.pasal = f.bab.pasals[0].id; st.open[st.bab] = true; };
    const changed = () => { if (onChange) onChange(); };
    const runsEd = (runs, attrs) => '<div class="rte" contenteditable="' + (!ro) + '" ' + attrs + '>' + A.Rich.toHtml(runs, content, opt.docId) + '</div>';
    const draw = () => {
      pick();
      const num = M.adartNum(content.adart), p = P(), f = find();
      const totalP = p.babs.reduce((s, b) => s + b.pasals.length, 0), totalA = p.babs.reduce((s, b) => s + b.pasals.reduce((x, y) => x + y.ayats.length, 0), 0);
      const q = st.q.toLowerCase();
      const tree = p.babs.map((b, bi) => {
        const hit = !q || (b.judul.toLowerCase().indexOf(q) > -1 || b.pasals.some(x => (x.judul + ' ' + x.ayats.map(a => M.runsText(a.c)).join(' ')).toLowerCase().indexOf(q) > -1));
        if (!hit) return '';
        const open = st.open[b.id] || !!q;
        return '<div class="bab ' + (b.id === st.bab ? 'on' : '') + '"><div class="bab-h" data-bab="' + b.id + '"><span class="grip">' + I('grip', 'sm') + '</span><span class="grow"><div class="bn">BAB ' + M.romawi(bi + 1) + '</div><div class="bt">' + esc(b.judul || '(tanpa judul)') + '</div></span><span class="ct">' + b.pasals.length + ' pasal</span><button class="btn btn-ghost btn-icon btn-sm" data-tog="' + b.id + '" aria-label="' + (open ? 'Ciutkan' : 'Perluas') + '">' + I(open ? 'chev-d' : 'chev-r', 'sm') + '</button></div>' +
          (open ? '<div class="pasal-list">' + b.pasals.map(x => '<div class="pasal-it ' + (x.id === st.pasal ? 'on' : '') + '" data-pas="' + x.id + '" data-in="' + b.id + '"><span class="grow">Pasal ' + num.pasal[x.id].n + (x.judul ? ': ' + esc(x.judul) : '') + '</span><span class="ay">' + x.ayats.length + ' ayat</span></div>').join('') + (ro ? '' : '<button class="btn btn-ghost btn-xs" data-addp="' + b.id + '">' + I('plus', 'sm') + 'Pasal</button>') + '</div>' : '') + '</div>';
      }).join('');
      let right = '';
      if (st.pasal === '_muk') {
        right = '<div class="sect-head"><span class="tag ink">' + esc(p.kode) + '</span><h2>Mukadimah & Judul</h2></div><div class="sect-body col" style="gap:14px"><div class="field"><label>Judul bagian</label><input class="input" data-pt="judul" value="' + esc(p.judul) + '" ' + (ro ? 'disabled' : '') + '></div><div class="field"><label>Sub-judul (mis. nama organisasi)</label>' + runsEd(p.sub, 'data-ps="1" data-ph="Contoh: {{org_nama}}"') + '</div><div class="lbl">Paragraf mukadimah</div>' +
          (p.mukadimah || []).map((m, i) => '<div class="ayat"><span class="an">' + (i + 1) + '</span>' + runsEd(m, 'data-mk="' + i + '"') + (ro ? '<span></span>' : '<button class="btn btn-ghost btn-icon btn-sm" data-mkrm="' + i + '" aria-label="Hapus paragraf">' + I('trash', 'sm') + '</button>') + '</div>').join('') + (ro ? '' : '<button class="btn btn-dashed" data-mkadd>' + I('plus', 'sm') + 'Tambah paragraf mukadimah</button>') + '</div>';
      } else if (f.bab && (st.pasal === '_bab' || !f.pas)) {
        right = '<div class="sect-head"><span class="tag ink">BAB ' + M.romawi(p.babs.indexOf(f.bab) + 1) + '</span><h2>Judul Bab</h2></div><div class="sect-body col" style="gap:14px"><div class="field"><label for="bj">Judul bab</label><input class="input" id="bj" data-bj="1" value="' + esc(f.bab.judul) + '" ' + (ro ? 'disabled' : '') + '></div>' + (ro ? '' : '<div class="row wrap"><button class="btn btn-secondary btn-sm" data-addp="' + f.bab.id + '">' + I('plus', 'sm') + 'Tambah pasal</button><button class="btn btn-secondary btn-sm" data-mvb="-1">' + I('arrow-u', 'sm') + 'Naikkan bab</button><button class="btn btn-secondary btn-sm" data-mvb="1">' + I('arrow-d', 'sm') + 'Turunkan bab</button><button class="btn btn-danger btn-sm" data-rmb>' + I('trash', 'sm') + 'Hapus bab</button></div>') + '</div>';
      } else if (f.pas) {
        const pn = num.pasal[f.pas.id].n;
        right = '<div class="sect-head" style="flex-wrap:wrap"><div class="grow"><div class="eyebrow" style="color:var(--blue-txt)">Bab ' + M.romawi(p.babs.indexOf(f.bab) + 1) + ' — ' + esc(f.bab.judul) + '</div><h2 style="margin-top:4px">Pasal ' + pn + (f.pas.judul ? ' · ' + esc(f.pas.judul) : '') + '</h2></div>' + (ro ? '' : '<div class="row"><button class="btn btn-secondary btn-sm" data-dup>' + I('copy', 'sm') + 'Gandakan</button><button class="btn btn-secondary btn-sm" data-mvp="-1" aria-label="Naikkan pasal">' + I('arrow-u', 'sm') + '</button><button class="btn btn-secondary btn-sm" data-mvp="1" aria-label="Turunkan pasal">' + I('arrow-d', 'sm') + '</button><button class="btn btn-danger btn-sm" data-rmp>' + I('trash', 'sm') + 'Hapus</button></div>') + '</div>' +
          '<div class="sect-body"><div class="grid" style="grid-template-columns:140px minmax(0,1fr);gap:14px"><div class="field"><label>Penomoran</label><input class="input" value="Pasal ' + pn + '" readonly><div class="help mono">Otomatis berurutan</div></div><div class="field"><label for="pj">Judul / pokok pasal</label><input class="input" id="pj" data-pj="1" value="' + esc(f.pas.judul) + '" ' + (ro ? 'disabled' : '') + '></div></div>' +
          '<div class="row between mt24 mb8"><span class="eyebrow">Daftar ayat (' + f.pas.ayats.length + ')</span><span class="help">Satu ayat tidak diberi nomor; dua ayat atau lebih diberi nomor (1), (2), … otomatis.</span></div>' +
          f.pas.ayats.map((a, i) => { const refs = a.c.filter(r => r.r !== undefined); return '<div class="ayat" data-ay="' + i + '"><span class="an">' + (f.pas.ayats.length > 1 ? '(' + (i + 1) + ')' : '—') + '</span><div>' + runsEd(a.c, 'data-ayc="' + i + '" data-ph="Isi ayat…"') + (refs.length ? '<div class="help mt8" style="color:var(--blue-txt)">' + I('link', 'sm') + ' Rujukan aktif: ' + refs.map(r => esc(M.refText(num, r.r))).join(', ') + ' — nomor ikut berubah bila struktur dipindah.</div>' : '') + '</div>' + (ro ? '<span></span>' : '<div class="col" style="gap:4px"><button class="btn btn-ghost btn-icon btn-sm" data-ref="' + i + '" title="Sisipkan rujukan pasal" aria-label="Sisipkan rujukan pasal">' + I('link', 'sm') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-aym="' + i + '" aria-label="Naikkan ayat" ' + (i ? '' : 'disabled') + '>' + I('arrow-u', 'sm') + '</button><button class="btn btn-ghost btn-icon btn-sm" data-ayrm="' + i + '" aria-label="Hapus ayat">' + I('trash', 'sm') + '</button></div>') + '</div>'; }).join('') +
          (ro ? '' : '<button class="btn btn-dashed btn-block mt12" data-ayadd>' + I('plus', 'sm') + 'Tambah ayat (' + (f.pas.ayats.length + 1) + ')</button>') + '</div>';
      } else right = '<div class="sect-body">' + A.empty('tree', 'Belum ada bab', 'Tambahkan bab pertama, lalu pasal dan ayatnya.') + '</div>';
      box.innerHTML = '<div class="banner ink mb16">' + I('info') + '<div>Penomoran bab, pasal, dan ayat dibuat otomatis. Memindah atau menghapus akan menomori ulang seluruh struktur dan rujukan antarpasal.</div></div>' +
        '<div class="ad-layout"><div class="tree"><div class="tree-head"><div class="tabs box" role="tablist">' + parts().map((x, i) => '<button data-part="' + i + '" aria-selected="' + (i === st.part) + '">' + esc(x.kode) + ' <span class="ct">' + x.babs.length + ' bab</span></button>').join('') + (ro || parts().length >= 2 ? '' : '<button data-addpart>' + I('plus', 'sm') + 'ART</button>') + '</div><div class="row between"><b class="mono" style="font-size:12px;color:var(--muted)">' + p.babs.length + ' bab · ' + totalP + ' pasal · ' + totalA + ' ayat</b><button class="btn btn-ghost btn-xs" data-muk>' + I('edit', 'sm') + 'Mukadimah</button></div><div class="search">' + I('search', 'sm') + '<input class="input" id="tq" placeholder="Cari bab, pasal, kata kunci…" value="' + esc(st.q) + '"></div>' + (ro ? '' : '<button class="btn btn-secondary btn-sm" data-addb>' + I('plus', 'sm') + 'Tambah bab baru</button>') + '</div><div class="tree-body">' + (tree || '<p class="muted" style="padding:8px">Tidak ada yang cocok.</p>') + '</div></div>' +
        '<div class="col" style="gap:16px"><section class="sect">' + right + '</section><section class="card"><div class="card-head"><h3>' + I('printer') + 'Pratinjau format lembar A4</h3><span class="eyebrow">' + esc(content.page.font) + ' ' + content.page.fs + ' pt · spasi ' + content.page.ls + '</span></div><div class="card-body well" style="border:0;border-radius:0 0 8px 8px;display:flex;justify-content:center;overflow:hidden" id="adpv"></div></section></div></div>';
      preview();
    };
    const preview = A.debounce(() => {
      const pv = A.$('#adpv', box); if (!pv) return;
      const f = find(), p = P(), ids = new Set();
      const bab = f.bab; if (!bab && st.pasal !== '_muk') { pv.innerHTML = '<p class="muted">Pilih bab atau pasal.</p>'; return; }
      if (st.pasal === '_muk') { ids.add(p.id); ids.add(p.id + '_m'); (p.mukadimah || []).forEach((x, i) => ids.add(p.id + '_m' + i)); }
      else { ids.add(bab.id); bab.pasals.forEach(x => { if (!f.pas || x.id === f.pas.id) { ids.add(x.id); ids.add(x.id + '_j'); x.ayats.forEach(a => ids.add(a.id)); } }); }
      const tmp = Object.assign({}, content, { blocks: [{ id: 'adpv', t: 'adart', part: p.kode }] });
      const els = M.flow(tmp, meta0(), { miss: true }).filter(e => ids.has(e.id));
      const V = Doc.vars(content.page), ctx = { V: V, imgs: {}, toc: {} };
      pv.innerHTML = '<div style="width:' + V.pw * 0.62 + 'px;overflow:hidden"><div class="sheet" style="' + V.style + ';min-height:0;transform:scale(.62);transform-origin:top left;padding:' + V.mt * 0.5 + 'px ' + V.mr + 'px ' + V.mb * 0.5 + 'px ' + V.ml + 'px" id="adsh">' + els.map(e => Doc.html(e, ctx)).join('') + '</div></div>';
      const sh = A.$('#adsh', pv); pv.firstChild.style.height = sh.offsetHeight * 0.62 + 'px';
    }, 120);
    const fx = () => find();
    box.oninput = e => {
      const t = e.target, f = fx(), p = P();
      if (t.id === 'tq') { st.q = t.value; draw(); const i = A.$('#tq', box); i.focus(); i.setSelectionRange(i.value.length, i.value.length); return; }
      if (t.dataset.bj) { f.bab.judul = t.value; const el = A.$('.bab.on .bt', box); if (el) el.textContent = t.value; }
      else if (t.dataset.pj) { f.pas.judul = t.value; }
      else if (t.dataset.pt) p.judul = t.value;
      else if (t.dataset.ps) p.sub = A.Rich.parse(t);
      else if (t.dataset.mk !== undefined) p.mukadimah[+t.dataset.mk] = A.Rich.parse(t);
      else if (t.dataset.ayc !== undefined) f.pas.ayats[+t.dataset.ayc].c = A.Rich.parse(t);
      else return;
      changed(); preview();
    };
    box.onclick = async e => {
      const b = e.target.closest('button,[data-bab],[data-pas]'); if (!b) return;
      const p = P(), f = fx(), d = b.dataset;
      if (d.part !== undefined) { st.part = +d.part; st.bab = null; st.pasal = null; return draw(); }
      if (d.addpart !== undefined) { parts().push({ id: A.uid(), kode: 'ART', judul: 'ANGGARAN RUMAH TANGGA', sub: [{ p: 'org_nama' }], mukadimah: [], babs: [] }); st.part = parts().length - 1; st.bab = null; changed(); return draw(); }
      if (d.tog) { st.open[d.tog] = !st.open[d.tog]; return draw(); }
      if (d.bab) { st.bab = d.bab; st.pasal = '_bab'; st.open[d.bab] = true; return draw(); }
      if (d.pas) { st.bab = d.in; st.pasal = d.pas; return draw(); }
      if (d.muk !== undefined) { st.pasal = '_muk'; return draw(); }
      if (ro) return;
      if (d.addb !== undefined) { const nb = { id: A.uid(), judul: 'Judul Bab Baru', pasals: [{ id: A.uid(), judul: '', ayats: [{ id: A.uid(), c: [] }] }] }; p.babs.push(nb); st.bab = nb.id; st.pasal = '_bab'; st.open[nb.id] = true; changed(); draw(); const i = A.$('#bj', box); if (i) i.select(); return; }
      if (d.addp) { const bab = p.babs.find(x => x.id === d.addp); const np = { id: A.uid(), judul: '', ayats: [{ id: A.uid(), c: [] }] }; bab.pasals.push(np); st.bab = bab.id; st.pasal = np.id; st.open[bab.id] = true; changed(); draw(); const i = A.$('#pj', box); if (i) i.focus(); return; }
      if (d.mvb) { const i = p.babs.indexOf(f.bab), j = i + +d.mvb; if (j < 0 || j >= p.babs.length) return; p.babs.splice(i, 1); p.babs.splice(j, 0, f.bab); changed(); return draw(); }
      if (d.rmb !== undefined) { if (!(await A.confirm({ title: 'Hapus bab?', text: 'Bab "' + f.bab.judul + '" beserta ' + f.bab.pasals.length + ' pasal di dalamnya akan dihapus. Rujukan ke pasal tersebut menjadi "[rujukan terhapus]".', ok: 'Hapus bab', danger: true }))) return; p.babs.splice(p.babs.indexOf(f.bab), 1); st.bab = null; st.pasal = null; changed(); return draw(); }
      if (d.mvp) {
        const flat = []; p.babs.forEach(bb => bb.pasals.forEach(x => flat.push({ bab: bb, pas: x })));
        const i = flat.findIndex(x => x.pas === f.pas), j = i + +d.mvp; if (j < 0 || j >= flat.length) return;
        const tgt = flat[j]; f.bab.pasals.splice(f.bab.pasals.indexOf(f.pas), 1);
        if (tgt.bab === f.bab) { const ti = f.bab.pasals.indexOf(tgt.pas); f.bab.pasals.splice(+d.mvp > 0 ? ti + 1 : ti, 0, f.pas); }
        else { if (+d.mvp > 0) tgt.bab.pasals.unshift(f.pas); else tgt.bab.pasals.push(f.pas); st.bab = tgt.bab.id; st.open[tgt.bab.id] = true; }
        changed(); return draw();
      }
      if (d.dup !== undefined) { const c = JSON.parse(JSON.stringify(f.pas)); c.id = A.uid(); c.ayats.forEach(a => { a.id = A.uid(); }); f.bab.pasals.splice(f.bab.pasals.indexOf(f.pas) + 1, 0, c); st.pasal = c.id; changed(); return draw(); }
      if (d.rmp !== undefined) { if (!(await A.confirm({ text: 'Hapus Pasal ' + M.adartNum(content.adart).pasal[f.pas.id].n + '? Pasal sesudahnya akan dinomori ulang.', ok: 'Hapus', danger: true }))) return; f.bab.pasals.splice(f.bab.pasals.indexOf(f.pas), 1); st.pasal = '_bab'; changed(); return draw(); }
      if (d.ayadd !== undefined) { f.pas.ayats.push({ id: A.uid(), c: [] }); changed(); draw(); const eds = A.$$('[data-ayc]', box); eds[eds.length - 1].focus(); return; }
      if (d.ayrm !== undefined) { f.pas.ayats.splice(+d.ayrm, 1); changed(); return draw(); }
      if (d.aym !== undefined) { const i = +d.aym; const x = f.pas.ayats[i]; f.pas.ayats[i] = f.pas.ayats[i - 1]; f.pas.ayats[i - 1] = x; changed(); return draw(); }
      if (d.mkadd !== undefined) { (p.mukadimah = p.mukadimah || []).push([]); changed(); return draw(); }
      if (d.mkrm !== undefined) { p.mukadimah.splice(+d.mkrm, 1); changed(); return draw(); }
      if (d.ref !== undefined) {
        const ed = A.$('[data-ayc="' + d.ref + '"]', box), num = M.adartNum(content.adart), opts = [];
        parts().forEach(pp => pp.babs.forEach(bb => bb.pasals.forEach(x => { if (x === f.pas) return; opts.push({ id: x.id, t: pp.kode + ' · Pasal ' + num.pasal[x.id].n + (x.judul ? ' — ' + x.judul : '') }); x.ayats.forEach((a, ai) => { if (x.ayats.length > 1) opts.push({ id: a.id, t: pp.kode + ' · Pasal ' + num.pasal[x.id].n + ' ayat (' + (ai + 1) + ')', sub: 1 }); }); })));
        const m = A.modal({ title: 'Sisipkan rujukan pasal', body: '<div class="search mb16">' + I('search', 'sm') + '<input class="input" id="rq" placeholder="Cari pasal…"></div><div id="rl" style="max-height:50vh;overflow:auto"></div>' });
        const list = q => { A.$('#rl', m.el).innerHTML = opts.filter(o => !q || o.t.toLowerCase().indexOf(q) > -1).map(o => '<button class="li-item" style="padding:10px 12px' + (o.sub ? ';margin-left:20px;width:calc(100% - 20px)' : '') + '" data-r="' + o.id + '">' + I('link', 'sm') + '<span>' + esc(o.t) + '</span></button>').join('') || '<p class="muted">Tidak ada.</p>'; };
        list(''); A.$('#rq', m.el).oninput = e2 => list(e2.target.value.toLowerCase());
        A.on(m.el, 'click', '[data-r]', (e2, x) => { m.close(); A.Rich.insert(ed, { r: x.dataset.r }, content); f.pas.ayats[+d.ref].c = A.Rich.parse(ed); changed(); draw(); });
      }
    };
    draw();
    return { redraw: draw };
  };

  /* ======================= TEKS KAYA (runs ↔ DOM) ======================= */
  const Rich = A.Rich = {};
  Rich.chip = function (r, content, num) {
    if (r.p !== undefined) { const v = M.ph(content, r.p, A._meta || meta0()); return '<span class="ph-chip' + (v ? '' : ' miss') + '" contenteditable="false" data-p="' + esc(r.p) + '" title="' + esc(M.phLabel(content, r.p)) + '">' + esc(v || '[' + M.phLabel(content, r.p) + ']') + '</span>'; }
    if (r.r !== undefined) return '<span class="ref-chip" contenteditable="false" data-r="' + esc(r.r) + '">' + esc(M.refText(num || M.adartNum(content.adart), r.r)) + '</span>';
    return '';
  };
  Rich.toHtml = function (runs, content) {
    const num = M.adartNum(content.adart);
    return (runs || []).map(r => {
      let t = r.x !== undefined ? esc(r.x).replace(/\n/g, '<br>') : Rich.chip(r, content, num);
      if (r.u) t = '<u>' + t + '</u>'; if (r.i) t = '<i>' + t + '</i>'; if (r.b) t = '<b>' + t + '</b>';
      return t;
    }).join('');
  };
  Rich.parse = function (ce) {
    const out = [];
    const push = r => { const l = out[out.length - 1]; if (r.x !== undefined && l && l.x !== undefined && !!l.b === !!r.b && !!l.i === !!r.i && !!l.u === !!r.u) l.x += r.x; else out.push(r); };
    const walk = (n, s) => {
      if (n.nodeType === 3) { if (n.nodeValue) push(Object.assign({ x: n.nodeValue.replace(/​/g, '') }, s)); return; }
      if (n.nodeType !== 1) return;
      if (n.dataset && n.dataset.p !== undefined) return push(Object.assign({ p: n.dataset.p }, s));
      if (n.dataset && n.dataset.r !== undefined) return push(Object.assign({ r: n.dataset.r }, s));
      if (n.tagName === 'BR') return push(Object.assign({ x: '\n' }, s));
      const s2 = Object.assign({}, s), fw = n.style && n.style.fontWeight;
      if (/^(B|STRONG)$/.test(n.tagName) || fw === 'bold' || +fw >= 600) s2.b = 1;
      if (/^(I|EM)$/.test(n.tagName) || (n.style && n.style.fontStyle === 'italic')) s2.i = 1;
      if (n.tagName === 'U' || (n.style && /underline/.test(n.style.textDecoration || ''))) s2.u = 1;
      if (/^(DIV|P)$/.test(n.tagName) && n !== ce && out.length) push(Object.assign({ x: '\n' }, s));
      n.childNodes.forEach(c => walk(c, s2));
    };
    ce.childNodes.forEach(c => walk(c, {}));
    const l = out[out.length - 1]; if (l && l.x !== undefined) { l.x = l.x.replace(/\n$/, ''); if (!l.x) out.pop(); }
    return out.map(r => { const o = {}; if (r.p !== undefined) o.p = r.p; else if (r.r !== undefined) o.r = r.r; else o.x = r.x; if (r.b) o.b = 1; if (r.i) o.i = 1; if (r.u) o.u = 1; return o; });
  };
  Rich.insert = function (ce, run, content) {
    ce.focus();
    const sel = getSelection(); let range = sel.rangeCount && ce.contains(sel.anchorNode) ? sel.getRangeAt(0) : null;
    if (!range) { range = document.createRange(); range.selectNodeContents(ce); range.collapse(false); }
    range.deleteContents();
    const t = document.createElement('span'); t.innerHTML = Rich.chip(run, content);
    const chip = t.firstChild, sp = document.createTextNode(' ');
    range.insertNode(sp); range.insertNode(chip);
    range.setStartAfter(sp); range.collapse(true); sel.removeAllRanges(); sel.addRange(range);
  };
  Rich.caret = function (ce) { const s = getSelection(); if (!s.rangeCount || !ce.contains(s.anchorNode)) return -1; const r = s.getRangeAt(0).cloneRange(); r.selectNodeContents(ce); r.setEnd(s.anchorNode, s.anchorOffset); return r.toString().length; };
  Rich.setCaret = function (ce, off) {
    ce.focus(); const sel = getSelection(), range = document.createRange();
    let left = Math.max(0, off), done = false;
    const walk = n => {
      if (done) return;
      if (n.nodeType === 3) { if (left <= n.nodeValue.length) { range.setStart(n, left); done = true; return; } left -= n.nodeValue.length; return; }
      if (n.nodeType === 1 && n.getAttribute('contenteditable') === 'false') { const L = n.textContent.length; if (left <= L) { range.setStartAfter(n); done = true; return; } left -= L; return; }
      n.childNodes.forEach(walk);
    };
    walk(ce);
    if (!done) { range.selectNodeContents(ce); range.collapse(false); } else range.collapse(true);
    sel.removeAllRanges(); sel.addRange(range);
  };

  /* ======================= EDITOR LEMBAR KERJA ======================= */
  const TEXT = { p: 1, h1: 1, h2: 1 };
  function EditView(host, o) {
    this.host = host; this.o = o; this.c = o.content; this.ro = !!o.readOnly; this.hist = []; this.fut = []; this.sel = null; this.cmt = {};
    this.relayout = A.debounce(() => this.layout(), 350);
    this.snapT = A.debounce(() => { this.typing = false; }, 900);
  }
  A.EditView = EditView;
  EditView.prototype.snap = function () { this.hist.push(JSON.stringify({ blocks: this.c.blocks, fields: this.c.fields, page: this.c.page })); if (this.hist.length > 80) this.hist.shift(); this.fut = []; };
  EditView.prototype.undo = function (redo) {
    const from = redo ? this.fut : this.hist, to = redo ? this.hist : this.fut;
    if (!from.length) return A.toast(redo ? 'Tidak ada yang dapat diulang.' : 'Tidak ada yang dapat diurungkan.', 'info');
    to.push(JSON.stringify({ blocks: this.c.blocks, fields: this.c.fields, page: this.c.page }));
    const s = JSON.parse(from.pop()); this.c.blocks = s.blocks; this.c.fields = s.fields; this.c.page = s.page;
    this.render(); this.o.onChange('undo');
  };
  EditView.prototype.changed = function (kind) {
    if (kind === 'type') { if (!this.typing) { this.typing = true; this.hist.push(this._before || JSON.stringify({ blocks: this.c.blocks, fields: this.c.fields, page: this.c.page })); this.fut = []; } this.snapT(); }
    this.o.onChange(kind || 'edit'); this.relayout();
  };
  EditView.prototype.render = function (focusKey) {
    const V = this.V = Doc.vars(this.c.page), self = this;
    this.flow = M.flow(this.c, this.o.meta, { miss: true });
    this.bySrc = {}; this.flow.forEach(e => { (this.bySrc[e.src] = this.bySrc[e.src] || []).push(e); });
    this.ctx = { V: V, imgs: this.imgs || {}, toc: this.toc || {}, org: this.c.org };
    this.els = this.c.blocks.map(b => this.blockEl(b));
    this.layout(true);
    if (focusKey) this.focus(focusKey.k, focusKey.off);
    if (!this._pre) { this._pre = true; Doc.preload(this.c, this.flow, this.o.docId).then(im => { self.imgs = im; self.render(); }); }
  };
  EditView.prototype.blockEl = function (b) {
    const w = document.createElement('div'), ro = this.ro, ce = ro ? 'false' : 'true', ctx = this.ctx, els = this.bySrc[b.id] || [];
    w.className = 'blk' + (this.cmt[b.id] ? ' has-cmt' : '') + (this.sel === b.id ? ' sel' : ''); w.dataset.id = b.id; w.dataset.bt = b.t;
    const gut = ro ? '' : '<div class="gutter" contenteditable="false"><button data-g="up" title="Naikkan" aria-label="Naikkan blok">' + I('arrow-u') + '</button><button data-g="down" title="Turunkan" aria-label="Turunkan blok">' + I('arrow-d') + '</button><button data-g="more" title="Lainnya" aria-label="Opsi blok">' + I('more') + '</button></div>';
    const st = (b.sb ? 'padding-top:' + b.sb * 4 / 3 + 'px;' : '') + (b.sa ? 'padding-bottom:' + b.sa * 4 / 3 + 'px;' : '') + (b.fs ? 'font-size:' + b.fs * 4 / 3 + 'px;' : '');
    if (b.t === 'p') w.innerHTML = gut + '<div class="ce dk-p a-' + (b.a || 'j') + (b.ind ? ' ind' : '') + '" contenteditable="' + ce + '" style="' + st + '" data-k="' + b.id + '" spellcheck="true">' + Rich.toHtml(b.c, this.c) + '</div>';
    else if (b.t === 'h1' || b.t === 'h2') {
      const e = els[0], pre = e ? (b.t === 'h1' ? (e.lines.length > 1 ? M.runsText(e.lines[0]) : '') : ((e.lines[0][0] || {}).x || '').match(/^[A-Z]+\. $/) ? e.lines[0][0].x : '') : '';
      w.innerHTML = gut + '<div class="dk-h l' + b.t[1] + ' a-' + (b.t === 'h1' ? 'c' : 'l') + '">' + (pre ? '<span class="' + (b.t === 'h1' ? 'ln' : '') + '" contenteditable="false">' + esc(pre) + '</span>' : '') + '<span class="ce ' + (b.t === 'h1' ? 'ln' : '') + '" contenteditable="' + ce + '" data-k="' + b.id + '" style="' + (b.t === 'h1' ? 'text-transform:none' : '') + '">' + Rich.toHtml(b.c, this.c) + '</span></div>';
    } else if ((b.t === 'ul' || b.t === 'ol') && !b.src) {
      w.innerHTML = gut + (b.items || [[]]).map((it, i) => '<p class="dk-p li" style="--hang:0.75cm"><span class="mk" contenteditable="false">' + (b.t === 'ul' ? '•' : b.st === 'a' ? String.fromCharCode(97 + i) + '.' : (i + 1) + '.') + '</span><span class="ce" contenteditable="' + ce + '" data-k="' + b.id + '" data-i="' + i + '">' + Rich.toHtml(it, this.c) + '</span></p>').join('');
    } else if (b.t === 'table') {
      const tot = (b.w || []).reduce((s, x) => s + x, 0) || 1;
      w.innerHTML = gut + '<div class="dk-tw" style="padding-bottom:' + (this.V.fs * 1.15 + 4) + 'px"><table class="dk-table ' + (b.border === false ? 'nb' : 'bd') + '"><colgroup>' + (b.w || []).map(x => '<col style="width:' + x / tot * 100 + '%">').join('') + '</colgroup><tbody>' + (b.rows || []).map((row, r) => '<tr>' + row.map((cell, c) => '<td class="ce" contenteditable="' + ce + '" data-k="' + b.id + '" data-r="' + r + '" data-c="' + c + '" style="' + (b.head && r === 0 ? 'font-weight:700;background:' + (b.border === false ? 'none' : '#E7E9EC') : '') + '">' + Rich.toHtml(cell, this.c) + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>';
    } else if (b.t === 'pb') {
      w.className += ' widget'; w.innerHTML = gut + '<div class="blk-pb" tabindex="0">— PEMISAH HALAMAN —</div>';
    } else {
      w.className += ' widget'; w.tabIndex = 0;
      const lbl = { data: 'Tabel data: ' + M.phLabel(this.c, b.f), img: 'Gambar', toc: 'Daftar isi (otomatis)', sign: 'Blok tanda tangan', adart: 'Struktur AD/ART', ul: 'Daftar dari isian: ' + M.phLabel(this.c, b.src), ol: 'Daftar dari isian: ' + M.phLabel(this.c, b.src) }[b.t] || b.t;
      w.title = lbl + ' — klik untuk memilih';
      w.innerHTML = gut + (els.length ? els.map(e => Doc.html(e, ctx)).join('') : '<div class="blk-pb">' + esc(lbl) + ' (kosong)</div>');
    }
    return w;
  };
  EditView.prototype.layout = function (force) {
    const V = this.V, p = V.page, self = this;
    const hasKop = n => p.kop === 'all' || (p.kop === 'first' && n === 1);
    if (!this.sheets) this.sheets = [];
    // ukur tinggi blok (lebar lembar sama di semua halaman)
    let probe = this.host.querySelector('.sheet .s-body');
    if (!probe) { this.host.innerHTML = ''; const s = Doc.sheet(V, 1, this.ctx); s.classList.remove('fixed'); this.host.appendChild(s); this.sheets = [s]; probe = s.querySelector('.s-body'); probe.style.position = 'relative'; }
    const live = this.els.filter(e => !e.isConnected);
    live.forEach(e => probe.appendChild(e));
    const hs = this.els.map(e => e.offsetHeight);
    const plan = []; let cur = [], used = 0, n = 1;
    const avail = k => { if (!hasKop(k)) return V.ph - V.mt - V.mb; return V.ph - Math.max(V.mt, 37.8 + (self._kopH || 120) + 4) - V.mb; };
    this.c.blocks.forEach((b, i) => {
      const h = hs[i];
      if (b.t === 'h1' && p.babHal && cur.length && this.c.blocks[i - 1] && this.c.blocks[i - 1].t !== 'pb') { plan.push(cur); cur = []; used = 0; n++; }
      if (used + h > avail(n) && cur.length) {
        const carry = []; while (cur.length > 1 && /^h[12]$/.test(this.c.blocks[cur[cur.length - 1]].t)) carry.unshift(cur.pop());
        plan.push(cur); cur = carry; used = carry.reduce((s, j) => s + hs[j], 0); n++;
      }
      cur.push(i); used += h;
      if (b.t === 'pb') { plan.push(cur); cur = []; used = 0; n++; }
    });
    plan.push(cur);
    const sig = plan.map(x => x.join(',')).join('|') + '#' + V.style;
    if (!force && sig === this._sig) return;
    this._sig = sig;
    const ae = document.activeElement, key = ae && ae.classList && ae.classList.contains('ce') ? this.ceKey(ae) : null, off = key ? Rich.caret(ae) : -1;
    const scrollP = this.host.parentElement ? this.host.parentElement.scrollTop : 0;
    while (this.sheets.length > plan.length) this.sheets.pop().remove();
    plan.forEach((idx, k) => {
      let s = this.sheets[k];
      if (!s || force) { const ns = Doc.sheet(V, k + 1, this.ctx); ns.classList.remove('fixed'); if (s) s.replaceWith(ns); else this.host.appendChild(ns); s = this.sheets[k] = ns; }
      const head = s.querySelector('.s-head'), body = s.querySelector('.s-body');
      if (head.firstChild && k === 0) this._kopH = head.offsetHeight;
      body.style.position = 'relative'; body.style.left = 0; body.style.right = 0; body.style.top = 0;
      body.style.margin = (head.firstChild ? Math.max(V.mt, 37.8 + head.offsetHeight + 4) : V.mt) + 'px ' + V.mr + 'px ' + V.mb + 'px ' + V.ml + 'px';
      body.style.minHeight = avail(k + 1) + 'px';
      idx.forEach(i => { if (this.els[i].parentNode !== body || body.children[idx.indexOf(i)] !== this.els[i]) body.appendChild(this.els[i]); });
      Array.from(body.children).forEach(ch => { if (this.els.indexOf(ch) < 0 || idx.indexOf(this.els.indexOf(ch)) < 0) { if (this.els.indexOf(ch) < 0) ch.remove(); } });
    });
    if (key && off > -1) this.focus(key, off);
    if (this.host.parentElement) this.host.parentElement.scrollTop = scrollP;
    this.pages = plan.length;
    if (this.o.onLayout) this.o.onLayout(plan.length);
  };
  EditView.prototype.ceKey = function (ce) { return ce.dataset.k + (ce.dataset.i !== undefined ? '|i' + ce.dataset.i : '') + (ce.dataset.r !== undefined ? '|r' + ce.dataset.r + 'c' + ce.dataset.c : ''); };
  EditView.prototype.ceBy = function (key) {
    const [id, sub] = String(key).split('|');
    let s = '.ce[data-k="' + id + '"]';
    if (sub && sub[0] === 'i') s += '[data-i="' + sub.slice(1) + '"]';
    if (sub && sub[0] === 'r') { const m = /r(\d+)c(\d+)/.exec(sub); s += '[data-r="' + m[1] + '"][data-c="' + m[2] + '"]'; }
    return this.host.querySelector(s);
  };
  EditView.prototype.focus = function (key, off) { const ce = this.ceBy(key); if (ce) Rich.setCaret(ce, off === undefined ? 1e9 : off); };
  EditView.prototype.block = function (id) { return this.c.blocks.find(b => b.id === id); };
  EditView.prototype.idx = function (id) { return this.c.blocks.findIndex(b => b.id === id); };
  EditView.prototype.syncCe = function (ce) {
    const b = this.block(ce.dataset.k); if (!b) return;
    const runs = Rich.parse(ce);
    if (ce.dataset.r !== undefined) b.rows[+ce.dataset.r][+ce.dataset.c] = runs;
    else if (ce.dataset.i !== undefined) b.items[+ce.dataset.i] = runs;
    else b.c = runs;
  };
  EditView.prototype.insertAfter = function (id, nb, focus) {
    this.snap(); const i = id ? this.idx(id) : this.c.blocks.length - 1;
    if (!nb.id) nb.id = A.uid();
    this.c.blocks.splice(i + 1, 0, nb); this.render(focus ? { k: nb.id, off: 0 } : null);
    this.select(TEXT[nb.t] ? null : nb.id); this.o.onChange('struct');
    return nb;
  };
  EditView.prototype.select = function (id) { this.sel = id; A.$$('.blk.sel', this.host).forEach(x => x.classList.remove('sel')); if (id) { const el = A.$('.blk[data-id="' + id + '"]', this.host); if (el) { el.classList.add('sel'); el.focus && el.focus({ preventScroll: true }); } } if (this.o.onSelect) this.o.onSelect(id); };
  EditView.prototype.bind = function () {
    const host = this.host, self = this;
    host.addEventListener('focusin', e => { const ce = e.target.closest('.ce'); if (ce) { self.active = ce; self._before = JSON.stringify({ blocks: self.c.blocks, fields: self.c.fields, page: self.c.page }); self.sel = null; A.$$('.blk.sel', host).forEach(x => x.classList.remove('sel')); if (self.o.onSelect) self.o.onSelect(ce.dataset.k, ce); } });
    if (this.ro) { host.addEventListener('click', e => { const w = e.target.closest('.blk'); if (w) self.select(w.dataset.id); }); return; }
    host.addEventListener('input', e => { const ce = e.target.closest('.ce'); if (!ce) return; self.syncCe(ce); self.changed('type'); });
    host.addEventListener('paste', e => {
      const ce = e.target.closest('.ce'); if (!ce) return; e.preventDefault();
      const t = (e.clipboardData || window.clipboardData).getData('text/plain').replace(/\r/g, '');
      const lines = t.split(/\n{1,}/).map(x => x.trim()).filter(Boolean);
      if (lines.length <= 1 || !TEXT[(self.block(ce.dataset.k) || {}).t]) { document.execCommand('insertText', false, t.replace(/\n+/g, ' ')); return; }
      document.execCommand('insertText', false, lines[0]);
      const b = self.block(ce.dataset.k); self.syncCe(ce); self.snap();
      let at = self.idx(b.id); lines.slice(1).forEach(l => { self.c.blocks.splice(++at, 0, { id: A.uid(), t: 'p', c: [{ x: l }], a: 'j', ind: b.ind }); });
      self.render({ k: self.c.blocks[at].id }); self.o.onChange('struct');
    });
    host.addEventListener('click', e => {
      const g = e.target.closest('[data-g]');
      if (g) { e.preventDefault(); self.gutter(g.closest('.blk').dataset.id, g.dataset.g, g); return; }
      const chip = e.target.closest('.ph-chip'); if (chip && self.o.onChip) { self.o.onChip(chip.dataset.p); return; }
      const w = e.target.closest('.blk.widget'); if (w) { self.select(w.dataset.id); if (self.o.onWidget) self.o.onWidget(self.block(w.dataset.id)); }
    });
    host.addEventListener('keydown', e => {
      const w = e.target.closest('.blk.widget');
      if (w && (e.key === 'Delete' || e.key === 'Backspace')) { e.preventDefault(); self.remove(w.dataset.id); return; }
      const ce = e.target.closest('.ce'); if (!ce) return;
      const b = self.block(ce.dataset.k); if (!b) return;
      if (e.key === 'Enter' && !e.shiftKey && ce.dataset.r === undefined) { e.preventDefault(); self.enter(ce, b); return; }
      if (e.key === 'Enter' && e.shiftKey) { e.preventDefault(); document.execCommand('insertLineBreak'); return; }
      if (e.key === 'Backspace' && Rich.caret(ce) === 0 && getSelection().isCollapsed) { if (self.backspace(ce, b)) e.preventDefault(); return; }
      if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !e.shiftKey) self.arrow(e, ce);
    });
  };
  EditView.prototype.enter = function (ce, b) {
    const sel = getSelection(); if (!sel.rangeCount) return;
    const r = sel.getRangeAt(0); r.deleteContents();
    const after = document.createRange(); after.setStart(r.endContainer, r.endOffset); after.setEnd(ce, ce.childNodes.length);
    const tmp = document.createElement('div'); tmp.appendChild(after.extractContents());
    const tail = Rich.parse(tmp), head = Rich.parse(ce);
    this.snap();
    if (ce.dataset.i !== undefined) {
      const i = +ce.dataset.i;
      if (!M.runsText(head).trim() && !tail.length) {                             // butir kosong → keluar dari daftar
        b.items.splice(i, 1); const nb = { id: A.uid(), t: 'p', c: [], a: 'j' };
        const rest = b.items.splice(i); this.c.blocks.splice(this.idx(b.id) + 1, 0, nb);
        if (rest.length) this.c.blocks.splice(this.idx(nb.id) + 1, 0, { id: A.uid(), t: b.t, items: rest });
        if (!b.items.length) this.c.blocks.splice(this.idx(b.id), 1);
        this.render({ k: nb.id, off: 0 }); this.o.onChange('struct'); return;
      }
      b.items[i] = head; b.items.splice(i + 1, 0, tail); this.render({ k: b.id + '|i' + (i + 1), off: 0 }); this.o.onChange('struct'); return;
    }
    b.c = head;
    const nb = { id: A.uid(), t: 'p', c: tail, a: b.t === 'p' ? (b.a || 'j') : 'j' }; if (b.t === 'p' && b.ind) nb.ind = true;
    this.c.blocks.splice(this.idx(b.id) + 1, 0, nb);
    this.render({ k: nb.id, off: 0 }); this.o.onChange('struct');
  };
  EditView.prototype.backspace = function (ce, b) {
    const i = this.idx(b.id);
    if (ce.dataset.i !== undefined) {
      const ii = +ce.dataset.i; if (ii === 0 && b.items.length > 1) return false;
      this.snap();
      if (ii > 0) { const prevLen = M.runsText(b.items[ii - 1]).length; b.items[ii - 1] = b.items[ii - 1].concat(b.items[ii]); b.items.splice(ii, 1); this.render({ k: b.id + '|i' + (ii - 1), off: prevLen }); }
      else { b.t = 'p'; b.c = b.items[0]; delete b.items; this.render({ k: b.id, off: 0 }); }
      this.o.onChange('struct'); return true;
    }
    if (ce.dataset.r !== undefined) return false;
    const prev = this.c.blocks[i - 1]; if (!prev) return false;
    if (TEXT[prev.t]) {
      this.snap(); const L = M.runsText(M.runs(prev.c, this.c, this.o.meta)).length + prev.c.filter(r => r.p !== undefined && !M.ph(this.c, r.p, this.o.meta)).reduce((s, r) => s + M.phLabel(this.c, r.p).length + 2, 0);
      prev.c = prev.c.concat(b.c); this.c.blocks.splice(i, 1); this.render({ k: prev.id, off: L }); this.o.onChange('struct'); return true;
    }
    if (!M.runsText(b.c).length) { this.snap(); this.c.blocks.splice(i, 1); this.render(); this.select(prev.id); this.o.onChange('struct'); return true; }
    this.select(prev.id); return true;
  };
  EditView.prototype.arrow = function (e, ce) {
    const all = A.$$('.ce', this.host), pos = all.indexOf(ce), s = getSelection(); if (!s.rangeCount) return;
    const rr = s.getRangeAt(0).getClientRects()[0], box = ce.getBoundingClientRect(), lh = parseFloat(getComputedStyle(ce).lineHeight) || 20;
    const first = !rr || rr.top - box.top < lh * 0.7, last = !rr || box.bottom - rr.bottom < lh * 0.7;
    if (e.key === 'ArrowUp' && first && pos > 0) { e.preventDefault(); Rich.setCaret(all[pos - 1], 1e9); }
    if (e.key === 'ArrowDown' && last && pos < all.length - 1) { e.preventDefault(); Rich.setCaret(all[pos + 1], 0); }
  };
  EditView.prototype.remove = function (id) {
    const i = this.idx(id); if (i < 0) return;
    this.snap(); this.c.blocks.splice(i, 1);
    const nxt = this.c.blocks[i] || this.c.blocks[i - 1];
    this.render(nxt && TEXT[nxt.t] ? { k: nxt.id, off: 0 } : null); this.sel = null; this.o.onChange('struct');
  };
  EditView.prototype.move = function (id, d) {
    const i = this.idx(id), j = i + d; if (j < 0 || j >= this.c.blocks.length) return;
    this.snap(); const b = this.c.blocks.splice(i, 1)[0]; this.c.blocks.splice(j, 0, b);
    this.render(); this.select(id); this.o.onChange('struct');
  };
  EditView.prototype.gutter = function (id, g, anchor) {
    const b = this.block(id), self = this;
    if (g === 'up') return this.move(id, -1);
    if (g === 'down') return this.move(id, 1);
    const items = [];
    if (b.t === 'img') [25, 40, 60, 100].forEach(w => items.push({ label: 'Lebar ' + w + '%', icon: 'image', act: () => { self.snap(); b.w = w; self.render(); self.o.onChange('struct'); } }));
    if (b.t === 'img') items.push({ label: 'Rata kiri / tengah / kanan', icon: 'al-c', act: () => { self.snap(); b.a = b.a === 'l' ? 'c' : b.a === 'c' ? 'r' : 'l'; self.render(); self.o.onChange('struct'); } }, '-');
    if (b.t === 'table') {
      items.push({ label: 'Tambah baris', icon: 'plus', act: () => { self.snap(); b.rows.push(b.rows[0].map(() => [])); self.render(); self.o.onChange('struct'); } },
        { label: 'Tambah kolom', icon: 'columns', act: () => { self.snap(); b.rows.forEach(r => r.push([])); b.w.push(1); self.render(); self.o.onChange('struct'); } },
        { label: 'Hapus baris terakhir', icon: 'x', disabled: b.rows.length < 2, act: () => { self.snap(); b.rows.pop(); self.render(); self.o.onChange('struct'); } },
        { label: 'Hapus kolom terakhir', icon: 'x', disabled: b.w.length < 2, act: () => { self.snap(); b.rows.forEach(r => r.pop()); b.w.pop(); self.render(); self.o.onChange('struct'); } },
        { label: b.head ? 'Baris pertama bukan judul' : 'Baris pertama sebagai judul', icon: 'bold', act: () => { self.snap(); b.head = !b.head; self.render(); self.o.onChange('struct'); } },
        { label: b.border === false ? 'Tampilkan garis tabel' : 'Sembunyikan garis tabel', icon: 'table', act: () => { self.snap(); b.border = b.border === false; self.render(); self.o.onChange('struct'); } }, '-');
    }
    if (b.t === 'sign' && this.o.onSign) items.push({ label: 'Atur penandatangan…', icon: 'sign', act: () => self.o.onSign(b) }, '-');
    if ((b.t === 'data' || b.src) && this.o.onWidget) items.push({ label: 'Ubah data di panel Data', icon: 'edit', act: () => self.o.onWidget(b) }, '-');
    if (TEXT[b.t]) items.push({ label: 'Sisipkan paragraf di bawah', icon: 'plus', act: () => self.insertAfter(id, { t: 'p', c: [], a: 'j' }, true) });
    items.push({ label: 'Gandakan blok', icon: 'copy', act: () => { const c = JSON.parse(JSON.stringify(b)); c.id = A.uid(); self.insertAfter(id, c); } });
    if (this.o.onComment) items.push({ label: 'Komentari blok ini', icon: 'msg', act: () => self.o.onComment(id) });
    items.push('-', { label: 'Hapus blok', icon: 'trash', danger: true, act: () => self.remove(id) });
    A.menu(anchor, items);
  };
  /** Perbarui chip & widget setelah isian/halaman berubah — tanpa merusak posisi kursor. */
  EditView.prototype.refresh = function () {
    this.flow = M.flow(this.c, this.o.meta, { miss: true });
    this.bySrc = {}; this.flow.forEach(e => { (this.bySrc[e.src] = this.bySrc[e.src] || []).push(e); });
    A.$$('.ph-chip', this.host).forEach(ch => { const v = M.ph(this.c, ch.dataset.p, this.o.meta); ch.textContent = v || '[' + M.phLabel(this.c, ch.dataset.p) + ']'; ch.classList.toggle('miss', !v); });
    const num = M.adartNum(this.c.adart); A.$$('.ref-chip', this.host).forEach(ch => { ch.textContent = M.refText(num, ch.dataset.r); });
    this.c.blocks.forEach((b, i) => { if (!TEXT[b.t] && b.t !== 'table' && !((b.t === 'ul' || b.t === 'ol') && !b.src)) { const nw = this.blockEl(b), old = this.els[i]; if (old && old.parentNode) old.replaceWith(nw); this.els[i] = nw; } });
    this.relayout();
  };

  /* ======================= BILAH ALAT BERSAMA (editor naskah & template) ======================= */
  const tbBtn = (ic, act, lbl) => '<button class="tb" data-a="' + act + '" title="' + esc(lbl) + '" aria-label="' + esc(lbl) + '">' + I(ic) + '</button>';
  A.Tools = {};
  A.Tools.html = function (pg, zoom) {
    return '<div class="ed-tools" role="toolbar" aria-label="Format">' + tbBtn('undo', 'undo', 'Urungkan (Ctrl+Z)') + tbBtn('redo', 'redo', 'Ulangi (Ctrl+Y)') + '<span class="sep"></span>' +
      '<select class="tb-sel" id="btype" aria-label="Jenis paragraf"><option value="p">Paragraf</option><option value="h1">Judul Bab</option><option value="h2">Sub-judul</option></select>' +
      '<select class="tb-sel" id="font" aria-label="Huruf">' + M.FONTS.map(f => '<option ' + (pg.font === f ? 'selected' : '') + '>' + f + '</option>').join('') + '</select><select class="tb-sel" id="fs" aria-label="Ukuran huruf">' + [10, 11, 12, 13, 14].map(n => '<option value="' + n + '" ' + (pg.fs === n ? 'selected' : '') + '>' + n + ' pt</option>').join('') + '</select><select class="tb-sel" id="ls" aria-label="Spasi baris">' + [1, 1.15, 1.5, 2].map(n => '<option value="' + n + '" ' + (pg.ls === n ? 'selected' : '') + '>Spasi ' + n + '</option>').join('') + '</select><span class="sep"></span>' +
      tbBtn('bold', 'bold', 'Tebal (Ctrl+B)') + tbBtn('italic', 'italic', 'Miring (Ctrl+I)') + tbBtn('underline', 'underline', 'Garis bawah (Ctrl+U)') + '<span class="sep"></span>' + tbBtn('al-l', 'al-l', 'Rata kiri') + tbBtn('al-c', 'al-c', 'Rata tengah') + tbBtn('al-r', 'al-r', 'Rata kanan') + tbBtn('al-j', 'al-j', 'Rata kiri-kanan') + tbBtn('indent', 'ind', 'Inden baris pertama') + '<span class="sep"></span>' + tbBtn('list', 'ul', 'Daftar butir') + tbBtn('list-o', 'ol', 'Daftar bernomor') + '<span class="sep"></span>' +
      '<button class="tb" data-a="ins-table">' + I('table') + 'Tabel</button><button class="tb" data-a="ins-img">' + I('image') + 'Gambar</button><button class="tb" data-a="ins-ph">' + I('braces') + 'Data</button><button class="tb" data-a="ins-pb">' + I('cut') + 'Halaman baru</button><button class="tb" data-a="ins-more">' + I('plus') + 'Lainnya</button><span class="sep"></span><select class="tb-sel" id="zoom" aria-label="Perbesaran">' + [0.6, 0.75, 0.9, 1, 1.25].map(z => '<option value="' + z + '" ' + (z === zoom ? 'selected' : '') + '>' + Math.round(z * 100) + '%</option>').join('') + '</select></div>';
  };
  A.Tools.bind = function (root, view, opt) {
    opt = opt || {};
    const tools = A.$('.ed-tools', root), C = () => view.c;
    const ceOf = () => view.active && view.active.isConnected ? view.active : null;
    const insPh = (ce, key) => { Rich.insert(ce, { p: key }, C()); view.syncCe(ce); view.changed('struct'); };
    tools.addEventListener('mousedown', e => { if (e.target.closest('button.tb')) e.preventDefault(); });
    tools.onclick = async e => {
      const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, ce = ceOf(), blk = ce && view.block(ce.dataset.k), content = C();
      if (a === 'undo' || a === 'redo') return view.undo(a === 'redo');
      if (/^(bold|italic|underline)$/.test(a)) { if (!ce) return A.toast('Klik dulu teks yang ingin diformat.', 'info'); ce.focus(); document.execCommand(a); return; }
      if (/^al-/.test(a)) { const al = a.slice(3); if (blk && blk.t === 'p') { view.snap(); blk.a = al; ce.className = ce.className.replace(/a-[jlcr]/, 'a-' + al); view.changed('fmt'); } else if (view.sel && view.block(view.sel) && view.block(view.sel).t === 'img') { const ib = view.block(view.sel); view.snap(); ib.a = al === 'j' ? 'c' : al; view.render(); view.changed('fmt'); } else A.toast('Klik paragraf atau gambar yang ingin diratakan.', 'info'); return; }
      if (a === 'ind') { if (blk && blk.t === 'p') { view.snap(); blk.ind = !blk.ind; ce.classList.toggle('ind', !!blk.ind); view.changed('fmt'); } return; }
      if (a === 'ul' || a === 'ol') {
        if (!blk) return A.toast('Klik paragraf yang ingin dijadikan daftar.', 'info');
        view.snap();
        if (blk.t === 'p' || blk.t === 'h2') { blk.items = [blk.c || []]; delete blk.c; delete blk.a; delete blk.ind; blk.t = a; view.render({ k: blk.id + '|i0' }); }
        else if (blk.t === 'ul' || blk.t === 'ol') { if (blk.t !== a) { blk.t = a; view.render(); } else { const i = view.idx(blk.id); const ps = blk.items.map(it => ({ id: A.uid(), t: 'p', c: it, a: 'j' })); view.c.blocks.splice(i, 1, ...ps); view.render({ k: ps[0].id }); } }
        view.changed('struct'); return;
      }
      const after = blk ? blk.id : view.sel;
      if (a === 'ins-table') { const n = await A.prompt({ title: 'Sisipkan tabel', label: 'Jumlah kolom × baris (mis. 3x4)', value: '3x3', ok: 'Sisipkan' }); if (!n) return; const m = /(\d+)\s*[x×]\s*(\d+)/i.exec(n) || [0, 3, 3]; const cols = Math.min(8, Math.max(1, +m[1])), rows = Math.min(40, Math.max(1, +m[2])); view.insertAfter(after, { t: 'table', head: true, w: Array(cols).fill(1), rows: Array.from({ length: rows }, () => Array.from({ length: cols }, () => [])) }); return; }
      if (a === 'ins-img') { A.pickFile({ gambar: true }, f => { view._pre = false; view.insertAfter(after, { t: 'img', src: 'file:' + f.id, w: 50, a: 'c' }); }); return; }
      if (a === 'ins-pb') { view.insertAfter(after, { t: 'pb' }); return; }
      if (a === 'ins-ph') {
        if (!ce) return A.toast('Klik posisi di teks untuk menyisipkan data.', 'info');
        const fm = content.fdefs.filter(f => !/^(table|rab|list)$/.test(f.t)).map(f => ({ label: f.l, icon: 'braces', act: () => insPh(ce, f.k) }));
        const der = content.fdefs.filter(f => f.t === 'rab' || (f.t === 'table' && f.sum)).reduce((x, f) => x.concat([{ label: 'Total ' + f.l, icon: 'hash', act: () => insPh(ce, 'total_' + f.k) }, { label: 'Terbilang ' + f.l, icon: 'hash', act: () => insPh(ce, 'terbilang_' + f.k) }]), []);
        const bi = M.BUILTINS.map(x => ({ label: x[1], icon: 'building', act: () => insPh(ce, x[0]) }));
        A.menu(b, (fm.length ? fm.concat(['-']) : []).concat(der.length ? der.concat(['-']) : []).concat(bi));
        A._menu.style.maxHeight = '60vh'; A._menu.style.overflow = 'auto'; return;
      }
      if (a === 'ins-more') {
        A.menu(b, [
          { label: 'Daftar isi otomatis', icon: 'list', act: () => view.insertAfter(after, { t: 'toc', title: 'DAFTAR ISI' }) },
          { label: 'Blok tanda tangan / pengesahan', icon: 'sign', act: () => { const nb = view.insertAfter(after, { t: 'sign', place: [], items: [{ l: [{ x: 'Ketua,' }], n: [{ p: 'org_ketua' }], id: [] }, { l: [{ x: 'Sekretaris,' }], n: [{ p: 'org_sekretaris' }], id: [] }] }); if (opt.signDialog) opt.signDialog(nb); } },
          { label: 'Logo organisasi', icon: 'image', act: () => { view._pre = false; view.insertAfter(after, { t: 'img', src: 'org_logo', w: 30, a: 'c' }); } }
        ].concat(content.adart && content.adart.parts && content.adart.parts.length && !content.blocks.some(x => x.t === 'adart') ? [{ label: 'Struktur AD/ART', icon: 'tree', act: () => view.insertAfter(after, { t: 'adart', part: 'all' }) }] : [])
          .concat(content.fdefs.filter(f => f.t === 'table' || f.t === 'rab').map(f => ({ label: 'Tabel data: ' + f.l, icon: 'table', act: () => view.insertAfter(after, { t: 'data', f: f.k }) })))
          .concat(content.fdefs.filter(f => f.t === 'list').map(f => ({ label: 'Daftar dari isian: ' + f.l, icon: 'list-o', act: () => view.insertAfter(after, { t: 'ol', src: f.k }) }))));
      }
    };
    A.$('#btype', root).onchange = e => {
      const ce = ceOf(), blk = ce && view.block(ce.dataset.k); if (!blk || !TEXT[blk.t]) { A.toast('Klik paragraf yang ingin diubah jenisnya.', 'info'); e.target.value = 'p'; return; }
      view.snap(); const off = Rich.caret(ce); blk.t = e.target.value; if (blk.t !== 'p') { delete blk.a; delete blk.ind; } else blk.a = 'j';
      view.render({ k: blk.id, off: off }); view.changed('struct');
    };
    ['font', 'fs', 'ls'].forEach(id => A.$('#' + id, root).onchange = e => { view.snap(); const c = C(); c.page[id] = id === 'font' ? e.target.value : +e.target.value; c.page = M.cleanPage(c.page); view.render(); view.changed('fmt'); });
    A.$('#zoom', root).onchange = e => { const z = +e.target.value; A.LS.set('zoom', z); view.host.style.zoom = z; if (opt.onZoom) opt.onZoom(z); };
  };
  /** Dialog penandatangan (dipakai editor naskah & editor template). */
  A.signDialog = function (view, b, onDone) {
    const content = view.c, fromRuns = rs => M.runsText((rs || []).map(r => r.p !== undefined ? { x: '{{' + r.p + '}}' } : r));
    const items = (b.items || []).map(it => ({ l: fromRuns(it.l), n: fromRuns(it.n), id: fromRuns(it.id) }));
    const toRuns = s => { const out = []; String(s).split(/(\{\{[^{}]+\}\})/).forEach(t => { if (!t) return; const m = /^\{\{\s*([^{}]+?)\s*\}\}$/.exec(t); out.push(m ? { p: m[1] } : { x: t }); }); return out; };
    const offs = ((content.org || {}).officers || []).map(o => o.jabatan);
    const jab = offs.length ? offs : ['Ketua', 'Sekretaris', 'Bendahara', 'Pembina'];
    const m = A.modal({ title: 'Atur penandatangan', size: 'lg', body: '<p class="help mb16">Tulis teks biasa atau pakai isian, mis. <span class="code">{{org_ketua}}</span>, <span class="code">{{officer:Pembina}}</span>, <span class="code">{{nomor:Ketua}}</span>. Baris baru pada "Label" menjadi baris baru di naskah.</p><div class="grid mono help" style="grid-template-columns:1.3fr 1.2fr 1fr 36px;gap:8px;margin-bottom:6px"><span>LABEL / JABATAN</span><span>NAMA</span><span>NOMOR IDENTITAS</span><span></span></div><div id="sg"></div><div class="row mt12 wrap"><button class="btn btn-dashed btn-sm" id="sga">' + I('plus', 'sm') + 'Tambah penandatangan</button>' + jab.map(j => '<button class="btn btn-ghost btn-xs" data-of="' + esc(j) + '">+ ' + esc(j) + '</button>').join('') + '</div>', foot: '<button class="btn btn-secondary" data-x>Batal</button><button class="btn btn-primary" id="sgs">Terapkan</button>' });
    const drawS = () => { A.$('#sg', m.el).innerHTML = items.map((it, i) => '<div class="grid" style="grid-template-columns:1.3fr 1.2fr 1fr 36px;gap:8px;margin-bottom:8px;align-items:start"><textarea class="textarea" rows="2" style="min-height:58px" data-i="' + i + '" data-f="l" aria-label="Label penandatangan ' + (i + 1) + '">' + esc(it.l) + '</textarea><input class="input" data-i="' + i + '" data-f="n" value="' + esc(it.n) + '" aria-label="Nama penandatangan ' + (i + 1) + '"><input class="input" data-i="' + i + '" data-f="id" value="' + esc(it.id) + '" aria-label="Nomor identitas ' + (i + 1) + '"><button class="btn btn-ghost btn-icon btn-sm" data-rm="' + i + '" aria-label="Hapus penandatangan">' + I('trash', 'sm') + '</button></div>').join('') || '<p class="muted">Belum ada penandatangan.</p>'; };
    drawS();
    A.$('#sg', m.el).oninput = e => { const t = e.target; if (t.dataset.i !== undefined) items[+t.dataset.i][t.dataset.f] = t.value; };
    A.on(m.el, 'click', '[data-rm]', (e, x) => { items.splice(+x.dataset.rm, 1); drawS(); });
    A.$('#sga', m.el).onclick = () => { items.push({ l: 'Jabatan,', n: '', id: '' }); drawS(); };
    A.on(m.el, 'click', '[data-of]', (e, x) => { items.push({ l: (items.length >= 2 ? 'Mengetahui,\n' : '') + x.dataset.of + ',', n: '{{officer:' + x.dataset.of + '}}', id: '{{nomor:' + x.dataset.of + '}}' }); drawS(); });
    A.$('#sgs', m.el).onclick = () => { view.snap(); b.items = items.slice(0, 8).map(it => ({ l: toRuns(it.l), n: toRuns(it.n), id: toRuns(it.id) })); m.close(); view.refresh(); if (onDone) onDone(); };
  };

  /* ======================= HALAMAN: BUILDER ======================= */
  A.route('/naskah/:id', async function (root, p, q) {
    root.innerHTML = A.skel(3, 70) + A.skel(8, 32);
    const r = await loadDoc(p.id);
    if (!r.success) { root.innerHTML = A.errorBox(r); return; }
    const doc = r.data.doc, content = r.data.content, canEdit = doc.access === 'owner' || doc.access === 'edit';
    if (!canEdit || (content.stage === 'editor' && q.mode !== 'builder') || !(content.steps || []).length && !content.fdefs.length) { A.LS.set('doc.' + doc.id, { doc: doc, content: content, t: Date.now() }); return A.go('#/editor/' + doc.id); }
    A._meta = meta0(doc);
    const saver = new Saver(doc, content, { onSaved: () => sideDraw() });
    A.cleanup.push(() => saver.dispose());
    A.beforeLeave = async () => { if (await saver.flush()) return true; return A.confirm({ title: 'Perubahan belum tersimpan', text: 'Server belum menerima perubahan terakhir (tersimpan di perangkat ini). Tetap tinggalkan halaman?', ok: 'Tinggalkan', danger: true }); };
    const steps = [{ id: '_org', t: 'Profil Organisasi' }].concat(content.steps.map(s => Object.assign({}, s))).concat([{ id: '_hasil', t: 'Hasilkan & Pratinjau' }]);
    const sk = 'step.' + doc.id; let cur = Math.min(steps.length - 1, +(A.LS.get(sk) || 1));
    A.crumbs(['Ruang kerja', 'Naskah baru', doc.kode]);
    root.innerHTML = '<div class="row between wrap" style="gap:12px"><div class="grow" style="min-width:280px"><div class="row wrap" style="gap:8px"><a href="#/dokumen" class="btn btn-ghost btn-sm">' + I('arrow-l', 'sm') + 'Naskah Saya</a><span class="code">' + esc(doc.kode) + '</span>' + A.statusTag(doc.status) + '</div>' +
      '<input class="ed-title mt8" id="jd" style="font-size:24px;font-weight:700;width:100%;padding:4px 6px" value="' + esc(doc.judul) + '" aria-label="Judul naskah"><div class="row mt8" style="gap:10px"><span id="si"></span><span class="help">Template: ' + esc(content.jenis ? (A.JENIS[content.jenis] || content.jenis) : '') + ' · versi ' + esc(doc.template_versi) + '</span></div></div>' +
      '<div class="row"><button class="btn btn-secondary" id="pv">' + I('eye') + 'Pratinjau Cepat</button><button class="btn btn-primary" id="sv">' + I('save') + 'Simpan Draf</button></div></div>' +
      '<div class="stepper mt16" id="stp" role="tablist" aria-label="Tahapan"></div><div class="b-layout"><div id="main"></div><aside class="b-side" id="side"></aside></div>' +
      '<div class="sticky-bar"><button class="btn btn-secondary" id="prev">' + I('arrow-l') + '<span id="prevT"></span></button><span class="note hide-lg">' + I('cloud-ok', 'sm') + 'Tersimpan otomatis di perangkat & server</span><span class="sp"></span><button class="btn btn-secondary" id="sv2">Simpan Draf</button><button class="btn btn-primary" id="next"><span id="nextT"></span>' + I('arrow-r') + '</button></div>';
    saver.ind(A.$('#si', root));
    const prog = () => M.stepProgress(content);
    const stepState = i => { const s = steps[i]; if (s.id === '_org') return content.org && content.org.nama ? 'ok' : ''; if (s.id === '_hasil') return ''; if (s.type === 'adart') return content.adart && content.adart.parts.some(x => x.babs.length) ? 'ok' : ''; const pg = prog().find(x => x.id === s.id); return pg && pg.ok && pg.filled ? 'ok' : ''; };
    const stepDraw = () => {
      A.$('#stp', root).innerHTML = steps.map((s, i) => { const okS = stepState(i); return '<button class="step ' + (i === cur ? 'on' : '') + '" role="tab" aria-selected="' + (i === cur) + '" data-step="' + i + '"><span class="grow"><div class="n">Tahap ' + String(i + 2).padStart(2, '0') + (i === cur ? ' · sedang diisi' : '') + '</div><div class="t">' + esc(s.t) + '</div></span><span class="st">' + (okS && i !== cur ? '<span class="ok-ic">' + I('check', 'sm') + '</span>' : i === cur ? '<span class="num-ic">' + String(i + 2).padStart(2, '0') + '</span>' : '') + '</span></button>'; }).join('');
      A.$('#prevT', root).textContent = cur ? 'Kembali ke ' + steps[cur - 1].t : 'Naskah Saya';
      A.$('#nextT', root).textContent = cur < steps.length - 1 ? 'Lanjut: ' + steps[cur + 1].t : 'Hasilkan Naskah & Buka Editor';
    };
    const sideDraw = () => {
      const pg = prog(), req = pg.reduce((s, x) => s + x.req, 0), done = pg.reduce((s, x) => s + x.done, 0), pct = req ? Math.round(done / req * 100) : 100;
      const outline = M.flow(content, A._meta, { miss: true }).filter(e => e.k === 'h' || (e.k === 'table' && e.data)).slice(0, 18);
      A.$('#side', root).innerHTML = '<section class="card"><div class="card-head"><h3>' + I('clipboard') + 'Kelengkapan Formulir</h3><span class="tag">' + pct + '%</span></div><div class="card-body"><div class="progress"><i style="width:' + pct + '%"></i></div><ul class="check-list mt16">' +
        steps.map((s, i) => { const o = stepState(i), x = pg.find(y => y.id === s.id); return s.id === '_hasil' ? '' : '<li class="' + (o ? '' : 'no') + (i === cur ? ' cur' : '') + '" data-step="' + i + '">' + I(o ? 'check-c' : 'clock', 'sm') + '<span class="grow">' + esc(s.t) + '</span>' + (x ? '<span class="tag ' + (x.ok ? 'ok' : 'warn') + '">' + x.done + '/' + x.req + ' wajib</span>' : o ? '<span class="tag ok">Lengkap</span>' : '<span class="tag warn">Belum</span>') + '</li>'; }).join('') + '</ul></div></section>' +
        '<section class="card"><div class="card-head"><h3>' + I('tree') + 'Struktur Naskah</h3><span class="eyebrow">' + esc(content.page.size) + '</span></div><div class="card-body"><ul class="outline-list">' + outline.map(e => '<li>' + esc(e.k === 'h' ? e.lines.map(l => M.runsText(l)).join(' ') : 'Tabel ' + M.phLabel(content, e.data)) + '</li>').join('') + '</ul><div class="well help mt16">' + I('info', 'sm') + ' Format: ' + esc(content.page.font) + ' ' + content.page.fs + ' pt, spasi ' + content.page.ls + ', margin ' + [content.page.ml, content.page.mt, content.page.mr, content.page.mb].join('-') + ' cm.</div></div></section>';
    };
    const draw = () => {
      A.LS.set(sk, cur); stepDraw(); sideDraw();
      const s = steps[cur], main = A.$('#main', root);
      if (s.id === '_org') {
        const o = content.org || {};
        main.innerHTML = '<section class="sect"><div class="sect-head"><span class="tag ink">Bagian 01</span><h2>Profil Organisasi Penyusun</h2></div><div class="sect-body"><div class="org-snap"><div class="lg" id="lg">' + esc((o.singkatan || 'ORG').slice(0, 5)) + '</div><div class="grow"><div class="row wrap"><b style="font-size:17px;color:var(--ink)">' + esc(o.nama || '(nama organisasi belum diisi)') + '</b>' + (o.nama ? '<span class="tag ok">' + I('check', 'sm') + 'Terisi</span>' : '<span class="tag warn">Lengkapi profil</span>') + '</div><div class="help mt8">' + esc([o.induk && o.induk.replace(/\n/g, ' · '), o.alamat].filter(Boolean).join(' — ') || 'Alamat belum diisi') + '</div><div class="help">' + esc([o.email, o.telepon].filter(Boolean).join(' · ')) + '</div></div><button class="btn btn-secondary btn-sm" id="sync">' + I('refresh', 'sm') + 'Sinkronkan profil terbaru</button></div>' +
          '<div class="banner mt16">' + I('info') + '<div>Data organisasi disalin ke naskah ini (snapshot). Perubahan profil di kemudian hari tidak mengubah naskah, kecuali Anda menekan <b>Sinkronkan</b>.</div></div>' +
          '<h3 class="mt24 mb8" style="font-size:15px">Pejabat penandatangan</h3>' + ((o.officers || []).length ? '<table class="tbl compact"><thead><tr><th>Jabatan</th><th>Nama</th><th>Nomor identitas</th></tr></thead><tbody>' + o.officers.map(x => '<tr><td>' + esc(x.jabatan) + '</td><td style="font-weight:600">' + esc(x.nama) + '</td><td class="mono">' + esc(x.nomor || '—') + '</td></tr>').join('') + '</tbody></table>' : '<p class="muted">Belum ada pengurus di profil organisasi.</p>') +
          '<p class="mt16"><a href="#/profil">Ubah di Profil Organisasi →</a></p></div></section>';
        if (o.logo) A.fileUrl(o.logo, doc.id).then(u => { if (u && A.$('#lg', root)) A.$('#lg', root).innerHTML = '<img alt="" src="' + u + '">'; });
        A.$('#sync', root).onclick = async e => { A.busy(e.currentTarget, true, 'Menyinkronkan…'); const x = await A.api('doc.syncOrg', { id: doc.id }); A.busy(e.currentTarget, false); if (!x.success) return A.toast(x.message, 'bad'); content.org = x.data; saver.touch(); draw(); A.toast('Profil organisasi diperbarui di naskah ini.'); };
      } else if (s.id === '_hasil') {
        const miss = M.missing(content, A._meta);
        main.innerHTML = '<section class="sect"><div class="sect-head"><span class="tag ink">Tahap akhir</span><h2>Validasi & Hasilkan Naskah</h2></div><div class="sect-body">' +
          (miss.wajib.length ? '<div class="banner warn">' + I('alert') + '<div><b>' + miss.wajib.length + ' isian wajib belum diisi.</b> Naskah tetap dapat dihasilkan, tetapi bagian tersebut akan kosong.<ul style="margin:8px 0 0;padding-left:18px">' + miss.wajib.map(x => '<li><a href="#" data-goto="' + esc(x.k) + '">' + esc(x.l) + '</a></li>').join('') + '</ul></div></div>' : '<div class="banner ok">' + I('check-c') + '<div><b>Semua isian wajib lengkap.</b> Naskah siap dihasilkan.</div></div>') +
          (miss.kosong.length ? '<div class="banner mt12">' + I('info') + '<div>Isian opsional yang kosong: ' + miss.kosong.map(x => esc(x.l)).join(', ') + '.</div></div>' : '') +
          '<div class="row mt24 wrap"><button class="btn btn-primary" id="gen" style="min-height:46px">' + I('file-plus') + 'Hasilkan Naskah & Buka Editor A4</button><button class="btn btn-secondary" id="pv2">' + I('eye') + 'Pratinjau Cepat</button></div><p class="help mt12">Di editor Anda dapat menyunting teks, menambah tabel/gambar, mengatur halaman, lalu mengekspor ke PDF & DOCX. Isian formulir tetap dapat diubah dari panel <b>Data</b> di editor — seluruh naskah ikut berubah otomatis.</p></div></section>';
        A.$('#gen', root).onclick = async e => { A.busy(e.currentTarget, true, 'Menyiapkan editor…'); content.stage = 'editor'; saver.dirty = true; await saver.save('manual', { catatan: 'Naskah dihasilkan dari formulir' }); A.LS.set('doc.' + doc.id, { doc: doc, content: content, t: Date.now() }); A.go('#/editor/' + doc.id); };
        A.$('#pv2', root).onclick = quick;
        A.on(main, 'click', '[data-goto]', (e, a) => { e.preventDefault(); const k = a.dataset.goto, i = steps.findIndex(x => (x.f || []).indexOf(k) > -1); if (i > -1) { cur = i; draw(); setTimeout(() => { const fe = A.$('[data-field="' + k + '"] input,[data-field="' + k + '"] textarea', root); if (fe) fe.focus(); }, 50); } });
      } else if (s.type === 'adart') {
        main.innerHTML = '<div id="ad"></div>';
        A.AdartEditor(A.$('#ad', root), content, { docId: doc.id }, () => { saver.touch(); sideDraw(); });
      } else {
        main.innerHTML = '<section class="sect"><div class="sect-head"><span class="tag ink">Bagian ' + String(cur + 1).padStart(2, '0') + '</span><h2>' + esc(s.t) + '</h2></div><div class="sect-body">' + (s.desc ? '<p class="help mb16">' + esc(s.desc) + '</p>' : '') + '<div id="fx"></div></div></section>';
        A.Fields.render(A.$('#fx', root), content, s.f || [], {}, () => { saver.touch(); sideDrawD(); });
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    const sideDrawD = A.debounce(sideDraw, 400);
    const quick = () => { const m = A.modal({ title: 'Pratinjau cepat', size: 'lg', body: '<div class="well" id="qp" style="display:flex;justify-content:center;max-height:70vh;overflow:auto"></div><p class="help mt8">Perkiraan tata letak. Isian kosong ditandai kuning.</p>' }); Doc.mountPreview(A.$('#qp', m.el), content, { scale: 0.7, docId: doc.id, meta: A._meta, miss: true }); };
    A.$('#jd', root).oninput = e => { doc.judul = e.target.value; saver.touch(); };
    A.$('#pv', root).onclick = quick;
    [A.$('#sv', root), A.$('#sv2', root)].forEach(b => b.onclick = async () => { A.busy(b, true, 'Menyimpan…'); saver.dirty = true; const x = await saver.save('manual', { catatan: 'Simpan draf (formulir)' }); A.busy(b, false); if (x.success) A.toast('Draf disimpan sebagai versi ' + x.data.versi + '.'); });
    A.on(root, 'click', '[data-step]', (e, b) => { cur = +b.dataset.step; draw(); });
    A.$('#prev', root).onclick = () => { if (cur === 0) return A.go('#/dokumen'); cur--; draw(); };
    A.$('#next', root).onclick = () => {
      const s = steps[cur];
      if (s.f && s.f.length && A.Fields.validate(A.$('#fx', root), content, s.f).length) return A.toast('Lengkapi isian wajib yang ditandai.', 'warn');
      if (cur === steps.length - 1) return A.$('#gen', root) && A.$('#gen', root).click();
      cur++; draw();
    };
    draw();
    offerLocal(saver).then(x => { if (x) draw(); });
  }, { nav: 'dokumen', crumbs: ['Ruang kerja', 'Naskah'] });

  /* ======================= HALAMAN: EDITOR ======================= */
  A.route('/editor/:id', async function (root, p) {
    root.innerHTML = '<div class="ed"><div class="ed-top">' + A.skel(1, 30) + '</div></div>';
    const r = await loadDoc(p.id);
    if (!r.success) { root.innerHTML = '<div class="main">' + A.errorBox(r) + '<p style="text-align:center"><a href="#/dokumen">← Naskah Saya</a></p></div>'; return; }
    const doc = r.data.doc, content = r.data.content, lvl = doc.access, ro = !(lvl === 'owner' || lvl === 'edit'), canCmt = lvl !== 'view';
    A._meta = meta0(doc);
    const saver = new Saver(doc, content, { readOnly: ro, onSaved: () => { if (tab === 'versi') panel(); } });
    A.cleanup.push(() => { saver.dispose(); const c = A.$('.conflict'); if (c) c.remove(); });
    A.beforeLeave = async () => { if (ro || await saver.flush()) return true; return A.confirm({ title: 'Perubahan belum tersimpan', text: 'Server belum menerima perubahan terakhir (aman di perangkat ini). Tetap tinggalkan?', ok: 'Tinggalkan', danger: true }); };
    const pg = content.page;
    let tab = 'data', zoom = +(A.LS.get('zoom') || 1), view;
    root.innerHTML = '<div class="ed ' + (ro ? 'ed-readonly' : '') + '"><div class="ed-top"><a class="btn btn-ghost btn-sm" href="#/dokumen" aria-label="Kembali ke Naskah Saya">' + I('arrow-l') + '<span class="hide-lg">Naskah Saya</span></a><span class="code hide-sm">' + esc(doc.kode) + '</span>' +
      '<input class="ed-title" id="jd" value="' + esc(doc.judul) + '" ' + (ro ? 'readonly' : '') + ' aria-label="Judul naskah">' +
      (ro ? '<span class="tag">' + I('eye', 'sm') + (lvl === 'comment' ? 'Mode komentar' : 'Hanya lihat') + '</span>' : '<select class="tb-sel" id="stt" aria-label="Status naskah"><option value="draft">● Draft</option><option value="penyuntingan">● Proses Penyuntingan</option><option value="selesai">● Selesai</option></select><span id="si"></span>') +
      '<span class="grow"></span>' + (doc.editing ? '<span class="tag warn">' + I('edit', 'sm') + 'Sedang disunting ' + esc(doc.editing.nama) + '</span>' : '') +
      (!ro && (content.steps || []).length ? '<a class="btn btn-secondary btn-sm hide-sm" href="#/naskah/' + esc(doc.id) + '?mode=builder" title="Kembali ke formulir bertahap" aria-label="Formulir">' + I('clipboard', 'sm') + '<span class="hide-lg">Formulir</span></a>' : '') +
      (lvl === 'owner' ? '<button class="btn btn-secondary btn-sm hide-sm" id="share" aria-label="Bagikan" title="Bagikan">' + I('share', 'sm') + '<span class="hide-lg">Bagikan</span></button>' : '') +
      '<button class="btn btn-secondary btn-sm" id="acc" aria-label="Pratinjau akurat" title="Pratinjau akurat (PDF dari server)">' + I('eye', 'sm') + '<span class="hide-sm">Pratinjau Akurat</span></button>' +
      (doc.unduh ? '<button class="btn btn-primary btn-sm" id="exp">' + I('download', 'sm') + 'Ekspor ' + I('chev-d', 'sm') + '</button>' : '') +
      '<button class="btn btn-secondary btn-icon btn-sm" id="pnl" aria-label="Panel samping">' + I('sliders', 'sm') + '</button></div>' +
      (ro ? '' : A.Tools.html(pg, zoom)) +
      '<div class="ed-body"><aside class="ed-left" aria-label="Halaman"><div class="tabs" style="padding:0 6px"><button data-lt="th" aria-selected="true">Halaman</button><button data-lt="ol" aria-selected="false">Kerangka</button></div><div id="left"></div><div class="help mono" style="padding:8px 12px;border-top:1px solid var(--line)" id="pgc"></div></aside>' +
      '<main class="ed-center" id="center"><div class="ed-ruler"><span>Margin: kiri ' + pg.ml + ' cm · atas ' + pg.mt + ' cm · kanan ' + pg.mr + ' cm · bawah ' + pg.mb + ' cm</span><span>Tata letak perkiraan — acuan cetak: Pratinjau Akurat</span></div><div class="sheets" id="sheets" style="zoom:' + zoom + '"></div></main>' +
      '<aside class="ed-right" id="right" aria-label="Panel naskah"><div class="tabs" role="tablist">' + [['data', 'Data'], ['halaman', 'Halaman'], ['versi', 'Riwayat'], ['komentar', 'Komentar']].map(t => '<button data-t="' + t[0] + '" aria-selected="' + (t[0] === tab) + '">' + t[1] + (t[0] === 'komentar' ? ' <span class="ct" id="cc">0</span>' : '') + '</button>').join('') + '</div><div class="ed-panel" id="panel"></div></aside></div></div>';
    if (!ro) { A.$('#stt', root).value = doc.status; saver.ind(A.$('#si', root)); }
    const sheets = A.$('#sheets', root);
    let comments = [], activeBlock = null;
    let leftD = () => {};
    view = new EditView(sheets, {
      content: content, meta: A._meta, docId: doc.id, readOnly: ro,
      onChange: kind => { saver.touch(); if (kind !== 'type') leftD(); if (tab === 'data' && kind === 'undo') panel(); },
      onSelect: id => { activeBlock = id; const b = view.block(id); if (b && A.$('#btype', root)) A.$('#btype', root).value = TEXT[b.t] ? b.t : 'p'; if (tab === 'komentar') panel(); },
      onLayout: n => { doc.halaman = n; A.$('#pgc', root).textContent = 'Format: ' + pg.size + ' · ±' + n + ' halaman'; leftD(); },
      onChip: k => { tab = 'data'; tabs(); panel(k); },
      onWidget: b => { if (b.t === 'data' || b.src) { tab = 'data'; tabs(); panel(b.f || b.src); } },
      onComment: id => { activeBlock = id; tab = 'komentar'; tabs(); panel(); setTimeout(() => { const t = A.$('#cmtx', root); if (t) t.focus(); }, 50); },
      onSign: b => signDialog(b)
    });
    view.bind(); view.render();
    const left = () => {
      const lt = (A.$('[data-lt][aria-selected=true]', root) || {}).dataset; const L = A.$('#left', root);
      if (lt && lt.lt === 'ol') { L.innerHTML = '<ul class="outline-list" style="padding:12px">' + view.flow.filter(e => e.k === 'h').map(e => '<li data-go="' + esc(e.src) + '" style="cursor:pointer;' + (e.lvl === 2 ? 'padding-left:22px' : '') + '">' + esc(e.lines.map(l => M.runsText(l)).join(' ')) + '</li>').join('') + '</ul>'; return; }
      const sc = 182 / view.V.pw;
      L.innerHTML = '<div class="thumbs">' + view.sheets.map((s, i) => '<div class="thumb" data-pg="' + i + '"><div class="tframe" style="width:182px;height:' + view.V.ph * sc + 'px"></div><div class="tl">Hal. ' + (i + 1) + '</div></div>').join('') + '</div>';
      A.$$('.tframe', L).forEach((f, i) => { const c = view.sheets[i].cloneNode(true); c.querySelectorAll('[contenteditable]').forEach(x => x.removeAttribute('contenteditable')); c.querySelectorAll('.gutter').forEach(x => x.remove()); c.style.transform = 'scale(' + sc + ')'; c.style.transformOrigin = 'top left'; c.style.height = view.V.ph + 'px'; c.style.overflow = 'hidden'; f.appendChild(c); });
    };
    leftD = A.debounce(left, 900);
    A.on(root, 'click', '[data-lt]', (e, b) => { A.$$('[data-lt]', root).forEach(x => x.setAttribute('aria-selected', x === b)); left(); });
    A.on(root, 'click', '[data-pg]', (e, b) => { const s = view.sheets[+b.dataset.pg]; if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    A.on(root, 'click', '[data-go]', (e, b) => { const el = A.$('.blk[data-id="' + b.dataset.go + '"]', root); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' }); });
    setTimeout(left, 400);
    const tabs = () => A.$$('.ed-right [data-t]', root).forEach(b => b.setAttribute('aria-selected', b.dataset.t === tab));
    A.on(root, 'click', '.ed-right [data-t]', (e, b) => { tab = b.dataset.t; tabs(); panel(); });
    const panel = async focusKey => {
      const P = A.$('#panel', root);
      if (tab === 'data') {
        const keys = content.fdefs.map(f => f.k);
        P.innerHTML = '<div class="row between mb8"><b style="color:var(--ink)">Pemetaan isian naskah</b>' + (ro ? '' : '<button class="btn btn-ghost btn-xs" id="syo">' + I('refresh', 'sm') + 'Sinkronkan organisasi</button>') + '</div><p class="help mb16">Ubah nilai di sini — seluruh bagian naskah yang memakai isian ini ikut berubah otomatis.</p><div id="pf"></div>' + (keys.length ? '' : '<p class="muted">Naskah ini tidak memiliki isian formulir.</p>') +
          '<div class="well mt16 help">' + I('info', 'sm') + ' Klik chip berwarna di naskah untuk langsung menuju isiannya.</div>';
        A.Fields.render(A.$('#pf', P), content, keys, { compact: true, readOnly: ro }, () => { saver.touch(); refreshD(); });
        if (focusKey) { const fe = A.$('[data-field="' + focusKey + '"]', P); if (fe) { fe.scrollIntoView({ block: 'center' }); const inp = fe.querySelector('input,textarea,select'); if (inp) inp.focus(); fe.style.outline = '2px solid var(--blue)'; fe.style.outlineOffset = '6px'; setTimeout(() => { fe.style.outline = ''; }, 1600); } }
        if (A.$('#syo', P)) A.$('#syo', P).onclick = async e => { if (doc.status === 'selesai' && !(await A.confirm({ text: 'Naskah berstatus Selesai. Sinkronkan profil organisasi terbaru?' }))) return; A.busy(e.currentTarget, true); const x = await A.api('doc.syncOrg', { id: doc.id }); A.busy(e.currentTarget, false); if (!x.success) return A.toast(x.message, 'bad'); view.snap(); content.org = x.data; view._pre = false; view.render(); saver.touch(); A.toast('Data organisasi disinkronkan.'); };
      } else if (tab === 'halaman') {
        const d = ro ? 'disabled' : '', P2 = content.page;
        P.innerHTML = '<div class="col" style="gap:16px">' + A.field({ id: 'psz', label: 'Ukuran kertas', input: '<select class="select" id="psz" ' + d + '>' + [['A4', 'A4 (21 × 29,7 cm)'], ['F4', 'F4 / Folio (21,5 × 33 cm)'], ['Letter', 'Letter (21,6 × 27,9 cm)']].map(x => '<option value="' + x[0] + '" ' + (P2.size === x[0] ? 'selected' : '') + '>' + x[1] + '</option>').join('') + '</select>' }) +
          '<div class="well"><div class="row between mb8"><b style="color:var(--ink)">Margin naskah (cm)</b><span class="tag ink">' + [P2.ml, P2.mt, P2.mr, P2.mb].join('-') + '</span></div><div class="grid g2" style="gap:10px">' + [['ml', 'Kiri (penjilidan)'], ['mt', 'Atas'], ['mr', 'Kanan'], ['mb', 'Bawah']].map(m => A.field({ id: 'm' + m[0], label: m[1], input: '<input class="input mono" type="number" step="0.25" min="1" max="6" id="m' + m[0] + '" data-m="' + m[0] + '" value="' + P2[m[0]] + '" ' + d + '>' })).join('') + '</div><button class="btn btn-ghost btn-xs mt8" data-std ' + d + '>Kembalikan ke 4-3-3-3 cm (standar naskah dinas)</button></div>' +
          A.field({ id: 'pkop', label: 'Kop surat', input: '<select class="select" id="pkop" ' + d + '><option value="none">Tanpa kop</option><option value="first">Halaman pertama saja</option><option value="all">Semua halaman</option></select>' }) +
          A.field({ id: 'ppn', label: 'Nomor halaman', input: '<div class="grid g2" style="gap:10px"><select class="select" id="ppn" ' + d + '><option value="skipFirst">Mulai halaman 2</option><option value="all">Semua halaman</option><option value="none">Tanpa nomor</option></select><select class="select" id="ppp" ' + d + '><option value="center">Tengah bawah</option><option value="right">Kanan bawah</option></select></div>' }) +
          '<label class="switch"><input type="checkbox" id="phn" ' + (P2.headNum ? 'checked' : '') + ' ' + d + '> Penomoran otomatis BAB I, II… & sub-judul A, B…</label><label class="switch"><input type="checkbox" id="pbh" ' + (P2.babHal ? 'checked' : '') + ' ' + d + '> Setiap BAB dimulai di halaman baru</label>' +
          '<div class="banner">' + I('info') + '<div>Huruf, ukuran, dan spasi berlaku untuk seluruh naskah dan diatur dari bilah alat. Pilihan huruf dibatasi pada huruf yang tersedia di Word & Google Docs agar hasil ekspor sama.</div></div></div>';
        A.$('#pkop', P).value = P2.kop; A.$('#ppn', P).value = P2.pnum; A.$('#ppp', P).value = P2.pnumPos;
        if (ro) return;
        const apply = () => { view.snap(); content.page = M.cleanPage(content.page); view._pre = false; view.render(); saver.touch(); A.$('.ed-ruler span', root).textContent = 'Margin: kiri ' + content.page.ml + ' cm · atas ' + content.page.mt + ' cm · kanan ' + content.page.mr + ' cm · bawah ' + content.page.mb + ' cm'; };
        P.onchange = e => { const t = e.target, P3 = content.page; if (t.id === 'psz') P3.size = t.value; if (t.dataset.m) P3[t.dataset.m] = +t.value; if (t.id === 'pkop') P3.kop = t.value; if (t.id === 'ppn') P3.pnum = t.value; if (t.id === 'ppp') P3.pnumPos = t.value; if (t.id === 'phn') P3.headNum = t.checked; if (t.id === 'pbh') P3.babHal = t.checked; apply(); panelD(); };
        A.$('[data-std]', P).onclick = () => { Object.assign(content.page, { ml: 4, mt: 3, mr: 3, mb: 3 }); apply(); panel(); };
      } else if (tab === 'versi') {
        P.innerHTML = A.skel(5);
        const x = await A.api('doc.versions', { id: doc.id });
        if (!x.success) { P.innerHTML = A.errorBox(x); return; }
        const LBL = { auto: 'Simpan otomatis', manual: 'Simpan manual', status: 'Perubahan status', ekspor: 'Ekspor', pulih: 'Pemulihan' };
        P.innerHTML = (ro ? '' : '<button class="btn btn-secondary btn-block mb16" id="svv">' + I('save', 'sm') + 'Simpan sebagai versi baru (Ctrl+S)</button>') + (x.data.length ? x.data.map(v => '<div class="ver"><span class="vn">v' + v.nomor + '</span><div class="grow"><div style="font-weight:600;font-size:13.5px">' + esc(LBL[v.tipe] || v.tipe) + '</div><div class="help">' + esc(v.catatan || '') + '</div><div class="help mono">' + esc(A.fmtDateTime(v.waktu)) + ' · ' + esc(v.oleh) + '</div></div><div class="col" style="gap:4px"><button class="btn btn-ghost btn-xs" data-vp="' + v.id + '">Lihat</button>' + (ro ? '' : '<button class="btn btn-ghost btn-xs" data-vr="' + v.id + '" data-vn="' + v.nomor + '">Pulihkan</button>') + '</div></div>').join('') : '<p class="muted">Belum ada versi tersimpan. Versi dibuat saat simpan manual, perubahan status, ekspor, dan otomatis tiap ±10 menit.</p>');
        if (A.$('#svv', P)) A.$('#svv', P).onclick = () => manualSave();
        A.on(P, 'click', '[data-vp]', async (e, b) => { const v = await A.api('doc.version.get', { id: doc.id, vid: b.dataset.vp }); if (!v.success) return A.toast(v.message, 'bad'); const m = A.modal({ title: 'Versi ' + v.data.nomor + ' · ' + A.fmtDateTime(v.data.waktu), size: 'lg', body: '<div class="well" id="vv" style="display:flex;justify-content:center;max-height:70vh;overflow:auto"></div>' }); Doc.mountPreview(A.$('#vv', m.el), v.data.content, { scale: 0.62, docId: doc.id, meta: A._meta }); });
        A.on(P, 'click', '[data-vr]', async (e, b) => { if (!(await A.confirm({ title: 'Pulihkan versi ' + b.dataset.vn + '?', text: 'Isi naskah saat ini disimpan dulu di riwayat, lalu versi ' + b.dataset.vn + ' dipulihkan sebagai versi baru.', ok: 'Pulihkan' }))) return; await saver.flush(); const v = await A.api('doc.version.restore', { id: doc.id, vid: b.dataset.vr }); if (!v.success) return A.toast(v.message, 'bad'); Object.keys(content).forEach(k => delete content[k]); Object.assign(content, v.data.content); saver.ev = v.data.edit_version; view.c = content; view.render(); A.toast(v.message); panel(); });
      } else if (tab === 'komentar') {
        P.innerHTML = A.skel(4);
        const x = await A.api('comment.list', { doc_id: doc.id });
        comments = x.success ? x.data : [];
        drawComments();
      }
    };
    const panelD = A.debounce(() => panel(), 50);
    const drawComments = () => {
      const P = A.$('#panel', root), open = comments.filter(c => !c.selesai && !c.parent_id).length;
      A.$('#cc', root).textContent = open;
      view.cmt = {}; comments.forEach(c => { if (!c.selesai) view.cmt[c.anchor] = 1; });
      A.$$('.blk', root).forEach(b => b.classList.toggle('has-cmt', !!view.cmt[b.dataset.id]));
      const tops = comments.filter(c => !c.parent_id);
      const blkTxt = id => { const b = view.block(id); if (!b) return '(blok terhapus)'; const t = M.runsText(M.runs(b.c || (b.items || [])[0] || [], content, A._meta)); return t ? t.slice(0, 70) + (t.length > 70 ? '…' : '') : ({ data: 'Tabel data', img: 'Gambar', sign: 'Tanda tangan', toc: 'Daftar isi', table: 'Tabel' }[b.t] || b.t); };
      P.innerHTML = (canCmt ? '<div class="well mb16"><div class="help mb8">' + (activeBlock ? 'Komentar untuk: <b>' + esc(blkTxt(activeBlock)) + '</b>' : 'Klik paragraf atau blok di naskah untuk mengomentarinya.') + '</div><textarea class="textarea" id="cmtx" rows="3" style="min-height:72px" placeholder="Tulis komentar…" ' + (activeBlock ? '' : 'disabled') + '></textarea><button class="btn btn-primary btn-sm mt8" id="cmts" ' + (activeBlock ? '' : 'disabled') + '>' + I('send', 'sm') + 'Kirim komentar</button></div>' : '') +
        (tops.length ? tops.map(c => '<div class="cmt ' + (c.selesai ? 'done' : '') + '"><div class="h"><span class="avatar sm soft">' + esc(A.initials(c.nama)) + '</span><b>' + esc(c.nama) + '</b><span class="help grow">' + esc(A.fmtRel(c.waktu)) + '</span>' + (c.selesai ? '<span class="tag ok">Selesai</span>' : '') + '</div><a href="#" class="help" data-jump="' + esc(c.anchor) + '">' + I('link', 'sm') + ' ' + esc(blkTxt(c.anchor)) + '</a><div class="b">' + esc(c.isi) + '</div>' +
          comments.filter(x => x.parent_id === c.id).map(x => '<div class="rep"><b style="font-size:13px">' + esc(x.nama) + '</b> <span class="help">' + esc(A.fmtRel(x.waktu)) + '</span><div class="b" style="margin-top:2px">' + esc(x.isi) + '</div></div>').join('') +
          (canCmt ? '<div class="row mt8"><button class="btn btn-ghost btn-xs" data-rep="' + c.id + '">' + I('msg', 'sm') + 'Balas</button>' + ((c.milik || lvl === 'owner') ? '<button class="btn btn-ghost btn-xs" data-res="' + c.id + '" data-v="' + (!c.selesai) + '">' + I('check', 'sm') + (c.selesai ? 'Buka lagi' : 'Tandai selesai') + '</button>' : '') + '</div>' : '') + '</div>').join('') : '<p class="muted">Belum ada komentar.</p>');
      const send = async (isi, parent, anchor) => { const y = await A.api('comment.add', { doc_id: doc.id, anchor: anchor, isi: isi, parent_id: parent || '' }); if (!y.success) return A.toast(y.message, 'bad'); comments = y.data; drawComments(); };
      if (A.$('#cmts', P)) A.$('#cmts', P).onclick = () => { const t = A.$('#cmtx', P).value.trim(); if (t) send(t, '', activeBlock); };
      A.on(P, 'click', '[data-rep]', async (e, b) => { const t = await A.prompt({ title: 'Balas komentar', multi: true, ok: 'Kirim' }); const par = comments.find(c => c.id === b.dataset.rep); if (t && t.trim()) send(t.trim(), b.dataset.rep, par.anchor); });
      A.on(P, 'click', '[data-res]', async (e, b) => { const y = await A.api('comment.resolve', { id: b.dataset.res, selesai: b.dataset.v === 'true' }); if (y.success) { comments = y.data; drawComments(); } else A.toast(y.message, 'bad'); });
      A.on(P, 'click', '[data-jump]', (e, a) => { e.preventDefault(); const el = A.$('.blk[data-id="' + a.dataset.jump + '"]', root); if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); view.select(a.dataset.jump); } });
    };
    A.api('comment.list', { doc_id: doc.id }).then(x => { if (x.success) { comments = x.data; A.$('#cc', root).textContent = comments.filter(c => !c.selesai && !c.parent_id).length; view.cmt = {}; comments.forEach(c => { if (!c.selesai) view.cmt[c.anchor] = 1; }); A.$$('.blk', root).forEach(b => b.classList.toggle('has-cmt', !!view.cmt[b.dataset.id])); } });
    const refreshD = A.debounce(() => view.refresh(), 250);
    panel();
    const signDialog = b => A.signDialog(view, b, () => saver.touch());
    const manualSave = async () => { if (ro) return; saver.dirty = true; const x = await saver.save('manual', { catatan: 'Disimpan manual dari editor' }); if (x.success) A.toast('Tersimpan sebagai versi ' + x.data.versi + '.'); };
    /* ---------- bilah alat ---------- */
    if (!ro) {
      A.Tools.bind(root, view, { signDialog: signDialog, onZoom: z => { zoom = z; } });
      A.$('#stt', root).onchange = async e => { const st = e.target.value; await saver.flush(); const x = await A.api('doc.status', { id: doc.id, status: st }); if (!x.success) { e.target.value = doc.status; return A.toast(x.message, 'bad'); } doc.status = st; A.toast(x.message); A.invalidate('dash'); };
      A.$('#jd', root).oninput = e => { doc.judul = e.target.value; saver.touch(); };
    }
    const keys = e => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 's') { e.preventDefault(); manualSave(); }
      if (!ro && k === 'z' && !e.shiftKey) { e.preventDefault(); view.undo(false); }
      if (!ro && (k === 'y' || (k === 'z' && e.shiftKey))) { e.preventDefault(); view.undo(true); }
      if (k === 'p') { e.preventDefault(); A.printDoc(content, doc.id, A._meta); }
    };
    document.addEventListener('keydown', keys); A.cleanup.push(() => document.removeEventListener('keydown', keys));
    A.$('#pnl', root).onclick = () => A.$('#right', root).classList.toggle('open');
    A.$('#acc', root).onclick = () => doc.unduh ? A.serverPreview(saver) : A.printDoc(content, doc.id, A._meta);
    if (A.$('#share', root)) A.$('#share', root).onclick = () => A.shareDialog(doc);
    if (A.$('#exp', root)) A.$('#exp', root).onclick = e => A.menu(e.currentTarget, [
      { label: 'Unduh PDF (dari server)', icon: 'download', act: () => A.exportDoc(saver, 'pdf') },
      { label: 'Unduh DOCX (Microsoft Word)', icon: 'file', act: () => A.exportDoc(saver, 'docx') },
      '-', { label: 'Cetak / Simpan PDF dari browser', icon: 'printer', act: () => A.printDoc(content, doc.id, A._meta) }
    ]);
    if (!ro) offerLocal(saver).then(x => { if (x) { view.c = content; view.render(); panel(); } });
    if (!ro && doc.status === 'selesai') A.toast('Naskah berstatus Selesai. Perubahan akan mencatat versi final & mengubah status menjadi Proses Penyuntingan.', 'info', { ms: 6000 });
    if (lvl === 'comment') A.toast('Anda dapat membaca & mengomentari naskah ini.', 'info');
  }, { shell: false });
})();
