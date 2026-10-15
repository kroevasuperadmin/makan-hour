# Makan Hour

B2B office lunch pre-order drops for one Klang Valley district. Employees order by 10:30 am, orders batch per caterer, each office gets one drop, and the company pays one monthly invoice. Makan Hour never owns a kitchen.

**One app** (`my.makanhour.app`), with three experiences. Your account decides which one you see when you sign in; there is no role switcher inside the app.

| Signed in as | Experience | Look |
|---|---|---|
| `aina@contoh-capital.my` | **Employee**: menu, one-tap order, saved desk, delay alert, pickup | Warm off-white, serif headlines, green for "done" |
| `nadia.admin@contoh-capital.my` | **Office admin**: headcount, spend against budget, nudges, cutoff, monthly invoice and FPX sandbox | Navy header, IBM Plex, two columns on tablets |
| `ops@dapurcontoh.my` | **Caterer and kitchen**: batch cook list, bag labels, drop tracker | Dark, condensed numerals, paper-style labels |

All three share the bowl mark and the serif "Makan Hour" wordmark. Sign-in uses a mock one-time code: no email is sent and the demo code is **220126** (the screen shows it, and *Paste demo code* fills it in). *Sign out* (top right) goes back to sign-in.

Live web build: **https://makan-hour-app.vercel.app**

All companies, banks and people are fictional. The payment step is a **sandbox mock**: no money moves and no bank is contacted.

## Layout

```
apps/makan-hour   the app: sign-in, role shells, role screens (src/roles/*)
packages/core     types, seed data, live sync (Supabase), store and actions
packages/ui       spacing scale, the three role palettes and type sets, components, icons
supabase/         SQL for the makan_* tables
scripts/          demo-e2e.mjs: three browser contexts, one per role
```

## Live state

- The data is in Supabase project `rizqey-admin` (Singapore), in four tables: `makan_session`, `makan_orders`, `makan_drops` and `makan_profiles`. They are separate from the Dossair tables.
- Apps get changes through Supabase Realtime, and also poll every 4 seconds in case the socket drops.
- Writes from one device are queued, so they are applied in the order they were made.
- The URL and anon key come from `apps/makan-hour/.env` (see `.env.example`). This file is not committed.
- Without the env file, the app runs in local-only mode with no sync.

## Run

```bash
cd /workspace/makan-hour-app
npm install
npm start                # Metro with a QR code. Scan it with Expo Go (Android) or the iPhone Camera.
npm start -- --tunnel    # use this if the phones are not on the same network as the computer
```

To test the build and regenerate screenshots:

```bash
npm run build:web
python3 -m http.server 8091 -d apps/makan-hour/dist &
npx playwright install chromium
npm run e2e                                   # screenshots go to docs/screens/{signin,employee,admin,kitchen}/
APP_URL=https://makan-hour-app.vercel.app NO_SHOTS=1 npm run e2e   # against production
```

Deploy: copy `apps/makan-hour/dist` and `apps/makan-hour/api` (payment and push routes, see docs/PAYMENTS.md and docs/PUSH.md) to a folder outside the repo, then run `vercel deploy --prod --name makan-hour-app` from there. Deploying from inside the monorepo uploads the source instead of the build.

## Reset before the demo

Sign in as the admin. Press and hold the "Makan Hour" wordmark for about 1.5 seconds, then tap *Reset the demo*. This clears the order, nudges, cutoff, drops and payment for everyone signed in, and sets the clock back to 9:18 am.

## 3-device demo script (about 5 minutes)

Setup: three phones (or two phones and a laptop) all open the same app.
- Phone A, the investor's or one you hand him, is signed in as **Aina** (employee).
- Phone B, which you hold, is signed in as **Nadia** (admin).
- Phone C or the laptop is signed in as **Dapur Contoh** (kitchen).

Reset from the admin phone first.

