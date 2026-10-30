import React from "react";
import { AbsoluteFill, Easing, interpolate, random, spring } from "remotion";
import { useCopy } from "./i18n";
import { C, F } from "./theme";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** House easing: fast out, long settle. */
export const EASE = Easing.bezier(0.16, 1, 0.3, 1);

/** 0→1 over [start, start+duration] with house easing, clamped. */
export const progress = (frame: number, start: number, duration: number) =>
  interpolate(frame, [start, start + duration], [0, 1], { ...clamp, easing: EASE });

/** Spring-driven fade + rise, starting at `start` (scene-local frame). */
export const appear = (frame: number, fps: number, start: number, distance = 28): React.CSSProperties => {
  const p = spring({ frame: frame - start, fps, config: { damping: 200 } });
  return { opacity: p, transform: `translateY(${(1 - p) * distance}px)` };
};

/** Springy pop (≈8 % overshoot) for paper cut-outs landing. Returns 0→1. */
export const pop = (frame: number, fps: number, start: number) =>
  spring({ frame: frame - start, fps, config: { damping: 13, stiffness: 160, mass: 0.8 } });

/** Characters revealed at `frame` for a typewriter starting at `start`. Handles multi-code-unit graphemes. */
export const typed = (text: string, frame: number, start: number, charsPerFrame: number) => {
  const chars = Array.from(text);
  return chars.slice(0, Math.max(0, Math.floor((frame - start) * charsPerFrame))).join("");
};

/** Flat warm-paper background. */
export const Paper: React.FC<{ color?: string }> = ({ color = C.paper }) => (
  <AbsoluteFill style={{ backgroundColor: color }} />
);

/** White paper cut-out: soft shadow, optional rotation. */
export const PaperCard: React.FC<{
  rotate?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ rotate = 0, style, children }) => (
  <div
    style={{
      background: C.white,
      borderRadius: 18,
      boxShadow: "0 2px 0 rgba(28,26,24,0.06), 0 18px 40px -18px rgba(28,26,24,0.35)",
      transform: `rotate(${rotate}deg)`,
      ...style,
    }}
  >
    {children}
  </div>
);

/**
 * Mosaic-tile facade (馬賽克磁磚). Deterministic per `seed`.
 * `reveal` 0→1 flips tiles in along a diagonal sweep from top-left.
 */
