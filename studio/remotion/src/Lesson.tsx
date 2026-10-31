import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, interpolate } from "remotion";
import { C, BODY, DISPLAY, FPS, TAIL } from "./theme";
import { Scene, SceneSpec } from "./scenes";

export type LessonSpec = {
  id: string;
  grade: string;
  title: string;
  topic?: string;
  bg?: "grid" | "dots" | "plain";
  scenes: { say: string; show: SceneSpec }[];
};
export type Timing = { start: number; end: number };
export type LessonProps = { spec: LessonSpec; timings: Timing[]; audio: string | null };

const Background: React.FC<{ kind?: string }> = ({ kind = "grid" }) => (
  <AbsoluteFill
    style={{
      background: C.paper,
      backgroundImage:
        kind === "plain"
          ? undefined
          : kind === "dots"
          ? `radial-gradient(${C.grid} 2px, transparent 2px)`
          : `linear-gradient(${C.grid} 1px, transparent 1px), linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`,
      backgroundSize: kind === "dots" ? "32px 32px" : "48px 48px",
    }}
  />
);

// the brand corner and the lesson's name, the same on every frame
const Frame: React.FC<{ spec: LessonSpec }> = ({ spec }) => (
  <>
    <div style={{ position: "absolute", left: 40, top: 28, fontFamily: DISPLAY, fontWeight: 700, fontSize: 26, color: C.ink }}>
      за минуту<span style={{ color: C.accent }}>.</span>
    </div>
    <div
      style={{
        position: "absolute", right: 40, top: 28, padding: "6px 16px", borderRadius: 999, background: C.white,
        border: `2px solid ${C.grid}`, fontFamily: BODY, fontWeight: 600, fontSize: 20, color: C.soft,
      }}
    >
      {spec.grade} класс · {spec.topic || spec.title}
    </div>
  </>
);

// a thin progress line along the bottom, so the length of the lesson is always visible
const Progress: React.FC<{ total: number }> = ({ total }) => {
  const f = useCurrentFrame();
  return (
    <div style={{ position: "absolute", left: 0, bottom: 0, height: 6, width: `${(f / total) * 100}%`, background: C.accent, opacity: 0.85 }} />
  );
};

export const Lesson: React.FC<LessonProps> = ({ spec, timings, audio }) => {
  const total = Math.ceil(((timings.length ? timings[timings.length - 1].end : 5) + TAIL) * FPS);
  return (
    <AbsoluteFill style={{ fontFamily: BODY, color: C.ink }}>
      <Background kind={spec.bg} />
      {audio ? <Audio src={staticFile(audio)} /> : null}
      {spec.scenes.map((s, i) => {
        const t = timings[i] || { start: i * 4, end: i * 4 + 4 };
        const from = Math.round(t.start * FPS);
        // each picture stays until the next one starts (the last one to the end)
        const next = timings[i + 1] ? Math.round(timings[i + 1].start * FPS) : total;
        const speak = Math.max(1, Math.round((t.end - t.start) * FPS));
        return (
          <Sequence key={i} from={from} durationInFrames={Math.max(1, next - from)} layout="none">
            <SceneFade length={next - from}>
              <Scene show={s.show} speak={speak} />
            </SceneFade>
          </Sequence>
        );
      })}
      <Frame spec={spec} />
      <Progress total={total} />
    </AbsoluteFill>
  );
};

// pictures cross-fade instead of cutting
const SceneFade: React.FC<{ length: number; children: React.ReactNode }> = ({ length, children }) => {
  const f = useCurrentFrame();
  const opacity = interpolate(f, [0, 8, length - 6, length], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const y = interpolate(f, [0, 10], [18, 0], { extrapolateRight: "clamp" });
  return <AbsoluteFill style={{ opacity, transform: `translateY(${y}px)` }}>{children}</AbsoluteFill>;
};
