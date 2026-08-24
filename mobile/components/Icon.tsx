import * as React from "react";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";

import { useColors, type Palette } from "@/theme";

// Stroke icon set from the design handoff (24-grid, 1.5px strokes). Every glyph
// inherits useColors().text by default so it follows light/dark/system; a few
// carry a semantic positive/negative default. Rebuilt with react-native-svg
// components (the handoff's Icon.tsx shipped corrupted with web SVG tags).
export type IconName =
  | "chevron.back"
  | "chevron.forward"
  | "chevron.up"
  | "chevron.down"
  | "close"
  | "menu"
  | "search"
  | "app.lock"
  | "asset.add"
  | "trade.buy"
  | "trade.sell"
  | "transactions"
  | "holdings"
  | "chart.bar"
  | "chart.line"
  | "allocation"
  | "currency.usd"
  | "currency.inr"
  | "trend.up"
  | "trend.down"
  | "fx.convert"
  | "card"
  | "wallet"
  | "statement"
  | "calendar"
  | "calendar.today"
  | "clock"
  | "refresh"
  | "sync"
  | "live"
  | "secure"
  | "appearance"
  | "edit"
  | "delete"
  | "sort"
  | "filter"
  | "controls"
  | "more"
  | "check"
  | "watchlist";

type Def = { paths: (color: string) => React.ReactNode; defaultColor?: "positive" | "negative" };

