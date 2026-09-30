import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { appear, Headline, pop, PriceCard, progress } from "../components";
import { useCopy } from "../i18n";
import { C, F } from "../theme";

export const Lost: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const copy = useCopy();
  const isThai = copy.code === "th";

  const cardScale = pop(frame, fps, 0);
  // The wobbling "?" is the last grapheme. The last word stays glued to it so it can never wrap alone.
  const wrongChars = Array.from(copy.lost.wrong);
  const chipMark = wrongChars.pop() ?? "";
  const chipBody = wrongChars.join("");
  const lastSpace = chipBody.lastIndexOf(" ") + 1;
  const chipHead = chipBody.slice(0, lastSpace);
  const chipTail = chipBody.slice(lastSpace);
  const wobble = Math.sin(frame / 6) * 12;
  const strikeP = progress(frame, 75, 14);

  const greenScale = pop(frame, fps, 76);
  const greenOpacity = progress(frame, 76, 8);

  // f150–165: the whole card + chip stack slides off to the left. Linear (not the
  // house ease-out) so the motion is still visibly mid-flight at f155, not already gone.
  const exitX = -1500 * interpolate(frame, [150, 165], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 300,
          transform: `translateX(${exitX}px)`,
        }}
      >
        <div style={{ ...appear(frame, fps, 10, 26), marginBottom: 60 }}>
          <Headline size={isThai ? 96 : 104} style={{ textAlign: "center", width: 860 }}>
            {copy.lost.headline}
          </Headline>
        </div>

        <div style={{ transform: `scale(${cardScale})`, marginBottom: 84 }}>
          <PriceCard tone="yellow" rotate={-3} fontSize={130}>
            第二件 6折
          </PriceCard>
        </div>

        <div style={{ ...appear(frame, fps, 25, 22), position: "relative", width: 640, marginBottom: 44 }}>
          <div
            style={{
              background: "#D9D4CC",
              color: C.ink,
              fontFamily: F.sans,
              fontWeight: 700,
              fontSize: 48,
              lineHeight: isThai ? 1.4 : "normal",
              padding: "22px 34px",
              borderRadius: 18,
              textAlign: "center",
              boxShadow: "0 10px 24px -14px rgba(28,26,24,0.4)",
            }}
          >
            {chipHead}
            <span style={{ whiteSpace: "nowrap" }}>
              {chipTail}
              <span style={{ display: "inline-block", transform: `rotate(${wobble}deg)` }}>{chipMark}</span>
            </span>
          </div>
          {/* Strike-through is laid over the chip in percentages, so it spans the chip at any width or line count. */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "100%", overflow: "visible" }}
          >
            <path
              d={`M3.4 15.5 L ${3.4 + (96.6 - 3.4) * strikeP} ${15.5 + (84.5 - 15.5) * strikeP}`}
              fill="none"
              stroke={C.markerRed}
              strokeWidth={12}
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              opacity={strikeP > 0 ? 1 : 0}
            />
          </svg>
        </div>

        <div style={{ transform: `scale(${greenScale})`, opacity: greenOpacity, marginBottom: 44 }}>
          <div
            style={{
              background: C.green,
              color: C.white,
              fontFamily: F.sans,
              fontWeight: 800,
              fontSize: 46,
              lineHeight: isThai ? 1.4 : "normal",
              padding: "22px 42px",
              borderRadius: 18,
              boxShadow: "0 10px 24px -14px rgba(28,26,24,0.4)",
              textAlign: "center",
              maxWidth: 900,
            }}
          >
            {copy.lost.right}
          </div>
        </div>

        <div style={appear(frame, fps, 105, 16)}>
          <div
            style={{
              fontFamily: F.display,
              fontStyle: isThai ? "normal" : "italic",
              fontSize: 34,
              lineHeight: isThai ? 1.45 : 1.25,
              color: C.muted,
              textAlign: "center",
              maxWidth: 880,
            }}
          >
            {copy.lost.footnote}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};
