# Work Schedule

Weekly shift scheduling for a hospital department. Employees request shifts, the admin approves them and builds the week, and the finished schedule can be downloaded as an Excel file.

**Live:** https://work-schedule-production-835b.up.railway.app

## Features

**Employees**
- See their own week: morning (07–15), afternoon (15–23) and night (23–07) slots
- Request a free slot with one tap; the request waits for the admin
- See the status of every request: approved, pending or rejected

**Admin**
- Roster of all employees × 7 days, with search and a "pending only" filter
- Approve or reject requests, add or change any shift (custom hours too)
- Coverage row: how many people work each slot every day, empty slots in red
- Export the week to Excel (always in Hebrew, right-to-left)

**Everyone**
- English and Hebrew (full right-to-left layout), switch in the header
- Works on phones: the whole week fits the screen
- Dark theme

### Scheduling rules (checked by the server)

- A shift is 4–12 hours long
- No overlapping shifts for one employee
- No more than 12 hours in a row (back-to-back shifts count as one block)
- No more than 60 hours a week (Sunday–Saturday, Israel time)
- Employees can't request a slot that has already started
- Rejected shifts don't count

Two requests for the same time arriving together are also stopped by a database constraint.

## Stack

| Part | Tech |
| --- | --- |
| Client | React 19, TypeScript, Vite, Tailwind CSS v4, lucide-react, exceljs |
| Server | Node.js, Express 5, TypeScript, JWT auth, bcrypt |
| Database | PostgreSQL on [Neon](https://neon.tech) |
| Hosting | [Railway](https://railway.com), one service: Express serves the API and the built client |

## Project structure

```
WorkSchedule/
├── package.json          build / start / migrate for hosting
├── client/               React app
│   └── src/
│       ├── components/   AdminRoster, WeekCalendar, ShiftForm, ...
│       ├── pages/        LoginPage, RegisterPage
│       ├── api.ts        fetch wrapper and API calls
│       ├── dates.ts      week and slot helpers
│       ├── i18n.ts       English / Hebrew texts
│       └── exportRoster.ts  Excel export
└── server/               Express API
    └── src/
        ├── controllers/  auth, shifts (with the rules), users
        ├── routes/
        ├── middleware/   auth (JWT), error handler
        └── db/           connection and migration
```

## Running locally

You need Node.js 22+ and a PostgreSQL database (a free Neon database works).

1. Create `server/.env`:

   ```env
   DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
   JWT_SECRET=any-long-random-string
   REGISTRATION_CODE=dev-code
   ```

2. Install and create the tables:

   ```bash
   cd server
   npm install
   npm run migrate
   ```

3. Start the server (port 3001):

   ```bash
   npm run dev
   ```

4. In another terminal, start the client (port 5173, `/api` is proxied to the server):

   ```bash
   cd client
   npm install
   npm run dev
   ```

5. Open http://localhost:5173, sign up with the registration code, then make yourself admin (see below).

### Making an admin

Everyone signs up as an employee. To make someone admin, run in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'name@example.com';
```

The change works right away (the role is read from the database on every request); log out and back in to see the admin view.

## Environment variables

| Name | What it is |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for signing login tokens; use a long random string in production |
| `REGISTRATION_CODE` | Code employees need to sign up. Not set = sign up is closed |
| `PORT` | Server port. Set by the host; defaults to 3001 |

## Deployment (Railway)

The repo is connected to Railway: every push to `main` deploys automatically (takes 2–3 minutes).

Service settings:
- **Root directory:** `/WorkSchedule`
- **Build / start:** taken from `WorkSchedule/package.json` (`npm run build`, `npm start`)
- **Pre-deploy command:** `npm run migrate` (safe to run every time)
- **Variables:** `DATABASE_URL`, `JWT_SECRET`, `REGISTRATION_CODE`

## API

All `/api/shifts` and `/api/users` routes need `Authorization: Bearer <token>`.

| Method | Path | Who | What |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | anyone with the code | Sign up as employee |
| POST | `/api/auth/login` | anyone | Returns `{ token, user }` |
| GET | `/api/shifts` | employee / admin | Own shifts / all shifts |
| GET | `/api/shifts/:id` | employee / admin | One shift |
| POST | `/api/shifts` | employee | `{ date, slot }` → pending request |
| POST | `/api/shifts` | admin | `{ user_id, start_time, end_time }` → approved shift |
| PUT | `/api/shifts/:id` | admin | Change a shift (becomes approved) |
| PATCH | `/api/shifts/:id/status` | admin | `{ status: "approved" \| "rejected" }` |
| GET | `/api/users` | admin | All users |
| GET | `/api/health` | anyone | `{ status: "ok" }` |

Errors are JSON: `{ message, code }`. The `code` (e.g. `MAX_WEEK`, `OVERLAP`) lets the client show the message in the user's language. Login and sign up are limited to 20 attempts per 15 minutes per IP.
