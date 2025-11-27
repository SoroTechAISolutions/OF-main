# CURRENT TASKS

**Last Updated:** November 27, 2025
**Current Phase:** Week 1 - Foundation & Chrome Extension PoC

---

## ⚠️ IMPORTANT DOCUMENTS (Always Check)

| Document | Purpose | Status |
|----------|---------|--------|
| [VARIABLES-TODO.md](./docs/VARIABLES-TODO.md) | Secrets & variables to update before production | 🔴 Review before deploy |
| [DEPLOYMENT.md](./docs/DEPLOYMENT.md) | Migration instructions to Allen's server | 📖 Reference |
| [Market Research](./docs/MARKET-RESEARCH-SUMMARY.md) | 5 research reports summary | ✅ Completed Nov 27 |

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

## 🔥 Active Tasks (Week 1)

### Priority 4: Chrome Extension Proof of Concept
**Status:** 🟢 In Progress
**Owner:** Development Team
**Deadline:** November 28, 2025

**Completed:**
- [x] Research OnlyFans web interface structure ✅
- [x] Document DOM selectors and structure ✅
- [x] Market research validation ✅

**Remaining:**
- [ ] Create basic Chrome Extension manifest (Manifest V3)
- [ ] Build content script that scrapes OF messages (read-only)
- [ ] Implement message detection with found selectors
- [ ] Detect incoming vs outgoing messages (`m-from-me` class)
- [ ] Test on real OF account
- [ ] Identify anti-detection requirements

**Deliverable:** Extension that successfully reads messages from OF and console.logs them

**Risk Level:** LOW (based on research — human-in-the-loop extensions not banned)

---

### Priority 5: Backend API - Extend with Endpoints
**Status:** 🟢 Partially Done (skeleton ready)
**Owner:** Development Team
**Deadline:** November 29, 2025

**Done:**
- [x] Setup Express + TypeScript project
- [x] Configure PostgreSQL connection
- [x] Setup Redis for session management

**Remaining:**
- [ ] Setup JWT authentication
- [ ] Create basic user/model/message schemas
- [ ] Build REST API endpoints (CRUD for messages)

**Deliverable:** Backend API with auth and message CRUD endpoints

---

## 📋 Upcoming Tasks (Week 2)

### n8n Workflows Setup
- [ ] OpenAI credentials configured in n8n
- [ ] Pinecone API key configured
- [ ] Test basic OpenAI node (simple prompt/response)
- [ ] Create webhook endpoint for Chrome Extension

### AI Integration Foundation
- [ ] First prompt engineering tests in n8n
- [ ] Build "Process Message" workflow prototype
- [ ] Test GPT-4 response generation

### Chrome Extension → Backend Connection
- [ ] Extension sends scraped messages to Backend API
- [ ] Backend stores messages in PostgreSQL
- [ ] Basic error handling and retry logic

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

### Week 1 Goal (Nov 24-30)
**Objective:** Prove that Chrome Extension can reliably scrape OF messages

**Success Criteria:**
- ✅ Dev environment runs on Ivan's server
- ✅ Market research complete and validated
- 🔄 Extension reads messages from real OF account
- 🔄 Messages are sent to Backend API and stored in DB
- 🔄 Zero detection/blocking from OF

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

**Next Task:** Chrome Extension PoC
**Next Review:** November 28, 2025
