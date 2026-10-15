# Payments (Stripe: FPX and card, MYR)

Lunch is a physical good, so App Store guideline 3.1.3(e) applies and Apple In-App Purchase is not used.

The app never holds a Stripe key. It calls server routes deployed with the web build (`apps/makan-hour/api/pay/`):

| Route | What it does |
|---|---|
| `POST /api/pay/create` | Creates a Stripe Checkout Session (`payment_method_types` = `fpx`, `card`; currency `myr`) for the office invoice (`kind: invoice`) or an employee top-up (`kind: topup`), and returns its URL |
| `GET /api/pay/status?id=cs_...` | Asks Stripe whether the session is paid. The app polls every 4 s, then marks the invoice or top-up paid with the PaymentIntent id and method (FPX or card) |
| `POST /api/pay/webhook` | Verifies `Stripe-Signature` against `STRIPE_WEBHOOK_SECRET` and logs the event |

Until `STRIPE_SECRET_KEY` is set, `create` answers 503. The app then says online payment isn't switched on and offers the mock flow.

Vercel env on `makan-hour-app` (never in git): `STRIPE_SECRET_KEY` (start with `sk_test_` for a dry run), `STRIPE_WEBHOOK_SECRET` (from the webhook endpoint created for `https://makan-hour-app.vercel.app/api/pay/webhook`, for events `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed`).

FPX only works on a Stripe account registered in Malaysia, and has to be switched on under Settings → Payment methods. Stripe takes FPX payments between RM 2 and RM 30,000.
