# CHANGELOG

All notable changes to this project will be documented in this file.

## [Unreleased] - Week 2 (Dec 1-7, 2025)

### Added
- 🤖 n8n AI Chat Workflow "Muse AI Chat Responder"
- 🔗 Webhook endpoint: `https://n8n.sorotech.ru/webhook/muse-chat`
- 🧠 AI Agent with OpenAI GPT-4o-mini for flirty responses
- 🛠️ CORS fix for chrome-extension origin in nginx
- 🖥️ VNC MCP Server - подключение к существующему Chrome через CDP
- 📝 Документация VNC MCP (`/root/claude-browser-collab/README.md`)
- 🚀 Скрипт запуска Chrome с remote debugging (`start-chrome.sh`)

### Completed Dec 1
- ✅ Extension catches fan messages and sends to n8n
- ✅ n8n generates AI response and returns to extension
- ✅ AI response auto-inserts into OF chat input field
- ✅ Full E2E flow working: Fan message → AI suggestion → Ready to send

### Completed Dec 2
- ✅ Database schema designed (7 tables)
- ✅ Migration `001_initial_schema.sql` created and applied
- ✅ Tables: agencies, users, models, chats, messages, ai_responses, sessions
- ✅ Database schema research completed (8 GitHub repos analyzed)
- ✅ Migration `002_schema_optimization.sql` created and applied
- ✅ New tables: fan_stats, media_attachments
- ✅ Enhanced fields in messages, chats, models tables
- ✅ Documentation updated: DATABASE-RESEARCH.md, GITHUB-PROJECTS-ANALYSIS.md

### GitHub Repos Analyzed (Dec 2)
| Repo | Date | Status |
|------|------|--------|
| OF-Scraper | Oct 2025 | ✅ Актуален - DB schema |
| dynamic-rules | Nov 2025 | ✅ Актуален - API signing |
| onlyfClient | Dec 2023 | ⚠️ Frontend only |

### Completed Dec 3
- ✅ Backend REST API complete (30+ endpoints)
- ✅ JWT authentication (login, register, refresh)
- ✅ Users CRUD with role-based access (owner, admin, chatter)
- ✅ Models CRUD endpoints
- ✅ Chats/Messages CRUD endpoints
- ✅ AI generate/log endpoints
- ✅ Fixed n8n webhook field name (`chatInput`)
- ✅ All endpoints tested and working

**Files Created (Dec 3):**
| File | Purpose |
|------|---------|
| `src/types/index.ts` | TypeScript interfaces |
| `src/middleware/auth.ts` | JWT authentication |
| `src/services/authService.ts` | Auth business logic |
| `src/services/userService.ts` | Users CRUD |
| `src/services/modelService.ts` | Models CRUD |
| `src/services/chatService.ts` | Chats & Messages |
| `src/services/aiService.ts` | AI generation & logging |
| `src/routes/auth.ts` | Auth endpoints |
| `src/routes/users.ts` | Users endpoints |
| `src/routes/models.ts` | Models endpoints |
| `src/routes/chats.ts` | Chats & Messages endpoints |
| `src/routes/ai.ts` | AI endpoints |

### Completed Dec 4
- ✅ Extension ↔ Backend integration (API key auth + logging)
- ✅ Created `/api/extension/*` endpoints
- ✅ Migration `003_extension_logs.sql` created and applied
- ✅ Nginx proxy `/of-api/` → backend:3000
- ✅ Extension updated to use Backend API with n8n fallback
- ✅ Allen's Playground page created
- ✅ Extension packaged as ZIP v1.0.0-alpha
- ✅ Installation guide created
- ✅ **Swagger API Documentation** added

**Files Created (Dec 4):**
| File | Purpose |
|------|---------|
| `src/routes/extension.ts` | Extension API endpoints |
| `migrations/003_extension_logs.sql` | Usage logging table |
| `INSTALLATION-GUIDE.md` | Step-by-step install guide |
| `/var/www/html/of-playground/` | Download page for Allen |
| `src/config/swagger.ts` | Swagger/OpenAPI configuration |

**Allen's Playground:**
- URL: https://sorotech.ru/of-playground/index.html
- Extension ZIP download
- Installation instructions
- API status indicator

**API Documentation:**
- Swagger UI: https://sorotech.ru/of-api/docs/
- OpenAPI JSON: https://sorotech.ru/of-api/docs.json

### In Progress
- [ ] OpenAI & Pinecone production setup (Week 3)
- [ ] Admin Dashboard (React) - Week 3

### Tested & Working
- ✅ Extension → n8n → AI Response → Insert into chat
- ✅ Multiple chats tested (Eli, Kattedoll)
- ✅ VNC MCP can screenshot/control browser without killing session

---

## [0.2.0] - 2025-11-30 (Week 1 Complete)

### Added
- 🧩 Chrome Extension "Muse In Motion" (Manifest V3)
  - Content script for OnlyFans chat page
  - Background service worker
  - Message detection with DOM selectors
  - Incoming/outgoing message differentiation (`m-from-me` class)
- 🔬 OnlyFans DOM Research documentation
- 📊 Market Research (5 reports completed)
- 🐳 Docker Compose dev environment
- 🗄️ Backend API skeleton (Express + TypeScript)
- 📝 Project documentation (7 docs in `/docs/`)

### Completed Research
- ✅ Competitive Analysis ($500M-$1.2B market)
- ✅ Unit Economics & Strategy (ConvertKit playbook)
- ✅ Technical Architecture (Chrome Store patterns)
- ✅ Detection & Legal (human-in-the-loop is safe)
- ✅ Tactical Market Entry (Supercreator removed)

### Key Findings
- Chrome Extension MV3 + Backend + AI = correct architecture
- Human-in-the-loop = ZERO bans documented
- Per-account pricing $49-199/mo validated
- Electron desktop required for v2 (Month 6)

---

## [0.1.0] - 2025-11-24 (Project Start)

### Added
- 📁 Initial project structure created
- 📝 Core documentation:
  - README.md (project overview)
  - 00-PROJECT-OVERVIEW.md
  - 01-ARCHITECTURE.md
  - 02-TECH-STACK.md
  - 03-DEVELOPMENT-PHASES.md
  - 04-CHROME-EXTENSION.md
  - 05-AI-INTEGRATION.md
  - 06-RISKS-AND-MITIGATION.md
  - DEPLOYMENT.md
  - VARIABLES-TODO.md
- 🔧 Updated /root/CLAUDE.md with OF project as main focus
- 🐳 Created docker-compose.dev.yml
- 🗄️ Database `of_agency_db` created in PostgreSQL

### Notes
- Project officially started November 24, 2025
- Target: Complete faster than 10-week plan
- Development on Ivan's server initially
- Migration to Allen's server planned for later

---

## Milestones

| Week | Date | Milestone | Status |
|------|------|-----------|--------|
| 1 | Nov 24-30 | Foundation + Chrome Extension PoC | ✅ Done |
| 2 | Dec 1-7 | Backend + n8n Setup | 🔥 Current |
| 3 | Dec 8-14 | AI Integration | Upcoming |
| 4 | Dec 15-21 | Admin Dashboard | Upcoming |
| 5 | Dec 22-28 | Testing & Polish | Upcoming |

---

**Last Updated:** December 4, 2025
