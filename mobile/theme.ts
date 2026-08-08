export const colors = {
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

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
};

export function formatCurrency(value: number | null | undefined, ccy: string): string {
  if (value === null || value === undefined) return "—";
  const symbol = ccy === "INR" ? "₹" : "$";
  return `${symbol}${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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
