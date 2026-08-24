# Changelog

A running log of the Portfolio Tracker project. Newest first.

## Stage 3.5 — Icon set + logo (design handoff)
- Added a themed **stroke icon component** (`components/Icon.tsx`, 40 glyphs) and a **logo component**
  (`components/Logo.tsx`); both inherit the theme via `useColors()` so they follow light/dark/system.
- **Removed all emoji from the UI** per the handoff: the date-picker `📅` → `calendar` icon and the
  transaction `🗑` → `delete` icon (red by default). Also swapped the Holdings **Sort** button glyph, the
  add-asset **search** field prefix, and the **app-lock** screen glyph to the new set.
- Added the **logo mark** to the left of the home-screen title.
- Regenerated the **launcher/splash icons** (`assets/icon.png`, `adaptive-icon.png`, `splash-icon.png`)
  from the handoff's app-icon artwork — an uptrend line-chart mark in white on the `accent` tile.
- Note: the handoff's `Icon.tsx` shipped corrupted (web SVG tags + injected HTML) and its logo
  *wordmark* had no text glyphs, so those were faithfully rebuilt for React Native. The manifest's
  placements into non-UI service files and the full 4-screen redesign were not applied.
- Verified: `tsc` clean, `npm test`, and `expo export` all pass.

## Stage 3.4 — Lock-on-exit, chart x-axis fit, search-as-you-type
- **Lock on exit:** the app now locks the **instant it leaves the foreground** (not only on a full
  close) and asks for biometrics/PIN when you return. In-app system pickers (file/folder) and the auth
  prompt itself are treated as trusted, so importing doesn't trigger a spurious re-lock.
- **Chart x-axis fit:** time labels are now chosen by how many actually fit the width and spaced evenly
  with duplicates removed, so a portfolio with only a couple of history points no longer stacks the
  dates on top of each other.
- **Search as you type:** on the Add-asset screen the results now **filter live as you type** a ticker
  or company/fund name (debounced, up to **10 matches**). The Search button stays for an immediate
  lookup.

## Stage 3.3 — Index card restyle + sparkline colour fix
- **Fix:** the index-card sparkline could show **green while the day's change was negative** — it was
  coloured by comparing the first and last intraday points instead of the actual % change. The
  sparkline, the number, and the new arrow badge are now all coloured by the same daily **% change**, so
  they always agree (red when down, green when up).
- **Restyle** the index cards to match the inspiration: bold name, grey level, coloured % with a filled
  **circular arrow badge**, a **dotted separator**, and a **filled area sparkline with an end dot** —
  all fully theme-aware (light / dark / system).

