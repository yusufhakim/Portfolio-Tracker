# Build the Android app (APK) — Windows

This turns the project into a **real Android app** you install on your phone. After this, you **do not
need your computer** to use it — no black windows, no Wi-Fi link to your PC. The app runs entirely on
your phone and updates prices by itself.

You only do this **once** (and again later if you want to update the app).

There are two ways to build. **If you have Android Studio installed, use Option B — it's the most
reliable.** If not, Option A builds in Expo's free cloud.

---

## Option B — Build on your own computer (recommended if you have Android Studio)

Android Studio comes with everything needed to build (the Android SDK + Java), so this avoids the cloud
builder entirely.

### One-time check
Open **Android Studio** at least once and let it finish its first-time setup (it downloads the Android
SDK). You can then close it — the build script uses that SDK directly.

### Build it
1. Get the latest code: on your Desktop delete the old `Projects-…` folder and ZIP, then download a
   fresh ZIP from **https://github.com/yusufhakim/Projects** (green **Code → Download ZIP**) and
   **Extract All…** to your Desktop.
2. Open the folder and **double-click `windows-build-apk-local.bat`**.
   (If it flashes shut, use the address-bar trick: type `cmd`, Enter, then run `windows-build-apk-local.bat`.)
3. It installs files, generates the Android project, and builds. The **first build takes 10–20 minutes**
   (it downloads build tools once). When it's done it prints:
   `mobile\android\app\build\outputs\apk\release\app-release.apk`

### Put it on your phone
1. Copy that **`app-release.apk`** to your phone — easiest is to **email it to yourself** and open the
   attachment on the phone, or connect the phone by USB and copy it over.
2. Tap the file to install. Allow **“install unknown apps”** if Android asks.
3. Open **Portfolio Tracker**. 🎉

> Prefer clicking in Android Studio instead of the script? Open the **`mobile\android`** folder in
> Android Studio, wait for “Gradle sync” to finish, set the **Build Variant** to **release** (View →
> Tool Windows → Build Variants), then **Build → Build App Bundle(s) / APK(s) → Build APK(s)**. Click
> **locate** to find `app-release.apk`.

---

## Option A — Build in Expo's free cloud

## What you need
- **Node.js** installed (you already have this from before — if not, get it at https://nodejs.org/).
- A **free Expo account** (you'll create one during the steps, takes a minute).
- Your phone, to install the finished app.

---

## Steps

### 1. Get the latest code
1. Delete your old Desktop `Projects-…` folder and its ZIP (to avoid confusion).
2. Go to **https://github.com/yusufhakim/Projects** → green **“Code”** → **“Download ZIP.”**
3. Right-click the ZIP → **“Extract All…” → Extract**, and move the folder to your Desktop.

### 2. Start the build
1. Open the folder until you see **`windows-build-apk.bat`**.
2. **Double-click it.** (If Windows shows “Windows protected your PC,” click **More info → Run anyway**.)
3. A black window opens and starts installing the app files — this takes a few minutes.

### 3. Sign in to Expo (free)
When it says **“Signing in to Expo”**:
- If you **already have** an Expo account, type your email and password when asked.
- If you **don't**, go to **https://expo.dev/signup** in your browser, create a free account
  (email + password), then come back to the black window and log in with those details.

### 4. Let it build
- When it asks things like **“Would you like to create an EAS project?”** or **“Generate a new Android
  Keystore?”**, just type **`y`** and press **Enter**. (These are normal — Expo is setting up your app.)
- The build now runs in the cloud. It takes roughly **10–20 minutes**. You'll see a **link** appear
  (something like `https://expo.dev/artifacts/…` or a build details page).

### 5. Install on your phone 📱
1. On your **phone**, open the **link** the build printed (email it to yourself, or open your Expo
   account at **expo.dev** on the phone → your project → Builds → the latest one → **Download**).
2. Tap the downloaded **`.apk`** file to install it.
3. Android will likely warn about **“install unknown apps”** — tap **Settings**, allow it for your
   browser/Files app, then install. (This is normal for apps not from the Play Store.)
4. Open **Portfolio Tracker** from your app drawer. 🎉

**That's it — the app is now on your phone and works on its own.** You can close everything on your
computer. Your computer is only needed again if you want to rebuild a newer version later.

---

## Using the app
- Tap **“+ Add”** to record a purchase: search a US stock by name or ticker (e.g. “apple” or “AAPL”)
  or an Indian fund by name, then enter **quantity** (decimals allowed), **price** in the asset's own
  currency, and the **date** (pick from the calendar or type dd/mm/yyyy).
- The **Holdings** tab shows each holding: ticker, quantity, today's change, value, and total
  gain/loss. The **Transactions** tab lists every buy/sell, newest first.
- Tap a holding to **Buy more**, **Sell**, or **Delete** it. Tap a transaction to **edit or delete** it.
- The top **graph** shows your total value (in USD) — switch **1D/1W/1M/3M/1Y/ALL**.
- **Settings (⚙︎)** lets you turn **background updates** on/off and refresh right now.

## Good to know
- **Prices update** when you open the app, while it's open, and — if you enable it in Settings — in the
  background (Android decides the exact timing, roughly every 15+ minutes).
- **US prices** only move during US market hours; **Indian funds** update once a day after the NAV is
  published.
- Everything is stored **on your phone**. Uninstalling the app deletes your data.
