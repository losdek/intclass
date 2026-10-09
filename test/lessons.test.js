const { test, describe } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { LESSONS, SUBJECT_LABELS } = require("../js/lessons.js");

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
