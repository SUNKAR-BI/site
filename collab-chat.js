// SUNKAR BI · collab-chat.js — модуль «chat» (шаг 2C, пункт 3: чаты уровня мессенджера).
// Каналы мира (по блокам и объектам, история из world.js) + группы + личные чаты; лента с ответами, упоминаниями @роль,
// закрепом, поиском, отметками «сохранено / доставлено / прочитано», «показать ещё» по 50; вложения (фото со сжатием до 1600 px,
// видео, файлы, голосовые и видео с камеры через MediaRecorder) — через window.FileStore; правка своего сообщения 5 минут —
// только через Live.editMessage (история версий, пометка «изменено»); удаления нет нигде (ни кнопки, ни функции).
// «ИИ,» в начале — ответ помощника по правам; в группах и личных — по данным, доступным всем участникам.
// Данные: LIVE.chats — группы, личные, настройки каналов (закреп; name — название); LIVE.chat — сообщения; LIVE.files — метаданные вложений.
// Сервер Агентства: chats = chat_room, chat = chat_msg; id — строки, by — 'e<employeeId>', автор — byName; участие в группе и 5 минут правки проверяет сервер.
// Ядро: K = window.SUNKAR — K.sections.chats (вкладки #chats-groups, #chats-direct, #chats-channels), хуки before/afterRender, onHash.
// Модуль ИИ (если подключён и умеет reply(q, ctx) → текст) отвечает вместо встроенного пути ядра (K.data.aiAsk / K.data.answer).
(function(){
  'use strict';
  const I = window.I18N, Live = window.Live, FS = window.FileStore;
  const t = (k, v) => I.t(k, v);
  I.add('ru', {
    'chat.title': 'Чаты', 'chat.sub': 'каналы по блокам и объектам, группы и личные чаты · сообщения не удаляются, правка — 5 минут',
    'chat.tab.all': 'Все', 'chat.tab.groups': 'Группы', 'chat.tab.direct': 'Личные', 'chat.tab.channels': 'Каналы', 'chat.tabs': 'Виды чатов',
    'chat.search_all': 'Поиск по чатам и сообщениям', 'chat.search_in': 'Поиск в чате', 'chat.found': 'Найдено в сообщениях: {n}', 'chat.found_in': 'найдено: {n}', 'chat.none_found': 'Ничего не найдено.',
    'chat.new_group': '+ Группа', 'chat.write': '✎ Написать…', 'chat.no_chats': 'Чатов этого вида пока нет.', 'chat.no_role': 'У этой роли нет чатов.',
    'chat.back': '← Чаты', 'chat.menu': 'Меню чата: участники, закреплённые, файлы', 'chat.list': 'Список чатов', 'chat.feed': 'Сообщения чата',
    'chat.kind.channel': 'канал', 'chat.kind.group': 'группа', 'chat.kind.direct': 'личный чат', 'chat.admin_short': 'вы — администратор',
    'chat.closed': 'Группа закрыта — только чтение, история сохранена.', 'chat.ro': 'У вас только просмотр — писать нельзя.', 'chat.cant_post': 'Роль «{r}» в этом чате только читает.',
    'chat.ph': 'Сообщение · «ИИ,» в начале — ответит помощник · без ИИН и личных данных', 'chat.ph_ai': 'Вопрос ИИ-помощнику · без ИИН и личных данных', 'chat.input': 'Текст сообщения',
    'chat.send': 'Отправить', 'chat.attach': 'Прикрепить файл', 'chat.camera': 'Фото или видео с камеры', 'chat.voice': 'Записать голосовое', 'chat.video_rec': 'Записать видео с камеры',
    'chat.reply': 'Ответить', 'chat.edit': 'Изменить', 'chat.pin': 'Закрепить', 'chat.unpin': 'Открепить', 'chat.to_task': '→ задача', 'chat.task_made': 'задача {no} создана', 'chat.task_wait': 'задача создана',
    'chat.edited': 'изменено {t}', 'chat.versions': 'Версии сообщения', 'chat.ver_cur': 'сейчас', 'chat.ver_orig': 'исходная', 'chat.ver_note': 'Сообщения не удаляются; каждая правка сохраняется (до 10 версий).',
    'chat.replying': 'Ответ на сообщение · {w}', 'chat.editing': 'Правка сообщения · осталось {s}', 'chat.cancel': 'Отменить', 'chat.late': 'Время правки истекло — сообщение не изменено.',
    'chat.more': 'Показать ещё {n}', 'chat.new_msgs': 'Новые сообщения', 'chat.world_hist': 'история из мира · {d}', 'chat.empty': 'Сообщений пока нет — напишите первым.',
    'chat.tick.saved': 'сохранено', 'chat.tick.dlv': 'доставлено', 'chat.tick.read': 'прочитано всеми', 'chat.tick.readn': 'прочитали {a} из {b}',
    'chat.pinned': 'Закреплено', 'chat.pinned_n': 'Закреплённые ({n} из 3)',
    'chat.ai_name': 'ИИ-помощник', 'chat.ai_who': 'помощник', 'chat.ai_off': 'ИИ-помощник подключён с {d} — на выбранную дату ответов ИИ в чатах нет.',
    'chat.ai_money': 'В этом чате есть участники без доступа к финансам — денежные данные здесь не показываю. Спросите в панели ИИ-помощника или в канале «Руководство».',
    'chat.ai_fail': 'ИИ сейчас не ответил — попробуйте ещё раз позже.', 'chat.ai_dm': 'ИИ-помощник · личный чат',
    'chat.ai_sum': 'Сводка чата «{name}» за {d}: сообщений {n}, писали {a}{who}; вложений {f}; закреплено {p}; задач из сообщений {k}.', 'chat.ai_sum_last': ' Последнее: «{x}».',
    'chat.ai_rights': 'Данные — по правам роли «{r}» (минимальные права участников).',
    'chat.rec': 'Идёт запись голосового', 'chat.rec_stop': '■ Отправить', 'chat.rec_cancel': 'Отменить запись', 'chat.rec_busy': 'Запись уже идёт.',
    'chat.rec_unsupported': 'Этот браузер не умеет записывать звук — прикрепите аудиофайл через 📎.', 'chat.mic_denied': 'Нет доступа к микрофону — разрешите микрофон для этой страницы в настройках браузера.',
    'chat.mic_none': 'Микрофон не найден или занят другой программой.', 'chat.cam_denied': 'Нет доступа к камере — разрешите камеру и микрофон для этой страницы в настройках браузера.',
    'chat.cam_none': 'Камера не найдена или занята другой программой.', 'chat.vid_unsupported': 'Этот браузер не умеет записывать видео — снимите видео камерой через 📷.',
    'chat.vrec_title': 'Видео с камеры · до 60 секунд', 'chat.vrec_start': '● Начать запись', 'chat.vrec_stop': '■ Остановить', 'chat.vrec_send': 'Отправить видео', 'chat.vrec_again': 'Переснять', 'chat.vrec_wait': 'Включаю камеру…',
    'chat.uploading': 'Сохраняю вложение…', 'chat.file_big': 'Файл «{n}» больше {mb} МБ — не отправлен.', 'chat.video_long': 'Видео длиннее 60 секунд — не отправлено.', 'chat.max_files': 'Не больше 10 файлов в сообщении.',
    'chat.voice_msg': 'Голосовое', 'chat.video_msg': 'Видео', 'chat.photo': 'Фото', 'chat.file': 'Файл', 'chat.file_na': 'файл недоступен в этом браузере', 'chat.open_full': 'Открыть фото во весь экран', 'chat.files_n': 'вложений: {n}',
    'chat.sys.created': '{who} создал(а) группу «{name}»', 'chat.sys.added': '{who} добавил(а): {whom}', 'chat.sys.removed': '{who} исключил(а): {whom}', 'chat.sys.left': '{who} вышел(а) из группы',
    'chat.sys.admin': '{who} назначил(а) администратором: {whom}', 'chat.sys.renamed': '{who} переименовал(а) группу в «{name}»', 'chat.sys.closed': '{who} закрыл(а) группу — только чтение',
    'chat.sys.reopened': '{who} снова открыл(а) группу', 'chat.sys.direct': '{who} начал(а) личный чат', 'chat.sys.ai_off': 'ИИ-помощник подключён с {d} — на выбранную дату ответов ИИ нет.',
    'chat.ng.title': 'Новая группа', 'chat.ng.name': 'Название группы', 'chat.ng.name_ph': 'Например: Проверка ЖК · без ИИН и личных данных', 'chat.ng.members': 'Участники (роли)', 'chat.ng.create': 'Создать группу',
    'chat.ng.err_name': 'Введите название группы.', 'chat.ng.err_members': 'Выберите хотя бы одного участника.', 'chat.ng.err_limit': 'В журнале уже 200 групп — новую создать нельзя.',
    'chat.ng.only_contacts': 'Роль «{r}» добавляет только руководителя, подчинённых и коллег своего объекта.', 'chat.ng.you_admin': 'Вы станете администратором группы.',
    'chat.dm.title': 'Написать…', 'chat.dm.hint': 'Личный чат — ровно два участника. Если чат уже есть — откроется он.',
    'chat.mn.members': 'Участники', 'chat.mn.admin': 'администратор', 'chat.mn.make_admin': 'Сделать администратором', 'chat.mn.remove': 'Исключить', 'chat.mn.add': 'Добавить участников', 'chat.mn.add_btn': 'Добавить',
    'chat.mn.rename': 'Название группы', 'chat.mn.rename_btn': 'Переименовать', 'chat.mn.close': 'Закрыть группу (только чтение)', 'chat.mn.reopen': 'Открыть группу снова', 'chat.mn.leave': 'Выйти из группы',
    'chat.mn.pinned': 'Закреплённые сообщения', 'chat.mn.files': 'Файлы чата', 'chat.mn.task': 'Создать задачу по чату', 'chat.mn.pin_chat': 'Закрепить чат вверху списка', 'chat.mn.unpin_chat': 'Открепить чат в списке',
    'chat.mn.none': 'нет', 'chat.mn.nodelete': 'Удалить группу или сообщение нельзя — история чатов хранится.', 'chat.mn.who': 'Кто в канале', 'chat.mn.no_add': 'Добавить некого.', 'chat.mn.manage': 'Управление',
    'chat.mn.err_rename': 'Введите новое название.', 'chat.mn.task_made': 'Задача по чату создана.', 'chat.mn.members_n': 'Участники · {n}',
    'chat.task_from_chat': 'По чату «{name}»', 'chat.mention': 'Упомянуть участника', 'chat.ment_t': 'вас упомянули: {n}', 'chat.unread_t': 'непрочитано: {n}',
    'chat.j.pinned': 'закрепил сообщение', 'chat.j.unpinned': 'открепил сообщение', 'chat.j.members': 'изменил состав группы', 'chat.j.renamed': 'переименовал группу', 'chat.j.closed': 'закрыл группу', 'chat.j.reopened': 'открыл группу', 'chat.j.task': 'создал задачу из сообщения',
    'chat.ch.lead': 'Руководство', 'chat.ch.sec': 'Охрана · все объекты', 'chat.ch.buh': 'Бухгалтерия', 'chat.ch.fleet': 'Автопарк', 'chat.ch.it': 'Сервер и 1С', 'chat.ch.all': 'Общий', 'chat.ch.o18': '{o} · посты',
    'chat.who.lead': 'ГД, ИД, главный бухгалтер, начальник охраны, коммерческий директор, юрист', 'chat.who.sec': 'начальник охраны, заместители, начальники объектов', 'chat.who.buh': 'главный бухгалтер, бухгалтеры, исполнительный директор',
    'chat.who.fleet': 'механик, водители, начальник охраны', 'chat.who.it': 'администратор, главный бухгалтер, исполнительный директор', 'chat.who.all': 'все сотрудники', 'chat.who.o18': 'начальник объекта, старшие смен, охранники объекта, начальник охраны',
    'chat.size.kb': '{n} КБ', 'chat.size.mb': '{n} МБ', 'chat.sec': '{n} с', 'chat.you': 'вы',
  });
  I.add('en', {
    'chat.title': 'Chats', 'chat.sub': 'channels by unit and site, groups and direct chats · messages are never deleted, editing — 5 minutes',
    'chat.tab.all': 'All', 'chat.tab.groups': 'Groups', 'chat.tab.direct': 'Direct', 'chat.tab.channels': 'Channels', 'chat.tabs': 'Chat types',
    'chat.search_all': 'Search chats and messages', 'chat.search_in': 'Search in chat', 'chat.found': 'Found in messages: {n}', 'chat.found_in': 'found: {n}', 'chat.none_found': 'Nothing found.',
    'chat.new_group': '+ Group', 'chat.write': '✎ Message…', 'chat.no_chats': 'No chats of this type yet.', 'chat.no_role': 'This role has no chats.',
    'chat.back': '← Chats', 'chat.menu': 'Chat menu: members, pinned, files', 'chat.list': 'Chat list', 'chat.feed': 'Chat messages',
    'chat.kind.channel': 'channel', 'chat.kind.group': 'group', 'chat.kind.direct': 'direct chat', 'chat.admin_short': 'you are an admin',
    'chat.closed': 'The group is closed — read only, history is kept.', 'chat.ro': 'View only — you cannot write.', 'chat.cant_post': 'The “{r}” role can only read this chat.',
    'chat.ph': 'Message · start with “AI,” for the assistant · no IDs or personal data', 'chat.ph_ai': 'Question to the AI assistant · no IDs or personal data', 'chat.input': 'Message text',
    'chat.send': 'Send', 'chat.attach': 'Attach a file', 'chat.camera': 'Photo or video from camera', 'chat.voice': 'Record a voice message', 'chat.video_rec': 'Record a video from camera',
    'chat.reply': 'Reply', 'chat.edit': 'Edit', 'chat.pin': 'Pin', 'chat.unpin': 'Unpin', 'chat.to_task': '→ task', 'chat.task_made': 'task {no} created', 'chat.task_wait': 'task created',
    'chat.edited': 'edited {t}', 'chat.versions': 'Message versions', 'chat.ver_cur': 'now', 'chat.ver_orig': 'original', 'chat.ver_note': 'Messages are never deleted; every edit is kept (up to 10 versions).',
    'chat.replying': 'Replying to {w}', 'chat.editing': 'Editing message · {s} left', 'chat.cancel': 'Cancel', 'chat.late': 'The editing time is over — the message was not changed.',
    'chat.more': 'Show {n} more', 'chat.new_msgs': 'New messages', 'chat.world_hist': 'company history · {d}', 'chat.empty': 'No messages yet — write the first one.',
    'chat.tick.saved': 'saved', 'chat.tick.dlv': 'delivered', 'chat.tick.read': 'read by everyone', 'chat.tick.readn': 'read by {a} of {b}',
    'chat.pinned': 'Pinned', 'chat.pinned_n': 'Pinned ({n} of 3)',
    'chat.ai_name': 'AI assistant', 'chat.ai_who': 'assistant', 'chat.ai_off': 'The AI assistant has been connected since {d} — no AI replies in chats on the selected date.',
    'chat.ai_money': 'Some members of this chat have no access to finance — I do not show money data here. Ask in the AI assistant panel or in the “Management” channel.',
    'chat.ai_fail': 'The AI did not answer right now — please try again later.', 'chat.ai_dm': 'AI assistant · direct chat',
    'chat.ai_sum': 'Summary of “{name}” for {d}: {n} messages, written by {a}{who}; attachments {f}; pinned {p}; tasks from messages {k}.', 'chat.ai_sum_last': ' Latest: “{x}”.',
    'chat.ai_rights': 'Data follow the rights of the “{r}” role (the lowest rights among members).',
    'chat.rec': 'Recording a voice message', 'chat.rec_stop': '■ Send', 'chat.rec_cancel': 'Cancel recording', 'chat.rec_busy': 'Recording is already on.',
    'chat.rec_unsupported': 'This browser cannot record sound — attach an audio file with 📎.', 'chat.mic_denied': 'No access to the microphone — allow the microphone for this page in the browser settings.',
    'chat.mic_none': 'No microphone found, or it is used by another program.', 'chat.cam_denied': 'No access to the camera — allow the camera and microphone for this page in the browser settings.',
    'chat.cam_none': 'No camera found, or it is used by another program.', 'chat.vid_unsupported': 'This browser cannot record video — shoot a video with the camera via 📷.',
    'chat.vrec_title': 'Camera video · up to 60 seconds', 'chat.vrec_start': '● Start recording', 'chat.vrec_stop': '■ Stop', 'chat.vrec_send': 'Send video', 'chat.vrec_again': 'Record again', 'chat.vrec_wait': 'Turning the camera on…',
    'chat.uploading': 'Saving the attachment…', 'chat.file_big': 'File “{n}” is larger than {mb} MB — not sent.', 'chat.video_long': 'The video is longer than 60 seconds — not sent.', 'chat.max_files': 'No more than 10 files per message.',
    'chat.voice_msg': 'Voice message', 'chat.video_msg': 'Video', 'chat.photo': 'Photo', 'chat.file': 'File', 'chat.file_na': 'file not available in this browser', 'chat.open_full': 'Open the photo full screen', 'chat.files_n': 'attachments: {n}',
    'chat.sys.created': '{who} created the group “{name}”', 'chat.sys.added': '{who} added {whom}', 'chat.sys.removed': '{who} removed {whom}', 'chat.sys.left': '{who} left the group',
    'chat.sys.admin': '{who} made {whom} an admin', 'chat.sys.renamed': '{who} renamed the group to “{name}”', 'chat.sys.closed': '{who} closed the group — read only',
    'chat.sys.reopened': '{who} reopened the group', 'chat.sys.direct': '{who} started a direct chat', 'chat.sys.ai_off': 'The AI assistant has been connected since {d} — no AI replies on the selected date.',
    'chat.ng.title': 'New group', 'chat.ng.name': 'Group name', 'chat.ng.name_ph': 'For example: Residential complex check · no IDs or personal data', 'chat.ng.members': 'Members (roles)', 'chat.ng.create': 'Create group',
    'chat.ng.err_name': 'Enter the group name.', 'chat.ng.err_members': 'Pick at least one member.', 'chat.ng.err_limit': 'The log already has 200 groups — a new one cannot be created.',
    'chat.ng.only_contacts': 'The “{r}” role can add only its manager, subordinates and colleagues of its site.', 'chat.ng.you_admin': 'You will be the group admin.',
    'chat.dm.title': 'Message…', 'chat.dm.hint': 'A direct chat has exactly two members. If the chat exists, it opens.',
    'chat.mn.members': 'Members', 'chat.mn.admin': 'admin', 'chat.mn.make_admin': 'Make admin', 'chat.mn.remove': 'Remove', 'chat.mn.add': 'Add members', 'chat.mn.add_btn': 'Add',
    'chat.mn.rename': 'Group name', 'chat.mn.rename_btn': 'Rename', 'chat.mn.close': 'Close the group (read only)', 'chat.mn.reopen': 'Reopen the group', 'chat.mn.leave': 'Leave the group',
    'chat.mn.pinned': 'Pinned messages', 'chat.mn.files': 'Chat files', 'chat.mn.task': 'Create a task for the chat', 'chat.mn.pin_chat': 'Pin the chat to the top of the list', 'chat.mn.unpin_chat': 'Unpin the chat',
    'chat.mn.none': 'none', 'chat.mn.nodelete': 'A group or a message cannot be deleted — chat history is kept.', 'chat.mn.who': 'Who is in the channel', 'chat.mn.no_add': 'Nobody to add.', 'chat.mn.manage': 'Management',
    'chat.mn.err_rename': 'Enter a new name.', 'chat.mn.task_made': 'A task for the chat has been created.', 'chat.mn.members_n': 'Members · {n}',
    'chat.task_from_chat': 'Re chat “{name}”', 'chat.mention': 'Mention a member', 'chat.ment_t': 'you were mentioned: {n}', 'chat.unread_t': 'unread: {n}',
    'chat.j.pinned': 'pinned a message', 'chat.j.unpinned': 'unpinned a message', 'chat.j.members': 'changed group members', 'chat.j.renamed': 'renamed a group', 'chat.j.closed': 'closed a group', 'chat.j.reopened': 'reopened a group', 'chat.j.task': 'created a task from a message',
    'chat.ch.lead': 'Management', 'chat.ch.sec': 'Security · all sites', 'chat.ch.buh': 'Accounting', 'chat.ch.fleet': 'Fleet', 'chat.ch.it': 'Server & 1C', 'chat.ch.all': 'General', 'chat.ch.o18': '{o} · posts',
    'chat.who.lead': 'GD, ED, chief accountant, head of security, commercial director, lawyer', 'chat.who.sec': 'head of security, deputies, site managers', 'chat.who.buh': 'chief accountant, accountants, executive director',
    'chat.who.fleet': 'mechanic, drivers, head of security', 'chat.who.it': 'administrator, chief accountant, executive director', 'chat.who.all': 'all employees', 'chat.who.o18': 'site manager, shift supervisors, site guards, head of security',
    'chat.size.kb': '{n} KB', 'chat.size.mb': '{n} MB', 'chat.sec': '{n} s', 'chat.you': 'you',
  });

  // ---------- константы и состояние экрана (не данные: данные — только в LIVE) ----------
  const AI_ID = '@ai', PAGE = 50, MB = 1024 * 1024, PIN_MAX = 3;
  const OBJ_ROLES = ['Начальник объекта', 'Старший смены', 'Охранник'];
  const MONEY_RE = /выручк|прибыл|ebitda|дебитор|долг|оплат|деньг|денег|денеж|налог|убыт|рентаб|маржа|зарплат|фот|бюджет|revenue|profit|cash|money|salar|payroll|receivab|tax|budget|margin/i;
  const AI_RE = /^@?(ии|ai)[\s,:]+/i, SUM_RE = /^(сводка|summary)(?=$|[\s,.:;!?])/i;
  const LS_SEEN = 'sunkar-chat-seen', LS_PINS = 'sunkar-chat-pins';
  const ST = { list:'', fq:'', lim:{}, reply:null, editing:null, fill:null, view:'list', rec:null, flash:null, jump:null, stick:false, more:false, snap:null, drafts:{}, scroll:null, playing:[], busy:false, tasking:{} };
  const urlCache = new Map();
  let K = null, io = null, readQ = new Set(), readT = 0, flashT = 0, chCache = { k:null, v:null }, active = false, dlvT = 0;

  // ---------- мелкие помощники ----------
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
  const lsGet = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v && typeof v === 'object' ? v : d; } catch(e){ return d; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} };
  const ROLES = () => K.roles.ROLES;
  const roleBy = n => ROLES().find(r => r.name === n) || null;
  const meName = () => K.S.role || 'Исполнительный директор';
  const myRole = () => K.roles.roleOf(meName());
  const rn = n => n === AI_ID ? t('chat.ai_name') : (roleBy(n) ? K.fmt.rn(n) : I.tx(n));
  const p2 = x => String(x).padStart(2, '0');
  const mmss = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + p2(s % 60); };
  const dayKey = ts => { const d = new Date(ts); return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); };
  const dayLabel = ts => { const d = new Date(ts); return I.date(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))); };
  const sizeTxt = b => b >= MB ? t('chat.size.mb', { n: I.n(b / MB, 1) }) : t('chat.size.kb', { n: I.int(Math.max(1, b / 1024)) });
  const durTxt = s => s == null || !isFinite(s) ? '' : Math.floor(s / 60) + ':' + p2(Math.round(s % 60));
  const snip = (s, n = 90) => { const x = String(s || '').replace(/\s+/g, ' ').trim(); return x.length > n ? x.slice(0, n - 1) + '…' : x; };
  const hasMoney = name => name === AI_ID ? true : K.roles.hasMoney(K.roles.roleOf(name));
  function asRole(name, fn){ const S = K.S, prev = S.role; if (!name || name === prev || !roleBy(name)) return fn(); S.role = name; try { return fn(); } finally { S.role = prev; } }

  // ---------- модель: каналы мира + группы и личные из LIVE.chats ----------
  function worldChannels(){
    const at = K.RNG.anchor, k = at + ':' + I.lang;
    if (chCache.k !== k) chCache = { k, v: K.data.chatsAt(at) };
    return chCache.v;
  }
  const chMembers = id => ROLES().filter(r => r.rt.chats !== '·' && (K.roles.CH_OF[r.id] || ['all']).includes(id)).map(r => r.name);
  const chName = id => id === 'o18' ? t('chat.ch.o18', { o: I.w(K.roles.MYOBJ) }) : (I.has('chat.ch.' + id) ? t('chat.ch.' + id) : id);
  function worldMsg(ch, at, m, i){
    const [hh, mm] = String(m[0]).split(':').map(Number), base = K.W.toDate(at).getTime();
    return { id:`w:${ch}:${at}:${i}`, ch, world:true, t:m[0], author:m[1], text:m[2], bot:/^ИИ/.test(m[1]), ts: base + ((hh || 0) * 60 + (mm || 0)) * 60000, day:at, kind:'text', files:[] };
  }
  function allChats(){
    const at = K.RNG.anchor, rows = Live.get('chats');
    const chans = worldChannels().map(c => {
      const set = rows.find(x => x.kind === 'channel' && x.ch === c.id);
      return { id:c.id, kind:'channel', name: chName(c.id), who: I.has('chat.who.' + c.id) ? t('chat.who.' + c.id) : c.who, n:c.n, members: chMembers(c.id), admins: [K.roles.CH_OWNER[c.id]].filter(Boolean), pinned: (set && set.pinned) || [], row: set || null, world: c.msgs.map((m, i) => worldMsg(c.id, at, m, i)) };
    });
    const own = rows.filter(x => x.kind === 'group' || x.kind === 'direct').map(x => {
      const members = Array.isArray(x.members) ? x.members : [];
      return { id:x.id, kind:x.kind, name:x.name || '', members, admins: x.admins || [], pinned: x.pinned || [], closed: !!x.closed, row:x, world:[], ai: x.kind === 'direct' && members.includes(AI_ID), color: x.color || 1, n: members.filter(m => m !== AI_ID).length };
    });
    return chans.concat(own);
  }
  const chatTitle = (c, me = meName()) => c.kind === 'direct' ? (c.ai ? t('chat.ai_dm') : rn(c.members.find(m => m !== me) || c.members[0] || '')) : c.name;
  function canView(c, rl){
    if (!rl || rl.rt.chats === '·') return false;
    if (c.kind === 'channel') return (K.roles.CH_OF[rl.id] || ['all']).includes(c.id);
    return c.members.includes(rl.name);
  }
  const liveMsgs = c => Live.get('chat').filter(m => m.ch === c.id && !(m.bot && K.RNG.anchor < K.W.LAUNCH_DEMO));
  const isMine = (m, me = meName()) => !m.world && !m.bot && m.kind !== 'system' && (Live.data.uid ? m.by === Live.data.uid : m.role === me);
  const seen = () => lsGet(LS_SEEN, {});
  function worldUnread(c, rl){
    if (c.kind !== 'channel' || !c.world.length) return 0;
    const s = seen()[rl.name] || {};
    return s[c.id] === K.RNG.anchor ? 0 : Math.min(c.world.length, Math.floor(K.data.hb(K.RNG.anchor, c.id.length, 120) * 4));
  }
  function stats(c, rl){
    const me = rl.name; let n = 0, m = 0;
    const L = liveMsgs(c);
    for (const x of L){ if (x.kind === 'system' || isMine(x, me) || (x.readBy || {})[me]) continue; n++; if ((x.mentions || []).includes(me)) m++; }
    const last = L.length ? L[L.length - 1] : (c.world.length ? c.world[c.world.length - 1] : null);
    return { unread: n + worldUnread(c, rl), ment: m, last, lastTs: last ? last.ts : 0 };
  }
  const chatPins = () => (lsGet(LS_PINS, {})[meName()] || []);
  function visibleChats(rl){
    const pins = lsGet(LS_PINS, {})[rl.name] || [];
    return allChats().filter(c => canView(c, rl)).map(c => Object.assign(c, stats(c, rl), { pinnedChat: pins.includes(c.id) }))
      .sort((a, b) => (b.pinnedChat - a.pinnedChat) || (b.lastTs - a.lastTs));
  }
  const findChat = id => allChats().find(c => c.id === id) || null;
  const whoOf = m => m.kind === 'system' ? '' : (m.bot ? t('chat.ai_name') + (m.aiWho ? ' · ' + I.tx(m.aiWho) : '') : (m.world ? (/^ИИ · /.test(m.author) ? t('chat.ai_name') + ' · ' + I.tx(m.author.slice(5)) : rn(m.author)) : (m.byName ? m.byName + ' · ' + rn(m.role) : Live.whoOf(m))));
  const timeOf = m => m.world ? m.t : K.fmt.tOf(m.ts);
  const msgById = (c, id) => liveMsgs(c).find(x => x.id === id) || c.world.find(x => x.id === id) || null;
  const taskOf = m => Live.get('tasks').find(x => (m.taskId && x.id === m.taskId) || (x.link && x.link.msg === m.id)) || null;

  // ---------- права ----------
  const isAdmin = (c, rl = myRole()) => c.kind === 'channel' ? (rl.rt.chats === 'П' || c.admins.includes(rl.name)) : c.admins.includes(rl.name);
  const canPin = (c, rl = myRole()) => !Live.data.ro && (c.kind === 'direct' ? c.members.includes(rl.name) : (isAdmin(c, rl) || rl.rt.chats === 'П'));
  const canCreate = (rl = myRole()) => !Live.data.ro && !['·', 'Ч'].includes(rl.rt.chats);
  function postBlock(c, rl = myRole()){
    if (Live.data.ro) return t('chat.ro');
    if (c.closed) return t('chat.closed');
    if (rl.rt.chats === 'Ч' || rl.rt.chats === '·') return t('chat.cant_post', { r: rn(rl.name) });
    return '';
  }
  // кому роль может писать лично и кого добавлять в группы: уровень «С» — руководитель, подчинённые, коллеги своего объекта и ИИ
  function contacts(rl){
    const all = ROLES().filter(r => r.name !== rl.name && r.rt.chats !== '·');
    if (rl.rt.chats !== 'С') return all.map(r => r.name);
    const ok = new Set([rl.boss]);
    ROLES().forEach(r => { if (r.boss === rl.name) ok.add(r.name); });
    if (OBJ_ROLES.includes(rl.name)) OBJ_ROLES.forEach(n => ok.add(n));
    return all.filter(r => ok.has(r.name)).map(r => r.name);
  }
  // минимальные права среди участников: для ответа ИИ в группе/личном чате
  function minRole(c){
    if (c.kind === 'channel') return meName();
    const rank = n => { const r = roleBy(n); if (!r) return 9; return (hasMoney(n) ? 4 : 0) + (OBJ_ROLES.includes(n) ? 0 : 2); };
    return c.members.filter(n => n !== AI_ID && roleBy(n)).sort((a, b) => rank(a) - rank(b))[0] || meName();
  }

  // ---------- действия: сообщения ----------
  function mentionsIn(text, c){
    const pool = c.members.filter(n => n !== AI_ID), s = String(text || '');
    return pool.filter(n => s.includes('@' + rn(n)) || s.includes('@' + n));
  }
  const sysMsg = (ch, k, vars) => Live.add('chat', { ch, kind:'system', sys:{ k, ...vars }, text: I.t('chat.sys.' + k, { who:'', whom:'', name:'', ...vars, d: typeof vars.d === 'number' ? I.date(vars.d) : '' }) }, { journal:false });
  function sysText(m){
    const s = m.sys || {}; if (!s.k) return m.text || '';
    const whom = Array.isArray(s.whom) ? s.whom.map(rn).join(', ') : rn(s.whom || '');
    return t('chat.sys.' + s.k, { who: rn(s.who || ''), whom, name: s.name || '', d: typeof s.d === 'number' ? I.date(s.d) : (s.d || '') });
  }
  function setFlash(text, kind = 'bad'){
    ST.flash = text ? { text, kind } : null; clearTimeout(flashT);
    const el = document.getElementById('chFlash');
    if (el){ el.textContent = text || ''; el.className = 'ch-flash ' + (text ? 'on ' + kind : ''); }
    if (text) flashT = setTimeout(() => setFlash(null), 9000);
  }
  async function send(c){
    const inp = document.getElementById('chatIn'); if (!inp || ST.busy) return;
    const text = inp.value.trim(); if (!text) return;
    if (ST.editing) return saveEdit(text);
    const block = postBlock(c); if (block){ setFlash(block); return; }
    inp.value = ''; ST.drafts[c.id] = ''; closeMentions();
    const replyTo = ST.reply; ST.reply = null; ST.stick = true;
    const row = await Live.add('chat', { ch:c.id, text: text.slice(0, 4000), kind:'text', replyTo, mentions: mentionsIn(text, c), files:[], readBy:{ [meName()]: Date.now() } });
    if (!row){ setFlash(Live.data.err || t('chat.ro')); return; }
    if (c.ai || AI_RE.test(text)) await aiRespond(c, c.ai ? text.replace(AI_RE, '') : text.replace(AI_RE, ''));
  }
  async function saveEdit(text){
    const id = ST.editing; ST.editing = null;
    const r = await Live.editMessage(id, text);
    const inp = document.getElementById('chatIn'); if (inp) inp.value = '';
    const cur = K.S.chat; if (cur) ST.drafts[cur] = '';
    if (!r.ok && r.error !== 'same') setFlash(!r.error || r.error === 'not_found' ? t('chat.late') : r.error);   // сервер: правка только автор и ≤ 300 с (иначе 403)
    rerender();
  }
  function startEdit(id){
    const m = Live.byId('chat', id);
    if (!m || !Live.canEdit(m)){ setFlash(t('chat.late')); return; }
    ST.editing = id; ST.reply = null; ST.fill = m.text; rerender();
  }
  async function togglePin(c, id){
    if (!canPin(c)) return;
    const has = c.pinned.includes(id), pinned = has ? c.pinned.filter(x => x !== id) : [...c.pinned.filter(x => x !== id), id].slice(-PIN_MAX);
    const action = t(has ? 'chat.j.unpinned' : 'chat.j.pinned');
    if (c.row) await Live.update('chats', c.row.id, { pinned }, { action });
    else await Live.add('chats', { kind:'channel', ch:c.id, name:c.name, pinned });
    ST.jump = has ? null : id;
  }
  async function toTask(c, m){
    if (ST.tasking[m.id] || taskOf(m)) return;
    ST.tasking[m.id] = true;
    const owner = c.kind === 'channel' ? (K.roles.CH_OWNER[c.id] || 'Исполнительный директор') : (roleBy(m.role) && !m.bot ? m.role : meName());
    const obj = { title: String(m.text || whoOf(m)).slice(0, 120), owner, src:'чат', days:2, status:'в работе', pr:'высокий', link:{ kind:'chat', ch:c.id, msg:m.id } };
    const T = K.module('tasks');
    let r = null;
    try { r = await (T && typeof T.quickCreate === 'function' ? T.quickCreate(obj) : K.ui.quickTask(obj)); } catch(e){ r = null; }
    if (!r) delete ST.tasking[m.id];                                  // форму отменили — задачу можно поставить снова
    if (r && r.id && !m.world) await Live.update('chat', m.id, { taskId: r.id, taskNo: r.no || null }, { action: t('chat.j.task') });
    rerender();
  }
  // отметки «доставлено» и «прочитано» — без записи в журнал действий (это не действия)
  function queueRead(id){ readQ.add(id); clearTimeout(readT); readT = setTimeout(flushRead, 250); }
  async function flushRead(){
    const ids = [...readQ]; readQ = new Set(); const me = meName(), now = Date.now();
    for (const id of ids){ const m = Live.byId('chat', id); if (!m || (m.readBy || {})[me]) continue; await Live.update('chat', id, { readBy: { ...(m.readBy || {}), [me]: now }, deliveredTo: { ...(m.deliveredTo || {}), [me]: (m.deliveredTo || {})[me] || now } }, { journal:false }); }
  }
  async function markDelivered(list){
    if (Live.data.ro || Live.transport === 'db') return;          // в общем журнале «доставлено» = запись подтверждена db
    const me = meName(), now = Date.now(); let n = 0;
    for (const c of list) for (const m of liveMsgs(c).slice(-PAGE)){
      if (n >= 30) return;
      if (m.kind === 'system' || isMine(m, me) || m.bot || (m.deliveredTo || {})[me]) continue;
      n++; await Live.update('chat', m.id, { deliveredTo: { ...(m.deliveredTo || {}), [me]: now } }, { journal:false });
    }
  }
  function tick(m, c){
    const others = c.members.filter(n => n !== m.role && n !== AI_ID), rb = m.readBy || {}, dl = m.deliveredTo || {};
    const read = others.filter(n => rb[n]).length, conf = !String(m.id).startsWith('l') || others.some(n => dl[n] || rb[n]);
    if (others.length && read >= others.length) return `<span class="ch-tick rd" title="${esc(t('chat.tick.read'))}" aria-label="${esc(t('chat.tick.read'))}">✓✓</span>`;
    if (conf) return `<span class="ch-tick" title="${esc(t('chat.tick.dlv') + ' · ' + t('chat.tick.readn', { a: read, b: others.length }))}" aria-label="${esc(t('chat.tick.dlv'))}">✓✓</span>`;
    return `<span class="ch-tick" title="${esc(t('chat.tick.saved'))}" aria-label="${esc(t('chat.tick.saved'))}">✓</span>`;
  }

  // ---------- ИИ в чате ----------
  async function aiRespond(c, q){
    const at = K.RNG.anchor, me = meName();
    if (at < K.W.LAUNCH_DEMO) return sysMsg(c.id, 'ai_off', { d: K.W.LAUNCH_DEMO });
    const low = minRole(c), sum = SUM_RE.test(q.trim());
    let logged = false, aiNo = null;
    const bot = (text, who, st) => Promise.all([
      Live.add('chat', { ch:c.id, kind:'text', text: String(text || '').slice(0, 4000), bot:true, roleAs:'ИИ · помощник', aiWho: who || null, asRole: low, files:[], errandNo: aiNo }, { journal:false }),
      ...(logged ? [] : [Live.add('errands', { no: aiNo || (String(text).match(/П-\d{4}-\d{4}/) || [null])[0], q: q.slice(0, 300), a: String(text || '').slice(0, 1500), st: st || 'выполнено', src:'chat', deliverTo:c.id, ctx:{ section:'chats', ch:c.id } })]),
    ]);
    if (!sum && c.kind !== 'channel' && MONEY_RE.test(q) && !hasMoney(low)) return bot(t('chat.ai_money'), null, 'отклонено по правам');
    let text = sum ? chatSummary(c, low) : null, who = null;
    const A = K.module('ai');
    if (!sum) try {
      if (A && typeof A.reply === 'function'){ const r = await A.reply(q, { src:'chat', ch:c.id, members:c.members.slice(), asRole:low, noPost:true }); text = typeof r === 'string' ? r : (r && r.text) || null; if (r && r.delivered) return; if (r && r.no) aiNo = r.no; if (r && r.serverLogged) logged = true; }
      else if (Live.cap.sample && low === me) text = await K.data.aiAsk(q);
    } catch(e){ text = null; }
    if (!text){ const a = asRole(low, () => K.data.answer(q)) || []; who = a[0] || null; text = a[1] || t('chat.ai_fail'); }
    if (low !== me && c.kind !== 'channel') text += '\n' + t('chat.ai_rights', { r: rn(low) });
    return bot(text, who, /отклонено/.test(text) ? 'отклонено по правам' : 'выполнено');
  }
  function chatSummary(c, low){
    const today = dayKey(Date.now()), L = liveMsgs(c).filter(m => m.kind !== 'system' && dayKey(m.ts) === today), all = [...c.world, ...L];
    const authors = [...new Set(all.map(m => m.world || m.bot ? whoOf(m).split(' · ')[0] : rn(m.role)))];
    const files = L.reduce((s, m) => s + (m.files || []).length, 0), tasks = all.filter(m => taskOf(m)).length, last = all.filter(m => !m.bot && !AI_RE.test(m.text || '')).pop();
    let s = t('chat.ai_sum', { name: chatTitle(c), d: I.date(K.RNG.anchor), n: all.length, a: authors.length, who: authors.length ? ' (' + authors.slice(0, 4).join(', ') + ')' : '', f: files, p: c.pinned.length, k: tasks });
    if (last) s += t('chat.ai_sum_last', { x: snip(last.text, 120) });
    s += '\n' + asRole(low, () => K.data.morningSummary(K.RNG.anchor));
    return s;
  }

  // ---------- вложения: файлы, фото (сжатие), видео, голос ----------
  function compressImage(file){
    return new Promise(res => {
      let url = null;
      try { url = URL.createObjectURL(file); } catch(e){ return res({ file, w:null, h:null }); }
      const img = new Image();
      img.onerror = () => { URL.revokeObjectURL(url); res({ file, w:null, h:null }); };
      img.onload = () => {
        const w = img.naturalWidth, h = img.naturalHeight, k = Math.min(1, 1600 / Math.max(w, h, 1));
        if (k === 1 && file.size <= 1.5 * MB){ URL.revokeObjectURL(url); return res({ file, w, h }); }
        const cw = Math.max(1, Math.round(w * k)), chh = Math.max(1, Math.round(h * k)), cv = document.createElement('canvas');
        cv.width = cw; cv.height = chh;
        try { cv.getContext('2d').drawImage(img, 0, 0, cw, chh); } catch(e){ URL.revokeObjectURL(url); return res({ file, w, h }); }
        URL.revokeObjectURL(url);
        cv.toBlob(b => res(b ? { file: new File([b], String(file.name || 'photo').replace(/\.[^.]+$/, '') + '.jpg', { type:'image/jpeg' }), w:cw, h:chh } : { file, w, h }), 'image/jpeg', 0.85);
      };
      img.src = url;
    });
  }
  function mediaMeta(file){
    return new Promise(res => {
      let url = null, done = false; const fin = v => { if (done) return; done = true; if (url) URL.revokeObjectURL(url); res(v); };
      try { url = URL.createObjectURL(file); } catch(e){ return fin({ dur:null }); }
      const v = document.createElement('video'); v.preload = 'metadata'; v.muted = true;
      v.onloadedmetadata = () => fin({ dur: isFinite(v.duration) ? Math.round(v.duration) : null, w: v.videoWidth || null, h: v.videoHeight || null });
      v.onerror = () => fin({ dur:null }); setTimeout(() => fin({ dur:null }), 4000); v.src = url;
    });
  }
  async function prepFile(f0, extra){
    let f = f0, w = null, h = null, dur = extra.dur ?? null;
    const kind = FS.kindOf(f.type, f.name);
    if (kind === 'image'){ const r = await compressImage(f); f = r.file; w = r.w; h = r.h; }
    else if (kind === 'video'){
      if (f.size > 25 * MB) throw { message: t('chat.file_big', { n: f.name, mb: 25 }) };
      const md = extra.dur != null ? { dur: extra.dur } : await mediaMeta(f);
      if (md.dur != null && md.dur > 61) throw { message: t('chat.video_long') };
      dur = md.dur; w = md.w || null; h = md.h || null;
    } else if (kind !== 'audio' && f.size > 15 * MB) throw { message: t('chat.file_big', { n: f.name, mb: 15 }) };
    return { f, w, h, dur };
  }
  async function sendFiles(c, list, extra = {}){
    if (!c || !list || !list.length) return;
    const block = postBlock(c); if (block){ setFlash(block); return; }
    if (list.length > 10){ setFlash(t('chat.max_files')); list = list.slice(0, 10); }
    ST.busy = true; setFlash(t('chat.uploading'), 'info');
    const metas = []; let warn = null, err = null;
    for (const f0 of list){
      try {
        const p = await prepFile(f0, extra);
        const m = await FS.put(p.f, { attachedTo:[{ kind:'chat', id:c.id }], folder:'chat', dur:p.dur, w:p.w, h:p.h });
        metas.push({ id:m.id || null, name:m.name, mime:m.mime, size:m.size, kind:m.kind, dur:m.dur, w:m.w, h:m.h, store:m.store, ref:m.ref, assetId:m.assetId || null, localOnly:!!m.localOnly });
        if (m.warn) warn = m.warn;
      } catch(e){ err = (e && e.message) || t('files.no_storage'); }
    }
    ST.busy = false; setFlash(err || warn, err ? 'bad' : 'info');
    if (!metas.length) return;
    let cap = '';
    if (!extra.noCaption){ const inp = document.getElementById('chatIn'); cap = inp && !ST.editing ? inp.value.trim() : ''; if (cap){ inp.value = ''; ST.drafts[c.id] = ''; } }
    const kinds = new Set(metas.map(x => x.kind)), k0 = metas[0].kind;
    const kind = kinds.size === 1 && ['image', 'video', 'audio'].includes(k0) ? k0 : 'file';
    const replyTo = ST.reply; ST.reply = null; ST.stick = true;
    await Live.add('chat', { ch:c.id, text: cap.slice(0, 4000), kind, files: metas, replyTo, mentions: mentionsIn(cap, c), readBy:{ [meName()]: Date.now() } });
  }
  const pickMime = list => { try { return list.find(m => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || ''; } catch(e){ return ''; } };
  const recSupported = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && typeof window.MediaRecorder === 'function');
  const mediaErr = (e, kind) => (e && (e.name === 'NotAllowedError' || e.name === 'SecurityError')) ? t(kind === 'audio' ? 'chat.mic_denied' : 'chat.cam_denied') : t(kind === 'audio' ? 'chat.mic_none' : 'chat.cam_none');
  async function startVoice(c){
    if (ST.rec){ setFlash(t('chat.rec_busy'), 'info'); return; }
    const block = postBlock(c); if (block){ setFlash(block); return; }
    if (!recSupported()){ setFlash(t('chat.rec_unsupported')); return; }
    let stream = null;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio:true }); } catch(e){ setFlash(mediaErr(e, 'audio')); return; }
    let mr = null; const mime = pickMime(['audio/webm', 'audio/mp4', 'audio/ogg']);
    try { mr = new MediaRecorder(stream, mime ? { mimeType:mime } : undefined); } catch(e){ stream.getTracks().forEach(x => x.stop()); setFlash(t('chat.rec_unsupported')); return; }
    const rec = ST.rec = { kind:'audio', mr, stream, chunks:[], t0: Date.now(), ch: c.id, cancel:false };
    mr.ondataavailable = e => { if (e.data && e.data.size) rec.chunks.push(e.data); };
    mr.onstop = () => finishVoice(rec);
    try { mr.start(250); } catch(e){ stream.getTracks().forEach(x => x.stop()); ST.rec = null; setFlash(t('chat.rec_unsupported')); return; }
    rec.max = setTimeout(() => stopVoice(false), 180000);
    rerender();
  }
  function stopVoice(cancel){ const r = ST.rec; if (!r) return; r.cancel = !!cancel; try { if (r.mr.state !== 'inactive') r.mr.stop(); else finishVoice(r); } catch(e){ finishVoice(r); } }
  async function finishVoice(r){
    if (r.done) return; r.done = true; clearTimeout(r.max);
    try { r.stream.getTracks().forEach(x => x.stop()); } catch(e){}
    if (ST.rec === r) ST.rec = null;
    const dur = Math.max(1, Math.round((Date.now() - r.t0) / 1000));
    if (r.cancel || !r.chunks.length){ rerender(); return; }
    const type = String(r.mr.mimeType || r.chunks[0].type || 'audio/webm').split(';')[0], ext = /mp4/.test(type) ? 'm4a' : (/ogg/.test(type) ? 'ogg' : 'webm');
    const d = new Date(), name = `voice-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}.${ext}`;
    await sendFiles(findChat(r.ch), [new File([new Blob(r.chunks, { type })], name, { type })], { kind:'audio', dur, noCaption:true });
    rerender();
  }

  // ---------- отображение сообщения ----------
  function fmtText(text, c){
    let s = esc(text);
    c.members.filter(n => n !== AI_ID).forEach(n => { [rn(n), n].forEach(x => { const e = esc('@' + x); if (s.includes(e)) s = s.split(e).join(`<mark class="ch-at">${e}</mark>`); }); });
    if (ST.fq){ const q = esc(ST.fq); const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'); s = s.replace(/(<[^>]*>)|([^<]+)/g, (m0, tag, txt) => tag || txt.replace(re, x => `<mark>${x}</mark>`)); }
    return s;
  }
  function fileHtml(f){
    const u = urlCache.get(f.ref) || '', a = `data-fstore="${esc(f.store)}" data-fref="${esc(f.ref)}" data-fasset="${esc(f.assetId || '')}"`;
    if (f.kind === 'image') return `<button type="button" class="ch-img" data-view="${esc(f.ref)}" aria-label="${esc(t('chat.open_full') + ': ' + f.name)}"><img ${a} ${u ? `src="${esc(u)}"` : ''} alt="${esc(f.name)}" ${f.w && f.h ? `width="${f.w}" height="${f.h}"` : ''} loading="lazy"></button>`;
    if (f.kind === 'video') return `<video class="ch-vid" ${a} ${u ? `src="${esc(u)}"` : ''} controls preload="metadata" playsinline aria-label="${esc(t('chat.video_msg'))}"></video>`;
    if (f.kind === 'audio') return `<div class="ch-aud"><span aria-hidden="true">🎤</span><audio ${a} ${u ? `src="${esc(u)}"` : ''} controls preload="metadata" aria-label="${esc(t('chat.voice_msg') + ' ' + durTxt(f.dur))}"></audio><small>${durTxt(f.dur)}</small></div>`;
    return `<a class="ch-file" ${a} ${u ? `href="${esc(u)}"` : ''} download="${esc(f.name)}"><span aria-hidden="true">📄</span><span><b>${esc(f.name)}</b><small>${sizeTxt(f.size || 0)}</small></span></a>`;
  }
  function filesBlock(m){
    const F = m.files || []; if (!F.length) return '';
    return `<div class="ch-files">${F.map(fileHtml).join('')}</div><small class="ch-demo">${esc(t('files.demo'))}${F.some(f => f.localOnly) ? ' · ' + esc(t('files.local_only')) : ''}</small>`;
  }
  function msgActions(m, c, mine){
    const A = [], live = !m.world, ro = Live.data.ro;
    if (!ro && !postBlock(c)) A.push(`<button type="button" class="ch-a" data-reply="${esc(m.id)}">${esc(t('chat.reply'))}</button>`);
    if (live && mine && !postBlock(c) && Live.canEdit(m)) A.push(`<button type="button" class="ch-a" data-edit="${esc(m.id)}">${esc(t('chat.edit'))} · <span data-edl="${m.ts}">${mmss(Live.EDIT_MS - (Date.now() - m.ts))}</span></button>`);
    if (live && canPin(c)) A.push(`<button type="button" class="ch-a" data-pin="${esc(m.id)}">${esc(t(c.pinned.includes(m.id) ? 'chat.unpin' : 'chat.pin'))}</button>`);
    const tk = taskOf(m);
    if (tk) A.push(`<a class="ch-tlink" href="#tasks">${esc(t('chat.task_made', { no: tk.no || '' }))}</a>`);
    else if (!ro && myRole().rt.tasks !== '·') A.push(ST.tasking[m.id] ? `<span class="ch-a">${esc(t('chat.task_wait'))}</span>` : `<button type="button" class="ch-a lnk mkt" data-task="${esc(m.id)}">${esc(t('chat.to_task'))}</button>`);
    return A.join('');
  }
  function msgHtml(m, c, unread){
    if (m.kind === 'system') return `<div class="ch-sys" id="m-${esc(m.id)}" role="note">${esc(sysText(m))} · ${esc(timeOf(m))}</div>`;
    const mine = isMine(m), cls = ['cm', 'ch-m', mine ? 'mine' : '', m.bot ? 'bot' : '', m.world ? 'world' : 'live', c.pinned.includes(m.id) ? 'pinned' : ''].filter(Boolean).join(' ');
    const q = m.replyTo ? msgById(c, m.replyTo) : null;
    const quote = m.replyTo ? `<button type="button" class="ch-quote" data-jump="${esc(m.replyTo)}"><b>${esc(q ? whoOf(q) : '…')}</b><span>${esc(q ? snip(q.text || ((q.files || [])[0] || {}).name, 80) : '')}</span></button>` : '';
    const ed = m.editedAt ? `<button type="button" class="ch-ed" data-vers="${esc(m.id)}">${esc(t('chat.edited', { t: K.fmt.tOf(m.editedAt) }))}</button>` : '';
    return `<div class="${cls}" id="m-${esc(m.id)}" data-mid="${esc(m.id)}"${unread ? ' data-unread="1"' : ''}>${quote}<div class="ch-mh"><b>${esc(whoOf(m))}</b><span class="t">${esc(timeOf(m))}</span></div>${filesBlock(m)}${m.text ? `<p>${fmtText(m.text, c)}</p>` : ''}<div class="ch-mf">${ed}${mine && !m.world ? tick(m, c) : ''}<span class="ch-acts">${msgActions(m, c, mine)}</span></div></div>`;
  }

  // ---------- лента ----------
  function feedList(c){
    const L = liveMsgs(c).slice().sort((a, b) => a.ts - b.ts);
    let all = [...c.world, ...L];
    if (ST.fq){ const q = ST.fq.toLowerCase(); all = all.filter(m => m.kind !== 'system' && (String(m.text || '').toLowerCase().includes(q) || (m.files || []).some(f => String(f.name).toLowerCase().includes(q)))); }
    return all;
  }
  function feedHtml(c){
    const all = feedList(c), lim = ST.lim[c.id] || PAGE, shown = all.slice(-lim), me = meName();
    if (!ST.snap || ST.snap.ch !== c.id){ const fu = liveMsgs(c).find(m => m.kind !== 'system' && !isMine(m, me) && !(m.readBy || {})[me]); ST.snap = { ch:c.id, first: fu ? fu.id : null }; }
    const out = [];
    if (all.length > shown.length) out.push(`<button type="button" class="btn-sec ch-more" data-more="1">${esc(t('chat.more', { n: Math.min(PAGE, all.length - shown.length) }))}</button>`);
    let lastDay = null;
    shown.forEach(m => {
      const dk = m.world ? 'w' : (m.day != null ? 'd' + m.day : dayKey(m.ts));   // М6: день записи — «Данные на» (m.day), время — реальное
      if (dk !== lastDay){ out.push(`<div class="ch-day"><span>${esc(m.world ? t('chat.world_hist', { d: I.date(K.RNG.anchor) }) : (m.day != null ? I.date(m.day) : dayLabel(m.ts)))}</span></div>`); lastDay = dk; }
      if (ST.snap.first === m.id && !ST.fq) out.push(`<div class="ch-new" role="separator"><span>${esc(t('chat.new_msgs'))}</span></div>`);
      out.push(msgHtml(m, c, !m.world && m.kind !== 'system' && !isMine(m, me) && !(m.readBy || {})[me]));
    });
    if (!all.length) out.push(`<div class="empty">${esc(ST.fq ? t('chat.none_found') : t('chat.empty'))}</div>`);
    return out.join('');
  }
  function pinBar(c){
    const P = c.pinned.map(id => msgById(c, id)).filter(Boolean); if (!P.length) return '';
    return `<div class="ch-pins" aria-label="${esc(t('chat.pinned'))}">${P.map(m => `<button type="button" class="ch-pin" data-jump="${esc(m.id)}"><span aria-hidden="true">📌</span><b>${esc(whoOf(m))}:</b> ${esc(snip(m.text || ((m.files || [])[0] || {}).name, 70))}</button>`).join('')}</div>`;
  }
  function composer(c){
    const block = postBlock(c);
    if (block) return `<div class="ch-comp"><p class="banner-info ch-block">${esc(block)}</p></div>`;
    const rep = ST.reply ? msgById(c, ST.reply) : null, edm = ST.editing ? Live.byId('chat', ST.editing) : null;
    const bars = [];
    if (rep) bars.push(`<div class="ch-bar"><span>↩ ${esc(t('chat.replying', { w: whoOf(rep) }))}: <i>${esc(snip(rep.text, 60))}</i></span><button type="button" class="btn-quiet" data-cancel="reply" aria-label="${esc(t('chat.cancel'))}">×</button></div>`);
    if (edm) bars.push(`<div class="ch-bar ed"><span>✎ ${esc(t('chat.editing', { s: '' }))}<b data-edl="${edm.ts}">${mmss(Live.EDIT_MS - (Date.now() - edm.ts))}</b></span><button type="button" class="btn-quiet" data-cancel="edit" aria-label="${esc(t('chat.cancel'))}">×</button></div>`);
    if (ST.rec && ST.rec.ch === c.id) bars.push(`<div class="ch-bar rec" role="status"><span><i class="ch-dot" aria-hidden="true"></i>${esc(t('chat.rec'))} <b id="chRecT">${mmss(Date.now() - ST.rec.t0)}</b> / 3:00</span><span><button type="button" class="btn-quiet" data-rec="cancel">${esc(t('chat.rec_cancel'))}</button><button type="button" class="btn-accent" data-rec="stop">${esc(t('chat.rec_stop'))}</button></span></div>`);
    const fl = ST.flash;
    return `<div class="ch-comp">${bars.join('')}<p id="chFlash" class="ch-flash ${fl ? 'on ' + fl.kind : ''}" role="status" aria-live="polite">${fl ? esc(fl.text) : ''}</p><div id="chMent" class="ch-ment" role="listbox" aria-label="${esc(t('chat.mention'))}" hidden></div>
      <form id="chatForm" class="ch-form" data-ch="${esc(c.id)}" autocomplete="off">
        <button type="button" class="ch-ib" data-pick="chFile" aria-label="${esc(t('chat.attach'))}" title="${esc(t('chat.attach'))}">📎</button>
        <button type="button" class="ch-ib" data-pick="chCam" aria-label="${esc(t('chat.camera'))}" title="${esc(t('chat.camera'))}">📷</button>
        <textarea id="chatIn" rows="1" maxlength="4000" aria-label="${esc(t('chat.input'))}" placeholder="${esc(t(c.ai ? 'chat.ph_ai' : 'chat.ph'))}">${esc(ST.drafts[c.id] || '')}</textarea>
        <button type="button" class="ch-ib" data-voice="1" aria-label="${esc(t('chat.voice'))}" title="${esc(t('chat.voice'))}" ${ST.rec ? 'aria-pressed="true"' : ''}>🎤</button>
        <button type="button" class="ch-ib ch-hm" data-vrec="1" aria-label="${esc(t('chat.video_rec'))}" title="${esc(t('chat.video_rec'))}">🎥</button>
        <button type="submit" class="btn-accent ch-send" aria-label="${esc(t('chat.send'))}" title="${esc(t('chat.send'))}">➤</button>
      </form>
      <input type="file" id="chFile" multiple hidden tabindex="-1"><input type="file" id="chCam" accept="image/*,video/*" capture="environment" hidden tabindex="-1"></div>`;
  }
  function headHtml(c){
    const rl = myRole(), meta = c.kind === 'channel' ? `${t('chat.kind.channel')} · ${c.who}` : `${t('chat.kind.' + c.kind)} · ${c.members.filter(n => n !== AI_ID).map(rn).join(', ')}${isAdmin(c, rl) && c.kind === 'group' ? ' · ' + t('chat.admin_short') : ''}`;
    const nf = ST.fq ? feedList(c).length : null;
    return `<header class="ch-head"><button type="button" class="btn-quiet ch-back" data-chback="1">${esc(t('chat.back'))}</button>
      <div class="ch-ttl"><b>${esc(chatTitle(c))}</b><small>${esc(meta)}</small></div>
      <div class="ch-hs"><input type="search" id="chFq" value="${esc(ST.fq)}" placeholder="${esc(t('chat.search_in'))}" aria-label="${esc(t('chat.search_in'))}">${nf != null ? `<small>${esc(t('chat.found_in', { n: nf }))}</small>` : ''}</div>
      <button type="button" class="btn-sec ch-menu" data-chmenu="1" aria-label="${esc(t('chat.menu'))}" title="${esc(t('chat.menu'))}">···</button></header>`;
  }

  // ---------- список чатов ----------
  const avatar = c => { const r = c.kind === 'direct' ? roleBy(c.members.find(m => m !== meName()) || '') : null; const txt = c.kind === 'channel' ? '#' : (c.ai ? '✦' : (r ? r.short : (chatTitle(c)[0] || '·').toUpperCase())); return `<span class="ch-av k-${c.kind} c${c.kind === 'group' ? c.color : ''}" aria-hidden="true">${esc(txt)}</span>`; };
  function rowHtml(c, cur){
    const last = c.last, prev = last ? (last.kind === 'system' ? sysText(last) : (last.text ? snip(last.text, 60) : t('chat.files_n', { n: (last.files || []).length }))) : t('chat.empty');
    const who = last && last.kind !== 'system' ? whoOf(last) + ': ' : '';
    return `<li><button type="button" class="ch-row${cur && cur.id === c.id ? ' on' : ''}" data-chopen="${esc(c.id)}" ${cur && cur.id === c.id ? 'aria-current="true"' : ''}>${avatar(c)}<span class="ch-rb"><span class="ch-rn"><b>${c.pinnedChat ? '📌 ' : ''}${esc(chatTitle(c))}</b><small>${last ? esc(timeOf(last)) : ''}</small></span><span class="ch-rp"><small>${esc(who + prev)}</small>${c.ment ? `<span class="ch-bdg at" title="${esc(t('chat.ment_t', { n: c.ment }))}">@${c.ment}</span>` : ''}${c.unread ? `<span class="ch-bdg" title="${esc(t('chat.unread_t', { n: c.unread }))}">${c.unread}</span>` : ''}</span></span></button></li>`;
  }
  function hitsHtml(list){
    const q = ST.list.trim().toLowerCase(); if (q.length < 2) return '';
    const hits = [];
    for (const c of list){ for (const m of [...c.world, ...liveMsgs(c)]) if (m.kind !== 'system' && String(m.text || '').toLowerCase().includes(q)) hits.push([c, m]); }
    const re = new RegExp(esc(ST.list.trim()).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    return `<div class="ch-hits"><h3>${esc(t('chat.found', { n: hits.length }))}</h3>${hits.slice(-30).reverse().map(([c, m]) => `<button type="button" class="ch-hit" data-chopen="${esc(c.id)}" data-jump="${esc(m.id)}"><b>${esc(chatTitle(c))}</b><small>${esc(whoOf(m))} · ${esc(timeOf(m))}</small><span>${esc(snip(m.text, 120)).replace(re, x => `<mark>${x}</mark>`)}</span></button>`).join('') || `<p class="note">${esc(t('chat.none_found'))}</p>`}</div>`;
  }
  function sideHtml(list, cur, tab){
    const rl = myRole(), TABS = [['', 'all'], ['groups', 'groups'], ['direct', 'direct'], ['channels', 'channels']];
    const kindOf = { groups:'group', direct:'direct', channels:'channel' }[tab];
    const q = ST.list.trim().toLowerCase();
    const shown = list.filter(c => (!kindOf || c.kind === kindOf) && (!q || chatTitle(c).toLowerCase().includes(q)));
    return `<aside class="card ch-side" aria-label="${esc(t('chat.list'))}">
      <div class="ch-tools"><input type="search" id="chQ" value="${esc(ST.list)}" placeholder="${esc(t('chat.search_all'))}" aria-label="${esc(t('chat.search_all'))}">
        ${canCreate(rl) ? `<span class="ch-new-b"><button type="button" class="btn-sec" data-newgroup="1">${esc(t('chat.new_group'))}</button><button type="button" class="btn-sec" data-newdm="1">${esc(t('chat.write'))}</button></span>` : ''}</div>
      <nav class="ch-tabs" aria-label="${esc(t('chat.tabs'))}">${TABS.map(([k, n]) => `<a href="#chats${k ? '-' + k : ''}" class="${(tab || '') === k ? 'on' : ''}" ${(tab || '') === k ? 'aria-current="page"' : ''}>${esc(t('chat.tab.' + n))}</a>`).join('')}</nav>
      ${hitsHtml(list)}
      <ul class="ch-list">${shown.map(c => rowHtml(c, cur)).join('') || `<li class="note">${esc(t('chat.no_chats'))}</li>`}</ul></aside>`;
  }

  // ---------- раздел ----------
  function section(tab){
    const rl = myRole();
    tab = ['groups', 'direct', 'channels'].includes(tab) ? tab : '';
    const list = visibleChats(rl);
    const sub = esc(t('chat.sub'));
    if (!list.length) return K.ui.h1(t('chat.title'), sub) + `<section class="card"><div class="empty">${esc(t('chat.no_role'))}</div></section>`;
    let cur = list.find(c => c.id === K.S.chat) || null;
    if (!cur){ const first = (K.roles.CH_OF[rl.id] || [])[0]; cur = list.find(c => c.id === first) || list[0]; }
    const main = `<section class="card ch-main" aria-label="${esc(t('chat.feed'))}">${headHtml(cur)}${pinBar(cur)}<div class="ch-feed" id="cmsgs" data-ch="${esc(cur.id)}" role="log" tabindex="0" aria-label="${esc(chatTitle(cur))}">${feedHtml(cur)}</div>${composer(cur)}</section>`;
    return K.ui.h1(t('chat.title'), sub) + `<div class="ch-wrap v-${ST.view}">${sideHtml(list, cur, tab)}${main}</div><p class="lnote">${esc(Live.note())}</p>`;
  }
  function rerender(){
    const a = document.activeElement, id = a && a.id, s = a && typeof a.selectionStart === 'number' ? a.selectionStart : null;
    K.render();
    if (id){ const el = document.getElementById(id); if (el && el !== document.activeElement){ el.focus({ preventScroll:true }); if (s != null) try { el.setSelectionRange(s, s); } catch(e){} } }
  }
  function openChat(id, jump){
    const changed = K.S.chat !== id;
    K.set({ chat:id }); ST.view = 'feed'; ST.jump = jump || null;
    if (changed){ ST.reply = null; ST.editing = null; ST.fq = ''; ST.snap = null; }
    if (jump){ const c = findChat(id), all = c ? feedList(c) : [], k = all.findIndex(m => m.id === jump); if (k >= 0) ST.lim[id] = Math.max(ST.lim[id] || PAGE, all.length - k); }
    if (!/^#chats/.test(location.hash)) location.hash = '#chats'; else rerender();
  }

  // ---------- модальные окна: новая группа, личный чат, меню чата, версии, фото, видео ----------
  const roleChecks = (names, name) => `<div class="ch-checks">${names.map(n => `<label><input type="checkbox" name="${name}" value="${esc(n)}"> ${esc(rn(n))}</label>`).join('')}</div>`;
  function openNewGroup(){
    const rl = myRole(), pool = contacts(rl);
    const html = `<form id="chNG" class="ch-mform" novalidate><label>${esc(t('chat.ng.name'))}<input id="chNGName" maxlength="80" required placeholder="${esc(t('chat.ng.name_ph'))}"></label>
      <fieldset><legend>${esc(t('chat.ng.members'))}</legend>${roleChecks(pool, 'm')}</fieldset>
      ${rl.rt.chats === 'С' ? `<p class="note">${esc(t('chat.ng.only_contacts', { r: rn(rl.name) }))}</p>` : ''}<p class="note">${esc(t('chat.ng.you_admin'))}</p>
      <p class="ch-err" id="chNGErr" role="alert"></p><button type="submit" class="btn-primary">${esc(t('chat.ng.create'))}</button></form>`;
    K.modal.open(html, t('chat.ng.title'), { focus:'#chNGName', onOpen: body => body.querySelector('#chNG').addEventListener('submit', async e => {
      e.preventDefault();
      const name = body.querySelector('#chNGName').value.replace(/\d{6,}/g, '').trim().slice(0, 80), sel = [...body.querySelectorAll('input[name=m]:checked')].map(x => x.value).filter(n => pool.includes(n)), err = body.querySelector('#chNGErr');
      if (!name){ err.textContent = t('chat.ng.err_name'); return; }
      if (!sel.length){ err.textContent = t('chat.ng.err_members'); return; }
      if (Live.get('chats').filter(x => x.kind === 'group').length >= Live.LIMITS.chats){ err.textContent = t('chat.ng.err_limit'); return; }
      const me = meName(), row = await Live.add('chats', { kind:'group', name, members:[me, ...sel], admins:[me], createdBy:me, pinned:[], closed:false, color: 1 + (name.length % 7) });
      if (!row){ err.textContent = Live.data.err || t('chat.ro'); return; }
      await sysMsg(row.id, 'created', { who:me, name }); await sysMsg(row.id, 'added', { who:me, whom:sel });
      K.modal.close(true); openChat(row.id);
    }) });
  }
  function openNewDirect(){
    const rl = myRole(), pool = [...contacts(rl), AI_ID];
    const html = `<p class="note">${esc(t('chat.dm.hint'))}</p><div class="ch-dmlist">${pool.map(n => `<button type="button" class="btn-sec" data-dm="${esc(n)}">${esc(rn(n))}</button>`).join('')}</div>${rl.rt.chats === 'С' ? `<p class="note">${esc(t('chat.ng.only_contacts', { r: rn(rl.name) }))}</p>` : ''}`;
    K.modal.open(html, t('chat.dm.title'), { onOpen: body => body.querySelectorAll('[data-dm]').forEach(b => b.addEventListener('click', async () => {
      const me = meName(), other = b.dataset.dm; if (!pool.includes(other)) return;
      const ex = Live.get('chats').find(x => x.kind === 'direct' && (x.members || []).length === 2 && x.members.includes(me) && x.members.includes(other));
      let id = ex && ex.id;
      if (!id){ const row = await Live.add('chats', { kind:'direct', name:'', members:[me, other], admins:[], createdBy:me, pinned:[], closed:false }); if (!row) return; id = row.id; await sysMsg(id, 'direct', { who:me }); }
      K.modal.close(true); openChat(id);
    })) });
  }
  function chatFiles(c){ return liveMsgs(c).flatMap(m => (m.files || []).map(f => [m, f])); }
  function menuHtml(c){
    const rl = myRole(), adm = c.kind === 'group' && isAdmin(c, rl) && !Live.data.ro, P = [];
    const mem = c.members;
    P.push(`<h3>${esc(c.kind === 'channel' ? t('chat.mn.who') : t('chat.mn.members_n', { n: mem.filter(n => n !== AI_ID).length }))}</h3>${c.kind === 'channel' ? `<p class="note">${esc(c.who)}</p>` : ''}<ul class="ch-mlist">${mem.map(n => `<li><span>${esc(rn(n))}${c.admins.includes(n) ? ` <span class="pill s s-info">${esc(t('chat.mn.admin'))}</span>` : ''}${n === rl.name ? ` <small>(${esc(t('chat.you'))})</small>` : ''}</span>${adm && n !== rl.name && c.kind === 'group' ? `<span>${c.admins.includes(n) ? '' : `<button type="button" class="btn-quiet" data-madmin="${esc(n)}">${esc(t('chat.mn.make_admin'))}</button>`}<button type="button" class="btn-quiet" data-mremove="${esc(n)}">${esc(t('chat.mn.remove'))}</button></span>` : ''}</li>`).join('')}</ul>`);
    if (adm){
      const add = contacts(rl).filter(n => !c.members.includes(n));
      P.push(`<h3>${esc(t('chat.mn.add'))}</h3>${add.length ? `<form id="chMAdd">${roleChecks(add, 'a')}<button type="submit" class="btn-sec">${esc(t('chat.mn.add_btn'))}</button></form>` : `<p class="note">${esc(t('chat.mn.no_add'))}</p>`}`);
      P.push(`<h3>${esc(t('chat.mn.manage'))}</h3><form id="chMRen" class="ch-mform row"><label class="sr">${esc(t('chat.mn.rename'))}</label><input id="chMName" maxlength="80" value="${esc(c.name)}" aria-label="${esc(t('chat.mn.rename'))}"><button type="submit" class="btn-sec">${esc(t('chat.mn.rename_btn'))}</button></form><p class="ch-err" id="chMErr" role="alert"></p>
        <p><button type="button" class="btn-sec" data-mclose="1">${esc(t(c.closed ? 'chat.mn.reopen' : 'chat.mn.close'))}</button></p>`);
    }
    const pins = c.pinned.map(id => msgById(c, id)).filter(Boolean);
    P.push(`<h3>${esc(t('chat.mn.pinned'))}</h3>${pins.length ? `<ul class="ch-mlist">${pins.map(m => `<li><button type="button" class="lnk" data-mjump="${esc(m.id)}">${esc(whoOf(m))}: ${esc(snip(m.text, 80))}</button></li>`).join('')}</ul>` : `<p class="note">${esc(t('chat.mn.none'))}</p>`}`);
    const F = chatFiles(c);
    P.push(`<h3>${esc(t('chat.mn.files'))}</h3>${F.length ? `<ul class="ch-mlist">${F.slice(-30).reverse().map(([m, f]) => `<li><a class="ch-file" data-fstore="${esc(f.store)}" data-fref="${esc(f.ref)}" data-fasset="${esc(f.assetId || '')}" download="${esc(f.name)}"><span><b>${esc(f.name)}</b><small>${esc(whoOf(m))} · ${esc(timeOf(m))} · ${sizeTxt(f.size || 0)}</small></span></a></li>`).join('')}</ul>` : `<p class="note">${esc(t('chat.mn.none'))}</p>`}`);
    const pinnedChat = chatPins().includes(c.id);
    P.push(`<p class="ch-mbtns">${!Live.data.ro && rl.rt.tasks !== '·' ? `<button type="button" class="btn-sec" data-mtask="1">${esc(t('chat.mn.task'))}</button>` : ''}<button type="button" class="btn-sec" data-mpinchat="1">${esc(t(pinnedChat ? 'chat.mn.unpin_chat' : 'chat.mn.pin_chat'))}</button>${c.kind === 'group' && c.members.includes(rl.name) && !Live.data.ro ? `<button type="button" class="btn-sec" data-mleave="1">${esc(t('chat.mn.leave'))}</button>` : ''}</p><p class="note" id="chMNote" role="status">${esc(t('chat.mn.nodelete'))}</p>`);
    return `<div class="ch-menuw">${P.join('')}</div>`;
  }
  async function groupPatch(c, patch, sys, action){
    const ok = await Live.update('chats', c.row.id, patch, { action });
    if (ok !== false && sys) await sysMsg(c.id, sys.k, sys);
    return ok;
  }
  function openMenu(id){
    const c = findChat(id); if (!c) return;
    if (K.modal.isOpen) K.modal.close(true);
    const me = meName(), again = () => { K.modal.close(true); const c2 = findChat(id); if (c2 && canView(c2, myRole())) openMenu(id); };
    K.modal.open(menuHtml(c), chatTitle(c), { wide:false, onClose: () => setTimeout(rerender, 0), onOpen: body => {
      resolveFiles(body);
      body.querySelectorAll('[data-madmin]').forEach(b => b.addEventListener('click', async () => { const n = b.dataset.madmin; await groupPatch(c, { admins: [...new Set([...c.admins, n])] }, { k:'admin', who:me, whom:[n] }, t('chat.j.members')); again(); }));
      body.querySelectorAll('[data-mremove]').forEach(b => b.addEventListener('click', async () => { const n = b.dataset.mremove; await groupPatch(c, { members: c.members.filter(x => x !== n), admins: c.admins.filter(x => x !== n) }, { k:'removed', who:me, whom:[n] }, t('chat.j.members')); again(); }));
      const fa = body.querySelector('#chMAdd'); if (fa) fa.addEventListener('submit', async e => { e.preventDefault(); const sel = [...fa.querySelectorAll('input[name=a]:checked')].map(x => x.value).filter(n => contacts(myRole()).includes(n)); if (!sel.length) return; await groupPatch(c, { members: [...new Set([...c.members, ...sel])].slice(0, 200) }, { k:'added', who:me, whom:sel }, t('chat.j.members')); again(); });
      const fr = body.querySelector('#chMRen'); if (fr) fr.addEventListener('submit', async e => { e.preventDefault(); const name = body.querySelector('#chMName').value.replace(/\d{6,}/g, '').trim().slice(0, 80); if (!name){ body.querySelector('#chMErr').textContent = t('chat.mn.err_rename'); return; } if (name === c.name) return; await groupPatch(c, { name }, { k:'renamed', who:me, name }, t('chat.j.renamed')); again(); });
      const bc = body.querySelector('[data-mclose]'); if (bc) bc.addEventListener('click', async () => { await groupPatch(c, { closed: !c.closed }, { k: c.closed ? 'reopened' : 'closed', who:me }, t(c.closed ? 'chat.j.reopened' : 'chat.j.closed')); again(); });
      body.querySelectorAll('[data-mjump]').forEach(b => b.addEventListener('click', () => { K.modal.close(true); openChat(id, b.dataset.mjump); }));
      const bt = body.querySelector('[data-mtask]'); if (bt) bt.addEventListener('click', async () => { bt.disabled = true; const T = K.module('tasks'), obj = { title: t('chat.task_from_chat', { name: chatTitle(c) }).slice(0, 160), owner: c.kind === 'channel' ? (K.roles.CH_OWNER[c.id] || meName()) : meName(), src:'чат', days:2, status:'в работе', pr:'средний', link:{ kind:'chat', ch:c.id } }; try { await (T && typeof T.quickCreate === 'function' ? T.quickCreate(obj) : K.ui.quickTask(obj)); } catch(e){} const n = body.querySelector('#chMNote'); if (n) n.textContent = t('chat.mn.task_made'); });
      const bp = body.querySelector('[data-mpinchat]'); if (bp) bp.addEventListener('click', () => { const all = lsGet(LS_PINS, {}), mine = all[me] || []; all[me] = mine.includes(id) ? mine.filter(x => x !== id) : [...mine, id]; lsSet(LS_PINS, all); again(); });
      const bl = body.querySelector('[data-mleave]'); if (bl) bl.addEventListener('click', async () => {
        const members = c.members.filter(x => x !== me); let admins = c.admins.filter(x => x !== me);
        if (!admins.length && members.length) admins = [members.find(n => n !== AI_ID) || members[0]];
        await groupPatch(c, { members, admins }, { k:'left', who:me }, t('chat.j.members'));
        K.set({ chat:null }); ST.view = 'list'; K.modal.close(true);
      });
    } });
  }
  function openVersions(id){
    const m = Live.byId('chat', id); if (!m) return;
    const V = [...(m.editHist || []).map((h, i) => [i === 0 ? t('chat.ver_orig') : '', h.ts, h.text]), [t('chat.ver_cur'), m.editedAt, m.text]];
    K.modal.open(`<ol class="ch-vers">${V.map(([lbl, ts, tx]) => `<li><small>${esc(K.fmt.tOf(ts))}${lbl ? ' · ' + esc(lbl) : ''}</small><p>${esc(tx)}</p></li>`).join('')}</ol><p class="note">${esc(t('chat.ver_note'))}</p>`, t('chat.versions'));
  }
  function openImage(ref){
    const u = urlCache.get(ref); if (!u) return;
    K.modal.open(`<img class="ch-full" src="${esc(u)}" alt="">`, t('chat.photo'), { wide:true });
  }
  function openVideoRec(c){
    const block = postBlock(c); if (block){ setFlash(block); return; }
    if (!recSupported()){ setFlash(t('chat.vid_unsupported')); return; }
    const S = { stream:null, mr:null, chunks:[], blob:null, t0:0, timer:0, max:0, dead:false };
    const stopAll = () => { S.dead = true; clearInterval(S.timer); clearTimeout(S.max); try { if (S.mr && S.mr.state !== 'inactive') S.mr.stop(); } catch(e){} if (S.stream) S.stream.getTracks().forEach(x => x.stop()); };
    const html = `<div class="ch-vrec"><video id="chVPrev" muted playsinline autoplay></video><p class="note" id="chVSt" role="status">${esc(t('chat.vrec_wait'))}</p>
      <p class="ch-mbtns"><button type="button" class="btn-accent" id="chVGo" disabled>${esc(t('chat.vrec_start'))}</button><button type="button" class="btn-sec" id="chVSend" hidden>${esc(t('chat.vrec_send'))}</button></p></div>`;
    K.modal.open(html, t('chat.vrec_title'), { onClose: stopAll, onOpen: async body => {
      const v = body.querySelector('#chVPrev'), st = body.querySelector('#chVSt'), go = body.querySelector('#chVGo'), sendB = body.querySelector('#chVSend');
      try { S.stream = await navigator.mediaDevices.getUserMedia({ video:{ width:{ ideal:640 } }, audio:true }); } catch(e){ st.textContent = mediaErr(e, 'video'); return; }
      if (S.dead){ S.stream.getTracks().forEach(x => x.stop()); return; }
      v.srcObject = S.stream; st.textContent = ''; go.disabled = false;
      const stop = () => { try { if (S.mr && S.mr.state !== 'inactive') S.mr.stop(); } catch(e){} };
      go.addEventListener('click', () => {
        if (S.mr && S.mr.state === 'recording'){ stop(); return; }
        S.chunks = []; S.blob = null; sendB.hidden = true; v.srcObject = S.stream; v.muted = true; v.controls = false;
        const mime = pickMime(['video/webm', 'video/mp4']);
        try { S.mr = new MediaRecorder(S.stream, mime ? { mimeType:mime } : undefined); } catch(e){ st.textContent = t('chat.vid_unsupported'); return; }
        S.mr.ondataavailable = e => { if (e.data && e.data.size) S.chunks.push(e.data); };
        S.mr.onstop = () => { clearInterval(S.timer); clearTimeout(S.max); if (S.dead || !S.chunks.length) return; const type = String(S.mr.mimeType || 'video/webm').split(';')[0]; S.blob = new Blob(S.chunks, { type }); S.dur = Math.max(1, Math.round((Date.now() - S.t0) / 1000)); v.srcObject = null; v.src = URL.createObjectURL(S.blob); v.muted = false; v.controls = true; go.textContent = t('chat.vrec_again'); sendB.hidden = false; st.textContent = durTxt(S.dur); };
        S.mr.start(250); S.t0 = Date.now(); go.textContent = t('chat.vrec_stop');
        S.timer = setInterval(() => { st.textContent = mmss(Date.now() - S.t0) + ' / 1:00'; }, 500); S.max = setTimeout(stop, 60000);
      });
      sendB.addEventListener('click', async () => {
        if (!S.blob) return; sendB.disabled = true;
        const type = S.blob.type || 'video/webm', f = new File([S.blob], `video-${Date.now()}.${/mp4/.test(type) ? 'mp4' : 'webm'}`, { type }), dur = S.dur;
        K.modal.close(true); await sendFiles(c, [f], { dur, noCaption:false });
      });
    } });
  }

  // ---------- файлы: адреса из FileStore (IndexedDB / assets / сервер) ----------
  function resolveFiles(root){
    root.querySelectorAll('[data-fref]').forEach(async el => {
      const ref = el.dataset.fref; if (!ref || el.getAttribute(el.tagName === 'A' ? 'href' : 'src')) return;
      let u = urlCache.get(ref);
      if (!u){ try { u = await FS.url({ store: el.dataset.fstore, ref, assetId: el.dataset.fasset || null }); } catch(e){ u = null; } if (u) urlCache.set(ref, u); }
      if (!u){ el.classList.add('na'); el.title = t('chat.file_na'); return; }
      if (el.tagName === 'A') el.href = u; else el.src = u;
    });
  }

  // ---------- подключение событий после отрисовки ----------
  function wireComposer(main, c){
    const f = main.querySelector('#chatForm'), inp = main.querySelector('#chatIn'); if (!f || !inp) return;
    if (ST.fill != null){ inp.value = ST.fill; ST.fill = null; inp.focus(); }
    const grow = () => { inp.style.height = ''; if (inp.value) inp.style.height = Math.min(160, inp.scrollHeight + 2) + 'px'; }; grow();
    f.addEventListener('submit', e => { e.preventDefault(); send(c); });
    inp.addEventListener('input', () => { if (!ST.editing) ST.drafts[c.id] = inp.value; grow(); mentionPopup(inp, c); });
    inp.addEventListener('keydown', e => {
      const pop = document.getElementById('chMent');
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing){ e.preventDefault(); const first = pop && !pop.hidden && pop.querySelector('button'); if (first){ first.click(); return; } send(c); return; }
      if (e.key === 'Escape'){ if (pop && !pop.hidden){ closeMentions(); e.preventDefault(); return; } if (ST.reply || ST.editing){ e.preventDefault(); e.stopPropagation(); ST.reply = null; if (ST.editing){ ST.editing = null; inp.value = ST.drafts[c.id] || ''; } rerender(); } return; }
      if (e.key === 'ArrowUp' && !inp.value){ const m = liveMsgs(c).filter(x => isMine(x) && Live.canEdit(x)).pop(); if (m){ e.preventDefault(); startEdit(m.id); } }
    });
    main.querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => { const el = document.getElementById(b.dataset.pick); if (el){ el.value = ''; el.click(); } }));
    ['chFile', 'chCam'].forEach(id => { const el = main.querySelector('#' + id); if (el) el.addEventListener('change', () => { const L = [...(el.files || [])]; if (L.length) sendFiles(c, L); }); });
    const vb = main.querySelector('[data-voice]'); if (vb) vb.addEventListener('click', () => { if (ST.rec) stopVoice(false); else startVoice(c); });
    main.querySelectorAll('[data-rec]').forEach(b => b.addEventListener('click', () => stopVoice(b.dataset.rec === 'cancel')));
    const vr = main.querySelector('[data-vrec]'); if (vr) vr.addEventListener('click', () => openVideoRec(c));
    main.querySelectorAll('[data-cancel]').forEach(b => b.addEventListener('click', () => { if (b.dataset.cancel === 'reply') ST.reply = null; else { ST.editing = null; ST.fill = ST.drafts[c.id] || ''; } rerender(); }));
  }
  function mentionPopup(inp, c){
    const pop = document.getElementById('chMent'); if (!pop) return;
    const before = inp.value.slice(0, inp.selectionStart || 0), m = before.match(/(^|\s)@([^\s@]{0,30})$/);
    if (!m){ closeMentions(); return; }
    const q = m[2].toLowerCase(), pool = c.members.filter(n => n !== AI_ID && n !== meName() && (rn(n).toLowerCase().startsWith(q) || n.toLowerCase().startsWith(q))).slice(0, 8);
    if (!pool.length){ closeMentions(); return; }
    pop.innerHTML = pool.map(n => `<button type="button" role="option" data-ment="${esc(n)}">@${esc(rn(n))}</button>`).join(''); pop.hidden = false;
    pop.querySelectorAll('[data-ment]').forEach(b => b.addEventListener('mousedown', e => e.preventDefault()));
    pop.querySelectorAll('[data-ment]').forEach(b => b.addEventListener('click', () => {
      const pos = inp.selectionStart || 0, head = inp.value.slice(0, pos).replace(/@([^\s@]{0,30})$/, '@' + rn(b.dataset.ment) + ' ');
      inp.value = head + inp.value.slice(pos); ST.drafts[c.id] = inp.value; inp.focus(); try { inp.setSelectionRange(head.length, head.length); } catch(e){} closeMentions();
    }));
  }
  function closeMentions(){ const pop = document.getElementById('chMent'); if (pop){ pop.hidden = true; pop.innerHTML = ''; } }
  let qT = 0;
  function wireSide(main){
    main.querySelectorAll('[data-chopen]').forEach(b => b.addEventListener('click', () => openChat(b.dataset.chopen, b.dataset.jump || null)));
    const q = main.querySelector('#chQ'); if (q) q.addEventListener('input', () => { ST.list = q.value.slice(0, 80); clearTimeout(qT); qT = setTimeout(rerender, 180); });
    const fq = main.querySelector('#chFq'); if (fq) fq.addEventListener('input', () => { ST.fq = fq.value.slice(0, 80); clearTimeout(qT); qT = setTimeout(rerender, 180); });
    const ng = main.querySelector('[data-newgroup]'); if (ng) ng.addEventListener('click', openNewGroup);
    const nd = main.querySelector('[data-newdm]'); if (nd) nd.addEventListener('click', openNewDirect);
  }
  function wireFeed(main, c){
    const feed = main.querySelector('#cmsgs'); if (!feed) return;
    feed.addEventListener('click', e => {
      const b = e.target.closest('button, a'); if (!b || !feed.contains(b)) return;
      const d = b.dataset;
      if (d.reply){ ST.reply = d.reply; ST.editing = null; rerender(); const i = document.getElementById('chatIn'); if (i) i.focus(); }
      else if (d.edit) startEdit(d.edit);
      else if (d.pin) togglePin(c, d.pin);
      else if (d.task){ const m = msgById(c, d.task); if (m) toTask(c, m); }
      else if (d.vers) openVersions(d.vers);
      else if (d.view) openImage(d.view);
      else if (d.jump) jumpTo(d.jump, c);
      else if (d.more){ ST.lim[c.id] = (ST.lim[c.id] || PAGE) + PAGE; ST.more = true; rerender(); }
    });
    main.querySelectorAll('.ch-pins [data-jump]').forEach(b => b.addEventListener('click', () => jumpTo(b.dataset.jump, c)));
    const mb = main.querySelector('[data-chmenu]'); if (mb) mb.addEventListener('click', () => openMenu(c.id));
    const bk = main.querySelector('[data-chback]'); if (bk) bk.addEventListener('click', () => { ST.view = 'list'; rerender(); });
  }
  function jumpTo(id, c){
    const el = document.getElementById('m-' + id);
    if (el){ el.scrollIntoView({ block:'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1600); return; }
    openChat(c.id, id);
  }
  function placeScroll(feed){
    const sc = ST.scroll, same = sc && sc.ch === feed.dataset.ch;
    if (ST.jump){ const el = document.getElementById('m-' + ST.jump); ST.jump = null; if (el){ el.scrollIntoView({ block:'center' }); el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1600); return; } }
    if (ST.more && same){ feed.scrollTop = feed.scrollHeight - feed.clientHeight - sc.fromBottom; }
    else if (!same || ST.stick || sc.fromBottom < 40){ const nw = feed.querySelector('.ch-new'); feed.scrollTop = feed.scrollHeight; if (!same && nw) feed.scrollTop = Math.max(0, feed.scrollTop + nw.getBoundingClientRect().top - feed.getBoundingClientRect().top - 40); }
    else feed.scrollTop = sc.top;
    ST.more = false; ST.stick = false;
  }
  function observeRead(feed){
    if (io){ io.disconnect(); io = null; }
    const els = feed.querySelectorAll('[data-unread]'); if (!els.length || Live.data.ro) return;
    if (!('IntersectionObserver' in window)){ els.forEach(el => queueRead(el.dataset.mid)); return; }
    io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && document.visibilityState !== 'hidden' && (ST.view === 'feed' || !matchMedia('(max-width:860px)').matches)){ queueRead(e.target.dataset.mid); io && io.unobserve(e.target); } }), { root: feed, threshold: 0.5 });
    els.forEach(el => io.observe(el));
  }
  function afterRender(main, h){
    active = h === 'chats';
    document.documentElement.classList.toggle('ch-lock', active && ST.view === 'feed' && matchMedia('(max-width:860px)').matches && !!main.querySelector('.ch-wrap.v-feed #cmsgs'));
    if (!active){ if (io){ io.disconnect(); io = null; } main.querySelectorAll('[data-chopen]').forEach(b => b.addEventListener('click', () => openChat(b.dataset.chopen))); return; }
    const feed = main.querySelector('#cmsgs'), c = feed ? findChat(feed.dataset.ch) : null;
    wireSide(main);
    if (!c) return;
    wireFeed(main, c); wireComposer(main, c);
    ST.playing.forEach(old => { const nu = main.querySelector(`${old.tagName.toLowerCase()}[data-fref="${CSS.escape(old.dataset.fref || '')}"]`); if (nu) nu.replaceWith(old); }); ST.playing = [];
    resolveFiles(main); placeScroll(feed); observeRead(feed);
    if (c.kind === 'channel'){ const s = seen(), me = meName(); s[me] = s[me] || {}; if (s[me][c.id] !== K.RNG.anchor && (ST.view === 'feed' || !matchMedia('(max-width:860px)').matches)){ s[me][c.id] = K.RNG.anchor; lsSet(LS_SEEN, s); } }
    clearTimeout(dlvT); dlvT = setTimeout(() => { if (active) markDelivered(visibleChats(myRole())); }, 400);
  }
  function beforeRender(){
    const feed = document.querySelector('#content #cmsgs');
    if (feed){ ST.scroll = { ch: feed.dataset.ch, top: feed.scrollTop, fromBottom: feed.scrollHeight - feed.scrollTop - feed.clientHeight }; ST.playing = [...feed.querySelectorAll('audio, video')].filter(x => !x.paused && x.dataset.fref); }
    else { ST.scroll = null; ST.playing = []; }
  }

  // ---------- «Мои чаты» на рабочем столе роли (ядро: K.data.myChats делегирует сюда) ----------
  function myChats(role){
    if (!role || role.rt.chats === '·') return [];
    return visibleChats(role).map(c => { const l = c.last; return { id:c.id, kind:c.kind, name: chatTitle(c, role.name), n: c.kind === 'channel' ? c.n : c.members.length, unread:c.unread, ment:c.ment, msgs: l ? [[timeOf(l), whoOf(l), l.kind === 'system' ? sysText(l) : (l.text || t('chat.files_n', { n: (l.files || []).length }))]] : [] }; });
  }

  // ---------- стили (токены :root, префикс .ch-) ----------
  const CSS_TEXT = `
.ch-wrap{display:grid;grid-template-columns:300px minmax(0,1fr);gap:var(--s3);margin-top:var(--s1);align-items:start}
.ch-side,.ch-main{margin-top:0;padding:var(--s3)}
.ch-tools{display:flex;flex-direction:column;gap:var(--s2)}.ch-new-b{display:flex;gap:var(--s2);flex-wrap:wrap}.ch-new-b .btn-sec{flex:1 1 auto}
.ch-tools input,.ch-hs input{font:inherit;font-size:var(--fs-3);color:var(--fg);background:var(--surface-2);border:1px solid var(--line-2);border-radius:var(--r-sm);padding:var(--s2) var(--s3);min-width:0;width:100%;box-sizing:border-box;min-height:36px}
.ch-tabs{display:flex;gap:var(--s3);margin:var(--s3) 0 var(--s2);border-bottom:1px solid var(--line);font-weight:700;font-size:var(--fs-3);flex-wrap:wrap}
.ch-tabs a{padding:var(--s1) 2px var(--s2);color:var(--fg-3);text-decoration:none}.ch-tabs a.on{color:var(--fg);box-shadow:inset 0 -2px 0 var(--accent)}
.ch-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:2px;max-height:clamp(320px,calc(100vh - 330px),720px);overflow:auto}
.ch-row{display:flex;gap:var(--s2);width:100%;text-align:left;background:transparent;border:0;border-radius:var(--r-sm);padding:var(--s2);cursor:pointer;color:var(--fg);font:inherit;min-height:44px}
.ch-row:hover{background:var(--surface-3)}.ch-row.on{background:var(--accent-soft);box-shadow:inset 3px 0 0 var(--accent)}
.ch-av{flex:0 0 36px;height:36px;border-radius:var(--r-pill);display:grid;place-items:center;font-weight:800;font-size:var(--fs-2);background:var(--surface-3);color:var(--fg-2)}
.ch-av.k-channel{background:var(--info-soft);color:var(--info-text)}.ch-av.k-direct{background:var(--good-soft);color:var(--good-text)}
.ch-av.c1{background:var(--c1);color:var(--fg-inv)}.ch-av.c2{background:var(--c2);color:var(--fg-inv)}.ch-av.c3{background:var(--c3);color:var(--fg-inv)}.ch-av.c4{background:var(--c4);color:var(--fg-inv)}.ch-av.c5{background:var(--c5);color:var(--fg-inv)}.ch-av.c6{background:var(--c6);color:var(--fg-inv)}.ch-av.c7{background:var(--c7);color:var(--fg-inv)}
.ch-rb{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}.ch-rn,.ch-rp{display:flex;gap:var(--s2);align-items:center;min-width:0}
.ch-rn b{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:var(--fs-3)}.ch-rn small{color:var(--fg-3);font-size:var(--fs-1);font-variant-numeric:tabular-nums}
.ch-rp small{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--fg-3);font-size:var(--fs-2)}
.ch-bdg{background:var(--accent);color:var(--accent-ink);border-radius:var(--r-pill);padding:0 var(--s2);font-size:var(--fs-1);font-weight:800;line-height:18px;min-width:18px;text-align:center}.ch-bdg.at{background:var(--info-fill);color:var(--fg-inv)}
.ch-hits{margin:0 0 var(--s2);display:flex;flex-direction:column;gap:2px}.ch-hits h3{font-size:var(--fs-2);color:var(--fg-2);margin:var(--s1) 0}
.ch-hit{display:grid;grid-template-columns:1fr auto;gap:2px var(--s2);text-align:left;background:var(--surface-2);border:1px solid var(--line);border-radius:var(--r-sm);padding:var(--s2);cursor:pointer;font:inherit;color:var(--fg)}
.ch-hit small{color:var(--fg-3);font-size:var(--fs-1)}.ch-hit span{grid-column:1 / -1;font-size:var(--fs-2);color:var(--fg-2)}
.ch-main{display:flex;flex-direction:column;min-width:0}
.ch-head{display:flex;align-items:center;gap:var(--s2);padding-bottom:var(--s2);border-bottom:1px solid var(--line);position:sticky;top:0;background:var(--surface);z-index:2;flex-wrap:wrap}
.ch-ttl{flex:1 1 200px;min-width:0;display:flex;flex-direction:column}.ch-ttl b{font-size:var(--fs-5);font-weight:800;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ch-ttl small{color:var(--fg-3);font-size:var(--fs-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ch-hs{flex:0 1 220px;min-width:0;display:flex;flex-direction:column;gap:2px}.ch-hs small{color:var(--fg-3);font-size:var(--fs-1)}
.ch-back{display:none}.ch-menu{font-weight:800;letter-spacing:.1em}
.ch-pins{display:flex;flex-direction:column;gap:2px;padding:var(--s2) 0;border-bottom:1px solid var(--line)}
.ch-pin{display:flex;gap:var(--s1);align-items:baseline;text-align:left;background:var(--accent-soft);border:0;border-radius:var(--r-sm);padding:var(--s1) var(--s2);cursor:pointer;font:inherit;font-size:var(--fs-2);color:var(--fg);overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.ch-feed{display:flex;flex-direction:column;gap:var(--s2);height:clamp(320px,calc(100vh - 380px),720px);overflow:auto;padding:var(--s3) var(--s1);overscroll-behavior:contain}
.ch-feed:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.ch-more{align-self:center}
.ch-day,.ch-new{display:flex;justify-content:center;margin:var(--s1) 0}.ch-day span{background:var(--surface-3);color:var(--fg-2);font-size:var(--fs-1);font-weight:700;border-radius:var(--r-pill);padding:2px var(--s3)}
.ch-new span{background:var(--info-soft);color:var(--info-text);font-size:var(--fs-1);font-weight:800;border-radius:var(--r-pill);padding:2px var(--s3)}
.ch-sys{align-self:center;text-align:center;font-size:var(--fs-2);color:var(--fg-3);background:var(--surface-2);border-radius:var(--r-pill);padding:2px var(--s3);max-width:90%}
.ch-m{max-width:min(620px,86%);align-self:flex-start;background:var(--surface-3);border-radius:var(--r);padding:var(--s2) var(--s3);font-size:var(--fs-3);position:relative;box-sizing:border-box}
.ch-m.cm.live,.ch-m.cm.bot{border-left:0}.ch-m.mine{align-self:flex-end;background:var(--accent-soft)}.ch-m.bot{box-shadow:inset 3px 0 0 var(--accent)}.ch-m.world{background:var(--surface-2);border:1px solid var(--line)}
.ch-m.pinned{outline:1px dashed var(--accent)}.ch-m.flash{box-shadow:0 0 0 3px var(--info-fill)}
.ch-mh{display:flex;gap:var(--s2);align-items:baseline}.ch-mh b{font-size:var(--fs-2);font-weight:800}.ch-mh .t{margin-left:auto;color:var(--fg-3);font-size:var(--fs-1);font-variant-numeric:tabular-nums}
.ch-m p{margin:3px 0 0;white-space:pre-wrap;overflow-wrap:anywhere}
.ch-at{background:var(--info-soft);color:var(--info-text);border-radius:var(--r-sm);padding:0 2px}.ch-m mark{border-radius:2px}
.ch-quote{display:flex;flex-direction:column;width:100%;text-align:left;background:var(--surface);border:0;box-shadow:inset 3px 0 0 var(--info-fill);border-radius:var(--r-sm);padding:var(--s1) var(--s2);margin-bottom:var(--s1);cursor:pointer;font:inherit;color:var(--fg)}
.ch-quote b{font-size:var(--fs-1)}.ch-quote span{font-size:var(--fs-2);color:var(--fg-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ch-mf{display:flex;flex-wrap:wrap;gap:var(--s1) var(--s2);align-items:center;margin-top:var(--s1);font-size:var(--fs-1);color:var(--fg-3)}
.ch-acts{display:flex;flex-wrap:wrap;gap:var(--s1) var(--s2);margin-left:auto}
.ch-a,.ch-ed{border:0;background:none;padding:2px 0;color:var(--info-text);cursor:pointer;font:inherit;font-size:var(--fs-1);font-weight:700}.ch-a:hover,.ch-ed:hover{text-decoration:underline}.ch-ed{color:var(--fg-3);font-weight:600}
.ch-tlink{color:var(--good-text);font-weight:700;font-size:var(--fs-1)}
.ch-tick{color:var(--fg-3);font-weight:800;letter-spacing:-2px}.ch-tick.rd{color:var(--info-text)}
.ch-files{display:flex;flex-direction:column;gap:var(--s1);margin-top:var(--s1)}
.ch-img{padding:0;border:0;background:none;cursor:zoom-in;display:block;max-width:100%}.ch-img img{display:block;max-width:min(280px,100%);max-height:280px;width:auto;height:auto;border-radius:var(--r-sm);background:var(--surface)}
.ch-vid{max-width:min(320px,100%);max-height:260px;border-radius:var(--r-sm);background:var(--surface)}
.ch-aud{display:flex;align-items:center;gap:var(--s2);min-width:0}.ch-aud audio{height:36px;max-width:240px;min-width:0;flex:1}.ch-aud small{color:var(--fg-3);font-variant-numeric:tabular-nums}
.ch-file{display:flex;gap:var(--s2);align-items:center;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-sm);padding:var(--s2);text-decoration:none;color:var(--fg);min-width:0}
.ch-file span{display:flex;flex-direction:column;min-width:0}.ch-file b{font-size:var(--fs-2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ch-file small{color:var(--fg-3);font-size:var(--fs-1)}
.ch-file.na,.ch-img img.na{opacity:.5}.ch-demo{display:block;color:var(--fg-3);font-size:var(--fs-1);margin-top:2px}
.ch-comp{border-top:1px solid var(--line);padding-top:var(--s2);position:relative}
.ch-bar{display:flex;justify-content:space-between;align-items:center;gap:var(--s2);background:var(--surface-2);border-radius:var(--r-sm);padding:var(--s1) var(--s2);margin-bottom:var(--s1);font-size:var(--fs-2);color:var(--fg-2);min-width:0}
.ch-bar>span:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.ch-bar.ed{background:var(--warn-soft);color:var(--warn-text)}.ch-bar.rec{background:var(--bad-soft);color:var(--bad-text)}.ch-bar.rec span:last-child{display:flex;gap:var(--s1)}
.ch-dot{display:inline-block;width:8px;height:8px;border-radius:var(--r-pill);background:var(--bad-fill);margin-right:var(--s2);animation:chBlink 1s infinite}
@keyframes chBlink{50%{opacity:.2}}
.ch-flash{margin:0;font-size:var(--fs-2);min-height:0}.ch-flash.on{padding:var(--s1) var(--s2);border-radius:var(--r-sm);margin-bottom:var(--s1)}.ch-flash.bad{background:var(--bad-soft);color:var(--bad-text)}.ch-flash.info{background:var(--info-soft);color:var(--info-text)}
.ch-form{display:flex;gap:var(--s1);align-items:flex-end}
.ch-form textarea{flex:1;min-width:0;resize:none;overflow-y:auto;font:inherit;font-size:var(--fs-4);line-height:var(--lh);color:var(--fg);background:var(--surface-2);border:1px solid var(--line-2);border-radius:var(--r);padding:var(--s2) var(--s3);min-height:40px;max-height:160px;box-sizing:border-box}
.ch-form textarea::placeholder{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ch-ib{flex:0 0 40px;height:40px;border:0;background:transparent;border-radius:var(--r-pill);cursor:pointer;font-size:var(--fs-6);color:var(--fg-2)}.ch-ib:hover{background:var(--surface-3)}.ch-ib[aria-pressed=true]{background:var(--bad-soft)}
.ch-send{flex:0 0 44px;min-height:40px;padding:0;border-radius:var(--r-pill);font-size:var(--fs-5)}
.ch-ment{position:absolute;bottom:100%;left:var(--s5);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-sm);box-shadow:var(--sh-2);display:flex;flex-direction:column;z-index:5;max-height:240px;overflow:auto}
.ch-ment button{border:0;background:none;text-align:left;padding:var(--s2) var(--s3);cursor:pointer;font:inherit;font-size:var(--fs-3);color:var(--fg);min-height:36px}.ch-ment button:hover,.ch-ment button:focus{background:var(--accent-soft)}
.ch-block{margin:0}
.ch-mform{display:flex;flex-direction:column;gap:var(--s3)}.ch-mform.row{flex-direction:row;flex-wrap:wrap;align-items:center}
.ch-mform label{display:flex;flex-direction:column;gap:var(--s1);font-weight:700;font-size:var(--fs-3)}
.ch-mform input:not([type=checkbox]),.ch-menuw input:not([type=checkbox]){font:inherit;font-size:var(--fs-3);color:var(--fg);background:var(--surface-2);border:1px solid var(--line-2);border-radius:var(--r-sm);padding:var(--s2) var(--s3);min-height:36px;min-width:0;flex:1}
.ch-mform fieldset{border:1px solid var(--line);border-radius:var(--r-sm);margin:0;padding:var(--s2) var(--s3)}
.ch-checks{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:var(--s1) var(--s3);margin-bottom:var(--s2)}.ch-checks label{display:flex;gap:var(--s2);align-items:center;font-weight:600;font-size:var(--fs-3);min-height:32px}
.ch-err{color:var(--bad-text);font-size:var(--fs-2);margin:0;min-height:1em}
.ch-dmlist,.ch-mbtns{display:flex;flex-wrap:wrap;gap:var(--s2)}
.ch-mlist{list-style:none;margin:0;padding:0}.ch-mlist li{display:flex;justify-content:space-between;align-items:center;gap:var(--s2);padding:var(--s1) 0;border-top:1px solid var(--line);flex-wrap:wrap}
.ch-menuw h3{font-size:var(--fs-3);margin:var(--s4) 0 var(--s2)}.ch-menuw .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.ch-vers{margin:0;padding-left:var(--s5)}.ch-vers li{padding:var(--s2) 0;border-top:1px solid var(--line)}.ch-vers p{margin:2px 0 0;white-space:pre-wrap}.ch-vers small{color:var(--fg-3)}
.ch-full{display:block;max-width:100%;max-height:75vh;margin:0 auto}
.ch-vrec video{width:100%;max-height:50vh;background:var(--surface-3);border-radius:var(--r-sm)}
@media (max-width:860px){
  .ch-wrap{grid-template-columns:minmax(0,1fr)}
  .ch-wrap.v-list .ch-main{display:none}.ch-wrap.v-feed .ch-side{display:none}
  .ch-back{display:inline-flex}.ch-hm{display:none}
  .ch-list{max-height:none}.ch-row{min-height:52px}
  .ch-feed{height:calc(var(--ch-vh,100vh) - 300px);min-height:240px}
  /* В6: открытый чат на телефоне — экран целиком по visualViewport: шапка чата сверху, лента прокручивается внутри и прижата к низу, поле ввода всегда над клавиатурой */
  .ch-wrap.v-feed .ch-main{position:fixed;left:0;right:0;top:var(--ch-top,0px);height:var(--ch-vh,100dvh);z-index:70;margin:0;border-radius:0;border:0;padding:var(--s2) var(--s3) max(var(--s2),env(safe-area-inset-bottom));box-sizing:border-box;background:var(--surface);overflow:hidden}
  .ch-wrap.v-feed .ch-feed{flex:1 1 auto;height:auto;min-height:0}
  .ch-wrap.v-feed .ch-feed>:first-child{margin-top:auto}
  .ch-wrap.v-feed .ch-comp{flex:0 0 auto}
  .ch-head{flex-wrap:wrap}.ch-ttl{flex:1 1 0}.ch-hs{flex:1 1 100%;order:3}
  .ch-m{max-width:92%}.ch-ib{flex-basis:44px;height:44px}.ch-send{min-height:44px}
  .ch-a,.ch-ed{padding:var(--s1) 0;min-height:28px}
}
@media (max-width:860px){html.ch-lock,html.ch-lock body{overflow:hidden;overscroll-behavior:none}}
@media (prefers-reduced-motion: reduce){.ch-dot{animation:none}}
@media print{.ch-comp,.ch-tools,.ch-acts,.ch-menu,.ch-tabs{display:none}.ch-feed{height:auto;overflow:visible}}
`;

  // ---------- регистрация ----------
  const M = {
    name: 'chat', version: '0.8.0',
    ready: true,
    init(k){
      K = M.K = k;
      K.sections.chats = section;
      K.hooks.beforeRender.push(beforeRender);
      K.hooks.afterRender.push(afterRender);
      K.hooks.onHash.push(h => { if (h !== 'chats'){ if (ST.rec) stopVoice(true); ST.view = 'list'; } });
      K.ui.css('chat', CSS_TEXT);
      setInterval(() => {
        if (!active) return;
        document.querySelectorAll('#content [data-edl]').forEach(el => { const left = Live.EDIT_MS - (Date.now() - +el.dataset.edl); if (left <= 0){ const b = el.closest('button'); if (b) b.remove(); else el.textContent = '0:00'; } else el.textContent = mmss(left); });
        const rt = document.getElementById('chRecT'); if (rt && ST.rec) rt.textContent = mmss(Date.now() - ST.rec.t0);
      }, 1000);
      const vv = window.visualViewport;
      if (vv){ const fit = () => { const st = document.documentElement.style; st.setProperty('--ch-vh', Math.round(vv.height) + 'px'); st.setProperty('--ch-top', Math.round(vv.offsetTop) + 'px'); const f = document.querySelector('#content .ch-wrap.v-feed #cmsgs'); if (f && f.scrollHeight - f.scrollTop - f.clientHeight < 80) f.scrollTop = f.scrollHeight; };
        vv.addEventListener('resize', fit); vv.addEventListener('scroll', fit); fit(); }
    },
    myChats, open: openChat, allChats, visibleChats: rl => visibleChats(rl || myRole()), contacts,
  };
  (window.SUNKAR_MODULES = window.SUNKAR_MODULES || []).push(M);
  window.Chat = M;
})();
