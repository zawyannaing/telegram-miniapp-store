## Telegram Mini App Store (Digital Products + Game Currency)

Production-ready full-stack system:

- **Frontend (Telegram Mini App)**: `/frontend` (HTML/CSS/Vanilla JS)
- **Backend (Express API)**: `/backend` (Node.js)
- **DB (Supabase/Postgres)**: `supabase.sql`
- **Admin Bot (Telegraf)**: `/backend/bot.js`

Design reference: Vercel-inspired UI from `https://getdesign.md/vercel/design-md`.

---

## 1) Supabase setup

Create a Supabase project, then open **SQL Editor** and run:

- `supabase.sql`

Then go to **Project Settings → API** and copy:

- **Project URL** → `SUPABASE_URL`
- **service_role key** → `SUPABASE_SERVICE_ROLE_KEY` (backend only, keep secret)

---

## 2) Create your Telegram Bot + Mini App

In Telegram:

- Create a bot with **@BotFather**, copy the token → `BOT_TOKEN`
- Create a Mini App entry (via BotFather “/newapp” or “Web App” settings)
- Set the Mini App URL to your deployed frontend (Vercel) URL

Add your admin Telegram user IDs to `ADMIN_IDS` (comma-separated).

---

## 3) Backend (Express API) local run

From `/backend`:

```bash
cp .env.example .env
npm install
npm run dev
```

Health check:

- `GET http://localhost:3000/health`

---

## 4) Bot (Telegraf) local run

In another terminal (still in `/backend`):

```bash
npm run bot
```

Open your bot chat in Telegram and send `/start` from an admin account.

---

## 5) Frontend local run

This is static HTML. Use any static server.

Example (Python):

```bash
cd frontend
python3 -m http.server 5173
```

Open:

- `http://localhost:5173/index.html?api=http://localhost:3000`

Note: Telegram user info (`telegram_id`, `username`) only appears when opened inside Telegram Mini App.

---

## 6) Deploy

### Frontend → Vercel

- Create a Vercel project from this repo
- Set **Root Directory** to `frontend`
- Framework preset: “Other”

### Backend → Render / Railway

- Deploy `backend` as a Node service
- Start command: `npm start`
- Add environment variables from `backend/.env.example`

Set `FRONTEND_ORIGIN` to your Vercel domain (example: `https://your-app.vercel.app`).

---

## 7) API

- `GET /api/products` → `{ products: [...] }`
- `GET /api/game-options` → `{ options: [...] }`
- `POST /api/order` → creates order, notifies admins

POST body example:

```json
{
  "telegram_id": "123456789",
  "username": "alice",
  "item_type": "game",
  "product_name": "Mobile Legends 60 Diamonds",
  "game_name": "Mobile Legends",
  "amount": "60 Diamonds",
  "price": 1800,
  "transaction_last6": "123456"
}
```

---

## Notes (production)

- **Never expose** `SUPABASE_SERVICE_ROLE_KEY` to frontend.
- Prefer setting Supabase **Row Level Security** off for these tables (since backend uses service role), or keep RLS on with strict policies for your use case.
- Admin is **Telegram ID only** (no login UI).

