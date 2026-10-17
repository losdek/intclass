/* Scenes for Russian grades 5–6 (see js/scenes.js): word cards on the lined paper of the Russian videos. */
(function () {
  const IntScenes = typeof window !== "undefined" ? window.IntScenes : require("./scenes.js");
  const K = IntScenes.kit;
  const W = 360;

  /* ------------------------------------------------------------ shared bits */
  // exercise-book paper: ruled lines and the red margin
  function paper(kit, fig, h) {
    const g = kit.svg("g", { "pointer-events": "none" }, fig);
    for (let y = 30; y < h - 4; y += 26) kit.svg("line", { x1: 6, x2: W - 6, y1: y, y2: y, style: "stroke:var(--sc-line);stroke-width:1.5" }, g);
    kit.svg("line", { x1: 24, x2: 24, y1: 6, y2: h - 6, style: "stroke:var(--sc-red);stroke-width:1.5;opacity:.5" }, g);
  }
  // text with a size (and optional fill), centred by default
  function tx(kit, p, x, y, s, size, anchor, fill) {
    const n = kit.label(p, x, y, s, "", anchor || "middle");
    n.setAttribute("style", `font-size:${size}px;${fill ? `fill:${fill}` : ""}`);
    return n;
  }
  // a rounded card centred on 0,0; filled cards get white letters like the videos' letter tiles
  function chip(kit, s, w, h, cls = "sc-cream", size = 17, stroke = "var(--sc-ink)", parent) {
    const g = kit.svg("g", {}, parent);
    kit.svg("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 8, class: cls, style: stroke ? `stroke:${stroke};stroke-width:2.5` : "" }, g);
    tx(kit, g, 0, size * 0.36, s, size, "middle", cls === "sc-cream" ? "" : cls === "sc-gold" ? "#1c1a2e" : "#fff");
    return g;
  }
  // a layer above the drop zones but below the dragged items
  function deco(kit, fig) {
    const g = kit.svg("g", { "pointer-events": "none" }, fig);
    const items = fig.querySelector(".sc-items");
    if (items) fig.insertBefore(g, items);
    return g;
  }
  const fireOf = (el) => () => el.dispatchEvent(new Event("change", { bubbles: true }));
  // only one item per slot: the one dropped last stays, the others go home
  const keepOne = (d, zone, id, home) => zone !== home && d.itemsIn(zone).filter((x) => x !== id).forEach((x) => d.place(x, home));
  const tag = (node, id, aria) => { node.setAttribute("data-id", id); node.setAttribute("aria-label", aria); return node; };
  const sorted = (a) => JSON.stringify([...a].sort());

  /* ======================================================== rus-5-1 letters vs sounds
   * task: { letters: ["ё","л","к","а"], chips: ["й'","о","л","к","а","л'"], solution: { cells: [["й'","о"],…], count } }
   * Drag sound chips under the letters (up to two per letter, none under ь), then count the sounds. */
  const elkaSounds = {
    wrong: (t) => [
      { cells: t.solution.cells, count: t.letters.length === t.solution.count ? t.solution.count + 1 : t.letters.length },
      { cells: t.solution.cells.map((c, i) => (c.length ? c.slice(-1) : [t.letters[i]])), count: t.letters.length },
      { cells: t.solution.cells, count: t.solution.count - 1 },
    ],
    check(t, v) {
      if (!v || !Array.isArray(v.cells) || v.cells.length !== t.letters.length || v.count !== t.solution.count) return false;
      return v.cells.every((c, i) => Array.isArray(c) && sorted(c) === sorted(t.solution.cells[i]));
    },
    build(el, t, kit) {
      const { svg, stage, hint, celebrate, controls, stepper, lockable, answerLine, dnd } = kit;
      const H = 258, n = t.letters.length, cw = Math.min(66, 300 / n), x0 = 190 - (n * cw) / 2;
      hint(el, t.hint || "Перетащите звуки под буквы (или нажмите на звук, затем на место), потом посчитайте звуки");
      const fig = stage(el, W, H, `Буквы и звуки слова «${t.letters.join("")}»`);
      paper(kit, fig, H);
      t.letters.forEach((ch, i) => chip(kit, ch, 46, 46, "sc-teal", 26, "", fig).setAttribute("transform", `translate(${x0 + cw * (i + 0.5)} 44)`));
      const b0 = x0 - 4, b1 = x0 + n * cw + 4;
      svg("path", { d: `M${b0 + 9} 82 H${b0} V178 H${b0 + 9} M${b1 - 9} 82 H${b1} V178 H${b1 - 9}`, class: "sc-stroke", style: "stroke:var(--sc-red)" }, fig);
      const perm = kit.shuffled(t.chips.length);
      const zones = t.letters.map((ch, i) => ({ id: `L${i}`, x: x0 + cw * i + 5, y: 84, w: cw - 10, h: 92, label: `Звуки буквы «${ch}»`, hideLabel: true, layout: (j) => [x0 + cw * (i + 0.5), 106 + j * 42] }));
      zones.push({ id: "pool", x: 30, y: 194, w: 316, h: 52, label: "Запас звуков", hideLabel: true, layout: (j) => [56 + perm[j] * 44, 220] });
      const fire = fireOf(el);
      let count = null, touched = false;
      const d = dnd(fig, zones, (st, id, z) => {
        const inZ = z === "pool" ? [] : d.itemsIn(z);
        if (inZ.length > 2) d.place(inZ.find((x) => x !== id), "pool");
        touched = true;
        fire();
      });
      t.chips.forEach((s, ci) => d.add(`c${ci}`, tag(chip(kit, s, 40, 34, "sc-cream", 18, "var(--sc-red)"), `c${ci}`, `Звук [${s}]`), "pool"));
      const step = stepper(controls(el), "Звуков", 1, 9, (v) => { count = v; touched = true; fire(); });
      const lock0 = lockable(el);
      const home = () => t.chips.forEach((_, ci) => d.place(`c${ci}`, "pool"));
      return {
        value: () => (touched ? { cells: t.letters.map((_, i) => d.itemsIn(`L${i}`).map((id) => t.chips[+id.slice(1)])), count } : null),
        lock(on) { lock0(on); d.lock(on); },
        reveal() {
          home();
          const used = new Set();
          t.solution.cells.forEach((c, i) => c.forEach((s) => {
            const ci = t.chips.findIndex((x, j) => x === s && !used.has(j));
            used.add(ci);
            d.place(`c${ci}`, `L${i}`);
          }));
          step.set(t.solution.count); count = t.solution.count; touched = true;
          answerLine(el, t.reveal || `${t.letters.length} букв(ы), ${t.solution.count} звука(ов)`);
        },
        reset() { home(); step.set(null); count = null; touched = false; lock0(false); d.lock(false); },
        celebrate: () => celebrate(fig),
      };
    },
  };

  /* ===================================================== rus-5-2 morpheme constructor
   * task: { word, slots: ["pre","root","suf","end"], blocks: ["под","снеж","ник","",…distractors], solution: ["под","снеж","ник",""] }
   * "" is the zero ending (an empty square). Drag the blocks into the frame under the morpheme marks. */
  function mark(kit, p, type, x0, x1, y) {
    const cx = (x0 + x1) / 2;
    const d = { pre: `M${x0} ${y - 12} H${x1} V${y}`, root: `M${x0} ${y} Q${cx} ${y - 24} ${x1} ${y}`, suf: `M${x0} ${y} L${cx} ${y - 14} L${x1} ${y}`, end: `M${x0} ${y - 14} H${x1} V${y} H${x0} Z` }[type];
    kit.svg("path", { d, class: "sc-stroke" }, p);
  }
  const morphemeBuild = {
    wrong(t) {
      const s = t.solution, extra = t.blocks.filter((b) => !s.includes(b));
      const out = [s.map((x, i) => (i === s.length - 1 ? null : x)), [s[1], s[0], ...s.slice(2)]];
      if (extra.length) out.push(s.map((x, i) => (i === 1 ? extra[0] : x)));
      return out;
    },
    check: (t, v) => Array.isArray(v) && v.length === t.solution.length && v.every((x, i) => x === t.solution[i]),
    build(el, t, kit) {
      const { svg, stage, hint, celebrate, lockable, answerLine, dnd } = kit;
      const H = 296, bw = (s) => Math.max(40, s.length * 12 + 16);
      const sw = t.solution.map((s) => Math.max(52, bw(s) + 6));
      const total = sw.reduce((a, b) => a + b, 0) + 8 * (sw.length - 1);
      const xs = [];
      sw.reduce((x, w) => (xs.push(x), x + w + 8), 182 - total / 2);
      hint(el, t.hint || "Перетащите кусочки слова в рамку: каждый — под свой значок");
      const fig = stage(el, W, H, `Конструктор слова «${t.word}»`);
      paper(kit, fig, H);
      tx(kit, fig, 190, 36, t.word, 26);
      t.slots.forEach((m, i) => {
        if (m === "end") svg("rect", { x: xs[i] - 5, y: 79, width: sw[i] + 10, height: 52, rx: 4, class: "sc-stroke" }, fig);
        else mark(kit, fig, m, xs[i] + 6, xs[i] + sw[i] - 6, 74);
      });
      const names = { pre: "приставка", root: "корень", suf: "суффикс", end: "окончание" };
      ["pre", "root", "suf", "end"].forEach((m, i) => {
        const x = i % 2 ? 196 : 40, y = i < 2 ? 262 : 286;
        mark(kit, fig, m, x, x + 24, y - 2);
        tx(kit, fig, x + 32, y, names[m], 14, "start", "var(--sc-soft)");
      });
      const perm = kit.shuffled(t.blocks.length);
      const zones = t.slots.map((m, i) => ({ id: `S${i}`, x: xs[i], y: 84, w: sw[i], h: 42, label: `Место: ${names[m]}`, hideLabel: true, layout: () => [xs[i] + sw[i] / 2, 105] }));
      zones.push({ id: "pool", x: 30, y: 146, w: 316, h: 92, label: "Кусочки слова", hideLabel: true, layout: (j) => [69 + (perm[j] % 4) * 79, 170 + Math.floor(perm[j] / 4) * 44] });
      const fire = fireOf(el);
      let touched = false;
      const d = dnd(fig, zones, (st, id, z) => { keepOne(d, z, id, "pool"); touched = true; fire(); });
      t.blocks.forEach((b, i) => {
        const node = chip(kit, b, bw(b), 38, "sc-teal", 17, "");
        if (!b) svg("rect", { x: -9, y: -9, width: 18, height: 18, class: "sc-stroke", style: "stroke:#fff" }, node);
        d.add(`b${i}`, tag(node, `b${i}`, b ? `Кусочек «${b}»` : "Нулевое окончание"), "pool");
      });
      const lock0 = lockable(el);
      const home = () => t.blocks.forEach((_, i) => d.place(`b${i}`, "pool"));
      const val = () => t.slots.map((_, i) => { const it = d.itemsIn(`S${i}`)[0]; return it === undefined ? null : t.blocks[+it.slice(1)]; });
      return {
        value: () => (touched && val().some((x) => x !== null) ? val() : null),
        lock(on) { lock0(on); d.lock(on); },
        reveal() {
          home();
          t.solution.forEach((s, i) => d.place(`b${t.blocks.indexOf(s)}`, `S${i}`));
          touched = true;
          answerLine(el, t.reveal || t.solution.join("|"));
        },
        reset() { home(); touched = false; lock0(false); d.lock(false); },
        celebrate: () => celebrate(fig),
      };
    },
  };

  /* ===================================================== rus-5-3 lift the vowel under stress
   * task: { word: ["в","да"], cards: [{ w: "воды", stress: 1, root: 1 }, …], solution: <card index> }
   * Tap a check word: the card lifts, its stress mark shows; if the stressed vowel is the root vowel, it fills the gap.
   * Any card whose stress falls on the root vowel is right. */
  const stressLift = {
    wrong: (t) => t.cards.map((_, i) => i).filter((i) => t.cards[i].stress !== t.cards[i].root),
    check: (t, v) => Number.isInteger(v) && v >= 0 && v < t.cards.length && t.cards[v].stress === t.cards[v].root,
    build(el, t, kit) {
      const { svg, stage, hint, celebrate, lockable, answerLine, toggleable, pop } = kit;
      const n = t.cards.length, H = 116 + n * 48;
      hint(el, t.hint || "Нажмите на слово, которое поднимает гласную под ударение");
      const fig = stage(el, W, H, `Проверка безударной гласной в слове «${t.word.join("_")}»`);
      paper(kit, fig, H);
      const main = tx(kit, fig, 190, 56, "", 38);
      const sp = (s, style) => { const e = svg("tspan", style ? { style } : {}, main); e.textContent = s; return e; };
      sp(t.word[0]);
      const gap = sp("?", "fill:var(--sc-red)");
      sp(t.word[1]);
      const status = tx(kit, fig, 190, 90, "", 15, "middle", "var(--sc-soft)");
      const fire = fireOf(el);
      let pick = null;
      const cards = t.cards.map((c, i) => {
        const y = 128 + i * 48;
        const g = svg("g", { class: "sc-tap", role: "radio", "aria-label": `Проверочное слово «${c.w}»` }, fig);
        const r = svg("rect", { x: 80, y: y - 20, width: 220, height: 40, rx: 10, class: "sc-cream", style: "stroke:var(--sc-ink);stroke-width:2.5" }, g);
        const text = tx(kit, g, 190, y + 8, "", 22);
        const chars = [...c.w].map((ch) => { const e = svg("tspan", {}, text); e.textContent = ch; return e; });
        const acc = svg("path", { d: "", class: "sc-stroke", style: "stroke:#fff;stroke-width:3.5", visibility: "hidden" }, g);
        toggleable(g, () => choose(i, true));
        return { g, r, text, chars, acc, y };
      });
      function paint() {
        cards.forEach((cd, i) => {
          const c = t.cards[i], on = i === pick;
          cd.g.setAttribute("aria-checked", String(on));
          cd.g.setAttribute("transform", on ? "translate(0 -4)" : "");
          cd.r.setAttribute("class", on ? "sc-teal" : "sc-cream");
          cd.r.setAttribute("style", on ? "" : "stroke:var(--sc-ink);stroke-width:2.5");
          cd.text.setAttribute("style", `font-size:22px;${on ? "fill:#fff" : ""}`);
          cd.chars.forEach((e, j) => e.setAttribute("style", on && j === c.root ? `fill:${c.stress === c.root ? "var(--sc-gold)" : "#fff;opacity:.55"}` : ""));
          cd.acc.setAttribute("visibility", on ? "visible" : "hidden");
          if (on) {
            let x = 190;
            try { const b = cd.text.getExtentOfChar(c.stress); x = b.x + b.width / 2; } catch (e) { x = 190 + (c.stress - (c.w.length - 1) / 2) * 12; }
            cd.acc.setAttribute("d", `M${x - 2} ${cd.y - 9} L${x + 5} ${cd.y - 17}`);
          }
        });
        const c = t.cards[pick];
        const good = c && c.stress === c.root;
        gap.textContent = good ? c.w[c.root] : "?";
        gap.setAttribute("style", `fill:var(${good ? "--sc-teal" : "--sc-red"})`);
        status.textContent = !c ? "Какое слово проверочное?" : good ? `под ударением слышим «${c.w[c.root]}»` : "гласная корня здесь без ударения";
      }
      function choose(i, user) {
        pick = i;
        paint();
        if (user) { pop(gap); fire(); }
      }
      paint();
      const lock = lockable(el);
      return {
        value: () => pick,
        lock,
        reveal() {
          choose(t.solution, false);
          answerLine(el, t.reveal || `Проверочное слово — «${t.cards[t.solution].w}»`);
        },
        reset() { pick = null; paint(); lock(false); },
        celebrate: () => celebrate(fig),
      };
    },
  };

  /* ===================================================== rus-5-4 the ь sticker
   * task: { words: [{ w: "мыш", tag: "ж. р., 3 скл." }, …6], stickers?, solution: [indices that take ь] }
   * Drag ь stickers onto the ends of the words that need them; a word with a sticker shows its gender tag. */
  const softSign = {
    wrong(t) {
      const s = t.solution, others = t.words.map((_, i) => i).filter((i) => !s.includes(i));
      return [t.words.map((_, i) => i), s.slice(1), [...s, others[0]]];
    },
    check: (t, v) => Array.isArray(v) && K.sameSet(v, t.solution),
    build(el, t, kit) {
      const { stage, hint, celebrate, lockable, answerLine, dnd } = kit;
      const H = 266, m = t.stickers || t.solution.length + 1;
      hint(el, t.hint || "Перетащите наклейку «ь» на конец слова (или нажмите на наклейку, затем на место)");
      const fig = stage(el, W, H, "Слова и наклейки с мягким знаком");
      paper(kit, fig, H);
      const pos = (i) => ({ x: i % 2 ? 314 : 146, y: 18 + Math.floor(i / 2) * 62, cx: i % 2 ? 266 : 104 });
      const tags = t.words.map((w, i) => {
        const p = pos(i);
        tx(kit, fig, p.x - 5, p.y + 28, w.w, 18, "end");
        return tx(kit, fig, p.cx, p.y + 58, "", 14, "middle", "var(--sc-teal)");
      });
      const zones = t.words.map((w, i) => ({ id: `W${i}`, x: pos(i).x, y: pos(i).y, w: 36, h: 42, label: `Конец слова «${w.w}»`, hideLabel: true, layout: () => [pos(i).x + 18, pos(i).y + 21] }));
      zones.push({ id: "pad", x: 30, y: 210, w: 316, h: 46, label: "Наклейки «ь»", hideLabel: true, layout: (j) => [190 - (m - 1) * 21 + j * 42, 233] });
      const fire = fireOf(el);
      let touched = false;
      const d = dnd(fig, zones, (st, id, z) => { keepOne(d, z, id, "pad"); touched = true; paint(false); fire(); });
      for (let j = 0; j < m; j++) d.add(`s${j}`, tag(chip(kit, "ь", 30, 36, "sc-gold", 24, ""), `s${j}`, "Наклейка «ь»"), "pad");
      const on = () => t.words.map((_, i) => i).filter((i) => d.count(`W${i}`) > 0);
      function paint(all) {
        const set = on();
        tags.forEach((g, i) => (g.textContent = all || set.includes(i) ? t.words[i].tag : ""));
      }
      const lock0 = lockable(el);
      const home = () => { for (let j = 0; j < m; j++) d.place(`s${j}`, "pad"); };
      return {
        value: () => (touched ? on() : null),
        lock(x) { lock0(x); d.lock(x); },
        reveal() {
          home();
          t.solution.forEach((i, j) => d.place(`s${j}`, `W${i}`));
          touched = true;
          paint(true);
          answerLine(el, t.reveal || `С ь: ${t.solution.map((i) => t.words[i].w + "ь").join(", ")}`);
        },
        reset() { home(); touched = false; paint(false); lock0(false); d.lock(false); },
        celebrate: () => celebrate(fig),
      };
    },
  };

  /* ===================================================== rus-5-5 ask the verb a question
   * task: { rows: [{ stem: "Мальчик хорошо учи", after?: "" }, …2], solution: { q: ["делает","делать"], end: ["тся","ться"] } }
   * Drag a question bubble onto each verb, then pick -тся or -ться. */
  const tsyaQuestion = {
    wrong: (t) => {
      const s = t.solution, fe = (e) => (e === "тся" ? "ться" : "тся"), fq = (q) => (q === "делает" ? "делать" : "делает");
      return [{ q: s.q, end: s.end.map(fe) }, { q: s.q.map(fq), end: s.end.map(fe) }, { q: s.q.map(fq), end: s.end }];
    },
    check: (t, v) => !!v && Array.isArray(v.q) && Array.isArray(v.end) && t.rows.every((_, i) => v.q[i] === t.solution.q[i] && v.end[i] === t.solution.end[i]),
    build(el, t, kit) {
      const { svg, stage, hint, celebrate, lockable, answerLine, dnd, toggleable, pop } = kit;
      const n = t.rows.length, H = 14 + n * 90 + 96, py = 14 + n * 90;
      hint(el, t.hint || "Перетащите вопрос к глаголу, затем выберите -тся или -ться");
      const fig = stage(el, W, H, "Предложения с глаголами на -тся и -ться");
      paper(kit, fig, H);
      const ENDS = ["тся", "ться"];
      const end = t.rows.map(() => null);
      const fire = fireOf(el);
      let touched = false;
      const lines = t.rows.map((r, i) => {
        const y0 = 14 + i * 90, line = tx(kit, fig, 32, y0 + 26, "", 17, "start");
        const parts = [r.stem, "…", r.after || ""].map((s) => { const e = svg("tspan", {}, line); e.textContent = s; return e; });
        svg("path", { d: `M60 ${y0 + 34} l10 10 l10 -10`, class: "sc-stroke", style: "stroke:var(--sc-soft)" }, fig);
        const tiles = ENDS.map((e, k) => {
          const x = 200 + k * 76, g = svg("g", { class: "sc-tap", role: "radio", "aria-label": `Окончание -${e} в строке ${i + 1}` }, fig);
          const r2 = svg("rect", { x, y: y0 + 48, width: 70, height: 38, rx: 10 }, g);
          const lt = tx(kit, g, x + 35, y0 + 73, `-${e}`, 16);
          toggleable(g, () => { end[i] = e; touched = true; paint(); pop(g); fire(); });
          return { g, r2, lt };
        });
        return { parts, tiles };
      });
      function paint() {
        lines.forEach((ln, i) => {
          ln.parts[1].textContent = end[i] || "…";
          ln.parts[1].setAttribute("style", end[i] ? "fill:var(--sc-teal)" : "");
          ln.tiles.forEach(({ g, r2, lt }, k) => {
            const on = end[i] === ENDS[k];
            g.setAttribute("aria-checked", String(on));
            r2.setAttribute("class", on ? "sc-teal" : "sc-cream");
            r2.setAttribute("style", on ? "" : "stroke:var(--sc-ink);stroke-width:2.5");
            lt.setAttribute("style", `font-size:16px;${on ? "fill:#fff" : ""}`);
          });
        });
      }
      const Q = ["делает", "делать"], ids = [];
      const zones = t.rows.map((_, i) => ({ id: `R${i}`, x: 32, y: 14 + i * 90 + 46, w: 140, h: 42, label: `Вопрос к глаголу в строке ${i + 1}`, hideLabel: true, layout: () => [102, 14 + i * 90 + 67] }));
      zones.push({ id: "pool", x: 30, y: py, w: 316, h: 86, label: "Вопросы", hideLabel: true, layout: (j) => [105 + (j % 2) * 160, py + 22 + Math.floor(j / 2) * 42] });
      const d = dnd(fig, zones, (st, id, z) => { keepOne(d, z, id, "pool"); touched = true; fire(); });
      Q.forEach((q, a) => { for (let c = 0; c < n; c++) {
        const node = chip(kit, `что ${q}?`, 132, 34, "sc-gold", 16, "");
        svg("path", { d: "M-44 16 l-6 9 l16 -9 Z", class: "sc-gold" }, node);
        ids.push([`q${a}${c}`, q]);
        d.add(`q${a}${c}`, tag(node, `q${a}${c}`, `Вопрос «что ${q}?»`), "pool");
      } });
      paint();
      const lock0 = lockable(el);
      const qOf = (i) => { const it = d.itemsIn(`R${i}`)[0]; return it ? ids.find(([x]) => x === it)[1] : null; };
      const home = () => ids.forEach(([x]) => d.place(x, "pool"));
      return {
        value: () => (touched ? { q: t.rows.map((_, i) => qOf(i)), end: end.slice() } : null),
        lock(on) { lock0(on); d.lock(on); },
        reveal() {
          home();
          const used = new Set();
          t.solution.q.forEach((q, i) => { const id = ids.find(([x, y]) => y === q && !used.has(x))[0]; used.add(id); d.place(id, `R${i}`); });
          t.solution.end.forEach((e, i) => (end[i] = e));
          touched = true; paint();
          answerLine(el, t.reveal || "");
        },
        reset() { home(); end.fill(null); touched = false; paint(); lock0(false); d.lock(false); },
        celebrate: () => celebrate(fig),
      };
    },
  };

  /* ===================================================== rus-6-1 the а/о switch
   * task: { title, rows: [{ a: "предл", b: "гать", opts: ["а","о"], hl: [0,1] }, …], solution: ["а", …] }
   * Each word has a two-way letter switch in the root; the letter (or suffix) that decides is highlighted. */
  const altSwitch = {
    wrong: (t) => [t.solution.map((x, i) => t.rows[i].opts.find((o) => o !== x)), t.solution.map((x, i) => (i === 0 ? t.rows[0].opts.find((o) => o !== x) : x)), t.rows.map((r) => r.opts[0]).join() === t.solution.join() ? t.rows.map((r) => r.opts[1]) : t.rows.map((r) => r.opts[0])],
    check: (t, v) => Array.isArray(v) && v.length === t.solution.length && v.every((x, i) => x === t.solution[i]),
    build(el, t, kit) {
      const { svg, stage, hint, celebrate, lockable, answerLine, toggleable, pop } = kit;
      const n = t.rows.length, H = 66 + n * 50;
      hint(el, t.hint || "Переключите букву в корне: смотрите на выделенную букву после корня");
      const fig = stage(el, W, H, `Корни с чередованием: ${t.title}`);
      paper(kit, fig, H);
      tx(kit, fig, 190, 36, t.title, 22);
      const pick = t.rows.map(() => null);
      const fire = fireOf(el);
      const rows = t.rows.map((r, i) => {
        const y = 80 + i * 50;
        tx(kit, fig, 146, y + 8, r.a, 23, "end");
        const b = tx(kit, fig, 230, y + 8, "", 23, "start");
        const hl = r.hl || [0, 0];
        [r.b.slice(0, hl[0]), r.b.slice(hl[0], hl[0] + hl[1]), r.b.slice(hl[0] + hl[1])].forEach((s, k) => {
          const e = svg("tspan", k === 1 ? { style: "fill:var(--sc-red)" } : {}, b);
          e.textContent = s;
        });
        svg("rect", { x: 150, y: y - 19, width: 76, height: 38, rx: 19, class: "sc-cream", style: "stroke:var(--sc-line);stroke-width:2.5" }, fig);
        const knob = svg("rect", { x: 152, y: y - 17, width: 36, height: 34, rx: 17, class: "sc-teal", visibility: "hidden" }, fig);
        const lts = r.opts.map((o, k) => tx(kit, fig, 169 + k * 38, y + 7, o, 21));
        r.opts.forEach((o, k) => {
          const hit = svg("rect", { x: 150 + k * 38, y: y - 19, width: 38, height: 38, rx: 12, class: "sc-tap sc-cream", "fill-opacity": 0, role: "radio", "aria-label": `${r.a}${o}${r.b}` }, fig);
          toggleable(hit, () => { pick[i] = o; paint(); pop(knob); fire(); });
        });
        return { knob, lts };
      });
      function paint() {
        rows.forEach(({ knob, lts }, i) => {
          const k = t.rows[i].opts.indexOf(pick[i]);
          knob.setAttribute("visibility", k < 0 ? "hidden" : "visible");
          knob.setAttribute("x", 152 + Math.max(k, 0) * 38);
          lts.forEach((l, j) => l.setAttribute("style", `font-size:21px;${j === k ? "fill:#fff" : ""}`));
        });
      }
      const lock = lockable(el);
      return {
        value: () => (pick.every((x) => x === null) ? null : pick.slice()),
        lock,
        reveal() {
          t.solution.forEach((x, i) => (pick[i] = x));
          paint();
          answerLine(el, t.reveal || t.rows.map((r, i) => r.a + t.solution[i] + r.b).join(", "));
        },
        reset() { pick.fill(null); paint(); lock(false); },
        celebrate: () => celebrate(fig),
      };
    },
  };

  /* ===================================================== rus-6-2 the infinitive machine
   * task: { verbs: [{ a: "он смотр", b: "т", inf: "смотреть" }, …3], solution: ["II","I","II"] }
   * Put a verb card into the machine: the screen shows its infinitive. Then drop the card into the tray of its
   * conjugation — the card gets its ending (I → е, II → и). */
  const conjMachine = {
    wrong: (t) => [t.solution.map((c) => (c === "I" ? "II" : "I")), t.solution.map(() => "II"), t.solution.map(() => "I")].filter((w) => w.join() !== t.solution.join()),
    check: (t, v) => Array.isArray(v) && v.length === t.solution.length && v.every((x, i) => x === t.solution[i]),
    build(el, t, kit) {
      const { svg, stage, hint, celebrate, lockable, answerLine, dnd } = kit;
      const H = 368, n = t.verbs.length;
      hint(el, t.hint || "Опустите глагол в машину — она покажет начальную форму. Потом отправьте карточку в лоток спряжения");
      const fig = stage(el, W, H, "Машина начальной формы глагола и два лотка спряжений");
      paper(kit, fig, H);
      svg("rect", { x: 100, y: 96, width: 180, height: 106, rx: 16, class: "sc-blue" }, fig);
      [108, 272].forEach((x) => svg("circle", { cx: x, cy: 104, r: 5, class: "sc-gold" }, fig));
      svg("rect", { x: 112, y: 156, width: 156, height: 38, rx: 8, class: "sc-ink" }, fig);
      const screen = tx(kit, fig, 190, 181, "что делать?", 18, "middle", "var(--sc-cream)");
      svg("path", { d: "M150 202 L107 218 M230 202 L269 218", class: "sc-stroke", style: "stroke:var(--sc-soft)" }, fig);
      const perm = kit.shuffled(4);
      const zones = [
        { id: "shelf", x: 30, y: 6, w: 316, h: 84, label: "Полка с глаголами", hideLabel: true, layout: (j) => [107 + (perm[j] % 2) * 162, 27 + Math.floor(perm[j] / 2) * 42] },
        { id: "mach", x: 113, y: 104, w: 154, h: 44, label: "Машина", hideLabel: true, layout: () => [190, 126] },
        { id: "I", x: 30, y: 218, w: 154, h: 142, label: "I спряжение", hideLabel: true, layout: (j) => [107, 264 + j * 36] },
        { id: "II", x: 192, y: 218, w: 154, h: 142, label: "II спряжение", hideLabel: true, layout: (j) => [269, 264 + j * 36] },
      ];
      const fire = fireOf(el);
      let touched = false;
      const d = dnd(fig, zones, (st, id, z) => {
        if (z === "mach") keepOne(d, z, id, "shelf");
        touched = true; paint(); fire();
      });
      const ov = deco(kit, fig);
      tx(kit, ov, 107, 240, "I спр. → е", 16);
      tx(kit, ov, 269, 240, "II спр. → и", 16);
      const gaps = t.verbs.map((v, i) => {
        const node = chip(kit, "", 144, 34, "sc-cream", 16);
        const text = node.querySelector("text");
        const sp = [v.a, "_", v.b].map((s) => { const e = svg("tspan", {}, text); e.textContent = s; return e; });
        d.add(`v${i}`, tag(node, `v${i}`, `Глагол «${v.a}_${v.b}»`), "shelf");
        return sp[1];
      });
      function paint() {
        t.verbs.forEach((v, i) => {
          const z = d.zoneOf(`v${i}`), L = z === "I" ? "е" : z === "II" ? "и" : "_";
          gaps[i].textContent = L;
          gaps[i].setAttribute("style", L === "_" ? "" : "fill:var(--sc-red)");
        });
        const inM = d.itemsIn("mach")[0];
        screen.textContent = inM ? t.verbs[+inM.slice(1)].inf : "что делать?";
      }
      const lock0 = lockable(el);
      const home = () => t.verbs.forEach((_, i) => d.place(`v${i}`, "shelf"));
      const val = () => t.verbs.map((_, i) => { const z = d.zoneOf(`v${i}`); return z === "I" || z === "II" ? z : null; });
      return {
        value: () => (touched && val().some((x) => x) ? val() : null),
        lock(on) { lock0(on); d.lock(on); },
        reveal() {
          home();
          t.solution.forEach((c, i) => d.place(`v${i}`, c));
          touched = true; paint();
          answerLine(el, t.reveal || "");
        },
        reset() { home(); touched = false; paint(); lock0(false); d.lock(false); },
        celebrate: () => celebrate(fig),
      };
    },
  };

  /* ===================================================== rus-6-3 при- or пре- by meaning
   * task: { meanings: ["near","join","close","very"], words: [{ a: "пр", b: "ехать" }, …], solution: [meaning id per word] }
   * Drag each word onto the picture of its meaning; the card then shows при- or пре-. */
  const MEAN = {
    near: ["приближение", "и"], join: ["присоединение", "и"], close: ["близость", "и"],
    part: ["неполнота", "и"], very: ["«очень»", "е"], pere: ["«пере-»", "е"],
  };
  function icon(kit, p, id, x, y) {
    const s = (tag, a) => kit.svg(tag, a, p);
    if (id === "near") { s("rect", { x: x + 4, y: y - 11, width: 10, height: 22, rx: 2, class: "sc-crust" }); s("path", { d: `M${x - 14} ${y} H${x} M${x - 5} ${y - 5} L${x} ${y} L${x - 5} ${y + 5}`, class: "sc-stroke" }); }
    if (id === "join") { s("rect", { x: x - 13, y: y - 8, width: 13, height: 16, rx: 3, class: "sc-teal" }); s("rect", { x, y: y - 8, width: 13, height: 16, rx: 3, class: "sc-gold" }); }
    if (id === "close") { s("path", { d: `M${x - 14} ${y + 10} V${y - 2} L${x - 7} ${y - 10} L${x} ${y - 2} V${y + 10} Z`, class: "sc-red" }); s("circle", { cx: x + 8, cy: y - 2, r: 7, class: "sc-teal" }); s("rect", { x: x + 6, y: y + 3, width: 4, height: 8, class: "sc-crust" }); }
    if (id === "part") { s("circle", { cx: x, cy: y, r: 11, class: "sc-cream", style: "stroke:var(--sc-ink);stroke-width:2" }); s("path", { d: `M${x} ${y - 11} A11 11 0 0 1 ${x} ${y + 11} Z`, class: "sc-teal" }); }
    if (id === "very") { s("circle", { cx: x, cy: y, r: 12, class: "sc-gold" }); kit.label(p, x, y + 6, "!", "").setAttribute("style", "fill:#1c1a2e"); }
    if (id === "pere") { s("rect", { x: x - 3, y: y - 2, width: 6, height: 13, class: "sc-red" }); s("path", { d: `M${x - 14} ${y + 8} Q${x} ${y - 22} ${x + 14} ${y + 8}`, class: "sc-stroke" }); }
  }
  const priMeaning = {
    wrong(t) {
      const s = t.solution, r = (k) => s.map((_, i) => s[(i + k) % s.length]);
      return [r(1), s.map((x, i) => (i < 2 ? s[1 - i] : x)), r(2)].filter((w) => w.join() !== s.join());
    },
    check: (t, v) => Array.isArray(v) && v.length === t.solution.length && v.every((x, i) => x === t.solution[i]),
    build(el, t, kit) {
      const { svg, stage, hint, celebrate, lockable, answerLine, dnd } = kit;
      const H = 324, nW = t.words.length;
      hint(el, t.hint || "Перетащите каждое слово на картинку с его значением");
      const fig = stage(el, W, H, "Значения приставок при- и пре-");
      paper(kit, fig, H);
      const box = (i) => ({ x: i % 2 ? 192 : 30, y: 8 + Math.floor(i / 2) * 110 });
      const perm = kit.shuffled(nW);
      const zones = t.meanings.map((m, i) => ({ id: m, ...box(i), w: 154, h: 104, label: MEAN[m][0], hideLabel: true, layout: () => [box(i).x + 77, box(i).y + 79] }));
      zones.push({ id: "pool", x: 30, y: 232, w: 316, h: 84, label: "Слова", hideLabel: true, layout: (j) => [107 + (perm[j] % 2) * 162, 253 + Math.floor(perm[j] / 2) * 42] });
      const fire = fireOf(el);
      let touched = false;
      const d = dnd(fig, zones, (st, id, z) => { keepOne(d, z, id, "pool"); touched = true; paint(); fire(); });
      const ov = deco(kit, fig);
      t.meanings.forEach((m, i) => { const b = box(i); icon(kit, ov, m, b.x + 77, b.y + 20); tx(kit, ov, b.x + 77, b.y + 52, MEAN[m][0], 14); });
      const gaps = t.words.map((w, i) => {
        const node = chip(kit, "", 150, 34, "sc-cream", 14);
        const text = node.querySelector("text");
        const sp = [w.a, "_", w.b].map((s) => { const e = svg("tspan", {}, text); e.textContent = s; return e; });
        d.add(`w${i}`, tag(node, `w${i}`, `Слово «${w.a}_${w.b}»`), "pool");
        return sp[1];
      });
      function paint() {
        t.words.forEach((_, i) => {
          const z = d.zoneOf(`w${i}`), L = MEAN[z] ? MEAN[z][1] : "_";
          gaps[i].textContent = L;
          gaps[i].setAttribute("style", L === "_" ? "" : "fill:var(--sc-red)");
        });
      }
      const lock0 = lockable(el);
      const home = () => t.words.forEach((_, i) => d.place(`w${i}`, "pool"));
      const val = () => t.words.map((_, i) => { const z = d.zoneOf(`w${i}`); return z === "pool" ? null : z; });
      return {
        value: () => (touched && val().some((x) => x) ? val() : null),
        lock(on) { lock0(on); d.lock(on); },
        reveal() {
          home();
          t.solution.forEach((m, i) => d.place(`w${i}`, m));
          touched = true; paint();
          answerLine(el, t.reveal || "");
        },
        reset() { home(); touched = false; paint(); lock0(false); d.lock(false); },
        celebrate: () => celebrate(fig),
      };
    },
  };

  /* ===================================================== rus-6-4 one ь in a numeral
   * task: { rows: [["пят","десят"], …3], solution: [[0],[1],[0]] } — 0: ь in the middle, 1: at the end.
   * Each numeral is spelt in letter tiles with two gaps; there is one ь sticker per numeral. */
  const numeralSoft = {
    wrong: (t) => [t.solution.map((s) => s.map((g) => 1 - g)), t.solution.map(() => [0, 1]), t.solution.map(() => [1])].filter((w) => JSON.stringify(w) !== JSON.stringify(t.solution)),
    check: (t, v) => Array.isArray(v) && v.length === t.rows.length && v.every((c, i) => Array.isArray(c) && sorted(c) === sorted(t.solution[i])),
    build(el, t, kit) {
      const { stage, hint, celebrate, lockable, answerLine, dnd } = kit;
      const n = t.rows.length, H = 72 + n * 62, STEP = 23, GW = 36;
      hint(el, t.hint || "Перетащите мягкий знак в нужное место числительного — он пишется только один раз");
      const fig = stage(el, W, H, "Числительные из букв и наклейки с мягким знаком");
      paper(kit, fig, H);
      const gapX = [];
      t.rows.forEach((parts, i) => {
        const y = 40 + i * 62, len = parts.join("").length, total = len * STEP + 2 * (GW + 4);
        let x = 190 - total / 2;
        gapX.push([]);
        parts.forEach((p) => {
          [...p].forEach((ch) => { chip(kit, ch, STEP - 2, 36, "sc-teal", 20, "", fig).setAttribute("transform", `translate(${x + STEP / 2} ${y})`); x += STEP; });
          gapX[i].push(x + 2);
          x += GW + 4;
        });
      });
      const zones = [];
      t.rows.forEach((parts, i) => [0, 1].forEach((g) => {
        const x = gapX[i][g], y = 40 + i * 62;
        zones.push({ id: `G${i}${g}`, x, y: y - 22, w: GW, h: 44, label: `${g ? "Конец" : "Середина"} числительного ${i + 1}`, hideLabel: true, layout: () => [x + GW / 2, y] });
      }));
      const py = 40 + n * 62 - 6;
      zones.push({ id: "pad", x: 30, y: py, w: 316, h: 46, label: "Наклейки «ь»", hideLabel: true, layout: (j) => [190 - (n - 1) * 22 + j * 44, py + 23] });
      const fire = fireOf(el);
      let touched = false;
      const d = dnd(fig, zones, (st, id, z) => { keepOne(d, z, id, "pad"); touched = true; fire(); });
      for (let j = 0; j < n; j++) d.add(`s${j}`, tag(chip(kit, "ь", 30, 38, "sc-gold", 24, ""), `s${j}`, "Наклейка «ь»"), "pad");
      const lock0 = lockable(el);
      const home = () => { for (let j = 0; j < n; j++) d.place(`s${j}`, "pad"); };
      const val = () => t.rows.map((_, i) => [0, 1].filter((g) => d.count(`G${i}${g}`) > 0));
      return {
        value: () => (touched ? val() : null),
        lock(on) { lock0(on); d.lock(on); },
        reveal() {
          home();
          let j = 0;
          t.solution.forEach((c, i) => c.forEach((g) => d.place(`s${j++}`, `G${i}${g}`)));
          touched = true;
          answerLine(el, t.reveal || "");
        },
        reset() { home(); touched = false; lock0(false); d.lock(false); },
        celebrate: () => celebrate(fig),
      };
    },
  };

  /* ===================================================== rus-6-5 jars with -н- / -нн- labels
   * task: { jars: [{ stem: "лимон", fill: "gold" }, …4], tiles: ["-н-","-енн-",…], solution: ["-н-", …] }
   * Each jar's label is a word with a missing suffix; drag the suffix tiles onto the labels. */
  const nnJars = {
    wrong(t) {
      const s = t.solution, swap = { "-н-": "-ан-", "-енн-": "-ен-", "-ен-": "-енн-", "-онн-": "-он-", "-ан-": "-анн-", "-ян-": "-янн-", "-янн-": "-ян-", "-ин-": "-инн-" };
      return [s.map((x) => swap[x] || x), s.map((x, i) => (i === 0 ? swap[x] || x : x)), [s[1], s[0], ...s.slice(2)]].filter((w) => w.join() !== s.join());
    },
    check: (t, v) => Array.isArray(v) && v.length === t.solution.length && v.every((x, i) => x === t.solution[i]),
    build(el, t, kit) {
      const { svg, stage, hint, celebrate, lockable, answerLine, dnd } = kit;
      const H = 300, SW = 48;
      hint(el, t.hint || "Перетащите суффикс на этикетку банки (или нажмите на суффикс, затем на этикетку)");
      const fig = stage(el, W, H, "Банки с этикетками-прилагательными");
      paper(kit, fig, H);
      const slots = t.jars.map((j, i) => {
        const cx = 108 + (i % 2) * 162, top = 8 + Math.floor(i / 2) * 102;
        svg("rect", { x: cx - 46, y: top, width: 92, height: 14, rx: 4, class: "sc-crust" }, fig);
        svg("rect", { x: cx - 78, y: top + 10, width: 156, height: 88, rx: 18, class: `sc-${j.fill || "gold"}`, style: "opacity:.4" }, fig);
        [-40, -14, 14, 40].forEach((dx, k) => svg("circle", { cx: cx + dx, cy: top + 88 - (k % 2) * 4, r: 6, class: `sc-${j.fill || "gold"}` }, fig));
        svg("rect", { x: cx - 76, y: top + 30, width: 152, height: 48, rx: 8, class: "sc-cream" }, fig);
        const fs = j.stem.length > 5 ? 14 : 15, stemW = j.stem.length * (fs === 14 ? 11.2 : 12), x0 = cx - (stemW + SW + 30) / 2;
        tx(kit, fig, x0 + stemW, top + 60, j.stem, fs, "end");
        tx(kit, fig, x0 + stemW + SW + 6, top + 60, j.end || "ый", 15, "start");
        return { x: x0 + stemW + 3, y: top + 36 };
      });
      const perm = kit.shuffled(t.tiles.length);
      const zones = slots.map((s, i) => ({ id: `J${i}`, x: s.x, y: s.y, w: SW, h: 36, label: `Суффикс в слове «${t.jars[i].stem}…»`, hideLabel: true, layout: () => [s.x + SW / 2, s.y + 18] }));
      zones.push({ id: "pool", x: 30, y: 214, w: 316, h: 80, label: "Суффиксы", hideLabel: true, layout: (j) => [69 + (perm[j] % 4) * 79, 235 + Math.floor(perm[j] / 4) * 38] });
      const fire = fireOf(el);
      let touched = false;
      const d = dnd(fig, zones, (st, id, z) => { keepOne(d, z, id, "pool"); touched = true; fire(); });
      t.tiles.forEach((s, i) => d.add(`t${i}`, tag(chip(kit, s.replace(/-/g, ""), 44, 32, "sc-teal", 15, ""), `t${i}`, `Суффикс ${s}`), "pool"));
      const lock0 = lockable(el);
      const home = () => t.tiles.forEach((_, i) => d.place(`t${i}`, "pool"));
      const val = () => t.jars.map((_, i) => { const it = d.itemsIn(`J${i}`)[0]; return it === undefined ? null : t.tiles[+it.slice(1)]; });
      return {
        value: () => (touched && val().some((x) => x) ? val() : null),
        lock(on) { lock0(on); d.lock(on); },
        reveal() {
          home();
          const used = new Set();
          t.solution.forEach((s, i) => { const k = t.tiles.findIndex((x, j) => x === s && !used.has(j)); used.add(k); d.place(`t${k}`, `J${i}`); });
          touched = true;
          answerLine(el, t.reveal || "");
        },
        reset() { home(); touched = false; lock0(false); d.lock(false); },
        celebrate: () => celebrate(fig),
      };
    },
  };

  IntScenes.add({
    "elka-sounds": elkaSounds,
    "morpheme-build": morphemeBuild,
    "stress-lift": stressLift,
    "soft-sign-sticker": softSign,
    "tsya-question": tsyaQuestion,
    "alternation-switch": altSwitch,
    "conj-machine": conjMachine,
    "pri-meaning": priMeaning,
    "numeral-soft-sign": numeralSoft,
    "nn-jars": nnJars,
  });
})();
