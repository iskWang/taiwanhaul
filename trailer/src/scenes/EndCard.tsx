import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { appear, FlightArc, PaperCard, pop, progress, TileField } from "../components";
import { useCopy } from "../i18n";
import { C, F } from "../theme";

const PLATE_CX = 540;
const PLATE_CY = 950;

export const EndCard: React.FC = () => {
  const { end, code } = useCopy();
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const bandReveal = progress(frame, 0, 30);
  const platePop = pop(frame, fps, 4);

  const headlineStyle = appear(frame, fps, 30, 24);
  const pillPop = pop(frame, fps, 45);

  // Three sequential arcs: two bow out to trace a loose loop around the plate, the third exits right.
  const loop1 = progress(frame, 8, 18);
  const loop2 = progress(frame, 26, 18);
  const exit = progress(frame, 44, 20);

  return (
    <AbsoluteFill>
      <TileField
        cols={18}
        rows={8}
        seed="endcard-band"
        reveal={bandReveal}
        style={{ position: "absolute", left: (1080 - (18 * 44 + 19 * 6)) / 2, top: 750 }}
      />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ transform: `scale(${platePop}) rotate(-2deg)`, opacity: Math.min(platePop, 1) }}>
          <PaperCard style={{ padding: "48px 56px" }}>
            <Img src={staticFile("wordmark.png")} width={520} style={{ display: "block" }} />
          </PaperCard>
        </div>
      </AbsoluteFill>

      <div style={{ opacity: exit < 1 ? 1 : Math.max(0, 1 - (exit - 0.6) * 2.5) }}>
        <FlightArc
          from={{ x: PLATE_CX, y: PLATE_CY + 230 }}
          c1={{ x: PLATE_CX - 420, y: PLATE_CY + 160 }}
          c2={{ x: PLATE_CX - 420, y: PLATE_CY - 160 }}
          to={{ x: PLATE_CX, y: PLATE_CY - 230 }}
          progress={loop1}
          showPlane={loop1 > 0 && loop2 === 0}
        />
        <FlightArc
          from={{ x: PLATE_CX, y: PLATE_CY - 230 }}
          c1={{ x: PLATE_CX + 420, y: PLATE_CY - 160 }}
          c2={{ x: PLATE_CX + 380, y: PLATE_CY + 140 }}
          to={{ x: PLATE_CX + 160, y: PLATE_CY + 200 }}
          progress={loop2}
          showPlane={loop2 > 0 && exit === 0}
        />
        <FlightArc
          from={{ x: PLATE_CX + 160, y: PLATE_CY + 200 }}
          c1={{ x: PLATE_CX + 420, y: PLATE_CY + 220 }}
          c2={{ x: PLATE_CX + 720, y: PLATE_CY + 120 }}
          to={{ x: 1260, y: PLATE_CY + 40 }}
          progress={exit}
          showPlane={exit > 0}
        />
      </div>

      <div style={{ position: "absolute", left: 80, right: 80, top: 380, textAlign: "center", ...headlineStyle }}>
        <div
          style={{
            fontFamily: F.display,
            fontWeight: 600,
            fontSize: 68,
            lineHeight: code === "th" ? 1.4 : 1.15,
            letterSpacing: code === "th" ? 0 : undefined,
            color: C.ink,
            textWrap: "balance",
          }}
        >
          {end.headline}
        </div>
      </div>

      <div style={{ position: "absolute", left: 0, right: 0, top: 1340, display: "flex", justifyContent: "center" }}>
        <div
          style={{
            transform: `scale(${Math.min(pillPop, 1)})`,
            opacity: Math.min(pillPop, 1),
            background: C.teal,
            color: C.white,
            fontFamily: F.sans,
            fontWeight: 800,
            fontSize: 34,
            letterSpacing: code === "th" ? 0 : "0.04em",
            padding: "18px 40px",
            borderRadius: 999,
          }}
        >
          {end.comingSoon}
        </div>
      </div>
    </AbsoluteFill>
  );
};
