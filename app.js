/* ═════════ MAISON NOIR — Luxury Todo Atelier ═════════
   100% localStorage · strange port :47329 · vanilla JS + Chart.js  */
'use strict';
const LS_KEY = 'luxury_maisontodo_v1';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const todayStr = (d = new Date()) => d.toISOString().slice(0, 10);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const STATUS = {
  new:    { label: 'new',                  icon: '✦', cls: 'st-new' },
  started:{ label: 'started',              icon: '▶', cls: 'st-started' },
  partial:{ label: 'partially completed',  icon: '◐', cls: 'st-partial' },
  done:   { label: 'done',                 icon: '✔', cls: 'st-done' },
};
const STATUS_ORDER = ['new', 'started', 'partial', 'done'];
const DEFAULT_CATS = [
  { id: 'c-personal', name: 'Personal',  color: '#d4af37', icon: 'fa-crown' },
  { id: 'c-work',     name: 'Work',      color: '#7fb4ff', icon: 'fa-briefcase' },
  { id: 'c-luxury',   name: 'Luxury',    color: '#e8a0bf', icon: 'fa-gem' },
  { id: 'c-health',   name: 'Health',    color: '#6ee7a8', icon: 'fa-heart-pulse' },
  { id: 'c-finance',  name: 'Finance',   color: '#ffcf7d', icon: 'fa-coins' },
  { id: 'c-learning', name: 'Learning',  color: '#d3a6ff', icon: 'fa-book-open' },
];
const DEFAULT_PANELS = [
  { id: 'p-new',     title: '✦ New Chamber',          statusRef: 'new',     color: '#7fb4ff' },
  { id: 'p-started', title: '▶ Atelier in Motion',    statusRef: 'started', color: '#ffcf7d' },
  { id: 'p-partial', title: '◐ Gilding in Progress',  statusRef: 'partial', color: '#d3a6ff' },
  { id: 'p-done',    title: '✔ Hall of Triumph',      statusRef: 'done',    color: '#6ee7a8' },
];

/* ─────────── STATE ─────────── */
let db = null;
let activeCat = '';
let editingId = null;
let draftSubs = [];
let charts = {};
let lensRange = { from: '', to: '' };
const expandedKids = new Set(); // board cards with their heir tree unfolded

function defaultDB() {
  return {
    tasks: [], categories: JSON.parse(JSON.stringify(DEFAULT_CATS)),
    panels: JSON.parse(JSON.stringify(DEFAULT_PANELS)),
    settings: { retentionMonths: 4, autoPurge: true, purgeMode: 'completed', name: '', accent: 'gold', theme: 'dark' },
    meta: { created: Date.now(), launches: 0 },
  };
}
function save() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
    updateStorageMeter();
  } catch (e) { toast('Vault full — export & purge old tasks', false); }
}
function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) { db = defaultDB(); save(); return; }
    db = Object.assign(defaultDB(), JSON.parse(raw));
    if (!Array.isArray(db.tasks)) db.tasks = [];
    if (!Array.isArray(db.categories) || !db.categories.length) db.categories = JSON.parse(JSON.stringify(DEFAULT_CATS));
    if (!Array.isArray(db.panels) || !db.panels.length) db.panels = JSON.parse(JSON.stringify(DEFAULT_PANELS));
    db.settings = Object.assign(defaultDB().settings, db.settings || {});
    // migrate heirs: every subtask owns a comments thread
    db.tasks.forEach(t => {
      if (!Array.isArray(t.subtasks)) t.subtasks = [];
      t.subtasks.forEach(s => { if (!Array.isArray(s.comments)) s.comments = []; });
    });
  } catch { db = defaultDB(); }
}

/* ─────────── PURGE (Oblivion Vault) ─────────── */
function purgeCandidates() {
  const months = Math.max(1, Number(db.settings.retentionMonths) || 4);
  const cutoff = Date.now() - months * 30.44 * 24 * 3600 * 1000;
  return db.tasks.filter(t => {
    const ref = db.settings.purgeMode === 'all'
      ? Math.min(t.createdAt || Date.now(), t.completedAt || t.createdAt || Date.now())
      : (t.status === 'done' ? (t.completedAt || t.createdAt || Date.now()) : Infinity);
    return ref < cutoff;
  });
}
function runPurge(silent = false) {
  if (!db.settings.autoPurge && silent) return 0;
  const doomed = purgeCandidates();
  if (!doomed.length) { if (!silent) toast('Vault is pristine — nothing old enough to purge'); return 0; }
  const ids = new Set(doomed.map(t => t.id));
  db.tasks = db.tasks.filter(t => !ids.has(t.id));
  save(); renderAll();
  if (!silent) toast(`Oblivion claimed ${doomed.length} task${doomed.length > 1 ? 's' : ''} older than ${db.settings.retentionMonths} mo`, true);
  return doomed.length;
}

/* ─────────── HELPERS ─────────── */
/* ─────────── MARKDOWN (heir notes) ───────────
   marked + DOMPurify when online; built-in lite renderer offline.
   Unsanitized HTML is NEVER injected — fallback path is escaped. */
function mdRender(src) {
  const text = String(src ?? '');
  if (!text.trim()) return '<p class="muted">—</p>';
  try {
    if (typeof window !== 'undefined' && window.marked && typeof window.marked.parse === 'function'
        && window.DOMPurify && typeof window.DOMPurify.sanitize === 'function') {
      if (!mdRender._cfg && window.marked.use) { try { window.marked.use({ breaks: true, gfm: true }); } catch {} mdRender._cfg = true; }
      if (!mdRender._hook) {
        try {
          window.DOMPurify.addHook('afterSanitizeAttributes', n => {
            if (n.tagName === 'A') { n.setAttribute('target', '_blank'); n.setAttribute('rel', 'noopener'); }
          });
        } catch {}
        mdRender._hook = true;
      }
      return window.DOMPurify.sanitize(window.marked.parse(text));
    }
  } catch {}
  return mdLite(text);
}
function mdLite(raw) {
  const t = esc(raw ?? '');
  const fences = [];
  const fenced = t.replace(/```(\w*)\n([\s\S]*?)```/g, (m, lang, code) => {
    fences.push(`<pre><code>${code.replace(/^\n+|\n+$/g, '')}</code></pre>`);
    return `\u0000${fences.length - 1}\u0000`;
  });
  const inline = s => s
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\n]+)\*/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  let html = '', inList = null;
  const closeList = () => { if (inList) { html += inList === 'ul' ? '</ul>' : '</ol>'; inList = null; } };
  for (const line of fenced.split('\n')) {
    const ph = line.match(/^\u0000(\d+)\u0000$/);
    const h = line.match(/^(#{1,4})\s+(.*)/);
    const q = line.match(/^&gt;\s?(.*)/);
    const ul = line.match(/^\s*[-*]\s+(.*)/);
    const ol = line.match(/^\s*\d+[.)]\s+(.*)/);
    if (ph) { closeList(); html += fences[+ph[1]]; continue; }
    if (h) { closeList(); html += `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`; continue; }
    if (q) { closeList(); html += `<blockquote>${inline(q[1])}</blockquote>`; continue; }
    if (ul) { if (inList !== 'ul') { closeList(); html += '<ul>'; inList = 'ul'; } html += `<li>${inline(ul[1])}</li>`; continue; }
    if (ol) { if (inList !== 'ol') { closeList(); html += '<ol>'; inList = 'ol'; } html += `<li>${inline(ol[1])}</li>`; continue; }
    if (!line.trim()) { closeList(); continue; }
    closeList(); html += `<p>${inline(line)}</p>`;
  }
  closeList();
  return html || '<p class="muted">—</p>';
}
function kidComments(t) { return (t.subtasks || []).reduce((n, s) => n + ((s.comments || []).length), 0); }

