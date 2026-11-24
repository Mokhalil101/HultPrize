(function (g) {
  g.ST = g.ST || {};
  const A = (g.ST.AR = g.ST.AR || {});
  const D = (A.decisions = A.decisions || {});
  const notes = {
    "impact-measure": [0, "مع قلة عدد العملاء، لم تجد الدراسة بيانات كافية لقياسها."],
    "scale-ops": [0, "مع فريق صغير جدًا لم يكن هناك الكثير لأتمتته، فذهب جزء من جهد الإعداد هدرًا."],
    "free-trial": [0, "جرّب المستخدمون المنتج، لكنه لم يكن جيدًا بما يكفي ليحوّلهم إلى عملاء."],
    "launch-pricing": [0, "لم يكن لديك مؤمنون كثيرون بعد، فلم يصل عرض المستخدمين الأوائل إلا لعدد قليل."],
    "feedback-loop": [0, "كان عدد مستخدميك أقل من أن تتعلم منه الكثير بعد."],
    "partnerships": [0, "ترددت المنظمة لأن سجلك ما زال قصيرًا."],
    "local-hiring": [0, "قلّة من أهل المنطقة سمعوا بك بعد، فكان التوظيف بطيئًا."]
  };
  Object.keys(notes).forEach(id => {
    const d = D[id]; if (!d || !d.options) return;
    d.options[notes[id][0]].note = notes[id][1];
  });
})(typeof window !== "undefined" ? window : globalThis);
