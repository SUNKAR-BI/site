// SUNKAR BI · collab-tasks.js — модуль «tasks» (пункт 2): задачи и проекты уровня Битрикс24 — модель, представления (обзор, список, канбан,
// Гантт, «Мой план», календарь, проекты, отчёты, журнал), карточки задачи и проекта, повторения, мини-форма «Создать задачу» из любого места.
// Подключение — по правилам у window.SUNKAR в app.js: стили — K.ui.css('tasks', …) на токенах :root; строки — I18N.t('tasks.…') из словаря ниже;
// данные мира — K.data / K.roles / K.fmt (задачи мира W.tasksAt остаются историей и видны рядом с новыми); живые записи — window.Live; файлы — window.FileStore.
// Удаления нет: задача только «отменена» с причиной, комментарий правит автор в течение 5 минут, всё пишется в hist записи и в журнал.
(function(){
  'use strict';
  const I = window.I18N;
  const t = (k, v) => I.t('tasks.' + k, v);
  let K = null, W = null, Live = null;

  // ---------- значения в записях (как в мире и в ТЗ 3.2.1); на экран — только через словарь ----------
  const ST = { new:'новая', work:'в работе', review:'на проверке', done:'выполнена', hold:'отложена', cancel:'отменена' };
  const ST_ALIAS = { 'выполнено':'done', 'на согласовании':'review', 'ждёт разрешения':'work', 'отменено':'cancel', 'завершена':'done' };
  const PR = { low:'низкий', mid:'средний', high:'высокий', urgent:'срочно' };
  const SRC = { manual:'вручную', signal:'сигнал', chat:'чат', card:'карточка', memo:'записка', ai:'ИИ', routine:'регламент', repeat:'повтор', errand:'поручение', docdue:'срок документа', ar:'дебиторка', check:'проверка', onec:'1С' };
  const PJ = { plan:'план', work:'в работе', pause:'на паузе', done:'завершён', closed:'закрыт' };
  const RK = { open:'открыт', closed:'снят' };
  const FLOW = { new:['work','hold','cancel'], work:['review','done','hold','cancel'], review:['done','work','cancel'], hold:['work','cancel'], done:[], cancel:[] };
  const COLS = ['new','work','review','done'], FOLD = ['hold','cancel'];
  const key = (map, v, def) => Object.keys(map).find(k => map[k] === v) || (map[v] ? v : def);
  const stCode = v => key(ST, v, ST_ALIAS[v] || 'work');
  const prCode = v => key(PR, v, 'mid');
  const srcCode = v => key(SRC, v, null);
  const pjCode = v => key(PJ, v, 'work');
  const OPEN = c => c !== 'done' && c !== 'cancel';
  const OBJ_RE = /Объект № \d+/;
  const objIn = s => { const m = OBJ_RE.exec(String(s || '')); return m ? m[0] : null; };
  const arr = x => Array.isArray(x) ? x : [];
  const clean = o => JSON.parse(JSON.stringify(o));          // без undefined — общий журнал db их не принимает

  // ---------- оболочка ядра ----------
  const esc = s => K.fmt.esc(s == null ? '' : s);
  const at = () => K.RNG.anchor;
  const rl = () => K.roles.roleOf(K.S.role);
  const me = () => rl().name;
  const lvl = () => rl().rt.tasks || '·';
  const uid = () => Live.data.uid || null;
  const rn = n => n ? esc(K.fmt.rn(n)) : '—';
  const dt = d => K.fmt.dt(d), dts = d => K.fmt.dts(d);
  const N = v => K.fmt.N(v), P = v => K.fmt.P(v), F1 = v => K.fmt.F(v, 1);
  const roleById = id => (K.roles.ROLES.find(r => r.id === id) || {}).name;
  const roleNames = () => K.roles.ROLES.map(r => r.name);
  const money = () => K.roles.hasMoney(rl());
  const iso = d => W.iso(Math.max(0, d));
  const fromIso = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? W.fromIso(s) : null;
  const wtx = s => I.lang === 'ru' ? String(s || '') : String(s || '').split(' — ').map(p => p.split(': ').map(q => I.tx(I.w(q))).join(': ')).join(' — ');
  const ttl = x => esc(x.world ? wtx(x.title) : x.title);
  const stName = v => t('st.' + (ST[v] ? v : stCode(v)));
  const prName = c => t('pr.' + c);
  const srcName = v => { const c = srcCode(v); return c ? t('src.' + c) : esc(I.tx(String(v || '—'))); };
  const pjStName = v => t('pjs.' + pjCode(v));
  const who = (role, name) => (name ? esc(name) + ' · ' : '') + rn(role);
  const stamp = ts => { const d = new Date(ts); return `${dt(d)} ${I.time(d)}`; };
  const hours = min => F1((+min || 0) / 60) + ' ' + t('u.h');
  const pill = (cls, txt) => `<span class="tk-pill tk-${cls}">${txt}</span>`;
  const stPill = c => pill('s-' + c, stName(c));
  const prPill = c => pill('p-' + c, prName(c));

  // ---------- состояние представлений (удобство зрителя: только этот браузер) ----------
  const UI_KEY = 'sunkar-tasks-ui';
  const U = { f:{ st:'open', owner:'', project:'', tag:'', overdue:false, created:'all', q:'', group:'' }, sort:{}, lim:{}, gscale:'month', cal:null, calDay:null, jf:{ q:'', role:'', from:'', to:'' }, rep:'all' };
  try { const s = JSON.parse(localStorage.getItem(UI_KEY) || '{}'); if (s.f) Object.assign(U.f, s.f); if (s.sort) U.sort = s.sort; if (s.gscale) U.gscale = s.gscale; } catch(e){}
  const saveUI = () => { try { localStorage.setItem(UI_KEY, JSON.stringify({ f:U.f, sort:U.sort, gscale:U.gscale })); } catch(e){} };

  // ---------- модель: живые задачи и задачи мира в одном виде ----------
  function vmLive(r){
    const st = stCode(r.status), created = r.day != null ? r.day : at();
    const due = r.due != null ? r.due : created + (r.days != null ? +r.days : 3);
    let doneDay = r.doneDay != null ? r.doneDay : null;
    if (st === 'done' && doneDay == null){ const h = arr(r.hist).filter(x => x.to === r.status || x.what === 'status').pop(); doneDay = h && h.day != null ? h.day : created; }
    const a = r.author && r.author.role ? r.author : { role: r.role, by: r.by || null };
    return { id:r.id, no:r.no || '—', title:String(r.title || ''), desc:String(r.desc || ''), author:a, owner:r.owner || r.role, co:arr(r.co), watchers:arr(r.watchers),
      start: r.start != null ? r.start : created, due, dueT: r.dueT || '', pr: prCode(r.pr), tags: arr(r.tags), st, checklist: arr(r.checklist), parent: r.parent || null, deps: arr(r.deps),
      time: { est: +(r.time && r.time.est) || 0, spent: arr(r.time && r.time.spent) }, comments: arr(r.comments), files: arr(r.files), hist: arr(r.hist), repeat: r.repeat && r.repeat.kind ? r.repeat : null,
      project: r.project || null, obj: r.obj || objIn(r.title), src: r.src || SRC.manual, link: r.link || null, created, doneDay, reason: r.cancelReason || '', prev: r.prev || null, nextId: r.nextId || null, ts: r.ts || 0, live:true };
  }
  function vmWorld(x, a){
    const done = x.done <= a, st = done ? 'done' : (x.status ? stCode(x.status) : 'work');
    return { id:'w:' + x.no, no:x.no, title:x.title, desc:'', author:{ role:null }, owner:x.owner, co:[], watchers:[], start:x.created, due:x.due, dueT:'', pr:prCode(x.pr), tags:[], st,
      checklist:[], parent:null, deps:[], time:{ est:0, spent:[] }, comments:[], files:[], hist:[], repeat:null, project:null, obj:objIn(x.title), src:x.src, link:null, created:x.created,
      doneDay: done ? x.done : null, wait: !!x.wait, story: !!x.story, ts:0, world:true };
  }
  // задачи мира, «живые» в окне [from, to]: открытые на to и выполненные в окне; статус — на дату to
  function wlist(from, to){
    if (to < 0) return [];
    const m = new Map();
    W.tasksAt(to).forEach(x => m.set(x.no, x));
    W.tasksDone(Math.max(0, from), to).forEach(x => { if (!m.has(x.no) && x.created <= to) m.set(x.no, x); });
    return [...m.values()].map(x => vmWorld(x, to));
  }
  const parts = x => [x.author && x.author.role, x.owner, ...x.co, ...x.watchers].filter(Boolean);
  const mine = x => parts(x).includes(me()) || (!!uid() && x.author && x.author.by === uid());
  const isExec = x => x.owner === me() || x.co.includes(me());
  // права: П и Ч — все задачи; Б — свой блок (группа ролей) и область роли; С — только свои, начальник объекта — ещё задачи своего объекта
  function canView(x){
    const r = rl(), lv = lvl();
    if (lv === '·') return false;
    if (lv === 'П' || lv === 'Ч') return true;
    if (mine(x)) return true;
    if (lv === 'С') return r.id === 'obj' && x.obj === K.roles.MYOBJ;
    const inBlock = parts(x).some(n => { const q = K.roles.ROLES.find(z => z.name === n); return q && q.grp === r.grp; });
    if (!inBlock) return false;
    const sc = K.roles.SC();
    if (sc.regions && x.obj){ const o = W.objects.find(z => z.name === x.obj); return !!(o && sc.regions.includes(o.region)); }
    return true;
  }
  let ver = 0; const cache = { key:null, v:null };
  function data(){
    const a = at(), R0 = K.RNG, k = [a, R0.from, R0.to, K.S.role, ver, Live.data.tasks.length, Live.data.uid].join('|');
    if (cache.key === k) return cache.v;
    const live = Live.data.tasks.filter(r => r && r.title != null && (r.day == null || r.day <= a)).map(vmLive);
    cache.v = [...live, ...wlist(Math.min(R0.from, a), a)].filter(canView); cache.key = k;
    return cache.v;
  }
  function byIdRaw(id){
    if (!id) return null;
    if (String(id).startsWith('w:')) return data().find(x => x.id === id) || null;
    const r = Live.byId('tasks', id); return r ? vmLive(r) : null;
  }
  // В1: задача видна только в правах роли — та же проверка canView, что у списков (уровень С — только свои, начальник объекта — свой объект)
  function byId(id){ const x = byIdRaw(id); return x && canView(x) ? x : null; }
  const isOverdue = (x, a = at()) => OPEN(x.st) && x.due < a;
  const doneIn = (list, from, to) => list.filter(x => x.st === 'done' && x.doneDay != null && x.doneDay >= from && x.doneDay <= to);
  const onTime = x => x.doneDay != null && x.doneDay <= x.due;
  const pctOnTime = list => list.length ? list.filter(onTime).length / list.length * 100 : null;
  const spentMin = x => x.time.spent.reduce((s, e) => s + (+e.min || 0), 0);
  const chk = x => { const n = x.checklist.length, d = x.checklist.filter(c => c.done).length; return { n, d }; };
  const kids = x => data().filter(y => y.parent === x.id);
  const overdueDays = x => Math.max(0, at() - x.due);

  // права на действия по задаче (3.2.2): постановщик и П — всё; исполнитель — статус до проверки, чек-лист, время, файлы, комментарии;
  // соисполнители — как исполнитель без статуса; наблюдатели — комментарии; Ч, «только просмотр» и задачи мира — без действий
  function perms(x){
    const lv = lvl(), n = me(), ro = !!Live.data.ro || lv === 'Ч' || lv === '·';
    if (!x || x.world || ro) return { view:true };
    const full = lv === 'П', A = x.author.role === n || (!!uid() && x.author.by === uid()), O = x.owner === n, C = x.co.includes(n), Wt = x.watchers.includes(n);
    return { view:true, edit: full || A, desc: full || A || O, status: full || A || O, accept: full || A, work: full || A || O || C, comment: full || A || O || C || Wt || lv === 'Б', A, O, C, Wt, full };
  }
  const canCreate = () => !Live.data.ro && ['П','Б','С'].includes(lvl());
  const selfOnly = () => lvl() === 'С';
  function allowed(x, to){
    if (!x || x.world || !FLOW[x.st] || !FLOW[x.st].includes(to)) return false;
    const p = perms(x);
    if (to === 'done' || to === 'cancel' || (x.st === 'review' && to === 'work')) return !!p.accept;
    return !!p.status;
  }
  const actLabel = (x, to) => t('act.' + (to === 'work' ? (x.st === 'review' ? 'return' : (x.st === 'hold' ? 'resume' : 'start')) : (to === 'done' ? (x.st === 'review' ? 'accept' : 'finish') : to)));

  // ---------- действия: всё через Live (add/update), каждое изменение — строка в hist и в журнале ----------
  const histEntry = (what, ex) => clean({ ts: Date.now(), day: at(), role: me(), by: uid(), name: Live.data.me || null, what, ...(ex || {}) });
  async function patch(x, p, what, ex){
    const r = Live.byId('tasks', x.id); if (!r) return false;
    const h = histEntry(what, ex);
    const ok = await Live.update('tasks', x.id, clean({ ...p, hist: [...arr(r.hist), h].slice(-200) }), clean({ action: t('h.' + what), from: ex && ex.from, to: ex && ex.to }));
    return ok === true || (ok && ok.ok !== false);
  }
  function rowOf(o){
    const a0 = at(), r = rl(), owner = o.owner || (selfOnly() ? r.name : K.roles.OWNER_OF.tasks);
    const due = o.due != null ? o.due : a0 + (o.days != null ? +o.days : 3), start = o.start != null ? Math.min(o.start, due) : Math.min(a0, due);
    const st = ST[o.st] ? o.st : (o.status ? stCode(o.status) : 'new');
    return clean({ title: String(o.title || '').trim().slice(0, 160), desc: String(o.desc || '').slice(0, 4000), author: o.author || { role: r.name, by: uid(), name: Live.data.me || null },
      owner, co: arr(o.co).filter(n => n !== owner).slice(0, 20), watchers: arr(o.watchers).slice(0, 20), start, due, dueT: o.dueT || '', pr: PR[prCode(o.pr)], tags: arr(o.tags).map(s => String(s).trim()).filter(Boolean).slice(0, 10),
      status: ST[st], checklist: arr(o.checklist).slice(0, 50).map((c, i) => ({ id: 'c' + Date.now().toString(36) + i, text: String(c.text || c).slice(0, 200), done: false })), parent: o.parent || null, deps: arr(o.deps),
      time: { est: Math.max(0, Math.round(+o.est || 0)), spent: [] }, comments: [], files: [], hist: [histEntry('created')], repeat: o.repeat && o.repeat.kind ? o.repeat : null,
      project: o.project || null, obj: o.obj || null, src: SRC[o.src] || o.src || SRC.manual, link: o.link || null, prev: o.prev || null, day: o.day != null ? o.day : a0 });
  }
  async function create(o){
    if (!canCreate() && o.src !== 'repeat') return null;
    const row = rowOf(o); if (!row.title) return null;
    const r = await Live.add('tasks', row);
    ver++;
    return r;
  }
  async function setStatus(x, to, reason){
    if (!allowed(x, to)) return false;
    if (to === 'cancel' && !String(reason || '').trim()) return false;
    const p = { status: ST[to] };
    if (to === 'done'){ p.doneDay = at(); p.done = Date.now(); }
    if (to === 'cancel') p.cancelReason = String(reason).trim().slice(0, 500);
    const ok = await patch(x, p, 'status', { from: ST[x.st], to: ST[to], note: p.cancelReason });
    if (ok && to === 'done' && x.repeat) await spawnNext(x);
    return ok;
  }
  function shiftDay(d, rp){
    const n = Math.max(1, Math.round(+rp.every || 1));
    if (rp.kind === 'daily') return d + n;
    if (rp.kind === 'weekly') return d + 7 * n;
    const y = W.yOf(d), m = W.mOf(d), dd = W.dOf(d);
    return Math.min(W.idxOf(y, m + n, dd), W.idxOf(y, m + n + 1, 1) - 1);
  }
  // повтор (3.2.7): выполненная задача с repeat создаёт следующую — срок по правилу, src «повтор», ссылка на предыдущую
  async function spawnNext(x){
    if (Live.data.tasks.some(r => r.prev === x.id)) return null;
    const rp = x.repeat, due = shiftDay(x.due, rp);
    if (rp.until != null && due > rp.until) return null;
    const row = await create({ title:x.title, desc:x.desc, owner:x.owner, co:x.co, watchers:x.watchers, start: shiftDay(x.start, rp), due, dueT:x.dueT, pr:x.pr, tags:x.tags,
      checklist: x.checklist.map(c => c.text), est:x.time.est, project:x.project, obj:x.obj, repeat:rp, src:'repeat', prev:x.id, author:x.author, st:'new' });
    if (row && row.id) await patch(x, { nextId: row.id }, 'repeat', { note: row.no || '' });
    return row;
  }
  async function addCheck(x, text){ const s = String(text || '').trim().slice(0, 200); if (!s || x.checklist.length >= 50) return false; return patch(x, { checklist: [...x.checklist, { id:'c' + Date.now().toString(36), text:s, done:false }] }, 'checklist', { note: s }); }
  async function toggleCheck(x, id){
    const list = x.checklist.map(c => c.id === id ? clean({ ...c, done: !c.done, by: me(), ts: Date.now() }) : c), c = list.find(z => z.id === id); if (!c) return false;
    return patch(x, { checklist: list }, 'checklist', { note: (c.done ? '✓ ' : '○ ') + c.text });
  }
  async function addTime(x, min, note){ const m = Math.round(+min || 0); if (!(m > 0 && m <= 24 * 60)) return false; const e = clean({ by: uid(), role: me(), name: Live.data.me || null, min: m, ts: Date.now(), day: at(), note: String(note || '').slice(0, 200) }); return patch(x, { time: { est: x.time.est, spent: [...x.time.spent, e] } }, 'time', { note: hours(m) }); }
  async function setEst(x, min){ const m = Math.max(0, Math.round(+min || 0)); return patch(x, { time: { est: m, spent: x.time.spent } }, 'est', { from: String(x.time.est), to: String(m) }); }
  const MENTION = () => new RegExp('@(' + roleNames().map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'g');
  async function addComment(x, text, files){
    const s = String(text || '').trim().slice(0, 4000); if (!s && !arr(files).length) return false; if (x.comments.length >= 200) return false;
    const mentions = [...new Set([...s.matchAll(MENTION())].map(m => m[1]))];
    const c = clean({ id: 'm' + Date.now().toString(36), by: uid(), role: me(), name: Live.data.me || null, ts: Date.now(), text: s, files: arr(files), mentions, editHist: [] });
    return patch(x, { comments: [...x.comments, c] }, 'comment', { note: s.slice(0, 80) });
  }
  const EDIT_MS = 5 * 60 * 1000;
  const canEditC = c => !!c && (uid() ? c.by === uid() : c.role === me()) && Date.now() - c.ts <= EDIT_MS && !Live.data.ro;
  async function editComment(x, id, text){
    const c = x.comments.find(z => z.id === id), s = String(text || '').trim().slice(0, 4000);
    if (!canEditC(c) || !s || s === c.text) return false;
    const list = x.comments.map(z => z.id === id ? clean({ ...z, text: s, editedAt: Date.now(), editHist: [...arr(z.editHist), { ts: z.editedAt || z.ts, text: z.text }].slice(-10) }) : z);
    return patch(x, { comments: list }, 'comment_edit', { note: s.slice(0, 80) });
  }
  async function attach(kind, x, fileList, done){
    const fs = [...(fileList || [])].slice(0, 10), ids = [], errs = [];
    for (const f of fs){ try { const m = await window.FileStore.put(f, { attachedTo: [{ kind, id: x.id }], obj: x.obj || null }); if (m && m.id) ids.push(m.id); if (m && m.warn) errs.push(m.warn); } catch(e){ errs.push((e && e.message) || t('file.err')); } }
    if (ids.length) await done(ids);
    return errs;
  }
  const attachTask = (x, files) => attach('task', x, files, ids => patch(x, { files: [...x.files, ...ids] }, 'file', { note: ids.map(id => (Live.byId('files', id) || {}).name).join(', ') }));

  // ---------- проекты: живые (LIVE.projects) и проекты мира (projectsAt) в одном виде ----------
  const hash = s => { let h = 0; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h.toString(36); };
  function vmPj(r){
    const a = at(), from = r.from != null ? r.from : (r.day != null ? r.day : a), to = r.to != null ? r.to : from + 30;
    return { id:r.id, no:r.no || '—', name:String(r.name || ''), goal:String(r.goal || ''), lead:r.lead || r.role, members:arr(r.members), from, to,
      stages: arr(r.stages), milestones: arr(r.milestones), budget: { plan: +(r.budget && r.budget.plan) || 0 }, risks: arr(r.risks), st: pjCode(r.status), comments: arr(r.comments), files: arr(r.files), hist: arr(r.hist), created: r.day != null ? r.day : a, live:true };
  }
  // бюджет проектов мира — из статей бюджета (3.2.4): форма → закупка формы, автомобили → лизинг, тендер → выручка новых объектов за срок проекта
  function wpBudget(p, a){
    const L = K.data.LINES, n = p.name, end = Math.min(a, p.to), line = id => [...L.supply, ...L.fleet].find(l => l[0] === id);
    const pf = id => { const l = line(id); return l ? { plan: -K.data.sumLines([l], p.from, p.to, true), fact: end >= p.from ? -K.data.sumLines([l], p.from, end, false) : 0, kind:'line', line: l[1] } : null; };
    if (/форма/i.test(n)) return pf(41);
    if (/автомобил/i.test(n)) return pf(82);
    if (/тендер/i.test(n)){ const os = W.objects.filter(o => o.start >= p.from && o.start <= p.to); return { plan: 0, fact: end >= p.from ? os.reduce((s, o) => s + W.objView(o, p.from, end, end).rev, 0) : 0, kind:'rev', n: os.length }; }
    return null;
  }
  function vmWp(p, a){
    const span = Math.max(1, p.to - p.from), len = p.stages.length, done = a >= p.to;
    return { id:'wp:' + p.from + ':' + hash(p.name), no:'—', name:p.name, goal:'', lead:p.owner, members:[p.owner], from:p.from, to:p.to,
      stages: p.stages.map((s, i) => ({ id:'s' + i, name:s, from: Math.round(p.from + span * i / len), to: Math.round(p.from + span * (i + 1) / len) - (i + 1 < len ? 1 : 0), done: i < p.stDone })),
      milestones: [{ id:'m0', name: p.stages[len - 1], day: p.to, done }], budget: wpBudget(p, a), risks: [], st: done ? 'done' : 'work', comments:[], files:[], hist:[], prog:p.prog, late:p.late, world:true, created:p.from };
  }
  function projects(){
    const a = at();
    const live = Live.data.projects.filter(r => r && r.name && (r.day == null || r.day <= a)).map(vmPj);
    const world = (K.data.projectsAt(a) || []).map(p => vmWp(p, a));
    return [...live, ...world].filter(pjVisible);
  }
  const pjParts = p => [p.lead, ...p.members];
  function pjVisible(p){
    const lv = lvl(), r = rl(); if (lv === '·') return false; if (lv === 'П' || lv === 'Ч') return true;
    if (pjParts(p).includes(me())) return true;
    if (lv === 'С') return data().some(x => x.project === p.id);
    return pjParts(p).some(n => { const q = K.roles.ROLES.find(z => z.name === n); return q && q.grp === r.grp; });
  }
  const pjById = id => { if (!id) return null; if (String(id).startsWith('wp:')) return projects().find(p => p.id === id) || (K.data.projectsAt(at()) || []).map(p => vmWp(p, at())).find(p => p.id === id) || null; const r = Live.byId('projects', id); return r ? vmPj(r) : null; };
  const pjName = id => { const p = pjById(id); return p ? esc(p.world ? wtx(p.name) : p.name) : (id ? '—' : ''); };
  // задачи проекта: живые с project = id; у проектов мира — ещё выборка задач мира по владельцу и сроку проекта
  function pjTasks(p){
    const a = at(), own = p.lead === roleById('gb') ? roleById('buh') : p.lead;
    const live = data().filter(x => x.project === p.id);
    if (!p.world) return live;
    const ws = wlist(p.from, Math.max(p.from, a)).filter(x => x.owner === own && x.created >= p.from && x.created <= Math.min(p.to, a)).filter(canView);
    return [...live, ...ws];
  }
  const pjPays = p => Live.data.pays.filter(r => r && r.project === p.id);
  function pjBudget(p){
    if (p.world) return p.budget;
    const pays = pjPays(p), route = r => K.data.payRoute(r.amount), paid = pays.filter(r => r.stage >= route(r).length - 1);
    return { plan: p.budget.plan, fact: pays.reduce((s, r) => s + (+r.amount || 0), 0), paid: paid.reduce((s, r) => s + (+r.amount || 0), 0), n: pays.length, kind:'pays' };
  }
  function pjProgress(p){
    if (p.world) return p.prog;
    const ts = pjTasks(p).filter(x => x.st !== 'cancel'), td = ts.filter(x => x.st === 'done').length, sd = p.stages.filter(s => s.done).length, n = ts.length + p.stages.length;
    return n ? (td + sd) / n : (p.st === 'done' ? 1 : 0);
  }
  // отклонение, дн.: по этапам — фактическая дата выполнения (или сегодня для открытых просроченных) минус плановая
  function pjDev(p){
    const a = at();
    if (p.world){ const span = Math.max(1, p.to - p.from), exp = Math.min(1, Math.max(0, (a - p.from) / span)); return Math.max(0, Math.round((exp - p.prog) * span)); }
    return p.stages.reduce((m, s) => Math.max(m, s.done ? Math.max(0, (s.doneDay != null ? s.doneDay : s.to) - s.to) : Math.max(0, a - s.to)), 0);
  }
  const pjPerms = p => { const lv = lvl(), ro = !!Live.data.ro || lv === 'Ч' || lv === '·'; if (!p || p.world || ro) return { view:true }; const full = lv === 'П', L = p.lead === me(), mem = p.members.includes(me()); return { view:true, edit: full || L, work: full || L || mem, comment: full || L || mem || lv === 'Б' }; };
  const canCreatePj = () => !Live.data.ro && ['П','Б'].includes(lvl());
  async function pjPatch(p, patchObj, what, ex){
    const r = Live.byId('projects', p.id); if (!r) return false;
    const ok = await Live.update('projects', p.id, clean({ ...patchObj, hist: [...arr(r.hist), histEntry(what, ex)].slice(-200) }), clean({ action: t('h.' + what), from: ex && ex.from, to: ex && ex.to }));
    ver++;
    return ok === true || (ok && ok.ok !== false);
  }
  async function createPj(o){
    if (!canCreatePj()) return null;
    const a0 = at(), from = o.from != null ? o.from : a0, to = Math.max(from + 1, o.to != null ? o.to : from + 60);
    const names = arr(o.stages).map(s => String(s).trim()).filter(Boolean).slice(0, 20), span = to - from;
    const stages = names.map((n, i) => ({ id: 's' + i + Date.now().toString(36), name: n.slice(0, 120), from: Math.round(from + span * i / names.length), to: Math.round(from + span * (i + 1) / names.length), done: false }));
    const row = clean({ name: String(o.name || '').trim().slice(0, 160), goal: String(o.goal || '').slice(0, 600), lead: o.lead || me(), members: [...new Set(arr(o.members))].slice(0, 30), from, to, stages,
      milestones: o.ms && o.ms.name ? [{ id: 'm' + Date.now().toString(36), name: String(o.ms.name).slice(0, 120), day: o.ms.day != null ? o.ms.day : to, done: false }] : [],
      budget: { plan: Math.max(0, +o.plan || 0), currency: 'KZT' }, risks: [], status: PJ.work, files: [], comments: [], hist: [histEntry('created')], day: a0 });
    if (!row.name) return null;
    const r = await Live.add('projects', row); ver++;
    return r;
  }

  // ---------- регламенты с контрольными точками — повторяющиеся задачи мира (серии в календаре и Гантте) ----------
  const ROUT = [
    { k:'meet', kind:'weekly', dow:1, role:'sec', time:'09:00' }, { k:'tabel', kind:'monthly', dom:3, role:'hr' }, { k:'salary', kind:'monthly', dom:5, role:'buh' },
    { k:'close', kind:'monthly', dom:10, role:'gb' }, { k:'taxes', kind:'monthly', dom:25, role:'buh' },
  ];
  function routDays(r, from, to){
    const out = [];
    if (r.kind === 'weekly'){ for (let d = from; d <= to; d++) if (W.toDate(d).getUTCDay() === r.dow) out.push(d); return out; }
    for (let y = W.yOf(from), m = W.mOf(from); W.idxOf(y, m, 1) <= to; m++){ const d = W.idxOf(y, m, r.dom); if (d >= from && d <= to) out.push(d); }
    return out;
  }
  const routVisible = r => lvl() !== 'С' || roleById(r.role) === me();
  function routines(from, to){ return ROUT.filter(routVisible).flatMap(r => routDays(r, Math.max(0, from), to).map(d => ({ day:d, r, title: t('r.' + r.k), owner: roleById(r.role) }))); }

  // ======================= представления =======================
  const TABS = ['overview','list','kanban','gantt','my','cal','projects','reports','journal'];
  const tabHash = k => k === 'overview' ? '#tasks' : '#tasks-' + k;
  const head = (cur, sub) => K.ui.h1(t('title'), sub) + `<nav class="tabs tk-tabs" aria-label="${esc(t('tabs'))}">${TABS.map(k => `<a href="${tabHash(k)}" class="${k === cur ? 'on' : ''}">${t('tab.' + k)}</a>`).join('')}</nav>`;
  const empty = (txt, act) => `<div class="tk-empty"><span aria-hidden="true">☐</span><p>${txt}</p>${act || ''}</div>`;
  const newBtn = () => canCreate() ? `<button type="button" class="tk-btn tk-primary" data-a="newTask">${t('btn.new')}</button>` : '';
  const roNote = () => Live.data.ro ? `<p class="banner-info tk-ban">${t('ro')}</p>` : (lvl() === 'Ч' ? `<p class="banner-info tk-ban">${t('read_only', { r: rn(me()) })}</p>` : '');
  const CSV = {};
  const csvBtn = k => `<button type="button" class="tk-btn tk-quiet" data-a="csv" data-k="${k}">CSV</button>`;
  function csvDownload(k){
    const c = CSV[k]; if (!c) return;
    const txt = s => String(s == null ? '' : s).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
    const s = '﻿' + [c.head, ...c.rows].map(r => r.map(v => '"' + txt(v).replace(/"/g, '""') + '"').join(';')).join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([s], { type:'text/csv;charset=utf-8' })); a.download = c.name + '.csv';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  }
  const fileStamp = () => `${iso(K.RNG.from)}_${iso(K.RNG.to)}`;

  // таблица раздела: сортировка по заголовку (aria-sort), «показать ещё 25», итог в tfoot, CSV; строка → карточка задачи / проекта
  function tbl(k, cols, rows, o = {}){
    const s = U.sort[k] || o.sort || null, lim = U.lim[k] || 25;
    let rs = rows.slice();
    if (s){ const c = cols.find(z => z.k === s.k); if (c){ const v = r => r.v[c.k] != null ? r.v[c.k] : ''; rs.sort((a, b) => { const x = v(a), y = v(b); const d = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), I.locale); return s.dir === 'desc' ? -d : d; }); } }
    CSV[k] = { name: (o.csv || k) + '_' + fileStamp(), head: cols.map(c => c.h), rows: rs.map(r => cols.map(c => r.c[c.k] != null ? r.c[c.k] : '')).concat(o.total ? [cols.map(c => o.total[c.k] != null ? o.total[c.k] : '')] : []) };
    const shown = o.all ? rs : rs.slice(0, lim);
    const th = c => { const dir = s && s.k === c.k ? s.dir : null; return `<th class="${c.num ? 'num' : ''}${c.lo ? ' lo' : ''}" aria-sort="${dir === 'asc' ? 'ascending' : (dir === 'desc' ? 'descending' : 'none')}"${c.tip ? ` title="${esc(c.tip)}"` : ''}><button type="button" class="tk-th" data-a="sort" data-k="${k}" data-c="${c.k}">${c.h}</button></th>`; };
    const tr = r => `<tr class="rowlink"${r.tk ? ` data-tk="${esc(r.tk)}"` : ''}${r.pj ? ` data-pj="${esc(r.pj)}"` : ''}${r.ow ? ` data-ow="${esc(r.ow)}"` : ''} tabindex="0">${cols.map(c => `<td class="${c.num ? 'num' : ''}${c.lo ? ' lo' : ''}">${r.c[c.k] != null ? r.c[c.k] : '—'}</td>`).join('')}</tr>`;
    const grp = o.group ? (() => { const g = new Map(); shown.forEach(r => { const key0 = r.g || '—'; if (!g.has(key0)) g.set(key0, []); g.get(key0).push(r); }); return [...g].map(([n, list]) => `<tr class="tk-grp rowlink" data-noop="1" tabindex="-1"><th colspan="${cols.length}" scope="rowgroup">${n} <small>${N(list.length)}</small></th></tr>` + list.map(tr).join('')).join(''); })() : shown.map(tr).join('');
    const foot = o.total ? `<tfoot><tr class="tk-total">${cols.map(c => `<td class="${c.num ? 'num' : ''}${c.lo ? ' lo' : ''}">${o.total[c.k] != null ? o.total[c.k] : ''}</td>`).join('')}</tr></tfoot>` : '';
    const more = !o.all && rs.length > lim ? `<div class="tk-more"><button type="button" class="tk-btn" data-a="more" data-k="${k}">${t('more', { n: Math.min(25, rs.length - lim) })}</button><button type="button" class="tk-btn tk-quiet" data-a="moreall" data-k="${k}">${t('all_n', { n: N(rs.length) })}</button></div>` : '';
    return `<div class="tw"><table class="tbl tk-tbl"><thead><tr>${cols.map(th).join('')}</tr></thead><tbody>${grp || `<tr class="rowlink" data-noop="1" tabindex="-1"><td colspan="${cols.length}" class="tk-none">${t('none')}</td></tr>`}</tbody>${foot}</table></div>${more}`;
  }

  // ---------- фильтры (список, канбан) ----------
  function applyF(list, noSt){
    const f = U.f, a = at(), q = f.q.trim().toLowerCase();
    return list.filter(x => {
      if (!noSt && (f.st === 'open' ? !OPEN(x.st) : (f.st !== 'all' && f.st && x.st !== f.st))) return false;
      if (f.owner && !(x.owner === f.owner || x.co.includes(f.owner))) return false;
      if (f.project && (f.project === '-' ? x.project : x.project !== f.project)) return false;
      if (f.tag && !x.tags.includes(f.tag)) return false;
      if (f.overdue && !isOverdue(x, a)) return false;
      if (f.created === 'period' && !(x.created >= K.RNG.from && x.created <= K.RNG.to)) return false;
      if (f.created === 'live' && !x.live) return false;
      if (f.created === 'world' && !x.world) return false;
      if (q && !(x.no + ' ' + x.title + ' ' + x.owner + ' ' + x.tags.join(' ')).toLowerCase().includes(q)) return false;
      return true;
    });
  }
  const opt = (v, txt, cur) => `<option value="${esc(v)}"${String(v) === String(cur) ? ' selected' : ''}>${txt}</option>`;
  function filters(list, withSt = true){
    const f = U.f, owners = [...new Set(list.flatMap(x => [x.owner, ...x.co]))].filter(Boolean).sort(), tags = [...new Set(list.flatMap(x => x.tags))].sort(), pjs = projects();
    const nOn = [f.owner, f.project, f.tag, f.overdue, f.created !== 'all', f.q].filter(Boolean).length;
    return `<details class="tk-fdet"${window.innerWidth > 600 || nOn ? ' open' : ''}><summary>${t('f.title')}${nOn ? ' · ' + N(nOn) : ''}</summary><div class="tk-filters" role="group" aria-label="${esc(t('f.title'))}">
      ${withSt ? `<label>${t('f.st')}<select data-tf="st">${opt('open', t('f.open'), f.st)}${opt('all', t('f.all'), f.st)}${[...COLS, ...FOLD].map(c => opt(c, stName(c), f.st)).join('')}</select></label>` : ''}
      <label>${t('f.owner')}<select data-tf="owner">${opt('', t('f.any'), f.owner)}${owners.map(n => opt(n, rn(n), f.owner)).join('')}</select></label>
      <label>${t('f.project')}<select data-tf="project">${opt('', t('f.any'), f.project)}${opt('-', t('f.no_project'), f.project)}${pjs.map(p => opt(p.id, esc(p.world ? wtx(p.name) : p.name), f.project)).join('')}</select></label>
      <label>${t('f.tag')}<select data-tf="tag">${opt('', t('f.any'), f.tag)}${tags.map(s => opt(s, esc(s), f.tag)).join('')}</select></label>
      <label>${t('f.created')}<select data-tf="created">${['all','period','live','world'].map(v => opt(v, t('f.c.' + v), f.created)).join('')}</select></label>
      <label class="tk-chk"><input type="checkbox" data-tf="overdue"${f.overdue ? ' checked' : ''}> ${t('f.overdue')}</label>
      <label class="tk-q">${t('f.q')}<input type="search" data-tf="q" value="${esc(f.q)}" placeholder="${esc(t('f.q_ph'))}" maxlength="80"></label>
      <button type="button" class="tk-btn tk-quiet" data-a="freset">${t('f.reset')}</button></div></details>`;
  }

  // ---------- плитки и форма быстрой постановки ----------
  function tiles(list){
    const a = at(), R0 = K.RNG, open = list.filter(x => OPEN(x.st)), od = open.filter(x => isOverdue(x, a)), done = doneIn(list, R0.from, R0.to), pt = pctOnTime(done);
    const created = list.filter(x => x.created >= R0.from && x.created <= R0.to).length;
    const bw = R0.prev || R0.yago, prevC = bw ? wlist(bw.from, bw.to).filter(canView).filter(x => x.created >= bw.from && x.created <= bw.to).length + Live.data.tasks.filter(r => r.day >= bw.from && r.day <= bw.to).map(vmLive).filter(canView).length : null;
    const avg = done.length ? done.reduce((s, x) => s + (x.doneDay - x.created), 0) / done.length : 0;
    return `<div class="tiles">${K.ui.tile(t('tile.control', { d: dt(a) }), N(open.length), [t('tile.control_d', { u: N(open.filter(x => x.pr === 'urgent').length), h: N(open.filter(x => x.pr === 'high').length) })], 'var(--accent)', null, 'tasks-list')}`
      + K.ui.tile(t('tile.overdue'), N(od.length), [od.slice(0, 2).map(x => `${esc(x.no)} — ${dts(x.due)}`).join(' · ') || t('none')], 'var(--bad)', null, 'tasks-my')
      + K.ui.tile(t('tile.done'), N(done.length), [t('tile.done_d', { p: pt == null ? '—' : P(pt), d: F1(avg) })], 'var(--good)', null, 'tasks-reports')
      + K.ui.tile(t('tile.created'), N(created), [prevC == null ? t('no_base') : t(bw === R0.prev ? 'tile.vs_prev' : 'tile.vs_yago', { d: K.data.delta(created, prevC) })], 'var(--info)', null, 'tasks-journal') + `</div>`;
  }
  const ownerOpts = (cur, all) => (all || !selfOnly() ? roleNames() : [me()]).map(n => opt(n, rn(n), cur)).join('');
  const pjOpts = cur => opt('', t('f.no_project'), cur || '') + projects().filter(p => p.live && !['done','closed'].includes(p.st)).map(p => opt(p.id, esc(p.name), cur)).join('') + projects().filter(p => p.world && p.st !== 'done').map(p => opt(p.id, esc(wtx(p.name)), cur)).join('');
  function quickForm(){
    if (!canCreate()) return '';
    const own = selfOnly() ? me() : K.roles.OWNER_OF.tasks;
    return K.ui.card(t('new_task'), `<form class="lform tk-qf" id="tkForm" novalidate><input id="tkTitle" maxlength="160" placeholder="${esc(t('ph.title'))}" required aria-label="${esc(t('fld.title'))}">
      <select id="tkOwner" aria-label="${esc(t('fld.owner'))}">${ownerOpts(own)}</select><select id="tkDays" aria-label="${esc(t('fld.due'))}">${[1,3,7,14].map(d => opt(d, t('days.' + d), 3)).join('')}</select>
      <select id="tkPr" aria-label="${esc(t('fld.pr'))}">${Object.keys(PR).map(c => opt(c, prName(c), 'mid')).join('')}</select><button type="submit" class="btn">${t('btn.put')}</button>
      <button type="button" class="tk-btn" data-a="newTask">${t('btn.full')}</button></form><p class="lnote" id="tkFormNote" aria-live="polite">${esc(Live.note())} · ${t('pdn')}</p>`);
  }

  // ---------- канбан (3.2.3): колонки по статусам, перетаскивание мышью и кнопки «→» для клавиатуры и телефона ----------
  function kcard(x){
    const p = perms(x), nx = (FLOW[x.st] || []).filter(to => to !== 'cancel' && to !== 'hold' && allowed(x, to)), c = chk(x), od = isOverdue(x);
    const btns = nx.map(to => `<button type="button" class="btn" data-tnext="${esc(x.id)}" data-to="${to}" aria-label="${esc(actLabel(x, to) + ': ' + x.no)}">→ ${actLabel(x, to)}</button>`).join('');
    return `<div class="tk tk-card${x.live ? ' live' : ''}${x.pr === 'urgent' ? ' urgent' : ''}${od ? ' tk-od' : ''}" data-tk="${esc(x.id)}" tabindex="0"${p.status || p.accept ? ' data-drag="1"' : ''}>
      <b>${esc(x.no)}</b> ${ttl(x)}<small>${rn(x.owner)} · ${t('due_s', { d: dts(x.due) })}${x.dueT ? ' ' + esc(x.dueT) : ''}${od ? ` · <span class="dn">${t('od_n', { n: N(overdueDays(x)) })}</span>` : ''}${c.n ? ` · ☑ ${c.d}/${c.n}` : ''}${x.world ? ` · ${t('from_world')}` : ''}</small>${btns ? `<span class="tkact">${btns}</span>` : ''}</div>`;
  }
  function kanban(list, lim){
    const R0 = K.RNG, a = at();
    const inCol = c => list.filter(x => x.st === c && (c !== 'done' || (x.doneDay >= a - 6 && x.doneDay <= a)));
    const sorted = c => inCol(c).sort((x, y) => (c === 'done' ? y.doneDay - x.doneDay : ((y.pr === 'urgent') - (x.pr === 'urgent') || x.due - y.due)));
    const col = c => { const all = sorted(c), shown = lim ? all.slice(0, lim) : all; return `<div class="col tk-col" data-st="${c}" role="group" aria-label="${esc(stName(c))}"><h3>${stName(c)} <span>${N(all.length)}</span>${c === 'done' ? ` <small>${t('kb.done7')}</small>` : ''}${c === 'work' && U.f.owner && all.length > 5 ? ` <em class="tk-wip" title="${esc(t('wip_t'))}">WIP ${all.length}/5</em>` : ''}</h3>${shown.map(kcard).join('') || `<p class="tk-colnone">${t('none')}</p>`}${all.length > shown.length ? `<a class="tk-colmore" href="#tasks-list">${t('more_in_list', { n: N(all.length - shown.length) })}</a>` : ''}</div>`; };
    const fold = FOLD.map(c => ({ c, n: inCol(c).length }));
    return `<div class="kanban tk-kb">${COLS.map(col).join('')}</div><details class="tk-fold"><summary>${fold.map(z => `${stName(z.c)} · ${N(z.n)}`).join(' · ')}</summary><div class="kanban tk-kb">${FOLD.map(col).join('')}</div></details>`;
  }
  function vOverview(){
    const list = data(), a = at();
    const rt = [[t('r.meet'), t('r.meet_p'), rn(roleById('sec')), dt(K.data.nextMonday(a))], [t('r.tabel'), t('r.tabel_p'), rn(roleById('hr')) + ', ' + rn(roleById('buh')), dt(K.data.nextDay(a, 3))], [t('r.salary'), t('r.salary_p'), rn(roleById('buh')), dt(K.data.nextDay(a, 5))],
      [t('r.taxes'), t('r.taxes_p'), rn(roleById('buh')), dt(K.data.nextDay(a, 25))], [t('r.close'), t('r.close_p'), rn(roleById('gb')), dt(K.data.nextDay(a, 10))], [t('r.check'), t('r.check_p'), rn(roleById('sec')), t('r.check_n', { n: N(K.data.chkIn(a - 29, a).length) })]];
    return head('overview', t('sub.board', { d: dt(a) })) + roNote() + tiles(list) + quickForm()
      + K.ui.card(t('board'), list.length ? kanban(list, 12) : empty(t('empty', { d: dt(a) }), newBtn()), t('board_s', { d: dt(a) }))
      + K.ui.card(t('r.title'), K.ui.table([t('r.h1'), t('r.h2'), t('r.h3'), t('r.h4')], rt), t('r.sub'));
  }
  function vKanban(){
    const list = applyF(data(), true);   // колонки канбана — сами статусы; фильтр статуса списка сюда не применяется (В5)
    return head('kanban', t('sub.kanban')) + roNote() + filters(data(), false) + `<div class="tk-bar">${newBtn()}<span class="lnote">${t('kb_hint')}</span></div>` + K.ui.card(t('board'), kanban(list, U.kbAll ? 0 : 30) + (U.kbAll ? '' : `<button type="button" class="tk-btn tk-quiet" data-a="kball">${t('kb_all')}</button>`), t('board_s', { d: dt(at()) }));
  }

  // ---------- список (3.2.3): через table2, если модуль аналитики подключён, иначе — своя таблица ----------
  const LIST_COLS = () => [{ k:'no', h:t('c.no') }, { k:'title', h:t('c.title') }, { k:'owner', h:t('c.owner') }, { k:'author', h:t('c.author'), lo:true }, { k:'due', h:t('c.due'), num:true }, { k:'pr', h:t('c.pr') }, { k:'st', h:t('c.st') }, { k:'project', h:t('c.project'), lo:true }, { k:'chk', h:t('c.chk'), num:true, lo:true }, { k:'time', h:t('c.time'), num:true, lo:true }];
  function listRow(x){
    const c = chk(x), od = isOverdue(x), sp = spentMin(x);
    return { tk:x.id, g: U.f.group === 'owner' ? rn(x.owner) : (x.project ? pjName(x.project) : t('f.no_project')),
      v: { no:x.no, title:x.title, owner:K.fmt.rn(x.owner), author:x.author.role ? K.fmt.rn(x.author.role) : '', due:x.due, pr:['low','mid','high','urgent'].indexOf(x.pr), st:COLS.concat(FOLD).indexOf(x.st), project:x.project || '', chk: c.n ? c.d / c.n : -1, time: sp },
      c: { no:`<b>${esc(x.no)}</b>${x.world ? ` <small>${t('from_world')}</small>` : ''}${x.parent ? ` <small>↳</small>` : ''}`, title: ttl(x) + (x.tags.length ? ' ' + x.tags.map(s => `<span class="tk-tag">#${esc(s)}</span>`).join(' ') : ''), owner: rn(x.owner) + (x.co.length ? ` <small>+${x.co.length}</small>` : ''),
        author: x.author.role ? who(x.author.role, x.author.name) : `<small>${srcName(x.src)}</small>`, due: `${dt(x.due)}${x.dueT ? ' ' + esc(x.dueT) : ''}${od ? `<br><small class="dn">${t('od_n', { n: N(overdueDays(x)) })}</small>` : ''}`, pr: prPill(x.pr), st: stPill(x.st), project: x.project ? pjName(x.project) : '—',
        chk: c.n ? `${c.d}/${c.n}` : '—', time: x.time.est || sp ? `${hours(sp)} / ${x.time.est ? hours(x.time.est) : '—'}` : '—' } };
  }
  function vList(){
    const list = applyF(data()), rows = list.map(listRow), A = K.module && K.module('analytics');
    let body = null;
    if (A && typeof A.table2 === 'function' && M.useTable2){      // своя таблица по умолчанию: фильтры, «ещё 25», CSV и строка → полная карточка задачи
      try { const out = A.table2({ cols: LIST_COLS().map(c => ({ key:c.k, title:c.h, kind: c.k === 'due' ? 'date' : 'text', lo:c.lo })), rows: rows.map(r => ({ ...r.c, _id:r.tk, _kind:'task' })), total:true, pageSize:25, sortable:true, csv:'tasks_' + fileStamp() }); if (typeof out === 'string' && out.length > 20) body = out; } catch(e){ body = null; }
    }
    if (!body) body = tbl('list', LIST_COLS(), rows, { sort: { k:'due', dir:'asc' }, csv:'tasks', group: !!U.f.group, total: { no: t('total'), title: t('total_n', { n: N(rows.length) }), owner: '', chk: '', time: hours(list.reduce((s, x) => s + spentMin(x), 0)) + ' / ' + hours(list.reduce((s, x) => s + x.time.est, 0)) } });
    const grp = `<label class="tk-inl">${t('f.group')}<select data-tf="group">${opt('', t('g.none'), U.f.group)}${opt('project', t('g.project'), U.f.group)}${opt('owner', t('g.owner'), U.f.group)}</select></label>`;
    return head('list', t('sub.list', { n: N(list.length) })) + roNote() + filters(data()) + `<div class="tk-bar">${newBtn()}${grp}${csvBtn('list')}</div>` + K.ui.card(t('tab.list'), body, t('list_s', { d: dt(at()) }));
  }

  // ---------- Гантт (3.2.3): полосы start–due, зависимости стрелками, линия даты, просрочка — warn, группы по проектам, масштаб ----------
  const GS = { week:{ before:3, len:21, px:36 }, month:{ before:10, len:56, px:16 }, quarter:{ before:30, len:120, px:7 } };
  function ganttLines(list, from, to, all){
    const inWin = x => x.st !== 'cancel' && x.start <= to && Math.max(x.due, x.doneDay != null ? x.doneDay : x.due) >= from && (OPEN(x.st) || x.doneDay >= from);
    const rows = list.filter(inWin).sort((x, y) => x.start - y.start || x.due - y.due), g = new Map();
    rows.forEach(x => { const k = x.project || ''; if (!g.has(k)) g.set(k, []); g.get(k).push(x); });
    const lines = [], LIM = all ? 400 : 60; let n = 0;
    [...g.keys()].sort((a, b) => (a === '') - (b === '') || String(pjName(a)).localeCompare(String(pjName(b)))).forEach(k => { if (n >= LIM) return; lines.push({ kind:'grp', name: k ? pjName(k) : t('f.no_project'), n: g.get(k).length }); g.get(k).slice(0, LIM - n).forEach(x => { lines.push({ kind:'task', x }); n++; }); });
    const rt = routines(from, to), byR = new Map(); rt.forEach(o => { if (!byR.has(o.r.k)) byR.set(o.r.k, []); byR.get(o.r.k).push(o); });
    if (byR.size){ lines.push({ kind:'grp', name: t('r.series'), n: byR.size }); byR.forEach(os => lines.push({ kind:'rout', os })); }
    return { lines, total: rows.length, shown: n };
  }
  function gantt(list, o = {}){
    const sc = GS[U.gscale] || GS.month, a = at(), from = a - sc.before, to = from + sc.len - 1, px = sc.px, RH = 24, HH = 30;
    const { lines, total, shown } = ganttLines(list, from, to, U.gAll);
    const Wd = sc.len * px, H = HH + lines.length * RH, X = d => (d - from) * px, idx = new Map();
    lines.forEach((l, i) => { if (l.kind === 'task') idx.set(l.x.id, i); });
    let g = '';
    for (let d = from; d <= to; d++){
      const wd = W.toDate(d).getUTCDay(), first = W.dOf(d) === 1;
      if ((wd === 0 || wd === 6) && U.gscale !== 'quarter') g += `<rect x="${X(d)}" y="${HH}" width="${px}" height="${H - HH}" class="tk-gwe"/>`;
      const lab = U.gscale === 'week' ? `${W.dOf(d)} ${K.fmt.WD[wd]}` : (U.gscale === 'month' ? (wd === 1 ? dts(d) : '') : (first ? I.month(W.mOf(d)) + (W.mOf(d) === 0 ? ' ' + W.yOf(d) : '') : ''));
      if (lab) g += `<line x1="${X(d)}" x2="${X(d)}" y1="${HH - 6}" y2="${H}" class="tk-gtick"/><text x="${X(d) + 3}" y="${HH - 10}" class="tk-gtx">${esc(lab)}</text>`;
    }
    lines.forEach((l, i) => {
      const y = HH + i * RH;
      if (l.kind === 'grp'){ g += `<rect x="0" y="${y}" width="${Wd}" height="${RH}" class="tk-ggrp"/>`; return; }
      if (l.kind === 'rout'){ l.os.forEach(oc => { const cx = X(oc.day) + px / 2; g += `<path d="M${cx} ${y + 5} L${cx + 6} ${y + 12} L${cx} ${y + 19} L${cx - 6} ${y + 12}Z" class="tk-gms"><title>${esc(oc.title)} · ${dt(oc.day)}</title></path>`; }); return; }
      const x = l.x, s = Math.max(x.start, from), e = Math.min(Math.max(x.due, x.start), to), od = isOverdue(x, a), c = chk(x);
      const cls = x.st === 'done' ? 'done' : (od ? 'od' : (x.st === 'hold' ? 'hold' : 'open'));
      g += `<g data-tk="${esc(x.id)}" class="tk-gbar${x.world ? ' w' : ''}"><rect x="${X(s) + 1}" y="${y + 5}" width="${Math.max(4, X(e + 1) - X(s) - 2)}" height="${RH - 10}" rx="3" class="tk-gb-${cls}"/>`
        + (c.n && OPEN(x.st) ? `<rect x="${X(s) + 1}" y="${y + RH - 8}" width="${Math.max(0, (X(e + 1) - X(s) - 2) * c.d / c.n)}" height="3" class="tk-gprog"/>` : '')
        + (od ? `<rect x="${X(e + 1)}" y="${y + 9}" width="${Math.max(0, X(Math.min(a, to + 1)) - X(e + 1))}" height="${RH - 18}" class="tk-gb-late"/>` : '')
        + `<title>${esc(x.no)} ${esc(x.world ? wtx(x.title) : x.title)} · ${dt(x.start)} – ${dt(x.due)} · ${esc(stName(x.st))}</title></g>`;
    });
    lines.forEach((l, i) => { if (l.kind !== 'task') return; l.x.deps.forEach(d => { const j = idx.get(d.id); if (j == null) return; const dx = lines[j].x, x1 = X(Math.min(Math.max(dx.due, dx.start), to) + 1), y1 = HH + j * RH + RH / 2, x2 = X(Math.max(l.x.start, from)), y2 = HH + i * RH + RH / 2, mx = Math.max(x1 + 6, Math.min(x2 - 6, x1 + 10));
      g += `<path d="M${x1} ${y1} H${mx} V${y2} H${x2 - 1}" class="tk-gdep" marker-end="url(#tkArr)"><title>${esc(dx.no)} → ${esc(l.x.no)}</title></path>`; }); });
    if (a >= from && a <= to) g += `<line x1="${X(a) + px / 2}" x2="${X(a) + px / 2}" y1="${HH - 8}" y2="${H}" class="tk-gtoday"/><text x="${X(a) + px / 2 + 3}" y="10" class="tk-gtx tk-gtt">${esc(dts(a))}</text>`;
    const svg = `<svg class="tk-gsvg" width="${Wd}" height="${H}" viewBox="0 0 ${Wd} ${H}" role="img" aria-label="${esc(t('tab.gantt') + ' ' + dt(from) + ' – ' + dt(to))}"><defs><marker id="tkArr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L8 4 L0 8Z" class="tk-garr"/></marker></defs>${g}</svg>`;
    const lab = `<div class="tk-gl"><div class="tk-gh">${dt(from)} – ${dt(to)}</div>${lines.map(l => l.kind === 'grp' ? `<div class="tk-grow tk-ggrpl"><b>${l.name}</b> <small>${N(l.n)}</small></div>` : (l.kind === 'rout' ? `<div class="tk-grow tk-groutl">◆ ${esc(l.os[0].title)} <small>${rn(l.os[0].owner)}</small></div>` : `<div class="tk-grow" data-tk="${esc(l.x.id)}" tabindex="0" title="${esc(l.x.no + ' ' + (l.x.world ? wtx(l.x.title) : l.x.title))}"><b>${esc(l.x.no)}</b> ${ttl(l.x)}</div>`)).join('')}</div>`;
    const scale = `<div class="tk-seg" role="group" aria-label="${esc(t('g.scale'))}">${Object.keys(GS).map(k => `<button type="button" data-a="gscale" data-v="${k}" aria-pressed="${U.gscale === k}" class="${U.gscale === k ? 'on' : ''}">${t('g.' + k)}</button>`).join('')}</div>`;
    const legend = `<div class="legend tk-glg"><span><i class="tk-lg-open"></i>${t('g.l_open')}</span><span><i class="tk-lg-od"></i>${t('g.l_od')}</span><span><i class="tk-lg-done"></i>${t('g.l_done')}</span><span><i class="tk-lg-dep"></i>${t('g.l_dep')}</span><span><i class="tk-lg-ms"></i>${t('g.l_rout')}</span><span><i class="tk-lg-today"></i>${t('g.l_today')}</span></div>`;
    const more = total > shown && !U.gAll ? `<button type="button" class="tk-btn tk-quiet" data-a="gall">${t('all_n', { n: N(total) })}</button>` : '';
    return `<div class="tk-bar">${scale}${o.extra || ''}</div>${legend}${lines.length ? `<div class="tk-gantt">${lab}<div class="tk-gs" tabindex="0" aria-label="${esc(t('g.scroll'))}">${svg}</div></div>` : empty(t('g.empty'))}${more}`;
  }
  function vGantt(){ const list = applyF(data(), true); return head('gantt', t('sub.gantt')) + roNote() + filters(data(), false) + K.ui.card(t('tab.gantt'), gantt(list, { extra: newBtn() }), t('g.sub', { d: dt(at()) })); }

  // ---------- «Мой план» (3.2.3) ----------
  const li = x => `<li class="tk-li${isOverdue(x) ? ' tk-od' : ''}" data-tk="${esc(x.id)}" tabindex="0"><b>${esc(x.no)}</b> <span class="tk-lt">${ttl(x)}</span> <small>${rn(x.owner)} · ${t('due_s', { d: dts(x.due) })}${x.dueT ? ' ' + esc(x.dueT) : ''}</small> ${prPill(x.pr)} ${stPill(x.st)}</li>`;
  const ul = (list, none) => list.length ? `<ul class="tk-ul">${list.map(li).join('')}</ul>` : `<p class="tk-none">${none || t('none')}</p>`;
  function load7(list){
    const a = at(), days = Array.from({ length: 7 }, (_, i) => a + i), mins = days.map(() => 0);
    list.filter(x => x.live && OPEN(x.st) && x.time.est > 0).forEach(x => { const rest = Math.max(0, x.time.est - spentMin(x)); if (!rest) return; const s = Math.max(a, x.start), e = Math.max(a, x.due), per = rest / (e - s + 1); days.forEach((d, i) => { if (d >= s && d <= e) mins[i] += per; }); });
    const mx = Math.max(60, ...mins);
    return `<div class="tk-load" role="img" aria-label="${esc(t('my.load'))}">${days.map((d, i) => `<div><span class="tk-lv">${hours(mins[i])}</span><i style="height:${Math.round(mins[i] / mx * 100)}%" class="${mins[i] > 480 ? 'over' : ''}"></i><small>${K.fmt.WD[W.toDate(d).getUTCDay()]} ${dts(d)}</small></div>`).join('')}</div><p class="lnote">${t('my.load_n')}</p>`;
  }
  function vMy(){
    const list = data(), a = at(), n = me(), ex = list.filter(x => OPEN(x.st) && isExec(x)).sort((x, y) => x.due - y.due), wd = (W.toDate(a).getUTCDay() + 6) % 7, wEnd = a + (6 - wd);
    const G = [['od', ex.filter(x => x.due < a)], ['today', ex.filter(x => x.due === a)], ['week', ex.filter(x => x.due > a && x.due <= wEnd)], ['later', ex.filter(x => x.due > wEnd)]];
    const rev = list.filter(x => x.st === 'review' && x.author.role === n), watch = list.filter(x => OPEN(x.st) && x.watchers.includes(n));
    return head('my', t('sub.my', { r: rn(n), d: dt(a) })) + roNote() + `<div class="tk-bar">${newBtn()}</div>`
      + `<div class="tk-grid2">${G.map(([k, l]) => K.ui.card(`${t('my.' + k)} <span class="tk-cnt">${N(l.length)}</span>`, ul(l))).join('')}</div>`
      + `<div class="tk-grid2">${K.ui.card(`${t('my.review')} <span class="tk-cnt">${N(rev.length)}</span>`, ul(rev))}${K.ui.card(`${t('my.watch')} <span class="tk-cnt">${N(watch.length)}</span>`, ul(watch))}</div>`
      + K.ui.card(t('my.load'), load7(ex), t('my.load_s'));
  }

  // ---------- календарь (3.2.3): месяц 7×6 по сроку, точки по приоритету, день → список; на телефоне — список по дням ----------
  function calItems(from, to){
    const a = at(), seen = new Set(), out = [];
    [...data(), ...(from < a ? wlist(from, Math.min(to, a)).filter(canView) : [])].forEach(x => { if (seen.has(x.id) || x.st === 'cancel' || x.due < from || x.due > to) return; seen.add(x.id); out.push(x); });
    return out;
  }
  function vCal(){
    const a = at(), c = U.cal || { y: W.yOf(a), m: W.mOf(a) }, first = W.idxOf(c.y, c.m, 1), y = W.yOf(first), m = W.mOf(first), last = W.idxOf(y, m + 1, 1) - 1;
    const g0 = first - ((W.toDate(first).getUTCDay() + 6) % 7), g1 = g0 + 41, items = calItems(g0, g1), rts = routines(g0, g1), sel = U.calDay != null && U.calDay >= g0 && U.calDay <= g1 ? U.calDay : (a >= first && a <= last ? a : first);
    const on = d => items.filter(x => x.due === d), ron = d => rts.filter(r => r.day === d), PRO = ['urgent','high','mid','low'];
    const cell = d => { const l = on(d).sort((p, q) => PRO.indexOf(p.pr) - PRO.indexOf(q.pr)), r = ron(d), dots = l.slice(0, 4).map(x => `<i class="tk-dot tk-d-${x.pr}${isOverdue(x) ? ' od' : ''}"></i>`).join('') + (l.length > 4 ? `<em>+${l.length - 4}</em>` : '') + r.map(() => '<i class="tk-dot tk-d-r"></i>').join('');
      return `<button type="button" class="tk-cd${d < first || d > last ? ' out' : ''}${d === a ? ' today' : ''}${d === sel ? ' sel' : ''}" data-a="calDay" data-d="${d}" aria-pressed="${d === sel}" aria-label="${esc(dt(d) + ': ' + t('cal.n', { n: l.length + r.length }))}"><span>${W.dOf(d)}</span><span class="tk-dots">${dots}</span></button>`; };
    const wdh = [1,2,3,4,5,6,0].map(i => `<div class="tk-cwd">${K.fmt.WD[i]}</div>`).join('');
    const dayList = d => { const l = on(d), r = ron(d); return (l.length ? ul(l) : '') + (r.length ? `<ul class="tk-ul">${r.map(o => `<li class="tk-li tk-rli">◆ ${esc(o.title)} <small>${rn(o.owner)} · ${t('src.routine')}</small></li>`).join('')}</ul>` : '') || `<p class="tk-none">${t('cal.free')}</p>`; };
    const mlist = []; for (let d = first; d <= last; d++){ if (on(d).length || ron(d).length) mlist.push(`<h3 class="tk-mlh">${K.fmt.WD[W.toDate(d).getUTCDay()]} ${dt(d)}</h3>${dayList(d)}`); }
    const nav = `<div class="tk-bar tk-calnav"><button type="button" class="tk-btn" data-a="calMove" data-v="-1" aria-label="${esc(t('cal.prev'))}">←</button><b>${esc(I.month(m, 'long'))} ${y}</b><button type="button" class="tk-btn" data-a="calMove" data-v="1" aria-label="${esc(t('cal.next'))}">→</button><button type="button" class="tk-btn tk-quiet" data-a="calToday">${t('cal.today')}</button>${newBtn()}</div>`;
    return head('cal', t('sub.cal')) + roNote() + K.ui.card(t('tab.cal'), nav + `<div class="tk-calg" role="grid">${wdh}${Array.from({ length: 42 }, (_, i) => cell(g0 + i)).join('')}</div><div class="tk-calsel"><h3>${dt(sel)}</h3>${dayList(sel)}</div><div class="tk-calm">${mlist.join('') || `<p class="tk-none">${t('cal.empty')}</p>`}</div>`
      + `<div class="legend"><span><i class="tk-dot tk-d-urgent"></i>${prName('urgent')}</span><span><i class="tk-dot tk-d-high"></i>${prName('high')}</span><span><i class="tk-dot tk-d-mid"></i>${prName('mid')}</span><span><i class="tk-dot tk-d-r"></i>${t('src.routine')}</span></div>`, t('cal.sub'));
  }

  // ---------- проекты (3.2.4): карточки, Гантт проектов, «Новый проект» ----------
  function pjCard(p){
    const pr = pjProgress(p), ts = pjTasks(p), open = ts.filter(x => OPEN(x.st)).length, od = ts.filter(x => isOverdue(x)).length, b = money() ? pjBudget(p) : null, dev = pjDev(p);
    return `<div class="tk-pj" data-pj="${esc(p.id)}" tabindex="0" role="button"><div class="tk-pjh"><b>${esc(p.world ? wtx(p.name) : p.name)}</b>${pill('pj-' + p.st, pjStName(p.st))}</div>
      <small>${p.live ? esc(p.no) + ' · ' : t('from_world') + ' · '}${rn(p.lead)} · ${dts(p.from)} – ${dt(p.to)}</small>
      <div class="tk-prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pr * 100)}"><i style="width:${Math.round(pr * 100)}%" class="${dev > 3 ? 'late' : ''}"></i></div>
      <small>${t('pj.prog', { p: P(pr * 100) })} · ${t('pj.tasks', { n: N(ts.length), o: N(open) })}${od ? ` · <span class="dn">${t('pj.od', { n: N(od) })}</span>` : ''}${dev > 0 ? ` · <span class="wn">${t('pj.dev', { n: N(dev) })}</span>` : ''}</small>
      ${b ? `<small>${b.kind === 'rev' ? t('pj.rev_new', { n: N(b.n || 0) }) + ': ' + K.fmt.MU(b.fact) : t('pj.budget_s', { p: K.fmt.MU(b.plan), f: K.fmt.MU(b.fact) })}</small>` : ''}</div>`;
  }
  function pjGantt(ps){
    if (!ps.length) return '';
    const a = at(), lo = Math.min(...ps.map(p => p.from), a), hi = Math.max(...ps.map(p => p.to), a), X = v => (v - lo) / Math.max(1, hi - lo) * 100;
    return `<div class="gantt tk-pjg">${ps.map(p => { const pr = pjProgress(p), late = pjDev(p) > 3; return `<div class="gr" data-pj="${esc(p.id)}" tabindex="0"><div class="gn"><b>${esc(p.world ? wtx(p.name) : p.name)}</b><small>${rn(p.lead)} · ${dts(p.from)}–${dt(p.to)}${late ? ` · <span class="dn">${t('pj.late')}</span>` : ''}</small></div><div class="gb"><i style="left:${X(p.from)}%;width:${X(p.to) - X(p.from)}%"></i><em style="left:${X(p.from)}%;width:${(X(p.to) - X(p.from)) * pr}%" class="${late ? 'late' : ''}"></em><s style="left:${X(Math.min(hi, a))}%"></s></div><div class="gp">${P(pr * 100)}</div></div>`; }).join('')}</div>`;
  }
  function vProjects(){
    const ps = projects(), lv = ps.filter(p => p.live), wd = ps.filter(p => p.world);
    const btn = canCreatePj() ? `<button type="button" class="tk-btn tk-primary" data-a="newPj">${t('pj.new')}</button>` : '';
    return head('projects', t('sub.projects', { d: dt(at()) })) + roNote() + `<div class="tk-bar">${btn}<span class="lnote">${t('pj.hint')}</span></div>`
      + K.ui.card(t('pj.live'), lv.length ? `<div class="tk-pjs">${lv.map(pjCard).join('')}</div>` : empty(t('pj.none_live'), btn))
      + K.ui.card(t('pj.world'), wd.length ? `<div class="tk-pjs">${wd.map(pjCard).join('')}</div>` : empty(t('pj.none_world', { d: dt(at()) })), t('pj.world_s'))
      + (ps.length ? K.ui.card(t('pj.gantt', { d: dt(at()) }), pjGantt(ps), t('pj.gantt_s')) : '');
  }

  // ======================= отчёты по задачам (3.2.5): на период, по правам; итог, доли, к прошлому периоду, CSV, строка → карточка =======================
  const share = (v, tot) => tot ? P(v / tot * 100) : '—';
  const baseWin = () => K.RNG.prev || K.RNG.yago || null;
  function baseDone(){
    const b = baseWin(); if (!b) return null;
    return [...doneIn(wlist(b.from, b.to).filter(canView), b.from, b.to), ...doneIn(data().filter(x => x.live), b.from, b.to)];
  }
  function rOwners(list){
    const R0 = K.RNG, a = at(), owners = [...new Set(list.map(x => x.owner))].filter(Boolean), allDone = doneIn(list, R0.from, R0.to), bd = baseDone(), b = baseWin();
    const fact = l => l.reduce((s, x) => s + x.time.spent.filter(e => e.day == null || (e.day >= R0.from && e.day <= R0.to)).reduce((q, e) => q + (+e.min || 0), 0), 0);
    const rows = owners.map(o => { const l = list.filter(x => x.owner === o), d = doneIn(l, R0.from, R0.to), ot = pctOnTime(d), avg = d.length ? d.reduce((s, x) => s + (x.doneDay - x.created), 0) / d.length : null, op = l.filter(x => OPEN(x.st)).length, od = l.filter(x => isOverdue(x, a)).length, fh = fact(l), pb = bd ? bd.filter(x => x.owner === o).length : null;
      return { ow:o, v:{ o:K.fmt.rn(o), open:op, od, done:d.length, sh:d.length, ot: ot == null ? -1 : ot, avg: avg == null ? -1 : avg, fh, vs:d.length - (pb || 0) },
        c:{ o: rn(o), open: N(op), od: od ? `<span class="dn">${N(od)}</span>` : '0', done: N(d.length), sh: share(d.length, allDone.length), ot: ot == null ? '—' : P(ot), avg: avg == null ? '—' : F1(avg), fh: hours(fh), vs: pb == null ? t('no_base') : K.data.delta(d.length, pb) } }; });
    const ot = pctOnTime(allDone), avg = allDone.length ? allDone.reduce((s, x) => s + (x.doneDay - x.created), 0) / allDone.length : null;
    const total = { o: t('total'), open: N(list.filter(x => OPEN(x.st)).length), od: N(list.filter(x => isOverdue(x, a)).length), done: N(allDone.length), sh: allDone.length ? P(100) : '—', ot: ot == null ? '—' : P(ot), avg: avg == null ? '—' : F1(avg), fh: hours(fact(list)), vs: bd == null ? t('no_base') : K.data.delta(allDone.length, bd.length) };
    const cols = [{ k:'o', h:t('c.owner') }, { k:'open', h:t('c.open'), num:true }, { k:'od', h:t('c.od'), num:true }, { k:'done', h:t('c.done_p'), num:true }, { k:'sh', h:t('c.share'), num:true, lo:true }, { k:'ot', h:t('c.ontime'), num:true, tip:t('tip.ontime') }, { k:'avg', h:t('c.avg'), num:true, tip:t('tip.avg'), lo:true }, { k:'fh', h:t('c.fact_h'), num:true, lo:true }, { k:'vs', h: b === K.RNG.prev ? t('c.vs_prev') : t('c.vs_yago'), num:true, lo:true }];
    return { k:'rOwners', cols, rows, total, sort:{ k:'done', dir:'desc' } };
  }
  function rOverdue(list){
    const l = list.filter(x => isOverdue(x)).sort((x, y) => x.due - y.due), tot = l.reduce((s, x) => s + overdueDays(x), 0);
    const rows = l.map(x => ({ tk:x.id, v:{ no:x.no, o:K.fmt.rn(x.owner), due:x.due, d:overdueDays(x), pr:['low','mid','high','urgent'].indexOf(x.pr), pj:x.project || '' }, c:{ no:`<b>${esc(x.no)}</b> ${ttl(x)}`, o: rn(x.owner), due: dt(x.due), d: `<span class="dn">${N(overdueDays(x))}</span>`, pr: prPill(x.pr), pj: x.project ? pjName(x.project) : '—' } }));
    return { k:'rOverdue', cols:[{ k:'no', h:t('c.title') }, { k:'o', h:t('c.owner') }, { k:'due', h:t('c.due'), num:true }, { k:'d', h:t('c.od_days'), num:true, tip:t('tip.od') }, { k:'pr', h:t('c.pr') }, { k:'pj', h:t('c.project'), lo:true }], rows, sort:{ k:'d', dir:'desc' },
      total:{ no: t('total_n', { n: N(l.length) }), d: l.length ? t('avg_d', { d: F1(tot / l.length) }) : '—' } };
  }
  function rLoad(list){
    const a = at(), R0 = K.RNG, open = list.filter(x => OPEN(x.st)), owners = [...new Set(open.map(x => x.owner))].filter(Boolean), wk = [0, 1, 2, 3];
    const est = (x, k) => { if (!x.time.est) return 0; const rest = Math.max(0, x.time.est - spentMin(x)), s = Math.max(a, x.start), e = Math.max(a, x.due), per = rest / (e - s + 1), w0 = a + 7 * k, w1 = w0 + 6; let m = 0; for (let d = Math.max(s, w0); d <= Math.min(e, w1); d++) m += per; return m; };
    const fact = l => l.reduce((s, x) => s + x.time.spent.filter(e => e.day == null || (e.day >= R0.from && e.day <= R0.to)).reduce((q, e) => q + (+e.min || 0), 0), 0);
    const rows = owners.map(o => { const l = open.filter(x => x.owner === o), all = list.filter(x => x.owner === o), w = wk.map(k => l.reduce((s, x) => s + est(x, k), 0));
      return { ow:o, v:{ o:K.fmt.rn(o), n:l.length, w0:w[0], w1:w[1], w2:w[2], w3:w[3], f:fact(all) }, c:{ o: rn(o), n: N(l.length), w0: hours(w[0]), w1: hours(w[1]), w2: hours(w[2]), w3: hours(w[3]), f: hours(fact(all)) } }; });
    const sumk = k => rows.reduce((s, r) => s + r.v[k], 0);
    return { k:'rLoad', cols:[{ k:'o', h:t('c.owner') }, { k:'n', h:t('c.open'), num:true }, ...wk.map(k => ({ k:'w' + k, h:t('c.week', { a: dts(a + 7 * k), b: dts(a + 7 * k + 6) }), num:true, tip:t('tip.load') })), { k:'f', h:t('c.fact_h'), num:true }], rows, sort:{ k:'n', dir:'desc' },
      total:{ o: t('total'), n: N(sumk('n')), w0: hours(sumk('w0')), w1: hours(sumk('w1')), w2: hours(sumk('w2')), w3: hours(sumk('w3')), f: hours(sumk('f')) } };
  }
  function rMonths(){
    // В7: месяцы ВЫБРАННОГО периода (первый и последний — по датам периода), та же выборка, что у остальных отчётов экрана → итоги совпадают
    const R0 = K.RNG, ms = [];
    for (let mi = W.monthIdx(R0.from); mi <= W.monthIdx(R0.to); mi++){ const M0 = W.MONTHS[mi]; const f0 = Math.max(M0.start, R0.from), t0 = Math.min(M0.end, R0.to); ms.push({ from: f0, to: t0, label: K.fmt.MON[M0.m] + ' ' + String(M0.y).slice(2), partial: f0 > M0.start || t0 < M0.end }); }
    const live = data().filter(x => x.live);
    const rows = ms.map(m => { const all = [...wlist(m.from, m.to).filter(canView), ...live], cr = all.filter(x => x.created >= m.from && x.created <= m.to).length, d = doneIn(all, m.from, m.to), ot = pctOnTime(d), od = all.filter(x => x.created <= m.to && x.st !== 'cancel' && (x.doneDay == null || x.doneDay > m.to) && x.due < m.to).length;
      return { v:{ m:m.from, cr, d:d.length, ot: ot == null ? -1 : ot, od }, c:{ m: esc(m.label) + (m.partial ? ` <small>${t('partial')}</small>` : ''), cr: N(cr), d: N(d.length), ot: ot == null ? '—' : P(ot), od: N(od) }, raw:{ label:m.label, cr, d:d.length, od } }; });
    const sum = k => rows.reduce((s, r) => s + r.raw[k], 0), alld = ms.reduce((s, m) => s, 0) + sum('d');
    const chart = rows.length > 1 ? K.ui.lines([{ n: t('c.created'), v: rows.map(r => r.raw.cr), c: 'var(--c1)' }, { n: t('c.done_p'), v: rows.map(r => r.raw.d), c: 'var(--c3)' }, { n: t('c.od_end'), v: rows.map(r => r.raw.od), c: 'var(--c4)', dash: true }], rows.map(r => r.raw.label), { label: t('rep.months'), min: 0 }) : '';
    return { k:'rMonths', cols:[{ k:'m', h:t('c.month') }, { k:'cr', h:t('c.created'), num:true }, { k:'d', h:t('c.done_p'), num:true }, { k:'ot', h:t('c.ontime'), num:true, tip:t('tip.ontime') }, { k:'od', h:t('c.od_end'), num:true, tip:t('tip.od_end') }], rows, sort:{ k:'m', dir:'asc' }, chart,
      total:{ m: t('total'), cr: N(sum('cr')), d: N(alld) } };
  }
  function rProjects(){
    const ps = projects(), mon = money();
    const rows = ps.map(p => { const ts = pjTasks(p).filter(x => x.st !== 'cancel'), d = ts.filter(x => x.st === 'done').length, od = ts.filter(x => isOverdue(x)).length, b = mon ? pjBudget(p) : null, dev = pjDev(p);
      return { pj:p.id, v:{ n:p.world ? wtx(p.name) : p.name, t:ts.length, d: ts.length ? d / ts.length : -1, od, bp: b ? b.plan : -1, bf: b ? b.fact : -1, dev }, c:{ n: `${esc(p.world ? wtx(p.name) : p.name)} <small>${p.live ? esc(p.no) : t('from_world')}</small>`, t: N(ts.length), d: ts.length ? P(d / ts.length * 100) : '—', od: od ? `<span class="dn">${N(od)}</span>` : '0', bp: b && b.kind !== 'rev' && b.plan ? K.fmt.MU(b.plan) : '—', bf: b ? K.fmt.MU(b.fact) : '—', dev: dev ? `<span class="${dev > 3 ? 'dn' : 'wn'}">+${N(dev)}</span>` : '0' } }; });
    const cols = [{ k:'n', h:t('c.project') }, { k:'t', h:t('c.tasks'), num:true }, { k:'d', h:t('c.done_pct'), num:true }, { k:'od', h:t('c.od'), num:true }, ...(mon ? [{ k:'bp', h:t('c.bplan'), num:true, lo:true }, { k:'bf', h:t('c.bfact'), num:true, lo:true }] : []), { k:'dev', h:t('c.dev'), num:true, tip:t('tip.dev') }];
    const tt = rows.reduce((s, r) => s + r.v.t, 0);
    return { k:'rProjects', cols, rows, sort:{ k:'t', dir:'desc' }, total:{ n: t('total_n', { n: N(rows.length) }), t: N(tt), od: N(rows.reduce((s, r) => s + r.v.od, 0)) } };
  }
  function rSources(list){
    const R0 = K.RNG, inP = list.filter(x => x.created >= R0.from && x.created <= R0.to), allDone = doneIn(list, R0.from, R0.to), keys = [...new Set([...inP, ...allDone].map(x => srcCode(x.src) || String(x.src || '—')))];
    const nm = k => SRC[k] ? t('src.' + k) : esc(I.tx(k));
    const rows = keys.map(k => { const m = x => (srcCode(x.src) || String(x.src || '—')) === k, cr = inP.filter(m).length, d = allDone.filter(m), ot = pctOnTime(d); return { v:{ s:nm(k), cr, sh:cr, d:d.length, ot: ot == null ? -1 : ot }, c:{ s: nm(k), cr: N(cr), sh: share(cr, inP.length), d: N(d.length), ot: ot == null ? '—' : P(ot) } }; });
    const ot = pctOnTime(allDone);
    return { k:'rSources', cols:[{ k:'s', h:t('c.src') }, { k:'cr', h:t('c.created'), num:true }, { k:'sh', h:t('c.share'), num:true }, { k:'d', h:t('c.done_p'), num:true }, { k:'ot', h:t('c.ontime'), num:true }], rows, sort:{ k:'cr', dir:'desc' },
      total:{ s: t('total'), cr: N(inP.length), sh: inP.length ? P(100) : '—', d: N(allDone.length), ot: ot == null ? '—' : P(ot) } };
  }
  const REPS = ['owners','overdue','load','months','projects','sources'];
  function vReports(){
    const list = data(), R0 = K.RNG, sel = REPS.includes(U.rep) ? U.rep : 'all';
    const build = { owners: () => rOwners(list), overdue: () => rOverdue(list), load: () => rLoad(list), months: rMonths, projects: rProjects, sources: () => rSources(list) };
    const pick = `<div class="tk-seg" role="group" aria-label="${esc(t('rep.pick'))}">${['all', ...REPS].map(k => `<button type="button" data-a="rep" data-v="${k}" aria-pressed="${sel === k}" class="${sel === k ? 'on' : ''}">${t('rep.' + k)}</button>`).join('')}</div>`;
    const cards = (sel === 'all' ? REPS : [sel]).map(k => { const r = build[k](); return K.ui.card(t('rep.' + k), (r.chart || '') + tbl(r.k, r.cols, r.rows, { sort: r.sort, csv: 'tasks_' + k, total: r.total }) + `<div class="tk-bar">${csvBtn(r.k)}<span class="lnote">${t('rep.' + k + '_n')}</span></div>`, k === 'overdue' || k === 'load' ? t('on_d', { d: dt(at()) }) : K.fmt.periodTxt()); }).join('');
    return head('reports', t('sub.reports', { p: K.fmt.periodTxt() })) + roNote() + `<div class="tk-bar">${pick}</div>` + cards;
  }

  // ======================= журнал задач (3.2.6) =======================
  const whatTxt = (w, e) => { const k = 'tasks.h.' + w, base = I.has(k) ? I.t(k) : esc(I.tx(String(w || ''))); const stv = v => (ST[stCode(v)] === v || ST_ALIAS[v]) ? stName(v) : esc(I.tx(String(v))); return base + (e.from != null || e.to != null ? `: ${e.from != null && e.from !== '' ? (w === 'status' ? stv(e.from) : esc(e.from)) : '—'} → ${e.to != null ? (w === 'status' ? stv(e.to) : esc(e.to)) : '—'}` : ''); };
  function jEntries(){
    const out = [], list = data();
    list.filter(x => x.live).forEach(x => x.hist.forEach(h => out.push({ day: h.day != null ? h.day : x.created, ts: h.ts || 0, role: h.role, name: h.name, tk: x.id, no: x.no, title: x.title, owner: x.owner, what: h.what, from: h.from, to: h.to, note: h.note })));
    projects().filter(p => p.live).forEach(p => p.hist.forEach(h => out.push({ day: h.day != null ? h.day : p.created, ts: h.ts || 0, role: h.role, name: h.name, pj: p.id, no: p.no, title: p.name, owner: p.lead, what: h.what, from: h.from, to: h.to, note: h.note })));
    list.filter(x => x.world).forEach(x => { out.push({ day: x.created, ts: 0, role: null, src: x.src, tk: x.id, no: x.no, title: x.title, owner: x.owner, what: 'created', world: true }); if (x.doneDay != null) out.push({ day: x.doneDay, ts: 1, role: x.owner, tk: x.id, no: x.no, title: x.title, owner: x.owner, what: 'status', to: ST.done, world: true }); });
    return out.sort((a, b) => b.day - a.day || b.ts - a.ts);
  }
  function vJournal(){
    const jf = U.jf, R0 = K.RNG, from = fromIso(jf.from) != null ? fromIso(jf.from) : R0.from, to = fromIso(jf.to) != null ? fromIso(jf.to) : at(), q = jf.q.trim().toLowerCase();
    const all = jEntries(), roles = [...new Set(all.flatMap(e => [e.role, e.owner]))].filter(Boolean).sort();
    const l = all.filter(e => e.day >= from && e.day <= to && (!jf.role || e.role === jf.role || e.owner === jf.role) && (!q || (e.no + ' ' + e.title).toLowerCase().includes(q)));
    const rows = l.map(e => ({ tk: e.tk, pj: e.pj, v: { d: e.day * 1e13 + e.ts, who: e.role ? K.fmt.rn(e.role) : '', t: e.no, w: e.what || '' },
      c: { d: dt(e.day) + (e.ts > 1 ? ` <small>${esc(I.time(new Date(e.ts)))}</small>` : ''), who: e.role ? who(e.role, e.name) : `<small>${srcName(e.src)}</small>`, t: `<b>${esc(e.no)}</b> ${esc(e.world ? wtx(e.title) : e.title)}${e.pj ? ` <small>${t('pj.one')}</small>` : ''}`, w: whatTxt(e.what, e), n: e.note ? esc(String(e.note).slice(0, 120)) : (e.world ? `<small>${t('from_world')}</small>` : '') } }));
    const fl = `<div class="tk-filters" role="group" aria-label="${esc(t('f.title'))}"><label class="tk-q">${t('f.q')}<input type="search" data-jf="q" value="${esc(jf.q)}" maxlength="80" placeholder="${esc(t('j.q_ph'))}"></label>
      <label>${t('j.who')}<select data-jf="role">${opt('', t('f.any'), jf.role)}${roles.map(n => opt(n, rn(n), jf.role)).join('')}</select></label>
      <label>${t('j.from')}<input type="date" data-jf="from" value="${iso(from)}"></label><label>${t('j.to')}<input type="date" data-jf="to" value="${iso(to)}"></label><button type="button" class="tk-btn tk-quiet" data-a="jreset">${t('f.reset')}</button></div>`;
    const cols = [{ k:'d', h:t('c.when'), num:true }, { k:'who', h:t('c.who') }, { k:'t', h:t('c.title') }, { k:'w', h:t('c.what') }, { k:'n', h:t('c.note'), lo:true }];
    return head('journal', t('sub.journal')) + roNote() + fl + K.ui.card(t('tab.journal'), tbl('journal', cols, rows, { sort: { k:'d', dir:'desc' }, csv: 'tasks_journal', total: { d: t('total_n', { n: N(rows.length) }) } }) + `<div class="tk-bar">${csvBtn('journal')}<span class="lnote">${t('j.keep')}</span></div>`, `${dt(from)} – ${dt(to)}`);
  }

  // ======================= карточка задачи (3.2.2) =======================
  const sec = (h, body, extra) => `<section class="tk-sec"><h3>${h}${extra ? ` <small>${extra}</small>` : ''}</h3>${body}</section>`;
  const dl = rows => `<dl class="kv tk-kv">${rows.filter(Boolean).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  const names = l => l.length ? l.map(n => rn(n)).join(', ') : '—';
  const multi = (id, cur, lab) => `<label>${lab}<select id="${id}" multiple size="4">${roleNames().map(n => opt(n, rn(n), cur.includes(n) ? n : '\u0000')).join('')}</select></label>`;
  const selVals = el => el ? [...el.selectedOptions].map(o => o.value) : [];
  const objOpts = cur => opt('', t('f.none'), cur || '') + W.objects.filter(o => K.roles.scopeOk(o) && W.active(o, at())).map(o => opt(o.name, esc(I.w(o.name)) + ' · ' + esc(I.tx(o.city)), cur)).join('');
  // поля задачи: новая (full) и правка
  function fields(x, mode){
    const so = selfOnly(), own = x.owner || (so ? me() : K.roles.OWNER_OF.tasks);
    return `<div class="tk-form">
      <label class="tk-w2">${t('fld.title')} *<input id="tfTitle" maxlength="160" required value="${esc(x.title || '')}" placeholder="${esc(t('ph.title'))}"></label>
      <label class="tk-w2">${t('fld.desc')}<textarea id="tfDesc" maxlength="4000" rows="4" placeholder="${esc(t('pdn'))}">${esc(x.desc || '')}</textarea></label>
      <label>${t('fld.owner')}<select id="tfOwner"${so ? ' disabled' : ''}>${ownerOpts(own)}</select></label>
      <label>${t('fld.pr')}<select id="tfPr">${Object.keys(PR).map(c => opt(c, prName(c), x.pr || 'mid')).join('')}</select></label>
      ${so ? '' : multi('tfCo', arr(x.co), t('fld.co')) + multi('tfWatch', arr(x.watchers), t('fld.watchers'))}
      <label>${t('fld.start')}<input type="date" id="tfStart" value="${iso(x.start != null ? x.start : at())}"></label>
      <label>${t('fld.due')} *<span class="tk-dt"><input type="date" id="tfDue" required value="${iso(x.due != null ? x.due : at() + 3)}"><input type="time" id="tfDueT" value="${esc(x.dueT || '')}" aria-label="${esc(t('fld.time'))}"></span></label>
      <label>${t('fld.tags')}<input id="tfTags" maxlength="160" value="${esc(arr(x.tags).join(', '))}" placeholder="${esc(t('ph.tags'))}"></label>
      <label>${t('fld.project')}<select id="tfProj">${pjOpts(x.project)}</select></label>
      <label class="tk-w2">${t('fld.obj')}<select id="tfObj">${objOpts(x.obj)}</select></label>
      ${mode === 'new' ? `<label class="tk-w2">${t('fld.checklist')}<textarea id="tfChk" rows="3" maxlength="4000" placeholder="${esc(t('ph.checklist'))}"></textarea></label>
      <label>${t('fld.est')}<input type="number" id="tfEst" min="0" max="10000" step="15" value="${x.est || ''}" inputmode="numeric"></label>
      <label>${t('fld.repeat')}<select id="tfRep">${opt('', t('rep.none'), '')}${['daily','weekly','monthly'].map(k => opt(k, t('rep.' + k), '')).join('')}</select></label>` : ''}
      <p class="tk-err tk-w2" id="tfErr" role="alert" aria-live="assertive"></p></div>`;
  }
  function readFields(root, mode){
    const v = id => { const el = root.querySelector('#' + id); return el ? el.value : ''; };
    const title = v('tfTitle').trim(), start = fromIso(v('tfStart')), due = fromIso(v('tfDue')), desc = v('tfDesc');
    const err = !title ? t('err.title') : (due == null ? t('err.due') : (start != null && start > due ? t('err.start') : (desc.length > 4000 ? t('err.desc') : (/\b\d{12}\b/.test(title + ' ' + desc) ? t('err.pdn') : ''))));
    const o = { title, desc, owner: selfOnly() ? me() : v('tfOwner'), pr: v('tfPr'), co: selVals(root.querySelector('#tfCo')), watchers: selVals(root.querySelector('#tfWatch')), start: start != null ? start : at(), due, dueT: v('tfDueT'),
      tags: v('tfTags').split(',').map(s => s.trim().replace(/^#/, '')).filter(Boolean), project: v('tfProj') || null, obj: v('tfObj') || null };
    if (mode === 'new'){ o.checklist = v('tfChk').split('\n').map(s => s.trim()).filter(Boolean); o.est = +v('tfEst') || 0; const rk = v('tfRep'); o.repeat = rk ? { kind: rk, every: 1 } : null; }
    return { o, err };
  }
  function newTaskForm(pre = {}){
    if (!canCreate()) return;
    const x = { ...pre, due: pre.due != null ? pre.due : at() + 3 };
    K.modal.open(`<form class="tk-m" data-f="newTask" novalidate>${pre.parent ? `<p class="note">${t('sub_of', { n: esc((byId(pre.parent) || {}).no || '') })}</p>` : ''}${fields(x, 'new')}<div class="mact"><button type="submit" class="btn tk-primary">${t('btn.create')}</button><button type="button" class="btn" data-a="mclose">${t('btn.cancel')}</button></div><p class="lnote">${esc(Live.note())}</p></form>`, t('new_task'), { wide:true, focus:'#tfTitle', onOpen: body => { const f = body.querySelector('form'); f.addEventListener('submit', async e => { e.preventDefault(); const { o, err } = readFields(f, 'new'); const er = f.querySelector('#tfErr'); if (err){ er.textContent = err; return; } const row = await create({ ...o, parent: pre.parent || null, src: pre.src || 'manual', link: pre.link || null }); if (!row){ er.textContent = Live.data.err || t('err.save'); return; } K.modal.close(); if (row.id) setTimeout(() => openTask(row.id), 0); }); wireModal(body); } });
  }

  function secActions(x, p){
    const nx = (FLOW[x.st] || []).filter(to => to !== 'cancel' && allowed(x, to));
    const b = [...nx.map(to => `<button type="button" class="btn${to === 'done' ? ' tk-primary' : ''}" data-a="st" data-to="${to}">${actLabel(x, to)}</button>`),
      allowed(x, 'cancel') ? `<button type="button" class="btn" data-a="show" data-t="tkCancelF">${t('act.cancel')}…</button>` : '',
      p.edit || p.desc ? `<button type="button" class="btn" data-a="show" data-t="tkEditF">${t('btn.edit')}</button>` : '',
      p.edit ? `<button type="button" class="btn" data-a="show" data-t="tkRepF">${t('btn.repeat')}</button>` : '',
      `<button type="button" class="btn" data-a="askAI">${K.fmt.esc(I.t('btn.ask_ai'))}</button>`, !Live.data.ro && !x.world ? `<button type="button" class="btn" data-a="toChat">${t('btn.to_chat')}</button>` : ''].filter(Boolean).join('');
    const cancelF = allowed(x, 'cancel') ? `<form class="tk-inline" id="tkCancelF" data-f="cancel" hidden><label>${t('fld.reason')} *<textarea id="tkReason" maxlength="500" rows="2" required placeholder="${esc(t('ph.reason'))}"></textarea></label><button type="submit" class="btn tk-danger">${t('act.cancel_do')}</button><p class="tk-err" role="alert"></p></form>` : '';
    const rp = x.repeat || {};
    const repF = p.edit ? `<form class="tk-inline" id="tkRepF" data-f="repeat" hidden><label>${t('fld.repeat')}<select id="tkRepK">${opt('', t('rep.none'), rp.kind || '')}${['daily','weekly','monthly'].map(k => opt(k, t('rep.' + k), rp.kind || '')).join('')}</select></label><label>${t('rep.every')}<input type="number" id="tkRepN" min="1" max="12" value="${rp.every || 1}"></label><label>${t('rep.until')}<input type="date" id="tkRepU" value="${rp.until != null ? iso(rp.until) : ''}"></label><button type="submit" class="btn">${I.t('btn.save')}</button></form>` : '';
    const editF = p.edit || p.desc ? `<form class="tk-inline tk-editf" id="tkEditF" data-f="edit" hidden>${p.edit ? fields(x, 'edit') : `<label class="tk-w2">${t('fld.desc')}<textarea id="tfDesc" maxlength="4000" rows="5">${esc(x.desc)}</textarea></label><p class="tk-err" id="tfErr" role="alert"></p>`}<button type="submit" class="btn tk-primary">${I.t('btn.save')}</button></form>` : '';
    return `<div class="mact tk-acts">${b}</div>${cancelF}${repF}${editF}`;
  }
  function secHead(x){
    const od = isOverdue(x), c = chk(x);
    return `<div class="tk-mh">${stPill(x.st)} ${prPill(x.pr)} <span>${t('due_s', { d: dt(x.due) })}${x.dueT ? ' ' + esc(x.dueT) : ''}</span>${od ? ` <b class="dn">${t('od_n', { n: N(overdueDays(x)) })}</b>` : ''}${c.n ? ` <span>☑ ${c.d}/${c.n}</span>` : ''} <small>${t('c.src')}: ${srcName(x.src)}</small>${x.project ? ` · <button type="button" class="lnk" data-a="openPj" data-id="${esc(x.project)}">${pjName(x.project)}</button>` : ''}${x.world ? ' ' + pill('world', t('from_world')) : ''}${x.repeat ? ' ' + pill('rep', t('rep.on', { k: t('rep.' + x.repeat.kind) })) : ''}${x.tags.map(s => ` <span class="tk-tag">#${esc(s)}</span>`).join('')}</div>`
      + (x.st === 'cancel' && x.reason ? `<p class="banner-info tk-ban">${t('cancelled', { r: esc(x.reason) })}</p>` : '') + (x.world ? `<p class="note">${t('world_note')}</p>` : '');
  }
  function secPeople(x){
    const a = x.author.role ? who(x.author.role, x.author.name) : srcName(x.src);
    return sec(t('s.people'), dl([[t('fld.author'), a], [t('fld.owner'), rn(x.owner)], [t('fld.co'), names(x.co)], [t('fld.watchers'), names(x.watchers)], x.obj ? [t('fld.obj'), esc(I.w(x.obj))] : null,
      [t('fld.start'), dt(x.start)], [t('fld.due'), dt(x.due) + (x.dueT ? ' ' + esc(x.dueT) : '')], [t('fld.created'), dt(x.created)], x.doneDay != null ? [t('fld.done'), dt(x.doneDay) + (onTime(x) ? ` <span class="up">${t('in_time')}</span>` : ` <span class="dn">${t('late_n', { n: N(x.doneDay - x.due) })}</span>`)] : null,
      x.link ? [t('fld.link'), esc(t('link.' + (x.link.kind || 'card'))) + (x.link.ch ? ' · ' + esc(x.link.ch) : '') + (x.link.title ? ' · ' + esc(String(x.link.title).slice(0, 80)) : '')] : null,
      x.prev ? [t('fld.prev'), `<button type="button" class="lnk" data-a="open" data-id="${esc(x.prev)}">${esc((byId(x.prev) || {}).no || '—')}</button>`] : null, x.nextId ? [t('fld.next'), `<button type="button" class="lnk" data-a="open" data-id="${esc(x.nextId)}">${esc((byId(x.nextId) || {}).no || '—')}</button>`] : null]));
  }
  function secCheck(x, p){
    const c = chk(x);
    return sec(t('s.check'), `${c.n ? `<div class="tk-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${c.n}" aria-valuenow="${c.d}"><i style="width:${Math.round(c.d / c.n * 100)}%"></i></div>` : ''}<ul class="tk-chl">${x.checklist.map(i => `<li><label><input type="checkbox" data-a="chk" data-id="${esc(i.id)}"${i.done ? ' checked' : ''}${p.work ? '' : ' disabled'}> <span${i.done ? ' class="tk-done"' : ''}>${esc(i.text)}</span></label>${i.done && i.by ? ` <small>${rn(i.by)}</small>` : ''}</li>`).join('') || `<li class="tk-none">${t('none')}</li>`}</ul>`
      + (p.work && x.checklist.length < 50 ? `<form class="tk-inline tk-row" data-f="chk"><input id="tkChkIn" maxlength="200" placeholder="${esc(t('ph.chk'))}" aria-label="${esc(t('ph.chk'))}"><button type="submit" class="btn">${t('btn.add')}</button></form>` : ''), c.n ? `${c.d}/${c.n}` : '');
  }
  function secSub(x, p){
    const ks = kids(x);
    return sec(t('s.sub'), ul(ks) + (p.work && canCreate() ? `<form class="tk-inline tk-row" data-f="sub"><input id="tkSubIn" maxlength="160" placeholder="${esc(t('ph.sub'))}" aria-label="${esc(t('ph.sub'))}"><button type="submit" class="btn">${t('btn.add_sub')}</button><button type="button" class="tk-btn tk-quiet" data-a="subFull">${t('btn.full')}</button></form>` : ''), ks.length ? N(ks.length) : '')
      + (x.parent ? `<p class="note">${t('parent')}: <button type="button" class="lnk" data-a="open" data-id="${esc(x.parent)}">${esc((byId(x.parent) || {}).no || '—')} ${esc((byId(x.parent) || {}).title || '')}</button></p>` : '');
  }
  function secDeps(x, p){
    const ds = x.deps.map(d => ({ d, y: byId(d.id) })), cand = data().filter(y => y.id !== x.id && OPEN(y.st) && !x.deps.some(d => d.id === y.id) && y.parent !== x.id).slice(0, 200);
    return sec(t('s.deps'), `<ul class="tk-ul">${ds.map(({ d, y }) => `<li class="tk-li"${y ? ` data-tk="${esc(y.id)}" tabindex="0"` : ''}>${t('waits')} <b>${esc(y ? y.no : d.id)}</b> ${y ? ttl(y) + ' ' + stPill(y.st) : ''}${p.edit ? ` <button type="button" class="tk-btn tk-quiet" data-a="undep" data-id="${esc(d.id)}" aria-label="${esc(t('btn.undep'))}">×</button>` : ''}</li>`).join('') || `<li class="tk-none">${t('none')}</li>`}</ul>`
      + (p.edit && cand.length ? `<form class="tk-inline tk-row" data-f="dep"><select id="tkDepSel" aria-label="${esc(t('ph.dep'))}">${cand.map(y => opt(y.id, esc(y.no + ' ' + y.title.slice(0, 60)), '')).join('')}</select><button type="submit" class="btn">${t('btn.add_dep')}</button></form>` : ''));
  }
  function secTime(x, p){
    const sp = spentMin(x);
    return sec(t('s.time'), dl([[t('time.est'), x.time.est ? hours(x.time.est) : '—'], [t('time.fact'), `<b>${hours(sp)}</b>${x.time.est ? ` · ${P(sp / x.time.est * 100)}` : ''}`]])
      + (x.time.spent.length ? `<ul class="tk-ul tk-small">${x.time.spent.slice().reverse().map(e => `<li>${stamp(e.ts)} · ${who(e.role, e.name)} · <b>${hours(e.min)}</b>${e.note ? ' · ' + esc(e.note) : ''}</li>`).join('')}</ul>` : '')
      + (p.work ? `<form class="tk-inline tk-row" data-f="time"><input type="number" id="tkMin" min="1" max="1440" step="1" placeholder="${esc(t('ph.min'))}" aria-label="${esc(t('ph.min'))}" inputmode="numeric"><input id="tkMinN" maxlength="200" placeholder="${esc(t('ph.min_note'))}" aria-label="${esc(t('ph.min_note'))}"><button type="submit" class="btn">${t('btn.add_time')}</button></form>` : '')
      + (p.edit || p.O ? `<form class="tk-inline tk-row" data-f="est"><input type="number" id="tkEst" min="0" max="10000" step="1" value="${x.time.est || ''}" aria-label="${esc(t('fld.est'))}" placeholder="${esc(t('fld.est'))}"><button type="submit" class="btn">${t('btn.set_est')}</button></form>` : ''), hours(sp));
  }
  const fileLi = id => { const m = Live.byId('files', id); if (!m) return `<li class="tk-none">${t('file.gone')}</li>`; return `<li><a href="#" data-fid="${esc(id)}" target="_blank" rel="noopener">📎 ${esc(m.name)}</a> <small>${N(Math.max(1, Math.round((m.size || 0) / 1024)))} ${t('u.kb')} · ${esc(window.FileStore.kindOf(m.mime, m.name))}${m.localOnly ? ' · ' + esc(I.t('files.local_only')) : ''} · ${esc(I.t('files.demo'))}</small></li>`; };
  function secFiles(x, p){
    return sec(t('s.files'), `<ul class="tk-ul tk-files">${x.files.map(fileLi).join('') || `<li class="tk-none">${t('none')}</li>`}</ul>` + (p.work ? `<label class="tk-file">${t('btn.attach')}<input type="file" id="tkFile" multiple data-a="file"></label><p class="lnote" id="tkFileNote" aria-live="polite">${t('file.hint')}</p>` : ''), x.files.length ? N(x.files.length) : '');
  }
  const mark = s => esc(s).replace(new RegExp('@(' + roleNames().map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')', 'g'), (m, n) => `<b class="tk-at">@${rn(n)}</b>`).replace(/\n/g, '<br>');
  function secComments(x, p){
    const cm = c => `<div class="tk-cm" id="tkc-${esc(c.id)}"><div class="tk-cmh"><b>${who(c.role, c.name)}</b> <small>${stamp(c.ts)}</small>${c.editedAt ? ` <button type="button" class="lnk tk-ed" data-a="vers" data-id="${esc(c.id)}">${t('c.edited', { t: esc(I.time(new Date(c.editedAt))) })}</button>` : ''}${canEditC(c) ? ` <button type="button" class="tk-btn tk-quiet" data-a="cedit" data-id="${esc(c.id)}">${t('btn.edit')}</button>` : ''}</div>
      <p data-ctext="${esc(c.id)}">${mark(c.text)}</p>${arr(c.files).length ? `<ul class="tk-ul tk-files">${c.files.map(fileLi).join('')}</ul>` : ''}${arr(c.editHist).length ? `<div class="tk-vers" data-vers="${esc(c.id)}" hidden>${c.editHist.map(v => `<p><small>${stamp(v.ts)}</small> ${esc(v.text)}</p>`).join('')}</div>` : ''}</div>`;
    return sec(t('s.comments'), `<div class="tk-cms">${x.comments.map(cm).join('') || `<p class="tk-none">${t('c.none')}</p>`}</div>`
      + (p.comment ? `<form class="tk-inline tk-cform" data-f="comment"><textarea id="tkCmt" maxlength="4000" rows="2" placeholder="${esc(t('ph.comment'))}" aria-label="${esc(t('ph.comment'))}"></textarea><div class="tk-row"><label class="tk-file">${t('btn.attach')}<input type="file" id="tkCmtFile" multiple></label><button type="submit" class="btn tk-primary">${I.t('btn.send')}</button></div><p class="lnote">${t('c.rule')}</p></form>` : ''), x.comments.length ? N(x.comments.length) : '');
  }
  function secHist(x){
    const h = x.hist.slice().reverse();
    return `<details class="tk-hist"><summary>${t('s.hist')} · ${N(h.length)}</summary><ul class="tk-ul tk-small">${h.map(e => `<li>${e.ts ? stamp(e.ts) : dt(e.day)} · ${e.role ? who(e.role, e.name) : '—'} · ${whatTxt(e.what, e)}${e.note ? ' · ' + esc(String(e.note).slice(0, 120)) : ''}</li>`).join('')}</ul></details>`;
  }
  function taskBody(x){
    const p = perms(x);
    if (x.world) return `<div class="tk-m" data-for="${esc(x.id)}">${secHead(x)}${secActions(x, p)}${secPeople(x)}${sec(t('s.desc'), `<p>${ttl(x)}</p>`)}</div>`;
    return `<div class="tk-m" data-for="${esc(x.id)}">${secHead(x)}${secActions(x, p)}${sec(t('s.desc'), x.desc ? `<p class="tk-desc">${mark(x.desc)}</p>` : `<p class="tk-none">${t('no_desc')}</p>`)}${secPeople(x)}<div class="tk-grid2">${secCheck(x, p)}${secTime(x, p)}</div><div class="tk-grid2">${secSub(x, p)}${secDeps(x, p)}</div>${secFiles(x, p)}${secComments(x, p)}${secHist(x)}<p class="lnote">${esc(Live.note())}</p></div>`;
  }
  let curCard = null, editTimer = 0;
  function openTask(id, retry){
    const x = byId(id);
    if (!x){ const raw = byIdRaw(id); if (raw){ K.modal.open(`<p class="note">${t('denied', { r: rn(me()) })}</p>`, t('denied_t'), { wide:false }); return; }
      if (!retry && id && !String(id).startsWith('w:')) setTimeout(() => openTask(id, true), 500); return; }   // общий журнал: запись приходит снимком чуть позже
    mMsg = null;
    K.modal.open('', `${x.no} · ${x.world ? wtx(x.title) : x.title}`.slice(0, 90), { wide:true, onOpen: body => { curCard = { kind:'task', id }; renderCard(body); }, onClose: () => { curCard = null; clearTimeout(editTimer); } });
  }
  function renderCard(body){
    if (!curCard) return;
    const keep = {}; body.querySelectorAll('input[id],textarea[id],select[id]').forEach(el => { if (el.type !== 'file' && el.type !== 'checkbox') keep[el.id] = el.value; });
    const open = [...body.querySelectorAll('form.tk-inline[id]')].filter(f => !f.hidden).map(f => f.id);
    if (curCard.kind === 'task'){ const x = byId(curCard.id); if (!x){ body.innerHTML = `<p class="note">${t('gone')}</p>`; return; } body.innerHTML = taskBody(x); scheduleEdit(x, body); }
    else { const p = pjById(curCard.id); if (!p || !pjVisible(p)){ body.innerHTML = `<p class="note">${t('gone')}</p>`; return; } body.innerHTML = pjBody(p); }
    open.forEach(id => { const f = body.querySelector('#' + id); if (f) f.hidden = false; });
    Object.entries(keep).forEach(([id, v]) => { const el = body.querySelector('#' + id); if (el && el.tagName !== 'SELECT' && !el.multiple && v) el.value = v; });
    wireModal(body);
  }
  function scheduleEdit(x, body){
    clearTimeout(editTimer);
    const left = x.comments.filter(canEditC).map(c => EDIT_MS - (Date.now() - c.ts)).filter(v => v > 0);
    if (left.length) editTimer = setTimeout(() => { if (curCard && K.modal.isOpen) renderCard(K.modal.body); }, Math.min(...left) + 200);
  }
  const refreshCard = () => { if (curCard && K.modal.isOpen && K.modal.body.querySelector('.tk-m')) renderCard(K.modal.body); };

  // ======================= карточка проекта (3.2.4) =======================
  function pjReport(p){
    const a = at(), ts = pjTasks(p).filter(x => x.st !== 'cancel'), d = ts.filter(x => x.st === 'done').length, od = ts.filter(x => isOverdue(x)), span = Math.max(1, p.to - p.from), time = Math.min(1, Math.max(0, (a - p.from) / span)), pr = pjProgress(p), dev = pjDev(p);
    const st = p.stages.filter(s => s.done).length, b = money() ? pjBudget(p) : null, hi = p.risks.filter(r => r.status !== RK.closed && r.prob * r.impact >= 6), nm = p.world ? wtx(p.name) : p.name;
    const nextMs = p.milestones.filter(m => !m.done).sort((x, y) => x.day - y.day)[0];
    const L = [t('rp.head', { no: p.live ? p.no : t('from_world'), n: nm, d: dt(a) }), t('rp.time', { a: dt(p.from), b: dt(p.to), t: P(time * 100), p: P(pr * 100) }), t('rp.tasks', { n: N(ts.length), d: N(d), s: N(st), sn: N(p.stages.length) }),
      dev > 0 ? t('rp.late', { n: N(dev) }) : t('rp.ontrack'), od.length ? t('rp.od', { n: N(od.length), l: od.slice(0, 5).map(x => `${x.no} (${K.fmt.rn(x.owner)}, ${dts(x.due)})`).join('; ') }) : t('rp.no_od'),
      b ? (b.kind === 'rev' ? t('rp.rev', { f: K.fmt.MU(b.fact) }) : t('rp.budget', { p: K.fmt.MU(b.plan), f: K.fmt.MU(b.fact), r: b.plan ? P(b.fact / b.plan * 100) : '—' })) : (money() ? '' : t('rp.no_money')),
      p.risks.length ? t('rp.risks', { n: N(p.risks.filter(r => r.status !== RK.closed).length), h: N(hi.length) }) : t('rp.no_risks'), nextMs ? t('rp.ms', { n: nextMs.name, d: dt(nextMs.day) }) : ''].filter(Boolean);
    return { text: L.join('\n'), by: a >= W.LAUNCH_DEMO ? t('rp.by_ai') : t('rp.by_sys', { d: dt(W.LAUNCH_DEMO) }) };
  }
  const riskCell = (p, pr, im) => { const l = p.risks.filter(r => r.status !== RK.closed && +r.prob === pr && +r.impact === im); return `<td class="tk-rk tk-rk${pr * im >= 6 ? 'h' : (pr * im >= 3 ? 'm' : 'l')}" title="${esc(l.map(r => r.text).join('; '))}">${l.length || ''}</td>`; };
  function pjBody(p){
    const pp = pjPerms(p), pr = pjProgress(p), ts = pjTasks(p), showAll = !!U.pjAll, tl = showAll ? ts : ts.filter(x => OPEN(x.st)), b = money() ? pjBudget(p) : null, dev = pjDev(p), a = at();
    const acts = [(pp.work || p.world) && canCreate() ? `<button type="button" class="btn" data-a="pjTask">${t('pj.add_task')}</button>` : '', `<button type="button" class="btn" data-a="pjReport">${t('pj.report')}</button>`,
      pp.edit && !['done','closed'].includes(p.st) ? `<button type="button" class="btn" data-a="pjFinish">${t('pj.finish')}</button>` : '', pp.edit && p.st === 'work' ? `<button type="button" class="btn" data-a="pjSt" data-v="pause">${t('pj.pause')}</button>` : '', pp.edit && p.st === 'pause' ? `<button type="button" class="btn" data-a="pjSt" data-v="work">${t('pj.resume')}</button>` : '',
      `<button type="button" class="btn" data-a="askAI">${esc(I.t('btn.ask_ai'))}</button>`].filter(Boolean).join('');
    const stages = `<ol class="tk-stages">${p.stages.map(s => `<li class="${s.done ? 'done' : (a > s.to ? 'late' : '')}"><label><input type="checkbox" data-a="stage" data-id="${esc(s.id)}"${s.done ? ' checked' : ''}${pp.work ? '' : ' disabled'}> <b>${esc(p.world ? wtx(s.name) : s.name)}</b></label> <small>${dts(s.from)} – ${dt(s.to)}${s.done && s.doneDay != null ? ' · ' + t('fld.done') + ' ' + dt(s.doneDay) : ''}${!s.done && a > s.to ? ` · <span class="dn">${t('od_n', { n: N(a - s.to) })}</span>` : ''}</small></li>`).join('') || `<li class="tk-none">${t('none')}</li>`}</ol>`
      + (pp.edit ? `<form class="tk-inline tk-row" data-f="stage"><input id="pjStN" maxlength="120" placeholder="${esc(t('ph.stage'))}" aria-label="${esc(t('ph.stage'))}"><input type="date" id="pjStF" value="${iso(a)}" aria-label="${esc(t('fld.start'))}"><input type="date" id="pjStT" value="${iso(Math.min(p.to, a + 14))}" aria-label="${esc(t('fld.due'))}"><button type="submit" class="btn">${t('btn.add')}</button></form>` : '');
    const ms = `<ul class="tk-ul">${p.milestones.map(m => `<li class="tk-li"><label><input type="checkbox" data-a="ms" data-id="${esc(m.id)}"${m.done ? ' checked' : ''}${pp.work ? '' : ' disabled'}> ◆ <b>${esc(p.world ? wtx(m.name) : m.name)}</b></label> <small>${dt(m.day)}${!m.done && m.day < a ? ` · <span class="dn">${t('od_n', { n: N(a - m.day) })}</span>` : ''}</small></li>`).join('') || `<li class="tk-none">${t('none')}</li>`}</ul>`
      + (pp.edit ? `<form class="tk-inline tk-row" data-f="ms"><input id="pjMsN" maxlength="120" placeholder="${esc(t('ph.ms'))}" aria-label="${esc(t('ph.ms'))}"><input type="date" id="pjMsD" value="${iso(p.to)}" aria-label="${esc(t('fld.day'))}"><button type="submit" class="btn">${t('btn.add')}</button></form>` : '');
    const mem = dl([[t('pj.lead'), rn(p.lead)], [t('pj.members'), names(p.members)]]) + (pp.edit ? `<form class="tk-inline tk-row" data-f="member"><select id="pjMem" aria-label="${esc(t('pj.add_member'))}">${roleNames().filter(n => !p.members.includes(n)).map(n => opt(n, rn(n), '')).join('')}</select><button type="submit" class="btn">${t('pj.add_member')}</button></form>` : '');
    const bud = !b ? (money() ? `<p class="tk-none">${t('pj.no_budget')}</p>` : `<p class="tk-none">${t('pj.no_money')}</p>`) : (() => { const pc = b.plan ? Math.min(100, b.fact / b.plan * 100) : 0, over = b.plan && b.fact > b.plan;
      return dl([[t('pj.plan'), b.kind === 'rev' ? '—' : K.fmt.MU(b.plan)], [b.kind === 'rev' ? t('pj.rev_new', { n: N(b.n || 0) }) : t('pj.fact'), `<b>${K.fmt.MU(b.fact)}</b>${b.kind === 'pays' ? ` <small>${t('pj.pays_n', { n: N(b.n), p: K.fmt.MU(b.paid) })}</small>` : (b.line ? ` <small>${esc(I.tx(b.line))}</small>` : '')}`], b.kind !== 'rev' ? [t('pj.rest'), `<span class="${over ? 'dn' : ''}">${K.fmt.MU(b.plan - b.fact)}</span>`] : null])
        + (b.plan ? `<div class="tk-prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pc)}"><i style="width:${pc}%" class="${over ? 'late' : ''}"></i></div>` : '')
        + (pp.edit ? `<form class="tk-inline tk-row" data-f="plan"><input type="number" id="pjPlan" min="0" step="0.1" value="${b.plan ? +(b.plan / 1e6).toFixed(2) : ''}" aria-label="${esc(t('pj.plan_m'))}" placeholder="${esc(t('pj.plan_m'))}"><button type="submit" class="btn">${t('btn.set_plan')}</button></form>` : '')
        + (p.live && ['П','Б'].includes(rl().rt.finance) && !Live.data.ro ? `<form class="tk-inline tk-row" data-f="pay"><input id="pjPayTo" maxlength="120" placeholder="${esc(t('pj.pay_to'))}" aria-label="${esc(t('pj.pay_to'))}"><input type="number" id="pjPayAmt" min="0.01" step="0.01" placeholder="${esc(t('pj.pay_amt'))}" aria-label="${esc(t('pj.pay_amt'))}"><button type="submit" class="btn">${t('pj.pay')}</button><p class="tk-err" role="alert"></p></form>` : ''); })();
    const risks = `<table class="tk-rmx" aria-label="${esc(t('pj.matrix'))}"><caption>${t('pj.matrix')}</caption><tr><th></th>${[1,2,3].map(i => `<th>${t('pj.imp')} ${i}</th>`).join('')}</tr>${[3,2,1].map(pr0 => `<tr><th>${t('pj.prob')} ${pr0}</th>${[1,2,3].map(im => riskCell(p, pr0, im)).join('')}</tr>`).join('')}</table>`
      + `<ul class="tk-ul">${p.risks.map(r => `<li class="tk-li"><b>${esc(r.text)}</b> <small>${t('pj.prob')} ${r.prob} · ${t('pj.imp')} ${r.impact} · ${rn(r.owner)} · ${esc(I.tx(r.status))}</small>${pp.edit && r.status !== RK.closed ? ` <button type="button" class="tk-btn tk-quiet" data-a="riskClose" data-id="${esc(r.id)}">${t('pj.risk_close')}</button>` : ''}</li>`).join('') || `<li class="tk-none">${t('pj.no_risk')}</li>`}</ul>`
      + (pp.work ? `<form class="tk-inline tk-row" data-f="risk"><input id="pjRisk" maxlength="200" placeholder="${esc(t('ph.risk'))}" aria-label="${esc(t('ph.risk'))}"><select id="pjRiskP" aria-label="${esc(t('pj.prob'))}">${[1,2,3].map(i => opt(i, t('pj.prob') + ' ' + i, 2)).join('')}</select><select id="pjRiskI" aria-label="${esc(t('pj.imp'))}">${[1,2,3].map(i => opt(i, t('pj.imp') + ' ' + i, 2)).join('')}</select><button type="submit" class="btn">${t('btn.add')}</button></form>` : '');
    const tasksB = `<div class="tk-bar"><button type="button" class="tk-btn tk-quiet" data-a="pjAll" aria-pressed="${showAll}">${showAll ? t('pj.only_open') : t('pj.show_all', { n: N(ts.length) })}</button></div>` + ul(tl.slice(0, 30)) + (tl.length > 30 ? `<p class="lnote">${t('more_in_list', { n: N(tl.length - 30) })}</p>` : '');
    const cms = p.comments.map(c => `<div class="tk-cm"><div class="tk-cmh"><b>${who(c.role, c.name)}</b> <small>${stamp(c.ts)}</small></div><p>${mark(c.text)}</p></div>`).join('') || `<p class="tk-none">${t('c.none')}</p>`;
    return `<div class="tk-m" data-pjfor="${esc(p.id)}"><div class="tk-mh">${pill('pj-' + p.st, pjStName(p.st))} <span>${dt(p.from)} – ${dt(p.to)}</span> <span>${t('pj.prog', { p: P(pr * 100) })}</span>${dev > 0 ? ` <b class="wn">${t('pj.dev', { n: N(dev) })}</b>` : ''}${p.world ? ' ' + pill('world', t('from_world')) : ''}</div>
      <div class="tk-prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pr * 100)}"><i style="width:${Math.round(pr * 100)}%" class="${dev > 3 ? 'late' : ''}"></i></div>
      <div class="mact tk-acts">${acts}</div><div id="pjRep"></div><form class="tk-inline" id="pjFinF" data-f="finish" hidden><p class="banner-info tk-ban">${t('pj.finish_q', { n: N(ts.filter(x => OPEN(x.st)).length) })}</p><button type="submit" class="btn tk-primary">${t('pj.finish_yes')}</button></form>
      ${sec(t('pj.goal'), p.goal ? `<p>${esc(p.goal)}</p>` : `<p class="tk-none">${p.world ? t('pj.goal_world', { n: N(p.stages.length), d: dt(p.to) }) : t('none')}</p>`)}
      <div class="tk-grid2">${sec(t('pj.stages'), stages, `${N(p.stages.filter(s => s.done).length)}/${N(p.stages.length)}`)}${sec(t('pj.ms'), ms)}</div>
      <div class="tk-grid2">${sec(t('pj.people'), mem)}${sec(t('pj.budget'), bud)}</div>
      ${sec(t('pj.risks'), risks)}${sec(t('pj.tasks_h'), tasksB, N(ts.length))}
      ${p.live ? sec(t('s.files'), `<ul class="tk-ul tk-files">${p.files.map(fileLi).join('') || `<li class="tk-none">${t('none')}</li>`}</ul>` + (pp.work ? `<label class="tk-file">${t('btn.attach')}<input type="file" id="pjFile" multiple data-a="pjfile"></label>` : '')) + sec(t('s.comments'), `<div class="tk-cms">${cms}</div>` + (pp.comment ? `<form class="tk-inline tk-cform" data-f="pjComment"><textarea id="pjCmt" maxlength="4000" rows="2" placeholder="${esc(t('ph.comment'))}" aria-label="${esc(t('ph.comment'))}"></textarea><button type="submit" class="btn tk-primary">${I.t('btn.send')}</button></form>` : '')) + secHist(p) : `<p class="note">${t('pj.world_note')}</p>`}</div>`;
  }
  function openProject(id){
    const p = pjById(id); if (!p) return;
    if (!pjVisible(p)){ K.modal.open(`<p class="note">${t('denied', { r: rn(me()) })}</p>`, t('denied_t'), { wide:false }); return; }
    mMsg = null;
    K.modal.open('', `${p.live ? p.no + ' · ' : ''}${p.world ? wtx(p.name) : p.name}`.slice(0, 90), { wide:true, onOpen: body => { curCard = { kind:'pj', id }; renderCard(body); }, onClose: () => { curCard = null; } });
  }
  function newPjForm(){
    if (!canCreatePj()) return;
    const a = at();
    const html = `<form class="tk-m" data-f="newPj" novalidate><div class="tk-form"><label class="tk-w2">${t('pj.name')} *<input id="pfName" maxlength="160" required></label><label class="tk-w2">${t('pj.goal')}<textarea id="pfGoal" maxlength="600" rows="2" placeholder="${esc(t('ph.goal'))}"></textarea></label>
      <label>${t('pj.lead')}<select id="pfLead">${ownerOpts(me(), true)}</select></label>${multi('pfMem', [me()], t('pj.members'))}
      <label>${t('fld.start')}<input type="date" id="pfFrom" value="${iso(a)}"></label><label>${t('fld.due')}<input type="date" id="pfTo" value="${iso(a + 60)}"></label>
      <label class="tk-w2">${t('pj.stages')}<textarea id="pfStages" rows="3" placeholder="${esc(t('ph.stages'))}"></textarea></label>
      <label>${t('pj.ms_name')}<input id="pfMs" maxlength="120" placeholder="${esc(t('ph.ms'))}"></label><label>${t('fld.day')}<input type="date" id="pfMsD" value="${iso(a + 60)}"></label>
      ${money() ? `<label>${t('pj.plan_m')}<input type="number" id="pfPlan" min="0" step="0.1" inputmode="decimal"></label>` : ''}<p class="tk-err tk-w2" id="pfErr" role="alert"></p></div>
      <div class="mact"><button type="submit" class="btn tk-primary">${t('btn.create')}</button><button type="button" class="btn" data-a="mclose">${t('btn.cancel')}</button></div></form>`;
    K.modal.open(html, t('pj.new'), { wide:true, focus:'#pfName', onOpen: body => { const f = body.querySelector('form'); f.addEventListener('submit', async e => { e.preventDefault(); const v = id => (f.querySelector('#' + id) || {}).value || '', er = f.querySelector('#pfErr'), from = fromIso(v('pfFrom')), to = fromIso(v('pfTo'));
      if (!v('pfName').trim()){ er.textContent = t('err.title'); return; } if (from == null || to == null || to <= from){ er.textContent = t('err.start'); return; }
      const row = await createPj({ name: v('pfName'), goal: v('pfGoal'), lead: v('pfLead'), members: selVals(f.querySelector('#pfMem')), from, to, stages: v('pfStages').split('\n'), ms: v('pfMs').trim() ? { name: v('pfMs').trim(), day: fromIso(v('pfMsD')) } : null, plan: (parseFloat(String(v('pfPlan')).replace(',', '.')) || 0) * 1e6 });
      if (!row){ er.textContent = Live.data.err || t('err.save'); return; } K.modal.close(); if (row.id) setTimeout(() => openProject(row.id), 0); }); wireModal(body); } });
  }

  // ======================= мини-форма «Создать задачу» из события, чата, карточки, ответа ИИ (3.2.8) =======================
  function quickCreate(obj = {}, opts = {}){
    return new Promise(resolve => {
      let done = false; const fin = v => { if (!done){ done = true; resolve(v); } };
      const own = selfOnly() ? me() : (obj.owner || K.roles.OWNER_OF.tasks), due = at() + (obj.days != null ? +obj.days : 3);
      const html = !canCreate() ? `<div class="tk-qc"><p class="note">${Live.data.ro ? t('ro') : t('read_only', { r: rn(me()) })}</p></div>` : `<form class="tk-qc tk-form" data-f="quick" novalidate>
        <label class="tk-w2">${t('fld.title')} *<input id="tqTitle" maxlength="160" required value="${esc(String(obj.title || '').slice(0, 160))}"></label>
        <label>${t('fld.owner')}<select id="tqOwner"${selfOnly() ? ' disabled' : ''}>${ownerOpts(own)}</select></label><label>${t('fld.due')}<input type="date" id="tqDue" value="${iso(due)}"></label>
        <label>${t('fld.pr')}<select id="tqPr">${Object.keys(PR).map(c => opt(c, prName(c), prCode(obj.pr))).join('')}</select></label><label>${t('fld.project')}<select id="tqProj">${pjOpts(obj.project)}</select></label>
        <div class="mact tk-w2"><button type="submit" class="btn tk-primary" id="tqSave">${t('btn.create')}</button><button type="button" class="btn" data-a="qcancel">${t('btn.cancel')}</button></div><p class="tk-err tk-w2" role="alert"></p>
        <p class="lnote tk-w2">${t('qc.src', { s: srcName(obj.src || SRC.manual) })} · ${t('pdn')}</p></form>`;
      const wire = root => {
        const f = root.querySelector('form.tk-qc');
        if (!f){ fin(null); return; }
        f.addEventListener('submit', async e => { e.preventDefault(); const v = id => (f.querySelector('#' + id) || {}).value || '', er = f.querySelector('.tk-err'), d = fromIso(v('tqDue'));
          if (!v('tqTitle').trim()){ er.textContent = t('err.title'); return; } if (d == null){ er.textContent = t('err.due'); return; }
          const btn = f.querySelector('#tqSave'); btn.disabled = true;
          const row = await create({ ...obj, title: v('tqTitle'), owner: selfOnly() ? me() : v('tqOwner'), due: d, start: Math.min(at(), d), pr: v('tqPr'), project: v('tqProj') || obj.project || null, obj: obj.obj || objIn(v('tqTitle')) });
          if (!row){ btn.disabled = false; er.textContent = Live.data.err || t('err.save'); return; }
          f.outerHTML = `<div class="tk-qc tk-ok" role="status">${t('qc.done', { no: esc(row.no || '') })} <button type="button" class="btn" data-a="qopen" data-id="${esc(row.id || '')}">${t('qc.open')}</button></div>`;
          const ok = (opts.host || K.modal.body).querySelector('[data-a="qopen"]'); if (ok) ok.addEventListener('click', () => { if (!opts.host) K.modal.close(); if (row.id) openTask(row.id); });
          fin(row); });
        const c = f.querySelector('[data-a="qcancel"]'); if (c) c.addEventListener('click', () => { if (opts.host) opts.host.innerHTML = ''; else K.modal.close(); fin(null); });
        const ti = f.querySelector('#tqTitle'); if (ti && opts.host) ti.focus();
      };
      if (opts.host){ opts.host.innerHTML = html; wire(opts.host); return; }
      K.modal.open(html, t('new_task'), { focus:'#tqTitle', onOpen: wire, onClose: () => fin(null) });
    });
  }

  // ======================= события: раздел (делегирование на .tk-root), канбан (перетаскивание), карточки =======================
  let msg = null, mMsg = null, dirty = false, drag = null, dragEnd = 0;
  const flash = (text, el) => { msg = { text, until: Date.now() + 8000 }; const n = el || document.getElementById('tkLive'); if (n) n.textContent = text; };
  const flashM = text => { mMsg = { text, until: Date.now() + 8000 }; const n = K.modal.body.querySelector('.tk-mnote'); if (n) n.textContent = text; };
  const liveMsg = () => msg && msg.until > Date.now() ? esc(msg.text) : '';
  const rerender = focusSel => { K.render(); if (focusSel){ const el = document.querySelector(focusSel); if (el) el.focus(); } };
  function openEl(el){
    if (el.dataset.tk) return openTask(el.dataset.tk);
    if (el.dataset.pj) return openProject(el.dataset.pj);
    if (el.dataset.card && el.dataset.card.startsWith('task:')) return openTask(el.dataset.card.slice(5));
    if (el.dataset.ow){ U.f = { ...U.f, owner: el.dataset.ow, st: 'open' }; saveUI(); location.hash = '#tasks-list'; }
  }
  const F0 = () => ({ st:'open', owner:'', project:'', tag:'', overdue:false, created:'all', q:'', group:'' });
  const ACT = {
    newTask: () => newTaskForm(), newPj: () => newPjForm(), csv: b => csvDownload(b.dataset.k),
    sort: b => { const k = b.dataset.k, c = b.dataset.c, s = U.sort[k]; U.sort[k] = { k: c, dir: s && s.k === c && s.dir === 'asc' ? 'desc' : 'asc' }; saveUI(); rerender(`[data-a="sort"][data-k="${k}"][data-c="${c}"]`); },
    more: b => { U.lim[b.dataset.k] = (U.lim[b.dataset.k] || 25) + 25; rerender(); }, moreall: b => { U.lim[b.dataset.k] = 1e6; rerender(); },
    freset: () => { U.f = F0(); saveUI(); rerender(); }, kball: () => { U.kbAll = true; rerender(); }, gall: () => { U.gAll = true; rerender(); },
    gscale: b => { U.gscale = b.dataset.v; saveUI(); rerender(`[data-a="gscale"][data-v="${b.dataset.v}"]`); },
    calDay: b => { U.calDay = +b.dataset.d; rerender(`[data-a="calDay"][data-d="${b.dataset.d}"]`); },
    calMove: b => { const a = at(), c = U.cal || { y: W.yOf(a), m: W.mOf(a) }, d = W.idxOf(c.y, c.m + +b.dataset.v, 1); U.cal = { y: W.yOf(d), m: W.mOf(d) }; U.calDay = null; rerender(`[data-a="calMove"][data-v="${b.dataset.v}"]`); },
    calToday: () => { U.cal = null; U.calDay = null; rerender(); }, rep: b => { U.rep = b.dataset.v; rerender(`[data-a="rep"][data-v="${b.dataset.v}"]`); },
    jreset: () => { U.jf = { q:'', role:'', from:'', to:'' }; rerender(); },
  };
  async function kbMove(x, to, focusId){
    if (!x) return;
    if (to === 'cancel'){ if (allowed(x, 'cancel')){ openTask(x.id); const f = K.modal.body.querySelector('#tkCancelF'); if (f){ f.hidden = false; f.querySelector('textarea').focus(); } } return; }
    if (!allowed(x, to)){ flash(t('dnd.no', { s: stName(to) })); return; }
    const ok = await setStatus(x, to);
    flash(ok ? t('dnd.ok', { no: x.no, s: stName(to) }) : (Live.data.err || t('err.save')));
    if (focusId) setTimeout(() => { const el = document.querySelector(`.tk-card[data-tk="${focusId}"] [data-tnext], .tk-card[data-tk="${focusId}"]`); if (el) el.focus(); }, 120);
  }
  function wireMain(main){
    const root = main.querySelector('.tk-root'); if (!root) return;
    // нажатие на строку, карточку канбана, полосу Гантта, проект — своя карточка (перехват до общих обработчиков строк ядра)
    root.addEventListener('click', e => {
      if (Date.now() - dragEnd < 350){ e.stopPropagation(); e.preventDefault(); return; }
      if (e.target.closest('button, a, input, select, textarea, label, summary')) return;
      const el = e.target.closest('[data-tk],[data-pj],[data-ow],[data-card^="task:"],[data-noop]'); if (!el || !root.contains(el)) return;
      e.stopPropagation(); e.preventDefault(); if (!el.dataset.noop) openEl(el);
    }, true);
    root.addEventListener('keydown', e => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      const el = e.target.closest('[data-tk],[data-pj],[data-ow],[data-noop]'); if (!el || el !== e.target) return;
      e.preventDefault(); e.stopPropagation(); if (!el.dataset.noop) openEl(el);
    }, true);
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-tnext],[data-a]'); if (!b || !root.contains(b) || b.disabled) return;
      if (b.dataset.tnext){ e.preventDefault(); kbMove(byId(b.dataset.tnext), b.dataset.to || 'work', b.dataset.tnext); return; }
      const f = ACT[b.dataset.a]; if (f){ e.preventDefault(); f(b, e); }
    });
    root.addEventListener('change', e => {
      const el = e.target;
      if (el.dataset.tf){ const k = el.dataset.tf; U.f[k] = el.type === 'checkbox' ? el.checked : el.value; U.lim.list = 25; saveUI(); rerender(`[data-tf="${k}"]`); }
      else if (el.dataset.jf){ const k = el.dataset.jf; U.jf[k] = el.value; U.lim.journal = 25; rerender(`[data-jf="${k}"]`); }
    });
    root.addEventListener('search', e => { const el = e.target; if (el.dataset.tf || el.dataset.jf){ el.dispatchEvent(new Event('change', { bubbles:true })); } });
    const qf = root.querySelector('#tkForm');
    if (qf) qf.addEventListener('submit', async e => {
      e.preventDefault(); const ti = qf.querySelector('#tkTitle'), title = ti.value.trim(), note = root.querySelector('#tkFormNote');
      if (!title){ note.textContent = t('err.title'); ti.focus(); return; }
      if (/\b\d{12}\b/.test(title)){ note.textContent = t('err.pdn'); return; }
      ti.value = '';
      const row = await create({ title, owner: qf.querySelector('#tkOwner').value, days: +qf.querySelector('#tkDays').value, pr: qf.querySelector('#tkPr').value, src: 'manual', st: 'new' });
      flash(row ? t('qc.done', { no: row.no || '' }) : (Live.data.err || t('err.save')), note);
    });
    root.addEventListener('pointerdown', dragStart);
  }
  const colAt = (x, y) => { const el = document.elementFromPoint(x, y); return el && el.closest ? el.closest('.tk-col') : null; };
  function dragStart(e){
    const card = e.target.closest('.tk-card[data-drag]');
    if (!card || e.button !== 0 || e.pointerType === 'touch' || e.target.closest('button, a, input, select')) return;
    drag = { card, id: card.dataset.tk, x0: e.clientX, y0: e.clientY, on: false, over: null };
    document.addEventListener('pointermove', dragMove);
    document.addEventListener('pointerup', dragStop, { once: true });
  }
  function dragMove(e){
    if (!drag) return;
    const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
    if (!drag.on && Math.hypot(dx, dy) < 6) return;
    if (!drag.on){ drag.on = true; drag.card.classList.add('tk-dragging'); }
    drag.card.style.transform = `translate(${dx}px, ${dy}px)`;
    const col = colAt(e.clientX, e.clientY);
    if (col !== drag.over){ if (drag.over) drag.over.classList.remove('tk-over'); drag.over = col; if (col) col.classList.add('tk-over'); }
  }
  function dragStop(e){
    document.removeEventListener('pointermove', dragMove);
    const d = drag; drag = null; if (!d || !d.on) return;
    dragEnd = Date.now(); d.card.style.transform = ''; d.card.classList.remove('tk-dragging'); if (d.over) d.over.classList.remove('tk-over');
    const col = colAt(e.clientX, e.clientY), x = byId(d.id);
    if (col && x && col.dataset.st !== x.st) kbMove(x, col.dataset.st);
  }

  // ---------- карточки задачи и проекта: делегирование на .tk-m (новый узел при каждой отрисовке) ----------
  function wireFiles(m){
    m.querySelectorAll('a[data-fid]').forEach(a => { const meta = Live.byId('files', a.dataset.fid); a.addEventListener('click', e => { if (a.getAttribute('href') === '#') e.preventDefault(); });
      window.FileStore.url(meta).then(u => { if (u){ a.href = u; if (meta.kind === 'image' && !a.querySelector('img')) a.insertAdjacentHTML('beforeend', `<img src="${u}" alt="" class="tk-thumb">`); } else a.insertAdjacentHTML('afterend', ` <small class="dn">${t('file.na')}</small>`); }).catch(() => {}); });
  }
  function wireModal(body){
    const m = body.querySelector('.tk-m'); if (!m) return;
    wireFiles(m); m.querySelectorAll('form').forEach(f => { f.noValidate = true; });   // проверка — своими сообщениями (минуты, причина, сроки)
    if (mMsg && mMsg.until > Date.now() && !m.querySelector('.tk-mnote')) m.insertAdjacentHTML('afterbegin', `<p class="tk-mnote" role="status" aria-live="polite">${esc(mMsg.text)}</p>`);
    else if (!m.querySelector('.tk-mnote')) m.insertAdjacentHTML('afterbegin', `<p class="tk-mnote" role="status" aria-live="polite"></p>`);
    m.addEventListener('click', e => { const b = e.target.closest('[data-a]'); if (!b || !m.contains(b) || b.disabled || b.tagName === 'INPUT') return; const f = MACT[b.dataset.a]; if (f){ e.preventDefault(); f(b, m); } });
    m.addEventListener('change', e => { const el = e.target, f = el.dataset && MACT[el.dataset.a]; if (f && el.tagName === 'INPUT') f(el, m); });
    m.addEventListener('submit', e => { const f = e.target.closest('form[data-f]'); const h = f && MSUB[f.dataset.f]; if (h){ e.preventDefault(); h(f, m); } });
  }
  const curTask = () => curCard && curCard.kind === 'task' ? byId(curCard.id) : null;
  const curPj = () => curCard && curCard.kind === 'pj' ? pjById(curCard.id) : null;
  const pjRep = {};
  const MACT = {
    mclose: () => K.modal.close(),
    st: async b => { const x = curTask(); if (x){ const to = b.dataset.to, ok = await setStatus(x, to); flashM(ok ? t('dnd.ok', { no: x.no, s: stName(to) }) : t('err.save')); } },
    show: (b, m) => { const f = m.querySelector('#' + b.dataset.t); if (f){ f.hidden = !f.hidden; const i = !f.hidden && f.querySelector('input, textarea, select'); if (i) i.focus(); } },
    askAI: () => { const x = curTask(), p = curPj(), q = x ? t('ask_q', { no: x.no, t: x.world ? wtx(x.title) : x.title }) : t('ask_pj', { n: p ? (p.world ? wtx(p.name) : p.name) : '' }); K.modal.close(true); K.ui.openAI({ src:'card' }); K.ui.ask(q, { src:'card', section:'tasks', card: x ? x.no : (p && p.name) }); },
    toChat: async () => { const x = curTask(); if (!x) return; const chs = (K.roles.CH_OF && K.roles.CH_OF[rl().id]) || ['all'], ch = chs[0]; const r = await Live.add('chat', { ch, text: t('chat_msg', { no: x.no, t: x.title, o: K.fmt.rn(x.owner), d: dt(x.due) }), taskId: x.id }); flashM(r ? t('chat_sent', { c: ch }) : t('err.save')); },
    open: b => openTask(b.dataset.id), openPj: b => openProject(b.dataset.id),
    chk: el => { const x = curTask(); if (x && perms(x).work) toggleCheck(x, el.dataset.id); },
    undep: b => { const x = curTask(); if (!x) return; const y = byId(b.dataset.id); patch(x, { deps: x.deps.filter(d => d.id !== b.dataset.id) }, 'dep', { note: '× ' + (y ? y.no : b.dataset.id) }); },
    subFull: () => { const x = curTask(); if (x) newTaskForm({ parent: x.id, project: x.project, owner: x.owner, due: x.due }); },
    cedit: (b, m) => { const x = curTask(), c = x && x.comments.find(z => z.id === b.dataset.id), p = m.querySelector(`[data-ctext="${b.dataset.id}"]`); if (!c || !p || !canEditC(c)){ flashM(t('c.late')); return; } p.outerHTML = `<form class="tk-inline" data-f="cedit" data-id="${esc(c.id)}"><textarea id="tkCEd" maxlength="4000" rows="2" aria-label="${esc(t('btn.edit'))}">${esc(c.text)}</textarea><button type="submit" class="btn">${I.t('btn.save')}</button></form>`; const ta = m.querySelector('#tkCEd'); if (ta) ta.focus(); },
    vers: (b, m) => { const v = m.querySelector(`[data-vers="${b.dataset.id}"]`); if (v) v.hidden = !v.hidden; },
    file: async el => { const x = curTask(); if (!x || !el.files.length) return; const fs = [...el.files]; el.value = ''; const errs = await attachTask(x, fs); flashM(errs.length ? errs.join(' · ') : t('file.ok', { n: fs.length })); },
    pjfile: async el => { const p = curPj(); if (!p || !el.files.length) return; const fs = [...el.files]; el.value = ''; const errs = await attach('project', p, fs, ids => pjPatch(p, { files: [...p.files, ...ids] }, 'file', { note: ids.map(id => (Live.byId('files', id) || {}).name).join(', ') })); flashM(errs.length ? errs.join(' · ') : t('file.ok', { n: fs.length })); },
    pjTask: () => { const p = curPj(); if (p) newTaskForm({ project: p.id, owner: selfOnly() ? me() : p.lead, due: Math.max(at() + 3, Math.min(p.to, at() + 7)) }); },
    pjReport: (b, m) => { const p = curPj(); if (!p) return; pjRep[p.id] = pjReport(p); showRep(p, m); },
    pjRepSave: async (b, m) => { const p = curPj(), r = p && pjRep[p.id]; if (!r) return; const row = await Live.add('reports', { kind:'project', title: t('pj.report') + ' · ' + (p.world ? wtx(p.name) : p.name), period: { from: p.from, to: p.to }, at: at(), text: r.text, project: p.id }); if (p.live && row) await pjPatch(p, {}, 'report', { note: row.no || '' }); flashM(row ? t('rp.saved', { no: row.no || '' }) : t('err.save')); },
    pjFinish: (b, m) => { const p = curPj(); if (!p) return; const open = pjTasks(p).filter(x => OPEN(x.st)).length; if (open){ const f = m.querySelector('#pjFinF'); if (f){ f.hidden = false; f.querySelector('button').focus(); } } else finishPj(p); },
    pjSt: b => { const p = curPj(); if (p) pjPatch(p, { status: PJ[b.dataset.v] }, 'pj_status', { from: PJ[p.st], to: PJ[b.dataset.v] }); },
    stage: el => { const p = curPj(); if (!p || !pjPerms(p).work) return; const s0 = p.stages.find(s => s.id === el.dataset.id); pjPatch(p, { stages: p.stages.map(s => s.id === el.dataset.id ? clean({ ...s, done: !s.done, doneDay: !s.done ? at() : null, doneTs: !s.done ? Date.now() : null }) : s) }, 'stage', { note: (s0 && !s0.done ? '✓ ' : '○ ') + (s0 ? s0.name : '') }); },
    ms: el => { const p = curPj(); if (!p || !pjPerms(p).work) return; const m0 = p.milestones.find(s => s.id === el.dataset.id); pjPatch(p, { milestones: p.milestones.map(s => s.id === el.dataset.id ? clean({ ...s, done: !s.done, doneDay: !s.done ? at() : null }) : s) }, 'milestone', { note: (m0 && !m0.done ? '✓ ' : '○ ') + (m0 ? m0.name : '') }); },
    riskClose: b => { const p = curPj(); if (p) pjPatch(p, { risks: p.risks.map(r => r.id === b.dataset.id ? { ...r, status: RK.closed } : r) }, 'risk', { note: '× ' + ((p.risks.find(r => r.id === b.dataset.id) || {}).text || '') }); },
    pjAll: (b, m) => { U.pjAll = !U.pjAll; refreshCard(); },
  };
  function showRep(p, m){ const r = pjRep[p.id], el = m.querySelector('#pjRep'); if (!r || !el) return; el.innerHTML = `<div class="tk-rep" role="status"><b>${esc(r.by)}</b><p>${esc(r.text).replace(/\n/g, '<br>')}</p><div class="mact"><button type="button" class="btn" data-a="pjRepSave">${t('rp.save')}</button></div></div>`; }
  const finishPj = p => pjPatch(p, { status: PJ.done, doneDay: at() }, 'finish', { from: PJ[p.st], to: PJ.done });
  const val = (f, id) => (f.querySelector('#' + id) || {}).value || '';
  const err = (f, s) => { const e = f.querySelector('.tk-err'); if (e) e.textContent = s; else flashM(s); };
  const MSUB = {
    cancel: async f => { const x = curTask(), r = val(f, 'tkReason').trim(); if (!x) return; if (!r){ err(f, t('err.reason')); return; } f.hidden = true; const ok = await setStatus(x, 'cancel', r); flashM(ok ? t('cancel_ok', { no: x.no }) : t('err.save')); },
    repeat: async f => { const x = curTask(); if (!x) return; const k = val(f, 'tkRepK'), n = Math.max(1, Math.min(12, +val(f, 'tkRepN') || 1)), u = fromIso(val(f, 'tkRepU')); f.hidden = true; await patch(x, { repeat: k ? clean({ kind: k, every: n, until: u }) : null }, 'repeat', { note: k ? t('rep.on', { k: t('rep.' + k) }) + (n > 1 ? ' ×' + n : '') : t('rep.none') }); },
    edit: async f => { const x = curTask(); if (!x) return; const p0 = perms(x); const { o, err: e } = p0.edit ? readFields(f, 'edit') : { o: { desc: val(f, 'tfDesc') }, err: val(f, 'tfDesc').length > 4000 ? t('err.desc') : '' }; if (e){ err(f, e); return; } const pt = editPatch(x, o); if (!pt.keys.length){ f.hidden = true; return; } f.hidden = true; await patch(x, pt.patch, 'edit', { note: pt.note }); },
    chk: async f => { const x = curTask(), s = val(f, 'tkChkIn'); if (!x || !s.trim()) return; f.querySelector('#tkChkIn').value = ''; await addCheck(x, s); },
    sub: async f => { const x = curTask(), s = val(f, 'tkSubIn').trim(); if (!x || !s) return; f.querySelector('#tkSubIn').value = ''; const r = await create({ title: s, parent: x.id, project: x.project, owner: selfOnly() ? me() : x.owner, due: x.due, src: 'manual', st: 'new' }); if (r) await patch(x, {}, 'subtask', { note: r.no || s }); },
    dep: async f => { const x = curTask(), id = val(f, 'tkDepSel'), y = byId(id); if (!x || !y) return; await patch(x, { deps: [...x.deps, { id, type: 'finish-start' }] }, 'dep', { note: y.no }); },
    time: async f => { const x = curTask(), m = +val(f, 'tkMin'), n = val(f, 'tkMinN'); if (!x) return; if (!(m > 0 && m <= 1440)){ flashM(t('err.min')); return; } f.querySelector('#tkMin').value = ''; f.querySelector('#tkMinN').value = ''; await addTime(x, m, n); },
    est: async f => { const x = curTask(); if (x) await setEst(x, +val(f, 'tkEst')); },
    comment: async f => { const x = curTask(), s = val(f, 'tkCmt'), fi = f.querySelector('#tkCmtFile'), fs = fi ? [...fi.files] : []; if (!x || (!s.trim() && !fs.length)) return; f.querySelector('#tkCmt').value = ''; if (fi) fi.value = '';
      let ids = []; if (fs.length){ for (const file of fs.slice(0, 10)){ try { const mt = await window.FileStore.put(file, { attachedTo: [{ kind:'task', id: x.id }] }); if (mt && mt.id) ids.push(mt.id); } catch(e){ flashM((e && e.message) || t('file.err')); } } }
      await addComment(byId(x.id) || x, s, ids); },
    cedit: async f => { const x = curTask(); if (!x) return; const ok = await editComment(x, f.dataset.id, val(f, 'tkCEd')); if (!ok){ flashM(t('c.late')); refreshCard(); } },
    stage: async f => { const p = curPj(), n = val(f, 'pjStN').trim(), a = fromIso(val(f, 'pjStF')), b = fromIso(val(f, 'pjStT')); if (!p || !n) return; if (a == null || b == null || b < a){ flashM(t('err.start')); return; } f.querySelector('#pjStN').value = ''; await pjPatch(p, { stages: [...p.stages, { id: 's' + Date.now().toString(36), name: n.slice(0, 120), from: a, to: b, done: false }] }, 'stage', { note: n }); },
    ms: async f => { const p = curPj(), n = val(f, 'pjMsN').trim(), d = fromIso(val(f, 'pjMsD')); if (!p || !n || d == null) return; f.querySelector('#pjMsN').value = ''; await pjPatch(p, { milestones: [...p.milestones, { id: 'm' + Date.now().toString(36), name: n.slice(0, 120), day: d, done: false }] }, 'milestone', { note: n }); },
    member: async f => { const p = curPj(), n = val(f, 'pjMem'); if (!p || !n || p.members.includes(n)) return; await pjPatch(p, { members: [...p.members, n] }, 'member', { note: K.fmt.rn(n) }); },
    plan: async f => { const p = curPj(), v = parseFloat(String(val(f, 'pjPlan')).replace(',', '.')); if (!p || !(v >= 0)) return; await pjPatch(p, { budget: { plan: Math.round(v * 1e6), currency: 'KZT' } }, 'budget', { from: K.fmt.MU(p.budget.plan), to: K.fmt.MU(v * 1e6) }); },
    pay: async f => { const p = curPj(), to = val(f, 'pjPayTo').trim(), amt = parseFloat(String(val(f, 'pjPayAmt')).replace(',', '.')); if (!p) return; if (!to || !(amt > 0)){ err(f, t('err.pay')); return; }
      const line = (K.data.LINES.bdr.find(l => l[0] === 9) || K.data.LINES.bdr[1])[1]; f.querySelector('#pjPayTo').value = ''; f.querySelector('#pjPayAmt').value = '';
      const r = await Live.add('pays', { to: to.slice(0, 120), line, amount: Math.round(amt * 1e6), basis: t('pj.pay_basis', { no: p.no }), stage: 1, project: p.id });
      if (r) await pjPatch(p, {}, 'pay', { note: `${to.slice(0, 60)} · ${K.fmt.MU(amt * 1e6)}` }); flashM(r ? t('pj.pay_ok') : t('err.save')); },
    risk: async f => { const p = curPj(), s = val(f, 'pjRisk').trim(); if (!p || !s) return; f.querySelector('#pjRisk').value = ''; await pjPatch(p, { risks: [...p.risks, { id: 'r' + Date.now().toString(36), text: s.slice(0, 200), prob: +val(f, 'pjRiskP') || 2, impact: +val(f, 'pjRiskI') || 2, owner: me(), status: RK.open }] }, 'risk', { note: s }); },
    finish: async f => { const p = curPj(); if (p){ f.hidden = true; await finishPj(p); } },
    pjComment: async f => { const p = curPj(), s = val(f, 'pjCmt').trim(); if (!p || !s) return; f.querySelector('#pjCmt').value = ''; await pjPatch(p, { comments: [...p.comments, clean({ id: 'm' + Date.now().toString(36), by: uid(), role: me(), name: Live.data.me || null, ts: Date.now(), text: s.slice(0, 4000) })].slice(-200) }, 'comment', { note: s.slice(0, 80) }); },
  };
  function editPatch(x, o){
    const pt = {}, notes = [], keys = [], same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const set = (k, v, from, to, label) => { if (v === undefined || same(x[k === 'status' ? 'st' : k], v)) return; pt[k] = v; keys.push(k); notes.push(label + (from != null ? `: ${from} → ${to}` : '')); };
    set('title', o.title, null, null, t('fld.title')); set('desc', o.desc, null, null, t('fld.desc'));
    if (o.owner !== undefined && o.owner !== x.owner) { pt.owner = o.owner; keys.push('owner'); notes.push(`${t('fld.owner')}: ${K.fmt.rn(x.owner)} → ${K.fmt.rn(o.owner)}`); }
    set('co', o.co && o.co.filter(n => n !== (o.owner || x.owner)), null, null, t('fld.co')); set('watchers', o.watchers, null, null, t('fld.watchers'));
    set('start', o.start, o.start !== undefined ? dt(x.start) : null, o.start !== undefined ? dt(o.start) : null, t('fld.start')); set('due', o.due, o.due !== undefined ? dt(x.due) : null, o.due !== undefined ? dt(o.due) : null, t('fld.due')); set('dueT', o.dueT, null, null, t('fld.time'));
    if (o.pr !== undefined && prCode(o.pr) !== x.pr){ pt.pr = PR[prCode(o.pr)]; keys.push('pr'); notes.push(`${t('fld.pr')}: ${prName(x.pr)} → ${prName(prCode(o.pr))}`); }
    set('tags', o.tags, null, null, t('fld.tags')); set('project', o.project === undefined ? undefined : (o.project || null), null, null, t('fld.project')); set('obj', o.obj === undefined ? undefined : (o.obj || null), null, null, t('fld.obj'));
    return { patch: pt, keys, note: notes.join('; ').slice(0, 300) };
  }

  // ======================= раздел целиком =======================
  const VIEWS = { overview: vOverview, list: vList, kanban: vKanban, gantt: vGantt, my: vMy, cal: vCal, projects: vProjects, reports: vReports, journal: vJournal };
  function section(tab){
    const k = VIEWS[tab] ? tab : 'overview';
    let html;
    try { html = VIEWS[k](); } catch(e){ console.error('tasks view ' + k, e); html = head(k) + `<p class="banner-bad tk-ban">${t('err.view')}</p>`; }
    return `<div class="tk-root" data-view="${k}"><p class="tk-live" id="tkLive" role="status" aria-live="polite">${liveMsg()}</p>${html}</div>`;
  }
  function navCount(){
    const el = document.querySelector('.nav a[data-s="tasks"] .st'); if (!el) return;
    if (lvl() === '·'){ el.hidden = true; return; }
    const n = data().filter(x => OPEN(x.st)).length; el.textContent = N(n); el.hidden = !n;
  }

  // ======================= стили модуля: только токены :root =======================
  const CSS = `
.tk-root{min-width:0}
.tk-tabs{flex-wrap:wrap}
.tk-ban{margin:0 0 var(--s3);padding:var(--s2) var(--s3);border-radius:var(--r-sm);font-size:var(--fs-3)}
.banner-info.tk-ban{background:var(--info-soft);color:var(--info-text)}.banner-bad.tk-ban{background:var(--bad-soft);color:var(--bad-text)}
.tk-live:empty{display:none}.tk-live{margin:0 0 var(--s2);font-size:var(--fs-3);color:var(--good-text);background:var(--good-soft);padding:var(--s2) var(--s3);border-radius:var(--r-sm)}
.tk-bar{display:flex;flex-wrap:wrap;gap:var(--s2);align-items:center;margin:var(--s2) 0}
.tk-btn{font:inherit;font-size:var(--fs-3);font-weight:700;border:1px solid var(--line);background:var(--surface);color:var(--fg);border-radius:var(--r-sm);padding:var(--s1) var(--s3);min-height:32px;cursor:pointer}
.tk-btn:hover{background:var(--surface-3)}.tk-btn.tk-quiet{border-color:transparent;background:transparent;color:var(--info-text)}
.tk-primary,.btn.tk-primary{background:var(--btn-primary);color:var(--fg-inv);border-color:transparent}.tk-primary:hover{background:var(--btn-primary-hover)}
.btn.tk-danger{background:var(--bad-fill);color:var(--fg-inv);border-color:transparent}
.tk-root .btn,.tk-m .btn{cursor:pointer;min-height:32px;padding:var(--s1) var(--s3);background:var(--surface);color:var(--fg)}
.tk-root .btn.tk-primary,.tk-m .btn.tk-primary{background:var(--btn-primary);color:var(--fg-inv)}
.tk-root .lform .btn[type=submit]{background:var(--btn-primary);color:var(--fg-inv)}
.tk-fdet>summary{cursor:pointer;font-size:var(--fs-3);font-weight:700;color:var(--fg-2);padding:var(--s1) 0;min-height:32px}
.tk-filters{display:flex;flex-wrap:wrap;gap:var(--s2) var(--s3);align-items:flex-end;margin:0 0 var(--s2);font-size:var(--fs-2);color:var(--fg-2)}
.tk-filters label,.tk-inl{display:flex;flex-direction:column;gap:2px;min-width:0;font-size:var(--fs-2);color:var(--fg-2);font-weight:600}
.tk-inl{flex-direction:row;align-items:center;gap:var(--s2)}
.tk-filters select,.tk-filters input,.tk-inl select,.tk-form input,.tk-form select,.tk-form textarea,.tk-inline input,.tk-inline select,.tk-inline textarea{font:inherit;font-size:var(--fs-3);color:var(--fg);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-sm);padding:var(--s1) var(--s2);min-height:32px;min-width:0;max-width:100%}
.tk-filters .tk-chk{flex-direction:row;align-items:center;gap:var(--s1);min-height:32px}
.tk-filters .tk-q{flex:1 1 180px}
.tk-th{font:inherit;color:inherit;background:none;border:0;padding:0;cursor:pointer;text-transform:inherit;letter-spacing:inherit;display:inline-flex;gap:4px;align-items:center}
.tk-tbl tfoot td{background:var(--surface-3);font-weight:700;padding:6px 8px;font-size:var(--fs-3)}
.tk-tbl .tk-grp th{background:var(--surface-3);text-align:left;font-size:var(--fs-2);text-transform:none;letter-spacing:0;color:var(--fg)}
.tk-none{color:var(--fg-3);font-size:var(--fs-3);margin:var(--s1) 0}
.tk-more{display:flex;gap:var(--s2);margin-top:var(--s2)}
.tk-pill{display:inline-block;font-size:var(--fs-1);font-weight:700;border-radius:var(--r-pill);padding:1px var(--s2);white-space:nowrap;background:var(--surface-3);color:var(--fg-2)}
.tk-s-new{background:var(--info-soft);color:var(--info-text)}.tk-s-work{background:var(--accent-soft);color:var(--accent-text)}.tk-s-review{background:var(--warn-soft);color:var(--warn-text)}
.tk-s-done{background:var(--good-soft);color:var(--good-text)}.tk-s-hold{background:var(--surface-3);color:var(--fg-2)}.tk-s-cancel{background:var(--bad-soft);color:var(--bad-text)}
.tk-p-urgent{background:var(--bad-fill);color:var(--fg-inv)}.tk-p-high{background:var(--warn-soft);color:var(--warn-text)}.tk-p-low{color:var(--fg-3)}
.tk-pj-done,.tk-pj-closed{background:var(--good-soft);color:var(--good-text)}.tk-pj-work{background:var(--info-soft);color:var(--info-text)}.tk-pj-pause{background:var(--warn-soft);color:var(--warn-text)}
.tk-world{background:var(--surface-3);color:var(--fg-3)}.tk-rep{background:var(--accent-soft);color:var(--accent-text)}
.tk-tag{font-size:var(--fs-1);color:var(--info-text);font-weight:600}
.tk-kb .tk-col{transition:box-shadow .15s}.tk-kb .tk-col.tk-over{box-shadow:inset 0 0 0 2px var(--accent)}
.tk-card{cursor:pointer;position:relative}.tk-card[data-drag]{cursor:grab}.tk-card:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.tk-card.tk-od{box-shadow:inset 3px 0 0 var(--warn-fill)}
.tk-card.tk-dragging{opacity:.85;z-index:30;pointer-events:none;box-shadow:var(--sh-2);cursor:grabbing}
.tk-card .tkact{display:flex;flex-wrap:wrap;gap:var(--s1);margin-top:var(--s1)}.tk-card .tkact .btn{font-size:var(--fs-2);min-height:28px;padding:2px var(--s2)}
.tk-colnone{font-size:var(--fs-2);color:var(--fg-3);margin:var(--s1)}.tk-colmore{font-size:var(--fs-2);display:block;padding:var(--s1)}
.tk-wip{font-style:normal;color:var(--warn-text);font-size:var(--fs-1)}
.tk-fold{margin-top:var(--s2)}.tk-fold summary{cursor:pointer;font-size:var(--fs-3);font-weight:700;color:var(--fg-2);padding:var(--s1) 0}
.tk-gantt{display:grid;grid-template-columns:240px minmax(0,1fr);border:1px solid var(--line);border-radius:var(--r-sm);overflow:hidden}
.tk-gl{border-right:1px solid var(--line);min-width:0;background:var(--surface)}
.tk-gh{height:30px;font-size:var(--fs-1);color:var(--fg-3);padding:var(--s1) var(--s2);box-sizing:border-box;border-bottom:1px solid var(--line);white-space:nowrap;overflow:hidden}
.tk-grow{height:24px;line-height:24px;font-size:var(--fs-2);padding:0 var(--s2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;box-sizing:border-box}
.tk-grow[data-tk]{cursor:pointer}.tk-grow[data-tk]:hover{background:var(--accent-soft)}.tk-grow b{font-size:var(--fs-1);color:var(--fg-3)}
.tk-ggrpl{background:var(--surface-3);font-size:var(--fs-2)}.tk-groutl{color:var(--fg-2)}
.tk-gs{overflow-x:auto;min-width:0;background:var(--surface)}.tk-gsvg{display:block}
.tk-gwe{fill:var(--surface-2)}.tk-ggrp{fill:var(--surface-3)}.tk-gtick{stroke:var(--line)}.tk-gtx{font-size:var(--fs-1);fill:var(--fg-3)}.tk-gtt{fill:var(--accent-text);font-weight:700}
.tk-gtoday{stroke:var(--accent);stroke-width:2;stroke-dasharray:4 3}
.tk-gb-open{fill:var(--info-fill)}.tk-gb-od{fill:var(--warn-fill)}.tk-gb-done{fill:var(--good-fill);opacity:.7}.tk-gb-hold{fill:var(--line-2)}.tk-gb-late{fill:var(--bad-fill);opacity:.35}
.tk-gbar{cursor:pointer}.tk-gbar.w rect{opacity:.55}.tk-gbar:hover rect{stroke:var(--fg);stroke-width:1}
.tk-gprog{fill:var(--fg-inv);opacity:.8}.tk-gdep{fill:none;stroke:var(--fg-2);stroke-width:1.4}.tk-garr{fill:var(--fg-2)}.tk-gms{fill:var(--c5)}
.tk-glg i{display:inline-block;width:12px;height:8px;border-radius:2px;margin-right:4px;vertical-align:0}
.tk-lg-open{background:var(--info-fill)}.tk-lg-od{background:var(--warn-fill)}.tk-lg-done{background:var(--good-fill)}.tk-lg-dep{height:2px!important;background:var(--fg-2)}.tk-lg-ms{background:var(--c5);transform:rotate(45deg);width:8px!important}.tk-lg-today{width:2px!important;background:var(--accent)}
.tk-seg{display:inline-flex;flex-wrap:wrap;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-sm);padding:2px;gap:2px}
.tk-seg button{font:inherit;font-size:var(--fs-2);font-weight:700;border:0;background:transparent;color:var(--fg-2);padding:var(--s1) var(--s3);border-radius:var(--r-sm);cursor:pointer;min-height:30px}
.tk-seg button.on{background:var(--btn-primary);color:var(--fg-inv)}
.tk-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 var(--s4)}
.tk-cnt{font-size:var(--fs-2);background:var(--surface-3);border-radius:var(--r-pill);padding:0 var(--s2);color:var(--fg-2);font-weight:700}
.tk-ul{list-style:none;margin:0;padding:0}.tk-li{padding:var(--s2) var(--s1);border-bottom:1px solid var(--line);font-size:var(--fs-3);display:flex;flex-wrap:wrap;gap:var(--s1) var(--s2);align-items:baseline}
.tk-li[data-tk]{cursor:pointer}.tk-li[data-tk]:hover{background:var(--accent-soft)}.tk-li b{font-size:var(--fs-2);color:var(--fg-3)}.tk-li small{color:var(--fg-3)}.tk-li .tk-lt{flex:1 1 200px;min-width:0}
.tk-li.tk-od{box-shadow:inset 3px 0 0 var(--warn-fill)}.tk-small li{font-size:var(--fs-2);padding:2px 0;color:var(--fg-2)}
.tk-load{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:var(--s2);height:140px;align-items:end}
.tk-load>div{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:2px;min-width:0}
.tk-load i{display:block;width:70%;background:var(--info-fill);border-radius:3px 3px 0 0;min-height:2px}.tk-load i.over{background:var(--bad-fill)}
.tk-load small,.tk-lv{font-size:var(--fs-1);color:var(--fg-3);white-space:nowrap}
.tk-calnav b{min-width:150px;text-align:center;font-size:var(--fs-4)}
.tk-calg{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:2px;margin-top:var(--s2)}
.tk-cwd{font-size:var(--fs-1);color:var(--fg-3);text-align:center;font-weight:700;padding:var(--s1) 0}
.tk-cd{font:inherit;border:1px solid var(--line);background:var(--surface);border-radius:var(--r-sm);min-height:64px;padding:var(--s1);text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:var(--s1);color:var(--fg);min-width:0}
.tk-cd.out{background:var(--surface-2);color:var(--fg-3)}.tk-cd.today{box-shadow:inset 0 0 0 2px var(--accent)}.tk-cd.sel{background:var(--accent-soft)}
.tk-cd span:first-child{font-weight:700;font-size:var(--fs-3)}.tk-dots{display:flex;flex-wrap:wrap;gap:3px;align-items:center}.tk-dots em{font-size:var(--fs-1);font-style:normal;color:var(--fg-3)}
.tk-dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--fg-3)}
.tk-d-urgent{background:var(--bad-fill)}.tk-d-high{background:var(--warn-fill)}.tk-d-mid{background:var(--info-fill)}.tk-d-low{background:var(--line-2)}.tk-d-r{background:var(--c5);border-radius:1px;transform:rotate(45deg)}.tk-dot.od{box-shadow:0 0 0 2px var(--bad-soft)}
.tk-calsel{margin-top:var(--s3)}.tk-calsel h3,.tk-mlh{font-size:var(--fs-4);margin:var(--s2) 0 var(--s1)}
.tk-calm{display:none}.tk-rli{color:var(--fg-2)}
.tk-pjs{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:var(--s3)}
.tk-pj{border:1px solid var(--line);border-radius:var(--r);padding:var(--s3);display:flex;flex-direction:column;gap:var(--s1);cursor:pointer;background:var(--surface);min-width:0}
.tk-pj:hover{box-shadow:var(--sh-1);border-color:var(--line-2)}.tk-pj:focus-visible{outline:2px solid var(--accent)}.tk-pj small{color:var(--fg-3);font-size:var(--fs-2)}
.tk-pjh{display:flex;justify-content:space-between;gap:var(--s2);align-items:flex-start}.tk-pjh b{font-size:var(--fs-4)}
.tk-prog{height:6px;background:var(--surface-3);border-radius:var(--r-pill);overflow:hidden;margin:var(--s1) 0}.tk-prog i{display:block;height:100%;background:var(--good-fill)}.tk-prog i.late{background:var(--warn-fill)}
.tk-pjg .gr{cursor:pointer}
.tk-empty{text-align:center;padding:var(--s5) var(--s3);color:var(--fg-3);font-size:var(--fs-3)}.tk-empty span{font-size:var(--fs-8);display:block}.tk-empty p{margin:var(--s2) 0}
.tk-m{display:flex;flex-direction:column;gap:var(--s2);padding-bottom:var(--s2)}
.tk-mh{display:flex;flex-wrap:wrap;gap:var(--s2);align-items:center;font-size:var(--fs-3)}
.tk-mnote:empty{display:none}.tk-mnote{margin:0;font-size:var(--fs-3);background:var(--good-soft);color:var(--good-text);padding:var(--s1) var(--s2);border-radius:var(--r-sm)}
.tk-acts{margin-top:0}
.tk-sec{border-top:1px solid var(--line);padding-top:var(--s2);min-width:0}.tk-sec h3{font-size:var(--fs-4);margin:0 0 var(--s2)}.tk-sec h3 small{color:var(--fg-3);font-weight:600}
.tk-kv{display:grid;grid-template-columns:minmax(110px,max-content) minmax(0,1fr);gap:var(--s1) var(--s3);margin:0;font-size:var(--fs-3)}.tk-kv dt{color:var(--fg-3)}.tk-kv dd{margin:0;min-width:0;overflow-wrap:anywhere}
.tk-desc{white-space:normal;overflow-wrap:anywhere}
.tk-chl{list-style:none;margin:0;padding:0}.tk-chl li{padding:2px 0;font-size:var(--fs-3)}.tk-chl input{width:18px;height:18px;vertical-align:-3px}.tk-done{text-decoration:line-through;color:var(--fg-3)}
.tk-inline{display:flex;flex-direction:column;gap:var(--s2);margin-top:var(--s2)}.tk-inline[hidden]{display:none}.tk-inline label{display:flex;flex-direction:column;gap:2px;font-size:var(--fs-2);color:var(--fg-2);font-weight:600}
.tk-row{flex-direction:row;flex-wrap:wrap;align-items:center}.tk-row input:not([type=checkbox]):not([type=file]){flex:1 1 140px}
.tk-form{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--s2) var(--s3)}.tk-form label{display:flex;flex-direction:column;gap:2px;font-size:var(--fs-2);color:var(--fg-2);font-weight:600;min-width:0}
.tk-form .tk-w2{grid-column:1 / -1}.tk-form select[multiple]{min-height:84px}.tk-dt{display:flex;gap:var(--s1)}.tk-dt input{flex:1 1 0;min-width:0}
.tk-err:empty{display:none}.tk-err{color:var(--bad-text);font-size:var(--fs-3);margin:0}
.tk-file{display:inline-flex!important;flex-direction:row!important;align-items:center;gap:var(--s2);cursor:pointer;color:var(--info-text)!important}.tk-file input{font-size:var(--fs-2);max-width:220px}
.tk-files a{font-size:var(--fs-3)}.tk-thumb{display:block;max-width:160px;max-height:120px;margin-top:var(--s1);border-radius:var(--r-sm)}
.tk-cm{border-left:3px solid var(--line);padding:var(--s1) var(--s2);margin-bottom:var(--s2)}.tk-cm p{margin:2px 0;font-size:var(--fs-3);overflow-wrap:anywhere}.tk-cmh{display:flex;flex-wrap:wrap;gap:var(--s2);align-items:baseline;font-size:var(--fs-2)}.tk-cmh small{color:var(--fg-3)}
.tk-ed{font-size:var(--fs-2)!important;color:var(--fg-3)!important}.tk-at{color:var(--info-text)}.tk-vers{background:var(--surface-2);padding:var(--s1) var(--s2);border-radius:var(--r-sm)}.tk-vers p{font-size:var(--fs-2);color:var(--fg-2)}
.tk-hist summary{cursor:pointer;font-weight:700;font-size:var(--fs-3);padding:var(--s1) 0}
.tk-stages{margin:0;padding-left:var(--s5);font-size:var(--fs-3)}.tk-stages li{padding:2px 0}.tk-stages li.done b{color:var(--good-text)}.tk-stages li.late b{color:var(--bad-text)}
.tk-rmx{border-collapse:collapse;font-size:var(--fs-2);margin-bottom:var(--s2)}.tk-rmx caption{text-align:left;color:var(--fg-3);padding-bottom:var(--s1)}.tk-rmx th{font-weight:600;color:var(--fg-2);padding:2px var(--s2);text-align:left}
.tk-rk{width:44px;height:30px;text-align:center;font-weight:700;border:1px solid var(--surface)}.tk-rkl{background:var(--good-soft);color:var(--good-text)}.tk-rkm{background:var(--warn-soft);color:var(--warn-text)}.tk-rkh{background:var(--bad-soft);color:var(--bad-text)}
.tk-rep{background:var(--accent-soft);border-radius:var(--r-sm);padding:var(--s2) var(--s3);font-size:var(--fs-3)}.tk-rep p{margin:var(--s1) 0}
.tk-qc.tk-ok{display:flex;flex-wrap:wrap;gap:var(--s2);align-items:center;font-size:var(--fs-3);color:var(--good-text);background:var(--good-soft);padding:var(--s2) var(--s3);border-radius:var(--r-sm)}
.tk-qc{margin-top:var(--s2)}
@media (max-width:860px){.tk-gantt{grid-template-columns:128px minmax(0,1fr)}.tk-grid2{grid-template-columns:minmax(0,1fr)}.tk-form{grid-template-columns:minmax(0,1fr)}.tk-btn,.tk-root .btn,.tk-m .btn,.tk-seg button{min-height:44px}.tk-card .tkact .btn{min-height:40px}.tk-filters label{flex:1 1 140px}}
@media (max-width:600px){.tk-calg{display:none}.tk-calsel{display:none}.tk-calm{display:block}.tk-load{height:120px}.tk-kv{grid-template-columns:minmax(0,1fr)}.tk-kv dt{margin-top:var(--s1)}}
@media (prefers-reduced-motion:reduce){.tk-kb .tk-col{transition:none}}
@media print{.tk-bar,.tk-filters,.tk-tabs,.tk-more,.tkact{display:none!important}}
`;

  // ======================= подключение к ядру =======================
  function init(k){
    K = k; W = k.W; Live = window.Live;
    dict();
    K.sections.tasks = section;
    K.hooks.afterRender.push((main, h) => { navCount(); if (h === 'tasks') wireMain(main); });
    K.hooks.onLang.push(() => { ver++; });
    Live.onChange(kind => { ver++; if (K.modal.isOpen){ dirty = true; if (['tasks','projects','files','pays','reports','names','mode'].includes(kind)) refreshCard(); } });
    const mEl = document.getElementById('modal');
    if (mEl) new MutationObserver(() => { if (mEl.hidden && dirty){ dirty = false; K.render(); } }).observe(mEl, { attributes:true, attributeFilter:['hidden'] });
    K.ui.css('tasks', CSS);
    // совместимость для других модулей: живые задачи в прежнем виде и следующий статус
    K.data.liveTaskList = () => Live.data.tasks.map(vmLive).map(x => ({ no:x.no, title:x.title, owner:x.owner, src:x.src, due:x.due, pr:PR[x.pr], status:ST[x.st], overdue:isOverdue(x), live:true, id:x.id, who:Live.whoOf(Live.byId('tasks', x.id) || {}), created:x.created }));
    K.data.NEXT_ST = { [ST.new]: ST.work, [ST.work]: ST.review, [ST.review]: ST.done, [ST.hold]: ST.work };
    K.data.tasks = { list: data, byId, projects, canView, create, createProject: createPj, open: openTask, openProject };
  }
  const M = { name:'tasks', version:'0.8.0', ready:true, init, quickCreate, open: openTask, openProject, create, createProject: createPj, list: () => data(), projects: () => projects(), canSee: id => { if (byId(id)) return true; const no = String(id || '').replace(/^w:/, ''); if (!String(id).startsWith('w:')) return false; const a = at(), x = W.tasksAt(a).find(y => y.no === no) || W.tasksDone(0, a).find(y => y.no === no); return !!(x && canView(vmWorld(x, a))); }, canSeeProject: id => { const p = pjById(id); return !!(p && pjVisible(p)); }, ST, PR };
  (window.SUNKAR_MODULES = window.SUNKAR_MODULES || []).push(M);
  window.Tasks = M;

  // ======================= словарь модуля (RU / EN) =======================
  const pre = o => Object.fromEntries(Object.entries(o).map(([k, v]) => ['tasks.' + k, v]));

  const RU = pre({
    'title':'Задачи и проекты', 'tabs':'Представления задач', 'tab.overview':'Обзор', 'tab.list':'Список', 'tab.kanban':'Канбан', 'tab.gantt':'Гантт', 'tab.my':'Мой план', 'tab.cal':'Календарь', 'tab.projects':'Проекты', 'tab.reports':'Отчёты', 'tab.journal':'Журнал',
    'sub.board':'доска на {d} · новые задачи и история компании в одних списках', 'sub.kanban':'перетащите карточку мышью или нажмите «→»', 'sub.list':'{n} задач по фильтру', 'sub.gantt':'полосы от начала до срока, стрелки — зависимости, линия — дата «Данные на»', 'sub.my':'{r} · на {d}', 'sub.cal':'сроки задач и регламентов по дням', 'sub.projects':'на {d} · цель, этапы, вехи, бюджет, риски', 'sub.reports':'за {p} · по правам роли', 'sub.journal':'все изменения задач и проектов',
    'st.new':'новая', 'st.work':'в работе', 'st.review':'на проверке', 'st.done':'выполнена', 'st.hold':'отложена', 'st.cancel':'отменена',
    'pr.low':'низкий', 'pr.mid':'средний', 'pr.high':'высокий', 'pr.urgent':'срочно',
    'src.manual':'вручную', 'src.signal':'сигнал', 'src.chat':'чат', 'src.card':'карточка', 'src.memo':'записка', 'src.ai':'ИИ-помощник', 'src.routine':'регламент', 'src.repeat':'повтор', 'src.errand':'поручение', 'src.docdue':'срок документа', 'src.ar':'дебиторка', 'src.check':'проверка', 'src.onec':'1С',
    'pjs.plan':'план', 'pjs.work':'в работе', 'pjs.pause':'на паузе', 'pjs.done':'завершён', 'pjs.closed':'закрыт',
    'act.start':'Начать', 'act.resume':'Возобновить', 'act.return':'Вернуть', 'act.review':'На проверку', 'act.accept':'Принять', 'act.finish':'Завершить', 'act.hold':'Отложить', 'act.cancel':'Отменить', 'act.cancel_do':'Отменить задачу',
    'btn.new':'+ Новая задача', 'btn.put':'Поставить', 'btn.full':'Подробная форма…', 'btn.create':'Создать', 'btn.cancel':'Отмена', 'btn.edit':'Изменить', 'btn.repeat':'Повторять…', 'btn.to_chat':'В чат', 'btn.add':'Добавить', 'btn.add_sub':'Добавить подзадачу', 'btn.add_dep':'Добавить зависимость', 'btn.add_time':'Добавить время', 'btn.set_est':'Сохранить оценку', 'btn.set_plan':'Сохранить план', 'btn.attach':'Прикрепить файл', 'btn.undep':'Снять зависимость',
    'new_task':'Новая задача', 'board':'Доска задач', 'board_s':'на {d}', 'empty':'На {d} задач нет — поставьте первую.', 'none':'нет', 'more':'Показать ещё {n}', 'all_n':'Все {n}', 'total':'Итого', 'total_n':'Итого: {n}', 'avg_d':'в среднем {d} дн.', 'no_base':'нет базы', 'partial':'по дату', 'on_d':'на {d}',
    'ro':'У вас только просмотр общего журнала — формы недоступны.', 'read_only':'Роль «{r}»: задачи и проекты — только чтение.', 'pdn':'без ИИН и личных данных', 'from_world':'из истории', 'world_note':'Задача из истории компании (данные мира) — только просмотр.',
    'due_s':'срок {d}', 'od_n':'просрочено на {n} дн.', 'late_n':'позже срока на {n} дн.', 'in_time':'в срок', 'waits':'ждёт задачу', 'parent':'Родительская задача', 'sub_of':'Подзадача к {n}', 'gone':'Запись не найдена или нет доступа.', 'denied':'Роль «{r}» эту запись не видит: она вне прав роли.', 'denied_t':'Нет доступа', 'denied':'Нет доступа: роль «{r}» эту задачу не видит — она вне прав роли.', 'denied_t':'Нет доступа', 'no_desc':'Описания нет.',
    'kb_hint':'карточку можно перетащить в другую колонку; с клавиатуры и на телефоне — кнопка «→»', 'kb_all':'Показать все карточки', 'kb.done7':'за 7 дней', 'more_in_list':'ещё {n} — в списке', 'wip_t':'в работе у одного исполнителя — не больше 5 задач', 'list_s':'на {d}',
    'tile.control':'На контроле {d}', 'tile.control_d':'срочных <b class="dn">{u}</b> · высоких <b>{h}</b>', 'tile.overdue':'Просрочено', 'tile.done':'Выполнено за период', 'tile.done_d':'в срок {p} · среднее время {d} дн.', 'tile.created':'Создано за период', 'tile.vs_prev':'{d} к прошлому периоду', 'tile.vs_yago':'{d} к году назад',
    'f.title':'Фильтры', 'f.st':'Статус', 'f.open':'все открытые', 'f.all':'все', 'f.owner':'Исполнитель', 'f.any':'любой', 'f.project':'Проект', 'f.no_project':'без проекта', 'f.none':'не выбран', 'f.tag':'Тег', 'f.created':'Источник и период', 'f.c.all':'все задачи', 'f.c.period':'созданы в периоде', 'f.c.live':'только новые', 'f.c.world':'только из истории', 'f.overdue':'только просроченные', 'f.q':'Поиск', 'f.q_ph':'номер, текст, тег', 'f.reset':'Сбросить', 'f.group':'Группировать',
    'g.none':'без группировки', 'g.project':'по проекту', 'g.owner':'по исполнителю', 'g.scale':'Масштаб', 'g.week':'неделя', 'g.month':'месяц', 'g.quarter':'квартал', 'g.empty':'В этом окне задач нет.', 'g.sub':'окно вокруг {d}', 'g.scroll':'Диаграмма Гантта — прокрутка по горизонтали',
    'g.l_open':'открыта', 'g.l_od':'просрочена', 'g.l_done':'выполнена', 'g.l_dep':'зависимость', 'g.l_rout':'регламент', 'g.l_today':'дата «Данные на»',
    'c.no':'№', 'c.title':'Задача', 'c.owner':'Исполнитель', 'c.author':'Постановщик', 'c.due':'Срок', 'c.pr':'Приоритет', 'c.st':'Статус', 'c.project':'Проект', 'c.chk':'Чек-лист', 'c.time':'Время факт / оценка', 'c.open':'Открыто', 'c.od':'Просрочено', 'c.done_p':'Выполнено', 'c.share':'Доля', 'c.ontime':'В срок, %', 'c.avg':'Среднее время, дн.', 'c.fact_h':'Время факт, ч',
    'c.vs_prev':'К прошлому периоду', 'c.vs_yago':'К году назад', 'c.od_days':'Просрочено, дн.', 'c.week':'{a}–{b}, ч', 'c.month':'Месяц', 'c.created':'Создано', 'c.od_end':'Просрочено на конец', 'c.tasks':'Задач', 'c.done_pct':'Выполнено, %', 'c.bplan':'Бюджет план', 'c.bfact':'Бюджет факт', 'c.dev':'Отклонение, дн.', 'c.src':'Источник', 'c.when':'Когда', 'c.who':'Кто', 'c.what':'Что изменилось', 'c.note':'Подробности',
    'c.edited':'изменено {t}', 'c.none':'Комментариев пока нет.', 'c.rule':'Удалять комментарии нельзя; свой можно изменить в течение 5 минут. @Роль — упоминание.', 'c.late':'Изменить комментарий можно только автору в течение 5 минут.',
    'tip.ontime':'в срок = дата выполнения ≤ срок; доля от выполненных за период', 'tip.avg':'Σ(выполнена − создана) ÷ n', 'tip.od':'сегодня − срок, только открытые', 'tip.load':'оценка минус учтённое время, равномерно по дням до срока', 'tip.od_end':'открытые на конец месяца со сроком раньше конца', 'tip.dev':'фактическая дата этапа − плановая (для открытых — дата «Данные на»)',
    'rep.pick':'Отчёт', 'rep.all':'Все отчёты', 'rep.owners':'По исполнителям', 'rep.overdue':'Просрочки', 'rep.load':'Нагрузка', 'rep.months':'Выполнение в срок по месяцам', 'rep.projects':'По проектам', 'rep.sources':'По источникам',
    'rep.owners_n':'строка → список задач исполнителя; в срок % совпадает с плиткой «Выполнено за период»', 'rep.overdue_n':'только открытые задачи со сроком раньше даты «Данные на»', 'rep.load_n':'оценка — по задачам с оценкой времени; задачи из истории учитываются в «Открыто»', 'rep.months_n':'месяцы выбранного периода; неполный месяц — по датам периода; итоги равны плиткам «Создано» и «Выполнено за период»', 'rep.projects_n':'бюджет — по заявкам на оплату с проектом и статьям бюджета', 'rep.sources_n':'откуда пришла задача',
    'rep.none':'не повторять', 'rep.daily':'ежедневно', 'rep.weekly':'еженедельно', 'rep.monthly':'ежемесячно', 'rep.every':'Каждые N', 'rep.until':'До даты', 'rep.on':'повторяется {k}',
    'my.od':'Просрочено', 'my.today':'Сегодня', 'my.week':'Эта неделя', 'my.later':'Позже', 'my.review':'На проверке у меня', 'my.watch':'Я наблюдаю', 'my.load':'Нагрузка на неделю', 'my.load_s':'оценка минут по дням', 'my.load_n':'по задачам с оценкой времени: остаток оценки распределён по дням до срока; больше 8 ч в день — красным',
    'cal.n':'{n} задач', 'cal.free':'На этот день задач нет.', 'cal.empty':'В этом месяце задач нет.', 'cal.prev':'Предыдущий месяц', 'cal.next':'Следующий месяц', 'cal.today':'К дате «Данные на»', 'cal.sub':'точки — задачи по приоритету, ромб — регламент',
    'r.title':'Регламенты с контрольными точками', 'r.sub':'повторяющиеся задачи компании — в календаре и Гантте как серии', 'r.h1':'Регламент', 'r.h2':'Периодичность', 'r.h3':'Ответственный', 'r.h4':'Ближайшая контрольная точка', 'r.series':'Регламенты',
    'r.meet':'Совещание с начальниками объектов', 'r.meet_p':'еженедельно, пн 09:00', 'r.tabel':'Табель и расчёт зарплаты', 'r.tabel_p':'до 3-го числа', 'r.salary':'Выплата зарплаты', 'r.salary_p':'5-го числа', 'r.taxes':'Налоги, взносы, аванс КПН', 'r.taxes_p':'до 25-го числа', 'r.close':'Закрытие месяца', 'r.close_p':'до 10-го числа', 'r.check':'Проверка каждого объекта', 'r.check_p':'не реже 1 раза в месяц', 'r.check_n':'{n} проверок за 30 дней',
    'fld.title':'Что сделать', 'fld.desc':'Описание', 'fld.owner':'Исполнитель', 'fld.co':'Соисполнители', 'fld.watchers':'Наблюдатели', 'fld.author':'Постановщик', 'fld.start':'Начало', 'fld.due':'Срок', 'fld.time':'Время срока', 'fld.pr':'Приоритет', 'fld.tags':'Теги', 'fld.project':'Проект', 'fld.obj':'Объект', 'fld.checklist':'Чек-лист (пункт на строку)', 'fld.est':'Оценка, мин', 'fld.repeat':'Повторять', 'fld.reason':'Причина отмены', 'fld.created':'Создана', 'fld.done':'Выполнена', 'fld.link':'Источник', 'fld.prev':'Предыдущая в серии', 'fld.next':'Следующая в серии', 'fld.day':'Дата',
    'ph.title':'Что сделать', 'ph.tags':'через запятую', 'ph.checklist':'пункт 1\nпункт 2', 'ph.reason':'почему задача больше не нужна', 'ph.chk':'новый пункт чек-листа', 'ph.sub':'название подзадачи', 'ph.dep':'задача, которую ждём', 'ph.min':'минут', 'ph.min_note':'что сделано', 'ph.comment':'Комментарий · без ИИН и личных данных', 'ph.stage':'название этапа', 'ph.ms':'название вехи', 'ph.risk':'описание риска', 'ph.goal':'1–3 предложения', 'ph.stages':'этап на строку — даты распределятся по сроку',
    's.desc':'Описание', 's.people':'Люди и сроки', 's.check':'Чек-лист', 's.sub':'Подзадачи', 's.deps':'Зависимости', 's.time':'Учёт времени', 's.files':'Файлы', 's.comments':'Комментарии', 's.hist':'История изменений', 'time.fact':'Факт', 'time.est':'Оценка',
    'link.chat':'из чата', 'link.card':'из карточки', 'link.event':'из события', 'link.errand':'из поручения ИИ', 'link.section':'из сигнала раздела',
    'h.created':'создана', 'h.status':'статус', 'h.edit':'изменены поля', 'h.checklist':'чек-лист', 'h.subtask':'подзадача', 'h.dep':'зависимость', 'h.time':'учтено время', 'h.est':'оценка, мин', 'h.comment':'комментарий', 'h.comment_edit':'комментарий изменён', 'h.file':'файл', 'h.repeat':'повтор', 'h.stage':'этап', 'h.milestone':'веха', 'h.member':'участник', 'h.risk':'риск', 'h.budget':'бюджет план', 'h.pay':'заявка на оплату', 'h.finish':'проект завершён', 'h.report':'отчёт сохранён', 'h.pj_status':'статус проекта',
    'cancelled':'Отменена: {r}', 'cancel_ok':'Задача {no} отменена, причина записана в историю.', 'dnd.no':'Перевести в «{s}» эта роль не может.', 'dnd.ok':'{no}: статус «{s}».', 'chat_msg':'Задача {no}: {t} · исполнитель {o} · срок {d}', 'chat_sent':'Сообщение о задаче отправлено в чат ({c}).',
    'ask_q':'Расскажи подробнее: задача {no} «{t}» — что мешает и что сделать', 'ask_pj':'Расскажи подробнее: проект «{n}» — сроки, отставание, риски',
    'qc.done':'Задача {no} создана.', 'qc.fill':'Заполните форму задачи ниже.', 'qc.open':'Открыть задачу', 'qc.src':'источник: {s}',
    'file.hint':'до 10 файлов · файлы демонстрационные', 'file.ok':'Прикреплено файлов: {n}', 'file.err':'Файл не сохранён.', 'file.gone':'файл не найден', 'file.na':'файл недоступен в этом браузере', 'u.kb':'КБ', 'u.h':'ч',
    'err.title':'Укажите, что сделать.', 'err.due':'Укажите срок.', 'err.start':'Начало позже срока.', 'err.desc':'Описание длиннее 4 000 знаков.', 'err.pdn':'Похоже на ИИН — личные данные не вводятся.', 'err.save':'Не сохранено — журнал недоступен.', 'err.reason':'Причина отмены обязательна.', 'err.min':'Минуты: от 1 до 1 440.', 'err.pay':'Укажите получателя и сумму.', 'err.view':'Представление не построилось — данные сохранены, попробуйте другую вкладку.',
    'j.who':'Кто или исполнитель', 'j.from':'С', 'j.to':'По', 'j.q_ph':'номер или текст задачи', 'j.keep':'журнал только дополняется; хранится не меньше 3 лет',
    'pj.one':'проект', 'pj.new':'+ Новый проект', 'pj.hint':'проекты мира — история компании; новые проекты — ваши', 'pj.live':'Новые проекты', 'pj.world':'Проекты компании', 'pj.world_s':'из истории компании', 'pj.none_live':'Своих проектов пока нет.', 'pj.none_world':'На {d} проектов нет.', 'pj.gantt':'Проекты на {d}', 'pj.gantt_s':'полоса — срок, заливка — выполнено, линия — дата «Данные на»',
    'pj.prog':'выполнено {p}', 'pj.tasks':'задач {n}, открыто {o}', 'pj.od':'просрочено {n}', 'pj.dev':'отставание {n} дн.', 'pj.late':'отстаёт', 'pj.budget_s':'бюджет: план {p} · факт {f}',
    'pj.name':'Название', 'pj.goal':'Цель', 'pj.goal_world':'Пройти {n} этапов к {d}.', 'pj.lead':'Руководитель', 'pj.members':'Участники', 'pj.people':'Участники', 'pj.add_member':'Добавить участника', 'pj.stages':'Этапы', 'pj.ms':'Вехи', 'pj.ms_name':'Веха', 'pj.budget':'Бюджет', 'pj.plan':'План', 'pj.plan_m':'План, млн ₸', 'pj.fact':'Факт (заявки на оплату)', 'pj.rest':'Остаток', 'pj.pays_n':'заявок {n}, оплачено {p}', 'pj.rev_new':'Выручка новых объектов ({n})',
    'pj.no_budget':'Бюджет не задан.', 'pj.no_money':'Деньги этой роли недоступны.', 'pj.pay_to':'Получатель', 'pj.pay_amt':'Сумма, млн ₸', 'pj.pay':'Заявка на оплату', 'pj.pay_basis':'по проекту {no}', 'pj.pay_ok':'Заявка на оплату создана — она в разделе «Платежи» на маршруте согласования.',
    'pj.risks':'Риски', 'pj.matrix':'Матрица рисков: вероятность × влияние', 'pj.prob':'вероятность', 'pj.imp':'влияние', 'pj.no_risk':'Рисков не записано.', 'pj.risk_close':'Снять', 'pj.tasks_h':'Задачи проекта', 'pj.show_all':'Показать все ({n})', 'pj.only_open':'Только открытые',
    'pj.add_task':'Создать задачу в проекте', 'pj.report':'Отчёт по проекту', 'pj.finish':'Завершить проект', 'pj.finish_q':'Открытых задач в проекте: {n}. Завершить проект всё равно?', 'pj.finish_yes':'Да, завершить', 'pj.pause':'На паузу', 'pj.resume':'Возобновить', 'pj.world_note':'Проект из истории компании — только просмотр; задачи можно поставить в проекте.',
    'rp.head':'Проект {no} «{n}» на {d}.', 'rp.time':'Срок {a} – {b}: прошло {t} времени, выполнено {p}.', 'rp.tasks':'Задач {n}, выполнено {d}; этапов пройдено {s} из {sn}.', 'rp.late':'Отставание от плана — {n} дн.', 'rp.ontrack':'Идёт по плану.', 'rp.od':'Просрочено задач: {n} — {l}.', 'rp.no_od':'Просроченных задач нет.',
    'rp.budget':'Бюджет: план {p}, факт {f} ({r}).', 'rp.rev':'Выручка новых объектов за срок проекта — {f}.', 'rp.no_money':'Бюджет скрыт по правам роли.', 'rp.risks':'Открытых рисков {n}, из них высоких {h}.', 'rp.no_risks':'Риски не записаны.', 'rp.ms':'Ближайшая веха — «{n}», {d}.',
    'rp.by_ai':'ИИ-помощник · отчёт по данным проекта', 'rp.by_sys':'Сводка по данным (ИИ-помощник подключён с {d})', 'rp.save':'Сохранить в отчёты', 'rp.saved':'Отчёт {no} сохранён.',
    'days.1':'срок 1 день', 'days.3':'срок 3 дня', 'days.7':'срок неделя', 'days.14':'срок 2 недели',
  });
  const EN = pre({
    'title':'Tasks & projects', 'tabs':'Task views', 'tab.overview':'Overview', 'tab.list':'List', 'tab.kanban':'Kanban', 'tab.gantt':'Gantt', 'tab.my':'My plan', 'tab.cal':'Calendar', 'tab.projects':'Projects', 'tab.reports':'Reports', 'tab.journal':'Log',
    'sub.board':'board as of {d} · new tasks and company history in the same lists', 'sub.kanban':'drag a card with the mouse or press “→”', 'sub.list':'{n} tasks match the filter', 'sub.gantt':'bars from start to due date, arrows are dependencies, the line is “Data as of”', 'sub.my':'{r} · as of {d}', 'sub.cal':'task and routine deadlines by day', 'sub.projects':'as of {d} · goal, stages, milestones, budget, risks', 'sub.reports':'for {p} · within the role’s rights', 'sub.journal':'every change to tasks and projects',
    'st.new':'new', 'st.work':'in progress', 'st.review':'in review', 'st.done':'done', 'st.hold':'on hold', 'st.cancel':'cancelled',
    'pr.low':'low', 'pr.mid':'medium', 'pr.high':'high', 'pr.urgent':'urgent',
    'src.manual':'manual', 'src.signal':'signal', 'src.chat':'chat', 'src.card':'card', 'src.memo':'memo', 'src.ai':'AI assistant', 'src.routine':'routine', 'src.repeat':'recurrence', 'src.errand':'assignment', 'src.docdue':'document deadline', 'src.ar':'receivables', 'src.check':'inspection', 'src.onec':'1C',
    'pjs.plan':'planned', 'pjs.work':'in progress', 'pjs.pause':'paused', 'pjs.done':'completed', 'pjs.closed':'closed',
    'act.start':'Start', 'act.resume':'Resume', 'act.return':'Return', 'act.review':'Send for review', 'act.accept':'Accept', 'act.finish':'Complete', 'act.hold':'Put on hold', 'act.cancel':'Cancel', 'act.cancel_do':'Cancel the task',
    'btn.new':'+ New task', 'btn.put':'Assign', 'btn.full':'Full form…', 'btn.create':'Create', 'btn.cancel':'Cancel', 'btn.edit':'Edit', 'btn.repeat':'Repeat…', 'btn.to_chat':'To chat', 'btn.add':'Add', 'btn.add_sub':'Add subtask', 'btn.add_dep':'Add dependency', 'btn.add_time':'Log time', 'btn.set_est':'Save estimate', 'btn.set_plan':'Save plan', 'btn.attach':'Attach file', 'btn.undep':'Remove dependency',
    'new_task':'New task', 'board':'Task board', 'board_s':'as of {d}', 'empty':'No tasks as of {d} — create the first one.', 'none':'none', 'more':'Show {n} more', 'all_n':'All {n}', 'total':'Total', 'total_n':'Total: {n}', 'avg_d':'{d} days on average', 'no_base':'no base', 'partial':'to date', 'on_d':'as of {d}',
    'ro':'You have view-only access to the shared log — forms are unavailable.', 'read_only':'Role “{r}”: tasks and projects are read-only.', 'pdn':'no national ID or personal data', 'from_world':'history', 'world_note':'A task from the company history (world data) — view only.',
    'due_s':'due {d}', 'od_n':'{n} days overdue', 'late_n':'{n} days late', 'in_time':'on time', 'waits':'waits for', 'parent':'Parent task', 'sub_of':'Subtask of {n}', 'gone':'Record not found or no access.', 'denied':'The “{r}” role cannot see this record: it is outside the role’s rights.', 'denied_t':'No access', 'no_desc':'No description.',
    'kb_hint':'drag a card to another column; with the keyboard and on a phone use the “→” button', 'kb_all':'Show all cards', 'kb.done7':'last 7 days', 'more_in_list':'{n} more in the list', 'wip_t':'no more than 5 tasks in progress per assignee', 'list_s':'as of {d}',
    'tile.control':'Under control {d}', 'tile.control_d':'urgent <b class="dn">{u}</b> · high <b>{h}</b>', 'tile.overdue':'Overdue', 'tile.done':'Done in the period', 'tile.done_d':'on time {p} · average {d} days', 'tile.created':'Created in the period', 'tile.vs_prev':'{d} vs previous period', 'tile.vs_yago':'{d} vs a year ago',
    'f.title':'Filters', 'f.st':'Status', 'f.open':'all open', 'f.all':'all', 'f.owner':'Assignee', 'f.any':'any', 'f.project':'Project', 'f.no_project':'no project', 'f.none':'not selected', 'f.tag':'Tag', 'f.created':'Source and period', 'f.c.all':'all tasks', 'f.c.period':'created in the period', 'f.c.live':'new only', 'f.c.world':'history only', 'f.overdue':'overdue only', 'f.q':'Search', 'f.q_ph':'number, text, tag', 'f.reset':'Reset', 'f.group':'Group',
    'g.none':'no grouping', 'g.project':'by project', 'g.owner':'by assignee', 'g.scale':'Scale', 'g.week':'week', 'g.month':'month', 'g.quarter':'quarter', 'g.empty':'No tasks in this window.', 'g.sub':'window around {d}', 'g.scroll':'Gantt chart — scroll horizontally',
    'g.l_open':'open', 'g.l_od':'overdue', 'g.l_done':'done', 'g.l_dep':'dependency', 'g.l_rout':'routine', 'g.l_today':'“Data as of” date',
    'c.no':'No.', 'c.title':'Task', 'c.owner':'Assignee', 'c.author':'Created by', 'c.due':'Due', 'c.pr':'Priority', 'c.st':'Status', 'c.project':'Project', 'c.chk':'Checklist', 'c.time':'Time actual / estimate', 'c.open':'Open', 'c.od':'Overdue', 'c.done_p':'Done', 'c.share':'Share', 'c.ontime':'On time, %', 'c.avg':'Average time, days', 'c.fact_h':'Time spent, h',
    'c.vs_prev':'Vs previous period', 'c.vs_yago':'Vs a year ago', 'c.od_days':'Overdue, days', 'c.week':'{a}–{b}, h', 'c.month':'Month', 'c.created':'Created', 'c.od_end':'Overdue at month end', 'c.tasks':'Tasks', 'c.done_pct':'Done, %', 'c.bplan':'Budget plan', 'c.bfact':'Budget actual', 'c.dev':'Deviation, days', 'c.src':'Source', 'c.when':'When', 'c.who':'Who', 'c.what':'What changed', 'c.note':'Details',
    'c.edited':'edited {t}', 'c.none':'No comments yet.', 'c.rule':'Comments cannot be deleted; you can edit your own within 5 minutes. @Role mentions a role.', 'c.late':'Only the author can edit a comment, within 5 minutes.',
    'tip.ontime':'on time = completion date ≤ due date; share of tasks done in the period', 'tip.avg':'Σ(done − created) ÷ n', 'tip.od':'today − due date, open tasks only', 'tip.load':'estimate minus logged time, spread evenly over the days until due', 'tip.od_end':'open at month end with a due date before month end', 'tip.dev':'actual stage date − planned (open stages: “Data as of”)',
    'rep.pick':'Report', 'rep.all':'All reports', 'rep.owners':'By assignee', 'rep.overdue':'Overdue', 'rep.load':'Workload', 'rep.months':'On-time completion by month', 'rep.projects':'By project', 'rep.sources':'By source',
    'rep.owners_n':'row → the assignee’s task list; on-time % matches the “Done in the period” tile', 'rep.overdue_n':'open tasks with a due date before “Data as of” only', 'rep.load_n':'estimates come from tasks with a time estimate; history tasks count in “Open”', 'rep.months_n':'months of the selected period; a partial month is counted by the period dates; totals equal the “Created” and “Done in the period” tiles', 'rep.projects_n':'budget from payment requests linked to the project and budget lines', 'rep.sources_n':'where the task came from',
    'rep.none':'do not repeat', 'rep.daily':'daily', 'rep.weekly':'weekly', 'rep.monthly':'monthly', 'rep.every':'Every N', 'rep.until':'Until', 'rep.on':'repeats {k}',
    'my.od':'Overdue', 'my.today':'Today', 'my.week':'This week', 'my.later':'Later', 'my.review':'Waiting for my review', 'my.watch':'I am watching', 'my.load':'Workload for the week', 'my.load_s':'estimated minutes per day', 'my.load_n':'tasks with a time estimate: the remaining estimate is spread over the days until due; over 8 h a day is red',
    'cal.n':'{n} tasks', 'cal.free':'No tasks on this day.', 'cal.empty':'No tasks this month.', 'cal.prev':'Previous month', 'cal.next':'Next month', 'cal.today':'To “Data as of”', 'cal.sub':'dots are tasks by priority, a diamond is a routine',
    'r.title':'Routines with checkpoints', 'r.sub':'recurring company tasks — shown as series in the calendar and Gantt', 'r.h1':'Routine', 'r.h2':'Frequency', 'r.h3':'Responsible', 'r.h4':'Next checkpoint', 'r.series':'Routines',
    'r.meet':'Meeting with site managers', 'r.meet_p':'weekly, Mon 09:00', 'r.tabel':'Timesheet and payroll', 'r.tabel_p':'by the 3rd', 'r.salary':'Salary payment', 'r.salary_p':'on the 5th', 'r.taxes':'Taxes, contributions, CIT advance', 'r.taxes_p':'by the 25th', 'r.close':'Month-end close', 'r.close_p':'by the 10th', 'r.check':'Inspection of every site', 'r.check_p':'at least once a month', 'r.check_n':'{n} inspections in 30 days',
    'fld.title':'What to do', 'fld.desc':'Description', 'fld.owner':'Assignee', 'fld.co':'Co-assignees', 'fld.watchers':'Watchers', 'fld.author':'Created by', 'fld.start':'Start', 'fld.due':'Due', 'fld.time':'Due time', 'fld.pr':'Priority', 'fld.tags':'Tags', 'fld.project':'Project', 'fld.obj':'Site', 'fld.checklist':'Checklist (one item per line)', 'fld.est':'Estimate, min', 'fld.repeat':'Repeat', 'fld.reason':'Reason for cancelling', 'fld.created':'Created', 'fld.done':'Done', 'fld.link':'Source', 'fld.prev':'Previous in series', 'fld.next':'Next in series', 'fld.day':'Date',
    'ph.title':'What to do', 'ph.tags':'comma-separated', 'ph.checklist':'item 1\nitem 2', 'ph.reason':'why the task is no longer needed', 'ph.chk':'new checklist item', 'ph.sub':'subtask title', 'ph.dep':'task we are waiting for', 'ph.min':'minutes', 'ph.min_note':'what was done', 'ph.comment':'Comment · no national ID or personal data', 'ph.stage':'stage name', 'ph.ms':'milestone name', 'ph.risk':'risk description', 'ph.goal':'1–3 sentences', 'ph.stages':'one stage per line — dates are spread over the term',
    's.desc':'Description', 's.people':'People and dates', 's.check':'Checklist', 's.sub':'Subtasks', 's.deps':'Dependencies', 's.time':'Time tracking', 's.files':'Files', 's.comments':'Comments', 's.hist':'Change history', 'time.fact':'Actual', 'time.est':'Estimate',
    'link.chat':'from a chat', 'link.card':'from a card', 'link.event':'from an event', 'link.errand':'from an AI assignment', 'link.section':'from a section signal',
    'h.created':'created', 'h.status':'status', 'h.edit':'fields changed', 'h.checklist':'checklist', 'h.subtask':'subtask', 'h.dep':'dependency', 'h.time':'time logged', 'h.est':'estimate, min', 'h.comment':'comment', 'h.comment_edit':'comment edited', 'h.file':'file', 'h.repeat':'recurrence', 'h.stage':'stage', 'h.milestone':'milestone', 'h.member':'member', 'h.risk':'risk', 'h.budget':'budget plan', 'h.pay':'payment request', 'h.finish':'project completed', 'h.report':'report saved', 'h.pj_status':'project status',
    'cancelled':'Cancelled: {r}', 'cancel_ok':'Task {no} cancelled; the reason is in the history.', 'dnd.no':'This role cannot move the task to “{s}”.', 'dnd.ok':'{no}: status “{s}”.', 'chat_msg':'Task {no}: {t} · assignee {o} · due {d}', 'chat_sent':'A message about the task was sent to the chat ({c}).',
    'ask_q':'Tell me more: task {no} “{t}” — what blocks it and what to do', 'ask_pj':'Tell me more: project “{n}” — deadlines, delays, risks',
    'qc.done':'Task {no} created.', 'qc.fill':'Fill in the task form below.', 'qc.open':'Open task', 'qc.src':'source: {s}',
    'file.hint':'up to 10 files · files are for demonstration', 'file.ok':'Files attached: {n}', 'file.err':'The file was not saved.', 'file.gone':'file not found', 'file.na':'file unavailable in this browser', 'u.kb':'KB', 'u.h':'h',
    'err.title':'Enter what to do.', 'err.due':'Enter a due date.', 'err.start':'Start is after the due date.', 'err.desc':'The description is longer than 4,000 characters.', 'err.pdn':'Looks like a national ID — personal data is not entered.', 'err.save':'Not saved — the log is unavailable.', 'err.reason':'A reason is required.', 'err.min':'Minutes: 1 to 1,440.', 'err.pay':'Enter a recipient and an amount.', 'err.view':'The view could not be built — the data is safe; try another tab.',
    'j.who':'Who or assignee', 'j.from':'From', 'j.to':'To', 'j.q_ph':'task number or text', 'j.keep':'the log is append-only and kept for at least 3 years',
    'pj.one':'project', 'pj.new':'+ New project', 'pj.hint':'world projects are company history; new projects are yours', 'pj.live':'New projects', 'pj.world':'Company projects', 'pj.world_s':'from the company history', 'pj.none_live':'No projects of your own yet.', 'pj.none_world':'No projects as of {d}.', 'pj.gantt':'Projects as of {d}', 'pj.gantt_s':'bar is the term, fill is progress, line is “Data as of”',
    'pj.prog':'{p} done', 'pj.tasks':'{n} tasks, {o} open', 'pj.od':'{n} overdue', 'pj.dev':'{n} days behind', 'pj.late':'behind', 'pj.budget_s':'budget: plan {p} · actual {f}',
    'pj.name':'Name', 'pj.goal':'Goal', 'pj.goal_world':'Complete {n} stages by {d}.', 'pj.lead':'Project lead', 'pj.members':'Members', 'pj.people':'Members', 'pj.add_member':'Add member', 'pj.stages':'Stages', 'pj.ms':'Milestones', 'pj.ms_name':'Milestone', 'pj.budget':'Budget', 'pj.plan':'Plan', 'pj.plan_m':'Plan, ₸ M', 'pj.fact':'Actual (payment requests)', 'pj.rest':'Remaining', 'pj.pays_n':'{n} requests, paid {p}', 'pj.rev_new':'Revenue of new sites ({n})',
    'pj.no_budget':'No budget set.', 'pj.no_money':'Money is not available to this role.', 'pj.pay_to':'Recipient', 'pj.pay_amt':'Amount, ₸ M', 'pj.pay':'Payment request', 'pj.pay_basis':'for project {no}', 'pj.pay_ok':'Payment request created — it is in “Payments” on the approval route.',
    'pj.risks':'Risks', 'pj.matrix':'Risk matrix: probability × impact', 'pj.prob':'probability', 'pj.imp':'impact', 'pj.no_risk':'No risks recorded.', 'pj.risk_close':'Close', 'pj.tasks_h':'Project tasks', 'pj.show_all':'Show all ({n})', 'pj.only_open':'Open only',
    'pj.add_task':'Create task in project', 'pj.report':'Project report', 'pj.finish':'Complete project', 'pj.finish_q':'Open tasks in the project: {n}. Complete the project anyway?', 'pj.finish_yes':'Yes, complete', 'pj.pause':'Pause', 'pj.resume':'Resume', 'pj.world_note':'A project from the company history — view only; you can still create tasks in it.',
    'rp.head':'Project {no} “{n}” as of {d}.', 'rp.time':'Term {a} – {b}: {t} of the time has passed, {p} done.', 'rp.tasks':'{n} tasks, {d} done; {s} of {sn} stages completed.', 'rp.late':'Behind plan by {n} days.', 'rp.ontrack':'On track.', 'rp.od':'Overdue tasks: {n} — {l}.', 'rp.no_od':'No overdue tasks.',
    'rp.budget':'Budget: plan {p}, actual {f} ({r}).', 'rp.rev':'Revenue of new sites over the project term — {f}.', 'rp.no_money':'Budget hidden by role rights.', 'rp.risks':'{n} open risks, {h} of them high.', 'rp.no_risks':'No risks recorded.', 'rp.ms':'Next milestone — “{n}”, {d}.',
    'rp.by_ai':'AI assistant · report on project data', 'rp.by_sys':'Data summary (the AI assistant is available from {d})', 'rp.save':'Save to reports', 'rp.saved':'Report {no} saved.',
    'days.1':'due in 1 day', 'days.3':'due in 3 days', 'days.7':'due in a week', 'days.14':'due in 2 weeks',
  });
    // тексты мира (задачи, проекты, этапы) — перевод по самому тексту
  const PH = { 'Закрыть смену / разобрать замечание':'Close the shift / handle a remark', 'Приказ и обновление графика':'Order and schedule update', 'Проверка проекта договора / ответа заказчику':'Review a draft contract / reply to the customer', 'Сверка оплат и акт сверки':'Payment reconciliation and statement', 'Заявка на имущество для поста':'Equipment request for a post', 'ТО / страховка автомобиля':'Vehicle service / insurance', 'Письмо заказчику по оплате / тарифу':'Letter to the customer on payment / rate', 'Проверка копий и выгрузок 1С':'Check 1C backups and exports',
    'Перенести старые копии на архивный диск (без удаления), повторить задание Effector Saver':'Move old backups to the archive disk (no deletion), rerun the Effector Saver job',
    'Тендеры весны: новые объекты':'Spring tenders: new sites', 'Летняя форма: закупка и выдача':'Summer uniform: purchase and issue', 'Новый объект по тендеру: бизнес-центр, 4 поста':'New tender site: business centre, 4 posts', 'Подготовка к плановой проверке органов внутренних дел':'Preparing for the scheduled police inspection', 'Ещё 2 автомобиля ГБР в 2027 году':'2 more rapid-response vehicles in 2027', 'Задачи и чаты: подключение Битрикс24':'Tasks and chats: connecting Bitrix24',
    'инвентаризация':'stocktaking', 'акты сверки с заказчиками':'reconciliation with customers', 'резервы отпусков':'vacation reserves', 'годовая ФНО':'annual tax return', 'аудит баланса':'balance sheet audit', 'мониторинг госзакупок':'public procurement monitoring', 'осмотры и расчёт тарифа':'site visits and rate calculation', 'заявки':'bids', 'договоры':'contracts', 'выставление постов':'posting guards',
    'потребность по нормам':'needs by norms', 'сравнение КП':'comparing quotes', 'оплата по заявке':'payment by request', 'выдача на объекты':'issue to sites', 'список и направления':'list and referrals', 'обучение':'training', 'экзамен':'exam', 'удостоверения в реестр':'certificates to the register', 'заявка на госзакупки':'public procurement bid', 'осмотр и расчёт тарифа':'site visit and rate calculation', 'договор и допсоглашение':'contract and addendum', 'набор и обучение 9 охранников':'hiring and training 9 guards',
    'драйверы':'drivers', 'бюджеты блоков':'unit budgets', 'свод БДР и БДДС':'P&L and cash budget roll-up', 'согласование ГД':'general director approval', 'утверждение учредителем':'founder approval', 'лицензия и приложения':'licence and annexes', 'журналы постов':'post logs', 'оружейная комната':'weapons room', 'инструктажи':'briefings', 'самопроверка':'self-inspection',
    'выбор модели':'choosing a model', 'договор лизинга':'leasing contract', 'аванс (октябрь)':'advance (October)', 'поставка':'delivery', 'оклейка и рации':'livery and radios', 'вебхук на сервере':'server webhook', 'сотрудники и структура':'staff and structure', 'задачи — чтение':'tasks — read', 'задачи — двусторонняя':'tasks — two-way', 'чаты и уведомления':'chats and notifications',
    'поручение':'assignment', 'сигнал':'signal', 'регламент':'routine', 'срок документа':'document deadline', 'дебиторка':'receivables', 'проверка':'inspection', 'вручную':'manual', 'Прочие':'Other', 'Форма, обувь, спецсредства':'Uniform, footwear, special equipment', 'Лизинг автомобилей (платежи)':'Vehicle leasing (payments)', 'открыт':'open', 'снят':'closed', 'Закрыть смену':'Close the shift', 'замена из резерва':'replacement from reserve' };
  for (let y = 2021; y <= 2028; y++){ PH['Закрытие года ' + y] = 'Year-end close ' + y; PH['Бюджет ' + y] = 'Budget ' + y; PH['Переаттестация охранников, I полугодие ' + y] = 'Guard recertification, H1 ' + y; PH['Переаттестация охранников, IV квартал ' + y] = 'Guard recertification, Q4 ' + y; }
  function dict(){ I.add('ru', RU); I.add('en', EN); I.phrases('en', PH); }

})();
