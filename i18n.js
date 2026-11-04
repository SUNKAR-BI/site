// SUNKAR BI · i18n.js — словарь RU/EN, форматы чисел, денег, дат и склонений, переключатель языка.
// Подключается первым (до catalog.js и world.js), ни от чего не зависит.
//
// Как пользоваться (для модулей):
//   I18N.t('nav.tasks')                    → строка на текущем языке; нет перевода на EN — русская строка; нет ключа — сам ключ
//   I18N.t('rl.days', { n: 5 })            → подстановка {n}
//   I18N.add('en', { 'tasks.title': 'Tasks' })   → модуль регистрирует СВОЙ словарь в СВОЁМ файле (i18n.js не правится модулями);
//                                            ключи модуля — с префиксом модуля (tasks.*, chat.*, ai.*, cards.*, an.*, eq.*)
//   I18N.phrases('en', { 'Кадры': 'HR' })  → перевод старых русских строк по самому тексту (для разделов, ещё не переведённых на ключи);
//   I18N.tx('Кадры')                       → 'HR' на EN, 'Кадры' на RU; неизвестная фраза возвращается как есть — страница не ломается
//   I18N.n(v, d) · I18N.int(v) · I18N.pct(v, d) · I18N.money(v, sym, d) · I18N.date(i) · I18N.dateShort(i) · I18N.dateLong(i)
//   I18N.month(m, 'short'|'long') · I18N.plural(n, 'u.day') или I18N.plural(n, ['день','дня','дней'])
//   I18N.w('Объект № 18') → 'Site No. 18' на EN (имена-номера мира: объекты, заказчики, регионы, виды объектов)
//   I18N.on(fn)                            → fn(lang) после смены языка (ядро app.js перерисовывает страницу)
//   разметка: data-i18n="ключ" (текст элемента), data-i18n-attr="aria-label:ключ,placeholder:ключ2" (атрибуты)
(function(){
  'use strict';
  const LS = 'sunkar-lang', LANGS = ['ru', 'en'];
  const DICT = { ru: {}, en: {} }, PHR = { en: {} }, listeners = [], missing = new Set();
  let lang = 'ru';
  try { const v = localStorage.getItem(LS); if (LANGS.includes(v)) lang = v; } catch(e){}

  const LOC = () => lang === 'en' ? 'en-US' : 'ru-RU';
  const fill = (s, vars) => vars ? String(s).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : s;
  function t(key, vars){
    const d = DICT[lang], v = d[key] != null ? d[key] : DICT.ru[key];
    if (v == null){ missing.add(lang + ':' + key); return key; }
    if (d[key] == null && lang !== 'ru') missing.add(lang + ':' + key);
    return fill(v, vars);
  }
  const has = key => DICT.ru[key] != null || DICT.en[key] != null;
  function add(l, dict){ if (!DICT[l]) DICT[l] = {}; Object.assign(DICT[l], dict || {}); }
  function phrases(l, map){ if (!PHR[l]) PHR[l] = {}; Object.assign(PHR[l], map || {}); }
  const tx = (s, vars) => { if (lang === 'ru' || s == null) return fill(s, vars); const p = PHR[lang] && PHR[lang][s]; return fill(p != null ? p : s, vars); };

  // ---------- числа ----------
  const nfCache = {};
  const nf = d => { const k = lang + d; return nfCache[k] || (nfCache[k] = new Intl.NumberFormat(LOC(), { minimumFractionDigits: d, maximumFractionDigits: d })); };
  const neg = s => s.replace(/^-/, '−');
  // число с d знаками; «−0,0» показывается как «0,0»
  const n = (v, d = 1) => { const s = nf(d).format(+v || 0); return /^-[0,.\s ]+$/.test(s) ? s.slice(1) : neg(s); };
  const int = v => neg(nf(0).format(Math.round(+v || 0)));
  const pct = (v, d = 1) => lang === 'en' ? n(v, d) + '%' : n(v, d) + ' %';
  // деньги в уже пересчитанной валюте: RU «1,2 млн ₸», EN «₸1.2 M»
  function money(v, sym, dm = 1){
    const a = Math.abs(v); let num, u;
    if (a >= 1e9){ num = n(v/1e9, 2); u = 'b'; } else if (a < 1e6 && a >= 1){ num = int(v/1e3); u = 'k'; } else { num = n(v/1e6, dm); u = 'm'; }
    if (lang === 'en'){ const s = num.startsWith('−') ? '−' : ''; return `${s}${sym}${num.replace(/^−/, '')} ${({ b:'B', k:'K', m:'M' })[u]}`; }
    return `${num} ${({ b:'млрд', k:'тыс', m:'млн' })[u]} ${sym}`;
  }

  // ---------- даты (индекс дня мира или Date) ----------
  const MON = { ru: ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'], en: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] };
  const MONF = { ru: ['январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'], en: ['January','February','March','April','May','June','July','August','September','October','November','December'] };
  const WD = { ru: ['вс','пн','вт','ср','чт','пт','сб'], en: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'] };
  const DAY0 = Date.UTC(2022, 0, 1);
  const toD = i => i instanceof Date ? i : (window.WORLD && window.WORLD.toDate ? window.WORLD.toDate(i) : new Date(DAY0 + i*864e5));
  const p2 = x => String(x).padStart(2, '0');
  const date = i => { const d = toD(i); return lang === 'en' ? `${d.getUTCDate()} ${MON.en[d.getUTCMonth()]} ${d.getUTCFullYear()}` : `${p2(d.getUTCDate())}.${p2(d.getUTCMonth()+1)}.${d.getUTCFullYear()}`; };
  const dateShort = i => { const d = toD(i); return lang === 'en' ? `${d.getUTCDate()} ${MON.en[d.getUTCMonth()]}` : `${p2(d.getUTCDate())}.${p2(d.getUTCMonth()+1)}`; };
  const dateLong = i => { const d = toD(i); return `${d.getUTCDate()} ${MON[lang][d.getUTCMonth()]} ${d.getUTCFullYear()}, ${WD[lang][d.getUTCDay()]}`; };
  const month = (m, form = 'short') => (form === 'long' ? MONF : MON)[lang][((m % 12) + 12) % 12];
  const months = (form = 'short') => (form === 'long' ? MONF : MON)[lang].slice();
  const weekdays = () => WD[lang].slice();
  const time = ts => new Date(ts).toLocaleTimeString(LOC(), { hour: '2-digit', minute: '2-digit', hour12: false });

  // ---------- склонения ----------
  const prCache = {};
  function plural(num, forms){
    const f = Array.isArray(forms) ? forms : (DICT[lang][forms] || DICT.ru[forms]);
    if (!f) return String(forms);
    const arr = typeof f === 'string' ? f.split('|') : f;
    if (lang === 'ru' || arr.length === 3){ const a = Math.abs(Math.round(num)) % 100, b = a % 10; return a > 10 && a < 20 ? arr[2] : (b === 1 ? arr[0] : (b >= 2 && b <= 4 ? arr[1] : arr[2])); }
    const pr = prCache[lang] || (prCache[lang] = new Intl.PluralRules(LOC()));
    return pr.select(num) === 'one' ? arr[0] : arr[arr.length - 1];
  }

  // ---------- имена-номера мира ----------
  function w(s){
    if (lang === 'ru' || s == null) return s;
    let r = String(s);
    r = r.replace(/ТОО «Заказчик-(\d+)»/g, 'Customer-$1 LLP').replace(/Объект № (\d+)/g, 'Site No. $1').replace(/пост (\d+)/g, 'post $1');
    const p = PHR[lang] && PHR[lang][r]; return p != null ? p : r;
  }

  // ---------- разметка и переключатель ----------
  function apply(root = document){
    root.querySelectorAll('[data-i18n]').forEach(el => {
      const v = t(el.dataset.i18n), tn = [...el.childNodes].find(x => x.nodeType === 3 && x.nodeValue.trim());
      if (tn) tn.nodeValue = (/^\s/.test(tn.nodeValue) ? ' ' : '') + v + (/\s$/.test(tn.nodeValue) ? ' ' : '');
      else if (!el.children.length) el.textContent = v;
    });
    root.querySelectorAll('[data-i18n-attr]').forEach(el => el.dataset.i18nAttr.split(',').forEach(pair => { const [a, k] = pair.split(':').map(x => x.trim()); if (a && k) el.setAttribute(a, t(k)); }));
    root.querySelectorAll('[data-lang]').forEach(b => { const on = b.dataset.lang === lang; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
    document.documentElement.lang = lang;
  }
  function set(l){
    if (!LANGS.includes(l) || l === lang) return;
    lang = l; try { localStorage.setItem(LS, l); } catch(e){}
    apply();
    listeners.slice().forEach(fn => { try { fn(lang); } catch(e){ console.error(e); } });
    try { window.dispatchEvent(new CustomEvent('sunkar:lang', { detail: { lang } })); } catch(e){}
  }
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-lang]'); if (b) set(b.dataset.lang); });

  // ---------- словарь каркаса (меню, шапка, роли, общие кнопки, подвал) ----------
  add('ru', {
    'brand.sub': 'управление охранным агентством', 'nav.aria': 'Разделы', 'nav.aria2': 'Помощники и настройки', 'nav.aria3': 'Справка', 'side.close': 'Закрыть меню',
    'nav.grp.main': 'Главная', 'nav.grp.collab': 'Совместная работа', 'nav.grp.security': 'Охрана', 'nav.grp.people': 'Люди и право', 'nav.grp.commerce': 'Коммерция и финансы', 'nav.grp.resources': 'Ресурсы', 'nav.grp.system': 'Система',
    'nav.kokpit': 'Кокпит', 'nav.desk': 'Рабочий стол', 'nav.owner': 'Учредитель', 'nav.tasks': 'Задачи и проекты', 'nav.docflow': 'Приказы и записки', 'nav.chats': 'Чаты',
    'nav.objects': 'Объекты и посты', 'nav.shifts': 'Смены и отметки', 'nav.incidents': 'Происшествия и проверки', 'nav.hr': 'Кадры', 'nav.legal': 'Юридический',
    'nav.sales': 'Продажи и заказчики', 'nav.finance': 'Финансы: ОПиУ, ДДС, баланс', 'nav.payments': 'Платежи и закрытие', 'nav.taxes': 'Налоги и отчисления', 'nav.budget': 'Бюджет и планирование',
    'nav.supply': 'Склады и снабжение', 'nav.fleet': 'Автопарк', 'nav.quality': 'Качество данных', 'nav.onec': 'Сервер и 1С', 'nav.ai': 'Ассистенты и наставники', 'nav.admin': 'Администратор', 'nav.dev': 'Разработчик',
    'nav.docs': 'Документы', 'nav.knowledge': 'Знания', 'nav.refresh': 'Обновить данные', 'nav.about': 'О данных', 'ai.btn': 'ИИ-помощник', 'ai.top': '✦ ИИ',
    'top.menu': 'Меню', 'top.filters': 'Фильтры ▾', 'top.asof': 'Данные на', 'top.asof_aria': 'Данные на дату', 'top.today': 'На сегодня', 'top.today_title': 'вернуть дату «Данные на» к сегодняшней',
    'top.period': 'Период', 'top.from': 'с', 'top.to': 'по', 'top.from_aria': 'Период с', 'top.to_aria': 'Период по', 'top.region': 'Регион', 'top.otype': 'Тип объектов',
    'top.all_regions': 'Все регионы', 'top.all_objects': 'Все объекты', 'top.obj24': 'Круглосуточные', 'top.objday': 'Дневные', 'top.currency': 'Валюта', 'top.lang': 'Язык',
    'top.search': 'Поиск', 'top.search_ph': 'Поиск: объект, заказчик, город, автомобиль, задача — Enter', 'top.calc': 'ⓘ О расчёте', 'top.reset': 'Сбросить',
    'top.prev': 'Назад на {s}', 'top.next': 'Вперёд на {s}', 'step.day': 'день', 'step.week': 'неделю', 'step.month': 'месяц', 'step.year': 'год',
    'per.quick': 'Быстрый срез', 'per.other': 'Другой период', 'per.nodata': 'нет данных', 'per.pick': 'выбрать даты', 'per.from_asof': 'отсчёт от даты «Данные на» {d}', 'per.from_today': 'отсчёт от сегодня',
    'per.day': 'Сегодня', 'per.yday': 'Вчера', 'per.cweek': 'Текущая неделя', 'per.pweek': 'Прошлая неделя', 'per.month': 'Текущий месяц', 'per.pmonth': 'Прошлый месяц', 'per.ytd': 'Текущий год', 'per.pyear': 'Прошлый год',
    'per.week': '7 дней', 'per.quarter': 'Квартал', 'per.12m': '12 мес.', 'per.custom': 'Свой период',
    'rl.day': 'День', 'rl.yday': 'Предыдущий день', 'rl.cweek': 'Неделя на дату', 'rl.month': 'Месяц на дату', 'rl.quarter': 'Квартал на дату', 'rl.ytd': 'Год на дату', 'rl.12m': '12 месяцев', 'rl.12m_from': '12 месяцев (данные с {d})', 'rl.period': 'Период',
    'rl.data_to': 'данные по {d}', 'rl.today': '(сегодня)', 'rl.from_anchor': 'отсчёт от {d}', 'rl.prev': 'прошлый период {a} – {b}', 'rl.yago': 'год назад {a} – {b}', 'rl.yago_none': 'год назад — нет данных',
    'u.day': ['день','дня','дней'], 'u.member': ['участник','участника','участников'],
    'src.signals': 'демо-данные · остатки и сигналы на {d}', 'src.balances': 'демо-данные · остатки на {d}', 'calc.time': 'пересчёт {ms} мс',
    'notice.export': '⚠ Движок не принял выгрузку 1С {d} ({ok} из {all}) — в отчётах последняя принятая версия.', 'notice.backup': '⚠ {d}: ночной бэкап 1С не выполнен — нужно решение по диску копий.', 'notice.more': 'подробнее',
    'onec.rejected': 'выгрузка 1С отклонена', 'onec.backup': 'ночной бэкап 1С не выполнен',
    'flt.only': 'только {o}', 'flt.region': 'регион: {r}', 'flt.all_regions': 'все регионы', 'flt.all_objects': 'все объекты', 'flt.obj24': 'круглосуточные', 'flt.objday': 'дневные', 'flt.own_cust': 'свои заказчики',
    'role.viewing_as': 'Вы смотрите как:', 'role.by_rights': 'меню и данные — по правам роли', 'role.back': 'вернуться к исполнительному директору', 'role.view_as': 'Смотреть как', 'role.view_as_aria': 'Смотреть как роль', 'role.sub': '{g} · ступень ИИ {s}',
    'role.owner': 'Учредитель', 'role.gd': 'Генеральный директор', 'role.ed': 'Исполнительный директор', 'role.gb': 'Главный бухгалтер', 'role.buh': 'Бухгалтер', 'role.sec': 'Начальник охраны', 'role.dep': 'Заместитель начальника охраны',
    'role.obj': 'Начальник объекта', 'role.senior': 'Старший смены', 'role.guard': 'Охранник', 'role.hr': 'Кадровик', 'role.law': 'Юрист', 'role.cd': 'Коммерческий директор', 'role.mgr': 'Менеджер по продажам',
    'role.sup': 'Снабженец', 'role.mech': 'Механик', 'role.drv': 'Водитель', 'role.disp': 'Диспетчер', 'role.adm': 'Администратор системы', 'role.dev': 'Разработчик',
    'btn.create_task': 'Создать задачу', 'btn.ask_ai': 'Спросить ИИ', 'btn.doc': 'Документ-основание', 'btn.close': 'Закрыть', 'btn.send': 'Отправить', 'btn.cancel': 'Отмена', 'btn.save': 'Сохранить', 'btn.back': 'Назад', 'btn.more': 'Показать ещё',
    'card.data_on': 'данные на {d}', 'card.period': 'период {p}', 'card.task_made': 'Задача создана', 'calc.title': 'О расчёте',
    'aip.title': 'ИИ-помощник', 'aip.step': '· ступень 1: советует и готовит', 'aip.ph': 'Спросить по данным своей роли…', 'aip.q': 'Вопрос', 'aip.loading': 'Загружаю сводку…', 'aip.duty': 'дежурный директор',
    'aip.chip.staff': 'Укомплектованность', 'aip.chip.loss': 'Объекты в убытке', 'aip.chip.rev': 'Выручка за период', 'aip.chip.ar': 'Дебиторка', 'aip.chip.onec': 'Сервер 1С', 'aip.chip.salary': 'Зарплата сотрудника',
    'theme.label': 'Тема', 'theme.auto': 'Авто', 'theme.light': 'Светлая', 'theme.dark': 'Тёмная', 'empty.none': 'нет данных',
    'foot.text': 'демо-данные ТОО «SUNKAR SECURITY SERVICES» по дням 01.01.2022–31.12.2026 · все имена, объекты и суммы вымышлены ·', 'foot.about': 'о данных',
    'srv.new_wait': ' · вышла новая версия — откроется, когда закончите ввод', 'srv.new_go': ' · вышла новая версия — обновляю…', 'srv.ok': ' · сервер работает · проверка данных 1С в {a}, следующая в {b}{f} · версия {v} ({bd})', 'srv.partial': ' · выгрузка неполная',
    'srv.site': ' · версия от {d} {t} · новая версия проверяется каждые 10 минут', 'srv.offline': ' · нет связи с сервером, повтор позже', 'unit.mln': 'млн',
  });
  add('en', {
    'brand.sub': 'security agency management', 'nav.aria': 'Sections', 'nav.aria2': 'Assistants and settings', 'nav.aria3': 'Help', 'side.close': 'Close menu',
    'nav.grp.main': 'Home', 'nav.grp.collab': 'Teamwork', 'nav.grp.security': 'Security', 'nav.grp.people': 'People & legal', 'nav.grp.commerce': 'Sales & finance', 'nav.grp.resources': 'Resources', 'nav.grp.system': 'System',
    'nav.kokpit': 'Cockpit', 'nav.desk': 'Workspace', 'nav.owner': 'Founder', 'nav.tasks': 'Tasks & projects', 'nav.docflow': 'Orders & memos', 'nav.chats': 'Chats',
    'nav.objects': 'Sites & posts', 'nav.shifts': 'Shifts & check-ins', 'nav.incidents': 'Incidents & inspections', 'nav.hr': 'HR', 'nav.legal': 'Legal',
    'nav.sales': 'Sales & customers', 'nav.finance': 'Finance: P&L, cash flow, balance', 'nav.payments': 'Payments & close', 'nav.taxes': 'Taxes & contributions', 'nav.budget': 'Budget & planning',
    'nav.supply': 'Warehouse & supply', 'nav.fleet': 'Fleet', 'nav.quality': 'Data quality', 'nav.onec': 'Server & 1C', 'nav.ai': 'Assistants & mentors', 'nav.admin': 'Administrator', 'nav.dev': 'Developer',
    'nav.docs': 'Documents', 'nav.knowledge': 'Knowledge', 'nav.refresh': 'Refresh data', 'nav.about': 'About the data', 'ai.btn': 'AI assistant', 'ai.top': '✦ AI',
    'top.menu': 'Menu', 'top.filters': 'Filters ▾', 'top.asof': 'Data as of', 'top.asof_aria': 'Data as of date', 'top.today': 'Today', 'top.today_title': 'reset “Data as of” to today',
    'top.period': 'Period', 'top.from': 'from', 'top.to': 'to', 'top.from_aria': 'Period from', 'top.to_aria': 'Period to', 'top.region': 'Region', 'top.otype': 'Site type',
    'top.all_regions': 'All regions', 'top.all_objects': 'All sites', 'top.obj24': '24-hour', 'top.objday': 'Daytime', 'top.currency': 'Currency', 'top.lang': 'Language',
    'top.search': 'Search', 'top.search_ph': 'Search: site, customer, city, vehicle, task — Enter', 'top.calc': 'ⓘ How it is calculated', 'top.reset': 'Reset',
    'top.prev': 'Back one {s}', 'top.next': 'Forward one {s}', 'step.day': 'day', 'step.week': 'week', 'step.month': 'month', 'step.year': 'year',
    'per.quick': 'Quick range', 'per.other': 'Other period', 'per.nodata': 'no data', 'per.pick': 'pick dates', 'per.from_asof': 'counted from “Data as of” {d}', 'per.from_today': 'counted from today',
    'per.day': 'Today', 'per.yday': 'Yesterday', 'per.cweek': 'This week', 'per.pweek': 'Last week', 'per.month': 'This month', 'per.pmonth': 'Last month', 'per.ytd': 'This year', 'per.pyear': 'Last year',
    'per.week': '7 days', 'per.quarter': 'Quarter', 'per.12m': '12 months', 'per.custom': 'Custom period',
    'rl.day': 'Day', 'rl.yday': 'Previous day', 'rl.cweek': 'Week to date', 'rl.month': 'Month to date', 'rl.quarter': 'Quarter to date', 'rl.ytd': 'Year to date', 'rl.12m': '12 months', 'rl.12m_from': '12 months (data from {d})', 'rl.period': 'Period',
    'rl.data_to': 'data to {d}', 'rl.today': '(today)', 'rl.from_anchor': 'counted from {d}', 'rl.prev': 'previous period {a} – {b}', 'rl.yago': 'a year ago {a} – {b}', 'rl.yago_none': 'a year ago — no data',
    'u.day': ['day','days'], 'u.member': ['member','members'],
    'src.signals': 'demo data · balances and signals as of {d}', 'src.balances': 'demo data · balances as of {d}', 'calc.time': 'recalculated in {ms} ms',
    'notice.export': '⚠ The engine rejected the 1C export of {d} ({ok} of {all}) — reports use the last accepted version.', 'notice.backup': '⚠ {d}: the nightly 1C backup failed — a decision on the backup disk is needed.', 'notice.more': 'details',
    'onec.rejected': '1C export rejected', 'onec.backup': 'nightly 1C backup failed',
    'flt.only': 'only {o}', 'flt.region': 'region: {r}', 'flt.all_regions': 'all regions', 'flt.all_objects': 'all sites', 'flt.obj24': '24-hour', 'flt.objday': 'daytime', 'flt.own_cust': 'own customers',
    'role.viewing_as': 'You are viewing as:', 'role.by_rights': 'menu and data follow the role’s rights', 'role.back': 'back to the executive director', 'role.view_as': 'View as', 'role.view_as_aria': 'View as role', 'role.sub': '{g} · AI level {s}',
    'role.owner': 'Founder', 'role.gd': 'General director', 'role.ed': 'Executive director', 'role.gb': 'Chief accountant', 'role.buh': 'Accountant', 'role.sec': 'Head of security', 'role.dep': 'Deputy head of security',
    'role.obj': 'Site manager', 'role.senior': 'Shift supervisor', 'role.guard': 'Security guard', 'role.hr': 'HR officer', 'role.law': 'Lawyer', 'role.cd': 'Commercial director', 'role.mgr': 'Sales manager',
    'role.sup': 'Procurement officer', 'role.mech': 'Mechanic', 'role.drv': 'Driver', 'role.disp': 'Dispatcher', 'role.adm': 'System administrator', 'role.dev': 'Developer',
    'btn.create_task': 'Create task', 'btn.ask_ai': 'Ask AI', 'btn.doc': 'Source document', 'btn.close': 'Close', 'btn.send': 'Send', 'btn.cancel': 'Cancel', 'btn.save': 'Save', 'btn.back': 'Back', 'btn.more': 'Show more',
    'card.data_on': 'data as of {d}', 'card.period': 'period {p}', 'card.task_made': 'Task created', 'calc.title': 'How it is calculated',
    'aip.title': 'AI assistant', 'aip.step': '· level 1: advises and prepares', 'aip.ph': 'Ask about your role’s data…', 'aip.q': 'Question', 'aip.loading': 'Loading the summary…', 'aip.duty': 'duty director',
    'aip.chip.staff': 'Staffing', 'aip.chip.loss': 'Loss-making sites', 'aip.chip.rev': 'Revenue for the period', 'aip.chip.ar': 'Receivables', 'aip.chip.onec': '1C server', 'aip.chip.salary': 'Employee salary',
    'theme.label': 'Theme', 'theme.auto': 'Auto', 'theme.light': 'Light', 'theme.dark': 'Dark', 'empty.none': 'no data',
    'foot.text': 'demo data of SUNKAR SECURITY SERVICES LLP by day, 01.01.2022–31.12.2026 · all names, sites and amounts are fictional ·', 'foot.about': 'about the data',
    'srv.new_wait': ' · a new version is out — it will open when you finish typing', 'srv.new_go': ' · a new version is out — updating…', 'srv.ok': ' · server is running · 1C data checked at {a}, next at {b}{f} · version {v} ({bd})', 'srv.partial': ' · export incomplete',
    'srv.site': ' · version of {d} {t} · checking for a new version every 10 minutes', 'srv.offline': ' · no connection to the server, retrying later', 'unit.mln': 'M',
  });
  // заголовки разделов, группы ролей и перечислимые значения мира — по русскому тексту (разделы ещё на русских литералах)
  phrases('en', {
    'Руководство': 'Management', 'Финансы': 'Finance', 'Охрана': 'Security', 'Люди и право': 'People & legal', 'Коммерция': 'Commerce', 'Ресурсы': 'Resources', 'Система': 'System',
    'Автопарк': 'Fleet', 'Администратор': 'Administrator', 'Бюджет и планирование': 'Budget & planning', 'Документы': 'Documents', 'Задачи и проекты': 'Tasks & projects', 'Знания': 'Knowledge',
    'ИИ-помощник': 'AI assistant', 'Кадры': 'HR', 'Качество данных': 'Data quality', 'Кокпит<span class="hm"> исполнительного директора</span>': 'Cockpit<span class="hm"> of the executive director</span>',
    'Мои документы': 'My documents', 'Налоги и социальные отчисления': 'Taxes & social contributions', 'Нет доступа': 'No access', 'О данных': 'About the data', 'Обновить данные': 'Refresh data',
    'Объекты и посты': 'Sites & posts', 'Платежи и закрытие месяца': 'Payments & month-end close', 'Приказы и служебные записки': 'Orders & memos', 'Продажи и заказчики': 'Sales & customers',
    'Происшествия и проверки': 'Incidents & inspections', 'Разработчик': 'Developer', 'Сервер и 1С': 'Server & 1C', 'Склады и снабжение': 'Warehouse & supply', 'Смены и отметки': 'Shifts & check-ins',
    'Чаты': 'Chats', 'Юридический блок': 'Legal', 'Учредитель': 'Founder',
    'Алматы': 'Almaty', 'Астана': 'Astana', 'Шымкент': 'Shymkent', 'Карагандинская': 'Karaganda region', 'Атырауская': 'Atyrau region', 'Мангистауская': 'Mangystau region', 'Актюбинская': 'Aktobe region',
    'Караганда': 'Karaganda', 'Атырау': 'Atyrau', 'Актау': 'Aktau', 'Актобе': 'Aktobe',
    'офис банка': 'bank office', 'бизнес-центр': 'business centre', 'торговый центр': 'shopping centre', 'склад': 'warehouse', 'автостоянка': 'car park', 'ЖК': 'residential complex', 'гос. учреждение': 'public institution',
    'рынок': 'market', 'производство': 'plant', 'ТЭЦ (подряд)': 'power plant (subcontract)', 'месторождение (вахта 15/15)': 'oil field (15/15 rotation)', 'месторождение': 'oil field', 'база снабжения': 'supply base', 'порт-терминал': 'port terminal',
  });

  window.I18N = {
    get lang(){ return lang; }, get locale(){ return LOC(); }, langs: LANGS.slice(),
    t, has, add, phrases, tx, w, set, apply, on: fn => { if (typeof fn === 'function') listeners.push(fn); },
    n, int, pct, money, date, dateShort, dateLong, month, months, weekdays, time, plural, missing,
    _phr: PHR, keys: l => Object.keys(DICT[l] || {}),      // для i18n-content.js (перевод по тексту) и tools/i18n-check.js
  };
  apply();
})();
