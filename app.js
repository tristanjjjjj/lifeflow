/* LifeFlow V1.2 · 真实前端逻辑（无 API，全部本地计算） */
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

const KEYS = {
  tasks: "lifeflow_tasks_v3",
  courses: "lifeflow_courses_v3",
  plan: "lifeflow_plan_v3"
};
const LEGACY_KEYS = ["lifeflow_tasks_v2", "lifeflow_courses_v2", "lifeflow_plan_v2", "lifeflow_demo_v1"];

const DEFAULT_TASKS = [
  { id: "t1", title: "高数第三章作业", deadline: "2026-11-20", duration: 120, priority: "高", done: false, category: "学习" },
  { id: "t2", title: "英语阅读报告", deadline: "2026-11-22", duration: 60, priority: "中", done: false, category: "学习" },
  { id: "t3", title: "社团活动报名", deadline: "2026-11-24", duration: 20, priority: "低", done: false, category: "校园" }
];

const DEFAULT_COURSES = [
  { id: "c1", day: 1, start: "09:00", end: "10:30", name: "高等数学", room: "3-205", tone: "" },
  { id: "c2", day: 1, start: "14:00", end: "15:40", name: "大学英语", room: "2-301", tone: "pink" },
  { id: "c3", day: 2, start: "10:00", end: "11:40", name: "大学物理", room: "1-108", tone: "green" },
  { id: "c4", day: 3, start: "09:00", end: "10:30", name: "英语听力", room: "2-203", tone: "pink" },
  { id: "c5", day: 4, start: "14:00", end: "15:40", name: "程序设计", room: "实验楼", tone: "green" },
  { id: "c6", day: 5, start: "10:00", end: "11:40", name: "高等数学", room: "3-205", tone: "" }
];

/* ---------- 基础工具 ---------- */
function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) { return fallback; }
}
function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}
function uid(prefix) { return prefix + Date.now() + Math.floor(Math.random() * 1000); }
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("show"), 2200);
}
const toMin = t => { const [h, m] = String(t).split(":").map(Number); return h * 60 + m; };
const toHHMM = m => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const todayISO = () => new Date().toLocaleDateString("sv-SE");
const weekdayOf = iso => { const d = new Date(iso + "T00:00:00"); return (d.getDay() + 6) % 7 + 1; };
const priorityRank = p => ({ "高": 0, "中": 1, "低": 2 }[p] ?? 1);
const fmtCN = iso => {
  if (!iso) return "待设置";
  const [y, m, d] = iso.split("-");
  return `${Number(m)}月${Number(d)}日`;
};

/* ---------- 数据层 ---------- */
function normalizeTasks(list) {
  return (Array.isArray(list) ? list : DEFAULT_TASKS).map(t => ({
    id: t.id || uid("t"),
    title: t.title || "未命名任务",
    deadline: t.deadline && t.deadline !== "待确认" ? t.deadline : "",
    duration: Number(t.duration) || 60,
    priority: ["高", "中", "低"].includes(t.priority) ? t.priority : "中",
    done: !!t.done,
    category: t.category || "学习"
  }));
}
function normalizeCourses(list) {
  return (Array.isArray(list) ? list : DEFAULT_COURSES).map(c => ({
    id: c.id || uid("c"),
    day: Number(c.day) || 1,
    start: c.start || "09:00",
    end: c.end || "10:30",
    name: c.name || "未命名课程",
    room: c.room || "",
    tone: c.tone || ""
  }));
}

let tasks = normalizeTasks(readJSON(KEYS.tasks, []));
let courses = normalizeCourses(readJSON(KEYS.courses, []));
let savedPlan = readJSON(KEYS.plan, null);
let currentFilter = "all";
let taskQuery = "";
let taskSortMode = "due";
let parsedDraft = [];
let editingTaskId = null;
let currentWeek = Number(localStorage.getItem("lifeflow_week_v2") || 12);

function persistTasks() { writeJSON(KEYS.tasks, tasks); }
function persistCourses() { writeJSON(KEYS.courses, courses); }

/* ---------- 页面切换 ---------- */
const PAGE_NAMES = { dashboard: "总览", timetable: "我的课表", tasks: "任务中心", planner: "AI 智能规划", insights: "数据统计" };
function go(page) {
  $$(".page").forEach(p => p.classList.toggle("active", p.id === `page-${page}`));
  $$(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.page === page));
  const crumb = $("#crumb");
  if (crumb) crumb.textContent = PAGE_NAMES[page] || "总览";
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (page === "dashboard") renderDashboard();
  if (page === "insights") renderInsights();
  if (page === "planner") renderPlanFromState();
}
$$(".nav-item").forEach(b => b.addEventListener("click", () => go(b.dataset.page)));
$$("[data-goto]").forEach(b => b.addEventListener("click", () => go(b.dataset.goto)));

/* ---------- 任务列表 ---------- */
function pendingTasks() { return tasks.filter(t => !t.done); }

function sortTasks(list) {
  const arr = list.slice();
  if (taskSortMode === "created") return arr;           // 数组本身是“新加的在前”
  if (taskSortMode === "priority") {
    return arr.sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority)
      || (a.deadline || "9999").localeCompare(b.deadline || "9999"));
  }
  return arr.sort((a, b) => {
    const ao = a.deadline && a.deadline < todayISO() && !a.done ? 0 : 1;
    const bo = b.deadline && b.deadline < todayISO() && !b.done ? 0 : 1;
    if (ao !== bo) return ao - bo;
    const ad = a.deadline || "9999-12-31";
    const bd = b.deadline || "9999-12-31";
    if (ad !== bd) return ad < bd ? -1 : 1;
    return priorityRank(a.priority) - priorityRank(b.priority);
  });
}

function renderTasks() {
  const list = $("#taskList");
  if (!list) return;
  const q = taskQuery.trim().toLowerCase();
  const visible = sortTasks(tasks.filter(t => {
    const matchFilter = currentFilter === "all" || (currentFilter === "done" ? t.done : !t.done);
    const matchQuery = !q || t.title.toLowerCase().includes(q) || (t.category || "").toLowerCase().includes(q);
    return matchFilter && matchQuery;
  }));
  const openCount = pendingTasks().length;

  const countLabel = $("#taskCountLabel");
  if (countLabel) countLabel.textContent = `共 ${tasks.length} 项任务 · ${openCount} 项待完成`;
  const navCount = $("#navTaskCount");
  if (navCount) navCount.textContent = openCount;
  const statTasks = $("#statTasks");
  if (statTasks) statTasks.textContent = openCount;

  list.innerHTML = visible.map(t => {
    const overdue = t.deadline && t.deadline < todayISO() && !t.done;
    return `<div class="task-row ${t.done ? "completed" : ""} ${overdue ? "overdue" : ""}">
      <input class="task-check" type="checkbox" data-check="${t.id}" ${t.done ? "checked" : ""} aria-label="完成任务">
      <div class="task-main">
        <strong>${escapeHtml(t.title)}</strong>
        <p>截止：${fmtCN(t.deadline)}${overdue ? ' <span class="overdue-tag">已逾期</span>' : ""} · 预计 ${t.duration} 分钟 · ${escapeHtml(t.category)}</p>
      </div>
      <span class="task-priority ${t.priority === "中" ? "medium" : t.priority === "低" ? "low" : ""}">${t.priority}优先级</span>
      <button class="edit-task" data-edit="${t.id}" title="编辑">✎</button>
      <button class="delete-task" data-delete="${t.id}" title="删除">×</button>
    </div>`;
  }).join("") || '<div class="panel empty-state"><strong>这里暂时没有任务</strong><p>添加一项任务，开始安排你的时间。</p></div>';

  $$("[data-check]").forEach(c => c.addEventListener("change", () => {
    const t = tasks.find(x => x.id === c.dataset.check);
    if (!t) return;
    t.done = c.checked;
    persistTasks();
    const snapshot = { ...t };
    renderAll();
    if (snapshot.done) encourage(snapshot);
    else toast("已恢复为待完成");
  }));
  $$("[data-delete]").forEach(b => b.addEventListener("click", () => {
    tasks = tasks.filter(t => t.id !== b.dataset.delete);
    persistTasks();
    renderAll();
    toast("任务已删除");
  }));
  $$("[data-edit]").forEach(b => b.addEventListener("click", () => openTaskDialog(b.dataset.edit)));
  renderPriority();
}

