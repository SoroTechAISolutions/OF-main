# 03 - DEVELOPMENT PHASES

**Last Updated:** November 24, 2025

## Overview

Original plan: 10 weeks
**Target: Complete faster** - aggressive execution

---

## Week 1: Foundation (Nov 24-30)

**Goal:** Prove Chrome Extension can scrape OF messages reliably

### Priority 1: Dev Environment Setup
**Tasks:**
- [ ] Docker Compose configuration
  - PostgreSQL container
  - Redis container
  - Backend API container
  - Nginx reverse proxy
- [ ] Environment variables setup
- [ ] Database migrations (TypeORM)
- [ ] Basic health check endpoints

**Output:**
- `docker-compose up` starts entire stack
- Backend API responds at `http://localhost:3000/health`
- PostgreSQL accepts connections
- Redis accepts connections

---

### Priority 2: Chrome Extension PoC
**Tasks:**
- [ ] Inspect OF DOM structure (manually in DevTools)
- [ ] Document CSS selectors for messages
- [ ] Create basic Extension structure:
  - `manifest.json`
  - `content-script.js`
  - `background.js`
  - `popup/popup.html`
- [ ] Implement message scraper (MutationObserver)
- [ ] Test scraping on OF test account
- [ ] Send scraped data to Backend API

**Success Criteria:**
- ✅ Extension detects new messages in real-time
- ✅ Messages parsed correctly (fan name, text, timestamp)
- ✅ Data sent to Backend without errors
- ✅ No OF account warnings after 24h testing

**Risks:**
- OF DOM structure might be complex/obfuscated
- Rate limiting on API calls
- Extension permissions issues

---

### Priority 3: Backend API Skeleton
**Tasks:**
- [ ] Express server setup with TypeScript
- [ ] Basic routing structure
- [ ] Authentication middleware (JWT)
- [ ] Database models (TypeORM):
  - User
  - Model
  - Fan
  - Message
- [ ] REST endpoints:
  - `POST /api/auth/login`
  - `POST /api/messages` (from Extension)
  - `GET /api/messages` (paginated)

**Output:**
- Backend accepts messages from Extension
- Messages stored in PostgreSQL
- Simple authentication works

---

## Week 2: Backend + n8n Setup (Dec 1-7)

**Goal:** Complete Backend API + n8n workflows foundation

### Backend Tasks
- [ ] Implement all REST endpoints (see 01-ARCHITECTURE.md)
- [ ] Add input validation (Zod or Joi)
- [ ] Rate limiting middleware
- [ ] Error handling
- [ ] Database indexes for performance
- [ ] API documentation (Swagger/OpenAPI)

### n8n Setup Tasks
- [ ] n8n Docker container setup
- [ ] OpenAI credentials configuration
- [ ] Pinecone API key configuration
- [ ] Create webhook endpoint for Chrome Extension
- [ ] Test basic OpenAI node (simple prompt/response)

### Success Criteria
- ✅ All Backend endpoints tested with Postman
- ✅ Authentication flow works
- ✅ Messages CRUD operations complete
- ✅ n8n accessible and OpenAI node working
- ✅ Webhook endpoint responds correctly

---

## Week 3: n8n AI Workflows (Dec 8-14)

**Goal:** AI generates response suggestions via n8n

### n8n Workflow Tasks
- [ ] Build "Process Message" workflow:
  - Webhook trigger
  - Validate message data
  - Call Backend API (store message)
  - Retrieve conversation history
  - Build prompt template
  - OpenAI GPT-4 node
  - Return AI suggestions
- [ ] Build "Get Fan Profile" sub-workflow
- [ ] Build "Store Interaction" sub-workflow
- [ ] Pinecone integration (HTTP nodes for vector search)
- [ ] Pinecone Vector DB setup
- [ ] Prompt engineering:
  - System prompt template
  - Context injection
  - Personality profile integration
- [ ] POST `/api/ai/suggest` endpoint
- [ ] Response generation testing

