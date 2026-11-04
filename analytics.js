// SUNKAR BI · analytics.js — модуль «analytics» (шаг 2A, пункт 4): table2() — стандарт таблицы (итоги, доли, сравнения к прошлому
// периоду и к году назад, сортировка, поиск, постраничность, CSV, пусто/загрузка), chain() — сквозная цепочка
// объект → заказчик → посты → смены → происшествия → деньги → дебиторка, KPI_DEF — словарь показателей с формулами словами.
// Правила подключения — комментарий у window.SUNKAR в app.js: стили — K.ui.css('analytics', …) с классами .an-* и токенами :root;
// строки — I18N.t('an.…'), словарь — I18N.add здесь же; данные — только K.data / K.roles / K.fmt / K.W (собственных расчётов выручки и дебиторки нет).
(function(){
  'use strict';
  const I = window.I18N, t = (k, v) => I.t(k, v), tc = (k, v) => I.t('cards.' + k, v);
  let K = null;
  const STATE = new Map();          // состояние таблицы (сортировка, показано строк, поиск, фильтры) — живёт между перерисовками
  const REG = new Map();            // id → параметры последней отрисовки (для перерисовки по нажатию и для карточки строки)
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
  const strip = s => String(s == null ? '' : s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const NUMK = new Set(['num','int','money','tenge','pct','days','min','km','date','delta','mo']);

  // ---------- словарь модуля ----------
  I.add('ru', {
    'an.total': 'Итого', 'an.avg': 'в среднем', 'an.max': 'макс.', 'an.min': 'мин.', 'an.share': 'доля', 'an.vs_prev': 'к прошлому периоду', 'an.vs_yago': 'к году назад', 'an.on_unit': 'на пост в месяц',
    'an.more': 'Показать ещё {n}', 'an.all': 'Все {n}', 'an.less': 'Свернуть до {n}', 'an.shown': 'показано {a} из {b}', 'an.csv': 'CSV', 'an.csv_t': 'Выгрузить таблицу в CSV (откроется в Excel)',
    'an.search': 'Поиск в таблице', 'an.search_ph': 'Найти в таблице…', 'an.nothing': 'Ничего не найдено — измените поиск или фильтр.', 'an.empty': 'За выбранный период данных нет.', 'an.loading': 'Готовлю данные…',
    'an.no_prev': 'Сравнение «к прошлому периоду» для среза «{p}» не считается — только «к году назад».', 'an.no_yago': 'Год назад — данных нет (история с {d}).', 'an.sort': 'Сортировать по столбцу «{c}»',
    'an.rows': ['строка','строки','строк'], 'an.cum': 'нарастающим итогом', 'an.no_base': 'нет базы',
    'an.ch.title': 'Сквозная аналитика', 'an.ch.sub': 'объект → заказчик → посты → смены → происшествия → деньги → дебиторка · {p}',
    'an.ch.cust': 'Заказчик', 'an.ch.posts': 'Посты', 'an.ch.shifts': 'Смены', 'an.ch.inc': 'Происшествия', 'an.ch.chk': 'Проверки', 'an.ch.money': 'Деньги', 'an.ch.ar': 'Дебиторка', 'an.ch.work': 'Задачи и документы', 'an.ch.contract': 'Договор',
    'an.ch.objects': 'Объекты', 'an.ch.region': 'Регион', 'an.ch.tasks': 'Задачи', 'an.ch.errands': 'Поручения ИИ', 'an.ch.chats': 'Чаты', 'an.ch.nomoney': 'суммы скрыты по правам роли',
    'an.ch.pay': 'оплата {a} дн. · обычная задержка {b} дн.', 'an.ch.fte': 'FTE {f} · тариф {t} · безубыточность {b}', 'an.ch.sh': 'не открыто {m} · опоздания {l} · в срок {p}',
    'an.ch.incd': 'жалоб {c} · реакция ГБР {r} мин', 'an.ch.chkd': 'оценка {s} · предписаний открыто {p}', 'an.ch.mon': 'выручка {r} · ФОТ {g} · прибыль {p} · маржа {m}',
    'an.ch.ard': 'просрочено {o} · {d} дн. · последняя оплата {l}', 'an.ch.workd': 'задач {t} · приказов {o} · записок {m}', 'an.ch.left': 'до {d} · осталось {n} дн.', 'an.ch.ended': 'расторгнут {d}',
    'an.ch.nopay': 'оплат не было', 'an.ch.objd': 'постов {p} · выручка {r}', 'an.ch.regd': '{c} · заказчиков {n}',
  });
  I.add('en', {
    'an.total': 'Total', 'an.avg': 'average', 'an.max': 'max', 'an.min': 'min', 'an.share': 'share', 'an.vs_prev': 'vs previous period', 'an.vs_yago': 'vs a year ago', 'an.on_unit': 'per post per month',
    'an.more': 'Show {n} more', 'an.all': 'All {n}', 'an.less': 'Collapse to {n}', 'an.shown': 'showing {a} of {b}', 'an.csv': 'CSV', 'an.csv_t': 'Export the table to CSV (opens in Excel)',
    'an.search': 'Search the table', 'an.search_ph': 'Find in table…', 'an.nothing': 'Nothing found — change the search or the filter.', 'an.empty': 'No data for the selected period.', 'an.loading': 'Preparing data…',
    'an.no_prev': '“Vs previous period” is not calculated for the “{p}” range — only “vs a year ago”.', 'an.no_yago': 'A year ago — no data (history starts {d}).', 'an.sort': 'Sort by “{c}”',
    'an.rows': ['row','rows'], 'an.cum': 'cumulative', 'an.no_base': 'no base',
    'an.ch.title': 'End-to-end analytics', 'an.ch.sub': 'site → customer → posts → shifts → incidents → money → receivables · {p}',
    'an.ch.cust': 'Customer', 'an.ch.posts': 'Posts', 'an.ch.shifts': 'Shifts', 'an.ch.inc': 'Incidents', 'an.ch.chk': 'Inspections', 'an.ch.money': 'Money', 'an.ch.ar': 'Receivables', 'an.ch.work': 'Tasks & documents', 'an.ch.contract': 'Contract',
    'an.ch.objects': 'Sites', 'an.ch.region': 'Region', 'an.ch.tasks': 'Tasks', 'an.ch.errands': 'AI errands', 'an.ch.chats': 'Chats', 'an.ch.nomoney': 'amounts hidden by role rights',
    'an.ch.pay': 'payment {a} d · usual delay {b} d', 'an.ch.fte': 'FTE {f} · tariff {t} · break-even {b}', 'an.ch.sh': 'not opened {m} · late {l} · on time {p}',
    'an.ch.incd': 'complaints {c} · rapid response {r} min', 'an.ch.chkd': 'score {s} · open orders {p}', 'an.ch.mon': 'revenue {r} · payroll {g} · profit {p} · margin {m}',
    'an.ch.ard': 'overdue {o} · {d} d · last payment {l}', 'an.ch.workd': 'tasks {t} · orders {o} · memos {m}', 'an.ch.left': 'until {d} · {n} d left', 'an.ch.ended': 'terminated {d}',
    'an.ch.nopay': 'no payments yet', 'an.ch.objd': 'posts {p} · revenue {r}', 'an.ch.regd': '{c} · customers {n}',
  });

  // ---------- форматирование ячейки по виду столбца ----------
  function fmtCell(c, v, row){
    const f = K.fmt;
    if (c.fmt) return c.fmt(v, row);
    if (v == null || v === '' || (typeof v === 'number' && !isFinite(v))) return '—';
    switch (c.kind){
      case 'money': return f.M(v);
      case 'tenge': return f.N(f.conv(v));
      case 'int': return f.N(v);
      case 'num': return f.F(v, c.d != null ? c.d : 1);
      case 'pct': return f.P(v);
      case 'days': case 'min': case 'km': return f.N(v);
      case 'mo': return f.F(v, 1);
      case 'date': return f.dt(v);
      default: return esc(v);
    }
  }
  const unitOf = c => c.unit != null ? c.unit : (c.kind === 'money' ? K.fmt.U() : (c.kind === 'tenge' ? (K.fmt.T(0).replace(/[\d\s ,.−-]/g, '') || '₸') : ''));
  const headOf = c => { const u = unitOf(c); return u && !/,\s*\S+$/.test(strip(c.title)) ? `${c.title}, ${u}` : c.title; };
  const valOf = (c, r) => typeof c.val === 'function' ? c.val(r) : r[c.key];
  const RNGx = () => K.RNG;

  // базы сравнения столбца: c.cmp = { prev:(row)=>v, yago:(row)=>v, low } или общие opts.prev/opts.yago
  function bases(o, c, r){
    const out = {};
    const pick = (fn, k) => { if (typeof fn !== 'function') return undefined; const x = fn(r); return x != null && typeof x === 'object' ? x[c.key] : x; };
    if (c.cmp){ out.prev = pick(c.cmp.prev || o.prev, 'prev'); out.yago = pick(c.cmp.yago || o.yago, 'yago'); }
    return out;
  }

  // ---------- развёртка столбцов: доля, к прошлому, к году назад ----------
  function expand(o){
    const R = RNGx(), cols = [];
    o.cols.forEach((c, i) => {
      cols.push({ ...c, _i: i, _type: 'base' });
      if (c.share) cols.push({ key: c.key + ':share', title: `${t('an.share')}`, kind: 'pct', lo: c.lo, _src: c, _type: 'share' });
      if (c.cmp && R.prev && (c.cmp.prev || o.prev)) cols.push({ key: c.key + ':prev', title: t('an.vs_prev'), kind: 'delta', lo: true, _src: c, _type: 'prev', tip: K.fmt.win(R.prev) });
      if (c.cmp && R.yago && (c.cmp.yago || o.yago)) cols.push({ key: c.key + ':yago', title: t('an.vs_yago'), kind: 'delta', lo: true, _src: c, _type: 'yago', tip: K.fmt.win(R.yago) });
      if (c.cum) cols.push({ key: c.key + ':cum', title: t('an.cum'), kind: c.kind, lo: true, _src: c, _type: 'cum' });
    });
    return cols;
  }
  const pctCh = (cur, base, cmp) => cmp && cmp.pp ? (cur == null || base == null ? null : cur - base) : base == null || !isFinite(base) || Math.abs(base) < 1e-9 ? null : (cur/base - 1) * 100;

  // ---------- итоги ----------
  function totals(o, rows){
    const T0 = {};
    o.cols.forEach(c => {
      const vs = rows.map(r => valOf(c, r)).filter(v => typeof v === 'number' && isFinite(v));
      let v = null;
      if (typeof c.tot === 'function') v = c.tot(rows);
      else if (c.sum === 'sum') v = vs.reduce((s, x) => s + x, 0);
      else if (c.sum === 'avg') v = vs.length ? vs.reduce((s, x) => s + x, 0) / vs.length : null;
      else if (c.sum === 'count') v = rows.length;
      else if (c.sum && c.sum.w){ let a = 0, b = 0; rows.forEach(r => { const x = valOf(c, r), w = r[c.sum.w]; if (typeof x === 'number' && isFinite(x) && w){ a += x * w; b += w; } }); v = b ? a / b : null; }
      else if (c.sum === 'min') v = vs.length ? Math.min(...vs) : null;
      else if (c.sum === 'max') v = vs.length ? Math.max(...vs) : null;
      T0[c.key] = v;
      if (c.cmp){ for (const k of ['prev', 'yago']){ if (typeof c.cmp[k + 'Tot'] === 'function') T0[c.key + ':' + k + 'B'] = c.cmp[k + 'Tot'](rows); else if (c.sum === 'sum'){ let s = 0, any = false; rows.forEach(r => { const b = bases(o, c, r)[k]; if (typeof b === 'number' && isFinite(b)){ s += b; any = true; } }); T0[c.key + ':' + k + 'B'] = any ? s : null; } } }
    });
    return T0;
  }

  // ---------- строки после поиска, фильтров и сортировки ----------
  function view(o){
    const st = stateOf(o.id, o);
    let rows = o.rows.map((r, i) => (r._ix = i, r));
    if (st.q){ const q = st.q.toLowerCase(); rows = rows.filter(r => (r._search != null ? String(r._search) : o.cols.map(c => strip(c.html ? c.html(r) : fmtCell(c, valOf(c, r), r))).join(' ')).toLowerCase().includes(q)); }
    (o.filters || []).forEach(f => { if (st.f.has(f.id)) rows = rows.filter(f.fn); });
    const s = st.sort;
    if (s && s.key){
      const [k0, part] = s.key.split(':'), c = o.cols.find(x => x.key === k0);
      if (c){
        const T0 = part === 'share' ? totals(o, rows) : null;
        const key = r => { const v = valOf(c, r); if (part === 'share') return T0[c.key] ? v / T0[c.key] : 0; if (part === 'prev' || part === 'yago'){ const p = pctCh(v, bases(o, c, r)[part], c.cmp); return p == null ? -Infinity : p; } return typeof c.sortVal === 'function' ? c.sortVal(r) : v; };
        const dir = s.dir === 'asc' ? 1 : -1, loc = I.locale;
        rows = rows.slice().sort((a, b) => { const x = key(a), y = key(b); if (typeof x === 'number' || typeof y === 'number') return ((+x || 0) - (+y || 0)) * dir || a._ix - b._ix; return String(strip(x)).localeCompare(String(strip(y)), loc, { numeric: true }) * dir || a._ix - b._ix; });
      }
    }
    return rows;
  }
  function stateOf(id, o){
    let st = STATE.get(id);
    if (!st){ st = { sort: o && o.sort ? { ...o.sort } : null, n: (o && o.pageSize) || 25, q: '', f: new Set((o && o.filters || []).filter(f => f.on).map(f => f.id)) }; STATE.set(id, st); }
    return st;
  }

  // ---------- отрисовка ----------
  // сравнение: относительное (▲ +x %) или в процентных пунктах для долей и маржи (cmp.pp)
  function dlt(cur, base, cmp, r){
    const low = cmp ? (typeof cmp.low === 'function' ? !!cmp.low(r || {}) : !!cmp.low) : false;
    if (!cmp || !cmp.pp) return K.data.delta(cur, base, low);
    if (cur == null || base == null || !isFinite(cur) || !isFinite(base)) return `<span class="dl">${t('an.no_base')}</span>`;
    const d = cur - base, good = low ? d <= 0 : d >= 0;
    if (Math.abs(d) < 0.05) return `<span class="dl">= 0,0 ${t('an.pp')}</span>`.replace('0,0', K.fmt.F(0));
    return `<span class="${good ? 'up' : 'dn'}">${d >= 0 ? '▲ +' : '▼ −'}${K.fmt.F(Math.abs(d))} ${t('an.pp')}</span>`;
  }
  function cellHtml(o, c, r, T0){
    const R = RNGx();
    if (c._type === 'share'){ const v = valOf(c._src, r), tot = T0[c._src.key]; return tot ? K.fmt.P(v / tot * 100) : '—'; }
    if (c._type === 'prev' || c._type === 'yago'){ const b = bases(o, c._src, r)[c._type]; return b == null ? '<span class="dl">—</span>' : dlt(valOf(c._src, r), b, c._src.cmp, r); }
    if (c._type === 'cum') return fmtCell(c._src, r._cum && r._cum[c._src.key], r);
    if (c.html) return c.html(r);
    return fmtCell(c, valOf(c, r), r);
  }
  function totalHtml(o, c, T0, n){
    if (c._type === 'share') return T0[c._src.key] ? K.fmt.P(100) : '';
    if (c._type === 'prev' || c._type === 'yago'){ const b = T0[c._src.key + ':' + c._type + 'B']; return b == null || T0[c._src.key] == null ? '' : dlt(T0[c._src.key], b, c._src.cmp); }
    if (c._type === 'cum') return '';
    if (c._i === 0) return o.totalLabel ? o.totalLabel : `${t('an.total')} <small>· ${n} ${I.plural(n, 'an.rows')}</small>`;
    const v = T0[c.key];
    if (typeof c.totHtml === 'function') return c.totHtml(v, T0);
    if (v == null) return '';
    const lab = c.sum === 'avg' ? 'an.avg' : (c.sum === 'max' ? 'an.max' : (c.sum === 'min' ? 'an.min' : null));   // М4: итог «дней» — с подписью «макс.»/«мин.»
    return (lab ? `<small>${t(lab)}</small> ` : '') + fmtCell({ ...c, fmt: c.totFmt || c.fmt }, v, {});
  }
  function render(id){
    const o = REG.get(id); if (!o) return '';
    const st = stateOf(id, o), R = RNGx(), cols = expand(o), loc = K.fmt;
    if (o.loading) return `<div class="an-skel" aria-busy="true" aria-label="${esc(t('an.loading'))}">${'<i></i>'.repeat(6)}</div>`;
    if (!o.rows.length) return `<div class="empty an-empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M8 4v16"/></svg>${esc(o.empty || t('an.empty'))}</div>`;
    const rows = view(o), T0 = totals(o, rows), n = Math.min(st.n, rows.length);
    if (cols.some(c => c._type === 'cum')){ const acc = {}; rows.forEach(r => { r._cum = {}; o.cols.filter(c => c.cum).forEach(c => { acc[c.key] = (acc[c.key] || 0) + (+valOf(c, r) || 0); r._cum[c.key] = acc[c.key]; }); }); }
    const L = c => c.lo ? ' lo' : '';
    const sortable = o.sortable !== false;
    const head = cols.map(c => {
      const key = c.key, s = st.sort && st.sort.key === key ? (st.sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';
      const tip = c.tip ? ` title="${esc(strip(c.tip))}"` : '', ttl = headOf(c);
      const inner = sortable && c.sort !== false ? `<button type="button" class="an-sb" data-an-sort="${esc(key)}" aria-label="${esc(t('an.sort', { c: strip(ttl) }))}">${ttl}${c.tip ? ' <span class="an-i" aria-hidden="true">ⓘ</span>' : ''}</button>` : `${ttl}${c.tip ? ' <span class="an-i" aria-hidden="true">ⓘ</span>' : ''}`;
      return `<th scope="col" class="${(NUMK.has(c.kind) ? 'num' : '') + L(c)}"${sortable && c.sort !== false ? ` aria-sort="${s}"` : ''}${tip}>${inner}</th>`;
    }).join('');
    const body = rows.slice(0, n).map(r => {
      const card = r._kind ? `${r._kind}:${r._id}` : `row:${id}:${r._ix}`;
      return `<tr class="rowlink${r._cls ? ' ' + r._cls : ''}" tabindex="0" data-card="${esc(card)}">${cols.map(c => { const cl = (NUMK.has(c.kind) ? 'num' : '') + L(c) + (c.cls ? ' ' + (c.cls(r) || '') : ''); return `<td${cl.trim() ? ` class="${cl.trim()}"` : ''}>${cellHtml(o, c, r, T0)}</td>`; }).join('')}</tr>`;
    }).join('');
    const foot = o.total === false || !rows.length ? '' : `<tfoot><tr class="total">${cols.map(c => `<td class="${(NUMK.has(c.kind) && c._i !== 0 ? 'num' : '') + L(c)}">${totalHtml(o, c, T0, rows.length)}</td>`).join('')}</tr></tfoot>`;
    const search = o.search === false ? '' : (o.search || o.rows.length > 12 ? `<label class="an-q"><span class="vh">${esc(t('an.search'))}</span><input type="search" data-an-q value="${esc(st.q)}" placeholder="${esc(t('an.search_ph'))}" aria-label="${esc(t('an.search'))}" autocomplete="off"></label>` : '');
    const filt = (o.filters || []).map(f => `<button type="button" class="an-f${st.f.has(f.id) ? ' on' : ''}" data-an-filter="${esc(f.id)}" aria-pressed="${st.f.has(f.id)}">${esc(f.label)}</button>`).join('');
    const csvB = o.csv === false ? '' : `<button type="button" class="btn-quiet an-csv" data-an-csv title="${esc(t('an.csv_t'))}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3"/></svg>${t('an.csv')}</button>`;
    const bar = (search || filt || csvB) ? `<div class="an-bar">${search}${filt}<span class="an-cnt">${rows.length !== o.rows.length ? t('an.shown', { a: rows.length, b: o.rows.length }) : `${o.rows.length} ${I.plural(o.rows.length, 'an.rows')}`}</span>${csvB}</div>` : '';
    const ps = o.pageSize || 25;
    const pager = rows.length > ps ? `<div class="an-pg">${n < rows.length ? `<button type="button" class="btn-sec" data-an-more>${t('an.more', { n: Math.min(ps, rows.length - n) })}</button><button type="button" class="btn-quiet" data-an-all>${t('an.all', { n: rows.length })}</button>` : `<button type="button" class="btn-quiet" data-an-less>${t('an.less', { n: ps })}</button>`}<span class="an-cnt">${t('an.shown', { a: n, b: rows.length })}</span></div>` : '';
    const notes = [];
    if (o.cols.some(c => c.cmp) && !R.prev && (S().period === 'ytd' || S().period === 'pyear')) notes.push(t('an.no_prev', { p: R.label }));
    if (o.cols.some(c => c.cmp) && !R.yago) notes.push(t('an.no_yago', { d: loc.dt(0) }));
    const nothing = rows.length ? '' : `<p class="note an-none">${esc(t('an.nothing'))}</p>`;
    return `${bar}<div class="tw"><table class="tbl zebra an-tbl${o.compact ? ' compact' : ''}"${o.caption ? ` aria-label="${esc(strip(o.caption))}"` : ''}><thead><tr>${head}</tr></thead><tbody>${body}</tbody>${foot}</table></div>${nothing}${pager}${notes.length ? `<p class="note an-nb">${notes.map(esc).join(' · ')}</p>` : ''}${o.note ? `<p class="note">${o.note}</p>` : ''}`;
  }
  const S = () => K.S;

  // table2(opts) → HTML. opts: { id, cols:[{key,title,kind,sum,share,lo,tip,cmp:{prev,yago,low},cum,html,fmt,val,cls,sortVal,tot}], rows:[{…,_kind,_id,_cls,_search}],
  //   prev, yago, total, pageSize, sortable, sort:{key,dir}, csv:'имя', search, filters:[{id,label,fn,on}], empty, loading, compact, caption, note, ctx }
  function table2(o){
    o = { pageSize: 25, total: true, sortable: true, ...o };
    if (!o.id) o.id = 'an-' + String(o.csv || strip(o.cols.map(c => c.title).join('|'))).replace(/[^\wА-Яа-яЁё-]+/g, '_').slice(0, 40);
    o.rows = o.rows || [];
    REG.set(o.id, o);
    return `<div class="an-t" data-an="${esc(o.id)}">${render(o.id)}</div>`;
  }

  // переходник для реестров ядра, где ячейки уже собраны в HTML (кнопки маршрутов, пилюли статусов): заголовки + строки-массивы → table2
  // o: { lo:[i], kinds:{i:'int'}, vals:{i:(row)=>число для итога и сортировки}, sums:{i:'sum'}, nosort:[i], meta:(k)=>({_kind,_id,_cls}) } + обычные параметры table2
  const sortKey = h => { const s = strip(h), m = s.match(/^[−\-+]?\d[\d\s  ]*(?:[.,]\d+)?/); return m ? parseFloat(m[0].replace(/[\s  ]/g, '').replace('−', '-').replace(',', '.')) : s; };
  function fromRows(head, rows, o = {}){
    const vals = o.vals || {}, kinds = o.kinds || {}, sums = o.sums || {};
    const isNum = i => i > 0 && rows.length && rows.every(c => { const s = strip(c[i]); return !s || s === '—' || (K.ui.numRe && K.ui.numRe.test(s)); });
    const cols = head.map((h, i) => ({ key: 'c' + i, title: h, lo: (o.lo || []).includes(i), kind: kinds[i] || (isNum(i) ? 'num' : undefined), sum: sums[i], sort: (o.nosort || []).includes(i) || !strip(h) ? false : undefined,
      html: r => r._c[i] == null ? '' : r._c[i], val: vals[i] ? r => vals[i](r, r._k) : (r => r._c[i]), sortVal: vals[i] ? r => vals[i](r, r._k) : (r => sortKey(r._c[i])) }));
    return table2({ ...o, cols, rows: rows.map((c, k) => ({ _c: c, _k: k, _search: c.map(strip).join(' '), ...(o.meta ? o.meta(k, c) || {} : {}) })) });
  }

  // ---------- CSV ----------
  function csvOf(id){
    const o = REG.get(id); if (!o) return '';
    const cols = expand(o), rows = view(o), T0 = totals(o, rows), en = I.lang === 'en', sep = en ? ',' : ';';
    const num = v => { if (v == null || !isFinite(v)) return ''; const s = String(Math.round(v * 100) / 100); return en ? s : s.replace('.', ','); };
    const q = s => { s = String(s == null ? '' : s); return /[";,\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
    const raw = (c, r) => {
      if (c._type === 'share'){ const tot = T0[c._src.key]; return tot ? num(valOf(c._src, r) / tot * 100) : ''; }
      if (c._type === 'prev' || c._type === 'yago'){ const p = pctCh(valOf(c._src, r), bases(o, c._src, r)[c._type], c._src.cmp); return p == null ? '' : num(p); }
      if (c._type === 'cum') return '';
      const v = valOf(c, r);
      if (c.kind === 'money') return num(K.fmt.conv(v) / 1e6);
      if (c.kind === 'tenge') return num(K.fmt.conv(v));
      if (typeof c.csv === 'function') return c.csv(r);
      if (c.kind === 'date') return v == null ? '' : (en ? K.W.iso(v) : I.date(v));   // М3: даты — как в интерфейсе (дд.мм.гггг)
      if (typeof v === 'number') return num(v);
      const h = c.html ? c.html(r) : fmtCell(c, v, r);
      return strip(String(h).split(/<br\s*\/?>/i)[0]);                                // М3: подзаголовок ячейки (<br><small>…) не склеивается с названием
    };
    const lines = [cols.map(c => q(strip(headOf(c)) + (c._type === 'share' || c._type === 'prev' || c._type === 'yago' ? ', %' : ''))).join(sep)];
    rows.forEach(r => lines.push(cols.map(c => q(raw(c, r))).join(sep)));
    if (o.total !== false) lines.push(cols.map((c, k) => k === 0 ? q(t('an.total')) : (c._type === 'base' && T0[c.key] != null && typeof T0[c.key] === 'number' ? q(c.kind === 'money' ? num(K.fmt.conv(T0[c.key]) / 1e6) : num(T0[c.key])) : '')).join(sep));
    return '﻿' + lines.join('\r\n');
  }
  function download(name, text, mime = 'text/csv;charset=utf-8'){
    const blob = new Blob([text], { type: mime }), url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500);
    return name;
  }
  function csvName(id){ const o = REG.get(id) || {}, R = RNGx(); return `${String(o.csv || id).replace(/[\\/:*?"<>|\s]+/g, '_')}_${K.W.iso(R.from)}_${K.W.iso(R.to)}.csv`; }
  function exportCsv(id){ return download(csvName(id), csvOf(id)); }

  // ---------- взаимодействие: сортировка, поиск, фильтры, постраничность, CSV ----------
  // таблицы с кнопками и полями ядра (маршруты документов, заявки) перерисовываются вместе с разделом, чтобы ядро заново подключило кнопки
  function rerender(el, focusSel){
    const id = el.dataset.an, main = document.getElementById('content');
    const live = main && main.contains(el) && el.querySelector('tbody button, tbody input, tbody select');
    if (live && K && typeof K.render === 'function'){ K.render(); }
    else { const box = document.createElement('div'); box.innerHTML = `<div class="an-t" data-an="${esc(id)}">${render(id)}</div>`; el.replaceWith(box.firstChild); }
    if (focusSel){ const nel = document.querySelector(`.an-t[data-an="${CSS.escape(id)}"]`); const f = nel && nel.querySelector(focusSel); if (f){ f.focus(); if (f.matches('input[type=search]')){ const v = f.value; f.setSelectionRange(v.length, v.length); } } }
  }
  function onClick(e){
    const box = e.target.closest && e.target.closest('.an-t[data-an]'); if (!box) return;
    const id = box.dataset.an, o = REG.get(id); if (!o) return;
    const st = stateOf(id, o), ps = o.pageSize || 25;
    const sb = e.target.closest('[data-an-sort]');
    if (sb){ const k = sb.dataset.anSort, cur = st.sort && st.sort.key === k ? st.sort.dir : null; const c0 = o.cols.find(c => c.key === k.split(':')[0]); const first = c0 && !NUMK.has(c0.kind) && !k.includes(':') ? 'asc' : 'desc'; st.sort = { key: k, dir: cur ? (cur === 'asc' ? 'desc' : 'asc') : first }; rerender(box, `[data-an-sort="${CSS.escape(k)}"]`); return; }
    if (e.target.closest('[data-an-more]')){ st.n += ps; rerender(box, '[data-an-more],[data-an-less]'); return; }
    if (e.target.closest('[data-an-all]')){ st.n = 1e9; rerender(box, '[data-an-less]'); return; }
    if (e.target.closest('[data-an-less]')){ st.n = ps; rerender(box, '[data-an-more]'); return; }
    const fb = e.target.closest('[data-an-filter]');
    if (fb){ const f = fb.dataset.anFilter; if (st.f.has(f)) st.f.delete(f); else st.f.add(f); st.n = ps; rerender(box, `[data-an-filter="${CSS.escape(f)}"]`); return; }
    if (e.target.closest('[data-an-csv]')){ exportCsv(id); return; }
  }
  let qT = 0;
  function onInput(e){
    const inp = e.target.closest && e.target.closest('input[data-an-q]'); if (!inp) return;
    const box = inp.closest('.an-t[data-an]'); if (!box) return;
    const id = box.dataset.an, o = REG.get(id); if (!o) return;
    clearTimeout(qT); qT = setTimeout(() => { const st = stateOf(id, o); st.q = inp.value.trim(); st.n = o.pageSize || 25; const cur = document.querySelector(`.an-t[data-an="${CSS.escape(id)}"]`); if (cur) rerender(cur, 'input[data-an-q]'); }, 220);
  }
  function onKey(e){ if (e.key === 'Escape'){ const inp = e.target.closest && e.target.closest('input[data-an-q]'); if (inp && inp.value){ e.stopPropagation(); inp.value = ''; onInput({ target: inp }); } } }

  // ---------- сквозная цепочка ----------
  const objById = id => K.W.objects.find(o => String(o.id) === String(id));
  const custById = id => K.W.customers.find(c => String(c.id) === String(id));
  const objRe = o => new RegExp(o.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?!\\d)');
  const fmtM = v => K.fmt.MU(v);
  const lastPay = (cust, at) => { let d = null; for (const a of K.W.acts) if (a.cust === cust && a.pay <= at && (d == null || a.pay > d)) d = a.pay; return d; };
  function objStats(list, a, b, at){
    const W = K.W, set = new Set(list);
    let rev = 0, guard = 0, direct = 0, overhead = 0, plan = 0, missed = 0, late = 0, posts = 0, fte = 0, act = 0;
    for (const o of list){ const v = W.objView(o, a, b, b); rev += v.rev; guard += v.guard; direct += v.direct; overhead += v.overhead; plan += v.plan; missed += v.missed; late += v.late; if (W.active(o, b)){ posts += o.posts; fte += o.fte; act++; } }
    const inc = W.incidents.filter(x => set.has(x.obj) && x.day >= a && x.day <= b), chk = W.checks.filter(x => set.has(x.obj) && x.day >= a && x.day <= b);
    const presc = W.prescOpen(at).filter(c => set.has(c.obj));
    const profit = rev - guard - direct - overhead;
    return { rev, guard, direct, overhead, profit, margin: rev ? profit / rev * 100 : 0, plan, missed, late, onTime: plan ? 100 - (missed + late) / plan * 100 : 100, posts, fte, act, inc, chk, presc,
      react: inc.length ? inc.reduce((s, x) => s + x.react, 0) / inc.length : 0, compl: inc.filter(x => x.type === 'жалоба заказчика').length, score: chk.length ? chk.reduce((s, c) => s + c.score, 0) / chk.length : 0 };
  }
  // chain(kind, id, from, to, at) → { nodes:[{ key, label, value, sub, delta, card, go }], kind, id } — те же функции, что в разделах (W.objView, W.receivables, incidents, checks)
  function chain(kind, id, from, to, at){
    const W = K.W, f = K.fmt, R = RNGx(), role = K.roles.roleOf(K.S.role), money = K.roles.hasMoney(role);
    from = from != null ? from : R.from; to = to != null ? to : R.to; at = at != null ? at : R.anchor;
    const pv = R.prev, nodes = [];
    const dl = (cur, base, low) => base == null ? '' : K.data.delta(cur, base, low);
    let list = [], custs = [];
    if (kind === 'object'){ const o = objById(id); if (!o) return { nodes, kind, id }; list = [o]; custs = [o.customer]; }
    else if (kind === 'customer'){ const c = custById(id); if (!c) return { nodes, kind, id }; list = c.objects.filter(K.roles.scopeOk); custs = [c]; }
    else if (kind === 'region'){ list = W.objects.filter(o => o.region === id && K.roles.scopeOk(o)); custs = W.customers.filter(c => c.region === id && c.objects.some(K.roles.scopeOk)); }
    else if (kind === 'employee'){
      const rl = K.roles.ROLES.find(r => r.id === id) || role;
      const tk = W.tasksAt(at).filter(x => x.owner === rl.name), lt = (K.data.liveTaskList() || []).filter(x => x.owner === rl.name && x.status !== 'выполнено');
      const er = at >= W.LAUNCH_DEMO ? K.data.errandsAt(at).filter(e => e.who === rl.name) : [];
      const ch = rl.rt.chats !== '·' ? K.data.myChats(rl, at) : [];
      nodes.push({ key: 'tasks', label: t('an.ch.tasks'), value: f.N(tk.length + lt.length), sub: `${f.N(tk.filter(x => x.overdue).length)} · ${tc('overdue')}`, go: 'tasks' });
      nodes.push({ key: 'errands', label: t('an.ch.errands'), value: f.N(er.length), sub: at < W.LAUNCH_DEMO ? tc('ai_since', { d: f.dt(W.LAUNCH_DEMO) }) : `${f.N(er.filter(e => e.st === 'выполнено').length)} · ${tc('done')}`, go: 'ai' });
      nodes.push({ key: 'chats', label: t('an.ch.chats'), value: f.N(ch.length), sub: ch.map(c => c.name).slice(0, 3).join(' · '), go: 'chats' });
      return { nodes, kind, id };
    }
    if (!list.length) return { nodes, kind, id };
    const s = objStats(list, from, to, at), sp = pv ? objStats(list, pv.from, pv.to, pv.to) : null;
    if (kind === 'object'){ const c = list[0].customer; nodes.push({ key: 'cust', label: t('an.ch.cust'), value: esc(I.w(c.name)), sub: `${esc(I.tx(c.channel))} · ${esc(I.tx(c.region))} · ${t('an.ch.pay', { a: c.payDays, b: c.delayMean })}`, card: 'customer:' + c.id }); }
    else if (kind === 'customer'){ nodes.push({ key: 'objs', label: t('an.ch.objects'), value: f.N(s.act), sub: t('an.ch.objd', { p: f.N(s.posts), r: money ? fmtM(s.rev) : '—' }), go: 'objects' }); }
    else nodes.push({ key: 'reg', label: t('an.ch.region'), value: esc(I.tx(id)), sub: t('an.ch.regd', { c: esc(I.tx((W.REGIONS.find(r => r.r === id) || {}).city || '')), n: f.N(custs.length) }), go: 'objects' });
    const be = s.posts && R.len ? (s.guard + s.direct + s.overhead) / s.posts / R.len * 30.4 : 0, tar = list.length === 1 ? W.tariff(list[0], Math.min(at, W.DAYS - 1)) : (s.posts ? list.filter(o => W.active(o, to)).reduce((x, o) => x + o.posts * W.tariff(o, to), 0) / s.posts : 0);
    nodes.push({ key: 'posts', label: t('an.ch.posts'), value: f.N(s.posts), sub: (list.length === 1 ? `${list[0].is24 ? '24/7' : tc('dayshift')} · ${esc(I.tx(list[0].sched))} · ` : '') + (money ? t('an.ch.fte', { f: f.F(s.fte), t: f.T(tar), b: f.T(be) }) : `FTE ${f.F(s.fte)}`), go: 'objects' });
    nodes.push({ key: 'shifts', label: t('an.ch.shifts'), value: `${f.N(s.plan - s.missed)} / ${f.N(s.plan)}`, sub: t('an.ch.sh', { m: f.N(s.missed), l: f.N(s.late), p: f.P(s.onTime) }), delta: sp ? dl(s.onTime, sp.onTime) : '', go: 'shifts' });
    nodes.push({ key: 'inc', label: t('an.ch.inc'), value: f.N(s.inc.length), sub: t('an.ch.incd', { c: f.N(s.compl), r: f.F(s.react, 0) }), delta: sp ? dl(s.inc.length, sp.inc.length, true) : '', go: 'incidents' });
    nodes.push({ key: 'chk', label: t('an.ch.chk'), value: f.N(s.chk.length), sub: t('an.ch.chkd', { s: s.chk.length ? f.F(s.score) : '—', p: f.N(s.presc.length) }), go: 'incidents' });
    nodes.push({ key: 'money', label: t('an.ch.money'), value: money ? fmtM(s.profit) : '—', sub: money ? t('an.ch.mon', { r: fmtM(s.rev), g: fmtM(s.guard), p: fmtM(s.profit), m: f.P(s.margin) }) : t('an.ch.nomoney'), delta: money && sp ? dl(s.rev, sp.rev) : '', go: money ? 'sales' : null, cls: money ? (s.profit < 0 ? 'bad' : (s.margin < 10 ? 'warn' : 'good')) : '' });
    if (money){
      const set = new Set(custs), ar = W.receivables(at, c => set.has(c)); let od = 0, md = 0; custs.forEach(c => { const e = ar.byCust.get(c); if (e){ od += e.overdue; md = Math.max(md, e.maxDays); } });
      const lp = custs.length === 1 ? lastPay(custs[0], at) : null;
      nodes.push({ key: 'ar', label: t('an.ch.ar'), value: fmtM(ar.total), sub: t('an.ch.ard', { o: fmtM(od), d: f.N(md), l: lp != null ? f.dt(lp) : t('an.ch.nopay') }), card: custs.length === 1 ? 'customer:' + custs[0].id : null, go: 'sales', cls: md > 30 ? 'bad' : (od > 0 ? 'warn' : 'good') });
    } else nodes.push({ key: 'ar', label: t('an.ch.ar'), value: '—', sub: t('an.ch.nomoney') });
    const re = list.length <= 12 ? list.map(objRe) : null, hit = s0 => re ? re.some(r => r.test(s0)) : false;
    const tk = re ? W.tasksAt(at).filter(x => hit(x.title)).length + (K.data.liveTaskList() || []).filter(x => hit(x.title || '')).length : 0;
    const D0 = K.data.docflowAt(at), setL = new Set(list);
    nodes.push({ key: 'work', label: t('an.ch.work'), value: f.N(tk + D0.orders.filter(x => x.obj && setL.has(x.obj)).length), sub: t('an.ch.workd', { t: f.N(tk), o: f.N(D0.orders.filter(x => x.obj && setL.has(x.obj)).length), m: f.N(re ? D0.memos.filter(m => hit(m.title)).length : 0) }), go: 'docflow' });
    if (kind === 'object'){ const o = list[0]; nodes.push({ key: 'contract', label: t('an.ch.contract'), value: o.terminated != null && o.terminated <= at ? '—' : f.dt(o.contractEnd), sub: o.terminated != null && o.terminated <= at ? t('an.ch.ended', { d: f.dt(o.terminated) }) : t('an.ch.left', { d: f.dts(o.contractEnd), n: f.N(o.contractEnd - at) }), go: 'legal', cls: o.contractEnd - at <= 30 ? 'warn' : '' }); }
    return { nodes, kind, id, stats: s };
  }
  function chainHtml(ch){
    if (!ch || !ch.nodes.length) return '';
    return `<div class="an-chain" role="list">${ch.nodes.map(n => `<div class="an-node${n.cls ? ' ' + n.cls : ''}${n.card || n.go ? ' an-lnk' : ''}" role="listitem"${n.card ? ` data-card="${esc(n.card)}" tabindex="0"` : (n.go ? ` data-an-go="${esc(n.go)}" tabindex="0"` : '')}><span class="an-nl">${esc(n.label)}</span><b class="an-nv">${n.value}</b>${n.delta ? `<span class="an-nd">${n.delta} <small>${t('an.vs_prev')}</small></span>` : ''}<small class="an-ns">${n.sub || ''}</small></div>`).join('<i class="an-arr" aria-hidden="true">→</i>')}</div>`;
  }

  // ---------- словарь показателей: формула словами, источник, значение, 12 месяцев, разложение ----------
  // def: { t, f, src, unit:'money'|'int'|'pct'|'min'|'days'|'num'|'text', money, type:'flow'|'stock', at:'to'|'anchor', v(a,b) | s(i), bd(a,b,i) → [{h, rows:[{name,v,card}], sum}], low, go, sig }
  const KPI_DEF = {};
  const def = (key, d) => { KPI_DEF[key] = { key, ...d }; };
  const regs = () => K.W.REGIONS.filter(r => K.S.region === 'all' || r.r === K.S.region);
  const inReg = r => K.roles.filtered().filter(o => o.region === r.r);
  const byRegion = (fn, opts = {}) => ({ h: tc('by_region'), sum: opts.sum !== false, kind: opts.kind, rows: regs().map(r => ({ name: I.tx(r.r), v: fn(inReg(r), r), card: 'region:' + r.r })).filter(x => opts.keep0 || x.v) });
  const agg = (a, b, list) => K.data.objAgg(a, b, list);
  const pl = (a, b) => K.W.pl(a, b), bal = i => K.W.balance(i);
  const ofR = (a, b) => K.data.revenueOf(a, b), ofE = (a, b) => K.data.ebitdaOf(a, b);
  const activeAt = i => K.roles.filtered().filter(o => K.W.active(o, i));
  const dayViews = i => activeAt(i).map(o => K.W.objView(o, i, i, i));
  const topObjs = (a, b, key, n = 25) => ({ h: tc('top_objects'), sum: false, rows: K.roles.filtered().map(o => K.W.objView(o, a, b, b)).filter(v => v[key]).sort((x, y) => y[key] - x[key]).slice(0, n).map(v => ({ name: I.w(v.o.name) + ' · ' + I.w(v.o.customer.name), v: v[key], card: 'object:' + v.o.id })) });
  // структура ОПиУ — разделы отчёта по уровням (0.8.2): выручка, себестоимость, коммерческие, административные, амортизация, финансовые, КПН; сумма = чистая прибыль
  const plLines = (a, b) => { const tr = K.data.plTree([{ from: a, to: b }], { months: false }).by; return { h: tc('pl_structure'), sum: true, rows: ['revenue', 'cogs', 'sales', 'admin', 'dep', 'fin', 'cit'].map(k => ({ name: t('pl.n.' + k), v: tr.get(k).v[0], card: 'line:pl:' + k })) }; };
  const list0 = (h, rows) => ({ h, sum: false, rows });
  def('revenue', { t: 'an.k.revenue', f: 'an.k.revenue.f', src: 'an.src.ledger', unit: 'money', money: true, type: 'flow', v: ofR, go: 'sales', match: [/^Выручка$/, /^Выручка за период$/, /^Выручка за 7 дней$/, /^Revenue( for the period)?$/],
    bd: (a, b) => [byRegion(l => agg(a, b, l).rev), { h: tc('by_channel'), sum: true, rows: K.W.CHANNELS.map(c => ({ name: I.tx(c), v: agg(a, b, K.roles.filtered().filter(o => o.customer.channel === c)).rev, card: 'channel:' + c })).filter(x => x.v) }, topObjs(a, b, 'rev')] });
  def('revenue_co', { t: 'an.k.revenue', f: 'an.k.revenue_co.f', src: 'an.src.ledger', unit: 'money', money: true, type: 'flow', v: (a, b) => pl(a, b).revenue, go: 'finance', sec: ['finance'], match: [/^Выручка$/],
    bd: (a, b) => [{ h: tc('by_region'), sum: true, rows: K.W.REGIONS.map(r => ({ name: I.tx(r.r), v: agg(a, b, K.W.objects.filter(o => o.region === r.r)).rev, card: 'region:' + r.r })).filter(x => x.v) }] });
  def('ebitda', { t: 'an.k.ebitda', f: 'an.k.ebitda.f', src: 'an.src.ledger', unit: 'money', money: true, type: 'flow', v: ofE, go: 'finance', match: [/^(Операционный результат \()?EBITDA\)?$/, /^Operating result \(EBITDA\)$/], sig: v => v < 0 ? 'bad' : '',
    bd: (a, b) => [byRegion(l => agg(a, b, l).profit), topObjs(a, b, 'profit')] });
  def('ebitda_co', { t: 'an.k.ebitda', f: 'an.k.ebitda_co.f', src: 'an.src.ledger', unit: 'money', money: true, type: 'flow', v: (a, b) => pl(a, b).ebitda, go: 'finance', sec: ['finance'], match: [/^EBITDA$/], bd: (a, b) => [plLines(a, b)] });
  def('net', { t: 'an.k.net', f: 'an.k.net.f', src: 'an.src.ledger', unit: 'money', money: true, type: 'flow', v: (a, b) => pl(a, b).net, go: 'finance', match: [/^Чистая прибыль$/, /^Net profit$/], bd: (a, b) => [plLines(a, b)] });
  const ytd = (fn) => () => { const at = K.RNG.anchor, y0 = K.W.idxOf(K.W.yOf(at), 0, 1); return fn(y0, at); };
  def('revenue_ytd', { t: 'an.k.revenue_ytd', f: 'an.k.revenue_ytd.f', src: 'an.src.ledger', unit: 'money', money: true, type: 'flow', ytd: true, v: (a, b) => pl(a, b).revenue, go: 'finance', match: [/^Выручка с начала года$/], bd: (a, b) => [plLines(a, b)] });
  def('net_ytd', { t: 'an.k.net_ytd', f: 'an.k.net.f', src: 'an.src.ledger', unit: 'money', money: true, type: 'flow', ytd: true, v: (a, b) => pl(a, b).net, go: 'finance', match: [/^Чистая прибыль с начала года$/], bd: (a, b) => [plLines(a, b)] });
  def('cash', { t: 'an.k.cash', f: 'an.k.cash.f', src: 'an.src.bank', unit: 'money', money: true, type: 'stock', at: 'anchor', s: i => bal(i).cash, go: 'finance', match: [/^Деньги на /, /^Cash (as of|on) /, /^Остаток на /],
    bd: (a, b, i) => { const c = K.W.cashflow(a, Math.min(b, i)); return [{ h: tc('cash_move', { p: K.fmt.win({ from: a, to: Math.min(b, i) }) }), sum: true, rows: [['cf.open', c.open], ['cf.inCustomers', c.inCustomers], ['cf.interestIn', c.interestIn], ['cf.salaries', c.salaries], ['cf.payrollTaxes', c.payrollTaxes], ['cf.vat', c.vat], ['cf.cit', c.cit], ['cf.suppliers', c.suppliers], ['cf.capex', c.capex], ['cf.leasingPay', c.leasingPay], ['cf.interestPaid', c.interestPaid], ['cf.dividends', c.dividends], ['cf.divTax', c.divTax]].map(([k, v]) => ({ name: tc('' + k), v, card: 'line:' + k.replace('.', ':') })).filter(x => Math.abs(x.v) > 1) }]; } });
  def('ar', { t: 'an.k.ar', f: 'an.k.ar.f', src: 'an.src.acts', unit: 'money', money: true, type: 'stock', at: 'anchor', low: true, s: i => K.W.receivables(i, K.roles.custFilter).total, go: 'sales', match: [/^Дебиторка на /, /^Дебиторка$/, /^Receivables/],
    bd: (a, b, i) => { const r = K.W.receivables(i, K.roles.custFilter), ag = K.W.aging(i, K.roles.custFilter); return [
      { h: tc('by_region'), sum: true, rows: regs().map(x => ({ name: I.tx(x.r), v: K.W.receivables(i, c => K.roles.custFilter(c) && c.region === x.r).total, card: 'region:' + x.r })).filter(x => x.v) },
      { h: tc('by_age'), sum: true, rows: [['age.unbilled', r.unbilled], ['age.notDue', ag.notDue], ['age.d30', ag.d30], ['age.d60', ag.d60], ['age.d90', ag.d90], ['age.d90p', ag.d90p]].map(([k, v]) => ({ name: tc('' + k), v })) },
      { h: tc('top_customers'), sum: false, rows: [...r.byCust.values()].sort((x, y) => y.debt - x.debt).slice(0, 15).map(e => ({ name: I.w(e.cust.name), v: e.debt, card: 'customer:' + e.cust.id })) }]; }, sig: (v, i) => { const r = K.W.receivables(i, K.roles.custFilter); return r.total && r.overdue30 / r.total > 0.1 ? 'bad' : (r.overdue30 > 0 ? 'warn' : ''); } });
  def('shifts', { t: 'an.k.shifts', f: 'an.k.shifts.f', src: 'an.src.marks', unit: 'int', type: 'stock', at: 'anchor', s: i => { const d = dayViews(i); return d.reduce((s, v) => s + v.plan, 0) - d.filter(v => v.missed > 0).length; }, go: 'shifts', match: [/^Смены на /, /^Shifts (on|as of) /],
    bd: (a, b, i) => [byRegion(l => { const d = l.filter(o => K.W.active(o, i)).map(o => K.W.objView(o, i, i, i)); return d.reduce((s, v) => s + v.plan, 0) - d.filter(v => v.missed > 0).length; }, { kind: 'int' }), list0(tc('not_opened'), dayViews(i).filter(v => v.missed > 0).map(v => ({ name: I.w(v.o.name) + (v.o.missedPost ? ', ' + I.w('пост ' + v.o.missedPost) : ''), v: 1, card: 'object:' + v.o.id })))], sig: (v, i) => dayViews(i).some(x => x.missed > 0) ? 'bad' : '' });
  def('staff', { t: 'an.k.staff', f: 'an.k.staff.f', src: 'an.src.hr', unit: 'int', type: 'stock', at: 'anchor', s: i => K.W.hr(i).total, go: 'hr', match: [/^Сотрудники на /, /^Сотрудников$/, /^Численность на /, /^Employees/],
    bd: (a, b, i) => { const h = K.W.hr(i), os = K.W.objects.filter(o => K.W.active(o, i)), fte = os.reduce((s, o) => s + o.fte, 0) || 1; const rows = K.W.REGIONS.map(r => ({ name: I.tx(r.r), x: os.filter(o => o.region === r.r).reduce((s, o) => s + o.fte, 0) / fte * h.guards, card: 'region:' + r.r })); let rest = h.guards; rows.forEach(r => { r.v = Math.floor(r.x); rest -= r.v; }); rows.slice().sort((p, q) => (q.x % 1) - (p.x % 1)).slice(0, rest).forEach(r => r.v++);
      return [{ h: tc('staff_split'), sum: true, rows: [{ name: tc('guards'), v: h.guards }, { name: tc('admin'), v: h.admin }] }, { h: tc('guards_by_region'), sum: true, rows: rows.filter(r => r.v) }]; } });
  def('due', { t: 'an.k.due', f: 'an.k.due.f', src: 'an.src.due', unit: 'int', type: 'stock', at: 'anchor', low: true, s: i => K.data.dueParts(i).total, go: 'legal', match: [/^Сроки истекают$/],
    bd: (a, b, i) => { const dp = K.data.dueParts(i); return [{ h: tc('by_type'), sum: true, rows: [['due.cert', dp.cert], ['due.permit', dp.permit], ['due.contract', dp.contract], ['due.ins', dp.ins], ['due.insp', dp.insp]].map(([k, v]) => ({ name: tc('' + k), v })) }]; } });
  def('objects', { t: 'an.k.objects', f: 'an.k.objects.f', src: 'an.src.contracts', unit: 'int', type: 'stock', at: 'to', s: i => activeAt(i).length, go: 'objects', match: [/^Объектов на /, /^Sites (on|as of) /],
    bd: (a, b, i) => { const os = activeAt(i), fn = K.W.funnel(a, b, K.roles.objFilter); return [byRegion(l => l.filter(o => K.W.active(o, i)).length, { kind: 'int' }), { h: tc('by_mode'), sum: true, rows: [{ name: tc('mode24'), v: os.filter(o => o.is24).length }, { name: tc('modeday'), v: os.filter(o => !o.is24).length }] },
      list0(tc('launched', { n: fn.launched }), K.roles.filtered().filter(o => o.start >= a && o.start <= b).map(o => ({ name: I.w(o.name) + ' · ' + K.fmt.dt(o.start), v: o.posts, card: 'object:' + o.id }))),
      list0(tc('terminated', { n: fn.terminated }), K.roles.filtered().filter(o => o.terminated != null && o.terminated >= a && o.terminated <= b).map(o => ({ name: I.w(o.name) + ' · ' + K.fmt.dt(o.terminated), v: o.posts, card: 'object:' + o.id })))]; } });
  def('posts', { t: 'an.k.posts', f: 'an.k.posts.f', src: 'an.src.contracts', unit: 'int', type: 'stock', at: 'to', s: i => activeAt(i).reduce((s, o) => s + o.posts, 0), go: 'objects', match: [/^Постов$/, /^Posts$/],
    bd: (a, b, i) => [byRegion(l => l.filter(o => K.W.active(o, i)).reduce((s, o) => s + o.posts, 0), { kind: 'int' }), { h: tc('by_mode'), sum: true, rows: [{ name: tc('mode24'), v: activeAt(i).filter(o => o.is24).reduce((s, o) => s + o.posts, 0) }, { name: tc('modeday'), v: activeAt(i).filter(o => !o.is24).reduce((s, o) => s + o.posts, 0) }] }] });
  const lossV = (a, b) => K.data.lossObjects(a, b);   // одно определение ядра (К2)
  def('loss', { t: 'an.k.loss', f: 'an.k.loss.f', src: 'an.src.ledger', unit: 'int', money: true, type: 'flow', low: true, v: (a, b) => lossV(a, b).length, go: 'objects', match: [/^В убытке за период$/, /в убытке за период$/],
    bd: (a, b) => [list0(tc('loss_list'), lossV(a, b).map(v => ({ name: I.w(v.o.name) + ' · ' + K.fmt.P(v.margin) + (v.term ? ' · ' + I.tx('расторгнут') : ''), v: v.profit, kind: 'money', card: 'object:' + v.o.id })))], sig: v => v ? 'bad' : '' });
  def('shifts_plan', { t: 'an.k.shifts_plan', f: 'an.k.shifts_plan.f', src: 'an.src.marks', unit: 'int', type: 'flow', v: (a, b) => agg(a, b).plan, go: 'shifts', match: [/^Смен за период$/, /^Смен по плану$/], bd: (a, b) => [byRegion(l => agg(a, b, l).plan, { kind: 'int' })] });
  const onTime = (a, b, l) => { const x = agg(a, b, l); return x.plan ? 100 - (x.missed + x.late) / x.plan * 100 : 100; };
  def('ontime', { t: 'an.k.ontime', f: 'an.k.ontime.f', src: 'an.src.marks', unit: 'pct', type: 'flow', v: (a, b) => onTime(a, b), go: 'shifts', match: [/^Открыты вовремя$/, /^Смены открыты вовремя$/], bd: (a, b) => [byRegion(l => onTime(a, b, l), { sum: false, kind: 'pct' })] });
  def('missed', { t: 'an.k.missed', f: 'an.k.missed.f', src: 'an.src.marks', unit: 'int', type: 'stock', at: 'anchor', low: true, s: i => dayViews(i).filter(v => v.missed > 0).length, go: 'shifts', match: [/^Не открыто /, /^Не закрыто/, /^Смен не открыто$/], sig: v => v ? 'bad' : '',
    bd: (a, b, i) => [list0(tc('not_opened'), dayViews(i).filter(v => v.missed > 0).map(v => ({ name: I.w(v.o.name) + (v.o.missedPost ? ', ' + I.w('пост ' + v.o.missedPost) : ''), v: v.missed, card: 'object:' + v.o.id })))] });
  def('geo', { t: 'an.k.geo', f: 'an.k.geo.f', src: 'an.src.marks', unit: 'text', type: 'static', go: 'shifts', match: [/^Отметки без геометки$/] });
  const incTypes = (a, b) => { const m = {}; K.data.incIn(a, b).forEach(x => m[x.type] = (m[x.type] || 0) + 1); return Object.entries(m).sort((x, y) => y[1] - x[1]).map(([n, v]) => ({ name: I.tx(n), v })); };
  def('incidents', { t: 'an.k.incidents', f: 'an.k.incidents.f', src: 'an.src.journal', unit: 'int', type: 'flow', low: true, v: (a, b) => K.data.incIn(a, b).length, go: 'incidents', match: [/^Происшествий$/, /^Incidents$/],
    bd: (a, b) => [{ h: tc('by_type'), sum: true, rows: incTypes(a, b) }, byRegion(l => { const s = new Set(l); return K.data.incIn(a, b).filter(x => s.has(x.obj)).length; }, { kind: 'int' })] });
  def('complaints', { t: 'an.k.complaints', f: 'an.k.complaints.f', src: 'an.src.journal', unit: 'int', type: 'flow', low: true, v: (a, b) => K.data.incIn(a, b).filter(x => x.type === 'жалоба заказчика').length, go: 'incidents', match: [/^Жалоб заказчиков$/],
    bd: (a, b) => [list0(tc('top_objects'), (() => { const m = new Map(); K.data.incIn(a, b).filter(x => x.type === 'жалоба заказчика').forEach(x => m.set(x.obj, (m.get(x.obj) || 0) + 1)); return [...m].sort((x, y) => y[1] - x[1]).slice(0, 25).map(([o, v]) => ({ name: I.w(o.name), v, card: 'object:' + o.id })); })())] });
  def('react', { t: 'an.k.react', f: 'an.k.react.f', src: 'an.src.journal', unit: 'min', type: 'flow', low: true, v: (a, b) => { const x = K.data.incIn(a, b); return x.length ? x.reduce((s, y) => s + y.react, 0) / x.length : 0; }, go: 'incidents', match: [/^Среднее время реакции ГБР$/],
    bd: (a, b) => [byRegion(l => { const s = new Set(l), x = K.data.incIn(a, b).filter(y => s.has(y.obj)); return x.length ? x.reduce((q, y) => q + y.react, 0) / x.length : 0; }, { sum: false, kind: 'num' })] });
  def('checks', { t: 'an.k.checks', f: 'an.k.checks.f', src: 'an.src.journal', unit: 'int', type: 'flow', v: (a, b) => K.data.chkIn(a, b).length, go: 'incidents', match: [/^Проверок$/, /^Проверок объектов$/],
    bd: (a, b) => { const c = K.data.chkIn(a, b), g = k => { const m = {}; c.forEach(x => m[x[k]] = (m[x[k]] || 0) + 1); return Object.entries(m).sort((x, y) => y[1] - x[1]); }; return [{ h: tc('by_inspector'), sum: true, rows: g('who').map(([n, v]) => ({ name: I.tx(n), v })) }, { h: tc('by_score'), sum: true, rows: g('score').sort((x, y) => y[0] - x[0]).map(([n, v]) => ({ name: '★'.repeat(+n), v })) }]; } });
  def('presc', { t: 'an.k.presc', f: 'an.k.presc.f', src: 'an.src.journal', unit: 'int', type: 'stock', at: 'to', low: true, s: i => K.W.prescOpen(i).filter(c => K.roles.objFilter(c.obj)).length, go: 'incidents', match: [/^Предписаний не устранено/],
    bd: (a, b, i) => [list0(tc('open_presc'), K.W.prescOpen(i).filter(c => K.roles.objFilter(c.obj)).map(c => ({ name: I.w(c.obj.name) + ' · ' + I.tx(c.presc.what), v: c.presc.fixDay - i, kind: 'days', card: 'presc:' + K.W.checks.indexOf(c) })))] });
  def('hr_move', { t: 'an.k.hr_move', f: 'an.k.hr_move.f', src: 'an.src.hr', unit: 'text', type: 'flow', v: (a, b) => { const m = K.W.hrRange(a, b); return m.hires - m.fires; }, fmtv: (a, b) => { const m = K.W.hrRange(a, b); return `+${K.fmt.N(m.hires)} / −${K.fmt.N(m.fires)}`; }, go: 'hr', match: [/^Движение за период$/, /^Принято \/ уволено за период$/],
    bd: (a, b) => { const m = K.W.hrRange(a, b); return [{ h: tc('by_type'), sum: false, rows: [{ name: tc('hires'), v: m.hires }, { name: tc('fires'), v: m.fires }, { name: tc('net'), v: m.hires - m.fires }] }]; } });
  def('absent', { t: 'an.k.absent', f: 'an.k.absent.f', src: 'an.src.hr', unit: 'int', type: 'stock', at: 'to', low: true, s: i => { const h = K.W.hr(i); return h.vac + h.sick + h.absent; }, go: 'hr', match: [/^Отсутствуют /], bd: (a, b, i) => { const h = K.W.hr(i); return [{ h: tc('by_type'), sum: true, rows: [{ name: tc('vac'), v: h.vac }, { name: tc('sick'), v: h.sick }, { name: tc('absent'), v: h.absent }] }]; } });
  def('certs', { t: 'an.k.certs', f: 'an.k.certs.f', src: 'an.src.hr', unit: 'int', type: 'stock', at: 'to', low: true, s: i => K.W.hr(i).cert30, go: 'hr', match: [/^Истекает за 30 \/ 90 дней$/, /^Удостоверения/],
    bd: (a, b, i) => { const h = K.W.hr(i); return [{ h: tc('by_type'), sum: false, rows: [{ name: tc('cert30'), v: h.cert30 }, { name: tc('cert90'), v: h.cert90 }, { name: tc('medical'), v: h.medical }, { name: tc('training'), v: h.training }] }]; } });
  def('vacancies', { t: 'an.k.vacancies', f: 'an.k.vacancies.f', src: 'an.src.hr', unit: 'int', type: 'stock', at: 'to', low: true, s: i => K.W.hr(i).vacancies, go: 'hr', match: [/^Вакансии/] });
  const custsWith = i => new Set(activeAt(i).map(o => o.customer));
  def('contracts', { t: 'an.k.contracts', f: 'an.k.contracts.f', src: 'an.src.contracts', unit: 'int', type: 'stock', at: 'to', s: i => custsWith(i).size, go: 'legal', match: [/^Заказчиков с договором$/], bd: (a, b, i) => [byRegion(l => new Set(l.filter(o => K.W.active(o, i)).map(o => o.customer)).size, { kind: 'int' })] });
  def('expiring', { t: 'an.k.expiring', f: 'an.k.expiring.f', src: 'an.src.contracts', unit: 'int', type: 'stock', at: 'to', low: true, s: i => activeAt(i).filter(o => o.contractEnd >= i && o.contractEnd - i <= 60).length, go: 'legal', match: [/^Истекают за 60 дней$/, /^Договоры истекают/],
    bd: (a, b, i) => [list0(tc('expiring'), activeAt(i).filter(o => o.contractEnd >= i && o.contractEnd - i <= 60).sort((x, y) => x.contractEnd - y.contractEnd).map(o => ({ name: I.w(o.customer.name) + ' · ' + I.w(o.name), v: o.contractEnd - i, kind: 'days', card: 'object:' + o.id })))] });
  def('signed', { t: 'an.k.signed', f: 'an.k.signed.f', src: 'an.src.contracts', unit: 'int', type: 'flow', v: (a, b) => K.W.funnel(a, b, K.roles.objFilter).signed, go: 'sales', match: [/^Подписано за период$/, /^Договоров подписано$/, /^Новые договоры/],
    bd: (a, b) => [{ h: tc('by_channel'), sum: true, rows: K.W.CHANNELS.map(c => ({ name: I.tx(c), v: K.W.funnel(a, b, o => K.roles.objFilter(o) && o.customer.channel === c).signed, card: 'channel:' + c })).filter(x => x.v) }] });
  def('terminated', { t: 'an.k.terminated', f: 'an.k.terminated.f', src: 'an.src.contracts', unit: 'int', type: 'flow', low: true, v: (a, b) => K.W.funnel(a, b, K.roles.objFilter).terminated, go: 'legal', match: [/^Расторгнуто за период$/],
    bd: (a, b) => [list0(tc('terminated', { n: '' }), K.roles.filtered().filter(o => o.terminated != null && o.terminated >= a && o.terminated <= b).map(o => ({ name: I.w(o.name) + ' · ' + K.fmt.dt(o.terminated), v: o.posts, card: 'object:' + o.id })))] });
  def('funnel', { t: 'an.k.funnel', f: 'an.k.funnel.f', src: 'an.src.crm', unit: 'pct', type: 'flow', v: (a, b) => { const f = K.W.funnel(a, b, K.roles.objFilter); return f.requests ? f.signed / f.requests * 100 : 0; }, go: 'sales', match: [/^Воронка/],
    bd: (a, b) => { const f = K.W.funnel(a, b, K.roles.objFilter); return [{ h: tc('stages'), sum: false, rows: [['fn.requests', f.requests], ['fn.kp', f.kp], ['fn.neg', f.neg], ['fn.signed', f.signed], ['fn.launched', f.launched]].map(([k, v]) => ({ name: tc('' + k), v })) }]; } });
  def('rev_cust', { t: 'an.k.rev_cust', f: 'an.k.rev_cust.f', src: 'an.src.ledger', unit: 'money', money: true, type: 'flow', v: (a, b) => { const cs = K.W.customers.filter(c => c.objects.some(K.roles.objFilter)).filter(c => agg(a, b, c.objects.filter(K.roles.objFilter)).rev > 0); return cs.length ? agg(a, b).rev / cs.length : 0; }, go: 'sales', match: [/^Выручка на заказчика$/] });
  def('tax_acc', { t: 'an.k.tax_acc', f: 'an.k.tax_acc.f', src: 'an.src.tax', unit: 'money', money: true, type: 'flow', low: true, v: (a, b) => K.W.taxes(a, b).total, go: 'taxes', match: [/^Начислено за период$/, /^Налоги и взносы начислено$/],
    bd: (a, b) => { const x = K.W.taxes(a, b); return [{ h: tc('by_tax'), sum: true, rows: ['ipn', 'opv', 'vosms', 'so', 'oosms', 'opvr', 'sn', 'vat', 'cit'].map(k => ({ name: tc('tax.' + k), v: x[k], card: 'line:tax:' + k })) }]; } });
  def('tax_paid', { t: 'an.k.tax_paid', f: 'an.k.tax_paid.f', src: 'an.src.bank', unit: 'money', money: true, type: 'flow', v: (a, b) => K.W.taxes(a, b).paid, go: 'taxes', match: [/^Уплачено за период$/] });
  def('tax_due', { t: 'an.k.tax_due', f: 'an.k.tax_due.f', src: 'an.src.tax', unit: 'money', money: true, type: 'stock', at: 'to', noTitleDate: true, s: i => K.W.upcoming(i).tax, go: 'taxes', match: [/^К уплате /], bd: (a, b, i) => { const u = K.W.upcoming(i); return [{ h: tc('by_tax'), sum: true, rows: [{ name: tc('tax.payroll'), v: u.taxPay }, { name: tc('tax.vat'), v: u.taxVat }, { name: tc('tax.cit'), v: u.taxCit }, { name: tc('tax.divIpn'), v: u.taxDiv }] }]; } });
  def('tax_load', { t: 'an.k.tax_load', f: 'an.k.tax_load.f', src: 'an.src.tax', unit: 'pct', type: 'flow', v: (a, b) => { const x = K.W.taxes(a, b); return x.fotGross ? x.employerSum / x.fotGross * 100 : K.W.R(b).employer * 100; }, go: 'taxes', match: [/^Нагрузка на ФОТ$/] });
  def('stock_low', { t: 'an.k.stock_low', f: 'an.k.stock_low.f', src: 'an.src.stock', unit: 'int', type: 'static', low: true, s: () => K.CAT.stock.filter(x => x.stock < x.min).length, go: 'supply', match: [/^Ниже минимума/],
    bd: () => [list0(tc('below_min'), K.CAT.stock.map((x, k) => ({ x, k })).filter(({ x }) => x.stock < x.min).map(({ x, k }) => ({ name: I.tx(x.item), v: (1 - x.stock / x.min) * 100, kind: 'pct', card: 'stock:' + k })))] });
  def('issued', { t: 'an.k.issued', f: 'an.k.issued.f', src: 'an.src.stock', unit: 'int', type: 'flow', v: (a, b) => { const h = K.W.hr(b), hi = K.W.hrRange(a, b).hires; return K.CAT.stock.reduce((s, x) => s + Math.round(x.issued * hi / Math.max(1, h.total) * 1.2), 0); }, go: 'supply', match: [/^Выдано за период$/] });
  def('inventory', { t: 'an.k.inventory', f: 'an.k.inventory.f', src: 'an.src.ledger', unit: 'money', money: true, type: 'stock', at: 'to', s: i => bal(i).inv, go: 'supply', match: [/^Остатки склада$/, /^Запасы/] });
  def('ap', { t: 'an.k.ap', f: 'an.k.ap.f', src: 'an.src.ledger', unit: 'money', money: true, type: 'stock', at: 'to', low: true, s: i => bal(i).ap, go: 'supply', match: [/^Долг поставщикам$/] });
  const fl = i => K.W.fleetAt(K.CAT.fleet, i);
  def('fleet_to', { t: 'an.k.fleet_to', f: 'an.k.fleet_to.f', src: 'an.src.fleet', unit: 'int', type: 'stock', at: 'to', low: true, s: i => fl(i).filter(c => c.toLeft <= 1000).length, go: 'fleet', match: [/^ТО в ближайшие 1000 км$/, /^ТО в 1000 км$/], bd: (a, b, i) => [list0(tc('cars'), fl(i).map((c, k) => ({ c, k })).filter(({ c }) => c.toLeft <= 1000).map(({ c, k }) => ({ name: c.car, v: c.toLeft, kind: 'km', card: 'car:' + k })))] });
  def('fleet_ins', { t: 'an.k.fleet_ins', f: 'an.k.fleet_ins.f', src: 'an.src.fleet', unit: 'int', type: 'stock', at: 'to', low: true, s: i => fl(i).filter(c => c.insLeft <= 30).length, go: 'fleet', match: [/^Страховки ≤ 30 дн\.$/], bd: (a, b, i) => [list0(tc('cars'), fl(i).map((c, k) => ({ c, k })).filter(({ c }) => c.insLeft <= 30).map(({ c, k }) => ({ name: c.car, v: c.insLeft, kind: 'days', card: 'car:' + k })))] });
  def('fleet_cost', { t: 'an.k.fleet_cost', f: 'an.k.fleet_cost.f', src: 'an.src.ledger', unit: 'money', money: true, type: 'flow', low: true, v: (a, b) => K.W.fleetCost(K.CAT.fleet, a, b), go: 'fleet', sec: ['fleet'], match: [/^Расходы за период$/], bd: (a, b) => [{ h: tc('cars'), sum: true, rows: K.CAT.fleet.map((c, k) => ({ name: c.car, v: K.W.fleetCost([c], a, b), card: 'car:' + k })) }] });
  def('fleet_fuel', { t: 'an.k.fleet_fuel', f: 'an.k.fleet_fuel.f', src: 'an.src.fleet', unit: 'int', type: 'stock', at: 'to', low: true, s: i => fl(i).filter(c => c.fuelFact / c.fuelNorm > 1.1).length, go: 'fleet', match: [/^Перерасход ГСМ/], bd: (a, b, i) => [list0(tc('cars'), fl(i).map((c, k) => ({ c, k })).filter(({ c }) => c.fuelFact / c.fuelNorm > 1.1).map(({ c, k }) => ({ name: c.car, v: (c.fuelFact / c.fuelNorm - 1) * 100, kind: 'pct', card: 'car:' + k })))] });
  def('tasks_open', { t: 'an.k.tasks_open', f: 'an.k.tasks_open.f', src: 'an.src.tasks', unit: 'int', type: 'stock', at: 'anchor', s: i => K.W.tasksAt(i).length, go: 'tasks', match: [/^На контроле/], bd: (a, b, i) => { const m = {}; K.W.tasksAt(i).forEach(x => m[x.owner] = (m[x.owner] || 0) + 1); return [{ h: tc('by_owner'), sum: true, rows: Object.entries(m).sort((x, y) => y[1] - x[1]).map(([n, v]) => ({ name: K.fmt.rn(n), v })) }]; } });
  def('tasks_overdue', { t: 'an.k.tasks_overdue', f: 'an.k.tasks_overdue.f', src: 'an.src.tasks', unit: 'int', type: 'stock', at: 'anchor', low: true, s: i => K.W.tasksAt(i).filter(x => x.overdue).length, go: 'tasks', sec: ['tasks'], match: [/^Просрочено$/], bd: (a, b, i) => [list0(tc('overdue_list'), K.W.tasksAt(i).filter(x => x.overdue).map(x => ({ name: `${x.no} · ${I.w(x.title)}`, v: i - x.due, kind: 'days', card: 'task:' + x.no })))] });
  def('tasks_done', { t: 'an.k.tasks_done', f: 'an.k.tasks_done.f', src: 'an.src.tasks', unit: 'int', type: 'flow', v: (a, b) => K.W.tasksDone(a, b).length, go: 'tasks', match: [/^Выполнено за период$/] });
  def('tasks_created', { t: 'an.k.tasks_created', f: 'an.k.tasks_created.f', src: 'an.src.tasks', unit: 'int', type: 'flow', v: (a, b) => K.W.tasksCreated(a, b), go: 'tasks', match: [/^Создано за период$/] });
  def('orders', { t: 'an.k.orders', f: 'an.k.orders.f', src: 'an.src.docs', unit: 'int', type: 'flow', v: (a, b) => K.data.docflowAt(K.RNG.anchor).orders.filter(x => x.day >= a && x.day <= b).length, go: 'docflow', match: [/^Приказов за период$/] });
  def('memos', { t: 'an.k.memos', f: 'an.k.memos.f', src: 'an.src.docs', unit: 'int', type: 'flow', v: (a, b) => K.data.docflowAt(K.RNG.anchor).memos.filter(x => x.day >= a && x.day <= b).length, go: 'docflow', match: [/^Записок за период$/] });
  def('docs_ai', { t: 'an.k.docs_ai', f: 'an.k.docs_ai.f', src: 'an.src.docs', unit: 'int', type: 'flow', v: (a, b) => K.data.sumDocs(a, b), go: 'docs', match: [/^Документов подготовлено/], bd: (a, b) => [{ h: tc('by_type'), sum: true, rows: K.W.docs(a, b).map(d => ({ name: I.tx(d.type), v: d.n })).filter(x => x.v) }] });
  def('requests', { t: 'an.k.requests', f: 'an.k.requests.f', src: 'an.src.crm', unit: 'int', type: 'flow', v: (a, b) => K.W.funnel(a, b).requests, go: 'sales', match: [/^Новых запросов на охрану$/, /^Запросов на охрану$/] });
  def('inflow', { t: 'an.k.inflow', f: 'an.k.inflow.f', src: 'an.src.bank', unit: 'money', money: true, type: 'flow', v: (a, b) => K.W.cashflow(a, b).inCustomers, go: 'finance', match: [/^Поступления от заказчиков$/] });
  def('roe', { t: 'an.k.roe', f: 'an.k.roe.f', src: 'an.src.ledger', unit: 'pct', money: true, type: 'stock', at: 'anchor', s: i => { const b = bal(i), y = pl(Math.max(0, i - 364), i); return b.equity ? y.net / b.equity * 100 : 0; }, go: 'finance', match: [/^ROE/] });
  def('debt', { t: 'an.k.debt', f: 'an.k.debt.f', src: 'an.src.ledger', unit: 'num2', money: true, type: 'stock', at: 'anchor', s: i => (bal(i).leasing || 0) / Math.max(1, pl(Math.max(0, i - 364), i).ebitda), go: 'finance', match: [/^Долг \/ EBITDA$/] });
  def('errands', { t: 'an.k.errands', f: 'an.k.errands.f', src: 'an.src.ai', unit: 'int', type: 'stock', at: 'anchor', s: i => i < K.W.LAUNCH_DEMO ? 0 : K.data.errandsAt(i).length, go: 'ai', match: [/^Поручений за 7 дней$/] });
  def('exports', { t: 'an.k.exports', f: 'an.k.exports.f', src: 'an.src.onec', unit: 'int', type: 'stock', at: 'anchor', s: i => K.W.onec(i).exportsOk, go: 'onec', match: [/^Выгрузки в движок$/, /^Выгрузки \d/] });
  const openOrd = i => K.data.docflowAt(i).orders.filter(o => !o.done), openMemo = i => K.data.docflowAt(i).memos.filter(m => m.status !== 'закрыта');
  const byKey = (list, key, lab) => { const m = new Map(); list.forEach(x => { const k = key(x); m.set(k, (m.get(k) || 0) + 1); }); return [...m].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ name: lab ? lab(k) : I.tx(k), v })); };
  def('orders_open', { t: 'an.k.orders_open', f: 'an.k.orders_open.f', src: 'an.src.docs', unit: 'int', type: 'stock', at: 'anchor', s: i => openOrd(i).length, go: 'docflow', sec: ['docflow'], match: [/^В работе на /],
    bd: (a, b, i) => [{ h: tc('od.step'), sum: true, rows: byKey(openOrd(i), o => o.route[o.stage], k => k === 'ознакомление' ? I.tx(k) : K.fmt.rn(k)) }] });
  def('orders_overdue', { t: 'an.k.orders_overdue', f: 'an.k.orders_overdue.f', src: 'an.src.docs', unit: 'int', type: 'stock', at: 'anchor', low: true, s: i => openOrd(i).filter(o => o.overdue).length, go: 'docflow', match: [/^Просрочено согласование$/],
    bd: (a, b, i) => [list0(tc('od.route'), openOrd(i).filter(o => o.overdue).map(o => ({ name: `№ ${o.no} · ${I.tx(o.title)}`, v: i - o.due, kind: 'days', card: 'order:' + o.no })))] });
  def('ack', { t: 'an.k.ack', f: 'an.k.ack.f', src: 'an.src.docs', unit: 'int', type: 'stock', at: 'anchor', s: i => openOrd(i).filter(o => o.route[o.stage] === 'ознакомление').reduce((s, o) => s + o.people, 0), go: 'docflow', match: [/^Ознакомление$/] });
  def('memos_open', { t: 'an.k.memos_open', f: 'an.k.memos_open.f', src: 'an.src.docs', unit: 'int', type: 'stock', at: 'anchor', s: i => openMemo(i).length, go: 'docflow-memos', sec: ['docflow'], match: [/^Открыто на /], bd: (a, b, i) => [{ h: tc('status'), sum: true, rows: byKey(openMemo(i), m => m.status) }] });
  def('memos_overdue', { t: 'an.k.memos_overdue', f: 'an.k.memos_overdue.f', src: 'an.src.docs', unit: 'int', type: 'stock', at: 'anchor', low: true, s: i => openMemo(i).filter(m => m.overdue).length, go: 'docflow-memos', match: [/^Сверх срока$/],
    bd: (a, b, i) => [list0(tc('me.subj'), openMemo(i).filter(m => m.overdue).map(m => ({ name: `${m.no} · ${I.w(m.title)}`, v: i - m.sla, kind: 'days', card: 'memo:' + m.no })))] });
  const pays = i => [...(K.data.livePays() || []), ...(K.data.payReqs(i) || [])];
  def('pay_inwork', { t: 'an.k.pay_inwork', f: 'an.k.pay_inwork.f', src: 'an.src.bank', unit: 'int', money: true, type: 'stock', at: 'anchor', s: i => pays(i).filter(r => r.st !== 'оплачено').length, go: 'payments', match: [/^Заявок в работе на /], bd: (a, b, i) => [{ h: tc('status'), sum: true, rows: byKey(pays(i).filter(r => r.st !== 'оплачено'), r => r.st) }] });
  const pfPct = (ls, a, b, cost) => { const p = K.data.sumLines(ls, a, b, true), f = K.data.sumLines(ls, a, b, false); return p ? (cost ? -f / -p : f / p) * 100 : 0; };
  def('bdr_rev', { t: 'an.k.bdr_rev', f: 'an.k.bdr.f', src: 'an.src.ledger', unit: 'pct', money: true, type: 'flow', v: (a, b) => pfPct([K.data.LINES.bdr[0]], a, b), go: 'budget', match: [/^Выручка к плану$/] });
  def('bdr_cost', { t: 'an.k.bdr_cost', f: 'an.k.bdr.f', src: 'an.src.ledger', unit: 'pct', money: true, type: 'flow', low: true, v: (a, b) => pfPct(K.data.LINES.bdr.slice(1), a, b, true), go: 'budget', match: [/^Расходы к плану$/],
    bd: (a, b) => [{ h: tc('children'), sum: false, kind: 'pct', rows: K.data.LINES.bdr.slice(1).map(l => ({ name: I.tx(l[1]), v: (() => { const p = K.data.planOf(l[2], l[3], l[0], a, b), f = l[2](a, Math.min(b, K.RNG.to)); return p ? f / p * 100 : 0; })(), card: 'line:bdr:' + l[0] })) }] });
  def('bdr_ebitda', { t: 'an.k.bdr_ebitda', f: 'an.k.bdr.f', src: 'an.src.ledger', unit: 'pct', money: true, type: 'flow', v: (a, b) => pfPct(K.data.LINES.bdr, a, b), go: 'budget', match: [/^EBITDA к плану$/] });
  def('equity', { t: 'an.k.equity', f: 'an.k.equity.f', src: 'an.src.ledger', unit: 'money', money: true, type: 'stock', at: 'to', s: i => bal(i).equity, go: 'finance', match: [/^Собственный капитал$/],
    bd: (a, b, i) => { const x = bal(i); return [{ h: tc('line.bs'), sum: true, rows: [['bs.charter', x.charter], ['bs.reStart', x.reStart], ['bs.profitYear', x.profitYear], ['bs.dividendsYear', -x.dividendsYear]].map(([k, v]) => ({ name: tc('' + k), v, card: 'line:' + k.replace('.', ':') })) }]; } });
  def('liquidity', { t: 'an.k.liquidity', f: 'an.k.liquidity.f', src: 'an.src.ledger', unit: 'num2', money: true, type: 'stock', at: 'to', s: i => { const x = bal(i), st = x.current; return st ? (x.cash + x.ar) / st : 0; }, go: 'finance', match: [/^Текущая ликвидность$/] });
  def('ar_turn', { t: 'an.k.ar_turn', f: 'an.k.ar_turn.f', src: 'an.src.acts', unit: 'days', money: true, type: 'stock', at: 'to', low: true, s: i => { const x = bal(i), rv = K.data.revVat(Math.max(0, i - 364), i); return rv ? x.ar / (rv / 365) : 0; }, go: 'sales', match: [/^Оборачиваемость дебиторки$/] });
  def('div_cap', { t: 'an.k.div_cap', f: 'an.k.div_cap.f', src: 'an.src.bank', unit: 'money', money: true, type: 'stock', at: 'to', s: i => Math.max(0, K.data.divCap(i)), go: 'finance', match: [/^Дивидендная способность$/] });

  // показатель по названию плитки и разделу; ctx: { sec, period }
  function kpiFor(title, sec){
    const s = strip(title);
    let best = null;
    for (const d of Object.values(KPI_DEF)){
      if (!d.match || !d.match.some(re => re.test(s))) continue;
      if (d.sec && !d.sec.includes(sec)) continue;
      if (!best || (d.sec && !best.sec)) best = d;
    }
    return best;
  }
  // значение показателя за период / на дату; series — 12 месяцев по месяцам периода
  function kpiValue(d, a, b, at){
    if (d.type === 'flow') return d.v(a, b);
    if (d.type === 'stock') return d.s(d.at === 'anchor' ? at : b);
    if (d.s) return d.s(b);
    return null;
  }
  function kpiSeries(d, to){
    const ms = K.data.months12(to);
    if (d.type === 'flow') return ms.map(x => ({ l: x.label, v: d.v(x.from, x.to), partial: x.partial, rate: x.rate }));
    if (d.type === 'stock') return ms.map(x => ({ l: x.label, v: d.s(x.to), partial: x.partial }));
    return [];
  }
  function fmtKpi(d, v){
    const f = K.fmt;
    if (v == null || (typeof v === 'number' && !isFinite(v))) return '—';
    switch (d.unit){ case 'money': return f.MU(v); case 'pct': return f.P(v); case 'min': return f.F(v, 0) + ' ' + tc('min'); case 'days': return f.N(v) + ' ' + tc('days'); case 'num2': return f.F(v, 2); case 'num': return f.F(v, 1); default: return f.N(v); }
  }

  // ---------- заголовки столбцов и фильтры таблиц разделов ----------
  I.add('ru', {
    'an.pp': 'п.п.', 'an.t.by_status': 'По статусам', 'an.c.avg_mins': 'Среднее время, мин', 'an.c.object': 'Объект', 'an.c.customer': 'Заказчик', 'an.c.city': 'Город', 'an.c.mode': 'Режим', 'an.c.posts': 'Посты', 'an.c.tariff': 'Тариф поста', 'an.c.revenue': 'Выручка', 'an.c.margin': 'Маржа',
    'an.c.missed_pct': 'Не открыто смен, %', 'an.c.incidents': 'Происшествий', 'an.c.cust_ar': 'Дебиторка заказчика (с НДС)', 'an.c.overdue_days': 'Просрочка, дн.', 'an.c.be_diff': 'Тариф − безубыточность',
    'an.c.be_tip': 'Тариф поста в месяц − (охранники + прямые + накладные) ÷ посты ÷ месяцев периода; ниже нуля — пост не окупается.', 'an.c.contract_to': 'Договор до',
    'an.c.channel': 'Канал', 'an.c.customers': 'Заказчиков', 'an.c.cac': 'Стоимость привлечения за договор', 'an.c.profit_cust12': 'Прибыль на заказчика, 12 мес.', 'an.c.payback': 'Окупаемость привлечения, мес.',
    'an.c.region': 'Регион', 'an.c.objects': 'Объектов', 'an.c.rev_post': 'Выручка на пост в месяц', 'an.c.profit': 'Прибыль', 'an.c.ar': 'Дебиторка', 'an.c.ar30': 'Просрочка 30+', 'an.c.objects_posts': 'Объектов / постов',
    'an.c.pay_fact': 'Оплата факт / договор, дн.', 'an.c.pay_tip': 'Средний срок от акта до оплаты по актам за 12 месяцев до даты / срок оплаты по договору.', 'an.c.dso_tip': 'DSO = дебиторка ÷ выручка с НДС в день за период.',
    'an.c.indicator': 'Показатель', 'an.c.unit': 'Ед.', 'an.c.pcs': 'шт.', 'an.c.period': 'Период', 'an.c.prev': 'Прошлый период', 'an.c.yago': 'Год назад', 'an.c.per_post': 'На пост в месяц', 'an.c.per_staff': 'На сотрудника в месяц',
    'an.c.per_post_tip': 'Значение за период ÷ средние посты периода ÷ месяцев в периоде (дни ÷ 30,4).', 'an.c.per_staff_tip': 'Значение за период ÷ сотрудники на конец периода ÷ месяцев в периоде.',
    'an.c.item': 'Статья', 'an.c.share_rev': 'Доля в выручке', 'an.c.share_in': 'Доля от поступлений', 'an.c.week': 'Неделя', 'an.c.inflow': 'Поступления', 'an.c.salaries': 'Зарплата', 'an.c.taxes': 'Налоги', 'an.c.suppliers': 'Поставщики',
    'an.c.netflow': 'Чистый поток', 'an.c.cash_end': 'Остаток на конец', 'an.c.change': 'Изменение', 'an.c.change_pct': 'Изменение, %', 'an.c.share_bs': 'Доля', 'an.c.assets': 'Активы', 'an.c.liabs': 'Пассивы',
    'an.c.tax': 'Налог / отчисление', 'an.c.rate': 'Ставка', 'an.c.rate_tip': 'Ставки {y} года; каждый день периода считается по ставкам своего года.', 'an.c.base': 'База', 'an.c.amount': 'Сумма', 'an.c.payer': 'Плательщик',
    'an.c.plan': 'План', 'an.c.fact': 'Факт', 'an.c.fact_fc': 'Факт / прогноз', 'an.c.dev': 'Отклонение', 'an.c.exec': 'Исполнение', 'an.c.share_kind': 'Доля статьи', 'an.c.share_kind_tip': 'Доля факта статьи в сумме статей того же вида (доходы или расходы).',
    'an.c.month': 'Месяц', 'an.c.cum_plan': 'План нарастающим', 'an.c.cum_fact': 'Факт нарастающим',
    'an.c.post': 'Пост', 'an.c.ai_action': 'Действие ИИ', 'an.c.status': 'Статус', 'an.c.shifts_plan': 'Смен по плану', 'an.c.not_opened': 'Не открыто', 'an.c.late': 'Опоздания', 'an.c.on_time': 'В срок',
    'an.c.schedule': 'График', 'an.c.norm_hours': 'Норма часов/мес', 'an.c.cities': 'Города',
    'an.c.count': 'Количество', 'an.c.react': 'Реакция ГБР, мин', 'an.c.closed_pct': 'Закрыто, %', 'an.c.type': 'Тип', 'an.c.repeat': 'Повторяется на объекте', 'an.c.repeat_tip': 'Наибольшее число происшествий одного вида на объекте за 12 месяцев до даты.',
    'an.c.date': 'Дата', 'an.c.time': 'Время', 'an.c.result': 'Результат', 'an.c.violation': 'Нарушение', 'an.c.issued': 'Выдано', 'an.c.fix_due': 'Срок устранения', 'an.c.days_left': 'Осталось, дн.', 'an.c.inspector': 'Проверяющий', 'an.c.score': 'Оценка',
    'an.c.need': 'Потребность (FTE × 1,05)', 'an.c.staff': 'В штате', 'an.c.vacancies': 'Вакансии', 'an.c.away': 'Отсутствуют', 'an.c.cert30': 'Удостоверения ≤ 30 дн.', 'an.c.cert90': 'Удостоверения ≤ 90 дн.',
    'an.c.month_sum': 'Сумма в месяц (без НДС)', 'an.c.pay_days': 'Оплата, дн.', 'an.c.renewal': 'Продление',
    'an.c.item_stock': 'Позиция', 'an.c.stock': 'Остаток', 'an.c.min': 'Минимум', 'an.c.price': 'Цена', 'an.c.stock_cost': 'Стоимость остатка', 'an.c.cover': 'Покрытие, мес.', 'an.c.cover_tip': 'Остаток ÷ средняя выдача в месяц (выдано за год ÷ 12).', 'an.c.below_min': 'Ниже минимума',
    'an.c.supplier': 'Поставщик', 'an.c.category': 'Категория', 'an.c.orders': 'Заказов', 'an.c.rating': 'Рейтинг', 'an.c.debt_supplier': 'Долг поставщику',
    'an.c.car': 'Автомобиль', 'an.c.purpose': 'Назначение', 'an.c.year': 'Год', 'an.c.km_at': 'Пробег на дату, км', 'an.c.km_period': 'Пробег за период, км', 'an.c.to_left': 'До ТО, км', 'an.c.ins_to': 'Страховка до', 'an.c.insp_to': 'Техосмотр до',
    'an.c.fuel': 'ГСМ норма / факт', 'an.c.cost_period': 'Расходы за период', 'an.c.per_km': 'Расход на км', 'an.c.over_t': 'Перерасход ГСМ', 'an.c.over_tip': '(факт − норма) ÷ 100 × пробег за период × цена ГСМ года.', 'an.c.cost_norm': 'Норма расходов в месяц',
            'an.c.st_count': 'Документов', 'an.c.avg_step': 'Среднее время шага, дн.', 'an.c.overdue_pct': 'Просрочено, %', 'an.c.avg_age': 'Средний возраст, дн.',
    'an.c.yr': 'Год', 'an.c.yoy': 'Год к году', 'an.c.ebitda': 'EBITDA', 'an.c.dividends': 'Дивиденды', 'an.c.div_share': 'Дивиденды / чистая прибыль', 'an.c.net': 'Чистая прибыль',
            'an.f.loss': 'только в убытке', 'an.f.risk': 'только с риском', 'an.f.missed': 'только с неоткрытыми', 'an.f.repeat': 'повторяется 3+ раз', 'an.f.presc': 'с предписанием', 'an.f.expiring': 'истекают за 60 дней', 'an.f.open': 'только в работе', 'an.f.mine': 'ждут меня',
  });
  I.add('en', {
    'an.pp': 'pp', 'an.t.by_status': 'By status', 'an.c.avg_mins': 'Average time, min', 'an.c.object': 'Site', 'an.c.customer': 'Customer', 'an.c.city': 'City', 'an.c.mode': 'Mode', 'an.c.posts': 'Posts', 'an.c.tariff': 'Post tariff', 'an.c.revenue': 'Revenue', 'an.c.margin': 'Margin',
    'an.c.missed_pct': 'Shifts not opened, %', 'an.c.incidents': 'Incidents', 'an.c.cust_ar': 'Customer receivables (incl. VAT)', 'an.c.overdue_days': 'Overdue, days', 'an.c.be_diff': 'Tariff − break-even',
    'an.c.be_tip': 'Post tariff per month − (guards + direct + overheads) ÷ posts ÷ months in the period; below zero — the post does not pay off.', 'an.c.contract_to': 'Contract until',
    'an.c.channel': 'Channel', 'an.c.customers': 'Customers', 'an.c.cac': 'Acquisition cost per contract', 'an.c.profit_cust12': 'Profit per customer, 12 mo.', 'an.c.payback': 'Acquisition payback, mo.',
    'an.c.region': 'Region', 'an.c.objects': 'Sites', 'an.c.rev_post': 'Revenue per post per month', 'an.c.profit': 'Profit', 'an.c.ar': 'Receivables', 'an.c.ar30': 'Overdue 30+', 'an.c.objects_posts': 'Sites / posts',
    'an.c.pay_fact': 'Payment actual / contract, days', 'an.c.pay_tip': 'Average time from act to payment for acts in the 12 months to the date / contractual payment term.', 'an.c.dso_tip': 'DSO = receivables ÷ revenue incl. VAT per day in the period.',
    'an.c.indicator': 'Indicator', 'an.c.unit': 'Unit', 'an.c.pcs': 'pcs', 'an.c.period': 'Period', 'an.c.prev': 'Previous period', 'an.c.yago': 'A year ago', 'an.c.per_post': 'Per post per month', 'an.c.per_staff': 'Per employee per month',
    'an.c.per_post_tip': 'Value for the period ÷ average posts in the period ÷ months in the period (days ÷ 30.4).', 'an.c.per_staff_tip': 'Value for the period ÷ employees at the end of the period ÷ months in the period.',
    'an.c.item': 'Item', 'an.c.share_rev': 'Share of revenue', 'an.c.share_in': 'Share of receipts', 'an.c.week': 'Week', 'an.c.inflow': 'Receipts', 'an.c.salaries': 'Salaries', 'an.c.taxes': 'Taxes', 'an.c.suppliers': 'Suppliers',
    'an.c.netflow': 'Net flow', 'an.c.cash_end': 'Closing balance', 'an.c.change': 'Change', 'an.c.change_pct': 'Change, %', 'an.c.share_bs': 'Share', 'an.c.assets': 'Assets', 'an.c.liabs': 'Liabilities and equity',
    'an.c.tax': 'Tax / contribution', 'an.c.rate': 'Rate', 'an.c.rate_tip': 'Rates of {y}; each day of the period uses its own year’s rates.', 'an.c.base': 'Base', 'an.c.amount': 'Amount', 'an.c.payer': 'Payer',
    'an.c.plan': 'Plan', 'an.c.fact': 'Actual', 'an.c.fact_fc': 'Actual / forecast', 'an.c.dev': 'Deviation', 'an.c.exec': 'Execution', 'an.c.share_kind': 'Item share', 'an.c.share_kind_tip': 'Share of the item’s actual in the total of items of the same kind (income or expenses).',
    'an.c.month': 'Month', 'an.c.cum_plan': 'Cumulative plan', 'an.c.cum_fact': 'Cumulative actual',
    'an.c.post': 'Post', 'an.c.ai_action': 'AI action', 'an.c.status': 'Status', 'an.c.shifts_plan': 'Planned shifts', 'an.c.not_opened': 'Not opened', 'an.c.late': 'Late', 'an.c.on_time': 'On time',
    'an.c.schedule': 'Schedule', 'an.c.norm_hours': 'Hours norm/month', 'an.c.cities': 'Cities',
    'an.c.count': 'Count', 'an.c.react': 'Rapid response, min', 'an.c.closed_pct': 'Closed, %', 'an.c.type': 'Type', 'an.c.repeat': 'Recurs at the site', 'an.c.repeat_tip': 'The largest number of incidents of one type at the site in the 12 months to the date.',
    'an.c.date': 'Date', 'an.c.time': 'Time', 'an.c.result': 'Result', 'an.c.violation': 'Violation', 'an.c.issued': 'Issued', 'an.c.fix_due': 'Fix deadline', 'an.c.days_left': 'Days left', 'an.c.inspector': 'Inspector', 'an.c.score': 'Score',
    'an.c.need': 'Need (FTE × 1.05)', 'an.c.staff': 'On staff', 'an.c.vacancies': 'Vacancies', 'an.c.away': 'Absent', 'an.c.cert30': 'Licences ≤ 30 d', 'an.c.cert90': 'Licences ≤ 90 d',
    'an.c.month_sum': 'Monthly amount (excl. VAT)', 'an.c.pay_days': 'Payment, days', 'an.c.renewal': 'Renewal',
    'an.c.item_stock': 'Item', 'an.c.stock': 'Balance', 'an.c.min': 'Minimum', 'an.c.price': 'Price', 'an.c.stock_cost': 'Stock value', 'an.c.cover': 'Coverage, mo.', 'an.c.cover_tip': 'Balance ÷ average monthly issue (issued per year ÷ 12).', 'an.c.below_min': 'Below minimum',
    'an.c.supplier': 'Supplier', 'an.c.category': 'Category', 'an.c.orders': 'Orders', 'an.c.rating': 'Rating', 'an.c.debt_supplier': 'Owed to the supplier',
    'an.c.car': 'Vehicle', 'an.c.purpose': 'Purpose', 'an.c.year': 'Year', 'an.c.km_at': 'Mileage on the date, km', 'an.c.km_period': 'Mileage in the period, km', 'an.c.to_left': 'Until service, km', 'an.c.ins_to': 'Insurance until', 'an.c.insp_to': 'Inspection until',
    'an.c.fuel': 'Fuel norm / actual', 'an.c.cost_period': 'Costs for the period', 'an.c.per_km': 'Cost per km', 'an.c.over_t': 'Fuel overuse', 'an.c.over_tip': '(actual − norm) ÷ 100 × mileage in the period × the year’s fuel price.', 'an.c.cost_norm': 'Monthly cost norm',
            'an.c.st_count': 'Documents', 'an.c.avg_step': 'Average step time, days', 'an.c.overdue_pct': 'Overdue, %', 'an.c.avg_age': 'Average age, days',
    'an.c.yr': 'Year', 'an.c.yoy': 'Year on year', 'an.c.ebitda': 'EBITDA', 'an.c.dividends': 'Dividends', 'an.c.div_share': 'Dividends / net profit', 'an.c.net': 'Net profit',
            'an.f.loss': 'loss-making only', 'an.f.risk': 'at risk only', 'an.f.missed': 'with unopened shifts', 'an.f.repeat': 'recurring 3+ times', 'an.f.presc': 'with a corrective order', 'an.f.expiring': 'expiring within 60 days', 'an.f.open': 'in progress only', 'an.f.mine': 'waiting for me',
  });

  // ---------- словарь показателей (формулы словами) ----------
  I.add('ru', {
    'an.src.ledger': 'книга проводок мира (1С:Бухгалтерия) — начисления по дням', 'an.src.bank': 'банк и касса (1С), движение денег по дням', 'an.src.acts': 'акты заказчикам и оплаты по ним (1С)',
    'an.src.marks': 'отметки смен с телефонов охранников', 'an.src.hr': 'кадры: штат охранников (FTE постов × 1,05 − вакансии) и администрация', 'an.src.due': 'кадры, договоры, автопарк — сроки документов',
    'an.src.contracts': 'реестр договоров и объектов', 'an.src.journal': 'журнал происшествий и проверок объектов', 'an.src.crm': 'воронка продаж (запросы, КП, договоры)', 'an.src.tax': 'расчёт налогов по ставкам года (1С)',
    'an.src.stock': 'склад: остатки, нормы выдачи, минимумы', 'an.src.fleet': 'автопарк: пробег, ТО, страховки, ГСМ', 'an.src.tasks': 'задачи (Битрикс24 и SUNKAR BI)', 'an.src.docs': 'приказы и служебные записки',
    'an.src.ai': 'журнал поручений ИИ-помощника', 'an.src.onec': 'журнал выгрузок 1С и копий',
    'an.k.revenue': 'Выручка', 'an.k.revenue.f': 'Сумма актов за охрану без НДС за дни периода: посты по договору × тариф поста ÷ дней в месяце, по каждому дню; при фильтре — только объекты фильтра.',
    'an.k.revenue_co.f': 'Выручка компании по ОПиУ: оборот счёта реализации за дни периода (без НДС), по всем объектам.',
    'an.k.revenue_ytd': 'Выручка с начала года', 'an.k.revenue_ytd.f': 'Выручка по ОПиУ с 1 января по дату «Данные на».',
    'an.k.ebitda': 'EBITDA', 'an.k.ebitda.f': 'Выручка − себестоимость (ФОТ охраны с взносами, форма, транспорт, связь) − коммерческие − административные расходы (до амортизации, процентов и КПН); при фильтре — результат объектов после прямых и накладных по доле постов.',
    'an.k.ebitda_co.f': 'Выручка − ФОТ охранников, коммерческой службы и администрации с взносами − форма, транспорт, связь, тендеры, реклама, представительские, CRM, офис, ИТ и прочие; без амортизации, процентов и КПН.',
    'an.k.net': 'Чистая прибыль', 'an.k.net.f': 'EBITDA − амортизация − проценты по лизингу + финансовые доходы (проценты по остаткам на счетах) − КПН 20 % от прибыли до налога.', 'an.k.net_ytd': 'Чистая прибыль с начала года',
    'an.k.cash': 'Деньги', 'an.k.cash.f': 'Остаток на счетах и в кассе на конец дня: остаток на начало + поступления от заказчиков + проценты по остаткам − зарплата − налоги и взносы по зарплате − НДС за квартал − КПН − поставщики − ОС и лизинг − дивиденды и ИПН с них.',
    'an.k.ar': 'Дебиторка', 'an.k.ar.f': 'Неоплаченные акты заказчиков с НДС на дату + начислено без акта в текущем месяце; просрочка — дни после срока оплаты по договору.',
    'an.k.shifts': 'Смены на дату', 'an.k.shifts.f': 'Открытые смены ÷ смены по плану на дату: смена — по графику («сутки/трое» — 1 смена 24 ч в сутки на пост, вахта 15/15 — 2 по 12 ч, «2/2» — 1 по 12 ч, «5/2» — 1 по 8 ч по будням); смена открыта, если охранник отметился кодом и геометкой.',
    'an.k.staff': 'Сотрудники', 'an.k.staff.f': 'Охранники в штате (потребность — FTE постов × 1,05, минус вакансии; найм и увольнения по дням) + администрация по штатному расписанию, на дату.',
    'an.k.due': 'Сроки истекают', 'an.k.due.f': 'Удостоверения охранников и разрешения (30 дней) + договоры (60 дней) + страховки и техосмотры автомобилей (30 дней), на дату.',
    'an.k.objects': 'Объекты', 'an.k.objects.f': 'Объекты с действующим договором на дату: начало договора наступило, расторжения нет.',
    'an.k.posts': 'Посты', 'an.k.posts.f': 'Сумма постов по действующим договорам на дату; на пост по норме ТК РК и графику — сутки/трое и вахта 4,4 FTE (по графику — 4 человека), «2/2» 2,3 FTE, «5/2» 1,1 FTE.',
    'an.k.loss': 'Объекты в убытке', 'an.k.loss.f': 'Объекты с выручкой за период, у которых выручка − охранники с взносами − прямые − накладные по доле постов меньше нуля.',
    'an.k.shifts_plan': 'Смен за период', 'an.k.shifts_plan.f': 'Смен по плану за дни периода: посты × смен в сутки по графику («сутки/трое» — 1, вахта 15/15 — 2, «2/2» — 1, «5/2» — 1 по будням) за каждый день действия договора.',
    'an.k.ontime': 'Смены открыты вовремя', 'an.k.ontime.f': '100 % − (не открыто + опоздания) ÷ смен по плану за период.',
    'an.k.missed': 'Не открытые смены', 'an.k.missed.f': 'Посты, где на дату нет отметки охранника больше 15 минут после начала смены.',
    'an.k.geo': 'Отметки без геометки', 'an.k.geo.f': 'Отметки кодом без геометки — у охранников без согласия на геолокацию (решение Р10); контроль через звонок старшего смены.',
    'an.k.incidents': 'Происшествия', 'an.k.incidents.f': 'Записи журнала происшествий объектов за период: ложные срабатывания, пропускной режим, дисциплина, жалобы, проникновения, медицинские случаи, повреждения.',
    'an.k.complaints': 'Жалобы заказчиков', 'an.k.complaints.f': 'Происшествия вида «жалоба заказчика» за период.',
    'an.k.react': 'Время реакции ГБР', 'an.k.react.f': 'Среднее время от вызова до прибытия группы быстрого реагирования по происшествиям периода; норматив — 15 минут.',
    'an.k.checks': 'Проверки объектов', 'an.k.checks.f': 'Проверки руководством за период; оценка 1–5, при оценке 3 и ниже — предписание со сроком устранения.',
    'an.k.presc': 'Предписания не устранены', 'an.k.presc.f': 'Предписания проверок, выданные до даты, срок устранения которых ещё не наступил или нарушен.',
    'an.k.hr_move': 'Движение кадров', 'an.k.hr_move.f': 'Принято − уволено за период; текучесть охранников = уволено ÷ средняя численность охранников × 365 ÷ дней периода.',
    'an.k.absent': 'Отсутствуют', 'an.k.absent.f': 'Отпуск + больничный + не вышли на смену, на дату.',
    'an.k.certs': 'Удостоверения истекают', 'an.k.certs.f': 'Удостоверения охранника со сроком окончания в ближайшие 30 дней (за 90 дней — отдельно).',
    'an.k.vacancies': 'Вакансии', 'an.k.vacancies.f': 'Потребность (FTE постов × 1,05) − охранники в штате, на дату; «−» — сверх потребности.',
    'an.k.contracts': 'Заказчики с договором', 'an.k.contracts.f': 'Заказчики, у которых на дату есть хотя бы один действующий объект.',
    'an.k.expiring': 'Договоры истекают', 'an.k.expiring.f': 'Действующие договоры с датой окончания в ближайшие 60 дней; ≤ 7 дней — красный, ≤ 30 — жёлтый.',
    'an.k.signed': 'Договоры подписаны', 'an.k.signed.f': 'Договоры с датой подписания в периоде (за 30 дней до старта охраны).',
    'an.k.terminated': 'Договоры расторгнуты', 'an.k.terminated.f': 'Объекты с датой расторжения в периоде.',
    'an.k.funnel': 'Воронка: запрос → договор', 'an.k.funnel.f': 'Подписанные договоры ÷ запросы и тендеры за период.',
    'an.k.rev_cust': 'Выручка на заказчика', 'an.k.rev_cust.f': 'Выручка за период ÷ число заказчиков с выручкой в периоде.',
    'an.k.tax_acc': 'Налоги начислены', 'an.k.tax_acc.f': 'ИПН (с вычетом 14 МРП, с 2026 — 30 МРП), ОПВ, ВОСМС (удержания) + СО, ООСМС, ОПВР, СН (работодатель, по базам закона) + НДС к уплате + КПН + ИПН с дивидендов (по году нарастающим итогом), по ставкам каждого дня.',
    'an.k.tax_paid': 'Налоги уплачены', 'an.k.tax_paid.f': 'Перечислено в бюджет за период по ДДС: налоги по зарплате и аванс КПН — 25-го, НДС — за квартал 25-го второго месяца после квартала, доплата КПН — 10.04, ИПН с дивидендов — 25-го следующего месяца.',
    'an.k.tax_due': 'Налоги к уплате', 'an.k.tax_due.f': 'Подлежит уплате ближайшего 25-го: налоги по зарплате за прошлый месяц, аванс КПН месяца, НДС за квартал (во второй месяц после квартала), ИПН с дивидендов прошлого месяца.',
    'an.k.tax_load': 'Нагрузка на ФОТ', 'an.k.tax_load.f': 'Взносы работодателя (СО, ООСМС, ОПВР, СН) ÷ ФОТ за период; базы по закону: СО — от оклада − ОПВ, СН — от оклада − ОПВ − ВОСМС (до 2026 — минус СО).',
    'an.k.stock_low': 'Ниже минимума', 'an.k.stock_low.f': 'Позиции склада, где остаток меньше минимального запаса; степень = 1 − остаток ÷ минимум.',
    'an.k.issued': 'Выдано за период', 'an.k.issued.f': 'Выдача по норме новым сотрудникам: норма позиции × принято ÷ численность × 1,2 (замены).',
    'an.k.inventory': 'Остатки склада', 'an.k.inventory.f': 'Запасы по балансу на дату (счёт 1310).', 'an.k.ap': 'Долг поставщикам', 'an.k.ap.f': 'Кредиторская задолженность поставщикам по балансу на дату; оплата 15-го числа.',
    'an.k.fleet_to': 'ТО в 1000 км', 'an.k.fleet_to.f': 'Автомобили, у которых до планового ТО (каждые 10 000 км) осталось не больше 1 000 км.',
    'an.k.fleet_ins': 'Страховки ≤ 30 дней', 'an.k.fleet_ins.f': 'Автомобили со сроком страховки в ближайшие 30 дней.',
    'an.k.fleet_cost': 'Расходы автопарка', 'an.k.fleet_cost.f': 'Строка ОПиУ «Транспорт и ГСМ» за период, распределённая по машинам долей их нормы расходов.',
    'an.k.fleet_fuel': 'Перерасход ГСМ', 'an.k.fleet_fuel.f': 'Автомобили, у которых фактический расход топлива выше нормы больше чем на 10 %.',
    'an.k.tasks_open': 'Задачи на контроле', 'an.k.tasks_open.f': 'Задачи, созданные до даты и ещё не выполненные.', 'an.k.tasks_overdue': 'Задачи просрочены', 'an.k.tasks_overdue.f': 'Открытые задачи, срок которых раньше даты.',
    'an.k.tasks_done': 'Задачи выполнены', 'an.k.tasks_done.f': 'Задачи с датой выполнения в периоде; в срок — выполнены не позже срока.', 'an.k.tasks_created': 'Задачи созданы', 'an.k.tasks_created.f': 'Задачи с датой создания в периоде.',
    'an.k.orders': 'Приказы', 'an.k.orders.f': 'Приказы с датой в периоде: кадровые («-к») и по основной деятельности («-о»).', 'an.k.memos': 'Служебные записки', 'an.k.memos.f': 'Служебные записки с датой в периоде; резолюция → задача исполнителю.',
    'an.k.docs_ai': 'Документы подготовлены', 'an.k.docs_ai.f': 'Документы по шаблонам за период: приказы, акты проверок, графики и табели (первые дни месяца), отчёты, заявки.',
    'an.k.requests': 'Запросы на охрану', 'an.k.requests.f': 'Входящие запросы и тендеры за период (по компании).', 'an.k.inflow': 'Поступления от заказчиков', 'an.k.inflow.f': 'Оплаты актов заказчиками за период по банку (с НДС).',
    'an.k.roe': 'ROE за 12 месяцев', 'an.k.roe.f': 'Чистая прибыль за 12 месяцев до даты ÷ собственный капитал на дату.', 'an.k.debt': 'Долг / EBITDA', 'an.k.debt.f': 'Лизинг на дату (текущая и долгосрочная часть) ÷ EBITDA за 12 месяцев; кредитов нет.',
    'an.k.errands': 'Поручения ИИ за 7 дней', 'an.k.errands.f': 'Поручения ИИ-помощнику за 7 дней до даты: выполнено, в работе, ждёт подписи, отклонено по правам.',
    'an.k.orders_open': 'Приказы в работе', 'an.k.orders_open.f': 'Приказы, маршрут которых на дату не завершён: согласование, виза юриста, подпись ЭЦП, ознакомление.',
    'an.k.orders_overdue': 'Просрочено согласование', 'an.k.orders_overdue.f': 'Приказы в работе, у которых дата превысила срок маршрута (сумма сроков шагов + 1 день).',
    'an.k.ack': 'Ознакомление', 'an.k.ack.f': 'Сотрудники, которые должны ознакомиться с приказами на шаге «ознакомление» (отметка в телефоне).',
    'an.k.memos_open': 'Записки открыты', 'an.k.memos_open.f': 'Служебные записки без закрытия на дату: у адресата или «резолюция → задача».', 'an.k.memos_overdue': 'Записки сверх срока', 'an.k.memos_overdue.f': 'Открытые записки, срок ответа которых прошёл.',
    'an.k.pay_inwork': 'Заявки на оплату в работе', 'an.k.pay_inwork.f': 'Заявки на оплату, не дошедшие до шага «оплачено»: проверка бухгалтера, подписи директоров, платёжное поручение.',
    'an.k.bdr_rev': 'Выручка к плану', 'an.k.bdr_cost': 'Расходы к плану', 'an.k.bdr_ebitda': 'EBITDA к плану', 'an.k.bdr.f': 'Факт за дни периода ÷ план, утверждённый в начале года (факт месяца прошлого года × целевой рост, пропорционально дням).',
    'an.k.equity': 'Собственный капитал', 'an.k.equity.f': 'Уставный капитал + нераспределённая прибыль на начало года + прибыль с начала года − дивиденды с начала года = активы − обязательства.',
    'an.k.liquidity': 'Текущая ликвидность', 'an.k.liquidity.f': '(Деньги + дебиторка) ÷ краткосрочные обязательства (поставщики, зарплата, налоги, резерв отпусков, текущая часть лизинга); норма ≥ 1,2.',
    'an.k.ar_turn': 'Оборачиваемость дебиторки', 'an.k.ar_turn.f': 'Дебиторка на дату ÷ выручка с НДС (по ставке каждого дня) в день за 12 месяцев, в днях.',
    'an.k.div_cap': 'Дивидендная способность', 'an.k.div_cap.f': 'Минимум прогноза денег на 13 недель (с утверждёнными выплатами: зарплата, налоги, НДС за квартал, лизинг, дивиденды) − резерв 30 млн ₸, не меньше нуля.',
    'an.k.exports': 'Выгрузки 1С в движок', 'an.k.exports.f': 'Принятые выгрузки из 144 за сутки (каждые 10 минут); отклонённая — в отчётах последняя принятая версия.',
  });
  I.add('en', {
    'an.src.ledger': 'world ledger (1C Accounting) — daily accruals', 'an.src.bank': 'bank and cash desk (1C), daily cash movements', 'an.src.acts': 'customer acts and their payments (1C)',
    'an.src.marks': 'shift check-ins from guards’ phones', 'an.src.hr': 'HR: guards on staff (post FTE × 1.05 − vacancies) plus administration', 'an.src.due': 'HR, contracts, fleet — document deadlines',
    'an.src.contracts': 'register of contracts and sites', 'an.src.journal': 'site incident and inspection log', 'an.src.crm': 'sales funnel (requests, proposals, contracts)', 'an.src.tax': 'tax calculation at the year’s rates (1C)',
    'an.src.stock': 'warehouse: balances, issue norms, minimums', 'an.src.fleet': 'fleet: mileage, service, insurance, fuel', 'an.src.tasks': 'tasks (Bitrix24 and SUNKAR BI)', 'an.src.docs': 'orders and memos',
    'an.src.ai': 'AI assistant errand log', 'an.src.onec': '1C export and backup log',
    'an.k.revenue': 'Revenue', 'an.k.revenue.f': 'Sum of security service acts excluding VAT for the days of the period: contracted posts × post tariff ÷ days in month, day by day; with a filter — filtered sites only.',
    'an.k.revenue_co.f': 'Company revenue per the P&L: turnover of the sales account for the days of the period (excl. VAT), all sites.',
    'an.k.revenue_ytd': 'Revenue year to date', 'an.k.revenue_ytd.f': 'P&L revenue from 1 January to the “Data as of” date.',
    'an.k.ebitda': 'EBITDA', 'an.k.ebitda.f': 'Revenue − cost of services (guards’ payroll with contributions, uniforms, transport, communications) − selling − administrative expenses (before depreciation, interest and CIT); with a filter — site result after direct costs and overheads allocated by posts.',
    'an.k.ebitda_co.f': 'Revenue − guard, sales team and admin payroll with contributions − uniforms, transport, communications, tenders, advertising, entertainment, CRM, office, IT and other; before depreciation, interest and CIT.',
    'an.k.net': 'Net profit', 'an.k.net.f': 'EBITDA − depreciation − leasing interest + finance income (interest on account balances) − 20% CIT on profit before tax.', 'an.k.net_ytd': 'Net profit year to date',
    'an.k.cash': 'Cash', 'an.k.cash.f': 'End-of-day balance on accounts and in the cash desk: opening balance + customer receipts + interest on balances − salaries − payroll taxes and contributions − quarterly VAT − CIT − suppliers − fixed assets and leasing − dividends and the IIT on them.',
    'an.k.ar': 'Receivables', 'an.k.ar.f': 'Unpaid customer acts incl. VAT on the date + accrued but not yet billed this month; overdue — days past the contractual due date.',
    'an.k.shifts': 'Shifts on the date', 'an.k.shifts.f': 'Opened shifts ÷ planned shifts on the date: shifts follow the schedule (one-in-four — 1 shift of 24 h per post a day, 15/15 rotation — 2 of 12 h, 2/2 — 1 of 12 h, 5/2 — 1 of 8 h on weekdays); a shift is open when the guard checks in with a code and geotag.',
    'an.k.staff': 'Employees', 'an.k.staff.f': 'Guards on staff (need — post FTE × 1.05, less vacancies; hiring and dismissals by day) + administration per staffing table, on the date.',
    'an.k.due': 'Deadlines', 'an.k.due.f': 'Guard licences and permits (30 days) + contracts (60 days) + vehicle insurance and inspections (30 days), on the date.',
    'an.k.objects': 'Sites', 'an.k.objects.f': 'Sites with a valid contract on the date: contract started and not terminated.',
    'an.k.posts': 'Posts', 'an.k.posts.f': 'Sum of posts under valid contracts on the date; per the Labour Code norm and the schedule — one-in-four and rotation 4.4 FTE (4 people by schedule), 2/2 — 2.3 FTE, 5/2 — 1.1 FTE.',
    'an.k.loss': 'Loss-making sites', 'an.k.loss.f': 'Sites with revenue in the period where revenue − guards with contributions − direct costs − overheads by posts is below zero.',
    'an.k.shifts_plan': 'Shifts in the period', 'an.k.shifts_plan.f': 'Planned shifts for the days of the period: posts × shifts a day per schedule (one-in-four — 1, 15/15 rotation — 2, 2/2 — 1, 5/2 — 1 on weekdays) for each day of the contract.',
    'an.k.ontime': 'Shifts opened on time', 'an.k.ontime.f': '100% − (not opened + late) ÷ planned shifts in the period.',
    'an.k.missed': 'Shifts not opened', 'an.k.missed.f': 'Posts with no guard check-in more than 15 minutes after the shift started, on the date.',
    'an.k.geo': 'Check-ins without geotag', 'an.k.geo.f': 'Code check-ins without a geotag — guards who did not consent to geolocation (decision R10); verified by a call from the shift supervisor.',
    'an.k.incidents': 'Incidents', 'an.k.incidents.f': 'Site incident log entries for the period: false alarms, access control, discipline, complaints, intrusions, medical cases, damage.',
    'an.k.complaints': 'Customer complaints', 'an.k.complaints.f': 'Incidents of the “customer complaint” type in the period.',
    'an.k.react': 'Rapid response time', 'an.k.react.f': 'Average time from call to arrival of the rapid response team for incidents in the period; standard — 15 minutes.',
    'an.k.checks': 'Site inspections', 'an.k.checks.f': 'Inspections by management in the period; score 1–5, score 3 or lower — a corrective order with a deadline.',
    'an.k.presc': 'Open corrective orders', 'an.k.presc.f': 'Corrective orders issued before the date whose deadline has not yet passed or was missed.',
    'an.k.hr_move': 'Staff movement', 'an.k.hr_move.f': 'Hired − dismissed in the period; guard turnover = dismissed ÷ average number of guards × 365 ÷ days in the period.',
    'an.k.absent': 'Absent', 'an.k.absent.f': 'On leave + sick + did not show up for the shift, on the date.',
    'an.k.certs': 'Licences expiring', 'an.k.certs.f': 'Guard licences expiring within 30 days (90 days shown separately).',
    'an.k.vacancies': 'Vacancies', 'an.k.vacancies.f': 'Need (post FTE × 1.05) − guards on staff, on the date; “−” means above need.',
    'an.k.contracts': 'Customers under contract', 'an.k.contracts.f': 'Customers with at least one active site on the date.',
    'an.k.expiring': 'Contracts expiring', 'an.k.expiring.f': 'Active contracts ending within 60 days; ≤ 7 days — red, ≤ 30 — yellow.',
    'an.k.signed': 'Contracts signed', 'an.k.signed.f': 'Contracts signed in the period (30 days before security starts).',
    'an.k.terminated': 'Contracts terminated', 'an.k.terminated.f': 'Sites with a termination date in the period.',
    'an.k.funnel': 'Funnel: request → contract', 'an.k.funnel.f': 'Signed contracts ÷ requests and tenders in the period.',
    'an.k.rev_cust': 'Revenue per customer', 'an.k.rev_cust.f': 'Revenue for the period ÷ number of customers with revenue in the period.',
    'an.k.tax_acc': 'Taxes accrued', 'an.k.tax_acc.f': 'IIT (after the 14 MCI deduction, from 2026 — 30 MCI), pension and health contributions (withheld) + social contributions and social tax (employer, on statutory bases) + VAT payable + CIT + IIT on dividends (cumulative for the year), at each day’s rates.',
    'an.k.tax_paid': 'Taxes paid', 'an.k.tax_paid.f': 'Paid to the budget in the period per the cash flow: payroll taxes and the CIT advance on the 25th, VAT for the quarter on the 25th of the second month after it, the CIT top-up on 10 Apr, IIT on dividends on the 25th of the next month.',
    'an.k.tax_due': 'Taxes payable', 'an.k.tax_due.f': 'Payable on the next 25th: payroll taxes for the previous month, the month’s CIT advance, quarterly VAT (in the second month after the quarter), IIT on the previous month’s dividends.',
    'an.k.tax_load': 'Payroll tax burden', 'an.k.tax_load.f': 'Employer contributions (social contributions, health insurance, OPVR, social tax) ÷ payroll for the period; statutory bases: social contributions on salary − pension contribution, social tax on salary − pension − health contributions (until 2026 — less social contributions).',
    'an.k.stock_low': 'Below minimum', 'an.k.stock_low.f': 'Warehouse items with a balance below the minimum stock; degree = 1 − balance ÷ minimum.',
    'an.k.issued': 'Issued in the period', 'an.k.issued.f': 'Issued by norm to new employees: item norm × hired ÷ headcount × 1.2 (replacements).',
    'an.k.inventory': 'Warehouse stock', 'an.k.inventory.f': 'Inventory per the balance sheet on the date (account 1310).', 'an.k.ap': 'Owed to suppliers', 'an.k.ap.f': 'Accounts payable to suppliers per the balance sheet on the date; paid on the 15th.',
    'an.k.fleet_to': 'Service within 1,000 km', 'an.k.fleet_to.f': 'Vehicles with no more than 1,000 km left until scheduled service (every 10,000 km).',
    'an.k.fleet_ins': 'Insurance ≤ 30 days', 'an.k.fleet_ins.f': 'Vehicles whose insurance expires within 30 days.',
    'an.k.fleet_cost': 'Fleet costs', 'an.k.fleet_cost.f': 'P&L line “Transport and fuel” for the period allocated to vehicles by their cost norm.',
    'an.k.fleet_fuel': 'Fuel overuse', 'an.k.fleet_fuel.f': 'Vehicles whose actual fuel consumption exceeds the norm by more than 10%.',
    'an.k.tasks_open': 'Tasks under control', 'an.k.tasks_open.f': 'Tasks created before the date and not yet completed.', 'an.k.tasks_overdue': 'Overdue tasks', 'an.k.tasks_overdue.f': 'Open tasks whose deadline is before the date.',
    'an.k.tasks_done': 'Tasks completed', 'an.k.tasks_done.f': 'Tasks completed in the period; on time — completed no later than the deadline.', 'an.k.tasks_created': 'Tasks created', 'an.k.tasks_created.f': 'Tasks created in the period.',
    'an.k.orders': 'Orders', 'an.k.orders.f': 'Orders dated in the period: HR (“-P”) and operational (“-O”).', 'an.k.memos': 'Memos', 'an.k.memos.f': 'Memos dated in the period; resolution → task for the assignee.',
    'an.k.docs_ai': 'Documents prepared', 'an.k.docs_ai.f': 'Template documents for the period: orders, inspection reports, schedules and timesheets (first days of the month), reports, requests.',
    'an.k.requests': 'Security requests', 'an.k.requests.f': 'Incoming requests and tenders in the period (company-wide).', 'an.k.inflow': 'Customer receipts', 'an.k.inflow.f': 'Customer payments of acts in the period per the bank (incl. VAT).',
    'an.k.roe': 'ROE, 12 months', 'an.k.roe.f': 'Net profit for 12 months to the date ÷ equity on the date.', 'an.k.debt': 'Debt / EBITDA', 'an.k.debt.f': 'Leasing on the date (current and non-current part) ÷ EBITDA for 12 months; no bank loans.',
    'an.k.errands': 'AI errands, 7 days', 'an.k.errands.f': 'Errands to the AI assistant in the 7 days to the date: done, in progress, awaiting signature, denied by rights.',
    'an.k.orders_open': 'Orders in progress', 'an.k.orders_open.f': 'Orders whose route is not finished on the date: approval, lawyer’s visa, digital signature, acknowledgement.',
    'an.k.orders_overdue': 'Overdue approvals', 'an.k.orders_overdue.f': 'Orders in progress whose date exceeded the route deadline (sum of step deadlines + 1 day).',
    'an.k.ack': 'Acknowledgement', 'an.k.ack.f': 'Employees who must acknowledge orders at the “acknowledgement” step (confirmation on the phone).',
    'an.k.memos_open': 'Open memos', 'an.k.memos_open.f': 'Memos not closed on the date: with the addressee or “resolution → task”.', 'an.k.memos_overdue': 'Memos past deadline', 'an.k.memos_overdue.f': 'Open memos whose response deadline has passed.',
    'an.k.pay_inwork': 'Payment requests in progress', 'an.k.pay_inwork.f': 'Payment requests that have not reached “paid”: accountant check, director signatures, payment order.',
    'an.k.bdr_rev': 'Revenue vs plan', 'an.k.bdr_cost': 'Expenses vs plan', 'an.k.bdr_ebitda': 'EBITDA vs plan', 'an.k.bdr.f': 'Actual for the days of the period ÷ plan approved at the start of the year (same month last year × target growth, pro rata by days).',
    'an.k.equity': 'Equity', 'an.k.equity.f': 'Charter capital + retained earnings at the start of the year + profit year to date − dividends year to date = assets − liabilities.',
    'an.k.liquidity': 'Current ratio', 'an.k.liquidity.f': '(Cash + receivables) ÷ current liabilities (suppliers, salaries, taxes, vacation reserve, current part of leasing); norm ≥ 1.2.',
    'an.k.ar_turn': 'Receivables turnover', 'an.k.ar_turn.f': 'Receivables on the date ÷ revenue incl. VAT (at each day’s rate) per day for 12 months, in days.',
    'an.k.div_cap': 'Dividend capacity', 'an.k.div_cap.f': 'Minimum of the 13-week cash forecast (with approved payments: salaries, taxes, quarterly VAT, leasing, dividends) − ₸30 M reserve, not below zero.',
    'an.k.exports': '1C exports to the engine', 'an.k.exports.f': 'Accepted exports out of 144 a day (every 10 minutes); if one is rejected, reports use the last accepted version.',
  });

  // ---------- стили ----------
  const CSS_TEXT = `
.an-t{min-width:0}
.an-bar{display:flex;flex-wrap:wrap;align-items:center;gap:var(--s2);margin:0 0 var(--s2)}
.an-q{flex:1 1 200px;max-width:320px;display:flex}.an-q input{width:100%;min-height:32px;border:1px solid var(--line-2);border-radius:var(--r-sm);padding:0 var(--s2);background:var(--surface);color:var(--fg);font:inherit;font-size:var(--fs-3)}
.an-f{border:1px solid var(--line-2);background:var(--surface);color:var(--fg-2);border-radius:var(--r-pill);padding:var(--s1) var(--s3);font-size:var(--fs-2);font-weight:700;min-height:32px}
.an-f.on{background:var(--info-soft);color:var(--info-text);border-color:var(--info-fill)}
.an-cnt{font-size:var(--fs-2);color:var(--fg-3);font-variant-numeric:tabular-nums}
.an-bar .an-csv{margin-left:auto;min-height:32px;padding:0 var(--s3)}
.an-tbl th{text-transform:none;letter-spacing:0;font-size:var(--fs-2);font-weight:600;color:var(--fg-2)}
.an-tbl th.num{text-align:right}.an-tbl th[aria-sort]::after{content:none}
.an-sb{all:unset;cursor:pointer;display:inline;white-space:nowrap}.an-sb:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:var(--r-sm)}
.an-tbl th[aria-sort] .an-sb::after{content:" ↕";color:var(--fg-3)}.an-tbl th[aria-sort=ascending] .an-sb::after{content:" ↑";color:var(--fg)}.an-tbl th[aria-sort=descending] .an-sb::after{content:" ↓";color:var(--fg)}
.an-i{color:var(--fg-3);font-weight:400}
.an-tbl tfoot td{border-top:1px solid var(--line-2);border-bottom:0;white-space:nowrap}
.an-tbl tfoot td.num{text-align:right;font-variant-numeric:tabular-nums}
.an-tbl tr.rowlink:focus-visible{outline:2px solid var(--accent);outline-offset:0}
.an-tbl tr.an-bad td:first-child{box-shadow:inset 3px 0 0 var(--bad-fill)}.an-tbl tr.an-warn td:first-child{box-shadow:inset 3px 0 0 var(--warn-fill)}
.an-pg{display:flex;flex-wrap:wrap;align-items:center;gap:var(--s2);margin-top:var(--s2)}
.an-pg .btn-sec,.an-pg .btn-quiet{min-height:32px;font-size:var(--fs-2)}
.an-skel{display:grid;gap:var(--s2)}.an-skel i{display:block;height:18px;border-radius:var(--r-sm);background:var(--surface-3);animation:an-p 1.2s ease-in-out infinite}
@keyframes an-p{50%{opacity:.5}}
@media (prefers-reduced-motion:reduce){.an-skel i{animation:none}}
.vh{position:absolute!important;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
.an-chain{display:flex;flex-wrap:wrap;align-items:stretch;gap:var(--s2) var(--s1)}
.an-node{flex:1 1 150px;min-width:150px;max-width:260px;border:1px solid var(--line);border-radius:var(--r);padding:var(--s2) var(--s3);display:flex;flex-direction:column;gap:2px;background:var(--surface);box-shadow:inset 3px 0 0 var(--line-2)}
.an-node.good{box-shadow:inset 3px 0 0 var(--good-fill)}.an-node.warn{box-shadow:inset 3px 0 0 var(--warn-fill);background:var(--warn-soft)}.an-node.bad{box-shadow:inset 3px 0 0 var(--bad-fill);background:var(--bad-soft)}
.an-node.an-lnk{cursor:pointer}.an-node.an-lnk:hover{border-color:var(--accent)}.an-node:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.an-nl{font-size:var(--fs-2);font-weight:600;color:var(--fg-2)}.an-nv{font-size:var(--fs-5);font-weight:800;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.an-nd{font-size:var(--fs-2)}.an-ns{font-size:var(--fs-2);color:var(--fg-3);line-height:1.35}
.an-arr{align-self:center;color:var(--fg-3);font-style:normal;flex:0 0 auto}
@media (max-width:860px){.an-chain{flex-direction:column;overflow:visible}.an-node{max-width:none;min-width:0;flex:1 1 auto}.an-arr{transform:rotate(90deg);align-self:flex-start;margin-left:var(--s4)}.an-q{max-width:none}.an-bar .an-csv,.an-f,.an-q input,.an-pg .btn-sec,.an-pg .btn-quiet{min-height:44px}}
@media print{.an-bar,.an-pg{display:none!important}}
`;

  const M = {
    name: 'analytics', version: '0.8.0',
    ready: false,
    init(k){
      K = k; M.K = k;
      k.ui.css('analytics', CSS_TEXT);
      document.addEventListener('click', onClick);
      document.addEventListener('input', onInput);
      document.addEventListener('keydown', onKey, true);
      document.addEventListener('click', e => { const n = e.target.closest && e.target.closest('[data-an-go]'); if (n){ if (K.modal.isOpen) K.modal.close(true); location.hash = '#' + n.dataset.anGo; } });
      document.addEventListener('keydown', e => { if (e.key !== 'Enter') return; const n = e.target.closest && e.target.closest('[data-an-go]'); if (n && e.target === n){ if (K.modal.isOpen) K.modal.close(true); location.hash = '#' + n.dataset.anGo; } });
      // таблицы раздела живут до следующей отрисовки; таблицы карточек (keep) — пока не наберётся 200 последних
      k.hooks.beforeRender.push(() => { for (const [id, o] of REG) if (!o.keep) REG.delete(id); if (REG.size > 200) [...REG.keys()].slice(0, REG.size - 200).forEach(x => REG.delete(x)); });
      M.ready = true;
    },
    table2, fromRows, chain, chainHtml, KPI_DEF, kpiFor, kpiValue, kpiSeries, fmtKpi, objStats,
    csv: csvOf, exportCsv, csvName, download, get: id => REG.get(id), state: id => STATE.get(id), rows: id => { const o = REG.get(id); return o ? view(o) : []; },
    expand, fmtCell, totals, strip,
    // пары «заголовок столбца → значение» строки таблицы (карточка строки без своего вида)
    rowPairs(id, ix){ const o = REG.get(id); if (!o) return null; const r = o.rows[ix]; if (!r) return null; const T0 = totals(o, view(o)); return { o, r, pairs: expand(o).map(c => [strip(headOf(c)), cellHtml(o, c, r, T0)]).filter(p => p[0] && strip(p[1]) && strip(p[1]) !== '—') }; },
    deltaCols: (o) => expand(o).filter(c => c._type === 'prev' || c._type === 'yago'),
  };
  (window.SUNKAR_MODULES = window.SUNKAR_MODULES || []).push(M);
  window.Analytics = M;
})();
