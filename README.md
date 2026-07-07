# PaisaTrack — Expense Tracker + Splits + Notes

A dead-simple, mobile-first web app that shows salaried people exactly where their money
goes each month. Log expenses in seconds, see a clear breakdown by category, set your
salary + budget, split shared bills with friends, and keep rich notes — all in one place.

Built with **Next.js 16 (App Router) + TypeScript**, **PostgreSQL + Prisma**, **Auth.js**
(email/password + Google), **Tailwind CSS v4**, **Recharts**, and **TipTap** (rich-text editor).

## Features

### 💸 Core expense tracking
- Email/password **and** Google sign-in; pick your currency at signup
- Add / edit / delete expenses & income (amount, category, date, note)
- Monthly summary: balance, income, spend, budget progress with over-budget warning
- "Where your money went" donut chart + category breakdown
- Full history with month navigation
- Monthly salary **auto-credited** (lazy: added the first time you open the app each month)
- Installable PWA (works great added to a phone home screen)

### 📊 V2 additions
- **Recurring transactions** — rent, EMIs, subscriptions post themselves on a monthly/weekly schedule
- **Per-category budgets** with spending-limit tracking
- **Insights** — spending trends and comparisons over time
- **Search** across your transaction history
- **CSV export** of your data
- **Dark mode** (class-based, follows your system preference)

### 👥 Splitwise-style expense splitting
- **Friends** by email invite (invites auto-link when the person signs up)
- **Groups** for trips/flatmates with admin roles and member management
- Split a bill **equally, by exact amounts, by percentage, or by shares** — always rounds to the exact total
- Live **who-owes-whom** balances, per friend and per group
- **Settle up** to zero out balances
- Fully isolated from your personal ledger — a shared dinner never touches your own expense totals

### 📝 Notes (new)
- **Rich-text editor** (TipTap): headings, bold/italic, lists, **checklists**, quotes, code blocks, links
- Organize with **folders** and colored **tags**; **pin**, **archive**, and **trash** (with restore)
- Full-text **search** across titles and content
- **Three ways to share**, private by default:
  - **Public read-only link** — anyone with the link can view, no login; revoke or reset the link anytime
  - **Invite by email** — as viewer or editor; the invite links to their account on signup
  - **Share with a friend** — pick from your existing friends, viewer or editor
- Shared notes appear under **"Shared with me"**; editors can edit, viewers are read-only

## Getting started

### 1. Prerequisites
- Node 20+ and a running PostgreSQL database.

### 2. Environment
Values live in `.env` (git-ignored). See `.env.example` for the full list:

```
DATABASE_URL="..."   # pooled connection (app runtime)
DIRECT_URL="..."     # direct connection (migrations)
AUTH_SECRET="..."    # openssl rand -base64 33
AUTH_TRUST_HOST=true
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

## Deploy to Vercel + Neon

The database is already on **Neon** and migrated. To put the app online:

1. Go to **vercel.com** → **Add New → Project** → import `Abhinavnist/paisa-track`.
2. Vercel auto-detects Next.js. Before deploying, add these **Environment Variables**:
   | Name | Value |
   |------|-------|
   | `DATABASE_URL` | Neon **pooler** URL (host has `-pooler`) |
   | `DIRECT_URL` | Neon **direct** URL (host without `-pooler`) |
   | `AUTH_SECRET` | a fresh `openssl rand -base64 33` value |
   | `AUTH_TRUST_HOST` | `true` |
   | `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | only if using Google login |
3. Click **Deploy**. You'll get a live `https://<app>.vercel.app` URL.

Tables already exist in Neon (migrated). For **future** schema changes, run
`npm run db:migrate` locally (it targets `DIRECT_URL`) before deploying.

> Google login in production: add redirect URI
> `https://<app>.vercel.app/api/auth/callback/google` in Google Cloud Console.

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
| Overview screen, charts, reports  | ✅ Done | Dashboard + Insights |
| Custom categories & subcategories | ✅ Categories done | Subcategories = small schema add |
| Budgets + spending-limit alerts   | ✅ Done | Per-category budgets shipped; proactive alerts next |
| Recurring / scheduled transactions| ✅ Done | Monthly/weekly recurring rules |
| CSV import / export               | 🟡 Export done | Import = parse CSV (next) |
| Split expenses with friends       | ✅ Done | Splitwise-style friends/groups/settlements |
| Notes & shared lists              | ✅ Done | Rich-text notes with public/email/friend sharing |
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
**✅ Shipped:** core tracking, recurring transactions, per-category budgets, insights, search,
CSV export, dark mode, PWA, **Splitwise-style splitting** (friends, groups, settlements), and
**Notes** (rich text, folders/tags, public/email/friend sharing).

**V2 (Android APK):** wrap this same app with **Capacitor**; add **automatic SMS/notification
expense capture**, offline cache, app icon/splash, push reminders.

**V3 (advanced):** multiple accounts + credit cards, subscription plans (Stripe/Razorpay),
optional bank-aggregator sync, shared/family budgets, note reminders + activity feed.