const REGISTRY: Record<IconName, Def> = {
  "chevron.back": { paths: () => <Path d="M15 5 L8 12 L15 19" /> },
  "chevron.forward": { paths: () => <Path d="M9 5 L16 12 L9 19" /> },
  "chevron.up": { paths: () => <Path d="M6 15 L12 9 L18 15" /> },
  "chevron.down": { paths: () => <Path d="M6 9 L12 15 L18 9" /> },
  close: { paths: () => <Path d="M6 6 L18 18 M18 6 L6 18" /> },
  menu: { paths: () => <Path d="M4 7 H20 M4 12 H20 M4 17 H14" /> },
  search: {
    paths: () => (
      <>
        <Circle cx="10.5" cy="10.5" r="6" />
        <Line x1="15" y1="15" x2="20" y2="20" />
      </>
    ),
  },
  "app.lock": {
    paths: () => (
      <>
        <Path d="M12 3 L4 7 V12 C 4 16 7.5 19.5 12 21 C 16.5 19.5 20 16 20 12 V7 Z" />
        <Path d="M9 12 L11 14 L15 10" />
      </>
    ),
  },
  "asset.add": {
    paths: () => (
      <>
        <Circle cx="12" cy="12" r="8" />
        <Line x1="12" y1="8" x2="12" y2="16" />
        <Line x1="8" y1="12" x2="16" y2="12" />
      </>
    ),
  },
  "trade.buy": { paths: () => <Path d="M12 5 V19 M6 13 L12 19 L18 13" />, defaultColor: "positive" },
  "trade.sell": { paths: () => <Path d="M12 19 V5 M6 11 L12 5 L18 11" />, defaultColor: "negative" },
  transactions: {
    paths: () => (
      <>
        <Rect x="4" y="7" width="16" height="12" rx="2" />
        <Path d="M4 11 H20" />
        <Path d="M8 4 V8 M16 4 V8" />
      </>
    ),
  },
  holdings: {
    paths: () => (
      <>
        <Rect x="4" y="4" width="7" height="7" rx="1.5" />
        <Rect x="13" y="4" width="7" height="7" rx="1.5" />
        <Rect x="4" y="13" width="7" height="7" rx="1.5" />
        <Rect x="13" y="13" width="7" height="7" rx="1.5" />
      </>
    ),
  },
  "chart.bar": {
    paths: () => (
      <>
        <Path d="M4 18 V14 M9 18 V10 M14 18 V6 M19 18 V12" />
        <Line x1="3" y1="20" x2="21" y2="20" />
      </>
    ),
  },
  "chart.line": {
    paths: () => (
      <>
        <Path d="M4 16 L9 11 L13 15 L20 6" />
        <Path d="M14 6 L20 6 L20 12" />
      </>
    ),
  },
  allocation: {
    paths: () => (
      <>
        <Path d="M12 3 A9 9 0 1 1 3 12 H12 Z" />
        <Path d="M12 3 V12 L20.5 8" />
      </>
    ),
  },
  "currency.usd": {
    paths: () => (
      <>
        <Circle cx="12" cy="12" r="8" />
        <Path d="M15 9 H10.5 A2 2 0 0 0 10.5 13 H13.5 A2 2 0 0 1 13.5 17 H9" />
        <Path d="M12 6 V8 M12 17 V19" />
      </>
    ),
  },
  "currency.inr": {
    paths: () => (
      <>
        <Circle cx="12" cy="12" r="8" />
        <Path d="M9 8 H15 M9 11 H15 M9 8 C 13 8 14 14 8 14 L14 18 M9 14 H12" />
      </>
    ),
  },
  "trend.up": {
    paths: () => <Path d="M4 15 L9 10 L13 14 L20 7 M14 7 L20 7 L20 13" />,
    defaultColor: "positive",
  },
  "trend.down": {
    paths: () => <Path d="M4 9 L9 14 L13 10 L20 17 M14 17 L20 17 L20 11" />,
    defaultColor: "negative",
  },
  "fx.convert": {
    paths: () => (
      <>
        <Path d="M20 6 A8 8 0 1 0 20 18" />
        <Path d="M4 12 H12" />
        <Path d="M16 12 H20" />
      </>
    ),
  },
  card: {
    paths: () => (
      <>
        <Rect x="4" y="5" width="16" height="14" rx="2" />
        <Path d="M4 9 H20" />
        <Rect x="7" y="12" width="5" height="4" rx="0.5" />
        <Path d="M14 13 H17 M14 16 H17" />
      </>
    ),
  },
  wallet: {
    paths: () => (
      <>
        <Path d="M4 8 H20 L18 20 H6 Z" />
        <Path d="M8 8 V6 A4 4 0 0 1 16 6 V8" />
      </>
    ),
  },
  statement: {
    paths: () => (
      <>
        <Rect x="5" y="4" width="14" height="16" rx="2" />
        <Path d="M9 9 H15 M9 13 H15 M9 17 H13" />
      </>
    ),
  },
  calendar: {
    paths: () => (
      <>
        <Rect x="4" y="6" width="16" height="14" rx="2" />
        <Path d="M4 10 H20" />
        <Path d="M8 3 V7 M16 3 V7" />
      </>
    ),
  },
  "calendar.today": {
    paths: (color: string) => (
      <>
        <Rect x="4" y="6" width="16" height="14" rx="2" />
        <Path d="M4 10 H20 M8 3 V7 M16 3 V7" />
        <Circle cx="12" cy="15" r="1" fill={color} stroke="none" />
      </>
    ),
  },
  clock: {
    paths: () => (
      <>
        <Circle cx="12" cy="12" r="8" />
        <Path d="M12 8 V12 L15 14" />
      </>
    ),
  },
  refresh: {
    paths: () => (
      <>
        <Path d="M20 7 A9 9 0 1 0 20 17" />
        <Path d="M20 4 V9 H15" />
      </>
    ),
  },
  sync: {
    paths: () => (
      <>
        <Path d="M4 12 A8 8 0 0 1 20 12" />
        <Path d="M4 8 V12 H8" />
        <Path d="M20 16 V12 H16" />
      </>
    ),
  },
  live: {
    paths: (color: string) => (
      <>
        <Path d="M5 12 A7 7 0 1 1 19 12" />
        <Path d="M12 8 A4 4 0 1 1 12 16" />
        <Circle cx="12" cy="12" r="1" fill={color} stroke="none" />
      </>
    ),
  },
  secure: {
    paths: () => <Path d="M4 7 L12 3 L20 7 V13 C 20 17 16 20 12 21 C 8 20 4 17 4 13 Z" />,
  },
  appearance: {
    paths: () => (
      <>
        <Path d="M12 3 V5 M12 19 V21 M4.9 4.9 L6.3 6.3 M17.7 17.7 L19.1 19.1 M3 12 H5 M19 12 H21 M4.9 19.1 L6.3 17.7 M17.7 6.3 L19.1 4.9" />
        <Circle cx="12" cy="12" r="4" />
      </>
    ),
  },
  edit: {
    paths: () => (
      <>
        <Path d="M14 5 L19 10 L9 20 H4 V15 Z" />
        <Path d="M13 6 L18 11" />
      </>
    ),
  },
  delete: {
    paths: () => (
      <>
        <Path d="M5 7 H19 L18 20 H6 Z" />
        <Path d="M9 7 V5 A2 2 0 0 1 11 3 H13 A2 2 0 0 1 15 5 V7" />
        <Path d="M10 11 V17 M14 11 V17" />
      </>
    ),
    defaultColor: "negative",
  },
  sort: {
    paths: () => (
      <>
        <Path d="M6 5 V19 M6 5 L11 10 M6 5 L3 8" />
        <Path d="M18 19 V5 M18 19 L13 14 M18 19 L21 16" />
      </>
    ),
  },
  filter: { paths: () => <Path d="M4 6 H20 M7 12 H17 M10 18 H14" /> },
  controls: {
    paths: () => (
      <>
        <Circle cx="7" cy="9" r="2" />
        <Circle cx="17" cy="15" r="2" />
        <Path d="M4 9 H5 M9 9 H20 M4 15 H15 M19 15 H20" />
      </>
    ),
  },
  more: {
    paths: (color: string) => (
      <>
        <Circle cx="12" cy="6" r="1.5" fill={color} stroke="none" />
        <Circle cx="12" cy="12" r="1.5" fill={color} stroke="none" />
        <Circle cx="12" cy="18" r="1.5" fill={color} stroke="none" />
      </>
    ),
  },
  check: { paths: () => <Path d="M5 12 L10 17 L19 7" /> },
  watchlist: {
    paths: () => <Path d="M12 3 L14 9 L20 9 L15 13 L17 20 L12 16 L7 20 L9 13 L4 9 L10 9 Z" />,
  },
};

export interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export function Icon({ name, size = 22, color, strokeWidth = 1.5 }: IconProps) {
  const c: Palette = useColors();
  const def = REGISTRY[name];
  const resolved =
    color ??
    (def.defaultColor === "positive"
      ? c.positive
      : def.defaultColor === "negative"
        ? c.negative
        : c.text);
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={resolved}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {def.paths(resolved)}
    </Svg>
  );
}
