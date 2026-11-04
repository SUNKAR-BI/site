// SUNKAR BI — ядро интерфейса (0.8): состояние, периоды, фильтры, роли и права, графики, разделы мира, маршрутизация, хуки модулей. Все цифры — из window.WORLD за выбранный период и на выбранную дату.
(function(){
  'use strict';
  let W = window.WORLD; const CAT = window.CATALOG; const I18N = window.I18N, t = I18N.t, tx = I18N.tx;
  const $ = (s, el=document) => el.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const neg = x => x.replace(/^-/, '−');
  const F = (v,d=1) => I18N.n(v, d);                       // числа и даты — по языку интерфейса (i18n.js)
  const nw = (x, w) => { const FORMS = { 'постов':['пост','поста','постов'], 'охранников':['охранник','охранника','охранников'], 'объектов':['объект','объекта','объектов'], 'заказчиков':['заказчик','заказчика','заказчиков'], 'запросов':['запрос','запроса','запросов'], 'договоров':['договор','договора','договоров'], 'проверок':['проверка','проверки','проверок'] }; const n = Math.abs(parseInt(String(x).replace(/<[^>]+>/g,'').replace(/[^\d]/g,''),10)||0), f = FORMS[w]; if (!f) return w; const a=n%100, b=n%10; return a>10&&a<20?f[2]:(b===1?f[0]:(b>=2&&b<=4?f[1]:f[2])); };
  const N = v => I18N.int(v);
  const P = v => I18N.pct(v);
  const plural = (n, one, few, many) => { const a=Math.abs(Math.round(n))%100, b=a%10; return a>10&&a<20?many:(b===1?one:(b>=2&&b<=4?few:many)); };
  const dt = i => I18N.date(i), dts = i => I18N.dateShort(i);
  const dLong = i => I18N.dateLong(i);
  // названия месяцев и дней — массивы ядра, заполняются по языку (при смене языка — заново, на месте)
  const MON = I18N.months('short'), MONF = I18N.months('long'), WD = I18N.weekdays();
  const refillNames = () => { MON.splice(0, 12, ...I18N.months('short')); MONF.splice(0, 12, ...I18N.months('long')); WD.splice(0, 7, ...I18N.weekdays()); };
  const rn = name => { const r = ROLES.find(x=>x.name===name); return r ? t('role.'+r.id) : name; };   // название роли на языке интерфейса

  // ---------- состояние (фильтры и даты) ----------
  const DEF = { asOf: W.FACT_END, period:'ytd', from: W.FACT_END-29, to: W.FACT_END, region:'all', type:'all', cur:'KZT' };
  let S = { ...DEF };
  try { const saved = JSON.parse(localStorage.getItem('sunkar-state-v5') || 'null'); if (saved) S = { ...DEF, ...saved }; } catch(e){}
  const clampDay = i => Math.max(0, Math.min(W.FACT_END, Math.round(+i || 0)));
  S.asOf = clampDay(S.asOf); S.from = clampDay(S.from); S.to = clampDay(S.to);
  if (S.from > S.to){ const t0 = S.from; S.from = S.to; S.to = t0; }
  if (!['day','yday','cweek','pweek','week','month','pmonth','quarter','ytd','pyear','12m','custom'].includes(S.period)) S.period = DEF.period;
  const save = () => { try { localStorage.setItem('sunkar-state-v5', JSON.stringify(S)); } catch(e){} };

  // быстрые срезы — календарные, отсчёт от даты «Данные на» (по умолчанию — сегодня); ниже — прочие периоды
  const QUICK = ['day','yday','cweek','pweek','month','pmonth','ytd','pyear'].map(k=>[k, t('per.'+k)]);
  const OTHER = ['week','quarter','12m','custom'].map(k=>[k, t('per.'+k)]);
  const PERIODS = [...QUICK, ...OTHER];
  const PNAME = Object.fromEntries(PERIODS);
  const relabelPeriods = () => { [...QUICK, ...OTHER].forEach(p=>{ p[1] = t('per.'+p[0]); PNAME[p[0]] = p[1]; }); };
  const monday = i => i - ((W.toDate(i).getUTCDay() + 6) % 7);
  // можно ли взять срез на эту дату (для прошлых срезов нужны данные до начала истории)
  function periodOk(p, a=S.asOf){
    if (p==='yday') return a >= 1;
    if (p==='pweek') return monday(a) - 7 >= 0;
    if (p==='pmonth') return !(W.yOf(a)===W.Y0 && W.mOf(a)===0);
    if (p==='pyear') return W.yOf(a) > W.Y0;
    return true;
  }
  function rangeOf(s=S){
    const a = s.period==='custom' ? clampDay(s.to) : s.asOf;          // дата отсчёта
    const ay = W.yOf(a), am = W.mOf(a);
    let from, t = a;
    if (s.period==='yday'){ t = from = Math.max(0, a-1); }
    else if (s.period==='day'){ from = a; }
    else if (s.period==='cweek'){ from = monday(a); }
    else if (s.period==='pweek'){ from = monday(a)-7; t = from+6; }
    else if (s.period==='week'){ from = a-6; }
    else if (s.period==='month'){ from = W.idxOf(ay,am,1); }
    else if (s.period==='pmonth'){ from = W.idxOf(ay,am-1,1); t = W.idxOf(ay,am,1)-1; }
    else if (s.period==='quarter'){ from = W.idxOf(ay, Math.floor(am/3)*3, 1); }
    else if (s.period==='ytd'){ from = W.idxOf(ay,0,1); }
    else if (s.period==='pyear'){ from = W.idxOf(ay-1,0,1); t = W.idxOf(ay-1,11,31); }
    else if (s.period==='12m'){ from = a-364; }
    else { from = Math.min(clampDay(s.from), a); }
    t = Math.max(0, t);
    const y = W.yOf(t), m = W.mOf(t), d = W.dOf(t);
    const today = a === W.FACT_END;
    const labels = { day: I18N.t(today ? 'per.day' : 'rl.day'), yday: I18N.t(today ? 'per.yday' : 'rl.yday'), cweek: I18N.t(today ? 'per.cweek' : 'rl.cweek'), pweek:I18N.t('per.pweek'), week:I18N.t('per.week'), month: I18N.t(today ? 'per.month' : 'rl.month'), pmonth:I18N.t('per.pmonth'), quarter:I18N.t('rl.quarter'), ytd: I18N.t(today ? 'per.ytd' : 'rl.ytd'), pyear:I18N.t('per.pyear'), '12m':I18N.t('rl.12m'), custom:I18N.t('per.custom') };
    let label = labels[s.period] || I18N.t('rl.period');
    if (from < 0 && s.period==='12m') label = I18N.t('rl.12m_from', { d: dt(0) });
    from = Math.max(0, Math.min(from, t));
    const len = t - from + 1;
    let prev;
    if (s.period==='month'){ const py = m===0 ? y-1 : y, pm = m===0 ? 11 : m-1; const pf = W.idxOf(py,pm,1), pdim = W.idxOf(py,pm+1,1)-pf; prev = { from: pf, to: pf + Math.min(d, pdim) - 1 }; }
    else if (s.period==='pmonth'){ prev = { from: W.idxOf(W.yOf(from), W.mOf(from)-1, 1), to: from-1 }; }
    else if (s.period==='quarter'){ const pq = W.idxOf(y, Math.floor(m/3)*3-3, 1); prev = { from: pq, to: pq + (t-from) }; }
    else if (s.period==='ytd'){ prev = { from: W.idxOf(y-1,0,1), to: Math.min(W.idxOf(y-1,m,d), W.idxOf(y-1,m+1,1)-1) }; }
    else if (s.period==='pyear'){ prev = { from: W.idxOf(y-1,0,1), to: W.idxOf(y-1,11,31) }; }
    else if (s.period==='cweek'){ prev = { from: from-7, to: t-7 }; }
    else prev = { from: from-len, to: from-1 };                       // день, 7 дней, 12 мес., свой — такой же отрезок перед
    const wk = ['cweek','pweek'].includes(s.period);                  // недели год назад — с понедельника (−364 дня)
    const ym = (yy, mm, dd) => Math.min(W.idxOf(yy, mm, dd), W.idxOf(yy, mm+1, 1) - 1);   // 29.02 → 28.02 в невисокосный год
    const yago = wk ? { from: from-364, to: t-364 } : { from: ym(W.yOf(from)-1, W.mOf(from), W.dOf(from)), to: ym(y-1, m, d) };
    const ok = r => r.from >= 0 ? r : null;
    if (s.period==='ytd' || s.period==='pyear') return { from, to:t, len, label, anchor:a, prev: null, yago: ok(prev) };
    return { from, to:t, len, label, anchor:a, prev: ok(prev), yago: ok(yago) };
  }

  // ---------- деньги и валюта ----------
  const CUR = { KZT:'₸', USD:'$', EUR:'€', RUB:'₽' };
  let RNG = rangeOf();
  const conv = v => v / W.fx(S.cur, RNG.to);
  const M = v => F(conv(v)/1e6, S.cur==='KZT' ? 1 : 2);                      // млн в выбранной валюте
  const MU = v => I18N.money(conv(v), CUR[S.cur], S.cur==='KZT' ? 1 : 2);   // RU «1,2 млн ₸», EN «₸1.2 M»
  const T = v => I18N.lang==='en' ? (conv(v) < 0 ? '−' : '') + CUR[S.cur] + N(Math.abs(conv(v))) : N(conv(v)) + ' ' + CUR[S.cur];
  const U = () => I18N.lang==='en' ? CUR[S.cur] + ' ' + t('unit.mln') : t('unit.mln') + ' ' + CUR[S.cur];

  // ---------- фильтры по объектам ----------
  // область видимости роли: начальник объекта, старший смены и охранник — свой объект; заместитель — свой регион; менеджер — свои заказчики
  const MYOBJ = 'Объект № 18', REGW = ['Атырауская','Мангистауская','Актюбинская'];
  const SC = () => { const r = S.role || 'Исполнительный директор'; if (['Начальник объекта','Старший смены','Охранник'].includes(r)) return { obj:MYOBJ }; if (r==='Заместитель начальника охраны') return { regions:REGW }; if (r==='Менеджер по продажам') return { mgr:true }; return {}; };
  const scopeOk = o => { const sc = SC(); if (sc.obj) return o.name===sc.obj; if (sc.regions) return sc.regions.includes(o.region); if (sc.mgr) return o.customer.id % 2 === 0; return true; };
  const objFilter = o => scopeOk(o) && (S.region==='all' || o.region===S.region) && (S.type==='all' || (S.type==='24' ? o.is24 : !o.is24));
  const custFilter = c => c.objects.some(scopeOk) && (S.region==='all' || c.region===S.region);
  const isScoped = () => Object.keys(SC()).length > 0;
  const filtered = () => W.objects.filter(objFilter);
  const filterLabel = () => { const sc = SC(); if (sc.obj) return t('flt.only', { o: I18N.w(sc.obj) }); const base = [S.region==='all'?(sc.regions?t('flt.region', { r: sc.regions.map(tx).join(', ') }):t('flt.all_regions')):tx(S.region), S.type==='all'?t('flt.all_objects'):(S.type==='24'?t('flt.obj24'):t('flt.objday'))]; if (sc.mgr) base.push(t('flt.own_cust')); return base.join(' · '); };
  const isFiltered = () => S.region!=='all' || S.type!=='all' || isScoped();

  // ---------- агрегаты ----------
  // кэш на один рендер (5.5): ключ — период и фильтр; явный список объектов не кэшируется
  const aggCache = new Map();
  const filterSig = () => `${S.role||''}|${S.region}|${S.type}`;
  function objAgg(from, to, list){
    if (!list){ const k = `${from}|${to}|${filterSig()}`; let v = aggCache.get(k); if (!v){ v = objAgg0(from, to, filtered()); aggCache.set(k, v); } return v; }
    return objAgg0(from, to, list);
  }
  function objAgg0(from, to, list){
    const a = { rev:0, guard:0, direct:0, overhead:0, profit:0, plan:0, missed:0, late:0, objects:0, posts:0, postDays:0 };
    for (const o of list){ const v = W.objView(o, from, to, to); a.postDays += o.posts * Math.max(0, Math.min(to, o.end-1, W.DAYS-1) - Math.max(from, o.start, 0) + 1); a.rev+=v.rev; a.guard+=v.guard; a.direct+=v.direct; a.overhead+=v.overhead; a.profit+=v.profit; a.plan+=v.plan; a.missed+=v.missed; a.late+=v.late; if (W.active(o,to)){ a.objects++; a.posts+=o.posts; } }
    a.margin = a.rev ? a.profit/a.rev*100 : 0;
    return a;
  }
  // «в убытке за период» — ОДНО определение для кокпита, раздела «Объекты», сигналов, карточек, сводок и ИИ (К2):
  // объекты фильтра, действовавшие хотя бы один день периода, с выручкой и отрицательной прибылью за дни действия;
  // расторгнутые в периоде остаются в списке с пометкой term (договор закончился до конца периода)
  const activeIn = (o, a, b) => o.start <= b && o.end > a;
  function lossObjects(a = RNG.from, b = RNG.to, list){
    const L = (list || filtered()).filter(o=>activeIn(o,a,b)).map(o=>W.objView(o,a,b,b)).filter(v=>v.rev>0 && v.profit<0);
    L.forEach(v=>{ v.term = !W.active(v.o,b); });
    return L.sort((x,y)=>x.margin-y.margin);
  }
  const lossTermN = L => L.filter(v=>v.term).length;
  const lossNote = L => { const n = lossTermN(L); return n ? `в т. ч. ${n} ${plural(n,'расторгнутый','расторгнутых','расторгнутых')}` : ''; };
  const lossItem = v => `${I18N.w(v.o.name)} ${P(v.margin)}${v.term ? ' · ' + tx('расторгнут') : ''}${v.o.story ? ' · ' + tx(v.o.story) : ''}`;
  // «Сроки истекают» — одно определение для плитки кокпита, карточки показателя и ИИ (М5): удостоверения и разрешения — 30 дней, договоры — 60, страховки и техосмотры автопарка — 30
  function dueParts(at, list){
    const hr = W.hr(at), fl = W.fleetAt(CAT.fleet, at), os = (list || filtered()).filter(o=>W.active(o,at) && o.contractEnd>=at && o.contractEnd-at<=60).sort((a,b)=>a.contractEnd-b.contractEnd);
    const ins = fl.filter(c=>c.insLeft<=30), insp = fl.filter(c=>c.inspLeft<=30);
    return { cert: hr.cert30, permit: hr.permits, contract: os.length, ins: ins.length, insp: insp.length, total: hr.cert30 + hr.permits + os.length + ins.length + insp.length, contracts: os, insCars: ins, inspCars: insp };
  }
  const revenueOf = (from,to) => isFiltered() ? objAgg(from,to).rev : W.pl(from,to).revenue;
  const ebitdaOf = (from,to) => isFiltered() ? objAgg(from,to).profit : W.pl(from,to).ebitda;
  const delta = (cur, base, lowerIsBetter) => {
    if (base==null || !isFinite(base) || Math.abs(base) < 1e-9) return '<span class="dl">нет базы</span>';
    const d = (cur/base - 1)*100, good = lowerIsBetter ? d <= 0 : d >= 0;
    if (Math.abs(d) < 0.05) return '<span class="dl">= 0,0 %</span>';
    return `<span class="${good?'up':'dn'}">${d>=0?'▲ +':'▼ −'}${F(Math.abs(d))} %</span>`;
  };
  const win = r => r ? (r.from===r.to ? dt(r.from) : `${dt(r.from)} – ${dt(r.to)}`) : '';
  const deltaLine = (fn, lowerIsBetter) => {
    const cur = fn(RNG.from, RNG.to), parts = [];
    if (RNG.prev) parts.push(`<span title="прошлый период: ${win(RNG.prev)}">${delta(cur, fn(RNG.prev.from, RNG.prev.to), lowerIsBetter)} к прошлому периоду</span>`);
    if (RNG.yago) parts.push(`<span title="год назад: ${win(RNG.yago)}">${delta(cur, fn(RNG.yago.from, RNG.yago.to), lowerIsBetter)} к году назад</span>`);
    const few = RNG.len < 7 && !['day','yday','week','cweek','pweek'].includes(S.period) ? ` <span class="few" title="в периоде ${RNG.len} ${plural(RNG.len,'день','дня','дней')} данных — сравнение по тем же дням, но база мала">мало данных: ${RNG.len} ${plural(RNG.len,'день','дня','дней')}</span>` : '';
    return (parts.join(' · ') || `<span class="dl">сравнение недоступно: данные с ${W.fmt(0)}</span>`) + few;
  };
  // темп: значение за прошедшие дни, пересчитанное на полный месяц (квартал, год)
  const runRate = v => { const p = S.period; if (!['month','quarter','ytd'].includes(p) || S.period==='custom') return ''; const t = RNG.to, y = W.yOf(t), m = W.mOf(t); const end = p==='month' ? W.idxOf(y,m+1,1)-1 : (p==='quarter' ? W.idxOf(y, Math.floor(m/3)*3+3, 1)-1 : W.idxOf(y,11,31)); if (end <= t) return ''; return `по темпу на ${p==='month'?'месяц':(p==='quarter'?'квартал':'год')}: <b>${MU(v/RNG.len*(end-RNG.from+1))}</b>`; };
  // 12 месяцев, заканчивая месяцем даты «по» (последний — по дату)
  function months12(to = RNG.to){
    const out = [], m = W.monthIdx(to);
    for (let k=11;k>=0;k--){ const mi = m-k; if (mi < 0) continue; const M0 = W.MONTHS[mi]; const t1 = Math.min(M0.end, to); out.push({ mi, from:M0.start, to: t1, label: MON[M0.m] + (M0.m===0 ? ' '+String(M0.y).slice(2) : ''), partial: M0.end > to, rate: M0.dim/(t1-M0.start+1) }); }
    return out;
  }
  const partNote = ms => { const l = ms[ms.length-1]; return l && l.partial ? ` · ${l.label} — темп месяца: факт по ${dt(l.to)} пересчитан на полный месяц (пунктир)` : ''; };
  const plabel = x => x.label + (x.partial ? ' (темп)' : '');
  function nextDay(i, dom){ let y=W.yOf(i), m=W.mOf(i); if (W.dOf(i) >= dom){ m++; if (m>11){ m=0; y++; } } return W.idxOf(y,m,dom); }
  const nextMonday = i => i + ((8 - W.toDate(i).getUTCDay()) % 7 || 7);

  // ---------- графики и разметка ----------
  const CATC = ['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--c7)'];   // категории: 7 различимых тонов из токенов (≥ 3:1 к фону в обеих темах)
  // ширина графика = ширина его карточки: первый проход — по ширине страницы, затем замер и точная перерисовка
  let chartWs = null, chartK = 0;
  const CW = () => { const k = chartK++; if (chartWs && chartWs[k]) return chartWs[k]; const c = document.getElementById('content'); const w = c && c.clientWidth ? c.clientWidth - 34 : 640; return Math.round(Math.max(300, Math.min(1400, w))); };
  const FS = w => 11;
  function niceTicks(mn, mx, n=3){ const span = (mx-mn) || Math.abs(mx) || 1, raw = span/n, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw/mag; const st = (f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*mag; const lo = Math.floor(mn/st+1e-9)*st, hi = Math.ceil(mx/st-1e-9)*st; const ts = []; for (let v=lo; v<=hi+st*1e-6; v+=st) ts.push(+v.toPrecision(12)); return { lo, hi: hi>lo?hi:lo+st, ts }; }
  function spark(vals,color,lo){ if (vals.length<2) return ''; const w=200,h=34,p=3;const mn=lo!=null?Math.min(lo,...vals):Math.min(...vals),mx=Math.max(...vals);const r=(mx-mn)||1; const pts=vals.map((v,i)=>[p+i*(w-2*p)/(vals.length-1),h-p-(v-mn)/r*(h-2*p)]); const d=pts.map((q,i)=>(i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)).join(' '); const l=pts[pts.length-1];
    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="${d} L${l[0]} ${h} L${pts[0][0]} ${h}Z" fill="${color}" opacity=".12"/><path d="${d}" fill="none" stroke="${color}" stroke-width="1.6"/><circle cx="${l[0]}" cy="${l[1]}" r="2.6" fill="${color}"/>${(()=>{ const iMn = vals.indexOf(Math.min(...vals)), iMx = vals.indexOf(mx); return [iMn, iMx].filter(i=>i!==vals.length-1).map(i=>`<circle cx="${pts[i][0]}" cy="${pts[i][1]}" r="1.8" fill="none" stroke="${color}" stroke-width="1.2"/>`).join(''); })()}</svg>`; }
  function bars(vals, labels, opts={}){
    const w=CW(), fs=FS(w), h=opts.h||160, p=opts.ticks?40:24, pt=18, pb=24, bw=(w-p-12)/Math.max(1,vals.length);
    const lo0=opts.ticks?Math.min(...opts.ticks.map(t=>t[0])):Math.min(0,...vals), hi0=opts.ticks?Math.max(...opts.ticks.map(t=>t[0])):Math.max(0,...vals);
    const mn=Math.min(lo0,...vals), mx=Math.max(hi0,...vals), r=(mx-mn)||1; const Y=v=>h-pb-(v-mn)/r*(h-pb-pt);
    let g='';
    (opts.ticks||[]).forEach(([v,l])=>{ g+=`<line x1="${p}" x2="${w-6}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-dasharray="2 3"/><text x="${p-4}" y="${Y(v)+3}" font-size="${fs}" text-anchor="end" fill="var(--muted)">${l}</text>`; });
    g+=`<line x1="${p}" x2="${w-6}" y1="${Y(Math.max(mn,0))}" y2="${Y(Math.max(mn,0))}" stroke="var(--line)"/>`;
    const every = Math.ceil(vals.length/Math.max(4, Math.floor(w/46)));
    vals.forEach((v,i)=>{ const x=p+i*bw+bw*0.15, base=Math.max(mn,0), y0=Y(base), y1=Y(v), hb=Math.max(1,Math.abs(y1-y0)); const col=opts.colors?opts.colors[i]:(v<0?'var(--bad)':(opts.color||'var(--c1)')); const hol = opts.hollow && opts.hollow[i];
      g+=`<rect x="${x}" y="${Math.min(y0,y1)}" width="${bw*0.7}" height="${hb}" rx="2" fill="${col}" ${hol?`fill-opacity=".22" stroke="${col}" stroke-dasharray="3 2"`:'opacity=".9"'} data-tip="${esc(labels[i]+': '+(opts.fmt?opts.fmt(v):v))}"><title>${labels[i]}: ${opts.fmt?opts.fmt(v):v}</title></rect>`;
      if (opts.values && vals.length<=14){ const t = opts.values(v), inside = v<0 && hb > fs+6; g+=`<text x="${x+bw*0.35}" y="${v>=0?y1-4:(inside?y1-5:y1+fs+1)}" font-size="${fs}" text-anchor="middle" fill="${inside?'var(--fg-inv)':'var(--muted)'}">${t}</text>`; }
      if (i%every===0) g+=`<text x="${x+bw*0.35}" y="${h-6}" font-size="${fs}" text-anchor="middle" fill="var(--muted)">${labels[i]}</text>`; });
    return `${opts.unit?`<div class="axl">${opts.unit}</div>`:''}<svg viewBox="0 0 ${w} ${h}" class="chart" role="img" aria-label="${esc(opts.label||'')}">${g}</svg>`;
  }
  function lines(series, labels, opts={}){
    const w=CW(), fs=FS(w), h=opts.h||170, pl=44, pr=14, pt=18, pb=26; const all=series.flatMap(s=>s.v).filter(isFinite);
    const nt = niceTicks(opts.min!=null?Math.min(opts.min,...all):Math.min(...all), Math.max(...all), h < 130 ? 2 : 3), mn = nt.lo, mx = nt.hi, r=(mx-mn)||1;
    const X=i=>pl+i*(w-pl-pr)/Math.max(1,labels.length-1), Y=v=>h-pb-(v-mn)/r*(h-pb-pt);
    let g=''; nt.ts.forEach(t=>{ const y=Y(t); g+=`<line x1="${pl}" x2="${w-pr}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-dasharray="2 3"/><text x="${pl-5}" y="${y+3}" font-size="${fs}" text-anchor="end" fill="var(--muted)">${opts.fmt?opts.fmt(t):Math.round(t)}</text>`; });
    const pLast = opts.partialLast && labels.length > 1;
    series.forEach(s=>{ const n = s.v.length, cut = pLast && !s.dash ? n-1 : n; const pts = s.v.map((v,i)=>X(i).toFixed(1)+' '+Y(v).toFixed(1));
      g+=`<path d="M${pts.slice(0,cut).join(' L')}" fill="none" stroke="${s.c}" stroke-width="2" ${s.dash?'stroke-dasharray="5 4"':''}/>`;
      if (cut < n) g+=`<path d="M${pts[n-2]} L${pts[n-1]}" fill="none" stroke="${s.c}" stroke-width="2" stroke-dasharray="3 3"/>`;
      if (s.dots!==false && labels.length<=31) s.v.forEach((v,i)=>{ const hol = cut < n && i === n-1; g+=`<circle cx="${X(i)}" cy="${Y(v)}" r="${hol?3.2:2.5}" fill="${hol?'var(--panel)':s.c}" ${hol?`stroke="${s.c}" stroke-width="1.6"`:''} data-tip="${esc(s.n+' · '+labels[i]+': '+(opts.fmt?opts.fmt(v):v))}"><title>${labels[i]}: ${opts.fmt?opts.fmt(v):v}</title></circle>`; }); });
    if (opts.lastLabel !== false) series.forEach(s=>{ if (s.dash || !s.v.length) return; const i = s.v.length-1, v = s.v[i]; if (!isFinite(v)) return; g+=`<text x="${X(i)-6}" y="${Y(v)-7}" font-size="${fs}" font-weight="700" text-anchor="end" fill="${s.c}">${opts.fmt?opts.fmt(v):Math.round(v)}</text>`; });
    const every = opts.every || Math.ceil(labels.length/Math.max(4, Math.floor(w/54)));
    labels.forEach((l,i)=>{ if (i%every===0) g+=`<text x="${X(i)}" y="${h-7}" font-size="${fs}" text-anchor="middle" fill="var(--muted)">${l}</text>`; });
    if (opts.marker!=null){ const mx0 = X(opts.marker); g = `<rect x="${mx0}" y="${pt-6}" width="${w-pr-mx0}" height="${h-pb-pt+6}" fill="var(--accent)" opacity=".07"/><line x1="${mx0}" x2="${mx0}" y1="${pt-8}" y2="${h-pb}" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="4 3"/><text x="${mx0+4}" y="${pt-8}" font-size="${fs}" fill="var(--accent-text)" font-weight="700">${opts.markerLabel||''}</text>` + g; }
    return `<div class="legend">${opts.unit?`<span class="axl">${opts.unit}</span>`:''}${series.map(s=>`<span><i style="${s.dash?`background:none;border-top:2px dashed ${s.c};height:0;vertical-align:3px`:`background:${s.c}`}"></i>${s.n}</span>`).join('')}</div><svg viewBox="0 0 ${w} ${h}" class="chart" role="img" aria-label="${esc(opts.label||'')}">${g}</svg>`;
  }
  function donut(parts, opts={}){
    const tot=parts.reduce((s,p)=>s+p.v,0)||1; let a=-Math.PI/2, g='';
    parts.forEach(p=>{ if (p.v<=0) return; const b=a+p.v/tot*2*Math.PI-0.0001; const l=b-a>Math.PI?1:0; g+=`<path d="M${60+50*Math.cos(a)} ${60+50*Math.sin(a)} A50 50 0 ${l} 1 ${60+50*Math.cos(b)} ${60+50*Math.sin(b)}" fill="none" stroke="${p.c}" stroke-width="16"/>`; a=b; });
    return `<div class="donut"><svg viewBox="0 0 120 120" role="img" aria-label="${esc(opts.label||'')}">${g}<text x="60" y="56" text-anchor="middle" font-size="11" fill="var(--muted)">${opts.title||''}</text><text x="60" y="74" text-anchor="middle" font-size="16" font-weight="800" fill="var(--fg)">${opts.center||''}</text></svg><div class="dl">${parts.map(p=>`<div><i style="background:${p.c}"></i>${p.n} <b>${opts.fmt?opts.fmt(p.v):N(p.v)}</b> · ${Math.round(p.v/tot*100)} %</div>`).join('')}</div></div>`;
  }
  function hbar(rows, opts={}){ const mx=Math.max(...rows.map(r=>Math.abs(r.v)))||1; return `<div class="hbars">${rows.map(r=>`<div><span class="n" title="${esc(r.n)}">${esc(r.n)}</span><span class="b"><i style="width:${Math.abs(r.v)/mx*100}%;background:${r.c||(r.v<0?'var(--bad)':'var(--c1)')}"></i></span><span class="v">${opts.fmt?opts.fmt(r.v):r.v}</span></div>`).join('')}</div>`; }
  // полоса плитки = состояние: красная/жёлтая — есть проблема; категорийные цвета не используются; ноль проблем — без полосы
  const stateStripe = (stripe, v) => { if (stripe!=='var(--bad)' && stripe!=='var(--warn)') return 'transparent'; const t = String(v).replace(/<[^>]+>/g,'').trim(); return /^0([\s ]*\/[\s ]*0)?$/.test(t) ? 'transparent' : stripe; };
  const vText = v => { const x = String(v).replace(/<[^>]+>/g,'').trim(); return x.length > 13 && !numRe.test(x) && !/^[\d\s  ,.\/+−-]+$/.test(x); };   // значение-текст («анализ / исполнение») переносится и набирается мельче
  // таблица по стандарту (analytics.table2) + подсказка-формула у заголовков из словаря показателей (9.2.9)
  const TIPK = { 'an.c.revenue':'an.k.revenue.f', 'an.c.ar':'an.k.ar.f', 'an.c.cust_ar':'an.k.ar.f', 'an.c.ar30':'an.k.ar.f', 'an.c.amount':'an.k.tax_acc.f', 'an.c.on_time':'an.k.ontime.f', 'an.c.react':'an.k.react.f', 'an.c.count':'an.k.incidents.f', 'an.c.incidents':'an.k.incidents.f', 'an.c.posts':'an.k.posts.f', 'an.c.not_opened':'an.k.missed.f', 'an.c.missed_pct':'an.k.missed.f', 'an.c.below_min':'an.k.stock_low.f', 'an.c.cost_period':'an.k.fleet_cost.f', 'an.c.stock':'an.k.inventory.f', 'an.c.vacancies':'an.k.vacancies.f', 'an.c.inflow':'an.k.inflow.f' };
  const T2 = o => { const A0 = mod('analytics'); if (!A0) return ''; const rev = {}; for (const k in TIPK) rev[t(k)] = TIPK[k]; (o.cols||[]).forEach(c=>{ if (!c.tip && rev[c.title]) c.tip = t(rev[c.title]); }); return A0.table2(o); };
  const nbsp = x => String(x).replace(/ (?=«)/g, '\u00a0');   // «ТОО «Заказчик-1»» не разрывается на две строки
  const tipOf = ls => ls.slice(1).map(x=>String(x).replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim()).filter(Boolean).join('\n');
  // card — плитка открывает карточку показателя («kpi:revenue»), переход в раздел — кнопкой «Открыть раздел» в карточке (В2)
  const tile = (t,v,d,stripe,sp,link,card) => `<div class="tile${link&&!card?' lnkt':''}" style="--stripe:${stateStripe(stripe,v)}" ${card?`data-card="${card}" tabindex="0" role="button"`:(link?`data-go="${link}" tabindex="0" role="link"`:'')}${(d||[]).filter(Boolean).length>1?` title="${esc(tipOf((d||[]).filter(Boolean)))}"`:''}><div class="t">${t}</div><div class="v${vText(v)?' vt':''}">${v}</div>${(d||[]).filter(Boolean).map(x=>`<div class="d">${x}</div>`).join('')}${sp?`<div class="sp">${sp}</div>`:''}</div>`;
  const numRe = /^[−\-+▲▼ ]*[₸$€₽]?[\d\s ,.]+( ?%| млн.*| тыс.*| [MKB]( .*)?| ₸| \$| €| ₽| дн\.?| км| мес\.| ч| мин| days?| km| mo\.| h| min)?$/;
  // lo — номера второстепенных колонок, которые на телефоне скрываются
  const table = (head, rows, cls='', lo=[]) => { const L = i => lo.includes(i) ? ' lo' : ''; return `<div class="tw"><table class="tbl ${cls}"><thead><tr>${head.map((h,i)=>`<th class="${L(i).trim()}">${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map((c,i)=>{ const cl = (i>0&&numRe.test(String(c).replace(/<[^>]+>/g,'').trim())?'num':'') + L(i); return `<td${cl.trim()?` class="${cl.trim()}"`:''}>${c}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`; };
  // карточка: заголовок слева, дата остатка или период потока — справа (9.2.2); пояснение — строкой под заголовком
  const DATE_RE = /\d{2}\.\d{2}|(19|20)\d{2}|\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/;
  const STATIC_RE = /^(Что |Пять лет|Правила|Источники|Как устроены|Три места|Электронные папки|Словарь|Маршруты|Новый|Новая|Права роли|Роли:|Решения владельца|Подключения|Порядок в работе|Мой день|Мои |Реестр решений|Согласование)/;
  let cardWhen = null;   // явная подпись даты для следующей карточки (when())
  const card = (title, body, small='', when) => {
    const tt = String(title), sm = String(small||''), long = sm.replace(/<[^>]+>/g,'').length > 64, plain = (tt + ' ' + (long ? '' : sm)).replace(/<[^>]+>/g,'');
    let meta = when != null ? when : (cardWhen != null ? cardWhen : null); cardWhen = null;
    if (meta == null) meta = DATE_RE.test(plain) || STATIC_RE.test(tt) ? '' : (/12 месяцев|по месяцам/.test(tt) ? m12Txt() : periodTxt());
    const right = [meta, !long ? sm : ''].filter(Boolean).join(' · ');
    return `<section class="card"><div class="chd"><h2>${title}</h2>${right?`<span class="cmeta">${right}</span>`:''}</div>${long?`<p class="csub">${sm}</p>`:''}${body}</section>`;
  };
  const m12Txt = (to = RNG.to) => { const ms = months12(to); return ms.length ? `${dt(ms[0].from)} – ${dt(ms[ms.length-1].to)}` : ''; };
  const periodTxt = () => RNG.from===RNG.to ? dt(RNG.to) : `${dt(RNG.from)} – ${dt(RNG.to)}`;
  const h1 = (tt, sub) => `<h1>${tx(tt)}</h1><div class="sub">${[filterLabel(), ...(sub ? String(sub).split(' · ') : [])].map(x=>`<span>${x}</span>`).join('')}</div>`;
  const note = t => `<p class="note">${t}</p>`;
  // пустое состояние: значок + текст (9.4)
  const empty = t => `<div class="empty"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M8 12h8"/></svg>${t}</div>`;
  const go = (id, text) => `<a href="#${id}">${text}</a>`;
  const incIn = (a,b) => W.incidents.filter(x=>x.day>=a && x.day<=b && objFilter(x.obj));
  const chkIn = (a,b) => W.checks.filter(x=>x.day>=a && x.day<=b && objFilter(x.obj));
  const sumDocs = (a,b) => W.docs(a,b).reduce((s,x)=>s+x.n,0);

  // значки статуса событий кокпита (16 px, контур; цвет — от пилюли)
  const EV_ICON = { 'срочно':'<path d="M12 3l10 18H2z"/><path d="M12 10v4M12 17v.5"/>', '1С':'<rect x="3" y="4" width="18" height="7" rx="1"/><rect x="3" y="13" width="18" height="7" rx="1"/>', 'срок':'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 'решение':'<path d="M5 12l4 4 10-10"/>', 'подпись':'<path d="M4 20h16M6 16l10-10 2 2-10 10H6z"/>', 'ЭЦП':'<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l2 2"/>', 'деньги':'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>', 'аналитика':'<path d="M4 19V5M4 19h16M8 15l3-4 3 2 5-6"/>', 'авто':'<path d="M3 13l2-5h14l2 5v5H3z"/><circle cx="7" cy="18" r="1.5"/><circle cx="17" cy="18" r="1.5"/>', 'проверка':'<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/><path d="M9 12l2 2 4-4"/>' };
  const evIcon = k => EV_ICON[k] ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${EV_ICON[k]}</svg>` : '';
  // ---------- КОКПИТ ----------
  function kokpit(tab){
    tab = tab || 'main';
    const to = RNG.to, from = RNG.from, list = filtered(), at = RNG.anchor;   // to — конец периода (обороты), at — дата «Данные на» (остатки и сигналы)
    const tabs = `<div class="tabs"><a href="#kokpit" class="${tab==='main'?'on':''}">Главное</a><a href="#kokpit-more" class="${tab==='more'?'on':''}">Подробно</a></div>`;
    if (tab==='more') return h1('Кокпит<span class="hm"> исполнительного директора</span>') + tabs + kpiTable();
    const agg = objAgg(from, to, list), b = W.balance(at), arx = W.receivables(at, custFilter), hr = W.hr(at);
    const planRev = isFiltered() ? planOf((x,z)=>objAgg(x,z,list).rev,'revenue',1,from,to) : planOf(LINES.bdr[0][2],'revenue',1,from,to);
    const rev = revenueOf(from,to), eb = ebitdaOf(from,to);
    const ytdFrom = W.idxOf(W.yOf(to),0,1), ebYtd = ebitdaOf(ytdFrom, to), netYtd = W.pl(ytdFrom,to).net;
    const day = W.objects.filter(o=>W.active(o,at) && objFilter(o)).map(o=>W.objView(o,at,at,at));
    const shiftsPlan = day.reduce((s,v)=>s+v.plan,0), missed = day.filter(v=>v.missed>0);
    const posts = day.reduce((s,v)=>s+v.o.posts,0), staffed = posts - missed.length;
    const cf30 = W.cashflow(Math.max(0,at-29), at), outDay = -(cf30.salaries+cf30.payrollTaxes+cf30.vat+cf30.cit+cf30.suppliers)/30;
    const ms = months12(to);
    const overdueCust = [...arx.byCust.values()].filter(e=>e.maxDays>30).sort((a,b)=>b.overdue-a.overdue);
    const presc = W.prescOpen(at).filter(c=>objFilter(c.obj));
    const fleet = W.fleetAt(CAT.fleet, at), insSoon = fleet.filter(c=>c.insLeft<=30), inspSoon = fleet.filter(c=>c.inspLeft<=30), toSoon = fleet.filter(c=>c.toLeft<=1000);
    const contractsSoon = list.filter(o=>W.active(o,at) && o.contractEnd>=at && o.contractEnd-at<=60).sort((a,b)=>a.contractEnd-b.contractEnd);
    const oc = W.onec(at);
    const loss = lossObjects(from, to, list);
    const events = [
      ...missed.map(v=>({s:'срочно',c:'',t:`Не закрыта смена: ${v.o.name}${v.o.missedPost?`, пост ${v.o.missedPost}`:''}`,d:`${v.o.kind} · ${v.o.city} · отметки нет больше 15 минут · замена подобрана из резерва`,a:'Задача начальнику охраны',go:'shifts'})),
      ...(!oc.effectorOk ? [{s:'1С',c:'',t:'Не выполнен ночной бэкап 1С:Бухгалтерии (Effector Saver)',d:`ошибка ${dts(at)} 03:00: для полной копии нужно 18 % диска, свободно 17 % · копия MS SQL есть · копии не удаляются — нужен перенос в архив по решению владельца`,a:'Решение по диску',go:'onec'}] : []),
      ...(oc.exportRejected ? [{s:'1С',c:'',t:'Движок не принял выгрузку 1С',d:`принято ${oc.exportsOk} из ${oc.exportsTotal} · в отчётах последняя принятая версия`,a:'Открыть 1С',go:'onec'}] : []),
      ...(contractsSoon.length ? [{s:'срок',c:'w',t:`${contractsSoon.length} ${plural(contractsSoon.length,'договор истекает','договора истекают','договоров истекают')} в ближайшие 60 дней`,d:contractsSoon.slice(0,4).map(o=>`${o.customer.name} (${o.name}) — до ${dt(o.contractEnd)}`).join(' · '),a:'Задача юристу',go:'legal'}] : []),
      ...(()=>{ const q = ownerQueue(at).filter(x=>x.st==='ждёт решения'); return q.length ? [{s:'решение',c:'i',t:`На утверждение у учредителя: ${q.length}`,d:q.map(x=>x.t).slice(0,3).join(' · '),a:'Открыть очередь',go:'owner'}] : []; })(),
      ...(()=>{ const o = docflowAt(at).orders.filter(x=>!x.done && x.route[x.stage]==='Генеральный директор'); return o.length ? [{s:'подпись',c:'i',t:`На подписи генерального директора: ${o.length} ${plural(o.length,'приказ','приказа','приказов')}`,d:o.slice(0,3).map(x=>`№ ${x.no} ${x.title.toLowerCase()}`).join(' · '),a:'Открыть приказы',go:'docflow'}] : []; })(),
      ...ECP.filter(k=>k.from<=at && k.to>=at && k.to-at<=30).slice(0,1).map(k=>({s:'ЭЦП',c:'w',t:`Ключ ЭЦП: ${k.who.toLowerCase()} — истекает ${dt(k.to)} (через ${k.to-at} ${plural(k.to-at,'день','дня','дней')})`,d:`${k.kind} · ${k.use} · перевыпуск онлайн через eGov, ключ сохраняет сам владелец`,a:'Задача администратору',go:'admin-conn'})),
      {s:'срок',c:'w',t:`${hr.cert30} ${plural(hr.cert30,'удостоверение охранника истекает','удостоверения охранника истекают','удостоверений охранника истекают')} в 30 дней`,d:`за 90 дней — ${hr.cert90} · направления на обучение готовит кадровик-ИИ`,a:'Задача кадровику',go:'hr'},
      ...(overdueCust.length ? [{s:'деньги',c:'w',t:`Просрочка 30+ дней: ${overdueCust.length} ${plural(overdueCust.length,'заказчик','заказчика','заказчиков')} · ${MU(arx.overdue30)}`,d:overdueCust.slice(0,3).map(e=>`${e.cust.name} — ${MU(e.overdue)}, ${e.maxDays} дн.`).join(' · '),a:'Письма-напоминания',go:'sales-ar'}] : []),
      ...(loss.length ? [{s:'аналитика',c:'w',t:`${loss.length} ${plural(loss.length,'объект','объекта','объектов')} в убытке за период`,d:[lossNote(loss), ...loss.slice(0,5).map(lossItem)].filter(Boolean).join(' · '),a:'Задача коммерческому директору',go:'objects'}] : []),
      ...(toSoon.length||insSoon.length ? [{s:'авто',c:'w',t:`Автопарк: ТО в 1000 км — ${toSoon.length}, страховки в 30 дней — ${insSoon.length}`,d:[...toSoon.map(c=>`${c.car}: ТО через ${N(c.toLeft)} км`),...insSoon.map(c=>`${c.car}: страховка до ${dt(c.insDay)}`)].slice(0,3).join(' · '),a:'Задача механику',go:'fleet'}] : []),
      ...(presc.length ? [{s:'проверка',c:'i',t:`${presc.length} ${plural(presc.length,'предписание не устранено','предписания не устранены','предписаний не устранены')}`,d:presc.slice(0,3).map(c=>`${c.obj.name}: ${c.presc.what} (с ${dts(c.day)})`).join(' · '),a:'Напомнить',go:'incidents'}] : []),
    ];
    const mv = W.hrRange(from,to);
    const fc13 = W.forecast13(at), fcMin = fc13.reduce((m,w)=>w.cash<m.cash?w:m, fc13[0]), cashDays = b.cash/Math.max(1,outDay), up = W.upcoming(at);
    const ebM = rev ? eb/rev*100 : 0, ovShare = arx.total ? arx.overdue30/arx.total : 0;
    const st = { eb: eb < 0 ? 'var(--bad)' : (ebM < 8 ? 'var(--warn)' : ''), cash: fcMin.cash < 0 ? 'var(--bad)' : (cashDays < 30 ? 'var(--warn)' : ''), ar: ovShare > 0.10 ? 'var(--bad)' : (arx.overdue30 > 0 ? 'var(--warn)' : ''), sh: missed.length ? 'var(--bad)' : '' };
    const dp = dueParts(at, list), due = dp.total;
    const tiles = `<div class="tiles k8">
      <div class="tile dark hero" data-card="kpi:revenue" tabindex="0" role="button" title="${agg.objects} ${plural(agg.objects,'объект','объекта','объектов')} · ${agg.posts} ${nw(agg.posts,'постов')} · ${MU(rev/RNG.len)} в день"><div class="t">Выручка</div><div class="v">${MU(rev)}</div><div class="d">${deltaLine(revenueOf)}</div>
        <div class="d"><b>${P(planRev ? rev/planRev*100 : 0)}</b> плана (${MU(planRev)})${runRate(rev)?' · '+runRate(rev):''}</div><div class="sp">${spark(ms.map(x=>revenueOf(x.from,x.to)/(x.to-x.from+1)),'var(--spark-rev)')}</div></div>
      ${tile('Операционный результат (EBITDA)', MU(eb), [deltaLine(ebitdaOf), `маржа <b>${P(ebM)}</b> · с начала года <b>${MU(ebYtd)}</b>${isFiltered()?' · по объектам фильтра':''}`], st.eb, spark(ms.map(x=>ebitdaOf(x.from,x.to)/(x.to-x.from+1)), st.eb||'var(--info)'), 'finance', 'kpi:ebitda')}
      ${tile(`Деньги на ${dt(at)}`, MU(b.cash), [`${outDay > 1e5 ? `хватит на <b>${N(cashDays)} дн.</b> выплат` : 'выплат ещё не было'} · минимум за 13 недель <b>${MU(fcMin.cash)}</b> (неделя с ${dts(fcMin.from)})`, `зарплата ${dts(up.salDay)} — <b>${MU(up.sal)}</b> · налоги ${dts(up.taxDay)} — <b>${MU(up.tax)}</b>`], st.cash, spark(ms.map(x=>W.balance(x.to).cash), st.cash||'var(--info)'), 'finance', 'kpi:cash')}
      ${tile(`Дебиторка на ${dt(at)}`, MU(arx.total), [`просрочено 30+ дней <b>${MU(arx.overdue30)}</b> · ${overdueCust.length} ${plural(overdueCust.length,'заказчик','заказчика','заказчиков')}`, `к ${dts(Math.max(0,at-7))}: ${delta(arx.total, W.receivables(Math.max(0,at-7),custFilter).total, true)} · без акта ${MU(arx.unbilled)}`], st.ar, spark(ms.map(x=>W.receivables(x.to,custFilter).total), st.ar||'var(--info)'), 'sales-ar', 'kpi:ar')}
      ${tile(`Смены на ${dt(at)}`, `${N(shiftsPlan - missed.length)} <span class="sm">/ ${N(shiftsPlan)}</span>`, [missed.length?`<span class="dn">▼ ${missed.length} ${plural(missed.length,'смена не открыта','смены не открыты','смен не открыто')}</span> · ${missed.map(v=>v.o.name).join(', ')}`:'<span class="up">все смены открыты</span>', `посты закрыты на <b>${P(posts?staffed/posts*100:100)}</b> · за период не открыто ${P(agg.plan?agg.missed/agg.plan*100:0)} смен`], st.sh, spark(ms.map(x=>{ const a=objAgg(x.from,x.to,list); return a.plan?100-a.missed/a.plan*100:100; }), st.sh||'var(--info)', 95), 'shifts', 'kpi:shifts')}
      ${tile(`Сотрудники на ${dt(at)}`, N(hr.total), [`<b>${N(hr.guards)}</b> ${nw(hr.guards,'охранников')} · <b>${hr.admin}</b> администрация`, `за период <span class="up">+${N(mv.hires)}</span> / <span class="dn">−${N(mv.fires)}</span> · сегодня нет ${hr.vac+hr.sick+hr.absent} (отпуск ${hr.vac}, больничный ${hr.sick}, не вышли ${hr.absent})`], '', spark(ms.map(x=>W.hr(x.to).total),'var(--info)'), 'hr', 'kpi:staff')}
      ${tile('Сроки истекают', N(due), [`удостоверения <b>${N(dp.cert)}</b> · разрешения <b>${N(dp.permit)}</b> · договоры <b>${N(dp.contract)}</b> · страховки авто <b>${N(dp.ins)}</b> · техосмотры <b>${N(dp.insp)}</b>`, `в 30 дней, договоры — в 60 дней · сумма = ${N(due)}`], due ? 'var(--warn)' : '', null, 'legal', 'kpi:due').replace('class="tile','class="tile d3')}
    </div>`;
    const wk = { a: Math.max(0,to-6), b: to, pa: Math.max(0,to-13), pb: Math.max(0,to-7) };
    const wkAgg = objAgg(wk.a, wk.b, list), wkPrev = objAgg(wk.pa, wk.pb, list);
    const incW = incIn(wk.a,wk.b), incP = incIn(wk.pa,wk.pb), chW = chkIn(wk.a,wk.b), chP = chkIn(wk.pa,wk.pb);
    const fnW = W.funnel(wk.a, wk.b, objFilter), fnP = W.funnel(wk.pa, wk.pb, objFilter), cfW = W.cashflow(wk.a,wk.b), cfP = W.cashflow(wk.pa,wk.pb);
    const cmp = (a,b,lower) => `${delta(a,b,lower)} к прошлым 7 дням`;
    const regionCards = W.REGIONS.filter(r=>(S.region==='all'||r.r===S.region) && W.objects.some(o=>o.region===r.r && scopeOk(o))).map(r => {
      const os = W.objects.filter(o=>o.region===r.r && (S.type==='all'||(S.type==='24'?o.is24:!o.is24)));
      const a = objAgg(from,to,os), ap = RNG.prev ? objAgg(RNG.prev.from,RNG.prev.to,os) : null, ay = objAgg(ytdFrom,to,os);
      const ar = W.receivables(at, c=>c.region===r.r);
      const pr = planOf((x,z)=>objAgg(x,z,os).rev,'revenue',1,from,to);
      const series = months12(to).map(x=>conv(objAgg(x.from,x.to,os).rev)/(x.to-x.from+1)/1e6);
      return `<div class="obj" style="--oc:${a.margin<0?'var(--bad)':(a.margin<10?'var(--warn)':'var(--good)')}"><div class="hd"><b>${r.r}</b><span class="cust">${r.city} · ${a.objects} ${plural(a.objects,'объект','объекта','объектов')} · ${a.posts} ${nw(a.posts,'постов')}</span><button type="button" class="btn" data-region="${esc(r.r)}">Открыть</button></div>
        <div class="big"><span class="v">${MU(a.rev)}</span><span class="l">выручка ${ap?delta(a.rev,ap.rev):''}</span></div>
        <div class="rows"><div><span>План на период</span><span>${P(pr?a.rev/pr*100:0)}</span></div><div><span>Маржа после накладных</span><span class="${a.margin<0?'dn':''}">${P(a.margin)}</span></div><div><span>Не открыто смен за период</span><span>${N(a.missed)} из ${N(a.plan)}</span></div><div><span>Результат с начала года</span><span class="${ay.profit<0?'dn':'up'}">${MU(ay.profit)}</span></div><div><span>Дебиторка / просрочка 30+, ${U()}</span><span>${M(ar.total)} / ${M(ar.overdue30)}</span></div></div>
        <div class="sp">${spark(series,'var(--c1)')}</div><div class="spl">выручка в день · 12 месяцев</div></div>`;
    }).join('');
    return h1('Кокпит<span class="hm"> исполнительного директора</span>') + tabs + tiles + `
    ${card('События, требующие внимания', `<div class="ev">${events.map(e=>`<div class="${e.s==='срочно'?'e-bad':''}"><span class="pill ${e.s==='срочно'?'u':e.c}">${evIcon(e.s)}${e.s}</span><div class="what">${e.t}<small>${e.d}</small></div><button type="button" class="mk" data-to="${e.go}">${e.a}</button></div>`).join('')}</div>`, `на ${dt(at)} · нажмите — задача уйдёт ответственному`)}
    ${card(`За 7 дней (${dts(wk.a)}–${dts(wk.b)}) к прошлым 7 дням`, `<div class="wk">
      <div><div class="t">Выручка за 7 дней</div><div class="v">${MU(wkAgg.rev)}</div><div class="d">${cmp(wkAgg.rev,wkPrev.rev)}</div></div>
      <div><div class="t">Смены открыты вовремя</div><div class="v">${P(wkAgg.plan?100-(wkAgg.missed+wkAgg.late)/wkAgg.plan*100:100)}</div><div class="d">не открыто ${N(wkAgg.missed)} · опоздания ${N(wkAgg.late)}</div></div>
      <div><div class="t">Происшествий</div><div class="v">${incW.length}</div><div class="d">было ${incP.length}</div></div>
      <div><div class="t">Жалоб заказчиков</div><div class="v">${incW.filter(x=>x.type==='жалоба заказчика').length}</div><div class="d">было ${incP.filter(x=>x.type==='жалоба заказчика').length}</div></div>
      <div><div class="t">Проверок объектов</div><div class="v">${chW.length}</div><div class="d">было ${chP.length} · предписаний ${chW.filter(c=>c.presc).length}</div></div>
      <div><div class="t">${at < W.LAUNCH_DEMO ? 'Документов подготовлено' : 'Документов подготовлено ИИ'}</div><div class="v">${N(sumDocs(wk.a,wk.b))}</div><div class="d">было ${N(sumDocs(wk.pa,wk.pb))} · графики и табели — в первые дни месяца</div></div>
      <div><div class="t">Новых запросов на охрану</div><div class="v">${fnW.requests}</div><div class="d">КП ${fnW.kp} · было запросов ${fnP.requests}</div></div>
      <div><div class="t">Поступления от заказчиков</div><div class="v">${MU(cfW.inCustomers)}</div><div class="d">${cmp(cfW.inCustomers, cfP.inCustomers)}</div></div>
    </div>`)}
    ${card(`Сервер и 1С на ${dt(at)}`, `<div class="wk">
      <div style="--stripe:var(--${oc.exportRejected?'bad':'surface'})"><div class="t">Выгрузки в движок</div><div class="v">${oc.exportsOk} / ${oc.exportsTotal}</div><div class="d">${oc.exportRejected?'<span class="dn">выгрузка отклонена — в отчётах последняя принятая версия</span>':'сверка с оборотно-сальдовой ведомостью сходится'}</div></div>
      <div style="--stripe:var(--${oc.effectorOk?'surface':'bad'})"><div class="t">Бэкапы · Effector Saver и MS SQL</div><div class="v">${oc.effectorOk?'3 / 3':'2 / 3'}</div><div class="d">${oc.effectorOk?'все копии выполнены':'<span class="dn">1С:Бухгалтерия — ошибка, нет места на диске копий</span>'}</div></div>
      <div><div class="t">Сеансы 1С</div><div class="v">${oc.sessions}</div><div class="d">1 робот · зависших нет</div></div>
      <div style="--stripe:var(--${oc.diskBackupFree<0.2?'warn':'surface'})"><div class="t">Диск копий свободно</div><div class="v">${P(oc.diskBackupFree*100)}</div><div class="d">порог сигнала 15 %</div></div>
    </div>`, `виртуальный администратор 1С · ${go('onec','подробно')}`)}
    ${card('Регионы', `<div class="objs">${regionCards}</div>`, periodTxt())}`;
  }
  function kpiTable(){
    const rows = [
      ['Выручка', revenueOf, 'm', false], ['EBITDA', ebitdaOf, 'm', false], ['Чистая прибыль', (a,b)=>W.pl(a,b).net, 'm', false],
      ['Охранники (ФОТ с взносами)', (a,b)=>isFiltered()?objAgg(a,b).guard:W.pl(a,b).guardC, 'm', true], ['Прочие операционные расходы', (a,b)=>W.pl(a,b).opex, 'm', true],
      ['Поступления от заказчиков', (a,b)=>W.cashflow(a,b).inCustomers, 'm', false], ['Налоги и взносы начислено', (a,b)=>W.taxes(a,b).total, 'm', true],
      ['Смен по плану', (a,b)=>objAgg(a,b).plan, 'n', false], ['Смен не открыто', (a,b)=>objAgg(a,b).missed, 'n', true], ['Происшествий', (a,b)=>incIn(a,b).length, 'n', true], ['Проверок объектов', (a,b)=>chkIn(a,b).length, 'n', false],
      ['Запросов на охрану', (a,b)=>W.funnel(a,b).requests, 'n', false], ['Договоров подписано', (a,b)=>W.funnel(a,b,objFilter).signed, 'n', false], ['Принято сотрудников', (a,b)=>W.hrRange(a,b).hires, 'n', false], ['Уволено сотрудников', (a,b)=>W.hrRange(a,b).fires, 'n', true], ['Документов подготовлено', sumDocs, 'n', false],
    ];
    const A = mod('analytics');
    const CARD_OF = ['kpi:revenue','kpi:ebitda','kpi:net','line:pl:guardC','line:pl:opex','kpi:inflow','kpi:tax_acc','kpi:shifts_plan','kpi:shifts_plan','kpi:incidents','kpi:checks','kpi:requests','kpi:signed','kpi:hr_move','kpi:hr_move','kpi:docs_ai'];
    if (A){ const posts = objAgg(RNG.from,RNG.to).posts, staff = W.hr(RNG.to).total, mo = RNG.len/30.4;
      const rs = rows.map(([n,fn,u,low],k)=>{ const c=fn(RNG.from,RNG.to), p=RNG.prev?fn(RNG.prev.from,RNG.prev.to):null, y=RNG.yago?fn(RNG.yago.from,RNG.yago.to):null; const cd = CARD_OF[k] || ''; return { n, u, low, c, p, y, pp: posts&&mo ? c/posts/mo : null, ps: staff&&mo ? c/staff/mo : null, _kind: cd.split(':')[0], _id: cd.slice(cd.indexOf(':')+1) }; });
      const vf = (v,r) => v==null ? '—' : (r.u==='m' ? M(v) : N(v)), uf = (v,r) => v==null ? '—' : (r.u==='m' ? T(v) : F(v,2));
      return card('Показатели за период', T2({ id:'kokpit-kpi', csv:'kpi_period', total:false, search:false, pageSize:40, cols:[{ key:'n', title:t('an.c.indicator') }, { key:'u', title:t('an.c.unit'), sort:false, html:r=>r.u==='m'?U():t('an.c.pcs') }, { key:'c', title:`${t('an.c.period')}<br><small>${periodTxt()}</small>`, kind:'num', fmt:vf, cmp:{ prev:r=>r.p, yago:r=>r.y, low:r=>r.low } }, ...(RNG.prev ? [{ key:'p', title:`${t('an.c.prev')}<br><small>${win(RNG.prev)}</small>`, kind:'num', fmt:vf, lo:true }] : []), ...(RNG.yago ? [{ key:'y', title:`${t('an.c.yago')}<br><small>${win(RNG.yago)}</small>`, kind:'num', fmt:vf, lo:true }] : []), { key:'pp', title:t('an.c.per_post'), kind:'num', fmt:uf, lo:true, tip:t('an.c.per_post_tip') }, { key:'ps', title:t('an.c.per_staff'), kind:'num', fmt:uf, lo:true, tip:t('an.c.per_staff_tip') }], rows: rs }), '«прошлый период» — такой же отрезок перед выбранным; «год назад» — те же даты прошлого года · на пост и на сотрудника — в месяц'); }
    return '';
  }

  // ---------- ЗАДАЧИ: раздел целиком — модуль collab-tasks.js (K.sections.tasks) ----------

  // ---------- ОБЪЕКТЫ ----------
  // В8: вкладка «Сквозная аналитика» (#objects-chain) — цепочка по выбранному объекту, заказчику или региону (3.4.3), те же функции, что в разделах
  const objTabs = cur => `<div class="tabs"><a href="#objects" class="${cur==='main'?'on':''}">Реестр и сигналы</a><a href="#objects-chain" class="${cur==='chain'?'on':''}">Сквозная аналитика</a></div>`;
  function objectsChain(){
    const A = mod('analytics'), to = RNG.to, at = RNG.anchor;
    const objs = filtered().filter(o=>activeIn(o,RNG.from,to)).sort((a,b)=>a.id-b.id), custs = W.customers.filter(c=>custFilter(c) && c.objects.some(o=>scopeOk(o) && activeIn(o,RNG.from,to))), regs = W.REGIONS.filter(r=>objs.some(o=>o.region===r.r));
    const scoped = !!SC().obj, kinds = scoped ? ['object'] : ['object','customer','region'], KN = { object:'Объект', customer:'Заказчик', region:'Регион' };
    let k = kinds.includes(S.chainK) ? S.chainK : 'object', id = S.chainId;
    const opts = k==='object' ? objs.map(o=>[String(o.id), I18N.w(o.name) + ' · ' + I18N.w(o.customer.name)]) : (k==='customer' ? custs.map(c=>[String(c.id), I18N.w(c.name)]) : regs.map(r=>[r.r, tx(r.r)]));
    if (!opts.some(x=>x[0]===String(id))){ const o18 = objs.find(o=>o.name===MYOBJ); id = k==='object' && o18 ? String(o18.id) : (opts[0] || [''])[0]; }
    if (!A || !opts.length) return h1('Объекты и посты') + objTabs('chain') + card('Сквозная аналитика', empty('Нет объектов в периоде и правах роли.'));
    const ch = A.chain(k, id, RNG.from, to, at);
    const sel = `<form class="lform chain-pick" onsubmit="return false"><label>Что смотреть <select data-chain="k" aria-label="Что смотреть">${kinds.map(x=>`<option value="${x}"${x===k?' selected':''}>${KN[x]}</option>`).join('')}</select></label><label>${KN[k]} <select data-chain="id" aria-label="${KN[k]}">${opts.map(([v,n])=>`<option value="${esc(v)}"${v===String(id)?' selected':''}>${esc(n)}</option>`).join('')}</select></label></form>`;
    const nm = (opts.find(x=>x[0]===String(id)) || ['',''])[1];
    return h1('Объекты и посты') + objTabs('chain') + card(`Сквозная аналитика · ${esc(nm)}`, sel + A.chainHtml(ch) + note('заказчик → посты → смены → происшествия → проверки → деньги → дебиторка → задачи и документы → договор · каждая плитка открывает карточку или раздел · цифры — те же функции, что в разделах «Объекты», «Смены», «Происшествия», «Продажи»'));
  }
  function objects(tab){
    if (tab==='chain') return objectsChain();
    const to = RNG.to, list = filtered().filter(o=>activeIn(o,RNG.from,to));
    const views = list.map(o=>W.objView(o,RNG.from,to,to)).sort((a,b)=>b.rev-a.rev);
    const agg = objAgg(RNG.from,to), fn = W.funnel(RNG.from,to,objFilter), lossV = lossObjects(RNG.from, to);
    const showMoney = hasMoney(roleOf(S.role));
    return h1('Объекты и посты') + objTabs('main') + `
    <div class="tiles">${tile(`Объектов на ${dt(to)}`, agg.objects, [`${views.filter(v=>v.activeNow&&v.o.is24).length} круглосуточных · ${views.filter(v=>v.activeNow&&!v.o.is24).length} дневных`, `за период запущено ${fn.launched} · расторгнуто ${fn.terminated}`], '')}${showMoney ? `${tile('Постов', agg.posts, [t('k83.rev_post', { v: T(agg.postDays?agg.rev/agg.postDays*30.4:0) })], '')}${tile('Выручка за период', MU(agg.rev), [deltaLine((a,b)=>objAgg(a,b).rev)], '')}${tile('В убытке за период', lossV.length, [[lossNote(lossV), ...lossV.slice(0,4).map(lossItem)].filter(Boolean).join(' · ')||'нет'], 'var(--bad)')}` : `${tile('Постов', agg.posts, [`не открыто смен за период ${N(agg.missed)}`], '')}`}</div>
    ${(()=>{ const at = RNG.anchor, noMark = filtered().filter(o=>W.active(o,at)).map(o=>W.objView(o,at,at,at)).filter(v=>v.missed>0), c30 = list.filter(o=>W.active(o,to) && o.contractEnd>=to && o.contractEnd-to<=30).sort((a,b)=>a.contractEnd-b.contractEnd);
      const one = (cls, ttl, n, items, go0) => `<div class="sig ${n?cls:'good'}"${go0?` data-go="${go0}" tabindex="0" role="link"`:''}><b>${ttl}</b><span class="v">${N(n)}</span><small>${items.slice(0,4).join(' · ') || tx('нет')}</small></div>`;
      return card('Сигналы', `<div class="sig-list">${showMoney ? one('bad', `В убытке за ${periodTxt()}`, lossV.length, [lossNote(lossV), ...lossV.map(v=>esc(lossItem(v)))].filter(Boolean)) : ''}${one('bad', `Без отметки смены на ${dt(at)}`, noMark.length, noMark.map(v=>esc(I18N.w(v.o.name)) + (v.o.missedPost?`, ${tx('пост')} ${v.o.missedPost}`:'')), 'shifts')}${one('warn', `Договор истекает ≤ 30 дн. от ${dt(to)}`, c30.length, c30.map(o=>`${esc(I18N.w(o.name))} — ${dts(o.contractEnd)}`), 'legal')}</div>`, '', ''); })()}
    ${showMoney ? card('По регионам', hbar(W.REGIONS.filter(r=>S.region==='all'||r.r===S.region).map(r=>{ const a=objAgg(RNG.from,to,list.filter(o=>o.region===r.r)); return {n:`${r.r} · ${a.objects} ${plural(a.objects,'объект','объекта','объектов')}`, v:a.rev}; }),{fmt:v=>MU(v)}), 'выручка за период') : card('По регионам', hbar(W.REGIONS.filter(r=>S.region==='all'||r.r===S.region).map(r=>{ const os=list.filter(o=>o.region===r.r && W.active(o,to)); return {n:`${r.r} · ${os.length} ${plural(os.length,'объект','объекта','объектов')}`, v:os.reduce((s2,o)=>s2+o.posts,0)}; }).filter(x=>x.v>0),{fmt:v=>N(v)+' '+nw(v,'постов')}), 'посты на дату')}
    ${(()=>{ const rl = roleOf(S.role), money = rl.rt.sales!=='·' || rl.rt.finance!=='·', A = mod('analytics'); if (!A) return '';
      const pv = RNG.prev, ya = RNG.yago, ar = money ? W.receivables(to, custFilter) : null, incM = new Map(); incIn(RNG.from,to).forEach(x=>incM.set(x.obj,(incM.get(x.obj)||0)+1));
      const rows = views.map(v=>{ const o = v.o, e = ar && ar.byCust.get(o.customer), be = o.posts && v.rev ? (v.guard+v.direct+v.overhead)/o.posts/RNG.len*30.4 : null, vp = pv ? W.objView(o,pv.from,pv.to,pv.to) : null, vy = ya ? W.objView(o,ya.from,ya.to,ya.to) : null;
        return { name:o.name, sub:`${o.kind} · ${o.sched}${o.terminated!=null?` · <span class="dn">расторгнут ${dt(o.terminated)}</span>`:''}${o.start>=0?` · с ${dt(o.start)}`:''}`, cust:o.customer.name, city:o.city, mode:o.is24?'24/7':'день', posts:W.active(o,to)?o.posts:0, tariff:v.tariffNow, rev:v.rev, profit:v.profit, margin:v.margin, plan:v.plan, missed:v.missed, miss:v.plan?v.missed/v.plan*100:0, inc:incM.get(o)||0, ar:e?e.debt:0, od:e?e.maxDays:0, be:be==null?null:v.tariffNow-be, end:o.contractEnd,
          rp:vp?vp.rev:null, ry:vy?vy.rev:null, pp:vp?vp.profit:null, py:vy?vy.profit:null, mp:vp&&vp.rev?vp.margin:null, my:vy&&vy.rev?vy.margin:null, _kind:'object', _id:o.id, _cls:v.profit<0&&v.rev>0?'an-bad':'' }; });
      const mTot = (rs, r0, p0) => { let a=0, b=0; rs.forEach(r=>{ if (r[r0]){ a+=r[p0]; b+=r[r0]; } }); return b ? a/b*100 : null; };
      const cols = [{ key:'name', title:t('an.c.object'), html:r=>`<b>${esc(I18N.w(r.name))}</b><br><small>${r.sub}</small>`, sortVal:r=>+r._id }, { key:'cust', title:t('an.c.customer'), html:r=>nbsp(esc(I18N.w(r.cust))) }, { key:'city', title:t('an.c.city'), lo:true, html:r=>esc(tx(r.city)) }, { key:'mode', title:t('an.c.mode'), lo:true }, { key:'posts', title:t('an.c.posts'), kind:'int', sum:'sum' },
        ...(money ? [{ key:'tariff', title:t('an.c.tariff'), kind:'tenge', lo:true }, { key:'rev', title:t('an.c.revenue'), kind:'money', sum:'sum', share:true, cmp:{ prev:r=>r.rp, yago:r=>r.ry, prevTot:rs=>rs.length===rows.length && pv ? objAgg(pv.from,pv.to).rev : rs.reduce((x,r)=>x+(r.rp||0),0), yagoTot:rs=>rs.length===rows.length && ya ? objAgg(ya.from,ya.to).rev : rs.reduce((x,r)=>x+(r.ry||0),0) } }, { key:'margin', title:t('an.c.margin'), kind:'pct', tip:t('an.k.loss.f'), tot:rs=>mTot(rs,'rev','profit'), cls:r=>r.profit<0?'dn':(r.margin<10?'wn':'up'), cmp:{ pp:true, prev:r=>r.mp, yago:r=>r.my, prevTot:rs=>mTot(rs,'rp','pp'), yagoTot:rs=>mTot(rs,'ry','py') } }] : []),
        { key:'miss', title:t('an.c.missed_pct'), kind:'pct', tot:rs=>{ let a=0, b=0; rs.forEach(r=>{ a+=r.missed; b+=r.plan; }); return b ? a/b*100 : 0; } }, { key:'inc', title:t('an.c.incidents'), kind:'int', sum:'sum', lo:true },
        ...(money ? [{ key:'ar', title:t('an.c.cust_ar'), kind:'money', lo:true, tip:t('an.k.ar.f') }, { key:'od', title:t('an.c.overdue_days'), kind:'int', sum:'max', lo:true, cls:r=>r.od>30?'dn':(r.od>0?'wn':'') }, { key:'be', title:t('an.c.be_diff'), kind:'tenge', lo:true, tip:t('an.c.be_tip'), cls:r=>r.be==null?'':(r.be<0?'dn':'up') }] : []),
        { key:'end', title:t('an.c.contract_to'), kind:'date', lo:true, cls:r=>r.end-to<=7?'dn':(r.end-to<=30?'wn':'') }];
      return card('Реестр объектов', T2({ id:'objects-registry', csv:'objects_registry', caption:'Реестр объектов', cols, rows, compact:true, sort:{ key: money ? 'rev' : 'posts', dir:'desc' }, filters: money ? [{ id:'loss', label:t('an.f.loss'), fn:r=>r.profit<0&&r.rev>0 }] : [] }), money ? 'маржа = (выручка − охранники с взносами − прямые − накладные по постам) ÷ выручка, за выбранный период' : 'тарифы и выручка этой роли не видны'); })()}`;
  }
  function shifts(){
    const to = RNG.to, list = filtered().filter(o=>W.active(o,to)), inPer = filtered().filter(o=>o.start<=to && o.end>RNG.from), agg = objAgg(RNG.from,to), byDay = RNG.len <= 62;
    const ot = W.overtime(RNG.from, to), ot12 = W.overtime(to-364, to); let ph = 0; for (let d = Math.max(0,RNG.from); d <= Math.min(to, W.DAYS-1); d++) ph += W.postHours(d);
    const hpm = ot.staff ? ph / ot.staff / RNG.len * 30.44 : 0, otBad = ot12.last365 > W.P.otYear;   // суммированный учёт (ст. 75, 78 ТК РК): предел — 120 ч в год (12 ч в месяц — только для 4–6-дневной недели)
    const pts = byDay ? Array.from({length:RNG.len},(_,k)=>{ const d=RNG.from+k; const a=objAgg(d,d); return { l: dts(d), v: a.plan?100-a.missed/a.plan*100:100, missed:a.missed }; })
                      : months12(to).map(x=>{ const a=objAgg(x.from,x.to); return { l:x.label, v:a.plan?100-a.missed/a.plan*100:100, missed:a.missed }; });
    const at = RNG.anchor, today = filtered().filter(o=>W.active(o,at)).map(o=>W.objView(o,at,at,at)).filter(v=>v.missed>0);
    const onTime = (a,b) => { const x=objAgg(a,b); return x.plan?100-(x.missed+x.late)/x.plan*100:100; };
    return h1('Смены и отметки', 'отметка с телефона: код + геометка в радиусе объекта · контроль через 15 минут') + `
    <div class="tiles">${tile('Смен за период', N(agg.plan), [`открыто ${N(agg.plan-agg.missed)} · не открыто <b class="dn">${N(agg.missed)}</b> · опоздания ${N(agg.late)}`], '')}${tile('Открыты вовремя', P(onTime(RNG.from,to)), [deltaLine(onTime)], '')}${tile(`Не открыто ${dt(at)}`, today.length, [today.map(v=>`${v.o.name}${v.o.missedPost?`, пост ${v.o.missedPost}`:''}`).join(' · ')||'все смены открыты'], 'var(--bad)')}${tile('Часы охранника в месяц', `${F(hpm,1)} / ${F(ot.normMonth,1)}`, [t('k83.sh_l1', { n: F(ot.normMonth,1), o: F(ot.perMonth,1), c: ot.perMonth>W.P.otYear/12?'wn':'' }), t('k83.sh_l2', { h: N(Math.round(ot12.last365)), c: ot12.last365>W.P.otYear?'dn':'' }) + (otBad ? t('k83.over') : '')], otBad?'var(--bad)':'')}${tile('Отметки без геометки', '8 в день', ['нет согласия на геометку (Р10) — отметка кодом'], '')}</div>
    ${card(byDay?'Смены открыты по дням, %':'Смены открыты по месяцам, %', bars(pts.map(p=>Math.max(0,p.v-97)), pts.map(p=>p.l), {label:'смены', unit:'%', fmt:v=>P(v+97), colors: pts.map(p=>p.missed? 'var(--warn)':'var(--good)'), ticks:[[0,'97 %'],[1,'98 %'],[2,'99 %'],[3,'100 %']]}), 'шкала от 97 %; жёлтым — дни (месяцы) с неоткрытыми сменами')}
    ${card(`Незакрытые смены на ${dt(at)}`, today.length ? T2({ id:'shifts-open', csv:'shifts_not_opened', search:false, cols:[{ key:'n', title:t('an.c.object'), html:r=>esc(I18N.w(r.n)) }, { key:'post', title:t('an.c.post'), html:r=>esc(I18N.w(`пост ${r.post}`)) }, { key:'c', title:t('an.c.customer'), html:r=>nbsp(esc(I18N.w(r.c))) }, { key:'act', title:t('an.c.ai_action'), lo:true }, { key:'st', title:t('an.c.status'), lo:true }], rows: today.map(v=>({ n:v.o.name, post:v.o.missedPost||1, c:v.o.customer.name, act:v.o.region==='Атырауская'?'замена из резерва базы Атырау':'замена из резерва, ГБР при необходимости', st:'задача в работе', _kind:'object', _id:v.o.id, _cls:'an-bad' })) }) : empty('Все смены открыты.'))}
    ${(()=>{ const A = mod('analytics'), pv = RNG.prev, ya = RNG.yago, ot = v => v && v.plan ? 100-(v.missed+v.late)/v.plan*100 : null, otT = (rs, k) => { let a=0, b=0; rs.forEach(r=>{ if (r[k]){ a+=r[k].missed+r[k].late; b+=r[k].plan; } }); return b ? 100-a/b*100 : null; };
      const rows = inPer.map(o=>{ const v = W.objView(o,RNG.from,to,to), vp = pv ? W.objView(o,pv.from,pv.to,pv.to) : null, vy = ya ? W.objView(o,ya.from,ya.to,ya.to) : null; return { n:o.name, reg:o.region, plan:v.plan, missed:v.missed, late:v.late, ok:ot(v), vp, vy, op:ot(vp), oy:ot(vy), v, _kind:'object', _id:o.id, _cls: v.missed ? 'an-warn' : '' }; });
      return card(`Смены по объектам · ${periodTxt()}`, T2({ id:'shifts-by-object', csv:'shifts_by_object', cols:[{ key:'n', title:t('an.c.object'), html:r=>esc(I18N.w(r.n)), sortVal:r=>+r._id }, { key:'reg', title:t('an.c.region'), lo:true, html:r=>esc(tx(r.reg)) }, { key:'plan', title:t('an.c.shifts_plan'), kind:'int', sum:'sum' }, { key:'missed', title:t('an.c.not_opened'), kind:'int', sum:'sum', cls:r=>r.missed?'dn':'' }, { key:'late', title:t('an.c.late'), kind:'int', sum:'sum', lo:true }, { key:'ok', title:t('an.c.on_time'), kind:'pct', tot:rs=>otT(rs.map(r=>({ x:r.v })), 'x'), cmp:{ pp:true, prev:r=>r.op, yago:r=>r.oy, prevTot:rs=>otT(rs,'vp'), yagoTot:rs=>otT(rs,'vy') } }], rows, sort:{ key:'missed', dir:'desc' }, filters:[{ id:'miss', label:t('an.f.missed'), fn:r=>r.missed>0 }] }), t('k83.sh_note', { n: N(inPer.length) })); })()}
    ${card('Графики и норма часов', T2({ id:'shifts-schedules', csv:'schedules', search:false, cols:[{ key:'g', title:t('an.c.schedule'), html:r=>esc(tx(r.g)) }, { key:'objs', title:t('an.c.objects'), kind:'int', sum:'sum', share:true }, { key:'posts', title:t('an.c.posts'), kind:'int', sum:'sum', share:true }, { key:'pp', title:t('an.c.per_post_sched'), kind:'int' }, { key:'fte', title:t('an.c.fte_post'), kind:'num', d:1 }, { key:'hp', title:t('an.c.hours_sched'), kind:'num', d:1, lo:true, cls:r=>r.hp>ot.normMonth+W.P.otYear/12?'wn':'' }, { key:'hf', title:t('an.c.hours_fte'), kind:'num', d:1, lo:true, cls:r=>r.hf>ot.normMonth+W.P.otYear/12?'dn':'' }, { key:'norm', title:t('an.c.norm_hours'), kind:'num', d:1, lo:true }, { key:'cities', title:t('an.c.cities'), lo:true, html:r=>esc(r.cities.map(tx).join(', ')||'—') }], rows: ['сутки/трое','15/15 вахта','2/2 дневной','5/2 дневной'].map(g=>{ const os=list.filter(o=>o.sched===g), hd=W.P.postHours[g], fte=W.P.fteBy[g]; return { g, objs:os.length, posts:os.reduce((s,o)=>s+o.posts,0), pp:W.P.perPost[g], fte, hp:hd*30.44/W.P.perPost[g], hf:hd*30.44/fte, norm:ot.normMonth, cities:[...new Set(os.map(o=>o.city))] }; }) }), t('k83.sched_note', { h: F(hpm,1), o: F(ot.perMonth,1) }))}`;
  }
  function incidents(){
    const to = RNG.to, inc = incIn(RNG.from,to), ch = chkIn(RNG.from,to), presc = W.prescOpen(to).filter(c=>objFilter(c.obj));
    const types = {}; inc.forEach(x=>types[x.type]=(types[x.type]||0)+1);
    const colors = CATC;
    return h1('Происшествия и проверки') + `
    <div class="tiles">${tile('Происшествий', inc.length, [deltaLine((a,b)=>incIn(a,b).length, true), `закрыто на ${dt(to)}: ${inc.filter(x=>x.closeDay<=to).length}`], 'var(--bad)')}${tile('Среднее время реакции ГБР', inc.length?F(inc.reduce((s,x)=>s+x.react,0)/inc.length,0)+' мин':'—', ['норматив 15 мин'], '')}${tile('Проверок', ch.length, [`средняя оценка ${ch.length?F(ch.reduce((s,c)=>s+c.score,0)/ch.length):'—'} из 5 · предписаний ${ch.filter(c=>c.presc).length}`], '')}${tile(`Предписаний не устранено на ${dt(to)}`, presc.length, [presc.slice(0,3).map(c=>c.obj.name).join(' · ')||'нет'], 'var(--warn)')}</div>
    ${card('Виды происшествий', inc.length ? donut(Object.entries(types).sort((a,b)=>b[1]-a[1]).map(([n,v],i)=>({n,v,c:colors[i%colors.length]})),{center:String(inc.length),title:'всего'}) : empty('За период происшествий нет.'))}
    ${(()=>{ const A = mod('analytics'), IX = new Map(W.incidents.map((x,i)=>[x,i])), CX = new Map(W.checks.map((x,i)=>[x,i])), pv = RNG.prev, ya = RNG.yago, incP = pv ? incIn(pv.from,pv.to) : null, incY = ya ? incIn(ya.from,ya.to) : null;
      const grp = (arr, key) => { const m = new Map(); arr.forEach(x=>{ const k = key(x); let e = m.get(k); if (!e){ e = { n:0, react:0, closed:0, types:{} }; m.set(k, e); } e.n++; e.react += x.react; if (x.closeDay<=to) e.closed++; e.types[x.type] = (e.types[x.type]||0)+1; }); return m; };
      const cnt = (arr, key) => { if (!arr) return null; const m = new Map(); arr.forEach(x=>{ const k = key(x); m.set(k, (m.get(k)||0)+1); }); return m; };
      const yr = W.incidents.filter(x=>x.day>to-365 && x.day<=to && objFilter(x.obj)), rep = grp(yr, x=>x.obj);
      const gT = grp(inc, x=>x.type), pT = cnt(incP, x=>x.type), yT = cnt(incY, x=>x.type), gO = grp(inc, x=>x.obj), pO = cnt(incP, x=>x.obj), yO = cnt(incY, x=>x.obj);
      const cols = first => [first, { key:'n', title:t('an.c.count'), kind:'int', sum:'sum', share:true, cmp:{ low:true, prev:r=>r.p, yago:r=>r.y } }, { key:'react', title:t('an.c.react'), kind:'num', d:0, lo:true, tot:rs=>{ let a=0, b=0; rs.forEach(r=>{ a+=r.react*r.n; b+=r.n; }); return b ? a/b : null; } }, { key:'closed', title:t('an.c.closed_pct'), kind:'pct', lo:true, tot:rs=>{ let a=0, b=0; rs.forEach(r=>{ a+=r.closed*r.n/100; b+=r.n; }); return b ? a/b*100 : null; } }];
      const byType = [...gT].map(([k,e])=>({ type:k, n:e.n, react:e.react/e.n, closed:e.closed/e.n*100, p: pT ? pT.get(k)||0 : null, y: yT ? yT.get(k)||0 : null }));
      const byObj = [...gO].map(([o,e])=>{ const r12 = rep.get(o), mx = r12 ? Math.max(...Object.values(r12.types)) : 0, mt = r12 ? Object.entries(r12.types).sort((a,b)=>b[1]-a[1])[0] : null; return { obj:o.name, n:e.n, react:e.react/e.n, closed:e.closed/e.n*100, p: pO ? pO.get(o)||0 : null, y: yO ? yO.get(o)||0 : null, rep:mx, repT: mt ? mt[0] : '', _kind:'object', _id:o.id, _cls: mx>=3 ? 'an-warn' : '' }; });
      return (inc.length ? card(`По видам · ${periodTxt()}`, T2({ id:'inc-by-type', csv:'incidents_by_type', search:false, cols:cols({ key:'type', title:t('an.c.type'), html:r=>esc(tx(r.type)) }), rows:byType, sort:{ key:'n', dir:'desc' } })) + card(`По объектам · ${periodTxt()}`, T2({ id:'inc-by-object', csv:'incidents_by_object', cols:[...cols({ key:'obj', title:t('an.c.object'), html:r=>esc(I18N.w(r.obj)) }), { key:'rep', title:t('an.c.repeat'), kind:'int', sum:'max', tip:t('an.c.repeat_tip'), html:r=>r.rep>=2 ? `<span class="${r.rep>=3?'wn':''}">${N(r.rep)} · ${esc(tx(r.repT))}</span>` : '—' }], rows:byObj, sort:{ key:'n', dir:'desc' }, filters:[{ id:'rep', label:t('an.f.repeat'), fn:r=>r.rep>=3 }] }), 'повторяется — наибольшее число происшествий одного вида на объекте за 12 месяцев до даты') : '') +
      card('Журнал происшествий', inc.length ? T2({ id:'inc-journal', csv:'incidents', cols:[{ key:'day', title:t('an.c.date'), kind:'date', sortVal:r=>r.day*1440+(+r.time.slice(0,2))*60+(+r.time.slice(3)) }, { key:'time', title:t('an.c.time'), sort:false }, { key:'obj', title:t('an.c.object'), html:r=>esc(I18N.w(r.obj)) }, { key:'type', title:t('an.c.type'), html:r=>esc(tx(r.type)) }, { key:'result', title:t('an.c.result'), lo:true, html:r=>esc(tx(r.result)) }, { key:'react', title:t('an.c.react'), kind:'int', sum:'avg', lo:true }, { key:'st', title:t('an.c.status'), html:r=>r.st?'закрыто':'<span class="dn">в работе</span>' }], rows: inc.map(x=>({ day:x.day, time:x.time, obj:x.obj.name, type:x.type, result:x.result, react:x.react, st:x.closeDay<=to, _kind:'incident', _id:IX.get(x), _cls:x.closeDay<=to?'':'an-warn' })) }) : empty('За период происшествий нет.'), `${inc.length} за период · по 25 строк`) +
      card(`Предписания на ${dt(to)}`, presc.length ? T2({ id:'inc-presc', csv:'prescriptions', search:false, cols:[{ key:'obj', title:t('an.c.object'), html:r=>esc(I18N.w(r.obj)) }, { key:'what', title:t('an.c.violation'), html:r=>esc(tx(r.what)) }, { key:'day', title:t('an.c.issued'), kind:'date' }, { key:'fix', title:t('an.c.fix_due'), kind:'date', cls:r=>r.fix<to?'dn':'' }, { key:'left', title:t('an.c.days_left'), kind:'int', lo:true, cls:r=>r.left<0?'dn':(r.left<=3?'wn':'') }], rows: presc.map(c=>({ obj:c.obj.name, what:c.presc.what, day:c.day, fix:c.presc.fixDay, left:c.presc.fixDay-to, _kind:'presc', _id:CX.get(c) })) }) : empty('Неустранённых предписаний нет.')) +
      card('Проверки руководством', ch.length ? T2({ id:'inc-checks', csv:'checks', cols:[{ key:'day', title:t('an.c.date'), kind:'date' }, { key:'obj', title:t('an.c.object'), html:r=>esc(I18N.w(r.obj)) }, { key:'who', title:t('an.c.inspector'), lo:true, html:r=>esc(tx(r.who)) }, { key:'res', title:t('an.c.result'), lo:true, html:r=>esc(tx(r.res)) }, { key:'score', title:t('an.c.score'), kind:'num', d:1, sum:'avg', fmt:v=>'★'.repeat(v)+'☆'.repeat(5-v), totFmt:v=>F(v)+' / 5' }], rows: ch.map(c=>({ day:c.day, obj:c.obj.name, who:c.who, res:c.result, score:c.score, _kind:'check', _id:CX.get(c), _cls:c.presc?'an-warn':'' })), filters:[{ id:'presc', label:t('an.f.presc'), fn:r=>r._cls==='an-warn' }] }) : empty('За период проверок нет.'), `${ch.length} за период`); })()}`;
  }

  // ---------- КАДРЫ, ЮРИСТ ----------
  function hrSec(){
    { const rl = roleOf(S.role); if (rl.rt.hr==='С'){ const at = RNG.anchor; return h1('Мои документы', rl.name) + `<div class="tiles">${tile('График', 'сутки/трое', [`следующая смена — ${dts(at + ((2 - at % 4 + 4) % 4 || 4))} 08:00`], '')}${tile('Отпуск', '24 дня в году', [`остаток ${N(10 + (at % 9))} дн.`], '')}${tile('Удостоверение охранника', `до ${dt(at + 224)}`, ['продление — за 30 дней'], '')}${tile('Медосмотр', `до ${dt(at + 131)}`, ['направление готовит кадровик'], '')}</div>` + card('Мои документы', table(['Документ','Дата','Статус'], [['Трудовой договор', dt(Math.max(0, at - 600)), 'действует'], ['Приказ об изменении графика смен', dts(Math.max(0, at - 2)), '<span class="wn">ознакомиться</span>'], ['Инструкция поста', dts(Math.max(0, at - 40)), 'ознакомлен'], ['Заявление на отпуск', '—', 'ИИ подготовит проект']]), 'чужие данные и зарплата коллег этой роли не видны'); } }
    const to = RNG.to, h = W.hr(to), h0 = W.hr(RNG.from), mv = W.hrRange(RNG.from,to), ms = months12(to), ot = W.overtime(RNG.from, to);
    const turnover = RNG.len < 30 ? NaN : mv.fires / Math.max(1,(h0.guards + h.guards)/2) * 365 / RNG.len * 100;   // текучесть охранников: уволено ÷ средняя численность охранников
    return h1('Кадры', `на ${dt(to)} · по компании`) + `
    <div class="tiles">${tile('Сотрудников', N(h.total), [`охранников ${N(h.guards)} · администрация ${h.admin}`, `к ${dt(RNG.from)}: ${delta(h.total, h0.total)}`], '')}${tile('Движение за период', `+${N(mv.hires)} / −${N(mv.fires)}`, [t('k83.hr_turn', { v: isFinite(turnover)?P(turnover):t('k83.short') })], '')}${tile(`Отсутствуют ${dt(to)}`, h.vac+h.sick+h.absent, [`отпуск ${h.vac} · больничный ${h.sick} · <span class="dn">не вышли ${h.absent}</span>`], 'var(--warn)')}${tile('Истекает за 30 / 90 дней', `${h.cert30} / ${h.cert90}`, [`удостоверения охранника · медосмотры ${h.medical} · обучение ${h.training}`], 'var(--warn)')}${(()=>{ const os = W.objects.filter(o=>W.active(o,to)), np = os.reduce((s0,o)=>s0+o.posts,0), vac = h.vacancies; return tile(`${t('an.k.vacancies')} · ${dt(to)}`, (vac<0?'−':'')+N(Math.abs(vac)), [t('k83.vac_l1', { n: N(h.need), p: N(np), w: nw(np,'постов'), g: N(h.guards) }) + (vac<0 ? t('k83.vac_over') : ''), t('k83.vac_l2', { s: P(h.staffing), o: N(Math.round(ot.perMonth)) })], vac>=1?'var(--warn)':''); })()}</div>
    ${card('Численность · 12 месяцев', lines([{n:'численность на конец месяца',v:ms.map(x=>W.hr(x.to).total),c:'var(--c1)'}, ...(ms.every(x=>x.mi>=12) ? [{n:t('an.c.yago'),v:ms.map(x=>W.hr(W.MONTHS[x.mi-12].end).total),c:'var(--fg-3)',dash:true,dots:false}] : [])], ms.map(x=>x.label), {fmt:v=>N(v), unit:tx('человек')}) + bars(ms.map(x=>Math.round((W.hrRange(x.from,x.to).hires - W.hrRange(x.from,x.to).fires)*x.rate)), ms.map(plabel), {h:110, label:'нетто', unit:tx('принято − уволено, человек'), fmt:v=>(v>=0?'+':'')+N(v), values:v=>(v>=0?'+':'')+N(v), color:'var(--good)', hollow:ms.map(x=>x.partial)}), 'столбцы — принято минус уволено за месяц' + partNote(ms))}
    ${(()=>{ const A = mod('analytics'), os = W.objects.filter(o=>W.active(o,to)), fteAll = os.reduce((s,o)=>s+o.fte,0) || 1, sh = (x, fte) => x * fte / fteAll;
      const rows = W.REGIONS.filter(r=>S.region==='all'||r.r===S.region).map(r=>{ const ro = os.filter(o=>o.region===r.r && objFilter(o)), fte = ro.reduce((s,o)=>s+o.fte,0), need = fte*W.P.reserveK, inStaff = sh(h.guards, fte); return { r:r.r, objs:ro.length, posts:ro.reduce((s,o)=>s+o.posts,0), fte, need, staff:inStaff, vac:need-inStaff, away: ro.reduce((s,o)=>s+W.sumO(o,'missed',to,to),0) + sh(h.vac+h.sick, fte), c30:sh(h.cert30, fte), c90:sh(h.cert90, fte), _kind:'region', _id:r.r }; }).filter(r=>r.objs);
      const n0 = { kind:'num', d:0, sum:'sum' };
      return card(`Кадры по регионам на ${dt(to)}`, T2({ id:'hr-regions', csv:'hr_by_region', search:false, cols:[{ key:'r', title:t('an.c.region'), html:r=>esc(tx(r.r)) }, { key:'objs', title:t('an.c.objects'), kind:'int', sum:'sum', lo:true }, { key:'posts', title:t('an.c.posts'), kind:'int', sum:'sum' }, { key:'fte', title:'FTE', ...n0, lo:true }, { key:'need', title:t('an.c.need'), ...n0, tip:t('an.k.vacancies.f') }, { key:'staff', title:t('an.c.staff'), ...n0, share:true }, { key:'vac', title:t('an.c.vacancies'), ...n0, cls:r=>r.vac>=1?'wn':'' }, { key:'away', title:t('an.c.away'), ...n0, lo:true }, { key:'c30', title:t('an.c.cert30'), ...n0, lo:true }, { key:'c90', title:t('an.c.cert90'), ...n0, lo:true }], rows, sort:{ key:'posts', dir:'desc' } }), t('k83.hr_reg', { v: isFinite(turnover)?P(turnover):'—' })); })()}
    ${card('Что делает виртуальный кадровик',`<ul class="ul"><li>Проекты приказов — за период ${N(W.docs(RNG.from,to)[0].n)}, подпись директора</li><li>Графики по объектам с проверкой нормы часов и переработок</li><li>Табель из отметок смен — сводный ФОТ уходит в 1С:Бухгалтерию роботом по поручению бухгалтера</li><li>Сигналы: удостоверения, медосмотры, обучение — за 90/30/7 дней</li></ul>`)}`;
  }
  function legal(){
    const to = RNG.to, list = filtered().filter(o=>W.active(o,to)).sort((a,b)=>a.contractEnd-b.contractEnd);
    const soon = list.filter(o=>o.contractEnd>=to && o.contractEnd-to<=60), fn = W.funnel(RNG.from,to,objFilter);
    return h1('Юридический блок', `лицензия на охранную деятельность до 31.12.2040 · осталось ${N(Math.round((Date.UTC(2040,11,31)-W.toDate(to))/864e5))} дн.`) + `
    <div class="tiles">${tile('Заказчиков с договором', new Set(list.map(o=>o.customer.id)).size, [`${list.length} ${nw(list.length,'объектов')} на ${dt(to)}`], '')}${tile('Истекают за 60 дней', soon.length, [soon.slice(0,3).map(o=>`${o.customer.name} до ${dts(o.contractEnd)}`).join(' · ')||'нет'], 'var(--warn)')}${tile('Подписано за период', fn.signed, ['новые договоры'], '')}${tile('Расторгнуто за период', fn.terminated, [W.objects.filter(o=>o.terminated!=null&&o.terminated>=RNG.from&&o.terminated<=to&&objFilter(o)).map(o=>o.name).join(' · ')||'нет'], 'var(--bad)')}</div>
    ${(()=>{ const money = hasMoney(roleOf(S.role)), ar = money ? W.receivables(to, custFilter) : null;
      const rows = list.map(o=>{ const left = o.contractEnd-to, e = ar && ar.byCust.get(o.customer); return { c:o.customer.name, o:o.name, reg:o.region, posts:o.posts, sum:o.posts*W.tariff(o,to), pay:o.customer.payDays, end:o.contractEnd, left, ext: left<=30 ? 'проект допсоглашения у юриста' : (left<=60 ? 'письмо заказчику о продлении' : 'не требуется'), ar: e ? e.debt : 0, od: e ? e.maxDays : 0, _kind:'object', _id:o.id, _cls: left<=7 ? 'an-bad' : (left<=30 ? 'an-warn' : '') }; });
      return card(`Реестр договоров на ${dt(to)} · ближайшие окончания`, T2({ id:'legal-contracts', csv:'contracts', cols:[{ key:'c', title:t('an.c.customer'), html:r=>nbsp(esc(I18N.w(r.c))) }, { key:'o', title:t('an.c.object'), html:r=>esc(I18N.w(r.o)), sortVal:r=>+r._id }, { key:'reg', title:t('an.c.region'), lo:true, html:r=>esc(tx(r.reg)) }, { key:'posts', title:t('an.c.posts'), kind:'int', sum:'sum', lo:true }, ...(money ? [{ key:'sum', title:t('an.c.month_sum'), kind:'money', sum:'sum', share:true }] : []), { key:'pay', title:t('an.c.pay_days'), kind:'int', lo:true }, { key:'end', title:t('an.c.contract_to'), kind:'date' }, { key:'left', title:t('an.c.days_left'), kind:'int', cls:r=>r.left<=7?'dn':(r.left<=30?'wn':(r.left<=60?'wn':'')) }, { key:'ext', title:t('an.c.renewal'), lo:true }, ...(money ? [{ key:'ar', title:t('an.c.cust_ar'), kind:'money', lo:true }, { key:'od', title:t('an.c.overdue_days'), kind:'int', lo:true, sum:'max', cls:r=>r.od>30?'dn':'' }] : [])], rows, sort:{ key:'end', dir:'asc' }, filters:[{ id:'s60', label:t('an.f.expiring'), fn:r=>r.left<=60 }] }), '≤ 7 дней — красный, ≤ 30 — жёлтый, ≤ 60 — пометка'); })()}
    ${card('Что делает виртуальный юрист', `<ul class="ul"><li>Проект договора и допсоглашения по шаблону Агентства — с пометкой «проект, требует проверки юристом и директором»</li><li>Анализ договора заказчика: риски, штрафы, сроки уведомлений</li><li>Претензии и ответы; календарь обязательств</li><li>Контроль законодательства РК: Закон «Об охранной деятельности», Трудовой кодекс, Закон о персональных данных</li></ul>`)}`;
  }

  // ---------- ПРОДАЖИ ----------
  function sales(tab){
    const to = RNG.to, list = filtered(), agg = objAgg(RNG.from,to,list), fn = W.funnel(RNG.from,to,objFilter);
    const ch = W.CHANNELS.map(c=>{ const os=list.filter(o=>o.customer.channel===c); const a=objAgg(RNG.from,to,os); const yr=objAgg(Math.max(0,to-364),to,os); const cs=new Set(os.filter(o=>W.active(o,to)).map(o=>o.customer.id)); return { c, cust:cs.size, a, yr, cac:W.CAC[c] }; });
    const custs = W.customers.filter(c=>c.objects.some(objFilter)).map(c=>{ const a=objAgg(RNG.from,to,c.objects.filter(objFilter)); const r=W.receivables(to,x=>x===c); const e=r.byCust.get(c)||{overdue:0,maxDays:0}; return { c, a, debt:r.total, overdue:e.overdue, days:e.maxDays }; }).filter(x=>x.a.rev>0).sort((a,b)=>b.a.rev-a.a.rev);
    const r = W.R(to), m0 = W.MONTHS[W.monthIdx(to)], pm = W.pl(m0.start,to), y = W.yOf(to);
    // юнит-экономика поста — та же база, что маржа объекта (W.objView): охрана по факту месяца на FTE (штат × 1,05, взносы, сверхурочные, резерв отпусков), прямые — на FTE, накладные (администрация, офис, ИТ, коммерческие, прочие) — на пост
    let fteD = 0, postD = 0; for (let d = m0.start; d <= to; d++){ fteD += W.totFte(d); postD += W.totPosts(d); }
    const guardPerFte = pm.guardC/fteD*m0.dim, otPerFte = W.overtime(m0.start,to).cost/fteD*m0.dim, dirPerFte = (pm.uniform+pm.transport+pm.comms)/fteD*m0.dim, ohPerPost = (pm.adminC+pm.office+pm.other+pm.it+pm.selling)/postD*m0.dim;
    const unit = [['Круглосуточный пост (сутки/трое, вахта)', 'сутки/трое'],['Дневной пост «2/2» (12 ч)', '2/2 дневной'],['Дневной пост «5/2» (8 ч по будням)', '5/2 дневной']].map(([n,g])=>[n, W.P.tariffBy[g][y], W.P.fteBy[g]]).map(([n,t,fte])=>{ const guard = fte*guardPerFte, dir = fte*dirPerFte, profit = t-guard-dir-ohPerPost; return { n, t, fte, guard, ot: fte*otPerFte, dir, oh:ohPerPost, profit, be: guard+dir+ohPerPost }; });
    const ms = months12(to);
    const TB = [['', 'Обзор'], ['cust', 'Заказчики'], ['ch', 'Каналы и регионы'], ['ar', 'Дебиторка'], ['unit', 'Юнит-экономика']];
    tab = TB.some(x=>x[0]===tab) ? tab : '';
    const tabsH = `<div class="tabs">${TB.map(([k,n])=>`<a href="#sales${k?'-'+k:''}" class="${tab===k?'on':''}">${tx(n)}</a>`).join('')}</div>`;
    const B = { '': () => [card('Выручка по месяцам · 12 месяцев', lines([{n:tx('выручка'), v:ms.map(x=>conv(objAgg(x.from,x.to,list).rev)/1e6*x.rate), c:'var(--c1)'}, ...(ms.length && ms.every(x=>x.mi>=12) ? [{n:t('an.c.yago'), v:ms.map(x=>{ const M1 = W.MONTHS[x.mi-12]; return conv(objAgg(M1.start,M1.end,list).rev)/1e6; }), c:'var(--fg-3)', dash:true, dots:false}] : [])], ms.map(x=>x.label), {min:0, fmt:v=>F(v,0), unit:U()+' · '+tx('по месяцам'), label:'выручка по месяцам', partialLast: ms.length && ms[ms.length-1].partial}), partNote(ms).replace(/^ · /,'')), RNG.yago ? (()=>{ const ya = RNG.yago; let same=0, newR=0, lost=0, prevT=0, curT=0;
      for (const o of list){ const c = W.sumO(o,'rev',RNG.from,to), pv = W.sumO(o,'rev',ya.from,ya.to); prevT += pv; curT += c; if (pv>0 && c>0) same += c-pv; else if (c>0) newR += c; else if (pv>0) lost -= pv; }
      const rows = [['Год назад', prevT, 'var(--c7)'], ['Те же объекты: тарифы и дни работы', same, 'var(--c1)'], ['Новые объекты', newR, 'var(--c3)'], ['Расторгнутые объекты', lost, 'var(--bad)'], ['Сейчас', curT, 'var(--c2)']];
      return card(`Мост выручки, ${U()}: ${win(ya)} → ${periodTxt()}`, hbar(rows.map(([n,v,c])=>({n,v,c})),{fmt:v=>M(v)}) + note(`${M(prevT)} + ${M(same)} + ${M(newR)} ${lost<0?'−':'+'} ${M(Math.abs(lost))} = ${M(curT)} ${U()}`), 'сопоставимо по объектам'); })() : ''], cust: () => [(()=>{ const A = mod('analytics'); if (!A) return ''; const pv = RNG.prev, ya = RNG.yago, mT = rs => { let a=0, b=0; rs.forEach(r=>{ a+=r.profit; b+=r.rev; }); return b ? a/b*100 : 0; };
      const pay = new Map(); for (const a0 of W.acts){ if (a0.month < 0 || a0.pay > to || a0.actDay < to-365) continue; const e = pay.get(a0.cust) || [0,0]; e[0] += a0.pay - a0.actDay; e[1]++; pay.set(a0.cust, e); }
      const vat = (()=>{ const rv = W.pl(RNG.from,to).revenue; return rv ? revVat(RNG.from,to)/rv - 1 : W.R(to).vat; })();   // НДС периода — по ставке каждого дня
      const rows = custs.map(x=>{ const os = x.c.objects.filter(objFilter), e = pay.get(x.c); return { name:x.c.name, ch:x.c.channel, reg:x.c.region, objects:os.filter(o=>W.active(o,to)).length, posts:os.filter(o=>W.active(o,to)).reduce((s2,o)=>s2+o.posts,0), rev:x.a.rev, profit:x.a.profit, margin:x.a.margin, debt:x.debt, days:x.days, payF: e ? e[0]/e[1] : null, payD:x.c.payDays, dso: x.a.rev ? x.debt/(x.a.rev*(1+vat)/RNG.len) : null, rp: pv ? objAgg(pv.from,pv.to,os).rev : null, ry: ya ? objAgg(ya.from,ya.to,os).rev : null, _kind:'customer', _id:x.c.id, _cls: x.days>30 ? 'an-bad' : '' }; });
      return card('Топ заказчиков за период', T2({ id:'sales-customers', csv:'sales_customers', cols:[{ key:'name', title:t('an.c.customer'), html:r=>`<b>${nbsp(esc(I18N.w(r.name)))}</b>` }, { key:'ch', title:t('an.c.channel'), lo:true, html:r=>esc(tx(r.ch)) }, { key:'reg', title:t('an.c.region'), lo:true, html:r=>esc(tx(r.reg)) }, { key:'objects', title:t('an.c.objects_posts'), kind:'int', sum:'sum', html:r=>`${N(r.objects)} / ${N(r.posts)}` }, { key:'rev', title:t('an.c.revenue'), kind:'money', sum:'sum', share:true, cmp:{ prev:r=>r.rp, yago:r=>r.ry } }, { key:'margin', title:t('an.c.margin'), kind:'pct', tot:mT, cls:r=>r.margin<0?'dn':(r.margin<10?'wn':'up') }, { key:'debt', title:`${t('an.c.ar')} ${dts(to)}`, kind:'money', sum:'sum', share:true, lo:true }, { key:'days', title:t('an.c.overdue_days'), kind:'int', sum:'max', cls:r=>r.days>30?'dn':(r.days?'wn':'') }, { key:'payF', title:t('an.c.pay_fact'), kind:'num', d:0, lo:true, tip:t('an.c.pay_tip'), html:r=>r.payF==null?'—':`${F(r.payF,0)} / ${N(r.payD)}` }, { key:'dso', title:'DSO', kind:'num', d:0, lo:true, tip:t('an.c.dso_tip') }], rows, sort:{ key:'rev', dir:'desc' }, filters:[{ id:'risk', label:t('an.f.risk'), fn:r=>r.days>30 }] }), 'риск: просрочка больше 30 дней — красная полоса'); })()], ch: () => [(()=>{ const A = mod('analytics'); if (!A) return ''; const pv = RNG.prev, ya = RNG.yago; const mT = rs => { let a=0, b=0; rs.forEach(r=>{ a+=r.profit; b+=r.rev; }); return b ? a/b*100 : 0; };
      const rows = ch.map(x=>{ const os = list.filter(o=>o.customer.channel===x.c), perC = x.cust ? x.yr.profit/x.cust : 0; return { c:x.c, cust:x.cust, rev:x.a.rev, profit:x.a.profit, margin:x.a.margin, posts:x.a.posts, cac:x.cac, perC, pay: perC>0 ? x.cac/(perC/12) : null, rp: pv ? objAgg(pv.from,pv.to,os).rev : null, ry: ya ? objAgg(ya.from,ya.to,os).rev : null, _kind:'channel', _id:x.c }; });
      return card('Каналы сбыта', T2({ id:'sales-channels', csv:'sales_channels', cols:[{ key:'c', title:t('an.c.channel'), html:r=>esc(tx(r.c)) }, { key:'cust', title:t('an.c.customers'), kind:'int', sum:'sum' }, { key:'posts', title:t('an.c.posts'), kind:'int', sum:'sum', lo:true }, { key:'rev', title:t('an.c.revenue'), kind:'money', sum:'sum', share:true, cmp:{ prev:r=>r.rp, yago:r=>r.ry } }, { key:'margin', title:t('an.c.margin'), kind:'pct', tot:mT, cls:r=>r.margin<10?'wn':'up' }, { key:'cac', title:t('an.c.cac'), kind:'tenge', lo:true }, { key:'perC', title:t('an.c.profit_cust12'), kind:'money', lo:true }, { key:'pay', title:t('an.c.payback'), kind:'mo', lo:true }], rows, search:false, sort:{ key:'rev', dir:'desc' } }), 'стоимость привлечения — средние расходы на один новый договор'); })(), (()=>{ const A = mod('analytics'); if (!A) return ''; const pv = RNG.prev, ya = RNG.yago, mT = rs => { let a=0, b=0; rs.forEach(r=>{ a+=r.profit; b+=r.rev; }); return b ? a/b*100 : 0; };
      const rows = W.REGIONS.filter(x=>S.region==='all'||x.r===S.region).map(x=>{ const os = list.filter(o=>o.region===x.r), a = objAgg(RNG.from,to,os), arR = W.receivables(to, c=>custFilter(c) && c.region===x.r); return { r:x.r, city:x.city, objects:a.objects, posts:a.posts, rev:a.rev, perPost: a.postDays ? a.rev/a.postDays*30.4 : 0, pd:a.postDays, profit:a.profit, margin:a.margin, ar:arR.total, ar30:arR.overdue30, rp: pv ? objAgg(pv.from,pv.to,os).rev : null, ry: ya ? objAgg(ya.from,ya.to,os).rev : null, _kind:'region', _id:x.r }; }).filter(x=>x.objects || x.rev);
      return card('Регионы и города', T2({ id:'sales-regions', csv:'sales_regions', cols:[{ key:'r', title:t('an.c.region'), html:r=>esc(tx(r.r)) }, { key:'city', title:t('an.c.city'), lo:true, html:r=>esc(tx(r.city)) }, { key:'objects', title:t('an.c.objects'), kind:'int', sum:'sum' }, { key:'posts', title:t('an.c.posts'), kind:'int', sum:'sum' }, { key:'rev', title:t('an.c.revenue'), kind:'money', sum:'sum', share:true, cmp:{ prev:r=>r.rp, yago:r=>r.ry } }, { key:'perPost', title:t('an.c.rev_post'), kind:'tenge', lo:true, tot:rs=>{ let a=0, b=0; rs.forEach(r=>{ a+=r.rev; b+=r.pd; }); return b ? a/b*30.4 : 0; } }, { key:'profit', title:t('an.c.profit'), kind:'money', sum:'sum', lo:true }, { key:'margin', title:t('an.c.margin'), kind:'pct', tot:mT, cls:r=>r.margin<10?'wn':'up' }, { key:'ar', title:t('an.c.ar'), kind:'money', sum:'sum', lo:true }, { key:'ar30', title:t('an.c.ar30'), kind:'money', sum:'sum', lo:true, cls:r=>r.ar30>0?'dn':'' }], rows, search:false, sort:{ key:'rev', dir:'desc' } })); })(), card('Воронка продаж за период', hbar([['Запросы и тендеры',fn.requests],['Коммерческие предложения',fn.kp],['Переговоры и осмотр объекта',fn.neg],['Договоры подписаны',fn.signed],['Объекты запущены',fn.launched]].map(([n,v])=>({n,v,c:'var(--c1)'}))), fn.kp&&fn.neg?`потери: ${P((1-fn.neg/fn.kp)*100)} после КП, ${P((1-fn.signed/fn.neg)*100)} после переговоров`:'')], ar: () => [(()=>{ const ag = W.aging(to, custFilter), tot = ag.notDue+ag.d30+ag.d60+ag.d90+ag.d90p, ar = W.receivables(to, custFilter);
      const rows = [['Срок не наступил',ag.notDue,'var(--age-0)'],['Просрочка 1–30 дней',ag.d30,'var(--age-1)'],['31–60 дней',ag.d60,'var(--age-2)'],['61–90 дней',ag.d90,'var(--age-3)'],['Более 90 дней',ag.d90p,'var(--age-4)']];
      return card(`Дебиторка по срокам на ${dt(to)}`, hbar(rows.map(([n,v,c])=>({n:`${n} · ${P(tot?v/tot*100:0)}`,v,c})),{fmt:v=>MU(v)}) + note(`по выставленным актам ${MU(tot)} · начислено без акта (текущий месяц) ${MU(ar.unbilled)} · всего ${MU(ar.total)}`), 'по выставленным актам'); })()], unit: () => [card(`Юнит-экономика поста на ${dt(to)} · в месяц`, table(['Показатель',...unit.map(u=>u.n)],[
      ['Тариф заказчику (базовый по графику, без НДС)',...unit.map(u=>T(u.t))],['Охранников на пост (FTE по норме ТК РК)',...unit.map(u=>F(u.fte))],[t('k83.u_guard', { a: T(guardPerFte), b: T(W.P.guardSalary[y]), c: F(1+r.employer,3) }),...unit.map(u=>T(u.guard))],['в т. ч. сверхурочные (1,5×) с взносами',...unit.map(u=>T(u.ot))],['Прямые прочие (форма, транспорт, связь — на FTE)',...unit.map(u=>T(u.dir))],['Накладные на пост (администрация, офис, ИТ, коммерческие, прочие)',...unit.map(u=>T(u.oh))],
      ['<b>Прибыль поста</b>',...unit.map(u=>`<b class="${u.profit<0?'dn':'up'}">${T(u.profit)} (${P(u.profit/u.t*100)})</b>`)],['Точка безубыточности (тариф)',...unit.map(u=>T(u.be))],
    ]), t('k83.u_cap', { e: P(r.employer*100), y, m: `${MONF[m0.m]} ${m0.y}`, d: dts(to) }) + ' · ' + t('k84.u_note'))] };
    return h1('Продажи и заказчики') + tabsH + `
    <div class="tiles">${tile('Выручка за период', MU(agg.rev), [deltaLine((a,b)=>objAgg(a,b,list).rev)], '')}${tile('Договоров подписано', fn.signed, [`запущено объектов ${fn.launched} · расторгнуто ${fn.terminated}`], '')}${tile('Воронка: запрос → договор', P(fn.requests?fn.signed/fn.requests*100:0), [`${fn.requests} ${nw(fn.requests,'запросов')} → ${fn.kp} КП → ${fn.neg} переговоров → ${fn.signed} ${nw(fn.signed,'договоров')}${isFiltered()?' · запросы и КП — по компании, договоры — по фильтру':''}`], '')}${tile('Выручка на заказчика', MU(custs.length?agg.rev/custs.length:0), [`за период · ${custs.length} ${nw(custs.length,'заказчиков')} с выручкой`], '')}</div>` + B[tab]().join('');
  }

  // ---------- ФИНАНСЫ ----------
  function finance(tab){
    tab = ['cf','bs'].includes(tab) ? tab : '';
    const to = RNG.to, from = RNG.from, p = W.pl(from,to), pp = RNG.prev?W.pl(RNG.prev.from,RNG.prev.to):null, py = RNG.yago?W.pl(RNG.yago.from,RNG.yago.to):null;
    const cf = W.cashflow(from,to), b = W.balance(to), b0i = Math.max(0,from-1), b0 = W.balance(b0i);
    const ms = months12(to);
    const cfRows = [['Остаток на начало','open'],['Поступления от заказчиков','inCustomers'],['Проценты полученные (остатки на счетах)','interestIn'],['Зарплата на руки','salaries'],['Налоги и взносы по зарплате (удержания и работодатель)','payrollTaxes'],['НДС (за квартал)','vat'],['КПН (авансы и доплата за год)','cit'],['Поставщики и прочие','suppliers'],['<b>Операционный поток</b>','operating'],['Покупка ОС','capex'],['<b>Инвестиционный поток</b>','investing'],['Лизинг — основной долг','leasingPay'],['Лизинг — проценты уплаченные','interestPaid'],['Дивиденды на руки','dividends'],['ИПН с дивидендов (удержан у источника)','divTax'],['<b>Финансовый поток</b>','financing'],['<b>Чистый поток</b>','net'],['<b>Остаток на конец</b>','close']];
    const c2 = RNG.prev?W.cashflow(RNG.prev.from,RNG.prev.to):null, c3 = RNG.yago?W.cashflow(RNG.yago.from,RNG.yago.to):null;
    const cashPts = (() => { const n = RNG.len, step = Math.max(1, Math.ceil(n/62)); const pts=[]; for (let d=from; d<=to; d+=step) pts.push(d); if (pts[pts.length-1]!==to) pts.push(to); return pts; })();
    let minCash = Infinity, minDay = to; for (let d=from; d<=to; d++){ const c = W.balance(d).cash; if (c < minCash){ minCash = c; minDay = d; } }
    const yr = W.pl(Math.max(0,to-364),to), st = b.current;
    const sg = (neg2, v) => (neg2 && Math.abs(conv(v)) >= 5e4 ? '−' : '') + M(v);
    return h1('Финансы', `ОПиУ · ДДС · баланс · капитал · из книги проводок · по компании${isFiltered()?' (фильтр — в отдельной таблице)':''}`) + finTabs(tab) + `
    <div class="tiles">${tile('Выручка', MU(p.revenue), [deltaLine((a,c)=>W.pl(a,c).revenue)], '')}${tile('EBITDA', MU(p.ebitda), [`маржа ${P(p.revenue?p.ebitda/p.revenue*100:0)}`, deltaLine((a,c)=>W.pl(a,c).ebitda)], '')}${tile('Чистая прибыль', MU(p.net), [`${P(p.revenue?p.net/p.revenue*100:0)} от выручки · с начала года ${MU(b.profitYear)}`], '')}${tile(`Деньги на ${dt(to)}`, MU(b.cash), [`за период ${cf.net>=0?'+':''}${MU(cf.net)} · дивиденды ${MU(-cf.dividends)}`], '')}</div>` + ({ '': () => [card(t('pl.title'), plTable(), t('pl.sub')), isFiltered()? card(`Результат объектов фильтра · ${filterLabel()}`, (()=>{ const a=objAgg(from,to); return table(['Статья',U(),'Доля'],[['Выручка',M(a.rev),'100,0 %'],['Охранники (ФОТ с взносами)','−'+M(a.guard),P(a.rev?a.guard/a.rev*100:0)],['Прямые прочие (доля по людям)','−'+M(a.direct),P(a.rev?a.direct/a.rev*100:0)],['Накладные (доля по постам)','−'+M(a.overhead),P(a.rev?a.overhead/a.rev*100:0)],['<b>Результат</b>',`<b>${M(a.profit)}</b>`,P(a.margin)]]); })()) : '', card('Выручка, EBITDA и чистая прибыль · 12 месяцев', lines([{n:'выручка',v:ms.map(x=>conv(W.pl(x.from,x.to).revenue)/1e6*x.rate),c:'var(--c1)'},{n:'EBITDA',v:ms.map(x=>conv(W.pl(x.from,x.to).ebitda)/1e6*x.rate),c:'var(--c3)'},{n:'чистая прибыль',v:ms.map(x=>conv(W.pl(x.from,x.to).net)/1e6*x.rate),c:'var(--c5)'},...(ms.length && ms.every(x=>x.mi>=12) ? [{n:'выручка · '+t('an.c.yago'),v:ms.map(x=>{ const M1 = W.MONTHS[x.mi-12]; return conv(W.pl(M1.start,M1.end).revenue)/1e6; }),c:'var(--fg-3)',dash:true,dots:false}] : [])], ms.map(x=>x.label), {min:0, fmt:v=>F(v,0), unit:U()+' · '+tx('по месяцам'), partialLast: ms.length && ms[ms.length-1].partial}), U()+partNote(ms))], cf: () => [card('ДДС (движение денежных средств)', T2({ id:'fin-cf', csv:'cash_flow', search:false, total:false, pageSize:30, cols:[{ key:'n', title:`${t('an.c.item')} · ${U()}`, html:r=>r.n, sort:false }, { key:'v', title:`${t('an.c.period')}<br><small>${periodTxt()}</small>`, kind:'money', unit:'', cmp:{ prev:r=>r.pv, yago:r=>r.yv, low:r=>r.v<0 } }, { key:'sh', title:t('an.c.share_in'), kind:'pct', lo:true }, ...(c2 ? [{ key:'pv', title:t('an.c.prev'), kind:'money', unit:'', lo:true }] : []), ...(c3 ? [{ key:'yv', title:t('an.c.yago'), kind:'money', unit:'', lo:true }] : [])],
      rows: cfRows.map(([n,k])=>({ n, v:cf[k], sh:['open','close','net','operating','investing','financing','inCustomers'].includes(k) ? null : (cf.inCustomers ? Math.abs(cf[k])/cf.inCustomers*100 : null), pv:c2?c2[k]:null, yv:c3?c3[k]:null, _kind:'line', _id:'cf:'+k, _cls:/<b>/.test(n)?'total':'' })) }),'зарплата — 5-го, поставщики — 15-го, налоги и взносы по зарплате — 25-го за прошлый месяц, аванс КПН — 25-го каждого месяца, доплата КПН за год — 10.04, НДС — за квартал 25-го второго месяца после квартала; оплаты заказчиков — по фактическим датам; проценты по лизингу — отдельной строкой (IAS 7.31)'), (()=>{ const pend = pendingPays(to), fc = W.forecast13(to, pend); const min = fc.reduce((m,w)=>w.cash<m.cash?w:m, fc[0]), pos = fc.some(w=>w.possible);
      return card(`Прогноз денег на 13 недель от ${dt(to)}`, bars(fc.map(w=>conv(w.inflow-w.outflow)/1e6), fc.map(w=>dts(w.from)), {fmt:v=>F(v)+' '+U(), unit:U()+' · '+tx('по неделям'), label:'чистый поток по неделям', values:v=>F(v,0)}) + T2({ id:'fin-fc13', csv:'forecast_13w', search:false, pageSize:13, cols:[{ key:'from', title:t('an.c.week'), html:r=>`${dts(r.from)}–${dts(r.to)}` }, { key:'inflow', title:t('an.c.inflow'), kind:'money', unit:'', sum:'sum' }, { key:'salaries', title:t('an.c.salaries'), kind:'money', unit:'', sum:'sum', lo:true }, { key:'taxes', title:t('an.c.taxes'), kind:'money', unit:'', sum:'sum', lo:true }, { key:'suppliers', title:t('an.c.suppliers'), kind:'money', unit:'', sum:'sum', lo:true }, { key:'other', title:t('an.c.fc_other'), kind:'money', unit:'', sum:'sum', lo:true, tip:t('an.c.fc_other_tip') }, { key:'net', title:t('an.c.netflow'), kind:'money', unit:'', sum:'sum', cum:true }, { key:'cash', title:t('an.c.cash_end'), kind:'money', unit:'', tot:rs=>rs.length?rs[rs.length-1].cash:null, html:r=>`<b class="${r.cash<30e6?'dn':''}">${M(r.cash)}</b>` }, ...(pos ? [{ key:'possible', title:t('an.c.fc_possible'), kind:'money', unit:'', sum:'sum', lo:true, tip:t('an.c.fc_possible_tip') }, { key:'cashAll', title:t('an.c.fc_cash_all'), kind:'money', unit:'', lo:true, tot:rs=>rs.length?rs[rs.length-1].cashAll:null }] : [])], rows: fc.map(w=>({ ...w, net:w.inflow-w.outflow })) }),t('k83.fc_cap', { u: U(), v: M(min.cash), d: dts(min.from) }) + (pos ? t('k83.fc_pos', { x: pend.map(x=>`${tx(x.title)} — ${M(x.amount)}`).join('; ') }) : '')); })(), card('Остаток денег по дням', lines([{n:'остаток на конец дня',v:cashPts.map(d=>conv(W.balance(d).cash)/1e6),c:'var(--c1)',dots:cashPts.length<=31}], cashPts.map(d=>dts(d)), {fmt:v=>F(v,0), unit:U()}), `минимум за период ${M(minCash)} (${dt(minDay)})`)], bs: () => [card(`Баланс на ${dt(to)}`, (()=>{ const R0 = (n,k,neg2,tot) => ({ n, v: k==='pass' ? b.liabilities+b.equity : b[k], v0: k==='pass' ? b0.liabilities+b0.equity : b0[k], neg:neg2, _kind: k==='pass' ? null : 'line', _id: 'bs:'+k, _cls: tot ? 'total' : '' });
      const cols = (side, base) => [{ key:'n', title:`${side} · ${U()}`, html:r=>r.n, sort:false }, { key:'v', title:dt(to), kind:'num', fmt:(v,r)=>sg(r.neg,v) }, { key:'v0', title:dt(b0i), kind:'num', lo:true, fmt:(v,r)=>sg(r.neg,v) }, { key:'chg', title:t('an.c.change'), kind:'num', val:r=>r.v-r.v0, fmt:v=>(v>=0?'+':'−')+M(Math.abs(v)) }, { key:'chgp', title:t('an.c.change_pct'), kind:'num', lo:true, val:r=>r.v0?(r.v/r.v0-1)*100:null, html:r=>delta(r.v, r.v0) }, { key:'sh', title:t('an.c.share_bs'), kind:'pct', lo:true, val:r=>base?r.v/base*100:null }];
      const o = { search:false, total:false, pageSize:30 };
      return `<div class="two">${T2({ ...o, id:'fin-bs-a', csv:'balance_assets', cols:cols(t('an.c.assets'), b.assets), rows:[R0('Деньги','cash'),R0('Дебиторка заказчиков (с НДС)','ar'),R0('Запасы склада','inv'),R0('Основные средства, нетто','faNet'),R0('<b>Итого активы</b>','assets',false,true)] })}${T2({ ...o, id:'fin-bs-l', csv:'balance_liabilities', cols:cols(t('an.c.liabs'), b.liabilities+b.equity), rows:[R0('Поставщики','ap'),R0('Зарплата к выплате','salpay'),R0('Налоги и взносы по зарплате','paytax'),R0('НДС к уплате (квартал)','vat'),R0('КПН к уплате (− переплата авансов)','citpay'),...(b.divtax||b0.divtax ? [R0('ИПН с дивидендов к уплате','divtax')] : []),R0('Резерв отпусков (IAS 19)','vacres'),R0('Лизинг — текущая часть','leasingCur'),R0('Лизинг — долгосрочная часть','leasingLong'),R0('<b>Итого обязательства</b>','liabilities',false,true),R0('Уставный капитал','charter'),R0('Резервный капитал','reserve'),R0('Нераспределённая прибыль на начало года','reStart'),R0('Прибыль с начала года','profitYear'),R0('Дивиденды с начала года','dividendsYear',true),...(b.toReserveYear||b0.toReserveYear ? [R0('Отчисления в резерв с начала года','toReserveYear',true)] : []),R0('<b>Итого капитал</b>','equity',false,true),R0('<b>Итого пассивы</b>','pass',false,true)] })}</div>`; })(),`сравнение с балансом на ${dt(b0i)} · активы = обязательства + капитал (двойная запись)`), card('Капитал и коэффициенты', `<div class="wk">
      <div><div class="t">Собственный капитал</div><div class="v">${MU(b.equity)}</div><div class="d">${P(b.equity/b.assets*100)} активов · автономия ${b.equity/b.assets>=0.5?'выше':'ниже'} нормы 50 %</div></div>
      <div><div class="t">Текущая ликвидность</div><div class="v">${F((b.cash+b.ar)/st,2)}</div><div class="d">(деньги + дебиторка) ÷ краткосрочные обязательства (с резервом отпусков и текущей частью лизинга) · норма ≥ 1,2</div></div>
      <div><div class="t">ROE за 12 месяцев</div><div class="v">${P(yr.net/b.equity*100)}</div><div class="d">чистая прибыль 12 мес. ÷ капитал на дату</div></div>
      <div><div class="t">Оборачиваемость дебиторки</div><div class="v">${N(b.ar/(revVat(Math.max(0,to-364),to)/365))} дн.</div><div class="d">дебиторка ÷ выручка с НДС (по ставке каждого дня) в день за 12 мес.</div></div>
      <div><div class="t">Долг / EBITDA</div><div class="v">${F(b.leasing/Math.max(1,yr.ebitda),2)}</div><div class="d">только лизинг авто · кредитов нет</div></div>
      <div><div class="t">Дивидендная способность</div><div class="v">${MU(Math.max(0,divCap(to)))}</div><div class="d">минимум прогноза денег на 13 недель (с утверждёнными выплатами) − резерв 30 млн ₸</div></div></div>`, '', `на ${dt(to)}`)] }[tab] || (() => ['']))().join('');
  }
  // вкладки финансов: ОПиУ · ДДС · Баланс · Капитал (подписи — из словаря модуля капитала, 9.2.1)
  function finTabs(cur){ const nm = String(t('eq.tab_main')).split(' · '), TB = [['', nm[0]], ['cf', nm[1] || 'ДДС'], ['bs', nm[2] || 'Баланс'], ...(SECTIONS['finance-eq'] ? [['eq', t('eq.tab')]] : [])];
    return `<div class="tabs">${TB.map(([k,n])=>`<a href="#finance${k?'-'+k:''}" class="${cur===k?'on':''}"${cur===k?' aria-current="page"':''}>${n}</a>`).join('')}</div>`; }
  function taxesSec(){
    const to = RNG.to, t = W.taxes(RNG.from,to), r = t.rates, ms = months12(to), b = W.balance(to), up = W.upcoming(to), ys = t.years;
    const f200 = (()=>{ for (const [mm,dd] of [[1,15],[4,15],[7,15],[10,15]]){ const d = W.idxOf(W.yOf(to), mm, dd); if (d > to) return d; } return W.idxOf(W.yOf(to)+1, 1, 15); })();
    const load = t.fotGross ? t.employerSum/t.fotGross*100 : r.employer*100, mName = k => k>=0 ? MONF[W.MONTHS[k].m]+' '+W.MONTHS[k].y : '—';
    const T8 = I18N.t, ratesTxt = ys.length > 1 ? ys.map(y=>`${y} — ${P(W.RATES[y].employer*100)}`).join(' · ') : T8('k83.t_rates', { y: ys[0] });
    return h1('Налоги и социальные отчисления', T8('k83.t_sub', { y: ys.join('/') })) + `
    <div class="tiles">${tile('Начислено за период', MU(t.total), [`удержания с сотрудников ${MU(t.employee)} · взносы работодателя ${MU(t.employerSum)}`, T8('k83.t_acc2', { a: MU(t.vat), b: MU(t.cit) }) + (t.divIpn ? T8('k83.t_div', { v: MU(t.divIpn) }) : '')], '')}${tile('Уплачено за период', MU(t.paid), [T8('k83.t_paid')], '')}${tile(`К уплате ${dt(up.taxDay)}`, MU(up.tax), [T8('k83.t_due1', { m: mName(up.taxFor), a: MU(up.taxPay), c: MU(up.taxCit) }) + (up.taxVat ? T8('k83.t_due_vat', { q: up.vatQ%4+1, y: W.Y0+Math.floor(up.vatQ/4), v: MU(up.taxVat) }) : '') + (up.taxDiv ? T8('k83.t_div', { v: MU(up.taxDiv) }) : ''), T8('k83.t_due2', { d: dt(to), v: MU(b.taxes) })], '')}${tile('Нагрузка на ФОТ', P(load), [T8('k83.t_load1', { x: ratesTxt }), T8('k83.t_load2', { a: P(t.fotGross ? t.employee/t.fotGross*100 : 0), b: P(r.vat*100) }) + (W.yOf(to)===2026 ? T8('k83.t_vat26') : '')], '')}</div>
    ${(()=>{ const L = I18N.t, tp = RNG.prev ? W.taxes(RNG.prev.from,RNG.prev.to) : null, ty = RNG.yago ? W.taxes(RNG.yago.from,RNG.yago.to) : null;
      const divP = W.accTurn('dividends', RNG.from, to);   // ИПН с дивидендов — эффективная ставка периода (освобождение 30 000 МРП, 5 % / 15 % — по году нарастающим итогом)
      const TX = [['ИПН','ipn','tax.base.ipn','удерживается с сотрудника'],['ОПВ','opv','tax.base.opv','удерживается с сотрудника'],['ВОСМС','vosms','tax.base.vosms','удерживается с сотрудника'],['СО','so','tax.base.so','работодатель'],['ООСМС','oosms','tax.base.oosms','работодатель'],['ОПВР','opvr','tax.base.opvr','работодатель'],[r.snNet ? 'СН за вычетом СО' : L('k83.t_sn'),'sn',r.snNet ? 'tax.base.sn' : 'tax.base.sn26','работодатель'],['НДС (выход − зачёт)','vat','tax.base.vat','Агентство'],['КПН','cit','tax.base.cit','Агентство'],[L('cards.tax.divIpn'),'divIpn','tax.base.div',L('k83.t_founder')]];
      return card('Расчёт за период', T2({ id:'taxes-calc', csv:'taxes', search:false, pageSize:20, cols:[{ key:'n', title:L('an.c.tax') }, { key:'rate', title:L('an.c.rate'), kind:'pct', sum:'none', tip:L('an.c.rate_tip', { y: ys.join('/') }) }, { key:'base', title:L('an.c.base'), lo:true }, { key:'v', title:L('an.c.amount'), kind:'money', sum:'sum', share:true, cmp:{ low:true, prev:x=>tp?tp[x.k]:null, yago:x=>ty?ty[x.k]:null } }, { key:'who', title:L('an.c.payer'), lo:true }],
        rows: TX.map(([n,k,base,who])=>({ n, k, rate:(k==='divIpn' ? (divP ? t.divIpn/divP : r.divTax) : r[k])*100, base:L(base), v:t[k], who, _kind:'line', _id:'tax:'+k })) }), L('k83.t_calc', { v: MU(t.fotGross), x: ratesTxt })); })()}
    ${card('Налоги по месяцам · 12 месяцев', bars(ms.map(x=>conv(W.taxes(x.from,x.to).total)/1e6*x.rate), ms.map(plabel), {values:v=>F(v,0), color:'var(--c1)', unit:U()+' · '+tx('по месяцам'), fmt:v=>F(v)+' '+U(), hollow:ms.map(x=>x.partial)}), U()+' · начислено'+partNote(ms))}
    ${card(`Налоговый календарь от ${dt(to)}`, (()=>{ const pm = W.upcoming(Math.max(0, up.taxDay-31)), vn = up.vatNext, cy = up.citYear;
      const adv = (()=>{ for (const [mm,dd,f] of [[0,20,'101.01'],[3,20,'101.02']]){ const d = W.idxOf(W.yOf(to), mm, dd); if (d > to) return [d,f]; } return [W.idxOf(W.yOf(to)+1,0,20),'101.01']; })();
      const C = [[up.taxDay,T8('k83.c_pay', { m: mName(up.taxFor) }),up.taxPay,pm.taxPay,'tax:payroll'],[up.taxDay,T8('k83.c_adv'),up.taxCit,pm.taxCit,'tax:cit'],
        ...(up.taxDiv ? [[up.taxDay,T8('k83.c_div'),up.taxDiv,null,'tax:divIpn']] : []),
        [vn.f300,T8('k83.c_300', { q: vn.qn, y: vn.y }),null,null,null],[vn.day,T8('k83.c_vat', { q: vn.qn, y: vn.y }) + (vn.complete ? '' : T8('k83.c_acc', { d: dts(to) })),vn.amount,null,'tax:vat'],
        [f200,'форма 200.00 за квартал (ИПН и социальные платежи)',null,null,null],[adv[0],T8('k83.c_101', { f: adv[1] }),null,null,null],
        [cy.decl,T8('k83.c_100', { y: cy.y }),null,null,null],[cy.day,T8(W.yOf(to)===cy.y ? 'k83.c_settle_est' : 'k83.c_settle', { y: cy.y }),cy.settle,null,'tax:cit']].sort((x,y)=>x[0]-y[0]);
      return T2({ id:'taxes-calendar', csv:'tax_calendar', search:false, cols:[{ key:'d', title:I18N.t('an.c.date'), kind:'date' }, { key:'w', title:I18N.t('an.c.item') }, { key:'v', title:I18N.t('an.c.amount'), kind:'money', sum:'sum', share:true }, { key:'p', title:I18N.t('an.c.prev'), kind:'money', lo:true, sum:'sum' }, { key:'dd', title:I18N.t('an.c.change_pct'), kind:'num', lo:true, val:r=>r.p?(r.v/r.p-1)*100:null, html:r=>r.p?delta(r.v,r.p,true):'—' }], rows: C.map(([d,w,v,p,k])=>({ d, w, v, p, ...(k && k!=='tax:payroll' ? { _kind:'line', _id:k } : {}) })), note:`${I18N.t('an.c.prev')}: ${dt(pm.taxDay)}` }); })(), T8('k83.c_note'))}`;
  }
  // ---------- БЮДЖЕТ И ПЛАНИРОВАНИЕ ----------
  // План каждого года утверждён в начале года: факт того же месяца прошлого года × целевой рост бюджета. Факт текущего года на план не влияет.
  const hb = (a,b,c) => { let x = (a*2654435761 ^ b*40503 ^ c*2246822519)>>>0; x = Math.imul(x ^ (x>>>15), 2246822519)>>>0; x = Math.imul(x ^ (x>>>13), 3266489917)>>>0; return ((x ^ (x>>>16))>>>0)/4294967296; };
  const BIAS = { revenue:{2022:0.015}, cost:{2022:0.004} };   // первый год истории: план чуть выше факта
  // целевой рост в бюджете года к факту прошлого года (утверждается в начале года, факт текущего года на план не влияет)
  const TARGET = { revenue:{2023:0.40,2024:0.38,2025:0.28,2026:0.22}, cost:{2023:0.36,2024:0.33,2025:0.30,2026:0.24} };
  const FIXED = new Set([8, 11, 26, 27, 43, 82]);   // ИТ и CRM (договор), ОС и лизинг, дивиденды, оборудование, лизинг авто — план = решение / договор
  const noiseM = (mi, kind) => 1 + 0.025*(hb(mi, kind==='revenue'?1:2, 9)-0.5);   // общий для всех статей одного вида в месяце
  function planMonth(fn, kind, lineId, mi){
    const M0 = W.MONTHS[mi];
    if (FIXED.has(lineId)) return fn(M0.start, M0.end);
    if (M0.y === W.Y0) return fn(M0.start, M0.end) * (1 + (BIAS[kind][M0.y]||0)) * noiseM(mi, kind);   // первый год истории: прошлого года в данных нет
    const P0 = W.MONTHS[mi-12], g = TARGET.revenue[M0.y] ?? 0.2; let base = fn(P0.start, P0.end);
    if (lineId===24){ const q = m => W.R(W.MONTHS[Math.max(0, m)].start).vat, vr = q(mi-2) / q(mi-14); base = -W.cashflow(P0.start, P0.end).vat * vr; }   // НДС за квартал — 25-го второго месяца после квартала; ставка — квартала, за который платится
    if (lineId===25) base = Math.max(0, base - Math.max(0, W.pl(P0.start, P0.end).it - W.P.system.monthly));                                                 // разовый запуск прошлого года в план не переносится
    const EFF = {2023:1.0, 2024:1.0, 2025:0.93, 2026:0.985};   // целевая экономия расходов в бюджете года (2025 — программа наведения порядка)
    return base * (1 + g) * (kind==='cost' ? (EFF[M0.y] ?? 0.99) : 1) * noiseM(mi, kind);
  }
  function planOf(fn, kind, lineId, a, b){        // план периода = план месяцев пропорционально дням
    let s = 0;
    for (let mi = W.monthIdx(Math.max(a,0)); mi <= W.monthIdx(Math.min(b, W.DAYS-1)); mi++){
      const M0 = W.MONTHS[mi], x = Math.max(a, M0.start), y = Math.min(b, M0.end); if (y < x) continue;
      s += planMonth(fn, kind, lineId, mi) * (y-x+1)/M0.dim;
    }
    return s;
  }
  const factOf = (fn, a, b) => fn(a, Math.min(b, RNG.to));
  const isFc = mi => W.MONTHS[mi].start > RNG.to;
  const EX = (f, p) => p > 0 ? P(f/p*100) : '<span class="dl">—</span>';   // исполнение плана: при нулевом или отрицательном плане процент не считается
  const devCell = (f, p, low) => { if (!p) return ['—','—']; const d = f - p, good = low ? d <= 0 : d >= 0, pct = Math.abs(conv(p)) < 1e6 ? null : d/Math.abs(p)*100; return [`<span class="${good?'up':'dn'}">${d>=0?'+':''}${M(d)}</span>`, pct==null ? '<span class="dl">—</span>' : `<span class="${good?'up':'dn'}">${pct>=0?'+':'−'}${F(Math.abs(pct))} %</span>`]; };
  // линии бюджета: [id, название, функция(from,to), вид, меньше-лучше]
  const LINES = {
    bdr: [   // порядок — как в ОПиУ: себестоимость, коммерческие, административные; коммерческие выделены из статей администрации (итоги прежние)
      [1,'Выручка',(a,b)=>W.pl(a,b).revenue,'revenue',false],
      [2,'Охранники (ФОТ с взносами)',(a,b)=>W.pl(a,b).guardC,'cost',true],
      [4,'Форма и спецсредства',(a,b)=>W.pl(a,b).uniform,'cost',true],
      [5,'Транспорт и ГСМ',(a,b)=>W.pl(a,b).transport,'cost',true],
      [6,'Связь',(a,b)=>W.pl(a,b).comms,'cost',true],
      [10,'Коммерческая служба (ФОТ с взносами)',(a,b)=>plStaff('adminC')(a,b),'cost',true],
      [12,'Тендеры, реклама, представительские',(a,b)=>plSelling(a,b),'cost',true],
      [11,'CRM коммерческой службы',(a,b)=>W.pl(a,b).crm,'cost',true],
      [3,'Администрация (ФОТ с взносами)',(a,b)=>W.pl(a,b).adminC - plStaff('adminC')(a,b),'cost',true],
      [7,'Офис и аренда',(a,b)=>W.pl(a,b).office,'cost',true],
      [8,'ИТ и программное обеспечение',(a,b)=>W.pl(a,b).it,'cost',true],
      [9,'Прочие',(a,b)=>W.pl(a,b).other,'cost',true],
    ],
    cf: [
      [21,'Поступления от заказчиков',(a,b)=>W.cashflow(a,b).inCustomers,'revenue',false],
      [20,'Проценты по остаткам на счетах',(a,b)=>W.cashflow(a,b).interestIn,'revenue',false],
      [22,'Зарплата',(a,b)=>-W.cashflow(a,b).salaries,'cost',true],
      [23,'Налоги и взносы по зарплате',(a,b)=>-W.cashflow(a,b).payrollTaxes,'cost',true],
      [24,'НДС (за квартал)',(a,b)=>-W.cashflow(a,b).vat,'cost',true],
      [28,'КПН (авансы и доплата за год)',(a,b)=>-W.cashflow(a,b).cit,'cost',true],
      [25,'Поставщики',(a,b)=>-W.cashflow(a,b).suppliers,'cost',true],
      [26,'Покупка ОС и лизинг (с процентами)',(a,b)=>{ const c = W.cashflow(a,b); return -(c.capex+c.leasingPay+c.interestPaid); },'cost',true],
      [27,'Дивиденды (с ИПН у источника)',(a,b)=>{ const c = W.cashflow(a,b); return -(c.dividends+c.divTax); },'cost',true],
    ],
    supply: [
      [41,'Форма, обувь, спецсредства',(a,b)=>W.pl(a,b).uniform,'cost',true],
      [42,'Связь и рации',(a,b)=>W.pl(a,b).comms,'cost',true],
      [43,'Оборудование и автомобили (покупка ОС)',(a,b)=>-W.cashflow(a,b).capex,'cost',true],
      [44,'Прочие закупки',(a,b)=>W.pl(a,b).other*0.4,'cost',true],
    ],
    hr: [
      [61,'ФОТ охранников с взносами',(a,b)=>W.pl(a,b).guardC,'cost',true],
      [62,'ФОТ администрации с взносами',(a,b)=>W.pl(a,b).adminC - plStaff('adminC')(a,b),'cost',true],
      [63,'ФОТ коммерческой службы с взносами',(a,b)=>plStaff('adminC')(a,b),'cost',true],
    ],
    fleet: [
      [81,'Транспорт и ГСМ',(a,b)=>W.pl(a,b).transport,'cost',true],
      [82,'Лизинг автомобилей (платежи)',(a,b)=>{ const c = W.cashflow(a,b); return -(c.leasingPay+c.interestPaid); },'cost',true],
    ],
  };
  const sumLines = (ls, a, b, plan) => ls.reduce((s,l)=>s + (l[3]==='revenue'?1:-1) * (plan ? planOf(l[2],l[3],l[0],a,b) : factOf(l[2],a,b)), 0);
  // администрация по должностям (орг. структура и коммерческая служба в ОПиУ): 7 ключевых должностей + остальные по очереди укомплектования
  const adminSplit = n => { const r = Math.max(0, n - 7), order = ['m','a','h','s','f','o','d','m','f','a','d','h','s','m','f','o','o','o','o','o']; const c = { m:0,a:0,h:0,s:0,f:0,d:0,o:0 }; order.slice(0, r).forEach(k=>c[k]++); c.o += Math.max(0, r - order.length); return c; };
  // ---------- ОПиУ по уровням (0.8.2): форма МСФО (IAS 1), расходы по функциям ----------
  // Каждая строка — функция счёта книги проводок за любой отрезок дней; подстатьи в сумме = статье, разделы = итогу, чистая прибыль = W.pl().net.
  // ФОТ и взносы работодателя делятся из одной статьи «ФОТ с взносами» по ставкам своего года (W.RATES): ФОТ = статья ÷ (1 + взносы),
  // взносы = статья − ФОТ, по видам: СО, ООСМС, ОПВР, СН за вычетом СО — в той же доле, что в ставке взносов (сумма видов = взносам).
  const PL_KIND = o => /вахта/.test(o.sched) ? 'vahta' : (o.is24 ? 't24' : 'tday');
  const PL_TAX = ['so','oosms','opvr','sn'];
  // закон по годам — таблица, НЕЗАВИСИМАЯ от W.RATES (для сверки «модель = закон» в «О расчёте» и «Качестве данных»; по первоисточникам, подтверждает бухгалтер):
  // ИПН 10 % (с 2026 — 15 % сверх 8 500 МРП в год), стандартный вычет 14 МРП, с 2026 — 30 МРП; СО 3,5 % → 5 % с 2025 от (оклад − ОПВ); ООСМС 3 %; ОПВР 1,5/2,5/3,5 % с 2024 (за родившихся после 01.01.1975);
  // СН 9,5 % → 11 % с 2025 от (оклад − ОПВ − ВОСМС) минус СО; с 2026 — 6 % без уменьшения на СО (НК РК 2026); ИПН с дивидендов: 2022 — 5 %, 2023–2025 — 10 % сверх 30 000 МРП в год, 2026 — 5 % до 230 000 МРП и 15 % сверх
  const LAW = { ipn:{2022:.10,2023:.10,2024:.10,2025:.10,2026:.10}, ipnTop:{2026:.15}, ipnTopMrp:{2026:8500}, dedMrp:{2022:14,2023:14,2024:14,2025:14,2026:30},
    opv:{2022:.10,2023:.10,2024:.10,2025:.10,2026:.10}, vosms:{2022:.02,2023:.02,2024:.02,2025:.02,2026:.02}, so:{2022:.035,2023:.035,2024:.035,2025:.05,2026:.05}, oosms:{2022:.03,2023:.03,2024:.03,2025:.03,2026:.03},
    opvr:{2022:0,2023:0,2024:.015,2025:.025,2026:.035}, sn:{2022:.095,2023:.095,2024:.095,2025:.11,2026:.06}, vat:{2022:.12,2023:.12,2024:.12,2025:.12,2026:.16}, cit:{2022:.2,2023:.2,2024:.2,2025:.2,2026:.2},
    mrp:{2022:3063,2023:3450,2024:3692,2025:3932,2026:4325}, divTax:{2022:.05,2023:.10,2024:.10,2025:.10,2026:.05}, divFree:{2023:30000,2024:30000,2025:30000}, divCap:{2026:230000}, divTop:{2026:.15} };
  const lawOf = (k, y) => LAW[k] && LAW[k][y] != null ? LAW[k][y] : 0;
  // доля ФОТ работников, родившихся после 01.01.1975 (ОПВР) — данные штата, не ставка закона
  const LAW_EMP = y => { const so = lawOf('so',y)*(1-lawOf('opv',y)), sn = lawOf('sn',y)*(1-lawOf('opv',y)-lawOf('vosms',y)) - (y < 2026 ? so : 0); return so + lawOf('oosms',y) + lawOf('opvr',y)*W.P.opvrShare + Math.max(0, sn); };
  // ИПН с дивидендов по закону года, нарастающим итогом за год (before — начислено с 01.01 до выплаты, a — выплата)
  const LAW_DIV = (y, before, a) => { const c1 = before + a, T = lawOf('divCap',y)*lawOf('mrp',y), F0 = lawOf('divFree',y)*lawOf('mrp',y);
    if (T) return lawOf('divTax',y)*(Math.min(c1,T)-Math.min(before,T)) + lawOf('divTop',y)*(Math.max(0,c1-T)-Math.max(0,before-T));
    return lawOf('divTax',y)*(Math.max(0,c1-F0)-Math.max(0,before-F0)); };
  // доли «ФОТ с взносами»: ФОТ = статья ÷ (1 + взносы года); виды взносов — по ставкам и базам закона (СО — от оклада − ОПВ, СН — от оклада − ОПВ − ВОСМС, до 2026 — минус СО)
  const plPart = (y, part) => { if (!part) return 1; if (typeof part === 'function') return part(y); const r = W.RATES[y], e = r.employer; if (part==='fot') return 1/(1+e); if (part==='tax') return e/(1+e); return ({ so:r.soEff, sn:r.snEff, oosms:r.oosms, opvr:r.opvrEff })[part] / (1+e); };
  const ySegs = (a, b) => { const out = []; a = Math.max(0, a); b = Math.min(b, W.DAYS-1); while (a <= b){ const y = W.yOf(a), e = Math.min(b, W.idxOf(y,11,31)); out.push([a, e, y]); a = e+1; } return out; };
  const mSegs = (a, b) => { const out = []; a = Math.max(0, a); b = Math.min(b, W.DAYS-1); if (b < a) return out; for (let mi = W.monthIdx(a); mi <= W.monthIdx(b); mi++){ const M0 = W.MONTHS[mi]; out.push([Math.max(a, M0.start), Math.min(b, M0.end), mi]); } return out; };
  const plAcc = k => (x, y) => x > y ? 0 : W.accTurn(k, x, y);
  const revVat = (a, b) => ySegs(a, b).reduce((s0, [x, y, yr]) => s0 + W.pl(x, y).revenue * (1 + W.RATES[yr].vat), 0);   // выручка с НДС по ставке своего года (DSO, оборачиваемость)
  const plInc = k => (x, y) => x > y ? 0 : -W.accTurn(k, x, y);
  // коммерческие расходы (IAS 1, функция «продажи») — собственные счета книги проводок: тендеры (подготовка заявок, банковские гарантии, ЭЦП),
  // реклама и сайт, представительские, подписка CRM (Битрикс24); коммерческая служба (коммерческий директор и менеджеры из орг. структуры) —
  // доля в численности администрации на каждый день (оклад у всей администрации один — W.P.adminSalary)
  const salesStaff = i => { const n = W.adminCount(Math.max(0, Math.min(i, W.DAYS-1))); return n ? (1 + adminSplit(n).m) / n : 0; };
  const SALES_C = new WeakMap();
  const salesCache = () => { let c = SALES_C.get(W); if (!c){ c = {}; SALES_C.set(W, c); } return c; };
  const plStaff = acc => { const c = salesCache(), k = 'p:' + acc; if (!c[k]){ const p = new Float64Array(W.DAYS + 1); for (let i = 0; i < W.DAYS; i++) p[i+1] = p[i] + W.accTurn(acc, i, i) * salesStaff(i); c[k] = p; } const p = c[k]; return (x, y) => { x = Math.max(0, x); y = Math.min(y, W.DAYS-1); return y < x ? 0 : p[y+1] - p[x]; }; };
  const plRest = (acc, sub) => (x, y) => x > y ? 0 : W.accTurn(acc, x, y) - sub(x, y);
  const SALES_ACC = ['tenders','ads','repr'];
  const plSelling = (a, b) => SALES_ACC.reduce((s0, k) => s0 + W.accTurn(k, a, b), 0);
  const plSum = (os, k) => (x, y) => { let s = 0; for (const o of os) s += W.sumO(o, k, x, y); return s; };
  // скелет дерева: keep(base) — оставлять ли строку (в таблице — есть сумма хотя бы в одном из сравниваемых отрезков; для карточки — всё)
  function plSkel(keep){
    const L = [], add = n => (L.push(n), n), RG = W.REGIONS.map((rg, k) => ({ rg, k }));
    const leaf = (id, p, lvl, name, base, sign, line, more) => add({ id, p, lvl, kind:'item', name, base, sign, line, ...(more || {}) });
    add({ id:'revenue', lvl:1, kind:'sec', sign:1, name:'pl.n.revenue' });
    for (const tk of ['t24','tday','vahta']){
      const os = W.objects.filter(o => PL_KIND(o) === tk); if (!os.length || !keep(plSum(os,'rev'))) continue;
      leaf('revenue.'+tk, 'revenue', 2, 'pl.n.rev_'+tk, plSum(os,'rev'), 1, 1);
      for (const { rg, k } of RG){ const ro = os.filter(o => o.region === rg.r); if (!ro.length || !keep(plSum(ro,'rev'))) continue;
        leaf(`revenue.${tk}.r${k}`, 'revenue.'+tk, 3, rg.r, plSum(ro,'rev'), 1, 1, { raw:'region', reg: rg.r });
        for (const o of ro){ const b0 = plSum([o],'rev'); if (keep(b0)) leaf(`revenue.${tk}.r${k}.o${o.id}`, `revenue.${tk}.r${k}`, 4, o.name, b0, 1, 1, { raw:'object', obj:o }); } }
    }
    add({ id:'cogs', lvl:1, kind:'sec', sign:-1, name:'pl.n.cogs' });
    leaf('guardFot', 'cogs', 2, 'pl.n.guardFot', plSum(W.objects,'guard'), -1, 2, { part:'fot' });
    add({ id:'guardOt', p:'guardFot', lvl:3, kind:'memo', name:'pl.n.guardOt', base:(x, y) => x > y ? 0 : W.overtime(x, y).cost, sign:-1, part:'fot' });   // «в т. ч.» — в сумму подстатей не входит
    for (const { rg, k } of RG){ const ro = W.objects.filter(o => o.region === rg.r); if (!ro.length || !keep(plSum(ro,'guard'))) continue;
      leaf(`guardFot.r${k}`, 'guardFot', 3, rg.r, plSum(ro,'guard'), -1, 2, { part:'fot', raw:'region', reg: rg.r });
      for (const o of ro){ const b0 = plSum([o],'guard'); if (keep(b0)) leaf(`guardFot.r${k}.o${o.id}`, `guardFot.r${k}`, 4, o.name, b0, -1, 2, { part:'fot', raw:'object', obj:o }); } }
    leaf('guardTax', 'cogs', 2, 'pl.n.guardTax', plSum(W.objects,'guard'), -1, 2, { part:'tax' });
    PL_TAX.forEach(x => leaf('guardTax.'+x, 'guardTax', 3, 'pl.n.tax_'+x, plSum(W.objects,'guard'), -1, 2, { part:x, months:true }));
    leaf('uniform', 'cogs', 2, 'pl.n.uniform', plAcc('uniform'), -1, 4, { months:true });
    leaf('transport', 'cogs', 2, 'pl.n.transport', plAcc('transport'), -1, 5, { months:true });
    leaf('comms', 'cogs', 2, 'pl.n.comms', plAcc('comms'), -1, 6, { months:true });
    add({ id:'gross', lvl:1, kind:'tot', of:['revenue','cogs'], name:'pl.n.gross' });
    add({ id:'grossM', lvl:1, kind:'pct', num:'gross', name:'pl.n.grossM' });
    const sAdm = plStaff('adminC');
    add({ id:'sales', lvl:1, kind:'sec', sign:-1, name:'pl.n.sales' });
    leaf('salesFot', 'sales', 2, 'pl.n.salesFot', sAdm, -1, 10, { part:'fot', months:true });
    leaf('salesTax', 'sales', 2, 'pl.n.salesTax', sAdm, -1, 10, { part:'tax' });
    PL_TAX.forEach(x => leaf('salesTax.'+x, 'salesTax', 3, 'pl.n.tax_'+x, sAdm, -1, 10, { part:x, months:true }));
    for (const g of SALES_ACC) leaf('sales.'+g, 'sales', 2, 'pl.n.sales_'+g, plAcc(g), -1, 12, { months:true });
    leaf('crm', 'sales', 2, 'pl.n.crm', plAcc('crm'), -1, 11, { months:true });
    add({ id:'admin', lvl:1, kind:'sec', sign:-1, name:'pl.n.admin' });
    const aAdm = plRest('adminC', sAdm);
    leaf('adminFot', 'admin', 2, 'pl.n.adminFot', aAdm, -1, 3, { part:'fot', months:true });
    leaf('adminTax', 'admin', 2, 'pl.n.adminTax', aAdm, -1, 3, { part:'tax' });
    PL_TAX.forEach(x => leaf('adminTax.'+x, 'adminTax', 3, 'pl.n.tax_'+x, aAdm, -1, 3, { part:x, months:true }));
    leaf('office', 'admin', 2, 'pl.n.office', plAcc('office'), -1, 7, { months:true });
    leaf('it', 'admin', 2, 'pl.n.it', plAcc('it'), -1, 8, { months:true });
    leaf('other', 'admin', 2, 'pl.n.other', plAcc('other'), -1, 9, { months:true });
    add({ id:'ebitda', lvl:1, kind:'tot', of:['gross','sales','admin'], name:'pl.n.ebitda' });
    add({ id:'ebitdaM', lvl:1, kind:'pct', num:'ebitda', name:'pl.n.ebitdaM' });
    add({ id:'dep', lvl:1, kind:'sec', sign:-1, name:'pl.n.dep', base: plAcc('dep'), months:true });
    add({ id:'ebit', lvl:1, kind:'tot', of:['ebitda','dep'], name:'pl.n.ebit' });
    add({ id:'fin', lvl:1, kind:'sec', sign:1, name:'pl.n.fin' });
    leaf('interest', 'fin', 2, 'pl.n.interest', plAcc('interest'), -1, null, { months:true });
    leaf('finInc', 'fin', 2, 'pl.n.finInc', plInc('finInc'), 1, null, { months:true });
    add({ id:'ebt', lvl:1, kind:'tot', of:['ebit','fin'], name:'pl.n.ebt' });
    add({ id:'cit', lvl:1, kind:'sec', sign:-1, name:'pl.n.cit', base: plAcc('cit'), months:true });
    add({ id:'net', lvl:1, kind:'tot', of:['ebt','cit'], name:'pl.n.net' });
    add({ id:'netM', lvl:1, kind:'pct', num:'net', name:'pl.n.netM' });
    return L;
  }
  // значение строки со своей базой за отрезок (со знаком: доход +, расход −)
  const plVal = (n, x, y) => { if (y < x || !n.base) return 0; if (!n.part) return n.sign * n.base(x, y); let s = 0; for (const [a0, b0, yr] of ySegs(x, y)) s += n.base(a0, b0) * plPart(yr, n.part); return n.sign * s; };
  const plPlan = (n, x, y) => { if (!n.line || !n.base || y < x) return null; let s = 0; for (const [a0, b0, yr] of ySegs(x, y)) s += planOf(n.base, n.line===1 ? 'revenue' : 'cost', n.line, a0, b0) * plPart(yr, n.part); return n.sign * s; };
  // plTree(ranges, {plan, months}) → строки по порядку отчёта: { id, p, lvl, kind, name, sign, v:[значение по каждому отрезку], plan, kids:[id], mi }
  // ranges[0] — отчётный период; остальные — сравнения (прошлый период, год назад) или месяцы. Строка «месяц k» в сравнениях — k-й месяц своего отрезка.
  function plTree(ranges, opts = {}){
    const R0 = ranges.map(r => r ? r : null), nr = R0.length;
    // строки оставляются, если есть сумма в любом отрезке; для плана — и в тех же месяцах прошлого года (база плана бюджета), чтобы план разделов = сумме плана строк
    const KR0 = R0.slice(); if (opts.plan && R0[0]){ const m0 = W.monthIdx(Math.max(0, R0[0].from)) - 12, m1 = W.monthIdx(Math.min(W.DAYS-1, R0[0].to)) - 12; KR0.push({ from: W.MONTHS[m0 + 12].start, to: W.MONTHS[m1 + 12].end }); if (m1 >= 0) KR0.push({ from: W.MONTHS[Math.max(0, m0)].start, to: W.MONTHS[m1].end }); }
    const keep = base => KR0.some(r => r && Math.abs(base(r.from, r.to)) > 0.5);
    const sk = plSkel(keep), by = new Map(), out = [];
    sk.forEach(n => { const x = { ...n, v: new Array(nr).fill(0), plan: null, kids: [] }; by.set(n.id, x); out.push(x); if (n.p && by.has(n.p) && n.kind !== 'memo') by.get(n.p).kids.push(n.id); });
    // месяцы — 3-й уровень статей без своего разреза, если отчётный период длиннее месяца
    const ms0 = R0[0] ? mSegs(R0[0].from, R0[0].to) : [];
    const useM = opts.months !== false && ms0.length > 1;
    const list = [];
    out.forEach(x => { list.push(x); if (useM && x.months && !x.zero){ ms0.forEach((m, k) => { const id = `${x.id}@${m[2]}`, M0 = W.MONTHS[m[2]]; const c = { id, p: x.id, lvl: x.lvl + 1, kind:'month', name: `${MONF[M0.m]} ${M0.y}`, sign: x.sign, part: x.part, base: x.base, line: x.line, mk: k, mi: m[2], v: new Array(nr).fill(null), plan: null, kids: [] }; x.kids.push(id); by.set(id, c); list.push(c); }); } });
    // значения: листья — по своей базе, группы — сумма детей (снизу вверх)
    for (let i = list.length - 1; i >= 0; i--){
      const x = list[i];
      if (x.kind === 'month'){ R0.forEach((r, k) => { if (!r) return; const s = mSegs(r.from, r.to)[x.mk]; x.v[k] = s ? plVal(x, s[0], s[1]) : null; }); if (opts.plan && R0[0]){ const s = ms0[x.mk]; x.plan = s ? plPlan(x, s[0], s[1]) : null; } continue; }
      if (x.kind === 'tot' || x.kind === 'pct') continue;
      const kidsN = x.kids.filter(id => by.get(id).kind !== 'month');
      if (!kidsN.length){ R0.forEach((r, k) => { x.v[k] = r ? plVal(x, r.from, r.to) : null; }); if (opts.plan && R0[0]) x.plan = plPlan(x, R0[0].from, R0[0].to); }
      else { R0.forEach((r, k) => { x.v[k] = r ? kidsN.reduce((s, id) => s + (by.get(id).v[k] || 0), 0) : null; }); if (opts.plan){ const ps = kidsN.map(id => by.get(id).plan).filter(v => v != null); x.plan = ps.length === kidsN.filter(id => !by.get(id).zero).length && ps.length ? ps.reduce((s, v) => s + v, 0) : null; } }
    }
    // итоги и маржа — сверху вниз по порядку отчёта
    list.forEach(x => {
      if (x.kind === 'tot'){ R0.forEach((r, k) => { x.v[k] = r ? x.of.reduce((s, id) => s + by.get(id).v[k], 0) : null; }); const ps = x.of.map(id => by.get(id).plan); x.plan = opts.plan && ps.every(v => v != null) ? ps.reduce((s, v) => s + v, 0) : null; }
      if (x.kind === 'pct'){ const nu = by.get(x.num), rv = by.get('revenue'); R0.forEach((r, k) => { x.v[k] = r && rv.v[k] ? nu.v[k] / rv.v[k] * 100 : null; }); x.plan = nu.plan != null && rv.plan ? nu.plan / rv.plan * 100 : null; }
    });
    // нулевые подстатьи 3-го и 4-го уровня во всех отрезках (например, ОПВР до 2024 года) не показываются; 2-й уровень остаётся — видна структура
    const z0 = x => x.v.every(v => v == null || Math.abs(v) < 0.5) && !(x.plan != null && Math.abs(x.plan) >= 0.5);
    const drop = new Set(list.filter(x => x.kind === 'item' && x.lvl >= 3 && !x.kids.length && z0(x)).map(x => x.id));
    list.forEach(x => { if (x.kind === 'item' && x.lvl >= 3 && x.kids.length && x.kids.every(id => by.get(id).kind === 'month') && z0(x)) drop.add(x.id); });
    const rows = list.filter(x => !drop.has(x.id) && !drop.has(x.p));
    rows.forEach(x => { x.kids = x.kids.filter(id => !drop.has(id)); });
    return { rows, by, months: useM ? ms0 : [] };
  }
  // строка по id за любой отрезок — для карточек, ИИ, сверок (id из таблицы: revenue.t24.r0.o12, guardTax.so, transport@52 …)
  const PL_OLD = new Set(['guardC','adminC','opex']);   // прежние строки ОПиУ (ФОТ с взносами одной суммой, все операционные) — по W.pl, без знака
  function plNode(id){
    id = String(id || '');
    if (PL_OLD.has(id)) return { id, old: true, kind:'item', lvl:2, name: 'cards.pl.' + id, sign: -1, kids: [], path: [], fn: (x, y) => W.pl(x, y)[id], plan: () => null };
    const [bid, mi] = id.split('@'), sk = plSkel(() => true), by = new Map(sk.map(z => [z.id, z])), n = by.get(bid); if (!n) return null;
    const kidsOf = z => sk.filter(q => q.p === z.id && q.kind !== 'memo');
    const fnOf = z => z.base ? (x, y) => plVal(z, x, y) : (z.kind === 'sec' ? (fs => (x, y) => fs.reduce((s0, f) => s0 + f(x, y), 0))(kidsOf(z).map(fnOf)) : (z.kind === 'tot' ? (fs => (x, y) => fs.reduce((s0, f) => s0 + f(x, y), 0))(z.of.map(q => fnOf(by.get(q)))) : null));
    const planOfN = z => { if (z.base) return z.line ? (x, y) => plPlan(z, x, y) : (z.zero ? () => 0 : null); const ks = z.kind === 'sec' ? kidsOf(z) : (z.kind === 'tot' ? z.of.map(q => by.get(q)) : []); const fs = ks.map(planOfN); if (!fs.length || fs.some(f => !f)) return null; return (x, y) => fs.reduce((s0, f) => s0 + f(x, y), 0); };
    const path = []; { let c = n; while (c && c.p){ c = by.get(c.p); if (c) path.unshift(c); } }
    if (mi != null){ const M0 = W.MONTHS[+mi]; if (!M0 || !n.months) return null; const cl = (x, y) => [Math.max(x, M0.start), Math.min(y, M0.end)];
      return { ...n, id, kind:'month', lvl: n.lvl + 1, mi: +mi, month: M0, name: `${MONF[M0.m]} ${M0.y}`, kids: [], path: [...path, n], fn: (x, y) => { [x, y] = cl(x, y); return y < x ? 0 : plVal(n, x, y); }, plan: n.line ? (x, y) => { [x, y] = cl(x, y); return y < x ? 0 : plPlan(n, x, y); } : () => null }; }
    const f0 = n.kind === 'pct' ? null : fnOf(n), p0 = n.kind === 'pct' ? null : planOfN(n);
    return { ...n, kids: kidsOf(n).map(z => z.id), path, fn: f0 || (() => 0), plan: p0 || (() => null) };
  }
  const plName = n => n.raw === 'object' ? `${I18N.w(n.obj.name)} · ${I18N.w(n.obj.customer.name)}` : (n.raw === 'region' ? tx(n.name) : (n.old ? t(n.name) : t(n.name)));
  // ---------- таблица ОПиУ: дерево с раскрытием по уровням, сравнения, план, «по месяцам», CSV ----------
  const PL_LS = 'sunkar-pl-v1', PL_DEF = ['revenue','cogs','sales','admin','fin'];
  const plSt = () => { let s = null; try { s = JSON.parse(localStorage.getItem(PL_LS) || 'null'); } catch(e){} if (!s || !Array.isArray(s.open)) s = { open: PL_DEF.slice(), mode: 'period' }; if (s.mode !== 'months') s.mode = 'period'; return s; };
  const plSv = s => { try { localStorage.setItem(PL_LS, JSON.stringify(s)); } catch(e){} };
  // колонки «по месяцам»: месяцы периода (до 13), иначе годы
  const plCols = (a, b) => { const ms = mSegs(a, b); if (ms.length <= 13) return ms.map(([x, y, mi]) => ({ from:x, to:y, label: `${MON[W.MONTHS[mi].m]} ${String(W.MONTHS[mi].y).slice(2)}`, part: x > W.MONTHS[mi].start || y < W.MONTHS[mi].end, sub: x > W.MONTHS[mi].start || y < W.MONTHS[mi].end ? `${dts(x)}–${dts(y)}` : '' })); return ySegs(a, b).map(([x, y, yr]) => ({ from:x, to:y, label: String(yr), part: x > W.idxOf(yr,0,1) || y < W.idxOf(yr,11,31), sub: `${dts(x)}–${dts(y)}` })); };
  // данные таблицы за текущий срез: одна функция и для экрана, и для CSV, и для проверок
  function plData(mode){
    const a = RNG.from, b = RNG.to;
    if (mode === 'months'){ const cs = plCols(a, b); return { mode, cols: cs, tree: plTree([{ from:a, to:b }, ...cs], { months:false }) }; }
    return { mode: 'period', tree: plTree([{ from:a, to:b }, RNG.prev || null, RNG.yago || null], { plan: true }) };
  }
  // Δ: стрелка — рост или снижение суммы строки, цвет — влияние на прибыль (доход и итог выше — зелёный, расход выше — красный); маржа — в п. п.
  const plDelta = (x, cur, base) => {
    if (cur == null || base == null) return `<span class="dl">${t('an.no_base')}</span>`;
    if (x.kind === 'pct'){ const d = cur - base; if (Math.abs(d) < 0.05) return `<span class="dl">= ${F(0)} ${t('an.pp')}</span>`; return `<span class="${d >= 0 ? 'up' : 'dn'}">${d >= 0 ? '▲ +' : '▼ −'}${F(Math.abs(d))} ${t('an.pp')}</span>`; }
    if (Math.abs(base) < 1){ return Math.abs(cur) < 1 ? '<span class="dl">—</span>' : `<span class="dl">${t('an.no_base')}</span>`; }
    const good = cur - base >= 0;
    if (cur * base < 0) return `<span class="${good ? 'up' : 'dn'}" title="${esc(t('pl.sign_ch'))}">${good ? '+' : '−'}${M(Math.abs(cur - base))}</span>`;
    const d = (Math.abs(cur) / Math.abs(base) - 1) * 100; if (Math.abs(d) < 0.05) return '<span class="dl">= ' + P(0) + '</span>';
    return `<span class="${good ? 'up' : 'dn'}">${d >= 0 ? '▲ +' : '▼ −'}${F(Math.abs(d))} %</span>`;
  };
  const plMoney = v => v == null ? '<span class="dl">—</span>' : (Math.abs(conv(v)) < 5e4 ? M(0) : M(v));
  const plCell = (x, v) => x.kind === 'pct' ? (v == null ? '<span class="dl">—</span>' : P(v)) : plMoney(v);
  const plCard = x => 'line:pl:' + (x.kind === 'pct' ? x.num : x.id);
  const plLabel = x => x.kind === 'month' ? esc(x.name) : (x.raw === 'object' ? `${esc(I18N.w(x.obj.name))} <small>· ${esc(I18N.w(x.obj.customer.name))}</small>` : esc(plName(x)));
  function plTable(){
    const st = plSt(), D0 = plData(st.mode), rows = D0.tree.rows, open = new Set(st.open), rev = D0.tree.by.get('revenue');
    const postsM = (()=>{ let s0 = 0; for (let d = Math.max(0,RNG.from); d <= Math.min(RNG.to, W.DAYS-1); d++) s0 += W.totPosts(d); return s0 / 30.4; })();   // средние посты периода × месяцев
    const per = st.mode === 'months' ? D0.cols : null;
    const head = per
      ? [`${t('an.c.item')} · ${U()}`, ...per.map(c => `${esc(c.label)}${c.part ? `<br><small>${esc(c.sub)}</small>` : ''}`), `${t('pl.c.total')}<br><small>${periodTxt()}</small>`, t('pl.c.share')]
      : [`${t('an.c.item')} · ${U()}`, `${t('pl.c.period')}<br><small>${periodTxt()}</small>`, t('pl.c.share'), t('an.on_unit'), ...(RNG.prev ? [`${t('an.c.prev')}<br><small>${dts(RNG.prev.from)}–${dt(RNG.prev.to)}</small>`, t('pl.c.dprev')] : []), ...(RNG.yago ? [`${t('an.c.yago')}<br><small>${dts(RNG.yago.from)}–${dt(RNG.yago.to)}</small>`, t('pl.c.dyago')] : []), t('an.c.plan'), t('pl.c.exec')];
    const LO = per ? [] : [3, ...(RNG.prev ? [4] : []), ...(RNG.yago ? [RNG.prev ? 6 : 4] : []), head.length - 2];
    const XL = per ? [] : [3];   // «на пост в месяц» — на широком экране (≥ 1440 px) и в карточке строки
    const tips = per ? {} : { 2: t('pl.tip.share'), 3: t('an.c.per_post_tip'), [head.length - 1]: t('pl.tip.exec') };
    const th = head.map((h, i) => `<th scope="col" class="${i ? 'num' : 'pl-nh'}${LO.includes(i) ? ' lo' : ''}${XL.includes(i) ? ' xl' : ''}"${tips[i] ? ` title="${esc(tips[i])}"` : ''}>${h}${tips[i] ? ' <span class="an-i" aria-hidden="true">ⓘ</span>' : ''}</th>`).join('');
    const body = rows.map(x => {
      const has = x.kids.length > 0, isOpen = has && open.has(x.id), v = x.v[0];
      const cells = per
        ? [...per.map((c, k) => plCell(x, x.v[k + 1])), plCell(x, v), x.kind === 'pct' ? '' : (rev.v[0] ? P(Math.abs(v || 0) / rev.v[0] * 100) : '—')]
        : (() => { const pv = RNG.prev ? x.v[1] : null, yv = RNG.yago ? x.v[2] : null, pl0 = x.plan;
            const ex = x.kind === 'pct' || pl0 == null || v == null || Math.abs(pl0) < 1 || v * pl0 < 0 ? '<span class="dl">—</span>' : `<span class="${v - pl0 >= 0 ? 'up' : 'dn'}">${P(v / pl0 * 100)}</span>`;
            return [plCell(x, v), x.kind === 'pct' ? '' : (rev.v[0] ? P(Math.abs(v || 0) / rev.v[0] * 100) : '—'), x.kind === 'pct' || !postsM ? '' : T((v || 0) / postsM),
              ...(RNG.prev ? [plCell(x, pv), plDelta(x, v, pv)] : []), ...(RNG.yago ? [plCell(x, yv), plDelta(x, v, yv)] : []), x.kind === 'pct' ? (pl0 == null ? '<span class="dl">—</span>' : P(pl0)) : plMoney(pl0), ex]; })();
      const nm = plLabel(x), tg = has ? `<button type="button" class="pl-tg" data-pl-tog="${esc(x.id)}" aria-expanded="${isOpen}" aria-label="${esc(t(isOpen ? 'pl.collapse' : 'pl.expand', { n: stripH(nm) }))}">${isOpen ? '▾' : '▸'}</button>` : '<span class="pl-sp" aria-hidden="true"></span>';
      return `<tr class="rowlink pl-r pl-l${Math.min(x.lvl, 5)} pl-${x.kind}${x.kind === 'tot' ? ' total' : ''}" data-pl-id="${esc(x.id)}"${x.p ? ` data-pl-p="${esc(x.p)}"` : ''} data-card="${esc(plCard(x))}" tabindex="0" aria-level="${x.lvl}"${has ? ` aria-expanded="${isOpen}"` : ''}><td class="pl-n"><div class="pl-nw">${tg}<span class="pl-t">${nm}</span></div></td>${cells.map((c, i) => `<td class="num${LO.includes(i + 1) ? ' lo' : ''}${XL.includes(i + 1) ? ' xl' : ''}">${c}</td>`).join('')}</tr>`;
    }).join('');
    const nAll = rows.filter(x => x.kids.length).length;
    const bar = `<div class="an-bar pl-bar" role="toolbar" aria-label="${esc(t('pl.bar'))}"><button type="button" class="an-f" data-pl-act="none">${t('pl.collapse_all')}</button><button type="button" class="an-f" data-pl-act="l2">${t('pl.level2')}</button><button type="button" class="an-f" data-pl-act="all">${t('pl.expand_all')}</button>
      <span class="seg pl-mode" role="group" aria-label="${esc(t('pl.mode'))}"><button type="button" data-pl-mode="period" class="${st.mode === 'period' ? 'on' : ''}" aria-pressed="${st.mode === 'period'}">${t('pl.m.period')}</button><button type="button" data-pl-mode="months" class="${st.mode === 'months' ? 'on' : ''}" aria-pressed="${st.mode === 'months'}">${t(per && per.length && /^\d{4}$/.test(per[0].label) ? 'pl.m.years' : 'pl.m.months')}</button></span>
      <span class="an-cnt">${t('pl.rows', { n: N(rows.length), g: N(nAll) })}</span><button type="button" class="btn-quiet an-csv" data-pl-csv title="${esc(t('an.csv_t'))}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v3h16v-3"/></svg>${t('an.csv')}</button></div>`;
    const html = `<div class="pl-box" data-pl-mode-cur="${st.mode}">${bar}<div class="tw"><table class="tbl an-tbl pl-tbl" role="treegrid" aria-label="${esc(t('pl.title'))}"><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div><p class="note pl-note">${t('pl.note')}${!RNG.prev && (S.period === 'ytd' || S.period === 'pyear') ? ' · ' + t('an.no_prev', { p: RNG.label }) : ''}${!RNG.yago ? ' · ' + t('an.no_yago', { d: dt(0) }) : ''}</p></div>`;
    return html;
  }
  // видимость строк: строка видна, если раскрыты все её предки (без перерисовки раздела)
  function plApply(box){
    const st = plSt(), open = new Set(st.open), vis = new Map();
    box.querySelectorAll('tr[data-pl-id]').forEach(tr => {
      const id = tr.dataset.plId, p = tr.dataset.plP, show = !p || (vis.get(p) && open.has(p));
      vis.set(id, !!show); tr.hidden = !show;
      const b = tr.querySelector('[data-pl-tog]'); if (b){ const o = open.has(id); b.textContent = o ? '▾' : '▸'; b.setAttribute('aria-expanded', o); b.setAttribute('aria-label', t(o ? 'pl.collapse' : 'pl.expand', { n: stripH(tr.querySelector('.pl-t').innerHTML) })); tr.setAttribute('aria-expanded', o); }
    });
  }
  function plCsv(){
    const st = plSt(), D0 = plData(st.mode), en = I18N.lang === 'en', sep = en ? ',' : ';', rev = D0.tree.by.get('revenue');
    const num = v => { if (v == null || !isFinite(v)) return ''; const s0 = String(Math.round(v * 100) / 100); return en ? s0 : s0.replace('.', ','); };
    const q = s0 => { s0 = String(s0 == null ? '' : s0); return /[";,\n]/.test(s0) ? '"' + s0.replace(/"/g, '""') + '"' : s0; };
    const mv = (x, v) => x.kind === 'pct' ? num(v) : (v == null ? '' : num(conv(v) / 1e6));
    const per = D0.mode === 'months' ? D0.cols : null, u = U();
    const head = [t('pl.csv.level'), t('pl.csv.code'), t('an.c.item'), ...(per ? [...per.map(c => `${c.label}, ${u}`), `${t('pl.c.total')}, ${u}`, `${t('pl.c.share')}, %`] : [`${t('pl.c.period')}, ${u}`, `${t('pl.c.share')}, %`, ...(RNG.prev ? [`${t('an.c.prev')}, ${u}`, `${t('pl.c.dprev')}, %`] : []), ...(RNG.yago ? [`${t('an.c.yago')}, ${u}`, `${t('pl.c.dyago')}, %`] : []), `${t('an.c.plan')}, ${u}`, `${t('pl.c.exec')}, %`])];
    const dp = (x, c, b) => c == null || b == null || x.kind === 'pct' || Math.abs(b) < 1 || c * b < 0 ? '' : num((Math.abs(c) / Math.abs(b) - 1) * 100);
    const lines = [head.map(q).join(sep)];
    D0.tree.rows.forEach(x => { const v = x.v[0], name = '  '.repeat(x.lvl - 1) + stripH(x.kind === 'month' ? x.name : plName(x)), sh = x.kind === 'pct' || !rev.v[0] ? '' : num(Math.abs(v || 0) / rev.v[0] * 100);
      const vals = per ? [...per.map((c, k) => mv(x, x.v[k + 1])), mv(x, v), sh] : [mv(x, v), sh, ...(RNG.prev ? [mv(x, x.v[1]), dp(x, v, x.v[1])] : []), ...(RNG.yago ? [mv(x, x.v[2]), dp(x, v, x.v[2])] : []), mv(x, x.plan), x.kind === 'pct' || x.plan == null || !x.plan || v * x.plan < 0 ? '' : num(v / x.plan * 100)];
      lines.push([x.lvl, x.id, name, ...vals].map(q).join(sep)); });
    return '﻿' + lines.join('\r\n');
  }
  function plWire(root){
    const box = root.querySelector('.pl-box'); if (!box) return; plApply(box);
    box.addEventListener('click', e => {
      const tg = e.target.closest('[data-pl-tog]'), act = e.target.closest('[data-pl-act]'), md = e.target.closest('[data-pl-mode]'), cv = e.target.closest('[data-pl-csv]');
      if (!tg && !act && !md && !cv) return;
      e.stopPropagation(); const st = plSt();
      if (tg){ const id = tg.dataset.plTog, s0 = new Set(st.open); s0.has(id) ? s0.delete(id) : s0.add(id); st.open = [...s0]; plSv(st); plApply(box); return; }
      if (act){ const k = act.dataset.plAct; st.open = k === 'none' ? [] : (k === 'l2' ? PL_DEF.slice() : [...box.querySelectorAll('tr[aria-expanded]')].map(tr => tr.dataset.plId)); plSv(st); plApply(box); return; }
      if (md){ if (st.mode !== md.dataset.plMode){ st.mode = md.dataset.plMode; plSv(st); render(); } return; }
      if (cv){ const A0 = mod('analytics'); const name = `pl_${st.mode === 'months' ? 'months_' : ''}${W.iso(RNG.from)}_${W.iso(RNG.to)}.csv`; if (A0 && A0.download) A0.download(name, plCsv()); }
    });
    // стрелки: → раскрыть, ← свернуть (или перейти к родителю)
    box.addEventListener('keydown', e => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return; const tr = e.target.closest('tr[data-pl-id]'); if (!tr || e.target !== tr) return;
      const st = plSt(), s0 = new Set(st.open), id = tr.dataset.plId, has = tr.hasAttribute('aria-expanded');
      if (e.key === 'ArrowRight' && has && !s0.has(id)){ s0.add(id); }
      else if (e.key === 'ArrowLeft' && has && s0.has(id)){ s0.delete(id); }
      else if (e.key === 'ArrowLeft' && tr.dataset.plP){ const p = box.querySelector(`tr[data-pl-id="${CSS.escape(tr.dataset.plP)}"]`); if (p) p.focus(); e.preventDefault(); return; }
      else return;
      e.preventDefault(); st.open = [...s0]; plSv(st); plApply(box);
    });
  }
  const stripH = s => String(s == null ? '' : s).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
  // план/факт статей: таблица по стандарту (итог, доля статьи в своём виде — доходы или расходы, CSV); строка → карточка строки бюджета, региона или канала
  function pfTable(ls, a, b, opts={}){
    const L = I18N.t, kindTot = {};
    const rows = ls.map(l => { const p = planOf(l[2],l[3],l[0],a,b), f = factOf(l[2],a,b); kindTot[l[3]] = (kindTot[l[3]]||0) + Math.abs(f); return { n:l[1], p, f, low:l[4], kd:l[3], _kind: l[0]>=120 ? 'channel' : (l[0]>=100 ? 'region' : 'line'), _id: l[0]>=100 ? l[1] : 'bdr:'+l[0] }; });
    const dv = (r, i) => devCell(r.f, r.p, r.low)[i];
    const tot = opts.total ? [sumLines(ls,a,b,true), sumLines(ls,a,b,false)] : null, low0 = !tot && ls.length && ls[0][4];
    const tf = T0 => tot ? [tot[1], tot[0], false] : [T0.f, T0.p, low0];
    return T2({ id:'pf-'+ls.map(l=>l[0]).join('-'), csv:'budget_plan_fact', search:false, pageSize:30, totalLabel: opts.total ? `<b>${opts.total}</b>` : null,
      cols:[{ key:'n', title:`${L('an.c.item')} · ${U()}`, html:r=>esc(tx(r.n)) }, { key:'p', title:L('an.c.plan'), kind:'money', unit:'', sum:'sum', tot: tot ? ()=>tot[0] : null }, { key:'f', title:L('an.c.fact'), kind:'money', unit:'', sum:'sum', tot: tot ? ()=>tot[1] : null }, { key:'d', title:L('an.c.dev'), kind:'num', val:r=>r.f-r.p, html:r=>dv(r,0), totHtml:(v,T0)=>devCell(...tf(T0))[0] }, { key:'dp', title:'%', kind:'num', lo:true, val:r=>r.p?(r.f-r.p)/Math.abs(r.p)*100:null, html:r=>dv(r,1), totHtml:(v,T0)=>devCell(...tf(T0))[1] }, { key:'ex', title:L('an.c.exec'), kind:'pct', val:r=>r.p>0?r.f/r.p*100:null, html:r=>EX(r.f,r.p), totHtml:(v,T0)=>{ const x = tf(T0); return EX(x[0], x[1]); } }, { key:'sh', title:L('an.c.share_kind'), kind:'pct', lo:true, tip:L('an.c.share_kind_tip'), val:r=>kindTot[r.kd]?Math.abs(r.f)/kindTot[r.kd]*100:null }],
      rows });
  }
  function monthTable(ls, y, opts={}){
    const mis = W.MONTHS.map((M0,mi)=>({M0,mi})).filter(x=>x.M0.y===y);
    const cut = mi => { const M0 = W.MONTHS[mi]; return (M0.start <= RNG.to && M0.end > RNG.to) ? RNG.to : M0.end; };
    const fcVal = mi => { const M0 = W.MONTHS[mi]; return ls.reduce((s2,l)=>s2 + (l[3]==='revenue'?1:-1)*l[2](M0.start,M0.end), 0); };
    const val = (mi, plan) => { const M0 = W.MONTHS[mi]; if (!plan && isFc(mi)) return fcVal(mi); return sumLines(ls, M0.start, cut(mi), plan); };
    let tp = 0, tf = 0;
    const rows = mis.map(({M0,mi}) => { const p = val(mi,true), f = val(mi,false); tp += p; tf += f; const fc = isFc(mi), part = !fc && M0.end > RNG.to; return { n:`${MONF[M0.m]}${fc?' <span class="pill i">прогноз</span>':(part?` <span class="pill mu">по ${dts(RNG.to)}</span>`:'')}`, p, f, cp:tp, cf:tf, fc }; });
    const y0 = W.idxOf(y,0,1), y1 = W.idxOf(y,11,31);
    if (RNG.to >= y0 && RNG.to < y1){ const pY = sumLines(ls, y0, RNG.to, true), fY = sumLines(ls, y0, RNG.to, false); rows.push({ n:`<b>С начала года по ${dts(RNG.to)}</b>`, p:pY, f:fY, _cls:'total' }); }
    const rawR = (a2,b2) => ls.reduce((s2,l)=>s2 + (l[3]==='revenue'?1:-1)*l[2](a2,b2), 0);
    const fullFact = mi => { const M0 = W.MONTHS[mi]; if (isFc(mi)) return fcVal(mi); if (M0.end > RNG.to) return sumLines(ls, M0.start, RNG.to, false) + rawR(RNG.to+1, M0.end); return sumLines(ls, M0.start, M0.end, false); };
    const pFull = sumLines(ls, y0, y1, true), fFull = mis.reduce((s2,{mi})=>s2 + fullFact(mi), 0);
    rows.push({ n:`<b>${y} — год</b>${RNG.to < y1 ? ` <small>факт по ${dts(RNG.to)} + прогноз</small>` : ''}`, p:pFull, f:fFull, _cls:'total' });
    const L = I18N.t, dv = (r,i) => devCell(r.f, r.p, opts.low)[i];
    return T2({ id:'mt-'+ls.map(l=>l[0]).join('-')+'-'+y, csv:'budget_months_'+y, search:false, total:false, sortable:false, pageSize:20,
      cols:[{ key:'n', title:`${L('an.c.month')} · ${U()}`, html:r=>r.n }, { key:'p', title:L('an.c.plan'), kind:'money', unit:'' }, { key:'f', title:L('an.c.fact_fc'), kind:'money', unit:'' }, { key:'d', title:L('an.c.dev'), kind:'num', html:r=>dv(r,0) }, { key:'dp', title:'%', kind:'num', lo:true, html:r=>dv(r,1) }, { key:'ex', title:L('an.c.exec'), kind:'pct', html:r=>EX(r.f,r.p) }, { key:'cp', title:L('an.c.cum_plan'), kind:'money', unit:'', lo:true }, { key:'cf', title:L('an.c.cum_fact'), kind:'money', unit:'', lo:true }], rows });
  }
  function chartPF(ls, y, single){
    const mis = W.MONTHS.map((M0,mi)=>({M0,mi})).filter(x=>x.M0.y===y);
    const raw = (a,b) => ls.reduce((s2,l)=>s2+(l[3]==='revenue'?1:-1)*l[2](a,b),0);
    const v = plan => mis.map(({M0}) => conv(plan ? sumLines(ls,M0.start,M0.end,true) : (M0.start > RNG.to ? raw(M0.start,M0.end) : (M0.end > RNG.to ? sumLines(ls,M0.start,RNG.to,false) + raw(RNG.to+1,M0.end) : sumLines(ls,M0.start,M0.end,false))))/1e6);
    return lines([{n:'план',v:v(true),c:'var(--fg-3)',dash:true,dots:false},{n:`факт по ${dts(RNG.to)}, дальше прогноз`,v:v(false),c:'var(--c1)'}], mis.map(x=>MON[x.M0.m]), {fmt:x=>F(x,0)});
  }

  // драйверы бюджета следующего года (сохраняются у пользователя в браузере)
  const DRV_DEF = { posts:12, tariff24:7, tariffDay:10, salary:7, admin:3, opex:7, dso:30, collect:97, cars:2, carPrice:9.2, dividends:1200 };
  const DRV_TXT = { posts:['Рост постов, %','новые объекты по воронке продаж'], tariff24:['Индексация тарифа 24/7, %','с 01.01'], tariffDay:['Индексация дневного поста, %','с 01.01'], salary:['Рост окладов, %','МЗП и рынок'], admin:['Рост штата администрации, %',''], opex:['Рост операционных расходов, %','инфляция'], dso:['Срок оплаты заказчиками, дн.','цель по дебиторке'], collect:['Собираемость, %','доля актов, оплаченных в срок'], cars:['Новые автомобили, шт.','ГБР'], carPrice:['Цена автомобиля, млн ₸',''], dividends:['Дивиденды за год, млн ₸','июль и декабрь'] };
  const DRV_LIMS = { posts:[-30,60], tariff24:[-10,40], tariffDay:[-10,40], salary:[0,40], admin:[-30,50], opex:[-10,40], dso:[5,120], collect:[50,100], cars:[0,20], carPrice:[3,30], dividends:[0,3000] };
  S.drv = { ...DRV_DEF, ...(S.drv||{}) };
  S.role = S.role || 'Исполнительный директор';
  S.appr = S.appr || {};
  function plan2027(){
    const d = S.drv, y0 = 2026, y1 = 2027, base = W.MONTHS.filter(m=>m.y===y0);
    const t26 = W.taxes(W.idxOf(2026,0,1), W.idxOf(2026,11,31)), r27 = { vat:0.16, cit:0.20, emp:W.RATES[2026].employer, wh: t26.fotGross ? t26.employee/t26.fotGross : W.RATES[2026].withholding, div:W.RATES[2026].divTax };   // ставки 2026 (удержания — с базовым вычетом 30 МРП, по факту 2026)
    const posts0 = W.totPosts(W.idxOf(2026,11,31)), guards0 = W.hr(W.idxOf(2026,11,31)).guards, admin0 = W.adminCount(W.idxOf(2026,11,31));
    const mix24 = (()=>{ let a=0,b=0; for (const o of W.objects) if (W.active(o,W.FACT_END)) { if (o.is24) a+=o.posts*W.tariff(o,W.FACT_END); else b+=o.posts*W.tariff(o,W.FACT_END); } return a/(a+b||1); })();
    const months = base.map((M0,k) => {
      const p = W.pl(M0.start, M0.end), ramp = 1 + d.posts/100*(k+0.5)/12;
      const rev = p.revenue * ramp * (1 + mix24*d.tariff24/100 + (1-mix24)*d.tariffDay/100);
      const guard = p.guardC * ramp * (1+d.salary/100), adminC = p.adminC * (1+d.admin/100) * (1+d.salary/100);
      const opex = (p.uniform*(1+d.posts/100*0.8) + p.transport*(1+d.cars*0.06) + p.comms*ramp + p.office + p.other + p.it + p.selling*ramp) * (1+d.opex/100);
      const ebitda = rev - guard - adminC - opex, dep = p.dep*1.12, ebt = ebitda - dep - p.interest*0.7 + p.finInc, cit = Math.max(0, ebt*r27.cit);
      return { m:k, label: MONF[k], rev, guard, adminC, opex, ebitda, dep, net: ebt - cit, cit, fotGross: (guard+adminC)/(1+r27.emp), vat: (rev - opex)*r27.vat };
    });
    const tot = k => months.reduce((s,x)=>s+x[k],0);
    // БДДС 2027
    let cash = W.balance(W.idxOf(2026,11,31)).cash;
    const dec26 = W.pl(W.idxOf(2026,11,1), W.idxOf(2026,11,31)), lag = d.dso/30;
    const cf = months.map((x,k) => {
      const revAt = j => j >= 0 ? months[j].rev : dec26.revenue;
      const l0 = Math.floor(lag), fr = lag - l0;
      const inflow = (revAt(k-l0)*(1-fr) + revAt(k-l0-1)*fr) * (1+r27.vat) * d.collect/100 + (k===0 ? W.receivables(W.idxOf(2026,11,31)).total*(1-d.collect/100)*0 : 0);
      const prev = k ? months[k-1] : { fotGross: (dec26.guardC+dec26.adminC)/(1+r27.emp), opex: dec26.opex, rev: dec26.revenue, cit: Math.max(0,dec26.ebt*0.2) };
      // НДС — за квартал 25-го второго месяца после квартала (февраль — IV кв. 2026), КПН — аванс 1/12 × КПН 2026 × 1,1 и доплата за 2026 в апреле, лизинг 12-го
      const vatQ = k===1 ? W.quarterVat((2026-W.Y0)*4+3) : ([4,7,10].includes(k) ? months.slice(k-4,k-1).reduce((s0,x)=>s0+x.vat,0) : 0);
      const citAdv = Math.round(t26.cit*1.1/12/1000)*1000, citSettle = k===3 ? W.upcoming(W.idxOf(2026,11,31)).citYear.settle : 0;
      const salaries = prev.fotGross*(1-r27.wh), taxes = prev.fotGross*(r27.wh+r27.emp) + vatQ + citAdv + citSettle, suppliers = prev.opex*(1+r27.vat);
      const leas = Math.min(W.P.leasing.pay, Math.max(0, W.leasingSplit(W.idxOf(2026,11,31)).total - k*W.P.leasing.pay*0.85));
      const capex = (k===2 ? d.cars*d.carPrice*1e6 : 0) + leas, div = (k===6 || k===11) ? d.dividends*1e6/2 : 0;
      const open = cash; cash += inflow - salaries - taxes - suppliers - capex - div;
      return { label:x.label, open, inflow, salaries, taxes, suppliers, capex, div, close: cash };
    });
    // снабжение 2027
    const newPosts = Math.round(posts0*d.posts/100), kitPrice = CAT.stock.filter(s=>/Форма|Берцы|Жилет|Удостоверение|Пропуск/.test(s.item)).reduce((s,x)=>s+x.price,0);
    const ftePost = W.totFte(W.idxOf(2026,11,31))/Math.max(1,posts0), hires = Math.round(newPosts*ftePost*W.P.reserveK + guards0*0.20);
    const supply = [['Комплекты формы новым и на замену', hires, kitPrice], ['Рации на новые посты', Math.round(newPosts*1.1), 64000], ['Фонари и аптечки на новые посты', newPosts*2, 8650], ['Спецсредства (по разрешениям)', Math.round(newPosts*0.7), 21000], ['Автомобили ГБР', d.cars, d.carPrice*1e6]];
    return { months, tot, cf, supply, newPosts, hires, ftePost, guards1: Math.round(guards0*(1+d.posts/100)), admin1: Math.round(admin0*(1+d.admin/100)), posts1: posts0+newPosts, posts0 };
  }

  function budgetSec(tab){
    tab = tab || 'bdr'; const to = RNG.to, y = W.yOf(to);
    const tabs = [['bdr','Свод (БДР)'],['sales','Продажи'],['cf','ДДС'],['supply','Снабжение'],['hr','Кадры и ФОТ'],['fleet','Автопарк'],['next','Бюджет 2027'],['approve','Согласование']];
    const head = h1('Бюджет и планирование', `бюджет ${y} года утверждён в начале года: факт прошлого года × целевой рост${isFiltered() && tab!=='sales' ? ' · эта вкладка — по компании, фильтр региона действует во вкладке «Продажи»' : ''}`) + `<div class="tabs">${tabs.map(t=>`<a href="#budget-${t[0]}" class="${t[0]===tab?'on':''}">${t[1]}</a>`).join('')}</div>`;
    const a = RNG.from, b = to;
    const tilePF = (title, ls, kind) => { const p = sumLines(ls,a,b,true), f = sumLines(ls,a,b,false); const pct = p ? f/p*100 : 0; const good = kind==='cost' ? f <= p : f >= p; return tile(title, P(pct), [`факт ${MU(f)} · план ${MU(p)}`, `<span class="${good?'up':'dn'}">${f-p>=0?'+':''}${MU(f-p)}</span> к плану`], good?'var(--good)':'var(--bad)'); };
    let body = '';
    if (tab==='bdr'){
      const rev = [LINES.bdr[0]], costs = LINES.bdr.slice(1);
      body = `<div class="tiles">${tilePF('Выручка к плану', rev)}${(()=>{ const p=-sumLines(costs,a,b,true), f=-sumLines(costs,a,b,false); return tile('Расходы к плану', EX(f,p), [`факт ${MU(f)} · план ${MU(p)}`], f<=p?'var(--good)':'var(--bad)'); })()}${tilePF('EBITDA к плану', LINES.bdr)}${tile(`Исполнение с начала ${y}`, P((()=>{ const s=W.idxOf(y,0,1), p=sumLines(LINES.bdr,s,to,true); return p? sumLines(LINES.bdr,s,to,false)/p*100 : 0; })()), ['EBITDA, факт к плану'], '')}</div>
      ${card(`БДР за период · ${periodTxt()}`, pfTable(LINES.bdr, a, b, { total:'EBITDA' }), 'зелёный — в пользу компании')}
      ${card(`EBITDA по месяцам ${y}: план и факт`, chartPF(LINES.bdr, y), U())}
      ${card(`БДР по месяцам ${y} · EBITDA`, monthTable(LINES.bdr, y))}`;
    }
    if (tab==='sales'){
      const regs = W.REGIONS.filter(r=>S.region==='all'||r.r===S.region);
      const regLine = r => [100+W.REGIONS.indexOf(r), r.r, (x,z)=>objAgg(x,z,W.objects.filter(o=>o.region===r.r && (S.type==='all'||(S.type==='24'?o.is24:!o.is24)))).rev, 'revenue', false];
      const chLine = (c,k) => [120+k, c, (x,z)=>objAgg(x,z,W.objects.filter(o=>o.customer.channel===c && objFilter(o))).rev, 'revenue', false];
      const ls = regs.map(regLine);
      body = `<div class="tiles">${tilePF('Продажи к плану', ls)}${(()=>{ const fn=W.funnel(a,b,objFilter); const yA = W.yOf(a), y0i = W.idxOf(yA,0,1), y1i = W.idxOf(yA,11,31), os0 = W.objects.filter(o=>objFilter(o)&&W.active(o,Math.max(0,y0i-1))).length, ter = W.funnel(Math.max(0,y0i-365), Math.max(0,y0i-1), objFilter).terminated; const yearPlan = Math.max(2, Math.round(os0*(TARGET.revenue[yA] ?? 0.2)*0.6 + ter)); const pl = Math.max(1, Math.round(yearPlan * (Math.min(b,y1i)-Math.max(a,y0i)+1)/365)); if (b - a + 1 < 28) return tile('Новые договоры за период', fn.signed, [`план считается от месяца · на год ${yearPlan}`, `запросов ${fn.requests} · КП ${fn.kp}`], '');
      return tile('Новые договоры к плану', P(fn.signed/pl*100), [`подписано ${fn.signed} · план ${pl} (на год ${yearPlan}: рост портфеля + замена расторгнутых)`, `запросов ${fn.requests} · КП ${fn.kp}`], fn.signed>=pl?'var(--good)':'var(--bad)'); })()}${(()=>{ const os = W.objects.filter(o=>objFilter(o)&&W.active(o,b)), ps = os.reduce((s2,o)=>s2+o.posts,0); return tile('Средний тариф поста', T(ps ? os.reduce((s2,o)=>s2+o.posts*W.tariff(o,b),0)/ps : 0), [`в месяц по договорам на ${dt(b)} · ${N(ps)} ${nw(ps,'постов')}`], ''); })()}</div>
      ${card(`План продаж по регионам · ${periodTxt()}`, pfTable(ls, a, b, { total:'Итого продажи' }))}
      ${card(`План продаж по каналам · ${periodTxt()}`, pfTable(W.CHANNELS.map(chLine), a, b, { total:'Итого' }))}
      ${card(`Продажи по месяцам ${y}: план и факт`, chartPF(ls, y), U())}
      ${card(`Продажи по месяцам ${y}`, monthTable(ls, y))}`;
    }
    if (tab==='cf'){
      const cfIn = LINES.cf.filter(l => l[3]==='revenue'), cfOut = LINES.cf.filter(l => l[3]!=='revenue');
      const cfAll = LINES.cf.map(l => l[3]==='revenue' ? l : [l[0], l[1], l[2], 'cost', true]);
      const netPF = (x,z,plan) => sumLines(cfAll,x,z,plan);
      body = `<div class="tiles">${tilePF('Поступления к плану', cfIn)}${(()=>{ const p=-sumLines(cfOut,a,b,true), f=-sumLines(cfOut,a,b,false); return tile('Выплаты к плану', EX(f,p), [`факт ${MU(f)} · план ${MU(p)}`], f<=p?'var(--good)':'var(--bad)'); })()}${tile('Чистый поток', MU(netPF(a,b,false)), [`план ${MU(netPF(a,b,true))}`], '')}${tile(`Остаток на ${dt(to)}`, MU(W.balance(to).cash), [`прогноз 13 недель — в «Финансах»`], '')}</div>
      ${card(`БДДС за период · ${periodTxt()}`, pfTable(cfAll, a, b, { total:'Чистый поток' }), 'выплаты показаны положительными суммами; план каждой строки — факт того же месяца прошлого года × целевой рост бюджета (НДС — 25-го второго месяца после квартала по ставке квартала, КПН — авансы 25-го и доплата 10.04)')}
      ${card(`Чистый денежный поток по месяцам ${y}: план и факт`, chartPF(cfAll, y), U())}
      ${card(`БДДС по месяцам ${y} · чистый поток`, monthTable(cfAll, y))}`;
    }
    if (tab==='supply'){
      const ls = LINES.supply, hires = W.hrRange(a,b).hires, kit = CAT.stock.filter(s=>/Форма|Берцы|Жилет|Удостоверение|Пропуск/.test(s.item)).reduce((s,x)=>s+x.price,0);
      body = `<div class="tiles">${(()=>{ const p=-sumLines(ls,a,b,true), f=-sumLines(ls,a,b,false); return tile('Закупки к плану', EX(f,p), [`факт ${MU(f)} · план ${MU(p)}`, `<span class="${f<=p?'up':'dn'}">${f-p>=0?'+':''}${MU(f-p)}</span> к плану`], f<=p?'var(--good)':'var(--bad)'); })()}${tile('Комплектов выдано новым', N(hires), [`по норме · стоимость комплекта ${T(kit)}`], '')}${tile('Ниже минимума на складе', CAT.stock.filter(x=>x.stock<x.min).length, [CAT.stock.filter(x=>x.stock<x.min).map(x=>x.item).join(' · ')], 'var(--bad)')}</div>
      ${card(`Бюджет снабжения за период · ${periodTxt()}`, pfTable(ls.map(l=>[l[0],l[1],l[2],'cost',true]), a, b), 'закупки форма, связь, оборудование')}
      ${card(`Закупки по месяцам ${y}: план и факт`, chartPF(ls.map(l=>[l[0],l[1],l[2],'revenue',true]), y), U())}
      ${card(`Закупки по месяцам ${y}`, monthTable(ls.map(l=>[l[0],l[1],l[2],'revenue',true]), y, { low:true }))}`;
    }
    if (tab==='hr'){
      const ls = LINES.hr, hrNow = W.hr(to), mm = W.MONTHS.filter(m=>m.y===y);
      const hcPlan = m => { const mi = W.MONTHS.indexOf(m); if (mi < 12) return Math.round(W.hr(m.end).total * (1 + 0.03*(hb(m.m,y,61)-0.5))); return Math.round(W.hr(W.MONTHS[mi-12].end).total * (1 + (TARGET.revenue[m.y] ?? 0.2) * 0.8)); };
      body = `<div class="tiles">${(()=>{ const p=-sumLines(ls,a,b,true), f=-sumLines(ls,a,b,false); return tile('ФОТ к плану', EX(f,p), [`факт ${MU(f)} · план ${MU(p)}`], f<=p?'var(--good)':'var(--bad)'); })()}${tile(`Численность на ${dt(to)}`, N(hrNow.total), [`план на конец месяца ${N(hcPlan(W.MONTHS[W.monthIdx(to)]))}`], '')}${tile('Принято / уволено за период', `${N(W.hrRange(a,b).hires)} / ${N(W.hrRange(a,b).fires)}`, ['план найма — по росту постов и текучести'], '')}</div>
      ${card(`Бюджет ФОТ за период · ${periodTxt()}`, pfTable(ls, a, b))}
      ${card(`Численность по месяцам ${y}: план и факт`, table(['Месяц','План','Факт / прогноз','Отклонение'], mm.map(m=>{ const f = W.hr(Math.min(m.end,W.DAYS-1)).total, p = hcPlan(m); return [`${MONF[m.m]}${m.start>RNG.to?' <span class="pill i">прогноз</span>':(m.end>RNG.to?` <span class="pill mu">по ${dts(RNG.to)}</span>`:'')}`, N(p), N(f), `${f-p>=0?'+':''}${N(f-p)}`]; })))}
      ${card(`ФОТ по месяцам ${y}`, monthTable(ls.map(l=>[l[0],l[1],l[2],'revenue',true]), y, { low:true }))}`;
    }
    if (tab==='fleet'){
      const ls = LINES.fleet;
      body = `<div class="tiles">${(()=>{ const p=-sumLines(ls,a,b,true), f=-sumLines(ls,a,b,false); return tile('Автопарк к плану', EX(f,p), [`факт ${MU(f)} · план ${MU(p)}`], f<=p?'var(--good)':'var(--bad)'); })()}${tile('Автомобилей', CAT.fleet.length, ['ГБР, инспекция, развозка, вахта'], '')}</div>
      ${card(`Бюджет автопарка за период · ${periodTxt()}`, pfTable(ls, a, b))}
      ${card(`Автопарк по месяцам ${y}`, monthTable(ls.map(l=>[l[0],l[1],l[2],'revenue',true]), y, { low:true }))}`;
    }
    if (tab==='next' && RNG.anchor < W.idxOf(2026,9,1)){ body = card('Бюджет 2027', note(`Бюджет 2027 собирается с октября 2026 года на базе факта 2026. Выберите дату «Данные на» позже 01.10.2026 — сейчас ${dt(RNG.anchor)}.`)); }
    else if (tab==='next'){
      const pl = plan2027(), d = S.drv, t = pl.tot, b26 = W.pl(W.idxOf(2026,0,1), W.idxOf(2026,11,31));
      const inp = k => `<label class="drv"><span>${DRV_TXT[k][0]}<small>${DRV_TXT[k][1]}</small></span><input type="number" step="any" data-drv="${k}" id="drv-${k}" value="${d[k]}" min="${(DRV_LIMS[k]||[])[0]}" max="${(DRV_LIMS[k]||[])[1]}"></label>`;
      const q = k => [0,1,2,3].map(i=>pl.months.slice(i*3,i*3+3).reduce((s,x)=>s+x[k],0));
      body = card('Драйверы бюджета 2027', `<div class="drvs">${Object.keys(DRV_DEF).map(inp).join('')}</div><p class="note">Меняйте цифры — бюджет пересчитывается сразу. <button type="button" class="lnk" id="drvReset">вернуть значения по умолчанию</button></p>`, `база — 2026 год (факт по ${dts(RNG.anchor)} и прогноз по договорам)`) +
      `<div class="tiles">${tile('Выручка 2027', MU(t('rev')), [`к 2026: ${delta(t('rev'), b26.revenue)}`], '')}${tile('EBITDA 2027', MU(t('ebitda')), [`маржа ${P(t('ebitda')/t('rev')*100)} · 2026: ${P(b26.ebitda/b26.revenue*100)}`], '')}${tile('Чистая прибыль 2027', MU(t('net')), [`к 2026: ${delta(t('net'), b26.net)}`], '')}${tile('Деньги на 31.12.2027', MU(pl.cf[11].close), [`минимум за год ${MU(Math.min(...pl.cf.map(x=>x.close)))}`], Math.min(...pl.cf.map(x=>x.close))<30e6?'var(--bad)':'var(--info)')}</div>
      ${card('БДР 2027 по кварталам', table([`Статья · ${U()}`,'I кв.','II кв.','III кв.','IV кв.','2027','2026 (факт + прогноз)'], [['Выручка','rev',b26.revenue],['Охранники','guard',b26.guardC],['Администрация','adminC',b26.adminC],['Операционные расходы','opex',b26.opex],['<b>EBITDA</b>','ebitda',b26.ebitda],['КПН','cit',b26.cit],['<b>Чистая прибыль</b>','net',b26.net]].map(([n,k,v26])=>[n,...q(k).map(M),`<b>${M(t(k))}</b>`,M(v26)])))}
      ${card('Продажи 2027 по регионам', table(['Регион',`Выручка 2026, ${U()}`,`План 2027, ${U()}`,'Рост'], W.REGIONS.map(r=>{ const f = objAgg(W.idxOf(2026,0,1),W.idxOf(2026,11,31),W.objects.filter(o=>o.region===r.r)).rev; const share = b26.revenue ? f/b26.revenue : 0; return [r.r, M(f), M(t('rev')*share), delta(t('rev')*share, f)]; })), `постов на конец 2027: ${N(pl.posts1)} (на конец 2026 — ${N(pl.posts0)}, новых ${N(pl.newPosts)})`)}
      ${card('БДДС 2027 по месяцам', table([`Месяц · ${U()}`,'Остаток на начало','Поступления','Зарплата','Налоги','Поставщики','ОС и лизинг','Дивиденды','Остаток на конец'], pl.cf.map(x=>[x.label,M(x.open),M(x.inflow),M(x.salaries),M(x.taxes),M(x.suppliers),x.capex?M(x.capex):'—',x.div?M(x.div):'—',`<b class="${x.close<30e6?'dn':''}">${M(x.close)}</b>`])), I18N.t('k83.b27_cf', { n: d.dso, k: d.collect }) + (d.dividends > 0 ? ' · ' + I18N.t('k84.b27_div', { d: MU(d.dividends*1e6), x: MU(W.divIpn(2026, 0, d.dividends*1e6)) }) : ''))}
      ${card('Бюджет снабжения 2027', table(['Что','Количество','Цена','Сумма'], [...pl.supply.map(([n,qn,pr])=>[n,N(qn),T(pr),MU(qn*pr)]), ['<b>Итого</b>','','',`<b>${MU(pl.supply.reduce((s,[,qn,pr])=>s+qn*pr,0))}</b>`]]), I18N.t('k83.b27_sup', { n: N(pl.newPosts), k: F(pl.ftePost*W.P.reserveK,2), f: F(pl.ftePost,2), h: N(pl.hires) }))}
      ${card('Кадры и ФОТ 2027', table(['Показатель','Конец 2026','План 2027'], [['Охранники',N(W.hr(W.idxOf(2026,11,31)).guards),N(pl.guards1)],['Администрация',N(W.adminCount(W.idxOf(2026,11,31))),N(pl.admin1)],[`ФОТ с взносами за год, ${U()}`,M(b26.guardC+b26.adminC),M(t('guard')+t('adminC'))]]), `оклады +${d.salary} %`)}`;
    }
    if (tab==='approve'){
      const STEPS = ['черновик','у исполнительного директора','у учредителя','утверждён'];
      const items = [['sales','Бюджет продаж','Коммерческий директор'],['hr','Бюджет ФОТ и найма','Кадровик'],['supply','Бюджет снабжения','Снабженец'],['fleet','Бюджет автопарка','Механик'],['cf','БДДС','Главный бухгалтер'],['bdr','Свод (БДР)','Главный бухгалтер']];
      body = card('Согласование бюджета 2027', table(['Бюджет','Ответственный','Статус','Следующий шаг'], items.map(([k,n,who])=>{ const st = S.appr[k]||0; return [n, who, `<span class="pill ${st===3?'':'w'}" style="${st===3?'background:var(--good)':''}">${STEPS[st]}</span>`, st<3 ? `<button type="button" class="btn" data-appr="${k}">${['Отправить директору','Согласовать (директор)','Утвердить (учредитель)'][st]}</button>` : '—']; })), 'маршрут: ответственный → исполнительный директор → учредитель; каждое решение — в журнал') + card('Правила', `<ul class="ul"><li>Бюджет года собирается до 20 ноября: продажи, ФОТ, снабжение, автопарк → ДДС → свод</li><li>Закупки и оплаты сверх бюджета статьи — только со второй подписью (Р1)</li><li>План-факт обновляется каждые 10 минут по данным 1С, отклонение больше 5 % — сигнал руководителю статьи</li><li>ИИ-аналитик объясняет отклонение и предлагает перенос лимитов между месяцами</li></ul>`);
    }
    return head + body;
  }

  // ---------- СКЛАД, АВТОПАРК, 1С ----------
  function supply(){
    const to = RNG.to, st = CAT.stock, hr = W.hr(to), hires = W.hrRange(RNG.from,to).hires, low = st.filter(x=>x.stock<x.min), b = W.balance(to);
    const issued = st.map(x=>({ ...x, inPeriod: Math.round(x.issued * hires / Math.max(1,hr.total) * 1.2) }));
    return h1('Склады и снабжение', `остатки на ${dt(to)}`) + `
    <div class="tiles">${tile('Ниже минимума', low.length, [low.map(x=>x.item).join(' · ')||'нет'], 'var(--bad)')}${tile('Выдано за период', N(issued.reduce((s,x)=>s+x.inPeriod,0))+' ед.', [`новым сотрудникам: ${N(hires)} чел.`], '')}${tile('Остатки склада', MU(b.inv), ['= запасы в балансе'], '')}${tile('Долг поставщикам', MU(b.ap), ['по балансу на дату · оплата 15-го'], '')}</div>
    ${card(`Остатки и выдача на ${dt(to)}`, T2({ id:'supply-stock', csv:'stock', cols:[{ key:'item', title:t('an.c.item_stock'), html:r=>esc(tx(r.item)) }, { key:'unit', title:t('an.c.unit'), lo:true }, { key:'stock', title:t('an.c.stock'), kind:'int' }, { key:'min', title:t('an.c.min'), kind:'int', lo:true }, { key:'inPeriod', title:t('an.c.issued'), kind:'int', sum:'sum' }, { key:'price', title:t('an.c.price'), kind:'tenge', lo:true }, { key:'cost', title:t('an.c.stock_cost'), kind:'tenge', sum:'sum', share:true }, { key:'cover', title:t('an.c.cover'), kind:'mo', tip:t('an.c.cover_tip'), cls:r=>r.cover<1?'dn':'' }, { key:'low', title:t('an.c.below_min'), kind:'pct', sum:'max', cls:r=>r.low>30?'dn':(r.low>0?'wn':'') }, { key:'st', title:t('an.c.status'), html:r=>r.low>0?`<span class="pill${r.low>30?'':' w'}">заказать · −${F(r.low,0)} %</span>`:'<span class="pill g">ок</span>' }], rows: issued.map((x,k)=>({ ...x, cost:x.stock*x.price, cover: x.issued ? x.stock/(x.issued/12) : null, low: x.stock<x.min ? (1-x.stock/x.min)*100 : 0, st:0, _kind:'stock', _id:k, _cls: x.stock<x.min ? 'an-bad' : '' })), sort:{ key:'low', dir:'desc' } }), 'покрытие = остаток ÷ средняя выдача в месяц · степень ниже минимума = 1 − остаток ÷ минимум')}
    ${(()=>{ const ms = months12(to); return card('Закупки формы и выдача со склада · 12 месяцев', `<div class="two"><div>${bars(ms.map(x=>conv(W.pl(x.from,x.to).uniform)/1e6*x.rate), ms.map(plabel), {label:'закупки', unit:U()+' · '+tx('закупки по месяцам'), fmt:v=>F(v)+' '+U(), values:v=>F(v,1), color:'var(--c1)', hollow:ms.map(x=>x.partial)})}</div><div>${bars(ms.map(x=>Math.round(st.reduce((s0,y)=>s0+y.issued,0) * W.hrRange(x.from,x.to).hires / Math.max(1,W.hr(x.to).total) * 1.2 * x.rate)), ms.map(plabel), {label:'выдано', unit:tx('ед.')+' · '+tx('выдано по месяцам'), fmt:v=>N(v)+' '+tx('ед.'), values:v=>N(v), color:'var(--c6)', hollow:ms.map(x=>x.partial)})}</div></div>`, partNote(ms).replace(/^ · /,'')); })()}
    ${card('Поставщики', T2({ id:'supply-suppliers', csv:'suppliers', search:false, cols:[{ key:'name', title:t('an.c.supplier') }, { key:'cat', title:t('an.c.category'), lo:true, html:r=>esc(tx(r.cat)) }, { key:'orders', title:t('an.c.orders'), kind:'int', sum:'sum', share:true }, { key:'rating', title:t('an.c.rating'), kind:'num', sum:'avg', fmt:v=>'★'.repeat(Math.round(v))+' '+F(v), totFmt:v=>F(v) }, ...(hasMoney(roleOf(S.role)) ? [{ key:'debt', title:t('an.c.debt_supplier'), kind:'tenge', sum:'sum', share:true }] : [])], rows: CAT.suppliers.map((x,k)=>({ ...x, _kind:'supplier', _id:k })), sort:{ key:'orders', dir:'desc' } }), hasMoney(roleOf(S.role)) ? `долг поставщикам по балансу на ${dt(to)} — ${MU(b.ap)}` : '')}`;
  }
  function fleetSec(){
    const to = RNG.to, f = W.fleetAt(CAT.fleet, to), cost = W.fleetCost(CAT.fleet, RNG.from, to), short = c => c.car.split(' ').slice(0,2).join(' ');
    return h1('Автопарк', `${f.length} автомобилей · состояние на ${dt(to)}`) + `
    <div class="tiles">${tile('ТО в ближайшие 1000 км', f.filter(c=>c.toLeft<=1000).length, [f.filter(c=>c.toLeft<=1000).map(c=>`${short(c)} — ${N(c.toLeft)} км`).join(' · ')||'нет'], 'var(--warn)')}${tile('Страховки ≤ 30 дн.', f.filter(c=>c.insLeft<=30).length, [f.filter(c=>c.insLeft<=30).map(c=>`${short(c)} до ${dts(c.insDay)}`).join(' · ')||'нет'], 'var(--bad)')}${tile('Расходы за период', MU(cost), [deltaLine((a,b)=>W.fleetCost(CAT.fleet,a,b), true)], '')}${tile('Перерасход ГСМ > 10 %', f.filter(c=>c.fuelFact/c.fuelNorm>1.1).length, [f.filter(c=>c.fuelFact/c.fuelNorm>1.1).map(c=>`${short(c)} +${F((c.fuelFact/c.fuelNorm-1)*100,0)} %`).join(' · ')||'нет'], 'var(--bad)')}</div>
    ${(()=>{ const money = hasMoney(roleOf(S.role)), f0 = W.fleetAt(CAT.fleet, Math.max(0, RNG.from-1)), pv = RNG.prev, ya = RNG.yago, y = W.yOf(to), price = W.P && W.P.fuelPrice ? W.P.fuelPrice[y] : null;
      const rows = f.map((c,k)=>{ const one = [CAT.fleet[k]], cost = W.fleetCost(one, RNG.from, to), km = Math.max(0, c.kmAt - f0[k].kmAt); return { car:c.car, role:c.role, year:c.year, kmAt:c.kmAt, km, toLeft:c.toLeft, ins:c.insDay, insLeft:c.insLeft, insp:c.inspDay, inspLeft:c.inspLeft, fn:c.fuelNorm, ff:c.fuelFact, over:(c.fuelFact/c.fuelNorm-1)*100, cost, perKm: km ? cost/km : null, overT: price && c.fuelFact > c.fuelNorm ? (c.fuelFact-c.fuelNorm)/100*km*price : null, costM:c.costM, cp: pv ? W.fleetCost(one, pv.from, pv.to) : null, cy: ya ? W.fleetCost(one, ya.from, ya.to) : null, _kind:'car', _id:k, _cls: c.insLeft<=30 || c.fuelFact/c.fuelNorm>1.1 ? 'an-bad' : (c.toLeft<=1000 ? 'an-warn' : '') }; });
      return card(`Карточки автомобилей на ${dt(to)}`, T2({ id:'fleet-cars', csv:'fleet', cols:[{ key:'car', title:t('an.c.car') }, { key:'role', title:t('an.c.purpose'), lo:true, html:r=>esc(tx(r.role)) }, { key:'year', title:t('an.c.year'), kind:'int', lo:true, fmt:v=>String(v) }, { key:'kmAt', title:t('an.c.km_at'), kind:'km', lo:true }, { key:'km', title:t('an.c.km_period'), kind:'km', sum:'sum' }, { key:'toLeft', title:t('an.c.to_left'), kind:'km', cls:r=>r.toLeft<=1000?'wn':'' }, { key:'ins', title:t('an.c.ins_to'), kind:'date', cls:r=>r.insLeft<=30?'dn':'' }, { key:'insp', title:t('an.c.insp_to'), kind:'date', lo:true, cls:r=>r.inspLeft<=30?'dn':'' }, { key:'over', title:t('an.c.fuel'), kind:'pct', html:r=>`${F(r.fn)} / <span class="${r.over>10?'dn':''}">${F(r.ff)}</span>` }, ...(money ? [{ key:'cost', title:t('an.c.cost_period'), kind:'money', sum:'sum', share:true, cmp:{ low:true, prev:r=>r.cp, yago:r=>r.cy } }, { key:'perKm', title:t('an.c.per_km'), kind:'tenge', lo:true, tot:rs=>{ let a=0, b=0; rs.forEach(r=>{ a+=r.cost; b+=r.km; }); return b ? a/b : null; } }, ...(price ? [{ key:'overT', title:t('an.c.over_t'), kind:'tenge', sum:'sum', lo:true, tip:t('an.c.over_tip') }] : []), { key:'costM', title:t('an.c.cost_norm'), kind:'tenge', sum:'sum', lo:true }] : [])], rows, sort: money ? { key:'cost', dir:'desc' } : { key:'toLeft', dir:'asc' } }), 'расходы за период — строка ОПиУ «Транспорт и ГСМ», распределённая по машинам долей нормы; пробег за период — по одометру на начало и конец периода'); })()}
    ${hasMoney(roleOf(S.role)) ? (()=>{ const ms = months12(to); return card('Расходы автопарка · 12 месяцев', bars(ms.map(x=>conv(W.fleetCost(CAT.fleet,x.from,x.to))/1e6*x.rate), ms.map(plabel), {label:'расходы автопарка', unit:U()+' · '+tx('по месяцам'), fmt:v=>F(v)+' '+U(), values:v=>F(v,1), color:'var(--c1)', hollow:ms.map(x=>x.partial)}), partNote(ms).replace(/^ · /,'')); })() : ''}`;
  }
  function quality(){
    const to = RNG.anchor, o = W.onec(to), p = W.pl(W.MONTHS[W.monthIdx(to)].start, to), b = W.balance(to), ar = W.receivables(to), ag = W.aging(to);
    const src = [
      ['1С:Бухгалтерия — реализация (акты)', dt(to), o.exportRejected?'warn':'ok', o.exportRejected?'выгрузка отклонена, в отчётах версия предыдущего цикла':'принята, сверка с оборотом по 62 счёту'],
      ['1С:Бухгалтерия — банк и касса', dt(to), 'ok', 'принята, остаток = баланс'],
      ['1С:Бухгалтерия — ОСВ', dt(to), 'ok', 'активы = пассивы, расхождение 0 ₸'],
      ['1С:Бухгалтерия — зарплата и взносы', dt(W.MONTHS[Math.max(0,W.monthIdx(to)-1)].end), 'ok', 'по последнему закрытому месяцу'],
      ['Отметки смен (телефоны)', dt(to)+' 23:38', 'ok', 'каждые 10 минут'],
      ...(to < W.LAUNCH_DEMO ? [] : [['Битрикс24 — задачи и документы', dt(to)+' 23:30', 'ok', 'каждые 10 минут, только чтение']]),
      ['Курсы НБ РК', dt(to), 'ok', 'на дату'],
      ['Effector Saver — журнал копий', dt(to), o.effectorOk?'ok':'error', o.effectorOk?'копии выполнены':'ночная копия не выполнена'],
    ];
    const pill = st => `<span class="pill ${st==='ok'?'g':(st==='warn'?'w':'')}">${st==='ok'?'норма':(st==='warn'?'внимание':'ошибка')}</span>`;
    // сверки (М7): каждая — настоящее сравнение двух расчётов; «контроль целостности» — сумма подстатей против книги проводок
    const QC = (()=>{ const ok1 = (x, y) => Math.abs(x - y) < 1, y0 = Math.max(1, W.idxOf(W.yOf(to),0,1)), py = W.pl(y0, to), cfy = W.cashflow(y0, to), b0 = W.balance(y0-1), d = k => b[k] - b0[k];
      const ind = py.net + py.dep + py.interest - d('ar') - d('inv') + d('ap') + d('salpay') + d('paytax') + d('vat') + d('citpay') + d('vacres');
      const e = W.equityChanges(0,to), agT = ag.notDue+ag.d30+ag.d60+ag.d90+ag.d90p+ar.unbilled, m0 = W.MONTHS[W.monthIdx(to)].start, so = W.objects.reduce((s2,o2)=>s2+W.sumO(o2,'rev',m0,to),0);
      const tr = plTree([{ from:m0, to }], { months:false }).by, tm = W.taxes(y0, to), lawE = ySegs(y0, to).reduce((s2,[x,z,yr])=>s2 + W.taxes(x,z).fotGross*LAW_EMP(yr), 0);
      const sa = -(tr.get('sales').v[0] + tr.get('admin').v[0]), pa = p.adminC + p.office + p.other + p.it + p.selling, o12 = W.overtime(to-364, to);
      const lawDiv = (()=>{ let cum = 0, v = 0; for (const x of W.dividendsLog){ if (W.yOf(x.day) !== W.yOf(to) || x.day > to) continue; v += LAW_DIV(W.yOf(x.day), cum, x.amount); cum += x.amount; } return v; })();   // ИПН с дивидендов за год по закону, нарастающим итогом
      const rc = rateCheck(), rcBad = rc.filter(x => x.bad.length).length;
      const qv = to < W.idxOf(2022,1,25) ? b.vat : (()=>{ const vn = W.upcoming(to).vatNext; let open = vn.amount; const q0 = vn.q; if (vn.complete){ const s3 = W.MONTHS[Math.min(W.MONTHS.length-1, 3*q0+3)].start; open += s3 <= to ? W.taxes(s3, to).vat : 0; } return open; })();
      return [
        ['Активы = обязательства + капитал', M(b.assets), M(b.liabilities+b.equity), '', Math.abs(b.diff)<1],
        ['Дебиторка = по срокам + начислено без акта', M(ar.total), M(agT), '', ok1(ar.total, agT)],
        ['Капитал: движение = баланс', M(e.total.close), M(b.equity), '', ok1(e.total.close, b.equity) && Math.abs(e.other)<1],
        ['Деньги: ДДС на конец = баланс', M(W.cashflow(0,to).close), M(b.cash), '', ok1(W.cashflow(0,to).close, b.cash)],
        [t('k83.q_ind', { d: dts(y0) }), M(ind), M(cfy.operating), '', ok1(ind, cfy.operating)],
        ['Выручка месяца: ОПиУ = сумма по объектам', M(p.revenue), M(so), '', ok1(p.revenue, so)],
        [t('pl.q.net'), M(tr.get('net').v[0]), M(p.net), t('k83.q_int'), ok1(tr.get('net').v[0], p.net)],
        [t('pl.q.sga'), M(sa), M(pa), t('k83.q_int'), ok1(sa, pa)],
        [t('pl.q.tax'), M(tm.employerSum), M(lawE), 'сходится', ok1(tm.employerSum, lawE)],
        [t('k83.q_vat'), M(b.vat), M(qv), '', ok1(b.vat, qv)],
        [t('k83.q_ot'), t('k83.hrs', { n: N(Math.round(o12.last365)) }), t('k83.hrs', { n: N(120) }), t('k83.q_lim'), o12.last365 <= W.P.otYear],
        [t('k84.q_div', { y: W.yOf(to) }), M(tm.divIpn), M(lawDiv), '', ok1(tm.divIpn, lawDiv)],
        [t('k84.q_rates'), `${N(rc.length - rcBad)} / ${N(rc.length)}`, `${N(rc.length)} / ${N(rc.length)}`, '', !rcBad],
      ]; })();
    return h1('Качество данных', `на ${dt(to)} · данные по ${dt(to)}, сегодня ${dt(Math.min(to+1,W.DAYS-1))}`) + `
    <div class="tiles">${tile('Источников в норме', `${src.filter(x=>x[2]==='ok').length} / ${src.length}`, [src.filter(x=>x[2]!=='ok').map(x=>x[0]).join(' · ')||'все в норме'], src.every(x=>x[2]==='ok')?'var(--good)':'var(--warn)')}${tile('Карантин', '0 строк', ['строки с датой позже «сегодня» и до начала истории не принимаются в версию'], '')}${tile('Сверка движок ↔ отчёт', `${QC.filter(x=>x[4]).length} / ${QC.length}`, [QC.every(x=>x[4]) ? t('k83.q_ok') : `<span class="dn">${t('k83.q_bad')}: ${QC.filter(x=>!x[4]).map(x=>x[0]).join(' · ')}</span>`, t('k83.q_l2', { v: F(Math.abs(b.diff),2) })], QC.every(x=>x[4]) ? 'var(--good)' : 'var(--bad)')}</div>
    ${card('Источники', table(['Источник','Данные по','Статус','Комментарий'], src.map(x=>[x[0],x[1],pill(x[2]),x[3]])), 'дата данных у каждого источника своя — так видно, что отчёт может быть неполным')}
    ${card('Сверки', table(['Проверка','Движок','Отчёт','Результат'], QC.map(x=>[x[0], x[1], x[2], x[4] ? `<span class="up">${x[3] || t('k83.q_match')}</span>` : '<span class="dn">расхождение</span>'])), `${U()} · пересчитывается при каждом цикле движка`)}
    ${card('Правила приёма выгрузки', `<ul class="ul"><li>Граница версии — последняя дата строки не позже «сегодня»; строки с будущей датой и до начала истории уходят в карантин и не сдвигают границу</li><li>Новая выгрузка сравнивается с принятой по числу строк и контрольной сумме; меньше строк — сигнал с причиной, а не тихое отклонение всего источника</li><li>Неполный источник помечает зависимые показатели «мало данных», а не обнуляет их</li></ul>`, 'контроль каждой выгрузки')}`;
  }
  function onec(){
    const to = RNG.anchor, o = W.onec(to), days = Array.from({length:Math.min(RNG.len,62)},(_,k)=>to-k).filter(d=>d>=0).map(d=>({ d, x:W.onec(d) })), bad = days.filter(z=>!z.x.effectorOk||z.x.exportRejected);
    return h1('Сервер и 1С', 'виртуальный администратор 1С · ступень 1 — сводка и сигналы · перезапуски — только по фразе владельца') + `
    <div class="tiles">${tile(`Выгрузки ${dt(to)}`, `${o.exportsOk} / ${o.exportsTotal}`, [o.exportRejected?'<span class="dn">выгрузка отклонена</span>':'сверка с оборотно-сальдовой ведомостью сходится'], o.exportRejected?'var(--bad)':'var(--good)')}${tile('Бэкапы', o.effectorOk?'3 / 3':'2 / 3', [o.effectorOk?'все копии выполнены':'<span class="dn">1С:Бухгалтерия — ошибка Effector Saver</span>'], o.effectorOk?'var(--good)':'var(--bad)')}${tile('Дней со сбоями за период', bad.length, [bad.slice(0,5).map(z=>dts(z.d)).join(' · ')||'нет'], 'var(--warn)')}${tile('Сервер', `ЦП ${o.cpu} %`, [`память ${o.ram} % · диск копий свободно ${P(o.diskBackupFree*100)}`], '')}</div>
    ${card('Журнал по дням', table(['Дата','Выгрузки','Effector Saver','MS SQL','Сеансы','Ошибки журнала'], days.slice(0,31).map(z=>[dt(z.d),`${z.x.exportsOk} / ${z.x.exportsTotal}`, z.x.effectorOk?'<span class="up">OK</span>':'<span class="dn">ошибка</span>','<span class="up">OK</span>',N(z.x.sessions),N(z.x.errors)])), `последние ${Math.min(31,days.length)} ${plural(Math.min(31,days.length),'день','дня','дней')} по ${dt(to)}`)}
    ${card('Что ИИ-администратор делает сам, а что — по фразе владельца', table(['Действие','Ступень','Кто решает'],[['Сводка состояния, сигналы, объяснение ошибок','1','ИИ'],['Завершить зависший сеанс робота','2','ИИ, с записью в журнал'],['Повторно запустить своё задание','2','ИИ, после подтверждения администратора'],['Перенести старые копии на архивный диск или в облако','—','по фразе владельца'],['Удалить копии','запрещено','никто (ТЗ 3.2, 3.5)'],['Перезапуск агента 1С, SQL, сервера','—','только по фразе владельца']]))}`;
  }

  // ---------- АДМИНИСТРАТОР, РАЗРАБОТЧИК, ПРОЧЕЕ ----------
  // ---------- ПОДКЛЮЧЕНИЯ: государственные системы, ЭЦП, базы 1С ----------
  // ключи ЭЦП (НУЦ РК) выпускаются на год; даты — демо. ИИН, пароли и файлы ключей в интерфейсе не показываются никогда
  // шаблоны ключей: месяц и день ежегодного выпуска (ключ действует год); текущий ключ — последний выпуск не позже даты
  const ECP_T = [
    { who:'Генеральный директор', kind:'AUTH — вход в госсистемы', media:'Kaztoken (защищённый носитель)', m:1, d:3, use:'eGov, банк, Кабинет налогоплательщика' },
    { who:'Генеральный директор', kind:'GOST — подпись документов', media:'Kaztoken (защищённый носитель)', m:1, d:3, use:'приказы, договоры, платежи свыше 10 млн ₸' },
    { who:'Исполнительный директор', kind:'AUTH — вход в госсистемы', media:'Kaztoken (защищённый носитель)', m:2, d:16, use:'Кабинет налогоплательщика, eGov, ИС ЭСФ (вход)' },
    { who:'Исполнительный директор', kind:'GOST — подпись документов', media:'Kaztoken (защищённый носитель)', m:2, d:16, use:'приказы по основной деятельности, платежи до 10 млн ₸' },
    { who:'Главный бухгалтер', kind:'AUTH — вход в госсистемы', media:'хранилище ключей сервера (зашифровано)', m:10, d:28, use:'Кабинет налогоплательщика, ИС ЭСФ, ЕНПФ' },
    { who:'Главный бухгалтер', kind:'GOST — подпись документов', media:'хранилище ключей сервера (зашифровано)', m:10, d:28, use:'ЭСФ, ФНО, платёжные поручения в банк' },
    { who:'Кадровик', kind:'GOST — подпись документов', media:'хранилище ключей сервера (зашифровано)', m:4, d:6, use:'уведомления о приёме и увольнении (ЕСУТД)' },
    { who:'Коммерческий директор', kind:'GOST — подпись документов', media:'Kaztoken (защищённый носитель)', m:0, d:20, use:'заявки на госзакупки (тендеры на охрану)' },
  ];
  const ecpAt = at => ECP_T.map(k=>{ let y = W.yOf(at); let from = W.idxOf(y, k.m, k.d); if (from > at) from = W.idxOf(y-1, k.m, k.d); return { ...k, from, to: W.idxOf(W.yOf(from)+1, k.m, k.d) - 1 }; });
  const ECP = { filter: f => ecpAt(RNG.anchor).filter(f), find: f => ecpAt(RNG.anchor).find(f) };
  function connTab(){
    if (RNG.anchor < W.LAUNCH_DEMO) return card('Подключения', note(`Подключения SUNKAR BI ведутся с ${dt(W.LAUNCH_DEMO)}. На выбранную дату (${dt(RNG.anchor)}) учёт вёлся в 1С без единой системы.`));
    const at = RNG.anchor, oc = W.onec(at), lastSync = d => `${dts(d)} 06:00`;
    const keys = ecpAt(at), left = k => k.to - at;
    const keySt = k => left(k) < 0 ? '<span class="pill">истёк</span>' : (left(k) <= 30 ? `<span class="pill w">${left(k)} ${plural(left(k),'день','дня','дней')}</span>` : '<span class="up">действует</span>');
    const soon = keys.filter(k => left(k) >= 0 && left(k) <= 30), expired = keys.filter(k => left(k) < 0);
    const gov = [
      ['Кабинет налогоплательщика (КГД)', 'лицевой счёт по налогам, уведомления, статусы ФНО', 'вход ключом AUTH бухгалтера; выгрузка лицевого счёта раз в сутки', 'чтение', lastSync(at), 'сверка: начислено в 1С = лицевой счёт'],
      ['ИС ЭСФ', 'выписанные и полученные счета-фактуры, статусы', 'через модуль ЭСФ в 1С:Бухгалтерии', 'чтение; выписка — подпись человеком', lastSync(at), 'сверка ЭСФ с актами и НДС'],
      ['eGov / eGov Business', 'справки об отсутствии налоговой задолженности, о регистрации; статус лицензии', 'вход ключом AUTH директора по запросу', 'по запросу', dt(Math.max(0, at-9)), 'справки для тендеров — в папку «03 Юридические»'],
      ['Реестр лицензий (охранная деятельность)', 'статус лицензии Агентства и её приложений', 'проверка в открытом реестре', 'чтение', lastSync(at), 'лицензия бессрочная, действует'],
      ['ЕНПФ · ГФСС · ФСМС', 'поступление ОПВ, ОПВР, СО, ОСМС по сотрудникам', 'выписки через Кабинет налогоплательщика и 1С', 'чтение', dt(W.MONTHS[Math.max(0,W.monthIdx(at)-1)].end), 'сверка с ведомостью взносов'],
      ['ЕСУТД (трудовые договоры)', 'уведомления о приёме и увольнении', 'кадровик-ИИ готовит, кадровик подписывает ЭЦП', 'подпись человеком', dt(Math.max(0, at-2)), 'расхождения с кадрами SUNKAR BI: 0'],
      ['Портал госзакупок', 'объявления о закупке услуг охраны по регионам Агентства', 'поиск объявлений раз в 2 часа', 'чтение; заявка — подпись человеком', `${dts(at)} 08:00`, 'новые объявления — задача коммерческому директору'],
    ];
    const bases = [
      ['SSS_BUH', 'ТОО «SUNKAR SECURITY SERVICES»', '1С:Бухгалтерия для Казахстана 3.0 · 1С-Рейтинг 3.0.73.1', 'сервер 1С · MS SQL', 'SUNKAR_BI_robot', `каждые 10 мин · ${oc.exportsOk} из ${oc.exportsTotal} за ${dts(at)}`, 'документами 1С по поручению, с копией перед записью', oc.exportRejected ? '<span class="pill">выгрузка отклонена</span>' : '<span class="up">в работе</span>'],
      ['SSS_BUH_TEST', 'копия рабочей базы', 'та же конфигурация', 'сервер 1С · MS SQL', 'SUNKAR_BI_robot', 'по запросу', 'проверка поручений перед рабочей базой', '<span class="dl">копия от ' + dt(W.MONTHS[Math.max(0,W.monthIdx(at)-1)].start) + '</span>'],
      ['Вторая организация', 'новое ТОО группы (по решению владельца)', '1С:Бухгалтерия для Казахстана 3.0', 'тот же сервер', '—', '—', '—', '<span class="dl">не подключена</span>'],
    ];
    const due = soon.length + expired.length + (oc.exportRejected ? 1 : 0), REG = connRegistry(at);
    const regCard = card(`Реестр подключений на ${dt(at)}`, mod('analytics').fromRows(['Подключение','Направление','Частота','Последний обмен','Ошибок','Ответственный',''], REG.map((r,i)=>[`<b>${r[0]}</b><br><small>${r[1]} · ${r[5]} · доступ: ${r[8]}</small>`, r[2], r[3], r[4], r[6] ? `<span class="dn">${r[6]}</span>` : '0', r[7], `<button type="button" class="btn" data-chk="${r[5]==='не подключена'?'off':i}">Проверить</button>`]), { id:'admin-conn-reg', csv:'connections', compact:true, lo:[2,5], nosort:[6], kinds:{ 4:'int' }, sums:{ 4:'sum' }, vals:{ 4:(r,k)=>REG[k][6] }, meta:k=>({ _kind:'conn', _id:k, _cls:REG[k][6]?'an-bad':'' }) }), 'все подключения демонстрационные · ← чтение, → отправка, ↔ обмен в обе стороны · секреты только в файле на сервере');
    return `<div class="tiles">${tile('Подключений', `${REG.filter(r=>r[5]!=='не подключена').length} / ${REG.length}`, ['вторая организация 1С — по решению владельца'], '')}${tile('Государственные системы', `${gov.length} / ${gov.length}`, ['подключены на чтение · подпись — только человек'], '')}${tile('Ключи ЭЦП', keys.length, [soon.length ? `скоро истекает: ${[...new Set(soon.map(k=>`${k.who.toLowerCase()} (${left(k)} дн.)`))].join(', ')}` : (expired.length ? `истёк: ${[...new Set(expired.map(k=>k.who.toLowerCase()))].join(', ')}` : 'все действуют')], expired.length ? 'var(--bad)' : (soon.length ? 'var(--warn)' : ''))}${tile('Базы 1С', '2 / 3', [`рабочая и тестовая · выгрузки ${dts(at)}: ${oc.exportsOk} из ${oc.exportsTotal}`], oc.exportRejected ? 'var(--bad)' : '')}${tile('Требует внимания', due, [due ? 'см. строки с отметкой ниже' : 'всё в порядке'], due ? 'var(--warn)' : '')}</div>
    ${regCard}
    ${bitrixCard(at)}
    ${card(`Государственные системы на ${dt(at)}`, table(['Система','Что берём','Как подключено','Режим','Последняя сверка','Результат'], gov.map(r=>[`<b>${r[0]}</b>`, r[1], r[2], r[3], r[4], r[5]]), '', [2]), 'сдать отчёт, выписать ЭСФ или подать заявку может только человек своей ЭЦП; ИИ готовит черновик и сверяет')}
    ${card(`Хранилище ключей ЭЦП (НУЦ РК) на ${dt(at)}`, mod('analytics').fromRows(['Владелец ключа','Ключ','Где хранится','Действует до','Для чего','Статус'], keys.map(k=>[`<b>${k.who}</b>`, k.kind, k.media, dt(k.to), k.use, keySt(k)]), { id:'admin-ecp', csv:'ecp_keys', search:false, lo:[2,4], vals:{ 3:(r,k)=>keys[k].to }, meta:k=>({ _kind:'ecp', _id:k, _cls:left(keys[k])<0?'an-bad':(left(keys[k])<=30?'an-warn':'') }) }) + `<div class="ev" style="margin-top:10px"><div><span class="pill i">правила</span><div class="what">Файл ключа загружает только сам владелец ключа на сервере Агентства — в зашифрованное хранилище или на защищённый носитель<small>пароль ключа не сохраняется: его вводит владелец при каждой подписи · ИИ ключами не пользуется · каждое использование ключа — в журнал · за 30, 14 и 7 дней до окончания — задача на перевыпуск через eGov · файлы ключей в чат, почту и репозиторий не попадают</small></div><button type="button" class="btn" disabled title="в демо-версии ключи не загружаются">Добавить ключ (на сервере)</button></div></div>`, 'ключи выпускаются на год')}
    ${card('Базы 1С', table(['База','Организация','Конфигурация','Где','Учётная запись','Выгрузка','Запись из SUNKAR BI','Статус'], bases.map(r=>[`<b>${r[0]}</b>`, ...r.slice(1)]), 'compact', [3,4,6]) + note('строки подключения и пароли хранятся в файле секретов на сервере и здесь не показываются · подключение новой базы — по решению владельца: реестр баз → тестовая выгрузка → сверка с ОСВ → включение в отчёты'), 'клиент-серверный вариант · новая организация добавляется строкой в реестр')}
    ${exchangeLog(at)}`;
  }
  function admin(tab){
    tab = tab||'roles'; const to = RNG.to, hr = W.hr(to), posts = W.totPosts(to), objs = W.objects.filter(o=>W.active(o,to)).length;
    const tabs = [['roles','Роли и права'],['org','Орг. структура'],['conn','Подключения'],['journal','Журнал'],['ai','Расход ИИ'],['backups','Копии и доступы']];
    // администрация на дату: 6 ключевых должностей + остальные по очереди укомплектования
    const al = adminSplit(hr.admin);
    const org = { title:'Учредитель', role:'Учредитель', n:1, children:[{ title:'Генеральный директор', role:'Генеральный директор', n:1, children:[{ title:'Исполнительный директор', role:'Исполнительный директор', n:1, children:[
      { title:'Начальник охраны', role:'Начальник охраны', n:1, children:[...(al.d ? [{ title:'Заместители по регионам', role:'Начальник охраны', n:al.d }] : []),{ title:'Начальники объектов', role:'Начальник объекта', n:objs, note:'по одному на объект, совмещают пост, входят в число охранников' },{ title:'Старшие смен', role:'Старший смены', n:posts, note:'из числа охранников' },{ title:'Охранники', role:'Охранник', n:hr.guards, note:'включая подменный резерв и ГБР' }]},
      { title:'Коммерческий директор', role:'Коммерческий директор', n:1, children: al.m ? [{ title:'Менеджеры и тендерный специалист', role:'Менеджер по продажам', n:al.m }] : []},
      { title:'Главный бухгалтер', role:'Бухгалтер', n:1, children: al.a ? [{ title:'Бухгалтер по зарплате, финансист', role:'Бухгалтер', n:al.a }] : []},
      ...[{ title:'Кадровая служба', role:'Кадровик', n:al.h },{ title:'Юрист', role:'Юрист', n:1 },{ title:'Снабжение и склад', role:'Снабженец', n:al.s },{ title:'Автопарк: механик и водители', role:'Механик / Водитель', n:al.f },{ title:'Офис-менеджер, диспетчер', role:'Сотрудник', n:al.o },{ title:'Администратор системы', role:'Администратор', n:1 }].filter(x=>x.n>0) ]}]}]};
    const tree = n => `<div class="org"><div class="node"><b>${n.title}</b><span>${n.role}</span><em>${N(n.n)} чел.${n.note?' · '+n.note:''}</em></div>${n.children?`<div class="kids">${n.children.map(tree).join('')}</div>`:''}</div>`;
    let body = '';
    if (tab==='org') body = card(`Организационная структура на ${dt(to)}`, `<div class="orgwrap">${tree(org)}</div>`, `${N(hr.total)} сотрудников · ${hr.admin} администрация · ${N(hr.guards)} ${nw(N(hr.guards),'охранников')}`);
    if (tab==='journal'){ const inc = W.incidents.filter(x=>x.day===to).slice(0,8), tk = W.tasksAt(to).filter(x=>x.created===to).slice(0,8), oc = W.onec(to);
      body = card(`Журнал действий людей и ИИ · ${dt(to)}`, mod('analytics').fromRows(['Время','Кто','Действие','Объект'], [...LIVE.docs.concat(LIVE.tasks).slice(-6).reverse().map(x=>[tOf(x.ts), esc(whoOf(x)), x.kind==='order' ? 'проект приказа: ' + ((ORD_T[x.t]||[])[1]||'') : (x.kind==='memo' ? 'служебная записка: ' + esc(x.subj||'') : 'задача: ' + esc(x.title||'')), 'общий журнал']), ...(to < W.LAUNCH_DEMO ? [] : [['03:00','ИИ · администратор 1С', oc.effectorOk?'бэкапы выполнены':'сигнал «бэкап не выполнен»','1С:Бухгалтерия'], ['07:30','ИИ · дежурный директор','утренняя сводка отправлена','директор'], ...inc.map(x=>[x.time,'ИИ · дежурный по объектам',`зарегистрировано: ${x.type}`,x.obj.name]), ...tk.map(x=>['09:00','ИИ · '+x.owner.toLowerCase(),`создана задача ${x.no}`,esc(x.title)])]), ...inc.map(x=>[x.time, to < W.LAUNCH_DEMO ? 'Начальник объекта' : 'ИИ · дежурный по объектам', `зарегистрировано: ${x.type}`, x.obj.name])], { id:'admin-journal', csv:'journal', total:false }), 'хранится не меньше 3 лет · журналы смен и происшествий — 5 лет'); }
    if (tab==='ai'){ const live = to >= W.idxOf(2025,0,1); const m0 = W.MONTHS[W.monthIdx(to)], days = to - m0.start + 1, k = days/m0.dim;
      const rc = roleCtx(to);
      const rows = [['Генеральный директор',1,9000],['Исполнительный директор',1,17000],['Начальник охраны и заместители',1+rc.al.d,8500],['Начальники объектов',objs,450],['Охранники (без начальников объектов)',Math.max(0,hr.guards-objs),25],['Кадровик',rc.al.h,4200],['Юрист',1,5200],['Главный бухгалтер и бухгалтеры',1+rc.al.a,3400],['Коммерческий директор',1,3600],['Снабженец, механик, диспетчер, менеджеры',rc.al.s+Math.min(1,rc.al.f)+rc.al.o+rc.al.m,1700],['Администратор 1С (робот)',1,6300]];
      const tot = rows.reduce((s2,r)=>s2+r[1]*r[2],0)*k;
      const den = errandsAt(to).filter(e=>e.st==='отклонено по правам').length;
      body = live ? card(`Расход ИИ за ${MONF[m0.m]} ${m0.y} (по ${dts(to)})`, table(['Роль','Пользователей','₸ на пользователя в месяц','Расход за месяц, ₸','Доля'], rows.map(r=>[r[0],N(r[1]),N(r[2]),N(r[1]*r[2]*k),P(r[1]*r[2]*k/tot*100)])) + note(`итого ${N(tot)} ₸ · лимит 149 000 ₸ в месяц, на ${dts(to)} доступно ${N(149000*k)} ₸ (${P(k*100)} месяца) · использовано ${P(tot/(149000*k)*100)} от доступного · при 80 % месячного лимита — переход на более дешёвую модель · отклонено по правам за 7 дней: ${den} (журнал — «ИИ → Поручения»)`), 'учёт по каждому пользователю') : card('Расход ИИ', note('ИИ-помощник подключён с 01.01.2025.')); }
    if (tab==='roles') body = rolesTab(RNG.anchor);
    if (tab==='conn') body = connTab();
    if (tab==='backups') body = card('Три места хранения', table(['Где','Что','Статус'],[['Сервер Агентства · D:\\SUNKAR_BI','движок, данные, документы','этап 0'],['GitHub · SUNKAR-BI/SUNKAR_BI (приватный)','код, документы, ТЗ','OK'],['Облако Агентства','ночной бэкап проекта 03:00','этап 0']])) + card('Доступы', table(['Правило','Значение'],[['Автоблокировка','10 минут (телефон), 30 минут (компьютер)'],['Двухфакторная защита','директор, бухгалтер, кадровик, администратор, учредитель'],['Отзыв доступов при увольнении','в день увольнения, автоматически по приказу'],['Секреты','только в файлах на сервере']]));
    return h1('Администратор', 'роли, орг. структура, журналы, копии · без доступа к данным блоков') + `<div class="tabs">${tabs.map(t=>`<a href="#admin-${t[0]}" class="${t[0]===tab?'on':''}">${t[1]}</a>`).join('')}</div>` + body;
  }
  function dev(){
    let maxDiff = 0; for (let i=0;i<=W.FACT_END;i+=7) maxDiff = Math.max(maxDiff, Math.abs(W.balance(i).diff));
    return h1('Разработчик', 'релизы, проверки, журнал изменений · данные — только образцы') + `
    <div class="tiles">${tile('Версия макета', '0.8.4', ['методика по закону: нормы труда, ставки и базы взносов, НДС за квартал, ОПиУ по уровням, ИИ-помощник, задачи, капитал, два языка'], '')}${tile('Двойная запись', maxDiff < 1 ? 'сходится' : 'расхождение', [`баланс проверен на ${Math.floor(W.FACT_END/7)+1} датах · расхождение ${F(maxDiff,3)} ₸`], maxDiff<1?'var(--good)':'var(--bad)')}${tile('Движок', '61 / 61', ['движок 0.2.0: права, общий журнал, файлы, ИИ, регламенты'], '')}${tile('Режимы работы', 'анализ / исполнение', ['проверки и аудит / исполнение'], '')}</div>
    ${card('Журнал изменений', table(['Дата','Версия','Что изменилось'],[['04.11','0.8.4','Исправления по повторному аудиту 0.8.3: стандартный вычет ИПН с 2026 года — 30 МРП (2022–2025 — 14 МРП); ИПН с дивидендов по году нарастающим итогом (2023–2025 — 10 % сверх 30 000 МРП, 2026 — 5 % до 230 000 МРП и 15 % сверх); FTE на пост по графику — сутки/трое и вахта 4,4, «2/2» 2,3, «5/2» 1,1; базовые тарифы по графику (2026 — 1 790 000, 940 000 и 520 000 ₸ в месяц) — каждый безубыточен; убыточные объекты — только с причиной (договор без индексации, тендерная цена); дивиденды 2026 — 960 млн ₸ в пределах 230 000 МРП; ОПВР — за работников, родившихся после 01.01.1975 (78 % ФОТ); пределы сверхурочных — ст. 78 ТК РК (2 ч в сутки, 120 ч в год при суммированном учёте); лизинг — текущая часть по графику и после 31.12.2026; пределы баз ВОСМС и ООСМС по годам; таблица «модель = закон» — сверка с отдельной таблицей закона, «≠» при расхождении; юнит-экономика по трём графикам; «Качество данных» — сверки ИПН с дивидендов и ставок'],['04.11','0.8.3','Исправления по аудиту логики и расчётов 0.8.2: норма охраны по ТК РК — 4,4 FTE на круглосуточный и 1,9 на дневной пост, тарифы подняты одним коэффициентом, сверхурочные 1,5× отдельной строкой и сигнал при превышении 12 ч в месяц и 120 ч в год, таблица графиков «человек на пост — FTE — часы»; ставки и базы взносов по закону (СН 2025 — 11 %, 2026 — 6 % без вычета СО, ООСМС 2022 — 3 %, СО от оклада − ОПВ, СН от оклада − ОПВ − ВОСМС), ИПН с вычетом 14 МРП; амортизация по объектам ОС с остановкой при полном износе; НДС за квартал (уплата 25-го второго месяца, форма 300.00); КПН — авансы по 1/12, декларация 100.00 и доплата 10.04; ИПН с дивидендов у источника; коммерческие расходы — собственные статьи (тендеры, реклама и сайт, представительские, CRM); финансовые доходы по остаткам на счетах; резерв отпусков (IAS 19); штат, вакансии и резерв 5 % в ФОТ; лизинг — текущая и долгосрочная часть, проценты в ДДС отдельно; смены по графику; юнит-экономика на той же базе, что маржа объекта; прогноз 13 недель с лизингом, дивидендами, НДС и КПН; ДДС с итогами трёх потоков; настоящая сверка в «Качестве данных»; «О расчёте» и «Знания» — методика и таблица ставок по годам'],['04.11','0.8.2','ОПиУ по форме МСФО (расходы по функциям) с раскрытием по уровням: выручка по видам постов, регионам и объектам; себестоимость — ФОТ охраны и взносы работодателя по ставкам года, форма, транспорт и ГСМ, связь на постах; коммерческие расходы выделены из статей администрации без изменения итогов (коммерческая служба, тендеры, реклама и сайт, представительские, CRM); административные; EBITDA, амортизация, операционная прибыль, финансовые доходы и расходы, прибыль до налогообложения, КПН, чистая прибыль и маржа; колонки — прошлый период, год назад, план бюджета и исполнение, «по месяцам», CSV с уровнями; карточка каждой строки; бюджет — строки коммерческих расходов; боковое меню: шрифт 15–16 px, основные разделы выделены, активный пункт с маркером; поправки повторной проверки 0.8.1: карточки строк капитала, вкладки ИИ-помощника при ширине 360 px, поиск и карточка расторгнутого объекта'],['03.11','0.8.1','Исправления по контрольной проверке 0.8.0: глобальный поиск — только в правах роли (задачи, проекты, документы, чаты, поручения, файлы); одно определение «в убытке за период» с расторгнутыми в периоде — в кокпите, «Объектах», карточках и ответах ИИ; каждая карточка, в том числе задача, проверяет права роли; плитки кокпита открывают карточку показателя; встроенный ИИ-помощник отвечает по данным роли о сотрудниках, объектах, сменах, деньгах, сроках, задачах, по карточке и по файлу, иначе — статус «нужен человек»; итоги таблиц и отчётов задач совпадают с плитками; выполненная задача видна в канбане; чат на телефоне — экран целиком; вкладка «Сквозная аналитика» в «Объектах»; автопарк 65 автомобилей по регионам, склад и поставщики — по численности; мелкие исправления: вкладки ИИ, касания 44 px, CSV, даты, шрифты, RU/EN в шапке, синхронизация вкладок браузера'],['03.11','0.8.0','ИИ-помощник: панель любого размера, вкладки «Чат», «Проекты», «Поручения», «Регламент», «Журнал», «Отчёты», регламентные поручения по расписанию, голосовой ввод и голосовые сообщения, файлы; задачи и проекты уровня Битрикс24: соисполнители, наблюдатели, чек-листы, подзадачи, учёт времени, канбан, Гантт, «Мой план», календарь, журнал и отчёты; чаты уровня WhatsApp: группы, фото, видео, голосовые, файлы, правка 5 минут с историей, без удаления; аналитика всех таблиц (итоги, доли, к прошлому периоду и году назад, CSV) и сквозная цепочка объект → заказчик → посты → смены → происшествия → деньги → дебиторка; полные карточки 28 видов; отчёт «Капитал» с резервным капиталом; два языка RU/EN; дизайн-система и тёмная тема; движок 0.2.0: общий журнал и права на сервере'],['03.11','0.7.1','Масштаб компании ×5: на 02.11.2026 — 177 объектов, 452 поста, 112 заказчиков, 1 388 сотрудников, выручка ≈ 6 млрд ₸ в год; 2022–2026 рост с 94 до 177 объектов; расходы, основные средства, лизинг, дивиденды и капитал пересчитаны согласованно, баланс сходится'],['03.11','0.7.0','Работа 24/7 на сервере Агентства: служба держит движок запущенным и перезапускает после сбоя, цикл данных каждые 10 минут, новая версия из GitHub ставится сама после проверки тестами (с копией базы и откатом); сайт по адресу sunkar.kz сам подхватывает новые версии'],['03.11','0.6.1','По контрольной проверке 0.5.6: ИИ, сводка и кокпит компании не показывают деньги ролям без доступа; объекты без выручки для таких ролей; регионы и задачи заместителя по своему региону; стабильные номера заявок; клавиатура в карточках; без ИИ до 2025 года; формы по правам'],['03.11','0.6.0','Рабочий режим: чат пишется и виден всем, кто открыл ссылку; задачи ставятся и двигаются по статусам; приказы создаются и проходят маршрут (согласование, виза, подпись ЭЦП, ознакомление); служебные записки с резолюцией → задача; заявки на оплату по порогам; решения учредителя; ИИ отвечает по-настоящему по данным роли; журнал поручений'],['03.11','0.5.7','Всё нажимается: любая строка таблицы, плитка, задача, проект открывают карточку с подробностями и действиями (создать задачу, спросить ИИ, документ-основание)'],['03.11','0.5.6','По проверке ролей и процессов: «только свои» и «свой регион» внутри разделов (объект, регион, свои заказчики, свои задачи, свои чаты, личные документы), отказы ИИ по деньгам; заявки на оплату за 40 дней с порогами; платёжный календарь из прогноза кокпита; документооборот = счётчикам документов; проекты на любую дату; ключи ЭЦП ежегодно, ключ генерального директора; утверждает только учредитель'],['03.11','0.5.5','Роли: 20 ролей с матрицей прав, «Смотреть как» и рабочий стол каждой роли; учредитель — очередь «На утверждение», реестр решений, пять лет; приказы и служебные записки с маршрутами, чаты, проекты; платежи: заявки на оплату, платёжный календарь, закрытие месяца и сверка ЭСФ; поручения ИИ П-ГГГГ-NNNN; реестр всех подключений и Битрикс24'],['03.11','0.5.4','Администратор → Подключения: государственные системы (Кабинет налогоплательщика, ИС ЭСФ, eGov, ЕНПФ · ГФСС · ФСМС, ЕСУТД, госзакупки), хранилище ключей ЭЦП, реестр баз 1С; событие об истекающем ключе; исправления по контрольной проверке 0.5.3'],['03.11','0.5.3','По проверкам логики и дизайна: итог года в бюджете с прогнозом остатка месяца; налоги к уплате = выплата 25-го; автопарк = ОПиУ; расход ИИ в лимите; орг. структура от численности; план договоров от роста портфеля; остатки и сигналы — на дату «Данные на»; графики с темпом неполного месяца; цифры без моноширинного шрифта; плитки по состоянию; шапка и таблицы на телефоне; дата по-русски'],['03.11','0.5.2','Период — раскрывающийся список с датами каждого среза. Быстрые срезы по дате: сегодня, вчера, текущая и прошлая неделя, текущий и прошлый месяц, текущий и прошлый год; прошлые срезы листаются кнопками ‹ › целиком'],['03.11','0.5.1','Бюджет: один план на статью, расходы от выручки с целевой экономией, исполнение по годам правдоподобно; план по региону — по объектам; меню на телефоне'],['03.11','0.5.0','История компании за 5 лет (2022–2026); система планирования: БДР, продажи, ДДС, снабжение, кадры и ФОТ, автопарк — план-факт по месяцам и за любой период; бюджет 2027 по драйверам; согласование бюджета'],['03.11','0.4.0','Даты и периоды во всех отчётах (день, неделя, месяц, квартал, с начала года, 12 мес., свой период); сравнение к прошлому периоду и к году назад; данные по дням 2025–2026; книга проводок — баланс сходится на любую дату; валюта ₸/$/€/₽; фильтры региона и типа объекта; поиск; «О расчёте»; карточки регионов'],['03.11','0.3.3','Мелочи по контрольной проверке 0.3.2 (PASS)'],['03.11','0.3.2','Исправления по повторной проверке 0.3.1'],['03.11','0.3.1','Исправления по проверке 0.3.0'],['03.11','0.3.0','Полный демо-контур'],['02.11','0.1.0','ТЗ, промпт, кокпит']]))}`;
  }
  function docs(){
    const d = W.docs(RNG.from, RNG.to), dp = RNG.prev ? W.docs(RNG.prev.from, RNG.prev.to) : null, tot = d.reduce((s,x)=>s+x.n,0);
    return h1('Документы', 'библиотека 10 документов с автозаполнением · папки 01–10 · подпись человеком') + `
    <div class="tiles">${tile('Создано за период', N(tot), [dp?`${delta(tot, dp.reduce((s,x)=>s+x.n,0))} к прошлому периоду`:''], '')}${tile('Время поиска', '≤ 10 с', ['по сотруднику, объекту, заказчику, дате'], '')}</div>
    ${card('Библиотека документов за период', table(['Документ','За период','Прошлый период','Подпись'], d.map((x,i)=>[x.type,N(x.n),dp?N(dp[i].n):'—',['директор','автор','проверяющий','директор, после юриста','начальник охраны','кадровик','директор','механик / кладовщик','—','директор, после юриста'][i]])))}
    ${card('Электронные папки', `<div class="folders">${['01 Руководство','02 Кадры','03 Юридические документы','04 Заказчики и договоры','05 Охраняемые объекты','06 Снабжение','07 Автотранспорт','08 Финансы','09 Проверки и происшествия','10 Архив'].map(f=>`<div>${f}</div>`).join('')}</div>`)}`;
  }
  function knowledge(){
    return h1('Знания', 'словарь показателей, регламенты, решения владельца') + card('Словарь показателей', table(['Показатель','Формула','Источник'],[['Выручка за период','Σ по дням: посты × тариф ÷ дней в месяце, по активным дням договора','договоры, 1С'],['EBITDA','выручка − себестоимость − коммерческие − административные (до амортизации, процентов и КПН)','книга проводок'],['Чистая прибыль','EBITDA − амортизация − проценты по лизингу + финансовые доходы − КПН 20 %','книга проводок'],['Амортизация','по объектам ОС: 1/срок в месяц до полного износа (входящая группа — 44 мес., покупки и лизинг — 60 мес.)','основные средства'],['Охранников на пост','по графику (норма ТК РК): сутки/трое и вахта 15/15 — 4,4 FTE, «2/2» (12 ч) — 2,3 FTE, «5/2» (8 ч по будням) — 1,1 FTE; штат = FTE × 1,05','график, кадры'],['Тариф поста','базовый тариф по графику: 2026 — круглосуточный 1 790 000 ₸, «2/2» 940 000 ₸, «5/2» 520 000 ₸ в месяц без НДС (маржа 15–20 %); договор — базовый × коэффициент объекта','договоры'],['Сверхурочные','часы постов − часы присутствующих охранников по норме 164,7 ч в месяц; оплата 1,5×; предел при суммированном учёте — 2 ч в сутки и 120 ч в год (ст. 78 ТК РК)','табель'],['ИПН','10 % × (оклад − ОПВ − ВОСМС − стандартный вычет: 14 МРП в месяц, с 2026 — 30 МРП); с 2026 — 15 % с годового дохода сверх 8 500 МРП','НК РК, НК РК 2026'],['ИПН с дивидендов','по году нарастающим итогом: 2022 — 5 %; 2023–2025 — 10 % сверх 30 000 МРП; 2026 — 5 % до 230 000 МРП, 15 % сверх','НК РК, НК РК 2026'],['Взносы работодателя','СО 5 % от (оклад − ОПВ) + ООСМС 3 % + ОПВР 3,5 % (за 78 % ФОТ — родившиеся после 01.01.1975) + СН 6 % от (оклад − ОПВ − ВОСМС) — 2026; по годам — в «О расчёте»','НК РК, Социальный кодекс'],['НДС к уплате','за квартал, 25-го второго месяца после квартала','книга проводок'],['Укомплектованность','охранники в штате ÷ потребность (FTE постов × 1,05) на дату','кадры'],['Дебиторка','акты к оплате + начислено без акта; просрочка — после срока оплаты по договору','акты, оплаты'],['Прошлый период','для текущих недели и месяца — те же дни прошлой недели (месяца); для прошлых — предыдущие целиком; для своего периода — такой же отрезок перед ним','—'],['Год назад','те же даты прошлого года (недели — с понедельника)','—'],['Темп месяца','факт по дату ÷ прошедшие дни × дней в месяце','—'],['План на период','бюджет, утверждённый в начале года, по тем же дням','бюджет']])) + card('Решения владельца', table(['Дата','Решение'],[['03.11.2026','Даты и периоды должны работать во всех отчётах'],['03.11.2026','«запускаем» — старт этапа 0'],['03.11.2026','Анализ и аудит — отдельной независимой проверкой, исполнение — отдельно'],['03.11.2026','Масштаб демо-компании — в 5 раз'],['03.11.2026','Полноценная рабочая система: каждая кнопка выполняет настоящее действие и сохраняет результат'],['03.11.2026','Сообщения чатов не удаляются; автор правит сообщение 5 минут, все версии хранятся'],['03.11.2026','Отчёт «Капитал»: активы − обязательства, резервный капитал'],['03.11.2026','Два языка интерфейса: русский и английский']]));
  }
  // что реально работает в каждом режиме (промпт доработки 0.8, 5.7): общая ссылка · сайт на GitHub · сервер Агентства
  const MODES = [['Записи видны другим пользователям', 'да — общий журнал', 'нет — только в этом браузере', 'да — база на сервере'], ['Имена пользователей', 'из учётной записи', '«Как вас называть»', 'по входу в систему'], ['Ответы ИИ по данным роли', 'да', 'встроенные ответы', 'да — через ключ на сервере, без ключа — встроенные'], ['Файлы, фото, видео, голосовые', 'общее хранилище страницы (если не выдано — этот браузер)', 'только в этом браузере', 'на сервере, видят только участники'], ['Чтение текстовых файлов помощником', 'да — ответ по содержанию', 'выдержка из файла в ответе', 'да'], ['Расшифровка голоса', 'если умеет браузер (Chrome, Edge, Safari)', 'если умеет браузер', 'если умеет браузер; серверный сервис — позже'], ['Регламентные поручения по расписанию', 'пока страница открыта', 'пока страница открыта', 'круглосуточно, планировщик движка'], ['Права ролей', 'проверяет интерфейс', 'проверяет интерфейс', 'проверяет сервер'], ['Удаление сообщений', 'нет', 'нет', 'нет']];
  function modesCard(){
    const L = window.Live, tr = L ? L.transport : 'local', col = tr === 'db' ? 1 : (tr === 'server' ? 3 : 2);
    return card('Что работает в каждом режиме', table(['Возможность','Общая ссылка (опубликованная страница)','Сайт на GitHub','Сервер Агентства'], MODES.map(r => r.map((x, i) => i === col ? `<b>${x}</b>` : x))) + note(`Сейчас на этой странице: <b>${L && L.note ? L.note() : '—'}</b>`));
  }
  function about(){
    return h1('О данных', 'презентационный макет ТОО «SUNKAR SECURITY SERVICES»') + card('Как устроены данные', `<ul class="ul"><li>Все объекты, заказчики, суммы и события <b>вымышлены</b> и построены детерминированно — одинаковы при каждом открытии</li><li>Данные — <b>по дням с 01.01.2022 по 31.12.2026 (5 лет истории компании)</b>; факт по ${dt(W.FACT_END)}, дальше — прогноз по договорам</li><li>Финансы — из <b>книги проводок</b>: у каждой операции дебет и кредит, поэтому баланс сходится на любую дату, а ОПиУ и ДДС считаются за любой период</li><li>Ставки налогов — по годам (НДС 12 % в 2025 и 16 % с 2026; ОПВР 2,5 % → 3,5 %), упрощённо; подтверждает бухгалтер</li><li>Пересчёт в $, €, ₽ — по курсу месяца даты «по»</li><li>1С, Битрикс24, отметки смен с телефонов и внешний ИИ-сервис не подключены — по этапам ТЗ; движок 0.2.0 готов к установке на сервер Агентства</li></ul>`) + modesCard();
  }
  // обновить данные: состояние цикла данных на дату «Данные на» и настоящий пересчёт отчётов (на сервере — с запросом состояния движка)
  let rfAt = null, rfSrv = null;
  const refresh = () => { const at = RNG.anchor, oc = W.onec(at), srv = window.SUNKAR_SERVER;
    return h1('Обновить данные', t('rf.sub')) + `<div class="tiles">${tile(t('rf.exports', { d: dt(at) }), `${N(oc.exportsOk)} / ${N(oc.exportsTotal)}`, [oc.exportRejected ? t('rf.exp_bad') : t('rf.exp_ok')], oc.exportRejected ? 'var(--bad)' : '', '', 'quality')}${tile(t('rf.backup'), oc.effectorOk ? t('rf.bk_ok') : t('rf.bk_bad'), [t('rf.bk_d')], oc.effectorOk ? '' : 'var(--bad)', '', 'onec')}${tile(t('rf.mode'), srv ? t('rf.mode_srv') : t('rf.mode_local'), [srv ? t('rf.mode_srv_d') : t('rf.mode_local_d')])}${tile(t('rf.last'), rfAt ? I18N.time(rfAt) : '—', [rfSrv || (rfAt ? t('rf.last_ok') : t('rf.last_d'))])}</div>`
      + card(t('rf.now_t'), `<p><button type="button" class="btn" id="rfNow">${t('rf.now')}</button></p>` + note(t('rf.now_d')))
      + card('В макете не подключено', note('В рабочей системе кнопка запускает внеочередной цикл движка: выгрузка из 1С, чтение Битрикс24, приём отметок смен, сверка с обороткой.')); };
  async function refreshNow(){
    rfSrv = null;
    if (window.SUNKAR_SERVER){ try { const h = await (await fetch('api/health', { cache:'no-store' })).json(); rfSrv = t('rf.srv_ok', { a: h.lastCycleAt ? I18N.time(h.lastCycleAt) : '—', s: h.lastStatus || '—' }); } catch(e){ rfSrv = t('rf.srv_off'); } }
    rfAt = Date.now(); render();
  }

  // ---------- поиск ----------
  function searchResults(q){
    q = q.trim().toLowerCase(); if (!q) return '';
    const hits = [], has = (...ps) => ps.join(' ').toLowerCase().includes(q) || (I18N.lang !== 'ru' && ps.map(x => tx(String(x))).join(' ').toLowerCase().includes(q));   // на EN ищем и по английскому тексту
    for (const [k, f, d, go, cd] of searchHits(has)) hits.push([k, f, d, go, cd]);
    const op = h => h[4] ? `<button type="button" class="lnk" data-card="${esc(h[4])}">открыть</button>` : (h[3] ? `<a href="#${h[3]}">открыть</a>` : '');
    return `<section class="card search"><h2>Поиск: «${esc(q)}» <small>· ${hits.length} ${plural(hits.length,'совпадение','совпадения','совпадений')} · <button type="button" class="lnk" id="clearSearch">очистить</button></small></h2>${hits.length ? table(['Что','Найдено','',''], hits.slice(0,30).map(h=>[tx(h[0]), esc(h[1]), esc(h[2]), op(h)])) : note('Ничего не найдено. Ищите по номеру объекта, заказчику, городу, автомобилю, задаче, документу или чату.')}</section>`;
  }
  // источники глобального поиска — каждый только в правах роли (К1): те же функции видимости, что в разделах и карточках
  // (область scopeOk/custFilter, блоки матрицы BLK, задачи и проекты — видимость модуля задач, чаты — участники, документы — свои для уровня «С»)
  function searchHits(has){
    const role = roleOf(S.role), lv = k => role.rt[k] || '·', can = k => lv(k) !== '·', at = RNG.anchor, out = [], me = role.name;
    const add = (k, f, d, go, cd) => out.push([k, String(f || ''), String(d || ''), go || '', cd || '']);
    if (can('objects') || can('shifts') || can('incidents')){
      const go = can('objects') ? 'objects' : (can('shifts') ? 'shifts' : 'incidents');
      W.objects.filter(scopeOk).forEach(o=>{ if (has(o.name, o.kind, o.city, o.region, o.customer.name)) add('Объект', `${I18N.w(o.name)} · ${tx(o.kind)} · ${tx(o.city)}${W.active(o,RNG.to)?'':' · '+tx('не действует на дату')}`, I18N.w(o.customer.name), go, 'object:'+o.id); });
    }
    if (can('sales') || can('objects')) W.customers.filter(custFilter).forEach(c=>{ if (has(c.name)) add('Заказчик', I18N.w(c.name), `${c.objects.filter(scopeOk).length} ${nw(c.objects.filter(scopeOk).length,'объектов')} · ${tx(c.region)}`, can('sales') ? 'sales' : 'objects', 'customer:'+c.id); });
    if (can('fleet')) CAT.fleet.forEach((c,k)=>{ if (lv('fleet')==='С' && k!==0) return; if (has(c.car, c.role)) add('Автомобиль', c.car, tx(c.role), 'fleet', 'car:'+k); });
    const T = mod('tasks');
    if (T && can('tasks')){
      (T.list() || []).forEach(x=>{ if (x && x.title && has(x.no||'', x.title, x.owner||'')) add('Задача', `${x.no||''} ${x.world ? I18N.w(x.title) : x.title}`, rn(x.owner||''), 'tasks-list', 'task:' + (x.live ? 'L' + x.id : x.no)); });
      (T.projects() || []).forEach(p=>{ if (p && p.name && has(p.no||'', p.name, p.lead||'')) add('Проект', `${p.live && p.no ? p.no + ' ' : ''}${p.world ? tx(p.name) : p.name}`, rn(p.lead||''), 'tasks-projects', 'project:' + (p.live ? 'L' + p.id : p.name)); });
    }
    if (can('docflow')){
      const own = lv('docflow') === 'С', D0 = docflowAt(at);
      D0.orders.forEach(o=>{ if (own && o.author!==me && !o.route.includes(me)) return; if (has('№ ' + o.no, o.title, o.author)) add('Приказ', `№ ${o.no} ${tx(o.title)}`, `${dt(o.day)} · ${rn(o.author)}`, 'docflow', 'order:'+o.no); });
      D0.memos.forEach(m=>{ if (own && m.from!==me && m.to!==me) return; if (has(m.no, m.title, m.from, m.to)) add('Служебная записка', `${m.no} ${I18N.w(m.title)}`, `${rn(m.from)} → ${rn(m.to)}`, 'docflow-memos', 'memo:'+m.no); });
      LIVE.docs.forEach(d0=>{ if (!d0) return; if (d0.kind==='memo'){ if (own && d0.role!==me && d0.to!==me) return; if (has(d0.subj||'', d0.to||'')) add('Служебная записка', d0.subj||'', `${rn(d0.role||'')} → ${rn(d0.to||'')}`, 'docflow-memos', 'memo:L'+d0.id); }
        else if (d0.kind==='order'){ const t0 = ORD_T[d0.t] || ORD_T[0]; if (own && d0.role!==me && !t0[3].includes(me)) return; if (has(t0[1], d0.note||'')) add('Приказ', `${tx(t0[1])}${d0.note?' · '+d0.note:''}`, rn(d0.role||''), 'docflow', 'order:L'+d0.id); } });
    }
    if (can('chats')){
      const C = mod('chat'), list = C && typeof C.visibleChats === 'function' ? C.visibleChats(role) : myChats(role, at), ids = new Set(list.map(c=>c.id));
      list.forEach(c=>{ const nm = c.kind==='direct' ? '' : (c.name || ''); if (nm && has(nm)) add('Чат', tx(nm), c.who || '', 'chats', ''); });
      (Live.get ? Live.get('chat') : (LIVE.chat || [])).forEach(m=>{ if (!m || !ids.has(m.ch) || m.kind==='system' || !m.text) return; if (has(m.text)) { const c = list.find(x=>x.id===m.ch); add('Сообщение', String(m.text).slice(0,120), c ? tx(c.name || '') : '', 'chats', ''); } });
    }
    if (can('ai') && at >= W.LAUNCH_DEMO){
      const all = ['ed','gd','adm'].includes(role.id);
      [...LIVE.errands.filter(e=>e && (all || e.role===me)), ...errandsAt(at).filter(e=>all || e.who===me)].forEach(e=>{ const q0 = e.q || e.task || ''; if (has(e.no||'', q0)) add('Поручение ИИ', `${e.no||''} ${tx(q0)}`, e.st || '', 'ai', e.no ? 'errand:'+e.no : ''); });
    }
    (LIVE.files || []).forEach(f=>{ if (!f || !f.name) return; const mine0 = f.folder===me || f.role===me || (LIVE.uid && f.by===LIVE.uid); if (!mine0) return; if (has(f.name)) add('Файл', f.name, f.folder ? rn(f.folder) : '', 'docs', ''); });
    return out;
  }

  // ---------- «О расчёте» ----------
  // методика (0.8.4): формулы, нормы труда, налоги и таблица ставок по годам «ставка — источник — модель — закон»;
  // «✓» — только если ставки модели (W.RATES) по каждому году совпали с независимой таблицей закона LAW, иначе «≠» с годами расхождения
  const RATE_ROWS = [
    ['ipn','ИПН', y => [W.RATES[y].ipn, W.RATES[y].ipnTop||0, W.RATES[y].ipnTopMrp||0], y => [lawOf('ipn',y), lawOf('ipnTop',y), lawOf('ipnTopMrp',y)], ([a,b]) => b ? `${P(a*100)} / ${P(b*100)}` : P(a*100)],
    ['ded','Стандартный вычет ИПН, МРП в месяц', y => [W.RATES[y].dedMrp], y => [lawOf('dedMrp',y)], ([a]) => N(a)],
    ['opv','ОПВ'],['vosms','ВОСМС'],['so','СО'],['oosms','ООСМС'],['opvr','ОПВР'],['sn','СН', y => [W.RATES[y].sn, W.RATES[y].snNet ? 1 : 0], y => [lawOf('sn',y), y < 2026 ? 1 : 0], ([a]) => P(a*100)],['vat','НДС'],['cit','КПН'],
    ['divTax','ИПН с дивидендов', y => [W.RATES[y].divTax, W.RATES[y].divFree||0, W.RATES[y].divCap||0, W.RATES[y].divCap ? W.RATES[y].divTop : 0], y => [lawOf('divTax',y), lawOf('divFree',y), lawOf('divCap',y), lawOf('divTop',y)],
      ([a,f,c,tp]) => c ? `${P(a*100)} / ${P(tp*100)}` : (f ? `${P(a*100)}*` : P(a*100))],
    ['mrp','МРП, ₸', null, null, ([a]) => N(a)],
    ['employer','Взносы работодателя, % ФОТ', y => [W.RATES[y].employer], y => [LAW_EMP(y)], ([a]) => P(a*100)]];
  function rateCheck(){
    const ys = []; for (let y = W.Y0; y < W.Y0 + W.NY; y++) ys.push(y);
    return RATE_ROWS.map(([k, n, mf, lf, df]) => { mf = mf || (y => [W.RATES[y][k]]); lf = lf || (y => [lawOf(k,y)]); df = df || (([a]) => P(a*100));
      const bad = ys.filter(y => { const m = mf(y), l = lf(y); return m.length !== l.length || m.some((x,j) => Math.abs(x - l[j]) > 1e-9); });
      return { k, n, ys, cells: ys.map(y => df(mf(y))), bad }; });
  }
  function calcMethod(){
    const rc = rateCheck(), ys = rc[0].ys;
    const rows = rc.map(x => [`${esc(tx(x.n))}`, esc(t('calc.src.'+x.k)), ...x.cells, x.bad.length ? `<span class="dn">${t('calc.law_bad', { y: x.bad.join(', ') })}</span>` : `<span class="up">${t('calc.law_ok')}</span>`]);
    const a26 = W.idxOf(2026,0,1), z26 = Math.min(W.FACT_END, W.idxOf(2026,11,31)), dv = W.accTurn('dividends', a26, z26), np = W.pl(a26, z26).net;
    const cv = { t24: N(W.P.tariff24[2026]), t22: N(W.P.tariff22[2026]), t52: N(W.P.tariff52[2026]), opvr: N(Math.round(W.P.opvrShare*100)), cap: F(W.RATES[2026].divCap*W.RATES[2026].mrp/1e6, 2), dv: N(Math.round(dv/1e6)), dp: N(Math.round(np ? dv/np*100 : 0)) };
    return t('calc.method', cv) + `<h3>${t('calc.rates_h')}</h3>` + table([t('calc.c.rate'), t('calc.c.src'), ...ys.map(String), t('calc.c.law')], rows, 'compact') + `<p class="note">${t('calc.rates_note')}</p>`;
  }
  const ABOUT_CALC = `<h3>Периоды</h3><ul class="ul"><li>Срезы считаются от даты «Данные на» (по умолчанию — сегодня, ${dt(W.FACT_END)}). <b>Сегодня</b> и <b>Вчера</b> — всегда от сегодня.</li><li><b>Текущая неделя</b> — с понедельника по дату; <b>Прошлая неделя</b> — понедельник–воскресенье до неё; <b>Текущий месяц</b>, <b>Текущий год</b> — с 1-го числа (1 января) по дату; <b>Прошлый месяц</b>, <b>Прошлый год</b> — целиком.</li><li>Другой период: <b>7 дней</b> по дату, <b>Квартал</b> — с начала квартала по дату, <b>12 мес.</b> — 365 дней по дату, <b>Свой период</b> — любые даты с … по (данные с ${dt(0)}).</li><li><b>Прошлый период</b>: для дня — вчера; для текущей недели — те же дни прошлой недели; для текущего месяца — те же числа прошлого месяца; для прошлых недели и месяца — предыдущие неделя и месяц целиком; для 7 дней, 12 мес. и своего периода — такой же отрезок перед выбранным. <b>Год назад</b> — те же даты прошлого года (недели — с понедельника). Для текущего и прошлого года показывается только «год назад».</li><li>Обороты (выручка, расходы, ДДС, налоги за период) — за выбранный срез. Кокпит, задачи, смены «сегодня», события, 1С, «Качество данных» и ИИ показывают остатки и сигналы на дату «Данные на». Разделы (Финансы, Кадры, Продажи, Налоги, Юридический, Объекты, Склад, Автопарк, Происшествия) показывают остатки на конец среза — так баланс сходится с ДДС за период.</li><li>Кнопки ‹ › сдвигают дату «Данные на» на день, а у прошлых недели, месяца и года листают их целиком. «На сегодня» появляется, когда дата сдвинута.</li><li>На графиках за 12 месяцев неполный текущий месяц показан пунктиром — как темп: факт по дату, пересчитанный на полный месяц.</li></ul><h3>Процессы</h3><ul class="ul"><li>Заявка на оплату — единственный путь выплаты: черновик → бухгалтер → директор → (свыше 50 млн ₸) учредитель → платёжное поручение в 1С готовит робот → в банк отправляет главный бухгалтер своей ЭЦП.</li><li>Приказ: проект (ИИ по шаблону) → согласование → виза юриста → подпись ЭЦП генерального директора → ознакомление сотрудников в телефоне.</li><li>Служебная записка: резолюция адресата сразу становится задачей со сроком.</li><li>Поручение ИИ получает номер П-ГГГГ-NNNN, ступень и срок 15 минут; запись в 1С — только роботом с копией базы перед записью.</li><li>Задача: новая → в работе → на проверке → выполнена (или отложена, отменена); каждое изменение — в истории задачи и в журнале.</li><li>Сообщение чата не удаляется; автор может исправить его в течение 5 минут, прежние версии видны по отметке «изменено».</li></ul><h3>Фильтры</h3><ul class="ul"><li>Регион и тип объекта применяются к объектам, сменам, происшествиям, продажам и дебиторке региона. Баланс, ДДС и налоги — по компании.</li><li>Валюта — пересчёт по курсу месяца даты «по».</li></ul>`;

  // ---------- маршрутизация и рендер ----------
  // ======================= РОЛИ, ПРАВА И РАБОЧИЙ СТОЛ РОЛИ =======================
  // уровни: П — полный, Б — свой блок или подразделение, Ч — чтение, С — только свои записи, «·» — нет доступа. Права проверяет сервер (dev/engine/src/roles.js)
  const BLK = [['kokpit','Кокпит'],['tasks','Задачи и проекты'],['docflow','Приказы и записки'],['chats','Чаты'],['objects','Объекты'],['shifts','Смены'],['incidents','Происшествия'],['hr','Кадры'],['salary','Зарплата'],['legal','Юридический'],['sales','Продажи'],['finance','Финансы'],['taxes','Налоги'],['budget','Бюджет'],['supply','Склад'],['fleet','Автопарк'],['quality','Качество данных'],['onec','Сервер и 1С'],['ai','ИИ'],['admin','Администратор'],['dev','Разработчик']];
  const LVL = { 'П':'полный', 'Б':'свой блок', 'Ч':'чтение', 'С':'только свои', '·':'нет доступа' };
  const REG_WEST = ['Атырауская','Мангистауская','Актюбинская'];
  const ROLES = [
    { id:'owner', name:'Учредитель', grp:'Руководство', short:'УЧ', boss:'—', n:()=>1, r:'ЧЧЧСЧЧЧЧЧЧЧЧЧПЧЧЧ·С··', limit:'утверждает бюджет года, дивиденды, сделки свыше 50 млн ₸', mission:'владельческая сводка, утверждение бюджета и крупных решений, дивиденды', step:'1' },
    { id:'gd', name:'Генеральный директор', grp:'Руководство', short:'ГД', boss:'Учредитель', n:()=>1, r:'ППППЧЧЧПППППППЧЧЧЧСЧ·', limit:'подпись приказов, договоров и платежей; свыше 50 млн ₸ — к учредителю', mission:'первый руководитель: подпись ЭЦП, стратегия, банк, крупные договоры, отчёт учредителю', step:'1' },
    { id:'ed', name:'Исполнительный директор', grp:'Руководство', short:'ИД', boss:'Генеральный директор', n:()=>1, r:'ПППППППППППППППППЧСЧЧ', limit:'согласование платежей до 10 млн ₸, приказы по основной деятельности', mission:'операционное управление: люди, объекты, смены, деньги, документы, сроки', step:'1' },
    { id:'gb', name:'Главный бухгалтер', grp:'Финансы', short:'ГБ', boss:'Генеральный директор', n:()=>1, r:'ЧББСЧ··ЧПЧЧПППЧЧЧЧСЧ·', limit:'проводит платежи по утверждённым заявкам; подпись ЭСФ и ФНО своей ЭЦП', mission:'учёт, налоги, закрытие месяца, платёжный календарь, сверки с госсистемами', step:'1' },
    { id:'buh', name:'Бухгалтер', grp:'Финансы', short:'БХ', boss:'Главный бухгалтер', n:c=>c.al.a, r:'·СССЧ··ЧПЧЧББЧЧЧЧЧС··', limit:'первичные документы, табель → зарплата, акты заказчикам', mission:'зарплата и взносы, акты и счета заказчикам, сверки, первичка', step:'1' },
    { id:'sec', name:'Начальник охраны', grp:'Охрана', short:'НО', boss:'Исполнительный директор', n:()=>1, r:'ЧБББПППЧ··Ч···ЧЧ··С··', limit:'замены и резерв, внеплановые проверки, взыскания — проект приказа', mission:'укомплектованность постов, смены, происшествия, проверки, ГБР', step:'2' },
    { id:'dep', name:'Заместитель начальника охраны', grp:'Охрана', short:'ЗН', boss:'Начальник охраны', n:c=>c.al.d, r:'ЧБСББББЧ·······Ч··С··', limit:'свой регион: Атырауская, Мангистауская, Актюбинская (вахта)', mission:'объекты своего региона: смены, проверки, вахтовые графики', step:'2' },
    { id:'obj', name:'Начальник объекта', grp:'Охрана', short:'НЧ', boss:'Начальник охраны', n:c=>c.objs, r:'·ССССССС··········С··', limit:'свой объект; совмещает пост', mission:'посты своего объекта, график, журнал, связь с заказчиком', step:'1' },
    { id:'senior', name:'Старший смены', grp:'Охрана', short:'СС', boss:'Начальник объекта', n:c=>c.posts, r:'·С·С·СС···········С··', limit:'своя смена', mission:'приём и сдача смены, обход, отметки постов', step:'1' },
    { id:'guard', name:'Охранник', grp:'Охрана', short:'ОХ', boss:'Старший смены', n:c=>c.hr.guards, r:'·С·С·ССС··········С··', limit:'свои смены, график, документы, инструкции', mission:'отметка смены, обход, журнал, ознакомление с приказами', step:'1' },
    { id:'hr', name:'Кадровик', grp:'Люди и право', short:'КД', boss:'Исполнительный директор', n:c=>c.al.h, r:'·ББСЧЧ·П··········С··', limit:'кадровые приказы — проект, подпись ГД; зарплату не видит', mission:'приём, увольнение, отпуска, удостоверения, медосмотры, ЕСУТД', step:'1' },
    { id:'law', name:'Юрист', grp:'Люди и право', short:'ЮР', boss:'Генеральный директор', n:()=>1, r:'·ББСЧ·Ч··ПЧ·······С··', limit:'виза на приказы и договоры, претензии', mission:'договоры, допсоглашения, претензии, лицензия, проверки органов', step:'1' },
    { id:'cd', name:'Коммерческий директор', grp:'Коммерция', short:'КМ', boss:'Исполнительный директор', n:()=>1, r:'ЧБББЧ····ЧПЧ·Ч····С··', limit:'тарифы и скидки — в коридоре маржи; свыше — к ИД', mission:'продажи, тендеры, тарифы, удержание заказчиков, дебиторка', step:'1' },
    { id:'mgr', name:'Менеджер по продажам', grp:'Коммерция', short:'МП', boss:'Коммерческий директор', n:c=>c.al.m, r:'·СССЧ·····С·······С··', limit:'свои заказчики и КП', mission:'запросы, КП, осмотр объекта, договоры своих заказчиков', step:'1' },
    { id:'sup', name:'Снабженец', grp:'Ресурсы', short:'СН', boss:'Исполнительный директор', n:c=>c.al.s, r:'·ББСЧ········ЧПЧ··С··', limit:'закупки по заявкам до 1 млн ₸', mission:'форма, спецсредства, связь, склад, выдача на объекты', step:'2' },
    { id:'mech', name:'Механик', grp:'Ресурсы', short:'МХ', boss:'Исполнительный директор', n:c=>Math.min(1,c.al.f), r:'·БСС·········ЧЧП··С··', limit:'ТО и ремонт по нормам; страховки', mission:'ТО, ремонт, ГСМ, страховки, техосмотры, путевые листы', step:'2' },
    { id:'drv', name:'Водитель', grp:'Ресурсы', short:'ВД', boss:'Механик', n:c=>Math.max(0,c.al.f-1), r:'·С·С···········С··С··', limit:'свой автомобиль и путевые листы', mission:'выезды ГБР, развозка смен, путевой лист, заправки', step:'1' },
    { id:'disp', name:'Диспетчер', grp:'Ресурсы', short:'ДС', boss:'Исполнительный директор', n:c=>c.al.o, r:'ЧБББЧЧЧ········Ч··С··', limit:'обращения, звонки, вызов ГБР', mission:'приём обращений заказчиков, вызов ГБР, контроль отметок, чаты', step:'2' },
    { id:'adm', name:'Администратор системы', grp:'Система', short:'АС', boss:'Исполнительный директор', n:()=>1, r:'·ББС············ППСПЧ', limit:'роли, подключения, копии; данных блоков не видит', mission:'роли и права, подключения, журнал, копии, сервер и 1С', step:'2' },
    { id:'dev', name:'Разработчик', grp:'Система', short:'РЗ', boss:'Администратор системы (подрядчик)', n:()=>1, r:'················ЧЧ··П', limit:'релизы и проверки; данные — только образцы', mission:'релизы, проверки, движок, тесты', step:'—' },
  ];
  ROLES.forEach(x=>{ x.rt = {}; BLK.forEach(([k],i)=>{ x.rt[k] = x.r[i] || '·'; }); });
  const roleOf = n => ROLES.find(x=>x.name===n) || ROLES[2];
  const canSee = (role, sec) => { if (['docs','knowledge','about','refresh'].includes(sec)) return role.rt.docflow!=='·' || sec!=='docs'; return (role.rt[sec]||'·') !== '·'; };
  const roleCtx = at => { const hr = W.hr(at), posts = W.totPosts(at), objs = W.objects.filter(o=>W.active(o,at)).length; const r = Math.max(0, hr.admin - 7), order = ['m','a','h','s','f','o','d','m','f','a','d','h','s','m','f','o','o','o','o','o']; const al = { m:0,a:0,h:0,s:0,f:0,d:0,o:0 }; order.slice(0, r).forEach(k=>al[k]++); al.o += Math.max(0, r - order.length); return { hr, posts, objs, al }; };

  // ======================= ДОКУМЕНТООБОРОТ: ПРИКАЗЫ И СЛУЖЕБНЫЕ ЗАПИСКИ =======================
  const ORD_T = [['к','О приёме на работу','Кадровик',['Кадровик','Исполнительный директор','Юрист','Генеральный директор','ознакомление']],
                 ['к','Об увольнении','Кадровик',['Кадровик','Исполнительный директор','Юрист','Генеральный директор','ознакомление']],
                 ['к','О предоставлении ежегодного отпуска','Кадровик',['Кадровик','Начальник охраны','Генеральный директор','ознакомление']],
                 ['к','О назначении старшим смены','Начальник охраны',['Начальник охраны','Кадровик','Генеральный директор','ознакомление']],
                 ['к','О дисциплинарном взыскании','Начальник охраны',['Начальник охраны','Юрист','Генеральный директор','ознакомление']],
                 ['к','О премировании по итогам месяца','Исполнительный директор',['Исполнительный директор','Главный бухгалтер','Генеральный директор','ознакомление']],
                 ['о','О выставлении поста на объекте','Начальник охраны',['Начальник охраны','Исполнительный директор','Генеральный директор','ознакомление']],
                 ['о','Об изменении графика смен','Начальник охраны',['Начальник охраны','Исполнительный директор','ознакомление']],
                 ['о','О проведении внеплановой проверки объекта','Начальник охраны',['Начальник охраны','Исполнительный директор','ознакомление']],
                 ['о','О закреплении автомобиля за водителем','Механик',['Механик','Исполнительный директор','ознакомление']],
                 ['о','Об утверждении регламента','Исполнительный директор',['Исполнительный директор','Юрист','Генеральный директор','ознакомление']],
                 ['о','О выдаче формы и спецсредств','Снабженец',['Снабженец','Исполнительный директор','ознакомление']]];
  const MEMO_T = [['Начальник объекта','Начальник охраны','О нарушении режима на посту','разобрать, при необходимости — проект взыскания'],
                  ['Начальник объекта','Снабженец','О замене формы и фонарей на посту','выдать со склада'],
                  ['Начальник охраны','Исполнительный директор','О переработке на вахтовых объектах','утвердить доплату или резерв'],
                  ['Механик','Исполнительный директор','О ремонте автомобиля ГБР','согласовать ремонт в пределах нормы'],
                  ['Коммерческий директор','Исполнительный директор','О пересмотре тарифа убыточного объекта','подготовить допсоглашение'],
                  ['Снабженец','Главный бухгалтер','Об оплате поставщику формы','провести по заявке'],
                  ['Кадровик','Исполнительный директор','Об истечении удостоверений охранников','направить на обучение'],
                  ['Диспетчер','Начальник охраны','О жалобе заказчика на опоздание смены','выяснить и ответить заказчику'],
                  ['Бухгалтер','Главный бухгалтер','О расхождении в акте сверки с заказчиком','сверить и подписать акт'],
                  ['Главный бухгалтер','Бухгалтер','О подготовке актов сверки за квартал','подготовить и разослать'],
                  ['Кадровик','Бухгалтер','О расчёте при увольнении','рассчитать и выплатить в день увольнения'],
                  ['Юрист','Генеральный директор','О претензии заказчика','утвердить ответ']];
  const docCache = {};
  function docflowAt(at){
    if (docCache[at]) return docCache[at];
    const y0 = W.idxOf(Math.max(W.Y0, W.yOf(at)-1),0,1), orders = [], memos = []; let nk = 0, no = 0, nm = 0, yy = W.yOf(y0);
    for (let d = y0; d <= at; d++){
      if (W.yOf(d) !== yy){ yy = W.yOf(d); nk = 0; no = 0; nm = 0; }                 // нумерация с 1 января
      const dd = W.docs(d,d), k = (dd.find(x=>x.type==='Приказ')||{n:0}).n, km = (dd.find(x=>x.type==='Служебная записка')||{n:0}).n;
      for (let j=0;j<k;j++){ const t = ORD_T[Math.floor(hb(d,j,102)*ORD_T.length)], seq = t[0]==='к' ? ++nk : ++no, obj = W.objects[Math.floor(hb(d,j,103)*W.objects.length)];
        const dur = t[3].map((_,s)=>0.4 + hb(d,j*10+s,104)*1.4), stuck = hb(d,j,105) < 0.08;
        let acc = 0, stage = t[3].length; const age = at - d; for (let s=0;s<t[3].length;s++){ acc += dur[s]*(stuck && s===t[3].length-2 ? 3 : 1); if (age < acc){ stage = s; break; } }
        const done = stage >= t[3].length, due = d + Math.ceil(dur.reduce((a,b)=>a+b,0)) + 1;
        orders.push({ no:`${seq}-${t[0]}`, day:d, kind:t[0], title:t[1], author:t[2], route:t[3], stage, done, overdue: !done && at > due, due, obj: /пост|график|проверк|старшим|взыскан/i.test(t[1]) ? obj : null, people: t[3][t[3].length-1]==='ознакомление' ? (t[0]==='к' ? 1 : 3 + Math.floor(hb(d,j,106)*20)) : 0 });
      }
      for (let jm = 0; jm < km; jm++){ const m = MEMO_T[Math.floor(hb(d,jm+1,108)*MEMO_T.length)], obj = W.objects[Math.floor(hb(d,jm+2,109)*W.objects.length)], age = at - d, sla = 1 + Math.floor(hb(d,jm+3,110)*3), closed = age > sla + (hb(d,jm+4,111) < 0.1 ? 4 : 0);
        memos.push({ no:`СЗ-${String(++nm).padStart(4,'0')}`, day:d, from:m[0], to:m[1], title:`${m[2]} — ${obj.name}`, res:m[3], sla:d+sla, status: closed ? 'закрыта' : (age >= 1 ? 'резолюция → задача' : 'у адресата'), overdue: !closed && at > d+sla, task: age >= 1 ? 'исполнителю' : '' });
      }
    }
    const r = { orders: orders.reverse(), memos: memos.reverse() }; docCache[at] = r; return r;
  }
  const ordStatus = o => o.done ? '<span class="up">исполнен</span>' : (o.route[o.stage]==='ознакомление' ? `ознакомление · ${o.people} чел.` : (o.stage===0 ? 'проект' : (o.route[o.stage]==='Юрист' ? 'виза юриста' : (o.route[o.stage]==='Генеральный директор' ? '<b>на подписи ГД (ЭЦП)</b>' : 'согласование: ' + o.route[o.stage].toLowerCase())))) + (o.overdue ? ' · <span class="dn">срок</span>' : '');
  const routeLine = o => o.route.map((s,i)=>`<span class="rt ${i<o.stage||o.done?'ok':(i===o.stage?'now':'')}">${s==='ознакомление'?'ознакомление':s}</span>`).join('<i>→</i>');
  // сводка реестров по статусам (стандарт таблиц 3.4.2): количество, доля, среднее время шага / возраст, просрочено
  const stTable = (id, rows, timeKey) => rows.length ? `<h3>${t('an.t.by_status')}</h3>` + T2({ id, csv:id, search:false, cols:[{ key:'st', title:t('an.c.status'), html:r=>esc(r.lab) }, { key:'n', title:t('an.c.st_count'), kind:'int', sum:'sum', share:true }, { key:'tm', title:t(timeKey), kind:'num', tot:rs=>{ let a=0, b=0; rs.forEach(r=>{ a+=r.tm*r.n; b+=r.n; }); return b ? a/b : null; } }, { key:'od', title:t('an.c.overdue_pct'), kind:'pct', tot:rs=>{ let a=0, b=0; rs.forEach(r=>{ a+=r.odn; b+=r.n; }); return b ? a/b*100 : 0; }, cls:r=>r.od>0?'wn':'' }], rows, sort:{ key:'n', dir:'desc' } }) : '';
  const groupSt = (list, keyOf, labOf, tmOf) => { const g = new Map(); list.forEach(x=>{ const k = keyOf(x), e = g.get(k) || { st:k, lab:labOf(x), n:0, tm:0, odn:0 }; e.n++; e.tm += tmOf(x); if (x.overdue) e.odn++; g.set(k, e); }); return [...g.values()].map(e=>({ ...e, tm:e.tm/e.n, od:e.odn/e.n*100 })); };
  const ordStats = (ords, at) => stTable('orders_by_status', groupSt(ords, o=>o.done?'done':o.route[o.stage], o=>o.done?'исполнен':(o.route[o.stage]==='ознакомление'?'ознакомление':rn(o.route[o.stage])), o=>(o.done ? o.due-o.day : at-o.day) / Math.max(1, o.done ? o.route.length : o.stage)), 'an.c.avg_step');
  const memoStats = (memos, at) => stTable('memos_by_status', groupSt(memos, m=>m.status, m=>m.status, m=>at-m.day), 'an.c.avg_age');
  function docflow(tab){
    tab = tab || 'orders'; const at = RNG.anchor, D0 = docflowAt(at), inP = x => x.day >= RNG.from && x.day <= RNG.to;
    const tabs = [['orders','Приказы'],['memos','Служебные записки'],['routes','Маршруты и сроки']];
    const ords = D0.orders.filter(inP), open = D0.orders.filter(o=>!o.done), sign = open.filter(o=>o.route[o.stage]==='Генеральный директор'), memos = D0.memos.filter(inP), mOpen = D0.memos.filter(m=>m.status!=='закрыта');
    let body = '';
    if (tab==='orders') body = `<div class="tiles">${tile('Приказов за период', ords.length, [`кадровых ${ords.filter(o=>o.kind==='к').length} · по основной деятельности ${ords.filter(o=>o.kind==='о').length}`], '')}${tile(`В работе на ${dt(at)}`, open.length, [`на подписи ГД <b>${sign.length}</b> · на визе юриста ${open.filter(o=>o.route[o.stage]==='Юрист').length}`], '')}${tile('Просрочено согласование', open.filter(o=>o.overdue).length, [open.filter(o=>o.overdue).slice(0,3).map(o=>`№ ${o.no}`).join(' · ')||'нет'], 'var(--warn)')}${tile('Ознакомление', open.filter(o=>o.route[o.stage]==='ознакомление').reduce((s2,o)=>s2+o.people,0), ['сотрудников должны ознакомиться · отметка в телефоне'], '')}</div>
      ${(()=>{ const rl = roleOf(S.role), can = ['П','Б'].includes(rl.rt.docflow) && !LIVE.ro; return card('Новый приказ', can ? `<form class="lform" id="ordForm"><select id="ordType" aria-label="Вид приказа">${ORD_T.map((t,i)=>`<option value="${i}">${t[1]} (${t[0]==='к'?'кадровый':'основной'})</option>`).join('')}</select><input id="ordNote" maxlength="200" placeholder="Кого или что касается (без ИИН и личных данных)"><button type="submit" class="btn">Создать проект</button></form><p class="lnote">${liveNote()} · проект уходит по маршруту; согласует тот, чья роль на шаге (переключите «Смотреть как»)</p>` : note(LIVE.ro ? 'У вас только просмотр.' : `Роль «${rl.name}» приказы не создаёт.`)); })()}
      ${card(`Реестр приказов · ${periodTxt()}`, mod('analytics').fromRows(['№','Дата','Приказ','Автор','Маршрут','Статус',''], [...LIVE.docs.filter(d=>d.kind==='order').map((d,i)=>{ const t = ORD_T[d.t] || ORD_T[0], o = { route:t[3], stage:Math.min(d.stage, t[3].length), done:!!d.done, overdue:false, people:t[0]==='к'?1:5 }, step = t[3][o.stage], canAct = !o.done && !LIVE.ro && (step===S.role || step==='ознакомление'); const seq = ords.filter(x=>x.kind===t[0]).length + LIVE.docs.filter(x=>x.kind==='order' && (ORD_T[x.t]||[])[0]===t[0]).indexOf(d) + 1; return [`<b class="nw">${seq}-${t[0]}</b> <span class="pill i">новый</span>`, dts(d.day ?? at), `${t[1]}${d.note?`<br><small>${esc(d.note)}</small>`:''}`, esc(whoOf(d)), `<div class="route">${routeLine(o)}</div>`, ordStatus(o), canAct ? `<button type="button" class="btn" data-oact="next" data-oid="${d.id}">${step==='Генеральный директор'?'Подписать ЭЦП':(step==='ознакомление'?'Ознакомлен':'Согласовать')}</button>${step!=='ознакомление'?` <button type="button" class="btn" data-oact="back" data-oid="${d.id}">Вернуть</button>`:''}` : (o.done?'':`<small>ждёт: ${step||'—'}</small>`)]; }).reverse(), ...ords.map(o=>[`<b class="nw">${o.no}</b>`, dts(o.day), `${o.title}<br><small>${o.kind==='к'?'кадровый':'по основной деятельности'}${o.obj?' · '+o.obj.name:''}</small>`, o.author, `<div class="route">${routeLine(o)}</div>`, ordStatus(o), ''])], { id:'docflow-orders', csv:'orders', compact:true, lo:[3,4], nosort:[4,6], vals:{ 1:r=>r._day }, meta:k=>{ const LO = LIVE.docs.filter(d=>d.kind==='order').reverse(); if (k < LO.length) return { _kind:'order', _id:'L'+LO[k].id, _day:LO[k].day ?? at }; const o = ords[k-LO.length]; return { _kind:'order', _id:o.no, _day:o.day, _cls:o.overdue?'an-warn':'' }; }, filters:[{ id:'open', label:t('an.f.open'), fn:r=>!/исполнен/.test(r._search) }] }) + ordStats(ords, at), 'нумерация: «-к» — кадровые, «-о» — по основной деятельности; проект готовит ИИ по шаблону, подпись — ЭЦП генерального директора')}`;
    if (tab==='memos') body = `<div class="tiles">${tile('Записок за период', memos.length, [`закрыто ${memos.filter(m=>m.status==='закрыта').length}`], '')}${tile(`Открыто на ${dt(at)}`, mOpen.length, [`у адресата ${mOpen.filter(m=>m.status==='у адресата').length} · в задачах ${mOpen.filter(m=>m.task).length}`], '')}${tile('Сверх срока', mOpen.filter(m=>m.overdue).length, [mOpen.filter(m=>m.overdue).slice(0,3).map(m=>m.no).join(' · ')||'нет'], 'var(--warn)')}</div>
      ${card('Новая служебная записка', LIVE.ro ? note('У вас только просмотр.') : `<form class="lform" id="memoForm"><select id="memoTo" aria-label="Кому">${ROLES.filter(r=>r.id!=='dev').map(r=>`<option${r.name==='Исполнительный директор'?' selected':''}>${r.name}</option>`).join('')}</select><input id="memoSubj" maxlength="200" placeholder="Тема и суть" required><button type="submit" class="btn">Отправить</button></form><p class="lnote">${liveNote()} · адресат пишет резолюцию — она сразу становится задачей исполнителю</p>`)}
      ${card(`Служебные записки · ${periodTxt()}`, mod('analytics').fromRows(['№','Дата','От кого → кому','Тема','Резолюция','Статус'], [...LIVE.docs.filter(d=>d.kind==='memo').map((m,i)=>{ const toMe = m.to===S.role && m.status==='у адресата' && !LIVE.ro, canClose = m.status==='резолюция → задача' && (m.to===S.role || m.role===S.role) && !LIVE.ro; return [`<b class="nw">СЗ-Н${String(i+1).padStart(3,'0')}</b> <span class="pill i">новая</span>`, dts(m.day ?? at), `${esc(whoOf(m))} → ${m.to}`, esc(m.subj), toMe ? `<span class="lform"><input data-mresin="${m.id}" maxlength="200" placeholder="Резолюция"><select data-mex="${m.id}" aria-label="Исполнитель">${ROLES.filter(r=>r.id!=='dev').map(r=>`<option${r.name===m.to?' selected':''}>${r.name}</option>`).join('')}</select><button type="button" class="btn" data-mres="${m.id}">→ задача</button></span>` : (m.res ? `${esc(m.res)} <small>→ задача: ${m.exec}</small>` : `<small>ждёт резолюции: ${m.to}</small>`), (m.status==='закрыта'?'<span class="up">закрыта</span>':m.status) + (canClose?` <button type="button" class="btn" data-mclose="${m.id}">Закрыть</button>`:'')]; }).reverse(), ...memos.map(m=>[`<b class="nw">${m.no}</b>`, dts(m.day), `${m.from} → ${m.to}`, esc(m.title), `${m.res}${m.task?` <small>→ задача ${m.task}</small>`:''}`, (m.status==='закрыта'?'<span class="up">закрыта</span>':m.status) + (m.overdue?' · <span class="dn">срок</span>':'')])], { id:'docflow-memos', csv:'memos', compact:true, lo:[2,4], nosort:[4], vals:{ 1:r=>r._day }, meta:k=>{ const LM = LIVE.docs.filter(d=>d.kind==='memo').reverse(); if (k < LM.length) return { _kind:'memo', _id:'L'+LM[k].id, _day:LM[k].day ?? at }; const m = memos[k-LM.length]; return { _kind:'memo', _id:m.no, _day:m.day, _cls:m.overdue?'an-warn':'' }; } }) + memoStats(memos, at), 'резолюция адресата сразу становится задачей исполнителю со сроком; закрытие — по отчёту исполнителя')}`;
    if (tab==='routes') body = card('Маршруты согласования', table(['Документ','Маршрут','Срок','Подпись'], [...ORD_T.map(t=>[`Приказ «${t[1].toLowerCase()}»`, t[3].join(' → '), `${t[3].length-1} раб. дн.`, t[3].includes('Генеральный директор')?'ЭЦП генерального директора':'исполнительный директор']), ['Служебная записка','автор → адресат (резолюция) → исполнитель (задача) → закрытие','1–3 раб. дн.','—'], ['Договор с заказчиком','менеджер → коммерческий директор → юрист → главный бухгалтер → генеральный директор','3 раб. дн.','ЭЦП генерального директора'], ['Заявка на оплату','автор → руководитель блока → главный бухгалтер → исполнительный директор (до 10 млн ₸) / генеральный директор','1 раб. день','платёж проводит главный бухгалтер']], '', [2]), 'маршрут меняет только администратор по решению владельца') + card('Правила', `<ul class="ul"><li>Каждый шаг маршрута — с датой, автором и комментарием; история не удаляется.</li><li>ИИ готовит проект по шаблону и проверяет реквизиты; подпись и виза — только человек.</li><li>Просрочка шага — сигнал в кокпит и в чат «Руководство».</li><li>Подписанный документ уходит в папку «01 Руководство» или «02 Кадры» и в Битрикс24 · Диск.</li></ul>`);
    return h1('Приказы и служебные записки', 'маршруты согласования, подпись ЭЦП, ознакомление') + `<div class="tabs">${tabs.map(t=>`<a href="#docflow-${t[0]}" class="${t[0]===tab?'on':''}">${t[1]}</a>`).join('')}</div>` + body;
  }

  // ======================= ЧАТЫ =======================
  function chatsAt(at){
    const day = W.objects.filter(o=>W.active(o,at)).map(o=>W.objView(o,at,at,at)), missed = day.filter(v=>v.missed>0), oc = W.onec(at), D0 = docflowAt(at), sign = D0.orders.filter(o=>!o.done && o.route[o.stage]==='Генеральный директор');
    const inc = W.incidents.filter(x=>x.day===at), chk = W.checks.filter(x=>x.day===at);
    const C = [
      { id:'lead', name:'Руководство', who:'ГД, ИД, главный бухгалтер, начальник охраны, коммерческий директор, юрист', n:6, msgs:[['07:30','ИИ · дежурный директор',`Сводка на ${dt(at)}: смены ${day.length?day.reduce((s,v)=>s+v.plan,0)-missed.length:0} из ${day.reduce((s,v)=>s+v.plan,0)}, деньги ${MU(W.balance(at).cash)}, на подписи ${sign.length} ${plural(sign.length,'приказ','приказа','приказов')}.`],['08:12','Исполнительный директор','Коллеги, по незакрытым сменам — замены до 09:00, отчёт сюда.'],['08:40','Начальник охраны', missed.length ? `Замены выставлены: ${missed.map(v=>v.o.name).join(', ')}.` : 'Все смены открыты.'],['09:05','Главный бухгалтер',`Налоги 25-го — ${MU(W.upcoming(at).tax)}, деньги есть.`]] },
      { id:'sec', name:'Охрана · все объекты', who:'начальник охраны, заместители, начальники объектов', n:2 + roleCtx(at).objs, msgs:[...missed.map(v=>['06:15','ИИ · дежурный по объектам',`Нет отметки: ${v.o.name}, пост ${v.o.missedPost||1}. Задача начальнику охраны создана.`]), ...inc.slice(0,3).map(x=>[x.time||'12:00','Начальник объекта',`${x.obj.name}: ${x.type}. Запись в журнале.`]), ...chk.slice(0,2).map(x=>['15:30','Заместитель начальника охраны',`Проверка ${x.obj.name} проведена${x.presc?', выписано предписание':' без замечаний'}.`])] },
      { id:'buh', name:'Бухгалтерия', who:'главный бухгалтер, бухгалтеры, исполнительный директор', n:2 + roleCtx(at).al.a, msgs:[['09:20','Бухгалтер','Акты за прошлый месяц выставлены, ЭСФ отправлены.'],['10:05','ИИ · бухгалтер-аналитик',`Просрочка 30+: ${MU(W.receivables(at).overdue30)}. Письма-напоминания подготовлены.`]] },
      { id:'fleet', name:'Автопарк', who:'механик, водители, начальник охраны', n:1 + roleCtx(at).al.f, msgs:W.fleetAt(CAT.fleet, at).filter(c=>c.toLeft<=1000||c.insLeft<=30).slice(0,3).map(c=>['08:00','ИИ · механик',`${c.car}: ${c.toLeft<=1000?`ТО через ${N(c.toLeft)} км`:`страховка до ${dt(c.insDay)}`}.`]) },
      { id:'it', name:'Сервер и 1С', who:'администратор, главный бухгалтер, исполнительный директор', n:3, msgs:[['03:00','ИИ · администратор 1С', oc.effectorOk ? 'Ночные копии выполнены: Effector Saver, MS SQL.' : 'Ночной бэкап Effector Saver не выполнен: мало места на диске копий. Копия MS SQL есть. Нужна фраза владельца на перенос старых копий в архив.'],['03:10','ИИ · администратор 1С',`Выгрузки за ночь: ${oc.exportsOk} из ${oc.exportsTotal}.`]] },
      { id:'all', name:'Общий', who:'все сотрудники', n:roleCtx(at).hr.total, msgs:[['10:00','Кадровик','Напоминаем: удостоверения охранника — продление за 30 дней, направления готовы.'],['16:00','Исполнительный директор','Спасибо всем за работу на этой неделе.']] },
    ];
    const o18 = W.objects.find(o=>o.name===MYOBJ), v18 = o18 ? W.objView(o18,at,at,at) : null;
    C.push({ id:'o18', name:`${MYOBJ} · посты`, who:'начальник объекта, старшие смен, охранники объекта, начальник охраны', n: o18 ? 2 + o18.posts*4 : 4, msgs:[['08:00','Старший смены','Смену принял, посты закрыты.'], ...(v18 && v18.missed ? [['08:20','ИИ · дежурный по объектам','Пост 2 не отметился — замена из резерва в пути.']] : []), ['14:00','Начальник объекта','Обход выполнен, замечаний нет.']] });
    if (at < W.LAUNCH_DEMO) C.forEach(c=>{ c.msgs = c.msgs.filter(m=>!m[1].startsWith('ИИ')); });
    C.forEach(c=>{ c.unread = Math.min(c.msgs.length, Math.floor(hb(at, c.id.length, 120)*4)) + LIVE.chat.filter(m=>m.ch===c.id && m.by!==LIVE.uid && m.role!==S.role).length; });
    return C;
  }
  const CH_OF = { owner:['lead','all'], gd:['lead','buh','sec','it','all'], ed:['lead','sec','buh','fleet','it','all','o18'], gb:['lead','buh','it','all'], buh:['buh','all'], sec:['lead','sec','fleet','all','o18'], dep:['sec','all'], obj:['o18','sec','all'], senior:['o18','all'], guard:['o18','all'], hr:['all'], law:['lead','all'], cd:['lead','all'], mgr:['all'], sup:['all'], mech:['fleet','all'], drv:['fleet','all'], disp:['sec','fleet','all'], adm:['it','all'], dev:[] };
  // список чатов роли (каналы, группы, личные) — модуль чатов collab-chat.js; без модуля — только каналы мира
  const myChats = (role, at) => { const C = mod('chat'); if (C && typeof C.myChats === 'function') return C.myChats(role, at); const ids = CH_OF[role.id] || ['all']; return chatsAt(at).filter(c=>ids.includes(c.id)); };

  // ======================= ПРОЕКТЫ =======================
  function projectsAt(at){
    const P0 = []; for (const y of [W.yOf(at)-1, W.yOf(at)]){ if (y < W.Y0) continue;
      P0.push([`Закрытие года ${y-1}`, 'Главный бухгалтер', W.idxOf(y-1,10,1), W.idxOf(y,1,10), ['инвентаризация','акты сверки с заказчиками','резервы отпусков','годовая ФНО','аудит баланса']]);
      P0.push(['Тендеры весны: новые объекты', 'Коммерческий директор', W.idxOf(y,1,1), W.idxOf(y,4,15), ['мониторинг госзакупок','осмотры и расчёт тарифа','заявки','договоры','выставление постов']]);
      P0.push(['Летняя форма: закупка и выдача', 'Снабженец', W.idxOf(y,2,15), W.idxOf(y,4,31), ['потребность по нормам','сравнение КП','оплата по заявке','выдача на объекты']]);
      P0.push([`Переаттестация охранников, I полугодие ${y}`, 'Кадровик', W.idxOf(y,2,1), W.idxOf(y,5,15), ['список и направления','обучение','экзамен','удостоверения в реестр']]);
      P0.push(['Новый объект по тендеру: бизнес-центр, 4 поста', 'Коммерческий директор', W.idxOf(y,9,1), W.idxOf(y,11,1), ['заявка на госзакупки','осмотр и расчёт тарифа','договор и допсоглашение','набор и обучение 9 охранников','выставление постов']]);
      P0.push([`Переаттестация охранников, IV квартал ${y}`, 'Кадровик', W.idxOf(y,9,1), W.idxOf(y,11,20), ['список и направления','обучение','экзамен','удостоверения в реестр']]);
      P0.push([`Бюджет ${y+1}`, 'Исполнительный директор', W.idxOf(y,8,1), W.idxOf(y,10,10), ['драйверы','бюджеты блоков','свод БДР и БДДС','согласование ГД','утверждение учредителем']]);
      P0.push(['Подготовка к плановой проверке органов внутренних дел', 'Юрист', W.idxOf(y,9,15), W.idxOf(y,11,10), ['лицензия и приложения','журналы постов','оружейная комната','инструктажи','самопроверка']]);
      if (y === 2026) P0.push(['Ещё 2 автомобиля ГБР в 2027 году', 'Механик', W.idxOf(2026,5,1), W.idxOf(2027,2,1), ['выбор модели','договор лизинга','аванс (октябрь)','поставка','оклейка и рации']]);
      if (y === 2025) P0.push(['Задачи и чаты: подключение Битрикс24', 'Администратор системы', W.idxOf(2025,0,10), W.idxOf(2025,2,1), ['вебхук на сервере','сотрудники и структура','задачи — чтение','задачи — двусторонняя','чаты и уведомления']]);
    }
    return P0.filter(p=>p[2] <= at && p[3] >= at - 20).map((p,k)=>{ const span = Math.max(1,p[3]-p[2]), prog = Math.max(0, Math.min(1, (at-p[2])/span * (0.97 + 0.06*hb(k,p[2],130)))); const done = at >= p[3]; const stDone = done ? p[4].length : Math.min(p[4].length-1, Math.floor(prog * p[4].length + 1e-9)); return { name:p[0], owner:p[1], from:p[2], to:p[3], prog: done ? 1 : prog, stages:p[4], stDone, late: !done && prog < (at-p[2])/span - 0.15, tasks: 3 + Math.floor(hb(k,7,131)*9) }; });
  }

  // ======================= РАБОЧИЙ СТОЛ РОЛИ =======================
  function roleKpi(role, at){
    const from = RNG.from, to = RNG.to, b = W.balance(at), up = W.upcoming(at), D0 = docflowAt(at), open = D0.orders.filter(o=>!o.done), c = roleCtx(at);
    const ytd = W.idxOf(W.yOf(at),0,1), plY = W.pl(ytd, at), cfY = W.cashflow(ytd, at), ar = W.receivables(at), fleet = W.fleetAt(CAT.fleet, at);
    const day = W.objects.filter(o=>W.active(o,at)).map(o=>W.objView(o,at,at,at)), missed = day.filter(v=>v.missed>0), plan = day.reduce((s,v)=>s+v.plan,0);
    const mine = (who) => D0.orders.filter(o=>!o.done && o.route[o.stage]===who).length + D0.memos.filter(m=>m.status==='у адресата' && m.to===who).length;
    const sh = tile(`Смены на ${dt(at)}`, `${N(plan-missed.length)} <span class="sm">/ ${N(plan)}</span>`, [missed.length?`<span class="dn">не открыты: ${missed.map(v=>v.o.name).join(', ')}</span>`:'<span class="up">все открыты</span>'], missed.length?'var(--bad)':'', null, 'shifts');
    const appr = Object.keys(DRV_DEF).length ? ['bdr','sales','cf','supply','hr','fleet'].filter(k=>(S.appr[k]||0) === 2).length : 0;
    const K = {
      owner: [tile('Выручка с начала года', MU(plY.revenue), [`EBITDA ${MU(plY.ebitda)} · маржа ${P(plY.revenue?plY.ebitda/plY.revenue*100:0)}`], ''), tile('Чистая прибыль с начала года', MU(plY.net), [`дивиденды выплачены ${MU(-cfY.dividends)}`], ''), tile(`Деньги на ${dt(at)}`, MU(b.cash), [`дебиторка ${MU(ar.total)} · просрочка 30+ ${MU(ar.overdue30)}`], ar.overdue30>0?'var(--warn)':''), (()=>{ const q = ownerQueue(at).filter(x=>x.st==='ждёт решения'); return tile('На утверждение', q.length, [q.slice(0,2).map(x=>x.t).join(' · ')||'очередь пуста'], q.length?'var(--warn)':'', null, 'owner'); })()],
      gd: [tile('На подписи (ЭЦП)', open.filter(o=>o.route[o.stage]==='Генеральный директор').length, ['приказы · подпись ключом генерального директора'], open.some(o=>o.route[o.stage]==='Генеральный директор'&&o.overdue)?'var(--warn)':'', null, 'docflow'), tile('Записки ко мне', D0.memos.filter(m=>m.to==='Генеральный директор' && m.status!=='закрыта').length, ['ждут резолюции'], '', null, 'docflow-memos'), tile('EBITDA за период', MU(W.pl(from,to).ebitda), [deltaLine(ebitdaOf)], ''), tile(`Деньги на ${dt(at)}`, MU(b.cash), [`налоги ${dts(up.taxDay)} — ${MU(up.tax)} · зарплата ${dts(up.salDay)} — ${MU(up.sal)}`], '')],
      gb: [tile(`Деньги на ${dt(at)}`, MU(b.cash), [`зарплата ${dts(up.salDay)} — ${MU(up.sal)}`], ''), tile(`К уплате ${dts(up.taxDay)}`, MU(up.tax), ['ИПН, взносы, НДС, аванс КПН · ФНО — своей ЭЦП'], '', null, 'taxes'), tile('Закрытие месяца', `${closeDone(at)} / ${closeList(at).length}`, ['чек-лист: табель, ФОТ, акты, ЭСФ, сверки, НДС, ОСВ, ФНО'], W.dOf(at) > 10 && closeDone(at) < 10 ? 'var(--warn)' : '', null, 'payments-close'), tile('Ключ ЭЦП', (()=>{ const k = ECP.find(x=>x.who==='Главный бухгалтер' && x.from<=at); return k ? `${Math.max(0,k.to-at)} дн.` : '—'; })(), ['до окончания · перевыпуск через eGov'], (()=>{ const k = ECP.find(x=>x.who==='Главный бухгалтер' && x.from<=at); return k && k.to-at<=30 ? 'var(--warn)' : ''; })(), null, 'admin-conn')],
      buh: [tile(`Зарплата ${dts(up.salDay)}`, MU(up.sal), ['на руки · табель из отметок смен'], ''), tile('Акты к выставлению', MU(ar.unbilled), ['начислено без акта в текущем месяце'], ''), tile('Сверки с заказчиками', Math.max(1, Math.round(c.objs/6)), ['акты сверки в работе'], ''), tile('Записки ко мне', D0.memos.filter(m=>m.to==='Бухгалтер' && m.status!=='закрыта').length, ['ждут резолюции'], '')],
      sec: [sh, tile('Происшествий за период', incIn(from,to).length, [deltaLine((a,z)=>incIn(a,z).length, true)], ''), tile('Предписания не устранены', W.prescOpen(at).length, ['по проверкам заказчиков и органов'], W.prescOpen(at).length?'var(--warn)':''), tile('Удостоверения 30 дн.', c.hr.cert30, [`за 90 дней — ${c.hr.cert90}`], c.hr.cert30?'var(--warn)':'')],
      dep: (()=>{ const os = W.objects.filter(o=>REG_WEST.includes(o.region) && W.active(o,at)), mv = os.map(o=>W.objView(o,at,at,at)), ms = mv.filter(v=>v.missed>0); return [tile('Объекты региона', os.length, [REG_WEST.join(' · ')], ''), tile(`Смены региона ${dts(at)}`, `${N(mv.reduce((s,v)=>s+v.plan,0)-ms.length)} <span class="sm">/ ${N(mv.reduce((s,v)=>s+v.plan,0))}</span>`, [ms.length?ms.map(v=>v.o.name).join(', '):'все открыты'], ms.length?'var(--bad)':''), tile('Проверок за 30 дней', W.checks.filter(x=>x.day>at-30&&x.day<=at&&REG_WEST.includes(x.obj.region)).length, ['план — каждый объект раз в месяц'], '')]; })(),
      obj: (()=>{ const o = W.objects.find(x=>x.name==='Объект № 18') || W.objects[0], v = W.objView(o,at,at,at); return [tile(o.name, `${o.posts} ${nw(o.posts,'постов')}`, [`${o.kind} · ${o.city} · ${o.sched}`], ''), tile(`Смены ${dts(at)}`, `${N(v.plan-v.missed)} <span class="sm">/ ${N(v.plan)}</span>`, [v.missed?'<span class="dn">пост не открыт — замена в пути</span>':'все открыты'], v.missed?'var(--bad)':''), tile('Происшествия за период', W.incidents.filter(x=>x.obj===o&&x.day>=from&&x.day<=to).length, ['журнал объекта'], '')]; })(),
      senior: [tile('Моя смена', 'сутки/трое', [`следующая — ${dts(at+((3-at%4+4)%4||4))} 08:00 · пост 1`], ''), tile('Отметки постов', '12 / 12', ['каждые 2 часа · код + геометка'], ''), tile('Ознакомиться', open.filter(o=>o.route[o.stage]==='ознакомление').length ? 1 : 0, ['приказ по смене'], '')],
      guard: [tile('Следующая смена', dts(at+((2-at%4+4)%4||4)), ['08:00–08:00 · Объект № 18, пост 2'], ''), tile('Часы за месяц', `${N(Math.round(W.dOf(at)/4*24))} / ${F(W.P.normYear/12,1)}`, ['норма месяца — 40 ч в неделю · по графику сутки/трое до 182,5 ч, сверх нормы — сверхурочные 1,5× (не больше 120 ч в год)'], ''), tile('Удостоверение', `до ${dt(at+224)}`, ['продление — за 30 дней'], ''), tile('Ознакомиться', 1, ['приказ об изменении графика смен'], 'var(--warn)')],
      hr: [tile('Сотрудников', N(c.hr.total), [`охранников ${N(c.hr.guards)} · администрация ${c.hr.admin}`], '', null, 'hr'), tile('Кадровые приказы в работе', open.filter(o=>o.kind==='к').length, ['проекты, визы, подпись, ознакомление'], '', null, 'docflow'), tile('Удостоверения 30 / 90 дн.', `${c.hr.cert30} / ${c.hr.cert90}`, ['направления на обучение'], c.hr.cert30?'var(--warn)':''), tile('Уведомления ЕСУТД', open.filter(o=>o.kind==='к'&&/приём|увольн/i.test(o.title)).length, ['после подписи приказа · своей ЭЦП'], '')],
      law: [tile('Договоры истекают 60 дн.', W.objects.filter(o=>W.active(o,at)&&o.contractEnd>=at&&o.contractEnd-at<=60).length, ['допсоглашения готовит ИИ'], '', null, 'legal'), tile('На визе', open.filter(o=>o.route[o.stage]==='Юрист').length, ['приказы и договоры'], open.some(o=>o.route[o.stage]==='Юрист'&&o.overdue)?'var(--warn)':'', null, 'docflow'), tile('Претензии', D0.memos.filter(m=>/претензи/i.test(m.title)&&m.status!=='закрыта').length, ['ответы заказчикам'], ''), tile('Проверка органов', 'по плану', ['проект «Подготовка к плановой проверке»'], '', null, 'tasks-projects')],
      cd: [tile('Выручка за период', MU(revenueOf(from,to)), [deltaLine(revenueOf)], '', null, 'sales'), tile('Воронка за период', W.funnel(from,to).requests, [`запросов → ${W.funnel(from,to,objFilter).signed} договоров`], ''), tile('Тендеры (госзакупки)', 2 + Math.floor(hb(at,1,140)*4), ['новые объявления по охране · задачи созданы'], ''), tile('Просрочка 30+', MU(ar.overdue30), ['письма-напоминания'], ar.overdue30?'var(--warn)':'')],
      mgr: [tile('Мои заказчики', W.customers.filter(cu=>cu.objects.some(scopeOk)).length, ['закреплены за менеджером'], ''), tile('КП в работе', 1 + Math.floor(hb(at,2,141)*4), ['ответ заказчику — 2 дня'], ''), tile('Осмотры объектов', Math.floor(hb(at,3,142)*3), ['на этой неделе'], '')],
      sup: [tile('Ниже минимума', CAT.stock.filter(x=>x.stock<x.min).length, [CAT.stock.filter(x=>x.stock<x.min).map(x=>x.item).slice(0,3).join(' · ')||'нет'], CAT.stock.some(x=>x.stock<x.min)?'var(--warn)':'', null, 'supply'), tile('Заявки на закупку', 1 + Math.floor(hb(at,4,143)*4), ['ждут оплаты по заявке'], ''), tile('Записки ко мне', D0.memos.filter(m=>m.to==='Снабженец' && m.status!=='закрыта').length, ['выдача формы на объекты'], '')],
      mech: [tile('ТО в 1000 км', fleet.filter(x=>x.toLeft<=1000).length, [fleet.filter(x=>x.toLeft<=1000).map(x=>x.car.split(' ').slice(0,2).join(' ')).join(' · ')||'нет'], fleet.some(x=>x.toLeft<=1000)?'var(--warn)':'', null, 'fleet'), tile('Страховки 30 дн.', fleet.filter(x=>x.insLeft<=30).length, ['продление'], fleet.some(x=>x.insLeft<=30)?'var(--warn)':''), tile('Перерасход ГСМ > 10 %', fleet.filter(x=>x.fuelFact/x.fuelNorm>1.1).length, ['разбор с водителями'], '')],
      drv: [(()=>{ const c0 = CAT.fleet[0] || { car:'—', role:'' }, w0 = String(c0.car).split(' '); return tile('Мой автомобиль', w0.slice(0,-3).join(' ') || c0.car, [`${w0.slice(-3).join(' ')} · ${tx(c0.role)}`], '', null, null, 'car:0'); })(), tile('ТО через', `${N((fleet[0]||{}).toLeft||0)} км`, ['запись к механику'], ''), tile('Путевой лист', 'открыт', [`${dts(at)} 08:00 · пробег за смену — в конце смены`], '')],
      disp: [sh, tile('Обращения заказчиков', 3 + Math.floor(hb(at,5,144)*6), ['за сегодня · в задачи'], ''), tile('Непрочитано в чатах', myChats(role, at).reduce((s2,x)=>s2+x.unread,0), ['каналы охраны и руководства'], '', null, 'chats')],
      adm: [(()=>{ const cr = connRegistry(at), on = cr.filter(r=>r[2]!=='—'), off = cr.filter(r=>r[2]==='—'); return tile('Подключения', `${on.length} / ${cr.length}`, [off.length ? off.map(r=>`${tx(r[0])} — ${tx('не подключена')}`).join(' · ') : tx('все подключены')], '', null, 'admin-conn'); })(), tile(`Выгрузки ${dts(at)}`, `${W.onec(at).exportsOk} / ${W.onec(at).exportsTotal}`, [''], W.onec(at).exportRejected?'var(--bad)':'', null, 'onec'), tile('Бэкапы', W.onec(at).effectorOk?'3 / 3':'2 / 3', [W.onec(at).effectorOk?'выполнены':'Effector Saver — нет места'], W.onec(at).effectorOk?'':'var(--bad)', null, 'onec'), tile('Ролей', ROLES.length, ['матрица прав — на сервере'], '', null, 'admin')],
      dev: [tile('Движок', '61 / 61', ['тесты dev/engine'], '', null, 'dev'), tile('Версия макета', '0.8.4', ['методика по закону, ОПиУ по уровням, ИИ-помощник, задачи и проекты, чаты, капитал, два языка'], '', null, 'dev')],
      ed: [],
    };
    return K[role.id] || [];
  }
  const ROUTINE = {
    owner:['08:30 — владельческая сводка в Telegram','понедельник — итоги недели группы','1-е число — ОПиУ, ДДС, баланс, дивидендная способность','квартал — утверждение бюджетов блоков'],
    gd:['08:00 — подписи ЭЦП и резолюции','10:00 — совещание с исполнительным директором','пятница — отчёт учредителю','1-е число — закрытие месяца с главным бухгалтером'],
    gb:['09:00 — банк и платёжный календарь','до 3-го — табель → зарплата','5-е — выплата зарплаты','до 10-го — закрытие месяца','15-е и 25-е — ФНО и налоги'],
    buh:['09:00 — первичка и акты','до 3-го — табель → зарплата','5-е — ведомость','еженедельно — акты сверки'],
    sec:['06:15 — открытие смен, замены','09:00 — совещание (пн)','день — проверки объектов','20:00 — отчёты объектов'],
    dep:['06:15 — смены региона','вахта 15/15 — смена состава','день — проверки','20:00 — отчёт начальнику охраны'],
    obj:['08:00 — приём смены','каждые 2 часа — обход','20:00 — отчёт объекта','связь с заказчиком'],
    senior:['08:00 — приём смены','обход и отметки постов','08:00 — сдача смены'], guard:['отметка в начале смены (код + геометка)','обход по маршруту','запись в журнал','ознакомление с приказами в телефоне'],
    hr:['09:00 — приём и увольнение, ЕСУТД','за 30 дней — удостоверения и медосмотры','до 3-го — табель'], law:['договоры и допсоглашения','визы на приказы','претензии и ответы','лицензия и проверки органов'],
    cd:['09:00 — тендеры и запросы','встречи и осмотры','пятница — воронка и дебиторка'], mgr:['запросы и КП','осмотр объектов','договоры своих заказчиков'],
    sup:['заявки на закупку','выдача формы на объекты','инвентаризация склада (месяц)'], mech:['ТО и ремонт','путевые листы и ГСМ','страховки и техосмотры'], drv:['путевой лист','выезды ГБР','заправка и пробег'],
    disp:['обращения заказчиков','вызов ГБР','контроль отметок','каналы в чатах'], adm:['03:00 — копии и выгрузки','подключения и ошибки','роли и доступы','журнал действий'], dev:['релизы','проверки','движок и тесты'], ed:[],
  };
  function roleHome(role){
    const at = RNG.anchor, D0 = docflowAt(at), mineO = D0.orders.filter(o=>!o.done && o.route[o.stage]===role.name), mineM = D0.memos.filter(m=>m.status!=='закрыта' && m.to===role.name);
    const prq = payReqs(at).filter(r => (['gb','buh'].includes(role.id) && r.st==='проверка бухгалтера') || (role.id==='gd' && r.st==='подпись генерального директора') || (role.id==='ed' && r.st==='подпись исполнительного директора') || (role.id==='gb' && r.st==='платёжное поручение в 1С (робот)'));
    const tk = W.tasksAt(at).filter(t=>t.owner===role.name || (role.id==='gb' && t.owner==='Бухгалтер') || (role.id==='adm' && t.owner==='Администратор системы') || (role.id==='buh' && t.owner==='Бухгалтер'));
    const ai = CAT.aiRoles.find(x=>x.role===role.name) || CAT.aiRoles.find(x=>role.name.includes(x.role)) || null;
    const ch = role.rt.chats!=='·' ? myChats(role, at) : [];
    return h1(`${t('nav.desk')} · ${rn(role.name)}`, role.mission + (role.rt.kokpit!=='·' && hasMoney(role) ? ` · <a href="#kokpit-full">кокпит компании</a>` : '')) + `<div class="tiles">${roleKpi(role, at).join('')}</div>
      <div class="two">${card(`На мне на ${dt(at)}`, (mineO.length||mineM.length||tk.length||prq.length) ? table(['Что','Документ','Срок'], [...prq.slice(0,5).map(r=>[r.st==='платёжное поручение в 1С (робот)'?'отправить в банк':'заявка на оплату', `${r.no} ${r.to} — ${MU(r.amount)}`, dts(r.payDay)]), ...mineO.slice(0,6).map(o=>['подпись / виза', `Приказ № ${o.no} «${o.title.toLowerCase()}»`, dts(o.due)+(o.overdue?' <span class="dn">срок</span>':'')]), ...mineM.slice(0,4).map(m=>['резолюция', `${m.no} ${esc(m.title)}`, dts(m.sla)+(m.overdue?' <span class="dn">срок</span>':'')]), ...tk.slice(0,6).map(t=>['задача', `${t.no} ${esc(t.title)}`, dts(t.due)+(t.overdue?' <span class="dn">срок</span>':'')])], 'compact') : empty('Документов и задач на этой роли нет.'))}
      ${card('Мой день', `<ul class="ul">${(ROUTINE[role.id]||[]).map(x=>`<li>${x}</li>`).join('')}</ul>` + (ai ? `<h3>ИИ · ${ai.assistant}</h3><ul class="ul tight">${ai.tasks.slice(0,4).map(t=>`<li><button type="button" class="lnk" data-ai="${esc(t)}">${t}</button></li>`).join('')}</ul>` : ''))}</div>
      <div class="two">${ch.length ? card('Мои чаты', ch.map(c=>`<div class="chrow"><b><button type="button" class="lnk" data-chopen="${esc(c.id)}">${esc(c.name)}</button></b>${c.ment?`<span class="st">@${c.ment}</span>`:''}${c.unread?`<span class="st">${c.unread}</span>`:''}<small>${esc((c.msgs[c.msgs.length-1]||['','','нет сообщений'])[2])}</small></div>`).join(''), 'непрочитано по каналам роли') : ''}
      ${card('Права роли', `<div class="rights">${BLK.filter(([k])=>role.rt[k]!=='·').map(([k,n])=>`<span class="rg l${role.rt[k]}" title="${LVL[role.rt[k]]}">${n} · ${role.rt[k]}</span>`).join('')}</div>` + note(`${role.limit} · ступень ИИ ${role.step} · подчиняется: ${role.boss}`))}</div>`;
  }
  function rolesTab(at){
    const c = roleCtx(at);
    return card(`Роли и права на ${dt(at)}`, `<div class="tw mtw"><table class="tbl compact matrix"><thead><tr><th>Роль</th><th>Чел.</th>${BLK.map(([k,n])=>`<th title="${n}"><span>${n}</span></th>`).join('')}</tr></thead><tbody>${ROLES.map(x=>`<tr><td><b>${x.name}</b><br><small>${x.grp}</small></td><td class="num">${N(x.n(c))}</td>${BLK.map(([k])=>`<td class="lv l${x.rt[k]}" title="${LVL[x.rt[k]]}">${x.rt[k]}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` + `<div class="legend mlg">${[['П','П — полный'],['Б','Б — свой блок или подразделение'],['Ч','Ч — чтение'],['С','С — только свои записи'],['·','«·» — нет доступа']].map(([k,n])=>`<span><i class="lv l${k}"></i>${n}</span>`).join('')}</div>` + note('Зарплату видят только генеральный и исполнительный директор, главный бухгалтер, бухгалтер по зарплате и учредитель. Права проверяет сервер (dev/engine/src/roles.js), интерфейс лишь скрывает недоступное.'), 'смотреть как: выберите роль внизу меню') +
      card('Роли: подчинение, лимиты, ступень ИИ', mod('analytics').fromRows(['Роль','Подчиняется','Чем управляет','Лимит и подпись','ИИ'], ROLES.map(x=>[`<b>${x.name}</b>`, x.boss, x.mission, x.limit, x.step]), { id:'admin-roles', csv:'roles', compact:true, lo:[2,3], meta:k=>({ _kind:'employee', _id:ROLES[k].id }) }), 'ступень ИИ: 1 — советует и готовит, 2 — рутина по правилам с журналом, 3 — сам в пределах лимитов');
  }
  function noAccess(role, sec){ const NM = { owner:'Учредитель', docs:'Документы', payments:'Платежи', knowledge:'Знания' }; return h1('Нет доступа') + card(`Роль «${role.name}»`, note(`Раздел «${(BLK.find(b=>b[0]===sec)||[0, NM[sec]||sec])[1]}» этой роли недоступен. Так увидит сотрудник: сервер вернёт отказ, интерфейс скрывает пункт меню. Права меняет администратор по решению владельца.`)); }

  // ======================= РЕЕСТР ПОДКЛЮЧЕНИЙ И БИТРИКС24 =======================
  function connRegistry(at){
    const oc = W.onec(at), t = (h,m) => `${dts(at)} ${h}:${m}`;
    return [
      ['1С:Бухгалтерия · SSS_BUH','учёт','↔','каждые 10 мин', t('23','50'), `${oc.exportsOk}/${oc.exportsTotal} выгрузок`, oc.exportRejected?1:0, 'администратор 1С', 'файл секретов сервера'],
      ['MS SQL Server','копии баз','←','03:00 ежедневно', t('03','00'), oc.effectorOk?'копии выполнены':'Effector Saver — ошибка', oc.effectorOk?0:1, 'администратор', 'учётная запись службы'],
      ['Сервер Агентства','здоровье','←','каждые 5 мин', t('23','55'), 'диски, память, службы, задания', 0, 'администратор', '—'],
      ['Битрикс24','задачи, чаты, CRM, диск','↔','каждые 10 мин', t('23','50'), '7 потоков', 0, 'администратор', 'входящий вебхук в файле секретов'],
      ['Кабинет налогоплательщика (КГД)','налоги','←','06:00 ежедневно', t('06','00'), 'лицевой счёт', 0, 'главный бухгалтер', 'ключ ЭЦП AUTH'],
      ['ИС ЭСФ','счета-фактуры','← · → подпись','каждый час', t('23','00'), 'через модуль 1С', 0, 'главный бухгалтер', 'ключ ЭЦП GOST'],
      ['eGov / eGov Business','справки, лицензия','←','по запросу', dt(Math.max(0,at-9)), 'справки для тендеров', 0, 'юрист', 'ключ ЭЦП AUTH'],
      ['ЕНПФ · ГФСС · ФСМС','взносы','←','ежемесячно', dt(W.MONTHS[Math.max(0,W.monthIdx(at)-1)].end), 'сверка ведомости', 0, 'главный бухгалтер', 'через Кабинет'],
      ['ЕСУТД','трудовые договоры','→ подпись','по событию', dt(Math.max(0,at-2)), 'уведомления', 0, 'кадровик', 'ключ ЭЦП GOST'],
      ['Портал госзакупок','тендеры на охрану','←','каждые 2 ч', t('22','00'), 'объявления', 0, 'коммерческий директор', 'открытые данные'],
      ['Банк Агентства','выписки','←','через 1С, 3 раза в день', t('18','00'), 'выписка в 1С', 0, 'главный бухгалтер', 'клиент-банк 1С'],
      ['Курсы НБ РК','валюта','←','ежедневно', t('09','00'), '₸/$/€/₽', 0, 'система', 'открытые данные'],
      ['Приложение отметок (телефоны)','смены','←','онлайн', t('23','58'), `${N(W.objects.filter(o=>W.active(o,at)).reduce((s,o)=>s+o.posts,0))} постов`, 0, 'начальник охраны', 'токен устройства'],
      ['Telegram-бот','уведомления','→','по событию', t('23','40'), 'смены, документы, сводки', 0, 'администратор', 'токен бота в файле секретов'],
      ['WhatsApp Business','заказчикам','→ по подтверждению','по событию', dt(Math.max(0,at-1)), 'шаблоны сообщений', 0, 'коммерческий директор', 'файл секретов'],
      ['Почта Агентства','письма заказчиков','← · → черновики','каждые 5 мин', t('23','45'), 'реестр входящих', 0, 'диспетчер', 'пароль приложения'],
      ['Вторая организация 1С','учёт','—','—','—','не подключена', 0, 'владелец', '—'],
    ];
  }
  function bitrixCard(at){
    const c = roleCtx(at), tk = W.tasksAt(at).length, D0 = docflowAt(at);
    const rows = [
      ['Сотрудники и структура','← из Битрикс24','каждые 10 мин', `${N(c.hr.total)} сотрудников · ${ROLES.length} ролей`, 'вход в SUNKAR BI через учётную запись Битрикс24'],
      ['Задачи','↔ двусторонняя','каждые 10 мин', `${tk} открытых · создано сегодня ${W.tasksAt(at).filter(t=>t.created===at).length}`, 'задача из SUNKAR BI появляется у сотрудника в Битрикс24, статус возвращается'],
      ['Проекты (группы)','↔','каждые 10 мин', `${projectsAt(at).length} проектов`, 'проект = рабочая группа Битрикс24'],
      ['Чаты и уведомления','→ в мессенджер','по событию', `${chatsAt(at).length} каналов`, 'сигналы и сводки ИИ — в каналы Битрикс24'],
      ['CRM: сделки и компании','← чтение','каждые 10 мин', `${W.customers.length} компаний · ${W.funnel(Math.max(0,at-30),at).requests} запросов за 30 дней`, 'сделка ↔ договор SUNKAR BI, оплаты из 1С'],
      ['Диск: документы','→ подписанные копии','по событию', `${D0.orders.filter(o=>o.done && o.day>at-30).length} приказов за 30 дней`, 'папки 01–10 библиотеки документов'],
      ['Календарь','↔','каждые 10 мин', 'совещания и проверки', 'регламенты с контрольными точками'],
    ];
    return card(`Битрикс24 на ${dt(at)}`, `<div class="tiles">${tile('Портал', 'sunkar.bitrix24.kz', ['вымышленный адрес · тариф «Профессиональный»'], '')}${tile('Последний обмен', `${dts(at)} 23:50`, ['каждые 10 минут · ошибок 0'], '')}${tile('Очередь', '0', ['изменений ждут отправки'], '')}${tile('Права вебхука', '7', ['task, im, crm, disk, user, department, calendar · вебхук в файле секретов сервера'], '')}</div>` +
      table(['Поток','Направление','Частота','Объём','Как работает'], rows.map(r=>[`<b>${r[0]}</b>`, ...r.slice(1)]), 'compact', [2,4]) + note('конфликт правок: побеждает SUNKAR BI для данных охраны и финансов, Битрикс24 — для задач и чатов; каждое расхождение — в журнал обмена · исходящих вебхуков нет, сервер сам опрашивает портал'), 'задачи, проекты, чаты, CRM, диск — одно управление');
  }
  function exchangeLog(at){
    const L = [];
    ['23:50 · 1С SSS_BUH · выгрузка 144/144 · принято','23:50 · Битрикс24 · задачи: 3 изменения → SUNKAR BI','23:45 · Почта · 2 письма заказчиков → реестр','23:40 · Telegram · 14 уведомлений охранникам','22:00 · Госзакупки · 1 новое объявление → задача коммерческому директору','18:00 · Банк · выписка загружена в 1С','09:00 · НБ РК · курсы на дату','06:00 · Кабинет налогоплательщика · лицевой счёт = начислено в 1С', W.onec(at).effectorOk ? '03:00 · Effector Saver · копия выполнена' : '03:00 · Effector Saver · ошибка: мало места на диске копий'].forEach(x=>{ const [tm, ...rest] = x.split(' · '); L.push([`${dts(at)} ${tm}`, rest[0], rest.slice(1).join(' · ')]); });
    return card('Журнал обмена', table(['Время','Подключение','Событие'], L, 'compact'), 'последние события за день «Данные на»');
  }

  // ======================= УЧРЕДИТЕЛЬ: ОЧЕРЕДЬ «НА УТВЕРЖДЕНИЕ» И РЕЕСТР РЕШЕНИЙ =======================
  S.own = S.own || {};
  // выплаты, ожидающие решения учредителя (для прогноза 13 недель — отдельной колонкой «если утвердят»)
  function pendingPays(at){ return ownerQueue(at).filter(q => q.k === 'div' && q.st === 'ждёт решения').map(q => ({ day: W.idxOf(W.yOf(at),11,15), amount: q.sum, title: q.t })); }
  // дивидендная способность: минимум прогноза денег на 13 недель (утверждённые выплаты уже в прогнозе) − резерв 30 млн ₸
  function divCap(at){ const fc = W.forecast13(at); return Math.min(W.balance(at).cash, ...fc.map(w => w.cash)) - 30e6; }
  function ownerQueue(at){
    const y = W.yOf(at), loss = lossObjects(Math.max(0,at-89), at, W.objects.filter(o=>W.active(o,at)))[0];
    const Q = [
      { k:'b27', day:W.idxOf(2026,10,1), t:'Бюджет 2027 — свод БДР и БДДС', from:'Генеральный директор', sum:null, note:'рост постов 12 %, индексация 7 / 10 %, дивиденды 1 200 млн ₸', go:'budget-next', min:W.idxOf(2026,9,1) },
      { k:'div', day:W.idxOf(y,10,1), t:`Дополнительные дивиденды за ${y} год (15.12)`, from:'Главный бухгалтер', sum:250e6, note:'дивидендная способность — в «Финансах» · ИПН: 5 % до 230 000 МРП за год, сверх — 15 %', go:'finance', min:W.idxOf(2026,10,1) },
      ...(loss ? [{ k:'tar', day:Math.max(0,at-3), t:`Пересмотр тарифа ${loss.o.name} с 01.01.${y+1}`, from:'Коммерческий директор', sum:null, note:`маржа за 90 дней ${P(loss.margin)} · допсоглашение готово`, go:'objects', min:0 }] : []),
      { k:'wo', day:Math.max(0,at-5), t:'Списание изношенной формы', from:'Снабженец', sum:2.1e6, note:'ниже порога — к сведению', go:'supply', min:0, info:true },
    ];
    return Q.filter(q=>at >= q.min && q.day <= at).map(q=>({ ...q, st: (LIVE.decisions[q.k] && LIVE.decisions[q.k].v) || (q.info ? 'к сведению' : 'ждёт решения') }));
  }
  const DECISIONS = [
    [W.idxOf(2025,0,12),'Пересмотреть тарифы объектов ниже безубыточности','Учредитель','исполнено 01.07.2025','Объекты, Продажи'],
    [W.idxOf(2025,1,5),'Отметка смены кодом, геометка — после согласия сотрудника','Генеральный директор','исполнено','Смены'],
    [W.idxOf(2025,2,3),'Резерв охранников 5 % от постов в каждом регионе','Исполнительный директор','исполнено','Кадры'],
    [W.idxOf(2025,5,20),'Дивиденды 2025 — 500 млн ₸ двумя выплатами по 250 млн ₸ (июль, декабрь)','Учредитель','исполнено','ДДС'],
    [W.idxOf(2025,8,1),'Проверка каждого объекта не реже раза в месяц','Генеральный директор','исполнено','Происшествия и проверки'],
    [W.idxOf(2026,0,15),'Индексация тарифов 2026: 24/7 — 7 %, дневной — 10 %','Учредитель','исполнено','Продажи'],
    [W.idxOf(2026,2,15),'Лизинг 2 автомобилей ГБР в 2026 году','Учредитель','исполнено 12.05.2026','ДДС, Автопарк'],
    [W.idxOf(2026,9,20),'Ещё 2 автомобиля ГБР в 2027 году — аванс лизинга в октябре','Генеральный директор','в работе','Платежи, Бюджет 2027'],
    [W.idxOf(2026,5,25),'Дивиденды 2026: 400 млн ₸ в июле и 300 млн ₸ в октябре','Учредитель','исполнено','ДДС'],
    [W.idxOf(2026,9,1),'Бюджет 2027 собирать по драйверам','Генеральный директор','в работе','Бюджет 2027'],
    [W.idxOf(2026,10,2),'Старые копии 1С — перенос на архивный диск без удаления','Учредитель','ждёт фразы владельца','Сервер и 1С'],
  ];
  function fiveYears(at){
    const ys = []; for (let y = W.Y0; y <= W.yOf(at); y++){ const a = W.idxOf(y,0,1), z = Math.min(W.idxOf(y,11,31), at), full = W.idxOf(y,11,31); const p = W.pl(a, full), pf = W.pl(a, z); const ag = objAgg(a, z, W.objects), mv = W.hrRange(a, z), h0 = W.hr(a), h1x = W.hr(z), ar = W.receivables(z); const objsN = Math.max(1, W.objects.filter(o=>W.active(o,z)).length);
      const k365 = 365/(z-a+1), same = Math.min(full, W.idxOf(y, W.mOf(at), W.dOf(at))), arS = W.receivables(same);
      ys.push({ y, partial: z < full, rev: p.revenue, eb: p.ebitda, div: -W.cashflow(a, full).dividends, onTime: ag.plan ? 100-(ag.missed+ag.late)/ag.plan*100 : 100, turn: mv.fires/Math.max(1,(h0.total+h1x.total)/2)*k365*100, over: arS.total ? arS.overdue30/arS.total*100 : 0, inc: W.incidents.filter(x=>x.day>=a&&x.day<=z).length/objsN*k365, chk: W.checks.filter(x=>x.day>=a&&x.day<=z).length/objsN*k365 }); }
    return ys;
  }
  function ownerHome(role){
    const at = RNG.anchor, Q = ownerQueue(at), ys = fiveYears(at), b = W.balance(at), yr = W.pl(Math.max(0,at-364),at);
    const wait = Q.filter(q=>q.st==='ждёт решения').length;
    const roe = b.equity ? yr.net/b.equity*100 : 0, debt = (b.leasing||0) / Math.max(1, yr.ebitda);
    return h1(`Учредитель · владельческая сводка на ${dt(at)}`, 'по компании · ' + role.mission) + `<div class="tiles">${roleKpi(role, at).join('')}${tile('ROE · 12 месяцев', P(roe), ['чистая прибыль ÷ капитал'], '')}${tile('Долг / EBITDA', F(debt,2), ['лизинг ÷ EBITDA 12 мес.'], debt>2?'var(--warn)':'')}</div>
      ${card(`На утверждение · ${wait} ${plural(wait,'решение','решения','решений')}`, Q.length ? `<div class="ev">${Q.map(q=>`<div><span class="pill ${q.st==='утверждено'?'i':(q.info?'i':'w')}">${q.st}</span><div class="what">${q.t}${q.sum?` — ${MU(q.sum)}`:''}<small>${q.from} · ${dts(q.day)} · ${q.note}</small></div>${q.info||q.st!=='ждёт решения'||roleOf(S.role).id!=='owner' ? `<a class="btn" href="#${q.go}">${q.st==='ждёт решения'&&!q.info?'решение учредителя':'Открыть'}</a>` : `<span><button type="button" class="btn" data-own="${q.k}" data-v="утверждено">Утвердить</button> <button type="button" class="btn" data-own="${q.k}" data-v="возвращено">Вернуть</button></span>`}</div>`).join('')}</div>` : note('Очередь пуста.'), 'решение пишется в реестр и журнал; подпись документов — ЭЦП генерального директора')}
      ${card('Пять лет: выручка, EBITDA и дивиденды', bars(ys.map(x=>conv(x.rev)/1e6), ys.map(x=>x.y+(x.partial?' (прогноз)':'')), {values:v=>F(v,0), color:'var(--info)', fmt:v=>F(v)+' '+U(), hollow:ys.map(x=>x.partial), h:150}) + (()=>{ const rows = ys.map((x,k)=>{ const net = W.pl(W.idxOf(x.y,0,1), W.idxOf(x.y,11,31)).net, pr = ys[k-1]; return { y:x.y, partial:x.partial, rev:x.rev, eb:x.eb, m:x.rev?x.eb/x.rev*100:0, net, div:x.div, ds: net>0 ? x.div/net*100 : null, ry: pr ? (x.rev/pr.rev-1)*100 : null, ey: pr && pr.eb ? (x.eb/pr.eb-1)*100 : null }; });
      const f0 = ys[0], l0 = ys[ys.length-1], n = ys.length-1, cagr = n>0 && f0.rev>0 ? (Math.pow(l0.rev/f0.rev, 1/n)-1)*100 : null, yy = v => v==null ? '—' : `<span class="${v>=0?'up':'dn'}">${v>=0?'▲ +':'▼ −'}${F(Math.abs(v))} %</span>`;
      return T2({ id:'owner-5y', csv:'five_years', search:false, pageSize:10, cols:[{ key:'y', title:t('an.c.yr'), html:r=>r.y+(r.partial?' <small>год — факт + прогноз по договорам</small>':'') }, { key:'rev', title:t('an.c.revenue'), kind:'money', sum:'sum' }, { key:'ry', title:t('an.c.yoy'), kind:'pct', html:r=>yy(r.ry), lo:true }, { key:'eb', title:t('an.c.ebitda'), kind:'money', sum:'sum' }, { key:'ey', title:t('an.c.yoy'), kind:'pct', html:r=>yy(r.ey), lo:true }, { key:'m', title:t('an.c.margin'), kind:'pct', tot:rs=>{ let a=0, b=0; rs.forEach(r=>{ a+=r.eb; b+=r.rev; }); return b ? a/b*100 : 0; } }, { key:'net', title:t('an.c.net'), kind:'money', sum:'sum', lo:true }, { key:'div', title:t('an.c.dividends'), kind:'money', sum:'sum' }, { key:'ds', title:t('an.c.div_share'), kind:'pct', lo:true, tot:rs=>{ let a=0, b=0; rs.forEach(r=>{ a+=r.div; b+=r.net; }); return b>0 ? a/b*100 : null; } }], rows }) + note(`CAGR выручки ${f0.y}–${l0.y}: ${cagr==null?'—':P(cagr)} в год${l0.partial?' (последний год — факт и прогноз)':''}`); })(), U()+' · дивиденды — за год по графику выплат')}
      ${card('Порядок в работе по годам', mod('analytics').fromRows(['Год','Смены открыты вовремя','Текучесть, в год','Просрочка 30+ в дебиторке на ' + dts(at),'Происшествий на объект в год','Проверок на объект в год', t('an.c.yoy')], ys.map((x,k)=>[x.y+(x.partial?` <small>по ${dts(at)}</small>`:''), P(x.onTime), P(x.turn), P(x.over), F(x.inc,1), F(x.chk,1), k ? `${(x.onTime-ys[k-1].onTime)>=0?'▲ +':'▼ −'}${F(Math.abs(x.onTime-ys[k-1].onTime))} ${t('an.pp')}` : '—']), { id:'owner-order', csv:'order_by_year', search:false, total:false, lo:[6], vals:{ 0:(r,k)=>ys[k].y, 1:(r,k)=>ys[k].onTime, 2:(r,k)=>ys[k].turn, 3:(r,k)=>ys[k].over, 4:(r,k)=>ys[k].inc, 5:(r,k)=>ys[k].chk } }), 'текущий год — в пересчёте на год; дебиторка — на ту же дату каждого года')}
      ${card('Реестр решений', mod('analytics').fromRows(['Дата','Решение','Кто','Статус','Где видно'], [...Q.filter(q=>q.st==='утверждено'||q.st==='возвращено').map(q=>{ const d0 = LIVE.decisions[q.k] || {}; return [d0.ts ? new Date(d0.ts).toLocaleDateString('ru-RU') + ' ' + tOf(d0.ts) : dt(at), q.t, esc(whoOf(d0)), q.st, 'общий журнал']; }), ...DECISIONS.filter(d=>d[0]<=at).sort((a,b)=>b[0]-a[0]).map(d=>[dt(d[0]), d[1], d[2], d[3], d[4]])], { id:'owner-decisions', csv:'decisions', compact:true, lo:[4] }), 'решения не удаляются; отмена — новой записью')}`;
  }

  // ======================= ПЛАТЕЖИ: ЗАЯВКИ, ПЛАТЁЖНЫЙ КАЛЕНДАРЬ, ЗАКРЫТИЕ МЕСЯЦА =======================
  const PAY_T = [['Поставщик формы и обуви','Форма и спецсредства','Снабженец'],['Ремонт и ТО автомобилей','Транспорт и ГСМ','Механик'],['Топливные карты','Транспорт и ГСМ','Механик'],['Аренда офиса','Офис и аренда','Диспетчер'],['Связь и рации','Связь','Снабженец'],['Учебный центр: обучение охранников','Прочие','Кадровик'],['Страхование автомобилей','Транспорт и ГСМ','Механик'],['Подписка ИИ и сервер','ИТ и программное обеспечение','Администратор системы'],['Канцелярия и бланки','Офис и аренда','Диспетчер'],['Медосмотры сотрудников','Прочие','Кадровик']];
  function payReqs(at){
    const out = [], y0 = W.idxOf(W.yOf(at),0,1); let seq = 0;
    for (let d = Math.max(y0, at-40); d <= at; d++){
      if (d < y0) continue;
      const wd = W.toDate(d).getUTCDay(); if (wd===0 || wd===6) continue;
      const k = hb(d,1,151) < 0.55 ? 1 : 0; if (!k) continue;
      const t = PAY_T[Math.floor(hb(d,2,151)*PAY_T.length)], sup = -W.cashflow(W.MONTHS[W.monthIdx(d)].start, W.MONTHS[W.monthIdx(d)].end).suppliers;
      const amount = t[0]==='Подписка ИИ и сервер' ? 149000 : Math.round(sup / 12 * (0.5 + hb(d,3,152)) / 1000) * 1000, age = at - d;
      const route = ['черновик','проверка бухгалтера', amount > 10e6 ? 'подпись генерального директора' : 'подпись исполнительного директора', ...(amount > 50e6 ? ['учредитель'] : []), 'платёжное поручение в 1С (робот)', 'оплачено'];
      out.push({ day:d, who:t[2], to:t[0], line:t[1], amount, basis:`счёт № ${100+Math.floor(hb(d,4,153)*900)} от ${dts(Math.max(0, d-2))}`, st: route[Math.min(route.length-1, Math.floor(age/1.3))], route, payDay: d + route.length });
    }
    if (W.yOf(at) === 2026 && at >= W.idxOf(2026,9,26) && W.idxOf(2026,9,26) >= at-40){ const d = W.idxOf(2026,9,26), age = at - d, route = ['черновик','проверка бухгалтера','подпись генерального директора','платёжное поручение в 1С (робот)','оплачено']; out.push({ day:d, who:'Механик', to:'Лизинговая компания: аванс за 2 автомобиля ГБР (поставка 2027)', line:'Покупка ОС и лизинг', amount:18.4e6, basis:'договор лизинга № Л-27/02', st: route[Math.min(route.length-1, Math.floor(age/4))], route, payDay: d + 14 }); }
    // сквозная нумерация по дате с начала года
    const yr = W.yOf(at), st0 = Math.max(y0, at-40); let base = 0; for (let d = y0; d < st0; d++){ const wd = W.toDate(d).getUTCDay(); if (wd!==0 && wd!==6 && hb(d,1,151) < 0.55) base++; } if (yr >= 2026 && W.idxOf(2026,9,26) < st0 && W.idxOf(2026,9,26) >= y0) base++;
    out.sort((a,b)=>a.day-b.day).forEach((r,i)=>{ r.no = `ЗО-${yr}-${String(base + i + 1).padStart(4,'0')}`; });
    return out.reverse();
  }
  function payCalendar(at){
    const F13 = W.forecast13(at), rows = []; let cash = W.balance(at).cash, min = { cash, d:at };
    for (const w of F13){ const wdays = []; for (let d=w.from; d<=w.to; d++){ const wd = W.toDate(d).getUTCDay(); if (wd!==0 && wd!==6) wdays.push(d); }
      for (let d=w.from; d<=w.to && d<=at+30; d++){ const dom = W.dOf(d), inn = wdays.includes(d) ? w.inflow / Math.max(1, wdays.length) : 0;
        const pick = (day, v) => { let has = null; for (let x=w.from; x<=w.to; x++) if (W.dOf(x)===day){ has = x; break; } if (has===null) has = w.to; const wd = x => W.toDate(x).getUTCDay(); while ((wd(has)===0 || wd(has)===6) && has < w.to) has++; while ((wd(has)===0 || wd(has)===6) && has > w.from) has--; return has===d ? v : 0; };
        const sal = pick(5, w.salaries), sup = pick(15, w.suppliers), tax = pick(25, w.taxes), oth = pick(12, w.leasing) + W.dividendsLog.filter(x=>x.day===d).reduce((s0,x)=>s0+x.net,0) + W.P.capex.filter(x=>x[0]===d).reduce((s0,x)=>s0+x[1],0);
        cash += inn - sal - sup - tax - oth; if (cash < min.cash) min = { cash, d };
        if (inn + sal + sup + tax + oth > 1) rows.push({ d, inn, sal, tax, sup, oth, cash, weekEnd: d===w.to ? w.cash : null });
      } }
    const wk = F13.reduce((m,w)=>w.cash<m.cash?w:m, F13[0]);
    return { rows, min, wk };
  }
  const CLOSE = [['Табель сведён из отметок смен','Кадровик',1],['ФОТ и взносы начислены в 1С (робот по поручению)','Бухгалтер',2],['Акты заказчикам выставлены','Бухгалтер',3],['ЭСФ выписаны по всем актам','Главный бухгалтер',5],['Сверка взаиморасчётов с заказчиками (1210)','Бухгалтер',6],['ГСМ по путевым листам','Механик',4],['Амортизация основных средств','Бухгалтер',6],['НДС рассчитан','Главный бухгалтер',8],['ОСВ закрыта, расхождений 0','Главный бухгалтер',10],['Снимок 23:50 и копия базы','Администратор системы',10],['Форма 200.00 за квартал','Главный бухгалтер',15],['Аванс КПН и налоги','Главный бухгалтер',25]];
  const closeList = at => CLOSE.filter(([t])=>!/200\.00/.test(t) || [1,4,7,10].includes(W.mOf(at)));
  const closeDone = at => { const pm = W.MONTHS[Math.max(0, W.monthIdx(at)-1)], dom = W.dOf(at); return closeList(at).filter(([,,due],k)=>dom > due + (hb(pm.m,k,160)<0.15?2:0)).length; };
  function payments(tab){
    tab = tab || 'req'; const at = RNG.anchor, tabs = [['req','Заявки на оплату'],['cal','Платёжный календарь'],['close','Закрытие месяца']];
    let body = '';
    if (tab==='req'){ const LP = livePays(), R0 = [...LP.slice().reverse(), ...payReqs(at)], inWork = R0.filter(r=>r.st!=='оплачено'), w7 = R0.filter(r=>!['черновик','проверка бухгалтера','оплачено'].includes(r.st) && !/^подпись/.test(r.st) && r.payDay <= at+7).reduce((s2,r)=>s2+r.amount,0), f = W.forecast13(at)[0];
      body = `<div class="tiles">${tile('Оплат мимо заявки', '0', ['за месяц · платёж без утверждённой заявки невозможен'], '')}${tile(`Заявок в работе на ${dt(at)}`, inWork.length, [`на подписи директоров ${inWork.filter(r=>/подпись/.test(r.st)).length} · у бухгалтера ${inWork.filter(r=>r.st==='проверка бухгалтера').length}`], '')}${tile('К оплате за 7 дней', MU(w7), ['по подписанным заявкам'], '')}${tile('Поступления за 7 дней', MU(f ? f.inflow : 0), ['ожидаемые оплаты заказчиков'], '')}</div>
      ${card('Новая заявка на оплату', LIVE.ro || !['П','Б'].includes(roleOf(S.role).rt.finance) ? note(LIVE.ro ? 'У вас только просмотр.' : `Роль «${roleOf(S.role).name}» заявки не создаёт — только смотрит.`) : `<form class="lform" id="payForm"><input id="payTo" maxlength="120" placeholder="Получатель" required><select id="payLine" aria-label="Статья бюджета">${LINES.bdr.slice(1).map(l=>`<option>${l[1]}</option>`).join('')}<option>Покупка ОС и лизинг</option></select><input id="payAmt" inputmode="decimal" placeholder="Сумма, млн ₸" required size="10"><input id="payBasis" maxlength="120" placeholder="Основание: счёт, договор"><button type="submit" class="btn">Создать</button></form><p class="lnote">${liveNote()} · до 10 млн ₸ подписывает исполнительный директор, свыше — генеральный, свыше 50 млн ₸ — ещё и учредитель</p>`)}
      ${card(`Заявки на оплату · ${MONF[W.mOf(at)]} ${W.yOf(at)}`, mod('analytics').fromRows(['№','Дата','Получатель','Статья бюджета','Сумма','Основание','Инициатор','Статус',''], R0.map(r=>[`<b>${r.no}</b>${r.live?' <span class="pill i">новая</span>':''}`, dts(r.day), esc(r.to), r.line, MU(r.amount), esc(r.basis), esc(r.who), r.st==='оплачено' ? '<span class="up">оплачено</span>' : r.st, r.live && r.st!=='оплачено' ? (r.mine && !LIVE.ro ? `<button type="button" class="btn" data-pact="next" data-pid="${r.id}">${r.st==='платёжное поручение в 1С (робот)'?'Отправить в банк':(r.st==='проверка бухгалтера'?'Проверено':'Подписать')}</button> <button type="button" class="btn" data-pact="back" data-pid="${r.id}">Вернуть</button>` : `<small>ждёт: ${(PAY_WHO[r.st]||['—']).join(' / ')}</small>`) : '']), { id:'payments-req', csv:'pay_requests', compact:true, lo:[3,5,6], nosort:[8], kinds:{ 4:'money' }, sums:{ 4:'sum' }, vals:{ 1:(r,k)=>R0[k].day, 4:(r,k)=>R0[k].amount }, meta:k=>({ _kind:'pay', _id:R0[k].live ? 'L'+R0[k].id : R0[k].no, _cls:R0[k].st!=='оплачено' && R0[k].payDay<at ? 'an-warn' : '' }), filters:[{ id:'mine', label:t('an.f.mine'), fn:r=>!!R0[r._k].mine }] }) + stTable('pay_by_status', groupSt(R0.map(r=>({ ...r, overdue: r.st!=='оплачено' && r.payDay<at })), r=>r.st, r=>r.st, r=>at-r.day), 'an.c.avg_age'), 'маршрут: черновик → бухгалтер → исполнительный директор (до 10 млн ₸) / генеральный директор → учредитель (свыше 50 млн ₸) → платёжное поручение в 1С готовит робот → в банк отправляет главный бухгалтер своей ЭЦП')}`; }
    if (tab==='cal'){ const C0 = payCalendar(at);
      body = `<div class="tiles">${tile(`Деньги на ${dt(at)}`, MU(W.balance(at).cash), ['начало календаря'], '')}${tile('Минимум на конец недели', MU(C0.wk.cash), [`неделя с ${dts(C0.wk.from)} · как в кокпите, 13 недель`], C0.wk.cash < 30e6 ? 'var(--warn)' : '')}${tile('Минимум по дням', MU(C0.min.cash), [`${dt(C0.min.d)} · внутри недели`], C0.min.cash < 30e6 ? 'var(--warn)' : '')}${tile('Поступления за 30 дней', MU(C0.rows.reduce((s2,r)=>s2+r.inn,0)), ['по срокам договоров и обычной задержке заказчика'], '')}${tile('Выплаты за 30 дней', MU(C0.rows.reduce((s2,r)=>s2+r.sal+r.tax+r.sup+r.oth,0)), ['зарплата, налоги, поставщики, лизинг и дивиденды'], '')}</div>
      ${card('Платёжный календарь на 30 дней', table(['Дата','Поступления','Зарплата','Налоги','Поставщики','Лизинг, дивиденды, ОС','Остаток'], C0.rows.map(r=>[dt(r.d)+(r.d===C0.min.d?' <span class="pill w">минимум</span>':''), MU(r.inn), MU(r.sal), MU(r.tax), MU(r.sup), MU(r.oth), `<b>${MU(r.cash)}</b>`]), 'compact'), 'по дням с движением · поступления — по срокам актов и обычной задержке заказчика · зарплата 5-го, лизинг 12-го, поставщики 15-го, налоги 25-го (с НДС — во второй месяц после квартала, аванс КПН — каждый месяц) · остаток на конец недели = прогноз кокпита')}`; }
    if (tab==='close'){ const pm = W.MONTHS[Math.max(0, W.monthIdx(at)-1)], dom = W.dOf(at), acts = W.customers.filter(c=>c.objects.some(o=>W.active(o,pm.end))).length, esfMiss = dom < 6 ? 2 : (dom < 9 ? 1 : 0);
      const st = (due, k) => dom > due + (hb(pm.m,k,160)<0.15?2:0) ? '<span class="up">✓ готово</span>' : (dom >= due-2 ? '⏳ в работе' : 'ждёт');
      const doneN = closeDone(at);
      body = `<div class="tiles">${tile(`Закрытие ${MONF[pm.m]}`, `${doneN} / ${closeList(at).length}`, [`пунктов чек-листа на ${dt(at)} · норма — до 10-го`], dom>10 && doneN<10 ? 'var(--warn)' : '')}${tile('Актов за месяц', acts, [`ЭСФ выписано ${acts-esfMiss} из ${acts}`], esfMiss ? 'var(--warn)' : '')}${tile('Сверка ЭСФ ↔ реализация', esfMiss ? `${esfMiss} ${plural(esfMiss,'расхождение','расхождения','расхождений')}` : 'сходится', ['реализация 1С = ЭСФ = форма 300.00'], esfMiss ? 'var(--warn)' : '')}</div>
      ${card(`Чек-лист закрытия: ${MONF[pm.m]} ${pm.y}`, table(['Пункт','Ответственный','Срок','Статус'], closeList(at).map(([t,who,due],k)=>[t + (at < W.LAUNCH_DEMO && /робот/.test(t) ? ' <small>(вручную)</small>' : ''), who, dt(W.idxOf(W.yOf(at), W.mOf(at), Math.min(due,28))), st(due,k)])), 'каждый пункт — задача ответственному; ИИ напоминает за день до срока')}
      ${card('ЭСФ ↔ реализация ↔ форма 300.00', table(['Проверка','1С','ИС ЭСФ','Результат'], [[`Акты ${MONF[pm.m]}`, `${acts} шт.`, `${acts-esfMiss} шт.`, esfMiss ? `<span class="wn">${esfMiss} без ЭСФ — исправительные готовит ИИ, подпись главного бухгалтера</span>` : '<span class="up">сходится</span>'], ['Сумма реализации без НДС', M(W.pl(pm.start,pm.end).revenue), M(W.pl(pm.start,pm.end).revenue*(esfMiss? 0.985 : 1)), esfMiss ? '<span class="wn">разница — в двух актах</span>' : '<span class="up">сходится</span>'], [`НДС ${MONF[pm.m]}`, M(W.taxes(pm.start,pm.end).vat), M(W.taxes(pm.start,pm.end).vat*(esfMiss?0.985:1)), esfMiss ? 'после исправительных ЭСФ' : '<span class="up">сходится</span>'], ['Прошлый квартал: реализация = ЭСФ = 300.00', '—', '—', '<span class="up">сходится</span>']]), U())}`; }
    return h1('Платежи и закрытие месяца', 'по компании · заявки на оплату · платёжный календарь · чек-лист закрытия') + `<div class="tabs">${tabs.map(t=>`<a href="#payments-${t[0]}" class="${t[0]===tab?'on':''}">${t[1]}</a>`).join('')}</div>` + body;
  }

  // ======================= ПОРУЧЕНИЯ ИИ =======================
  function errandsAt(at){
    const out = [], ST = ['выполнено','выполнено','выполнено','выполнено','ждёт подписи человека','в работе','отклонено по правам'];
    let no = 5 * Math.max(0, (Math.max(0, at-6) - W.idxOf(W.yOf(at),0,1)));
    for (let d = Math.max(0, at-6); d <= at; d++) for (let k=0;k<5;k++){ const AR = CAT.aiRoles.filter(x=>x.role!=='Разработчик'), ro = AR[Math.floor(hb(d,k,170)*AR.length)], task = ro.tasks[Math.floor(hb(d,k,171)*ro.tasks.length)], st = d===at && k>2 ? 'в работе' : (hb(d,k,178) < 0.02 ? 'отклонено по правам' : ST[Math.floor(hb(d,k,172)*(ST.length-1))]), c1 = /табел|начисл|акт|ЭСФ|1С/i.test(task);
      const deny = st==='отклонено по правам'; out.push({ no:`П-${W.yOf(at)}-${String(++no).padStart(4,'0')}`, day:d, time:`${String(8+Math.floor(hb(d,k,173)*10)).padStart(2,'0')}:${String(Math.floor(hb(d,k,174)*60)).padStart(2,'0')}`, who: deny ? (hb(d,k,175)<0.5?'Охранник':'Начальник объекта') : ro.role, task: deny ? (hb(d,k,176)<0.5?'Показать зарплату коллег':'Показать данные чужого объекта') : task, step: ro.role==='Администратор системы'?2:1, st, mins: deny ? 0 : 1 + Math.round(hb(d,k,177)*12), file: st==='выполнено' ? (c1 ? 'документ 1С + копия базы' : (/приказ|документ/i.test(task)?'файл .docx в папку роли':'ответ в чат')) : '—', c1: c1 && st==='выполнено' }); }
    return out.reverse();
  }

  // ======================= ЖИВЫЕ ДАННЫЕ: хранилище — live.js (db / сервер / браузер, миграция v1 → v2, файлы) =======================
  const Live = window.Live, LIVE = Live.data;
  Live.configure({ ctx: () => ({ role: S.role || 'Исполнительный директор', day: RNG.anchor }) });
  const liveAdd = (col, obj, opts) => Live.add(col, obj, opts);
  const liveUpdate = (col, id, patch, opts) => Live.update(col, id, patch, opts);
  const liveDecide = (k, v) => Live.decide(k, v);
  const whoOf = r => Live.whoOf(r), tOf = ts => Live.tOf(ts), liveNote = () => Live.note();
  let lcT = 0, lcKinds = new Set();
  // перерисовка после изменения живых записей; черновики всех полей с id в #content и #aip сохраняются
  function liveChanged(kind){
    clearTimeout(lcT); lcKinds.add(kind);
    lcT = setTimeout(()=>{
      const kinds = [...lcKinds]; lcKinds = new Set();
      const els = [...document.querySelectorAll('#content input[id], #content textarea[id], #content select[id], #aip input[id], #aip textarea[id]')].filter(el=>el.type!=='date' && el.type!=='file' && el.type!=='checkbox' && el.type!=='radio');
      const vals = {}; els.forEach(el=>{ vals[el.id] = el.value; });
      const ae = document.activeElement, keep = ae && ae.id && (ae.id in vals) ? { id:ae.id, s:ae.selectionStart } : null;
      if (!document.querySelector('#modal:not([hidden])')) render();
      Object.entries(vals).forEach(([id,v])=>{ const el = document.getElementById(id); if (el && el.value !== v && el.tagName !== 'SELECT') el.value = v; else if (el && el.tagName === 'SELECT' && [...el.options].some(o=>o.value===v)) el.value = v; });
      if (keep){ const el = document.getElementById(keep.id); if (el){ el.focus(); try { el.setSelectionRange(keep.s, keep.s); } catch(_){} } }
      kinds.forEach(k => callHooks('onLiveChange', k, kinds));
    }, 60);
  }
  Live.onChange(liveChanged);

  // кому поручать задачу из раздела, события, чата
  const OWNER_OF = { kokpit:'Исполнительный директор', objects:'Начальник охраны', shifts:'Начальник охраны', incidents:'Начальник охраны', hr:'Кадровик', legal:'Юрист', sales:'Коммерческий директор', finance:'Главный бухгалтер', payments:'Главный бухгалтер', taxes:'Главный бухгалтер', budget:'Исполнительный директор', supply:'Снабженец', fleet:'Механик', quality:'Администратор системы', onec:'Администратор системы', admin:'Администратор системы', docflow:'Исполнительный директор', chats:'Исполнительный директор', tasks:'Исполнительный директор', owner:'Генеральный директор' };
  const CH_OWNER = { lead:'Исполнительный директор', sec:'Начальник охраны', buh:'Главный бухгалтер', fleet:'Механик', it:'Администратор системы', all:'Исполнительный директор', o18:'Начальник объекта' };
  const ownerFromText = t => { const map = [['охран','Начальник охраны'],['юрист','Юрист'],['кадров','Кадровик'],['коммерч','Коммерческий директор'],['механ','Механик'],['администратор','Администратор системы'],['диск','Администратор системы'],['бухгалт','Главный бухгалтер'],['письм','Главный бухгалтер'],['напомн','Начальник охраны']]; const f = map.find(([k])=>t.toLowerCase().includes(k)); return f ? f[1] : 'Исполнительный директор'; };

  // формы и действия «живых» записей — подключаются после каждой отрисовки
  function wireLive(root){
    const of = root.querySelector('#ordForm');
    if (of) of.addEventListener('submit', e=>{ e.preventDefault(); const t = +$('#ordType').value; liveAdd('docs', { kind:'order', t, note: $('#ordNote').value.trim().slice(0,200), stage:1, hist:[{ st:'проект', role:S.role, ts:Date.now() }] }); $('#ordNote').value = ''; });
    root.querySelectorAll('[data-oact]').forEach(b=>b.addEventListener('click', ()=>{ const d = LIVE.docs.find(x=>x.id===b.dataset.oid); if (!d) return; const route = ORD_T[d.t][3], back = b.dataset.oact==='back'; liveUpdate('docs', d.id, { stage: back ? 1 : d.stage + 1, done: !back && d.stage + 1 >= route.length, hist:[...(d.hist||[]), { st: back ? 'возвращён на доработку' : (route[d.stage]==='ознакомление' ? 'ознакомлены' : 'согласовано: ' + route[d.stage]), role:S.role, ts:Date.now() }] }); }));
    const mf = root.querySelector('#memoForm');
    if (mf) mf.addEventListener('submit', e=>{ e.preventDefault(); const subj = $('#memoSubj').value.trim(); if (!subj) return; liveAdd('docs', { kind:'memo', to:$('#memoTo').value, subj: subj.slice(0,200), status:'у адресата' }); $('#memoSubj').value = ''; });
    root.querySelectorAll('[data-mres]').forEach(b=>b.addEventListener('click', ()=>{ const m = LIVE.docs.find(x=>x.id===b.dataset.mres), inp = root.querySelector(`[data-mresin="${b.dataset.mres}"]`), ex = root.querySelector(`[data-mex="${b.dataset.mres}"]`); if (!m || !inp || !inp.value.trim()) return; liveUpdate('docs', m.id, { status:'резолюция → задача', res: inp.value.trim().slice(0,200), exec: ex.value }); liveAdd('tasks', { title:`${m.subj} — ${inp.value.trim()}`.slice(0,160), owner: ex.value, src:'записка', days:3, status:'в работе', pr:'высокий' }); }));
    root.querySelectorAll('[data-mclose]').forEach(b=>b.addEventListener('click', ()=>liveUpdate('docs', b.dataset.mclose, { status:'закрыта' })));
    const pf = root.querySelector('#payForm');
    if (pf) pf.addEventListener('submit', e=>{ e.preventDefault(); const to = $('#payTo').value.trim(), amt = parseFloat(String($('#payAmt').value).replace(',','.')); if (!to || !(amt > 0)) return; liveAdd('pays', { to: to.slice(0,120), line: $('#payLine').value, amount: Math.round(amt*1e6), basis: $('#payBasis').value.trim().slice(0,120) || 'счёт', stage:1 }); $('#payTo').value = ''; $('#payAmt').value = ''; $('#payBasis').value = ''; });
    root.querySelectorAll('[data-pact]').forEach(b=>b.addEventListener('click', ()=>{ const r = LIVE.pays.find(x=>x.id===b.dataset.pid); if (!r) return; const back = b.dataset.pact==='back'; liveUpdate('pays', r.id, { stage: back ? 1 : r.stage + 1, back: back ? (r.back||0) + 1 : r.back||0 }); }));
  }
  const payRoute = amt => ['черновик','проверка бухгалтера', amt > 10e6 ? 'подпись генерального директора' : 'подпись исполнительного директора', ...(amt > 50e6 ? ['учредитель'] : []), 'платёжное поручение в 1С (робот)', 'оплачено'];
  const PAY_WHO = { 'проверка бухгалтера':['Главный бухгалтер','Бухгалтер'], 'подпись исполнительного директора':['Исполнительный директор'], 'подпись генерального директора':['Генеральный директор'], 'учредитель':['Учредитель'], 'платёжное поручение в 1С (робот)':['Главный бухгалтер'] };
  const livePays = () => LIVE.pays.map((r,i)=>{ const route = payRoute(r.amount), st = route[Math.min(route.length-1, r.stage)]; return { no:`ЗО-${W.yOf(RNG.anchor)}-Н${String(i+1).padStart(3,'0')}`, day:r.day ?? RNG.anchor, who:whoOf(r), to:r.to, line:r.line, amount:r.amount, basis:r.basis, st, route, payDay:(r.day ?? RNG.anchor) + 2, live:true, id:r.id, mine:(PAY_WHO[st]||[]).includes(S.role) }; });

  // ======================= ЯДРО ДЛЯ МОДУЛЕЙ: хуки, модальное окно, реестр модулей =======================
  const hooks = { beforeRender:[], afterRender:[], onHash:[], onLiveChange:[], onLang:[] };
  function callHooks(name, ...args){ for (const f of hooks[name] || []){ try { f(...args); } catch(e){ console.error('SUNKAR hook ' + name, e); } } }
  // модуль считается подключённым, когда он зарегистрирован в SUNKAR_MODULES и выставил ready = true
  const mod = name => { const m = (window.SUNKAR_MODULES || []).find(x => x && x.name === name); return m && m.ready ? m : null; };
  // задача из любого места: модуль задач (Tasks.quickCreate) — мини-форма; без модуля — сразу запись
  const quickTask = (obj, opts) => { const T = mod('tasks'); if (T && typeof T.quickCreate === 'function') return T.quickCreate(obj, opts || {}); return liveAdd('tasks', obj); };
  // модальное окно со стеком: open(html|Node, title, { wide, onOpen(body), onClose(), focus }) · close() — шаг назад · close(true) — закрыть всё
  const modal = (() => {
    const box = $('#modal'), ttl = $('#modalTitle'), body = $('#modalBody'), mb = box.querySelector('.mbox'), back = $('#modalBack');
    const stack = []; let lastFocus = null;
    const focusables = () => [...mb.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(el => el.offsetParent !== null);
    function show(e){
      ttl.textContent = e.title || ''; body.innerHTML = '';
      if (e.html && typeof e.html === 'object' && e.html.nodeType) body.appendChild(e.html); else body.innerHTML = e.html || '';
      mb.classList.toggle('wide', !!e.opts.wide); if (back) back.hidden = stack.length < 2;
      box.hidden = false;
      if (typeof e.opts.onOpen === 'function'){ try { e.opts.onOpen(body); } catch(err){ console.error(err); } }
      const f = e.opts.focus && mb.querySelector(e.opts.focus); (f || $('#modalClose')).focus();
    }
    function open(html, title = '', opts = {}){ if (box.hidden){ stack.length = 0; lastFocus = document.activeElement; } stack.push({ html, title, opts }); show(stack[stack.length-1]); return body; }
    function close(all){
      if (box.hidden){ stack.length = 0; return; }
      const e = stack.pop(); if (e && typeof e.opts.onClose === 'function'){ try { e.opts.onClose(); } catch(err){ console.error(err); } }
      if (all){ while (stack.length){ const x = stack.pop(); if (typeof x.opts.onClose === 'function'){ try { x.opts.onClose(); } catch(err){} } } }
      if (stack.length) show(stack[stack.length-1]);
      else { box.hidden = true; body.innerHTML = ''; if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus(); }   // скрытое содержимое не остаётся в странице (смена языка не переводит закрытую карточку)
    }
    $('#modalClose').addEventListener('click', () => close(true));
    if (back) back.addEventListener('click', () => close());
    box.addEventListener('click', e => { if (e.target === box) close(true); });
    document.addEventListener('keydown', e => {
      if (box.hidden) return;
      if (e.key === 'Escape'){ e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key === 'Tab'){ const fs = focusables(); if (!fs.length) return; const a = fs[0], z = fs[fs.length-1]; if (e.shiftKey && document.activeElement === a){ e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z){ e.preventDefault(); a.focus(); } else if (!mb.contains(document.activeElement)){ e.preventDefault(); a.focus(); } }
    }, true);
    return { open, close, get stack(){ return stack.slice(); }, get isOpen(){ return !box.hidden; }, body };
  })();
  // CSS модуля: модуль вставляет свой <style id="css-…"> сам, index.html модулями не правится
  const css = (id, text) => { const key = 'css-' + String(id).replace(/[^\w-]/g, ''); let el = document.getElementById(key); if (!el){ el = document.createElement('style'); el.id = key; (document.head || document.documentElement).appendChild(el); } el.textContent = text; return el; };

  const owner = () => ownerHome(roleOf('Учредитель'));
  const SECTIONS = { owner, docflow, payments, quality, kokpit, objects, shifts, incidents, hr:hrSec, legal, sales, finance, taxes:taxesSec, budget:budgetSec, supply, fleet:fleetSec, onec, admin, dev, docs, knowledge, about, refresh };
  const main = $('#content'), side = $('#side');
  const mq = window.matchMedia('(max-width:860px)');
  function syncSide(){ const hide = mq.matches && !side.classList.contains('open'); side.inert = hide; if (hide) side.setAttribute('aria-hidden','true'); else side.removeAttribute('aria-hidden'); }
  new MutationObserver(syncSide).observe(side, { attributes:true, attributeFilter:['class'] });
  if (mq.addEventListener) mq.addEventListener('change', syncSide);
  // графики строятся под ширину экрана — при заметном изменении ширины перерисовываем
  let lastW = innerWidth, rT = 0; addEventListener('resize', ()=>{ clearTimeout(rT); rT = setTimeout(()=>{ if (Math.abs(innerWidth-lastW) > 60){ lastW = innerWidth; render(); } }, 200); });
  let searchQ = '';
  let lastHash = null;
  function render(){
    aggCache.clear();
    RNG = rangeOf(); save(); syncControls();
    let h = (location.hash||'#kokpit').slice(1), tab = null;
    const rawHash = h;
    if (h.startsWith('admin-')){ tab = h.slice(6); h = 'admin'; }
    if (h === 'kokpit-more'){ tab = 'more'; h = 'kokpit'; }
    if (h.startsWith('budget-')){ tab = h.slice(7); h = 'budget'; }
    for (const pre of ['tasks','docflow','payments','chats','finance','ai','sales','objects']) if (h.startsWith(pre+'-')){ tab = h.slice(pre.length+1); h = pre; }
    if (rawHash !== lastHash){ callHooks('onHash', h, tab, lastHash); lastHash = rawHash; }
    callHooks('beforeRender', h, tab);
    const role = roleOf(S.role);
    const secKey = h==='payments' ? 'finance' : h;
    // модуль может занять вкладку целиком: SUNKAR.sections['finance-eq'] = Capital.render
    let fn = (tab != null && SECTIONS[h+'-'+tab]) || SECTIONS[h] || kokpit;
    if (h==='kokpit-full'){ h = 'kokpit'; if (role.rt.kokpit!=='·' && hasMoney(role)) fn = () => kokpit('main'); else fn = () => noAccess(role,'kokpit'); }
    else if ((h==='kokpit' || !SECTIONS[h]) && role.id!=='ed') fn = () => role.id==='owner' ? ownerHome(role) : roleHome(role);   // у каждой роли свой рабочий стол
    else if (h==='owner' && !['owner','gd','ed'].includes(role.id)) fn = () => noAccess(role, 'owner');
    else if (h!=='owner' && h!=='kokpit' && !canSee(role, secKey) && SECTIONS[h]) fn = () => noAccess(role, secKey);
    const t0 = performance.now();
    chartWs = null; chartK = 0;
    let rbar = role.id!=='ed' ? `<div class="rolebar">${t('role.viewing_as')} <b>${rn(role.name)}</b> · ${t('role.by_rights')} <button type="button" class="lnk" id="roleBack">${t('role.back')}</button></div>` : '';
    // состояние общего журнала: ошибка — красная плашка с «Повторить», только просмотр — синяя (9.4)
    const lban = LIVE.err ? `<div class="banner-bad" role="alert">${esc(LIVE.err)} <button type="button" class="btn-sec" id="liveRetry">${t('ai.e.repeat')}</button></div>` : (LIVE.ro && LIVE.transport === 'db' ? `<div class="banner-info" role="status">${esc(t('live.note.shared_ro'))}</div>` : '');
    rbar += lban;
    main.innerHTML = rbar + (searchQ ? searchResults(searchQ) : '') + fn(tab);
    const svgs = [...main.querySelectorAll('svg.chart')], ws = svgs.map(sv=>Math.round(sv.getBoundingClientRect().width));
    if (svgs.some((sv,k)=>ws[k] > 0 && Math.abs(ws[k] / sv.viewBox.baseVal.width - 1) > 0.12)){ chartWs = ws.map(w=>w > 0 ? Math.max(280, Math.min(1400, w)) : 0); chartK = 0; main.innerHTML = rbar + (searchQ ? searchResults(searchQ) : '') + fn(tab); chartWs = null; }
    $('#calcTime').textContent = t('calc.time', { ms: Math.round(performance.now()-t0) });
    document.querySelectorAll('.nav a[data-s]').forEach(a=>{ const k = a.dataset.s, sk = k==='payments' ? 'finance' : k; a.hidden = k==='owner' ? !['gd','ed'].includes(role.id) : (k==='kokpit' ? false : !canSee(role, sk)); if (k==='kokpit') a.lastChild.textContent = role.id==='ed' ? t('nav.kokpit') : t('nav.desk'); });
    document.querySelectorAll('.nav .grp').forEach(g=>{ let n = g.nextElementSibling, any = false; while (n && !n.classList.contains('grp')){ if (n.tagName==='A' && !n.hidden) any = true; n = n.nextElementSibling; } g.hidden = !any; });
    $('#meName').textContent = rn(role.name); $('#meAv').textContent = role.short; $('#meSub').textContent = t('role.sub', { g: tx(role.grp), s: role.step }); $('#roleSel').value = role.name;
    const lr = $('#liveRetry'); if (lr) lr.addEventListener('click', ()=>location.reload());
    const rb = $('#roleBack'); if (rb) rb.addEventListener('click', ()=>{ S.role = 'Исполнительный директор'; render(); });
    plWire(main);
    main.querySelectorAll('.search tbody tr').forEach(tr=>{ const b = tr.querySelector('[data-card]'); if (b) tr.dataset.card = b.dataset.card; });   // строка поиска открывает найденную запись, а не копию строки (Н3)
    wireCardsAny(main);
    wireLive(main);
    main.querySelectorAll('[data-own]').forEach(b=>b.addEventListener('click',()=>{ liveDecide(b.dataset.own, b.dataset.v); }));
    main.querySelectorAll('[data-chk]').forEach(b=>b.addEventListener('click',function(){ const nc = this.dataset.chk==='off'; this.outerHTML = nc ? '<span class="dl">не подключено</span>' : `<span class="up">OK · ${120 + Math.floor(Math.random()*180)} мс</span>`; }, { once:true }));
    document.querySelectorAll('.nav a').forEach(a=>{ const on = a.dataset.s===h; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
    main.querySelectorAll('.tabs a.on').forEach(a=>a.setAttribute('aria-current','page'));
    $('.foot').hidden = false;   // футер — на всех разделах (9.1.20)
    $('#calcTime').hidden = h !== 'dev';
    syncSide();
    main.querySelectorAll('button.mk').forEach(b=>b.addEventListener('click',function(){ if (this.classList.contains('done')){ if (this.dataset.to) location.hash = '#'+this.dataset.to; return; } const w = this.closest('div') && this.closest('div').querySelector('.what'); Promise.resolve(quickTask({ title: (w ? w.firstChild.textContent : this.textContent).trim().slice(0,160), owner: ownerFromText(this.textContent), src:'сигнал', days:1, status:'в работе', pr:'срочно', link:{ kind:'section', h } })).then(r=>{ if (r){ this.textContent='Задача создана · открыть'; this.classList.add('done'); } }); }));
    main.querySelectorAll('[data-go]').forEach(el=>{ const f=()=>{ location.hash='#'+el.dataset.go; }; el.addEventListener('click',f); el.addEventListener('keydown',e=>{ if(e.key==='Enter') f(); }); });
    main.querySelectorAll('button[data-region]').forEach(b=>b.addEventListener('click',()=>{ S.region=b.dataset.region; if (location.hash==='#objects') render(); else location.hash='#objects'; }));
    main.querySelectorAll('button.lnk[data-ai]').forEach(b=>b.addEventListener('click',()=>{ openAI(); ask(b.dataset.ai, { src:'section', section:h }); }));
    const DRV_LIM = { posts:[-30,60], tariff24:[-10,40], tariffDay:[-10,40], salary:[0,40], admin:[-30,50], opex:[-10,40], dso:[5,120], collect:[50,100], cars:[0,20], carPrice:[3,30], dividends:[0,3000] };
    main.querySelectorAll('input[data-drv]').forEach(inp=>inp.addEventListener('change',()=>{ const v = parseFloat(inp.value.replace(',','.')), k = inp.dataset.drv, lim = DRV_LIM[k]||[-1e9,1e9]; if (isFinite(v)) { S.drv[k] = Math.max(lim[0], Math.min(lim[1], v)); } render(); }));
    const dr = $('#drvReset'); if (dr) dr.addEventListener('click', ()=>{ S.drv = { ...DRV_DEF }; render(); });
    const rf = $('#rfNow'); if (rf) rf.addEventListener('click', refreshNow);
    main.querySelectorAll('button[data-appr]').forEach(b=>b.addEventListener('click',()=>{ S.appr[b.dataset.appr] = (S.appr[b.dataset.appr]||0)+1; render(); }));
    main.querySelectorAll('select[data-chain]').forEach(el=>el.addEventListener('change',()=>{ if (el.dataset.chain==='k'){ S.chainK = el.value; S.chainId = null; } else S.chainId = el.value; save(); render(); }));
    const cs = $('#clearSearch'); if (cs) cs.addEventListener('click', ()=>{ searchQ=''; $('#q').value=''; render(); });
    callHooks('afterRender', main, h, tab);
    if (h==='finance' && tab==='eq'){ const tb = main.querySelector('.tabs'); if (tb) tb.outerHTML = finTabs('eq'); }
    twHints(main);
  }
  // таблица шире экрана — значок «→» в правом верхнем углу, пока есть что листать (9.4)
  function twHints(root){
    root.querySelectorAll('.tw').forEach(tw=>{
      const box = tw.parentElement; if (!box) return;
      const upd = () => { const over = tw.scrollWidth - tw.clientWidth > 4; box.classList.toggle('twbox', true); box.classList.toggle('sx', over); box.classList.toggle('end', over && tw.scrollLeft + tw.clientWidth >= tw.scrollWidth - 4); const hn = box.querySelector(':scope>.twh'); if (hn) hn.style.top = tw.offsetTop + 'px'; };
      if (!box.querySelector(':scope>.twh')){ const hnt = document.createElement('span'); hnt.className = 'twh'; hnt.setAttribute('aria-hidden','true'); hnt.textContent = '→'; box.insertBefore(hnt, tw); }
      if (!tw.dataset.twh){ tw.dataset.twh = '1'; tw.addEventListener('scroll', upd, { passive:true }); }
      upd();
    });
  }
  // подсказка графика при наведении и касании: один плавающий элемент на страницу (9.4)
  (function chartTips(){
    let tip = null;
    const hide = () => { if (tip) tip.hidden = true; };
    const show = (el, x, y) => { if (!tip){ tip = document.createElement('div'); tip.className = 'ctip'; tip.setAttribute('role','tooltip'); document.body.appendChild(tip); } tip.textContent = el.getAttribute('data-tip'); tip.hidden = false; tip.style.left = Math.max(60, Math.min(innerWidth-60, x)) + 'px'; tip.style.top = Math.max(28, y) + 'px'; };
    document.addEventListener('pointerover', e => { const el = e.target.closest && e.target.closest('svg.chart [data-tip]'); if (!el){ hide(); return; } const r = el.getBoundingClientRect(); show(el, r.left + r.width/2, r.top); });
    document.addEventListener('scroll', hide, { passive:true, capture:true });
  })();
  // группы бокового меню сворачиваются; состояние — в браузере (9.4)
  (function navGroups(){
    let col = {}; try { col = JSON.parse(localStorage.getItem('sunkar-navcol') || '{}') || {}; } catch(e){}
    const apply = g => { const c = !!col[g.dataset.i18n]; g.classList.toggle('col', c); g.setAttribute('aria-expanded', String(!c)); let n = g.nextElementSibling; while (n && !n.classList.contains('grp')){ if (n.tagName === 'A') n.classList.toggle('gcol', c); n = n.nextElementSibling; } };
    document.querySelectorAll('.nav .grp').forEach(g => { g.tabIndex = 0; g.setAttribute('role','button'); apply(g);
      const tg = () => { const k = g.dataset.i18n; col[k] = !col[k]; try { localStorage.setItem('sunkar-navcol', JSON.stringify(col)); } catch(e){} apply(g); };
      g.addEventListener('click', tg); g.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' '){ e.preventDefault(); tg(); } }); });
  })();
  function syncControls(){
    $('#asOf').value = W.iso(S.period==='custom' ? RNG.to : S.asOf);
    $('#asOf').disabled = S.period==='custom';
    $('#custom').hidden = S.period!=='custom';
    $('#from').value = W.iso(S.from); $('#to').value = W.iso(S.to);
    const rngShort = r => { const y0 = W.yOf(r.from), y1 = W.yOf(r.to), yy = y1 !== W.yOf(W.FACT_END) ? '.' + y1 : ''; return y0 !== y1 ? `${dt(r.from)} – ${dt(r.to)}` : (r.from===r.to ? dts(r.to) : `${dts(r.from)} – ${dts(r.to)}`) + yy; };
    document.querySelectorAll('#perMenu button[data-p]').forEach(b=>{
      const k = b.dataset.p, on = k===S.period, okP = periodOk(k, (k==='day'||k==='yday') ? W.FACT_END : S.asOf);
      b.classList.toggle('on', on); b.setAttribute('aria-checked', on); b.disabled = !okP;
      const r = k==='custom' ? (S.period==='custom' ? RNG : null) : (okP ? rangeOf({ ...S, period:k, asOf: (k==='day'||k==='yday') ? W.FACT_END : (S.period==='custom' && OTHER.some(([o])=>o===k) ? S.to : S.asOf) }) : null);
      b.querySelector('small').textContent = !okP ? I18N.t('per.nodata') : (k==='custom' && !r ? I18N.t('per.pick') : rngShort(r));
    });
    $('#perCur').textContent = PNAME[S.period] || I18N.t('top.period');
    $('#perHint').textContent = S.period!=='custom' && S.asOf!==W.FACT_END ? I18N.t('per.from_asof', { d: dt(S.asOf) }) : I18N.t('per.from_today');
    document.querySelectorAll('#curSeg button').forEach(b=>b.classList.toggle('on', b.dataset.c===S.cur));
    $('#region').value = S.region; $('#otype').value = S.type;
    const st0 = stepOf();
    $('#dayNext').disabled = S.period==='custom' ? RNG.to >= W.FACT_END : S.asOf >= W.FACT_END; $('#dayPrev').disabled = S.period==='custom' ? S.from <= 0 : (shiftAnchor(-1) < 0 || !periodOk(S.period, shiftAnchor(-1)));
    const pv = I18N.t('top.prev', { s: st0 }), nx = I18N.t('top.next', { s: st0 });
    $('#dayPrev').setAttribute('aria-label', pv); $('#dayNext').setAttribute('aria-label', nx); $('#dayPrev').title = pv; $('#dayNext').title = nx;
    const yearTo = W.yOf(RNG.to);
    const days = `${RNG.len} ${I18N.plural(RNG.len,'u.day')}`, sep = I18N.lang==='en' ? ', ' : '.';
    const rlShort = `<b>${RNG.label}</b> · ${RNG.from===RNG.to ? dt(RNG.to) : `${dts(RNG.from)}${W.yOf(RNG.from)!==yearTo?sep+W.yOf(RNG.from):''}–${dt(RNG.to)}`} · ${days}`;
    $('#rangeLine').innerHTML = `<span class="rl-full"><b>${RNG.label}:</b> ${periodTxt()} · ${I18N.t('rl.data_to', { d: dt(RNG.to) })}${RNG.to===W.FACT_END?' '+I18N.t('rl.today'):''}${S.period!=='custom' && RNG.anchor!==W.FACT_END ? ` · ${I18N.t('rl.from_anchor', { d: dt(RNG.anchor) })}` : ''} · ${days}` + (RNG.prev?` · ${I18N.t('rl.prev', { a: dt(RNG.prev.from), b: dt(RNG.prev.to) })}`:'') + (RNG.yago?` · ${I18N.t('rl.yago', { a: dt(RNG.yago.from), b: dt(RNG.yago.to) })}`:(S.period==='ytd'||S.period==='pyear'?'':' · '+I18N.t('rl.yago_none'))) + `</span><span class="rl-short">${rlShort}</span>`;
    const atToday = (S.period==='custom' ? RNG.to : S.asOf) === W.FACT_END;
    $('#today').hidden = atToday;
    $('#asOfTxt').textContent = dLong(S.period==='custom' ? RNG.to : S.asOf);
    $('#fromTxt').textContent = dLong(S.from); $('#toTxt').textContent = dLong(S.to);
    const AT = RNG.anchor, oc = W.onec(AT);
    $('#notice').innerHTML = oc.exportRejected ? `${I18N.t('notice.export', { d: dt(AT), ok: oc.exportsOk, all: oc.exportsTotal })} <a href="#onec">${I18N.t('notice.more')}</a>` : (!oc.effectorOk ? `${I18N.t('notice.backup', { d: dt(AT) })} <a href="#onec">${I18N.t('notice.more')}</a>` : '');
    { const rl0 = roleOf(S.role); if (rl0.rt.onec==='·' && rl0.rt.quality==='·') $('#notice').innerHTML = ''; }   // сбои 1С видят только роли с доступом к серверу и данным
    $('#notice').hidden = !$('#notice').innerHTML;
    $('#resetF').hidden = !(isFiltered() || searchQ || S.period !== DEF.period || S.asOf !== W.FACT_END || S.cur !== DEF.cur);
    const hh = (location.hash||'#kokpit').slice(1); $('#src').textContent = ['kokpit','tasks','onec','quality','ai'].includes(hh) || hh.startsWith('admin') ? I18N.t('src.signals', { d: dt(AT) }) : I18N.t('src.balances', { d: dt(RNG.to) });
    $('[data-s="tasks"] .st').textContent = W.tasksAt(AT).length;
    const miss = W.objects.filter(o=>W.active(o,AT)).reduce((s,o)=>s+W.sumO(o,'missed',AT,AT),0);
    const st1 = $('[data-s="onec"] .st'); st1.hidden = oc.effectorOk && !oc.exportRejected; $('[data-s="onec"]').title = oc.exportRejected ? I18N.t('onec.rejected') : (!oc.effectorOk ? I18N.t('onec.backup') : '');
    const st = $('[data-s="shifts"] .st'); st.textContent = miss; st.hidden = !miss;
  }
  // контролы
  const pbtn = ([k,n]) => `<button type="button" role="menuitemradio" aria-checked="false" data-p="${k}"><span>${n}</span><small></small></button>`;
  const buildPerMenu = () => { $('#perMenu').innerHTML = `<div class="pmh">${t('per.quick')} <small id="perHint"></small></div><div class="pmg">${QUICK.map(pbtn).join('')}</div><div class="pmh">${t('per.other')}</div><div class="pmg">${OTHER.map(pbtn).join('')}</div>`; };
  buildPerMenu();
  const perMenu = $('#perMenu'), perBtn = $('#perBtn');
  const perOpen = v => { perMenu.hidden = !v; perBtn.setAttribute('aria-expanded', v); if (v){ const f = perMenu.querySelector('button.on') || perMenu.querySelector('button:not(:disabled)'); if (f) f.focus(); } };
  perBtn.addEventListener('click', e=>{ e.stopPropagation(); perOpen(perMenu.hidden); });
  document.addEventListener('click', e=>{ if (!perMenu.hidden && !e.target.closest('#perDD')) perOpen(false); });
  document.addEventListener('keydown', e=>{ if (e.key==='Escape' && !perMenu.hidden){ perOpen(false); perBtn.focus(); } });
  perMenu.addEventListener('keydown', e=>{ if (!['ArrowDown','ArrowUp'].includes(e.key)) return; e.preventDefault(); const bs = [...perMenu.querySelectorAll('button:not(:disabled)')], i = bs.indexOf(document.activeElement); const n = bs[(i + (e.key==='ArrowDown'?1:-1) + bs.length) % bs.length]; if (n) n.focus(); });
  function setPeriod(p){
    if (!p || !PNAME[p]) return;
    if (p==='custom' && S.period!=='custom'){ const r = RNG; S.to = r.to; S.from = r.from===r.to ? clampDay(r.to-29) : r.from; }
    if (p!=='custom' && S.period==='custom' && OTHER.some(([k])=>k===p)) S.asOf = S.to;
    if (p==='day' || p==='yday') S.asOf = W.FACT_END;
    S.period = p; render();
  }
  perMenu.addEventListener('click', e=>{ const b=e.target.closest('button[data-p]'); if(!b || b.disabled) return; perOpen(false); setPeriod(b.dataset.p); if (b.dataset.p==='custom') $('#from').focus(); else perBtn.focus(); });
  // шаг кнопок ‹ › — по смыслу среза: прошлые неделя, месяц, год листаются целиком
  const STEP = { pweek:['week',7,'week'], pmonth:['month',1,'month'], pyear:['year',1,'year'] };
  const stepOf = () => I18N.t('step.' + (S.period==='custom' ? 'day' : (STEP[S.period] ? STEP[S.period][2] : 'day')));
  function shiftAnchor(dir){
    const a = S.asOf, st = STEP[S.period];
    if (!st) return a + dir;
    if (st[0]==='week') return a + 7*dir;
    const y = W.yOf(a), m = W.mOf(a), d = W.dOf(a);
    const ty = st[0]==='year' ? y+dir : y, tm = st[0]==='month' ? m+dir : m;
    const first = W.idxOf(ty, tm, 1), dim = W.idxOf(ty, tm+1, 1) - first;
    return first + Math.min(d, dim) - 1;
  }
  $('#curSeg').addEventListener('click', e=>{ const b=e.target.closest('button'); if(!b) return; S.cur=b.dataset.c; render(); });
  const setDate = (id, key) => $(id).addEventListener('change', e=>{ if (!e.target.value) return; S[key] = clampDay(W.fromIso(e.target.value)); if (key==='from' && S.from > S.to) S.to = S.from; if (key==='to' && S.to < S.from) S.from = S.to; render(); });
  setDate('#asOf','asOf'); setDate('#from','from'); setDate('#to','to');
  ['#asOf','#from','#to'].forEach(id=>$(id).addEventListener('click', e=>{ try { e.target.showPicker(); } catch(_){} }));
  ['#asOf','#from','#to'].forEach(id=>{ $(id).min = W.iso(0); $(id).max = W.iso(W.FACT_END); });
  $('#dayPrev').addEventListener('click', ()=>{ if (S.period==='custom'){ if (S.from>0){ S.from--; S.to--; } } else { const n = shiftAnchor(-1); if (n >= 0 && periodOk(S.period, n)) S.asOf = clampDay(n); } render(); });
  $('#dayNext').addEventListener('click', ()=>{ if (S.period==='custom'){ if (S.to<W.FACT_END){ S.from++; S.to++; } } else S.asOf = clampDay(shiftAnchor(1)); render(); });
  $('#today').addEventListener('click', ()=>{ S.asOf = W.FACT_END; S.to = W.FACT_END; if (S.period==='custom') S.from = clampDay(W.FACT_END-29); render(); });
  const buildRegions = () => { $('#region').innerHTML = `<option value="all">${t('top.all_regions')}</option>` + W.REGIONS.map(r=>`<option value="${esc(r.r)}">${esc(tx(r.r))}</option>`).join(''); };
  buildRegions();
  $('#region').addEventListener('change', e=>{ S.region=e.target.value; render(); });
  const buildRoleSel = () => { $('#roleSel').innerHTML = [...new Set(ROLES.map(r=>r.grp))].map(g=>`<optgroup label="${esc(tx(g))}">${ROLES.filter(r=>r.grp===g).map(r=>`<option value="${esc(r.name)}">${esc(t('role.'+r.id))}</option>`).join('')}</optgroup>`).join(''); };
  buildRoleSel();
  $('#roleSel').addEventListener('change', e=>{ S.role = e.target.value; location.hash = '#kokpit'; render(); });
  $('#otype').addEventListener('change', e=>{ S.type=e.target.value; render(); });
  $('#resetF').addEventListener('click', ()=>{ const drv = S.drv, appr = S.appr, role = S.role, own = S.own; S = { ...DEF, drv, appr, role, own }; searchQ=''; $('#q').value=''; render(); });
  $('#calcBtn').addEventListener('click', ()=>modal.open((I18N.lang === 'ru' ? ABOUT_CALC : '') + calcMethod() + `<h3>${t('pl.calc_h')}</h3><p class="ul">${esc(t('pl.calc'))}</p>`, t('calc.title')));
  $('#burger').addEventListener('click', ()=>side.classList.toggle('open'));
  $('#fBtn').addEventListener('click', e=>{ const m=$('.main'); m.classList.toggle('showf'); e.currentTarget.setAttribute('aria-expanded', m.classList.contains('showf')); });
  side.addEventListener('click', e=>{ if (e.target.closest('a') || e.target.closest('#sideClose')) side.classList.remove('open'); });
  document.addEventListener('click', e=>{ if (side.classList.contains('open') && !side.contains(e.target) && !e.target.closest('#burger')) side.classList.remove('open'); });
  $('#q').addEventListener('keydown', e=>{ if (e.key==='Enter'){ e.preventDefault(); searchQ = e.target.value; render(); } if (e.key==='Escape'){ e.target.value=''; searchQ=''; render(); } });
  window.addEventListener('hashchange', ()=>{ window.scrollTo(0,0); render(); });

  // ---------- «Два клика до документа»: карточка по нажатию на строку, плитку, задачу, проект ----------
  const SEC_NAME = h => { const a = document.querySelector(`.nav a[data-s="${h.split('-')[0]}"]`); if (!a) return ''; return [...a.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim(); };
  // карточки — только модуль cards.js (Cards.openCard / Cards.wire): ядро вызывает его после каждой отрисовки, своего пути нет
  const wireCardsAny = root => { const C = mod('cards'); if (C && typeof C.wire === 'function') C.wire(root); };
  const openCard = (...a) => { const C = mod('cards'); return C && typeof C.openCard === 'function' ? C.openCard(...a) : null; };
  // ИИ-помощник — модуль ai.js (панель, вкладки, поручения, регламенты, журнал, отчёты, голос и файлы): ядро только передаёт вызовы
  function openAI(opts){ const A = mod('ai'); if (A && typeof A.open === 'function') return A.open(opts); }
  function ask(q, opts){ const A = mod('ai'); if (q && A && typeof A.ask === 'function') return A.ask(q, opts); }
  $('#aiBtn').addEventListener('click', ()=>openAI()); $('#aiTop').addEventListener('click', ()=>openAI());
  const hasMoney = rl0 => rl0.rt.finance!=='·' || ['П','Б'].includes(rl0.rt.sales);   // деньги компании: финансы или продажи на уровне блока


  // ---------- язык и тема ----------
  I18N.on(() => { refillNames(); relabelPeriods(); buildPerMenu(); buildRegions(); buildRoleSel(); callHooks('onLang', I18N.lang); render(); });
  const THEME_KEY = 'sunkar-theme';
  const setTheme = v => { if (v === 'light' || v === 'dark') document.documentElement.dataset.theme = v; else delete document.documentElement.dataset.theme; try { localStorage.setItem(THEME_KEY, v || 'auto'); } catch(e){} const ts = $('#themeSel'); if (ts) ts.value = v || 'auto'; };
  (() => { let v = 'auto'; try { v = localStorage.getItem(THEME_KEY) || 'auto'; } catch(e){} setTheme(v); const ts = $('#themeSel'); if (ts) ts.addEventListener('change', e => setTheme(e.target.value)); })();

  // ======================= window.SUNKAR — единственная точка доступа модулей к ядру =======================
  // Модуль (analytics.js, cards.js, collab-tasks.js, collab-chat.js, ai.js, capital.js) — IIFE со 'use strict', который
  // регистрирует себя до app.js:  (window.SUNKAR_MODULES = window.SUNKAR_MODULES || []).push(M)
  // где M = { name:'tasks', ready:true|false, init(K){…}, …API модуля… }. Ядро вызывает M.init(SUNKAR) один раз до первой отрисовки.
  // В init модуль: K.sections['tasks'] = fn(tab) → HTML  (вкладка целиком: K.sections['finance-eq'] = …);
  //               K.hooks.afterRender.push((main, h, tab) => …)  · beforeRender(h, tab) · onHash(h, tab, prev) · onLiveChange(kind) · onLang(lang);
  //               K.ui.css('tasks', '.tk-…{…}')  — свои стили только через токены :root (index.html модулем не правится);
  //               I18N.add('ru'|'en', {…}) — свой словарь в своём файле (i18n.js модулем не правится).
  // Делегирование: ready-модуль 'ai' с open()/ask()/close() забирает панель помощника; 'tasks' с quickCreate(obj) — «Создать задачу»
  // из событий, чата и карточек; 'cards' с wire(root) — карточки по нажатию на строки и плитки. Без модуля работает встроенный код ядра.
  // Данные — только через K.data / K.roles / K.fmt; живые записи — window.Live (live.js), файлы — window.FileStore.
  const SUNKAR = window.SUNKAR = {
    get S(){ return S; }, set(patch){ Object.assign(S, patch || {}); save(); }, render, rangeOf, get RNG(){ return RNG; }, W, CAT,
    fmt: { F, N, P, M, MU, T, U, dt, dts, dLong, plural, nw, esc, neg, conv, rn, tOf, whoOf, periodTxt, win, MON, MONF, WD },
    ui: { $, tile, card, table, h1, note, go, bars, lines, donut, hbar, spark, CW, CATC, stateStripe, css, noAccess, openCard, wireCards: wireCardsAny, openAI, ask, quickTask, SEC_NAME, numRe },
    roles: { ROLES, BLK, LVL, roleOf, canSee, hasMoney, SC, scopeOk, objFilter, custFilter, filtered, filterLabel, isFiltered, isScoped, roleCtx, OWNER_OF, CH_OWNER, CH_OF, ownerFromText, MYOBJ, REGW },
    data: { revVat, divCap, pendingPays, LAW, LAW_EMP, LAW_DIV, rateCheck, plTree, plNode, plData, plCsv, plName, adminSplit, objAgg, activeIn, lossObjects, lossNote, dueParts, revenueOf, ebitdaOf, delta, deltaLine, months12, incIn, chkIn, sumDocs, docflowAt, projectsAt, payReqs, livePays, payRoute, PAY_WHO, errandsAt, chatsAt, myChats, ownerQueue, DECISIONS, ORD_T, MEMO_T, PAY_T, CLOSE, closeList, closeDone, planOf, LINES, sumLines, ecpAt, connRegistry, roleKpi, ROUTINE, fiveYears, nextDay, nextMonday, runRate, hb },
    sections: SECTIONS,
    hooks,
    modal,
    live: Live, i18n: I18N,
    module: mod,
    version: '0.8.4'
  };
  const MODS = window.SUNKAR_MODULES = window.SUNKAR_MODULES || [];
  const initModule = m => { if (!m || m._inited) return; m._inited = true; if (typeof m.init === 'function'){ try { m.init(SUNKAR); } catch(e){ console.error('SUNKAR module ' + m.name, e); } } };
  MODS.forEach(initModule);
  MODS.push = function(...ms){ const n = Array.prototype.push.apply(this, ms); ms.forEach(initModule); render(); return n; };   // модуль, подключённый позже ядра

  render();
  // ---------- Сервер Агентства и сайт: проверка каждые 10 минут, новая версия открывается сама ----------
  (function liveSite(){
    const srv = window.SUNKAR_SERVER, site = window.SUNKAR_SITE;
    if (!srv && !site) return;                                   // опубликованная страница и файл с диска — без этого
    const el = $('#srvStat'), mine = (srv || site).build;
    const hm = iso => { const d = new Date(iso); return isNaN(d) ? '—' : I18N.time(d); };
    // не перезагружать и не перерисовывать, пока человек что-то пишет или открыта карточка
    const busy = () => { const a = document.activeElement; return !$('#modal').hidden || !!(a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.value && a.type !== 'date'); };
    let lastCycle = null;
    const newBuild = b => {
      if (!b || !mine || b === mine) return false;
      if (busy()){ el.textContent = t('srv.new_wait'); return true; }
      el.textContent = t('srv.new_go'); setTimeout(() => location.reload(), 1500); return true;
    };
    async function poll(){
      try {
        if (srv){
          const h = await (await fetch('api/health', { cache:'no-store' })).json();
          if (newBuild(h.build)) return;
          if (lastCycle && h.lastCycleAt !== lastCycle && !busy()) render();
          lastCycle = h.lastCycleAt;
          el.textContent = t('srv.ok', { a: hm(h.lastCycleAt), b: hm(h.nextCycleAt), f: h.lastStatus === 'FAIL' ? t('srv.partial') : '', v: h.version, bd: h.build });
        } else {
          const v = await (await fetch('version.json', { cache:'no-store' })).json();
          if (newBuild(v.build)) return;
          el.textContent = t('srv.site', { d: dt(new Date(v.at)), t: hm(v.at) });
        }
      } catch(e){ el.textContent = t('srv.offline'); }
    }
    poll(); setInterval(poll, srv ? 60000 : 600000);
  })();

})();
