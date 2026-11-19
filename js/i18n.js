/* Startup Tycoon — UI translations (separate from game logic). Game scenarios are English-only in this release. */
(function (g) {
  const T = {
    en: {
      tagline: "Build Your Startup. Solve Real Problems. Change the World.",
      start: "START YOUR JOURNEY", cont: "CONTINUE JOURNEY", how: "HOW TO PLAY", mission: "OUR MISSION", settings: "SETTINGS", credits: "CREDITS", saves: "SAVE / LOAD",
      play: "Start Playing", back: "Back", next: "Next", menu: "Menu", save: "Save", saving: "Saving...", saved: "Saved", saveFailed: "Save Failed",
      overview: "Overview", business: "Business", finance: "Finance", team: "Team", product: "Product", impact: "Impact", events: "Events", achievements: "Achievements",
      month: "Month", chapter: "Chapter", capital: "Capital", revenue: "Revenue", expenses: "Expenses", reputation: "Reputation", quality: "Product Quality", socialImpact: "Social Impact",
      runMonth: "Run Month", decision: "Decision", objective: "Next objective", language: "Language", sound: "Sound effects", animations: "Animations", on: "On", off: "Off",
      playAgain: "Play Again", exportReport: "Export report", locked: "Unlocks in Chapter",
      disclaimer: "Student-built interactive entrepreneurship experience inspired by the Hult Prize mission. Not an official Hult Prize product."
    },
    ar: {
      tagline: "ابنِ شركتك الناشئة. حُلّ مشكلات حقيقية. غيّر العالم.",
      start: "ابدأ رحلتك", cont: "تابع رحلتك", how: "كيف تلعب", mission: "رسالتنا", settings: "الإعدادات", credits: "الشكر والتقدير", saves: "حفظ / تحميل",
      play: "ابدأ اللعب", back: "رجوع", next: "التالي", menu: "القائمة", save: "حفظ", saving: "جارٍ الحفظ...", saved: "تم الحفظ", saveFailed: "فشل الحفظ",
      overview: "نظرة عامة", business: "الأعمال", finance: "المالية", team: "الفريق", product: "المنتج", impact: "الأثر", events: "الأحداث", achievements: "الإنجازات",
      month: "الشهر", chapter: "الفصل", capital: "رأس المال", revenue: "الإيرادات", expenses: "المصروفات", reputation: "السمعة", quality: "جودة المنتج", socialImpact: "الأثر الاجتماعي",
      runMonth: "تشغيل الشهر", decision: "قرار", objective: "الهدف التالي", language: "اللغة", sound: "المؤثرات الصوتية", animations: "الحركات", on: "مفعّل", off: "متوقف",
      playAgain: "العب مرة أخرى", exportReport: "تصدير التقرير", locked: "يُفتح في الفصل",
      disclaimer: "تجربة ريادة أعمال تفاعلية من تطوير طلاب، مستوحاة من رسالة جائزة هلت. ليست منتجاً رسمياً لجائزة هلت."
    }
  };
  g.ST = g.ST || {};
  g.ST.I18n = { t: (k, lang) => (T[lang] && T[lang][k]) || T.en[k] || k, langs: Object.keys(T) };
  if (typeof module !== "undefined") module.exports = g.ST.I18n;
})(typeof window !== "undefined" ? window : globalThis);
