# CourseForge - System Design Document
## Design Specification

### 1. Architecture Overview

**Architecture Style:** Event-Driven Microservices
**Deployment Model:** Containerized (Docker) on PaaS (Render)
**Communication Patterns:** REST API, WebSocket, Message Queue

#### 1.1 High-Level Architecture

```
┌─────────────────┐
│  React Client   │
│  (React Router) │
└────────┬────────┘
         │ HTTP/WS
         ▼
┌─────────────────┐
│   API Server    │
│  (Express.js)   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────┐
│ Redis  │ │ MongoDB  │
│ Queue  │ │ Database │
└───┬────┘ └──────────┘
    │
    ▼
┌─────────────────┐
│ Worker Service  │
│ (Background)    │
└────────┬────────┘
         │
    ┌────┴────────────┐
    ▼                 ▼
┌─────────┐    ┌──────────┐
│ AI APIs │    │ External │
│ (Groq)  │    │ Services │
└─────────┘    └──────────┘
```


### 2. Component Design

#### 2.1 Frontend Architecture

**Technology:** React Router v7, Chakra UI, Zustand, TanStack Query

**Key Components:**
- **Authentication Layer:** Auth0/Google OAuth integration
- **State Management:** Zustand stores (auth, config, socket)
- **API Client:** Axios with interceptors
- **Real-time Updates:** Socket.io client
- **UI Components:** Chakra UI with custom theme

**Directory Structure:**
```
client/app/
├── components/
│   ├── auth/          # Auth sync, interceptors
│   ├── common/        # Shared UI components
│   ├── layout/        # Layout components
│   └── ui/            # Chakra UI wrappers
├── features/
│   ├── course/        # Course management
│   ├── lesson/        # Lesson rendering
│   ├── payment/       # Credit & subscription
│   └── pdf/           # PDF export
├── services/          # API clients
├── store/             # Zustand stores
├── types/             # TypeScript definitions
└── routes/            # Route definitions
```


#### 2.2 Backend Architecture

**Technology:** Node.js, Express, TypeScript, Mongoose

**Core Services:**

**API Server (index.ts):**
- Entry point for all HTTP traffic
- Handles authentication, validation, routing
- Manages WebSocket connections
- Delegates heavy tasks to workers

**Worker Service (worker-entry.ts):**
- Isolated process for CPU-intensive tasks
- Consumes jobs from BullMQ
- Executes AI generation workflows
- Updates job progress via Redis

**Key Services:**

1. **ModelGateway:** AI orchestration with task-based routing
2. **CourseService:** Business logic for course operations
3. **CreditService:** Credit management with Redis caching
4. **SocketService:** Real-time communication
5. **ResearchService:** Web search integration (Tavily)
6. **ImageService:** Unsplash integration
7. **YoutubeService:** YouTube Data API integration
8. **CodeExecutionService:** E2B sandbox integration
9. **SemanticCache:** Hybrid caching (Redis + MongoDB)

**Directory Structure:**
```
server/src/
├── ai/
│   └── parsers/       # Zod schemas for AI output
├── config/            # Configuration modules
├── controllers/       # Route handlers
├── middleware/        # Auth, validation
├── models/            # Mongoose schemas
├── services/          # Business logic
├── queues/            # BullMQ queue definitions
├── workers/           # Background workers
├── listeners/         # Event listeners
└── utils/             # Helpers, logger
```


### 3. Data Model Design

#### 3.1 MongoDB Schemas

**User Schema:**
```typescript
{
  _id: ObjectId,
  auth0Id: string (unique, indexed),
  email: string,
  name: string,
  picture: string,
  credits: number (default: 100),
  subscriptionStatus: 'active' | 'inactive' | 'cancelled',
  planType: 'FREE' | 'PRO',
  stripeCustomerId: string,
  hasUsedProTrial: boolean (default: false),
  createdAt: Date,
  updatedAt: Date
}
```

