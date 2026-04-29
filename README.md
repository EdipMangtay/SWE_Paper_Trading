# Paper Trading — Sanal Borsa Simülasyonu

> **Software Architecture · Phase 2 Final Submission**
> İstinye Üniversitesi · Yazılım Mühendisliği · Doç. Dr. Bahman Arasteh

Risksiz, gerçek piyasa verisiyle çalışan kripto trading simülatörü. Kullanıcılar $100.000 sanal bakiye ile başlar, **Market** ve **Limit** emirler verir, portföylerini canlı verilerle takip eder ve liderlik tablosunda yer alır.

```
Mimari Stil:        Layered Architecture + REST API
Görünüm Modeli:     Kruchten 4+1 View Model
Stack:              Node.js + Express + MongoDB · React + Vite + Tailwind
External:           CoinGecko API (free tier)
```

---

## İçindekiler

1. [Hızlı Başlangıç](#hızlı-başlangıç)
2. [Demo Hesaplar](#demo-hesaplar)
3. [Klasör Yapısı](#klasör-yapısı)
4. [Mimari Özet](#mimari-özet)
5. [REST API](#rest-api)
6. [Dökümanlar & Diyagramlar](#dökümanlar--diyagramlar)
7. [Deployment](#deployment)
8. [Geliştirme Notları](#geliştirme-notları)

---

## Hızlı Başlangıç

### Gereksinimler

- **Node.js 18+** ([nodejs.org](https://nodejs.org))
- **MongoDB**: aşağıdaki seçeneklerden biri
  - **MongoDB Atlas** (önerilen — ücretsiz cluster) → [cloud.mongodb.com](https://cloud.mongodb.com)
  - **Docker** → `docker run -d -p 27017:27017 --name mongo mongo:6`
  - **Local install** → [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)

### 1. Backend Kurulumu

```bash
cd backend
npm install
cp .env.example .env
# .env dosyasını düzenle: MONGODB_URI ve JWT_SECRET değerlerini ayarla

# Veritabanına demo kullanıcılar ekle (bir kerelik)
npm run seed

# Backend'i başlat (http://localhost:5000)
npm run dev
```

### 2. Frontend Kurulumu

Yeni bir terminal aç:

```bash
cd frontend
npm install
npm run dev
```

Tarayıcıda **http://localhost:5173** açılacaktır.

### 3. Hızlı doğrulama

```bash
curl http://localhost:5000/api/health
# { "status": "ok", "uptime": 12.3, "env": "development" }

curl http://localhost:5000/api/market/prices?limit=5
# CoinGecko'dan gerçek fiyatlar dönmeli (yoksa fallback liste)
```

---

## Demo Hesaplar

`npm run seed` sonrası şu hesaplar oluşur (her biri $100.000 nakit ile):

| Email | Şifre | Rol |
|---|---|---|
| `admin@papertrading.com` | `admin123` | **admin** |
| `alice@example.com` | `alice123` | trader |
| `bob@example.com` | `bob123` | trader |
| `charlie@example.com` | `charlie123` | trader |

Admin paneline `admin` hesabıyla giriş yapıp `/admin` rotasını ziyaret edebilirsin.

---

## Klasör Yapısı

```
paper-trading/
├── backend/                            ← Express REST API
│   ├── src/
│   │   ├── server.js                   # Entry: DB connect, HTTP listen, limit worker
│   │   ├── app.js                      # Express app + middleware + routes
│   │   ├── config/{db,env}.js          # MongoDB & env
│   │   ├── models/                     # Mongoose şemaları
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
│   │   ├── pages/                      # 12 sayfa (Landing, Dashboard, Trade, ...)
│   │   ├── components/                 # Navbar, ProtectedRoute, PriceChart, ...
│   │   ├── context/AuthContext.jsx     # JWT in localStorage
│   │   └── services/api.js             # Axios + interceptor (401 → auto-logout)
│   ├── public/favicon.svg
│   ├── index.html
│   ├── vite.config.js                  # Dev proxy /api → :5000
│   ├── tailwind.config.js
│   └── package.json
│
├── docs/
│   ├── SAD_v2.docx                     ← ★ Software Architecture Document
│   └── diagrams/
│       ├── preview.html                ← Tüm 10 diyagramı gösterir
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
└── README.md                           ← Bu dosya
```

---

## Mimari Özet

### 4+1 View Model

```
                    ┌──────────────────────┐
                    │   USE CASE VIEW      │   ← Diagram 1
                    │   (Senaryolar)       │
                    └──────────┬───────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼────────┐   ┌─────────▼────────┐   ┌────────▼────────┐
│  LOGICAL VIEW  │   │  PROCESS VIEW    │   │  DEVELOPMENT    │
│  (Sınıflar)    │   │  (Süreçler)      │   │  VIEW (Kod)     │
│  Diagram 2     │   │  Diagrams 3-7    │   │  Diagrams 8,10  │
└────────────────┘   └──────────────────┘   └─────────────────┘
                               │
                    ┌──────────▼───────────┐
                    │  PHYSICAL VIEW (+1)  │   ← Diagram 9
                    │  (Deployment)        │
                    └──────────────────────┘
```

### Layered Architecture

```
┌─────────────────────────────────────────────┐
│  PRESENTATION   →  React + Vite (frontend/) │
└──────────────────────┬──────────────────────┘
                       ↓ HTTP/JSON + JWT
┌─────────────────────────────────────────────┐
│  APPLICATION    →  Express controllers      │
│                    + routes + middleware    │
└──────────────────────┬──────────────────────┘
                       ↓
┌─────────────────────────────────────────────┐
│  BUSINESS       →  services/                │
│                    (state machine, P&L)     │
└──────────────────────┬──────────────────────┘
                       ↓
┌─────────────────────────────────────────────┐
│  DATA ACCESS    →  repositories/ + Mongoose │
└──────────────────────┬──────────────────────┘
                       ↓
                  [MongoDB]    [CoinGecko API]
```

**Katman kuralı**: Her katman yalnızca bir altındaki katmana bağımlıdır. Yukarı bağımlılık yasak.

### Order State Machine

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

- **MARKET** orders: PENDING'i atlayıp doğrudan FILLED'a geçer.
- **LIMIT** orders: Background worker (30s interval) `shouldFill()` kontrolü yapar.

---

## REST API

Tüm endpoint'ler `/api` altında. Yazma operasyonları **JWT zorunludur** (`Authorization: Bearer <token>`).

### Auth
| Method | Endpoint | Auth | Açıklama |
|---|---|---|---|
| POST | `/api/auth/register` | public | Yeni hesap, JWT döner |
| POST | `/api/auth/login` | public | Email + şifre, JWT döner |
| GET | `/api/auth/me` | JWT | Mevcut user |

### Market (CoinGecko)
| Method | Endpoint | Auth | Açıklama |
|---|---|---|---|
| GET | `/api/market/prices?limit=50` | public | Top N coin |
| GET | `/api/market/search?q=btc` | public | Arama |
| GET | `/api/market/:coinId` | public | Coin detay |
| GET | `/api/market/:coinId/history?days=7` | public | Chart datası |

### Orders
| Method | Endpoint | Auth | Açıklama |
|---|---|---|---|
| POST | `/api/orders` | JWT | Yeni order |
| GET | `/api/orders?status=PENDING` | JWT | Liste |
| DELETE | `/api/orders/:id` | JWT | İptal |

### Portfolio
| Method | Endpoint | Auth | Açıklama |
|---|---|---|---|
| GET | `/api/portfolio` | JWT | KPI + holdings (mark-to-market) |
| GET | `/api/portfolio/history` | JWT | Tüm transactions |
| GET | `/api/portfolio/stats` | JWT | Aggregate stats |

### Leaderboard
| Method | Endpoint | Auth | Açıklama |
|---|---|---|---|
| GET | `/api/leaderboard?sort=value\|pnlPct` | public | Top traders |

### Admin
| Method | Endpoint | Auth | Açıklama |
|---|---|---|---|
| GET | `/api/admin/users` | JWT+admin | Tüm kullanıcılar |
| PATCH | `/api/admin/users/:id` | JWT+admin | `{isActive}` toggle |
| GET | `/api/admin/stats` | JWT+admin | Sistem istatistikleri |

### Örnek istekler

```bash
# Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"yeni@test.com","username":"yeni","password":"password123"}'

# Market BUY
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"coinId":"bitcoin","type":"MARKET","side":"BUY","quantity":0.01}'

# Limit BUY @ $60000
curl -X POST http://localhost:5000/api/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"coinId":"bitcoin","type":"LIMIT","side":"BUY","quantity":0.05,"price":60000}'
```

---

## Dökümanlar & Diyagramlar

- **`docs/SAD_v2.docx`** — Tam Software Architecture Document (12 bölüm, ~30 sayfa, 4+1 View Model)
- **`docs/diagrams/preview.html`** — Tüm 10 UML diyagramını canlı render eder. Tarayıcıda aç!
- **`docs/diagrams/*.mmd`** — Mermaid kaynak dosyaları (https://mermaid.live ile düzenlenebilir)

### Diyagram Listesi

| # | Diyagram | View |
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

### Önerilen Production Stack

| Katman | Servis | Maliyet |
|---|---|---|
| Frontend | **Vercel** veya Netlify | Free tier yeterli |
| Backend | **Railway**, Render, Fly.io | Free tier mevcut |
| Database | **MongoDB Atlas M0** | 512 MB free |
| Domain | Cloudflare DNS | Free |

### Vercel (Frontend)

```bash
cd frontend
npm i -g vercel
vercel
# vercel.json içine /api proxy ekle veya backend public URL'ini build-time env olarak geç
```

### Railway (Backend)

```bash
# 1. Railway'de yeni proje oluştur, GitHub repo bağla
# 2. Environment variables:
#    MONGODB_URI = mongodb+srv://...
#    JWT_SECRET = <strong random>
#    CLIENT_URL = https://<senin-frontend>.vercel.app
#    NODE_ENV = production
# 3. Build cmd: npm install
# 4. Start cmd: node src/server.js
```

### MongoDB Atlas

1. https://cloud.mongodb.com → M0 free cluster oluştur
2. Database User ekle, IP whitelist `0.0.0.0/0` (Railway dynamic IP için)
3. Connection string'i `MONGODB_URI` olarak Railway'e yaz

---

## Geliştirme Notları

### Environment Variables

Backend `.env` dosyası gerekli alanlar:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/paper-trading
JWT_SECRET=change_this_to_a_long_random_string_at_least_32_chars
JWT_EXPIRES_IN=7d
INITIAL_BALANCE=100000
COINGECKO_BASE_URL=https://api.coingecko.com/api/v3
PRICE_CACHE_TTL=60
CLIENT_URL=http://localhost:5173
```

### CoinGecko Rate Limit

Free tier ~10-30 req/min. Sistemin yaklaşımı:

- **node-cache** ile 60s TTL
- `getPriceMap()` ile batch çağrılar
- API down olursa **fallback list** (10 popüler coin) ile sistem ayakta kalır

### Limit Order Worker

`src/server.js` içinde `setInterval(..., 30_000)` ile arka planda çalışır:

```js
setInterval(async () => {
  const r = await orderService.processPendingLimitOrders();
  // r = { checked, filled, expired }
}, 30_000);
```

Production multi-instance dağıtımda bu worker yalnızca tek instance'da çalışmalıdır (lock veya cron-only-one).

### Testing

```bash
# Backend syntax check
cd backend
node -c src/server.js
node -c src/app.js
# Tüm dosyalar:
find src scripts -name "*.js" -exec node -c {} \;

# Frontend build check
cd frontend
npm run build
```

---

## İş Bölümü (2 kişi)

| Üye | Sorumluluk |
|---|---|
| **Üye 1** | Backend (modeller, repository, service, middleware, worker) + SAD dokümanı |
| **Üye 2** | Frontend (React, Tailwind, 12 sayfa, components, AuthContext) |
| **Ortak** | UML diyagramları, REST API kontratı, code review, deployment |

---

## Lisans

Akademik amaçlı geliştirilmiştir. İstinye Üniversitesi Yazılım Mühendisliği — Software Architecture (Doç. Dr. Bahman Arasteh) dersi kapsamında.