export const TileField: React.FC<{
  cols: number;
  rows: number;
  tile?: number;
  gap?: number;
  seed?: string;
  reveal?: number;
  style?: React.CSSProperties;
}> = ({ cols, rows, tile = 44, gap = 6, seed = "tiles", reveal = 1, style }) => {
  const cells: React.ReactNode[] = [];
  const span = cols + rows - 2 || 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = `${seed}-${r}-${c}`;
      const color = C.tiles[Math.floor(random(k) * C.tiles.length)];
      const order = (r + c) / span;
      const local = interpolate(reveal, [order * 0.7, order * 0.7 + 0.3], [0, 1], clamp);
      cells.push(
        <div
          key={k}
          style={{
            width: tile,
            height: tile,
            borderRadius: 4,
            background: color,
            boxShadow: "inset 0 -2px 0 rgba(28,26,24,0.06)",
            opacity: local,
            transform: `scale(${0.6 + 0.4 * local})`,
          }}
        />,
      );
    }
  }
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, ${tile}px)`,
        gap,
        padding: gap,
        background: "#E4DCCF",
        width: "fit-content",
        ...style,
      }}
    >
      {cells}
    </div>
  );
};

/** Section label, e.g. "01 — SEARCH". Uppercased and tracked for Latin scripts only. */
export const Kicker: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => {
  const { code } = useCopy();
  return (
    <div
      style={{
        fontFamily: F.sans,
        fontWeight: 800,
        fontSize: 30,
        letterSpacing: code === "th" ? 0 : "0.12em",
        textTransform: "uppercase",
        color: C.teal,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Editorial headline. Thai gets taller lines (stacked vowel/tone marks) and no negative tracking. */
export const Headline: React.FC<{ children: React.ReactNode; size?: number; style?: React.CSSProperties }> = ({
  children,
  size = 92,
  style,
}) => {
  const { code } = useCopy();
  return (
    <div
      style={{
        fontFamily: F.display,
        fontWeight: 600,
        fontSize: size,
        lineHeight: code === "th" ? 1.4 : 1.02,
        letterSpacing: code === "th" ? 0 : "-0.025em",
        textWrap: "balance",
        color: C.ink,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Honesty marker for concept UI. Dashed teal rubber stamp, in the rendered locale. */
export const ConceptStamp: React.FC<{ rotate?: number; style?: React.CSSProperties }> = ({ rotate = -6, style }) => {
  const { concept, code } = useCopy();
  return (
    <div
      style={{
        display: "inline-block",
        padding: "6px 14px",
        border: `3px dashed ${C.teal}`,
        borderRadius: 8,
        fontFamily: F.sans,
        fontWeight: 800,
        fontSize: 22,
        // Tracking breaks Thai word shapes; Latin keeps the stamp look.
        letterSpacing: code === "th" ? 0 : "0.16em",
        whiteSpace: "nowrap",
        color: C.teal,
        background: "rgba(250,249,247,0.9)",
        transform: `rotate(${rotate}deg)`,
        ...style,
      }}
    >
      {concept}
    </div>
  );
};

/** Hand-written shop price card: red marker on fluorescent paper. */
export const PriceCard: React.FC<{
  children: React.ReactNode;
  tone?: "yellow" | "pink";
  rotate?: number;
  fontSize?: number;
  style?: React.CSSProperties;
}> = ({ children, tone = "yellow", rotate = -3, fontSize = 64, style }) => (
  <div
    style={{
      display: "inline-block",
      padding: "0.35em 0.6em",
      background: tone === "yellow" ? C.shopYellow : C.shopPink,
      color: C.markerRed,
      fontFamily: F.cjk,
      fontWeight: 600,
      fontSize,
      lineHeight: 1.1,
      borderRadius: 6,
      boxShadow: "0 14px 30px -16px rgba(28,26,24,0.45)",
      transform: `rotate(${rotate}deg)`,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    {children}
  </div>
);

/** Drugstore shelf-strip tag: white strip, small product line, big red price. */
export const ShelfTag: React.FC<{
  label: string;
  price: string;
  scale?: number;
  rotate?: number;
  style?: React.CSSProperties;
}> = ({ label, price, scale = 1, rotate = 0, style }) => (
  <div
    style={{
      width: "fit-content",
      display: "inline-flex",
      flexDirection: "column",
      gap: 4 * scale,
      padding: `${12 * scale}px ${20 * scale}px`,
      background: C.white,
      borderTop: `${6 * scale}px solid ${C.markerRed}`,
      borderRadius: 4 * scale,
      boxShadow: "0 12px 26px -16px rgba(28,26,24,0.45)",
      transform: `rotate(${rotate}deg)`,
      whiteSpace: "nowrap",
      ...style,
    }}
  >
    <span style={{ fontFamily: F.cjk, fontWeight: 400, fontSize: 24 * scale, color: C.muted }}>{label}</span>
    <span
      style={{
        fontFamily: F.sans,
        fontWeight: 800,
        fontSize: 56 * scale,
        lineHeight: 1,
        letterSpacing: "-0.02em",
        color: C.markerRed,
      }}
    >
      {price}
    </span>
  </div>
);

/**
 * Hand-drawn marker stroke along an SVG path, drawn by `progress` 0→1.
 * `d` is in the coordinate space of `viewBox` (defaults to width × height).
 */
export const MarkerStroke: React.FC<{
  d: string;
  progress: number;
  width: number;
  height: number;
  color?: string;
  strokeWidth?: number;
  viewBox?: string;
  style?: React.CSSProperties;
}> = ({ d, progress: p, width, height, color = C.markerRed, strokeWidth = 8, viewBox, style }) => (
  <svg
    width={width}
    height={height}
    viewBox={viewBox ?? `0 0 ${width} ${height}`}
    style={{ overflow: "visible", ...style }}
  >
    <path
      d={d}
      pathLength={1}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={1}
      strokeDashoffset={1 - p}
    />
  </svg>
);

/** Loose hand-drawn ellipse path around a w×h box (for MarkerStroke). */
export const scribbleEllipse = (w: number, h: number) => {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2 - 6;
  const ry = h / 2 - 6;
  return `M ${cx + rx * 0.2} ${cy - ry} C ${cx + rx * 1.1} ${cy - ry * 1.05}, ${cx + rx * 1.05} ${cy + ry * 1.1}, ${cx} ${cy + ry} C ${cx - rx * 1.1} ${cy + ry * 1.05}, ${cx - rx * 1.08} ${cy - ry * 1.1}, ${cx + rx * 0.35} ${cy - ry * 0.92}`;
};

type Pt = { x: number; y: number };

const bezier = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
};

const bezierTangent = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return {
    x: 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x),
    y: 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y),
  };
};

/** The logo's plane, pointing right (+x). ~96 px long. */
const PLANE_PATH =
  "M 48 0 C 52 -4 60 -6 66 -4 C 68 -3 68 3 66 4 C 60 6 52 4 48 0 Z M 30 -2 L 46 -2 L 20 -34 L 10 -34 L 26 -2 Z M 30 2 L 46 2 L 20 34 L 10 34 L 26 2 Z M -26 -3 L 50 -3 L 50 3 L -26 3 Z M -26 -3 L -18 -3 L -30 -18 L -36 -18 L -30 -3 Z M -26 3 L -18 3 L -30 18 L -36 18 L -30 3 Z";

/**
 * The amber flight arc from the logo: a cubic Bézier drawn by `progress` 0→1,
 * with the plane riding the tip. Coordinates are absolute in the parent (use inside AbsoluteFill).
 */
export const FlightArc: React.FC<{
  from: Pt;
  c1: Pt;
  c2: Pt;
  to: Pt;
  progress: number;
  strokeWidth?: number;
  color?: string;
  showPlane?: boolean;
  planeScale?: number;
}> = ({ from, c1, c2, to, progress: p, strokeWidth = 26, color = C.amber, showPlane = true, planeScale = 1 }) => {
  const tip = bezier(from, c1, c2, to, p);
  const tan = bezierTangent(from, c1, c2, to, Math.max(p, 0.001));
  const angle = (Math.atan2(tan.y, tan.x) * 180) / Math.PI;
  const d = `M ${from.x} ${from.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${to.x} ${to.y}`;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <svg width="100%" height="100%" style={{ overflow: "visible" }}>
        <path
          d={d}
          pathLength={1}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={1}
          strokeDashoffset={1 - p}
        />
        {showPlane && p > 0 && (
          <g transform={`translate(${tip.x} ${tip.y}) rotate(${angle}) scale(${planeScale}) translate(20 0)`}>
            <path d={PLANE_PATH} fill={color} />
          </g>
        )}
      </svg>
    </AbsoluteFill>
  );
};
