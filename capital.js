// SUNKAR BI · capital.js — модуль «capital» (шаг 2E, пункт 6 / ТЗ 3.6): вкладка «Капитал» раздела «Финансы» (#finance-eq), карточки eq:*, коэффициенты.
// Все цифры — из книги проводок world.js: W.balance(i) (капитал = уставный + резервный + нераспределённая прибыль), W.equityChanges(from, to)
// (отчёт об изменениях капитала), W.reserveLog (отчисления в резерв 31.12), W.accBal / W.accTurn (сальдо и обороты счетов), W.pl, W.cashflow.
// Остатки — на конец среза (RNG.to, как вкладка «Баланс»), обороты — за срез RNG.from–RNG.to. Права: роли с доступом к «Финансам»; учредитель и ГД — всегда.
(function(){
  'use strict';
  let K = null;
  const L = (k, v) => I18N.t('eq.' + k, v);
  const pre = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.startsWith('nav.') ? k : 'eq.' + k, v]));

  // ======================= словарь =======================
  I18N.add('ru', pre({
    'nav.finance': 'Финансы: ОПиУ, ДДС, баланс, капитал',
    tab_main: 'ОПиУ · ДДС · Баланс', tab: 'Капитал', h1: 'Финансы',
    sub: 'капитал · из книги проводок · по компании · остатки на {d}, движение за {p}',
    t_equity: 'Собственный капитал', t_equity_d: '{a} за период · {b} к году назад', t_equity_d0: '{a} за период · год назад — нет данных',
    t_na: 'Чистые активы', t_na_d: 'активы − обязательства · {k} × уставного капитала', t_na_low: 'ниже уставного капитала — нужно решение участников (закон РК о ТОО)',
    t_re: 'Нераспределённая прибыль', t_re_d: 'на 01.01 {a} · прибыль с начала года {b}',
    t_div: 'Дивиденды за период', t_div_d: 'за 12 мес. {a} · {p} чистой прибыли 12 мес.',
    t_roe: 'ROE · 12 месяцев', t_roe_d: 'чистая прибыль 12 мес. ÷ капитал; высокий, т. к. {p} прибыли выплачено дивидендами', t_roe_d2: 'чистая прибыль 12 мес. ÷ капитал на дату',
    t_aut: 'Автономия', t_aut_d: 'капитал ÷ активы · норма ≥ 50 %',
    st_title: 'Отчёт об изменениях капитала', st_small: '{p} · МСФО (IAS 1)',
    c_row: 'Показатель', c_charter: 'Уставный капитал', c_reserve: 'Резервный капитал', c_re: 'Нераспределённая прибыль', c_total: 'Итого', c_prev: 'Прошлый период, итого', c_yago: 'Год назад, итого',
    r_open: 'Остаток на начало · {d}', r_open0: 'Входящие остатки · 01.01.2022', r_profit: 'Чистая прибыль периода', r_div: 'Дивиденды начисленные и выплаченные', r_res: 'Отчисления в резервный капитал',
    r_charter: 'Изменение уставного капитала', r_other: 'Прочие изменения', r_close: 'Остаток на конец · {d}',
    st_check: 'на конец = «Итого капитал» баланса на {d}', st_profit: 'прибыль = «Чистая прибыль» ОПиУ', st_divcf: 'дивиденды = ДДС «Дивиденды на руки» + ИПН у источника', st_note: 'дивиденды начисляются и выплачиваются в один день; резерв — 31.12 из прибыли года',
    ok: 'сходится', bad: 'расхождение', diff: 'разница {v} ₸',
    bs_title: 'Активы − обязательства = капитал', bs_small: 'на {d} · сверка с вкладкой «Баланс»',
    c_assets: 'Активы', c_liab: 'Обязательства', c_sum: 'Сумма, {u}', c_share: 'Доля', c_short: 'Краткосрочные', c_long: 'Долгосрочные',
    a_cash: 'Деньги', a_ar: 'Дебиторка заказчиков (с НДС)', a_inv: 'Запасы склада', a_faNet: 'Основные средства, нетто',
    l_divtax: 'ИПН с дивидендов к уплате', l_vacres: 'Резерв отпусков (IAS 19)', acc_divtax: 'ИПН с дивидендов (налоговый агент)', acc_vacres: 'Оценочное обязательство по отпускам', cf_interestIn: 'Проценты полученные', cf_interestPaid: 'Лизинг — проценты уплаченные', cf_divTax: 'ИПН с дивидендов', fc_min: 'Минимум прогноза 13 недель', cap_res: 'Резерв', div_net: 'Выплачено на руки', div_tax: 'ИПН удержан у источника ({p}, уплата {d})', l_ap: 'Поставщики', l_salpay: 'Зарплата к выплате', l_paytax: 'Налоги и взносы по зарплате', l_vat: 'НДС к уплате (квартал)', l_citpay: 'КПН к уплате', l_leasing: 'Лизинг',
    tot_assets: 'Итого активы', tot_liab: 'Итого обязательства',
    eq_assets: 'Активы', eq_liab: 'Обязательства', eq_na: 'Чистые активы', eq_cap: 'Капитал по балансу', eq_cap_d: 'уставный {a} + резервный {b} + нераспределённая {c}', eq_rec: 'Сверка',
    yr_title: 'Капитал и дивиденды по годам', yr_small: 'капитал на конец года (* — на {d}) · прибыль и дивиденды за год',
    yr_bars: 'капитал на конец года', yr_net: 'чистая прибыль за год', yr_div: 'дивиденды за год',
    c_year: 'Год', c_eq_open: 'Капитал на начало', c_net: 'Чистая прибыль', c_divs: 'Дивиденды', c_payout: 'Доля выплат', c_tores: 'В резерв', c_eq_close: 'Капитал на конец', yr_to: 'по {d}',
    m_title: 'Капитал, активы и обязательства · 12 месяцев', m_small: '{u} · на конец каждого месяца (текущий — на {d})', m_eq: 'капитал = чистые активы', m_as: 'активы', m_li: 'обязательства',
    dv_title: 'Дивидендная история', dv_small: 'выплаты по {d} · из книги проводок и реестра решений',
    c_date: 'Дата', c_amount: 'Сумма, {u}', c_pyear: '% чистой прибыли года', c_cash_after: 'Деньги после выплаты, {u}', c_eq_after: 'Капитал после выплаты, {u}', c_decision: 'Решение',
    c_divtax: 'ИПН у источника, {u}', c_divrate: 'Ставка ИПН', dv_law: 'ИПН с дивидендов — по закону года нарастающим итогом за год: 2022 — 5 %, 2023–2025 — 10 % сверх 30 000 МРП, 2026 — 5 % до 230 000 МРП ({cap}) и 15 % сверх · начислено в {y} — {v}', 
    dv_total: 'Итого выплачено', dv_none: 'Выплат дивидендов по {d} не было.', dv_dec: '{w} · {d}', dv_nodec: 'решение учредителя (до ведения реестра)',
    k_title: 'Коэффициенты', k_small: 'на {d} · 12 месяцев по {d}',
    k_aut: 'Автономия', k_aut_d: 'капитал ÷ активы · норма ≥ 50 %',
    k_na: 'Чистые активы ÷ уставный капитал', k_na_d: 'норма ≥ 1 (закон РК о ТОО)',
    k_liq: 'Текущая ликвидность', k_liq_d: '(деньги + дебиторка) ÷ краткосрочные обязательства (с резервом отпусков и текущей частью лизинга) · норма ≥ 1,2',
    k_roe: 'ROE за 12 месяцев', k_roe_d: 'чистая прибыль 12 мес. ÷ капитал на дату',
    k_roa: 'ROA за 12 месяцев', k_roa_d: 'чистая прибыль 12 мес. ÷ активы на дату',
    k_reinv: 'Коэффициент реинвестирования', k_reinv_d: '(прибыль − дивиденды) ÷ прибыль, 12 мес.',
    k_de: 'Долг / капитал', k_de_d: 'лизинг ÷ капитал · все обязательства ÷ капитал — {v}',
    k_debt: 'Долг / EBITDA', k_debt_d: 'только лизинг авто · кредитов нет',
    k_dso: 'Оборачиваемость дебиторки', k_dso_d: 'дебиторка ÷ выручка с НДС (по ставке каждого дня) в день за 12 мес.', days: '{n} дн.',
    k_cap: 'Дивидендная способность', k_cap_d: 'минимум прогноза денег на 13 недель (с утверждёнными выплатами) − резерв 30 млн ₸',
    k_short: 'данных с 01.01.2022: {n} дн.',
    ab_title: 'О расчёте капитала', ab_small: 'формулы и правила',
    ab_1: 'Капитал = уставный капитал + резервный капитал + нераспределённая прибыль. Чистые активы = активы − обязательства; по двойной записи они равны капиталу на любую дату.',
    ab_2: 'Резервный капитал — по уставу Агентства (закон РК для ТОО его не требует): 31.12 каждого года проводка Дт «Нераспределённая прибыль» Кт «Резервный капитал» на 5 % чистой прибыли года, пока резерв не достигнет 15 % уставного капитала. Итог капитала проводка не меняет.',
    ab_3: 'Отчёт об изменениях капитала: остаток на начало + чистая прибыль − дивиденды ± отчисления в резерв ± изменение уставного капитала = остаток на конец; итог сверяется с балансом с точностью 1 ₸.',
    ab_4: 'Если чистые активы по итогам года меньше уставного капитала, законодательство РК о ТОО требует решения участников (уменьшение уставного капитала) — плитка «Чистые активы» становится красной. Подтверждает юрист.',
    ab_5: 'Высокий ROE — следствие дивидендной политики: большая часть прибыли выплачивается, капитал остаётся небольшим относительно прибыли. Поэтому рядом показаны ROA и коэффициент реинвестирования.',
    rs_title: 'Отчисления в резервный капитал', c_profit_y: 'Чистая прибыль года', c_rate: '5 % прибыли', c_room: 'Остаток лимита 15 %', c_booked: 'Начислено 31.12', c_res_after: 'Резерв после',
    rs_none: 'Первое отчисление — 31.12.2022; на {d} резерв равен нулю.',
    // карточки
    cd_ctx: 'Финансы · Капитал', on: 'На {d}', on_start: 'На начало периода ({d})', chg: 'Изменение за период', share_a: 'Доля в активах', share_l: 'Доля в обязательствах',
    acc: 'Счёт книги проводок', acc_cash: 'Деньги (касса и банк)', acc_ar: 'Расчёты с заказчиками', acc_inv: 'Запасы', acc_fa: 'Основные средства − накопленная амортизация', acc_ap: 'Расчёты с поставщиками', acc_salpay: 'Расчёты по оплате труда',
    acc_paytax: 'Налоги и взносы с ФОТ', acc_vat: 'НДС', acc_citpay: 'КПН', acc_leasing: 'Обязательства по лизингу', acc_charter: 'Уставный капитал', acc_reserve: 'Резервный капитал', acc_re: 'Нераспределённая прибыль', acc_div: 'Дивиденды (уменьшение капитала)',
    months: 'По месяцам', c_month: 'Месяц', c_bal_end: 'Остаток на конец, {u}', c_chg: 'Изменение, {u}',
    cf_title: 'ДДС за период', top_ar: 'Крупнейшие должники на {d}', c_cust: 'Заказчик', c_debt: 'Долг, {u}', c_overdue: 'Просрочено, {u}', unbilled: 'Начислено без акта',
    fa_gross: 'Первоначальная стоимость', fa_dep: 'Накопленная амортизация', fa_capex: 'Покупки ОС и лизинг', fa_leasing_in: 'Лизинг: поступление автомобилей ГБР',
    ls_rate: 'Ставка лизинга', ls_pay: 'Платёж в месяц (12-го числа)', ls_long: 'Долгосрочная часть = остаток − основной долг по графику ближайших 12 платежей', ls_short: 'Текущая часть (основной долг 12 платежей + начисленные проценты)',
    next_pay: 'Ближайшее погашение', pay_sal: '{d}: зарплата {v}', pay_tax: '{d}: налоги и взносы {a}, НДС {b}, аванс КПН {c}', pay_ap: '15-го числа за прошлый месяц', inv_note: 'по данным склада; движение — в разделе «Склад»',
    postings: 'Проводки', c_dt: 'Дебет', c_kt: 'Кредит', post_profit: 'Закрытие прибыли периода: счета ОПиУ → нераспределённая прибыль',
    pl_rev: 'Выручка', pl_ebitda: 'EBITDA', pl_dep: 'Амортизация', pl_int: 'Проценты по лизингу', pl_cit: 'КПН', pl_net: 'Чистая прибыль',
    c_net_m: 'Чистая прибыль, {u}', charter_note: 'Уставный капитал зарегистрирован до начала истории (входящий остаток 01.01.2022); изменений в 2022–2026 нет.', other_note: 'Прочих движений капитала нет: каждая операция в книге — прибыль, дивиденды, резерв или уставный капитал.',
    rule: 'Правило', rule_res: '5 % чистой прибыли года, пока резерв < 15 % уставного капитала ({v})', limit: 'Лимит резерва (15 % уставного)',
    composition: 'Состав капитала', check_bs: 'Сверка с балансом', eq_formula: 'Формула', na_formula: 'активы − обязательства',
    div_12: 'Дивиденды за 12 мес.', net_12: 'Чистая прибыль за 12 мес.', payout: 'Доля выплат', eq_avg: 'Средний капитал за 12 мес.', roe_avg: 'ROE на средний капитал',
    cash_before: 'Деньги до выплаты', cash_after: 'Деньги после выплаты', eq_before: 'Капитал до выплаты', eq_after: 'Капитал после выплаты', decision: 'Решение', year_profit: 'Чистая прибыль года', share_profit: 'Доля от прибыли года',
    inputs: 'Исходные данные', norm: 'Норма', st_year: 'Капитал за {y} год', yr_open: 'Капитал на 01.01', yr_close: 'Капитал на {d}',
    cf_inCustomers: 'Поступления от заказчиков', cf_salaries: 'Зарплата на руки', cf_payrollTaxes: 'Налоги и взносы по зарплате', cf_vat: 'НДС', cf_cit: 'КПН', cf_suppliers: 'Поставщики и прочие', cf_capex: 'Покупка ОС', cf_leasingPay: 'Лизинг — основной долг', cf_dividends: 'Дивиденды на руки', cf_net: 'Чистый поток', norm_aut: '≥ 50 %',
    st_short: 'краткосрочные обязательства (с текущей частью лизинга и резервом отпусков)', ebitda_12: 'EBITDA за 12 мес.', rev_12: 'Выручка с НДС в день, 12 мес.', upcoming: 'Ближайшие зарплата и налоги',
  }));
  I18N.add('en', pre({
    'nav.finance': 'Finance: P&L, cash flow, balance, equity',
    tab_main: 'P&L · Cash flow · Balance', tab: 'Equity', h1: 'Finance',
    sub: 'equity · from the ledger · company-wide · balances on {d}, movements for {p}',
    t_equity: 'Equity', t_equity_d: '{a} for the period · {b} vs a year ago', t_equity_d0: '{a} for the period · no data a year ago',
    t_na: 'Net assets', t_na_d: 'assets − liabilities · {k} × charter capital', t_na_low: 'below charter capital — members’ decision required (RK LLP law)',
    t_re: 'Retained earnings', t_re_d: 'on 1 Jan {a} · profit YTD {b}',
    t_div: 'Dividends for the period', t_div_d: '12 mo. {a} · {p} of 12-mo. net profit',
    t_roe: 'ROE · 12 months', t_roe_d: '12-mo. net profit ÷ equity; high because {p} of profit was paid out', t_roe_d2: '12-mo. net profit ÷ equity at date',
    t_aut: 'Equity ratio', t_aut_d: 'equity ÷ assets · norm ≥ 50%',
    st_title: 'Statement of changes in equity', st_small: '{p} · IFRS (IAS 1)',
    c_row: 'Line', c_charter: 'Charter capital', c_reserve: 'Reserve capital', c_re: 'Retained earnings', c_total: 'Total', c_prev: 'Previous period, total', c_yago: 'Year ago, total',
    r_open: 'Opening balance · {d}', r_open0: 'Opening balances · 1 Jan 2022', r_profit: 'Net profit for the period', r_div: 'Dividends declared and paid', r_res: 'Transfer to reserve capital',
    r_charter: 'Change in charter capital', r_other: 'Other changes', r_close: 'Closing balance · {d}',
    st_check: 'closing = balance sheet “Total equity” on {d}', st_profit: 'profit = P&L “Net profit”', st_divcf: 'dividends = cash flow “Dividends (net)” + IIT withheld at source', st_note: 'dividends are declared and paid on the same day; reserve — on 31 Dec from the year’s profit',
    ok: 'reconciled', bad: 'mismatch', diff: 'difference ₸{v}',
    bs_title: 'Assets − liabilities = equity', bs_small: 'on {d} · reconciled with the Balance tab',
    c_assets: 'Assets', c_liab: 'Liabilities', c_sum: 'Amount, {u}', c_share: 'Share', c_short: 'Current', c_long: 'Non-current',
    a_cash: 'Cash', a_ar: 'Customer receivables (incl. VAT)', a_inv: 'Inventory', a_faNet: 'Fixed assets, net',
    l_divtax: 'IIT on dividends payable', l_vacres: 'Vacation reserve (IAS 19)', acc_divtax: 'IIT on dividends (tax agent)', acc_vacres: 'Vacation provision', cf_interestIn: 'Interest received', cf_interestPaid: 'Leasing — interest paid', cf_divTax: 'IIT on dividends', fc_min: '13-week forecast minimum', cap_res: 'Buffer', div_net: 'Paid out (net)', div_tax: 'IIT withheld at source ({p}, paid {d})', l_ap: 'Suppliers', l_salpay: 'Salaries payable', l_paytax: 'Payroll taxes and contributions', l_vat: 'VAT payable (quarter)', l_citpay: 'CIT payable', l_leasing: 'Leasing',
    tot_assets: 'Total assets', tot_liab: 'Total liabilities',
    eq_assets: 'Assets', eq_liab: 'Liabilities', eq_na: 'Net assets', eq_cap: 'Equity per balance', eq_cap_d: 'charter {a} + reserve {b} + retained {c}', eq_rec: 'Reconciliation',
    yr_title: 'Equity and dividends by year', yr_small: 'equity at year end (* — on {d}) · profit and dividends for the year',
    yr_bars: 'equity at year end', yr_net: 'net profit for the year', yr_div: 'dividends for the year',
    c_year: 'Year', c_eq_open: 'Opening equity', c_net: 'Net profit', c_divs: 'Dividends', c_payout: 'Payout', c_tores: 'To reserve', c_eq_close: 'Closing equity', yr_to: 'to {d}',
    m_title: 'Equity, assets and liabilities · 12 months', m_small: '{u} · at each month end (current — on {d})', m_eq: 'equity = net assets', m_as: 'assets', m_li: 'liabilities',
    dv_title: 'Dividend history', dv_small: 'payments to {d} · from the ledger and the decision register',
    c_date: 'Date', c_amount: 'Amount, {u}', c_pyear: '% of the year’s net profit', c_cash_after: 'Cash after payment, {u}', c_eq_after: 'Equity after payment, {u}', c_decision: 'Decision',
    c_divtax: 'IIT at source, {u}', c_divrate: 'IIT rate', dv_law: 'IIT on dividends — under each year’s law, cumulative for the year: 5% in 2022, 10% above 30,000 MCI in 2023–2025, in 2026 — 5% up to 230,000 MCI ({cap}) and 15% above · accrued in {y} — {v}', 
    dv_total: 'Total paid', dv_none: 'No dividends were paid up to {d}.', dv_dec: '{w} · {d}', dv_nodec: 'founder’s decision (before the register)',
    k_title: 'Ratios', k_small: 'on {d} · 12 months to {d}',
    k_aut: 'Equity ratio', k_aut_d: 'equity ÷ assets · norm ≥ 50%',
    k_na: 'Net assets ÷ charter capital', k_na_d: 'norm ≥ 1 (RK LLP law)',
    k_liq: 'Current ratio', k_liq_d: '(cash + receivables) ÷ current liabilities (incl. vacation reserve and current part of leasing) · norm ≥ 1.2',
    k_roe: 'ROE, 12 months', k_roe_d: '12-mo. net profit ÷ equity at date',
    k_roa: 'ROA, 12 months', k_roa_d: '12-mo. net profit ÷ assets at date',
    k_reinv: 'Reinvestment ratio', k_reinv_d: '(profit − dividends) ÷ profit, 12 mo.',
    k_de: 'Debt / equity', k_de_d: 'leasing ÷ equity · all liabilities ÷ equity — {v}',
    k_debt: 'Debt / EBITDA', k_debt_d: 'vehicle leasing only · no bank loans',
    k_dso: 'Receivables turnover', k_dso_d: 'receivables ÷ daily revenue incl. VAT (at each day’s rate), 12 mo.', days: '{n} days',
    k_cap: 'Dividend capacity', k_cap_d: 'minimum of the 13-week cash forecast (with approved payments) − ₸30 M buffer',
    k_short: 'data since 1 Jan 2022: {n} days',
    ab_title: 'How equity is calculated', ab_small: 'formulas and rules',
    ab_1: 'Equity = charter capital + reserve capital + retained earnings. Net assets = assets − liabilities; with double entry they equal equity on any date.',
    ab_2: 'Reserve capital follows the Agency’s charter (RK law does not require it for an LLP): on 31 Dec each year Dr “Retained earnings” Cr “Reserve capital” for 5% of the year’s net profit until the reserve reaches 15% of charter capital. The entry does not change total equity.',
    ab_3: 'Statement of changes in equity: opening balance + net profit − dividends ± transfers to reserve ± change in charter capital = closing balance; the total is reconciled with the balance sheet to ₸1.',
    ab_4: 'If net assets at year end are below charter capital, RK LLP legislation requires a members’ decision (reduction of charter capital) — the Net assets tile turns red. To be confirmed by the lawyer.',
    ab_5: 'High ROE results from the dividend policy: most profit is paid out, so equity stays small relative to profit. ROA and the reinvestment ratio are shown next to it for that reason.',
    rs_title: 'Transfers to reserve capital', c_profit_y: 'Net profit for the year', c_rate: '5% of profit', c_room: 'Room left in 15% cap', c_booked: 'Booked on 31 Dec', c_res_after: 'Reserve after',
    rs_none: 'The first transfer is on 31 Dec 2022; on {d} the reserve is zero.',
    cd_ctx: 'Finance · Equity', on: 'On {d}', on_start: 'Start of period ({d})', chg: 'Change for the period', share_a: 'Share of assets', share_l: 'Share of liabilities',
    acc: 'Ledger account', acc_cash: 'Cash (till and bank)', acc_ar: 'Customer settlements', acc_inv: 'Inventory', acc_fa: 'Fixed assets − accumulated depreciation', acc_ap: 'Supplier settlements', acc_salpay: 'Payroll settlements',
    acc_paytax: 'Payroll taxes and contributions', acc_vat: 'VAT', acc_citpay: 'CIT', acc_leasing: 'Lease liabilities', acc_charter: 'Charter capital', acc_reserve: 'Reserve capital', acc_re: 'Retained earnings', acc_div: 'Dividends (reduction of equity)',
    months: 'By month', c_month: 'Month', c_bal_end: 'Closing balance, {u}', c_chg: 'Change, {u}',
    cf_title: 'Cash flow for the period', top_ar: 'Largest debtors on {d}', c_cust: 'Customer', c_debt: 'Debt, {u}', c_overdue: 'Overdue, {u}', unbilled: 'Accrued, not yet invoiced',
    fa_gross: 'Gross cost', fa_dep: 'Accumulated depreciation', fa_capex: 'Fixed asset purchases and leasing', fa_leasing_in: 'Leasing: rapid-response vehicles received',
    ls_rate: 'Lease rate', ls_pay: 'Monthly payment (on the 12th)', ls_long: 'Non-current part = balance − principal due under the next 12 payments', ls_short: 'Current part (principal of 12 payments + accrued interest)',
    next_pay: 'Next settlement', pay_sal: '{d}: salaries {v}', pay_tax: '{d}: payroll taxes {a}, VAT {b}, CIT advance {c}', pay_ap: 'on the 15th for the previous month', inv_note: 'per warehouse data; movements — in the Warehouse section',
    postings: 'Ledger entries', c_dt: 'Debit', c_kt: 'Credit', post_profit: 'Closing the period’s profit: P&L accounts → retained earnings',
    pl_rev: 'Revenue', pl_ebitda: 'EBITDA', pl_dep: 'Depreciation', pl_int: 'Lease interest', pl_cit: 'CIT', pl_net: 'Net profit',
    c_net_m: 'Net profit, {u}', charter_note: 'Charter capital was registered before the history starts (opening balance on 1 Jan 2022); no changes in 2022–2026.', other_note: 'There are no other equity movements: every ledger entry is profit, dividends, reserve or charter capital.',
    rule: 'Rule', rule_res: '5% of the year’s net profit while the reserve is below 15% of charter capital ({v})', limit: 'Reserve cap (15% of charter)',
    composition: 'Equity components', check_bs: 'Balance sheet check', eq_formula: 'Formula', na_formula: 'assets − liabilities',
    div_12: 'Dividends, 12 mo.', net_12: 'Net profit, 12 mo.', payout: 'Payout ratio', eq_avg: 'Average equity, 12 mo.', roe_avg: 'ROE on average equity',
    cash_before: 'Cash before payment', cash_after: 'Cash after payment', eq_before: 'Equity before payment', eq_after: 'Equity after payment', decision: 'Decision', year_profit: 'Net profit for the year', share_profit: 'Share of the year’s profit',
    inputs: 'Inputs', norm: 'Norm', st_year: 'Equity for {y}', yr_open: 'Equity on 1 Jan', yr_close: 'Equity on {d}',
    cf_inCustomers: 'Receipts from customers', cf_salaries: 'Net salaries', cf_payrollTaxes: 'Payroll taxes and contributions', cf_vat: 'VAT', cf_cit: 'CIT', cf_suppliers: 'Suppliers and other', cf_capex: 'Fixed asset purchases', cf_leasingPay: 'Leasing — principal', cf_dividends: 'Dividends (net)', cf_net: 'Net cash flow', norm_aut: '≥ 50%',
    st_short: 'current liabilities (incl. current part of leasing and vacation reserve)', ebitda_12: 'EBITDA, 12 mo.', rev_12: 'Daily revenue incl. VAT, 12 mo.', upcoming: 'Next payroll and taxes',
  }));

  // ======================= помощники =======================
  const allowed = role => !!role && (role.rt.finance !== '·' || ['owner','gd'].includes(role.id));
  const fx = () => K.fmt;
  const m = v => fx().M(v), mu = v => fx().MU(v), pc = v => fx().P(isFinite(v) ? v : 0), f2 = v => fx().F(isFinite(v) ? v : 0, 2);
  const sg = v => (v > 0 ? '+' : '') + mu(v);
  const dt = i => fx().dt(i), U = () => fx().U(), esc = s => fx().esc(s);
  const ratio = (a, b) => b ? a / b : 0;
  const pill = ok => `<span class="pill s ${ok ? 's-good' : 's-bad'}">${L(ok ? 'ok' : 'bad')}</span>`;
  const sub = (title, html) => `<div class="eq-sub">${title ? `<div class="eq-subh">${title}</div>` : ''}${html}</div>`;
  // таблица модуля: строки { c:[…], eq:'id', total:true }, txt — номера текстовых колонок, lo — второстепенные (скрываются на телефоне)
  function tbl(head, rows, o = {}){
    const txt = o.txt || [0], lo = o.lo || [];
    const cl = (i, base) => { const c = [base, lo.includes(i) ? 'lo' : ''].filter(Boolean).join(' '); return c ? ` class="${c}"` : ''; };
    return `<div class="tw"><table class="tbl eq-tbl ${o.cls || ''}"><thead><tr>${head.map((h, i) => `<th${cl(i, txt.includes(i) ? '' : 'eq-n')}>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr${r.eq ? ` data-eq="${r.eq}" tabindex="0"` : ''}${r.total ? ' class="total"' : ''}>${r.c.map((c, i) => `<td${cl(i, txt.includes(i) ? '' : 'num')}>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
  const tile = (id, t, v, lines, stripe) => `<div class="tile eq-tile" data-eq="${id}" tabindex="0" role="button" style="--stripe:${stripe || 'transparent'}"><div class="t">${t}</div><div class="v">${v}</div>${lines.filter(Boolean).map(x => `<div class="d">${x}</div>`).join('')}</div>`;
  const wk = (id, t, v, d) => `<div data-eq="${id}" tabindex="0" role="button"><div class="t">${t}</div><div class="v">${v}</div><div class="d">${d}</div></div>`;
  const ASSETS = ['cash','ar','inv','faNet'], LIABS = ['ap','salpay','paytax','vat','citpay','divtax','vacres','leasing'];
  const lname = k => L((ASSETS.includes(k) ? 'a_' : 'l_') + k);
  const leasingSplit = b => ({ long: b.leasingLong || 0, short: b.leasing - (b.leasingLong || 0) });   // текущая часть — основной долг по графику 12 платежей + проценты (W.leasingSplit)
  const yearAgo = i => { const W = K.W, d = W.idxOf(W.yOf(i) - 1, W.mOf(i), W.dOf(i)); return d >= 0 ? d : null; };
  // 12 месяцев по дату (как в разделе «Финансы»): прибыль, дивиденды, EBITDA, выручка
  function last12(to){
    const W = K.W, a = Math.max(0, to - 364), p = W.pl(a, to);
    return { from: a, len: to - a + 1, net: p.net, ebitda: p.ebitda, revenue: p.revenue, div: W.accTurn('dividends', a, to) };
  }
  const shortNote = y => y.len < 365 ? ` · ${L('k_short', { n: fx().N(y.len) })}` : '';
  const decisionOf = d => { const W = K.W; const x = (K.data.DECISIONS || []).filter(r => /ивиденд|ividend/.test(r[1]) && W.yOf(r[0]) === W.yOf(d) && r[0] <= d).sort((a, b) => b[0] - a[0])[0]; return x ? L('dv_dec', { w: esc(fx().rn(x[2])), d: dt(x[0]) }) : L('dv_nodec'); };
  const divList = (from, to) => { const W = K.W; return W.P.dividends.map(([d]) => d).filter(d => d >= Math.max(0, from) && d <= to && d < W.DAYS).map(d => ({ d, v: W.accTurn('dividends', d, d) })).filter(x => Math.abs(x.v) > 0.5); };
  const yearProfit = (d, to) => { const W = K.W, y = W.yOf(d); return W.pl(W.idxOf(y, 0, 1), Math.min(W.idxOf(y, 11, 31), to)).net; };

  // ======================= вкладка «Капитал» =======================
  function tabs(){ return `<div class="tabs"><a href="#finance">${L('tab_main')}</a><a href="#finance-eq" class="on" aria-current="page">${L('tab')}</a></div>`; }
  function render(){
    const role = K.roles.roleOf(K.S.role);
    if (!allowed(role)) return K.ui.noAccess(role, 'finance');
    const W = K.W, R = K.RNG, to = R.to, from = R.from, b = W.balance(to), e = W.equityChanges(from, to);
    return K.ui.h1(L('h1'), L('sub', { d: dt(to), p: fx().periodTxt() })) + tabs()
      + tilesHtml(b, e, to) + statementHtml(e, R) + structureHtml(b, to) + yearsHtml(to) + monthsHtml(to) + dividendsHtml(to) + ratiosHtml(b, to) + aboutHtml(to);
  }
  function tilesHtml(b, e, to){
    const W = K.W, ya = yearAgo(to), by = ya != null ? W.balance(ya) : null, y12 = last12(to), dP = b.equity - e.total.open;
    const roe = ratio(y12.net, b.equity) * 100, payout = ratio(y12.div, y12.net) * 100, aut = ratio(b.equity, b.assets) * 100, low = b.netAssets < b.charter;
    return `<div class="tiles">`
      + tile('tl:equity', L('t_equity'), mu(b.equity), [by ? L('t_equity_d', { a: sg(dP), b: sg(b.equity - by.equity) }) : L('t_equity_d0', { a: sg(dP) })])
      + tile('tl:na', L('t_na'), mu(b.netAssets), [low ? `<span class="dn">${L('t_na_low')}</span>` : L('t_na_d', { k: fx().F(ratio(b.netAssets, b.charter), 1) })], low ? 'var(--bad-fill)' : '')
      + tile('tl:re', L('t_re'), mu(b.re), [L('t_re_d', { a: mu(b.reStart), b: mu(b.profitYear) })])
      + tile('tl:div', L('t_div'), mu(e.dividends), [L('t_div_d', { a: mu(y12.div), p: pc(payout) })])
      + tile('tl:roe', L('t_roe'), pc(roe), [(roe > 50 && payout > 50 ? L('t_roe_d', { p: pc(payout) }) : L('t_roe_d2')) + shortNote(y12)])
      + tile('tl:aut', L('t_aut'), pc(aut), [L('t_aut_d')], aut < 50 ? 'var(--warn-fill)' : '')
      + `</div>`;
  }
  // строки отчёта: [ключ, подпись, уставный, резервный, нераспределённая, итого(e)]
  function stRows(e){
    const z = v => Math.abs(v) < 0.5 ? 0 : v;
    return [
      ['open', e.from === 0 ? L('r_open0') : L('r_open', { d: dt(e.from - 1) }), e.open.charter, e.open.reserve, e.open.re, x => x.total.open],
      ['profit', L('r_profit'), null, null, e.profit, x => x.profit],
      ['div', L('r_div'), null, null, -e.dividends, x => -x.dividends],
      ['reserve', L('r_res'), null, e.toReserve, -e.toReserve, () => 0],
      ['charter', L('r_charter'), e.charterChange, null, null, x => x.charterChange],
      ['other', L('r_other'), null, null, z(e.other), x => z(x.other)],
      ['close', L('r_close', { d: dt(e.to) }), e.close.charter, e.close.reserve, e.close.re, x => x.total.close],
    ];
  }
  function statementHtml(e, R){
    const W = K.W, cp = R.prev ? W.equityChanges(R.prev.from, R.prev.to) : null, cy = R.yago ? W.equityChanges(R.yago.from, R.yago.to) : null;
    const cell = v => v == null ? '' : m(v);
    const head = [L('c_row'), `${L('c_charter')}, ${U()}`, `${L('c_reserve')}, ${U()}`, `${L('c_re')}, ${U()}`, `${L('c_total')}, ${U()}`, ...(cp ? [L('c_prev')] : []), ...(cy ? [L('c_yago')] : [])];
    const n = head.length, lo = n > 5 ? [5, 6] : [];
    const rows = stRows(e).map(([k, name, a, r, re, tot]) => ({ eq: 'ch:' + k, total: k === 'open' || k === 'close', c: [k === 'close' || k === 'open' ? `<b>${name}</b>` : name, cell(a), cell(r), cell(re), `<b>${m(tot(e))}</b>`, ...(cp ? [m(tot(cp))] : []), ...(cy ? [m(tot(cy))] : [])] }));
    const b = W.balance(e.to), d = e.total.close - b.equity, pd = e.profit - W.pl(e.from, e.to).net, dd = e.dividends + W.cashflow(e.from, e.to).dividends - W.taxes(e.from, e.to).divIpn;   // начислено = на руки (ДДС) + ИПН у источника
    const checks = `<div class="eq-checks"><span>${pill(Math.abs(d) < 1)} ${L('st_check', { d: dt(e.to) })} · ${L('diff', { v: fx().F(Math.abs(d), 2) })}</span><span>${pill(Math.abs(pd) < 1)} ${L('st_profit')}</span><span>${pill(Math.abs(dd) < 1)} ${L('st_divcf')}</span></div>`;
    return K.ui.card(L('st_title'), tbl(head, rows, { lo, cls: 'eq-st' }) + checks + K.ui.note(L('st_note')), L('st_small', { p: fx().periodTxt() }));
  }
  function structureHtml(b, to){
    const ls = leasingSplit(b);
    const aRows = ASSETS.map(k => ({ eq: 'bs:' + k, c: [lname(k), m(b[k]), pc(ratio(b[k], b.assets) * 100)] }));
    aRows.push({ total: true, eq: 'bs:assets', c: [`<b>${L('tot_assets')}</b>`, `<b>${m(b.assets)}</b>`, pc(100)] });
    const lRows = LIABS.map(k => { const lg = k === 'leasing' ? ls.long : 0; return { eq: 'bs:' + k, c: [lname(k), m(b[k]), pc(ratio(b[k], b.liabilities) * 100), m(b[k] - lg), m(lg)] }; });
    lRows.push({ total: true, eq: 'bs:liab', c: [`<b>${L('tot_liab')}</b>`, `<b>${m(b.liabilities)}</b>`, pc(100), m(b.liabilities - ls.long), m(ls.long)] });
    const d = b.netAssets - b.equity, ok = Math.abs(d) < 1;
    const eqn = `<div class="eq-eqn" data-eq="rec" tabindex="0" role="button">
      <div><span>${L('eq_assets')}</span><b>${mu(b.assets)}</b></div><i aria-hidden="true">−</i>
      <div><span>${L('eq_liab')}</span><b>${mu(b.liabilities)}</b></div><i aria-hidden="true">=</i>
      <div><span>${L('eq_na')}</span><b>${mu(b.netAssets)}</b></div><i aria-hidden="true">=</i>
      <div><span>${L('eq_cap')}</span><b>${mu(b.equity)}</b><small>${L('eq_cap_d', { a: mu(b.charter), b: mu(b.reserve), c: mu(b.re) })}</small></div>
      <div class="eq-rec ${ok ? 'sig good' : 'sig bad'}"><span>${L('eq_rec')}</span><b>${pill(ok)}</b><small>${L('diff', { v: fx().F(Math.abs(d), 2) })}</small></div></div>`;
    return K.ui.card(L('bs_title'), `<div class="eq-two">${tbl([L('c_assets'), L('c_sum', { u: U() }), L('c_share')], aRows)}${tbl([L('c_liab'), L('c_sum', { u: U() }), L('c_share'), L('c_short'), L('c_long')], lRows, { lo: [3, 4] })}</div>` + eqn, L('bs_small', { d: dt(to) }));
  }
  function yearList(to){
    const W = K.W, out = [];
    for (let y = W.Y0; y <= W.yOf(to); y++){ const a = W.idxOf(y, 0, 1), z = Math.min(W.idxOf(y, 11, 31), to); out.push({ y, a, z, partial: z < W.idxOf(y, 11, 31), e: W.equityChanges(a, z) }); }
    return out;
  }
  function yearsHtml(to){
    const ys = yearList(to), c = fx().conv, lab = x => x.y + (x.partial ? ' ' + L('yr_to', { d: fx().dts(x.z) }) : ''), clab = x => String(x.y) + (x.partial ? '*' : '');
    const chart = `<div class="two"><div>${K.ui.bars(ys.map(x => c(x.e.total.close) / 1e6), ys.map(clab), { values: v => fx().F(v, 0), color: 'var(--c1)', fmt: v => fx().F(v) + ' ' + U(), label: L('yr_bars'), h: 160 })}<div class="legend"><span><i style="background:var(--c1)"></i>${L('yr_bars')}</span></div></div>`
      + `<div>${ys.length < 2 ? '' : K.ui.lines([{ n: L('yr_net'), v: ys.map(x => c(x.e.profit) / 1e6), c: 'var(--c3)' }, { n: L('yr_div'), v: ys.map(x => c(x.e.dividends) / 1e6), c: 'var(--c2)' }], ys.map(clab), { min: 0, fmt: v => fx().F(v, 0), h: 160, label: L('yr_div') })}</div></div>`;
    const rows = ys.map(x => ({ eq: 'yr:' + x.y, c: [lab(x), m(x.e.total.open), m(x.e.profit), m(x.e.dividends), pc(ratio(x.e.dividends, x.e.profit) * 100), m(x.e.toReserve), `<b>${m(x.e.total.close)}</b>`] }));
    return K.ui.card(L('yr_title'), chart + tbl([L('c_year'), `${L('c_eq_open')}, ${U()}`, `${L('c_net')}, ${U()}`, `${L('c_divs')}, ${U()}`, L('c_payout'), `${L('c_tores')}, ${U()}`, `${L('c_eq_close')}, ${U()}`], rows, { lo: [1, 5] }), L('yr_small', { d: fx().dts(to) }));
  }
  function monthsHtml(to){
    const W = K.W, ms = K.data.months12(to), c = fx().conv, bs = ms.map(x => W.balance(x.to));
    return K.ui.card(L('m_title'), K.ui.lines([{ n: L('m_as'), v: bs.map(b => c(b.assets) / 1e6), c: 'var(--c1)' }, { n: L('m_li'), v: bs.map(b => c(b.liabilities) / 1e6), c: 'var(--c4)' }, { n: L('m_eq'), v: bs.map(b => c(b.equity) / 1e6), c: 'var(--c3)' }], ms.map(x => x.label), { min: 0, fmt: v => fx().F(v, 0), label: L('m_title') }), L('m_small', { u: U(), d: dt(to) }));
  }
  function dividendsHtml(to){
    const W = K.W, list = divList(0, to);
    if (!list.length) return K.ui.card(L('dv_title'), `<div class="empty">${L('dv_none', { d: dt(to) })}</div>`, L('dv_small', { d: dt(to) }));
    const taxOf = d => { const z = W.dividendsLog.find(y => y.day === d); return z ? z.tax : 0; };
    const rows = list.map(x => { const b = W.balance(x.d), yp = yearProfit(x.d, to), tx0 = taxOf(x.d); return { eq: 'dv:' + x.d, c: [dt(x.d), m(x.v), m(tx0), pc(ratio(tx0, x.v) * 100), pc(ratio(x.v, yp) * 100), m(b.cash), m(b.equity), decisionOf(x.d)] }; }).reverse();
    rows.push({ total: true, c: [`<b>${L('dv_total')}</b>`, `<b>${m(list.reduce((s, x) => s + x.v, 0))}</b>`, `<b>${m(list.reduce((s, x) => s + taxOf(x.d), 0))}</b>`, '', '', '', '', ''] });
    const y = W.yOf(to), ya = W.idxOf(y, 0, 1), dvY = W.accTurn('dividends', ya, to);
    return K.ui.card(L('dv_title'), tbl([L('c_date'), L('c_amount', { u: U() }), L('c_divtax', { u: U() }), L('c_divrate'), L('c_pyear'), L('c_cash_after', { u: U() }), L('c_eq_after', { u: U() }), L('c_decision')], rows, { txt: [0, 7], lo: [3, 5, 6] }), L('dv_small', { d: dt(to) }) + ' · ' + L('dv_law', { cap: mu((W.RATES[2026].divCap || 0) * W.RATES[2026].mrp), y, v: mu(dvY) }));
  }
  // коэффициенты: те же формулы, что в «Финансах» и сводке учредителя (одна цифра — один источник), плюс 3 новых по 3.6
  function ratioVals(b, to){
    const W = K.W, y12 = last12(to), st = b.current, up = W.upcoming(to);
    return {
      aut: ratio(b.equity, b.assets) * 100, na: ratio(b.netAssets, b.charter), liq: ratio(b.cash + b.ar, st), roe: ratio(y12.net, b.equity) * 100, roa: ratio(y12.net, b.assets) * 100,
      reinv: ratio(y12.net - y12.div, y12.net) * 100, de: ratio(b.leasing, b.equity), le: ratio(b.liabilities, b.equity), debt: b.leasing / Math.max(1, y12.ebitda),
      dso: b.ar / Math.max(1, K.data.revVat(Math.max(0, to - 364), to) / 365), cap: Math.max(0, K.data.divCap(to)), y12, st, up,
    };
  }
  function ratiosHtml(b, to){
    const k = ratioVals(b, to), sn = shortNote(k.y12);
    return K.ui.card(L('k_title'), `<div class="wk eq-wk">`
      + wk('k:aut', L('k_aut'), pc(k.aut), L('k_aut_d')) + wk('k:na', L('k_na'), f2(k.na), L('k_na_d')) + wk('k:liq', L('k_liq'), f2(k.liq), L('k_liq_d'))
      + wk('k:roe', L('k_roe'), pc(k.roe), L('k_roe_d') + sn) + wk('k:roa', L('k_roa'), pc(k.roa), L('k_roa_d') + sn) + wk('k:reinv', L('k_reinv'), pc(k.reinv), L('k_reinv_d') + sn)
      + wk('k:de', L('k_de'), f2(k.de), L('k_de_d', { v: f2(k.le) })) + wk('k:debt', L('k_debt'), f2(k.debt), L('k_debt_d')) + wk('k:dso', L('k_dso'), L('days', { n: fx().N(k.dso) }), L('k_dso_d'))
      + wk('k:cap', L('k_cap'), mu(k.cap), L('k_cap_d')) + `</div>`, L('k_small', { d: dt(to) }));
  }
  function reserveRows(to){
    const W = K.W, cap = W.P.reserve.cap * W.P.charter; let before = 0;
    return W.reserveLog.filter(r => r.day <= to).map(r => { const row = { eq: 'rs:' + r.y, c: [String(r.y), m(r.net), m(Math.max(0, r.net * W.P.reserve.rate)), m(Math.max(0, cap - before)), m(r.amount), `<b>${m(r.after)}</b>`] }; before = r.after; return row; });
  }
  function aboutHtml(to){
    const rr = reserveRows(to);
    return K.ui.card(L('ab_title'), `<ul class="ul">${['ab_1','ab_2','ab_3','ab_4','ab_5'].map(k => `<li>${L(k)}</li>`).join('')}</ul>`
      + sub(L('rs_title'), rr.length ? tbl([L('c_year'), `${L('c_profit_y')}, ${U()}`, `${L('c_rate')}, ${U()}`, `${L('c_room')}, ${U()}`, `${L('c_booked')}, ${U()}`, `${L('c_res_after')}, ${U()}`], rr, { lo: [2, 3] }) : K.ui.note(L('rs_none', { d: dt(to) }))), L('ab_small'));
  }

  // ======================= карточки eq:* =======================
  const kv = (k, v) => [k, v];
  function monthsTable(key, to){
    const W = K.W, ms = K.data.months12(to);
    const rows = ms.map(x => { const v = W.balance(x.to)[key]; return { c: [x.label, m(v), x.from > 0 ? m(v - W.balance(x.from - 1)[key]) : '—'] }; }).reverse();
    return sub(L('months'), tbl([L('c_month'), L('c_bal_end', { u: U() }), L('c_chg', { u: U() })], rows, { cls: 'compact' }));
  }
  function bsCard(key, R){
    const W = K.W, to = R.to, from = R.from, b = W.balance(to), b0 = from > 0 ? W.balance(from - 1) : null;
    if (key === 'assets' || key === 'liab') return recCard(R);
    const isA = ASSETS.includes(key), v = b[key], v0 = b0 ? b0[key] : 0, rows = [kv(L('on', { d: dt(to) }), `<b>${mu(v)}</b>`), kv(L('on_start', { d: from > 0 ? dt(from - 1) : dt(0) }), mu(v0)), kv(L('chg'), sg(v - v0)), kv(L(isA ? 'share_a' : 'share_l'), pc(ratio(v, isA ? b.assets : b.liabilities) * 100)), kv(L('acc'), L('acc_' + (key === 'faNet' ? 'fa' : key)))];
    const extra = [];
    if (key === 'cash'){ const cf = W.cashflow(from, to); extra.push(sub(L('cf_title'), tbl([L('c_row'), U()], ['inCustomers','interestIn','salaries','payrollTaxes','vat','cit','suppliers','capex','leasingPay','interestPaid','dividends','divTax'].map(k => ({ c: [L('cf_' + k), m(cf[k])] })).concat([{ total: true, c: [`<b>${L('cf_net')}</b>`, `<b>${m(cf.net)}</b>`] }]), { cls: 'compact' }))); }
    if (key === 'ar'){ const ar = W.receivables(to), top = [...ar.byCust.values()].sort((a, c) => c.debt - a.debt).slice(0, 8); extra.push(sub(L('top_ar', { d: dt(to) }), tbl([L('c_cust'), L('c_debt', { u: U() }), L('c_overdue', { u: U() })], top.map(x => ({ c: [esc(I18N.w(x.cust.name)), m(x.debt), m(x.overdue)] })).concat([{ c: [L('unbilled'), m(ar.unbilled), ''] }]), { cls: 'compact' }))); }
    if (key === 'faNet'){ rows.push(kv(L('fa_gross'), mu(b.faGross)), kv(L('fa_dep'), mu(b.faNet - b.faGross))); const cx = W.P.capex.filter(c => c[0] <= to).map(c => ({ c: [dt(c[0]), m(c[1])] })); if (W.P.leasing.day <= to) cx.push({ c: [`${dt(W.P.leasing.day)} · ${L('fa_leasing_in')}`, m(W.P.leasing.amount)] }); extra.push(sub(L('fa_capex'), tbl([L('c_date'), L('c_amount', { u: U() })], cx, { cls: 'compact' }))); }
    if (key === 'leasing'){ const ls = leasingSplit(b); rows.push(kv(L('ls_rate'), pc(W.P.leasing.rate * 100)), kv(L('ls_pay'), mu(W.P.leasing.pay)), kv(L('ls_short'), mu(ls.short)), kv(L('ls_long'), mu(ls.long))); }
    if (key === 'salpay' || key === 'paytax' || key === 'vat' || key === 'citpay' || key === 'divtax'){ const up = W.upcoming(to); rows.push(kv(L('next_pay'), key === 'salpay' ? L('pay_sal', { d: dt(up.salDay), v: mu(up.sal) }) : L('pay_tax', { d: dt(up.taxDay), a: mu(up.taxPay), b: mu(up.taxVat), c: mu(up.taxCit) }))); }
    if (key === 'ap') rows.push(kv(L('next_pay'), L('pay_ap')));
    if (key === 'inv') rows.push(kv(L('acc'), L('inv_note')));
    return { title: lname(key), rows: [...rows, ['', monthsTable(key, to)], ...extra.map(x => ['', x])] };
  }
  function recCard(R){
    const b = K.W.balance(R.to), d = b.netAssets - b.equity;
    return { title: L('bs_title'), rows: [kv(L('tot_assets'), mu(b.assets)), kv(L('tot_liab'), mu(b.liabilities)), kv(L('eq_na'), `<b>${mu(b.netAssets)}</b>`), kv(L('acc_charter'), mu(b.charter)), kv(L('acc_reserve'), mu(b.reserve)), kv(L('acc_re'), mu(b.re)), kv(L('eq_cap'), `<b>${mu(b.equity)}</b>`), kv(L('check_bs'), `${pill(Math.abs(d) < 1)} ${L('diff', { v: fx().F(Math.abs(d), 2) })}`)] };
  }
  const postTable = list => tbl([L('c_date'), L('c_dt'), L('c_kt'), L('c_amount', { u: U() })], list.map(x => ({ c: [dt(x.d), x.dt, x.kt, m(x.v)] })), { txt: [0, 1, 2], cls: 'compact' });
  function chCard(key, R){
    const W = K.W, e = W.equityChanges(R.from, R.to), comp = (s, d) => [kv(L('acc_charter'), mu(s.charter)), kv(L('acc_reserve'), mu(s.reserve)), kv(L('acc_re'), mu(s.re)), kv(d, `<b>${mu(s.charter + s.reserve + s.re)}</b>`)];
    const row = stRows(e).find(r => r[0] === key), title = row ? row[1] : L('st_title');
    if (key === 'open') return { title, rows: comp(e.open, L('c_total')) };
    if (key === 'close'){ const d = e.total.close - W.balance(R.to).equity; return { title, rows: [...comp(e.close, L('c_total')), kv(L('check_bs'), `${pill(Math.abs(d) < 1)} ${L('diff', { v: fx().F(Math.abs(d), 2) })}`)] }; }
    if (key === 'profit'){
      const p = W.pl(R.from, R.to), ms = W.MONTHS.filter(x => x.end >= R.from && x.start <= R.to);
      const mt = ms.length > 1 && ms.length <= 24 ? [['', sub(L('months'), tbl([L('c_month'), L('c_net_m', { u: U() })], ms.map(x => ({ c: [`${fx().MON[x.m]} ${x.y}`, m(W.pl(Math.max(x.start, R.from), Math.min(x.end, R.to)).net)] })), { cls: 'compact' }))]] : [];
      return { title, rows: [kv(L('pl_rev'), mu(p.revenue)), kv(L('pl_ebitda'), mu(p.ebitda)), kv(L('pl_dep'), mu(-p.dep)), kv(L('pl_int'), mu(-p.interest)), kv(L('pl_cit'), mu(-p.cit)), kv(L('pl_net'), `<b>${mu(p.net)}</b>`), kv(L('postings'), L('post_profit')), ...mt] };
    }
    if (key === 'div'){ const list = divList(R.from, R.to); return { title, rows: [kv(L('c_total'), `<b>${mu(e.dividends)}</b>`), kv(L('st_divcf'), pill(Math.abs(e.dividends + W.cashflow(R.from, R.to).dividends - W.taxes(R.from, R.to).divIpn) < 1)), ...(list.length ? [['', sub(L('postings'), postTable(list.map(x => ({ d: x.d, dt: L('acc_div'), kt: L('acc_cash'), v: x.v }))))]] : [])] }; }
    if (key === 'reserve'){ const list = W.reserveLog.filter(r => r.amount > 0 && r.day >= R.from && r.day <= R.to); return { title, rows: [kv(L('c_total'), `<b>${mu(e.toReserve)}</b>`), kv(L('rule'), L('rule_res', { v: mu(W.P.reserve.cap * W.P.charter) })), kv(L('acc_reserve'), mu(e.close.reserve)), ...(list.length ? [['', sub(L('postings'), postTable(list.map(r => ({ d: r.day, dt: L('acc_re'), kt: L('acc_reserve'), v: r.amount }))))]] : [])] }; }
    if (key === 'charter') return { title, rows: [kv(L('acc_charter'), mu(e.close.charter)), kv(L('chg'), mu(e.charterChange)), kv('', L('charter_note'))] };
    return { title, rows: [kv(L('c_total'), mu(e.other)), kv('', L('other_note'))] };
  }
  function tlCard(key, R){
    const W = K.W, to = R.to, b = W.balance(to), y12 = last12(to);
    if (key === 'equity'){ const ya = yearAgo(to); return { title: L('t_equity'), rows: [kv(L('eq_formula'), L('eq_cap_d', { a: mu(b.charter), b: mu(b.reserve), c: mu(b.re) })), kv(L('on', { d: dt(to) }), `<b>${mu(b.equity)}</b>`), kv(L('chg'), sg(b.equity - W.equityChanges(R.from, to).total.open)), ...(ya != null ? [kv(L('on', { d: dt(ya) }), mu(W.balance(ya).equity))] : []), ['', monthsTable('equity', to)]] }; }
    if (key === 'na') return recCard(R);
    if (key === 're') return { title: L('t_re'), rows: [kv(L('on', { d: dt(W.idxOf(W.yOf(to), 0, 1)) }), mu(b.reStart)), kv(L('r_profit'), mu(b.profitYear)), kv(L('r_div'), mu(-b.dividendsYear)), kv(L('r_res'), mu(-b.toReserveYear)), kv(L('on', { d: dt(to) }), `<b>${mu(b.re)}</b>`)] };
    if (key === 'div') return chCard('div', R);
    if (key === 'roe'){ const ea = W.balance(y12.from > 0 ? y12.from - 1 : 0).equity, avg = (ea + b.equity) / 2; return { title: L('t_roe'), rows: [kv(L('net_12'), mu(y12.net)), kv(L('t_equity'), mu(b.equity)), kv(L('k_roe'), `<b>${pc(ratio(y12.net, b.equity) * 100)}</b>`), kv(L('eq_avg'), mu(avg)), kv(L('roe_avg'), pc(ratio(y12.net, avg) * 100)), kv(L('div_12'), mu(y12.div)), kv(L('payout'), pc(ratio(y12.div, y12.net) * 100)), kv('', L('ab_5'))] }; }
    return { title: L('t_aut'), rows: [kv(L('t_equity'), mu(b.equity)), kv(L('tot_assets'), mu(b.assets)), kv(L('on', { d: dt(R.to) }), `<b>${pc(ratio(b.equity, b.assets) * 100)}</b>`), kv(L('norm'), L('norm_aut'))] };
  }
  function kCard(key, R){
    const W = K.W, b = W.balance(R.to), k = ratioVals(b, R.to), y = k.y12;
    const IN = {
      aut: [[L('t_equity'), mu(b.equity)], [L('tot_assets'), mu(b.assets)]], na: [[L('eq_na'), mu(b.netAssets)], [L('acc_charter'), mu(b.charter)]],
      liq: [[L('a_cash'), mu(b.cash)], [L('a_ar'), mu(b.ar)], [L('st_short'), mu(k.st)]], roe: [[L('net_12'), mu(y.net)], [L('t_equity'), mu(b.equity)]], roa: [[L('net_12'), mu(y.net)], [L('tot_assets'), mu(b.assets)]],
      reinv: [[L('net_12'), mu(y.net)], [L('div_12'), mu(y.div)]], de: [[L('l_leasing'), mu(b.leasing)], [L('tot_liab'), mu(b.liabilities)], [L('t_equity'), mu(b.equity)]], debt: [[L('l_leasing'), mu(b.leasing)], [L('ebitda_12'), mu(y.ebitda)]],
      dso: [[L('a_ar'), mu(b.ar)], [L('rev_12'), mu(K.data.revVat(Math.max(0, R.to - 364), R.to) / 365)]], cap: [[L('a_cash'), mu(b.cash)], [L('fc_min'), mu(Math.min(b.cash, ...W.forecast13(R.to).map(w => w.cash)))], [L('cap_res'), mu(30e6)]],
    };
    const VAL = { aut: pc(k.aut), na: f2(k.na), liq: f2(k.liq), roe: pc(k.roe), roa: pc(k.roa), reinv: pc(k.reinv), de: f2(k.de), debt: f2(k.debt), dso: L('days', { n: fx().N(k.dso) }), cap: mu(k.cap) };
    return { title: L('k_' + key), rows: [kv(L('on', { d: dt(R.to) }), `<b>${VAL[key]}</b>`), kv(L('eq_formula'), L('k_' + key + '_d', { v: f2(k.le) })), ...(IN[key] || []).map(([a, v]) => kv(a, v)), ...(key === 'roe' ? [kv('', L('ab_5'))] : [])] };
  }
  function yrCard(y, R){
    const W = K.W, a = W.idxOf(y, 0, 1), z = Math.min(W.idxOf(y, 11, 31), R.to), e = W.equityChanges(a, z);
    return { title: L('st_year', { y }), rows: [kv(L('yr_open'), mu(e.total.open)), kv(L('r_profit'), mu(e.profit)), kv(L('r_div'), mu(-e.dividends)), kv(L('r_res'), `${mu(e.toReserve)} → ${L('acc_reserve').toLowerCase()}`), kv(L('yr_close', { d: dt(z) }), `<b>${mu(e.total.close)}</b>`), kv(L('payout'), pc(ratio(e.dividends, e.profit) * 100))] };
  }
  function dvCard(d, R){
    const W = K.W, v = W.accTurn('dividends', d, d), b = W.balance(d), b0 = W.balance(d - 1), yp = yearProfit(d, R.to);
    const dl = W.dividendsLog.find(x => x.day === d), tax = dl ? dl.tax : 0;
    return { title: `${L('c_divs')} · ${dt(d)}`, rows: [kv(L('c_total'), `<b>${mu(v)}</b>`), kv(L('div_net'), mu(v - tax)), kv(L('div_tax', { p: pc((dl ? dl.rate : 0) * 100), d: dl ? dt(dl.payDay) : '—' }), mu(tax)), kv(L('cash_before'), mu(b0.cash)), kv(L('cash_after'), mu(b.cash)), kv(L('eq_before'), mu(b0.equity)), kv(L('eq_after'), mu(b.equity)), kv(L('year_profit'), mu(yp)), kv(L('share_profit'), pc(ratio(v, yp) * 100)), kv(L('decision'), decisionOf(d)), ['', sub(L('postings'), postTable([{ d, dt: L('acc_div'), kt: L('acc_cash'), v: v - tax }, ...(tax ? [{ d, dt: L('acc_div'), kt: L('acc_divtax'), v: tax }] : [])]))]] };
  }
  function rsCard(y){
    const W = K.W, r = W.reserveLog.find(x => x.y === y); if (!r) return null;
    return { title: `${L('rs_title')} · ${y}`, rows: [kv(L('c_profit_y'), mu(r.net)), kv(L('rule'), L('rule_res', { v: mu(W.P.reserve.cap * W.P.charter) })), kv(L('c_booked'), `<b>${mu(r.amount)}</b>`), kv(L('c_res_after'), mu(r.after)), ...(r.amount > 0 ? [['', sub(L('postings'), postTable([{ d: r.day, dt: L('acc_re'), kt: L('acc_reserve'), v: r.amount }]))]] : [])] };
  }
  // данные карточки по id (без префикса eq:) — для своего окна и для модуля cards.js
  function cardOf(id){
    if (!K || !allowed(K.roles.roleOf(K.S.role))) return null;
    const R = K.RNG, [kind, key] = String(id).replace(/^eq:/, '').split(':');
    let c = null;
    try {
      if (kind === 'bs') c = bsCard(key, R); else if (kind === 'ch') c = chCard(key, R); else if (kind === 'tl') c = tlCard(key, R); else if (kind === 'k') c = kCard(key, R);
      else if (kind === 'yr') c = yrCard(+key, R); else if (kind === 'dv') c = dvCard(+key, R); else if (kind === 'rs') c = rsCard(+key); else if (kind === 'rec') c = recCard(R);
      // короткие id из словаря показателей и ТЗ 3.6.2 (eq:re, eq:charter, eq:reserve, eq:total …): строка капитала баланса, итог капитала или строка отчёта об изменениях
      else if (key == null){ const b = K.W.balance(R.to); if (kind === 'total' || kind === 'equity') c = tlCard('equity', R); else if (kind === 'na') c = recCard(R); else if (['open','close','profit','div','other'].includes(kind)) c = chCard(kind, R); else if (kind in b && typeof b[kind] === 'number') c = bsCard(kind, R); }
    } catch(err){ console.error('capital card ' + id, err); return null; }
    return c ? { ...c, kind: 'line', id: 'eq:' + String(id).replace(/^eq:/, ''), ctx: L('cd_ctx') } : null;
  }
  function open(id){
    const c = cardOf(id); if (!c) return;
    const C = K.module && K.module('cards');
    if (C && typeof C.openCard === 'function') return C.openCard({ kind: 'raw', id: c.id, ctx: { title: c.title, rows: c.rows, ctx: c.ctx } });   // строки капитала: своя карточка модуля (общий тип «строка отчёта» знает только ОПиУ, ДДС, баланс)
    K.ui.openCard(c.title, c.rows, c.ctx);
  }
  // нажатие на строку/плитку модуля перехватывается до общей карточки ядра (фаза захвата)
  function wire(){
    const pick = e => { const el = e.target && e.target.closest && e.target.closest('[data-eq]'); return el && el.closest('#content') ? el : null; };
    document.addEventListener('click', e => { const el = pick(e); if (!el || e.target.closest('a,button,input,select,label')) return; e.stopPropagation(); e.preventDefault(); open(el.dataset.eq); }, true);
    document.addEventListener('keydown', e => { if (e.key !== 'Enter') return; const el = pick(e); if (!el || el !== e.target) return; e.stopPropagation(); e.preventDefault(); open(el.dataset.eq); }, true);
  }

  const CSS = `
.eq-tbl th.eq-n{text-align:right}
.eq-tbl tbody tr[data-eq]{cursor:pointer}
.eq-tbl tbody tr[data-eq]:hover td{background:var(--accent-soft)}
.eq-tbl tbody tr[data-eq]:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.eq-tile,.eq-wk>div,.eq-eqn{cursor:pointer}
.eq-tile:focus-visible,.eq-wk>div:focus-visible,.eq-eqn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.eq-checks{display:flex;flex-wrap:wrap;gap:var(--s2) var(--s4);margin:var(--s3) 0 0;font-size:var(--fs-2);color:var(--fg-2)}
.eq-checks span{display:inline-flex;align-items:center;gap:var(--s2)}
.eq-eqn{display:grid;grid-template-columns:1fr auto 1fr auto 1fr auto 1.4fr 1fr;align-items:center;gap:var(--s2) var(--s3);margin:var(--s4) 0 0;padding:var(--s3);border:1px solid var(--line);border-radius:var(--r);background:var(--surface-2)}
.eq-eqn>div{display:flex;flex-direction:column;gap:2px;min-width:0}
.eq-eqn span{font-size:var(--fs-2);font-weight:600;color:var(--fg-2)}
.eq-eqn b{font-size:var(--fs-5);font-weight:800;color:var(--fg)}
.eq-eqn small{font-size:var(--fs-1);color:var(--fg-3)}
.eq-eqn>i{font-style:normal;font-size:var(--fs-6);font-weight:800;color:var(--fg-3)}
.eq-eqn .eq-rec{border-radius:var(--r-sm);padding:var(--s2) var(--s3)}
.eq-two{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,3fr);gap:var(--s4)}
.eq-st td:first-child{min-width:190px}
.eq-sub{margin:var(--s2) 0 0;min-width:0}
.eq-subh{font-size:var(--fs-2);font-weight:700;color:var(--fg-2);margin:0 0 var(--s1)}
.kv dt:has(+ dd > .eq-sub){display:none}
.kv dd:has(> .eq-sub){grid-column:1 / -1}
@media (max-width:860px){
  .eq-two{grid-template-columns:minmax(0,1fr)}
  .eq-st td:first-child{min-width:150px}
  .eq-eqn{grid-template-columns:1fr auto 1fr;}
  .eq-eqn>i:nth-of-type(2){display:none}
  .eq-eqn>div:nth-of-type(3),.eq-eqn>div:nth-of-type(4),.eq-eqn>div:nth-of-type(5){grid-column:1 / -1}
  .eq-eqn>i:nth-of-type(3){display:none}
}`;

  const M = {
    name: 'capital', version: '0.8.0',
    ready: true,
    init(k){
      K = M.K = k;
      K.sections['finance-eq'] = render;
      K.ui.css('capital', CSS);
      try { I18N.apply(document.querySelector('.nav') || document); } catch(e){}
      wire();
    },
    render, card: cardOf, open, allowed,
  };
  (window.SUNKAR_MODULES = window.SUNKAR_MODULES || []).push(M);
  window.Capital = M;
})();
