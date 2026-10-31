import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BODY, C, DISPLAY, colorOf } from "./theme";

/*
 * The pictures a lesson script can show. Each scene gets `speak` — how many frames its narration
 * lasts — and spreads its own reveals over that time, so the picture moves with the voice.
 *
 * Text anywhere may use **accent**, ==marker== and ~~wrong~~ (struck out in red).
 */
export type SceneSpec =
  | { type: "title"; title: string; subtitle?: string; icons?: string[] }
  | { type: "question"; label?: string; text: string; big?: string; icons?: string[] }
  | { type: "text"; lines: string[]; big?: boolean }
  | { type: "steps"; title?: string; items: string[] }
  | { type: "math"; title?: string; lines: string[] }
  | { type: "rule"; title?: string; text: string; example?: string }
  | { type: "trap"; title?: string; wrong: string; right: string; why?: string }
  | { type: "numberline"; title?: string; from: number; to: number; step?: number; points?: { at: number; label?: string; color?: string }[]; hops?: { from: number; to: number; label?: string }[]; segment?: { from: number; to: number; open?: [boolean, boolean] } }
  | { type: "shape"; title?: string; caption?: string; items: ShapeItem[] }
  | { type: "bars"; title?: string; bars: { label: string; value: number; color?: string }[]; unit?: string }
  | { type: "table"; title?: string; head: string[]; rows: string[][] }
  | { type: "fraction"; title?: string; shape?: "pie" | "bar"; parts: number; shaded: number; color?: string; caption?: string }
  | { type: "objects"; title?: string; icon: string; count: number; groups?: number; caption?: string };

type Pt = [number, number];
export type ShapeItem =
  | { poly: Pt[]; fill?: string; stroke?: string; closed?: boolean }
  | { circle: Pt; r: number; fill?: string; stroke?: string }
  | { seg: [Pt, Pt]; stroke?: string; dash?: boolean }
  | { label: string; at: Pt; color?: string; size?: number }
  | { arc: Pt; r: number; from: number; to: number; stroke?: string; label?: string };

// ------------------------------------------------------------------ helpers
const useAppear = (at: number, speed = 14) => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: f - at, fps, config: { damping: speed, mass: 0.6 } });
};

// when item i of n shows up: spread over the first ~80 % of the narration
const revealAt = (i: number, n: number, speak: number) => Math.round((i / Math.max(1, n)) * speak * 0.8);

export const Rich: React.FC<{ text: string }> = ({ text }) => {
  const parts = String(text).split(/(\*\*[^*]+\*\*|==[^=]+==|~~[^~]+~~)/g).filter(Boolean);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**")) return <span key={i} style={{ color: C.accent, fontWeight: 700 }}>{p.slice(2, -2)}</span>;
        if (p.startsWith("==")) return <span key={i} style={{ background: C.mustardSoft, boxShadow: `inset 0 -0.35em 0 ${C.mustard}55`, padding: "0 0.12em", borderRadius: 6 }}>{p.slice(2, -2)}</span>;
        if (p.startsWith("~~")) return <span key={i} style={{ color: C.red, textDecoration: "line-through", textDecorationThickness: 4 }}>{p.slice(2, -2)}</span>;
        return <span key={i}>{p}</span>;
      })}
    </>
  );
};

const Stage: React.FC<{ title?: string; children: React.ReactNode }> = ({ title, children }) => {
  const a = useAppear(0);
  return (
    <AbsoluteFill style={{ padding: "96px 80px 56px", display: "flex", flexDirection: "column", gap: 22 }}>
      {title ? (
        <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 40, lineHeight: 1.15, opacity: a, transform: `translateY(${(1 - a) * 12}px)` }}>
          <Rich text={title} />
        </div>
      ) : null}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 0 }}>{children}</div>
    </AbsoluteFill>
  );
};

const Card: React.FC<{ tone?: "accent" | "teal" | "red" | "mustard"; children: React.ReactNode; style?: React.CSSProperties }> = ({ tone = "accent", children, style }) => {
  const border = { accent: C.accent, teal: C.teal, red: C.red, mustard: C.mustard }[tone];
  return (
    <div style={{ background: C.white, border: `3px solid ${border}`, borderRadius: 28, padding: "28px 36px", boxShadow: "0 18px 40px -24px rgba(11,18,32,.35)", ...style }}>
      {children}
    </div>
  );
};