**Course Schema:**
```typescript
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  title: string,
  description: string,
  tags: string[],
  thumbnailUrl: string,
  modules: ObjectId[] (ref: Module),
  generationMode: 'standard' | 'pro',
  history: [{
    timestamp: Date,
    instruction: string,
    modules: ObjectId[],
    generationMode: string
  }],
  createdAt: Date,
  updatedAt: Date
}
```

**Module Schema:**
```typescript
{
  _id: ObjectId,
  course: ObjectId (ref: Course),
  title: string,
  lessons: ObjectId[] (ref: Lesson),
  createdAt: Date,
  updatedAt: Date
}
```

**Lesson Schema:**
```typescript
{
  _id: ObjectId,
  module: ObjectId (ref: Module),
  title: string,
  objectives: string[],
  content: ContentBlock[],
  isEnriched: boolean,
  audioUrls: Map<string, string>,
  generationMode: 'standard' | 'pro',
  history: [{
    timestamp: Date,
    instruction: string,
    content: ContentBlock[],
    generationMode: string
  }],
  createdAt: Date,
  updatedAt: Date
}
```

**ContentBlock Types:**
```typescript
type ContentBlock = 
  | { type: 'heading', text: string }
  | { type: 'paragraph', text: string }
  | { type: 'code', language: string, code: string }
  | { type: 'mcq', question: string, options: string[], answer: number, explanation: string }
  | { type: 'video', url: string, title: string, thumbnail: string }
  | { type: 'link', title: string, url: string, description: string }
```

**CacheEntry Schema:**
```typescript
{
  _id: ObjectId,
  key: string (unique, indexed),
  topic: string,
  type: 'course' | 'lesson',
  data: Object,
  createdAt: Date (TTL: 90 days)
}
```


#### 3.2 Redis Data Structures

**Credit Balance Cache:**
```
Key: user:{userId}:credits
Type: String
Value: number
TTL: None (persistent)
```

**User Context Cache:**
```
Key: user:{userId}:context
Type: Hash
Fields: { credits, planType, subscriptionStatus, hasUsedProTrial }
TTL: 1 hour
```

**Semantic Cache (Hot Store):**
```
Key: cache:{hash(topic+mode+answers)}
Type: String
Value: JSON (course outline)
TTL: 1 hour
```

**Job State (Clarification):**
```
Key: job:{jobId}
Type: String
Value: JSON { userId, topic, mode, timestamp }
TTL: 10 minutes
```

**BullMQ Queues:**
```
Queue: courseQueue
Jobs: { generate_outline, generate_lesson, enrich_content }
```


### 4. AI Orchestration Design

#### 4.1 ModelGateway Architecture

**Task-Based Routing Strategy:**

The ModelGateway abstracts AI providers and routes requests based on task complexity:

```typescript
enum TaskTier {
  LOGIC_REASONING = "tier_gpt",      // Llama 3.3 70B (Complex planning)
  CREATIVE_WRITING = "tier_llama_70b", // Llama 3.3 70B (Content writing)
  FAST_UTILITY = "tier_llama_8b",     // Llama 3.1 8B (Quick tasks)
  JSON_REPAIR = "tier_gemini"         // Gemini 1.5 Flash (Error fixing)
}
```

**Model Selection Matrix:**

| Task | Standard Mode | Pro Mode | Fallback |
|------|--------------|----------|----------|
| Course Outline | Llama 8B | Llama 70B | Gemini |
| Lesson Content | Llama 8B | Llama 70B | Gemini |
| Code Verification | Llama 8B | Llama 8B | N/A |
| JSON Repair | Gemini | Gemini | N/A |
| Research Summary | Llama 8B | Llama 8B | N/A |


#### 4.2 Self-Healing JSON Generation

**Problem:** LLMs often generate invalid JSON (trailing commas, missing fields, type mismatches)

**Solution:** Multi-stage validation and repair loop

