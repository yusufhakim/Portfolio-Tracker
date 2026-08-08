# Portfolio Tracker

A mobile portfolio tracker for **US equities, US ETFs, and Indian mutual funds**. Add your own
holdings, see a live-updating total value with a performance graph you can toggle across time
ranges, and let the backend keep prices fresh automatically.

This is **Stage 1**: a full working app (mobile client + API + scheduled price updates), built so
later stages (multi-user accounts, alerts, more asset classes) can layer on cleanly.

> 🟢 **Non-technical? On Windows with an Android phone?** Follow the plain-language, click-by-click
> guide in **[GETTING-STARTED-WINDOWS.md](GETTING-STARTED-WINDOWS.md)** — it uses the included
> `windows-setup.bat` / `windows-start-*.bat` helpers so you barely touch the terminal. The sections
> below are the manual/developer instructions.

## What it does

- **Add / remove holdings** — search a US ticker (via Finnhub) or an Indian mutual fund by name
  (via mfapi.in), enter quantity + average cost.
- **Performance graph** pinned at the top of the portfolio with **1D / 1W / 1M / 3M / 1Y / ALL**
  toggles.
- **Automatic price updates**
  - **US equities & ETFs** refresh every **15 minutes** during US market hours (well inside the
    ≤20-minute target).
  - **Indian mutual funds** refresh **once daily** at ~23:30 IST, after NAVs are published.
  - **USD/INR FX** refreshes hourly so a mixed USD/INR portfolio is shown in one base currency.
- **Base-currency normalization** — INR and USD holdings are converted to a single display
  currency (default USD, configurable).

## Architecture

```
mobile/  (Expo / React Native + TypeScript)   →   backend/  (FastAPI + SQLite + APScheduler)
                                                     ├─ providers: Finnhub (US), mfapi.in (IN MF), FX
                                                     ├─ scheduler: 15-min US, daily IN MF, hourly FX, daily snapshot
                                                     └─ REST API: holdings CRUD, portfolio, history, search
```

The backend owns the update cadence; the mobile app just polls `/portfolio` every ~60s while open.

### Data sources (all free)
| Data | Provider | Notes |
|---|---|---|
| US equities / ETFs | [Finnhub](https://finnhub.io) | Free tier ~60 req/min. Requires a free API key. |
| Indian mutual fund NAVs | [mfapi.in](https://www.mfapi.in) | Keyless; latest + full historical NAV by AMFI scheme code. |
| USD/INR FX | [open.er-api.com](https://open.er-api.com) | Keyless daily rates. |

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
```
