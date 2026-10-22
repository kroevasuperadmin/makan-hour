# Reset and run the 3-phone demo

Three phones share one lunch. Phone A is the employee (Aina), phone B is the office admin (Nadia), and phone C is the kitchen (Dapur Contoh). They all have to be looking at the same demo, so reset that shared lunch before you start.

The companies and people are made up. The payment step is a sandbox. No money moves.

## Reset the shared lunch

The reset puts the clock back to 9:18 am and clears the things the three phones change together: Aina's order, her saved desk if she edited it, the nudges, the 10:30 cutoff, the three office drops, and the invoice payment. The staff who were already "ordered" in the story stay as they are. Those orders live in the app, not in the shared row.

You can reset from the admin phone, or from a computer. Either way is enough. Do it once, before anyone orders.

On Nadia's phone: press and hold the **Makan Hour** wordmark for about a second and a half. Tap **Reset the demo**. Leave **Keep going** if you held it by mistake.

On a computer, from the repo root:

```bash
node scripts/reset-demo.mjs --yes
```

Without `--yes` the script stops and changes nothing.

The script runs only when the Supabase URL is the demo project `rlfllmhcjqhgeoikjbha` (`https://rlfllmhcjqhgeoikjbha.supabase.co`). Any other URL makes it stop. It uses the anon key, the same one the app uses. Row rules still limit that key to the demo rows.

Put the URL and the anon key in `apps/makan-hour/.env` (see `.env.example`). That file is not committed. The script reads it when those two values are not already in the environment. It never prints the key. Do not paste the key into the command, and do not commit it.

If a reset stops halfway, run the same command again. A second run is safe.

## Sign in the three phones

1. Open the app on each phone. The live site is https://makanhour.rizqey.com/app. A TestFlight build is fine too. The phones need a network so they stay in step.
2. On the first screen, under **Demo accounts**, tap the person for that phone.
   - Phone A, the one you hand over: **Aina Rahman** (`aina@contoh-capital.my`).
   - Phone B, the one you hold: **Nadia Osman** (`nadia.admin@contoh-capital.my`).
   - Phone C, or a laptop: **Dapur Contoh Catering** (`ops@dapurcontoh.my`).
3. The screen shows the demo code **220126**. Tap **Paste demo code**, then **Sign in as Aina** (or Nadia, or Dapur). No email is sent.
4. **Sign out** is at the top right if a phone is on the wrong person.

Reset from Nadia's phone now if you did not already reset from the computer. Wait until Aina's phone is on the menu and the clock reads about 9:18 am.

## Walk through it

Keep the three screens where you can see them. Talk through it in this order. It takes about five minutes.

1. Show all three. Say this is one app: staff, HR, and the caterer each sign in and see their own part of the same lunch.
2. Hand over phone A. Aina picks a dish and taps **Order**. Say it is one tap and there is no checkout, because the company pays.
3. On Aina's phone, point at the green "you're in for lunch" card and the saved desk (Level 12, Desk 12-07, unless she changed it).
4. On Nadia's phone the headcount goes up by one. On the kitchen phone the batch count goes up by one. Say the order is already on HR's screen and in the kitchen's count.
5. On Nadia's phone, show spend against the budget and who has not ordered. Tap **Nudge all**.
6. On Nadia's phone, tap **Run the 10:30 am cutoff now**. Aina's phone then says ordering has closed.
7. On the kitchen phone, open the batch and tap **Confirm batch**. Open **Labels**. Aina's name and desk are on a label. Say the caterer gets one list, with every bag labelled, instead of a pile of chats.
8. Open **Drops**. For Contoh Capital (drop A), tap **Mark preparing**, then **Mark out for delivery**, then **Traffic +12**. Say each office gets one rider and one stop, and a late rider warns people before the food is due.
9. Aina's phone shows an amber delay.
10. On the kitchen phone, tap **Mark delivered**. Aina's phone says lunch is at the Level 12 pantry.
11. On Nadia's phone, open the invoice. If card payment is switched on, the button is **Pay … by FPX or card**. Otherwise tap **Walk through the mock flow instead**. Pick any made-up bank, tap **Continue to bank**, then **Approve sandbox payment**. Say finance gets one invoice a month, and this is a sandbox so no money moves.

If the room has no working network, the phones cannot share the lunch. Use a recording, or the pictures in `docs/screens/`.

Two demos at the same time will collide. There is only one shared session.
