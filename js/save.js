/* Startup Tycoon — persistence service. The only module that touches localStorage. */
(function (g) {
  const KEYS = { save: "startup_tycoon_save_v1", settings: "startup_tycoon_settings", achievements: "startup_tycoon_achievements", history: "startup_tycoon_history" };
  const memory = {};
  const mem = { getItem: k => (k in memory ? memory[k] : null), setItem: (k, v) => { memory[k] = String(v); }, removeItem: k => { delete memory[k]; } };
  let usingMemory = false;
  function store() {
    try {
      if (typeof localStorage === "undefined") { usingMemory = true; return mem; }
      localStorage.setItem("__st_test", "1"); localStorage.removeItem("__st_test");
      return localStorage;
    } catch (e) { usingMemory = true; return mem; }
  }
  const STATUS = ["active", "ended"];
  const NUM_RES = ["capital", "reputation", "quality", "satisfaction", "morale", "reach", "impact", "sustainability", "customers", "beneficiaries", "research", "innovation"];

  function validateState(s) {
    const D = g.ST.Data, errors = [];
    const isNum = v => typeof v === "number" && isFinite(v);
    if (!s || typeof s !== "object") return { ok: false, errors: ["Save is not an object."] };
    if (!isNum(s.version) || s.version > g.ST.Engine.SAVE_VERSION || s.version < 1) errors.push("Unsupported save version.");
    if (typeof s.gameId !== "string") errors.push("Missing game id.");
    if (!STATUS.includes(s.status)) errors.push("Invalid status.");
    if (!Number.isInteger(s.currentMonth) || s.currentMonth < 1 || s.currentMonth > 12) errors.push("Invalid month.");
    if (!Number.isInteger(s.currentChapter) || s.currentChapter < 1 || s.currentChapter > 7) errors.push("Invalid chapter.");
    if (!s.founder || typeof s.founder.name !== "string") errors.push("Missing founder.");
    if (!s.startup || typeof s.startup.name !== "string" || !D.CHALLENGES.some(c => c.id === s.startup.challengeId) || !D.MODELS.some(m => m.id === s.startup.businessModel)) errors.push("Invalid startup.");
    if (!D.DIFFICULTY[s.difficulty]) errors.push("Invalid difficulty.");
    if (!s.resources) errors.push("Missing resources."); else NUM_RES.forEach(k => { if (!isNum(s.resources[k])) errors.push("Invalid resource " + k); });
    if (!s.alloc || ["product", "marketing", "ops", "research", "impact"].some(k => !isNum(s.alloc[k]) || s.alloc[k] < 0)) errors.push("Invalid budget.");
    ["team", "decisions", "events", "achievements", "history", "pending"].forEach(k => { if (!Array.isArray(s[k])) errors.push("Invalid " + k); });
    if (!isNum(s.rng)) errors.push("Invalid RNG state.");
    if (!s.finance || !isNum(s.finance.totalRevenue)) errors.push("Invalid finance.");
    if (!s.mvp || typeof s.mvp.launched !== "boolean") errors.push("Invalid MVP state.");
    if (Array.isArray(s.team) && s.team.some(t => !D.ROLES.some(r => r.id === t.roleId))) errors.push("Invalid team.");
    return { ok: errors.length === 0, errors };
  }
  function migrate(s) { return s; } // version 1 is current; add steps here when the schema changes

  function saveGame(s) {
    try { s.updatedAt = Date.now(); store().setItem(KEYS.save, JSON.stringify(s)); return { ok: true, memory: usingMemory }; }
    catch (e) { return { ok: false, error: (e && e.message ? e.message : "storage unavailable") }; }
  }
  function loadGame() {
    let raw;
    try { raw = store().getItem(KEYS.save); } catch (e) { return { error: "Storage unavailable." }; }
    if (!raw) return null;
    try {
      let s = JSON.parse(raw);
      s = migrate(s);
      const v = validateState(s);
      if (!v.ok) return { error: "Save is invalid: " + v.errors[0], corrupt: true };
      return { state: s };
    } catch (e) { return { error: "Save is corrupted.", corrupt: true }; }
  }
  function hasValidSave() { const l = loadGame(); return !!(l && l.state); }
  function deleteSave() { try { store().removeItem(KEYS.save); } catch (e) { /* ignore */ } }

  function readJSON(key, fallback) { try { const r = store().getItem(key); return r ? JSON.parse(r) : fallback; } catch (e) { return fallback; } }
  function writeJSON(key, v) { try { store().setItem(key, JSON.stringify(v)); return true; } catch (e) { return false; } }
  const DEFAULT_SETTINGS = { sound: true, animations: true, lang: "en" };
  function getSettings() { return Object.assign({}, DEFAULT_SETTINGS, readJSON(KEYS.settings, {})); }
  function saveSettings(v) { return writeJSON(KEYS.settings, v); }
  function getAchievements() { const a = readJSON(KEYS.achievements, []); return Array.isArray(a) ? a : []; }
  function unlockAchievements(ids) {
    const cur = new Set(getAchievements()); ids.forEach(i => cur.add(i)); writeJSON(KEYS.achievements, Array.from(cur)); return Array.from(cur);
  }
  function getHistory() { const h = readJSON(KEYS.history, []); return Array.isArray(h) ? h : []; }
  function addHistory(s) {
    const h = getHistory(); if (h.some(x => x.gameId === s.gameId)) return h;
    const f = s.finalResult; if (!f) return h;
    h.unshift({ gameId: s.gameId, startup: s.startup.name, challengeId: s.startup.challengeId, score: f.score.total, rank: f.rank, ending: f.endingName, date: f.finishedAt });
    writeJSON(KEYS.history, h.slice(0, 20)); return h;
  }

  function hash(str) { let h = 5381; for (let i = 0; i < str.length; i++) { h = ((h << 5) + h + str.charCodeAt(i)) | 0; } return (h >>> 0).toString(16); }
  function exportSave(s) { const body = JSON.stringify(s); return JSON.stringify({ app: "startup-tycoon", version: s.version, checksum: hash(body), state: s }, null, 1); }
  function importSave(text) {
    let o;
    try { o = JSON.parse(text); } catch (e) { return { error: "That file is not valid JSON." }; }
    if (!o || o.app !== "startup-tycoon" || !o.state) return { error: "That is not a Startup Tycoon save file." };
    const s = migrate(o.state), v = validateState(s);
    if (!v.ok) return { error: "Save file rejected: " + v.errors[0] };
    const modified = hash(JSON.stringify(s)) !== o.checksum;
    return { state: s, modified };
  }

  g.ST.Save = { KEYS, validateState, saveGame, loadGame, hasValidSave, deleteSave, getSettings, saveSettings, getAchievements, unlockAchievements, getHistory, addHistory, exportSave, importSave, isMemoryOnly: () => { store(); return usingMemory; } };
  if (typeof module !== "undefined") module.exports = g.ST.Save;
})(typeof window !== "undefined" ? window : globalThis);