**Flow:**
```
1. Generate with JSON mode enabled
2. Parse and validate with Zod schema
3. If valid → Return result
4. If invalid → Extract error details
5. Switch to JSON_REPAIR tier (Gemini)
6. Prompt: "Fix this JSON. Error: {zodError}"
7. Retry validation (max 2 attempts)
8. If still invalid → Throw error
```

**Implementation:**
```typescript
async generateStructured<S extends ZodTypeAny>(
  prompt: string,
  schema: S,
  initialTier: TaskTier,
  maxRetries = 2
): Promise<z.infer<S>> {
  let attempts = 0;
  let currentTier = initialTier;
  
  while (attempts <= maxRetries) {
    const rawResult = await this.generate(prompt, currentTier, systemPrompt, true);
    const validation = schema.safeParse(JSON.parse(rawResult));
    
    if (validation.success) return validation.data;
    
    // Self-heal
    currentTier = TaskTier.JSON_REPAIR;
    prompt = `Fix this JSON. Error: ${validation.error}`;
    attempts++;
  }
  
  throw new Error('Failed after max retries');
}
```


#### 4.3 Chain-of-Thought (CoT) Prompting

**Technique:** Force AI to "think" before generating structured output

**Schema Design:**
```typescript
const outlineSchema = z.object({
  _thought: z.string().describe("Internal reasoning process"),
  title: z.string(),
  description: z.string(),
  tags: z.array(z.string()),
  modules: z.array(moduleSchema)
});
```

**Benefits:**
- Improves logical flow of curriculum
- Reduces hallucinations
- Provides debugging insight
- Increases consistency

**Example Output:**
```json
{
  "_thought": "User wants Python course. Start with basics (variables, loops), then data structures, finally advanced topics like decorators.",
  "title": "Complete Python Programming",
  "modules": [...]
}
```


### 5. Asynchronous Processing Design

#### 5.1 Event-Driven Architecture

**Problem:** Course generation takes 30-120 seconds, exceeding HTTP timeout limits

**Solution:** Fire-and-forget pattern with real-time progress updates

**Components:**

1. **API Server:** Accepts request, enqueues job, returns job ID
2. **Redis Queue (BullMQ):** Buffers jobs, manages retries
3. **Worker:** Processes jobs, updates progress
4. **Queue Listener:** Bridges worker events to WebSocket
5. **Socket Service:** Emits updates to specific user

**Sequence Flow:**
```
Client → API: POST /courses/outline
API → Redis: courseQueue.add({ userId, topic, mode })
API → Client: 202 { jobId: "123" }

[Async Processing]
Worker ← Redis: Consume job 123
Worker → Redis: job.updateProgress(20%)
Listener ← Redis: Event "progress"
Listener → Socket: Emit to user's room
Socket → Client: { jobId: "123", progress: 20% }

Worker → MongoDB: Save course
Worker → Redis: job.completed({ courseId })
Listener → Socket: Emit "course_generated"
Socket → Client: { courseId: "abc123" }
```


#### 5.2 Job Queue Design

**Queue Configuration:**
```typescript
const courseQueue = new Queue('courseQueue', {
  connection: redisClient,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50
  }
});
```

**Job Types:**

1. **generate_outline:** Create course structure
2. **generate_lesson:** Create lesson content
3. **enrich_content:** Add videos, verify code

**Worker Configuration:**
```typescript
const worker = new Worker('courseQueue', async (job) => {
  const { userId, topic, mode } = job.data;
  
  // Heartbeat for UI
  const interval = setInterval(() => {
    job.updateProgress(job.progress + 5);
  }, 2000);
  
  try {
    const result = await courseService.generateCourse(userId, topic, { mode });
    clearInterval(interval);
    return result;
  } catch (error) {
    clearInterval(interval);
    throw error;
  }
}, {
  connection: redisClient,
  concurrency: 5
});
```


### 6. Caching Strategy Design

#### 6.1 Hybrid Semantic Cache

