This is a comprehensive, phased plan to migrate your vector storage, move to a serverless architecture, and establish a robust CI/CD pipeline for automated deployments.

### **Phase 1: Codebase Readiness (The "Serverless Switch")**

**Goal:** Modify the code to run efficiently on free/serverless tiers (MongoDB Atlas + Upstash) and prepare for automation.

1. **Migrate Vector Store (Redis → MongoDB)**
* **Action:** Uninstall `@langchain/redis` and install `@langchain/mongodb`.
* **Refactor:** Update your vector store initialization file.
```typescript
// services/vectorStore.ts
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { OpenAIEmbeddings } from "@langchain/openai";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGO_URI || "");
const collection = client.db("courseforge").collection("vectors");

export const vectorStore = new MongoDBAtlasVectorSearch(
  new OpenAIEmbeddings(),
  {
    collection,
    indexName: "vector_index", // Matches Atlas config
    textKey: "text",
    embeddingKey: "embedding",
  }
);

```




2. **Optimize Worker for Upstash (Cost Saving)**
* **Action:** In `courseWorker.ts`, adjust the queue settings to prevent hitting Upstash's 10,000 daily command limit.
* **Config:** Set `drainDelay: 10000` (10s) and `lockDuration: 60000`. This makes the worker "lazy" when idle.


3. **Create Worker Entry Point**
* **Action:** Create `src/worker-entry.ts` (as discussed previously) that spins up a dummy Express server. This is required for Render's health checks.



---

### **Phase 2: Cloud Infrastructure Setup**

**Goal:** Provision the backing services before deploying code.

1. **MongoDB Atlas (Database + Vectors)**
* **Create:** A free M0 Cluster.
* **Search Index:** In the "Atlas Search" tab, create a JSON index named `vector_index` on the `vectors` collection:
```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 1536,
      "similarity": "cosine"
    }
  ]
}

```




2. **Upstash Redis (Queue)**
* **Create:** A free Redis database.
* **Security:** Enable TLS and copy the `rediss://` connection string.


3. **Production Keys (Live Mode)**
* **Stripe:** Switch to Live Mode, generate new Publishable/Secret keys, and create a new Webhook (`/webhook/stripe`) to get the live signing secret.
* **Auth0:** Add your production Render URL (once known) to "Allowed Callback URLs".
* **Unsplash:** Request "Production" access (limit increase) in their developer portal.



---

### **Phase 3: CI/CD Pipeline (GitHub Actions)**

**Goal:** Automate testing and deployment so you never have to manually deploy again.

1. **Get Deploy Hooks**
* We will use Render's "Deploy Hooks" which are simpler and faster than building Docker images manually in GitHub Actions.
* *(You will get these URLs in Phase 4, but we prepare the file now)*.


2. **Create Workflow File**
* Create `.github/workflows/pipeline.yml` in your repo.



```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  # ------------------------------------------------------------------
  # JOB 1: Integrity Check (Install, Lint, Test)
  # ------------------------------------------------------------------
  test:
    name: Validate Code
    runs-on: ubuntu-latest
    env:
      # Use mocks for CI to avoid needing real DB connections
      NODE_ENV: test
      MONGO_URI: mongodb://localhost:27017/test
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install PNPM
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install Dependencies
        run: pnpm install --frozen-lockfile

      - name: Run Linter
        run: pnpm lint

      - name: Run Tests
        # Ensure your "test" script in package.json runs jest
        run: pnpm test

      - name: Build Project
        # Verifies that TS compiles without errors
        run: pnpm build

  # ------------------------------------------------------------------
  # JOB 2: Deploy to Production (Only on Main Branch)
  # ------------------------------------------------------------------
  deploy:
    name: Trigger Render Deploy
    needs: test # Only run if tests pass
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy API
        # Hits the Render Webhook to pull latest code & rebuild
        run: curl -X POST "${{ secrets.RENDER_API_DEPLOY_HOOK }}"
      
      - name: Deploy Worker
        run: curl -X POST "${{ secrets.RENDER_WORKER_DEPLOY_HOOK }}"

```

---

### **Phase 4: Deployment & Connection**

**Goal:** Go live and link the CI/CD pipeline.

1. **Initial Deploy on Render**
* Create **Service A (API)**: Connect Repo -> Build: `pnpm build` -> Start: `pnpm start`.
* Create **Service B (Worker)**: Connect Repo -> Build: `pnpm build` -> Start: `pnpm run worker`.
* **Environment Variables:** Add `MONGO_URI`, `REDIS_URL`, `STRIPE_SECRET_KEY`, etc., to both services.


2. **Activate CI/CD**
* **Render:** Go to Settings -> **Deploy Hook** for *both* services. Copy the URLs.
* **GitHub:** Go to Repo Settings -> Secrets and Variables -> Actions.
* **Add Secrets:**
* `RENDER_API_DEPLOY_HOOK`: (Paste API URL)
* `RENDER_WORKER_DEPLOY_HOOK`: (Paste Worker URL)




3. **Sanity Check**
* Push a small change to `main` (e.g., update `README.md`).
* Watch the **Actions** tab in GitHub.
* Verify that `test` passes and `deploy` triggers Render.



### **Phase 5: Post-Deployment Verification**

1. **Monitor Logs:** Watch the Worker logs in Render. Ensure it connects to Redis without errors.
2. **Test Payment:** Run a real transaction with Stripe (small amount, e.g., $0.50) to verify the webhook updates the user's credits in MongoDB.
3. **Test AI:** Generate a course and check MongoDB Atlas to confirm the vector embedding was created in the `vectors` collection.