function catById(id) { return db.categories.find(c => c.id === id) || db.categories[0]; }
function panelById(id) { return db.panels.find(p => p.id === id) || db.panels[0]; }
function subStats(t) {
  const total = (t.subtasks || []).length;
  const done = (t.subtasks || []).filter(s => s.done).length;
  return { total, done, pct: total ? Math.round(done / total * 100) : (t.status === 'done' ? 100 : 0) };
}
function isOverdue(t) {
  if (!t.dueDate || t.status === 'done') return false;
  return t.dueDate < todayStr();
}
function filteredTasks() {
  const q = ($('#searchInput').value || '').toLowerCase().trim();
  const fc = $('#filterCategory').value, fp = $('#filterPriority').value;
  const showDone = $('#showDoneToggle').checked;
  return db.tasks.filter(t => {
    if (!showDone && t.status === 'done') return false;
    if (activeCat && t.categoryId !== activeCat) return false;
    if (fc && t.categoryId !== fc) return false;
    if (fp && t.priority !== fp) return false;
    if (q) {
      const hay = (t.title + ' ' + (t.desc || '') + ' ' + (t.subtasks || []).map(s => s.title + ' ' + (s.comments || []).map(c => c.text).join(' ')).join(' ')).toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}
function completedOn(dateStr) { return db.tasks.filter(t => t.status === 'done' && t.completedAt && todayStr(new Date(t.completedAt)) === dateStr); }
function startOfWeek(d = new Date()) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setDate(x.getDate() - day); x.setHours(0, 0, 0, 0); return x; }
function toast(msg, gold = false) {
  const el = document.createElement('div');
  el.className = 'toast' + (gold ? ' gold' : ''); el.textContent = msg;
  $('#toasts').appendChild(el); setTimeout(() => { el.style.opacity = '0'; el.style.transition = '.4s'; setTimeout(() => el.remove(), 400); }, 2800);
}
function celebrate() {
  try { confetti({ particleCount: 130, spread: 80, origin: { y: .7 }, colors: ['#d4af37', '#f3d97b', '#ffffff', '#e8a0bf'] }); } catch {}
}
function updateStorageMeter() {
  try {
    const bytes = (localStorage.getItem(LS_KEY) || '').length;
    const pct = Math.min(100, Math.round(bytes / (5 * 1024 * 1024) * 100));
    $('#storageBar').style.width = Math.max(3, pct) + '%';
    $('#storageLabel').textContent = (bytes / 1024).toFixed(1) + ' KB · ' + db.tasks.length + ' tasks';
  } catch {}
}

/* ─────────── RENDER: CATEGORIES ─────────── */
function renderCategories() {
  const box = $('#categoryList'); box.innerHTML = '';
  const counts = {};
  db.tasks.forEach(t => counts[t.categoryId] = (counts[t.categoryId] || 0) + 1);
  const all = document.createElement('div');
  all.className = 'cat-item' + (!activeCat ? ' active' : '');
  all.innerHTML = `<span class="cat-dot" style="color:#d4af37;background:#d4af37"></span> All Salons <span class="n">${db.tasks.length}</span>`;
  all.onclick = () => { activeCat = ''; renderAll(); };
  box.appendChild(all);
  db.categories.forEach(c => {
    const el = document.createElement('div');
    el.className = 'cat-item' + (activeCat === c.id ? ' active' : '');
    el.innerHTML = `<span class="cat-dot" style="color:${c.color};background:${c.color}"></span> <i class="fa-solid ${c.icon || 'fa-tag'}" style="color:${c.color};font-size:11px"></i> ${esc(c.name)} <span class="n">${counts[c.id] || 0}</span><button class="cx" title="Delete">✕</button>`;
    el.onclick = e => { if (e.target.classList.contains('cx')) return; activeCat = (activeCat === c.id ? '' : c.id); renderAll(); };
    el.querySelector('.cx').onclick = () => deleteCategory(c.id);
    el.ondblclick = () => openCategoryModal(c);
    box.appendChild(el);
  });
  const fc = $('#filterCategory');
  fc.innerHTML = '<option value="">All categories</option>' + db.categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
}
function deleteCategory(id) {
  if (db.categories.length <= 1) return toast('A maison needs at least one category');
  miniConfirm('Delete category?', `Tasks in it move to “${db.categories.find(c => c.id !== id)?.name}”.`, () => {
    const fallback = db.categories.find(c => c.id !== id).id;
    db.tasks.forEach(t => { if (t.categoryId === id) t.categoryId = fallback; });
    db.categories = db.categories.filter(c => c.id !== id);
    if (activeCat === id) activeCat = '';
    save(); renderAll(); toast('Category dissolved');
  });
}

/* ─────────── RENDER: BOARD ─────────── */
function renderBoard() {
  const board = $('#board'); board.innerHTML = '';
  const tasks = filteredTasks();
  db.panels.forEach(p => {
    const col = document.createElement('div');
    col.className = 'panel'; col.dataset.panelId = p.id;
    const list = tasks.filter(t => (t.panelId || statusToPanel(t.status)) === p.id);
    col.innerHTML = `
      <div class="panel-head">
        <span class="dot" style="background:${p.color};box-shadow:0 0 12px ${p.color}"></span>
        <h3>${esc(p.title)}</h3><span class="count">${list.length}</span>
        <button class="p-act" data-act="add" title="Add task here"><i class="fa-solid fa-plus"></i></button>
        <button class="p-act" data-act="edit" title="Rename salon"><i class="fa-solid fa-pen"></i></button>
        <button class="p-act" data-act="del" title="Dissolve salon"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="panel-body"></div>`;
    const body = col.querySelector('.panel-body');
    if (!list.length) body.innerHTML = `<div class="empty-drop">Empty salon —<br/>drop a masterpiece here ◆</div>`;
    list.sort((a, b) => (b.priority === 'royal') - (a.priority === 'royal') || (b.createdAt - a.createdAt))
      .forEach(t => body.appendChild(taskCard(t)));
    col.querySelector('[data-act=add]').onclick = () => openTaskModal(null, p.id);
    col.querySelector('[data-act=edit]').onclick = () => openPanelModal(p);
    col.querySelector('[data-act=del]').onclick = () => deletePanel(p.id);
    // drag-over
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('dragover'); });
    col.addEventListener('dragleave', () => col.classList.remove('dragover'));
    col.addEventListener('drop', e => {
      e.preventDefault(); col.classList.remove('dragover');
      const id = e.dataTransfer.getData('text/plain');
      moveTaskToPanel(id, p.id);
    });
    board.appendChild(col);
  });
  $('#taskCountFoot').textContent = `${db.tasks.length} tasks · ${db.tasks.filter(t => t.status === 'done').length} enthroned as done`;
}
function statusToPanel(status) {
  const p = db.panels.find(p => p.statusRef === status);
  return p ? p.id : db.panels[0].id;
}
function taskCard(t) {
  const c = catById(t.categoryId);
  const s = subStats(t);
  const el = document.createElement('div');
  el.className = 'task' + (t.status === 'done' ? ' done-card' : '');
  el.draggable = true; el.dataset.id = t.id;
  el.innerHTML = `
    <div class="t-top"><span class="t-title">${esc(t.title)}</span>
      <span class="t-menu">
        <button data-a="open" title="Open"><i class="fa-solid fa-up-right-from-square"></i></button>
        <button data-a="edit" title="Edit"><i class="fa-solid fa-pen"></i></button>
        <button data-a="del" title="Delete"><i class="fa-solid fa-trash-can"></i></button>
      </span></div>
    ${t.desc ? `<p class="t-desc">${esc(t.desc)}</p>` : ''}
    <div class="t-meta">
      <span class="cat-pill" style="background:${c.color}22;color:${c.color};border:1px solid ${c.color}55">${esc(c.name)}</span>
      <span class="st ${STATUS[t.status]?.cls || 'st-new'}">${STATUS[t.status]?.icon} ${STATUS[t.status]?.label || t.status}</span>
      <span class="pri pri-${t.priority}">${t.priority === 'royal' ? '👑 royal' : t.priority}</span>
      ${t.dueDate ? `<span class="due ${isOverdue(t) ? 'over' : ''}"><i class="fa-regular fa-calendar"></i> ${t.dueDate}${isOverdue(t) ? ' · late!' : ''}</span>` : ''}
    </div>
    ${s.total ? `<div class="sub-progress"><div class="bar"><i style="width:${s.pct}%"></i></div><small>${s.done}/${s.total} subtasks · ${s.pct}%</small></div>` : ''}
    ${s.total ? `<div class="kids">
      <button class="kids-toggle" data-kids-toggle title="Unfold heirs">${expandedKids.has(t.id) ? '▾' : '▸'} <span>heirs · ${s.done}/${s.total}</span>${kidComments(t) ? ` <em class="c-badge">💬 ${kidComments(t)}</em>` : ''}</button>
      <div class="kids-list" style="${expandedKids.has(t.id) ? '' : 'display:none'}">
        ${(t.subtasks || []).map(sub => `
          <div class="kid-row ${sub.done ? 'done' : ''}">
            <input type="checkbox" data-kid-check="${sub.id}" ${sub.done ? 'checked' : ''} title="Toggle heir" />
            <span class="kid-title">${esc(sub.title)}</span>
            ${(sub.comments || []).length
              ? `<button class="c-badge" data-kid-open="${sub.id}" title="Read heir notes">💬 ${sub.comments.length}</button>`
              : `<button class="c-add" data-kid-open="${sub.id}" title="Chronicle a note">💬+</button>`}
          </div>`).join('')}
      </div>
    </div>` : ''}`;
  el.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', t.id); el.classList.add('dragging'); });
  el.addEventListener('dragend', () => el.classList.remove('dragging'));
  el.querySelector('[data-a=open]').onclick = e => { e.stopPropagation(); openDrawer(t.id); };
  el.querySelector('[data-a=edit]').onclick = e => { e.stopPropagation(); openTaskModal(t.id); };
  el.querySelector('[data-a=del]').onclick = e => { e.stopPropagation(); delTask(t.id); };
  el.onclick = () => openDrawer(t.id);
  const tog = el.querySelector('[data-kids-toggle]');
  if (tog) tog.onclick = e => { e.stopPropagation(); expandedKids.has(t.id) ? expandedKids.delete(t.id) : expandedKids.add(t.id); renderBoard(); };
  el.querySelectorAll('[data-kid-check]').forEach(cb => {
    cb.onclick = e => e.stopPropagation();
    cb.onchange = () => {
      const sub = (t.subtasks || []).find(x => x.id === cb.dataset.kidCheck);
      if (!sub) return;
      sub.done = cb.checked; save(); renderBoard(); renderKPIs();
      const st = subStats(t);
      if (st.total && st.done === st.total && t.status !== 'done') toast('All heirs complete — crown it DONE 👑', true);
    };
  });
  el.querySelectorAll('[data-kid-open]').forEach(b => b.onclick = e => { e.stopPropagation(); openDrawer(t.id, b.dataset.kidOpen); });
  return el;
}
function moveTaskToPanel(id, panelId) {
  const t = db.tasks.find(t => t.id === id);
  if (!t) return;
  const p = panelById(panelId);
  const prev = t.status;
  t.panelId = panelId;
  if (p.statusRef) {
    t.status = p.statusRef;
    if (t.status === 'done' && prev !== 'done') { t.completedAt = Date.now(); celebrate(); toast('Crowned as DONE 👑', true); }
    if (t.status !== 'done') t.completedAt = null;
  }
  save(); renderAll();
}
function delTask(id) {
  const t = db.tasks.find(t => t.id === id);
  miniConfirm('Destroy this task?', `“${t?.title}” and its ${(t?.subtasks || []).length} subtasks will vanish.`, () => {
    db.tasks = db.tasks.filter(t => t.id !== id);
    save(); renderAll(); toast('Task destroyed');
  });
}
function deletePanel(id) {
  if (db.panels.length <= 1) return toast('Keep at least one salon');
  miniConfirm('Dissolve salon?', 'Its tasks glide into the first remaining salon.', () => {
    db.panels = db.panels.filter(p => p.id !== id);
    const first = db.panels[0].id;
    db.tasks.forEach(t => { if (t.panelId === id) t.panelId = first; });
    save(); renderAll(); toast('Salon dissolved');
  });
}