function renderPriority() {
  const p = $("#priorityList");
  if (!p) return;
  const items = sortTasks(pendingTasks()).slice(0, 3);
  p.innerHTML = items.map(t => {
    const overdue = t.deadline && t.deadline < todayISO();
    return `<div class="priority-row">
      <span class="priority-dot ${t.priority === "高" ? "urgent" : t.priority === "低" ? "low" : "medium"}"></span>
      <div><strong>${escapeHtml(t.title)}</strong><small>截止：${fmtCN(t.deadline)}${overdue ? " · 已逾期" : ""}</small></div>
      <span class="priority-label">${t.priority}</span>
    </div>`;
  }).join("") || '<div class="muted">暂无待处理任务</div>';
}

/* ---------- 任务弹窗 ---------- */
function openTaskDialog(id) {
  const dlg = $("#taskDialog");
  if (!dlg) return;
  editingTaskId = id || null;
  const t = id ? tasks.find(x => x.id === id) : null;
  $("#taskDialogTitle").textContent = t ? "编辑任务" : "添加任务";
  $("#taskTitle").value = t ? t.title : "";
  $("#taskDeadline").value = t ? t.deadline : "";
  $("#taskDuration").value = t ? t.duration : 60;
  $("#taskPriority").value = t ? t.priority : "中";
  $("#taskCategory").value = t ? t.category : "学习";
  dlg.showModal();
}

/* ---------- 周次 ---------- */
function weekSetOf(str) {
  // 无周次信息 => 每周都有
  if (!str) return null;
  const set = new Set();
  String(str).split(/[,，;；]/).forEach(part => {
    const p = part.trim();
    if (!p) return;
    const parity = /单/.test(p) ? 1 : /双/.test(p) ? 0 : -1;
    const range = p.match(/(\d+)\s*[-–—~]\s*(\d+)/);
    if (range) {
      const a = Number(range[1]), b = Number(range[2]);
      for (let w = Math.min(a, b); w <= Math.max(a, b); w++) {
        if (parity === -1 || w % 2 === parity) set.add(w);
      }
      return;
    }
    const open = p.match(/(\d+)\s*[-–—~]\s*$/);
    if (open) {
      const a = Number(open[1]);
      for (let w = a; w <= a + 20; w++) if (parity === -1 || w % 2 === parity) set.add(w);
      return;
    }
    const single = p.match(/(\d+)/);
    if (single) set.add(Number(single[1]));
  });
  return set.size ? set : null;
}

function courseInWeek(c, week) {
  const set = weekSetOf(c.weeks);
  return !set || set.has(week);
}

function updateWeekLabel() {
  if ($("#weekLabel")) $("#weekLabel").textContent = `第 ${currentWeek} 周`;
  if ($("#weekTitle")) $("#weekTitle").textContent = `第 ${currentWeek} 周 · 秋季学期`;
}

/* ---------- 课表 ---------- */
function renderTimetable() {
  const grid = $("#timetableGrid");
  if (!grid) return;
  updateWeekLabel();
  const days = ["", "周一", "周二", "周三", "周四", "周五"];
  const hours = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
  let out = days.map(d => `<div class="tt-head">${d || "时间"}</div>`).join("");
  hours.forEach(h => {
    out += `<div class="tt-time">${h}</div>`;
    for (let day = 1; day <= 5; day++) {
      const c = courses.find(x => x.day === day && x.start.slice(0, 2) === h.slice(0, 2) && courseInWeek(x, currentWeek));
      out += `<div class="tt-cell" data-day="${day}" data-hour="${h}">${c
        ? `<div class="course-block ${c.tone}" draggable="true" data-course="${c.id}">
             <strong>${escapeHtml(c.name)}</strong><br>${c.start}–${c.end}<br>${escapeHtml(c.room)}${c.weeks ? `<br><span class="course-weeks">${escapeHtml(c.weeks)}</span>` : ""}
             <button class="course-del" data-delcourse="${c.id}" title="删除课程">×</button>
           </div>`
        : ""}</div>`;
    }
  });
  grid.innerHTML = out;

  const emptyTip = $("#timetableEmpty");
  if (emptyTip) emptyTip.classList.toggle("hidden", courses.length > 0);

  // 点击课程块 -> 编辑
  $$(".course-block").forEach(block => {
    block.addEventListener("click", e => {
      if (e.target.closest("[data-delcourse]")) return;
      openCourseDialog(block.dataset.course);
    });
    block.addEventListener("dragstart", e => {
      e.dataTransfer.setData("text/plain", block.dataset.course);
      e.dataTransfer.effectAllowed = "move";
      block.classList.add("dragging");
    });
    block.addEventListener("dragend", () => block.classList.remove("dragging"));
  });

  // 拖到其他格子 -> 调整时间
  $$(".tt-cell").forEach(cell => {
    cell.addEventListener("dragover", e => {
      if (!e.dataTransfer.types.includes("text/plain")) return;
      e.preventDefault();
      cell.classList.add("drag-over");
    });
    cell.addEventListener("dragleave", () => cell.classList.remove("drag-over"));
    cell.addEventListener("drop", e => {
      e.preventDefault();
      cell.classList.remove("drag-over");
      const id = e.dataTransfer.getData("text/plain");
      const c = courses.find(x => x.id === id);
      if (!c || !cell.dataset.day) return;
      const dur = toMin(c.end) - toMin(c.start);
      const startMin = toMin(cell.dataset.hour);
      const next = { ...c, day: Number(cell.dataset.day), start: toHHMM(startMin), end: toHHMM(startMin + dur) };
      if (toMin(next.end) > 22 * 60 + 30) { toast("超出当天时间范围"); return; }
      const clash = courseConflict(next);
      if (clash) { toast(`与「${clash.name}」时间冲突`); return; }
      Object.assign(c, { day: next.day, start: next.start, end: next.end });
      persistCourses();
      renderAll();
      toast("课程时间已调整");
    });
  });

  $$("[data-delcourse]").forEach(b => b.addEventListener("click", e => {
    e.stopPropagation();
    const c = courses.find(x => x.id === b.dataset.delcourse);
    if (!c) return;
    if (!confirm(`删除课程「${c.name}」？`)) return;
    courses = courses.filter(x => x.id !== c.id);
    persistCourses();
    renderTimetable();
    renderDashboard();
    renderInsights();
    toast("课程已删除");
  }));
}

function courseConflict(c) {
  return courses.find(x => x.id !== c.id && x.day === c.day && toMin(c.start) < toMin(x.end) && toMin(c.end) > toMin(x.start));
}

/* ---------- 排程算法 ---------- */
function freeSlots(dayIndex, windowStart = 8 * 60, windowEnd = 21 * 60 + 30) {
  const busy = courses.filter(c => c.day === dayIndex)
    .map(c => ({ s: toMin(c.start), e: toMin(c.end) }))
    .sort((a, b) => a.s - b.s);
  const slots = [];
  let cur = windowStart;
  busy.forEach(b => {
    if (b.s > cur) slots.push({ s: cur, e: b.s });
    cur = Math.max(cur, b.e);
  });
  if (cur < windowEnd) slots.push({ s: cur, e: windowEnd });
  return slots.filter(s => s.e - s.s >= 30);
}

function buildPlan(iso, opts = {}) {
  const day = weekdayOf(iso);
  const limitMinutes = (opts.limitHours || 6) * 60;
  const includeTasks = opts.includeTasks !== false;
  const includeBreaks = opts.includeBreaks !== false;

  const items = [];
  courses.filter(c => c.day === day).forEach(c => {
    items.push({ s: toMin(c.start), e: toMin(c.end), title: c.name, meta: `${c.room || "教室"}`, kind: "course" });
  });

  if (includeTasks) {
    const slots = freeSlots(day).map(s => ({ ...s }));
    const queue = sortTasks(pendingTasks());
    let used = 0;
    queue.forEach(t => {
      if (used >= limitMinutes) return;
      const need = Math.min(Number(t.duration) || 60, limitMinutes - used, 180);
      for (const slot of slots) {
        if (slot.e - slot.s < need + 10) continue;
        const start = slot.s + 10;
        items.push({ s: start, e: start + need, title: t.title, meta: `${need} 分钟 · ${t.priority}优先级 · 截止 ${fmtCN(t.deadline)}`, kind: "task", taskId: t.id });
        slot.s = start + need + 10;
        used += need;
        break;
      }
    });
  }

  if (includeBreaks) {
    items.push({ s: 12 * 60, e: 12 * 60 + 40, title: "午餐与休息", meta: "离开屏幕，给大脑一点空间", kind: "break" });
  }

  items.sort((a, b) => a.s - b.s);

  // 合并重叠的休息项
  const merged = [];
  items.forEach(it => {
    const last = merged[merged.length - 1];
    if (last && it.kind === "break" && last.kind === "break") return;
    merged.push(it);
  });
  return merged;
}

