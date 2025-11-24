# 02 - TECHNOLOGY STACK

**Last Updated:** November 24, 2025

## Technology Choices & Rationale

### Frontend (Operator Dashboard)

**Framework: React 18 + TypeScript**
- ✅ Fast development with component reusability
- ✅ Strong typing with TypeScript (fewer bugs)
- ✅ Huge ecosystem and community
- ✅ Easy to find developers if needed

**Styling: Tailwind CSS**
- ✅ Rapid UI development
- ✅ Consistent design system
- ✅ Small bundle size (purges unused CSS)

**State Management: Zustand**
- ✅ Lighter than Redux (minimal boilerplate)
- ✅ Great TypeScript support
- ✅ Simple API for small-medium apps

**Data Fetching: React Query**
- ✅ Automatic caching and refetching
- ✅ Loading/error states built-in
- ✅ Optimistic updates

**Real-time: Socket.io-client**
- ✅ WebSocket with fallback to polling
- ✅ Auto-reconnection
- ✅ Room-based messaging

---

### Backend - Hybrid Approach (n8n + Node.js)

**WHY HYBRID:**
For MVP, we use n8n for AI orchestration (fast prototyping) + Node.js for data/WebSocket (stable, versioned).

#### n8n (AI Orchestration Layer)

**Version: n8n latest (self-hosted)**
- ✅ Visual workflow builder (rapid development)
- ✅ Built-in OpenAI integration (GPT-4 Turbo node)
- ✅ Webhook triggers (easy Chrome Extension integration)
- ✅ No code deployment needed (change workflows on-the-fly)
- ✅ Ivan is familiar with n8n (faster MVP delivery)
- ✅ Perfect for prototyping AI pipelines
- ❌ Harder to version control (workflows in UI, not Git)
- ❌ Limited for complex business logic

**Use cases in our platform:**
- AI message processing workflow
- OpenAI GPT-4 API calls
- Pinecone vector search
- Personality profile sync (scheduled workflows)
- Webhook endpoints from Chrome Extension

#### Backend API (Node.js/Express/TypeScript)

**Runtime: Node.js 20 LTS**
- ✅ Fast, non-blocking I/O
- ✅ Same language as frontend (full-stack TypeScript)
- ✅ Excellent package ecosystem

**Framework: Express 4.x**
- ✅ Mature, battle-tested
- ✅ Minimal, flexible
- ✅ Large middleware ecosystem

**Language: TypeScript 5.x**
- ✅ Type safety reduces runtime errors
- ✅ Better IDE support and refactoring
- ✅ Compiles to JavaScript (no runtime overhead)

**ORM: TypeORM**
- ✅ TypeScript-first ORM
- ✅ Supports PostgreSQL fully
- ✅ Active Record and Data Mapper patterns
- ✅ Migration system

**Real-time: Socket.io**
- ✅ Bidirectional communication
- ✅ Room-based messaging (one room per operator)
- ✅ Built-in heartbeat/reconnection

**Use cases in our platform:**
- REST API endpoints (CRUD operations)
- JWT authentication
- WebSocket server (real-time updates to Dashboard)
- Database ORM (TypeORM)
- Rate limiting
- Session management

**Division of Responsibilities:**
```
n8n:
- AI workflows (OpenAI calls)
- Message processing pipeline
- Webhook endpoints (from Extension)
- Scheduled tasks (personality sync)

Node.js Backend:
- REST API (CRUD)
- WebSocket (real-time)
- Authentication (JWT)
- Database management (TypeORM)
- Rate limiting
```

---

### Database

**Primary: PostgreSQL 16**
- ✅ Robust, ACID-compliant
- ✅ JSONB support (flexible for personality profiles, tags)
- ✅ Full-text search capabilities
- ✅ Excellent performance at scale
- ✅ Free and open-source

**Schema:**
- Users (operators)
- Models (OF creators)
- Fans (OF subscribers)
- Messages (conversation history)
- Analytics (aggregated revenue/performance)

---

### Caching & Sessions

**Redis 7.x**
- ✅ In-memory data store (extremely fast)
- ✅ Session management (JWT tokens)
- ✅ Rate limiting
- ✅ Message queue (Bull or BullMQ)
- ✅ Pub/Sub for WebSocket scaling (if needed later)

---

### AI & Machine Learning (via n8n)

**LLM: OpenAI GPT-4 Turbo**
- ✅ Best quality/price ratio ($0.01 input / $0.03 output per 1M tokens)
- ✅ Fast response time (~1-2 seconds)
- ✅ 128k context window (plenty for conversation history)
- ✅ Instruction-following is excellent
- ✅ **Accessed via n8n OpenAI node** (easy integration)
- ❌ Alternative: Claude 3.5 Sonnet (backup if GPT-4 has issues)

**Orchestration: n8n Workflows (replaces LangChain for MVP)**
- ✅ Visual workflow builder (faster than coding)
- ✅ Built-in OpenAI node (no SDK needed)
- ✅ Prompt templates in workflow (easy to modify)
- ✅ Conversation memory via Backend API calls
- ✅ Can migrate to LangChain later if needed

**Vector DB: Pinecone**
- ✅ Managed vector database (no maintenance)
- ✅ Fast semantic search
- ✅ Good free tier (1M vectors)
- ✅ **Accessed via n8n HTTP Request nodes** (Pinecone REST API)
- Alternative: Weaviate or ChromaDB (self-hosted if cost becomes issue)

**Embeddings: OpenAI text-embedding-3-small**
- ✅ $0.02 per 1M tokens (very cheap)
- ✅ Fast embedding generation
- ✅ 1536 dimensions (good for semantic search)
- ✅ **Accessed via n8n OpenAI node** (embeddings endpoint)

