# ◆ MAISON NOIR — Luxury Todo Atelier

> A browser-based **luxury todo list** with categories, subtasks, draggable salons (panels),
> royal analytics, a 100% `localStorage` vault, and an **Oblivion auto-purge** (default: tasks older
> than **4 months**, adjustable). Set in the **Changa** typeface with **Onyx Night + Ivory Day** auras.
> Served on the deliberately **strange port `:47329`** to dodge the common dev-port crowds.

![stack](https://img.shields.io/badge/stack-vanilla%20JS%20%2B%20Chart.js-gold)
![storage](https://img.shields.io/badge/storage-localStorage%20only-black)
![port](https://img.shields.io/badge/port-%3A47329%20strange-blueviolet)
![license](https://img.shields.io/badge/license-MIT-green)

---

## ✨ Feature Atlas

| Demand | How MAISON NOIR delivers |
|---|---|
| **Opens in browser, strange port** | `python3 server.py` → `http://127.0.0.1:47329/` (or `./start.sh`). 47329 avoids 3000/3001/4000/5000/5173/8000/8080/4200/8888/9000. Override with `-p 47913`. |
| **Categorize tasks** | 6 seeded categories (Personal, Work, Luxury, Health, Finance, Learning) with color + Font-Awesome icon. Create / rename (double-click) / delete. Sidebar counts, top-bar filter, per-category analytics. |
| **Subtasks of one parent** | Heirs render as a **nested child tree on each card** (unfold ▸/▾, toggle inline, 💬 badges). Each heir owns a **Markdown comment thread** (drawer → notes with preview, edit, timestamps). Progress bar (`done/total · %`). 100% heirs nudges coronation to `done`. Search digs into heir + note text. |
| **Different panels + drag & drop** | Kanban **salons**. Default 4 bound to statuses; create unlimited **free salons** or status-bound salons; rename / dissolve / color-code. HTML5 drag & drop — dropping into a status salon **transmutes the task status** (with confetti on `done`). |
| **Analytics: today / week / month / custom + amazing shapes** | KPI strip (Today · Week Mon→Sun · Month · **Custom Lens** date inputs · completion-rate SVG gauge · streak). Analytics Salon: 14-day gold **bar**, status **doughnut**, cumulative **glowing line**, category **polar**, priority **radar**, panels **bar**, custom-range **line + stat tiles**. Powered by Chart.js, gold/onyx theme. |
| **Everything in localStorage** | Single key `luxury_maisontodo_v1` → `{tasks, categories, panels, settings, meta}`. Autosaves on every mutation. Storage meter in sidebar. Export / Import JSON backup. Zero backend, zero tracking. |
| **Delete tasks > 4 months (adjustable)** | **Oblivion Vault**: `retentionMonths` (default 4, 1–60), scope (`completed only` vs `all`), auto-purge on launch + daily, **Preview doomed** + **Purge now**. Runs silently on boot. |
| **Statuses: new / started / partially completed / done** | First-class enum everywhere: board columns, badges (`✦ ▶ ◐ ✔`), modal select, drawer transmute buttons, doughnut + filters. Dragging between salons rewrites status; `completedAt` stamped on `done`. |

Extra luxuries: global search (`Ctrl+K`), priority tiers incl. **Royal 👑**, due dates + overdue flags, detail drawer chronicle, 4 accent auras (Gold / Rosé / Emerald / Sapphire), **light + dark mode** (top-bar toggle, persisted, charts re-themed), toasts, confetti coronations, responsive + keyboard (`Esc` closes).

---

## 🗺️ Repository Map

```
luxury-todo/
├── index.html            # App shell: sidebar, KPIs, board, analytics, settings, modals, drawer
├── styles.css            # Onyx Night + Ivory Day luxury theme, Changa type, glass, responsive
├── app.js                # All logic: store, board DnD, subtasks, KPIs, Chart.js analytics, purge
├── server.py             # Static server on strange :47329 + auto-open browser (argparse)
├── start.sh              # ./start.sh [port] classic foreground launcher
├── launch.sh             # Smart launcher (Linux/macOS): reuses server if up, else starts it
├── launch.bat            # Smart launcher for Windows (same behavior)
├── maison-noir.desktop   # freedesktop entry template (@@APPDIR@@ filled by installer)
├── install-linux.sh      # One-command Linux shortcut install / uninstall
├── install-windows.ps1   # Start Menu shortcut installer (run on Windows)
├── install-macos.sh      # Spotlight app builder (run on a Mac)
├── assets/icon.svg       # Gold-onyx marque (Linux icon)
├── assets/icon.png       # 512px raster marque (macOS paste-icon, fallback)
├── assets/icon.ico       # Multi-size Windows icon
├── package.json          # npm scripts (python server preferred, node `serve` fallback)
├── LICENSE               # MIT
└── README.md             # You are here
```

No build step. No bundler. Two CDN deps (fonts/Chart.js/confetti) with full offline fallback for core CRUD.

---

## 🚀 Quickstart

### Option A — Python (recommended, zero install beyond stdlib)

```bash
cd luxury-todo
python3 server.py
# → http://127.0.0.1:47329/  (browser auto-opens)
```

Custom strange port / no browser:

```bash
python3 server.py -p 47913
python3 server.py --no-browser --bind 127.0.0.1
./start.sh 47913
```

### Option B — Node fallback

```bash
npm run serve:node     # serves . on :47329 via `serve`
# or
npx --yes serve -l 47329 .
```

### Option C — No server at all

Double-click `index.html` — everything works except CDN charts need internet once.

---

## 🖥️ System shortcut — press a key, type `maison todo`

Install once, then launch the atelier straight from your OS search. The launchers are
**smart**: if `:47329` already answers they just open the browser, otherwise they start
the server first. Stopping is always the same: close the terminal running the server,
or `pkill -f "server.py"` (Linux/macOS) / close the `Maison Noir` window (Windows).

### 🐧 Linux (GNOME, KDE, Xfce, …)

```bash
cd luxury-todo
./install-linux.sh
# → Press Super, type:  maison todo   (matches Name + Keywords)
```

- Installs `~/.local/share/applications/maison-noir.desktop` with absolute paths, the gold
  icon, and search keywords — no sudo needed.
- Verify in terminal: `gtk-launch maison-noir` · Remove: `./install-linux.sh --uninstall`
- If you **move the folder**, just re-run the installer so paths refresh.
- Troubleshooting: log out/in or run `update-desktop-database ~/.local/share/applications`
  (KDE: `kbuildsycoca6 --noincremental`) if the entry doesn't appear instantly. To pin it,
  right-click the launcher → *Add to Favorites / Pin to Task Manager*. For a desktop icon
  on GNOME, copy the file to `~/Desktop` and choose *Allow Launching*.

### 🪟 Windows 10 / 11

1. Copy the whole `maison-noir-luxury-todo` folder to your PC (e.g. `Documents`).
2. Install Python 3 from `python.org` — tick **“Add python.exe to PATH”**.
3. Right-click `install-windows.ps1` → **Run with PowerShell** (one time).
4. Press **Win**, type `maison todo`, hit Enter. Pin it or add to Startup from there.
- How it works: the script drops a `Maison Todo.lnk` (with the gold `.ico`) into your
  Start Menu Programs folder, pointing at `launch.bat` — Windows Search indexes that name.
- Troubleshooting: first run may show SmartScreen → *More info → Run anyway*; if PowerShell
  blocks the script, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once and retry.
- Remove: delete `Maison Todo` from `%APPDATA%\Microsoft\Windows\Start Menu\Programs`.

### 🍎 macOS (Spotlight)

Run this **on your Mac** (needs only built-in tools + Python 3):

```bash
cd maison-noir-luxury-todo
chmod +x install-macos.sh launch.sh
./install-macos.sh
# → Press Cmd+Space, type:  maison todo
```

- Builds `~/Applications/Maison Todo.app` (AppleScript wrapper around `launch.sh`), which is
  exactly what Spotlight indexes.
- First launch: right-click the app → *Open* (once) to clear Gatekeeper, or run
  `xattr -d com.apple.quarantine ~/Applications/Maison\ Todo.app`.
- Optional gold icon: open `assets/icon.png`, `Cmd+C`, *Get Info* on the app, click its
  icon, `Cmd+V`. Remove: delete the `.app` from `~/Applications`.

---

## 🥂 User Manual

### 1. Grand Board
- **New Task** (top-right) → title*, notes, category, salon, status, priority, due date, subtasks.
- **Cards** show category pill, status badge, priority, due, subtask bar. Click = detail drawer (click anywhere outside, or `Esc`, to dismiss); icons = open / edit / delete.
- **Drag** any card between salons. Bound salons rewrite status; `done` triggers confetti + `completedAt`.
- **Status vs. salon:** changing status in the task drawer updates **only the status badge** and keeps the task in its current salon. Only dragging a whole task into a status-bound salon moves it and rewrites status together.
- Toolbar: **New Salon**, `show done` toggle, **Purge old** shortcut. Top bar: search, category & priority filters.

### 2. Categories
- Sidebar **+** creates (name / color / icon `fa-*`). Double-click renames. ✕ deletes (tasks rehomed, never lost).
- Click a category to isolate the board; combine with top-bar filters.

### 3. Subtasks — heirs with Markdown chronicles
- **Board cards** nest heirs as children: unfold the `▸ heirs · x/y` toggle, tick boxes inline
  (card never opens), 💬 badges jump straight to that heir's notes in the drawer. Grab the `⋮`
  handle on an heir and **drag it onto any other task card** to change its parent; its completion
  state, comments, and chronicle move with it. The receiving card gains a gold “Drop heir here” aura.
- **Drawer** renders each heir as its own block: toggle / inline rename / delete, plus a
  **comment thread** — write in Markdown (`**bold**`, `*italic*`, `` `code` ``, fences,
  `- lists`, `[links](…)`, `> quotes`, tables), **preview** before posting, edit / delete
  afterwards with timestamps + `edited` flags.
- Rendering = `marked` + `DOMPurify` sanitization online, built-in escaped fallback offline —
  raw HTML can never execute.
- Long notes collapse to **two lines**; the **⤢ Expand** button (appearing only on overflowing
  notes) opens a centered **heir dossier**: full title, crown status toggle, parent + chronicle
  meta, every note uncut, and its own composer — edits stay in sync with the drawer behind it.
- Progress auto-computes; completing all heirs suggests `done`.
- Overdue = red `late!` flag (due < today, not done).

### 4. Analytics Salon
- **KPIs**: Today / Week / Month / Custom Lens (two date inputs live-filter the 4th KPI) / gauge %.
- **Charts**: daily bar · status doughnut + legend · cumulative line · category polar · priority radar · panels bar · **custom lens line** with presets (7/30/90d) + summary tiles (completed · active days · top salon · tempo/day).
- Charts re-render on every data change and on entering the view.

### 5. Maison Settings → Oblivion Vault
- `Delete tasks older than (months)` — default **4**, range 1–60.
- Scope: **Only completed** (default — safest) or **All tasks**.
- `Enable automatic purge` — checked = silent purge on launch & daily guard.
- **Preview doomed** lists victims; **Purge now** executes (with confirm).
- Identity: name, accent aura, **appearance (Onyx Night / Ivory Day)**; **Export/Import JSON**; **Seed demo atelier** (8 curated tasks); **Burn everything**.

---

## 🗄️ Data Model (`localStorage › luxury_maisontodo_v1`)

```jsonc
{
  "tasks": [{
    "id": "k3x9ab12", "title": "Commission invitations",
    "desc": "Silk 120gsm…", "categoryId": "c-luxury",
    "priority": "royal",                 // low | medium | high | royal
    "status": "partial",                 // new | started | partial | done
    "panelId": "p-partial",
    "dueDate": "2026-09-20",             // YYYY-MM-DD | null
    "createdAt": 1726051200000,
    "completedAt": null,                 // stamp when → done
    "subtasks": [{ "id": "s1", "title": "Approve calligraphy", "done": false,
                   "comments": [{ "id": "m1", "text": "**Vellum** ordered — ETA **Fri**.", "createdAt": 1726051200000, "updatedAt": 1726051200000 }] }]
  }],
  "categories": [{ "id": "c-luxury", "name": "Luxury", "color": "#e8a0bf", "icon": "fa-gem" }],
  "panels": [{ "id": "p-new", "title": "✦ New Chamber", "statusRef": "new", "color": "#7fb4ff" }],
  "settings": { "retentionMonths": 4, "autoPurge": true, "purgeMode": "completed", "name": "", "accent": "gold", "theme": "dark" },
  "meta": { "created": 1726051200000, "launches": 3 }
}
```

**Purge rule** (`purgeMode: completed`): destroy `status==done` tasks with `completedAt < now − retentionMonths×30.44d`.
With `all`: use `min(createdAt, completedAt)` for every task. Cutoff uses mean Gregorian month (30.44d).

---

## 📊 Analytics Definitions

| Metric | Rule |
|---|---|
| Today | `completedAt` falls on local today |
| This Week | `completedAt ≥ Monday 00:00` (Mon→Sun) |
| This Month | same calendar month + year |
| Custom Lens | `from ≤ completedAt ≤ to` (both date inputs; KPI mirrors lens range) |
| Completion rate | `done / all × 100` → SVG gauge arc |
| Streak | consecutive days ending today/yesterday with ≥1 completion |
| Tempo | `completed in lens / active days` |

---

## 🔌 The Strange Port — rationale

| Port | Usual suspect | Verdict |
|---|---|---|
| 3000/3001 | React/Next | ✕ crowded |
| 5000 | Flask | ✕ crowded |
| 5173 | Vite | ✕ crowded |
| 8000/8080 | Django/generic | ✕ crowded |
| 4200/9000/8888 | Angular/PHP/Jupyter | ✕ crowded |
| **47329** | *nothing* — high ephemeral | **✓ chosen** |

Memorable (`47-329`), unprivileged (>1024), single-instance friendly, trivially overridable.

---

## 🧪 Verification Checklist (manual, 5 min)

1. `python3 server.py` → browser opens `:47329`, no console errors.
2. New Task with 2 subtasks → card shows `▸ heirs · 0/2` tree; unfold and tick inline. Drag its `⋮`
   handle onto another task → gold drop target appears; release → the heir, notes, and state move.
3. Open card → heir note with `**bold**`, list, `[link](…)` → preview → post → renders gilded (long notes clamp to 2 lines); ⤢ Expand → centered dossier with the uncut chronicle; edit shows `edited`.
4. Drag card New → Done → confetti + KPI Today +1 + gauge moves.
5. Toggle a subtask → bar % updates; complete all → `done` suggestion toast.
6. Analytics Salon → all 7 canvases render; set Custom Lens 30d → summary tiles change.
7. Settings → retention `1`, scope `completed`, Preview → Purge now works; Export downloads JSON; Import restores.
8. Reload → data persists (DevTools → Application → Local Storage → `luxury_maisontodo_v1`).
9. Double-click `index.html` offline → CRUD + fallback Markdown still work (CDN charts/parse need internet once).

---

## 🔒 Privacy & Limits

- **No backend, no cookies, no telemetry.** Wiping browser storage wipes the maison — keep JSON exports.
- `localStorage` ≈ 5 MB (≈ thousands of tasks; meter warns when full).
- CDN (Google Fonts, Chart.js, confetti, Font-Awesome) is the only network use; core works offline after first load.
- Multi-tab: last-write-wins (no CRDT). Purge is irreversible — preview first.

---

## 🛠️ Tech Notes

- Vanilla JS (~900 lines, no framework) + Chart.js 4 UMD + canvas-confetti + marked (Markdown) + DOMPurify (XSS sanitize). CSS variables power 4 accent auras × 2 appearance themes.
- Typography: **Changa** (Arabic + Latin, full app + charts) with Playfair Display serif fallback for display headings.
- Form system: one catch-all luxury rule styles every text-like input + bespoke `appearance:none` dropdowns with gold chevron, focus glow, themed date/color pickers — no browser-default strays in either theme.
- Drag & drop: native HTML5 (`dragstart/dragover/drop`); touch users can move via modal salon select or drawer status buttons.
- Dates stored as `YYYY-MM-DD` (due) + epoch ms (created/completed) — timezone-safe comparisons via `toISOString().slice(0,10)`.
- Charts destroyed before re-render to avoid leaks; `Chart.defaults.font.family = Inter`.

---

## 🤝 Contributing

PRs welcome: fork → branch → `python3 server.py` → verify checklist → PR with screenshots of Board + Analytics. Keep it dependency-light and local-first.

## 📜 License

MIT — see [LICENSE](./LICENSE). Gild freely.
