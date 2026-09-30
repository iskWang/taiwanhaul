import React from "react";
import { AbsoluteFill, interpolate, Series, useCurrentFrame } from "remotion";
import { clamp, Paper } from "./components";
import { CopyProvider, LOCALES, LocaleCode, useCopy } from "./i18n";
import { Cheaper } from "./scenes/Cheaper";
import { EndCard } from "./scenes/EndCard";
import { Hook } from "./scenes/Hook";
import { Locals } from "./scenes/Locals";
import { Lost } from "./scenes/Lost";
import { MustBuy } from "./scenes/MustBuy";
import { Price } from "./scenes/Price";
import { Search } from "./scenes/Search";
import { Turn } from "./scenes/Turn";
import { C, F, RAIL_TOP } from "./theme";
import { SCENE_START, SCENES, SceneId } from "./timeline";

const SCENE_COMPONENTS: Record<SceneId, React.FC> = {
  hook: Hook,
  lost: Lost,
  price: Price,
  turn: Turn,
  search: Search,
  cheaper: Cheaper,
  mustbuy: MustBuy,
  locals: Locals,
  end: EndCard,
};

const RAIL = ["search", "cheaper", "mustbuy", "locals"] as const satisfies readonly SceneId[];

/** Homepage flow Search → Cheaper → Must-buy → Locals, shown during the four feature scenes. */
const JourneyRail: React.FC = () => {
  const frame = useCurrentFrame();
  const { rail } = useCopy();
  const from = SCENE_START.search;
  const until = SCENE_START.end;
  const opacity = interpolate(frame, [from, from + 10, until, until + 10], [0, 1, 1, 0], clamp);
  if (opacity === 0) return null;
  const active = RAIL.reduce((acc, scene, i) => (frame >= SCENE_START[scene] ? i : acc), 0);

  return (
    <div
      style={{
        position: "absolute",
        top: RAIL_TOP,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        opacity,
        transform: `translateY(${(1 - opacity) * -16}px)`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {RAIL.map((scene, i) => {
          const state = i < active ? "done" : i === active ? "active" : "todo";
          return (
            <React.Fragment key={scene}>
              {i > 0 && (
                <span style={{ fontFamily: F.sans, fontSize: 24, color: i <= active ? C.teal : C.line }}>→</span>
              )}
              <div
                style={{
                  padding: "8px 18px",
                  whiteSpace: "nowrap",
                  borderRadius: 999,
                  fontFamily: F.sans,
                  fontWeight: state === "active" ? 800 : 600,
                  fontSize: 24,
                  color: state === "active" ? C.white : state === "done" ? C.teal : C.muted,
                  background: state === "active" ? C.teal : "transparent",
                  border: `2px solid ${state === "todo" ? C.line : C.teal}`,
                }}
              >
                {rail[scene]}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export const Trailer: React.FC<{ locale: LocaleCode }> = ({ locale }) => (
  <CopyProvider locale={locale}>
    <AbsoluteFill lang={LOCALES[locale].lang}>
      <Paper />
      <Series>
        {SCENES.map((scene) => {
          const Scene = SCENE_COMPONENTS[scene.id];
          return (
            <Series.Sequence key={scene.id} durationInFrames={scene.duration} name={scene.id}>
              <Scene />
            </Series.Sequence>
          );
        })}
      </Series>
      <JourneyRail />
    </AbsoluteFill>
  </CopyProvider>
);