**Architecture:** Two-tier caching (Hot + Cold)

**Hot Store (Redis):**
- TTL: 1 hour
- Purpose: Ultra-fast retrieval (<5ms)
- Eviction: LRU automatic

**Cold Store (MongoDB):**
- TTL: 90 days (automatic via MongoDB TTL index)
- Purpose: Long-term persistence
- Eviction: Automatic after 90 days

**Cache Key Generation:**
```typescript
const cacheKey = `${topic}-${JSON.stringify(userAnswers)}-${mode}`;
const hash = crypto.createHash('sha256').update(cacheKey).digest('hex');
```

**Cache Flow:**
```
1. Check Redis (hot)
   ├─ Hit → Return immediately
   └─ Miss → Check MongoDB (cold)
       ├─ Hit → Hydrate Redis, return
       └─ Miss → Generate, save to both
```

**Implementation:**
```typescript
async getCachedOutline(key: string) {
  // Try hot cache
  const hotCache = await redisClient.get(`cache:${key}`);
  if (hotCache) return JSON.parse(hotCache);
  
  // Try cold cache
  const coldCache = await CacheEntry.findOne({ key });
  if (coldCache) {
    // Hydrate hot cache
    await redisClient.setex(`cache:${key}`, 3600, JSON.stringify(coldCache.data));
    return coldCache.data;
  }
  
  return null;
}
```


#### 6.2 Credit Cache with Drift Detection

**Problem:** Redis cache can drift from MongoDB source of truth

**Solution:** Optimistic caching with automatic healing

**Flow:**
```
1. Check Redis balance
2. If insufficient → Check MongoDB
3. If MongoDB has sufficient credits:
   ├─ Log drift warning
   ├─ Sync Redis from MongoDB
   └─ Allow operation
4. If MongoDB also insufficient:
   └─ Reject operation
```

**Implementation:**
```typescript
async validateBalance(userId: string, cost: number) {
  let balance = await creditService.getBalance(userId); // Redis
  
  if (balance < cost) {
    const user = await User.findById(userId).select('credits');
    const dbBalance = user?.credits || 0;
    
    if (dbBalance >= cost) {
      // Drift detected - heal cache
      logger.warn(`Credit drift: Redis(${balance}) < DB(${dbBalance})`);
      await redisClient.set(`user:${userId}:credits`, dbBalance);
      balance = dbBalance;
    } else {
      throw new Error('Insufficient credits');
    }
  }
}
```

**Atomic Operations:**
```typescript
// Deduct credits atomically
async deductCredits(userId: string, amount: number) {
  const newBalance = await redisClient.decrby(`user:${userId}:credits`, amount);
  
  if (newBalance < 0) {
    // Rollback
    await redisClient.incrby(`user:${userId}:credits`, amount);
    return false;
  }
  
  // Async sync to MongoDB
  User.findByIdAndUpdate(userId, { $inc: { credits: -amount } }).exec();
  return true;
}
```


### 7. Payment System Design

#### 7.1 Stripe Integration Architecture

**Components:**

1. **Credit Packs:** One-time purchases (100, 500, 1000 credits)
2. **Pro Subscription:** $9.99/month recurring
3. **Webhook Handler:** Processes payment events
4. **Trial System:** One-time Pro mode trial for free users

**Payment Flow (Credit Pack):**
```
Client → API: POST /payment/create-checkout
API → Stripe: Create checkout session
API → Client: { sessionUrl }
Client → Stripe: Redirect to checkout
User → Stripe: Complete payment
Stripe → API: Webhook (checkout.session.completed)
API → MongoDB: Update user credits
API → Redis: Invalidate user context cache
```