function planMinutes(plan) {
  return plan.filter(p => p.kind === "task").reduce((sum, p) => sum + (p.e - p.s), 0);
}

/* ---------- 首页 ---------- */
function renderDashboard() {
  const iso = todayISO();
  const day = weekdayOf(iso);
  const open = pendingTasks();
  const todayCourses = courses.filter(c => c.day === day && courseInWeek(c, currentWeek));
  const busyMin = todayCourses.reduce((sum, c) => sum + (toMin(c.end) - toMin(c.start)), 0);
  const freeHours = Math.max(0, (21 * 60 + 30 - 8 * 60 - busyMin) / 60);
  const doneCount = tasks.filter(t => t.done).length;
  const rate = tasks.length ? Math.round(doneCount / tasks.length * 100) : 0;

  if ($("#statTasks")) $("#statTasks").textContent = open.length;
  if ($("#statCourses")) $("#statCourses").textContent = todayCourses.length;
  const blankUser = tasks.length === 0 && courses.length === 0;
  const st = $("#statFree");
  if (st) st.textContent = blankUser ? "—" : freeHours.toFixed(1);
  const hint = $("#freeHint");
  if (hint) hint.textContent = blankUser ? "添加课程后计算" : "已排除课程时间";
  if ($("#statRate")) $("#statRate").textContent = rate;
  if ($("#statRateBar")) $("#statRateBar").style.width = rate + "%";

  const highCount = open.filter(t => t.priority === "高").length;
  const footHigh = document.querySelector(".stat-card .green-text");
  if (footHigh && footHigh.parentElement && footHigh.parentElement.parentElement === $(".stat-card")) {
    footHigh.textContent = highCount ? `↗ ${highCount} 项高优先级` : "暂无高优先级";
  }

  const blank = tasks.length === 0 && courses.length === 0;
  const plan = blank ? [] : (savedPlan && savedPlan.date === iso ? savedPlan.items : buildPlan(iso, { includeTasks: true, includeBreaks: true, limitHours: 6 }));
  renderTimeline(plan, iso);

  const setup = $("#setupPanel");
  if (setup) setup.classList.toggle("hidden", !(tasks.length === 0 && courses.length === 0));
}

function renderTimeline(plan, iso) {
  const box = $("#todayTimeline");
  if (!box) return;
  if (!plan || !plan.length) {
    box.innerHTML = '<div class="empty-state" style="min-height:180px"><div class="empty-icon">✧</div><strong>今天还没有安排</strong><p>先添加课程和任务，再生成属于你的日程。</p><button class="primary-button" id="timelineEmptyBtn" style="margin-top:6px">去添加任务</button></div>';
    const tbtn = $("#timelineEmptyBtn");
    if (tbtn) tbtn.addEventListener("click", () => { go("tasks"); openTaskDialog(null); });
    return;
  }
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isToday = iso === todayISO();
  box.innerHTML = plan.map(item => {
    const isDone = item.kind === "task" && tasks.find(t => t.id === item.taskId && t.done);
    const isCurrent = isToday && nowMin >= item.s && nowMin < item.e;
    const cls = isDone ? "done" : isCurrent ? "current" : "";
    const tag = item.kind === "course"
      ? '<span class="tag tag-blue">课程</span>'
      : item.kind === "break"
        ? '<span class="tag tag-gray">休息</span>'
        : '<span class="tag tag-purple">任务</span>';
    const cardCls = item.kind === "course" ? "" : item.kind === "break" ? "" : "soft-blue";
    return `<div class="timeline-item ${cls}">
      <div class="time">${toHHMM(item.s)}<span>— ${toHHMM(item.e)}</span></div>
      <div class="timeline-line"><i></i></div>
      <div class="event-card ${cardCls}">
        <div class="event-title">${escapeHtml(item.title)} ${tag}</div>
        <div class="event-meta">${escapeHtml(item.meta || "")}</div>
      </div>
    </div>`;
  }).join("");
}

/* ---------- 规划器 ---------- */
function renderPlanFromState() {
  const planDate = $("#planDate");
  if (planDate && !planDate.value) planDate.value = todayISO();
  if (savedPlan && planDate && savedPlan.date === planDate.value) {
    renderPlan(savedPlan.items, true);
  }
}

function renderPlan(plan, isSaved) {
  const box = $("#planResult");
  if (!box) return;
  box.classList.remove("empty-state");
  if (!plan.length) {
    box.innerHTML = '<div class="empty-state" style="min-height:220px"><div class="empty-icon">✧</div><strong>没有可安排的时段</strong><p>这一天课程较多，试着换一天，或降低每日目标。</p></div>';
    return;
  }
  box.innerHTML = plan.map(x => `<div class="plan-line">
    <div class="plan-time">${toHHMM(x.s)} — ${toHHMM(x.e)}</div>
    <div class="plan-event"><strong>${escapeHtml(x.title)}</strong><small>${escapeHtml(x.meta || "")}</small></div>
  </div>`).join("");
  const sub = $("#planSubtitle");
  if (sub) sub.textContent = isSaved ? "已保存的日程，可直接查看" : `已生成 ${plan.filter(p => p.kind === "task").length} 项任务安排`;
  const status = $("#planStatus");
  if (status) {
    status.textContent = isSaved ? "已确认" : "已生成";
    status.className = isSaved ? "tag tag-green" : "tag tag-green";
  }
  const accept = $("#acceptPlan");
  if (accept) accept.classList.toggle("hidden", !!isSaved);
}

/* ---------- 统计 ---------- */
function renderInsights() {
  const done = tasks.filter(t => t.done);
  const rate = tasks.length ? Math.round(done.length / tasks.length * 100) : 0;
  const focus = done.reduce((sum, t) => sum + (Number(t.duration) || 0), 0) / 60;

  if ($("#weeklyRate")) $("#weeklyRate").innerHTML = `${rate}<span class="stat-unit">%</span>`;
  if ($("#completedCount")) $("#completedCount").textContent = done.length;
  if ($("#focusHours")) $("#focusHours").textContent = focus.toFixed(1);

  // 按截止日分布
  const days = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  tasks.forEach(t => {
    if (!t.deadline) return;
    const idx = weekdayOf(t.deadline) - 1;
    counts[idx] += 1;
  });
  const max = Math.max(1, ...counts);
  const bars = $("#weeklyBars");
  if (bars) {
    bars.innerHTML = counts.map((c, i) => `<div class="bar-col">
      <i style="height:${Math.round(c / max * 92)}%"></i>
      <span>${days[i]}</span>
    </div>`).join("");
  }

  const summary = document.querySelector(".summary-panel > p");
  if (summary) {
    const high = pendingTasks().filter(t => t.priority === "高").length;
    summary.textContent = tasks.length
      ? `你当前有 ${tasks.length} 项任务，已完成 ${done.length} 项，完成率 ${rate}%。${high ? `还有 ${high} 项高优先级任务待处理，建议优先安排。` : "高优先级任务已清空，节奏不错。"}`
      : "还没有任务记录。添加几项任务后，这里会显示真实的完成情况。";
  }
}

/* ---------- 渲染总入口 ---------- */
function relocalize() { try { window.LF_I18N && window.LF_I18N.apply(); } catch (e) {} }

function renderAll() {
  renderTasks();
  renderTimetable();
  renderDashboard();
  renderInsights();
  relocalize();
}

/* ---------- 事件绑定 ---------- */
$("#taskSearch")?.addEventListener("input", e => { taskQuery = e.target.value; renderTasks(); });
$("#taskSort")?.addEventListener("change", e => { taskSortMode = e.target.value; renderTasks(); });

$$(".filter").forEach(b => b.addEventListener("click", () => {
  currentFilter = b.dataset.filter;
  $$(".filter").forEach(x => x.classList.toggle("active", x === b));
  renderTasks();
}));

const focusAdd = $("#focusAddTask");
if (focusAdd) focusAdd.addEventListener("click", () => openTaskDialog(null));

