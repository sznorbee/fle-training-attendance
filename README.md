# Training attendance

A small web app that replaces hand-editing the federation's
`TRAINING_ATTENDANCE` spreadsheet. Coaches tick who was at training on their
phone; the app keeps the data in Postgres and writes it back to the shared
sheet once a day.

- **Next.js 16** (App Router, Server Actions, TypeScript) – deploys to Vercel
- **Postgres on Neon** with Drizzle ORM
- **Neon Auth** for sign-in
- **Tailwind CSS 4** with shadcn/ui components

## What it does

| Screen | Who | Purpose |
| --- | --- | --- |
| `/attendance` | coaches, federation | Record one day: Absent / Present / Lesson / Other (+ reason) per athlete, "Mark the rest absent" |
| `/overview` | coaches, federation | Month grid like the spreadsheet, with +, −, % and lessons |
| `/athletes/[id]` | everyone allowed to see that athlete | Season summary and month-by-month record |
| `/admin` | federation | Import the .xlsx, manage who has access, run/inspect the sheet sync |

### Roles

Access is granted **by e-mail address** on the Admin page. A person signs up
with that address and receives the role:

| Role | Sees | Edits |
| --- | --- | --- |
| `federation` | every club and squad | everything, plus import, access and sync |
| `coach` | athletes of their own club | attendance of their own club |
| `athlete` | their own record | nothing |

The rules live in one place, `src/lib/auth/permissions.ts`, and are enforced on
the server for every page and every Server Action. Addresses listed in
`ADMIN_EMAILS` are always federation administrators, which is how the first
administrator gets in.

### Spreadsheet conventions

Each worksheet is a squad. A cell means: `0` absent, `1` present, `2` present
with an individual lesson, any other text (competition venue, `*`) is kept as
an "other" mark with that text as the reason. Only the main roster is imported
(rows from row 3 down to the first row without a family name).

## Getting started

```bash
cp .env.example .env.local   # fill in DATABASE_URL at least
npm install
npm run db:migrate
npm run dev
```

Without the `NEON_AUTH_*` variables the app shows a **development sign-in**
where any e-mail address works (never available in production). Put your
address in `ADMIN_EMAILS`, sign in, open **Admin**, import the workbook and add
the coaches.

| Script | |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm test` | unit tests (sheet layout, marks, permissions, stats) |
| `npm run lint` / `typecheck` | static checks |
| `npm run db:generate` | create a migration after changing `src/db/schema.ts` |
| `npm run db:migrate` | apply migrations |

## Deploying

1. **Neon** – create a project, copy the pooled connection string to
   `DATABASE_URL` and the direct one to `DATABASE_URL_UNPOOLED`, then run
   `npm run db:migrate` once (and after each schema change).
2. **Neon Auth** – enable Auth for the project in the Neon console, switch on
   e-mail verification, copy the Auth URL to `NEON_AUTH_BASE_URL` and generate
   `NEON_AUTH_COOKIE_SECRET`.
3. **Vercel** – import the Git repository and set the variables from
   `.env.example`. `vercel.json` schedules the daily sync.

### Daily sync to the shared Google Sheet

The sync writes only the cells that were recorded in the app since the last
run, so formulas, formatting and other clubs' manual entries are untouched.
Athletes are found by name and days by the sheet's own header, so reordering
rows in the sheet is fine.

1. In Google Cloud, enable the *Google Sheets API* and create a service account
   with a JSON key.
2. Share the spreadsheet with the service account's e-mail as **Editor**.
3. Set `GOOGLE_SHEET_ID` (from the sheet URL), `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
   `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` and `CRON_SECRET`.

Vercel Cron calls `/api/cron/sync-sheet` every night; administrators can also
press **Sync now** on the Admin page. The shared file must be a native Google
Sheet (an .xlsx merely stored in Drive has to be converted first).

## Project layout

```
src/
  app/            routes: (app)/attendance, overview, athletes, admin · auth · api
  components/     shared UI, components/ui = shadcn/ui
  db/             Drizzle schema and connection
  lib/
    auth/         Neon Auth, session resolution, permission rules
    sheet/        spreadsheet layout parser, mark <-> cell mapping, xlsx + Google clients
  server/         use-cases: roster, attendance, import, sync, members
drizzle/          SQL migrations
```
