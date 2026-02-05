# High-Level System Architecture (HLD)



#### 1. The Architecture Diagram

```mermaid
graph TD
    %% Styling
    classDef client fill:#e1f5fe,stroke:#01579b,stroke-width:2px;
    classDef api fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef worker fill:#fff3e0,stroke:#ef6c00,stroke-width:2px;
    classDef storage fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px;
    classDef external fill:#eeeeee,stroke:#616161,stroke-width:2px,stroke-dasharray: 5 5;

    %% CLIENT LAYER
    subgraph Client_Side [Frontend Client]
        Browser[Next.js / React Client]:::client
    end

    %% API SERVICE (index.ts)
    subgraph API_Cluster [API Service Web Server]
        Index[index.ts / HTTP Server]:::api
        SocketService[Socket.io Service]:::api
        Controllers[Controllers & Routes]:::api
    end

    %% MESSAGE BROKER (Redis)
    subgraph Data_Backbone [Redis Backbone]
        JobQueue[BullMQ Job Queue]:::storage
        PubSub[Socket.io Redis Adapter]:::storage
        Cache[Semantic Cache Hot Store]:::storage
    end

    %% WORKER SERVICE (worker-entry.ts)
    subgraph Worker_Cluster [Background Worker Service]
        WorkerEntry[worker-entry.ts]:::worker
        BullWorker[CourseWorker]:::worker
        AIGateway[Model Gateway]:::worker
    end

    %% DATABASE
    subgraph Persistence [Data Persistence]
        MongoDB[(MongoDB Atlas)]:::storage
    end

    %% EXTERNAL APIS
    subgraph External_Cloud [External Services]
        LLMs[Groq / DeepSeek / Gemini]:::external
        StripeAPI[Stripe Payments]:::external
        UnsplashAPI[Unsplash Images]:::external
        YoutubeAPI[YouTube Data]:::external
    end

    %% FLOWS
    Browser -->|HTTP REST| Index
    Browser -->|WebSocket Connection| SocketService
    
    Index --> Controllers
    Controllers -->|1. Add Job| JobQueue
    
    JobQueue -->|2. Process Job| BullWorker
    WorkerEntry --> BullWorker
    
    BullWorker -->|3. Route Prompt| AIGateway
    AIGateway -->|Generate| LLMs
    BullWorker -->|Fetch Media| UnsplashAPI
    BullWorker -->|Fetch Video| YoutubeAPI
    
    BullWorker -->|4. Save Result| MongoDB
    Controllers -->|Read/Write| MongoDB
    
    %% Real-time Feedback Loop
    BullWorker -->|5. Update Progress| JobQueue
    JobQueue -.->|6. Event Listener| SocketService
    SocketService -->|7. Emit Update| Browser
    
    %% Caching
    AIGateway -->|Check| Cache
    Cache -.->|Hydrate| MongoDB


```

#### 2. System Overview

**Project:** CourseForge
**Architecture:** Event-Driven Microservices
**Infrastructure:** Render (PaaS), Docker, Redis

**Core Components:**

1. **API Service (`index.ts`):**
* **Role:** The entry point for all user traffic. It handles Authentication (`authMiddleware`), Payment Webhooks (`paymentRoutes`), and Request Validation.
* **Efficiency:** Uses `compression` and `helmet` for performance and security.
* **Non-Blocking:** It never executes AI tasks directly. Instead, it offloads them to the `JobQueue` immediately.


2. **The Redis Backbone:**
* **BullMQ:** Acts as the buffer between the API and the Worker. Allows the system to handle traffic spikes without crashing.
* **Pub/Sub Adapter:** The `SocketService` uses `redis-adapter` to allow the detached Worker to send real-time alerts to the API server.


3. **Worker Service (`worker-entry.ts`):**
* **Role:** A dedicated Node.js process that listens for heavy compute jobs.
* **Isolation:** Runs independently from the API. If the AI processing crashes, the web server stays alive.
* **Orchestration:** Manages the complex flow of calling AI, fetching images, and saving to the DB.


4. **Hybrid Caching Strategy (`SemanticCache`):**
* **Hot Store (Redis):** Stores recent course outlines for 1 hour for <5ms retrieval.
* **Cold Store (MongoDB):** Persists cache entries for 90 days.
* **Benefit:** Reduces AI costs and latency for popular topics.



---