$("#taskForm")?.addEventListener("submit", e => {
  e.preventDefault();
  const title = $("#taskTitle").value.trim();
  if (!title) { toast("请填写任务名称"); return; }
  const data = {
    title,
    deadline: $("#taskDeadline").value,
    duration: Math.max(5, Number($("#taskDuration").value) || 60),
    priority: $("#taskPriority").value,
    category: $("#taskCategory").value
  };
  if (editingTaskId) {
    const t = tasks.find(x => x.id === editingTaskId);
    if (t) Object.assign(t, data);
    toast("任务已更新");
  } else {
    tasks.unshift({ id: uid("t"), done: false, ...data });
    toast("任务已添加");
  }
  persistTasks();
  $("#taskDialog").close();
  renderAll();
});

$("#cancelTask")?.addEventListener("click", () => $("#taskDialog").close());

/* AI 识别（本地模拟，保留原逻辑） */
function mockParse(text) {
  const title = text.match(/(?:完成|做完|提交|准备|复习|参加|报名)([^，。；,;]{2,18})/)?.[1] || text.slice(0, 18);
  const duration = text.match(/(\d+(?:\.\d+)?)\s*(小时|h|分钟|分)/i);
  const mins = duration ? (duration[2].includes("小时") || duration[2].toLowerCase() === "h" ? Number(duration[1]) * 60 : Number(duration[1])) : 60;
  const priority = /明天|尽快|马上|截止|考试/.test(text) ? "高" : "中";
  const today = new Date();
  const plus = n => new Date(today.getTime() + n * 86400000).toLocaleDateString("sv-SE");
  let deadline = "";
  const d = text.match(/(\d{1,2})月(\d{1,2})日/);
  if (d) deadline = `2026-${String(d[1]).padStart(2, "0")}-${String(d[2]).padStart(2, "0")}`;
  else if (/明天/.test(text)) deadline = plus(1);
  else if (/后天/.test(text)) deadline = plus(2);
  else if (/周五/.test(text)) deadline = "";
  return [{ title: title.trim() || "新任务", deadline, duration: mins, priority, category: /社团|活动|报名/.test(text) ? "校园" : "学习" }];
}

$("#parseTaskBtn")?.addEventListener("click", async () => {
  const text = $("#taskInput").value.trim();
  if (!text) { toast("先输入一段任务描述"); return; }

  const btn = $("#parseTaskBtn");
  let source = "本地规则";
  parsedDraft = [];

  if (aiKey()) {
    btn.disabled = true; btn.textContent = "识别中…";
    try {
      parsedDraft = await aiParseTask(text);
      source = "DeepSeek";
    } catch (err) {
      toast("AI 不可用，已用本地规则");
    }
    btn.disabled = false; btn.textContent = "✧ 智能识别";
  }
  if (!parsedDraft.length) parsedDraft = mockParse(text);

  const p = $("#parsePreview");
  p.classList.remove("hidden");
  p.innerHTML = `<strong style="font-size:11px;color:#6875aa">✧ 识别结果预览（${source}）</strong>
    ${parsedDraft.map(t => `<div class="preview-task"><span>${escapeHtml(t.title)}</span><small>${fmtCN(t.deadline)} · ${t.duration} 分钟 · ${t.priority}优先级</small></div>`).join("")}
    <div class="preview-actions"><button class="secondary-button" id="cancelDraft">取消</button><button class="primary-button" id="confirmDraft">确认加入任务</button></div>`;
  $("#cancelDraft").onclick = () => p.classList.add("hidden");
  $("#confirmDraft").onclick = () => {
    parsedDraft.forEach(t => tasks.unshift({ ...t, id: uid("t"), done: false }));
    persistTasks();
    renderAll();
    $("#taskInput").value = "";
    p.classList.add("hidden");
    toast("任务已加入任务中心");
  };
});

$("#emptyImportBtn")?.addEventListener("click", () => $("#importCourseBtn")?.click());
$("#emptyAddBtn")?.addEventListener("click", () => openCourseDialog(null));

["prevWeek", "nextWeek"].forEach(id => {
  const btn = $("#" + id);
  if (!btn) return;
  btn.addEventListener("click", () => {
    currentWeek = Math.min(30, Math.max(1, currentWeek + (id === "nextWeek" ? 1 : -1)));
    localStorage.setItem("lifeflow_week_v2", String(currentWeek));
    renderTimetable();
    renderDashboard();
  });
});

/* 课表弹窗（新增 / 编辑） */
let editingCourseId = null;
function openCourseDialog(id) {
  const dlg = $("#courseDialog");
  if (!dlg) return;
  editingCourseId = id || null;
  const c = id ? courses.find(x => x.id === id) : null;
  $("#courseDialogTitle").textContent = c ? "编辑课程" : "添加课程";
  $("#courseName").value = c ? c.name : "";
  $("#courseDay").value = c ? c.day : 1;
  $("#courseStart").value = c ? c.start : "10:00";
  $("#courseEnd").value = c ? c.end : "11:40";
  $("#courseRoom").value = c ? c.room : "";
  dlg.showModal();
}
$("#addCourseBtn")?.addEventListener("click", () => openCourseDialog(null));

$("#courseForm")?.addEventListener("submit", e => {
  e.preventDefault();
  const draft = {
    id: editingCourseId || uid("c"),
    day: Number($("#courseDay").value),
    start: $("#courseStart").value,
    end: $("#courseEnd").value,
    name: $("#courseName").value.trim(),
    room: $("#courseRoom").value.trim(),
    tone: ""
  };
  if (!draft.name) { toast("请填写课程名称"); return; }
  if (toMin(draft.end) <= toMin(draft.start)) { toast("结束时间必须晚于开始时间"); return; }
  const clash = courseConflict(draft);
  if (clash) { toast(`与「${clash.name}」时间冲突`); return; }

  if (editingCourseId) {
    const c = courses.find(x => x.id === editingCourseId);
    if (c) Object.assign(c, draft);
    toast("课程已更新");
  } else {
    courses.push(draft);
    toast("课程已添加并保存");
  }
  persistCourses();
  renderAll();
  $("#courseDialog").close();
  e.target.reset();
  editingCourseId = null;
});

/* 规划器 */
$("#generatePlan")?.addEventListener("click", () => {
  const iso = $("#planDate").value || todayISO();
  const limitHours = Number(String($("#dailyLimit").value).replace(/[^\d.]/g, "")) || 6;
  const plan = buildPlan(iso, {
    includeTasks: $("#includeTasks").checked,
    includeBreaks: $("#includeBreaks").checked,
    limitHours
  });
  renderPlan(plan, false);
  $("#planResult")._plan = plan;
  $("#planResult")._date = iso;
  toast("已根据课表和任务生成计划");
});

$("#acceptPlan")?.addEventListener("click", () => {
  const box = $("#planResult");
  const plan = box._plan || [];
  const iso = box._date || ($("#planDate").value || todayISO());
  savedPlan = { date: iso, items: plan, savedAt: new Date().toISOString() };
  writeJSON(KEYS.plan, savedPlan);
  renderPlan(plan, true);
  renderDashboard();
  toast("计划已保存");
});

$("#rescheduleBtn")?.addEventListener("click", () => {
  const text = $("#rescheduleInput").value.trim();
  if (!text) { toast("请描述发生了什么变化"); return; }
  const iso = $("#planDate").value || todayISO();
  const limitHours = Number(String($("#dailyLimit").value).replace(/[^\d.]/g, "")) || 6;
  const before = savedPlan && savedPlan.date === iso ? savedPlan.items : buildPlan(iso, { limitHours });
  const beforeIds = new Set(before.filter(i => i.kind === "task").map(i => i.taskId));
  const plan = buildPlan(iso, { includeTasks: true, includeBreaks: true, limitHours });
  savedPlan = { date: iso, items: plan, savedAt: new Date().toISOString() };
  writeJSON(KEYS.plan, savedPlan);
  const afterIds = new Set(plan.filter(i => i.kind === "task").map(i => i.taskId));
  const moved = plan.filter(i => i.kind === "task" && !beforeIds.has(i.taskId)).length;
  const kept = [...afterIds].filter(id => beforeIds.has(id)).length;
  const box = $("#rescheduleResult");
  box.classList.remove("hidden");
  box.innerHTML = `<strong>✧ 已按最新情况重新排程</strong><br>
    识别到变化：${escapeHtml(text.slice(0, 40))}${text.length > 40 ? "…" : ""}<br>
    新的日程共安排 <b>${afterIds.size}</b> 项任务，其中 ${kept} 项保持原时段，${moved} 项被重新安排。<br><br>
    <strong>下一步：</strong>可到「AI 智能规划」查看并确认新的计划。`;
  renderPlan(plan, true);
  renderDashboard();
  toast("已生成新的日程安排");
});

