This is the **CourseForge 3.0 Infinite Scaling Master Plan**.

This roadmap bridges the gap between your current status (Phase 3) and the final vision. It integrates the **New Stripe "Point-Based" Economy** directly into the core architecture, ensuring you are profitable from Day 1.

**Major Change:** We are inserting a dedicated **Monetization Layer (Phase 5)**. This ensures that the expensive features in Phases 6-8 (Sandboxing, Research, Live Video) are strictly gated behind payment logic.

---

### **CourseForge Master Plan (Phases 4–8)**

**Mission:** Build an autonomous, "Living Courseware" engine that scales horizontally, verifies its own code, and self-funds through a sustainable token economy.

---

### **Phase 4: The Asynchronous Backbone (Infrastructure)**

**Goal:** Stop user timeouts. Decouple "Request" from "Generation."

**4.1. The Job Queue (Redis + BullMQ)**

* **Architecture:** Producer-Consumer Pattern.
* **Action:** API pushes jobs to Redis. Workers pull them.
* **Resume Win:** "Architected a scalable microservices pattern using **BullMQ**, enabling massive concurrency without blocking the event loop."

**4.2. Real-Time State Sync (WebSockets)**

* **Tech:** Socket.io (Node.js).
* **Action:** As the worker thinks (*"Researching...", "Running Code..."*), it emits events to the frontend.
* **UX:** The user sees a terminal-like log instead of a spinning wheel.

**4.3. The "Credit Lock" Middleware**

* **Logic:** Before adding a job to the queue, check Redis: `GET user:123:credits`.
* **Action:** If balance < cost, throw `402 Payment Required`.

---

### **Phase 5: The "Token Economy" (Monetization)**

**Goal:** Integrate the new Stripe "Weighted Points" model.

**5.1. The "Forge Points" Ledger (Redis)**

* **Concept:** Atomic Credit Management.
* **Logic:**
* **Standard Course:** 10 Pts.
* **Pro Course:** 50 Pts.


* **Action:** Use Redis Atomic Decrement (`DECRBY user:123:credits 50`) to prevent "double spending" race conditions.
* **Resume Win:** "Implemented atomic distributed ledger logic using Redis primitives to manage high-frequency virtual currency transactions."

**5.2. Subscription Webhooks (Stripe)**

* **Plan:** **Pro ($12/mo)** = 1,000 Points. **Top-Up ($5)** = 300 Points.
* **Event Handling:**
* `checkout.session.completed`: Grant initial credits.
* `invoice.payment_succeeded`: **Reset** monthly credits to 1,000 (Use "Use it or Lose it" logic to limit liability).


* **Security:** Verify Stripe Signatures to prevent spoofing.

---

### **Phase 6: The "Deep" Hybrid Router (Cost Intelligence)**

**Goal:** Route tasks to the cheapest model that is "smart enough."

**6.1. The Model Factory Service**

* **Logic:** A dynamic switch based on task complexity.
* **Code/Architecture:**  **DeepSeek-V3** (Low Cost, High IQ).
* **Creative Text:**  **Llama 3.1 70B** (Cheapest High-Quality Prose).
* **JSON Repair:**  **Gemini 1.5 Flash** (Free Tier).


* **Resume Win:** "Engineered a **Semantic Router** that reduced average inference cost by **92%** compared to GPT-4o."

**6.2. Semantic Context Caching**

* **Tech:** Redis Vector Store.
* **Action:** Embed the user's prompt. If a similar course exists (Similarity > 0.95), return the cached JSON instantly. Cost = 0 Points.

---

### **Phase 7: The "Knowledge & Truth" Engine (Quality)**

**Goal:** Guarantee runnable code and up-to-date facts.

**7.1. The "Researcher" Agent (Tavily)**

* **Trigger:** If topic is "New" (post-2023) or "News related."
* **Workflow:** Search Web  Scrape Docs  Summarize  Inject into Prompt.
* **Value:** "CourseForge knows about the software version released *yesterday*."

**7.2. The "Code Sandbox" (E2B)**

* **Action:** Autonomous Verification Loop.
* **Logic:**
1. Generate Code.
2. Spin up E2B MicroVM.
3. Execute.
4. *If Error:* Feed stdout back to DeepSeek to fix.
5. *If Success:* Commit to Lesson.


* **Resume Win:** "Built an **autonomous code verification pipeline** ensuring 100% executability of generated snippets."

---

### **Phase 8: The "Human-in-the-Loop" (Experience)**

**Goal:** Perplexity-style "Pause & Resume" for hyper-personalization.

**8.1. The Interruptible State Machine**

* **Workflow:**
1. **Pause:** Worker detects ambiguity ("Python" is too broad).
2. **Ask:** Saves job state to Redis  Emits WebSocket event `clarification_needed`.
3. **Resume:** User clicks "I am a Data Scientist"  Worker resumes with new system prompt.



**8.2. Pro-Tier Scoping**

* **Depth Scope:** "Beginner" vs. "Senior Engineer."
* **Stack Scope:** "Next.js Pages" vs. "Next.js App Router."
* **Goal Scope:** "Interview Prep" (Theory focus) vs. "Hackathon" (Implementation focus).

---

### **Phase 9: The "Growth" Engine (Retention)**

**Goal:** Automated content that keeps users subscribed.

**9.1. The "Trend Watcher"**

* **Action:** Cron job scans GitHub Trending.
* **Logic:** If "Rust" is trending  Auto-generate "Rust Crash Course"  Notify users.

**9.2. "Lazy" Multimodal Generation**

* **Cost Hack:** Do NOT generate Audio/Video upfront.
* **Just-in-Time:** Only generate the MP3/MP4 when the user hits "Play."
* **Pricing:** Deduct extra points (e.g., 5 pts) for generating media.

---

### **Architecture Diagram (Updated)**

This diagram now includes the **Stripe/Credit** flow which is critical for your SaaS.

```mermaid
graph TD
    %% Client & Payment
    User[User] -->|1. Upgrade ($12)| Stripe[Stripe Checkout]
    Stripe -->|2. Webhook| API[NestJS API]
    API -->|3. Add Credits| Redis[(Redis User/Credits)]

    %% Request Flow
    User -->|4. Request Course| API
    API -.->|5. Check Balance| Redis
    API -->|6. Push Job| Queue[(Redis BullMQ)]

    %% Processing
    Queue -->|7. Process| Worker[Node.js Worker]
    Worker -->|8. Update Progress| WS[Socket Gateway]
    WS --> User

    %% Intelligence Layer (The Cost Router)
    subgraph "Hybrid Brain"
        Worker -->|Logic| DS[DeepSeek-V3]
        Worker -->|Text| Llama[Llama 3.1 70B]
        
        %% Quality Checks
        Worker -->|Research| Tavily[Tavily Search]
        DS <-->|Verify Code| Sandbox[E2B MicroVM]
    end

    %% "Human-in-Loop" Path
    Worker -.->|Ambiguity?| Pause[Pause Job]
    Pause -->|Ask User| WS
    User -->|Answer| API
    API -->|Resume| Worker

```

### **Immediate Next Step**

You have finished Phase 3. **You must start Phase 4 & Phase 5 together.**

1. Set up **BullMQ** (Phase 4).
2. Set up **Redis Credit Ledger** (Phase 5).
3. Connect **Stripe Webhooks** (Phase 5).

**Would you like me to generate the `docker-compose.yml` that includes Redis (configured for persistence) and the `StripeService` code to handle the credits?**