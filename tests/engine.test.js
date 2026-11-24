const test = require("node:test");
const assert = require("node:assert");
require("../js/data.js"); require("../js/i18n.js"); require("../js/engine.js"); require("../js/save.js");
const E = globalThis.ST.Engine, D = globalThis.ST.Data, S = globalThis.ST.Save;

const setup = (o) => E.newGame(Object.assign({ founderName: "Alex", startupName: "EcoLoop", description: "x", icon: "🌱", challengeId: "food-security", businessModel: "marketplace", difficulty: "normal", seed: 42 }, o || {}));

// Simple bot: picks decisions by policy, hires, launches, pitches, runs 12 months.
function play(seed, policy) {
  const o = setup({ seed, difficulty: policy.difficulty || "normal", challengeId: D.CHALLENGES[seed % 5].id, businessModel: D.CHALLENGES[seed % 5].availableModels[0] });
  const s = o.state;
  let guard = 0;
  while (s.status === "active" && guard++ < 200) {
    const d = E.getDecision(s);
    if (d) {
      const opts = D.DECISIONS.find(x => x.id === d.id).options;
      let idx = policy.pickIdx(opts, s);
      if (!d.options[idx].affordable) idx = d.options.findIndex(o2 => o2.affordable);
      const r = E.decide(s, d.id, idx); assert.ok(r.ok || r.error);
    }
    if (s.currentChapter >= 4 && policy.hire) policy.hire.forEach(id => { if (s.team.length < policy.hire.length) E.hire(s, id); });
    if (s.currentChapter >= 5 && !s.mvp.launched && s.currentMonth >= 6) E.launchMVP(s, { features: ["core", "mobile", "payments"], target: "consumers", strategy: "partner", devBudget: 3000, testing: true });
    if (s.currentChapter === 6 && (!s.pitch || !s.pitch.result)) { E.startPitch(s); for (let q = 0; q < 3; q++) E.answerPitch(s, q, 0); }
    if (policy.alloc) Object.assign(s.alloc, policy.alloc(s));
    E.autoFit(s);
    const r = E.runMonth(s);
    if (r.error) throw new Error("run error: " + r.error + " m" + s.currentMonth);
    if (s.status !== "active") break;
    if (s.eventPending) E.resolveEvent(s, s.eventPending, policy.eventIdx || 0);
    if (s.report) E.advance(s);
    Object.values(s.resources).forEach(v => assert.ok(Number.isFinite(v)));
  }
  if (s.status === "active") E.endGame(s, "complete");
  return s;
}

const good = { pickIdx: (opts) => opts.reduce((b, o, i) => (o.score > opts[b].score ? i : b), 0), hire: ["marketer", "engineer"], alloc: (s) => (s.mvp.launched ? { product: 2500, marketing: 3500, ops: 1200, research: 900, impact: 1500 } : { product: 2500, marketing: 500, ops: 300, research: 900, impact: 800 }) };
const lazy = { pickIdx: (opts) => opts.reduce((b, o, i) => (o.score < opts[b].score ? i : b), 0), hire: ["marketer"], alloc: () => ({ product: 0, marketing: 0, ops: 0, research: 0, impact: 0 }) };
const spender = { pickIdx: () => 0, hire: ["engineer", "marketer", "analyst", "ops", "sales", "finance", "designer", "impact"], alloc: () => ({ product: 15000, marketing: 15000, ops: 8000, research: 8000, impact: 8000 }), difficulty: "hard" };

test("content quantities meet MVP minimums", () => {
  assert.ok(D.CHALLENGES.length >= 3 && D.MODELS.length === 6 && D.DECISIONS.length >= 20 && D.EVENTS.length >= 15);
  assert.strictEqual(D.INVESTORS.length, 4); assert.strictEqual(D.ROLES.length, 8); assert.strictEqual(D.ACHIEVEMENTS.length, 15); assert.strictEqual(D.CHAPTERS.length, 7);
  for (let ch = 1; ch <= 7; ch++) { const months = E.MONTH_CHAPTER.filter(c => c === ch).length; assert.ok(D.DECISIONS.filter(d => d.ch === ch).length >= months, "chapter " + ch); }
});

