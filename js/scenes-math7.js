/* Scenes for grade 7 math (see js/scenes.js). Extra styles: the .sc-m7-* classes. */
(function () {
  const IntScenes = typeof window !== "undefined" ? window.IntScenes : require("./scenes.js");
  const changed = (el) => el.dispatchEvent(new Event("change", { bubbles: true }));
  // 2–4 distinct wrong numbers from a list of typical mistakes
  const wrongNums = (sol, list, lo = -1e9, hi = 1e9) => [...new Set(list)].filter((x) => x !== sol && Number.isFinite(x) && x >= lo && x <= hi).slice(0, 4);
  const sp = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  IntScenes.add({
    /* ------------------------------------------------------------ piggy-race
     * Two piggy banks from the equations video: one starts with more, the other grows faster. The slider
     * picks the week; coins drop in and the jars fill. task: { banks: [{ name, start, add, color }] ×2, max,
     * solution: week } — value: the week (the only week the amounts are equal). */
    "piggy-race": {
      wrong: (t) => {
        const [a, b] = t.banks;
        return wrongNums(t.solution, [t.solution - 1, t.solution + 1, Math.round(Math.abs(b.start - a.start) / Math.max(a.add, b.add))], 0, t.max);
      },
      check: (t, v) => Number.isInteger(v) && v === t.solution,
      build(el, t, kit) {
        const { svg, label, stage, hint, celebrate, controls, slider, lockable, answerLine, art, motion } = kit;
        const TOP = 52, BASE = 196, top = Math.max(...t.banks.map((b) => b.start + b.add * t.max));
        hint(el, t.hint || "Двигайте ползунок недель и следите за копилками");
        const fig = stage(el, 360, 250, "Две копилки");
        const jars = t.banks.map((b, i) => {
          const x = i ? 280 : 80;
          svg("rect", { x: x - 40, y: TOP, width: 80, height: BASE - TOP, rx: 12, class: "sc-cream" }, fig);
          const fill = svg("rect", { x: x - 40, y: BASE, width: 80, height: 0, rx: 12, class: `sc-${b.color}` }, fig);
          svg("rect", { x: x - 40, y: TOP, width: 80, height: BASE - TOP, rx: 12, class: "sc-stroke" }, fig);
          svg("rect", { x: x - 14, y: TOP - 4, width: 28, height: 8, rx: 4, class: "sc-ink" }, fig);
          const sum = label(fig, x, TOP - 14, "", "sc-m7-b");
          label(fig, x, BASE + 22, b.name, "sc-m7-t");
          label(fig, x, BASE + 42, `+${b.add} ₽ в неделю`, "sc-m7-s");
          return { x, fill, sum, b };
        });
        label(fig, 180, 80, "неделя", "sc-m7-t");
        const weekT = label(fig, 180, 116, "0", "sc-m7-xl");
        const sign = label(fig, 180, 168, "", "sc-m7-xl");
        let week = null;
        function draw(w, drop) {
          const amt = jars.map((j) => j.b.start + j.b.add * w);
          jars.forEach((j, i) => {
            const h = ((BASE - TOP - 8) * amt[i]) / top;
            j.fill.setAttribute("y", BASE - h);
            j.fill.setAttribute("height", h);
            j.sum.textContent = `${sp(amt[i])} ₽`;
            if (drop && motion()) {
              const c = art.coin(fig, "₽", 0.8);
              c.animate([{ transform: `translate(${j.x}px, ${TOP - 30}px)` }, { transform: `translate(${j.x}px, ${BASE - h}px)`, opacity: 0.2 }], { duration: 420, easing: "ease-in" });
              setTimeout(() => c.remove(), 400);
            }
          });
          weekT.textContent = w;
          sign.textContent = amt[0] === amt[1] ? "=" : amt[0] < amt[1] ? "<" : ">";
          sign.setAttribute("class", `sc-m7-xl ${amt[0] === amt[1] ? "sc-m7-ok" : ""}`);
        }
        const input = slider(controls(el), "Неделя", 0, t.max, 1, (w) => { week = w; draw(w, true); changed(el); });
        draw(0);
        const lock = lockable(el);
        return {
          value: () => week,
          lock,
          reveal() {
            input.value = week = t.solution;
            draw(t.solution);
            const [a, b] = t.banks;
            answerLine(el, t.reveal || `Неделя ${t.solution}: ${sp(a.start)} + ${a.add} · ${t.solution} = ${sp(b.start)} + ${b.add} · ${t.solution} = ${sp(a.start + a.add * t.solution)} ₽`);
          },
          reset() { input.value = 0; week = null; draw(0); lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* --------------------------------------------------------- triangle-tear
     * The rigid triangle from the triangles video: tap corners A and B to tear them off onto the straight
     * line, then set the slider so corner C fills the rest of the straight angle.
     * task: { a, b, solution: c } — value: angle C in degrees. */
    "triangle-tear": {
      wrong: (t) => wrongNums(t.solution, [180 - t.a, t.a + t.b, t.solution + 10, t.solution - 10], 5, 180),
      check: (t, v) => Number.isFinite(v) && v === t.solution,
      build(el, t, kit) {
        const { svg, label, stage, hint, celebrate, controls, slider, lockable, answerLine, toggleable, pop } = kit;
        const rad = (d) => (d * Math.PI) / 180;
        hint(el, t.hint || "Нажмите на углы A и B — они оторвутся и лягут на прямую. Затем ползунком подберите угол C");
        const fig = stage(el, 360, 260, "Треугольник, углы которого кладут на прямую");
        // the triangle, scaled to fit x 24..250, y 22..140
        const ta = Math.tan(rad(t.a)), tb = Math.tan(rad(t.b));
        const cx = tb / (ta + tb), cy = (ta * tb) / (ta + tb);
        const minX = Math.min(0, cx), maxX = Math.max(1, cx);
        const s = Math.min(226 / (maxX - minX), 104 / cy);
        const P = (x, y) => [24 + (x - minX) * s + (226 - (maxX - minX) * s) / 2, 140 - y * s];
        const A = P(0, 0), B = P(1, 0), C = P(cx, cy);
        svg("path", { d: `M${A} L${B} L${C} Z`, class: "sc-cream" }, fig);
        const ang = (p, q) => Math.atan2(-(q[1] - p[1]), q[0] - p[0]) * 180 / Math.PI; // math angle of ray p→q
        const wedge = (cx0, cy0, r, from, to) => {
          const p = (d) => `${cx0 + r * Math.cos(rad(d))} ${cy0 - r * Math.sin(rad(d))}`;
          return `M${cx0} ${cy0} L${p(from)} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 0 ${p(to)} Z`;
        };
        const norm = (d) => ((d % 360) + 360) % 360;
        const corners = [[A, B, C, "A", "teal"], [B, C, A, "B", "gold"], [C, A, B, "C", "red"]].map(([p, q, r, name, color]) => {
          let f = norm(ang(p, q)), g2 = norm(ang(p, r));
          if (norm(g2 - f) > 180) [f, g2] = [g2, f];
          const w = svg("path", { d: wedge(p[0], p[1], 24, f, f + norm(g2 - f)), class: `sc-${color}` }, fig);
          const u = (z) => { const l = Math.hypot(z[0] - p[0], z[1] - p[1]); return [(z[0] - p[0]) / l, (z[1] - p[1]) / l]; };
          const [uq, ur] = [u(q), u(r)], m = Math.hypot(uq[0] + ur[0], uq[1] + ur[1]) || 1;
          const out = [p[0] - ((uq[0] + ur[0]) / m) * 16, p[1] - ((uq[1] + ur[1]) / m) * 16 + 6];
          label(fig, out[0], out[1], name, "sc-m7-t");
          return w;
        });
        svg("path", { d: `M${A} L${B} L${C} Z`, class: "sc-stroke" }, fig);
        [["∠A", `${t.a}°`], ["∠B", `${t.b}°`], ["∠C", "?"]].forEach(([n, v], i) => label(fig, 270, 52 + i * 30, `${n} = ${v}`, "sc-m7-t", "start"));
        // the straight line with the torn corners
        const LX = 180, LY = 224, R = 62;
        svg("line", { x1: 80, y1: LY, x2: 280, y2: LY, class: "sc-m7-line" }, fig);
        const onLine = ["teal", "gold", "red"].map((c) => svg("path", { d: "", class: `sc-${c}` }, fig));
        svg("circle", { cx: LX, cy: LY, r: 4, class: "sc-ink" }, fig);
        const sumT = label(fig, 340, LY - 8, "", "sc-m7-t", "end");
        const torn = [false, false];
        let c = null;
        corners.slice(0, 2).forEach((w, i) => {
          const v = i ? B : A;
          const hit = svg("circle", { cx: v[0], cy: v[1], r: 20, fill: "transparent", class: "sc-tap", role: "button", "aria-label": `Оторвать угол ${"AB"[i]}` }, fig);
          toggleable(hit, () => { torn[i] = true; draw(); pop(onLine[i]); });
        });
        function draw() {
          const parts = [torn[0] && t.a, torn[1] && t.b, c !== null && c];
          let at = 180;
          parts.forEach((d, i) => {
            onLine[i].setAttribute("d", d ? wedge(LX, LY, R, at - d, at) : "");
            if (d) at -= d;
            if (i < 2) corners[i].classList.toggle("sc-m7-dim", torn[i]);
          });
          const full = parts.every(Boolean) && t.a + t.b + c === 180;
          sumT.textContent = full ? "180°" : "";
          sumT.setAttribute("class", "sc-m7-t sc-m7-ok");
        }
        const input = slider(controls(el), "∠C", 0, 180 - t.a - t.b + 30, 5, (v) => {
          c = v; torn[0] = torn[1] = true; draw(); changed(el);
        });
        const lock = lockable(el);
        return {
          value: () => c,
          lock,
          reveal() {
            torn[0] = torn[1] = true;
            input.value = c = t.solution;
            draw();
            answerLine(el, t.reveal || `∠C = 180° − ${t.a}° − ${t.b}° = ${t.solution}°`);
          },
          reset() { torn[0] = torn[1] = false; c = null; input.value = 0; draw(); lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* ----------------------------------------------------------- square-tiles
     * The (a + b)² square from the formulas video: drag the four coloured tiles (a², ab, ab, b²) into the
     * big square. task: { labels: { a2, ab, b2 }, sides: { a, b }, result } — value: { tl, tr, bl, br } tile
     * ids ("a2", "abv", "abh", "b2"; null for an empty place). */
    "square-tiles": {
      wrong: () => [
        { tl: "b2", tr: "abv", bl: "abh", br: "a2" },
        { tl: "a2", tr: "abh", bl: "abv", br: "b2" },
        { tl: "a2", tr: null, bl: null, br: "b2" },
      ],
      check: (t, v) => Boolean(v) && v.tl === "a2" && v.tr === "abv" && v.bl === "abh" && v.br === "b2",
      build(el, t, kit) {
        const { svg, label, stage, hint, celebrate, dnd, lockable, answerLine } = kit;
        const A = 90, B = 40, X = 40, Y = 52, L = t.labels;
        hint(el, t.hint || "Перетащите плитки в большой квадрат (или нажмите на плитку, затем на место)");
        const fig = stage(el, 360, 250, "Квадрат со стороной a + b и четыре плитки");
        label(fig, X + A / 2, Y - 10, t.sides.a, "sc-m7-t");
        label(fig, X + A + B / 2, Y - 10, t.sides.b, "sc-m7-t");
        label(fig, X - 6, Y + A / 2 + 6, t.sides.a, "sc-m7-t", "end");
        label(fig, X - 6, Y + A + B / 2 + 6, t.sides.b, "sc-m7-t", "end");
        const tiles = { a2: [A, A, "teal", L.a2], abv: [B, A, "red", L.ab], abh: [A, B, "red", L.ab], b2: [B, B, "gold", L.b2] };
        const homes = { a2: [200, 20, 96, 96], abv: [306, 20, 46, 96], abh: [200, 130, 96, 46], b2: [306, 130, 46, 46] };
        const slots = { tl: [X, Y, A, A], tr: [X + A, Y, B, A], bl: [X, Y + A, A, B], br: [X + A, Y + A, B, B] };
        const zone = (id, [x, y, w, h], lab) => ({ id, x, y, w, h, label: lab, hideLabel: true, layout: () => [x + w / 2, y + h / 2] });
        const d = dnd(fig, [
          ...Object.entries(slots).map(([id, r]) => zone(id, r, "Место в большом квадрате")),
          ...Object.entries(homes).map(([id, r]) => zone(`home-${id}`, r, "Полка с плитками")),
        ], (state, id, z) => {
          if (z.startsWith("home-") && z !== `home-${id}`) d.place(id, `home-${id}`);
          if (slots[z]) d.itemsIn(z).filter((o) => o !== id).forEach((o) => d.place(o, `home-${o}`));
          paint();
          changed(el);
        });
        svg("rect", { x: X, y: Y, width: A + B, height: A + B, class: "sc-stroke" }, fig);
        Object.entries(tiles).forEach(([id, [w, h, color, text]]) => {
          const n = svg("g", { "aria-label": `Плитка ${text}` });
          svg("rect", { x: -w / 2 + 1, y: -h / 2 + 1, width: w - 2, height: h - 2, rx: 3, class: `sc-${color}` }, n);
          label(n, 0, 6, text, `${text.length > 3 || (w < 50 && text.length > 2) ? "sc-m7-s" : "sc-m7-t"} ${color === "gold" ? "sc-m7-dark" : "sc-m7-on"}`);
          d.add(id, n, `home-${id}`);
        });
        const sumT = label(fig, 180, 228, "", "sc-m7-t");
        const at = () => Object.fromEntries(Object.keys(slots).map((s) => [s, d.itemsIn(s)[0] || null]));
        function paint() {
          const v = at();
          const ok = IntScenes.kinds["square-tiles"].check(t, v);
          sumT.textContent = ok ? t.result : `(${t.sides.a} + ${t.sides.b})² = ` + Object.values(v).map((id) => (id ? tiles[id][3] : "?")).join(" + ");
        }
        paint();
        const home = () => Object.keys(tiles).forEach((id) => d.place(id, `home-${id}`));
        const lockEl = lockable(el);
        return {
          value: () => (Object.values(at()).some(Boolean) ? at() : null),
          lock(on) { lockEl(on); d.lock(on); },
          reveal() {
            [["a2", "tl"], ["abv", "tr"], ["abh", "bl"], ["b2", "br"]].forEach(([id, s]) => d.place(id, s));
            paint();
            answerLine(el, t.reveal || t.result);
          },
          reset() { home(); paint(); lockEl(false); d.lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* ------------------------------------------------------------- paper-fold
     * The sheet from the powers video: every fold halves the sheet and doubles the layers (side view on the
     * right). task: { layers, max, solution: folds } — value: the number of folds. */
    "paper-fold": {
      wrong: (t) => wrongNums(t.solution, [t.solution - 1, t.solution + 1, t.layers / 2, t.solution - 2], 0, t.max),
      check: (t, v) => Number.isInteger(v) && v === t.solution,
      build(el, t, kit) {
        const { svg, label, stage, hint, celebrate, controls, stepper, lockable, answerLine, toggleable, pop } = kit;
        hint(el, t.hint || "Нажимайте на лист (или на +), чтобы сложить его пополам ещё раз");
        const fig = stage(el, 360, 270, "Лист бумаги, который складывают пополам");
        const SX = 22, SY = 52, SW = 170, SH = 150;
        svg("rect", { x: SX, y: SY, width: SW, height: SH, rx: 4, class: "sc-m7-dash" }, fig);
        const sheet = svg("rect", { x: SX, y: SY, width: SW, height: SH, rx: 3, class: "sc-cream" }, fig);
        const crease = svg("line", { class: "sc-m7-dash" }, fig);
        const hit = svg("rect", { x: SX, y: SY, width: SW, height: SH, fill: "transparent", class: "sc-tap", role: "button", "aria-label": "Сложить лист ещё раз" }, fig);
        const stack = svg("g", {}, fig);
        label(fig, 280, 254, "лист сбоку", "sc-m7-s");
        const foldT = label(fig, SX, 34, "", "sc-m7-t", "start");
        const layT = label(fig, 180, 228, "", "sc-m7-t");
        let k = 0, touched = false;
        function draw() {
          const w = SW / 2 ** Math.ceil(k / 2), h = SH / 2 ** Math.floor(k / 2);
          sheet.setAttribute("width", w);
          sheet.setAttribute("height", h);
          crease.setAttribute("x1", k % 2 ? SX : SX + w / 2); crease.setAttribute("x2", k % 2 ? SX + w : SX + w / 2);
          crease.setAttribute("y1", k % 2 ? SY + h / 2 : SY); crease.setAttribute("y2", k % 2 ? SY + h / 2 : SY + h);
          crease.style.display = k < 6 ? "" : "none";
          const n = 2 ** k, hh = Math.max(6, n * 0.7), bottom = 236 - 24;
          stack.textContent = "";
          svg("rect", { x: 230, y: bottom - hh, width: 100, height: hh, rx: 2, class: "sc-cream" }, stack);
          const gap = Math.max(3, hh / n);
          for (let y = bottom - gap; y > bottom - hh + 1; y -= gap) svg("line", { x1: 230, x2: 330, y1: y, y2: y, class: "sc-m7-layer" }, stack);
          svg("rect", { x: 230, y: bottom - hh, width: 100, height: hh, rx: 2, class: "sc-stroke" }, stack);
          foldT.textContent = `сгибов: ${k}`;
          layT.textContent = k ? `слоёв: ${Array(k).fill(2).join(" · ")}` : "слоёв: 1";
        }
        function set(v, user) {
          k = Math.max(0, Math.min(t.max, v));
          knob.set(k);
          draw();
          if (user) { touched = true; pop(sheet); changed(el); }
        }
        const knob = stepper(controls(el), "Сгибов", 0, t.max, (v) => set(v, true));
        toggleable(hit, () => set(k + 1, true));
        set(0);
        const lock = lockable(el);
        return {
          value: () => (touched ? k : null),
          lock,
          reveal() {
            set(t.solution);
            answerLine(el, t.reveal || `${sp(t.layers)} = 2${String(t.solution).replace(/\d/g, (c) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[c])}: нужно ${t.solution} сгибов`);
          },
          reset() { set(0); touched = false; lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* ------------------------------------------------------------- taxi-meter
     * The taxi from the linear function video: drag the taxi along the road (or tap a km mark); the meter
     * shows y = kx + b with x put in. task: { k, b, money, max, solution: km } — value: km driven. */
    "taxi-meter": {
      wrong: (t) => wrongNums(t.solution, [t.solution - 1, t.solution + 1, Math.round(t.money / t.k)], 0, t.max),
      check: (t, v) => Number.isInteger(v) && v === t.solution,
      build(el, t, kit) {
        const { svg, label, stage, hint, celebrate, lockable, answerLine, drag, pop } = kit;
        const X0 = 26, STEP = 308 / t.max, RY = 158;
        hint(el, t.hint || "Тяните такси по дороге или нажмите на отметку километров");
        const fig = stage(el, 360, 236, "Такси на дороге и счётчик");
        svg("rect", { x: 60, y: 14, width: 240, height: 80, rx: 14, class: "sc-ink" }, fig);
        label(fig, 180, 44, `y = ${t.k}x + ${t.b}`, "sc-m7-t sc-m7-on");
        const meter = label(fig, 180, 76, "", "sc-m7-m sc-m7-on");
        svg("line", { x1: 0, y1: RY, x2: 360, y2: RY, class: "sc-m7-road" }, fig);
        svg("line", { x1: 0, y1: RY, x2: 360, y2: RY, class: "sc-m7-lane" }, fig);
        for (let i = 0; i <= t.max; i++) {
          const x = X0 + i * STEP;
          svg("line", { x1: x, y1: RY + 20, x2: x, y2: RY + 28, class: "sc-m7-line" }, fig);
          label(fig, x, RY + 46, i, "sc-m7-s");
        }
        label(fig, 334, RY + 66, "x, км", "sc-m7-s", "end");
        const car = svg("g", { class: "sc-m7-grab", tabindex: 0, role: "slider", "aria-label": "Такси: сколько километров проехали" }, fig);
        const body = svg("g", {}, car);
        svg("rect", { x: -26, y: -16, width: 52, height: 17, rx: 6, class: "sc-gold" }, body);
        svg("path", { d: "M-15 -16 L-9 -30 L10 -30 L17 -16 Z", class: "sc-gold" }, body);
        svg("path", { d: "M-11 -17 L-7 -27 L-1 -27 L-1 -17 Z M2 -17 L2 -27 L8 -27 L12 -17 Z", class: "sc-cream" }, body);
        svg("rect", { x: -6, y: -36, width: 12, height: 6, rx: 2, class: "sc-ink" }, body);
        svg("circle", { cx: -15, cy: 2, r: 6, class: "sc-ink" }, body);
        svg("circle", { cx: 15, cy: 2, r: 6, class: "sc-ink" }, body);
        svg("path", { d: "M-6 12 L6 12 L0 20 Z", class: "sc-red" }, car);
        let x = 0, touched = false;
        function set(v, user) {
          const nx = Math.max(0, Math.min(t.max, Math.round(v)));
          if (user && nx !== x) pop(body);
          x = nx;
          car.setAttribute("transform", `translate(${X0 + x * STEP} ${RY})`);
          car.setAttribute("aria-valuenow", x);
          meter.textContent = `${t.k} · ${x} + ${t.b} = ?`;
          if (user) { touched = true; changed(el); }
        }
        drag(car, fig, (p) => !el.classList.contains("is-locked") && set((p.x - X0) / STEP, true));
        car.addEventListener("keydown", (e) => {
          const d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
          if (d) { e.preventDefault(); set(x + d, true); }
        });
        set(0);
        const lock = lockable(el);
        return {
          value: () => (touched ? x : null),
          lock,
          reveal() {
            set(t.solution);
            meter.textContent = `${t.k} · ${t.solution} + ${t.b} = ${t.k * t.solution + t.b}`;
            answerLine(el, t.reveal || `${t.k}x + ${t.b} = ${t.money}, ${t.k}x = ${t.money - t.b}, x = ${t.solution} км`);
          },
          reset() { set(0); touched = false; lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* -------------------------------------------------------------- area-merge
     * The area model from the common factor video: two rectangles of the same height h; slide the right one
     * onto the left (drag or tap) to get one h × (a + b) rectangle, then type the sum.
     * task: { h, a, b, solution: h·(a + b) } — value: the typed number. */
    "area-merge": {
      wrong: (t) => wrongNums(t.solution, [t.h * t.a + t.b, t.h * (t.a + t.b) - t.h, t.h * t.a + t.h, t.solution * 10]),
      check: (t, v) => Number.isFinite(v) && v === t.solution,
      build(el, t, kit) {
        const { svg, label, stage, hint, celebrate, controls, numberField, lockable, answerLine, pointer, pop } = kit;
        const X0 = 34, Y = 72, H = 90, S = 280 / (t.a + t.b), GAP = 30, AW = t.a * S, BW = t.b * S;
        hint(el, t.hint || "Сдвиньте правый прямоугольник к левому (перетащите или нажмите), затем впишите ответ");
        const fig = stage(el, 360, 240, "Два прямоугольника одной высоты");
        svg("rect", { x: X0, y: Y, width: AW, height: H, class: "sc-teal" }, fig);
        label(fig, X0 - 16, Y + H / 2 + 6, t.h, "sc-m7-t");
        label(fig, X0 + AW / 2, Y - 10, t.a, "sc-m7-t");
        const at = label(fig, 0, 0, `${t.h} · ${t.a}`, "sc-m7-s sc-m7-on");
        at.setAttribute("transform", `translate(${X0 + AW / 2 + 5} ${Y + H / 2}) rotate(-90)`);
        const bG = svg("g", { class: "sc-m7-grab", tabindex: 0, role: "button", "aria-label": "Сдвинуть правый прямоугольник" }, fig);
        const bx = X0 + AW + GAP;
        svg("rect", { x: bx, y: Y, width: BW, height: H, class: "sc-gold" }, bG);
        const bH = label(bG, bx - 15, Y + H / 2 + 6, t.h, "sc-m7-t");
        label(bG, bx + BW / 2, Y - 10, t.b, "sc-m7-t");
        label(bG, bx + BW / 2, Y + H / 2 + 6, `${t.h} · ${t.b}`, "sc-m7-t sc-m7-dark");
        const brace = svg("path", { d: `M${X0} ${Y - 30} L${X0} ${Y - 36} L${X0 + AW + BW} ${Y - 36} L${X0 + AW + BW} ${Y - 30}`, class: "sc-m7-line" }, fig);
        const braceT = label(fig, X0 + (AW + BW) / 2, Y - 44, `${t.a} + ${t.b} = ${t.a + t.b}`, "sc-m7-t");
        const eq = label(fig, 180, 205, "", "sc-m7-m");
        let off = GAP, joined = false, val = null, start = null;
        function move(o, snap) {
          off = Math.max(0, Math.min(GAP, o));
          if (snap) { off = off < GAP / 2 ? 0 : GAP; joined = off === 0; pop(bG); }
          bG.setAttribute("transform", `translate(${off - GAP} 0)`);
          bH.style.display = off < 16 ? "none" : "";
          [brace, braceT].forEach((n) => (n.style.display = joined ? "" : "none"));
          eq.textContent = joined ? `${t.h} · ${t.a} + ${t.h} · ${t.b} = ${t.h} · ${t.a + t.b}` : `${t.h} · ${t.a} + ${t.h} · ${t.b} = ?`;
        }
        bG.addEventListener("pointerdown", (e) => {
          if (el.classList.contains("is-locked")) return;
          bG.setPointerCapture?.(e.pointerId);
          start = { x: pointer(fig, e).x, off, moved: false };
        });
        bG.addEventListener("pointermove", (e) => {
          if (!start) return;
          const dx = pointer(fig, e).x - start.x;
          if (Math.abs(dx) > 4) start.moved = true;
          if (start.moved) move(start.off + dx);
        });
        const end = () => { if (!start) return; const s = start; start = null; move(s.moved ? off : joined ? GAP : 0, true); };
        bG.addEventListener("pointerup", end);
        bG.addEventListener("pointercancel", end);
        bG.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); move(joined ? GAP : 0, true); } });
        const field = numberField(controls(el), "Сумма", { buttons: false, min: 0, max: 1e7 }, (v) => { val = v; changed(el); });
        move(GAP);
        const lock = lockable(el);
        return {
          value: () => val,
          lock,
          reveal() {
            move(0, true);
            field.set((val = t.solution));
            answerLine(el, t.reveal || `${t.h} · ${t.a} + ${t.h} · ${t.b} = ${t.h} · (${t.a} + ${t.b}) = ${t.h} · ${t.a + t.b} = ${sp(t.solution)}`);
          },
          reset() { joined = false; move(GAP); field.set((val = null)); lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* --------------------------------------------------------------- rail-turn
     * The rails and the road from the parallel lines video: the top rail is fixed, the road crosses it at α.
     * Turn the bottom rail (buttons, keyboard or drag its knob) until the rails are parallel.
     * task: { alpha, start, solution: 180 − alpha } — value: the co-interior angle at the bottom rail. */
    "rail-turn": {
      wrong: (t) => wrongNums(t.solution, [t.alpha, t.solution + 10, t.solution - 10, 90]),
      check: (t, v) => Number.isFinite(v) && v === t.solution,
      build(el, t, kit) {
        const { svg, label, stage, hint, celebrate, controls, lockable, answerLine, drag } = kit;
        const rad = (d) => (d * Math.PI) / 180, al = t.alpha, lo = t.solution - 30, hi = t.solution + 30;
        hint(el, t.hint || "Поворачивайте нижний рельс кнопками или тяните за кружок");
        const fig = stage(el, 360, 250, "Два рельса и дорога, которая их пересекает");
        const clip = svg("clipPath", { id: `m7clip${Math.random().toString(36).slice(2, 7)}` }, svg("defs", {}, fig));
        svg("rect", { x: 0, y: 0, width: 360, height: 250, rx: 14 }, clip);
        const scene = svg("g", { "clip-path": `url(#${clip.id})` }, fig);
        const P1 = [Math.max(90, 170 - 52 / Math.tan(rad(al))), 70], d = 120 / Math.sin(rad(al));
        const P2 = [P1[0] + d * Math.cos(rad(al)), P1[1] + 120];
        const dir = (p, a, r) => [p[0] + r * Math.cos(rad(a)), p[1] + r * Math.sin(rad(a))];
        svg("line", { x1: dir(P1, al, -200)[0], y1: dir(P1, al, -200)[1], x2: dir(P1, al, 300)[0], y2: dir(P1, al, 300)[1], class: "sc-m7-road" }, scene);
        svg("line", { x1: dir(P1, al, -200)[0], y1: dir(P1, al, -200)[1], x2: dir(P1, al, 300)[0], y2: dir(P1, al, 300)[1], class: "sc-m7-lane" }, scene);
        const rail = (parent, p) => {
          for (let x = -400; x <= 400; x += 22) svg("line", { x1: p[0] + x, y1: p[1] - 9, x2: p[0] + x, y2: p[1] + 9, class: "sc-m7-sleeper" }, parent);
          svg("line", { x1: p[0] - 400, y1: p[1], x2: p[0] + 400, y2: p[1], class: "sc-m7-rail" }, parent);
        };
        rail(scene, P1);
        const bottom = svg("g", {}, scene);
        rail(bottom, P2);
        const arc = (p, from, span, r) => {
          const [a, b] = [dir(p, from, r), dir(p, from + span, r)];
          return `M${p[0]} ${p[1]} L${a[0]} ${a[1]} A${r} ${r} 0 ${span > 180 ? 1 : 0} 1 ${b[0]} ${b[1]} Z`;
        };
        svg("path", { d: arc(P1, 0, al, 26), class: "sc-gold" }, fig);
        const l1 = dir(P1, al / 2, 46);
        label(fig, l1[0], l1[1] + 6, `${al}°`, "sc-m7-t");
        const w2 = svg("path", { class: "sc-red" }, fig);
        const l2 = label(fig, 0, 0, "", "sc-m7-t");
        const knob = svg("circle", { r: 14, class: "sc-teal sc-m7-grab", tabindex: 0, role: "slider", "aria-label": "Угол нижнего рельса" }, fig);
        let beta = t.start, touched = false;
        function set(b, user) {
          beta = Math.max(lo, Math.min(hi, Math.round(b / 5) * 5));
          const phi = beta - 180 + al;
          bottom.setAttribute("transform", `rotate(${phi} ${P2[0]} ${P2[1]})`);
          w2.setAttribute("d", arc(P2, 180 + al, beta, 26));
          const lp = dir(P2, 180 + al + beta / 2, 48);
          l2.setAttribute("x", lp[0]); l2.setAttribute("y", lp[1] + 6);
          l2.textContent = `${beta}°`;
          const kp = dir(P2, phi, 85);
          knob.setAttribute("cx", kp[0]); knob.setAttribute("cy", kp[1]);
          knob.setAttribute("aria-valuenow", beta);
          if (user) { touched = true; changed(el); }
        }
        drag(knob, fig, (p) => {
          if (el.classList.contains("is-locked")) return;
          let phi = (Math.atan2(p.y - P2[1], p.x - P2[0]) * 180) / Math.PI;
          if (phi > 90) phi -= 180; else if (phi < -90) phi += 180;
          set(phi + 180 - al, true);
        });
        knob.addEventListener("keydown", (e) => {
          const s = { ArrowRight: 5, ArrowDown: 5, ArrowLeft: -5, ArrowUp: -5 }[e.key];
          if (s) { e.preventDefault(); set(beta + s, true); }
        });
        const row = controls(el);
        [["↺", -5, "Повернуть против часовой стрелки"], ["↻", 5, "Повернуть по часовой стрелке"]].forEach(([txt, s, aria]) => {
          const btn = document.createElement("button");
          btn.type = "button"; btn.className = "task-step-btn"; btn.textContent = txt; btn.setAttribute("aria-label", aria);
          btn.addEventListener("click", () => set(beta + s, true));
          row.appendChild(btn);
        });
        set(t.start);
        const lock = lockable(el);
        return {
          value: () => (touched ? beta : null),
          lock,
          reveal() {
            set(t.solution);
            answerLine(el, t.reveal || `Односторонние углы: ${al}° + ${t.solution}° = 180° — рельсы параллельны`);
          },
          reset() { set(t.start); touched = false; lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* --------------------------------------------------------------- farm-yard
     * The chickens and rabbits from the systems video: drag animals from the pens into the yard until the
     * yard has the given heads and legs. task: { heads, legs, hens, rabbits (how many in the pens),
     * solution: { c, r } } — value: { c, r } animals in the yard. */
    "farm-yard": {
      wrong: (t) => [
        { c: t.solution.r, r: t.solution.c },
        { c: t.solution.c + 1, r: t.solution.r - 1 },
        { c: t.solution.c - 1, r: t.solution.r + 1 },
      ].filter((v) => v.c !== t.solution.c),
      check: (t, v) => Boolean(v) && Number.isInteger(v.c) && Number.isInteger(v.r) && v.c + v.r === t.heads && 2 * v.c + 4 * v.r === t.legs,
      build(el, t, kit) {
        const { svg, label, stage, hint, celebrate, dnd, lockable, answerLine } = kit;
        hint(el, t.hint || "Перетащите кур и кроликов во двор (или нажмите на зверя, затем на двор)");
        const fig = stage(el, 360, 290, "Двор, куры и кролики");
        const headT = label(fig, 90, 30, "", "sc-m7-t");
        const legT = label(fig, 270, 30, "", "sc-m7-t");
        const pen = (id, x0, lab) => ({ id, x: x0, y: 178, w: 165, h: 76, label: lab, layout: (i) => [x0 + 24 + (i % 5) * 30, 202 + Math.floor(i / 5) * 30] });
        const d = dnd(fig, [
          { id: "yard", x: 10, y: 44, w: 340, h: 112, cols: 7, cell: 48, label: "Двор", hideLabel: true },
          pen("hens", 10, "куры"), pen("rabbits", 185, "кролики"),
        ], (state, id, z) => {
          const own = id[0] === "c" ? "hens" : "rabbits";
          if (z !== "yard" && z !== own) d.place(id, own);
          if (z === "yard" && d.count("yard") > 14) d.place(id, own);
          paint();
          changed(el);
        });
        const fence = svg("g", {}, null);
        for (let x = 30; x < 350; x += 40) svg("rect", { x, y: 108, width: 6, height: 44, rx: 2, class: "sc-crust" }, fence);
        svg("rect", { x: 14, y: 118, width: 332, height: 6, class: "sc-crust" }, fence);
        svg("rect", { x: 14, y: 136, width: 332, height: 6, class: "sc-crust" }, fence);
        fence.setAttribute("opacity", "0.35");
        fig.insertBefore(fence, fig.querySelector(".sc-items"));
        const hen = (n) => {
          svg("ellipse", { cx: -2, cy: 2, rx: 14, ry: 11, class: "sc-gold" }, n);
          svg("ellipse", { cx: -5, cy: 3, rx: 7, ry: 5, class: "sc-crust" }, n);
          svg("circle", { cx: 10, cy: -9, r: 7, class: "sc-gold" }, n);
          svg("circle", { cx: 10, cy: -17, r: 4, class: "sc-red" }, n);
          svg("path", { d: "M16 -11 L22 -8 L16 -6 Z", class: "sc-red" }, n);
          svg("rect", { x: -6, y: 12, width: 2.5, height: 8, class: "sc-crust" }, n);
          svg("rect", { x: 1, y: 12, width: 2.5, height: 8, class: "sc-crust" }, n);
        };
        const bunny = (n) => {
          svg("ellipse", { cx: 7, cy: -21, rx: 3, ry: 9, class: "sc-violet" }, n);
          svg("ellipse", { cx: 13, cy: -20, rx: 3, ry: 9, class: "sc-violet" }, n);
          svg("ellipse", { cx: -2, cy: 4, rx: 15, ry: 10, class: "sc-violet" }, n);
          svg("circle", { cx: 10, cy: -6, r: 8, class: "sc-violet" }, n);
          svg("circle", { cx: -17, cy: 1, r: 4.5, class: "sc-cream" }, n);
          [-11, -5, 3, 9].forEach((x) => svg("rect", { x, y: 12, width: 4, height: 7, rx: 2, class: "sc-violet" }, n));
        };
        const add = (n, draw, prefix, zone, name) => {
          for (let i = 0; i < n; i++) {
            const g = svg("g", { "aria-label": name });
            svg("rect", { x: -20, y: -26, width: 42, height: 46, fill: "transparent" }, g);
            draw(g);
            d.add(`${prefix}${i}`, g, zone);
          }
        };
        add(t.hens, hen, "c", "hens", "Курица");
        add(t.rabbits, bunny, "r", "rabbits", "Кролик");
        const now = () => {
          const ids = d.itemsIn("yard");
          return { c: ids.filter((i) => i[0] === "c").length, r: ids.filter((i) => i[0] === "r").length };
        };
        function paint() {
          const { c, r } = now();
          headT.textContent = `голов: ${c + r} из ${t.heads}`;
          legT.textContent = `ног: ${2 * c + 4 * r} из ${t.legs}`;
          headT.setAttribute("class", `sc-m7-t ${c + r === t.heads ? "sc-m7-ok" : ""}`);
          legT.setAttribute("class", `sc-m7-t ${2 * c + 4 * r === t.legs ? "sc-m7-ok" : ""}`);
        }
        const home = () => d.itemsIn("yard").forEach((id) => d.place(id, id[0] === "c" ? "hens" : "rabbits"));
        paint();
        const lockEl = lockable(el);
        return {
          value: () => (d.count("yard") ? now() : null),
          lock(on) { lockEl(on); d.lock(on); },
          reveal() {
            home();
            for (let i = 0; i < t.solution.c; i++) d.place(`c${i}`, "yard");
            for (let i = 0; i < t.solution.r; i++) d.place(`r${i}`, "yard");
            paint();
            answerLine(el, t.reveal || `${t.solution.c} кур и ${t.solution.r} кроликов: ${t.solution.c} + ${t.solution.r} = ${t.heads} голов, ${t.solution.c} · 2 + ${t.solution.r} · 4 = ${t.legs} ног`);
          },
          reset() { home(); paint(); lockEl(false); d.lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },
  });
})();
