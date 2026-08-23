# Portfolio Tracker

A mobile portfolio tracker for **US equities, US ETFs, and Indian mutual funds**. Record your buys and
sells, see each holding with today's change, value and total gain/loss, and a performance graph you can
toggle across time ranges.

> 🟢 **Just want the app on your phone?** As of **Stage 2** this is a **fully standalone Android app** —
> no computer, no server. Build it once and install the APK: follow
> **[BUILD-APK-WINDOWS.md](BUILD-APK-WINDOWS.md)**. After that your laptop is never needed.

## Stages
- **Stage 2 (current):** self-contained on-device app — local SQLite storage, prices fetched directly
  from the phone, transaction/lot tracking (buy/sell + dates), edit/delete, a Holdings/Transactions
  toggle, and best-effort background refresh. Packaged as an installable **APK** (built locally with
  Android Studio's toolchain, or via EAS). The mobile app lives in `mobile/`; there is
  **no runtime server**.
- **Stage 1 (legacy):** a client–server version (Python/FastAPI backend + Expo client). The `backend/`
  folder and `windows-start-backend.bat` / `windows-start-app.bat` / `GETTING-STARTED-WINDOWS.md` are
  kept for reference only and are **no longer used** by the Stage 2 app.

## What it does (Stage 2)
- **Record transactions** — search a US stock by **name or ticker** ("apple" or "AAPL") or an Indian
  fund by name; enter **fractional quantity**, **price in the asset's own currency**, and a **date**
  (calendar picker or typed dd/mm/yyyy).
- **Holdings view** — per asset: ticker · qty held · today's change ($/₹ and %) · current value · total
  gain/loss (each in its native currency); the **portfolio total and top graph are in USD**.
- **Transactions view** — a toggle beside Holdings lists every buy/sell newest→oldest
  (ticker · action · price · qty · date).
- **Buy more / sell / edit / delete** — add lots, sell holdings, edit any transaction, delete a single
  transaction or an entire holding.
- **On-device updates** — prices refresh on open, while open, and (optionally) in the background;
  US via Finnhub, Indian NAVs via mfapi.in, USD/INR via open.er-api.com. All stored in on-device SQLite.
- **Performance graph** pinned at the top with **1D / 1W / 1M / 3M / 1Y / ALL** range toggles.

## Architecture (Stage 2)

```
mobile/  (Expo / React Native + TypeScript) — fully self-contained
  app/            expo-router screens: Portfolio, add-asset, trade, asset/[key], transaction/[id], settings
  components/     PortfolioChart (react-native-svg), HoldingRow, TransactionRow, DateField, TransactionForm, ...
  db/             expo-sqlite storage: transactions, assets, price_latest, price_history, fx_rates, settings
  services/       providers (finnhub, indiaMf, fx), prices (refresh), portfolio (holdings/history math),
                  lots (pure math, unit-tested), background (expo-background-task)
  hooks/          React Query hooks over SQLite + refresh triggers
```

Holdings are **derived from transactions** (average-cost). There is **no server**: the app fetches
prices directly and stores everything on-device. Packaged to an installable **APK** — built locally
with Android Studio's toolchain (recommended, `windows-build-apk-local.bat`) or via **EAS Build**
(`eas.json`). See **[BUILD-APK-WINDOWS.md](BUILD-APK-WINDOWS.md)**.

### Data sources (all free)
| Data | Provider | Notes |
|---|---|---|
| US equities / ETFs | [Finnhub](https://finnhub.io) | Free tier; searches by symbol **and** name. Key embedded in `app.json` `extra.finnhubApiKey` (personal free key; rotate at finnhub.io). |
| Indian mutual fund NAVs | [mfapi.in](https://www.mfapi.in) | Keyless; search by name, latest + full historical NAV. |
| USD/INR FX | [open.er-api.com](https://open.er-api.com) | Keyless daily rates. |

## Develop / verify the mobile app
```bash
cd mobile
npm install
npm run typecheck    # tsc --noEmit
npm test             # offline lot/currency math test
npx expo start       # optional: run in Expo Go on the same Wi-Fi (dev only)
npx expo export --platform android   # full bundle sanity check
```
**Build the installable APK** (Windows): double-click `windows-build-apk-local.bat` (uses Android
Studio's SDK/JDK) → `mobile/android/app/build/outputs/apk/release/app-release.apk`. EAS cloud build
(`eas build -p android --profile preview`) is an alternative. The
**[BUILD-APK-WINDOWS.md](BUILD-APK-WINDOWS.md)** walkthrough covers both, plus the toolchain gotchas we
hit (needs **JDK 17** — newer Java is rejected by Gradle; builds arm64-only for speed).

Project history is in **[CHANGELOG.md](CHANGELOG.md)**.

---

## Legacy (Stage 1 — client/server, no longer used)
The sections below describe the original Python backend. The Stage 2 app does **not** use it; it is
kept only for reference.

## Backend — setup & run

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env and set FINNHUB_API_KEY (free at https://finnhub.io/register).
# Indian MF + FX need no key. BASE_CURRENCY defaults to USD.

uvicorn app.main:app --reload --port 8123
```

The API is now at `http://localhost:8123` (interactive docs at `/docs`). On startup it creates the
SQLite DB, backfills price history for existing holdings, and starts the scheduler.

### Key endpoints
- `GET  /search?q=AAPL&type=us` — search US symbols (`type=in_mf` for Indian funds).
- `POST /holdings` — `{ "asset_type": "us_equity", "key": "AAPL", "quantity": 10, "avg_cost": 150 }`
- `GET  /holdings`, `PATCH /holdings/{id}`, `DELETE /holdings/{id}`
- `GET  /portfolio` — holdings enriched with live price, value, and gain in the base currency.
- `GET  /portfolio/history?range=1M` — total value time series for the graph.
- `POST /portfolio/refresh` — trigger an immediate price/NAV/FX refresh.

### Verify the backend
```bash
# From backend/ with the venv active:
python -m tests.test_offline      # validates valuation + FX + history assembly offline
curl -s localhost:8123/health
curl -s "localhost:8123/search?q=axis&type=in_mf"   # needs outbound access to mfapi.in
```

## Mobile — setup & run

```bash
cd mobile
npm install
npx expo start
```

Then open in Expo Go (scan the QR) or an iOS/Android simulator.

**Point the app at your backend:** by default it calls `http://localhost:8123`, which only works in
a web/simulator on the same machine. For a physical device, set your computer's LAN IP:

```bash
EXPO_PUBLIC_API_URL="http://192.168.1.50:8123" npx expo start
```

(or edit `extra.apiUrl` in `mobile/app.json`).

Typecheck the app with `npm run typecheck`.

## Notes & limits (Stage 1)
- **Single-user**: runs under a fixed `DEFAULT_USER_ID`; every table already carries `user_id` so
  multi-user auth is a clean later stage.
- **Indian MF cadence**: markets close 15:30 IST but SEBI-regulated funds only *publish* the day's
  NAV by ~23:00 IST, so the earliest a genuinely new NAV can be fetched is that evening — the daily
  job runs at 23:30 IST and keeps the prior NAV until a new one is available.
- **SQLite** for zero-config local use; swap `DATABASE_URL` to Postgres later (SQLAlchemy handles it).

## Out of scope for Stage 1 (future stages)
Multi-user auth & accounts, push/price alerts, transaction lots & realized-gain accounting, more
asset classes (crypto/bonds), Postgres migration, and production deployment.
