import { loadFont as loadBricolage } from "@remotion/google-fonts/BricolageGrotesque";
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadPlexThai } from "@remotion/google-fonts/IBMPlexSansThai";
import { loadFont as loadNotoSerifThai } from "@remotion/google-fonts/NotoSerifThai";

const fraunces = loadFraunces("normal", {
  weights: ["400", "600", "700", "800"],
  subsets: ["latin", "latin-ext", "vietnamese"],
}).fontFamily;
loadFraunces("italic", { weights: ["400", "600"], subsets: ["latin", "latin-ext", "vietnamese"] });
const bricolage = loadBricolage("normal", {
  weights: ["400", "600", "800"],
  subsets: ["latin", "latin-ext", "vietnamese"],
}).fontFamily;
const caveat = loadCaveat("normal", { weights: ["600", "700"], subsets: ["latin"] }).fontFamily;
// Thai companions, picked up per glyph through the font stacks below.
const serifThai = loadNotoSerifThai("normal", { weights: ["400", "600", "700"], subsets: ["thai"] }).fontFamily;
const sansThai = loadPlexThai("normal", { weights: ["400", "600", "700"], subsets: ["thai"] }).fontFamily;

// CJK comes from the system (PingFang TC on macOS; Noto Sans TC on Linux).
const cjk = `"PingFang TC", "Noto Sans TC", "Heiti TC", sans-serif`;

export const F = {
  /** Editorial display serif. Use fontStyle: "italic" for emphasis words. Thai → Noto Serif Thai. */
  display: `"${fraunces}", "${serifThai}", ${cjk}`,
  /** UI / labels / body. Covers Vietnamese diacritics. Thai → IBM Plex Sans Thai. */
  sans: `"${bricolage}", "${sansThai}", ${cjk}`,
  /** Marker handwriting, Latin only. */
  hand: `"${caveat}", ${cjk}`,
  /** Chinese shop text (tags, price cards). Max useful weight: 600. */
  cjk,
} as const;

/** Palette. Brand colors come from the logo; `shop*` colors are diegetic and used sparingly. */
export const C = {
  paper: "#FAF9F7",
  paperDeep: "#EFEAE4",
  line: "#E7E2DC",
  ink: "#1C1A18",
  muted: "#6B655F",
  teal: "#0B4B4C",
  green: "#2E9973",
  amber: "#F2A92F",
  coral: "#EE6B4D",
  white: "#FFFFFF",
  shopYellow: "#FFE94D",
  shopPink: "#FF9EC4",
  markerRed: "#D7261E",
  /** Mosaic-tile facade colors (馬賽克磁磚): cream, salmon, sage, pale teal, sand. */
  tiles: ["#F3E9DA", "#E9C9B4", "#CFE0D2", "#BFD8D6", "#E6D7B8", "#F7F1E6"],
} as const;

/** 9:16 platform-safe content box (px). Keep text inside it. */
export const SAFE = { left: 80, right: 1000, top: 220, bottom: 1480 } as const;

/** Vertical position of the journey rail (scenes 5–8). Scene content should start below RAIL_BOTTOM. */
export const RAIL_TOP = 230;
export const RAIL_BOTTOM = 300;
