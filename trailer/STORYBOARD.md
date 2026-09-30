# TaiwanHaul — Concept Trailer

A 42-second vertical concept trailer. It explains the **problem** and the **product vision**. It is not a product demo.

| Spec | Value |
|---|---|
| Length | 42.0 s (1260 frames @ 30 fps) |
| Format | 1080 × 1920 (9:16) — made for Reels / TikTok / Shorts, where SEA travelers plan trips |
| Language | 5 versions: English, Malay, Indonesian, Thai, Vietnamese (see [Localization](#localization)). Traditional Chinese appears only as *diegetic* text (labels, tags) in every version |
| Works muted | Yes. On-screen text carries the full story; VO adds warmth, not new information |
| Remotion compositions | `TaiwanHaulTrailer-en` / `-ms` / `-id` / `-th` / `-vi` in `trailer/src/Root.tsx` |

## Honesty rules (apply to every scene)

1. The turn is **"So we're building TaiwanHaul"** — never "Introducing" or "Download now".
2. Every product-UI scene (5–8) has a small **`CONCEPT`** stamp. UI is drawn as paper cut-outs, not glossy app screenshots or phone mockups, so nobody mistakes it for a shipping app.
3. Prices are marked **"Illustrative prices"** on screen.
4. "Recommended by locals" shows **no faces, names, star ratings, or quotes**. Notes are unreadable scribbles plus the caption "Coming as we grow."
5. The end card says **"Early days"** and **"Coming soon"**.

## Visual language

- **Palette** (from the logo): paper `#FAF9F7`, ink `#1C1A18`, deep teal `#0B4B4C`, green `#2E9973`, amber `#F2A92F` (flight arc), coral `#EE6B4D` (map pin). Diegetic shop colors, used sparingly: fluoro yellow `#FFE94D`, fluoro pink `#FF9EC4`, marker red `#D7261E`.
- **Distinctly Taiwan, not stereotypical.** No Taipei 101, lanterns, bubble tea, or night-market clichés. Use the everyday visual texture instead:
  - **Mosaic tile facades** (馬賽克磁磚) — the small square ceramic tiles on old Taiwanese apartment blocks. Used as the backdrop band.
  - **Hand-written price cards** — red marker on fluorescent paper, as seen in local shops and markets.
  - **White shelf-strip price tags** with red numbers, as seen in drugstores.
- **Type**: Fraunces (editorial display, italic for emphasis) · Bricolage Grotesque (UI, labels) · Caveat (marker handwriting, Latin only) · system CJK font (PingFang TC → Noto Sans TC) for Chinese.
- **Motion**: paper cut-outs with small rotations (±2–4°) and soft drop shadows. Springy entrances, no bounce-overshoot beyond ~8 %. Editorial hard cuts on the music beat. No camera shake, no 3D, no gradients-as-decoration, no lens flares.
- **Safe area (9:16)**: keep text inside x 80–1000, y 220–1480. The bottom ~440 px is covered by platform UI.
- **Journey rail** (scenes 5–8): a small persistent bar near the top, `Search → Cheaper → Must-buy → Locals`, mirroring the homepage flow. The current step is highlighted.

## Scene table

| # | Scene | Frames | Time | On-screen text | Voice-over |
|---|---|---|---|---|---|
| 1 | Hook | 0–135 | 0:00.0–0:04.5 | **What's *actually* worth bringing home?** | "One free afternoon. Half an empty suitcase." |
| 2 | Lost in translation | 135–300 | 0:04.5–0:10.0 | **Most of it is in Chinese.** · `第二件 6折` → "2nd item, 6 fold?" → "= 40% off the 2nd item" · *(6折 means you pay 60%.)* | "But every label is in Chinese — and even the discounts need decoding." |
| 3 | Price blind spot | 300–465 | 0:10.0–0:15.5 | **Cheaper than back home?** · `NT$199` → `RM ?` `₱ ?` `฿ ?` `S$ ?` `Rp ?` `₫ ?` · *No easy way to tell.* | "Is NT$199 a good deal? Or the same price you'd pay back home?" |
| 4 | The turn | 465–555 | 0:15.5–0:18.5 | **So we're building TaiwanHaul.** | "So we're building TaiwanHaul." |
| 5 | Search | 555–735 | 0:18.5–0:24.5 | `01 — SEARCH` · **In your language.** · queries cycle → `面膜 · Sheet masks` | "Search for anything in your own language." |
| 6 | Cheaper in Taiwan | 735–885 | 0:24.5–0:29.5 | `02 — CHEAPER IN TAIWAN` · **See what's cheaper here.** · `≈ 38% less` · *Illustrative prices* | "See what's actually cheaper in Taiwan." |
| 7 | Must-buys | 885–1005 | 0:29.5–0:33.5 | `03 — MUST-BUYS` · **Worth the suitcase space.** | "Find the must-buys worth the suitcase space." |
| 8 | From locals | 1005–1125 | 0:33.5–0:37.5 | `04 — FROM LOCALS` · **Picks from people who live here.** · *Coming as we grow.* | "And learn what people in Taiwan really buy." |
| 9 | End card | 1125–1260 | 0:37.5–0:42.0 | wordmark · **Early days. Building in public.** · `Coming soon` | "TaiwanHaul. It's early — follow along at taiwanhaul.com." |

VO total ≈ 70 words in 42 s (~1.7 words/s). The slow pace is on purpose: many viewers are not native English speakers.

## Storyboard

Frame numbers below are **local to the scene** (0 = first frame of that scene).

### 1 · Hook — 0:00.0–0:04.5 (135 f)

- **Picture**: The full frame is a wall of shop tags drifting slowly upward, like scanning a drugstore aisle. Mixed styles: white shelf strips, fluoro-yellow and fluoro-pink hand-written cards. Chinese words only: 面膜 · 鳳梨酥 · 高山烏龍茶 · 牛軋餅 · 泡麵 · 醬油膏 · 買一送一 · 第二件6折 · 限時特價 · 滿千折百 · 新品上市 · 藥妝 · 伴手禮 · 辣椒醬 · 果乾 · 會員價 · 退稅.
- **Text**: from f30, the wall dims to ~35 %. A paper headline card rises in, word by word: "What's *actually* worth bringing home?" "actually" is Fraunces italic with an amber marker underline that draws on at f70.
- **Exit (f120–135)**: push in toward the `第二件6折` tag. This match-cuts into scene 2.

### 2 · Lost in translation — 0:04.5–0:10.0 (165 f)

- **Picture**: A large fluoro-yellow hand-written card, `第二件 6折`, in red marker, rotated −3°.
- f10: the headline "Most of it is in Chinese." appears above the card.
- f25: a plain grey translation chip slides in under the card: "2nd item, 6 fold?" with a wobbling "?". This is a real and common confusion; it needs no brand.
- f75: a marker strike-through crosses the chip. A green chip snaps in below it: "= 40% off the 2nd item".
- f105: a small footnote fades in: "(6折 means you pay 60%.)"
- **Exit (f150–165)**: the card slides off to the left.

### 3 · Price blind spot — 0:10.0–0:15.5 (165 f)

- **Picture**: A white drugstore shelf-strip tag for `面膜` (sheet masks — the same product that returns in scene 5). Its big red price reads `NT$199`.
- f15: headline "Cheaper than back home?"
- f30–120: under the tag, a split-flap row flips every 8 frames through `RM ?` `₱ ?` `฿ ?` `S$ ?` `Rp ?` `₫ ?` — the six currencies of the main SEA visitor markets.
- f90: sub-line in italics: "No easy way to tell."
- **Exit (f145–165)**: the tag and flap row tilt and start sliding down-left, handing off to the sweep in scene 4.

### 4 · The turn — 0:15.5–0:18.5 (90 f)

- **Picture**: The amber flight arc from the logo sweeps from bottom-left to top-right in ~20 f, with the plane at its tip. It "wipes" the frame to clean paper. A band of mosaic tiles reveals along the bottom.
- f20: the TaiwanHaul bag icon pops in at center (spring).
- f35: text below the icon — "So we're building" (Bricolage, small) and then "TaiwanHaul." (Fraunces, large).
- The music drops in on frame 0 of this scene, which is the first downbeat after the silence at the end of scene 3.

### 5 · Search — 0:18.5–0:24.5 (180 f)

- **Rail**: appears; `Search` is active.
- **Picture**: Kicker `01 — SEARCH`. Headline "In your language." A paper search bar with a teal outline and a `CONCEPT` stamp at its corner.
- Queries type in and out, ~38 f each. A language chip at the left of the bar changes with each one:
  - `EN` "sheet mask"
  - `MS/ID` "masker wajah"
  - `TH` "มาส์กหน้า"
  - `VI` "mặt nạ giấy"
- Lower in the frame, one result chip stays in place, `面膜 · Sheet masks`. A dashed teal line with an arrow connects the bar to it. The chip gives a small pulse each time a query finishes typing. The point: every language lands on the same local product.

### 6 · Cheaper in Taiwan — 0:24.5–0:29.5 (150 f)

- **Rail**: `Cheaper` is active.
- **Picture**: Kicker `02 — CHEAPER IN TAIWAN`. Headline "See what's cheaper here." Two paper rows:
  - `In Taiwan  NT$199 ≈ RM 28` — teal bar
  - `Back home  RM 45` — grey bar
- Both bars grow from f20 to f70. Their lengths are in proportion (28 : 45).
- f80: a fluoro-yellow tag stamps on: "≈ 38% less". A red marker circle is drawn around it.
- The footnote "Illustrative prices" stays visible the whole time. There is also a `CONCEPT` stamp.

### 7 · Must-buys — 0:29.5–0:33.5 (120 f)

- **Rail**: `Must-buy` is active.
- **Picture**: Kicker `03 — MUST-BUYS`. Headline "Worth the suitcase space." The logo bag (icon) sits low in the frame.
- Four flat-illustrated paper cards drop in, one every ~14 f, starting at f10. Each card shows its English name and its Chinese name:
  - Pineapple cake 鳳梨酥
  - High-mountain oolong 高山茶
  - Nougat crackers 牛軋餅
  - Sheet masks 面膜
- By f90, each card has dropped into the bag. The bag gives a small squash each time a card lands. `CONCEPT` stamp.

### 8 · From locals — 0:33.5–0:37.5 (120 f)

- **Rail**: `Locals` is active.
- **Picture**: Kicker `04 — FROM LOCALS`. Headline "Picks from people who live here." One product card sits in the center.
- Three sticky notes slap on around it, one every ~12 f, starting at f15. Each note has a coral map-pin icon, the tag "local pick", and 2–3 lines of **unreadable scribble** (SVG squiggles).
- No faces, names, or quotes.
- f80: a footnote appears: "Coming as we grow." `CONCEPT` stamp.

### 9 · End card — 0:37.5–0:42.0 (135 f)

- **Rail**: exits during f0–10.
- **Picture**: A mosaic-tile band runs across the middle third. The wordmark (`taiwanhaul.com`) sits on a paper plate over the band. The amber arc draws a loop around the wordmark, then the plane exits to the right.
- f30: "Early days. Building in public."
- f45: a `Coming soon` pill appears in teal.
- f95–135: everything holds still. This gives a clean thumbnail and a clean loop point.

## Transitions

- **Hard cuts on the beat** at every scene boundary. Scenes do their own exit motion in their last 10–20 frames, so the cuts feel like editorial "cuts on motion".
- **1 → 2**: match cut on the `第二件6折` tag (push-in, then the same tag large).
- **3 → 4**: tilt/slide-away, then the amber arc sweep. This is the only "wipe" in the film, and it marks the turn from problem to vision.
- **5 → 8**: same layout grammar in each scene (kicker, headline, paper UI). The rail advances one step per scene, so the four features read as one journey.

## Sound design

- **Music**: 120 BPM, so every scene cut (4.5 s, 10 s, 15.5 s, 18.5 s, 24.5 s, 29.5 s, 33.5 s, 37.5 s) lands on a beat. Suggested feel: bright, slightly retro Taiwanese indie / city-pop — jangly clean guitar, Rhodes, round bass. Avoid "corporate ukulele" and generic EDM risers. Use licensed or original music only.
  - 0:00–0:15.5: no drums. Just a filtered, muted guitar figure under street ambience. At 0:15.0, cut to half a second of silence.
  - 0:15.5: full band drops in with the arc sweep (the turn).
  - 0:37.5: drums out. Pad and guitar tail. Ring out on the end card.
- **Ambience (scenes 1–3)**: low shop/street bed — a scooter passing, murmur from a store PA (unintelligible Mandarin walla), a fridge hum. Keep it quiet. It sets place without clichés.
- **Foley / SFX** (small, tactile, paper-based):
  - S1: soft paper flutter as the tags drift
  - S2: marker squeak on the strike-through (f75)
  - S3: split-flap clicks, one per flip
  - S4: one airy whoosh with the arc, then a soft paper "pop" for the icon
  - S5: light key taps while typing, and a soft tick on each result pulse
  - S6: a rubber-stamp thunk (f80)
  - S7: bag rustle for each card drop
  - S8: sticky-note slaps
  - S9: one clean two-note chime on the wordmark
  - Do **not** use a real convenience-store door jingle or MRT chime. They are recognisable and possibly protected.
- **VO**: warm and conversational, not an announcer. A Southeast Asian English accent (Malaysian, Singaporean, or Filipino) fits the audience better than a US ad voice.
- **Mix**: VO leads. Duck the music about 8 dB under VO. Deliver at about −14 LUFS integrated for social platforms.

## Localization

The scene table and storyboard above use the English copy. Each locale has its own file with every on-screen string and its voice-over script: `trailer/src/i18n/<code>.ts`. The `Copy` type in `src/i18n/types.ts` makes a missing or misspelled key a type error.

| Code | Version | Currency in scene 6 | First search query |
|---|---|---|---|
| `en` | English (also for Filipino and Singaporean viewers) | RM | EN |
| `ms` | Malay | RM | MS/ID |
| `id` | Indonesian | Rp | MS/ID |
| `th` | Thai | ฿ | TH |
| `vi` | Vietnamese | ₫ | VI |

- **Localized**: every headline, kicker, chip, footnote, the journey rail, the `CONCEPT` stamp, and the VO.
- **Not localized, on purpose**: the Chinese shop text (the film is about not being able to read it), the six-currency flap row in scene 3, the four search queries in scene 5 (they *are* the multilingual demo; only their order changes so the viewer's language types first), and the brand name.
- **Prices in scene 6**: converted from NT$199 at rough 2026 rates, and still marked as illustrative. The bar ratio must match the stated "≈ 38%".
- **Thai typography**: no italics (synthetic obliques look broken), no letter-spacing, and line height ≥ 1.35 for stacked vowel/tone marks. Fonts: Noto Serif Thai with Fraunces, and IBM Plex Sans Thai with Bricolage.
- **Status**: the ms / id / th / vi strings are draft translations. **Have a native speaker review each file before publishing.** For VO, record one voice actor per language, working from the `vo` block of that locale file.

## Remotion implementation

The project lives in `trailer/`. It is separate from the deployed site and is not under `public/`.

```text
trailer/
  package.json          remotion 4.0.529 · @remotion/cli · @remotion/google-fonts · react 19
  remotion.config.ts    h264 / yuv420p
  public/               icon.png, wordmark.png (copied from brand-assets/)
  src/
    index.ts            registerRoot
    Root.tsx            one <Composition> per locale, id TaiwanHaulTrailer-<code>, 1080×1920 30fps 1260f
    timeline.ts         SCENES (id, duration) → SCENE_START, TOTAL_FRAMES
    theme.ts            palette, fonts, safe area
    components.tsx      Paper, TileField, Kicker, Headline, ConceptStamp, FlightArc, PriceCard, helpers
    i18n/               types.ts (Copy), en/ms/id/th/vi.ts, index.tsx (LOCALES, CopyProvider, useCopy)
    Trailer.tsx         <Series> of scenes + JourneyRail overlay, wrapped in the locale's CopyProvider
    scenes/             Hook, Lost, Price, Turn, Search, Cheaper, MustBuy, Locals, EndCard
```

- **Timing source of truth**: `src/timeline.ts`. Change durations there only; `Trailer.tsx` and the rail derive from it.
- **Determinism**: all randomness uses `random(seed)` from `remotion`. There is no `Math.random`, no timers, and no CSS animations — every pixel is a function of `useCurrentFrame()`.
- **Audio**: the film is silent in code. To add audio, put `music.wav` / `vo.wav` in `trailer/public/` and add `<Audio src={staticFile("music.wav")} />` in `Trailer.tsx`.
- **Fonts**: Latin, Vietnamese, and Thai fonts load through `@remotion/google-fonts` at render time (needs network). Chinese uses the system font stack (PingFang TC on macOS). On Linux render hosts, install Noto Sans TC.
- **Copy**: scenes never hard-code viewer-facing text. They read it through `useCopy()`. To add a language, add its code to `LOCALE_CODES` in `src/i18n/types.ts`, write `src/i18n/<code>.ts`, register it in `src/i18n/index.tsx`, and add it to the `render` loop in `package.json`.

```sh
cd trailer
pnpm install                       # or npm install
pnpm studio                        # live preview in Remotion Studio
pnpm render                        # → out/taiwanhaul-trailer-{en,ms,id,th,vi}.mp4
pnpm render:one th                 # → out/taiwanhaul-trailer-th.mp4
```
