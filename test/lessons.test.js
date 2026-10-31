const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { LESSONS, SUBJECT_LABELS } = require("../js/lessons.js");
const IntTasks = require("../js/tasks.js");
const IntStore = require("../js/store.js");
const IntGen = require("../js/generators.js");
const IntScenes = require("../js/scenes.js");
["math5", "math6", "math7", "math8", "math9", "rus56", "rus79", "hard"].forEach((f) => require(`../js/scenes-${f}.js`));

const ROOT = path.join(__dirname, "..");

// a repeatable random source, so a failing draw can be reproduced
const seeded = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
// a quiz slot is one task or { variants: [task, …] } (each attempt draws one);
// a { gen } entry builds a new task every attempt, so the tests look at many of its draws
const DRAWS = 40;
const variantsOf = (q) => q.variants || [q];
const expand = (t) => (t.gen ? Array.from({ length: DRAWS }, (_, i) => IntGen.make(t, seeded(i + 1))) : [t]);
const allTasks = (lesson) => lesson.quiz.flatMap(variantsOf).flatMap(expand);

describe("Lessons Dataset Validation", () => {
  test("LESSONS array contains 98 curriculum lessons", () => {
    assert.ok(Array.isArray(LESSONS));
    assert.strictEqual(LESSONS.length, 98, `Expected 98 lessons, got ${LESSONS.length}`);
  });

  test("Every lesson has valid unique ID", () => {
    const ids = new Set();
    LESSONS.forEach((lesson, index) => {
      assert.ok(lesson.id, `Lesson at index ${index} missing ID`);
      assert.ok(!ids.has(lesson.id), `Duplicate lesson ID found: ${lesson.id}`);
      ids.add(lesson.id);
    });
  });

  test("Every lesson has valid subject ('math' or 'russian')", () => {
    LESSONS.forEach((lesson) => {
      assert.ok(["math", "russian"].includes(lesson.subject), `Invalid subject: ${lesson.subject} in ${lesson.id}`);
      assert.ok(SUBJECT_LABELS[lesson.subject], `Missing label for subject: ${lesson.subject}`);
    });
  });

  test("Every lesson has valid grade ('5' to '9')", () => {
    LESSONS.forEach((lesson) => {
      assert.ok(["5", "6", "7", "8", "9"].includes(lesson.grade), `Invalid grade: ${lesson.grade} in ${lesson.id}`);
    });
  });

  test("Every lesson has title, description and takeaway rule", () => {
    LESSONS.forEach((lesson) => {
      assert.ok(lesson.title && lesson.title.length >= 5, `Invalid title in ${lesson.id}`);
      assert.ok(lesson.description && lesson.description.length >= 10, `Invalid description in ${lesson.id}`);
      assert.ok(lesson.takeaway && lesson.takeaway.length >= 10, `Invalid takeaway rule in ${lesson.id}`);
    });
  });

  test("Self-hosted videos point at existing MP4 and poster files", () => {
    const withVideo = LESSONS.filter((l) => l.video);
    assert.ok(withVideo.length >= 10, `Expected at least 10 video lessons, got ${withVideo.length}`);
    withVideo.forEach((lesson) => {
      const { src, poster, duration } = lesson.video;
      assert.match(src, /^videos\/[a-z0-9-]+\.mp4$/, `Bad video path in ${lesson.id}`);
      assert.match(poster, /^videos\/posters\/[a-z0-9-]+\.jpg$/, `Bad poster path in ${lesson.id}`);
      assert.match(duration, /^\d+:\d{2}$/, `Bad duration in ${lesson.id}`);
      assert.ok(fs.existsSync(path.join(ROOT, src)), `Missing video file ${src} for ${lesson.id}`);
      assert.ok(fs.existsSync(path.join(ROOT, poster)), `Missing poster file ${poster} for ${lesson.id}`);
    });
    const srcs = withVideo.map((l) => l.video.src);
    assert.strictEqual(new Set(srcs).size, srcs.length, "The same video is attached to two lessons");
  });

  test("A pause on the puzzle stops inside the video and hands the pupil the puzzle to solve", () => {
    LESSONS.filter((l) => l.video && l.video.pause).forEach((lesson) => {
      const { at, question, options } = lesson.video.pause;
      const [m, sec] = lesson.video.duration.split(":").map(Number);
      assert.ok(at > 2 && at < m * 60 + sec - 5, `${lesson.id}: pause time ${at} is outside the video`);
      assert.ok(question && question.length > 5, `${lesson.id}: pause has no question`);
      assert.strictEqual(options, undefined, `${lesson.id}: the pause shows a hands-on task, not options to guess from`);
      // the pause mounts a variant of the first quiz slot: the video's puzzle with other numbers
      assert.ok(variantsOf(lesson.quiz[0]).every((t) => t.type || t.gen), `${lesson.id}: the first task is not hands-on`);
    });
  });

  test("Optional YouTube ids are well-formed and not reused across lessons", () => {
    const ids = LESSONS.filter((l) => l.videoId).map((l) => l.videoId);
    ids.forEach((id) => assert.match(id, /^[A-Za-z0-9_-]{11}$/, `Invalid videoId ${id}`));
    assert.strictEqual(new Set(ids).size, ids.length, "One YouTube video is attached to several lessons");
  });

  test("Every lesson has a valid quiz with questions, options, answer index, and explanation", () => {
    LESSONS.forEach((lesson) => {
      assert.ok(Array.isArray(lesson.quiz) && lesson.quiz.length > 0, `Lesson ${lesson.id} has no quiz`);
      lesson.quiz.forEach((slot) => {
        if (slot.variants) assert.ok(slot.variants.length >= 2 || slot.variants[0].gen, `${lesson.id}: a variants slot needs at least two tasks`);
        variantsOf(slot).filter((t) => t.gen).forEach((t) => assert.ok(IntGen.names.includes(t.gen), `${lesson.id}: unknown generator ${t.gen}`));
      });
      allTasks(lesson).forEach((q, qIndex) => {
        assert.ok(q.question && q.question.length > 5, `Invalid quiz question in ${lesson.id}[${qIndex}]`);
        assert.ok(q.explanation && q.explanation.length > 5, `Missing explanation in ${lesson.id}[${qIndex}]`);
        if (q.type) return; // interactive tasks are checked below
        assert.ok(Array.isArray(q.options) && q.options.length >= 2, `Invalid options in ${lesson.id}[${qIndex}]`);
        assert.ok(
          Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length,
          `Answer index ${q.answer} out of bounds for options length ${q.options.length} in ${lesson.id}[${qIndex}]`
        );
        assert.ok(q.explanation && q.explanation.length > 5, `Missing explanation in ${lesson.id}[${qIndex}]`);
        assert.strictEqual(new Set(q.options).size, q.options.length, `Duplicate options in ${lesson.id}[${qIndex}]`);
      });
    });
  });

  test("Every lesson with a video has four interactive questions, and every task accepts its own solution", () => {
    LESSONS.filter((l) => l.video).forEach((lesson) => {
      assert.strictEqual(lesson.quiz.length, 4, `${lesson.id} should have 4 questions`);
      assert.ok(allTasks(lesson).every((q) => q.type), `${lesson.id} has a question that is not interactive`);
    });
    LESSONS.flatMap((l) => allTasks(l).map((q) => [l.id, q])).filter(([, q]) => q.type).forEach(([id, q]) => assertSound(id, q));
  });

  test("Every quiz slot offers a retake something new: two or more different tasks", () => {
    LESSONS.filter((l) => l.video).forEach((lesson) => {
      lesson.quiz.forEach((slot, i) => {
        const vs = variantsOf(slot);
        if (vs.some((t) => t.gen)) return; // a generator draws a new task every attempt
        assert.ok(vs.length >= 2, `${lesson.id}[${i}]: only one task — a retake repeats it`);
        // the task itself, without the texts that only explain it
        const keys = vs.map(({ explanation, hint, tryHint, reveal, answer, ...task }) => JSON.stringify(task));
        assert.strictEqual(new Set(keys).size, keys.length, `${lesson.id}[${i}]: two variants are the same task`);
      });
    });
  });

  test("Choice and sort tasks never repeat an option inside one task", () => {
    LESSONS.flatMap((l) => allTasks(l).map((t) => [l.id, t])).forEach(([id, t]) => {
      ["options", "items", "buckets"].forEach((k) => {
        if (Array.isArray(t[k]) && t[k].every((v) => typeof v === "string"))
          assert.strictEqual(new Set(t[k]).size, t[k].length, `${id}: «${t.question}» repeats an entry in ${k}`);
      });
    });
  });

  test("A choice task is not a lucky guess: four or more options and several right ones", () => {
    LESSONS.flatMap((l) => allTasks(l).map((t) => [l.id, t])).filter(([, t]) => t.type === "choice").forEach(([id, t]) => {
      assert.ok(t.options.length >= 4, `${id}: «${t.question}» has only ${t.options.length} options`);
      assert.ok(t.solution.length >= 2, `${id}: «${t.question}» has one right option — use enter, build or sort instead`);
      assert.ok(t.solution.length < t.options.length, `${id}: «${t.question}» — every option is right`);
    });
  });

  test("No pairs (match) tasks: they were replaced by sorting, building and typed answers", () => {
    assert.strictEqual(IntTasks.TASK_TYPES.match, undefined, "the match task type is back in tasks.js");
    LESSONS.flatMap((l) => allTasks(l).map((t) => [l.id, t])).forEach(([id, t]) =>
      assert.notStrictEqual(t.type, "match", `${id}: «${t.question}» is a pairs task — make it a sort, build or enter task`));
  });

  test("Sort and punctuation tasks are well-formed", () => {
    LESSONS.flatMap((l) => allTasks(l).map((t) => [l.id, t])).forEach(([id, t]) => {
      if (t.type === "sort") {
        assert.strictEqual(t.solution.length, t.items.length, `${id}: every word needs a group`);
        assert.ok(t.solution.every((b) => Number.isInteger(b) && b >= 0 && b < t.buckets.length), `${id}: a word goes to a missing group`);
        assert.ok(new Set(t.solution).size >= 2, `${id}: everything goes into one group`);
        if (t.tags) assert.strictEqual(t.tags.length, t.buckets.length, `${id}: tags and groups differ in number`);
      }
      if (t.type === "punct") {
        Object.keys(t.solution).forEach((k) => assert.ok(Number(k) >= 0 && Number(k) < t.tokens.length - 1, `${id}: a mark after the last word`));
        assert.ok(Object.keys(t.solution).length > 0, `${id}: no marks to place`);
      }
    });
  });

  test("Every generator gives sound tasks, and its draws really differ", () => {
    // word pools need their lesson's pool, so they are covered through the lessons above
    IntGen.names.filter((name) => !name.startsWith("pool-")).forEach((name) => {
      const seen = new Set();
      for (let i = 1; i <= 400; i++) {
        const q = IntGen.make({ gen: name }, seeded(i * 7919));
        assert.ok(q.question && q.question.length > 10 && q.explanation && q.explanation.length > 10, `${name}: text is missing`);
        assert.ok(!/undefined|NaN|\[object/.test(q.question + q.explanation + JSON.stringify(q)), `${name}: broken text «${q.question}»`);
        assertSound(`${name} #${i}`, q);
        seen.add(q.question + JSON.stringify(q.solution));
      }
      assert.ok(seen.size >= 8, `${name} repeats itself: only ${seen.size} different tasks in 400 draws`);
    });
  });

  function assertSound(id, q) {
    {
      assert.ok(IntTasks.TASK_TYPES[q.type], `Unknown task type ${q.type} in ${id}`);
      if (q.type === "scene") {
        const kind = IntScenes.kinds[q.kind];
        assert.ok(kind, `Unknown scene kind ${q.kind} in ${id}`);
        // a kind may list answers that look plausible but are wrong; each must fail
        (kind.wrong ? kind.wrong(q) : []).forEach((w) => assert.ok(!IntTasks.check(q, w), `${id}: wrong answer ${JSON.stringify(w)} passes`));
      }
      const solution = IntTasks.solutionOf(q);
      assert.ok(solution !== undefined, `Task without solution in ${id}`);
      assert.ok(IntTasks.check(q, solution), `The solution of ${id} (${q.type}) does not pass its own check`);
      assert.strictEqual(IntTasks.check(q, null), false, `Unanswered task counts as correct in ${id}`);
      // the answer has to be reachable with the widget as drawn
      if (q.type === "slices") assert.ok(q.solution >= 1 && q.solution <= q.parts - (q.given || 0), `${id}: slices answer does not fit`);
      if (q.type === "place") {
        const k = (q.solution - q.min) / q.step;
        assert.ok(q.solution >= q.min && q.solution <= q.max && Math.abs(k - Math.round(k)) < 1e-9, `${id}: place answer is off the grid`);
      }
      if (q.type === "gaps") {
        assert.strictEqual(q.words.join("").split("_").length - 1, q.solution.length, `${id}: gaps and answers differ in number`);
        assert.ok(q.solution.every((l) => q.letters.includes(l)), `${id}: an answer letter is missing from the buttons`);
      }
      if (q.type === "build") {
        [q.solution, ...(q.alt || [])].forEach((sol) => {
          const pool = [...q.tiles];
          sol.forEach((t) => {
            const i = pool.indexOf(t);
            assert.ok(i >= 0, `${id}: tile «${t}» is not in the pool`);
            pool.splice(i, 1);
          });
        });
      }
    }
  }

  test("Interactive task checks reject wrong answers", () => {
    const { check } = IntTasks;
    const scales = { type: "scales", left: { x: 3, n: 1 }, right: { x: 1, n: 9 }, solution: 4 };
    assert.ok(check(scales, 4));
    assert.ok(!check(scales, 5));
    assert.ok(!check(scales, 0));

    const angle = { type: "angle", accept: [91, 179], solution: 120 };
    assert.ok(check(angle, 91) && check(angle, 179));
    assert.ok(!check(angle, 90) && !check(angle, 180) && !check(angle, 45));

    const numberline = { type: "numberline", solution: [-3, 3] };
    assert.ok(check(numberline, [3, -3]));
    assert.ok(!check(numberline, [3]) && !check(numberline, [-3, 3, 0]) && !check(numberline, [-3, 2]));

    const plane = { type: "plane", solution: [3, -2] };
    assert.ok(check(plane, [3, -2]));
    assert.ok(!check(plane, [-2, 3]) && !check(plane, [3, 2]));

    const pick = { type: "pick", solution: ["ab1", "ab2"] };
    assert.ok(check(pick, ["ab2", "ab1"]));
    assert.ok(!check(pick, ["ab1"]) && !check(pick, ["ab1", "ab2", "a2"]));

    const slices = { type: "slices", parts: 8, solution: 3 };
    assert.ok(check(slices, 3));
    assert.ok(!check(slices, 2) && !check(slices, 4));

    const place = { type: "place", min: 0, max: 1, step: 0.125, solution: 0.75 };
    assert.ok(check(place, 0.75) && check(place, 0.5 + 0.25));
    assert.ok(!check(place, 0.625) && !check(place, 0.875));

    const gaps = { type: "gaps", words: ["ж_раф", "ш_на"], letters: ["и", "ы"], solution: ["и", "и"] };
    assert.ok(check(gaps, ["и", "и"]));
    assert.ok(!check(gaps, ["ы", "и"]) && !check(gaps, ["и"]));

    const build = { type: "build", tiles: ["3", "(", "2x", "+", "3", ")", "6"], solution: ["3", "(", "2x", "+", "3", ")"], alt: [["(", "2x", "+", "3", ")", "3"]] };
    assert.ok(check(build, ["3", "(", "2x", "+", "3", ")"]) && check(build, ["(", "2x", "+", "3", ")", "3"]));
    assert.ok(!check(build, ["6", "(", "2x", "+", "3", ")"]) && !check(build, ["3", "(", "2x", "+", "3"]));

    const level = { type: "level", solution: 4 };
    assert.ok(check(level, 4));
    assert.ok(!check(level, 4.5) && !check(level, 3));

    const tri = { type: "triangle-sum", a: 50, b: 70, solution: 60 };
    assert.ok(check(tri, 60));
    assert.ok(!check(tri, 70));

    const line = { type: "line", points: [[0, -1], [2, 3]], solution: { k: 2, b: -1 } };
    assert.ok(check(line, { k: 2, b: -1 }));
    assert.ok(!check(line, { k: 1, b: -1 }) && !check(line, { k: 2, b: 1 }));

    const parallel = { type: "line", points: [[0, 1]], parallel: { k: 2, b: -3 }, solution: { k: 2, b: 1 } };
    assert.ok(check(parallel, { k: 2, b: 1 }));
    assert.ok(!check(parallel, { k: 1, b: 1 }), "a line through the point but not parallel");

    const quadrant = { type: "plane", quadrant: 2, solution: [-2, 3] };
    assert.ok(check(quadrant, [-4, 1]) && check(quadrant, [-1, 5]));
    assert.ok(!check(quadrant, [2, 3]) && !check(quadrant, [0, 3]) && !check(quadrant, [-2, -3]));

    const strips = { type: "strips", solution: 25 };
    assert.ok(check(strips, 25) && !check(strips, 55));

    const rect = { type: "rect", area: 12, perimeter: 14, solution: [4, 3] };
    assert.ok(check(rect, [4, 3]) && check(rect, [3, 4]));
    assert.ok(!check(rect, [6, 2]) && !check(rect, [12, 1]), "same area, wrong perimeter");

    const roll = { type: "roll", accept: [3.1, 3.18], solution: 3.14 };
    assert.ok(check(roll, 3.14) && check(roll, 3.1));
    assert.ok(!check(roll, 3) && !check(roll, 1));

    const order = { type: "order", items: [3, 7, 2, 5, 3], solution: [2, 3, 3, 5, 7] };
    assert.ok(check(order, [2, 3, 3, 5, 7]));
    assert.ok(!check(order, [3, 7, 2, 5, 3]) && !check(order, [7, 5, 3, 3, 2]));

    const signs = { type: "signs", terms: ["a²", "2ab", "b²"], solution: ["+", "−", "+"] };
    assert.ok(check(signs, ["+", "−", "+"]));
    assert.ok(!check(signs, ["+", "+", "+"]) && !check(signs, ["−", "−", "−"]));

    const move = { type: "move", left: ["5x", "−3"], right: ["2x", "9"] };
    assert.ok(check(move, ["L", "R", "L", "R"]));
    assert.ok(!check(move, ["L", "L", "R", "R"]), "nothing moved");
    assert.ok(!check(move, ["L", "R", "R", "R"]), "only the number moved");

    const sticks = { type: "sticks", a: 3, b: 4, max: 10, solution: 6 };
    assert.ok(check(sticks, 6) && !check(sticks, 7));

    const table = { type: "table", k: 2, b: -1, xs: [-1, 0, 1, 2], solution: [-3, -1, 1, 3] };
    assert.ok(check(table, [-3, -1, 1, 3]));
    assert.ok(!check(table, [-1, 0, 1, 2]) && !check(table, [-3, -1, 1]));

    const enter = { type: "enter", solution: 10201 };
    assert.ok(check(enter, 10201) && !check(enter, 10001));

    const isosceles = { type: "triangle-sum", angles: { A: null, B: null, C: 40 }, solution: 70 };
    assert.ok(check(isosceles, 70) && !check(isosceles, 140));

    const ray = { type: "ray", solution: { at: -2, dir: ">", closed: true } };
    assert.ok(check(ray, { at: -2, dir: ">", closed: true }));
    assert.ok(!check(ray, { at: -2, dir: ">", closed: false }), "open point instead of a filled one");
    assert.ok(!check(ray, { at: -2, dir: "<", closed: true }), "the sign was not flipped");
    assert.ok(!check(ray, { at: 2, dir: ">", closed: true }));

    const vertex = { type: "parabola", b: -4, roots: 1, solution: 4 };
    assert.ok(check(vertex, 4) && !check(vertex, 3) && !check(vertex, 5));

    const words = { type: "words", tokens: ["Он", "по-моему", "вряд ли", "придёт."], solution: [1] };
    assert.ok(check(words, [1]) && !check(words, [2]) && !check(words, [1, 2]));

    const punct = { type: "punct", tokens: ["Он", "конечно", "придёт."], solution: { 0: ",", 1: "," } };
    assert.ok(check(punct, { 0: ",", 1: "," }));
    assert.ok(!check(punct, { 0: "," }), "one comma is missing");
    assert.ok(!check(punct, { 0: ",", 1: "—" }), "wrong mark");

    const choice = { type: "choice", options: ["снежок", "снять", "подснежник", "смех"], solution: [0, 2] };
    assert.ok(check(choice, [2, 0]) && !check(choice, [0]) && !check(choice, [0, 1, 2]));

    const sort = { type: "sort", items: ["вода", "корова", "гора"], solution: [0, 1, 0] };
    assert.ok(check(sort, [0, 1, 0]) && !check(sort, [0, 0, 0]));

    assert.ok(!check({ type: "no-such-type", solution: 1 }, 1));
  });

  test("XP comes from the best score, finished lessons and watched videos; levels grow", () => {
    const { computeXp, levelFor, maxXp, XP } = IntStore;
    const empty = { best: {}, completed: [], watched: [] };
    assert.strictEqual(computeXp(empty, LESSONS), 0);
    const four = LESSONS.find((l) => l.id === "math-7-2");
    const state = { best: { "math-7-2": 4, "no-such-lesson": 9 }, completed: ["math-7-2"], watched: ["math-7-2"] };
    assert.strictEqual(computeXp(state, LESSONS), 4 * XP.perAnswer + XP.perLesson + XP.perVideo);
    // a best score can never count more answers than the quiz has
    assert.strictEqual(computeXp({ ...empty, best: { "math-7-2": 99 } }, LESSONS), four.quiz.length * XP.perAnswer);

    assert.deepStrictEqual([0, 99, 100, 299, 300, 600].map((xp) => levelFor(xp).level), [1, 1, 2, 2, 3, 4]);
    const l2 = levelFor(150);
    assert.strictEqual(l2.from, 100);
    assert.strictEqual(l2.to, 300);
    assert.ok(Math.abs(l2.progress - 0.25) < 1e-9);
    // the database accepts at most 10000 XP (supabase/leaderboard.sql)
    assert.ok(maxXp(LESSONS) <= 10000, `max XP ${maxXp(LESSONS)} is above the database limit`);
  });

  test("Leaderboard nicknames are 2–20 letters, digits, spaces, _ or -", () => {
    const { cleanName } = IntStore;
    assert.strictEqual(cleanName("  Маша_7Б  "), "Маша_7Б");
    assert.strictEqual(cleanName("Petya   Ivanov"), "Petya Ivanov");
    assert.strictEqual(cleanName("a"), null);
    assert.strictEqual(cleanName("x".repeat(21)), null);
    assert.strictEqual(cleanName("<script>"), null);
    assert.strictEqual(cleanName(""), null);
  });

  test("All grades 5–9 have at least 4 math and 4 russian lessons", () => {
    ["5", "6", "7", "8", "9"].forEach((grade) => {
      const mathLessons = LESSONS.filter((l) => l.subject === "math" && l.grade === grade);
      const rusLessons = LESSONS.filter((l) => l.subject === "russian" && l.grade === grade);
      assert.ok(mathLessons.length >= 4, `Grade ${grade} math count is ${mathLessons.length}`);
      assert.ok(rusLessons.length >= 4, `Grade ${grade} russian count is ${rusLessons.length}`);
    });
  });

  test("Search query matches expected keywords across math and russian", () => {
    const mathMatch = LESSONS.filter((l) => l.title.toLowerCase().includes("дискриминант") || l.topic.toLowerCase().includes("квадратные"));
    assert.ok(mathMatch.length >= 1, "Should find discriminant lesson");

    const rusMatch = LESSONS.filter((l) => l.title.toLowerCase().includes("причастн") || l.topic.toLowerCase().includes("причастие"));
    assert.ok(rusMatch.length >= 1, "Should find participle lesson");
  });
});