**Why n8n for AI (instead of pure code):**
- ✅ Faster MVP delivery (visual workflows)
- ✅ Ivan familiar with n8n (no learning curve)
- ✅ Easy to test/modify prompts without redeployment
- ✅ Built-in integrations (OpenAI, webhooks, HTTP)
- ❌ Con: Workflows not in Git (but can export JSON)
- ❌ Con: Limited for complex logic (but MVP doesn't need it)

---

### Chrome Extension

**Language: Vanilla JavaScript (ES6+)**
- ✅ Lightweight (no build step needed)
- ✅ Fast loading time
- ✅ Direct DOM access

**Manifest: V3**
- ✅ Latest Chrome Extension standard
- ✅ Better security (service workers instead of background pages)
- ❌ More restrictive (but we don't need dynamic code execution)

**Key Libraries:**
- None! Keep it minimal to avoid bloat
- Use native Fetch API for Backend calls
- Use MutationObserver for DOM watching

---

### DevOps & Infrastructure

**Containerization: Docker + Docker Compose**
- ✅ Consistent dev/prod environments
- ✅ Easy migration to Allen's server (just move docker-compose.yml)
- ✅ Isolated services (n8n, backend, db, redis in separate containers)

**Services in Docker Compose:**
```yaml
services:
  n8n:           # AI orchestration workflows
  backend:       # Node.js API + WebSocket
  postgres:      # Database
  redis:         # Cache + sessions
  nginx:         # Reverse proxy
```

**Reverse Proxy: Nginx**
- ✅ Handles HTTPS termination
- ✅ Static file serving (React build)
- ✅ Load balancing (if needed later)

**Version Control: Git + GitHub**
- ✅ Private repo: `SoroTechAISolutions/OF-main`
- ✅ Branch strategy: `main` (prod), `develop` (staging), feature branches

**CI/CD:**
- Manual deployment for MVP (SSH + docker-compose pull/up)
- GitHub Actions for automated testing (later)

---

### Development Tools

**Package Manager: npm**
- ✅ Default for Node.js
- ✅ Fast with lockfiles

**Linting: ESLint + Prettier**
- ✅ Code quality enforcement
- ✅ Auto-formatting

**Testing (Future):**
- Jest (unit tests)
- Playwright (E2E tests for Extension)

---

## Third-Party Services

**Required:**
- OpenAI API (GPT-4 Turbo + Embeddings)
- Pinecone (Vector DB)

**Optional (Future):**
- Sentry (error tracking)
- LogRocket (session replay for debugging)
- Mixpanel (analytics)

---

## Cost Estimates (Monthly)

### AI Costs
**Assumptions:**
- 10 models
- 100 fans per model = 1,000 fans total
- 10 messages/fan/day = 10,000 messages/day
- Each AI call: 500 tokens input + 150 tokens output

**GPT-4 Turbo:**
- Input: 10,000 * 500 / 1M * $0.01 = $0.05/day = $1.50/month
- Output: 10,000 * 150 / 1M * $0.03 = $0.045/day = $1.35/month
- **Total: ~$3/month** (very cheap!)

**Embeddings:**
- 10,000 messages * 100 tokens / 1M * $0.02 = $0.02/day = $0.60/month

**Pinecone:**
- Free tier: 1M vectors (enough for MVP)
- Paid: $70/month for 10M vectors (if scale beyond MVP)

**Total AI Cost: ~$5-10/month for MVP**

### Infrastructure
- Docker hosting: $0 (Ivan's existing server)
- PostgreSQL: $0 (self-hosted)
- Redis: $0 (self-hosted)
- Domain/SSL: $0 (existing)

**Total Infrastructure Cost: $0 for MVP**

---

## Scalability Considerations

**Current Architecture:** Supports up to ~100 concurrent operators

**Bottlenecks (if scaling to 1000+ operators):**
1. PostgreSQL (single instance)
   - Solution: Read replicas + connection pooling
2. WebSocket server (single instance)
   - Solution: Redis Pub/Sub + multiple backend instances
3. OpenAI rate limits (10,000 requests/min)
   - Solution: Request batching + caching

**For MVP:** Current architecture is more than sufficient.

---

## Security Stack

**Authentication:**
- JWT tokens (HS256 algorithm)
- Bcrypt password hashing (10 rounds)
- Refresh token rotation

**API Security:**
- Helmet.js (security headers)
- CORS whitelist
- Rate limiting (express-rate-limit)
- Input validation (Joi or Zod)

**Database:**
- Parameterized queries (TypeORM prevents SQL injection)
- Encrypted backups
- No plaintext passwords

**Chrome Extension:**
- Content Security Policy (CSP)
- Minimal permissions (activeTab, storage only)
- No eval() or remote code execution

---

## Development Environment Setup

**Prerequisites:**
- Node.js 20+
- Docker + Docker Compose
- Git
- Chrome browser (for Extension testing)

**One-Command Setup:**
```bash
git clone git@github.com:SoroTechAISolutions/OF-main.git
cd OF-main
cp .env.example .env
docker-compose up -d
npm install
npm run dev
```

**Environment Variables:**
```env
# Backend
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/of_platform
REDIS_URL=redis://localhost:6379
JWT_SECRET=<random-secret>

# OpenAI
OPENAI_API_KEY=<key>
OPENAI_MODEL=gpt-4-turbo-preview

# Pinecone
PINECONE_API_KEY=<key>
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX=of-conversations

# Frontend
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:3000
```

---

**Next:** See `03-DEVELOPMENT-PHASES.md` for week-by-week breakdown.
