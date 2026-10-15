# TestFlight build (prepared, not run)

This is one app with one App Store Connect record and one TestFlight listing.

| App | Folder | Bundle ID | EAS config |
|---|---|---|---|
| Makan Hour | `apps/makan-hour` | `my.makanhour.app` | `apps/makan-hour/eas.json` |

Testers install the same build. They sign in as the employee, the office admin or the kitchen account, and each sees their own experience.

## What Faris needs to provide

1. **An Expo account login.** Run `npx eas-cli login`, or create an access token at expo.dev and export it as `EXPO_TOKEN`.
2. **Apple Developer Program access** (paid, USD 99 a year) for the team that will own the app. Choose one:
   - **Option A, interactive:** sign in with the Apple ID during `eas build` and approve the 2FA prompt. EAS then creates the certificate, provisioning profile and bundle ID.
   - **Option B, no 2FA prompts:** an **App Store Connect API key** with the App Manager role. You need the `.p8` file, its Key ID and the Issuer ID.
3. **One App Store Connect app record** for `my.makanhour.app`. `eas submit` can create it, or you can make it by hand. Put its numeric Apple ID into `submit.production.ios.ascAppId` in `eas.json`.
4. **The Supabase anon key** as an EAS environment variable, so it is not committed:
   ```bash
   cd apps/makan-hour
   npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value https://rlfllmhcjqhgeoikjbha.supabase.co --visibility plaintext
   npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon key> --visibility sensitive
   ```
5. **TestFlight testers.** Add the Apple ID emails for your three demo phones and the investor. Internal testers can install right away. External testers wait for Beta App Review, which usually takes about a day, so add them well before 22 Oct.

## Commands

```bash
cd apps/makan-hour
npx eas-cli init                                   # links to an Expo project and writes the projectId into app.json
npx eas-cli build -p ios --profile production
npx eas-cli submit -p ios --profile production --latest
```

## Notes

- `ITSAppUsesNonExemptEncryption` is set to false, which skips the export-compliance question.
- Build numbers auto-increment on EAS (`appVersionSource: remote`).
- `supportsTablet` is on, so the admin experience can use iPad layouts.
- The icon is a placeholder monogram. Replace it with 1024×1024 artwork before an external review.
