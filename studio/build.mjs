// node studio/build.mjs <lesson-id>... [--force]
// For each lesson script studio/lessons/<id>.json: voice (voice/tts.py) → video (remotion/render.mjs) →
// videos/<slug>.mp4 + videos/posters/<slug>.jpg → the lesson entry in js/lessons.js (added or replaced).
// The in-video pause lands right after the scene named by "pause" (the puzzle question).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const studio = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(studio, "..");
const python = path.join(studio, ".venv", "Scripts", "python.exe");
const TAIL = 1.2; // keep in sync with remotion/src/theme.ts
const force = process.argv.includes("--force");
const ids = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const newer = (a, b) => fs.existsSync(a) && fs.existsSync(b) && fs.statSync(a).mtimeMs > fs.statSync(b).mtimeMs;
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

const lessonsFile = path.join(root, "js", "lessons.js");

function upsert(entry) {
  const src = fs.readFileSync(lessonsFile, "utf8");
  const { LESSONS } = createRequireFresh()(lessonsFile);
  const at = LESSONS.findIndex((l) => l.id === entry.id);
  if (at >= 0) LESSONS[at] = entry;
  else {
    // after the last lesson of the same subject and grade, so the catalogue stays grouped
    let last = -1;
    LESSONS.forEach((l, i) => { if (l.subject === entry.subject && l.grade === entry.grade) last = i; });
    LESSONS.splice(last + 1, 0, entry);
  }
  const end = src.indexOf("\n];");
  fs.writeFileSync(lessonsFile, "const LESSONS = " + JSON.stringify(LESSONS, null, 2) + src.slice(end + 2));
}

// lessons.js is CommonJS and changes after every lesson: load it afresh each time
function createRequireFresh() {
  const req = createRequire(import.meta.url);
  delete req.cache[req.resolve(lessonsFile)];
  return req;
}

for (const id of ids) {
  const t0 = Date.now();
  const specFile = path.join(studio, "lessons", `${id}.json`);
  const spec = JSON.parse(fs.readFileSync(specFile, "utf8"));
  const out = path.join(studio, "out", id);
  const timingsFile = path.join(out, "timings.json");
  if (force || !newer(timingsFile, specFile)) {
    execFileSync(python, [path.join(studio, "voice", "tts.py"), id], { stdio: "inherit", cwd: studio });
  }
  const timings = JSON.parse(fs.readFileSync(timingsFile, "utf8"));
  const p = spec.pause ?? 1;
  const posterAt = (timings.scenes[p].start + timings.scenes[p].end) / 2;
  if (force || !newer(path.join(out, "video.mp4"), timingsFile)) {
    const render = () => execFileSync(process.execPath, [path.join(studio, "remotion", "render.mjs"), id, `--poster-at=${posterAt.toFixed(2)}`], { stdio: "inherit", cwd: path.join(studio, "remotion") });
    // Remotion's temp files sometimes vanish mid-render on Windows: one more try before giving up
    try { render(); } catch (e) { console.log(`${id}: render failed, retrying once`); render(); }
  }
  fs.copyFileSync(path.join(out, "video.mp4"), path.join(root, "videos", `${spec.slug}.mp4`));
  fs.copyFileSync(path.join(out, "poster.jpg"), path.join(root, "videos", "posters", `${spec.slug}.jpg`));

  const s = spec.site;
  upsert({
    id,
    subject: "math",
    grade: spec.grade,
    topic: spec.topic,
    title: s.title,
    description: s.description,
    takeaway: s.takeaway,
    quiz: s.quiz,
    video: {
      src: `videos/${spec.slug}.mp4`,
      poster: `videos/posters/${spec.slug}.jpg`,
      duration: clock(timings.total + TAIL),
      pause: { at: Math.round((timings.scenes[p].end + 0.15) * 100) / 100, question: s.pauseQuestion },
    },
  });
  console.log(`✓ ${id} → videos/${spec.slug}.mp4 (${clock(timings.total + TAIL)}) in ${Math.round((Date.now() - t0) / 1000)} s`);
}
