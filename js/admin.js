/**
 * Admin page (/admin/): moderate the leaderboard and read anonymous statistics.
 * Every call goes through the password-checked Supabase functions in supabase/admin.sql; the password is
 * typed here, kept only in this tab's sessionStorage and never written into the site's files.
 * All names and ids from the database are put on the page with textContent.
 */
(function () {
  const app = document.getElementById("app");
  const cfg = window.IntStore?.LEADERBOARD || {};
  const KEY = "intclass_admin_pw";
  const lessons = typeof LESSONS !== "undefined" ? LESSONS : [];
  const titleOf = (id) => lessons.find((l) => l.id === id)?.title || id;

  let password = "";
  try { password = sessionStorage.getItem(KEY) || ""; } catch (e) { /* kept in memory only */ }

  function h(tag, props = {}, ...kids) {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") n.className = v;
      else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
      else if (v !== false && v != null) n.setAttribute(k, v === true ? "" : v);
    }
    kids.flat().forEach((c) => c != null && n.append(c.nodeType ? c : document.createTextNode(String(c))));
    return n;
  }

  async function rpc(name, args = {}) {
    const res = await fetch(`${cfg.url}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: { apikey: cfg.key, Authorization: `Bearer ${cfg.key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_secret: password, ...args }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }

  function setup() {
    app.replaceChildren(
      h("h1", {}, "Админка"),
      h("div", { class: "adm-card is-warn" },
        h("p", {}, "Таблица лидеров ещё не подключена: в ", h("code", {}, "js/store.js"), " пустые ", h("code", {}, "LEADERBOARD.url"), " и ", h("code", {}, "LEADERBOARD.key"), "."),
        h("ol", {},
          h("li", {}, "В Supabase выполните ", h("code", {}, "supabase/leaderboard.sql"), ", затем ", h("code", {}, "supabase/admin.sql"), "."),
          h("li", {}, "Задайте пароль админа SQL-запросом из шапки ", h("code", {}, "admin.sql"), " (в файлы сайта он не попадает)."),
          h("li", {}, "Впишите Project URL и anon key в ", h("code", {}, "js/store.js"), "."))));
  }

  function login(message) {
    const pw = h("input", { type: "password", autocomplete: "current-password", "aria-label": "Пароль админа", placeholder: "Пароль админа", required: true });
    const msg = h("p", { class: "adm-msg err", role: "status" }, message || "");
    const form = h("form", {
      onsubmit: async (e) => {
        e.preventDefault();
        password = pw.value;
        msg.textContent = "Проверяю…";
        msg.className = "adm-msg";
        try {
          if ((await rpc("admin_login")) === true) {
            try { sessionStorage.setItem(KEY, password); } catch (err) { /* ignore */ }
            return panel();
          }
          msg.textContent = "Неверный пароль (или слишком много попыток — подождите 10 минут).";
        } catch (err) { msg.textContent = "Нет связи с базой."; }
        msg.className = "adm-msg err";
      },
    }, pw, h("button", { class: "primary", type: "submit" }, "Войти"));
    app.replaceChildren(h("h1", {}, "Админка"), h("p", { class: "adm-note" }, "Вход по паролю администратора."), form, msg);
    pw.focus();
  }

  function logout() {
    password = "";
    try { sessionStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    login();
  }

  function panel() {
    const view = h("div");
    const tabs = [["players", "Игроки"], ["stats", "Статистика"]];
    const buttons = tabs.map(([id, label]) => h("button", { type: "button", role: "tab", "aria-selected": "false", onclick: () => show(id) }, label));
    function show(id) {
      tabs.forEach(([t], i) => buttons[i].setAttribute("aria-selected", String(t === id)));
      (id === "players" ? players : stats)(view);
    }
    app.replaceChildren(
      h("div", { class: "adm-bar" }, h("h1", {}, "Админка"), h("div", { class: "adm-tabs", role: "tablist" }, ...buttons, h("button", { type: "button", onclick: logout }, "Выйти"))),
      view);
    show("players");
  }

  async function guarded(fn, view) {
    try {
      const res = await fn();
      if (res && res.ok === false) { logout(); return null; }
      return res;
    } catch (e) {
      view.replaceChildren(h("p", { class: "adm-msg err" }, "Не удалось загрузить данные. Проверьте подключение к Supabase."));
      return null;
    }
  }

  /* ------------------------------------------------------------ players */
  async function players(view) {
    view.replaceChildren(h("p", { class: "adm-note" }, "Загрузка…"));
    const res = await guarded(() => rpc("admin_players"), view);
    if (!res) return;
    let rows = res.rows;
    const msg = h("p", { class: "adm-msg", role: "status" });
    const search = h("input", { type: "search", placeholder: "Поиск по имени", "aria-label": "Поиск по имени", oninput: draw });
    const tbody = h("tbody");
    const say = (t, bad) => { msg.textContent = t; msg.className = bad ? "adm-msg err" : "adm-msg"; };

    async function act(call, okText) {
      say("Сохраняю…");
      const r = await guarded(call, view);
      if (!r) return false;
      if (r.error) { say("Имя должно быть 2–20 символов без < > \" ' ` \\ / { }.", true); return false; }
      say(okText);
      return true;
    }
    async function reload() {
      const r = await guarded(() => rpc("admin_players"), view);
      if (r) { rows = r.rows; draw(); }
    }

    function row(p) {
      const name = h("input", { class: "name", value: p.name, maxlength: 20, "aria-label": "Имя" });
      const xp = h("input", { class: "sm", type: "number", min: 0, max: 10000, value: p.xp, "aria-label": "XP" });
      const lvl = h("input", { class: "sm", type: "number", min: 1, max: 50, value: p.level, "aria-label": "Уровень" });
      return h("tr", {},
        h("td", {}, name), h("td", { class: "num" }, xp), h("td", { class: "num" }, lvl),
        h("td", { class: "num" }, new Date(p.updated_at).toLocaleDateString("ru-RU")),
        h("td", {},
          h("button", { class: "sm primary", type: "button", onclick: async () => {
            if (await act(() => rpc("admin_player_update", { p_id: p.id, p_name: name.value, p_xp: Number(xp.value) || 0, p_level: Number(lvl.value) || 1 }), `Сохранено: ${name.value}`)) reload();
          } }, "Сохранить"), " ",
          h("button", { class: "sm danger", type: "button", onclick: async () => {
            if (!confirm(`Удалить игрока «${p.name}» из таблицы?`)) return;
            if (await act(() => rpc("admin_player_delete", { p_id: p.id }), "Игрок удалён")) reload();
          } }, "Удалить")));
    }
    function draw() {
      const q = search.value.trim().toLowerCase();
      tbody.replaceChildren(...rows.filter((p) => p.name.toLowerCase().includes(q)).map(row));
      if (!tbody.children.length) tbody.append(h("tr", {}, h("td", { colspan: 5 }, "Никого нет.")));
    }

    view.replaceChildren(
      h("div", { class: "adm-bar" }, search, h("span", { class: "adm-note" }, `Игроков: ${rows.length}`)),
      msg,
      h("div", { class: "adm-table-wrap" }, h("table", {},
        h("thead", {}, h("tr", {}, h("th", {}, "Имя"), h("th", { class: "num" }, "XP"), h("th", { class: "num" }, "Ур."), h("th", { class: "num" }, "Обновлён"), h("th", {}, ""))),
        tbody)),
      h("h2", {}, "Сброс"),
      h("div", { class: "adm-card" },
        h("p", { class: "adm-note" }, "Удаляет всех игроков из таблицы лидеров. Статистика уроков не затрагивается. Отменить нельзя."),
        h("button", { class: "danger", type: "button", onclick: async () => {
          if (prompt("Чтобы очистить всю таблицу, введите слово: СБРОС") !== "СБРОС") return;
          if (await act(() => rpc("admin_players_reset"), "Таблица очищена")) reload();
        } }, "Очистить всю таблицу")));
    draw();
  }

  /* ------------------------------------------------------------ statistics */
  async function stats(view) {
    view.replaceChildren(h("p", { class: "adm-note" }, "Загрузка…"));
    const days = 60;
    const res = await guarded(() => rpc("admin_stats", { p_days: days }), view);
    if (!res) return;
    const by = window.IntStats.perLesson(res.total);
    const sum = (k) => Object.values(by).reduce((a, l) => a + l[k], 0);
    const card = (n, label) => h("div", { class: "adm-stat" }, h("b", {}, String(n)), h("span", {}, label));
    const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : "—");

    const daily = {};
    res.daily.filter((d) => d.kind === "quiz_start" || d.kind === "video_start").forEach((d) => { daily[d.day] = (daily[d.day] || 0) + d.n; });
    const dayList = Array.from({ length: 30 }, (_, i) => new Date(Date.now() - (29 - i) * 864e5).toISOString().slice(0, 10));
    const max = Math.max(1, ...dayList.map((d) => daily[d] || 0));

    const ids = Object.keys(by).sort((a, b) => lessons.findIndex((l) => l.id === a) - lessons.findIndex((l) => l.id === b));
    const lessonRows = ids.map((id) => {
      const l = by[id];
      return h("tr", {}, h("td", {}, titleOf(id), " ", h("small", { class: "adm-note" }, id)),
        h("td", { class: "num" }, l.video_start), h("td", { class: "num" }, pct(l.video_end, l.video_start)),
        h("td", { class: "num" }, l.quiz_start), h("td", { class: "num" }, l.quiz_end),
        h("td", { class: "num" }, l.avg == null ? "—" : l.avg.toFixed(1)));
    });
    const hard = window.IntStats.hardest(by).map((r) => h("tr", {},
      h("td", {}, titleOf(r.lesson)), h("td", { class: "num" }, r.q + 1), h("td", { class: "num" }, r.seen),
      h("td", {}, h("span", { class: "adm-meter" }, h("i", { style: `width:${Math.round(r.rate * 100)}%` })), `${Math.round(r.rate * 100)}%`)));

    view.replaceChildren(
      h("p", { class: "adm-note" }, `Анонимные счётчики за последние ${days} дней: без имён и идентификаторов.`),
      h("div", { class: "adm-cards" },
        card(sum("video_start"), "запусков видео"), card(sum("video_end"), "досмотрено до конца"),
        card(sum("quiz_start"), "тестов начато"), card(sum("quiz_end"), "тестов завершено")),
      h("h2", {}, "Активность за 30 дней"),
      h("div", { class: "adm-bars", role: "img", "aria-label": "Запуски видео и тестов по дням" },
        ...dayList.map((d) => h("i", { title: `${d}: ${daily[d] || 0}`, style: `height:${Math.max(2, ((daily[d] || 0) / max) * 100)}%` }))),
      h("h2", {}, "Самые трудные вопросы"),
      hard.length
        ? h("div", { class: "adm-table-wrap" }, h("table", {}, h("thead", {}, h("tr", {}, h("th", {}, "Урок"), h("th", { class: "num" }, "Вопрос"), h("th", { class: "num" }, "Ответов"), h("th", {}, "Ошибок"))), h("tbody", {}, hard)))
        : h("p", { class: "adm-note" }, "Пока мало данных (нужно хотя бы 5 ответов на вопрос)."),
      h("h2", {}, "По урокам"),
      lessonRows.length
        ? h("div", { class: "adm-table-wrap" }, h("table", {}, h("thead", {}, h("tr", {}, h("th", {}, "Урок"), h("th", { class: "num" }, "Видео"), h("th", { class: "num" }, "До конца"), h("th", { class: "num" }, "Тест начат"), h("th", { class: "num" }, "Завершён"), h("th", { class: "num" }, "Средний балл"))), h("tbody", {}, lessonRows)))
        : h("p", { class: "adm-note" }, "Данных пока нет."));
  }

  if (!cfg.url || !cfg.key) setup();
  else if (!password) login();
  else {
    rpc("admin_login").then((ok) => (ok === true ? panel() : login("Сессия истекла — войдите снова."))).catch(() => login("Нет связи с базой."));
  }
})();
