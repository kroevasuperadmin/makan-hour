# Late-drop push notifications

Two layers:

1. **Local alert (works now).** When a delay reaches an open or recently backgrounded app over realtime, the app raises a system notification itself (`src/notify.ts`). The browser build uses the Notification API.
2. **Server push, app closed (code done, needs keys).** iPhones send their APNs device token to `POST /api/push/register`. When the caterer taps "Traffic +12", the app calls `POST /api/push/delay`. The server re-reads the drop from Supabase, sends one APNs alert per device in that office, and records `delay_pushed_at` so it sends only once per delay. This goes straight to APNs, with no EAS or Expo push service.

The bundle `my.makanhour.app` has the Push Notifications capability (enabled 16 Oct 2026 via the ASC API), and builds carry `aps-environment = production`.

Needed before server push sends (Vercel env on `makan-hour-app`, never in git):

| Var | Where it comes from |
|---|---|
| `APNS_KEY_P8`, `APNS_KEY_ID` | developer.apple.com → Keys → "+" → Apple Push Notifications service (APNs). The App Store Connect API can't create this key type |
| `APNS_TEAM_ID` | `4PX34WYHUB` |
| `APNS_TOPIC` | `my.makanhour.app` |
| `APNS_PRODUCTION` | `1` (TestFlight and App Store builds use production APNs) |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | rizqey-admin project settings. Server only |

Plus run `supabase/makan_migration_2.sql` once to create `makan_push_tokens` and `makan_drops.delay_pushed_at`.
