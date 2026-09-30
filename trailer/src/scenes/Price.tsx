import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { appear, Headline, pop, progress, ShelfTag } from "../components";
import { useCopy } from "../i18n";
import { C, F } from "../theme";

/** The six currencies of the main SEA visitor markets. Order matches the storyboard. */
const ITEMS = ["RM ?", "₱ ?", "฿ ?", "S$ ?", "Rp ?", "₫ ?"];
const CELLS = 4; // widest item is 4 chars; shorter ones pad with a trailing space.

const FLIP_START = 30;
const FLIP_INTERVAL = 8;
const FLIP_SLOTS = 11; // fits inside the 90-frame window (f30–120) with room to settle.
const FLIP_FOLD = 4; // frames spent actually folding within each slot.

const FLAP_W = 205;
const FLAP_H = 260;

/** One character cell of a mechanical split-flap display: static bottom half, folding top half. */
const FlapChar: React.FC<{ oldChar: string; newChar: string; flipT: number }> = ({ oldChar, newChar, flipT }) => {
  const settled = flipT >= 0.5;
  const bottomChar = settled ? newChar : oldChar;
  const topChar = settled ? newChar : oldChar;
  const topScale = settled ? (flipT - 0.5) * 2 : 1 - flipT * 2;
  const glyphStyle: React.CSSProperties = {
    position: "absolute",
    left: 0,
    right: 0,
    height: FLAP_H,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: F.sans,
    fontWeight: 800,
    fontSize: FLAP_H * 0.56,
    color: C.paper,
  };
  return (
    <div style={{ position: "relative", width: FLAP_W, height: FLAP_H }}>
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          width: FLAP_W,
          height: FLAP_H / 2,
          overflow: "hidden",
          background: C.ink,
          borderRadius: "0 0 14px 14px",
        }}
      >
        <div style={{ ...glyphStyle, top: -FLAP_H / 2 }}>{bottomChar}</div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: FLAP_W,
          height: FLAP_H / 2,
          overflow: "hidden",
          background: C.ink,
          transformOrigin: "bottom",
          transform: `scaleY(${Math.max(topScale, 0.015)})`,
          borderRadius: "14px 14px 0 0",
          boxShadow: "0 3px 8px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ ...glyphStyle, top: 0 }}>{topChar}</div>
      </div>
      <div style={{ position: "absolute", top: FLAP_H / 2 - 1, left: 0, width: FLAP_W, height: 2, background: "rgba(0,0,0,0.55)" }} />
    </div>
  );
};

export const Price: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const copy = useCopy();
  const isThai = copy.code === "th";

  const headlineStyle = appear(frame, fps, 15, 26);
  const tagPop = pop(frame, fps, 0);
  const rowOpacity = progress(frame, 22, 12);
  const subStyle = appear(frame, fps, 90, 18);
  const subExit = 1 - progress(frame, 140, 16);
  const exitP = progress(frame, 145, 20);

  const activeFrame = Math.min(Math.max(frame, FLIP_START), FLIP_START + FLIP_SLOTS * FLIP_INTERVAL);
  const slot = Math.min(Math.floor((activeFrame - FLIP_START) / FLIP_INTERVAL), FLIP_SLOTS - 1);
  const localFold = activeFrame - (FLIP_START + slot * FLIP_INTERVAL);
  const flipT = slot === 0 ? 1 : Math.min(Math.max(localFold / FLIP_FOLD, 0), 1);
  const curIdx = slot % ITEMS.length;
  const prevIdx = slot === 0 ? curIdx : (slot - 1 + ITEMS.length) % ITEMS.length;
  const curPadded = ITEMS[curIdx].padEnd(CELLS, " ");
  const prevPadded = ITEMS[prevIdx].padEnd(CELLS, " ");

  const exitTransform = `translate(${-exitP * 220}px, ${exitP * 260}px) rotate(${-exitP * 9}deg)`;

  return (
    <AbsoluteFill style={{ alignItems: "center", paddingTop: 300 }}>
      <div style={{ width: 920, textAlign: "center", ...headlineStyle }}>
        <Headline size={92} style={{ textAlign: "center" }}>
          {copy.price.headline}
        </Headline>
      </div>

      <div style={{ marginTop: 110, display: "flex", flexDirection: "column", alignItems: "center", gap: 90, transform: exitTransform }}>
        <div style={{ transform: `scale(${0.55 + 0.45 * tagPop}) rotate(-2deg)`, opacity: tagPop }}>
          <ShelfTag label="面膜" price="NT$199" scale={2.3} />
        </div>

        <div style={{ display: "flex", gap: 24, opacity: rowOpacity }}>
          {Array.from({ length: CELLS }).map((_, i) => (
            <FlapChar key={i} oldChar={prevPadded[i]} newChar={curPadded[i]} flipT={flipT} />
          ))}
        </div>
      </div>
      <div style={{ marginTop: 70, transform: subStyle.transform, opacity: Number(subStyle.opacity) * subExit }}>
        <div
          style={{
            fontFamily: F.display,
            fontStyle: isThai ? "normal" : "italic",
            fontSize: 48,
            lineHeight: isThai ? 1.4 : 1.2,
            color: C.muted,
            textAlign: "center",
            maxWidth: 880,
          }}
        >
          {copy.price.sub}
        </div>
      </div>
    </AbsoluteFill>
  );
};