/* ─────────── RENDER: KPIs ─────────── */
function renderKPIs() {
  const done = db.tasks.filter(t => t.status === 'done' && t.completedAt);
  const tStr = todayStr();
  const today = done.filter(t => todayStr(new Date(t.completedAt)) === tStr).length;
  const wk = startOfWeek(); wk.setHours(0, 0, 0, 0);
  const week = done.filter(t => new Date(t.completedAt) >= wk).length;
  const now = new Date();
  const month = done.filter(t => { const d = new Date(t.completedAt); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).length;
  $('#kpiToday').textContent = today;
  $('#kpiWeek').textContent = week;
  $('#kpiMonth').textContent = month;
  const monthName = now.toLocaleString('en', { month: 'long' });
  $('#kpiTodaySub').textContent = today ? `${today} triumph${today > 1 ? 's' : ''} sealed today` : 'no coronations yet';
  $('#kpiWeekSub').textContent = `Mon → Sun · ${week} done`;
  $('#kpiMonthSub').textContent = `${monthName} · ${month} enthroned`;
  // custom
  const f = $('#customFrom').value, to = $('#customTo').value;
  let custom = done;
  if (f) custom = custom.filter(t => todayStr(new Date(t.completedAt)) >= f);
  if (to) custom = custom.filter(t => todayStr(new Date(t.completedAt)) <= to);
  $('#kpiCustom').textContent = (f || to) ? custom.length : done.length;
  // gauge
  const total = db.tasks.length;
  const rate = total ? Math.round(done.length / total * 100) : 0;
  const arc = $('#gaugeArc'), C = 326.7;
  arc.style.strokeDashoffset = C - (C * rate / 100);
  $('#gaugeText').textContent = rate + '%';
  $('#streakLabel').textContent = `🔥 ${calcStreak()} · ${total} pieces · ${done.length} done`;
  $('#purgeInfo').textContent = `Auto-purge: ${db.settings.autoPurge ? db.settings.retentionMonths + ' mo · ' + db.settings.purgeMode : 'off'}`;
}
function calcStreak() {
  const days = new Set(db.tasks.filter(t => t.status === 'done' && t.completedAt).map(t => todayStr(new Date(t.completedAt))));
  let s = 0; const d = new Date();
  if (!days.has(todayStr(d))) d.setDate(d.getDate() - 1);
  while (days.has(todayStr(d))) { s++; d.setDate(d.getDate() - 1); }
  return s + '-day streak';
}

/* ─────────── THEME (Onyx Night / Ivory Day) ─────────── */
function isLight() { return (db?.settings?.theme || 'dark') === 'light'; }
function ink() { return isLight() ? '#6f6250' : '#a89d86'; }
function applyTheme(skipCharts = false) {
  const theme = db.settings.theme === 'light' ? 'light' : 'dark';
  db.settings.theme = theme;
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.accent = db.settings.accent || 'gold';
  const btn = $('#themeToggle');
  if (btn) btn.innerHTML = theme === 'light'
    ? '<i class="fa-solid fa-moon"></i><span>Dark</span>'
    : '<i class="fa-solid fa-sun"></i><span>Light</span>';
  const sel = $('#setTheme');
  if (sel) sel.value = theme;
  if (typeof Chart !== 'undefined') Chart.defaults.font.family = "'Changa','Inter',sans-serif";
  if (!skipCharts && $('#view-analytics')?.classList.contains('active')) renderAnalytics();
}
function setTheme(theme, silent = false) {
  db.settings.theme = theme === 'light' ? 'light' : 'dark';
  save(); applyTheme();
  if (!silent) toast(db.settings.theme === 'light' ? 'Ivory Day unveiled ☀️' : 'Onyx Night descends 🌙', true);
}

/* ─────────── ANALYTICS CHARTS ─────────── */
function killCharts() { Object.values(charts).forEach(c => { try { c.destroy(); } catch {} }); charts = {}; }
function goldGrid() { return { color: isLight() ? 'rgba(154,123,30,.18)' : 'rgba(212,175,55,.12)' }; }
function baseOpts(extra = {}) {
  return Object.assign({ responsive: true, plugins: { legend: { labels: { color: ink(), font: { size: 11 } } } }, scales: { x: { ticks: { color: ink(), font: { size: 10 } }, grid: goldGrid() }, y: { ticks: { color: ink(), font: { size: 10 }, precision: 0 }, grid: goldGrid(), beginAtZero: true } } }, extra);
}
function renderAnalytics() {
  killCharts();
  if (typeof Chart === 'undefined') return;
  Chart.defaults.font.family = "'Changa','Inter',sans-serif";
  const done = db.tasks.filter(t => t.status === 'done' && t.completedAt);
  // — daily last 14d —
  const days = [...Array(14)].map((_, i) => { const d = new Date(); d.setDate(d.getDate() - (13 - i)); return d; });
  const labels = days.map(d => d.toLocaleDateString('en', { month: 'short', day: 'numeric' }));
  const counts = days.map(d => done.filter(t => todayStr(new Date(t.completedAt)) === todayStr(d)).length);
  charts.daily = new Chart($('#chDaily'), { type: 'bar',
    data: { labels, datasets: [{ label: 'Completed', data: counts, backgroundColor: counts.map((_, i) => i === 13 ? '#f3d97b' : 'rgba(212,175,55,.65)'), borderRadius: 8, borderSkipped: false }] },
    options: baseOpts({ plugins: { legend: { display: false } } }) });
  // — status doughnut —
  const sc = STATUS_ORDER.map(s => db.tasks.filter(t => t.status === s).length);
  charts.status = new Chart($('#chStatus'), { type: 'doughnut',
    data: { labels: ['new', 'started', 'partially completed', 'done'], datasets: [{ data: sc, backgroundColor: ['#7fb4ff', '#ffcf7d', '#d3a6ff', '#6ee7a8'], borderColor: isLight() ? '#fffdf6' : '#14100c', borderWidth: 4, hoverOffset: 10 }] },
    options: { responsive: true, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { color: ink(), padding: 14 } } } } });
  $('#statusLegend').innerHTML = STATUS_ORDER.map((s, i) => `<span>◆ ${s}: <b style="color:var(--gold2)">${sc[i]}</b></span>`).join('');
  // — cumulative —
  let acc = 0; const cum = days.map(d => acc += done.filter(t => todayStr(new Date(t.completedAt)) === todayStr(d)).length);
  const ctx = $('#chCumulative').getContext('2d');
  const grad = ctx.createLinearGradient(0, 0, 0, 220);
  grad.addColorStop(0, 'rgba(212,175,55,.45)'); grad.addColorStop(1, 'rgba(212,175,55,0)');
  charts.cum = new Chart($('#chCumulative'), { type: 'line',
    data: { labels, datasets: [{ label: 'Cumulative (14d window)', data: cum, borderColor: '#f3d97b', backgroundColor: grad, fill: true, tension: .45, pointBackgroundColor: '#f3d97b', pointRadius: 3 }] },
    options: baseOpts({ plugins: { legend: { display: false } } }) });
  // — category polar —
  charts.cat = new Chart($('#chCategory'), { type: 'polarArea',
    data: { labels: db.categories.map(c => c.name), datasets: [{ data: db.categories.map(c => db.tasks.filter(t => t.categoryId === c.id && t.status === 'done').length), backgroundColor: db.categories.map(c => c.color + 'AA'), borderColor: db.categories.map(c => c.color), borderWidth: 1 }] },
    options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { color: ink() } } }, scales: { r: { ticks: { display: false }, grid: { color: isLight() ? 'rgba(154,123,30,.25)' : 'rgba(212,175,55,.15)' }, angleLines: { color: isLight() ? 'rgba(154,123,30,.25)' : 'rgba(212,175,55,.15)' } } } } });
  // — priority radar + panels bar —
  charts.pri = new Chart($('#chPriority'), { type: 'radar',
    data: { labels: ['low', 'medium', 'high', 'royal 👑'], datasets: [{ label: 'Created', data: ['low', 'medium', 'high', 'royal'].map(p => db.tasks.filter(t => t.priority === p).length), backgroundColor: 'rgba(212,175,55,.18)', borderColor: '#d4af37', pointBackgroundColor: '#f3d97b' }, { label: 'Done', data: ['low', 'medium', 'high', 'royal'].map(p => db.tasks.filter(t => t.priority === p && t.status === 'done').length), backgroundColor: 'rgba(110,231,168,.15)', borderColor: '#6ee7a8', pointBackgroundColor: '#6ee7a8' }] },
    options: { responsive: true, plugins: { legend: { labels: { color: ink() } } }, scales: { r: { ticks: { display: false }, grid: { color: isLight() ? 'rgba(154,123,30,.25)' : 'rgba(212,175,55,.15)' }, angleLines: { color: isLight() ? 'rgba(154,123,30,.25)' : 'rgba(212,175,55,.15)' }, pointLabels: { color: ink() } } } } });
  charts.panels = new Chart($('#chPanels'), { type: 'bar',
    data: { labels: db.panels.map(p => p.title.slice(0, 18)), datasets: [{ data: db.panels.map(p => db.tasks.filter(t => (t.panelId || statusToPanel(t.status)) === p.id).length), backgroundColor: db.panels.map(p => p.color), borderRadius: 7 }] },
    options: Object.assign(baseOpts({ indexAxis: 'y', plugins: { legend: { display: false } } })) });
  renderCustomLens();
}
function renderCustomLens() {
  if (typeof Chart === 'undefined' || !$('#chCustom')) return;
  if (charts.custom) { try { charts.custom.destroy(); } catch {} }
  let { from, to } = lensRange;
  if (!from || !to) { const t = new Date(), s = new Date(); s.setDate(s.getDate() - 29); from = todayStr(s); to = todayStr(t); }
  const done = db.tasks.filter(t => t.status === 'done' && t.completedAt)
    .filter(t => { const d = todayStr(new Date(t.completedAt)); return d >= from && d <= to; });
  const map = {}; done.forEach(t => { const d = todayStr(new Date(t.completedAt)); map[d] = (map[d] || 0) + 1; });
  const keys = Object.keys(map).sort();
  charts.custom = new Chart($('#chCustom'), { type: 'line',
    data: { labels: keys.length ? keys : [from, to], datasets: [{ label: `Done ${from} → ${to}`, data: keys.length ? keys.map(k => map[k]) : [0, 0], borderColor: '#e8a0bf', backgroundColor: 'rgba(232,160,191,.15)', fill: true, tension: .45, pointBackgroundColor: '#e8a0bf' }] },
    options: baseOpts({ plugins: { legend: { labels: { color: ink() } } } }) });
  const byCat = {};
  done.forEach(t => { const n = catById(t.categoryId).name; byCat[n] = (byCat[n] || 0) + 1; });
  const top = Object.entries(byCat).sort((a, b) => b[1] - a[1])[0];
  $('#lensSummary').innerHTML = `<div><b>${done.length}</b> completed in lens</div><div><b>${keys.length}</b> active days</div><div><b>${top ? esc(top[0]) : '—'}</b> top salon</div><div><b>${done.length && keys.length ? (done.length / keys.length).toFixed(1) : 0}/day</b> tempo</div>`;
  $('#kpiCustom').textContent = done.length;
}

