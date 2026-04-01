# LoversAI Backend

> AI-powered wedding moodboard generator — Production-ready Node.js/Express API

---

## 🏗️ Architecture Overview

```
src/
├── config/
│   ├── database.js          # MongoDB connection + reconnect logic
│   └── constants.js         # App-wide enums, stage names, error codes
├── controllers/
│   ├── auth.controller.js   # Register, login
│   ├── user.controller.js   # Profile, credits
│   ├── moodboard.controller.js  # Full moodboard lifecycle
│   └── referral.controller.js   # Referral code system
├── middleware/
│   ├── auth.middleware.js   # JWT verification
│   ├── credits.middleware.js # Credit & plan checks, duplicate guard
│   ├── rateLimit.middleware.js  # Per-route rate limiters
│   └── error.middleware.js  # Central error handler + 404
├── models/
│   ├── User.js              # User schema + methods (bcrypt, credit ops)
│   └── Moodboard.js         # 5-stage moodboard schema + methods
├── routes/
│   ├── index.js             # Master router
│   ├── auth.routes.js
│   ├── user.routes.js
│   ├── moodboard.routes.js
│   └── referral.routes.js
├── services/
│   ├── ai.service.js        # Infip API, polling, retry, backoff
│   └── upload.service.js    # Multer config, file helpers
├── utils/
│   ├── apiResponse.js       # Standardized JSON responses
│   ├── inviteCode.js        # Invite code generator (nanoid)
│   ├── logger.js            # Winston + daily rotate
│   └── validators.js        # Joi schemas + validate() middleware
└── server.js                # App bootstrap, middleware stack
```

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js >= 18
- MongoDB >= 6 (local or Atlas)
- An [Infip API key](https://infip.pro)

### 2. Install dependencies
```bash
cd loversai-backend
npm install
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your values
```

### 4. Start the server
```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

Server starts at: `http://localhost:5000`

---

## 🔑 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_SECRET` | ✅ | Secret for signing JWTs (use a long random string) |
| `JWT_EXPIRES_IN` | | Token TTL (default: `7d`) |
| `INFIP_API_KEY` | ✅ | Your Infip API key |
| `INFIP_BASE_URL` | | Infip base URL (default: `https://api.infip.pro/v1`) |
| `INFIP_MODEL` | | Model to use (default: `flux-pro`) |
| `INFIP_POLL_INTERVAL_MS` | | Polling interval (default: `3000`) |
| `INFIP_MAX_RETRIES` | | Max retry attempts (default: `5`) |
| `INFIP_POLL_TIMEOUT_MS` | | Poll timeout (default: `120000`) |
| `BASE_URL` | | Public URL for serving uploads (default: `http://localhost:5000`) |
| `ALLOWED_ORIGINS` | | Comma-separated CORS origins |
| `PORT` | | Server port (default: `5000`) |

---

## 📡 API Reference

### Auth

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register` | Register new user | ❌ |
| POST | `/api/auth/login` | Login + get JWT | ❌ |

**Register body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "securePass123",
  "inviteCode": "LOVERS-ABCD1234"  // optional
}
```

**Login body:**
```json
{
  "email": "jane@example.com",
  "password": "securePass123"
}
```

---

### User

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/user/profile` | Get user profile | ✅ |
| GET | `/api/user/credits` | Get credit balance | ✅ |

---

### Moodboard

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/moodboard` | List moodboards (paginated) | ✅ |
| POST | `/api/moodboard/start` | Create new moodboard | ✅ |
| POST | `/api/moodboard/:id/generate-stage` | Generate AI images for a stage | ✅ |
| POST | `/api/moodboard/:id/select-image` | Select image to advance stage | ✅ |
| GET | `/api/moodboard/:id` | Get moodboard by ID | ✅ |
| POST | `/api/moodboard/:id/add-logo` | Upload logo for moodboard | ✅ |
| GET | `/api/moodboard/:id/download` | Download complete moodboard | ✅ |

**Start moodboard** (`multipart/form-data`):
```
venue    (file, optional) — venue image
design   (file, optional) — design inspiration image
prompt   (string, required) — vibe description
colorDirection (string, optional) — e.g. "blush pink and gold"
```

**Generate stage:**
```json
{
  "stage": "entry",
  "prompt": "override prompt (optional)"
}
```
Stages in order: `entry → lounge → dining → bar → stage`

**Select image:**
```json
{
  "stage": "entry",
  "imageUrl": "https://..."
}
```

---

### Referral

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/referral/code` | Get your invite code | ✅ |
| POST | `/api/referral/use` | Apply someone else's code | ✅ |

**Use referral:**
```json
{
  "inviteCode": "LOVERS-ABCD1234"
}
```

---

## 💳 Credit System

| Plan | Initial Credits | Behavior |
|---|---|---|
| FREE | 1 | Entry stage is free (1 generation). Other stages cost 1 credit each. |
| PRO | 3/month | Credits reset monthly. Each stage generation = 1 credit. |
| PRO_PLUS | ∞ | Unlimited generations. No credit checks. |

**Referral Bonus:** Both referrer and new user receive **+5 credits** on successful referral.

---

## 🤖 AI Generation Flow

```
POST /generate-stage
        │
        ▼
 Build stage prompt (with venue/color context)
        │
        ▼
 POST https://api.infip.pro/v1/images/generations × 4 (parallel)
        │
   ┌────┴────┐
   │         │
immediate  poll_url
result     returned
   │         │
   │    GET poll_url (every 3s)
   │         │
   │    result.data[0].url  ← success
   │    result.status       ← still processing
   │         │
   └────┬────┘
        │
   Exponential backoff on 429/502/503
   Max 5 retries per image
   120s total timeout
        │
        ▼
  Return array of 4 image URLs
```

---

## 🛡️ Security

- **Helmet** — sets 11 security headers
- **CORS** — whitelist-based origin validation
- **JWT** — stateless auth, 7-day expiry
- **bcryptjs** — password hashing with salt rounds = 12
- **express-rate-limit** — per-route limits:
  - Auth: 20 req / 15 min
  - AI generation: 20 req / hour (per user)
  - Uploads: 30 req / hour
  - General: 100 req / 15 min
- **Joi validation** — all inputs validated and sanitized
- **Duplicate generation guard** — prevents race conditions

---

## 📋 Error Response Format

All errors return a consistent structure:
```json
{
  "success": false,
  "message": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE"
}
```

| Code | Meaning |
|---|---|
| `UNAUTHORIZED` | Missing or invalid JWT |
| `INSUFFICIENT_CREDITS` | No credits remaining |
| `PLAN_UPGRADE_REQUIRED` | Feature needs paid plan |
| `AI_SERVICE_ERROR` | Infip API failure |
| `AI_TIMEOUT` | Generation exceeded 120s |
| `INVALID_STAGE` | Stage out of order |
| `DUPLICATE_REQUEST` | Generation already in progress |
| `INVITE_CODE_INVALID` | Code not found |
| `INVITE_CODE_ALREADY_USED` | Code already applied |
| `VALIDATION_ERROR` | Input failed Joi schema |

---

## 🔌 Connecting a React Frontend

```js
// Base setup
const API_BASE = 'http://localhost:5000/api';
const headers = { Authorization: `Bearer ${token}` };

// 1. Register
const res = await fetch(`${API_BASE}/auth/register`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name, email, password }),
});

