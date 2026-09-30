export const FPS = 30;
export const WIDTH = 1080;
export const HEIGHT = 1920;

// Hard cuts, no overlap. Every boundary lands on a 120 BPM beat (multiple of 15 frames).
// Mirrors the scene table in STORYBOARD.md; change durations here only.
export const SCENES = [
  { id: "hook", duration: 135 },
  { id: "lost", duration: 165 },
  { id: "price", duration: 165 },
  { id: "turn", duration: 90 },
  { id: "search", duration: 180 },
  { id: "cheaper", duration: 150 },
  { id: "mustbuy", duration: 120 },
  { id: "locals", duration: 120 },
  { id: "end", duration: 135 },
] as const;

export type SceneId = (typeof SCENES)[number]["id"];

export const SCENE_START: Record<SceneId, number> = (() => {
  const starts = {} as Record<SceneId, number>;
  let at = 0;
  for (const scene of SCENES) {
    starts[scene.id] = at;
    at += scene.duration;
  }
  return starts;
})();

export const TOTAL_FRAMES = SCENES.reduce((sum, s) => sum + s.duration, 0);
