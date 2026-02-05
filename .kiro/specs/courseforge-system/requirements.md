# CourseForge - AI-Powered Learning Management System
## Requirements Document

### 1. Project Overview

**Project Name:** CourseForge
**Version:** 1.0.0
**Last Updated:** January 21, 2026

CourseForge is an intelligent Learning Management System (LMS) that leverages multi-tier AI agent architecture to generate comprehensive, interactive courses on any topic. The system transforms user input into structured curricula with multimedia enrichment, interactive coding environments, and adaptive learning paths.

### 2. Business Goals

1. **Democratize Education:** Enable anyone to create professional-quality courses instantly
2. **Reduce Content Creation Time:** Transform 40+ hours of manual course creation into <60 seconds
3. **Enhance Learning Experience:** Provide multimedia-rich, interactive content with hands-on coding
4. **Monetization:** Offer tiered subscription model (Free, Pro) with credit-based usage
5. **Scalability:** Support concurrent course generation for thousands of users

### 3. User Personas

#### 3.1 Primary Users

**Persona 1: Self-Learner Sarah**
- Age: 25-35
- Goal: Learn new technical skills quickly
- Pain Point: Scattered resources, no structured path
- Needs: Comprehensive curriculum, hands-on practice, multimedia content

**Persona 2: Educator Emma**
- Age: 30-50
- Goal: Create course materials efficiently
- Pain Point: Time-consuming content creation
- Needs: Fast generation, customization, export capabilities

**Persona 3: Corporate Trainer Tom**
- Age: 35-55
- Goal: Onboard employees with custom training
- Pain Point: Generic courses don't fit company needs
- Needs: Topic customization, pro-level depth, PDF exports

### 4. Functional Requirements

#### 4.1 User Authentication & Authorization

**FR-1.1: OAuth Integration**
- System MUST support Google OAuth authentication
- System MUST support Auth0 authentication
- System MUST maintain secure session management
- System MUST validate JWT tokens on protected routes

**FR-1.2: User Profile Management**
- System MUST store user profile (email, name, auth provider)
- System MUST track subscription status (FREE, PRO)
- System MUST maintain credit balance per user
- System MUST track Stripe customer ID for billing

#### 4.2 Course Generation

**FR-2.1: Topic Input & Validation**
- System MUST accept free-text topic input
- System MUST validate topic is not empty
- System MUST support topics up to 500 characters
- System SHOULD detect ambiguous topics and request clarification

**FR-2.2: Generation Modes**
- System MUST support "Standard" mode (fast, Llama 8B)
- System MUST support "Pro" mode (deep reasoning, Llama 70B/DeepSeek)
- System MUST restrict Pro mode to subscribed users OR one-time trial
- System MUST track trial usage per user

**FR-2.3: Curriculum Structure Generation**
- System MUST generate course title and description
- System MUST generate 3-7 modules per course
- System MUST generate 3-10 lessons per module
- System MUST generate relevant tags (3-5) for searchability
- System MUST use Chain-of-Thought reasoning (_thought field)

**FR-2.4: Content Enrichment**
- System MUST generate lesson objectives
- System MUST support multiple content block types:
  - Heading blocks
  - Paragraph blocks (explanatory text)
  - Code blocks (with syntax highlighting)
  - MCQ blocks (multiple choice questions)
  - Video blocks (YouTube integration)
  - Link blocks (external resources)
- System MUST fetch relevant YouTube videos per lesson
- System MUST fetch course thumbnail from Unsplash
- System SHOULD generate audio summaries (TTS)

**FR-2.5: Asynchronous Processing**
- System MUST use job queue (BullMQ) for long-running tasks
- System MUST return job ID immediately (<500ms)
- System MUST provide real-time progress updates via WebSocket
- System MUST support job cancellation
- System MUST handle worker failures gracefully

#### 4.3 Interactive Coding Environment

**FR-3.1: Code Execution**
- System MUST support Python code execution
- System MUST use sandboxed environment (E2B micro-VM)
- System MUST return execution results within 10 seconds
- System MUST handle runtime errors gracefully

**FR-3.2: Self-Healing Code**
- System SHOULD detect broken code blocks
- System SHOULD automatically fix syntax errors
- System SHOULD verify code execution before saving
- System MUST preserve original code in history

#### 4.4 Content Management

**FR-4.1: Course CRUD Operations**
- System MUST allow users to view all their courses
- System MUST support pagination (9 courses per page)
- System MUST allow course deletion
- System MUST cascade delete modules and lessons
- System MUST delete associated media files (Cloudinary)

**FR-4.2: Course Regeneration**
- System MUST allow course structure regeneration with instructions
- System MUST preserve previous version in history
- System MUST support mode selection (Standard/Pro)
- System MUST deduct appropriate credits

