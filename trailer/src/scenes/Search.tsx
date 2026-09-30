import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { appear, ConceptStamp, Headline, Kicker, PaperCard, pop, typed } from "../components";
import { useCopy } from "../i18n";
import type { QueryLang } from "../i18n/types";
import { C, F, SAFE } from "../theme";

type Query = { lang: QueryLang; text: string };

// Every language lands on the same local product: EN → MS/ID → TH → VI.
const QUERIES: Query[] = [
  { lang: "EN", text: "sheet mask" },
  { lang: "MS/ID", text: "masker wajah" },
  { lang: "TH", text: "มาส์กหน้า" },
  { lang: "VI", text: "mặt nạ giấy" },
];

const BAR_IN = 0;
const CHIP_IN = 6;
const RESULT_IN = 14;
const QSTART = 28;
const QLEN = 38;
const TYPE_IN = 17;
const HOLD = 10;
const TYPE_OUT = QLEN - TYPE_IN - HOLD;
const PULSE_STARTS = QUERIES.map((_, i) => QSTART + i * QLEN + TYPE_IN);

/** Start the list at the query whose chip is `first`; the order of the rest stays. */
const rotateTo = (queries: Query[], first: QueryLang): Query[] => {
  const at = Math.max(0, queries.findIndex((q) => q.lang === first));
  return [...queries.slice(at), ...queries.slice(0, at)];
};

/** Grapheme-safe erase: mirror of `typed`, shrinking from the end at a steady (linear) rate. */
const erased = (text: string, frame: number, start: number, duration: number) => {
  const chars = Array.from(text);
  const t = Math.min(1, Math.max(0, (frame - start) / duration));
  const count = Math.ceil(chars.length * (1 - t));
  return chars.slice(0, count).join("");
};

const activeQuery = (queries: Query[], frame: number) => {
  const idx = Math.min(queries.length - 1, Math.max(0, Math.floor((frame - QSTART) / QLEN)));
  const slotStart = QSTART + idx * QLEN;
  const local = frame - slotStart;
  const q = queries[idx];
  const n = Math.max(1, Array.from(q.text).length);
  let text = "";
  if (local < 0) text = "";
  else if (local < TYPE_IN) text = typed(q.text, frame, slotStart, n / TYPE_IN);
  else if (local < TYPE_IN + HOLD) text = q.text;
  else text = erased(q.text, frame, slotStart + TYPE_IN + HOLD, TYPE_OUT);
  return { q, text };
};

/** One-shot bump each time a query finishes typing in. */
const pulseScale = (frame: number) => {
  let s = 1;
  for (const t of PULSE_STARTS) {
    const d = frame - t;
    if (d >= 0 && d <= 12) s = Math.max(s, 1 + Math.sin((d / 12) * Math.PI) * 0.16);
  }
  return s;
};

export const Search: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const copy = useCopy();
  const queries = rotateTo(QUERIES, copy.search.firstQuery);
  const { q, text } = activeQuery(queries, frame);

  const barP = Math.min(1, Math.max(0, pop(frame, fps, BAR_IN)));
  const chipP = Math.min(1, Math.max(0, pop(frame, fps, CHIP_IN)));
  const resultP = Math.min(1, Math.max(0, pop(frame, fps, RESULT_IN)));
  const cursorOn = Math.floor(frame / 15) % 2 === 0;
  const scale = pulseScale(frame);

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: SAFE.left, right: 80, top: 360 }}>
        <Kicker style={appear(frame, fps, 0, 14)}>{copy.search.kicker}</Kicker>
      </div>

      <div style={{ position: "absolute", left: SAFE.left, right: 80, top: 410 }}>
        <Headline size={80} style={appear(frame, fps, 4, 22)}>
          {copy.search.headline}
        </Headline>
      </div>

      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          right: 80,
          top: 650,
          display: "flex",
          alignItems: "center",
          gap: 20,
          opacity: barP,
          transform: `translateY(${(1 - barP) * 24}px)`,
        }}
      >
        <div
          style={{
            width: 190,
            height: 150,
            flexShrink: 0,
            borderRadius: 28,
            border: `3px solid ${C.teal}`,
            background: C.white,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: F.sans,
            fontWeight: 800,
            fontSize: 34,
            color: C.teal,
            transform: `rotate(-2deg) scale(${0.85 + chipP * 0.15})`,
            boxShadow: "0 18px 36px -18px rgba(28,26,24,0.4)",
          }}
        >
          {q.lang}
        </div>

        <div style={{ position: "relative", flex: 1 }}>
          <PaperCard
            rotate={1.4}
            style={{
              border: `3px solid ${C.teal}`,
              height: 150,
              display: "flex",
              alignItems: "center",
              padding: "0 44px",
              gap: 24,
            }}
          >
            <svg width="44" height="44" viewBox="0 0 30 30" style={{ flexShrink: 0 }}>
              <circle cx="12" cy="12" r="9" fill="none" stroke={C.teal} strokeWidth={4} />
              <line x1="19" y1="19" x2="27" y2="27" stroke={C.teal} strokeWidth={4} strokeLinecap="round" />
            </svg>
            <span style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 60, color: C.ink, whiteSpace: "nowrap" }}>
              {text}
            </span>
            <span style={{ width: 4, height: 66, background: C.ink, opacity: cursorOn ? 1 : 0.15 }} />
          </PaperCard>
          <ConceptStamp rotate={-9} style={{ position: "absolute", top: -30, right: 24 }} />
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: SAFE.left + 95 - 2,
          top: 800,
          width: 4,
          height: 300 * resultP,
          borderLeft: `4px dashed ${C.teal}`,
          opacity: resultP,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: SAFE.left + 95 - 10,
          top: 800 + 300 * resultP - 4,
          width: 0,
          height: 0,
          borderLeft: "10px solid transparent",
          borderRight: "10px solid transparent",
          borderTop: `14px solid ${C.teal}`,
          opacity: resultP,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: SAFE.left,
          top: 1120,
          opacity: resultP,
          transform: `translateY(${(1 - resultP) * 18}px) scale(${scale})`,
          transformOrigin: "left center",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 16,
            padding: "26px 44px",
            borderRadius: 999,
            background: C.teal,
            boxShadow: "0 18px 40px -18px rgba(11,75,76,0.5)",
          }}
        >
          <span style={{ fontFamily: F.cjk, fontWeight: 600, fontSize: 48, color: C.white }}>面膜</span>
          <span style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 42, color: "rgba(255,255,255,0.75)" }}>
            ·
          </span>
          <span style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 42, color: C.white }}>{copy.search.result}</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