/* ---------- DeepSeek 接入（Key 仅存本机） ---------- */
const AI_KEY_STORE = "lifeflow_ai_key";
const AI_MODEL_STORE = "lifeflow_ai_model";
const AI_BASE_STORE = "lifeflow_ai_base";
const AI_DEFAULT_BASE = "https://api.deepseek.com/v1";
const AI_DEFAULT_MODEL = "deepseek-flash";

function aiKey() { try { return localStorage.getItem(AI_KEY_STORE) || ""; } catch (e) { return ""; } }
function aiModel() { try { return localStorage.getItem(AI_MODEL_STORE) || AI_DEFAULT_MODEL; } catch (e) { return AI_DEFAULT_MODEL; } }
function aiBase() {
  try { return (localStorage.getItem(AI_BASE_STORE) || AI_DEFAULT_BASE).replace(/\/+$/, ""); }
  catch (e) { return AI_DEFAULT_BASE; }
}

function updateAiUi() {
  const connected = !!aiKey();
  const btn = $("#aiSettingsBtn");
  if (btn) btn.classList.toggle("connected", connected);
  const st = $("#aiStatus");
  if (st) {
    st.className = "ai-status" + (connected ? " ok" : "");
    st.textContent = connected
      ? `已连接 · ${aiModel()} @ ${aiBase().replace(/^https?:\/\//, "")}（Key 只保存在本机）`
      : "未连接，当前使用本地规则";
  }
  const hint = $("#summaryHint");
  if (hint) hint.textContent = connected ? "由 DeepSeek 根据真实任务生成" : "本地规则生成";
}

async function callDeepSeek(messages, opts = {}) {
  const key = aiKey();
  if (!key) throw new Error("未配置 API Key");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(aiBase() + "/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
      body: JSON.stringify({
        model: aiModel(),
        messages,
        temperature: opts.temperature ?? 0.3,
        max_tokens: opts.maxTokens ?? 1200,
        ...(/deepseek-v4-pro/.test(aiModel()) ? { reasoning_effort: "low" } : {}),
        ...(opts.json ? { response_format: { type: "json_object" } } : {})
      }),
      signal: controller.signal
    });
    if (!res.ok) {
      const txt = (await res.text()).slice(0, 160);
      throw new Error(`HTTP ${res.status} · ${txt}`);
    }
    const data = await res.json();
    return (data.choices?.[0]?.message?.content || "").trim();
  } finally {
    clearTimeout(timer);
  }
}

function extractJsonArray(text) {
  const cleaned = String(text).replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("[");
  const end = cleaned.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("模型未返回 JSON");
  const arr = JSON.parse(cleaned.slice(start, end + 1));
  if (!Array.isArray(arr)) throw new Error("返回格式不正确");
  return arr.map(t => ({
    title: String(t.title || "").trim() || "新任务",
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(t.deadline || "") ? t.deadline : "",
    duration: Math.max(5, Number(t.duration) || 60),
    priority: ["高", "中", "低"].includes(t.priority) ? t.priority : "中",
    category: ["学习", "校园", "生活"].includes(t.category) ? t.category : "学习"
  }));
}

async function aiParseTask(text) {
  const today = todayISO();
  const messages = [
    { role: "system", content:
      `你是任务解析助手。把用户的一句话转换成 JSON。今天是 ${today}。` +
      `只输出 JSON 对象，格式：{"tasks":[{"title":"","deadline":"YYYY-MM-DD 或空字符串","duration":分钟整数,"priority":"高|中|低","category":"学习|校园|生活"}]}` +
      `。没有明确日期时 deadline 用空字符串；没有时长时 duration 用 60。不要输出任何解释。` },
    { role: "user", content: text }
  ];
  const raw = await callDeepSeek(messages, { json: true, temperature: 0.2, maxTokens: 1200 });
  const cleaned = String(raw).replace(/```json|```/g, "").trim();
  const obj = JSON.parse(cleaned);
  const arr = Array.isArray(obj) ? obj : obj.tasks;
  if (!Array.isArray(arr)) throw new Error("返回格式不正确");
  return arr.map(t => ({
    title: String(t.title || "").trim() || "新任务",
    deadline: /^\d{4}-\d{2}-\d{2}$/.test(t.deadline || "") ? t.deadline : "",
    duration: Math.max(5, Number(t.duration) || 60),
    priority: ["高", "中", "低"].includes(t.priority) ? t.priority : "中",
    category: ["学习", "校园", "生活"].includes(t.category) ? t.category : "学习"
  }));
}

async function aiSummary() {
  const done = tasks.filter(t => t.done).length;
  const pending = pendingTasks();
  const high = pending.filter(t => t.priority === "高").length;
  const todayCourses = courses.filter(c => c.day === weekdayOf(todayISO()) && courseInWeek(c, currentWeek));
  const ctx = `任务总数 ${tasks.length}，已完成 ${done}，待完成 ${pending.length}（高优先级 ${high}）。` +
    `今天课程 ${todayCourses.length} 节。待办：${pending.slice(0, 5).map(t => `${t.title}（截止 ${t.deadline || "未设"}）`).join("；") || "无"}。`;
  const messages = [
    { role: "system", content: "你是校园时间管理助手。用 2-3 句中文给出本周小结和一条具体建议，语气自然、不要分点、不要夸大。不超过 120 字。" },
    { role: "user", content: ctx }
  ];
  return callDeepSeek(messages, { temperature: 0.6, maxTokens: 600 });
}

/* ---------- 数据备份 ---------- */
function exportBackup() {
  const payload = {
    app: "LifeFlow",
    version: 4,
    exportedAt: new Date().toISOString(),
    week: currentWeek,
    tasks,
    courses,
    plan: savedPlan
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `LifeFlow备份_${todayISO()}.json`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
  toast("已导出备份文件");
}

function importBackup(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || (!Array.isArray(data.tasks) && !Array.isArray(data.courses))) {
        throw new Error("文件格式不正确");
      }
      if (!confirm("导入将覆盖当前的任务和课表，确定继续？")) return;
      tasks = normalizeTasks(data.tasks || []);
      courses = normalizeCourses(data.courses || []);
      savedPlan = data.plan || null;
      currentWeek = Number(data.week) || currentWeek;
      persistTasks();
      persistCourses();
      writeJSON(KEYS.plan, savedPlan);
      localStorage.setItem("lifeflow_week_v2", String(currentWeek));
      renderAll();
      toast("备份已导入");
    } catch (e) {
      toast("导入失败：" + (e.message || "无法读取文件"));
    }
  };
  reader.readAsText(file);
}

$("#exportData")?.addEventListener("click", exportBackup);
$("#importDataBtn")?.addEventListener("click", () => $("#importFile").click());
$("#importFile")?.addEventListener("change", e => {
  const f = e.target.files[0];
  if (f) importBackup(f);
  e.target.value = "";
});
$("#clearData")?.addEventListener("click", () => {
  if (!confirm("确定清空所有任务和课表？此操作不可撤销。")) return;
  [KEYS.tasks, KEYS.courses, KEYS.plan].forEach(k => localStorage.removeItem(k));
  tasks = [];
  courses = [];
  savedPlan = null;
  persistTasks();
  persistCourses();
  renderAll();
  toast("已清空，回到新用户状态");
});

$("#resetData")?.addEventListener("click", () => {
  if (!confirm("恢复示例数据会清空当前所有任务和课表，确定继续？")) return;
  [KEYS.tasks, KEYS.courses, KEYS.plan].forEach(k => localStorage.removeItem(k));
  tasks = normalizeTasks(DEFAULT_TASKS.map(t => ({ ...t })));
  courses = normalizeCourses(DEFAULT_COURSES.map(c => ({ ...c })));
  savedPlan = null;
  persistTasks();
  persistCourses();
  renderAll();
  toast("已恢复示例数据");
});

