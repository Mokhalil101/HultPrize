/* Startup Tycoon — presentation layer. All rules live in engine.js; this file only renders and routes actions.
   Every visible sentence goes through _() (English text is the translation key) or L() (data tables). */
(function () {
  "use strict";
  const { Data: D, Engine: E, Save: S, I18n } = window.ST;
  const _ = I18n.m;
  const L = (kind, o, f) => I18n.data(kind, o.id, f, o[f]);
  const lab = k => I18n.data("labels", k, "name", E.LABELS[k] || k);
  const app = document.getElementById("app");
  const ui = {
    screen: "landing", tab: "overview", modal: null, game: null, settings: S.getSettings(), saveStatus: "", lastKey: "", howStep: 0, demoBudget: 3000,
    form: { founder: "", difficulty: "normal", challenge: null, startup: "", desc: "", icon: "💡", model: null, error: "" },
    launch: { features: ["core"], dev: 2000, target: "consumers", test: true, strategy: "partner" },
    pitchStarted: 0, pitchNote: ""
  };
  const t = k => I18n.t(k, ui.settings.lang);
  const rtl = () => ui.settings.lang === "ar";
  const BACK = () => (rtl() ? "→" : "←"), FWD = () => (rtl() ? "←" : "→");
  function setLanguage(l) { ui.settings.lang = l; E.setLang(l); I18n.setLang(l); }
  setLanguage(ui.settings.lang);
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = v => String(v === undefined || v === null ? "" : v).replace(/[&<>"']/g, c => ESC[c]);
  const fmt = n => Math.round(n).toLocaleString("en-US");
  const byId = (a, id) => a.find(x => x.id === id);
  const ICONS = ["💡", "🌱", "🚀", "🌍", "💧", "☀️", "📚", "🩺", "🌾", "🤝", "♻️", "🧠", "⚡", "🏡", "🔬", "🛠️"];
  const TABS = [["overview", 1], ["business", 2], ["finance", 1], ["team", 4], ["product", 5], ["impact", 1], ["events", 1], ["achievements", 1]];

  // ---------- helpers ----------
  const bar = (v, cls) => `<div class="bar ${cls || ""}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(v)}"><i style="width:${Math.max(0, Math.min(100, v))}%"></i></div>`;
  const stat = (label, val, bv, cls) => `<div class="card stat"><div class="lbl">${esc(label)}</div><div class="val">${val}</div>${bv === undefined ? "" : bar(bv, cls)}</div>`;
  const deltas = list => (list || []).map(d => `<span class="delta ${d.delta > 0 ? "up" : "down"}">${esc(lab(d.key))} ${d.delta > 0 ? "+" : ""}${d.key === "capital" ? fmt(d.delta) : d.delta}</span>`).join("");
  const risk = r => `<span class="badge ${r === "med" ? "med" : r}">${esc(r === "med" ? _("Medium risk") : r === "low" ? _("Low risk") : _("High risk"))}</span>`;
  const EGP = () => _("EGP");
  const wordmark = () => `<div class="wordmark" aria-label="Startup Tycoon"><svg class="logo-mark" viewBox="0 0 28 28" aria-hidden="true"><circle cx="9" cy="9" r="7" fill="#FF329B"/><rect x="14" y="14" width="12" height="12" rx="2" fill="#12B1E7"/><path d="M4 26 L11 14 L18 26Z" fill="#FDD40E"/></svg><span dir="ltr">STARTUP <b>TYCOON</b></span></div>`;
  function line(values, color, w, h) {
    w = w || 600; h = h || 140;
    if (values.length < 2) return `<p class="muted small">${esc(_("Chart appears after your first month."))}</p>`;
    const mn = Math.min.apply(null, values.concat([0])), mx = Math.max.apply(null, values.concat([1])), rg = mx - mn || 1;
    const pts = values.map((v, i) => `${(i / (values.length - 1) * (w - 20) + 10).toFixed(1)},${(h - 14 - (v - mn) / rg * (h - 28)).toFixed(1)}`).join(" ");
    return `<svg class="chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(_("Trend chart"))}" style="transform:${rtl() ? "scaleX(-1)" : "none"}"><polyline fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round" points="${pts}"/></svg>`;
  }
  let audio;
  function sfx(kind) {
    if (!ui.settings.sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const notes = { click: [520], good: [520, 780], bad: [220, 160], win: [520, 660, 880] }[kind] || [440];
      notes.forEach((f, i) => { const o = audio.createOscillator(), g = audio.createGain(); o.frequency.value = f; o.type = "sine"; o.connect(g); g.connect(audio.destination); const st = audio.currentTime + i * 0.12; g.gain.setValueAtTime(0.06, st); g.gain.exponentialRampToValueAtTime(0.0001, st + 0.18); o.start(st); o.stop(st + 0.2); });
    } catch (e) { /* audio unsupported */ }
  }
  let toastTimer;
  function toast(msg, kind) {
    let el = document.getElementById("toast");
    if (!el) { el = document.createElement("div"); el.id = "toast"; el.setAttribute("role", "status"); el.setAttribute("aria-live", "polite"); document.body.appendChild(el); }
    el.className = "toast " + (kind || ""); el.textContent = msg; el.style.display = "block";
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.style.display = "none"; }, 3200);
  }
  function setSave(status) {
    ui.saveStatus = status;
    const el = document.getElementById("savestat");
    if (el) { el.textContent = status === "saving" ? t("saving") : status === "saved" ? t("saved") : status === "fail" ? t("saveFailed") : ""; el.className = "save-ind " + (status === "saved" ? "ok" : status === "fail" ? "fail" : ""); }
  }
  function save() {
    if (!ui.game) return;
    setSave("saving");
    ui.game.newAchievements = [];
    const r = S.saveGame(ui.game);
    setSave(r.ok ? "saved" : "fail");
    if (!r.ok) toast(_("Could not save: {0}", r.error || ""), "bad");
    S.unlockAchievements(ui.game.achievements.map(a => a.id));
  }
  function afterAction() {
    const g = ui.game; if (!g) return;
    const n = (g.newAchievements || []).filter(id => id !== "finish");
    if (n.length) { toast(_("🏆 Achievement unlocked: {0}", n.map(id => L("achievements", byId(D.ACHIEVEMENTS, id), "name")).join(", ")), "good"); sfx("win"); }
    g.newAchievements = [];
  }
  function openDecisionIfNeeded() { if (ui.game && ui.game.status === "active" && ui.game.decisionPending && !ui.game.eventPending && !ui.game.report) ui.modal = { type: "decision", sel: null }; }
  function goResults() { S.addHistory(ui.game); save(); ui.modal = null; ui.screen = "results"; sfx("win"); }
  function chapter() { return byId(D.CHAPTERS, ui.game.currentChapter); }
  const chName = c => I18n.data("chapters", c.id, "name", c.name);
  const chDesc = c => I18n.data("chapters", c.id, "desc", c.desc);
  const chObj = c => I18n.data("chapters", c.id, "objective", c.objective);

  // ---------- screens ----------
  const screens = {};

  screens.landing = () => `<main class="hero dark" id="main">
    <div class="shape s1" aria-hidden="true"></div><div class="shape s2" aria-hidden="true"></div><div class="shape s3" aria-hidden="true"></div><div class="shape s4" aria-hidden="true"></div><div class="shape s5" aria-hidden="true"></div>
    <div class="wrap"><div style="max-width:620px">
      <div style="margin-bottom:24px">${wordmark()}</div>
      <h1 dir="ltr" style="text-align:start">STARTUP<br><span>TYCOON</span></h1>
      <p style="font-size:1.25rem;font-weight:600">${esc(t("tagline"))}</p>
      <p class="muted">${esc(_("Become a founder for 12 months. Pick a real social problem, manage a tight budget, hire a team, launch a product, face surprises and pitch to investors. Can you do well and do good?"))}</p>
      <div class="row" style="margin:24px 0"><button class="btn btn-primary" data-a="go" data-to="menu" autofocus>${esc(t("play"))} ${FWD()}</button></div>
      <p class="small muted">${esc(t("disclaimer"))}</p>
    </div></div></main>`;

  screens.menu = () => {
    const has = S.hasValidSave();
    return `<main class="wrap" id="main" style="padding-top:40px;padding-bottom:40px"><div class="center" style="margin-bottom:28px">${wordmark().replace('class="wordmark"', 'class="wordmark" style="justify-content:center;margin-bottom:16px"')}<h2>${esc(t("tagline"))}</h2></div>
    <nav class="menu-list" aria-label="${esc(_("Main menu"))}">
      <button class="btn btn-primary" data-a="newGame">${esc(t("start"))}</button>
      ${has ? `<button class="btn btn-secondary" data-a="continue">${esc(t("cont"))}</button>` : ""}
      <button class="btn btn-ghost" data-a="go" data-to="howto">${esc(t("how"))}</button>
      <button class="btn btn-ghost" data-a="go" data-to="mission">${esc(t("mission"))}</button>
      <button class="btn btn-ghost" data-a="go" data-to="saves">${esc(t("saves"))}</button>
      <button class="btn btn-ghost" data-a="go" data-to="settings">${esc(t("settings"))}</button>
      <button class="btn btn-ghost" data-a="go" data-to="credits">${esc(t("credits"))}</button>
    </nav>${S.isMemoryOnly() ? `<p class="center err small" style="margin-top:20px">${esc(_("Browser storage is unavailable, so progress will be lost when you close this tab. Use Export Save to keep a backup."))}</p>` : ""}
    <p class="center small muted" style="margin-top:28px">${esc(t("disclaimer"))}</p></main>`;
  };

  function simpleScreen(title, body) {
    return `<main class="wrap" id="main" style="padding-top:30px;padding-bottom:40px"><button class="btn btn-ghost btn-sm" data-a="go" data-to="menu">${BACK()} ${esc(t("back"))}</button><h2 style="margin-top:18px">${esc(title)}</h2>${body}</main>`;
  }
  screens.mission = () => simpleScreen(t("mission"), `<div class="card pad-lg stack"><p>${esc(_("The world's biggest problems (hunger, learning gaps, unsafe water, energy poverty and unequal healthcare) are also huge opportunities for young founders who build sustainable solutions."))}</p><p>${esc(_("Startup Tycoon is a student-built game that lets you feel the trade-offs behind that journey: profit and purpose, speed and quality, growth and cash."))}</p><p><b>${esc(_("THE WORLD NEEDS YOUR IDEAS. ARE YOU READY TO BUILD ONE?"))}</b></p><p class="muted small">${esc(t("disclaimer"))} ${esc(_("Scores are for learning and are not official competition results."))}</p></div>`);
  screens.credits = () => simpleScreen(t("credits"), `<div class="card pad-lg stack"><p>${_("<b>Startup Tycoon</b>, a student-built interactive entrepreneurship experience inspired by the Hult Prize mission.")}</p><p>${esc(_("Colour palette inspired by the Hult Prize brand. The STARTUP TYCOON wordmark is an independent mark made for this game. The official Hult Prize logo is not used."))}</p><p class="muted small">${esc(_("No servers, no accounts, no tracking: everything runs and is stored in your browser."))}</p></div>`);

  const HOW = [
    ["Your goal", "You have 12 months. Build a startup that earns enough to survive and helps real people. Your final score (out of 1000) rewards Social Impact, Financial Health, Innovation, Product Quality, Scalability and Decision Making."],
    ["Seven chapters", "The Problem → The Idea → The Business Model → Build Your Team → The Launch → Investor Day → Global Impact. Each chapter has an objective you must complete before moving on."],
    ["Manage your budget", "Every month you decide how much to spend on product, marketing, operations, research and social impact. Try it below: spending more on marketing brings customers faster but burns cash.", "demo"],
    ["Make decisions", "Each month brings a decision with different options. You see the cost and the risk before you confirm, but not every consequence. After you choose, you learn why it worked or not."],
    ["Handle surprises", "Competitors, bugs, grants and crises can strike. How you respond matters, and harder difficulties hit harder."],
    ["Pitch and finish", "At Investor Day, an investor scores your startup on problem, innovation, business model, finances, impact and scalability. Then you scale up and receive your final report."]
  ];
  screens.howto = () => {
    const i = ui.howStep, s = HOW[i];
    let demo = "";
    if (s[2] === "demo") { const est = Math.round(ui.demoBudget / 260 * 0.9 * 3); demo = `<div class="card" style="margin-top:12px"><label for="demo">${_("Marketing budget: <b>{0} {1}</b>", fmt(ui.demoBudget), esc(EGP()))}</label><input id="demo" type="range" min="0" max="12000" step="500" value="${ui.demoBudget}" data-demo="1"><p style="margin:8px 0 0">${_("≈ <b id=\"demoEst\">{0}</b> new customers per month, and cash left after a 20,000 EGP month: <b id=\"demoCash\">{1}</b> EGP.", est, fmt(20000 - ui.demoBudget))}</p></div>`; }
    return simpleScreen(t("how"), `<div class="card pad-lg"><div class="chapters" aria-hidden="true">${HOW.map((_x, k) => `<span class="${k < i ? "done" : k === i ? "cur" : ""}"></span>`).join("")}</div><p class="muted small">${esc(_("Step {0} of {1}", i + 1, HOW.length))}</p><h3>${esc(_(s[0]))}</h3><p>${esc(_(s[1]))}</p>${demo}<div class="row between" style="margin-top:18px"><button class="btn btn-ghost" data-a="howPrev" ${i === 0 ? "disabled" : ""}>${esc(t("back"))}</button>${i < HOW.length - 1 ? `<button class="btn btn-primary" data-a="howNext">${esc(t("next"))}</button>` : `<button class="btn btn-primary" data-a="newGame">${esc(t("start"))}</button>`}</div></div>`);
  };

  screens.settings = () => {
    const sw = (label, key) => `<div class="switch"><span>${esc(label)}</span><button class="btn btn-sm ${ui.settings[key] ? "btn-secondary" : "btn-ghost"}" data-a="toggle" data-k="${key}" role="switch" aria-checked="${!!ui.settings[key]}">${esc(ui.settings[key] ? t("on") : t("off"))}</button></div>`;
    return simpleScreen(t("settings"), `<div class="card pad-lg">${sw(t("sound"), "sound")}${sw(t("animations"), "animations")}<div class="switch"><span>${esc(t("language"))}</span><span class="row"><button class="btn btn-sm ${ui.settings.lang === "en" ? "btn-secondary" : "btn-ghost"}" data-a="lang" data-v="en">English</button><button class="btn btn-sm ${ui.settings.lang === "ar" ? "btn-secondary" : "btn-ghost"}" data-a="lang" data-v="ar">العربية</button></span></div><p class="muted small" style="margin-top:12px">${esc(_("The whole game, including scenarios and events, is available in English and Arabic. You can switch at any time."))}</p></div>`);
  };

  screens.saves = () => {
    const l = S.loadGame(), hist = S.getHistory();
    let cur = `<p class="muted">${esc(_("No saved game."))}</p>`;
    if (l && l.state) { const s = l.state, ch = byId(D.CHALLENGES, s.startup.challengeId); cur = `<div class="row between"><div><b>${esc(s.startup.icon)} ${esc(s.startup.name)}</b><div class="muted small">${esc(L("challenges", ch, "name"))} · ${esc(_("Month {0}/12", s.currentMonth))} · ${esc(s.status === "ended" ? _("Finished") : _("In progress"))} · ${esc(_("saved {0}", new Date(s.updatedAt).toLocaleString()))}</div></div><div class="row"><button class="btn btn-secondary btn-sm" data-a="continue">${esc(t("cont"))}</button></div></div>`; }
    else if (l && l.error) cur = `<p class="err">${esc(_(l.error))} <button class="btn btn-sm btn-danger" data-a="deleteSave">${esc(_("Delete broken save"))}</button></p>`;
    return simpleScreen(t("saves"), `<div class="stack"><div class="card"><h3>${esc(_("Current save"))}</h3>${cur}</div>
    <div class="card"><h3>${esc(_("Backup"))}</h3><p class="muted small">${esc(_("Saves live only in this browser. Export a file to keep a backup or move to another device."))}</p><div class="row">${ui.game ? `<button class="btn btn-primary btn-sm" data-a="saveNow">${esc(t("save"))}</button><button class="btn btn-secondary btn-sm" data-a="exportSave">${esc(_("Export save"))}</button>` : ""}<button class="btn btn-ghost btn-sm" data-a="pickImport">${esc(_("Import save"))}</button>${l && l.state ? `<button class="btn btn-ghost btn-sm" data-a="deleteSave">${esc(_("Delete save"))}</button>` : ""}</div></div>
    <div class="card"><h3>${esc(_("Completed games"))}</h3>${hist.length ? `<table class="t"><tr><th>${esc(_("Startup"))}</th><th>${esc(_("Rank"))}</th><th>${esc(_("Score"))}</th></tr>${hist.map(h => `<tr><td>${esc(h.startup)}</td><td>${esc(I18n.data("ranks", h.rank, "name", h.rank))}</td><td>${h.score}</td></tr>`).join("")}</table>` : `<p class="muted">${esc(_("None yet."))}</p>`}</div></div>`);
  };

  // ----- setup flow -----
  const setupHead = (n, title) => `<main class="wrap" id="main" style="padding-top:30px;padding-bottom:40px"><div class="chapters" aria-label="${esc(_("Step {0} of {1}", n, 4))}">${[1, 2, 3, 4].map(k => `<span class="${k < n ? "done" : k === n ? "cur" : ""}"></span>`).join("")}</div><h2>${esc(title)}</h2>`;
  const errBox = () => ui.form.error ? `<p class="err" role="alert">${esc(ui.form.error)}</p>` : "";
  screens.founder = () => `${setupHead(1, _("Who is the founder?"))}<div class="card pad-lg"><div class="field"><label for="f-founder">${esc(_("Founder name"))}</label><input type="text" id="f-founder" data-f="founder" maxlength="30" value="${esc(ui.form.founder)}" autocomplete="off" placeholder="${esc(_("e.g. Alex"))}"></div>
    <label>${esc(_("Difficulty"))}</label><div class="grid g3">${Object.values(D.DIFFICULTY).map(d => `<button class="opt" aria-pressed="${ui.form.difficulty === d.id}" data-a="diff" data-v="${d.id}"><div class="t">${esc(L("difficulty", d, "name"))}</div>${esc(_("{0} EGP start", fmt(d.capital)))}<div class="muted small">${esc(L("difficulty", d, "label"))}</div></button>`).join("")}</div>${errBox()}
    <div class="row between" style="margin-top:18px"><button class="btn btn-ghost" data-a="go" data-to="menu">${esc(t("back"))}</button><button class="btn btn-primary" data-a="founderNext">${esc(t("next"))}</button></div></div></main>`;

  screens.challenge = () => {
    const c = byId(D.CHALLENGES, ui.form.challenge);
    const short = x => I18n.data("challenges", x.id, "short", x.description.split(".")[0]);
    const detail = c ? `<div class="card pad-lg" style="margin-top:14px"><h3>${esc(c.icon)} ${esc(L("challenges", c, "name"))} <span class="badge">${esc(_(c.difficulty + " difficulty"))}</span></h3><p>${esc(L("challenges", c, "description"))}</p><div class="grid g2"><div><b>${esc(_("Who benefits"))}</b><p class="small">${esc(L("challenges", c, "beneficiaries"))}</p><b>${esc(_("Market opportunity"))}</b><p class="small">${esc(L("challenges", c, "market"))}</p></div><div><b>${esc(_("Initial research"))}</b><p class="small">${esc(L("challenges", c, "research"))}</p><b>${esc(_("Solution directions"))}</b><ul class="small">${I18n.data("challenges", c.id, "directions", c.directions).map(x => `<li>${esc(x)}</li>`).join("")}</ul></div></div><p class="small muted">${esc(_("We measure: {0} and {1}.", I18n.data("challenges", c.id, "peopleMetric", c.metrics.people), I18n.data("challenges", c.id, "extraMetric", c.metrics.extra)))}</p></div>` : "";
    return `${setupHead(2, _("Choose your social challenge"))}<div class="grid g3">${D.CHALLENGES.map(c2 => `<button class="opt" aria-pressed="${ui.form.challenge === c2.id}" data-a="pickChallenge" data-v="${c2.id}"><div style="font-size:2rem">${esc(c2.icon)}</div><div class="t">${esc(L("challenges", c2, "name"))}</div><span class="muted small">${esc(short(c2))}.</span></button>`).join("")}</div>${detail}${errBox()}<div class="row between" style="margin-top:18px"><button class="btn btn-ghost" data-a="go" data-to="founder">${esc(t("back"))}</button><button class="btn btn-primary" data-a="challengeNext">${esc(t("next"))}</button></div></main>`;
  };

  screens.create = () => `${setupHead(3, _("Create your startup"))}<div class="card pad-lg"><div class="field"><label for="f-startup">${esc(_("Startup name"))}</label><input type="text" id="f-startup" data-f="startup" maxlength="40" value="${esc(ui.form.startup)}" placeholder="${esc(_("e.g. EcoLoop"))}" autocomplete="off"></div>
    <div class="field"><label for="f-desc">${esc(_("Short description (optional)"))}</label><textarea id="f-desc" data-f="desc" maxlength="200" rows="3" placeholder="${esc(_("What does your startup do?"))}">${esc(ui.form.desc)}</textarea></div>
    <label>${esc(_("Logo"))}</label><div class="icon-pick">${ICONS.map(i => `<button aria-label="${esc(_("Logo {0}", i))}" aria-pressed="${ui.form.icon === i}" data-a="pickIcon" data-v="${i}">${i}</button>`).join("")}</div>${errBox()}
    <div class="row between" style="margin-top:18px"><button class="btn btn-ghost" data-a="go" data-to="challenge">${esc(t("back"))}</button><button class="btn btn-primary" data-a="createNext">${esc(t("next"))}</button></div></div></main>`;

  function modelCard(m, ch, sel, action) {
    const fits = ch.availableModels.includes(m.id);
    return `<button class="opt" aria-pressed="${sel}" data-a="${action}" data-v="${m.id}"><div style="font-size:1.8rem">${m.icon}</div><div class="t">${esc(L("models", m, "name"))} ${fits ? `<span class="badge low">${esc(_("Good fit"))}</span>` : `<span class="badge med">${esc(_("Weaker fit"))}</span>`}</div><div class="small">${esc(L("models", m, "desc"))}</div><div class="meta"><span class="badge">${esc(_("Revenue: {0}", L("models", m, "revenue")))}</span><span class="badge">${esc(_("Costs: {0}", L("models", m, "costs")))}</span><span class="badge">${esc(_("Acquisition: {0}", L("models", m, "acquisition")))}</span><span class="badge">${esc(_("Scalability {0}/100", m.scal))}</span></div></button>`;
  }
  screens.model = () => { const ch = byId(D.CHALLENGES, ui.form.challenge); return `${setupHead(4, _("Select your business model"))}<p class="muted">${esc(_("How will {0} earn money? Models that fit {1} work better. You can pivot once in Chapter 3.", ui.form.startup, L("challenges", ch, "name")))}</p><div class="grid g2">${D.MODELS.map(m => modelCard(m, ch, ui.form.model === m.id, "pickModel")).join("")}</div>${errBox()}<div class="row between" style="margin-top:18px"><button class="btn btn-ghost" data-a="go" data-to="create">${esc(t("back"))}</button><button class="btn btn-primary" data-a="startGame">${esc(_("Launch {0} 🚀", ui.form.startup))}</button></div></main>`; };

  // ----- game -----
  function gameNav() {
    const g = ui.game, ch = chapter();
    return `<header class="nav"><div class="wrap">${wordmark()}<span class="grow"></span><span class="badge">${esc(g.startup.icon)} ${esc(g.startup.name)}</span><span class="badge">${esc(t("month"))} ${g.currentMonth}/12</span><span class="badge" style="background:var(--pink);color:#fff;border:0">${esc(t("chapter"))} ${ch.id}</span><span id="savestat" class="save-ind ${ui.saveStatus === "saved" ? "ok" : ui.saveStatus === "fail" ? "fail" : ""}" aria-live="polite">${ui.saveStatus === "saved" ? esc(t("saved")) : ui.saveStatus === "saving" ? esc(t("saving")) : ui.saveStatus === "fail" ? esc(t("saveFailed")) : ""}</span><button class="btn btn-ghost btn-sm" data-a="saveNow">${esc(t("save"))}</button><button class="btn btn-ghost btn-sm" data-a="toMenu">${esc(t("menu"))}</button></div></header>`;
  }

  screens.game = () => {
    const g = ui.game; if (!g) { ui.screen = "menu"; return screens.menu(); }
    const r = g.resources, last = g.history[g.history.length - 1] || { revenue: 0, expenses: 0 };
    const tabs = TABS.map(([id, need]) => { const open = need <= g.currentChapter; return `<button class="tab" role="tab" aria-selected="${ui.tab === id}" data-a="tab" data-v="${id}" ${open ? "" : `disabled title="${esc(t("locked"))} ${need}"`}>${open ? "" : "🔒 "}${esc(t(id))}</button>`; }).join("");
    const body = (tabs_[ui.tab] || tabs_.overview)();
    return `${gameNav()}<main class="wrap" id="main"><div class="grid g4" style="margin-top:14px">${stat(t("capital"), fmt(r.capital) + " <small>" + esc(EGP()) + "</small>")}${stat(t("revenue"), fmt(last.revenue), undefined)}${stat(t("expenses"), fmt(last.expenses), undefined)}${stat(t("reputation"), Math.round(r.reputation), r.reputation, "pink")}${stat(t("quality"), Math.round(r.quality), r.quality, "sky")}${stat(t("socialImpact"), Math.round(r.impact), r.impact, "purple")}</div><div class="tabs" role="tablist" aria-label="${esc(_("Game sections"))}">${tabs}</div><section style="padding-bottom:50px">${body}</section></main>`;
  };

  const tabs_ = {};
  tabs_.overview = () => {
    const g = ui.game, ch = chapter(), bl = E.blockers(g), dec = E.getDecision(g), r = g.resources;
    const cap = g.history.map(h => h.capital);
    const pitchBtn = g.currentChapter === 6 && (!g.pitch || !g.pitch.result);
    const lastEv = g.events[g.events.length - 1], lastEvText = lastEv ? E.describeEvent(g, lastEv) : null;
    return `<div class="grid g2"><div class="card pad-lg"><p class="muted small" style="margin:0">${esc(_("CHAPTER {0}", String(ch.id).padStart(2, "0")))}</p><h2>${esc(chName(ch))}</h2><p>${esc(chDesc(ch))}</p><div class="chapters" aria-label="${esc(_("Chapter progress"))}">${D.CHAPTERS.map(c => `<span class="${c.id < ch.id ? "done" : c.id === ch.id ? "cur" : ""}" title="${esc(chName(c))}"></span>`).join("")}</div><p><b>${esc(t("objective"))}:</b> ${esc(chObj(ch))}</p></div>
    <div class="card pad-lg"><h3>${esc(_("Quick actions"))}</h3><div class="stack">
      ${dec ? `<button class="btn btn-secondary btn-block" data-a="openDecision">📝 ${esc(t("decision"))}: ${esc(dec.title)}</button>` : `<p class="muted small" style="margin:0">${esc(_("✅ This month's decision is done."))}</p>`}
      ${pitchBtn ? `<button class="btn btn-secondary btn-block" data-a="goPitch">${esc(_("💼 Go to Investor Pitch"))}</button>` : ""}
      ${g.currentChapter >= 5 && !g.mvp.launched ? `<button class="btn btn-ghost btn-block" data-a="tab" data-v="product">${esc(_("🚀 Plan your MVP launch"))}</button>` : ""}
      <button class="btn btn-ghost btn-block" data-a="tab" data-v="finance">${esc(_("💰 Adjust monthly budget"))}</button>
      <button class="btn btn-primary btn-block" data-a="runMonth" ${bl.length ? "disabled" : ""}>▶ ${esc(t("runMonth"))} ${g.currentMonth}</button>
      ${bl.length ? `<p class="small muted" style="margin:0">${esc(bl[0])}</p>` : ""}</div></div></div>
    <div class="grid g2" style="margin-top:14px"><div class="card"><h3>${esc(_("Active effects"))}</h3><p class="small muted">${esc(g.pending.length ? _("{0} earlier decision(s) or event(s) will pay off or bite in coming months. You do not know exactly how.", g.pending.length) : _("Nothing pending. Your past choices have already played out."))}</p>${lastEvText ? `<p class="small"><b>${esc(_("Latest event:"))}</b> ${esc(lastEvText.title)}</p>` : ""}<p class="small"><b>${esc(_("Runway:"))}</b> ${esc(_("{0} months at the current plan.", E.runway(g).toFixed(1)))}</p></div>
    <div class="card"><h3>${esc(_("Capital over time"))}</h3>${line(cap, "#8A2890")}</div></div>
    <div class="grid g4" style="margin-top:14px">${stat(lab("customers"), fmt(r.customers))}${stat(lab("satisfaction"), Math.round(r.satisfaction), r.satisfaction)}${stat(lab("morale"), Math.round(r.morale), r.morale, "pink")}${stat(lab("sustainability"), Math.round(r.sustainability), r.sustainability, "sun")}</div>`;
  };

  tabs_.business = () => {
    const g = ui.game, m = E.modelOf(g), ch = E.challengeOf(g), fits = E.modelFits(g);
    const pivot = g.currentChapter === 3 && !g.flags.pivoted ? `<div class="card" style="margin-top:14px"><h3>${esc(_("Pivot your model (once, Chapter 3)"))}</h3><p class="small muted">${esc(_("Costs 3,000 EGP and 2 reputation."))}</p><div class="grid g2">${D.MODELS.filter(x => x.id !== m.id).map(x => modelCard(x, ch, false, "pivot")).join("")}</div></div>` : "";
    return `<div class="grid g2"><div class="card pad-lg"><h3>${m.icon} ${esc(L("models", m, "name"))} ${fits ? `<span class="badge low">${esc(_("Good fit"))}</span>` : `<span class="badge med">${esc(_("Weaker fit"))}</span>`}</h3><p>${esc(L("models", m, "desc"))}</p><div class="kv"><span>${esc(_("Revenue per customer / month"))}</span><b>${fmt(m.arpu)} ${esc(EGP())}</b></div><div class="kv"><span>${esc(_("Cost to acquire a customer"))}</span><b>≈ ${fmt(m.cac)} ${esc(EGP())}</b></div><div class="kv"><span>${esc(_("Cost to serve a customer"))}</span><b>${fmt(m.varCost)} ${esc(EGP())}</b></div><div class="kv"><span>${esc(_("Fixed running cost"))}</span><b>${esc(_("{0} EGP / month", fmt(E.fixedCost(g))))}</b></div><div class="kv"><span>${esc(_("Scalability"))}</span><b>${m.scal}/100</b></div><div class="kv"><span>${esc(_("Customers pay"))}</span><b>${esc(m.credit ? _("{0}% a month late", Math.round(m.credit * 100)) : _("immediately"))}</b></div>${fits ? "" : `<p class="small err">${esc(_("This model is a weaker match for {0}: customers are harder to win and sustainability is lower.", L("challenges", ch, "name")))}</p>`}</div>
    <div class="card pad-lg"><h3>${ch.icon} ${esc(L("challenges", ch, "name"))}</h3><p>${esc(L("challenges", ch, "description"))}</p><p class="small"><b>${esc(_("Who benefits"))}:</b> ${esc(L("challenges", ch, "beneficiaries"))}</p><p class="small"><b>${esc(_("Market"))}:</b> ${esc(L("challenges", ch, "market"))}</p><p class="small"><b>${esc(_("Research"))}:</b> ${esc(L("challenges", ch, "research"))}</p><p class="small"><b>${esc(_("Ideas"))}:</b> ${I18n.data("challenges", ch.id, "directions", ch.directions).map(esc).join(" · ")}</p></div></div>${pivot}`;
  };

  tabs_.finance = () => {
    const g = ui.game, p = E.plannedSpend(g), rep = g.history[g.history.length - 1], f = g.finance;
    const lines = [["product", _("Product development")], ["marketing", _("Marketing")], ["ops", _("Operations")], ["research", _("Research")], ["impact", _("Social impact activities")]];
    const sliders = lines.map(([k, l]) => `<div class="field"><label for="al-${k}">${esc(l)}: <b id="av-${k}">${fmt(g.alloc[k])}</b> ${esc(EGP())}</label><input type="range" id="al-${k}" min="0" max="15000" step="100" value="${g.alloc[k]}" data-alloc="${k}"></div>`).join("");
    const table = rep ? `<table class="t"><tr><td>${esc(_("Revenue (accounting)"))}</td><td>${fmt(rep.revenue)}</td></tr><tr><td>${esc(_("Fixed costs"))}</td><td>-${fmt(rep.fixed)}</td></tr><tr><td>${esc(_("Variable costs"))}</td><td>-${fmt(rep.variable)}</td></tr><tr><td>${esc(_("Salaries"))}</td><td>-${fmt(rep.salaries)}</td></tr><tr><td>${esc(_("Marketing"))}</td><td>-${fmt(rep.marketing)}</td></tr><tr><td>${esc(_("Product development"))}</td><td>-${fmt(rep.product)}</td></tr><tr><td>${esc(_("Ops, research, impact"))}</td><td>-${fmt(rep.ops)}</td></tr><tr><td>${esc(_("Funding and grants"))}</td><td>+${fmt(rep.funding)}</td></tr><tr><th>${esc(_("Net profit (accounting)"))}</th><th>${fmt(rep.profit)}</th></tr><tr><th>${esc(_("Net cash flow"))}</th><th>${fmt(rep.cashFlow)}</th></tr></table><p class="small muted">${esc(_("Profit and cash can differ: some customers pay late (receivables) and funding is cash but not profit."))}</p>` : `<p class="muted">${esc(_("Run your first month to see the breakdown."))}</p>`;
    return `<div class="grid g2"><div class="card pad-lg"><h3>${esc(_("Monthly budget"))}</h3>${sliders}<div class="kv"><span>${esc(_("Fixed costs"))}</span><b>${fmt(p.fixed)}</b></div><div class="kv"><span>${esc(_("Salaries"))}</span><b>${fmt(p.salaries)}</b></div><div class="kv"><span>${esc(_("Budget lines"))}</span><b>${fmt(p.alloc)}</b></div><div class="kv"><span><b>${esc(_("Planned spending"))}</b></span><b id="plan-total">${fmt(p.total)}</b></div><div class="kv"><span>${esc(t("capital"))}</span><b>${fmt(g.resources.capital)}</b></div><p id="plan-warn" class="err small">${p.total > g.resources.capital ? esc(_("Planned spending is above your capital.")) : ""}</p><button class="btn btn-secondary btn-sm" data-a="autoFit">${esc(_("Auto-fit to my cash"))}</button></div>
    <div class="card pad-lg"><h3>${esc(_("Last month"))}</h3>${table}<div class="kv"><span>${esc(_("Total revenue so far"))}</span><b>${fmt(f.totalRevenue)}</b></div><div class="kv"><span>${esc(_("Total funding received"))}</span><b>${fmt(f.totalFunding)}</b></div><div class="kv"><span>${esc(_("Unpaid by customers"))}</span><b>${fmt(f.receivable)}</b></div></div></div>
    <div class="card" style="margin-top:14px"><h3>${esc(_("Revenue vs expenses"))}</h3>${line(g.history.map(h => h.revenue), "#06B47A")}<p class="small muted">${esc(_("Green: revenue per month. Purple: expenses per month."))}</p>${line(g.history.map(h => h.expenses), "#8A2890")}</div>`;
  };

  tabs_.team = () => {
    const g = ui.game, pay = E.salaries(g);
    if (g.currentChapter < 4) return `<div class="card lock-note">${esc(_("🔒 Hiring unlocks in Chapter 4."))}</div>`;
    return `<div class="card" style="margin-bottom:14px"><div class="row between"><span><b>${esc(_("Team:"))}</b> ${esc(_("{0} (you + {1})", g.team.length + 1, g.team.length))}</span><span><b>${esc(_("Monthly payroll:"))}</b> ${fmt(pay)} ${esc(EGP())}</span><span><b>${esc(_("Morale:"))}</b> ${Math.round(g.resources.morale)}/100</span></div></div><div class="grid g3">${D.ROLES.map(r => { const h = E.has(g, r.id); return `<div class="card"><div style="font-size:1.8rem">${r.icon}</div><h3>${esc(L("roles", r, "name"))}</h3><p class="small">${esc(L("roles", r, "productivity"))}</p><p class="small muted">${esc(_("Skills: {0}", I18n.data("roles", r.id, "skills", r.skills).join(rtl() ? "، " : ", ")))}</p><div class="kv"><span>${esc(_("Hiring cost"))}</span><b>${fmt(r.hire)}</b></div><div class="kv"><span>${esc(_("Salary / month"))}</span><b>${fmt(r.salary)}</b></div>${h ? `<p class="badge low" style="margin-top:10px">${esc(_("Hired"))}</p>` : `<button class="btn btn-primary btn-sm btn-block" style="margin-top:10px" data-a="hire" data-v="${r.id}" ${g.resources.capital < r.hire + r.salary ? "disabled" : ""}>${esc(_("Hire"))}</button>`}</div>`; }).join("")}</div>`;
  };

  tabs_.product = () => {
    const g = ui.game, r = g.resources;
    if (g.currentChapter < 5) return `<div class="card lock-note">${esc(_("🔒 Product development unlocks in Chapter 5."))}</div>`;
    const head = `<div class="grid g3" style="margin-bottom:14px">${stat(t("quality"), Math.round(r.quality), r.quality, "sky")}${stat(lab("innovation"), Math.round(r.innovation), r.innovation, "purple")}${stat(lab("satisfaction"), Math.round(r.satisfaction), r.satisfaction)}</div>`;
    if (g.mvp.launched) { const m = g.mvp; return head + `<div class="card pad-lg"><h3>${esc(_("🚀 MVP launched in month {0}", m.month))}</h3><p>${_("Result: <b>{0}</b> (readiness {1}). First customers: {2}.", esc(m.result === "great" ? _("Strong launch") : m.result === "ok" ? _("Decent launch") : _("Rocky launch")), m.readiness, m.customers)}</p><p class="muted small">${esc(_("Keep improving quality through the Product budget on the Finance tab."))}</p></div>`; }
    const Lc = ui.launch, featCost = Lc.features.reduce((a, id) => a + byId(D.FEATURES, id).cost, 0), strat = byId(D.STRATEGIES, Lc.strategy), total = featCost + Lc.dev + (Lc.test ? 2000 : 0) + strat.cost;
    const ok = Lc.features.length > 0 && total <= r.capital;
    return head + `<div class="card pad-lg stack"><h3>${esc(_("MVP launch plan"))}</h3>
    <fieldset style="border:0;padding:0;margin:0"><legend><b>${esc(_("1. Features"))}</b></legend><div class="grid g3">${D.FEATURES.map(f => `<label class="opt ${Lc.features.includes(f.id) ? "sel" : ""}" style="cursor:pointer;margin:0"><input type="checkbox" data-launch="feat" value="${f.id}" ${Lc.features.includes(f.id) ? "checked" : ""}> <b>${esc(L("features", f, "name"))}</b> <span class="small">(${fmt(f.cost)} ${esc(EGP())})</span><div class="small muted">${esc(L("features", f, "note"))}</div></label>`).join("")}</div></fieldset>
    <div><label for="dev">${_("<b>2. Extra development budget:</b> {0} {1}", fmt(Lc.dev), esc(EGP()))}</label><input type="range" id="dev" min="0" max="10000" step="500" value="${Lc.dev}" data-launch="dev"></div>
    <fieldset style="border:0;padding:0;margin:0"><legend><b>${esc(_("3. Target customers"))}</b></legend><div class="grid g2">${D.TARGETS.map(x => `<label class="opt ${Lc.target === x.id ? "sel" : ""}" style="cursor:pointer;margin:0"><input type="radio" name="target" data-launch="target" value="${x.id}" ${Lc.target === x.id ? "checked" : ""}> <b>${esc(L("targets", x, "name"))}</b><div class="small muted">${esc(L("targets", x, "note"))}</div></label>`).join("")}</div></fieldset>
    <label class="opt ${Lc.test ? "sel" : ""}" style="cursor:pointer;margin:0"><input type="checkbox" data-launch="test" ${Lc.test ? "checked" : ""}> <b>${esc(_("4. Run product testing"))}</b> <span class="small">(${esc(_("2,000 EGP"))})</span><div class="small muted">${esc(_("Finds problems before customers do and improves readiness."))}</div></label>
    <fieldset style="border:0;padding:0;margin:0"><legend><b>${esc(_("5. Launch strategy"))}</b></legend><div class="grid g3">${D.STRATEGIES.map(x => `<label class="opt ${Lc.strategy === x.id ? "sel" : ""}" style="cursor:pointer;margin:0"><input type="radio" name="strategy" data-launch="strategy" value="${x.id}" ${Lc.strategy === x.id ? "checked" : ""}> <b>${esc(L("strategies", x, "name"))}</b> <span class="small">(${fmt(x.cost)} ${esc(EGP())})</span><div class="small muted">${esc(L("strategies", x, "note"))}</div></label>`).join("")}</div></fieldset>
    <div class="kv"><span><b>${esc(_("Total cost"))}</b></span><b>${fmt(total)} ${esc(EGP())}</b></div>${total > r.capital ? `<p class="err small">${esc(_("You do not have enough capital for this plan."))}</p>` : ""}${Lc.features.length ? "" : `<p class="err small">${esc(_("Choose at least one feature."))}</p>`}
    <button class="btn btn-primary" data-a="launch" ${ok ? "" : "disabled"}>${esc(_("🚀 Launch MVP"))}</button></div>`;
  };

  tabs_.impact = () => {
    const g = ui.game, r = g.resources, ch = E.challengeOf(g), extra = Math.round(r.beneficiaries * ch.metrics.extraPerPerson);
    const pm = I18n.data("challenges", ch.id, "peopleMetric", ch.metrics.people), em = I18n.data("challenges", ch.id, "extraMetric", ch.metrics.extra);
    return `<div class="grid g3">${stat(_("Social Impact Score"), Math.round(r.impact) + "/100", r.impact, "purple")}${stat(pm, fmt(r.beneficiaries))}${stat(em, fmt(extra))}</div><div class="card pad-lg" style="margin-top:14px"><h3>${esc(_("Score vs real people"))}</h3><p>${_("The <b>Social Impact Score</b> measures how deep and well-evidenced your impact is. <b>{0}</b> counts the actual people reached. You can reach many people with shallow impact, or help few people deeply: the game rewards both.", esc(pm))}</p><p class="small muted">${esc(_("Boost impact with the \"Social impact activities\" budget, a Social Impact Specialist and decisions that serve your beneficiaries."))}</p>${line(g.history.map(h => h.beneficiaries), "#12B1E7")}</div>`;
  };

  tabs_.events = () => {
    const g = ui.game;
    const dh = g.decisions.length ? g.decisions.slice().reverse().map(d => { const x = E.describeDecision(g, d); return `<div class="stack" style="padding:10px 0;border-bottom:1px solid var(--line)"><b>${esc(_("Month {0}: {1}", d.month, x.title))}</b><div class="small">${esc(_("You chose: {0}", x.choice))}</div><div class="small muted">${esc(x.why)}</div></div>`; }).join("") : `<p class="muted">${esc(_("No decisions yet."))}</p>`;
    const eh = g.events.length ? g.events.slice().reverse().map(e => { const x = E.describeEvent(g, e); return `<div class="stack" style="padding:10px 0;border-bottom:1px solid var(--line)"><b>${esc(_("Month {0}: {1}", e.month, x.title))}</b><div class="small">${esc(_("You chose: {0}", x.choice))}</div><div class="small muted">${esc(x.why)}</div></div>`; }).join("") : `<p class="muted">${esc(_("No events yet."))}</p>`;
    return `<div class="grid g2"><div class="card"><h3>${esc(_("Decision history"))}</h3>${dh}</div><div class="card"><h3>${esc(_("Event history"))}</h3>${eh}</div></div>`;
  };

  tabs_.achievements = () => {
    const got = new Set(S.getAchievements().concat(ui.game.achievements.map(a => a.id)));
    return `<p class="muted">${esc(_("{0} of {1} unlocked across all your games.", got.size, D.ACHIEVEMENTS.length))}</p><div class="grid g3">${D.ACHIEVEMENTS.map(a => `<div class="card ach ${got.has(a.id) ? "" : "off"}"><div class="ic">${a.icon}</div><div><b>${esc(L("achievements", a, "name"))}</b><div class="small muted">${esc(L("achievements", a, "desc"))}</div></div></div>`).join("")}</div>`;
  };

  // ----- pitch -----
  const CRIT = [["problem", "Problem understanding"], ["innovation", "Innovation"], ["business", "Business model"], ["financial", "Financial sustainability"], ["impact", "Social impact"], ["scalability", "Scalability"]];
  screens.pitch = () => {
    const g = ui.game, p = g.pitch, inv = byId(D.INVESTORS, p.investorId), n = p.answers.length;
    const q = D.PITCH_QUESTIONS[n], qa = I18n.data("pitchQuestions", n, "a", null), qq = I18n.data("pitchQuestions", n, "q", q.q);
    return `<div class="dark"><main class="wrap" id="main" style="padding-top:30px;padding-bottom:50px"><div class="row between"><div>${wordmark()}</div><div class="badge" style="background:var(--aloe);color:var(--ink)" role="timer" aria-label="${esc(_("Pitch time remaining"))}">⏱ <span id="pitch-timer" dir="ltr">3:00</span></div></div><p id="pitch-warn" class="small" style="color:var(--sun);text-align:end;margin:6px 0 0" aria-live="polite"></p>
    <div class="grid g2" style="margin-top:20px"><div class="card pad-lg"><div style="font-size:2.4rem">${inv.icon}</div><h2>${esc(L("investors", inv, "name"))}</h2><p class="muted">${esc(L("investors", inv, "title"))}</p><p>${esc(L("investors", inv, "bio"))}</p></div>
    <div class="card pad-lg"><h3>${esc(_("{0}, the presentation", g.startup.icon + " " + g.startup.name))}</h3><p class="small muted">${esc(_("Your slides as the investor sees them. Weights shift with this investor's priorities."))}</p>${CRIT.map(([k, l]) => `<div style="margin:8px 0"><div class="row between small"><span>${esc(_(l))}</span><span>${esc(_("{0}% weight", Math.round(p.weights[k])))} · ${Math.round(p.scores[k])}</span></div>${bar(p.scores[k], "sky")}</div>`).join("")}</div></div>
    <div class="card pad-lg" style="margin-top:14px"><p class="muted small">${esc(_("Question {0} of {1}", n + 1, D.PITCH_QUESTIONS.length))}</p><h2>"${esc(qq)}"</h2>${ui.pitchNote ? `<p class="small" style="color:var(--sun)">${esc(ui.pitchNote)}</p>` : ""}<div class="stack">${q.a.map((a, i) => `<button class="opt" data-a="pitchAnswer" data-i="${i}">${esc(qa && qa[i] ? qa[i].t : a.t)}</button>`).join("")}</div></div></main></div>`;
  };

  screens.pitchResult = () => {
    const g = ui.game, p = g.pitch, inv = byId(D.INVESTORS, p.investorId);
    const meta = { approved: [_("✅ Investment Approved"), "var(--aloe)"], conditional: [_("🟡 Conditional Investment"), "var(--sun)"], rejected: [_("❌ Investment Rejected"), "var(--red)"] }[p.result];
    return `<div class="dark"><main class="wrap" id="main" style="padding-top:40px;padding-bottom:50px"><div class="card pad-lg center" style="border-color:${meta[1]}"><p class="muted">${esc(_("{0} scored your pitch", L("investors", inv, "name")))}</p><div class="big-score" style="color:${meta[1]}">${p.total}<small style="font-size:1.4rem">/100</small></div><h2>${esc(meta[0])}</h2>${p.overTime ? `<p class="small" style="color:var(--sun)">${esc(_("⏱ You ran over the 3-minute limit, which cost you points."))}</p>` : ""}<h3>${esc(p.funding ? _("Funding: {0} EGP (arrives next month)", fmt(p.funding)) : _("No funding this time"))}</h3>${p.covenant ? `<p>${esc(_("Condition: Reach {0} Social Impact by the end of month 12. Missing it costs you Decision Making points.", p.covenant.impact))}</p>` : ""}<p class="muted">${esc(p.result === "rejected" ? _("Rejections teach more than approvals. Look at your weakest criteria and use the remaining months to fix them.") : p.result === "conditional" ? _("The investor believes in you, but wants proof.") : _("Investors backed your numbers and your story."))}</p></div>
    <div class="card pad-lg" style="margin-top:14px"><h3>${esc(_("Scorecard"))}</h3><table class="t">${CRIT.map(([k, l]) => `<tr><td>${esc(_(l))}</td><td>${Math.round(p.scores[k])}/100</td></tr>`).join("")}</table></div>
    <div class="row" style="margin-top:18px"><button class="btn btn-primary" data-a="pitchDone">${esc(_("Continue to Chapter 7"))} ${FWD()}</button></div></main></div>`;
  };

  // ----- results -----
  screens.results = () => {
    const g = ui.game, f = g.finalResult, sb = f.score, ch = byId(D.CHALLENGES, g.startup.challengeId);
    const rows = [[_("Social Impact"), sb.impact, 250, "purple"], [_("Financial Health"), sb.finance, 200, "aloe"], [_("Innovation"), sb.innovation, 150, "sky"], [_("Product Quality"), sb.quality, 150, "pink"], [_("Scalability"), sb.scalability, 150, "sun"], [_("Decision Making"), sb.decision, 100, "purple"]];
    const ach = f.achievements.map(id => byId(D.ACHIEVEMENTS, id)).filter(Boolean);
    const bigAch = ach.length ? ach[ach.length - 1] : null;
    const best = f.bestDecision ? E.describeDecision(g, f.bestDecision) : null, worst = f.worstDecision ? E.describeDecision(g, f.worstDecision) : null;
    const pm = I18n.data("challenges", ch.id, "peopleMetric", ch.metrics.people), em = I18n.data("challenges", ch.id, "extraMetric", f.extraMetric);
    const endName = I18n.data("endings", f.ending, "name", f.endingName), endText = I18n.data("endings", f.ending, "text", f.endingText);
    return `<main class="wrap" id="main" style="padding-top:30px;padding-bottom:60px"><div class="row between">${wordmark()}<button class="btn btn-ghost btn-sm" data-a="toMenu">${esc(t("menu"))}</button></div>
    <div class="card pad-lg center" style="margin-top:18px;border-top:8px solid var(--pink)"><p class="muted">${esc(g.startup.icon)} ${esc(g.startup.name)} · ${esc(L("challenges", ch, "name"))} · ${esc(_("founder {0}", g.founder.name))}</p><div class="big-score">${sb.total}</div><p class="muted" style="margin:0">${esc(_("out of 1000"))}</p><h2 style="margin-top:12px">${esc(I18n.data("ranks", f.rank, "name", f.rank))}</h2><h3>${esc(endName)}</h3><p>${esc(endText)}</p></div>
    <div class="grid g2" style="margin-top:14px"><div class="card pad-lg"><h3>${esc(_("Score breakdown"))}</h3>${rows.map(r => `<div style="margin:10px 0"><div class="row between small"><span>${esc(r[0])}</span><b>${r[1]} / ${r[2]}</b></div>${bar(r[1] / r[2] * 100, r[3])}</div>`).join("")}</div>
    <div class="card pad-lg"><h3>${esc(_("Company metrics"))}</h3><div class="kv"><span>${esc(_("Final capital"))}</span><b>${fmt(f.finalCapital)} ${esc(EGP())}</b></div><div class="kv"><span>${esc(_("Total revenue"))}</span><b>${fmt(f.totalRevenue)} ${esc(EGP())}</b></div><div class="kv"><span>${esc(_("Profit / loss"))}</span><b>${fmt(f.profit)} ${esc(EGP())}</b></div><div class="kv"><span>${esc(_("Investor decision"))}</span><b>${esc(_(f.investor))}</b></div><div class="kv"><span>${esc(t("reputation"))}</span><b>${Math.round(g.resources.reputation)}</b></div><div class="kv"><span>${esc(_("Quality"))}</span><b>${Math.round(g.resources.quality)}</b></div><div class="kv"><span>${esc(lab("customers"))}</span><b>${fmt(g.resources.customers)}</b></div><div class="kv"><span>${esc(lab("sustainability"))}</span><b>${Math.round(g.resources.sustainability)}</b></div></div></div>
    <div class="card pad-lg" style="margin-top:14px"><h3>${esc(_("Impact summary"))}</h3><p>${_("Social Impact Score <b>{0}/100</b> · {1}: <b>{2}</b> · {3}: <b>{4}</b>", f.impact, esc(pm), fmt(f.beneficiaries), esc(em), fmt(f.extraValue))}</p></div>
    <div class="grid g2" style="margin-top:14px"><div class="card pad-lg"><h3>${esc(_("🏆 Biggest achievement"))}</h3><p>${bigAch ? `${bigAch.icon} <b>${esc(L("achievements", bigAch, "name"))}</b>: ${esc(L("achievements", bigAch, "desc"))}` : esc(_("No achievements this time. Next run, aim for a launch or a profitable month."))}</p>${best ? `<p class="small muted">${esc(_("Best decision: {0}, {1}", best.title, best.choice))}</p>` : ""}</div>
    <div class="card pad-lg"><h3>${esc(_("⚠️ Biggest mistake"))}</h3>${worst ? `<p>${_("<b>{0}</b>: you chose \"{1}\".", esc(worst.title), esc(worst.choice))}</p><p class="small muted">${esc(worst.why)}</p>` : `<p>${esc(_("No major decision mistakes. Well played."))}</p>`}</div></div>
    <div class="card pad-lg" style="margin-top:14px"><h3>${esc(_("Lessons learned"))}</h3>${f.lessons.map(l => { const x = l.kind ? E.lessonText(g, l) : l; return `<p><b>${esc(x.title)}.</b> ${esc(x.text)}</p>`; }).join("")}</div>
    <div class="grid g2" style="margin-top:14px"><div class="card pad-lg"><h3>${esc(_("Key decisions"))}</h3>${g.decisions.map(d => { const x = E.describeDecision(g, d); return `<div class="small" style="padding:4px 0"><b>${esc(_("M{0}", d.month))}</b> ${esc(x.title)} ${FWD()} ${esc(x.choice)}</div>`; }).join("") || `<p class='muted'>${esc(_("None"))}</p>`}</div><div class="card pad-lg"><h3>${esc(_("Achievements ({0})", ach.length))}</h3>${ach.map(a => `<div class="small" style="padding:4px 0">${a.icon} <b>${esc(L("achievements", a, "name"))}</b></div>`).join("") || `<p class='muted'>${esc(_("None"))}</p>`}</div></div>
    <p class="muted small" style="margin-top:14px">${esc(t("disclaimer"))} ${esc(_("Scores are for learning and are not official competition results."))}</p>
    <div class="row" style="margin-top:18px"><button class="btn btn-primary" data-a="newGameFresh">${esc(t("playAgain"))}</button><button class="btn btn-secondary" data-a="exportReport">${esc(t("exportReport"))}</button><button class="btn btn-ghost" data-a="exportSave">${esc(_("Export save"))}</button></div></main>`;
  };

  // ---------- modals ----------
  function renderModal() {
    const m = ui.modal, g = ui.game;
    const wrap = (inner, cls, closable) => `<div class="backdrop" data-backdrop="${closable ? 1 : 0}"><div class="modal ${cls || ""}" role="dialog" aria-modal="true" aria-labelledby="mtitle" tabindex="-1">${inner}</div></div>`;
    if (m.type === "confirmNew") return wrap(`<h2 id="mtitle">${esc(_("Replace your saved game?"))}</h2><p>${esc(_("You already have a game in progress. Starting a new journey will replace it. Export a backup first if you want to keep it."))}</p><div class="row"><button class="btn btn-danger" data-a="confirmNew">${esc(_("Replace and start"))}</button><button class="btn btn-ghost" data-a="closeModal" data-autofocus>${esc(_("Cancel"))}</button></div>`, "", true);
    if (m.type === "decision") {
      const d = E.getDecision(g); if (!d) return "";
      const ctx = E.businessContext(g), sel = m.sel, ch = chapter();
      return wrap(`<p class="muted small" style="margin:0">${esc(t("month"))} ${g.currentMonth} · ${esc(chName(ch))}</p><h2 id="mtitle">${esc(d.title)}</h2><p>${esc(d.scenario)}</p>
      <div class="card" style="margin-bottom:12px"><b class="small">${esc(_("BUSINESS CONTEXT"))}</b><div class="row small" style="gap:16px;margin-top:6px"><span>${esc(t("capital"))} <b>${fmt(ctx.capital)}</b></span><span>${esc(_("Quality"))} <b>${ctx.quality}</b></span><span>${esc(lab("satisfaction"))} <b>${ctx.satisfaction}</b></span><span>${esc(lab("customers"))} <b>${ctx.customers}</b></span><span>${esc(_("Runway"))} <b>${esc(_("{0} mo", ctx.runway.toFixed(1)))}</b></span></div><div class="small muted" style="margin-top:6px">${esc(_("Related: {0}", d.related.map(k => I18n.data("labels", k, "name", k)).join(rtl() ? "، " : ", ")))}</div></div>
      <div class="stack">${d.options.map(o => `<button class="opt ${sel === o.index ? "sel" : ""}" aria-pressed="${sel === o.index}" data-a="selOpt" data-i="${o.index}" ${o.affordable ? "" : "disabled"}><div class="t">${esc(o.t)}</div><div class="meta"><span class="badge">${esc(_("Cost: {0} EGP", fmt(o.cost)))}</span>${risk(o.risk)}${o.affordable ? "" : `<span class="badge high">${esc(_("Not enough capital"))}</span>`}</div></button>`).join("")}</div>
      ${sel !== null ? `<p class="small muted" style="margin-top:10px">${_("Capital after this choice: <b>{0} EGP</b>. Other effects are revealed after you confirm.", fmt(ctx.capital - d.options[sel].cost))}</p>` : ""}
      <div class="row between" style="margin-top:14px"><button class="btn btn-ghost" data-a="closeModal">${esc(_("Decide later"))}</button><button class="btn btn-primary" data-a="confirmDecision" ${sel === null ? "disabled" : ""}>${esc(_("Confirm decision"))}</button></div>`, "", true);
    }
    if (m.type === "decisionResult") return wrap(`<h2 id="mtitle">${esc(_("What happened"))}</h2><p><b>${esc(m.entry.title)}</b><br>${esc(_("You chose: {0}", m.entry.choice))}</p><div>${deltas(m.effects) || `<span class='muted small'>${esc(_("No immediate metric changes."))}</span>`}</div>${m.note ? `<p class="small err">${esc(_("Context matters: {0}", m.note))}</p>` : ""}<div class="card" style="margin:12px 0"><b class="small">${esc(_("WHY"))}</b><p style="margin:4px 0 0">${esc(m.entry.why)}</p></div><p class="small muted">${esc(_("Some effects may only appear in later months."))}</p><button class="btn btn-primary" data-a="closeModal" data-autofocus>${esc(_("Continue"))}</button>`, "", true);
    if (m.type === "event") {
      const e = E.getEvent(g);
      if (m.outcome) return wrap(`<h2 id="mtitle">${esc(m.title)}</h2><div>${deltas(m.outcome.effects) || `<span class='muted small'>${esc(_("No immediate metric changes."))}</span>`}</div><div class="card" style="margin:12px 0"><b class="small">${esc(_("WHY"))}</b><p style="margin:4px 0 0">${esc(m.outcome.why)}</p></div><button class="btn btn-primary" data-a="eventContinue" data-autofocus>${esc(_("Continue to monthly report"))}</button>`, "event-m", false);
      if (!e) return "";
      const crisis = ["economic-crisis", "data-scare", "product-bug", "regulation"].includes(e.id);
      return wrap(`<p class="badge" style="background:var(--sun);border:0">${esc(_("⚡ EVENT"))}</p><h2 id="mtitle" style="margin-top:8px">${esc(e.title)}</h2><p>${esc(e.text)}</p><div class="stack">${e.options.map(o => `<button class="opt" data-a="eventChoose" data-i="${o.index}"><div class="t">${esc(o.t)}</div><div class="meta">${o.cash ? `<span class="badge ${o.cash < 0 ? "high" : "low"}">${esc(o.cash < 0 ? _("Cost: {0} EGP", fmt(Math.abs(o.cash))) : _("Gain: {0} EGP", fmt(Math.abs(o.cash))))}</span>` : `<span class="badge">${esc(_("No direct cost"))}</span>`}</div></button>`).join("")}</div>`, "event-m" + (crisis ? " crisis" : ""), false);
    }
    if (m.type === "report") {
      const r = g.report; if (!r) return "";
      return wrap(`<h2 id="mtitle">${esc(_("Month {0} report", r.month))}</h2><table class="t"><tr><td>${esc(t("revenue"))}</td><td>${fmt(r.revenue)}</td></tr><tr><td>${esc(t("expenses"))}</td><td>-${fmt(r.expenses)}</td></tr><tr><td>${esc(_("Funding / grants"))}</td><td>+${fmt(r.funding)}</td></tr><tr><th>${esc(_("Net profit (accounting)"))}</th><th>${fmt(r.profit)}</th></tr><tr><th>${esc(_("Cash: {0} → {1}", fmt(r.startCash), fmt(r.endCash)))}</th><th>${r.cashFlow >= 0 ? "+" : ""}${fmt(r.cashFlow)}</th></tr></table>
      <p class="small">${_("Customers <b>{0}</b> ({1} new) · people served <b>{2}</b>", fmt(r.customers), (r.newCustomers >= 0 ? "+" : "") + r.newCustomers, fmt(r.beneficiaries))}</p>${r.delayedNotes.length ? `<p class="small">📬 ${r.delayedNotes.map(esc).join(" ")}</p>` : ""}<div>${deltas(r.effects)}</div>${r.eventEffects ? `<div class="small muted" style="margin-top:8px">${esc(_("After the event:"))} ${deltas(r.eventEffects)}</div>` : ""}
      <button class="btn btn-primary btn-block" style="margin-top:14px" data-a="reportContinue" data-autofocus>${esc(g.currentMonth >= 12 ? _("See final results") : _("Start month {0}", g.currentMonth + 1))}</button>`, "", false);
    }
    if (m.type === "launchResult") return wrap(`<h2 id="mtitle">${esc(m.tier === "great" ? _("🎉 Strong launch!") : m.tier === "ok" ? _("👍 Decent launch") : _("😬 Rocky launch"))}</h2><p>${esc(m.text)}</p><p>${_("Readiness score: <b>{0}</b> · first customers: <b>{1}</b> · invested {2} EGP", m.readiness, m.customers, fmt(m.total))}</p><div>${deltas(m.effects)}</div><button class="btn btn-primary" data-a="closeModal" data-autofocus>${esc(_("Continue"))}</button>`, "", true);
    return "";
  }

  // ---------- render ----------
  function render() {
    const sy = window.scrollY, key = ui.screen + (ui.screen === "game" ? ui.tab : "");
    document.documentElement.lang = ui.settings.lang; document.documentElement.dir = rtl() ? "rtl" : "ltr";
    document.body.classList.toggle("no-anim", !ui.settings.animations);
    const skip = document.querySelector("a.sr"); if (skip) skip.textContent = _("Skip to content");
    app.innerHTML = (screens[ui.screen] || screens.landing)() + (ui.modal ? renderModal() : "") + `<input type="file" id="importFile" accept=".json,application/json" class="sr" tabindex="-1" aria-hidden="true">`;
    if (key === ui.lastKey) window.scrollTo(0, sy); else window.scrollTo(0, 0);
    ui.lastKey = key;
    if (ui.modal) { const f = app.querySelector("[data-autofocus]") || app.querySelector(".modal button:not(:disabled)") || app.querySelector(".modal"); if (f) f.focus(); }
    if (ui.screen === "pitch") startPitchTimer();
  }
  let timerId;
  function startPitchTimer() {
    clearInterval(timerId);
    timerId = setInterval(() => { const el = document.getElementById("pitch-timer"); if (!el || ui.screen !== "pitch") { clearInterval(timerId); return; } const left = Math.max(0, E.PITCH_LIMIT - Math.floor((Date.now() - ui.pitchStarted) / 1000)); el.textContent = Math.floor(left / 60) + ":" + String(left % 60).padStart(2, "0"); el.parentNode.style.background = left === 0 ? "var(--red)" : left <= 30 ? "var(--sun)" : "var(--aloe)"; el.parentNode.style.color = left === 0 ? "#fff" : "var(--ink)"; const w = document.getElementById("pitch-warn"); if (w) w.textContent = left === 0 ? _("Time is up: finishing now costs you points.") : ""; }, 500);
  }

  // ---------- actions ----------
  function download(name, text, type) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: type || "application/json" })); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
  function startFlow() { ui.form = { founder: "", difficulty: "normal", challenge: null, startup: "", desc: "", icon: "💡", model: null, error: "" }; ui.launch = { features: ["core"], dev: 2000, target: "consumers", test: true, strategy: "partner" }; ui.modal = null; ui.screen = "founder"; }
  function fail(msg) { ui.form.error = msg; sfx("bad"); render(); }
  function loadSaved() {
    const l = S.loadGame();
    if (!l) { toast(_("No saved game found."), "bad"); return false; }
    if (l.error) { toast(_(l.error), "bad"); return false; }
    ui.game = l.state; ui.tab = "overview"; ui.modal = null;
    if (ui.game.status === "ended") { ui.screen = "results"; return true; }
    ui.screen = ui.game.currentChapter === 6 && ui.game.pitch && !ui.game.pitch.result ? "pitch" : "game";
    if (ui.screen === "pitch") ui.pitchStarted = Date.now();
    if (ui.screen === "game") { if (ui.game.eventPending) ui.modal = { type: "event" }; else if (ui.game.report) ui.modal = { type: "report" }; else openDecisionIfNeeded(); }
    return true;
  }
  function handleError(r) { if (r && r.error) { toast(r.message || r.error, "bad"); sfx("bad"); return true; } return false; }

  const actions = {
    go(d) { ui.screen = d.to; ui.modal = null; if (d.to === "howto") ui.howStep = 0; },
    toMenu() { if (ui.game && ui.game.status === "active") save(); ui.modal = null; ui.screen = "menu"; },
    newGame() { if (S.hasValidSave()) ui.modal = { type: "confirmNew" }; else startFlow(); },
    newGameFresh() { S.deleteSave(); startFlow(); },
    confirmNew() { S.deleteSave(); ui.game = null; startFlow(); },
    closeModal() { ui.modal = null; },
    continue() { loadSaved(); },
    howNext() { ui.howStep = Math.min(HOW.length - 1, ui.howStep + 1); },
    howPrev() { ui.howStep = Math.max(0, ui.howStep - 1); },
    toggle(d) { ui.settings[d.k] = !ui.settings[d.k]; S.saveSettings(ui.settings); },
    lang(d) { setLanguage(d.v); S.saveSettings(ui.settings); },
    diff(d) { ui.form.difficulty = d.v; },
    founderNext() { if (!ui.form.founder.trim()) return fail(_("Please enter your name.")); ui.form.error = ""; ui.screen = "challenge"; },
    pickChallenge(d) { ui.form.challenge = d.v; ui.form.error = ""; },
    challengeNext() { if (!ui.form.challenge) return fail(_("Choose a social challenge.")); ui.form.error = ""; ui.screen = "create"; },
    pickIcon(d) { ui.form.icon = d.v; },
    createNext() { if (!ui.form.startup.trim()) return fail(_("Please name your startup.")); ui.form.error = ""; ui.screen = "model"; },
    pickModel(d) { ui.form.model = d.v; ui.form.error = ""; },
    startGame() {
      const f = ui.form; if (!f.model) return fail(_("Choose a business model."));
      const r = E.newGame({ founderName: f.founder, startupName: f.startup, description: f.desc, icon: f.icon, challengeId: f.challenge, businessModel: f.model, difficulty: f.difficulty });
      if (r.error) return fail(_(r.error));
      ui.game = r.state; ui.tab = "overview"; ui.screen = "game"; save(); sfx("good"); openDecisionIfNeeded();
    },
    tab(d) { if (ui.game) { ui.tab = d.v; } },
    openDecision() { openDecisionIfNeeded(); if (!ui.modal) ui.modal = { type: "decision", sel: null }; },
    selOpt(d) { ui.modal.sel = Number(d.i); sfx("click"); },
    confirmDecision() {
      const g = ui.game, m = ui.modal; if (!m || m.sel === null || !g.decisionPending) return;
      const r = E.decide(g, g.decisionPending, m.sel); if (handleError(r)) return;
      ui.modal = { type: "decisionResult", entry: r.entry, effects: r.effects, note: r.note }; save(); afterAction(); sfx("good");
    },
    runMonth() {
      const g = ui.game, r = E.runMonth(g);
      if (r.error) { toast(r.message || r.error, "bad"); sfx("bad"); if (r.error === "budget") ui.tab = "finance"; return; }
      if (g.status === "ended") { goResults(); return; }
      save(); afterAction(); ui.modal = g.eventPending ? { type: "event" } : { type: "report" };
    },
    eventChoose(d) {
      const g = ui.game, e = E.getEvent(g), r = E.resolveEvent(g, g.eventPending, Number(d.i)); if (handleError(r)) return;
      ui.modal = { type: "event", title: e.title, outcome: r }; save(); afterAction(); sfx(r.effects.some(x => x.delta < 0) ? "bad" : "good");
    },
    eventContinue() { ui.modal = { type: "report" }; },
    reportContinue() {
      const g = ui.game, r = E.advance(g); if (handleError(r)) return;
      save(); afterAction();
      if (g.status === "ended") { goResults(); return; }
      ui.modal = null; ui.tab = "overview"; openDecisionIfNeeded();
    },
    hire(d) { const r = E.hire(ui.game, d.v); if (handleError(r)) return; save(); afterAction(); sfx("good"); toast(_("Hired! Salary is added to your monthly costs."), "good"); },
    autoFit() { E.autoFit(ui.game); save(); },
    pivot(d) { const r = E.pivotModel(ui.game, d.v); if (handleError(r)) return; save(); toast(_("You pivoted your business model."), "good"); },
    launch() {
      const Lc = ui.launch, r = E.launchMVP(ui.game, { features: Lc.features, devBudget: Lc.dev, target: Lc.target, testing: Lc.test, strategy: Lc.strategy }); if (handleError(r)) return;
      ui.modal = { type: "launchResult", tier: r.tier, text: r.text, customers: r.customers, readiness: r.readiness, total: r.total, effects: r.effects }; save(); afterAction(); sfx(r.tier === "rocky" ? "bad" : "win");
    },
    goPitch() { const r = E.startPitch(ui.game); if (handleError(r)) return; ui.pitchStarted = Date.now(); ui.pitchNote = ""; ui.screen = "pitch"; },
    pitchAnswer(d) {
      const g = ui.game, r = E.answerPitch(g, g.pitch.answers.length, Number(d.i), (Date.now() - ui.pitchStarted) / 1000); if (handleError(r)) return;
      ui.pitchNote = r.note || ""; sfx("click");
      if (r.done) { save(); afterAction(); ui.screen = "pitchResult"; sfx(g.pitch.result === "rejected" ? "bad" : "win"); }
    },
    pitchDone() { ui.screen = "game"; ui.tab = "overview"; ui.pitchNote = ""; save(); openDecisionIfNeeded(); },
    saveNow() { if (ui.game) { save(); toast(_("Game saved."), "good"); } },
    exportSave() { if (!ui.game) return toast(_("Nothing to export."), "bad"); download("startup-tycoon-save.json", S.exportSave(ui.game)); },
    exportReport() { download("startup-tycoon-report.txt", E.reportText(ui.game), "text/plain"); },
    pickImport() { const f = document.getElementById("importFile"); if (f) f.click(); },
    deleteSave() { S.deleteSave(); toast(_("Save deleted.")); }
  };

  document.addEventListener("click", e => {
    const bd = e.target.closest("[data-backdrop]");
    if (bd && e.target === bd && bd.dataset.backdrop === "1") { ui.modal = null; render(); return; }
    const el = e.target.closest("[data-a]"); if (!el || el.disabled) return;
    const fn = actions[el.dataset.a]; if (!fn) return;
    if (!/^(selOpt|tab)$/.test(el.dataset.a)) sfx("click");
    fn(el.dataset); render();
  });
  document.addEventListener("input", e => {
    const el = e.target;
    if (el.dataset.f) { ui.form[el.dataset.f] = el.value; return; }
    if (el.dataset.demo) { ui.demoBudget = Number(el.value); const est = Math.round(ui.demoBudget / 260 * 0.9 * 3); document.getElementById("demoEst").textContent = est; document.getElementById("demoCash").textContent = fmt(20000 - ui.demoBudget); const lbl = el.previousElementSibling; if (lbl) lbl.innerHTML = _("Marketing budget: <b>{0} {1}</b>", fmt(ui.demoBudget), esc(EGP())); return; }
    if (el.dataset.alloc && ui.game) {
      E.setAlloc(ui.game, el.dataset.alloc, el.value);
      document.getElementById("av-" + el.dataset.alloc).textContent = fmt(ui.game.alloc[el.dataset.alloc]);
      const p = E.plannedSpend(ui.game); document.getElementById("plan-total").textContent = fmt(p.total);
      document.getElementById("plan-warn").textContent = p.total > ui.game.resources.capital ? _("Planned spending is above your capital.") : "";
      return;
    }
    if (el.dataset.launch === "dev") { ui.launch.dev = Number(el.value); const lbl = el.previousElementSibling; if (lbl) lbl.innerHTML = _("<b>2. Extra development budget:</b> {0} {1}", fmt(ui.launch.dev), esc(EGP())); }
  });
  document.addEventListener("change", e => {
    const el = e.target;
    if (el.dataset.alloc && ui.game) { save(); return; }
    if (el.dataset.launch) {
      const k = el.dataset.launch;
      if (k === "feat") { ui.launch.features = el.checked ? ui.launch.features.concat([el.value]) : ui.launch.features.filter(x => x !== el.value); }
      if (k === "target") ui.launch.target = el.value;
      if (k === "strategy") ui.launch.strategy = el.value;
      if (k === "test") ui.launch.test = el.checked;
      render(); return;
    }
    if (el.id === "importFile" && el.files && el.files[0]) {
      const rd = new FileReader();
      rd.onload = () => {
        const r = S.importSave(String(rd.result));
        if (r.error) { toast(_(r.error), "bad"); return; }
        ui.game = r.state; S.saveGame(r.state); toast(r.modified ? _("Imported, but this file was edited outside the game.") : _("Save imported."), r.modified ? "" : "good");
        loadSaved(); render();
      };
      rd.onerror = () => toast(_("Could not read that file."), "bad");
      rd.readAsText(el.files[0]);
    }
  });
  document.addEventListener("keydown", e => {
    if (!ui.modal) return;
    if (e.key === "Escape") { const bd = document.querySelector("[data-backdrop]"); if (bd && bd.dataset.backdrop === "1") { ui.modal = null; render(); } }
    if (e.key === "Tab") {
      const m = document.querySelector(".modal"); if (!m) return;
      const f = Array.from(m.querySelectorAll("button:not(:disabled),input,[tabindex]:not([tabindex='-1'])")); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  window.addEventListener("error", () => { /* keep the game responsive if an unexpected error occurs */ });

  // PWA: register the service worker and tell the player when an update is ready
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register("./sw.js").then(reg => {
      reg.addEventListener("updatefound", () => { const w = reg.installing; if (w) w.addEventListener("statechange", () => { if (w.state === "installed" && navigator.serviceWorker.controller) toast(_("A new version is ready. Reload to update.")); }); });
    }).catch(() => { /* offline support is optional */ });
  }
  render();
})();
