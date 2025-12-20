# CURRENT TASKS

**Last Updated:** December 16, 2025
**Current Phase:** Week 3 - Dashboard + Fanvue Integration (Dec 8-21)

---

## ⚠️ IMPORTANT DOCUMENTS (Always Check)

| Document | Purpose | Status |
|----------|---------|--------|
| [VARIABLES-TODO.md](./docs/VARIABLES-TODO.md) | Secrets & variables to update before production | 🔴 Review before deploy |
| [DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Migration instructions to Allen's server | 📖 Reference |
| [Market Research](./docs/MARKET-RESEARCH-SUMMARY.md) | 5 research reports summary | ✅ Completed Nov 27 |
| [Fanvue API Research](./docs/fanvue-api-research.md) | Fanvue API docs, endpoints, OAuth | ✅ Added Dec 16 |
| [.env.fanvue](../.env.fanvue) | Fanvue OAuth credentials | 🔐 Secrets |

**NEVER DELETE THIS SECTION** - These documents must be reviewed before any production deployment.

---

## 🔬 Market Research Insights (November 27, 2025)

### Key Findings from 5 Research Reports:

**What Was Validated:**
- ✅ Chrome Extension MV3 + Backend + AI = correct architecture
- ✅ Agency-first GTM (LTV 5-10x higher, churn 3x lower)
- ✅ Human-in-the-loop is safe harbor (AI suggests, human sends = ZERO bans documented)
- ✅ Per-account pricing ($49-199/mo, no take-rate)

**What Changed Radically:**
- 🔄 Ban risk is WAY lower than ToS suggests — enforcement essentially absent
- 🔄 Supercreator extension removed Aug 27, 2025 — window to capture users
- 🔄 Pure web SaaS impossible — even Infloww is a desktop app
- 🔄 ChatPersona survival pattern — dual messaging (neutral in Store, explicit on website)

**Strategic Adjustments:**
1. **Naming Strategy:** "Muse AI Chat Assistant" (Chrome Store) vs "OnlyFans AI Chat" (website)
2. **Distribution:** Direct download + sideloading guide ready from Day 1
3. **Electron Desktop:** Required for v2 (Month 6), not optional
4. **Supercreator Transition:** Immediate opportunity to target their displaced users

---

## ✅ Completed Tasks

### Priority 1: Development Environment Setup ✅
**Status:** COMPLETED
**Completed:** November 25, 2025

**Architecture:** MONOREPO + Shared Infrastructure

**What Was Done:**
- [x] Monorepo structure (`/root/OF/`)
- [x] Database `of_agency_db` created in shared PostgreSQL
- [x] Cleaned disk space (freed 29GB)
- [x] Fixed PostgreSQL collation warnings
- [x] Created `docker-compose.dev.yml`
- [x] Created Backend (Express + TypeScript)
- [x] Created `.env.example`
- [x] Documented migration strategy (`docs/DEPLOYMENT.md`)
- [x] All services running and connected

**Running Services:**
```bash
docker ps
# of-backend   → localhost:3000
# of-redis     → localhost:6379
# postgres     → localhost:5432 (of_agency_db)
# n8n          → localhost:5678
```

**Health Check:**
```bash
curl http://localhost:3000/health
# {"status":"ok","services":{"api":"ok","database":"ok","redis":"ok"}}
```

---

### Priority 2: OnlyFans DOM Research ✅
**Status:** COMPLETED
**Completed:** November 26, 2025

**What Was Done:**
- [x] Setup VNC environment for live browser research
- [x] Created shared browser session (VNC + API sync)
- [x] Logged into real OnlyFans account
- [x] Researched chat page DOM structure
- [x] Documented all key selectors for Chrome Extension
- [x] Created technical documentation (`docs/onlyfans-dom-research.md`)
- [x] Discovered `m-from-me` class for message direction detection

**Key Findings:**
| Component | Technology |
|-----------|-----------|
| Frontend | Vue.js |
| Text Editor | TipTap (ProseMirror) |
| Slider | Swiper.js |
| CSS | BEM methodology |

**Critical Selectors for Extension:**
```javascript
// Message input
'[contenteditable].tiptap.ProseMirror'

// Send button
'.b-chat__btn-submit'

// Chat messages
'.b-chat__item-message'

// Outgoing messages (from creator)
'.b-chat__message.m-from-me'

// Incoming messages (from fans - need AI response)
'.b-chat__message:not(.m-from-me)'

// Chat list items
'a.b-chats__item__link'

// PPV content
'.m-purchase.m-not-paid-yet'
```

**Documentation:** `/root/OF/docs/onlyfans-dom-research.md`

---

### Priority 3: Market Research ✅
**Status:** COMPLETED
**Completed:** November 27, 2025

**What Was Done:**
- [x] Research 1: Competitive Analysis ($500M-$1.2B market, no dominant player)
- [x] Research 2: Unit Economics & Strategy (ConvertKit playbook, agency-first)
- [x] Research 3: Technical Architecture (Chrome Store removal patterns, ChatPersona survival)
- [x] Research 4: Detection & Legal (ZERO bans documented, human-in-the-loop safe)
- [x] Research 5: Tactical Market Entry (Supercreator removed, Infloww is desktop app)

**Final Verdict:** CONTINUE MVP AS PLANNED with adjustments

**Documentation:** Notion → Market research folder (5 reports + summary)

---

## ✅ Completed Tasks (Week 1)

### Priority 4: Chrome Extension Proof of Concept ✅
**Status:** COMPLETED
**Completed:** November 28, 2025

**What Was Done:**
- [x] Research OnlyFans web interface structure
- [x] Document DOM selectors and structure
- [x] Market research validation
- [x] Create Chrome Extension manifest (Manifest V3)
- [x] Build content script that scrapes OF messages
- [x] Implement message detection with selectors
- [x] Detect incoming vs outgoing messages (`m-from-me` class)
- [x] Test on real OF account via VNC
- [x] Extension successfully reads messages and logs them

**Deliverable:** ✅ Extension "Muse In Motion" working, reads OF messages

---

### Priority 5: Backend API Skeleton ✅
**Status:** COMPLETED
**Completed:** November 28, 2025

**What Was Done:**
- [x] Setup Express + TypeScript project
- [x] Configure PostgreSQL connection
- [x] Setup Redis for session management
- [x] Basic project structure ready

---

## 🔥 Active Tasks (Week 2 - Dec 1-7)

### Priority 6: n8n AI Chat Workflow ✅
**Status:** COMPLETED
**Completed:** December 1, 2025

**What Was Done:**
- [x] Created n8n workflow "Muse AI Chat Responder"
- [x] Webhook endpoint: `https://n8n.sorotech.ru/webhook/muse-chat`
- [x] AI Agent with OpenAI GPT-4o-mini configured
- [x] System prompt for flirty creator persona
- [x] Fixed CORS for chrome-extension origin
- [x] Tested: Extension → n8n → AI Response working!

**Test Result:**
```json
{"output":"Hey there, gorgeous! What are you up to today? 😘✨"}
```

---

### Priority 7: Chrome Extension - Insert AI Response ✅
**Status:** COMPLETED
**Completed:** December 1, 2025

**Goal:** AI response auto-inserts into OF chat input field

**What Was Done:**
- [x] Get AI response from n8n webhook
- [x] Insert text into TipTap editor (`[contenteditable].tiptap.ProseMirror`)
- [x] Handle ProseMirror state update
- [x] User can review and click Send
- [x] Tested on real OF chats (Eli, Kattedoll)

**Result:** Full E2E flow working! Fan sends message → Extension detects → n8n AI generates response → Response inserted into chat input → Creator reviews and sends

---

### Priority 8: Database Schema Design ✅
**Status:** COMPLETED
**Completed:** December 2, 2025

**What Was Done:**
- [x] Designed 7 PostgreSQL tables with relationships
- [x] Created migration script (`/backend/migrations/001_initial_schema.sql`)
- [x] Applied migration to `of_agency_db`
- [x] Added UUID primary keys, indexes, triggers

**Tables Created:**
| Table | Purpose |
|-------|---------|
| `agencies` | Top-level organization (owns models) |
| `users` | System users (owner, admin, chatter) |
| `models` | OnlyFans creator accounts |
| `chats` | Fan conversations |
| `messages` | Message history |
| `ai_responses` | AI generation logs for analytics |
| `sessions` | JWT auth sessions |

---

### Priority 8.5: Database Schema Research & Optimization ✅
**Status:** COMPLETED
**Completed:** December 2, 2025

**Goal:** Research how others built OF/creator platform databases, optimize our schema

**What Was Done:**
- [x] Research competitor database schemas
- [x] Analyzed OF-Scraper SQLite schema (актуален Oct 2025)
- [x] Analyzed onlyfClient frontend entities (Dec 2023)
- [x] Cloned and documented 8 GitHub repositories
- [x] Created migration `002_schema_optimization.sql`
- [x] Applied migration to `of_agency_db`

**New Tables Added:**
| Table | Purpose |
|-------|---------|
| `fan_stats` | Fan spending & engagement analytics |
| `media_attachments` | Media references in messages |

**Fields Added to Existing Tables:**
- `messages`: `unlocked`, `read_at`
- `chats`: `fan_avatar_url`, `subscription_active`, `first_message_at`
- `models`: `of_user_id`, `header_url`, `subscription_price`, `is_verified`, `last_seen_at`

**Documentation:**
- `/root/OF/research/DATABASE-RESEARCH.md`
- `/root/OF/research/GITHUB-PROJECTS-ANALYSIS.md` (updated)

---

### Priority 9: Complete Backend REST API ✅
**Status:** COMPLETED
**Completed:** December 3, 2025

**What Was Done:**
- [x] JWT authentication (login, register, refresh)
- [x] Models CRUD endpoints (create, read, update, delete)
- [x] Chats/Messages endpoints
- [x] AI generation & logging endpoint
- [x] All endpoints tested successfully

**Files Created:**
| File | Purpose |
|------|---------|
| `src/types/index.ts` | TypeScript interfaces |
| `src/middleware/auth.ts` | JWT authentication |
| `src/services/authService.ts` | Auth business logic |
| `src/services/modelService.ts` | Models CRUD |
| `src/services/chatService.ts` | Chats & Messages |
| `src/services/aiService.ts` | AI generation & logging |
| `src/routes/auth.ts` | Auth endpoints |
| `src/routes/models.ts` | Models endpoints |
| `src/routes/chats.ts` | Chats & Messages endpoints |
| `src/routes/ai.ts` | AI endpoints |

**API Endpoints:**
```
Auth:
  POST /api/auth/register    - Register user + agency
  POST /api/auth/login       - Login
  POST /api/auth/refresh     - Refresh tokens
  GET  /api/auth/me          - Current user

Models:
  GET  /api/models           - List models
  GET  /api/models/:id       - Get model
  GET  /api/models/:id/stats - Model stats
  POST /api/models           - Create model
  PUT  /api/models/:id       - Update model
  DEL  /api/models/:id       - Delete model

Chats:
  GET  /api/chats/model/:id  - Chats by model
  GET  /api/chats/:id        - Get chat
  POST /api/chats            - Create chat
  PUT  /api/chats/:id        - Update chat
  GET  /api/chats/:id/messages     - Get messages
  POST /api/chats/:id/messages     - Create message
  PUT  /api/chats/:id/messages/:id/read   - Mark read
  PUT  /api/chats/:id/messages/:id/unlock - PPV unlock

AI:
  POST /api/ai/generate      - Generate AI response
  POST /api/ai/log           - Log AI response
  PUT  /api/ai/:id/sent      - Mark as used
  GET  /api/ai/model/:id/responses - AI history
  GET  /api/ai/model/:id/analytics - AI stats
```

**Test Results:**
- ✅ Registration creates agency + user
- ✅ Login returns JWT tokens
- ✅ Protected routes require authentication
- ✅ Models CRUD works
- ✅ Chats/Messages CRUD works
- ✅ AI generate works (fixed webhook field name)

---

### Priority 9.5: Users CRUD (Team Management) ✅
**Status:** COMPLETED
**Completed:** December 3, 2025

**What Was Done:**
- [x] Users service with CRUD operations
- [x] Users routes with role-based access control
- [x] Password change endpoint
- [x] Owner can manage all users
- [x] Admin can only manage chatters
- [x] All endpoints tested

**Files Created:**
| File | Purpose |
|------|---------|
| `src/services/userService.ts` | Users CRUD logic |
| `src/routes/users.ts` | Users endpoints |

**API Endpoints:**
```
Users (requires owner/admin role):
  GET  /api/users            - List team members
  GET  /api/users/:id        - Get user
  POST /api/users            - Create user (owner only)
  PUT  /api/users/:id        - Update user
  PUT  /api/users/:id/password - Change password (owner only)
  DEL  /api/users/:id        - Delete user (owner only)
```

**Role Permissions:**
| Action | Owner | Admin | Chatter |
|--------|-------|-------|---------|
| List users | ✅ | ✅ | ❌ |
| Create user | ✅ | ❌ | ❌ |
| Update user | ✅ | Only chatters | ❌ |
| Delete user | ✅ | ❌ | ❌ |
| Change password | ✅ | ❌ | ❌ |

---

### Priority 10: Extension ↔ Backend Integration ✅
**Status:** COMPLETED
**Completed:** December 4, 2025

**Goal:** Extension calls Backend API instead of direct n8n, with logging

**What Was Done:**
- [x] Created `/api/extension/*` endpoints with API key auth
- [x] Created `extension_logs` table for usage tracking
- [x] Added nginx proxy `/of-api/` → localhost:3000
- [x] Updated `background.js` to use Backend API with n8n fallback
- [x] All requests now logged to database for analytics

**Files Created:**
| File | Purpose |
|------|---------|
| `src/routes/extension.ts` | Extension API endpoints |
| `migrations/003_extension_logs.sql` | Logging table |

**API Endpoints:**
```
Extension API (X-Extension-Key header):
  POST /api/extension/generate   - Generate AI response
  POST /api/extension/feedback   - Submit feedback
  GET  /api/extension/status     - API status check
  GET  /api/extension/stats      - Usage statistics
```

**External URL:** `https://sorotech.ru/of-api/extension/*`

---

### Priority 11: Allen's Playground ✅
**Status:** COMPLETED
**Completed:** December 4, 2025

**Goal:** Create download page and installation guide for Allen to test

**What Was Done:**
- [x] Created playground page with download link
- [x] Created installation guide (step-by-step)
- [x] Packaged extension as ZIP
- [x] Updated manifest to v1.0.0

**Deliverables:**
| Item | URL/Location |
|------|--------------|
| Playground Page | https://sorotech.ru/of-playground/index.html |
| Extension ZIP | Direct download from playground |
| Install Guide | `/chrome-extension/INSTALLATION-GUIDE.md` |

---

### Priority 12: AI Services Configuration
**Status:** 📥 Backlog (Can wait for Week 3)

**Tasks:**
- [ ] Configure OpenAI API key in production
- [ ] Setup Pinecone for vector memory
- [ ] Test prompt templates

---

## 🚀 FANVUE INTEGRATION (Added December 16, 2025)

### Priority 13: Fanvue API Integration ⚡ NEW
**Status:** 🔥 IN PROGRESS
**Started:** December 16, 2025
**Estimated:** 1.5 days (8-12 hours)

**Why Now:**
- Allen wants Fanvue in MVP (Fanvue is growing fast)
- Fanvue has official API (OAuth 2.0) — no scraping needed!
- Multi-platform = stronger value prop vs competitors
- Credentials already obtained ✅

**Key Discovery:** Fanvue has built-in AI chat features, BUT:
- Their AI is for solo creators, not agencies
- We provide: multi-platform dashboard, team management, cross-platform CRM
- Our value: "Agency Command Center" not "another chatbot"

**Credentials Obtained:**
```
Client ID: b6f59ca2-dafe-4a94-9908-5cfa0c356e01
Client Secret: *** (see /root/OF/.env.fanvue)
Redirect URI: https://sorotech.ru/of-api/oauth/fanvue/callback
```

**Documentation:**
- API Research: `/root/OF/docs/fanvue-api-research.md`
- Credentials: `/root/OF/.env.fanvue`
- Developer Portal: https://fanvue.com/developers/apps

**Tasks:**
- [x] Research Fanvue API documentation
- [x] Get OAuth credentials from Developer Portal
- [x] Document API endpoints and webhooks
- [ ] Create OAuth flow in Backend (`/api/oauth/fanvue/*`)
- [ ] Create Fanvue API service (`fanvueService.ts`)
- [ ] Setup webhook endpoints (`/webhooks/fanvue/*`)
- [ ] Create database migration for multi-platform
- [ ] Configure webhooks in Fanvue Developer Portal
- [ ] Test with real Fanvue creator account
- [ ] Connect to n8n AI workflow

**Files to Create:**
| File | Purpose |
|------|---------|
| `src/services/fanvueService.ts` | Fanvue API client |
| `src/services/fanvueOAuthService.ts` | OAuth + PKCE flow |
| `src/routes/fanvue.ts` | Fanvue proxy endpoints |
| `src/routes/fanvueWebhooks.ts` | Webhook handlers |
| `migrations/004_fanvue_integration.sql` | DB schema updates |

**API Endpoints to Add:**
```
OAuth:
  GET  /api/oauth/fanvue/authorize    - Start OAuth
  GET  /api/oauth/fanvue/callback     - OAuth callback

Fanvue Proxy:
  GET  /api/fanvue/chats              - List chats
  GET  /api/fanvue/chats/:uuid/messages - Messages
  POST /api/fanvue/chats/:uuid/message  - Send message

Webhooks:
  POST /webhooks/fanvue/message       - New message
  POST /webhooks/fanvue/subscriber    - New subscriber
  POST /webhooks/fanvue/tip           - Tip received
```

---

## 📋 New Tasks from Research (Add to Roadmap)

### Week 1-2: Distribution Preparation
- [ ] Create dual-messaging naming strategy document
- [ ] Build landing page with explicit OF targeting
- [ ] Prepare sideloading installation guide + video
- [ ] Create direct download page

### Week 3-4: Chrome Store Strategy
- [ ] Submit to Chrome Web Store with neutral name ("Muse AI Chat Assistant")
- [ ] Prepare direct download fallback in parallel
- [ ] Start outreach to Supercreator users (Twitter, Reddit, Telegram)

### Month 2-3: Beta Launch
- [ ] Beta with 5-10 agency partners
- [ ] Validate pricing through real sales
- [ ] Collect feedback on UX and pain points

### Month 4-6: Public Launch + Desktop
- [ ] Public launch
- [ ] Begin Electron desktop development (REQUIRED, not optional)
- [ ] Evaluate chatter-focused product line
- [ ] Consider anti-detect browser partnership (Multilogin, GoLogin)

---

## 📦 Migration Strategy (to Allen's Server)

When migrating to Allen's server:

1. **Export Database:**
   ```bash
   docker exec postgres pg_dump -U learnmate of_agency_db > of_agency_backup.sql
   ```

2. **Export n8n Workflows:**
   - Export workflows prefixed with "OF_" to `/root/OF/n8n-workflows/*.json`

3. **Deploy:**
   - Use `docker-compose.production.yml` (standalone stack)
   - Import database + workflows
   - Update `.env` with production values

**Estimated Time:** 1-2 hours

---

## 🎯 Weekly Goals

### Week 1 Goal (Nov 24-30) ✅ COMPLETED
**Objective:** Prove that Chrome Extension can reliably scrape OF messages

**Success Criteria:**
- ✅ Dev environment runs on Ivan's server
- ✅ Market research complete and validated
- ✅ Extension reads messages from real OF account
- ✅ Zero detection/blocking from OF

---

### Week 2 Goal (Dec 1-7) ✅ COMPLETED
**Objective:** AI generates responses and inserts them into OF chat

**Success Criteria:**
- ✅ n8n AI workflow receives messages and returns AI response
- ✅ Extension inserts AI response into chat input
- ✅ Database schema designed (9 tables)
- ✅ Backend REST API endpoints ready (30+ endpoints)
- ✅ Users CRUD with role-based access control
- ✅ End-to-end flow: Fan message → AI suggestion → Creator reviews → Send

**Progress:**
- Dec 1: E2E flow working (extension → n8n → AI)
- Dec 2: Database schema + research
- Dec 3: Backend REST API complete (auth, users, models, chats, messages, AI)
- Dec 4: Extension ↔ Backend integration + Allen's Playground ready

---

### Week 3 Goal (Dec 8-21) 🔥 IN PROGRESS
**Objective:** Admin Dashboard + Fanvue Integration

**Success Criteria:**
- [ ] React Dashboard with basic UI
- [ ] Fanvue OAuth flow working
- [ ] Fanvue webhooks receiving messages
- [ ] Multi-platform support in database
- [ ] Both OF and Fanvue chats visible in dashboard

**Progress:**
- Dec 16: Fanvue API research complete, credentials obtained
- Dec 16: Documentation created (`fanvue-api-research.md`)
- Dec 16-17: Implement Fanvue Backend integration (8-12 hours)
- Dec 18-21: Dashboard development

**Fanvue Integration Breakdown:**
| Task | Est. Time | Status |
|------|-----------|--------|
| OAuth flow + tokens | 2-3 hrs | ⏳ |
| API service | 2-3 hrs | ⏳ |
| Webhook handlers | 1-2 hrs | ⏳ |
| DB migration | 1 hr | ⏳ |
| Testing | 2-3 hrs | ⏳ |

---

## 🚫 Blockers

**Current Blockers:** None

**Risks Reassessed After Research:**
1. ~~GitHub repo access~~ ✅ Resolved
2. ~~OF account needed for testing~~ Allen provided
3. ~~OF may have anti-scraping measures~~ **LOW RISK** (human-in-the-loop is safe)
4. ~~Chrome Store removal~~ **MITIGATED** (sideloading + direct download ready)

---

## 📝 Notes

- Development on Ivan's server (`sorotech.ru`)
- Migration to Allen's server planned for later
- All code Docker-ready for easy migration
- n8n integration starts Week 2 (after Chrome Extension works)
- **Electron desktop app required for v2** (Month 6) — not optional based on research

---

## 💰 Pricing Strategy (Validated by Research)

| Creator Revenue | Price/mo | Notes |
|-----------------|----------|-------|
| $0-5K | $49 | Entry tier |
| $5K-15K | $99 | Growth tier |
| $15K-30K | $149 | Pro tier |
| $30K+ | $199 | Agency tier |

- Per-account pricing (not per-seat)
- Zero take-rate (no % of GMV)
- Unlimited team members per account

---

**Next Task:** Fanvue OAuth flow implementation
**Allen's Playground:** https://sorotech.ru/of-playground/index.html
**Fanvue Developer Portal:** https://fanvue.com/developers/apps
**Next Review:** December 21, 2025 (Week 3 wrap-up)
