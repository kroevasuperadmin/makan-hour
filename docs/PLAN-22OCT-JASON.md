# Plan from Jason F2F, 22 Oct 2026

Source: recording "Jason F2F Discussion.m4a", transcript in Drive (Makan Hour folder). Timestamps below are from that transcript.

## What changes
The app is currently built for corporate catering (office admin, employee, kitchen). Faris at 09:01: "I got carried away with the corporate catering thing." Jason at 09:01-09:10: "customers buy the food. Vendors sell the food. Riders deliver the food... It's just a three of them."

Target roles (Faris, 09:14-09:19): staff -> customer, caterer -> vendor, plus admin and driver.
- Customer: Grab / foodpanda style. Browse restaurants and food, order, pay (08:18-08:22).
- Vendor (restaurant): sees only their own orders (09:34-09:38).
- Rider: delivers (09:06-09:08).
- Admin (us): sees everything (09:45-09:49). Jason: the admin panel has to stay in the app, it can't live in WhatsApp (07:47-08:00).

## WhatsApp layer (after the app)
- A customer bot on WhatsApp: re-order prompts ("last Thursday you ordered nasi goreng..."), takes orders in a normal conversation and understands slang (00:28-00:52, 03:04-03:47, 10:02-10:27).
- Bot flow: customer bot, then production bot, then kitchen bot, then ETA back to the customer (04:03-04:37).
- Use the official Meta Business API so the number doesn't get banned (00:54-01:32). Jason estimated "100 USD a month if I'm not wrong", per business (02:20-02:27). He said it was renamed "Meta One" (02:38). **Not verified.** Check Meta's current WhatsApp Business Platform pricing, which is per conversation/message, before quoting any number.

## Payments
Jason said Apple requires RevenueCat (04:43-04:50, 13:51-13:58). **Not verified, and probably wrong for this app.** Apple's guideline 3.1.3(e) lets physical goods and services delivered outside the app (such as food delivery) use a non-IAP payment gateway, and RevenueCat is a wrapper around IAP rather than an Apple requirement. Check the current guideline before changing the Stripe Checkout setup.

## Immediate fixes (Faris: "I'll fix it tonight", 05:11)
1. Access for Jason. Faris at 06:46-07:01: he didn't add Jason's email to the security measures, so Jason couldn't get past them. Roles come from `makan_members` (packages/core/src/auth.ts). Add Jason's email as admin in the live DB (needs Jason's email and DB access, not done from the box).
2. After that, Jason records a walkthrough on his Samsung (full screen, media and mic, show taps) with his voice and sends it to Faris (05:12-06:25).

## Other asks
- Faris to work out the costs that pass through to Jason plus his own cost (12:47-13:19). Faris: "I'm already working on it."
- Faris to send technical and product requirements in a form that's easy for Jason (13:31-13:42).
- Jason wants a free website builder where he can buy the domain elsewhere. He mentioned Wix.com (14:49-15:16). This is a separate topic.

## Build order (proposal, not agreed in the meeting)
1. Jason admin access, so the walkthrough can happen.
2. Data model: add `customer`, `vendor` and `rider` roles plus restaurants/menus and consumer orders, keeping the corporate flow behind a flag.
3. Customer browse/order/pay screens, a vendor order queue and a rider job list.
4. WhatsApp bot on the Meta Business Platform once the pricing is verified.
