/**
 * Anonymous usage counters: which lessons are watched and passed, which questions are missed.
 * Only the Supabase leaderboard project receives them (see supabase/admin.sql): no player id, name or IP,
 * just «lesson, kind, question, result». Nothing is sent when the leaderboard is not set up
 * or the browser asks not to be tracked.
 *
 * Also holds the pure aggregation used by the admin page, so it can be tested in node.
 */
(function () {
  const KINDS = ["video_start", "video_end", "quiz_start", "answer", "quiz_end"];
  const LESSON_RE = /^(math|rus)-[5-9]-[0-9]{1,2}$/;

  function valid(kind, lesson, q, val) {
    return KINDS.includes(kind) && LESSON_RE.test(lesson || "") && Number.isInteger(q) && q >= 0 && q <= 10 && [0, 1, 2].includes(val);
  }

  function track(kind, lesson, q = 0, val = 0) {
    if (typeof window === "undefined" || !valid(kind, lesson, q, val)) return false;
    const cfg = window.IntStore?.LEADERBOARD;
    if (!window.IntStore?.leaderboardEnabled() || navigator.doNotTrack === "1") return false;
    try {
      fetch(`${cfg.url}/rest/v1/rpc/track_event`, {
        method: "POST",
        keepalive: true,
        headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ p_kind: kind, p_lesson: lesson, p_q: q, p_val: val }),
      }).catch(() => {});
    } catch (e) { /* statistics never get in the way */ }
    return true;
  }

  /* total: [{kind, lesson, q, val, n}] → per lesson { video_start, video_end, quiz_start, quiz_end, avg, questions:[{q, seen, missed, second}] } */
  function perLesson(total) {
    const out = {};
    for (const r of total || []) {
      const l = (out[r.lesson] ||= { video_start: 0, video_end: 0, quiz_start: 0, quiz_end: 0, scoreSum: 0, questions: {} });
      if (r.kind === "answer") {
        const q = (l.questions[r.q] ||= { q: r.q, seen: 0, missed: 0, second: 0 });
        q.seen += r.n;
        if (r.val === 0) q.missed += r.n;
        if (r.val === 2) q.second += r.n;
      } else {
        l[r.kind] += r.n;
        if (r.kind === "quiz_end") l.scoreSum += r.q * r.n;
      }
    }
    for (const l of Object.values(out)) {
      l.avg = l.quiz_end ? l.scoreSum / l.quiz_end : null;
      l.questions = Object.values(l.questions).sort((a, b) => a.q - b.q);
    }
    return out;
  }

  // the questions missed most often (with enough answers to mean something), worst first
  function hardest(byLesson, min = 5, limit = 10) {
    const rows = [];
    for (const [lesson, l] of Object.entries(byLesson)) {
      for (const q of l.questions) if (q.seen >= min) rows.push({ lesson, q: q.q, seen: q.seen, missed: q.missed, rate: q.missed / q.seen });
    }
    return rows.sort((a, b) => b.rate - a.rate || b.seen - a.seen).slice(0, limit);
  }

  const api = { KINDS, valid, track, perLesson, hardest };
  if (typeof window !== "undefined") window.IntStats = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
