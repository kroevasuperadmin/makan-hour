# Makan Hour: three-app demo

B2B office lunch pre-order drops for one Klang Valley district. Employees order by 10:30 am, orders batch per caterer, each office gets one drop, and the company pays one monthly invoice. Makan Hour never owns a kitchen.

There are three separate apps. They share live state, so an action on one device shows up on the other two within about a second.

| App | Who uses it | Live URL | Expo identity |
|---|---|---|---|
| **Makan Hour** | Employee (phone) | https://makan-hour-app.vercel.app | `my.makanhour.app` |
| **Makan Hour Admin** | Office admin (phone, tablet, laptop) | https://makan-hour-admin.vercel.app | `my.makanhour.admin` |
| **Makan Hour Kitchen** | Caterer and ops (phone or kitchen tablet) | https://makan-hour-kitchen.vercel.app | `my.makanhour.kitchen` |

All companies, banks and people are fictional. The payment step is a **sandbox mock**: no money moves and no bank is contacted.

## Layout

```
apps/employee   Makan Hour (light, serif headlines, pandan green)
apps/admin      Makan Hour Admin (navy header, IBM Plex, two columns on tablets)
apps/kitchen    Makan Hour Kitchen (dark, condensed numerals, paper-style bag labels)
packages/core   types, seed data, live sync (Supabase), store and actions
packages/ui     spacing scale, palettes, fonts, components, icons
supabase/       SQL for the makan_* tables
scripts/        demo-e2e.mjs: three-browser click-through and screenshots
```

## Live state

- The data is in Supabase project `rizqey-admin` (ref `rlfllmhcjqhgeoikjbha`, Singapore), in four tables: `makan_session`, `makan_orders`, `makan_drops` and `makan_profiles`. They are separate from the Dossair tables.
- Apps subscribe through Supabase Realtime, and also poll every 4 seconds in case the socket drops.
- The anon key and URL live in `apps/*/.env` as `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- The tables are open to the anon key, which is fine for demo data only.
- If the env file is missing, an app runs in local-only mode with no sync.
- The 30-odd colleague orders are seeded locally. Only the demo user's order, the cutoff, nudges, drops and the invoice are stored live.

## Run

```bash
cd /workspace/makan-hour-app
npm install
npm run employee   # or: npm run admin / npm run kitchen
```

Each command starts Metro with a QR code: scan it with Expo Go on Android, or the Camera app on an iPhone. If the phone is on a different network from the computer, add `-- --tunnel`. To run all three at once, give each its own port, for example `cd apps/admin && npx expo start --port 8082`.

Build the web versions and run the check:

```bash
npm run build:web
python3 -m http.server 8091 -d apps/employee/dist &
python3 -m http.server 8092 -d apps/admin/dist &
python3 -m http.server 8093 -d apps/kitchen/dist &
npx playwright install chromium
npm run e2e                       # screenshots go to docs/screens/{employee,admin,kitchen}/
# against production:
EMPLOYEE_URL=https://makan-hour-app.vercel.app ADMIN_URL=https://makan-hour-admin.vercel.app KITCHEN_URL=https://makan-hour-kitchen.vercel.app NO_SHOTS=1 npm run e2e
```

Deploy: copy each `apps/<app>/dist` to a folder outside this repo, then run `vercel deploy --prod --name makan-hour-app` there (or `makan-hour-admin` / `makan-hour-kitchen`). Deploying from inside the monorepo uploads the source instead of the build.

## Reset before the demo

In **Admin**, press and hold the "Makan Hour Admin" wordmark for about 1.5 seconds, then tap *Reset all three apps*. This clears the order, nudges, cutoff, drops and payment, and sets the clock back to 9:18 am on every device.

## 3-device demo script (about 5 minutes)

Setup: the investor's phone or phone A runs **Makan Hour**, you hold **Admin**, and a laptop or tablet on the table shows **Kitchen**. Reset first.

| Time | Device | Do | Say |
|---|---|---|---|
| 0:00 | All | Point at the three screens | "Today an office manager collects 30 orders on WhatsApp and the caterer retypes them into Excel. These three screens replace that: one for staff, one for HR, one for the kitchen." |
| 0:30 | Makan Hour | **Hand him the phone.** He picks a dish and taps *Order* | "It takes one tap and there's no checkout, because the company pays." |
| 1:00 | Makan Hour | Point at the green "You're in for lunch" card and the saved desk | "You can see that you've ordered, and the app remembers your desk. Competitors get bad reviews for both." |
| 1:15 | Admin and Kitchen | Show the headcount going up by one on Admin, and the batch count on Kitchen | "His order is already on HR's screen and in the kitchen's count." |
| 1:30 | Admin | Show spend against budget and who hasn't ordered. Tap *Nudge all* | "HR sees who's in and what it costs, live." |
| 2:15 | Admin | Tap **Run the 10:30 am cutoff now** | "At 10:30 the orders lock." His phone now says ordering has closed. |
| 2:30 | Kitchen | *Confirm batch*, then the *Labels* tab: his name and desk are on a label | "The caterer gets one list, not 30 chats, with every bag labelled by name and desk. This is the software we will license." |
| 3:15 | Kitchen | *Drops* tab: *Mark preparing*, *Mark out for delivery*, then *Traffic +12* | "Each office gets one rider making one stop. That drop costs about RM 9, split across the whole office. If the rider is running late, everyone gets an alert 27 minutes before the food is due." |
| 3:40 | Makan Hour | The amber delay alert has appeared on his phone | |
| 3:50 | Kitchen, then Makan Hour | *Mark delivered*. His phone: "Lunch is at Level 12 pantry." | |
| 4:00 | Admin | *Invoice*, then *Pay with FPX B2B (sandbox)*, pick a bank, *Continue*, *Approve* | "Finance gets one invoice a month instead of 30 receipts. This is a sandbox, so no money moves." |
| 4:45 | | | "We never run a kitchen, so we won't drift into being a restaurant chain like Pop Meals." |

Backup plan: if the venue Wi-Fi fails, use a pre-recorded screen video or the screenshots in `docs/screens/`. Without a network the apps cannot sync.

## Known gaps

- There is no login. Anyone with the URLs can see and change the shared demo session.
- There is only one demo session, so two people demoing at once would collide.
- Reminders and delay alerts appear in-app only; there are no OS push notifications.
- *Print PDF* on the labels tab does nothing.
- FPX B2B is a mock, not a Billplz or CHIP sandbox.
- The monthly invoice totals and month-to-date spend are seeded figures.
- The demo clock is simulated and jumps forward at each step.
