/**
 * Everything the site remembers lives in cookies on this device, so it works without registration:
 * finished lessons, bookmarks, the best quiz score per lesson and watched videos.
 * Experience points (XP) and the level are always computed from that state, so retrying a quiz
 * cannot farm points. Registration only adds a nickname and puts the XP on the shared leaderboard.
 */
(function () {
  // Shared leaderboard (Supabase). Empty values = the leaderboard is not connected yet,
  // everything else keeps working on this device. The key is the public «anon» key:
  // the database only lets it read the table and call submit_score (see supabase/leaderboard.sql).
  const LEADERBOARD = {
    url: "",
    key: "",
  };

  const XP = {
    perAnswer: 10, // each right answer, best attempt of a lesson
    perLesson: 20, // bonus for a lesson with every answer right
    perVideo: 5, // a video watched to the end
  };

  // Level n starts at 50 · n · (n − 1) XP: 0, 100, 300, 600, 1000, 1500, …
  const LEVEL_NAMES = ["Новичок", "Ученик", "Знаток", "Умник", "Эксперт", "Мастер", "Гуру", "Профессор", "Легенда"];

  function levelFor(xp) {
    let level = 1;
    while (50 * (level + 1) * level <= xp) level++;
    const from = 50 * level * (level - 1);
    const to = 50 * (level + 1) * level;
    return {
      level,
      name: LEVEL_NAMES[Math.min(level, LEVEL_NAMES.length) - 1],
      from,
      to,
      progress: (xp - from) / (to - from),
    };
  }

  // state: { best: { lessonId: rightAnswers }, completed: [ids], watched: [ids] }
  function computeXp(state, lessons) {
    const ids = new Set(lessons.map((l) => l.id));
    let xp = 0;
    for (const [id, right] of Object.entries(state.best || {})) {
      const lesson = lessons.find((l) => l.id === id);
      if (lesson) xp += Math.min(right, lesson.quiz.length) * XP.perAnswer;
    }
    xp += (state.completed || []).filter((id) => ids.has(id)).length * XP.perLesson;
    xp += (state.watched || []).filter((id) => ids.has(id)).length * XP.perVideo;
    return xp;
  }

  function maxXp(lessons) {
    return lessons.reduce(
      (sum, l) => sum + l.quiz.length * XP.perAnswer + XP.perLesson + (l.video || l.videoId ? XP.perVideo : 0),
      0
    );
  }

  // Nicknames: 2–20 letters, digits, spaces, «_» or «-»
  function cleanName(raw) {
    const name = String(raw || "").replace(/\s+/g, " ").trim();
    return /^[\p{L}\p{N} _-]{2,20}$/u.test(name) ? name : null;
  }

  /* ------------------------------------------------------------- cookies */
  const YEAR = 60 * 60 * 24 * 365;

  function readCookie(name) {
    if (typeof document === "undefined") return null;
    const part = document.cookie.split("; ").find((p) => p.startsWith(`${name}=`));
    if (!part) return null;
    try {
      return decodeURIComponent(part.slice(name.length + 1));
    } catch {
      return null;
    }
  }

  function writeCookie(name, value) {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    if (value === null || value === "") {
      document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax${secure}`;
    } else {
      document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${YEAR}; path=/; SameSite=Lax${secure}`;
    }
  }

  const readList = (name) => (readCookie(name) || "").split(",").filter(Boolean);
  const writeList = (name, list) => writeCookie(name, [...new Set(list)].join(","));

  function readBest() {
    const best = {};
    for (const pair of readList("intclass_best")) {
      const [id, n] = pair.split(":");
      if (id && Number.isFinite(Number(n))) best[id] = Number(n);
    }
    return best;
  }

  function readJson(name) {
    try {
      return JSON.parse(readCookie(name) || "null");
    } catch {
      return null;
    }
  }

  // Earlier versions kept progress and bookmarks in localStorage: move them over once
  function migrate() {
    try {
      for (const [key, cookie] of [["intclass_progress", "intclass_progress"], ["intclass_bookmarks", "intclass_bookmarks"]]) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const list = JSON.parse(raw);
        if (Array.isArray(list)) writeList(cookie, [...readList(cookie), ...list]);
        localStorage.removeItem(key);
      }
    } catch {}
  }

  /* ---------------------------------------------------------------- store */
  const listeners = new Set();
  let lessonsRef = [];

  function snapshot() {
    return {
      best: readBest(),
      completed: readList("intclass_progress"),
      watched: readList("intclass_watched"),
      bookmarks: readList("intclass_bookmarks"),
    };
  }

  // The lessons page computes XP from the lesson list and caches it; the home page reads the cache
  function summary() {
    const state = snapshot();
    let xp;
    if (lessonsRef.length) {
      xp = computeXp(state, lessonsRef);
      if (readCookie("intclass_xp") !== String(xp)) writeCookie("intclass_xp", String(xp));
    } else {
      xp = Number(readCookie("intclass_xp")) || 0;
    }
    return { ...state, xp, ...levelFor(xp), player: player() };
  }

  function changed(before) {
    const after = summary();
    listeners.forEach((fn) => fn(after, before));
    if (after.player && after.xp !== before.xp) scheduleSync();
    return after;
  }

  function player() {
    const p = readJson("intclass_player");
    return p && p.id && p.secret && p.name ? p : null;
  }

  const Store = {
    LEADERBOARD,
    XP,
    levelFor,
    computeXp,
    maxXp,
    cleanName,

    // the page hands over the lesson list so XP can be computed (the home page has none)
    setLessons(lessons) {
      lessonsRef = lessons || [];
    },
    summary,
    onChange(fn) {
      listeners.add(fn);
    },

    completed: () => new Set(readList("intclass_progress")),
    bookmarks: () => new Set(readList("intclass_bookmarks")),

    toggleBookmark(id) {
      const set = Store.bookmarks();
      const on = !set.has(id);
      if (on) set.add(id);
      else set.delete(id);
      const before = summary();
      writeList("intclass_bookmarks", [...set]);
      changed(before);
      return on;
    },

    // a finished quiz: keeps the best score, marks the lesson when all answers were right
    recordQuiz(id, right, total) {
      const before = summary();
      const best = readBest();
      if (!(best[id] >= right)) best[id] = right;
      writeList("intclass_best", Object.entries(best).map(([k, v]) => `${k}:${v}`));
      if (right === total) writeList("intclass_progress", [...readList("intclass_progress"), id]);
      return { before, after: changed(before) };
    },

    markWatched(id) {
      if (readList("intclass_watched").includes(id)) return null;
      const before = summary();
      writeList("intclass_watched", [...readList("intclass_watched"), id]);
      return { before, after: changed(before) };
    },

    resetProgress() {
      const before = summary();
      ["intclass_progress", "intclass_best", "intclass_watched", "intclass_bookmarks", "intclass_xp"].forEach((c) => writeCookie(c, null));
      return changed(before);
    },

    // one-time notice that the site keeps its state in cookies
    cookiesAcknowledged: () => readCookie("intclass_cookies") === "1",
    acknowledgeCookies: () => writeCookie("intclass_cookies", "1"),

    theme: () => readCookie("intclass_theme"),
    setTheme: (t) => writeCookie("intclass_theme", t),

    player,
    leaderboardEnabled: () => Boolean(LEADERBOARD.url && LEADERBOARD.key),

    // registration = a nickname plus a random id and secret kept in a cookie on this device
    async register(rawName) {
      const name = cleanName(rawName);
      if (!name) throw new Error("name");
      const current = player();
      const random = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");
      const p = current
        ? { ...current, name }
        : { id: crypto.randomUUID ? crypto.randomUUID() : random().replace(/^(.{8})(.{4})(.{4})(.{4})/, "$1-$2-$3-$4-"), secret: random(), name };
      writeCookie("intclass_player", JSON.stringify(p));
      const before = summary();
      changed(before);
      await Store.sync();
      return p;
    },

    async sync() {
      const p = player();
      if (!p || !Store.leaderboardEnabled()) return false;
      const { xp, level } = summary();
      const res = await fetch(`${LEADERBOARD.url}/rest/v1/rpc/submit_score`, {
        method: "POST",
        headers: { apikey: LEADERBOARD.key, Authorization: `Bearer ${LEADERBOARD.key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ p_id: p.id, p_secret: p.secret, p_name: p.name, p_xp: xp, p_level: level }),
      });
      if (!res.ok) throw new Error(`leaderboard ${res.status}`);
      return true;
    },

    async leaders(limit = 20) {
      if (!Store.leaderboardEnabled()) return null;
      const res = await fetch(`${LEADERBOARD.url}/rest/v1/leaderboard?select=player,name,xp,level&order=xp.desc,updated_at.asc&limit=${limit}`, {
        headers: { apikey: LEADERBOARD.key, Authorization: `Bearer ${LEADERBOARD.key}` },
      });
      if (!res.ok) throw new Error(`leaderboard ${res.status}`);
      return res.json();
    },
  };

  let syncTimer = null;
  function scheduleSync() {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => Store.sync().catch(() => {}), 800);
  }

  if (typeof document !== "undefined") {
    migrate();
    window.IntStore = Store;
  }
  if (typeof module !== "undefined" && module.exports) module.exports = Store;
})();
