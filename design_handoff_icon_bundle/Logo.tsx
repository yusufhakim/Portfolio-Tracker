import * as React from "react";
import Svg, { Rect, Path, Circle, G } from "react-native-svg";
import { useColors, type Palette } from "@/theme";

export type LogoVariant = "mark" | "mark-outline" | "app-icon" | "wordmark";

export interface LogoProps {
  variant?: LogoVariant;   // default "mark"
  size?: number;           // px height, default 32
  color?: string;          // override; else theme.text (mark) or theme.accent (app-icon bg)
}

export function Logo({ variant = "mark", size = 32, color }: LogoProps) {
  const c: Palette = useColors();
  const fg = color ?? c.text;
  const inverse = c.bg; // for on-accent app icon

  if (variant === "mark") {
    return (
      <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <Path d="M8 44 L24 30 L38 40 L56 18" stroke={fg} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="8" cy="44" r="3.5" fill={fg} />
        <Circle cx="56" cy="18" r="4.5" fill={fg} />
      </Svg>
    );
  }

  if (variant === "mark-outline") {
    return (
      <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <Rect x="4" y="4" width="56" height="56" rx="14" stroke={fg} strokeWidth={2.5} fill="none" />
        <Path d="M18 46 L28 36 L36 40 L48 24" stroke={fg} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="48" cy="24" r="3.5" fill={fg} />
      </Svg>
    );
  }

  if (variant === "app-icon") {
    const bg = color ?? c.accent;
    return (
      <Svg width={size} height={size} viewBox="0 0 128 128" fill="none">
        <Rect x="0" y="0" width="128" height="128" rx="28" fill={bg} />
        <Path d="M22 88 L48 62 L72 78 L106 40" stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx="22" cy="88" r="6" fill="#FFFFFF" />
        <Circle cx="106" cy="40" r="8" fill="#FFFFFF" />
      </Svg>
    );
  }

  // wordmark
  const w = size * 5;
  return (
    <Svg width={w} height={size} viewBox="0 0 320 64" fill="none">
      <Rect x="0" y="8" width="48" height="48" rx="11" fill={fg} />
      <Path d="M9 44 L21 32 L31 38 L41 22" stroke={inverse} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx="9" cy="44" r="3" fill={inverse} />
      <Circle cx="41" cy="22" r="4" fill={inverse} />
      {/* Wordmark set as plain SVG text — swap for a bundled font at ship time if desired. */}
      <G>
        {/* @ts-ignore react-native-svg Text import */}
      </G>
    </Svg>
  );
}
