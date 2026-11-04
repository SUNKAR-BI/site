// SUNKAR BI · i18n-content.js — английский язык для СОДЕРЖИМОГО интерфейса (разделы ядра app.js, тексты мира world.js/catalog.js).
// Подключается сразу после i18n.js. Русский язык не меняется ни на символ: всё ниже работает только при I18N.lang === 'en'.
//
// Как устроено:
//   1) I18N.phrases('en', { 'русский текст': 'English text' }) — перевод по самому русскому тексту (точное совпадение, без пробелов по краям);
//   2) I18N.templates('en', { 'Смены на {d}': 'Shifts as of {d}' }) — шаблоны с подстановками:
//        {n} {m} {k} (и n1, m2 …) — число (как есть), остальные имена ({a}, {d}, {x} …) — текст, переводится рекурсивно;
//        [смена|смены|смен] — любой из вариантов русского склонения; в английском {n?site|sites} — форма по числу n;
//   3) составные строки «A · B — C» переводятся по частям (разделители · — ; : , / →), имена-номера мира — I18N.w;
//   4) перевод выполняется на выводе: I18N.tx(s) и проход по DOM (текстовые узлы и атрибуты title/placeholder/aria-label/alt)
//      после каждой перерисовки и для всего, что модули дописывают в страницу (MutationObserver). Разметка и классы не меняются.
//   При возврате на RU исходные русские узлы восстанавливаются, затем ядро перерисовывает страницу.
//   I18N.untranslated — Map(строка → число встреч) того, что не нашлось в словаре (для tools/i18n-check.js).
//   Не переводятся: поля ввода (value), [contenteditable], элементы с атрибутом data-noi18n и их потомки.
(function(){
  'use strict';
  const I = window.I18N; if (!I || !I._phr) return;
  const PHR = I._phr.en || (I._phr.en = {});
  const CYR = /[А-Яа-яЁё]/;
  const TPL = [], cache = new Map(), untranslated = new Map();
  const NUM = '[−+\\-]?\\d+(?:[.,\\u00a0\\u202f]\\d+)*(?:\\s?%)?';
  const MON = 'Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec';
  const DATE = `\\d{1,2} (?:${MON})(?: \\d{4})?(?:,? \\d{1,2}:\\d{2})?|(?:${MON}) \\d{4}|\\d{1,2}:\\d{2}|\\d{2}\\.\\d{2}(?:\\.\\d{4})?|\\d{4}`;
  const MONEY = '[−+\\-]?[₸$€₽]?\\s?(?:\\d{1,3}(?:[ \\u00a0\\u202f]\\d{3})+(?:,\\d+)?|\\d[\\d.,]*)(?:\\s?(?:K|M|B|тыс\\.?|млн|млрд))?(?:\\s?[₸$€₽])?';
  // имена подстановок: n m k (+цифра) — число; d — дата; v — сумма; остальные — текст (переводится рекурсивно)
  const isNumKey = k => /^[nmkdv]\d?$/.test(k);
  const PAT = k => k[0] === 'd' ? DATE : (k[0] === 'v' ? MONEY : NUM);
  const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // ---------- шаблоны ----------
  function compile(ru, en){
    const keys = [], lits = []; let re = '', alt = 0;
    for (const p of ru.split(/(\{\w+\}|\[[^\]|]*\|[^\]]*\])/)){
      if (!p) continue;
      const m = p.match(/^\{(\w+)\}$/);
      if (m){ keys.push(m[1]); re += isNumKey(m[1]) ? `(${PAT(m[1])})` : '([\\s\\S]+?)'; }
      else if (p[0] === '[' && p.includes('|')){ const alts = p.slice(1, -1).split('|'); re += '(?:' + alts.map(reEsc).join('|') + ')'; alt += Math.min(...alts.map(x => x.length)); }
      else { re += reEsc(p); lits.push(p); }
    }
    const lit = lits.filter(x => CYR.test(x)).sort((a, b) => b.length - a.length)[0] || '';
    return { re: new RegExp('^' + re + '$'), keys, en, lit, ru, w: lits.join('').length + alt };
  }
  function templates(l, map){
    if (l !== 'en') return;
    for (const ru in map) TPL.push(compile(ru, map[ru]));
    TPL.sort((a, b) => b.w - a.w);              // длинные (более точные) шаблоны — первыми
    cache.clear();
  }
  const numOf = v => { const x = parseFloat(String(v).replace(/[,  \s]/g, '').replace('−', '-')); return isFinite(x) ? x : 2; };
  const MONS = MON.split('|');
  const enDate = x => { let m = x.match(/^(\d{2})\.(\d{2})\.(\d{4})$/); if (m) return `${+m[1]} ${MONS[m[2] - 1]} ${m[3]}`; m = x.match(/^(\d{2})\.(\d{2})$/); if (m) return `${+m[1]} ${MONS[m[2] - 1]}`; return x; };
  // число из русского текста мира: «0,3 %» → «0.3%», «1 200» → «1,200»; английские «1,326» не трогаем
  const enNum = x => String(x).replace(/\s%$/, '%').replace(/(\d),(\d{1,2})(?!\d)/g, '$1.$2').replace(/(\d)[\u00a0\u202f](?=\d{3})/g, '$1,');
  // сумма из русского текста мира: «120 млн ₸» → «₸120 M», «149 000 ₸» → «₸149,000»
  const UNIT = { 'тыс': 'K', 'тыс.': 'K', 'млн': 'M', 'млрд': 'B', K: 'K', M: 'M', B: 'B' };
  const enMoney = x => {
    const m = String(x).match(/^([−+\-]?)([₸$€₽]?)\s?([\d.,\u00a0\u202f ]*\d)\s?(K|M|B|тыс\.?|млн|млрд)?\s?([₸$€₽]?)$/);
    if (!m) return enNum(x);
    const num = enNum(m[3].replace(/ (?=\d{3}\b)/g, '\u00a0'));
    return m[1] + (m[2] || m[5]) + num + (m[4] ? ' ' + UNIT[m[4]] : '');
  };
  function fillT(T, m){
    const v = {}; T.keys.forEach((k, i) => { v[k] = m[i + 1]; });
    return T.en.replace(/\{(\w+)(?:\?([^}]*))?\}/g, (all, k, forms) => {
      if (!(k in v)) return all;
      if (forms != null){ const f = forms.split('|'); return Math.abs(numOf(v[k])) === 1 ? f[0] : (f[1] != null ? f[1] : f[0]); }
      if (k[0] === 'd') return enDate(v[k]);
      if (k[0] === 'v') return enMoney(v[k]);
      return isNumKey(k) ? enNum(v[k]) : core(v[k]);
    });
  }

  // ---------- имена-номера мира ----------
  const NAMES = [
    [/ТОО «Заказчик-(\d+)»/g, 'Customer-$1 LLP'], [/ТОО «Заказчик-(\d+)/g, 'Customer-$1 LLP'], [/Заказчик-(\d+)/g, 'Customer-$1'],
    [/(?:Объект|объект|Объекта|объекта|Объекту|объекту|Объектом|объектом|Объекте|объекте) № ?(\d+)/g, 'Site No. $1'],
    [/(?:пост|поста|посту|посте) (\d+)/g, 'post $1'], [/№ ?(\d)/g, 'No. $1'],
    [/(^|[^А-Яа-яЁё])П-(\d{4})-(\d+)/g, '$1E-$2-$3'], [/(^|[^А-Яа-яЁё])СЗ-(\d+)/g, '$1M-$2'], [/(^|[^А-Яа-яЁё])ЗО-(\d{4})-(\d+)/g, '$1PR-$2-$3'], [/(^|[^А-Яа-яЁё])Н-(\d{4})-(\d+)/g, '$1T-$2-$3'],
    // живые номера (live.js): проекты ПР-, поручения Р-, отчёты О- — в данных остаются русскими, на EN показываются латиницей
    [/(^|[^А-Яа-яЁё])ПР-(\d{4})-(\d+)/g, '$1PJ-$2-$3'], [/(^|[^А-Яа-яЁё])Р-(\d+)(?![\dА-Яа-яЁё])/g, '$1RT-$2'], [/(^|[^А-Яа-яЁё])О-(\d{4})-(\d+)/g, '$1RP-$2-$3'],
    [/(\d)-к(?![А-Яа-яЁё])/g, '$1-P'], [/(\d)-о(?![А-Яа-яЁё])/g, '$1-O'],
  ];
  const names = s => { let r = s; for (const [re, to] of NAMES) r = r.replace(re, to); return r; };
  const uc = s => s.charAt(0).toUpperCase() + s.slice(1), lc = s => s.charAt(0).toLowerCase() + s.slice(1);
  function look(s){
    let p = PHR[s]; if (p != null) return p;
    const c = s.charAt(0);
    if (c !== c.toUpperCase()){ p = PHR[uc(s)]; if (p != null) return /^[A-Z][a-z]/.test(p) && !/^(AI|AR|SUNKAR|EBITDA|DSO|KPI|CSV|ID)\b/.test(p) ? lc(p) : p; }
    else if (c !== c.toLowerCase()){ p = PHR[lc(s)]; if (p != null) return uc(p); }
    return null;
  }

  // ---------- перевод строки ----------
  const SEPS = [' · ', ' — ', ' – ', '; ', ': ', '. ', ', ', ' / ', ' → ', ' + ', ' | ', ' = ', ' − ', ' × ', ' ÷ '];
  const WRAP = /^([\s▲▼⚠✓✔✕✗★☆✦•·—–\-+()«»“”"'№⓵ⓘ🔒🔔📎🎤✎⌛⏱⏸▶■□●○◆◇…↑↓→←↗↘]+)?([\s\S]*?)([\s.:;,!?…()«»“”"'%*·—–]+)?$/;
  const cyrN = s => (s.match(/[А-Яа-яЁё]/g) || []).length;
  // кандидаты перевода пробуются по очереди; первый полностью английский — ответ, иначе — тот, где меньше кириллицы
  function core(s, depth = 0){
    if (!CYR.test(s)) return s;
    let p = look(s); if (p != null) return p;
    let s2 = names(s);
    if (s2 !== s){ if (!CYR.test(s2)) return s2; p = look(s2); if (p != null) return p; }
    if (depth > 8) return miss(s2);
    // текст в кавычках переводится отдельно: «Errand E-2026-1532 “Список решений…” accepted»
    const s3 = s2.replace(/([«“"])([^«»“”"]*[А-Яа-яЁё][^«»“”"]*)([»”"])/g, (m, q1, x, q2) => q1 + core(x, depth + 1) + q2);
    if (s3 !== s2){ if (!CYR.test(s3)) return s3; p = look(s3); if (p != null) return p; s2 = s3; }
    const m0 = MISS.length; let best = null, bestM = null, bestN = Infinity;
    const tryIt = fn => {
      const r = fn(); if (r == null) return false;
      const k = cyrN(r);
      if (!k){ MISS.length = m0; return r; }
      if (k < bestN){ best = r; bestN = k; bestM = MISS.slice(m0); }
      MISS.length = m0; return false;
    };
    let r;
    for (const T of TPL){
      if (T.lit && !s2.includes(T.lit)) continue;
      const m = T.re.exec(s2); if (!m) continue;
      if ((r = tryIt(() => fillT(T, m))) !== false) return r;
    }
    const w = s2.match(WRAP);
    if (w && (w[1] || w[3]) && w[2] && w[2] !== s2 && (r = tryIt(() => (w[1] || '') + core(w[2], depth + 1) + (w[3] || ''))) !== false) return r;
    for (const sep of SEPS){
      if (!s2.includes(sep)) continue;
      if ((r = tryIt(() => s2.split(sep).map(x => x.trim() ? core(x, depth + 1) : x).join(sep))) !== false) return r;
    }
    const lat = s2.match(/^([A-Za-z0-9][\w\s.,:;()'’&/+-]*?[\s(“"«])([«“"]?[А-ЯЁа-яё][\s\S]*)$/);   // «English prefix + русский хвост» (подписи модулей с русскими данными)
    if (lat && (r = tryIt(() => lat[1] + core(lat[2], depth + 1))) !== false) return r;
    const sp = s2.match(/^([\s\S]+?) (\([^()]*\))$/);   // «текст (уточнение)»
    if (sp && (r = tryIt(() => core(sp[1], depth + 1) + ' ' + core(sp[2], depth + 1))) !== false) return r;
    if (best != null && bestN < cyrN(s2)){ MISS.push(...bestM); return best; }
    return miss(s2);
  }
  let MISS = [];
  function miss(s){ if (CYR.test(s)) MISS.push(s); return s; }
  const note = list => list.forEach(s => untranslated.set(s, (untranslated.get(s) || 0) + 1));
  const QUOTES = s => s.replace(/«/g, '“').replace(/»/g, '”');
  const PCT = /(\d)[ \u00a0\u202f]%/g;           // «12,5 %» из шаблонов ядра → «12.5%» (английская запись процентов)
  function tr(s){
    if (s == null) return s;
    if (!CYR.test(s)) return PCT.test(s) ? (PCT.lastIndex = 0, s.replace(PCT, '$1%')) : s;
    const c = cache.get(s); if (c !== undefined){ if (c.m.length) note(c.m); return c.r; }
    const m = String(s).match(/^(\s*)([\s\S]*?)(\s*)$/);
    MISS = [];
    const r = (m[1] + QUOTES(core(m[2])) + m[3]).replace(PCT, '$1%');
    cache.set(s, { r, m: MISS }); note(MISS); return r;
  }

  // ---------- I18N.tx: точный перевод + шаблоны + составные строки ----------
  const fill = (s, vars) => vars ? String(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : s;
  const tx0 = I.tx;
  I.tx = (s, vars) => {
    if (I.lang === 'ru' || s == null) return tx0(s, vars);
    const p = PHR[s]; if (p != null) return fill(p, vars);
    return fill(tr(String(s)), vars);
  };
  const w0 = I.w;
  I.w = s => (I.lang === 'ru' || s == null) ? w0(s) : tr(names(String(s)));

  // ---------- проход по DOM ----------
  const ATTRS = ['title', 'placeholder', 'aria-label', 'alt', 'data-tip'];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'NOSCRIPT']);
  const ORIG = new WeakMap(), ORIGA = new WeakMap();
  const skipEl = el => { for (let e = el; e && e.nodeType === 1; e = e.parentNode){ if (SKIP.has(e.tagName) || e.isContentEditable || e.hasAttribute('data-noi18n')) return true; } return false; };
  function doText(n){
    const v = n.nodeValue; if (!v || !(CYR.test(v) || /\d[ \u00a0\u202f]%/.test(v)) || skipEl(n.parentNode)) return;
    const r = tr(v); if (r !== v){ ORIG.set(n, [v, r]); n.nodeValue = r; }
  }
  function doAttrs(el){
    if (el.nodeType !== 1) return;
    for (const a of ATTRS){
      const v = el.getAttribute(a); if (!v || !CYR.test(v)) continue;
      if (skipEl(el)) return;
      const r = tr(v); if (r !== v){ const o = ORIGA.get(el) || {}; o[a] = [v, r]; ORIGA.set(el, o); el.setAttribute(a, r); }
    }
  }
  function translate(root){
    if (I.lang !== 'en' || !root) return;
    if (root.nodeType === 3){ doText(root); return; }
    if (root.nodeType !== 1 && root.nodeType !== 9 && root.nodeType !== 11) return;
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    while ((n = tw.nextNode())) doText(n);
    if (root.nodeType === 1) doAttrs(root);
    if (root.querySelectorAll) root.querySelectorAll('[title],[placeholder],[aria-label],[alt],[data-tip]').forEach(doAttrs);
  }
  function restore(root = document){
    const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
    while ((n = tw.nextNode())){ const o = ORIG.get(n); if (o && n.nodeValue === o[1]) n.nodeValue = o[0]; ORIG.delete(n); }
    root.querySelectorAll('*').forEach(el => { const o = ORIGA.get(el); if (!o) return; for (const a in o) if (el.getAttribute(a) === o[a][1]) el.setAttribute(a, o[a][0]); ORIGA.delete(el); });
  }
  let obs = null;
  function observe(){
    if (obs || typeof MutationObserver === 'undefined') return;
    obs = new MutationObserver(recs => {
      if (I.lang !== 'en') return;
      for (const r of recs){
        if (r.type === 'characterData') doText(r.target);
        else if (r.type === 'attributes') doAttrs(r.target);
        else r.addedNodes.forEach(translate);
      }
    });
    obs.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  const unobserve = () => { if (obs){ obs.disconnect(); obs = null; } };
  I.on(l => { if (l === 'en'){ observe(); queueMicrotask(() => translate(document)); } else { unobserve(); restore(document); } });
  if (I.lang === 'en'){ observe(); const start = () => translate(document); if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start(); }

  // ключи разделов ядра, добавленные в 0.8 (раздел «Обновить данные»)
  I.add('ru', {
    'rf.sub': 'цикл данных движка: выгрузки 1С, Битрикс24, отметки смен, сверки',
    'rf.exports': 'Выгрузки 1С на {d}', 'rf.exp_ok': 'приняты, сверка с ОСВ сходится', 'rf.exp_bad': 'выгрузка отклонена — в отчётах последняя принятая версия',
    'rf.backup': 'Ночные копии 1С', 'rf.bk_ok': 'выполнены', 'rf.bk_bad': 'не выполнены', 'rf.bk_d': 'Effector Saver и MS SQL · подробно в «Сервер и 1С»',
    'rf.mode': 'Где считаются отчёты', 'rf.mode_srv': 'сервер Агентства', 'rf.mode_srv_d': 'движок проверяет данные каждые 10 минут', 'rf.mode_local': 'в этом браузере', 'rf.mode_local_d': 'демо-данные из книги проводок, без подключения к 1С',
    'rf.last': 'Последний пересчёт', 'rf.last_d': 'в этом сеансе ещё не запускался', 'rf.last_ok': 'все разделы пересчитаны из книги проводок',
    'rf.now_t': 'Пересчитать сейчас', 'rf.now': 'Пересчитать отчёты',
    'rf.now_d': 'Пересчитывает все разделы на дату «Данные на» и выбранный период; на сервере Агентства — сначала запрашивает у движка состояние последнего цикла.',
    'rf.srv_ok': 'цикл движка в {a} · {s}', 'rf.srv_off': 'нет связи с сервером — пересчитано по данным страницы',
  });
  I.add('en', {
    'rf.sub': 'engine data cycle: 1C exports, Bitrix24, shift check-ins, reconciliations',
    'rf.exports': '1C exports as of {d}', 'rf.exp_ok': 'accepted, reconciliation with the trial balance matches', 'rf.exp_bad': 'export rejected — reports use the last accepted version',
    'rf.backup': 'Nightly 1C copies', 'rf.bk_ok': 'completed', 'rf.bk_bad': 'failed', 'rf.bk_d': 'Effector Saver and MS SQL · details in “Server & 1C”',
    'rf.mode': 'Where reports are calculated', 'rf.mode_srv': 'Agency server', 'rf.mode_srv_d': 'the engine checks the data every 10 minutes', 'rf.mode_local': 'in this browser', 'rf.mode_local_d': 'demo data from the general ledger, no connection to 1C',
    'rf.last': 'Last recalculation', 'rf.last_d': 'not yet run in this session', 'rf.last_ok': 'all sections recalculated from the general ledger',
    'rf.now_t': 'Recalculate now', 'rf.now': 'Recalculate reports',
    'rf.now_d': 'Recalculates all sections for the “Data as of” date and the selected period; on the Agency server it first asks the engine for the state of the last cycle.',
    'rf.srv_ok': 'engine cycle at {a} · {s}', 'rf.srv_off': 'no connection to the server — recalculated from the page data',
  });

  // ---------- ОПиУ по уровням (0.8.2): форма МСФО, расходы по функциям ----------
  I.add('ru', {
    'pl.q.net': 'ОПиУ по уровням: чистая прибыль = книга проводок', 'pl.q.tax': 'Взносы работодателя = ставкам и базам закона (по годам)', 'pl.q.sga': 'Коммерческие + административные = статьи администрации',
    'pl.cd.path': 'Место в отчёте', 'pl.cd.how': 'Как выделено', 'pl.cd.kids': 'Разложение строки',
    'pl.f.fot': 'ФОТ = начисленная статья «ФОТ с взносами» ÷ (1 + ставка взносов работодателя; {y} г. — {e}).', 'pl.f.tax': 'Взносы работодателя = статья «ФОТ с взносами» − ФОТ (ставка {y} г. — {e} оклада): СО, ООСМС, ОПВР, СН — по базам закона.',
    'pl.f.taxk': 'Вид взноса — по ставке и базе закона своего года: СО — от оклада − ОПВ, СН — от оклада − ОПВ − ВОСМС (до 2026 — минус СО), ООСМС и ОПВР — от оклада.', 'pl.f.staff': 'Доля коммерческой службы (коммерческий директор и менеджеры) в численности администрации на каждый день по орг. структуре.',
    'pl.f.other': '«Прочие»: доля продаж за год = стоимость привлечения подписанных договоров года по каналу (не больше 60 % «Прочих» года), внутри года — равномерно; остаток — административные.', 'pl.f.tot': 'Итог = сумма разделов выше по порядку отчёта.',
    'pl.calc_h': 'ОПиУ по уровням', 'pl.title': 'Отчёт о прибыли или убытке (ОПиУ)', 'pl.sub': 'МСФО · расходы по функциям · начисления по дням за ровно дни периода',
    'pl.n.revenue': 'Выручка (без НДС)', 'pl.n.rev_t24': 'Круглосуточные посты', 'pl.n.rev_tday': 'Дневные посты', 'pl.n.rev_vahta': 'Вахтовые посты (15/15)',
    'pl.n.cogs': 'Себестоимость оказанных услуг', 'pl.n.guardFot': 'ФОТ охранников', 'pl.n.guardTax': 'Налоги и взносы работодателя с ФОТ охраны',
    'pl.n.tax_so': 'Социальные отчисления (СО)', 'pl.n.tax_oosms': 'Отчисления на ОСМС', 'pl.n.tax_opvr': 'Пенсионные взносы работодателя (ОПВР)', 'pl.n.tax_sn': 'Социальный налог (до 2026 — за вычетом СО)',
    'pl.n.uniform': 'Форма и спецсредства', 'pl.n.transport': 'Транспорт и ГСМ (ГБР, развозка)', 'pl.n.comms': 'Связь на постах',
    'pl.n.gross': 'Валовая прибыль', 'pl.n.grossM': 'Валовая маржа, %',
    'pl.n.sales': 'Коммерческие расходы', 'pl.n.salesFot': 'ФОТ коммерческой службы', 'pl.n.salesTax': 'Налоги и взносы работодателя с ФОТ коммерческой службы',
    'pl.n.sales_tenders': 'Тендеры и госзакупки: подготовка заявок, банковские гарантии, ЭЦП', 'pl.n.sales_ads': 'Реклама и сайт', 'pl.n.sales_repr': 'Представительские и командировочные по продажам', 'pl.n.crm': 'CRM коммерческой службы (Битрикс24, подписка)',
    'pl.n.admin': 'Административные расходы', 'pl.n.adminFot': 'ФОТ администрации', 'pl.n.adminTax': 'Налоги и взносы работодателя с ФОТ администрации',
    'pl.n.office': 'Офис и аренда', 'pl.n.it': 'ИТ и система', 'pl.n.other': 'Прочие административные',
    'pl.n.ebitda': 'EBITDA', 'pl.n.ebitdaM': 'Маржа EBITDA, %', 'pl.n.dep': 'Амортизация основных средств', 'pl.n.ebit': 'Операционная прибыль (EBIT)',
    'pl.n.fin': 'Финансовые доходы и расходы', 'pl.n.interest': 'Проценты по лизингу', 'pl.n.finInc': 'Финансовые доходы (овернайт-депозит, 12–15 % годовых)',
    'pl.n.ebt': 'Прибыль до налогообложения', 'pl.n.cit': 'Корпоративный подоходный налог (КПН 20 %)', 'pl.n.net': 'Чистая прибыль', 'pl.n.netM': 'Чистая маржа, %',
    'pl.c.period': 'За период', 'pl.c.share': '% к выручке', 'pl.c.dprev': 'Δ к прошлому', 'pl.c.dyago': 'Δ к году назад', 'pl.c.exec': 'Исполнение', 'pl.c.total': 'Итого',
    'pl.tip.share': 'Сумма строки по модулю ÷ выручка периода × 100; у строк маржи — сама маржа.', 'pl.tip.exec': 'Факт ÷ план бюджета (БДР) × 100; зелёный — в пользу компании. Ниже EBITDA статьи в бюджет не входят.',
    'pl.bar': 'Уровни отчёта', 'pl.collapse_all': 'Свернуть всё', 'pl.level2': 'Подстатьи', 'pl.expand_all': 'Развернуть всё', 'pl.expand': 'Развернуть «{n}»', 'pl.collapse': 'Свернуть «{n}»',
    'pl.mode': 'Колонки', 'pl.m.period': 'За период', 'pl.m.months': 'По месяцам', 'pl.m.years': 'По годам', 'pl.rows': '{n} строк · {g} раскрываются',
    'pl.sign_ch': 'знак строки сменился — показана разница суммы', 'pl.csv.level': 'Уровень', 'pl.csv.code': 'Код строки',
    'pl.note': 'Доходы — со знаком «+», расходы — со знаком «−»; итоговые строки выделены. Δ — изменение суммы строки (▲ рост, ▼ снижение), цвет — влияние на прибыль: зелёный в пользу компании, красный — против. План — из бюджета (БДР) до EBITDA. ▸ — раскрыть строку, → / ← с клавиатуры; раскрытие запоминается.',
    'pl.calc': 'Отчёт о прибыли или убытке — по МСФО (IAS 1), расходы по функциям: выручка → себестоимость услуг → валовая прибыль → коммерческие → административные → EBITDA → амортизация → операционная прибыль → финансовые доходы и расходы → прибыль до налогообложения → КПН → чистая прибыль. Все строки — из книги проводок за дни периода; подстатьи в сумме равны статье, разделы — итогам, чистая прибыль — той же, что в кокпите, капитале и бюджете. Выручка (без НДС) раскрывается по видам постов (круглосуточные, дневные, вахта), регионам и объектам. ФОТ охраны = штат (FTE постов × 1,05) × оклад + сверхурочные 1,5× (строка «в т. ч.» — в сумму подстатей не входит) + изменение резерва отпусков; ФОТ и взносы работодателя делятся из статьи «ФОТ с взносами» по ставкам своего года, виды взносов (СО, ООСМС, ОПВР, СН) — по ставкам и базам закона. Форма, транспорт и ГСМ, связь — прямые расходы постов (себестоимость). Коммерческие расходы — собственные статьи книги проводок: коммерческая служба (коммерческий директор и менеджеры по орг. структуре — доля в численности администрации), тендеры (подготовка заявок, банковские гарантии, ЭЦП), реклама и сайт, представительские, подписка CRM. Финансовые доходы — проценты по остаткам на счетах сверх 150 млн ₸; финансовые расходы — проценты по лизингу. Амортизация — одной строкой ниже EBITDA (управленческий формат; по IAS 1.103 амортизация автомобилей и оборудования постов — часть себестоимости, поэтому валовая прибыль здесь — до амортизации). Колонки: за период, % к выручке, на пост в месяц (по средним постам периода), прошлый период и год назад с Δ, план бюджета и исполнение; «по месяцам» — месяцы периода и итог (длиннее 13 месяцев — по годам).',
  });
  I.add('en', {
    'pl.q.net': 'P&L by level: net profit = general ledger', 'pl.q.tax': 'Employer contributions = statutory rates and bases (by year)', 'pl.q.sga': 'Selling + administrative = administrative ledger items',
    'pl.cd.path': 'Place in the report', 'pl.cd.how': 'How it is carved out', 'pl.cd.kids': 'Line breakdown',
    'pl.f.fot': 'Payroll = accrued item “payroll with contributions” ÷ (1 + employer contribution rate; {y} — {e}).', 'pl.f.tax': 'Employer contributions = item “payroll with contributions” − payroll (rate in {y} — {e} of salary): SO, health insurance, OPVR, social tax — on statutory bases.',
    'pl.f.taxk': 'Each contribution type at the statutory rate and base of its year: SO on salary − pension contribution, social tax on salary − pension − health contributions (until 2026 — less SO), health insurance and OPVR on salary.', 'pl.f.staff': 'Share of the sales team (commercial director and managers) in administrative headcount on each day, per the org chart.',
    'pl.f.other': '“Other”: the sales share for a year = acquisition cost of contracts signed that year by channel (no more than 60% of the year’s “Other”), spread evenly within the year; the rest is administrative.', 'pl.f.tot': 'Total = sum of the sections above in report order.',
    'pl.calc_h': 'P&L by level', 'pl.title': 'Statement of profit or loss (P&L)', 'pl.sub': 'IFRS · expenses by function · daily accruals for exactly the days of the period',
    'pl.n.revenue': 'Revenue (excl. VAT)', 'pl.n.rev_t24': '24-hour posts', 'pl.n.rev_tday': 'Daytime posts', 'pl.n.rev_vahta': 'Rotation posts (15/15)',
    'pl.n.cogs': 'Cost of services rendered', 'pl.n.guardFot': 'Guards’ payroll', 'pl.n.guardTax': 'Employer taxes and contributions on guards’ payroll',
    'pl.n.tax_so': 'Social contributions (SO)', 'pl.n.tax_oosms': 'Compulsory health insurance contributions', 'pl.n.tax_opvr': 'Employer pension contributions (OPVR)', 'pl.n.tax_sn': 'Social tax (until 2026 — net of SO)',
    'pl.n.uniform': 'Uniforms and equipment', 'pl.n.transport': 'Transport and fuel (rapid response, shuttles)', 'pl.n.comms': 'Communications at posts',
    'pl.n.gross': 'Gross profit', 'pl.n.grossM': 'Gross margin, %',
    'pl.n.sales': 'Selling expenses', 'pl.n.salesFot': 'Sales team payroll', 'pl.n.salesTax': 'Employer taxes and contributions on sales team payroll',
    'pl.n.sales_tenders': 'Tenders and public procurement: bids, bank guarantees, digital signatures', 'pl.n.sales_ads': 'Advertising and website', 'pl.n.sales_repr': 'Entertainment and sales travel', 'pl.n.crm': 'Sales team CRM (Bitrix24 subscription)',
    'pl.n.admin': 'Administrative expenses', 'pl.n.adminFot': 'Administration payroll', 'pl.n.adminTax': 'Employer taxes and contributions on administration payroll',
    'pl.n.office': 'Office and rent', 'pl.n.it': 'IT and system', 'pl.n.other': 'Other administrative',
    'pl.n.ebitda': 'EBITDA', 'pl.n.ebitdaM': 'EBITDA margin, %', 'pl.n.dep': 'Depreciation of fixed assets', 'pl.n.ebit': 'Operating profit (EBIT)',
    'pl.n.fin': 'Finance income and costs', 'pl.n.interest': 'Leasing interest', 'pl.n.finInc': 'Finance income (overnight deposit, 12–15% a year)',
    'pl.n.ebt': 'Profit before tax', 'pl.n.cit': 'Corporate income tax (CIT 20%)', 'pl.n.net': 'Net profit', 'pl.n.netM': 'Net margin, %',
    'pl.c.period': 'For the period', 'pl.c.share': '% of revenue', 'pl.c.dprev': 'Δ vs previous', 'pl.c.dyago': 'Δ vs a year ago', 'pl.c.exec': 'Execution', 'pl.c.total': 'Total',
    'pl.tip.share': 'Absolute line amount ÷ revenue of the period × 100; for margin lines — the margin itself.', 'pl.tip.exec': 'Actual ÷ budget plan (P&L budget) × 100; green is in the company’s favour. Items below EBITDA are not budgeted.',
    'pl.bar': 'Report levels', 'pl.collapse_all': 'Collapse all', 'pl.level2': 'Sub-items', 'pl.expand_all': 'Expand all', 'pl.expand': 'Expand “{n}”', 'pl.collapse': 'Collapse “{n}”',
    'pl.mode': 'Columns', 'pl.m.period': 'For the period', 'pl.m.months': 'By month', 'pl.m.years': 'By year', 'pl.rows': '{n} rows · {g} expandable',
    'pl.sign_ch': 'the line changed sign — the difference in amount is shown', 'pl.csv.level': 'Level', 'pl.csv.code': 'Line code',
    'pl.note': 'Income is shown with “+”, expenses with “−”; total lines are highlighted. Δ is the change in the line amount (▲ up, ▼ down); colour is the effect on profit: green in the company’s favour, red against it. Plan comes from the P&L budget down to EBITDA. ▸ expands a line, → / ← from the keyboard; expanded lines are remembered.',
    'pl.calc': 'The statement of profit or loss follows IFRS (IAS 1) with expenses by function: revenue → cost of services → gross profit → selling → administrative → EBITDA → depreciation → operating profit → finance income and costs → profit before tax → CIT → net profit. Every line comes from the general ledger for the days of the period; sub-items add up to their item, sections to the totals, and net profit equals the one in the cockpit, equity and budget. Revenue (excl. VAT) is broken down by post type (24-hour, daytime, rotation), region and site. Guards’ payroll = staff (post FTE × 1.05) × salary + overtime at 1.5× (the “of which” line is not added to the sub-items) + change in the vacation reserve; payroll and employer contributions are split from the item “payroll with contributions” at the rates of its year, contribution types (SO, health insurance, OPVR, social tax) at statutory rates and bases. Uniforms, transport and fuel, and communications are direct post costs (cost of services). Selling expenses are separate ledger items: the sales team (commercial director and managers per the org chart — share of administrative headcount), tenders (bids, bank guarantees, digital signatures), advertising and website, entertainment, the CRM subscription. Finance income is interest on account balances above ₸150 M; finance costs are leasing interest. Depreciation is a single line below EBITDA (management format; under IAS 1.103 depreciation of vehicles and post equipment is part of the cost of services, so gross profit here is before depreciation). Columns: for the period, % of revenue, per post per month (average posts of the period), previous period and a year ago with Δ, budget plan and execution; “by month” shows the months of the period and the total (longer than 13 months — by year).',
  });

  I.phrases('en', { 'Коммерческая служба (ФОТ с взносами)': 'Sales team (payroll with contributions)', 'Тендеры, реклама, представительские': 'Tenders, advertising, entertainment',
    'CRM коммерческой службы': 'Sales team CRM', 'ФОТ коммерческой службы с взносами': 'Sales team payroll with contributions' });

  // ---------- 0.8.3: методика по закону (нормы труда, ставки и базы, НДС за квартал, КПН, резерв отпусков, лизинг, финансовые доходы) ----------
  I.add('ru', {
    'tax.base.ipn': 'оклад − ОПВ − ВОСМС − стандартный вычет на человека в месяц: 14 МРП, с 2026 — 30 МРП', 'tax.base.opv': 'оклад (не выше 50 МЗП)', 'tax.base.vosms': 'оклад (не выше 10 МЗП, с 2026 — 20 МЗП)', 'tax.base.so': 'оклад − ОПВ (от 1 до 7 МЗП)',
    'tax.base.oosms': 'оклад (не выше 10 МЗП, с 2026 — 40 МЗП)', 'tax.base.opvr': 'оклад (не выше 50 МЗП) работников, родившихся после 01.01.1975 (78 % ФОТ)', 'tax.base.sn': 'оклад − ОПВ − ВОСМС; к уплате — СН минус СО', 'tax.base.sn26': 'оклад − ОПВ − ВОСМС; с 2026 — без уменьшения на СО',
    'tax.base.vat': 'выручка − закупки; период — квартал', 'tax.base.cit': 'прибыль до налога (налоговая база = бухгалтерской, допущение демо)', 'tax.base.div': 'дивиденды учредителю-физлицу за год нарастающим итогом (у источника)',
    'tax.f.ipn': 'ИПН = 10 % × (оклад − ОПВ 10 % − ВОСМС 2 % − стандартный вычет на человека в месяц: 2022–2025 — 14 МРП (ст. 346 НК РК), с 2026 — базовый вычет 30 МРП, не более 360 МРП в год (НК РК 2026)), по дням; с 2026 — 15 % с годового дохода сверх 8 500 МРП (в штате таких нет); уплата — 25-го следующего месяца.', 'tax.f.opv': 'ОПВ = 10 % оклада (удержание), уплата — 25-го следующего месяца.', 'tax.f.vosms': 'ВОСМС = 2 % оклада (не выше 10 МЗП, с 2026 — 20 МЗП; удержание), уплата — 25-го следующего месяца.',
    'tax.f.so': 'СО = ставка года × (оклад − ОПВ): 2022–2024 — 3,5 %, с 2025 — 5 %; база не ниже 1 и не выше 7 МЗП (ст. 243–244 Социального кодекса).', 'tax.f.oosms': 'ООСМС = 3 % оклада (не выше 10 МЗП, с 2026 — 40 МЗП), ст. 27 Закона об ОСМС.',
    'tax.f.opvr': 'ОПВР = ставка года × оклад: 2024 — 1,5 %, 2025 — 2,5 %, 2026 — 3,5 % (ст. 251 Социального кодекса), только за работников, родившихся после 01.01.1975 — в модели 78 % ФОТ (22 % штата старше; доля — допущение по штату, подтверждает кадровик).',
    'tax.f.sn': 'СН: 2022–2024 — 9,5 %, 2025 — 11 % × (оклад − ОПВ − ВОСМС) минус СО; с 2026 — 6 % × (оклад − ОПВ − ВОСМС) без уменьшения на СО (НК РК 2026).',
    'tax.f.vat': 'НДС = (выручка − закупки) × ставка года (12 %, с 2026 — 16 %); период — квартал, уплата — 25-го второго месяца после квартала, декларация 300.00 — до 15-го.',
    'tax.f.cit': 'КПН = 20 % × прибыль до налога (налоговая база принята равной бухгалтерской); авансы — 25-го каждого месяца по 1/12 × КПН прошлого года × 1,1, доплата за год — до 10.04.',
    'tax.f.divIpn': 'ИПН с дивидендов — по закону года нарастающим итогом за календарный год: 2022 — 5 %; 2023–2025 — 10 % с суммы сверх 30 000 МРП за год (ст. 341 п. 1 пп. 8 НК РК); 2026 — 5 % до 230 000 МРП за год и 15 % сверх (НК РК 2026); удерживается при выплате, уплата — 25-го следующего месяца.',
    'tax.f.total': 'Сумма удержаний, взносов работодателя, НДС, КПН и ИПН с дивидендов за период, по ставкам и базам каждого дня.', 'tax.f.payroll': 'ИПН, ОПВ, ВОСМС, СО, ООСМС, ОПВР, СН за прошлый месяц — 25-го.',
    'an.c.fc_other': 'Лизинг, дивиденды, ОС', 'an.c.fc_other_tip': 'Лизинг — 12-го по графику, дивиденды на руки — по утверждённым решениям, покупка ОС — по плану.', 'an.c.fc_possible': 'Возможные выплаты',
    'an.c.fc_possible_tip': 'Выплаты по решениям, ожидающим утверждения учредителя (если утвердят); в остаток не входят.', 'an.c.fc_cash_all': 'Остаток, если утвердят',
    'an.c.per_post_sched': 'Человек на пост по графику', 'an.c.fte_post': 'FTE на пост в модели', 'an.c.hours_sched': 'Часов в месяц на человека по графику', 'an.c.hours_fte': 'Часов в месяц на FTE',
    'pl.n.guardOt': 'в т. ч. сверхурочные (1,5×)', 'pl.f.sell': 'Собственная статья книги проводок: начисление по дням (с НДС к зачёту), уровень — по числу постов и сезону (тендеры — осенью, представительские — в декабре).',
    'pl.f.ot': 'Сверхурочные = (часы охраны на постах − часы присутствующих охранников по норме 164,7 ч в месяц) × часовая ставка × 1,5 (ст. 108 ТК РК); показаны «в т. ч.» ФОТ охраны.',
    'cards.cf.interestIn': 'Проценты полученные (остатки на счетах)', 'cards.cf.interestPaid': 'Лизинг — проценты уплаченные', 'cards.cf.divTax': 'ИПН с дивидендов (у источника)', 'cards.cf.investing': 'Инвестиционный поток', 'cards.cf.financing': 'Финансовый поток',
    'cards.bs.vacres': 'Резерв отпусков (IAS 19)', 'cards.bs.divtax': 'ИПН с дивидендов к уплате', 'cards.bs.leasingCur': 'Лизинг — текущая часть', 'cards.bs.leasingLong': 'Лизинг — долгосрочная часть', 'cards.tax.divIpn': 'ИПН с дивидендов',
    'calc.rates_h': 'Ставки по годам: ставка — источник — модель — закон', 'calc.c.rate': 'Ставка', 'calc.c.src': 'Источник (статья)', 'calc.c.law': 'Модель = закон', 'calc.law_ok': '✓ совпадает', 'calc.law_bad': '≠ расхождение: {y}',
    'calc.rates_note': '«✓» — ставки модели по каждому году сверены с отдельной таблицей закона (она не берётся из ставок модели); «≠» — расхождение с годами. * — 10 % с суммы дивидендов сверх 30 000 МРП за год. Номера статей НК РК — по редакции до 01.01.2026; с 2026 действует новый Налоговый кодекс (НК РК 2026: НДС 16 %, СН 6 % без уменьшения на СО, базовый вычет ИПН 30 МРП, ИПН с дивидендов 5 % до 230 000 МРП и 15 % сверх) — номера его статей и ставки подтверждает бухгалтер. ОПВР в строке взносов — за 78 % ФОТ (работники, родившиеся после 01.01.1975).',
    'calc.src.ipn': 'ст. 320 НК РК; с 2026 — НК РК 2026 (10 % до 8 500 МРП в год, 15 % сверх)', 'calc.src.opv': 'Закон о пенсионном обеспечении', 'calc.src.vosms': 'Закон об ОСМС', 'calc.src.so': 'ст. 243–244 Социального кодекса', 'calc.src.oosms': 'ст. 27 Закона об ОСМС', 'calc.src.opvr': 'ст. 251 Социального кодекса',
    'calc.src.sn': 'ст. 484–486 НК РК; 2026 — НК РК 2026', 'calc.src.vat': 'ст. 422 НК РК; НК РК 2026', 'calc.src.cit': 'ст. 313 НК РК', 'calc.src.divTax': 'ст. 320 п. 2, ст. 341 п. 1 пп. 8 НК РК (освобождение 30 000 МРП в год, 2023–2025); 2026 — НК РК 2026 (5 % до 230 000 МРП, 15 % сверх)', 'calc.src.mrp': 'закон о республиканском бюджете', 'calc.src.employer': 'СО × 0,9 + ООСМС + ОПВР × 78 % + СН × 0,88 (до 2026 — минус СО)',
    'calc.src.ded': 'ст. 346 НК РК; с 2026 — НК РК 2026 (базовый вычет 30 МРП, не более 360 МРП в год)',
    'k84.u_note': 'базовый тариф — по графику поста: FTE «2/2» — 2,3, «5/2» — 1,1 (норма ТК РК); тарифы — для компании, соблюдающей ТК (4,4 человека на круглосуточный пост): рынок часто считает 3 человека и дешевле',
    'k84.q_div': 'ИПН с дивидендов за {y} = закону (по году нарастающим итогом)',
    'k84.q_rates': 'Ставки модели = таблице закона (по годам)',
    'calc.method': '<h3>Формулы и методика</h3><ul class="ul"><li>Выручка — по дням: посты × тариф договора ÷ дней в месяце, без НДС. Базовый тариф — по графику поста (2026: круглосуточный {t24} ₸, «2/2» {t22} ₸, «5/2» {t52} ₸ в месяц) × коэффициент договора; каждый базовый тариф безубыточен с маржой 15–20 %. Тарифы — для компании, соблюдающей ТК РК (4,4 FTE на круглосуточный пост); рынок часто считает 3 человека на пост и дешевле.</li><li>ОПиУ — по МСФО (IAS 1), расходы по функциям: выручка − себестоимость (ФОТ охраны с взносами, форма, транспорт, связь на постах) = валовая прибыль; − коммерческие (коммерческая служба, тендеры, реклама и сайт, представительские, CRM) − административные (ФОТ администрации, офис, ИТ, прочие) = EBITDA; − амортизация = операционная прибыль; + финансовые доходы − проценты по лизингу = прибыль до налога; − КПН 20 % = чистая прибыль. Амортизация — одной строкой ниже EBITDA (управленческий формат; по IAS 1.103 она часть себестоимости, поэтому валовая прибыль — до амортизации).</li><li><b>Нормы труда (ТК РК)</b>: 40 ч в неделю (ст. 68), среднемесячная норма 164,7 ч (1 976 ч в 2026 году), у охранников — суммированный учёт (ст. 75). FTE на пост — по графику (часы поста в год ÷ норма): «сутки/трое» и вахта 15/15 (8 760 ч в год) — 4 человека по графику, в модели <b>4,4 FTE</b>; «2/2» (12 ч каждый день, 4 380 ч) — 2 человека по графику, по норме <b>2,3 FTE</b>; «5/2» (8 ч по будням, ≈ 2 086 ч) — 1 человек, <b>1,1 FTE</b>; штат = FTE × 1,05 (резерв на отпуска, больничные, текучесть); отпуска и больничные закрываются сверхурочными с оплатой 1,5× (ст. 108) — не больше 2 ч в сутки и 120 ч в год на охранника (ст. 78; предел 12 ч в месяц — для 4-, 5-, 6-дневной недели, к суммированному учёту не применяется), при превышении — сигнал.</li><li>ФОТ охраны = штат × оклад + сверхурочные; распределяется по объектам по FTE их графика — маржа объекта считается по своему графику; вакансии = потребность (FTE × 1,05) − штат, найм закрывает разрыв с задержкой. Убыточные объекты — только с причиной: договор 2023 года без индексации тарифа (пересмотр — при продлении) и тендерная цена ниже базового тарифа; объект со старым тарифом пересмотрен в 2025 году.</li><li><b>Резерв отпусков (IAS 19)</b>: 24 календарных дня в год — начисление 24/365 ФОТ с взносами каждый день, отпускные — из резерва; остаток — краткосрочное обязательство.</li><li><b>Взносы и налоги с ФОТ</b> — по ставкам и базам своего года (таблица ниже); ИПН — 10 % с (оклад − ОПВ − ВОСМС − стандартный вычет): 2022–2025 — 14 МРП в месяц, с 2026 — базовый вычет 30 МРП в месяц (не более 360 МРП в год); ставка 15 % с годового дохода сверх 8 500 МРП (с 2026, 36,8 млн ₸) в штате не возникает — наибольший годовой оклад 5,0 млн ₸; ОПВР — только за работников, родившихся после 01.01.1975: в модели {opvr} % ФОТ (допущение по штату, подтверждает кадровик); уплата — 25-го следующего месяца.</li><li><b>НДС</b> — 12 %, с 2026 — 16 %; период — квартал: уплата 25-го второго месяца после квартала, декларация 300.00 — до 15-го.</li><li><b>КПН</b> — 20 % прибыли до налога (налоговая база = бухгалтерской, допущение демо); авансы 25-го каждого месяца — 1/12 × КПН прошлого года × 1,1 (ст. 305 НК РК), декларация 100.00 — до 31.03, доплата — до 10.04.</li><li><b>Дивиденды</b> — ИПН у источника по закону года, нарастающим итогом за календарный год: 2022 — 5 % (освобождение при владении долей более 3 лет не применяется — допущение демо); 2023–2025 — 10 % с суммы сверх 30 000 МРП за год (ст. 341 п. 1 пп. 8 НК РК); 2026 — 5 % до 230 000 МРП за год ({cap} млн ₸) и 15 % сверх (НК РК 2026); удерживается при выплате, уплата — 25-го следующего месяца; в ДДС — на руки и ИПН отдельными строками. Дивиденды 2026 — {dv} млн ₸ ({dp} % чистой прибыли с начала года), в пределах 230 000 МРП.</li><li><b>Амортизация</b> — по объектам ОС: входящая группа (150 млн ₸, износ 40 млн) — остаток 110 млн за 44 месяца, покупки и лизинговые автомобили — 1/60 стоимости в месяц; при полном износе прекращается (IAS 16.55).</li><li><b>Лизинг</b> — 18 % годовых, проценты по дням на основной долг; платёж 12-го: сначала проценты, остаток — долг; в балансе текущая часть (долг по графику ближайших 12 платежей по календарю, в том числе после 31.12.2026, и начисленные проценты) и долгосрочная; в ДДС проценты уплаченные — отдельной строкой (IAS 7.31).</li><li><b>Финансовые доходы</b> — проценты по остатку на счетах сверх 150 млн ₸ (овернайт-депозит: 2022 — 12 %, 2023 — 14 %, 2024 — 13 %, 2025 — 15 %, 2026 — 14 % годовых), по дням; в ДДС — операционный поток (IAS 7.33).</li><li>Запуск системы (36 млн ₸) признан расходом 2025 года (не капитализирован) — статья «ИТ и система».</li><li>Дебиторка — выставленные и неоплаченные акты (с НДС) + начислено без акта; просрочка — после срока оплаты по договору; DSO и оборачиваемость — по ставке НДС каждого дня. «На пост в месяц» — по средним постам периода.</li><li>Баланс — сальдо книги проводок на конец дня; активы = обязательства + капитал. Капитал = уставный + резервный + нераспределённая прибыль; резервный — по уставу: 31.12 — 5 % чистой прибыли года, пока резерв не достигнет 15 % уставного.</li></ul>',
  });
  I.add('en', {
    'tax.base.ipn': 'salary − pension − health contributions − standard deduction per person per month: 14 MCI, from 2026 — 30 MCI', 'tax.base.opv': 'salary (up to 50 MW)', 'tax.base.vosms': 'salary (up to 10 MW, from 2026 — 20 MW)', 'tax.base.so': 'salary − pension contribution (1 to 7 MW)',
    'tax.base.oosms': 'salary (up to 10 MW, from 2026 — 40 MW)', 'tax.base.opvr': 'salary (up to 50 MW) of employees born after 1 Jan 1975 (78% of payroll)', 'tax.base.sn': 'salary − pension − health contributions; payable — ST less SC', 'tax.base.sn26': 'salary − pension − health contributions; from 2026 — not reduced by SC',
    'tax.base.vat': 'revenue − purchases; period — quarter', 'tax.base.cit': 'profit before tax (tax base = accounting profit, demo assumption)', 'tax.base.div': 'dividends to the individual founder, cumulative for the year (at source)',
    'tax.f.ipn': 'IIT = 10% × (salary − 10% pension − 2% health − standard deduction per person per month: 14 MCI in 2022–2025 (Art. 346 of the Tax Code), from 2026 — the basic deduction of 30 MCI, up to 360 MCI a year (Tax Code 2026)), daily; from 2026 — 15% on annual income above 8,500 MCI (no such employees); paid on the 25th of the next month.', 'tax.f.opv': 'Pension contribution = 10% of salary (withheld), paid on the 25th of the next month.', 'tax.f.vosms': 'Health contribution = 2% of salary (up to 10 minimum wages, from 2026 — 20; withheld), paid on the 25th of the next month.',
    'tax.f.so': 'Social contributions = year’s rate × (salary − pension contribution): 3.5% in 2022–2024, 5% from 2025; base between 1 and 7 minimum wages (Arts. 243–244 of the Social Code).', 'tax.f.oosms': 'Employer health insurance = 3% of salary (up to 10 minimum wages, from 2026 — 40), Art. 27 of the Health Insurance Law.',
    'tax.f.opvr': 'Employer pension contribution = year’s rate × salary: 1.5% in 2024, 2.5% in 2025, 3.5% in 2026 (Art. 251 of the Social Code), only for employees born after 1 Jan 1975 — 78% of payroll in the model (22% of staff are older; the share is a staffing assumption confirmed by HR).',
    'tax.f.sn': 'Social tax: 9.5% in 2022–2024, 11% in 2025 × (salary − pension − health contributions) less social contributions; from 2026 — 6% × (salary − pension − health contributions) without the SC reduction (Tax Code 2026).',
    'tax.f.vat': 'VAT = (revenue − purchases) × year’s rate (12%, from 2026 — 16%); the period is a quarter, paid on the 25th of the second month after it, return 300.00 by the 15th.',
    'tax.f.cit': 'CIT = 20% × profit before tax (tax base taken equal to accounting profit); advances on the 25th of each month at 1/12 × prior-year CIT × 1.1, the annual top-up by 10 Apr.',
    'tax.f.divIpn': 'IIT on dividends — under each year’s law, cumulative for the calendar year: 5% in 2022; 10% of the amount above 30,000 MCI a year in 2023–2025 (Art. 341(1)(8) of the Tax Code); in 2026 — 5% up to 230,000 MCI a year and 15% above (Tax Code 2026); withheld on payment, paid on the 25th of the next month.',
    'tax.f.total': 'Withholdings, employer contributions, VAT, CIT and IIT on dividends for the period, at each day’s rates and bases.', 'tax.f.payroll': 'IIT, pension, health, social contributions, OPVR, social tax for the previous month — on the 25th.',
    'an.c.fc_other': 'Leasing, dividends, fixed assets', 'an.c.fc_other_tip': 'Leasing on the 12th per schedule, net dividends per approved decisions, fixed asset purchases per plan.', 'an.c.fc_possible': 'Possible payments',
    'an.c.fc_possible_tip': 'Payments under decisions awaiting the founder’s approval (if approved); not included in the balance.', 'an.c.fc_cash_all': 'Balance if approved',
    'an.c.per_post_sched': 'People per post by schedule', 'an.c.fte_post': 'FTE per post in the model', 'an.c.hours_sched': 'Hours a month per person by schedule', 'an.c.hours_fte': 'Hours a month per FTE',
    'pl.n.guardOt': 'of which overtime (1.5×)', 'pl.f.sell': 'A separate ledger item: daily accrual (with creditable VAT), level by number of posts and season (tenders — in autumn, entertainment — in December).',
    'pl.f.ot': 'Overtime = (guard hours at posts − hours of guards present at the norm of 164.7 h a month) × hourly rate × 1.5 (Art. 108 of the Labour Code); shown as “of which” of guards’ payroll.',
    'cards.cf.interestIn': 'Interest received (account balances)', 'cards.cf.interestPaid': 'Leasing — interest paid', 'cards.cf.divTax': 'IIT on dividends (at source)', 'cards.cf.investing': 'Investing cash flow', 'cards.cf.financing': 'Financing cash flow',
    'cards.bs.vacres': 'Vacation reserve (IAS 19)', 'cards.bs.divtax': 'IIT on dividends payable', 'cards.bs.leasingCur': 'Leasing — current part', 'cards.bs.leasingLong': 'Leasing — non-current part', 'cards.tax.divIpn': 'IIT on dividends',
    'calc.rates_h': 'Rates by year: rate — source — model — law', 'calc.c.rate': 'Rate', 'calc.c.src': 'Source (article)', 'calc.c.law': 'Model = law', 'calc.law_ok': '✓ matches', 'calc.law_bad': '≠ mismatch: {y}',
    'calc.rates_note': '“✓” — the model’s rates for each year are checked against a separate law table (it is not taken from the model’s rates); “≠” — a mismatch with the years. * — 10% of dividends above 30,000 MCI a year. Tax Code article numbers follow the version in force before 1 Jan 2026; from 2026 the new Tax Code applies (Tax Code 2026: VAT 16%, social tax 6% without the SC reduction, basic IIT deduction 30 MCI, IIT on dividends 5% up to 230,000 MCI and 15% above) — its article numbers and rates are confirmed by the accountant. Employer pension contributions in the contributions row cover 78% of payroll (employees born after 1 Jan 1975).',
    'calc.src.ipn': 'Art. 320 of the Tax Code; from 2026 — Tax Code 2026 (10% up to 8,500 MCI a year, 15% above)', 'calc.src.opv': 'Pension Law', 'calc.src.vosms': 'Health Insurance Law', 'calc.src.so': 'Arts. 243–244 of the Social Code', 'calc.src.oosms': 'Art. 27 of the Health Insurance Law', 'calc.src.opvr': 'Art. 251 of the Social Code',
    'calc.src.sn': 'Arts. 484–486 of the Tax Code; 2026 — Tax Code 2026', 'calc.src.vat': 'Art. 422 of the Tax Code; Tax Code 2026', 'calc.src.cit': 'Art. 313 of the Tax Code', 'calc.src.divTax': 'Art. 320(2), Art. 341(1)(8) of the Tax Code (30,000 MCI a year exempt, 2023–2025); 2026 — Tax Code 2026 (5% up to 230,000 MCI, 15% above)', 'calc.src.mrp': 'national budget law', 'calc.src.employer': 'SC × 0.9 + health + OPVR × 78% + ST × 0.88 (until 2026 — less SC)',
    'calc.src.ded': 'Art. 346 of the Tax Code; from 2026 — Tax Code 2026 (basic deduction 30 MCI, up to 360 MCI a year)',
    'k84.u_note': 'the base rate follows the post schedule: FTE 2/2 — 2.3, 5/2 — 1.1 (Labour Code norm); rates are for a company that complies with the Labour Code (4.4 people per 24-hour post): the market often counts 3 people and charges less',
    'k84.q_div': 'IIT on dividends for {y} = law (cumulative for the year)',
    'k84.q_rates': 'Model rates = law table (by year)',
    'calc.method': '<h3>Formulas and methodology</h3><ul class="ul"><li>Revenue — daily: posts × contract rate ÷ days in the month, excl. VAT. The base rate depends on the post schedule (2026: 24-hour ₸{t24}, 2/2 ₸{t22}, 5/2 ₸{t52} a month) × the contract coefficient; each base rate breaks even with a 15–20% margin. Rates are set for a company that complies with the Labour Code (4.4 FTE per 24-hour post); the market often counts 3 people per post and charges less.</li><li>P&L — IFRS (IAS 1), expenses by function: revenue − cost of services (guards’ payroll with contributions, uniforms, transport, post communications) = gross profit; − selling (sales team, tenders, advertising and website, entertainment, CRM) − administrative (admin payroll, office, IT, other) = EBITDA; − depreciation = operating profit; + finance income − leasing interest = profit before tax; − 20% CIT = net profit. Depreciation is a single line below EBITDA (management format; under IAS 1.103 it is part of the cost of services, so gross profit is before depreciation).</li><li><b>Labour norms (Labour Code)</b>: 40 hours a week (Art. 68), average monthly norm 164.7 h (1,976 h in 2026), guards are on summarised working time (Art. 75). FTE per post follows the schedule (post hours a year ÷ the norm): one-in-four and 15/15 rotation (8,760 h a year) — 4 people by schedule, in the model <b>4.4 FTE</b>; 2/2 (12 h every day, 4,380 h) — 2 people by schedule, <b>2.3 FTE</b> by the norm; 5/2 (8 h on weekdays, ≈ 2,086 h) — 1 person, <b>1.1 FTE</b>; staff = FTE × 1.05 (reserve for vacations, sick leave, turnover); vacations and sick leave are covered by overtime paid at 1.5× (Art. 108) — no more than 2 h a day and 120 h a year per guard (Art. 78; the 12 h a month limit applies to a 4-, 5- or 6-day week, not to summarised accounting), with a signal when exceeded.</li><li>Guards’ payroll = staff × salary + overtime; it is allocated to sites by the FTE of their schedule, so each site’s margin follows its own schedule; vacancies = need (FTE × 1.05) − staff, hiring closes the gap with a lag. Loss-making sites only have a stated reason: a 2023 contract without rate indexation (revised at renewal) or a tender price below the base rate; the site with an old rate was revised in 2025.</li><li><b>Vacation reserve (IAS 19)</b>: 24 calendar days a year — 24/365 of payroll with contributions accrued daily, vacation pay is charged to the reserve; the balance is a current liability.</li><li><b>Payroll taxes and contributions</b> — at the rates and bases of their year (table below); IIT is 10% of (salary − pension − health − standard deduction): 14 MCI a month in 2022–2025, from 2026 the basic deduction of 30 MCI a month (up to 360 MCI a year); the 15% rate on annual income above 8,500 MCI (from 2026, ₸36.8 M) does not arise — the highest annual salary is ₸5.0 M; employer pension contributions apply only to employees born after 1 Jan 1975: {opvr}% of payroll in the model (a staffing assumption confirmed by HR); paid on the 25th of the next month.</li><li><b>VAT</b> — 12%, from 2026 — 16%; the period is a quarter: paid on the 25th of the second month after it, return 300.00 by the 15th.</li><li><b>CIT</b> — 20% of profit before tax (tax base = accounting profit, demo assumption); advances on the 25th of each month — 1/12 × prior-year CIT × 1.1 (Art. 305 of the Tax Code), return 100.00 by 31 Mar, top-up by 10 Apr.</li><li><b>Dividends</b> — IIT at source under each year’s law, cumulatively over the calendar year: 5% in 2022 (the exemption for holding a share over 3 years is not applied — demo assumption); 10% of the amount above 30,000 MCI a year in 2023–2025 (Art. 341(1)(8) of the Tax Code); in 2026 — 5% up to 230,000 MCI a year (₸{cap} M) and 15% above (Tax Code 2026); withheld on payment, paid on the 25th of the next month; the cash flow shows the net amount and the IIT on separate lines. Dividends for 2026 — ₸{dv} M ({dp}% of year-to-date net profit), within 230,000 MCI.</li><li><b>Depreciation</b> — by fixed asset: the opening group (₸150 M, ₸40 M depreciated) — the ₸110 M balance over 44 months, purchases and leased vehicles — 1/60 of cost a month; it stops when fully depreciated (IAS 16.55).</li><li><b>Leasing</b> — 18% a year, interest daily on the principal; the payment on the 12th covers interest first, the rest repays principal; the balance sheet shows the current part (principal under the next 12 payments by the calendar, including after 31 Dec 2026, plus accrued interest) and the non-current part; interest paid is a separate cash flow line (IAS 7.31).</li><li><b>Finance income</b> — interest on account balances above ₸150 M (overnight deposit: 12% in 2022, 14% in 2023, 13% in 2024, 15% in 2025, 14% in 2026), daily; operating cash flow (IAS 7.33).</li><li>The system launch (₸36 M) is expensed in 2025 (not capitalised) — the “IT and system” line.</li><li>Receivables — issued unpaid acts (incl. VAT) + accrued without an act; overdue after the contract payment term; DSO and turnover use each day’s VAT rate. “Per post per month” uses the average posts of the period.</li><li>Balance sheet — ledger balances at the end of the day; assets = liabilities + equity. Equity = charter + reserve + retained earnings; reserve per the charter: on 31 Dec — 5% of the year’s net profit until the reserve reaches 15% of charter capital.</li></ul>',
  });

  I.add('ru', {
    'k83.rev_post': 'выручка на пост в месяц ≈ {v} (по средним постам периода, без НДС)',
    'k83.sh_l1': 'норма {n} ч (40 ч в неделю) · сверхурочные <b class="{c}">{o} ч</b> в месяц на охранника (1,5×)', 'k83.sh_l2': 'за 12 мес. — <b class="{c}">{h} ч</b> на охранника · предел 120 ч в год и 2 ч в сутки при суммированном учёте (ст. 78 ТК РК)', 'k83.over': ' · <b class="dn">выше предела</b>',
    'k83.sh_note': 'в срок = 100 % − (не открыто + опоздания) ÷ смен по плану; смена по графику: «сутки/трое» — 1 смена 24 ч в сутки на пост, вахта 15/15 — 2 по 12 ч, «2/2» — 1 по 12 ч, «5/2» — 1 по 8 ч по будням; объекты, работавшие в периоде ({n}, в том числе расторгнутые) — итог = плитке «Смен за период»; сравнение — в процентных пунктах',
    'k83.sched_note': 'человек на пост по графику — без замены на отпуск и больничный: часы каждого выше нормы; в модели — FTE на пост по графику по норме ТК РК (40 ч в неделю, ст. 68; суммированный учёт, ст. 75): сутки/трое и вахта — 4,4, «2/2» — 2,3, «5/2» — 1,1; штат × 1,05; отпуска и больничные закрываются сверхурочными (1,5×, ст. 108) в пределах 2 ч в сутки и 120 ч в год (ст. 78) · жёлтым — часы выше нормы + 10 ч в месяц (120 ч в год ÷ 12) · сейчас {h} ч в месяц на охранника, сверхурочные {o} ч',
    'k83.hr_turn': 'текучесть охранников (годовой темп) <b>{v}</b> · типично для охраны 35–40 %', 'k83.short': '— (период короче 30 дней)',
    'k83.vac_l1': 'нужно {n} охранников на {p} {w} (FTE × 1,05) · в штате {g}', 'k83.vac_over': ' · сверх потребности — после расторжений, высвобождаются', 'k83.vac_l2': 'укомплектованность {s} · сверхурочные {o} ч в месяц на охранника (предел 120 ч в год)',
    'k83.hr_reg': 'текучесть охранников {v} в год · охранники в штате, отпуска, больничные и удостоверения распределены по регионам долей FTE постов; не вышли — по отметкам смен объектов · вакансии со знаком: «−» — сверх потребности',
    'k83.u_guard': 'Охрана: FTE × {a} (оклад {b} × штат 1,05 × взносы {c} + сверхурочные + резерв отпусков)',
    'k83.u_cap': 'взносы работодателя {e} (ставки и базы {y} г.) · охрана, прямые и накладные — по факту {m} по {d} на средние FTE и посты месяца · та же база, что маржа объекта в «Объектах»',
    'k83.fc_cap': '{u} · ожидаемая оплата = срок по договору + обычная задержка заказчика · налоги — с НДС за квартал и авансами КПН · прочие — лизинг, дивиденды, покупка ОС · минимум {v} на неделе {d}', 'k83.fc_pos': ' · возможные выплаты (ждут решения учредителя): {x}',
    'k83.q_ok': 'все сверки сходятся', 'k83.q_bad': 'расхождение', 'k83.q_l2': 'баланс {v} ₸ · ДДС, капитал, ставки — ниже', 'k83.q_ind': 'ДДС косвенным методом с {d}: прибыль + амортизация + проценты ± оборотный капитал = операционный поток',
    'k83.q_ot': 'Сверхурочные за 12 мес. на охранника ≤ 120 ч (ст. 78 ТК РК)', 'k83.hrs': '{n} ч', 'k83.q_lim': 'в пределе', 'k83.q_vat': 'НДС к уплате = начислено за незакрытые кварталы (уплата 25-го второго месяца после квартала)', 'k83.q_int': 'контроль целостности', 'k83.q_match': 'сходится',
    'k83.b27_sup': 'новых постов {n} × {k} охранника (FTE на пост по графику: сутки/трое и вахта — 4,4, «2/2» — 2,3, «5/2» — 1,1 — в среднем {f}, × штат 1,05) + замена при текучести 20 % = {h} комплектов',
    'k84.b27_div': 'дивиденды {d} — начисленные; из них ИПН у источника ≈ {x} (по ставкам 2026: 5 % до 230 000 МРП в год, 15 % сверх; МРП 2027 ещё не утверждён)',
    'k83.b27_cf': 'оплата заказчиками через {n} дн., собираемость {k} % · зарплата 5-го, лизинг 12-го, поставщики 15-го, налоги по зарплате и аванс КПН 25-го, НДС — за квартал в феврале, мае, августе и ноябре, доплата КПН за 2026 — в апреле',
    'k83.t_rates': 'ставки {y} г.', 'k83.t_sub': 'ставки {y} г. · по НК РК, Социальному кодексу и законам о пенсиях и ОСМС · подтверждает бухгалтер', 'k83.t_acc2': 'НДС {a} · КПН {b}', 'k83.t_div': ' · ИПН с дивидендов {v}',
    'k83.t_paid': 'по ДДС: по зарплате и аванс КПН — 25-го, НДС — за квартал, доплата КПН — 10.04', 'k83.t_due1': 'по зарплате за {m} {a} · аванс КПН {c}', 'k83.t_due_vat': ' · НДС за {q} кв. {y} {v}', 'k83.t_due2': 'всего начислено и не уплачено на {d} — {v} (с НДС текущего квартала)',
    'k83.t_load1': 'взносы работодателя ÷ ФОТ · {x}', 'k83.t_load2': 'удержания с сотрудника {a} (ИПН — с вычетом 14 МРП, с 2026 — 30 МРП) · НДС {b}', 'k83.t_vat26': ' (с 2026; в 2025 — 12 %)', 'k83.t_sn': 'Социальный налог (СН)', 'k83.t_founder': 'удерживается с учредителя',
    'k83.t_calc': 'ФОТ (начислено к выплате: оклады, отпускные, сверхурочные) за период — {v} · {x} · ставка — номинальная, база — по закону',
    'k83.c_pay': 'ИПН, ОПВ, ВОСМС, СО, ООСМС, ОПВР, СН за {m}', 'k83.c_adv': 'аванс КПН (1/12 × КПН прошлого года × 1,1)', 'k83.c_div': 'ИПН с дивидендов (удержан у источника)', 'k83.c_300': 'форма 300.00 за {q} кв. {y} (НДС)', 'k83.c_vat': 'НДС за {q} кв. {y}', 'k83.c_acc': ' (начислено на {d})',
    'k83.c_101': 'расчёт авансов КПН ({f})', 'k83.c_100': 'форма 100.00 за {y} (КПН)', 'k83.c_settle': 'доплата КПН за {y} (начислено − авансы)', 'k83.c_settle_est': 'доплата КПН за {y} (начислено − авансы, оценка на дату)',
    'k83.c_note': 'по зарплате — за прошлый месяц, 25-го (ст. 351, 487 НК РК, ст. 243 Социального кодекса); аванс КПН — 25-го каждого месяца (ст. 305); НДС — за квартал, 25-го второго месяца после квартала, декларация 300.00 — до 15-го (ст. 424–425); КПН за год — 100.00 до 31.03, доплата — до 10.04 (ст. 315) · номера статей — НК РК до 2026 года; с 2026 — те же сроки по НК РК 2026 (подтверждает бухгалтер)',
  });
  I.add('en', {
    'k83.rev_post': 'revenue per post per month ≈ {v} (average posts of the period, excl. VAT)',
    'k83.sh_l1': 'norm {n} h (40 h a week) · overtime <b class="{c}">{o} h</b> a month per guard (1.5×)', 'k83.sh_l2': '12 months — <b class="{c}">{h} h</b> per guard · limit 120 h a year and 2 h a day under summarised accounting (Art. 78 of the Labour Code)', 'k83.over': ' · <b class="dn">above the limit</b>',
    'k83.sh_note': 'on time = 100% − (not opened + late) ÷ planned shifts; shifts follow the schedule: one-in-four — 1 shift of 24 h per post a day, 15/15 rotation — 2 of 12 h, 2/2 — 1 of 12 h, 5/2 — 1 of 8 h on weekdays; sites that worked in the period ({n}, including terminated) — the total equals the “Shifts in the period” tile; comparison — in percentage points',
    'k83.sched_note': 'people per post by schedule — without cover for vacation and sick leave: each works above the norm; the model uses FTE per post by schedule at the Labour Code norm (40 h a week, Art. 68; summarised accounting, Art. 75): one-in-four and rotation — 4.4, 2/2 — 2.3, 5/2 — 1.1; staff × 1.05; vacations and sick leave are covered by overtime (1.5×, Art. 108) within 2 h a day and 120 h a year (Art. 78) · yellow — hours above the norm + 10 h a month (120 h a year ÷ 12) · now {h} h a month per guard, overtime {o} h',
    'k83.hr_turn': 'guard turnover (annual rate) <b>{v}</b> · typical for security 35–40%', 'k83.short': '— (period shorter than 30 days)',
    'k83.vac_l1': '{n} guards needed for {p} posts (FTE × 1.05) · on staff {g}', 'k83.vac_over': ' · above need — after terminations, being released', 'k83.vac_l2': 'staffing {s} · overtime {o} h a month per guard (limit 120 h a year)',
    'k83.hr_reg': 'guard turnover {v} a year · guards on staff, leave, sick leave and licences are allocated to regions by post FTE share; no-show — from site shift check-ins · signed vacancies: “−” means above need',
    'k83.u_guard': 'Security: FTE × {a} (salary {b} × staff 1.05 × contributions {c} + overtime + vacation reserve)',
    'k83.u_cap': 'employer contributions {e} ({y} rates and bases) · security, direct and overheads — actual for {m} to {d} on the month’s average FTE and posts · the same base as site margin in “Sites”',
    'k83.fc_cap': '{u} · expected payment = contract term + customer’s usual delay · taxes — incl. quarterly VAT and CIT advances · other — leasing, dividends, fixed asset purchases · minimum {v} in the week of {d}', 'k83.fc_pos': ' · possible payments (awaiting the founder’s decision): {x}',
    'k83.q_ok': 'all reconciliations match', 'k83.q_bad': 'mismatch', 'k83.q_l2': 'balance ₸{v} · cash flow, equity, rates — below', 'k83.q_ind': 'Cash flow by the indirect method from {d}: profit + depreciation + interest ± working capital = operating cash flow',
    'k83.q_ot': 'Overtime for 12 months per guard ≤ 120 h (Art. 78 of the Labour Code)', 'k83.hrs': '{n} h', 'k83.q_lim': 'within the limit', 'k83.q_vat': 'VAT payable = accrued for unpaid quarters (paid on the 25th of the second month after the quarter)', 'k83.q_int': 'integrity check', 'k83.q_match': 'matches',
    'k83.b27_sup': 'new posts {n} × {k} guards (FTE per post by schedule: one-in-four and rotation 4.4, 2/2 — 2.3, 5/2 — 1.1 — average {f}, × staff 1.05) + replacement at 20% turnover = {h} kits',
    'k84.b27_div': 'dividends {d} — declared; of which withholding tax ≈ {x} (2026 rates: 5% up to 230,000 MCI a year, 15% above; the 2027 MCI is not yet approved)',
    'k83.b27_cf': 'customers pay after {n} days, collection {k}% · salaries on the 5th, leasing on the 12th, suppliers on the 15th, payroll taxes and the CIT advance on the 25th, VAT — quarterly in February, May, August and November, the 2026 CIT top-up — in April',
    'k83.t_rates': '{y} rates', 'k83.t_sub': '{y} rates · per the Tax Code, Social Code and pension and health insurance laws · confirmed by the accountant', 'k83.t_acc2': 'VAT {a} · CIT {b}', 'k83.t_div': ' · IIT on dividends {v}',
    'k83.t_paid': 'per cash flow: payroll and the CIT advance on the 25th, VAT quarterly, the CIT top-up on 10 Apr', 'k83.t_due1': 'payroll for {m} {a} · CIT advance {c}', 'k83.t_due_vat': ' · VAT for Q{q} {y} {v}', 'k83.t_due2': 'total accrued and unpaid as of {d} — {v} (incl. current-quarter VAT)',
    'k83.t_load1': 'employer contributions ÷ payroll · {x}', 'k83.t_load2': 'withheld from the employee {a} (IIT after the 14 MCI deduction, from 2026 — 30 MCI) · VAT {b}', 'k83.t_vat26': ' (since 2026; in 2025 — 12%)', 'k83.t_sn': 'Social tax (ST)', 'k83.t_founder': 'withheld from the founder',
    'k83.t_calc': 'Payroll (accrued for payment: salaries, vacation pay, overtime) for the period — {v} · {x} · nominal rate, statutory base',
    'k83.c_pay': 'IIT, pension, health, social contributions, OPVR, social tax for {m}', 'k83.c_adv': 'CIT advance (1/12 × prior-year CIT × 1.1)', 'k83.c_div': 'IIT on dividends (withheld at source)', 'k83.c_300': 'return 300.00 for Q{q} {y} (VAT)', 'k83.c_vat': 'VAT for Q{q} {y}', 'k83.c_acc': ' (accrued as of {d})',
    'k83.c_101': 'CIT advance calculation ({f})', 'k83.c_100': 'return 100.00 for {y} (CIT)', 'k83.c_settle': 'CIT top-up for {y} (accrued − advances)', 'k83.c_settle_est': 'CIT top-up for {y} (accrued − advances, estimate to date)',
    'k83.c_note': 'payroll — for the previous month, on the 25th (Arts. 351, 487 of the Tax Code, Art. 243 of the Social Code); CIT advance — on the 25th of each month (Art. 305); VAT — quarterly, on the 25th of the second month after the quarter, return 300.00 by the 15th (Arts. 424–425); annual CIT — return 100.00 by 31 Mar, top-up by 10 Apr (Art. 315) · article numbers — Tax Code before 2026; from 2026 the same deadlines under Tax Code 2026 (confirmed by the accountant)',
  });

  templates('en', { 'автономия ниже нормы {n}': 'equity ratio below the {n} norm', 'рост постов 12 %, индексация 7 / 10 %, дивиденды {v}': 'posts +12%, indexation 7 / 10%, dividends {v}' });
  I.phrases('en', {
    'охранника ·': 'guards ·', 'охранник ·': 'guard ·', 'Проценты полученные (остатки на счетах)': 'Interest received (account balances)', 'Зарплата на руки': 'Net salaries', 'Налоги и взносы по зарплате (удержания и работодатель)': 'Payroll taxes and contributions (withheld and employer)',
    'НДС (за квартал)': 'VAT (quarterly)', 'КПН (авансы и доплата за год)': 'CIT (advances and annual top-up)', 'Инвестиционный поток': 'Investing cash flow', 'Лизинг — основной долг': 'Leasing — principal', 'Лизинг — проценты уплаченные': 'Leasing — interest paid',
    'Дивиденды на руки': 'Dividends (net)', 'ИПН с дивидендов (удержан у источника)': 'IIT on dividends (withheld at source)', 'Финансовый поток': 'Financing cash flow',
    'зарплата — 5-го, поставщики — 15-го, налоги и взносы по зарплате — 25-го за прошлый месяц, аванс КПН — 25-го каждого месяца, доплата КПН за год — 10.04, НДС — за квартал 25-го второго месяца после квартала; оплаты заказчиков — по фактическим датам; проценты по лизингу — отдельной строкой (IAS 7.31)': 'salaries on the 5th, suppliers on the 15th, payroll taxes and contributions on the 25th for the previous month, the CIT advance on the 25th of each month, the annual CIT top-up on 10 Apr, VAT quarterly on the 25th of the second month after the quarter; customer payments by actual dates; leasing interest on a separate line (IAS 7.31)',
    'Налоги и взносы по зарплате': 'Payroll taxes and contributions', 'НДС к уплате (квартал)': 'VAT payable (quarter)', 'КПН к уплате (− переплата авансов)': 'CIT payable (− overpaid advances)', 'ИПН с дивидендов к уплате': 'IIT on dividends payable',
    'Резерв отпусков (IAS 19)': 'Vacation reserve (IAS 19)', 'Лизинг — текущая часть': 'Leasing — current part', 'Лизинг — долгосрочная часть': 'Leasing — non-current part',
    '(деньги + дебиторка) ÷ краткосрочные обязательства (с резервом отпусков и текущей частью лизинга)': '(cash + receivables) ÷ current liabilities (incl. vacation reserve and current part of leasing)',
    '(деньги + дебиторка) ÷ краткосрочные обязательства (с резервом отпусков и текущей частью лизинга) · норма ≥ 1,2': '(cash + receivables) ÷ current liabilities (incl. vacation reserve and current part of leasing) · norm ≥ 1.2',
    'дебиторка ÷ выручка с НДС (по ставке каждого дня) в день за 12 мес.': 'receivables ÷ daily revenue incl. VAT (at each day’s rate), 12 mo.', 'минимум прогноза денег на 13 недель (с утверждёнными выплатами) − резерв 30 млн ₸': 'minimum of the 13-week cash forecast (with approved payments) − ₸30 M buffer',
    'автономия ниже нормы 50 %': 'equity ratio below the 50% norm',
    'Проценты по остаткам на счетах': 'Interest on account balances', 'Покупка ОС и лизинг (с процентами)': 'Fixed assets and leasing (incl. interest)', 'Дивиденды (с ИПН у источника)': 'Dividends (incl. IIT at source)', 'ОС и лизинг': 'Fixed assets and leasing',
    'выплаты показаны положительными суммами; план каждой строки — факт того же месяца прошлого года × целевой рост бюджета (НДС — 25-го второго месяца после квартала по ставке квартала, КПН — авансы 25-го и доплата 10.04)': 'payments are shown as positive amounts; the plan of each line is the actual of the same month last year × the budget growth target (VAT — on the 25th of the second month after the quarter at the quarter’s rate, CIT — advances on the 25th and the top-up on 10 Apr)',
    'Тариф заказчику (базовый, без НДС)': 'Customer rate (base, excl. VAT)', 'Охранников на пост (FTE по норме ТК РК)': 'Guards per post (FTE at the Labour Code norm)', 'в т. ч. сверхурочные (1,5×) с взносами': 'of which overtime (1.5×) with contributions',
    'Прямые прочие (форма, транспорт, связь — на FTE)': 'Other direct (uniforms, transport, communications — per FTE)', 'Накладные на пост (администрация, офис, ИТ, коммерческие, прочие)': 'Overheads per post (administration, office, IT, selling, other)', 'Дневной пост': 'Daytime post',
    'Часы охранника в месяц': 'Guard hours a month', 'Лизинг, дивиденды, ОС': 'Leasing, dividends, fixed assets', 'зарплата, налоги, поставщики, лизинг и дивиденды': 'salaries, taxes, suppliers, leasing and dividends',
    'по дням с движением · поступления — по срокам актов и обычной задержке заказчика · зарплата 5-го, лизинг 12-го, поставщики 15-го, налоги 25-го (с НДС — во второй месяц после квартала, аванс КПН — каждый месяц) · остаток на конец недели = прогноз кокпита': 'days with movements · receipts — by act terms and the customer’s usual delay · salaries on the 5th, leasing on the 12th, suppliers on the 15th, taxes on the 25th (with VAT — in the second month after the quarter, the CIT advance — every month) · week-end balance = cockpit forecast',
    'зарплата 5-го, лизинг 12-го, поставщики 15-го, налоги 25-го (с НДС — во второй месяц после квартала, аванс КПН — каждый месяц)': 'salaries on the 5th, leasing on the 12th, suppliers on the 15th, taxes on the 25th (with VAT — in the second month after the quarter, the CIT advance — every month)',
    'норма месяца — 40 ч в неделю · по графику сутки/трое до 182,5 ч, сверх нормы — сверхурочные 1,5× (не больше 120 ч в год)': 'monthly norm — 40 h a week · on the one-in-four schedule up to 182.5 h, above the norm — overtime at 1.5× (no more than 120 h a year)',
    'ИПН с дивидендов': 'IIT on dividends', 'МРП, ₸': 'MCI, ₸', 'Взносы работодателя, % оклада': 'Employer contributions, % of salary', 'СН': 'Social tax',
    // «Знания»
    'выручка − себестоимость − коммерческие − административные (до амортизации, процентов и КПН)': 'revenue − cost of services − selling − administrative (before depreciation, interest and CIT)',
    'Чистая прибыль': 'Net profit', 'EBITDA − амортизация − проценты по лизингу + финансовые доходы − КПН 20 %': 'EBITDA − depreciation − leasing interest + finance income − 20% CIT',
    'Амортизация': 'Depreciation', 'по объектам ОС: 1/срок в месяц до полного износа (входящая группа — 44 мес., покупки и лизинг — 60 мес.)': 'by fixed asset: 1/life a month until fully depreciated (opening group — 44 mo., purchases and leasing — 60 mo.)', 'основные средства': 'fixed assets',
    'Охранников на пост': 'Guards per post', 'по графику (норма ТК РК): сутки/трое и вахта 15/15 — 4,4 FTE, «2/2» (12 ч) — 2,3 FTE, «5/2» (8 ч по будням) — 1,1 FTE; штат = FTE × 1,05': 'by schedule (Labour Code norm): one-in-four and 15/15 rotation — 4.4 FTE, 2/2 (12 h) — 2.3 FTE, 5/2 (8 h on weekdays) — 1.1 FTE; staff = FTE × 1.05', 'график, кадры': 'schedule, HR',
    'Сверхурочные': 'Overtime', 'часы постов − часы присутствующих охранников по норме 164,7 ч в месяц; оплата 1,5×; предел при суммированном учёте — 2 ч в сутки и 120 ч в год (ст. 78 ТК РК)': 'post hours − hours of guards present at the norm of 164.7 h a month; paid at 1.5×; limit under summarised accounting — 2 h a day and 120 h a year (Art. 78 of the Labour Code)', 'табель': 'timesheet',
    'Взносы работодателя': 'Employer contributions', 'СО 5 % от (оклад − ОПВ) + ООСМС 3 % + ОПВР 3,5 % (за 78 % ФОТ — родившиеся после 01.01.1975) + СН 6 % от (оклад − ОПВ − ВОСМС) — 2026; по годам — в «О расчёте»': 'SC 5% of (salary − pension contribution) + health 3% + employer pension 3.5% (for 78% of payroll — born after 1 Jan 1975) + social tax 6% of (salary − pension − health contributions) — 2026; by year — in “About the calculation”',
    'НК РК, Социальный кодекс': 'Tax Code, Social Code', 'НДС к уплате': 'VAT payable', 'за квартал, 25-го второго месяца после квартала': 'quarterly, on the 25th of the second month after the quarter',
    'охранники в штате ÷ потребность (FTE постов × 1,05) на дату': 'guards on staff ÷ need (post FTE × 1.05) on the date',
    // «Разработчик»
    'методика по закону: нормы труда, ставки и базы взносов, НДС за квартал, ОПиУ по уровням, ИИ-помощник, задачи, капитал, два языка': 'statutory methodology: labour norms, contribution rates and bases, quarterly VAT, P&L by level, AI assistant, tasks, equity, two languages',
    'методика по закону, ОПиУ по уровням, ИИ-помощник, задачи и проекты, чаты, капитал, два языка': 'statutory methodology, P&L by level, AI assistant, tasks and projects, chats, equity, two languages',
    'Исправления по аудиту логики и расчётов 0.8.2: норма охраны по ТК РК — 4,4 FTE на круглосуточный и 1,9 на дневной пост, тарифы подняты одним коэффициентом, сверхурочные 1,5× отдельной строкой и сигнал при превышении 12 ч в месяц и 120 ч в год, таблица графиков «человек на пост — FTE — часы»; ставки и базы взносов по закону (СН 2025 — 11 %, 2026 — 6 % без вычета СО, ООСМС 2022 — 3 %, СО от оклада − ОПВ, СН от оклада − ОПВ − ВОСМС), ИПН с вычетом 14 МРП; амортизация по объектам ОС с остановкой при полном износе; НДС за квартал (уплата 25-го второго месяца, форма 300.00); КПН — авансы по 1/12, декларация 100.00 и доплата 10.04; ИПН с дивидендов у источника; коммерческие расходы — собственные статьи (тендеры, реклама и сайт, представительские, CRM); финансовые доходы по остаткам на счетах; резерв отпусков (IAS 19); штат, вакансии и резерв 5 % в ФОТ; лизинг — текущая и долгосрочная часть, проценты в ДДС отдельно; смены по графику; юнит-экономика на той же базе, что маржа объекта; прогноз 13 недель с лизингом, дивидендами, НДС и КПН; ДДС с итогами трёх потоков; настоящая сверка в «Качестве данных»; «О расчёте» и «Знания» — методика и таблица ставок по годам': 'Fixes from the 0.8.2 logic and calculation audit: guard norm per the Labour Code — 4.4 FTE per 24-hour and 1.9 per daytime post, rates raised by one coefficient, overtime at 1.5× as a separate line with a signal above 12 h a month and 120 h a year, a schedules table “people per post — FTE — hours”; statutory contribution rates and bases (social tax 2025 — 11%, 2026 — 6% without the SC deduction, health insurance 2022 — 3%, SC on salary − pension contribution, social tax on salary − pension − health contributions), IIT after the 14 MCI deduction; depreciation by fixed asset, stopping when fully depreciated; quarterly VAT (paid on the 25th of the second month, return 300.00); CIT — advances at 1/12, return 100.00 and the top-up on 10 Apr; IIT on dividends at source; selling expenses — separate items (tenders, advertising and website, entertainment, CRM); finance income on account balances; vacation reserve (IAS 19); staff, vacancies and a 5% reserve in payroll; leasing — current and non-current part, interest shown separately in the cash flow; shifts by schedule; unit economics on the same base as site margin; 13-week forecast with leasing, dividends, VAT and CIT; cash flow with totals of the three activities; a real reconciliation in “Data quality”; “How it is calculated” and “Knowledge” — methodology and a table of rates by year',
    // 0.8.4
    'Круглосуточный пост (сутки/трое, вахта)': '24-hour post (one-in-four, rotation)',
    'Дневной пост «2/2» (12 ч)': 'Daytime post 2/2 (12 h)',
    'Дневной пост «5/2» (8 ч по будням)': 'Daytime post 5/2 (8 h on weekdays)',
    'Тариф заказчику (базовый по графику, без НДС)': 'Customer rate (base by schedule, excl. VAT)',
    'Тариф поста': 'Post rate',
    'базовый тариф по графику: 2026 — круглосуточный 1 790 000 ₸, «2/2» 940 000 ₸, «5/2» 520 000 ₸ в месяц без НДС (маржа 15–20 %); договор — базовый × коэффициент объекта': 'base rate by schedule: 2026 — 24-hour ₸1,790,000, 2/2 ₸940,000, 5/2 ₸520,000 a month excl. VAT (15–20% margin); contract — base × site coefficient',
    'договоры': 'contracts',
    'ИПН': 'IIT',
    '10 % × (оклад − ОПВ − ВОСМС − стандартный вычет: 14 МРП в месяц, с 2026 — 30 МРП); с 2026 — 15 % с годового дохода сверх 8 500 МРП': '10% × (salary − pension − health − standard deduction: 14 MCI a month, from 2026 — 30 MCI); from 2026 — 15% on annual income above 8,500 MCI',
    'НК РК, НК РК 2026': 'Tax Code, Tax Code 2026',
    'по году нарастающим итогом: 2022 — 5 %; 2023–2025 — 10 % сверх 30 000 МРП; 2026 — 5 % до 230 000 МРП, 15 % сверх': 'cumulative for the year: 5% in 2022; 10% above 30,000 MCI in 2023–2025; in 2026 — 5% up to 230,000 MCI, 15% above',
    'Стандартный вычет ИПН, МРП в месяц': 'Standard IIT deduction, MCI a month',
    'Взносы работодателя, % ФОТ': 'Employer contributions, % of payroll',
    'дивидендная способность — в «Финансах» · ИПН: 5 % до 230 000 МРП за год, сверх — 15 %': 'dividend capacity — in “Finance” · IIT: 5% up to 230,000 MCI a year, 15% above',
    'Исправления по повторному аудиту 0.8.3: стандартный вычет ИПН с 2026 года — 30 МРП (2022–2025 — 14 МРП); ИПН с дивидендов по году нарастающим итогом (2023–2025 — 10 % сверх 30 000 МРП, 2026 — 5 % до 230 000 МРП и 15 % сверх); FTE на пост по графику — сутки/трое и вахта 4,4, «2/2» 2,3, «5/2» 1,1; базовые тарифы по графику (2026 — 1 790 000, 940 000 и 520 000 ₸ в месяц) — каждый безубыточен; убыточные объекты — только с причиной (договор без индексации, тендерная цена); дивиденды 2026 — 960 млн ₸ в пределах 230 000 МРП; ОПВР — за работников, родившихся после 01.01.1975 (78 % ФОТ); пределы сверхурочных — ст. 78 ТК РК (2 ч в сутки, 120 ч в год при суммированном учёте); лизинг — текущая часть по графику и после 31.12.2026; пределы баз ВОСМС и ООСМС по годам; таблица «модель = закон» — сверка с отдельной таблицей закона, «≠» при расхождении; юнит-экономика по трём графикам; «Качество данных» — сверки ИПН с дивидендов и ставок': 'Fixes from the 0.8.3 follow-up audit: the standard IIT deduction from 2026 — 30 MCI (14 MCI in 2022–2025); IIT on dividends cumulative for the year (10% above 30,000 MCI in 2023–2025, in 2026 — 5% up to 230,000 MCI and 15% above); FTE per post by schedule — one-in-four and rotation 4.4, 2/2 — 2.3, 5/2 — 1.1; base rates by schedule (2026 — ₸1,790,000, ₸940,000 and ₸520,000 a month) — each breaks even; loss-making sites only with a reason (contract without indexation, tender price); dividends for 2026 — ₸960 M within 230,000 MCI; employer pension contributions — for employees born after 1 Jan 1975 (78% of payroll); overtime limits — Art. 78 of the Labour Code (2 h a day, 120 h a year under summarised accounting); leasing — the current part by schedule, also after 31 Dec 2026; health insurance base limits by year; the “model = law” table is checked against a separate law table, “≠” on a mismatch; unit economics for three schedules; “Data quality” — checks of IIT on dividends and of rates',
    'договор 2023 года без индексации тарифа': 'a 2023 contract without rate indexation', 'тендерная цена ниже базового тарифа': 'tender price below the base rate', 'тариф ниже рынка': 'rate below the market',
    'договор 2023 года без индексации — расторгнут заказчиком': 'a 2023 contract without rate indexation — terminated by the customer', 'ИПН: 5 % до 230 000 МРП за год, сверх — 15 %': 'IIT: 5% up to 230,000 MCI a year, 15% above',
  });

  Object.assign(I, { templates, translate, restore, untranslated, trText: tr, templateCount: () => TPL.length });
})();