test("new game initialises resources per difficulty", () => {
  assert.strictEqual(setup({ difficulty: "easy" }).state.resources.capital, 150000);
  assert.strictEqual(setup({ difficulty: "hard" }).state.resources.capital, 85000);
  const s = setup().state; assert.strictEqual(s.resources.capital, 100000); assert.strictEqual(s.currentMonth, 1);
});

test("setup validation rejects bad input", () => {
  assert.ok(setup({ startupName: "" }).error); assert.ok(setup({ challengeId: "nope" }).error); assert.ok(setup({ businessModel: "x" }).error);
});

test("decision engine rejects invalid ids, options and repeated clicks", () => {
  const s = setup().state; const d = E.getDecision(s);
  assert.ok(E.decide(s, "bogus", 0).error); assert.ok(E.decide(s, d.id, 99).error); assert.ok(E.decide(s, d.id, -1).error);
  assert.ok(E.decide(s, d.id, 0).ok); assert.ok(E.decide(s, d.id, 0).error);
});

test("cannot afford expensive option", () => {
  const s = setup().state; s.resources.capital = 100; const d = E.getDecision(s);
  const pricey = d.options.find(o => o.cost > 100);
  if (pricey) assert.ok(E.decide(s, d.id, pricey.index).error);
});

test("financial engine: cash arithmetic and accounting profit vs cash for B2B", () => {
  const s = setup({ businessModel: "b2b", challengeId: "quality-education" }).state;
  E.decide(s, s.decisionPending, 2 >= 0 ? 0 : 0);
  s.mvp.launched = true; s.resources.customers = 10; s.resources.satisfaction = 80; s.resources.quality = 70;
  const start = s.resources.capital; const r = E.runMonth(s).report;
  assert.strictEqual(r.profit, r.revenue - r.expenses);
  assert.strictEqual(r.endCash, start + (r.revenue - Math.round(r.revenue * 0.5)) + r.funding - r.expenses);
  assert.ok(r.receivableChange > 0);
});

test("budget over capital is blocked", () => {
  const s = setup().state; E.decide(s, s.decisionPending, 0); s.alloc.product = 50000; s.alloc.marketing = 50000;
  const r = E.runMonth(s); assert.strictEqual(r.error, "budget");
});

test("hiring requires chapter, funds and is not repeatable", () => {
  const s = setup().state; assert.ok(E.hire(s, "engineer").error);
  s.currentChapter = 4; assert.ok(E.hire(s, "engineer").ok); assert.ok(E.hire(s, "engineer").error); assert.ok(E.hire(s, "nope").error);
  s.resources.capital = 100; assert.ok(E.hire(s, "marketer").error);
});

test("MVP launch validates and depends on readiness", () => {
  const s = setup().state; s.currentChapter = 5;
  assert.ok(E.launchMVP(s, { features: [], target: "consumers", strategy: "soft" }).error);
  assert.ok(E.launchMVP(s, { features: ["core"], target: "x", strategy: "soft" }).error);
  const r = E.launchMVP(s, { features: ["core"], target: "consumers", strategy: "big", devBudget: 0 });
  assert.ok(r.ok && r.tier === "rocky"); assert.ok(E.launchMVP(s, { features: ["core"], target: "consumers", strategy: "soft" }).error);
});

test("investor pitch produces valid result and funding", () => {
  const s = setup().state; s.currentChapter = 6; s.currentMonth = 8;
  assert.ok(E.startPitch(s).ok); for (let q = 0; q < 3; q++) E.answerPitch(s, q, 0);
  assert.ok(["approved", "conditional", "rejected"].includes(s.pitch.result)); assert.ok(s.pitch.funding >= 0);
  assert.ok(E.answerPitch(s, 0, 0).error);
  const w = Object.values(s.pitch.weights).reduce((a, b) => a + b, 0); assert.ok(Math.abs(w - 100) < 0.01);
});

