import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import {
  appear,
  ConceptStamp,
  Headline,
  Kicker,
  pop,
  PriceCard,
  progress,
  scribbleEllipse,
} from "../components";
import { useCopy } from "../i18n";
import { C, F, SAFE } from "../theme";

const BAR_MAX = 760;
const GROW_START = 20;
const GROW_DUR = 50;
const TAG_IN = 80;

/** A paper "bar chart" row: label + price above, a growing colored bar below. Bar length = value / max of BAR_MAX. */
const Row: React.FC<{
  label: string;
  price: string;
  value: number;
  max: number;
  color: string;
  rotate: number;
  top: number;
  frame: number;
}> = ({ label, price, value, max, color, rotate, top, frame }) => {
  const grow = progress(frame, GROW_START, GROW_DUR);
  const width = Math.max(8, BAR_MAX * (value / max) * grow);
  return (
    <div style={{ position: "absolute", left: SAFE.left, right: 80, top }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 24, marginBottom: 18 }}>
        <span style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 38, color: C.ink }}>{label}</span>
        <span style={{ fontFamily: F.sans, fontWeight: 800, fontSize: 48, color: C.ink, whiteSpace: "nowrap" }}>{price}</span>
      </div>
      <div
        style={{
          height: 66,
          width,
          borderRadius: 16,
          background: color,
          transform: `rotate(${rotate}deg)`,
          boxShadow: "0 14px 26px -16px rgba(28,26,24,0.35)",
        }}
      />
    </div>
  );
};

/** Fluoro tag stamping "≈ 38% less", circled by a red marker stroke that sizes itself to the tag in any language. */
const TagStamp: React.FC<{ frame: number; fps: number; text: string }> = ({ frame, fps, text }) => {
  const { code } = useCopy();
  const p = Math.min(1, Math.max(0, pop(frame, fps, TAG_IN)));
  const circleP = progress(frame, TAG_IN + 6, 22);
  // Thai and Vietnamese glyphs come from the sans stack; PingFang would substitute them per glyph.
  const font = code === "th" || code === "vi" ? { fontFamily: F.sans, fontWeight: 800 } : {};
  return (
    <div
      style={{
        position: "absolute",
        left: SAFE.left,
        right: 80,
        top: 1010,
        height: 220,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: p,
        transform: `scale(${0.8 + p * 0.2})`,
      }}
    >
      {/* The wrapper hugs the tag; the ellipse overhangs it by a fixed share of its width and 67px top and bottom, whatever the word order or length. */}
      <div style={{ position: "relative", display: "flex" }}>
        <PriceCard tone="yellow" rotate={-5} fontSize={48} style={{ ...font, lineHeight: code === "th" ? 1.4 : 1.1 }}>
          {text}
        </PriceCard>
        <svg
          viewBox="0 0 460 220"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            left: "-30%",
            width: "160%",
            top: -67,
            height: "calc(100% + 134px)",
            overflow: "visible",
          }}
        >
          <path
            d={scribbleEllipse(460, 220)}
            pathLength={1}
            fill="none"
            stroke={C.markerRed}
            strokeWidth={8}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={1}
            strokeDashoffset={1 - circleP}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>
    </div>
  );
};

export const Cheaper: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const copy = useCopy();
  const { ratio } = copy.cheaper;
  const footnoteA = appear(frame, fps, 0, 10);

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: SAFE.left, right: 80, top: 360 }}>
        <Kicker style={appear(frame, fps, 0, 14)}>{copy.cheaper.kicker}</Kicker>
      </div>
      <ConceptStamp rotate={-6} style={{ position: "absolute", top: 355, right: 100, opacity: appear(frame, fps, 8, 12).opacity }} />

      <div style={{ position: "absolute", left: SAFE.left, right: 80, top: 412 }}>
        <Headline size={64} style={appear(frame, fps, 4, 22)}>
          {copy.cheaper.headline}
        </Headline>
      </div>

      <Row
        label={copy.cheaper.here}
        price={copy.cheaper.herePrice}
        value={ratio[0]}
        max={ratio[1]}
        color={C.teal}
        rotate={-1.2}
        top={620}
        frame={frame}
      />
      <Row
        label={copy.cheaper.home}
        price={copy.cheaper.homePrice}
        value={ratio[1]}
        max={ratio[1]}
        color={C.muted}
        rotate={1}
        top={830}
        frame={frame}
      />

      <TagStamp frame={frame} fps={fps} text={copy.cheaper.less} />

      <div style={{ position: "absolute", left: SAFE.left, right: 80, top: 1420, opacity: footnoteA.opacity }}>
        <span
          style={{
            fontFamily: F.display,
            fontStyle: copy.code === "th" ? "normal" : "italic",
            fontSize: 30,
            lineHeight: copy.code === "th" ? 1.4 : 1.2,
            color: C.muted,
          }}
        >
          {copy.cheaper.footnote}
        </span>
      </div>
    </AbsoluteFill>
  );
};