/* ---------- 课表导入（PDF / 文本） ---------- */
const SECTION_START = {
  1: "08:00", 2: "08:55", 3: "09:50", 4: "10:45",
  5: "14:00", 6: "14:55", 7: "15:50", 8: "16:45",
  9: "19:00", 10: "19:55", 11: "20:50", 12: "21:45"
};
function sectionTime(a, b) {
  const start = SECTION_START[a] || SECTION_START[1];
  const s = toMin(start);
  return [start, toHHMM(s + (b - a + 1) * 55 - 10)];
}
const DAY_MAP = { "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "日": 7, "天": 7 };

const PDF_SCRIPT_SOURCES = [
  "vendor/pdf.min.js",
  "https://cdn.staticfile.org/pdf.js/3.11.174/pdf.min.js",
  "https://cdn.bootcdn.net/ajax/libs/pdf.js/3.11.174/pdf.min.js"
];
const PDF_WORKER_SOURCES = [
  "vendor/pdf.worker.min.js",
  "https://cdn.staticfile.org/pdf.js/3.11.174/pdf.worker.min.js"
];

function loadScript(src, timeout = 12000) {
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      reject(new Error("加载超时：" + src));
    }, timeout);
    el.src = src;
    el.onload = () => { if (done) return; done = true; clearTimeout(timer); resolve(); };
    el.onerror = () => { if (done) return; done = true; clearTimeout(timer); reject(new Error("加载失败：" + src)); };
    document.head.appendChild(el);
  });
}

async function ensurePdfJs() {
  if (window.pdfjsLib) return;
  for (const src of PDF_SCRIPT_SOURCES) {
    try {
      await loadScript(src);
      if (window.pdfjsLib) break;
    } catch (e) { /* 试下一个源 */ }
  }
  if (!window.pdfjsLib) throw new Error("PDF 解析库加载失败，请检查网络或改用粘贴文字");
  window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDF_WORKER_SOURCES[0];
}

async function extractPdfPages(file) {
  await ensurePdfJs();
  const buffer = await file.arrayBuffer();
  const pdf = await Promise.race([
    window.pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("PDF 读取超时，文件可能过大或已损坏")), 25000))
  ]);
  const pages = [];
  const texts = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const items = content.items
      .filter(it => it.str && it.str.trim())
      .map(it => ({ str: it.str.trim(), x: it.transform[4], y: it.transform[5] }));
    pages.push(items);

    // 文本兜底：按行聚类
    const sorted = items.slice().sort((a, b) => b.y - a.y || a.x - b.x);
    const lines = [];
    let current = null;
    sorted.forEach(it => {
      if (!current || Math.abs(current.y - it.y) > 4) {
        current = { y: it.y, parts: [it] };
        lines.push(current);
      } else {
        current.parts.push(it);
      }
    });
    texts.push(lines.map(l => l.parts.sort((a, b) => a.x - b.x).map(p => p.str).join(" ")).join("\n"));
  }
  return { pages, text: texts.join("\n") };
}

function mergeCourses(list) {
  const map = new Map();
  list.forEach(c => {
    const key = `${c.name}|${c.day}|${c.start}|${c.end}`;
    if (map.has(key)) {
      const prev = map.get(key);
      if (c.weeks && prev.weeks && !prev.weeks.includes(c.weeks)) prev.weeks += "," + c.weeks;
      else if (c.weeks && !prev.weeks) prev.weeks = c.weeks;
      if (c.room && !prev.room) prev.room = c.room;
    } else {
      map.set(key, { ...c });
    }
  });
  return [...map.values()];
}

function parseScheduleText(raw) {
  const out = [];
  String(raw).split(/\r?\n/).forEach(line => {
    const s = line.replace(/\s+/g, " ").trim();
    if (s.length < 4) return;
    const dm = s.match(/(?:周|星期|礼拜)\s*([一二三四五六日天1-7])/);
    if (!dm) return;
    const day = DAY_MAP[dm[1]] || Number(dm[1]);
    if (!day || day > 7) return;

    let start = "", end = "";
    const timeM = s.match(/(\d{1,2}:\d{2})\s*[-–—~至]\s*(\d{1,2}:\d{2})/);
    const secM = s.match(/第?\s*(\d{1,2})\s*[-–—~至]\s*(\d{1,2})\s*节/);
    if (timeM) { start = timeM[1]; end = timeM[2]; }
    else if (secM) {
      const t = sectionTime(Number(secM[1]), Number(secM[2]));
      start = t[0]; end = t[1];
    }
    if (!start) return;

    let rest = s.replace(dm[0], "").replace(timeM ? timeM[0] : "", "").replace(secM ? secM[0] : "", "").trim();
    let room = "", name = rest;
    const rm = rest.match(/([\u4e00-\u9fa5]{1,8}楼\s*[A-Za-z]?\s*[-－]?\s*\d{2,4}|[A-Za-z]?\d{1,2}\s*[-－]\s*\d{2,4}|[A-Za-z]\d{3,4}|操场|体育馆|图书馆|实验室|机房|礼堂|报告厅|实验楼)/);
    if (rm) { room = rm[1].replace(/\s/g, ""); name = rest.replace(rm[1], "").trim(); }
    name = name.replace(/^[·•,，:：\-–—\s]+/, "").replace(/[·•,，:：\-–—\s]+$/, "").replace(/\s{2,}/g, " ").trim();
    if (!name) return;
    out.push({ name, day, start, end, room });
  });
  return out;
}


/* ---------- PDF 版式解析：按“星期”列还原课程 ---------- */
function spread(arr) {
  if (!arr.length) return 0;
  return Math.max(...arr) - Math.min(...arr);
}

function normalizePdfItems(items) {
  const headers = items.filter(it => /^星期[一二三四五六日]$/.test(it.str));
  if (headers.length < 3) return null;
  const sameY = spread(headers.map(h => h.y)) < spread(headers.map(h => h.x));
  const norm = items.map(it => sameY ? it : { ...it, x: it.y, y: it.x });
  const hs = norm.filter(it => /^星期[一二三四五六日]$/.test(it.str))
    .map(it => ({ x: it.x, day: "一二三四五六日".indexOf(it.str.slice(-1)) + 1 }))
    .sort((a, b) => a.x - b.x);
  return { items: norm, headers: hs };
}

function parsePdfLayout(items) {
  const prepared = normalizePdfItems(items);
  if (!prepared) return [];
  const { items: runList, headers } = prepared;
  const SKIP = /^(星期[一二三四五六日]|时间段|节次|上午|中午|下午|晚上)$/;

  const nearestDay = x => headers.reduce((best, h) => Math.abs(h.x - x) < Math.abs(best.x - x) ? h : best, headers[0]).day;

  const byDay = {};
  runList.forEach(it => {
    const t = it.str.trim();
    if (!t || SKIP.test(t)) return;
    // 跳过最左侧“节次/时间段”列
    if (it.x < headers[0].x - 60) return;
    const d = nearestDay(it.x);
    (byDay[d] = byDay[d] || []).push({ y: it.y, t });
  });

  const blocks = [];
  Object.keys(byDay).forEach(d => {
    const list = byDay[d].sort((a, b) => b.y - a.y);
    let cur = [];
    list.forEach(item => {
      if (cur.length && Math.abs(cur[cur.length - 1].y - item.y) > 13) {
        blocks.push({ day: Number(d), lines: cur });
        cur = [];
      }
      cur.push(item);
    });
    if (cur.length) blocks.push({ day: Number(d), lines: cur });
  });

  const out = [];
  blocks.forEach(b => {
    const text = b.lines.map(l => l.t).join("");
    const m = text.match(/\((\d+)-(\d+)节\)/);
    if (!m) return;

    // 课程名 = 距离“节次标记”最近、且不像元数据的行（不依赖页面方向）
    const markerLine = b.lines.find(l => /\(\d+-\d+节\)/.test(l.t));
    const metaRe = /[/:：]|节\)|场地|教师|教学班|校区|考核|学时|学分|组成|周学时/;
    let name = "";
    let bestDist = Infinity;
    b.lines.forEach(l => {
      if (l === markerLine || metaRe.test(l.t)) return;
      const d = Math.abs(l.y - (markerLine ? markerLine.y : 0));
      if (d < bestDist) { bestDist = d; name = l.t.trim(); }
    });
    if (!name) return;
    const roomM = text.match(/场地[:：]([^/]+)/);
    const rest = text.slice(m.index + m[0].length);
    const weeksM = rest.split("/")[0].split("教师")[0].split("教学班")[0].trim();
    const [start, end] = sectionTime(Number(m[1]), Number(m[2]));
    out.push({
      name,
      day: b.day,
      start,
      end,
      room: roomM ? roomM[1].trim().replace(/\s+/g, "") : "",
      weeks: weeksM.replace(/^[,\s]+/, "")
    });
  });
  return out;
}

