# Personal Expense Tracker — Full Stack (MERN)

A complete full-stack expense tracker with authentication, categorized expenses, monthly
reports, interactive charts, budget alerts, PDF/CSV export, automated monthly report emails,
and dark mode.

**Stack:** React (Vite) + Express + MongoDB + Chart.js + JWT

---

## Features

- 🔐 Register / Login (JWT authentication, hashed passwords)
- 💸 Add / edit / delete expenses with category, payment method, notes
- 🏷️ 12 built-in categories
- 📊 Monthly report with category breakdown & 6-month spending trend
- 📈 Interactive charts (line + doughnut) via Chart.js
- 🚨 Budget alerts (overall + per-category, warns at 80% and 100%)
- 📄 Export monthly report as PDF
- 📑 Export expenses as CSV (all-time or per month)
- 📧 Email monthly report on demand + automatic monthly cron job
- 🌙 Dark mode (persisted, system-aware default)
- 🔎 Filtering (category, date range, amount range, payment method) and search
- 📄 Pagination and sorting

---

## Project Structure

```
expense-tracker/
├── backend/            Express API server
│   ├── config/         DB connection
│   ├── controllers/    Route logic
│   ├── middleware/     Auth guard, error handler
│   ├── models/         Mongoose schemas (User, Expense, Budget)
│   ├── routes/         Express routers
│   ├── utils/          PDF/CSV generation, email, cron job, seed script
│   └── server.js       App entry point
└── frontend/           React (Vite) client
    └── src/
        ├── api/         Axios instance with JWT interceptor
        ├── context/      Auth + Theme (dark mode) providers
        ├── components/   Reusable UI (Navbar, forms, charts, etc.)
        └── pages/        Login, Register, Dashboard, Expenses, Reports, Budget, Settings
```

---

## Prerequisites

- **Node.js** 18+ and npm
- **MongoDB** running locally, or a free [MongoDB Atlas](https://www.mongodb.com/atlas) cluster
- (Optional, for email features) A Gmail account with an
  [App Password](https://myaccount.google.com/apppasswords), or any SMTP provider

---

## Setup (in VS Code)

1. Open the `expense-tracker` folder in VS Code.
2. Open **two terminals** (Terminal → New Terminal) — one for backend, one for frontend.

### 1. Backend setup

```bash
cd backend
cp .env.example .env
npm install
```

Edit `.env`:
- Set `MONGO_URI` (local Mongo, e.g. `mongodb://127.0.0.1:27017/expense_tracker`, or your Atlas
  connection string).
- Set `JWT_SECRET` to any long random string.
- (Optional) Set `EMAIL_USER` / `EMAIL_PASS` / `EMAIL_HOST` if you want email report features to
  work. If left as placeholders, everything else in the app still works — only the "Email me
  this report" button and the monthly cron email will fail.

Start the server:

```bash
npm run dev
```

The API runs at `http://localhost:5000`. Check `http://localhost:5000/api/health` to confirm it's
up.

**Optional:** seed some demo data (creates `demo@example.com` / `demo1234` with ~2 months of
sample expenses):

```bash
npm run seed
```

### 2. Frontend setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The app runs at `http://localhost:5173`. Open it in your browser and register a new account (or
log in with the seeded demo account).

---

## Environment Variables Reference

### backend/.env
| Variable | Description |
|---|---|
| `PORT` | Backend port (default `5000`) |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign JWT tokens |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `7d` |
| `CLIENT_URL` | Frontend origin, for CORS |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASS` / `EMAIL_FROM` | SMTP config for report emails |
| `MONTHLY_REPORT_CRON` | Cron expression for the automated monthly email job (default: 8 AM on the 1st of each month) |

### frontend/.env
| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the backend API (default `http://localhost:5000/api`) |

---

## API Overview

All routes below (except register/login) require `Authorization: Bearer <token>`.

**Auth** — `/api/auth`
- `POST /register`, `POST /login`
- `GET /me`, `PUT /me`, `PUT /change-password`

**Expenses** — `/api/expenses`
- `GET /` — list with `page, limit, category, startDate, endDate, search, minAmount, maxAmount, paymentMethod, sortBy, order`
- `POST /`, `GET /:id`, `PUT /:id`, `DELETE /:id`
- `GET /meta/categories`

**Reports** — `/api/reports`
- `GET /summary?year=&month=` — totals, category breakdown, daily totals, budget status
- `GET /trend?months=6` — spending trend for last N months
- `GET /budget-alerts`
- `GET /export/pdf?year=&month=`
- `GET /export/csv?year=&month=` (omit for all-time export)
- `POST /email` — email the report to the logged-in user immediately

**Budget** — `/api/budget`
- `GET /`, `POST /` (upsert category budget), `DELETE /:id`, `PUT /overall`

---

## Notes on the "Advanced Features"

- **Email monthly report**: available both on-demand (Reports page → "Email Me This Report")
  and automatically via a scheduled cron job (`backend/utils/monthlyReportCron.js`) that emails
  every opted-in user their previous month's report.
- **Dark mode**: toggled from the navbar or Settings page, persisted in `localStorage`, and
  defaults to the OS preference on first visit.
- **CSV Export**: available for the full history (Expenses page) or scoped to a specific month
  (Reports page).

---

## Troubleshooting

- **"MongoDB connection error"** — make sure MongoDB is running locally (`mongod`) or that your
  Atlas URI/IP allowlist is correct.
- **Login works but requests fail with 401** — check that `JWT_SECRET` matches between requests
  (i.e. you didn't change it after issuing a token — just log in again).
- **Email button fails** — this is expected if you haven't configured `EMAIL_USER`/`EMAIL_PASS`
  in `backend/.env`. All other features work without it.
- **CORS errors** — ensure `CLIENT_URL` in `backend/.env` matches the URL your frontend is
  actually running on.
