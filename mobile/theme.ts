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
  bg: "#020301",
  surface: "#0E1805",
  surfaceAlt: "#182D09",
  border: "#21420D",
  text: "#ECE6D7",
  textDim: "#9EB07A",
  accent: "#6B9C3A",
  positive: "#9EB07A",
  negative: "#E4A896",
  chip: "#182D09",
  chipActive: "#6B9C3A",
};

export const lightColors: Palette = {
  bg: "#F6F3EE",
  surface: "#FFFFFF",
  surfaceAlt: "#ECE6D7",
  border: "#D6CDBB",
  text: "#0E1805",
  textDim: "#6B6B55",
  accent: "#305711",
  positive: "#305711",
  negative: "#B5411C",
  chip: "#ECE6D7",
  chipActive: "#305711",
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

/** Quantity with thousands separators and up to 4 decimals (trailing zeros trimmed). */
export function formatQty(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
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
