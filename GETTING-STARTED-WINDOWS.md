# Getting Started (Windows + Android phone)

This guide is written for someone who has **never done anything like this before**. Take it slowly,
one step at a time. You only do Part A and Part B **once**. After that, using the app is just Part C.

You'll do everything on your **Windows computer**, and then view the app on your **Android phone**.

> ⚠️ Your phone and your computer must be connected to the **same Wi-Fi** for this to work.

---

## Part A — Install 3 free programs (one time only)

Think of these like installing any normal app. Just download and click through.

### 1. Python (the "price engine's" language)
1. Go to **https://www.python.org/downloads/**
2. Click the big yellow **“Download Python”** button.
3. Open the file that downloads (bottom of your browser, or your Downloads folder).
4. **VERY IMPORTANT:** at the bottom of the first window, tick the box that says
   **“Add python.exe to PATH”**. ✅
5. Click **“Install Now”** and wait for it to finish, then click **Close**.

### 2. Node.js (the app's language)
1. Go to **https://nodejs.org/**
2. Click the button labelled **“LTS”** (it's the recommended one).
3. Open the downloaded file and click **Next → Next → Install**. Accept any defaults.

### 3. Expo Go (the phone viewer)
1. On your **Android phone**, open the **Play Store**.
2. Search for **“Expo Go”** and tap **Install**.
3. That's it — you don't need to log in.

---

## Part B — Download the app and set it up (one time only)

### 1. Download the code
1. Go to this web page in your browser:
   **https://github.com/yusufhakim/portfolio-tracker**
2. Click the green **“Code”** button, then click **“Download ZIP”**.
3. Find the downloaded ZIP file (usually in your **Downloads** folder).
4. **Right-click** it → **“Extract All…”** → **Extract**. This makes a normal folder.
5. Open that folder. You should see files like `windows-setup.bat`, `backend`, `mobile`, and this guide.

> 💡 Tip: move this folder somewhere easy, like your **Desktop**, so you can find it again.

### 2. Run the setup
1. **Double-click `windows-setup.bat`.**
2. A black window opens and does its thing. This takes a few minutes — that's normal.
3. When it asks for your **Finnhub API key**, paste your key and press **Enter**.
   - To paste: **right-click** inside the black window (that pastes what you copied), then press Enter.
   - Your key looks like a long jumble of letters and numbers.
4. Wait until you see **“DONE! Setup finished successfully.”**
5. You can close that window.

> If it says Python or Node.js was not found, it means Part A didn't finish — redo the missing one
> (make sure you ticked “Add python.exe to PATH” for Python), then run `windows-setup.bat` again.

---

## Part C — Using the app (this is all you do from now on)

Each time you want to use the app, do these three things:

### 1. Start the price engine
- **Double-click `windows-start-backend.bat`.**
- A black window opens and shows some text ending with **“Application startup complete.”**
- **Leave this window open.** (It's doing the work of fetching prices.)

> The **first time** you run it, Windows may pop up a **“Windows Defender Firewall”** box.
> Click **“Allow access.”** This lets your phone talk to your computer.

### 2. Start the app
- **Double-click `windows-start-app.bat`.**
- Another black window opens. After a moment, a big **QR code** appears in it.
- (If a firewall box appears again, click **“Allow access.”**)

### 3. Open it on your phone
- Open the **Expo Go** app on your Android phone.
- Tap **“Scan QR code”** and point your camera at the QR code on your computer screen.
- The Portfolio app will load on your phone. 🎉

---

## Using the app itself

1. Tap **“+ Add”** at the top of the holdings list.
2. Choose **“US Stocks & ETFs”** or **“India Mutual Funds.”**
3. Type in the search box:
   - For US: a ticker symbol like **AAPL** (Apple) or **VOO** (an ETF), then tap **Search**.
   - For India: part of the fund's name, then tap **Search**.
4. Tap the result you want.
5. Type how many **shares/units** you own, and (optionally) the **average price** you paid.
6. Tap **“Add to Portfolio.”**
7. Back on the main screen you'll see your holding with its current price, and the **graph at the top**.
   Tap **1D / 1W / 1M / 3M / 1Y / ALL** to see different time periods.

Prices update on their own: US stocks every 15 minutes while the US market is open, and Indian mutual
funds once a day in the evening (India time). You can also **pull down** on the screen to refresh.

**To stop everything:** just close the two black windows.

---

## If something doesn't work

- **App says “Couldn't reach the API”** → The most common cause: your phone and computer aren't on the
  **same Wi-Fi**, or the price-engine window (`windows-start-backend.bat`) isn't open. Make sure both,
  and that you clicked **“Allow access”** on the firewall popup.
- **No prices show for US stocks** → Your Finnhub API key may be missing or mistyped. Re-run
  `windows-setup.bat` and paste the key carefully. Also, US prices only move while the US market is open
  (roughly 7:00 PM to 1:30 AM India time / 9:30 AM to 4:00 PM US Eastern).
- **The QR code won't scan** → In the `windows-start-app.bat` window, there's also a link like
  `exp://192.168...`. You can type that into Expo Go manually using **“Enter URL manually.”**
- **A black window closed instantly** → Run setup first (`windows-setup.bat`), then try again.

Keep your Finnhub API key private (it's like a password). If you ever want a new one, you can create a
fresh key for free at https://finnhub.io and re-run `windows-setup.bat`.
