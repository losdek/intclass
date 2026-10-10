/**
 * Interactive quiz tasks drawn in the style of the «за минуту» videos:
 * scales, a protractor, a number line, a coordinate grid and so on.
 *
 * A quiz item with a `type` is rendered by one of TASK_TYPES instead of radio options.
 * Each type has:
 *   check(task, value)  pure grading, also used by the unit tests
 *   build(el, task)     draws the widget into `el` and returns a controller
 *                       { value(), lock(on), reveal(), reset() }; value() is null until the pupil answers
 */
(function () {
  const NS = "http://www.w3.org/2000/svg";

  // −3 and 2,5 the way Russian textbooks print them
  const num = (n) => String(n).replace(".", ",").replace("-", "−");
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const sameSet = (a, b) =>
    Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x) => b.includes(x));

  function motion() {
    return typeof document !== "undefined" && document.documentElement.classList.contains("anim");
  }

  // Creates an SVG element: svg("circle", { cx: 1, r: 2, class: "f-dot" }, parent)
  function svg(tag, attrs, parent) {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs || {})) node.setAttribute(k, v);
    if (parent) parent.appendChild(node);
    return node;
  }

  function label(parent, x, y, text, cls, anchor) {
    const t = svg("text", { x, y, class: cls || "f-label", "text-anchor": anchor || "middle" }, parent);
    t.textContent = text;
    return t;
  }

  function pointer(svgEl, event) {
    const p = svgEl.createSVGPoint();
    p.x = event.clientX;
    p.y = event.clientY;
    return p.matrixTransform(svgEl.getScreenCTM().inverse());
  }

  // Animates a number from → to and calls draw(v) on every frame; jumps straight there without motion
  function tween(from, to, ms, draw, state) {
    cancelAnimationFrame(state.raf || 0);
    if (!motion() || from === to) {
      draw(to);
      return;
    }
    const start = performance.now();
    const step = (now) => {
      const k = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      draw(from + (to - from) * e);
      if (k < 1) state.raf = requestAnimationFrame(step);
    };
    state.raf = requestAnimationFrame(step);
  }

  function figure(el, viewBox, aria) {
    const fig = svg("svg", { viewBox, class: "task-fig", role: "img", "aria-label": aria });
    el.appendChild(fig);
    return fig;
  }

  // − value + control
  function stepper(parent, name, min, max, onChange) {
    const wrap = document.createElement("div");
    wrap.className = "task-step";
    wrap.innerHTML = `
      <span class="task-step-name">${name}</span>
      <button type="button" class="task-step-btn" data-d="-1" aria-label="${name}: уменьшить">−</button>
      <output class="task-step-out" aria-live="polite">?</output>
      <button type="button" class="task-step-btn" data-d="1" aria-label="${name}: увеличить">+</button>`;
    parent.appendChild(wrap);
    const out = wrap.querySelector("output");
    const api = {
      value: null,
      set(v) {
        api.value = v;
        out.textContent = v === null ? "?" : num(v);
        wrap.querySelector('[data-d="-1"]').disabled = v !== null && v <= min;
        wrap.querySelector('[data-d="1"]').disabled = v !== null && v >= max;
      },
    };
    wrap.addEventListener("click", (event) => {
      const btn = event.target.closest(".task-step-btn");
      if (!btn) return;
      const base = api.value === null ? 0 : api.value;
      const next = clamp(base + Number(btn.dataset.d), min, max);
      api.set(next);
      onChange(next);
      if (motion()) {
        out.classList.remove("bump");
        void out.offsetWidth;
        out.classList.add("bump");
      }
    });
    return api;
  }

  function slider(parent, name, min, max, step, onInput) {
    const wrap = document.createElement("label");
    wrap.className = "task-slider";
    wrap.innerHTML = `<span class="task-step-name">${name}</span>
      <input class="task-range" type="range" min="${min}" max="${max}" step="${step}" value="${min}">`;
    parent.appendChild(wrap);
    const input = wrap.querySelector("input");
    input.addEventListener("input", () => onInput(Number(input.value)));
    return input;
  }

  function controls(el) {
    const box = document.createElement("div");
    box.className = "task-controls";
    el.appendChild(box);
    return box;
  }

  function answerLine(el, text) {
    let line = el.querySelector(".task-answer");
    if (!line) {
      line = document.createElement("p");
      line.className = "task-answer";
      el.appendChild(line);
    }
    line.textContent = text;
    line.hidden = false;
  }

  function lockable(el) {
    return (on) => {
      el.classList.toggle("is-locked", on);
      el.querySelectorAll("button, input").forEach((c) => (c.disabled = on));
      el.querySelectorAll("[tabindex]").forEach((c) => c.setAttribute("tabindex", on ? "-1" : "0"));
      if (!on) {
        const line = el.querySelector(".task-answer");
        if (line) line.hidden = true;
      }
    };
  }

  // Taps anywhere on the figure set the value; dragging starts only on the handle,
  // so a finger that scrolls the page over the figure never changes the answer
  function drag(target, svgEl, onPoint) {
    svgEl.addEventListener("click", (event) => onPoint(pointer(svgEl, event)));
    target.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      target.setPointerCapture?.(event.pointerId);
      onPoint(pointer(svgEl, event));
      const move = (e) => onPoint(pointer(svgEl, e));
      const up = () => {
        target.removeEventListener("pointermove", move);
        target.removeEventListener("pointerup", up);
        target.removeEventListener("pointercancel", up);
      };
      target.addEventListener("pointermove", move);
      target.addEventListener("pointerup", up);
      target.addEventListener("pointercancel", up);
    });
  }

  // Keyboard/tap toggles for parts of a picture: role=checkbox (or radio) groups
  function toggleable(node, onToggle) {
    node.setAttribute("tabindex", "0");
    node.addEventListener("click", onToggle);
    node.addEventListener("keydown", (event) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        onToggle();
      }
    });
  }

  function pop(node) {
    if (!motion()) return;
    node.classList.remove("pop");
    void node.getBoundingClientRect();
    node.classList.add("pop");
  }

  /* ----------------------------------------------------------------- scales
   * Equation as a balance: x-boxes and weights on two pans, the pupil picks x until it balances.
   * task: { left: { x, n }, right: { x, n }, max, solution } */
  const scales = {
    check: (t, v) => v === t.solution,
    build(el, t) {
      const W = 340, PX = 170, PY = 40, ARM = 110, HANG = 60;
      const fig = figure(el, `0 0 ${W} 170`, "Чашечные весы");
      svg("rect", { x: PX - 44, y: 154, width: 88, height: 10, rx: 3, class: "f-ink" }, fig);
      svg("path", { d: `M${PX - 8} 154 L${PX - 4} ${PY} H${PX + 4} L${PX + 8} 154 Z`, class: "f-ink" }, fig);
      const beam = svg("g", {}, fig);
      svg("rect", { x: PX - ARM - 4, y: PY - 4, width: 2 * ARM + 8, height: 8, rx: 4, class: "f-ink" }, beam);
      const needle = svg("path", { d: `M${PX - 5} ${PY} L${PX} ${PY - 30} L${PX + 5} ${PY} Z`, class: "f-needle" }, beam);
      svg("circle", { cx: PX, cy: PY, r: 7, class: "f-ink" }, fig);
      svg("circle", { cx: PX, cy: PY, r: 3, class: "f-paper" }, fig);

      const pans = [t.left, t.right].map((side) => {
        const g = svg("g", {}, fig);
        svg("path", { d: `M0 0 L-52 ${HANG} M0 0 L52 ${HANG}`, class: "f-string" }, g);
        // the load sits on the pan rim (y = HANG): boxes «x» and numbered weights
        const items = [];
        for (let i = 0; i < side.x; i++) items.push({ kind: "x", w: 25 });
        if (side.n) items.push({ kind: "n", w: 32 });
        const total = items.reduce((s, it) => s + it.w, 0) + (items.length - 1) * 3;
        let x = -total / 2;
        for (const it of items) {
          if (it.kind === "x") {
            svg("rect", { x, y: HANG - 25, width: 25, height: 25, rx: 3, class: "f-box" }, g);
            label(g, x + 12.5, HANG - 7.5, "x", "f-box-text");
          } else {
            svg("path", {
              d: `M${x + 2} ${HANG} L${x + 6} ${HANG - 24} H${x + 26} L${x + 30} ${HANG} Z`,
              class: "f-weight",
            }, g);
            svg("circle", { cx: x + 16, cy: HANG - 27, r: 4.5, class: "f-weight-ring" }, g);
            label(g, x + 16, HANG - 6, num(side.n), "f-weight-text");
          }
          x += it.w + 3;
        }
        svg("path", { d: `M-56 ${HANG} H56 Q52 ${HANG + 14} 34 ${HANG + 15} H-34 Q-52 ${HANG + 14} -56 ${HANG} Z`, class: "f-pan" }, g);
        return g;
      });

      const state = { angle: 0 };
      const draw = (deg) => {
        state.angle = deg;
        beam.setAttribute("transform", `rotate(${deg} ${PX} ${PY})`);
        const r = (deg * Math.PI) / 180;
        [-1, 1].forEach((s, i) => {
          pans[i].setAttribute("transform", `translate(${PX + s * ARM * Math.cos(r)} ${PY + s * ARM * Math.sin(r)})`);
        });
      };
      const weigh = (side, x) => side.x * x + side.n;
      const update = (x, instant) => {
        const diff = weigh(t.left, x) - weigh(t.right, x);
        const target = -clamp(diff * 2.5, -12, 12);
        fig.classList.toggle("is-level", stepCtl.value !== null && diff === 0);
        fig.setAttribute("aria-label", stepCtl.value === null
          ? "Чашечные весы"
          : diff === 0 ? `Весы в равновесии при x = ${num(x)}` : `Перевешивает ${diff > 0 ? "левая" : "правая"} чаша`);
        if (instant) draw(target);
        else tween(state.angle, target, 420, draw, state);
        if (diff === 0) pop(needle);
      };
      const stepCtl = stepper(controls(el), "x", 0, t.max || 20, (x) => update(x));
      const lock = lockable(el);
      const reset = () => {
        lock(false);
        stepCtl.set(null);
        update(0, true);
      };
      reset();
      return {
        value: () => stepCtl.value,
        lock,
        reveal() {
          stepCtl.set(t.solution);
          update(t.solution);
          answerLine(el, `Весы уравновешены при x = ${num(t.solution)}`);
        },
        reset,
      };
    },
  };

  /* ------------------------------------------------------------------ angle
   * A protractor; the pupil turns a ray. task: { accept: [min, max], solution } */
  const angle = {
    check: (t, v) => typeof v === "number" && v >= t.accept[0] && v <= t.accept[1],
    build(el, t) {
      const CX = 150, CY = 150, R = 118;
      const fig = figure(el, "0 0 300 168", "Транспортир и угол");
      const at = (deg, r) => [CX + r * Math.cos((deg * Math.PI) / 180), CY - r * Math.sin((deg * Math.PI) / 180)];
      svg("path", { d: `M${CX - R} ${CY} A${R} ${R} 0 0 1 ${CX + R} ${CY} Z`, class: "f-protractor" }, fig);
      for (let d = 0; d <= 180; d += 10) {
        const long = d % 30 === 0;
        const [x1, y1] = at(d, R);
        const [x2, y2] = at(d, R - (long ? 12 : 7));
        svg("line", { x1, y1, x2, y2, class: "f-tick" }, fig);
        if (long && d > 0 && d < 180) {
          const [lx, ly] = at(d, R - 22);
          label(fig, lx, ly + 3, String(d), "f-label f-small");
        }
      }
      const wedge = svg("path", { class: "f-wedge" }, fig);
      svg("line", { x1: CX, y1: CY, x2: CX + R + 14, y2: CY, class: "f-ray" }, fig);
      const ray = svg("line", { x1: CX, y1: CY, class: "f-ray f-ray-move" }, fig);
      svg("circle", { cx: CX, cy: CY, r: 4.5, class: "f-ink" }, fig);
      const readout = label(fig, CX, CY - 40, "?", "f-readout");
      const handle = svg("g", { class: "f-handle" }, fig);
      svg("circle", { r: 22, class: "f-hit" }, handle);
      svg("circle", { r: 8, class: "f-knob" }, handle);

      let value = null;
      const draw = (deg) => {
        const [ex, ey] = at(deg, R + 14);
        ray.setAttribute("x2", ex);
        ray.setAttribute("y2", ey);
        handle.setAttribute("transform", `translate(${ex} ${ey})`);
        const [ax, ay] = at(deg, 30);
        wedge.setAttribute("d", `M${CX} ${CY} L${CX + 30} ${CY} A30 30 0 0 0 ${ax} ${ay} Z`);
        const [lx, ly] = at(deg / 2, 48);
        readout.setAttribute("x", lx);
        readout.setAttribute("y", ly + 4);
      };
      const set = (deg) => {
        value = Math.round(clamp(deg, 0, 180));
        input.value = value;
        readout.textContent = `${value}°`;
        fig.setAttribute("aria-label", `Угол ${value}°`);
        draw(value);
      };
      drag(handle, fig, (p) => {
        let deg = (Math.atan2(CY - p.y, p.x - CX) * 180) / Math.PI;
        if (deg < 0) deg = p.x < CX ? 180 : 0;
        set(deg);
      });
      const input = slider(controls(el), "Угол", 0, 180, 1, set);
      const lock = lockable(el);
      const reset = () => {
        value = null;
        input.value = 30;
        readout.textContent = "?";
        draw(30);
        lock(false);
      };
      reset();
      return {
        value: () => value,
        lock,
        reveal() {
          set(t.solution);
          answerLine(el, `Подходит, например, ${t.solution}° — от ${t.accept[0]}° до ${t.accept[1]}°`);
        },
        reset,
      };
    },
  };

  /* ------------------------------------------------------------- numberline
   * Tap the ticks of a number line. task: { min, max, solution: [numbers] } */
  const numberline = {
    check: (t, v) => sameSet(v, t.solution),
    build(el, t) {
      const n = t.max - t.min;
      const X0 = 20, STEP = 300 / n, Y = 34;
      const fig = figure(el, "0 0 340 66", "Числовая ось");
      fig.setAttribute("role", "group");
      svg("line", { x1: 6, y1: Y, x2: 330, y2: Y, class: "f-axis" }, fig);
      svg("path", { d: `M330 ${Y} l-9 -5 v10 Z`, class: "f-ink" }, fig);
      const picked = new Set();
      const ticks = [];
      for (let v = t.min; v <= t.max; v++) {
        const x = X0 + (v - t.min) * STEP;
        const g = svg("g", { class: "f-pick f-tick-btn", role: "checkbox", "aria-checked": "false", "aria-label": num(v) }, fig);
        svg("rect", { x: x - STEP / 2, y: 0, width: STEP, height: 66, class: "f-hit" }, g);
        svg("line", { x1: x, y1: Y - (v === 0 ? 9 : 6), x2: x, y2: Y + (v === 0 ? 9 : 6), class: "f-tick" }, g);
        svg("circle", { cx: x, cy: Y, r: 7, class: "f-mark" }, g);
        label(g, x, Y + 24, num(v), v === 0 ? "f-label f-zero" : "f-label");
        toggleable(g, () => {
          if (picked.has(v)) picked.delete(v);
          else picked.add(v);
          g.classList.toggle("is-on", picked.has(v));
          g.setAttribute("aria-checked", String(picked.has(v)));
          if (picked.has(v)) pop(g.querySelector(".f-mark"));
        });
        ticks.push({ v, g });
      }
      const lock = lockable(el);
      return {
        value: () => (picked.size ? [...picked] : null),
        lock,
        reveal() {
          ticks.forEach(({ v, g }) => {
            g.classList.toggle("is-answer", t.solution.includes(v));
            g.classList.toggle("is-miss", picked.has(v) && !t.solution.includes(v));
          });
          answerLine(el, `Верно: ${t.solution.map(num).join(" и ")}`);
        },
        reset() {
          picked.clear();
          ticks.forEach(({ g }) => {
            g.classList.remove("is-on", "is-answer", "is-miss");
            g.setAttribute("aria-checked", "false");
          });
          lock(false);
        },
      };
    },
  };

  /* -------------------------------------------------------------- the grid
   * Coordinate plane −R..R shared by «plane» and «line» */
  function grid(fig, R, C, O) {
    for (let i = -R; i <= R; i++) {
      svg("line", { x1: O + i * C, y1: O - R * C, x2: O + i * C, y2: O + R * C, class: "f-grid" }, fig);
      svg("line", { x1: O - R * C, y1: O + i * C, x2: O + R * C, y2: O + i * C, class: "f-grid" }, fig);
    }
    svg("line", { x1: O - R * C - 6, y1: O, x2: O + R * C + 8, y2: O, class: "f-axis" }, fig);
    svg("line", { x1: O, y1: O + R * C + 6, x2: O, y2: O - R * C - 8, class: "f-axis" }, fig);
    svg("path", { d: `M${O + R * C + 12} ${O} l-9 -4.5 v9 Z M${O} ${O - R * C - 12} l-4.5 9 h9 Z`, class: "f-ink" }, fig);
    label(fig, O + R * C + 12, O - 8, "x", "f-label f-axis-name", "end");
    label(fig, O + 9, O - R * C - 6, "y", "f-label f-axis-name", "start");
    for (let i = -R; i <= R; i++) {
      if (i === 0) continue;
      label(fig, O + i * C, O + 13, num(i), "f-label f-small");
      label(fig, O - 5, O - i * C + 3, num(i), "f-label f-small", "end");
    }
    label(fig, O - 6, O + 13, "0", "f-label f-small", "end");
  }

  /* ------------------------------------------------------------------ plane
   * Put point A at the given coordinates. task: { range, solution: [x, y] } */
  const plane = {
    check: (t, v) => Array.isArray(v) && v[0] === t.solution[0] && v[1] === t.solution[1],
    build(el, t) {
      const R = t.range || 5, C = 22, O = R * C + 24, S = 2 * O;
      const fig = figure(el, `0 0 ${S} ${S}`, "Координатная плоскость");
      fig.setAttribute("tabindex", "0");
      fig.classList.add("is-tappable");
      grid(fig, R, C, O);
      const ghost = svg("g", { class: "f-ghost", visibility: "hidden" }, fig);
      const guides = svg("path", { class: "f-guide" }, ghost);
      const ghostDot = svg("circle", { r: 9, class: "f-ghost-dot" }, ghost);
      const dot = svg("g", { class: "f-point", visibility: "hidden" }, fig);
      svg("circle", { r: 6.5, class: "f-dot" }, dot);
      label(dot, 9, -9, "A", "f-point-name", "start");
      let value = null;
      const place = (x, y) => {
        value = [clamp(x, -R, R), clamp(y, -R, R)];
        dot.setAttribute("visibility", "visible");
        dot.setAttribute("transform", `translate(${O + value[0] * C} ${O - value[1] * C})`);
        fig.setAttribute("aria-label", `Точка A(${num(value[0])}; ${num(value[1])})`);
        pop(dot.firstChild);
      };
      fig.addEventListener("click", (event) => {
        const p = pointer(fig, event);
        place(Math.round((p.x - O) / C), Math.round((O - p.y) / C));
      });
      fig.addEventListener("keydown", (event) => {
        const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, 1], ArrowDown: [0, -1] }[event.key];
        if (!d) return;
        event.preventDefault();
        const [x, y] = value || [0, 0];
        place(x + (value ? d[0] : 0), y + (value ? d[1] : 0));
      });
      const lock = lockable(el);
      return {
        value: () => value,
        lock,
        reveal() {
          const [x, y] = t.solution;
          const px = O + x * C, py = O - y * C;
          guides.setAttribute("d", `M${px} ${O} V${py} H${O}`);
          ghostDot.setAttribute("cx", px);
          ghostDot.setAttribute("cy", py);
          ghost.setAttribute("visibility", "visible");
          answerLine(el, `Верно: A(${num(x)}; ${num(y)}) — сначала x по горизонтали, потом y по вертикали`);
        },
        reset() {
          value = null;
          dot.setAttribute("visibility", "hidden");
          ghost.setAttribute("visibility", "hidden");
          fig.setAttribute("aria-label", "Координатная плоскость");
          lock(false);
        },
      };
    },
  };

  /* ------------------------------------------------------------------- pick
   * Tap parts of a drawing. task: { figure: "circle" | "square", solution: [part ids] } */
  const FIGURES = {
    circle(fig) {
      const cx = 130, cy = 108, r = 90;
      const at = (deg) => [cx + r * Math.cos((deg * Math.PI) / 180), cy - r * Math.sin((deg * Math.PI) / 180)];
      svg("circle", { cx, cy, r, class: "f-disk" }, fig);
      const seg = (a, b) => `M${a[0]} ${a[1]} L${b[0]} ${b[1]}`;
      const A = at(5), B = at(128), C = at(308), D = at(205), E = at(250);
      const parts = [
        { id: "radius", name: "Отрезок OA", d: seg([cx, cy], A) },
        { id: "diameter", name: "Отрезок BC", d: seg(B, C) },
        { id: "chord", name: "Отрезок DE", d: seg(D, E) },
      ];
      const points = [["O", cx, cy, -14, 16], ["A", ...A, 12, 4], ["B", ...B, -10, -6], ["C", ...C, 10, 12],
        ["D", ...D, -14, 6], ["E", ...E, -6, 16]];
      return { parts, points, kind: "line" };
    },
    square(fig) {
      const x0 = 34, y0 = 30, a = 110, b = 64;
      const rect = (x, y, w, h) => `M${x} ${y} h${w} v${h} h${-w} Z`;
      label(fig, x0 + a / 2, y0 - 10, "a", "f-side f-side-a");
      label(fig, x0 + a + b / 2, y0 - 10, "b", "f-side f-side-b");
      label(fig, x0 - 12, y0 + a / 2 + 5, "a", "f-side f-side-a");
      label(fig, x0 - 12, y0 + a + b / 2 + 5, "b", "f-side f-side-b");
      const parts = [
        { id: "a2", name: "Левый верхний квадрат", d: rect(x0, y0, a, a), c: [x0 + a / 2, y0 + a / 2], text: "a²" },
        { id: "ab1", name: "Правый верхний прямоугольник", d: rect(x0 + a, y0, b, a), c: [x0 + a + b / 2, y0 + a / 2], text: "ab" },
        { id: "ab2", name: "Левый нижний прямоугольник", d: rect(x0, y0 + a, a, b), c: [x0 + a / 2, y0 + a + b / 2], text: "ab" },
        { id: "b2", name: "Правый нижний квадрат", d: rect(x0 + a, y0 + a, b, b), c: [x0 + a + b / 2, y0 + a + b / 2], text: "b²" },
      ];
      return { parts, points: [], kind: "area" };
    },
  };

  const pick = {
    check: (t, v) => sameSet(v, t.solution),
    build(el, t) {
      const fig = figure(el, t.figure === "square" ? "0 0 220 212" : "0 0 260 216", "Чертёж");
      fig.setAttribute("role", "group");
      const { parts, points, kind } = FIGURES[t.figure](fig);
      const multi = t.solution.length > 1;
      const picked = new Set();
      const nodes = parts.map((part) => {
        const g = svg("g", {
          class: `f-pick f-part f-part-${kind}`,
          role: multi ? "checkbox" : "radio",
          "aria-checked": "false",
          "aria-label": part.name,
        }, fig);
        if (kind === "line") svg("path", { d: part.d, class: "f-hit-line" }, g);
        svg("path", { d: part.d, class: "f-part-shape" }, g);
        if (part.text) label(g, part.c[0], part.c[1] + 6, part.text, "f-area-text");
        toggleable(g, () => {
          if (!multi) {
            picked.forEach((id) => id !== part.id && picked.delete(id));
          }
          if (picked.has(part.id)) picked.delete(part.id);
          else picked.add(part.id);
          nodes.forEach(({ id, g: node }) => {
            node.classList.toggle("is-on", picked.has(id));
            node.setAttribute("aria-checked", String(picked.has(id)));
          });
          if (picked.has(part.id)) pop(g.querySelector(".f-part-shape"));
        });
        return { id: part.id, g };
      });
      for (const [name, x, y, dx, dy] of points) {
        svg("circle", { cx: x, cy: y, r: 3.5, class: "f-ink" }, fig);
        label(fig, x + dx, y + dy, name, "f-point-name");
      }
      const lock = lockable(el);
      return {
        value: () => (picked.size ? [...picked] : null),
        lock,
        reveal() {
          nodes.forEach(({ id, g }) => {
            g.classList.toggle("is-answer", t.solution.includes(id));
            g.classList.toggle("is-miss", picked.has(id) && !t.solution.includes(id));
          });
          el.classList.add("show-areas");
          answerLine(el, t.reveal || "Верный ответ подсвечен зелёным");
        },
        reset() {
          picked.clear();
          nodes.forEach(({ g }) => {
            g.classList.remove("is-on", "is-answer", "is-miss");
            g.setAttribute("aria-checked", "false");
          });
          el.classList.remove("show-areas");
          lock(false);
        },
      };
    },
  };

  /* ------------------------------------------------------------------ level
   * Bar chart; the pupil drags a line to the mean. task: { values, labels, max, step, solution } */
  const level = {
    check: (t, v) => v === t.solution,
    build(el, t) {
      const U = 17, BASE = 168, BW = 36, GAP = 16, X0 = 34;
      const right = X0 + t.values.length * (BW + GAP) - GAP;
      const fig = figure(el, `0 0 ${right + 46} 194`, "Столбчатая диаграмма");
      fig.classList.add("is-tappable");
      for (let v = 0; v <= t.max; v += 2) {
        svg("line", { x1: X0 - 8, y1: BASE - v * U, x2: right + 8, y2: BASE - v * U, class: "f-grid" }, fig);
        label(fig, X0 - 13, BASE - v * U + 3, String(v), "f-label f-small", "end");
      }
      const extra = [];
      t.values.forEach((v, i) => {
        const x = X0 + i * (BW + GAP);
        svg("rect", { x, y: BASE - v * U, width: BW, height: v * U, rx: 3, class: "f-bar" }, fig);
        // part of the bar above the line, and the gap below it, so the pupil can see the levelling
        extra.push({
          v,
          over: svg("rect", { x, width: BW, rx: 3, class: "f-over" }, fig),
          under: svg("rect", { x: x + 1, width: BW - 2, class: "f-under" }, fig),
        });
        label(fig, x + BW / 2, BASE - v * U - 6, String(v), "f-label f-value");
        label(fig, x + BW / 2, BASE + 16, (t.labels || [])[i] || "", "f-label");
      });
      svg("line", { x1: X0 - 8, y1: BASE, x2: right + 8, y2: BASE, class: "f-axis" }, fig);
      const line = svg("g", { class: "f-level" }, fig);
      svg("line", { x1: X0 - 8, y1: 0, x2: right + 8, y2: 0, class: "f-level-line" }, line);
      const knob = svg("g", { class: "f-handle", transform: `translate(${right + 24} 0)` }, line);
      svg("circle", { r: 20, class: "f-hit" }, knob);
      svg("circle", { r: 13, class: "f-knob" }, knob);
      const knobText = label(knob, 0, 4, "?", "f-knob-text");

      let value = null;
      const draw = (L) => {
        line.setAttribute("transform", `translate(0 ${BASE - L * U})`);
        extra.forEach(({ v, over, under }) => {
          const hi = Math.max(v, L), lo = Math.min(v, L);
          over.setAttribute("y", BASE - v * U);
          over.setAttribute("height", v > L ? (v - L) * U : 0);
          under.setAttribute("y", BASE - hi * U);
          under.setAttribute("height", v < L ? (hi - lo) * U : 0);
        });
      };
      const step = t.step || 0.5;
      const set = (L) => {
        value = clamp(Math.round(L / step) * step, 0, t.max);
        input.value = value;
        knobText.textContent = num(value);
        fig.setAttribute("aria-label", `Линия на уровне ${num(value)}`);
        draw(value);
      };
      drag(knob, fig, (p) => set((BASE - p.y) / U));
      const input = slider(controls(el), "Уровень", 0, t.max, step, set);
      const lock = lockable(el);
      const reset = () => {
        value = null;
        knobText.textContent = "?";
        input.value = t.max;
        draw(t.max);
        lock(false);
      };
      reset();
      return {
        value: () => value,
        lock,
        reveal() {
          set(t.solution);
          answerLine(el, `Среднее — ${num(t.solution)}: всё, что выше линии, ровно заполняет пустоты ниже`);
        },
        reset,
      };
    },
  };

  /* ---------------------------------------------------------- triangle-sum
   * Corners of a triangle torn off and put on a straight line. task: { a, b, solution } */
  const triangleSum = {
    check: (t, v) => v === t.solution,
    build(el, t) {
      const fig = figure(el, "0 0 330 150", "Углы треугольника на прямой");
      const rad = (d) => (d * Math.PI) / 180;
      // the triangle itself, drawn to scale
      const A = [12, 128], AB = 112;
      const B = [A[0] + AB, A[1]];
      const side = (AB * Math.sin(rad(t.b))) / Math.sin(rad(180 - t.a - t.b));
      const C = [A[0] + side * Math.cos(rad(t.a)), A[1] - side * Math.sin(rad(t.a))];
      const corner = (p, from, sweep, r, cls) => {
        const s = [p[0] + r * Math.cos(rad(from)), p[1] - r * Math.sin(rad(from))];
        const e = [p[0] + r * Math.cos(rad(from + sweep)), p[1] - r * Math.sin(rad(from + sweep))];
        return svg("path", {
          d: `M${p[0]} ${p[1]} L${s[0]} ${s[1]} A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 0 ${e[0]} ${e[1]} Z`,
          class: cls,
        }, fig);
      };
      const cDir = (Math.atan2(A[1] - C[1], A[0] - C[0]) * -180) / Math.PI;
      corner(A, 0, t.a, 18, "f-w-a");
      corner(B, 180 - t.b, t.b, 18, "f-w-b");
      corner(C, cDir, 180 - t.a - t.b, 18, "f-w-c");
      svg("path", { d: `M${A} L${B} L${C} Z`, class: "f-tri" }, fig);
      label(fig, A[0] + 6, A[1] + 16, "A", "f-point-name");
      label(fig, B[0], B[1] + 16, "B", "f-point-name");
      label(fig, C[0], C[1] - 7, "C", "f-point-name");

      // the corners on a straight line: A and B fixed, C turned by the pupil
      const P = [238, 128], R = 74;
      svg("line", { x1: P[0] - R - 14, y1: P[1], x2: P[0] + R + 14, y2: P[1], class: "f-axis" }, fig);
      corner(P, 180 - t.a, t.a, R, "f-w-a f-big");
      corner(P, 180 - t.a - t.b, t.b, R, "f-w-b f-big");
      const wc = svg("path", { class: "f-w-c f-big" }, fig);
      svg("circle", { cx: P[0], cy: P[1], r: 3.5, class: "f-ink" }, fig);
      const mid = (from, sweep, r) => [P[0] + r * Math.cos(rad(from + sweep / 2)), P[1] - r * Math.sin(rad(from + sweep / 2)) + 4];
      label(fig, ...mid(180 - t.a, t.a, R * 0.62), `${t.a}°`, "f-wedge-text");
      label(fig, ...mid(180 - t.a - t.b, t.b, R * 0.62), `${t.b}°`, "f-wedge-text");
      const cText = label(fig, 0, 0, "?", "f-wedge-text");
      label(fig, P[0], P[1] + 16, "180°", "f-label");

      const top = 180 - t.a - t.b;
      let value = null;
      const draw = (c) => {
        const from = top - c;
        const s = [P[0] + R * Math.cos(rad(top)), P[1] - R * Math.sin(rad(top))];
        const e = [P[0] + R * Math.cos(rad(from)), P[1] - R * Math.sin(rad(from))];
        wc.setAttribute("d", `M${P[0]} ${P[1]} L${s[0]} ${s[1]} A${R} ${R} 0 0 1 ${e[0]} ${e[1]} Z`);
        const [mx, my] = mid(from, c, R * 0.62);
        cText.setAttribute("x", mx);
        cText.setAttribute("y", my);
        wc.classList.toggle("is-over", c > top);
      };
      const set = (c) => {
        value = Math.round(clamp(c, 5, 120));
        input.value = value;
        cText.textContent = `${value}°`;
        fig.setAttribute("aria-label", `Угол C = ${value}°`);
        draw(value);
      };
      const input = slider(controls(el), "Угол C", 5, 120, 1, set);
      const lock = lockable(el);
      const reset = () => {
        value = null;
        input.value = 20;
        cText.textContent = "?";
        draw(20);
        lock(false);
      };
      reset();
      return {
        value: () => value,
        lock,
        reveal() {
          set(t.solution);
          answerLine(el, `∠C = 180° − ${t.a}° − ${t.b}° = ${t.solution}°`);
        },
        reset,
      };
    },
  };

  /* ------------------------------------------------------------------- line
   * Choose k and b so y = kx + b passes through the marked points. task: { points, solution: { k, b } } */
  const line = {
    check: (t, v) => Boolean(v) && t.points.every(([x, y]) => v.k * x + v.b === y),
    build(el, t) {
      const R = 5, C = 22, O = R * C + 24, S = 2 * O;
      const fig = figure(el, `0 0 ${S} ${S}`, "График линейной функции");
      const clip = svg("clipPath", { id: `clip-${Math.random().toString(36).slice(2)}` }, fig);
      svg("rect", { x: O - R * C, y: O - R * C, width: 2 * R * C, height: 2 * R * C }, clip);
      grid(fig, R, C, O);
      const path = svg("line", { class: "f-graph", "clip-path": `url(#${clip.id})` }, fig);
      const marks = t.points.map(([x, y]) => {
        const g = svg("g", { class: "f-target", transform: `translate(${O + x * C} ${O - y * C})` }, fig);
        svg("circle", { r: 7, class: "f-target-dot" }, g);
        label(g, 10, y < 0 ? 16 : -9, `(${num(x)}; ${num(y)})`, "f-target-text", "start");
        return { x, y, g };
      });
      const formula = document.createElement("p");
      formula.className = "task-formula";
      const box = controls(el);
      box.before(formula);
      let k = 1, b = 0, touched = false;
      const draw = () => {
        path.setAttribute("x1", O - 7 * C);
        path.setAttribute("y1", O - (k * -7 + b) * C);
        path.setAttribute("x2", O + 7 * C);
        path.setAttribute("y2", O - (k * 7 + b) * C);
        marks.forEach((m) => m.g.classList.toggle("is-hit", k * m.x + b === m.y));
        const kx = k === 1 ? "x" : k === -1 ? "−x" : k === 0 ? "" : `${num(k)}x`;
        const bs = b === 0 ? (k === 0 ? "0" : "") : `${kx ? (b > 0 ? " + " : " − ") : b < 0 ? "−" : ""}${num(Math.abs(b))}`;
        formula.textContent = `y = ${kx}${bs}`;
        fig.setAttribute("aria-label", `График ${formula.textContent}`);
      };
      const kCtl = stepper(box, "k", -4, 4, (v) => { k = v; touched = true; draw(); });
      const bCtl = stepper(box, "b", -5, 5, (v) => { b = v; touched = true; draw(); });
      const lock = lockable(el);
      const reset = () => {
        lock(false);
        k = 1;
        b = 0;
        touched = false;
        kCtl.set(1);
        bCtl.set(0);
        draw();
      };
      reset();
      return {
        value: () => (touched ? { k, b } : null),
        lock,
        reveal() {
          k = t.solution.k;
          b = t.solution.b;
          kCtl.set(k);
          bCtl.set(b);
          draw();
          answerLine(el, `Верно: ${formula.textContent}`);
        },
        reset,
      };
    },
  };

  const TASK_TYPES = { scales, angle, numberline, plane, pick, level, "triangle-sum": triangleSum, line };

  const IntTasks = {
    TASK_TYPES,
    check(task, value) {
      const type = TASK_TYPES[task.type];
      return Boolean(type) && value !== null && value !== undefined && type.check(task, value);
    },
    // Fills <div class="task" data-task="type"> and keeps the controller on the element
    mount(el, task) {
      const type = TASK_TYPES[task.type];
      if (!type || el.taskCtrl) return el.taskCtrl;
      el.textContent = "";
      el.taskCtrl = type.build(el, task);
      return el.taskCtrl;
    },
  };

  if (typeof window !== "undefined") window.IntTasks = IntTasks;
  if (typeof module !== "undefined" && module.exports) module.exports = IntTasks;
})();
