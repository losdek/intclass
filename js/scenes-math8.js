/* Scenes for grade 8 math (see js/scenes.js). Every picture is drawn to scale from the task's numbers. */
(function () {
  const IntScenes = typeof window !== "undefined" ? window.IntScenes : require("./scenes.js");
  const K = IntScenes.kit;
  const isNum = (v) => typeof v === "number" && Number.isFinite(v);
  const fire = (el) => el.dispatchEvent(new Event("change", { bubbles: true }));
  const big = (n) => K.num(Math.abs(n) >= 1e4 ? String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ") : n);
  const rad = (d) => (d * Math.PI) / 180;
  const r1 = (x) => K.num(Math.round(x * 10) / 10);

  // a draggable handle: pointer drag on the handle itself, arrow keys from the keyboard; ignored while locked
  function grip(fig, el, node, aria, onPoint, onKey) {
    node.setAttribute("tabindex", "0");
    node.setAttribute("role", "slider");
    node.setAttribute("aria-label", aria);
    node.classList.add("sc-grip");
    const off = () => el.classList.contains("is-locked");
    node.addEventListener("pointerdown", (e) => {
      if (off() || e.button > 0) return;
      e.preventDefault();
      node.setPointerCapture?.(e.pointerId);
      onPoint(K.pointer(fig, e));
      const move = (ev) => onPoint(K.pointer(fig, ev));
      const up = () => ["pointermove", "pointerup", "pointercancel"].forEach((n, i) => node.removeEventListener(n, i ? up : move));
      node.addEventListener("pointermove", move);
      node.addEventListener("pointerup", up);
      node.addEventListener("pointercancel", up);
    });
    node.addEventListener("keydown", (e) => {
      const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
      if (d && !off()) { e.preventDefault(); onKey(d); }
    });
    return node;
  }
  // handle drawing: a visible dot inside a 36-unit invisible hit circle
  function knob(parent, cls = "sc-red") {
    const g = K.svg("g", {}, parent);
    K.svg("circle", { r: 18, class: "sc-hit" }, g);
    K.svg("circle", { r: 9, class: `sc-knob ${cls}` }, g);
    return g;
  }
  const at = (node, x, y) => node.setAttribute("transform", `translate(${x} ${y})`);
  // a stepper that counts in `step`s and shows the unit (25°, 30°, …)
  function stepBy(row, name, min, max, step, unit, onChange) {
    const s = K.stepper(row, name, min / step, max / step, (n) => { show(n); onChange(n * step); });
    const out = row.lastElementChild.querySelector("output");
    const show = (n) => (out.textContent = n === null ? "?" : K.num(n * step) + unit);
    return { set(v) { s.set(v === null ? null : Math.round(v / step)); show(v === null ? null : Math.round(v / step)); } };
  }
  // a row of answer buttons with nothing chosen at the start
  function choice(el, options, aria, onPick) {
    const row = document.createElement("div");
    row.className = "task-toggle task-palette";
    row.setAttribute("role", "radiogroup");
    row.setAttribute("aria-label", aria);
    el.appendChild(row);
    const btns = options.map(([id, text]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "radio");
      b.textContent = text;
      b.addEventListener("click", () => { set(id); onPick(id); });
      row.appendChild(b);
      return [id, b];
    });
    const set = (id) => btns.forEach(([i, b]) => { b.classList.toggle("is-on", i === id); b.setAttribute("aria-checked", String(i === id)); });
    return { set };
  }
  function tree(parent, x, g, hpx) {
    const n = K.svg("g", {}, parent);
    K.svg("rect", { x: x - Math.max(3, hpx * 0.03), y: g - hpx * 0.6, width: Math.max(6, hpx * 0.06), height: hpx * 0.6, class: "sc-crust" }, n);
    [[-0.16, 0.36, 0.17], [0.16, 0.36, 0.17], [0, 0.24, 0.24]].forEach(([dx, dy, r]) =>
      K.svg("circle", { cx: x + dx * hpx, cy: g - hpx + dy * hpx + (r === 0.24 ? 0 : 0.17 * hpx), r: r * hpx, class: "sc-teal" }, n));
    return n;
  }
  const line = (p, x1, y1, x2, y2, cls) => K.svg("line", { x1, y1, x2, y2, class: cls }, p);
  const txt = (p, x, y, s, cls = "sc-t16", a) => K.label(p, x, y, s, cls, a);

  IntScenes.add({
    /* ------------------------------------------------------------- room-plan (math-8-1)
     * A floor plan: the room is x m wide and x + 2 m long. Drag its corner until the floor has the right area.
     * task: { area, maxX = 8, solution: x }  value: x */
    "room-plan": {
      wrong: (t) => [t.solution - 1, t.solution + 1, t.solution + 2],
      check: (t, v) => Number.isInteger(v) && v > 0 && v * (v + 2) === t.area,
      build(el, t, kit) {
        const S = 20, X0 = 36, Y0 = 44, max = t.maxX || 8;
        hintAnd(el, t, "Тяните красный угол комнаты: ширина x, длина всегда на 2 м больше");
        const fig = kit.stage(el, 360, 250, "План комнаты: ширина x, длина x + 2");
        const room = K.svg("g", {}, fig);
        const lenL = txt(fig, 0, 0, ""), widL = txt(fig, 0, 0, "");
        txt(fig, 300, 52, "Нужно", "sc-t14 sc-tx-soft");
        txt(fig, 300, 76, `${t.area} м²`, "sc-t22 sc-tx-teal");
        txt(fig, 300, 124, "S = x(x + 2)", "sc-t14 sc-tx-soft");
        const sL = txt(fig, 300, 150, "", "sc-t20");
        const h = grip(fig, el, knob(fig), "Угол комнаты: ширина x", (p) => set(Math.round(((p.x - X0) / S - 2 + (p.y - Y0) / S) / 2), true), (d) => set((x || 2) + d, true));
        let x = null;
        function draw(n) {
          room.textContent = "";
          const w = (n + 2) * S, hh = n * S;
          K.svg("rect", { x: X0, y: Y0, width: w, height: hh, class: "sc-cheese" }, room);
          for (let i = 1; i < n + 2; i++) line(room, X0 + i * S, Y0, X0 + i * S, Y0 + hh, "sc-grid");
          for (let j = 1; j < n; j++) line(room, X0, Y0 + j * S, X0 + w, Y0 + j * S, "sc-grid");
          K.svg("rect", { x: X0, y: Y0, width: w, height: hh, class: "sc-stroke" }, room);
          lenL.setAttribute("x", X0 + w / 2); lenL.setAttribute("y", Y0 - 10);
          lenL.textContent = x === null ? "x + 2" : `x + 2 = ${n + 2} м`;
          widL.setAttribute("transform", `translate(${X0 - 10} ${Y0 + hh / 2}) rotate(-90)`);
          widL.textContent = x === null ? "x" : `x = ${n}`;
          sL.textContent = x === null ? "S = ?" : `S = ${n * (n + 2)} м²`;
          at(h, X0 + w, Y0 + hh);
        }
        function set(n, user) {
          x = K.clamp(n, 1, max);
          draw(x);
          if (user) fire(el);
        }
        draw(2);
        const lock = K.lockable(el);
        return {
          value: () => x,
          lock,
          reveal() { set(t.solution); K.answerLine(el, t.reveal || `x = ${t.solution} м: ${t.solution} · ${t.solution + 2} = ${t.area} м²`); },
          reset() { x = null; draw(2); lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },

    /* ------------------------------------------------------------- park-diagonal (math-8-2)
     * The park corner to scale: paths along the legs a and b, the shortcut across, squares on the legs.
     * task: { a, b, solution: c }  value: the typed length of the shortcut */
    "park-diagonal": {
      wrong: (t) => [t.a + t.b, (t.a + t.b) / 2, t.a * t.a + t.b * t.b],
      check: (t, v) => isNum(v) && v === t.solution,
      build(el, t, kit) {
        const { a, b } = t, u = 216 / (a + b), cx = 14 + a * u, cy = 12 + a * u;
        hintAnd(el, t, "Посчитайте и впишите длину пути напрямик");
        const fig = kit.stage(el, 360, 12 + (a + b) * u + 22, "Парк: дорожки вдоль сторон и тропинка напрямик");
        const A = [cx, cy - a * u], E = [cx + b * u, cy];
        K.svg("rect", { x: cx - a * u, y: A[1], width: a * u, height: a * u, class: "sc-gold sc-faint" }, fig);
        K.svg("rect", { x: cx, y: cy, width: b * u, height: b * u, class: "sc-blue sc-faint" }, fig);
        txt(fig, cx - a * u / 2, cy - a * u / 2 + (a * u >= 72 ? -2 : 5), `${big(a)}²`, "sc-t14");
        if (a * u >= 72) txt(fig, cx - a * u / 2, cy - a * u / 2 + 16, `= ${big(a * a)}`, "sc-t14");
        txt(fig, cx + b * u / 2, cy + b * u / 2 - 2, `${big(b)}²`, "sc-t16");
        txt(fig, cx + b * u / 2, cy + b * u / 2 + 18, `= ${big(b * b)}`, "sc-t16");
        K.svg("rect", { x: cx, y: A[1], width: b * u, height: a * u, class: "sc-teal" }, fig);
        K.svg("path", { d: `M${A[0]} ${A[1]} L${cx} ${cy} L${E[0]} ${E[1]}`, class: "sc-walk" }, fig);
        line(fig, A[0], A[1], E[0], E[1], "sc-ln sc-ln-ink sc-dash");
        txt(fig, cx + 8, (A[1] + cy) / 2 + 6, `${big(a)} м`, "sc-t14 sc-tx-cream", "start");
        txt(fig, cx + b * u / 2, cy - 8, `${big(b)} м`, "sc-t14 sc-tx-cream");
        const kid = kit.art.kid(fig, "red", 0.55);
        kid.setAttribute("transform", `translate(${A[0] + 12} ${A[1] + 12}) scale(0.55)`);
        const ang = Math.atan2(a, b);
        const cL = txt(fig, 0, 0, "? м", "sc-t16 sc-tx-cream");
        cL.setAttribute("transform", `translate(${A[0] + 0.62 * (E[0] - A[0]) + 10 * Math.sin(ang)} ${A[1] + 0.62 * (E[1] - A[1]) - 10 * Math.cos(ang) + 4}) rotate(${(ang * 180) / Math.PI})`);
        txt(fig, 346, cy + 34, "в обход", "sc-t14 sc-tx-soft", "end");
        txt(fig, 346, cy + 58, `${big(a + b)} м`, "sc-t18", "end");
        const row = K.controls(el);
        let c = null;
        const field = K.numberField(row, "Напрямик", { min: 0, max: 1e7, unit: "м", buttons: false }, (v) => { c = v; cL.textContent = `${v === null ? "?" : big(v)} м`; fire(el); });
        const lock = K.lockable(el);
        return {
          value: () => c,
          lock,
          reveal() { c = t.solution; field.set(c); cL.textContent = `${big(c)} м`; K.answerLine(el, t.reveal || `${big(a * a)} + ${big(b * b)} = ${big(c * c)} = ${big(c)}², напрямик ${big(c)} м`); },
          reset() { c = null; field.set(null); cL.textContent = "? м"; lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },

    /* ------------------------------------------------------------- vieta-cards (math-8-3)
     * x² + px + q = 0 on the board and a row of number cards: pick the two roots (sum −p, product q).
     * task: { p, q, cards: [n…8], solution: [x1, x2] }  value: the two picked numbers, sorted */
    "vieta-cards": {
      wrong: (t) => {
        const [x, y] = t.solution;
        return [[-x, -y].sort((m, n) => m - n), [x + 1, y - 1].sort((m, n) => m - n), [1, t.q].sort((m, n) => m - n)].filter((w) => !(w[0] + w[1] === -t.p && w[0] * w[1] === t.q));
      },
      check: (t, v) => Array.isArray(v) && v.length === 2 && v.every(isNum) && v[0] + v[1] === -t.p && v[0] * v[1] === t.q,
      build(el, t, kit) {
        hintAnd(el, t, "Нажмите на две карточки — это будут корни");
        const fig = kit.stage(el, 360, 272, "Уравнение и карточки с числами");
        const sg = (n, x) => (n < 0 ? ` − ${K.num(-n)}${x}` : ` + ${K.num(n)}${x}`);
        const pp = t.p === 1 ? " + x" : t.p === -1 ? " − x" : sg(t.p, "x");
        txt(fig, 180, 36, `x²${t.p ? pp : ""}${sg(t.q, "")} = 0`, "sc-t22");
        const slots = [110, 250].map((x, i) => {
          K.svg("rect", { x: x - 40, y: 52, width: 80, height: 40, rx: 8, class: "sc-cream sc-slot" }, fig);
          txt(fig, x - 52, 78, i ? "x₂" : "x₁", "sc-t16 sc-tx-soft", "end");
          return txt(fig, x, 79, "?", "sc-t20");
        });
        const sumL = txt(fig, 24, 124, "", "sc-t16", "start"), prodL = txt(fig, 24, 150, "", "sc-t16", "start");
        txt(fig, 336, 124, `нужно ${K.num(-t.p)}`, "sc-t16 sc-tx-teal", "end");
        txt(fig, 336, 150, `нужно ${K.num(t.q)}`, "sc-t16 sc-tx-teal", "end");
        let picked = [];
        const cards = t.cards.map((n, i) => {
          const c = kit.art.card(fig, K.num(n), 72, 42, "sc-tap");
          at(c, 54 + (i % 4) * 84, 192 + Math.floor(i / 4) * 52);
          c.setAttribute("role", "button");
          c.setAttribute("aria-label", `Карточка ${K.num(n)}`);
          K.toggleable(c, () => { if (el.classList.contains("is-locked")) return; tap(i); K.pop(c); fire(el); });
          return c;
        });
        function tap(i) {
          picked = picked.includes(i) ? picked.filter((j) => j !== i) : [...picked, i].slice(-2);
          paint();
        }
        function paint() {
          const v = picked.map((i) => t.cards[i]);
          cards.forEach((c, i) => { c.classList.toggle("is-on", picked.includes(i)); c.setAttribute("aria-pressed", String(picked.includes(i))); });
          slots.forEach((s, i) => (s.textContent = v[i] === undefined ? "?" : K.num(v[i])));
          const p = (n) => (n < 0 ? `(${K.num(n)})` : K.num(n));
          sumL.textContent = v.length === 2 ? `x₁ + x₂ = ${p(v[0])} + ${p(v[1])} = ${K.num(v[0] + v[1])}` : "x₁ + x₂ = ?";
          prodL.textContent = v.length === 2 ? `x₁ · x₂ = ${p(v[0])} · ${p(v[1])} = ${K.num(v[0] * v[1])}` : "x₁ · x₂ = ?";
        }
        paint();
        const lock = K.lockable(el);
        return {
          value: () => (picked.length === 2 ? picked.map((i) => t.cards[i]).sort((m, n) => m - n) : null),
          lock,
          reveal() {
            picked = t.solution.map((n) => t.cards.indexOf(n));
            paint();
            K.answerLine(el, t.reveal || `Корни ${K.num(t.solution[0])} и ${K.num(t.solution[1])}`);
          },
          reset() { picked = []; paint(); lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },

    /* ------------------------------------------------------------- bun-basket (math-8-4)
     * The shop: buns on the shelf, a basket, money in the pocket. Put in as many buns as the money allows.
     * task: { money, price, buns, solution: n }  value: buns in the basket */
    "bun-basket": {
      wrong: (t) => [t.solution + 1, t.solution - 1, Math.ceil(t.money / t.price) === t.solution ? t.solution + 2 : Math.ceil(t.money / t.price)],
      check: (t, v) => Number.isInteger(v) && v === Math.floor(t.money / t.price),
      build(el, t, kit) {
        hintAnd(el, t, "Перетаскивайте булочки в корзину (или нажмите на булочку, потом на корзину)");
        const fig = kit.stage(el, 360, 300, "Полка с булочками и корзина");
        txt(fig, 16, 28, `В кармане ${t.money} ₽`, "sc-t16", "start");
        txt(fig, 344, 28, `булочка ${t.price} ₽`, "sc-t16 sc-tx-red", "end");
        txt(fig, 16, 158, "Корзина", "sc-t14 sc-tx-soft", "start");
        txt(fig, 314, 200, "Итого", "sc-t14 sc-tx-soft");
        const tot = txt(fig, 314, 226, "0 ₽", "sc-t20");
        txt(fig, 314, 250, `из ${t.money}`, "sc-t14 sc-tx-soft");
        let touched = false;
        const d = kit.dnd(fig, [
          { id: "shelf", x: 12, y: 40, w: 336, h: 84, cols: 9, cell: 36, label: "Полка", hideLabel: true },
          { id: "basket", x: 12, y: 166, w: 264, h: 120, cols: 7, cell: 36, label: "Корзина", hideLabel: true },
        ], () => { touched = true; paint(); fire(el); });
        for (let i = 0; i < t.buns; i++) {
          const g = K.svg("g", { "aria-label": `Булочка ${i + 1}` });
          K.svg("circle", { r: 17, class: "sc-hit" }, g);
          K.svg("ellipse", { rx: 15, ry: 11, class: "sc-crust" }, g);
          K.svg("ellipse", { cx: 0, cy: -3, rx: 9, ry: 4, class: "sc-cheese" }, g);
          d.add(`bun${i}`, g, "shelf"); // string ids: dnd treats id 0 as «nothing picked»
        }
        function paint() {
          const sum = d.count("basket") * t.price;
          tot.textContent = `${sum} ₽`;
          tot.classList.toggle("sc-tx-red", sum > t.money);
        }
        const lock = K.lockable(el);
        return {
          value: () => (touched ? d.count("basket") : null),
          lock(on) { lock(on); d.lock(on); },
          reveal() {
            for (let i = 0; i < t.buns; i++) d.place(`bun${i}`, i < t.solution ? "basket" : "shelf");
            paint();
            K.answerLine(el, t.reveal || `${t.price} · ${t.solution} = ${t.price * t.solution} ≤ ${t.money}, а ${t.price} · ${t.solution + 1} = ${t.price * (t.solution + 1)} — уже больше`);
          },
          reset() { for (let i = 0; i < t.buns; i++) d.place(`bun${i}`, "shelf"); touched = false; paint(); lock(false); d.lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },

    /* ------------------------------------------------------------- tile-square (math-8-5)
     * A pile of N tiles and an empty floor: drag the corner to lay a square, the counter says what is left.
     * task: { tiles, max = 10, solution: side }  value: side */
    "tile-square": {
      wrong: (t) => [t.solution - 1, t.solution + 1, Math.round(t.tiles / 4) === t.solution ? t.solution + 2 : Math.round(t.tiles / 4)],
      check: (t, v) => Number.isInteger(v) && v > 0 && v * v === t.tiles,
      build(el, t, kit) {
        const C = 20, X0 = 20, Y0 = 26, max = t.max || 10;
        hintAnd(el, t, "Тяните красный угол — квадрат станет больше или меньше");
        const fig = kit.stage(el, 360, 250, "Пол, на который выкладывают квадрат из плиток");
        for (let i = 0; i <= max; i++) {
          line(fig, X0 + i * C, Y0, X0 + i * C, Y0 + max * C, "sc-grid");
          line(fig, X0, Y0 + i * C, X0 + max * C, Y0 + i * C, "sc-grid");
        }
        const sq = K.svg("g", {}, fig);
        txt(fig, 296, 48, "Плиток", "sc-t14 sc-tx-soft");
        txt(fig, 296, 76, String(t.tiles), "sc-t22 sc-tx-teal");
        const sideL = txt(fig, 296, 124, "", "sc-t16"), inL = txt(fig, 296, 150, "", "sc-t16"), leftL = txt(fig, 296, 190, "", "sc-t14");
        const h = grip(fig, el, knob(fig), "Угол квадрата из плиток", (p) => set(Math.round(Math.max(p.x - X0, p.y - Y0) / C), true), (d) => set((s || 1) + d, true));
        let s = null;
        function draw(n) {
          sq.textContent = "";
          for (let i = 0; i < n; i++) for (let j = 0; j < n; j++)
            K.svg("rect", { x: X0 + i * C + 1.5, y: Y0 + j * C + 1.5, width: C - 3, height: C - 3, rx: 3, class: (i + j) % 2 ? "sc-teal" : "sc-blue" }, sq);
          at(h, X0 + n * C, Y0 + n * C);
          const rest = t.tiles - n * n;
          sideL.textContent = s === null ? "сторона ?" : `сторона ${n}`;
          inL.textContent = s === null ? "" : `${n}² = ${n * n}`;
          leftL.textContent = s === null ? "" : rest >= 0 ? `осталось ${rest}` : `не хватает ${-rest}`;
          leftL.classList.toggle("sc-tx-red", s !== null && rest < 0);
        }
        function set(n, user) { s = K.clamp(n, 1, max); draw(s); if (user) fire(el); }
        draw(1);
        const lock = K.lockable(el);
        return {
          value: () => s,
          lock,
          reveal() { set(t.solution); K.answerLine(el, t.reveal || `√${t.tiles} = ${t.solution}: ${t.solution} · ${t.solution} = ${t.tiles}`); },
          reset() { s = null; draw(1); lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },

    /* ------------------------------------------------------------- tree-shadow (math-8-6)
     * The sun, a stick with its shadow and a tree with its shadow; drag the tree top so that the sun ray over
     * the tree runs parallel to the ray over the stick (similar triangles).
     * task: { stick, stickShadow, treeShadow, max, solution: height }  value: tree height (whole metres) */
    "tree-shadow": {
      wrong: (t) => [t.treeShadow * t.stickShadow / t.stick, t.treeShadow / t.stickShadow, t.solution + 1].filter((w) => w !== t.solution),
      check: (t, v) => isNum(v) && Math.abs(v * t.stickShadow - t.stick * t.treeShadow) < 1e-9,
      build(el, t, kit) {
        const G = 226, s1 = t.stickShadow, S = t.treeShadow, max = t.max;
        const m = Math.min(296 / (s1 + 0.35 * max + S), 186 / max), xs = 30, xt = 30 + s1 * m + 24 + 0.35 * max * m;
        hintAnd(el, t, "Тяните верхушку дерева: солнечный луч над деревом должен идти так же, как над палкой");
        const fig = kit.stage(el, 360, 256, "Палка и дерево со своими тенями");
        K.svg("circle", { cx: 336, cy: 26, r: 14, class: "sc-gold" }, fig);
        K.svg("rect", { x: xs, y: G - 3, width: s1 * m, height: 6, rx: 3, class: "sc-soft" }, fig);
        K.svg("rect", { x: xt, y: G - 3, width: S * m, height: 6, rx: 3, class: "sc-soft" }, fig);
        line(fig, 12, G, 348, G, "sc-stroke");
        line(fig, xs, G, xs, G - t.stick * m, "sc-ln sc-ln-red sc-thick");
        line(fig, xs, G - t.stick * m, xs + s1 * m, G, "sc-ln sc-ln-gold sc-dash");
        txt(fig, xs + s1 * m / 2, G + 22, `${K.num(s1)} м`, "sc-t14");
        txt(fig, xt + S * m / 2, G + 22, `${K.num(S)} м`, "sc-t14");
        txt(fig, xs - 6, G - t.stick * m - 8, `${K.num(t.stick)} м`, "sc-t14 sc-tx-red", "start");
        const tg = K.svg("g", {}, fig);
        const ray = line(fig, 0, 0, 0, 0, "sc-ln sc-ln-gold sc-dash");
        const hL = txt(fig, 0, 0, "", "sc-t16");
        const h = grip(fig, el, knob(fig), "Верхушка дерева", (p) => set(Math.round((G - p.y) / m), true), (d) => set((H || 1) + d, true));
        let H = null;
        function draw(n) {
          tg.textContent = "";
          tree(tg, xt, G, n * m);
          ray.setAttribute("x1", xt); ray.setAttribute("y1", G - n * m); ray.setAttribute("x2", xt + S * m); ray.setAttribute("y2", G);
          at(h, xt, G - n * m);
          hL.setAttribute("x", xt + 24); hL.setAttribute("y", G - n * m - 4);
          hL.setAttribute("text-anchor", "start");
          hL.textContent = H === null ? "? м" : `${K.num(n)} м`;
        }
        function set(n, user) { H = K.clamp(n, 1, max); draw(H); if (user) fire(el); }
        draw(Math.max(1, Math.round(max * 0.4)));
        const lock = K.lockable(el);
        return {
          value: () => H,
          lock,
          reveal() { set(t.solution); K.answerLine(el, t.reveal || `Тень длиннее в ${K.num(S / s1)} раза, значит, дерево: ${K.num(t.stick)} · ${K.num(S / s1)} = ${t.solution} м`); },
          reset() { H = null; draw(Math.max(1, Math.round(max * 0.4))); lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },

    /* ------------------------------------------------------------- plot-cut (math-8-7)
     * Two plots: a rectangle and a slanted parallelogram. Move the triangle cut off along the height to the
     * other side — the parallelogram becomes a rectangle a × h; then say which plot is bigger.
     * task: { rect: { w, h }, para: { a, h, d, side }, solution: { moved: true, pick: "rect" | "=" | "para" } } */
    "plot-cut": {
      wrong: (t) => [...["rect", "=", "para"].filter((p) => p !== t.solution.pick).map((pick) => ({ moved: true, pick })), { moved: false, pick: t.solution.pick }],
      check: (t, v) => Boolean(v) && v.moved === true && v.pick === t.solution.pick,
      build(el, t, kit) {
        const R = t.rect, P = t.para;
        const m = Math.min(318 / (R.w + 1.4 + P.a + P.d), 124 / Math.max(R.h, P.h)), x0 = 24, x1 = x0 + (R.w + 1.4) * m, G = 50 + Math.max(R.h, P.h) * m;
        hintAnd(el, t, "Перетащите (или нажмите) отрезанный треугольник на другую сторону, затем сравните участки");
        const fig = kit.stage(el, 360, G + 34, "Два участка: прямоугольный и косой");
        K.svg("rect", { x: x0, y: G - R.h * m, width: R.w * m, height: R.h * m, class: "sc-teal" }, fig);
        txt(fig, x0 + R.w * m / 2, G + 22, `${K.num(R.w)} м`, "sc-t14");
        txt(fig, 0, 0, `${K.num(R.h)} м`, "sc-t14").setAttribute("transform", `translate(${x0 - 6} ${G - R.h * m / 2}) rotate(-90)`);
        const hx = x1 + P.d * m, top = G - P.h * m;
        K.svg("path", { d: `M${hx} ${G} L${x1 + (P.a + P.d) * m} ${G} L${x1 + (P.a + P.d) * m} ${top} Z`, class: "sc-ln sc-ln-ink sc-dash sc-thin" }, fig);
        K.svg("path", { d: `M${hx} ${G} L${x1 + P.a * m} ${G} L${x1 + (P.a + P.d) * m} ${top} L${hx} ${top} Z`, class: "sc-gold" }, fig);
        const tri = K.svg("path", { d: `M${x1} ${G} L${hx} ${G} L${hx} ${top} Z`, class: "sc-crust sc-tap sc-tri", role: "button", "aria-label": "Отрезанный треугольник" }, fig);
        line(fig, hx, G, hx, top, "sc-ln sc-ln-ink sc-dash");
        txt(fig, hx + 6, G - P.h * m / 2 + 5, `${K.num(P.h)} м`, "sc-t14", "start");
        txt(fig, x1 + P.a * m / 2, G + 22, `${K.num(P.a)} м`, "sc-t14");
        txt(fig, x1 + P.d * m / 2 - 6, G - P.h * m / 2, `${K.num(P.side)} м`, "sc-t14", "end");
        txt(fig, x0 + R.w * m / 2, 30, "Участок 1", "sc-t14 sc-tx-soft");
        txt(fig, x1 + (P.a + P.d) * m / 2, 30, "Участок 2", "sc-t14 sc-tx-soft");
        const off = P.a * m;
        let moved = false, pick = null, drag = null, dragged = false;
        const place = (dx) => tri.setAttribute("transform", `translate(${dx} 0)`);
        const flip = (to) => { moved = to; place(moved ? off : 0); K.pop(tri); fire(el); };
        K.toggleable(tri, () => { if (dragged) { dragged = false; return; } if (!el.classList.contains("is-locked")) flip(!moved); });
        tri.addEventListener("pointerdown", (e) => {
          if (el.classList.contains("is-locked")) return;
          tri.setPointerCapture?.(e.pointerId);
          drag = { x: K.pointer(fig, e).x, base: moved ? off : 0 };
          dragged = false;
        });
        tri.addEventListener("pointermove", (e) => {
          if (!drag) return;
          const dx = K.pointer(fig, e).x - drag.x;
          if (Math.abs(dx) > 6) dragged = true;
          if (dragged) place(K.clamp(drag.base + dx, 0, off));
        });
        const end = (e) => { if (!drag) return; const dx = drag.base + K.pointer(fig, e).x - drag.x; drag = null; if (dragged) flip(dx > off / 2); };
        tri.addEventListener("pointerup", end);
        tri.addEventListener("pointercancel", end);
        const ch = choice(el, [["rect", "Первый больше"], ["=", "Равны"], ["para", "Второй больше"]], "Какой участок больше", (id) => { pick = id; fire(el); });
        const lock = K.lockable(el);
        return {
          value: () => (moved || pick ? { moved, pick } : null),
          lock,
          reveal() {
            moved = true; place(off); pick = t.solution.pick; ch.set(pick);
            K.answerLine(el, t.reveal || `Участок 1: ${R.w} · ${R.h} = ${R.w * R.h} м², участок 2: ${P.a} · ${P.h} = ${P.a * P.h} м²`);
          },
          reset() { moved = false; pick = null; place(0); ch.set(null); lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },

    /* ------------------------------------------------------------- frame-skew (math-8-8)
     * The carpenter's frame a × b on hinges with two strings for diagonals: tilt the side until the
     * diagonals are equal — then the corners are right angles.
     * task: { a, b, solution: 90 }  value: the angle at the bottom-left corner (steps of 5°) */
    "frame-skew": {
      wrong: () => [85, 95, 75],
      check: (t, v) => v === 90,
      build(el, t, kit) {
        const { a, b } = t, s = Math.min(296 / (a + 2 * b * Math.SQRT1_2), 160 / b), G = 226, X = 180 - (a * s) / 2;
        hintAnd(el, t, "Наклоняйте раму за красный угол, пока верёвки-диагонали не станут равны");
        const fig = kit.stage(el, 360, 256, "Рама с двумя диагоналями");
        const d1L = txt(fig, 90, 30, "", "sc-t16 sc-tx-teal"), d2L = txt(fig, 270, 30, "", "sc-t16 sc-tx-red");
        const d1 = line(fig, 0, 0, 0, 0, "sc-ln sc-ln-teal"), d2 = line(fig, 0, 0, 0, 0, "sc-ln sc-ln-red");
        const frame = K.svg("path", { class: "sc-wood" }, fig);
        const mark = K.svg("path", { class: "sc-ln sc-ln-ink sc-thin" }, fig);
        txt(fig, 180, G + 24, `${a} см`, "sc-t14");
        const sideL = txt(fig, 0, 0, `${b} см`, "sc-t14", "end");
        const h = grip(fig, el, knob(fig), "Угол рамы", (p) => set(Math.round(Math.atan2(G - p.y, p.x - X) * 36 / Math.PI) * 5, true), (d) => set((ang || 70) - 5 * d, true));
        let ang = null;
        const row = K.controls(el);
        const st = stepBy(row, "Угол", 45, 135, 5, "°", (v) => set(v, true));
        function draw(deg) {
          const c = Math.cos(rad(deg)), sn = Math.sin(rad(deg));
          const T = [X + b * s * c, G - b * s * sn], TR = [T[0] + a * s, T[1]], BR = [X + a * s, G];
          frame.setAttribute("d", `M${X} ${G} L${BR[0]} ${G} L${TR[0]} ${TR[1]} L${T[0]} ${T[1]} Z`);
          [[d1, [X, G], TR], [d2, BR, T]].forEach(([l, p, q]) => { l.setAttribute("x1", p[0]); l.setAttribute("y1", p[1]); l.setAttribute("x2", q[0]); l.setAttribute("y2", q[1]); });
          mark.setAttribute("d", deg === 90 ? `M${X + 14} ${G - 6} L${X + 14} ${G - 20} L${X} ${G - 20}` : "");
          d1L.textContent = `d₁ = ${r1(Math.sqrt(a * a + b * b + 2 * a * b * c))} см`;
          d2L.textContent = `d₂ = ${r1(Math.sqrt(a * a + b * b - 2 * a * b * c))} см`;
          sideL.setAttribute("x", (X + T[0]) / 2 - 10);
          sideL.setAttribute("y", (G + T[1]) / 2);
          at(h, T[0], T[1]);
        }
        function set(deg, user) { ang = K.clamp(deg, 45, 135); st.set(ang); draw(ang); if (user) fire(el); }
        draw(70);
        const lock = K.lockable(el);
        return {
          value: () => ang,
          lock,
          reveal() { set(90); K.answerLine(el, t.reveal || `Диагонали равны (${r1(Math.hypot(a, b))} см) только при прямом угле: 90°`); },
          reset() { ang = null; st.set(null); draw(70); lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },

    /* ------------------------------------------------------------- tree-tangent (math-8-9)
     * A tree, an observer `dist` metres away and the sight line from the ground: turn it to the tree top,
     * read α and tg α, and work out the height h = dist · tg α.
     * task: { dist, height, solution: height }  value: the typed height */
    "tree-tangent": {
      wrong: (t) => [t.dist, t.solution + 3, Math.round(Math.hypot(t.dist, t.height))].filter((w) => Math.abs(w - t.solution) >= 0.5),
      check: (t, v) => isNum(v) && Math.abs(v - t.solution) < 0.5,
      build(el, t, kit) {
        const L = t.dist, Hm = t.height, G = 222;
        const m = Math.min(262 / (L + 0.34 * Hm), 168 / Hm), xt = 24 + 0.34 * Hm * m, V = xt + L * m;
        hintAnd(el, t, "Поверните линию взгляда к верхушке дерева, затем впишите высоту");
        const fig = kit.stage(el, 360, 252, "Дерево и наблюдатель с угломером");
        tree(fig, xt, G, Hm * m);
        line(fig, 12, G, 348, G, "sc-stroke");
        line(fig, xt, G + 14, V, G + 14, "sc-ln sc-ln-ink sc-thin");
        txt(fig, (xt + V) / 2, G + 30 > 248 ? 248 : G + 28, `${L} м`, "sc-t14 sc-tx-teal");
        txt(fig, xt - 10, G - Hm * m * 0.12, "h", "sc-t16 sc-tx-red", "end");
        const kid = kit.art.kid(fig, "red", 0.6);
        kid.setAttribute("transform", `translate(${V + 14} ${G - 13}) scale(0.6)`);
        const sight = line(fig, 0, 0, 0, 0, "sc-ln sc-ln-ink sc-dash");
        const arc = K.svg("path", { class: "sc-gold" }, fig);
        const aL = txt(fig, 344, 30, "", "sc-t16", "end"), tL = txt(fig, 344, 54, "", "sc-t16 sc-tx-teal", "end");
        const h = grip(fig, el, knob(fig), "Линия взгляда", (p) => set(Math.round((Math.atan2(G - p.y, V - p.x) * 180) / Math.PI), true), (d) => set(al + d, true));
        let al = 20, hgt = null;
        function draw() {
          const tn = Math.tan(rad(al)), k = Math.min(1, (G - 16) / (L * m * tn));
          const ex = V - L * m * k, ey = G - L * m * tn * k;
          sight.setAttribute("x1", V); sight.setAttribute("y1", G); sight.setAttribute("x2", ex); sight.setAttribute("y2", ey);
          const r = 30;
          arc.setAttribute("d", `M${V} ${G} L${V - r} ${G} A${r} ${r} 0 0 1 ${V - r * Math.cos(rad(al))} ${G - r * Math.sin(rad(al))} Z`);
          aL.textContent = `α = ${al}°`;
          tL.textContent = `tg α ≈ ${K.num(tn.toFixed(2))}`;
          const hk = 0.62 * k;
          at(h, V - L * m * hk, G - L * m * tn * hk);
        }
        function set(d, user) { al = K.clamp(d, 5, 70); draw(); if (user) fire(el); }
        draw();
        const row = K.controls(el);
        const field = K.numberField(row, "Высота", { min: 0, max: 999, unit: "м" }, (v) => { hgt = v; fire(el); });
        const lock = K.lockable(el);
        const aim = Math.round((Math.atan(Hm / L) * 180) / Math.PI);
        return {
          value: () => hgt,
          lock,
          reveal() {
            set(aim); hgt = t.solution; field.set(hgt);
            K.answerLine(el, t.reveal || `α = ${aim}°, tg α ≈ ${K.num(Math.tan(rad(aim)).toFixed(2))}; h = ${L} · tg α ≈ ${t.solution} м`);
          },
          reset() { set(20); hgt = null; field.set(null); lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },

    /* ------------------------------------------------------------- pitch-angle (math-8-10)
     * The round pitch with the goal seen from the centre at `central`°. A player stands on the edge (drag him
     * anywhere); open his view angle until both rays hit the goal posts — it is half the central angle.
     * task: { central, solution }  value: the player's angle (steps of 5°) */
    "pitch-angle": {
      wrong: (t) => [t.central, 180 - t.central / 2, t.central / 2 + 10],
      check: (t, v) => isNum(v) && v * 2 === t.central,
      build(el, t, kit) {
        const c = t.central, CX = 140, CY = 128, R = 108;
        const pt = (deg) => [CX + R * Math.sin(rad(deg)), CY + R * Math.cos(rad(deg))];
        hintAnd(el, t, "Двигайте игрока по краю и раскройте его угол так, чтобы лучи попали в обе штанги");
        const fig = kit.stage(el, 360, 256, "Круглая площадка, ворота и игрок на краю");
        K.svg("circle", { cx: CX, cy: CY, r: R, class: "sc-teal" }, fig);
        const A = pt(-c / 2), B = pt(c / 2);
        line(fig, CX, CY, A[0], A[1], "sc-ln sc-ln-gold"); line(fig, CX, CY, B[0], B[1], "sc-ln sc-ln-gold");
        const ar = 22, a1 = [CX + ar * Math.sin(rad(-c / 2)), CY + ar * Math.cos(rad(-c / 2))], a2 = [CX + ar * Math.sin(rad(c / 2)), CY + ar * Math.cos(rad(c / 2))];
        K.svg("path", { d: `M${CX} ${CY} L${a1[0]} ${a1[1]} A${ar} ${ar} 0 0 0 ${a2[0]} ${a2[1]} Z`, class: "sc-gold" }, fig);
        txt(fig, CX, c > 110 ? CY - 10 : CY + 0.5 * R * Math.cos(rad(c / 2)) + 14, `${c}°`, "sc-t16 sc-tx-gold");
        line(fig, A[0], A[1], B[0], B[1], "sc-goal");
        [A, B].forEach((p) => K.svg("circle", { cx: p[0], cy: p[1], r: 5, class: "sc-cream" }, fig));
        const view = K.svg("g", {}, fig);
        txt(fig, 305, 44, "угол игрока", "sc-t14 sc-tx-soft");
        const out = txt(fig, 305, 74, "?", "sc-t22 sc-tx-red");
        let phi = 180, psi = null;
        const h = grip(fig, el, knob(fig, "sc-red"), "Игрок на краю площадки", (p) => move((Math.atan2(p.x - CX, p.y - CY) * 180) / Math.PI), (d) => move(phi + 5 * d));
        function move(deg) {
          const lo = c / 2 + 14, hi = 360 - c / 2 - 14;
          phi = K.clamp(((deg % 360) + 360) % 360, lo, hi);
          draw();
        }
        function draw() {
          const P = pt(phi), psiD = psi === null ? 20 : psi;
          view.textContent = "";
          const dA = Math.atan2(A[1] - P[1], A[0] - P[0]), dB = Math.atan2(B[1] - P[1], B[0] - P[0]);
          const sgn = Math.sin(dB - dA) >= 0 ? 1 : -1, d2 = dA + sgn * rad(psiD), len = Math.hypot(B[0] - P[0], B[1] - P[1]);
          line(view, P[0], P[1], A[0], A[1], "sc-ln sc-ln-red");
          line(view, P[0], P[1], P[0] + len * Math.cos(d2), P[1] + len * Math.sin(d2), "sc-ln sc-ln-red");
          const r = 24;
          K.svg("path", { d: `M${P[0]} ${P[1]} L${P[0] + r * Math.cos(dA)} ${P[1] + r * Math.sin(dA)} A${r} ${r} 0 0 ${sgn > 0 ? 1 : 0} ${P[0] + r * Math.cos(d2)} ${P[1] + r * Math.sin(d2)} Z`, class: "sc-red" }, view);
          at(h, P[0], P[1]);
          out.textContent = psi === null ? "?" : `${psi}°`;
        }
        const row = K.controls(el);
        const st = stepBy(row, "Угол", 10, 170, 5, "°", (v) => { psi = v; draw(); fire(el); });
        draw();
        const lock = K.lockable(el);
        return {
          value: () => psi,
          lock,
          reveal() { psi = c / 2; st.set(psi); draw(); K.answerLine(el, t.reveal || `Вписанный угол — половина центрального: ${c}° : 2 = ${c / 2}°`); },
          reset() { psi = null; phi = 180; st.set(null); draw(); lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },
  });

  function hintAnd(el, t, text) { IntScenes.kit.hint(el, t.hint || text); }
})();
