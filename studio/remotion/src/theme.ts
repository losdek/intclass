import { loadFont as loadDisplay } from "@remotion/google-fonts/Unbounded";
import { loadFont as loadBody } from "@remotion/google-fonts/Onest";

// the site's own type and colours (css/style.css), so a video looks like part of the page
export const DISPLAY = loadDisplay("normal", { weights: ["600", "700"], subsets: ["cyrillic", "latin"] }).fontFamily;
export const BODY = loadBody("normal", { weights: ["400", "600", "700"], subsets: ["cyrillic", "latin"] }).fontFamily;

export const FPS = 30;
export const TAIL = 1.2; // seconds of the last picture after the voice ends

export const C = {
  paper: "#f7f9fc",
  grid: "#e1e7f0",
  ink: "#0b1220",
  soft: "#475569",
  accent: "#2563eb",
  accentSoft: "#dbeafe",
  teal: "#1e8c78",
  tealSoft: "rgba(30, 140, 120, 0.18)",
  mustard: "#f0b23a",
  mustardSoft: "rgba(240, 178, 58, 0.22)",
  red: "#e1513a",
  redSoft: "rgba(225, 81, 58, 0.14)",
  white: "#ffffff",
};

// named colours a lesson script may use
export const colorOf = (name?: string) =>
  ({ teal: C.teal, mustard: C.mustard, red: C.red, accent: C.accent, blue: C.accent, ink: C.ink, soft: C.soft } as Record<string, string>)[name || "accent"] || name || C.accent;
