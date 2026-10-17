/* Scenes for Russian grades 7–9 (see js/scenes.js).
 * The videos write their example sentences on lined exercise-book paper with a red margin, so most scenes
 * start from that sheet. Shared pieces below: paper(), sentence() (words with a drop slot between every two),
 * marks() (punctuation tiles dragged into the slots), markScene() (the whole «put the marks» core), choices()
 * (a row of HTML answer buttons with nothing chosen at start). */
(function () {
  const IntScenes = typeof window !== "undefined" ? window.IntScenes : require("./scenes.js");
  const W = 360;
  const fire = (el) => el.dispatchEvent(new Event("change", { bubbles: true }));
  const same = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);
  // wrong answers: drop duplicates and anything equal to the solution
  const pick = (t, list) => {
    const seen = new Set([JSON.stringify(t.solution)]);
    return list.filter((v) => { const s = JSON.stringify(v); if (seen.has(s)) return false; seen.add(s); return true; }).slice(0, 4);
  };
  // wrong mark patterns: none at all, the first mark lost, every mark shifted one slot right, the first mark swapped
  const markWrong = (sol) => {
    const first = sol.findIndex(Boolean);
    const lost = sol.slice(); if (first >= 0) lost[first] = "";
    const shift = sol.map((_, i) => (i > 0 ? sol[i - 1] : ""));
    const swap = sol.slice(); if (first >= 0) swap[first] = sol[first] === "," ? "—" : ",";
    return [sol.map(() => ""), lost, shift, swap];
  };
  // "Он работал [спустя рукава] мечтая" → words; [..] keeps a set phrase as one card
  const tokens = (text) => {
    const out = [], re = /\[([^\]]+)\](\S*)|(\S+)/g;
    let m;
    while ((m = re.exec(text))) out.push(m[3] !== undefined ? { text: m[3] } : { text: m[1] + m[2], idiom: true });
    return out;
  };

  function paper(el, kit, H, aria) {
    const fig = kit.stage(el, W, H, aria);
    for (let y = 30; y < H - 8; y += 24) kit.svg("line", { x1: 8, y1: y, x2: W - 8, y2: y, class: "sc-r79-rule" }, fig);
    kit.svg("line", { x1: 30, y1: 6, x2: 30, y2: H - 6, class: "sc-r79-margin" }, fig);
    return fig;
  }
  function textW(fig, kit, s, cls, size) {
    const n = kit.label(fig, 0, -50, s, cls, "start");
    let w = 0;
    try { w = n.getComputedTextLength(); } catch (e) { w = 0; }
    n.remove();
    return Math.max(w, s.length * size * 0.52) || s.length * size * 0.6;
  }
  // lays out word widths / slot widths in lines; slots never start a line
  function flow(items, o) {
    let x = o.x0, y = o.y;
    return items.map((it) => {
      if (!it.slot && x + it.w > o.x1 && x > o.x0) { x = o.x0; y += o.lh; }
      const g = { x, y, w: it.w };
      x += it.w + (o.gap == null ? 3 : o.gap);
      return g;
    });
  }
  // a sentence with a mark slot between every two words; returns words and slot geometry
  function sentence(fig, kit, text, o) {
    const toks = tokens(text);
    const items = [];
    toks.forEach((tk, i) => {
      items.push({ w: textW(fig, kit, tk.text, "sc-r79-w", 18) + (tk.idiom ? 10 : 0) });
      if (i < toks.length - 1) items.push({ w: 24, slot: true });
    });
    const geo = flow(items, Object.assign({ x0: 40, x1: 334, y: 54, lh: 48 }, o));
    const words = [], slots = [];
    geo.forEach((g, i) => (i % 2 ? slots : words).push(g));
    words.forEach((g, i) => {
      g.text = toks[i].text;
      if (toks[i].idiom) g.card = kit.svg("rect", { x: g.x - 2, y: g.y - 21, width: g.w, height: 30, rx: 8, class: "sc-r79-idiom" }, fig);
      g.node = kit.label(fig, g.x + (toks[i].idiom ? 3 : 0), g.y, toks[i].text, "sc-r79-w", "start");
    });
    return { words, slots };
  }
  function tile(kit, m, w = 26) {
    const n = kit.svg("g", { class: "sc-r79-tile", "aria-label": `Знак «${m}»` });
    kit.svg("rect", { x: -w / 2, y: -18, width: w, height: 36, rx: 7 }, n);
    kit.label(n, 0, 7, m, "sc-r79-mark");
    return n;
  }
  // punctuation tiles in a tray, dragged into the slots; one tile per slot (a second one sends the first back)
  function marks(fig, kit, slots, tiles, tray, onDrop) {
    const zones = slots.map((s, i) => ({ id: "s" + i, x: s.x, y: s.y - 28, w: s.w, h: 38, label: `Место для знака ${i + 1}`, hideLabel: true, layout: () => [s.x + s.w / 2, s.y - 9] }));
    zones.push(Object.assign({ id: "tray", label: "Знаки", hideLabel: true, cell: 36 }, tray));
    const d = kit.dnd(fig, zones, (st, id, z) => {
      if (z !== "tray") d.itemsIn(z).filter((x) => x !== id).forEach((x) => d.place(x, "tray"));
      onDrop(id, z);
    });
    tiles.forEach((m, i) => d.add("m" + i, tile(kit, m), "tray"));
    return {
      d,
      value: () => slots.map((_, i) => { const it = d.itemsIn("s" + i)[0]; return it ? tiles[+it.slice(1)] : ""; }),
      set(arr) {
        tiles.forEach((_, i) => d.place("m" + i, "tray"));
        const used = new Set();
        arr.forEach((m, s) => {
          const j = m ? tiles.findIndex((x, i) => x === m && !used.has(i)) : -1;
          if (j >= 0) { used.add(j); d.place("m" + j, "s" + s); }
        });
      },
      lock: (on) => d.lock(on),
    };
  }
  // the whole «drag the marks into the sentence» task; o: { H, aria, hint, tray, backdrop(fig), x1, drop(id, zone) → false to bounce, paint(value) }
  function markScene(el, t, kit, o) {
    kit.hint(el, t.hint || o.hint || "Перетащите знаки в промежутки между словами (или нажмите на знак, потом на место)");
    const fig = paper(el, kit, o.H, o.aria);
    if (o.backdrop) o.backdrop(fig);
    const under = kit.svg("g", {}, fig);
    const s = sentence(fig, kit, t.text, { x0: o.x0 || 40, x1: o.x1 || 334, y: o.y || 54 });
    let touched = false;
    const paint = (v) => o.paint && o.paint(v);
    const m = marks(fig, kit, s.slots, t.tiles, o.tray, (id, z) => {
      if (o.drop && o.drop(id, z) === false) m.d.place(id, "tray");
      touched = true;
      paint(m.value());
      fire(el);
    });
    const lockF = kit.lockable(el);
    return {
      fig, under, s, m,
      ctrl: {
        value: () => (touched ? m.value() : null),
        lock(on) { lockF(on); m.lock(on); },
        reveal() { const sol = o.sol || t.solution; m.set(sol); paint(sol); kit.answerLine(el, t.reveal || t.answer); },
        reset() { m.set([]); touched = false; paint(m.value()); lockF(false); m.lock(false); },
        celebrate: () => kit.celebrate(fig),
      },
    };
  }
  // gold underlay for the words set off by the marks: between the first two, or from a single mark to the end
  function bracketHL(layer, kit, words, v, min = 1) {
    layer.textContent = "";
    const idx = (v || []).map((m, i) => (m ? i : -1)).filter((i) => i >= 0);
    if (idx.length < min) return null;
    const a = idx[0] + 1, b = idx.length > 1 ? idx[1] : words.length - 1;
    for (let i = a; i <= b; i++) kit.svg("rect", { x: words[i].x - 3, y: words[i].y - 20, width: words[i].w + 6, height: 27, rx: 6, class: "sc-r79-hl" }, layer);
    return [a, b];
  }
  // HTML answer buttons, nothing chosen at start
  function choices(el, opts, label, onPick) {
    const row = document.createElement("div");
    row.className = "task-toggle sc-r79-choices";
    row.setAttribute("role", "radiogroup");
    row.setAttribute("aria-label", label);
    let active = null;
    const btns = opts.map((html, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.setAttribute("role", "radio");
      b.innerHTML = html;
      b.addEventListener("click", () => { set(i); onPick(i); });
      row.appendChild(b);
      return b;
    });
    const set = (i) => {
      active = i;
      btns.forEach((b, j) => { b.classList.toggle("is-on", j === i); b.setAttribute("aria-checked", String(j === i)); });
    };
    set(null);
    el.appendChild(row);
    return { get active() { return active; }, set, buttons: btns };
  }
  // a rounded pill with centred text
  function pill(parent, kit, x, y, w, text, cls, tcls) {
    const g = kit.svg("g", {}, parent);
    kit.svg("rect", { x: x - w / 2, y: y - 17, width: w, height: 34, rx: 17, class: cls }, g);
    kit.label(g, x, y + 6, text, tcls || "sc-r79-on");
    return g;
  }

  IntScenes.add({
    /* ------------------------------------------------------- prich-window (rus-7-1)
     * «Мальчик, читающий книгу, сидел у окна»: commas go round the participial phrase that follows its noun;
     * the words between the commas light up. task: { text, tiles, solution: marks per slot } */
    "prich-window": {
      wrong: (t) => pick(t, markWrong(t.solution)),
      check: (t, v) => same(v, t.solution),
      build(el, t, kit) {
        const { svg } = kit;
        const S = markScene(el, t, kit, {
          H: 270, aria: "Предложение на тетрадном листе и мальчик с книгой у окна",
          tray: { x: 40, y: 206, w: 150, h: 50 },
          paint: (v) => bracketHL(S.under, kit, S.s.words, v),
        });
        const f = S.fig;
        svg("rect", { x: 232, y: 132, width: 108, height: 78, rx: 4, class: "sc-r79-glass" }, f);
        svg("path", { d: "M232 132 h108 v78 h-108 Z M286 132 v78 M232 170 h108", class: "sc-stroke" }, f);
        svg("rect", { x: 222, y: 208, width: 128, height: 9, rx: 3, class: "sc-crust" }, f);
        kit.art.kid(f, "teal", 0.9).setAttribute("transform", "translate(286 243) scale(0.9)");
        svg("rect", { x: 272, y: 220, width: 28, height: 18, rx: 2, class: "sc-gold" }, f);
        svg("line", { x1: 286, y1: 220, x2: 286, y2: 238, class: "sc-stroke" }, f);
        return S.ctrl;
      },
    },

    /* --------------------------------------------------------- ne-magnets (rus-7-2)
     * Word magnets on a fridge: tap the red «не» magnet to stick it to the word (слитно) or leave a gap (раздельно).
     * task: { items: [{ word }], solution: ["solid" | "apart", …] } */
    "ne-magnets": {
      wrong: (t) => pick(t, [t.solution.map((s) => (s === "solid" ? "apart" : "solid")), t.solution.map(() => "solid"), t.solution.map(() => "apart"),
        t.solution.map((s, i) => (i === 0 ? (s === "solid" ? "apart" : "solid") : s))]),
      check: (t, v) => same(v, t.solution),
      build(el, t, kit) {
        const { svg, label } = kit;
        kit.hint(el, t.hint || "Нажимайте на магнит «не»: прилепить к слову (слитно) или оставить зазор (раздельно)");
        const fig = kit.stage(el, W, 270, "Холодильник с магнитами-словами");
        svg("rect", { x: 12, y: 8, width: 336, height: 254, rx: 20, class: "sc-cream" }, fig);
        svg("line", { x1: 12, y1: 46, x2: 348, y2: 46, class: "sc-r79-seam" }, fig);
        svg("rect", { x: 150, y: 22, width: 60, height: 8, rx: 4, class: "sc-soft" }, fig);
        const state = t.items.map(() => null);
        const X = { null: 40, solid: 88, apart: 60 };
        const rows = t.items.map((it, i) => {
          const y = 92 + i * 64;
          const w = textW(fig, kit, it.word, "sc-r79-mag", 16) + 20;
          svg("rect", { x: 110, y: y - 17, width: w, height: 34, rx: 8, class: "sc-teal" }, fig);
          label(fig, 110 + w / 2, y + 6, it.word, "sc-r79-mag");
          const out = label(fig, 40, y + 36, "", "sc-r79-small", "start");
          const ne = svg("g", { class: "sc-r79-ne sc-tap", role: "button" }, fig);
          svg("rect", { x: -22, y: -17, width: 44, height: 34, rx: 8, class: "sc-red" }, ne);
          label(ne, 0, 6, "не", "sc-r79-mag");
          kit.toggleable(ne, () => { state[i] = state[i] === "solid" ? "apart" : "solid"; paint(); kit.pop(ne); fire(el); });
          return { ne, out, y, word: it.word };
        });
        function paint() {
          rows.forEach((r, i) => {
            const s = state[i];
            r.ne.style.transform = `translate(${X[s]}px, ${r.y}px) rotate(${s ? 0 : -12}deg)`;
            r.ne.setAttribute("aria-label", `«не» перед «${r.word}»: ${s === "solid" ? "слитно" : s === "apart" ? "раздельно" : "не выбрано"}`);
            r.out.textContent = s ? `→ ${s === "solid" ? "не" + r.word : "не " + r.word}` : "";
          });
        }
        paint();
        const lock = kit.lockable(el);
        return {
          value: () => (state.every((s) => s === null) ? null : state.slice()),
          lock,
          reveal() { t.solution.forEach((s, i) => (state[i] = s)); paint(); kit.answerLine(el, t.reveal || t.answer); },
          reset() { state.fill(null); paint(); lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },

    /* -------------------------------------------------------- hat-station (rus-7-3)
     * «Подъезжая к станции, у меня слетела шляпа» — then the hat drives the car. Pick the ending; the car shows
     * who is really driving up. task: { start, place, options: [{ text, doer: "hat"|"kid"|"phone", who }], solution: index } */
    "hat-station": {
      wrong: (t) => t.options.map((_, i) => i).filter((i) => i !== t.solution),
      check: (t, v) => v === t.solution,
      build(el, t, kit) {
        const { svg, label } = kit;
        kit.hint(el, t.hint || "Выберите окончание — в машине окажется тот, кто совершает действие");
        const fig = paper(el, kit, 250, "Машина подъезжает к станции; за рулём тот, кто совершает действие");
        label(fig, 40, 54, t.start, "sc-r79-w", "start");
        const end = label(fig, 40, 102, "…", "sc-r79-w sc-r79-teal", "start");
        svg("rect", { x: 8, y: 228, width: 344, height: 14, rx: 4, class: "sc-soft" }, fig);
        svg("rect", { x: 282, y: 150, width: 66, height: 78, rx: 4, class: "sc-blue" }, fig);
        svg("path", { d: "M276 152 L315 122 L354 152 Z", class: "sc-red" }, fig);
        label(fig, 315, 182, t.place, "sc-r79-tiny sc-r79-onfill");
        const car = svg("g", { class: "sc-r79-car" }, fig);
        svg("rect", { x: 92, y: 150, width: 72, height: 36, rx: 10, class: "sc-red" }, car);
        svg("rect", { x: 100, y: 156, width: 56, height: 26, rx: 6, class: "sc-r79-glass" }, car);
        svg("rect", { x: 60, y: 182, width: 138, height: 34, rx: 10, class: "sc-red" }, car);
        [92, 166].forEach((x) => svg("circle", { cx: x, cy: 216, r: 12, class: "sc-ink" }, car));
        const driver = svg("g", {}, car);
        const cap = label(fig, 128, 140, "Кто подъезжает? …", "sc-r79-small", "middle");
        const draw = (doer) => {
          driver.textContent = "";
          if (doer === "hat") {
            svg("ellipse", { cx: 128, cy: 178, rx: 22, ry: 5, class: "sc-violet" }, driver);
            svg("rect", { x: 115, y: 160, width: 26, height: 18, rx: 3, class: "sc-violet" }, driver);
          } else if (doer === "phone") {
            svg("rect", { x: 118, y: 158, width: 20, height: 26, rx: 4, class: "sc-ink" }, driver);
            svg("rect", { x: 121, y: 162, width: 14, height: 16, rx: 2, class: "sc-teal" }, driver);
          } else if (doer === "kid") {
            svg("circle", { cx: 128, cy: 166, r: 8, class: "sc-teal" }, driver);
            svg("rect", { x: 119, y: 174, width: 18, height: 10, rx: 4, class: "sc-teal" }, driver);
          } else label(driver, 128, 176, "?", "sc-r79-w");
        };
        let chosen = null;
        const show = (i) => {
          chosen = i;
          const o = i === null ? null : t.options[i];
          end.textContent = o ? o.text + "." : "…";
          cap.textContent = o ? `Подъезжает: ${o.who}${o.doer === "kid" ? "" : "?!"}` : "Кто подъезжает? …";
          draw(o && o.doer);
          if (o) kit.pop(car);
        };
        const ch = choices(el, t.options.map((o) => o.text), "Окончание предложения", (i) => { show(i); fire(el); });
        show(null);
        const lock = kit.lockable(el);
        return {
          value: () => chosen,
          lock,
          reveal() { ch.set(t.solution); show(t.solution); kit.answerLine(el, t.reveal || t.answer); },
          reset() { ch.set(null); show(null); lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },

    /* ------------------------------------------------------ adverb-blocks (rus-7-4)
     * Two blocks per adverb; pick a tool (клей — слитно, дефис, пробел — раздельно) and tap a pair to apply it.
     * task: { items: [{ a, b }], solution: ["solid"|"hyphen"|"space", …] } */
    "adverb-blocks": {
      wrong: (t) => pick(t, [t.solution.map(() => "solid"), t.solution.map(() => "space"), t.solution.map((s) => (s === "hyphen" ? "solid" : s)),
        t.solution.map((s) => (s === "space" ? "solid" : s))]),
      check: (t, v) => same(v, t.solution),
      build(el, t, kit) {
        const { svg, label } = kit;
        kit.hint(el, t.hint || "Выберите инструмент вверху и нажимайте на пары брусков");
        const fig = paper(el, kit, 274, "Бруски-части слов и инструменты: клей, дефис, пробел");
        const tools = [["solid", "слитно"], ["hyphen", "дефис"], ["space", "раздельно"]];
        let tool = 0;
        const toolG = tools.map(([id, name], i) => {
          const g = svg("g", { class: "sc-tap", role: "radio", "aria-label": `Инструмент: ${name}` }, fig);
          const bg = svg("rect", { x: 36 + i * 106, y: 8, width: 100, height: 40, rx: 10 }, g);
          if (id === "solid") svg("rect", { x: 44 + i * 106, y: 20, width: 12, height: 18, rx: 4, class: "sc-gold" }, g);
          if (id === "hyphen") svg("rect", { x: 42 + i * 106, y: 27, width: 16, height: 4, rx: 2, class: "sc-ink" }, g);
          if (id === "space") svg("path", { d: `M${42 + i * 106} 22 v14 h14 v-14`, class: "sc-stroke" }, g);
          label(g, 62 + i * 106, 34, name, "sc-r79-tiny", "start");
          kit.toggleable(g, () => { tool = i; paintTools(); });
          return { g, bg };
        });
        const paintTools = () => toolG.forEach((o, i) => {
          o.bg.setAttribute("class", i === tool ? "sc-r79-tool is-on" : "sc-r79-tool");
          o.g.setAttribute("aria-checked", String(i === tool));
        });
        paintTools();
        const state = t.items.map(() => null);
        const rows = t.items.map((it, i) => {
          const y = 88 + i * 48;
          const g = svg("g", { class: "sc-tap", role: "button" }, fig);
          kit.toggleable(g, () => { state[i] = tools[tool][0]; draw(i); kit.pop(g); fire(el); });
          return { g, y, wa: textW(fig, kit, it.a, "sc-r79-mag", 16) + 18, wb: textW(fig, kit, it.b, "sc-r79-mag", 16) + 18 };
        });
        function draw(i) {
          const r = rows[i], it = t.items[i], s = state[i], g = r.g;
          g.textContent = "";
          svg("rect", { x: 36, y: r.y - 20, width: 314, height: 40, rx: 8, class: "sc-r79-hit" }, g);
          const gap = { solid: 0, hyphen: 20, space: 34, null: 20 }[s];
          const xb = 44 + r.wa + gap;
          svg("rect", { x: 44, y: r.y - 16, width: r.wa, height: 32, rx: s === "solid" ? 0 : 8, class: "sc-gold" }, g);
          svg("rect", { x: xb, y: r.y - 16, width: r.wb, height: 32, rx: s === "solid" ? 0 : 8, class: "sc-teal" }, g);
          label(g, 44 + r.wa / 2, r.y + 6, it.a, "sc-r79-mag sc-r79-dark");
          label(g, xb + r.wb / 2, r.y + 6, it.b, "sc-r79-mag");
          if (s === "hyphen") svg("rect", { x: 44 + r.wa + 4, y: r.y - 2, width: 12, height: 4, rx: 2, class: "sc-ink" }, g);
          if (s === null) label(g, 44 + r.wa + 10, r.y + 6, "?", "sc-r79-small", "middle");
          g.setAttribute("aria-label", `${it.a} + ${it.b}: ${s ? tools.find((x) => x[0] === s)[1] : "не выбрано"}`);
        }
        rows.forEach((_, i) => draw(i));
        const lock = kit.lockable(el);
        return {
          value: () => (state.every((s) => s === null) ? null : state.slice()),
          lock,
          reveal() { t.solution.forEach((s, i) => { state[i] = s; draw(i); }); kit.answerLine(el, t.reveal || t.answer); },
          reset() { state.fill(null); rows.forEach((_, i) => draw(i)); tool = 0; paintTools(); lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },

    /* --------------------------------------------------------- tozhe-test (rus-7-5)
     * Two sentences with «то|же» / «так|же»: drag the «и» card under a sentence to test it, tap the word to
     * write it слитно or раздельно. task: { rows: [{ pre, a, b, post, test }], solution: ["solid"|"apart", …] } */
    "tozhe-test": {
      wrong: (t) => pick(t, [t.solution.map((s) => (s === "solid" ? "apart" : "solid")), t.solution.map(() => "solid"), t.solution.map(() => "apart")]),
      check: (t, v) => same(v, t.solution),
      build(el, t, kit) {
        const { svg, label } = kit;
        kit.hint(el, t.hint || "Перетащите карточку «и» под предложение, чтобы проверить; нажмите на слово: слитно или раздельно");
        const fig = paper(el, kit, 272, "Два предложения и карточка «и» для проверки");
        const state = t.rows.map(() => null);
        const rows = t.rows.map((r, i) => {
          const y = 54 + i * 100;
          const pw = r.pre ? textW(fig, kit, r.pre, "sc-r79-w", 18) : 0;
          if (r.pre) label(fig, 40, y, r.pre, "sc-r79-w", "start");
          const g = svg("g", { class: "sc-tap", role: "button" }, fig);
          kit.toggleable(g, () => { state[i] = state[i] === "solid" ? "apart" : "solid"; draw(i); kit.pop(g); fire(el); });
          const post = label(fig, 0, y, r.post, "sc-r79-w", "start");
          return { y, x: 40 + pw + (r.pre ? 8 : 0), g, post, wa: textW(fig, kit, r.a, "sc-r79-w", 18) + 10, wb: textW(fig, kit, r.b, "sc-r79-w", 18) + 10 };
        });
        function draw(i) {
          const r = rows[i], s = state[i], row = t.rows[i], g = r.g;
          g.textContent = "";
          const gap = s === "solid" ? 0 : s === "apart" ? 14 : 10;
          if (s === "solid") svg("rect", { x: r.x, y: r.y - 24, width: r.wa + r.wb, height: 34, rx: 7, class: "sc-r79-word" }, g);
          else [[r.x, r.wa], [r.x + r.wa + gap, r.wb]].forEach(([x, w]) => svg("rect", { x, y: r.y - 24, width: w, height: 34, rx: 7, class: "sc-r79-word" }, g));
          label(g, r.x + 5, r.y, row.a, "sc-r79-w", "start");
          label(g, r.x + r.wa + gap + 5, r.y, row.b, "sc-r79-w", "start");
          if (s === null) label(g, r.x + r.wa + 5, r.y - 26, "?", "sc-r79-small", "middle");
          r.post.setAttribute("x", r.x + r.wa + gap + r.wb + 8);
          g.setAttribute("aria-label", `${row.a}${row.b}: ${s === "solid" ? "слитно" : s === "apart" ? "раздельно" : "не выбрано"}`);
        }
        rows.forEach((_, i) => draw(i));
        const zones = rows.map((r, i) => ({ id: "z" + i, x: 36, y: r.y + 12, w: 312, h: 38, label: `Проверка предложения ${i + 1}`, hideLabel: true, layout: () => [60, r.y + 31] }));
        zones.push({ id: "home", x: 150, y: 222, w: 60, h: 44, label: "Карточка «и»", hideLabel: true, layout: () => [180, 244] });
        const d = kit.dnd(fig, zones, () => paintTests());
        const tests = rows.map((r) => label(fig, 84, r.y + 37, "", "sc-r79-small sc-r79-violet", "start"));
        const card = svg("g", { "aria-label": "Карточка «и»" });
        svg("rect", { x: -20, y: -17, width: 40, height: 34, rx: 8, class: "sc-violet" }, card);
        label(card, 0, 7, "и", "sc-r79-mag");
        d.add("i", card, "home");
        const paintTests = () => tests.forEach((n, i) => (n.textContent = d.zoneOf("i") === "z" + i ? t.rows[i].test : ""));
        const lockF = kit.lockable(el);
        return {
          value: () => (state.every((s) => s === null) ? null : state.slice()),
          lock(on) { lockF(on); d.lock(on); },
          reveal() { t.solution.forEach((s, i) => { state[i] = s; draw(i); }); kit.answerLine(el, t.reveal || t.answer); },
          reset() { state.fill(null); rows.forEach((_, i) => draw(i)); d.place("i", "home"); paintTests(); lockF(false); d.lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },

    /* -------------------------------------------------------- one-part-sky (rus-8-1)
     * «Уже светает.»: tap the main member (it gets underlined), then choose the kind of one-part sentence.
     * task: { text, pic: "dawn"|"door"|"night", types, solution: { base: [word indices], type } } */
    "one-part-sky": {
      wrong: (t) => {
        const n = tokens(t.text).length, b = t.solution.base, other = [...Array(n).keys()].find((i) => !b.includes(i));
        return pick(t, [{ base: b, type: (t.solution.type + 1) % t.types.length }, { base: [other], type: t.solution.type },
          { base: b, type: (t.solution.type + 2) % t.types.length }, { base: [other], type: (t.solution.type + 3) % t.types.length }]);
      },
      check: (t, v) => Boolean(v) && Array.isArray(v.base) && same([...v.base].sort((a, b) => a - b), t.solution.base) && v.type === t.solution.type,
      build(el, t, kit) {
        const { svg, label } = kit;
        kit.hint(el, t.hint || "Нажмите на главный член предложения, затем выберите вид");
        const fig = paper(el, kit, 230, "Односоставное предложение и картинка к нему");
        const toks = tokens(t.text);
        const geo = flow(toks.map((tk) => ({ w: textW(fig, kit, tk.text, "sc-r79-big", 24) })), { x0: 44, x1: 340, y: 64, lh: 48, gap: 12 });
        const base = new Set();
        const lines = svg("g", {}, fig);
        toks.forEach((tk, i) => {
          const g = svg("g", { class: "sc-tap", role: "checkbox", "aria-label": `Слово «${tk.text}»` }, fig);
          svg("rect", { x: geo[i].x - 4, y: geo[i].y - 30, width: geo[i].w + 8, height: 46, rx: 6, class: "sc-r79-hit" }, g);
          label(g, geo[i].x, geo[i].y, tk.text, "sc-r79-big", "start");
          kit.toggleable(g, () => { base.has(i) ? base.delete(i) : base.add(i); paint(); fire(el); });
          tk.g = g;
        });
        const paint = () => {
          lines.textContent = "";
          toks.forEach((tk, i) => {
            tk.g.setAttribute("aria-checked", String(base.has(i)));
            if (!base.has(i)) return;
            [8, 13].forEach((dy) => svg("line", { x1: geo[i].x, y1: geo[i].y + dy, x2: geo[i].x + geo[i].w - 4, y2: geo[i].y + dy, class: "sc-r79-under" }, lines));
          });
        };
        // the picture from the video's example
        const p = svg("g", {}, fig);
        if (t.pic === "dawn") {
          svg("path", { d: "M150 214 a50 50 0 0 1 100 0 Z", class: "sc-gold" }, p);
          [-60, -30, 0, 30, 60].forEach((a) => { const r = (a * Math.PI) / 180; svg("line", { x1: 200 + Math.sin(r) * 60, y1: 214 - Math.cos(r) * 60, x2: 200 + Math.sin(r) * 78, y2: 214 - Math.cos(r) * 78, class: "sc-r79-ray" }, p); });
          svg("rect", { x: 20, y: 212, width: 320, height: 10, rx: 4, class: "sc-teal" }, p);
        } else if (t.pic === "door") {
          svg("rect", { x: 160, y: 104, width: 70, height: 116, rx: 6, class: "sc-crust" }, p);
          svg("circle", { cx: 218, cy: 166, r: 5, class: "sc-gold" }, p);
          label(p, 280, 150, "тук-тук!", "sc-r79-small", "middle");
          svg("path", { d: "M240 140 q8 10 0 20 M252 134 q12 16 0 32", class: "sc-stroke" }, p);
        } else {
          svg("circle", { cx: 280, cy: 130, r: 22, class: "sc-gold" }, p);
          svg("circle", { cx: 292, cy: 122, r: 20, class: "sc-paper" }, p);
          [[80, 140], [130, 180], [190, 130], [230, 196], [60, 200]].forEach(([x, y]) => svg("circle", { cx: x, cy: y, r: 5, class: "sc-blue" }, p));
          svg("rect", { x: 20, y: 212, width: 320, height: 10, rx: 4, class: "sc-cream" }, p);
        }
        let type = null;
        const ch = choices(el, t.types, "Вид односоставного предложения", (i) => { type = i; fire(el); });
        const lock = kit.lockable(el);
        return {
          value: () => (base.size === 0 && type === null ? null : { base: [...base].sort((a, b) => a - b), type }),
          lock,
          reveal() { base.clear(); t.solution.base.forEach((i) => base.add(i)); paint(); type = t.solution.type; ch.set(type); kit.answerLine(el, t.reveal || t.answer); },
          reset() { base.clear(); paint(); type = null; ch.set(null); lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },

    /* ------------------------------------------------------- idiom-commas (rus-8-2)
     * Commas round the gerund phrase; the set phrase («спустя рукава») is a gold card that pushes commas
     * away. task: { text with [idiom], tiles, repel: [slot], repelNote, solution } */
    "idiom-commas": {
      wrong: (t) => pick(t, markWrong(t.solution).concat([t.solution.map((m, i) => (t.repel.includes(i) ? "," : m))])),
      check: (t, v) => same(v, t.solution),
      build(el, t, kit) {
        const { svg, label } = kit;
        let note;
        const S = markScene(el, t, kit, {
          H: 236, aria: "Предложение с фразеологизмом и запятые",
          tray: { x: 40, y: 168, w: 150, h: 50 },
          drop(id, z) {
            if (!t.repel.includes(+z.slice(1))) return true;
            note.textContent = t.repelNote || "Фразеологизм не выделяется!";
            S.s.words.filter((w) => w.card).forEach((w) => kit.pop(w.card));
            setTimeout(() => (note.textContent = ""), 1800);
            return false;
          },
        });
        const f = S.fig;
        // a horseshoe magnet: set phrases repel commas
        svg("path", { d: "M262 160 v26 a26 26 0 0 0 52 0 v-26 h-14 v26 a12 12 0 0 1 -24 0 v-26 Z", class: "sc-red" }, f);
        svg("rect", { x: 262, y: 160, width: 14, height: 10, class: "sc-cream" }, f);
        svg("rect", { x: 300, y: 160, width: 14, height: 10, class: "sc-cream" }, f);
        note = label(f, 196, 140, "", "sc-r79-small sc-r79-redtext", "middle");
        return S.ctrl;
      },
    },

    /* ------------------------------------------------------- decree-comma (rus-8-3)
     * The king's decree «Казнить нельзя помиловать»: where the comma goes decides whether the cage opens.
     * Also used for a parenthetical word (commas round «наверное»). task: { text, tiles, outcomes: [{ marks, show }], solution } */
    "decree-comma": {
      wrong: (t) => pick(t, markWrong(t.solution).concat((t.outcomes || []).map((o) => o.marks))),
      check: (t, v) => same(v, t.solution),
      build(el, t, kit) {
        const { svg, label } = kit;
        let cage, scroll;
        const S = markScene(el, t, kit, {
          H: 290, aria: "Указ на свитке и клетка с пленником", x1: 230, tray: { x: 40, y: 224, w: 150, h: 50 },
          hint: "Перетащите запятую в указ — посмотрите, что будет с пленником",
          backdrop(f) {
            scroll = [svg("rect", { x: 34, y: 14, width: 210, height: 116, rx: 6, class: "sc-cream" }, f),
              svg("rect", { x: 26, y: 8, width: 226, height: 12, rx: 6, class: "sc-crust" }, f),
              svg("rect", { x: 26, y: 124, width: 226, height: 12, rx: 6, class: "sc-crust" }, f)];
            cage = svg("g", {}, f);
          },
          paint(v) {
            const hl = bracketHL(S.under, kit, S.s.words, v, 2);
            const o = (t.outcomes || []).find((x) => same(x.marks, v));
            draw(o ? o.show : null, hl);
          },
        });
        const f = S.fig;
        const bottom = Math.max(124, Math.max(...S.s.words.map((w) => w.y)) + 18);
        scroll[0].setAttribute("height", bottom - 14);
        scroll[2].setAttribute("y", bottom);
        const res = label(f, 140, bottom + 36, "", "sc-r79-small", "middle");
        function draw(show) {
          cage.textContent = "";
          svg("rect", { x: 262, y: 40, width: 84, height: 8, rx: 3, class: "sc-ink" }, cage);
          svg("rect", { x: 262, y: 172, width: 84, height: 8, rx: 3, class: "sc-ink" }, cage);
          const kid = kit.art.kid(cage, show === "free" ? "teal" : "gold", 1);
          kid.setAttribute("transform", show === "free" ? "translate(304 232)" : "translate(304 148)");
          [268, 286, 322, 340].forEach((x) => svg("line", { x1: x, y1: 48, x2: x, y2: 172, class: "sc-r79-bar" }, cage));
          if (show === "free") svg("line", { x1: 304, y1: 48, x2: 352, y2: 20, class: "sc-r79-bar" }, cage);
          else svg("line", { x1: 304, y1: 48, x2: 304, y2: 172, class: "sc-r79-bar" }, cage);
          res.textContent = show === "free" ? t.freeText || "помиловали!" : show === "locked" ? t.lockedText || "остаётся в клетке" : "ждёт указа…";
        }
        draw(null);
        return S.ctrl;
      },
    },

    /* -------------------------------------------------------- fruit-colon (rus-8-4)
     * Fruit cards from the basket go into the word gaps, marks into the small gaps: «фрукты: яблоки, груши, сливы».
     * A carrot sneaks in too. task: { line, fruits: [{ id, word, kind }], tiles, solution: { words: [ids], marks } } */
    "fruit-colon": {
      wrong: (t) => {
        const s = t.solution, extra = t.fruits.find((f) => !s.words.includes(f.id)).id;
        return pick(t, [{ words: s.words, marks: s.marks.map(() => ",") }, { words: [extra].concat(s.words.slice(1)), marks: s.marks },
          { words: s.words, marks: markWrong(s.marks)[3] }, { words: s.words, marks: s.marks.map((m) => (m === "," ? "" : m)) }]);
      },
      check: (t, v) => Boolean(v) && Array.isArray(v.words) && v.words.every(Boolean) && v.words.length === t.solution.words.length
        && same([...v.words].sort(), [...t.solution.words].sort()) && same(v.marks, t.solution.marks),
      build(el, t, kit) {
        const { svg, label } = kit;
        kit.hint(el, t.hint || "Перетащите фрукты из корзины в предложение, а знаки — в маленькие промежутки");
        const fig = paper(el, kit, 286, "Предложение с пропусками, корзина с фруктами и знаки");
        const parts = t.line.split(" ").map((s) => (s === "#" ? { mark: true, w: 24 } : s[0] === "@" ? { fruit: true, w: 82, after: s.slice(1) } : { text: s }));
        const items = [];
        parts.forEach((p) => {
          items.push(p.text ? { w: textW(fig, kit, p.text, "sc-r79-w", 18) } : { w: p.w, slot: p.mark });
          if (p.after) items.push({ w: textW(fig, kit, p.after, "sc-r79-w", 18), slot: true });
        });
        const geo = flow(items, { x0: 34, x1: 352, y: 54, lh: 48, gap: 3 });
        const zones = [], fruitZones = [], markZones = [];
        let gi = 0;
        parts.forEach((p) => {
          const g = geo[gi++];
          if (p.text) label(fig, g.x, g.y, p.text, "sc-r79-w", "start");
          else if (p.mark) { markZones.push("s" + markZones.length); zones.push({ id: markZones[markZones.length - 1], x: g.x, y: g.y - 28, w: g.w, h: 38, hideLabel: true, label: "Место для знака", layout: () => [g.x + g.w / 2, g.y - 9] }); }
          else { const id = "w" + fruitZones.length; fruitZones.push({ id, cap: g === geo[0] }); zones.push({ id, x: g.x, y: g.y - 28, w: g.w, h: 38, hideLabel: true, label: "Место для слова", layout: () => [g.x + g.w / 2, g.y - 9] }); }
          if (p.after) { const a = geo[gi++]; label(fig, a.x, a.y, p.after, "sc-r79-w", "start"); }
        });
        // basket
        svg("path", { d: "M34 200 h196 l-14 76 h-168 Z", class: "sc-crust" }, fig);
        zones.push({ id: "basket", x: 34, y: 172, w: 196, h: 104, cls: "sc-r79-clear", hideLabel: true, label: "Корзина", layout: (i) => [80 + (i % 2) * 96, 196 + Math.floor(i / 2) * 42] });
        zones.push({ id: "tray", x: 244, y: 180, w: 108, h: 88, hideLabel: true, label: "Знаки", layout: (i) => [262 + (i % 3) * 36, 202 + Math.floor(i / 3) * 42] });
        let touched = false;
        const d = kit.dnd(fig, zones, (st, id, z) => {
          const isFruit = id[0] === "f";
          if (z !== "basket" && z !== "tray") {
            if (isFruit !== (z[0] === "w")) d.place(id, isFruit ? "basket" : "tray");
            else d.itemsIn(z).filter((x) => x !== id).forEach((x) => d.place(x, x[0] === "f" ? "basket" : "tray"));
          } else if ((z === "tray") === isFruit) d.place(id, isFruit ? "basket" : "tray");
          touched = true;
          paintWords();
          fire(el);
        });
        const icon = {
          apple: (g) => { svg("circle", { cx: -28, cy: 0, r: 9, class: "sc-red" }, g); svg("ellipse", { cx: -25, cy: -10, rx: 4, ry: 2, class: "sc-teal" }, g); },
          pear: (g) => { svg("circle", { cx: -28, cy: 3, r: 8, class: "sc-gold" }, g); svg("circle", { cx: -28, cy: -5, r: 5, class: "sc-gold" }, g); },
          plum: (g) => svg("ellipse", { cx: -28, cy: 0, rx: 7, ry: 9, class: "sc-violet" }, g),
          berry: (g) => [[-31, -3], [-25, -3], [-28, 3]].forEach(([x, y]) => svg("circle", { cx: x, cy: y, r: 4.5, class: "sc-red" }, g)),
          blue: (g) => [[-31, -3], [-25, -3], [-28, 3]].forEach(([x, y]) => svg("circle", { cx: x, cy: y, r: 4.5, class: "sc-blue" }, g)),
          carrot: (g) => { svg("path", { d: "M-34 -6 L-22 -6 L-28 10 Z", class: "sc-crust" }, g); svg("path", { d: "M-31 -6 l-3 -6 M-28 -6 v-7 M-25 -6 l3 -6", class: "sc-r79-leaf" }, g); },
          cucumber: (g) => svg("ellipse", { cx: -28, cy: 0, rx: 9, ry: 5, class: "sc-teal" }, g),
        };
        const words = {};
        t.fruits.forEach((fr) => {
          const g = svg("g", { "aria-label": fr.word });
          svg("rect", { x: -40, y: -16, width: 80, height: 32, rx: 8, class: "sc-r79-word" }, g);
          icon[fr.kind](g);
          words[fr.id] = label(g, 9, 5, fr.word, "sc-r79-fruit", "middle");
          d.add("f" + fr.id, g, "basket");
        });
        t.tiles.forEach((m, i) => d.add("m" + i, tile(kit, m), "tray"));
        const paintWords = () => t.fruits.forEach((fr) => {
          const z = fruitZones.find((x) => x.id === d.zoneOf("f" + fr.id));
          words[fr.id].textContent = z && z.cap ? fr.word[0].toUpperCase() + fr.word.slice(1) : fr.word;
        });
        const value = () => ({
          words: fruitZones.map((z) => { const it = d.itemsIn(z.id)[0]; return it ? it.slice(1) : ""; }),
          marks: markZones.map((z) => { const it = d.itemsIn(z)[0]; return it ? t.tiles[+it.slice(1)] : ""; }),
        });
        const home = () => { t.fruits.forEach((fr) => d.place("f" + fr.id, "basket")); t.tiles.forEach((_, i) => d.place("m" + i, "tray")); };
        const lockF = kit.lockable(el);
        return {
          value: () => (touched ? value() : null),
          lock(on) { lockF(on); d.lock(on); },
          reveal() {
            home();
            t.solution.words.forEach((id, i) => d.place("f" + id, fruitZones[i].id));
            const used = new Set();
            t.solution.marks.forEach((m, s) => { const j = m ? t.tiles.findIndex((x, i) => x === m && !used.has(i)) : -1; if (j >= 0) { used.add(j); d.place("m" + j, "s" + s); } });
            paintWords();
            kit.answerLine(el, t.reveal || t.answer);
          },
          reset() { home(); paintWords(); touched = false; lockF(false); d.lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },

    /* ------------------------------------------------------ vocative-call (rus-8-5)
     * Two sentences: tap the word that names who is spoken to — commas appear round it and the speaker's
     * arrow points at that person. task: { rows: [text], speaker: { name, color }, people: [{ name, word, color }], solution: [index | −1] } */
    "vocative-call": {
      wrong: (t) => pick(t, [t.solution.map(() => -1), t.solution.map((s) => (s >= 0 ? -1 : 0)), t.solution.map(() => 0), t.solution.slice().reverse()]),
      check: (t, v) => same(v, t.solution),
      build(el, t, kit) {
        const { svg, label } = kit;
        kit.hint(el, t.hint || "Нажмите на обращение — слово, которое называет того, к кому обращаются. Если его нет, ничего не нажимайте");
        const fig = paper(el, kit, 262, "Два предложения и люди: кто говорит и к кому обращаются");
        const state = t.rows.map(() => -1);
        let last = 0;
        const rowsG = t.rows.map(() => svg("g", {}, fig));
        const strip = (w) => w.replace(/[.,!?]/g, "").toLowerCase();
        function drawRow(r) {
          const g = rowsG[r];
          g.textContent = "";
          const toks = t.rows[r].split(" ");
          const a = state[r];
          const shown = toks.map((w, i) => (i === a && i < toks.length - 1 && !/[,.!?]$/.test(w) ? w + "," : w));
          const items = shown.map((w) => ({ w: textW(fig, kit, w, "sc-r79-w", 18) }));
          const geo = flow(items, { x0: 40, x1: 340, y: 50 + r * 56, lh: 44, gap: 8 });
          shown.forEach((w, i) => {
            const n = svg("g", { class: "sc-tap", role: "checkbox", "aria-checked": String(i === a), "aria-label": `«${strip(toks[i])}» — обращение?` }, g);
            svg("rect", { x: geo[i].x - 3, y: geo[i].y - 24, width: geo[i].w + 6, height: 36, rx: 6, class: i === a ? "sc-r79-hl" : "sc-r79-hit" }, n);
            label(n, geo[i].x, geo[i].y, w, "sc-r79-w", "start");
            kit.toggleable(n, () => { state[r] = state[r] === i ? -1 : i; last = r; drawRow(r); paintPic(); fire(el); });
          });
          // comma before the addressee when it is not first
          if (a > 0 && !/,$/.test(toks[a - 1])) label(g, geo[a].x - 7, geo[a].y, ",", "sc-r79-w sc-r79-redtext", "middle");
        }
        // the people
        const pic = svg("g", {}, fig);
        const spk = kit.art.kid(pic, t.speaker.color, 1.1);
        spk.setAttribute("transform", "translate(60 214) scale(1.1)");
        label(pic, 60, 256, t.speaker.name, "sc-r79-tiny", "middle");
        const ppl = t.people.map((p, j) => {
          const x = 200 + j * 70;
          const g = svg("g", {}, pic);
          for (let k = 0; k < (p.n || 1); k++) kit.art.kid(g, p.color, 0.9).setAttribute("transform", `translate(${x + (k - ((p.n || 1) - 1) / 2) * 26} 220) scale(0.9)`);
          label(pic, x, 256, p.name, "sc-r79-tiny", "middle");
          return { g, x, word: p.word };
        });
        const arrow = svg("g", {}, fig);
        const paintPic = () => {
          arrow.textContent = "";
          const a = state[last];
          const w = a >= 0 ? strip(t.rows[last].split(" ")[a]) : null;
          const p = ppl.find((q) => q.word === w);
          ppl.forEach((q) => q.g.setAttribute("class", q === p ? "sc-r79-heard" : ""));
          if (p) {
            svg("path", { d: `M84 166 Q${(84 + p.x) / 2} 128 ${p.x - 16} 166`, class: "sc-r79-arrow" }, arrow);
            svg("path", { d: `M${p.x - 16} 166 l-11 -3 l6 -9 Z`, class: "sc-red" }, arrow);
          }
        };
        rowsG.forEach((_, r) => drawRow(r));
        paintPic();
        let touched = false;
        fig.addEventListener("click", () => (touched = true), true);
        fig.addEventListener("keydown", () => (touched = true), true);
        const lock = kit.lockable(el);
        return {
          value: () => (touched || state.some((s) => s >= 0) ? state.slice() : null),
          lock,
          reveal() { t.solution.forEach((s, r) => { state[r] = s; drawRow(r); }); last = Math.max(0, t.solution.findIndex((s) => s >= 0)); paintPic(); kit.answerLine(el, t.reveal || t.answer); },
          reset() { state.fill(-1); touched = false; rowsG.forEach((_, r) => drawRow(r)); paintPic(); lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },

    /* ------------------------------------------------------ speech-bubble (rus-8-6)
     * Mum's words in a speech bubble: tap the pieces and marks in the right order to build the sentence
     * (tap a placed piece to take it back). task: { pieces: [..], solution: [pieces in order] } */
    "speech-bubble": {
      wrong: (t) => {
        const s = t.solution, sw = (a, i, j) => { const b = a.slice(); [b[i], b[j]] = [b[j], b[i]]; return b; };
        return pick(t, [sw(s, s.length - 1, s.length - 2), s.slice(0, -1), sw(s, 0, 1), s.filter((x) => x !== "«" && x !== "»")]);
      },
      check: (t, v) => same(v, t.solution),
      build(el, t, kit) {
        const { svg, label } = kit;
        kit.hint(el, t.hint || "Нажимайте на кусочки внизу по порядку; нажатие на кусочек в облачке возвращает его");
        const fig = paper(el, kit, 268, "Облачко с речью мамы и кусочки предложения");
        kit.art.kid(fig, "violet", 1).setAttribute("transform", "translate(52 100)");
        label(fig, 52, 134, t.speaker || "мама", "sc-r79-tiny", "middle");
        svg("path", { d: "M92 14 h250 a10 10 0 0 1 10 10 v100 a10 10 0 0 1 -10 10 h-240 a10 10 0 0 1 -10 -10 v-50 l-18 -6 l18 -10 v-34 a10 10 0 0 1 10 -10 Z", class: "sc-cream" }, fig);
        const line = svg("g", {}, fig), tray = svg("g", {}, fig);
        const seq = [];
        const ws = t.pieces.map((p) => (p.length > 1 ? textW(fig, kit, p, "sc-r79-w", 18) + 16 : 26));
        function draw() {
          line.textContent = "";
          tray.textContent = "";
          const g1 = flow(seq.map((i) => ({ w: ws[i] })), { x0: 98, x1: 346, y: 52, lh: 44, gap: 2 });
          seq.forEach((i, k) => {
            const g = svg("g", { class: "sc-tap", role: "button", "aria-label": `Убрать «${t.pieces[i]}»` }, line);
            svg("rect", { x: g1[k].x, y: g1[k].y - 22, width: ws[i], height: 34, rx: 7, class: t.pieces[i].length > 1 ? "sc-r79-word" : "sc-r79-tilebg" }, g);
            label(g, g1[k].x + ws[i] / 2, g1[k].y + 2, t.pieces[i], t.pieces[i].length > 1 ? "sc-r79-w" : "sc-r79-mark", "middle");
            kit.toggleable(g, () => { seq.splice(k, 1); draw(); fire(el); });
          });
          if (!seq.length) label(line, 220, 78, "…", "sc-r79-w", "middle");
          const free = t.pieces.map((_, i) => i).filter((i) => !seq.includes(i));
          const g2 = flow(free.map((i) => ({ w: ws[i] })), { x0: 24, x1: 346, y: 184, lh: 46, gap: 8 });
          free.forEach((i, k) => {
            const g = svg("g", { class: "sc-tap", role: "button", "aria-label": `Добавить «${t.pieces[i]}»` }, tray);
            svg("rect", { x: g2[k].x, y: g2[k].y - 22, width: ws[i], height: 34, rx: 7, class: t.pieces[i].length > 1 ? "sc-r79-word" : "sc-r79-tilebg" }, g);
            label(g, g2[k].x + ws[i] / 2, g2[k].y + 2, t.pieces[i], t.pieces[i].length > 1 ? "sc-r79-w" : "sc-r79-mark", "middle");
            kit.toggleable(g, () => { seq.push(i); draw(); fire(el); });
          });
        }
        draw();
        const lock = kit.lockable(el);
        const relock = () => el.classList.contains("is-locked") && lock(true);
        return {
          value: () => (seq.length ? seq.map((i) => t.pieces[i]) : null),
          lock,
          reveal() { seq.length = 0; t.solution.forEach((p) => seq.push(t.pieces.indexOf(p))); draw(); relock(); kit.answerLine(el, t.reveal || t.answer); },
          reset() { seq.length = 0; draw(); lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },

    /* ------------------------------------------------------- spp-brackets (rus-9-1)
     * Tap each part: [ главная ] or ( придаточная ); the scheme below draws the arrow from the main part to the
     * subordinate one — choose the question it asks. task: { parts: [..], end, questions, solution: { marks: ["main"|"sub"], q } } */
    "spp-brackets": {
      wrong: (t) => {
        const s = t.solution, flip = s.marks.map((m) => (m === "main" ? "sub" : "main"));
        return pick(t, [{ marks: flip, q: s.q }, { marks: s.marks, q: (s.q + 1) % t.questions.length }, { marks: s.marks.map(() => "main"), q: s.q }]);
      },
      check: (t, v) => Boolean(v) && same(v.marks, t.solution.marks) && v.q === t.solution.q,
      build(el, t, kit) {
        const { svg, label } = kit;
        kit.hint(el, t.hint || "Нажимайте на части: [ ] — главная, ( ) — придаточная; затем выберите вопрос");
        const fig = paper(el, kit, 250, "Сложноподчинённое предложение и его схема");
        const marks = t.parts.map(() => null);
        const texts = t.parts.map((p, i) => p + (i < t.parts.length - 1 ? "," : t.end || "."));
        const pw = t.parts.map((p) => textW(fig, kit, p, "sc-r79-w", 18));
        const geo = flow(pw.map((w) => ({ w: w + 30 })), { x0: 40, x1: 346, y: 54, lh: 48, gap: 6 });
        const partG = texts.map((p, i) => {
          const g = svg("g", { class: "sc-tap", role: "button" }, fig);
          kit.toggleable(g, () => { marks[i] = marks[i] === "main" ? "sub" : "main"; draw(); kit.pop(g); fire(el); });
          return g;
        });
        const scheme = svg("g", {}, fig);
        let q = null;
        function draw() {
          texts.forEach((p, i) => {
            const g = partG[i], m = marks[i], x = geo[i].x, y = geo[i].y, comma = i < t.parts.length - 1 ? "," : t.end || ".";
            g.textContent = "";
            svg("rect", { x: x - 2, y: y - 26, width: geo[i].w, height: 38, rx: 6, class: "sc-r79-hit" }, g);
            const br = m === "main" ? ["[", "]"] : m === "sub" ? ["(", ")"] : ["", ""];
            const cls = m === "sub" ? "sc-r79-w sc-r79-redtext" : "sc-r79-w";
            label(g, x + 2, y, br[0], cls, "start");
            label(g, x + 12, y, t.parts[i], cls, "start");
            label(g, x + 13 + pw[i], y, br[1], cls, "start");
            label(g, x + 22 + pw[i], y, comma, "sc-r79-w", "start");
            g.setAttribute("aria-label", `«${t.parts[i]}»: ${m === "main" ? "главная" : m === "sub" ? "придаточная" : "не размечена"}`);
          });
          scheme.textContent = "";
          const n = t.parts.length, step = 300 / n;
          const cx = (i) => 40 + step * (i + 0.5);
          t.parts.forEach((p, i) => {
            const m = marks[i];
            const txt = m === "main" ? "[ ]" : m === "sub" ? `(${p.split(" ")[0].toLowerCase()}…)` : "?";
            pill(scheme, kit, cx(i), 210, Math.min(step - 10, 104), txt, m === "main" ? "sc-ink" : m === "sub" ? "sc-red" : "sc-r79-word", m ? "sc-r79-on" : "sc-r79-small");
          });
          const from = marks.indexOf("main");
          marks.forEach((m, i) => {
            if (m !== "sub" || from < 0) return;
            const x1 = cx(from), x2 = cx(i), top = 150;
            svg("path", { d: `M${x1} 190 Q${(x1 + x2) / 2} ${top} ${x2} 190`, class: "sc-r79-arrow" }, scheme);
            svg("path", { d: `M${x2} 192 l${x2 > x1 ? -10 : 10} -8 l${x2 > x1 ? 2 : -2} 10 Z`, class: "sc-red" }, scheme);
            label(scheme, (x1 + x2) / 2, 166, q === null ? "?" : t.questions[q], "sc-r79-small sc-r79-redtext", "middle");
          });
        }
        draw();
        const ch = choices(el, t.questions, "Вопрос от главной части к придаточной", (i) => { q = i; draw(); fire(el); });
        const lock = kit.lockable(el);
        return {
          value: () => (marks.every((m) => m === null) && q === null ? null : { marks: marks.slice(), q }),
          lock,
          reveal() { t.solution.marks.forEach((m, i) => (marks[i] = m)); q = t.solution.q; ch.set(q); draw(); kit.answerLine(el, t.reveal || t.answer); },
          reset() { marks.fill(null); q = null; ch.set(null); draw(); lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },

    /* --------------------------------------------------------- essay-plan (rus-9-2)
     * The essay page with four blocks (тезис, аргумент 1, аргумент 2, вывод): drag each opening phrase into its
     * block. task: { blocks: [names], cards: [phrases], solution: [card index per block] } */
    "essay-plan": {
      wrong: (t) => {
        const s = t.solution, sw = (i, j) => { const b = s.slice(); [b[i], b[j]] = [b[j], b[i]]; return b; };
        return pick(t, [sw(1, 2), sw(0, 3), s.slice().reverse()]);
      },
      check: (t, v) => same(v, t.solution),
      build(el, t, kit) {
        const { svg, label } = kit;
        kit.hint(el, t.hint || "Перетащите каждую фразу в свою часть сочинения (или нажмите на фразу, потом на часть)");
        const fig = paper(el, kit, 300, "Страница сочинения из четырёх частей и фразы для них");
        t.blocks.forEach((b, i) => label(fig, 40, 40 + i * 44, `${i + 1}. ${b}`, "sc-r79-small", "start"));
        const zones = t.blocks.map((b, i) => ({ id: "b" + i, x: 150, y: 14 + i * 44, w: 200, h: 38, hideLabel: true, label: `Часть «${b}»`, layout: () => [250, 33 + i * 44] }));
        const order = kit.shuffled(t.cards.length);
        zones.push({ id: "tray", x: 14, y: 194, w: 332, h: 96, hideLabel: true, label: "Фразы", layout: (i) => [98 + (i % 2) * 166, 220 + Math.floor(i / 2) * 44] });
        let touched = false;
        const d = kit.dnd(fig, zones, (st, id, z) => {
          if (z !== "tray") d.itemsIn(z).filter((x) => x !== id).forEach((x) => d.place(x, "tray"));
          touched = true;
          fire(el);
        });
        order.forEach((i) => {
          const g = svg("g", { "aria-label": t.cards[i] });
          svg("rect", { x: -83, y: -17, width: 166, height: 34, rx: 8, class: "sc-r79-word" }, g);
          label(g, 0, 5, t.cards[i], "sc-r79-card", "middle");
          d.add("c" + i, g, "tray");
        });
        const home = () => t.cards.forEach((_, i) => d.place("c" + i, "tray"));
        const lockF = kit.lockable(el);
        return {
          value: () => (touched ? t.blocks.map((_, i) => { const it = d.itemsIn("b" + i)[0]; return it ? +it.slice(1) : -1; }) : null),
          lock(on) { lockF(on); d.lock(on); },
          reveal() { home(); t.solution.forEach((c, i) => d.place("c" + c, "b" + i)); kit.answerLine(el, t.reveal || t.answer); },
          reset() { home(); touched = false; lockF(false); d.lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },

    /* ----------------------------------------------------- sun-birds-comma (rus-9-3)
     * «Светило солнце, и пели птицы»: decide the comma before «и»; if a word is shared by both parts («Утром …»),
     * tap it — an umbrella spreads over the whole sentence and the comma goes. task: { text, andAt, solution: { comma, common } } */
    "sun-birds-comma": {
      wrong: (t) => {
        const s = t.solution;
        return pick(t, [{ comma: !s.comma, common: s.common }, { comma: s.comma, common: s.common < 0 ? 0 : -1 }, { comma: !s.comma, common: s.common < 0 ? 1 : -1 }]);
      },
      check: (t, v) => Boolean(v) && v.comma === t.solution.comma && v.common === t.solution.common,
      build(el, t, kit) {
        const { svg, label } = kit;
        kit.hint(el, t.hint || "Если у частей есть общее слово, нажмите на него; затем решите, нужна ли запятая перед «и»");
        const fig = paper(el, kit, 236, "Предложение с союзом «и», солнце и птицы");
        const toks = tokens(t.text);
        const items = [];
        toks.forEach((tk, i) => { items.push({ w: textW(fig, kit, tk.text, "sc-r79-w", 18) }); if (i === t.andAt) items.push({ w: 26, slot: true }); });
        const geo = flow(items, { x0: 40, x1: 350, y: 78, lh: 48, gap: 5 });
        const slotG = geo[t.andAt + 1];
        const wg = geo.filter((_, i) => i !== t.andAt + 1);
        const umb = svg("g", {}, fig);
        let common = -1, comma = null;
        const words = toks.map((tk, i) => {
          const g = svg("g", { class: "sc-tap", role: "checkbox", "aria-label": `«${tk.text}» — общий член?` }, fig);
          const bg = svg("rect", { x: wg[i].x - 3, y: wg[i].y - 24, width: wg[i].w + 6, height: 36, rx: 6, class: "sc-r79-hit" }, g);
          label(g, wg[i].x, wg[i].y, tk.text, "sc-r79-w", "start");
          kit.toggleable(g, () => { common = common === i ? -1 : i; paint(); fire(el); });
          return { g, bg };
        });
        svg("rect", { x: slotG.x, y: slotG.y - 26, width: 24, height: 36, rx: 6, class: "sc-zone" }, fig);
        const commaT = label(fig, slotG.x + 12, slotG.y, "", "sc-r79-mark sc-r79-redtext", "middle");
        // sun and birds
        svg("circle", { cx: 300, cy: 176, r: 24, class: "sc-gold" }, fig);
        [[60, 186], [118, 172], [176, 192]].forEach(([x, y]) => {
          svg("ellipse", { cx: x, cy: y, rx: 14, ry: 9, class: "sc-violet" }, fig);
          svg("path", { d: `M${x + 12} ${y - 2} l9 2 l-9 3 Z`, class: "sc-gold" }, fig);
          label(fig, x + 4, y - 16, "♪", "sc-r79-small", "middle");
        });
        function paint() {
          words.forEach((w, i) => { w.bg.setAttribute("class", i === common ? "sc-r79-hl" : "sc-r79-hit"); w.g.setAttribute("aria-checked", String(i === common)); });
          umb.textContent = "";
          if (common >= 0) {
            const a = wg[common], x2 = wg[wg.length - 1];
            const right = x2.y === a.y ? x2.x + x2.w : 340;
            svg("path", { d: `M${a.x} ${a.y - 30} Q${(a.x + right) / 2} ${a.y - 58} ${right} ${a.y - 30}`, class: "sc-r79-arrow sc-r79-teal-stroke" }, umb);
            label(umb, (a.x + right) / 2, a.y - 50, "общее слово", "sc-r79-tiny sc-r79-teal", "middle");
          }
          commaT.textContent = comma === true ? "," : comma === false ? "∅" : "";
        }
        paint();
        const ch = choices(el, ["ставим запятую", "запятая не нужна"], "Запятая перед «и»", (i) => { comma = i === 0; paint(); fire(el); });
        const lock = kit.lockable(el);
        return {
          value: () => (comma === null ? null : { comma, common }),
          lock,
          reveal() { comma = t.solution.comma; common = t.solution.common; ch.set(comma ? 0 : 1); paint(); kit.answerLine(el, t.reveal || t.answer); },
          reset() { comma = null; common = -1; ch.set(null); paint(); lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },

    /* ------------------------------------------------------- spring-conj (rus-9-4)
     * A sentence with no conjunction: try conjunction cards in the gap to hear the meaning, then drag the mark
     * (, : —) into the slot. task: { a, b, pic, conj: [..], tiles, solution: mark } */
    "spring-conj": {
      wrong: (t) => t.tiles.filter((m) => m !== t.solution),
      check: (t, v) => typeof v === "string" && v === t.solution,
      build(el, t, kit) {
        const { svg, label } = kit;
        kit.hint(el, t.hint || "Подставьте союз в пропуск, чтобы понять смысл, затем перетащите знак на место");
        const fig = paper(el, kit, 286, "Бессоюзное предложение, карточки союзов и знаки");
        const wa = textW(fig, kit, t.a, "sc-r79-w", 18);
        label(fig, 40, 54, t.a, "sc-r79-w", "start");
        label(fig, 40, 102, t.b, "sc-r79-w", "start");
        const slot = { x: 40 + wa + 3, y: 54, w: 24 };
        let touched = false;
        const m = marks(fig, kit, [slot], t.tiles, { x: 40, y: 222, w: 130, h: 50, cell: 40 }, () => { touched = true; fire(el); });
        const gx = slot.x + 30;
        const cw = (s) => textW(fig, kit, s, "sc-r79-card", 15) + 18;
        const zones = [{ id: "gap", x: gx, y: 26, w: 346 - gx, h: 38, hideLabel: true, label: "Пропуск для союза", layout: () => [gx + cw(cur() || "и") / 2 + 2, 45] }];
        const pos = [];
        let x = 30, y = 150;
        t.conj.forEach((c) => { const w = cw(c); if (x + w > 346) { x = 30; y += 42; } pos.push([x + w / 2, y, w]); x += w + 10; });
        t.conj.forEach((c, i) => zones.push({ id: "h" + i, x: pos[i][0] - pos[i][2] / 2 - 3, y: pos[i][1] - 19, w: pos[i][2] + 6, h: 38, cls: "sc-r79-clear", hideLabel: true, label: `Место союза «${c}»`, layout: () => [pos[i][0], pos[i][1]] }));
        const d = kit.dnd(fig, zones, (st, id, z) => {
          if (z === "gap") d.itemsIn("gap").filter((q) => q !== id).forEach((q) => d.place(q, "h" + q.slice(1)));
          else if (z !== "h" + id.slice(1)) d.place(id, "h" + id.slice(1));
        });
        const cur = () => { const it = d && d.itemsIn("gap")[0]; return it ? t.conj[+it.slice(1)] : null; };
        t.conj.forEach((c, i) => {
          const g = svg("g", { "aria-label": `Союз «${c}»` });
          svg("rect", { x: -cw(c) / 2, y: -16, width: cw(c), height: 32, rx: 16, class: "sc-violet" }, g);
          label(g, 0, 5, c, "sc-r79-card sc-r79-onfill", "middle");
          d.add("c" + i, g, "h" + i);
        });
        // the picture
        const p = svg("g", {}, fig);
        if (t.pic === "flower") {
          svg("rect", { x: 284, y: 236, width: 5, height: 36, class: "sc-teal" }, p);
          [0, 72, 144, 216, 288].forEach((a) => { const r = (a * Math.PI) / 180; svg("circle", { cx: 286 + Math.sin(r) * 13, cy: 234 - Math.cos(r) * 13, r: 9, class: "sc-red" }, p); });
          svg("circle", { cx: 286, cy: 234, r: 7, class: "sc-gold" }, p);
        } else if (t.pic === "leaf") {
          svg("path", { d: "M250 270 Q262 222 318 226 Q312 270 250 270 Z", class: "sc-crust" }, p);
          svg("path", { d: "M252 268 L312 230", class: "sc-stroke" }, p);
        } else {
          [230, 252, 274, 296, 318].forEach((x, i) => { svg("path", { d: `M${x} 276 Q${x + 4} 250 ${x + 12 + i * 2} 228`, class: "sc-r79-reed" }, p); svg("ellipse", { cx: x + 12 + i * 2, cy: 234, rx: 4, ry: 10, class: "sc-crust" }, p); });
        }
        const lockF = kit.lockable(el);
        return {
          value: () => (touched && m.value()[0] ? m.value()[0] : null),
          lock(on) { lockF(on); m.lock(on); d.lock(on); },
          reveal() { m.set([t.solution]); kit.answerLine(el, t.reveal || t.answer); },
          reset() { m.set([]); t.conj.forEach((_, i) => d.place("c" + i, "h" + i)); touched = false; lockF(false); m.lock(false); d.lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },

    /* --------------------------------------------------- campfire-scheme (rus-9-5)
     * The evening campfire sentence with two kinds of links: drag in every comma (including the one between
     * «и» and «когда») and choose the scheme. task: { text, tiles, schemes, solution: { marks, scheme } } */
    "campfire-scheme": {
      wrong: (t) => pick(t, markWrong(t.solution.marks).map((m) => ({ marks: m, scheme: t.solution.scheme }))
        .concat([{ marks: t.solution.marks, scheme: (t.solution.scheme + 1) % t.schemes.length }])),
      check: (t, v) => Boolean(v) && same(v.marks, t.solution.marks) && v.scheme === t.solution.scheme,
      build(el, t, kit) {
        const { svg } = kit;
        let scheme = null;
        const S = markScene(el, t, kit, { H: 262, aria: "Сложное предложение у костра", sol: t.solution.marks, tray: { x: 40, y: 200, w: 170, h: 50 } });
        const f = S.fig;
        svg("circle", { cx: 318, cy: 170, r: 14, class: "sc-gold" }, f);
        svg("circle", { cx: 324, cy: 166, r: 12, class: "sc-paper" }, f);
        svg("path", { d: "M262 252 l60 -14 M262 238 l60 14", class: "sc-r79-log" }, f);
        svg("path", { d: "M292 244 C270 226 286 206 292 190 C300 208 316 222 292 244 Z", class: "sc-red" }, f);
        svg("path", { d: "M292 242 C282 230 290 220 292 212 C296 222 304 230 292 242 Z", class: "sc-gold" }, f);
        const ch = choices(el, t.schemes, "Схема предложения", (i) => { scheme = i; fire(el); });
        const base = S.ctrl;
        return Object.assign({}, base, {
          value: () => { const v = base.value(); return v === null && scheme === null ? null : { marks: v || S.m.value(), scheme }; },
          reveal() { base.reveal(); scheme = t.solution.scheme; ch.set(scheme); kit.answerLine(el, t.reveal || t.answer); },
          reset() { base.reset(); scheme = null; ch.set(null); },
        });
      },
    },

    /* ----------------------------------------------------- clause-arrows (rus-9-6)
     * Clause bubbles of «Я знаю, что ты придёшь, если не будет дождя»: tap a bubble, then the one that depends
     * on it — an arrow joins them; then name the kind of subordination.
     * task: { parts: [{ text, pill, main }], types, solution: { parents: [−1 | index], type } } */
    "clause-arrows": {
      wrong: (t) => {
        const s = t.solution, mainI = t.parts.findIndex((p) => p.main);
        const flat = t.parts.map((p, i) => (i === mainI ? -1 : mainI));
        const chain = t.parts.map((p, i) => (i === mainI ? -1 : i === 0 ? mainI : i - 1 === mainI ? mainI : i - 1));
        return pick(t, [{ parents: s.parents, type: (s.type + 1) % 3 }, { parents: flat, type: s.type }, { parents: chain, type: s.type }, { parents: s.parents, type: (s.type + 2) % 3 }]);
      },
      check: (t, v) => Boolean(v) && same(v.parents, t.solution.parents) && v.type === t.solution.type,
      build(el, t, kit) {
        const { svg, label } = kit;
        kit.hint(el, t.hint || "Нажмите на часть, от которой задаём вопрос, затем на ту, что от неё зависит — появится стрелка");
        const fig = paper(el, kit, 250, "Части сложноподчинённого предложения и стрелки между ними");
        const colors = ["sc-ink", "sc-red", "sc-teal"];
        const tcol = ["", "sc-r79-redtext", "sc-r79-teal"];
        const texts = t.parts.map((p, i) => p.text + (i < t.parts.length - 1 ? (t.parts[i + 1].noComma ? "" : ",") : "."));
        const geo = flow(texts.map((s) => ({ w: textW(fig, kit, s, "sc-r79-w", 18) })), { x0: 40, x1: 346, y: 48, lh: 36, gap: 7 });
        let ci = 0;
        texts.forEach((s, i) => { if (t.parts[i].main) label(fig, geo[i].x, geo[i].y, s, "sc-r79-w", "start"); else label(fig, geo[i].x, geo[i].y, s, `sc-r79-w ${tcol[1 + (ci++ % 2)]}`, "start"); });
        const parents = t.parts.map(() => -1);
        let from = null;
        const cx = (i) => 40 + (300 / t.parts.length) * (i + 0.5);
        const arrows = svg("g", {}, fig);
        let k = 0;
        const bubbles = t.parts.map((p, i) => {
          const g = svg("g", { class: "sc-tap", role: "button", "aria-label": `Часть «${p.text}»` }, fig);
          const cls = p.main ? colors[0] : colors[1 + (k++ % 2)];
          pill(g, kit, cx(i), 212, Math.min(300 / t.parts.length - 4, 104), p.pill, cls, "sc-r79-on sc-r79-sm");
          kit.toggleable(g, () => tap(i));
          return g;
        });
        function tap(i) {
          if (from === null) { from = i; paint(); return; }
          if (from !== i && !t.parts[i].main) parents[i] = parents[i] === from ? -1 : from;
          from = null;
          paint();
          fire(el);
        }
        function paint() {
          bubbles.forEach((g, i) => g.setAttribute("class", `sc-tap${from === i ? " sc-r79-picked" : ""}`));
          arrows.textContent = "";
          parents.forEach((p, i) => {
            if (p < 0) return;
            const x1 = cx(p), x2 = cx(i), top = 192 - 24 - Math.abs(x2 - x1) * 0.28;
            svg("path", { d: `M${x1} 194 Q${(x1 + x2) / 2} ${top} ${x2 + (x2 > x1 ? -6 : 6)} 194`, class: "sc-r79-arrow" }, arrows);
            svg("path", { d: `M${x2 + (x2 > x1 ? -6 : 6)} 196 l${x2 > x1 ? -12 : 12} -6 l${x2 > x1 ? 3 : -3} 11 Z`, class: "sc-red" }, arrows);
          });
        }
        paint();
        let type = null;
        const ch = choices(el, t.types, "Вид подчинения", (i) => { type = i; fire(el); });
        const lock = kit.lockable(el);
        return {
          value: () => (parents.every((p) => p < 0) && type === null ? null : { parents: parents.slice(), type }),
          lock,
          reveal() { t.solution.parents.forEach((p, i) => (parents[i] = p)); from = null; type = t.solution.type; ch.set(type); paint(); kit.answerLine(el, t.reveal || t.answer); },
          reset() { parents.fill(-1); from = null; type = null; ch.set(null); paint(); lock(false); },
          celebrate: () => kit.celebrate(fig),
        };
      },
    },
  });
})();