**Subscription Flow:**
```
Client → API: POST /subscription/create
API → Stripe: Create subscription
Stripe → API: Webhook (customer.subscription.created)
API → MongoDB: Update subscriptionStatus = 'active', planType = 'PRO'
API → Redis: Invalidate user context cache

[Monthly Renewal]
Stripe → API: Webhook (invoice.payment_succeeded)
API → MongoDB: Verify subscription still active

[Cancellation]
Client → API: POST /subscription/cancel
API → Stripe: Cancel subscription
Stripe → API: Webhook (customer.subscription.deleted)
API → MongoDB: Update subscriptionStatus = 'cancelled'
```


#### 7.2 Credit Refund System

**Trigger:** Any generation failure after credit deduction

**Implementation:**
```typescript
async generateCourse(userId: string, topic: string, options: GenerateOptions) {
  const cost = calculateCost(options.mode);
  const isTrialRun = checkTrialEligibility(userId, options.mode);
  
  // Deduct credits/mark trial used
  if (isTrialRun) {
    await User.findOneAndUpdate(
      { _id: userId, hasUsedProTrial: false },
      { $set: { hasUsedProTrial: true } }
    );
  } else {
    await creditService.deductCredits(userId, cost);
  }
  
  try {
    // Generation logic
    const course = await this.performGeneration(userId, topic, options);
    return course;
  } catch (error) {
    // REFUND on failure
    logger.error('Generation failed. Refunding...');
    
    if (isTrialRun) {
      await User.findByIdAndUpdate(userId, { hasUsedProTrial: false });
    } else {
      await creditService.addCredits(userId, cost);
    }
    
    throw error;
  }
}
```

**Idempotency:** Webhook events use Stripe event ID as idempotency key to prevent duplicate processing


### 8. Content Enrichment Design

#### 8.1 Multimedia Integration

**YouTube Video Enrichment:**

**Flow:**
```
1. AI generates video block with query
2. System calls YouTube Data API
3. If quota available:
   ├─ Search for video
   ├─ Extract videoId, title, thumbnail
   └─ Replace block with enriched data
4. If quota exhausted or error:
   ├─ Log warning
   └─ Fallback to search link
```

**Implementation:**
```typescript
async enrichVideoBlock(block: VideoBlock) {
  const query = block.query || lessonTitle;
  
  try {
    const videoData = await youtubeService.searchVideo(query);
    return {
      type: 'video',
      url: `https://www.youtube.com/watch?v=${videoData.videoId}`,
      title: videoData.title,
      thumbnail: videoData.thumbnail
    };
  } catch (error) {
    logger.warn(`YouTube fallback for: ${query}`);
    return {
      type: 'link',
      title: `Watch: ${query}`,
      url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
    };
  }
}
```


#### 8.2 Self-Healing Code Blocks

**Problem:** AI-generated code may have syntax errors or runtime failures

**Solution:** Automatic verification and repair

**Flow:**
```
1. AI generates code block
2. System executes code in E2B sandbox
3. If execution succeeds:
   └─ Return verified code
4. If execution fails:
   ├─ Extract error message
   ├─ Prompt AI: "Fix this code. Error: {error}"
   ├─ Re-execute fixed code
   └─ Return verified code (or original if still fails)
