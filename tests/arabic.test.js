const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs"), path = require("path");
require("../js/data.js"); require("../js/i18n.js");
["ar-data", "ar-decisions-1", "ar-decisions-2", "ar-decisions-3", "ar-events", "ar-events-2", "ar-msg-1", "ar-msg-2"].forEach(f => require("../js/" + f + ".js"));
require("../js/engine.js"); require("../js/save.js");
const D = globalThis.ST.Data, A = globalThis.ST.AR, MSG = globalThis.ST.AR_MSG, E = globalThis.ST.Engine, I = globalThis.ST.I18n;
const ph = s => (String(s).match(/\{[a-z0-9]+\}/g) || []).sort().join(",");
const hasArabic = s => /[؀-ۿ]/.test(s);
const tags = s => (String(s).match(/<[^>]+>/g) || []).sort().join(",");

test("every decision is translated with matching structure and placeholders", () => {
  D.DECISIONS.forEach(d => {
    const a = A.decisions[d.id]; assert.ok(a, "missing " + d.id);
    assert.ok(hasArabic(a.title) && hasArabic(a.scenario), d.id);
    assert.strictEqual(ph(a.title + a.scenario), ph(d.title + d.scenario), "placeholders " + d.id);
    assert.strictEqual(a.options.length, d.options.length, d.id);
    d.options.forEach((o, i) => {
      assert.ok(hasArabic(a.options[i].t) && hasArabic(a.options[i].why), d.id + "#" + i);
      assert.strictEqual(ph(a.options[i].t), ph(o.t), "placeholders option " + d.id + "#" + i);
      if (o.ctx) assert.ok(a.options[i].note, "ctx note " + d.id + "#" + i);
      if (o.delayed && o.delayed.note) assert.ok(a.options[i].delayedNote, "delayed note " + d.id + "#" + i);
    });
  });
});

test("every event is translated with matching structure", () => {
  D.EVENTS.forEach(e => {
    const a = A.events[e.id]; assert.ok(a, "missing " + e.id);
    assert.ok(hasArabic(a.title) && hasArabic(a.text), e.id);
    assert.strictEqual(ph(a.title + a.text), ph(e.title + e.text), "placeholders " + e.id);
    assert.strictEqual(a.options.length, e.options.length, e.id);
    e.options.forEach((o, i) => { assert.ok(hasArabic(a.options[i].t) && hasArabic(a.options[i].why), e.id + "#" + i); if (o.delayed) assert.ok(a.options[i].delayedNote, "delayed " + e.id + "#" + i); });
  });
});

test("every data table entry is translated", () => {
  const T = A.data, need = (kind, id, fields) => { const x = T[kind] && T[kind][id]; assert.ok(x, kind + "/" + id); fields.forEach(f => assert.ok(x[f] !== undefined && x[f] !== "", kind + "/" + id + "." + f)); return x; };
  D.CHALLENGES.forEach(c => { const x = need("challenges", c.id, ["name", "short", "description", "beneficiaries", "market", "research", "noun", "peopleMetric", "extraMetric"]); assert.strictEqual(x.directions.length, c.directions.length); });
  D.MODELS.forEach(m => need("models", m.id, ["name", "desc", "revenue", "costs", "acquisition"]));
  D.ROLES.forEach(r => { const x = need("roles", r.id, ["name", "productivity"]); assert.strictEqual(x.skills.length, r.skills.length); });
  D.FEATURES.forEach(f => need("features", f.id, ["name", "note"]));
  D.TARGETS.forEach(f => need("targets", f.id, ["name", "note"]));
  D.STRATEGIES.forEach(f => need("strategies", f.id, ["name", "note"]));
  D.INVESTORS.forEach(f => need("investors", f.id, ["name", "title", "bio"]));
  D.CHAPTERS.forEach(f => need("chapters", f.id, ["name", "desc", "objective"]));
  D.ENDINGS.forEach(f => need("endings", f.id, ["name", "text"]));
  D.ACHIEVEMENTS.forEach(f => need("achievements", f.id, ["name", "desc"]));
  D.RANKS.forEach(f => need("ranks", f.name, ["name"]));
  Object.keys(D.DIFFICULTY).forEach(k => need("difficulty", k, ["name", "label"]));
  ["reputation", "quality", "satisfaction", "morale", "reach", "impact", "sustainability", "research", "innovation", "customers", "beneficiaries", "capital", "revenue", "scalability"].forEach(k => need("labels", k, ["name"]));
  D.PITCH_QUESTIONS.forEach((q, i) => { const x = T.pitchQuestions[i]; assert.ok(x && x.q && x.a.length === q.a.length, "pitch " + i); q.a.forEach((a, j) => { assert.ok(x.a[j].t); if (a.req) assert.ok(x.a[j].note, "pitch note " + i + "/" + j); }); });
});

