<div align="center">

# 🧠 RecallAI

### AI-Powered Personal Knowledge Storage & Retrieval System

[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?style=flat-square&logo=mongodb&logoColor=white)](https://mongodb.com/atlas)
[![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com)
[![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com)
[![Gemini](https://img.shields.io/badge/Google-Gemini-4285F4?style=flat-square&logo=google&logoColor=white)](https://deepmind.google/technologies/gemini)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com)

*Save anything. Find everything. Powered by AI.*

</div>

---

## ✨ Features

- 🔥 **Firebase Auth** — Google Sign-In + Email/Password (with built-in email verification)
- 🔑 **JWT** — Access tokens (7-day) + Refresh tokens (30-day) with rotation
- 🤖 **AI Processing** — Auto-title, summary, key points & tags via Gemini 1.5 Flash
- 🧬 **Semantic Search** — Vector embeddings (cosine similarity) + AI re-ranking
- 📄 **File Upload** — PDF, TXT, DOCX text extraction and processing pipeline
- 🔒 **AES-256 Encryption** — User API keys encrypted at rest, never in responses
- 🛡️ **Security** — Helmet, CORS, rate limiting (100 req/15 min/IP), input validation
- 📊 **Logging** — Morgan HTTP logs + Winston rotating file/console transports
- 🐳 **Docker** — Multi-stage build, non-root user, health check included

---

## 🗂️ Project Structure

```
recall-ai-vault-96/
├── src/                          # React + Vite frontend
└── server/                       # Node.js + Express backend
    ├── src/
    │   ├── config/
    │   │   ├── database.js        MongoDB Atlas connection
    │   │   ├── firebase.js        Firebase Admin SDK (singleton)
    │   │   └── logger.js          Winston logger
    │   ├── controllers/
    │   │   ├── auth.controller.js  Firebase token verify → JWT issue
    │   │   ├── user.controller.js  API key + profile management
    │   │   ├── record.controller.js CRUD + file upload + AI pipeline
    │   │   └── search.controller.js Vector + keyword search + re-rank
    │   ├── middleware/
    │   │   ├── auth.js            JWT verification
    │   │   ├── errorHandler.js    Global 404 + error handler
    │   │   ├── upload.js          Multer v2 (PDF/TXT/DOCX, 10MB)
    │   │   ├── validate.js        express-validator result checker
    │   │   └── validators.js      All input schemas
    │   ├── models/
    │   │   ├── User.js            firebaseUid as auth anchor
    │   │   └── Record.js          Vector embedding + text indexes
    │   ├── routes/
    │   │   ├── auth.routes.js
    │   │   ├── user.routes.js
    │   │   ├── record.routes.js
    │   │   └── search.routes.js
    │   ├── services/
    │   │   └── gemini.service.js  Title / summary / embed / rerank
    │   ├── utils/
    │   │   ├── appError.js        Typed error class
    │   │   ├── encryption.js      AES-256 encrypt/decrypt
    │   │   └── fileParser.js      pdf-parse + mammoth
    │   ├── app.js
    │   └── server.js
    ├── logs/                      Auto-created at runtime
    ├── .env.example
    ├── Dockerfile
    └── package.json
```

---

## 🚀 Quick Start

### Prerequisites

| Tool | Min Version |
|------|------------|
| Node.js | 18.0.0 |
| npm | 9.0.0 |
| MongoDB Atlas | Free tier |
| Firebase project | Free Spark plan |

### 1. Clone & Install

```bash
git clone https://github.com/lunacoderj/recall-ai-vault-96.git
cd recall-ai-vault-96

# Frontend dependencies
npm install

# Backend dependencies
cd server && npm install
```

### 2. Configure Environment

```bash
cp .env.example .env   # inside the server/ directory
```

Fill in your `.env` — see the [Environment Variables](#environment-variables) section below.

### 3. Run Dev Servers

```bash
# Terminal 1 — API (inside server/)
npm run dev

# Terminal 2 — Frontend (root dir)
npm run dev
```

| Service | URL |
|---------|-----|
| API | http://localhost:5000 |
| Health check | http://localhost:5000/api/health |
| Frontend | http://localhost:5173 |

---

## 🔥 Firebase Setup

RecallAI uses **Firebase Authentication** for identity — the backend only verifies tokens and issues its own JWTs.

### Step 1 — Create a Firebase Project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. **Add project** → give it a name → disable Google Analytics (optional)
3. In the left menu go to **Authentication → Sign-in method**
4. Enable **Email/Password** and **Google**

### Step 2 — Get the Admin SDK Credentials

1. Firebase Console → ⚙️ **Project Settings** → **Service accounts** tab
2. Click **Generate new private key** → download the JSON
3. From the JSON, copy these 3 values into your `.env`:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\nMIIE...\n-----END RSA PRIVATE KEY-----\n"
```

> ⚠️ **Never commit your service account JSON or `.env` file.** Both are in `.gitignore`.

### Step 3 — Configure the Frontend

In your React app, install the Firebase client SDK:
```bash
npm install firebase
```

Initialize Firebase and use the same **Project ID** from the console. When a user logs in via Firebase, get their ID token and send it to the backend:

```js
// After successful Firebase login
const idToken = await firebase.auth().currentUser.getIdToken();

// Exchange for your app's JWT
const { data } = await axios.post('/api/auth/firebase', { idToken });
// data.accessToken — use this for all subsequent API calls
```

---

## 📡 API Reference

### Base URL
```
http://localhost:5000/api
```

### Authentication Header (all protected routes)
```
Authorization: Bearer <accessToken>
```

---

### 🔑 Auth Endpoints

#### `POST /auth/firebase`
The single entry point for **all** Firebase login methods (Google, email/password, etc.).

**Frontend flow:**
1. User signs in via Firebase (any provider)
2. Call `await firebase.auth().currentUser.getIdToken()`
3. POST the token here → receive your app's JWT

```json
// Request
{ "idToken": "<Firebase ID token>" }

// Response 200 — returning user
{
  "success": true,
  "message": "Login successful.",
  "data": {
    "user": {
      "_id": "...",
      "email": "jane@example.com",
      "name": "Jane Doe",
      "avatar": "https://...",
      "authProvider": "google.com",
      "emailVerified": true,
      "aiProvider": "gemini",
      "createdAt": "2026-04-11T..."
    },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "isNewUser": false
  }
}

// Response 200 — first-time signup (same endpoint)
{ ..., "isNewUser": true }
```

#### `POST /auth/refresh-token`
Rotate tokens when the access token expires.
```json
// Request
{ "refreshToken": "eyJ..." }

// Response 200
{ "success": true, "data": { "accessToken": "...", "refreshToken": "..." } }
```

#### `POST /auth/logout` *(Protected)*
Invalidates the stored refresh token server-side.

---

### 👤 User Endpoints *(Protected)*

#### `POST /user/api-key`
Save your Gemini/OpenAI API key — encrypted with AES-256 before storage.
```json
{ "apiKey": "AIza...", "aiProvider": "gemini" }
```

#### `GET /user/profile`
```json
{
  "success": true,
  "data": { "_id": "...", "email": "...", "name": "...", "hasApiKey": true, ... }
}
```

#### `PUT /user/profile`
```json
{ "name": "Jane Smith", "avatar": "https://cdn.example.com/photo.jpg" }
```

---

### 📚 Records Endpoints *(Protected)*

#### `POST /records/add`
Add content and run it through the full AI pipeline (title + summary + key points + tags + embedding).

```json
// Request
{
  "contentType": "note",
  "rawContent": "Transformers use self-attention to process sequences..."
}
// contentType: link | pdf | note | video | document

// Response 201
{
  "success": true,
  "data": {
    "record": {
      "_id": "...",
      "aiGeneratedTitle": "Transformer Self-Attention Explained",
      "aiSummary": "Transformers revolutionized NLP by replacing recurrence...",
      "keyPoints": ["Attention replaces RNNs", "Parallel processing", "..."],
      "tags": ["machine-learning", "nlp", "transformers"],
      "contentType": "note",
      "createdAt": "2026-04-11T..."
    }
  }
}
```

#### `POST /records/upload`
Upload a PDF, TXT, or DOCX file for AI processing.
```
Content-Type: multipart/form-data
Fields: file (required), contentType (optional)
Max size: 10 MB
```

#### `GET /records?page=1&limit=20`
Paginated list, newest first.

```json
{
  "success": true,
  "data": {
    "records": [...],
    "pagination": { "page": 1, "limit": 20, "total": 47, "pages": 3, "hasNext": true }
  }
}
```

#### `GET /records/:id` · `DELETE /records/:id`

---

### 🔍 Search Endpoint *(Protected)*

#### `POST /search`
Full semantic search pipeline:
1. Convert query to embedding (Gemini `text-embedding-004`)
2. Cosine similarity across all user records
3. AI re-ranking of top results for relevance scoring
4. Falls back to MongoDB full-text search if embeddings unavailable

```json
// Request
{ "query": "attention mechanism in transformers" }

// Response 200
{
  "success": true,
  "data": {
    "searchMethod": "vector",
    "totalResults": 4,
    "results": [
      {
        "_id": "...",
        "aiGeneratedTitle": "Transformer Self-Attention Explained",
        "relevanceScore": 94,
        "relevanceSummary": "Directly addresses attention mechanisms in depth.",
        "similarity": 0.91,
        "tags": ["nlp", "transformers"],
        ...
      }
    ]
  }
}
```

---

### ❤️ Health Check

#### `GET /health`
```json
{
  "success": true,
  "message": "RecallAI API is running",
  "timestamp": "2026-04-11T16:00:00.000Z",
  "uptime": 3600,
  "environment": "production"
}
```

---

## 🗄️ Database Schema

### Users Collection
| Field | Type | Notes |
|-------|------|-------|
| `firebaseUid` | String | Firebase UID — unique, indexed |
| `email` | String | Unique, lowercase |
| `name` | String | Display name |
| `avatar` | String | Profile photo URL |
| `encryptedApiKey` | String | AES-256 encrypted, `select:false` |
| `aiProvider` | String | `gemini` \| `openai` |
| `authProvider` | String | `password` \| `google.com` |
| `emailVerified` | Boolean | Synced from Firebase token |
| `refreshToken` | String | `select:false` |
| `createdAt` / `updatedAt` | Date | Auto-managed |

### Records Collection
| Field | Type | Notes |
|-------|------|-------|
| `userId` | ObjectId | Ref → User |
| `originalContent` | String | Input text / URL / filename |
| `contentType` | String | `link \| pdf \| note \| video \| document` |
| `aiGeneratedTitle` | String | Gemini-generated |
| `aiSummary` | String | Gemini-generated |
| `keyPoints` | String[] | Extracted insights |
| `tags` | String[] | Auto-assigned categories |
| `rawText` | String | Stored text (max 50k chars) |
| `embedding` | Number[] | Vector array, `select:false` |
| `createdAt` | Date | Auto-managed |

---

## 🔒 Security

| Layer | Implementation |
|-------|---------------|
| HTTP Headers | Helmet.js |
| Rate Limiting | 100 req / 15 min / IP |
| CORS | Frontend URL only |
| Identity | Firebase + Admin SDK token verification |
| API Keys | AES-256 encrypted, `select:false` |
| JWT | 7-day access + 30-day refresh, rotation on use |
| Input | express-validator on every endpoint |
| File Upload | MIME + extension whitelist, 10MB limit |
| DB | Mongoose ODM prevents injection by default |

---

## 🐳 Docker

### Single Container
```bash
cd server
docker build -t recallai-api .
docker run -d --name recallai-api -p 5000:5000 --env-file .env recallai-api
```

### Docker Compose (recommended)
```bash
# From the project root:
docker compose up -d
```

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|----------|:--------:|-------------|
| `PORT` | | Server port (default `5000`) |
| `NODE_ENV` | | `development` or `production` |
| `MONGO_URI` | ✅ | MongoDB Atlas connection string |
| `JWT_SECRET` | ✅ | 64-byte hex string |
| `JWT_REFRESH_SECRET` | ✅ | 64-byte hex string (different from above) |
| `AES_ENCRYPTION_KEY` | ✅ | 32-byte hex string |
| `FIREBASE_PROJECT_ID` | ✅ | From service account JSON |
| `FIREBASE_CLIENT_EMAIL` | ✅ | From service account JSON |
| `FIREBASE_PRIVATE_KEY` | ✅ | From service account JSON (keep `\n` escapes) |
| `FRONTEND_URL` | ✅ | For CORS (e.g. `http://localhost:5173`) |
| `LOG_LEVEL` | | Winston level (default `info`) |

Generate secrets quickly:
```bash
# JWT / Refresh secrets
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# AES key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📝 NPM Scripts

```bash
# Run from server/ directory
npm run dev     # nodemon hot-reload
npm start       # production start
npm run lint    # ESLint
```

---

## 🛠️ Tech Stack

**Backend:** Node.js · Express · MongoDB Atlas · Mongoose · Firebase Admin SDK · Google Gemini · jsonwebtoken · crypto-js · multer v2 · pdf-parse · mammoth · Winston · Morgan · Helmet · express-rate-limit · express-validator

**Frontend:** React 18 · Vite · shadcn/ui · Radix UI · TailwindCSS · React Router · TanStack Query

---

## 📄 License

MIT © 2026 RecallAI
