# Data Layer & Schema Design

#### 1. The Entity Relationship Diagram (ERD)

This diagram visualizes how the core content links to the user and how the caching layer sits alongside it.

```mermaid
erDiagram
    %% STYLING
    classDef userLayer fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px;
    classDef contentLayer fill:#e3f2fd,stroke:#1565c0,stroke-width:2px;
    classDef systemLayer fill:#fff3e0,stroke:#ef6c00,stroke-width:2px;

    %% ENTITIES
    USER {
        ObjectId _id PK
        string auth0Id UK "Indexed"
        string email
        string subscriptionStatus "active, free"
        string planType "FREE, PRO"
        number credits
        string stripeCustomerId
    }
    class USER userLayer

    COURSE {
        ObjectId _id PK
        ObjectId userId FK "Ref: User"
        string title
        string generationMode "standard, pro"
        string[] tags
        ObjectId[] modules "Ref: Module"
        Object[] history "Embedded Versioning"
    }
    class COURSE contentLayer

    MODULE {
        ObjectId _id PK
        ObjectId course FK "Ref: Course"
        string title
        ObjectId[] lessons "Ref: Lesson"
    }
    class MODULE contentLayer

    LESSON {
        ObjectId _id PK
        ObjectId module FK "Ref: Module"
        string title
        boolean isEnriched
        Object[] content "Strict JSON Blocks"
        Map audioUrls "Hinglish, English, etc."
        Object[] history "Embedded Versioning"
    }
    class LESSON contentLayer

    CACHE_ENTRY {
        ObjectId _id PK
        string key UK "Indexed"
        string topic
        string type "course, lesson"
        Object data
        Date createdAt "TTL: 90 Days"
    }
    class CACHE_ENTRY systemLayer

    FEEDBACK {
        ObjectId _id PK
        ObjectId userId FK
        string signal "positive, negative"
        string action "regenerate, edit"
    }
    class FEEDBACK systemLayer

    %% RELATIONSHIPS
    USER ||--o{ COURSE : "owns"
    COURSE ||--|{ MODULE : "contains"
    MODULE ||--|{ LESSON : "contains"
    USER ||--o{ FEEDBACK : "provides"

```

#### 2. Technical Design Decisions

**A. The Content Hierarchy (Referencing Strategy)**

* **Structure:** `Course`  `Module`  `Lesson`.
* **Design Choice:** You used **References** (storing `_id` arrays) instead of embedding everything inside the Course document.
* **Why:**
1. **Scalability:** A course with 50 lessons and generated video/audio metadata could easily exceed MongoDB's 16MB document size limit.
2. **Lazy Loading:** The frontend can load the `Course` outline instantly without fetching the heavy `content` of every lesson.



**B. Version Control (Embedding Strategy)**

* **Field:** `history` array in `Course` and `Lesson`.
* **Design Choice:** You embedded the history directly within the document.
* **Why:**
1. **Atomicity:** When a user clicks "Regenerate," you save the *new* content and push the *old* content to history in a single ACID transaction.
2. **Snapshotting:** It allows users to toggle between "Standard" and "Pro" versions of a specific lesson instantly.



**C. The Semantic Cache (TTL Strategy)**

* **Entity:** `CacheEntry`.
* **Feature:** `createdAt: { type: Date, expires: "90d" }`.
* **Why:** MongoDB handles the cleanup automatically. You don't need a cron job to delete old cache entries; the database removes them after 90 days to save storage costs.

**D. Polymorphic Lesson Content**

* **Field:** `content` in `Lesson`.
* **Structure:** An array of mixed objects (`HeadingBlock | VideoBlock | CodeBlock`) validated by Zod schemas in the application layer.
* **Why:** This is superior to storing raw HTML strings. It allows the frontend to render native React components (e.g., a runnable Code Editor for `type: 'code'`) rather than using dangerous `dangerouslySetInnerHTML`.

---
