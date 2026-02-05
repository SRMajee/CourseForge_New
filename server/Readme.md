
# CourseForge Server 🛠️

The backend engine for **CourseForge**, built with **Node.js, Express, and TypeScript**.

It utilizes an **Event-Driven Architecture** to handle heavy AI generation tasks asynchronously. The system is split into two logical services that share the same codebase:
1.  **API Service:** Handles HTTP traffic, WebSockets, and Webhooks.
2.  **Worker Service:** Processes background jobs (AI generation) via Redis & BullMQ.

---

## 🏗️ Tech Stack

* **Runtime:** Node.js + TypeScript
* **Framework:** Express.js
* **Database:** MongoDB Atlas (Mongoose) + Redis (BullMQ & Caching)
* **AI Gateway:** Custom routing for OpenAI, Groq (Llama 3), Gemini, and DeepSeek.
* **Real-time:** Socket.io (with Redis Adapter).
* **Payments:** Stripe (Webhooks & Checkout).
* **Validation:** Zod (Env & Schema validation).

---

## 🚀 Getting Started

### 1. Prerequisites
* Node.js v18+
* Redis Server (Running locally or via URL)
* MongoDB Instance

### 2. Environment Variables
Create a `.env` file in the `server/` root. Refer to `src/config/env.ts` for the source of truth.

```env
# Core
NODE_ENV=development
PORT=8080
CLIENT_URL=http://localhost:5173

# Database
MONGO_URI=mongodb+srv://...
REDIS_URL=redis://localhost:6379

# AI Providers
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=AIza...
GROQ_API_KEY=gsk_...
TAVILY_API_KEY=tvly-... (For web research)

# Auth & Payment
AUTH0_DOMAIN=...
AUTH0_AUDIENCE=...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Media & Storage
UNSPLASH_ACCESS_KEY=...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

```

### 3. Installation

```bash
npm install

```

### 4. Running Locally

You need to run **both** the API and the Worker for the app to function fully.

**Terminal 1 (API Server):**

```bash
# Starts the HTTP server on PORT 8080
npm run dev

```

**Terminal 2 (Background Worker):**

```bash
# Starts the BullMQ Worker process for AI tasks
npm run worker

```

---

## 📂 Project Structure

```text
src/
├── ai/             # Zod parsers & Prompt Engineering schemas
├── config/         # ENV, DB, Redis, and Stripe configuration
├── controllers/    # Request handlers (Course, Payment, Auth)
├── listeners/      # Queue Event Listeners (Triggers Socket emits)
├── middleware/     # Auth checks, Error handling
├── models/         # Mongoose Schemas (User, Course, Lesson)
├── queues/         # BullMQ Queue definitions
├── routes/         # API Route definitions
├── services/       # Business Logic (ModelGateway, CourseService, etc.)
├── utils/          # Logger, Retry logic
├── app.ts          # Express App Setup
├── index.ts        # API Entry Point
└── worker-entry.ts # Worker Entry Point

```

---

## 🧠 Core Architecture

### 1. The Model Gateway (`services/ModelGateway.ts`)

A custom AI routing layer that manages "Task Tiers" to balance cost and quality:

* **Logic Tier:** Uses Llama-3-70B (via Groq) for complex outlining.
* **Fast Tier:** Uses Llama-3-8B for quick summaries.
* **Repair Tier:** Uses Gemini Flash to fix broken JSON output automatically ("Self-Healing").

### 2. Hybrid Caching (`utils/semanticCache.ts`)

To reduce AI costs, we use a two-layer cache:

* **Hot Store (Redis):** 1-hour TTL for instant access.
* **Cold Store (MongoDB):** 90-day TTL for long-term persistence.

### 3. Asynchronous Workflow

1. **User** requests a course -> **API** responds instantly with `jobId`.
2. **API** pushes job to Redis Queue.
3. **Worker** picks up job, calls AI, and updates progress in Redis.
4. **Listener** sees progress update and emits **Socket.io** event to User.

---

## 🧱 Deployment

The `server` folder is designed to be deployed as a **Monorepo**.

* **Web Service:**
* Command: `npm start`
* Entry: `dist/index.js`


* **Worker Service:**
* Command: `npm run start:worker`
* Entry: `dist/worker-entry.js`



```

```