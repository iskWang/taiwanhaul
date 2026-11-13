import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { appear, clamp, ConceptStamp, Headline, Kicker, pop } from "../components";
import { useCopy } from "../i18n";
import { C, F, SAFE } from "../theme";

/** Flat paper-cutout product icons. No photos, no brand marks. */
const IconWrap: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <svg width={120} height={120} viewBox="0 0 104 104">
    {children}
  </svg>
);

const PineappleCakeIcon: React.FC = () => (
  <IconWrap>
    <rect x={14} y={30} width={76} height={62} rx={10} fill="#E9C9B4" stroke={C.ink} strokeWidth={3} />
    <path d="M22 40 L90 40 M22 54 L90 54 M22 68 L90 68 M22 82 L90 82" stroke="#C99A73" strokeWidth={3} />
    <path d="M34 30 L48 30 L40 12 Z" fill={C.green} stroke={C.ink} strokeWidth={2} />
  </IconWrap>
);

const OolongLeafIcon: React.FC = () => (
  <IconWrap>
    <path
      d="M52 14 C78 22 86 52 62 82 C46 96 24 88 20 66 C16 42 30 20 52 14 Z"
      fill={C.green}
      stroke={C.ink}
      strokeWidth={3}
    />
    <path d="M52 20 C46 42 42 62 34 82" stroke={C.paper} strokeWidth={3} fill="none" />
  </IconWrap>
);

const NougatIcon: React.FC = () => (
  <IconWrap>
    <rect x={16} y={26} width={72} height={52} rx={14} fill="#F3E4C8" stroke={C.ink} strokeWidth={3} />
    <circle cx={34} cy={44} r={5} fill="#C99A73" />
    <circle cx={56} cy={38} r={4} fill="#C99A73" />
    <circle cx={70} cy={54} r={5} fill="#C99A73" />
    <circle cx={44} cy={62} r={4} fill="#C99A73" />
  </IconWrap>
);

const SheetMaskIcon: React.FC = () => (
  <IconWrap>
    <path
      d="M52 14 C74 14 88 34 88 58 C88 82 72 94 52 94 C32 94 16 82 16 58 C16 34 30 14 52 14 Z"
      fill={C.shopPink}
      stroke={C.ink}
      strokeWidth={3}
    />
    <circle cx={38} cy={52} r={7} fill={C.paper} />
    <circle cx={66} cy={52} r={7} fill={C.paper} />
    <path d="M40 74 Q52 82 64 74" stroke={C.paper} strokeWidth={4} fill="none" strokeLinecap="round" />
  </IconWrap>
);

type Item = { zh: string; icon: React.ReactNode; rotate: number };

/** Order matches `copy.mustbuy.items`. */
const ITEMS: Item[] = [
  { zh: "鳳梨酥", icon: <PineappleCakeIcon />, rotate: -3 },
  { zh: "高山茶", icon: <OolongLeafIcon />, rotate: 3 },
  { zh: "牛軋餅", icon: <NougatIcon />, rotate: -3 },
  { zh: "面膜", icon: <SheetMaskIcon />, rotate: 3 },
];

const SLOT_X = [300, 780, 300, 780];
const SLOT_Y = [725, 725, 1013, 1013];
const BAG_X = 540;
const BAG_OPENING_Y = 1170;
const BAG_CENTER_Y = 1300;
const DROP_START = [10, 24, 38, 52];
const TUCK_DELAY = 20;
const TUCK_DUR = 18;

const ProductCard: React.FC<{ item: Item; name: string; index: number; frame: number; fps: number }> = ({
  item,
  name,
  index,
  frame,
  fps,
}) => {
  const start = DROP_START[index];
  const enter = pop(frame, fps, start);
  const enterClamped = Math.min(1, Math.max(0, enter));
  const tuckStart = start + TUCK_DELAY;
  const t = interpolate(frame, [tuckStart, tuckStart + TUCK_DUR], [0, 1], clamp);

  const restX = SLOT_X[index];
  const restY = SLOT_Y[index];
  const entryOffsetY = -(1 - enterClamped) * 130;
  const x = restX + (BAG_X - restX) * t;
  const y = restY + entryOffsetY + (BAG_OPENING_Y - restY) * t;

  const tuckScale = interpolate(t, [0, 1], [1, 0.3], clamp);
  const scale = enter * tuckScale;
  const fade = interpolate(t, [0, 0.7, 1], [1, 1, 0], clamp);
  const opacity = enterClamped * fade;
  const rotate = item.rotate + (1 - enterClamped) * 18 + t * 12;

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) rotate(${rotate}deg) scale(${Math.max(0, scale)})`,
        opacity,
        zIndex: 5,
      }}
    >
      <div
        style={{
          width: 320,
          background: C.white,
          borderRadius: 18,
          boxShadow: "0 2px 0 rgba(28,26,24,0.06), 0 18px 40px -18px rgba(28,26,24,0.35)",
          padding: "22px 20px 18px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}
      >
        {item.icon}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: F.sans,
              fontWeight: 700,
              fontSize: 34,
              color: C.ink,
              lineHeight: 1.2,
              textWrap: "balance",
            }}
          >
            {name}
          </div>
          <div style={{ fontFamily: F.cjk, fontWeight: 600, fontSize: 30, color: C.muted, marginTop: 4 }}>
            {item.zh}
          </div>
        </div>
      </div>
    </div>
  );
};

export const MustBuy: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { mustbuy } = useCopy();

  const squash = Math.min(
    1,
    DROP_START.reduce((acc, s) => {
      const end = s + TUCK_DELAY + TUCK_DUR;
      const d = Math.abs(frame - end);
      return acc + Math.max(0, 1 - d / 8);
    }, 0),
  );
  const bagPop = pop(frame, fps, 0);
  const bagOpacity = Math.min(1, Math.max(0, bagPop));
  const bagScaleX = bagPop * (1 + 0.06 * squash);
  const bagScaleY = bagPop * (1 - 0.11 * squash);

  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: SAFE.left, top: 360, width: SAFE.right - SAFE.left, ...appear(frame, fps, 0) }}>
        <Kicker>{mustbuy.kicker}</Kicker>
        <Headline size={82} style={{ marginTop: 14 }}>
          {mustbuy.headline}
        </Headline>
      </div>

      {ITEMS.map((item, i) => (
        <ProductCard key={item.zh} item={item} name={mustbuy.items[i]} index={i} frame={frame} fps={fps} />
      ))}

      <div
        style={{
          position: "absolute",
          left: BAG_X,
          top: BAG_CENTER_Y,
          width: 400,
          transformOrigin: "bottom center",
          transform: `translate(-50%, -50%) scale(${bagScaleX}, ${bagScaleY})`,
          opacity: bagOpacity,
          zIndex: 10,
        }}
      >
        <Img src={staticFile("icon.png")} style={{ width: "100%", display: "block" }} />
      </div>

      <ConceptStamp style={{ position: "absolute", left: 800, top: 1160 }} />
    </AbsoluteFill>
  );
};
