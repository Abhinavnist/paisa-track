# PaisaTrack — Expense Tracker (V1)

A dead-simple, mobile-first web app that shows salaried people exactly where their money
goes each month. Log expenses in seconds, see a clear breakdown by category, set your
salary + budget, and have your salary auto-credited each month.

Built with **Next.js (App Router) + TypeScript**, **PostgreSQL + Prisma**, **Auth.js**
(email/password + Google), **Tailwind CSS**, and **Recharts**.

## Features
- Email/password **and** Google sign-in; pick your currency at signup
- Add / edit / delete expenses & income (amount, category, date, note)
- Monthly summary: balance, income, spend, budget progress with over-budget warning
- "Where your money went" donut chart + category breakdown
- Full history with month navigation
- Monthly salary **auto-credited** (lazy: added the first time you open the app each month)
- Installable PWA (works great added to a phone home screen)

## Getting started

### 1. Prerequisites
- Node 20+ and a running PostgreSQL database.

### 2. Environment
Values live in `.env` (already created for local dev). Adjust `DATABASE_URL` if needed:

```
DATABASE_URL="postgresql://<you>@localhost:5432/expense_tracker?schema=public"
AUTH_SECRET=... (already generated)
```

### 3. Database
```bash
npx prisma migrate dev   # creates tables
```

### 4. Run
```bash
npm run dev
```
Open http://localhost:3000 — you'll be redirected to log in. Create an account and go.

Tip: to test on a real phone, run `npm run dev` and open `http://<your-mac-LAN-ip>:3000`.

## Enabling Google sign-in (optional)
Google is hidden until credentials are set. To enable it:
1. In Google Cloud Console → APIs & Services → Credentials, create an **OAuth client ID**
   (type: Web application).
2. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
   (and your production URL later).
3. Put the values in `.env`:
   ```
   AUTH_GOOGLE_ID=your-client-id
   AUTH_GOOGLE_SECRET=your-client-secret
   ```
4. Restart `npm run dev`.

## Useful commands
- `npx prisma studio` — browse/edit the database in a GUI
- `npm run build` — production build
- `npm run lint` — lint

## Where your data is stored

**Right now (development): a local PostgreSQL database on this machine.**

- Database name: `expense_tracker`, running at `localhost:5432` (started via Homebrew `postgresql@18`).
- The app talks to it through **Prisma** using the `DATABASE_URL` in `.env`.
- Every account, category, and transaction is a **row in that Postgres database** — nothing
  leaves your computer, and nothing is in the cloud yet.
- Login sessions are a signed **JWT stored in a browser cookie** (no session rows in the DB).
- Passwords are never stored in plain text — only a **bcrypt hash**.

Browse everything yourself with a GUI:
```bash
npx prisma studio        # opens a table browser at http://localhost:5555
```

**When we deploy (production):** the exact same code points `DATABASE_URL` at a hosted
Postgres (e.g. **Neon** or **Supabase**, both have free tiers). Then data is stored online
and syncs across every device the user logs in from — because this is a cloud-account app,
not device-only storage. No code changes are needed, just the connection string.

## Can we build the "Fast Budget"–style features?

Yes — most of them fit this architecture. Here's an honest status + plan:

| Feature (like Fast Budget)        | Feasible? | Where it lands |
|-----------------------------------|-----------|----------------|
| Overview screen, charts, reports  | ✅ Done (basic) | Already built; can add more report types |
| Custom categories & subcategories | ✅ Categories done | Subcategories = small schema add |
| Budgets + spending-limit alerts   | 🟡 Budget done | Add per-category limits + alerts (V1.1) |
| Recurring / scheduled transactions| ✅ Easy | Same mechanism as auto-salary (V1.1) |
| Transaction templates             | ✅ Easy | Save-and-reuse a transaction (V1.1) |
| CSV import / export               | ✅ Easy | Parse/generate CSV on the web app (V1.1) |
| Multiple accounts + credit cards  | 🟡 Medium | Add an `Account` model, tag transactions |
| Free / Premium / Ultra plans      | 🟡 Medium | Add billing (Stripe/Razorpay) + plan gating |
| **Automatic bank sync**           | 🔴 Big     | Needs a licensed aggregator — see below |

## "Can it track expenses automatically?"

Short answer: **partly on the web, fully only in a native Android app (our V2 APK).**
There are four levels of automation, from easiest to hardest:

1. **Recurring/scheduled transactions (automatic, buildable now).**
   Your salary already auto-credits each month using this idea. We can extend it to rent,
   EMIs, subscriptions, etc. — they post themselves on schedule. No bank access needed.

2. **Email-alert parsing (semi-automatic, works on web).**
   Most banks/UPI apps email you on every transaction. With the user's permission we can
   read those alert emails (Gmail API) and auto-create transactions. Web-friendly.

3. **SMS / notification reading (automatic, Android APK only).**
   In India, banks & UPI apps (GPay/PhonePe/Paytm) send a transaction **SMS or push
   notification** for every payment. A native Android app can read these (SMS permission /
   NotificationListener) and auto-log the expense. **This is the most practical "automatic"
   path for India — but a browser cannot read SMS, so it only works in the V2 APK**, and
   must follow Google Play's SMS-permission policy.

4. **True bank sync (fully automatic, biggest effort).**
   Directly pulling transactions from bank accounts (what Fast Budget's "Bank Sync" does)
   requires a **licensed account-aggregator**: in India the **RBI Account Aggregator
   framework** via providers like **Setu / Finvu / Perfios**; internationally **Plaid /
   TrueLayer / Salt Edge**. These are paid, need business agreements + compliance, and are a
   V3-scale project.

**Recommended order:** ship recurring transactions + CSV import first (quick wins), then the
Android APK with SMS/notification auto-capture (the real "automatic" experience for Indian
users), and only later evaluate full bank-aggregator sync.

## Roadmap
**V1.1 (web, quick wins):** recurring transactions, per-category budget alerts, transaction
templates, CSV import/export, more charts.

**V2 (Android APK):** wrap this same app with **Capacitor**; add **automatic SMS/notification
expense capture**, offline cache, app icon/splash, push reminders.

**V3 (advanced):** multiple accounts + credit cards, subscription plans (Stripe/Razorpay),
optional bank-aggregator sync, shared/family budgets.
