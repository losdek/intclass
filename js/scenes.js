/**
 * Scenes: illustrated tasks built from each lesson's video — the pizza from the fractions video gets cut,
 * the chickens and rabbits from the systems video go into the yard, and so on.
 *
 * A quiz item { type: "scene", kind: "pizza-cut", …data, solution } is drawn by IntScenes.kinds[kind].
 * A kind is { check(task, value), build(el, task, kit) → { value(), lock(on), reveal(), reset() } },
 * exactly like a task type; the files js/scenes-*.js add their kinds with IntScenes.add({ name: kind, … }).
 *
 * Shared pieces for kinds live in IntScenes.kit (the task kit plus scene helpers):
 *   stage(el, w, h, aria)       an SVG «stage» on the video's cream paper
 *   dnd(fig, zones, onChange)   drag items between zones (finger, mouse, or tap item → tap zone; keyboard too)
 *   art.*                       small flat drawings in the videos' style (pizza slice, kid, candy, …)
 *   hint(el, text)              the how-to chip above the stage
 *   celebrate(fig)              a short burst when the answer is right
 */
(function () {
  const IntTasks = typeof window !== "undefined" ? window.IntTasks : require("./tasks.js");
  const k = IntTasks.kit;
  const kinds = {};

  /* ------------------------------------------------------------------ stage */
  function stage(el, w, h, aria) {
    const fig = k.figure(el, `0 0 ${w} ${h}`, aria);
    fig.classList.add("scene-fig");
    k.svg("rect", { x: 0, y: 0, width: w, height: h, rx: 14, class: "sc-paper" }, fig);
    return fig;
  }

  function hint(el, text) {
    const p = document.createElement("p");
    p.className = "task-hint";
    p.textContent = text;
    el.prepend(p);
    return p;
  }

  // a short burst of confetti from the middle of the stage (skipped without motion)
  function celebrate(fig) {
    if (!k.motion()) return;
    const vb = fig.viewBox.baseVal;
    const g = k.svg("g", { class: "sc-burst" }, fig);
    const colors = ["sc-c-teal", "sc-c-gold", "sc-c-red"];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const c = k.svg("circle", { cx: vb.width / 2, cy: vb.height / 2, r: 5, class: colors[i % 3] }, g);
      c.style.setProperty("--dx", `${Math.cos(a) * (vb.width * 0.35)}px`);
      c.style.setProperty("--dy", `${Math.sin(a) * (vb.height * 0.35)}px`);
    }
    setTimeout(() => g.remove(), 900);
  }

  /* -------------------------------------------------------------- drag & drop
   * zones: [{ id, x, y, w, h, cols = 4, cell = 44, layout?(i) → [x, y], label?, cls? }]
   * add(id, node, zoneId) puts an item (a <g> drawn around 0,0) into a zone.
   * The pupil drags an item onto another zone, or taps an item and then a zone. Keyboard: Tab to an item,
   * Enter to pick it up, Tab to a zone, Enter to drop. onChange(state) gets { itemId: zoneId }. */
  function dnd(fig, zones, onChange) {
    const items = new Map(); // id → { node, zone }
    const zoneEls = new Map();
    let picked = null;
    let locked = false;
    zones.forEach((z) => {
      const r = k.svg("rect", { x: z.x, y: z.y, width: z.w, height: z.h, rx: 12, class: `sc-zone ${z.cls || ""}`, "data-zone": z.id }, fig);
      r.setAttribute("tabindex", "0");
      r.setAttribute("role", "button");
      r.setAttribute("aria-label", z.label || z.id);
      if (z.label && !z.hideLabel) k.label(fig, z.x + z.w / 2, z.y + z.h + 22, z.label, "sc-zone-label");
      r.addEventListener("click", () => picked !== null && !locked && place(picked, z.id, true));
      r.addEventListener("keydown", (e) => {
        if ((e.key === "Enter" || e.key === " ") && picked !== null && !locked) { e.preventDefault(); place(picked, z.id, true); }
      });
      zoneEls.set(z.id, { z, r });
    });
    const layer = k.svg("g", { class: "sc-items" }, fig); // items above the zones
    const zoneOf = (id) => zoneEls.get(id).z;
    const slot = (z, i) => (z.layout ? z.layout(i) : [z.x + (z.cell || 44) * ((i % (z.cols || 4)) + 0.5) + 6, z.y + (z.cell || 44) * (Math.floor(i / (z.cols || 4)) + 0.5) + 6]);
    const state = () => Object.fromEntries([...items].map(([id, it]) => [id, it.zone]));

    function relayout(animate) {
      zoneEls.forEach(({ z }) => {
        [...items].filter(([, it]) => it.zone === z.id).forEach(([, it], i) => {
          const [x, y] = slot(z, i);
          const from = it.at;
          it.at = [x, y];
          it.node.setAttribute("transform", `translate(${x} ${y})`);
          if (animate && from && k.motion() && it.node.animate && (from[0] !== x || from[1] !== y)) {
            it.node.animate([{ transform: `translate(${from[0]}px, ${from[1]}px)` }, { transform: `translate(${x}px, ${y}px)` }],
              { duration: 240, easing: "cubic-bezier(.2,.8,.2,1)" });
          }
        });
      });
    }
    function select(id) {
      picked = id;
      items.forEach((it, i) => it.node.classList.toggle("is-picked", i === id));
      fig.classList.toggle("is-picking", id !== null);
    }
    function place(id, zoneId, user) {
      const it = items.get(id);
      if (!it) return;
      it.zone = zoneId;
      select(null);
      relayout(true);
      if (user) {
        k.pop(it.node);
        onChange && onChange(state(), id, zoneId);
      }
    }
    function zoneAt(p) {
      for (const { z } of zoneEls.values()) if (p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h) return z.id;
      return null;
    }
    function add(id, node, zoneId) {
      node.classList.add("sc-item");
      node.setAttribute("tabindex", "0");
      node.setAttribute("role", "button");
      layer.appendChild(node);
      const it = { node, zone: zoneId, at: null };
      items.set(id, it);
      let start = null;
      node.addEventListener("pointerdown", (e) => {
        if (locked || (e.pointerType === "mouse" && e.button !== 0)) return;
        node.setPointerCapture?.(e.pointerId);
        const p = k.pointer(fig, e);
        start = { p, at: it.at, moved: false, pid: e.pointerId };
      });
      node.addEventListener("pointermove", (e) => {
        if (!start || e.pointerId !== start.pid) return;
        const p = k.pointer(fig, e);
        const dx = p.x - start.p.x, dy = p.y - start.p.y;
        if (!start.moved && Math.hypot(dx, dy) < 6) return;
        start.moved = true;
        node.classList.add("is-dragging");
        node.setAttribute("transform", `translate(${start.at[0] + dx} ${start.at[1] + dy})`);
        zoneEls.forEach(({ r }, zid) => r.classList.toggle("is-over", zid === zoneAt(p)));
        e.preventDefault();
      });
      const end = (e) => {
        if (!start || e.pointerId !== start.pid) return;
        const s = start;
        start = null;
        node.classList.remove("is-dragging");
        zoneEls.forEach(({ r }) => r.classList.remove("is-over"));
        if (!s.moved) { select(picked === id ? null : id); return; }
        const z = e.type === "pointercancel" ? null : zoneAt(k.pointer(fig, e));
        if (z) place(id, z, true);
        else relayout(true);
      };
      node.addEventListener("pointerup", end);
      node.addEventListener("pointercancel", end);
      node.addEventListener("keydown", (e) => {
        if ((e.key === "Enter" || e.key === " ") && !locked) { e.preventDefault(); select(picked === id ? null : id); }
      });
      relayout(false);
      return node;
    }
    return {
      add,
      place: (id, zoneId) => place(id, zoneId, false),
      state,
      zoneOf: (id) => items.get(id)?.zone,
      count: (zoneId) => [...items.values()].filter((it) => it.zone === zoneId).length,
      itemsIn: (zoneId) => [...items].filter(([, it]) => it.zone === zoneId).map(([id]) => id),
      node: (id) => items.get(id)?.node,
      lock(on) { locked = on; select(null); fig.classList.toggle("is-locked", on); },
      zone: zoneOf,
    };
  }

  /* -------------------------------------------------------------------- art
   * Flat drawings in the videos' style, each a <g> centred on 0,0 (scale with s). Colours come from classes,
   * so dark mode follows the site theme: sc-teal, sc-gold, sc-red, sc-ink, sc-cream, sc-crust, sc-cheese. */
  const g = (parent, cls) => k.svg("g", cls ? { class: cls } : {}, parent);
  const art = {
    kid(parent, color = "teal", s = 1) {
      const n = g(parent, `sc-kid sc-${color}`);
      n.setAttribute("transform", `scale(${s})`);
      k.svg("circle", { cx: 0, cy: -30, r: 11 }, n);
      k.svg("rect", { x: -12, y: -18, width: 24, height: 27, rx: 9 }, n);
      k.svg("rect", { x: -10, y: 6, width: 8, height: 15, rx: 3 }, n);
      k.svg("rect", { x: 2, y: 6, width: 8, height: 15, rx: 3 }, n);
      return n;
    },
    // one slice of a pie cut into `of` parts, pointing up, tip at 0,0 (radius r)
    slice(parent, of, r = 40, cls = "sc-pizza") {
      const n = g(parent, cls);
      const a = Math.PI / of;
      const p = (t, rr) => [Math.sin(t) * rr, -Math.cos(t) * rr];
      const [x1, y1] = p(-a, r), [x2, y2] = p(a, r);
      k.svg("path", { d: `M0 0 L${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2} Z`, class: "sc-crust" }, n);
      const [x3, y3] = p(-a, r * 0.84), [x4, y4] = p(a, r * 0.84);
      k.svg("path", { d: `M0 0 L${x3} ${y3} A${r * 0.84} ${r * 0.84} 0 0 1 ${x4} ${y4} Z`, class: "sc-cheese" }, n);
      if (of <= 8) k.svg("circle", { cx: 0, cy: -r * 0.55, r: r * 0.09, class: "sc-red" }, n);
      return n;
    },
    candy(parent, color = "red", s = 1) {
      const n = g(parent, `sc-candy sc-${color}`);
      n.setAttribute("transform", `scale(${s})`);
      k.svg("path", { d: "M-16 -7 L-9 0 L-16 7 Z M16 -7 L9 0 L16 7 Z" }, n);
      k.svg("ellipse", { cx: 0, cy: 0, rx: 10, ry: 8 }, n);
      return n;
    },
    coin(parent, text = "₽", s = 1) {
      const n = g(parent, "sc-coin");
      n.setAttribute("transform", `scale(${s})`);
      k.svg("circle", { r: 15, class: "sc-gold" }, n);
      k.label(n, 0, 5, text, "sc-coin-text");
      return n;
    },
    card(parent, text, w = 80, h = 40, cls = "") {
      const n = g(parent, `sc-card ${cls}`);
      k.svg("rect", { x: -w / 2, y: -h / 2, width: w, height: h, rx: 8, class: "sc-card-bg" }, n);
      k.label(n, 0, 6, text, "sc-card-text");
      return n;
    },
  };

  const IntScenes = {
    kinds,
    kit: { ...k, stage, hint, celebrate, dnd, art },
    add(defs) { Object.assign(kinds, defs); },
  };

  IntTasks.TASK_TYPES.scene = {
    check: (t, v) => Boolean(kinds[t.kind]) && kinds[t.kind].check(t, v),
    build(el, t) {
      el.classList.add("task-scene", `scene-${t.kind}`);
      return kinds[t.kind].build(el, t, IntScenes.kit);
    },
  };

  if (typeof window !== "undefined") window.IntScenes = IntScenes;
  if (typeof module !== "undefined" && module.exports) module.exports = IntScenes;
})();
