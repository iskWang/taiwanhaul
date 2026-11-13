import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { appear, ConceptStamp, Headline, Kicker, pop } from "../components";
import { useCopy } from "../i18n";
import { C, F, SAFE } from "../theme";

/** Coral map-pin, no faces or avatars. */
const MapPin: React.FC = () => (
  <svg width={28} height={36} viewBox="0 0 30 38">
    <path d="M15 2C7.8 2 2 7.8 2 15c0 10 13 21 13 21s13-11 13-21c0-7.2-5.8-13-13-13z" fill={C.coral} />
    <circle cx={15} cy={15} r={5.5} fill={C.white} />
  </svg>
);

/** Deterministic unreadable scribble line — never actual letters. */
const scribbleLine = (y: number, phase: number) => {
  let d = `M 14 ${y}`;
  for (let x = 14; x <= 150; x += 8) {
    const wob = Math.sin((x + phase) / 10) * 5 + Math.sin((x + phase) / 3.3) * 2;
    d += ` L ${x} ${y + wob}`;
  }
  return d;
};

const StickyNote: React.FC<{ frame: number; fps: number; start: number; x: number; y: number; rotate: number }> = ({
  frame,
  fps,
  start,
  x,
  y,
  rotate,
}) => {
  const { locals, code } = useCopy();
  const p = pop(frame, fps, start);
  const pClamped = Math.max(0, p);
  const settleRotate = rotate + (1 - Math.min(1, p)) * 26;
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 176,
        transform: `translate(-50%, -50%) rotate(${settleRotate}deg) scale(${pClamped})`,
        opacity: pClamped > 0.02 ? 1 : 0,
        background: C.shopYellow,
        borderRadius: 6,
        boxShadow: "0 10px 24px -12px rgba(28,26,24,0.5)",
        padding: "14px 14px 16px",
        zIndex: 8,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ flex: "none", lineHeight: 0 }}>
          <MapPin />
        </div>
        <span
          style={{
            fontFamily: F.sans,
            fontWeight: 800,
            fontSize: 16,
            lineHeight: code === "th" ? 1.4 : 1.2,
            letterSpacing: code === "th" ? 0 : "0.08em",
            textTransform: "uppercase",
            color: C.ink,
            textWrap: "balance",
          }}
        >
          {locals.tag}
        </span>
      </div>
      <svg width={160} height={70} viewBox="0 0 160 70" style={{ marginTop: 8 }}>
        <path d={scribbleLine(14, 0)} stroke={C.ink} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.55} />
        <path d={scribbleLine(36, 20)} stroke={C.ink} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.55} />
        <path d={scribbleLine(56, 45)} stroke={C.ink} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.45} />
      </svg>
    </div>
  );
};

/** Generic flat paper-cutout pouch — represents "a product", not a real listing. */
const FeaturedIcon: React.FC = () => (
  <svg width={170} height={190} viewBox="0 0 180 200">
    <path
      d="M40 60 C40 40 60 26 90 26 C120 26 140 40 140 60 L150 170 C150 182 140 190 128 190 L52 190 C40 190 30 182 30 170 Z"
      fill="#F3E9DA"
      stroke={C.ink}
      strokeWidth={3}
    />
    <path d="M60 60 C60 42 74 30 90 30 C106 30 120 42 120 60" fill="none" stroke={C.ink} strokeWidth={3} />
    <rect x={30} y={92} width={120} height={18} fill={C.green} opacity={0.85} />
    <rect x={30} y={132} width={120} height={12} fill={C.coral} opacity={0.8} />
    <path d="M90 8 C96 20 110 22 118 14" stroke={C.green} strokeWidth={4} fill="none" strokeLinecap="round" />
  </svg>
);

const NOTES = [
  { start: 15, x: 340, y: 740, rotate: -9 },
  { start: 27, x: 760, y: 730, rotate: 11 },
  { start: 39, x: 620, y: 1200, rotate: -7 },
];

export const Locals: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { locals, code } = useCopy();
  const cardPop = pop(frame, fps, 0);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          top: 360,
          width: SAFE.right - SAFE.left,
          ...appear(frame, fps, 0),
        }}
      >
        <Kicker>{locals.kicker}</Kicker>
        <Headline size={68} style={{ marginTop: 14 }}>
          {locals.headline}
        </Headline>
      </div>

      <div
        style={{
          position: "absolute",
          left: 540,
          top: 960,
          transform: `translate(-50%, -50%) rotate(-2deg) scale(${Math.max(0, cardPop)})`,
          opacity: Math.min(1, Math.max(0, cardPop)),
          background: C.white,
          borderRadius: 22,
          boxShadow: "0 2px 0 rgba(28,26,24,0.06), 0 24px 50px -20px rgba(28,26,24,0.4)",
          padding: "30px 32px",
          zIndex: 4,
        }}
      >
        <FeaturedIcon />
      </div>

      {NOTES.map((n, i) => (
        <StickyNote key={i} frame={frame} fps={fps} start={n.start} x={n.x} y={n.y} rotate={n.rotate} />
      ))}

      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          top: 1410,
          width: SAFE.right - SAFE.left,
          textAlign: "center",
          fontFamily: F.display,
          fontStyle: code === "th" ? "normal" : "italic",
          fontSize: 34,
          color: C.muted,
          ...appear(frame, fps, 80),
        }}
      >
        {locals.footnote}
      </div>

      <ConceptStamp style={{ position: "absolute", left: 130, top: 1300 }} />
    </AbsoluteFill>
  );
};