// 2. Start moodboard (with file upload)
const form = new FormData();
form.append('prompt', 'Romantic garden wedding with soft florals');
form.append('colorDirection', 'blush pink, ivory, gold');
form.append('venue', venueFile);
form.append('design', designFile);

const mb = await fetch(`${API_BASE}/moodboard/start`, {
  method: 'POST',
  headers,
  body: form,
});

// 3. Generate a stage
const gen = await fetch(`${API_BASE}/moodboard/${id}/generate-stage`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({ stage: 'entry' }),
});
// Returns: { images: ['url1', 'url2', 'url3', 'url4'] }

// 4. Select image
await fetch(`${API_BASE}/moodboard/${id}/select-image`, {
  method: 'POST',
  headers: { ...headers, 'Content-Type': 'application/json' },
  body: JSON.stringify({ stage: 'entry', imageUrl: images[0] }),
});

// 5. Repeat for lounge → dining → bar → stage
```

---

## 📁 Logs

Logs are written to `./logs/`:
- `loversai-YYYY-MM-DD.log` — all logs (rotated daily, kept 14 days)
- `error-YYYY-MM-DD.log` — errors only (kept 30 days)
- `exceptions-YYYY-MM-DD.log` — uncaught exceptions
- `rejections-YYYY-MM-DD.log` — unhandled promise rejections

Console output is colorized in development mode.

---

## 🐳 Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Use a strong random `JWT_SECRET` (32+ chars)
- [ ] Set `MONGODB_URI` to Atlas or managed MongoDB
- [ ] Set `ALLOWED_ORIGINS` to your frontend domain
- [ ] Set `BASE_URL` to your API domain (for file URLs)
- [ ] Use a process manager (`pm2 start src/server.js`)
- [ ] Set up reverse proxy (nginx) in front of Express
- [ ] Configure log rotation / aggregation (already handled by Winston)
- [ ] Consider S3/Cloudinary instead of local `uploads/` for scale
