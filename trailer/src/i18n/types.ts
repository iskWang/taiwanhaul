import type { SceneId } from "../timeline";

export const LOCALE_CODES = ["en", "ms", "id", "th", "vi"] as const;
export type LocaleCode = (typeof LOCALE_CODES)[number];

/** Search-scene language chips; the viewer's own language is typed first. */
export type QueryLang = "EN" | "MS/ID" | "TH" | "VI";

/**
 * One reveal unit of a headline. Units are concatenated with NO separator,
 * so spaced languages carry their own spaces inside `text` (Thai has none).
 */
export type Segment = { text: string; em?: boolean };

/**
 * Every viewer-facing string of the trailer, per locale.
 * Diegetic Chinese (shop tags, 面膜, 第二件 6折), currency flaps, and the brand name stay out of here on purpose.
 */
export type Copy = {
  code: LocaleCode;
  /** BCP 47 tag, set as `lang` on the root so Chrome applies the right line breaking (Thai) and shaping. */
  lang: string;
  /** English name, for docs and render logs. */
  name: string;
  /** Honesty stamp on concept UI. */
  concept: string;
  rail: { search: string; cheaper: string; mustbuy: string; locals: string };
  hook: { headline: Segment[] };
  lost: { headline: string; wrong: string; right: string; footnote: string };
  price: { headline: string; sub: string };
  /** Line above the brand name ("So we're building"). */
  turn: { lead: string };
  search: { kicker: string; headline: string; result: string; firstQuery: QueryLang };
  cheaper: {
    kicker: string;
    headline: string;
    here: string;
    home: string;
    herePrice: string;
    homePrice: string;
    /** Bar lengths, in the home currency: [Taiwan price converted, home price]. Must match `less`. */
    ratio: readonly [number, number];
    less: string;
    footnote: string;
  };
  mustbuy: {
    kicker: string;
    headline: string;
    /** Pineapple cake 鳳梨酥, High-mountain oolong 高山茶, Nougat crackers 牛軋餅, Sheet masks 面膜 — in that order. */
    items: readonly [string, string, string, string];
  };
  locals: { kicker: string; headline: string; tag: string; footnote: string };
  end: { headline: string; comingSoon: string };
  /** Voice-over script per scene. Not rendered; documents the audio for this locale. */
  vo: Record<SceneId, string>;
};
