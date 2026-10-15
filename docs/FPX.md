# FPX payments (Billplz)

The app never holds a payment key. It calls three server routes deployed with the web build (`apps/makan-hour/api/fpx/`):

| Route | What it does |
|---|---|
| `POST /api/fpx/create` | Creates a Billplz bill (`kind` = `invoice` for the office invoice, `topup` for an employee top-up) and returns its FPX payment URL |
| `GET /api/fpx/status?id=` | Asks Billplz whether the bill is paid. The app polls this every 4 s and marks the invoice or top-up paid |
| `POST /api/fpx/callback` | Billplz callback. Verifies the X Signature and acknowledges |

Until the keys below are set, `create` answers 503 and the app says FPX isn't switched on, then offers the mock flow.

Set these as Vercel env vars on the `makan-hour-app` project (never in git):

| Var | Sandbox | Live |
|---|---|---|
| `BILLPLZ_API_KEY` | from billplz-sandbox.com account settings | live merchant secret key |
| `BILLPLZ_COLLECTION_ID` | sandbox collection | live collection |
| `BILLPLZ_X_SIGNATURE` | sandbox X Signature key | live X Signature key |
| `BILLPLZ_SANDBOX` | `1` (default) | `0` |

Native builds call `EXPO_PUBLIC_API_URL` (default `https://makan-hour-app.vercel.app`). After adding the vars, redeploy the web build so the functions pick them up.

FPX B2B (corporate banking) has to be enabled on the Billplz merchant account separately. Bills use FPX B2C by default.
