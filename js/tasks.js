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
  const sameList = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => x === b[i]);
  // "−3 и 3", "−2, −1 и 0"
  const listJoin = (items) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} и ${items[items.length - 1]}`);

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

  // − [typed number] + : for answers that are too big to reach with a stepper alone
  function numberField(parent, name, opts, onChange) {
    const { min = -1e6, max = 1e6, unit = "", buttons = true } = opts || {};
    const wrap = document.createElement("div");
    wrap.className = "task-step task-number";
    wrap.innerHTML = `
      ${name ? `<span class="task-step-name">${name}</span>` : ""}
      ${buttons ? `<button type="button" class="task-step-btn" data-d="-1" aria-label="${name || "Ответ"}: уменьшить">−</button>` : ""}
      <input class="task-entry" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" placeholder="?" aria-label="${name || "Ответ"}">
      ${buttons ? `<button type="button" class="task-step-btn" data-d="1" aria-label="${name || "Ответ"}: увеличить">+</button>` : ""}
      ${unit ? `<span class="task-unit">${unit}</span>` : ""}`;
    parent.appendChild(wrap);
    const input = wrap.querySelector("input");
    const api = {
      value: null,
      set(v) {
        api.value = v;
        input.value = v === null ? "" : num(v);
      },
    };
    input.addEventListener("input", () => {
      const raw = input.value.replace(/[\s ]/g, "").replace("−", "-").replace(",", ".");
      const v = Number(raw);
      api.value = raw === "" || raw === "-" || !Number.isFinite(v) ? null : clamp(Math.round(v), min, max);
      onChange(api.value);
    });
    wrap.addEventListener("click", (event) => {
      const btn = event.target.closest(".task-step-btn");
      if (!btn) return;
      const next = clamp((api.value === null ? 0 : api.value) + Number(btn.dataset.d), min, max);
      api.set(next);
      onChange(next);
      pop(input);
    });
    return api;
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
   * Tap the ticks of a number line. task: { min, max, solution: [numbers], start? }
   * One number in the solution makes it a single choice; `start` marks where a jump begins
   * and the chosen answer gets an arrow from there, like the steps along the axis in the video. */
  const numberline = {
    check: (t, v) => sameSet(v, t.solution),
    build(el, t) {
      const n = t.max - t.min;
      const hasStart = t.start !== undefined;
      const X0 = 20, STEP = 300 / n, Y = hasStart ? 54 : 34, H = Y + 32;
      const multi = t.solution.length > 1;
      const at = (v) => X0 + (v - t.min) * STEP;
      const fig = figure(el, `0 0 340 ${H}`, "Числовая ось");
      fig.setAttribute("role", multi ? "group" : "radiogroup");
      svg("line", { x1: 6, y1: Y, x2: 330, y2: Y, class: "f-axis" }, fig);
      svg("path", { d: `M330 ${Y} l-9 -5 v10 Z`, class: "f-ink" }, fig);
      const jump = svg("path", { class: "f-jump", visibility: "hidden" }, fig);
      if (hasStart) {
        const sx = at(t.start);
        svg("circle", { cx: sx, cy: Y, r: 6, class: "f-start" }, fig);
        label(fig, sx, Y - 13, "старт", "f-label f-start-text");
      }
      const drawJump = (to) => {
        if (!hasStart || to === undefined) {
          jump.setAttribute("visibility", "hidden");
          return;
        }
        const sx = at(t.start), ex = at(to), h = Math.min(34, 10 + Math.abs(ex - sx) * 0.3);
        const dir = ex >= sx ? 1 : -1;
        jump.setAttribute("d", `M${sx} ${Y - 8} Q${(sx + ex) / 2} ${Y - 8 - h * 2} ${ex} ${Y - 9} m${-6 * dir} -7 l${6 * dir} 7 l${-8 * dir} 3`);
        jump.setAttribute("visibility", ex === sx ? "hidden" : "visible");
      };
      const picked = new Set();
      const ticks = [];
      for (let v = t.min; v <= t.max; v++) {
        const x = at(v);
        const g = svg("g", { class: "f-pick f-tick-btn", role: multi ? "checkbox" : "radio", "aria-checked": "false", "aria-label": num(v) }, fig);
        svg("rect", { x: x - STEP / 2, y: 0, width: STEP, height: H, class: "f-hit" }, g);
        svg("line", { x1: x, y1: Y - (v === 0 ? 9 : 6), x2: x, y2: Y + (v === 0 ? 9 : 6), class: "f-tick" }, g);
        svg("circle", { cx: x, cy: Y, r: 7, class: "f-mark" }, g);
        label(g, x, Y + 24, num(v), v === 0 ? "f-label f-zero" : "f-label");
        toggleable(g, () => {
          if (picked.has(v)) picked.delete(v);
          else {
            if (!multi) picked.clear();
            picked.add(v);
          }
          ticks.forEach((tk) => {
            tk.g.classList.toggle("is-on", picked.has(tk.v));
            tk.g.setAttribute("aria-checked", String(picked.has(tk.v)));
          });
          if (picked.has(v)) pop(g.querySelector(".f-mark"));
          drawJump(multi ? undefined : [...picked][0]);
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
          if (!multi) drawJump(t.solution[0]);
          answerLine(el, t.reveal || `Верно: ${listJoin(t.solution.map(num))}`);
        },
        reset() {
          picked.clear();
          ticks.forEach(({ g }) => {
            g.classList.remove("is-on", "is-answer", "is-miss");
            g.setAttribute("aria-checked", "false");
          });
          drawJump(undefined);
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

  // y = kx + b across the whole grid, clipped to it
  function graphLine(fig, R, C, O, cls) {
    const clip = svg("clipPath", { id: `clip-${Math.random().toString(36).slice(2)}` }, fig);
    svg("rect", { x: O - R * C, y: O - R * C, width: 2 * R * C, height: 2 * R * C }, clip);
    const node = svg("line", { class: cls, "clip-path": `url(#${clip.id})` }, fig);
    return (k, b) => {
      node.setAttribute("x1", O - (R + 2) * C);
      node.setAttribute("y1", O - (k * -(R + 2) + b) * C);
      node.setAttribute("x2", O + (R + 2) * C);
      node.setAttribute("y2", O - (k * (R + 2) + b) * C);
    };
  }

  const QUADRANT = { 1: [1, 1], 2: [-1, 1], 3: [-1, -1], 4: [1, -1] };

  /* ------------------------------------------------------------------ plane
   * Put a point on the grid. task: { range, solution: [x, y], name?, quadrant?, given?, shape?, graph? }
   *   quadrant: any point of that quarter is right (solution is just an example)
   *   given: [[x, y, "B"], …] fixed points; shape: names in order, "?" for the pupil's point
   *   graph: { k, b } draws y = kx + b */
  const plane = {
    check: (t, v) => {
      if (!Array.isArray(v)) return false;
      if (t.quadrant) {
        const [sx, sy] = QUADRANT[t.quadrant];
        return Math.sign(v[0]) === sx && Math.sign(v[1]) === sy;
      }
      return v[0] === t.solution[0] && v[1] === t.solution[1];
    },
    build(el, t) {
      const R = t.range || 5, C = 22, O = R * C + 24, S = 2 * O;
      const name = t.name || "A";
      const fig = figure(el, `0 0 ${S} ${S}`, "Координатная плоскость");
      fig.setAttribute("tabindex", "0");
      fig.classList.add("is-tappable");
      grid(fig, R, C, O);
      if (t.quadrant) {
        const [sx, sy] = QUADRANT[t.quadrant];
        svg("rect", {
          x: sx > 0 ? O : O - R * C, y: sy > 0 ? O - R * C : O, width: R * C, height: R * C, class: "f-quadrant",
        }, fig);
      }
      if (t.graph) {
        graphLine(fig, R, C, O, "f-graph f-graph-given")(t.graph.k, t.graph.b);
      }
      const shape = t.shape ? svg("path", { class: "f-shape" }, fig) : null;
      const points = {};
      (t.given || []).forEach(([x, y, n]) => {
        points[n] = [x, y];
        svg("circle", { cx: O + x * C, cy: O - y * C, r: 4.5, class: "f-ink" }, fig);
        label(fig, O + x * C + (x < 0 ? -8 : 8), O - y * C + (y < 0 ? 17 : -8), n, "f-point-name", x < 0 ? "end" : "start");
      });
      const drawShape = (p) => {
        if (!shape) return;
        const pts = t.shape.map((n) => (n === "?" ? p : points[n])).filter(Boolean);
        shape.setAttribute("d", pts.length ? `M${pts.map(([x, y]) => `${O + x * C} ${O - y * C}`).join(" L")}${p ? " Z" : ""}` : "");
      };
      drawShape(null);
      const ghost = svg("g", { class: "f-ghost", visibility: "hidden" }, fig);
      const guides = svg("path", { class: "f-guide" }, ghost);
      const ghostDot = svg("circle", { r: 9, class: "f-ghost-dot" }, ghost);
      const dot = svg("g", { class: "f-point", visibility: "hidden" }, fig);
      svg("circle", { r: 6.5, class: "f-dot" }, dot);
      label(dot, 9, -9, name, "f-point-name", "start");
      let value = null;
      const place = (x, y) => {
        value = [clamp(x, -R, R), clamp(y, -R, R)];
        dot.setAttribute("visibility", "visible");
        dot.setAttribute("transform", `translate(${O + value[0] * C} ${O - value[1] * C})`);
        fig.setAttribute("aria-label", `Точка ${name}(${num(value[0])}; ${num(value[1])})`);
        drawShape(value);
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
          answerLine(el, t.reveal || `Верно: ${name}(${num(x)}; ${num(y)}) — сначала x по горизонтали, потом y по вертикали`);
        },
        reset() {
          value = null;
          dot.setAttribute("visibility", "hidden");
          ghost.setAttribute("visibility", "hidden");
          drawShape(null);
          fig.setAttribute("aria-label", "Координатная плоскость");
          lock(false);
        },
      };
    },
  };

  /* ------------------------------------------------------------------- pick
   * Tap parts of a drawing. task: { figure, solution: [part ids], reveal? }
   * A figure draws its decoration and returns { viewBox, parts, points, kind, overlay? };
   * `overlay` draws on top of the parts (lines that must stay visible but not catch taps). */
  const rad = (d) => (d * Math.PI) / 180;
  const polar = (cx, cy, r, deg) => [cx + r * Math.cos(rad(deg)), cy - r * Math.sin(rad(deg))];
  const seg = (a, b) => `M${a[0]} ${a[1]} L${b[0]} ${b[1]}`;
  const rectPath = (x, y, w, h) => `M${x} ${y} h${w} v${h} h${-w} Z`;
  const wedgePath = (cx, cy, r, from, to) => {
    const s0 = polar(cx, cy, r, to), e0 = polar(cx, cy, r, from);
    return `M${cx} ${cy} L${s0[0]} ${s0[1]} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${e0[0]} ${e0[1]} Z`;
  };

  const FIGURES = {
    circle(fig) {
      const cx = 130, cy = 108, r = 90;
      const at = (deg) => polar(cx, cy, r, deg);
      svg("circle", { cx, cy, r, class: "f-disk" }, fig);
      const A = at(5), B = at(128), C = at(308), D = at(205), E = at(250);
      const parts = [
        { id: "radius", name: "Отрезок OA", d: seg([cx, cy], A) },
        { id: "diameter", name: "Отрезок BC", d: seg(B, C) },
        { id: "chord", name: "Отрезок DE", d: seg(D, E) },
      ];
      const points = [["O", cx, cy, -14, 16], ["A", ...A, 12, 4], ["B", ...B, -10, -6], ["C", ...C, 10, 12],
        ["D", ...D, -14, 6], ["E", ...E, -6, 16]];
      return { viewBox: "0 0 260 216", parts, points, kind: "line" };
    },
    square(fig) {
      const x0 = 34, y0 = 30, a = 110, b = 64;
      label(fig, x0 + a / 2, y0 - 10, "a", "f-side f-side-a");
      label(fig, x0 + a + b / 2, y0 - 10, "b", "f-side f-side-b");
      label(fig, x0 - 12, y0 + a / 2 + 5, "a", "f-side f-side-a");
      label(fig, x0 - 12, y0 + a + b / 2 + 5, "b", "f-side f-side-b");
      const parts = [
        { id: "a2", name: "Левый верхний квадрат", d: rectPath(x0, y0, a, a), c: [x0 + a / 2, y0 + a / 2], text: "a²" },
        { id: "ab1", name: "Правый верхний прямоугольник", d: rectPath(x0 + a, y0, b, a), c: [x0 + a + b / 2, y0 + a / 2], text: "ab" },
        { id: "ab2", name: "Левый нижний прямоугольник", d: rectPath(x0, y0 + a, a, b), c: [x0 + a / 2, y0 + a + b / 2], text: "ab" },
        { id: "b2", name: "Правый нижний квадрат", d: rectPath(x0 + a, y0 + a, b, b), c: [x0 + a + b / 2, y0 + a + b / 2], text: "b²" },
      ];
      return { viewBox: "0 0 220 212", parts, points: [], kind: "area" };
    },
    // a segment, a ray and a line, each with its two named points
    lines() {
      const head = (x, y, dir) => `M${x} ${y} l${-10 * dir} -6 M${x} ${y} l${-10 * dir} 6`;
      const parts = [
        { id: "segment", name: "Фигура AB", d: seg([40, 36], [170, 36]) },
        { id: "ray", name: "Фигура CD", d: `${seg([40, 92], [292, 92])} ${head(292, 92, 1)}` },
        { id: "line", name: "Фигура EF", d: `${seg([12, 148], [292, 148])} ${head(292, 148, 1)} ${head(12, 148, -1)}` },
      ];
      const points = [["A", 40, 36, 0, -11], ["B", 170, 36, 0, -11], ["C", 40, 92, 0, -11], ["D", 150, 92, 0, -11],
        ["E", 110, 148, 0, -11], ["F", 210, 148, 0, -11]];
      return { viewBox: "0 0 304 170", parts, points, kind: "line" };
    },
    // two crossing lines; angle 1 is given, the other three can be tapped
    cross(fig) {
      const O = [140, 100], R = 50, rays = [32, 148, 212, 328];
      svg("path", { d: wedgePath(...O, R, rays[0], rays[1]), class: "f-given-wedge" }, fig);
      const mid = (a, b, r) => polar(...O, r, (a + b) / 2);
      label(fig, ...mid(rays[0], rays[1], R * 0.62).map((v, i) => (i ? v + 5 : v)), "1", "f-wedge-num");
      const parts = [2, 3, 4].map((n) => {
        const a = rays[n - 1], b = n === 4 ? rays[0] + 360 : rays[n];
        return { id: String(n), name: `Угол ${n}`, d: wedgePath(...O, R, a, b), c: mid(a, b, R * 0.62), text: String(n), always: true };
      });
      const overlay = (g) => {
        const L1a = polar(...O, 130, rays[0]), L1b = polar(...O, 130, rays[2]);
        const L2a = polar(...O, 130, rays[1]), L2b = polar(...O, 130, rays[3]);
        svg("path", { d: `${seg(L1a, L1b)} ${seg(L2a, L2b)}`, class: "f-decor-line" }, g);
        svg("circle", { cx: O[0], cy: O[1], r: 4, class: "f-ink f-decor" }, g);
      };
      return { viewBox: "0 0 280 200", parts, points: [], kind: "area", overlay };
    },
    // cylinder, cone, ball, box and pyramid with their names
    solids(fig) {
      const parts = [
        { id: "cylinder", name: "Цилиндр", d: "M12 38 A26 8 0 0 1 64 38 V112 A26 8 0 0 1 12 112 Z", x: 38 },
        { id: "cone", name: "Конус", d: "M80 112 L106 30 L132 112 A26 8 0 0 1 80 112 Z", x: 106 },
        { id: "ball", name: "Шар", d: "M138 76 A36 36 0 1 0 210 76 A36 36 0 1 0 138 76 Z", x: 174 },
        { id: "box", name: "Куб", d: "M222 66 L236 52 H284 V100 L270 114 H222 Z", x: 252 },
        { id: "pyramid", name: "Пирамида", d: "M294 112 L318 30 L344 100 L330 116 Z", x: 318 },
      ];
      const overlay = (g) => {
        svg("path", { d: "M12 38 A26 8 0 0 0 64 38", class: "f-decor-line f-thin" }, g);
        svg("path", { d: "M138 76 A36 10 0 0 0 210 76", class: "f-decor-line f-thin f-dashed" }, g);
        svg("path", { d: "M222 66 H270 L284 52 M270 66 V114", class: "f-decor-line f-thin" }, g);
        svg("path", { d: "M318 30 L330 116", class: "f-decor-line f-thin" }, g);
      };
      parts.forEach((p) => label(fig, p.x, 140, p.name.toLowerCase(), "f-label"));
      return { viewBox: "0 0 356 150", parts, points: [], kind: "area", overlay };
    },
    // a bar chart whose bars are tapped (values from the task)
    bars(fig, t) {
      const U = 17, BASE = 150, BW = 36, GAP = 16, X0 = 30;
      const right = X0 + t.values.length * (BW + GAP) - GAP;
      svg("line", { x1: X0 - 8, y1: BASE, x2: right + 8, y2: BASE, class: "f-axis" }, fig);
      const parts = t.values.map((v, i) => {
        const x = X0 + i * (BW + GAP);
        label(fig, x + BW / 2, BASE + 16, (t.labels || [])[i] || "", "f-label");
        return { id: String(i), name: `${(t.labels || [])[i] || ""}: ${v}`, d: rectPath(x, BASE - v * U, BW, v * U), c: [x + BW / 2, BASE - v * U - 6], text: String(v), always: true, textClass: "f-label f-value" };
      });
      return { viewBox: `0 0 ${right + 22} 172`, parts, points: [], kind: "bar" };
    },
    // the six faces of a die
    dice(fig) {
      const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
        5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };
      const parts = [1, 2, 3, 4, 5, 6].map((n, i) => {
        const x = 8 + i * 54;
        return { id: String(n), name: `Грань ${n}`, d: `M${x + 6} 8 h34 a6 6 0 0 1 6 6 v34 a6 6 0 0 1 -6 6 h-34 a6 6 0 0 1 -6 -6 v-34 a6 6 0 0 1 6 -6 Z`, pips: PIPS[n].map(([a, b]) => [x + 23 + a * 11, 31 + b * 11]) };
      });
      const overlay = (g) => parts.forEach((p) => p.pips.forEach(([x, y]) => svg("circle", { cx: x, cy: y, r: 3.6, class: "f-ink f-decor" }, g)));
      return { viewBox: "0 0 330 62", parts, points: [], kind: "area", overlay };
    },
    // equilateral, isosceles and scalene triangles; equal sides carry the same tick marks
    triangles() {
      const tri = (pts) => `M${pts.map((p) => p.join(" ")).join(" L")} Z`;
      const ticks = (a, b, n) => {
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy);
        const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
        let d = "";
        for (let i = 0; i < n; i++) {
          const o = (i - (n - 1) / 2) * 4;
          d += ` M${mx + ux * o - nx * 6} ${my + uy * o - ny * 6} l${nx * 12} ${ny * 12}`;
        }
        return d;
      };
      const E = [[14, 118], [100, 118], [57, 44]];
      const I = [[120, 118], [196, 118], [158, 22]];
      const S = [[214, 118], [322, 118], [244, 62]];
      const parts = [
        { id: "equi", name: "Первый треугольник", d: tri(E) },
        { id: "iso", name: "Второй треугольник", d: tri(I) },
        { id: "scal", name: "Третий треугольник", d: tri(S) },
      ];
      const overlay = (g) => svg("path", {
        d: ticks(E[0], E[1], 1) + ticks(E[1], E[2], 1) + ticks(E[2], E[0], 1) + ticks(I[1], I[2], 2) + ticks(I[2], I[0], 2),
        class: "f-decor-line f-thin",
      }, g);
      return { viewBox: "0 0 336 132", parts, points: [], kind: "area", overlay };
    },
  };

  const pick = {
    check: (t, v) => sameSet(v, t.solution),
    build(el, t) {
      const fig = figure(el, "0 0 10 10", "Чертёж");
      fig.setAttribute("role", "group");
      fig.classList.add(`fig-${t.figure}`);
      const { viewBox, parts, points, kind, overlay } = FIGURES[t.figure](fig, t);
      fig.setAttribute("viewBox", viewBox);
      const multi = t.solution.length > 1;
      const picked = new Set();
      const nodes = parts.map((part) => {
        const g = svg("g", {
          class: `f-pick f-part f-part-${kind}`,
          "data-id": part.id,
          role: multi ? "checkbox" : "radio",
          "aria-checked": "false",
          "aria-label": part.name,
        }, fig);
        if (kind === "line") svg("path", { d: part.d, class: "f-hit-line" }, g);
        svg("path", { d: part.d, class: "f-part-shape" }, g);
        if (part.text) label(g, part.c[0], part.c[1] + (part.textClass ? 0 : 6), part.text, part.textClass || (part.always ? "f-wedge-num" : "f-area-text"));
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
      if (overlay) overlay(svg("g", { class: "f-overlay" }, fig));
      for (const [name, x, y, dx, dy] of points) {
        svg("circle", { cx: x, cy: y, r: 3.5, class: "f-ink f-decor" }, fig);
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
   * Corners of a triangle torn off and put on a straight line, as in the video.
   * task: { a, b, solution } (C unknown) or { angles: { A: null, B: null, C: 40 }, isosceles, solution }
   * Every unknown angle takes the slider value, so two unknowns make an isosceles triangle. */
  const triangleSum = {
    check: (t, v) => v === t.solution,
    build(el, t) {
      const fig = figure(el, "0 0 330 150", "Углы треугольника на прямой");
      const LETTERS = ["A", "B", "C"];
      const spec = t.angles || { A: t.a, B: t.b, C: null };
      const unknown = LETTERS.filter((L) => spec[L] === null || spec[L] === undefined);
      const real = Object.fromEntries(LETTERS.map((L) => [L, unknown.includes(L) ? t.solution : spec[L]]));
      const cls = { A: "f-w-a", B: "f-w-b", C: "f-w-c" };

      // the triangle itself, drawn to scale with its real angles
      // base 112, shrunk when the apex would rise above the drawing
      const rawSide = (112 * Math.sin(rad(real.B))) / Math.sin(rad(real.C));
      const AB = 112 * Math.min(1, 104 / (rawSide * Math.sin(rad(real.A))));
      const A = [12 + (112 - AB) / 2, 128];
      const B = [A[0] + AB, A[1]];
      const side = (AB * Math.sin(rad(real.B))) / Math.sin(rad(real.C));
      const C = [A[0] + side * Math.cos(rad(real.A)), A[1] - side * Math.sin(rad(real.A))];
      const cDir = (Math.atan2(A[1] - C[1], A[0] - C[0]) * -180) / Math.PI;
      svg("path", { d: wedgePath(...A, 18, 0, real.A), class: cls.A }, fig);
      svg("path", { d: wedgePath(...B, 18, 180 - real.B, 180), class: cls.B }, fig);
      svg("path", { d: wedgePath(...C, 18, cDir, cDir + real.C), class: cls.C }, fig);
      svg("path", { d: `M${A} L${B} L${C} Z`, class: "f-tri" }, fig);
      if (t.isosceles) {
        // equal sides AC and BC carry a tick each
        [[A, C], [B, C]].forEach(([p, q]) => {
          const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy);
          svg("line", { x1: mx + (dy / L) * 6, y1: my - (dx / L) * 6, x2: mx - (dy / L) * 6, y2: my + (dx / L) * 6, class: "f-tick" }, fig);
        });
      }
      label(fig, A[0] + 6, A[1] + 16, "A", "f-point-name");
      label(fig, B[0], B[1] + 16, "B", "f-point-name");
      label(fig, C[0], C[1] - 7, "C", "f-point-name");

      // the same corners side by side on a straight line
      const P = [238, 128], R = 74;
      svg("line", { x1: P[0] - R - 14, y1: P[1], x2: P[0] + R + 14, y2: P[1], class: "f-axis" }, fig);
      const wedges = LETTERS.map((L) => svg("path", { class: `${cls[L]} f-big` }, fig));
      svg("circle", { cx: P[0], cy: P[1], r: 3.5, class: "f-ink" }, fig);
      const texts = LETTERS.map(() => label(fig, 0, 0, "", "f-wedge-text"));
      label(fig, P[0], P[1] + 16, "180°", "f-label");

      let value = null;
      const draw = (c) => {
        let cur = 180;
        LETTERS.forEach((L, i) => {
          const val = unknown.includes(L) ? c : spec[L];
          const from = cur - val;
          wedges[i].setAttribute("d", wedgePath(...P, R, from, cur));
          wedges[i].classList.toggle("is-over", from < -0.5);
          const [mx, my] = polar(...P, R * 0.62, from + val / 2);
          texts[i].setAttribute("x", mx);
          texts[i].setAttribute("y", my + 4);
          texts[i].textContent = unknown.includes(L) && value === null ? "?" : `${val}°`;
          cur = from;
        });
      };
      const name = unknown.length === 1 ? `Угол ${unknown[0]}` : `Углы ${unknown.join(" и ")}`;
      const set = (c) => {
        value = Math.round(clamp(c, 5, t.max || 120));
        input.value = value;
        fig.setAttribute("aria-label", `${name}: ${value}°`);
        draw(value);
      };
      const input = slider(controls(el), name, 5, t.max || 120, 1, set);
      const lock = lockable(el);
      const reset = () => {
        value = null;
        input.value = 20;
        draw(20);
        lock(false);
      };
      reset();
      const known = LETTERS.filter((L) => !unknown.includes(L)).map((L) => `${spec[L]}°`);
      const explain = unknown.length === 1
        ? `∠${unknown[0]} = 180° − ${known.join(" − ")} = ${t.solution}°`
        : `∠${unknown.join(" = ∠")} = (180° − ${known.join(" − ")}) : ${unknown.length} = ${t.solution}°`;
      return {
        value: () => value,
        lock,
        reveal() {
          set(t.solution);
          answerLine(el, t.reveal || explain);
        },
        reset,
      };
    },
  };

  /* ------------------------------------------------------------------- line
   * Choose k and b so y = kx + b passes through the marked points.
   * task: { points, solution: { k, b }, parallel?: { k, b } } — with `parallel` the line must also run alongside it */
  const line = {
    check: (t, v) => Boolean(v) && t.points.every(([x, y]) => v.k * x + v.b === y) && (!t.parallel || v.k === t.parallel.k),
    build(el, t) {
      const R = 5, C = 22, O = R * C + 24, S = 2 * O;
      const fig = figure(el, `0 0 ${S} ${S}`, "График линейной функции");
      grid(fig, R, C, O);
      if (t.parallel) graphLine(fig, R, C, O, "f-graph f-graph-given")(t.parallel.k, t.parallel.b);
      const drawLine = graphLine(fig, R, C, O, "f-graph");
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
        drawLine(k, b);
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

  /* ----------------------------------------------------------------- strips
   * Bar model from the video: two strips that must come out the same length.
   * task: { rows: [[{ k } | { n }, …], […]], max, solution } — k·x pieces grow with x, n pieces are fixed */
  const strips = {
    check: (t, v) => v === t.solution,
    build(el, t) {
      const H = 34, GAP = 20, X0 = 14, W = 312;
      const total = (row, x) => row.reduce((s, p) => s + (p.k || 0) * x + (p.n || 0), 0);
      const U = W / Math.max(...t.rows.map((row) => total(row, t.max)));
      const height = t.rows.length * (H + GAP) - GAP + 16;
      const fig = figure(el, `0 0 340 ${height}`, "Полоски");
      const ends = svg("line", { y1: 2, y2: height - 2, class: "f-strip-end" }, fig);
      const rows = t.rows.map((row, ri) => {
        const y = 8 + ri * (H + GAP);
        return row.map((p) => {
          const g = svg("g", { class: p.k ? "f-strip f-strip-x" : "f-strip f-strip-n" }, fig);
          const r = svg("rect", { y, height: H, rx: 5 }, g);
          const text = label(g, 0, y + H / 2 + 5, p.k ? (p.k === 1 ? "x" : `${p.k}x`) : num(p.n), "f-strip-text");
          return { p, r, text };
        });
      });
      let value = null;
      const draw = () => {
        // until the pupil picks x, the x pieces show a placeholder length
        const x = value === null ? t.max * 0.3 : value;
        const lengths = rows.map((row) => {
          let cur = X0;
          row.forEach(({ p, r, text }) => {
            const w = Math.max(0, ((p.k || 0) * x + (p.n || 0)) * U);
            r.setAttribute("x", cur);
            r.setAttribute("width", w);
            r.classList.toggle("is-unknown", Boolean(p.k) && value === null);
            text.setAttribute("x", cur + w / 2);
            text.setAttribute("visibility", w < 18 ? "hidden" : "visible");
            cur += w;
          });
          return cur;
        });
        ends.setAttribute("x1", lengths[0]);
        ends.setAttribute("x2", lengths[0]);
        const equal = value !== null && lengths.every((l) => Math.abs(l - lengths[0]) < 0.01);
        fig.classList.toggle("is-equal", equal);
        fig.setAttribute("aria-label", value === null ? "Полоски" : equal ? `При x = ${num(value)} полоски равны` : "Полоски разной длины");
      };
      const field = numberField(controls(el), "x", { min: 0, max: t.max }, (v) => {
        value = v;
        draw();
      });
      const lock = lockable(el);
      const reset = () => {
        lock(false);
        value = null;
        field.set(null);
        draw();
      };
      reset();
      return {
        value: () => value,
        lock,
        reveal() {
          value = t.solution;
          field.set(value);
          draw();
          answerLine(el, t.reveal || `Полоски равны при x = ${num(t.solution)}`);
        },
        reset,
      };
    },
  };

  /* ------------------------------------------------------------------- rect
   * Build a rectangle on squared paper by tapping its far corner.
   * task: { cols, rows, area, perimeter, solution: [a, b] } — either orientation is right */
  const rectangle = {
    check: (t, v) => Array.isArray(v) && v[0] * v[1] === t.area && 2 * (v[0] + v[1]) === t.perimeter,
    build(el, t) {
      const COLS = t.cols || 8, ROWS = t.rows || 6, C = 30, X0 = 48, Y0 = 26;
      const fig = figure(el, `0 0 ${X0 + COLS * C + 8} ${Y0 + ROWS * C + 24}`, "Клетчатая бумага");
      fig.setAttribute("tabindex", "0");
      fig.classList.add("is-tappable");
      for (let i = 0; i <= COLS; i++) svg("line", { x1: X0 + i * C, y1: Y0, x2: X0 + i * C, y2: Y0 + ROWS * C, class: "f-grid" }, fig);
      for (let j = 0; j <= ROWS; j++) svg("line", { x1: X0, y1: Y0 + j * C, x2: X0 + COLS * C, y2: Y0 + j * C, class: "f-grid" }, fig);
      const shape = svg("rect", { x: X0, y: Y0, class: "f-rect", visibility: "hidden" }, fig);
      const top = label(fig, 0, Y0 - 8, "", "f-side f-side-a");
      const left = label(fig, X0 - 8, 0, "", "f-side f-side-b", "end");
      svg("circle", { cx: X0, cy: Y0, r: 4, class: "f-ink" }, fig);
      label(fig, X0 + COLS * C, Y0 + ROWS * C + 16, "1 клетка = 1 см", "f-label f-small", "end");
      let value = null;
      const set = (a, b) => {
        value = [clamp(a, 1, COLS), clamp(b, 1, ROWS)];
        shape.setAttribute("visibility", "visible");
        shape.setAttribute("width", value[0] * C);
        shape.setAttribute("height", value[1] * C);
        top.setAttribute("x", X0 + (value[0] * C) / 2);
        top.textContent = `${value[0]} см`;
        left.setAttribute("y", Y0 + (value[1] * C) / 2 + 4);
        left.textContent = `${value[1]} см`;
        fig.setAttribute("aria-label", `Прямоугольник ${value[0]} на ${value[1]} см`);
        pop(shape);
      };
      fig.addEventListener("click", (event) => {
        const p = pointer(fig, event);
        set(Math.ceil((p.x - X0) / C), Math.ceil((p.y - Y0) / C));
      });
      fig.addEventListener("keydown", (event) => {
        const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
        if (!d) return;
        event.preventDefault();
        const [a, b] = value || [1, 1];
        set(a + (value ? d[0] : 0), b + (value ? d[1] : 0));
      });
      const lock = lockable(el);
      return {
        value: () => value,
        lock,
        reveal() {
          set(...t.solution);
          answerLine(el, t.reveal || `${t.solution[0]} × ${t.solution[1]} см: S = ${t.area} см², P = ${t.perimeter} см`);
        },
        reset() {
          value = null;
          shape.setAttribute("visibility", "hidden");
          top.textContent = "";
          left.textContent = "";
          lock(false);
        },
      };
    },
  };

  /* ------------------------------------------------------------------ enter
   * A drawing and a typed number. task: { figure?: "box" | "square101", unit?, buttons?, solution } */
  const ENTER_FIGURES = {
    // a box of unit cubes, only its three visible faces
    box(fig, t) {
      const [a, b, c] = t.size, s = 22, cx = s * Math.cos(rad(30)), cy = s * Math.sin(rad(30));
      const ox = 62 + b * cx, oy = 20;
      const P = (i, j, k) => [ox + (i - j) * cx, oy + (i + j) * cy + (c - k) * s];
      const face = (pts, cls) => svg("path", { d: `M${pts.map((p) => p.join(" ")).join(" L")} Z`, class: cls }, fig);
      face([P(0, 0, c), P(a, 0, c), P(a, b, c), P(0, b, c)], "f-cube-top");
      face([P(0, b, c), P(a, b, c), P(a, b, 0), P(0, b, 0)], "f-cube-left");
      face([P(a, 0, c), P(a, b, c), P(a, b, 0), P(a, 0, 0)], "f-cube-right");
      let d = "";
      for (let i = 1; i < a; i++) d += `M${P(i, 0, c)} L${P(i, b, c)} L${P(i, b, 0)} `;
      for (let j = 1; j < b; j++) d += `M${P(0, j, c)} L${P(a, j, c)} L${P(a, j, 0)} `;
      for (let k = 1; k < c; k++) d += `M${P(0, b, k)} L${P(a, b, k)} L${P(a, 0, k)} `;
      svg("path", { d, class: "f-cube-lines" }, fig);
      const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
      label(fig, ...mid(P(0, b, 0), P(a, b, 0)).map((v, i) => v + (i ? 18 : -10)), `${a} см`, "f-side f-side-a");
      label(fig, ...mid(P(a, b, 0), P(a, 0, 0)).map((v, i) => v + (i ? 18 : 12)), `${b} см`, "f-side f-side-b", "start");
      label(fig, ...mid(P(0, b, 0), P(0, b, c)).map((v, i) => v + (i ? 4 : -10)), `${c} см`, "f-side f-side-c", "end");
      const right = P(a, 0, 0)[0], bottom = P(a, b, 0)[1];
      return `0 0 ${right + 46} ${bottom + 28}`;
    },
    // (100 + 1)² as a square cut into 100², two strips 100 · 1 and a tiny 1²
    square101(fig) {
      const x0 = 40, y0 = 28, a = 150, b = 22;
      const part = (x, y, w, h, cls, text, tx, ty) => {
        svg("rect", { x, y, width: w, height: h, class: cls }, fig);
        if (text) label(fig, tx ?? x + w / 2, ty ?? y + h / 2 + 5, text, "f-area-label");
      };
      part(x0, y0, a, a, "f-sq-a", "100² = 10 000");
      part(x0 + a, y0, b, a, "f-sq-ab", "", 0, 0);
      part(x0, y0 + a, a, b, "f-sq-ab", "100 · 1 = 100", x0 + a / 2, y0 + a + b / 2 + 4);
      part(x0 + a, y0 + a, b, b, "f-sq-b", "");
      label(fig, x0 + a + b / 2, y0 + a / 2, "100", "f-area-label f-vertical").setAttribute("transform", `rotate(-90 ${x0 + a + b / 2} ${y0 + a / 2})`);
      label(fig, x0 + a + b + 10, y0 + a + b / 2 + 4, "1² = 1", "f-area-label", "start");
      label(fig, x0 + a / 2, y0 - 9, "100", "f-side f-side-a");
      label(fig, x0 + a + b / 2, y0 - 9, "1", "f-side f-side-b");
      label(fig, x0 - 9, y0 + a / 2 + 5, "100", "f-side f-side-a", "end");
      label(fig, x0 - 9, y0 + a + b / 2 + 5, "1", "f-side f-side-b", "end");
      return `0 0 ${x0 + a + b + 64} ${y0 + a + b + 10}`;
    },
  };

  const enter = {
    check: (t, v) => v === t.solution,
    build(el, t) {
      if (t.figure) {
        const fig = figure(el, "0 0 10 10", "Чертёж");
        fig.classList.add(`fig-${t.figure}`);
        fig.setAttribute("viewBox", ENTER_FIGURES[t.figure](fig, t));
      }
      let value = null;
      const field = numberField(controls(el), t.label || "Ответ", { unit: t.unit, buttons: t.buttons !== false, min: 0 }, (v) => {
        value = v;
      });
      const lock = lockable(el);
      return {
        value: () => value,
        lock,
        reveal() {
          answerLine(el, t.reveal || `Верно: ${num(t.solution)}${t.unit ? ` ${t.unit}` : ""}`);
        },
        reset() {
          lock(false);
          value = null;
          field.set(null);
        },
      };
    },
  };

  /* ------------------------------------------------------------------- roll
   * A wheel of diameter 1 rolls along a ruler; stop it when the red mark touches the ground again.
   * task: { accept: [min, max], solution } — the distance is π */
  const roll = {
    check: (t, v) => typeof v === "number" && v >= t.accept[0] && v <= t.accept[1],
    build(el, t) {
      const X0 = 44, U = 70, G = 118, r = U / 2;
      const fig = figure(el, "0 0 340 150", "Катящееся колесо");
      for (let i = 0; i <= 40; i++) {
        const x = X0 + (i / 10) * U, major = i % 10 === 0, half = i % 5 === 0;
        svg("line", { x1: x, y1: G, x2: x, y2: G + (major ? 10 : half ? 7 : 4), class: "f-tick" }, fig);
        if (major) label(fig, x, G + 23, String(i / 10), "f-label");
      }
      svg("line", { x1: 8, y1: G, x2: 332, y2: G, class: "f-axis" }, fig);
      const trace = svg("path", { class: "f-trace" }, fig);
      const wheel = svg("g", {}, fig);
      svg("circle", { r, class: "f-wheel" }, wheel);
      const spoke = svg("line", { x1: 0, y1: 0, class: "f-spoke" }, wheel);
      svg("circle", { r: 3, class: "f-ink" }, wheel);
      const mark = svg("circle", { r: 6, class: "f-rim-mark" }, wheel);
      label(wheel, 0, -r * 0.38, "d = 1", "f-label f-small");
      const flag = svg("g", { class: "f-roll-flag" }, fig);
      svg("line", { x1: 0, y1: G - 2, x2: 0, y2: G + 12, class: "f-roll-flag-line" }, flag);
      const flagText = label(flag, 0, 12, "", "f-readout");
      let value = null;
      const draw = (s) => {
        const cx = X0 + s * U, th = s / 0.5;
        wheel.setAttribute("transform", `translate(${cx} ${G - r})`);
        const mx = -r * Math.sin(th), my = r * Math.cos(th);
        mark.setAttribute("cx", mx);
        mark.setAttribute("cy", my);
        spoke.setAttribute("x2", mx);
        spoke.setAttribute("y2", my);
        let d = "";
        for (let i = 0; i <= 60; i++) {
          const ss = (s * i) / 60, tt = ss / 0.5;
          d += `${i ? "L" : "M"}${X0 + ss * U - r * Math.sin(tt)} ${G - r + r * Math.cos(tt)} `;
        }
        trace.setAttribute("d", d);
        flag.setAttribute("transform", `translate(${cx} 0)`);
        flagText.textContent = value === null ? "" : num(value.toFixed(2));
      };
      const set = (s) => {
        value = Math.round(clamp(s, 0, 4) * 50) / 50;
        input.value = value;
        fig.setAttribute("aria-label", `Колесо прокатилось на ${num(value.toFixed(2))}`);
        draw(value);
      };
      const input = slider(controls(el), "Путь", 0, 4, 0.02, set);
      const lock = lockable(el);
      const reset = () => {
        value = null;
        input.value = 0;
        draw(0);
        lock(false);
      };
      reset();
      return {
        value: () => value,
        lock,
        reveal() {
          set(t.solution);
          answerLine(el, t.reveal || `Один оборот колеса — ≈ ${num(t.solution)}: это и есть число π`);
        },
        reset,
      };
    },
  };

  /* ------------------------------------------------------------------ order
   * Tap the cards in order; a tap on a placed card takes it back. task: { items, solution, middle? } */
  const order = {
    check: (t, v) => sameList(v, t.solution),
    build(el, t) {
      const box = document.createElement("div");
      box.className = "order-board";
      box.innerHTML = `<div class="order-slots" aria-label="Ряд"></div><div class="order-pool" aria-label="Карточки"></div>`;
      el.appendChild(box);
      const slots = box.querySelector(".order-slots"), pool = box.querySelector(".order-pool");
      let placed = [];
      const render = () => {
        slots.innerHTML = t.items.map((_, i) => {
          const idx = placed[i];
          const mid = t.middle && i === (t.items.length - 1) / 2 ? " is-middle" : "";
          return idx === undefined
            ? `<span class="order-slot${mid}"></span>`
            : `<button type="button" class="order-card is-placed${mid}" data-slot="${i}" aria-label="Убрать ${num(t.items[idx])}">${num(t.items[idx])}</button>`;
        }).join("");
        pool.innerHTML = t.items.map((v, i) => (placed.includes(i)
          ? `<span class="order-card is-gone" aria-hidden="true">${num(v)}</span>`
          : `<button type="button" class="order-card" data-item="${i}">${num(v)}</button>`)).join("");
      };
      box.addEventListener("click", (event) => {
        const card = event.target.closest("button.order-card");
        if (!card) return;
        if (card.dataset.item !== undefined) placed.push(Number(card.dataset.item));
        else placed.splice(Number(card.dataset.slot), 1);
        render();
        if (card.dataset.item !== undefined) pop(slots.children[placed.length - 1]);
      });
      render();
      const lock = lockable(el);
      return {
        value: () => (placed.length === t.items.length ? placed.map((i) => t.items[i]) : null),
        lock,
        reveal() {
          const used = new Set();
          placed = t.solution.map((v) => {
            const i = t.items.findIndex((x, j) => x === v && !used.has(j));
            used.add(i);
            return i;
          });
          render();
          lock(true);
          answerLine(el, t.reveal || `Верно: ${t.solution.map(num).join(", ")}`);
        },
        reset() {
          placed = [];
          render();
          lock(false);
        },
      };
    },
  };

  /* ------------------------------------------------------------------ signs
   * Tap the signs in front of the terms to flip them. task: { before, terms, start?, solution: ["+", "−", …] } */
  const signs = {
    check: (t, v) => sameList(v, t.solution),
    build(el, t) {
      const start = t.start || t.terms.map(() => "+");
      const row = document.createElement("div");
      row.className = "task-expr";
      row.innerHTML = `<span class="expr-text">${t.before}</span>` + t.terms.map((term, i) =>
        `<button type="button" class="sign-btn" data-i="${i}" aria-label="Знак перед ${term}"></button><span class="expr-term">${term}</span>`).join("");
      el.appendChild(row);
      const hint = document.createElement("p");
      hint.className = "task-hint";
      hint.textContent = "Нажмите на знак, чтобы поменять его";
      el.appendChild(hint);
      let cur = [...start], touched = false;
      const render = () => row.querySelectorAll(".sign-btn").forEach((b, i) => {
        b.textContent = cur[i];
        b.classList.toggle("is-minus", cur[i] === "−");
      });
      row.addEventListener("click", (event) => {
        const b = event.target.closest(".sign-btn");
        if (!b) return;
        const i = Number(b.dataset.i);
        cur[i] = cur[i] === "+" ? "−" : "+";
        touched = true;
        render();
        pop(b);
      });
      render();
      const lock = lockable(el);
      return {
        value: () => (touched ? [...cur] : null),
        lock,
        reveal() {
          cur = [...t.solution];
          render();
          answerLine(el, t.reveal || "Верные знаки показаны");
        },
        reset() {
          cur = [...start];
          touched = false;
          render();
          lock(false);
        },
      };
    },
  };

  /* ------------------------------------------------------------------- move
   * Terms of an equation; a tap carries a term across «=», and its sign flips.
   * Goal: every x term on the left, every number on the right. task: { left: ["5x", "−3"], right: ["2x", "9"] } */
  const parseTerm = (s) => {
    const neg = /^[−-]/.test(s);
    const body = s.replace(/^[−+-]\s*/, "");
    return { neg, body, isX: /x/.test(body) };
  };
  const moveSolution = (t) => [...t.left, ...t.right].map((s) => (parseTerm(s).isX ? "L" : "R"));
  const move = {
    check: (t, v) => sameList(v, moveSolution(t)),
    build(el, t) {
      const base = [...t.left.map((s) => ({ ...parseTerm(s), side: "L" })), ...t.right.map((s) => ({ ...parseTerm(s), side: "R" }))];
      const row = document.createElement("div");
      row.className = "task-expr task-move";
      el.appendChild(row);
      const hint = document.createElement("p");
      hint.className = "task-hint";
      hint.textContent = "Нажмите на слагаемое, чтобы перенести его через знак «=»";
      el.appendChild(hint);
      let sides = base.map((b) => b.side), touched = false;
      const render = (moved) => {
        const side = (S) => {
          const items = base.map((b, i) => ({ b, i })).filter(({ i }) => sides[i] === S);
          if (!items.length) return `<span class="expr-term">0</span>`;
          return items.map(({ b, i }, k) => {
            const neg = b.neg !== (sides[i] !== b.side);
            const sign = neg ? "−" : k ? "+" : "";
            return `<button type="button" class="term-btn${b.isX ? " is-x" : ""}${i === moved ? " is-moved" : ""}" data-i="${i}">${sign ? `<span class="term-sign">${sign}</span>` : ""}${b.body}</button>`;
          }).join("");
        };
        row.innerHTML = `${side("L")}<span class="expr-eq">=</span>${side("R")}`;
      };
      row.addEventListener("click", (event) => {
        const b = event.target.closest(".term-btn");
        if (!b) return;
        const i = Number(b.dataset.i);
        sides[i] = sides[i] === "L" ? "R" : "L";
        touched = true;
        render(i);
        pop(row.querySelector(".is-moved"));
      });
      render();
      const lock = lockable(el);
      return {
        value: () => (touched ? [...sides] : null),
        lock,
        reveal() {
          sides = moveSolution(t);
          render();
          lock(true);
          answerLine(el, t.reveal || "Иксы слева, числа справа — каждый перенос меняет знак");
        },
        reset() {
          sides = base.map((b) => b.side);
          touched = false;
          render();
          lock(false);
        },
      };
    },
  };

  /* ----------------------------------------------------------------- sticks
   * Two sticks are given; the pupil picks the third and sees if they close into a triangle.
   * task: { a, b, max, solution } */
  const sticks = {
    check: (t, v) => v === t.solution,
    build(el, t) {
      const U = 280 / Math.max(t.max, t.a + t.b), BY = 150, CX = 170;
      const fig = figure(el, "0 0 340 176", "Три палочки");
      const fill = svg("path", { class: "f-tri-fill" }, fig);
      const base = svg("line", { y1: BY, y2: BY, class: "f-stick f-stick-c" }, fig);
      const sa = svg("line", { class: "f-stick f-stick-a" }, fig);
      const sb = svg("line", { class: "f-stick f-stick-b" }, fig);
      const la = label(fig, 0, 0, `${t.a} см`, "f-side f-side-a");
      const lb = label(fig, 0, 0, `${t.b} см`, "f-side f-side-b");
      const lc = label(fig, CX, BY + 20, "", "f-side f-side-c");
      const note = label(fig, CX, 16, "", "f-label f-note");
      let value = null;
      const draw = (c) => {
        const L = [CX - (c * U) / 2, BY], R = [CX + (c * U) / 2, BY];
        base.setAttribute("x1", L[0]);
        base.setAttribute("x2", R[0]);
        lc.textContent = value === null ? "? см" : `${c} см`;
        let A, B, ok = t.a + t.b > c && Math.abs(t.a - t.b) < c;
        if (ok) {
          const cosL = (t.a * t.a + c * c - t.b * t.b) / (2 * t.a * c);
          const ang = Math.acos(clamp(cosL, -1, 1));
          A = [L[0] + t.a * U * Math.cos(ang), BY - t.a * U * Math.sin(ang)];
          B = A;
        } else if (t.a + t.b <= c) {
          // too short: the sticks lie flat and cannot reach each other
          A = [L[0] + t.a * U * Math.cos(rad(12)), BY - t.a * U * Math.sin(rad(12))];
          B = [R[0] - t.b * U * Math.cos(rad(12)), BY - t.b * U * Math.sin(rad(12))];
        } else {
          // the third stick is too short: the other two stand up and still miss each other
          A = [L[0] + t.a * U * Math.cos(rad(80)), BY - t.a * U * Math.sin(rad(80))];
          B = [R[0] - t.b * U * Math.cos(rad(80)), BY - t.b * U * Math.sin(rad(80))];
        }
        sa.setAttribute("x1", L[0]); sa.setAttribute("y1", BY); sa.setAttribute("x2", A[0]); sa.setAttribute("y2", A[1]);
        sb.setAttribute("x1", R[0]); sb.setAttribute("y1", BY); sb.setAttribute("x2", B[0]); sb.setAttribute("y2", B[1]);
        la.setAttribute("x", (L[0] + A[0]) / 2 - 22);
        la.setAttribute("y", (BY + A[1]) / 2);
        lb.setAttribute("x", (R[0] + B[0]) / 2 + 22);
        lb.setAttribute("y", (BY + B[1]) / 2);
        fill.setAttribute("d", ok ? `M${L} L${A} L${R} Z` : "");
        fig.classList.toggle("is-broken", !ok);
        note.textContent = value === null ? "" : ok ? "треугольник сложился" : "не складывается";
      };
      const set = (c) => {
        value = Math.round(clamp(c, 1, t.max));
        input.value = value;
        fig.setAttribute("aria-label", `Третья палочка ${value} см: ${t.a + t.b > value && Math.abs(t.a - t.b) < value ? "треугольник" : "не складывается"}`);
        draw(value);
      };
      const input = slider(controls(el), "Третья палочка", 1, t.max, 1, set);
      const lock = lockable(el);
      const reset = () => {
        value = null;
        input.value = Math.ceil(t.max / 2);
        draw(Math.ceil(t.max / 2));
        lock(false);
      };
      reset();
      return {
        value: () => value,
        lock,
        reveal() {
          set(t.solution);
          answerLine(el, t.reveal || `Верно: ${t.solution} см`);
        },
        reset,
      };
    },
  };

  /* ------------------------------------------------------------------ match
   * Tap a formula on the left, then its pair on the right. task: { left, right, solution: [right index per left] } */
  const match = {
    check: (t, v) => sameList(v, t.solution),
    build(el, t) {
      const box = document.createElement("div");
      box.className = "match-board";
      box.innerHTML = `<div class="match-col">${t.left.map((s, i) => `<button type="button" class="match-btn" data-side="L" data-i="${i}">${s}</button>`).join("")}</div>
        <div class="match-col">${t.right.map((s, i) => `<button type="button" class="match-btn" data-side="R" data-i="${i}">${s}</button>`).join("")}</div>`;
      el.appendChild(box);
      const hint = document.createElement("p");
      hint.className = "task-hint";
      hint.textContent = "Нажмите на формулу слева, затем на её пару справа";
      el.appendChild(hint);
      let pairs = t.left.map(() => null), active = null;
      const render = () => {
        box.querySelectorAll(".match-btn").forEach((b) => {
          const i = Number(b.dataset.i);
          const pair = b.dataset.side === "L" ? (pairs[i] === null ? null : i) : pairs.indexOf(i);
          b.dataset.pair = pair === null || pair < 0 ? "" : String(pair + 1);
          b.classList.toggle("is-active", Boolean(active) && active.side === b.dataset.side && active.i === i);
        });
      };
      box.addEventListener("click", (event) => {
        const b = event.target.closest(".match-btn");
        if (!b) return;
        const side = b.dataset.side, i = Number(b.dataset.i);
        if (!active || active.side === side) {
          active = { side, i };
        } else {
          const L = side === "L" ? i : active.i, R = side === "R" ? i : active.i;
          pairs = pairs.map((p) => (p === R ? null : p));
          pairs[L] = R;
          active = null;
          pop(b);
        }
        render();
      });
      render();
      const lock = lockable(el);
      return {
        value: () => (pairs.every((p) => p !== null) ? [...pairs] : null),
        lock,
        reveal() {
          pairs = [...t.solution];
          active = null;
          render();
          answerLine(el, t.reveal || "Верные пары отмечены одинаковыми цветами");
        },
        reset() {
          pairs = t.left.map(() => null);
          active = null;
          render();
          lock(false);
        },
      };
    },
  };

  /* ------------------------------------------------------------------ table
   * Table of values for y = kx + b: tap the grid above each x to put its point; the table fills in.
   * task: { k, b, xs, solution: [y for each x] } */
  const table = {
    check: (t, v) => Array.isArray(v) && v.length === t.xs.length && t.xs.every((x, i) => v[i] === t.k * x + t.b),
    build(el, t) {
      const R = 5, C = 22, O = R * C + 24, S = 2 * O;
      const fig = figure(el, `0 0 ${S} ${S}`, "Точки графика");
      fig.setAttribute("tabindex", "0");
      fig.classList.add("is-tappable");
      grid(fig, R, C, O);
      t.xs.forEach((x) => svg("line", { x1: O + x * C, y1: O - R * C, x2: O + x * C, y2: O + R * C, class: "f-column" }, fig));
      const drawGraph = graphLine(fig, R, C, O, "f-graph f-graph-answer");
      const dots = t.xs.map(() => svg("circle", { r: 6, class: "f-dot", visibility: "hidden" }, fig));
      const tbl = document.createElement("table");
      tbl.className = "value-table";
      tbl.innerHTML = `<tr><th>x</th>${t.xs.map((x) => `<td>${num(x)}</td>`).join("")}</tr><tr><th>y</th>${t.xs.map(() => "<td>?</td>").join("")}</tr>`;
      el.appendChild(tbl);
      const cells = [...tbl.rows[1].cells].slice(1);
      let ys = t.xs.map(() => null), col = 0;
      const render = () => {
        ys.forEach((y, i) => {
          dots[i].setAttribute("visibility", y === null ? "hidden" : "visible");
          if (y !== null) {
            dots[i].setAttribute("cx", O + t.xs[i] * C);
            dots[i].setAttribute("cy", O - y * C);
          }
          cells[i].textContent = y === null ? "?" : num(y);
          cells[i].classList.toggle("is-active", i === col);
        });
      };
      const put = (i, y) => {
        col = i;
        ys[i] = clamp(y, -R, R);
        render();
        pop(dots[i]);
      };
      fig.addEventListener("click", (event) => {
        const p = pointer(fig, event);
        const x = (p.x - O) / C;
        let best = 0;
        t.xs.forEach((xx, i) => { if (Math.abs(xx - x) < Math.abs(t.xs[best] - x)) best = i; });
        if (Math.abs(t.xs[best] - x) > 0.6) return;
        put(best, Math.round((O - p.y) / C));
      });
      // keyboard: ← → pick the column, ↑ ↓ move its point
      fig.addEventListener("keydown", (event) => {
        const k = event.key;
        if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(k)) return;
        event.preventDefault();
        col = clamp(col, 0, t.xs.length - 1);
        if (k === "ArrowLeft" || k === "ArrowRight") {
          col = clamp(col + (k === "ArrowLeft" ? -1 : 1), 0, t.xs.length - 1);
          render();
        } else {
          const y = ys[col];
          put(col, y === null ? 0 : y + (k === "ArrowUp" ? 1 : -1));
        }
      });
      drawGraph(0, 99);
      render();
      const lock = lockable(el);
      return {
        value: () => (ys.every((y) => y !== null) ? [...ys] : null),
        lock,
        reveal() {
          ys = t.xs.map((x) => t.k * x + t.b);
          col = -1;
          render();
          drawGraph(t.k, t.b);
          answerLine(el, t.reveal || `Верно: ${ys.map(num).join("; ")} — все точки лежат на одной прямой`);
        },
        reset() {
          ys = t.xs.map(() => null);
          col = 0;
          drawGraph(0, 99);
          render();
          lock(false);
        },
      };
    },
  };

  const TASK_TYPES = {
    scales, angle, numberline, plane, pick, level, "triangle-sum": triangleSum, line,
    strips, rect: rectangle, enter, roll, order, signs, move, sticks, match, table,
  };

  const IntTasks = {
    TASK_TYPES,
    // the right answer in the shape value() returns; «move» derives it from the terms
    solutionOf(task) {
      return task.type === "move" ? moveSolution(task) : task.solution;
    },
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
