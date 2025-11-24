# CURRENT TASKS

**Last Updated:** November 24, 2025
**Current Phase:** Week 1 - Foundation & Chrome Extension PoC

## 🔥 Active Tasks (Week 1)

### Priority 1: Development Environment Setup
**Status:** 🟢 In Progress
**Owner:** Development Team
**Deadline:** November 25, 2025

**Architecture Decision: MONOREPO + Shared Infrastructure**

**Development Setup (Ivan's Server):**
- ✅ Monorepo structure decided (`/root/OF/`)
- 🔄 Use existing n8n stack (`/root/n8n/docker-compose.yml`)
- 🔄 Create separate database `of_agency_db` in existing PostgreSQL container
- 🔄 Add Redis + Backend to `n8n-network`
- 🔄 Keep OF project code isolated for easy migration

**Tasks:**
- [x] Clone GitHub repo to `/root/OF/`
- [ ] Create new database `of_agency_db` in existing PostgreSQL
- [ ] Add Redis container to `n8n-network`
- [ ] Create Backend Docker setup (connects to shared PostgreSQL)
- [ ] Setup `.env.example` with required environment variables
- [ ] Document migration strategy for Allen's server

**Deliverable:** Backend + Redis running, connected to existing PostgreSQL/n8n

---

**📦 Migration Strategy (to Allen's Server):**

When migrating to Allen's server, we will:

1. **Export Database:**
   ```bash
   docker exec postgres pg_dump -U learnmate of_agency_db > of_agency_backup.sql
   ```

2. **Export n8n Workflows:**
   - Export all OF-related workflows from n8n UI to `/root/OF/n8n-workflows/*.json`
   - These files will be version-controlled in Git

3. **Deploy to Allen's Server:**
   - Use prepared `docker-compose.production.yml` (includes own PostgreSQL, Redis, n8n)
   - Import database dump
   - Import n8n workflows
   - Update environment variables
   - Run `docker-compose -f docker-compose.production.yml up -d`

**Estimated Migration Time:** 1-2 hours

**Files to Prepare:**
- `/root/OF/docker-compose.production.yml` (standalone stack for Allen)
- `/root/OF/n8n-workflows/` (JSON exports of workflows)
- `/root/OF/docs/DEPLOYMENT.md` (migration instructions)

---

### Priority 2: Chrome Extension Proof of Concept
**Status:** 🟡 Not Started
**Owner:** Development Team
**Deadline:** November 27, 2025

**Tasks:**
- [ ] Research OnlyFans web interface structure
- [ ] Create basic Chrome Extension manifest
- [ ] Build content script that scrapes OF messages (read-only)
- [ ] Test on Allen's real OF account
- [ ] Document DOM selectors and structure
- [ ] Identify anti-detection requirements

**Deliverable:** Extension that successfully reads messages from OF and console.logs them

**Critical Risk:** OF may change UI or block automation. Test carefully.

---

### Priority 3: Backend API Skeleton
**Status:** 🟡 Not Started
**Owner:** Development Team
**Deadline:** November 28, 2025

**Tasks:**
- [ ] Setup Express + TypeScript project
- [ ] Configure PostgreSQL connection
- [ ] Setup JWT authentication
- [ ] Create basic user/model/message schemas
- [ ] Build REST API endpoints (CRUD for messages)
- [ ] Setup Redis for session management

**Deliverable:** Backend API running on `http://localhost:3000` with basic auth

---

## 📋 Upcoming Tasks (Week 2)

### n8n Workflows Setup
- [ ] n8n Docker container running at localhost:5678
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

## 🎯 Weekly Goals

### Week 1 Goal (Nov 24-30)
**Objective:** Prove that Chrome Extension can reliably scrape OF messages

**Success Criteria:**
- ✅ Dev environment runs on Ivan's server
- ✅ Extension reads messages from real OF account
- ✅ Messages are sent to Backend API and stored in DB
- ✅ Zero detection/blocking from OF

---

## 🚫 Blockers

**Current Blockers:** None

**Potential Risks:**
1. GitHub repo access - need to configure SSH key
2. OF account needed for testing - Allen to provide
3. OF may have anti-scraping measures - TBD

---

## 📝 Notes

- Development on Ivan's server (`sorotech.ru`)
- Migration to Allen's server planned for later
- Parallel contractors working on AI models & face-swap (no integration needed yet)
- Target: Complete MVP faster than 10-week plan
- All code must be Docker-ready for easy migration

---

## ✅ Completed Tasks

_None yet - project just started!_

---

**Next Review:** November 25, 2025 (daily progress check)
