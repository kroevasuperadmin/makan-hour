# App Store and Play Store readiness

Checked 23 Oct 2026 against `main` (`a595047`) and the five open draft pull requests. This file is a checklist for submitting Makan Hour. It does not submit the app, accept an Apple or Google agreement, pay a fee, or contain a key, password, or certificate.

**APL in this pack means App Store + Play Store readiness.** The repo is the Makan Hour phone app (`my.makanhour.app` / `com.wildrice.makanhour`), with a TestFlight workflow and a staged Play workflow. That reading matches the repo.

Status words:

- **DONE** — already in the repo, on the public site, or already created in a console.
- **MISSING** — someone can fix it from this repo or the public site. The fix is under the item.
- **NEEDS FARIS** — money, a signature, the legal entity, or a decision only he can make. A photo of him is not required for any item below.

The store text at the bottom describes the app on `main`: office lunch for Bangsar South. It does not describe the marketplace drafts.

## What the open pull requests change

None of these are merged. The listing further down is for `main` only.

| PR | Base | Effect on a store submission |
|---|---|---|
| [#1](https://github.com/kroevasuperadmin/makan-hour/pull/1) Marketplace orders, real sign-in, and Stripe checkout | `jason-22oct-remodel-plan` | Adds a customer, vendor, and rider flow. Checkout stays on Stripe. Still physical food. |
| [#2](https://github.com/kroevasuperadmin/makan-hour/pull/2) Design upgrade: printed lunch list | the marketplace branch | Visual change to that flow. No new store IDs. |
| [#3](https://github.com/kroevasuperadmin/makan-hour/pull/3) Admin grant template and a safe reset | `main` | A SQL template Faris may run himself, and a demo-reset script. No private reviewer login. |
| [#4](https://github.com/kroevasuperadmin/makan-hour/pull/4) Save marketplace orders only when the database switch is on | the marketplace branch | Orders hit the database only when that switch is on. |
| [#5](https://github.com/kroevasuperadmin/makan-hour/pull/5) Open demo: any email | the marketplace branch | Any email can sign up and switch among customer, vendor, rider, and admin. |

If #5 is ever in a binary that goes to review, leave `MAKAN_OPEN_DEMO` unset. A store build with that switch on lets a stranger open the admin view.

If #1 is merged before submission, rewrite the listing so it matches whatever actually shipped, keep payments on Stripe, and add the marketplace screenshots. Do not switch the food payment to Apple In-App Purchase or Google Play Billing.

## Identifiers

| Item | Apple | Google | Status |
|---|---|---|---|
| App name | Makan Hour | Makan Hour | **DONE** in `apps/makan-hour/app.json` (`expo.name`) |
| Store id | App Store Connect app `6823228464`, team `4PX34WYHUB` | Package `com.wildrice.makanhour` (Play has already locked this package) | **DONE** |
| Bundle / package in the binary | `my.makanhour.app` | `com.wildrice.makanhour` | **DONE**. The two strings differ on purpose. Leave both. |
| Version | `1.0.0`, `ios.buildNumber` `1` (the TestFlight lane replaces this with the latest TestFlight build plus one) | `versionName` `1.0.0`, `versionCode` `5` in `app.json` | **DONE** in config. README still says Android versionCode 1. That line is stale. Use `5`, or the next code Play has not seen yet. |
| URL scheme | `makan-hour` | same | **DONE** |
| SKU / app record | Created (TestFlight doc, steps 1–3) | Package name is locked in Play Console | **DONE** |

## Icons

| Item | Size in the repo | Status |
|---|---|---|
| iOS icon `apps/makan-hour/assets/icon.png` | 1024×1024. Saved as RGBA, and every pixel's alpha is fully opaque. Apple masks the corners. | **DONE** |
| Android adaptive foreground and background | both 1024×1024, background colour `#1F4D3A` | **DONE** |
| Android monochrome `android-icon-monochrome.png` | 432×432 | **MISSING** |
| Play Console high-res icon | not a separate file; source is the 1024 icon | **NEEDS FARIS** to upload |
| Icon drawing | Green square, serif capital M. `TESTFLIGHT.md` still calls it a placeholder. | **NEEDS FARIS** to confirm this drawing ships |

The icon does not use a person's face. Do not put a photo on it. If App Store Connect rejects `icon.png` for having an alpha channel, re-save that file as 24-bit RGB with the alpha channel removed. The picture stays the same.

**Fix the monochrome icon.** Export a new `apps/makan-hour/assets/android-icon-monochrome.png` at 1024×1024, one flat colour on a transparent background, with the M inside the centre 66% (the circle and squircle masks crop the edges). Prebuild scales whatever file is there. A 432 image will look soft.

**Play high-res icon.** From the 1024 icon, write a 512×512 PNG and upload it in Play Console → Grow → Store presence → Main store listing → App icon. Faris does the upload. Example, on a machine that has `sips`:

```bash
sips -z 512 512 apps/makan-hour/assets/icon.png --out makan-hour-play-512.png
```

`magick apps/makan-hour/assets/icon.png -resize 512x512 makan-hour-play-512.png` does the same. Do not commit the Play listing file if it is only an export of the icon you already have.

**Icon approval.** If the green M is the mark he wants, nothing else is required. If he wants a different drawing, replace `icon.png`, `android-icon-foreground.png`, `android-icon-monochrome.png`, and `splash-icon.png` together, all PNG, foreground and background the same pixel size.

`splash-icon.png` is 1024×1024 and is not referenced by `app.json`. The stores do not ask for a splash. It is not a submission item. Wire `expo-splash-screen` later if the launch screen should show the mark. Expo SDK 57 docs: https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/

## Screenshots

`docs/screens/` is the demo set. Phone frames are 780×1688 (long side is 2.16× the short side). The tablet frame is 2360×1640. None of the phone frames fit either store. The tablet frame fits an optional 11-inch iPad slot and does not fill the iPad slot Apple requires.

Leave `docs/screens/` as demo evidence. Shoot a new set for the stores. Use the real screens (staff menu, staff order confirmed, admin headcount, caterer batch or labels). Leave out the FPX sandbox bank, the word "sandbox", and the screen that prints the demo code. Put the demo code in the review notes only.

### Apple — MISSING

`ios.supportsTablet` is `true`, so iPad screenshots are required. Apple's required sizes, from the App Store Connect screenshot spec checked 23 Oct 2026:

| Slot | Pixels (portrait) | Why |
|---|---|---|
| iPhone with Dynamic Island, medium | 1206×2622 or 1179×2556 | Required |
| iPhone with Dynamic Island, large | 1320×2868, 1290×2796, or 1260×2736 | Upload this too so the large phones are not a scaled fallback |
| iPad 13-inch | 2064×2752 or 2048×2732 | Required because the app runs on iPad |

Up to 10 images per slot. JPEG or PNG. No transparency. One set of three to five screens is enough if the UI is the same in every language (English only).

The 2360×1640 admin shot can be added later in the 11-inch iPad slot. It does not replace the 13-inch set.

iPhone Duo sizes are not required until April 2027, and only for apps built with the iOS 27.1 SDK. Skip them.

### Google — MISSING

| Asset | Spec |
|---|---|
| Phone screenshots | At least 2, at most 8. JPEG or 24-bit PNG, no alpha. Each side 320–3840 px. The long side at most twice the short side. Use 1080×1920. |
| Feature graphic | 1024×500 exactly. JPEG or 24-bit PNG, no alpha. Required before publish. |
| Tablet screenshots | Optional. The 2360×1640 file meets the size rules if you want a tablet frame. |

**Fix.** Capture the same three or four screens as for Apple, export phone frames at 1080×1920, and make one feature graphic:

- 1024×500, background `#1F4D3A`.
- The words "Makan Hour" and one line: "Office lunch. One drop."
- Keep the type in the centre. Play crops the edges.
- No price, no star rating, no "free", no "best", no "new", no photo of a person.

Faris uploads both sets in the consoles. Producing the files is the missing work. Uploading them is his.

## Privacy policy, account deletion, data safety

| Item | Where | Status |
|---|---|---|
| Privacy policy | https://makanhour.rizqey.com/privacy (16 Oct 2026, Rizqey Labs, PDPA, admin@kroeva.com) | **DONE** as a page |
| Account deletion on the web | https://makanhour.rizqey.com/delete-account (in-app steps and an email path) | **DONE** as a page |
| Account deletion in the app | `Delete account` beside Sign out, type DELETE. Real accounts call `POST /api/account/delete`. Demo accounts reset the shared demo. | **DONE** |
| Privacy and deletion links inside the app | not on the sign-in screen | **MISSING** |
| One sentence on the privacy page | the page names Google Firebase Cloud Messaging | **MISSING** |
| Privacy URL entered in App Store Connect and Play Console | console field | **NEEDS FARIS** |
| Apple App Privacy (nutrition) form | console | **NEEDS FARIS**, answers below |
| Play Data safety form, including the deletion URL | console | **NEEDS FARIS**, answers below |

**Fix the in-app links.** On the sign-in screen in `apps/makan-hour/src/SignIn.tsx`, under the demo account list, add two text buttons that open:

- https://makanhour.rizqey.com/privacy
- https://makanhour.rizqey.com/delete-account

Use `Linking.openURL` from `react-native`. Play's user-data policy asks for the privacy policy inside the app, and for a web deletion page that works after uninstall. The web page already exists. The app does not point at it.

**Fix the privacy sentence.** `src/notify.ts` registers a push token on iOS only (`registerForPush` returns immediately on Android). The live policy says notifications go through Apple Push Notification service and Google Firebase Cloud Messaging. Change that sentence on the site (the site is not this repo) so it names Apple Push Notification service only, until an Android token is actually sent. Fill the Play form from the app, not from the extra FCM line.

Support URL for Apple: https://makanhour.rizqey.com/privacy (it names the app and admin@kroeva.com). Marketing URL, optional: https://makanhour.rizqey.com.

### Data the app actually handles

Collected, tied to the person, used to run lunch:

- Name, email, and the account id from sign-in.
- Office, building, floor, and desk. This is text the office entered. The app does not ask for GPS and has no location permission.
- Orders: dish, time, and amount.
- Payment result: paid or not, amount, FPX or card, and the Stripe session id. The card number and the FPX login are typed on Stripe's page. The app does not store them.
- On iOS, if the person allows notifications, the APNs device token.

Not collected: precise location, contacts, photos, advertising id, health data, crash-log SDK, messages between users.

Shared, for running the service, not sold, not used for ads:

- The caterer sees the name, office, desk, and dish, so the bag can be labelled.
- Stripe receives the email and the amount, and collects the payment details on its own page.
- Supabase stores the account and the orders.
- Apple receives the push token on iOS when notifications are allowed.

Deletion: the in-app button removes the sign-in, the member row, and the push tokens, and strips the name off past orders. The privacy page says order and payment records can be kept for up to 7 years for Malaysian tax rules. Say that on both forms. Web request path: https://makanhour.rizqey.com/delete-account

### Apple App Privacy — answers to type in

| Data type | Collected | Linked to identity | Used for tracking | Purpose |
|---|---|---|---|---|
| Name | yes | yes | no | App functionality |
| Email address | yes | yes | no | App functionality |
| User ID | yes | yes | no | App functionality |
| Purchase history | yes | yes | no | App functionality |
| Other contact / profile text (office, floor, desk) | yes | yes | no | App functionality |
| Device ID (APNs token, iOS) | yes | yes | no | App functionality |
| Payment card number | no (Stripe's page) | — | — | — |
| Precise location | no | — | — | — |
| Tracking | no | — | — | — |

### Play Data safety — answers to type in

- Data is encrypted in transit (HTTPS).
- Users can request deletion. Web URL: https://makanhour.rizqey.com/delete-account
- Data is not sold.
- No ads. Advertising id is not collected.
- Personal info: name, email, user ids, and other personal info (office, floor, desk). Collected, shared with the caterer and the processors above, purpose App functionality.
- Financial info: purchase history, collected. User payment info is entered on Stripe during checkout. Tick that row as handled for the purchase, and write that the app stores the result and the method, not the card number.
- Device or other ids: iOS push token only, optional, App functionality.
- Location: not collected.

## Age rating and the other declarations

The questionnaires themselves are **NEEDS FARIS**. He has to click them. The answers that match this app:

**Apple age rating.** No cartoon or realistic violence, no sexual content, no profanity, no horror, no alcohol, tobacco, or drugs, no gambling, no contests. Unrestricted web access: no. The app opens Stripe, Google, Microsoft, or Apple for a sign-in or a payment. It does not contain a browser the person can point at any site. User-generated content that the public can browse: no. An order is visible to that office and its caterer. Made for Kids: no. Expected result: **4+**.

**Google.** Same content answers in the IARC form. Target audience: **18 and over**. It is a workplace tool. Do not join Designed for Families. Ads declaration: no. News app: no. Government app: no. Health app: no. COVID-19 contact tracing: no. Financial-features declaration: the app is not a bank, a wallet, a lender, or a crypto product. It takes payment for a physical meal.

**Apple export compliance.** `ITSAppUsesNonExemptEncryption` is `false` in `app.json`. **DONE.** If App Store Connect still asks: the app uses standard HTTPS only. Answer no to non-exempt encryption.

**Copyright string and seller name.** The privacy page says the operator is Rizqey Labs in Malaysia. The Play package is `com.wildrice.makanhour`. The support address is admin@kroeva.com. Those three names are not the same string. **NEEDS FARIS** to confirm the legal entity on both consoles, the copyright line (a draft he can accept or replace: `2026 Rizqey Labs`), and the seller address. This pack does not invent a company number.

**Agreements and fees.** **NEEDS FARIS.** Apple Developer Program and the Play developer account already exist far enough that the app record and the package name are real. Any agreement still sitting unsigned, any tax form, and any renewal fee are his to accept and pay. This pack does not accept them and does not pay.

## Review sign-in

Apple and Google both ask how to get past the sign-in wall. The login they should use is already in the app, and it is not Faris's Apple ID, Google account, or Microsoft account.

**DONE** in the binary (`apps/makan-hour/src/accounts.ts`):

| Who | Email on the sign-in list | What they see |
|---|---|---|
| Aina Rahman | `aina@contoh-capital.my` | Staff menu |
| Nadia Osman | `nadia.admin@contoh-capital.my` | Office admin |
| Dapur Contoh Catering | `ops@dapurcontoh.my` | Caterer |

Demo code: `220126`. It is printed on the demo screen. These accounts never call Supabase Auth. They share one sample office. A reviewer and a live demo can overwrite each other. Reset from the admin screen: press and hold the Makan Hour wordmark for about 1.5 seconds, then tap Reset the demo.

**NEEDS FARIS** to paste the notes below into App Store Connect → App Review Information, and into Play Console → Policy → App content → App access ("all or some functionality is restricted"). Use these three accounts. Do not type his own login there.

A separate reviewer office, with its own password, is only needed if he does not want reviewers on the shared demo. Creating that user is also **NEEDS FARIS** (Supabase). Until that exists, the three demo accounts are the review login. Do not commit a password.

### Notes to paste

```
Sign-in for review uses the sample accounts on the first screen. They are not a personal login.

1. Open the app. Under Demo accounts, tap Aina Rahman.
2. Enter 220126. The same code is shown on that screen. Tap Sign in as Aina.
3. Sign out. Repeat with Nadia Osman for the office admin, and with Dapur Contoh Catering for the caterer.

This is sample data for a fictional office (Contoh Capital). The three accounts share one session. Meals are physical food delivered to an office pantry. The monthly invoice is for that catering. Payment uses Stripe (FPX and card) under App Store guideline 3.1.3(e). These demo accounts cannot open a live charge. They use a mock payment, so review does not spend money.

Privacy policy: https://makanhour.rizqey.com/privacy
Delete an account: in the app, next to Sign out, or https://makanhour.rizqey.com/delete-account
```

### Sign in with Apple — MISSING

Staff sign-in offers Google, Microsoft, and Sign in with Apple (`usesAppleSignIn: true`, native button on iOS). Office admin offers Google and Microsoft, and no Apple button. Caterer offers Google, and no Apple button. Guideline 4.8 asks for a privacy-preserving login beside those third-party buttons. The staff door has it. The other two doors do not.

**Fix.** In `OPTIONS` in `apps/makan-hour/src/SignIn.tsx`, add `'apple'` to the `admin` and `caterer` provider lists, the same way `employee` already has it. `appleAvailable()` already hides the button off iOS until `EXPO_PUBLIC_APPLE_WEB=1`. Update the admin and caterer sentences so they mention Apple on iPhone. Do not turn on Apple for the website until a Services ID exists (`docs/AUTH.md`).

Reviewers who follow the notes above never need Google, Microsoft, or Apple. The gap still matters if they tap those doors themselves.

## Payments

Lunch is a physical meal, eaten at the office. The monthly invoice is for that catering. A staff top-up is extra lunch spend above the allowance (`ALLOWANCE_SEN` is RM 15, `SERVICE_FEE_SEN` is RM 2 per meal, delivery included). It is not a wallet of digital credit.

**DONE**

- `apps/makan-hour/api/pay/create.js` opens a Stripe Checkout Session in MYR for FPX and card.
- The app has no StoreKit product and no Play Billing product. `package.json` has no purchases SDK.
- Demo accounts are refused when the Stripe key is live (`real !== true` returns 403) and fall back to the mock flow, so a reviewer is not charged.
- The same rule is written in `docs/PAYMENTS.md`.

**Keep Stripe.** Apple guideline 3.1.3(e) covers goods and services used outside the app. Google Play Billing covers digital goods. A meal delivered to a pantry is outside both. Do not add In-App Purchase, RevenueCat, or Play Billing to pass review. Do not request the External Purchase Link entitlement. That entitlement is for digital goods.

**NEEDS FARIS** only if he wants to change that decision. The draft marketplace pull request also uses Stripe for the meal and does not add RevenueCat. If a later build sells a software subscription inside the app, that part would be a digital purchase and this section would have to be rewritten. The current app does not sell one.

Say the 3.1.3(e) sentence in the review notes (already in the paste block). On Play, leave Play Billing off.

## Builds

Do not dispatch these as part of reading this file. Both lanes stop short of public release. Neither one is a substitute for the listing work above.

### iOS — pipeline DONE, release click NEEDS FARIS

The workflow is `.github/workflows/ios-testflight.yml`. `TESTFLIGHT.md` still says it lives in `ci/` and is not active. That paragraph is stale. The Android file is the one still sitting in `ci/`.

What a run does: `expo prebuild` for iOS (the `ios/` folder is not in git), fastlane `ios beta`, upload to TestFlight. It does not submit a version for App Store review.

Secrets the workflow expects, by name only: `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_KEY_P8`, `APPLE_TEAM_ID`, `ASC_APP_ID`, `DIST_CERT_P12`, `DIST_CERT_PASSWORD`, `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`. `DIST_CERT_ID` in the workflow is `9A4L95TSR4`.

Steps, when he wants a TestFlight build:

1. Actions → iOS TestFlight → Run workflow, or push a tag `ios-v*`.
2. Wait for TestFlight processing.
3. In App Store Connect, attach the build to version 1.0.0 and paste the listing, the privacy answers, the age rating, and the review notes from this file.
4. Stop. Do not press Submit for Review until the missing screenshots, the in-app privacy links, and the Apple button on the admin and caterer doors are in that build.

Export compliance is already set in `app.json`. Xcode on the runner is 26.4 or newer, under 27, which matches Expo SDK 57.

### Android — workflow file DONE, not switched on

`ci/android-play.yml` builds a signed `.aab` and uploads it to the Play internal track as a **draft**. It is not in `.github/workflows/`, so it does not run. Leave it there until he wants an internal build. Moving it turns the job on.

Signing comes from env vars on a local build, or from GitHub secrets in CI. Names only: `MAKAN_UPLOAD_STORE_FILE`, `MAKAN_UPLOAD_STORE_PASSWORD`, `MAKAN_UPLOAD_KEY_ALIAS`, `MAKAN_UPLOAD_KEY_PASSWORD`, and in CI `ANDROID_KEYSTORE_B64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `PLAY_SERVICE_ACCOUNT_JSON`. The keystore is not in git. Do not print it. If it is lost, Play needs an upload-key reset, which is his to request.

`versionCode` in `app.json` is 5. The workflow, if you run it, overwrites the generated Gradle `versionCode` with `100 + GITHUB_RUN_NUMBER`. Before any upload, look up the highest `versionCode` already on Play and use the next integer. Play rejects a code it has already seen.

Expo SDK 57 prebuild sets `compileSdkVersion` and `targetSdkVersion` to 36 (https://docs.expo.dev/versions/v57.0.0/). Play has required target API 36 for new apps since 31 Aug 2026. Do not lower it. After a build, `aapt dump badging` on the AAB confirms `targetSdkVersion`.

The README says the first `.aab` has to be uploaded by hand in Play Console. That first upload is **NEEDS FARIS**. Keep the release in draft or internal testing. Do not start a production rollout.

Local build, when he wants an AAB on disk and not on Play:

```bash
cd apps/makan-hour
npx expo prebuild -p android --clean --no-install
cd android
./gradlew bundleRelease -PreactNativeArchitectures=armeabi-v7a,arm64-v8a
```

Set the four `MAKAN_UPLOAD_*` variables in the environment first. Without them the plugin falls back to the debug key, and Play will refuse that AAB.

## Listing text

Paste this. It matches the app on `main` and the public site: Bangsar South, order by 10:30, one pantry drop, one monthly invoice, RM 2 office fee with the drop included, halal only when that caterer has a certificate on file. Prices of dishes stay on the menu. Counts of offices and caterers are not claimed, because the site still says partner caterers are onboarding.

### Apple

| Field | Limit | Text |
|---|---|---|
| Name | 30 | Makan Hour |
| Subtitle | 30 | Office lunch, one pantry drop |
| Promotional text | 170 | Bangsar South offices. Staff order by 10:30 on the company allowance. One pantry drop. One invoice, paid by FPX or card. |
| Keywords | 100 | lunch,office,catering,meal,allowance,invoice,pantry,bangsar,order |
| Category | — | Food & Drink. Secondary: Business. |
| What's New (1.0.0) | 4000 | First release for offices in Bangsar South. Staff order lunch before 10:30, the office sees the count, and the month ends with one invoice. |

Name is 10 characters. Subtitle is 29. Promotional text is 120. Keywords are 65.

### Google

| Field | Limit | Text |
|---|---|---|
| App name | 30 | Makan Hour |
| Short description | 80 | Order office lunch by 10:30. One drop to the pantry. One bill for the month. |
| Category | — | Food & drink |

Short description is 76 characters.

### Full description (Apple and Google, under 4000)

```
Makan Hour is the lunch app for an office in Bangsar South.

Each working morning the menu opens. Staff pick a meal before 10:30 and stay inside the allowance the office set. A partner caterer cooks to that count. The meals arrive together, in one drop at the office pantry, between 12:00 and 12:45. If the drop is late, the app says so.

The office admin sees who has ordered and what the day costs against the budget, and can nudge anyone who has not ordered. At 10:30 the list locks. At the end of the month the office gets one invoice and pays it by FPX or card. Staff do not pay at the desk, and they do not file a claim for the meal.

The caterer gets one batch and a label for each person, with the name and the desk.

Makan Hour does not run a kitchen. The caterer cooks. A dish shows a halal mark only when that caterer has a certificate on file.

The office pays RM 2 on top of each meal. The drop is included in that fee. Meal prices are on the menu.

This version is for offices in Bangsar South.
```

## Order of work before anyone presses Submit

1. Faris confirms the green M icon, or replaces the four icon files.
2. Export the 1024 monochrome icon, the 512 Play icon, the Apple screenshot set, the 1080×1920 Play shots, and the 1024×500 feature graphic.
3. Add the privacy and deletion links on the sign-in screen, and Sign in with Apple on the admin and caterer doors. Ship those in the binary that goes to review.
4. Correct the FCM sentence on the website.
5. He fills age rating, App Privacy, Data safety, and the review notes, using the answers in this file. He uses the three demo accounts.
6. He confirms the legal name on both consoles.
7. A TestFlight build and a Play internal draft, then stop.

Anything that needs his signature, his card, or his login stays with him.
