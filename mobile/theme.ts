import { createContext, useContext } from "react";

export interface Palette {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textDim: string;
  accent: string;
  positive: string;
  negative: string;
  chip: string;
  chipActive: string;
}

export const darkColors: Palette = {
  bg: "#0B0E14",
  surface: "#151A23",
  surfaceAlt: "#1E2530",
  border: "#252C38",
  text: "#E6E9EF",
  textDim: "#8A93A6",
  accent: "#4C8DFF",
  positive: "#2ECC71",
  negative: "#FF5C5C",
  chip: "#1E2530",
  chipActive: "#4C8DFF",
};

export const lightColors: Palette = {
  bg: "#F4F6FA",
  surface: "#FFFFFF",
  surfaceAlt: "#E8ECF2",
  border: "#D5DCE6",
  text: "#0B0E14",
  textDim: "#5B6472",
  accent: "#2F6FED",
  positive: "#12A150",
  negative: "#E5484D",
  chip: "#E8ECF2",
  chipActive: "#2F6FED",
};

/** Fallback palette for pure helpers and the context default (dark = the original look). */
export const colors: Palette = darkColors;

export type ThemeMode = "light" | "dark" | "system";

export interface ThemeValue {
  colors: Palette;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
}

export const ThemeContext = createContext<ThemeValue>({
  colors: darkColors,
  isDark: true,
  mode: "system",
  setMode: () => {},
});

/** The active palette for the current theme. */
export function useColors(): Palette {
  return useContext(ThemeContext).colors;
}

/** The full theme value (palette + mode controls). */
export function useTheme(): ThemeValue {
  return useContext(ThemeContext);
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

/** Display symbols exactly as specified: USD "$", INR "₹", AED "D". */
export const CURRENCY_SYMBOL: Record<string, string> = { USD: "$", INR: "₹", AED: "D" };

export function currencySymbol(ccy: string): string {
  return CURRENCY_SYMBOL[ccy?.toUpperCase()] ?? "$";
}

export function formatCurrency(value: number | null | undefined, ccy: string): string {
  if (value === null || value === undefined) return "—";
  return `${currencySymbol(ccy)}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Money with no decimal places in the given currency, e.g. "$117,049" / "₹9,732,050". */
export function formatMoney0(value: number | null | undefined, ccy = "USD"): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${currencySymbol(ccy)}${Math.round(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

/** USD value with no decimal places, e.g. "$117,049". */
export function formatUsd0(value: number | null | undefined): string {
  return formatMoney0(value, "USD");
}

export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function gainColor(value: number | null | undefined): string {
  if (value === null || value === undefined) return colors.textDim;
  return value >= 0 ? colors.positive : colors.negative;
}

/** Signed currency, e.g. "+$12.30" / "-₹45.00". */
export function formatSignedCurrency(
  value: number | null | undefined, ccy: string,
): string {
  if (value === null || value === undefined) return "—";
  const sign = value >= 0 ? "+" : "-";
  return `${sign}${formatCurrency(Math.abs(value), ccy)}`;
}

/** Quantity with up to 4 decimals, trailing zeros trimmed. */
export function formatQty(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return Number(value.toFixed(4)).toString();
}

// yyyy-mm-dd <-> dd/mm/yyyy helpers for the date field.
export function isoToDisplay(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function displayToIso(display: string): string | null {
  const m = display.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]);
  const mo = Number(m[2]);
  const y = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null; // invalid date
  return `${y.toString().padStart(4, "0")}-${mo.toString().padStart(2, "0")}-${d
    .toString()
    .padStart(2, "0")}`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