```

**Implementation:**
```typescript
async verifyCodeBlock(block: CodeBlock) {
  if (block.language !== 'python') return block;
  
  try {
    const result = await e2bClient.execute(block.code);
    
    if (result.error) {
      logger.warn('Code execution failed. Attempting fix...');
      const fixedCode = await modelGateway.generate(
        `Fix this Python code. Error: ${result.error}\n\nCode:\n${block.code}`,
        TaskTier.FAST_UTILITY
      );
      
      const retryResult = await e2bClient.execute(fixedCode);
      if (!retryResult.error) {
        return { ...block, code: fixedCode };
      }
    }
    
    return block;
  } catch (error) {
    logger.error('Code verification failed:', error);
    return block;
  }
}
```


### 9. Version Control Design

#### 9.1 History Management

**Strategy:** Embedded history arrays in Course and Lesson documents

**Course History:**
```typescript
{
  history: [{
    timestamp: Date,
    instruction: string,        // User's regeneration instruction
    modules: ObjectId[],        // Snapshot of module IDs
    generationMode: 'standard' | 'pro'
  }]
}
```

**Lesson History:**
```typescript
{
  history: [{
    timestamp: Date,
    instruction: string,        // User's refinement instruction
    content: ContentBlock[],    // Full content snapshot
    generationMode: 'standard' | 'pro'
  }]
}
```

**Benefits:**
- Atomic updates (single transaction)
- Fast rollback (no joins)
- Audit trail for debugging

**Limitations:**
- Document size growth (mitigated by limiting to 10 versions)
- No cross-document history queries


#### 9.2 Regeneration Flow

**Course Regeneration:**
```
1. User submits instruction + mode
2. System validates credits
3. System deducts credits
4. System archives current state to history[]
5. System generates new structure with AI
6. System saves new modules/lessons
7. System updates course.modules
8. On failure: Refund credits, restore from history
```

**Lesson Refinement:**
```
1. User submits instruction + mode
2. System validates credits
3. System deducts credits
4. System archives current content to history[]
5. System generates new content with AI
6. System enriches content (videos, code)
7. System updates lesson.content
8. On failure: Refund credits, restore from history
```

**Version Retrieval:**
```typescript
async getCourseVersion(courseId: string, historyIndex: number) {
  const course = await Course.findById(courseId);
  const snapshot = course.history[historyIndex];
  
  const modules = await Module.find({ _id: { $in: snapshot.modules } })
    .populate('lessons');
  
  return {
    ...course.toObject(),
    modules: modules,
    isHistoricalView: true,
    versionDate: snapshot.timestamp,
    generationMode: snapshot.generationMode
  };
}
```


### 10. Security Design

#### 10.1 Authentication & Authorization

**Authentication Flow:**
```
1. User logs in via Auth0/Google OAuth
2. Provider returns JWT token
3. Client stores token in localStorage
4. Client includes token in Authorization header
5. API validates token with express-oauth2-jwt-bearer
6. API extracts userId from token
7. API attaches user to request object
```

**Middleware Stack:**
```typescript
// Public routes
app.use('/api/v1/health', healthRouter);

// Protected routes
app.use('/api/v1/courses', 
  authMiddleware,      // Validate JWT
  attachUser,          // Load user from DB
  courseRouter
);
```

**Authorization Checks:**
```typescript
// Verify ownership before operations
async deleteCourse(courseId: string, userId: string) {
  const course = await Course.findOne({ _id: courseId, userId });
  if (!course) throw new Error('Course not found or unauthorized');
  // ... deletion logic
}
```


#### 10.2 Input Validation

**Strategy:** Zod schemas for runtime validation

**Example:**
```typescript
const createCourseSchema = z.object({
  topic: z.string().min(3).max(500),
  mode: z.enum(['standard', 'pro']).optional(),
  userAnswers: z.record(z.string()).optional()
});

// Middleware
app.post('/courses/outline', 
  validate(createCourseSchema),
  courseController.createOutline
);
```

**Sanitization:**
- Strip HTML tags from user input
- Escape special characters in prompts
- Validate URLs before fetching
- Limit file upload sizes

#### 10.3 Rate Limiting

**Strategy:** Redis-based rate limiting per user

**Implementation:**
```typescript
async checkRateLimit(userId: string, action: string) {
  const key = `ratelimit:${userId}:${action}`;
  const count = await redisClient.incr(key);
  
  if (count === 1) {
    await redisClient.expire(key, 3600); // 1 hour window
  }
  
  const limit = RATE_LIMITS[action]; // e.g., 10 courses/hour
  if (count > limit) {
    throw new Error('Rate limit exceeded');
  }
}
```

### 11. Observability Design

#### 11.1 Logging Strategy

**Winston Logger Configuration:**
```typescript
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

