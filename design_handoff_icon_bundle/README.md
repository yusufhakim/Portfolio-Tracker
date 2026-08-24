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


## Logo
A minimalist mark: a rising line-chart glyph through three waypoints, anchored by a small filled dot at the low and a larger filled dot at the high. The whole app in one gesture — accumulate, hold, rise.

Four variants ship in `logo/` and are wired in `Logo.tsx`:

| Variant | File | When to use |
| --- | --- | --- |
| `mark` | `logo/logo-mark.svg` | Default. Monochrome line + dots, no container. Inherits `useColors().text`. |
| `mark-outline` | `logo/logo-mark-outline.svg` | Rounded-square container with the mark inside — for lockups on busy backgrounds. |
| `app-icon` | `logo/app-icon-128.svg`, `logo/app-icon-1024.svg` | The launcher icon. Solid accent square, mark in white. Export the 1024 as PNG into `mobile/assets/icon.png` and `mobile/assets/adaptive-icon.png`. |
| `wordmark` | `logo/logo-wordmark.svg` | Mark + "Portfolio." in Instrument Serif italic. Splash, About, Settings header. |

Usage:
```tsx
import { Logo } from "@/components/Logo";

<Logo variant="mark" size={28} />           // header
<Logo variant="app-icon" size={64} />       // splash / about
<Logo variant="wordmark" size={22} />       // settings header
```

### Rules
- Never re-colour the app-icon background to anything other than `colors.accent`.
- Minimum clear space around any variant = height of the low anchor dot.
- Never stretch. Only scale uniformly via `size`.
- Do not add a drop shadow or gradient. The mark is flat by design.
