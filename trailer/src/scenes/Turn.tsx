import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { appear, FlightArc, pop, PriceCard, progress, ShelfTag, TileField } from "../components";
import { useCopy } from "../i18n";
import { C, F } from "../theme";

/** Leftover clutter from the price-blind-spot scene, flung out of frame as the arc sweeps past. */
const LEFTOVERS = [
  { hit: 0.1, x: 120, y: 420, rotate: -7, kind: "shelf" as const },
  { hit: 0.4, x: 700, y: 760, rotate: 5, kind: "price" as const },
  { hit: 0.7, x: 260, y: 1220, rotate: -4, kind: "price2" as const },
];

const ARC_DUR = 20;

export const Turn: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const copy = useCopy();

  const arcP = progress(frame, 0, ARC_DUR);
  const arcOpacity = 1 - progress(frame, ARC_DUR, 8);

  const tileReveal = progress(frame, 8, 28);

  const iconP = Math.min(Math.max(pop(frame, fps, 20), 0), 1.15);
  const textStyle = appear(frame, fps, 35, 22);

  return (
    <AbsoluteFill>
      {LEFTOVERS.map((item, i) => {
        const flingP = progress(frame, item.hit * ARC_DUR, 9);
        const opacity = 1 - flingP;
        const transform = `translate(${flingP * 480}px, ${-flingP * 260}px) rotate(${item.rotate + flingP * 50}deg)`;
        return (
          <div key={i} style={{ position: "absolute", left: item.x, top: item.y, opacity, transform }}>
            {item.kind === "shelf" ? (
              <ShelfTag label="面膜" price="NT$199" scale={0.75} rotate={item.rotate} />
            ) : (
              <PriceCard tone={item.kind === "price" ? "yellow" : "pink"} fontSize={40} rotate={item.rotate}>
                {item.kind === "price" ? "RM ?" : "S$ ?"}
              </PriceCard>
            )}
          </div>
        );
      })}

      <TileField
        cols={20}
        rows={4}
        seed="turn-band"
        reveal={tileReveal}
        style={{ position: "absolute", left: (1080 - (20 * 44 + 21 * 6)) / 2, top: 1920 - (4 * 44 + 5 * 6) - 60 }}
      />

      <div style={{ opacity: arcOpacity }}>
        <FlightArc
          from={{ x: -60, y: 1900 }}
          c1={{ x: 220, y: 1220 }}
          c2={{ x: 680, y: 680 }}
          to={{ x: 1150, y: 110 }}
          progress={arcP}
        />
      </div>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 30 }}>
        <div style={{ transform: `scale(${iconP})` }}>
          <Img src={staticFile("icon.png")} width={300} style={{ display: "block" }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, ...textStyle }}>
          <div
            style={{
              fontFamily: F.sans,
              fontWeight: 600,
              fontSize: 40,
              lineHeight: copy.code === "th" ? 1.4 : 1.2,
              textAlign: "center",
              textWrap: "balance",
              maxWidth: 900,
              color: C.muted,
            }}
          >
            {copy.turn.lead}
          </div>
          <div style={{ fontFamily: F.display, fontWeight: 700, fontSize: 118, letterSpacing: "-0.02em", color: C.ink }}>
            TaiwanHaul.
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

