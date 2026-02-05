# CourseForge Client 💻

The frontend interface for **CourseForge**, built with **React, React Router v7, and Chakra UI**.

It features a **Feature-Sliced Architecture** for scalability, a modern responsive dashboard, a real-time IDE for executing code, and an interactive lesson player.

---

## 🎨 Tech Stack

* **Framework:** Vite + React
* **Package Manager:** pnpm
* **Routing:** React Router v7 (Data Routers with Loaders/Actions)
* **UI Library:** Chakra UI + Framer Motion
* **State Management:** React Query (TanStack Query) + Context API
* **Real-time:** Socket.io Client
* **Code Editor:** Monaco Editor (VS Code embedded)
* **Sandboxing:** E2B Code Interpreter SDK (for running Python in browser)

---

## 🚀 Getting Started

### 1. Prerequisites
* Node.js v18+
* pnpm installed (`npm install -g pnpm`)

### 2. Environment Variables
Create a `.env` file in the `client/` root.

```env
# API Connection
VITE_API_URL=http://localhost:8080/api/v1
VITE_SOCKET_URL=http://localhost:8080

# Auth0 Configuration
VITE_AUTH0_DOMAIN=your-auth0-domain
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=your-audience

```

### 3. Installation

```bash
pnpm install

```

### 4. Running Locally

```bash
pnpm dev

```

Access the app at `http://localhost:5173`.

---

## 📂 Project Structure

We follow a **Feature-Based Architecture**. Each major domain (Course, Lesson, Payment) has its own folder containing its specific components and hooks, while shared utilities live in the root.

```text
src/
├── components/          # Shared/Global Components
│   ├── auth/            # Login buttons, ProtectedRoute wrappers
│   ├── common/          # ErrorBoundaries, LoadingSpinners
│   ├── layout/          # DashboardLayout, Navbar, Sidebar
│   └── ui/              # Reusable Chakra UI atoms (Cards, Buttons, Modals)
├── features/            # 📦 Core Domain Logic
│   ├── course/          # Course creation & management
│   │   ├── components/
│   │   └── hooks/       # useCreateCourse, useCourseData
│   ├── dashboard/       # Main user dashboard views
│   ├── lesson/          # Interactive Lesson Player & IDE
│   │   ├── blocks/      # Renderers for Text, Code, Video, MCQ blocks
│   │   ├── components/
│   │   └── hooks/       # useLessonNavigation, useCodeExecution
│   ├── payment/         # Stripe Checkout & Credit Packs
│   ├── pdf/             # PDF Export templates & logic
│   └── subscription/    # Pro plan management components
├── hooks/               # Global hooks (useSocket, useAuth)
├── routes/              # React Router v7 Route definitions (loaders/actions)
├── services/            # Axios instances & API service layers
├── store/               # Global State (Zustand/Context)
├── theme/               # Chakra UI custom theme configuration
├── types/               # TypeScript interfaces (Course, User, API Responses)
├── utils/               # Helper functions (formatters, validators)
└── workers/             # Web Workers (for heavy syntax highlighting/parsing)

```

---

## 🧩 Key Features

### 1. Routing (React Router v7)

We utilize the latest v7 Data APIs to handle data fetching *before* rendering.

* **Loaders:** Fetch course/lesson data in parallel with the route transition.
* **Actions:** Handle form submissions (like "Create Course") natively, creating a snappy UX without `useEffect` waterfalls.

### 2. Real-Time Socket Integration

The global `SocketContext` listens for backend worker events:

* **`course_generation_started`:** Triggers the UI to enter "Generation Mode."
* **`job_progress`:** Updates the global progress bar (e.g., "Drafting Lesson 3... 45%").
* **`course_generated`:** Invalidates React Query keys to instantly refresh the dashboard.

### 3. The Interactive Lesson Player (`features/lesson`)

* **Polymorphic Rendering:** The `blocks/` folder contains specific renderers for different content types (Video, MCQ, Code).
* **Live Coding:** The Code Block integrates **Monaco Editor** and sends code to the backend **E2B Sandbox** for safe execution.

---