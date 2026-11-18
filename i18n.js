/* LifeFlow i18n · 中文 / English 界面语言切换
   思路：给每个文本节点保存原始中文快照，切换语言时从快照重新翻译，避免来回切换串词。 */
(function () {
  const LANG_KEY = "lifeflow_lang";

  const ZH_TO_EN = {
    /* 通用 / 侧栏 */
    "总览": "Overview",
    "我的课表": "Timetable",
    "任务中心": "Tasks",
    "AI 智能规划": "AI Planner",
    "数据统计": "Insights",
    "把复杂留给 LifeFlow，把时间还给自己。": "Leave the complexity to LifeFlow.",
    "今天": "Today",
    "切换深浅色（自动/浅色/深色）": "Theme: auto / light / dark",
    "新手指引": "Getting started",
    "个人资料": "Profile",
    "编辑个人资料": "Edit profile",

    /* 首页 */
    "WEDNESDAY, YOUR DAY STARTS HERE": "YOUR DAY STARTS HERE",
    "把今天，安排得刚刚好。": "Make today count.",
    "早上好，": "Good morning, ",
    "。先看看今天有什么值得完成。": ". Here is what matters today.",
    "生成今日计划": "Plan my day",
    "今日待办": "Open tasks",
    "待完成任务": "to finish",
    "今日课程": "Classes today",
    "节": "",
    "下一节 14:00": "Next class 14:00",
    "距离上课 42 分钟": "42 min to class",
    "可用时间": "Free time",
    "适合深度学习": "Good for deep work",
    "已排除课程时间": "Class time excluded",
    "添加课程后计算": "After adding classes",
    "计划完成率": "Completion",
    "比昨天提升 12%": "+12% vs yesterday",
    "本周平均": "weekly average",
    "今日安排": "Today's schedule",
    "把注意力放在当下的一件事": "One thing at a time",
    "查看完整计划 ↗": "Full plan ↗",
    "今天的智能建议": "Suggestion",
    "一个小建议": "One tip",
    "把手机放远一点，给自己 45 分钟的专注时间。": "Put your phone away for 45 minutes of focus.",
    "和 AI 规划一下": "Plan with AI",
    "优先处理": "Priority",
    "别让重要的事悄悄过期": "Do not let important work slip",
    "全部": "All",

    /* 课表 */
    "拖动课程可调整时间，也可以从教务系统 PDF 导入。": "Drag a class to move it, or import your timetable from a PDF.",
    "⇪ 导入课表": "⇪ Import timetable",
    "＋ 添加课程": "＋ Add class",
    "第 12 周 · 秋季学期": "Week 12 · Autumn term",
    "拖动课程可调整时间，切换周次只显示该周课程": "Drag to move a class; switch weeks to filter.",
    "第 12 周": "Week 12",
    "上一周": "Previous week",
    "下一周": "Next week",
    "周一": "Mon", "周二": "Tue", "周三": "Wed", "周四": "Thu", "周五": "Fri", "周六": "Sat", "周日": "Sun",

    /* 任务 */
    "把脑海里的事情放下来，LifeFlow 帮你理清优先级。": "Get it out of your head — LifeFlow sorts the priorities.",
    "＋ 添加任务": "＋ Add task",
    "用一句话告诉 LifeFlow": "Tell LifeFlow in one sentence",
    "AI 识别演示": "AI capture",
    "✧ 智能识别": "✧ Parse",
    "演示模板使用本地模拟识别，不会调用真实模型或产生 API 费用。": "Parsing runs locally by default; connect an API key to use a real model.",
    "全部任务": "All", "待完成": "Open", "已完成": "Done",
    "按截止日期": "By due date", "按优先级": "By priority", "按添加顺序": "By added order",
    "搜索任务…": "Search tasks…",
    "共 3 项任务": "3 tasks",

    /* 规划 */
    "让课程、任务和空闲时间形成一张可执行的日程。": "Turn classes, tasks and free time into a schedule you can follow.",
    "DEMO MODE · 模拟 AI": "SCHEDULER",
    "规划条件": "Plan settings",
    "根据你的真实安排生成建议": "Built from your real schedule",
    "选择规划日期": "Plan date",
    "今天希望完成": "Work on",
    "所有未完成任务": "All open tasks",
    "安排必要休息时间": "Include breaks",
    "每日学习上限": "Daily limit",
    "4 小时": "4 hours", "6 小时": "6 hours", "8 小时": "8 hours",
    "✧ 生成智能计划": "✧ Generate plan",
    "当前为前端演示算法。接入模型 API 后，可升级自然语言理解和个性化建议。": "Plans are computed locally. Connect an API key for AI suggestions.",
    "计划预览": "Plan preview",
    "等待生成你的今日安排": "No plan yet",
    "你的时间，值得认真安排": "Your time deserves a plan",
    "点击左侧按钮，生成一份清晰、可执行的日程建议。": "Generate a clear, workable schedule from the panel on the left.",
    "确认并保存计划 →": "Save this plan →",
    "计划动态调整": "Reschedule",
    "临时有事或任务没完成？试试重新安排。": "Something came up? Rebuild the plan.",
    "重新规划": "Reschedule",

    /* 统计 */
    "看见自己的节奏，也看见每一点进步。": "See your rhythm, and every bit of progress.",
    "实时统计": "Live",
    "本周完成率": "Completion",
    "稳步推进": "Keep going",
    "本周任务": "Tasks",
    "完成任务": "Completed",
    "本周累计": "This week",
    "专注时长": "Focus time",
    "连续规划": "Streak",
    "天": "days",
    "保持好习惯": "Keep the habit",
    "每周任务完成情况": "Tasks by weekday",
    "根据你当前的任务自动计算": "Computed from your tasks",
    "AI 本周小结": "Weekly summary",
    "根据真实任务生成": "From your real tasks",
    "✧ 生成": "✧ Generate",
    "下周建议": "Next week",

    /* 数据管理 */
    "数据管理": "Data",
    "数据保存在本机浏览器，换设备或清理缓存前请先备份": "Stored in this browser. Export a backup before switching devices.",
    "本地存储": "Local only",
    "⬇ 导出备份": "⬇ Export",
    "⬆ 导入备份": "⬆ Import",
    "↺ 恢复示例数据": "↺ Load demo data",
    "🗑 清空所有数据": "🗑 Clear all data",
    "导出后会得到一个 JSON 文件，包含任务、课表、周次和已保存的计划。": "A JSON file with tasks, timetable, week and saved plan.",

    /* 引导 */
    "欢迎使用 LifeFlow": "Welcome to LifeFlow",
    "用 AI 把课程、任务和空闲时间，编织成一份真正可执行的校园计划。": "Turn classes, tasks and free time into a campus plan you can actually follow.",
    "一眼看清今天的课程、待办和空闲时间": "Today's classes, tasks and free time at a glance",
    "拖拽调整课程，PDF 一键导入": "Drag classes, or import a PDF timetable",
    "一句话添加，AI 帮你识别": "Add a task in one sentence",
    "避开课程时间，自动排出日程": "Auto-schedule around your classes",
    "真实完成率与专注时长": "Real completion and focus stats",
    "💡 想要智能识别？点右上角": "Tip: tap AI at the top right",
    "按钮填入自己的 API Key 即可（不填也能用本地规则）。": "to use your own API key. Without one, local rules still work.",
    "下次不再显示": "Don't show again",
    "开始使用": "Get started",
    "选择语言": "Language",

    /* 弹窗 */
    "导入课表": "Import timetable",
    "课表还是空的": "No classes yet",
    "今天还没有安排": "Nothing scheduled yet",
    "先添加课程和任务，再生成属于你的日程。": "Add classes and tasks to build your day.",
    "去添加任务": "Add a task",
    "从教务系统 PDF 一键导入，或手动添加你的第一门课。": "Import from your school's PDF, or add your first class manually.",
    "上传教务系统导出的 PDF，或直接粘贴课表文字": "Upload a PDF exported from your school system, or paste the text",
    "选择 PDF 文件": "Choose PDF file",
    "支持文字版 PDF（扫描件无法识别，请改用下方粘贴）。": "Text-based PDFs only; scanned pages need pasting below.",
    "支持文字版 PDF。本地规则识别不出时，会自动调用已连接的 AI 解析；扫描件请改用下方粘贴。": "Text-based PDFs. If local rules fail, a connected AI model takes over; scanned pages need pasting below.",
    "或者粘贴课表文字": "Or paste timetable text",
    "解析": "Parse",
    "导入全部": "Import all",
    "✦ 用 AI 解析": "✦ Parse with AI",
    "文字版 PDF 用本地规则解析；识别不出时自动调用 AI。扫描件会渲染成图片，交给支持视觉的模型（如 qwen-vl-max、gpt-4o）识别。": "Text PDFs use local rules with AI fallback. Scanned pages are rendered as images for a vision-capable model (e.g. qwen-vl-max, gpt-4o).",
    "用已连接的 AI 解析 PDF": "Parse the PDF with your connected AI",
    "个人资料": "Profile",
    "仅保存在本机浏览器，用于个性化称呼": "Stored locally, used for greetings",
    "你的名字 / 昵称": "Your name / nickname",
    "取消": "Cancel",
    "保存": "Save",
    "AI 连接设置": "AI connection",
    "填入 DeepSeek API Key 后，任务识别与小结由模型生成": "Add your DeepSeek API key to use a real model",
    "API 地址（OpenAI 兼容）": "API base URL (OpenAI-compatible)",
    "默认 DeepSeek。也可以填 Kimi、通义、OpenAI 或本机 Ollama 的兼容地址。": "Defaults to DeepSeek. Any compatible endpoint works.",
    "模型名称": "Model",
    "Key 只保存在本机浏览器（localStorage），不会写进代码，也不会传给第三方。": "Your key stays in this browser's localStorage — never in the code.",
    "未连接，当前使用本地规则": "Not connected — using local rules",
    "清除 Key": "Clear key",
    "测试连接": "Test",
    "添加任务": "Add task",
    "补充信息后，AI 规划会据此排程": "Details help the planner schedule it",
    "任务名称": "Task name",
    "截止日期": "Due date",
    "预计时长（分钟）": "Duration (minutes)",
    "优先级": "Priority",
    "分类": "Category",
    "学习": "Study", "校园": "Campus", "生活": "Life",
    "保存任务": "Save task",
    "添加课程": "Add class",
    "填写课程基本信息": "Basic class info",
    "课程名称": "Class name",
    "星期": "Weekday",
    "地点": "Room",
    "开始时间": "Start",
    "结束时间": "End",
    "保存课程": "Save class",
    "关闭": "Close",
    "例如：dear student": "e.g. dear student",
    "例如：高数第三章作业": "e.g. Calculus homework",
    "例如：大学物理": "e.g. Physics",
    "教学楼 2-101": "Building 2-101",
    "例如：下午临时有事，高数作业没完成……": "e.g. Something came up, homework unfinished…",
    "例如：周五之前完成高数作业，预计需要 2 小时……": "e.g. Finish calculus by Friday, about 2 hours…",

    /* 新用户引导 */
    "开始使用（3 步）": "Get started in 3 steps",
    "还没有数据，按顺序完成下面三步": "No data yet — complete these three steps",
    "新用户": "New user",
    "导入或添加课表": "Import or add your timetable",
    "有教务系统 PDF 可直接导入": "Import the PDF from your school system",
    "添加第一个任务": "Add your first task",
    "一句话描述，AI 帮你拆解": "Describe it in one sentence",
    "生成今日计划": "Generate today's plan",
    "自动避开上课时间": "Automatically avoids class time"
  };

  let lang = (function () {
    try { return localStorage.getItem(LANG_KEY) || ((navigator.language || "zh").toLowerCase().indexOf("zh") === 0 ? "zh" : "en"); }
    catch (e) { return "zh"; }
  })();

  const originals = new WeakMap();

  function translate(text) {
    let out = text;
    // 长词优先，避免短词先替换导致长词失效
    Object.keys(ZH_TO_EN)
      .filter(k => out.indexOf(k) !== -1)
      .sort((a, b) => b.length - a.length)
      .forEach(k => { out = out.split(k).join(ZH_TO_EN[k]); });
    return out;
  }

  function apply() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (parent && /^(SCRIPT|STYLE|TEXTAREA)$/.test(parent.tagName)) continue;
      if (!originals.has(node)) originals.set(node, { src: node.nodeValue, out: node.nodeValue });
      const rec = originals.get(node);
      // 如果当前值与上次写出的值不同，说明应用自己更新了文案，刷新中文原文
      if (node.nodeValue !== rec.out) rec.src = node.nodeValue;
      const next = lang === "en" ? translate(rec.src) : rec.src;
      node.nodeValue = next;
      rec.out = next;
    }
    document.querySelectorAll("[placeholder],[title]").forEach(el => {
      if (el.dataset.origPh === undefined && el.placeholder !== undefined) el.dataset.origPh = el.placeholder;
      if (el.dataset.origTitle === undefined && el.title !== undefined) el.dataset.origTitle = el.title;
      if (el.placeholder !== undefined && el.dataset.origPh) {
        el.placeholder = lang === "en" ? translate(el.dataset.origPh) : el.dataset.origPh;
      }
      if (el.title && el.dataset.origTitle) {
        el.title = lang === "en" ? translate(el.dataset.origTitle) : el.dataset.origTitle;
      }
    });
    document.documentElement.lang = lang === "en" ? "en" : "zh-CN";
    document.documentElement.dataset.lang = lang;
    document.querySelectorAll("[data-lang-label]").forEach(b => {
      b.classList.toggle("active", b.dataset.langLabel === lang);
    });
  }

  function setLang(next) {
    lang = next === "en" ? "en" : "zh";
    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    apply();
  }

  window.LF_I18N = {
    get lang() { return lang; },
    setLang,
    apply,
    t: (zh) => (lang === "en" ? translate(zh) : zh)
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", apply);
  } else {
    apply();
  }
})();