## Stage 3.2 — Live prices, chart axes, sorting, app lock, per-portfolio currency
- **30-second price refresh** (kept the existing Finnhub method): US quotes now refresh every 30s while
  the app is open (FX on a slower 10-min cadence to stay well under the free endpoint's limits) instead
  of every 15 min.
- **Chart axes** — the portfolio chart now has a **dynamic y-axis** (value ticks in the portfolio's
  currency that rescale as the value changes) and a **dynamic x-axis** (time labels that follow the
  selected 1D…ALL range) with light gridlines.
- **Sort holdings** — a **Sort** button next to “+ Add” (Holdings tab only) sorts by **ticker symbol,
  company name, portfolio value, daily % change, or current price**, each toggllable
  ascending/descending (A–Z / Z–A). The Transactions tab keeps its newest-first order.
- **App lock** — on open, the app requires your **phone's biometrics or screen PIN/pattern/password**
  (`expo-local-authentication`). If the phone has no lock set, or the check errors, it fails open so you
  can't be locked out of your own data.
- **Per-portfolio display currency** — in a portfolio's **Edit** screen, choose **Default / INR (₹) /
  USD ($) / AED (D)**. The portfolio's value, daily change and chart are shown converted into that
  currency using the latest live FX rate (USD↔INR↔AED) at full precision. (xe.com has no free public
  API, so an equivalent free spot-rate source is used.)
- Verified: `tsc` clean, `npm test`, and `expo export` all pass. Adds the `expo-local-authentication`
  dependency (rebuild the APK to pick it up).

## Stage 3.1 — Dashboard bug fixes + theme + polish
**Fixes**
- **Fix “Could not save … NativeDatabase.prepareAsync … NullPointerException” when adding a holding
  (esp. Indian mutual funds).** Root cause: `getDb()` cached its handle *before* the one-time
  migration finished, so a concurrent query on app-start could hit a half-initialized database. Made DB
  open + migrate **single-flight** (every caller awaits the same promise; the handle is only published
  after migration completes), and added a defensive fallback so a transaction can never be written with
  a missing `portfolio_id`.
- **Fix the Background-updates toggle being stuck.** It was blocked by the same DB write failure, and a
  thrown error left the switch disabled; the toggle is now wrapped so it always re-enables and surfaces
  any error.

**Enhancements**
- **Theme selector** in Settings → **System default / Light / Dark**. A new light palette + theme
  context repaint the whole app at runtime; the choice is saved on-device and “System default” follows
  the phone's light/dark setting.
- **Smaller index cards** that fit **3 across without side-scrolling**, and a **third India card —
  Nifty Next 50** (`^NSMIDCP`) alongside Sensex and Nifty 50.
- **Import template**: now just **headers + one example row**, and it **saves straight into a folder on
  the phone** (you pick a folder like *Download* the first time; after that it saves there silently) —
  no more share sheet each time.
- Verified: `tsc` clean, `npm test`, and `expo export` all pass.

## Stage 3 — Dashboard UI/UX + multiple portfolios + market indices ✅
Reworked the app into a **dashboard-first** experience and split holdings into named portfolios.

**Dashboard (new home)**
- Header **“Yusuf's Portfolio Tracker”** with a settings **gear** top-right.
- **USA / India** segmented toggle driving a horizontal row of live **index cards** — S&P 500, Nasdaq,
  Dow Jones (USA) and Sensex, Nifty 50 (India) — each showing level, a colored daily-change ▲/▼, and a
  mini `react-native-svg` sparkline. Data via the free/keyless **Yahoo Finance** chart API
  (`services/providers/indices.ts`); ephemeral (not stored). A card shows “Unavailable” if Yahoo hiccups.
- **Portfolios** section with a **+** to create one; each row shows the portfolio’s **USD value (0 dp)**
  and **daily change %** with a green (▲) / red (▼) arrow. Tap a row to open that portfolio.

**Multiple portfolios (buckets)**
- New `portfolios` table + `transactions.portfolio_id` (one-time SQLite migration that also creates a
  default **“My Portfolio”** and moves any existing transactions into it). Holdings are computed
  **per portfolio**; prices/assets/FX caches stay global.
- Create / rename / delete portfolios (`app/portfolio-edit.tsx`); deleting a portfolio removes its
  transactions (with confirm). Per-portfolio detail screen (`app/portfolio/[id].tsx`) keeps the Stage-2
  graph + RangeToggle + Holdings/Transactions toggle + add/trade, scoped to the bucket.
- **Import** gains a leading **Portfolio** column (blank → default; unknown name → created automatically),
  so one spreadsheet can populate multiple buckets.

**Formatting**
- New `formatUsd0` (whole-dollar USD) for portfolio values; new **`ChangeText`** component (▲/▼ + signed
  % to 2 decimals, green ≥ 0 / red < 0) reused by index cards, portfolio rows, and holding rows.
- Verified: `tsc` clean, `npm test` (lot math **+** new formatting tests), and `expo export` all pass.

## Stage 2.3 — Import template download
- Settings now has a **“Download template”** button that generates a ready-to-fill `.xlsx`
  (headers + example rows) and opens the share sheet to save it anywhere on the phone — no need to
  hand-create a file. Template columns simplified to **Market · Symbol · Action · Quantity · Price ·
  Date** (the company-name column was dropped; imported names default to the symbol). Uses
  `expo-sharing`.

## Stage 2.2 — Save/import reliability fixes
- **Fix “Could not save” on Add Purchase and import failures:** the save no longer waits on the network
  price refresh (it runs in the background afterward), explicit SQLite transactions were removed and a
  `busy_timeout` added so a brief lock during the background refresh no longer fails a write, and the
  Excel/CSV reader now uses the modern `expo-file-system` `File` API. Errors now show the real message.

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

---
_Setup/build instructions: see [BUILD-APK-WINDOWS.md](BUILD-APK-WINDOWS.md) and [README.md](README.md)._
