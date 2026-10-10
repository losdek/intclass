const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { LESSONS, SUBJECT_LABELS } = require("../js/lessons.js");
const IntTasks = require("../js/tasks.js");
const IntStore = require("../js/store.js");

const ROOT = path.join(__dirname, "..");

describe("Lessons Dataset Validation", () => {
  test("LESSONS array contains 45 curriculum lessons", () => {
    assert.ok(Array.isArray(LESSONS));
    assert.strictEqual(LESSONS.length, 45, `Expected 45 lessons, got ${LESSONS.length}`);
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

  test("Optional YouTube ids are well-formed and not reused across lessons", () => {
    const ids = LESSONS.filter((l) => l.videoId).map((l) => l.videoId);
    ids.forEach((id) => assert.match(id, /^[A-Za-z0-9_-]{11}$/, `Invalid videoId ${id}`));
    assert.strictEqual(new Set(ids).size, ids.length, "One YouTube video is attached to several lessons");
  });

  test("Every lesson has a valid quiz with questions, options, answer index, and explanation", () => {
    LESSONS.forEach((lesson) => {
      assert.ok(Array.isArray(lesson.quiz) && lesson.quiz.length > 0, `Lesson ${lesson.id} has no quiz`);
      lesson.quiz.forEach((q, qIndex) => {
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
      assert.ok(lesson.quiz.every((q) => q.type), `${lesson.id} has a question that is not interactive`);
    });
    LESSONS.flatMap((l) => l.quiz.map((q) => [l.id, q])).filter(([, q]) => q.type).forEach(([id, q]) => {
      assert.ok(IntTasks.TASK_TYPES[q.type], `Unknown task type ${q.type} in ${id}`);
      const solution = IntTasks.solutionOf(q);
      assert.ok(solution !== undefined, `Task without solution in ${id}`);
      assert.ok(IntTasks.check(q, solution), `The solution of ${id} (${q.type}) does not pass its own check`);
      assert.strictEqual(IntTasks.check(q, null), false, `Unanswered task counts as correct in ${id}`);
    });
  });

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

    const match = { type: "match", solution: [1, 2, 0] };
    assert.ok(check(match, [1, 2, 0]) && !check(match, [2, 1, 0]));

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
    // the database accepts at most 5000 XP (supabase/leaderboard.sql)
    assert.ok(maxXp(LESSONS) <= 5000, `max XP ${maxXp(LESSONS)} is above the database limit`);
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