async function aiParseSchedule(rawText) {
  const messages = [
    { role: "system", content:
      "你是课表解析器。下面是一份学校课表 PDF 的文本（按行提取，多列内容可能交错）。" +
      "请根据「星期X」表头和「(N-M节)」信息还原课程，只输出 JSON：" +
      '{"courses":[{"name":"课程名","day":1,"start":"08:00","end":"09:40","room":"教室","weeks":"周次"}]}。' +
      "day 用 1=周一 … 7=周日。节次换算：第1节 08:00 起，每节 55 分钟顺延" +
      "（第3节 09:50，第4节 10:45，第5节 14:00，第6节 14:55，第7节 15:50，第9节 19:00，第10节 19:55）。" +
      "时间用 24 小时制 HH:MM。没有的信息留空字符串。不要输出任何解释。" },
    { role: "user", content: String(rawText).slice(0, 6000) }
  ];
  const raw = await callDeepSeek(messages, { json: true, temperature: 0.1, maxTokens: 2500 });
  const obj = JSON.parse(String(raw).replace(/```json|```/g, "").trim());
  const list = Array.isArray(obj) ? obj : obj.courses;
  if (!Array.isArray(list)) throw new Error("返回格式不正确");
  return list
    .map(c => ({
      name: String(c.name || "").trim(),
      day: Math.min(7, Math.max(1, Number(c.day) || 1)),
      start: /^\d{1,2}:\d{2}$/.test(c.start || "") ? c.start.padStart(5, "0") : "",
      end: /^\d{1,2}:\d{2}$/.test(c.end || "") ? c.end.padStart(5, "0") : "",
      room: String(c.room || "").trim(),
      weeks: String(c.weeks || "").trim()
    }))
    .filter(c => c.name && c.start && c.end);
}

let importRows = [];

function renderImportPreview(rows) {
  const box = $("#importPreview");
  if (!box) return;
  if (!rows.length) {
    box.innerHTML = '<div class="import-empty">没有识别到课程。可以试试在下方手动粘贴，一行一门课，例如：<br>高等数学 周一 第1-2节 3-205</div>';
    $("#confirmImportBtn").disabled = true;
    return;
  }
  box.innerHTML = rows.map((r, i) => `<div class="import-row" data-row="${i}">
    <input data-f="name" value="${escapeHtml(r.name)}" placeholder="课程名"/>
    <select data-f="day">${[1,2,3,4,5,6,7].map(d => `<option value="${d}" ${d === r.day ? "selected" : ""}>周${"一二三四五六日"[d-1]}</option>`).join("")}</select>
    <input data-f="start" type="time" value="${r.start}"/>
    <input data-f="end" type="time" value="${r.end}"/>
    <input data-f="room" value="${escapeHtml(r.room || "")}" placeholder="地点"/>
    <input data-f="weeks" value="${escapeHtml(r.weeks || "")}" placeholder="周次"/>
    <button type="button" class="row-del" data-rowdel="${i}" title="移除">×</button>
  </div>`).join("");
  $("#confirmImportBtn").disabled = false;
  $$("[data-rowdel]").forEach(b => b.addEventListener("click", () => {
    importRows.splice(Number(b.dataset.rowdel), 1);
    renderImportPreview(importRows);
  }));
}

function collectImportRows() {
  const rows = [];
  $$(".import-row").forEach(row => {
    const get = f => row.querySelector(`[data-f="${f}"]`);
    const name = get("name").value.trim();
    const start = get("start").value;
    const end = get("end").value;
    if (!name || !start || !end) return;
    const weeksEl = get("weeks");
    rows.push({
      name, day: Number(get("day").value), start, end,
      room: get("room").value.trim(),
      weeks: weeksEl ? weeksEl.value.trim() : "",
      tone: ""
    });
  });
  return rows;
}

async function handleParse() {
  const btn = $("#parseScheduleBtn");
  const file = $("#pdfFile").files[0];
  let text = $("#scheduleText").value;

  if (file) {
    btn.disabled = true; btn.textContent = "解析中…";
    try {
      const { pages, text: pdfText } = await extractPdfPages(file);
      let rows = [];
      pages.forEach(items => { rows = rows.concat(parsePdfLayout(items)); });
      rows = mergeCourses(rows);
      if (!rows.length) {
        // 版式解析失败，先退回逐行文本解析
        text = (text ? text + "\n" : "") + pdfText;
        $("#scheduleText").value = text;
        rows = parseScheduleText(text);
      }
      if (!rows.length && aiKey()) {
        // 仍然失败：调用模型兜底
        toast("本地规则没识别出来，正在用 AI 解析…");
        try { rows = await aiParseSchedule(pdfText); } catch (e) { /* 保持空 */ }
      }
      importRows = rows;
      renderImportPreview(importRows);
      toast(importRows.length ? `识别到 ${importRows.length} 门课程，请核对后导入` : "没有识别到课程，可改用下方粘贴");
    } catch (err) {
      toast(err.message || "PDF 解析失败");
    }
    btn.disabled = false; btn.textContent = "解析";
    return;
  }

  if (!text.trim()) { toast("请选择 PDF 或粘贴课表文字"); return; }
  importRows = parseScheduleText(text);
  if (!importRows.length && aiKey()) {
    toast("本地规则没识别出来，正在用 AI 解析…");
    try { importRows = await aiParseSchedule(text); } catch (e) { /* 保持空 */ }
  }
  renderImportPreview(importRows);
  toast(importRows.length ? `识别到 ${importRows.length} 门课程，请核对后导入` : "没有识别到课程");
}

$("#importCourseBtn")?.addEventListener("click", () => {
  importRows = [];
  $("#importPreview").innerHTML = "";
  $("#confirmImportBtn").disabled = true;
  $("#importDialog").showModal();
});

$("#parseScheduleBtn")?.addEventListener("click", handleParse);

$("#confirmImportBtn")?.addEventListener("click", () => {
  const rows = collectImportRows();
  if (!rows.length) { toast("没有可导入的课程"); return; }
  let added = 0, skipped = 0;
  rows.forEach(r => {
    if (toMin(r.end) <= toMin(r.start)) { skipped++; return; }
    if (courseConflict(r)) { skipped++; return; }
    courses.push({ ...r, id: uid("c") });
    added++;
  });
  persistCourses();
  renderAll();
  $("#importDialog").close();
  toast(`已导入 ${added} 门课程${skipped ? `，跳过 ${skipped} 门（冲突或时间无效）` : ""}`);
});


