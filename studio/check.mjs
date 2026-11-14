// node studio/check.mjs [id...] — checks lesson scripts before a build: the same quiz rules as
// test/lessons.test.js (sound tasks, no guessable choices, sorts that use more than one group…)
// plus script basics (a pause scene, a question in it, narration without Latin letters).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const studio = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const IntTasks = require(path.join(studio, "..", "js", "tasks.js"));
const ids = process.argv.slice(2).length
  ? process.argv.slice(2)
  : fs.readdirSync(path.join(studio, "lessons")).map((f) => f.replace(/\.json$/, ""));

let bad = 0;
for (const id of ids) {
  const s = JSON.parse(fs.readFileSync(path.join(studio, "lessons", `${id}.json`), "utf8"));
  const err = (m) => { bad++; console.log(`✕ ${id}: ${m}`); };
  if (!s.slug || !s.site) err("no slug or site");
  if (s.scenes[s.pause ?? 1]?.show.type !== "question") err("the pause scene is not a question");
  s.scenes.forEach((sc, i) => { if (/[A-Za-z]{2,}|\b[A-Z]\b/.test(sc.say)) err(`scene ${i + 1}: Latin letters in the narration`); });
  if (s.site.quiz.length !== 4) err("quiz needs 4 slots");
  s.site.quiz.forEach((slot, si) => {
    const vs = slot.variants || [slot];
    if (vs.length < 2) err(`slot ${si}: fewer than 2 versions`);
    const keys = vs.map(({ explanation, tryHint, ...t }) => JSON.stringify(t));
    if (new Set(keys).size !== keys.length) err(`slot ${si}: two versions are the same`);
    vs.forEach((t, vi) => {
      const at = `slot ${si}.${vi} (${t.type})`;
      if (!IntTasks.TASK_TYPES[t.type]) return err(`${at}: unknown type`);
      if (!t.question || !t.explanation) err(`${at}: no question or explanation`);
      if (!IntTasks.check(t, IntTasks.solutionOf(t))) err(`${at}: its own solution does not pass`);
      if (t.type === "choice" && (t.options.length < 4 || t.solution.length < 2 || t.solution.length >= t.options.length)) err(`${at}: guessable choice`);
      if (t.type === "sort") {
        if (t.solution.length !== t.items.length) err(`${at}: every item needs a group`);
        if (new Set(t.solution).size < 2) err(`${at}: everything in one group`);
        if (t.solution.some((b) => b >= t.buckets.length)) err(`${at}: missing group`);
        if (t.tags && t.tags.length !== t.buckets.length) err(`${at}: tags and groups differ`);
      }
      if (t.type === "enter" && !(Number.isInteger(t.solution) && t.solution >= 0)) err(`${at}: enter needs a whole number ≥ 0`);
      if (t.type === "build") [t.solution, ...(t.alt || [])].forEach((sol) => {
        const pool = [...t.tiles];
        sol.forEach((x) => { const k = pool.indexOf(x); if (k < 0) err(`${at}: tile «${x}» missing`); else pool.splice(k, 1); });
      });
      if (t.type === "gaps" && (t.words.join("").split("_").length - 1 !== t.solution.length || !t.solution.every((l) => t.letters.includes(l)))) err(`${at}: gaps and letters do not fit`);
      ["options", "items", "buckets"].forEach((k) => {
        if (Array.isArray(t[k]) && new Set(t[k]).size !== t[k].length) err(`${at}: repeated entry in ${k}`);
      });
    });
  });
}
console.log(bad ? `${bad} problem(s)` : `ok: ${ids.length} lesson(s)`);
process.exit(bad ? 1 : 0);
