# CourseForge 🎓✨

> **Turn any topic into a structured, interactive course in seconds using Generative AI.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Status](https://img.shields.io/badge/status-Production%20Ready-green)
![Tech](https://img.shields.io/badge/stack-MERN%20%2B%20Redis-teal)

CourseForge is an intelligent LMS (Learning Management System) that uses a multi-tier AI agent architecture to generate comprehensive curriculums, lesson content, quizzes, and multimedia resources on the fly.

---

## 🚀 Key Features

### 🧠 AI-Powered Curriculum Design
* **Instant Outlines:** Type "Advanced Python Patterns" and get a structured syllabus with modules and lessons in <10 seconds.
* **Pro Mode (Reasoning):** Uses **DeepSeek/Llama-70B** to plan complex topics with "Chain-of-Thought" reasoning for higher accuracy.
* **Standard Mode (Speed):** Uses **Llama-8B** for rapid, lightweight content generation.

### 📚 Rich Learning Experience
* **Multimedia Enrichment:** Automatically fetches relevant **YouTube videos** and **Unsplash images** for every lesson.
* **Audio Summaries:** Generates "Podcast-style" audio summaries (Hinglish/English) using Neural TTS.
* **Interactive Quizzes:** Auto-generates MCQs to test knowledge retention at the end of every module.

### 🛠️ Hands-on Coding Sandbox
* **Live Code Execution:** Includes an embedded Python sandbox (via E2B) that runs code in a secure micro-VM.
* **Self-Healing Code:** If the AI generates broken code, a background agent detects the error and fixes it automatically.

### 💳 Enterprise-Grade Infrastructure
* **Subscription Management:** Full Stripe integration for credit packs and "Pro" monthly subscriptions.
* **PDF Exports:** Download entire courses or specific modules as professional PDFs.

---

## ⚡ Quick Start (User Guide)

1.  **Sign Up:** Login via Google/Auth0.
2.  **Create:** Click "New Course" and enter a topic (e.g., *'Quantum Computing for Babies'*).
3.  **Customize:** Choose **Standard** (Fast) or **Pro** (Deep Research) mode.
4.  **Learn:**
    * Read the generated content.
    * Run code snippets in the browser.
    * Listen to the audio summary while commuting.
5.  **Export:** Click the "Download PDF" button to save your material offline.

---

## 🏗️ Architecture & Engineering

*Are you a developer, recruiter, or system architect?*
I have documented the entire engineering journey, from the high-level distributed system design to the specific prompts used for the AI agents.

### 📘 **[Read the Full Technical Documentation](./docs)**

Or jump to a specific section:

| Section | Description |
| :--- | :--- |
| **[1. High-Level Architecture](./docs/HLD_Design.md)** | System context, Microservices, and the Client-API-Worker triangle. |
| **[2. The AI "Brain"](./docs/Ai_orchestration.md)** | Deep dive into the `ModelGateway`, Task Tiers, and Self-Healing JSON loops. |
| **[3. Event-Driven Workflow](./docs/Asynchronous_Event_Loop.md)** | How we use **BullMQ** & **Socket.io** for non-blocking, real-time generation. |
| **[4. Database Design](./docs/DB_Design.md)** | MongoDB Schema, Hybrid Caching strategies (Redis + Mongo), and Polyglot Persistence. |
| **[5. DevOps & Deployment](./docs/DevOps.md)** | Docker strategies, Render pipeline, and Monorepo service orchestration. |

---

## 🛠️ Tech Stack

* **Frontend:** React Router v7, Chakra UI
* **Backend:** Node.js, Express, TypeScript
* **AI Orchestration:** OpenAI SDK (Custom Gateway), LangSmith (Tracing)
* **Queue/Async:** Redis, BullMQ, Socket.io (Redis Adapter)
* **Database:** MongoDB Atlas (Vector Search + Core Data)
* **Infrastructure:** Docker, Render, Stripe Connect

---


*Built with ❤️ by Sumesh*