### Success Criteria
- ✅ AI generates 3-5 response options
- ✅ Responses are contextual (use conversation history)
- ✅ Personality profile affects tone/style
- ✅ Response time < 3 seconds

### Prompt Template (Draft)
```
System: You are a flirty OnlyFans model named {MODEL_NAME}.
Personality: {PERSONALITY_TRAITS}

Conversation History (last 10 messages):
{HISTORY}

Fan Profile:
- Spending Tier: {TIER}
- Tags: {TAGS}
- Total Spent: ${TOTAL_SPENT}

Current Fan Message: "{FAN_MESSAGE}"

Task: Generate 3-5 engaging response options (under 200 chars each).
Match the model's tone. If fan is a whale and context is appropriate, suggest PPV content.
```

---

## Week 4: Frontend Dashboard - Part 1 (Dec 15-21)

**Goal:** Basic React Dashboard with login and inbox

### Tasks
- [ ] React project setup (Vite + TypeScript)
- [ ] Tailwind CSS configuration
- [ ] Authentication flow:
  - Login page
  - JWT storage
  - Protected routes
- [ ] Inbox layout (WhatsApp-style):
  - Left sidebar: Chat list
  - Center: Chat window
  - Right sidebar: Fan CRM panel
- [ ] Basic message display (no WebSocket yet)

### Success Criteria
- ✅ Operator can log in
- ✅ Inbox displays all chats
- ✅ Messages load on chat selection
- ✅ Responsive design (mobile-friendly)

---

## Week 5: Frontend Dashboard - Part 2 (Dec 22-28)

**Goal:** AI suggestions + one-click send

### Tasks
- [ ] AI suggestions component
- [ ] Click message → fetch suggestions (Backend → n8n workflow)
- [ ] Display 3-5 AI options
- [ ] Edit suggestion before sending
- [ ] Send message flow:
  - Dashboard → Backend → Extension
- [ ] Message status tracking (sent, delivered, read)

### Success Criteria
- ✅ AI suggestions appear instantly (<3s)
- ✅ Operator can edit before sending
- ✅ One-click send works
- ✅ Message appears in chat window

---

## Week 6: Real-Time Features (Dec 29 - Jan 4)

**Goal:** WebSocket for live updates

### Tasks
- [ ] Socket.io server setup (Backend)
- [ ] Socket.io client (Dashboard)
- [ ] Real-time message delivery:
  - New messages push to Dashboard
  - Typing indicators (future)
  - Read receipts
- [ ] Desktop notifications
- [ ] Optimistic UI updates

### Success Criteria
- ✅ New messages appear instantly (no page refresh)
- ✅ Multiple operators can work simultaneously
- ✅ No duplicate messages
- ✅ Reconnection handling works

---

## Week 7: Chrome Extension - Write Mode (Jan 5-11)

**Goal:** Extension sends messages back to OF

**⚠️ HIGH RISK PHASE - Account bans possible**

### Tasks
- [ ] Implement message injection (see 04-CHROME-EXTENSION.md)
- [ ] Human-like typing simulation
- [ ] Random delays and mouse movements
- [ ] Rate limiting (max 1 message per 5 seconds)
- [ ] Delivery confirmation
- [ ] Error handling and retries

### Testing Strategy
- Test on throwaway OF accounts first
- Start with 10 messages/day limit
- Monitor for warnings/bans
- Gradually increase volume

### Fallback Plan
If injection is too risky → pivot to **Manual Bridge**:
- Extension scrapes (read-only) ✅
- Backend generates suggestions ✅
- Operator copies suggestion
- **Operator manually pastes into OF** ← Manual step
- Still provides value (AI + CRM + Analytics)

---

## Week 8: CRM & Fan Management (Jan 12-18)

**Goal:** Fan profiles, tags, notes, spending tiers

### Tasks
- [ ] Fan detail page:
  - Conversation history
  - Spending stats
  - Custom tags
  - Operator notes
