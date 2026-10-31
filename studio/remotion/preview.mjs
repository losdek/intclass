// node preview.mjs <lesson-id> — one still per scene (near the end of its line) into studio/out/<id>/frames/,
// to check the pictures quickly. Uses the voice timings if they exist, otherwise 6 s per scene.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const studio = path.resolve(here, "..");
const id = process.argv[2];
const spec = JSON.parse(fs.readFileSync(path.join(studio, "lessons", `${id}.json`), "utf8"));
const tfile = path.join(studio, "out", id, "timings.json");
const timings = fs.existsSync(tfile)
  ? JSON.parse(fs.readFileSync(tfile, "utf8")).scenes
  : spec.scenes.map((_, i) => ({ start: i * 6, end: i * 6 + 5.5 }));
const inputProps = { spec, timings, audio: null };
const serveUrl = await bundle({ entryPoint: path.join(here, "src", "index.ts") });
const composition = await selectComposition({ serveUrl, id: "Lesson", inputProps });
const dir = path.join(studio, "out", id, "frames");
fs.mkdirSync(dir, { recursive: true });
for (const [i, t] of timings.entries()) {
  const frame = Math.round((t.start + (t.end - t.start) * 0.92) * composition.fps);
  await renderStill({ composition, serveUrl, inputProps, frame, output: path.join(dir, `scene-${String(i + 1).padStart(2, "0")}.jpg`), imageFormat: "jpeg", jpegQuality: 80 });
  process.stdout.write(`${i + 1} `);
}
console.log(`\n${dir}`);
