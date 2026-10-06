const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const { LESSONS, SUBJECT_LABELS } = require("../js/lessons.js");

describe("Lessons Dataset Validation", () => {
  test("LESSONS array contains 40 rich curriculum lessons", () => {
    assert.ok(Array.isArray(LESSONS));
    assert.strictEqual(LESSONS.length, 40, `Expected 40 lessons, got ${LESSONS.length}`);
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

  test("Every lesson has title, description, takeaway rule, and YouTube videoId", () => {
    LESSONS.forEach((lesson) => {
      assert.ok(lesson.title && lesson.title.length >= 5, `Invalid title in ${lesson.id}`);
      assert.ok(lesson.description && lesson.description.length >= 10, `Invalid description in ${lesson.id}`);
      assert.ok(lesson.takeaway && lesson.takeaway.length >= 10, `Invalid takeaway rule in ${lesson.id}`);
      assert.ok(lesson.videoId && lesson.videoId.length === 11, `Invalid videoId in ${lesson.id}: ${lesson.videoId}`);
    });
  });

  test("Every lesson has a valid quiz with questions, options, answer index, and explanation", () => {
    LESSONS.forEach((lesson) => {
      assert.ok(Array.isArray(lesson.quiz) && lesson.quiz.length > 0, `Lesson ${lesson.id} has no quiz`);
      lesson.quiz.forEach((q, qIndex) => {
        assert.ok(q.question && q.question.length > 5, `Invalid quiz question in ${lesson.id}[${qIndex}]`);
        assert.ok(Array.isArray(q.options) && q.options.length >= 2, `Invalid options in ${lesson.id}[${qIndex}]`);
        assert.ok(
          Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length,
          `Answer index ${q.answer} out of bounds for options length ${q.options.length} in ${lesson.id}[${qIndex}]`
        );
        assert.ok(q.explanation && q.explanation.length > 5, `Missing explanation in ${lesson.id}[${qIndex}]`);
      });
    });
  });

  test("All grades 5–9 have exactly 4 math and 4 russian lessons", () => {
    ["5", "6", "7", "8", "9"].forEach((grade) => {
      const mathLessons = LESSONS.filter((l) => l.subject === "math" && l.grade === grade);
      const rusLessons = LESSONS.filter((l) => l.subject === "russian" && l.grade === grade);
      assert.strictEqual(mathLessons.length, 4, `Grade ${grade} math count is ${mathLessons.length}`);
      assert.strictEqual(rusLessons.length, 4, `Grade ${grade} russian count is ${rusLessons.length}`);
    });
  });

  test("Search query matches expected keywords across math and russian", () => {
    const mathMatch = LESSONS.filter((l) => l.title.toLowerCase().includes("дискриминант") || l.topic.toLowerCase().includes("квадратные"));
    assert.ok(mathMatch.length >= 1, "Should find discriminant lesson");

    const rusMatch = LESSONS.filter((l) => l.title.toLowerCase().includes("причастн") || l.topic.toLowerCase().includes("причастие"));
    assert.ok(rusMatch.length >= 1, "Should find participle lesson");
  });
});
