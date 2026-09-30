import type { StyleProp, ViewStyle } from "react-native";
import Svg, { Path } from "react-native-svg";

import { useColors } from "@/theme";

// The new UAE Dirham symbol, traced from the official artwork to a vector path
// (evenodd fill) on a 100 × 87 box. Rendered as SVG so it scales with the
// surrounding font size and takes the theme/text colour — i.e. it behaves like a
// text glyph, not a bitmap. No system font carries this symbol yet.
export const DIRHAM_VB = { w: 100, h: 87 };
export const DIRHAM_PATH =
  "M41.13 86.98L8.80 86.94L10.36 84.91L11.53 82.41L12.39 79.36L12.86 76.54L13.02 72.40L13.02 56.68L12.90 56.57L7.97 56.57L6.25 56.41L5.08 56.02L3.28 54.93L1.84 53.40L0.66 51.29L0.04 48.94L-0.04 45.43L1.88 46.95L3.60 47.73L12.98 47.81L13.02 39.17L6.02 38.98L3.52 37.72L1.68 35.81L0.59 33.70L0.04 31.59L-0.04 28.30L0.23 28.11L1.25 29.12L2.58 29.91L4.22 30.38L13.02 30.41L13.02 14.93L12.71 9.77L12.31 7.66L11.45 4.61L10.36 2.19L8.84 0.04L40.89 -0.04L45.97 0.12L49.80 0.51L54.73 1.37L58.72 2.38L61.77 3.40L67.40 5.98L71.23 8.41L74.59 11.14L77.37 14.00L80.10 17.59L81.74 20.33L83.78 24.71L84.79 27.60L85.42 30.18L85.61 30.38L92.03 30.45L94.61 30.77L96.40 31.78L97.62 32.84L98.48 33.93L99.41 35.81L99.96 37.92L100.00 41.56L98.12 39.99L96.17 39.21L86.94 39.13L86.90 47.69L93.75 47.89L95.47 48.59L96.95 49.61L98.32 51.13L99.49 53.40L99.96 55.36L100.04 58.72L99.92 58.84L97.97 57.27L96.25 56.65L91.32 56.49L85.69 56.57L85.50 56.76L85.03 58.80L83.70 62.78L81.59 67.24L80.26 69.43L78.46 71.93L76.51 74.20L73.57 76.97L70.68 79.16L68.02 80.81L64.43 82.60L61.69 83.70L57.94 84.87L54.73 85.65L50.66 86.36L44.96 86.90L41.13 86.98ZM40.77 82.56L43.24 82.45L46.68 81.98L49.73 81.35L52.62 80.49L54.96 79.55L57.08 78.46L58.64 77.52L60.99 75.72L64.15 72.48L66.50 69.04L68.76 64.11L70.02 59.97L70.64 56.61L68.96 56.49L26.11 56.65L26.08 82.56L40.77 82.56ZM65.17 30.41L70.72 30.34L69.55 24.94L67.75 20.09L66.34 17.28L65.17 15.48L62.16 11.92L58.80 9.19L55.59 7.39L53.09 6.37L50.82 5.67L47.22 4.89L41.36 4.34L26.08 4.38L26.11 30.38L65.17 30.41ZM71.58 47.77L71.74 46.68L71.74 40.34L71.54 39.13L29.09 39.13L26.08 39.25L26.11 47.73L71.58 47.77Z";

interface Props {
  /** Glyph height in px (match the surrounding fontSize). */
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export function DirhamGlyph({ size = 14, color, style }: Props) {
  const colors = useColors();
  const fill = color ?? colors.text;
  return (
    <Svg
      width={size * (DIRHAM_VB.w / DIRHAM_VB.h)}
      height={size}
      viewBox={`0 0 ${DIRHAM_VB.w} ${DIRHAM_VB.h}`}
      style={style}
    >
      <Path d={DIRHAM_PATH} fill={fill} fillRule="evenodd" />
    </Svg>
  );
}
