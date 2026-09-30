import React from "react";
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from "remotion";
import { appear, PaperCard, PriceCard, progress, ShelfTag } from "../components";
import { useCopy } from "../i18n";
import { C, F } from "../theme";

// Everyday shop/drugstore vocabulary drifting behind the headline. 第二件6折 is
// deliberately excluded here — it gets one fixed, prominent instance below so the
// closing push-in has a single clear target to match-cut into.
const WALL_WORDS = [
  "面膜",
  "鳳梨酥",
  "高山烏龍茶",
  "牛軋餅",
  "泡麵",
  "醬油膏",
  "買一送一",
  "限時特價",
  "滿千折百",
  "新品上市",
  "藥妝",
  "伴手禮",
  "辣椒醬",
  "果乾",
  "會員價",
  "退稅",
];

const COLS = 5;
const COL_W = 1080 / COLS;
const ROWS = 13;
const ROW_H = 200;
const WALL_SPEED = 1.05;

/** Deterministic drifting wall of shop tags — mixed shelf strips / fluoro cards / plain labels. */
const TagWall: React.FC<{ frame: number }> = ({ frame }) => {
  const fieldHeight = ROWS * ROW_H;
  const scrollOffset = frame * WALL_SPEED;
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const seed = `hookwall-${r}-${c}`;
      const word = WALL_WORDS[Math.floor(random(`${seed}-w`) * WALL_WORDS.length)];
      const variant = Math.floor(random(`${seed}-v`) * 4);
      const xJitter = (random(`${seed}-x`) - 0.5) * 44;
      const rot = (random(`${seed}-r`) - 0.5) * 6;
      const price = Math.floor(random(`${seed}-p`) * 260) + 39;
      const wobble = Math.sin((frame + r * 13 + c * 9) / 22) * 1.1;
      const stagger = r % 2 === 1 ? COL_W / 2 : 0;
      const x = c * COL_W + COL_W / 2 + stagger + xJitter;
      const baseY = r * ROW_H;
      const y = (((baseY - scrollOffset) % fieldHeight) + fieldHeight) % fieldHeight - ROW_H;
      const rotate = rot + wobble;

      let node: React.ReactNode;
      if (variant === 0) {
        node = <ShelfTag label={word} price={`NT$${price}`} scale={0.52} rotate={rotate} />;
      } else if (variant === 1) {
        node = (
          <PriceCard tone="yellow" fontSize={32} rotate={rotate}>
            {word}
          </PriceCard>
        );
      } else if (variant === 2) {
        node = (
          <PriceCard tone="pink" fontSize={28} rotate={rotate}>
            {word}
          </PriceCard>
        );
      } else {
        node = (
          <div
            style={{
              background: C.white,
              padding: "10px 18px",
              borderRadius: 6,
              fontFamily: F.cjk,
              fontWeight: 500,
              fontSize: 26,
              color: C.ink,
              boxShadow: "0 10px 20px -12px rgba(28,26,24,0.35)",
              transform: `rotate(${rotate}deg)`,
              whiteSpace: "nowrap",
            }}
          >
            {word}
          </div>
        );
      }
      cells.push(
        <div key={seed} style={{ position: "absolute", left: x, top: y, transform: "translate(-50%, 0)" }}>
          {node}
        </div>,
      );
    }
  }
  return (
    <AbsoluteFill style={{ background: C.paperDeep, overflow: "hidden" }}>
      {cells}
      {/* Fixed target tag: the same 第二件6折 card the ending push-in zooms into. */}
      <div style={{ position: "absolute", left: 390, top: 1130 }}>
        <PriceCard tone="yellow" rotate={-3} fontSize={54}>
          第二件6折
        </PriceCard>
      </div>
    </AbsoluteFill>
  );
};

/** Amber marker underline that stretches to whatever box it sits in (segment width differs per language). */
const SegmentUnderline: React.FC<{ progress: number; bottom: number }> = ({ progress: p, bottom }) => (
  <svg
    viewBox="0 0 330 34"
    preserveAspectRatio="none"
    style={{ position: "absolute", left: -4, width: "calc(100% + 8px)", height: 34, bottom, overflow: "visible" }}
  >
    {/* Reveal by growing a clip rect: dash tricks break under non-scaling-stroke. */}
    <clipPath id="hook-em-reveal">
      <rect x={-40} y={-40} width={30 + 380 * p} height={120} />
    </clipPath>
    <path
      d="M4 20 Q 84 2 168 14 T 328 10"
      fill="none"
      stroke={C.amber}
      strokeWidth={10}
      strokeLinecap="round"
      strokeLinejoin="round"
      vectorEffect="non-scaling-stroke"
      clipPath="url(#hook-em-reveal)"
    />
  </svg>
);

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const copy = useCopy();
  const isThai = copy.code === "th";

  // Wall dims to ~35% brightness from f30, holds, then brightens again as we push in.
  const dim = progress(frame, 30, 15) * 0.65 * (1 - progress(frame, 120, 15));
  // Push-in toward the fixed 第二件6折 tag (center ≈ 558, 1179), match-cutting into scene 2.
  const zoomP = progress(frame, 120, 15);
  const scale = 1 + zoomP * 3.6;
  const headlineOpacity = progress(frame, 26, 10) * (1 - progress(frame, 106, 14));

  // Thai needs taller lines for stacked vowel/tone marks; Vietnamese for stacked diacritics.
  const lineHeight = isThai ? 1.4 : copy.code === "vi" ? 1.22 : 1.16;
  // The box of an inline-block segment is one line tall, so the underline sits lower for tall Thai lines.
  const underlineBottom = isThai ? -2 : -12;

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, transform: `scale(${scale})`, transformOrigin: "558px 1179px" }}>
        <TagWall frame={frame} />
        <AbsoluteFill style={{ background: "#000", opacity: dim }} />

        <div
          role="img"
          aria-label={copy.hook.headline.map((s) => s.text).join("")}
          style={{ position: "absolute", left: 120, top: 700, width: 840, opacity: headlineOpacity }}
        >
          <PaperCard rotate={-2} style={{ padding: "56px 60px" }}>
            <div
              style={{
                fontFamily: F.display,
                fontWeight: 600,
                fontSize: copy.code === "ms" || copy.code === "id" ? 68 : 76,
                lineHeight,
                letterSpacing: isThai ? 0 : "-0.02em",
                color: C.ink,
              }}
            >
              {copy.hook.headline.map((seg, i) => {
                // Spaces stay outside the animated inline-block so they are never collapsed away.
                const [, lead, core, trail] = /^(\s*)(.*?)(\s*)$/s.exec(seg.text) ?? ["", "", seg.text, ""];
                const st = appear(frame, fps, 34 + i * 10, 26);
                return (
                  <React.Fragment key={i}>
                    {lead}
                    <span
                      style={{
                        position: "relative",
                        display: "inline-block",
                        whiteSpace: seg.em ? "nowrap" : "normal",
                        fontStyle: seg.em && !isThai ? "italic" : "normal",
                        fontWeight: seg.em && isThai ? 700 : undefined,
                        ...st,
                      }}
                    >
                      {core}
                      {seg.em && <SegmentUnderline progress={progress(frame, 70, 20)} bottom={underlineBottom} />}
                    </span>
                    {trail}
                  </React.Fragment>
                );
              })}
            </div>
          </PaperCard>
        </div>
      </div>
    </AbsoluteFill>
  );
};
