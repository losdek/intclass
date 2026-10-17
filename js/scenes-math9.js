/* Scenes for grade 9 math (see js/scenes.js): the fountain, the push-up training, the stationery shop,
 * the box of balls, the parabola over the axis, the splitting cells and the hinge of the cosine law. */
(function () {
  const IntScenes = typeof window !== "undefined" ? window.IntScenes : require("./scenes.js");
  const fire = (el) => el.dispatchEvent(new Event("change", { bubbles: true }));
  // a label with its own size (inline style beats the class sizes, colours still follow the theme)
  const txt = (kit, p, x, y, s, size, anchor, cls) => {
    const n = kit.label(p, x, y, s, cls || "sc-name", anchor);
    if (size) n.style.fontSize = `${size}px`;
    return n;
  };
  const subs = (n) => String(n).replace(/\d/g, (d) => "₀₁₂₃₄₅₆₇₈₉"[d]);
  const big = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ").replace("-", "−");
  const isInt = (v) => typeof v === "number" && Number.isInteger(v);
  const differ = (t, check, list) => list.filter((w) => !check(t, w)).slice(0, 4);

  IntScenes.add({
    /* ---------------------------------------------------------- fountain-jet
     * The fountain from the parabola video: the jet leaves the nozzle (0; c) and must fall into the bowl.
     * The pupil drags the top of the jet (or uses the two steppers) to the vertex of y = ax² + bx + c.
     * task: { a, b, c, xMax?, yMax?, solution: { x, y } } — value { x, y }, the vertex. */
    "fountain-jet": {
      wrong: (t) => differ(t, IntScenes.kinds["fountain-jet"].check, [
        { x: t.solution.x, y: t.c + 1 },
        { x: t.solution.y, y: t.solution.x },
        { x: t.solution.x + 1, y: t.solution.y },
        { x: t.solution.x, y: t.solution.y - 1 },
      ]),
      check: (t, v) => Boolean(v) && v.x === t.solution.x && v.y === t.solution.y,
      build(el, t, kit) {
        const { svg, stage, hint, celebrate, controls, stepper, lockable, answerLine, drag, clamp } = kit;
        const W = 360, H = 260, OX = 42, OY = 228, xMax = t.xMax || 8, yMax = t.yMax || 10;
        const ux = (W - OX - 24) / xMax, uy = (OY - 22) / yMax;
        const P = (x, y) => [OX + x * ux, OY - y * uy];
        hint(el, t.hint || "Перетащите верх струи (красную точку) или задайте вершину кнопками");
        const fig = stage(el, W, H, "Фонтан: струя воды — парабола");
        for (let i = 1; i <= xMax; i++) svg("line", { x1: P(i, 0)[0], y1: OY, x2: P(i, 0)[0], y2: P(0, yMax)[1], class: "f-grid" }, fig);
        for (let j = 1; j <= yMax; j++) svg("line", { x1: OX, y1: P(0, j)[1], x2: P(xMax, 0)[0], y2: P(0, j)[1], class: "f-grid" }, fig);
        for (let i = 2; i <= xMax; i += 2) txt(kit, fig, P(i, 0)[0], OY + 20, String(i), 14, "middle", "sc-zone-label");
        for (let j = 2; j <= yMax; j += 2) txt(kit, fig, OX - 13, P(0, j)[1] + 5, String(j), 14, "end", "sc-zone-label");
        // the bowl where the water should land (the larger root of the equation)
        const D = t.b * t.b - 4 * t.a * t.c;
        const land = Math.max((-t.b + Math.sqrt(D)) / (2 * t.a), (-t.b - Math.sqrt(D)) / (2 * t.a));
        const [bx] = P(land, 0);
        svg("path", { d: `M${bx - 30} ${OY - 18} L${bx + 30} ${OY - 18} L${bx + 22} ${OY} L${bx - 22} ${OY} Z`, class: "sc-teal" }, fig);
        svg("ellipse", { cx: bx, cy: OY - 18, rx: 28, ry: 5, class: "sc-blue" }, fig);
        svg("line", { x1: 18, y1: OY, x2: W - 14, y2: OY, class: "sc-stroke" }, fig);
        // the pedestal with the nozzle at height c
        const [, ny] = P(0, t.c);
        svg("rect", { x: OX - 7, y: ny, width: 14, height: OY - ny, rx: 4, class: "sc-soft" }, fig);
        svg("rect", { x: OX - 6, y: ny - 6, width: 12, height: 8, rx: 2, class: "sc-ink" }, fig);
        const jet = svg("path", { fill: "none", style: "stroke: var(--sc-blue); stroke-width: 6; stroke-linecap: round; opacity: .85" }, fig);
        const splash = svg("g", {}, fig);
        const handle = svg("g", { class: "sc-tap", role: "button", "aria-label": "Вершина струи" }, fig);
        svg("circle", { r: 20, fill: "transparent" }, handle);
        svg("circle", { r: 9, class: "sc-red" }, handle);
        const tag = txt(kit, fig, 0, 0, "", 15, "middle", "sc-name");
        svg("rect", { x: W - 168, y: 10, width: 156, height: 28, rx: 14, class: "sc-cream" }, fig);
        txt(kit, fig, W - 90, 30, t.formula || "", 16, "middle", "sc-name");
        let h = 1, k = Math.min(yMax, t.c + 2), touched = false;
        const row = controls(el);
        const sx = stepper(row, "x вершины", 1, xMax, (v) => set(v, k));
        const sy = stepper(row, "y вершины", t.c + 1, yMax, (v) => set(h, v));
        function draw() {
          const a = (t.c - k) / (h * h);
          const end = h + Math.sqrt(-k / a);
          const pts = [];
          for (let i = 0; i <= 40; i++) {
            const x = (end * i) / 40;
            pts.push(P(x, a * (x - h) ** 2 + k).map((n) => n.toFixed(1)).join(" "));
          }
          jet.setAttribute("d", `M${pts.join(" L")}`);
          const [ex] = P(end, 0), hit = Math.abs(end - land) < 0.25;
          splash.textContent = "";
          [-1, 1].forEach((s) => svg("circle", { cx: ex + s * 9, cy: OY - (hit ? 26 : 8), r: 4, class: "sc-blue" }, splash));
          const [hx, hy] = P(h, k);
          handle.setAttribute("transform", `translate(${hx} ${hy})`);
          tag.setAttribute("x", clamp(hx, 50, W - 50));
          tag.setAttribute("y", hy - 16);
          tag.textContent = touched ? `(${h}; ${k})` : "";
          sx.set(h);
          sy.set(k);
        }
        function set(x, y) {
          h = clamp(Math.round(x), 1, xMax);
          k = clamp(Math.round(y), t.c + 1, yMax);
          touched = true;
          draw();
          fire(el);
        }
        drag(handle, fig, (p) => set((p.x - OX) / ux, (OY - p.y) / uy));
        draw();
        const lock = lockable(el);
        return {
          value: () => (touched ? { x: h, y: k } : null),
          lock,
          reveal() {
            h = t.solution.x; k = t.solution.y; touched = true; draw();
            answerLine(el, t.reveal || `Вершина (${t.solution.x}; ${t.solution.y}) — вода падает в чашу`);
          },
          reset() { h = 1; k = Math.min(yMax, t.c + 2); touched = false; draw(); lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* ---------------------------------------------------------- pushup-bars
     * The training video: push-ups per day grow by d, drawn as bars. mode "nth": days 1–3 are shown and the
     * pupil raises the bar of day n (drag its top or type the number). mode "sum": all n bars; tapping a bar
     * shows its Gauss pair (1-й + n-й …), the pupil types the total.
     * task: { a1, d, n, mode, solution: number } — value: the number. */
    "pushup-bars": {
      wrong(t) {
        const an = t.a1 + t.d * (t.n - 1);
        const list = t.mode === "sum" ? [an * t.n, (t.a1 + an) * t.n, t.a1 * t.n + t.d * t.n] : [t.a1 + t.d * t.n, t.a1 * t.n, t.d * t.n];
        return differ(t, IntScenes.kinds["pushup-bars"].check, list);
      },
      check: (t, v) => isInt(v) && v === t.solution,
      build(el, t, kit) {
        const { svg, stage, hint, celebrate, controls, numberField, lockable, answerLine, drag, toggleable, clamp, pop } = kit;
        const W = 360, H = 270, BASE = 222, TOP = 54, sum = t.mode === "sum";
        const an = t.a1 + t.d * (t.n - 1);
        const maxV = sum ? an : Math.ceil((an * 1.6) / 10) * 10;
        const hOf = (v) => (clamp(v, 0, maxV) / maxV) * (BASE - TOP);
        const colors = ["teal", "gold", "red", "blue", "violet"];
        hint(el, t.hint || (sum ? "Нажмите на столбик — увидите его пару; впишите, сколько всего" : `Потяните столбик дня ${t.n} вверх или впишите число`));
        const fig = stage(el, W, H, sum ? "Столбики отжиманий по дням" : "Отжимания по дням, последний столбик неизвестен");
        svg("line", { x1: 14, y1: BASE, x2: W - 14, y2: BASE, class: "sc-stroke" }, fig);
        const days = sum ? Array.from({ length: t.n }, (_, i) => i + 1) : [1, 2, 3, t.n];
        const slot = sum ? (W - 40) / t.n : 78;
        const xOf = (i) => (sum ? 20 + slot * (i + 0.5) : i < 3 ? 46 + i * 70 : 300);
        const bw = Math.min(46, slot - 8);
        const top = txt(kit, fig, W / 2, 30, "", 16, "middle", "sc-name");
        if (!sum) txt(kit, fig, 240, BASE - 10, "…", 26, "middle", "sc-name");
        const bars = days.map((d, i) => {
          const v = d === t.n && !sum ? null : t.a1 + t.d * (d - 1);
          const g = svg("g", {}, fig);
          const r = svg("rect", { x: xOf(i) - bw / 2, width: bw, rx: 5, class: `sc-${colors[i % 5]}` }, g);
          const lab = txt(kit, g, xOf(i), 0, v === null ? "?" : String(v), sum ? 14 : 17, "middle", "sc-name");
          txt(kit, fig, xOf(i), BASE + 20, sum ? String(d) : `день ${d}`, 14, "middle", "sc-zone-label");
          const put = (val) => {
            const hh = val === null ? 26 : Math.max(4, hOf(val));
            r.setAttribute("y", BASE - hh); r.setAttribute("height", hh);
            r.style.opacity = val === null ? 0.35 : 1;
            lab.setAttribute("y", BASE - hh - 8); lab.textContent = val === null ? "?" : String(val);
          };
          put(v);
          return { g, r, put, d, v };
        });
        if (sum) txt(kit, fig, W / 2, BASE + 42, "номер дня", 14, "middle", "sc-zone-label");
        const row = controls(el);
        let val = null;
        const field = numberField(row, sum ? `Всего за ${t.n} дн.` : `День ${t.n}`, { min: 0, max: 99999 }, (v) => setVal(v, false));
        function setVal(v, fromDrag) {
          val = v;
          if (fromDrag) field.set(v);
          if (!sum) bars[3].put(v);
          fire(el);
        }
        if (!sum) {
          const step = (function g(a, b) { return b ? g(b, a % b) : a; })(t.a1, t.d);
          const last = bars[3];
          last.r.classList.add("sc-tap");
          last.r.setAttribute("aria-label", `Столбик дня ${t.n}`);
          drag(last.r, fig, (p) => p.x > 260 && setVal(Math.round(clamp(((BASE - p.y) / (BASE - TOP)) * maxV, 0, maxV) / step) * step, true));
        } else {
          bars.forEach((b, i) => {
            b.r.classList.add("sc-tap");
            b.r.setAttribute("role", "button");
            b.r.setAttribute("aria-label", `День ${b.d}: ${b.v}`);
            toggleable(b.r, () => {
              const j = t.n - 1 - i, o = bars[j];
              bars.forEach((x, m) => (x.r.style.opacity = m === i || m === j ? 1 : 0.45));
              top.textContent = i === j ? `день ${b.d}: ${b.v} — пары нет` : `день ${b.d} + день ${o.d}: ${b.v} + ${o.v} = ${b.v + o.v}`;
              pop(b.r); pop(o.r);
            });
          });
        }
        const lock = lockable(el);
        return {
          value: () => val,
          lock,
          reveal() {
            setVal(t.solution, true);
            answerLine(el, t.reveal || (sum ? `S = (${t.a1} + ${an}) : 2 · ${t.n} = ${big(t.solution)}` : `a${subs(t.n)} = ${t.a1} + ${t.d} · ${t.n - 1} = ${t.solution}`));
          },
          reset() { val = null; field.set(null); if (!sum) bars[3].put(null); bars.forEach((b) => (b.r.style.opacity = "")); top.textContent = ""; lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* ------------------------------------------------------------ shop-tags
     * The stationery shop: two receipts (2 notebooks + a pencil = 100 ₽ …). The pupil drags price tags onto
     * the two goods until both receipts are right (a green tick on each).
     * task: { items: [{ name, art }, { name, art }], receipts: [{ n: [2, 1], total }], tags: [..], solution: { a, b } } */
    "shop-tags": {
      wrong: (t) => differ(t, IntScenes.kinds["shop-tags"].check, [
        { a: t.solution.b, b: t.solution.a },
        { a: t.solution.a, b: t.solution.b + 10 },
        { a: t.receipts[1].total / 2, b: t.receipts[1].total / 2 },
        { a: t.solution.a - 10, b: t.solution.b + 10 },
      ]),
      check: (t, v) => Boolean(v) && isInt(v.a) && isInt(v.b) && t.receipts.every((r) => r.n[0] * v.a + r.n[1] * v.b === r.total),
      build(el, t, kit) {
        const { svg, stage, hint, celebrate, lockable, answerLine, dnd, art } = kit;
        const W = 360, H = 290;
        hint(el, t.hint || "Перетащите ценники на товары (или нажмите ценник, потом товар)");
        const fig = stage(el, W, H, "Магазин канцтоваров: два чека и ценники");
        const goods = (p, kind, x, y, s) => {
          const g = svg("g", { transform: `translate(${x} ${y}) scale(${s})` }, p);
          if (kind === "notebook") {
            svg("rect", { x: -11, y: -15, width: 22, height: 30, rx: 3, class: "sc-teal" }, g);
            svg("rect", { x: -5, y: -9, width: 12, height: 4, rx: 1, class: "sc-cream" }, g);
          } else if (kind === "eraser") {
            svg("rect", { x: -13, y: -8, width: 26, height: 16, rx: 4, class: "sc-violet" }, g);
            svg("rect", { x: -13, y: -8, width: 10, height: 16, rx: 3, class: "sc-cream" }, g);
          } else {
            const pen = kind === "pen";
            const r = svg("g", { transform: "rotate(-35)" }, g);
            svg("rect", { x: -16, y: -3.5, width: 26, height: 7, rx: 2, class: pen ? "sc-blue" : "sc-gold" }, r);
            svg("path", { d: "M10 -3.5 L18 0 L10 3.5 Z", class: pen ? "sc-ink" : "sc-crust" }, r);
          }
          return g;
        };
        // the receipts on top
        const ticks = t.receipts.map((r, i) => {
          const y = 30 + i * 40;
          svg("rect", { x: 10, y: y - 18, width: W - 20, height: 34, rx: 8, class: "sc-cream" }, fig);
          let x = 30;
          r.n.forEach((cnt, j) => {
            if (j) { txt(kit, fig, x + 2, y + 6, "+", 18, "middle"); x += 22; }
            for (let m = 0; m < cnt; m++) { goods(fig, t.items[j].art, x, y, 0.8); x += 24; }
          });
          txt(kit, fig, x + 2, y + 6, `= ${big(r.total)} ₽`, 17, "start");
          return txt(kit, fig, W - 30, y + 7, "", 20, "middle");
        });
        const zones = t.items.map((it, j) => ({ id: `i${j}`, x: 14 + j * 172, y: 100, w: 160, h: 82, hideLabel: true, label: it.name, layout: () => [14 + j * 172 + 112, 141] }));
        zones.push({ id: "tray", x: 14, y: 210, w: W - 28, h: 70, hideLabel: true, label: "Ценники", layout: (i) => [44 + (i % 6) * 54, 245] });
        const box = dnd(fig, zones, (s, id, z) => {
          if (z !== "tray") box.itemsIn(z).filter((o) => o !== id).forEach((o) => box.place(o, "tray"));
          paint();
          fire(el);
        });
        t.items.forEach((it, j) => {
          const g = goods(fig, it.art, 14 + j * 172 + 46, 132, 1.8);
          g.setAttribute("pointer-events", "none");
          txt(kit, fig, 14 + j * 172 + 46, 174, it.name, 14, "middle", "sc-zone-label").setAttribute("pointer-events", "none");
        });
        t.tags.forEach((p, i) => {
          const c = art.card(fig, `${p} ₽`, 52, 36);
          c.querySelector("text").style.fontSize = "15px";
          c.setAttribute("aria-label", `Ценник ${p} рублей`);
          box.add(`p${i}`, c, "tray");
        });
        const priceIn = (z) => { const id = box.itemsIn(z)[0]; return id ? t.tags[Number(id.slice(1))] : null; };
        const value = () => { const a = priceIn("i0"), b = priceIn("i1"); return a === null && b === null ? null : { a, b }; };
        function paint() {
          const v = value();
          t.receipts.forEach((r, i) => {
            const ok = v && v.a !== null && v.b !== null ? r.n[0] * v.a + r.n[1] * v.b === r.total : null;
            ticks[i].textContent = ok === null ? "" : ok ? "✓" : "✗";
            ticks[i].style.fill = ok === null ? "" : ok ? "var(--sc-teal)" : "var(--sc-red)";
          });
        }
        const lockAll = lockable(el);
        const tagOf = (price) => `p${t.tags.indexOf(price)}`;
        return {
          value,
          lock(on) { lockAll(on); box.lock(on); },
          reveal() {
            t.tags.forEach((_, i) => box.place(`p${i}`, "tray"));
            box.place(tagOf(t.solution.a), "i0");
            box.place(tagOf(t.solution.b), "i1");
            paint();
            answerLine(el, t.reveal || `${t.items[0].name} — ${t.solution.a} ₽, ${t.items[1].name} — ${t.solution.b} ₽`);
          },
          reset() { t.tags.forEach((_, i) => box.place(`p${i}`, "tray")); paint(); lockAll(false); box.lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* ------------------------------------------------------------- ball-box
     * The box of red and blue balls (and the die) from the probability video.
     * mode "box": move balls between the box and the pile so that P(red) = m/n; value { red, blue } in the box,
     *   right for every count with that ratio. mode "dice": tap the favourable faces; value = sorted faces.
     * task: { mode, start: { red, blue }, pile: { red, blue }, target: [m, n] } or { mode: "dice", solution: [..] } */
    "ball-box": {
      wrong(t) {
        const chk = IntScenes.kinds["ball-box"].check;
        if (t.mode === "dice") {
          const s = t.solution;
          return differ(t, chk, [[1, 2, 3, 4, 5, 6].filter((f) => !s.includes(f)), s.slice(1), [...s, s[0] > 1 ? s[0] - 1 : 6].sort()].filter((w) => w.length));
        }
        const [m, n] = t.target;
        return differ(t, chk, [{ red: t.start.red, blue: t.start.blue }, { red: m, blue: n }, { red: t.start.red + 1, blue: t.start.blue }]);
      },
      check(t, v) {
        if (t.mode === "dice") return Array.isArray(v) && v.length > 0 && kitSameSet(v, t.solution);
        if (!v || !isInt(v.red) || !isInt(v.blue) || v.red < 0 || v.blue < 0 || v.red + v.blue === 0) return false;
        if (v.red > t.start.red + t.pile.red || v.blue > t.start.blue + t.pile.blue) return false;
        return v.red * t.target[1] === t.target[0] * (v.red + v.blue);
      },
      build(el, t, kit) {
        const { svg, stage, hint, celebrate, lockable, answerLine, dnd, toggleable, pop } = kit;
        const W = 360, dice = t.mode === "dice", H = dice ? 190 : 292;
        hint(el, t.hint || (dice ? "Нажмите на грани, которые подходят" : "Перетащите шары в коробку или из неё (или нажмите шар, потом место)"));
        const fig = stage(el, W, H, dice ? "Игральный кубик: шесть граней" : "Коробка с красными и синими шарами");
        const read = txt(kit, fig, W / 2, 30, "", 17, "middle");
        const lockAll = lockable(el);
        if (dice) {
          const on = new Set();
          const pips = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
          const faces = [1, 2, 3, 4, 5, 6].map((f, i) => {
            const g = svg("g", { transform: `translate(${34 + i * 58} 100)`, class: "sc-tap", role: "checkbox", "aria-label": `Грань ${f}` }, fig);
            const bg = svg("rect", { x: -25, y: -25, width: 50, height: 50, rx: 9, class: "sc-card-bg" }, g);
            const dots = pips[f].map(([a, b]) => svg("circle", { cx: a * 13, cy: b * 13, r: 5, class: "sc-ink" }, g));
            toggleable(g, () => { on.has(f) ? on.delete(f) : on.add(f); paint(); pop(g); fire(el); });
            return { g, bg, dots, f };
          });
          txt(kit, fig, W / 2, 168, "все исходы: 6 граней", 14, "middle", "sc-zone-label");
          const paint = () => {
            faces.forEach(({ g, bg, dots, f }) => {
              bg.style.fill = on.has(f) ? "var(--sc-teal)" : "";
              dots.forEach((d) => (d.style.fill = on.has(f) ? "var(--sc-cream)" : ""));
              g.setAttribute("aria-checked", String(on.has(f)));
            });
            read.textContent = on.size ? `P = ${on.size}/6` : "";
          };
          return {
            value: () => (on.size ? [...on].sort((a, b) => a - b) : null),
            lock: lockAll,
            reveal() { on.clear(); t.solution.forEach((f) => on.add(f)); paint(); answerLine(el, t.reveal || `Подходят ${kit.listJoin(t.solution.map(String))}: P = ${t.solution.length}/6`); },
            reset() { on.clear(); paint(); lockAll(false); },
            celebrate: () => celebrate(fig),
          };
        }
        const cell = (x0, y0) => (i) => [x0 + 20 + (i % 7) * 40, y0 + 22 + Math.floor(i / 7) * 40];
        const box = dnd(fig, [
          { id: "box", x: 30, y: 46, w: 300, h: 88, hideLabel: true, label: "Коробка", layout: cell(40, 46) },
          { id: "pile", x: 30, y: 178, w: 300, h: 88, hideLabel: true, label: "Запас", layout: cell(40, 178) },
        ], () => { paint(); fire(el); });
        txt(kit, fig, W / 2, 158, "▲ коробка   ·   запас ▼", 14, "middle", "sc-zone-label");
        const ids = [];
        const ball = (color, i, zone) => {
          const g = svg("g", { "aria-label": color === "red" ? "Красный шар" : "Синий шар" }, fig);
          svg("circle", { r: 19, fill: "transparent" }, g);
          svg("circle", { r: 15, class: `sc-${color}` }, g);
          svg("circle", { cx: -5, cy: -5, r: 4, class: "sc-cream", opacity: 0.6 }, g);
          const id = `${color}${i}`;
          ids.push({ id, zone });
          box.add(id, g, zone);
        };
        ["red", "blue"].forEach((c) => {
          for (let i = 0; i < t.start[c]; i++) ball(c, i, "box");
          for (let i = 0; i < t.pile[c]; i++) ball(c, t.start[c] + i, "pile");
        });
        const count = () => { const s = box.itemsIn("box"); return { red: s.filter((x) => x.startsWith("red")).length, blue: s.filter((x) => x.startsWith("blue")).length }; };
        const paint = () => { const c = count(); read.textContent = `в коробке: красных ${c.red} из ${c.red + c.blue}`; };
        paint();
        const putBack = () => ids.forEach(({ id, zone }) => box.place(id, zone));
        return {
          value: () => (ids.some(({ id, zone }) => box.zoneOf(id) !== zone) ? count() : null),
          lock(on) { lockAll(on); box.lock(on); },
          reveal() {
            putBack();
            const want = t.solution;
            ["red", "blue"].forEach((c) => {
              const all = ids.filter((x) => x.id.startsWith(c));
              all.forEach((x, i) => box.place(x.id, i < want[c] ? "box" : "pile"));
            });
            paint();
            answerLine(el, t.reveal || `Например, ${want.red} красных и ${want.blue} синих: ${want.red}/${want.red + want.blue} = ${t.target[0]}/${t.target[1]}`);
          },
          reset() { putBack(); paint(); lockAll(false); box.lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* ------------------------------------------------------------ sign-axis
     * The inequality video: the parabola y = a(x − r1)(x − r2) over the x axis. The pupil paints the parts of
     * the axis that solve the inequality: the three intervals and, for ≥ / ≤, the roots themselves.
     * task: { a, r1, r2, formula, solution: ["L", "r1", "M", "r2", "R" …] } — value: the painted parts. */
    "sign-axis": {
      wrong(t) {
        const all = ["L", "r1", "M", "r2", "R"], s = t.solution;
        const opp = all.filter((p) => !s.includes(p));
        const flip = s.some((p) => p[0] === "r") ? s.filter((p) => p[0] !== "r") : [...s, "r1", "r2"];
        return differ(t, IntScenes.kinds["sign-axis"].check, [opp, flip, s.filter((p) => p[0] === "r" || p === "M").length ? ["L", "R"] : ["M"]].filter((w) => w.length));
      },
      check: (t, v) => Array.isArray(v) && kitSameSet(v, t.solution),
      build(el, t, kit) {
        const { svg, stage, hint, celebrate, lockable, answerLine, toggleable, num, pop } = kit;
        const W = 360, H = 250, U = 26, CX = 180, up = t.a > 0;
        const AY = up ? 118 : 140;
        const X = (x) => CX + x * U;
        const f = (x) => t.a * (x - t.r1) * (x - t.r2);
        const depth = Math.abs(f((t.r1 + t.r2) / 2)) || 1, s = 82 / depth;
        hint(el, t.hint || "Нажимайте на части оси (и на корни), чтобы закрасить ответ");
        const fig = stage(el, W, H, `Парабола ${t.formula || ""} и ось x`);
        txt(kit, fig, 20, 30, t.formula || "", 17, "start");
        const pts = [];
        for (let x = -6.6; x <= 6.6; x += 0.1) {
          const y = AY - f(x) * s;
          if (y > 46 && y < H - 40) pts.push(`${X(x).toFixed(1)} ${y.toFixed(1)}`);
        }
        svg("path", { d: `M${pts.join(" L")}`, fill: "none", style: "stroke: var(--sc-blue); stroke-width: 4; stroke-linecap: round" }, fig);
        svg("line", { x1: 12, y1: AY, x2: W - 12, y2: AY, class: "sc-stroke" }, fig);
        svg("path", { d: `M${W - 20} ${AY - 6} L${W - 10} ${AY} L${W - 20} ${AY + 6}`, class: "sc-stroke" }, fig);
        txt(kit, fig, W - 14, AY - 12, "x", 15, "end");
        const on = new Set();
        const parts = {};
        const seg = (id, x1, x2, name) => {
          const g = svg("g", { class: "sc-tap", role: "checkbox", "aria-label": name }, fig);
          svg("rect", { x: x1, y: AY - 18, width: x2 - x1, height: 36, fill: "transparent" }, g);
          parts[id] = svg("rect", { x: x1 + 4, y: AY - 5, width: x2 - x1 - 8, height: 10, rx: 5, class: "sc-soft", opacity: 0.35 }, g);
          toggleable(g, () => tog(id, g));
        };
        seg("L", 12, X(t.r1), `Левее ${num(t.r1)}`);
        seg("M", X(t.r1), X(t.r2), `Между ${num(t.r1)} и ${num(t.r2)}`);
        seg("R", X(t.r2), W - 22, `Правее ${num(t.r2)}`);
        [["r1", t.r1], ["r2", t.r2]].forEach(([id, r]) => {
          const g = svg("g", { class: "sc-tap", role: "checkbox", "aria-label": `Точка ${num(r)}`, transform: `translate(${X(r)} ${AY})` }, fig);
          svg("circle", { r: 18, fill: "transparent" }, g);
          parts[id] = svg("circle", { r: 7, class: "sc-cream", style: "stroke: var(--sc-ink); stroke-width: 3" }, g);
          const out = (id === "r1") === up ? -1 : 1;
          txt(kit, fig, X(r) + out * 12, AY + 30, num(r), 16, out < 0 ? "end" : "start");
          toggleable(g, () => tog(id, g));
        });
        const out = txt(kit, fig, W / 2, H - 14, "", 17, "middle");
        function tog(id, g) { on.has(id) ? on.delete(id) : on.add(id); paint(); pop(g); fire(el); }
        function paint() {
          ["L", "M", "R"].forEach((id) => { parts[id].setAttribute("class", on.has(id) ? "sc-teal" : "sc-soft"); parts[id].setAttribute("opacity", on.has(id) ? 1 : 0.35); });
          ["r1", "r2"].forEach((id) => (parts[id].style.fill = on.has(id) ? "var(--sc-teal)" : ""));
          // the painted set in interval notation: runs of neighbouring parts
          const order = ["L", "r1", "M", "r2", "R"], val = { r1: num(t.r1), r2: num(t.r2) }, runs = [];
          let cur = null;
          order.forEach((p) => { if (on.has(p)) { if (!cur) runs.push((cur = [])); cur.push(p); } else cur = null; });
          out.textContent = runs.map((r) => {
            if (r.length === 1 && r[0][0] === "r") return `{${val[r[0]]}}`;
            const a = r[0], b = r[r.length - 1];
            const left = a === "L" ? "(−∞" : a === "M" ? `(${val.r1}` : a === "R" ? `(${val.r2}` : `[${val[a]}`;
            const right = b === "R" ? "+∞)" : b === "M" ? `${val.r2})` : b === "L" ? `${val.r1})` : `${val[b]}]`;
            return `${left}; ${right}`;
          }).join(" ∪ ");
        }
        paint();
        const lock = lockable(el);
        return {
          value: () => (on.size ? ["L", "r1", "M", "r2", "R"].filter((p) => on.has(p)) : null),
          lock,
          reveal() { on.clear(); t.solution.forEach((p) => on.add(p)); paint(); answerLine(el, t.reveal || `Ответ: ${out.textContent}`); },
          reset() { on.clear(); paint(); lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* ------------------------------------------------------------ cell-split
     * The bacteria from the geometric-progression video: tap the dish and every cell splits into q; the cards
     * b₁, b₂, … fill in. The dish fills up after a few splits, so bₙ is found by the formula and typed.
     * task: { b1, q, n, solution } — value: the number typed. */
    "cell-split": {
      wrong: (t) => differ(t, IntScenes.kinds["cell-split"].check, [t.b1 * t.q ** t.n, t.b1 * t.q ** (t.n - 2), t.b1 + t.q * (t.n - 1), t.b1 * t.q * t.n]),
      check: (t, v) => isInt(v) && v === t.solution,
      build(el, t, kit) {
        const { svg, stage, hint, celebrate, controls, numberField, lockable, answerLine, toggleable, pop } = kit;
        const W = 360, H = 266, DX = 112, DY = 128, DR = 96;
        hint(el, t.hint || "Нажмите на чашку — клетки разделятся. Потом впишите ответ");
        const fig = stage(el, W, H, "Чашка с делящимися клетками");
        const dish = svg("g", { class: "sc-tap", role: "button", "aria-label": "Разделить клетки" }, fig);
        svg("circle", { cx: DX, cy: DY, r: DR + 6, class: "sc-soft", opacity: 0.4 }, dish);
        svg("circle", { cx: DX, cy: DY, r: DR, class: "sc-cream" }, dish);
        const cells = svg("g", { "pointer-events": "none" }, dish);
        let gen = 1;
        let maxGen = 1;
        while (maxGen < t.n - 1 && maxGen < 4 && t.b1 * t.q ** maxGen <= 60) maxGen++;
        const cards = svg("g", {}, fig);
        const note = txt(kit, fig, W / 2, H - 10, "", 14, "middle", "sc-zone-label");
        function draw(animate) {
          const N = t.b1 * t.q ** (gen - 1), r = Math.max(5, Math.min(17, 50 / Math.sqrt(N)));
          cells.textContent = "";
          for (let i = 0; i < N; i++) {
            const rr = (DR - r - 4) * Math.sqrt((i + 0.5) / N), a = i * 2.39996;
            const g = svg("g", { transform: `translate(${(DX + Math.cos(a) * rr).toFixed(1)} ${(DY + Math.sin(a) * rr).toFixed(1)})` }, cells);
            svg("circle", { r, class: "sc-teal" }, g);
            svg("circle", { r: r * 0.35, cx: r * 0.2, cy: -r * 0.2, class: "sc-cream", opacity: 0.8 }, g);
            if (animate) pop(g);
          }
          cards.textContent = "";
          const rows = [];
          for (let i = 1; i <= gen; i++) rows.push([`b${subs(i)} = ${big(t.b1 * t.q ** (i - 1))}`, "sc-name"]);
          rows.push(["…", "sc-zone-label"], [`b${subs(t.n)} = ?`, "sc-name"]);
          rows.forEach(([s, c], i) => txt(kit, cards, 236, 50 + i * 30, s, 18, "start", c));
          txt(kit, cards, 236, 24, `q = ${t.q}`, 16, "start", "sc-zone-label");
          note.textContent = gen >= maxGen ? "чашка полна — дальше по формуле" : "";
        }
        toggleable(dish, () => { if (gen < maxGen) { gen++; draw(true); } });
        draw(false);
        const row = controls(el);
        let val = null;
        const field = numberField(row, `b${subs(t.n)}`, { min: 0, max: 1e9 }, (v) => { val = v; fire(el); });
        const lock = lockable(el);
        return {
          value: () => val,
          lock,
          reveal() {
            val = t.solution; field.set(val); gen = maxGen; draw(false);
            answerLine(el, t.reveal || `b${subs(t.n)} = ${t.b1} · ${t.q}${String(t.n - 1).replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[d])} = ${big(t.solution)}`);
          },
          reset() { val = null; field.set(null); gen = 1; draw(false); lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* ------------------------------------------------------------- cos-hinge
     * The triangle from the cosine-law video as two sticks on a hinge: the pupil swings stick b to the given
     * angle (drag its end or the slider, 15° steps), then types the third side from c² = a² + b² − 2ab·cos C.
     * task: { a, b, angle, solution: { angle, c } } — value { angle, c }. */
    "cos-hinge": {
      wrong: (t) => differ(t, IntScenes.kinds["cos-hinge"].check, [
        { angle: t.angle, c: t.a + t.b },
        { angle: t.angle, c: Math.abs(t.b - t.a) },
        { angle: 180 - t.angle, c: t.solution.c },
        { angle: t.angle, c: t.solution.c + 1 },
      ]),
      check: (t, v) => Boolean(v) && v.angle === t.solution.angle && v.c === t.solution.c,
      build(el, t, kit) {
        const { svg, stage, hint, celebrate, controls, numberField, slider, lockable, answerLine, drag, num } = kit;
        const W = 360, H = 250, HX = 180, HY = 212, U = 156 / Math.max(t.a, t.b);
        hint(el, t.hint || "Поверните палочку (тяните её конец или ползунок), потом впишите третью сторону");
        const fig = stage(el, W, H, "Две палочки на шарнире и третья сторона");
        const read = txt(kit, fig, W / 2, 28, "", 17, "middle");
        const third = svg("line", { style: "stroke: var(--sc-red); stroke-width: 4; stroke-dasharray: 9 7; stroke-linecap: round" }, fig);
        const q = txt(kit, fig, 0, 0, "?", 20, "middle");
        svg("line", { x1: HX, y1: HY, x2: HX + t.a * U, y2: HY, style: "stroke: var(--sc-teal); stroke-width: 9; stroke-linecap: round" }, fig);
        txt(kit, fig, HX + (t.a * U) / 2, HY + 26, String(t.a), 17, "middle");
        const stick = svg("line", { x1: HX, y1: HY, style: "stroke: var(--sc-gold); stroke-width: 9; stroke-linecap: round" }, fig);
        const bl = txt(kit, fig, 0, 0, String(t.b), 17, "middle");
        const arc = svg("path", { fill: "none", style: "stroke: var(--sc-ink); stroke-width: 2.5" }, fig);
        svg("circle", { cx: HX, cy: HY, r: 7, class: "sc-ink" }, fig);
        const end = svg("g", { class: "sc-tap", role: "button", "aria-label": "Конец палочки" }, fig);
        svg("circle", { r: 20, fill: "transparent" }, end);
        svg("circle", { r: 9, class: "sc-red" }, end);
        let ang = 30, touched = false, c = null;
        const row = controls(el);
        const range = slider(row, "Угол", 15, 165, 15, (v) => set(v));
        const field = numberField(row, "Третья сторона", { min: 0, max: 999 }, (v) => { c = v; fire(el); });
        function draw() {
          const r = (ang * Math.PI) / 180, ex = HX + Math.cos(r) * t.b * U, ey = HY - Math.sin(r) * t.b * U;
          stick.setAttribute("x2", ex); stick.setAttribute("y2", ey);
          end.setAttribute("transform", `translate(${ex} ${ey})`);
          bl.setAttribute("x", HX + Math.cos(r) * t.b * U * 0.5 - Math.sin(r) * 18);
          bl.setAttribute("y", HY - Math.sin(r) * t.b * U * 0.5 - Math.cos(r) * 18 + 6);
          third.setAttribute("x1", ex); third.setAttribute("y1", ey); third.setAttribute("x2", HX + t.a * U); third.setAttribute("y2", HY);
          q.setAttribute("x", (ex + HX + t.a * U) / 2 + 14); q.setAttribute("y", (ey + HY) / 2 - 6);
          arc.setAttribute("d", `M${HX + 30} ${HY} A30 30 0 0 0 ${HX + Math.cos(r) * 30} ${HY - Math.sin(r) * 30}`);
          const cs = Math.round(Math.cos(r) * 100) / 100;
          read.textContent = `C = ${ang}° · cos C ${[0, 60, 90, 120, 180].includes(ang) ? "=" : "≈"} ${num(Object.is(cs, -0) ? 0 : cs)}`;
          range.value = ang;
        }
        function set(v) { ang = Math.min(165, Math.max(15, Math.round(v / 15) * 15)); touched = true; draw(); fire(el); }
        drag(end, fig, (p) => p.y < HY + 10 && set((Math.atan2(HY - p.y, p.x - HX) * 180) / Math.PI));
        draw();
        const lock = lockable(el);
        return {
          value: () => (touched || c !== null ? { angle: touched ? ang : null, c } : null),
          lock,
          reveal() {
            ang = t.solution.angle; touched = true; c = t.solution.c; field.set(c); draw();
            answerLine(el, t.reveal || `c² = ${t.a}² + ${t.b}² − 2 · ${t.a} · ${t.b} · cos ${t.angle}° = ${t.solution.c * t.solution.c}, c = ${t.solution.c}`);
          },
          reset() { ang = 30; touched = false; c = null; field.set(null); draw(); lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },
  });

  function kitSameSet(a, b) {
    return IntScenes.kit.sameSet(a, b);
  }
})();