test("every UI/engine message string used in code has an Arabic translation with the same placeholders", () => {
  const src = ["../js/ui.js", "../js/engine.js"].map(f => fs.readFileSync(path.join(__dirname, f), "utf8")).join("\n");
  const keys = new Set();
  for (const m of src.matchAll(/(?<![\w.])(?:_|M)\(\s*"((?:[^"\\]|\\.)*)"/g)) keys.add(JSON.parse('"' + m[1] + '"'));
  assert.ok(keys.size > 200);
  const missing = [...keys].filter(k => !MSG[k]);
  assert.deepStrictEqual(missing, [], "untranslated: " + missing.slice(0, 5).join(" | "));
  keys.forEach(k => { assert.strictEqual(ph(MSG[k]), ph(k), "placeholders: " + k); assert.strictEqual(tags(MSG[k]), tags(k), "html tags: " + k); });
});

test("Arabic mode: engine returns Arabic text for decisions, events, errors and report", () => {
  E.setLang("ar");
  const s = E.newGame({ founderName: "سارة", startupName: "مياه", description: "", icon: "💧", challengeId: "clean-water", businessModel: "direct", difficulty: "normal", seed: 5 }).state;
  const d = E.getDecision(s);
  assert.ok(hasArabic(d.title) && hasArabic(d.scenario) && d.options.every(o => hasArabic(o.t)));
  assert.ok(!/\{[sp]\}/.test(d.scenario + d.title), "unfilled placeholder");
  assert.ok(hasArabic(E.decide(s, "x", 0).error));
  const r = E.decide(s, s.decisionPending, 0); assert.ok(r.ok && hasArabic(r.entry.why));
  s.alloc.product = 50000; s.alloc.marketing = 50000; const b = E.runMonth(s); assert.ok(hasArabic(b.message));
  // every event text renders with no leftover placeholders
  D.EVENTS.forEach(e => { s.eventPending = e.id; const ev = E.getEvent(s); assert.ok(hasArabic(ev.title) && !/\{[sp]\}/.test(ev.title + ev.text)); });
  D.DECISIONS.forEach(dd => { s.decisionPending = dd.id; const x = E.getDecision(s); assert.ok(hasArabic(x.scenario) && !/\{[sp]\}/.test(x.scenario)); });
  E.endGame(s, "bankrupt"); assert.ok(hasArabic(E.reportText(s)));
  assert.ok(s.finalResult.lessons.every(l => hasArabic(E.lessonText(s, l).title)));
  E.setLang("en");
  assert.ok(!hasArabic(E.getDecision(E.newGame({ founderName: "A", startupName: "B", description: "", icon: "x", challengeId: "food-security", businessModel: "marketplace", difficulty: "easy", seed: 1 }).state).title));
});

test("i18n falls back to English for unknown keys", () => {
  I.setLang("ar"); assert.strictEqual(I.m("zzz unknown {0}", 3), "zzz unknown 3"); I.setLang("en");
});

test("every context-conditioned option has an Arabic note", () => {
  const D = globalThis.ST.Data, AR = globalThis.ST.AR;
  for (const d of D.DECISIONS) d.options.forEach((o, i) => {
    if (o.ctx) assert.ok(AR.decisions[d.id].options[i].note, d.id + "#" + i);
  });
});