/* ─────────── TASK MODAL ─────────── */
function openTaskModal(id = null, presetPanel = null) {
  editingId = id;
  draftSubs = id ? JSON.parse(JSON.stringify(db.tasks.find(t => t.id === id)?.subtasks || [])) : [];
  $('#taskModalTitle').textContent = id ? 'Refine Masterpiece' : 'New Masterpiece';
  $('#fCategory').innerHTML = db.categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('');
  $('#fPanel').innerHTML = db.panels.map(p => `<option value="${p.id}">${esc(p.title)}</option>`).join('');
  if (id) {
    const t = db.tasks.find(t => t.id === id);
    $('#fTitle').value = t.title; $('#fDesc').value = t.desc || '';
    $('#fCategory').value = t.categoryId; $('#fPanel').value = t.panelId || statusToPanel(t.status);
    $('#fStatus').value = t.status; $('#fPriority').value = t.priority; $('#fDue').value = t.dueDate || '';
  } else {
    $('#fTitle').value = ''; $('#fDesc').value = '';
    $('#fCategory').value = db.categories[0].id;
    $('#fPanel').value = presetPanel || statusToPanel('new');
    $('#fStatus').value = presetPanel ? (panelById(presetPanel).statusRef || 'new') : 'new';
    $('#fPriority').value = 'medium'; $('#fDue').value = '';
  }
  renderSubEditor();
  $('#taskModal').classList.remove('hidden');
  setTimeout(() => $('#fTitle').focus(), 60);
}
function renderSubEditor() {
  const box = $('#subEditor'); box.innerHTML = '';
  draftSubs.forEach(s => {
    const r = document.createElement('div'); r.className = 'sub-row';
    r.innerHTML = `<input type="checkbox" ${s.done ? 'checked' : ''} /><span class="${s.done ? 'done' : ''}">${esc(s.title)}</span>${(s.comments || []).length ? `<em class="c-badge" title="Heir notes">💬 ${s.comments.length}</em>` : ''}<button>✕</button>`;
    r.querySelector('input').onchange = e => { s.done = e.target.checked; renderSubEditor(); };
    r.querySelector('button').onclick = () => { draftSubs = draftSubs.filter(x => x.id !== s.id); renderSubEditor(); };
    box.appendChild(r);
  });
  if (!draftSubs.length) box.innerHTML = '<p class="muted" style="margin:0">No subtasks yet — heirs to this task appear here.</p>';
}
function saveTaskModal() {
  const title = $('#fTitle').value.trim();
  if (!title) return toast('A title is required, your highness');
  const panel = panelById($('#fPanel').value);
  let status = $('#fStatus').value;
  if (panel.statusRef && !editingId) status = panel.statusRef;
  const data = {
    title, desc: $('#fDesc').value.trim(), categoryId: $('#fCategory').value,
    panelId: panel.id, status, priority: $('#fPriority').value, dueDate: $('#fDue').value || null,
    subtasks: draftSubs,
  };
  if (editingId) {
    const t = db.tasks.find(t => t.id === editingId);
    const wasDone = t.status === 'done';
    Object.assign(t, data);
    if (t.status === 'done' && !wasDone) { t.completedAt = Date.now(); celebrate(); }
    if (t.status !== 'done') t.completedAt = null;
    // auto-suggest partial
    const s = subStats(t);
    if (s.total && s.done === s.total && t.status !== 'done') { toast('All subtasks gilded — consider crowning DONE 👑'); }
    toast('Masterpiece refined ◆', true);
  } else {
    db.tasks.push(Object.assign({ id: uid(), createdAt: Date.now(), completedAt: status === 'done' ? Date.now() : null }, data));
    if (status === 'done') celebrate();
    toast('Sealed into the maison ◆', true);
  }
  $('#taskModal').classList.add('hidden');
  save(); renderAll();
}