const Icons: React.FC<{ icons?: string[]; at?: number }> = ({ icons, at = 0 }) => (
  <div style={{ display: "flex", gap: 18, justifyContent: "center" }}>
    {(icons || []).map((ic, i) => {
      const a = useAppear(at + i * 5, 10);
      return <span key={i} style={{ fontSize: 84, transform: `scale(${a}) rotate(${(1 - a) * -20}deg)`, display: "inline-block" }}>{ic}</span>;
    })}
  </div>
);

// ------------------------------------------------------------------ scenes
const Title: React.FC<Extract<SceneSpec, { type: "title" }>> = ({ title, subtitle, icons }) => {
  const a = useAppear(0, 12);
  const b = useAppear(10);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 28, padding: "0 90px", textAlign: "center" }}>
      <Icons icons={icons} at={4} />
      <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 66, lineHeight: 1.1, transform: `scale(${0.9 + a * 0.1})`, opacity: a }}>
        <Rich text={title} />
      </div>
      {subtitle ? <div style={{ fontSize: 32, color: C.soft, opacity: b }}><Rich text={subtitle} /></div> : null}
    </AbsoluteFill>
  );
};

const Question: React.FC<Extract<SceneSpec, { type: "question" }> & { speak: number }> = ({ label = "Задачка", text, big, icons, speak }) => {
  const a = useAppear(0);
  const q = useAppear(Math.round(speak * 0.55), 9);
  return (
    <Stage>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26, textAlign: "center" }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 24, fontWeight: 700, letterSpacing: 2, color: C.white, background: C.accent, padding: "8px 22px", borderRadius: 999, opacity: a }}>
          {label.toUpperCase()}
        </div>
        <Icons icons={icons} at={6} />
        {big ? <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 96, color: C.accent, transform: `scale(${0.6 + useAppear(8) * 0.4})` }}><Rich text={big} /></div> : null}
        <div style={{ fontSize: 42, fontWeight: 600, lineHeight: 1.3, maxWidth: 1000, opacity: a }}><Rich text={text} /></div>
        <div style={{ fontFamily: DISPLAY, fontSize: 120, color: C.mustard, transform: `scale(${q})`, height: 110, lineHeight: 1 }}>?</div>
      </div>
    </Stage>
  );
};

const Text: React.FC<Extract<SceneSpec, { type: "text" }> & { speak: number }> = ({ lines, big, speak }) => (
  <Stage>
    <div style={{ display: "flex", flexDirection: "column", gap: 26, alignItems: "center", textAlign: "center" }}>
      {lines.map((l, i) => {
        const a = useAppear(revealAt(i, lines.length, speak));
        return (
          <div key={i} style={{ fontSize: big ? 64 : 46, fontFamily: big ? DISPLAY : BODY, fontWeight: big ? 700 : 600, lineHeight: 1.25, opacity: a, transform: `translateY(${(1 - a) * 22}px)` }}>
            <Rich text={l} />
          </div>
        );
      })}
    </div>
  </Stage>
);

const Steps: React.FC<Extract<SceneSpec, { type: "steps" }> & { speak: number }> = ({ title, items, speak }) => (
  <Stage title={title}>
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {items.map((it, i) => {
        const a = useAppear(revealAt(i, items.length, speak));
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 22, opacity: a, transform: `translateX(${(1 - a) * -40}px)` }}>
            <div style={{ flex: "none", width: 58, height: 58, borderRadius: 18, background: C.accent, color: C.white, fontFamily: DISPLAY, fontSize: 28, display: "grid", placeItems: "center" }}>{i + 1}</div>
            <div style={{ fontSize: 38, fontWeight: 600, lineHeight: 1.25 }}><Rich text={it} /></div>
          </div>
        );
      })}
    </div>
  </Stage>
);

const MathLines: React.FC<Extract<SceneSpec, { type: "math" }> & { speak: number }> = ({ title, lines, speak }) => (
  <Stage title={title}>
    <Card style={{ alignSelf: "center", minWidth: 760 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
        {lines.map((l, i) => {
          const a = useAppear(revealAt(i, lines.length, speak));
          return (
            <div key={i} style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 52, opacity: a, transform: `translateY(${(1 - a) * 18}px)`, whiteSpace: "nowrap" }}>
              <Rich text={l} />
            </div>
          );
        })}
      </div>
    </Card>
  </Stage>
);

