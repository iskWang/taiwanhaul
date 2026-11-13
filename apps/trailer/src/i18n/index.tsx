import React, { createContext, useContext } from "react";
import { en } from "./en";
import { id } from "./id";
import { ms } from "./ms";
import { th } from "./th";
import { vi } from "./vi";
import type { Copy, LocaleCode } from "./types";

export { LOCALE_CODES } from "./types";
export type { Copy, LocaleCode, QueryLang, Segment } from "./types";

export const LOCALES: Record<LocaleCode, Copy> = { en, ms, id, th, vi };

const CopyContext = createContext<Copy>(en);

export const CopyProvider: React.FC<{ locale: LocaleCode; children: React.ReactNode }> = ({ locale, children }) => (
  <CopyContext.Provider value={LOCALES[locale]}>{children}</CopyContext.Provider>
);

/** Strings for the locale being rendered. */
export const useCopy = () => useContext(CopyContext);