**Log Levels:**
- **error:** System failures, exceptions
- **warn:** Degraded performance, fallbacks
- **info:** Key business events (course created, credits deducted)
- **debug:** Detailed execution flow

**Structured Logging:**
```typescript
logger.info('Course generation started', {
  userId,
  topic,
  mode,
  cost,
  jobId
});
```


#### 11.2 AI Tracing with LangSmith

**Integration:**
```typescript
import { wrapOpenAI } from 'langsmith/wrappers';
import { traceable } from 'langsmith/traceable';

const openai = wrapOpenAI(new OpenAI({ apiKey: process.env.OPENAI_API_KEY }));

const generateCourse = traceable(
  async (userId, topic, mode) => {
    // Implementation
  },
  { name: 'Generate Course', run_type: 'chain' }
);
```

**Tracked Metrics:**
- Token usage per request
- Latency per model
- Validation failures
- Self-healing attempts
- Cost per generation

#### 11.3 Health Checks

**Endpoint:**
```typescript
app.get('/api/v1/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      mongodb: await checkMongoDB(),
      redis: await checkRedis(),
      worker: await checkWorker()
    }
  };
  
  const allHealthy = Object.values(health.services).every(s => s === 'ok');
  res.status(allHealthy ? 200 : 503).json(health);
});
```

### 12. Deployment Design

#### 12.1 Docker Architecture

**Multi-Stage Build:**
```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 5000
CMD ["node", "dist/index.js"]
```

**Services:**
- **api:** Express server (port 5000)
- **worker:** Background worker
- **redis:** Cache and queue
- **mongodb:** Database (external - MongoDB Atlas)

#### 12.2 Environment Configuration

**Environment Variables:**
```bash
# Database
MONGODB_URI=mongodb+srv://...
REDIS_URL=redis://...

# Authentication
AUTH0_DOMAIN=...
AUTH0_AUDIENCE=...

# AI Providers
OPENAI_API_KEY=...
GROQ_API_KEY=...
GEMINI_API_KEY=...
DEEPSEEK_API_KEY=...

# External Services
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
CLOUDINARY_URL=...
UNSPLASH_ACCESS_KEY=...
YOUTUBE_API_KEY=...
E2B_API_KEY=...

# Observability
LANGSMITH_API_KEY=...
LOG_LEVEL=info

# Application
NODE_ENV=production
PORT=5000
```

#### 12.3 Scaling Strategy

**Horizontal Scaling:**
- API servers: Stateless, scale to N instances
- Workers: Scale based on queue depth
- Redis: Use Redis Cluster for high availability
- MongoDB: Use replica sets

**Load Balancing:**
- Render handles load balancing automatically
- Socket.io uses Redis adapter for multi-instance support

**Resource Allocation:**
- API: 1 CPU, 2GB RAM per instance
- Worker: 2 CPU, 4GB RAM per instance
- Redis: 1GB RAM
- MongoDB: Atlas M10 (2GB RAM, 10GB storage)

### 13. Error Handling Design

#### 13.1 Error Classification

**Client Errors (4xx):**
- 400 Bad Request: Invalid input
- 401 Unauthorized: Missing/invalid token
- 403 Forbidden: Insufficient credits
- 404 Not Found: Resource doesn't exist
- 429 Too Many Requests: Rate limit exceeded

**Server Errors (5xx):**
- 500 Internal Server Error: Unexpected failure
- 503 Service Unavailable: External API down

#### 13.2 Error Response Format

```typescript
{
  error: {
    code: 'INSUFFICIENT_CREDITS',
    message: 'You need 50 credits to create a course',
    details: {
      required: 50,
      available: 25
    }
  }
}
```

#### 13.3 Retry Strategy

**Exponential Backoff:**
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 14. Performance Optimization

#### 14.1 Database Optimization

