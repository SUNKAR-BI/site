// SUNKAR BI · cards.js — модуль «cards» (шаг 2A, пункт 5): openCard({kind,id,ctx}), CARDS[kind] — построители карточек всех видов, стек вложенных карточек (K.modal),
// wire(root) — карточки по нажатию на строки и плитки. Построитель → { title, sub, badges, blocks:[{h,html,tab}], actions, related, go, owner }; > 4 блоков — вкладки. Права роли проверяет каждый построитель.
(function(){
  'use strict';
  const I = window.I18N, t = (k, v) => I.t(k, v), tc = (k, v) => I.t('cards.' + k, v);
  let K = null, A = null;
  const CARDS = {};
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;' }[c]));
  const strip = s => String(s == null ? '' : s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const W = () => K.W, R = () => K.RNG, F = () => K.fmt, KR = () => K.roles;
  const role = () => KR().roleOf(K.S.role);
  const money = () => KR().hasMoney(role());
  const finRole = () => { const r = role(); return r.rt.finance !== '·' || ['П','Б'].includes(r.rt.sales); };
  const hash = () => (location.hash || '#kokpit').slice(1);
  const sec = () => hash().split('-')[0];
  const w = s => I.w(s), tx = s => I.tx(s);
  const pill = (txt, kind) => `<span class="pill s s-${kind || 'mute'}">${esc(txt)}</span>`;
  const kv = pairs => { const p = pairs.filter(x => x && x[1] != null && strip(x[1]) !== ''); return p.length ? `<dl class="kv cd-kv">${p.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>` : ''; };
  const chip = (card, label) => `<button type="button" class="cd-chip" data-card="${esc(card)}">${esc(label)}</button>`;
  const tbl = (id, o) => A.table2({ pageSize: 10, keep: true, compact: true, ...o, id: 'cd-' + id }), NB = { search: false, csv: false };
  const D = () => K.data, MS = { kind: 'money', sum: 'sum' };
  const note = s => `<p class="note">${s}</p>`;
  const per = () => F().periodTxt();
  const dash = '—';
  const cls = (v, low, good = 10) => v < 0 ? 'dn' : (v < good ? 'wn' : 'up');
  const objRe = o => new RegExp(o.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?!\\d)');
  const byId = (arr, id) => arr.find(x => String(x.id) === String(id));
  const months = to => D().months12(to);
  const nm = v => F().conv(v) / 1e6;

  // ---------- словарь модуля ----------
  I.add('ru', {
    'cards.task': 'Создать задачу', 'cards.ask': 'Спросить ИИ', 'cards.doc': 'Документ-основание', 'cards.go': 'Открыть раздел',     'cards.ask_q': 'Расскажи подробнее: {t} ({c})', 'cards.task_note': 'Задача «{t}» создана, ответственный — {o}; она на доске «Задачи и проекты»; {m}.', 'cards.task_shared': 'её видят все, кто открыл ссылку', 'cards.task_local': 'сохранена в этом браузере',
    'cards.ro': 'У вас только просмотр — задачу создать нельзя.', 'cards.task_done': 'Задача создана',
    'cards.tab.main': 'Главное', 'cards.tab.dyn': 'Динамика', 'cards.tab.rel': 'Связано', 'cards.tab.chain': 'Сквозная', 'cards.tab.hist': 'История',
    'cards.data_on': 'данные на {d}', 'cards.period': 'период {p}', 'cards.denied': 'Нет доступа', 'cards.denied_t': 'Роль «{r}» эту запись не видит: {w}.',
    'cards.denied_scope': 'данные другого объекта или региона', 'cards.denied_money': 'финансовые данные недоступны', 'cards.notfound': 'Запись не найдена на выбранную дату.',
    'cards.at': 'На дату {d}', 'cards.for_period': 'За период {p}', 'cards.dyn12': 'Динамика · 12 месяцев', 'cards.history': 'История', 'cards.related': 'Связанные записи',
    'cards.formula': 'Как считается', 'cards.source': 'Источник данных', 'cards.value': 'Значение', 'cards.on_tile': 'на плитке', 'cards.vs_prev': 'К прошлому периоду', 'cards.vs_yago': 'К году назад',
    'cards.sum_ok': 'сумма разложения = значение ({v})', 'cards.signal': 'Сигнал', 'cards.sig_bad': 'Красная полоса: показатель в зоне проблемы — {f}', 'cards.sig_warn': 'Жёлтая полоса: нужно внимание — {f}', 'cards.sig_ok': 'Полосы нет: проблем по этому показателю нет.',
    'cards.by_region': 'По регионам', 'cards.by_channel': 'По каналам сбыта', 'cards.top_objects': 'Объекты', 'cards.top_customers': 'Заказчики', 'cards.by_age': 'По срокам', 'cards.by_type': 'По видам', 'cards.by_mode': 'По режиму',
    'cards.by_inspector': 'По проверяющим', 'cards.by_score': 'По оценке', 'cards.by_owner': 'По ответственным', 'cards.by_tax': 'По налогам', 'cards.by_month': 'По месяцам периода', 'cards.by_day': 'По дням', 'cards.by_object': 'По объектам', 'cards.children': 'Статьи',
    'cards.pl_structure': 'Структура ОПиУ', 'cards.cash_move': 'Движение денег {p}', 'cards.staff_split': 'Состав', 'cards.guards_by_region': 'Охранники по регионам (FTE × 1,05)', 'cards.stages': 'Этапы',
    'cards.not_opened': 'Не открыты смены', 'cards.loss_list': 'Объекты в убытке', 'cards.open_presc': 'Предписания', 'cards.expiring': 'Договоры', 'cards.cars': 'Автомобили', 'cards.below_min': 'Ниже минимума, степень',
    'cards.overdue_list': 'Просроченные задачи', 'cards.launched': 'Запущено за период: {n}', 'cards.terminated': 'Расторгнуто за период: {n}',
    'cards.mode24': 'круглосуточные', 'cards.modeday': 'дневные', 'cards.dayshift': 'дневной', 'cards.guards': 'Охранники', 'cards.admin': 'Администрация', 'cards.hires': 'Принято', 'cards.fires': 'Уволено', 'cards.net': 'Нетто',
    'cards.vac': 'Отпуск', 'cards.sick': 'Больничный', 'cards.absent': 'Не вышли', 'cards.cert30': 'Удостоверения · 30 дней', 'cards.cert90': 'Удостоверения · 90 дней', 'cards.medical': 'Медосмотры', 'cards.training': 'Обучение',
    'cards.due.cert': 'Удостоверения охранников (30 дн.)', 'cards.due.permit': 'Разрешения (30 дн.)', 'cards.due.contract': 'Договоры (60 дн.)', 'cards.due.ins': 'Страховки авто (30 дн.)', 'cards.due.insp': 'Техосмотры авто (30 дн.)',
    'cards.age.unbilled': 'Начислено без акта', 'cards.age.notDue': 'Срок не наступил', 'cards.age.d30': 'Просрочка 1–30 дней', 'cards.age.d60': '31–60 дней', 'cards.age.d90': '61–90 дней', 'cards.age.d90p': 'Более 90 дней',
    'cards.fn.requests': 'Запросы и тендеры', 'cards.fn.kp': 'Коммерческие предложения', 'cards.fn.neg': 'Переговоры и осмотр', 'cards.fn.signed': 'Договоры подписаны', 'cards.fn.launched': 'Объекты запущены',
    'cards.pl.revenue': 'Выручка', 'cards.pl.guardC': 'Охранники (ФОТ с взносами)', 'cards.pl.adminC': 'Администрация (ФОТ с взносами)', 'cards.pl.opex': 'Операционные расходы', 'cards.pl.uniform': 'Форма и спецсредства', 'cards.pl.transport': 'Транспорт и ГСМ',
    'cards.pl.comms': 'Связь', 'cards.pl.office': 'Офис и аренда', 'cards.pl.other': 'Прочие', 'cards.pl.it': 'ИТ и программное обеспечение', 'cards.pl.ebitda': 'EBITDA', 'cards.pl.dep': 'Амортизация', 'cards.pl.ebit': 'Операционная прибыль (EBIT)',
    'cards.pl.interest': 'Проценты по лизингу', 'cards.pl.ebt': 'Прибыль до налога', 'cards.pl.cit': 'КПН', 'cards.pl.net': 'Чистая прибыль',
    'cards.cf.open': 'Остаток на начало', 'cards.cf.inCustomers': 'Поступления от заказчиков', 'cards.cf.salaries': 'Зарплата на руки', 'cards.cf.payrollTaxes': 'Налоги и взносы по зарплате', 'cards.cf.vat': 'НДС (за квартал)', 'cards.cf.cit': 'КПН (авансы и доплата)', 'cards.cf.suppliers': 'Поставщики и прочие',
    'cards.cf.operating': 'Операционный поток', 'cards.cf.capex': 'Покупка ОС', 'cards.cf.leasingPay': 'Лизинг — основной долг', 'cards.cf.dividends': 'Дивиденды на руки', 'cards.cf.net': 'Чистый поток', 'cards.cf.close': 'Остаток на конец',
    'cards.bs.cash': 'Деньги', 'cards.bs.ar': 'Дебиторка заказчиков (с НДС)', 'cards.bs.inv': 'Запасы склада', 'cards.bs.faNet': 'Основные средства, нетто', 'cards.bs.assets': 'Итого активы', 'cards.bs.ap': 'Поставщики', 'cards.bs.salpay': 'Зарплата к выплате',
    'cards.bs.paytax': 'Налоги и взносы по зарплате', 'cards.bs.vat': 'НДС к уплате (квартал)', 'cards.bs.citpay': 'КПН к уплате (− переплата авансов)', 'cards.bs.leasing': 'Лизинг — итого', 'cards.bs.liabilities': 'Итого обязательства', 'cards.bs.charter': 'Уставный капитал',
    'cards.bs.reStart': 'Нераспределённая прибыль на начало года', 'cards.bs.profitYear': 'Прибыль с начала года', 'cards.bs.dividendsYear': 'Дивиденды с начала года', 'cards.bs.equity': 'Итого капитал',
    'cards.tax.ipn': 'ИПН', 'cards.tax.opv': 'ОПВ', 'cards.tax.vosms': 'ВОСМС', 'cards.tax.so': 'СО', 'cards.tax.oosms': 'ООСМС', 'cards.tax.opvr': 'ОПВР', 'cards.tax.sn': 'Социальный налог (до 2026 — за вычетом СО)', 'cards.tax.vat': 'НДС', 'cards.tax.cit': 'КПН', 'cards.tax.total': 'Налоги и взносы — итого', 'cards.tax.payroll': 'Налоги и взносы по зарплате',
    'cards.line': 'Строка отчёта', 'cards.line.pl': 'ОПиУ', 'cards.line.cf': 'ДДС', 'cards.line.bs': 'Баланс', 'cards.line.tax': 'Налоги', 'cards.line.bdr': 'Бюджет',
    'cards.line.f.flow': 'Сумма проводок по статье за дни периода (начисление по дням; за любой период — ровно его дни).', 'cards.line.f.cf': 'Движение денег по статье за дни периода по банку и кассе.', 'cards.line.f.bs': 'Остаток счёта на конец дня по книге проводок; активы = обязательства + капитал.',
    'cards.line.f.tax': 'Начисление по ставкам и базам каждого дня (по закону своего года).',     'cards.change': 'Изменение за период', 'cards.share_assets': 'Доля в активах', 'cards.share_liab': 'Доля в пассивах', 'cards.share_rev': 'Доля в выручке', 'cards.share_in': 'Доля от поступлений', 'cards.plan': 'План', 'cards.exec': 'Исполнение',
    'cards.on_date_prev': 'на {d}', 'cards.sum': 'Сумма', 'cards.month': 'Месяц', 'cards.day': 'День', 'cards.name': 'Название', 'cards.date': 'Дата', 'cards.status': 'Статус', 'cards.days': 'дн.', 'cards.min': 'мин',
    'cards.docs': 'Документы-основания', 'cards.docs_for': 'Документы-основания: {t}', 'cards.docs_none': 'Основание — записи журнала ниже; в рабочем режиме — ссылка на документ 1С.',
    'cards.act_no': 'Акт №', 'cards.act': 'Акт', 'cards.amount_vat': 'Сумма с НДС', 'cards.due_date': 'Срок оплаты', 'cards.paid': 'Оплачен', 'cards.not_paid': 'не оплачен', 'cards.late_days': 'Просрочка, дн.', 'cards.obj_share': 'Доля объекта',
    'cards.payroll_doc': 'Ведомость зарплаты за {m}', 'cards.tax_doc': 'Расчёт налогов за {m}', 'cards.pay_doc': 'Заявка на оплату', 'cards.doc_1c': 'документ 1С', 'cards.order_doc': 'Приказ',
    // объект
    'cards.obj.kind': 'Вид объекта', 'cards.obj.city': 'Город · регион', 'cards.obj.cust': 'Заказчик', 'cards.obj.sched': 'Режим и график', 'cards.obj.contract': 'Договор до', 'cards.obj.status': 'Статус',
    'cards.obj.active': 'действует', 'cards.obj.ended': 'расторгнут {d}', 'cards.obj.future': 'с {d}', 'cards.obj.left': '{n} дн. осталось', 'cards.obj.posts': 'Посты', 'cards.obj.shifts_today': 'Смены сегодня: план / открыто',
    'cards.obj.missed_post': 'Не отметился', 'cards.obj.chief': 'Начальник объекта', 'cards.obj.guards': 'Охранников по FTE', 'cards.obj.story': 'Примечание к тарифу', 'cards.obj.tariff': 'Тариф поста в месяц', 'cards.obj.rev': 'Выручка', 'cards.obj.guardC': 'Охранники (ФОТ с взносами)',
    'cards.obj.direct': 'Прямые прочие (форма, транспорт, связь)', 'cards.obj.overhead': 'Накладные по доле постов', 'cards.obj.profit': 'Результат после накладных', 'cards.obj.margin': 'Маржа', 'cards.obj.per_post': 'Выручка на пост в месяц',
    'cards.obj.be': 'Тариф и безубыточность', 'cards.obj.be_v': '{t} при безубыточности {b}: {d} {w}', 'cards.obj.above': 'выше', 'cards.obj.below': 'ниже', 'cards.obj.sh': 'Смены за период', 'cards.obj.sh_v': 'план {p} · не открыто {m} · опоздания {l} · в срок {o}',
    'cards.obj.inc': 'Происшествия', 'cards.obj.chk': 'Проверки', 'cards.obj.chk_v': '{n} · средняя оценка {s} из 5', 'cards.obj.presc': 'Предписаний открыто', 'cards.obj.ar': 'Дебиторка заказчика', 'cards.obj.ar_v': '{t} · просрочено {o} · {d} дн.',
    'cards.obj.hist_start': 'Начало охраны', 'cards.obj.hist_sign': 'Договор подписан', 'cards.obj.hist_end': 'Договор расторгнут', 'cards.obj.hist_tariff': 'Тариф {y}', 'cards.obj.hist_chief': 'Назначен начальник объекта', 'cards.obj.since2022': 'до 2022 (в истории с 01.01.2022)',
    'cards.obj.last_inc': 'Последние 10 происшествий', 'cards.obj.last_chk': 'Последние 5 проверок', 'cards.obj.tasks': 'Задачи по объекту', 'cards.obj.orders': 'Приказы и записки по объекту', 'cards.obj.chat': 'Чат объекта', 'cards.obj.files': 'Документы объекта',
    'cards.obj.no_files': 'Инструкция поста и схема — в папке «04 Объекты»; новые файлы — через задачу или чат.', 'cards.obj.revm': 'выручка', 'cards.obj.marginm': 'маржа, %', 'cards.obj.ontime': 'смены в срок, %',
    'cards.obj.act_check': 'Подготовить акт проверки', 'cards.obj.act_q': 'Подготовь проект акта проверки объекта {o} на {d}',
    // заказчик
    'cards.cu.channel': 'Канал', 'cards.cu.region': 'Регион', 'cards.cu.pay': 'Срок оплаты по договору', 'cards.cu.delay': 'Обычная задержка', 'cards.cu.objs': 'Объектов / постов на дату', 'cards.cu.rev': 'Выручка за период',
    'cards.cu.share': 'Доля в выручке компании', 'cards.cu.margin': 'Маржа', 'cards.cu.ar': 'Дебиторка всего', 'cards.cu.billed': 'По актам', 'cards.cu.unbilled': 'Без акта (текущий месяц)', 'cards.cu.overdue': 'Просрочено', 'cards.cu.maxdays': 'Самая старая просрочка',
    'cards.cu.dso': 'Оплата факт (12 актов)', 'cards.cu.acts': 'Последние 12 актов', 'cards.cu.inflow': 'Поступления по месяцам', 'cards.cu.objects': 'Объекты заказчика', 'cards.cu.inc': 'Происшествия и жалобы по объектам',
    'cards.cu.letter': 'Письмо-напоминание', 'cards.cu.letter_q': 'Подготовь письмо-напоминание заказчику {c}: дебиторка {a}, просрочка {d} дн.', 'cards.cu.risk': 'Риск: просрочка больше 30 дней', 'cards.cu.ok': 'Оплачивает в срок',
    // сотрудник / роль
    'cards.em.grp': 'Группа', 'cards.em.mission': 'Чем управляет', 'cards.em.boss': 'Подчиняется', 'cards.em.limit': 'Лимит и подпись', 'cards.em.step': 'Ступень ИИ', 'cards.em.n': 'Сотрудников в роли',     'cards.em.mine': 'На роли на {d}', 'cards.em.done': 'Задачи за период', 'cards.em.done_v': 'выполнено {n} · в срок {p}', 'cards.em.errands': 'Поручения ИИ роли (7 дней)', 'cards.em.day': 'Мой день', 'cards.em.chats': 'Чаты роли', 'cards.em.kpi': 'Показатели роли',
    'cards.em.sched': 'График', 'cards.em.hours': 'Норма часов в месяц', 'cards.em.cert': 'Удостоверение охранника', 'cards.em.med': 'Медосмотр', 'cards.em.ack': 'Ознакомления', 'cards.em.ack_v': 'приказ об изменении графика — ознакомиться', 'cards.em.sal': 'ФОТ (суммарно по роли, без персональных данных)',
    'cards.em.sal_g': 'средний ФОТ на охранника в месяц с взносами', 'cards.em.sal_a': 'ФОТ администрации за период', 'cards.em.demo': 'условный сотрудник роли: {o}, пост 2 — без персональных данных',
    // задача, проект, документы
    'cards.tk.owner': 'Ответственный', 'cards.tk.src': 'Источник', 'cards.tk.pr': 'Приоритет', 'cards.tk.created': 'Создана', 'cards.tk.due': 'Срок', 'cards.tk.done': 'Выполнена', 'cards.tk.who': 'Поставил', 'cards.tk.obj': 'Объект', 'cards.tk.overdue': 'просрочена',
    'cards.tk.h_created': 'создана', 'cards.tk.h_status': 'статус «{s}»', 'cards.tk.h_done': 'выполнена',
    'cards.pr.owner': 'Руководитель', 'cards.pr.dates': 'Сроки', 'cards.pr.prog': 'Готовность', 'cards.pr.stages': 'Этапы', 'cards.pr.tasks': 'Задач в проекте', 'cards.pr.late': 'отстаёт от плана', 'cards.pr.ontrack': 'по плану', 'cards.pr.stage_done': 'выполнен', 'cards.pr.stage_now': 'в работе', 'cards.pr.stage_wait': 'ждёт',
    'cards.od.no': 'Номер', 'cards.od.kind': 'Вид', 'cards.od.kind_k': 'кадровый', 'cards.od.kind_o': 'по основной деятельности', 'cards.od.author': 'Автор', 'cards.od.route': 'Маршрут', 'cards.od.step': 'Текущий шаг', 'cards.od.waits': 'ждёт: {w}', 'cards.od.people': 'Ознакомление',
    'cards.od.people_v': '{n} сотрудников должны ознакомиться', 'cards.od.due': 'Срок маршрута', 'cards.od.done': 'исполнен', 'cards.od.step_ok': 'пройдено', 'cards.od.step_now': 'сейчас', 'cards.od.step_wait': 'дальше',
    'cards.me.from': 'От кого', 'cards.me.to': 'Кому', 'cards.me.subj': 'Тема', 'cards.me.res': 'Резолюция', 'cards.me.sla': 'Срок ответа', 'cards.me.task': 'Задача',
    'cards.py.to': 'Получатель', 'cards.py.line': 'Статья бюджета', 'cards.py.line_pf': 'План / факт статьи за месяц', 'cards.py.left': 'Остаток лимита месяца', 'cards.py.amount': 'Сумма', 'cards.py.basis': 'Основание', 'cards.py.who': 'Инициатор',
    'cards.py.route': 'Маршрут (пороги 10 и 50 млн ₸)', 'cards.py.step': 'Текущий шаг', 'cards.py.signs': 'Кто подписывает', 'cards.py.payday': 'Дата оплаты (план)', 'cards.py.paid': 'оплачено',
    // происшествие, проверка
    'cards.in.when': 'Дата и время', 'cards.in.obj': 'Объект', 'cards.in.type': 'Тип', 'cards.in.desc': 'Описание', 'cards.in.result': 'Результат', 'cards.in.react': 'Реакция ГБР', 'cards.in.react_v': '{m} мин (норматив 15)', 'cards.in.status': 'Статус',
    'cards.in.closed': 'закрыто {d}', 'cards.in.open': 'в работе', 'cards.in.by': 'Зарегистрировал', 'cards.in.by_v': 'старший смены объекта', 'cards.in.repeat': 'Повторяемость на объекте', 'cards.in.repeat_v': '{n} таких за 12 месяцев', 'cards.in.act': 'Подготовить акт',
    'cards.in.act_q': 'Подготовь проект акта по происшествию на {o} от {d}: {t}',     'cards.ck.who': 'Проверяющий', 'cards.ck.score': 'Оценка', 'cards.ck.result': 'Результат', 'cards.ck.presc': 'Предписание', 'cards.ck.fix': 'Срок устранения', 'cards.ck.fixed': 'устранено', 'cards.ck.open': 'не устранено', 'cards.ck.none': 'нет',
    // автомобиль
    'cards.car.role': 'Назначение', 'cards.car.year': 'Год', 'cards.car.km': 'Пробег на дату', 'cards.car.to': 'До ТО', 'cards.car.to_v': '{k} км · ≈ {d}', 'cards.car.ins': 'Страховка до', 'cards.car.insp': 'Техосмотр до', 'cards.car.fuel': 'ГСМ норма / факт, л/100 км',
    'cards.car.over': 'Перерасход', 'cards.car.cost': 'Расходы за период', 'cards.car.share': 'Доля в строке «Транспорт и ГСМ»', 'cards.car.costm': 'расходы по месяцам', 'cards.car.waybills': 'Путевые листы за период', 'cards.car.wb_v': '{n} листов · ≈ {k} км · водитель — роль «Водитель»',
    'cards.car.repairs': 'Ремонты и ТО (заявки на оплату)', 'cards.car.mech': 'Задачи механика', 'cards.car.defect': 'Акт неисправности', 'cards.car.defect_q': 'Подготовь акт неисправности автомобиля {c} на {d}',
    // регион и прочее
    'cards.rg.city': 'Центр', 'cards.rg.objs': 'Объектов / постов на дату', 'cards.rg.rev': 'Выручка за период', 'cards.rg.profit': 'Результат после накладных', 'cards.rg.ar': 'Дебиторка заказчиков региона', 'cards.rg.inc': 'Происшествий за период',
    'cards.rg.objects': 'Объекты региона', 'cards.rg.custs': 'Заказчики региона', 'cards.ch.custs': 'Заказчиков', 'cards.ch.cac': 'Стоимость привлечения за договор',
    'cards.st.unit': 'Единица', 'cards.st.stock': 'Остаток', 'cards.st.min': 'Минимум', 'cards.st.issued': 'Выдано за год', 'cards.st.price': 'Цена', 'cards.st.cover': 'Покрытие, мес.', 'cards.st.cost': 'Стоимость остатка', 'cards.st.low': 'ниже минимума на {p}',
    'cards.su.cat': 'Категория', 'cards.su.orders': 'Заказов', 'cards.su.rating': 'Рейтинг', 'cards.su.debt': 'Долг поставщику', 'cards.su.share': 'Доля в долге поставщикам',
    'cards.cn.dir': 'Направление', 'cards.cn.freq': 'Частота', 'cards.cn.last': 'Последний обмен', 'cards.cn.what': 'Что передаётся', 'cards.cn.err': 'Ошибок', 'cards.cn.who': 'Ответственный', 'cards.cn.access': 'Доступ', 'cards.cn.rule': 'Секреты и пароли — только в файле на сервере, в карточке их нет.',
    'cards.ec.kind': 'Ключ', 'cards.ec.media': 'Где хранится', 'cards.ec.to': 'Действует до', 'cards.ec.use': 'Для чего', 'cards.ec.left': 'осталось {n} дн.',
    'cards.chat.who': 'Участники', 'cards.chat.n': 'Человек в канале', 'cards.chat.last': 'Последние сообщения', 'cards.chat.unread': 'Непрочитано',
    'cards.er.when': 'Когда', 'cards.er.who': 'Кто', 'cards.er.task': 'Поручение', 'cards.er.step': 'Ступень', 'cards.er.res': 'Результат', 'cards.er.mins': 'Время, мин',
    'cards.overdue': 'просрочено', 'cards.done': 'выполнено', 'cards.ai_since': 'ИИ-помощник подключён с {d}',
    'cards.none': 'Записей нет', 'cards.passport': 'Паспорт объекта', 'cards.tile_lines': 'На плитке', 'cards.tile_formula': 'Формула — в разделах «Знания» и «О расчёте».', 'cards.info': 'Подробнее о показателе',
  });
  I.add('en', {
    'cards.task': 'Create task', 'cards.ask': 'Ask AI', 'cards.doc': 'Source document', 'cards.go': 'Open section',     'cards.ask_q': 'Tell me more: {t} ({c})', 'cards.task_note': 'Task “{t}” created, owner — {o}; it is already on the “Tasks & projects” board; {m}.', 'cards.task_shared': 'everyone with the link can see it', 'cards.task_local': 'saved in this browser',
    'cards.ro': 'You have view-only access — a task cannot be created.', 'cards.task_done': 'Task created',
    'cards.tab.main': 'Main', 'cards.tab.dyn': 'Trend', 'cards.tab.rel': 'Related', 'cards.tab.chain': 'End-to-end', 'cards.tab.hist': 'History',
    'cards.data_on': 'data as of {d}', 'cards.period': 'period {p}', 'cards.denied': 'No access', 'cards.denied_t': 'The “{r}” role cannot see this record: {w}.',
    'cards.denied_scope': 'data of another site or region', 'cards.denied_money': 'financial data is not available', 'cards.notfound': 'Record not found on the selected date.',
    'cards.at': 'As of {d}', 'cards.for_period': 'For the period {p}', 'cards.dyn12': 'Trend · 12 months', 'cards.history': 'History', 'cards.related': 'Related records',
    'cards.formula': 'How it is calculated', 'cards.source': 'Data source', 'cards.value': 'Value', 'cards.on_tile': 'on the tile', 'cards.vs_prev': 'Vs previous period', 'cards.vs_yago': 'Vs a year ago',
    'cards.sum_ok': 'breakdown total = value ({v})', 'cards.signal': 'Signal', 'cards.sig_bad': 'Red stripe: the indicator is in the problem zone — {f}', 'cards.sig_warn': 'Yellow stripe: needs attention — {f}', 'cards.sig_ok': 'No stripe: no problems with this indicator.',
    'cards.by_region': 'By region', 'cards.by_channel': 'By sales channel', 'cards.top_objects': 'Sites', 'cards.top_customers': 'Customers', 'cards.by_age': 'By age', 'cards.by_type': 'By type', 'cards.by_mode': 'By mode',
    'cards.by_inspector': 'By inspector', 'cards.by_score': 'By score', 'cards.by_owner': 'By owner', 'cards.by_tax': 'By tax', 'cards.by_month': 'By month of the period', 'cards.by_day': 'By day', 'cards.by_object': 'By site', 'cards.children': 'Items',
    'cards.pl_structure': 'P&L structure', 'cards.cash_move': 'Cash movement {p}', 'cards.staff_split': 'Composition', 'cards.guards_by_region': 'Guards by region (FTE × 1.05)', 'cards.stages': 'Stages',
    'cards.not_opened': 'Shifts not opened', 'cards.loss_list': 'Loss-making sites', 'cards.open_presc': 'Corrective orders', 'cards.expiring': 'Contracts', 'cards.cars': 'Vehicles', 'cards.below_min': 'Below minimum, degree',
    'cards.overdue_list': 'Overdue tasks', 'cards.launched': 'Launched in the period: {n}', 'cards.terminated': 'Terminated in the period: {n}',
    'cards.mode24': '24-hour', 'cards.modeday': 'daytime', 'cards.dayshift': 'daytime', 'cards.guards': 'Guards', 'cards.admin': 'Administration', 'cards.hires': 'Hired', 'cards.fires': 'Dismissed', 'cards.net': 'Net',
    'cards.vac': 'On leave', 'cards.sick': 'Sick leave', 'cards.absent': 'No-shows', 'cards.cert30': 'Licences · 30 days', 'cards.cert90': 'Licences · 90 days', 'cards.medical': 'Medical checks', 'cards.training': 'Training',
    'cards.due.cert': 'Guard licences (30 d)', 'cards.due.permit': 'Permits (30 d)', 'cards.due.contract': 'Contracts (60 d)', 'cards.due.ins': 'Vehicle insurance (30 d)', 'cards.due.insp': 'Vehicle inspections (30 d)',
    'cards.age.unbilled': 'Accrued, not billed', 'cards.age.notDue': 'Not yet due', 'cards.age.d30': 'Overdue 1–30 days', 'cards.age.d60': '31–60 days', 'cards.age.d90': '61–90 days', 'cards.age.d90p': 'Over 90 days',
    'cards.fn.requests': 'Requests and tenders', 'cards.fn.kp': 'Commercial proposals', 'cards.fn.neg': 'Negotiations and site visits', 'cards.fn.signed': 'Contracts signed', 'cards.fn.launched': 'Sites launched',
    'cards.pl.revenue': 'Revenue', 'cards.pl.guardC': 'Guards (payroll with contributions)', 'cards.pl.adminC': 'Administration (payroll with contributions)', 'cards.pl.opex': 'Operating expenses', 'cards.pl.uniform': 'Uniforms and equipment', 'cards.pl.transport': 'Transport and fuel',
    'cards.pl.comms': 'Communications', 'cards.pl.office': 'Office and rent', 'cards.pl.other': 'Other', 'cards.pl.it': 'IT and software', 'cards.pl.ebitda': 'EBITDA', 'cards.pl.dep': 'Depreciation', 'cards.pl.ebit': 'Operating profit (EBIT)',
    'cards.pl.interest': 'Leasing interest', 'cards.pl.ebt': 'Profit before tax', 'cards.pl.cit': 'CIT', 'cards.pl.net': 'Net profit',
    'cards.cf.open': 'Opening balance', 'cards.cf.inCustomers': 'Customer receipts', 'cards.cf.salaries': 'Net salaries', 'cards.cf.payrollTaxes': 'Payroll taxes and contributions', 'cards.cf.vat': 'VAT (quarterly)', 'cards.cf.cit': 'CIT (advances and top-up)', 'cards.cf.suppliers': 'Suppliers and other',
    'cards.cf.operating': 'Operating cash flow', 'cards.cf.capex': 'Fixed asset purchases', 'cards.cf.leasingPay': 'Leasing — principal', 'cards.cf.dividends': 'Dividends (net)', 'cards.cf.net': 'Net cash flow', 'cards.cf.close': 'Closing balance',
    'cards.bs.cash': 'Cash', 'cards.bs.ar': 'Customer receivables (incl. VAT)', 'cards.bs.inv': 'Warehouse stock', 'cards.bs.faNet': 'Fixed assets, net', 'cards.bs.assets': 'Total assets', 'cards.bs.ap': 'Suppliers', 'cards.bs.salpay': 'Salaries payable',
    'cards.bs.paytax': 'Payroll taxes and contributions', 'cards.bs.vat': 'VAT payable (quarter)', 'cards.bs.citpay': 'CIT payable (− overpaid advances)', 'cards.bs.leasing': 'Leasing — total', 'cards.bs.liabilities': 'Total liabilities', 'cards.bs.charter': 'Charter capital',
    'cards.bs.reStart': 'Retained earnings at the start of the year', 'cards.bs.profitYear': 'Profit year to date', 'cards.bs.dividendsYear': 'Dividends year to date', 'cards.bs.equity': 'Total equity',
    'cards.tax.ipn': 'IIT', 'cards.tax.opv': 'Pension contributions', 'cards.tax.vosms': 'Health insurance (employee)', 'cards.tax.so': 'Social contributions', 'cards.tax.oosms': 'Health insurance (employer)', 'cards.tax.opvr': 'Employer pension contributions', 'cards.tax.sn': 'Social tax (until 2026 — net of SC)', 'cards.tax.vat': 'VAT', 'cards.tax.cit': 'CIT', 'cards.tax.total': 'Taxes and contributions — total', 'cards.tax.payroll': 'Payroll taxes and contributions',
    'cards.line': 'Report line', 'cards.line.pl': 'P&L', 'cards.line.cf': 'Cash flow', 'cards.line.bs': 'Balance sheet', 'cards.line.tax': 'Taxes', 'cards.line.bdr': 'Budget',
    'cards.line.f.flow': 'Sum of ledger postings on the item for the days of the period (daily accrual; any period counts exactly its days).', 'cards.line.f.cf': 'Cash movement on the item for the days of the period per bank and cash desk.', 'cards.line.f.bs': 'Account balance at the end of the day per the ledger; assets = liabilities + equity.',
    'cards.line.f.tax': 'Accrued at each day’s rates and bases (per the law of its year).',     'cards.change': 'Change in the period', 'cards.share_assets': 'Share of assets', 'cards.share_liab': 'Share of liabilities and equity', 'cards.share_rev': 'Share of revenue', 'cards.share_in': 'Share of receipts', 'cards.plan': 'Plan', 'cards.exec': 'Execution',
    'cards.on_date_prev': 'as of {d}', 'cards.sum': 'Amount', 'cards.month': 'Month', 'cards.day': 'Day', 'cards.name': 'Name', 'cards.date': 'Date', 'cards.status': 'Status', 'cards.days': 'd', 'cards.min': 'min',
    'cards.docs': 'Source documents', 'cards.docs_for': 'Source documents: {t}', 'cards.docs_none': 'The basis is the log entries below; in production — a link to the 1C document.',
    'cards.act_no': 'Act no.', 'cards.act': 'Act', 'cards.amount_vat': 'Amount incl. VAT', 'cards.due_date': 'Due date', 'cards.paid': 'Paid', 'cards.not_paid': 'not paid', 'cards.late_days': 'Days overdue', 'cards.obj_share': 'Site share',
    'cards.payroll_doc': 'Payroll statement for {m}', 'cards.tax_doc': 'Tax calculation for {m}', 'cards.pay_doc': 'Payment request', 'cards.doc_1c': '1C document', 'cards.order_doc': 'Order',
    'cards.obj.kind': 'Site type', 'cards.obj.city': 'City · region', 'cards.obj.cust': 'Customer', 'cards.obj.sched': 'Mode and schedule', 'cards.obj.contract': 'Contract until', 'cards.obj.status': 'Status',
    'cards.obj.active': 'active', 'cards.obj.ended': 'terminated {d}', 'cards.obj.future': 'from {d}', 'cards.obj.left': '{n} d left', 'cards.obj.posts': 'Posts', 'cards.obj.shifts_today': 'Shifts today: plan / opened',
    'cards.obj.missed_post': 'No check-in', 'cards.obj.chief': 'Site manager', 'cards.obj.guards': 'Guards by FTE', 'cards.obj.story': 'Tariff note', 'cards.obj.tariff': 'Post tariff per month', 'cards.obj.rev': 'Revenue', 'cards.obj.guardC': 'Guards (payroll with contributions)',
    'cards.obj.direct': 'Other direct (uniforms, transport, communications)', 'cards.obj.overhead': 'Overheads by share of posts', 'cards.obj.profit': 'Result after overheads', 'cards.obj.margin': 'Margin', 'cards.obj.per_post': 'Revenue per post per month',
    'cards.obj.be': 'Tariff vs break-even', 'cards.obj.be_v': '{t} with break-even at {b}: {d} {w}', 'cards.obj.above': 'above', 'cards.obj.below': 'below', 'cards.obj.sh': 'Shifts in the period', 'cards.obj.sh_v': 'plan {p} · not opened {m} · late {l} · on time {o}',
    'cards.obj.inc': 'Incidents', 'cards.obj.chk': 'Inspections', 'cards.obj.chk_v': '{n} · average score {s} of 5', 'cards.obj.presc': 'Open corrective orders', 'cards.obj.ar': 'Customer receivables', 'cards.obj.ar_v': '{t} · overdue {o} · {d} d',
    'cards.obj.hist_start': 'Security started', 'cards.obj.hist_sign': 'Contract signed', 'cards.obj.hist_end': 'Contract terminated', 'cards.obj.hist_tariff': 'Tariff {y}', 'cards.obj.hist_chief': 'Site manager appointed', 'cards.obj.since2022': 'before 2022 (history starts 01.01.2022)',
    'cards.obj.last_inc': 'Last 10 incidents', 'cards.obj.last_chk': 'Last 5 inspections', 'cards.obj.tasks': 'Tasks for the site', 'cards.obj.orders': 'Orders and memos for the site', 'cards.obj.chat': 'Site chat', 'cards.obj.files': 'Site documents',
    'cards.obj.no_files': 'Post instructions and the site plan are in folder “04 Sites”; new files — via a task or chat.', 'cards.obj.revm': 'revenue', 'cards.obj.marginm': 'margin, %', 'cards.obj.ontime': 'shifts on time, %',
    'cards.obj.act_check': 'Prepare an inspection report', 'cards.obj.act_q': 'Prepare a draft inspection report for {o} as of {d}',
    'cards.cu.channel': 'Channel', 'cards.cu.region': 'Region', 'cards.cu.pay': 'Payment term per contract', 'cards.cu.delay': 'Usual delay', 'cards.cu.objs': 'Sites / posts on the date', 'cards.cu.rev': 'Revenue for the period',
    'cards.cu.share': 'Share of company revenue', 'cards.cu.margin': 'Margin', 'cards.cu.ar': 'Total receivables', 'cards.cu.billed': 'Billed', 'cards.cu.unbilled': 'Not billed (this month)', 'cards.cu.overdue': 'Overdue', 'cards.cu.maxdays': 'Oldest overdue',
    'cards.cu.dso': 'Actual payment time (average of 12 acts)', 'cards.cu.acts': 'Last 12 acts', 'cards.cu.inflow': 'Receipts by month', 'cards.cu.objects': 'Customer sites', 'cards.cu.inc': 'Incidents and complaints at the sites',
    'cards.cu.letter': 'Reminder letter', 'cards.cu.letter_q': 'Prepare a payment reminder for {c}: receivables {a}, overdue {d} days', 'cards.cu.risk': 'Risk: more than 30 days overdue', 'cards.cu.ok': 'Pays on time',
    'cards.em.grp': 'Group', 'cards.em.mission': 'Responsibilities', 'cards.em.boss': 'Reports to', 'cards.em.limit': 'Limit and signature', 'cards.em.step': 'AI level', 'cards.em.n': 'Employees in the role',     'cards.em.mine': 'On the role as of {d}', 'cards.em.done': 'Tasks in the period', 'cards.em.done_v': 'completed {n} · on time {p}', 'cards.em.errands': 'AI errands of the role (7 days)', 'cards.em.day': 'My day', 'cards.em.chats': 'Role chats', 'cards.em.kpi': 'Role indicators',
    'cards.em.sched': 'Schedule', 'cards.em.hours': 'Monthly hours norm', 'cards.em.cert': 'Guard licence', 'cards.em.med': 'Medical check', 'cards.em.ack': 'Acknowledgements', 'cards.em.ack_v': 'shift schedule change order — to acknowledge', 'cards.em.sal': 'Payroll (role total, no personal data)',
    'cards.em.sal_g': 'average payroll per guard per month with contributions', 'cards.em.sal_a': 'administration payroll for the period', 'cards.em.demo': 'generic role employee: {o}, post 2 — no personal data',
    'cards.tk.owner': 'Owner', 'cards.tk.src': 'Source', 'cards.tk.pr': 'Priority', 'cards.tk.created': 'Created', 'cards.tk.due': 'Deadline', 'cards.tk.done': 'Completed', 'cards.tk.who': 'Set by', 'cards.tk.obj': 'Site', 'cards.tk.overdue': 'overdue',
    'cards.tk.h_created': 'created', 'cards.tk.h_status': 'status “{s}”', 'cards.tk.h_done': 'completed',
    'cards.pr.owner': 'Project lead', 'cards.pr.dates': 'Dates', 'cards.pr.prog': 'Progress', 'cards.pr.stages': 'Stages', 'cards.pr.tasks': 'Tasks in the project', 'cards.pr.late': 'behind schedule', 'cards.pr.ontrack': 'on schedule', 'cards.pr.stage_done': 'done', 'cards.pr.stage_now': 'in progress', 'cards.pr.stage_wait': 'waiting',
    'cards.od.no': 'Number', 'cards.od.kind': 'Type', 'cards.od.kind_k': 'HR', 'cards.od.kind_o': 'core business', 'cards.od.author': 'Author', 'cards.od.route': 'Route', 'cards.od.step': 'Current step', 'cards.od.waits': 'waiting for: {w}', 'cards.od.people': 'Acknowledgement',
    'cards.od.people_v': '{n} employees must acknowledge', 'cards.od.due': 'Route deadline', 'cards.od.done': 'executed', 'cards.od.step_ok': 'done', 'cards.od.step_now': 'now', 'cards.od.step_wait': 'next',
    'cards.me.from': 'From', 'cards.me.to': 'To', 'cards.me.subj': 'Subject', 'cards.me.res': 'Resolution', 'cards.me.sla': 'Response deadline', 'cards.me.task': 'Task',
    'cards.py.to': 'Recipient', 'cards.py.line': 'Budget item', 'cards.py.line_pf': 'Item plan / actual for the month', 'cards.py.left': 'Remaining monthly limit', 'cards.py.amount': 'Amount', 'cards.py.basis': 'Basis', 'cards.py.who': 'Initiator',
    'cards.py.route': 'Route (thresholds ₸10 M and ₸50 M)', 'cards.py.step': 'Current step', 'cards.py.signs': 'Who signs', 'cards.py.payday': 'Payment date (plan)', 'cards.py.paid': 'paid',
    'cards.in.when': 'Date and time', 'cards.in.obj': 'Site', 'cards.in.type': 'Type', 'cards.in.desc': 'Description', 'cards.in.result': 'Result', 'cards.in.react': 'Rapid response', 'cards.in.react_v': '{m} min (standard 15)', 'cards.in.status': 'Status',
    'cards.in.closed': 'closed {d}', 'cards.in.open': 'in progress', 'cards.in.by': 'Registered by', 'cards.in.by_v': 'site shift supervisor', 'cards.in.repeat': 'Recurrence at the site', 'cards.in.repeat_v': '{n} of the same type in 12 months', 'cards.in.act': 'Prepare a report',
    'cards.in.act_q': 'Prepare a draft incident report for {o} dated {d}: {t}',     'cards.ck.who': 'Inspector', 'cards.ck.score': 'Score', 'cards.ck.result': 'Result', 'cards.ck.presc': 'Corrective order', 'cards.ck.fix': 'Fix deadline', 'cards.ck.fixed': 'fixed', 'cards.ck.open': 'not fixed', 'cards.ck.none': 'none',
    'cards.car.role': 'Purpose', 'cards.car.year': 'Year', 'cards.car.km': 'Mileage on the date', 'cards.car.to': 'Until service', 'cards.car.to_v': '{k} km · ≈ {d}', 'cards.car.ins': 'Insurance until', 'cards.car.insp': 'Inspection until', 'cards.car.fuel': 'Fuel norm / actual, l/100 km',
    'cards.car.over': 'Overuse', 'cards.car.cost': 'Costs for the period', 'cards.car.share': 'Share of “Transport and fuel”', 'cards.car.costm': 'costs by month', 'cards.car.waybills': 'Waybills for the period', 'cards.car.wb_v': '{n} waybills · ≈ {k} km · driver — the “Driver” role',
    'cards.car.repairs': 'Repairs and service (payment requests)', 'cards.car.mech': 'Mechanic tasks', 'cards.car.defect': 'Defect report', 'cards.car.defect_q': 'Prepare a defect report for vehicle {c} as of {d}',
    'cards.rg.city': 'Centre', 'cards.rg.objs': 'Sites / posts on the date', 'cards.rg.rev': 'Revenue for the period', 'cards.rg.profit': 'Result after overheads', 'cards.rg.ar': 'Receivables of the region’s customers', 'cards.rg.inc': 'Incidents in the period',
    'cards.rg.objects': 'Sites in the region', 'cards.rg.custs': 'Customers in the region', 'cards.ch.custs': 'Customers', 'cards.ch.cac': 'Acquisition cost per contract',
    'cards.st.unit': 'Unit', 'cards.st.stock': 'Balance', 'cards.st.min': 'Minimum', 'cards.st.issued': 'Issued per year', 'cards.st.price': 'Price', 'cards.st.cover': 'Coverage, months', 'cards.st.cost': 'Stock value', 'cards.st.low': 'below minimum by {p}',
    'cards.su.cat': 'Category', 'cards.su.orders': 'Orders', 'cards.su.rating': 'Rating', 'cards.su.debt': 'Owed to the supplier', 'cards.su.share': 'Share of supplier debt',
    'cards.cn.dir': 'Direction', 'cards.cn.freq': 'Frequency', 'cards.cn.last': 'Last exchange', 'cards.cn.what': 'What is transferred', 'cards.cn.err': 'Errors', 'cards.cn.who': 'Responsible', 'cards.cn.access': 'Access', 'cards.cn.rule': 'Secrets and passwords live only in a file on the server, never in the card.',
    'cards.ec.kind': 'Key', 'cards.ec.media': 'Stored at', 'cards.ec.to': 'Valid until', 'cards.ec.use': 'Used for', 'cards.ec.left': '{n} d left',
    'cards.chat.who': 'Members', 'cards.chat.n': 'People in the channel', 'cards.chat.last': 'Latest messages', 'cards.chat.unread': 'Unread',
    'cards.er.when': 'When', 'cards.er.who': 'Who', 'cards.er.task': 'Errand', 'cards.er.step': 'Level', 'cards.er.res': 'Result', 'cards.er.mins': 'Time, min',
    'cards.overdue': 'overdue', 'cards.done': 'done', 'cards.ai_since': 'AI assistant available since {d}',
    'cards.none': 'No records', 'cards.passport': 'Site profile', 'cards.tile_lines': 'Notes on the tile', 'cards.tile_formula': 'The indicator formula is described in “Knowledge” and “How it is calculated”.', 'cards.info': 'More about the indicator',
  });

  // ---------- общий вид карточки ----------
  const TABS = ['main', 'dyn', 'rel', 'chain', 'hist'];
  function view(c, kind, id){
    const r = R(), f = F();
    const sub = [c.sub, tc('data_on', { d: f.dt(r.anchor) }), r.from !== r.to || kind === 'line' ? tc('period', { p: per() }) : ''].filter(Boolean).join(' · ');
    const blocks = (c.blocks || []).filter(b => b && b.html);
    const tabs = blocks.length > 4 ? TABS.filter(x => blocks.some(b => (b.tab || 'main') === x)) : [];
    const tabBar = tabs.length > 1 ? `<div class="cd-tabs" role="tablist">${tabs.map((x, k) => `<button type="button" role="tab" class="cd-tab${k ? '' : ' on'}" aria-selected="${!k}" data-cd-tab="${x}">${tc('tab.' + x)}</button>`).join('')}</div>` : '';
    const secs = blocks.map(b => { const tb = b.tab || 'main', hid = tabs.length > 1 && tb !== tabs[0]; return `<section class="cd-b" data-tab="${tb}"${hid ? ' hidden' : ''}>${b.h ? `<h3>${b.h}${b.small ? ` <small>${b.small}</small>` : ''}</h3>` : ''}${b.html}</section>`; }).join('');
    const rel = (c.related || []).filter(x => x && x.card);
    const relHtml = rel.length ? `<div class="cd-rel"><span>${tc('related')}:</span>${rel.map(x => chip(x.card, x.label)).join('')}</div>` : '';
    const acts = (c.actions || []).map((a, k) => `<button type="button" class="btn" data-cd-act="${k}">${esc(a.label)}</button>`).join('');
    const go = c.go ? `<button type="button" class="btn" id="mcGo">${tc('go')}</button>` : '';
    return `<div class="cd" data-kind="${esc(kind)}"><div class="cd-head"><p class="cd-sub">${sub}</p>${(c.badges || []).length ? `<div class="cd-badges">${c.badges.filter(Boolean).map(b => pill(b[0], b[1])).join('')}</div>` : ''}</div>${tabBar}${secs}${relHtml}
    <div class="mact cd-act"><button type="button" class="btn" id="mcTask">${tc('task')}</button><button type="button" class="btn" id="mcAI">${tc('ask')}</button><button type="button" class="btn" id="mcDoc">${tc('doc')}</button>${go}${acts}</div><p class="note" id="mcNote" aria-live="polite"></p></div>`;
  }
  function wireBody(body, c, kind, id, ctx){
    const nt = body.querySelector('#mcNote'), title = strip(c.title);
    body.querySelectorAll('[data-cd-tab]').forEach(b => b.addEventListener('click', () => {
    body.querySelectorAll('[data-cd-tab]').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
    body.querySelectorAll('.cd-b').forEach(s => { s.hidden = s.dataset.tab !== b.dataset.cdTab; });
    }));
    const tb = body.querySelector('[role=tablist]');
    if (tb) tb.addEventListener('keydown', e => { if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return; const bs = [...tb.querySelectorAll('[role=tab]')], i = bs.indexOf(document.activeElement); const n = bs[(i + (e.key === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length]; if (n){ n.focus(); n.click(); } });
    const h = hash(), ctxName = (ctx && ctx.ctx) || K.ui.SEC_NAME(h) || '';
    const bt = body.querySelector('#mcTask');
    bt.addEventListener('click', function(){
    if (K.live && K.live.data && K.live.data.ro){ nt.textContent = tc('ro'); return; }
    const btn = this; btn.disabled = true;
    const owner = c.owner || KR().OWNER_OF[h.split('-')[0]] || 'Исполнительный директор';
    const T = K.module && K.module('tasks'), host = T ? (body.querySelector('#mcQuick') || (() => { const d = document.createElement('div'); d.id = 'mcQuick'; nt.after(d); return d; })()) : null;   // модуль задач: форма подтверждения прямо в карточке
    Promise.resolve(K.ui.quickTask({ title: (title.slice(0, 150) + (ctxName ? ` (${ctxName})` : '')).slice(0, 200), owner, src: 'карточка', days: 3, status: 'в работе', pr: 'средний', obj: c.obj || null, link: { kind: 'card', card: kind + ':' + id, h, title } }, host ? { host } : undefined)).then(r => {
      if (T && !r){ btn.disabled = false; return; }                     // форму отменили
      btn.textContent = tc('task_done'); nt.textContent = tc('task_note', { t: title, o: F().rn(owner), m: K.live && K.live.mode === 'shared' ? tc('task_shared') : tc('task_local') });
    });
    });
    body.querySelector('#mcAI').addEventListener('click', () => { K.modal.close(true); K.ui.openAI(); K.ui.ask(tc('ask_q', { t: title, c: ctxName || tx(kind) }), { src: 'card', section: h, card: { kind, id, title } }); });
    body.querySelector('#mcDoc').addEventListener('click', () => openCard({ kind: 'docs', id: kind + ':' + id, ctx: { title } }));
    const g = body.querySelector('#mcGo'); if (g) g.addEventListener('click', () => { K.modal.close(true); if (c.goRegion){ K.set({ region: c.goRegion }); } location.hash = '#' + c.go; if (c.goRegion) K.render(); });
    body.querySelectorAll('[data-cd-act]').forEach(b => b.addEventListener('click', () => { const a = c.actions[+b.dataset.cdAct]; if (a && a.fn) a.fn(b, nt); }));
  }
  function askAI(q, c){ K.modal.close(true); K.ui.openAI(); K.ui.ask(q, { src: 'card', section: hash(), card: c }); }
  const denied = (title, why) => ({ title, denied: true, blocks: [{ h: tc('denied'), html: note(tc('denied_t', { r: F().rn(role().name), w: why })) }] });

  // В1: права роли проверяет КАЖДАЯ карточка — и при нажатии, и при прямом вызове openCard: блок матрицы BLK, область роли, деньги (hasMoney)
  const BLK_OF = { object: ['objects', 'shifts', 'incidents', 'sales', 'legal'], customer: ['sales', 'objects', 'legal'], incident: ['incidents', 'objects', 'shifts'], check: ['incidents', 'objects', 'shifts'], presc: ['incidents', 'objects', 'shifts'],
    order: ['docflow'], memo: ['docflow'], car: ['fleet'], stock: ['supply', 'budget'], supplier: ['supply', 'budget'], conn: ['admin', 'onec'], ecp: ['admin', 'onec', 'finance'], region: ['objects', 'shifts', 'sales', 'kokpit'], channel: ['sales'], chat: ['chats'], errand: ['ai'], task: ['tasks'], project: ['tasks'] };
  const MONEY_KINDS = new Set(['line', 'pay', 'act', 'docs', 'channel']);
  function guard(kind, id){
    const r = role(), bl = BLK_OF[kind];
    if (bl && !bl.some(k => (r.rt[k] || '·') !== '·')) return denied(String(id || kind), tc('denied_scope'));
    if (MONEY_KINDS.has(kind) && !money() && !(kind === 'line' && finRole())) return denied(String(id || kind), tc('denied_money'));
    const T = K.module && K.module('tasks');
    if (T && kind === 'task' && typeof T.canSee === 'function'){ const s0 = String(id || ''), L = (window.LIVE && window.LIVE.tasks) || [], lid = s0.replace(/^L/, ''), x = L.find(y => String(y.id) === lid || (y.no && y.no === s0));
      const vis = x ? T.canSee(x.id) : T.canSee('w:' + s0); if (!vis) return denied(tc('denied'), tc('denied_scope')); }
    if (T && kind === 'project' && typeof T.canSeeProject === 'function'){ const s0 = String(id || ''), L = (window.LIVE && window.LIVE.projects) || [], x = L.find(y => 'L' + y.id === s0 || String(y.id) === s0);
      if (x && !T.canSeeProject(x.id)) return denied(tc('denied'), tc('denied_scope')); }
    if ((kind === 'order' || kind === 'memo') && (r.rt.docflow || '·') === 'С'){ const at = R().anchor, D0 = D().docflowAt(at), me = r.name;
      const o = kind === 'order' ? D0.orders.find(x => x.no === id) : D0.memos.find(x => x.no === id);
      if (o && (kind === 'order' ? (o.author !== me && !o.route.includes(me)) : (o.from !== me && o.to !== me))) return denied(String(id), tc('denied_scope')); }
    if (kind === 'car' && (r.rt.fleet || '·') === 'С' && String(id) !== '0') return denied(String(id), tc('denied_scope'));
    return null;
  }
  // openCard({ kind, id, ctx }) — или старый вызов openCard(title, rows, ctx)
  function openCard(spec, rows, ctx0){
    if (typeof spec === 'string') spec = { kind: 'raw', id: '', ctx: { title: spec, rows: rows || [], ctx: ctx0 } };
    let { kind, id, ctx } = spec || {}; ctx = ctx || {};
    const g = guard(kind, id);
    if (g){ if (K.modal.isOpen && K.modal.stack.length >= 5) K.modal.close(); K.modal.open(view(g, kind, id), strip(g.title).slice(0, 80) || tc('denied'), { wide: true, onOpen: body => wireBody(body, g, kind, id, ctx) }); return g; }
    // новые задачи и проекты — полная карточка модуля задач (статусы, чек-лист, комментарии); задачи мира — карточка истории
    const T = K.module && K.module('tasks');
    if (T && (kind === 'task' || kind === 'project')){ const lid = String(id || '').replace(/^L/, ''), L = (window.LIVE && window.LIVE[kind === 'task' ? 'tasks' : 'projects']) || [];
      const x = L.find(r => String(r.id) === lid || (r.no && r.no === String(id)));
      if (x){ if (kind === 'task' && typeof T.open === 'function'){ T.open(x.id); return; } if (kind === 'project' && typeof T.openProject === 'function'){ T.openProject(x.id); return; } } }
    const fn = CARDS[kind] || CARDS.raw;
    let c = null;
    try { c = fn(id, ctx); } catch(e){ console.error('cards: ' + kind, e); c = { title: ctx.title || kind, blocks: [{ html: note(tc('notfound')) }] }; }
    if (!c) c = { title: ctx.title || kind, blocks: [{ html: note(tc('notfound')) }] };
    if (K.modal.isOpen && K.modal.stack.length >= 5) K.modal.close();
    K.modal.open(view(c, kind, id), strip(c.title).length > 80 ? strip(c.title).slice(0, 80) + '…' : strip(c.title), { wide: true, onOpen: body => wireBody(body, c, kind, id, ctx) });
    return c;
  }
  function openFrom(el){
    const raw = el.dataset.card || '';
    const i = raw.indexOf(':'), kind = i < 0 ? raw : raw.slice(0, i), id = i < 0 ? '' : raw.slice(i + 1);
    const card0 = el.closest('.card'), h2 = card0 && card0.querySelector('h2'), ctxName = h2 ? strip(h2.innerText.split('·')[0]) : '';
    if (kind === 'tr') return openCard({ kind: 'tr', id: '', ctx: { el, ctx: ctxName } });
    if (kind === 'tile' || kind === 'kpi'){ return openCard({ kind, id, ctx: { el, ctx: ctxName, period: el.dataset.cdP === '7d' ? { from: Math.max(0, R().to - 6), to: R().to } : null } }); }
    return openCard({ kind, id, ctx: { ctx: ctxName } });
  }

  // ---------- подключение к разметке ----------
  const wired = new WeakSet();
  function bind(root){
    if (wired.has(root)) return; wired.add(root);
    root.addEventListener('click', e => {
    const el = e.target.closest && e.target.closest('[data-card]'); if (!el || !root.contains(el)) return;
    const ctl = e.target.closest('a,button,input,select,label,textarea,summary');
    if (ctl && ctl !== el && el.contains(ctl)) return;
    openFrom(el);
    });
    root.addEventListener('keydown', e => { if (e.key !== 'Enter' && e.key !== ' ') return; const el = e.target.closest && e.target.closest('[data-card]'); if (!el || e.target !== el || el.tagName === 'BUTTON') return; e.preventDefault(); openFrom(el); });
  }
  const tileTitle = el => { const x = el.querySelector('.t, b, .gn b'); return x ? strip(x.innerText.split('\n')[0]) : strip(el.innerText.split('\n')[0]); };
  function wire(root){
    if (!root) return;
    bind(root);
    const s = sec();
    root.querySelectorAll('.tbl tbody tr').forEach(tr => { if (tr.closest('.matrix')) return; if (!tr.dataset.card) tr.dataset.card = 'tr'; tr.classList.add('rowlink'); if (!tr.hasAttribute('tabindex')) tr.tabIndex = 0; });
    root.querySelectorAll('.tile:not(.lnkt), .wk>div, .tk, .gr, .obj .big, .chrow').forEach(el => {
    el.classList.add('cardlink'); if (!el.hasAttribute('tabindex')) el.tabIndex = 0; el.setAttribute('role', 'button');
    if (el.dataset.card) return;
    if (el.classList.contains('tk')){ const b = el.querySelector('b'); el.dataset.card = 'task:' + (b ? strip(b.textContent) : ''); return; }
    if (el.classList.contains('gr')){ const b = el.querySelector('.gn b'); el.dataset.card = 'project:' + (b ? strip(b.textContent) : ''); return; }
    if (el.classList.contains('big')){ const o = el.closest('.obj'), btn = o && o.querySelector('[data-region]'); el.dataset.card = 'region:' + (btn ? btn.dataset.region : strip((o.querySelector('.hd b') || {}).textContent || '')); return; }
    if (el.classList.contains('chrow')){ const b = el.querySelector('b'); el.dataset.card = 'chat:' + (b ? strip(b.textContent) : ''); return; }
    const card0 = el.closest('.card'), h2 = card0 && card0.querySelector('h2');
    if (el.parentElement && el.parentElement.classList.contains('wk') && h2 && /^За 7 дней|^Last 7 days/.test(strip(h2.textContent))) el.dataset.cdP = '7d';
    const d = A.kpiFor(tileTitle(el), s);
    el.dataset.card = d ? 'kpi:' + d.key : 'tile:';
    });
    root.querySelectorAll('.tile.lnkt').forEach(el => {
    if (el.querySelector('.cd-i')) return;
    const d = A.kpiFor(tileTitle(el), s); if (!d) return;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'cd-i'; b.textContent = 'ⓘ'; b.setAttribute('aria-label', tc('info') + ': ' + tileTitle(el)); b.title = tc('info');
    b.addEventListener('click', e => { e.stopPropagation(); e.preventDefault(); openCard({ kind: 'kpi', id: d.key, ctx: { el, ctx: '' } }); });
    b.addEventListener('keydown', e => { if (e.key === 'Enter') e.stopPropagation(); });
    el.appendChild(b);
    });
  }

  // ---------- построители ----------
  const statusObj = (o, at) => o.terminated != null && o.terminated <= at ? [tc('obj.ended', { d: F().dt(o.terminated) }), 'bad'] : (o.start > at ? [tc('obj.future', { d: F().dt(o.start) }), 'info'] : [tc('obj.active'), 'good']);
  const incTable = (id, list, extra = {}) => tbl(id, { rows: list.map(x => ({ day: x.day, time: x.time, obj: w(x.obj.name), type: tx(x.type), result: tx(x.result), react: x.react, st: x.closeDay <= R().to ? 1 : 0, _kind: 'incident', _id: W().incidents.indexOf(x) })),
    cols: [{ key: 'day', title: tc('date'), kind: 'date', sortVal: r => r.day * 1440 + (+r.time.slice(0, 2)) * 60 + (+r.time.slice(3)) }, { key: 'time', title: tc('in.when'), sort: false, lo: true }, { key: 'obj', title: tc('in.obj') }, { key: 'type', title: tc('in.type') }, { key: 'result', title: tc('in.result'), lo: true }, { key: 'react', title: tc('in.react') + ', ' + tc('min'), kind: 'int', sum: 'avg' }, { key: 'st', title: tc('status'), html: r => r.st ? `<span class="up">${tc('in.closed', { d: '' }).trim()}</span>` : `<span class="dn">${tc('in.open')}</span>` }], csv: 'incidents', ...extra });
  const taskRows = list => list.map(x => ({ no: x.no, title: w(x.title), owner: F().rn(x.owner), due: x.due, st: tx(x.status || ''), _kind: 'task', _id: x.live ? 'L' + x.id : x.no, _cls: x.overdue ? 'an-bad' : '' }));
  const taskCols = () => [{ key: 'no', title: '№' }, { key: 'title', title: tc('name') }, { key: 'owner', title: tc('tk.owner'), lo: true }, { key: 'due', title: tc('tk.due'), kind: 'date' }, { key: 'st', title: tc('status'), lo: true }];

  // ---------- объект ----------
  CARDS.object = (id) => {
    const o = byId(W().objects, id); if (!o) return null;
    if (!KR().scopeOk(o)) return denied(w(o.name), tc('denied_scope'));
    const r = R(), f = F(), at = r.anchor, a = r.from, b = r.to, mon = money(), WW = W();
    const v = WW.objView(o, a, b, b), vd = WW.objView(o, at, at, at), cu = o.customer, posts = o.posts;
    const ended = o.terminated != null && o.terminated <= at;   // расторгнутый объект: срок договора не показывается, вместо него — дата расторжения (Н3)
    const st = statusObj(o, at), len = b - a + 1, perPost = posts ? v.rev / posts / len * 30.4 : 0, be = posts ? (v.guard + v.direct + v.overhead) / posts / len * 30.4 : 0, tar = WW.tariff(o, Math.min(at, WW.DAYS - 1));
    const inc = WW.incidents.filter(x => x.obj === o && x.day >= a && x.day <= b), chk = WW.checks.filter(x => x.obj === o && x.day >= a && x.day <= b), presc = WW.prescOpen(at).filter(c => c.obj === o);
    const types = {}; inc.forEach(x => types[x.type] = (types[x.type] || 0) + 1);
    const missedPost = vd.missed ? (o.missedPost || 1) : 0;
    const grid = `<div class="cd-posts">${Array.from({ length: posts }, (_, k) => `<span class="cd-post ${missedPost === k + 1 ? 'bad' : 'good'}">${esc(w('пост ' + (k + 1)))}${missedPost === k + 1 ? ' · ' + tc('obj.missed_post') : ''}</span>`).join('')}</div>`;
    const onT = v.plan ? 100 - (v.missed + v.late) / v.plan * 100 : 100;
    const ar = mon ? WW.receivables(at, c => c === cu) : null, ae = ar && ar.byCust.get(cu);
    const nowB = kv([
    [tc('obj.posts'), `${f.N(posts)} · ${o.is24 ? '24/7' : tc('dayshift')} · ${esc(tx(o.sched))}`],
    [tc('obj.shifts_today'), WW.active(o, at) ? `${f.N(vd.plan)} / ${f.N(vd.plan - vd.missed)}` : dash],
    [tc('obj.missed_post'), missedPost ? `<span class="dn">${esc(w('пост ' + missedPost))}</span>` : '<span class="up">—</span>'],
    [tc('obj.chief'), esc(F().rn('Начальник объекта') + ' · ' + w(o.name))],
    [tc('obj.guards'), `${f.F(o.fte)} FTE · ≈ ${f.N(Math.round(o.fte * WW.P.reserveK))}`],
    mon ? [tc('obj.tariff'), f.T(tar)] : null,
    mon && o.story ? [tc('obj.story'), `<span class="wn">${esc(tx(o.story))}</span>`] : null,
    ]) + grid;
    const perB = kv([
    mon ? [tc('obj.rev'), f.MU(v.rev)] : null, mon ? [tc('obj.guardC'), f.MU(v.guard)] : null, mon ? [tc('obj.direct'), f.MU(v.direct)] : null, mon ? [tc('obj.overhead'), f.MU(v.overhead)] : null,
    mon ? [tc('obj.profit'), `<span class="${v.profit < 0 ? 'dn' : 'up'}">${f.MU(v.profit)}</span>`] : null, mon ? [tc('obj.margin'), `<span class="${cls(v.margin)}">${f.P(v.margin)}</span>`] : null,
    mon ? [tc('obj.per_post'), f.T(perPost)] : null,
    mon && posts ? [tc('obj.be'), tc('obj.be_v', { t: f.T(tar), b: f.T(be), d: f.T(Math.abs(tar - be)), w: tar >= be ? tc('obj.above') : tc('obj.below') })] : null,
    [tc('obj.sh'), tc('obj.sh_v', { p: f.N(v.plan), m: f.N(v.missed), l: f.N(v.late), o: f.P(onT) })],
    [tc('obj.inc'), inc.length ? `${f.N(inc.length)}: ${Object.entries(types).map(([k, n]) => `${esc(tx(k))} — ${n}`).join(', ')}` : '0'],
    [tc('obj.chk'), tc('obj.chk_v', { n: f.N(chk.length), s: chk.length ? f.F(chk.reduce((s, c) => s + c.score, 0) / chk.length) : dash })],
    [tc('obj.presc'), presc.length ? `<span class="wn">${f.N(presc.length)}</span> · ${presc.map(c => esc(tx(c.presc.what))).join('; ')}` : '0'],
    mon ? [tc('obj.ar'), tc('obj.ar_v', { t: f.MU(ar.total), o: f.MU(ae ? ae.overdue : 0), d: f.N(ae ? ae.maxDays : 0) })] : null,
    ]);
    const ms = months(b), vm = ms.map(x => WW.objView(o, x.from, x.to, x.to));
    const dyn = (mon ? K.ui.lines([{ n: tc('obj.revm'), v: vm.map((x, k) => nm(x.rev) * ms[k].rate), c: 'var(--c1)' }], ms.map(x => x.label), { fmt: x => f.F(x, 1), h: 150, label: tc('obj.revm'), partialLast: ms.length && ms[ms.length - 1].partial }) + K.ui.lines([{ n: tc('obj.marginm'), v: vm.map(x => x.margin), c: 'var(--c3)' }], ms.map(x => x.label), { fmt: x => f.F(x, 0), h: 130 }) : '') +
    K.ui.bars(vm.map(x => x.plan ? 100 - (x.missed + x.late) / x.plan * 100 : 100), ms.map(x => x.label), { h: 120, fmt: x => f.P(x), values: x => f.F(x, 0), color: 'var(--good)', label: tc('obj.ontime') });
    const last10 = WW.incidents.filter(x => x.obj === o && x.day <= at).slice(0, 10), last5 = WW.checks.filter(x => x.obj === o && x.day <= at).slice(0, 5);
    const re = objRe(o), tasks = [...(D().liveTaskList() || []).filter(x => re.test(x.title || '') && x.status !== 'выполнено'), ...WW.tasksAt(at).filter(x => re.test(x.title))];
    const D0 = D().docflowAt(at), ords = D0.orders.filter(x => x.obj === o), memos = D0.memos.filter(m => re.test(m.title));
    const files = (window.LIVE && window.LIVE.files || []).filter(x => x.obj === o.name || x.obj === o.id);
    const rel = [
    { h: tc('obj.last_inc'), html: last10.length ? incTable('obj-inc-' + o.id, last10, { search: false }) : note(tc('none')), tab: 'rel' },
    { h: tc('obj.last_chk'), html: last5.length ? tbl('obj-chk-' + o.id, { rows: last5.map(c => ({ day: c.day, who: tx(c.who), score: c.score, res: tx(c.result), _kind: 'check', _id: WW.checks.indexOf(c) })), cols: [{ key: 'day', title: tc('date'), kind: 'date' }, { key: 'who', title: tc('ck.who') }, { key: 'score', title: tc('ck.score'), kind: 'int', sum: 'avg', fmt: x => '★'.repeat(x) + '☆'.repeat(5 - x), totFmt: x => f.F(x) }, { key: 'res', title: tc('ck.result'), lo: true }], ...NB }) : note(tc('none')), tab: 'rel' },
    { h: tc('obj.tasks'), html: tasks.length ? tbl('obj-tk-' + o.id, { rows: taskRows(tasks), cols: taskCols(), ...NB }) : note(tc('none')), tab: 'rel' },
    { h: tc('obj.orders'), html: (ords.length || memos.length) ? tbl('obj-od-' + o.id, { rows: [...ords.map(x => ({ no: x.no, day: x.day, title: tx(x.title), st: x.done ? tc('od.done') : esc(tx(x.route[x.stage] || '')), _kind: 'order', _id: x.no })), ...memos.map(m => ({ no: m.no, day: m.day, title: w(m.title), st: tx(m.status), _kind: 'memo', _id: m.no }))], cols: [{ key: 'no', title: '№' }, { key: 'day', title: tc('date'), kind: 'date' }, { key: 'title', title: tc('name') }, { key: 'st', title: tc('status') }], ...NB, sort: { key: 'day', dir: 'desc' } }) : note(tc('none')), tab: 'rel' },
    { h: tc('obj.files'), html: files.length ? `<ul class="ul">${files.map(x => `<li>${esc(x.name)} · ${esc(x.kind || '')}</li>`).join('')}</ul>` : note(tc('obj.no_files')), tab: 'rel' },
    ];
    const ys = []; for (let y = WW.Y0; y <= WW.yOf(at); y++){ const d0 = WW.idxOf(y, 6, 1), d1 = Math.min(at, WW.idxOf(y, 11, 31)); const d = WW.active(o, d0) ? d0 : (WW.active(o, d1) ? d1 : null); if (d != null && d <= at) ys.push([tc('obj.hist_tariff', { y }), f.T(WW.tariff(o, d))]); }
    const hist = kv([[tc('obj.hist_sign'), o.signDay >= 0 ? f.dt(o.signDay) : tc('obj.since2022')], [tc('obj.hist_start'), o.start >= 0 ? f.dt(o.start) : tc('obj.since2022')], o.terminated != null ? [tc('obj.hist_end'), f.dt(o.terminated)] : null, [tc('obj.hist_chief'), f.dt(Math.max(0, o.start))], ...(mon ? ys : [])]);
    return {
    title: `${w(o.name)} · ${w(cu.name)}`, sub: `${tx(o.kind)} · ${tx(o.city)} · ${tx(o.region)} · ${tx(o.sched)} · ${ended ? tc('obj.ended', { d: f.dt(o.terminated) }) : `${tc('obj.contract')} ${f.dt(o.contractEnd)} (${tc('obj.left', { n: f.N(o.contractEnd - at) })})`}`,
    badges: [st, mon ? [f.P(v.margin), v.profit < 0 ? 'bad' : (v.margin < 10 ? 'warn' : 'good')] : null, missedPost ? [tc('obj.missed_post') + ': ' + w('пост ' + missedPost), 'bad'] : null],
    blocks: [{ h: tc('passport'), html: kv([[tc('obj.kind'), esc(tx(o.kind))], [tc('obj.city'), `${esc(tx(o.city))} · ${esc(tx(o.region))}`], [tc('obj.cust'), chip('customer:' + cu.id, w(cu.name))], [tc('obj.sched'), `${o.is24 ? '24/7' : tc('dayshift')} · ${esc(tx(o.sched))}`], [tc('obj.contract'), ended ? tc('obj.ended', { d: f.dt(o.terminated) }) : `${f.dt(o.contractEnd)} · ${tc('obj.left', { n: f.N(o.contractEnd - at) })}`], [tc('obj.status'), pill(st[0], st[1])]]) },
      { h: tc('at', { d: f.dt(at) }), html: nowB },{ h: tc('for_period', { p: per() }), html: perB }, { h: tc('dyn12'), html: dyn, tab: 'dyn' }, ...rel,
      { h: t('an.ch.title'), small: t('an.ch.sub', { p: per() }), html: A.chainHtml(A.chain('object', o.id, a, b, at)), tab: 'chain' }, { h: tc('history'), html: hist, tab: 'hist' }],
    related: [{ card: 'customer:' + cu.id, label: w(cu.name) }, { card: 'region:' + o.region, label: tx(o.region) }, ...(o.name === KR().MYOBJ ? [{ card: 'chat:o18', label: tc('obj.chat') }] : [])],
    actions: [{ label: tc('obj.act_check'), fn: () => askAI(tc('obj.act_q', { o: w(o.name), d: f.dt(at) }), { kind: 'object', id: o.id }) }],
    go: 'objects', owner: 'Начальник охраны', obj: o.name,
    };
  };

  // ---------- заказчик ----------
  CARDS.customer = (id) => {
    const c = byId(W().customers, id); if (!c) return null;
    const vis = c.objects.filter(KR().scopeOk); if (!vis.length) return denied(w(c.name), tc('denied_scope'));
    const r = R(), f = F(), at = r.anchor, a = r.from, b = r.to, mon = money(), WW = W();
    const ag = D().objAgg(a, b, vis), act = vis.filter(o => WW.active(o, at));
    const blocks = [];
    const base = kv([[tc('cu.region'), `${esc(tx(c.region))} · ${esc(tx(c.city))}`], [tc('cu.channel'), esc(tx(c.channel))], [tc('cu.pay'), `${f.N(c.payDays)} ${tc('days')}`], [tc('cu.delay'), `${f.N(c.delayMean)} ${tc('days')}`],
    [tc('cu.objs'), `${f.N(act.length)} / ${f.N(act.reduce((s, o) => s + o.posts, 0))}`],
    mon ? [tc('cu.rev'), f.MU(ag.rev)] : null, mon ? [tc('cu.share'), f.P(D().revenueOf(a, b) ? ag.rev / D().revenueOf(a, b) * 100 : 0)] : null, mon ? [tc('cu.margin'), `<span class="${cls(ag.margin)}">${f.P(ag.margin)}</span>`] : null]);
    blocks.push({ h: tc('for_period', { p: per() }), html: base });
    let risk = null;
    if (mon){
    const ar = WW.receivables(at, x => x === c), e = ar.byCust.get(c) || { overdue: 0, maxDays: 0, debt: 0 }, agg2 = WW.aging(at, x => x === c);
    const acts = WW.acts.filter(x => x.cust === c && x.actDay <= at && x.month >= 0).slice(-12);
    const dso = acts.filter(x => x.pay <= at).map(x => x.pay - x.actDay), dsoAvg = dso.length ? dso.reduce((s, x) => s + x, 0) / dso.length : null;
    risk = e.maxDays > 30;
    blocks.push({ h: tc('at', { d: f.dt(at) }), html: kv([[tc('cu.ar'), f.MU(ar.total)], [tc('cu.billed'), f.MU(ar.billed)], [tc('cu.unbilled'), f.MU(ar.unbilled)], [tc('cu.overdue'), `<span class="${e.overdue ? 'dn' : 'up'}">${f.MU(e.overdue)}</span>`], [tc('cu.maxdays'), `<span class="${e.maxDays > 30 ? 'dn' : ''}">${f.N(e.maxDays)} ${tc('days')}</span>`], [tc('cu.dso'), dsoAvg == null ? dash : `${f.F(dsoAvg, 0)} ${tc('days')} · ${tc('cu.pay').toLowerCase()} ${c.payDays}`]]) +
      tbl('cu-age-' + c.id, { rows: [['age.notDue', agg2.notDue], ['age.d30', agg2.d30], ['age.d60', agg2.d60], ['age.d90', agg2.d90], ['age.d90p', agg2.d90p], ['age.unbilled', ar.unbilled]].map(([k, v0]) => ({ n: tc('' + k), v: v0 })), cols: [{ key: 'n', title: tc('by_age') }, { key: 'v', title: tc('sum'), ...MS, share: true }], ...NB, sortable: false }) });
    blocks.push({ h: tc('cu.acts'), html: tbl('cu-acts-' + c.id, { rows: acts.slice().reverse().map(x => ({ no: `${c.id}-${x.month}`, m: x.actDay, amt: x.amount, due: x.due, pay: x.pay <= at ? x.pay : null, late: x.pay <= at ? Math.max(0, x.pay - x.due) : Math.max(0, at - x.due), _kind: 'act', _id: `${c.id}:${x.month}`, _cls: x.pay > at && at > x.due + 30 ? 'an-bad' : '' })),
      cols: [{ key: 'no', title: tc('act_no') }, { key: 'm', title: tc('date'), kind: 'date' }, { key: 'amt', title: tc('amount_vat'), ...MS }, { key: 'due', title: tc('due_date'), kind: 'date', lo: true }, { key: 'pay', title: tc('paid'), kind: 'date', fmt: x => x == null ? `<span class="dn">${tc('not_paid')}</span>` : F().dt(x) }, { key: 'late', title: tc('late_days'), kind: 'int', sum: 'max', cls: r0 => r0.late > 30 ? 'dn' : '' }], search: false, csv: 'acts_' + c.id }), tab: 'rel' });
    const ms = months(b), inflow = ms.map(x => WW.acts.filter(y => y.cust === c && y.pay >= x.from && y.pay <= x.to).reduce((s, y) => s + y.amount, 0));
    blocks.push({ h: tc('dyn12'), html: K.ui.bars(inflow.map(nm), ms.map(x => x.label), { fmt: x => f.F(x) + ' ' + f.U(), values: x => f.F(x, 1), color: 'var(--c1)', label: tc('cu.inflow') }) + note(tc('cu.inflow') + ', ' + f.U()) + K.ui.lines([{ n: tc('obj.revm'), v: ms.map(x => nm(D().objAgg(x.from, x.to, vis).rev) * x.rate), c: 'var(--c2)' }], ms.map(x => x.label), { fmt: x => f.F(x, 1), h: 130, partialLast: ms.length && ms[ms.length - 1].partial }), tab: 'dyn' });
    }
    blocks.push({ h: tc('cu.objects'), html: tbl('cu-obj-' + c.id, { rows: vis.map(o => { const v = WW.objView(o, a, b, b); return { name: w(o.name), kind: tx(o.kind), posts: o.posts, rev: v.rev, margin: v.margin, end: o.contractEnd, _kind: 'object', _id: o.id, _cls: WW.active(o, at) ? '' : 'an-warn' }; }),
    cols: [{ key: 'name', title: tc('name') }, { key: 'kind', title: tc('obj.kind'), lo: true }, { key: 'posts', title: tc('obj.posts'), kind: 'int', sum: 'sum' }, ...(mon ? [{ key: 'rev', title: tc('obj.rev'), ...MS, share: true }, { key: 'margin', title: tc('obj.margin'), kind: 'pct', sum: { w: 'rev' }, cls: r0 => cls(r0.margin) }] : []), { key: 'end', title: tc('obj.contract'), kind: 'date', lo: true }], search: false, csv: 'customer_objects_' + c.id }), tab: 'rel' });
    const set = new Set(vis), inc = WW.incidents.filter(x => set.has(x.obj) && x.day >= a && x.day <= b);
    blocks.push({ h: tc('cu.inc'), small: `${f.N(inc.length)} · ${t('an.k.complaints').toLowerCase()} ${f.N(inc.filter(x => x.type === 'жалоба заказчика').length)}`, html: inc.length ? incTable('cu-inc-' + c.id, inc.slice(0, 50), { search: false }) : note(tc('none')), tab: 'rel' });
    blocks.push({ h: t('an.ch.title'), small: t('an.ch.sub', { p: per() }), html: A.chainHtml(A.chain('customer', c.id, a, b, at)), tab: 'chain' });
    const lt = (D().liveTaskList() || []).filter(x => (x.title || '').includes(c.name));
    if (lt.length) blocks.push({ h: tc('obj.tasks'), html: tbl('cu-tk-' + c.id, { rows: taskRows(lt), cols: taskCols(), ...NB }), tab: 'rel' });
    const e2 = mon ? (WW.receivables(at, x => x === c).byCust.get(c) || { overdue: 0, maxDays: 0 }) : null;
    return { title: w(c.name), sub: `${tx(c.region)} · ${tx(c.channel)}`, badges: mon ? [risk ? [tc('cu.risk'), 'bad'] : [tc('cu.ok'), 'good']] : [], blocks,
    related: [{ card: 'region:' + c.region, label: tx(c.region) }, { card: 'channel:' + c.channel, label: tx(c.channel) }],
    actions: mon ? [{ label: tc('cu.letter'), fn: () => askAI(tc('cu.letter_q', { c: w(c.name), a: f.MU(WW.receivables(at, x => x === c).total), d: e2.maxDays }), { kind: 'customer', id: c.id }) }] : [], go: 'sales', owner: 'Коммерческий директор' };
  };

  // ---------- сотрудник / роль ----------
  CARDS.employee = (id) => {
    const rl = KR().ROLES.find(x => x.id === id || x.name === id); if (!rl) return null;
    const me = role(); if (!(me.rt.admin !== '·' || rl.name === me.name || ['owner', 'gd', 'ed', 'hr'].includes(me.id))) return denied(F().rn(rl.name), tc('denied_scope'));
    const r = R(), f = F(), at = r.anchor, WW = W(), D0 = D().docflowAt(at);
    const mineO = D0.orders.filter(o => !o.done && o.route[o.stage] === rl.name), mineM = D0.memos.filter(m => m.status !== 'закрыта' && m.to === rl.name);
    const tk = WW.tasksAt(at).filter(x => x.owner === rl.name), done = WW.tasksDone(r.from, r.to).filter(x => x.owner === rl.name);
    const er = at >= WW.LAUNCH_DEMO ? D().errandsAt(at).filter(e => e.who === rl.name) : [];
    const ch = rl.rt.chats !== '·' ? D().myChats(rl, at) : [];
    const blocks = [{ h: tc('em.mission'), html: kv([[tc('em.grp'), esc(tx(rl.grp))], [tc('em.mission'), esc(rl.mission)], [tc('em.boss'), esc(rl.boss)], [tc('em.limit'), esc(rl.limit)], [tc('em.step'), esc(rl.step)], [tc('em.n'), f.N(rl.n(KR().roleCtx(at)))]]) +
    `<div class="rights">${KR().BLK.filter(([k]) => rl.rt[k] !== '·').map(([k, n]) => `<span class="rg l${rl.rt[k]}" title="${esc(KR().LVL[rl.rt[k]])}">${esc(tx(n))} · ${rl.rt[k]}</span>`).join('')}</div>` }];
    blocks.push({ h: tc('em.mine', { d: f.dt(at) }), html: kv([[t('an.ch.tasks'), `${f.N(tk.length)} · ${tc('overdue')} ${f.N(tk.filter(x => x.overdue).length)}`], [tc('order_doc'), f.N(mineO.length)], [tc('me.res'), f.N(mineM.length)], [tc('em.done'), tc('em.done_v', { n: f.N(done.length), p: f.P(done.length ? done.filter(x => x.done <= x.due).length / done.length * 100 : 100) })]]) + (tk.length ? tbl('em-tk-' + rl.id, { rows: taskRows(tk), cols: taskCols(), ...NB }) : '') });
    const kpi = (D().roleKpi(rl, at) || []).join('');
    if (kpi) blocks.push({ h: tc('em.kpi'), html: `<div class="tiles cd-tiles">${kpi}</div>`, tab: 'dyn' });
    if (['guard', 'senior', 'obj'].includes(rl.id)) blocks.push({ h: tc('em.demo', { o: w(KR().MYOBJ) }), html: kv([[tc('em.sched'), esc(tx('сутки/трое'))], [tc('em.hours'), f.F(W().P.normYear / 12, 1)], [tc('em.cert'), f.dt(at + 224)], [tc('em.med'), f.dt(at + 131)], [tc('em.ack'), tc('em.ack_v')]]) });
    if (me.rt.salary !== '·' && money()){ const p = WW.pl(r.from, r.to), h = WW.hr(r.to); blocks.push({ h: tc('em.sal'), html: kv([['guard', 'senior'].includes(rl.id) ? [tc('em.sal_g'), f.T(h.guards ? p.guardC / h.guards / r.len * 30.4 : 0)] : [tc('em.sal_a'), f.MU(p.adminC)]]) }); }
    if (er.length) blocks.push({ h: tc('em.errands'), html: tbl('em-er-' + rl.id, { rows: er.map(e => ({ no: e.no, day: e.day, task: e.task, st: tx(e.st), _kind: 'errand', _id: e.no })), cols: [{ key: 'no', title: '№' }, { key: 'day', title: tc('date'), kind: 'date' }, { key: 'task', title: tc('er.task') }, { key: 'st', title: tc('status') }], ...NB }), tab: 'rel' });
    const rt = (D().ROUTINE || {})[rl.id] || [];
    if (rt.length) blocks.push({ h: tc('em.day'), html: `<ul class="ul">${rt.map(x => `<li>${x}</li>`).join('')}</ul>`, tab: 'rel' });
    if (ch.length) blocks.push({ h: tc('em.chats'), html: `<div class="cd-rel">${ch.map(c => chip('chat:' + c.name, c.name)).join('')}</div>`, tab: 'rel' });
    blocks.push({ h: t('an.ch.title'), html: A.chainHtml(A.chain('employee', rl.id)), tab: 'chain' });
    return { title: F().rn(rl.name), sub: tx(rl.grp), badges: [[tc('em.step') + ' ' + rl.step, 'info']], blocks, go: rl.rt.admin !== '·' ? 'admin-roles' : 'kokpit', owner: rl.name };
  };

  // ---------- плитка-показатель ----------
  CARDS.kpi = (key, ctx) => {
    const d = A.KPI_DEF[key]; if (!d) return CARDS.tile('', ctx);
    if (d.money && !money()) return denied(t(d.t), tc('denied_money'));
    const r = R(), f = F(), at = r.anchor, y0 = W().idxOf(W().yOf(at), 0, 1);
    const p = ctx.period || (d.ytd ? { from: y0, to: at } : { from: r.from, to: r.to });
    // дата остатка: из названия плитки, иначе (9.2.2) кокпит и документы — на «Данные на», разделы — на конец среза
    const s0 = sec(), ANCHOR = ['kokpit', 'owner', 'tasks', 'onec', 'quality', 'ai', 'admin', 'docflow', 'payments', 'chats'];
    const tdm = ctx.el && !d.noTitleDate && /(\d\d)\.(\d\d)\.(\d{4})/.exec(tileTitle(ctx.el)), tday = tdm ? W().fromIso(`${tdm[3]}-${tdm[2]}-${tdm[1]}`) : null;
    const ival = d.type === 'flow' ? p.to : (tday != null && isFinite(tday) ? tday : (ctx.el ? (ANCHOR.includes(s0) ? at : p.to) : (d.at === 'anchor' ? at : p.to)));
    const v = d.type === 'flow' ? d.v(p.from, p.to) : (d.s ? d.s(ival) : null);
    const onTile = ctx.el ? strip((ctx.el.querySelector('.v') || {}).textContent || '') : '';
    const vs = d.fmtv ? d.fmtv(p.from, p.to) : (v == null ? esc(onTile || '—') : A.fmtKpi(d, v));
    const cmp = [];
    if (d.type === 'flow'){
    const len = p.to - p.from + 1, pv = ctx.period ? { from: p.from - len, to: p.from - 1 } : (d.ytd ? null : r.prev), yg = ctx.period ? { from: p.from - 364, to: p.to - 364 } : (d.ytd ? { from: W().idxOf(W().yOf(at) - 1, 0, 1), to: at - 365 } : r.yago);
    if (pv && pv.from >= 0){ const b0 = d.v(pv.from, pv.to); cmp.push([tc('vs_prev') + ` <small>${F().win(pv)}</small>`, `${A.fmtKpi(d, b0)} · ${D().delta(v, b0, d.low)}`]); }
    if (yg && yg.from >= 0){ const b0 = d.v(yg.from, yg.to); cmp.push([tc('vs_yago') + ` <small>${F().win(yg)}</small>`, `${A.fmtKpi(d, b0)} · ${D().delta(v, b0, d.low)}`]); }
    } else if (d.type === 'stock'){
    if (r.prev){ const b0 = d.s(r.prev.to); cmp.push([tc('on_date_prev', { d: f.dt(r.prev.to) }), `${A.fmtKpi(d, b0)} · ${D().delta(v, b0, d.low)}`]); }
    if (ival - 365 >= 0){ const b0 = d.s(ival - 365); cmp.push([tc('on_date_prev', { d: f.dt(ival - 365) }), `${A.fmtKpi(d, b0)} · ${D().delta(v, b0, d.low)}`]); }
    }
    const blocks = [{ html: `<div class="cd-hero"><span class="cd-hv">${vs}</span><span class="cd-hl">${d.type === 'stock' ? tc('at', { d: f.dt(ival) }) : tc('for_period', { p: F().win(p) })}${onTile && strip(onTile) !== strip(vs) ? ` · ${tc('on_tile')}: ${esc(onTile)}` : ''}</span></div>` +
    kv([[tc('formula'), esc(t(d.f))], [tc('source'), esc(t(d.src))], ...cmp]) }];
    const sig = d.sig ? d.sig(v, ival) : (ctx.el && /var\(--bad\)/.test(ctx.el.getAttribute('style') || '') ? 'bad' : (ctx.el && /var\(--warn\)/.test(ctx.el.getAttribute('style') || '') ? 'warn' : ''));
    blocks.push({ h: tc('signal'), html: note(sig === 'bad' ? tc('sig_bad', { f: esc(t(d.f)) }) : (sig === 'warn' ? tc('sig_warn', { f: esc(t(d.f)) }) : tc('sig_ok'))) });
    if (d.type === 'flow' || d.type === 'stock'){
    const ser = A.kpiSeries(d, p.to), lab = ser.map(x => x.l), money0 = d.unit === 'money';
    const vals = ser.map(x => money0 ? nm(x.v) : x.v);
    const fm = x => money0 ? f.F(x, 1) : (d.unit === 'pct' ? f.F(x, 1) : f.F(x, d.unit === 'num2' ? 2 : 0));
    const chart = d.type === 'flow' ? K.ui.bars(vals, lab, { h: 150, fmt: x => fm(x) + (money0 ? ' ' + f.U() : ''), values: fm, color: 'var(--c1)', hollow: ser.map(x => x.partial), label: t(d.t) }) : K.ui.lines([{ n: t(d.t), v: vals, c: 'var(--c1)' }], lab, { fmt: fm, h: 150, label: t(d.t) });
    blocks.push({ h: tc('dyn12'), small: money0 ? f.U() : '', html: chart + tbl('kpi-ser-' + key, { rows: ser.map((x, k) => ({ l: x.l + (x.partial ? ' *' : ''), v: x.v, _k: k })), cols: [{ key: 'l', title: tc('month'), sort: false }, { key: 'v', title: t(d.t), kind: d.unit === 'money' ? 'money' : (d.unit === 'pct' ? 'pct' : 'num'), d: d.unit === 'num2' ? 2 : 0, sum: d.type === 'flow' && ['money', 'int'].includes(d.unit) ? 'sum' : 'avg' }], search: false, csv: 'kpi_' + key + '_12m', pageSize: 12, sortable: false }), tab: 'dyn' });
    }
    if (d.bd){
    (d.bd(p.from, p.to, ival) || []).forEach((g, k) => {
      if (!g || !g.rows || !g.rows.length) return;
      const kind = g.kind || (g.rows[0] && g.rows[0].kind) || (d.unit === 'money' ? 'money' : (d.unit === 'pct' ? 'pct' : (d.unit === 'min' ? 'num' : 'int')));
      const sum = g.rows.reduce((s, x) => s + (+x.v || 0), 0);
      const ok = g.sum && typeof v === 'number' && Math.abs(sum - v) <= Math.max(1e-6, Math.abs(v) * 1e-6) + (d.unit === 'money' ? 1 : 0.5);
      blocks.push({ h: g.h, html: tbl(`kpi-bd-${key}-${k}`, { rows: g.rows.map(x => ({ n: x.name, v: x.v, _kind: x.card ? x.card.split(':')[0] : null, _id: x.card ? x.card.slice(x.card.indexOf(':') + 1) : null })).map(x => x._kind ? x : (delete x._kind, delete x._id, x)),
        cols: [{ key: 'n', title: tc('name') }, { key: 'v', title: t(d.t), kind, d: 1, sum: g.sum ? 'sum' : (kind === 'pct' || kind === 'num' ? 'avg' : 'none'), share: !!g.sum }], csv: `kpi_${key}_${k}`, sort: { key: 'v', dir: 'desc' } }) + (ok ? note('✓ ' + tc('sum_ok', { v: vs })) : ''), tab: k === 0 ? 'main' : 'rel' });
    });
    }
    return { title: t(d.t) + (d.type === 'stock' ? ` · ${f.dt(ival)}` : ''), sub: K.ui.SEC_NAME(hash()) || '', badges: sig ? [[sig === 'bad' ? '!' : '•', sig]] : [], blocks, go: d.go, owner: KR().OWNER_OF[d.go] };
  };
  // плитка без своего показателя: название, значение, пояснения
  CARDS.tile = (id, ctx) => {
    const el = ctx.el; if (!el) return { title: tc('value'), blocks: [{ html: note(tc('notfound')) }] };
    const ttl = tileTitle(el), val = el.querySelector('.v') ? strip(el.querySelector('.v').innerText) : '', lines = [...el.querySelectorAll('.d')].map(x => x.innerHTML);
    return { title: ttl, sub: K.ui.SEC_NAME(hash()), blocks: [{ html: `<div class="cd-hero"><span class="cd-hv">${esc(val)}</span><span class="cd-hl">${esc(ctx.ctx || '')}</span></div>` }, lines.length ? { h: tc('tile_lines'), html: `<ul class="ul">${lines.map(x => `<li>${x}</li>`).join('')}</ul>` } : null, { h: tc('formula'), html: note(tc('tile_formula')) }], go: hash() };
  };

  // ---------- строка таблицы без вида (старая таблица или table2 без _kind) ----------
  CARDS.tr = (id, ctx) => {
    const tr = ctx.el; if (!tr) return null;
    const tb = tr.closest('table'), hs = [...tb.querySelectorAll('thead th')].map(th => strip(th.innerText)), tds = [...tr.children];
    const title = strip((tds[0] ? tds[0].innerText.split('\n')[0] : '')) || tc('value');
    const pairs = tds.slice(1).map((td, i) => [esc(hs[i + 1] || ''), td.innerHTML]).filter(([k, v]) => k && strip(v) && strip(v) !== '—');
    const sub0 = tds[0] && tds[0].innerText.split('\n').slice(1).join(' · ');
    return { title, sub: [ctx.ctx, sub0].filter(Boolean).join(' · '), blocks: [{ html: kv(pairs) }], go: hash() };
  };
  CARDS.row = (id) => {
    const [tid, ix] = [id.slice(0, id.lastIndexOf(':')), +id.slice(id.lastIndexOf(':') + 1)];
    const rp = A.rowPairs(tid, ix); if (!rp) return null;
    const [first, ...rest] = rp.pairs;
    return { title: first ? strip(first[1]) : tc('value'), sub: rp.o.caption ? strip(rp.o.caption) : (first ? first[0] : ''), blocks: [{ html: kv(rest.map(([k, v]) => [esc(k), v])) }], go: hash() };
  };
  // строки без названия — обычный текст (не «Значение»), подряд идущие с названием — одной таблицей «поле — значение»
  CARDS.raw = (id, ctx) => { const out = []; let grp = [];
    const flush = () => { if (grp.length){ out.push(kv(grp)); grp = []; } };
    (ctx.rows || []).forEach(([k, v]) => { if (v == null || v === '') return; if (k) grp.push([k, v]); else { flush(); out.push(`<p class="cd-txt">${v}</p>`); } }); flush();
    return { title: ctx.title || '', sub: ctx.ctx || '', blocks: [{ html: out.join('') || note(tc('notfound')) }], go: hash() }; };

  // ---------- задача ----------
  function findTask(id){
    const at = R().anchor, LT = D().liveTaskList() || [];
    if (String(id).startsWith('L')){ const x = LT.find(y => 'L' + y.id === id); if (x) return x; }
    return LT.find(y => y.no === id) || W().tasksAt(at).find(y => y.no === id) || W().tasksDone(0, at).find(y => y.no === id) || null;
  }
  CARDS.task = (id) => {
    const x = findTask(id); if (!x) return null;
    const f = F(), at = R().anchor, m = /Объект № \d+/.exec(x.title || ''), o = m && W().objects.find(y => y.name === m[0]);
    if (o && !KR().scopeOk(o) && role().rt.tasks !== 'П') return denied(x.no, tc('denied_scope'));
    const done = x.done != null && x.done <= at && !x.live;
    const hist = [[f.dt(x.created ?? at), tc('tk.h_created')], ...(x.status && !done ? [[f.dt(at), tc('tk.h_status', { s: tx(x.status) })]] : []), ...(done ? [[f.dt(x.done), tc('tk.h_done')]] : [])];
    return { title: `${x.no} · ${w(x.title)}`, sub: F().rn(x.owner), badges: [[done ? tc('done') : tx(x.status || 'в работе'), done ? 'good' : 'info'], x.overdue ? [tc('tk.overdue'), 'bad'] : null, [tx(x.pr || 'средний'), x.pr === 'срочно' ? 'urgent' : 'mute']],
    blocks: [{ html: kv([[tc('tk.owner'), esc(F().rn(x.owner))], [tc('tk.src'), esc(tx(x.src || ''))], [tc('tk.pr'), esc(tx(x.pr || ''))], [tc('tk.created'), x.created != null ? f.dt(x.created) : dash], [tc('tk.due'), f.dt(x.due) + (x.overdue ? ` <span class="dn">${tc('tk.overdue')}</span>` : '')], done ? [tc('tk.done'), f.dt(x.done)] : null, x.who ? [tc('tk.who'), esc(x.who)] : null, o ? [tc('tk.obj'), chip('object:' + o.id, w(o.name))] : null]) },
      { h: tc('history'), html: kv(hist.map(([d, s]) => [d, esc(s)])), tab: 'hist' }],
    related: o ? [{ card: 'object:' + o.id, label: w(o.name) }] : [], go: 'tasks', owner: x.owner };
  };
  // ---------- проект ----------
  CARDS.project = (id) => {
    const at = R().anchor, p = (D().projectsAt(at) || []).find(x => x.name === id); if (!p) return null;
    const f = F();
    return { title: tx(p.name), sub: F().rn(p.owner), badges: [[f.P(p.prog * 100), 'info'], [p.late ? tc('pr.late') : tc('pr.ontrack'), p.late ? 'bad' : 'good']],
    blocks: [{ html: kv([[tc('pr.owner'), esc(F().rn(p.owner))], [tc('pr.dates'), `${f.dt(p.from)} – ${f.dt(p.to)}`], [tc('pr.prog'), f.P(p.prog * 100)], [tc('pr.tasks'), f.N(p.tasks)]]) },
      { h: tc('pr.stages'), html: tbl('pr-' + p.name, { rows: p.stages.map((s, k) => ({ n: k + 1, s: tx(s), st: k < p.stDone ? tc('pr.stage_done') : (k === p.stDone ? tc('pr.stage_now') : tc('pr.stage_wait')), _cls: k < p.stDone ? '' : (k === p.stDone ? 'an-warn' : '') })), cols: [{ key: 'n', title: '№', kind: 'int' }, { key: 's', title: tc('pr.stages') }, { key: 'st', title: tc('status') }], ...NB, total: false, sortable: false }) }],
    go: 'tasks-projects', owner: p.owner };
  };
  // ---------- приказ, служебная записка ----------
  CARDS.order = (id) => {
    const at = R().anchor, f = F(), D0 = D().docflowAt(at);
    let o = D0.orders.find(x => x.no === id), live = null;
    if (!o && String(id).startsWith('L')){ live = (window.LIVE && window.LIVE.docs || []).find(d => 'L' + d.id === id); if (live){ const tt = D().ORD_T[live.t] || D().ORD_T[0]; o = { no: tc('od.no') + ' · new', day: live.day ?? at, kind: tt[0], title: tt[1], author: F().whoOf(live), route: tt[3], stage: Math.min(live.stage || 0, tt[3].length), done: !!live.done, overdue: false, due: (live.day ?? at) + tt[3].length, obj: null, people: tt[0] === 'к' ? 1 : 5, note: live.note }; } }
    if (!o) return null;
    if (o.obj && !KR().scopeOk(o.obj) && role().rt.docflow === 'С') return denied(o.no, tc('denied_scope'));
    const step = o.route[o.stage];
    const route = tbl('od-' + o.no, { rows: o.route.map((s, k) => ({ n: k + 1, s: s === 'ознакомление' ? tx(s) : F().rn(s), st: k < o.stage || o.done ? tc('od.step_ok') : (k === o.stage ? tc('od.step_now') : tc('od.step_wait')), _cls: k === o.stage && !o.done ? 'an-warn' : '' })), cols: [{ key: 'n', title: '№', kind: 'int' }, { key: 's', title: tc('od.route') }, { key: 'st', title: tc('status') }], ...NB, total: false, sortable: false });
    return { title: `${tc('order_doc')} № ${o.no} · ${tx(o.title)}`, sub: `${o.kind === 'к' ? tc('od.kind_k') : tc('od.kind_o')} · ${f.dt(o.day)}`, badges: [[o.done ? tc('od.done') : tc('od.waits', { w: step === 'ознакомление' ? tx(step) : F().rn(step) }), o.done ? 'good' : 'info'], o.overdue ? [tc('overdue'), 'bad'] : null],
    blocks: [{ html: kv([[tc('od.no'), esc(o.no)], [tc('date'), f.dt(o.day)], [tc('od.kind'), o.kind === 'к' ? tc('od.kind_k') : tc('od.kind_o')], [tc('od.author'), esc(F().rn(o.author))], [tc('od.step'), o.done ? tc('od.done') : esc(step === 'ознакомление' ? tx(step) : F().rn(step))], [tc('od.due'), f.dt(o.due) + (o.overdue ? ` <span class="dn">${tc('overdue')}</span>` : '')], [tc('od.people'), tc('od.people_v', { n: f.N(o.people || 0) })], o.obj ? [tc('tk.obj'), chip('object:' + o.obj.id, w(o.obj.name))] : null, o.note ? [tc('me.subj'), esc(o.note)] : null]) },
      { h: tc('od.route'), html: route, tab: 'hist' }],
    related: o.obj ? [{ card: 'object:' + o.obj.id, label: w(o.obj.name) }] : [], go: 'docflow', owner: o.author };
  };
  CARDS.memo = (id) => {
    const at = R().anchor, f = F(), m = D().docflowAt(at).memos.find(x => x.no === id) || null;
    let x = m;
    if (!x && String(id).startsWith('L')){ const d = (window.LIVE && window.LIVE.docs || []).find(y => 'L' + y.id === id); if (d) x = { no: 'СЗ-new', day: d.day ?? at, from: F().whoOf(d), to: d.to, title: d.subj, res: d.res || '', sla: (d.day ?? at) + 2, status: d.status, overdue: false, task: d.exec || '' }; }
    if (!x) return null;
    const mo = /Объект № \d+/.exec(x.title || ''), o = mo && W().objects.find(y => y.name === mo[0]);
    return { title: `${x.no} · ${w(x.title)}`, sub: f.dt(x.day), badges: [[tx(x.status || ''), x.status === 'закрыта' ? 'good' : 'info'], x.overdue ? [tc('overdue'), 'bad'] : null],
    blocks: [{ html: kv([[tc('me.from'), esc(F().rn(x.from))], [tc('me.to'), esc(F().rn(x.to))], [tc('me.subj'), esc(w(x.title))], [tc('me.res'), esc(tx(x.res || '')) || dash], [tc('me.sla'), f.dt(x.sla)], [tc('me.task'), esc(tx(x.task || '')) || dash], o ? [tc('tk.obj'), chip('object:' + o.id, w(o.name))] : null]) },
      { h: tc('history'), html: kv([[f.dt(x.day), esc(tc('tk.h_created'))], [f.dt(Math.min(at, x.day + 1)), esc(tx(x.status || ''))]]), tab: 'hist' }],
    related: o ? [{ card: 'object:' + o.id, label: w(o.name) }] : [], go: 'docflow-memos', owner: x.to };
  };
  // ---------- заявка на оплату ----------
  CARDS.pay = (id) => {
    if (!finRole()) return denied(id, tc('denied_money'));
    const at = R().anchor, f = F(), all = [...(D().livePays() || []), ...(D().payReqs(at) || [])], p = all.find(x => x.no === id || (x.live && 'L' + x.id === id)); if (!p) return null;
    const M0 = W().MONTHS[W().monthIdx(p.day)], ln = D().LINES.bdr.find(l => l[1] === p.line);
    const pf = ln ? [D().planOf(ln[2], ln[3], ln[0], M0.start, M0.end), ln[2](M0.start, Math.min(M0.end, at))] : null;
    const k = p.route.indexOf(p.st), signs = (D().PAY_WHO[p.st] || []).map(F().rn).join(' / ');
    const route = tbl('py-' + p.no, { rows: p.route.map((s, j) => ({ n: j + 1, s: tx(s), st: j < k || p.st === 'оплачено' ? tc('od.step_ok') : (j === k ? tc('od.step_now') : tc('od.step_wait')), _cls: j === k && p.st !== 'оплачено' ? 'an-warn' : '' })), cols: [{ key: 'n', title: '№', kind: 'int' }, { key: 's', title: tc('py.route') }, { key: 'st', title: tc('status') }], ...NB, total: false, sortable: false });
    return { title: `${p.no} · ${esc(p.to)}`, sub: `${tx(p.line)} · ${f.dt(p.day)}`, badges: [[p.st === 'оплачено' ? tc('py.paid') : tx(p.st), p.st === 'оплачено' ? 'good' : 'info']],
    blocks: [{ html: kv([[tc('date'), f.dt(p.day)], [tc('py.to'), esc(p.to)], [tc('py.line'), esc(tx(p.line))], pf ? [tc('py.line_pf'), `${f.MU(pf[0])} / ${f.MU(pf[1])} · ${tc('exec').toLowerCase()} ${f.P(pf[0] ? pf[1] / pf[0] * 100 : 0)}`] : null, pf ? [tc('py.left'), `<span class="${pf[0] - pf[1] < p.amount ? 'dn' : 'up'}">${f.MU(pf[0] - pf[1])}</span>`] : null,
      [tc('py.amount'), f.MU(p.amount)], [tc('py.basis'), esc(p.basis || '')], [tc('py.who'), esc(F().rn(p.who))], [tc('py.step'), esc(tx(p.st))], [tc('py.signs'), esc(signs || dash)], [tc('py.payday'), f.dt(p.payDay)]]) },
      { h: tc('py.route'), html: route, tab: 'hist' }],
    go: 'payments', owner: 'Главный бухгалтер' };
  };
  // ---------- происшествие, проверка, предписание ----------
  CARDS.incident = (id) => {
    const x = W().incidents[+id]; if (!x) return null;
    if (!KR().scopeOk(x.obj)) return denied(w(x.obj.name), tc('denied_scope'));
    const f = F(), at = R().anchor, rep = W().incidents.filter(y => y.obj === x.obj && y.type === x.type && y.day <= x.day && y.day > x.day - 365).length;
    return { title: `${tx(x.type)} · ${w(x.obj.name)}`, sub: `${f.dt(x.day)} ${x.time}`, badges: [[x.closeDay <= at ? tc('in.closed', { d: f.dts(x.closeDay) }) : tc('in.open'), x.closeDay <= at ? 'good' : 'warn'], x.react > 15 ? ['> 15 ' + tc('min'), 'bad'] : null],
    blocks: [{ html: kv([[tc('in.when'), `${f.dt(x.day)} ${x.time}`], [tc('in.obj'), chip('object:' + x.obj.id, w(x.obj.name))], [tc('in.type'), esc(tx(x.type))], [tc('in.desc'), esc(tx(x.type)) + ' — ' + esc(w(x.obj.name)) + ', ' + esc(tx(x.obj.kind))], [tc('in.result'), esc(tx(x.result))], [tc('in.react'), tc('in.react_v', { m: f.N(x.react) })], [tc('in.status'), x.closeDay <= at ? tc('in.closed', { d: f.dt(x.closeDay) }) : tc('in.open')], [tc('in.by'), tc('in.by_v')], [tc('in.repeat'), tc('in.repeat_v', { n: f.N(rep) })]]) }],
    related: [{ card: 'object:' + x.obj.id, label: w(x.obj.name) }, { card: 'customer:' + x.obj.customer.id, label: w(x.obj.customer.name) }],
    actions: [{ label: tc('in.act'), fn: () => askAI(tc('in.act_q', { o: w(x.obj.name), d: f.dt(x.day), t: tx(x.type) }), { kind: 'incident', id }) }], go: 'incidents', owner: 'Начальник охраны', obj: x.obj.name };
  };
  CARDS.check = (id) => {
    const c = W().checks[+id]; if (!c) return null;
    if (!KR().scopeOk(c.obj)) return denied(w(c.obj.name), tc('denied_scope'));
    const f = F(), at = R().anchor;
    return { title: `${tc('obj.chk')} · ${w(c.obj.name)}`, sub: f.dt(c.day), badges: [['★'.repeat(c.score), c.score >= 4 ? 'good' : 'warn'], c.presc ? [c.presc.fixDay <= at ? tc('ck.fixed') : tc('ck.open'), c.presc.fixDay <= at ? 'good' : 'bad'] : null],
    blocks: [{ html: kv([[tc('date'), f.dt(c.day)], [tc('in.obj'), chip('object:' + c.obj.id, w(c.obj.name))], [tc('ck.who'), esc(tx(c.who))], [tc('ck.score'), `${'★'.repeat(c.score)}${'☆'.repeat(5 - c.score)} (${c.score})`], [tc('ck.result'), esc(tx(c.result))], [tc('ck.presc'), c.presc ? esc(tx(c.presc.what)) : tc('ck.none')], c.presc ? [tc('ck.fix'), `${f.dt(c.presc.fixDay)} · ${c.presc.fixDay <= at ? tc('ck.fixed') : tc('ck.open')}`] : null]) }],
    related: [{ card: 'object:' + c.obj.id, label: w(c.obj.name) }], go: 'incidents', owner: 'Начальник охраны', obj: c.obj.name };
  };
  CARDS.presc = CARDS.check;
  // ---------- автомобиль ----------
  CARDS.car = (id) => {
    const r = R(), f = F(), b = r.to, cars = W().fleetAt(K.CAT.fleet, b), c = cars[+id]; if (!c) return null;
    if (role().rt.fleet === '·' && role().id !== 'drv') return denied(c.car, tc('denied_scope'));
    const km = c.role.includes('ГБР') ? 2900 : (c.role.includes('развозка') ? 3400 : 2100), toDay = b + Math.round(c.toLeft / km * 30.4);
    const cost = W().fleetCost([K.CAT.fleet[+id]], r.from, b), tr = W().pl(r.from, b).transport, over = (c.fuelFact / c.fuelNorm - 1) * 100;
    const ms = months(b), cm = ms.map(x => W().fleetCost([K.CAT.fleet[+id]], x.from, x.to));
    const days = r.len, wb = Math.round(days * 5 / 7), kmP = Math.round(km / 30.4 * days);
    const fp = W().P && W().P.fuelPrice && W().P.fuelPrice[W().yOf(b)];
    const rep = (D().payReqs(r.anchor) || []).filter(p => p.line === 'Транспорт и ГСМ' && /Ремонт|ТО/.test(p.to));
    const mt = W().tasksAt(r.anchor).filter(x => x.owner === 'Механик');
    return { title: c.car, sub: tx(c.role), badges: [c.toLeft <= 1000 ? [tc('car.to') + ' ' + f.N(c.toLeft) + ' km', 'warn'] : null, c.insLeft <= 30 ? [tc('car.ins') + ' ' + f.dts(c.insDay), 'bad'] : null, over > 10 ? [tc('car.over') + ' ' + f.P(over), 'bad'] : null],
    blocks: [{ html: kv([[tc('car.role'), esc(tx(c.role))], [tc('car.year'), String(c.year)], [tc('car.km'), f.N(c.kmAt) + ' km'], [tc('car.to'), tc('car.to_v', { k: f.N(c.toLeft), d: f.dt(toDay) })], [tc('car.ins'), `${f.dt(c.insDay)} · ${tc('ec.left', { n: f.N(c.insLeft) })}`], [tc('car.insp'), `${f.dt(c.inspDay)} · ${tc('ec.left', { n: f.N(c.inspLeft) })}`],
      [tc('car.fuel'), `${f.F(c.fuelNorm)} / <span class="${over > 10 ? 'dn' : ''}">${f.F(c.fuelFact)}</span> (${over >= 0 ? '+' : ''}${f.F(over)} %)`], fp && over > 0 ? [tc('car.over') + ', ₸', f.T((c.fuelFact - c.fuelNorm) / 100 * kmP * fp)] : null,
      money() ? [tc('car.cost'), f.MU(cost)] : null, money() ? [tc('car.share'), f.P(tr ? cost / tr * 100 : 0)] : null, [tc('car.waybills'), tc('car.wb_v', { n: f.N(wb), k: f.N(kmP) })]]) },
      money() ? { h: tc('dyn12'), small: f.U(), html: K.ui.bars(cm.map(nm), ms.map(x => x.label), { h: 130, fmt: x => f.F(x, 2), values: x => f.F(x, 2), color: 'var(--c6)', hollow: ms.map(x => x.partial), label: tc('car.costm') }), tab: 'dyn' } : null,
      { h: tc('car.repairs'), html: rep.length ? tbl('car-rep-' + id, { rows: rep.map(p => ({ no: p.no, day: p.day, to: p.to, amt: p.amount, st: tx(p.st), _kind: 'pay', _id: p.no })), cols: [{ key: 'no', title: '№' }, { key: 'day', title: tc('date'), kind: 'date' }, { key: 'to', title: tc('py.to') }, { key: 'amt', title: tc('sum'), ...MS }, { key: 'st', title: tc('status'), lo: true }], ...NB }) : note(tc('none')), tab: 'rel' },
      { h: tc('car.mech'), html: mt.length ? tbl('car-tk-' + id, { rows: taskRows(mt.slice(0, 20)), cols: taskCols(), ...NB }) : note(tc('none')), tab: 'rel' }].filter(Boolean),
    actions: [{ label: tc('car.defect'), fn: () => askAI(tc('car.defect_q', { c: c.car, d: f.dt(r.anchor) }), { kind: 'car', id }) }], go: 'fleet', owner: 'Механик' };
  };

  // ---------- строка ОПиУ / ДДС / баланса / налогов / бюджета ----------
  const LINE_SRC = {
    pl: (k, a, b) => { const n = D().plNode(k); return n ? n.fn(a, b) : W().pl(a, b)[k]; }, cf: (k, a, b) => W().cashflow(a, b)[k], tax: (k, a, b) => k === 'total' ? W().taxes(a, b).total : W().taxes(a, b)[k], bs: (k, a, b) => W().balance(b)[k],
  };
  const OPEX_CH = ['uniform', 'transport', 'comms', 'office', 'other', 'it'];
  CARDS.line = (id) => {
    const [grp, ...kp] = String(id).split(':'), key = kp.join(':'), r = R(), f = F(), a = r.from, b = r.to, at = r.anchor, WW = W();
    const capM = K.module && K.module('capital');
    if (grp === 'eq' ? !(capM && typeof capM.allowed === 'function' && capM.allowed(role())) : !finRole()) return denied(id, tc('denied_money'));
    if (grp === 'eq'){ const C = K.module && K.module('capital'), c = C && typeof C.card === 'function' ? C.card(id) : null; if (!c) return denied(id, tc('denied_money')); return CARDS.raw('', { title: c.title, rows: c.rows, ctx: c.ctx }); }   // строки «Капитала» (3.6.2)
    if (grp !== 'bdr' && !LINE_SRC[grp]) return null;
    const isBdr = grp === 'bdr', bl = isBdr ? [...D().LINES.bdr, ...D().LINES.cf, ...D().LINES.supply, ...D().LINES.hr, ...D().LINES.fleet].find(l => String(l[0]) === key) : null;
    const pn = grp === 'pl' ? D().plNode(key) : null;   // строка ОПиУ по уровням (0.8.2): раздел, подстатья, регион, объект, месяц
    if (grp === 'pl' && !pn) return null;
    const name = isBdr ? (bl ? tx(bl[1]) : key) : (pn ? (pn.kind === 'month' ? `${D().plName(pn.path[pn.path.length - 1])} · ${pn.name}` : D().plName(pn)) : tc('' + grp + '.' + key));
    const stock = grp === 'bs', fn = isBdr ? (x, y) => (bl ? bl[2](x, y) : 0) : (x, y) => LINE_SRC[grp](key, x, y);
    if (isBdr && !bl) return null;
    const v = fn(a, b), sign = (grp === 'cf' && !['open', 'close', 'net', 'operating', 'investing', 'financing', 'inCustomers', 'interestIn'].includes(key)) || (pn && !pn.old && pn.sign === -1) ? -1 : 1;
    const fmt = x => f.MU(x);
    const blocks = [];
    const info = [[stock ? tc('at', { d: f.dt(b) }) : tc('for_period', { p: per() }), `<b>${fmt(v)}</b>`], [tc('formula'), esc(isBdr ? t('an.k.bdr.f') : (grp === 'tax' && I.has('tax.f.' + key) ? t('tax.f.' + key) : tc('line.f.' + (grp === 'pl' ? 'flow' : grp))))], [tc('source'), esc(t(grp === 'cf' || (grp === 'bs' && key === 'cash') ? 'an.src.bank' : (grp === 'tax' ? 'an.src.tax' : 'an.src.ledger')))]];
    if (stock){ const b0i = Math.max(0, a - 1), v0 = fn(0, b0i), bb = WW.balance(b); info.push([tc('change') + ` <small>${tc('on_date_prev', { d: f.dt(b0i) })} → ${f.dt(b)}</small>`, `${f.MU(v - v0)} · ${D().delta(v, v0)}`]); const side = ['cash', 'ar', 'inv', 'faNet', 'assets'].includes(key) ? 'a' : 'l'; info.push([side === 'a' ? tc('share_assets') : tc('share_liab'), f.P(bb.assets ? v / bb.assets * 100 : 0)]); }
    else {
    if (r.prev){ const p0 = fn(r.prev.from, r.prev.to); info.push([tc('vs_prev') + ` <small>${F().win(r.prev)}</small>`, `${fmt(p0)} · ${D().delta(v, p0, sign < 0)}`]); }
    if (r.yago){ const y0 = fn(r.yago.from, r.yago.to); info.push([tc('vs_yago') + ` <small>${F().win(r.yago)}</small>`, `${fmt(y0)} · ${D().delta(v, y0, sign < 0)}`]); }
    if (grp === 'pl' && key !== 'revenue'){ const rv = WW.pl(a, b).revenue; info.push([tc('share_rev'), f.P(rv ? Math.abs(v) / rv * 100 : 0)]); }
    if (pn && !pn.old){
      if (pn.path.length) info.push([t('pl.cd.path'), pn.path.map(z => chip('line:pl:' + z.id, D().plName(z))).join(' › ')]);
      const how = pn.kind === 'memo' ? 'pl.f.ot' : pn.part === 'fot' ? 'pl.f.fot' : (pn.part === 'tax' ? 'pl.f.tax' : (typeof pn.part === 'string' ? 'pl.f.taxk' : (/^sales\.|^crm/.test(pn.id.split('@')[0]) ? 'pl.f.sell' : (/^(salesFot|salesTax)/.test(pn.id) ? 'pl.f.staff' : (pn.kind === 'tot' ? 'pl.f.tot' : '')))));
      if (how) info.push([t('pl.cd.how'), esc(t(how, { y: WW.yOf(b), e: f.P(WW.R(b).employer * 100) }))]);
      const p0 = pn.plan(a, b); if (p0 != null && Math.abs(p0) >= 1){ info.push([tc('plan'), fmt(p0)], [tc('exec'), v * p0 > 0 ? f.P(v / p0 * 100) : dash]); }
    }
    if (grp === 'cf' && !['open', 'close', 'net', 'investing', 'financing', 'inCustomers'].includes(key)){ const inn = WW.cashflow(a, b).inCustomers; info.push([tc('share_in'), f.P(inn ? Math.abs(v) / inn * 100 : 0)]); }
    if (grp === 'pl'){ let pd = 0; for (let d = Math.max(0, a); d <= Math.min(b, WW.DAYS - 1); d++) pd += WW.totPosts(d); info.push([t('an.on_unit'), f.T(pd ? v / pd * 30.4 : 0)]); }   // на пост в месяц — по средним постам периода
    if (isBdr){ const p0 = D().planOf(bl[2], bl[3], bl[0], a, b); info.push([tc('plan'), fmt(p0)], [tc('exec'), f.P(p0 ? v / p0 * 100 : 0)]); }
    }
    blocks.push({ html: kv(info) });
    // по месяцам периода: сумма = строка
    const mrows = [];
    for (let mi = WW.monthIdx(a); mi <= WW.monthIdx(b); mi++){ const M0 = WW.MONTHS[mi], x = Math.max(a, M0.start), y = Math.min(b, M0.end); if (y < x) continue; mrows.push({ m: I.month(M0.m, 'long') + ' ' + M0.y + (x > M0.start || y < M0.end ? ` (${f.dts(x)}–${f.dts(y)})` : ''), v: stock ? fn(0, y) : fn(x, y), _k: mi }); }
    const msum = mrows.reduce((s, x) => s + x.v, 0), mok = !stock && Math.abs(msum - v) <= Math.max(1, Math.abs(v) * 1e-9);
    if (mrows.length > 1 || !stock) blocks.push({ h: tc('by_month'), html: tbl('ln-m-' + id, { rows: mrows, cols: [{ key: 'm', title: tc('month'), sort: false }, { key: 'v', title: name, kind: 'money', sum: mok ? 'sum' : 'none', share: mok, cum: mok && mrows.length > 1 }], search: false, csv: 'line_' + id.replace(':', '_') + '_months', pageSize: 24, sortable: false }) + (mok ? note('✓ ' + tc('sum_ok', { v: fmt(v) })) : '') });
    if (r.len <= 31 && (stock || grp === 'cf')){ const dr = []; for (let d = a; d <= b; d++) dr.push({ d, v: stock ? fn(0, d) : fn(d, d) }); blocks.push({ h: tc('by_day'), html: tbl('ln-d-' + id, { rows: dr, cols: [{ key: 'd', title: tc('day'), kind: 'date' }, { key: 'v', title: name, kind: 'money', sum: stock ? 'none' : 'sum' }], search: false, csv: 'line_' + id.replace(':', '_') + '_days', sortable: false }), tab: 'dyn' }); }
    // 12 месяцев
    const ms = months(b), ser = ms.map(x => stock ? fn(0, x.to) : fn(x.from, x.to));
    blocks.push({ h: tc('dyn12'), small: f.U(), html: stock ? K.ui.lines([{ n: name, v: ser.map(nm), c: 'var(--c1)' }], ms.map(x => x.label), { fmt: x => f.F(x, 0), h: 150 }) : K.ui.bars(ser.map((x, k) => nm(x) * sign), ms.map(x => x.label), { h: 150, fmt: x => f.F(x, 1), values: x => f.F(x, 0), color: 'var(--c1)', hollow: ms.map(x => x.partial), label: name }), tab: 'dyn' });
    // по объектам и регионам (выручка, охранники, прямые и накладные)
    const OK = { revenue: 'rev', guardC: 'guard', opex: 'direct' };
    if (grp === 'pl' && OK[key] || (isBdr && bl[0] === 1)){
    const k2 = isBdr ? 'rev' : OK[key], os = WW.objects.map(o => ({ o, v: WW.objView(o, a, b, b)[k2] })).filter(x => x.v);
    blocks.push({ h: tc('by_object'), html: tbl('ln-o-' + id, { rows: os.map(x => ({ n: w(x.o.name) + ' · ' + w(x.o.customer.name), reg: tx(x.o.region), v: x.v, _kind: 'object', _id: x.o.id })), cols: [{ key: 'n', title: tc('name') }, { key: 'reg', title: tc('cu.region'), lo: true }, { key: 'v', title: name, ...MS, share: true }], csv: 'line_' + key + '_objects', sort: { key: 'v', dir: 'desc' } }) + (key === 'revenue' || isBdr ? note('✓ ' + tc('sum_ok', { v: fmt(os.reduce((s, x) => s + x.v, 0)) })) : ''), tab: 'rel' });
    blocks.push({ h: tc('by_region'), html: tbl('ln-r-' + id, { rows: WW.REGIONS.map(rg => ({ n: tx(rg.r), v: os.filter(x => x.o.region === rg.r).reduce((s, x) => s + x.v, 0), _kind: 'region', _id: rg.r })), cols: [{ key: 'n', title: tc('name') }, { key: 'v', title: name, ...MS, share: true }], ...NB, sort: { key: 'v', dir: 'desc' } }), tab: 'rel' });
    }
    if (pn && !pn.old && pn.kids.length){ const kr = pn.kids.map(k => D().plNode(k)).filter(Boolean).map(z => ({ n: D().plName(z), v: z.fn(a, b), _kind: 'line', _id: 'pl:' + z.id })).filter(x => Math.abs(x.v) >= 0.5 || /finInc/.test(x._id));
      const ks = kr.reduce((s0, x) => s0 + x.v, 0); blocks.push({ h: t('pl.cd.kids'), html: tbl('ln-k-' + id, { rows: kr, cols: [{ key: 'n', title: tc('name') }, { key: 'v', title: name, ...MS, share: true }], csv: 'line_' + key.replace(/[.@]/g, '_') + '_children', search: kr.length > 12, sort: { key: 'v', dir: pn.sign === -1 ? 'asc' : 'desc' } }) + (Math.abs(ks - v) < 1 ? note('✓ ' + tc('sum_ok', { v: fmt(v) })) : '') }); }
    if (grp === 'pl' && key === 'opex') blocks.push({ h: tc('children'), html: tbl('ln-c-' + id, { rows: OPEX_CH.map(k => ({ n: tc('pl.' + k), v: WW.pl(a, b)[k], _kind: 'line', _id: 'pl:' + k })), cols: [{ key: 'n', title: tc('name') }, { key: 'v', title: name, ...MS, share: true }], ...NB }) });
    if (grp === 'tax' && key === 'total'){ const x = WW.taxes(a, b); blocks.push({ h: tc('by_tax'), html: tbl('ln-t-' + id, { rows: ['ipn', 'opv', 'vosms', 'so', 'oosms', 'opvr', 'sn', 'vat', 'cit', 'divIpn'].map(k => ({ n: tc('tax.' + k), v: x[k], _kind: 'line', _id: 'tax:' + k })), cols: [{ key: 'n', title: tc('name') }, { key: 'v', title: name, ...MS, share: true }], ...NB }) }); }
    return { title: `${name}`, sub: `${tc('line')} · ${tc('line.' + (isBdr ? 'bdr' : grp))}`, blocks, go: grp === 'tax' ? 'taxes' : (isBdr ? 'budget' : 'finance'), owner: 'Главный бухгалтер' };
  };

  // ---------- регион, канал ----------
  CARDS.region = (id) => {
    const WW = W(), rg = WW.REGIONS.find(x => x.r === id); if (!rg) return null;
    const list = WW.objects.filter(o => o.region === id && KR().scopeOk(o)); if (!list.length) return denied(tx(id), tc('denied_scope'));
    const r = R(), f = F(), a = r.from, b = r.to, at = r.anchor, mon = money(), ag = D().objAgg(a, b, list), act = list.filter(o => WW.active(o, at));
    const custs = WW.customers.filter(c => c.region === id && c.objects.some(KR().scopeOk)), inc = WW.incidents.filter(x => x.obj.region === id && KR().scopeOk(x.obj) && x.day >= a && x.day <= b);
    const ar = mon ? WW.receivables(at, c => c.region === id && KR().custFilter(c)) : null;
    const ms = months(b);
    return { title: tx(id), sub: tx(rg.city), badges: mon ? [[f.P(ag.margin), ag.margin < 0 ? 'bad' : (ag.margin < 10 ? 'warn' : 'good')]] : [],
    blocks: [{ html: kv([[tc('rg.city'), esc(tx(rg.city))], [tc('rg.objs'), `${f.N(act.length)} / ${f.N(act.reduce((s, o) => s + o.posts, 0))}`], mon ? [tc('rg.rev'), f.MU(ag.rev)] : null, mon ? [tc('rg.profit'), `${f.MU(ag.profit)} · ${f.P(ag.margin)}`] : null, mon ? [tc('rg.ar'), `${f.MU(ar.total)} · ${tc('cu.overdue').toLowerCase()} 30+ ${f.MU(ar.overdue30)}`] : null, [tc('obj.sh'), tc('obj.sh_v', { p: f.N(ag.plan), m: f.N(ag.missed), l: f.N(ag.late), o: f.P(ag.plan ? 100 - (ag.missed + ag.late) / ag.plan * 100 : 100) })], [tc('rg.inc'), f.N(inc.length)]]) },
      mon ? { h: tc('dyn12'), small: f.U(), html: K.ui.bars(ms.map(x => nm(D().objAgg(x.from, x.to, list).rev) * x.rate), ms.map(x => x.label), { h: 140, fmt: x => f.F(x, 1), values: x => f.F(x, 0), color: 'var(--c1)', hollow: ms.map(x => x.partial), label: tc('obj.revm') }), tab: 'dyn' } : null,
      { h: tc('rg.objects'), html: tbl('rg-o-' + id, { rows: list.map(o => { const v = WW.objView(o, a, b, b); return { n: w(o.name), c: w(o.customer.name), posts: WW.active(o, at) ? o.posts : 0, rev: v.rev, margin: v.margin, _kind: 'object', _id: o.id }; }), cols: [{ key: 'n', title: tc('name') }, { key: 'c', title: tc('obj.cust'), lo: true }, { key: 'posts', title: tc('obj.posts'), kind: 'int', sum: 'sum' }, ...(mon ? [{ key: 'rev', title: tc('obj.rev'), ...MS, share: true }, { key: 'margin', title: tc('obj.margin'), kind: 'pct', sum: { w: 'rev' }, cls: r0 => cls(r0.margin) }] : [])], csv: 'region_objects', sort: mon ? { key: 'rev', dir: 'desc' } : null }), tab: 'rel' },
      { h: tc('rg.custs'), html: tbl('rg-c-' + id, { rows: custs.map(c => ({ n: w(c.name), ch: tx(c.channel), rev: D().objAgg(a, b, c.objects.filter(KR().scopeOk)).rev, _kind: 'customer', _id: c.id })), cols: [{ key: 'n', title: tc('name') }, { key: 'ch', title: tc('cu.channel'), lo: true }, ...(mon ? [{ key: 'rev', title: tc('obj.rev'), ...MS, share: true }] : [])], csv: 'region_customers', sort: mon ? { key: 'rev', dir: 'desc' } : null }), tab: 'rel' },
      { h: t('an.ch.title'), html: A.chainHtml(A.chain('region', id, a, b, at)), tab: 'chain' }].filter(Boolean),
    go: 'objects', goRegion: id, owner: 'Начальник охраны' };
  };
  CARDS.channel = (id) => {
    const WW = W(), r = R(), f = F(), a = r.from, b = r.to, list = KR().filtered().filter(o => o.customer.channel === id), ag = D().objAgg(a, b, list), cs = [...new Set(list.filter(o => WW.active(o, b)).map(o => o.customer))];
    if (!money()) return denied(tx(id), tc('denied_money'));
    return { title: tx(id), sub: tc('by_channel'), blocks: [{ html: kv([[tc('ch.custs'), f.N(cs.length)], [tc('rg.rev'), f.MU(ag.rev)], [tc('obj.margin'), f.P(ag.margin)], [tc('ch.cac'), f.T(WW.CAC[id] || 0)]]) },
    { h: tc('top_customers'), html: tbl('ch-' + id, { rows: cs.map(c => ({ n: w(c.name), rev: D().objAgg(a, b, c.objects.filter(KR().objFilter)).rev, _kind: 'customer', _id: c.id })), cols: [{ key: 'n', title: tc('name') }, { key: 'rev', title: tc('obj.rev'), ...MS, share: true }], csv: 'channel_customers', sort: { key: 'rev', dir: 'desc' } }) }], go: 'sales' };
  };
  // ---------- склад, поставщик ----------
  CARDS.stock = (id) => {
    const x = K.CAT.stock[+id]; if (!x) return null; const f = F(), lowP = x.stock < x.min ? (1 - x.stock / x.min) * 100 : 0, perM = x.issued / 12;
    return { title: tx(x.item), badges: lowP ? [[tc('st.low', { p: f.P(lowP) }), lowP > 30 ? 'bad' : 'warn']] : [], blocks: [{ html: kv([[tc('st.unit'), esc(x.unit)], [tc('st.stock'), f.N(x.stock)], [tc('st.min'), f.N(x.min)], [tc('st.issued'), f.N(x.issued)], [tc('st.cover'), f.F(perM ? x.stock / perM : 0)], [tc('st.price'), f.T(x.price)], [tc('st.cost'), f.T(x.price * x.stock)]]) }], go: 'supply', owner: 'Снабженец' };
  };
  CARDS.supplier = (id) => {
    const x = K.CAT.suppliers[+id]; if (!x) return null; const f = F(), tot = K.CAT.suppliers.reduce((s, y) => s + y.debt, 0);
    return { title: x.name, sub: tx(x.cat), blocks: [{ html: kv([[tc('su.cat'), esc(tx(x.cat))], [tc('su.orders'), f.N(x.orders)], [tc('su.rating'), '★'.repeat(Math.round(x.rating)) + ' ' + f.F(x.rating)], money() ? [tc('su.debt'), f.T(x.debt)] : null, money() ? [tc('su.share'), f.P(tot ? x.debt / tot * 100 : 0)] : null]) }], go: 'supply', owner: 'Снабженец' };
  };
  // ---------- подключение, ключ ЭЦП, чат, поручение ----------
  CARDS.conn = (id) => {
    const at = R().anchor, x = (D().connRegistry(at) || [])[+id]; if (!x) return null;
    return { title: x[0], sub: x[1], badges: [[x[6] ? `${tc('cn.err')}: ${x[6]}` : 'OK', x[6] ? 'bad' : 'good']], blocks: [{ html: kv([[tc('cn.what'), esc(x[1])], [tc('cn.dir'), esc(x[2])], [tc('cn.freq'), esc(x[3])], [tc('cn.last'), esc(x[4])], [tc('status'), esc(x[5])], [tc('cn.err'), String(x[6])], [tc('cn.who'), esc(x[7])], [tc('cn.access'), esc(x[8])]]) + note(tc('cn.rule')) }], go: 'admin-conn', owner: 'Администратор системы' };
  };
  CARDS.ecp = (id) => {
    const at = R().anchor, k = (D().ecpAt(at) || [])[+id]; if (!k) return null; const f = F(), left = k.to - at;
    return { title: k.who, sub: k.kind, badges: [[left < 0 ? tc('overdue') : tc('ec.left', { n: f.N(left) }), left < 0 ? 'bad' : (left <= 30 ? 'warn' : 'good')]], blocks: [{ html: kv([[tc('ec.kind'), esc(k.kind)], [tc('ec.media'), esc(k.media)], [tc('ec.to'), f.dt(k.to)], [tc('ec.use'), esc(k.use)]]) + note(tc('cn.rule')) }], go: 'admin-conn', owner: 'Администратор системы' };
  };
  CARDS.chat = (id) => {
    const at = R().anchor, c = (D().myChats(role(), at) || []).find(x => x.name === id || x.id === id); if (!c) return denied(id, tc('denied_scope'));
    return { title: c.name, sub: c.who, badges: c.unread ? [[tc('chat.unread') + ' ' + c.unread, 'info']] : [], blocks: [{ html: kv([[tc('chat.who'), esc(c.who)], [tc('chat.n'), F().N(c.n)]]) }, { h: tc('chat.last'), html: `<ul class="ul">${c.msgs.slice(-6).map(m => `<li><b>${esc(m[0])}</b> ${esc(m[1])}: ${esc(m[2])}</li>`).join('') || '<li>—</li>'}</ul>` }], go: 'chats' };
  };
  CARDS.errand = (id) => {
    const at = R().anchor; if (at < W().LAUNCH_DEMO) return { title: id, blocks: [{ html: note(tc('ai_since', { d: F().dt(W().LAUNCH_DEMO) })) }] };
    const e = D().errandsAt(at).find(x => x.no === id) || (window.LIVE && window.LIVE.errands || []).find(x => x.no === id); if (!e) return null;
    const mine = e.who === role().name || ['ed', 'gd', 'adm', 'owner'].includes(role().id); if (!mine) return denied(id, tc('denied_scope'));
    return { title: `${e.no} · ${esc(e.task || e.q || '')}`, badges: [[tx(e.st), e.st === 'выполнено' ? 'good' : (e.st === 'отклонено по правам' ? 'bad' : 'info')]], blocks: [{ html: kv([[tc('er.when'), e.day != null ? `${F().dt(e.day)} ${e.time || ''}` : (e.ts ? F().tOf(e.ts) : dash)], [tc('er.who'), esc(F().rn(e.who || e.role || ''))], [tc('er.task'), esc(e.task || e.q || '')], [tc('er.step'), String(e.step || 1)], [tc('er.res'), esc(e.file || e.a || dash)], [tc('er.mins'), String(e.mins || dash)]]) }], go: 'ai' };
  };
  CARDS.act = (id) => {
    if (!money()) return denied(id, tc('denied_money'));
    const [cid, mo] = id.split(':'), c = byId(W().customers, cid); if (!c) return null; const a = W().acts.find(x => x.cust === c && String(x.month) === mo); if (!a) return null; const f = F(), at = R().anchor;
    return { title: `${tc('act')} № ${c.id}-${a.month} · ${w(c.name)}`, sub: f.dt(a.actDay), badges: [[a.pay <= at ? tc('paid') + ' ' + f.dts(a.pay) : tc('not_paid'), a.pay <= at ? 'good' : (at > a.due ? 'bad' : 'info')]],
    blocks: [{ html: kv([[tc('date'), f.dt(a.actDay)], [tc('amount_vat'), f.MU(a.amount)], [tc('due_date'), f.dt(a.due)], [tc('paid'), a.pay <= at ? f.dt(a.pay) : tc('not_paid')], [tc('late_days'), f.N(a.pay <= at ? Math.max(0, a.pay - a.due) : Math.max(0, at - a.due))], [tc('source'), tc('doc_1c')]]) }], related: [{ card: 'customer:' + c.id, label: w(c.name) }], go: 'sales' };
  };

  // ---------- документы-основания ----------
  function actsRows(filter, a, b, at){ return W().acts.filter(x => x.month >= 0 && x.actDay >= a && x.actDay <= b && filter(x.cust)).map(x => ({ no: `${x.cust.id}-${x.month}`, d: x.actDay, c: w(x.cust.name), amt: x.amount, pay: x.pay <= at ? x.pay : null, _kind: 'act', _id: `${x.cust.id}:${x.month}`, _cls: x.pay > at && at > x.due + 30 ? 'an-bad' : '' })); }
  const actsCols = () => [{ key: 'no', title: tc('act_no') }, { key: 'd', title: tc('date'), kind: 'date' }, { key: 'c', title: tc('obj.cust') }, { key: 'amt', title: tc('amount_vat'), ...MS, share: true }, { key: 'pay', title: tc('paid'), kind: 'date', fmt: x => x == null ? `<span class="dn">${tc('not_paid')}</span>` : F().dt(x) }];
  CARDS.docs = (id, ctx) => {
    const i = id.indexOf(':'), kind = id.slice(0, i), rid = id.slice(i + 1), r = R(), f = F(), a = r.from, b = r.to, at = r.anchor, WW = W(), blocks = [];
    const ttl = tc('docs_for', { t: ctx.title || rid });
    const monthsIn = () => { const out = []; for (let mi = WW.monthIdx(a); mi <= WW.monthIdx(b); mi++) out.push(WW.MONTHS[mi]); return out; };
    if (kind === 'object' || kind === 'customer' || kind === 'region' || (kind === 'line' && /^(pl:revenue(\.[\w.]+)?|cf:inCustomers|bs:ar|bdr:1)$/.test(rid)) || (kind === 'kpi' && /^(revenue|revenue_co|ar|inflow)$/.test(rid))){
    if (!money()) return denied(ttl, tc('denied_money'));
    const pm = kind === 'line' ? /^pl:revenue\.(\w+)(?:\.r(\d+))?(?:\.o(\d+))?$/.exec(rid) : null;   // строка выручки ОПиУ: вид постов → регион → объект
    const o = kind === 'object' ? byId(WW.objects, rid) : (pm && pm[3] ? byId(WW.objects, pm[3]) : null), c = kind === 'customer' ? byId(WW.customers, rid) : (o ? o.customer : null);
    const pmReg = pm && pm[2] != null && !pm[3] ? WW.REGIONS[+pm[2]].r : null;
    const flt = c ? (x => x === c) : (kind === 'region' ? (x => x.region === rid) : (pmReg ? (x => x.region === pmReg) : KR().custFilter));
    const lo = Math.max(0, a - (kind === 'object' || kind === 'customer' ? 365 : 0)), rows = actsRows(flt, lo, Math.max(b, a), at);
    if (o) rows.forEach(x => { const M0 = WW.MONTHS[+x._id.split(':')[1]]; x.share = M0 ? WW.sumO(o, 'rev', M0.start, M0.end) * (1 + WW.RATES[M0.y].vat) : 0; });
    blocks.push({ h: tc('act') + ' · ' + tc('doc_1c'), html: tbl('docs-acts-' + id, { rows: rows.reverse(), cols: [...actsCols(), ...(o ? [{ key: 'share', title: tc('obj_share'), ...MS }] : [])], csv: 'acts' }) });
    }
    if (kind === 'object'){ const o = byId(WW.objects, rid); if (o){ const ords = D().docflowAt(at).orders.filter(x => x.obj === o); if (ords.length) blocks.push({ h: tc('order_doc'), html: tbl('docs-ord-' + id, { rows: ords.map(x => ({ no: x.no, d: x.day, n: tx(x.title), _kind: 'order', _id: x.no })), cols: [{ key: 'no', title: '№' }, { key: 'd', title: tc('date'), kind: 'date' }, { key: 'n', title: tc('name') }], ...NB }) }); } }
    if ((kind === 'line' && /^(pl:guardC|pl:adminC|pl:(guard|admin|sales)(Fot|Tax)[\w.@]*|cf:salaries|bdr:2|bdr:3|bdr:10|bdr:6[1-3])$/.test(rid))){ blocks.push({ h: tc('payroll_doc', { m: '' }).trim(), html: tbl('docs-sal-' + id, { rows: monthsIn().map(M0 => ({ n: tc('payroll_doc', { m: I.month(M0.m, 'long') + ' ' + M0.y }), d: M0.end + 5, v: -WW.cashflow(M0.end + 1, Math.min(M0.end + 10, WW.DAYS - 1)).salaries })), cols: [{ key: 'n', title: tc('name') }, { key: 'd', title: tc('date'), kind: 'date' }, { key: 'v', title: tc('sum'), ...MS }], search: false, csv: 'payroll' }) }); }
    if ((kind === 'line' && /^tax:|^cf:(payrollTaxes|vat|cit)$|^pl:(guardTax|adminTax|salesTax|cit)/.test(rid)) || (kind === 'kpi' && /^tax_/.test(rid))){ blocks.push({ h: tc('tax_doc', { m: '' }).trim(), html: tbl('docs-tax-' + id, { rows: monthsIn().map(M0 => { const x = WW.taxes(M0.start, Math.min(M0.end, b)); return { n: tc('tax_doc', { m: I.month(M0.m, 'long') + ' ' + M0.y }), d: M0.end + 25, v: x.total, ipn: x.ipn, vat: x.vat }; }), cols: [{ key: 'n', title: tc('name') }, { key: 'd', title: tc('due_date'), kind: 'date' }, { key: 'ipn', title: tc('tax.ipn'), ...MS, lo: true }, { key: 'vat', title: tc('tax.vat'), ...MS, lo: true }, { key: 'v', title: tc('sum'), ...MS }], search: false, csv: 'taxes' }) }); }
    if ((kind === 'line' && /^(cf:suppliers|pl:opex|pl:(uniform|transport|comms|office|other|it|crm|sales\.\w+)(@\d+)?|bdr:([4-9]|1[0-2]))$/.test(rid)) || kind === 'car' || (kind === 'kpi' && /^(ap|fleet_cost)$/.test(rid))){ if (finRole()){ const ps = [...(D().livePays() || []), ...(D().payReqs(at) || [])]; blocks.push({ h: tc('pay_doc'), html: tbl('docs-pay-' + id, { rows: ps.map(p => ({ no: p.no, d: p.day, to: p.to, line: tx(p.line), amt: p.amount, st: tx(p.st), _kind: 'pay', _id: p.live ? 'L' + p.id : p.no })), cols: [{ key: 'no', title: '№' }, { key: 'd', title: tc('date'), kind: 'date' }, { key: 'to', title: tc('py.to') }, { key: 'line', title: tc('py.line'), lo: true }, { key: 'amt', title: tc('sum'), ...MS, share: true }, { key: 'st', title: tc('status'), lo: true }], csv: 'pay_requests' }) }); } }
    if (kind === 'incident' || kind === 'check' || kind === 'presc'){ const x = kind === 'incident' ? WW.incidents[+rid] : WW.checks[+rid]; if (x) blocks.push({ h: tc('docs'), html: kv([[tc('date'), f.dt(x.day)], [tc('in.obj'), chip('object:' + x.obj.id, w(x.obj.name))], [tc('source'), esc(t('an.src.journal'))]]) + note(tc('docs_none')) }); }
    if (kind === 'order' || kind === 'memo' || kind === 'pay' || kind === 'act'){ blocks.push({ html: note(tc('docs_none')) + `<div class="cd-rel">${chip(kind + ':' + rid, ctx.title || rid)}</div>` }); }
    if (!blocks.length) blocks.push({ html: note(tc('docs_none')) + (D().docflowAt(at).orders.slice(0, 1).length ? '' : '') });
    return { title: ttl, sub: tc('docs'), blocks, go: null };
  };

  // ---------- стили ----------
  const CSS_TEXT = `
.cd{display:flex;flex-direction:column;gap:var(--s3)}
.cd-head{display:flex;flex-wrap:wrap;align-items:center;gap:var(--s2);justify-content:space-between}
.cd-sub{margin:0;font-size:var(--fs-2);color:var(--fg-3);overflow-wrap:anywhere}
.cd-badges{display:flex;flex-wrap:wrap;gap:var(--s1)}
.cd-tabs{display:flex;gap:var(--s1);border-bottom:1px solid var(--line);overflow-x:auto;position:sticky;top:44px;background:var(--surface);z-index:2}
.cd-tab{border:0;background:transparent;padding:var(--s2) var(--s3);font-weight:700;font-size:var(--fs-3);color:var(--fg-3);cursor:pointer;white-space:nowrap;box-shadow:inset 0 -2px 0 transparent;min-height:36px}
.cd-tab.on{color:var(--fg);box-shadow:inset 0 -2px 0 var(--accent)}.cd-tab:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.cd-b{min-width:0}.cd-b h3{font-size:var(--fs-4);font-weight:800;margin:0 0 var(--s2)}.cd-b h3 small{font-weight:600;color:var(--fg-3);font-size:var(--fs-2)}
.cd-kv{margin:0}.cd-kv dd{overflow-wrap:anywhere}
.cd-hero{display:flex;flex-wrap:wrap;align-items:baseline;gap:var(--s3);margin-bottom:var(--s2)}
.cd-hv{font-size:var(--fs-8);font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums lining-nums;line-height:1.1}.cd-hl{font-size:var(--fs-3);color:var(--fg-3)}
.cd-posts{display:flex;flex-wrap:wrap;gap:var(--s1);margin-top:var(--s2)}
.cd-post{font-size:var(--fs-2);font-weight:700;border-radius:var(--r-sm);padding:2px var(--s2)}.cd-post.good{background:var(--good-soft);color:var(--good-text)}.cd-post.bad{background:var(--bad-soft);color:var(--bad-text)}
.cd-rel{display:flex;flex-wrap:wrap;align-items:center;gap:var(--s1) var(--s2);font-size:var(--fs-2);color:var(--fg-3)}
.cd-chip{border:1px solid var(--line-2);background:var(--surface-2);color:var(--fg);border-radius:var(--r-pill);padding:2px var(--s3);font-size:var(--fs-2);font-weight:700;cursor:pointer;min-height:28px}
.cd-chip:hover{border-color:var(--accent)}.cd-chip:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.cd-act{border-top:1px solid var(--line);padding-top:var(--s3)}
.cd-tiles{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
.tile.lnkt{position:relative}.cd-i{position:absolute;top:var(--s1);right:var(--s1);border:0;background:transparent;color:inherit;opacity:.7;font-size:var(--fs-4);line-height:1;min-width:28px;min-height:28px;border-radius:var(--r-pill);cursor:pointer}
.cd-i:hover,.cd-i:focus-visible{opacity:1;background:var(--surface-3);outline:2px solid var(--accent);outline-offset:0}.tile.dark .cd-i:hover{background:transparent}
@media (max-width:860px){.cd-tabs{top:58px}.cd-tab{min-height:44px}.cd-chip{min-height:40px}.cd-i{min-width:40px;min-height:40px}.cd-hv{font-size:var(--fs-7)}.cd .kv{grid-template-columns:1fr;gap:2px 0}.cd .kv dd{margin-bottom:var(--s2)}}
@media print{.cd-tabs,.cd-act,.cd-i{display:none!important}.cd-b[hidden]{display:block!important}}
`;

  const M = {
    name: 'cards', version: '0.8.0',
    ready: false,
    init(k){
    K = k; M.K = k; A = window.Analytics;
    if (!A){ console.error('cards: analytics.js is required'); return; }
    k.ui.css('cards', CSS_TEXT);
    const mb = document.getElementById('modalBody'); if (mb) bind(mb);
    M.ready = true;
    },
    openCard, wire, CARDS, register: (kind, fn) => { CARDS[kind] = fn; },
  };
  (window.SUNKAR_MODULES = window.SUNKAR_MODULES || []).push(M);
  window.Cards = M;
})();
