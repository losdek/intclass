/* Question generators: a quiz slot may hold { "gen": "name", "type": …, "question": "…" } instead of a fixed task.
 * Every attempt builds a fresh task from it with new numbers: IntGen.make(spec, rng) → a plain task for IntTasks.
 * rng() is Math.random on the site; the tests pass a seeded one and check hundreds of draws.
 * Every generator keeps its answer inside the widget (number line range, grid, parts), so it is always reachable. */
(function (root) {
  "use strict";

  const int = (rng, a, b) => a + Math.floor(rng() * (b - a + 1));
  const pick = (rng, list) => list[Math.floor(rng() * list.length)];
  const shuffle = (rng, list) => {
    const a = [...list];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const gcd = (a, b) => (b ? gcd(b, a % b) : Math.abs(a));
  // 52391 → «52 391», −3 → «−3», 0.75 → «0,75»
  const n = (x) => {
    const s = String(Math.abs(x)).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
    return x < 0 ? `−${s}` : s;
  };
  const par = (x) => (x < 0 ? `(${n(x)})` : n(x));
  const frac = (a, b) => {
    const g = gcd(a, b);
    return b / g === 1 ? n(a / g) : `${a / g}/${b / g}`;
  };
  // 1 стакан, 2 стакана, 5 стаканов
  const plural = (k, [one, few, many]) => {
    const t = Math.abs(k) % 100, u = t % 10;
    if (t > 10 && t < 20) return many;
    return u === 1 ? one : u >= 2 && u <= 4 ? few : many;
  };
  const NAMES = [["Маша", "Дима"], ["Аня", "Боря"], ["Лиза", "Петя"], ["Вера", "Коля"], ["Оля", "Саша"]];

  const G = {
    /* ---------------------------------------------------------------- 5 класс */
    // the stadium puzzle: round the crowd to thousands on a scale
    "round-thousands"(rng) {
      let x;
      do x = int(rng, 12000, 89000) + int(rng, 0, 999); while (x % 1000 === 0 || Math.floor(x / 100) % 10 === 5 && x % 100 === 0);
      const sol = Math.round(x / 1000) * 1000;
      const lo = sol - 1000 * int(rng, 1, 3);
      const d = Math.floor(x / 100) % 10;
      return {
        type: "place", min: lo, max: lo + 4000, step: 1000, solution: sol,
        labels: [0, 1, 2, 3, 4].map((k) => [lo + 1000 * k, n(lo + 1000 * k)]),
        hint: "Нажмите на шкалу или перетащите точку",
        question: `Как в загадке из видео: на табло стадиона число зрителей — ${n(x)}. Какое число напишут в новостях, если округлить до тысяч? Отметьте на шкале.`,
        explanation: `Смотрим на цифру сотен: ${d} — ${d >= 5 ? "это 5 или больше, тысячи + 1" : "меньше 5, тысячи не меняем"}: ${n(x)} ≈ ${n(sol)}.`,
      };
    },
    // round a two-digit or three-digit number to tens on a number line of eleven points
    "round-tens"(rng) {
      let x;
      do x = int(rng, 12, 98); while (x % 10 === 0);
      const lo = Math.floor(x / 10) * 10, sol = Math.round(x / 10) * 10;
      return {
        type: "numberline", min: lo, max: lo + 10, solution: [sol],
        question: `Округлите ${n(x)} до десятков. Отметьте ответ на прямой.`,
        explanation: `Цифра единиц ${x % 10} — ${x % 10 >= 5 ? "5 или больше, округляем вверх" : "меньше 5, округляем вниз"}: ${n(x)} ≈ ${n(sol)}.`,
      };
    },
    // the candy puzzle: which bags split evenly
    "divisible-sort"(rng) {
      const k = pick(rng, [2, 3, 5, 9, 10]);
      const kids = { 2: "двоих", 3: "троих", 5: "пятерых", 9: "девятерых", 10: "десятерых" }[k];
      const yes = [], no = [];
      while (yes.length < 3 || no.length < 3) {
        const x = int(rng, 1001, 9998);
        const ok = x % k === 0;
        if (ok && yes.length < 3 && !yes.includes(x)) yes.push(x);
        if (!ok && no.length < 3 && !no.includes(x)) no.push(x);
      }
      const items = shuffle(rng, [...yes.map((x) => [x, 0]), ...no.map((x) => [x, 1])]);
      const digits = (x) => String(x).split("").reduce((s, d) => s + Number(d), 0);
      const rule = k === 3 || k === 9
        ? `делится на ${k}, если сумма цифр делится на ${k}: ` + items.map(([x]) => `${n(x)} → ${digits(x)}`).join(", ")
        : k === 2 ? "делится на 2, если последняя цифра чётная" : k === 5 ? "делится на 5, если оканчивается на 0 или 5" : "делится на 10, если оканчивается нулём";
      return {
        type: "sort", items: items.map(([x]) => n(x)), buckets: ["поровну", "не выйдет"], tags: ["✓", "✗"], solution: items.map(([, b]) => b),
        question: `Как в задаче про конфеты: какие пакеты можно разделить поровну на ${kids}? Перетащите каждый в нужную группу.`,
        explanation: `Число ${rule}. Поровну: ${yes.map(n).join(", ")}.`,
      };
    },
    // the pizza puzzle: quarters left over → a point on 0…4
    "quarters-place"(rng) {
      let q;
      do q = int(rng, 5, 15); while (q % 4 === 0);
      const whole = Math.floor(q / 4), rest = q % 4;
      return {
        type: "place", min: 0, max: 4, step: 0.25, solution: q / 4,
        labels: [[0, "0"], [1, "1"], [2, "2"], [3, "3"], [4, "4"]],
        question: `Как в задаче из видео: осталось ${q} ${plural(q, ["кусок", "куска", "кусков"])} пиццы, каждый — четверть пиццы. Отметьте на прямой, сколько это целых пицц.`,
        explanation: `${q} : 4 = ${whole} (ост. ${rest}) — ${whole} ${plural(whole, ["целая пицца", "целые пиццы", "целых пицц"])} и ещё ${frac(rest, 4)}: ${whole} ${frac(rest, 4)}.`,
      };
    },
    // a fraction of a circle or strip
    "shade-fraction"(rng) {
      const b = pick(rng, [3, 4, 5, 6, 8, 10]);
      const a = int(rng, 1, b - 1);
      const pie = rng() < 0.5;
      return {
        type: "slices", shape: pie ? "pie" : "bar", parts: b, solution: a,
        question: `${pie ? "Круг разрезан" : "Полоска разделена"} на ${b} ${plural(b, ["равную часть", "равные части", "равных частей"])}. Закрасьте ${a}/${b} ${pie ? "круга" : "полоски"}.`,
        explanation: `Знаменатель ${b} — на столько частей разрезано целое, числитель ${a} — столько частей закрашиваем.`,
      };
    },
    // a decimal on 0…1
    "decimal-place"(rng) {
      let k;
      do k = int(rng, 1, 19); while (k === 10);
      return {
        type: "place", min: 0, max: 2, step: 0.1, solution: k / 10,
        labels: [[0, "0"], [1, "1"], [2, "2"]],
        question: `Отметьте на прямой число ${n(k / 10)}.`,
        explanation: `${n(k / 10)} — это ${k} ${plural(k, ["десятая", "десятых", "десятых"])}: каждая единица делится на 10 частей, отсчитываем ${k} от нуля.`,
      };
    },
    // percent of a number, typed in
    "percent-of"(rng) {
      const p = pick(rng, [10, 20, 25, 50, 75, 30, 40]);
      const whole = pick(rng, [20, 40, 60, 80, 120, 200, 300, 400]);
      if ((whole * p) % 100) return G["percent-of"](rng);
      const what = pick(rng, [["В классе", "учеников", "ходят в бассейн"], ["В коробке", "конфет", "с орехами"], ["В саду", "деревьев", "яблони"]]);
      return {
        type: "enter", label: "Ответ", solution: (whole * p) / 100,
        question: `${what[0]} ${whole} ${what[1]}, ${p}% из них ${what[2]}. Сколько это ${what[1]}?`,
        explanation: `1% от ${whole} — это ${n(whole / 100)}, а ${p}% — ${n(whole / 100)} · ${p} = ${n((whole * p) / 100)}.`,
      };
    },
    // a rectangle with given area and perimeter on the grid
    "rect-area"(rng) {
      let a, b;
      do { a = int(rng, 2, 7); b = int(rng, 2, 5); } while (a === b);
      return {
        type: "rect", cols: 8, rows: 6, area: a * b, perimeter: 2 * (a + b), solution: [a, b],
        question: `Постройте прямоугольник площадью ${a * b} см² и периметром ${2 * (a + b)} см: нажмите на клетку, где будет его дальний угол.`,
        explanation: `Подходит ${a} × ${b}: площадь ${a} · ${b} = ${a * b}, периметр 2 · (${a} + ${b}) = ${2 * (a + b)}.`,
      };
    },
    // x + a = b on the scales
    "scales-add"(rng) {
      const x = int(rng, 2, 9), a = int(rng, 1, 12 - x);
      return {
        type: "scales", left: { x: 1, n: a }, right: { x: 0, n: x + a }, max: 12, solution: x,
        question: `Весы — это уравнение x + ${a} = ${x + a}. Подберите x кнопками − и +, чтобы весы уравновесились.`,
        explanation: `Неизвестное слагаемое = сумма − известное слагаемое: x = ${x + a} − ${a} = ${x}.`,
      };
    },

    /* ---------------------------------------------------------------- 6 класс */
    // the pizza puzzle with two eaters: eighths of a pie
    "pizza-add"(rng) {
      const pool = [[1, 2], [1, 4], [3, 4], [1, 8], [3, 8], [5, 8]];
      let p, q, total;
      do {
        p = pick(rng, pool); q = pick(rng, pool);
        total = (8 / p[1]) * p[0] + (8 / q[1]) * q[0];
      } while (total > 8 || total < 2 || (p[1] === 8 && q[1] === 8) || p === q);
      const [a, b] = pick(rng, NAMES);
      const e = (f) => (f[1] === 8 ? `${f[0]}/8` : `${f[0]}/${f[1]} = ${(8 / f[1]) * f[0]}/8`);
      return {
        type: "slices", shape: "pie", parts: 8, solution: total,
        question: `Как в задаче из видео: пицца из 8 кусков. ${a} съела ${p[0]}/${p[1]} пиццы, ${b} — ${q[0]}/${q[1]}. Закрасьте, сколько пиццы съели вместе.`,
        explanation: `Приводим к восьмым: ${e(p)}, ${e(q)}. Вместе ${total}/8${total === 8 ? " — вся пицца" : ""}.`,
      };
    },
    // the juice puzzle: a twelve-part litre strip
    "juice-sub"(rng) {
      const pool = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4], [1, 6], [5, 6], [5, 12], [7, 12], [11, 12]];
      let p, q, left;
      do {
        p = pick(rng, pool); q = pick(rng, pool);
        left = (12 / p[1]) * p[0] - (12 / q[1]) * q[0];
      } while (left < 1 || p[1] === q[1]);
      const t = (f) => (12 / f[1]) * f[0];
      return {
        type: "slices", shape: "bar", parts: 12, solution: left,
        question: `Как в задаче из видео: полоска — целый литр, разделённый на 12 частей. Было ${p[0]}/${p[1]} л сока, выпили ${q[0]}/${q[1]} л. Закрасьте, сколько сока осталось.`,
        explanation: `Общий знаменатель 12: ${p[0]}/${p[1]} − ${q[0]}/${q[1]} = ${t(p)}/12 − ${t(q)}/12 = ${left}/12 л${gcd(left, 12) > 1 ? ` = ${frac(left, 12)} л` : ""}.`,
      };
    },
    // the recipe puzzle: a part of a part, in twelfths of a glass
    "recipe-mul"(rng) {
      const parts = [[1, 2], [1, 3], [2, 3], [1, 4], [3, 4]];
      const amounts = [[1, 2], [2, 3], [3, 4], [1, 3], [5, 6]];
      let p, q, r;
      do { p = pick(rng, parts); q = pick(rng, amounts); r = (12 * p[0] * q[0]) / (p[1] * q[1]); } while (!Number.isInteger(r) || r < 1 || r > 11);
      const what = pick(rng, [["сахара", "сахара"], ["муки", "муки"], ["молока", "молока"]]);
      return {
        type: "slices", shape: "bar", parts: 12, solution: r,
        question: `Как в задаче из видео: полоска — целый стакан, 12 частей. В рецепте ${q[0]}/${q[1]} стакана ${what[0]}, а печём ${p[0]}/${p[1]} рецепта. Закрасьте, сколько ${what[1]} нужно.`,
        explanation: `${p[0]}/${p[1]} · ${q[0]}/${q[1]} = ${p[0] * q[0]}/${p[1] * q[1]} = ${frac(r, 12)} стакана — это ${r}/12.`,
      };
    },
    // the jar puzzle: how many pieces of 1/k fit into a whole number
    "pieces-div"(rng) {
      let whole, k;
      do { whole = int(rng, 2, 4); k = int(rng, 2, 5); } while (whole * k < 5 || whole * k > 14);
      const ctx = pick(rng, [
        [`из банки ${whole} ${plural(whole, ["литр", "литра", "литров"])} наливаем стаканы по 1/${k} литра`, "стаканов"],
        [`ленту ${whole} ${plural(whole, ["метр", "метра", "метров"])} режем на куски по 1/${k} метра`, "кусков"],
        [`${whole} кг конфет раскладываем в пакетики по 1/${k} кг`, "пакетиков"],
      ]);
      return {
        type: "numberline", min: 4, max: 14, solution: [whole * k],
        question: `Как в задаче из видео: ${ctx[0]}. Сколько ${ctx[1]} получится? Отметьте ответ на прямой.`,
        explanation: `${whole} : 1/${k} = ${whole} · ${k} = ${whole * k}: в каждой единице ${k} ${plural(k, ["часть", "части", "частей"])} по 1/${k}.`,
      };
    },
    // a sum with negative numbers on −5…5
    "signed-sum"(rng) {
      let a, b;
      do { a = int(rng, -5, 5); b = int(rng, -5, 5); } while (a === 0 || b === 0 || (a > 0 && b > 0) || a + b < -5 || a + b > 5);
      return {
        type: "numberline", min: -5, max: 5, solution: [a + b],
        question: `Вычислите ${par(a)} + ${par(b)} и отметьте ответ на оси.`,
        explanation: `От ${n(a)} делаем ${Math.abs(b)} ${plural(Math.abs(b), ["шаг", "шага", "шагов"])} ${b > 0 ? "вправо" : "влево"}: ${par(a)} + ${par(b)} = ${n(a + b)}.`,
      };
    },
    // a point by its coordinates
    "plane-point"(rng) {
      let x, y;
      do { x = int(rng, -5, 5); y = int(rng, -5, 5); } while (x === 0 || y === 0);
      const name = pick(rng, ["A", "B", "C", "K", "M", "P"]);
      return {
        type: "plane", range: 5, name, solution: [x, y],
        question: `Поставьте точку ${name}(${n(x)}; ${n(y)}): нажмите на нужный узел сетки.`,
        explanation: `Сначала x = ${n(x)} — ${Math.abs(x)} ${plural(Math.abs(x), ["шаг", "шага", "шагов"])} ${x > 0 ? "вправо" : "влево"}, потом y = ${n(y)} — ${Math.abs(y)} ${y > 0 ? "вверх" : "вниз"}.`,
      };
    },
    // НОД of two numbers by their prime factors
    "gcd-enter"(rng) {
      const g = pick(rng, [2, 3, 4, 5, 6, 7, 8, 9, 10, 12]);
      let m, k;
      do { m = int(rng, 2, 7); k = int(rng, 2, 7); } while (m === k || gcd(m, k) !== 1 || g * m > 99 || g * k > 99);
      return {
        type: "enter", label: "НОД =", solution: g,
        question: `Найдите НОД(${g * m}, ${g * k}).`,
        explanation: `${g * m} = ${g} · ${m}, ${g * k} = ${g} · ${k}, а ${m} и ${k} общих делителей не имеют: НОД = ${g}.`,
      };
    },
    // the meeting puzzle: where the two meet on the road
    "meet-place"(rng) {
      let v1, v2, t;
      do { v1 = int(rng, 2, 6); v2 = int(rng, 2, 6); t = int(rng, 2, 3); } while ((v1 + v2) * t > 18 || (v1 + v2) * t < 8);
      const s = (v1 + v2) * t;
      const [a, b] = pick(rng, NAMES);
      return {
        type: "place", min: 0, max: s, step: 1, solution: v1 * t,
        labels: [[0, "0"], [s, `${s} км`]],
        question: `Как в задаче из видео: ${a} и ${b} в ${s} км друг от друга вышли навстречу. ${a} идёт ${v1} км/ч, ${b} — ${v2} км/ч. Отметьте, где они встретятся (сколько километров от дома ${a === "Маша" ? "Маши" : a === "Аня" ? "Ани" : a === "Лиза" ? "Лизы" : a === "Вера" ? "Веры" : "Оли"}).`,
        explanation: `Скорость сближения ${v1} + ${v2} = ${v1 + v2} км/ч, встретятся через ${s} : ${v1 + v2} = ${t} ч. До встречи первый пройдёт ${v1} · ${t} = ${v1 * t} км.`,
      };
    },
    // a missing term of a proportion
    "proportion-enter"(rng) {
      const a = int(rng, 2, 9), b = int(rng, 2, 9), k = int(rng, 2, 5);
      if (a === b) return G["proportion-enter"](rng);
      return {
        type: "enter", figure: "proportion", terms: [String(a), String(b), "x", String(b * k)], label: "x =", solution: a * k,
        question: "Найдите x по основному свойству пропорции.",
        explanation: `Произведение крайних равно произведению средних: ${a} · ${b * k} = ${b} · x, x = ${a * b * k} : ${b} = ${a * k}.`,
      };
    },

    /* ---------------------------------------------------------------- 7 класс */
    // the mental-math puzzle: build the factored form
    "factor-build"(rng) {
      const a = int(rng, 11, 49);
      const total = pick(rng, [10, 100]);
      const b = total === 10 ? int(rng, 2, 8) : int(rng, 11, 89);
      const c = total - b;
      const s = (x) => String(x);
      return {
        type: "build", tiles: [s(a), "·", "(", s(b), "+", s(c), ")", "−", s(total)],
        solution: [s(a), "·", "(", s(b), "+", s(c), ")"],
        alt: [["(", s(b), "+", s(c), ")", "·", s(a)], [s(a), "·", "(", s(c), "+", s(b), ")"], ["(", s(c), "+", s(b), ")", "·", s(a)]],
        question: `Как в видео: посчитайте в уме ${a} · ${b} + ${a} · ${c}. Соберите из карточек выражение, в котором общий множитель вынесен за скобки.`,
        explanation: `${a} · ${b} + ${a} · ${c} = ${a} · (${b} + ${c}) = ${a} · ${total} = ${n(a * total)}.`,
      };
    },
    // ax + b = cx + d on the scales
    "scales-linear"(rng) {
      let a, c, x, b, d;
      do { a = int(rng, 2, 4); c = int(rng, 1, a - 1); x = int(rng, 1, 6); b = int(rng, 0, 6); d = (a - c) * x + b; } while (d > 14 || d === b);
      return {
        type: "scales", left: { x: a, n: b }, right: { x: c, n: d }, max: 10, solution: x,
        question: `Весы — это уравнение ${a}x${b ? ` + ${b}` : ""} = ${c === 1 ? "" : c}x + ${d}. Подберите x, чтобы весы уравновесились.`,
        explanation: `${a}x − ${c === 1 ? "" : c}x = ${d}${b ? ` − ${b}` : ""}, ${a - c === 1 ? "" : a - c}x = ${d - b}, x = ${x}.`,
      };
    },
    // the third angle of a triangle
    "triangle-sum"(rng) {
      let a, b;
      do { a = 5 * int(rng, 5, 22); b = 5 * int(rng, 5, 22); } while (180 - a - b < 25 || 180 - a - b > 120);
      return {
        type: "triangle-sum", a, b, solution: 180 - a - b,
        question: `В треугольнике ∠A = ${a}° и ∠B = ${b}°. Поверните угол C так, чтобы три угла сложились в развёрнутый угол.`,
        explanation: `Сумма углов треугольника 180°: ∠C = 180° − ${a}° − ${b}° = ${180 - a - b}°.`,
      };
    },
    // a line through two points: pick k and b
    "line-kb"(rng) {
      let k, b;
      do { k = int(rng, -3, 3); b = int(rng, -3, 3); } while (k === 0 || Math.abs(k + b) > 5 || Math.abs(2 * k + b) > 5);
      const x2 = Math.abs(2 * k + b) <= 5 ? 2 : 1;
      return {
        type: "line", points: [[0, b], [x2, k * x2 + b]], solution: { k, b },
        question: "Подберите k и b, чтобы прямая y = kx + b прошла через обе отмеченные точки.",
        explanation: `Точка (0; ${n(b)}) даёт b = ${n(b)}. Из (${x2}; ${n(k * x2 + b)}): ${n(k * x2 + b)} = ${x2}k ${b < 0 ? "−" : "+"} ${Math.abs(b)}, k = ${n(k)}.`,
      };
    },
    // the railway puzzle: the co-interior angle on the protractor
    "rails-angle"(rng) {
      let a;
      do a = 5 * int(rng, 8, 28); while (a === 90);
      const b = 180 - a;
      return {
        type: "angle", accept: [b - 2, b + 2], solution: b,
        question: `Как в вопросе из видео: дорога пересекает рельсы, у первого рельса угол ${a}°. Каким должен быть односторонний угол у второго рельса, чтобы рельсы были параллельны? Покажите его на транспортире.`,
        explanation: `Односторонние углы при параллельных прямых в сумме дают 180°: 180° − ${a}° = ${b}°.`,
      };
    },
    // the farmyard puzzle: the system's solution as a point
    "farm-plane"(rng) {
      let x, y;
      do { x = int(rng, 1, 4); y = int(rng, 1, 3); } while (x + y > 6 || x + y < 3);
      const h = x + y, legs = 2 * x + 4 * y;
      return {
        type: "plane", name: "M", solution: [x, y], reveal: `Верно: M(${x}; ${y})`,
        graphs: [{ k: -1, b: h, label: `x + y = ${h}` }, { k: -0.5, b: legs / 4, label: `2x + 4y = ${legs}` }],
        question: `Как в загадке из видео: во дворе куры и кролики — ${h} ${plural(h, ["голова", "головы", "голов"])} и ${legs} ${plural(legs, ["нога", "ноги", "ног"])}. По оси x — куры, по оси y — кролики. Поставьте точку M — решение системы.`,
        explanation: `x + y = ${h}, 2x + 4y = ${legs}. Умножим первое на 2 и вычтем: 2y = ${legs - 2 * h}, y = ${y}, x = ${x}. Проверка: ${x} · 2 + ${y} · 4 = ${legs}.`,
      };
    },

    /* ---------------------------------------------------------------- 8 класс */
    // the land puzzle: the rectangle a parallelogram turns into
    "parallelogram-rect"(rng) {
      let a, h;
      do { a = int(rng, 3, 7); h = int(rng, 2, 5); } while (a === h);
      return {
        type: "rect", cols: 8, rows: 6, area: a * h, perimeter: 2 * (a + h), solution: [a, h],
        question: `Как в задаче из видео: участок — параллелограмм с основанием ${a} и высотой ${h}. Отрежьте треугольник, переложите его и постройте получившийся прямоугольник: нажмите на клетку, где будет его дальний угол.`,
        explanation: `Получится прямоугольник ${a} × ${h}: площадь та же, S = a · h = ${a * h}.`,
      };
    },
    // the carpenter's frame: the fourth corner of a rectangle
    "frame-corner"(rng) {
      let x1, x2, y1, y2;
      do { x1 = int(rng, -5, 2); x2 = int(rng, x1 + 3, 5); y1 = int(rng, -5, 1); y2 = int(rng, y1 + 2, 5); } while (x2 - x1 === y2 - y1);
      const D = [x1, y2];
      const t = (p) => `${n(p[0])}; ${n(p[1])}`;
      return {
        type: "plane", given: [[x1, y1, "A"], [x2, y1, "B"], [x2, y2, "C"]], shape: ["A", "B", "C", "?"], name: "D", solution: D,
        reveal: `Верно: D(${t(D)})`,
        question: "Как столяр из видео: достройте раму-прямоугольник ABCD — поставьте вершину D. Проверка: диагонали AC и BD должны быть равны.",
        explanation: `У прямоугольника противоположные стороны равны и параллельны, а диагонали равны: D(${t(D)}).`,
      };
    },
    // the tree puzzle: height = distance · tg α
    "tree-height"(rng) {
      const nice = [];
      for (let d = 4; d <= 10; d++) for (let h = 2; h <= 10; h++) {
        const r = h / d;
        if (r === 1) continue;
        const dec = Math.round(r * 100) / 100;
        if (Math.abs(dec - r) < 1e-9) nice.push([d, h, n(dec)]);
        else if (d % 3 === 0 && h % (d / 3) === 0 && h / (d / 3) !== 3) nice.push([d, h, `${h / (d / 3)}/3`]);
      }
      const [d, h, tg] = pick(rng, nice);
      const what = pick(rng, [["дерева", "дерева"], ["столба", "столба"], ["дома", "дома"]]);
      return {
        type: "place", min: 0, max: 10, step: 1, solution: h,
        labels: [[0, "0"], [2, "2"], [4, "4"], [6, "6"], [8, "8"], [10, "10 м"]],
        question: `Как в загадке из видео: до ${what[0]} ${d} м, тангенс угла, под которым видна верхушка, равен ${tg}. Отметьте на шкале высоту ${what[1]}.`,
        explanation: `tg α = высота : расстояние, значит высота = ${d} · ${tg} = ${h} м.`,
      };
    },
    // the football pitch: inscribed angle = half the central one
    "inscribed-angle"(rng) {
      const c = 10 * int(rng, 4, 16);
      const a = c / 2;
      return {
        type: "angle", accept: [a - 2, a + 2], solution: a,
        question: `Как на круглой площадке из видео: из центра ворота видны под углом ${c}°. Под каким углом их видно с края площадки напротив ворот? Покажите на транспортире.`,
        explanation: `Вписанный угол равен половине центрального, опирающегося на ту же дугу: ${c}° : 2 = ${a}°. Из любой точки края напротив ворот угол один и тот же.`,
      };
    },
    // a side of a right triangle from a Pythagorean triple
    "pythagoras"(rng) {
      const [p, q, r] = pick(rng, [[3, 4, 5], [6, 8, 10], [5, 12, 13], [8, 15, 17], [9, 12, 15], [7, 24, 25], [12, 16, 20], [20, 21, 29]]);
      if (rng() < 0.5) {
        return {
          type: "enter", label: "c =", solution: r,
          question: `Катеты прямоугольного треугольника равны ${p} и ${q}. Найдите гипотенузу.`,
          explanation: `c² = ${p}² + ${q}² = ${p * p} + ${q * q} = ${r * r}, c = ${r}.`,
        };
      }
      return {
        type: "enter", label: "Катет", solution: q,
        question: `Гипотенуза равна ${r}, один катет — ${p}. Найдите второй катет.`,
        explanation: `b² = ${r}² − ${p}² = ${r * r} − ${p * p} = ${q * q}, b = ${q}.`,
      };
    },
    // roots of x² + px + q = 0 by Vieta, marked on −5…5
    "vieta-roots"(rng) {
      let r1, r2;
      do { r1 = int(rng, -5, 5); r2 = int(rng, -5, 5); } while (r1 === r2 || r1 === 0 || r2 === 0);
      const p = -(r1 + r2), q = r1 * r2;
      const eq = `x²${p ? ` ${p > 0 ? "+" : "−"} ${Math.abs(p) === 1 ? "" : Math.abs(p)}x` : ""} ${q > 0 ? "+" : "−"} ${Math.abs(q)} = 0`;
      return {
        type: "numberline", min: -5, max: 5, solution: [Math.min(r1, r2), Math.max(r1, r2)],
        question: `Отметьте на оси корни уравнения ${eq}: их сумма ${n(-p)}, а произведение ${n(q)}.`,
        explanation: `Подходят ${n(r1)} и ${n(r2)}: ${par(r1)} + ${par(r2)} = ${n(-p)}, ${par(r1)} · ${par(r2)} = ${n(q)}.`,
      };
    },
    // the solution of ax + b > c as a ray
    "ineq-ray"(rng) {
      let a, root, b;
      do { a = pick(rng, [2, 3, -2, -3]); root = int(rng, -4, 4); b = int(rng, -5, 5); } while (b === 0);
      const strict = rng() < 0.5, sign = rng() < 0.5 ? ">" : "<";
      const c = a * root + b;
      const flips = a < 0;
      const dir = (sign === ">") !== flips ? ">" : "<";
      const sym = { ">": strict ? ">" : "≥", "<": strict ? "<" : "≤" };
      return {
        type: "ray", min: -5, max: 5, solution: { at: root, dir, closed: !strict },
        question: `Изобразите на оси решение неравенства ${n(a)}x ${b > 0 ? "+" : "−"} ${Math.abs(b)} ${sym[sign]} ${n(c)}: нажмите на границу, выберите направление и точку.`,
        explanation: `${n(a)}x ${sym[sign]} ${n(c - b)}${flips ? `; делим на ${n(a)} — знак меняется` : ""}: x ${sym[dir]} ${n(root)}. Точка ${strict ? "выколотая" : "закрашенная"}.`,
      };
    },

    /* ---------------------------------------------------------------- 9 класс */
    // integer solutions of x² − a² < 0 (or ≤ 0)
    "square-ineq"(rng) {
      const strict = rng() < 0.5;
      const sign = strict ? "<" : "≤";
      let p, q, text;
      if (rng() < 0.4) {
        const a = int(rng, 2, 4);
        p = -a; q = a; text = `x² − ${a * a} ${sign} 0`;
      } else {
        do { p = int(rng, -4, 3); q = int(rng, p + 2, 5); } while (p === 0 && q === 0);
        const f = (r) => (r === 0 ? "x" : `(x ${r > 0 ? "−" : "+"} ${Math.abs(r)})`);
        text = `${f(p)}${f(q)} ${sign} 0`;
      }
      const lo = strict ? p + 1 : p, hi = strict ? q - 1 : q;
      const sol = [];
      for (let x = lo; x <= hi; x++) sol.push(x);
      return {
        type: "numberline", min: -5, max: 5, solution: sol,
        question: `Отметьте все целые x, при которых ${text}.`,
        explanation: `Корни ${n(p)} и ${n(q)}, ветви параболы вверх — она ${strict ? "ниже оси строго между корнями" : "не выше оси на отрезке между корнями"}: целые от ${n(lo)} до ${n(hi)}.`,
      };
    },
    // the n-th term of an arithmetic progression
    "arith-term"(rng) {
      const a1 = int(rng, 2, 20), d = int(rng, 2, 9), k = int(rng, 8, 30);
      return {
        type: "enter", label: `a${String(k).replace(/\d/g, (c) => "₀₁₂₃₄₅₆₇₈₉"[c])} =`, solution: a1 + (k - 1) * d,
        question: `В первом ряду ${a1} ${plural(a1, ["место", "места", "мест"])}, в каждом следующем на ${d} больше. Сколько мест в ${k}-м ряду?`,
        explanation: `aₙ = a₁ + (n − 1)d: ${a1} + ${k - 1} · ${d} = ${a1 + (k - 1) * d}.`,
      };
    },
    // the next term of a geometric progression
    "geom-next"(rng) {
      const b1 = pick(rng, [1, 2, 3, 5]), q = pick(rng, [2, 3, -2]);
      const seq = [b1, b1 * q, b1 * q * q, b1 * q ** 3];
      return {
        type: "enter", label: "Ответ", solution: b1 * q ** 4,
        question: `Найдите следующий член прогрессии ${seq.map(n).join(", ")}, …`,
        explanation: `Знаменатель прогрессии q = ${n(seq[1])} : ${par(seq[0])} = ${n(q)}. Следующий член: ${n(seq[3])} · ${par(q)} = ${n(b1 * q ** 4)}.`,
      };
    },
  };

  /* -------------------------------------------------------------- word pools
   * Russian rules have no numbers to vary, so the slot carries a pool of words and every attempt takes a
   * different set. spec: { gen: "pool-sort", question, buckets, tags, rule, take?, pool: [[item, bucket, full?], …] }
   * or { gen: "pool-gaps", question, letters, rule, take?, pool: [[word_with_gap, letter, full?], …] } */
  const sample = (rng, list, k) => shuffle(rng, list).slice(0, k);
  G["pool-sort"] = (rng, spec) => {
    const take = spec.take || 6;
    const groups = spec.buckets.map((_, b) => spec.pool.filter((w) => w[1] === b));
    // at least two words in every box, the rest anywhere
    const counts = groups.map(() => 2);
    for (let left = take - 2 * groups.length; left > 0; left--) {
      const open = groups.map((g, b) => b).filter((b) => counts[b] < groups[b].length);
      counts[pick(rng, open)]++;
    }
    const chosen = shuffle(rng, groups.flatMap((g, b) => sample(rng, g, counts[b])));
    const list = (b) => chosen.filter((w) => w[1] === b).map((w) => w[2] || w[0]).join(", ");
    return {
      type: "sort", items: chosen.map((w) => w[0]), buckets: spec.buckets, tags: spec.tags, solution: chosen.map((w) => w[1]),
      question: spec.question,
      explanation: `${spec.rule} ${spec.buckets.map((name, b) => `«${name}»: ${list(b)}.`).join(" ")}`,
    };
  };
  G["pool-gaps"] = (rng, spec) => {
    const chosen = sample(rng, spec.pool, spec.take || 5);
    return {
      type: "gaps", words: chosen.map((w) => w[0]), letters: spec.letters, solution: chosen.map((w) => w[1]),
      question: spec.question,
      explanation: `${spec.rule} Правильно: ${chosen.map((w) => w[2] || w[0].replace("_", w[1])).join(", ")}.`,
    };
  };

  function make(spec, rng = Math.random) {
    const g = G[spec.gen];
    if (!g) throw new Error(`Unknown generator ${spec.gen}`);
    return g(rng, spec);
  }

  const api = { make, names: Object.keys(G) };
  root.IntGen = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
