# TestFlight builds (prepared, not run)

There are three iOS apps, each with its own `eas.json` and bundle ID:

| App | Folder | Bundle ID |
|---|---|---|
| Makan Hour | `apps/employee` | `my.makanhour.app` |
| Makan Hour Admin | `apps/admin` | `my.makanhour.admin` |
| Makan Hour Kitchen | `apps/kitchen` | `my.makanhour.kitchen` |

## What Faris needs to provide

1. **An Expo account login.** Run `npx eas-cli login` on the build machine, or create an access token at expo.dev and export it as `EXPO_TOKEN`.
2. **Apple Developer Program access** (paid membership, USD 99 a year) for the team that will own the apps. Choose one:
   - **Option A, interactive:** sign in with the Apple ID during `eas build` and approve the 2FA prompt on your device. EAS then creates the certificates, provisioning profiles and bundle IDs.
   - **Option B, no 2FA prompts:** an **App Store Connect API key** with the App Manager role. You need the `.p8` file, its Key ID and the Issuer ID. EAS can store these, and they are also used by `eas submit`.
3. **Three App Store Connect app records**, one per bundle ID. `eas submit` can create them, or you can make them by hand. Put each app's numeric Apple ID into `submit.production.ios.ascAppId` in that app's `eas.json`.
4. **The Supabase anon key** set as an EAS environment variable, so it isn't committed. Run this once per app folder:
   ```bash
   npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value https://rlfllmhcjqhgeoikjbha.supabase.co --visibility plaintext
   npx eas-cli env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value <anon key> --visibility sensitive
   ```
   Repeat both commands with `--environment preview` if you want preview builds.
5. **TestFlight testers.** Add the investor's and your own Apple ID emails as internal or external testers in App Store Connect. External testers wait for Beta App Review, which usually takes about a day, so add them well before 22 Oct.

## Commands (per app)

```bash
cd apps/employee          # then apps/admin, apps/kitchen
npx eas-cli init          # links the folder to an Expo project and writes the projectId into app.json
npx eas-cli build -p ios --profile production
npx eas-cli submit -p ios --profile production --latest
```

## Notes

- `ITSAppUsesNonExemptEncryption` is set to false, which skips the export-compliance question.
- Build numbers auto-increment on the EAS side (`appVersionSource: remote`).
- The icons are simple placeholders. Before an external TestFlight review, replace them with real 1024×1024 artwork.
- The EAS free tier has a limited monthly build quota and queue priority. Three iOS builds should fit.