| Time | Device | Do | Say |
|---|---|---|---|
| 0:00 | All | Show the three screens side by side | "This is one app. Staff, HR and the caterer each sign in and see their own part of the same lunch." |
| 0:30 | A | **Hand him the phone.** He picks a dish and taps *Order* | "It takes one tap and there's no checkout, because the company pays." |
| 1:00 | A | Point at the green "You're in for lunch" card and the saved desk | "You can see that you've ordered, and the app remembers your desk. Competitors get bad reviews for both." |
| 1:15 | B and C | The admin headcount and the kitchen batch count each go up by one | "His order is already on HR's screen and in the kitchen's count." |
| 1:30 | B | Show spend against budget and who hasn't ordered. Tap *Nudge all* | "HR sees who's in and what it costs, live." |
| 2:15 | B | Tap **Run the 10:30 am cutoff now** | "At 10:30 the orders lock." Phone A now says ordering has closed. |
| 2:30 | C | *Confirm batch*, then *Labels*: his name and desk are on a label | "The caterer gets one list, not 30 chats, with every bag labelled by name and desk. This is the software we will license." |
| 3:15 | C | *Drops*: *Mark preparing*, *Mark out for delivery*, then *Traffic +12* | "Each office gets one rider making one stop. Delivery is part of the RM 2 a meal the office pays, so staff never see a delivery fee. If the rider is running late, everyone gets an alert 27 minutes before the food is due." |
| 3:40 | A | The amber delay alert has appeared | |
| 3:50 | C, then A | *Mark delivered*. Phone A: "Lunch is at Level 12 pantry." | |
| 4:00 | B | *Invoice*, then *Pay with FPX B2B (sandbox)*, pick a bank, *Continue*, *Approve* | "Finance gets one invoice a month instead of 30 receipts. This is a sandbox, so no money moves." |
| 4:45 | | | "We never run a kitchen, so we won't drift into being a restaurant chain like Pop Meals." |

Backup plan: if the venue Wi-Fi fails, use a pre-recorded screen video or `docs/screens/`. Without a network the phones cannot sync.

## Known gaps

- Sign-in is a mock. There is no real one-time code or session, and a reload goes back to sign-in.
- Anyone with the URL can use the demo accounts and change the one shared session.
- Two demos running at once would collide, because there is only one session.
- Reminders and delay alerts are in-app only; there are no OS push notifications.
- *Print PDF* on labels does nothing.
- Online payment goes through Stripe Checkout (FPX and card) once `STRIPE_SECRET_KEY` is set; until then the invoice offers the FPX B2B mock.
- Real sign-up (new office, invites, roles) needs `supabase/makan_migration_2.sql`. The three demo accounts and code 220126 work without it.
- The invoice totals and month-to-date spend are seeded figures.
- The demo clock is simulated and jumps forward at each step.

## Android

- **Package:** `com.wildrice.makanhour`. Play Console fixed this name; the iOS bundle ID stays `my.makanhour.app`.
- **Version:** versionName 1.0.0, versionCode 1.
- **Signing:** `plugins/withReleaseSigning.js` adds release signing to the generated Gradle project. The keystore details come from the env vars `MAKAN_UPLOAD_STORE_FILE`, `MAKAN_UPLOAD_STORE_PASSWORD`, `MAKAN_UPLOAD_KEY_ALIAS` and `MAKAN_UPLOAD_KEY_PASSWORD`. They are never stored in the repo.
- **Upload keystore:** on the box at `/home/box/secrets/makanhour-upload.keystore` (alias `makanhour-upload`), with its password in `android_upload.pass`. Both are mode 600. Also stored as the GitHub secrets `ANDROID_KEYSTORE_*` / `ANDROID_KEY_*`. Keep a second backup somewhere safe: if this keystore is lost, Play needs an upload-key reset.
- **Local build:**
  ```bash
  cd apps/makan-hour
  npx expo prebuild -p android --clean --no-install
  cd android
  ./gradlew bundleRelease assembleRelease -PreactNativeArchitectures=armeabi-v7a,arm64-v8a
  ```
- **CI:** `ci/android-play.yml`. Move it to `.github/workflows/` to turn it on. It builds the `.aab` with versionCode = 100 + run number and uploads it to Play internal testing as a draft. It needs the `PLAY_SERVICE_ACCOUNT_JSON` secret, and the first `.aab` must be uploaded by hand in Play Console.