**FR-4.3: Lesson Refinement**
- System MUST allow lesson content refinement with instructions
- System MUST preserve previous versions in history
- System MUST re-enrich content (videos, code verification)
- System MUST support version rollback

**FR-4.4: Version Control**
- System MUST maintain history for courses and lessons
- System MUST store timestamp, instruction, and mode for each version
- System MUST allow viewing historical versions
- System SHOULD limit history to last 10 versions

#### 4.5 Credit System & Payments

**FR-5.1: Credit Management**
- System MUST maintain credit balance in Redis (hot cache)
- System MUST sync credits with MongoDB (cold storage)
- System MUST detect and heal cache drift
- System MUST prevent negative balances

**FR-5.2: Credit Costs**
- Standard course creation: 50 credits
- Pro course creation: 100 credits
- Standard course regeneration: 25 credits
- Pro course regeneration: 75 credits
- Standard lesson refinement: 15 credits
- Pro lesson refinement: 25 credits

**FR-5.3: Stripe Integration**
- System MUST support credit pack purchases
- System MUST support Pro subscription ($9.99/month)
- System MUST handle webhook events (payment success, subscription changes)
- System MUST refund credits on generation failure
- System MUST validate webhook signatures

**FR-5.4: Trial System**
- System MUST offer one-time Pro trial for free users
- System MUST track trial usage per user
- System MUST prevent multiple trial uses
- System MUST restore trial on generation failure

#### 4.6 Caching & Performance

**FR-6.1: Semantic Caching**
- System MUST cache course outlines for 1 hour (Redis)
- System MUST persist cache entries for 90 days (MongoDB)
- System MUST use topic + mode + answers as cache key
- System MUST return cached results within 5ms

**FR-6.2: Vector Search (RAG)**
- System SHOULD perform similarity search on topic
- System SHOULD inject relevant context into prompts
- System SHOULD limit to top 2 results
- System MUST handle vector store failures gracefully

#### 4.7 Export & Sharing

**FR-7.1: PDF Export**
- System MUST support course PDF export
- System MUST support module PDF export
- System MUST support lesson PDF export
- System MUST include all content blocks in PDF
- System MUST format code blocks with syntax highlighting

#### 4.8 Analytics & Monitoring

**FR-8.1: User Analytics**
- System SHOULD track course creation count
- System SHOULD track credit usage patterns
- System SHOULD track generation mode preferences
- System SHOULD track error rates

**FR-8.2: AI Tracing**
- System MUST log all AI requests to LangSmith
- System MUST track token usage per request
- System MUST track latency per model
- System MUST track validation failures

### 5. Non-Functional Requirements

#### 5.1 Performance

**NFR-1.1: Response Times**
- API endpoints MUST respond within 500ms (excluding AI generation)
- Course outline generation MUST complete within 60 seconds (Standard)
- Course outline generation MUST complete within 120 seconds (Pro)
- Lesson content generation MUST complete within 45 seconds
- Cache hits MUST return within 5ms

**NFR-1.2: Throughput**
- System MUST support 100 concurrent users
- System MUST handle 10 concurrent course generations
- System MUST process 1000 API requests per minute

#### 5.2 Scalability

**NFR-2.1: Horizontal Scaling**
- API servers MUST be stateless
- Workers MUST be independently scalable
- System MUST support Redis Cluster for high availability
- System MUST support MongoDB replica sets

**NFR-2.2: Resource Limits**
- Single course MUST NOT exceed 16MB (MongoDB limit)
- Job queue MUST support 10,000 pending jobs
- Redis cache MUST NOT exceed 2GB

#### 5.3 Reliability

**NFR-3.1: Availability**
- System MUST maintain 99.5% uptime
- System MUST handle graceful degradation (cache failures, API limits)
- System MUST retry failed AI requests (3 attempts with exponential backoff)

**NFR-3.2: Data Integrity**
- System MUST use transactions for multi-document operations
- System MUST refund credits on generation failure
- System MUST prevent duplicate credit deductions

#### 5.4 Security

**NFR-4.1: Authentication**
- System MUST validate JWT tokens on all protected routes
- System MUST use HTTPS for all communications
- System MUST sanitize user inputs

**NFR-4.2: Authorization**
- System MUST verify user ownership before course operations
- System MUST validate Stripe webhook signatures
- System MUST prevent unauthorized credit manipulation

**NFR-4.3: Data Protection**
- System MUST NOT log sensitive data (API keys, tokens)
- System MUST encrypt data in transit (TLS 1.3)
- System MUST comply with GDPR (data deletion)

#### 5.5 Maintainability

**NFR-5.1: Code Quality**
- System MUST use TypeScript for type safety
- System MUST maintain >80% test coverage
- System MUST follow ESLint rules
- System MUST use Prettier for formatting

