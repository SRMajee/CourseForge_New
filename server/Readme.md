docker-compose -f docker-compose.dev.yml up -d --build
docker-compose -f docker-compose.dev.yml up -d
docker-compose -f docker-compose.dev.yml config --services
docker-compose -f docker-compose.dev.yml logs -f api

stripe login
stripe listen --forward-to localhost:8080/api/v1/payment/webhook

# Run tests once and exit
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit

# OR Run in watch mode (great for development)
docker-compose -f docker-compose.test.yml run --rm test_runner pnpm test -- --watch

# 1. Destroy containers and volumes to wipe the bad RS config
docker-compose -f docker-compose.test.yml down -v

# 2. Rebuild and Run
docker-compose -f docker-compose.test.yml run --rm test_runner

This is a smart approach. Building in distinct phases reduces cognitive load and prevents "spaghetti code."

Here is the recommended **Phase Roadmap** for building the "Text-to-Learn" backend, structured by logical dependencies.

### **Phase 1: The Foundation (Infrastructure & Config)**

**Goal:** Get the environment running so you aren't fighting config later.

1. **Dockerization:** Create `Dockerfile` and `docker-compose.dev.yml` to spin up the Node server and local MongoDB.
2. **Env Setup:** Create `.env.example` and the `src/config/env.ts` file to validate environment variables (Zod) on startup.
3. **Server Entry:** Build the basic `src/index.ts` and `src/app.ts` to spin up an Express server with basic middleware (CORS, Helmet, JSON parsing).
4. **Git Setup:** Initialize git and create `.gitignore`.

### **Phase 2: Database & Models (The Data Layer)**

**Goal:** Define strict shapes for your data before writing logic.

1. **DB Connection:** Write `src/config/db.ts` to handle Mongoose connection (with retries).
2. **Validation Schemas:** Write `src/ai/parsers/courseSchema.ts` using **Zod**. This is the most critical file; it defines exactly what the AI must output (Modules, Lessons, Quiz questions).
3. **Mongoose Models:** Create `src/models/User.ts` and `src/models/Course.ts`. Ensure `Course.ts` mirrors the Zod schema structure.

### **Phase 3: Authentication (The Gatekeeper)**

**Goal:** Secure the API before building public endpoints.

1. **Auth0 Setup:** Configure `src/config/auth0.ts` with your Issuer and Audience.
2. **Middleware:** Write `src/middleware/authMiddleware.ts` to validate JWTs.
3. **User Controller:** Write `src/controllers/authController.ts` to handle "Upsert" logic (if a user logs in via Auth0, ensure they exist in your Mongo DB).

### **Phase 4: The AI Core (The "Brain")**

**Goal:** Isolate the complex LLM logic from the HTTP layer.

1. **Tools:** Build `src/ai/tools/youtubeTool.ts` (wrapper for YouTube API) and `src/ai/tools/ttsTool.ts`.
2. **Prompts:** Create `src/ai/prompts/templates.ts`. This contains the system instructions that tell GPT-4o how to behave.
3. **The Agent:** Build `src/ai/agents/courseAgent.ts`. This orchestrates the LLM, the Tools, and the Zod Parser to guarantee valid JSON output.

### **Phase 5: API Business Logic (Connecting the Dots)**

**Goal:** Expose the AI capabilities via REST endpoints.

1. **Course Controller:** Write `src/controllers/courseController.ts`. This handles the HTTP request, calls the `CourseAgent`, and saves the result to MongoDB.
2. **Routes:** Define `src/routes/courseRoutes.ts` (POST `/generate`, GET `/:id`).
3. **Validation Middleware:** Add validation for user inputs (e.g., ensure "topic" string isn't empty).

### **Phase 6: Polish & Deployment (Production Ready)**

**Goal:** Hardening the application.

1. **Error Handling:** Refine `src/middleware/errorMiddleware.ts` to distinguish between "AI Failures" vs "Database Failures."
2. **Logging:** Ensure `src/utils/logger.ts` is capturing token usage (vital for cost monitoring).
3. **Prod Docker:** Verify `docker-compose.prod.yml` works with the remote MongoDB Atlas connection.

---

### **Next Step**

Which phase would you like to execute first?

* **Phase 1 (Foundation):** We get the Docker container running.
* **Phase 2 (Database):** We define the Zod schemas and Mongoose models.