test("scoring is bounded and does not double count", () => {
  const s = play(7, good); const f = s.finalResult;
  assert.ok(f.score.total >= 0 && f.score.total <= 1000);
  assert.ok(f.score.impact <= 250 && f.score.finance <= 200 && f.score.innovation <= 150 && f.score.quality <= 150 && f.score.scalability <= 150 && f.score.decision <= 100);
  const again = E.endGame(s, "complete"); assert.strictEqual(again.result, f);
  const ids = s.achievements.map(a => a.id); assert.strictEqual(new Set(ids).size, ids.length);
});

test("full playthroughs complete without NaN for three strategies", () => {
  const out = {};
  for (const [name, p] of [["good", good], ["lazy", lazy], ["spender", spender]]) {
    const scores = [], ends = {};
    for (let seed = 1; seed <= 40; seed++) { const s = play(seed, p); assert.strictEqual(s.status, "ended"); scores.push(s.finalResult.score.total); ends[s.finalResult.ending] = (ends[s.finalResult.ending] || 0) + 1; }
    out[name] = { avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length), min: Math.min(...scores), max: Math.max(...scores), ends };
  }
  console.log(JSON.stringify(out));
});

test("save service validates, rejects corrupt data, exports/imports", () => {
  const s = play(3, good);
  assert.ok(S.validateState(s).ok);
  const bad = JSON.parse(JSON.stringify(s)); bad.resources.capital = "lots"; assert.ok(!S.validateState(bad).ok);
  const bad2 = JSON.parse(JSON.stringify(s)); bad2.currentMonth = 99; assert.ok(!S.validateState(bad2).ok);
  assert.ok(S.saveGame(s).ok); assert.ok(S.loadGame().state);
  const txt = S.exportSave(s); const imp = S.importSave(txt); assert.ok(imp.state && !imp.modified);
  assert.ok(S.importSave("not json").error); assert.ok(S.importSave(JSON.stringify({ app: "other" })).error);
  const tampered = JSON.parse(txt); tampered.state.resources.capital += 1; assert.ok(S.importSave(JSON.stringify(tampered)).modified);
  S.deleteSave(); assert.strictEqual(S.loadGame(), null);
});

test("bankruptcy ends the game", () => {
  const s = setup().state; E.decide(s, s.decisionPending, 0); s.resources.capital = 500;
  const r = E.runMonth(s); assert.strictEqual(s.status, "ended"); assert.strictEqual(s.finalResult.ending, "bankrupt"); assert.ok(r.ok);
});

test("pitch over the time limit is penalised", () => {
  const a = setup().state; a.currentChapter = 6; a.currentMonth = 8; E.startPitch(a); const b = JSON.parse(JSON.stringify(a));
  for (let q = 0; q < 3; q++) E.answerPitch(a, q, 0, 30);
  for (let q = 0; q < 3; q++) E.answerPitch(b, q, 0, E.PITCH_LIMIT + 60);
  assert.strictEqual(a.pitch.overTime, false); assert.strictEqual(b.pitch.overTime, true); assert.ok(b.pitch.total < a.pitch.total);
});

test("challenge-specific events only appear for their own challenge", () => {
  const own = D.EVENTS.filter(e => e.when && e.when.challenge);
  assert.equal(own.length, 15);
  for (const ch of D.CHALLENGES) assert.equal(own.filter(e => e.when.challenge === ch.id).length, 3);
  for (let i = 0; i < 40; i++) {
    const s = setup({ challengeId: "clean-water", businessModel: D.CHALLENGES.find(c => c.id === "clean-water").availableModels[0], difficulty: "hard", seed: 100 + i }).state;
    s.currentMonth = 6; s.mvp.launched = true;
    const id = E.rollEvent(s);
    if (id) { const ev = D.EVENTS.find(e => e.id === id); assert.ok(!ev.when.challenge || ev.when.challenge === "clean-water"); }
  }
});
