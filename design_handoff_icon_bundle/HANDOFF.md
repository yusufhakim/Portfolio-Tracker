# Icon Bundle — Handoff to Claude Code

You are integrating a new stroke icon set into an existing React Native (Expo) app: **yusufhakim/Portfolio-Tracker** (mobile/).

## Do exactly this

1. Copy `Icon.tsx` to `mobile/components/Icon.tsx`. It depends on `react-native-svg` (already in package.json via `@expo/vector-icons`; if the direct dep is missing, add `react-native-svg`).
2. Do NOT modify `mobile/theme.ts` or `mobile/components/ThemeProvider.tsx`. `Icon` reads `useColors()` from the existing theme — nothing else needs to know it exists.
3. Apply the replacements in `icons.manifest.json`. Each entry is:
   - `emojiReplacements`: literal string → icon name. Replace every occurrence in the listed files with `<Icon name="..." size={18} />`, keeping surrounding `Text` styles/sizing.
   - `placements[<name>].files`: locations that should receive the named icon. For each file, insert the `<Icon>` at the semantic anchor described in `usage`. Never remove existing labels; icons sit BEFORE the label with `gap: 6` (or a 6-px `marginRight` if no flex gap is available).
4. Every icon inherits `useColors().text` by default. Do NOT pass `color=` unless the manifest lists a `defaultColor` (positive/negative — already wired into `Icon.tsx`, do not override).
5. Do not invent icon names outside `IconName`. If a spot needs an icon not in the set, stop and ask.

## Do NOT

- Do not add emoji anywhere. `📅` and `🗑` must be gone from the mobile source after this pass.
- Do not hard-code hex colors on icons. The whole point is theme inheritance.
- Do not resize to non-standard sizes. Use one of: 16 / 20 / 22 / 28 px.
- Do not rewrite unrelated components.

## Verify

- Toggle Settings → Appearance between Light, Dark, System. Every icon must switch tint automatically with the text.
- `grep -R "📅\|🗑" mobile/` returns nothing.
- `grep -R "@expo/vector-icons" mobile/` — if it appears, migrate those call sites to `<Icon>` using the closest name in `IconName`. Ask if unsure.

## Reference

- `preview.html` — open in a browser to see all 40 glyphs and toggle themes.
- `Portfolio Tracker.dc.html` — the 4-screen redesign these icons are drawn against.
