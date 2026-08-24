# Handoff: Portfolio Tracker · Icon Bundle

## Overview
A 40-icon stroke set for the Portfolio-Tracker mobile app (Expo / React Native). Every icon is drawn on a 24×24 grid at 1.5px stroke and renders in the current theme colour, so a single component set follows Light / Dark / System automatically via the app's existing `ThemeProvider`.

## About the design files
The `preview.html` and `Portfolio Tracker.dc.html` files in this bundle are **design references** created in HTML — high-fidelity mockups showing intended look and behaviour, not production code. The task is to recreate the icon system in the target app's existing React Native environment using the components provided (`Icon.tsx`), then apply the icon-to-location mapping in `icons.manifest.json` and `HANDOFF.md`. Do not ship the HTML.

## Fidelity
**Hi-fi.** Palette (`#0B0E14`, `#151A23`, `#4C8DFF`, `#2ECC71`, `#FF5C5C` …) is pulled verbatim from `mobile/theme.ts`. All icon geometry is final.

## What ships
| File | Purpose |
| --- | --- |
| `Icon.tsx` | Drop-in `<Icon name size color />` component using `react-native-svg` and `useColors()`. Contains all 40 glyphs. |
| `Icon.web.tsx` | Plain-React fallback for any web target (identical API). |
| `icons.manifest.json` | Machine-readable placement map: emoji replacements + per-icon target files. |
| `HANDOFF.md` | Short imperative playbook for Claude Code. Read this first. |
| `preview.html` | Live preview of all 40 icons with Light/Dark/System toggle. |
| `Portfolio Tracker.dc.html` | The 4-screen redesign these icons were drawn for. Reference only. |

## Icon inventory


## Design tokens (from `mobile/theme.ts`)
| Token | Dark | Light |
| --- | --- | --- |
| bg | #0B0E14 | #F4F6FA |
| surface | #151A23 | #FFFFFF |
| surfaceAlt | #1E2530 | #E8ECF2 |
| border | #252C38 | #D5DCE6 |
| text | #E6E9EF | #0B0E14 |
| textDim | #8A93A6 | #5B6472 |
| accent | #4C8DFF | #2F6FED |
| positive | #2ECC71 | #12A150 |
| negative | #FF5C5C | #E5484D |

## Drawing rules
- 24×24 grid, 20×20 optical square.
- 1.5px stroke, round caps and joins.
- Colour = `currentColor` → bound to `useColors().text`.
- Exceptions: `trade.buy` / `trend.up` use `positive`; `trade.sell` / `trend.down` / `delete` use `negative`. Wired into `Icon.tsx`; do not override at call sites.
- Sizes: 16 (inline chip), 20 (row), 22 (default), 28 (header).

## Usage
```tsx
import { Icon } from "@/components/Icon";

<Icon name="calendar" size={18} />
<Icon name="trade.buy" size={22} />      // auto-tints positive
<Icon name="chevron.back" size={22} />   // header back
```

## Screens this touches
Every mobile screen — see `icons.manifest.json` `placements[*].files` for exact target files.
