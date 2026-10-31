import React from "react";
import { Composition } from "remotion";
import { Lesson, LessonProps } from "./Lesson";
import { FPS, TAIL } from "./theme";

// One composition for every lesson: render.mjs passes the lesson script and the voice timings as props.
export const Root: React.FC = () => (
  <Composition
    id="Lesson"
    component={Lesson}
    fps={FPS}
    width={1280}
    height={720}
    durationInFrames={FPS * 10}
    defaultProps={{ spec: { id: "demo", grade: "5", title: "Демо", scenes: [] }, timings: [], audio: null } as LessonProps}
    calculateMetadata={({ props }) => {
      const end = props.timings.length ? props.timings[props.timings.length - 1].end : 5;
      return { durationInFrames: Math.ceil((end + TAIL) * FPS) };
    }}
  />
);
