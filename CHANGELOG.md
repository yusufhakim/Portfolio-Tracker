# Changelog

A running log of the Portfolio Tracker project. Newest first.

## Stage 2.1 — Transaction edit/delete fix + Excel import
- **Fix:** editing/deleting individual transactions now works. The edit screen is a normal pushed
  screen (was a modal that could fail to open) and is scrollable/keyboard-safe, and every transaction
  row now has a direct **🗑 delete** button (with confirm) so deleting never depends on navigation.
- **New — Import from Excel/CSV:** Settings → “Import from Excel / CSV” lets you bulk-add buy/sell
  transactions from a spreadsheet with columns **Market · Symbol · Name · Action · Quantity · Price ·
  Date** (via `expo-document-picker` + `xlsx`). Rows are validated with per-row error messages, assets
  are created, and prices/history backfill automatically. Verified: `tsc`, `npm test`, and
  `expo export` all pass.

## Stage 2 — Standalone on-device Android app ✅ (working APK installed)
Turned the app into a fully self-contained Android app (no computer, no server) with proper
transaction tracking, and got it building and running on a real phone.

**App**
- On-device storage with `expo-sqlite`; **transactions are the source of truth**, holdings derived
  via average-cost. Tables: transactions, assets, price_latest, price_history, fx_rates, settings.
- Price providers ported to TypeScript and run on the phone: Finnhub (US, search by symbol **and**
  name), mfapi.in (India MF NAVs, by name), open.er-api.com (USD/INR).
- Features: search by name/ticker; add purchases with **fractional qty**, native-currency price, and a
  **date** (calendar picker + typed dd/mm/yyyy); **Holdings** rows (ticker · qty · today's change $/₹ &
  % · value · total gain/loss, native currency; portfolio total + graph in **USD**); **Transactions**
  tab (newest→oldest); **buy more / sell / edit / delete** transaction or whole holding; **background
  updates** toggle in Settings; SVG performance graph with 1D–ALL ranges.
- Verified: `tsc` clean, `npm test` (lot/currency math), `expo export` bundles.

**Packaging & build (the hard part)**
- Upgraded to **Expo SDK 54** (React 19 / RN 0.81) to match current Expo Go; added missing Expo
  packages (`expo-asset`, `babel-preset-expo`, …); switched charts to `react-native-svg` (Expo-Go safe).
- Added a local **Android Studio / Gradle** build path (`windows-build-apk-local.bat`) producing a
  standalone `app-release.apk`, plus an EAS cloud option.
- Worked through toolchain issues on a fresh Windows machine: disabled the new architecture, forced a
  compatible **JDK 17** (system/bundled Java 25 was too new for Gradle), built **arm64-v8a only** for
  speed, repaired corrupted SDK Build-Tools, and **added app icon + splash assets** (fixed the final
  `splashscreen_logo` resource-linking error). **Build successful; APK verified on device.**

## Stage 1 — Client/server tracker (legacy, superseded)
- Python **FastAPI** backend (SQLite + APScheduler) with Finnhub/mfapi.in/FX providers, holdings CRUD,
  portfolio valuation, history, and scheduled updates (15-min US, daily IST MF NAV, hourly FX).
- Expo/React Native client polling the backend; performance graph with range toggles.
- Non-technical Windows onboarding: `windows-setup.bat` + start scripts + `GETTING-STARTED-WINDOWS.md`.
- Kept for reference only; the Stage 2 app does not use the backend.

## Next — Stage 3 (planned)
Refine the build and UI. (To be detailed when Stage 3 starts.)

---
_Setup/build instructions: see [BUILD-APK-WINDOWS.md](BUILD-APK-WINDOWS.md) and [README.md](README.md)._