const Rule: React.FC<Extract<SceneSpec, { type: "rule" }> & { speak: number }> = ({ title = "Правило", text, example, speak }) => {
  const a = useAppear(0, 11);
  const e = useAppear(Math.round(speak * 0.6));
  return (
    <Stage>
      <Card tone="teal" style={{ transform: `scale(${0.92 + a * 0.08})`, opacity: a }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 700, color: C.teal, letterSpacing: 2, marginBottom: 14 }}>{title.toUpperCase()}</div>
        <div style={{ fontSize: 42, fontWeight: 600, lineHeight: 1.3 }}><Rich text={text} /></div>
        {example ? <div style={{ marginTop: 22, fontFamily: DISPLAY, fontSize: 40, color: C.accent, opacity: e }}><Rich text={example} /></div> : null}
      </Card>
    </Stage>
  );
};

const Trap: React.FC<Extract<SceneSpec, { type: "trap" }> & { speak: number }> = ({ title = "Ловушка", wrong, right, why, speak }) => {
  const a = useAppear(0);
  const b = useAppear(Math.round(speak * 0.4));
  const c = useAppear(Math.round(speak * 0.7));
  return (
    <Stage>
      <div style={{ display: "flex", flexDirection: "column", gap: 22, alignItems: "center" }}>
        <div style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 700, color: C.white, background: C.red, padding: "8px 22px", borderRadius: 999, letterSpacing: 2, opacity: a }}>⚠ {title.toUpperCase()}</div>
        <div style={{ display: "flex", gap: 30 }}>
          <Card tone="red" style={{ opacity: a, transform: `rotate(${(1 - a) * -4}deg)` }}>
            <div style={{ fontSize: 22, color: C.red, fontWeight: 700 }}>✕ НЕВЕРНО</div>
            <div style={{ fontFamily: DISPLAY, fontSize: 44, marginTop: 8 }}><Rich text={wrong} /></div>
          </Card>
          <Card tone="teal" style={{ opacity: b, transform: `scale(${0.85 + b * 0.15})` }}>
            <div style={{ fontSize: 22, color: C.teal, fontWeight: 700 }}>✓ ВЕРНО</div>
            <div style={{ fontFamily: DISPLAY, fontSize: 44, marginTop: 8 }}><Rich text={right} /></div>
          </Card>
        </div>
        {why ? <div style={{ fontSize: 34, color: C.soft, fontWeight: 600, textAlign: "center", opacity: c, maxWidth: 1000 }}><Rich text={why} /></div> : null}
      </div>
    </Stage>
  );
};

const fmt = (n: number) => String(n).replace(".", ",").replace("-", "−");

