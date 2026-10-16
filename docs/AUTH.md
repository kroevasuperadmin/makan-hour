# Sign-in

Role first, then identity. The sign-in screen asks "staff, office admin or caterer", then offers:

| Role | Options |
| --- | --- |
| Staff | Google, Microsoft, Sign in with Apple (iOS, native), email + password |
| Office admin | Google, Microsoft. "New office?" creates an office with the same buttons |
| Caterer | Google, email + password |

The identity only proves the email. The role comes from `makan_members`, which only an office
admin can write. `makan_claim_invites()` (supabase/makan_migration_3.sql) links a member row to a
signed-in user only when the email is verified, and, if the office set an admin domain on the Team
tab, only admins at that domain. Picking the wrong role tells the person which one they have.

There is no magic link or email code. Password accounts confirm their address once, by a single
confirmation email at sign-up, because invites are matched on email.

Demo accounts (Aina, Nadia, Dapur Contoh) still use code 220126 and never touch Supabase Auth.

Flows: web uses the Supabase OAuth redirect (PKCE) back to the same page. Native opens the OAuth
page with expo-web-browser and returns on `makan-hour://auth`. iOS Apple uses
expo-apple-authentication and `signInWithIdToken` (client id `my.makanhour.app`).
Apple on web/Android stays hidden until `EXPO_PUBLIC_APPLE_WEB=1` and a Services ID is set up.

Supabase callback for every provider: `https://rlfllmhcjqhgeoikjbha.supabase.co/auth/v1/callback`
