/* Scenes for grade 6 math (see js/scenes.js). */
(function () {
  const IntScenes = typeof window !== "undefined" ? window.IntScenes : require("./scenes.js");

  /* ------------------------------------------------------------- pizza-cut
   * The pizza from the fractions video: pick how many slices to cut it into (the knife buttons), then tap
   * slices to hand them out — each tap gives the slice to the friend chosen in the row of names.
   * task: { eaters: [{ name, color, num, den }], minParts?, maxParts?, solution: { parts, shares: [..] } }
   * value: { parts, shares } — right when every friend's slices make exactly their fraction (8 or 16 slices
   * both work for 1/4 and 3/8, 4 does not). */
  IntScenes.add({
    "pizza-cut": {
      wrong: (t) => [
        { parts: t.solution.parts, shares: t.solution.shares.map((x) => x + 1) },
        { parts: t.solution.parts, shares: t.solution.shares.map((x, i) => (i === 0 ? x - 1 : x)) },
        { parts: t.solution.parts * 2, shares: t.solution.shares },
      ],
      check(t, v) {
        if (!v || !v.parts || !Array.isArray(v.shares) || v.shares.length !== t.eaters.length) return false;
        return t.eaters.every((e, i) => v.shares[i] * e.den === e.num * v.parts);
      },
      build(el, t, kit) {
        const { svg, label, stage, hint, celebrate, controls, stepper, palette, lockable, answerLine, pop, art } = kit;
        const W = 360, H = 260, CX = 122, CY = 130, R = 102;
        const minP = t.minParts || 2, maxP = t.maxParts || 12;
        hint(el, t.hint || "Выберите, на сколько кусков резать, затем нажимайте на куски, чтобы раздать их");
        const fig = stage(el, W, H, "Пицца, которую нужно разрезать и раздать");
        // the pizza: crust, cheese, then the slices on top (each slice is a tap target)
        svg("circle", { cx: CX, cy: CY, r: R + 4, class: "sc-crust" }, fig);
        const slicesG = svg("g", {}, fig);
        const cutsG = svg("g", { class: "sc-cuts" }, fig);
        // the friends on the right, each with a counter
        // the friends on the right, spread over the stage height, each with a share counter
        const step = t.eaters.length > 1 ? 140 / (t.eaters.length - 1) : 0;
        const people = t.eaters.map((e, i) => {
          const y = t.eaters.length === 1 ? 125 : 65 + i * step;
          const kid = art.kid(fig, e.color, 1.1);
          kid.setAttribute("transform", `translate(300 ${y}) scale(1.1)`);
          const name = label(fig, 300, y + 40, e.name, "sc-name");
          const got = label(fig, 262, y - 4, "", "sc-share", "end");
          return { kid, name, got };
        });
        let parts = null;
        const owner = []; // slice index → eater index or -1
        const row = controls(el);
        const who = t.eaters.length > 1 ? palette(el, t.eaters.map((e) => `<span class="sc-dot sc-${e.color}"></span>${e.name}`), "Кому отдаём кусок") : null;
        const knife = stepper(row, "Кусков", minP, maxP, (n) => cut(n, true));
        cut(1, false); // the whole pizza until the pupil picks a number of slices
        parts = null;

        function cut(n, animate) {
          parts = n;
          owner.length = 0;
          for (let i = 0; i < n; i++) owner.push(-1);
          slicesG.textContent = "";
          cutsG.textContent = "";
          for (let i = 0; i < n; i++) {
            const a1 = (2 * Math.PI * i) / n, a2 = (2 * Math.PI * (i + 1)) / n;
            const p = (a, r) => [CX + Math.sin(a) * r, CY - Math.cos(a) * r];
            const [x1, y1] = p(a1, R), [x2, y2] = p(a2, R);
            const d = n === 1 ? `M${CX - R} ${CY} a${R} ${R} 0 1 0 ${2 * R} 0 a${R} ${R} 0 1 0 ${-2 * R} 0 Z`
              : `M${CX} ${CY} L${x1} ${y1} A${R} ${R} 0 ${a2 - a1 > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z`;
            const s = svg("path", { d, class: "sc-cheese sc-tap sc-slice", "data-i": i, role: "button", "aria-label": `Кусок ${i + 1}` }, slicesG);
            kit.toggleable(s, () => give(i));
            // a pepperoni on every slice
            const [px, py] = p((a1 + a2) / 2, R * 0.6);
            svg("circle", { cx: px, cy: py, r: Math.max(4, 11 - n * 0.4), class: "sc-red", "pointer-events": "none" }, slicesG);
          }
          for (let i = 0; i < n && n > 1; i++) {
            const a = (2 * Math.PI * i) / n;
            const ln = svg("line", { x1: CX, y1: CY, x2: CX + Math.sin(a) * (R + 4), y2: CY - Math.cos(a) * (R + 4), class: "sc-cut" }, cutsG);
            if (animate && kit.motion() && ln.animate) ln.animate([{ strokeDashoffset: R }, { strokeDashoffset: 0 }], { duration: 300, delay: i * 30 });
          }
          paint();
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
        function give(i) {
          if (parts === null) return;
          const to = who ? who.active : 0;
          owner[i] = owner[i] === to ? -1 : to;
          paint();
          pop(slicesG.children[i * 2]);
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }
        function paint() {
          [...slicesG.querySelectorAll(".sc-slice")].forEach((s, i) => {
            const o = owner[i];
            s.setAttribute("class", `sc-tap sc-slice ${o < 0 ? "sc-cheese" : `sc-${t.eaters[o].color}`}`);
          });
          people.forEach((p, j) => {
            const c = owner.filter((o) => o === j).length;
            p.got.textContent = parts && c ? `${c}/${parts}` : "";
          });
        }
        const lock = lockable(el);
        return {
          value: () => (parts === null || owner.every((o) => o < 0) ? null : { parts, shares: t.eaters.map((_, j) => owner.filter((o) => o === j).length) }),
          lock,
          reveal() {
            const { parts: n, shares } = t.solution;
            knife.set(n);
            cut(n, true);
            let i = 0;
            shares.forEach((c, j) => { for (let m = 0; m < c; m++) owner[i++] = j; });
            paint();
            answerLine(el, t.reveal || `Режем на ${n}: ` + t.eaters.map((e, j) => `${e.name} — ${shares[j]}/${n} (= ${e.num}/${e.den})`).join(", "));
          },
          reset() { knife.set(null); cut(1, false); parts = null; lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },
  });
})();

/* More grade 6 scenes: one per lesson, each from the picture of its video. */
(function () {
  const IntScenes = typeof window !== "undefined" ? window.IntScenes : require("./scenes.js");
  const fire = (el) => el.dispatchEvent(new Event("change", { bubbles: true }));
  const isInt = (v) => typeof v === "number" && Number.isInteger(v);
  const uniqWrong = (list, ok) => list.filter((v, i) => v !== null && !ok(v) && list.findIndex((w) => JSON.stringify(w) === JSON.stringify(v)) === i).slice(0, 4);
  const sign = (n) => (n > 0 ? `+${n}` : String(n).replace("-", "−"));
  const deg = (n) => `${String(n).replace("-", "−")}°`;

  IntScenes.add({
    /* ----------------------------------------------------------- thermometer (math-6-1)
     * A street thermometer: the red column starts at the morning temperature; the pupil drags it (or uses
     * − / +) to the temperature after the change. task: { start, change, min, max, solution } value: number */
    thermometer: {
      wrong: (t) => uniqWrong([t.start - t.change, -t.solution, Math.abs(t.start) + Math.abs(t.change), -(Math.abs(t.start) + Math.abs(t.change))], (v) => v === t.solution),
      check: (t, v) => isInt(v) && v === t.solution,
      build(el, t, kit) {
        const { svg, label, stage, hint, celebrate, controls, stepper, lockable, answerLine, drag, clamp } = kit;
        const W = 360, H = 270, TX = 104, TOP = 34, BOT = 214, min = t.min ?? -10, max = t.max ?? 10;
        hint(el, t.hint || "Тяните красный столбик термометра или нажимайте − и +");
        const fig = stage(el, W, H, "Уличный термометр");
        const y = (v) => BOT - ((v - min) / (max - min)) * (BOT - TOP);
        svg("rect", { x: 40, y: 14, width: 110, height: 250, rx: 22, class: "sc-cream" }, fig);
        svg("rect", { x: TX - 9, y: TOP - 10, width: 18, height: BOT - TOP + 30, rx: 9, class: "sc-paper" }, fig);
        for (let v = min; v <= max; v++) {
          const big = v % 2 === 0;
          svg("line", { x1: TX + 12, x2: TX + (big ? 26 : 20), y1: y(v), y2: y(v), class: v === 0 ? "sc-thin" : "sc-hair" }, fig);
          if (big) label(fig, TX - 16, y(v) + 5, String(v).replace("-", "−"), v === 0 ? "sc-tx-m" : "sc-tx sc-tx-soft", "end");
        }
        const col = svg("rect", { x: TX - 6, width: 12, rx: 6, class: "sc-red" }, fig);
        svg("circle", { cx: TX, cy: BOT + 28, r: 17, class: "sc-red" }, fig);
        const handle = svg("g", { class: "sc-handle" }, fig);
        svg("rect", { x: TX - 34, y: TOP - 16, width: 68, height: BOT - TOP + 32, class: "sc-hit" }, handle);
        const knob = svg("circle", { r: 11, cx: TX, class: "sc-ink" }, handle);
        // the story on the right: where the column was, and what happened
        const was = svg("g", {}, fig);
        svg("path", { d: `M${TX + 32} ${y(t.start)} l12 -8 v16 Z`, class: "sc-teal" }, was);
        label(was, TX + 50, y(t.start) + 5, `было ${deg(t.start)}`, "sc-tx sc-tx-teal", "start");
        const warm = t.change > 0;
        const ix = 290, iy = 64;
        if (warm) {
          svg("circle", { cx: ix, cy: iy, r: 18, class: "sc-gold" }, fig);
          for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4; svg("line", { x1: ix + Math.cos(a) * 24, y1: iy + Math.sin(a) * 24, x2: ix + Math.cos(a) * 31, y2: iy + Math.sin(a) * 31, class: "sc-thin", style: "stroke: var(--sc-gold)" }, fig); }
        } else {
          for (let i = 0; i < 3; i++) { const a = (i * Math.PI) / 3; svg("line", { x1: ix - Math.cos(a) * 24, y1: iy - Math.sin(a) * 24, x2: ix + Math.cos(a) * 24, y2: iy + Math.sin(a) * 24, class: "sc-thin", style: "stroke: var(--sc-blue); stroke-width: 5" }, fig); }
        }
        label(fig, ix, iy + 62, `${warm ? "потеплело" : "похолодало"}`, "sc-tx-m", "middle");
        label(fig, ix, iy + 90, `на ${Math.abs(t.change)}°`, warm ? "sc-tx-b sc-tx-red" : "sc-tx-b", "middle");
        const now = label(fig, ix, 236, "", "sc-tx-b", "middle");
        label(fig, ix, 212, "сейчас", "sc-tx sc-tx-soft", "middle");
        let v = t.start, touched = false;
        function paint() {
          col.setAttribute("y", y(v)); col.setAttribute("height", BOT + 20 - y(v));
          knob.setAttribute("cy", y(v));
          now.textContent = touched ? deg(v) : "?";
        }
        function set(n, user) { v = clamp(n, min, max); touched = true; step.set(v); paint(); if (user) fire(el); }
        const step = stepper(controls(el), "Температура", min, max, (n) => set(n, true));
        step.set(v);
        drag(handle, fig, (p) => { if (!el.classList.contains("is-locked") && p.x < 170) set(Math.round(min + ((BOT - p.y) / (BOT - TOP)) * (max - min)), true); });
        paint();
        const lock = lockable(el);
        return {
          value: () => (touched ? v : null),
          lock,
          reveal() { set(t.solution, false); answerLine(el, t.reveal || `${deg(t.start)} ${t.change > 0 ? "+" : "−"} ${Math.abs(t.change)} = ${deg(t.solution)}`); },
          reset() { v = t.start; touched = false; step.set(v); paint(); lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* ---------------------------------------------------------- recipe-flour (math-6-2)
     * The recipe from the proportions video: for `from` guests you need `base` g; put flour bags on the
     * kitchen scale for `to` guests. task: { from, to, base, unit?, bags: [100, 100, 50 …], solution } value: grams */
    "recipe-flour": {
      wrong: (t) => uniqWrong([t.base, t.base * 2, t.solution - 50, t.solution + 50], (v) => v === t.solution),
      check: (t, v) => isInt(v) && v === t.solution,
      build(el, t, kit) {
        const { svg, label, stage, hint, celebrate, dnd, art, lockable, answerLine } = kit;
        const W = 360, H = 262, unit = t.unit || "г";
        hint(el, t.hint || "Перетащите мешочки с полки на весы (или нажмите мешочек, потом весы)");
        const fig = stage(el, W, H, "Кухня: полка с мешочками муки и весы");
        [[t.from, 34, `${t.base} ${unit}`], [t.to, 86, `? ${unit}`]].forEach(([n, yy, txt], r) => {
          const gap = Math.min(22, 170 / n);
          for (let i = 0; i < n; i++) art.kid(fig, ["teal", "red", "gold", "blue", "violet"][i % 5], 0.55).setAttribute("transform", `translate(${22 + i * gap} ${yy}) scale(0.55)`);
          label(fig, 262, yy + 4, `${n} чел. →`, "sc-tx-m", "end");
          label(fig, 346, yy + 6, txt, r ? "sc-tx-b sc-tx-red" : "sc-tx-b", "end");
        });
        svg("rect", { x: 214, y: 214, width: 120, height: 42, rx: 10, class: "sc-ink" }, fig);
        const shown = label(fig, 274, 243, "0 г", "sc-tx-b sc-tx-cream", "middle");
        const zones = [
          { id: "shelf", x: 12, y: 112, w: 170, h: 110, cols: 3, cell: 50, label: "Полка" },
          { id: "scale", x: 198, y: 112, w: 152, h: 100, cols: 3, cell: 48, label: "Весы", hideLabel: true },
        ];
        let touched = false;
        const total = () => d.itemsIn("scale").reduce((s, id) => s + t.bags[+id.slice(1)], 0);
        const paint = () => { shown.textContent = `${total()} ${unit}`; };
        const d = dnd(fig, zones, () => { touched = true; paint(); fire(el); });
        t.bags.forEach((g, i) => {
          const n = svg("g", { "aria-label": `Мешочек ${g} ${unit}` });
          const big = g >= 100, w = big ? 44 : 36, h = big ? 44 : 36;
          svg("path", { d: `M${-w / 2} ${-h / 2 + 8} q${w / 2} -6 ${w} 0 v${h - 14} q0 6 -6 6 h${-w + 12} q-6 0 -6 -6 Z`, class: "sc-crust" }, n);
          svg("rect", { x: -7, y: -h / 2 - 2, width: 14, height: 9, rx: 3, class: "sc-crust" }, n);
          label(n, 0, 6, String(g), "sc-tx", "middle");
          d.add(`b${i}`, n, "shelf");
        });
        paint();
        const lock = (on) => { lockable(el)(on); d.lock(on); };
        return {
          value: () => (touched && total() > 0 ? total() : null),
          lock,
          reveal() {
            t.bags.forEach((_, i) => d.place(`b${i}`, "shelf"));
            let need = t.solution;
            t.bags.map((g, i) => [g, i]).sort((a, b) => b[0] - a[0]).forEach(([g, i]) => { if (g <= need) { need -= g; d.place(`b${i}`, "scale"); } });
            paint();
            answerLine(el, t.reveal || `${t.from}/${t.base} = ${t.to}/x → x = ${t.base} · ${t.to} : ${t.from} = ${t.solution} ${unit}`);
          },
          reset() { t.bags.forEach((_, i) => d.place(`b${i}`, "shelf")); touched = false; paint(); lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* ----------------------------------------------------------- gift-boxes (math-6-3)
     * Apples and pears from the GCD video go into identical gift boxes: the pupil picks how many boxes,
     * the fruit is shared out and whatever does not fit stays on the table. The answer is the largest number
     * of boxes with nothing left over. task: { items: [{ name, count, color, shape }], maxBoxes, solution } */
    "gift-boxes": {
      wrong(t) {
        const [a, b] = t.items.map((i) => i.count);
        const common = []; for (let k = t.solution - 1; k > 1; k--) if (a % k === 0 && b % k === 0) common.push(k);
        return uniqWrong([...common.slice(0, 2), Math.min(a, b), a + b > 12 ? 4 : 5, 1], (v) => v === t.solution).slice(0, 4);
      },
      check: (t, v) => isInt(v) && v === t.solution,
      build(el, t, kit) {
        const { svg, label, stage, hint, celebrate, controls, stepper, lockable, answerLine } = kit;
        const W = 360, H = 270;
        hint(el, t.hint || "Выбирайте число коробок: фрукты разложатся поровну, лишние останутся на столе");
        const fig = stage(el, W, H, "Подарочные коробки и фрукты");
        const g = svg("g", {}, fig);
        const fruit = (p, x, y, it, f = 1) => {
          const n = svg("g", { transform: `translate(${x} ${y}) scale(${f})`, class: `sc-${it.color}` }, p);
          if (it.shape === "pear") svg("path", { d: "M0 -7 c4 0 3 5 5 8 c2 4 -1 6 -5 6 c-4 0 -7 -2 -5 -6 c2 -3 1 -8 5 -8 Z" }, n);
          else svg("circle", { r: 5.5 }, n);
        };
        let n = null;
        function draw() {
          g.textContent = "";
          const left = t.items.map((it) => (n ? it.count % n : it.count));
          if (n) {
            const rows = n <= 5 ? 1 : 2, cols = Math.ceil(n / rows), bw = (336 - (cols - 1) * 8) / cols, bh = rows === 1 ? 150 : 82;
            for (let b = 0; b < n; b++) {
              const x = 12 + (b % cols) * (bw + 8), yb = 12 + Math.floor(b / cols) * (bh + 10);
              svg("rect", { x, y: yb, width: bw, height: bh - 20, rx: 7, class: "sc-crust" }, g);
              svg("rect", { x: x + 4, y: yb + 4, width: bw - 8, height: bh - 28, rx: 5, class: "sc-cream" }, g);
              const cnt = t.items.reduce((s2, it) => s2 + Math.floor(it.count / n), 0), iw = bw - 12, ih = bh - 34;
              const sp = Math.max(13, Math.min(30, Math.floor(Math.sqrt((iw * ih) / cnt) * 0.92))), per = Math.max(1, Math.floor(iw / sp));
              const rowsN = Math.ceil(cnt / per), ox = x + 6 + (iw - Math.min(per, cnt) * sp) / 2 + sp / 2, oy = yb + 6 + (ih - rowsN * sp) / 2 + sp / 2;
              let k = 0;
              t.items.forEach((it) => { for (let m = 0; m < Math.floor(it.count / n); m++, k++) fruit(g, ox + (k % per) * sp, oy + Math.floor(k / per) * sp, it, sp / 14); });
              label(g, x + bw / 2, yb + bh - 4, t.items.map((it) => Math.floor(it.count / n)).join(" + "), "sc-tx", "middle");
            }
          } else label(g, 180, 110, "Сколько коробок?", "sc-tx-b sc-tx-soft", "middle");
          svg("rect", { x: 8, y: 200, width: 344, height: 64, rx: 10, class: "sc-cream" }, g);
          const rest = left.reduce((s, c) => s + c, 0);
          label(g, 18, 222, n ? (rest ? "Лишние:" : "Ничего не осталось") : "На столе:", "sc-tx sc-tx-soft", "start");
          let k = 0;
          t.items.forEach((it, j) => { for (let m = 0; m < left[j]; m++, k++) fruit(g, 24 + (k % 27) * 12, 240 + Math.floor(k / 27) * 15, it, 0.9); });
        }
        const step = stepper(controls(el), "Коробок", 1, t.maxBoxes || 12, (v) => { n = v; draw(); fire(el); });
        draw();
        const lock = lockable(el);
        return {
          value: () => n,
          lock,
          reveal() { n = t.solution; step.set(n); draw(); answerLine(el, t.reveal || `НОД = ${t.solution}: в каждой коробке ${t.items.map((it) => `${it.count / n} ${it.name}`).join(" и ")}`); },
          reset() { n = null; step.set(null); draw(); lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* ----------------------------------------------------------- sea-battle (math-6-4)
     * «Морской бой» on the coordinate plane: ships stand on grid points, the pupil fires at the point
     * (x; y) named in the question. task: { target: [x, y], ships: [[x, y] …], solution: [x, y] } */
    "sea-battle": {
      wrong: (t) => { const [x, y] = t.target; return uniqWrong([[y, x], [-x, y], [x, -y], [-y, -x]], (v) => v[0] === x && v[1] === y).slice(0, 4); },
      check: (t, v) => Array.isArray(v) && v.length === 2 && v[0] === t.target[0] && v[1] === t.target[1],
      build(el, t, kit) {
        const { svg, label, stage, hint, celebrate, lockable, answerLine, toggleable, pop, num } = kit;
        const W = 360, H = 284, U = 34, OX = 180, OY = 142, XM = 4, YM = 3;
        hint(el, t.hint || "Нажмите на точку, куда стреляете");
        const fig = stage(el, W, H, "Морской бой на координатной плоскости");
        const P = (x, y) => [OX + x * U, OY - y * U];
        svg("rect", { x: OX - (XM + 0.5) * U, y: OY - (YM + 0.5) * U, width: (2 * XM + 1) * U, height: (2 * YM + 1) * U, rx: 10, class: "sc-glass" }, fig);
        for (let x = -XM; x <= XM; x++) svg("line", { x1: P(x, 0)[0], x2: P(x, 0)[0], y1: OY - (YM + 0.5) * U, y2: OY + (YM + 0.5) * U, class: "sc-hair" }, fig);
        for (let y = -YM; y <= YM; y++) svg("line", { y1: P(0, y)[1], y2: P(0, y)[1], x1: OX - (XM + 0.5) * U, x2: OX + (XM + 0.5) * U, class: "sc-hair" }, fig);
        svg("path", { d: `M${OX - (XM + 0.5) * U} ${OY} H${OX + (XM + 0.6) * U} m-8 -5 l8 5 l-8 5 M${OX} ${OY + (YM + 0.5) * U} V${OY - (YM + 0.6) * U} m-5 8 l5 -8 l5 8`, class: "sc-thin" }, fig);
        label(fig, OX + (XM + 0.6) * U, OY + 20, "x", "sc-tx-m", "middle");
        label(fig, OX + 14, 16, "y", "sc-tx-m", "middle");
        for (let x = -XM; x <= XM; x++) if (x) label(fig, P(x, 0)[0], OY + 17, String(x).replace("-", "−"), "sc-tx sc-tx-soft", "middle");
        for (let y = -YM; y <= YM; y++) if (y) label(fig, OX - 7, P(0, y)[1] + 5, String(y).replace("-", "−"), "sc-tx sc-tx-soft", "end");
        label(fig, OX - 7, OY + 17, "0", "sc-tx sc-tx-soft", "end");
        t.ships.forEach(([x, y]) => {
          const [px, py] = P(x, y), s = svg("g", { transform: `translate(${px} ${py})`, "pointer-events": "none" }, fig);
          svg("path", { d: "M-15 2 h30 l-6 9 h-18 Z", class: "sc-ink" }, s);
          svg("path", { d: "M-1 0 V-15 L10 -2 Z", class: "sc-red" }, s);
        });
        const shot = svg("g", { "pointer-events": "none" }, fig);
        let v = null;
        function paint() {
          shot.textContent = "";
          if (!v) return;
          const [px, py] = P(v[0], v[1]);
          svg("circle", { cx: px, cy: py, r: 12, class: "sc-thin", style: "stroke: var(--sc-gold); stroke-width: 3" }, shot);
          svg("path", { d: `M${px - 7} ${py - 7} l14 14 m0 -14 l-14 14`, class: "sc-thin", style: "stroke: var(--sc-red); stroke-width: 4" }, shot);
          const tx = Math.min(Math.max(px, 70), 290);
          label(shot, tx, py - 18 < 18 ? py + 32 : py - 18, `(${String(v[0]).replace("-", "−")}; ${String(v[1]).replace("-", "−")})`, "sc-tx-m", "middle");
          pop(shot);
        }
        for (let x = -XM; x <= XM; x++) for (let y = -YM; y <= YM; y++) {
          const [px, py] = P(x, y);
          const c = svg("circle", { cx: px, cy: py, r: 17, class: "sc-tap sc-hit", role: "button", "aria-label": `Выстрел в точку (${x}; ${y})` }, fig);
          toggleable(c, () => { v = v && v[0] === x && v[1] === y ? null : [x, y]; paint(); fire(el); });
        }
        fig.appendChild(shot);
        const lock = lockable(el);
        return {
          value: () => v,
          lock,
          reveal() { v = t.target.slice(); paint(); answerLine(el, t.reveal || `Попал! x = ${num(t.target[0])} — по горизонтали, y = ${num(t.target[1])} — по вертикали`); },
          reset() { v = null; paint(); lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* ----------------------------------------------------------- pizza-roll (math-6-5)
     * Roll the pizza along a ruler: one full turn (the black mark on the crust touches the ruler again)
     * unrolls the whole crust, C = π·d. task: { d, max, solution } value: cm rolled (within 0,6 of 3,14·d) */
    "pizza-roll": {
      wrong: (t) => uniqWrong([t.d, Math.round(1.57 * t.d), 3 * t.d, 2 * t.d], (v) => Math.abs(v - 3.14 * t.d) < 0.6),
      check: (t, v) => isInt(v) && Math.abs(v - 3.14 * t.d) < 0.6,
      build(el, t, kit) {
        const { svg, label, stage, hint, celebrate, controls, numberField, lockable, answerLine, drag, clamp } = kit;
        const W = 360, H = 206, RY = 150, max = t.max, L = 344 / (1 + t.d / max), s = L / max, r = (t.d * s) / 2, X0 = r + 8;
        hint(el, t.hint || "Катите пиццу пальцем по линейке (или вводите сантиметры), пока чёрная метка снова не коснётся линейки");
        const fig = stage(el, W, H, "Пицца катится по линейке");
        const trail = svg("rect", { x: X0, y: RY - 3, height: 7, rx: 3, class: "sc-crust" }, fig);
        svg("line", { x1: X0, x2: X0 + L, y1: RY, y2: RY, class: "sc-thin" }, fig);
        const every = max > 60 ? 20 : 10;
        for (let c = 0; c <= max; c += 5) {
          svg("line", { x1: X0 + c * s, x2: X0 + c * s, y1: RY, y2: RY + (c % every ? 6 : 11), class: "sc-thin" }, fig);
          if (c % every === 0) label(fig, X0 + c * s, RY + 28, String(c), "sc-tx sc-tx-soft", "middle");
        }
        label(fig, X0 + L, RY + 46, "см", "sc-tx sc-tx-soft", "end");
        const pz = svg("g", { class: "sc-pizza-g" }, fig), spin = svg("g", {}, pz);
        svg("circle", { r, class: "sc-crust" }, spin);
        svg("circle", { r: r * 0.85, class: "sc-cheese" }, spin);
        for (let i = 0; i < 6; i++) { const a = (i * Math.PI) / 3 + 0.5; svg("circle", { cx: Math.cos(a) * r * 0.5, cy: Math.sin(a) * r * 0.5, r: r * 0.11, class: "sc-red" }, spin); }
        svg("line", { x1: 0, y1: -r * 0.85, x2: 0, y2: r * 0.85, class: "sc-thin", "stroke-dasharray": "5 5", style: "stroke-dasharray: 5 5" }, spin);
        svg("rect", { x: -4, y: r - 14, width: 8, height: 14, rx: 3, class: "sc-ink" }, spin);
        const dl = label(fig, 0, 0, `d = ${t.d} см`, "sc-tx-m", "middle");
        svg("path", { d: `M${X0 - 7} ${RY - 14} h14 l-7 10 Z`, class: "sc-teal" }, fig);
        let p = 0, touched = false;
        function paint() {
          const cx = X0 + p * s;
          pz.setAttribute("transform", `translate(${cx} ${RY - r})`);
          spin.setAttribute("transform", `rotate(${((p * s) / r) * (180 / Math.PI)})`);
          trail.setAttribute("width", Math.max(0, p * s));
          dl.setAttribute("x", clamp(cx, 50, 310)); dl.setAttribute("y", RY - 2 * r - 10);
        }
        function set(n, user) { p = clamp(Math.round(n), 0, max); touched = true; field.set(p); paint(); if (user) fire(el); }
        const field = numberField(controls(el), "Прокатили", { min: 0, max, unit: "см", answer: t.solution }, (n) => { if (n !== null) set(n, true); });
        drag(pz, fig, (q) => { if (!el.classList.contains("is-locked")) set((q.x - X0) / s, true); });
        paint();
        const lock = lockable(el);
        return {
          value: () => (touched ? p : null),
          lock,
          reveal() { set(t.solution, false); answerLine(el, t.reveal || `C = π · d ≈ 3,14 · ${t.d} ≈ ${t.solution} см`); },
          reset() { p = 0; touched = false; field.set(null); paint(); lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* ----------------------------------------------------------- bars-level (math-6-6)
     * The bar chart of pages read per day: move blocks of pages from tall days to short ones until every
     * bar is the same height — that height is the mean. task: { days: [..], values: [..pages], unit, solution: [mean …] } */
    "bars-level": {
      wrong(t) {
        const n = t.values.length, m = t.solution[0], u = t.unit;
        const near = t.solution.map((x, i) => (i === 0 ? x + u : i === 1 ? x - u : x));
        const med = [...t.values].sort((a, b) => a - b)[Math.floor(n / 2)];
        return uniqWrong([t.values.slice(), near, t.values.map(() => med), t.values.map(() => m + u)], (v) => IntScenes.kinds["bars-level"].check(t, v));
      },
      check(t, v) {
        if (!Array.isArray(v) || v.length !== t.values.length || !v.every(isInt)) return false;
        const sum = t.values.reduce((a, b) => a + b, 0);
        return v.every((x) => x === v[0]) && v[0] * v.length === sum;
      },
      build(el, t, kit) {
        const { svg, label, stage, hint, celebrate, lockable, answerLine, toggleable, pop } = kit;
        const W = 360, H = 272, BASE = 230, X0 = 46, n = t.values.length, u = t.unit;
        hint(el, t.hint || "Нажмите на столбик, откуда взять клетку, затем на столбик, куда её положить");
        const fig = stage(el, W, H, "Столбчатая диаграмма: страницы по дням");
        const maxB = Math.max(...t.values) / u + 1, bh = Math.min(26, 172 / maxB), cw = (W - X0 - 10) / n, bw = Math.min(46, cw - 10);
        for (let k = 0; k <= maxB; k++) {
          if (bh < 24 && k % 2) continue;
          svg("line", { x1: X0 - 4, x2: W - 10, y1: BASE - k * bh, y2: BASE - k * bh, class: "sc-hair" }, fig);
          label(fig, X0 - 8, BASE - k * bh + 5, String(k * u), "sc-tx sc-tx-soft", "end");
        }
        label(fig, 12, 20, t.axis || "страниц", "sc-tx sc-tx-soft", "start");
        const bars = svg("g", {}, fig), tops = svg("g", { "pointer-events": "none" }, fig);
        let blocks = t.values.map((x) => x / u), picked = null, touched = false;
        const cx = (i) => X0 + cw * (i + 0.5);
        t.days.forEach((d, i) => label(fig, cx(i), BASE + 22, d, "sc-tx-m", "middle"));
        function paint() {
          bars.textContent = ""; tops.textContent = "";
          blocks.forEach((b, i) => {
            for (let k = 0; k < b; k++) svg("rect", { x: cx(i) - bw / 2, y: BASE - (k + 1) * bh + 1, width: bw, height: bh - 2, rx: 3, class: picked === i && k === b - 1 ? "sc-picked-bar" : "sc-teal" }, bars);
            label(tops, cx(i), BASE - b * bh - 6, String(b * u), "sc-tx", "middle");
          });
        }
        t.values.forEach((_, i) => {
          const hit = svg("rect", { x: cx(i) - cw / 2 + 1, y: 26, width: cw - 2, height: BASE - 26, class: "sc-tap sc-hit", role: "button", "aria-label": `${t.days[i]}` }, fig);
          toggleable(hit, () => {
            if (picked === null) { if (blocks[i] > 0) picked = i; }
            else if (picked === i) picked = null;
            else { blocks[picked]--; blocks[i]++; picked = null; touched = true; pop(bars); fire(el); }
            paint();
          });
        });
        paint();
        const lock = lockable(el);
        return {
          value: () => (touched ? blocks.map((b) => b * u) : null),
          lock,
          reveal() {
            blocks = t.solution.map((x) => x / u); picked = null; paint();
            const sum = t.values.reduce((a, b) => a + b, 0);
            answerLine(el, t.reveal || `Среднее = (${t.values.join(" + ")}) : ${n} = ${sum} : ${n} = ${t.solution[0]}`);
          },
          reset() { blocks = t.values.map((x) => x / u); picked = null; touched = false; paint(); lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* ----------------------------------------------------------- juice-pour (math-6-8)
     * A 1-litre bottle with 12 marks holds `start` of a litre; pour Petya his part into the glass and leave
     * the rest. task: { start: [n, d], pour: [n, d], glass?: 6, solution: marks left (twelfths) } */
    "juice-pour": {
      wrong(t) {
        const s = (t.start[0] * 12) / t.start[1];
        return uniqWrong([s - t.pour[0], s - t.pour[1], (t.pour[0] * 12) / t.pour[1], t.solution + 1], (v) => v === t.solution);
      },
      check: (t, v) => isInt(v) && v === t.solution,
      build(el, t, kit) {
        const { svg, label, stage, hint, celebrate, controls, stepper, lockable, answerLine, drag, clamp } = kit;
        const W = 360, H = 272, BOT = 236, M = 15.5, cap = t.glass || 6, startK = (t.start[0] * 12) / t.start[1];
        hint(el, t.hint || "Тяните уровень сока в бутылке или в стакане, или нажимайте − и +");
        const fig = stage(el, W, H, "Бутылка сока на 12 делений и стакан");
        const y = (k) => BOT - k * M;
        const area = svg("g", { class: "sc-drag" }, fig);
        svg("rect", { x: 70, y: 6, width: 30, height: 14, rx: 4, class: "sc-red" }, area);
        svg("path", { d: `M74 20 h22 v14 q22 6 22 26 V${BOT} q0 8 -8 8 h-50 q-8 0 -8 -8 V60 q0 -20 22 -26 Z`, class: "sc-glass" }, area);
        const juiceB = svg("rect", { x: 52, width: 66, rx: 4, class: "sc-gold" }, area);
        for (let k = 1; k <= 12; k++) {
          svg("line", { x1: 106, x2: 118, y1: y(k), y2: y(k), class: k % 3 ? "sc-hair" : "sc-thin" }, area);
          label(area, 44, y(k) + 5, String(k), "sc-tx sc-tx-soft", "end");
        }
        label(fig, 12, 264, "1 л = 12 делений", "sc-tx sc-tx-soft", "start");
        const gx = 240, gw = 72, gTop = y(cap) - 10;
        svg("path", { d: `M${gx} ${gTop} h${gw} l-6 ${BOT - gTop} h${-gw + 12} Z`, class: "sc-glass" }, area);
        const juiceG = svg("rect", { x: gx + 6, width: gw - 12, class: "sc-gold" }, area);
        for (let k = 1; k <= cap; k++) svg("line", { x1: gx + gw - 18, x2: gx + gw - 8, y1: y(k), y2: y(k), class: "sc-hair" }, area);
        svg("rect", { x: 30, y: 0, width: 300, height: H, class: "sc-hit" }, area);
        const stream = svg("path", { d: `M118 40 q60 -20 ${gx + gw / 2 - 118} ${gTop - 20}`, class: "sc-thin", style: "stroke: var(--sc-gold); stroke-width: 6" }, fig);
        const lb = label(fig, 160, 0, "", "sc-tx-m", "start");
        const lg = label(fig, gx + gw / 2, BOT + 22, "", "sc-tx-m", "middle");
        let poured = 0, touched = false;
        function paint() {
          const left = startK - poured;
          juiceB.setAttribute("y", y(left)); juiceB.setAttribute("height", left * M);
          juiceG.setAttribute("y", y(poured)); juiceG.setAttribute("height", poured * M);
          stream.style.opacity = poured ? 1 : 0;
          lb.setAttribute("y", y(left) + 5); lb.textContent = `← ${left}/12 л`;
          lg.textContent = `${t.name || "Петя"}${poured ? `: ${poured}/12 л` : ""}`;
        }
        function set(n, user) { poured = clamp(n, 0, Math.min(cap, startK)); touched = true; step.set(poured); paint(); if (user) fire(el); }
        const step = stepper(controls(el), "В стакан, делений", 0, Math.min(cap, startK), (n) => set(n, true));
        step.set(0);
        drag(area, fig, (p) => {
          if (el.classList.contains("is-locked")) return;
          const k = Math.round((BOT - p.y) / M);
          set(p.x < 180 ? startK - k : k, true);
        });
        paint();
        const lock = lockable(el);
        return {
          value: () => (touched ? startK - poured : null),
          lock,
          reveal() { set(startK - t.solution, false); answerLine(el, t.reveal || `${t.start.join("/")} − ${t.pour.join("/")} = ${startK}/12 − ${startK - t.solution}/12 = ${t.solution}/12 л`); },
          reset() { poured = 0; touched = false; step.set(0); paint(); lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* ----------------------------------------------------------- sugar-cup (math-6-9)
     * The recipe card says «3/4 стакана», we bake only a part: fill the measuring cup (marks in `marks`-ths)
     * to the needed amount. task: { card: [lines], base: [n, d], part: [n, d], marks, solution: k marks } */
    "sugar-cup": {
      wrong(t) {
        const m = t.marks, b = (t.base[0] * m) / t.base[1];
        return uniqWrong([Number.isInteger(b) ? b : null, m / 2, t.solution + 1, t.solution - 1 > 0 ? t.solution - 1 : null], (v) => IntScenes.kinds["sugar-cup"].check(t, v));
      },
      check: (t, v) => isInt(v) && v * t.base[1] * t.part[1] === t.base[0] * t.part[0] * t.marks,
      build(el, t, kit) {
        const { svg, label, stage, hint, celebrate, controls, stepper, lockable, answerLine, drag, clamp } = kit;
        const W = 360, H = 262, BOT = 238, TOP = 58, m = t.marks, M = (BOT - TOP) / m, CX = 238, CW = 84;
        hint(el, t.hint || "Нажмите на мерный стакан или тяните, чтобы насыпать до нужной отметки");
        const fig = stage(el, W, H, "Карточка рецепта и мерный стакан");
        svg("rect", { x: 10, y: 30, width: 170, height: 176, rx: 12, class: "sc-cream" }, fig);
        svg("rect", { x: 10, y: 30, width: 170, height: 10, rx: 4, class: "sc-red" }, fig);
        t.card.forEach((line, i) => label(fig, 22, 70 + i * 32, line, i === 1 ? "sc-tx-l" : i >= 2 ? "sc-tx-m sc-tx-red" : "sc-tx-m", "start"));
        const cup = svg("g", { class: "sc-drag" }, fig);
        svg("path", { d: `M${CX + CW} ${TOP + 30} q30 0 30 40 q0 40 -30 40`, class: "sc-thin", style: "stroke-width: 8; stroke: var(--sc-soft)" }, cup);
        svg("rect", { x: CX, y: TOP - 12, width: CW, height: BOT - TOP + 14, rx: 8, class: "sc-glass" }, cup);
        const sugar = svg("rect", { x: CX + 3, width: CW - 6, rx: 5, class: "sc-sugar" }, cup);
        const every = M >= 18 ? 1 : 2;
        for (let k = 1; k <= m; k++) {
          svg("line", { x1: CX + 2, x2: CX + 22, y1: BOT - k * M, y2: BOT - k * M, class: "sc-thin" }, cup);
          if (k % every === 0 || k === m) label(cup, CX - 4, BOT - k * M + 5, `${k}/${m}`, "sc-tx sc-tx-soft", "end");
        }
        svg("rect", { x: CX - 40, y: 0, width: CW + 80, height: H, class: "sc-hit" }, cup);
        label(fig, CX + CW / 2, 30, "1 стакан", "sc-tx sc-tx-soft", "middle");
        let k = 0, touched = false;
        function paint() { sugar.setAttribute("y", BOT - k * M); sugar.setAttribute("height", Math.max(0, k * M - 1)); }
        function set(n, user) { k = clamp(n, 0, m); touched = true; step.set(k); paint(); if (user) fire(el); }
        const step = stepper(controls(el), "Насыпано, делений", 0, m, (n) => set(n, true));
        step.set(0);
        drag(cup, fig, (p) => { if (!el.classList.contains("is-locked") && p.x > CX - 40) set(Math.round((BOT - p.y) / M), true); });
        paint();
        const lock = lockable(el);
        return {
          value: () => (touched && k > 0 ? k : null),
          lock,
          reveal() { set(t.solution, false); answerLine(el, t.reveal || `${t.part.join("/")} · ${t.base.join("/")} = ${t.part[0] * t.base[0]}/${t.part[1] * t.base[1]} = ${t.solution}/${m} стакана`); },
          reset() { k = 0; touched = false; step.set(0); paint(); lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* ----------------------------------------------------------- compote-jars (math-6-10)
     * Pour the compote jar into glasses: tap an empty glass to fill it from the jar (tap again to pour it
     * back). How many glasses come out? task: { jar: litres, glass: [n, d], solution: count } */
    "compote-jars": {
      wrong: (t) => uniqWrong([t.solution - 1, t.solution + 1, t.jar + t.glass[1], t.jar * t.glass[1] + 1], (v) => v === t.solution),
      check: (t, v) => isInt(v) && v === t.solution,
      build(el, t, kit) {
        const { svg, label, stage, hint, celebrate, lockable, answerLine, toggleable, pop } = kit;
        const W = 360, H = 270, JT = 46, JB = 246, total = t.solution, G = Math.min(16, total + 4), cols = 4;
        hint(el, t.hint || "Нажимайте на пустые стаканы — они наполняются из банки. Нажмите ещё раз, чтобы вылить обратно");
        const fig = stage(el, W, H, "Банка компота и стаканы");
        label(fig, 72, 22, `банка ${t.jar} л`, "sc-tx-m", "middle");
        svg("rect", { x: 26, y: JT - 14, width: 92, height: 16, rx: 5, class: "sc-gold" }, fig);
        const jar = svg("g", {}, fig);
        svg("rect", { x: 18, y: JT, width: 108, height: JB - JT, rx: 18, class: "sc-glass" }, jar);
        const liquid = svg("rect", { x: 22, width: 100, rx: 14, class: "sc-red" }, jar);
        for (let l = 1; l <= t.jar; l++) {
          const yy = JB - ((JB - JT - 10) * l) / t.jar;
          svg("line", { x1: 100, x2: 122, y1: yy, y2: yy, class: "sc-thin" }, jar);
          label(jar, 96, yy + 5, `${l} л`, "sc-tx", "end");
        }
        label(fig, 252, 22, `стакан — ${t.glass.join("/")} л`, "sc-tx-m", "middle");
        const filled = new Array(G).fill(false);
        const cups = [];
        for (let i = 0; i < G; i++) {
          const x = 160 + (i % cols) * 48, y = 40 + Math.floor(i / cols) * 54, c = svg("g", { class: "sc-tap", role: "button", "aria-label": `Стакан ${i + 1}` }, fig);
          svg("path", { d: `M${x} ${y} h38 l-4 44 h-30 Z`, class: "sc-glass" }, c);
          const juice = svg("path", { d: `M${x + 1.5} ${y + 10} h35 l-3 32 h-29 Z`, class: "sc-red" }, c);
          svg("rect", { x: x - 4, y: y - 4, width: 46, height: 52, class: "sc-hit" }, c);
          cups.push(juice);
          toggleable(c, () => {
            const n = filled.filter(Boolean).length;
            if (filled[i]) filled[i] = false;
            else if (n < total) filled[i] = true;
            else { pop(jar); return; }
            pop(c); paint(); fire(el);
          });
        }
        function paint() {
          const left = total - filled.filter(Boolean).length, h = ((JB - JT - 10) * left) / total;
          liquid.setAttribute("y", JB - 4 - h); liquid.setAttribute("height", Math.max(0, h));
          cups.forEach((j, i) => (j.style.opacity = filled[i] ? 1 : 0));
        }
        paint();
        const lock = lockable(el);
        return {
          value: () => { const n = filled.filter(Boolean).length; return n ? n : null; },
          lock,
          reveal() { filled.fill(false); for (let i = 0; i < total; i++) filled[i] = true; paint(); answerLine(el, t.reveal || `${t.jar} : ${t.glass.join("/")} = ${t.jar} · ${t.glass[1]}/${t.glass[0]} = ${total} стаканов`); },
          reset() { filled.fill(false); paint(); lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },

    /* ----------------------------------------------------------- meet-walk (math-6-11)
     * Two friends walk towards each other, the dog runs between them. Move the clock to the moment they
     * meet and say how far the dog ran. task: { S, v1, v2, dog, step?, solution: { t, dog } } */
    "meet-walk": {
      wrong: (t) => { const m = t.S / (t.v1 + t.v2); return [{ t: m, dog: t.S }, { t: m, dog: t.dog * m / 2 }, { t: m + 0.5, dog: t.dog * (m + 0.5) }, { t: t.S / t.v2, dog: t.dog * m }].filter((v) => !(v.t === m && v.dog === t.dog * m)); },
      check(t, v) {
        if (!v || typeof v.t !== "number" || !isInt(v.dog)) return false;
        const m = t.S / (t.v1 + t.v2);
        return Math.abs(v.t - m) < 1e-9 && v.dog === t.dog * m;
      },
      build(el, t, kit) {
        const { svg, label, stage, hint, celebrate, controls, slider, numberField, lockable, answerLine, art, num } = kit;
        const W = 360, H = 250, X0 = 30, X1 = 330, TY = 150, k = (X1 - X0) / t.S, meet = t.S / (t.v1 + t.v2), maxT = t.maxT || meet + 1, st = t.step || 0.25;
        hint(el, t.hint || "Двигайте ползунок времени, пока друзья не встретятся, и впишите путь собаки");
        const fig = stage(el, W, H, "Два друга идут навстречу, между ними бегает собака");
        svg("line", { x1: X0, x2: X1, y1: TY, y2: TY, class: "sc-thin" }, fig);
        for (let i = 0; i <= t.S; i++) svg("line", { x1: X0 + i * k, x2: X0 + i * k, y1: TY, y2: TY + 5, class: "sc-hair" }, fig);
        svg("path", { d: `M${X0} ${TY + 18} v8 H${X1} v-8`, class: "sc-hair", style: "stroke: var(--sc-soft)" }, fig);
        label(fig, 180, TY + 46, `${t.S} км`, "sc-tx-m", "middle");
        const clock = label(fig, 180, 32, "", "sc-tx-b", "middle");
        const a = art.kid(fig, "teal", 0.95), b = art.kid(fig, "red", 0.95);
        const la = label(fig, 0, 0, `${t.v1} км/ч`, "sc-tx sc-tx-teal", "middle"), lb = label(fig, 0, 0, `${t.v2} км/ч`, "sc-tx sc-tx-red", "middle");
        const dog = svg("g", {}, fig);
        svg("ellipse", { cx: 0, cy: -9, rx: 11, ry: 6, class: "sc-crust" }, dog);
        svg("circle", { cx: 10, cy: -16, r: 6, class: "sc-crust" }, dog);
        svg("path", { d: "M7 -21 l-2 -6 l5 3 Z M-11 -10 l-6 -6", class: "sc-thin", style: "stroke: var(--sc-crust); stroke-width: 3" }, dog);
        svg("path", { d: "M-7 -4 v5 M6 -4 v5", class: "sc-thin", style: "stroke: var(--sc-crust); stroke-width: 3" }, dog);
        const xa = (h) => t.v1 * h, xb = (h) => t.S - t.v2 * h;
        function dogAt(h) { // km from the left; runs to the right friend first
          let p = 0, dir = 1, s = 0; const dt = 0.0005;
          for (s = 0; s < Math.min(h, meet); s += dt) {
            p += dir * t.dog * dt;
            if (dir > 0 && p >= xb(s)) { p = xb(s); dir = -1; } else if (dir < 0 && p <= xa(s)) { p = xa(s); dir = 1; }
          }
          return { p: h >= meet ? xa(meet) : p, dir };
        }
        let time = 0, touched = false;
        function paint() {
          const pa = X0 + xa(time) * k, pb = X0 + xb(time) * k, met = Math.abs(time - meet) < 1e-9;
          a.setAttribute("transform", `translate(${pa - (met ? 8 : 0)} ${TY - 20}) scale(0.95)`);
          b.setAttribute("transform", `translate(${pb + (met ? 8 : 0)} ${TY - 20}) scale(0.95)`);
          const mid = (pa + pb) / 2, close = Math.abs(pb - pa) < 76;
          la.setAttribute("x", Math.max(36, close ? mid - 38 : pa)); la.setAttribute("y", TY - 72);
          lb.setAttribute("x", Math.min(324, close ? mid + 38 : pb)); lb.setAttribute("y", TY - 72);
          const d = dogAt(time);
          dog.setAttribute("transform", `translate(${X0 + d.p * k} ${TY + 2}) scale(${d.dir} 1)`);
          clock.textContent = `t = ${num(time)} ч`;
        }
        const row = controls(el);
        const range = slider(row, "Время", 0, maxT, st, (h) => { time = h; touched = true; paint(); fire(el); });
        const field = numberField(row, "Собака пробежала", { min: 0, max: 200, unit: "км" }, () => fire(el));
        paint();
        const lock = lockable(el);
        return {
          value: () => (touched || field.value !== null ? { t: touched ? time : null, dog: field.value } : null),
          lock,
          reveal() {
            time = meet; touched = true; range.value = meet; field.set(t.dog * meet); paint();
            answerLine(el, t.reveal || `Скорость сближения ${t.v1} + ${t.v2} = ${t.v1 + t.v2} км/ч, встреча через ${t.S} : ${t.v1 + t.v2} = ${num(meet)} ч; собака: ${t.dog} · ${num(meet)} = ${t.dog * meet} км`);
          },
          reset() { time = 0; touched = false; range.value = 0; field.set(null); paint(); lock(false); },
          celebrate: () => celebrate(fig),
        };
      },
    },
  });
})();
