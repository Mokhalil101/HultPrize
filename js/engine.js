/* Startup Tycoon — game engine (decisions, finance, impact, events, investors, scoring, progression). Pure logic, no DOM. */
(function (g) {
  const D = g.ST.Data;
  const clamp = (v, a, b) => Math.min(b === undefined ? 100 : b, Math.max(a === undefined ? 0 : a, v));
  const KEYMAP = { rep: "reputation", quality: "quality", sat: "satisfaction", morale: "morale", reach: "reach", impact: "impact", sust: "sustainability", research: "research", innov: "innovation", customers: "customers", ben: "beneficiaries", cash: "capital" };
  const BOUNDED = ["reputation", "quality", "satisfaction", "morale", "reach", "impact", "sustainability", "research", "innovation"];
  const LABELS = { reputation: "Reputation", quality: "Product Quality", satisfaction: "Customer Satisfaction", morale: "Team Morale", reach: "Market Reach", impact: "Social Impact", sustainability: "Sustainability", research: "Research", innovation: "Innovation", customers: "Customers", beneficiaries: "People served", capital: "Capital" };
  const MONTH_CHAPTER = [1, 2, 3, 4, 4, 5, 5, 6, 7, 7, 7, 7];
  const SAVE_VERSION = 1;

  const byId = (arr, id) => arr.find(x => x.id === id);

  // ---------- seeded RNG (state lives in s.rng) ----------
  function rand(s) {
    s.rng = (s.rng + 0x6D2B79F5) >>> 0;
    let t = s.rng;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function pick(s, arr) { return arr[Math.floor(rand(s) * arr.length)]; }

  function fill(str, s) {
    const ch = byId(D.CHALLENGES, s.startup.challengeId);
    return String(str).replace(/\{s\}/g, s.startup.name).replace(/\{p\}/g, ch ? ch.noun : "the problem");
  }

  // ---------- helpers ----------
  function snap(s) { return Object.assign({}, s.resources); }
  function diffRes(before, after) {
    const out = [];
    Object.keys(after).forEach(k => {
      const d = Math.round(after[k] - before[k]);
      if (d !== 0 && LABELS[k]) out.push({ key: k, label: LABELS[k], delta: d });
    });
    return out;
  }
  function modelOf(s) { return byId(D.MODELS, s.startup.businessModel) || D.MODELS[0]; }
  function challengeOf(s) { return byId(D.CHALLENGES, s.startup.challengeId); }
  function modelFits(s) { return challengeOf(s).availableModels.includes(s.startup.businessModel); }
  function has(s, id) { return s.team.some(t => t.roleId === id); }
  function teamBonus(s) {
    const b = { eng: 0, mkt: 0, analyst: 0, ops: 0, sales: 0, fin: 0, design: 0, soc: 0 };
    s.team.forEach(t => { const r = byId(D.ROLES, t.roleId); if (r) b[r.key] += r.bonus; });
    return b;
  }
  function salaries(s) { return s.team.reduce((a, t) => a + (byId(D.ROLES, t.roleId) || { salary: 0 }).salary, 0); }
  function fixedCost(s) { return 1500 + 400 * s.team.length + Math.round(modelOf(s).opCost * 0.5); }
  function allocTotal(s) { const a = s.alloc; return a.product + a.marketing + a.ops + a.research + a.impact; }
  function plannedSpend(s) {
    const alloc = allocTotal(s), sal = salaries(s), fixed = fixedCost(s);
    return { alloc, salaries: sal, fixed, total: alloc + sal + fixed };
  }

  function applyFx(s, fx, opt) {
    opt = opt || {};
    const mult = opt.mult === undefined ? 1 : opt.mult;
    const neg = opt.neg === undefined ? 1 : opt.neg;
    Object.keys(fx || {}).forEach(k => {
      let v = fx[k];
      if (k.indexOf("pb_") === 0) { const n = k.slice(3); s.pitchBonus[n] = (s.pitchBonus[n] || 0) + v; return; }
      const rk = KEYMAP[k];
      if (!rk) return;
      v = v > 0 ? v * mult : v * neg;
      s.resources[rk] += v;
      if (BOUNDED.includes(rk)) s.resources[rk] = clamp(s.resources[rk]);
      else s.resources[rk] = Math.max(rk === "capital" ? -1e9 : 0, Math.round(s.resources[rk]));
    });
    s.resources.capital = Math.round(s.resources.capital);
  }

  // ---------- game creation ----------
  function validateSetup(o) {
    const name = (o.founderName || "").trim(), sn = (o.startupName || "").trim();
    if (!name || name.length > 30) return "Founder name is required (max 30 characters).";
    if (!sn || sn.length > 40) return "Startup name is required (max 40 characters).";
    if ((o.description || "").length > 200) return "Description is too long (max 200 characters).";
    if (!byId(D.CHALLENGES, o.challengeId)) return "Choose a social challenge.";
    if (!byId(D.MODELS, o.businessModel)) return "Choose a business model.";
    if (!D.DIFFICULTY[o.difficulty]) return "Choose a difficulty.";
    return null;
  }

  function newGame(o) {
    const err = validateSetup(o);
    if (err) return { error: err };
    const diff = D.DIFFICULTY[o.difficulty], ch = byId(D.CHALLENGES, o.challengeId);
    const seed = (o.seed !== undefined ? o.seed : ((Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0)) >>> 0;
    const res = { capital: diff.capital, reputation: 10, quality: 20, satisfaction: 50, morale: 70, reach: 5, impact: 0, sustainability: 50, customers: 0, beneficiaries: 0, research: 5, innovation: 15 };
    Object.keys(ch.startingBonus).forEach(k => { res[k] = clamp(res[k] + ch.startingBonus[k]); });
    const s = {
      gameId: "g" + seed.toString(36) + Date.now().toString(36), version: SAVE_VERSION, status: "active", endReason: null,
      createdAt: Date.now(), updatedAt: Date.now(),
      currentChapter: 1, currentMonth: 1, difficulty: o.difficulty, startCapital: diff.capital,
      founder: { name: o.founderName.trim() },
      startup: { name: o.startupName.trim(), description: (o.description || "").trim(), icon: o.icon || "💡", challengeId: o.challengeId, businessModel: o.businessModel },
      resources: res,
      alloc: { product: 2500, marketing: 500, ops: 300, research: 800, impact: 500 },
      team: [], decisions: [], events: [], achievements: [], finalResult: null,
      pending: [], pitchBonus: {}, history: [], notes: [],
      finance: { totalRevenue: 0, totalExpenses: 0, totalFunding: 0, receivable: 0, lastProfit: 0 },
      mvp: { launched: false, features: [], target: null, strategy: null, tested: false, result: null },
      pitch: null, decisionPending: null, eventPending: null, report: null, flags: { pivoted: false }, rng: seed
    };
    beginMonth(s);
    checkAchievements(s);
    return { state: s };
  }

  // ---------- decisions ----------
  function chapterForMonth(m) { return MONTH_CHAPTER[clamp(m, 1, 12) - 1]; }

  function pickDecision(s) {
    const seen = new Set(s.decisions.map(d => d.id));
    let pool = D.DECISIONS.filter(d => d.ch === s.currentChapter && !seen.has(d.id));
    if (!pool.length) pool = D.DECISIONS.filter(d => d.ch >= s.currentChapter - 1 && !seen.has(d.id));
    if (!pool.length) return null;
    return pick(s, pool).id;
  }
  function beginMonth(s) { s.decisionPending = pickDecision(s); }

  function getDecision(s) {
    if (!s.decisionPending) return null;
    const d = byId(D.DECISIONS, s.decisionPending);
    if (!d) return null;
    return {
      id: d.id, title: fill(d.title, s), scenario: fill(d.scenario, s), related: d.related, ch: d.ch,
      options: d.options.map((o, i) => ({ index: i, t: fill(o.t, s), cost: o.cost, risk: o.risk, affordable: s.resources.capital >= o.cost }))
    };
  }
  function businessContext(s) {
    const r = s.resources;
    return { capital: r.capital, quality: Math.round(r.quality), satisfaction: Math.round(r.satisfaction), customers: r.customers, runway: runway(s) };
  }

  function decide(s, decisionId, idx) {
    if (s.status !== "active") return { error: "The game is not active." };
    if (!s.decisionPending || s.decisionPending !== decisionId) return { error: "That decision is not available." };
    const d = byId(D.DECISIONS, decisionId);
    if (!d || !Number.isInteger(idx) || idx < 0 || idx >= d.options.length) return { error: "Invalid option." };
    const o = d.options[idx];
    if (s.resources.capital < o.cost) return { error: "Not enough capital for this option." };
    const before = snap(s);
    s.resources.capital -= o.cost;
    let mult = 1, note = null;
    if (o.ctx) {
      const cur = o.ctx.stat === "team" ? s.team.length : s.resources[o.ctx.stat];
      if (cur < o.ctx.min) { mult = o.ctx.mult; note = o.ctx.note; }
    }
    applyFx(s, o.fx, { mult });
    if (o.delayed) s.pending.push({ month: s.currentMonth + o.delayed.in, fx: o.delayed.fx || {}, cash: o.delayed.cash || 0, note: o.delayed.note || "A delayed effect of an earlier decision." });
    s.decisionPending = null;
    const entry = { id: d.id, month: s.currentMonth, chapter: s.currentChapter, title: fill(d.title, s), choice: fill(o.t, s), cost: o.cost, score: o.score, risk: o.risk, why: o.why, contextNote: note };
    s.decisions.push(entry);
    checkAchievements(s);
    return { ok: true, entry, effects: diffRes(before, snap(s)), note };
  }

  // ---------- team ----------
  function hire(s, roleId) {
    if (s.status !== "active") return { error: "The game is not active." };
    const r = byId(D.ROLES, roleId);
    if (!r) return { error: "Unknown role." };
    if (has(s, roleId)) return { error: "You already hired this role." };
    if (s.currentChapter < 4) return { error: "Hiring unlocks in Chapter 4." };
    if (s.resources.capital < r.hire + r.salary) return { error: "Not enough capital: you need the hiring cost plus one month of salary." };
    s.resources.capital -= r.hire;
    s.team.push({ roleId, hiredMonth: s.currentMonth });
    applyFx(s, { morale: 3 });
    checkAchievements(s);
    return { ok: true };
  }

  // ---------- allocation ----------
  function setAlloc(s, key, value) {
    if (!(key in s.alloc)) return { error: "Unknown budget line." };
    const v = Math.round(Number(value));
    if (!isFinite(v) || v < 0) return { error: "Invalid amount." };
    s.alloc[key] = Math.min(v, 50000);
    return { ok: true };
  }
  function estRevenue(s) { return Math.round(s.resources.customers * modelOf(s).arpu * 0.8); }
  function autoFit(s) {
    const p = plannedSpend(s), room = s.resources.capital + estRevenue(s) - p.salaries - p.fixed;
    if (room <= 0) { Object.keys(s.alloc).forEach(k => { s.alloc[k] = 0; }); return; }
    if (p.alloc > room) { const f = room / p.alloc; Object.keys(s.alloc).forEach(k => { s.alloc[k] = Math.floor(s.alloc[k] * f / 100) * 100; }); }
  }
  function pivotModel(s, modelId) {
    if (s.currentChapter !== 3) return { error: "You can only pivot your business model in Chapter 3." };
    if (s.flags.pivoted) return { error: "You already pivoted once." };
    if (!byId(D.MODELS, modelId) || modelId === s.startup.businessModel) return { error: "Choose a different model." };
    if (s.resources.capital < 3000) return { error: "Pivoting costs 3,000 EGP." };
    s.resources.capital -= 3000; s.startup.businessModel = modelId; s.flags.pivoted = true;
    applyFx(s, { rep: -2 });
    return { ok: true };
  }

  // ---------- progression / blockers ----------
  function cheapest(arr, key) { return Math.min.apply(null, arr.map(x => x[key])); }
  function blockers(s) {
    const out = [];
    if (s.status !== "active") { out.push("The game has ended."); return out; }
    if (s.eventPending) out.push("Respond to the pending event first.");
    if (s.report) out.push("Continue from the monthly report first.");
    if (s.decisionPending) out.push("Make this month's decision first.");
    const m = s.currentMonth, r = s.resources;
    if (m === 5 && s.team.length < 1 && r.capital >= cheapest(D.ROLES, "hire") + cheapest(D.ROLES, "salary")) out.push("Chapter 4 milestone: hire at least one teammate.");
    if (m === 7 && !s.mvp.launched && r.capital >= 1500) out.push("Chapter 5 milestone: launch your MVP in the Product tab.");
    if (m === 8 && (!s.pitch || !s.pitch.result)) out.push("Chapter 6 milestone: pitch to the investor.");
    return out;
  }
  function runway(s) {
    const burn = Math.max(1, plannedSpend(s).total - lastRevenue(s));
    return Math.max(0, s.resources.capital / burn);
  }
  function lastRevenue(s) { const h = s.history[s.history.length - 1]; return h ? h.revenue : 0; }
  function objective(s) { return byId(D.CHAPTERS, s.currentChapter).objective; }

  // ---------- financial + simulation engine ----------
  function simulate(s) {
    const r = s.resources, a = s.alloc, m = modelOf(s), ch = challengeOf(s), b = teamBonus(s);
    const launched = s.mvp.launched, fit = modelFits(s), c0 = r.customers;
    const sal = salaries(s), fixed = fixedCost(s);
    const target = byId(D.TARGETS, s.mvp.target) || { mult: 1 };

    // product + research
    const researchBoost = 1 + (has(s, "analyst") ? 0.3 : 0);
    let q = r.quality + a.product / 1500 * (1 + b.eng) + (has(s, "designer") ? 0.8 : 0) + a.research / 6000 - (r.quality > 60 ? 1.5 : 1);
    r.quality = clamp(q);
    r.innovation = clamp(r.innovation + a.research / 2500 * researchBoost + a.product / 10000 - 0.3);
    r.research = clamp(r.research + a.research / 1800 * researchBoost - 0.4);

    // customers
    const acq = launched ? a.marketing / m.cac * (0.4 + r.quality / 100) * (0.5 + r.reputation / 150) * (1 + b.mkt) * (fit ? 1 : 0.85) * (1 + r.reach / 200) * target.mult * 3 : 0;
    const churnRate = 0.04 + (100 - r.satisfaction) / 100 * 0.12;
    const c1 = Math.max(0, Math.round(c0 + acq - c0 * churnRate));
    const avg = (c0 + c1) / 2;
    r.customers = c1;
    r.reach = clamp(r.reach + a.marketing / 2000 * (launched ? 1 : 0.6) - 0.5);

    // satisfaction & reputation
    const satTarget = clamp(r.quality * 0.7 + Math.min(30, a.ops / 50) + (has(s, "designer") ? 4 : 0) + (has(s, "ops") ? 5 : 0));
    r.satisfaction = clamp(r.satisfaction + (satTarget - r.satisfaction) * 0.25);
    r.reputation = clamp(r.reputation + (r.satisfaction - 55) / 70 + (r.impact > 30 ? 0.3 : 0));

    // financials
    const revenue = Math.round(avg * m.arpu * (0.7 + 0.3 * r.satisfaction / 100) * (1 + b.sales));
    const variable = Math.round(avg * m.varCost * (1 - b.fin));
    const marketing = a.marketing, product = a.product;
    const opsCost = a.ops + a.research + a.impact;
    const expenses = Math.round(a.product + a.marketing + opsCost + sal + fixed + variable);
    const recvNew = Math.round(revenue * m.credit), recvOld = s.finance.receivable;
    const cashIn = revenue - recvNew + recvOld;
    s.finance.receivable = recvNew;

    // impact
    const socMult = 1 + b.soc;
    const benAdd = Math.round((avg * ch.benFactor * 0.4 + a.impact / ch.impactCost) * socMult);
    r.beneficiaries += benAdd;
    r.impact = clamp(r.impact + (a.impact / 500 + avg * ch.benFactor * 0.4 / 900) * socMult * (1 - r.impact / 140) - 0.3);

    // morale & sustainability
    const stress = r.capital < 20000 ? 12 : 0;
    r.morale = clamp(r.morale + (72 + (has(s, "impact") ? 3 : 0) - stress - Math.max(0, s.team.length - 5) * 2 - r.morale) * 0.2);
    const susTarget = clamp(35 + Math.min(1.2, revenue / Math.max(1, expenses)) * 35 + m.scal * 0.12 + (r.capital > 50000 ? 8 : 0) + (fit ? 0 : -8));
    r.sustainability = clamp(r.sustainability + (susTarget - r.sustainability) * 0.3);

    return { revenue, variable, salaries: sal, fixed, marketing, product, ops: a.ops, research: a.research, impactSpend: a.impact, expenses, cashIn, recv: recvNew - recvOld, avgCustomers: avg, newCustomers: Math.max(0, c1 - c0), benAdd };
  }

  function eligible(e, s) {
    const w = e.when || {};
    if (w.min && s.currentMonth < w.min) return false;
    if (w.max && s.currentMonth > w.max) return false;
    if (w.launched && !s.mvp.launched) return false;
    if (w.team && s.team.length < w.team) return false;
    if (s.events.some(x => x.id === e.id)) return false;
    return true;
  }
  function rollEvent(s) {
    const diff = D.DIFFICULTY[s.difficulty];
    if (s.currentMonth === 1 || s.currentMonth === 8) return null; // keep intro and investor day clean
    if (rand(s) > diff.eventChance) return null;
    const pool = D.EVENTS.filter(e => eligible(e, s));
    if (!pool.length) return null;
    return pick(s, pool).id;
  }
  function getEvent(s) {
    if (!s.eventPending) return null;
    const e = byId(D.EVENTS, s.eventPending);
    if (!e) return null;
    return { id: e.id, title: fill(e.title, s), text: fill(e.text, s), options: e.options.map((o, i) => ({ index: i, t: o.t, cash: o.cash })) };
  }

  function runMonth(s) {
    if (s.status !== "active") return { error: "The game is not active." };
    const m = modelOf(s), p = plannedSpend(s);
    const estRev = Math.round(s.resources.customers * m.arpu * 0.8);
    if (p.salaries + p.fixed > s.resources.capital + estRev) return endGame(s, "bankrupt");
    const bl = blockers(s);
    if (bl.length) return { error: bl[0] };
    if (p.total > s.resources.capital + estRev) return { error: "budget", message: "Planned spending (" + p.total.toLocaleString("en-US") + " EGP) is more than your capital plus expected revenue (" + (s.resources.capital + estRev).toLocaleString("en-US") + " EGP). Lower the budget or use Auto-fit." };

    const before = snap(s);
    const start = s.resources.capital;
    // delayed effects first
    const due = s.pending.filter(x => x.month <= s.currentMonth);
    s.pending = s.pending.filter(x => x.month > s.currentMonth);
    let funding = 0; const delayedNotes = [];
    due.forEach(x => { applyFx(s, x.fx); funding += x.cash; delayedNotes.push(x.note); });

    const sim = simulate(s);
    const profit = sim.revenue - sim.expenses;
    s.resources.capital = Math.round(start + sim.cashIn + funding - sim.expenses);
    s.finance.totalRevenue += sim.revenue; s.finance.totalExpenses += sim.expenses;
    if (funding > 0) s.finance.totalFunding += funding;
    s.finance.lastProfit = profit;

    const rep = { month: s.currentMonth, chapter: s.currentChapter, revenue: sim.revenue, fixed: sim.fixed, variable: sim.variable, salaries: sim.salaries, marketing: sim.marketing, product: sim.product, ops: sim.ops + sim.research + sim.impactSpend, funding, expenses: sim.expenses, profit, receivableChange: sim.recv, cashFlow: s.resources.capital - start, startCash: start, endCash: s.resources.capital, newCustomers: sim.newCustomers, customers: s.resources.customers, beneficiaries: s.resources.beneficiaries, delayedNotes, effects: diffRes(before, snap(s)) };
    s.history.push({ month: s.currentMonth, revenue: sim.revenue, expenses: sim.expenses, profit, capital: s.resources.capital, customers: s.resources.customers, impact: Math.round(s.resources.impact), beneficiaries: s.resources.beneficiaries, fixed: rep.fixed, variable: rep.variable, salaries: rep.salaries, marketing: rep.marketing, product: rep.product, ops: rep.ops, funding: rep.funding, cashFlow: rep.cashFlow });
    s.report = rep;
    s.eventPending = rollEvent(s);
    checkAchievements(s);
    return { ok: true, report: rep, event: getEvent(s) };
  }

  function resolveEvent(s, eventId, idx) {
    if (!s.eventPending || s.eventPending !== eventId) return { error: "That event is not active." };
    const e = byId(D.EVENTS, eventId);
    if (!e || !Number.isInteger(idx) || idx < 0 || idx >= e.options.length) return { error: "Invalid option." };
    const o = e.options[idx], sev = D.DIFFICULTY[s.difficulty].sev;
    if (o.cash < 0 && s.resources.capital + o.cash < -20000) return { error: "Not enough capital." };
    const before = snap(s);
    applyFx(s, Object.assign({ cash: o.cash || 0 }, o.fx), { neg: sev });
    if (o.delayed) s.pending.push({ month: s.currentMonth + o.delayed.in, fx: o.delayed.fx || {}, cash: o.delayed.cash || 0, note: o.delayed.note });
    s.events.push({ id: e.id, month: s.currentMonth, title: fill(e.title, s), choice: o.t, why: o.why });
    s.eventPending = null;
    if (s.report) { s.report.eventEffects = diffRes(before, snap(s)); s.report.eventWhy = o.why; }
    checkAchievements(s);
    return { ok: true, why: o.why, effects: diffRes(before, snap(s)) };
  }

  function advance(s) {
    if (s.status !== "active") return { error: "The game is not active." };
    if (!s.report) return { error: "Run the month first." };
    if (s.eventPending) return { error: "Respond to the event first." };
    s.report = null;
    if (s.resources.capital < 0) return endGame(s, "bankrupt");
    if (s.currentMonth >= 12) return endGame(s, "complete");
    s.currentMonth += 1;
    s.currentChapter = chapterForMonth(s.currentMonth);
    beginMonth(s);
    checkAchievements(s);
    return { ok: true };
  }

  // ---------- MVP ----------
  function launchMVP(s, o) {
    if (s.status !== "active") return { error: "The game is not active." };
    if (s.currentChapter < 5) return { error: "MVP development unlocks in Chapter 5." };
    if (s.mvp.launched) return { error: "You already launched." };
    const features = Array.isArray(o.features) ? o.features.filter((f, i, a) => a.indexOf(f) === i) : [];
    if (features.length < 1 || features.some(f => !byId(D.FEATURES, f))) return { error: "Choose at least one valid feature." };
    const target = byId(D.TARGETS, o.target), strat = byId(D.STRATEGIES, o.strategy);
    if (!target) return { error: "Choose your target customers." };
    if (!strat) return { error: "Choose a launch strategy." };
    const devBudget = Math.max(0, Math.round(Number(o.devBudget) || 0));
    const featCost = features.reduce((a, f) => a + byId(D.FEATURES, f).cost, 0);
    const testCost = o.testing ? 2000 : 0;
    const total = featCost + devBudget + testCost + strat.cost;
    if (total > s.resources.capital) return { error: "This plan costs " + total.toLocaleString("en-US") + " EGP and you have " + s.resources.capital.toLocaleString("en-US") + " EGP." };

    const before = snap(s), r = s.resources;
    r.capital -= total;
    const fq = features.reduce((a, f) => a + byId(D.FEATURES, f).quality, 0);
    const fi = features.reduce((a, f) => a + byId(D.FEATURES, f).innov, 0);
    const hasCore = features.includes("core");
    const readiness = r.quality * 0.5 + fq * 1.2 + devBudget / 800 + (o.testing ? 10 : 0) + (has(s, "engineer") ? 6 : 0) + (hasCore ? 6 : -8) + (s.decisions.some(d => d.id === "beta-test" && d.score >= 8) ? 6 : 0);
    r.quality = clamp(r.quality + fq * 0.5 + devBudget / 2500);
    r.innovation = clamp(r.innovation + fi);
    let tier = readiness >= 62 ? "great" : readiness >= 45 ? "ok" : "rocky";
    let customers = 0;
    const tm = target.mult;
    if (strat.id === "soft") customers = Math.round(10 * tm * (tier === "great" ? 1.6 : 1));
    if (strat.id === "partner") { customers = Math.round(14 * tm * (tier === "rocky" ? 0.8 : 1.3)); applyFx(s, { rep: 3, impact: 3 }); }
    if (strat.id === "big") {
      if (tier === "great") { customers = Math.round(35 * tm); applyFx(s, { rep: 5, reach: 10 }); }
      else if (tier === "ok") { customers = Math.round(18 * tm); applyFx(s, { reach: 6 }); }
      else { customers = Math.round(8 * tm); applyFx(s, { rep: -8, sat: -10, reach: 4 }); }
    }
    if (target.id === "institutions" || target.id === "businesses") customers = Math.max(customers, target.id === "institutions" ? 2 : 4);
    if (modelOf(s).id === "b2b" && target.id !== "businesses" && target.id !== "institutions") customers = Math.round(customers * 0.4);
    r.customers += customers;
    s.mvp = { launched: true, features, target: target.id, strategy: strat.id, tested: !!o.testing, result: tier, readiness: Math.round(readiness), customers, month: s.currentMonth, cost: total };
    const text = { great: "A strong launch! Users love it and early word of mouth is positive.", ok: "A decent launch. The product works, but users found rough edges.", rocky: "A rocky launch. The product was not ready and early users were frustrated." }[tier];
    checkAchievements(s);
    return { ok: true, tier, text, customers, readiness: Math.round(readiness), total, effects: diffRes(before, snap(s)) };
  }

  // ---------- investor pitch ----------
  function criteria(s) {
    const r = s.resources, m = modelOf(s), pb = s.pitchBonus || {};
    const b = teamBonus(s);
    const profit = s.finance.lastProfit;
    const problem = 25 + r.research * 0.6 + r.reputation * 0.15 + (has(s, "analyst") ? 6 : 0);
    const innovation = r.innovation + r.quality * 0.15;
    const business = 20 + (modelFits(s) ? 18 : 0) + Math.min(25, r.customers / 3) + r.sustainability * 0.2;
    const financial = Math.min(35, runway(s) * 5) + (profit > 0 ? 20 : profit > -3000 ? 8 : 0) + r.sustainability * 0.35;
    const impact = r.impact * 0.8 + Math.min(20, r.beneficiaries / 150);
    const scalability = m.scal * 0.45 + r.reach * 0.3 + r.quality * 0.15 + Math.min(10, s.team.length * 2);
    const raw = { problem, innovation, business, financial, impact, scalability };
    Object.keys(raw).forEach(k => { raw[k] = clamp(raw[k] + (pb[k] || 0)); });
    void b;
    return raw;
  }
  const BASE_W = { problem: 15, innovation: 15, business: 20, financial: 20, impact: 20, scalability: 10 };
  function weightsFor(inv) {
    const w = Object.assign({}, BASE_W);
    Object.keys(inv.focus).forEach(k => { w[k] = Math.max(5, w[k] + inv.focus[k] * 0.5); });
    const sum = Object.keys(w).reduce((a, k) => a + w[k], 0);
    Object.keys(w).forEach(k => { w[k] = w[k] / sum * 100; });
    return w;
  }
  function startPitch(s) {
    if (s.status !== "active") return { error: "The game is not active." };
    if (s.currentChapter !== 6) return { error: "Investor Day happens in Chapter 6 (month 8)." };
    if (s.pitch && s.pitch.result) return { error: "You already pitched." };
    if (s.pitch) return { ok: true, pitch: s.pitch };
    const inv = pick(s, D.INVESTORS);
    s.pitch = { investorId: inv.id, answers: [], scores: criteria(s), result: null, total: null, funding: 0, weights: weightsFor(inv) };
    return { ok: true, pitch: s.pitch };
  }
  function answerPitch(s, qIdx, aIdx) {
    const p = s.pitch;
    if (!p || p.result) return { error: "No active pitch." };
    if (qIdx !== p.answers.length) return { error: "Answer the questions in order." };
    const q = D.PITCH_QUESTIONS[qIdx];
    if (!q || !q.a[aIdx]) return { error: "Invalid answer." };
    const a = q.a[aIdx];
    let fx = a.fx, note = null;
    if (a.req) {
      const cur = a.req.stat === "team" ? s.team.length : s.resources[a.req.stat];
      if (cur < a.req.min) { fx = Object.assign({}, a.fx); Object.keys(fx).forEach(k => { if (fx[k] > 0) fx[k] = 0; }); Object.keys(a.req.fail).forEach(k => { fx[k] = (fx[k] || 0) + a.req.fail[k]; }); note = a.req.note; }
    }
    Object.keys(fx).forEach(k => { p.scores[k] = clamp(p.scores[k] + fx[k]); });
    p.answers.push({ q: qIdx, a: aIdx, note });
    if (p.answers.length >= D.PITCH_QUESTIONS.length) finalizePitch(s);
    return { ok: true, note, done: !!p.result };
  }
  function finalizePitch(s) {
    const p = s.pitch, inv = byId(D.INVESTORS, p.investorId);
    let total = 0;
    Object.keys(p.weights).forEach(k => { total += p.scores[k] * p.weights[k] / 100; });
    p.total = Math.round(total);
    const diff = D.DIFFICULTY[s.difficulty];
    const bar = s.difficulty === "hard" ? 5 : s.difficulty === "easy" ? -3 : 0;
    if (total >= 62 + bar) { p.result = "approved"; p.funding = Math.round(inv.max * Math.min(1, total / 85) / 1000) * 1000; }
    else if (total >= 45 + bar) { p.result = "conditional"; p.funding = Math.round(inv.max * 0.4 * (total / 70) / 1000) * 1000; p.covenant = { impact: Math.round(s.resources.impact + 12), text: "Reach " + Math.round(s.resources.impact + 12) + " Social Impact by the end of month 12." }; }
    else { p.result = "rejected"; p.funding = 0; }
    void diff;
    if (p.funding > 0) { s.pending.push({ month: s.currentMonth + 1, fx: {}, cash: p.funding, note: "Investor funding of " + p.funding.toLocaleString("en-US") + " EGP arrived." }); s.finance.totalFunding += 0; }
    if (p.result === "approved") applyFx(s, { rep: 6, morale: 6 });
    if (p.result === "conditional") applyFx(s, { rep: 2, morale: 2 });
    if (p.result === "rejected") applyFx(s, { morale: -5 });
    checkAchievements(s);
  }

  // ---------- scoring ----------
  function scalabilityScore(s) {
    const r = s.resources, m = modelOf(s);
    return clamp(m.scal * 0.45 + r.reach * 0.3 + r.quality * 0.15 + Math.min(10, s.team.length * 2));
  }
  function scoreBreakdown(s) {
    const r = s.resources;
    const impact = Math.min(250, r.impact * 1.6 + Math.min(90, r.beneficiaries / 60));
    const finance = Math.min(200, clamp(r.capital / s.startCapital * 60, 0, 80) + (s.finance.lastProfit > 0 ? 50 : 0) + Math.min(70, s.finance.totalRevenue / s.startCapital * 35));
    const innovation = Math.min(150, r.innovation * 1.5);
    const quality = Math.min(150, (r.quality * 0.7 + r.satisfaction * 0.3) * 1.5);
    const scal = Math.min(150, scalabilityScore(s) * 1.5);
    let dm = s.decisions.length ? s.decisions.reduce((a, d) => a + d.score, 0) / s.decisions.length * 10 : 0;
    if (s.pitch && s.pitch.covenant && r.impact < s.pitch.covenant.impact) dm -= 15;
    const decision = clamp(dm, 0, 100);
    const parts = { impact, finance, innovation, quality, scalability: scal, decision };
    Object.keys(parts).forEach(k => { parts[k] = Math.round(parts[k]); });
    parts.total = parts.impact + parts.finance + parts.innovation + parts.quality + parts.scalability + parts.decision;
    return parts;
  }
  function rankFor(score) { return D.RANKS.find(r => score >= r.min).name; }

  function checkAchievements(s) {
    const gained = [];
    D.ACHIEVEMENTS.forEach(a => {
      if (!s.achievements.some(x => x.id === a.id) && a.check(s)) { s.achievements.push({ id: a.id, month: s.currentMonth }); gained.push(a); }
    });
    s.newAchievements = (s.newAchievements || []).concat(gained.map(a => a.id));
    return gained;
  }

  function endGame(s, reason) {
    if (s.finalResult) return { ok: true, result: s.finalResult };
    s.status = "ended"; s.endReason = reason; s.report = null; s.eventPending = null; s.decisionPending = null;
    checkAchievements(s);
    const score = scoreBreakdown(s);
    let ending = "pivot";
    if (reason === "bankrupt") ending = "bankrupt";
    else if (score.total >= 750 && s.resources.impact >= 50) ending = "hero";
    else if (score.total >= 550 || (s.finance.lastProfit > 0 && s.resources.capital > s.startCapital * 0.5)) ending = "sustainable";
    const sorted = s.decisions.slice().sort((a, b) => a.score - b.score);
    const best = s.decisions.slice().sort((a, b) => b.score - a.score)[0] || null;
    const worst = sorted[0] && sorted[0].score <= 6 ? sorted[0] : null;
    const lessons = [];
    sorted.filter(d => d.score <= 5).slice(0, 3).forEach(d => lessons.push({ title: d.title, text: d.why }));
    if (reason === "bankrupt") lessons.push({ title: "Cash is oxygen", text: "Profit on paper does not pay salaries. Watch your runway every month and cut early." });
    if (s.resources.satisfaction < 45) lessons.push({ title: "Customers leave quietly", text: "Low satisfaction drives churn, which makes growth expensive." });
    if (s.resources.impact < 25) lessons.push({ title: "Mission drift", text: "Your social impact stayed low. Spend on impact activities and measure them." });
    if (!s.mvp.launched) lessons.push({ title: "Ship something", text: "Without launching, you cannot learn from real customers." });
    if (!lessons.length) lessons.push({ title: "Keep learning", text: "Your decisions were sound. Next time, try a different challenge or a harder difficulty." });
    const ch = challengeOf(s), extra = Math.round(s.resources.beneficiaries * ch.metrics.extraPerPerson);
    s.finalResult = {
      score, rank: rankFor(score.total), ending, endingName: byId(D.ENDINGS, ending).name, endingText: byId(D.ENDINGS, ending).text,
      finalCapital: s.resources.capital, totalRevenue: s.finance.totalRevenue, totalExpenses: s.finance.totalExpenses, totalFunding: s.finance.totalFunding,
      profit: s.finance.totalRevenue - s.finance.totalExpenses, beneficiaries: s.resources.beneficiaries, extraMetric: ch.metrics.extra, extraValue: extra,
      impact: Math.round(s.resources.impact), investor: s.pitch ? s.pitch.result : "none", investorName: s.pitch ? byId(D.INVESTORS, s.pitch.investorId).name : null,
      achievements: s.achievements.map(a => a.id), bestDecision: best, worstDecision: worst, lessons, month: s.currentMonth, finishedAt: Date.now(), reason
    };
    return { ok: true, result: s.finalResult };
  }

  function reportText(s) {
    const f = s.finalResult; if (!f) return "";
    const L = [];
    L.push("STARTUP TYCOON - FINAL REPORT", "(Student-built game inspired by the Hult Prize mission. Not an official result.)", "");
    L.push("Startup: " + s.startup.name + " (" + challengeOf(s).name + ", " + modelOf(s).name + ")", "Founder: " + s.founder.name, "Difficulty: " + D.DIFFICULTY[s.difficulty].name, "");
    L.push("Final score: " + f.score.total + " / 1000 - " + f.rank, "Ending: " + f.endingName, f.endingText, "");
    L.push("Score breakdown: Impact " + f.score.impact + "/250, Finance " + f.score.finance + "/200, Innovation " + f.score.innovation + "/150, Quality " + f.score.quality + "/150, Scalability " + f.score.scalability + "/150, Decisions " + f.score.decision + "/100", "");
    L.push("Final capital: " + f.finalCapital.toLocaleString("en-US") + " EGP", "Total revenue: " + f.totalRevenue.toLocaleString("en-US") + " EGP", "Profit/Loss: " + f.profit.toLocaleString("en-US") + " EGP", "People served: " + f.beneficiaries.toLocaleString("en-US"), f.extraMetric + ": " + f.extraValue.toLocaleString("en-US"), "Social impact: " + f.impact + "/100", "Investor: " + f.investor, "");
    L.push("KEY DECISIONS");
    s.decisions.forEach(d => L.push("- Month " + d.month + ": " + d.title + " -> " + d.choice));
    L.push("", "LESSONS LEARNED");
    f.lessons.forEach(x => L.push("- " + x.title + ": " + x.text));
    L.push("", "ACHIEVEMENTS");
    f.achievements.forEach(id => { const a = byId(D.ACHIEVEMENTS, id); if (a) L.push("- " + a.name + ": " + a.desc); });
    return L.join("\n");
  }

  g.ST.Engine = {
    SAVE_VERSION, LABELS, MONTH_CHAPTER, clamp, byId, rand, fill,
    newGame, validateSetup, getDecision, decide, businessContext, hire, setAlloc, autoFit, pivotModel,
    blockers, runway, objective, plannedSpend, salaries, fixedCost, allocTotal, teamBonus, has, modelOf, challengeOf, modelFits,
    runMonth, resolveEvent, getEvent, advance, launchMVP, criteria, weightsFor, startPitch, answerPitch,
    scoreBreakdown, scalabilityScore, rankFor, checkAchievements, endGame, reportText, chapterForMonth
  };
  if (typeof module !== "undefined") module.exports = g.ST.Engine;
})(typeof window !== "undefined" ? window : globalThis);
