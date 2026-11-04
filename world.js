// SUNKAR BI — демонстрационный «мир» ТОО «SUNKAR SECURITY SERVICES» по дням, 01.01.2022–31.12.2026 (5 лет), с вариантами развития.
// Всё вымышлено, но считается честно:
//  • каждая операция — проводка двойной записи, поэтому баланс сходится на ЛЮБУЮ дату;
//  • ОПиУ, ДДС, баланс, налоги, дебиторка — из одной книги проводок за любой период;
//  • до демо-даты запуска SUNKAR BI (01.01.2025) история одинакова во всех вариантах; после — расходится по варианту.
// История компании: до 2025 года рентабельность снижается, с 2025 года — рост (порядок в сменах, дебиторке, тарифах, переработках).
// Факт — по 02.11.2026 (дата «сегодня» демо), дальше — прогноз по договорам. Даты в UTC.
(function(){
  'use strict';
  const SCENARIOS = {
    none: { name:'Без системы', k:0,   launchShift:0,  conv:0.42, churn:0.11, arTrend:0.18 },
    pess: { name:'Пессимистичный', k:0.5, launchShift:120, conv:0.62, churn:0.06, arTrend:0 },
    base: { name:'Базовый', k:1,   launchShift:0,  conv:0.80, churn:0.035, arTrend:0 },
    opt:  { name:'Оптимистичный', k:1.3, launchShift:0,  conv:0.95, churn:0.02, arTrend:0 },
  };

  function build(scnKey){
    const SC = SCENARIOS[scnKey] || SCENARIOS.base;
    // ---------- календарь ----------
    const Y0 = 2022, NY = 5;
    const DAY0 = Date.UTC(Y0,0,1);
    const DAYS = Math.round((Date.UTC(Y0+NY,0,1) - DAY0)/864e5);          // 1826
    const toDate = i => new Date(DAY0 + i*864e5);
    const idxOf = (y,m,d) => Math.round((Date.UTC(y,m,d) - DAY0)/864e5);
    const FACT_END = idxOf(2026,10,2);
    const LAUNCH_DEMO = idxOf(2025,0,1);
    const LAUNCH = LAUNCH_DEMO + SC.launchShift;                              // фактический старт работы системы по варианту
    const YMD = Array.from({length:DAYS}, (_,i) => { const d = toDate(i); return [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()]; });   // кэш дат (скорость)
    const YR = Int16Array.from(YMD, x => x[0]), MO = Int8Array.from(YMD, x => x[1]), DA = Int8Array.from(YMD, x => x[2]);
    const inR = i => i >= 0 && i < DAYS && i === (i|0);
    const yOf = i => inR(i) ? YR[i] : toDate(i).getUTCFullYear(), mOf = i => inR(i) ? MO[i] : toDate(i).getUTCMonth(), dOf = i => inR(i) ? DA[i] : toDate(i).getUTCDate();
    const monthIdx = i => (yOf(i)-Y0)*12 + mOf(i);
    const MONTHS = [];
    for (let k=0;k<NY*12;k++){ const y=Y0+Math.floor(k/12), m=k%12; const start=idxOf(y,m,1), end=idxOf(y,m+1,1)-1; MONTHS.push({ y, m, start, end, dim:end-start+1 }); }
    const fmt = i => { const d=toDate(i); return String(d.getUTCDate()).padStart(2,'0')+'.'+String(d.getUTCMonth()+1).padStart(2,'0')+'.'+d.getUTCFullYear(); };
    const fmtShort = i => fmt(i).slice(0,5);
    const iso = i => toDate(i).toISOString().slice(0,10);
    const fromIso = s => { const [y,m,d] = s.split('-').map(Number); return idxOf(y,m-1,d); };
    // эффект системы: 0 до старта, плавно до полного за 90 дней
    const eff = i => SC.k === 0 || i < LAUNCH ? 0 : SC.k * Math.min(1, (i - LAUNCH)/90);

    // ---------- случай (детерминированно) ----------
    function h(){ let x = 2166136261 >>> 0; for (let k=0;k<arguments.length;k++){ x ^= (arguments[k]*2654435761)>>>0; x = Math.imul(x ^ (x>>>15), 2246822519)>>>0; x = Math.imul(x ^ (x>>>13), 3266489917)>>>0; x ^= x>>>16; } return (x>>>0)/4294967296; }
    const pickW = (r, items) => { let s=0; for (const [w,v] of items){ s+=w; if (r < s) return v; } return items[items.length-1][1]; };

    // ---------- ставки по годам (по закону РК; подтверждает бухгалтер) ----------
    // ИПН 10 % (ст. 320 НК РК; с 2026 — НК РК 2026: 10 % до 8 500 МРП годового дохода, 15 % сверх — в штате никто не достигает, максимальный оклад × 12 < 8 500 МРП);
    // облагаемый доход = доход − ОПВ − ВОСМС − стандартный вычет: 2022–2025 — 14 МРП в месяц (ст. 346 НК РК), с 2026 — базовый вычет 30 МРП в месяц, не более 360 МРП в год (НК РК 2026);
    // ОПВ 10 % (Закон о пенсионном обеспечении); ВОСМС 2 % (Закон об ОСМС; база ≤ 10 МЗП, с 2026 — ≤ 20 МЗП); СО 3,5 % → 5 % с 2025 (ст. 244 Социального кодекса), база — доход − ОПВ, 1–7 МЗП (ст. 243);
    // ООСМС 3 % с 2022 (ст. 27 Закона об ОСМС; база ≤ 10 МЗП, с 2026 — ≤ 40 МЗП); ОПВР 1,5 % (2024) → 2,5 % (2025) → 3,5 % (2026), ст. 251 Социального кодекса, только за родившихся после 01.01.1975 (≤ 50 МЗП) —
    // в модели доля таких работников в ФОТ — P_OPVR_SHARE (допущение по штату, подтверждает кадровик);
    // СН: 2022–2024 — 9,5 %, 2025 — 11 % (ст. 484–486 НК РК), база — доход − ОПВ − ВОСМС, к уплате СН − СО; 2026 — 6 % без уменьшения на СО (НК РК 2026);
    // НДС 12 % → 16 % с 2026 (НК РК 2026), период — квартал; КПН 20 %;
    // ИПН с дивидендов у источника — нарастающим итогом за календарный год: 2022 — 5 % (ст. 320 п. 2; освобождение при владении долей > 3 лет — не применяется, учредитель владеет долей < 3 лет — допущение демо);
    // 2023–2025 — 10 % с суммы сверх 30 000 МРП за год (ст. 341 п. 1 пп. 8, ст. 320 п. 2); 2026 — 5 % до 230 000 МРП за год, 15 % сверх (НК РК 2026).
    // soBase / snBase — доля оклада в базе (1 − ОПВ и 1 − ОПВ − ВОСМС); snNet — СН уменьшается на СО (до 2026); vosmsCap/oosmsCap/opvCap/soMax — пределы баз в МЗП (оклады модели ниже пределов).
    const P_OPVR_SHARE = 0.78;      // доля ФОТ работников, родившихся после 01.01.1975 (за них ОПВР); 22 % штата — старше (демо-допущение)
    const RATES = {
      2022: { ipn:0.10, opv:0.10, vosms:0.02, so:0.035, oosms:0.03, opvr:0,     sn:0.095, snNet:true,  vat:0.12, cit:0.20, mrp:3063, mzp:60000, dedMrp:14, divTax:0.05, divFree:0,     divCap:0,      divTop:0.05, vosmsCap:10, oosmsCap:10 },
      2023: { ipn:0.10, opv:0.10, vosms:0.02, so:0.035, oosms:0.03, opvr:0,     sn:0.095, snNet:true,  vat:0.12, cit:0.20, mrp:3450, mzp:70000, dedMrp:14, divTax:0.10, divFree:30000, divCap:0,      divTop:0.10, vosmsCap:10, oosmsCap:10 },
      2024: { ipn:0.10, opv:0.10, vosms:0.02, so:0.035, oosms:0.03, opvr:0.015, sn:0.095, snNet:true,  vat:0.12, cit:0.20, mrp:3692, mzp:85000, dedMrp:14, divTax:0.10, divFree:30000, divCap:0,      divTop:0.10, vosmsCap:10, oosmsCap:10 },
      2025: { ipn:0.10, opv:0.10, vosms:0.02, so:0.05,  oosms:0.03, opvr:0.025, sn:0.11,  snNet:true,  vat:0.12, cit:0.20, mrp:3932, mzp:85000, dedMrp:14, divTax:0.10, divFree:30000, divCap:0,      divTop:0.10, vosmsCap:10, oosmsCap:10 },
      2026: { ipn:0.10, opv:0.10, vosms:0.02, so:0.05,  oosms:0.03, opvr:0.035, sn:0.06,  snNet:false, vat:0.16, cit:0.20, mrp:4325, mzp:85000, dedMrp:30, divTax:0.05, divFree:0,     divCap:230000, divTop:0.15, vosmsCap:20, oosmsCap:40, ipnTop:0.15, ipnTopMrp:8500 },
    };
    for (const y in RATES){ const r=RATES[y]; r.soBase = 1 - r.opv; r.snBase = 1 - r.opv - r.vosms; r.opvrShare = P_OPVR_SHARE; r.opvrEff = r.opvr*P_OPVR_SHARE; r.opvCap = 50; r.soMin = 1; r.soMax = 7;
      r.soEff = r.so*r.soBase; r.snEff = Math.max(0, r.sn*r.snBase - (r.snNet ? r.soEff : 0));                 // доля оклада: СО и СН к уплате
      r.employer = r.soEff + r.oosms + r.opvrEff + r.snEff;                                                    // взносы работодателя, доля ФОТ (ОПВР — за долю штата моложе 1975 г. р.)
      r.ded = r.dedMrp*r.mrp;                                                                                 // стандартный вычет ИПН в месяц на человека: 14 МРП, с 2026 — 30 МРП
      r.withholding = r.opv + r.vosms + r.ipn*(1-r.opv-r.vosms); }                                              // удержания без вычета (справочно; в расчёте — с вычетом)
    // ИПН с дивидендов по закону года, нарастающим итогом за календарный год: cumBefore — начислено учредителю с 01.01 до этой выплаты, a — сумма выплаты
    function divIpn(y, cumBefore, a){
      const r = RATES[y], c0 = cumBefore, c1 = cumBefore + a;
      if (r.divCap){ const T = r.divCap*r.mrp; return r.divTax*(Math.min(c1,T) - Math.min(c0,T)) + r.divTop*(Math.max(0,c1-T) - Math.max(0,c0-T)); }
      if (r.divFree){ const F0 = r.divFree*r.mrp; return r.divTax*(Math.max(0,c1-F0) - Math.max(0,c0-F0)); }
      return r.divTax*a;
    }
    const R = i => RATES[yOf(Math.min(i,DAYS-1))];
    const FX = { USD:[], EUR:[], RUB:[] };
    for (let k=0;k<NY*12;k++){ const t=k/12; FX.USD.push(Math.round(430 + 22*t + 9*Math.sin(k/2.3))); FX.EUR.push(Math.round(460 + 27*t + 12*Math.sin(k/2.8))); FX.RUB.push(+(5.6 + 0.25*t + 0.5*Math.sin(k/3.1)).toFixed(2)); }
    const fx = (cur, i) => cur==='KZT' ? 1 : FX[cur][monthIdx(Math.max(0,Math.min(i, DAYS-1)))];

    // ---------- экономика по годам ----------
    // Норма труда (ТК РК): 40-часовая неделя (ст. 68), среднемесячная норма 2026 — 164,7 ч (1 976 ч в год); у охранников — суммированный учёт (ст. 75): сверхурочные не более 2 ч в сутки
    // и 120 ч в год (ст. 78; предел 12 ч в месяц — для 4-, 5-, 6-дневной недели, к суммированному учёту не применяется), оплата не ниже 1,5× (ст. 108).
    // FTE на пост — по графику (часы поста в год ÷ норма 1 976 ч, с запасом до предела сверхурочных): пост 24/7 = 8 760 ч — «сутки/трое» и вахта 15/15: 4 человека на пост по графику, в модели 4,4 FTE;
    // «2/2» дневной (12 ч каждый день, 4 380 ч) — 2 человека по графику, по норме 2,3 FTE; «5/2» дневной (8 ч по будням, ≈ 2 086 ч) — 1 человек, 1,1 FTE; штат = FTE × 1,05.
    // Тарифы 2022–2026 — по графику, к стоимости поста по норме ТК РК: базовый тариф каждого графика безубыточен с маржой 15–20 %.
    const TK24 = 1.43, TK22 = 1.54, TK52 = 0.85;
    const tk = (o, k) => Object.fromEntries(Object.entries(o).map(([y,v]) => [y, Math.round(v*k/10000)*10000]));
    const DAY0T = { 2022: 440000, 2023: 480000, 2024: 520000, 2025: 560000, 2026: 610000 };
    const P = {
      tariff24: tk({ 2022: 900000, 2023: 980000, 2024: 1060000, 2025: 1150000, 2026: 1250000 }, TK24),
      tariff22: tk(DAY0T, TK22), tariff52: tk(DAY0T, TK52),
      fteBy: { 'сутки/трое':4.4, '15/15 вахта':4.4, '2/2 дневной':2.3, '5/2 дневной':1.1 },   // FTE на пост по графику (норма ТК РК); штат = FTE × 1,05 (резерв на отпуска, больничные, текучесть)
      fte24: 4.4, reserveK: 1.05,
      normYear: 1976, otK: 1.5, otMonth: 12, otYear: 120, otDay: 2,   // норма часов в год на человека (40 ч/нед.), сверхурочные 1,5×, пределы ст. 78 ТК РК (2 ч в сутки, 120 ч в год; 12 ч в месяц — не для суммированного учёта)
      postHours: { 'сутки/трое':24, '15/15 вахта':24, '2/2 дневной':12, '5/2 дневной':40/7 },     // часов охраны в сутки на пост (5/2 — 8 ч по будням)
      perPost:   { 'сутки/трое':4, '15/15 вахта':4, '2/2 дневной':2, '5/2 дневной':1 },          // человек на пост по графику
      shiftsDay: { 'сутки/трое':1, '15/15 вахта':2, '2/2 дневной':1, '5/2 дневной':1 },          // смен в сутки на пост (5/2 — только по будням)
      vacShare: 24/365,                                           // оплачиваемый отпуск 24 календарных дня (ст. 88 ТК РК) — начисление резерва отпусков (IAS 19)
      guardSalary: { 2022: 160000, 2023: 180000, 2024: 200000, 2025: 215000, 2026: 230000 },
      adminSalary: { 2022: 300000, 2023: 330000, 2024: 365000, 2025: 400000, 2026: 420000 },
      // уровень 2026, в месяц при 625 постах; растёт с числом постов. Коммерческие: тендеры (подготовка заявок, банковские гарантии, ЭЦП), реклама и сайт, представительские
      opex: { uniform: 10500000, transport: 19850000, comms: 2500000, office: 6000000, other: 5500000, tenders: 5500000, ads: 1600000, repr: 2000000 },
      crm: { 2022: 60000, 2023: 70000, 2024: 78000, 2025: 85000, 2026: 92000 },   // подписка CRM (Битрикс24) коммерческой службы, в месяц
      opexIdx: { 2022: 0.78, 2023: 0.84, 2024: 0.89, 2025: 0.94, 2026: 1 },
      // основные средства по объектам: входящая группа 150 млн, износ 40 млн, остаток 110 млн списывается за 44 мес.; покупки и лизинг — 60 мес.; при полном износе амортизация прекращается (IAS 16.55)
      faGross0: 150000000, accDep0: 40000000, faLife0: 44, depMonths: 60, cash0: 450000000, inventory: 43926000, charter: 100000000,
      reserve: { rate: 0.05, cap: 0.15 },   // резервный капитал по уставу (решение учредителя в демо): 31.12 — 5 % чистой прибыли года, пока резерв < 15 % уставного капитала
      leasing: { day: idxOf(2026,4,12), amount: 70000000, rate: 0.18, pay: 3250000 },   // 18 % годовых, проценты — по дням на остаток основного долга, платёж 12-го
      capex: [ [idxOf(2022,5,10), 26000000], [idxOf(2023,8,14), 39000000], [idxOf(2024,3,2), 30500000], [idxOf(2025,2,18), 32500000], [idxOf(2026,8,9), 16000000] ],
      dividends: [ [idxOf(2022,6,15), 250000000], [idxOf(2023,6,15), 400000000], [idxOf(2024,6,15), 350000000], [idxOf(2025,6,15), 400000000], [idxOf(2025,11,22), 300000000], [idxOf(2026,6,15), 600000000], [idxOf(2026,9,20), 360000000] ],
      system: { monthly: 3000000, implementation: 36000000 },   // SUNKAR BI: подписка ИИ, сервер, сопровождение; запуск — разово, 6 мес. (признан расходом, не капитализирован)
      cashFloor: 150000000, depRate: { 2022: 0.12, 2023: 0.14, 2024: 0.13, 2025: 0.15, 2026: 0.14 },   // остаток сверх 150 млн — на овернайт-депозите, годовая ставка
      cit2021: 75000000, citAdvK: 1.1,       // КПН за 2021 (декларация 100.00) — база авансов 2022; авансы = 1/12 × КПН прошлого года × 1,1 (ст. 305 НК РК)
    };
    P.tariffBy = { 'сутки/трое':P.tariff24, '15/15 вахта':P.tariff24, '2/2 дневной':P.tariff22, '5/2 дневной':P.tariff52 };   // базовый тариф по графику поста
    P.opvrShare = P_OPVR_SHARE;
    P.tariffDay = P.tariff22; P.fteDay = P.fteBy['2/2 дневной'];          // совместимость: «дневной пост» = «2/2» (12 ч)
    // ---------- регионы, заказчики, объекты ----------
    const REGIONS = [
      { r:'Алматы', city:'Алматы', n:115, kinds:['бизнес-центр','ЖК','торговый центр','склад','автостоянка','офис банка'] },
      { r:'Астана', city:'Астана', n:75, kinds:['бизнес-центр','ЖК','гос. учреждение','склад','торговый центр'] },
      { r:'Шымкент', city:'Шымкент', n:40, kinds:['производство','рынок','склад','ЖК'] },
      { r:'Карагандинская', city:'Караганда', n:31, kinds:['производство','склад','ТЭЦ (подряд)'] },
      { r:'Атырауская', city:'Атырау', n:27, kinds:['месторождение','база снабжения'] },
      { r:'Мангистауская', city:'Актау', n:18, kinds:['порт-терминал','месторождение'] },
      { r:'Актюбинская', city:'Актобе', n:22, kinds:['производство','склад'] },
    ];
    const CHANNELS = ['Прямой договор','Тендер / госзакупки','Субподряд партнёра','Заявка с сайта'];
    const customers = [], objects = [];
    let poolId = 0, oid = 1;
    REGIONS.forEach((reg, ri) => {
      for (let k=0;k<reg.n;k++){
        poolId++;
        const s = poolId*7 + ri;
        // кандидат: 34 % — работает с начала 2022, остальные появляются в 2022–2026
        const r0 = h(s,8);
        const start = r0 < 0.42 ? -1 : Math.floor((r0-0.42)/0.58 * (FACT_END - 30)) + 5;
        const accept = start < LAUNCH_DEMO ? h(s,20) < 0.66 : h(s,20) < SC.conv;     // после старта системы конверсия продаж выше
        if (!accept) continue;
        const kind = reg.kinds[Math.floor(h(s,1)*reg.kinds.length)];
        const vahta = kind==='месторождение';
        const is24 = vahta || /производство|порт|ТЭЦ|склад|база/.test(kind) || h(s,2) < 0.5;
        const posts = vahta ? 3 + Math.floor(h(s,3)*2) : (is24 ? 2 + Math.floor(h(s,3)*2.4) : 1 + Math.floor(h(s,3)*2.6));
        let cust = null; const same = customers.filter(c=>c.region===reg.r);
        if (same.length && h(s,4) < 0.35) cust = same[Math.floor(h(s,5)*same.length)];
        if (!cust){
          const id = customers.length+1, bad = h(id,9,ri);
          cust = { id, name:`ТОО «Заказчик-${id}»`, region:reg.r, city:reg.city,
            channel: pickW(h(id,6,ri), [[0.5,CHANNELS[0]],[0.28,CHANNELS[1]],[0.12,CHANNELS[2]],[0.10,CHANNELS[3]]]),
            payDays: [10,15,15,30,30][Math.floor(h(id,7,ri)*5)],
            delayMean: bad < 0.55 ? 2 : (bad < 0.80 ? 9 : (bad < 0.93 ? 22 : 45)), objects: [] };
          customers.push(cust);
        }
        const tk = 0.88 + h(s,10)*0.24;
        // расторжения: до запуска одинаково, после — зависит от варианта (качество охраны, ответы на жалобы)
        let end = DAYS, terminated = null;
        const a0 = Math.max(start, 0);
        if (h(s,30) < 0.16){ const d = a0 + 200 + Math.floor(h(s,31)*700); if (d < LAUNCH_DEMO){ end = d+1; terminated = d; } }
        if (terminated==null && h(s,32) < SC.churn*2.2){ const d = Math.max(a0, LAUNCH_DEMO) + 60 + Math.floor(h(s,33)*600); if (d < FACT_END){ end = d+1; terminated = d; } }
        const o = { id:oid, name:`Объект № ${oid}`, kind: vahta ? 'месторождение (вахта 15/15)' : kind, region:reg.r, city:reg.city, customer:cust,
          is24, posts, sched: vahta ? '15/15 вахта' : (is24 ? 'сутки/трое' : (h(s,11)<0.55 ? '2/2 дневной' : '5/2 дневной')),
          tk, start, end, terminated, signDay: start>=0 ? start-30 : -1, contractEnd: idxOf(2026, 10 + Math.floor(h(s,12)*14), 1 + Math.floor(h(s,13)*27)), seed:s };
        cust.objects.push(o); objects.push(o); oid++;
      }
    });
    for (let k = customers.length-1; k>=0; k--) if (!customers[k].objects.length) customers.splice(k,1);
    // сюжет: объект со старым тарифом (убыток) и три объекта со «сегодняшними» незакрытыми сменами
    const loss = objects.find(o=>o.start<0 && o.is24 && o.end===DAYS); if (loss){ loss.tk = 0.80; loss.story = 'тариф ниже рынка'; loss.otX = 2; }
    const NARRATIVE = {}; objects.filter(o=>o.start<0 && o.end===DAYS).slice(3,6).forEach((o,k)=>{ NARRATIVE[o.id] = [2,1,1][k]; });
    // убыточные объекты с понятной причиной (≈ 5 % объектов): старые договоры с твёрдой ценой 2023 года без индексации (пересмотр — при продлении) и скидка за объём крупному заказчику
    // (выбор — по номеру кандидата, одинаково во всех вариантах развития: история до 2025 года не зависит от варианта)
    const storyPool = objects.filter(o => o.start < 0 && (o.terminated == null || o.terminated >= LAUNCH_DEMO) && o !== loss && !NARRATIVE[o.id]).sort((a,b) => h(a.seed,61) - h(b.seed,61));
    storyPool.slice(0,5).forEach(o => { o.fixY = 2023; o.noRev = true; o.story = 'договор 2023 года без индексации тарифа'; });
    storyPool.slice(5,7).forEach(o => { o.tk = 0.82; o.noRev = true; o.story = 'тендерная цена ниже базового тарифа'; });
    // расторжение: договор 2023 года без индексации, заказчик расторг в 2026 году (кандидат выбирается по номеру и дате возможного расторжения — одинаково во всех вариантах)
    { const t26 = idxOf(2026,0,1), dT = o => LAUNCH_DEMO + 60 + Math.floor(h(o.seed,33)*600);
      objects.filter(o => o.start < LAUNCH_DEMO - 365 && !o.story && o !== loss && !NARRATIVE[o.id] && (o.terminated == null || o.terminated >= LAUNCH_DEMO) && h(o.seed,32) < 0.035*2.2 && dT(o) >= t26 + 60 && dT(o) < FACT_END)
        .sort((a,b) => h(a.seed,63) - h(b.seed,63)).slice(0,1)
        .forEach(o => { o.fixY = 2023; o.noRev = true; o.story = o.terminated != null ? 'договор 2023 года без индексации — расторгнут заказчиком' : 'договор 2023 года без индексации тарифа'; }); }
    objects.forEach(o => { o.fte = P.fteBy[o.sched] * o.posts; o.missedPost = NARRATIVE[o.id] || null; });
    const active = (o,i) => i >= o.start && i < o.end;
    // пересмотр тарифов убыточных объектов через полгода после старта системы (юнит-экономика)
    const revisionDay = LAUNCH + 180;
    const tariff = (o,i) => { let k = o.tk; if (SC.k>0 && i >= revisionDay && o.tk < 0.97 && !o.noRev) k += 0.08*SC.k; const y = yOf(Math.min(i,DAYS-1)); return Math.round(P.tariffBy[o.sched][o.fixY ? Math.min(y, o.fixY) : y] * k / 1000) * 1000; };

    // ---------- по дням: итоги компании ----------
    const totFte = new Float64Array(DAYS), totPosts = new Float64Array(DAYS), reqH = new Float64Array(DAYS);
    for (let i=0;i<DAYS;i++) for (const o of objects) if (active(o,i)){ totFte[i]+=o.fte; totPosts[i]+=o.posts; reqH[i]+=o.posts*P.postHours[o.sched]; }
    const dim = i => MONTHS[monthIdx(i)].dim;
    const wday = i => { const w = toDate(i).getUTCDay(); return w>=1 && w<=5; };
    // администрация: без системы растёт вместе с постами; с системой — медленнее (автоматизация кадров, юриста, снабжения, механика)
    const ADM = Int32Array.from({length:DAYS}, (_,i) => Math.round((6 + totPosts[i]/6.5) * (1 - 0.18*Math.min(1,eff(i)))));
    const adminCount = i => ADM[Math.max(0, Math.min(i,DAYS-1))];
    function opexDay(i){
      const y = yOf(i), m = mOf(i), k = P.opexIdx[y]*(0.12 + 0.88*totPosts[i]/625), d = dim(i), e = eff(i);
      return { uniform: P.opex.uniform*k*(m===0||m===9 ? 1.6 : 1)*(1-0.06*e)/d, transport: P.opex.transport*k*(m>=5&&m<=7 ? 1.12 : 1)*(1-0.08*e)/d,
               comms: P.opex.comms*k/d, office: P.opex.office*k/d, other: P.opex.other*k*(1-0.10*e)/d,
               it: i >= LAUNCH_DEMO && SC.k>0 ? (P.system.monthly + (i < LAUNCH_DEMO+182 ? P.system.implementation/6 : 0))/d : 0,
               tenders: P.opex.tenders*k*(m===0||m===1 ? 0.6 : (m>=8&&m<=10 ? 1.35 : 1))/d, ads: P.opex.ads*k/d, repr: P.opex.repr*k*(m===11 ? 2.2 : (m===0 ? 0.4 : 1))/d, crm: P.crm[y]/d };
    }

    // ---------- кадры: штат, вакансии, отсутствующие, сверхурочные (до объектов — ФОТ считается от штата) ----------
    // потребность = FTE постов × 1,05; штат живёт сам: увольнения по текучести, найм закрывает разрыв с задержкой (с системой — быстрее), излишек после расторжений уходит за несколько дней
    const need = new Float64Array(DAYS), staff = new Float64Array(DAYS), hrCum = { hires:new Float64Array(DAYS+1), fires:new Float64Array(DAYS+1) };
    const turnoverRate = i => { const e = eff(i); return SC.k===0 && i>=LAUNCH_DEMO ? 0.36 : 0.32*(1 - 0.45*Math.min(1.2,e)); };
    const fillRate = i => { const e = eff(i); return SC.k===0 && i>=LAUNCH_DEMO ? 0.06 : 0.09 + 0.07*Math.min(1,e); };
    for (let i=0;i<DAYS;i++){
      need[i] = totFte[i]*P.reserveK;
      if (!i){ staff[0] = Math.round(need[0]); hrCum.hires[1] = 0; hrCum.fires[1] = 0; continue; }
      const prev = staff[i-1], p = prev*turnoverRate(i)/365, base = Math.floor(p), fT = base + (h(i,901) < p-base ? 1 : 0);
      const gap = need[i] - (prev - fT); let hi = 0, fx = 0;
      if (gap > 0) hi = Math.floor(gap*fillRate(i) + h(i,907)); else if (gap < -1) fx = Math.floor(-gap*0.25 + h(i,908));
      staff[i] = prev - fT - fx + hi;
      hrCum.hires[i+1] = hrCum.hires[i] + hi; hrCum.fires[i+1] = hrCum.fires[i] + fT + fx;
    }
    // отпуска: в среднем 24/365 штата (июнь–август ×1,7, декабрь ×1,3), берут по стажу — от штата полгода назад; больничные ≈ 2,5 %
    const VAC_BASE = P.vacShare/1.2, vacSeason = m => m>=5&&m<=7 ? 1.7 : (m===11 ? 1.3 : 1), sickSeason = m => m<=2||m>=10 ? 1.5 : 0.9;
    const vacRate = i => VAC_BASE*vacSeason(mOf(i))*(0.85+0.3*h(i,903)), sickRate = i => 0.022*sickSeason(mOf(i))*(0.8+0.4*h(i,904));
    const lag = i => Math.max(0, i-182);
    const vacG = new Float64Array(DAYS), sickG = new Float64Array(DAYS), otH = new Float64Array(DAYS);
    const normDay = P.normYear/365;
    for (let i=0;i<DAYS;i++){
      vacG[i] = staff[lag(i)]*vacRate(i); sickG[i] = staff[i]*sickRate(i);
      // сверхурочные часы: часы охраны на постах − часы присутствующих по норме (пул охранников компании); до системы графики хуже согласованы (+10 %)
      const e = eff(i), avail = Math.max(0, staff[i] - vacG[i] - sickG[i])*normDay;
      otH[i] = Math.max(0, reqH[i] - avail) * (1 + 0.10*(1 - Math.min(1,e))) * (SC.k===0 && i>=LAUNCH_DEMO ? 1.15 : 1);
    }
    // ФОТ по дням (до объектов): оклады штата + сверхурочные 1,5×; расход ОПиУ = оклады + начисление резерва отпусков − отпускные из резерва (IAS 19)
    const G = { E:new Float64Array(DAYS), gross:new Float64Array(DAYS), ot:new Float64Array(DAYS), res:new Float64Array(DAYS) };
    const Ad = { E:new Float64Array(DAYS), gross:new Float64Array(DAYS), res:new Float64Array(DAYS) };
    for (let i=0;i<DAYS;i++){
      const y = yOf(i), r = R(i), d = dim(i), gs = P.guardSalary[y], as = P.adminSalary[y], e1 = 1 + r.employer;
      G.ot[i] = otH[i]*gs/(P.normYear/12)*P.otK;
      G.gross[i] = staff[i]*gs/d + G.ot[i];
      G.res[i] = (staff[i]*P.vacShare - vacG[i])*gs/d*e1;                       // изменение резерва отпусков с взносами: начисление − использование
      G.E[i] = G.gross[i]*e1 + G.res[i];
      const na = adminCount(i), naL = adminCount(lag(i));
      Ad.gross[i] = na*as/d; Ad.res[i] = (na*P.vacShare - naL*vacRate(i))*as/d*e1; Ad.E[i] = Ad.gross[i]*e1 + Ad.res[i];
    }

    // ---------- по объектам: накопительные ряды ----------
    const KEYS = ['rev','guard','direct','overhead','plan','missed','late'];
    objects.forEach(o => { o.c = {}; KEYS.forEach(k => o.c[k] = new Float64Array(DAYS+1)); });
    const SELL = ['tenders','ads','repr','crm'];
    const companyDirect = new Float64Array(DAYS), companyOverhead = new Float64Array(DAYS), adminCostDay = Ad.E, otW = new Float64Array(DAYS);
    // сверхурочные распределяются по объектам: FTE × случайный вес месяца (объект со старым тарифом — вдвое больше)
    const OTW = new Map(objects.map(o => [o, Float64Array.from({length:NY*12}, (_,m) => o.fte * (0.6 + 0.8*h(o.id, m, 77)) * (o.otX || 1))]));
    const MI = Int16Array.from({length:DAYS}, (_,i) => monthIdx(i)), otWeight = (o,i) => OTW.get(o)[MI[i]];
    for (let i=0;i<DAYS;i++){
      const ox = opexDay(i);
      companyDirect[i] = ox.uniform + ox.transport + ox.comms;
      companyOverhead[i] = adminCostDay[i] + ox.office + ox.other + ox.it + SELL.reduce((s,k)=>s+ox[k],0);
      for (const o of objects) if (active(o,i)) otW[i] += otWeight(o,i);
    }
    const EFF = Float64Array.from({length:DAYS}, (_,i) => eff(i)), DIM = Float64Array.from({length:DAYS}, (_,i) => dim(i)), WD = Uint8Array.from({length:DAYS}, (_,i) => wday(i) ? 1 : 0), OTP = Float64Array.from({length:DAYS}, (_,i) => G.ot[i]*(1+R(i).employer));
    for (const o of objects){
      for (let i=0;i<DAYS;i++){
        let rev=0, guard=0, direct=0, over=0, plan=0, missed=0, late=0;
        if (active(o,i)){
          const e = EFF[i];
          rev = o.posts * tariff(o,i) / DIM[i];
          const otPart = OTP[i];
          guard = (G.E[i] - otPart) * o.fte / totFte[i] + (otW[i] ? otPart * otWeight(o,i) / otW[i] : 0);
          direct = totFte[i] ? companyDirect[i] * o.fte / totFte[i] : 0;
          over = totPosts[i] ? companyOverhead[i] * o.posts / totPosts[i] : 0;
          plan = o.sched==='5/2 дневной' && !WD[i] ? 0 : o.posts * P.shiftsDay[o.sched];
          const pm = 0.0085 * (1 - 0.65*Math.min(1.2,e)) * (SC.k===0 && i>=LAUNCH_DEMO ? 1.1 : 1), pl = 0.04 * (1 - 0.5*Math.min(1.2,e));
          if (i === FACT_END){ missed = NARRATIVE[o.id] ? 1 : 0; late = h(o.id,i,3) < pl*plan ? 1 : 0; }
          else { missed = h(o.id,i,1) < pm*plan ? 1 : 0; late = h(o.id,i,2) < pl*plan ? 1 : 0; }
        }
        const c=o.c; c.rev[i+1]=c.rev[i]+rev; c.guard[i+1]=c.guard[i]+guard; c.direct[i+1]=c.direct[i]+direct; c.overhead[i+1]=c.overhead[i]+over;
        c.plan[i+1]=c.plan[i]+plan; c.missed[i+1]=c.missed[i]+missed; c.late[i+1]=c.late[i]+late;
      }
    }
    const sumO = (o,k,from,to) => { const a = Math.max(from,0), b = Math.min(to,DAYS-1); return b < a ? 0 : o.c[k][b+1] - o.c[k][a]; };

    // ---------- книга проводок ----------
    const ACC = ['cash','ar','inv','fa','accdep','ap','salpay','paytax','vat','citpay','divtax','vacres','leasing','charter','reserve','re','rev','finInc','guardC','adminC','uniform','transport','comms','office','other','it','tenders','ads','repr','crm','dep','interest','cit','dividends'];
    const A = Object.fromEntries(ACC.map((a,k)=>[a,k])), NA = ACC.length;
    const CF = ['inCustomers','interestIn','salaries','payrollTaxes','vat','cit','suppliers','capex','leasingPay','interestPaid','dividends','divTax'];
    const C = Object.fromEntries(CF.map((a,k)=>[a,k])), NC = CF.length;
    const delta = new Float64Array(DAYS*NA), cfDelta = new Float64Array(DAYS*NC);
    let imbalance = 0;
    function post(i, lines, cfLine){
      if (i < 0 || i >= DAYS) return;
      let s = 0; for (const [a,v] of lines){ delta[i*NA + A[a]] += v; s += v; }
      imbalance += Math.abs(s);
      if (cfLine){ const cash = lines.find(l=>l[0]==='cash'); if (cash) cfDelta[i*NC + C[cfLine]] += cash[1]; }
    }
    // налоги с ФОТ по дням (накопительно) — для раздела «Налоги»: база — начисленный ФОТ (оклады, отпускные, сверхурочные)
    const TXK = ['fot','opv','vosms','ipn','so','oosms','opvr','sn','vatOut','vatIn','divIpn','heads'];
    const TXC = Object.fromEntries(TXK.map(k => [k, new Float64Array(DAYS+1)]));
    const monthAcc = Array.from({length:NY*12}, () => ({ salNet:0, payTax:0, vat:0, cit:0, ap:0, ipn:0 }));
    const quarterVat = new Float64Array(NY*4);
    // входящие остатки 01.01.2022: НДС — за IV квартал 2021 (к уплате 25.02.2022), резерв отпусков — половина годового начисления
    const decRev = c => c.objects.filter(o=>o.start<0).reduce((s,o)=>s+o.posts*Math.round(P.tariffBy[o.sched][2022]*0.96*o.tk/1000)*1000,0);
    const dec21 = customers.reduce((s,c)=>s+decRev(c),0);
    const ar0 = dec21*1.12, sal0 = dec21*0.50, pt0 = dec21*0.17, vat0 = dec21*0.12*0.85*3, ap0 = 5200000;
    const vres0 = 0.5*P.vacShare*12*(staff[0]*P.guardSalary[2022] + adminCount(0)*P.adminSalary[2022])*(1+RATES[2022].employer);
    const re0 = P.cash0 + ar0 + P.inventory + P.faGross0 - P.accDep0 - ap0 - sal0 - pt0 - vat0 - vres0 - P.charter;
    post(0, [['cash',P.cash0],['ar',ar0],['inv',P.inventory],['fa',P.faGross0],['accdep',-P.accDep0],['ap',-ap0],['salpay',-sal0],['paytax',-pt0],['vat',-vat0],['vacres',-vres0],['charter',-P.charter],['re',-re0]]);
    post(idxOf(Y0,0,5), [['salpay',sal0],['cash',-sal0]], 'salaries');
    post(idxOf(Y0,0,15), [['ap',ap0],['cash',-ap0]], 'suppliers');
    post(idxOf(Y0,0,25), [['paytax',pt0],['cash',-pt0]], 'payrollTaxes');
    post(idxOf(Y0,1,25), [['vat',vat0],['cash',-vat0]], 'vat');
    // акты и оплаты (до книги: поступления денег известны заранее): после старта системы — напоминания и контроль сроков сокращают задержки; без системы — дисциплина ухудшается
    const acts = [];
    for (const c of customers){
      const c0 = decRev(c)*1.12;
      if (c0 > 0) acts.push({ cust:c, month:-1, actDay:-1, amount:c0, due:-1+c.payDays, pay:-1+c.payDays+Math.round(c.delayMean*(0.4+h(c.id,0,5))) });
      for (let m=0;m<NY*12;m++){
        const M0 = MONTHS[m]; let amt = 0;
        for (const o of c.objects) amt += sumO(o,'rev',M0.start,M0.end) * (1+RATES[M0.y].vat);
        if (amt <= 0) continue;
        const e = eff(M0.end), trend = SC.arTrend && M0.end >= LAUNCH_DEMO ? 1 + SC.arTrend*(M0.end-LAUNCH_DEMO)/365 : 1;
        const dm = c.delayMean * (1 - 0.6*Math.min(1,e)) * trend;
        const late = Math.round(dm*(0.4+1.2*h(c.id,m,5))) - (h(c.id,m,6)<0.15 ? 4 : 0);
        acts.push({ cust:c, month:m, actDay:M0.end, amount:amt, due:M0.end+c.payDays, pay:M0.end+c.payDays+late, dm });
      }
    }
    if (loss) acts.filter(a => a.cust===loss.customer && a.actDay >= idxOf(2026,7,1)).forEach(a => a.pay = a.due + 95);
    acts.forEach(a => post(a.pay, [['cash', a.amount], ['ar', -a.amount]], 'inCustomers'));
    P.capex.forEach(([i, amt]) => post(i, [['fa', amt], ['cash', -amt]], 'capex'));
    // дивиденды: решение учредителя; ТОО как налоговый агент удерживает ИПН у источника и перечисляет до 25-го числа следующего месяца
    const divK = i => i < LAUNCH_DEMO ? 1 : ({ none:0.4, pess:0.7, base:1, opt:1.25 })[scnKey] || 1;
    // ИПН — по закону года нарастающим итогом за календарный год (освобождение 30 000 МРП в 2023–2025, 5 % / 15 % сверх 230 000 МРП в 2026): см. divIpn()
    const divCum = {};
    const DIVS = P.dividends.map(([i, amt]) => { const y = yOf(i), a = amt*divK(i), before = divCum[y] || 0, tax = divIpn(y, before, a), payDay = MONTHS[Math.min(NY*12-1, monthIdx(i)+1)].start + 24;
      divCum[y] = before + a;
      post(i, [['dividends', a], ['cash', -(a - tax)], ['divtax', -tax]], 'dividends'); post(payDay, [['divtax', tax], ['cash', -tax]], 'divTax');
      TXC.divIpn[i+1] += tax; return { day:i, amount:a, tax, net:a-tax, rate: a ? tax/a : 0, base:RATES[y].divTax, cumBefore:before, cumAfter:before + a, payDay }; });
    // основные средства по объектам: [день ввода, остаток к амортизации, сумма в месяц]
    const FA = [{ day:0, left:P.faGross0-P.accDep0, monthly:(P.faGross0-P.accDep0)/P.faLife0, cost:P.faGross0, name:'входящие ОС' }, ...P.capex.map(([d,a]) => ({ day:d, left:a, monthly:a/P.depMonths, cost:a, name:'покупка ОС' })),
      { day:P.leasing.day, left:P.leasing.amount, monthly:P.leasing.amount/P.depMonths, cost:P.leasing.amount, name:'лизинг автомобилей' }];
    FA.forEach(f => { f.end = null; });
    const OPX = ['uniform','transport','comms','office','other','it','tenders','ads','repr','crm'];
    const KPN = { adv:{}, settle:{}, accr:{} };          // авансы КПН по годам (в месяц), окончательный расчёт за год (10.04 следующего года), начислено за год
    let LB = 0, LI = 0, cashRun = 0, citYear = 0;          // лизинг: основной долг, начисленные проценты; деньги на конец дня; КПН с начала года
    const leasPrin = new Float64Array(DAYS), leasInt = new Float64Array(DAYS), depDay = new Float64Array(DAYS), finDay = new Float64Array(DAYS);
    for (let i=0;i<DAYS;i++){
      const r = R(i), m = monthIdx(i), ma = monthAcc[m], ox = opexDay(i), y = yOf(i), M0 = MONTHS[m];
      // 01.01: авансы КПН на год (1/12 × КПН прошлого года × 1,1, 25-го каждого месяца) и окончательный расчёт за прошлый год (10.04)
      if (dOf(i)===1 && mOf(i)===0){
        const prevCit = y === Y0 ? P.cit2021 : KPN.accr[y-1];
        KPN.adv[y] = Math.max(0, Math.round(prevCit*P.citAdvK/12/1000)*1000);
        for (let k=0;k<12;k++) post(idxOf(y,k,25), [['citpay', KPN.adv[y]], ['cash', -KPN.adv[y]]], 'cit');
        if (y > Y0){ const st = KPN.accr[y-1] - 12*KPN.adv[y-1]; KPN.settle[y-1] = st; post(idxOf(y,3,10), [['citpay', st], ['cash', -st]], 'cit'); }
        citYear = 0;
      }
      let rev=0, guard=0;
      for (const o of objects){ rev += sumO(o,'rev',i,i); guard += sumO(o,'guard',i,i); }
      post(i, [['ar', rev*(1+r.vat)], ['rev', -rev], ['vat', -rev*r.vat]]);
      // ФОТ: оклады и сверхурочные к выплате (удержания: ОПВ, ВОСМС, ИПН со стандартным вычетом 14 МРП, с 2026 — 30 МРП), взносы работодателя, изменение резерва отпусков
      const tx = TXC, heads = staff[i] + adminCount(i);
      for (const [acc, E, gross, res, n] of [['guardC', guard, G.gross[i], G.res[i], staff[i]], ['adminC', Ad.E[i], Ad.gross[i], Ad.res[i], adminCount(i)]]){
        const opv = gross*r.opv, vosms = gross*r.vosms, ipn = Math.max(0, gross - opv - vosms - n*r.ded/dim(i))*r.ipn, wh = opv + vosms + ipn, emp = gross*r.employer;
        const resPart = E - gross*(1+r.employer);                 // = res (у охраны — с учётом распределения по объектам)
        post(i, [[acc, E], ['salpay', -(gross - wh)], ['paytax', -(wh + emp)], ['vacres', -resPart]]);
        ma.salNet += gross - wh; ma.payTax += wh + emp; ma.ipn += ipn;
        tx.fot[i+1] += gross; tx.opv[i+1] += opv; tx.vosms[i+1] += vosms; tx.ipn[i+1] += ipn; tx.so[i+1] += gross*r.soEff; tx.oosms[i+1] += gross*r.oosms; tx.opvr[i+1] += gross*r.opvrEff; tx.sn[i+1] += gross*r.snEff;
      }
      tx.heads[i+1] += heads;
      let opx = 0;
      for (const k of OPX){ const x = ox[k]; if (!x) continue; opx += x; post(i, [[k, x], ['vat', x*r.vat], ['ap', -x*(1+r.vat)]]); ma.ap += x*(1+r.vat); }
      ma.vat += rev*r.vat - opx*r.vat; tx.vatOut[i+1] += rev*r.vat; tx.vatIn[i+1] += opx*r.vat;
      // амортизация по объектам ОС: 1/срок в месяц до полного износа
      let dep = 0;
      for (const f of FA){ if (i < f.day || f.left <= 0) continue; const x = Math.min(f.left, f.monthly/dim(i)); f.left -= x; dep += x; if (f.left <= 1e-6 && f.end == null) f.end = i; }
      post(i, [['dep', dep], ['accdep', -dep]]); depDay[i] = dep;
      // лизинг: проценты 18 % годовых по дням на основной долг; платёж 12-го — сначала проценты, остаток — основной долг (IAS 7.31: проценты отдельной строкой)
      let interest = 0;
      if (i === P.leasing.day){ post(i, [['fa', P.leasing.amount], ['leasing', -P.leasing.amount]]); LB = P.leasing.amount; }
      if (LB > 0){ interest = LB * P.leasing.rate / 365; post(i, [['interest', interest], ['leasing', -interest]]); LI += interest; }
      if (LB > 0 && dOf(i) === 12 && i > P.leasing.day){ const pay = Math.min(P.leasing.pay, LB + LI), ip = Math.min(pay, LI), pp = pay - ip;
        post(i, [['leasing', ip], ['cash', -ip]], 'interestPaid'); post(i, [['leasing', pp], ['cash', -pp]], 'leasingPay'); LI -= ip; LB -= pp; if (LB < 1) LB = 0; }
      leasPrin[i] = LB; leasInt[i] = LI;
      // месяц закрыт: зарплата 5-го, поставщики 15-го, налоги и взносы с ФОТ 25-го следующего месяца; НДС — за квартал 25-го второго месяца после квартала (ст. 424–425 НК РК)
      if (i === M0.end){
        const nx = i + 1;
        post(nx+4, [['salpay', ma.salNet], ['cash', -ma.salNet]], 'salaries');
        post(nx+14, [['ap', ma.ap], ['cash', -ma.ap]], 'suppliers');
        post(nx+24, [['paytax', ma.payTax], ['cash', -ma.payTax]], 'payrollTaxes');
        const q = Math.floor(m/3); quarterVat[q] += ma.vat;
        if (m % 3 === 2){ const pd = (q*3+4 < NY*12 ? MONTHS[q*3+4].start : DAYS) + 24; post(pd, [['vat', quarterVat[q]], ['cash', -quarterVat[q]]], 'vat'); }
      }
      // деньги на конец дня (все поступления и выплаты дня уже проведены) → проценты по остатку сверх 150 млн (овернайт-депозит, IAS 7.33 — операционный поток)
      cashRun += delta[i*NA + A.cash];
      const fin = Math.max(0, cashRun - P.cashFloor) * P.depRate[y] / 365; finDay[i] = fin;
      if (fin > 0){ post(i, [['cash', fin], ['finInc', -fin]], 'interestIn'); cashRun += fin; }
      const ebt = rev + fin - guard - Ad.E[i] - opx - dep - interest;
      post(i, [['cit', ebt*r.cit], ['citpay', -ebt*r.cit]]); ma.cit += ebt*r.cit; citYear += ebt*r.cit; KPN.accr[y] = citYear;
    }
    for (let i=0;i<DAYS;i++) for (const k of TXK) TXC[k][i+1] += TXC[k][i];
    // индекс актов по заказчику и месяцу: дебиторка, сроки и прогноз 13 недель не перебирают все акты
    const actsByCust = new Map(), actByCustMonth = new Map();
    for (const a of acts){ let l = actsByCust.get(a.cust); if (!l){ l = []; actsByCust.set(a.cust, l); actByCustMonth.set(a.cust, new Map()); } l.push(a); actByCustMonth.get(a.cust).set(a.month, a); }

    const cum = new Float64Array((DAYS+1)*NA), cfCum = new Float64Array((DAYS+1)*NC);
    const buildCum = () => { for (let i=0;i<DAYS;i++){ for (let a=0;a<NA;a++) cum[(i+1)*NA+a] = cum[i*NA+a] + delta[i*NA+a]; for (let a=0;a<NC;a++) cfCum[(i+1)*NC+a] = cfCum[i*NC+a] + cfDelta[i*NC+a]; } };
    buildCum();
    const bal = (acc, i) => i < 0 ? 0 : cum[(Math.min(i,DAYS-1)+1)*NA + A[acc]];
    const turn = (acc, from, to) => bal(acc,to) - bal(acc,from-1);
    const cfTurn = (line, from, to) => cfCum[(Math.min(to,DAYS-1)+1)*NC + C[line]] - cfCum[Math.max(from,0)*NC + C[line]];

    // ---------- отчёты компании ----------
    const PL_EXP = ['guardC','adminC','uniform','transport','comms','office','other','it','tenders','ads','repr','crm','dep','interest','cit'];
    function pl(from, to){
      const x = { revenue: -turn('rev',from,to), finInc: -turn('finInc',from,to) };
      PL_EXP.forEach(k => x[k] = turn(k,from,to));
      x.selling = x.tenders + x.ads + x.repr + x.crm;
      x.opex = x.uniform + x.transport + x.comms + x.office + x.other + x.it + x.selling;
      x.ebitda = x.revenue - x.guardC - x.adminC - x.opex;
      x.ebit = x.ebitda - x.dep; x.ebt = x.ebit - x.interest + x.finInc; x.net = x.ebt - x.cit;
      return x;
    }
    const plCum = to => to < 0 ? 0 : -['rev','finInc',...PL_EXP].reduce((s,k)=>s+bal(k,to),0);
    // резервный капитал: 31.12 каждого года Дт «нераспределённая прибыль» Кт «резервный капитал» — внутри капитала, итог капитала не меняется
    const reserveLog = [];
    { let res = 0;
      for (let y=Y0; y<Y0+NY; y++){
        const a = idxOf(y,0,1), z = idxOf(y,11,31), net = plCum(z) - plCum(a-1);
        const x = Math.round(Math.max(0, Math.min(P.reserve.rate*net, P.reserve.cap*P.charter - res)));
        reserveLog.push({ y, day:z, net, amount:x, after:res + x });
        if (x > 0){ post(z, [['re', x], ['reserve', -x]]); res += x; }
      }
      buildCum();
    }
    const RE0 = re0;
    // лизинг: текущая часть = основной долг, погашаемый по графику в ближайшие 12 платежей, + начисленные проценты (IAS 1.60–61, IFRS 16.47)
    function leasingSplit(i){
      i = Math.max(0, Math.min(i, DAYS-1)); let lb = leasPrin[i], li = leasInt[i], princ = 0, d = i;
      const total = -bal('leasing', i);
      for (let k=0; k<12 && lb > 0; k++){
        let nd = d + 1; while (dOf(nd) !== 12) nd++;                                                  // следующее 12-е число (и после 31.12.2026 — по календарю)
        li += lb * P.leasing.rate / 365 * (nd - d); const pay = Math.min(P.leasing.pay, lb + li), ip = Math.min(pay, li); princ += pay - ip; lb -= pay - ip; li -= ip; d = nd;
      }
      const cur = Math.min(total, princ + leasInt[i]);
      return { total, current: cur, long: total - cur, principal: leasPrin[i], interest: leasInt[i] };
    }
    // капитал по составу на конец дня i (i < 0 — входящие остатки 01.01.2022)
    const equityAt = i => i < 0 ? { charter:P.charter, reserve:0, re:RE0 } : { charter:-bal('charter',i), reserve:-bal('reserve',i), re:-bal('re',i) + plCum(i) - bal('dividends',i) };
    function balance(i){
      const yStart = idxOf(yOf(i),0,1), v = k => bal(k,i), ls = leasingSplit(i);
      const x = { cash: v('cash'), ar: v('ar'), inv: v('inv'), faNet: v('fa') + v('accdep'), faGross: v('fa'), accDep: -v('accdep'),
        ap: -v('ap'), salpay: -v('salpay'), paytax: -v('paytax'), vat: -v('vat'), citpay: -v('citpay'), divtax: -v('divtax'), vacres: -v('vacres'),
        leasing: -v('leasing'), leasingCur: ls.current, leasingLong: ls.long, charter: -v('charter'),
        reserve: -v('reserve'), toReserveYear: -(v('reserve') - bal('reserve',yStart-1)), profitYear: plCum(i) - plCum(yStart-1), dividendsYear: bal('dividends',i) - bal('dividends',yStart-1) };
      x.reStart = -v('re') + x.toReserveYear + plCum(yStart-1) - bal('dividends',yStart-1);                 // нераспределённая прибыль на 01.01 (без резерва)
      x.re = x.reStart + x.profitYear - x.dividendsYear - x.toReserveYear;                                   // нераспределённая прибыль на дату
      x.assets = x.cash + x.ar + x.inv + x.faNet; x.taxes = x.paytax + x.vat + x.citpay + x.divtax;
      x.current = x.ap + x.salpay + x.taxes + x.vacres + x.leasingCur;                                     // краткосрочные обязательства (IAS 1.69)
      x.liabilities = x.ap + x.salpay + x.taxes + x.vacres + x.leasing; x.equity = x.charter + x.reserve + x.re;
      x.netAssets = x.assets - x.liabilities; x.equityStart = x.charter + x.reserve - x.toReserveYear + x.reStart;
      x.diff = x.assets - x.liabilities - x.equity;
      return x;
    }
    // отчёт об изменениях капитала за период (МСФО IAS 1): остаток на начало + прибыль − дивиденды ± резерв ± уставный = остаток на конец
    function equityChanges(from, to){
      from = Math.max(0, from); to = Math.min(to, DAYS-1);
      const open = equityAt(from-1), close = equityAt(to), sum = e => e.charter + e.reserve + e.re;
      const profit = pl(from,to).net, dividends = turn('dividends',from,to), toReserve = -turn('reserve',from,to), charterChange = close.charter - open.charter;
      const total = { open: sum(open), close: sum(close) };
      const other = total.close - total.open - (profit - dividends + charterChange);
      return { from, to, open, close, profit, dividends, toReserve, charterChange, other, total, check: total.close - balance(to).equity };
    }
    function cashflow(from, to){
      const x = { open: from <= 0 ? P.cash0 : bal('cash',from-1), close: bal('cash',to) };
      CF.forEach(k => x[k] = cfTurn(k,from,to));
      x.operating = x.inCustomers + x.interestIn + x.salaries + x.payrollTaxes + x.vat + x.cit + x.suppliers;
      x.investing = x.capex; x.financing = x.leasingPay + x.interestPaid + x.dividends + x.divTax; x.net = x.close - x.open;
      return x;
    }
    function receivables(i, filterCust){
      const out = { total:0, billed:0, unbilled:0, overdue:0, overdue30:0, byCust:new Map() };
      for (const [cust, list] of actsByCust){ if (filterCust && !filterCust(cust)) continue; for (const a of list){
        if (a.actDay > i) break;                                  // акты заказчика идут по возрастанию даты
        if (a.pay > i){
          const e = out.byCust.get(a.cust) || { cust:a.cust, debt:0, overdue:0, maxDays:0 };
          e.debt += a.amount; out.billed += a.amount;
          if (a.due < i){ e.overdue += a.amount; out.overdue += a.amount; e.maxDays = Math.max(e.maxDays, i - a.due); if (i - a.due > 30) out.overdue30 += a.amount; }
          out.byCust.set(a.cust, e);
        }
      } }
      const M0 = MONTHS[monthIdx(Math.min(i,DAYS-1))];
      if (i < M0.end) for (const c of customers){ if (filterCust && !filterCust(c)) continue; let u=0; for (const o of c.objects) u += sumO(o,'rev',M0.start,i)*(1+RATES[M0.y].vat); out.unbilled += u; }
      out.total = out.billed + out.unbilled;
      return out;
    }
    function aging(i, filterCust){
      const b = { notDue:0, d30:0, d60:0, d90:0, d90p:0 };
      for (const [cust, list] of actsByCust){ if (filterCust && !filterCust(cust)) continue; for (const a of list){ if (a.actDay > i) break; if (a.pay <= i) continue;
        const late = i - a.due; if (late <= 0) b.notDue += a.amount; else if (late <= 30) b.d30 += a.amount; else if (late <= 60) b.d60 += a.amount; else if (late <= 90) b.d90 += a.amount; else b.d90p += a.amount; } }
      return b;
    }
    // прогноз денег на 13 недель: поступления по актам (срок + обычная задержка), зарплата 5-го, поставщики 15-го, налоги с ФОТ и аванс КПН 25-го,
    // НДС за квартал 25-го второго месяца после квартала, окончательный расчёт КПН 10.04, лизинг 12-го, дивиденды и ИПН с них, покупки ОС по плану;
    // extra — возможные выплаты по решениям, ожидающим утверждения ([{ day, amount, title }]) — отдельной колонкой, в остаток не входят
    function forecast13(i, extra){
      const weeks = Array.from({length:13}, (_,w) => ({ w, from: i+1+7*w, to: i+7+7*w, inflow:0, salaries:0, taxes:0, vat:0, cit:0, suppliers:0, leasing:0, dividends:0, capex:0, possible:0 }));
      const wk = d => { const k = Math.floor((d - i - 1)/7); return k>=0 && k<13 ? weeks[k] : null; };
      const dayOf = (m, d) => idxOf(Y0 + Math.floor(m/12), m%12, d);
      for (const a of acts){ if (a.actDay > i || a.pay <= i) continue; const w = wk(Math.max(i+1, a.due + Math.round(a.dm ?? a.cust.delayMean))); if (w) w.inflow += a.amount; }
      const mi = monthIdx(i), lastFull = MONTHS[mi].end === i ? mi : mi-1, ref = monthAcc[Math.max(0,lastFull)];
      for (let m = lastFull+1; m < Math.min(NY*12, mi+5); m++){ const M0 = MONTHS[m]; for (const c of customers){ const cm = actByCustMonth.get(c), ra = cm && cm.get(Math.max(0,lastFull)); if (!ra || !c.objects.some(o=>active(o,i))) continue; const w = wk(M0.end + c.payDays + Math.round(ra.dm ?? c.delayMean)); if (w) w.inflow += ra.amount; } }
      const accOf = m => m <= lastFull && m < NY*12 ? monthAcc[m] : ref;
      for (let m = Math.max(0, mi-1); m < mi+4; m++){ const acc = accOf(m), nx = dayOf(m+1, 1); let w;
        if ((w = wk(nx+4))) w.salaries += acc.salNet; if ((w = wk(nx+14))) w.suppliers += acc.ap; if ((w = wk(nx+24))) w.taxes += acc.payTax; }
      const yEst = y => KPN.adv[y] != null ? KPN.adv[y] : Math.max(0, Math.round((KPN.accr[y-1] || 0) / Math.max(1, Math.min(i, idxOf(y-1,11,31)) - idxOf(y-1,0,1) + 1) * 365 * P.citAdvK / 12 / 1000) * 1000);
      for (let m = mi; m < mi+5; m++){ const d = dayOf(m, 25), w = wk(d); if (w) w.cit += yEst(Y0 + Math.floor(m/12)); }
      for (let y = yOf(i); y <= yOf(i)+1; y++){ const d = idxOf(y,3,10), w = wk(d); if (w){ const st = KPN.settle[y-1] != null ? KPN.settle[y-1] : (KPN.accr[y-1] || 0) - 12*(KPN.adv[y-1] || 0); w.cit += st; } }
      for (let q = Math.floor(mi/3)-1; q <= Math.floor(mi/3)+1; q++){ if (q < 0) continue; const w = wk(dayOf(3*q+4, 25)); if (!w) continue; let v = 0; for (let m = 3*q; m < 3*q+3; m++) v += accOf(m).vat; w.vat += v; }
      for (const dv of DIVS){ let w; if ((w = wk(dv.day))) w.dividends += dv.net; if ((w = wk(dv.payDay))) w.taxes += dv.tax; }
      for (const [d, amt] of P.capex){ const w = wk(d); if (w) w.capex += amt; }
      { let lb = leasPrin[Math.min(i,DAYS-1)], li = leasInt[Math.min(i,DAYS-1)], d = i; for (let m = mi; m < mi+5 && lb > 0; m++){ const pd = dayOf(m, 12); if (pd <= i) continue; li += lb*P.leasing.rate/365*(pd-d); d = pd; const pay = Math.min(P.leasing.pay, lb+li), ip = Math.min(pay, li); lb -= pay-ip; li -= ip; const w = wk(pd); if (w) w.leasing += pay; } }
      (extra || []).forEach(x => { const w = wk(x.day); if (w) w.possible += x.amount; });
      let cash = bal('cash', i), all = cash;
      weeks.forEach(w => { w.taxes += w.vat + w.cit; w.other = w.leasing + w.dividends + w.capex; w.outflow = w.salaries + w.taxes + w.suppliers + w.other; cash += w.inflow - w.outflow; all += w.inflow - w.outflow - w.possible; w.cash = cash; w.cashAll = all; });
      return weeks;
    }
    // налоги за период: каждый день — по ставкам и базам своего года; ФОТ — начисленный к выплате (оклады, отпускные, сверхурочные)
    function taxes(from, to){
      const a = Math.max(0,from), b = Math.min(to,DAYS-1), T = k => b < a ? 0 : TXC[k][b+1] - TXC[k][a];
      const x = { fotGross:T('fot'), opv:T('opv'), vosms:T('vosms'), ipn:T('ipn'), so:T('so'), oosms:T('oosms'), opvr:T('opvr'), sn:T('sn'), vatOut:T('vatOut'), vatIn:T('vatIn'), divIpn:T('divIpn') };
      x.vat = x.vatOut - x.vatIn; x.cit = turn('cit',from,to); x.heads = b < a ? 0 : T('heads')/(b-a+1);
      x.employee = x.opv + x.vosms + x.ipn; x.employerSum = x.so + x.oosms + x.opvr + x.sn; x.total = x.employee + x.employerSum + x.vat + x.cit + x.divIpn;
      x.paid = -(cfTurn('payrollTaxes',from,to) + cfTurn('vat',from,to) + cfTurn('cit',from,to) + cfTurn('divTax',from,to)); x.rates = R(to);
      x.years = []; for (let y = yOf(a); y <= yOf(Math.max(a,b)); y++) x.years.push(y);
      return x;
    }
    // ближайшие сроки: зарплата 5-го; 25-го — налоги и взносы с ФОТ за прошлый месяц, аванс КПН текущего месяца, ИПН с дивидендов прошлого месяца,
    // НДС за квартал — 25-го второго месяца после квартала (форма 300.00 — до 15-го того же месяца); КПН за год — 100.00 до 31.03, доплата до 10.04
    function upcoming(i){
      const m = monthIdx(i), d = dOf(i);
      const sm = d < 5 ? m-1 : m, tm = d < 25 ? m-1 : m;
      const sal = sm >= 0 ? monthAcc[sm].salNet : 0;
      const nx = k => k+1 < NY*12 ? MONTHS[k+1].start : idxOf(Y0 + Math.floor((k+1)/12), (k+1)%12, 1);
      const tA = tm >= 0 ? monthAcc[tm] : { payTax:0, vat:0, cit:0 }, taxDay = (tm>=0 ? nx(tm) : 0) + 24, mt = tm + 1;
      const taxCit = KPN.adv[yOf(Math.min(taxDay, DAYS-1))] || 0;
      const vatQ = mt % 3 === 1 && mt >= 4 ? (mt-4)/3 : -1, taxVat = vatQ >= 0 ? quarterVat[vatQ] : 0;
      const taxDiv = DIVS.filter(x => monthIdx(x.day) === tm).reduce((s,x)=>s+x.tax,0);
      // следующий платёж НДС после даты: квартал и сумма (начислено за квартал на дату, если квартал не закрыт)
      let q = Math.floor(m/3) - 1; if (q < 0 || idxOf(Y0 + Math.floor((3*q+4)/12), (3*q+4)%12, 25) <= i) q++;
      const qEnd = Math.min(i, (3*q+3 < NY*12 ? MONTHS[3*q+3].start : DAYS) - 1), qStart = MONTHS[3*q].start;
      const vatNext = { q, day: idxOf(Y0 + Math.floor((3*q+4)/12), (3*q+4)%12, 25), f300: idxOf(Y0 + Math.floor((3*q+4)/12), (3*q+4)%12, 15), y: Y0 + Math.floor(3*q/12), qn: q%4 + 1,
        amount: qEnd >= qStart ? (TXC.vatOut[qEnd+1]-TXC.vatOut[qStart]) - (TXC.vatIn[qEnd+1]-TXC.vatIn[qStart]) : 0, complete: qEnd >= MONTHS[Math.min(NY*12-1,3*q+2)].end };
      const yC = idxOf(yOf(i),3,10) >= i ? yOf(i) - 1 : yOf(i);         // год, за который следующая декларация 100.00
      const citYear = { y: yC, decl: idxOf(yC+1,2,31), day: idxOf(yC+1,3,10), accrued: KPN.accr[yC] || 0, adv: 12*(KPN.adv[yC] || 0), settle: KPN.settle[yC] != null ? KPN.settle[yC] : (KPN.accr[yC] || 0) - 12*(KPN.adv[yC] || 0) };
      return { salDay: (sm>=0 ? nx(sm) : 0) + 4, sal, salFor: sm, taxDay, tax: tA.payTax + taxCit + taxVat + taxDiv, taxFor: tm, taxPay: tA.payTax, taxVat, vatQ, taxCit, taxDiv, vatNext, citYear };
    }
    function objView(o, from, to, asOf){
      const rev = sumO(o,'rev',from,to), guard = sumO(o,'guard',from,to), direct = sumO(o,'direct',from,to), overhead = sumO(o,'overhead',from,to), profit = rev - guard - direct - overhead;
      return { o, rev, guard, direct, overhead, profit, margin: rev ? profit/rev*100 : 0, plan: sumO(o,'plan',from,to), missed: sumO(o,'missed',from,to), late: sumO(o,'late',from,to), activeNow: active(o, asOf), tariffNow: tariff(o, Math.min(asOf,DAYS-1)) };
    }

    // ---------- кадры ----------
    const otCum = { h:new Float64Array(DAYS+1), cost:new Float64Array(DAYS+1), staff:new Float64Array(DAYS+1) };
    const resCum = new Float64Array(DAYS+1); for (let i=0;i<DAYS;i++) resCum[i+1] = resCum[i] + G.res[i] + Ad.res[i];   // изменение резерва отпусков с взносами (начисление − использование)
    for (let i=0;i<DAYS;i++){ otCum.h[i+1] = otCum.h[i] + otH[i]; otCum.cost[i+1] = otCum.cost[i] + G.ot[i]*(1+R(i).employer); otCum.staff[i+1] = otCum.staff[i] + staff[i]; }
    // сверхурочные за период: часы, на одного охранника в штате (в месяц и в годовом темпе), стоимость с взносами; предел ст. 78 ТК РК при суммированном учёте — 120 ч в год (и 2 ч в сутки)
    function overtime(from, to){
      const a = Math.max(0,from), b = Math.min(to,DAYS-1), n = Math.max(1, b-a+1), hrs = otCum.h[b+1]-otCum.h[a], st = (otCum.staff[b+1]-otCum.staff[a])/n;
      const perPerson = st ? hrs/st : 0, perMonth = perPerson/n*(365/12), y365 = (() => { const z = Math.max(0, b-364); return (otCum.h[b+1]-otCum.h[z]) / Math.max(1, (otCum.staff[b+1]-otCum.staff[z])/(b-z+1)); })();
      return { hours: hrs, staff: st, perPerson, perMonth, perYear: perPerson/n*365, last365: y365, cost: otCum.cost[b+1]-otCum.cost[a], normMonth: P.normYear/12, limitMonth: P.otMonth, limitYear: P.otYear, limitDay: P.otDay };
    }
    function hr(i){
      i = Math.max(0, Math.min(i, DAYS-1));
      const guards = Math.round(staff[i]), admin = adminCount(i), total = guards + admin, nd = Math.round(need[i]);
      const vac = Math.round(vacG[i]), sick = Math.round(sickG[i]);
      const absent = objects.reduce((s,o)=>s+sumO(o,'missed',i,i),0);
      const cert30 = Math.round(guards * (0.045 + 0.04*h(Math.floor(i/7),905)) * (1 - 0.4*Math.min(1,eff(i))));
      return { guards, admin, total, need: nd, vacancies: nd - guards, staffing: nd ? guards/nd*100 : 100, fte: totFte[i], vac, sick, absent, cert30, cert90: Math.round(cert30*2.6), training: Math.round(guards*0.05), medical: Math.round(guards*0.028), permits: 2 + Math.floor(h(Math.floor(i/14),906)*3) };
    }
    const hrRange = (from, to) => { const a = Math.max(from,0), b = Math.min(to,DAYS-1); return { hires: hrCum.hires[b+1]-hrCum.hires[a], fires: hrCum.fires[b+1]-hrCum.fires[a] }; };

    // ---------- события ----------
    const INC_TYPES = [[0.30,'ложное срабатывание сигнализации'],[0.22,'нарушение пропускного режима'],[0.14,'дисциплина охранника'],[0.12,'жалоба заказчика'],[0.10,'попытка проникновения'],[0.07,'медицинский случай'],[0.05,'повреждение имущества']];
    const RESULT = { 'ложное срабатывание сигнализации':'проверено ГБР, ложное', 'нарушение пропускного режима':'пресечено, передано заказчику', 'дисциплина охранника':'объяснительная, разбор', 'жалоба заказчика':'разбор с начальником объекта, ответ заказчику', 'попытка проникновения':'пресечена, вызвана полиция', 'медицинский случай':'первая помощь, скорая', 'повреждение имущества':'акт, претензия виновнику' };
    const incidents = [];
    for (const o of objects) for (let i=0;i<=FACT_END;i++){
      if (!active(o,i)) continue; const e = eff(i);
      if (h(o.id,i,31) < (o.is24 ? 0.0105 : 0.006) * (o.posts/2) * (1 - 0.3*Math.min(1,e))){
        const type = pickW(h(o.id,i,32), INC_TYPES);
        incidents.push({ day:i, time: String(Math.floor(h(o.id,i,33)*24)).padStart(2,'0')+':'+String(Math.floor(h(o.id,i,34)*60)).padStart(2,'0'), obj:o, type, result:RESULT[type], closeDay: i + 1 + Math.floor(h(o.id,i,35)*6*(1-0.4*Math.min(1,e))), react: Math.round((6 + h(o.id,i,36)*12)*(1-0.25*Math.min(1,e))) });
      }
    }
    incidents.sort((a,b)=>b.day-a.day || b.time.localeCompare(a.time));
    const checks = [];
    for (const o of objects) for (let m=0;m<NY*12;m++){
      const M0 = MONTHS[m]; if (M0.start > FACT_END) break;
      const e = eff(M0.start), n = h(o.id,m,40) < (0.55 + 0.45*Math.min(1,e)) ? 1 : 0;          // с системой проверки — каждый месяц
      if (!n) continue;
      const day = M0.start + Math.floor(h(o.id,m,41)*M0.dim); if (day > FACT_END || !active(o,day)) continue;
      const score = pickW(h(o.id,m,42), [[0.55,5],[0.28,4],[0.12,3],[0.05,2]]);
      const who = pickW(h(o.id,m,43), [[0.5,'Начальник охраны'],[0.35,'Зам. по регионам'],[0.15,'Исп. директор']]);
      const ch = { day, obj:o, who, score, result: score>=5?'замечаний нет':(score===4?'мелкие замечания, устранены на месте':'нарушение — выдано предписание') };
      if (score <= 3) ch.presc = { what: pickW(h(o.id,m,44), [[0.3,'журнал приёма-сдачи ведётся с пропусками'],[0.25,'форма не по сезону'],[0.2,'нет освещения поста'],[0.15,'не обновлена инструкция поста'],[0.1,'неисправна рация']]), fixDay: day + 2 + Math.floor(h(o.id,m,45)*10*(1-0.5*Math.min(1,e))) };
      checks.push(ch);
    }
    checks.sort((a,b)=>b.day-a.day);
    const prescOpen = i => checks.filter(c => c.presc && c.day <= i && c.presc.fixDay > i);

    // ---------- продажи ----------
    const reqs = [];
    for (let i=0;i<=FACT_END;i++) if (h(i,51) < 0.5 + 0.15*Math.min(1,eff(i))){
      const e = eff(i), kp = h(i,52) < 0.62 + 0.15*Math.min(1,e), neg = kp && h(i,53) < 0.48 + 0.12*Math.min(1,e);
      reqs.push({ day:i, kpDay: kp ? i+3 : null, negDay: neg ? i+10 : null });
    }
    function funnel(from, to, f){
      const inR = d => d!=null && d>=from && d<=to, os = objects.filter(o => !f || f(o));
      return { requests: reqs.filter(r=>inR(r.day)).length, kp: reqs.filter(r=>inR(r.kpDay)).length, neg: reqs.filter(r=>inR(r.negDay)).length,
        signed: os.filter(o=>inR(o.signDay)).length, launched: os.filter(o=>inR(o.start)).length, terminated: os.filter(o=>inR(o.terminated)).length };
    }
    const CAC = { 'Прямой договор':380000, 'Тендер / госзакупки':920000, 'Субподряд партнёра':150000, 'Заявка с сайта':450000 };

    // ---------- автопарк, 1С, документы, задачи ----------
    function fleetAt(cars, i){
      return cars.map(c => {
        const kmMonth = c.role.includes('ГБР') ? 2900 : (c.role.includes('развозка') ? 3400 : 2100);
        const kmAt = Math.max(0, Math.round(c.km - kmMonth*(FACT_END - i)/30.4)); const next = Math.ceil((kmAt+1)/10000)*10000;
        const anniv = s => { const [y,m,d] = s.split('-').map(Number); let a = idxOf(y,m-1,d); while (a - 365 > i) a -= 365; while (a < i) a += 365; return a; };
        const ins = anniv(c.insurance), insp = anniv(c.inspection);
        return { ...c, kmAt, toLeft: next - kmAt, insDay: ins, inspDay: insp, insLeft: ins - i, inspLeft: insp - i };
      });
    }
    // расходы автопарка = строка «Транспорт и ГСМ» ОПиУ, распределённая по машинам долей их нормы расходов
    const fleetCost = (cars, from, to) => { const t = pl(Math.max(0,from), Math.min(to,DAYS-1)).transport; return cars.reduce((s,c)=>s + t*c.costM/P.opex.transport, 0); };
    function onec(i){
      const fail = i === FACT_END ? 'effector' : (h(i,61) < 0.012 ? 'export' : null);
      const used = Math.min(0.83, 0.40 + 0.43*Math.max(0, i - idxOf(2025,0,1))/(FACT_END - idxOf(2025,0,1)));
      return { exportsOk: fail==='export' ? 143 - Math.floor(h(i,62)*5) : 144, exportsTotal:144, effectorOk: fail!=='effector', exportRejected: fail==='export', sessions: 5 + Math.floor(h(i,63)*5), errors: fail ? 3 : Math.floor(h(i,64)*3), diskBackupFree: Math.max(0.17, 1 - used), cpu: 18 + Math.floor(h(i,65)*25), ram: 52 + Math.floor(h(i,66)*16), live: i >= LAUNCH_DEMO && SC.k>0 };
    }
    const DOC_TYPES = [['Приказ',1.1],['Служебная записка',0.25],['Акт проверки',0.6],['Договор / допсоглашение',0.15],['График смен',1.55],['Табель',1.55],['Заявка на закупку',0.14],['Акт неисправности',0.1],['Отчёт директору',1.0],['Претензия / ответ',0.07]];
    function docs(from, to){ return DOC_TYPES.map(([t, perDay], k) => { let n = 0; for (let i=Math.max(0,from); i<=Math.min(to,FACT_END); i++){ const x = perDay * (t==='График смен'||t==='Табель' ? (dOf(i)<=3 ? 15 : 0) : 1); n += Math.floor(x) + (h(i,k,71) < x%1 ? 1 : 0); } return { type:t, n }; }); }
    const TASK_OWN = ['Начальник охраны','Кадровик','Юрист','Бухгалтер','Снабженец','Механик','Коммерческий директор','Администратор системы'];
    const TASK_TXT = { 'Начальник охраны':'Закрыть смену / разобрать замечание', 'Кадровик':'Приказ и обновление графика', 'Юрист':'Проверка проекта договора / ответа заказчику', 'Бухгалтер':'Сверка оплат и акт сверки', 'Снабженец':'Заявка на имущество для поста', 'Механик':'ТО / страховка автомобиля', 'Коммерческий директор':'Письмо заказчику по оплате / тарифу', 'Администратор системы':'Проверка копий и выгрузок 1С' };
    const TASK_SRC = ['сигнал','регламент','поручение','срок документа','дебиторка','проверка'];
    const tasksAll = [];
    for (let i=Math.max(0,LAUNCH_DEMO-60);i<=FACT_END;i++){ const n = 1 + Math.floor(h(i,81)*3); for (let k=0;k<n;k++){ const own = TASK_OWN[Math.floor(h(i,k,82)*TASK_OWN.length)], life = 1 + Math.floor(h(i,k,83)*7), obj = objects[Math.floor(h(i,k,84)*objects.length)]; tasksAll.push({ no:'T-'+(1000+tasksAll.length), title: TASK_TXT[own] + ' — ' + obj.name, owner:own, src: TASK_SRC[Math.floor(h(i,k,85)*TASK_SRC.length)], created:i, due: i+life, done: h(i,k,86) < 0.08 ? i+life+2+Math.floor(h(i,k,87)*4) : i+life-Math.floor(h(i,k,88)*life), pr: h(i,k,89)<0.15?'срочно':(h(i,k,90)<0.4?'высокий':'средний') }); } }
    objects.filter(o=>o.missedPost).forEach((o,k)=>tasksAll.push({ no:'T-'+(5000+k), title:`Закрыть смену: ${o.name}, пост ${o.missedPost} — замена из резерва`, owner:'Начальник охраны', src:'сигнал', created:FACT_END, due:FACT_END, done:9999, pr:'срочно', story:true }));
    tasksAll.push({ no:'T-5010', title:'Перенести старые копии на архивный диск (без удаления), повторить задание Effector Saver', owner:'Администратор системы', src:'1С', created:FACT_END, due:FACT_END, done:9999, pr:'срочно', story:true, wait:true });
    function tasksAt(i){ return tasksAll.filter(t => t.created <= i && t.done > i).map(t => { const age = i - t.created, life = Math.max(1, t.due - t.created); return { ...t, status: t.wait ? 'ждёт разрешения' : (age/life < 0.4 ? 'в работе' : (age/life < 0.8 ? 'на проверке' : 'на согласовании')), overdue: t.due < i }; }); }
    const tasksDone = (from, to) => tasksAll.filter(t => t.done >= from && t.done <= to);
    const tasksCreated = (from, to) => tasksAll.filter(t => t.created >= from && t.created <= to).length;
    function budget(from, to){
      const f = pl(from, to); let k = 0, n = 0;
      for (let m=monthIdx(Math.max(from,0)); m<=monthIdx(Math.min(to,DAYS-1)); m++){ k += 1 + 0.06*(h(m,91)-0.35); n++; }
      const kr = n ? k/n : 1;
      const plan = { revenue: f.revenue*kr, guardC: f.guardC*kr*0.985, adminC: f.adminC, uniform: f.uniform*1.02, transport: f.transport*0.95, comms: f.comms, office: f.office, other: f.other*1.08, it: f.it, selling: f.selling*1.05 };
      plan.opex = plan.uniform + plan.transport + plan.comms + plan.office + plan.other + plan.it + plan.selling; plan.ebitda = plan.revenue - plan.guardC - plan.adminC - plan.opex;
      return { plan, fact: f };
    }

    return { scenario: scnKey, SC, SCENARIOS, Y0, NY, DAYS, FACT_END, LAUNCH_DEMO, LAUNCH, DAY0, MONTHS, toDate, idxOf, fmt, fmtShort, iso, fromIso, yOf, mOf, dOf, monthIdx, RATES, R, FX, fx, P, REGIONS, CHANNELS, CAC,
      customers, objects, active, tariff, sumO, objView, upcoming, pl, balance, equityChanges, equityAt, reserveLog, accBal: bal, accTurn: turn, cashflow, receivables, aging, forecast13, taxes, hr, hrRange, incidents, checks, prescOpen, funnel, fleetAt, fleetCost, onec, docs, tasksAt, tasksDone, tasksCreated, budget, acts, eff,
      totPosts: i => totPosts[Math.max(0,Math.min(i,DAYS-1))], totFte: i => totFte[Math.max(0,Math.min(i,DAYS-1))], adminCount, ledgerImbalance: () => imbalance,
      overtime, leasingSplit, dividendsLog: DIVS, divIpn, fixedAssets: FA, citLog: KPN, quarterVat: q => quarterVat[q], postHours: i => reqH[Math.max(0,Math.min(i,DAYS-1))], finIncome: (a,b) => -turn('finInc',a,b), vacResChange: (a,b) => { a = Math.max(0,a); b = Math.min(b,DAYS-1); return b < a ? 0 : resCum[b+1]-resCum[a]; } };
  }

  const cache = {};
  window.buildWorld = key => cache[key] || (cache[key] = build(key));
  window.SCENARIOS = SCENARIOS;
  window.WORLD = window.buildWorld('base');
})();