**NFR-5.2: Observability**
- System MUST log errors with Winston
- System MUST trace AI requests with LangSmith
- System MUST expose health check endpoints
- System SHOULD integrate with monitoring tools (Sentry, DataDog)

#### 5.6 Usability

**NFR-6.1: User Experience**
- UI MUST be responsive (mobile, tablet, desktop)
- UI MUST provide real-time progress feedback
- UI MUST handle errors gracefully with user-friendly messages
- UI MUST support dark mode

### 6. Technical Constraints

**TC-1: Technology Stack**
- Frontend: React Router v7, Chakra UI
- Backend: Node.js, Express, TypeScript
- Database: MongoDB Atlas
- Cache: Redis
- Queue: BullMQ
- AI: OpenAI SDK, Groq, Google Gemini, DeepSeek
- Payments: Stripe
- Media: Cloudinary, Unsplash, YouTube Data API
- Code Execution: E2B
- Deployment: Docker, Render

**TC-2: External API Limits**
- Groq: 30 requests/minute (free tier)
- YouTube Data API: 10,000 quota units/day
- Unsplash: 50 requests/hour
- E2B: 100 executions/day (free tier)

**TC-3: Cost Constraints**
- Target: <$0.50 per course generation (Standard)
- Target: <$1.50 per course generation (Pro)
- Minimize AI token usage via caching

### 7. Acceptance Criteria

**AC-1: Course Generation Success Rate**
- 95% of course generations MUST complete successfully
- 90% of generated content MUST pass validation
- 80% of code blocks MUST execute without errors

**AC-2: User Satisfaction**
- Average course generation time <60 seconds (Standard)
- Cache hit rate >40% for popular topics
- User-reported error rate <5%

**AC-3: System Stability**
- Zero credit loss incidents
- Zero data corruption incidents
- <1% failed payment transactions

### 8. Out of Scope

The following features are explicitly out of scope for v1.0:

1. Multi-language course generation (English only)
2. Collaborative course editing
3. Student progress tracking
4. Course marketplace
5. Live instructor sessions
6. Mobile native apps
7. Offline mode
8. Custom branding/white-labeling
9. SCORM compliance
10. Gamification features

### 9. Dependencies

**External Services:**
- Auth0 / Google OAuth (authentication)
- Stripe (payments)
- Groq (AI inference)
- Google Gemini (AI inference)
- DeepSeek (AI inference)
- Cloudinary (media storage)
- Unsplash (images)
- YouTube Data API (videos)
- E2B (code execution)
- MongoDB Atlas (database)
- Redis Cloud (cache)
- Render (hosting)

**Internal Dependencies:**
- All AI generation depends on ModelGateway
- All async operations depend on BullMQ
- All real-time updates depend on Socket.io
- All payments depend on Stripe webhooks

### 10. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| AI API rate limits | High | Medium | Implement caching, fallback models |
| AI hallucinations | Medium | High | Self-healing validation, Zod schemas |
| Credit system race conditions | High | Low | Redis atomic operations, transactions |
| Worker crashes | Medium | Medium | Job retry logic, health checks |
| YouTube quota exhaustion | Medium | Medium | Fallback to search links, daily monitoring |
| Stripe webhook failures | High | Low | Idempotency keys, manual reconciliation |
| MongoDB document size limit | Medium | Low | Reference-based architecture |
| Cost overruns | High | Medium | Aggressive caching, usage monitoring |

### 11. Success Metrics

**User Metrics:**
- 1,000 registered users in first month
- 50% user retention after 30 days
- Average 3 courses per user

**Technical Metrics:**
- 99.5% uptime
- <60s average generation time
- >40% cache hit rate
- <5% error rate

**Business Metrics:**
- 10% conversion to Pro subscription
- $5,000 MRR in first quarter
- <$0.50 cost per Standard course generation

### 12. Glossary

- **Course:** Top-level learning unit containing modules
- **Module:** Section of a course containing lessons
- **Lesson:** Individual learning unit with content blocks
- **Content Block:** Atomic content unit (heading, paragraph, code, MCQ, video, link)
- **Generation Mode:** Standard (fast) or Pro (deep reasoning)
- **Task Tier:** AI model routing strategy (Logic, Creative, Fast, Repair)
- **Semantic Cache:** Content-aware caching using topic similarity
- **Self-Healing:** Automatic JSON validation and repair
- **Chain-of-Thought:** AI reasoning process exposed via _thought field
- **RAG:** Retrieval-Augmented Generation using vector search
- **Job Queue:** BullMQ-based async task processing
- **Worker:** Background process for heavy computation
- **Credit:** Virtual currency for usage-based billing