const NumberLine: React.FC<Extract<SceneSpec, { type: "numberline" }> & { speak: number }> = ({ title, from, to, step = 1, points = [], hops = [], segment, speak }) => {
  const f = useCurrentFrame();
  const W = 1080, X0 = 20, X1 = W - 20, Y = 150;
  const x = (v: number) => X0 + ((v - from) / (to - from)) * (X1 - X0);
  const ticks: number[] = [];
  for (let v = from; v <= to + 1e-9; v += step) ticks.push(Math.round(v * 1000) / 1000);
  const line = interpolate(f, [0, 18], [0, 1], { extrapolateRight: "clamp" });
  const events = hops.length + points.length + (segment ? 1 : 0);
  let k = 0;
  return (
    <Stage title={title}>
      <svg viewBox={`0 0 ${W} 260`} style={{ width: "100%", overflow: "visible" }}>
        <line x1={X0} y1={Y} x2={X0 + (X1 - X0) * line} y2={Y} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
        <polygon points={`${X1 + 18},${Y} ${X1},${Y - 10} ${X1},${Y + 10}`} fill={C.ink} opacity={line} />
        {ticks.map((v, i) => (
          <g key={i} opacity={interpolate(f, [i, i + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}>
            <line x1={x(v)} y1={Y - 12} x2={x(v)} y2={Y + 12} stroke={C.ink} strokeWidth={3} />
            <text x={x(v)} y={Y + 52} textAnchor="middle" fontFamily={DISPLAY} fontSize={28} fill={C.soft}>{fmt(v)}</text>
          </g>
        ))}
        {segment ? (() => {
          const at = 20 + revealAt(k++, events, speak);
          const p = interpolate(f, [at, at + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const a = x(segment.from), b = x(segment.to);
          return (
            <g opacity={p}>
              <line x1={a} y1={Y} x2={a + (b - a) * p} y2={Y} stroke={C.teal} strokeWidth={14} strokeLinecap="round" opacity={0.75} />
              {[segment.from, segment.to].map((v, i) => (
                <circle key={i} cx={x(v)} cy={Y} r={12} fill={segment.open?.[i] ? C.white : C.teal} stroke={C.teal} strokeWidth={5} />
              ))}
            </g>
          );
        })() : null}
        {hops.map((h, i) => {
          const at = 20 + revealAt(k++, events, speak);
          const p = interpolate(f, [at, at + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          const a = x(h.from), b = x(h.to), mid = (a + b) / 2, hgt = Math.min(90, Math.abs(b - a) * 0.6 + 20);
          const len = Math.abs(b - a) * 1.6 + 60;
          return (
            <g key={i} opacity={p > 0 ? 1 : 0}>
              <path d={`M${a},${Y - 16} Q${mid},${Y - 16 - hgt * 2} ${b},${Y - 16}`} fill="none" stroke={C.accent} strokeWidth={5} strokeDasharray={len} strokeDashoffset={len * (1 - p)} />
              {h.label ? <text x={mid} y={Y - 26 - hgt} textAnchor="middle" fontFamily={DISPLAY} fontSize={30} fill={C.accent} opacity={p}>{h.label}</text> : null}
            </g>
          );
        })}
        {points.map((p, i) => {
          const at = 20 + revealAt(k++, events, speak);
          const s = spring({ frame: f - at, fps: 30, config: { damping: 9 } });
          return (
            <g key={i} transform={`translate(${x(p.at)},${Y}) scale(${s})`}>
              <circle r={15} fill={colorOf(p.color)} stroke={C.white} strokeWidth={4} />
              {p.label ? <text y={-30} textAnchor="middle" fontFamily={DISPLAY} fontWeight={700} fontSize={32} fill={colorOf(p.color)}>{p.label}</text> : null}
            </g>
          );
        })}
      </svg>
    </Stage>
  );
};

// figures in a 0..100 × 0..60 box; each item draws itself in turn
const Shape: React.FC<Extract<SceneSpec, { type: "shape" }> & { speak: number }> = ({ title, caption, items, speak }) => {
  const f = useCurrentFrame();
  const S = 10; // 1 unit = 10 px
  const cap = useAppear(Math.round(speak * 0.75));
  return (
    <Stage title={title}>
      <svg viewBox="-20 -20 1040 640" style={{ width: "100%", height: "100%", maxHeight: 470, overflow: "visible" }}>
        {items.map((it, i) => {
          const at = revealAt(i, items.length, speak);
          const p = interpolate(f, [at, at + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          if ("poly" in it) {
            const pts = it.poly.map(([a, b]) => `${a * S},${b * S}`).join(" ");
            let len = 0;
            it.poly.forEach((q, j) => { const n = it.poly[(j + 1) % it.poly.length]; if (j < it.poly.length - 1 || it.closed !== false) len += Math.hypot(n[0] - q[0], n[1] - q[1]) * S; });
            const Tag = it.closed === false ? "polyline" : "polygon";
            return <Tag key={i} points={pts} fill={it.fill ? colorOf(it.fill) : "none"} fillOpacity={it.fill ? 0.25 * p : 0} stroke={colorOf(it.stroke || "ink")} strokeWidth={6} strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - p)} />;
          }
          if ("circle" in it) {
            const len = 2 * Math.PI * it.r * S;
            // a small circle is a point: solid, not a tinted ring
            const dot = it.r <= 2;
            return <circle key={i} cx={it.circle[0] * S} cy={it.circle[1] * S} r={it.r * S} fill={it.fill ? colorOf(it.fill) : "none"} fillOpacity={it.fill ? (dot ? p : 0.22 * p) : 0} stroke={colorOf(it.stroke || "ink")} strokeWidth={6} strokeDasharray={len} strokeDashoffset={len * (1 - p)} />;
          }
          if ("seg" in it) {
            const [[x1, y1], [x2, y2]] = it.seg;
            return <line key={i} x1={x1 * S} y1={y1 * S} x2={(x1 + (x2 - x1) * p) * S} y2={(y1 + (y2 - y1) * p) * S} stroke={colorOf(it.stroke || "accent")} strokeWidth={6} strokeLinecap="round" strokeDasharray={it.dash ? "14 12" : undefined} />;
          }
          if ("arc" in it) {
            const [cx, cy] = it.arc, r = it.r * S;
            const a0 = (it.from * Math.PI) / 180, a1 = ((it.from + (it.to - it.from) * p) * Math.PI) / 180;
            const P = (a: number) => `${cx * S + r * Math.cos(a)},${cy * S - r * Math.sin(a)}`;
            const large = Math.abs(it.to - it.from) * p > 180 ? 1 : 0;
            const mid = (a0 + a1) / 2;
            return (
              <g key={i}>
                <path d={`M${P(a0)} A${r},${r} 0 ${large} 0 ${P(a1)}`} fill="none" stroke={colorOf(it.stroke || "mustard")} strokeWidth={6} />
                {it.label ? <text x={cx * S + (r + 34) * Math.cos(mid)} y={cy * S - (r + 34) * Math.sin(mid) + 12} textAnchor="middle" fontFamily={DISPLAY} fontSize={34} fill={colorOf(it.stroke || "mustard")} opacity={p}>{it.label}</text> : null}
              </g>
            );
          }
          return (
            <text key={i} x={it.at[0] * S} y={it.at[1] * S} textAnchor="middle" fontFamily={DISPLAY} fontWeight={700} fontSize={it.size || 38} fill={colorOf(it.color || "ink")} opacity={p}>
              {it.label}
            </text>
          );
        })}
      </svg>
      {caption ? <div style={{ textAlign: "center", fontSize: 36, fontWeight: 600, opacity: cap }}><Rich text={caption} /></div> : null}
    </Stage>
  );
};

const Bars: React.FC<Extract<SceneSpec, { type: "bars" }> & { speak: number }> = ({ title, bars, unit = "", speak }) => {
  const f = useCurrentFrame();
  const max = Math.max(...bars.map((b) => b.value));
  return (
    <Stage title={title}>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 46, height: 400 }}>
        {bars.map((b, i) => {
          const at = revealAt(i, bars.length, speak);
          const p = interpolate(f, [at, at + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <div style={{ fontFamily: DISPLAY, fontSize: 32, opacity: p }}>{fmt(b.value)}{unit}</div>
              <div style={{ width: 110, height: (300 * b.value * p) / max, background: colorOf(b.color || ["accent", "teal", "mustard", "red"][i % 4]), borderRadius: "14px 14px 0 0" }} />
              <div style={{ fontSize: 28, fontWeight: 600, color: C.soft }}>{b.label}</div>
            </div>
          );
        })}
      </div>
    </Stage>
  );
};

const Table: React.FC<Extract<SceneSpec, { type: "table" }> & { speak: number }> = ({ title, head, rows, speak }) => (
  <Stage title={title}>
    <Card style={{ alignSelf: "center", padding: 0, overflow: "hidden" }}>
      <table style={{ borderCollapse: "collapse", fontSize: 36, fontFamily: DISPLAY }}>
        <thead>
          <tr>{head.map((h, i) => <th key={i} style={{ padding: "16px 34px", background: C.accentSoft, color: C.accent, fontWeight: 700 }}><Rich text={h} /></th>)}</tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const a = useAppear(revealAt(i, rows.length, speak));
            return <tr key={i} style={{ opacity: a }}>{r.map((c, j) => <td key={j} style={{ padding: "14px 34px", borderTop: `2px solid ${C.grid}`, textAlign: "center", fontWeight: 600 }}><Rich text={c} /></td>)}</tr>;
          })}
        </tbody>
      </table>
    </Card>
  </Stage>
);

const Fraction: React.FC<Extract<SceneSpec, { type: "fraction" }> & { speak: number }> = ({ title, shape = "pie", parts, shaded, color, caption, speak }) => {
  const f = useCurrentFrame();
  const cap = useAppear(Math.round(speak * 0.7));
  const fill = colorOf(color || "mustard");
  const on = (k: number) => interpolate(f, [12 + k * 8, 20 + k * 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <Stage title={title}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26 }}>
        {shape === "pie" ? (
          <svg viewBox="-110 -110 220 220" style={{ height: 360 }}>
            {Array.from({ length: parts }, (_, k) => {
              const a0 = (2 * Math.PI * k) / parts - Math.PI / 2, a1 = (2 * Math.PI * (k + 1)) / parts - Math.PI / 2;
              const d = parts === 1 ? "M-100,0 a100,100 0 1,0 200,0 a100,100 0 1,0 -200,0" : `M0,0 L${100 * Math.cos(a0)},${100 * Math.sin(a0)} A100,100 0 ${a1 - a0 > Math.PI ? 1 : 0},1 ${100 * Math.cos(a1)},${100 * Math.sin(a1)} Z`;
              return <path key={k} d={d} fill={k < shaded ? fill : C.white} fillOpacity={k < shaded ? on(k) : 1} stroke={C.ink} strokeWidth={3} />;
            })}
          </svg>
        ) : (
          <svg viewBox={`0 0 ${parts * 100} 100`} style={{ width: 980, height: 150 }}>
            {Array.from({ length: parts }, (_, k) => (
              <rect key={k} x={k * 100 + 2} y={2} width={96} height={96} rx={10} fill={k < shaded ? fill : C.white} fillOpacity={k < shaded ? on(k) : 1} stroke={C.ink} strokeWidth={3} />
            ))}
          </svg>
        )}
        {caption ? <div style={{ fontFamily: DISPLAY, fontSize: 48, opacity: cap }}><Rich text={caption} /></div> : null}
      </div>
    </Stage>
  );
};

const Objects: React.FC<Extract<SceneSpec, { type: "objects" }> & { speak: number }> = ({ title, icon, count, groups = 1, caption, speak }) => {
  const per = Math.ceil(count / groups);
  const cap = useAppear(Math.round(speak * 0.7));
  // groups are the rows of a box: 12 in 3 groups is a box of 3 rows by 4
  const size = per > 12 ? 44 : count > 24 ? 48 : 64;
  return (
    <Stage title={title}>
      <div style={{ alignSelf: "center", display: "flex", flexDirection: "column", gap: 10, padding: "18px 26px", background: C.white, border: `4px solid ${C.mustard}`, borderRadius: 26 }}>
        {Array.from({ length: groups }, (_, g) => (
          <div key={g} style={{ display: "flex", gap: 8, justifyContent: "flex-start", padding: "4px 10px", borderBottom: g < groups - 1 ? `3px dashed ${C.grid}` : "none" }}>
            {Array.from({ length: Math.min(per, count - g * per) }, (_, k) => {
              const i = g * per + k;
              const a = useAppear(Math.round((i / count) * speak * 0.5), 9);
              return <span key={k} style={{ fontSize: size, lineHeight: 1.1, transform: `scale(${a})`, display: "inline-block" }}>{icon}</span>;
            })}
          </div>
        ))}
      </div>
      {caption ? <div style={{ textAlign: "center", fontFamily: DISPLAY, fontSize: 44, marginTop: 24, opacity: cap }}><Rich text={caption} /></div> : null}
    </Stage>
  );
};

export const Scene: React.FC<{ show: SceneSpec; speak: number }> = ({ show, speak }) => {
  switch (show.type) {
    case "title": return <Title {...show} />;
    case "question": return <Question {...show} speak={speak} />;
    case "text": return <Text {...show} speak={speak} />;
    case "steps": return <Steps {...show} speak={speak} />;
    case "math": return <MathLines {...show} speak={speak} />;
    case "rule": return <Rule {...show} speak={speak} />;
    case "trap": return <Trap {...show} speak={speak} />;
    case "numberline": return <NumberLine {...show} speak={speak} />;
    case "shape": return <Shape {...show} speak={speak} />;
    case "bars": return <Bars {...show} speak={speak} />;
    case "table": return <Table {...show} speak={speak} />;
    case "fraction": return <Fraction {...show} speak={speak} />;
    case "objects": return <Objects {...show} speak={speak} />;
    default: return null;
  }
};
