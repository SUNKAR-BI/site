// SUNKAR BI · live.js — живые записи (LIVE): чат, задачи, приказы, записки, заявки на оплату, решения учредителя,
// поручения, регламенты, проекты, отчёты, файлы, журнал действий. Зависит только от I18N. Экспорт: window.Live, window.LIVE, window.FileStore.
//
// Транспорты (Live.transport):
//   'db'     — опубликованная страница: общий журнал (capability db), имена — user, ИИ — sample, файлы — assets (если выданы);
//   'local'  — сайт и файл с диска: localStorage 'sunkar-live-v2' (миграция из 'sunkar-live-v1'), файлы — IndexedDB 'sunkar-files';
//   'server' — сервер Агентства (window.SUNKAR_SERVER) при наличии API /api/live/*; пока API нет (404) — работает как 'local'.
// Удаления нет ни в одном транспорте: только статусы («отменено», «закрыто»). Сообщение чата правит только автор в течение 5 минут.
//
// Серверный API, который ждёт клиент (реализуется в движке позже; ответы — JSON {ok, data|error}):
//   GET   api/health                    → { …, live:true, files:true } — флаг, что API журнала и файлов включены (без флага — режим 'local')
//   GET   api/live/changes?since=<ts>   → data: { now:<ts>, rows:{ <коллекция>: [запись…] }, decisions:{ <ключ>: запись } }  (все изменения после since)
//   POST  api/live/<коллекция>          → тело — новая запись без id; data: сохранённая запись (id, ts, by, role ставит сервер)
//   PATCH api/live/<коллекция>/<id>     → тело — изменения; data: запись после изменения (для chat сервер сам проверяет автора и 5 минут)
//   POST  api/live/decisions            → { k, v } ; data: запись решения
//   GET   api/session                   → data: { employeeId, role, name }
//   POST  api/files (multipart: file, meta) → data: { id, ref } ; GET api/files/<id> — сам файл
(function(){
  'use strict';
  const I = window.I18N || { t: k => k, add(){} };
  I.add('ru', {
    'live.note.shared': 'общий журнал · записи видят все, кто открыл ссылку', 'live.note.shared_ro': 'общий журнал · у вас только просмотр',
    'live.note.server': 'журнал сервера Агентства · записи видят все пользователи по правам', 'live.note.local': 'записи сохраняются в этом браузере · общий журнал работает на опубликованной странице и на сервере Агентства',
    'live.note.server_off': 'серверный журнал ещё не подключён — записи сохраняются в этом браузере',
    'live.full': 'журнал браузера заполнен на {p} %', 'live.quota': 'Журнал браузера переполнен — новые записи не сохраняются. Нужна выгрузка и очистка на сервере Агентства.',
    'live.db_quota': 'Журнал переполнен — новые записи не сохраняются.', 'live.edit_late': 'Изменить сообщение можно только в течение 5 минут после отправки.', 'live.edit_author': 'Изменить сообщение может только автор.',
    'live.no_text_patch': 'Текст сообщения меняется только правкой автора (5 минут).',
    'files.no_storage': 'Браузер не даёт сохранить файл (хранилище недоступно).', 'files.too_big': 'Файл больше {mb} МБ — не сохранён.', 'files.total': 'Файлы в этом браузере занимают {mb} МБ из 200 МБ.',
    'files.local_only': 'файл только в этом браузере', 'files.demo': 'демонстрационный файл',
    'j.created': 'создал', 'j.changed': 'изменил', 'j.edited': 'изменил сообщение', 'j.decided': 'принял решение',
  });
  I.add('en', {
    'live.note.shared': 'shared log · everyone who opened the link sees the records', 'live.note.shared_ro': 'shared log · view only for you',
    'live.note.server': 'agency server log · records are visible to all users according to their rights', 'live.note.local': 'records are saved in this browser · the shared log works on the published page and on the agency server',
    'live.note.server_off': 'the server log is not connected yet — records are saved in this browser',
    'live.full': 'browser log is {p}% full', 'live.quota': 'The browser log is full — new records are not saved. Export and cleanup on the agency server are needed.',
    'live.db_quota': 'The log is full — new records are not saved.', 'live.edit_late': 'A message can be edited only within 5 minutes after sending.', 'live.edit_author': 'Only the author can edit a message.',
    'live.no_text_patch': 'Message text changes only through the author’s edit (5 minutes).',
    'files.no_storage': 'The browser does not allow saving the file (storage unavailable).', 'files.too_big': 'The file is larger than {mb} MB — not saved.', 'files.total': 'Files in this browser take {mb} MB of 200 MB.',
    'files.local_only': 'file only in this browser', 'files.demo': 'demo file',
    'j.created': 'created', 'j.changed': 'changed', 'j.edited': 'edited a message', 'j.decided': 'made a decision',
  });

  // ---------- модель ----------
  const COLS = ['chat','chats','tasks','projects','docs','pays','errands','routines','aichat','reports','files','journal'];
  const LIMITS = { chat:2000, chats:200, tasks:1000, projects:300, docs:300, pays:300, errands:500, routines:100, aichat:1000, reports:300, files:500, journal:2000 };
  const HIST = new Set(['tasks','projects','routines','chats','docs','pays','reports']);     // изменения пишутся в hist записи
  const JKIND = { chat:'chat', chats:'chat', tasks:'task', projects:'project', docs:'doc', pays:'pay', errands:'errand', routines:'routine', aichat:'errand', reports:'report', files:'file', decisions:'decision' };
  // номера: задачи Н-ГГГГ-NNNN, проекты ПР-ГГГГ-NN, регламенты Р-NN, отчёты О-ГГГГ-NNN
  const NUM = { tasks: y => ['Н-'+y+'-', 4], projects: y => ['ПР-'+y+'-', 2], routines: () => ['Р-', 2], reports: y => ['О-'+y+'-', 3] };
  const LS2 = 'sunkar-live-v2', LS1 = 'sunkar-live-v1', LS_ME = 'sunkar-me';
  const LIVE = { decisions:{}, mode:'local', transport:'local', uid:null, names:{}, me:'', ro:false, err:null, warn:null, serverNote:null };
  COLS.forEach(c => { LIVE[c] = []; });
  const cap = { db:null, user:null, sample:null, assets:null };
  let serverFiles = false;
  let ctx = () => ({ role:'Исполнительный директор', day:null });
  const listeners = [];
  const changed = kind => listeners.slice().forEach(fn => { try { fn(kind); } catch(e){ console.error(e); } });
  const yearOf = day => day == null ? new Date().getFullYear() : (window.WORLD ? window.WORLD.yOf(day) : 2022 + Math.floor(day/365.25));

  // старые записи без новых полей читаются по умолчанию (db, сервер, localStorage)
  function normalize(col, r){
    if (!r || typeof r !== 'object') return r;
    if (col === 'chat'){ if (!r.kind) r.kind = 'text'; if (!r.readBy) r.readBy = {}; if (!r.editHist) r.editHist = []; if (!r.files) r.files = []; }
    else if (col === 'tasks'){ if (r.desc == null) r.desc = ''; if (!r.checklist) r.checklist = []; if (!r.author) r.author = { role:r.role, by:r.by || null }; if (!r.hist) r.hist = [{ ts:r.ts, what:'создана' }]; if (r.due == null && r.day != null) r.due = r.day + (r.days ?? 3); }
    else if (col === 'docs'){ if (!r.hist) r.hist = [{ ts:r.ts, st:r.status || 'проект', role:r.role }]; }
    else if (col === 'pays'){ if (!r.hist) r.hist = [{ ts:r.ts, stage:r.stage ?? 1, role:r.role }]; }
    else if (col === 'errands'){ if (!r.src) r.src = 'aichat'; }
    return r;
  }
  function nextNo(col, day){
    const f = NUM[col]; if (!f) return null;
    const [pre, w] = f(yearOf(day)); let mx = 0;
    LIVE[col].forEach(r => { if (r.no && String(r.no).startsWith(pre)){ const k = parseInt(String(r.no).slice(pre.length), 10); if (k > mx) mx = k; } });
    return pre + String(mx + 1).padStart(w, '0');
  }

  // ---------- localStorage: загрузка, миграция v1 → v2, сохранение ----------
  function migrate(x){
    const out = { decisions: x.decisions || {} };
    COLS.forEach(c => { out[c] = Array.isArray(x[c]) ? x[c] : []; });
    const cnt = {};
    out.tasks.forEach(t => { if (!t.no){ const y = yearOf(t.day); cnt[y] = (cnt[y] || 0) + 1; t.no = `Н-${y}-${String(cnt[y]).padStart(4,'0')}`; } });
    COLS.forEach(c => out[c].forEach(r => normalize(c, r)));
    return out;
  }
  function localLoad(){
    let x = null;
    try { x = JSON.parse(localStorage.getItem(LS2) || 'null'); } catch(e){ x = null; }
    if (!x){ try { const v1 = JSON.parse(localStorage.getItem(LS1) || 'null'); if (v1){ x = migrate(v1); localWrite(x); } } catch(e){} }
    if (x){ COLS.forEach(c => { LIVE[c] = Array.isArray(x[c]) ? x[c].map(r => normalize(c, r)) : []; }); LIVE.decisions = x.decisions || {}; }
    try { LIVE.me = (localStorage.getItem(LS_ME) || '').slice(0, 60); } catch(e){}
  }
  function localWrite(obj){
    const s = JSON.stringify(obj);
    localStorage.setItem(LS2, s);
    return s.length;
  }
  function localSave(){
    if (LIVE.transport !== 'local') return;
    const o = { v:2, decisions: LIVE.decisions }; COLS.forEach(c => { o[c] = LIVE[c].slice(-LIMITS[c]); });
    try {
      const n = localWrite(o), p = Math.round(n / (5 * 1024 * 1024) * 100);
      LIVE.warn = n > 4 * 1024 * 1024 ? I.t('live.full', { p }) : null;
    } catch(e){ LIVE.err = I.t('live.quota'); LIVE.ro = true; changed('err'); }
  }

  // ---------- запись ----------
  const newId = p => (p || 'l') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  function dbError(e){ if (e && e.code === 'invalid_argument') LIVE.ro = true; if (e && e.code === 'quota_exceeded') LIVE.err = I.t('live.db_quota'); changed('err'); }
  async function api(method, url, body){
    const r = await fetch(url, { method, credentials:'same-origin', cache:'no-store', headers: body && !(body instanceof FormData) ? { 'content-type':'application/json' } : undefined, body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined) });
    if (r.status === 404 || r.status === 405 || r.status === 501) throw { code:'no_api', status:r.status };
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || j.ok === false) throw { code: (j && j.error) || 'http_' + r.status, status:r.status };
    return j.data;
  }
  const serverOff = () => { if (LIVE.transport === 'server'){ LIVE.transport = 'local'; LIVE.mode = 'local'; LIVE.serverNote = I.t('live.note.server_off'); localLoad(); changed('mode'); } };
  const upsert = (col, row) => { const a = LIVE[col], k = a.findIndex(x => x.id === row.id); if (k >= 0) a[k] = normalize(col, row); else a.push(normalize(col, row)); };

  function journal(col, action, row, extra){
    if (col === 'journal') return;
    const c = ctx(), title = row && (row.title || row.subj || row.name || row.q || row.text || row.to || '');
    add('journal', { kind: JKIND[col] || col, actor: { role:c.role, by:LIVE.uid || null }, action, target: { kind:col, id: row ? row.id || null : null, no: row && row.no || null }, note: String(title || '').slice(0, 160), ...(extra || {}) }, { journal:false });
  }
  async function add(col, obj, opts = {}){
    if (!LIVE[col]) LIVE[col] = [];
    const c = ctx();
    const row = normalize(col, { ...obj, ts: Date.now(), by: LIVE.uid || null, role: obj.role || c.role, day: obj.day ?? c.day });
    if (LIVE.me && !LIVE.uid && !row.name) row.name = LIVE.me;
    if (NUM[col] && !row.no) row.no = nextNo(col, row.day);
    if (col === 'tasks' && row.due == null && row.day != null) row.due = row.day + (row.days ?? 3);
    if (LIVE.transport === 'db' && !LIVE.ro){
      try { const ref = await cap.db.collection(col).add(row); row.id = ref && ref.id || null; if (opts.journal !== false) journal(col, I.t('j.created'), row); return row; }
      catch(e){ dbError(e); if (LIVE.ro) return null; }
    }
    if (LIVE.transport === 'server'){
      try { const saved = await api('POST', 'api/live/' + col, row); if (saved){ upsert(col, saved); changed(col); } return saved; }       // сервер сам пишет журнал
      catch(e){ if (e && e.code === 'no_api') serverOff(); else { LIVE.err = String(e && e.code || e); changed('err'); return null; } }
    }
    if (LIVE.ro) return null;
    row.id = newId(); LIVE[col].push(row); localSave(); changed(col);
    if (opts.journal !== false) journal(col, I.t('j.created'), row);
    return row;
  }
  async function patchRow(col, id, patch, opts = {}){
    const r = LIVE[col].find(x => x.id === id), prevSt = r ? r.status : undefined;
    if (HIST.has(col) && !('hist' in patch) && r){
      const h = { ts: Date.now(), role: ctx().role, by: LIVE.uid || null, what: opts.what || 'изменено', fields: Object.keys(patch) };
      if ('status' in patch){ h.from = r.status; h.to = patch.status; }
      patch = { ...patch, hist: [...(r.hist || []), h].slice(-200) };
    }
    if (LIVE.transport === 'db' && !String(id).startsWith('l') && !LIVE.ro){
      try { await cap.db.collection(col).doc(id).update(patch); } catch(e){ dbError(e); return false; }
    } else if (LIVE.transport === 'server' && !String(id).startsWith('l')){
      try { const saved = await api('PATCH', `api/live/${col}/${encodeURIComponent(id)}`, patch); if (saved){ upsert(col, saved); changed(col); } return true; }
      catch(e){ if (e && e.code === 'no_api') serverOff(); else { LIVE.err = String(e && e.code || e); changed('err'); } return false; }
    } else {
      if (LIVE.ro && LIVE.transport === 'local') return false;
      if (r){ Object.assign(r, patch); localSave(); changed(col); }
    }
    if (opts.journal !== false && r){ const ex = 'status' in patch ? { from: prevSt, to: patch.status } : (opts.from != null ? { from: opts.from, to: opts.to } : {}); journal(col, opts.action || I.t('j.changed'), { ...r, id }, ex); }
    return true;
  }
  async function update(col, id, patch, opts = {}){
    if (col === 'chat' && patch && 'text' in patch) return { ok:false, error: I.t('live.no_text_patch') };
    return patchRow(col, id, patch, opts);
  }
  // правка сообщения: только автор и не позже 5 минут; прежние версии — в editHist (до 10)
  const EDIT_MS = 5 * 60 * 1000;
  function canEdit(m){
    if (!m || m.bot || m.kind === 'system') return false;
    const mine = LIVE.uid ? m.by === LIVE.uid : m.role === ctx().role;
    return mine && Date.now() - m.ts <= EDIT_MS;
  }
  async function editMessage(id, text){
    const m = LIVE.chat.find(x => x.id === id);
    if (!m) return { ok:false, error:'not_found' };
    const mine = LIVE.uid ? m.by === LIVE.uid : m.role === ctx().role;
    if (!mine || m.bot) return { ok:false, error: I.t('live.edit_author') };
    if (Date.now() - m.ts > EDIT_MS) return { ok:false, error: I.t('live.edit_late') };
    const t = String(text || '').slice(0, 4000); if (!t.trim() || t === m.text) return { ok:false, error:'same' };
    const editHist = [...(m.editHist || []), { ts: m.editedAt || m.ts, text: m.text }].slice(-10);
    const ok = await patchRow('chat', id, { text:t, editedAt: Date.now(), editHist }, { action: I.t('j.edited') });
    return { ok };
  }
  async function decide(k, v){
    const row = { v, role: ctx().role, by: LIVE.uid || null, ts: Date.now() };
    if (LIVE.transport === 'db' && !LIVE.ro){ try { await cap.db.collection('decisions').doc(k).set(row); journal('decisions', I.t('j.decided'), { id:k, title:k + ': ' + v }); return; } catch(e){ dbError(e); return; } }
    if (LIVE.transport === 'server'){ try { const saved = await api('POST', 'api/live/decisions', { k, v }); LIVE.decisions[k] = saved || row; changed('decisions'); return; } catch(e){ if (e && e.code === 'no_api') serverOff(); else return; } }
    if (LIVE.ro) return;
    LIVE.decisions[k] = row; localSave(); changed('decisions');
    journal('decisions', I.t('j.decided'), { id:k, title:k + ': ' + v });
  }

  // ---------- имена ----------
  async function resolveNames(){
    if (!cap.user) return;
    const ids = [...new Set(COLS.flatMap(c => LIVE[c].map(r => r.by)).concat(Object.values(LIVE.decisions).map(d => d.by)).filter(Boolean))].filter(id => !(id in LIVE.names));
    if (!ids.length) return;
    try { const ps = await cap.user.profiles(ids); let ch = false; ids.forEach(id => { const n = (ps[id] && ps[id].name) || ''; if (LIVE.names[id] !== n){ LIVE.names[id] = n; ch = true; } }); if (ch) changed('names'); } catch(e){}
  }
  const roleName = r => (window.SUNKAR && window.SUNKAR.fmt && window.SUNKAR.fmt.rn) ? window.SUNKAR.fmt.rn(r) : r;
  const whoOf = r => { const n = (r.by && LIVE.names[r.by]) || r.name; return n ? `${n} · ${roleName(r.role)}` : roleName(r.role); };
  const tOf = ts => { const d = new Date(ts); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };
  const note = () => {
    const base = LIVE.transport === 'db' ? I.t(LIVE.ro ? 'live.note.shared_ro' : 'live.note.shared') : (LIVE.transport === 'server' ? I.t('live.note.server') : (LIVE.serverNote || I.t('live.note.local')));
    return [base, LIVE.warn, LIVE.err].filter(Boolean).join(' · ');
  };
  function setMe(name){ LIVE.me = String(name || '').replace(/\d{6,}/g, '').slice(0, 60).trim(); try { localStorage.setItem(LS_ME, LIVE.me); } catch(e){} changed('names'); }

  // ---------- подключение: db на опубликованной странице, сервер Агентства ----------
  localLoad();
  // М12: режим сайта и файла — запись из другой вкладки этого браузера видна сразу, без перезагрузки (событие storage)
  try { window.addEventListener('storage', e => { if (LIVE.transport !== 'local' || (e.key !== LS2 && e.key !== null)) return; localLoad(); COLS.forEach(c => changed(c)); changed('decisions'); }); } catch(e){}
  (async () => {
    if (!window.claude || typeof window.claude.use !== 'function') return;
    try { cap.user = await window.claude.use('user'); } catch(e){ cap.user = null; }
    try { LIVE.uid = cap.user ? await cap.user.id() : null; } catch(e){}
    try { cap.sample = await window.claude.use('sample'); } catch(e){ cap.sample = null; }
    try { cap.assets = await window.claude.use('assets'); } catch(e){ cap.assets = null; }
    let db = null; try { db = await window.claude.use('db'); } catch(e){ db = null; }
    if (db){
      cap.db = db; LIVE.transport = 'db'; LIVE.mode = 'shared'; COLS.forEach(c => { LIVE[c] = []; }); LIVE.decisions = {};
      try { const cw = cap.user ? await cap.user.can('data.write') : null; if (cw === false) LIVE.ro = true; } catch(e){}
      COLS.forEach(c => { db.collection(c).orderBy('ts', 'desc').limit(LIMITS[c]).onSnapshot(snap => { LIVE[c] = snap.docs.map(d => normalize(c, { id:d.id, ...d.data() })).reverse(); resolveNames(); changed(c); }, dbError); });
      db.collection('decisions').onSnapshot(snap => { const o = {}; snap.docs.forEach(d => { o[d.id] = d.data(); }); LIVE.decisions = o; resolveNames(); changed('decisions'); }, dbError);
    }
    changed('mode');
  })();
  (async () => {
    if (!window.SUNKAR_SERVER || (window.claude && typeof window.claude.use === 'function')) return;
    let since = 0;
    async function pull(first){
      const d = await api('GET', 'api/live/changes?since=' + since);
      if (first){ LIVE.transport = 'server'; LIVE.mode = 'server'; COLS.forEach(c => { LIVE[c] = []; }); LIVE.decisions = {}; }
      const rows = (d && d.rows) || {}; Object.keys(rows).forEach(c => { if (LIVE[c]) rows[c].forEach(r => upsert(c, r)); });
      if (d && d.decisions) Object.assign(LIVE.decisions, d.decisions);
      since = (d && d.now) || Date.now(); changed(first ? 'mode' : 'server');
    }
    // API журнала включается флагом в api/health (live: true) — без него не стучимся в несуществующие адреса
    let h = null; try { const r = await fetch('api/health', { cache:'no-store', credentials:'same-origin' }); h = r.ok ? await r.json() : null; } catch(e){}
    if (!h || !h.live){ LIVE.serverNote = I.t('live.note.server_off'); changed('mode'); return; }
    serverFiles = !!(h.files || h.live);
    try { await pull(true); } catch(e){ LIVE.serverNote = I.t('live.note.server_off'); changed('mode'); return; }
    try { const s = await api('GET', 'api/session'); if (s && s.employeeId != null){ LIVE.uid = 'e' + s.employeeId; if (s.name) LIVE.names[LIVE.uid] = s.name; } } catch(e){}
    setInterval(() => { if (LIVE.transport === 'server') pull(false).catch(e => { if (e && e.code === 'no_api') serverOff(); }); }, 15000);
  })();

  // ---------- FileStore: файлы, голос, видео ----------
  const MB = 1024 * 1024, IDB_NAME = 'sunkar-files', IDB_STORE = 'blobs';
  const LIM = { idb: 25*MB, server: 50*MB, assets: 20*MB, idbTotal: 200*MB, idbWarn: 150*MB };
  let idbP = null; const urls = new Map();
  function idb(){
    if (idbP) return idbP;
    idbP = new Promise((res, rej) => {
      try {
        if (!window.indexedDB) return rej({ code:'no_storage' });
        const rq = indexedDB.open(IDB_NAME, 1);
        rq.onupgradeneeded = () => { if (!rq.result.objectStoreNames.contains(IDB_STORE)) rq.result.createObjectStore(IDB_STORE, { keyPath:'id' }); };
        rq.onsuccess = () => res(rq.result); rq.onerror = () => rej({ code:'no_storage' }); rq.onblocked = () => rej({ code:'no_storage' });
      } catch(e){ rej({ code:'no_storage' }); }
    });
    idbP.catch(() => { idbP = null; });
    return idbP;
  }
  const idbTx = (mode, fn) => idb().then(d => new Promise((res, rej) => { try { const tx = d.transaction(IDB_STORE, mode), st = tx.objectStore(IDB_STORE); const out = fn(st); tx.oncomplete = () => res(out && out.result !== undefined ? out.result : out); tx.onerror = () => rej(tx.error || { code:'no_storage' }); tx.onabort = () => rej(tx.error || { code:'no_storage' }); } catch(e){ rej(e); } }));
  const kindOf = (mime, name) => { const m = String(mime || ''); if (m.startsWith('image/')) return 'image'; if (m.startsWith('audio/')) return 'audio'; if (m.startsWith('video/')) return 'video'; if (/pdf|word|excel|sheet|document|presentation|text|csv|json/.test(m) || /\.(pdf|docx?|xlsx?|pptx?|txt|csv|md|json)$/i.test(name || '')) return 'doc'; return 'other'; };
  const isText = (mime, name) => /^text\/|json/.test(mime || '') || /\.(txt|csv|md|json)$/i.test(name || '');
  async function usage(){
    try { const all = await idbTx('readonly', st => st.getAll()); const arr = Array.isArray(all) ? all : []; return { bytes: arr.reduce((s, x) => s + (x.blob && x.blob.size || 0), 0), count: arr.length }; }
    catch(e){ return { bytes:0, count:0, error:'no_storage' }; }
  }
  // сохранить файл и записать метаданные в LIVE.files; meta: { folder, attachedTo:[{kind,id}], obj, dur, w, h, kind }
  async function put(file, meta = {}){
    const name = String(meta.name || file.name || 'file').slice(0, 200), mime = file.type || meta.mime || 'application/octet-stream', size = file.size || 0;
    const m = { name, mime, size, kind: meta.kind || kindOf(mime, name), dur: meta.dur ?? null, w: meta.w ?? null, h: meta.h ?? null, folder: meta.folder || null, attachedTo: meta.attachedTo || [], obj: meta.obj || null, demo: true };
    if (meta.extract !== false && isText(mime, name) && size < MB && file.text){ try { m.textExtract = (await file.text()).slice(0, 8000); } catch(e){} }
    let warn = null;
    if (cap.assets){
      try { if (size > LIM.assets) throw { code:'too_big' }; const r = await cap.assets.upload(file); m.store = 'assets'; m.ref = r.url; m.assetId = r.id; }
      catch(e){ if (e && e.code === 'too_big') throw { code:'too_big', message: I.t('files.too_big', { mb: 20 }) }; }
    }
    if (!m.store && LIVE.transport === 'server' && serverFiles){
      if (size > LIM.server) throw { code:'too_big', message: I.t('files.too_big', { mb: 50 }) };
      try { const fd = new FormData(); fd.append('file', file, name); fd.append('meta', JSON.stringify(m)); const r = await api('POST', 'api/files', fd); m.store = 'server'; m.ref = r.ref || ('api/files/' + r.id); m.serverId = r.id; }
      catch(e){ if (!(e && e.code === 'no_api')) throw { code:'upload_failed', message: String(e && e.code || e) }; }
    }
    if (!m.store){
      if (size > LIM.idb) throw { code:'too_big', message: I.t('files.too_big', { mb: 25 }) };
      const u = await usage(); if (u.error) throw { code:'no_storage', message: I.t('files.no_storage') };
      if (u.bytes + size > LIM.idbTotal) throw { code:'quota', message: I.t('files.total', { mb: Math.round(u.bytes/MB) }) };
      if (u.bytes + size > LIM.idbWarn) warn = I.t('files.total', { mb: Math.round((u.bytes + size)/MB) });
      const key = newId('f');
      try { await idbTx('readwrite', st => st.put({ id:key, blob:file, meta:{ name, mime, size } })); } catch(e){ throw { code:'no_storage', message: I.t('files.no_storage') }; }
      m.store = 'idb'; m.ref = key; m.localOnly = true;
    }
    const row = await add('files', m, { journal: meta.journal });
    return { ...(row || m), warn };
  }
  async function url(meta){
    if (!meta) return null;
    if (meta.store === 'assets') return meta.ref || (meta.assetId ? '/_blob/' + meta.assetId : null);
    if (meta.store === 'server') return meta.ref;
    if (meta.store === 'idb'){
      if (urls.has(meta.ref)) return urls.get(meta.ref);
      try { const x = await idbTx('readonly', st => st.get(meta.ref)); if (!x || !x.blob) return null; const u = URL.createObjectURL(x.blob); urls.set(meta.ref, u); return u; } catch(e){ return null; }
    }
    return null;
  }
  function release(u){ for (const [k, v] of urls) if (v === u){ URL.revokeObjectURL(v); urls.delete(k); } }
  const preferred = () => cap.assets ? 'assets' : (LIVE.transport === 'server' ? 'server' : (window.indexedDB ? 'idb' : 'none'));

  window.LIVE = LIVE;
  window.Live = {
    data: LIVE, COLS, LIMITS, cap,
    get transport(){ return LIVE.transport; }, get mode(){ return LIVE.mode; },
    configure(o){ if (o && typeof o.ctx === 'function') ctx = o.ctx; },
    onChange(fn){ if (typeof fn === 'function') listeners.push(fn); },
    add, update, decide, editMessage, canEdit, EDIT_MS, nextNo, normalize, journal: (col, action, row, extra) => journal(col, action, row, extra),
    get: col => LIVE[col] || [], byId: (col, id) => (LIVE[col] || []).find(x => x.id === id) || null,
    whoOf, tOf, note, setMe, get me(){ return LIVE.me; }, resolveNames,
  };
  window.FileStore = { put, url, release, usage, kindOf, preferred, LIMITS: LIM };
})();
