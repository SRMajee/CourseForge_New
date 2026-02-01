Based on your backend structure (Express + Node.js with Auth0, Stripe, OpenAI, and MongoDB), you need a strategy that balances **speed** (Unit Tests) with **reliability** (Integration Tests).

Since you are setting up a CI/CD pipeline, **efficiency is key**. You do not want your tests to hit real APIs (OpenAI, Stripe, YouTube) every time you push code, as this will be slow and expensive.

Here is the breakdown of the tests you need:

### **1. Total Estimated Count**

* **Unit Tests:** ~25–30 tests (Focus on isolated logic, mocking DB and APIs).
* **Integration Tests:** ~20–25 tests (Focus on API endpoints, Middleware, and DB flow).
* **Total:** **~50 Tests** for a robust V1 pipeline.

---

### **2. Breakdown by Module**

#### **A. Auth Module (`authRoutes.ts`)**

* **Integration Tests (2):**
1. `POST /auth/sync`: Send a valid mock token; verify a User document is created or returned from the DB.
2. `PATCH /auth/profile`: Send updated profile data; verify the changes persist in the DB.


* **Unit Tests:**
* Test `attachUser` middleware separately: Does it correctly find a user in the DB and attach it to `req.user`?
* Test `checkJwt` middleware: Does it reject requests without a token?



#### **B. Course Module (`courseRoutes.ts`) — *The Core Logic***

This is your most complex module. It needs the most coverage.

* **Integration Tests (8–10):**
1. `POST /courses/outline`: Verify it accepts a prompt and saves a course structure to the DB (Mock the AI response).
2. `GET /courses/:id`: Verify it retrieves the correct course object.
3. `POST /lessons/:id/generate`: Verify it updates a lesson with content (Mock AI).
4. `POST /lessons/:id/pdf`: Verify it returns a binary buffer (PDF) response.
5. `POST /courses/execute`: Verify it accepts code and returns an output object.
6. `DELETE /courses/:id`: Verify the course is actually removed from the DB.
7. `POST /:courseId/regenerate`: Verify it creates a history snapshot before updating.
8. `GET /:courseId/history/:versionIndex`: Verify retrieving old versions works.


* **Unit Tests:**
* Test `generateCourseOutline` logic: Does it parse the AI's JSON response correctly?
* Test `deleteCourse` cascade: If a course is deleted, are the modules and lessons also flagged/deleted?



#### **C. Media Module (`mediaRoutes.ts`)**

* **Integration Tests (2):**
1. `GET /media/youtube`: Verify the route returns a list of video objects (Mock the YouTube API).
2. `POST /media/audio/:lessonId`: Verify it returns an audio stream/link.


* **Critical Note:** **Never** let these tests hit real YouTube/OpenAI APIs in CI. Use mocks (e.g., `jest.mock`).

#### **D. Payment & Subscription (`paymentRoutes.ts`, `subscriptionRoutes.ts`)**

* **Integration Tests (4):**
1. `POST /payment/checkout`: Verify it returns a valid Stripe Session URL (Mock Stripe).
2. `GET /subscription/current`: Verify it returns the correct plan based on the user's DB state.
3. `POST /subscription/cancel`: Verify it updates the DB status to "canceled" or "past_due".
4. `POST /subscription/portal`: Verify it returns a portal URL.


* **Unit Tests:**
* **Webhook Handler:** This is critical. Simulate different Stripe events (`checkout.session.completed`, `invoice.payment_succeeded`) and verify your database updates the user's credits/plan correctly.



#### **E. Global & Misc**

* **Integration Tests:**
* `GET /config`: Ensure the app config returns expected public keys.
* **404 Handler:** Request a non-existent route and ensure a standard 404 JSON response.
* **401 Handler:** Request a protected route (e.g., `/courses`) without a token and ensure a 401 response.



---

### **3. CI/CD Strategy Advice**

1. **Mock External Services:** Your pipeline tests should run **offline**. Mock `ModelGateway` (OpenAI), `Stripe`, and `YouTube`. If you hit real APIs, your tests will be flaky and cost money.
2. **In-Memory Database:** For Integration tests, use `mongodb-memory-server`. It spins up a fresh, empty DB for every test run, ensuring your tests don't overwrite each other's data.
3. **Test Speed:** These 50 tests should run in **under 2 minutes** in your CI pipeline.

**Would you like me to generate the Code for the "Course Module" integration tests first?**