/* AI 设置交互 */
$("#aiSettingsBtn")?.addEventListener("click", () => {
  $("#aiBaseInput").value = aiBase();
  $("#aiKeyInput").value = aiKey();
  $("#aiModelInput").value = aiModel();
  updateAiUi();
  $("#aiDialog").showModal();
});
$("#aiSaveBtn")?.addEventListener("click", () => {
  const base = $("#aiBaseInput").value.trim() || AI_DEFAULT_BASE;
  const key = $("#aiKeyInput").value.trim();
  const model = $("#aiModelInput").value.trim() || AI_DEFAULT_MODEL;
  if (!/^https?:\/\//.test(base)) { toast("API 地址要以 http:// 或 https:// 开头"); return; }
  if (key && key.length < 10) { toast("Key 看起来不完整，请检查"); return; }
  try {
    if (key) localStorage.setItem(AI_KEY_STORE, key); else localStorage.removeItem(AI_KEY_STORE);
    localStorage.setItem(AI_BASE_STORE, base);
    localStorage.setItem(AI_MODEL_STORE, model);
  } catch (e) {}
  updateAiUi();
  $("#aiDialog").close();
  toast(key ? "AI 已连接" : "已切换为本地规则");
});
$("#aiClearBtn")?.addEventListener("click", () => {
  try { localStorage.removeItem(AI_KEY_STORE); } catch (e) {}
  $("#aiKeyInput").value = "";
  updateAiUi();
  toast("已清除 Key");
});
$("#aiTestBtn")?.addEventListener("click", async () => {
  const btn = $("#aiTestBtn");
  btn.disabled = true; btn.textContent = "测试中…";
  try {
    const reply = await callDeepSeek([{ role: "user", content: "只回复两个字：可用" }], { maxTokens: 20, temperature: 0 });
    toast("连接成功：" + reply.slice(0, 20));
    updateAiUi();
  } catch (e) {
    toast("连接失败：" + (e.message || "未知错误"));
  }
  btn.disabled = false; btn.textContent = "测试连接";
});

$("#aiSummaryBtn")?.addEventListener("click", async () => {
  const btn = $("#aiSummaryBtn");
  if (!aiKey()) { toast("请先在右上角 AI 设置里填入 Key"); return; }
  btn.disabled = true; btn.textContent = "生成中…";
  try {
    const text = await aiSummary();
    const p = document.querySelector(".summary-panel > p");
    if (p && text) p.textContent = text;
    toast("小结已更新");
  } catch (e) {
    toast("生成失败：" + (e.message || "未知错误"));
  }
  btn.disabled = false; btn.textContent = "✧ 生成";
});

/* ---------- 完成任务鼓励 ---------- */
const LOCAL_PRAISES = [
  "又清掉一件，节奏很稳。",
  "完成一件，焦虑少一分。",
  "这一项划掉，今天更轻松了。",
  "小步快跑，攒起来就是大进度。",
  "专注的这段时间很有价值。",
  "继续这样，收尾会比想象中快。"
];
let praiseToken = 0;

function paintPraise(title, text, fromAI) {
  const box = $("#praise");
  if (!box) return;
  $("#praiseTitle").textContent = title;
  $("#praiseText").textContent = text;
  box.classList.toggle("ai", !!fromAI);
}

function showPraise(title, text, fromAI) {
  const box = $("#praise");
  if (!box) return;
  paintPraise(title, text, fromAI);
  box.classList.remove("hidden");
  requestAnimationFrame(() => box.classList.add("show"));
  clearTimeout(box._hide);
  box._hide = setTimeout(() => {
    box.classList.remove("show");
    setTimeout(() => box.classList.add("hidden"), 430);
  }, 5400);
}

function hidePraise() {
  const box = $("#praise");
  if (!box) return;
  box.classList.remove("show");
  setTimeout(() => box.classList.add("hidden"), 430);
}
$("#praise")?.addEventListener("click", hidePraise);

async function aiEncourage(task) {
  const done = tasks.filter(t => t.done).length;
  const pending = pendingTasks().length;
  const rate = tasks.length ? Math.round(done / tasks.length * 100) : 0;
  const messages = [
    { role: "system", content: "你是校园学习助手。用户刚完成一个任务，请针对【这一个任务】写一句中文鼓励：不超过 25 个字，真诚不浮夸，最多一个 emoji，不要引号，不要提及其他任务的数量。" },
    { role: "user", content: `刚刚完成的任务：${task.title}（${task.category}，预计 ${task.duration} 分钟）。背景：今天已完成 ${done} 项，还剩 ${pending} 项。` }
  ];
  return callDeepSeek(messages, { maxTokens: 700, temperature: 0.85 });
}

async function encourage(task) {
  const token = ++praiseToken;
  const pending = pendingTasks().length;
  const local = LOCAL_PRAISES[Math.floor(Math.random() * LOCAL_PRAISES.length)];
  // 先给即时反馈，AI 结果回来后再替换
  showPraise(pending === 0 ? "今天全部完成 🎉" : "完成啦", local, false);
  if (!aiKey()) return;
  try {
    const text = await aiEncourage(task);
    if (token !== praiseToken || !text) return;
    const box = $("#praise");
    if (!box || box.classList.contains("hidden")) return;
    paintPraise(pending === 0 ? "今天全部完成 🎉" : "做得很好", text.replace(/^["“]|["”]$/g, ""), true);
  } catch (e) {
    /* 失败时保留本地鼓励 */
  }
}

/* ---------- 语言切换 / 新用户引导 ---------- */
function syncLangButton() {
  const btn = $("#langToggle");
  if (!btn) return;
  const lang = (window.LF_I18N && window.LF_I18N.lang) || "zh";
  btn.textContent = lang === "en" ? "EN" : "中";
}
$("#langToggle")?.addEventListener("click", () => {
  const cur = (window.LF_I18N && window.LF_I18N.lang) || "zh";
  window.LF_I18N && window.LF_I18N.setLang(cur === "zh" ? "en" : "zh");
  syncLangButton();
  relocalize();
});
["introZh", "introEn"].forEach(id => {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.addEventListener("click", () => {
    window.LF_I18N && window.LF_I18N.setLang(btn.dataset.langLabel);
    syncLangButton();
    relocalize();
  });
});

$("#setupStep1")?.addEventListener("click", () => { go("timetable"); $("#importCourseBtn")?.click(); });
$("#setupStep2")?.addEventListener("click", () => { go("tasks"); openTaskDialog(null); });
$("#setupStep3")?.addEventListener("click", () => { go("planner"); });

/* ---------- 新手引导 + 个人资料 ---------- */
const NAME_STORE = "lifeflow_name";
const INTRO_STORE = "lifeflow_intro_done";
function userName() { try { return localStorage.getItem(NAME_STORE) || "dear student"; } catch (e) { return "dear student"; } }

function renderName() {
  const name = userName();
  const initial = name.trim().slice(0, 1).toUpperCase() || "L";
  const greet = $("#greetName");
  if (greet) greet.textContent = name;
  const pn = $("#profileName");
  if (pn) pn.textContent = name;
  document.querySelectorAll(".avatar").forEach(a => {
    if (a.id !== "topAvatarBtn") return;
    a.textContent = initial;
  });
  const sb = $("#profileBtn");
  if (sb) {
    const av = sb.querySelector(".avatar");
    if (av) av.textContent = initial;
  }
}

function openIntro() {
  const el = $("#intro");
  if (el) el.classList.remove("hidden");
}
function closeIntro() {
  const el = $("#intro");
  if (el) el.classList.add("hidden");
}

$("#introStart")?.addEventListener("click", () => {
  const hide = $("#introHide").checked;
  try {
    if (hide) localStorage.setItem(INTRO_STORE, "1");
    else localStorage.removeItem(INTRO_STORE);
  } catch (e) {}
  closeIntro();
});
$("#helpBtn")?.addEventListener("click", openIntro);

function openProfile() {
  $("#profileNameInput").value = userName();
  $("#profileDialog").showModal();
}
$("#profileBtn")?.addEventListener("click", openProfile);
$("#topAvatarBtn")?.addEventListener("click", openProfile);
$("#profileCancel")?.addEventListener("click", () => $("#profileDialog").close());
$("#profileSave")?.addEventListener("click", () => {
  const v = $("#profileNameInput").value.trim();
  if (!v) { toast("请填写名字"); return; }
  try { localStorage.setItem(NAME_STORE, v); } catch (e) {}
  renderName();
  $("#profileDialog").close();
  toast("已保存");
});

/* ---------- 主题（自动 / 浅色 / 深色） ---------- */
const THEME_ORDER = ["auto", "light", "dark"];
function applyTheme(mode) {
  if (mode === "auto") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", mode);
  const btn = $("#themeToggle");
  if (btn) {
    btn.textContent = mode === "auto" ? "◐" : mode === "light" ? "☀" : "☾";
    btn.title = mode === "auto" ? "当前：跟随系统，点击切换" : mode === "light" ? "当前：浅色，点击切换" : "当前：深色，点击切换";
  }
  try { localStorage.setItem("lifeflow_theme", mode); } catch (e) {}
}
let themeMode = (() => { try { return localStorage.getItem("lifeflow_theme") || "auto"; } catch (e) { return "auto"; } })();
applyTheme(themeMode);
$("#themeToggle")?.addEventListener("click", () => {
  themeMode = THEME_ORDER[(THEME_ORDER.indexOf(themeMode) + 1) % THEME_ORDER.length];
  applyTheme(themeMode);
  toast(themeMode === "auto" ? "跟随系统" : themeMode === "light" ? "浅色模式" : "深色模式");
});

/* ---------- 弹窗关闭 ---------- */
document.addEventListener("click", e => {
  const btn = e.target.closest("[data-close]");
  if (btn) {
    const dlg = btn.closest("dialog");
    if (dlg) dlg.close();
  }
});
document.querySelectorAll("dialog").forEach(dlg => {
  dlg.addEventListener("click", e => {
    if (e.target === dlg) dlg.close();   // 点击遮罩也能关闭
  });
});

/* ---------- 初始化 ---------- */
(function migrateLegacy() {
  try { LEGACY_KEYS.forEach(k => localStorage.removeItem(k)); } catch (e) {}
})();

(function init() {
  const now = new Date();
  const today = $("#todayText");
  if (today) today.textContent = now.toLocaleDateString("zh-CN", { month: "long", day: "numeric", weekday: "long" });
  const planDate = $("#planDate");
  if (planDate) planDate.value = todayISO();
  renderAll();
  updateAiUi();
  renderName();
  syncLangButton();
  try {
    if (!localStorage.getItem(INTRO_STORE)) openIntro();
  } catch (e) {}
})();
