import React from "react";
import { Composition } from "remotion";
import { LOCALE_CODES } from "./i18n";
import { Trailer } from "./Trailer";
import { FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from "./timeline";

/** One composition per locale: TaiwanHaulTrailer-en, -ms, -id, -th, -vi. */
export const Root: React.FC = () => (
  <>
    {LOCALE_CODES.map((locale) => (
      <Composition
        key={locale}
        id={`TaiwanHaulTrailer-${locale}`}
        component={Trailer}
        defaultProps={{ locale }}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    ))}
  </>
);
