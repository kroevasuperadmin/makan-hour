# TestFlight via GitHub Actions (no EAS)

There is one app, **Makan Hour** (`my.makanhour.app`), with one App Store Connect record and one TestFlight listing.

The pipeline is `.github/workflows/ios-testflight.yml`.

> **Not active yet.** The box's GitHub token lacks the `workflow` scope, so the workflow file is committed at `ci/ios-testflight.yml`. To activate it, move it to `.github/workflows/ios-testflight.yml`, either on github.com (*Add file → Create new file*, then paste) or from a machine whose token has `workflow` scope: `git mv ci/ios-testflight.yml .github/workflows/ && git push`.
 It runs on a GitHub macOS runner when you start it by hand (**Actions → iOS TestFlight → Run workflow**) or push a tag such as `ios-v0.1.0`. The steps are:

1. `npm ci`, then `expo prebuild --platform ios` to generate `ios/` (this folder is not committed)
2. `pod install`
3. fastlane `ios beta` (`apps/makan-hour/fastlane/Fastfile`), which:
   - signs in to App Store Connect with the API key (`app_store_connect_api_key`)
   - gets or creates the Apple Distribution certificate (`get_certificates`) and the App Store provisioning profile (`get_provisioning_profile`). No `match` repo is needed.
   - sets the build number to the latest TestFlight build plus one
   - builds and exports the `.ipa` (`build_app`)
   - uploads it to TestFlight (`upload_to_testflight`)

## GitHub Actions secrets

| Secret | Status | What it is |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | **set** | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | **set** | Supabase anon key, limited by row-level security to the `makan_*` demo tables |
| `ASC_KEY_ID` | needed from Faris | App Store Connect API key ID |
| `ASC_ISSUER_ID` | needed from Faris | Issuer ID, shown on the same App Store Connect page |
| `ASC_KEY_P8` | needed from Faris | The `.p8` key file, base64-encoded: `base64 -i AuthKey_XXXX.p8 \| pbcopy` |
| `APPLE_TEAM_ID` | needed from Faris | 10-character Team ID from developer.apple.com → Membership |
| `DIST_CERT_P12` / `DIST_CERT_PASSWORD` | optional | An existing Apple Distribution certificate, as a base64 `.p12` file plus its password. See the note on certificates. |

Set them with `gh secret set NAME -R kroevasuperadmin/makan-hour` (it prompts for the value), or in the repo under **Settings → Secrets and variables → Actions**.

## What Faris needs to do

1. **Join the Apple Developer Program** (USD 99 a year) for the team that will own the app.
2. **Create an App Store Connect API key:** App Store Connect → Users and Access → Integrations → App Store Connect API → Team Keys → *Generate*.
   - Give it the **App Manager** role. That is enough to create certificates and profiles and to upload builds.
   - Download the `.p8` file. Apple only lets you download it once.
   - Note the Key ID and the Issuer ID, then set the four `ASC_*` / `APPLE_TEAM_ID` secrets.
3. **Register the bundle ID and create the app record.** This needs a person; the API key cannot create app records.
   - developer.apple.com → Identifiers → **+** → App IDs → `my.makanhour.app`. No extra capabilities are needed.
   - App Store Connect → Apps → **+** → New App: iOS, name "Makan Hour", bundle ID `my.makanhour.app`, any SKU.
4. **Run the workflow** from the Actions tab. A build takes about 20–30 minutes. TestFlight then processes it for another 5–15 minutes.
5. **Add testers** in App Store Connect → TestFlight.
   - Internal testers can install right away.
   - External testers, such as the investor, need Beta App Review, which usually takes about a day. Add them before 22 Oct.
6. On the phones, sign in to the TestFlight build with the three demo accounts (employee, admin, kitchen).

## Notes

- **Certificates.** Each CI run starts with an empty keychain. Without `DIST_CERT_P12`, `get_certificates` makes a new Apple Distribution certificate on every run, and Apple allows only a few per team. After the first successful run:
  - export that certificate from Keychain Access on a Mac as a `.p12` and set `DIST_CERT_P12` (base64) and `DIST_CERT_PASSWORD`, or
  - revoke old certificates at developer.apple.com when you reach the cap.
- **Encryption.** `ITSAppUsesNonExemptEncryption` is false in `app.json`, which skips the export-compliance question.
- **Repo visibility.** The repo is public for free macOS minutes. The workflow never prints secrets and deletes the decoded key files at the end of the job. Builds run only when you start them by hand or push an `ios-v*` tag, so pull requests from forks cannot reach the secrets.
- **Icon.** The icon is a placeholder monogram. Replace it before an external review.
- **Fallback.** `apps/makan-hour/eas.json` is still there if you ever decide to use EAS instead.
