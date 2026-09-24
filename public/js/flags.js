// Country-flag emoji fallback for platforms without flag glyphs (notably Windows,
// where 🇸🇬 renders as the letters "SG"). If the browser draws colour emoji but
// not flags, register a self-hosted flag-only webfont; `unicode-range` limits it
// to flag code points, so every other character keeps using the normal fonts.
//
// Detection logic adapted from country-flag-emoji-polyfill 0.1.10 (MIT, TalkJS).
// Font: "Twemoji Country Flags" — Twemoji art, CC-BY 4.0. See
// /assets/fonts/LICENSE-TwemojiCountryFlags.md.

export const FLAG_FONT_FAMILY = 'Twemoji Country Flags';
const FLAG_FONT_URL = '/assets/fonts/TwemojiCountryFlags.woff2';
const EMOJI_FONTS = '"Twemoji Mozilla","Apple Color Emoji","Segoe UI Emoji","Segoe UI Symbol","Noto Color Emoji","EmojiOne Color","Android Emoji",sans-serif';

/** True when `emoji` renders as a colour glyph (black and white fills give the same pixel). */
function rendersInColor(emoji) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return true;
  ctx.textBaseline = 'top';
  ctx.font = `100px ${EMOJI_FONTS}`;
  ctx.scale(0.01, 0.01);
  const sample = (fill) => {
    ctx.clearRect(0, 0, 100, 100);
    ctx.fillStyle = fill;
    ctx.fillText(emoji, 0, 0);
    return ctx.getImageData(0, 0, 1, 1).data.join(',');
  };
  const onWhite = sample('#fff');
  const onBlack = sample('#000');
  return onBlack === onWhite && !onBlack.startsWith('0,0,0,');
}

/** Register the flag font when needed. Returns true if it was registered. */
export function polyfillCountryFlags({ force = false } = {}) {
  if (typeof document === 'undefined') return false;
  try {
    if (!force && !(rendersInColor('😊') && !rendersInColor('🇨🇭'))) return false;
  } catch {
    return false;
  }
  const style = document.createElement('style');
  style.textContent = `@font-face {
  font-family: "${FLAG_FONT_FAMILY}";
  unicode-range: U+1F1E6-1F1FF, U+1F3F4, U+E0062-E0063, U+E0065, U+E0067, U+E006C, U+E006E, U+E0073-E0074, U+E0077, U+E007F;
  src: url('${FLAG_FONT_URL}') format('woff2');
  font-display: swap;
}`;
  document.head.appendChild(style);
  return true;
}
