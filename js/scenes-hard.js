/**
 * Scenes of the harder grade 7–8 lessons (see js/scenes.js for the contract).
 */
/* ---- math7h.js ---- */
/* Scenes for the harder grade 7 lessons: difference of squares (corner-cut) and equations with modulus (forecast-flags). */
(function () {
  const IntScenes = typeof window !== "undefined" ? window.IntScenes : require("./scenes.js");
  const kit0 = IntScenes.kit;
  const fire = (el) => el.dispatchEvent(new Event("change", { bubbles: true }));
  // a single on/off button in the site's toggle style
  const toggleBtn = (row, text) => {
    const box = document.createElement("div");
    box.className = "task-toggle";
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.setAttribute("aria-pressed", "false");
    box.appendChild(b);
    row.appendChild(box);
    return b;
  };

  IntScenes.add({
    /* ----------------------------------------------------------- corner-cut
     * The video's picture: a square a × a, cut a b × b corner out, swing the bottom strip to the right side,
     * get a rectangle (a + b) × (a − b). task: { a, b, solution: { b, moved: true, n: a² − b² } } */
    "corner-cut": {
      wrong: (t) => [
        { b: t.b + 1, moved: true, n: t.a * t.a - (t.b + 1) * (t.b + 1) },
        { b: t.b, moved: true, n: t.a * t.a - t.b },
        { b: t.b, moved: false, n: t.a * t.a - t.b * t.b },
        { b: t.b, moved: true, n: t.a * t.a + t.b * t.b },
      ],
      check(t, v) {
        return Boolean(v) && v.moved === true && v.b === t.b && v.n === t.a * t.a - t.b * t.b;
      },
      build(el, t, kit) {
        const { svg, label, stage, hint, celebrate, controls, stepper, numberField, lockable, answerLine, pop } = kit;
        const a = t.a, W = 360, X0 = 64, Y0 = 46;
        const c = Math.min(22, Math.floor(200 / a)), H = Y0 + a * c + 30;
        hint(el, t.hint || "Выберите размер уголка, переложите полоску и посчитайте клетки");
        const fig = stage(el, W, H, `Квадрат ${a} на ${a} клеток, из угла вырезают квадратик`);
        const cells = svg("g", {}, fig);
        const marks = svg("g", {}, fig);
        let b = null, moved = false, n = null;

        const row = controls(el);
        const knife = stepper(row, "Уголок", 1, a - 1, (v) => { b = v; moved = false; draw(true); fire(el); });
        const moveBtn = toggleBtn(row, "Переложить полоску");
        moveBtn.addEventListener("click", () => {
          if (b === null) return;
          moved = !moved;
          draw(true);
          fire(el);
        });
        const field = numberField(controls(el), "Клеток", { min: 0, max: 10000, buttons: false }, (v) => { n = v; fire(el); });

        const cell = (x, y, cls) => svg("rect", { x: X0 + x * c, y: Y0 + y * c, width: c, height: c, class: `sc-m7h-cell ${cls}` }, cells);
        function draw(animate) {
          cells.textContent = "";
          marks.textContent = "";
          const bb = b || 0;
          // top part a × (a − b): stays in place
          for (let y = 0; y < a - bb; y++) for (let x = 0; x < a; x++) cell(x, y, "sc-teal");
          if (bb) {
            // the corner b × b is cut out: a dashed hole until the strip moves
            if (!moved) svg("rect", { x: X0 + (a - bb) * c + 2, y: Y0 + (a - bb) * c + 2, width: bb * c - 4, height: bb * c - 4, rx: 4, class: "sc-m7-dash" }, marks);
            const strip = svg("g", {}, cells);
            for (let y = 0; y < bb; y++) for (let x = 0; x < a - bb; x++) {
              // moved: the strip (a − b) × b turns into b × (a − b) on the right side
              const [cx, cy] = moved ? [a + y, x] : [x, a - bb + y];
              strip.appendChild(cell(cx, cy, "sc-gold"));
            }
            if (animate) pop(strip);
          }
          const side = moved ? a - bb : a, wide = moved ? a + bb : a;
          label(marks, X0 + (wide * c) / 2, Y0 - 12, moved ? `${a} + ${bb} = ${wide}` : String(a), "sc-m7h-t");
          label(marks, X0 - 10, Y0 + (side * c) / 2 + 6, moved ? String(side) : String(a), "sc-m7h-t", "end");
          if (moved) label(marks, X0 - 10, Y0 + (side * c) / 2 + 26, `${a} − ${bb}`, "sc-m7h-s", "end");
          if (bb && !moved) label(marks, X0 + (a - bb / 2) * c, Y0 + a * c + 20, `${bb}`, "sc-m7h-t sc-tx-red");
          moveBtn.disabled = b === null || el.classList.contains("is-locked");
          moveBtn.setAttribute("aria-pressed", String(moved));
          moveBtn.classList.toggle("is-on", moved);
          moveBtn.textContent = moved ? "Вернуть полоску" : "Переложить полоску";
        }
        draw(false);
        const lock = lockable(el);
        return {
          value: () => (b === null && n === null ? null : { b, moved, n }),
          lock(on) { lock(on); if (!on) moveBtn.disabled = b === null; },
          reveal() {
            b = t.b; moved = true; n = a * a - t.b * t.b;
            knife.set(b); field.set(n); draw(true);
            answerLine(el, t.reveal || `Уголок ${t.b} × ${t.b}: ${a}² − ${t.b}² = ${a * a} − ${t.b * t.b} = ${n} = ${a + t.b} · ${a - t.b}`);
          },
          reset() { b = null; moved = false; n = null; knife.set(null); field.set(null); lock(false); draw(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* -------------------------------------------------------- forecast-flags
     * A thermometer scale; plant a flag at every temperature that fits |x − c| = d (or say there is none).
     * task: { c, d, min, max, eq, solution: [roots…] } (solution [] when d < 0) */
    "forecast-flags": {
      wrong: (t) => {
        const out = t.solution.length ? [[t.solution[t.solution.length - 1]], [], [t.c - t.d, t.c, t.c + t.d]] : [[t.c + t.d, t.c - t.d], [t.c - t.d]];
        if (t.solution.length) out.push([-t.d, t.d].filter((x) => !t.solution.includes(x)).length ? [-t.d, t.d] : [t.c]);
        return out.filter((w) => !kit0.sameSet(w, t.solution));
      },
      check(t, v) {
        return Array.isArray(v) && kit0.sameSet(v, t.solution);
      },
      build(el, t, kit) {
        const { svg, label, stage, hint, celebrate, controls, toggleable, lockable, answerLine, pop, num } = kit;
        const W = 360, H = 196, L = 36, R = 340, Y = 142;
        const n = t.max - t.min, STEP = (R - L) / n;
        const at = (v) => L + (v - t.min) * STEP;
        hint(el, t.hint || "Нажимайте на деления, чтобы поставить или убрать флажок");
        const fig = stage(el, W, H, `Шкала термометра от ${t.min} до ${t.max} градусов`);
        fig.setAttribute("role", "group");
        label(fig, W / 2, 34, t.eq, "sc-m7h-eq");
        // the thermometer: a tube along the scale with a bulb on the left
        svg("rect", { x: 14, y: Y - 9, width: R - 4, height: 18, rx: 9, class: "sc-cream" }, fig);
        svg("circle", { cx: 18, cy: Y, r: 15, class: "sc-red" }, fig);
        svg("rect", { x: 18, y: Y - 4, width: Math.max(0, at(t.c) - 18), height: 8, rx: 4, class: "sc-red" }, fig);
        const arcs = svg("g", {}, fig);
        const flags = new Set();
        let none = false;
        const ticks = [];
        for (let v = t.min; v <= t.max; v++) {
          const x = at(v);
          const g = svg("g", { class: "sc-tap sc-m7h-col", role: "checkbox", "aria-checked": "false", "aria-label": `${num(v)} градусов` }, fig);
          svg("rect", { x: x - STEP / 2, y: 52, width: STEP, height: H - 52, class: "sc-hit" }, g);
          svg("line", { x1: x, y1: Y + 12, x2: x, y2: Y + (v % 5 === 0 ? 24 : 19), class: "sc-thin" }, g);
          label(g, x, Y + 42, num(v), v === t.c ? "sc-m7h-s sc-tx-gold sc-m7h-c" : "sc-m7h-s");
          const flag = svg("g", { class: "sc-m7h-flag", visibility: "hidden" }, g);
          svg("rect", { x: x - 2, y: Y - 64, width: 4, height: 56, rx: 2, class: "sc-ink" }, flag);
          svg("path", { d: `M${x + 2} ${Y - 64} l28 10 l-28 10 Z`, class: v < t.c ? "sc-red" : "sc-teal" }, flag);
          toggleable(g, () => {
            if (flags.has(v)) flags.delete(v); else flags.add(v);
            none = false;
            paint();
            if (flags.has(v)) pop(flag);
            fire(el);
          });
          ticks.push({ v, g, flag });
        }
        // the given temperature c: a gold dot on the tube
        svg("circle", { cx: at(t.c), cy: Y, r: 8, class: "sc-gold", "pointer-events": "none" }, fig);
        const row = controls(el);
        const noneBtn = toggleBtn(row, "Таких температур нет");
        noneBtn.addEventListener("click", () => { none = !none; if (none) flags.clear(); paint(); fire(el); });

        function paint() {
          arcs.textContent = "";
          ticks.forEach(({ v, g, flag }) => {
            const on = flags.has(v);
            flag.setAttribute("visibility", on ? "visible" : "hidden");
            g.setAttribute("aria-checked", String(on));
            if (on && v !== t.c) {
              // a hop from c to the flag, signed with the distance
              const x1 = at(t.c), x2 = at(v), h = Math.min(44, 14 + Math.abs(x2 - x1) * 0.25);
              svg("path", { d: `M${x1} ${Y - 12} Q${(x1 + x2) / 2} ${Y - 12 - h * 2} ${x2} ${Y - 12}`, class: `sc-m7h-hop ${v < t.c ? "sc-m7h-hop-red" : ""}` }, arcs);
              label(arcs, (x1 + x2) / 2, Y - 18 - h, String(Math.abs(v - t.c)), `sc-m7h-s ${v < t.c ? "sc-tx-red" : "sc-tx-teal"}`);
            }
          });
          noneBtn.classList.toggle("is-on", none);
          noneBtn.setAttribute("aria-pressed", String(none));
        }
        paint();
        const lock = lockable(el);
        return {
          value: () => (none ? [] : flags.size ? [...flags].sort((p, q) => p - q) : null),
          lock,
          reveal() {
            flags.clear();
            t.solution.forEach((v) => flags.add(v));
            none = t.solution.length === 0;
            paint();
            answerLine(el, t.reveal || (none ? "Корней нет: расстояние не бывает отрицательным" : `Ответ: ${t.solution.map(num).join(" и ")}`));
          },
          reset() { flags.clear(); none = false; lock(false); paint(); },
          celebrate: () => celebrate(fig),
        };
      },
    },
  });
})();

/* ---- math8h.js ---- */
/* Scenes for the harder grade 8 math lessons: fractional equations (odz-sieve) and river problems (river-boat). */
(function () {
  const IntScenes = typeof window !== "undefined" ? window.IntScenes : require("./scenes.js");
  const K = IntScenes.kit;
  const fire = (el) => el.dispatchEvent(new Event("change", { bubbles: true }));
  const txt = (p, x, y, s, cls = "sc-t16", a) => K.label(p, x, y, s, cls, a);
  const at = (node, x, y) => node.setAttribute("transform", `translate(${x} ${y})`);
  const nums = (a) => Array.isArray(a) && a.every((n) => typeof n === "number" && Number.isFinite(n));
  const hintAnd = (el, t, text) => K.hint(el, t.hint || text);

  // a small flat motor boat facing right (dir = -1: left), waterline at 0
  function boat(parent, dir = 1) {
    const g = K.svg("g", {}, parent);
    const b = K.svg("g", { transform: `scale(${dir} 1)` }, g);
    K.svg("path", { d: "M-24 -2 H18 L28 -2 L19 8 H-20 Z", class: "sc-red" }, b);
    K.svg("rect", { x: -14, y: -14, width: 22, height: 12, rx: 3, class: "sc-cream" }, b);
    K.svg("rect", { x: -10, y: -11, width: 6, height: 5, rx: 1.5, class: "sc-teal" }, b);
    K.svg("rect", { x: -1, y: -11, width: 6, height: 5, rx: 1.5, class: "sc-teal" }, b);
    return g;
  }
  const arrow = (p, x1, x2, y, cls = "sc-m8h-arrow") => {
    K.svg("line", { x1, y1: y, x2: x2 - Math.sign(x2 - x1) * 6, y2: y, class: cls }, p);
    const s = Math.sign(x2 - x1);
    K.svg("path", { d: `M${x2} ${y} l${-9 * s} -5 v10 Z`, class: "sc-m8h-head" }, p);
  };

  IntScenes.add({
    /* ------------------------------------------------------------- odz-sieve (math-8-13)
     * The pupil's notebook: an equation and the numbers he got. Tap the forbidden x on the number line
     * (where a denominator is 0), then drag every candidate into «корень» or «посторонний».
     * task: { eq, candidates, min = -4, max = 4, solution: { bad, keep, drop } }  value: the same shape */
    "odz-sieve": {
      wrong: (t) => {
        const { bad, keep, drop } = t.solution;
        return [
          { bad: [], keep: [...t.candidates].sort((a, b) => a - b), drop: [] },
          { bad, keep: [...t.candidates].sort((a, b) => a - b), drop: [] },
          { bad, keep: drop, drop: keep },
          { bad: bad.slice(0, -1), keep, drop },
        ].filter((w) => !(K.sameSet(w.bad, bad) && K.sameSet(w.keep, keep) && K.sameSet(w.drop, drop)));
      },
      check(t, v) {
        if (!v || !nums(v.bad) || !nums(v.keep) || !nums(v.drop)) return false;
        const s = t.solution;
        return K.sameSet(v.bad, s.bad) && K.sameSet(v.keep, s.keep) && K.sameSet(v.drop, s.drop);
      },
      build(el, t, kit) {
        hintAnd(el, t, "Нажмите на запрещённые x на оси, затем перетащите каждый ответ ученика в нужную корзину");
        const W = 360, H = 316, min = t.min ?? -4, max = t.max ?? 4;
        const fig = kit.stage(el, W, H, "Уравнение, числовая ось и ответы ученика");
        txt(fig, 180, 32, t.eq, "sc-m8h-eq");
        txt(fig, 16, 64, "запрещённые x:", "sc-t14 sc-tx-soft", "start");
        const X0 = 30, X1 = 330, Y = 104, step = (X1 - X0) / (max - min);
        const xOf = (n) => X0 + (n - min) * step;
        K.svg("line", { x1: 14, y1: Y, x2: 344, y2: Y, class: "sc-m8h-axis" }, fig);
        K.svg("path", { d: `M348 ${Y} l-10 -6 v12 Z`, class: "sc-m8h-head" }, fig);
        const bad = new Set();
        let touched = false;
        const ticks = [];
        for (let n = min; n <= max; n++) {
          const g = K.svg("g", { class: "sc-tap", role: "checkbox", "aria-checked": "false", "aria-label": `x = ${K.num(n)}` }, fig);
          at(g, xOf(n), Y);
          K.svg("circle", { r: 17, class: "sc-hit" }, g);
          K.svg("line", { x1: 0, y1: -7, x2: 0, y2: 7, class: "sc-m8h-tick" }, g);
          const ring = K.svg("circle", { r: 9, class: "sc-m8h-hole" }, g);
          const cross = K.svg("path", { d: "M-7 -7 L7 7 M7 -7 L-7 7", class: "sc-m8h-x" }, g);
          txt(g, 0, 30, K.num(n), "sc-t14");
          K.toggleable(g, () => {
            if (el.classList.contains("is-locked")) return;
            bad.has(n) ? bad.delete(n) : bad.add(n);
            touched = true; paint(); K.pop(g); fire(el);
          });
          ticks.push({ n, g, ring, cross });
        }
        txt(fig, 16, 180, "ответы:", "sc-t14 sc-tx-soft", "start");
        const row = (z) => (i) => [z.x + z.w / 2 + (i - (d.count(z.id) - 1) / 2) * 82, z.y + z.h / 2 + 4];
        const zones = [
          { id: "pool", x: 94, y: 148, w: 254, h: 56, label: "Ответы ученика", hideLabel: true },
          { id: "keep", x: 12, y: 222, w: 164, h: 84, label: "корень", hideLabel: true, cls: "sc-m8h-keep" },
          { id: "drop", x: 184, y: 222, w: 164, h: 84, label: "посторонний", hideLabel: true, cls: "sc-m8h-drop" },
        ];
        zones.forEach((z) => (z.layout = (i) => row(z)(i)));
        const d = kit.dnd(fig, zones, () => { touched = true; fire(el); });
        txt(fig, 94, 244, "корень", "sc-t16 sc-tx-teal sc-m8h-nohit");
        txt(fig, 266, 244, "посторонний", "sc-t16 sc-tx-red sc-m8h-nohit");
        t.candidates.forEach((c, i) => {
          const g = K.svg("g", { "aria-label": `Ответ x = ${K.num(c)}` });
          kit.art.card(g, `x = ${K.num(c)}`, 76, 34);
          d.add(`c${i}`, g, "pool");
        });
        function paint() {
          ticks.forEach((k) => {
            const on = bad.has(k.n);
            k.ring.classList.toggle("is-on", on);
            k.cross.style.display = on ? "" : "none";
            k.g.setAttribute("aria-checked", String(on));
          });
        }
        paint();
        const list = (z) => d.itemsIn(z).map((id) => t.candidates[Number(id.slice(1))]).sort((a, b) => a - b);
        const lock = K.lockable(el);
        return {
          value: () => (touched ? { bad: [...bad].sort((a, b) => a - b), keep: list("keep"), drop: list("drop") } : null),
          lock(on) { lock(on); d.lock(on); },
          reveal() {
            bad.clear(); t.solution.bad.forEach((n) => bad.add(n)); paint();
            t.candidates.forEach((c, i) => d.place(`c${i}`, t.solution.keep.includes(c) ? "keep" : "drop"));
            K.answerLine(el, t.reveal || `Запрещены x = ${t.solution.bad.map(K.num).join(" и ")}; ` +
              (t.solution.keep.length ? `корень: ${t.solution.keep.map(K.num).join(", ")}` : "корней нет"));
          },
          reset() { bad.clear(); paint(); t.candidates.forEach((_, i) => d.place(`c${i}`, "pool")); touched = false; lock(false); d.lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },

    /* ------------------------------------------------------------- river-boat (math-8-14)
     * A river with the current: the boat goes S km downstream and back in T hours. Drag the right speed card
     * onto each leg, then pick the boat's own speed x: the times of both legs are shown live.
     * task: { dist, current, total, maxX = 20, solution: { down: "x+u", up: "x-u", x } }  value: the same shape */
    "river-boat": {
      wrong: (t) => {
        const x = t.solution.x;
        return [
          { down: "x-u", up: "x+u", x },
          { down: "x+u", up: "x+u", x },
          { down: "x+u", up: "x-u", x: x + 1 },
          { down: "x", up: "x", x: Math.round((2 * t.dist) / t.total) },
        ];
      },
      check(t, v) {
        if (!v || typeof v.x !== "number" || v.down !== "x+u" || v.up !== "x-u") return false;
        const u = t.current, x = v.x;
        return x > u && Math.abs(t.dist / (x + u) + t.dist / (x - u) - t.total) < 1e-9;
      },
      build(el, t, kit) {
        hintAnd(el, t, "Перетащите карточки скоростей на стрелки, затем подберите x кнопками − и +");
        const u = t.current, S = t.dist;
        const cards = [["x+u", `x + ${u}`], ["x-u", `x − ${u}`], ["x", "x"], ["u-x", `${u} − x`]];
        const speed = (id, x) => ({ "x+u": x + u, "x-u": x - u, x, "u-x": u - x }[id]);
        const fig = kit.stage(el, 360, 300, "Река с течением, катер и карточки скоростей");
        txt(fig, 16, 26, `${K.num(S)} км туда и обратно — ${K.num(t.total)} ч`, "sc-t16", "start");
        K.svg("rect", { x: 0, y: 40, width: 360, height: 172, class: "sc-m8h-river" }, fig);
        [62, 136, 196].forEach((y, i) => K.svg("line", { x1: 10 + i * 20, y1: y, x2: 350, y2: y, class: "sc-m8h-wave" }, fig));
        arrow(fig, 236, 340, 56, "sc-m8h-arrow is-current");
        txt(fig, 230, 61, `течение ${K.num(u)} км/ч`, "sc-t14", "end");
        const legs = [
          { id: "down", y: 100, dir: 1, name: "по течению" },
          { id: "up", y: 172, dir: -1, name: "против течения" },
        ];
        legs.forEach((l) => {
          at(boat(fig, l.dir), l.dir > 0 ? 34 : 64, l.y + 2);
          l.dir > 0 ? arrow(fig, 70, 100, l.y - 2) : arrow(fig, 30, 2, l.y - 2);
          txt(fig, 14, l.y - 22, l.name, "sc-t14", "start");
          l.time = txt(fig, 300, l.y + 4, "t = ?", "sc-t16");
        });
        const sum = txt(fig, 180, 288, "", "sc-t16");
        let x = null, touched = false;
        const zones = [
          { id: "down", x: 116, y: 80, w: 136, h: 40, label: "Скорость по течению", hideLabel: true },
          { id: "up", x: 116, y: 152, w: 136, h: 40, label: "Скорость против течения", hideLabel: true },
          { id: "pool", x: 8, y: 222, w: 344, h: 44, label: "Карточки скоростей", hideLabel: true },
        ];
        zones[0].layout = () => [184, 100];
        zones[1].layout = () => [184, 172];
        zones[2].layout = (i) => [53 + i * 85, 244];
        const d = kit.dnd(fig, zones, (st, id, z) => {
          // one card per leg: a card already there goes back to the pool
          if (z !== "pool") d.itemsIn(z).filter((o) => o !== id).forEach((o) => d.place(o, "pool"));
          touched = true; paint(); fire(el);
        });
        cards.forEach(([id, text]) => {
          const g = K.svg("g", { "aria-label": `Скорость ${text}` });
          kit.art.card(g, text, 76, 34);
          d.add(id, g, "pool");
        });
        const row = K.controls(el);
        const step = K.stepper(row, "x, км/ч", 1, t.maxX || 20, (n) => { x = n; touched = true; paint(); fire(el); });
        const on = (leg) => d.itemsIn(leg)[0] || null;
        const fmt = (h) => (Math.abs(h - Math.round(h * 100) / 100) < 1e-9 ? "" : "≈ ") + K.num(Math.round(h * 100) / 100);
        function paint() {
          let total = 0, ok = x !== null;
          legs.forEach((l) => {
            const c = on(l.id);
            if (!c || x === null) { l.time.textContent = "t = ?"; ok = false; return; }
            const v = speed(c, x);
            if (v <= 0) { l.time.textContent = "не плывёт"; ok = false; return; }
            l.time.textContent = `${fmt(S / v)} ч`;
            total += S / v;
          });
          sum.textContent = ok ? `всего ${fmt(total)} ч` : "";
          sum.classList.toggle("sc-tx-teal", ok && Math.abs(total - t.total) < 1e-9);
        }
        paint();
        const lock = K.lockable(el);
        return {
          value: () => (touched ? { down: on("down"), up: on("up"), x } : null),
          lock(v) { lock(v); d.lock(v); },
          reveal() {
            d.place("x+u", "down"); d.place("x-u", "up");
            x = t.solution.x; step.set(x); paint();
            const a = S / (x + u), b = S / (x - u);
            K.answerLine(el, t.reveal || `x = ${x} км/ч: ${S} : ${x + u} + ${S} : ${x - u} = ${K.num(a)} + ${K.num(b)} = ${K.num(t.total)} ч`);
          },
          reset() { cards.forEach(([id]) => d.place(id, "pool")); x = null; step.set(null); touched = false; paint(); lock(false); d.lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },
  });
})();

/* ---- rus7h.js ---- */
/* Scenes for the harder grade 7 Russian lessons: rus-7-8 (Н и НН в причастиях и отглагольных прилагательных)
 * and rus-7-9 (суффиксы причастий). Both are «drag a letter tile into the gap of a word»; the shared core is
 * letterDrop(), each kind draws its own picture around it: the wounded soldier on exercise-book paper, and the
 * house being built from the suffix video, whose floors carry the words while a pallet of letter bricks waits below. */
(function () {
  const IntScenes = typeof window !== "undefined" ? window.IntScenes : require("./scenes.js");
  const W = 360;
  const fire = (el) => el.dispatchEvent(new Event("change", { bubbles: true }));
  const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);
  const pick = (t, list) => {
    const seen = new Set([JSON.stringify(t.solution)]);
    return list.filter((v) => { const s = JSON.stringify(v); if (seen.has(s)) return false; seen.add(s); return true; }).slice(0, 4);
  };
  function textW(fig, kit, s, cls, size) {
    if (!s) return 0;
    const n = kit.label(fig, 0, -50, s, cls, "start");
    let w = 0;
    try { w = n.getComputedTextLength(); } catch (e) { w = 0; }
    n.remove();
    return w || s.length * size * 0.56;
  }
  const fullWord = (r, letter) => `${r.before}${letter}${r.after}`;

  /* rows: [{ before, after, inf? }] with a gap between before and after; tiles: the letters, `copies` of each.
   * o: { fig, rowY(i), x0, gapW, tray: { x, y, w, h, cols, cell }, tile(parent, letter) → <g> } */
  function letterDrop(el, t, kit, o) {
    const { fig } = o;
    const zones = t.rows.map((r, i) => {
      const y = o.rowY(i);
      const wb = textW(fig, kit, r.before, "sc-r7h-w", 17);
      const x = o.x0 + wb + 2;
      kit.label(fig, o.x0, y + 6, r.before, "sc-r7h-w", "start");
      if (r.inf) kit.label(fig, o.x0, y - 22, `от «${r.inf}»`, "sc-r7h-inf", "start");
      const after = r.after.trim(), sp = after !== r.after ? 6 : 0; // «боец ранен_ в руку»: a space after the gap
      if (after) kit.label(fig, x + o.gapW + 2 + sp, y + 6, after, "sc-r7h-w", "start");
      return { id: `g${i}`, x, y: y - 17, w: o.gapW, h: 34, hideLabel: true, label: `Пропуск в слове «${fullWord(r, "…")}»`, layout: () => [x + o.gapW / 2, y] };
    });
    const tr = o.tray;
    zones.push({ id: "tray", x: tr.x, y: tr.y, w: tr.w, h: tr.h, cls: "sc-r7h-tray", label: "Буквы", hideLabel: true,
      layout: (i) => [tr.x + tr.cell * ((i % tr.cols) + 0.5) + (tr.w - tr.cell * tr.cols) / 2, tr.y + tr.rowH * (Math.floor(i / tr.cols) + 0.5) + 4] });
    const letterOf = new Map();
    const dnd = kit.dnd(fig, zones, (state, id, zoneId) => {
      if (zoneId !== "tray") dnd.itemsIn(zoneId).filter((x) => x !== id).forEach((x) => dnd.place(x, "tray"));
      fire(el);
    });
    let n = 0;
    t.tiles.forEach((letter) => {
      for (let c = 0; c < (t.copies || t.rows.length); c++) {
        const id = `t${n++}`;
        letterOf.set(id, letter);
        const g = o.tile(fig, letter);
        g.setAttribute("aria-label", `Буква «${letter}»`);
        dnd.add(id, g, "tray");
      }
    });
    const value = () => {
      const v = t.rows.map((_, i) => { const ids = dnd.itemsIn(`g${i}`); return ids.length ? letterOf.get(ids[0]) : null; });
      return v.every((x) => x === null) ? null : v;
    };
    const toTray = () => [...letterOf.keys()].forEach((id) => dnd.place(id, "tray"));
    const lock = kit.lockable(el);
    return {
      value,
      lock(on) { lock(on); dnd.lock(on); },
      reveal() {
        toTray();
        const used = new Set();
        t.solution.forEach((letter, i) => {
          const id = [...letterOf.keys()].find((k) => letterOf.get(k) === letter && !used.has(k));
          used.add(id);
          dnd.place(id, `g${i}`);
        });
        kit.answerLine(el, t.reveal || `Верно: ${kit.listJoin(t.rows.map((r, i) => fullWord(r, t.solution[i])))}`);
      },
      reset() { toTray(); lock(false); dnd.lock(false); },
      celebrate: () => kit.celebrate(fig),
    };
  }
  // wrong patterns: everything with the first letter, everything with the second, every gap flipped, only the first flipped
  const flipWrong = (t, pairs) => {
    const flip = (x) => pairs[x] || x;
    return pick(t, [t.solution.map(() => t.tiles[0]), t.solution.map(() => t.tiles[1]), t.solution.map(flip),
      t.solution.map((x, i) => (i === 0 ? flip(x) : x)), t.solution.map((x, i) => (i === t.solution.length - 1 ? flip(x) : x))]);
  };

  /* small pictures for the top of the nn sheet, each centred on 0,0 and about 90 × 80 */
  const pics = {
    soldier(g, kit) {
      const s = (tag, a) => kit.svg(tag, a, g);
      s("rect", { x: -9, y: 14, width: 7, height: 26, rx: 3, class: "sc-r7h-olive2" }); s("rect", { x: 2, y: 14, width: 7, height: 26, rx: 3, class: "sc-r7h-olive2" });
      s("rect", { x: -17, y: -16, width: 34, height: 36, rx: 12, class: "sc-r7h-olive" });
      s("polygon", { points: "-13,-12 15,-12 1,10", class: "sc-r7h-bandage" });
      s("circle", { cx: 0, cy: -27, r: 13, class: "sc-r7h-skin" });
      s("path", { d: "M-15 -30 A15 15 0 0 1 15 -30 Z", class: "sc-r7h-olive2" });
      s("rect", { x: -13, y: -30, width: 26, height: 6, rx: 2, class: "sc-r7h-bandage" });
      s("rect", { x: -2, y: -32, width: 4, height: 9, class: "sc-red" });
    },
    chest(g, kit) {
      const s = (tag, a) => kit.svg(tag, a, g);
      s("rect", { x: -36, y: -14, width: 72, height: 44, rx: 4, class: "sc-crust" });
      s("path", { d: "M-36 -14 Q0 -44 36 -14 Z", class: "sc-crust" });
      [-24, 18].forEach((x) => s("rect", { x, y: -30, width: 6, height: 60, class: "sc-r7h-iron" }));
      s("rect", { x: -36, y: -16, width: 72, height: 5, class: "sc-r7h-iron" });
      s("rect", { x: -6, y: -6, width: 12, height: 14, rx: 3, class: "sc-gold" });
    },
    meadow(g, kit) {
      const s = (tag, a) => kit.svg(tag, a, g);
      s("rect", { x: -46, y: 22, width: 92, height: 10, rx: 5, class: "sc-teal" });
      s("path", { d: "M-34 24 Q-30 -26 0 -32 Q30 -26 34 24 Z", class: "sc-cheese" });
      s("path", { d: "M-18 0 h36 M-24 12 h48", class: "sc-r7h-hay" });
      [-40, 40].forEach((x) => s("path", { d: `M${x} 24 l-5 -14 M${x} 24 l0 -16 M${x} 24 l5 -14`, class: "sc-r7h-grass" }));
    },
  };

  IntScenes.add({
    /* ------------------------------------------------------- nn-medic-tags (rus-7-8)
     * The video's wounded soldier (or a forged chest, or a mown meadow) above exercise-book lines with words that
     * miss Н or НН. Drag a red tile «н» or «нн» into each gap. task: { pic, rows: [{ before, after }],
     * tiles: ["н", "нн"], solution: ["н" | "нн" per row] } */
    "nn-medic-tags": {
      wrong: (t) => flipWrong(t, { н: "нн", нн: "н" }),
      check: (t, v) => same(v, t.solution),
      build(el, t, kit) {
        kit.hint(el, t.hint || "Перетащите плитку «н» или «нн» в пропуск (или нажмите плитку, потом пропуск)");
        const H = 104 + t.rows.length * 44 + 60;
        const fig = kit.stage(el, W, H, "Тетрадный лист со словами, в которых пропущены Н или НН");
        for (let y = 30; y < H - 8; y += 22) kit.svg("line", { x1: 8, y1: y, x2: W - 8, y2: y, class: "sc-r79-rule" }, fig);
        kit.svg("line", { x1: 30, y1: 6, x2: 30, y2: H - 6, class: "sc-r79-margin" }, fig);
        kit.label(fig, 44, 46, "н или нн?", "sc-r7h-title", "start");
        kit.label(fig, 44, 72, t.caption || "", "sc-r7h-cap", "start");
        const pg = kit.svg("g", { transform: "translate(292 54)" }, fig);
        (pics[t.pic] || pics.soldier)(pg, kit);
        return letterDrop(el, t, kit, {
          fig, x0: 40, gapW: 40, rowY: (i) => 122 + i * 44,
          tray: { x: 14, y: H - 54, w: W - 28, h: 46, cols: 8, cell: 41, rowH: 38 },
          tile(parent, letter) {
            const g = kit.svg("g", {}, parent);
            kit.svg("rect", { x: -18, y: -17, width: 36, height: 34, rx: 8, class: "sc-red" }, g);
            kit.label(g, 0, 6, letter, "sc-r7h-tile");
            return g;
          },
        });
      },
    },

    /* ------------------------------------------------------- suffix-bricks (rus-7-9)
     * The house from the video: every floor carries a participle with a gap and its infinitive; a crane with the flag
     * stands beside. Drag a letter brick from the pallet into each gap. task: { rows: [{ before, after, inf }],
     * tiles: ["у", "ю", "а", "я", "е", "и"], copies: 2, solution: [letter per row] } */
    "suffix-bricks": {
      wrong: (t) => flipWrong(t, { у: "а", а: "у", ю: "я", я: "ю", е: "и", и: "е" }),
      check: (t, v) => same(v, t.solution),
      build(el, t, kit) {
        kit.hint(el, t.hint || "Перетащите кирпичик с буквой в пропуск (или нажмите кирпичик, потом пропуск)");
        const n = t.rows.length, top = 60, FH = 62;
        const cols = 6, rowsT = Math.ceil((t.tiles.length * (t.copies || n)) / cols);
        const H = top + n * FH + 26 + rowsT * 40 + 12;
        const fig = kit.stage(el, W, H, "Строящийся дом: на этажах слова с пропущенной буквой, внизу поддон с кирпичиками-буквами");
        const s = (tag, a) => kit.svg(tag, a, fig);
        // crane with the flag, then the roof frame and the floors
        s("rect", { x: 330, y: 20, width: 9, height: top + n * FH - 20, class: "sc-gold" });
        s("rect", { x: 226, y: 18, width: 126, height: 7, class: "sc-gold" });
        s("path", { d: "M244 25 v14", class: "sc-thin" });
        s("path", { d: "M334.5 18 V5", class: "sc-thin" });
        s("path", { d: "M336 5 h18 v11 h-18 Z", class: "sc-teal" });
        s("rect", { x: 10, y: top - 26, width: 5, height: 26, class: "sc-soft" });
        s("rect", { x: 309, y: top - 26, width: 5, height: 26, class: "sc-soft" });
        s("rect", { x: 10, y: top - 28, width: 304, height: 5, class: "sc-soft" });
        for (let i = 0; i < n; i++) s("rect", { x: 10, y: top + i * FH, width: 304, height: FH - 3, rx: 3, class: i % 2 ? "sc-r7h-brick2" : "sc-r7h-brick" });
        s("rect", { x: 0, y: top + n * FH - 2, width: W, height: 4, class: "sc-soft" });
        return letterDrop(el, t, kit, {
          fig, x0: 20, gapW: 38, rowY: (i) => top + i * FH + 38,
          tray: { x: 40, y: top + n * FH + 18, w: 280, h: rowsT * 40 + 6, cols, cell: 44, rowH: 40 },
          tile(parent, letter) {
            const g = kit.svg("g", {}, parent);
            kit.svg("rect", { x: -18, y: -17, width: 36, height: 34, rx: 5, class: "sc-r7h-tilebrick" }, g);
            kit.label(g, 0, 7, letter, "sc-r7h-tile");
            return g;
          },
        });
      },
    },
  });
})();

/* ---- rus8h.js ---- */
/* Scenes for the harder grade 8 Russian lessons: rus-8-9 (обособленные определения и приложения)
 * and rus-8-10 (уточняющие члены предложения). */
(function () {
  const IntScenes = typeof window !== "undefined" ? window.IntScenes : require("./scenes.js");
  const W = 360;
  const fire = (el) => el.dispatchEvent(new Event("change", { bubbles: true }));
  const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);
  const pick = (t, list) => {
    const seen = new Set([JSON.stringify(t.solution)]);
    return list.filter((v) => { const s = JSON.stringify(v); if (seen.has(s)) return false; seen.add(s); return true; }).slice(0, 4);
  };
  function textW(fig, kit, s, cls, size) {
    const n = kit.label(fig, 0, -50, s, cls, "start");
    let w = 0;
    try { w = n.getComputedTextLength(); } catch (e) { w = 0; }
    n.remove();
    return w || s.length * size * 0.56;
  }
  function paper(el, kit, H, aria) {
    const fig = kit.stage(el, W, H, aria);
    for (let y = 30; y < H - 8; y += 24) kit.svg("line", { x1: 8, y1: y, x2: W - 8, y2: y, class: "sc-r79-rule" }, fig);
    kit.svg("line", { x1: 30, y1: 6, x2: 30, y2: H - 6, class: "sc-r79-margin" }, fig);
    return fig;
  }

  IntScenes.add({
    /* -------------------------------------------------------- sofa-commas (rus-8-9)
     * The video's dad asleep on the sofa under the exercise-book sentences. Tap the gap after a word to clip a red
     * comma there (tap again to take it off). task: { sentences: ["Отец лежащий на диване спал.", …],
     * solution: [[gap indices with a comma] per sentence] } — gap i sits after word i. */
    "sofa-commas": {
      wrong(t) {
        const sol = t.solution;
        const none = sol.map(() => []);
        const lastLost = sol.map((s) => (s.length > 1 ? s.slice(0, -1) : s.slice()));
        const firstLost = sol.map((s) => (s.length > 1 ? s.slice(1) : s.slice()));
        const extra = sol.map((s, i) => (s.length ? s.slice() : [Math.max(0, t.sentences[i].split(" ").length - 3)]));
        return pick(t, [none, lastLost, firstLost, extra]);
      },
      check: (t, v) => Array.isArray(v) && v.length === t.solution.length &&
        v.every((s, i) => Array.isArray(s) && same([...s].sort((a, b) => a - b), [...t.solution[i]].sort((a, b) => a - b))),
      build(el, t, kit) {
        const { svg, label } = kit;
        kit.hint(el, t.hint || "Нажмите в промежуток после слова, чтобы поставить запятую; ещё раз — убрать");
        // lay the words out first (in a scratch figure) to know the height
        const words = t.sentences.map((s) => s.split(" "));
        const scratch = kit.stage(el, W, 10, "");
        const lines = [];
        let y = 42;
        const placed = words.map((ws) => {
          let x = 40;
          const out = ws.map((w) => {
            const wd = textW(scratch, kit, w, "sc-r79-w", 18);
            if (x + wd > 348 && x > 40) { x = 40; y += 36; }
            const g = { w, x, y, wd };
            x += wd + 14;
            return g;
          });
          lines.push(y);
          y += 46;
          return out;
        });
        scratch.remove();
        const H = y + 70;
        const fig = paper(el, kit, H, "Предложения на тетрадном листе; под ними на диване спит папа");
        // the sofa with the sleeping dad, bottom right
        const sofa = svg("g", { transform: `translate(250 ${H - 14})` }, fig);
        svg("rect", { x: -80, y: -52, width: 160, height: 30, rx: 10, class: "sc-teal" }, sofa);
        svg("rect", { x: -90, y: -34, width: 22, height: 32, rx: 8, class: "sc-teal" }, sofa);
        svg("rect", { x: 68, y: -34, width: 22, height: 32, rx: 8, class: "sc-teal" }, sofa);
        svg("rect", { x: -68, y: -26, width: 136, height: 22, rx: 6, class: "sc-r8h-seat" }, sofa);
        svg("rect", { x: -50, y: -40, width: 90, height: 16, rx: 8, class: "sc-red" }, sofa);
        svg("rect", { x: 34, y: -37, width: 34, height: 11, rx: 5, class: "sc-ink" }, sofa);
        svg("circle", { cx: -60, cy: -38, r: 10, class: "sc-r8h-skin" }, sofa);
        const zz = svg("g", { class: "sc-r8h-zz" }, sofa);
        label(zz, -48, -56, "z", "sc-r8h-z");
        label(zz, -36, -66, "z", "sc-r8h-z sc-r8h-zs");
        const state = words.map(() => new Set());
        let touched = false;
        const gaps = [];
        placed.forEach((ws, si) => {
          label(fig, 18, ws[0].y, String(si + 1), "sc-r8h-num");
          ws.forEach((g, wi) => {
            label(fig, g.x, g.y, g.w, "sc-r79-w", "start");
            if (wi === ws.length - 1) return;
            const gx = g.x + g.wd;
            const node = svg("g", { class: "sc-tap sc-r8h-gap", role: "button" }, fig);
            svg("rect", { x: gx - 4, y: g.y - 24, width: 20, height: 34, rx: 6, class: "sc-r8h-hit" }, node);
            const dot = svg("circle", { cx: gx + 6, cy: g.y + 1, r: 2.4, class: "sc-r8h-dot" }, node);
            const mark = label(node, gx + 1, g.y, ",", "sc-r8h-comma", "start");
            const set = () => {
              const on = state[si].has(wi);
              mark.style.display = on ? "" : "none";
              dot.style.display = on ? "none" : "";
              node.setAttribute("aria-label", `После «${g.w}»: ${on ? "запятая" : "без запятой"}`);
            };
            kit.toggleable(node, () => {
              if (state[si].has(wi)) state[si].delete(wi); else state[si].add(wi);
              touched = true;
              set(); kit.pop(node); fire(el);
            });
            gaps.push(set);
            set();
          });
        });
        const value = () => (touched ? state.map((s) => [...s].sort((a, b) => a - b)) : null);
        const lock = kit.lockable(el);
        return {
          value,
          lock,
          reveal() {
            t.solution.forEach((s, i) => { state[i] = new Set(s); });
            touched = true;
            gaps.forEach((f) => f());
            kit.answerLine(el, t.reveal || t.answer);
          },
          reset() { state.forEach((s) => s.clear()); touched = false; gaps.forEach((f) => f()); lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },

    /* --------------------------------------------------------- lens-pairs (rus-8-10)
     * The video's mountain-and-river vs evening-park picture as two baskets: drag each pair of words into
     * «уточняет» (the second part narrows the first — commas appear on the card) or «не уточняет» (no commas).
     * task: { pairs: [[first, second], …], solution: ["u" | "d", …] } */
    "lens-pairs": {
      wrong: (t) => pick(t, [t.solution.map(() => "u"), t.solution.map(() => "d"), t.solution.map((s) => (s === "u" ? "d" : "u")),
        t.solution.map((s, i) => (i === t.solution.indexOf("u") ? "d" : s))]),
      check: (t, v) => same(v, t.solution),
      build(el, t, kit) {
        const { svg, label } = kit;
        kit.hint(el, t.hint || "Перетащите карточку в корзину (или нажмите на карточку, потом на корзину)");
        const n = t.pairs.length, rows = Math.ceil(n / 2);
        const ZY = 22 + rows * 40, ZH = 52 + n * 36, H = ZY + ZH + 10;
        const fig = kit.stage(el, W, H, "Карточки с парами слов и две корзины: уточняет и не уточняет");
        const zones = [
          { id: "tray", x: 6, y: 6, w: 348, h: rows * 40 + 8, label: "Карточки", hideLabel: true, cls: "sc-r8h-tray", layout: (i) => [93 + (i % 2) * 174, 30 + Math.floor(i / 2) * 40] },
          { id: "u", x: 6, y: ZY, w: 172, h: ZH, label: "Уточняет: запятые", hideLabel: true, layout: (i) => [92, ZY + 66 + i * 36] },
          { id: "d", x: 182, y: ZY, w: 172, h: ZH, label: "Не уточняет: без запятых", hideLabel: true, layout: (i) => [268, ZY + 66 + i * 36] },
        ];
        const d = kit.dnd(fig, zones, () => { touched = true; paint(); fire(el); });
        // basket headers: the mountain with the river (narrowing), the evening park (two separate things)
        const hu = svg("g", { transform: `translate(0 ${ZY})`, class: "sc-r8h-head" }, fig);
        svg("polygon", { points: "18,36 36,12 54,36", class: "sc-violet" }, hu);
        svg("path", { d: "M14 40 q10 -5 22 0 t22 0", class: "sc-r8h-river" }, hu);
        label(hu, 64, 22, "уточняет", "sc-r8h-zt", "start");
        label(hu, 64, 40, "→ запятые", "sc-r8h-zs2 sc-r8h-red", "start");
        const hd = svg("g", { transform: `translate(176 ${ZY})`, class: "sc-r8h-head" }, fig);
        svg("circle", { cx: 26, cy: 22, r: 12, class: "sc-teal" }, hd);
        svg("rect", { x: 24, y: 30, width: 5, height: 12, class: "sc-crust" }, hd);
        svg("circle", { cx: 48, cy: 14, r: 6, class: "sc-gold" }, hd);
        label(hd, 58, 22, "не уточняет", "sc-r8h-zt", "start");
        label(hd, 58, 40, "без запятых", "sc-r8h-zs2", "start");
        let touched = false;
        const cards = t.pairs.map((p, i) => {
          const g = svg("g", { "aria-label": `${p[0]} ${p[1]}` });
          const plain = `${p[0]} ${p[1]}`;
          const w = Math.min(166, textW(fig, kit, p[0] + ", " + p[1], "sc-r8h-card", 14) + 16);
          svg("rect", { x: -w / 2, y: -15, width: w, height: 30, rx: 9, class: "sc-r8h-cardbg" }, g);
          const tx = svg("text", { x: 0, y: 5, "text-anchor": "middle", class: "sc-r8h-card" }, g);
          const a = svg("tspan", {}, tx); a.textContent = p[0];
          const c = svg("tspan", { class: "sc-r8h-red" }, tx); c.textContent = ",";
          const b = svg("tspan", {}, tx); b.textContent = " " + p[1];
          d.add(i, g, "tray");
          return { g, c, plain };
        });
        function paint() {
          cards.forEach((cd, i) => {
            const z = d.zoneOf(i);
            cd.c.style.display = z === "u" ? "" : "none";
            cd.g.classList.toggle("is-on", z === "u");
            cd.g.setAttribute("aria-label", `${cd.plain}: ${z === "u" ? "уточняет" : z === "d" ? "не уточняет" : "не разложена"}`);
          });
        }
        paint();
        const lockF = kit.lockable(el);
        return {
          value: () => (touched ? cards.map((_, i) => (d.zoneOf(i) === "tray" ? "" : d.zoneOf(i))) : null),
          lock(on) { lockF(on); d.lock(on); },
          reveal() { t.solution.forEach((s, i) => d.place(i, s)); touched = true; paint(); kit.answerLine(el, t.reveal || t.answer); },
          reset() { cards.forEach((_, i) => d.place(i, "tray")); touched = false; paint(); lockF(false); d.lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },
  });
})();
