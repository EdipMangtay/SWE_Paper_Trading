# Paper Trading — Virtual Exchange Simulator

> **Software Architecture · Phase 2 Final Submission**  
> Istinye University · Software Engineering · Assoc. Prof. Dr. Bahman Arasteh

A risk-free crypto trading simulator backed by live market data. Users start with **$100,000** in paper cash, place **market** and **limit** orders, track portfolios with live prices, and compete on the leaderboard.

```
Architecture:     Layered Architecture + REST API
View model:       Kruchten 4+1 View Model
Stack:            Node.js + Express + MongoDB · React + Vite + Tailwind
External API:     CoinGecko (free tier)
```

---

## Contents

1. [Quick start](#quick-start)
2. [Demo accounts](#demo-accounts)
3. [Project layout](#project-layout)
4. [Architecture overview](#architecture-overview)
5. [REST API](#rest-api)
6. [Documents & diagrams](#documents--diagrams)
7. [Deployment](#deployment)
8. [Development notes](#development-notes)

---

## Quick start

### Requirements

- **Node.js 18+** ([nodejs.org](https://nodejs.org))
- **MongoDB** (optional in development — see below) — pick one:
  - **MongoDB Atlas** (recommended — free cluster) → [cloud.mongodb.com](https://cloud.mongodb.com)
  - **Docker** → `docker run -d -p 27017:27017 --name mongo mongo:6`
  - **Local install** → [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env: set MONGODB_URI for a persistent database, or leave it empty for
# in-memory MongoDB in development (data is lost when the process exits).

# If you use a persistent MONGODB_URI, seed demo users once:
# npm run seed

npm run dev
# API listens on PORT from .env (default 5002 — avoids macOS reserving 5000)
```

If **`MONGODB_URI` is left empty** in development, the app starts an **in-memory MongoDB** and creates demo users automatically on first boot when the database is empty (see `server.js`). With a real `MONGODB_URI`, run **`npm run seed`** once after `npm install`.

### 2. Frontend

Open a **second** terminal:

```bash
cd frontend
npm install
npm run dev
```

The app opens at **http://localhost:5173** (Vite proxies `/api` to the backend port in `vite.config.js`).

### 3. Quick checks

```bash
# Against the backend directly (default port 5002)
curl http://localhost:5002/api/health
# { "status": "ok", "uptime": 12.3, "env": "development" }

curl http://localhost:5002/api/market/prices?limit=5
# Live prices from CoinGecko when available (otherwise fallback list)

# Or via the dev server proxy
curl http://localhost:5173/api/health
```

---

## Demo accounts

After `npm run seed` (or auto-seed with in-memory MongoDB), these accounts exist — each with **$100,000** cash:

| Email | Password | Role |
|---|---|---|
| `admin@papertrading.com` | `admin123` | **admin** |
| `alice@example.com` | `alice123` | trader |
| `bob@example.com` | `bob123` | trader |
| `charlie@example.com` | `charlie123` | trader |

Sign in with the **admin** account and open **`/admin`** for the admin panel.

---

## Project layout

```
paper-trading/
├── backend/                            ← Express REST API
│   ├── src/
│   │   ├── server.js                   # Entry: DB connect, HTTP listen, limit worker
│   │   ├── app.js                      # Express app + middleware + routes
│   │   ├── config/{db,env}.js          # MongoDB & env
│   │   ├── models/                     # Mongoose schemas
│   │   │   ├── User.js                 # bcrypt + cashBalance + role
│   │   │   ├── Portfolio.js            # 1:1 with User, embedded Asset[]
│   │   │   ├── Order.js                # State machine: PENDING→FILLED/...
│   │   │   └── Transaction.js          # Immutable trade log
│   │   ├── repositories/               # ★ Data Access Layer
│   │   ├── services/                   # ★ Business Logic Layer
│   │   │   ├── authService.js
│   │   │   ├── marketDataService.js    # CoinGecko + node-cache + fallback
│   │   │   ├── orderService.js         # State machine + execution engine
│   │   │   ├── portfolioService.js     # Mark-to-market valuation
│   │   │   └── leaderboardService.js
│   │   ├── controllers/                # ★ Application Layer
│   │   ├── middleware/                 # auth (JWT), validate, errorHandler
│   │   ├── routes/                     # Route definitions
│   │   └── utils/logger.js
│   ├── scripts/seed.js                 # Demo users + admin
│   ├── package.json
│   └── .env.example
│
├── frontend/                           ← React SPA
│   ├── src/
│   │   ├── main.jsx, App.jsx           # Vite entry + Router
│   │   ├── pages/                      # Pages (Landing, Dashboard, Trade, …)
│   │   ├── components/                 # Navbar, ProtectedRoute, PriceChart, …
│   │   ├── context/AuthContext.jsx     # JWT in localStorage
│   │   └── services/api.js             # Axios + interceptor (401 → auto-logout)
│   ├── public/favicon.svg
│   ├── index.html
│   ├── vite.config.js                  # Dev proxy /api → backend (default :5002)
│   ├── tailwind.config.js
│   └── package.json
│
├── docs/
│   ├── SAD_v2.docx                     # Software Architecture Document
│   └── diagrams/
│       ├── preview.html                # Renders all 10 diagrams
│       ├── 01_use_case.mmd
│       ├── 02_class_diagram.mmd
│       ├── 03_sequence_market_order.mmd
│       ├── 04_sequence_limit_order.mmd
│       ├── 05_sequence_portfolio.mmd
│       ├── 06_activity_diagram.mmd
│       ├── 07_state_machine.mmd
│       ├── 08_component_diagram.mmd
│       ├── 09_deployment_diagram.mmd
│       └── 10_package_diagram.mmd
│
└── README.md
```

---

## Architecture overview

### 4+1 View Model

```
                    ┌──────────────────────┐
                    │   USE CASE VIEW      │   ← Diagram 1
                    │   (Scenarios)        │
                    └──────────┬───────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼────────┐   ┌─────────▼────────┐   ┌────────▼────────┐
│  LOGICAL VIEW  │   │  PROCESS VIEW     │   │  DEVELOPMENT    │
│  (Classes)     │   │  (Processes)      │   │  VIEW (Code)    │
│  Diagram 2     │   │  Diagrams 3–7     │   │  Diagrams 8, 10 │
└────────────────┘   └──────────────────┘   └─────────────────┘
                               │
                    ┌──────────▼───────────┐
                    │  PHYSICAL VIEW (+1)   │   ← Diagram 9
                    │  (Deployment)         │
                    └──────────────────────┘
```

### Layered architecture

```
┌─────────────────────────────────────────────┐
│  PRESENTATION   →  React + Vite (frontend/)  │
└──────────────────────┬──────────────────────┘
                       ↓ HTTP/JSON + JWT
┌─────────────────────────────────────────────┐
│  APPLICATION    →  Express controllers        │
│                    + routes + middleware    │
└──────────────────────┬──────────────────────┘
                       ↓
┌─────────────────────────────────────────────┐
│  BUSINESS       →  services/                │
│                    (state machine, P&L)       │
└──────────────────────┬──────────────────────┘
                       ↓
┌─────────────────────────────────────────────┐
│  DATA ACCESS    →  repositories/ + Mongoose  │
└──────────────────────┬──────────────────────┘
                       ↓
                  [MongoDB]    [CoinGecko API]
```

**Layer rule:** Each layer depends only on the layer below. Upward dependencies are not allowed.

### Order state machine

```
              ┌────────────┐
   create →   │  PENDING   │
              └─────┬──────┘
                    │
        ┌───────────┼───────────────┐
        ↓           ↓               ↓
   ┌────────┐  ┌──────────┐   ┌──────────┐
   │ FILLED │  │CANCELLED │   │ EXPIRED  │
   └────────┘  └──────────┘   └──────────┘
   (terminal)  (terminal)     (terminal)
```

- **MARKET** orders skip PENDING and go straight to **FILLED**.
- **LIMIT** orders: a background worker (30s interval) evaluates `shouldFill()`.

---

## REST API

All routes are under `/api`. Mutations require **JWT** (`Authorization: Bearer <token>`).

### Auth

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | public | Create account; returns JWT |
| POST | `/api/auth/login` | public | Email + password; returns JWT |
| GET | `/api/auth/me` | JWT | Current user |

### Market (CoinGecko)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/market/prices?limit=50` | public | Top N coins |
| GET | `/api/market/search?q=btc` | public | Search |
| GET | `/api/market/:coinId` | public | Coin detail |
| GET | `/api/market/:coinId/history?days=7` | public | Chart data |

### Orders

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/orders` | JWT | Create order |
| GET | `/api/orders?status=PENDING` | JWT | List orders |
| DELETE | `/api/orders/:id` | JWT | Cancel |

### Portfolio

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/portfolio` | JWT | KPI + holdings (mark-to-market) |
| GET | `/api/portfolio/history` | JWT | All transactions |
| GET | `/api/portfolio/stats` | JWT | Aggregate stats |

### Leaderboard

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/leaderboard?sort=value\|pnlPct` | public | Top traders |

### Admin

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/users` | JWT + admin | All users |
| PATCH | `/api/admin/users/:id` | JWT + admin | Toggle `{ isActive }` |
| GET | `/api/admin/stats` | JWT + admin | System stats |

### Example requests

```bash
# Register
curl -X POST http://localhost:5002/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"new@test.com","username":"newuser","password":"password123"}'

# Market BUY
curl -X POST http://localhost:5002/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"coinId":"bitcoin","type":"MARKET","side":"BUY","quantity":0.01}'

# Limit BUY @ $60000
curl -X POST http://localhost:5002/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"coinId":"bitcoin","type":"LIMIT","side":"BUY","quantity":0.05,"price":60000}'
```

---

## Documents & diagrams

- **`docs/SAD_v2.docx`** — Full Software Architecture Document (~30 pages, 4+1 View Model).
- **`docs/diagrams/preview.html`** — Live render of all 10 UML diagrams; open in a browser.
- **`docs/diagrams/*.mmd`** — Mermaid sources (editable at [mermaid.live](https://mermaid.live)).

### Diagram index

| # | Diagram | View |
|---|---|---|
| 01 | Use Case | Use Case View |
| 02 | Class Diagram | Logical View |
| 03 | Sequence — Market Order | Process View |
| 04 | Sequence — Limit Order | Process View |
| 05 | Sequence — Portfolio | Process View |
| 06 | Activity Diagram | Process View |
| 07 | State Machine — Order Lifecycle | Process View |
| 08 | Component Diagram | Development View |
| 09 | Deployment Diagram | Physical View (+1) |
| 10 | Package Diagram | Development View |

---

## Deployment

### Suggested production stack

| Layer | Service | Cost |
|---|---|---|
| Frontend | **Vercel** or Netlify | Free tier is enough |
| Backend | **Railway**, Render, Fly.io | Free tiers available |
| Database | **MongoDB Atlas M0** | 512 MB free |
| DNS | Cloudflare | Free |

### Vercel (frontend)

```bash
cd frontend
npm i -g vercel
vercel
# Add /api proxy in vercel.json or pass the public backend URL as a build-time env
```

### Railway (backend)

```bash
# 1. Create a project on Railway, connect GitHub
# 2. Environment variables:
#    MONGODB_URI = mongodb+srv://...
#    JWT_SECRET = <strong random>
#    CLIENT_URL = https://<your-frontend>.vercel.app
#    NODE_ENV = production
# 3. Build: npm install
# 4. Start: node src/server.js
```

### MongoDB Atlas

1. Create an **M0** free cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Create a database user; allow IP **`0.0.0.0/0`** if the host uses dynamic IPs (e.g. Railway).
3. Set the connection string as `MONGODB_URI` on the backend host.

---

## Development notes

### Environment variables

Typical backend `.env` fields:

```env
PORT=5002
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/paper-trading
JWT_SECRET=change_this_to_a_long_random_string_at_least_32_chars
JWT_EXPIRES_IN=7d
INITIAL_BALANCE=100000
COINGECKO_BASE_URL=https://api.coingecko.com/api/v3
PRICE_CACHE_TTL=60
CLIENT_URL=http://localhost:5173
```

Leave **`MONGODB_URI` empty** in local dev to use the automatic **in-memory** database (data resets when the process exits).

### CoinGecko rate limits

Free tier is roughly **10–30 req/min**. Mitigations:

- **node-cache** with a ~60s TTL
- **`getPriceMap()`** for batched calls
- **Fallback coin list** when the API is down

### Limit order worker

`src/server.js` runs a **`setInterval(..., 30_000)`** worker:

```js
setInterval(async () => {
  const r = await orderService.processPendingLimitOrders();
  // r = { checked, filled, expired }
}, 30_000);
```

In **multi-instance** production, only one instance should run this worker (distributed lock or dedicated worker).

### Testing

```bash
# Backend syntax check
cd backend
node -c src/server.js
node -c src/app.js
find src scripts -name "*.js" -exec node -c {} \;

# Frontend build
cd frontend
npm run build
```

---

## Team split (2 people)

| Member | Responsibility |
|---|---|
| **Member 1** | Backend (models, repository, service, middleware, worker) + SAD |
| **Member 2** | Frontend (React, Tailwind, pages, components, AuthContext) |
| **Both** | UML diagrams, REST contract, code review, deployment |

---

## License / notice

Built for academic use as part of **Software Architecture** (Assoc. Prof. Dr. Bahman Arasteh), Software Engineering, **Istinye University**.