**Indexes:**
```typescript
// User
userSchema.index({ auth0Id: 1 }, { unique: true });
userSchema.index({ email: 1 });

// Course
courseSchema.index({ userId: 1, createdAt: -1 });
courseSchema.index({ tags: 1 });

// CacheEntry
cacheEntrySchema.index({ key: 1 }, { unique: true });
cacheEntrySchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90 days
```

**Query Optimization:**
- Use projection to limit fields
- Use lean() for read-only queries
- Populate only necessary fields
- Implement pagination

#### 14.2 API Optimization

**Compression:**
```typescript
app.use(compression());
```

**Response Caching:**
```typescript
app.get('/courses/:id', cacheMiddleware(300), getCourse);
```

**Parallel Execution:**
```typescript
const [course, user] = await Promise.all([
  Course.findById(courseId),
  User.findById(userId)
]);
```

#### 14.3 Frontend Optimization

**Code Splitting:**
```typescript
const CourseEditor = lazy(() => import('./features/course/CourseEditor'));
```

**React Query Caching:**
```typescript
const { data } = useQuery({
  queryKey: ['course', courseId],
  queryFn: () => courseService.getCourse(courseId),
  staleTime: 5 * 60 * 1000 // 5 minutes
});
```

### 15. Testing Strategy

#### 15.1 Unit Tests

**Coverage:** >80% for services and utilities

**Example:**
```typescript
describe('CreditService', () => {
  it('should deduct credits atomically', async () => {
    await creditService.addCredits(userId, 100);
    const result = await creditService.deductCredits(userId, 50);
    expect(result).toBe(true);
    
    const balance = await creditService.getBalance(userId);
    expect(balance).toBe(50);
  });
});
```

#### 15.2 Integration Tests

**Scope:** API endpoints with real database

**Example:**
```typescript
describe('POST /api/v1/courses/outline', () => {
  it('should create course and deduct credits', async () => {
    const response = await request(app)
      .post('/api/v1/courses/outline')
      .set('Authorization', `Bearer ${token}`)
      .send({ topic: 'Python Basics', mode: 'standard' });
    
    expect(response.status).toBe(202);
    expect(response.body).toHaveProperty('jobId');
  });
});
```

#### 15.3 End-to-End Tests

**Scope:** Critical user flows

**Flows:**
1. Sign up → Create course → View course
2. Purchase credits → Create Pro course
3. Regenerate course → View history

### 16. Monitoring & Alerts

#### 16.1 Key Metrics

**Application Metrics:**
- Request rate (req/min)
- Error rate (%)
- Response time (p50, p95, p99)
- Queue depth
- Worker utilization

**Business Metrics:**
- Courses created per day
- Credit consumption rate
- Subscription conversion rate
- Cache hit rate

#### 16.2 Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Error Rate | >2% | >5% |
| Response Time (p95) | >2s | >5s |
| Queue Depth | >100 | >500 |
| Redis Memory | >80% | >95% |
| MongoDB CPU | >70% | >90% |

### 17. Future Enhancements

**Phase 2 (Q2 2026):**
- Multi-language support (Spanish, French)
- Collaborative editing
- Student progress tracking
- Course marketplace

**Phase 3 (Q3 2026):**
- Mobile apps (iOS, Android)
- Live instructor sessions
- Advanced analytics dashboard
- Custom branding for enterprises

**Phase 4 (Q4 2026):**
- SCORM compliance
- Gamification features
- AI-powered tutoring chatbot
- Offline mode

### 18. Conclusion

CourseForge implements a sophisticated event-driven architecture that balances performance, cost, and user experience. Key design decisions include:

1. **Task-based AI routing** for optimal cost/quality tradeoff
2. **Self-healing validation** for reliable structured output
3. **Hybrid caching** for sub-5ms response times
4. **Async processing** for non-blocking user experience
5. **Credit system with drift detection** for financial integrity
6. **Version control** for content iteration
7. **Comprehensive observability** for production reliability

The system is designed to scale horizontally, handle failures gracefully, and provide a delightful user experience while maintaining operational efficiency.