- [ ] Fan segmentation:
  - Whale / Regular / Low spender
  - Auto-tagging based on spending
- [ ] Quick actions:
  - Send PPV offer
  - Schedule follow-up
  - Mark VIP
- [ ] Search and filters

### Success Criteria
- ✅ Operator can view full fan history
- ✅ Tags and notes persist
- ✅ Spending tier auto-updates
- ✅ Filters work (whales, unread, etc.)

---

## Week 9: Analytics & Optimization (Jan 19-25)

**Goal:** Revenue tracking, operator performance

### Tasks
- [ ] Analytics dashboard:
  - Revenue by model (tips, PPV, subscriptions)
  - Messages sent per day
  - Response time averages
  - Conversion rates (message → sale)
- [ ] Operator performance metrics:
  - Messages handled
  - Revenue generated
  - Average response time
- [ ] Charts and visualizations (Chart.js or Recharts)
- [ ] Export reports (CSV/PDF)

### Success Criteria
- ✅ Allen can see revenue per model
- ✅ Operator performance is measurable
- ✅ Data updates in real-time
- ✅ Reports exportable

---

## Week 10: Polish & Testing (Jan 26 - Feb 1)

**Goal:** Production-ready MVP

### Tasks
- [ ] Bug fixes from testing
- [ ] UI/UX improvements:
  - Loading states
  - Error messages
  - Tooltips
  - Keyboard shortcuts
- [ ] Performance optimization:
  - Database query optimization
  - API response caching
  - Frontend bundle size reduction
- [ ] Security audit:
  - SQL injection prevention
  - XSS protection
  - Rate limiting tuning
  - HTTPS enforcement
- [ ] Documentation:
  - Operator manual
  - Admin setup guide
  - API documentation
  - Troubleshooting guide
- [ ] Deployment to Allen's server:
  - Migrate Docker images (backend, n8n, postgres, redis)
  - Export n8n workflows (JSON backup)
  - Export PostgreSQL data
  - Update DNS
  - Update Extension API endpoint

### Success Criteria
- ✅ No critical bugs
- ✅ All features tested end-to-end
- ✅ Deployed to production server
- ✅ Allen and team trained on usage

---

## Post-MVP: Scaling & Enhancements

**After MVP is complete:**

### Phase 2: Multi-Model Support
- Multiple OF models per operator
- Model-specific personality profiles
- Model switching in Dashboard

### Phase 3: Advanced AI
- Learning from operator edits (via n8n workflows)
- Auto-improve personality profiles
- Sentiment analysis
- PPV recommendation engine
- Migrate from n8n to pure code if needed (LangChain/LangGraph)

### Phase 4: Operator Management
- Admin panel for Allen
- Operator permissions
- Performance leaderboard
- Shift scheduling

### Phase 5: Scaling Infrastructure
- PostgreSQL read replicas
- Redis Pub/Sub for WebSocket scaling
- CDN for static assets
- Load balancing

---

## Risk Management

### Critical Risks
1. **Chrome Extension banned by OF** → Fallback: Manual Bridge
2. **OpenAI rate limits** → Fallback: Queue + retry logic
3. **PostgreSQL performance** → Solution: Indexing + query optimization
4. **WebSocket scaling** → Solution: Redis Pub/Sub

### Mitigation Strategy
- Test risky features (Extension write mode) on throwaway accounts first
- Build modular architecture (easy to swap components)
- Have fallback plans for critical features
- Monitor performance and errors continuously

---

## Success Metrics

**MVP is successful if:**
- ✅ Chrome Extension reliably scrapes OF messages (no bans)
- ✅ AI generates useful, contextual responses (>80% acceptance rate)
- ✅ Dashboard is intuitive and fast (<2s load time)
- ✅ Operator can handle 3-5x more fans than manual
- ✅ Revenue tracking is accurate
- ✅ System is stable (99% uptime)

---

**Status:** Week 1 in progress
**Next Milestone:** Chrome Extension PoC working by Nov 27, 2025
