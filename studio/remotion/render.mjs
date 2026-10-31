// node render.mjs <lesson-id> [--poster-at=2.5]
// Renders studio/out/<id>/video.mp4 and poster.jpg from studio/lessons/<id>.json,
// using the voice made by studio/voice/tts.py (studio/out/<id>/voice.wav + timings.json).
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const studio = path.resolve(here, "..");
const id = process.argv[2];
if (!id) throw new Error("usage: node render.mjs <lesson-id>");
const posterAt = Number((process.argv.find((a) => a.startsWith("--poster-at=")) || "=2.5").split("=")[1]);

const spec = JSON.parse(fs.readFileSync(path.join(studio, "lessons", `${id}.json`), "utf8"));
const outDir = path.join(studio, "out", id);
const timings = JSON.parse(fs.readFileSync(path.join(outDir, "timings.json"), "utf8"));

// Remotion serves audio from its public folder
const publicDir = path.join(here, "public");
fs.mkdirSync(path.join(publicDir, "audio"), { recursive: true });
fs.copyFileSync(path.join(outDir, "voice.wav"), path.join(publicDir, "audio", `${id}.wav`));

const inputProps = { spec, timings: timings.scenes, audio: `audio/${id}.wav` };
const serveUrl = await bundle({ entryPoint: path.join(here, "src", "index.ts"), publicDir });
const composition = await selectComposition({ serveUrl, id: "Lesson", inputProps });

await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  crf: 30,
  audioCodec: "aac",
  audioBitrate: "64k",
  inputProps,
  outputLocation: path.join(outDir, "video.mp4"),
  onProgress: ({ progress }) => process.stdout.write(`\r${id}: ${Math.round(progress * 100)}%   `),
});
await renderStill({
  composition,
  serveUrl,
  inputProps,
  frame: Math.min(composition.durationInFrames - 1, Math.round(posterAt * composition.fps)),
  output: path.join(outDir, "poster.jpg"),
  imageFormat: "jpeg",
  jpegQuality: 82,
});
const mb = (fs.statSync(path.join(outDir, "video.mp4")).size / 1e6).toFixed(1);
console.log(`\n${id}: video.mp4 ${mb} MB, ${(composition.durationInFrames / composition.fps).toFixed(1)} s`);
