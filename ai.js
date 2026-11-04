// SUNKAR BI · ai.js — модуль «ai» (шаг 2D, пункт 1): панель ИИ-помощника изменяемого размера (справа / снизу / во весь экран / свёрнута),
// вкладки Чат · Проекты · Поручения · Регламент · Журнал · Отчёты, диалог с историей, поручения П-ГГГГ-NNNN, регламентные поручения
// с планировщиком в браузере, журнал действий помощника, отчёты по правам роли, голосовой ввод и голосовые сообщения, файлы.
// Ответы: capability sample на опубликованной странице, иначе встроенные ответы по данным роли (answer). Права проверяются раньше любого ответа.
// ИИ — ступень 1: советует, объясняет, готовит черновики; никогда не подписывает, не платит, не меняет доступы и не удаляет данные.
// Подключение к ядру — через window.SUNKAR (K): K.sections.ai, K.hooks, K.ui.css, K.data/K.roles/K.fmt; записи — window.Live; файлы — window.FileStore.
(function(){
  'use strict';
  const I = window.I18N;
  const t = (k, v) => I.t(k, v);

  // ======================= словарь =======================
  I.add('ru', {
    'ai.title': 'ИИ-помощник', 'ai.step': '· ступень 1: советует и готовит', 'ai.panel': 'Панель ИИ-помощника',
    'ai.mode.side': 'Панель справа', 'ai.mode.bottom': 'Панель снизу', 'ai.mode.full': 'Развернуть во весь экран', 'ai.mode.unfull': 'Свернуть из полноэкранного режима', 'ai.mode.min': 'Свернуть в полоску', 'ai.close': 'Закрыть',
    'ai.grip.w': 'Изменить ширину панели', 'ai.grip.h': 'Изменить высоту панели', 'ai.corner': 'Изменить ширину и высоту панели', 'ai.min.open': 'Развернуть ИИ-помощника', 'ai.unread': 'новых ответов: {n}',
    'ai.tab.chat': 'Чат', 'ai.tab.projects': 'Проекты', 'ai.tab.errands': 'Поручения', 'ai.tab.routines': 'Регламент', 'ai.tab.journal': 'Журнал', 'ai.tab.reports': 'Отчёты', 'ai.tab.overview': 'Обзор', 'ai.tabs': 'Вкладки помощника',
    'ai.launch': 'ИИ-помощник подключён с {d} — на {at} нет поручений, сводок, сообщений ИИ и регламентных поручений.', 'ai.noaccess': 'Роль «{r}»: ИИ-помощник недоступен (уровень «нет доступа»).',
    'ai.ph': 'Спросить или поручить по данным своей роли… (без ИИН и личных данных)', 'ai.q': 'Вопрос или поручение', 'ai.send': 'Отправить', 'ai.clip': 'Прикрепить файлы', 'ai.mic': 'Диктовать — распознавание речи', 'ai.mic.stop': 'Остановить диктовку',
    'ai.voice': 'Записать голосовое сообщение', 'ai.rec.stop': 'Готово', 'ai.rec.cancel': 'Отмена', 'ai.rec.on': 'Идёт запись голосового · до 3 минут · Esc — отмена',
    'ai.speech.none': 'Распознавание речи недоступно в этом браузере — напишите текстом или запишите голосовое сообщение.', 'ai.speech.denied': 'Нет доступа к микрофону — разрешите микрофон для этой страницы в настройках браузера.',
    'ai.speech.network': 'Служба распознавания речи браузера сейчас недоступна — напишите вопрос текстом.', 'ai.speech.nospeech': 'Речь не распознана — попробуйте ещё раз.', 'ai.speech.err': 'Распознавание речи остановлено ({e}).', 'ai.speech.listen': 'Слушаю… говорите; пауза 2 секунды — конец.',
    'ai.rec.none': 'Запись голоса недоступна в этом браузере.', 'ai.rec.cancelled': 'Запись отменена.', 'ai.rec.empty': 'Запись пустая — голосовое не сохранено.', 'ai.rec.err': 'Голосовое не записано: {e}', 'ai.rec.max': 'Запись остановлена: голосовое — до 3 минут.',
    'ai.att.limit': 'Не больше 10 файлов и 15 МБ на одно сообщение.', 'ai.att.remove': 'Убрать файл {n}', 'ai.att.err': 'Файл «{n}» не сохранён: {e}',
    'ai.att.hint': 'Текстовые файлы (txt, csv, md, json) помощник читает и отвечает по содержимому; изображения, pdf, Word и Excel в этой версии только сохраняются и прикладываются к поручению, задаче или чату — разбор таких файлов появится на сервере Агентства.',
    'ai.att.saved_only': 'только сохраняется', 'ai.att.read': 'текст прочитан', 'ai.att.local': 'только в этом браузере', 'ai.att.demo': 'демонстрационный файл', 'ai.att.open': 'открыть',
    'ai.att.to_task': 'К задаче', 'ai.att.to_chat': 'В чат', 'ai.att.to_folder': 'В папку роли', 'ai.att.in_folder': 'в папке «{r}»', 'ai.att.task_title': 'Файл: {n}', 'ai.att.sent': 'Файл «{n}» отправлен в «{c}».', 'ai.att.foldered': 'Файл «{n}» положен в папку роли «{r}» (раздел «Документы»).',
    'ai.transcript': 'черновик расшифровки', 'ai.tr.none': 'Сервис расшифровки голоса на сервере не подключён — помощник отвечает по тексту.', 'ai.voice.msg': 'голосовое · {s} с',
    'ai.more': 'Показать ещё ({n})', 'ai.thinking': 'Думаю…', 'ai.did': 'Что я сделал:', 'ai.did.errand': 'поручение {no} · {st}', 'ai.did.open': 'открыть раздел',
    'ai.act.task': 'Создать задачу из ответа', 'ai.act.chat': 'Отправить в чат', 'ai.act.report': 'Сохранить как отчёт', 'ai.act.done_task': 'Задача создана: «{t}».', 'ai.act.done_chat': 'Отправлено в «{c}».', 'ai.act.done_report': 'Отчёт {no} сохранён (вкладка «Отчёты»).',
    'ai.err.busy': 'ИИ занят — повторите через минуту.', 'ai.err.notgranted': ' (ответ ИИ — после разрешения на странице)', 'ai.err.fail': 'ИИ сейчас не ответил — ниже встроенный ответ по данным роли.',
    'ai.mode.sample': 'режим: ответы ИИ по данным роли', 'ai.mode.server': 'режим: сервер Агентства — права, поручения и журнал проверяет и пишет сервер', 'ai.mode.builtin': 'режим: встроенные ответы по данным роли · ответы ИИ — на опубликованной странице и на сервере Агентства', 'ai.ro': 'у вас только просмотр — новые записи не сохраняются',
    'ai.who.duty': 'дежурный директор', 'ai.who.access': 'доступ', 'ai.who.helper': 'помощник', 'ai.who.shift': 'дежурный по объектам', 'ai.who.analyst': 'бухгалтер-аналитик', 'ai.who.onec': 'виртуальный администратор 1С', 'ai.who.routine': 'регламент', 'ai.who.lawyer': 'виртуальный юрист', 'ai.roleas': 'ИИ · помощник',
    'ai.a.more': 'Поручение {no} принято · ступень 1 · срок 15 минут: соберу подробности по карточке в пределах прав роли «{r}».',
    'ai.a.deny_salary': 'Роль «{r}»: зарплата других сотрудников недоступна (уровень «нет доступа»). Поручение {no} отклонено и записано в журнал.',
    'ai.a.deny_money': 'Роль «{r}»: финансовые данные недоступны (уровень «нет доступа»). Поручение {no} отклонено и записано в журнал.',
    'ai.a.deny_obj': 'Роль «{r}» видит только свой объект. Поручение {no} отклонено и записано в журнал.',
    'ai.a.deny_block': 'Роль «{r}»: блок «{b}» недоступен (уровень «нет доступа»). Поручение {no} отклонено и записано в журнал.',
    'ai.a.human': 'Поручение {no}: ИИ не подписывает, не платит, не меняет доступы и не удаляет данные. Подготовлю черновик и передам человеку — статус «ждёт подписи человека».',
    'ai.a.staff': 'На {d}: постов {posts}, не закрыты {n}{list}. Укомплектованность {p}. Формула: закрытые посты ÷ посты по договорам на дату.',
    'ai.a.staff_obj': '{o} на {d}: постов {posts}, {st}. Данные других объектов этой роли недоступны.', 'ai.a.staff_obj_miss': 'пост {n} не отметился — замена в пути', 'ai.a.staff_obj_ok': 'все посты закрыты',
    'ai.a.risk': ' Риски невыхода на завтра: отпуск {vac}, больничный {sick} — резерв подобран по ближайшим объектам.',
    'ai.a.term': 'расторгнут в периоде', 'ai.a.loss_term': ' (в т. ч. расторгнутых в периоде — {n})',
    'ai.a.loss': 'За {p} в убытке {n} {u}: {list}. Частые причины — тариф дневного поста ниже точки безубыточности и переработки из-за вакансий.',
    'ai.a.onec': 'На {d}: выгрузки {ok}/{all}; копии {bk}; сеансов {s}; диск копий свободно {free}. Копии не удаляю никогда; перенос старых копий в архив — по вашей фразе.', 'ai.bk.ok': 'выполнены', 'ai.bk.err': '— ошибка Effector Saver (нет места на диске копий)',
    'ai.a.ar': 'Дебиторка на {d}: {total} (по актам {billed}, без акта {unbilled}). Просрочено 30+ дней: {o30}. Больше всего: {top}.', 'ai.a.ar_none': 'просрочек нет', 'ai.a.ar_item': '{c} — {v}, {n} дн.',
    'ai.a.salary': 'Роль «{r}» — зарплата доступна (уровень «{lvl}»). Зарплата {d} на руки — {sal}; ФОТ с взносами за {p} — {fot}. Начальник объекта и охранник на такой запрос получают отказ.',
    'ai.a.rev_f': 'За {p} по объектам фильтра ({f}): выручка {rev}, результат после накладных {profit} ({m}).{ya} Чистая прибыль считается только по компании.', 'ai.a.ya': ' Год назад за те же дни выручка была {v}.',
    'ai.a.rev': 'За {p}: выручка {rev}, EBITDA {e} ({m}), чистая прибыль {net}.{ya}',
    'ai.a.tax': 'Налоги к уплате {d}: {v} (по зарплате {a}, НДС за квартал {b}, аванс КПН {c}, ИПН с дивидендов {e}). Расчёт — по данным 1С; платёж проводит главный бухгалтер.',
    'ai.a.contracts': 'Договоры на {d}: истекают за 7 дней — {a}, за 30 дней — {b}, за 60 дней — {c}{list}. Черновики допсоглашений подготовлю по шаблону; подпись — генеральный директор.', 'ai.a.contracts_none': '',
    'ai.a.free': 'Поручение {no} «{q}» принято · ступень 1 · срок 15 минут: подготовлю проект и покажу предпросмотр. Ответ строится по данным вашей роли за выбранный период ({p}).{f}', 'ai.a.flt': ' Фильтр: {f}.',
    'ai.a.preview': 'Предпросмотр по данным роли: {x}',
    'ai.a.file_read': 'Прочитал файл «{n}» ({c} симв.): «{x}».', 'ai.a.file_saved': 'Файл «{n}» сохранён и приложен к поручению — {why}.', 'ai.a.file_why': 'разбор pdf, Word, Excel и изображений появится на сервере Агентства', 'ai.a.files_only': 'Файлы получены.',
    'ai.a.voice_only': 'Голосовое сохранено. Расшифровка в этом браузере недоступна — помощник отвечает по тексту: напишите вопрос или надиктуйте его.',
    'ai.lvl.П': 'полный', 'ai.lvl.Б': 'свой блок', 'ai.lvl.Ч': 'чтение', 'ai.lvl.С': 'только свои', 'ai.lvl.·': 'нет доступа', 'ai.u.obj': ['объект','объекта','объектов'], 'ai.none': 'нет',
    'ai.sum.nomoney': 'Сводка на {d} · {r}{o}. Смены: открыто {a} из {b}{miss}. Задач на роли: {t}. Финансовые данные этой роли не показываются.',
    'ai.sum.miss': ', не открыты — {list} (замены подобраны)', 'ai.sum.allopen': ', все открыты', 'ai.sum.post': ', пост {n}',
    'ai.sum.full': 'Сводка на {d}. Смены: открыто {a} из {b}{miss}. Люди: {hr} сотрудников, отпуск {vac}, больничный {sick}. Деньги: {cash}; дебиторка {ar}, просрочено 30+ дней {o30}. Происшествий за сутки: {inc}{incl}. Предписаний не устранено: {pres}. 1С: выгрузки {ok}/{all}, копии {bk}.',
    'ai.sum.bk_ok': 'в порядке', 'ai.sum.bk_err': '— ошибка Effector Saver, нужно решение по диску копий (удалять нельзя)',
    'ai.st.done': 'выполнено', 'ai.st.work': 'в работе', 'ai.st.sign': 'ждёт подписи человека', 'ai.st.deny': 'отклонено по правам', 'ai.st.accepted': 'принято',
    'ai.e.title': 'Поручения ИИ', 'ai.e.new': 'Новое поручение', 'ai.e.q': 'Что сделать', 'ai.e.due': 'Срок', 'ai.e.min': '{n} мин', 'ai.e.to': 'Результат в', 'ai.e.to.aichat': 'чат помощника', 'ai.e.to.folder': 'папку роли', 'ai.e.to.task': 'задачу', 'ai.e.create': 'Поручить',
    'ai.e.f.st': 'Статус', 'ai.e.f.all': 'все', 'ai.e.f.who': 'Автор', 'ai.e.f.mine': 'своя роль', 'ai.e.f.everyone': 'все роли', 'ai.e.search': 'Поиск по тексту', 'ai.e.empty': 'Поручений по фильтру нет.', 'ai.e.new_pill': 'новое', 'ai.e.flag_pill': 'жалоба',
    'ai.e.cols': '№|Когда|Кто|Поручение|Ступень|Статус|Результат|Мин', 'ai.e.repeat': 'Повторить', 'ai.e.flag': 'Пожаловаться на ответ', 'ai.e.flagged': 'Жалоба на ответ {no} записана в журнал.', 'ai.e.task': 'Создать задачу из результата', 'ai.e.card': 'Поручение {no}',
    'ai.e.k.q': 'Поручение', 'ai.e.k.a': 'Ответ', 'ai.e.k.who': 'Кто', 'ai.e.k.step': 'Ступень', 'ai.e.k.time': 'Когда', 'ai.e.k.st': 'Статус', 'ai.e.k.res': 'Результат', 'ai.e.k.files': 'Вложения', 'ai.e.k.src': 'Источник', 'ai.e.k.dur': 'Время выполнения', 'ai.e.k.due': 'Срок', 'ai.e.sec': '{n} с',
    'ai.src.aichat': 'чат помощника', 'ai.src.routine': 'регламент', 'ai.src.card': 'карточка', 'ai.src.section': 'раздел', 'ai.src.chat': 'чат', 'ai.src.errands': 'форма поручения', 'ai.src.project': 'проект', 'ai.src.world': 'история компании',
    'ai.e.t7': 'Поручений за 7 дней', 'ai.e.t7d': 'выполнено {a} · в работе {b}', 'ai.e.avg': 'Среднее время', 'ai.e.avgv': '{n} мин', 'ai.e.avgd': 'норма — 15 минут', 'ai.e.c1': 'С записью в 1С', 'ai.e.c1d': 'перед каждой — копия базы, отмена 24 часа',
    'ai.e.den': 'Отклонено по правам', 'ai.e.dend': 'попытки получить чужие данные · в журнал', 'ai.e.duty': 'дежурство: каждые 5 минут движок берёт новые поручения; результат — в чат помощника, в папку роли или задачей',
    'ai.e.err_q': 'Напишите, что сделать.', 'ai.e.res.folder': 'файл в папке роли', 'ai.e.res.task': 'задача', 'ai.e.res.chat': 'ответ в чат', 'ai.e.res.c1': 'документ 1С + копия базы', 'ai.e.res.docx': 'файл .docx в папку роли',
    'ai.r.title': 'Регламентные поручения', 'ai.r.new': 'Новое регламентное поручение', 'ai.r.name': 'Название', 'ai.r.action': 'Что делает', 'ai.r.a.summary': 'сводка', 'ai.r.a.report': 'отчёт', 'ai.r.a.reminder': 'напоминание', 'ai.r.a.check': 'проверка', 'ai.r.a.custom': 'своё поручение',
    'ai.r.param': 'Какой отчёт или проверка', 'ai.r.text': 'Текст поручения или напоминания', 'ai.r.kind': 'Периодичность', 'ai.r.k.daily': 'ежедневно', 'ai.r.k.weekly': 'еженедельно', 'ai.r.k.monthly': 'ежемесячно', 'ai.r.time': 'Время', 'ai.r.dow': 'День недели', 'ai.r.dom': 'Число месяца',
    'ai.r.owner': 'Роль-владелец', 'ai.r.to': 'Куда класть результат', 'ai.r.to.aichat': 'чат помощника владельца', 'ai.r.to.chat': 'чат «{c}»', 'ai.r.to.folder': 'папка роли «{r}»', 'ai.r.to.task': 'задача владельцу', 'ai.r.to.kokpit': 'кокпит (сохранённый отчёт)',
    'ai.r.create': 'Создать', 'ai.r.save': 'Сохранить изменения', 'ai.r.run': 'Выполнить сейчас', 'ai.r.on': 'Включить', 'ai.r.off': 'Выключить', 'ai.r.edit': 'Изменить', 'ai.r.hist': 'История изменений', 'ai.r.preset': 'предустановленный', 'ai.r.enabled': 'включён', 'ai.r.disabled': 'выключен',
    'ai.r.next': 'Следующий запуск', 'ai.r.last': 'Последний запуск', 'ai.r.sched': 'Расписание', 'ai.r.sched_d': 'ежедневно {t}', 'ai.r.sched_w': 'еженедельно, {dw} {t}', 'ai.r.sched_m': 'ежемесячно, {n}-го {t}', 'ai.r.cols': 'Регламент|Расписание|Владелец|Результат в|Следующий|Последний|',
    'ai.r.note': 'Расписание работает в этом браузере, пока страница открыта (время — по часам компьютера); на сервере Агентства регламенты запускает планировщик движка 24/7.', 'ai.r.note_srv': 'Регламенты выполняет планировщик сервера Агентства 24/7 — страницу держать открытой не нужно.',
    'ai.r.ran': 'Регламент «{t}» выполнен: поручение {no}, результат — {to}.', 'ai.r.err_title': 'Укажите название регламента.', 'ai.r.err_to': 'Выберите, куда класть результат.', 'ai.r.err_text': 'Для своего поручения и напоминания нужен текст.',
    'ai.r.err_chat': 'Роль-владелец «{r}» не состоит в чате «{c}» — результат туда класть нельзя.', 'ai.r.created': 'Регламент {no} создан · следующий запуск — {n}.', 'ai.r.saved': 'Изменения регламента сохранены.', 'ai.r.rights': 'Чужие регламенты видят исполнительный директор, генеральный директор и администратор; остальные роли — свои.',
    'ai.r.catchup': 'пропущенный запуск — выполнен при открытии страницы', 'ai.r.empty': 'Регламентов нет.', 'ai.r.runs': 'запусков: {n}', 'ai.r.ro': 'Роль «{r}» не создаёт регламенты (уровень блока «ИИ» — «{l}»).', 'ai.r.reminder': 'Напоминание: {x}',
    'ai.p.summary': 'Сводка руководству', 'ai.p.staff': 'Расстановка и риски невыхода', 'ai.p.objrep': 'Отчёт по объекту для начальника охраны', 'ai.p.onec': 'Состояние 1С и копий', 'ai.p.week': 'Итоги недели', 'ai.p.month': 'Закрытие месяца', 'ai.p.tax': 'Налоги к уплате', 'ai.p.contracts': 'Договоры, истекающие за 60/30/7 дней',
    'ai.chk.staff': 'расстановка и риски невыхода', 'ai.chk.onec': '1С и копии', 'ai.chk.contracts': 'договоры за 60/30/7 дней', 'ai.chk.tax': 'налоги к уплате',
    'ai.j.title': 'Журнал помощника', 'ai.j.f.type': 'Тип', 'ai.j.t.all': 'все', 'ai.j.t.answer': 'ответы', 'ai.j.t.deny': 'отказы по правам', 'ai.j.t.routine': 'регламенты', 'ai.j.t.created': 'созданное помощником', 'ai.j.t.report': 'отчёты',
    'ai.j.f.per': 'Когда', 'ai.j.p.day': 'день «Данные на»', 'ai.j.p.week': '7 дней', 'ai.j.p.all': 'всё', 'ai.j.cols': 'Когда|Кто|Действие|Объект|Подробно', 'ai.j.csv': 'Выгрузить CSV', 'ai.j.world': 'история', 'ai.j.empty': 'Записей по фильтру нет.',
    'ai.j.own': 'Роль видит только свои записи; все записи — у исполнительного директора, генерального директора и администратора.', 'ai.j.ai': 'ИИ-помощник',
    'ai.j.answered': 'ответил на поручение', 'ai.j.denied': 'отклонил по правам', 'ai.j.sign': 'передал человеку на подпись', 'ai.j.work': 'принял поручение', 'ai.j.routine_run': 'выполнил регламент', 'ai.j.routine_new': 'создал регламент', 'ai.j.routine_edit': 'изменил регламент',
    'ai.j.routine_on': 'включил регламент', 'ai.j.routine_off': 'выключил регламент', 'ai.j.task': 'создал задачу', 'ai.j.project': 'создал проект', 'ai.j.report': 'сохранил отчёт', 'ai.j.flag': 'жалоба на ответ', 'ai.j.chat': 'отправил в чат', 'ai.j.file': 'положил файл в папку роли',
    'ai.rep.title': 'Отчёты помощника', 'ai.rep.morning': 'Утренняя сводка', 'ai.rep.week': 'Итоги недели', 'ai.rep.month': 'Закрытие месяца', 'ai.rep.object': 'Отчёт по объекту', 'ai.rep.project': 'Отчёт по проекту', 'ai.rep.tasks': 'Отчёт по задачам роли', 'ai.rep.ar': 'Дебиторка и письма', 'ai.rep.onec': '1С и копии',
    'ai.rep.save': 'Сохранить', 'ai.rep.chat': 'В чат', 'ai.rep.csv': 'CSV', 'ai.rep.saved': 'Сохранённые отчёты', 'ai.rep.none': 'Сохранённых отчётов нет.', 'ai.rep.deny': 'Отчёт «{k}» роли «{r}» недоступен: в нём {w}.', 'ai.rep.w.money': 'финансовые данные', 'ai.rep.w.onec': 'данные сервера и 1С', 'ai.rep.w.tasks': 'задачи',
    'ai.rep.obj': 'Объект', 'ai.rep.prj': 'Проект', 'ai.rep.k': 'Показатель', 'ai.rep.v': 'Значение', 'ai.rep.kokpit': 'в кокпит', 'ai.rep.pick': 'Выберите отчёт выше — он посчитается на дату «Данные на» и период по правам роли.', 'ai.rep.saved_cols': '№|Отчёт|На дату|Кто',
    'ai.rep.r.shifts': 'Смены открыто', 'ai.rep.r.missed': 'Не открыты', 'ai.rep.r.staff': 'Сотрудников', 'ai.rep.r.vac': 'Отпуск / больничный', 'ai.rep.r.cash': 'Деньги на дату', 'ai.rep.r.ar': 'Дебиторка', 'ai.rep.r.o30': 'Просрочено 30+ дней', 'ai.rep.r.inc': 'Происшествий',
    'ai.rep.r.chk': 'Проверок', 'ai.rep.r.presc': 'Предписаний не устранено', 'ai.rep.r.onec': '1С: выгрузки', 'ai.rep.r.bk': 'Ночные копии', 'ai.rep.r.tc': 'Задач создано', 'ai.rep.r.td': 'Задач закрыто', 'ai.rep.r.err': 'Поручений ИИ', 'ai.rep.r.rev': 'Выручка', 'ai.rep.r.ebitda': 'EBITDA',
    'ai.rep.r.net': 'Чистая прибыль', 'ai.rep.r.vat': 'НДС', 'ai.rep.r.ptax': 'Налоги с зарплаты', 'ai.rep.r.region': 'Регион, город', 'ai.rep.r.kind': 'Вид объекта', 'ai.rep.r.posts': 'Постов', 'ai.rep.r.sched': 'График', 'ai.rep.r.contract': 'Договор до', 'ai.rep.r.profit': 'Результат после накладных', 'ai.rep.r.margin': 'Маржа',
    'ai.rep.r.deadline': 'Срок', 'ai.rep.r.prog': 'Готово', 'ai.rep.r.stage': 'Сейчас', 'ai.rep.r.tasks': 'Задач', 'ai.rep.r.owner': 'Руководитель',
    'ai.rep.t.cols': '№|Задача|Статус|Срок', 'ai.rep.ar.cols': 'Заказчик|Долг|Просрочено|Дней|Письмо', 'ai.rep.ar.letter': 'черновик готов', 'ai.rep.ar.none': '—', 'ai.rep.onec.cols': 'Дата|Выгрузки|Копии|Сеансы|Ошибки', 'ai.rep.ok': 'OK', 'ai.rep.fail': 'ошибка',
    'ai.rep.week_text': 'Итоги недели {a} – {b}: смен не открыто {miss} из {plan}; происшествий {inc}, проверок {chk}; задач создано {tc}, закрыто {td}; поручений ИИ {er}.{money}', 'ai.rep.week_money': ' Выручка за неделю {rev}, EBITDA {e}.',
    'ai.rep.month_text': 'Закрытие месяца {m}: выручка {rev}, EBITDA {e}, чистая прибыль {net}; НДС {vat}, налоги с зарплаты {pt}; дебиторка на {d} — {ar}. Чек-лист закрытия — в разделе «Платежи и закрытие».', 'ai.rep.month_none': 'Закрытого месяца на эту дату нет.',
    'ai.rep.obj_text': '{o} ({c}): постов {posts}, график {s}; за {p} смен не открыто {miss} из {plan}, происшествий {inc}, проверок {chk}; договор до {ce}.{money}', 'ai.rep.obj_money': ' Выручка {rev}, результат после накладных {profit} ({m}).',
    'ai.rep.tasks_text': 'Задачи роли «{r}» на {d}: открыто {n}, просрочено {late}, на проверке {rev}.', 'ai.rep.ar_text': 'Дебиторка на {d}: {total}, просрочено 30+ дней {o30}. Письма-напоминания подготовлены для {n} заказчиков (черновики; отправляет человек).',
    'ai.rep.onec_text': '1С за 7 дней по {d}: выгрузки приняты {ok} из {all}, ночные копии выполнены {bk} из 7, диск копий свободно {free}. Копии не удаляются никогда.',
    'ai.pr.title': 'Проекты', 'ai.pr.sum': 'Сводка по проекту', 'ai.pr.week': 'Что сделать на этой неделе', 'ai.pr.open': 'Открыть', 'ai.pr.new': 'Новый проект с помощью ИИ', 'ai.pr.goal': 'Цель проекта одной строкой', 'ai.pr.propose': 'Предложить этапы',
    'ai.pr.create': 'Создать проект и задачи', 'ai.pr.stages': 'Этапы, которые предлагает помощник', 'ai.pr.created': 'Проект {no} «{n}» создан, задач по этапам: {k}.', 'ai.pr.none': 'На эту дату проектов нет.', 'ai.pr.live': 'новый', 'ai.pr.err_goal': 'Напишите цель проекта.',
    'ai.pr.sum_q': 'Сводка по проекту «{n}»', 'ai.pr.week_q': 'Что сделать на этой неделе по проекту «{n}»', 'ai.pr.ro': 'Роль «{r}» видит проекты только для чтения.', 'ai.pr.done': 'завершён',
    'ai.pr.sum_text': '«{n}»: руководитель — {o}; срок {a} – {b}; готово {p}; этапы: {st}; сейчас — {cur}. Задач: {t}{late}.', 'ai.pr.late': ' · отстаёт от графика',
    'ai.pr.week_text': 'На неделю до {d} по проекту «{n}»: {list}.', 'ai.pr.week_stage': 'задач со сроком на этой неделе нет — в работе этап «{s}», до конца проекта {k} дн.',
    'ai.tpl.year': 'инвентаризация|акты сверки с заказчиками|резервы отпусков|годовая ФНО|аудит баланса', 'ai.tpl.tender': 'мониторинг госзакупок|осмотр и расчёт тарифа|заявка|договор|выставление постов',
    'ai.tpl.buy': 'потребность по нормам|сравнение коммерческих предложений|заявка на оплату|приёмка на склад|выдача на объекты', 'ai.tpl.cert': 'список и направления|обучение|экзамен|удостоверения в реестр',
    'ai.tpl.budget': 'драйверы|бюджеты блоков|свод БДР и БДДС|согласование ГД|утверждение учредителем', 'ai.tpl.check': 'лицензия и приложения|журналы постов|инструктажи|самопроверка|устранение замечаний',
    'ai.tpl.fleet': 'выбор модели|договор лизинга|аванс|поставка|оклейка и рации', 'ai.tpl.conn': 'доступ и вебхук на сервере|справочники и структура|чтение данных|двусторонний обмен|проверка и запуск',
    'ai.tpl.any': 'цель и состав работ|ответственные и сроки|исполнение|проверка результата|закрытие проекта',
    'ai.page.title': 'Ассистенты и наставники', 'ai.page.sub': 'ассистент (делает) и наставник (учит) на каждую роль · поручения · регламенты · журнал · отчёты', 'ai.page.open': 'Открыть ИИ-помощника', 'ai.page.sum': 'Утренняя сводка на {d}', 'ai.page.sum_note': 'выберите другую дату вверху — сводка пересчитается',
    'ai.role.asst': 'Ассистент · {n}', 'ai.role.mentor': 'Наставник · {n}', 'ai.role.rep': 'Отчёты', 'ai.role.daily': 'Ежедневно:', 'ai.role.weekly': 'Еженедельно:', 'ai.role.monthly': 'Ежемесячно:',
    'ai.prompt': 'Ты — ИИ-помощник системы SUNKAR BI охранного агентства ТОО «SUNKAR SECURITY SERVICES» (Казахстан). Ступень 1: советуешь, объясняешь и готовишь черновики; платежи, подписи, доступы и записи в 1С делают люди. Отвечай по-русски, кратко (до {w} слов), только по данным ниже и в пределах прав роли. Если данных не хватает — так и скажи и предложи, кому поручить. Не выдумывай цифры и имена, не раскрывай персональные данные. Все данные демонстрационные.',
    'ai.prompt.data': 'ДАННЫЕ', 'ai.prompt.q': 'ВОПРОС', 'ai.prompt.dialog': 'Последние реплики диалога', 'ai.prompt.files': 'Вложения', 'ai.prompt.section': 'Открыт раздел: {s}', 'ai.prompt.card': 'Открыта карточка: {c}',
    'ai.ctx.role': 'Роль спрашивающего: {r} ({m}). Права: {rights}.', 'ai.ctx.date': 'Дата «Данные на»: {d}; период: {l}, {p}.', 'ai.ctx.obj': 'Свой объект: {o}, {k}, {c}, постов {posts}, график {s}; сегодня {st}.',
    'ai.ctx.objs': 'Объекты на дату: {n}, постов {posts}; не открыты смены: {miss}.', 'ai.ctx.hr': 'Сотрудников {n}: охранников {g}, администрация {a}; удостоверений истекает за 30 дней {c}.',
    'ai.ctx.money': 'За период: выручка {rev}, EBITDA {e}, чистая прибыль {net}. Деньги на дату {cash}; дебиторка {ar}, просрочка 30+ {o30}; зарплата {sd} — {sal}, налоги {td} — {tax}.',
    'ai.ctx.onec': '1С: выгрузки {ok} из {all}; ночная копия Effector Saver {bk}.', 'ai.ctx.bk_ok': 'выполнена', 'ai.ctx.bk_err': 'не выполнена (мало места на диске копий)', 'ai.ctx.tasks': 'Новые задачи в работе: {list}.',
  });
  I.add('en', {
    'ai.title': 'AI assistant', 'ai.step': '· level 1: advises and prepares', 'ai.panel': 'AI assistant panel',
    'ai.mode.side': 'Dock right', 'ai.mode.bottom': 'Dock bottom', 'ai.mode.full': 'Expand to full screen', 'ai.mode.unfull': 'Exit full screen', 'ai.mode.min': 'Minimize to a bar', 'ai.close': 'Close',
    'ai.grip.w': 'Resize panel width', 'ai.grip.h': 'Resize panel height', 'ai.corner': 'Resize panel width and height', 'ai.min.open': 'Expand the AI assistant', 'ai.unread': 'new replies: {n}',
    'ai.tab.chat': 'Chat', 'ai.tab.projects': 'Projects', 'ai.tab.errands': 'Errands', 'ai.tab.routines': 'Routines', 'ai.tab.journal': 'Log', 'ai.tab.reports': 'Reports', 'ai.tab.overview': 'Overview', 'ai.tabs': 'Assistant tabs',
    'ai.launch': 'The AI assistant has been connected since {d} — on {at} there are no errands, summaries, AI messages or routine errands.', 'ai.noaccess': 'Role “{r}”: the AI assistant is not available (level “no access”).',
    'ai.ph': 'Ask or assign within your role’s data… (no ID numbers or personal data)', 'ai.q': 'Question or errand', 'ai.send': 'Send', 'ai.clip': 'Attach files', 'ai.mic': 'Dictate — speech recognition', 'ai.mic.stop': 'Stop dictation',
    'ai.voice': 'Record a voice message', 'ai.rec.stop': 'Done', 'ai.rec.cancel': 'Cancel', 'ai.rec.on': 'Recording a voice message · up to 3 minutes · Esc — cancel',
    'ai.speech.none': 'Speech recognition is not available in this browser — type the text or record a voice message.', 'ai.speech.denied': 'No access to the microphone — allow the microphone for this page in the browser settings.',
    'ai.speech.network': 'The browser’s speech recognition service is unavailable right now — type the question.', 'ai.speech.nospeech': 'No speech recognized — try again.', 'ai.speech.err': 'Speech recognition stopped ({e}).', 'ai.speech.listen': 'Listening… speak; a 2-second pause ends it.',
    'ai.rec.none': 'Voice recording is not available in this browser.', 'ai.rec.cancelled': 'Recording cancelled.', 'ai.rec.empty': 'The recording is empty — voice message not saved.', 'ai.rec.err': 'Voice message not recorded: {e}', 'ai.rec.max': 'Recording stopped: voice messages are up to 3 minutes.',
    'ai.att.limit': 'No more than 10 files and 15 MB per message.', 'ai.att.remove': 'Remove file {n}', 'ai.att.err': 'File “{n}” not saved: {e}',
    'ai.att.hint': 'The assistant reads text files (txt, csv, md, json) and answers by their content; images, pdf, Word and Excel are only saved and attached to an errand, task or chat in this version — parsing them will come with the agency server.',
    'ai.att.saved_only': 'saved only', 'ai.att.read': 'text read', 'ai.att.local': 'only in this browser', 'ai.att.demo': 'demo file', 'ai.att.open': 'open',
    'ai.att.to_task': 'To a task', 'ai.att.to_chat': 'To a chat', 'ai.att.to_folder': 'To role folder', 'ai.att.in_folder': 'in folder “{r}”', 'ai.att.task_title': 'File: {n}', 'ai.att.sent': 'File “{n}” sent to “{c}”.', 'ai.att.foldered': 'File “{n}” put into the role folder “{r}” (Documents section).',
    'ai.transcript': 'draft transcript', 'ai.tr.none': 'The voice transcription service is not connected on the server — the assistant answers text.', 'ai.voice.msg': 'voice · {s} s',
    'ai.more': 'Show more ({n})', 'ai.thinking': 'Thinking…', 'ai.did': 'What I did:', 'ai.did.errand': 'errand {no} · {st}', 'ai.did.open': 'open the section',
    'ai.act.task': 'Create a task from the answer', 'ai.act.chat': 'Send to a chat', 'ai.act.report': 'Save as a report', 'ai.act.done_task': 'Task created: “{t}”.', 'ai.act.done_chat': 'Sent to “{c}”.', 'ai.act.done_report': 'Report {no} saved (Reports tab).',
    'ai.err.busy': 'The AI is busy — try again in a minute.', 'ai.err.notgranted': ' (AI answer — after permission on the page)', 'ai.err.fail': 'The AI did not answer right now — a built-in answer from your role’s data is below.',
    'ai.mode.sample': 'mode: AI answers from your role’s data', 'ai.mode.server': 'mode: agency server — rights, errands and the log are checked and written by the server', 'ai.mode.builtin': 'mode: built-in answers from your role’s data · AI answers — on the published page and on the agency server', 'ai.ro': 'view only for you — new records are not saved',
    'ai.who.duty': 'duty director', 'ai.who.access': 'access', 'ai.who.helper': 'assistant', 'ai.who.shift': 'site duty officer', 'ai.who.analyst': 'accounting analyst', 'ai.who.onec': 'virtual 1C administrator', 'ai.who.routine': 'routine', 'ai.who.lawyer': 'virtual lawyer', 'ai.roleas': 'AI · assistant',
    'ai.a.more': 'Errand {no} accepted · level 1 · due in 15 minutes: I will gather details on the card within the rights of the role “{r}”.',
    'ai.a.deny_salary': 'Role “{r}”: other employees’ salaries are not available (level “no access”). Errand {no} was rejected and logged.',
    'ai.a.deny_money': 'Role “{r}”: financial data is not available (level “no access”). Errand {no} was rejected and logged.',
    'ai.a.deny_obj': 'Role “{r}” sees only its own site. Errand {no} was rejected and logged.',
    'ai.a.deny_block': 'Role “{r}”: the “{b}” block is not available (level “no access”). Errand {no} was rejected and logged.',
    'ai.a.human': 'Errand {no}: the AI does not sign, pay, change access rights or delete data. I will prepare a draft and hand it to a person — status “awaiting a person’s signature”.',
    'ai.a.staff': 'On {d}: {posts} posts, {n} not covered{list}. Staffing {p}. Formula: covered posts ÷ contracted posts on the date.',
    'ai.a.staff_obj': '{o} on {d}: {posts} posts, {st}. Other sites’ data is not available to this role.', 'ai.a.staff_obj_miss': 'post {n} has not checked in — a replacement is on the way', 'ai.a.staff_obj_ok': 'all posts covered',
    'ai.a.risk': ' No-show risks for tomorrow: vacation {vac}, sick leave {sick} — reserve picked from the nearest sites.',
    'ai.a.term': 'terminated in the period', 'ai.a.loss_term': ' (incl. terminated in the period — {n})', 'ai.a.loss': 'For {p}, {n} {u} are loss-making: {list}. Common causes — a day-post rate below break-even and overtime due to vacancies.',
    'ai.a.onec': 'On {d}: exports {ok}/{all}; backups {bk}; {s} sessions; backup disk free {free}. I never delete backups; moving old backups to the archive — on your phrase.', 'ai.bk.ok': 'done', 'ai.bk.err': '— Effector Saver error (no space on the backup disk)',
    'ai.a.ar': 'Receivables on {d}: {total} (invoiced {billed}, not yet invoiced {unbilled}). Overdue 30+ days: {o30}. Largest: {top}.', 'ai.a.ar_none': 'no overdue', 'ai.a.ar_item': '{c} — {v}, {n} days',
    'ai.a.salary': 'Role “{r}” — salaries are available (level “{lvl}”). Net salary on {d} — {sal}; payroll with contributions for {p} — {fot}. A site manager or a guard gets a refusal for such a request.',
    'ai.a.rev_f': 'For {p}, sites in the filter ({f}): revenue {rev}, result after overheads {profit} ({m}).{ya} Net profit is calculated only for the company.', 'ai.a.ya': ' A year ago, revenue for the same days was {v}.',
    'ai.a.rev': 'For {p}: revenue {rev}, EBITDA {e} ({m}), net profit {net}.{ya}',
    'ai.a.tax': 'Taxes payable on {d}: {v} (payroll {a}, quarterly VAT {b}, CIT advance {c}, IIT on dividends {e}). Based on 1C data; the chief accountant makes the payment.',
    'ai.a.contracts': 'Contracts on {d}: expiring within 7 days — {a}, within 30 days — {b}, within 60 days — {c}{list}. I will prepare draft amendments from the template; the general director signs.', 'ai.a.contracts_none': '',
    'ai.a.free': 'Errand {no} “{q}” accepted · level 1 · due in 15 minutes: I will prepare a draft and show a preview. The answer uses your role’s data for the selected period ({p}).{f}', 'ai.a.flt': ' Filter: {f}.',
    'ai.a.preview': 'Preview from your role’s data: {x}',
    'ai.a.file_read': 'I read the file “{n}” ({c} chars): “{x}”.', 'ai.a.file_saved': 'File “{n}” saved and attached to the errand — {why}.', 'ai.a.file_why': 'parsing pdf, Word, Excel and images will come with the agency server', 'ai.a.files_only': 'Files received.',
    'ai.a.voice_only': 'Voice message saved. Transcription is not available in this browser — the assistant answers text: type or dictate the question.',
    'ai.lvl.П': 'full', 'ai.lvl.Б': 'own block', 'ai.lvl.Ч': 'read', 'ai.lvl.С': 'own only', 'ai.lvl.·': 'no access', 'ai.u.obj': ['site','sites','sites'], 'ai.none': 'none',
    'ai.sum.nomoney': 'Summary on {d} · {r}{o}. Shifts: {a} of {b} opened{miss}. Tasks for the role: {t}. Financial data is not shown to this role.',
    'ai.sum.miss': ', not opened — {list} (replacements found)', 'ai.sum.allopen': ', all opened', 'ai.sum.post': ', post {n}',
    'ai.sum.full': 'Summary on {d}. Shifts: {a} of {b} opened{miss}. People: {hr} employees, on vacation {vac}, sick {sick}. Money: {cash}; receivables {ar}, overdue 30+ days {o30}. Incidents in 24 hours: {inc}{incl}. Open prescriptions: {pres}. 1C: exports {ok}/{all}, backups {bk}.',
    'ai.sum.bk_ok': 'fine', 'ai.sum.bk_err': '— Effector Saver error, a decision on the backup disk is needed (deleting is not allowed)',
    'ai.st.done': 'done', 'ai.st.work': 'in progress', 'ai.st.sign': 'awaiting a person’s signature', 'ai.st.deny': 'rejected by rights', 'ai.st.accepted': 'accepted',
    'ai.e.title': 'AI errands', 'ai.e.new': 'New errand', 'ai.e.q': 'What to do', 'ai.e.due': 'Due', 'ai.e.min': '{n} min', 'ai.e.to': 'Result to', 'ai.e.to.aichat': 'assistant chat', 'ai.e.to.folder': 'role folder', 'ai.e.to.task': 'a task', 'ai.e.create': 'Assign',
    'ai.e.f.st': 'Status', 'ai.e.f.all': 'all', 'ai.e.f.who': 'Author', 'ai.e.f.mine': 'my role', 'ai.e.f.everyone': 'all roles', 'ai.e.search': 'Search text', 'ai.e.empty': 'No errands match the filter.', 'ai.e.new_pill': 'new', 'ai.e.flag_pill': 'complaint',
    'ai.e.cols': 'No.|When|Who|Errand|Level|Status|Result|Min', 'ai.e.repeat': 'Repeat', 'ai.e.flag': 'Complain about the answer', 'ai.e.flagged': 'A complaint about answer {no} was logged.', 'ai.e.task': 'Create a task from the result', 'ai.e.card': 'Errand {no}',
    'ai.e.k.q': 'Errand', 'ai.e.k.a': 'Answer', 'ai.e.k.who': 'Who', 'ai.e.k.step': 'Level', 'ai.e.k.time': 'When', 'ai.e.k.st': 'Status', 'ai.e.k.res': 'Result', 'ai.e.k.files': 'Attachments', 'ai.e.k.src': 'Source', 'ai.e.k.dur': 'Completion time', 'ai.e.k.due': 'Due', 'ai.e.sec': '{n} s',
    'ai.src.aichat': 'assistant chat', 'ai.src.routine': 'routine', 'ai.src.card': 'card', 'ai.src.section': 'section', 'ai.src.chat': 'chat', 'ai.src.errands': 'errand form', 'ai.src.project': 'project', 'ai.src.world': 'company history',
    'ai.e.t7': 'Errands in 7 days', 'ai.e.t7d': 'done {a} · in progress {b}', 'ai.e.avg': 'Average time', 'ai.e.avgv': '{n} min', 'ai.e.avgd': 'norm — 15 minutes', 'ai.e.c1': 'With a 1C entry', 'ai.e.c1d': 'a database backup before each · undo within 24 hours',
    'ai.e.den': 'Rejected by rights', 'ai.e.dend': 'attempts to get others’ data · logged', 'ai.e.duty': 'duty: every 5 minutes the engine takes new errands; the result goes to the assistant chat, the role folder or a task',
    'ai.e.err_q': 'Write what to do.', 'ai.e.res.folder': 'file in the role folder', 'ai.e.res.task': 'task', 'ai.e.res.chat': 'answer in chat', 'ai.e.res.c1': '1C document + database backup', 'ai.e.res.docx': '.docx file to the role folder',
    'ai.r.title': 'Routine errands', 'ai.r.new': 'New routine errand', 'ai.r.name': 'Name', 'ai.r.action': 'What it does', 'ai.r.a.summary': 'summary', 'ai.r.a.report': 'report', 'ai.r.a.reminder': 'reminder', 'ai.r.a.check': 'check', 'ai.r.a.custom': 'custom errand',
    'ai.r.param': 'Which report or check', 'ai.r.text': 'Errand or reminder text', 'ai.r.kind': 'Frequency', 'ai.r.k.daily': 'daily', 'ai.r.k.weekly': 'weekly', 'ai.r.k.monthly': 'monthly', 'ai.r.time': 'Time', 'ai.r.dow': 'Weekday', 'ai.r.dom': 'Day of month',
    'ai.r.owner': 'Owner role', 'ai.r.to': 'Where to put the result', 'ai.r.to.aichat': 'owner’s assistant chat', 'ai.r.to.chat': 'chat “{c}”', 'ai.r.to.folder': 'role folder “{r}”', 'ai.r.to.task': 'task for the owner', 'ai.r.to.kokpit': 'cockpit (saved report)',
    'ai.r.create': 'Create', 'ai.r.save': 'Save changes', 'ai.r.run': 'Run now', 'ai.r.on': 'Enable', 'ai.r.off': 'Disable', 'ai.r.edit': 'Edit', 'ai.r.hist': 'Change history', 'ai.r.preset': 'preset', 'ai.r.enabled': 'enabled', 'ai.r.disabled': 'disabled',
    'ai.r.next': 'Next run', 'ai.r.last': 'Last run', 'ai.r.sched': 'Schedule', 'ai.r.sched_d': 'daily {t}', 'ai.r.sched_w': 'weekly, {dw} {t}', 'ai.r.sched_m': 'monthly, day {n} {t}', 'ai.r.cols': 'Routine|Schedule|Owner|Result to|Next|Last|',
    'ai.r.note_srv': 'Routines are run by the agency server scheduler 24/7 — the page does not need to stay open.', 'ai.r.note': 'The schedule runs in this browser while the page is open (time — by the computer clock); on the agency server routines are run by the engine scheduler 24/7.',
    'ai.r.ran': 'Routine “{t}” done: errand {no}, result — {to}.', 'ai.r.err_title': 'Enter the routine name.', 'ai.r.err_to': 'Choose where to put the result.', 'ai.r.err_text': 'A custom errand or a reminder needs text.',
    'ai.r.err_chat': 'The owner role “{r}” is not a member of the chat “{c}” — the result cannot go there.', 'ai.r.created': 'Routine {no} created · next run — {n}.', 'ai.r.saved': 'Routine changes saved.', 'ai.r.rights': 'Others’ routines are visible to the executive director, the general director and the administrator; other roles see their own.',
    'ai.r.catchup': 'missed run — done when the page was opened', 'ai.r.empty': 'No routines.', 'ai.r.runs': 'runs: {n}', 'ai.r.ro': 'Role “{r}” does not create routines (AI block level — “{l}”).', 'ai.r.reminder': 'Reminder: {x}',
    'ai.p.summary': 'Summary for management', 'ai.p.staff': 'Staffing and no-show risks', 'ai.p.objrep': 'Site report for the head of security', 'ai.p.onec': '1C and backups status', 'ai.p.week': 'Week results', 'ai.p.month': 'Month close', 'ai.p.tax': 'Taxes payable', 'ai.p.contracts': 'Contracts expiring in 60/30/7 days',
    'ai.chk.staff': 'staffing and no-show risks', 'ai.chk.onec': '1C and backups', 'ai.chk.contracts': 'contracts in 60/30/7 days', 'ai.chk.tax': 'taxes payable',
    'ai.j.title': 'Assistant log', 'ai.j.f.type': 'Type', 'ai.j.t.all': 'all', 'ai.j.t.answer': 'answers', 'ai.j.t.deny': 'rights refusals', 'ai.j.t.routine': 'routines', 'ai.j.t.created': 'created by the assistant', 'ai.j.t.report': 'reports',
    'ai.j.f.per': 'When', 'ai.j.p.day': '“Data as of” day', 'ai.j.p.week': '7 days', 'ai.j.p.all': 'all', 'ai.j.cols': 'When|Who|Action|Object|Details', 'ai.j.csv': 'Export CSV', 'ai.j.world': 'history', 'ai.j.empty': 'No records match the filter.',
    'ai.j.own': 'The role sees only its own records; all records — the executive director, the general director and the administrator.', 'ai.j.ai': 'AI assistant',
    'ai.j.answered': 'answered an errand', 'ai.j.denied': 'rejected by rights', 'ai.j.sign': 'handed to a person for signature', 'ai.j.work': 'accepted an errand', 'ai.j.routine_run': 'ran a routine', 'ai.j.routine_new': 'created a routine', 'ai.j.routine_edit': 'changed a routine',
    'ai.j.routine_on': 'enabled a routine', 'ai.j.routine_off': 'disabled a routine', 'ai.j.task': 'created a task', 'ai.j.project': 'created a project', 'ai.j.report': 'saved a report', 'ai.j.flag': 'complaint about an answer', 'ai.j.chat': 'sent to a chat', 'ai.j.file': 'put a file into the role folder',
    'ai.rep.title': 'Assistant reports', 'ai.rep.morning': 'Morning summary', 'ai.rep.week': 'Week results', 'ai.rep.month': 'Month close', 'ai.rep.object': 'Site report', 'ai.rep.project': 'Project report', 'ai.rep.tasks': 'Role tasks report', 'ai.rep.ar': 'Receivables and letters', 'ai.rep.onec': '1C and backups',
    'ai.rep.save': 'Save', 'ai.rep.chat': 'To a chat', 'ai.rep.csv': 'CSV', 'ai.rep.saved': 'Saved reports', 'ai.rep.none': 'No saved reports.', 'ai.rep.deny': 'Report “{k}” is not available to role “{r}”: it contains {w}.', 'ai.rep.w.money': 'financial data', 'ai.rep.w.onec': 'server and 1C data', 'ai.rep.w.tasks': 'tasks',
    'ai.rep.obj': 'Site', 'ai.rep.prj': 'Project', 'ai.rep.k': 'Indicator', 'ai.rep.v': 'Value', 'ai.rep.kokpit': 'to the cockpit', 'ai.rep.pick': 'Pick a report above — it is calculated for the “Data as of” date and the period within your role’s rights.', 'ai.rep.saved_cols': 'No.|Report|As of|Who',
    'ai.rep.r.shifts': 'Shifts opened', 'ai.rep.r.missed': 'Not opened', 'ai.rep.r.staff': 'Employees', 'ai.rep.r.vac': 'Vacation / sick leave', 'ai.rep.r.cash': 'Cash on the date', 'ai.rep.r.ar': 'Receivables', 'ai.rep.r.o30': 'Overdue 30+ days', 'ai.rep.r.inc': 'Incidents',
    'ai.rep.r.chk': 'Inspections', 'ai.rep.r.presc': 'Open prescriptions', 'ai.rep.r.onec': '1C: exports', 'ai.rep.r.bk': 'Nightly backups', 'ai.rep.r.tc': 'Tasks created', 'ai.rep.r.td': 'Tasks closed', 'ai.rep.r.err': 'AI errands', 'ai.rep.r.rev': 'Revenue', 'ai.rep.r.ebitda': 'EBITDA',
    'ai.rep.r.net': 'Net profit', 'ai.rep.r.vat': 'VAT', 'ai.rep.r.ptax': 'Payroll taxes', 'ai.rep.r.region': 'Region, city', 'ai.rep.r.kind': 'Site type', 'ai.rep.r.posts': 'Posts', 'ai.rep.r.sched': 'Schedule', 'ai.rep.r.contract': 'Contract until', 'ai.rep.r.profit': 'Result after overheads', 'ai.rep.r.margin': 'Margin',
    'ai.rep.r.deadline': 'Deadline', 'ai.rep.r.prog': 'Done', 'ai.rep.r.stage': 'Now', 'ai.rep.r.tasks': 'Tasks', 'ai.rep.r.owner': 'Lead',
    'ai.rep.t.cols': 'No.|Task|Status|Due', 'ai.rep.ar.cols': 'Customer|Debt|Overdue|Days|Letter', 'ai.rep.ar.letter': 'draft ready', 'ai.rep.ar.none': '—', 'ai.rep.onec.cols': 'Date|Exports|Backups|Sessions|Errors', 'ai.rep.ok': 'OK', 'ai.rep.fail': 'error',
    'ai.rep.week_text': 'Week results {a} – {b}: {miss} of {plan} shifts not opened; {inc} incidents, {chk} inspections; tasks created {tc}, closed {td}; AI errands {er}.{money}', 'ai.rep.week_money': ' Revenue for the week {rev}, EBITDA {e}.',
    'ai.rep.month_text': 'Month close {m}: revenue {rev}, EBITDA {e}, net profit {net}; VAT {vat}, payroll taxes {pt}; receivables on {d} — {ar}. The closing checklist is in Payments & close.', 'ai.rep.month_none': 'There is no closed month for this date.',
    'ai.rep.obj_text': '{o} ({c}): {posts} posts, schedule {s}; for {p}, {miss} of {plan} shifts not opened, {inc} incidents, {chk} inspections; contract until {ce}.{money}', 'ai.rep.obj_money': ' Revenue {rev}, result after overheads {profit} ({m}).',
    'ai.rep.tasks_text': 'Tasks of the role “{r}” on {d}: open {n}, overdue {late}, under review {rev}.', 'ai.rep.ar_text': 'Receivables on {d}: {total}, overdue 30+ days {o30}. Reminder letters are prepared for {n} customers (drafts; a person sends them).',
    'ai.rep.onec_text': '1C for 7 days to {d}: exports accepted {ok} of {all}, nightly backups done {bk} of 7, backup disk free {free}. Backups are never deleted.',
    'ai.pr.title': 'Projects', 'ai.pr.sum': 'Project summary', 'ai.pr.week': 'What to do this week', 'ai.pr.open': 'Open', 'ai.pr.new': 'New project with AI', 'ai.pr.goal': 'Project goal in one line', 'ai.pr.propose': 'Suggest stages',
    'ai.pr.create': 'Create the project and tasks', 'ai.pr.stages': 'Stages suggested by the assistant', 'ai.pr.created': 'Project {no} “{n}” created, tasks by stage: {k}.', 'ai.pr.none': 'No projects on this date.', 'ai.pr.live': 'new', 'ai.pr.err_goal': 'Write the project goal.',
    'ai.pr.sum_q': 'Summary of the project “{n}”', 'ai.pr.week_q': 'What to do this week on the project “{n}”', 'ai.pr.ro': 'Role “{r}” sees projects read-only.', 'ai.pr.done': 'completed',
    'ai.pr.sum_text': '“{n}”: lead — {o}; term {a} – {b}; done {p}; stages: {st}; now — {cur}. Tasks: {t}{late}.', 'ai.pr.late': ' · behind schedule',
    'ai.pr.week_text': 'For the week to {d} on the project “{n}”: {list}.', 'ai.pr.week_stage': 'no tasks due this week — the stage “{s}” is in progress, {k} days to the project end.',
    'ai.tpl.year': 'inventory|reconciliation statements with customers|vacation reserves|annual tax return|balance sheet audit', 'ai.tpl.tender': 'public procurement monitoring|site visit and rate calculation|bid|contract|posting the guards',
    'ai.tpl.buy': 'needs by norms|comparing commercial offers|payment request|warehouse receipt|issue to sites', 'ai.tpl.cert': 'list and referrals|training|exam|certificates to the register',
    'ai.tpl.budget': 'drivers|block budgets|P&L and cash-flow budget roll-up|GD approval|founder approval', 'ai.tpl.check': 'license and annexes|post logs|briefings|self-inspection|fixing remarks',
    'ai.tpl.fleet': 'model selection|leasing contract|advance payment|delivery|branding and radios', 'ai.tpl.conn': 'server access and webhook|directories and structure|data reading|two-way exchange|testing and launch',
    'ai.tpl.any': 'goal and scope|owners and deadlines|execution|result check|project close',
    'ai.page.title': 'Assistants and mentors', 'ai.page.sub': 'an assistant (does) and a mentor (teaches) for every role · errands · routines · log · reports', 'ai.page.open': 'Open the AI assistant', 'ai.page.sum': 'Morning summary on {d}', 'ai.page.sum_note': 'pick another date at the top — the summary recalculates',
    'ai.role.asst': 'Assistant · {n}', 'ai.role.mentor': 'Mentor · {n}', 'ai.role.rep': 'Reports', 'ai.role.daily': 'Daily:', 'ai.role.weekly': 'Weekly:', 'ai.role.monthly': 'Monthly:',
    'ai.prompt': 'You are the AI assistant of SUNKAR BI, the system of the security agency SUNKAR SECURITY SERVICES LLP (Kazakhstan). Level 1: you advise, explain and prepare drafts; payments, signatures, access rights and 1C entries are done by people. Answer in English, briefly (up to {w} words), only from the data below and within the role’s rights. If data is missing, say so and suggest whom to assign. Do not invent numbers or names, do not reveal personal data. All data is demo data.',
    'ai.prompt.data': 'DATA', 'ai.prompt.q': 'QUESTION', 'ai.prompt.dialog': 'Last dialogue turns', 'ai.prompt.files': 'Attachments', 'ai.prompt.section': 'Open section: {s}', 'ai.prompt.card': 'Open card: {c}',
    'ai.ctx.role': 'Asking role: {r} ({m}). Rights: {rights}.', 'ai.ctx.date': '“Data as of” date: {d}; period: {l}, {p}.', 'ai.ctx.obj': 'Own site: {o}, {k}, {c}, {posts} posts, schedule {s}; today {st}.',
    'ai.ctx.objs': 'Sites on the date: {n}, {posts} posts; shifts not opened: {miss}.', 'ai.ctx.hr': '{n} employees: {g} guards, {a} administration; certificates expiring within 30 days {c}.',
    'ai.ctx.money': 'For the period: revenue {rev}, EBITDA {e}, net profit {net}. Cash on the date {cash}; receivables {ar}, overdue 30+ {o30}; salary {sd} — {sal}, taxes {td} — {tax}.',
    'ai.ctx.onec': '1C: exports {ok} of {all}; Effector Saver nightly backup {bk}.', 'ai.ctx.bk_ok': 'done', 'ai.ctx.bk_err': 'not done (low space on the backup disk)', 'ai.ctx.tasks': 'New tasks in progress: {list}.',
  });

  // ======================= состояние модуля =======================
  // В3: встроенные ответы вне шаблонов — по данным роли; если ответить нечем — честно «не могу» и статус «нужен человек»
  I.add('ru', {
    'ai.st.human': 'нужен человек', 'ai.j.human': 'не смог ответить по данным — нужен человек',
    'ai.b.card': 'По карточке «{t}» на {d} ({p}): {x}.', 'ai.b.card_denied': 'Карточка «{t}» вне прав роли «{r}» — подробности не показываю.',
    'ai.b.staff': 'Сотрудники на {d}: всего {n} — охранники {g}, администрация {a}; сегодня нет на работе {off} (отпуск {vac}, больничный {sick}, не вышли {abs}). За {p}: принято {h}, уволено {f}. Удостоверения истекают за 30 дней — {c}.',
    'ai.b.staff_obj': '{o} на {d}: постов {posts}, охранников по графику (FTE) {fte}; {st}. Данные других объектов этой роли недоступны.',
    'ai.b.objects': 'Объекты на {d}: действует {n}, постов {posts} (круглосуточных объектов {h24}, дневных {hd}). За {p}: запущено {l}, расторгнуто {t}. Сегодня без отметки смены — {m}.',
    'ai.b.cash': 'Деньги на {d}: {cash}. Минимум за 13 недель — {min} (неделя с {wk}). Ближайшие выплаты: зарплата {sd} — {sal}, налоги {td} — {tax}.',
    'ai.b.due': 'Сроки на {d}: всего {n} — удостоверения {c} и разрешения {pm} (30 дней), договоры {k} (60 дней), страховки авто {i} и техосмотры {s} (30 дней).{list}',
    'ai.b.due_list': ' Ближайшие договоры: {l}.',
    'ai.b.inc': 'Происшествия за {p}: {n}, из них жалоб заказчиков {c}; среднее время реакции ГБР {r} мин (норматив 15). Чаще всего: {top}. Предписаний не устранено на {d} — {pr}.',
    'ai.b.fleet': 'Автопарк на {d}: {n} автомобилей; ТО в ближайшие 1000 км — {to}, страховки за 30 дней — {ins}, техосмотры — {insp}, перерасход ГСМ больше 10 % — {fuel}.{cost}',
    'ai.b.fleet_cost': ' Расходы автопарка за {p} — {v} (= строка ОПиУ «Транспорт и ГСМ»).',
    'ai.b.cust': 'Заказчики на {d}: с действующими объектами — {n}. {top}',
    'ai.b.cust_top': 'Крупнейшие по выручке за {p}: {l}.',
    'ai.b.tasks': 'Задачи роли «{r}» на {d}: открыто {o}, просрочено {od}, срок сегодня {td}, на проверке {rv}; выполнено за {p} — {dn}.{list}',
    'ai.b.tasks_list': ' Просрочены: {l}.',
    'ai.b.task': 'Задача {no} «{t}»: статус «{st}», исполнитель {o}, срок {due}{od}.{chk} Что делать: {next}.',
    'ai.b.task_od': ', просрочена на {n} дн.', 'ai.b.task_chk': ' Чек-лист {d}/{n}.',
    'ai.b.next.new': 'начать работу и отметить первый пункт', 'ai.b.next.work': 'закончить и отправить на проверку постановщику', 'ai.b.next.review': 'постановщику — принять или вернуть с комментарием', 'ai.b.next.hold': 'снять с паузы или отменить с причиной', 'ai.b.next.done': 'ничего — задача выполнена', 'ai.b.next.cancel': 'ничего — задача отменена',
    'ai.b.task_none': 'Задача {no} не найдена в правах роли «{r}».',
    'ai.b.docs': 'Документы на {d}: приказов в работе {o}, из них на подписи ГД {s}; служебных записок открыто {m}, сверх срока {mo}.',
    'ai.b.chats': 'Чаты роли «{r}»: {n}, непрочитано {u}{list}.',
    'ai.b.checks': 'Проверки объектов за {p}: {n}, средняя оценка {s}; предписаний не устранено на {d} — {pr}.',
    'ai.b.file': 'Файл «{n}»: {w} слов, {l} строк. Кратко: {sum}{act}',
    'ai.b.file_act': ' Что делать по файлу: {l}.', 'ai.b.file_noact': ' Явных поручений в тексте нет — можно создать задачу из ответа.',
    'ai.b.cant': 'Поручение {no}: на вопрос «{q}» по данным роли «{r}» ответить не могу — нужен человек. Где посмотреть: {where}. Поручение записано в журнал со статусом «нужен человек».',
    'ai.b.where_more': 'словарь показателей — в «Знаниях»',
  });
  I.add('en', {
    'ai.st.human': 'needs a person', 'ai.j.human': 'could not answer from the data — a person is needed',
    'ai.b.card': 'From the card “{t}” as of {d} ({p}): {x}.', 'ai.b.card_denied': 'The card “{t}” is outside the rights of the “{r}” role — no details shown.',
    'ai.b.staff': 'Employees as of {d}: {n} in total — guards {g}, administration {a}; absent today {off} (vacation {vac}, sick leave {sick}, no-shows {abs}). For {p}: hired {h}, dismissed {f}. Guard licences expiring within 30 days — {c}.',
    'ai.b.staff_obj': '{o} as of {d}: {posts} posts, guards on schedule (FTE) {fte}; {st}. Other sites’ data is not available to this role.',
    'ai.b.objects': 'Sites as of {d}: {n} active, {posts} posts (24/7 sites {h24}, day sites {hd}). For {p}: launched {l}, terminated {t}. No shift check-in today — {m}.',
    'ai.b.cash': 'Cash as of {d}: {cash}. 13-week minimum — {min} (week of {wk}). Next payments: salary {sd} — {sal}, taxes {td} — {tax}.',
    'ai.b.due': 'Deadlines as of {d}: {n} in total — licences {c} and permits {pm} (30 days), contracts {k} (60 days), vehicle insurance {i} and inspections {s} (30 days).{list}',
    'ai.b.due_list': ' Nearest contracts: {l}.',
    'ai.b.inc': 'Incidents for {p}: {n}, customer complaints {c}; average rapid response time {r} min (standard 15). Most frequent: {top}. Open inspection orders as of {d} — {pr}.',
    'ai.b.fleet': 'Fleet as of {d}: {n} vehicles; service within 1,000 km — {to}, insurance within 30 days — {ins}, inspections — {insp}, fuel overuse above 10% — {fuel}.{cost}',
    'ai.b.fleet_cost': ' Fleet costs for {p} — {v} (= P&L line “Transport and fuel”).',
    'ai.b.cust': 'Customers as of {d}: {n} with active sites. {top}',
    'ai.b.cust_top': 'Largest by revenue for {p}: {l}.',
    'ai.b.tasks': 'Tasks of the “{r}” role as of {d}: open {o}, overdue {od}, due today {td}, in review {rv}; done for {p} — {dn}.{list}',
    'ai.b.tasks_list': ' Overdue: {l}.',
    'ai.b.task': 'Task {no} “{t}”: status “{st}”, assignee {o}, due {due}{od}.{chk} Next step: {next}.',
    'ai.b.task_od': ', {n} days overdue', 'ai.b.task_chk': ' Checklist {d}/{n}.',
    'ai.b.next.new': 'start the work and tick the first item', 'ai.b.next.work': 'finish and send for review to the creator', 'ai.b.next.review': 'creator — accept or return with a comment', 'ai.b.next.hold': 'resume or cancel with a reason', 'ai.b.next.done': 'nothing — the task is done', 'ai.b.next.cancel': 'nothing — the task is cancelled',
    'ai.b.task_none': 'Task {no} is not found within the rights of the “{r}” role.',
    'ai.b.docs': 'Documents as of {d}: orders in progress {o}, awaiting the general director’s signature {s}; open memos {m}, past due {mo}.',
    'ai.b.chats': 'Chats of the “{r}” role: {n}, unread {u}{list}.',
    'ai.b.checks': 'Site inspections for {p}: {n}, average score {s}; open inspection orders as of {d} — {pr}.',
    'ai.b.file': 'File “{n}”: {w} words, {l} lines. In short: {sum}{act}',
    'ai.b.file_act': ' What to do from the file: {l}.', 'ai.b.file_noact': ' The text has no explicit action items — you can create a task from the answer.',
    'ai.b.cant': 'Errand {no}: I cannot answer “{q}” from the data of the “{r}” role — a person is needed. Where to look: {where}. The errand is logged with the status “needs a person”.',
    'ai.b.where_more': 'the indicator dictionary — in “Knowledge”',
  });
  let K = null, W = null, CAT = null, F = null, R = null, D = null, U = null, Live = null, LIVE = null, FS = null;
  const LS_KEY = 'sunkar-aip';
  const TABS = ['chat', 'projects', 'errands', 'routines', 'journal', 'reports'];
  const P0 = { mode:'side', prev:'side', min:false, w:440, hs:1, hb:360, hp:100, tab:'chat' };
  const ST = { 'выполнено':'done', 'в работе':'work', 'ждёт подписи человека':'sign', 'отклонено по правам':'deny', 'принято':'accepted', 'нужен человек':'human' };
  const ST_PILL = { done:'s-good', work:'s-info', sign:'s-warn', deny:'s-bad', accepted:'s-mute', human:'s-warn' };
  let pref = loadPref();
  let aip = null, bodyEl = null, compEl = null, inp = null, isOpen = false, unread = 0, showN = 30, sig = '', lastAiCount = -1, lastFocus = null;
  const outbox = [], streaming = new Map(), addP = new Map();
  let staged = [], recog = null, rec = null, proposal = null, repView = null, rTimer = 0;
  const ef = { st:'all', who:'mine', q:'' }, jf = { type:'all', per:'week' };
  let errLocal = {};                      // счётчик номеров поручений по годам (на случай общего журнала, пока запись не вернулась)

  function loadPref(){ try { const x = JSON.parse(localStorage.getItem(LS_KEY) || 'null'); if (x && typeof x === 'object') return { ...P0, ...x }; } catch(e){} return { ...P0 }; }
  function savePref(){ try { localStorage.setItem(LS_KEY, JSON.stringify(pref)); } catch(e){} }

  const esc = s => F.esc(s == null ? '' : s);
  const anchor = () => K.RNG.anchor;
  const role = () => R.roleOf(K.S.role);
  const seesAll = rl => ['ed','gd','adm'].includes(rl.id) || rl.rt.ai === 'П';
  const aiOk = rl => (rl.rt.ai || '·') !== '·';
  const hasMoney = rl => R.hasMoney(rl);
  const phone = () => window.matchMedia('(max-width:860px)').matches;
  const curMode = () => phone() ? 'full' : pref.mode;
  const key = () => 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const wn = s => I.w(s);
  const stName = st => t('ai.st.' + (ST[st] || 'work'));
  const stPill = st => `<span class="pill s ${ST_PILL[ST[st] || 'work']}">${esc(stName(st))}</span>`;
  const plainText = s => String(s == null ? '' : s).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&').trim();
  const fmtTs = ms => ms ? new Date(ms).toLocaleString(I.lang === 'en' ? 'en-US' : 'ru-RU', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false }) : '—';
  const before = () => anchor() < W.LAUNCH_DEMO;
  function withRole(name, fn){ const S = K.S, prev = S.role; S.role = name || prev; try { return fn(); } finally { S.role = prev; } }
  const roleByName = n => R.ROLES.find(x => x.name === n) || null;
  const roleOfId = id => R.ROLES.find(x => x.id === id) || null;
  const AIR_FALLBACK = { owner:'Исполнительный директор', gd:'Исполнительный директор', gb:'Бухгалтер', dep:'Начальник охраны', senior:'Начальник объекта', mgr:'Коммерческий директор', drv:'Механик', disp:'Начальник охраны' };
  const aiRole = rl => CAT.aiRoles.find(x => x.role === rl.name) || CAT.aiRoles.find(x => x.role === AIR_FALLBACK[rl.id]) || CAT.aiRoles[0];
  const myChatsOf = (rl, at) => { try { return D.myChats(rl, at); } catch(e){ return []; } };
  const chatName = id => { const c = (D.chatsAt(anchor()) || []).find(x => x.id === id); return c ? I.tx(c.name) : id; };
  const hashSec = () => (location.hash || '#kokpit').slice(1);

  // ======================= номера поручений П-ГГГГ-NNNN (продолжают нумерацию мира) =======================
  function nextErrNo(){
    const at = anchor(), y = W.yOf(at), pre = `П-${y}-`;
    let n = 0;
    if (at >= W.LAUNCH_DEMO){ const last = D.errandsAt(at)[0]; if (last && String(last.no).startsWith(pre)) n = parseInt(String(last.no).slice(-4), 10) || 0; }
    LIVE.errands.forEach(e => { if (e.no && String(e.no).startsWith(pre)){ const k = parseInt(String(e.no).slice(pre.length), 10); if (k > n) n = k; } });
    n = Math.max(n, errLocal[y] || 0) + 1; errLocal[y] = n;
    return pre + String(n).padStart(4, '0');
  }

  // ======================= данные: сводка, встроенные ответы, контекст для ИИ =======================
  // утренняя сводка — по правам роли (без денег для ролей без hasMoney), на дату «Данные на»
  function summary(to){
    if (to < W.LAUNCH_DEMO) return t('ai.launch', { d: F.dt(W.LAUNCH_DEMO), at: F.dt(to) });
    const rl = role(), sc = R.SC();
    const os = W.objects.filter(o => W.active(o, to) && (hasMoney(rl) ? true : R.objFilter(o))), v = os.map(o => W.objView(o, to, to, to)), ms = v.filter(x => x.missed > 0);
    const plan = v.reduce((s, x) => s + x.plan, 0);
    const miss = ms.length ? t('ai.sum.miss', { list: ms.map(x => wn(x.o.name) + (x.o.missedPost ? t('ai.sum.post', { n: x.o.missedPost }) : '')).join('; ') }) : t('ai.sum.allopen');
    if (!hasMoney(rl)){
      const tk = W.tasksAt(to).filter(x => x.owner === rl.name).length + LIVE.tasks.filter(x => x.owner === rl.name && !['выполнено','выполнена','отменена'].includes(x.status)).length;
      return t('ai.sum.nomoney', { d: F.dt(to), r: F.rn(rl.name), o: sc.obj ? ' · ' + wn(sc.obj) : '', a: F.N(plan - ms.length), b: F.N(plan), miss, t: tk });
    }
    const b = W.balance(to), ar = W.receivables(to), oc = W.onec(to), hr = W.hr(to), pres = W.prescOpen(to), inc = W.incidents.filter(x => x.day === to - 1 || x.day === to);
    return t('ai.sum.full', { d: F.dt(to), a: F.N(plan - ms.length), b: F.N(plan), miss, hr: F.N(hr.total), vac: hr.vac, sick: hr.sick, cash: F.MU(b.cash), ar: F.MU(ar.total), o30: F.MU(ar.overdue30),
      inc: inc.length, incl: inc.length ? ' — ' + inc.slice(0, 3).map(x => `${wn(x.obj.name)}: ${I.tx(x.type)}`).join('; ') : '', pres: pres.length, ok: oc.exportsOk, all: oc.exportsTotal, bk: oc.effectorOk ? t('ai.sum.bk_ok') : t('ai.sum.bk_err') });
  }

  const MONEY_RE = /выручк|прибыл|ebitda|дебитор|долг|оплат|деньг|денег|денеж|на счет|на счёт|налог|убыт|рентаб|маржа|revenue|profit|receivabl|debt|payment|money|cash|tax|loss|margin/;
  const SALARY_RE = /зарплат|salary|payroll|wage/;
  const OTHER_RE = /чуж|друг(ого|ой) объект|other site|another site/;
  const HUMAN_RE = /подпиш|подписать|подпись эцп|оплати|заплати|перечисли|проведи платеж|проведи платёж|выдай .*(роль|доступ)|выдать .*(роль|доступ)|отозва\S* .*(роль|доступ)|измени\S* .*(прав|доступ)|удали|sign the|pay the|make a payment|grant .*(role|access)|revoke|delete/;
  const isScopedObj = rl => ['obj','senior','guard'].includes(rl.id);

  // встроенные ответы по данным роли; права — раньше любого ответа. Возвращает { label, text, st, no, free, deny }
  function answer(q, o = {}){
    const S = K.S, RNG = K.RNG, to = RNG.anchor, ql = String(q || '').toLowerCase(), rl = role(), r = F.rn(rl.name);
    let no0 = o.no || null; const no = () => no0 || (no0 = nextErrNo());
    const res = (label, text, st, extra) => ({ label, text, st: st || 'выполнено', no: no(), ...(extra || {}) });
    const deny = k => res('access', t(k, { r, no: no(), b: k === 'ai.a.deny_block' ? deny.b : '' }), 'отклонено по правам', { deny:true });
    const blockOff = (k, name) => { if ((rl.rt[k] || '·') === '·'){ deny.b = I.tx(name); return true; } return false; };
    // 1) права
    if (SALARY_RE.test(ql) && rl.rt.salary === '·') return deny('ai.a.deny_salary');
    if (MONEY_RE.test(ql) && !hasMoney(rl)) return deny('ai.a.deny_money');
    if (OTHER_RE.test(ql) && isScopedObj(rl)) return deny('ai.a.deny_obj');
    if (/1с|1c|бэкап|backup|сервер|server/.test(ql) && blockOff('onec', 'Сервер и 1С')) return deny('ai.a.deny_block');
    if (/укомплект|смен|staff|shift/.test(ql) && blockOff('shifts', 'Смены')) return deny('ai.a.deny_block');
    if (/договор|contract/.test(ql) && /истека|expir|реестр/.test(ql) && blockOff('legal', 'Юридический')) return deny('ai.a.deny_block');
    // 2) ступень 1: подписи, платежи, доступы и удаление — только человек
    if (HUMAN_RE.test(ql)) return res('helper', t('ai.a.human', { no: no() }), 'ждёт подписи человека');
    // 3) ответы по данным
    const tno = /(?:^|[^\p{L}\d])(Н-\d{4}-\d{4}|N-\d{4}-\d{4}|[TТ]-\d{3,6})(?![\p{L}\d])/iu.exec(q);
    if (tno) return res('helper', taskText(tno[1]), 'выполнено');
    if (o.card && o.card.kind) return cardText(o.card, res, deny);
    if (/^(расскажи подробнее|tell me more)\s*:/i.test(q)) return res('helper', t('ai.a.more', { no: no(), r }), 'выполнено', { free:true });
    const txtFiles = (o.files || []).filter(f => f && f.textExtract);
    if (txtFiles.length) return res('helper', txtFiles.map(fileText).join('\n'), 'выполнено', { fileDone:true });
    if (/сводк|summary/.test(ql)) return res('duty', summary(to));
    if (/укомплект|смен|staff|shift/.test(ql)) return res('shift', staffText(to, /риск|невыход|risk|no-show/.test(ql)));
    if (/убыт|рентаб|loss|margin/.test(ql)){ const v = D.lossObjects(RNG.from, RNG.to), nt = v.filter(x => x.term).length;   // то же определение, что в кокпите и разделе «Объекты» (К2)
      return res('analyst', t('ai.a.loss', { p: F.periodTxt(), n: v.length, u: I.plural(v.length, 'ai.u.obj'), list: (v.map(x => `${wn(x.o.name)} (${wn(x.o.customer.name)}) ${F.P(x.margin)}${x.term ? ' — ' + t('ai.a.term') : ''}${x.o.story ? ' — ' + I.tx(x.o.story) : ''}`).join('; ') || t('ai.none')) + (nt ? t('ai.a.loss_term', { n: nt }) : '') })); }
    if (/1с|1c|бэкап|backup|сервер|server/.test(ql)) return res('onec', onecText(to));
    if (/налог|tax/.test(ql) && /уплат|payable|к оплате|25/.test(ql)) return res('analyst', taxText(to));
    if (/договор|contract/.test(ql) && /истека|expir|реестр/.test(ql)) return res('lawyer', contractsText(to));
    if (/дебитор|долг|оплат|receivabl|debt|payment/.test(ql)) return res('analyst', arText(to));
    if (SALARY_RE.test(ql)){ const up = W.upcoming(to), p = W.pl(RNG.from, RNG.to); return res('analyst', t('ai.a.salary', { r, lvl: t('ai.lvl.' + rl.rt.salary), d: F.dts(up.salDay), sal: F.MU(up.sal), p: F.periodTxt(), fot: F.MU(p.guardC + p.adminC) })); }
    if (/выручк|прибыл|ebitda|revenue|profit/.test(ql)) return res('analyst', revText());
    // 4) типовые вопросы вне шаблонов — по данным роли (В3); блок вне прав — отказ, как выше
    const can = k => (rl.rt[k] || '·') !== '·';
    if (/сотрудник|охранник|численн|персонал|кадр|людей|employee|headcount|guards?\b|people/.test(ql)){ if (!can('hr') && !can('shifts') && !can('kokpit') && !isScopedObj(rl)){ deny.b = I.tx('Кадры'); return deny('ai.a.deny_block'); } return res('helper', staffAns(to)); }
    if (/задач|task/.test(ql) || (/просроч|overdue/.test(ql) && !/дебитор|оплат|receivab/.test(ql))){ if (blockOff('tasks', 'Задачи и проекты')) return deny('ai.a.deny_block'); return res('helper', tasksAns(to)); }
    if (/срок|истека|удостоверен|страхов|техосмотр|deadline|expir|licen[cs]e/.test(ql)){ const wide = k => ['П','Б','Ч'].includes(rl.rt[k] || '·'); if (!wide('hr') && !wide('legal') && !wide('kokpit')){ deny.b = I.tx('Юридический'); return deny('ai.a.deny_block'); } return res('helper', dueAns(to)); }   // сроки компании — не для ролей «только свои»
    if (/происшеств|инцидент|жалоб|incident|complain/.test(ql)){ if (!can('incidents') && !can('shifts')){ deny.b = I.tx('Происшествия'); return deny('ai.a.deny_block'); } return res('shift', incAns(to)); }
    if (/автопарк|машин|автомоб|\bто\b|гсм|fleet|vehicle|\bcars?\b|fuel/.test(ql)){ if (blockOff('fleet', 'Автопарк')) return deny('ai.a.deny_block'); return res('helper', fleetAns(to)); }
    if (/проверк|предписан|inspection/.test(ql)){ if (!can('incidents') && !can('objects')){ deny.b = I.tx('Происшествия'); return deny('ai.a.deny_block'); } return res('shift', checksAns(to)); }
    if (/заказчик|клиент|customer|client/.test(ql)){ if (!can('sales') && !can('objects')){ deny.b = I.tx('Продажи'); return deny('ai.a.deny_block'); } return res('analyst', custAns(to)); }
    if (/объект|пост|site|post/.test(ql)){ if (!can('objects') && !can('shifts')){ deny.b = I.tx('Объекты'); return deny('ai.a.deny_block'); } return res('shift', objAns(to)); }
    if (/приказ|записк|документ|подпис|order|memo|document/.test(ql)){ if (blockOff('docflow', 'Приказы и записки')) return deny('ai.a.deny_block'); return res('helper', docsAns(to)); }
    if (/чат|сообщен|chat|message/.test(ql)){ if (blockOff('chats', 'Чаты')) return deny('ai.a.deny_block'); return res('helper', chatsAns(rl)); }
    if (/деньг|денег|денеж|остат|касс|на сч[её]т|\bcash\b|balance/.test(ql)) return res('analyst', cashAns(to));
    if (/что (делать|важно|главное)|план на|сегодня|what (to do|matters)|today|priorit/.test(ql)) return res('duty', summary(to) + ' ' + tasksAns(to));
    if ((o.files || []).length) return res('helper', t('ai.a.files_only'), 'выполнено');   // файлы без вопроса по данным — сохранены и приложены
    if (Live.cap.sample || srv()){ const fl = R.isFiltered() ? t('ai.a.flt', { f: R.filterLabel() }) : '';
      return res('helper', t('ai.a.free', { no: no(), q: String(q).slice(0, 200), p: F.periodTxt(), f: fl }), 'в работе', { free:true }); }   // настоящий ИИ ответит потоком
    return res('helper', t('ai.b.cant', { no: no(), q: String(q).slice(0, 160), r, where: whereFor(rl) }), 'нужен человек', { free:true });
  }
  function staffText(to, risk){
    const rl = role(), sc = R.SC();
    if (sc.obj){ const o = W.objects.find(x => x.name === sc.obj), v = W.objView(o, to, to, to);
      return t('ai.a.staff_obj', { o: wn(o.name), d: F.dt(to), posts: o.posts, st: v.missed ? t('ai.a.staff_obj_miss', { n: o.missedPost || 1 }) : t('ai.a.staff_obj_ok') }); }
    const day = R.filtered().filter(o => W.active(o, to)).map(o => W.objView(o, to, to, to)), miss = day.filter(v => v.missed), posts = day.reduce((s, v) => s + v.o.posts, 0);
    let s = t('ai.a.staff', { d: F.dt(to), posts: F.N(posts), n: miss.length, list: miss.length ? ' — ' + miss.map(v => `${wn(v.o.name)}, ${wn('пост ' + (v.o.missedPost || 1))}`).join('; ') : '', p: F.P(posts ? (posts - miss.length) / posts * 100 : 100) });
    if (risk && (rl.rt.hr || '·') !== '·'){ const h = W.hr(Math.min(to + 1, W.FACT_END)); s += t('ai.a.risk', { vac: h.vac, sick: h.sick }); }
    return s;
  }
  // ---------- В3: ответы по данным роли на типовые вопросы ----------
  const per = () => F.periodTxt();
  function whereFor(rl){ const S0 = ['kokpit','tasks','objects','shifts','hr','sales','finance','docflow','chats','fleet','legal'].filter(k => (rl.rt[k] || '·') !== '·').slice(0, 4).map(k => I.tx(K.ui.SEC_NAME(k) || k)); return [...S0, t('ai.b.where_more')].join(', '); }
  function staffAns(to){
    const sc = R.SC(), RNG = K.RNG;
    if (sc.obj){ const o = W.objects.find(x => x.name === sc.obj), v = W.objView(o, to, to, to); return t('ai.b.staff_obj', { o: wn(o.name), d: F.dt(to), posts: F.N(o.posts), fte: F.F(o.fte), st: v.missed ? t('ai.a.staff_obj_miss', { n: o.missedPost || 1 }) : t('ai.a.staff_obj_ok') }); }
    const h = W.hr(to), mv = W.hrRange(RNG.from, RNG.to);
    return t('ai.b.staff', { d: F.dt(to), n: F.N(h.total), g: F.N(h.guards), a: F.N(h.admin), off: F.N(h.vac + h.sick + h.absent), vac: F.N(h.vac), sick: F.N(h.sick), abs: F.N(h.absent), p: per(), h: F.N(mv.hires), f: F.N(mv.fires), c: F.N(h.cert30) });
  }
  function objAns(to){
    const RNG = K.RNG, os = R.filtered().filter(o => W.active(o, to)), fn = W.funnel(RNG.from, RNG.to, R.objFilter), miss = os.map(o => W.objView(o, to, to, to)).filter(v => v.missed > 0);
    return t('ai.b.objects', { d: F.dt(to), n: F.N(os.length), posts: F.N(os.reduce((s, o) => s + o.posts, 0)), h24: F.N(os.filter(o => o.is24).length), hd: F.N(os.filter(o => !o.is24).length), p: per(), l: F.N(fn.launched), t: F.N(fn.terminated), m: miss.length ? miss.map(v => wn(v.o.name)).slice(0, 5).join(', ') : t('ai.none') });
  }
  function cashAns(to){
    const b = W.balance(to), fc = W.forecast13(to), mn = fc.reduce((m, w) => w.cash < m.cash ? w : m, fc[0]), up = W.upcoming(to);
    return t('ai.b.cash', { d: F.dt(to), cash: F.MU(b.cash), min: F.MU(mn.cash), wk: F.dts(mn.from), sd: F.dts(up.salDay), sal: F.MU(up.sal), td: F.dts(up.taxDay), tax: F.MU(up.tax) });
  }
  function dueAns(to){
    const dp = D.dueParts(to);
    return t('ai.b.due', { d: F.dt(to), n: F.N(dp.total), c: F.N(dp.cert), pm: F.N(dp.permit), k: F.N(dp.contract), i: F.N(dp.ins), s: F.N(dp.insp), list: dp.contracts.length ? t('ai.b.due_list', { l: dp.contracts.slice(0, 4).map(o => `${wn(o.name)} — ${F.dts(o.contractEnd)}`).join('; ') }) : '' });
  }
  function incAns(to){
    const RNG = K.RNG, L = D.incIn(RNG.from, RNG.to), m = {}; L.forEach(x => m[x.type] = (m[x.type] || 0) + 1);
    const top = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${I.tx(k)} ${F.N(v)}`).join(', ') || t('ai.none');
    return t('ai.b.inc', { p: per(), n: F.N(L.length), c: F.N(L.filter(x => x.type === 'жалоба заказчика').length), r: F.F(L.length ? L.reduce((s, x) => s + x.react, 0) / L.length : 0, 0), top, d: F.dt(to), pr: F.N(W.prescOpen(to).filter(c => R.objFilter(c.obj)).length) });
  }
  function checksAns(to){
    const RNG = K.RNG, L = D.chkIn(RNG.from, RNG.to);
    return t('ai.b.checks', { p: per(), n: F.N(L.length), s: L.length ? F.F(L.reduce((s, c) => s + c.score, 0) / L.length) : '—', d: F.dt(to), pr: F.N(W.prescOpen(to).filter(c => R.objFilter(c.obj)).length) });
  }
  function fleetAns(to){
    const RNG = K.RNG, rl = role(), fl = W.fleetAt(CAT.fleet, to), mine = (rl.rt.fleet || '·') === 'С' ? fl.slice(0, 1) : fl;
    return t('ai.b.fleet', { d: F.dt(to), n: F.N(mine.length), to: F.N(mine.filter(c => c.toLeft <= 1000).length), ins: F.N(mine.filter(c => c.insLeft <= 30).length), insp: F.N(mine.filter(c => c.inspLeft <= 30).length), fuel: F.N(mine.filter(c => c.fuelFact / c.fuelNorm > 1.1).length), cost: hasMoney(rl) ? t('ai.b.fleet_cost', { p: per(), v: F.MU(W.fleetCost(CAT.fleet, RNG.from, RNG.to)) }) : '' });
  }
  function custAns(to){
    const RNG = K.RNG, cs = W.customers.filter(c => R.custFilter(c) && c.objects.some(o => W.active(o, to) && R.scopeOk(o)));
    const top = hasMoney(role()) ? t('ai.b.cust_top', { p: per(), l: cs.map(c => ({ c, v: D.objAgg(RNG.from, RNG.to, c.objects.filter(R.scopeOk)).rev })).sort((a, b) => b.v - a.v).slice(0, 3).map(x => `${wn(x.c.name)} — ${F.MU(x.v)}`).join('; ') }) : '';
    return t('ai.b.cust', { d: F.dt(to), n: F.N(cs.length), top });
  }
  const tkMod = () => K.module && K.module('tasks');
  function tasksAns(to){
    const T = tkMod(), rl = role(), RNG = K.RNG; if (!T) return '';
    const L = (T.list() || []).filter(x => x.owner === rl.name || (x.co || []).includes(rl.name) || (x.author && x.author.role === rl.name));
    const op = L.filter(x => x.st !== 'done' && x.st !== 'cancel'), od = op.filter(x => x.due < to);
    return t('ai.b.tasks', { r: F.rn(rl.name), d: F.dt(to), o: F.N(op.length), od: F.N(od.length), td: F.N(op.filter(x => x.due === to).length), rv: F.N(op.filter(x => x.st === 'review').length), p: per(), dn: F.N(L.filter(x => x.st === 'done' && x.doneDay >= RNG.from && x.doneDay <= RNG.to).length),
      list: od.length ? t('ai.b.tasks_list', { l: od.sort((a, b) => a.due - b.due).slice(0, 3).map(x => `${x.no} «${x.world ? wn(x.title) : x.title}»`).join('; ') }) : '' });
  }
  function taskText(no0){
    const T = tkMod(), rl = role(), no = String(no0).toUpperCase().replace(/^N-/, 'Н-').replace(/^Т-/, 'T-');
    const x = T ? (T.list() || []).find(y => String(y.no).toUpperCase() === no) : null;
    if (!x) return t('ai.b.task_none', { no: no0, r: F.rn(rl.name) });
    const to = anchor(), od = x.st !== 'done' && x.st !== 'cancel' && x.due < to ? to - x.due : 0, ck = (x.checklist || []).length;
    return t('ai.b.task', { no: x.no, t: x.world ? wn(x.title) : x.title, st: I.t('tasks.st.' + x.st), o: F.rn(x.owner), due: F.dt(x.due), od: od ? t('ai.b.task_od', { n: F.N(od) }) : '', chk: ck ? t('ai.b.task_chk', { d: x.checklist.filter(c => c.done).length, n: ck }) : '', next: t('ai.b.next.' + x.st) });
  }
  function docsAns(to){
    const D0 = D.docflowAt(to), op = D0.orders.filter(o => !o.done), mo = D0.memos.filter(m => m.status !== 'закрыта');
    return t('ai.b.docs', { d: F.dt(to), o: F.N(op.length), s: F.N(op.filter(o => o.route[o.stage] === 'Генеральный директор').length), m: F.N(mo.length), mo: F.N(mo.filter(m => m.overdue).length) });
  }
  function chatsAns(rl){
    const L = myChatsOf(rl, anchor()) || [], u = L.reduce((s, c) => s + (c.unread || 0), 0);
    return t('ai.b.chats', { r: F.rn(rl.name), n: F.N(L.length), u: F.N(u), list: L.filter(c => c.unread).length ? ': ' + L.filter(c => c.unread).slice(0, 4).map(c => `${I.tx(c.name)} ${c.unread}`).join(', ') : '' });
  }
  // карточка: те же данные, что видит роль в окне карточки (построитель модуля cards — права проверяет он же)
  function cardText(card, res, deny){
    const C = K.module && K.module('cards'), RNG = K.RNG, rl = role();
    let c = null; try { c = C && C.CARDS && (C.CARDS[card.kind] || null) ? C.CARDS[card.kind](card.id, {}) : null; } catch(e){ c = null; }
    const title = plainText(c ? c.title : (card.title || card.kind));
    if (c && c.denied) return res('access', t('ai.b.card_denied', { t: title, r: F.rn(rl.name) }), 'отклонено по правам', { deny:true });
    const pairs = [];
    if (c){ const box = document.createElement('div'); box.innerHTML = (c.blocks || []).filter(b => b && b.html).slice(0, 3).map(b => b.html).join('');
      box.querySelectorAll('dl').forEach(dl => { const dts = dl.querySelectorAll('dt'); dts.forEach(d0 => { const dd = d0.nextElementSibling; const k = plainText(d0.textContent), v = plainText(dd ? dd.textContent : '').replace(/\s+/g, ' '); if (k && v && pairs.length < 14) pairs.push(`${k} — ${v}`); }); }); }
    if (!pairs.length) return res('helper', t('ai.b.cant', { no: nextErrNo(), q: title, r: F.rn(rl.name), where: whereFor(rl) }), 'нужен человек', { free:true });
    return res('helper', t('ai.b.card', { t: title, d: F.dt(RNG.anchor), p: per(), x: pairs.join('; ') }), 'выполнено');
  }
  // файл: короткая выжимка (первые и самые «весомые» предложения) + строки-поручения
  function fileText(f){
    const txt = String(f.textExtract || '').slice(0, 8000), lines = txt.split(/\r?\n/).map(x => x.trim()).filter(Boolean), words = (txt.match(/[\p{L}\d]+/gu) || []);
    const sents = txt.replace(/\s+/g, ' ').split(/(?<=[.!?…])\s+/).map(x => x.trim()).filter(x => x.length > 12).slice(0, 80);
    const fq = {}; words.forEach(w => { const k = w.toLowerCase(); if (k.length > 3) fq[k] = (fq[k] || 0) + 1; });
    const sc = sents.map((x, i) => ({ x, i, s: (x.match(/[\p{L}\d]+/gu) || []).reduce((a, w) => a + (fq[w.toLowerCase()] || 0), 0) / Math.sqrt(1 + x.length / 40) + (i === 0 ? 3 : 0) }));
    const top = sc.slice().sort((a, b) => b.s - a.s).slice(0, 3).sort((a, b) => a.i - b.i).map(z => z.x.length > 220 ? z.x.slice(0, 217) + '…' : z.x);
    const ACT = /^(\d+[.)]|[-•*–])\s+|\b(нужно|необходимо|надо|прошу|сделать|подготовить|проверить|до \d{1,2}[.\/]\d{1,2}|срок|todo|must|need to|please|deadline|by \d)/i;
    const acts = lines.filter(l => ACT.test(l)).slice(0, 5).map(l => l.replace(/^(\d+[.)]|[-•*–])\s+/, '').slice(0, 140));
    const sum = top.length ? top.join(' ') : (lines.slice(0, 2).join(' ').slice(0, 300) || '—');
    return t('ai.b.file', { n: f.name, w: F.N(words.length), l: F.N(lines.length), sum, act: acts.length ? t('ai.b.file_act', { l: acts.join('; ') }) : t('ai.b.file_noact') });
  }
  function onecText(to){ const o = W.onec(to); return t('ai.a.onec', { d: F.dt(to), ok: o.exportsOk, all: o.exportsTotal, bk: o.effectorOk ? t('ai.bk.ok') : t('ai.bk.err'), s: o.sessions, free: F.P(o.diskBackupFree * 100) }); }
  function arText(to){ const r = W.receivables(to, R.custFilter), top = [...r.byCust.values()].sort((a, b) => b.overdue - a.overdue).slice(0, 3).filter(e => e.overdue > 0);
    return t('ai.a.ar', { d: F.dt(to), total: F.MU(r.total), billed: F.MU(r.billed), unbilled: F.MU(r.unbilled), o30: F.MU(r.overdue30), top: top.map(e => t('ai.a.ar_item', { c: wn(e.cust.name), v: F.MU(e.overdue), n: e.maxDays })).join('; ') || t('ai.a.ar_none') }); }
  function revText(){ const RNG = K.RNG;
    if (R.isFiltered()){ const a = D.objAgg(RNG.from, RNG.to); return t('ai.a.rev_f', { p: F.periodTxt(), f: R.filterLabel(), rev: F.MU(a.rev), profit: F.MU(a.profit), m: F.P(a.margin), ya: RNG.yago ? t('ai.a.ya', { v: F.MU(D.objAgg(RNG.yago.from, RNG.yago.to).rev) }) : '' }); }
    const p = W.pl(RNG.from, RNG.to); return t('ai.a.rev', { p: F.periodTxt(), rev: F.MU(p.revenue), e: F.MU(p.ebitda), m: F.P(p.revenue ? p.ebitda / p.revenue * 100 : 0), net: F.MU(p.net), ya: RNG.yago ? t('ai.a.ya', { v: F.MU(W.pl(RNG.yago.from, RNG.yago.to).revenue) }) : '' }); }
  function taxText(to){ const u = W.upcoming(to); return t('ai.a.tax', { d: F.dt(u.taxDay), v: F.MU(u.tax), a: F.MU(u.taxPay), b: F.MU(u.taxVat), c: F.MU(u.taxCit), e: F.MU(u.taxDiv || 0) }); }
  function contractsText(to){
    const os = R.filtered().filter(o => W.active(o, to) && o.contractEnd > to && o.contractEnd - to <= 60).sort((a, b) => a.contractEnd - b.contractEnd);
    const n = d => os.filter(o => o.contractEnd - to <= d).length;
    return t('ai.a.contracts', { d: F.dt(to), a: n(7), b: n(30), c: n(60), list: os.length ? ': ' + os.slice(0, 6).map(o => `${wn(o.name)} — ${F.dts(o.contractEnd)}`).join('; ') : '' });
  }
  // что сказать про вложения (текстовые файлы — содержимое; остальные — только сохранены)
  function filesNote(files){
    return (files || []).filter(f => f && f.kind !== 'audio').map(f => f.textExtract ? t('ai.a.file_read', { n: f.name, c: f.textExtract.length, x: f.textExtract.slice(0, 300).replace(/\s+/g, ' ').trim() }) : t('ai.a.file_saved', { n: f.name, why: t('ai.a.file_why') })).join('\n');
  }

  // контекст роли для настоящего ответа ИИ (только то, что роли видно по правам)
  function aiContext(o = {}){
    const rl = role(), at = anchor(), RNG = K.RNG, sc = R.SC();
    const L = [t('ai.ctx.role', { r: F.rn(rl.name), m: I.tx(rl.mission), rights: R.BLK.filter(([k]) => rl.rt[k] !== '·').map(([k, n]) => `${I.tx(n)} — ${t('ai.lvl.' + rl.rt[k])}`).join('; ') }),
      t('ai.ctx.date', { d: F.dt(at), l: RNG.label, p: F.periodTxt() })];
    if (sc.obj){ const ob = W.objects.find(x => x.name === sc.obj), v = W.objView(ob, at, at, at); L.push(t('ai.ctx.obj', { o: wn(ob.name), k: I.tx(ob.kind), c: I.tx(ob.city), posts: ob.posts, s: ob.sched, st: v.missed ? t('ai.a.staff_obj_miss', { n: ob.missedPost || 1 }) : t('ai.a.staff_obj_ok') })); }
    else {
      const day = W.objects.filter(x => W.active(x, at) && R.objFilter(x)).map(x => W.objView(x, at, at, at)), miss = day.filter(v => v.missed > 0);
      L.push(t('ai.ctx.objs', { n: day.length, posts: day.reduce((s, v) => s + v.o.posts, 0), miss: miss.map(v => wn(v.o.name)).join(', ') || t('ai.none') }));
      if ((rl.rt.hr || '·') !== '·'){ const h = W.hr(at); L.push(t('ai.ctx.hr', { n: h.total, g: h.guards, a: h.admin, c: h.cert30 })); }
      if (hasMoney(rl)){ const p = W.pl(RNG.from, RNG.to), b = W.balance(at), ar = W.receivables(at, R.custFilter), up = W.upcoming(at);
        L.push(t('ai.ctx.money', { rev: F.MU(p.revenue), e: F.MU(p.ebitda), net: F.MU(p.net), cash: F.MU(b.cash), ar: F.MU(ar.total), o30: F.MU(ar.overdue30), sd: F.dts(up.salDay), sal: F.MU(up.sal), td: F.dts(up.taxDay), tax: F.MU(up.tax) })); }
      if ((rl.rt.onec || '·') !== '·'){ const oc = W.onec(at); L.push(t('ai.ctx.onec', { ok: oc.exportsOk, all: oc.exportsTotal, bk: oc.effectorOk ? t('ai.ctx.bk_ok') : t('ai.ctx.bk_err') })); }
    }
    const open = LIVE.tasks.filter(x => !['выполнено','выполнена','отменена'].includes(x.status) && (seesAll(rl) || x.owner === rl.name || x.role === rl.name));
    if (open.length) L.push(t('ai.ctx.tasks', { list: open.slice(-8).map(x => `«${x.title}» — ${F.rn(x.owner)}`).join('; ') }));
    L.push(t('ai.prompt.section', { s: o.section || hashSec() })); if (o.card) L.push(t('ai.prompt.card', { c: o.card }));
    const dlg = myChat().slice(-6).map(m => `${m.who === 'user' ? '→' : '←'} ${String(m.text || '').slice(0, 300)}`);
    if (dlg.length) L.push(t('ai.prompt.dialog') + ':\n' + dlg.join('\n'));
    const fs = (o.files || []).filter(Boolean);
    if (fs.length) L.push(t('ai.prompt.files') + ':\n' + fs.map(f => `${f.name} (${f.mime || f.kind}, ${Math.round((f.size || 0) / 1024)} KB)${f.textExtract ? ':\n' + f.textExtract.slice(0, 8000) : ''}`).join('\n'));
    return L.join('\n');
  }
  async function aiAsk(q, onText, signal, o = {}){
    const SAMPLE = Live.cap.sample; if (!SAMPLE) throw { code:'not_granted' };
    const prompt = `${t('ai.prompt', { w: o.words || 250 })}\n\n${t('ai.prompt.data')}:\n${aiContext(o)}\n\n${t('ai.prompt.q')}: ${q}`;
    const r = await SAMPLE(prompt, { onText, signal, cache:false });
    return r && r.text != null ? r.text : String(r || '');
  }
  // сервер Агентства (Live.transport === 'server'): ответ, права, поручение и журнал — на сервере (api/ai/ask), расшифровка — api/ai/transcribe
  const srv = () => Live.transport === 'server';
  async function srvPost(url, body, type){
    const r = await fetch(url, { method:'POST', credentials:'same-origin', cache:'no-store', headers: { 'content-type': type || 'application/json' }, body: type ? body : JSON.stringify(body) });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || j.ok === false) throw { code: (j && j.error) || 'http_' + r.status, status: r.status };
    return j.data || {};
  }
  const srvAsk = (q, o = {}) => srvPost('api/ai/ask', { q, src: o.src || 'aichat', day: anchor(), files: (o.files || []).filter(Boolean).map(f => f.serverId || f.id).filter(Boolean),
    ctx: { section: o.section || hashSec(), card: o.card || null, chat: o.chat || null, deliverTo: o.deliverTo || null, lang: I.lang, role: K.S.role } });
  async function srvTranscribe(blob){ try { const d = await srvPost('api/ai/transcribe', blob, blob.type || 'audio/webm'); return d && typeof d.text === 'string' && d.text.trim() ? d.text.trim() : null; } catch(e){ return null; } }

  // ======================= диалог: LIVE.aichat (по пользователю и роли), поручения LIVE.errands =======================
  function myChat(){
    const S = K.S, uid = LIVE.uid, ks = new Set();
    const rows = LIVE.aichat.filter(r => r.role === S.role && (!uid || !r.uid || r.uid === uid || r.by === uid));
    rows.forEach(r => { if (r.k) ks.add(r.k); });
    for (let i = outbox.length - 1; i >= 0; i--) if (ks.has(outbox[i].k)) outbox.splice(i, 1);
    return rows.concat(outbox.filter(r => r.role === S.role)).slice(-500);
  }
  const chatRow = k => LIVE.aichat.find(r => r.k === k || r.id === k) || outbox.find(r => r.k === k) || null;
  function pushChat(row){
    const r = { role: K.S.role, uid: LIVE.uid || null, ...row, k: row.k || key() };
    if (LIVE.ro){ outbox.push({ ...r, ts: Date.now(), day: anchor() }); return Promise.resolve(null); }
    outbox.push({ ...r, ts: Date.now(), day: anchor() });
    const p = Promise.resolve(Live.add('aichat', r, { journal:false })).catch(() => null);
    addP.set(r.k, p);
    return p;
  }
  async function updChat(k, patch){
    const ob = outbox.find(r => r.k === k); if (ob) Object.assign(ob, patch);
    let row = LIVE.aichat.find(r => r.k === k);
    if (!row || !row.id){ const saved = await (addP.get(k) || Promise.resolve(null)); row = (saved && saved.id) ? saved : LIVE.aichat.find(r => r.k === k); }
    if (row && row.id) await Live.update('aichat', row.id, patch, { journal:false });
  }
  const slim = m => m ? { id: m.id || null, name: m.name, mime: m.mime, size: m.size, kind: m.kind, store: m.store, ref: m.ref, assetId: m.assetId || null, dur: m.dur ?? null, localOnly: !!m.localOnly, text: !!m.textExtract } : null;
  async function addErrand(er, akey){
    const row = await Live.add('errands', er, { journal:false });
    if (row) Live.journal('errands', t('ai.j.' + akey), row, { ai:true, akey, st: er.st, no: er.no });
    return row;
  }
  const AKEY = { 'выполнено':'answered', 'отклонено по правам':'denied', 'ждёт подписи человека':'sign', 'в работе':'work', 'принято':'work', 'нужен человек':'human' };
  function aiJournal(col, akey, row, extra){ if (row) Live.journal(col, t('ai.j.' + akey), row, { ai:true, akey, ...(extra || {}) }); }

  // спросить помощника: права → встроенный ответ (сразу) → ответ ИИ потоком, если есть sample
  function ask(q, opts = {}){
    q = String(q == null ? '' : q).trim(); const files = opts.files || [];
    if (!q && !files.length) return;
    if (!aip) return;
    if (!isOpen) open({ tab:'chat' }); else { if (pref.min) restore(); if (pref.tab !== 'chat') setTab('chat'); }
    const rl = role();
    if (!aiOk(rl)){ hint(t('ai.noaccess', { r: F.rn(rl.name) }), 'warn'); return; }
    if (before()){ hint(t('ai.launch', { d: F.dt(W.LAUNCH_DEMO), at: F.dt(anchor()) }), 'warn'); return; }
    if (files.length) return saveFiles(files, opts).then(metas => run(q, { ...opts, metas }));
    return run(q, opts);
  }
  function run(q, opts){
    const t0 = Date.now(), metas = (opts.metas || []).filter(Boolean);
    pushChat({ who:'user', text: q, files: metas.map(slim), transcript: opts.transcript || null, voice: opts.voice || null, src: opts.src || 'aichat' });
    if (!q){ pushChat({ who:'ai', label:'helper', text: opts.voice ? t('ai.a.voice_only') : (filesNote(metas) || t('ai.a.files_only')) }); renderBody(); return; }
    const ans = opts.preset ? { st:'выполнено', no: nextErrNo(), ...opts.preset } : answer(q, { files: metas, card: opts.card });
    const fn = filesNote(ans.fileDone ? metas.filter(m => !m.textExtract) : metas); if (fn && !ans.deny) ans.text = ans.text + '\n' + fn;
    const onSrv = srv() && !opts.preset, live = onSrv || !!(ans.free && Live.cap.sample), ka = key();
    pushChat({ k: ka, who:'ai', label: ans.label, text: live ? t('ai.thinking') : ans.text, no: ans.no, st: live ? 'в работе' : ans.st, sec: opts.section || null, deny: !!ans.deny });
    if (live) streaming.set(ka, t('ai.thinking'));
    renderBody();
    const er = { no: ans.no, q: q.slice(0, 300), a: live ? '' : ans.text.slice(0, 6000), st: live ? 'в работе' : ans.st, step: 1, src: opts.src || 'aichat', files: metas.map(m => m.id).filter(Boolean),
      ctx: { section: opts.section || hashSec(), card: opts.card || null }, deliverTo: opts.deliverTo || 'aichat', due: opts.due || 15, k: ka, durationMs: live ? null : Date.now() - t0 };
    if (onSrv) return runServer(q, ans, ka, er, opts, metas, t0);
    const erP = addErrand(er, AKEY[er.st] || 'answered');
    if (!live){ erP.then(row => deliver(row || er, q, ans.text, opts)); return; }
    let shown = '';
    aiAsk(q, ({ text }) => { shown = text || ''; streaming.set(ka, shown); paintStream(ka); }, undefined, { files: metas, section: opts.section, card: opts.card })
      .then(async txt => { streaming.delete(ka); await updChat(ka, { text: txt, st:'выполнено' }); const row = await erP; if (row && row.id) Live.update('errands', row.id, { a: String(txt).slice(0, 6000), st:'выполнено', durationMs: Date.now() - t0 }, { journal:false }); deliver(row || er, q, txt, opts); renderBody(); })
      .catch(async e => { streaming.delete(ka); const busy = e && e.code === 'rate_limited'; const txt = busy ? t('ai.err.busy') : (e && e.code === 'not_granted' ? ans.text + t('ai.err.notgranted') : t('ai.err.fail') + '\n' + ans.text);
        await updChat(ka, { text: txt, st: busy ? 'принято' : 'выполнено' }); const row = await erP; if (row && row.id) Live.update('errands', row.id, { a: busy ? '' : ans.text.slice(0, 6000), st: busy ? 'принято' : 'выполнено', durationMs: Date.now() - t0 }, { journal:false }); renderBody(); });
  }
  // на сервере поручение П-… и строку журнала пишет сам сервер — здесь только показ ответа и доставка результата
  function runServer(q, ans, ka, er, opts, metas, t0){
    return srvAsk(q, { files: metas, section: opts.section, card: opts.card, src: opts.src, deliverTo: opts.deliverTo })
      .then(async d => { streaming.delete(ka); const txt = String(d.a || d.text || ans.text); await updChat(ka, { text: txt, st: d.st || 'выполнено', no: d.no || er.no, deny: d.st === 'отклонено по правам' });
        deliver({ ...er, no: d.no || er.no, id: d.errandId || null }, q, txt, opts); renderBody(); })
      .catch(async e => { streaming.delete(ka); const busy = e && (e.status === 429 || e.code === 'rate_limited'); await updChat(ka, { text: busy ? t('ai.err.busy') : t('ai.err.fail') + '\n' + ans.text, st: busy ? 'принято' : ans.st, no: null });
        if (!busy) addErrand(er, AKEY[er.st] || 'answered'); renderBody(); });
  }
  function paintStream(k){ const el = aip && aip.querySelector(`.m[data-k="${k}"] .aip-txt`); if (el){ el.textContent = streaming.get(k) || ''; scrollChat(); } }

  // результат поручения — куда указано: чат помощника (по умолчанию), папка роли (файл), задача
  async function deliver(er, q, text, opts){
    const to = opts.deliverTo || 'aichat'; if (!er || to === 'aichat') return;
    if (to === 'folder') await toFolder(er, q, text, K.S.role);
    if (to === 'task') await toTask(er, q, text, K.S.role);
  }
  async function toFolder(er, title, text, roleName){
    try { const f = new File([`${er.no} · ${title}\n${F.dt(anchor())}\n\n${text}`], `${er.no}.txt`, { type:'text/plain' });
      const m = await FS.put(f, { folder: roleName, attachedTo: [{ kind:'errand', id: er.id || null, no: er.no }], extract:false, journal:false });
      aiJournal('files', 'file', m, { no: er.no }); return m; } catch(e){ hint(t('ai.att.err', { n: er.no + '.txt', e: (e && e.message) || e }), 'warn'); return null; }
  }
  async function toTask(er, title, text, owner){
    const row = await Live.add('tasks', { title: `${er.no}: ${title}`.slice(0, 160), owner, src:'ИИ', days: 1, status:'в работе', pr:'средний', desc: String(text || '').slice(0, 4000), link: { kind:'errand', id: er.id || null, no: er.no } }, { journal:false });
    aiJournal('tasks', 'task', row, { no: er.no }); return row;
  }

  // ответ помощника в общий чат (из чата «ИИ, …»): права, поручение, сообщение бота в канал
  async function reply(q, opts = {}){
    const ch = opts.ch; q = String(q || '').trim(); if (!q || !ch) return null;
    const rl = role(); let text, st = 'выполнено', no = null;
    if (!aiOk(rl) || before()) text = before() ? t('ai.launch', { d: F.dt(W.LAUNCH_DEMO), at: F.dt(anchor()) }) : t('ai.noaccess', { r: F.rn(rl.name) });
    else {
      const ans = answer(q); no = ans.no; st = ans.st; text = ans.text;
      if (srv()){
        try { const d = await srvAsk(q, { section:'chats', chat: ch, src:'chat', deliverTo: ['chat:' + ch] }); text = String(d.a || d.text || ans.text); no = d.no || null; if (Array.isArray(d.delivered) && d.delivered.some(x => String(x).startsWith('chat:'))) return opts.noPost ? { text, no, st, delivered:true, serverLogged:true } : d; }
        catch(e){ text = ans.text; }
        if (opts.noPost) return { text, no, st, serverLogged:true };   // модуль чатов публикует сам — без второго сообщения
        return Live.add('chat', { ch, text: text.slice(0, 4000), bot:true, roleAs: t('ai.roleas'), errandNo: no });
      }
      if (ans.free && Live.cap.sample){ try { text = await aiAsk(q, null, undefined, { section:'chats' }); } catch(e){ text = (e && e.code === 'rate_limited') ? t('ai.err.busy') : ans.text; } }
      if (opts.noPost) return { text, no, st };                         // поручение и сообщение записывает модуль чатов
      addErrand({ no, q: q.slice(0, 300), a: text.slice(0, 6000), st, step:1, src:'chat', ctx:{ section:'chats', chat: ch }, deliverTo:'chat:' + ch }, AKEY[st] || 'answered');
    }
    if (opts.noPost) return { text, no, st };
    return Live.add('chat', { ch, text: text.slice(0, 4000), bot:true, roleAs: t('ai.roleas'), errandNo: no });
  }

  // ======================= файлы: до 10 штук и 15 МБ на сообщение; хранилище — FileStore (assets / сервер / IndexedDB) =======================
  const MB = 1024 * 1024;
  function stageFiles(list){
    const add = [...(list || [])], all = staged.concat(add.map(f => ({ file: f, k: key() })));
    if (all.length > 10 || all.reduce((s, x) => s + (x.file.size || 0), 0) > 15 * MB){ hint(t('ai.att.limit'), 'warn'); return; }
    staged = all; paintStaged(); hint(t('ai.att.hint'));
  }
  function paintStaged(){
    const box = aip && aip.querySelector('#aipAtt'); if (!box) return;
    box.hidden = !staged.length;
    box.innerHTML = staged.map(x => `<span class="aip-chip">${fileIcon(FS.kindOf(x.file.type, x.file.name))}<span>${esc(x.file.name)}</span><small>${esc(sizeTxt(x.file.size))}</small><button type="button" data-aa="att-rm" data-k="${x.k}" aria-label="${esc(t('ai.att.remove', { n: x.file.name }))}">×</button></span>`).join('');
  }
  const sizeTxt = b => b >= MB ? I.n(b / MB, 1) + ' MB' : Math.max(1, Math.round((b || 0) / 1024)) + ' KB';
  async function saveFiles(files, opts){
    const out = [];
    for (const f of files){
      try { const m = await FS.put(f, { attachedTo: [{ kind:'aichat' }], kind: opts.voice ? 'audio' : undefined, dur: opts.voice ? opts.voice.dur : null }); if (m && m.warn) hint(m.warn, 'warn'); out.push(m); }
      catch(e){ hint(t('ai.att.err', { n: f.name, e: (e && e.message) || (e && e.code) || e }), 'warn'); }
    }
    return out;
  }
  const ICON = { image:'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5', audio:'M9 18V6l10-2v12M9 18a3 3 0 11-6 0 3 3 0 016 0zM19 16a3 3 0 11-6 0 3 3 0 016 0z', video:'M3 6h12v12H3zM15 10l6-3v10l-6-3', doc:'M14 3H6v18h12V7zM14 3v4h4M9 13h6M9 17h6', other:'M14 3H6v18h12V7zM14 3v4h4' };
  const svg = (d, cls) => `<svg class="${cls || 'aip-ico'}" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  const fileIcon = k => svg(ICON[k] || ICON.other);
  // вложение в ленте: изображение — миниатюра, голос/видео — плеер, документ — значок; действия: к задаче, в чат, в папку роли
  function fileHtml(f, ctx){
    if (!f) return '';
    const ref = esc(f.id || f.ref || ''), note = f.kind === 'audio' ? t('ai.voice.msg', { s: f.dur || '—' }) : (f.text ? t('ai.att.read') : t('ai.att.saved_only'));
    const media = f.kind === 'image' ? `<img class="aip-thumb" alt="${esc(f.name)}" data-fref="${ref}">` : (f.kind === 'audio' ? `<audio controls preload="metadata" data-fref="${ref}"></audio>` : (f.kind === 'video' ? `<video controls preload="metadata" class="aip-thumb" data-fref="${ref}"></video>` : ''));
    const chats = myChatsOf(role(), anchor());
    const acts = f.id && !LIVE.ro ? `<span class="aip-facts"><button type="button" class="lnk" data-aa="f-task" data-fid="${esc(f.id)}">${esc(t('ai.att.to_task'))}</button>${chats.length ? `<details class="aip-dd"><summary class="lnk">${esc(t('ai.att.to_chat'))}</summary><div>${chats.map(c => `<button type="button" data-aa="f-chat" data-fid="${esc(f.id)}" data-ch="${esc(c.id)}">${esc(I.tx(c.name))}</button>`).join('')}</div></details>` : ''}<button type="button" class="lnk" data-aa="f-folder" data-fid="${esc(f.id)}">${esc(t('ai.att.to_folder'))}</button></span>` : '';
    metaCache.set(f.id || f.ref, f);
    return `<div class="aip-file">${media || fileIcon(f.kind)}<div class="aip-fmeta"><a href="#" data-aa="f-open" data-fref="${ref}" class="aip-fname">${esc(f.name)}</a><small>${esc(sizeTxt(f.size))} · ${esc(note)}${f.localOnly ? ' · ' + esc(t('ai.att.local')) : ''} · ${esc(t('ai.att.demo'))}</small>${ctx === 'msg' ? acts : ''}</div></div>`;
  }
  const metaCache = new Map();
  function hydrate(root){
    root.querySelectorAll('[data-fref]:not([data-hy])').forEach(el => { el.dataset.hy = '1'; const m = metaCache.get(el.dataset.fref); if (!m || el.tagName === 'A') return;
      FS.url(m).then(u => { if (u) el.src = u; }).catch(() => {}); });
  }
  const fileMeta = id => LIVE.files.find(x => x.id === id) || metaCache.get(id) || null;

  // ======================= голос: диктовка (распознавание речи браузера) и голосовые сообщения (MediaRecorder) =======================
  const SR = () => window.SpeechRecognition || window.webkitSpeechRecognition || null;
  const speechLang = () => I.lang === 'en' ? 'en-US' : 'ru-RU';
  const speechErr = e => e === 'not-allowed' || e === 'service-not-allowed' ? t('ai.speech.denied') : (e === 'network' ? t('ai.speech.network') : (e === 'no-speech' ? t('ai.speech.nospeech') : (e === 'aborted' ? '' : t('ai.speech.err', { e }))));
  function dictate(){
    const C = SR(); if (!C){ hint(t('ai.speech.none'), 'warn'); return; }
    if (recog){ try { recog.stop(); } catch(e){} return; }
    try {
      const r = new C(); r.lang = speechLang(); r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
      const base = inp.value ? inp.value.replace(/\s*$/, ' ') : '';
      r.onresult = ev => { let s = ''; for (let i = 0; i < ev.results.length; i++) s += ev.results[i][0].transcript; inp.value = base + s; autosize(); };
      r.onerror = ev => { const m = speechErr(ev && ev.error); if (m) hint(m, 'warn'); };
      r.onend = () => { recog = null; micState(false); };
      recog = r; r.start(); micState(true); hint(t('ai.speech.listen'));
    } catch(e){ recog = null; micState(false); hint(t('ai.speech.err', { e: (e && e.message) || e }), 'warn'); }
  }
  function micState(on){ const b = aip && aip.querySelector('#aipMic'); if (!b) return; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); b.setAttribute('aria-label', t(on ? 'ai.mic.stop' : 'ai.mic')); b.title = t(on ? 'ai.mic.stop' : 'ai.mic'); }
  async function recStart(){
    if (rec){ recStop(false); return; }
    const md = navigator.mediaDevices;
    if (!md || !md.getUserMedia || !window.MediaRecorder){ hint(t('ai.rec.none'), 'warn'); return; }
    let stream; try { stream = await md.getUserMedia({ audio:true }); } catch(e){ hint(t('ai.speech.denied'), 'warn'); return; }
    const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'].find(m => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
    let mr; try { mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined); } catch(e){ stream.getTracks().forEach(x => x.stop()); hint(t('ai.rec.err', { e: (e && e.message) || e }), 'warn'); return; }
    const r = rec = { mr, stream, chunks: [], t0: Date.now(), cancel:false, transcript:'', sr:null, ac:null, an:null, timer:0 };
    mr.ondataavailable = e => { if (e.data && e.data.size) r.chunks.push(e.data); };
    mr.onstop = () => recDone(r);
    mr.start(250);
    const C = SR();
    if (C){ try { const s = new C(); s.lang = speechLang(); s.continuous = true; s.interimResults = false; s.onresult = ev => { let x = ''; for (let i = 0; i < ev.results.length; i++) if (ev.results[i].isFinal) x += ev.results[i][0].transcript + ' '; r.transcript = x.trim(); }; s.onerror = () => {}; s.start(); r.sr = s; } catch(e){ r.sr = null; } }
    try { const AC = window.AudioContext || window.webkitAudioContext; if (AC){ r.ac = new AC(); const src = r.ac.createMediaStreamSource(stream); r.an = r.ac.createAnalyser(); r.an.fftSize = 64; src.connect(r.an); } } catch(e){ r.ac = null; r.an = null; }
    r.timer = setInterval(() => recTick(r), 200);
    const bar = aip.querySelector('#aipRec'); if (bar) bar.hidden = false;
    const vb = aip.querySelector('#aipVoice'); if (vb){ vb.classList.add('on'); vb.setAttribute('aria-pressed', 'true'); }
    hint(t('ai.rec.on'));
  }
  function recTick(r){
    const s = Math.floor((Date.now() - r.t0) / 1000), tt = aip.querySelector('#aipRecT'); if (tt) tt.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const bars = aip.querySelectorAll('#aipWave i');
    if (r.an && bars.length){ const a = new Uint8Array(r.an.frequencyBinCount); r.an.getByteFrequencyData(a); bars.forEach((b, i) => { const v = a[Math.min(a.length - 1, i * 2)] / 255; b.style.transform = `scaleY(${Math.max(0.12, v).toFixed(2)})`; }); }
    if (s >= 180){ hint(t('ai.rec.max')); recStop(false); }
  }
  function recStop(cancel){ const r = rec; if (!r) return; r.cancel = !!cancel; clearInterval(r.timer); try { r.sr && r.sr.stop(); } catch(e){} try { if (r.mr.state !== 'inactive') r.mr.stop(); else recDone(r); } catch(e){ recDone(r); } }
  function recDone(r){
    if (r.done) return; r.done = true; if (rec === r) rec = null;
    r.stream.getTracks().forEach(x => x.stop()); try { r.ac && r.ac.close(); } catch(e){}
    const bar = aip.querySelector('#aipRec'); if (bar) bar.hidden = true;
    const vb = aip.querySelector('#aipVoice'); if (vb){ vb.classList.remove('on'); vb.setAttribute('aria-pressed', 'false'); }
    if (r.cancel){ hint(t('ai.rec.cancelled')); return; }
    const type = (r.mr.mimeType || (r.chunks[0] && r.chunks[0].type) || 'audio/webm').split(';')[0], blob = new Blob(r.chunks, { type });
    if (!blob.size){ hint(t('ai.rec.empty'), 'warn'); return; }
    const dur = Math.max(1, Math.round((Date.now() - r.t0) / 1000)), ext = /mp4/.test(type) ? 'm4a' : (/ogg/.test(type) ? 'ogg' : 'webm');
    const d = new Date(), stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;
    const file = new File([blob], `voice-${stamp}.${ext}`, { type });
    const go = tr => ask(tr || '', { files: [file], voice: { dur }, transcript: tr || null });
    setTimeout(() => { if (r.transcript || !srv()) return go(r.transcript); srvTranscribe(blob).then(tr => { if (!tr) hint(t('ai.tr.none'), 'warn'); go(tr); }); }, r.sr ? 500 : 0);
  }

  // ======================= отчёты помощника: считаются на дату «Данные на» и период, по правам роли =======================
  const REP_KINDS = ['morning', 'week', 'month', 'object', 'project', 'tasks', 'ar', 'onec'];
  const repDeny = (k, w) => ({ deny:true, title: t('ai.rep.' + k), text: t('ai.rep.deny', { k: t('ai.rep.' + k), r: F.rn(role().name), w: t('ai.rep.w.' + w) }), head: [], rows: [] });
  const kv = rows => ({ head: [t('ai.rep.k'), t('ai.rep.v')], rows });
  const objList = () => R.filtered().filter(o => W.active(o, anchor()));
  function defaultObj(){ const sc = R.SC(); if (sc.obj) return sc.obj; const L = objList(), at = anchor(); const m = L.find(o => W.objView(o, at, at, at).missed > 0); return (m || L[0] || {}).name || ''; }
  const projList = () => { const rl = role(), at = anchor(), lvl = rl.rt.tasks || '·'; if (lvl === '·') return [];
    const own = p => ['П','Б','Ч'].includes(lvl) || p.owner === rl.name || p.lead === rl.name || (p.members || []).includes(rl.name);
    return D.projectsAt(at).map((p, i) => ({ ...p, key:'w' + i })).filter(own).concat(LIVE.projects.filter(p => p.status !== 'отменено').map(p => ({ ...p, owner: p.lead || p.role, key: p.id, live:true })).filter(own)); };
  function buildReport(kind, param){
    const at = anchor(), rl = role(), RNG = K.RNG, money = hasMoney(rl), title = t('ai.rep.' + kind);
    const fn = REP[kind]; if (!fn) return null;
    const r = fn(at, rl, money, RNG, param); if (!r) return null;
    return { kind, title: r.title || title, text: r.text, head: r.head || [], rows: (r.rows || []).slice(0, 50), deny: !!r.deny, at, period: { from: RNG.from, to: RNG.to }, param: param || null };
  }
  const REP = {
    morning(at, rl, money){
      const os = W.objects.filter(o => W.active(o, at) && (money || R.objFilter(o))), v = os.map(o => W.objView(o, at, at, at)), ms = v.filter(x => x.missed > 0), plan = v.reduce((s, x) => s + x.plan, 0);
      const rows = [[t('ai.rep.r.shifts'), `${F.N(plan - ms.length)} / ${F.N(plan)}`], [t('ai.rep.r.missed'), ms.map(x => wn(x.o.name)).join(', ') || t('ai.none')]];
      if (money){ const b = W.balance(at), ar = W.receivables(at), hr = W.hr(at), oc = W.onec(at);
        rows.push([t('ai.rep.r.staff'), F.N(hr.total)], [t('ai.rep.r.vac'), `${hr.vac} / ${hr.sick}`], [t('ai.rep.r.cash'), F.MU(b.cash)], [t('ai.rep.r.ar'), F.MU(ar.total)], [t('ai.rep.r.o30'), F.MU(ar.overdue30)],
          [t('ai.rep.r.inc'), W.incidents.filter(x => x.day === at - 1 || x.day === at).length], [t('ai.rep.r.presc'), W.prescOpen(at).length], [t('ai.rep.r.onec'), `${oc.exportsOk} / ${oc.exportsTotal}`], [t('ai.rep.r.bk'), oc.effectorOk ? t('ai.rep.ok') : t('ai.rep.fail')]); }
      return { text: summary(at), ...kv(rows) };
    },
    week(at, rl, money){
      const from = Math.max(0, at - 6), os = W.objects.filter(o => W.active(o, at) && R.objFilter(o)), v = os.map(o => W.objView(o, from, at, at));
      const miss = v.reduce((s, x) => s + x.missed, 0), plan = v.reduce((s, x) => s + x.plan, 0), inc = W.incidents.filter(x => x.day >= from && x.day <= at && R.objFilter(x.obj)).length, chk = W.checks.filter(x => x.day >= from && x.day <= at && R.objFilter(x.obj)).length;
      const company = !R.isScoped(), tc = company ? W.tasksCreated(from, at) : 0, td = company ? W.tasksDone(from, at).length : 0, er = (at >= W.LAUNCH_DEMO ? D.errandsAt(at).length : 0) + LIVE.errands.filter(e => e.day >= from && e.day <= at).length;
      const p = money ? W.pl(from, at) : null;
      const rows = [[t('ai.rep.r.shifts'), `${F.N(plan - miss)} / ${F.N(plan)}`], [t('ai.rep.r.inc'), inc], [t('ai.rep.r.chk'), chk], [t('ai.rep.r.tc'), tc], [t('ai.rep.r.td'), td], [t('ai.rep.r.err'), er]];
      if (p) rows.push([t('ai.rep.r.rev'), F.MU(p.revenue)], [t('ai.rep.r.ebitda'), F.MU(p.ebitda)]);
      return { text: t('ai.rep.week_text', { a: F.dts(from), b: F.dt(at), miss: F.N(miss), plan: F.N(plan), inc, chk, tc, td, er, money: p ? t('ai.rep.week_money', { rev: F.MU(p.revenue), e: F.MU(p.ebitda) }) : '' }), ...kv(rows) };
    },
    month(at, rl, money){
      if (!money) return repDeny('month', 'money');
      const mi = W.monthIdx(at) - (W.MONTHS[W.monthIdx(at)].end === at ? 0 : 1); if (mi < 0) return { text: t('ai.rep.month_none'), rows: [] };
      const M0 = W.MONTHS[mi], p = W.pl(M0.start, M0.end), tx = W.taxes(M0.start, M0.end), ar = W.receivables(at), mn = `${I.month(M0.m, 'long')} ${M0.y}`;
      const pt = tx.employee + tx.employerSum;
      return { text: t('ai.rep.month_text', { m: mn, rev: F.MU(p.revenue), e: F.MU(p.ebitda), net: F.MU(p.net), vat: F.MU(tx.vat), pt: F.MU(pt), d: F.dt(at), ar: F.MU(ar.total) }),
        ...kv([[t('ai.rep.r.rev'), F.MU(p.revenue)], [t('ai.rep.r.ebitda'), F.MU(p.ebitda)], [t('ai.rep.r.net'), F.MU(p.net)], [t('ai.rep.r.vat'), F.MU(tx.vat)], [t('ai.rep.r.ptax'), F.MU(pt)], [t('ai.rep.r.ar'), F.MU(ar.total)], [t('ai.rep.r.o30'), F.MU(ar.overdue30)]]) };
    },
    object(at, rl, money, RNG, param){
      const name = param && objList().some(o => o.name === param) ? param : defaultObj(), o = W.objects.find(x => x.name === name); if (!o) return { text: t('ai.pr.none'), rows: [] };
      const v = W.objView(o, RNG.from, RNG.to, at), inc = W.incidents.filter(x => x.obj === o && x.day >= RNG.from && x.day <= RNG.to).length, chk = W.checks.filter(x => x.obj === o && x.day >= RNG.from && x.day <= RNG.to).length;
      const rows = [[t('ai.rep.r.region'), `${I.tx(o.region)}, ${I.tx(o.city)}`], [t('ai.rep.r.kind'), I.tx(o.kind)], [t('ai.rep.r.posts'), o.posts], [t('ai.rep.r.sched'), o.sched], [t('ai.rep.r.shifts'), `${F.N(v.plan - v.missed)} / ${F.N(v.plan)}`], [t('ai.rep.r.inc'), inc], [t('ai.rep.r.chk'), chk], [t('ai.rep.r.contract'), F.dt(o.contractEnd)]];
      if (money) rows.push([t('ai.rep.r.rev'), F.MU(v.rev)], [t('ai.rep.r.profit'), F.MU(v.profit)], [t('ai.rep.r.margin'), F.P(v.margin)]);
      return { title: `${t('ai.rep.object')}: ${wn(o.name)}`, text: t('ai.rep.obj_text', { o: wn(o.name), c: wn(o.customer.name), posts: o.posts, s: o.sched, p: F.periodTxt(), miss: F.N(v.missed), plan: F.N(v.plan), inc, chk, ce: F.dt(o.contractEnd), money: money ? t('ai.rep.obj_money', { rev: F.MU(v.rev), profit: F.MU(v.profit), m: F.P(v.margin) }) : '' }), ...kv(rows) };
    },
    project(at, rl, money, RNG, param){
      const L = projList(); if (!L.length) return { text: t('ai.pr.none'), rows: [] };
      const p = L.find(x => x.key === param) || L[0], s = projSummary(p);
      return { title: `${t('ai.rep.project')}: ${I.tx(p.name)}`, text: s.text, ...kv(s.rows) };
    },
    tasks(at, rl){
      if ((rl.rt.tasks || '·') === '·') return repDeny('tasks', 'tasks');
      const w = W.tasksAt(at).filter(x => x.owner === rl.name).map(x => [x.no, I.tx(x.title), stTask(x.status), F.dts(x.due), x.overdue]);
      const l = LIVE.tasks.filter(x => x.owner === rl.name && !['выполнено','отменено'].includes(x.status)).map(x => [x.no || '—', x.title, stTask(x.status || 'в работе'), x.due != null ? F.dts(x.due) : '—', x.due != null && x.due < at]);
      const all = l.concat(w);
      return { text: t('ai.rep.tasks_text', { r: F.rn(rl.name), d: F.dt(at), n: all.length, late: all.filter(x => x[4]).length, rev: all.filter(x => /проверк|review/i.test(x[2])).length }), head: t('ai.rep.t.cols').split('|'), rows: all.map(x => x.slice(0, 4)) };
    },
    ar(at, rl, money){
      if (!money) return repDeny('ar', 'money');
      const r = W.receivables(at, R.custFilter), top = [...r.byCust.values()].sort((a, b) => b.overdue - a.overdue).slice(0, 15);
      const n = top.filter(e => e.overdue > 0).length;
      return { text: t('ai.rep.ar_text', { d: F.dt(at), total: F.MU(r.total), o30: F.MU(r.overdue30), n }), head: t('ai.rep.ar.cols').split('|'), rows: top.map(e => [wn(e.cust.name), F.MU(e.debt), F.MU(e.overdue), e.maxDays, e.overdue > 0 ? t('ai.rep.ar.letter') : t('ai.rep.ar.none')]) };
    },
    onec(at, rl){
      if ((rl.rt.onec || '·') === '·') return repDeny('onec', 'onec');
      const days = []; for (let d = at; d > at - 7 && d >= 0; d--) days.push([d, W.onec(d)]);
      const ok = days.reduce((s, [, x]) => s + x.exportsOk, 0), all = days.reduce((s, [, x]) => s + x.exportsTotal, 0), bk = days.filter(([, x]) => x.effectorOk).length;
      return { text: t('ai.rep.onec_text', { d: F.dt(at), ok: F.N(ok), all: F.N(all), bk, free: F.P(W.onec(at).diskBackupFree * 100) }), head: t('ai.rep.onec.cols').split('|'), rows: days.map(([d, x]) => [F.dt(d), `${x.exportsOk} / ${x.exportsTotal}`, x.effectorOk ? t('ai.rep.ok') : t('ai.rep.fail'), x.sessions, x.errors]) };
    },
  };
  const stTask = s => I.tx(s);
  function projSummary(p){
    const at = anchor();
    if (p.live){ const st = (p.stages || []).map(s => typeof s === 'string' ? { name: s, done:false } : s), dn = st.filter(s => s.done).length, cur = st.find(s => !s.done), tk = LIVE.tasks.filter(x => x.project === p.id);
      const prog = st.length ? dn / st.length : 0;
      return { text: t('ai.pr.sum_text', { n: p.name, o: F.rn(p.lead || p.role), a: F.dt(p.from ?? p.day), b: F.dt(p.to ?? p.day), p: F.P(prog * 100), st: st.map(s => (s.done ? '✓ ' : '') + s.name).join(' → '), cur: cur ? cur.name : t('ai.pr.done'), t: tk.length, late: '' }),
        rows: [[t('ai.rep.r.owner'), F.rn(p.lead || p.role)], [t('ai.rep.r.deadline'), `${F.dts(p.from ?? p.day)} – ${F.dt(p.to ?? p.day)}`], [t('ai.rep.r.prog'), F.P(prog * 100)], [t('ai.rep.r.stage'), cur ? cur.name : t('ai.pr.done')], [t('ai.rep.r.tasks'), tk.length]] }; }
    const cur = p.stDone >= p.stages.length ? t('ai.pr.done') : I.tx(p.stages[p.stDone]);
    return { text: t('ai.pr.sum_text', { n: I.tx(p.name), o: F.rn(p.owner), a: F.dt(p.from), b: F.dt(p.to), p: F.P(p.prog * 100), st: p.stages.map((s, i) => (i < p.stDone ? '✓ ' : '') + I.tx(s)).join(' → '), cur, t: p.tasks, late: p.late ? t('ai.pr.late') : '' }),
      rows: [[t('ai.rep.r.owner'), F.rn(p.owner)], [t('ai.rep.r.deadline'), `${F.dts(p.from)} – ${F.dt(p.to)}`], [t('ai.rep.r.prog'), F.P(p.prog * 100)], [t('ai.rep.r.stage'), cur], [t('ai.rep.r.tasks'), p.tasks]] };
  }
  function projWeek(p){
    const at = anchor(), d = Math.min(at + 7, W.FACT_END + 7);
    if (p.live){ const tk = LIVE.tasks.filter(x => x.project === p.id && !['выполнено','выполнена','отменена'].includes(x.status) && (x.due ?? at) <= at + 7);
      if (tk.length) return t('ai.pr.week_text', { d: F.dt(at + 7), n: p.name, list: tk.map(x => `${x.no || ''} ${x.title} (${x.due != null ? F.dts(x.due) : '—'})`).join('; ') });
      const cur = (p.stages || []).find(s => !s.done); return t('ai.pr.week_text', { d: F.dt(at + 7), n: p.name, list: t('ai.pr.week_stage', { s: cur ? cur.name || cur : t('ai.pr.done'), k: Math.max(0, (p.to ?? at) - at) }) }); }
    return t('ai.pr.week_text', { d: F.dt(d), n: I.tx(p.name), list: t('ai.pr.week_stage', { s: p.stDone >= p.stages.length ? t('ai.pr.done') : I.tx(p.stages[p.stDone]), k: Math.max(0, p.to - at) }) });
  }
  const csvOf = (head, rows) => [head, ...rows].map(r => r.map(c => { const s = plainText(c); return /[",;\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\n');
  function download(name, text){
    try { const blob = new Blob(['﻿' + text], { type:'text/csv;charset=utf-8' }), u = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = u; a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 3000); } catch(e){ hint(String(e && e.message || e), 'warn'); }
  }
  async function saveReport(rep, extra){
    const row = await Live.add('reports', { kind: rep.kind, title: rep.title, period: rep.period, at: rep.at, text: rep.text.slice(0, 6000), table: { head: rep.head.map(plainText), rows: rep.rows.map(r => r.map(plainText)) }, param: rep.param, ...(extra || {}) }, { journal:false });
    aiJournal('reports', 'report', row, { no: row && row.no }); return row;
  }
  const toChat = (ch, text) => Live.add('chat', srv() ? { ch, text: String(text).slice(0, 4000), fwd:'ai' } : { ch, text: String(text).slice(0, 4000), bot:true, roleAs: t('ai.roleas') }).then(row => { aiJournal('chat', 'chat', row || { id:null, text }, { ch }); return row; });

  // ======================= регламентные поручения: 8 предустановленных + свои; планировщик в браузере =======================
  const PRESETS = [
    { preset:'summary', tkey:'ai.p.summary', roleOwner:'Исполнительный директор', schedule:{ kind:'daily', time:'07:30' }, action:'summary', params:{}, deliverTo:['chat:lead','kokpit'] },
    { preset:'staff', tkey:'ai.p.staff', roleOwner:'Начальник охраны', schedule:{ kind:'daily', time:'06:30' }, action:'check', params:{ check:'staff' }, deliverTo:['aichat','chat:sec'] },
    { preset:'objrep', tkey:'ai.p.objrep', roleOwner:'Начальник объекта', schedule:{ kind:'daily', time:'20:00' }, action:'report', params:{ report:'object' }, deliverTo:['chat:sec','aichat'] },
    { preset:'onec', tkey:'ai.p.onec', roleOwner:'Администратор системы', schedule:{ kind:'daily', time:'03:30' }, action:'check', params:{ check:'onec' }, deliverTo:['chat:it','aichat'] },
    { preset:'week', tkey:'ai.p.week', roleOwner:'Исполнительный директор', schedule:{ kind:'weekly', time:'08:00', dow:1 }, action:'report', params:{ report:'week' }, deliverTo:['chat:lead','aichat'] },
    { preset:'month', tkey:'ai.p.month', roleOwner:'Главный бухгалтер', schedule:{ kind:'monthly', time:'09:00', dom:1 }, action:'report', params:{ report:'month' }, deliverTo:['chat:buh','chat:lead','aichat'] },
    { preset:'tax', tkey:'ai.p.tax', roleOwner:'Главный бухгалтер', schedule:{ kind:'monthly', time:'09:00', dom:25 }, action:'check', params:{ check:'tax' }, deliverTo:['chat:buh','task'] },
    { preset:'contracts', tkey:'ai.p.contracts', roleOwner:'Юрист', schedule:{ kind:'daily', time:'09:00' }, action:'check', params:{ check:'contracts' }, deliverTo:['folder:Юрист','aichat'] },
  ];
  const presetNext = {};
  const rTitle = r => r.tkey ? t(r.tkey) : (r.title || '—');
  function nextRunOf(s, from){
    if (!s || !/^\d{1,2}:\d{2}$/.test(s.time || '')) return null;
    const [hh, mm] = s.time.split(':').map(Number), d0 = new Date(from);
    for (let i = 0; i < 400; i++){
      const c = new Date(d0.getFullYear(), d0.getMonth(), d0.getDate() + i, hh, mm, 0, 0); if (c.getTime() <= from) continue;
      if (s.kind === 'daily') return c.getTime();
      if (s.kind === 'weekly' && ((c.getDay() + 6) % 7) + 1 === (+s.dow || 1)) return c.getTime();
      if (s.kind === 'monthly' && c.getDate() === Math.min(28, Math.max(1, +s.dom || 1))) return c.getTime();
    }
    return null;
  }
  const schedTxt = s => { if (!s) return '—'; const wd = I.weekdays(); return s.kind === 'weekly' ? t('ai.r.sched_w', { dw: wd[(+s.dow || 1) % 7], t: s.time }) : (s.kind === 'monthly' ? t('ai.r.sched_m', { n: s.dom, t: s.time }) : t('ai.r.sched_d', { t: s.time })); };
  const toTxt = (to, owner) => (to || []).map(x => x === 'aichat' ? t('ai.r.to.aichat') : (x === 'task' ? t('ai.r.to.task') : (x === 'kokpit' ? t('ai.r.to.kokpit') : (x.startsWith('chat:') ? t('ai.r.to.chat', { c: chatName(x.slice(5)) }) : (x.startsWith('folder:') ? t('ai.r.to.folder', { r: F.rn(x.slice(7) || owner) }) : x))))).join(', ');
  function routinesAll(){
    const mat = LIVE.routines.filter(r => r.status !== 'отменено'), have = new Set(mat.map(r => r.preset).filter(Boolean));
    const virt = PRESETS.filter(p => !have.has(p.preset)).map(p => ({ ...p, id: 'preset:' + p.preset, virtual:true, enabled:true, nextRun: presetNext[p.preset] || (presetNext[p.preset] = nextRunOf(p.schedule, Date.now())) }));
    return virt.concat(mat);
  }
  function routinesVisible(){ const rl = role(); return routinesAll().filter(r => seesAll(rl) || r.roleOwner === rl.name || r.createdBy === rl.name); }
  const canRoutine = rl => ['П','Б','С'].includes(rl.rt.ai || '·') && !LIVE.ro;
  const canEditRoutine = (rl, r) => canRoutine(rl) && (seesAll(rl) || r.roleOwner === rl.name || r.createdBy === rl.name);
  async function materialize(r, patch){
    if (!r.virtual) return r;
    const { id, virtual, nextRun, ...base } = r;
    const row = await Live.add('routines', { ...base, enabled: true, createdBy:'preset', nextRun: nextRunOf(base.schedule, Date.now()), ...(patch || {}) }, { journal:false });
    return row || r;
  }
  // действие регламента — по правам роли-владельца
  function routineOutput(r, no){
    const a = r.action, p = r.params || {};
    if (a === 'summary') return { text: summary(anchor()) };
    if (a === 'report'){ const rep = buildReport(p.report || 'week', p.param); return rep ? { text: rep.text, head: rep.head, rows: rep.rows, deny: rep.deny } : { text: '—' }; }
    if (a === 'check'){ const q = { staff:'укомплектованность риски невыхода', onec:'состояние 1С и копий', contracts:'реестр договоров истекает', tax:'налоги к уплате' }[p.check] || 'сводка'; const ans = answer(q, { no }); return { text: ans.text, deny: ans.deny }; }
    if (a === 'reminder') return { text: t('ai.r.reminder', { x: p.textTemplate || rTitle(r) }) };
    const ans = answer(p.textTemplate || rTitle(r), { no }); return { text: ans.text, deny: ans.deny, free: ans.free, q: p.textTemplate };
  }
  async function runRoutine(r, how){
    if (srv()){                                      // на сервере регламенты выполняет планировщик движка; «выполнить сейчас» — api/routines/run/:id
      const row = r.virtual ? await materialize(r, {}) : r;
      if (!row || !/^\d+$/.test(String(row.id))){ hint(t('ai.ro'), 'warn'); return null; }
      try { const d = await srvPost('api/routines/run/' + row.id, {}); const er = d.errand || { no: '—' }; hint(t('ai.r.ran', { t: rTitle(row), no: er.no || '—', to: toTxt(row.deliverTo, row.roleOwner) })); return er; }
      catch(e){ hint(t('ai.att.err', { n: rTitle(row), e: (e && e.code) || e }), 'warn'); return null; }
    }
    if (before()){ hint(t('ai.launch', { d: F.dt(W.LAUNCH_DEMO), at: F.dt(anchor()) }), 'warn'); return null; }
    if (LIVE.ro){ hint(t('ai.ro'), 'warn'); return null; }
    const t0 = Date.now(), at = anchor(), title = rTitle(r), no = nextErrNo();
    let out = withRole(r.roleOwner, () => routineOutput(r, no));
    if (out.free && Live.cap.sample){ try { const txt = await withRoleAsync(r.roleOwner, () => aiAsk(out.q || title, null, undefined, { section:'ai', words: 600 })); out = { ...out, text: txt }; } catch(e){} }
    const text = `${title} · ${F.dt(at)}${how === 'catchup' ? ' · ' + t('ai.r.catchup') : ''}\n${out.text}`;
    const st = out.deny ? 'отклонено по правам' : 'выполнено', targets = out.deny ? ['aichat'] : (r.deliverTo || ['aichat']);
    const er = await addErrand({ no, q: title, a: out.text.slice(0, 6000), st, step:1, src:'routine', routineId: r.id && !r.virtual ? r.id : null, routineKey: r.preset || null, deliverTo: targets, role: r.roleOwner, durationMs: Date.now() - t0, how }, out.deny ? 'denied' : 'answered') || { no };
    for (const x of targets){
      if (x === 'aichat') pushChat({ who:'ai', label:'routine', text, no, st, role: r.roleOwner, uid: null, routine: true });
      else if (x.startsWith('chat:')) await toChat(x.slice(5), text);
      else if (x.startsWith('folder:')) await toFolder(er, title, text, x.slice(7) || r.roleOwner);
      else if (x === 'task') await toTask(er, title, text, r.roleOwner);
      else if (x === 'kokpit') await saveReport({ kind:'routine', title, text: out.text, head: out.head || [], rows: out.rows || [], at, period: { from: K.RNG.from, to: K.RNG.to }, param: null }, { kokpit:true, routineKey: r.preset || null });
    }
    const now = Date.now(), patch = { lastRun: now, lastNo: no, nextRun: nextRunOf(r.schedule, now), runs: (r.runs || 0) + 1 };
    if (r.virtual){ presetNext[r.preset] = patch.nextRun; await materialize(r, patch); }
    else await Live.update('routines', r.id, patch, { journal:false, what:'запуск' });
    aiJournal('routines', 'routine_run', { ...r, title, id: r.id }, { no, how });
    hint(t('ai.r.ran', { t: title, no, to: toTxt(targets, r.roleOwner) }));
    return er;
  }
  async function withRoleAsync(name, fn){ const S = K.S, prev = S.role; S.role = name || prev; try { const p = fn(); S.role = prev; return await p; } finally { S.role = prev; } }
  const running = new Set();
  function tick(){
    if (!K || before() || LIVE.ro || srv()) return;      // на сервере — планировщик движка 24/7, браузер не дублирует запуски
    const now = Date.now(), me = K.S.role;
    routinesAll().forEach(r => {
      if (!r.enabled || r.roleOwner !== me) return;
      const next = r.nextRun, id = r.id; if (!next || now < next || running.has(id)) return;
      if (r.lastRun && r.lastRun >= next){ if (!r.virtual) Live.update('routines', r.id, { nextRun: nextRunOf(r.schedule, now) }, { journal:false, what:'расписание' }); return; }
      const how = now - next > 5 * 60 * 1000 ? 'catchup' : 'auto';
      if (r.virtual) presetNext[r.preset] = nextRunOf(r.schedule, now);
      running.add(id); runRoutine(r, how).catch(e => console.error(e)).finally(() => running.delete(id));
    });
  }

  // ======================= панель: разметка, режимы, размер, перетаскивание =======================
  const IC = {
    side:'M3 4h18v16H3zM15 4v16', bottom:'M3 4h18v16H3zM3 14h18', full:'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5', unfull:'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5', min:'M5 19h14', close:'M6 6l12 12M18 6L6 18',
    clip:'M21 11l-8.5 8.5a5 5 0 01-7-7L14 4a3.5 3.5 0 015 5l-8.5 8.5a2 2 0 01-3-3L15 7', mic:'M12 3a3 3 0 013 3v6a3 3 0 01-6 0V6a3 3 0 013-3zM5 11a7 7 0 0014 0M12 18v3', rec:'M12 12m-6 0a6 6 0 1012 0a6 6 0 10-12 0', spark:'M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8z',
  };
  function shell(){
    return `<div class="aip-grip" role="separator" tabindex="0" aria-orientation="vertical" aria-label="${esc(t('ai.grip.w'))}" data-drag="w"></div><div class="aip-corner" aria-hidden="true" title="${esc(t('ai.corner'))}" data-drag="wh"></div>
      <button type="button" class="aip-minbar" data-aa="restore" aria-label="${esc(t('ai.min.open'))}">${svg(IC.spark)}<span>${esc(t('ai.title'))}</span><span class="aip-unread" hidden></span></button>
      <header class="aip-head"><div class="aip-ttl"><b>${esc(t('ai.title'))}</b> <small>${esc(t('ai.step'))}</small></div>
        <div class="aip-ctl"><button type="button" class="aip-ib aip-dk" data-aa="mode" data-m="side" aria-label="${esc(t('ai.mode.side'))}" title="${esc(t('ai.mode.side'))}">${svg(IC.side)}</button><button type="button" class="aip-ib aip-dk" data-aa="mode" data-m="bottom" aria-label="${esc(t('ai.mode.bottom'))}" title="${esc(t('ai.mode.bottom'))}">${svg(IC.bottom)}</button><button type="button" class="aip-ib aip-dk" data-aa="mode" data-m="full" id="aipFullBtn">${svg(IC.full)}</button><button type="button" class="aip-ib" data-aa="min" aria-label="${esc(t('ai.mode.min'))}" title="${esc(t('ai.mode.min'))}">${svg(IC.min)}</button><button type="button" class="aip-ib" id="aiClose" data-aa="close" aria-label="${esc(t('ai.close'))}" title="${esc(t('ai.close'))}">${svg(IC.close)}</button></div></header>
      <div class="aip-tabs" role="tablist" aria-label="${esc(t('ai.tabs'))}">${TABS.map(x => `<button type="button" role="tab" id="aipTab-${x}" data-aa="tab" data-tab="${x}" aria-controls="aipBody">${esc(t('ai.tab.' + x))}</button>`).join('')}</div>
      <div class="aip-body" id="aipBody" role="tabpanel" tabindex="-1"></div>
      <div class="aip-comp" id="aipComp">
        <div class="chips aip-chips" id="aipChips"></div>
        <div class="aip-att" id="aipAtt" hidden></div>
        <div class="aip-rec" id="aipRec" hidden><span class="aip-dot" aria-hidden="true"></span><span id="aipRecT" aria-live="off">0:00</span><span class="aip-wave" id="aipWave" aria-hidden="true">${'<i></i>'.repeat(14)}</span><button type="button" class="btn-sec" data-aa="rec-stop">${esc(t('ai.rec.stop'))}</button><button type="button" class="btn-quiet" data-aa="rec-cancel">${esc(t('ai.rec.cancel'))}</button></div>
        <form class="ask aip-ask" id="askForm" autocomplete="off"><button type="button" class="aip-ib" id="aipClip" data-aa="clip" aria-label="${esc(t('ai.clip'))}" title="${esc(t('ai.clip'))}">${svg(IC.clip)}</button><textarea id="askInp" rows="1" maxlength="4000" placeholder="${esc(t('ai.ph'))}" aria-label="${esc(t('ai.q'))}"></textarea><button type="button" class="aip-ib" id="aipMic" data-aa="mic" aria-pressed="false" aria-label="${esc(t('ai.mic'))}" title="${esc(t('ai.mic'))}">${svg(IC.mic)}</button><button type="button" class="aip-ib" id="aipVoice" data-aa="voice" aria-pressed="false" aria-label="${esc(t('ai.voice'))}" title="${esc(t('ai.voice'))}">${svg(IC.rec)}</button><button type="submit" class="aip-send" aria-label="${esc(t('ai.send'))}">→</button></form>
        <input type="file" id="aipFile" multiple hidden>
        <p class="aip-hint" id="aipHint" role="status" aria-live="polite"></p>
      </div>`;
  }
  function build(){
    aip = document.getElementById('aip'); if (!aip) return false;
    const keep = inp ? inp.value : '';
    aip.innerHTML = shell(); aip.setAttribute('aria-label', t('ai.panel'));
    { const tb = aip.querySelector('.aip-tabs'); if (tb){ const ovf = () => tb.classList.toggle('ovf', tb.scrollWidth > tb.clientWidth + 1 && tb.scrollLeft + tb.clientWidth < tb.scrollWidth - 1); tb.addEventListener('scroll', ovf, { passive:true }); if (window.ResizeObserver) new ResizeObserver(ovf).observe(tb); } }   // М1: признак прокрутки вкладок
    bodyEl = aip.querySelector('#aipBody'); compEl = aip.querySelector('#aipComp'); inp = aip.querySelector('#askInp'); inp.value = keep;
    aip.querySelector('#askForm').addEventListener('submit', e => { e.preventDefault(); send(); });
    inp.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); send(); } });
    inp.addEventListener('input', autosize);
    aip.querySelector('#aipFile').addEventListener('change', e => { stageFiles(e.target.files); e.target.value = ''; });
    aip.querySelectorAll('[data-drag]').forEach(el => el.addEventListener('pointerdown', e => drag(e, el.dataset.drag)));
    aip.querySelector('.aip-grip').addEventListener('keydown', gripKey);
    if (!isOpen) bodyEl.innerHTML = `<div class="msgs" id="msgs"><div class="m a"><b>${esc(t('ai.who.duty'))}</b><span class="aip-txt">${esc(t('aip.loading'))}</span></div></div>`;   // до первого открытия — заглушка, сводка считается при открытии
    paintStaged(); layout();
    return true;
  }
  function send(){ const q = inp.value.trim(), files = staged.map(x => x.file); if (!q && !files.length) return; inp.value = ''; autosize(); staged = []; paintStaged(); ask(q, { files, src:'aichat' }); }
  function autosize(){ if (!inp) return; inp.style.height = 'auto'; inp.style.height = Math.min(160, inp.scrollHeight + 2) + 'px'; }
  let hintAt = 0;
  function hint(msg, kind, auto){ const h = aip && aip.querySelector('#aipHint'); if (!h) return; h.textContent = msg || ''; h.dataset.kind = kind || ''; if (!auto) hintAt = Date.now(); }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const maxW = () => Math.max(360, Math.min(900, innerWidth - 300));
  function layout(){
    if (!aip) return;
    const ph = phone(), m = curMode(), root = document.documentElement.style;
    ['side','bottom','full'].forEach(x => aip.classList.toggle('aip-' + x, m === x));
    aip.classList.toggle('aip-phone', ph); aip.classList.toggle('aip-min', !!pref.min);
    pref.w = clamp(+pref.w || 440, 360, maxW()); pref.hs = clamp(+pref.hs || 1, 0.5, 1); pref.hb = clamp(+pref.hb || 360, 220, Math.round(innerHeight * 0.9)); pref.hp = clamp(+pref.hp || 100, 60, 100);
    root.setProperty('--aip-w', pref.w + 'px'); root.setProperty('--aip-hs', String(pref.hs)); root.setProperty('--aip-hb', pref.hb + 'px');
    if (ph && !pref.min){ const vv = window.visualViewport, vh = vv ? vv.height : innerHeight; aip.style.height = Math.round(vh * pref.hp / 100) + 'px'; aip.style.bottom = vv ? Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop)) + 'px' : '0px'; }
    else { aip.style.height = ''; aip.style.bottom = ''; }
    const on = isOpen && !pref.min && !ph, b = document.body;
    b.classList.toggle('aip-on-side', on && m === 'side'); b.classList.toggle('aip-on-bottom', on && m === 'bottom');
    const main = document.querySelector('.main'); if (main) main.inert = isOpen && !pref.min && m === 'full';
    const g = aip.querySelector('.aip-grip'), vert = m === 'side';
    if (g){ g.setAttribute('aria-orientation', vert ? 'vertical' : 'horizontal'); g.setAttribute('aria-label', t(vert ? 'ai.grip.w' : 'ai.grip.h'));
      const [now, lo, hi] = vert ? [pref.w, 360, maxW()] : (ph ? [pref.hp, 60, 100] : [pref.hb, 220, Math.round(innerHeight * 0.9)]);
      g.setAttribute('aria-valuenow', Math.round(now)); g.setAttribute('aria-valuemin', lo); g.setAttribute('aria-valuemax', hi); }
    const fb = aip.querySelector('#aipFullBtn'); if (fb){ const f = pref.mode === 'full'; fb.innerHTML = svg(f ? IC.unfull : IC.full); fb.setAttribute('aria-label', t(f ? 'ai.mode.unfull' : 'ai.mode.full')); fb.title = t(f ? 'ai.mode.unfull' : 'ai.mode.full'); fb.setAttribute('aria-pressed', f); }
    aip.querySelectorAll('[data-aa="mode"][data-m="side"],[data-aa="mode"][data-m="bottom"]').forEach(x => x.setAttribute('aria-pressed', pref.mode === x.dataset.m));
    const ub = aip.querySelector('.aip-unread'); if (ub){ ub.hidden = !unread; ub.textContent = unread; ub.setAttribute('aria-label', t('ai.unread', { n: unread })); }
  }
  let lastMainW = 0;
  function reflowMain(){ const main = document.querySelector('#content'); if (!main) return; const w = main.getBoundingClientRect().width; if (lastMainW && Math.abs(w - lastMainW) > 60 && !document.querySelector('#modal:not([hidden])')) K.render(); lastMainW = w; }
  function drag(e, kind){
    if (e.button != null && e.button !== 0) return; e.preventDefault();
    const el = e.currentTarget; try { el.setPointerCapture(e.pointerId); } catch(_){}
    aip.classList.add('aip-drag');
    const move = ev => { const m = curMode();
      if (phone()) pref.hp = clamp((innerHeight - ev.clientY) / innerHeight * 100, 60, 100);
      else if (m === 'side'){ pref.w = clamp(innerWidth - ev.clientX, 360, maxW()); if (kind === 'wh') pref.hs = clamp((innerHeight - ev.clientY) / innerHeight, 0.5, 1); }
      else if (m === 'bottom') pref.hb = clamp(innerHeight - ev.clientY, 220, Math.round(innerHeight * 0.9));
      layout(); };
    const up = () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up); aip.classList.remove('aip-drag'); savePref(); reflowMain(); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  }
  function gripKey(e){
    const m = curMode(), ph = phone(); let done = true;
    if (m === 'side' && !ph){ if (e.key === 'ArrowLeft') pref.w += 40; else if (e.key === 'ArrowRight') pref.w -= 40; else if (e.key === 'ArrowUp') pref.hs += 0.05; else if (e.key === 'ArrowDown') pref.hs -= 0.05; else done = false; }
    else if (ph){ if (e.key === 'ArrowUp') pref.hp += 5; else if (e.key === 'ArrowDown') pref.hp -= 5; else done = false; }
    else { if (e.key === 'ArrowUp') pref.hb += 40; else if (e.key === 'ArrowDown') pref.hb -= 40; else done = false; }
    if (done){ e.preventDefault(); layout(); savePref(); reflowMain(); }
  }
  function open(opts = {}){
    if (!aip && !build()) return;
    if (aip.hidden) lastFocus = document.activeElement;
    aip.hidden = false; isOpen = true; pref.min = false; unread = 0;
    if (opts.tab && TABS.includes(opts.tab)) pref.tab = opts.tab;
    savePref(); layout(); paintTabs(); renderBody(true); reflowMain();
    if (opts.focus !== false && pref.tab === 'chat' && inp && !phone()) inp.focus({ preventScroll:true });
  }
  function close(){
    if (!aip) return;
    if (rec) recStop(true); if (recog){ try { recog.abort(); } catch(e){} recog = null; }
    aip.hidden = true; isOpen = false; layout(); reflowMain();
    const f = lastFocus && document.contains(lastFocus) ? lastFocus : document.getElementById('aiBtn'); if (f && f.focus && !phone()) f.focus({ preventScroll:true });
  }
  function minimize(){ pref.min = true; unread = 0; savePref(); layout(); reflowMain(); const b = aip.querySelector('.aip-minbar'); if (b) b.focus({ preventScroll:true }); }
  function restore(){ pref.min = false; unread = 0; savePref(); layout(); renderBody(true); reflowMain(); }
  function setMode(m){
    if (m === 'full'){ if (pref.mode === 'full') pref.mode = pref.prev && pref.prev !== 'full' ? pref.prev : 'side'; else { pref.prev = pref.mode; pref.mode = 'full'; } }
    else { pref.mode = m; pref.prev = m; }
    pref.min = false; savePref(); layout(); renderBody(); reflowMain();
  }
  function setTab(tab){ if (!TABS.includes(tab)) return; pref.tab = tab; savePref(); paintTabs(); renderBody(true); }
  function paintTabs(){
    if (!aip) return; const dis = before() || !aiOk(role());
    aip.querySelectorAll('[data-aa="tab"]').forEach(b => { const on = b.dataset.tab === pref.tab; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; b.classList.toggle('on', on); b.disabled = dis && b.dataset.tab !== 'chat'; });
    bodyEl.setAttribute('aria-labelledby', 'aipTab-' + pref.tab);
    compEl.hidden = pref.tab !== 'chat';
  }

  // ======================= вкладки: отрисовка (панель — узкая, раздел «Ассистенты и наставники» — широкая) =======================
  function preserve(root, fn){
    const vals = {}; root.querySelectorAll('input[id], textarea[id], select[id]').forEach(el => { if (!['file','checkbox','radio'].includes(el.type)) vals[el.id] = el.value; });
    const ae = document.activeElement, keep = ae && ae.id && root.contains(ae) ? { id: ae.id, s: ae.selectionStart } : null, top = root.scrollTop;
    fn();
    Object.entries(vals).forEach(([id, v]) => { const el = document.getElementById(id); if (el && root.contains(el) && el.value !== v && (el.tagName !== 'SELECT' || [...el.options].some(o => o.value === v))) el.value = v; });
    if (keep){ const el = document.getElementById(keep.id); if (el){ el.focus({ preventScroll:true }); try { el.setSelectionRange(keep.s, keep.s); } catch(_){} } }
    return top;
  }
  function renderBody(scrollEnd){
    if (!aip || !isOpen || pref.min || !bodyEl) return;
    const top = preserve(bodyEl, () => { bodyEl.innerHTML = tabHtml(pref.tab, false); });
    bodyEl.classList.toggle('aip-chatbody', pref.tab === 'chat');
    hydrate(bodyEl); paintChips();
    const blocked = before() || !aiOk(role()); if (inp) inp.disabled = blocked || LIVE.ro;
    if (pref.tab === 'chat' && scrollEnd !== false) scrollChat(); else if (!scrollEnd) bodyEl.scrollTop = top;
    if (Date.now() - hintAt > 6000) hint(blocked ? '' : modeNote(), '', true);          // свежее сообщение (результат действия, ошибка) не затираем
    sig = sigNow();
  }
  const modeNote = () => [srv() ? t('ai.mode.server') : (Live.cap.sample ? t('ai.mode.sample') : t('ai.mode.builtin')), LIVE.ro ? t('ai.ro') : ''].filter(Boolean).join(' · ');
  function scrollChat(){ if (bodyEl && pref.tab === 'chat') bodyEl.scrollTop = bodyEl.scrollHeight; }
  let rbT = 0; const renderSoon = () => { clearTimeout(rbT); rbT = setTimeout(() => renderBody(pref.tab === 'chat'), 40); };
  const sigNow = () => [K.S.role, anchor(), K.RNG.from, K.RNG.to, I.lang, K.S.cur, K.S.region, K.S.type].join('|');
  function paintChips(){
    const box = aip.querySelector('#aipChips'); if (!box) return;
    const rl = role(); if (before() || !aiOk(rl)){ box.innerHTML = ''; return; }
    box.innerHTML = aiRole(rl).tasks.slice(0, 6).map(q => `<button type="button" data-aa="chip" data-q="${esc(q)}">${esc(I.tx(q))}</button>`).join('');
  }
  function gate(){
    const rl = role();
    if (!aiOk(rl)) return `<p class="banner-info">${esc(t('ai.noaccess', { r: F.rn(rl.name) }))}</p>`;
    if (before()) return `<p class="banner-info">${esc(t('ai.launch', { d: F.dt(W.LAUNCH_DEMO), at: F.dt(anchor()) }))}</p>`;
    return '';
  }
  function tabHtml(tab, wide){
    const g = gate(); if (g) return tab === 'chat' && !wide ? `<div class="msgs" id="msgs"><div class="m a"><b>${esc(t('ai.who.duty'))}</b><span class="aip-txt">${esc(before() ? summary(anchor()) : t('ai.noaccess', { r: F.rn(role().name) }))}</span></div></div>` : g;
    const ctx = wide ? 'g' : 'p';
    if (tab === 'projects') return projectsHtml(ctx, wide);
    if (tab === 'errands') return errandsHtml(ctx, wide);
    if (tab === 'routines') return routinesHtml(ctx, wide);
    if (tab === 'journal') return journalHtml(ctx, wide);
    if (tab === 'reports') return reportsHtml(ctx, wide);
    return chatHtml();
  }
  // ---------- Чат ----------
  function chatHtml(){
    const rows = myChat(), start = Math.max(0, rows.length - showN), rl = role();
    return `<div class="msgs" id="msgs" role="log" aria-live="polite"><div class="m a aip-sum"><b>${esc(t(['ed','gd','owner'].includes(rl.id) ? 'ai.who.duty' : 'ai.who.helper'))}</b><span class="aip-txt">${esc(summary(anchor()))}</span></div>${start > 0 ? `<button type="button" class="aip-more btn-quiet" data-aa="more">${esc(t('ai.more', { n: start }))}</button>` : ''}${rows.slice(start).map(msgHtml).join('')}</div>`;
  }
  function msgHtml(r){
    const k = esc(r.k || r.id), files = (r.files || []).filter(Boolean).map(f => fileHtml(f, 'msg')).join('');
    if (r.who === 'user') return `<div class="m u" data-k="${k}"><span class="aip-txt">${esc(r.text || '')}</span>${r.transcript ? `<small class="aip-tr">${esc(t('ai.transcript'))}</small>` : ''}${files ? `<div class="aip-files">${files}</div>` : ''}<small class="aip-meta">${esc(Live.tOf(r.ts || Date.now()))}</small></div>`;
    const txt = streaming.has(r.k) ? streaming.get(r.k) : (r.text || ''), chats = myChatsOf(role(), anchor());
    const did = r.no ? `<div class="aip-did"><span>${esc(t('ai.did'))}</span> <button type="button" class="lnk" data-aa="errand" data-no="${esc(r.no)}">${esc(t('ai.did.errand', { no: r.no, st: stName(r.st || 'выполнено') }))}</button>${r.sec ? ` · <a class="lnk" href="#${esc(r.sec)}">${esc(t('ai.did.open'))}</a>` : ''}</div>` : '';
    const acts = r.no && !r.deny && !streaming.has(r.k) && !LIVE.ro ? `<div class="aip-acts"><button type="button" class="btn-quiet" data-aa="m-task" data-k="${k}">${esc(t('ai.act.task'))}</button>${chats.length ? `<details class="aip-dd"><summary class="btn-quiet">${esc(t('ai.act.chat'))}</summary><div>${chats.map(c => `<button type="button" data-aa="m-chat" data-k="${k}" data-ch="${esc(c.id)}">${esc(I.tx(c.name))}</button>`).join('')}</div></details>` : ''}<button type="button" class="btn-quiet" data-aa="m-report" data-k="${k}">${esc(t('ai.act.report'))}</button></div>` : '';
    return `<div class="m a${r.deny ? ' aip-deny' : ''}" data-k="${k}"><b>${esc(t('ai.who.' + (r.label || 'helper')))}</b><span class="aip-txt">${esc(txt)}</span>${files ? `<div class="aip-files">${files}</div>` : ''}${did}${acts}<small class="aip-meta">${esc(Live.tOf(r.ts || Date.now()))}</small></div>`;
  }
  // ---------- Поручения ----------
  function errandRows(){
    const rl = role(), at = anchor(), all = seesAll(rl) && ef.who === 'all', q = ef.q.trim().toLowerCase();
    const live = LIVE.errands.filter(e => all || e.role === rl.name || (LIVE.uid && e.by === LIVE.uid && e.role === rl.name)).slice().reverse().map(e => ({ live:true, id: e.id, no: e.no || '—', when: `${F.dts(e.day ?? at)} ${Live.tOf(e.ts)}`, who: Live.whoOf(e), q: e.q || '', st: e.st || 'в работе', step: e.step || 1, res: e.a || '', mins: e.durationMs != null ? Math.max(1, Math.round(e.durationMs / 60000)) : '—', flag: !!e.flag, src: e.src || 'aichat' }));
    const world = at < W.LAUNCH_DEMO ? [] : D.errandsAt(at).filter(e => all || e.who === rl.name).map(e => ({ live:false, no: e.no, when: `${F.dts(e.day)} ${e.time}`, who: F.rn(e.who), q: I.tx(e.task), st: e.st, step: e.step, res: worldRes(e), mins: e.mins || '—', src:'world' }));
    return live.concat(world).filter(e => (ef.st === 'all' || e.st === ef.st) && (!q || (e.q + ' ' + e.res + ' ' + e.no).toLowerCase().includes(q)));
  }
  const worldRes = e => e.file === '—' ? '—' : (/1С/.test(e.file) ? t('ai.e.res.c1') : (/docx/.test(e.file) ? t('ai.e.res.docx') : t('ai.e.res.chat')));
  function errandsHtml(c, wide){
    const rl = role(), E = errandRows(), sts = ['all', 'в работе', 'выполнено', 'нужен человек', 'ждёт подписи человека', 'отклонено по правам'];
    const form = LIVE.ro ? '' : `<form class="aip-form" data-af="errand"><label class="aip-fl aip-wide">${esc(t('ai.e.q'))}<textarea id="${c}ErQ" name="q" rows="2" maxlength="2000" placeholder="${esc(t('ai.ph'))}"></textarea></label><label class="aip-fl">${esc(t('ai.e.due'))}<select id="${c}ErDue" name="due">${[15, 30, 60, 240].map(n => `<option value="${n}">${esc(t('ai.e.min', { n }))}</option>`).join('')}</select></label><label class="aip-fl">${esc(t('ai.e.to'))}<select id="${c}ErTo" name="to">${['aichat','folder','task'].map(x => `<option value="${x}">${esc(t('ai.e.to.' + x))}</option>`).join('')}</select></label><button type="submit" class="btn-accent">${esc(t('ai.e.create'))}</button></form>`;
    const filt = `<div class="aip-filt"><label>${esc(t('ai.e.f.st'))} <select id="${c}EfSt" data-ef="st">${sts.map(s => `<option value="${esc(s)}"${ef.st === s ? ' selected' : ''}>${esc(s === 'all' ? t('ai.e.f.all') : stName(s))}</option>`).join('')}</select></label>${seesAll(rl) ? `<label>${esc(t('ai.e.f.who'))} <select id="${c}EfWho" data-ef="who"><option value="mine"${ef.who === 'mine' ? ' selected' : ''}>${esc(t('ai.e.f.mine'))}</option><option value="all"${ef.who === 'all' ? ' selected' : ''}>${esc(t('ai.e.f.everyone'))}</option></select></label>` : ''}<label class="aip-grow">${esc(t('ai.e.search'))} <input id="${c}EfQ" data-ef="q" type="search" value="${esc(ef.q)}"></label></div>`;
    const list = !E.length ? `<div class="empty">${esc(t('ai.e.empty'))}</div>` : (wide ? U.table(t('ai.e.cols').split('|'), E.slice(0, 60).map(e => [`<b>${esc(e.no)}</b>${e.live ? ` <span class="pill i">${esc(t('ai.e.new_pill'))}</span>` : ''}${e.flag ? ` <span class="pill s s-bad">${esc(t('ai.e.flag_pill'))}</span>` : ''}`, esc(e.when), esc(e.who), esc(e.q), e.step, stPill(e.st), esc(String(e.res).slice(0, 140)) + (String(e.res).length > 140 ? '…' : ''), e.mins]), 'compact aip-etbl', [3, 6])
      : `<ul class="aip-list">${E.slice(0, 40).map(e => `<li><button type="button" class="aip-row" data-aa="errand" data-no="${esc(e.no)}"><span class="aip-rt"><b>${esc(e.no)}</b>${e.live ? ` <span class="pill i">${esc(t('ai.e.new_pill'))}</span>` : ''} ${stPill(e.st)}</span><span class="aip-rq">${esc(e.q)}</span><small>${esc(e.when)} · ${esc(e.who)}</small></button></li>`).join('')}</ul>`);
    return `<section class="aip-sec"><h3>${esc(t('ai.e.new'))}</h3>${form}</section><section class="aip-sec"><h3>${esc(t('ai.e.title'))}</h3>${filt}${list}<p class="lnote">${esc(t('ai.e.duty'))}</p></section>`;
  }
  function errandTiles(){
    const at = anchor(), E = D.errandsAt(at), done = E.filter(e => e.st === 'выполнено'), den = E.filter(e => e.st === 'отклонено по правам').length + LIVE.errands.filter(e => e.st === 'отклонено по правам').length;
    return `<div class="tiles">${U.tile(t('ai.e.t7'), E.length + LIVE.errands.length, [t('ai.e.t7d', { a: done.length + LIVE.errands.filter(e => e.st === 'выполнено').length, b: E.filter(e => e.st === 'в работе').length + LIVE.errands.filter(e => e.st === 'в работе').length })], '')}${U.tile(t('ai.e.avg'), t('ai.e.avgv', { n: F.F(done.reduce((s, e) => s + e.mins, 0) / Math.max(1, done.length), 1) }), [t('ai.e.avgd')], '')}${U.tile(t('ai.e.c1'), done.filter(e => e.c1).length, [t('ai.e.c1d')], '')}${U.tile(t('ai.e.den'), den, [t('ai.e.dend')], den ? 'var(--warn)' : '')}</div>`;
  }
  function errandCard(no){
    const live = LIVE.errands.find(e => e.no === no), w = !live && anchor() >= W.LAUNCH_DEMO ? D.errandsAt(anchor()).find(e => e.no === no) : null; if (!live && !w) return;
    const rows = live ? [[t('ai.e.k.q'), esc(live.q)], [t('ai.e.k.a'), `<span class="aip-pre">${esc(live.a || '—')}</span>`], [t('ai.e.k.who'), esc(Live.whoOf(live))], [t('ai.e.k.step'), live.step || 1], [t('ai.e.k.time'), `${F.dt(live.day ?? anchor())} ${Live.tOf(live.ts)}`], [t('ai.e.k.st'), stPill(live.st)], [t('ai.e.k.src'), esc(t('ai.src.' + (live.src || 'aichat')))], [t('ai.e.k.res'), esc(resTxt(live))], [t('ai.e.k.due'), esc(t('ai.e.min', { n: live.due || 15 }))], [t('ai.e.k.dur'), live.durationMs != null ? esc(t('ai.e.sec', { n: Math.max(1, Math.round(live.durationMs / 1000)) })) : '—'], [t('ai.e.k.files'), (live.files || []).map(id => fileMeta(id)).filter(Boolean).map(f => fileHtml(f, 'card')).join('') || '—']]
      : [[t('ai.e.k.q'), esc(I.tx(w.task))], [t('ai.e.k.who'), esc(F.rn(w.who))], [t('ai.e.k.step'), w.step], [t('ai.e.k.time'), `${F.dt(w.day)} ${w.time}`], [t('ai.e.k.st'), stPill(w.st)], [t('ai.e.k.src'), esc(t('ai.src.world'))], [t('ai.e.k.res'), esc(worldRes(w))], [t('ai.e.k.dur'), w.mins ? esc(t('ai.e.min', { n: w.mins })) : '—']];
    const acts = LIVE.ro ? '' : `<div class="mact"><button type="button" class="btn-sec" data-aa="e-repeat" data-no="${esc(no)}">${esc(t('ai.e.repeat'))}</button>${live ? `<button type="button" class="btn-sec" data-aa="e-task" data-no="${esc(no)}">${esc(t('ai.e.task'))}</button>${!live.flag ? `<button type="button" class="btn-quiet" data-aa="e-flag" data-no="${esc(no)}">${esc(t('ai.e.flag'))}</button>` : ''}` : ''}</div><p class="note" id="aipCardNote" role="status"></p>`;
    K.modal.open(`<dl class="kv">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>${acts}`, t('ai.e.card', { no }), { onOpen: b => hydrate(b) });
  }
  const resTxt = e => { const to = Array.isArray(e.deliverTo) ? e.deliverTo : [e.deliverTo || 'aichat']; return to.map(x => x === 'folder' ? t('ai.e.res.folder') : (x === 'task' ? t('ai.e.res.task') : (x === 'aichat' ? t('ai.e.res.chat') : toTxt([x], e.role)))).join(', '); };
  // ---------- Регламент ----------
  function routineForm(c, r){
    const rl = role(), all = seesAll(rl), s = (r && r.schedule) || { kind:'daily', time:'07:30', dow:1, dom:1 }, p = (r && r.params) || {}, to = (r && r.deliverTo) || ['aichat'];
    const owners = all ? R.ROLES.filter(x => x.id !== 'dev') : [rl], wd = I.weekdays(), chats = myChatsOf(rl, anchor());
    const sel = (id, name, opts, v) => `<select id="${c}${id}" name="${name}">${opts.map(([k, l]) => `<option value="${esc(k)}"${String(v) === String(k) ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    const chk = (v, l) => `<label class="aip-ck"><input type="checkbox" name="to" value="${esc(v)}"${to.includes(v) ? ' checked' : ''}> ${esc(l)}</label>`;
    const params = [['', '—'], ...['week','month','object','tasks','ar','onec','morning'].map(k => ['report:' + k, t('ai.rep.' + k)]), ...['staff','onec','contracts','tax'].map(k => ['check:' + k, t('ai.chk.' + k)])];
    const pv = p.report ? 'report:' + p.report : (p.check ? 'check:' + p.check : '');
    return `<form class="aip-form" data-af="routine"${r ? ` data-id="${esc(r.id)}"` : ''}>
      <label class="aip-fl aip-wide">${esc(t('ai.r.name'))}<input id="${c}RtTitle" name="title" maxlength="160" value="${esc(r ? rTitle(r) : '')}" placeholder="${esc(t('ai.p.summary'))}"></label>
      <label class="aip-fl">${esc(t('ai.r.action'))}${sel('RtAct', 'action', ['summary','report','check','reminder','custom'].map(k => [k, t('ai.r.a.' + k)]), r ? r.action : 'summary')}</label>
      <label class="aip-fl">${esc(t('ai.r.param'))}${sel('RtParam', 'param', params, pv)}</label>
      <label class="aip-fl aip-wide">${esc(t('ai.r.text'))}<input id="${c}RtText" name="text" maxlength="500" value="${esc(p.textTemplate || '')}"></label>
      <label class="aip-fl">${esc(t('ai.r.kind'))}${sel('RtKind', 'kind', ['daily','weekly','monthly'].map(k => [k, t('ai.r.k.' + k)]), s.kind)}</label>
      <label class="aip-fl">${esc(t('ai.r.time'))}<input id="${c}RtTime" name="time" type="time" value="${esc(s.time || '07:30')}" required></label>
      <label class="aip-fl">${esc(t('ai.r.dow'))}${sel('RtDow', 'dow', [1,2,3,4,5,6,7].map(n => [n, wd[n % 7]]), s.dow || 1)}</label>
      <label class="aip-fl">${esc(t('ai.r.dom'))}${sel('RtDom', 'dom', Array.from({ length:28 }, (_, i) => [i + 1, i + 1]), s.dom || 1)}</label>
      <label class="aip-fl aip-wide">${esc(t('ai.r.owner'))}${sel('RtOwner', 'owner', owners.map(x => [x.name, F.rn(x.name)]), r ? r.roleOwner : rl.name)}</label>
      <fieldset class="aip-fs aip-wide"><legend>${esc(t('ai.r.to'))}</legend>${chk('aichat', t('ai.r.to.aichat'))}${chats.map(ch => chk('chat:' + ch.id, t('ai.r.to.chat', { c: I.tx(ch.name) }))).join('')}${chk('folder:', t('ai.r.to.folder', { r: t('ai.r.owner').toLowerCase() }))}${chk('task', t('ai.r.to.task'))}${chk('kokpit', t('ai.r.to.kokpit'))}</fieldset>
      <button type="submit" class="btn-accent">${esc(t(r ? 'ai.r.save' : 'ai.r.create'))}</button><p class="aip-err" role="alert"></p></form>`;
  }
  function routinesHtml(c, wide){
    const rl = role(), L = routinesVisible();
    const btns = r => canEditRoutine(rl, r) ? `<span class="aip-rbtn"><button type="button" class="btn-sec" data-aa="r-run" data-id="${esc(r.id)}">${esc(t('ai.r.run'))}</button><button type="button" class="btn-quiet" data-aa="r-toggle" data-id="${esc(r.id)}">${esc(t(r.enabled ? 'ai.r.off' : 'ai.r.on'))}</button><button type="button" class="btn-quiet" data-aa="r-edit" data-id="${esc(r.id)}">${esc(t('ai.r.edit'))}</button></span>` : '';
    const pills = r => `${r.enabled ? `<span class="pill s s-good">${esc(t('ai.r.enabled'))}</span>` : `<span class="pill s s-mute">${esc(t('ai.r.disabled'))}</span>`}${r.preset ? ` <span class="pill s s-info">${esc(t('ai.r.preset'))}</span>` : ''}`;
    const last = r => r.lastRun ? `${esc(fmtTs(r.lastRun))}${r.lastNo ? ` · <button type="button" class="lnk" data-aa="errand" data-no="${esc(r.lastNo)}">${esc(r.lastNo)}</button>` : ''}` : '—';
    const list = !L.length ? `<div class="empty">${esc(t('ai.r.empty'))}</div>` : (wide ? U.table(t('ai.r.cols').split('|'), L.map(r => [`<b>${esc(r.no ? r.no + ' · ' : '')}${esc(rTitle(r))}</b><br>${pills(r)}`, esc(schedTxt(r.schedule)), esc(F.rn(r.roleOwner)), esc(toTxt(r.deliverTo, r.roleOwner)), r.enabled ? esc(fmtTs(r.nextRun)) : '—', last(r), btns(r)]), 'compact aip-rtbl', [3])
      : `<ul class="aip-list">${L.map(r => `<li class="aip-ritem"><div class="aip-rt"><b>${esc(r.no ? r.no + ' · ' : '')}${esc(rTitle(r))}</b> ${pills(r)}</div><small>${esc(schedTxt(r.schedule))} · ${esc(F.rn(r.roleOwner))} → ${esc(toTxt(r.deliverTo, r.roleOwner))}</small><small>${esc(t('ai.r.next'))}: ${r.enabled ? esc(fmtTs(r.nextRun)) : '—'} · ${esc(t('ai.r.last'))}: ${last(r)}</small>${btns(r)}</li>`).join('')}</ul>`);
    const form = canRoutine(rl) ? `<details class="aip-sec aip-new"${L.length ? '' : ' open'}><summary><h3>${esc(t('ai.r.new'))}</h3></summary>${routineForm(c, null)}</details>` : `<p class="note">${esc(t('ai.r.ro', { r: F.rn(rl.name), l: t('ai.lvl.' + (rl.rt.ai || '·')) }))}</p>`;
    return `<section class="aip-sec"><h3>${esc(t('ai.r.title'))}</h3><p class="banner-info">${esc(t(srv() ? 'ai.r.note_srv' : 'ai.r.note'))}</p>${list}<p class="lnote">${esc(t('ai.r.rights'))}</p></section>${form}`;
  }
  // ---------- Журнал ----------
  function journalRows(){
    const rl = role(), at = anchor(), all = seesAll(rl), from = jf.per === 'day' ? at : (jf.per === 'week' ? at - 6 : -1e9);
    const T = j => j.akey === 'denied' ? 'deny' : (/^routine/.test(j.akey || '') ? 'routine' : (j.akey === 'report' ? 'report' : (['task','project','file','chat'].includes(j.akey) ? 'created' : 'answer')));
    const live = LIVE.journal.filter(j => j.ai && (all || (j.actor && j.actor.role === rl.name) || j.role === rl.name) && (j.day ?? at) >= from && (j.day ?? at) <= at).map(j => ({ sort: (j.day ?? at) * 1440 + new Date(j.ts).getHours() * 60 + new Date(j.ts).getMinutes(), when: `${F.dts(j.day ?? at)} ${Live.tOf(j.ts)}`, who: `${t('ai.j.ai')} · ${F.rn((j.actor && j.actor.role) || j.role)}`, act: j.akey ? t('ai.j.' + j.akey) : j.action, obj: j.no || (j.target && j.target.no) || '—', note: j.note || '', type: T(j), live:true, ts: j.ts || 0 }));
    const world = at < W.LAUNCH_DEMO ? [] : D.errandsAt(at).filter(e => (all || e.who === rl.name) && e.day >= from).map(e => { const [h, m] = e.time.split(':').map(Number); const deny = e.st === 'отклонено по правам';
      return { sort: e.day * 1440 + h * 60 + m, when: `${F.dts(e.day)} ${e.time}`, who: `${t('ai.j.ai')} · ${F.rn(e.who)}`, act: t(deny ? 'ai.j.denied' : (e.st === 'ждёт подписи человека' ? 'ai.j.sign' : (e.st === 'в работе' ? 'ai.j.work' : (e.st === 'нужен человек' ? 'ai.j.human' : 'ai.j.answered')))), obj: e.no, note: I.tx(e.task), type: deny ? 'deny' : 'answer', live:false }; });
    const ok = r => jf.type === 'all' || r.type === jf.type;
    return live.filter(ok).sort((a, b) => b.ts - a.ts).concat(world.filter(ok).sort((a, b) => b.sort - a.sort));
  }
  function journalHtml(c, wide){
    const J = journalRows(), rl = role();
    const filt = `<div class="aip-filt"><label>${esc(t('ai.j.f.type'))} <select id="${c}JfType" data-jf="type">${['all','answer','deny','routine','created','report'].map(x => `<option value="${x}"${jf.type === x ? ' selected' : ''}>${esc(t('ai.j.t.' + x))}</option>`).join('')}</select></label><label>${esc(t('ai.j.f.per'))} <select id="${c}JfPer" data-jf="per">${['day','week','all'].map(x => `<option value="${x}"${jf.per === x ? ' selected' : ''}>${esc(t('ai.j.p.' + x))}</option>`).join('')}</select></label><button type="button" class="btn-sec" data-aa="j-csv">${esc(t('ai.j.csv'))}</button></div>`;
    const list = !J.length ? `<div class="empty">${esc(t('ai.j.empty'))}</div>` : (wide ? U.table(t('ai.j.cols').split('|'), J.slice(0, 150).map(r => [esc(r.when) + (r.live ? '' : ` <small class="dl">${esc(t('ai.j.world'))}</small>`), esc(r.who), esc(r.act), r.obj !== '—' && /^П-/.test(r.obj) ? `<button type="button" class="lnk" data-aa="errand" data-no="${esc(r.obj)}">${esc(r.obj)}</button>` : esc(r.obj), esc(String(r.note).slice(0, 140))]), 'compact aip-jtbl', [4])
      : `<ul class="aip-list aip-jl">${J.slice(0, 80).map(r => `<li><small>${esc(r.when)}${r.live ? '' : ' · ' + esc(t('ai.j.world'))}</small><span><b>${esc(r.act)}</b> ${/^П-/.test(r.obj) ? `<button type="button" class="lnk" data-aa="errand" data-no="${esc(r.obj)}">${esc(r.obj)}</button>` : esc(r.obj)}</span><small>${esc(String(r.note).slice(0, 120))}</small></li>`).join('')}</ul>`);
    return `<section class="aip-sec"><h3>${esc(t('ai.j.title'))}</h3>${filt}${list}${seesAll(rl) ? '' : `<p class="lnote">${esc(t('ai.j.own'))}</p>`}</section>`;
  }
  // ---------- Отчёты ----------
  function reportsHtml(c, wide){
    const rl = role(), chats = myChatsOf(rl, anchor()), cur = repView && repView.kind ? buildReport(repView.kind, repView.param) : null;
    const kinds = `<div class="aip-kinds">${REP_KINDS.map(k => `<button type="button" class="${cur && cur.kind === k ? 'btn-primary' : 'btn-sec'}" data-aa="rep" data-kind="${k}">${esc(t('ai.rep.' + k))}</button>`).join('')}</div>`;
    let view = `<p class="note">${esc(t('ai.rep.pick'))}</p>`;
    if (cur){
      const pick = cur.kind === 'object' ? `<label class="aip-fl">${esc(t('ai.rep.obj'))}<select id="${c}RepObj" data-rp="param">${objList().map(o => `<option value="${esc(o.name)}"${(cur.param || defaultObj()) === o.name ? ' selected' : ''}>${esc(wn(o.name))}</option>`).join('')}</select></label>`
        : (cur.kind === 'project' ? `<label class="aip-fl">${esc(t('ai.rep.prj'))}<select id="${c}RepPrj" data-rp="param">${projList().map(p => `<option value="${esc(p.key)}"${cur.param === p.key ? ' selected' : ''}>${esc(I.tx(p.name))}</option>`).join('')}</select></label>` : '');
      const tbl = cur.rows.length ? (wide ? U.table(cur.head, cur.rows.map(r => r.map(x => esc(x))), 'compact') : `<div class="tw"><table class="tbl compact aip-rtab"><thead><tr>${cur.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${cur.rows.map(r => `<tr>${r.map(x => `<td>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`) : '';
      const acts = cur.deny || LIVE.ro ? '' : `<div class="mact"><button type="button" class="btn-accent" data-aa="rep-save">${esc(t('ai.rep.save'))}</button>${chats.length ? `<details class="aip-dd"><summary class="btn-sec">${esc(t('ai.rep.chat'))}</summary><div>${chats.map(ch => `<button type="button" data-aa="rep-chat" data-ch="${esc(ch.id)}">${esc(I.tx(ch.name))}</button>`).join('')}</div></details>` : ''}<button type="button" class="btn-sec" data-aa="rep-csv">${esc(t('ai.rep.csv'))}</button></div>`;
      view = `<article class="aip-rep"><h4>${esc(cur.title)} <small>· ${esc(F.dt(cur.at))}</small></h4>${pick}<p class="aip-pre${cur.deny ? ' banner-warn' : ''}">${esc(cur.text)}</p>${tbl}${acts}</article>`;
    }
    const saved = LIVE.reports.filter(r => seesAll(rl) || r.role === rl.name).slice().reverse().slice(0, 30);
    const sl = !saved.length ? `<div class="empty">${esc(t('ai.rep.none'))}</div>` : `<ul class="aip-list">${saved.map(r => `<li><button type="button" class="aip-row" data-aa="rep-open" data-id="${esc(r.id)}"><span class="aip-rt"><b>${esc(r.no || '—')}</b> ${esc(['morning','week','month','tasks','ar','onec'].includes(r.kind) ? t('ai.rep.' + r.kind) : r.title)}${r.kokpit ? ` <span class="pill s s-info">${esc(t('ai.rep.kokpit'))}</span>` : ''}</span><small>${esc(F.dt(r.at ?? r.day))} · ${esc(Live.whoOf(r))}</small></button></li>`).join('')}</ul>`;
    return `<section class="aip-sec"><h3>${esc(t('ai.rep.title'))}</h3>${kinds}${view}</section><section class="aip-sec"><h3>${esc(t('ai.rep.saved'))}</h3>${sl}</section>`;
  }
  // ---------- Проекты ----------
  function projectsHtml(c, wide){
    const rl = role(), L = projList(), ro = ['Ч','·'].includes(rl.rt.tasks || '·') || LIVE.ro;
    const item = p => { const s = projSummary(p); return `<li class="aip-ritem"><div class="aip-rt"><b>${esc(p.no ? p.no + ' · ' : '')}${esc(I.tx(p.name))}</b>${p.live ? ` <span class="pill i">${esc(t('ai.pr.live'))}</span>` : ''}${p.late ? ` <span class="pill s s-warn">${esc(t('ai.pr.late').replace(/^ · /, ''))}</span>` : ''}</div><div class="aip-prog" aria-hidden="true"><i style="width:${Math.round(projProg(p) * 100)}%"></i></div><small>${esc(s.rows.map(r => r[0] + ': ' + r[1]).join(' · '))}</small><span class="aip-rbtn"><button type="button" class="btn-sec" data-aa="p-sum" data-key="${esc(p.key)}">${esc(t('ai.pr.sum'))}</button><button type="button" class="btn-quiet" data-aa="p-week" data-key="${esc(p.key)}">${esc(t('ai.pr.week'))}</button><button type="button" class="btn-quiet" data-aa="p-open">${esc(t('ai.pr.open'))}</button></span></li>`; };
    const list = L.length ? `<ul class="aip-list${wide ? ' aip-grid' : ''}">${L.map(item).join('')}</ul>` : `<div class="empty">${esc(t('ai.pr.none'))}</div>`;
    const prop = proposal ? `<div class="aip-prop"><b>${esc(t('ai.pr.stages'))}</b><ol>${proposal.stages.map(s => `<li>${esc(s)}</li>`).join('')}</ol><button type="button" class="btn-accent" data-aa="p-create">${esc(t('ai.pr.create'))}</button></div>` : '';
    const form = ro ? `<p class="note">${esc(t('ai.pr.ro', { r: F.rn(rl.name) }))}</p>` : `<section class="aip-sec"><h3>${esc(t('ai.pr.new'))}</h3><form class="aip-form" data-af="project"><label class="aip-fl aip-wide">${esc(t('ai.pr.goal'))}<input id="${c}PrGoal" name="goal" maxlength="160" value="${esc(proposal ? proposal.goal : '')}"></label><button type="submit" class="btn-sec">${esc(t('ai.pr.propose'))}</button><p class="aip-err" role="alert"></p></form>${prop}</section>`;
    return `<section class="aip-sec"><h3>${esc(t('ai.pr.title'))}</h3>${list}</section>${form}`;
  }
  const projProg = p => p.live ? ((p.stages || []).length ? (p.stages || []).filter(x => x && x.done).length / p.stages.length : 0) : (p.prog || 0);
  const TPL = [[/закрыт.*год|year.?end|инвентар/i, 'year'], [/тендер|госзакуп|tender/i, 'tender'], [/закуп|форм|снабж|purchas|uniform/i, 'buy'], [/аттест|обучен|удостовер|certif|train/i, 'cert'], [/бюджет|budget/i, 'budget'], [/проверк|органов|лиценз|inspect|licen/i, 'check'], [/автомоб|автопарк|машин|гбр|fleet|car|vehicle/i, 'fleet'], [/подключ|интеграц|битрикс|1с|connect|integrat/i, 'conn']];
  const tplOf = goal => { const m = TPL.find(([re]) => re.test(goal)); return m ? m[1] : 'any'; };
  const proposeStages = goal => t('ai.tpl.' + tplOf(goal)).split('|');
  // М13: исполнители этапов и участники — по шаблону (переаттестация — кадровик, закупка — снабженец…), бюджет — из данных мира, где он есть
  const TPL_PEOPLE = { year: ['Главный бухгалтер', 'Бухгалтер'], tender: ['Коммерческий директор', 'Юрист', 'Начальник охраны'], buy: ['Снабженец', 'Главный бухгалтер'], cert: ['Кадровик', 'Начальник охраны'],
    budget: ['Исполнительный директор', 'Главный бухгалтер'], check: ['Юрист', 'Начальник охраны'], fleet: ['Механик', 'Главный бухгалтер'], conn: ['Администратор системы', 'Главный бухгалтер'], any: [] };
  function tplBudget(kind){
    if (kind === 'buy') return CAT.stock.reduce((s, x) => s + Math.max(0, x.min - x.stock) * x.price, 0);
    if (kind === 'fleet'){ const d = (K.S.drv || {}); return (d.cars != null ? d.cars : 2) * (d.carPrice != null ? d.carPrice : 9.2) * 1e6; }
    return 0;
  }

  // ======================= действия (делегирование: панель, раздел, карточка) =======================
  let pageMsg = '';
  function say(msg, el, kind){ hint(msg, kind); if (!el || !aip || !aip.contains(el)){ pageMsg = msg; const b = document.getElementById('aipPageMsg'); if (b){ b.textContent = msg; b.hidden = !msg; } } }
  const inScope = el => el && ((aip && aip.contains(el)) || el.closest('#content') || el.closest('#modalBody'));
  function rerender(el){ if (aip && aip.contains(el)) renderBody(false); else if (el && el.closest('#content')){ const c = document.getElementById('content'); preserve(c, () => K.render()); } }
  const msgOf = k => { const r = chatRow(k); if (!r) return null; const e = r.no ? LIVE.errands.find(x => x.no === r.no) : null; return { r, q: (e && e.q) || '', text: streaming.get(r.k) || r.text || '' }; };
  const routineById = id => routinesAll().find(r => r.id === id) || null;
  const projByKey = k => projList().find(p => p.key === k) || null;
  function onClick(e){
    const b = e.target.closest && e.target.closest('[data-aa]'); if (!b || !inScope(b)) return;
    const a = b.dataset.aa, d = b.dataset;
    if (a === 'f-open'){ e.preventDefault(); const m = metaCache.get(d.fref) || fileMeta(d.fref); if (m) FS.url(m).then(u => { if (u) window.open(u, '_blank', 'noopener'); }); return; }
    const H = ACT[a]; if (H){ if (b.tagName === 'A') e.preventDefault(); try { H(b, d, e); } catch(err){ console.error('ai ' + a, err); } }
  }
  const ACT = {
    tab: (b, d) => setTab(d.tab), mode: (b, d) => setMode(d.m), min: () => minimize(), close: () => close(), restore: () => restore(),
    open: () => open({ tab:'chat' }), chip: (b, d) => ask(d.q, { src:'aichat' }), clip: () => aip.querySelector('#aipFile').click(), mic: () => dictate(), voice: () => recStart(),
    'rec-stop': () => recStop(false), 'rec-cancel': () => recStop(true),
    'att-rm': (b, d) => { staged = staged.filter(x => x.k !== d.k); paintStaged(); },
    more: () => { showN += 30; renderBody(false); },
    errand: (b, d) => errandCard(d.no),
    'm-task': (b, d) => { const m = msgOf(d.k); if (!m) return; const title = (m.q || m.text).slice(0, 160); Promise.resolve(U.quickTask({ title, owner: K.S.role, src:'ИИ', days:1, status:'в работе', pr:'средний', desc: m.text.slice(0, 4000), link: { kind:'errand', no: m.r.no } })).then(row => aiJournal('tasks', 'task', row && row.id ? row : { id:null, title }, { no: m.r.no })); b.disabled = true; say(t('ai.act.done_task', { t: title }), b); },
    'm-chat': (b, d) => { const m = msgOf(d.k); if (!m) return; toChat(d.ch, m.text); const dd = b.closest('details'); if (dd) dd.open = false; say(t('ai.act.done_chat', { c: chatName(d.ch) }), b); },
    'm-report': (b, d) => { const m = msgOf(d.k); if (!m) return; b.disabled = true; saveReport({ kind:'answer', title: (m.q || t('ai.title')).slice(0, 160), text: m.text, head: [], rows: [], at: anchor(), period: { from: K.RNG.from, to: K.RNG.to }, param: m.r.no || null }).then(row => say(t('ai.act.done_report', { no: row && row.no || '' }), b)); },
    'f-task': (b, d) => { const f = fileMeta(d.fid); if (!f) return; const title = t('ai.att.task_title', { n: f.name }); Promise.resolve(U.quickTask({ title: title.slice(0, 160), owner: K.S.role, src:'ИИ', days:3, status:'в работе', pr:'средний', files: [slim(f)], link: { kind:'file', id: f.id } })).then(row => aiJournal('tasks', 'task', row && row.id ? row : { id:null, title })); b.disabled = true; say(t('ai.act.done_task', { t: title }), b); },
    'f-chat': (b, d) => { const f = fileMeta(d.fid); if (!f) return; Live.add('chat', { ch: d.ch, text: f.name, files: [slim(f)] }); const dd = b.closest('details'); if (dd) dd.open = false; say(t('ai.att.sent', { n: f.name, c: chatName(d.ch) }), b); },
    'f-folder': (b, d) => { const f = fileMeta(d.fid); if (!f || !f.id) return; Live.update('files', f.id, { folder: K.S.role }, { journal:false }); aiJournal('files', 'file', f); b.disabled = true; say(t('ai.att.foldered', { n: f.name, r: F.rn(K.S.role) }), b); },
    'e-repeat': (b, d) => { const e = LIVE.errands.find(x => x.no === d.no), w = !e && D.errandsAt(anchor()).find(x => x.no === d.no); K.modal.close(true); ask(e ? e.q : I.tx(w ? w.task : ''), { src:'errands' }); },
    'e-task': (b, d) => { const e = LIVE.errands.find(x => x.no === d.no); if (!e) return; b.disabled = true; toTask(e, e.q, e.a, K.S.role).then(row => { const n = document.getElementById('aipCardNote'); if (n) n.textContent = t('ai.act.done_task', { t: row ? row.title : e.q }); }); },
    'e-flag': (b, d) => { const e = LIVE.errands.find(x => x.no === d.no); if (!e) return; b.disabled = true; Live.update('errands', e.id, { flag:true }, { journal:false }); aiJournal('errands', 'flag', e, { no: e.no }); const n = document.getElementById('aipCardNote'); if (n) n.textContent = t('ai.e.flagged', { no: e.no }); },
    'r-run': (b, d) => { const r = routineById(d.id); if (!r) return; b.disabled = true; runRoutine(r, 'manual').then(er => { if (er) say(t('ai.r.ran', { t: rTitle(r), no: er.no, to: toTxt(r.deliverTo, r.roleOwner) }), b); rerender(b); }); },
    'r-toggle': (b, d) => { const r = routineById(d.id); if (!r) return; const en = !r.enabled; (r.virtual ? materialize(r, { enabled: en }) : Live.update('routines', r.id, { enabled: en, nextRun: en ? nextRunOf(r.schedule, Date.now()) : r.nextRun }, { journal:false, what: en ? 'включён' : 'выключен' })).then(() => { aiJournal('routines', en ? 'routine_on' : 'routine_off', { ...r, title: rTitle(r) }); rerender(b); }); },
    'r-edit': (b, d) => { const r = routineById(d.id); if (!r) return; const h = (r.hist || []).slice(-8).reverse();
      K.modal.open(routineForm('m', r) + (h.length ? `<h3>${esc(t('ai.r.hist'))}</h3><ul class="ul tight">${h.map(x => `<li>${esc(fmtTs(x.ts))} · ${esc(F.rn(x.role))} · ${esc(x.what || '')}${x.fields ? ' · ' + esc(x.fields.join(', ')) : ''}</li>`).join('')}</ul>` : ''), rTitle(r), { wide:true, focus:'#mRtTitle' }); },
    'j-csv': () => { const J = journalRows(); download(`sunkar-ai-journal-${W.iso(anchor())}.csv`, csvOf(t('ai.j.cols').split('|'), J.map(r => [r.when, r.who, r.act, r.obj, r.note]))); },
    rep: (b, d) => { repView = { kind: d.kind, param: null }; rerender(b); },
    'rep-save': b => { const rep = repView && buildReport(repView.kind, repView.param); if (!rep) return; b.disabled = true; saveReport(rep).then(row => { say(t('ai.act.done_report', { no: row && row.no || '' }), b); rerender(b); }); },
    'rep-chat': (b, d) => { const rep = repView && buildReport(repView.kind, repView.param); if (!rep) return; toChat(d.ch, `${rep.title} · ${F.dt(rep.at)}\n${rep.text}`); const dd = b.closest('details'); if (dd) dd.open = false; say(t('ai.act.done_chat', { c: chatName(d.ch) }), b); },
    'rep-csv': () => { const rep = repView && buildReport(repView.kind, repView.param); if (!rep) return; download(`sunkar-${rep.kind}-${W.iso(rep.at)}.csv`, rep.rows.length ? csvOf(rep.head, rep.rows) : csvOf([rep.title], [[rep.text]])); },
    'rep-open': (b, d) => { const r = LIVE.reports.find(x => x.id === d.id); if (!r) return; const tb = r.table && r.table.rows && r.table.rows.length ? U.table(r.table.head.map(esc), r.table.rows.map(x => x.map(esc)), 'compact') : '';
      K.modal.open(`<p class="note">${esc(r.no || '')} · ${esc(F.dt(r.at ?? r.day))} · ${esc(Live.whoOf(r))}</p><p class="aip-pre">${esc(r.text)}</p>${tb}`, r.title, { wide:true }); },
    'p-sum': (b, d) => { const p = projByKey(d.key); if (!p) return; const s = projSummary(p); ask(t('ai.pr.sum_q', { n: I.tx(p.name) }), { src:'project', preset: { label:'helper', text: s.text } }); },
    'p-week': (b, d) => { const p = projByKey(d.key); if (!p) return; ask(t('ai.pr.week_q', { n: I.tx(p.name) }), { src:'project', preset: { label:'helper', text: projWeek(p) } }); },
    'p-open': () => { if (isOpen && pref.mode === 'full') { if (phone()) minimize(); else setMode('full'); } location.hash = '#tasks-projects'; },
    'p-create': b => createProject(b),
  };
  async function createProject(b){
    if (!proposal) return; const at = anchor(), pr = proposal; proposal = null; b.disabled = true;
    document.querySelectorAll('#pPrGoal, #gPrGoal').forEach(x => { x.value = ''; });
    const kind = tplOf(pr.goal), ppl = TPL_PEOPLE[kind] || [], lead = K.S.role, members = [...new Set([K.S.role, ...ppl])], plan = hasMoney(role()) ? Math.round(tplBudget(kind)) : 0;
    const p = await Live.add('projects', { name: pr.goal, goal: pr.goal, lead, members, from: at, to: at + 7 * pr.stages.length + 7, stages: pr.stages.map(s => ({ name: s, done:false })), status:'в работе', src:'ИИ', budget: plan ? { plan } : {}, risks: [], milestones: [] }, { journal:false });
    if (!p){ say(t('ai.ro'), b, 'warn'); return; }
    aiJournal('projects', 'project', p, { no: p.no });
    let k = 0; for (const [i, s] of pr.stages.entries()){ const owner = ppl.length ? ppl[i % ppl.length] : K.S.role; const tk = await Live.add('tasks', { title: `${pr.goal}: ${s}`.slice(0, 160), owner, src:'ИИ', days: 7 * (i + 1), status:'в работе', pr:'средний', project: p.id, projectNo: p.no, desc: '' }, { journal:false }); if (tk){ k++; aiJournal('tasks', 'task', tk, { no: tk.no }); } }
    say(t('ai.pr.created', { no: p.no || '', n: pr.goal, k }), b); rerender(b);
  }
  function onChange(e){
    const el = e.target; if (!inScope(el)) return;
    if (el.dataset.ef && el.tagName === 'SELECT'){ ef[el.dataset.ef] = el.value; rerender(el); }
    else if (el.dataset.jf){ jf[el.dataset.jf] = el.value; rerender(el); }
    else if (el.dataset.rp && repView){ repView.param = el.value; rerender(el); }
  }
  let efT = 0;
  function onInput(e){ const el = e.target; if (!inScope(el) || el.dataset.ef !== 'q') return; clearTimeout(efT); efT = setTimeout(() => { ef.q = el.value; rerender(el); }, 250); }
  function onSubmit(e){
    const f = e.target; if (!f || !f.dataset || !f.dataset.af || !inScope(f)) return;
    e.preventDefault(); const kind = f.dataset.af;
    if (kind === 'errand'){ const q = f.elements.q.value.trim(); if (!q){ say(t('ai.e.err_q'), f, 'warn'); return; } f.elements.q.value = ''; ask(q, { src:'errands', due: +f.elements.due.value || 15, deliverTo: f.elements.to.value }); }
    else if (kind === 'project'){ const g = f.elements.goal.value.trim(), er = f.querySelector('.aip-err'); if (!g){ er.textContent = t('ai.pr.err_goal'); return; } proposal = { goal: g, stages: proposeStages(g) }; rerender(f); }
    else if (kind === 'routine') submitRoutine(f);
  }
  async function submitRoutine(f){
    const E = f.elements, er = f.querySelector('.aip-err'), rl = role(), at = anchor();
    const title = E.title.value.trim(), action = E.action.value, pv = E.param.value, text = E.text.value.trim(), owner = E.owner.value;
    const ownerRole = roleByName(owner) || rl, to = [...f.querySelectorAll('input[name="to"]:checked')].map(x => x.value === 'folder:' ? 'folder:' + owner : x.value);
    if (!title) return void (er.textContent = t('ai.r.err_title'));
    if (!to.length) return void (er.textContent = t('ai.r.err_to'));
    if (['custom','reminder'].includes(action) && !text) return void (er.textContent = t('ai.r.err_text'));
    const bad = to.find(x => x.startsWith('chat:') && !myChatsOf(ownerRole, at).some(c => c.id === x.slice(5)));
    if (bad) return void (er.textContent = t('ai.r.err_chat', { r: F.rn(owner), c: chatName(bad.slice(5)) }));
    if (!seesAll(rl) && owner !== rl.name) return;
    const params = { textTemplate: text || null }; if (pv.startsWith('report:')) params.report = pv.slice(7); if (pv.startsWith('check:')) params.check = pv.slice(6);
    if (action === 'report' && !params.report) params.report = 'week'; if (action === 'check' && !params.check) params.check = 'staff';
    const schedule = { kind: E.kind.value, time: E.time.value || '07:30', dow: +E.dow.value || 1, dom: +E.dom.value || 1 };
    const patch = { title, action, params, schedule, roleOwner: owner, deliverTo: to, nextRun: nextRunOf(schedule, Date.now()) };
    const id = f.dataset.id, cur = id ? routineById(id) : null;
    if (cur){ if (cur.tkey && title !== t(cur.tkey)) patch.tkey = null; else if (cur.tkey) delete patch.title;
      if (cur.virtual) await materialize(cur, patch); else await Live.update('routines', cur.id, patch, { journal:false, what:'изменено' });
      aiJournal('routines', 'routine_edit', { ...cur, title }); K.modal.close(true); say(t('ai.r.saved')); renderBody(false); return; }
    const row = await Live.add('routines', { ...patch, enabled:true, createdBy: rl.name, runs:0 }, { journal:false });
    if (!row){ er.textContent = t('ai.ro'); return; }
    aiJournal('routines', 'routine_new', row, { no: row.no });
    f.reset(); say(t('ai.r.created', { no: row.no || '', n: fmtTs(row.nextRun) }), f); rerender(f);
  }
  function onKey(e){
    if (!aip || aip.hidden || !isOpen) return;
    const md = document.getElementById('modal'); if (md && !md.hidden) return;
    if (e.key === 'Escape'){
      if (rec){ e.preventDefault(); recStop(true); return; }
      const ae = document.activeElement;
      if (ae && !aip.contains(ae) && /^(INPUT|TEXTAREA|SELECT)$/.test(ae.tagName)) return;
      const dd = ae && ae.closest && ae.closest('details[open]'); if (dd && aip.contains(dd)){ dd.open = false; e.preventDefault(); return; }
      e.preventDefault(); if (pref.min) close(); else minimize(); return;
    }
    if (e.key === 'Tab' && curMode() === 'full' && !pref.min){
      const fs = [...aip.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]):not([type=hidden]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])')].filter(x => x.offsetParent !== null);
      if (!fs.length) return; const a0 = fs[0], z = fs[fs.length - 1], ae = document.activeElement;
      if (!aip.contains(ae)){ e.preventDefault(); a0.focus(); } else if (e.shiftKey && ae === a0){ e.preventDefault(); z.focus(); } else if (!e.shiftKey && ae === z){ e.preventDefault(); a0.focus(); }
      return;
    }
    if ((e.key === 'ArrowRight' || e.key === 'ArrowLeft') && e.target && e.target.getAttribute && e.target.getAttribute('role') === 'tab' && aip.contains(e.target)){
      const tabs = [...aip.querySelectorAll('[role=tab]:not([disabled])')], i = tabs.indexOf(e.target), n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      if (n){ e.preventDefault(); setTab(n.dataset.tab); n.focus(); }
    }
  }

  // ======================= раздел «Ассистенты и наставники» (#ai, #ai-*) =======================
  const PAGE_TABS = [['', 'overview'], ['errands', 'errands'], ['routines', 'routines'], ['journal', 'journal'], ['reports', 'reports'], ['projects', 'projects']];
  function page(tab){
    const at = anchor(), cur = PAGE_TABS.some(x => x[0] === (tab || '')) ? (tab || '') : '';
    const nav = `<div class="tabs">${PAGE_TABS.map(([k, n]) => `<a href="#ai${k ? '-' + k : ''}" class="${k === cur ? 'on' : ''}">${esc(t('ai.tab.' + n))}</a>`).join('')}</div>`;
    const head = U.h1(t('ai.page.title'), t('ai.page.sub')) + nav + `<p class="banner-info" id="aipPageMsg" role="status"${pageMsg ? '' : ' hidden'}>${esc(pageMsg)}</p>`;
    const roles = `<div class="roles">${CAT.aiRoles.map(x => `<section class="card role"><h2>${esc(F.rn(x.role))}</h2><div class="two"><div><h3>${esc(t('ai.role.asst', { n: I.tx(x.assistant) }))}</h3><ul class="ul tight">${x.tasks.map(q => `<li><button type="button" class="lnk" data-ai="${esc(q)}">${esc(I.tx(q))}</button></li>`).join('')}</ul></div><div><h3>${esc(t('ai.role.mentor', { n: I.tx(x.mentor) }))}</h3><ul class="ul tight">${x.mentor_topics.map(q => `<li>${esc(I.tx(q))}</li>`).join('')}</ul><h3>${esc(t('ai.role.rep'))}</h3><p class="small"><b>${esc(t('ai.role.daily'))}</b> ${esc(I.tx(x.daily))}<br><b>${esc(t('ai.role.weekly'))}</b> ${esc(I.tx(x.weekly))}<br><b>${esc(t('ai.role.monthly'))}</b> ${esc(I.tx(x.monthly))}</p></div></div></section>`).join('')}</div>`;
    const g = gate(); if (g) return head + g + roles;
    if (cur) return head + `<div class="aip-page">${tabHtml(cur, true)}</div>`;
    return head + U.card(t('ai.page.sum', { d: F.dt(at) }), `<p class="lead">${esc(summary(at))}</p><div class="mact"><button type="button" class="btn-accent" data-aa="open">${esc(t('ai.page.open'))}</button></div>`, t('ai.page.sum_note'))
      + errandTiles() + `<div class="aip-page">${errandsHtml('g', true)}${routinesHtml('g', true)}</div>` + roles;
  }
  function wirePage(main){
    main.querySelectorAll('.aip-etbl tbody tr').forEach(tr => {
      const no = tr.querySelector('td b'); if (!no) return;
      const go = e => { if (e.target.closest('a,button,input,select')) return; e.stopPropagation(); e.preventDefault(); errandCard(no.textContent.trim()); };
      tr.addEventListener('click', go, true); tr.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target === tr) go(e); }, true);
    });
  }
  function afterRender(main, h){
    if (h === 'ai') wirePage(main); else pageMsg = '';
    const c = document.getElementById('content'); if (c) lastMainW = c.getBoundingClientRect().width;
    if (isOpen && aip && sigNow() !== sig){ lastAiCount = -1; paintTabs(); renderBody(); }
  }
  function onLive(kind){
    if (!aip) return;
    if (kind === 'aichat'){ const n = myChat().filter(r => r.who === 'ai').length; if (lastAiCount >= 0 && n > lastAiCount && isOpen && pref.min){ unread += n - lastAiCount; layout(); } lastAiCount = n; }
    if (isOpen && !pref.min && ['aichat','errands','routines','journal','reports','projects','files','tasks','mode','names','err'].includes(kind)) renderSoon();
  }
  function onLang(){ if (!aip) return; build(); if (isOpen){ paintTabs(); renderBody(); } else aip.hidden = true; }

  // ======================= стили (префикс .aip-, только токены :root) =======================
  const CSS = `
#aip.aip{position:fixed;z-index:25;right:0;left:auto;top:auto;bottom:0;width:var(--aip-w,440px);max-width:100vw;height:calc(var(--aip-hs,1) * 100vh);display:flex;flex-direction:column;background:var(--surface);color:var(--fg);border-left:1px solid var(--line);box-shadow:var(--sh-3);padding:0}
#aip.aip-bottom{left:236px;right:0;width:auto;height:var(--aip-hb,360px);border-left:0;border-top:1px solid var(--line)}
#aip.aip-full{inset:0;width:auto;height:auto;max-width:none;border:0}
#aip.aip-phone{left:0;right:0;top:auto;width:auto;max-width:none;border:0;border-top:1px solid var(--line);border-radius:var(--r-lg) var(--r-lg) 0 0}
#aip.aip-min{inset:auto var(--s4) var(--s4) auto;width:auto;height:auto;max-width:calc(100vw - 2 * var(--s4));border:1px solid var(--line);border-radius:var(--r-pill);box-shadow:var(--sh-2)}
#aip.aip-min>:not(.aip-minbar){display:none!important}
#aip:not(.aip-min) .aip-minbar{display:none}
.aip-minbar{display:flex;align-items:center;gap:var(--s2);height:56px;padding:0 var(--s5);border:0;background:transparent;font:inherit;font-weight:800;cursor:pointer;color:var(--fg);border-radius:var(--r-pill)}
.aip-minbar svg{width:18px;height:18px;color:var(--accent-text)}
.aip-unread{min-width:22px;height:22px;border-radius:var(--r-pill);background:var(--info-fill);color:var(--fg-inv);font-size:var(--fs-1);display:inline-grid;place-items:center;padding:0 6px}
.aip-head{display:flex;align-items:center;gap:var(--s2);padding:var(--s2) var(--s2) var(--s2) var(--s4);padding-top:max(var(--s2),env(safe-area-inset-top,0px));border-bottom:1px solid var(--line);flex:0 0 auto}
.aip-ttl{flex:1;min-width:0;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.aip-ttl small{font-weight:600;color:var(--fg-3);font-size:var(--fs-2)}
.aip-ctl{display:flex;gap:2px;flex:0 0 auto}
#aip .aip-ib{display:inline-grid;place-items:center;width:32px;height:32px;min-width:0;border:0;border-radius:var(--r-sm);background:transparent;color:var(--fg-2);cursor:pointer;padding:0;margin:0;font-weight:400}
#aip .aip-ib:hover{background:var(--surface-3);color:var(--fg)}#aip .aip-ib[aria-pressed="true"]{background:var(--accent-soft);color:var(--accent-text)}#aip .aip-ib.on{background:var(--bad-soft);color:var(--bad-text)}
.aip-ib svg,.aip-ico{width:16px;height:16px;flex:0 0 auto}
#aip.aip-phone .aip-dk{display:none}
.aip-tabs{display:flex;gap:2px;padding:0 var(--s2);border-bottom:1px solid var(--line);overflow-x:auto;scrollbar-width:none;flex:0 0 auto}
.aip-tabs button{flex:1 1 auto;border:0;background:transparent;padding:var(--s2) var(--s1);font:inherit;font-size:var(--fs-3);font-weight:700;color:var(--fg-2);border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap}
.aip-tabs.ovf{-webkit-mask-image:linear-gradient(90deg,var(--fg) 85%,transparent);mask-image:linear-gradient(90deg,var(--fg) 85%,transparent)}
#aip:not(.aip-min){container-type:inline-size}
@container (max-width:420px){.aip-tabs{gap:0;padding:0 var(--s1)}.aip-tabs button{font-size:var(--fs-2);padding-inline:var(--s1)}}
#askInp::placeholder{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.aip-tabs button.on{color:var(--fg);border-bottom-color:var(--accent)}.aip-tabs button:disabled{opacity:.45;cursor:not-allowed}
.aip-body{flex:1 1 auto;min-height:0;overflow:auto;padding:var(--s3) var(--s4);display:flex;flex-direction:column;gap:var(--s3);overscroll-behavior:contain}
#aip .msgs{flex:1 0 auto;overflow:visible;padding:0}
#aip .m{white-space:normal;max-width:94%}
#aip .aip-txt,.aip-pre{white-space:pre-wrap;overflow-wrap:anywhere}
#aip .m.a.aip-deny{box-shadow:inset 3px 0 0 var(--bad-fill)}
.aip-meta{display:block;margin-top:var(--s1);font-size:var(--fs-1);opacity:.7}
.aip-tr{display:block;font-size:var(--fs-1);opacity:.85;font-style:italic}
.aip-did{margin-top:var(--s2);font-size:var(--fs-2);color:var(--fg-2)}.aip-did .lnk{font-size:var(--fs-2)}
.aip-acts{display:flex;flex-wrap:wrap;gap:var(--s1);margin-top:var(--s2)}
#aip .aip-acts .btn-quiet,#aip .aip-acts summary{min-height:28px;padding:0 var(--s2);font-size:var(--fs-2)}
.aip-dd{position:relative;display:inline-block}.aip-dd summary{list-style:none;cursor:pointer;display:inline-flex;align-items:center}.aip-dd summary::-webkit-details-marker{display:none}
.aip-dd>div{position:absolute;z-index:6;left:0;bottom:100%;min-width:200px;max-width:min(280px,80vw);background:var(--surface);border:1px solid var(--line);border-radius:var(--r);box-shadow:var(--sh-2);padding:var(--s1);display:flex;flex-direction:column}
.aip-dd>div button{border:0;background:transparent;color:var(--fg);text-align:left;padding:var(--s2);border-radius:var(--r-sm);cursor:pointer;font:inherit;font-size:var(--fs-3)}.aip-dd>div button:hover{background:var(--surface-3)}
.aip-comp{border-top:1px solid var(--line);flex:0 0 auto;padding-bottom:env(safe-area-inset-bottom,0px)}
#aip .aip-chips{padding:var(--s2) var(--s4) 0;max-height:72px;overflow:auto;margin:0}
#aip .aip-ask{align-items:flex-end;border-top:0;padding:var(--s2) var(--s3)}
#askInp{flex:1;min-width:0;resize:none;border:1px solid var(--line-2);border-radius:var(--r-sm);padding:var(--s2) var(--s3);font:inherit;font-size:var(--fs-4);background:var(--bg);color:var(--fg);max-height:160px;line-height:1.4;min-height:36px}
#aip .aip-ask .aip-ib{width:36px;height:36px}
#aip .aip-ask .aip-send{min-height:36px;min-width:40px}
.aip-hint{margin:0;padding:0 var(--s4) var(--s2);font-size:var(--fs-1);color:var(--fg-3)}.aip-hint:empty{display:none}.aip-hint[data-kind="warn"]{color:var(--warn-text)}
.aip-att{display:flex;flex-wrap:wrap;gap:var(--s1);padding:var(--s2) var(--s4) 0}
.aip-chip{display:inline-flex;align-items:center;gap:var(--s1);max-width:100%;background:var(--surface-3);border-radius:var(--r-pill);padding:2px var(--s1) 2px var(--s2);font-size:var(--fs-2)}
.aip-chip span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px}.aip-chip small{color:var(--fg-3)}.aip-chip button{border:0;background:transparent;color:var(--fg);cursor:pointer;width:24px;height:24px}
.aip-rec{display:flex;align-items:center;gap:var(--s2);padding:var(--s2) var(--s4) 0;font-size:var(--fs-3);font-variant-numeric:tabular-nums}
.aip-rec .btn-sec,.aip-rec .btn-quiet{min-height:30px;padding:0 var(--s2)}
.aip-dot{width:10px;height:10px;border-radius:50%;background:var(--bad-fill);animation:aipPulse 1s infinite alternate}
@keyframes aipPulse{to{opacity:.3}}
.aip-wave{display:inline-flex;align-items:center;gap:2px;height:24px;flex:1;min-width:0;overflow:hidden}.aip-wave i{display:block;width:3px;height:24px;background:var(--accent);border-radius:2px;transform:scaleY(.12)}
.aip-files{display:flex;flex-direction:column;gap:var(--s1);margin-top:var(--s2)}
.aip-file{display:flex;gap:var(--s2);align-items:flex-start;background:var(--surface);color:var(--fg);border:1px solid var(--line);border-radius:var(--r-sm);padding:var(--s2);max-width:100%;text-align:left}
.aip-file audio{max-width:220px;height:36px}.aip-thumb{max-width:140px;max-height:120px;border-radius:var(--r-sm);object-fit:cover}
.aip-fmeta{display:flex;flex-direction:column;min-width:0;gap:2px}.aip-fname{font-weight:700;overflow-wrap:anywhere;color:var(--fg)}.aip-fmeta small{color:var(--fg-3);font-size:var(--fs-1)}
.aip-facts{display:flex;flex-wrap:wrap;gap:var(--s2);font-size:var(--fs-2)}.aip-facts .lnk{font-size:var(--fs-2)}
.aip-sec{display:flex;flex-direction:column;gap:var(--s2)}.aip-sec h3{margin:0;font-size:var(--fs-4)}
.aip-new>summary{cursor:pointer;list-style:none}.aip-new>summary::-webkit-details-marker{display:none}.aip-new>summary h3{display:inline}.aip-new>summary::before{content:"+ ";font-weight:800;color:var(--accent-text)}.aip-new[open]>summary{margin-bottom:var(--s2)}
.aip-form{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:var(--s2);align-items:end}
.aip-fl{display:flex;flex-direction:column;gap:2px;font-size:var(--fs-2);color:var(--fg-2);font-weight:600;min-width:0}
.aip-fl input,.aip-fl select,.aip-fl textarea,.aip-filt select,.aip-filt input{font:inherit;font-size:var(--fs-3);border:1px solid var(--line-2);border-radius:var(--r-sm);padding:6px var(--s2);background:var(--surface);color:var(--fg);min-width:0;width:100%;font-weight:500}
.aip-wide,.aip-fs{grid-column:1/-1}
.aip-fs{border:1px solid var(--line);border-radius:var(--r-sm);padding:var(--s2);display:flex;flex-wrap:wrap;gap:var(--s1) var(--s3);margin:0;min-width:0}
.aip-fs legend{font-size:var(--fs-2);font-weight:600;color:var(--fg-2)}.aip-ck{font-size:var(--fs-3);display:inline-flex;gap:var(--s1);align-items:center}
.aip-err{grid-column:1/-1;margin:0;color:var(--bad-text);font-size:var(--fs-2)}.aip-err:empty{display:none}
.aip-filt{display:flex;flex-wrap:wrap;gap:var(--s2);align-items:end}.aip-filt label{display:flex;flex-direction:column;font-size:var(--fs-2);color:var(--fg-2);gap:2px;min-width:0}.aip-grow{flex:1 1 160px}
.aip-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:var(--s1)}
.aip-row{display:flex;flex-direction:column;gap:2px;width:100%;text-align:left;border:1px solid var(--line);background:var(--surface);border-radius:var(--r-sm);padding:var(--s2) var(--s3);cursor:pointer;color:var(--fg);font:inherit}
.aip-row:hover{background:var(--surface-2)}.aip-row small,.aip-ritem small,.aip-jl small{color:var(--fg-3);font-size:var(--fs-2)}
.aip-rq{font-size:var(--fs-3);overflow-wrap:anywhere}.aip-rt{display:flex;flex-wrap:wrap;gap:var(--s1);align-items:center}
.aip-ritem{border:1px solid var(--line);border-radius:var(--r-sm);padding:var(--s2) var(--s3);display:flex;flex-direction:column;gap:var(--s1);min-width:0}
.aip-jl li{display:flex;flex-direction:column;gap:2px;border-bottom:1px solid var(--line);padding:var(--s1) 0}
.aip-rbtn{display:flex;flex-wrap:wrap;gap:var(--s1)}.aip-rbtn .btn-sec,.aip-rbtn .btn-quiet{min-height:30px;padding:0 var(--s2);font-size:var(--fs-2)}
.aip-prog{height:6px;border-radius:var(--r-pill);background:var(--surface-3);overflow:hidden}.aip-prog i{display:block;height:100%;background:var(--good-fill)}
.aip-kinds{display:flex;flex-wrap:wrap;gap:var(--s1)}.aip-kinds button{min-height:32px;padding:0 var(--s3);font-size:var(--fs-2)}
.aip-rep{border:1px solid var(--line);border-radius:var(--r);padding:var(--s3);display:flex;flex-direction:column;gap:var(--s2);min-width:0}.aip-rep h4{margin:0;font-size:var(--fs-4)}.aip-rep h4 small{color:var(--fg-3);font-weight:600}.aip-rep .aip-pre{margin:0}
.aip-prop{border:1px dashed var(--line-2);border-radius:var(--r);padding:var(--s3)}.aip-prop ol{margin:var(--s2) 0;padding-left:var(--s5)}
.aip-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}
.aip-more{align-self:center}
.aip-page{display:flex;flex-direction:column;gap:0}.aip-page>.aip-sec,.aip-page>details.aip-sec{background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:var(--s4);margin-top:var(--s4)}
.aip-grip{position:absolute;left:-5px;top:0;bottom:0;width:10px;cursor:ew-resize;z-index:3;touch-action:none}
.aip-grip::after{content:"";position:absolute;left:4px;top:50%;width:3px;height:44px;margin-top:-22px;border-radius:2px;background:var(--line-2)}
.aip-grip:hover::after,.aip-grip:focus-visible::after,.aip-drag .aip-grip::after{background:var(--accent)}
#aip.aip-bottom .aip-grip,#aip.aip-phone .aip-grip{left:0;right:0;top:-5px;bottom:auto;width:auto;height:12px;cursor:ns-resize}
#aip.aip-phone .aip-grip{top:0;height:14px}
#aip.aip-bottom .aip-grip::after,#aip.aip-phone .aip-grip::after{left:50%;top:5px;width:44px;height:4px;margin:0 0 0 -22px}
#aip.aip-full:not(.aip-phone) .aip-grip,#aip:not(.aip-side) .aip-corner,#aip.aip-phone .aip-corner{display:none}
.aip-corner{position:absolute;left:-6px;top:-6px;width:18px;height:18px;cursor:nwse-resize;z-index:4;touch-action:none}
.aip-corner::after{content:"";position:absolute;left:6px;top:6px;width:8px;height:8px;border-left:2px solid var(--line-2);border-top:2px solid var(--line-2)}
.aip-drag{user-select:none}
@media (min-width:861px){body.aip-on-side .main{padding-right:calc(var(--aip-w,440px) + var(--s4))}body.aip-on-bottom .main{padding-bottom:calc(var(--aip-hb,360px) + var(--s4))}}
@media (max-width:860px){#aip .aip-ib,#aip .aip-ask .aip-ib{width:40px;height:40px}.aip-tabs button{min-height:44px;padding:var(--s2) var(--s1);font-size:var(--fs-2)}#askInp{min-height:44px}
#aip .aip-chips{display:flex;flex-wrap:nowrap;overflow-x:auto;max-height:none;gap:var(--s2);padding-bottom:var(--s1);scrollbar-width:thin}#aip .aip-chips>*{flex:0 0 auto;white-space:nowrap;margin:0}#aip .aip-ask .aip-send{min-height:40px}#aip .aip-acts .btn-quiet,#aip .aip-acts summary,.aip-rbtn .btn-sec,.aip-rbtn .btn-quiet{min-height:40px}.aip-dd>div{position:fixed;left:var(--s4);right:var(--s4);bottom:var(--s5);max-width:none}}
@media (prefers-reduced-motion:reduce){.aip-dot{animation:none}}
@media print{#aip{display:none!important}}
`;

  // ======================= подключение к ядру =======================
  function init(k){
    K = k; W = K.W; CAT = K.CAT; F = K.fmt; R = K.roles; D = K.data; U = K.ui; Live = K.live || window.Live; LIVE = Live.data; FS = window.FileStore;
    U.css('ai', CSS);
    K.sections.ai = page;
    // перенесено из app.js: контекст роли, вопрос ИИ, встроенные ответы, утренняя сводка — для других модулей через K.data
    Object.assign(K.data, { aiContext, aiAsk: (q, onText, signal) => aiAsk(q, onText, signal), answer: q => { const a = answer(q); return [t('ai.who.' + a.label), a.text, !!a.free]; }, morningSummary: summary, aiReport: buildReport });
    build();
    document.addEventListener('click', onClick); document.addEventListener('change', onChange); document.addEventListener('input', onInput); document.addEventListener('submit', onSubmit); document.addEventListener('keydown', onKey);
    K.hooks.afterRender.push(afterRender); K.hooks.onLang.push(onLang);
    Live.onChange(onLive);
    let rz = 0; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { layout(); if (isOpen) renderBody(false); }, 120); });
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => { if (phone() && isOpen) layout(); });
    setInterval(tick, 30000); setTimeout(tick, 4000);
  }
  const M = { name:'ai', version:'0.8.0', ready:true, init, open, ask, close, reply, minimize, restore, setMode, setTab, runRoutine: (id, how) => { const r = routineById(id); return r ? runRoutine(r, how || 'manual') : null; },
    get isOpen(){ return isOpen; }, get pref(){ return { ...pref }; }, presets: () => PRESETS.map(p => ({ ...p })), nextRunOf, answer, summary };
  (window.SUNKAR_MODULES = window.SUNKAR_MODULES || []).push(M);
  window.AI = M;
})();
