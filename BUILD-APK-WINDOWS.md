# Build the Android app (APK) — Windows

This turns the project into a **real Android app** you install on your phone. After this, you **do not
need your computer** to use it — no black windows, no Wi-Fi link to your PC. The app runs entirely on
your phone and updates prices by itself.

You only do this **once** (and again later if you want to update the app).

---

## Prerequisites — setting up a fresh/wiped computer

You need exactly **two** programs. **You do NOT need Python** — that was only for the old Stage 1
server, which this standalone app doesn't use. Don't reinstall it.

### 1. Node.js (LTS)
1. Go to **https://nodejs.org/** and click the **“LTS”** download (the stable one — avoid “Current”).
2. Run the installer → **Next → Next → Install** (accept defaults). Done.

### 2. Android Studio
1. Go to **https://developer.android.com/studio** → **Download Android Studio** → run the installer with
   default options.
2. **Open Android Studio once** and let the first-run **Setup Wizard** complete — choose **Standard**
   and let it download the **Android SDK**. Leave it until it says finished, then you can close it.

### A note on Java (important — this bit us before)
Modern Android Studio ships **Java 25**, which is **too new** for the Android build tools (they need
**Java 17**). We handle this below by having Android Studio **download a Java 17** just for building — so
**don't install a separate Java** yourself. If you already have some Java on your PC, that's fine; we
won't rely on it.

---

## Two ways to build
**Use Option B (build on your computer with Android Studio) — it's the most reliable.** Option A (Expo's
cloud) is a fallback.

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

### Build inside Android Studio (works even if your system Java is too new)

Android Studio uses **its own bundled Java**, so this avoids the "Unsupported class file major version"
error you can get when your PC's Java is newer than the build tools support.

1. The build script already created the native project. Open **Android Studio → Open** and select the
   folder **`…\mobile\android`** (inside your extracted project). If it isn't there yet, first run
   `windows-build-apk-local.bat` once (it generates it), or in `mobile` run `npx expo prebuild -p android`.
2. Wait for **“Gradle sync”** to finish (bottom status bar). If it prompts to install any SDK components,
   accept.
3. If sync fails with **“Unsupported class file major version”** (your Java is too new), open
   **File → Settings → Build, Execution, Deployment → Build Tools → Gradle**. Click the **“Gradle JDK”**
   dropdown → **“Download JDK…”**, choose **Version 17** and any vendor (e.g. Amazon Corretto), click
   **Download**, then **Apply → OK** and sync again. (Android builds want Java 17; Java 24/25 are too new
   for the current Gradle.)
4. Open the **Build Variants** panel (left edge, or **View → Tool Windows → Build Variants**) and set the
   `app` module's variant to **release**.
   - A red **“C/C++ Configuration Problem”** panel may appear here — that's just Android Studio setting
     up code hints; it's **harmless and does not affect the build**. Ignore it.
5. **(Recommended, much faster)** In the Project panel open **`gradle.properties`** and change
   `reactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64` to just
   `reactNativeArchitectures=arm64-v8a` (builds only for modern 64-bit phones), then re-sync.
6. **Build → Build App Bundle(s) / APK(s) → Build APK(s).** When the notification appears, click
   **locate** to find `app-release.apk` (under `mobile\android\app\build\outputs\apk\release\`).
6. Copy that APK to your phone (Google Drive or USB) and install it.

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
