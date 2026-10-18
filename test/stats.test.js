const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const S = require("../js/stats.js");
const { LESSONS } = require("../js/lessons.js");

test("track validates kind, lesson id, question and result", () => {
  assert.ok(S.valid("answer", "math-5-3", 2, 1));
  assert.ok(S.valid("quiz_end", "rus-9-12", 4, 0));
  assert.ok(!S.valid("nope", "math-5-3", 0, 0));
  assert.ok(!S.valid("answer", "math-5-3; drop", 0, 0));
  assert.ok(!S.valid("answer", "math-5-3", 11, 0));
  assert.ok(!S.valid("answer", "math-5-3", 0, 3));
});

test("every lesson id is accepted by the database's lesson pattern", () => {
  const sql = fs.readFileSync(path.join(__dirname, "../supabase/admin.sql"), "utf8");
  assert.ok(sql.includes("'^(math|rus)-[5-9]-[0-9]{1,2}$'"));
  for (const l of LESSONS) assert.ok(S.valid("video_start", l.id, 0, 0), l.id);
  for (const l of LESSONS) assert.ok(l.quiz.length <= 11, l.id);
});

test("perLesson and hardest aggregate the counters", () => {
  const total = [
    { kind: "video_start", lesson: "math-5-1", q: 0, val: 0, n: 10 },
    { kind: "video_end", lesson: "math-5-1", q: 0, val: 0, n: 6 },
    { kind: "quiz_end", lesson: "math-5-1", q: 4, val: 0, n: 2 },
    { kind: "quiz_end", lesson: "math-5-1", q: 2, val: 0, n: 2 },
    { kind: "answer", lesson: "math-5-1", q: 0, val: 1, n: 6 },
    { kind: "answer", lesson: "math-5-1", q: 0, val: 0, n: 2 },
    { kind: "answer", lesson: "math-5-1", q: 1, val: 0, n: 5 },
    { kind: "answer", lesson: "math-5-1", q: 1, val: 2, n: 1 },
    { kind: "answer", lesson: "math-5-2", q: 0, val: 0, n: 2 },
  ];
  const by = S.perLesson(total);
  assert.equal(by["math-5-1"].video_start, 10);
  assert.equal(by["math-5-1"].avg, 3);
  assert.equal(by["math-5-2"].avg, null);
  assert.deepEqual(by["math-5-1"].questions.map((q) => [q.q, q.seen, q.missed, q.second]), [[0, 8, 2, 0], [1, 6, 5, 1]]);
  const hard = S.hardest(by, 5);
  assert.deepEqual(hard.map((r) => [r.lesson, r.q]), [["math-5-1", 1], ["math-5-1", 0]]);
});

test("the admin secret never appears in the site's files", () => {
  const root = path.join(__dirname, "..");
  for (const f of ["js/admin.js", "js/stats.js", "js/store.js", "admin/index.html"]) {
    const src = fs.readFileSync(path.join(root, f), "utf8");
    assert.ok(!/secret_hash\s*=|digest\(/.test(src), f);
  }
});
