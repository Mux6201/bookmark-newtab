(() => {
  "use strict";

  const els = {
    clock: document.getElementById("clock"),
    date: document.getElementById("date"),
    search: document.getElementById("search"),
    searchCount: document.getElementById("searchCount"),
    searchIcon: document.querySelector(".search-icon"),
    tabs: document.getElementById("drawerTabs"),
    tabsVisible: document.getElementById("tabsVisible"),
    tabsMoreWrap: document.getElementById("tabsMoreWrap"),
    tabsMoreBtn: document.getElementById("tabsMoreBtn"),
    tabsMoreMenu: document.getElementById("tabsMoreMenu"),
    groups: document.getElementById("groups"),
    loading: document.getElementById("loadingState"),
    empty: document.getElementById("emptyState"),
    importBtn: document.getElementById("importBtn"),
    importFile: document.getElementById("importFile"),
    toast: document.getElementById("toast"),
    settingsBtn: document.getElementById("settingsBtn"),
    settingsOverlay: document.getElementById("settingsOverlay"),
    settingsClose: document.getElementById("settingsClose"),
    themeSegmented: Array.from(document.querySelectorAll("#themeSegmented button")),
    engineSelect: document.getElementById("engineSelect"),
    cnFontTrigger: document.getElementById("cnFontTrigger"),
    cnFontMenu: document.getElementById("cnFontMenu"),
    customEngineFields: document.getElementById("customEngineFields"),
    customEngineName: document.getElementById("customEngineName"),
    customEngineUrl: document.getElementById("customEngineUrl"),
    heatmapToggle: document.getElementById("heatmapToggle"),
    resetHeatBtn: document.getElementById("resetHeatBtn"),
    checkLinksBtn: document.getElementById("checkLinksBtn"),
    checkProgress: document.getElementById("checkProgress"),
    checkSummary: document.getElementById("checkSummary"),
    forceRecheckToggle: document.getElementById("forceRecheckToggle"),
    editModeBtn: document.getElementById("editModeBtn"),
    drawer: document.getElementById("drawer"),
    heatmapBtn: document.getElementById("heatmapBtn"),
    heatmapOverlay: document.getElementById("heatmapOverlay"),
    heatmapClose: document.getElementById("heatmapClose"),
    heatmapStats: document.getElementById("heatmapStats"),
    heatmapGrid: document.getElementById("heatmapGrid"),
    picksToggle: document.getElementById("picksToggle"),
  };

  const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

  const ENGINES = {
    google: { name: "Google", url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
    bing: { name: "必应", url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
    baidu: { name: "百度", url: (q) => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}` },
    duckduckgo: { name: "DuckDuckGo", url: (q) => `https://duckduckgo.com/?q=${encodeURIComponent(q)}` },
  };

  let allItems = [];      // {title, url, path: [folderTitle, ...]}
  let tabOrder = [];       // ['全部', top folder titles..., '常用']
  let activeTab = "全部";
  let toastTimer = null;
  let currentTabButtons = [];   // the live tab-button elements; reused by fitTabs on resize

  /* ---------------- clock ---------------- */
  function tickClock() {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    els.clock.textContent = `${hh}:${mm}`;
    els.date.textContent =
      `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${WEEKDAYS[now.getDay()]}`;
  }
  tickClock();
  setInterval(tickClock, 15000);

  /* ---------------- theme ---------------- */
  let themeMode = localStorage.getItem("bm_theme") || "system";
  const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

  /* accent colors: each has a light and a dark variant so the chosen color
     stays readable on both themes. Only --stamp is swapped at runtime; the
     strong/soft derivatives are computed in CSS via color-mix. */
  const ACCENTS = {
    orange: { name: "印鉴橙", light: "#b5762a", dark: "#dc9d4f" },
    green:  { name: "墨绿",   light: "#3e5c55", dark: "#7fb4a6" },
    blue:   { name: "靛蓝",   light: "#3d5a80", dark: "#8db4e0" },
    red:    { name: "砖红",   light: "#a04830", dark: "#e0906f" },
    purple: { name: "紫",     light: "#6a4c93", dark: "#b39ae0" },
    teal:   { name: "青绿",   light: "#2e6e5f", dark: "#7cc4b0" },
  };
  const storedAccent = localStorage.getItem("bm_accent");
  let currentAccent = ACCENTS[storedAccent] ? storedAccent : "orange";
  const accentSwatches = Array.from(document.querySelectorAll(".accent-swatch"));

  function applyAccent(accent, effectiveTheme) {
    const a = ACCENTS[accent];
    if (!a) return;
    const dark = effectiveTheme === "dark";
    document.documentElement.style.setProperty("--stamp", dark ? a.dark : a.light);
    accentSwatches.forEach((btn) => btn.classList.toggle("active", btn.dataset.accent === accent));
  }

  function syncSwatchColors(effectiveTheme) {
    const dark = effectiveTheme === "dark";
    accentSwatches.forEach((btn) => {
      const a = ACCENTS[btn.dataset.accent];
      if (a) btn.style.background = dark ? a.dark : a.light;
    });
  }

  accentSwatches.forEach((btn) => {
    btn.addEventListener("click", () => {
      currentAccent = btn.dataset.accent;
      localStorage.setItem("bm_accent", currentAccent);
      const effective = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      applyAccent(currentAccent, effective);
    });
  });

  function applyTheme(mode) {
    const effective = mode === "system" ? (darkQuery.matches ? "dark" : "light") : mode;
    document.documentElement.setAttribute("data-theme", effective);
    els.themeSegmented.forEach((btn) => btn.classList.toggle("active", btn.dataset.mode === mode));
    syncSwatchColors(effective);
    applyAccent(currentAccent, effective);
  }

  applyTheme(themeMode);
  darkQuery.addEventListener("change", () => {
    if (themeMode === "system") applyTheme("system");
  });

  els.themeSegmented.forEach((btn) => {
    btn.addEventListener("click", () => {
      themeMode = btn.dataset.mode;
      localStorage.setItem("bm_theme", themeMode);
      applyTheme(themeMode);
    });
  });

  /* ---------------- search engine ---------------- */
  let currentEngine = localStorage.getItem("bm_engine") || "google";
  let customEngine = safeParse(localStorage.getItem("bm_custom_engine"), { name: "", urlTemplate: "" });

  els.engineSelect.value = currentEngine;
  els.customEngineName.value = customEngine.name;
  els.customEngineUrl.value = customEngine.urlTemplate;
  toggleCustomFields();
  updateSearchPlaceholder();

  els.engineSelect.addEventListener("change", () => {
    currentEngine = els.engineSelect.value;
    localStorage.setItem("bm_engine", currentEngine);
    toggleCustomFields();
    updateSearchPlaceholder();
  });

  [els.customEngineName, els.customEngineUrl].forEach((input) => {
    input.addEventListener("input", () => {
      customEngine = {
        name: els.customEngineName.value.trim(),
        urlTemplate: els.customEngineUrl.value.trim(),
      };
      localStorage.setItem("bm_custom_engine", JSON.stringify(customEngine));
      updateSearchPlaceholder();
    });
  });

  function toggleCustomFields() {
    els.customEngineFields.hidden = currentEngine !== "custom";
  }

  function engineDisplayName() {
    if (currentEngine === "custom") return customEngine.name || "自定义引擎";
    return ENGINES[currentEngine]?.name || "搜索引擎";
  }

  function updateSearchPlaceholder() {
    els.search.placeholder = `在书签里查找,回车用 ${engineDisplayName()} 搜索…`;
  }

  function buildSearchUrl(query) {
    if (currentEngine === "custom" && customEngine.urlTemplate) {
      return customEngine.urlTemplate.includes("{q}")
        ? customEngine.urlTemplate.replace("{q}", encodeURIComponent(query))
        : customEngine.urlTemplate + encodeURIComponent(query);
    }
    const engine = ENGINES[currentEngine] || ENGINES.google;
    return engine.url(query);
  }

  /* ---------------- CJK font picker (scanned from the system) ---------------- */
  const CN_CANDIDATES = [
    { id: "default",   label: "跟随系统", font: null, stack: '"Sarasa Term SC Nerd", "Sarasa Gothic SC", "Sarasa Mono SC", "Microsoft YaHei", "PingFang SC", "Noto Sans CJK SC", system-ui, sans-serif' },
    { id: "sarasaterm",label: "更纱黑体 Term SC Nerd", font: "Sarasa Term SC Nerd", stack: '"Sarasa Term SC Nerd", "Sarasa Gothic SC", "Microsoft YaHei", sans-serif' },
    { id: "yahei",     label: "微软雅黑", font: "Microsoft YaHei", stack: '"Microsoft YaHei", "PingFang SC", sans-serif' },
    { id: "simhei",    label: "黑体",     font: "SimHei",    stack: '"SimHei", "Microsoft YaHei", sans-serif' },
    { id: "simsun",    label: "宋体",     font: "SimSun",    stack: '"SimSun", "Source Han Serif SC", "SimHei", serif' },
    { id: "nsimsun",   label: "新宋体",   font: "NSimSun",   stack: '"NSimSun", "SimSun", serif' },
    { id: "kaiti",     label: "楷体",     font: "KaiTi",     stack: '"KaiTi", "STKaiti", "Microsoft YaHei", serif' },
    { id: "fangsong",  label: "仿宋",     font: "FangSong",  stack: '"FangSong", "STFangsong", serif' },
    { id: "lisu",      label: "隶书",     font: "LiSu",      stack: '"LiSu", serif' },
    { id: "youyuan",   label: "幼圆",     font: "YouYuan",   stack: '"YouYuan", "Microsoft YaHei", sans-serif' },
    { id: "dengxian",  label: "等线",     font: "DengXian",  stack: '"DengXian", "Microsoft YaHei", sans-serif' },
    { id: "sourcehan", label: "思源黑体", font: "Source Han Sans SC", stack: '"Source Han Sans SC", "Noto Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif' },
    { id: "notosanssc", label: "Noto Sans SC", font: "Noto Sans SC", stack: '"Noto Sans SC", "Source Han Sans SC", "Microsoft YaHei", sans-serif' },
    { id: "notosans",  label: "Noto Sans CJK SC", font: "Noto Sans CJK SC", stack: '"Noto Sans CJK SC", "Source Han Sans SC", sans-serif' },
    { id: "serif",     label: "思源宋体", font: "Source Han Serif SC", stack: '"Source Han Serif SC", "Noto Serif SC", "Noto Serif CJK SC", serif' },
    { id: "notoserifsc", label: "Noto Serif SC", font: "Noto Serif SC", stack: '"Noto Serif SC", "Source Han Serif SC", "SimSun", serif' },
    { id: "sarasa",    label: "更纱黑体", font: "Sarasa Gothic SC", stack: '"Sarasa Gothic SC", "Sarasa Mono SC", "Microsoft YaHei", sans-serif' },
    { id: "sarasamono",label: "更纱等宽", font: "Sarasa Mono SC", stack: '"Sarasa Mono SC", "Sarasa Gothic SC", monospace' },
    { id: "pingfang",  label: "苹方",     font: "PingFang SC", stack: '"PingFang SC", "Microsoft YaHei", sans-serif' },
    { id: "hiragino",  label: "冬青黑体", font: "Hiragino Sans GB", stack: '"Hiragino Sans GB", "PingFang SC", sans-serif' },
  ];

  let cnFont = localStorage.getItem("bm_cn_font") || "default";

  function applyCnFont() {
    const cand = CN_CANDIDATES.find((c) => c.id === cnFont);
    document.documentElement.style.setProperty("--font-cn", cand ? cand.stack : CN_CANDIDATES[0].stack);
  }
  applyCnFont();

  function cnFontLabel(id) {
    const cand = CN_CANDIDATES.find((c) => c.id === id);
    return cand ? cand.label : CN_CANDIDATES[0].label;
  }

  /* only list fonts that are actually installed on this machine */
  function scanCjkFonts() {
    const available = [];
    CN_CANDIDATES.forEach((c) => {
      if (!c.font) { available.push(c); return; } // "跟随系统" always available
      try {
        if (document.fonts.check(`12px "${c.font}"`)) available.push(c);
      } catch { /* skip */ }
    });
    return available;
  }

  function populateCnFontSelect() {
    const available = scanCjkFonts();
    // if the saved choice isn't installed anymore, fall back
    if (!available.some((c) => c.id === cnFont)) {
      cnFont = "default";
      applyCnFont();
    }
    els.cnFontTrigger.textContent = cnFontLabel(cnFont);

    const frag = document.createDocumentFragment();
    available.forEach((c) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.font = c.id;
      btn.textContent = c.label;
      // render each item in its own font — the list is its own live preview
      if (c.font) btn.style.fontFamily = c.stack;
      if (c.id === cnFont) btn.classList.add("active");
      btn.addEventListener("click", () => {
        cnFont = c.id;
        localStorage.setItem("bm_cn_font", cnFont);
        applyCnFont();
        els.cnFontTrigger.textContent = cnFontLabel(cnFont);
        els.cnFontMenu.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.font === cnFont));
        els.cnFontMenu.hidden = true;
      });
      frag.appendChild(btn);
    });
    els.cnFontMenu.innerHTML = "";
    els.cnFontMenu.appendChild(frag);
  }
  populateCnFontSelect();

  els.cnFontTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    els.cnFontMenu.hidden = !els.cnFontMenu.hidden;
  });
  document.addEventListener("click", (e) => {
    if (!els.cnFontTrigger.closest(".cn-font-picker").contains(e.target)) {
      els.cnFontMenu.hidden = true;
    }
  });

  /* ---------------- click heatmap ---------------- */
  let heatmapEnabled = localStorage.getItem("bm_heatmap") !== "off"; // default on
  let clickCounts = safeParse(localStorage.getItem("bm_clicks"), {});
  // per-day totals { "YYYY-MM-DD": count } for the github-style contribution graph
  let dailyClicks = safeParse(localStorage.getItem("bm_daily_clicks"), {});

  function dayKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  els.heatmapToggle.checked = heatmapEnabled;
  els.heatmapToggle.addEventListener("change", () => {
    heatmapEnabled = els.heatmapToggle.checked;
    localStorage.setItem("bm_heatmap", heatmapEnabled ? "on" : "off");
    rerenderCurrentView();
  });

  els.resetHeatBtn.addEventListener("click", () => {
    if (!confirm("确定清空所有书签的点击次数统计吗?")) return;
    clickCounts = {};
    dailyClicks = {};
    localStorage.setItem("bm_clicks", "{}");
    localStorage.setItem("bm_daily_clicks", "{}");
    showToast("已清空点击统计");
    buildTabOrder(); // folder order depends on click totals — rebuild
    renderTabs();
    rerenderCurrentView();
  });

  function recordClick(url) {
    clickCounts[url] = (clickCounts[url] || 0) + 1;
    localStorage.setItem("bm_clicks", JSON.stringify(clickCounts));
    const key = dayKey(new Date());
    dailyClicks[key] = (dailyClicks[key] || 0) + 1;
    localStorage.setItem("bm_daily_clicks", JSON.stringify(dailyClicks));
  }

  /* ---------------- most-frequent picks row (settings + hide/restore) ---------------- */
  let picksEnabled = localStorage.getItem("bm_picks_enabled") !== "off"; // default on
  let hiddenPicks = safeParse(localStorage.getItem("bm_picks_hidden"), []); // urls hidden from the picks group

  els.picksToggle.checked = picksEnabled;
  els.picksToggle.addEventListener("change", () => {
    picksEnabled = els.picksToggle.checked;
    localStorage.setItem("bm_picks_enabled", picksEnabled ? "on" : "off");
    rerenderCurrentView();
  });

  function heatLevel(count) {
    // finer-grained: 7 steps so even a single click shows, and frequent
    // bookmarks visibly climb in tint without a big jump at any threshold.
    if (count >= 22) return 42;
    if (count >= 16) return 36;
    if (count >= 11) return 30;
    if (count >= 7) return 24;
    if (count >= 4) return 18;
    if (count >= 2) return 12;
    if (count >= 1) return 6;
    return 0;
  }

  function safeParse(str, fallback) {
    try { return str ? JSON.parse(str) : fallback; }
    catch { return fallback; }
  }

  /* ---------------- github-style daily heatmap ---------------- */
  const HEAT_WEEKS = 15; // ~105 days shown

  function heatmapLevel(count) {
    if (count >= 20) return 4;
    if (count >= 10) return 3;
    if (count >= 5) return 2;
    if (count >= 1) return 1;
    return 0;
  }

  function renderHeatmap() {
    const today = new Date();
    // monday of the current week, then back up to the first column
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const start = new Date(monday);
    start.setDate(monday.getDate() - (HEAT_WEEKS - 1) * 7);

    const cells = [];
    let total = 0, activeDays = 0, maxDay = 0;
    for (let w = 0; w < HEAT_WEEKS; w++) {
      for (let d = 0; d < 7; d++) {
        const date = new Date(start);
        date.setDate(start.getDate() + w * 7 + d);
        const count = dailyClicks[dayKey(date)] || 0;
        total += count;
        if (count > 0) activeDays++;
        maxDay = Math.max(maxDay, count);
        cells.push({ date, count });
      }
    }

    els.heatmapGrid.innerHTML = "";
    cells.forEach(({ date, count }) => {
      const cell = document.createElement("i");
      cell.className = "heat-cell";
      const isFuture = date > today;
      cell.dataset.level = isFuture ? "0" : String(heatmapLevel(count));
      if (!isFuture) {
        cell.title = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日 · ${count} 次`;
      }
      els.heatmapGrid.appendChild(cell);
    });

    els.heatmapStats.textContent =
      `近 ${HEAT_WEEKS} 周 · 共 ${total} 次点击 · ${activeDays} 个活跃日 · 单日最高 ${maxDay} 次`;
  }

  els.heatmapBtn.addEventListener("click", () => {
    renderHeatmap();
    els.heatmapOverlay.hidden = false;
  });
  els.heatmapClose.addEventListener("click", () => { els.heatmapOverlay.hidden = true; });
  els.heatmapOverlay.addEventListener("click", (e) => {
    if (e.target === els.heatmapOverlay) els.heatmapOverlay.hidden = true;
  });

  /* ---------------- link checker ---------------- */
  // url -> { state: 'ok' | 'dead', code, checkedAt }
  let linkStatus = safeParse(localStorage.getItem("bm_link_status"), {});
  let checking = false;

  const LINK_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours — recent results are reused, not rechecked
  const CHECK_CONCURRENCY = 10;
  const CHECK_TIMEOUT_MS = 8000;
  const SAVE_EVERY = 20; // write to localStorage every N results so a run can be interrupted safely

  function attemptRequest(url, method) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = (state, code) => {
        if (settled) return;
        settled = true;
        clearTimeout(hardTimer);
        if (chrome.webRequest) {
          chrome.webRequest.onCompleted.removeListener(onCompleted);
          chrome.webRequest.onErrorOccurred.removeListener(onErrorOccurred);
        }
        resolve({ state, code });
      };

      function onCompleted(details) {
        if (details.url !== url) return;
        if (details.statusCode >= 200 && details.statusCode < 400) finish("ok", details.statusCode);
        else finish("dead", details.statusCode);
      }
      function onErrorOccurred(details) {
        if (details.url !== url) return;
        finish("dead");
      }

      if (chrome.webRequest) {
        chrome.webRequest.onCompleted.addListener(onCompleted, { urls: ["<all_urls>"] });
        chrome.webRequest.onErrorOccurred.addListener(onErrorOccurred, { urls: ["<all_urls>"] });
      }

      const controller = new AbortController();
      const hardTimer = setTimeout(() => {
        controller.abort();
        finish("dead");
      }, CHECK_TIMEOUT_MS);

      fetch(url, { method, mode: "no-cors", cache: "no-store", signal: controller.signal })
        .catch(() => finish("dead"));
    });
  }

  async function checkOneUrl(url) {
    // HEAD is cheap and enough for most servers; only fall back to GET when
    // the server doesn't support HEAD (405/501), to save time and bandwidth.
    const head = await attemptRequest(url, "HEAD");
    if (head.state === "dead" && (head.code === 405 || head.code === 501)) {
      return attemptRequest(url, "GET");
    }
    return head;
  }

  function persistLinkStatus() {
    localStorage.setItem("bm_link_status", JSON.stringify(linkStatus));
  }
  window.addEventListener("beforeunload", persistLinkStatus);

  async function runLinkCheck() {
    if (checking) return;
    const allUrls = Array.from(new Set(allItems.map((i) => i.url).filter((u) => /^https?:/i.test(u))));
    if (allUrls.length === 0) {
      showToast("没有可检测的书签");
      return;
    }

    const forceRecheck = els.forceRecheckToggle.checked;
    const now = Date.now();
    const toCheck = forceRecheck
      ? allUrls
      : allUrls.filter((u) => {
          const cached = linkStatus[u];
          return !cached || now - (cached.checkedAt || 0) > LINK_CACHE_TTL_MS;
        });
    const skipped = allUrls.length - toCheck.length;

    if (toCheck.length === 0) {
      showToast("所有链接都在 6 小时缓存内,无需重新检测");
      return;
    }

    checking = true;
    els.checkLinksBtn.disabled = true;
    els.checkLinksBtn.textContent = "检测中…";

    let done = 0;
    let sinceSave = 0;
    const total = toCheck.length;
    const progressSuffix = skipped > 0 ? `(另有 ${skipped} 条在缓存有效期内,已跳过)` : "";
    els.checkProgress.textContent = `检测中 0 / ${total} ${progressSuffix}`;

    let idx = 0;
    async function worker() {
      while (idx < toCheck.length) {
        const url = toCheck[idx++];
        const result = await checkOneUrl(url);
        linkStatus[url] = { state: result.state, code: result.code, checkedAt: Date.now() };
        done++;
        sinceSave++;
        els.checkProgress.textContent = `检测中 ${done} / ${total} ${progressSuffix}`;
        if (sinceSave >= SAVE_EVERY) {
          sinceSave = 0;
          persistLinkStatus();
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CHECK_CONCURRENCY, toCheck.length) }, worker));

    persistLinkStatus();
    checking = false;
    els.checkLinksBtn.disabled = false;
    els.checkLinksBtn.textContent = "开始检测";
    els.checkProgress.textContent = "";
    updateCheckSummary();
    const deadCount = Object.values(linkStatus).filter((s) => s.state === "dead").length;
    showToast(deadCount > 0 ? `检测完成,发现 ${deadCount} 个可能失效的链接` : "检测完成,没有发现失效链接");
    rerenderCurrentView();
  }

  function updateCheckSummary() {
    const entries = Object.values(linkStatus);
    if (entries.length === 0) {
      els.checkSummary.textContent = "还没有检测过。";
      return;
    }
    const lastChecked = Math.max(...entries.map((e) => e.checkedAt || 0));
    const deadCount = entries.filter((e) => e.state === "dead").length;
    const when = new Date(lastChecked);
    const hh = String(when.getHours()).padStart(2, "0");
    const mm = String(when.getMinutes()).padStart(2, "0");
    els.checkSummary.textContent =
      `上次检测:${when.getMonth() + 1}月${when.getDate()}日 ${hh}:${mm} · ${deadCount} 个可能失效`;
  }
  updateCheckSummary();

  els.checkLinksBtn.addEventListener("click", runLinkCheck);

  /* ---------------- edit mode ---------------- */
  let editMode = false; // intentionally not persisted — always starts off
  let editingId = null; // id of the bookmark currently showing its inline edit form

  /* Revealing action buttons on hundreds of cards in one go reflows the whole
     grid. Instead, cards get .edit-active in batches (a chunk per frame) so
     the toggle stays smooth; newly rendered cards get it directly. */
  const EDIT_ACTIONS_CHUNK = 120;
  let editActionToken = 0;

  function revealEditActions() {
    const token = ++editActionToken;
    const cards = Array.from(els.groups.querySelectorAll(".bm-card:not(.edit-active)"));
    let idx = 0;
    function pump() {
      if (token !== editActionToken) return;
      const end = Math.min(idx + EDIT_ACTIONS_CHUNK, cards.length);
      for (; idx < end; idx++) cards[idx].classList.add("edit-active");
      if (idx < cards.length) requestAnimationFrame(pump);
    }
    pump();
  }

  function hideEditActions() {
    const token = ++editActionToken;
    const cards = Array.from(els.groups.querySelectorAll(".bm-card.edit-active"));
    let idx = 0;
    function pump() {
      if (token !== editActionToken) return;
      const end = Math.min(idx + EDIT_ACTIONS_CHUNK, cards.length);
      for (; idx < end; idx++) cards[idx].classList.remove("edit-active");
      if (idx < cards.length) requestAnimationFrame(pump);
    }
    pump();
  }

  function setEditMode(on) {
    editMode = on;
    els.editModeBtn.classList.toggle("active", on);
    els.editModeBtn.title = on ? "退出编辑模式" : "编辑模式:改名 / 删除书签";
    document.body.classList.toggle("edit-mode", on); // is-dead / pick-hidden treatments

    if (on) {
      revealEditActions();
    } else {
      hideEditActions();
      stopEditing(); // collapse any open inline edit form back to its card
    }
    // The picks group is rebuilt to reveal hidden picks — deferred one frame
    // so the edit-mode toggle itself paints immediately.
    requestAnimationFrame(refreshPicksGroup);
  }

  els.editModeBtn.addEventListener("click", () => setEditMode(!editMode));

  function startEditing(id) {
    if (editingId) stopEditing();
    editingId = id;
    const card = els.groups.querySelector(`.bm-card[data-id="${CSS.escape(String(id))}"]`);
    if (!card) return;
    const item = allItems.find((i) => i.id === id);
    if (!item) return;
    card.replaceWith(buildEditForm(item, { isPinned: card.classList.contains("is-pinned") }));
  }

  function stopEditing() {
    editingId = null;
    const form = els.groups.querySelector(".bm-edit-form");
    if (!form) return;
    const item = allItems.find((i) => i.id === form.dataset.id);
    if (!item) return;
    form.replaceWith(buildCard(item, { isPinned: form.dataset.pinned === "1" }));
  }

  async function deleteBookmark(item) {
    if (!confirm(`确定删除书签「${item.title}」吗?此操作不可撤销。`)) return;
    try {
      await chrome.bookmarks.remove(item.id);
      showToast("已删除");
    } catch (err) {
      console.error(err);
      showToast("删除失败,可能这条书签已经被删过了");
    }
  }

  async function saveBookmarkEdit(item, newTitle, newUrl) {
    const title = newTitle.trim();
    const url = newUrl.trim();
    if (!title || !url) {
      showToast("标题和网址不能为空");
      return;
    }
    try {
      await chrome.bookmarks.update(item.id, { title, url });
      showToast("已保存修改");
      stopEditing();
    } catch (err) {
      console.error(err);
      showToast("保存失败,请确认网址格式正确(需要带 http:// 或 https://)");
    }
  }

  /* ---------------- settings modal ---------------- */
  els.settingsBtn.addEventListener("click", () => { els.settingsOverlay.hidden = false; });
  els.settingsClose.addEventListener("click", closeSettings);
  els.settingsOverlay.addEventListener("click", (e) => {
    if (e.target === els.settingsOverlay) closeSettings();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (!els.settingsOverlay.hidden) closeSettings();
    if (!els.heatmapOverlay.hidden) els.heatmapOverlay.hidden = true;
  });
  function closeSettings() { els.settingsOverlay.hidden = true; }

  function rerenderCurrentView() {
    if (els.search.value.trim()) runSearch();
    else renderActiveTab();
  }

  /* ---------------- toast ---------------- */
  function showToast(msg) {
    clearTimeout(toastTimer);
    els.toast.textContent = msg;
    els.toast.hidden = false;
    toastTimer = setTimeout(() => { els.toast.hidden = true; }, 3200);
  }

  /* ---------------- data loading ---------------- */
  function walkTree(node, path, out) {
    (node.children || []).forEach((child) => {
      if (child.url) {
        out.push({ id: child.id, title: child.title || child.url, url: child.url, path: path.slice() });
      } else if (child.children) {
        walkTree(child, path.concat(child.title), out);
      }
    });
  }

  let hasLoadedOnce = false;

  async function loadBookmarks() {
    if (!hasLoadedOnce) els.loading.hidden = false;
    try {
      const tree = await chrome.bookmarks.getTree();
      const roots = tree[0].children || [];
      const items = [];
      // walk every special root (Bookmarks Bar, Other Bookmarks, Mobile Bookmarks)
      // path starts empty so direct children land in the "常用" bucket
      roots.forEach((root) => walkTree(root, [], items));
      allItems = items;
      buildTabOrder();
      renderTabs();
      renderActiveTab();
    } catch (err) {
      showToast("读取书签失败,请确认扩展已获得书签权限");
      console.error(err);
    } finally {
      els.loading.hidden = true;
      hasLoadedOnce = true;
    }
  }

  function groupClickTotal(tabKey) {
    let total = 0;
    allItems.forEach((item) => {
      if ((item.path[0] || "常用") === tabKey && !hiddenPicks.includes(item.url)) {
        total += clickCounts[item.url] || 0;
      }
    });
    return total;
  }

  function buildTabOrder() {
    const seen = new Map(); // key -> first index for stable order
    allItems.forEach((item) => {
      const key = item.path[0] || "常用";
      if (!seen.has(key)) seen.set(key, seen.size);
    });
    const folders = Array.from(seen.keys());
    // folders sort by total clicks inside them, most-clicked first;
    // ties keep their first-seen order
    folders.sort((a, b) => {
      const ta = groupClickTotal(a);
      const tb = groupClickTotal(b);
      if (ta !== tb) return tb - ta;
      return seen.get(a) - seen.get(b);
    });
    tabOrder = ["全部", ...folders];
    if (!tabOrder.includes(activeTab)) activeTab = "全部";
  }

  function countFor(tabKey) {
    if (tabKey === "全部") return allItems.length;
    return allItems.filter((i) => (i.path[0] || "常用") === tabKey).length;
  }

  /* ---------------- rendering ---------------- */
  function makeTabButton(key) {
    const btn = document.createElement("button");
    btn.className = "tab-btn" + (key === activeTab ? " active" : "");
    btn.type = "button";
    btn.dataset.key = key;
    btn.innerHTML = `${escapeHtml(key)}<span class="count">${countFor(key)}</span>`;
    btn.addEventListener("click", () => selectTab(key));
    return btn;
  }

  function selectTab(key) {
    activeTab = key;
    els.search.value = "";
    closeTabsMenu();
    renderTabs();
    renderActiveTab();
  }

  function closeTabsMenu() { els.tabsMoreMenu.hidden = true; }

  function renderTabs() {
    els.tabsVisible.innerHTML = "";
    els.tabsMoreMenu.innerHTML = "";
    els.tabsMoreWrap.hidden = true;
    closeTabsMenu();

    const buttons = tabOrder.map(makeTabButton);
    currentTabButtons = buttons;

    // measure on the next frame, once the browser has laid these out
    requestAnimationFrame(() => fitTabs(buttons));
  }

  /* Keep the tab bar's right edge aligned with the drawer body's content box.
     The drawer reserves space for its scrollbar on the right, so we mirror that
     inset on the tabs; otherwise the two rows look misaligned. */
  function syncScrollbarInset() {
    const sbw = els.drawer.offsetWidth - els.drawer.clientWidth;
    els.tabs.style.marginRight = sbw > 0 ? `${sbw}px` : "";
  }

  function innerWidth(el) {
    const cs = getComputedStyle(el);
    return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  }

  function fitTabs(buttons) {
    closeTabsMenu();
    els.tabsMoreMenu.innerHTML = "";
    els.tabsMoreWrap.hidden = true;
    els.tabsVisible.innerHTML = "";

    // Re-attach every button to the visible row BEFORE measuring. Detached
    // elements report offsetWidth === 0, which would make everything look like
    // it fits and hide the "更多" button forever. Re-attaching first keeps the
    // widths real, and makes this function idempotent so it works on resize in
    // both directions (tabs return from the menu when the window grows).
    buttons.forEach((b) => els.tabsVisible.appendChild(b));
    if (buttons.length === 0) return;

    syncScrollbarInset();

    const gap = 6;        // must match the .drawer-tabs gap
    const minMore = 110;  // estimated natural width of the "更多" button (auto-sized now, text + padding)
    const available = innerWidth(els.tabs); // room for tabs + the "more" button + the gap between

    const widths = buttons.map((b) => b.offsetWidth);

    // Everything fits without collapsing? Show all, left-aligned.
    const totalNatural = widths.reduce((a, w) => a + w, 0) + gap * Math.max(0, buttons.length - 1);
    if (totalNatural <= available) return;

    // Fit as many tabs as possible while leaving room for the "more" button
    // (which now sizes to its own content — no longer stretches to fill the row).
    let k = 0;
    let used = 0;
    for (let i = 0; i < buttons.length; i++) {
      // space for the first (i+1) tabs + gaps between them and to "more" + min "more"
      if (used + widths[i] + (i + 1) * gap + minMore <= available) {
        used += widths[i];
        k = i + 1;
      } else {
        break;
      }
    }
    if (k <= 0) k = 1; // always keep at least one tab visible

    // Keep the active tab on screen even if it would otherwise collapse —
    // swap it into the visible slice.
    const activeIndex = tabOrder.indexOf(activeTab);
    if (activeIndex >= k) {
      const tmp = buttons[k - 1];
      buttons[k - 1] = buttons[activeIndex];
      buttons[activeIndex] = tmp;
    }

    // Rebuild from scratch: visible slice into the row, the rest into the menu.
    els.tabsVisible.innerHTML = "";
    buttons.slice(0, k).forEach((b) => els.tabsVisible.appendChild(b));

    const overflowButtons = buttons.slice(k);
    overflowButtons.forEach((btn) => {
      const menuBtn = document.createElement("button");
      menuBtn.type = "button";
      if (btn.classList.contains("active")) menuBtn.classList.add("active");
      menuBtn.innerHTML = btn.innerHTML;
      menuBtn.addEventListener("click", () => selectTab(btn.dataset.key));
      els.tabsMoreMenu.appendChild(menuBtn);
    });

    els.tabsMoreBtn.textContent = `更多 (${overflowButtons.length}) ▾`;
    els.tabsMoreWrap.hidden = false; // .tab-more-btn flex-grows to fill the rest
  }

  els.tabsMoreBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    els.tabsMoreMenu.hidden = !els.tabsMoreMenu.hidden;
  });
  document.addEventListener("click", (e) => {
    if (!els.tabsMoreWrap.hidden && !els.tabsMoreWrap.contains(e.target)) closeTabsMenu();
  });

  // Re-flow the tab bar whenever its width actually changes (window resize,
  // zoom, devtools dock, etc). We observe the bar itself rather than the window
  // so the recompute fires right after layout — no 150ms lag, no button rebuild,
  // and the "更多" button can never sit wide enough to cover the visible tabs.
  let roScheduled = false;
  const tabResizeObserver = new ResizeObserver(() => {
    if (roScheduled) return;
    roScheduled = true;
    requestAnimationFrame(() => {
      roScheduled = false;
      if (currentTabButtons.length) fitTabs(currentTabButtons);
    });
  });
  tabResizeObserver.observe(els.tabs);

  function groupItems(items, depth) {
    // depth: which path index to group by (0 for "全部" view, 1 for a specific folder tab)
    const groups = new Map();
    items.forEach((item) => {
      const key = item.path[depth] || "常用";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    return groups;
  }

  function faviconUrl(url) {
    return `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`;
  }

  /* --- favicon fallback to a letter tile ---
     Two paths lead to a site without a real favicon:
       1. the _favicon request fails outright (bad scheme, network error) → error event
       2. Chrome returns its built-in gray globe with HTTP 200 (no error fires!)
     So besides the error handler we also probe the loaded pixels: an image that
     is essentially grayscale is the default globe → swap in a letter tile. */
  function letterTileDataUri(img) {
    let letter = "?";
    try {
      const pageUrl = new URL(decodeURIComponent(img.src)).searchParams.get("pageUrl");
      if (pageUrl) letter = (new URL(pageUrl).hostname.replace(/^www\./, "")[0] || "?").toUpperCase();
    } catch { /* keep "?" */ }
    const dark = document.documentElement.getAttribute("data-theme") === "dark";
    const bg = dark ? "#2c3028" : "#ebebe1";
    const fg = dark ? "#dc9d4f" : "#b5762a";
    return "data:image/svg+xml;utf8," + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" rx="8" fill="${bg}"/><text x="16" y="16" font-family="sans-serif" font-size="20" font-weight="600" text-anchor="middle" dominant-baseline="central" fill="${fg}">${letter}</text></svg>`
    );
  }

  function replaceWithLetterTile(img) {
    if (img.dataset.fallback) return;
    img.dataset.fallback = "1";
    img.src = letterTileDataUri(img);
  }

  // error events don't bubble — capture on document instead
  document.addEventListener("error", (e) => {
    const img = e.target;
    if (!img || img.tagName !== "IMG") return;
    replaceWithLetterTile(img);
  }, true);

  /* Instead of guessing the default icon's shape, ask Chrome for its own default:
     _favicon returns its built-in placeholder for any URL without a real
     favicon, so a request to a known-nonexistent domain gives us that
     placeholder image. We hash its pixels once and compare every loaded
     favicon against it. Robust against Chrome redesigning the placeholder
     and against monochrome / coloured real icons. */
  let defaultIconData = null; // Uint8ClampedArray of the normalized 16×16 default

  async function captureDefaultIcon() {
    // skip in non-extension contexts (preview.html runs as file://)
    if (!chrome.runtime?.id || location.protocol === "file:") return;
    try {
      const url = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent("https://no-favicon-for-test.invalid/")}&size=32`;
      const blob = await (await fetch(url)).blob();
      const objUrl = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 16; canvas.height = 16;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, 16, 16);
        defaultIconData = ctx.getImageData(0, 0, 16, 16).data;
        URL.revokeObjectURL(objUrl);
        // Re-check every already-loaded favicon against the captured default.
        // Deliberately NOT a full rerender: rebuilding the drawer would reset
        // scroll position and re-request every icon (visible flicker).
        document.querySelectorAll(".bm-favicon").forEach((fav) => {
          if (!fav.dataset.fallback && isLikelyDefaultFavicon(fav)) replaceWithLetterTile(fav);
        });
      };
      img.onerror = () => URL.revokeObjectURL(objUrl);
      img.src = objUrl;
    } catch { /* leave defaultIconData null */ }
  }
  captureDefaultIcon();

  function isLikelyDefaultFavicon(img) {
    if (!defaultIconData) return false; // haven't captured the default yet — be safe
    try {
      const w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h || w > 64 || h > 64) return false;
      const canvas = document.createElement("canvas");
      canvas.width = 16; canvas.height = 16;
      const ctx = canvas.getContext("2d");
      if (!ctx) return false;
      ctx.drawImage(img, 0, 0, 16, 16);
      const data = ctx.getImageData(0, 0, 16, 16).data;
      let diff = 0;
      for (let i = 0; i < defaultIconData.length; i += 4) {
        diff += Math.abs(defaultIconData[i] - data[i]);
        diff += Math.abs(defaultIconData[i + 1] - data[i + 1]);
        diff += Math.abs(defaultIconData[i + 2] - data[i + 2]);
      }
      // mean per-channel difference; very small means it's the default placeholder
      return diff / (16 * 16 * 3) < 12;
    } catch {
      return false;
    }
  }

  function domainOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); }
    catch { return url; }
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  function buildEditForm(item, options = {}) {
    const wrap = document.createElement("div");
    wrap.className = "bm-edit-form";
    wrap.dataset.id = item.id;
    wrap.dataset.pinned = options.isPinned ? "1" : "0";

    const titleInput = document.createElement("input");
    titleInput.type = "text";
    titleInput.value = item.title;
    titleInput.placeholder = "书签标题";

    const urlInput = document.createElement("input");
    urlInput.type = "text";
    urlInput.value = item.url;
    urlInput.placeholder = "https://…";

    const actions = document.createElement("div");
    actions.className = "bm-edit-actions";

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.className = "ghost-btn";
    saveBtn.textContent = "保存";
    saveBtn.addEventListener("click", () => saveBookmarkEdit(item, titleInput.value, urlInput.value));

    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "ghost-btn";
    cancelBtn.textContent = "取消";
    cancelBtn.addEventListener("click", stopEditing);

    const onKey = (e) => {
      if (e.key === "Enter") { e.preventDefault(); saveBookmarkEdit(item, titleInput.value, urlInput.value); }
      if (e.key === "Escape") { e.preventDefault(); stopEditing(); }
    };
    titleInput.addEventListener("keydown", onKey);
    urlInput.addEventListener("keydown", onKey);

    actions.appendChild(saveBtn);
    actions.appendChild(cancelBtn);
    wrap.appendChild(titleInput);
    wrap.appendChild(urlInput);
    wrap.appendChild(actions);

    setTimeout(() => { titleInput.focus(); titleInput.select(); }, 0);
    return wrap;
  }

  const RENDER_CHUNK = 48; // cards per animation frame — keeps 800+ bookmarks responsive
  let renderToken = 0;     // bumped on every render; superseded pumps bail out early

  function buildCard(item, options = {}) {
    const a = document.createElement("a");
    a.className = "bm-card" + (options.isPinned ? " is-pinned" : "");
    a.href = item.url;
    a.dataset.id = item.id;
    if (editMode) a.classList.add("edit-active"); // freshly rendered cards join edit mode immediately
    const img = document.createElement("img");
    img.className = "bm-favicon";
    img.src = faviconUrl(item.url);
    img.alt = "";
    img.loading = "lazy";   // favicon requests only start near the viewport
    img.decoding = "async";
    img.onload = () => {
      // _favicon answers 200 with the default placeholder for sites without an
      // icon — no error event fires, so check the pixels once the image is in.
      if (!img.dataset.fallback && isLikelyDefaultFavicon(img)) replaceWithLetterTile(img);
    };
    const text = document.createElement("div");
    text.className = "bm-text";
    const title = document.createElement("div");
    title.className = "bm-title";
    title.textContent = item.title;
    const domain = document.createElement("div");
    domain.className = "bm-domain";
    const dead = linkStatus[item.url];
    // the is-dead class is always applied; the dashed red treatment only shows
    // under body.edit-mode, so toggling edit mode never rebuilds the DOM
    const isDead = dead && dead.state === "dead";
    domain.textContent = options.showPath && item.path.length
      ? `${item.path.join(" / ")} · ${domainOf(item.url)}`
      : domainOf(item.url);
    if (isDead) {
      domain.textContent += dead.code ? ` · 可能失效(${dead.code})` : " · 可能失效";
      a.classList.add("is-dead");
      a.title = "上次检测无法访问,可能已失效、需要登录,或被网站拦截了检测请求";
    }
    text.appendChild(title);
    text.appendChild(domain);
    a.appendChild(img);
    a.appendChild(text);

    if (heatmapEnabled) {
      const count = clickCounts[item.url] || 0;
      const level = heatLevel(count);
      if (level > 0) a.style.setProperty("--heat", String(level));
    }

    // action buttons are always built but hidden unless body.edit-mode — this
    // is what lets edit mode toggle without rebuilding the whole drawer.
    const actions = document.createElement("div");
    actions.className = "bm-actions";

    if (isDead) {
      const confirmBtn = document.createElement("button");
      confirmBtn.type = "button";
      confirmBtn.className = "bm-action-btn confirm";
      confirmBtn.title = "这个链接其实能打开,标记为正常";
      confirmBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      confirmBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        linkStatus[item.url] = { state: "ok", checkedAt: Date.now(), manual: true };
        persistLinkStatus();
        showToast("已标记为正常,不再显示失效提示");
        rerenderCurrentView();
      });
      actions.appendChild(confirmBtn);
    }

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "bm-action-btn";
    editBtn.title = "编辑";
    editBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>';
    editBtn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); startEditing(item.id); });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "bm-action-btn danger";
    delBtn.title = "删除";
    delBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6"></path></svg>';
    delBtn.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); deleteBookmark(item); });

    // most-frequent cards: a hide/restore button inside the edit-mode actions
    if (options.isPinned) {
      const isPickHidden = hiddenPicks.includes(item.url);

      const pickBtn = document.createElement("button");
      pickBtn.type = "button";
      pickBtn.className = "bm-action-btn" + (isPickHidden ? " confirm" : "");
      pickBtn.title = isPickHidden ? "恢复到「最常访问」" : "从「最常访问」隐藏";
      pickBtn.innerHTML = isPickHidden
        ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>'
        : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"></line></svg>';
      pickBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (isPickHidden) {
          hiddenPicks = hiddenPicks.filter((u) => u !== item.url);
          showToast("已恢复到「最常访问」");
        } else {
          if (!hiddenPicks.includes(item.url)) hiddenPicks.push(item.url);
          showToast("已从「最常访问」隐藏");
        }
        localStorage.setItem("bm_picks_hidden", JSON.stringify(hiddenPicks));
        refreshPicksGroup();
      });
      actions.appendChild(pickBtn);

      if (isPickHidden) a.classList.add("pick-hidden");
    }

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    a.appendChild(actions);

    // browse-mode quick hide: small × on hover (hidden in edit mode)
    if (options.isPinned && !editMode) {
      const rm = document.createElement("button");
      rm.type = "button";
      rm.className = "pick-remove";
      rm.title = "从「最常访问」隐藏(编辑模式下可恢复)";
      rm.textContent = "×";
      rm.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!hiddenPicks.includes(item.url)) hiddenPicks.push(item.url);
        localStorage.setItem("bm_picks_hidden", JSON.stringify(hiddenPicks));
        showToast("已从「最常访问」隐藏,编辑模式可恢复");
        refreshPicksGroup();
      });
      a.appendChild(rm);
    }

    a.addEventListener("click", (e) => {
      // clicks on inner buttons (edit/delete/pick hide-restore) are handled by
      // the buttons themselves — never treat them as card navigation
      if (e.target.closest("button")) return;
      if (editMode) {
        // verify a suspected-dead link in a new tab without losing the session
        e.preventDefault();
        window.open(item.url, "_blank", "noopener");
        return;
      }
      recordClick(item.url);
    });

    return a;
  }

  function renderGroups(groups, options = {}) {
    const fragment = document.createDocumentFragment();
    const keys = Array.from(groups.keys());
    if (keys.length === 0) {
      els.groups.innerHTML = "";
      els.empty.hidden = false;
      return;
    }
    els.empty.hidden = true;

    // Groups render in the same order as their tabs: by total clicks inside
    // each section, most-clicked first. Hidden picks don't count.
    function sectionTotal(items) {
      return items.reduce((s, item) => s + (hiddenPicks.includes(item.url) ? 0 : (clickCounts[item.url] || 0)), 0);
    }
    keys.sort((a, b) => {
      const ta = sectionTotal(groups.get(a));
      const tb = sectionTotal(groups.get(b));
      if (ta !== tb) return tb - ta;
      return 0;
    });

    // First pass: group skeleton (labels + empty grids) so the layout appears
    // instantly; cards are filled in progressively below.
    const queue = [];
    function addSection(label, items, sectionOptions = {}) {
      const section = document.createElement("section");
      if (sectionOptions.isPinned) section.dataset.picks = "1";
      const heading = document.createElement("div");
      heading.className = "group-label";
      heading.textContent = label;
      section.appendChild(heading);
      const grid = document.createElement("div");
      grid.className = "card-grid";
      section.appendChild(grid);
      fragment.appendChild(section);
      items.forEach((item) => queue.push({ grid, item, options: { ...options, ...sectionOptions } }));
    }
    // a "最常访问" group of most-frequent bookmarks sits above every folder group
    if (options.pinned && options.pinned.length) addSection("最常访问", options.pinned, { isPinned: true });
    keys.forEach((label) => addSection(label, groups.get(label)));

    els.groups.innerHTML = "";
    els.groups.appendChild(fragment);

    // Progressive fill: a chunk of cards per animation frame. The first chunk
    // lands in the same frame as the skeleton, so the top of the drawer is
    // usable immediately even with ~800 bookmarks.
    const token = ++renderToken;
    let idx = 0;
    function pump() {
      if (token !== renderToken) return; // a newer render took over — drop this pass
      const end = Math.min(idx + RENDER_CHUNK, queue.length);
      for (; idx < end; idx++) {
        const { grid, item, options: cardOpts } = queue[idx];
        const card = editMode && item.id === editingId ? buildEditForm(item, cardOpts) : buildCard(item, cardOpts);
        grid.appendChild(card);
      }
      if (idx < queue.length) requestAnimationFrame(pump);
    }
    pump();
  }

  function renderActiveTab() {
    let items;
    let depth;
    let pinned;
    if (activeTab === "全部") {
      items = allItems;
      depth = 0;
      // in edit mode include manually-hidden picks so they can be restored
      pinned = picksEnabled ? topPickItems(editMode).map((p) => p.item) : [];
    } else {
      items = allItems.filter((i) => (i.path[0] || "常用") === activeTab);
      depth = 1;
    }
    const groups = groupItems(items, depth);
    renderGroups(groups, { pinned });
    els.searchCount.textContent = "";
  }

  /* ---------------- pinned / most-frequent group ---------------- */
  const TOP_PICKS_COUNT = 8;

  function topPickItems(includeHidden) {
    // map url -> first bookmark, so click counts can resolve back to real items
    const byUrl = new Map();
    allItems.forEach((item) => {
      if (!byUrl.has(item.url)) byUrl.set(item.url, item);
    });
    return Object.entries(clickCounts)
      .map(([url, count]) => ({ item: byUrl.get(url), count }))
      .filter((x) => x.item && x.count > 0 && (includeHidden || !hiddenPicks.includes(x.item.url)))
      .sort((a, b) => b.count - a.count)
      .slice(0, TOP_PICKS_COUNT);
  }

  /* Rebuild just the picks group (edit mode toggles hidden picks in/out, and
     hide/restore buttons change it) — cheap compared to a full rerender. Only
     relevant on the "全部" view with no search active. */
  function refreshPicksGroup() {
    const section = els.groups.querySelector('section[data-picks="1"]');
    if (activeTab !== "全部" || !picksEnabled || els.search.value.trim()) {
      if (section) section.remove();
      return;
    }
    const items = topPickItems(editMode).map((p) => p.item);
    if (items.length === 0) {
      if (section) section.remove();
      return;
    }
    if (!section) {
      section = document.createElement("section");
      section.dataset.picks = "1";
      const heading = document.createElement("div");
      heading.className = "group-label";
      heading.textContent = "最常访问";
      section.appendChild(heading);
      const grid = document.createElement("div");
      grid.className = "card-grid";
      section.appendChild(grid);
      els.groups.prepend(section);
    }
    const grid = section.querySelector(".card-grid");
    grid.innerHTML = "";
    items.forEach((item) => grid.appendChild(buildCard(item, { isPinned: true })));
  }

  /* ---------------- search ---------------- */
  let searchDebounce = null;
  els.search.addEventListener("input", () => {
    clearTimeout(searchDebounce);
    searchDebounce = setTimeout(runSearch, 120);
  });

  els.search.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const q = els.search.value.trim();
    if (!q) return;
    window.open(buildSearchUrl(q), "_blank", "noopener");
  });

  els.searchIcon.addEventListener("click", () => {
    const q = els.search.value.trim();
    if (!q) {
      els.search.focus();
      return;
    }
    window.open(buildSearchUrl(q), "_blank", "noopener");
  });

  function runSearch() {
    const q = els.search.value.trim().toLowerCase();
    if (!q) {
      renderActiveTab();
      return;
    }
    const matched = allItems.filter((item) =>
      item.title.toLowerCase().includes(q) || item.url.toLowerCase().includes(q)
    );
    els.searchCount.textContent = `${matched.length} 项`;
    // group by full folder path so results stay orientable
    const groups = new Map();
    matched.forEach((item) => {
      const key = item.path.length ? item.path.join(" / ") : "常用";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    renderGroups(groups);
  }

  /* ---------------- import ---------------- */
  els.importBtn.addEventListener("click", () => els.importFile.click());

  els.importFile.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const items = parseNetscapeBookmarks(text);
      if (items.length === 0) {
        showToast("没有在这个文件里找到可导入的书签");
        return;
      }
      await importIntoBrowser(items);
      showToast(`已导入 ${items.length} 条书签`);
      await loadBookmarks();
    } catch (err) {
      console.error(err);
      showToast("导入失败,请确认文件是浏览器导出的书签 HTML");
    } finally {
      els.importFile.value = "";
    }
  });

  function parseNetscapeBookmarks(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const rootDl = doc.querySelector("dl");
    const items = [];
    if (!rootDl) return items;

    function walk(dl, path) {
      Array.from(dl.children).forEach((el) => {
        if (el.tagName !== "DT") return;
        const h3 = el.querySelector(":scope > h3");
        const a = el.querySelector(":scope > a");
        if (h3) {
          const nestedDl = el.querySelector(":scope > dl");
          if (nestedDl) walk(nestedDl, path.concat(h3.textContent.trim() || "未命名文件夹"));
        } else if (a) {
          const href = a.getAttribute("href");
          if (href && /^https?:|^ftp:/i.test(href)) {
            items.push({ title: a.textContent.trim() || href, url: href, path: path.slice() });
          }
        }
      });
    }
    walk(rootDl, []);
    return items;
  }

  async function importIntoBrowser(items) {
    const tree = await chrome.bookmarks.getTree();
    const roots = tree[0].children || [];
    const otherRoot = roots.find((r) => r.id === "2") || roots[1] || roots[0];

    const today = new Date();
    const stamp = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const importRoot = await chrome.bookmarks.create({
      parentId: otherRoot.id,
      title: `导入书签 ${stamp}`,
    });

    const folderCache = new Map();
    folderCache.set("", importRoot.id);

    async function ensureFolder(path) {
      const key = path.join("/");
      if (folderCache.has(key)) return folderCache.get(key);
      const parentId = await ensureFolder(path.slice(0, -1));
      const folder = await chrome.bookmarks.create({
        parentId,
        title: path[path.length - 1],
      });
      folderCache.set(key, folder.id);
      return folder.id;
    }

    for (const item of items) {
      const parentId = item.path.length ? await ensureFolder(item.path) : importRoot.id;
      await chrome.bookmarks.create({ parentId, title: item.title, url: item.url });
    }
  }

  /* ---------------- live sync ---------------- */
  // debounced: bulk edits fire many events in a row; one reload per burst is enough
  let reloadDebounce = null;
  function scheduleReload() {
    clearTimeout(reloadDebounce);
    reloadDebounce = setTimeout(loadBookmarks, 300);
  }
  if (chrome.bookmarks.onCreated) {
    chrome.bookmarks.onCreated.addListener(scheduleReload);
    chrome.bookmarks.onChanged.addListener(scheduleReload);
    chrome.bookmarks.onMoved.addListener(scheduleReload);
    // removals are handled locally — instead of refetching the whole tree and
    // rebuilding every card, we drop the deleted items from memory and remove
    // just their cards from the DOM. Only the deleted card disappears.
    chrome.bookmarks.onRemoved.addListener((id, removeInfo) => {
      const removedIds = new Set();
      (function collect(node) {
        removedIds.add(node.id);
        if (node.children) node.children.forEach(collect);
      })(removeInfo.node);
      allItems = allItems.filter((i) => !removedIds.has(i.id));

      // search view rebuilds cheaply (few results); otherwise patch the DOM
      if (els.search.value.trim()) {
        runSearch();
      } else {
        removedIds.forEach((rid) => {
          const card = els.groups.querySelector(`.bm-card[data-id="${CSS.escape(String(rid))}"]`);
          const form = els.groups.querySelector(`.bm-edit-form[data-id="${CSS.escape(String(rid))}"]`);
          const victim = card || form;
          if (victim) {
            const grid = victim.closest(".card-grid");
            victim.remove();
            // drop the section too when its last card goes (never the picks group)
            if (grid && grid.querySelectorAll(".bm-card, .bm-edit-form").length === 0) {
              const section = grid.closest("section");
              if (section && section.dataset.picks !== "1") section.remove();
            }
          }
        });
        refreshPicksGroup(); // the deleted bookmark may have been in "最常访问"
        buildTabOrder();     // click totals changed — keep tab order in sync
        renderTabs();
        if (els.groups.querySelectorAll(".bm-card, .bm-edit-form").length === 0) {
          renderActiveTab(); // whole current view is gone → show the empty state
        }
      }
    });
  }

  loadBookmarks();
})();