/* ─────────── DRAWER (detail) ─────────── */
function openDrawer(id, focusSubId = null) {
  const t = db.tasks.find(t => t.id === id);
  if (!t) return;
  const c = catById(t.categoryId), p = panelById(t.panelId || statusToPanel(t.status));
  const s = subStats(t);
  $('#drawerContent').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:start">
      <span class="st ${STATUS[t.status].cls}">${STATUS[t.status].icon} ${STATUS[t.status].label}</span>
      <button class="x" onclick="document.querySelector('#taskDrawer').classList.add('hidden')">✕</button>
    </div>
    <h2>${esc(t.title)}</h2>
    <p class="d-sub">Salon: <b style="color:${p.color}">${esc(p.title)}</b> · <span class="cat-pill" style="background:${c.color}22;color:${c.color};border:1px solid ${c.color}55">${esc(c.name)}</span> · <span class="pri pri-${t.priority}">${t.priority}</span></p>
    ${t.desc ? `<div class="d-sec"><h4>Notes</h4><p class="muted">${esc(t.desc)}</p></div>` : ''}
    <div class="d-sec"><h4>Chronicle</h4><p class="muted">Created ${new Date(t.createdAt).toLocaleString()} ${t.dueDate ? '· Due <b>' + t.dueDate + '</b>' : '· No deadline'} ${t.completedAt ? '· Crowned ' + new Date(t.completedAt).toLocaleString() : ''}</p></div>
    <div class="d-sec"><h4>Heirs — subtasks ${s.done}/${s.total} · ${s.pct}%</h4>
      <div class="sub-progress" style="margin-bottom:10px"><div class="bar"><i style="width:${s.pct}%"></i></div></div>
      <div id="drawerSubs"></div>
      <div class="sub-add"><input id="drawerSubInput" type="text" placeholder="Add heir + Enter…" maxlength="120" /><button class="btn-ghost small" id="drawerSubAdd">Add</button></div>
    </div>
    <div class="d-sec"><h4>Transmute status</h4>
      <div class="btn-row">${STATUS_ORDER.map(st => `<button class="btn-ghost small" data-st="${st}" style="${t.status === st ? 'border-color:var(--gold);color:var(--gold2)' : ''}">${STATUS[st].icon} ${STATUS[st].label}</button>`).join('')}</div>
    </div>
    <div class="d-actions">
      <button class="btn-gold small" id="drawerEdit">✎ Refine</button>
      <button class="btn-ghost small danger" id="drawerDel">Destroy</button>
    </div>`;
  const paintSubs = () => {
    const box = $('#drawerSubs');
    if (!(t.subtasks || []).length) { box.innerHTML = '<p class="muted">No heirs yet.</p>'; return; }
    box.innerHTML = '';
    t.subtasks.forEach(sub => {
      if (!Array.isArray(sub.comments)) sub.comments = [];
      const wrap = document.createElement('div');
      wrap.className = 'kid-full' + (sub.id === focusSubId ? ' flash' : '');
      wrap.id = 'kid-' + sub.id;
      wrap.innerHTML = `
        <div class="kid-head">
          <input type="checkbox" data-c ${sub.done ? 'checked' : ''} title="Toggle heir" />
          <span class="kid-title ${sub.done ? 'done' : ''}">${esc(sub.title)}</span>
          <button data-rename title="Rename heir">✎</button>
          <button data-del title="Remove heir">✕</button>
        </div>
        <div class="comments" data-comments></div>
        <div class="composer">
          <textarea data-box rows="2" maxlength="4000" placeholder="Note in Markdown — **bold**, *italic*, \`code\`, - lists, [link](url)…"></textarea>
          <div class="composer-row">
            <span class="md-hint">Markdown rendered · <button data-prev>preview</button></span>
            <button class="btn-ghost small" data-add>Add note</button>
          </div>
          <div class="md-preview md-body" data-prevbox style="display:none"></div>
        </div>`;
      const list = wrap.querySelector('[data-comments]');
      const paintComments = () => {
        list.innerHTML = sub.comments.length ? '' : '<p class="muted" style="margin:2px 0 8px">No notes yet — chronicle this heir below.</p>';
        sub.comments.slice().sort((a, b) => a.createdAt - b.createdAt).forEach(cm => {
          const c = document.createElement('div');
          c.className = 'comment';
          c.innerHTML = `<div class="md-body" data-body></div>
            <div class="c-meta"><span>${new Date(cm.createdAt).toLocaleString()}${cm.updatedAt > cm.createdAt ? ' · edited' : ''}</span>
            <span class="c-actions"><button data-edit>Edit</button><button data-cdel>Delete</button></span></div>`;
          c.querySelector('[data-body]').innerHTML = mdRender(cm.text);
          c.querySelector('[data-edit]').onclick = () => {
            c.innerHTML = `<textarea data-ebox rows="3" maxlength="4000"></textarea>
              <div class="composer-row"><span class="md-hint">Markdown</span>
              <span><button class="btn-ghost small" data-cancel>Cancel</button>
              <button class="btn-gold small" data-esave>Save</button></span></div>`;
            const ebox = c.querySelector('[data-ebox]');
            ebox.value = cm.text; ebox.focus();
            ebox.onkeydown = e => e.stopPropagation();
            c.querySelector('[data-cancel]').onclick = paintComments;
            c.querySelector('[data-esave]').onclick = () => {
              const v = ebox.value.trim();
              if (!v) return toast('Note cannot be empty');
              cm.text = v; cm.updatedAt = Date.now(); save(); paintComments(); renderBoard();
            };
          };
          c.querySelector('[data-cdel]').onclick = () => {
            sub.comments = sub.comments.filter(x => x.id !== cm.id);
            save(); paintComments(); renderBoard();
          };
          list.appendChild(c);
        });
      };
      paintComments();
      const cb = wrap.querySelector('[data-c]');
      cb.onchange = () => {
        sub.done = cb.checked; save(); paintSubs(); renderAll();
        const st = subStats(t);
        if (st.total && st.done === st.total && t.status !== 'done') toast('All heirs complete — crown it DONE 👑', true);
      };
      wrap.querySelector('[data-del]').onclick = () => {
        t.subtasks = t.subtasks.filter(x => x.id !== sub.id);
        save(); paintSubs(); renderAll();
      };
      wrap.querySelector('[data-rename]').onclick = () => {
        const titleEl = wrap.querySelector('.kid-title');
        titleEl.innerHTML = `<input type="text" data-rbox value="${esc(sub.title)}" maxlength="120" />`;
        const rbox = titleEl.querySelector('[data-rbox]');
        rbox.focus(); rbox.select();
        let settled = false;
        const commit = ok => { if (settled) return; settled = true; const v = rbox.value.trim(); if (ok && v) sub.title = v; save(); paintSubs(); renderAll(); };
        rbox.onclick = e => e.stopPropagation();
        rbox.onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') commit(true); if (e.key === 'Escape') commit(false); };
        rbox.onblur = () => commit(true);
      };
      const ta = wrap.querySelector('[data-box]');
      const prevBox = wrap.querySelector('[data-prevbox]');
      ta.onkeydown = e => e.stopPropagation();
      wrap.querySelector('[data-add]').onclick = () => {
        const v = ta.value.trim();
        if (!v) return toast('Write the note first');
        sub.comments.push({ id: uid(), text: v, createdAt: Date.now(), updatedAt: Date.now() });
        save(); paintComments(); renderBoard(); toast('Note chronicled ◆', true);
      };
      wrap.querySelector('[data-prev]').onclick = e => {
        e.preventDefault();
        if (prevBox.style.display !== 'none') { prevBox.style.display = 'none'; return; }
        prevBox.innerHTML = mdRender(ta.value);
        prevBox.style.display = '';
      };
      box.appendChild(wrap);
    });
    if (focusSubId) {
      const target = document.getElementById('kid-' + focusSubId);
      if (target) {
        setTimeout(() => target.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60);
        setTimeout(() => target.classList.remove('flash'), 1800);
      }
    }
  };
  paintSubs();
  const addSub = () => {
    const v = $('#drawerSubInput').value.trim(); if (!v) return;
    t.subtasks = t.subtasks || []; t.subtasks.push({ id: uid(), title: v, done: false, comments: [] });
    save(); paintSubs(); renderAll(); openDrawer(t.id);
  };
  $('#drawerSubAdd').onclick = addSub;
  $('#drawerSubInput').onkeydown = e => { if (e.key === 'Enter') addSub(); };
  $$('#drawerContent [data-st]').forEach(b => b.onclick = () => {
    const prev = t.status; t.status = b.dataset.st;
    t.panelId = statusToPanel(t.status);
    if (t.status === 'done' && prev !== 'done') { t.completedAt = Date.now(); celebrate(); }
    if (t.status !== 'done') t.completedAt = null;
    save(); renderAll(); openDrawer(t.id);
  });
  $('#drawerEdit').onclick = () => { $('#taskDrawer').classList.add('hidden'); openTaskModal(t.id); };
  $('#drawerDel').onclick = () => { $('#taskDrawer').classList.add('hidden'); delTask(t.id); };
  $('#taskDrawer').classList.remove('hidden');
}

/* ─────────── MINI MODAL ─────────── */
let miniCb = null;
function miniPrompt(title, html, okLabel, cb) {
  $('#miniTitle').textContent = title; $('#miniBody').innerHTML = html;
  $('#miniOk').textContent = okLabel || 'Confirm'; miniCb = cb;
  $('#miniModal').classList.remove('hidden');
}
function miniConfirm(title, sub, cb) { miniPrompt(title, `<p class="muted">${esc(sub)}</p>`, 'Confirm', cb); }
function openCategoryModal(existing = null) {
  miniPrompt(existing ? 'Rename category' : 'New category', `
    <label class="field"><span>Name</span><input id="mCatName" type="text" value="${esc(existing?.name || '')}" placeholder="e.g. Couture" maxlength="40" /></label>
    <div class="grid2"><label class="field"><span>Color</span><input type="color" id="mCatColor" value="${existing?.color || '#d4af37'}" style="height:42px" /></label>
    <label class="field"><span>Icon (fa-*)</span><input id="mCatIcon" type="text" value="${esc(existing?.icon || 'fa-gem')}" placeholder="fa-gem" maxlength="30" /></label></div>`,
    existing ? 'Rename' : 'Create', () => {
      const name = $('#mCatName').value.trim() || 'Untitled';
      const color = $('#mCatColor').value, icon = $('#mCatIcon').value.trim() || 'fa-gem';
      if (existing) Object.assign(existing, { name, color, icon });
      else db.categories.push({ id: uid(), name, color, icon });
      save(); renderAll(); toast('Category sealed ◆', true);
    });
}
function openPanelModal(existing = null) {
  miniPrompt(existing ? 'Rename salon' : 'New salon (panel)', `
    <label class="field"><span>Title</span><input id="mPanTitle" type="text" value="${esc(existing?.title || '')}" placeholder="e.g. Midnight Ideas" maxlength="50" /></label>
    <div class="grid2"><label class="field"><span>Accent</span><input type="color" id="mPanColor" value="${existing?.color || '#d4af37'}" style="height:42px" /></label>
    <label class="field"><span>Bound status (optional)</span><select id="mPanStatus"><option value="">— free salon —</option>${STATUS_ORDER.map(s => `<option value="${s}" ${existing?.statusRef === s ? 'selected' : ''}>${STATUS[s].icon} ${STATUS[s].label}</option>`).join('')}</select></label></div>
    <p class="muted">Bound salons transmute dropped tasks to that status. Free salons are pure collections.</p>`,
    existing ? 'Rename' : 'Create salon', () => {
      const title = $('#mPanTitle').value.trim() || 'Untitled Salon';
      const color = $('#mPanColor').value, statusRef = $('#mPanStatus').value || null;
      if (existing) Object.assign(existing, { title, color, statusRef });
      else db.panels.push({ id: uid(), title, color, statusRef });
      save(); renderAll(); toast('Salon unveiled ◆', true);
    });
}

/* ─────────── SETTINGS ─────────── */
function renderSettings() {
  $('#setRetention').value = db.settings.retentionMonths;
  $('#setPurgeMode').value = db.settings.purgeMode;
  $('#setAutoPurge').checked = !!db.settings.autoPurge;
  $('#setName').value = db.settings.name || '';
  $('#setAccent').value = db.settings.accent || 'gold';
  applyTheme(true);
  const doomed = purgeCandidates();
  $('#purgePreview').textContent = doomed.length
    ? `⚠ ${doomed.length} task(s) are older than ${db.settings.retentionMonths} mo and would be destroyed.`
    : `✦ Nothing exceeds the ${db.settings.retentionMonths}-month threshold. The vault approves.`;
}

/* ─────────── SEED ─────────── */
function seedDemo() {
  const now = Date.now(), D = 864e5;
  const mk = (title, desc, cat, status, pri, ago, dueIn, subs) => ({
    id: uid(), title, desc, categoryId: db.categories.find(c => c.name === cat)?.id || db.categories[0].id,
    status, priority: pri, createdAt: now - ago * D, completedAt: status === 'done' ? now - Math.max(0, ago - 1) * D : null,
    dueDate: dueIn != null ? todayStr(new Date(now + dueIn * D)) : null,
    panelId: statusToPanel(status),
    subtasks: (subs || []).map((s, i) => ({ id: uid() + i, title: s[0], done: !!s[1], comments: [] })),
  });
  db.tasks.push(
    mk('Commission gold-foil invitations', 'Silk 120gsm, deckled edge, maison seal in wax.', 'Luxury', 'new', 'royal', 1, 6, [['Choose paper stock', true], ['Approve calligraphy', false], ['Order wax seals', false]]),
    mk('Close Q3 ledger with accountant', 'Bring receipts, reconcile travel couture.', 'Finance', 'started', 'high', 3, 2, [['Gather receipts', true], ['Reconcile statements', false]]),
    mk('Morning ritual: swim + journal', '6:30 swim, 10-min journal, no phone.', 'Health', 'partial', 'medium', 5, 1, [['Swim 20 laps', true], ['Journal', true], ['Meditate 10 min', false]]),
    mk('Read “The Luxury Strategy”', 'Ch. 4–6, annotate anti-laws of marketing.', 'Learning', 'partial', 'medium', 9, 10, [['Ch. 4', true], ['Ch. 5', false], ['Ch. 6', false]]),
    mk('Ship portfolio keynote', '10 slides, black & gold, one idea per slide.', 'Work', 'done', 'high', 2, -1, [['Draft', true], ['Design', true], ['Rehearse', true]]),
    mk('Curate weekend gallery route', 'Le Marais: 3 galleries + champagne pause.', 'Personal', 'done', 'low', 0, 3, [['Shortlist galleries', true]]),
    mk('Vintage watch servicing', 'Rolex 1978 — oil, polish, pressure test.', 'Luxury', 'done', 'royal', 8, -8, [['Drop at horologist', true], ['Collect', true]]),
    mk('Negotiate atelier rent', 'Ask 8% reduction, offer 24-mo term.', 'Work', 'new', 'high', 0, 12, []),
  );
  save(); renderAll(); toast('Demo atelier seeded ✨', true);
}

/* ─────────── RENDER ALL / INIT ─────────── */
function renderAll() { renderCategories(); renderBoard(); renderKPIs(); renderSettings(); if ($('#view-analytics').classList.contains('active')) renderAnalytics(); }
function switchView(v) {
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  $$('.view').forEach(s => s.classList.toggle('active', s.id === 'view-' + v));
  $('#viewTitle').textContent = v === 'board' ? 'Grand Board' : v === 'analytics' ? 'Analytics Salon' : 'Maison Settings';
  $('#viewSubtitle').textContent = v === 'board' ? 'Drag masterpieces between salons · everything autosaves' : v === 'analytics' ? 'Every triumph, gilded into charts' : 'Decree how the maison forgets & shines';
  if (v === 'analytics') renderAnalytics();
}
function init() {
  load();
  db.meta.launches = (db.meta.launches || 0) + 1; save();
  // daily purge guard
  const purged = runPurge(true);
  if (!['dark', 'light'].includes(db.settings.theme)) db.settings.theme = 'dark';
  applyTheme(true);
  // nav
  $$('.nav-btn').forEach(b => b.onclick = () => switchView(b.dataset.view));
  $('#newTaskBtn').onclick = () => openTaskModal();
  $('#addCategoryBtn').onclick = () => openCategoryModal();
  $('#addPanelBtn').onclick = () => openPanelModal();
  $('#saveTaskBtn').onclick = saveTaskModal;
  $('#subAddBtn').onclick = () => { const v = $('#subInput').value.trim(); if (!v) return; draftSubs.push({ id: uid(), title: v, done: false, comments: [] }); $('#subInput').value = ''; renderSubEditor(); };
  $('#subInput').onkeydown = e => { if (e.key === 'Enter') $('#subAddBtn').click(); };
  $('#fPanel').onchange = () => { const p = panelById($('#fPanel').value); if (p.statusRef) $('#fStatus').value = p.statusRef; };
  ['searchInput', 'filterCategory', 'filterPriority', 'showDoneToggle'].forEach(id => $('#' + id).addEventListener('input', () => { renderBoard(); renderKPIs(); }));
  ['customFrom', 'customTo'].forEach(id => $('#' + id).addEventListener('change', renderKPIs));
  $('#purgeNowBtn').onclick = () => { const n = purgeCandidates().length; miniConfirm('Purge old tasks?', `${n} task(s) older than ${db.settings.retentionMonths} mo will be destroyed.`, () => { db.settings.autoPurge = true; runPurge(false); }); };
  $('#purgeNowBtn2').onclick = () => $('#purgeNowBtn').click();
  $('#previewPurgeBtn').onclick = () => { const d = purgeCandidates(); $('#purgePreview').innerHTML = d.length ? `⚠ Doomed (${d.length}):<br/>` + d.slice(0, 8).map(t => `· ${esc(t.title)}`).join('<br/>') + (d.length > 8 ? `<br/>…and ${d.length - 8} more` : '') : '✦ Nothing doomed. Pristine.'; };
  $('#miniOk').onclick = () => { $('#miniModal').classList.add('hidden'); if (miniCb) { const f = miniCb; miniCb = null; f(); } };
  $$('[data-close]').forEach(b => b.onclick = () => { b.closest('.overlay').classList.add('hidden'); });
  $$('.overlay').forEach(o => o.addEventListener('click', e => { if (e.target === o) o.classList.add('hidden'); }));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { $$('.overlay').forEach(o => o.classList.add('hidden')); $('#taskDrawer').classList.add('hidden'); } if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); $('#searchInput').focus(); } });
  // drawer dismiss: any click outside the drawer closes it (capture phase,
  // so it runs before a card's own onclick can open the next task)
  document.addEventListener('click', e => {
    const drawer = $('#taskDrawer');
    if (!drawer || drawer.classList.contains('hidden')) return;
    if (drawer.contains(e.target)) return;
    drawer.classList.add('hidden');
  }, true);
  // settings bindings
  $('#setRetention').onchange = e => { db.settings.retentionMonths = Math.min(60, Math.max(1, Number(e.target.value) || 4)); save(); renderAll(); };
  $('#setPurgeMode').onchange = e => { db.settings.purgeMode = e.target.value; save(); renderAll(); };
  $('#setAutoPurge').onchange = e => { db.settings.autoPurge = e.target.checked; save(); renderAll(); toast(db.settings.autoPurge ? 'Oblivion watches ◆' : 'Oblivion sleeps'); };
  $('#setName').oninput = e => { db.settings.name = e.target.value; save(); };
  $('#setAccent').onchange = e => { db.settings.accent = e.target.value; save(); applyTheme(true); };
  $('#setTheme').onchange = e => setTheme(e.target.value);
  $('#themeToggle').onclick = () => setTheme(isLight() ? 'dark' : 'light');
  $('#exportBtn').onclick = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `maison-noir-backup-${todayStr()}.json`; a.click();
    toast('Vault exported ◆', true);
  };
  $('#importFile').onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { const j = JSON.parse(r.result); if (!j.tasks) throw 0; db = Object.assign(defaultDB(), j); save(); renderAll(); toast('Vault restored ◆', true); } catch { toast('Invalid vault file'); } };
    r.readAsText(f);
  };
  $('#wipeBtn').onclick = () => miniConfirm('Burn everything?', 'All tasks, categories, panels and settings vanish. This cannot be undone.', () => { db = defaultDB(); save(); renderAll(); toast('Ashes to ashes'); });
  $('#seedBtn').onclick = seedDemo;
  // lens
  const t = new Date(), s = new Date(); s.setDate(s.getDate() - 29);
  $('#lensFrom').value = todayStr(s); $('#lensTo').value = todayStr(t);
  lensRange = { from: $('#lensFrom').value, to: $('#lensTo').value };
  $('#lensApply').onclick = () => { lensRange = { from: $('#lensFrom').value, to: $('#lensTo').value }; renderCustomLens(); };
  $$('.preset').forEach(b => b.onclick = () => { const n = Number(b.dataset.range); const e2 = new Date(), s2 = new Date(); s2.setDate(s2.getDate() - (n - 1)); $('#lensFrom').value = todayStr(s2); $('#lensTo').value = todayStr(e2); lensRange = { from: $('#lensFrom').value, to: $('#lensTo').value }; renderCustomLens(); });
  renderAll();
  if (!db.tasks.length) setTimeout(() => toast('Welcome to the maison ◆ — press “New Task” or seed a demo'), 600);
  else if (purged) toast(`Oblivion claimed ${purged} ancient task(s) on arrival`);
}
document.addEventListener('DOMContentLoaded', init);
