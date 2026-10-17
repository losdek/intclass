/* Scenes for grade 5 math (see js/scenes.js): one illustrated task per lesson, drawn from its video. */
(function () {
  const IntScenes = typeof window !== "undefined" ? window.IntScenes : require("./scenes.js");
  const fire = (el) => el.dispatchEvent(new Event("change", { bubbles: true }));
  const locked = (el) => el.classList.contains("is-locked");
  const isInt = (x) => Number.isInteger(x);
  const sum = (a) => (a || []).reduce((s, x) => s + x, 0);
  // 1 254, 0,75 — the way the lessons print numbers
  const fmt = (n) => {
    const [i, f] = String(Math.abs(n)).split(".");
    return (n < 0 ? "−" : "") + i.replace(/\B(?=(\d{3})+(?!\d))/g, " ") + (f ? "," + f : "");
  };
  const uniq = (list, t, check) => {
    const seen = new Set();
    return list.filter((v) => {
      const key = JSON.stringify(v);
      if (v === null || seen.has(key) || check(t, v)) return false;
      seen.add(key);
      return true;
    }).slice(0, 4);
  };
  // text with a size and an optional palette colour (class colours lose to `.scene-fig text`, so inline)
  function T(k, p, x, y, s, size, color, anchor) {
    const t = k.label(p, x, y, s, "sc-txt", anchor);
    t.setAttribute("font-size", size || 16);
    if (color) t.style.fill = `var(--sc-${color})`;
    return t;
  }
  function tapRect(k, el, parent, attrs, aria, onTap) {
    const r = k.svg("rect", { ...attrs, fill: "transparent", class: "sc-tap", role: "button", "aria-label": aria }, parent);
    k.toggleable(r, () => !locked(el) && onTap());
    return r;
  }

  /* ------------------------------------------------------------ burger-cut (math-5-1)
   * The 1/3 vs 1/4 pound burgers: cut each burger with its stepper, the share stays bright, the rest fades;
   * then tap the burger that gives more meat (or «=» between them).
   * task: { left: { num, den }, right: { num, den }, solution: "L" | "R" | "=" } */
  const burgerAns = (t) => {
    const c = t.left.num * t.right.den - t.right.num * t.left.den;
    return c > 0 ? "L" : c < 0 ? "R" : "=";
  };

  /* ---------------------------------------------------------- balance-box helpers */
  const balanceX = (t) => (sum(t.right) - sum(t.left)) / t.boxes;

  IntScenes.add({
    "burger-cut": {
      wrong: (t) => ["L", "R", "="].filter((x) => x !== burgerAns(t)),
      check: (t, v) => typeof v === "string" && v === burgerAns(t),
      build(el, t, k) {
        const { svg, stage, hint, celebrate, controls, stepper, lockable, answerLine } = k;
        hint(el, t.hint || "Разрежьте бургеры кнопками «+», затем нажмите на тот, где кусок больше (или на «=»)");
        const fig = stage(el, 360, 240, "Два бургера: какая доля больше");
        const X = [86, 274], CY = 110, HW = 62;
        const gs = X.map(() => svg("g", {}, fig));
        const fr = [t.left, t.right];
        fr.forEach((f, i) => T(k, fig, X[i], 200, `${f.num}/${f.den} фунта`, 22));
        const eq = svg("g", {}, fig);
        const cuts = [null, null];
        let pick = null;
        function burger(g, cx, n, take, on) {
          g.textContent = "";
          if (on) svg("path", { d: `M${cx - 22} 32 l8 16 h28 l8 -16 l-11 8 l-11 -12 l-11 12 Z`, class: "sc-gold" }, g);
          svg("path", { d: `M${cx - HW} ${CY - 12} Q${cx - HW} ${CY - 62} ${cx} ${CY - 62} Q${cx + HW} ${CY - 62} ${cx + HW} ${CY - 12} Z`, class: "sc-crust" }, g);
          [-34, -10, 14, 34].forEach((dx, j) => svg("ellipse", { cx: cx + dx, cy: CY - 40 + (j % 2) * 10, rx: 4, ry: 2.5, class: "sc-cream" }, g));
          svg("rect", { x: cx - HW - 4, y: CY - 14, width: 2 * HW + 8, height: 10, rx: 5, class: "sc-teal" }, g);
          svg("rect", { x: cx - HW, y: CY - 5, width: 2 * HW, height: 8, rx: 2, class: "sc-cheese" }, g);
          svg("rect", { x: cx - HW + 2, y: CY + 2, width: 2 * HW - 4, height: 16, rx: 8, style: "fill:#8a5432" }, g);
          svg("rect", { x: cx - HW, y: CY + 18, width: 2 * HW, height: 18, rx: 9, class: "sc-crust" }, g);
          if (n > 1) {
            const w = (2 * HW + 8) / n, x0 = cx - HW - 4;
            svg("rect", { x: x0 + take * w, y: CY - 64, width: (n - take) * w, height: 102, class: "sc-paper", opacity: 0.68 }, g);
            for (let j = 1; j < n; j++) svg("line", { x1: x0 + j * w, y1: CY - 66, x2: x0 + j * w, y2: CY + 40, style: "stroke:var(--sc-paper);stroke-width:4" }, g);
          }
          tapRect(k, el, g, { x: cx - HW - 6, y: 30, width: 2 * HW + 12, height: 150 }, `Бургер ${fr[X.indexOf(cx)].num}/${fr[X.indexOf(cx)].den} фунта`, () => choose(X.indexOf(cx) ? "R" : "L"));
        }
        function draw() {
          fr.forEach((f, i) => burger(gs[i], X[i], cuts[i] || 1, Math.min(f.num, cuts[i] || 1), pick === "LR"[i]));
          eq.textContent = "";
          svg("circle", { cx: 180, cy: 110, r: 21, class: pick === "=" ? "sc-teal" : "sc-cream" }, eq);
          T(k, eq, 180, 119, "=", 26, pick === "=" ? "cream" : "ink");
          tapRect(k, el, eq, { x: 158, y: 88, width: 44, height: 44 }, "Доли равны", () => choose("="));
        }
        function choose(p) { pick = p; draw(); fire(el); }
        const row = controls(el);
        const st = fr.map((_, i) => stepper(row, i ? "Правый на" : "Левый на", 1, 12, (n) => { cuts[i] = n; draw(); fire(el); }));
        draw();
        const lock = lockable(el);
        return {
          value: () => pick,
          lock,
          reveal() {
            fr.forEach((f, i) => { cuts[i] = f.den; st[i].set(f.den); });
            pick = burgerAns(t);
            draw();
            answerLine(el, t.reveal || `${t.left.num}/${t.left.den} ${pick === "=" ? "=" : pick === "L" ? ">" : "<"} ${t.right.num}/${t.right.den}`);
          },
          reset() { cuts.fill(null); st.forEach((s) => s.set(null)); pick = null; draw(); lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* ---------------------------------------------------------- height-ruler (math-5-2)
     * The swimmer against the 2-metre ruler: drag the red head marker (or ▲▼ by 5 cm) to the decimal height.
     * task: { solution: 1.75, trap?: 1.57 } — the ruler goes 0…2 m, every tick is 5 cm. */
    "height-ruler": {
      wrong: (t) => uniq([t.trap, +(t.solution + 0.1).toFixed(2), +(t.solution - 0.1).toFixed(2)].filter((x) => x > 0 && x <= 2), t, IntScenes.kinds["height-ruler"].check),
      check: (t, v) => typeof v === "number" && Math.abs(v - t.solution) < 0.001,
      build(el, t, k) {
        const { svg, stage, hint, celebrate, controls, lockable, answerLine, drag } = k;
        hint(el, t.hint || "Тяните красную ручку или нажимайте ▲ ▼ — каждое деление 5 см");
        const fig = stage(el, 360, 284, "Ростомер от 0 до 2 метров");
        const Y0 = 266, PX = 120, U = 120; // 120 units per metre
        const y = (h) => Y0 - h * U;
        svg("rect", { x: 30, y: Y0, width: 180, height: 6, rx: 3, class: "sc-soft" }, fig);
        svg("rect", { x: 250, y: y(2) - 4, width: 22, height: 2 * U + 8, rx: 4, class: "sc-cream" }, fig);
        for (let i = 0; i <= 40; i++) {
          const yy = y(i * 0.05), len = i % 10 === 0 ? 22 : i % 2 === 0 ? 14 : 7;
          svg("line", { x1: 250, y1: yy, x2: 250 + len, y2: yy, class: "sc-stroke", style: `stroke-width:${i % 10 ? 1.5 : 2.5}` }, fig);
          if (i % 10 === 0) T(k, fig, 244, yy + 5, `${fmt(i / 20)} м`, 15, null, "end");
        }
        const kidG = svg("g", {}, fig);
        const mark = svg("g", {}, fig);
        const line = svg("line", { x1: PX, x2: 300, y1: 0, y2: 0, style: "stroke:var(--sc-red);stroke-width:2.5;stroke-dasharray:6 5" }, mark);
        const handle = svg("g", { class: "sc-tap", tabindex: 0, role: "slider", "aria-label": "Отметка роста" }, mark);
        svg("circle", { cx: 310, cy: 0, r: 17, class: "sc-red" }, handle);
        T(k, handle, 310, 6, "↕", 18, "cream");
        let h = null;
        function set(v, user) {
          h = Math.round(k.clamp(v, 0.5, 2) * 20) / 20;
          draw();
          if (user) fire(el);
        }
        function draw() {
          const hh = h === null ? 1.2 : h;
          kidG.textContent = "";
          // the swimmer from the video: head, body, legs — proportions follow the height
          const top = y(hh), L = hh * U, r = Math.max(9, L * 0.075);
          const man = svg("g", { class: "sc-blue", opacity: h === null ? 0.45 : 1 }, kidG);
          svg("circle", { cx: PX, cy: top + r, r }, man);
          svg("rect", { x: PX - r * 1.5, y: top + 2 * r + 3, width: r * 3, height: L * 0.42, rx: r * 0.9 }, man);
          const ly = top + 2 * r + 3 + L * 0.42 - r * 0.6;
          svg("rect", { x: PX - r * 1.3, y: ly, width: r * 1.1, height: Y0 - ly, rx: r * 0.4 }, man);
          svg("rect", { x: PX + r * 0.2, y: ly, width: r * 1.1, height: Y0 - ly, rx: r * 0.4 }, man);
          mark.setAttribute("transform", `translate(0 ${y(hh)})`);
        }
        drag(handle, fig, (p) => !locked(el) && p.x > 60 && set((Y0 - p.y) / U, true));
        handle.addEventListener("keydown", (e) => {
          const d = { ArrowUp: 0.05, ArrowDown: -0.05 }[e.key];
          if (d && !locked(el)) { e.preventDefault(); set((h ?? 1.2) + d, true); }
        });
        const row = controls(el);
        row.innerHTML = '<button type="button" class="btn btn-small btn-secondary" data-d="0.05" aria-label="Выше на 5 см">▲ 5 см</button><button type="button" class="btn btn-small btn-secondary" data-d="-0.05" aria-label="Ниже на 5 см">▼ 5 см</button>';
        row.addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) set((h ?? 1.2) + Number(b.dataset.d), true); });
        draw();
        const lock = lockable(el);
        return {
          value: () => h,
          lock,
          reveal() { set(t.solution, false); answerLine(el, t.reveal || `${fmt(t.solution)} м = ${Math.round(t.solution * 100)} см`); },
          reset() { h = null; draw(); lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* ------------------------------------------------------------ sale-grid (math-5-3)
     * The jacket on SALE: its price is the 10×10 grid (1 cell = 1%). Shade the discount on the grid
     * (drag across it or use the stepper), then type the new price.
     * task: { price, percent, solution: { cells, price } } */
    "sale-grid": {
      wrong: (t) => uniq([
        { cells: t.percent, price: (t.price * t.percent) / 100 },
        { cells: 100 - t.percent, price: (t.price * t.percent) / 100 },
        t.trapPrice ? { cells: t.percent, price: t.trapPrice } : { cells: t.percent, price: t.price - t.percent },
      ], t, IntScenes.kinds["sale-grid"].check),
      check: (t, v) => Boolean(v) && v.cells === t.percent && v.price === (t.price * (100 - t.percent)) / 100,
      build(el, t, k) {
        const { svg, stage, hint, celebrate, controls, stepper, numberField, lockable, answerLine, drag } = k;
        hint(el, t.hint || "Закрасьте скидку на сетке (1 клетка = 1%), потом впишите новую цену");
        const fig = stage(el, 360, 250, "Куртка с ценником и сетка из 100 клеток");
        // the jacket from the video, a red sticker and the price tag
        svg("path", { d: "M50 70 L80 54 L110 54 L140 70 L156 150 L138 154 L132 112 L132 200 L58 200 L58 112 L52 154 L34 150 Z", class: "sc-teal" }, fig);
        svg("path", { d: "M80 54 L95 74 L110 54 Z", class: "sc-paper" }, fig);
        svg("line", { x1: 95, y1: 74, x2: 95, y2: 198, class: "sc-stroke", style: "stroke-width:2" }, fig);
        svg("circle", { cx: 44, cy: 50, r: 32, class: "sc-red" }, fig);
        T(k, fig, 44, 55, `−${t.percent}%`, 14, "cream");
        svg("rect", { x: 22, y: 206, width: 140, height: 32, rx: 8, class: "sc-cream" }, fig);
        T(k, fig, 92, 228, `${fmt(t.price)} ₽`, 18);
        const X0 = 172, Y0 = 18, C = 17;
        const cellsG = svg("g", {}, fig);
        const rects = [];
        for (let i = 0; i < 100; i++) {
          const c = Math.floor(i / 10), r = i % 10;
          rects.push(svg("rect", { x: X0 + c * C, y: Y0 + r * C, width: C - 1.5, height: C - 1.5, rx: 2, class: "sc-cream" }, cellsG));
        }
        const pad = svg("rect", { x: X0, y: Y0, width: 10 * C, height: 10 * C, fill: "transparent", class: "sc-tap", role: "img", "aria-label": "Сетка из 100 клеток" }, fig);
        T(k, fig, X0 + 5 * C, 214, `100 клеток = ${fmt(t.price)} ₽`, 14);
        const pct = T(k, fig, X0 + 5 * C, 238, "", 15, "red");
        let cells = null, price = null;
        function paint() {
          rects.forEach((r, i) => r.setAttribute("class", i < (cells || 0) ? "sc-red" : "sc-cream"));
          pct.textContent = cells ? `скидка: ${cells} клеток` : "";
        }
        function setCells(n, user) { cells = n; st.set(n); paint(); if (user) fire(el); }
        drag(pad, fig, (p) => {
          if (locked(el) || p.x < X0 || p.x > X0 + 10 * C || p.y < Y0 || p.y > Y0 + 10 * C) return;
          const c = Math.min(9, Math.floor((p.x - X0) / C)), r = Math.min(9, Math.floor((p.y - Y0) / C));
          setCells(c * 10 + r + 1, true);
        });
        const row = controls(el);
        const st = stepper(row, "Скидка, %", 0, 100, (n) => setCells(n, true));
        const pf = numberField(row, "Новая цена", { min: 0, max: 1e6, unit: "₽", buttons: false }, (v) => { price = v; fire(el); });
        const lock = lockable(el);
        return {
          value: () => (cells === null && price === null ? null : { cells, price }),
          lock,
          reveal() {
            setCells(t.percent, false);
            price = (t.price * (100 - t.percent)) / 100;
            pf.set(price);
            answerLine(el, t.reveal || `${t.percent}% от ${fmt(t.price)} = ${fmt((t.price * t.percent) / 100)} ₽; новая цена ${fmt(price)} ₽`);
          },
          reset() { cells = null; price = null; st.set(null); pf.set(null); paint(); lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* ---------------------------------------------------------- garden-fence (math-5-4)
     * A vegetable patch on a 1-metre grid: fence = perimeter (1 section = 1 m), tiles = area (1 tile = 1 m²).
     * Each section / tile the pupil orders is laid around / inside the patch.
     * task: { a, b, ask: ["fence"] | ["tiles"] | ["fence","tiles"], solution: { fence?, tiles? } } */
    "garden-fence": {
      wrong(t) {
        const P = 2 * (t.a + t.b), S = t.a * t.b, mk = (f, s) => Object.fromEntries(t.ask.map((x) => [x, x === "fence" ? f : s]));
        return uniq([mk(S, P), mk(t.a + t.b, S + 1), mk(P - 1, 2 * S)], t, IntScenes.kinds["garden-fence"].check);
      },
      check(t, v) {
        if (!v) return false;
        return t.ask.every((x) => v[x] === (x === "fence" ? 2 * (t.a + t.b) : t.a * t.b));
      },
      build(el, t, k) {
        const { svg, stage, hint, celebrate, controls, numberField, lockable, answerLine } = k;
        const U = Math.min(40, 280 / t.a, 160 / t.b), W = 360, ox = (W - t.a * U) / 2, oy = 34 + (160 - t.b * U) / 2;
        hint(el, t.hint || "Закажите нужное число секций забора и плиток — они сразу лягут на грядку");
        const fig = stage(el, W, 262, `Грядка ${t.a} на ${t.b} метров на клетчатом поле`);
        svg("rect", { x: ox, y: oy, width: t.a * U, height: t.b * U, class: "sc-crust" }, fig);
        for (let i = 1; i < t.a; i++) svg("line", { x1: ox + i * U, y1: oy, x2: ox + i * U, y2: oy + t.b * U, style: "stroke:var(--sc-paper);stroke-width:1.5" }, fig);
        for (let j = 1; j < t.b; j++) svg("line", { x1: ox, y1: oy + j * U, x2: ox + t.a * U, y2: oy + j * U, style: "stroke:var(--sc-paper);stroke-width:1.5" }, fig);
        T(k, fig, ox + (t.a * U) / 2, oy - 14, `${t.a} м`, 16);
        T(k, fig, ox - 12, oy + (t.b * U) / 2 + 6, `${t.b} м`, 16, null, "end");
        const tilesG = svg("g", {}, fig), fenceG = svg("g", {}, fig);
        const note = T(k, fig, W / 2, 222, "", 15, "red");
        T(k, fig, W / 2, 254, "1 клетка: сторона 1 м, площадь 1 м²", 14, "soft");
        // unit edges of the border, clockwise from the top-left corner
        const edges = [];
        for (let i = 0; i < t.a; i++) edges.push([ox + i * U, oy, ox + (i + 1) * U, oy]);
        for (let j = 0; j < t.b; j++) edges.push([ox + t.a * U, oy + j * U, ox + t.a * U, oy + (j + 1) * U]);
        for (let i = t.a; i > 0; i--) edges.push([ox + i * U, oy + t.b * U, ox + (i - 1) * U, oy + t.b * U]);
        for (let j = t.b; j > 0; j--) edges.push([ox, oy + j * U, ox, oy + (j - 1) * U]);
        const v = { fence: null, tiles: null };
        function draw() {
          fenceG.textContent = "";
          tilesG.textContent = "";
          edges.slice(0, v.fence || 0).forEach(([x1, y1, x2, y2]) => {
            svg("line", { x1, y1, x2, y2, style: "stroke:var(--sc-gold);stroke-width:7;stroke-linecap:round" }, fenceG);
            svg("circle", { cx: x2, cy: y2, r: 4.5, class: "sc-ink" }, fenceG);
          });
          for (let i = 0; i < Math.min(v.tiles || 0, t.a * t.b); i++) {
            svg("rect", { x: ox + (i % t.a) * U + 3, y: oy + Math.floor(i / t.a) * U + 3, width: U - 6, height: U - 6, rx: 3, class: "sc-blue" }, tilesG);
          }
          const extra = [];
          if (v.fence > edges.length) extra.push(`лишних секций: ${v.fence - edges.length}`);
          if (v.tiles > t.a * t.b) extra.push(`лишних плиток: ${v.tiles - t.a * t.b}`);
          note.textContent = extra.join(", ");
        }
        const row = controls(el);
        const fields = {};
        t.ask.forEach((x) => {
          fields[x] = numberField(row, x === "fence" ? "Секций забора" : "Плиток", { min: 0, max: 99 }, (n) => { v[x] = n; draw(); fire(el); });
        });
        const lock = lockable(el);
        return {
          value: () => (t.ask.every((x) => v[x] === null) ? null : Object.fromEntries(t.ask.map((x) => [x, v[x]]))),
          lock,
          reveal() {
            const P = 2 * (t.a + t.b), S = t.a * t.b;
            t.ask.forEach((x) => { v[x] = x === "fence" ? P : S; fields[x].set(v[x]); });
            draw();
            answerLine(el, t.reveal || t.ask.map((x) => (x === "fence" ? `P = 2 · (${t.a} + ${t.b}) = ${P} м` : `S = ${t.a} · ${t.b} = ${S} м²`)).join("; "));
          },
          reset() { v.fence = v.tiles = null; Object.values(fields).forEach((f) => f.set(null)); draw(); lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* ---------------------------------------------------------- balance-box (math-5-5)
     * The scales from the video: boxes «?» (each weighs x) and kilo weights. Move weights between the pans and
     * the table — the scales tilt by the real weights, so taking the same from both pans keeps the balance.
     * Then type x.  task: { boxes, left: [kg], right: [kg], tray: [kg], solution: x } */
    "balance-box": {
      wrong(t) {
        const R = sum(t.right), K = sum(t.left), x = balanceX(t);
        return uniq([R + K, R, R - t.boxes, x + 1, (R + K) / t.boxes].filter(isInt), t, IntScenes.kinds["balance-box"].check);
      },
      check: (t, v) => typeof v === "number" && v === balanceX(t),
      build(el, t, k) {
        const { svg, stage, hint, celebrate, controls, numberField, lockable, answerLine, dnd } = k;
        hint(el, t.hint || "Перекладывайте гири между чашами и столом — весы покажут, где тяжелее. Потом впишите x");
        const fig = stage(el, 360, 282, "Чашечные весы с коробками и гирями");
        const PX = 180, PY = 58, ARM = 112, PANY = 104, x = balanceX(t);
        svg("rect", { x: PX - 5, y: PY, width: 10, height: 132, class: "sc-soft" }, fig);
        svg("rect", { x: PX - 40, y: 186, width: 80, height: 10, rx: 4, class: "sc-soft" }, fig);
        const beam = svg("line", { x1: PX - ARM, y1: PY, x2: PX + ARM, y2: PY, style: "stroke:var(--sc-gold);stroke-width:7;stroke-linecap:round" }, fig);
        svg("circle", { cx: PX, cy: PY, r: 7, class: "sc-ink" }, fig);
        const pans = [-1, 1].map((s) => {
          const g = svg("g", {}, fig);
          svg("path", { d: `M${PX + s * ARM} ${PY} L${PX + s * ARM - 62} ${PANY + 64} M${PX + s * ARM} ${PY} L${PX + s * ARM + 62} ${PANY + 64}`, class: "sc-stroke", style: "stroke-width:1.5" }, g);
          svg("path", { d: `M${PX + s * ARM - 68} ${PANY + 64} h136 q-10 18 -68 18 q-58 0 -68 -18 Z`, class: "sc-cream" }, g);
          return g;
        });
        const boxG = pans[0];
        for (let i = 0; i < t.boxes; i++) {
          const [bx, by] = [PX - ARM - 42 + 42 * (i % 3), PANY + 48];
          svg("rect", { x: bx - 16, y: by - 16, width: 32, height: 32, rx: 3, class: "sc-crust" }, boxG);
          T(k, boxG, bx, by + 7, "?", 20, "red");
        }
        const slot = (zid, i) => {
          const z = d.zone(zid);
          const j = i + (zid === "L" ? t.boxes : 0);
          return [z.x + 23 + 42 * (j % 3), z.y + z.h - 16 - 32 * Math.floor(j / 3)];
        };
        const d = dnd(fig, [
          { id: "L", x: PX - ARM - 66, y: PANY, w: 132, h: 66, label: "Левая чаша", hideLabel: true, layout: (i) => slot("L", i) },
          { id: "R", x: PX + ARM - 66, y: PANY, w: 132, h: 66, label: "Правая чаша", hideLabel: true, layout: (i) => slot("R", i) },
          { id: "T", x: 12, y: 214, w: 336, h: 56, label: "Стол", hideLabel: true, cols: 8, cell: 41, layout: (i) => [12 + 62 + 41 * i, 246] },
        ], () => tilt());
        // the dashed pans would hide the drawn dishes: keep the zones transparent-looking
        fig.querySelectorAll('[data-zone="L"], [data-zone="R"]').forEach((r) => (r.style.fillOpacity = "0"));
        const all = [...t.left.map((w) => [w, "L"]), ...t.right.map((w) => [w, "R"]), ...(t.tray || []).map((w) => [w, "T"])];
        const kg = [];
        all.forEach(([w, z], i) => {
          const n = svg("g", { "aria-label": `Гиря ${w} кг` });
          svg("circle", { cx: 0, cy: -14, r: 6, style: "fill:none;stroke:var(--sc-soft);stroke-width:3" }, n);
          svg("path", { d: "M-17 14 L-12 -9 L12 -9 L17 14 Z", class: "sc-soft" }, n);
          T(k, n, 0, 9, String(w), 15, "cream");
          kg.push(w);
          d.add(`w${i}`, n, z);
        });
        T(k, fig, 26, 248, "кг", 15, "soft", "start");
        function tilt() {
          const load = (z) => sum(d.itemsIn(z).map((id) => kg[Number(id.slice(1))]));
          const diff = t.boxes * x + load("L") - load("R");
          const off = k.clamp(diff * 2.5, -16, 16);
          beam.setAttribute("y1", PY + off);
          beam.setAttribute("y2", PY - off);
          [["L", off], ["R", -off]].forEach(([id, o], j) => {
            const z = d.zone(id);
            z.y = PANY + o;
            fig.querySelector(`[data-zone="${id}"]`).setAttribute("y", z.y);
            pans[j].setAttribute("transform", `translate(0 ${o})`);
            const any = d.itemsIn(id)[0];
            if (any) d.place(any, id);
          });
          fire(el);
        }
        tilt();
        const row = controls(el);
        let val = null;
        const xf = numberField(row, "x =", { min: 0, max: 999, unit: "кг" }, (n) => { val = n; fire(el); });
        const lock = lockable(el);
        return {
          value: () => val,
          lock(on) { lock(on); d.lock(on); },
          reveal() {
            val = x; xf.set(x);
            answerLine(el, t.reveal || `${t.boxes > 1 ? t.boxes + " · " : ""}x${sum(t.left) ? " + " + sum(t.left) : ""} = ${sum(t.right)}, x = ${x} кг`);
          },
          reset() {
            all.forEach(([, z], i) => d.place(`w${i}`, z));
            tilt(); val = null; xf.set(null); lock(false); d.lock(false);
          },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* -------------------------------------------------------------- cube-box (math-5-6)
     * The box from the «length, area, volume» video: fill it with 1-cm cubes — first one layer on the floor,
     * then stack layers.  task: { a, b, c, unit, solution: { layer: a·b, layers: c } } */
    "cube-box": {
      wrong: (t) => uniq([
        { layer: t.a * t.b, layers: t.c + 1 },
        { layer: 2 * (t.a + t.b), layers: t.c },
        { layer: t.a + t.b, layers: t.c },
      ], t, IntScenes.kinds["cube-box"].check),
      check: (t, v) => Boolean(v) && v.layer === t.a * t.b && v.layers === t.c,
      build(el, t, k) {
        const { svg, stage, hint, celebrate, controls, stepper, lockable, answerLine } = k;
        const u = Math.min(36, 230 / (t.a + 0.55 * t.b), 196 / (t.c + 2 + 0.4 * t.b)), dx = u * 0.55, dy = u * 0.4;
        const W = 360, H = 268, ox = (W - t.a * u - t.b * dx) / 2, oy = H - 34;
        const P = (x, y, z) => [ox + x * u + y * dx, oy - z * u - y * dy];
        const poly = (pts, attrs, p) => svg("polygon", { points: pts.map((q) => q.join(",")).join(" "), ...attrs }, p);
        hint(el, t.hint || "Сначала выложите один слой кубиков на дно, потом решите, сколько таких слоёв войдёт");
        const fig = stage(el, W, H, `Коробка ${t.a} на ${t.b} на ${t.c} ${t.unit}`);
        poly([P(0, 0, 0), P(t.a, 0, 0), P(t.a, t.b, 0), P(0, t.b, 0)], { class: "sc-cream" }, fig);
        poly([P(0, t.b, 0), P(t.a, t.b, 0), P(t.a, t.b, t.c), P(0, t.b, t.c)], { class: "sc-cream", opacity: 0.6 }, fig);
        const cubesG = svg("g", {}, fig);
        const wire = svg("g", { class: "sc-stroke", style: "stroke-width:2" }, fig);
        const edge = (a, b) => svg("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, wire);
        [[[0, 0, 0], [t.a, 0, 0]], [[t.a, 0, 0], [t.a, t.b, 0]], [[0, 0, 0], [0, 0, t.c]], [[t.a, 0, 0], [t.a, 0, t.c]], [[t.a, t.b, 0], [t.a, t.b, t.c]],
          [[0, 0, t.c], [t.a, 0, t.c]], [[t.a, 0, t.c], [t.a, t.b, t.c]], [[t.a, t.b, t.c], [0, t.b, t.c]], [[0, t.b, t.c], [0, 0, t.c]]]
          .forEach(([a, b]) => edge(P(...a), P(...b)));
        T(k, fig, P(t.a / 2, 0, 0)[0], oy + 22, `${t.a} ${t.unit}`, 15);
        T(k, fig, P(t.a, t.b / 2, 0)[0] + 14, P(t.a, t.b / 2, 0)[1] + 6, `${t.b} ${t.unit}`, 15, null, "start");
        T(k, fig, ox - 8, P(0, 0, t.c / 2)[1] + 5, `${t.c} ${t.unit}`, 15, null, "end");
        const note = T(k, fig, 14, 24, "", 15, "red", "start");
        const face = (c) => ({ style: `fill:${c};stroke:var(--sc-paper);stroke-width:1` });
        let layer = null, layers = null;
        function draw() {
          cubesG.textContent = "";
          const per = Math.min(layer || 0, t.a * t.b), L = layer ? layers || 1 : 0;
          for (let z = 0; z < L; z++) {
            const cells = [];
            for (let i = 0; i < per; i++) cells.push([i % t.a, t.b - 1 - Math.floor(i / t.a)]);
            cells.sort((p, q) => q[1] - p[1] || p[0] - q[0]).forEach(([x, y]) => {
              poly([P(x, y, z), P(x + 1, y, z), P(x + 1, y, z + 1), P(x, y, z + 1)], face("var(--sc-teal)"), cubesG);
              poly([P(x, y, z + 1), P(x + 1, y, z + 1), P(x + 1, y + 1, z + 1), P(x, y + 1, z + 1)], face("color-mix(in srgb, var(--sc-teal) 55%, var(--sc-cream))"), cubesG);
              poly([P(x + 1, y, z), P(x + 1, y + 1, z), P(x + 1, y + 1, z + 1), P(x + 1, y, z + 1)], face("color-mix(in srgb, var(--sc-teal) 70%, #000)"), cubesG);
            });
          }
          const extra = (layer || 0) - t.a * t.b;
          note.textContent = extra > 0 ? `на дно не влезает: ${extra}` : layers > t.c ? "кубики торчат из коробки" : "";
        }
        const row = controls(el);
        const s1 = stepper(row, "Кубиков в слое", 1, 40, (n) => { layer = n; draw(); fire(el); });
        const s2 = stepper(row, "Слоёв", 1, t.c + 2, (n) => { layers = n; draw(); fire(el); });
        const lock = lockable(el);
        return {
          value: () => (layer === null && layers === null ? null : { layer, layers }),
          lock,
          reveal() {
            layer = t.a * t.b; layers = t.c; s1.set(layer); s2.set(layers); draw();
            answerLine(el, t.reveal || `В слое ${t.a} · ${t.b} = ${layer} кубиков, слоёв ${t.c}: V = ${layer} · ${t.c} = ${layer * t.c} ${t.unit}³`);
          },
          reset() { layer = layers = null; s1.set(null); s2.set(null); draw(); lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* --------------------------------------------------------- headline-round (math-5-7)
     * The stadium scoreboard and the sports newspaper: set the headline's digits (▲ ▼) to the number rounded
     * to the asked place.  task: { board: 47862, place: 1000, solution: 48000 } */
    "headline-round": {
      wrong(t) {
        const b = t.board, p = t.place;
        return uniq([Math.floor(b / p) * p, Math.round(b / (p * 10)) * p * 10, p >= 10 ? Math.round(b / (p / 10)) * (p / 10) : b + 1, b], t, IntScenes.kinds["headline-round"].check);
      },
      check: (t, v) => typeof v === "number" && v === Math.round(t.board / t.place) * t.place,
      build(el, t, k) {
        const { svg, stage, hint, celebrate, lockable, answerLine } = k;
        hint(el, t.hint || "Нажимайте ▲ и ▼ над цифрами газеты, чтобы собрать число для заголовка");
        const fig = stage(el, 360, 282, "Табло стадиона и газета");
        svg("rect", { x: 70, y: 10, width: 220, height: 72, rx: 10, style: "fill:#2b2940" }, fig);
        T(k, fig, 180, 31, "ЗРИТЕЛИ", 14, "gold");
        T(k, fig, 180, 70, fmt(t.board), 36, "gold");
        svg("rect", { x: 16, y: 92, width: 328, height: 182, rx: 6, class: "sc-cream" }, fig);
        T(k, fig, 180, 116, "НОВОСТИ СПОРТА", 16);
        svg("line", { x1: 40, y1: 124, x2: 320, y2: 124, class: "sc-stroke", style: "stroke-width:2" }, fig);
        T(k, fig, 180, 146, "На матч пришли … зрителей", 15);
        const sol = Math.round(t.board / t.place) * t.place;
        const n = Math.max(String(t.board).length, String(sol).length);
        const start = String(t.board).padStart(n, "0").split("").map(Number);
        const digits = start.slice();
        let touched = false;
        const CW = 42, gap = 6, sep = 10;
        let acc = 0;
        const xs = digits.map((_, i) => { if (i > 0 && (n - i) % 3 === 0) acc += sep; return i * (CW + gap) + acc; });
        const left = 180 - (xs[n - 1] + CW) / 2;
        const texts = digits.map((dg, i) => {
          const x = left + xs[i];
          svg("rect", { x, y: 190, width: CW, height: 46, rx: 7, class: "sc-paper" }, fig);
          [[-1, 152, "M%x 182 l12 -20 l12 20 Z"], [1, 240, "M%x 244 l12 20 l12 -20 Z"]].forEach(([s, y0, path]) => {
            svg("path", { d: path.replace("%x", x + CW / 2 - 12), class: "sc-teal" }, fig);
            tapRect(k, el, fig, { x, y: y0, width: CW, height: 34 }, `Разряд ${n - i}: ${s > 0 ? "уменьшить" : "увеличить"}`, () => {
              digits[i] = (digits[i] + (s > 0 ? 9 : 1)) % 10;
              touched = true;
              paint(); k.pop(texts[i]); fire(el);
            });
          });
          return T(k, fig, x + CW / 2, 224, String(dg), 30);
        });
        function paint() { texts.forEach((tx, i) => { tx.textContent = digits[i]; tx.style.fill = digits[i] !== start[i] ? "var(--sc-red)" : ""; }); }
        const lock = lockable(el);
        return {
          value: () => (touched ? Number(digits.join("")) : null),
          lock,
          reveal() {
            String(sol).padStart(n, "0").split("").forEach((c, i) => (digits[i] = Number(c)));
            touched = true; paint();
            answerLine(el, t.reveal || `${fmt(t.board)} ≈ ${fmt(sol)}`);
          },
          reset() { start.forEach((c, i) => (digits[i] = c)); touched = false; paint(); lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* ----------------------------------------------------------- pizza-trays (math-5-8)
     * The 11 quarter-slices: drag slices onto the trays to make whole pizzas, then set whole pizzas and spare
     * slices.  task: { slices, den, solution: { whole, num } } — right when whole·den + num = slices, num < den */
    "pizza-trays": {
      wrong(t) {
        const w = Math.floor(t.slices / t.den), r = t.slices % t.den;
        return uniq([{ whole: w - 1, num: r + t.den }, { whole: w, num: r + 1 }, { whole: r, num: w }, { whole: t.slices, num: t.den }], t, IntScenes.kinds["pizza-trays"].check);
      },
      check: (t, v) => Boolean(v) && isInt(v.whole) && isInt(v.num) && v.num >= 0 && v.num < t.den && v.whole * t.den + v.num === t.slices,
      build(el, t, k) {
        const { svg, stage, hint, celebrate, controls, stepper, lockable, answerLine, dnd, art } = k;
        hint(el, t.hint || "Перетащите кусочки на подносы — соберите целые пиццы. Потом запишите смешанное число");
        const fig = stage(el, 360, 262, `${t.slices} кусочков пиццы по 1/${t.den}`);
        const trays = Math.floor(t.slices / t.den) + 1, TW = 100, gap = 12, x0 = (360 - trays * TW - (trays - 1) * gap) / 2;
        const wide = t.den <= 3, cell = wide ? 54 : 46, cols = wide ? 6 : 7;
        const zones = Array.from({ length: trays }, (_, i) => ({ id: `p${i}`, x: x0 + i * (TW + gap), y: 10, w: TW, h: TW, label: `Поднос ${i + 1}`, hideLabel: true, layout: () => [x0 + i * (TW + gap) + TW / 2, 60] }));
        zones.push({ id: "table", x: 10, y: 132, w: 340, h: 116, label: "Стол", hideLabel: true, cols, cell, layout: (i) => [10 + (340 - cols * cell) / 2 + cell * ((i % cols) + 0.5), 132 + 56 * Math.floor(i / cols) + 34] });
        const d = dnd(fig, zones, () => { arrange(); });
        const layer = fig.querySelector(".sc-items");
        zones.slice(0, trays).forEach((z) => fig.insertBefore(svg("circle", { cx: z.x + TW / 2, cy: 60, r: 45, "pointer-events": "none", style: "fill:none;stroke:var(--sc-line);stroke-width:2.5" }), layer));
        const inner = [];
        for (let i = 0; i < t.slices; i++) {
          const n = svg("g", { "aria-label": `Кусочек 1/${t.den}` });
          const s = svg("g", {}, n);
          art.slice(s, t.den, 42);
          inner.push(s);
          d.add(`s${i}`, n, "table");
        }
        function arrange() {
          inner.forEach((s, i) => {
            const z = d.zoneOf(`s${i}`);
            const idx = d.itemsIn(z).indexOf(`s${i}`);
            s.setAttribute("transform", z === "table" ? "translate(0 15) scale(0.72)" : `rotate(${(360 / t.den) * idx})`);
          });
          fire(el);
        }
        arrange();
        const row = controls(el);
        const v = { whole: null, num: null };
        const sw = stepper(row, "Целых пицц", 0, trays + 2, (n) => { v.whole = n; fire(el); });
        const sn = stepper(row, `Ещё кусочков по 1/${t.den}`, 0, t.slices, (n) => { v.num = n; fire(el); });
        const lock = lockable(el);
        return {
          value: () => (v.whole === null && v.num === null ? null : { whole: v.whole, num: v.num }),
          lock(on) { lock(on); d.lock(on); },
          reveal() {
            const w = Math.floor(t.slices / t.den), r = t.slices % t.den;
            for (let i = 0; i < t.slices; i++) d.place(`s${i}`, i < w * t.den ? `p${Math.floor(i / t.den)}` : `p${w}`);
            arrange();
            v.whole = w; v.num = r; sw.set(w); sn.set(r);
            answerLine(el, t.reveal || `${t.slices}/${t.den} = ${t.slices} : ${t.den} = ${w} (ост. ${r}) → ${w} ${r}/${t.den}`);
          },
          reset() {
            for (let i = 0; i < t.slices; i++) d.place(`s${i}`, "table");
            arrange(); v.whole = v.num = null; sw.set(null); sn.set(null); lock(false); d.lock(false);
          },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* ----------------------------------------------------------- candy-sacks (math-5-9)
     * The sack of 1 254 candies and the kids: tap every sack that splits evenly among the kids, without
     * long division.  task: { kids, sacks: [numbers], solution: [indices] } */
    "candy-sacks": {
      wrong(t) {
        const all = t.sacks.map((_, i) => i), good = all.filter((i) => t.sacks[i] % t.kids === 0);
        const bad = all.filter((i) => !good.includes(i));
        const by3 = all.filter((i) => t.sacks[i] % 3 === 0), last = all.filter((i) => [2, 5, 10].includes(t.kids) ? t.sacks[i] % 3 === 0 : (t.sacks[i] % 10) % t.kids === 0);
        return uniq([all, bad, by3, last, good.slice(1)].filter((x) => x.length), t, IntScenes.kinds["candy-sacks"].check);
      },
      check: (t, v) => Array.isArray(v) && k0.sameSet(v, t.sacks.map((_, i) => i).filter((i) => t.sacks[i] % t.kids === 0)),
      build(el, t, k) {
        const { svg, stage, hint, celebrate, lockable, answerLine } = k;
        hint(el, t.hint || "Нажмите на каждый мешок, который можно разделить поровну, без остатка");
        const fig = stage(el, 360, 262, `Мешки с конфетами и ${t.kids} детей`);
        const n = t.sacks.length, step = 340 / n;
        const picked = new Set();
        const sums = [];
        const gs = t.sacks.map((c, i) => {
          const cx = 10 + step * (i + 0.5);
          const g = svg("g", {}, fig);
          const body = svg("g", {}, g);
          svg("path", { d: "M-14 -30 L-22 -50 L22 -50 L14 -30 Z", class: "sc-crust" }, body);
          [[-8, "red"], [3, "teal"], [12, "gold"]].forEach(([x, col]) => k.art.candy(body, col, 0.5).setAttribute("transform", `translate(${x} -52) scale(0.5)`));
          svg("path", { d: "M-16 -32 Q-48 10 -30 44 Q0 58 30 44 Q48 10 16 -32 Z", class: "sc-crust" }, body);
          svg("rect", { x: -17, y: -36, width: 34, height: 7, rx: 3, class: "sc-red" }, body);
          svg("rect", { x: -37, y: 0, width: 74, height: 28, rx: 5, class: "sc-cream" }, body);
          T(k, body, 0, 20, fmt(c), 17);
          const ok = svg("g", { opacity: 0 }, g);
          svg("circle", { cx: 26, cy: -40, r: 12, class: "sc-teal" }, ok);
          T(k, ok, 26, -34, "✓", 15, "cream");
          sums.push(T(k, g, 0, 74, "", 14, "soft"));
          g.setAttribute("transform", `translate(${cx} 84)`);
          const r = tapRect(k, el, g, { x: -40, y: -62, width: 80, height: 116 }, `Мешок: ${fmt(c)} конфет`, () => toggle(i));
          r.setAttribute("role", "checkbox");
          return { g, ok, cx, r };
        });
        const kidStep = Math.min(62, 320 / t.kids);
        const colors = ["teal", "red", "gold", "blue", "violet"];
        for (let i = 0; i < t.kids; i++) {
          const kid = k.art.kid(fig, colors[i % 5], 1.1);
          kid.setAttribute("transform", `translate(${180 + (i - (t.kids - 1) / 2) * kidStep} 226) scale(1.1)`);
        }
        function paint() {
          gs.forEach((s, i) => {
            const on = picked.has(i);
            s.g.setAttribute("transform", `translate(${s.cx} ${on ? 98 : 84})`);
            s.ok.setAttribute("opacity", on ? 1 : 0);
            s.r.setAttribute("aria-checked", String(on));
          });
        }
        function toggle(i) { picked.has(i) ? picked.delete(i) : picked.add(i); paint(); k.pop(gs[i].g); fire(el); }
        paint();
        const lock = lockable(el);
        return {
          value: () => (picked.size ? [...picked].sort((a, b) => a - b) : null),
          lock,
          reveal() {
            picked.clear();
            t.sacks.forEach((c, i) => { if (c % t.kids === 0) picked.add(i); sums[i].textContent = [2, 5, 10].includes(t.kids) ? `цифра ${c % 10}` : `Σ ${String(c).split("").reduce((s, x) => s + Number(x), 0)}`; });
            paint();
            answerLine(el, t.reveal || `Поровну на ${t.kids}: ${[...picked].map((i) => fmt(t.sacks[i])).join(", ")}`);
          },
          reset() { picked.clear(); sums.forEach((s) => (s.textContent = "")); paint(); lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },
  });
  const k0 = IntScenes.kit;
})();
