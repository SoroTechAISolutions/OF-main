# CURRENT TASKS - PART 2

**Last Updated:** December 31, 2025
**Current Phase:** Week 6-7 — OnlyFans Integration + Mobile Polish

> Этот файл содержит актуальное состояние проекта. Для полной истории см. `CURRENT-TASKS.md`

---

## 📊 QUICK STATUS

| Component | Status | Notes |
|-----------|--------|-------|
| Chrome Extension | ✅ Working | Reads OF messages, inserts AI responses |
| Backend API | ✅ Working | 40+ endpoints, JWT auth, logging |
| Database | ✅ Working | 10 tables, PostgreSQL |
| n8n AI Workflow | ✅ Working | Dynamic system prompts |
| Fanvue Backend | ✅ Done | OAuth, chats API, send message, webhooks |
| AI Personas | ✅ Done | 5 archetypes, prompt builder |
| **Dashboard UI** | ✅ Done | React + Vite + Tailwind, deployed |
| **Auto-Reply Worker** | ✅ Done | Fully automated Fanvue responses |

---

## 🔗 LIVE URLS

| Resource | URL |
|----------|-----|
| **Dashboard** | https://sorotech.ru/of-dashboard/ |
| Backend API | https://sorotech.ru/of-api/ |
| Playground | https://sorotech.ru/of-playground/ |
| n8n Webhook | https://n8n.sorotech.ru/webhook/muse-chat |

---

## ✅ COMPLETED (Dec 29, 2025)

### Dashboard MVP ✅
**Completed:** December 29, 2025
**Location:** `/root/OF/dashboard/`
**Live:** https://sorotech.ru/of-dashboard/

**Features:**
- [x] React 18 + Vite + Tailwind CSS
- [x] Auth pages (Login/Register) with JWT
- [x] Main layout (Sidebar + Header)
- [x] Dashboard home with stats (Active Models, AI Responses Today)
- [x] Models list page with Fanvue connection status
- [x] Model create/edit with Persona dropdown
- [x] Fanvue OAuth connect flow
- [x] Chats page (Fanvue messages via API)
- [x] Chat detail view with messages
- [x] Deployed to `/var/www/html/of-dashboard/`
- [x] Nginx SPA routing configured

**Tech Stack:**
- React 18 + Vite
- Tailwind CSS
- React Router v6
- Zustand (state)
- Axios (API)

---

### Auto-Reply Worker ✅ (NEW!)
**Completed:** December 29, 2025
**Location:** `/root/OF/backend/src/workers/autoReplyWorker.ts`
**Docs:** `/root/OF/docs/AUTO-REPLY-WORKER.md`

**What It Does:**
- Runs every 30 seconds
- Gets models with `auto_reply_enabled = true`
- Fetches unread Fanvue chats via API
- Skips broadcasts, automated messages, already-replied
- Generates AI response via n8n (uses model's persona)
- Sends response via Fanvue API
- Logs to `extension_logs` for dashboard stats

**Database Changes:**
```sql
ALTER TABLE models ADD COLUMN auto_reply_enabled BOOLEAN DEFAULT false;
ALTER TABLE models ADD COLUMN auto_reply_delay_seconds INTEGER DEFAULT 30;
```

**API Endpoint:**
```
PUT /api/models/:id/auto-reply
{ "enabled": true, "delaySeconds": 30 }
```

**⚠️ MVP Implementation** — Will need refactoring:
- No queue (direct processing)
- In-memory cache (lost on restart)
- No rate limiting
- Single instance only

See full docs: `/root/OF/docs/AUTO-REPLY-WORKER.md`

---

### AI Persona System ✅
**Completed:** December 25, 2025

**Personas Created:**
| Persona | File | Style |
|---------|------|-------|
| GFE Sweet | `gfe_sweet.json` | Warm, caring girlfriend |
| Dominant | `dominant.json` | Cold, commanding mistress |
| Gamer Girl | `gamer_girl.json` | Playful, nerdy egirl |
| MILF | `milf.json` | Experienced, confident |
| Luxury | `luxury.json` | Exclusive, high-end |

**Location:** `/root/OF/config/personas/`

---

## 🔥 ACTIVE / NEXT TASKS

### Week 6 (Dec 29 - Jan 4): Real-Time Features
- [ ] WebSocket for live chat updates
- [ ] Push notifications
- [ ] Real-time dashboard stats

### Week 6-7: Dashboard Mobile Responsive ✅ DONE (Android)
- [x] Mobile-first responsive design
- [x] Sidebar collapse/hamburger menu on mobile
- [x] Touch-friendly buttons and inputs
- [x] Responsive tables (horizontal scroll or card view)
- [x] Test on Android Chrome ✅
- [ ] Test on iOS Safari (pending)

### 🔥 Week 7: OnlyFans Dashboard Integration (IN PROGRESS)
**Priority:** HIGH — Main platform, requested by client
**Approach:** Human-in-the-loop (AI suggests, human sends)

**Why Human-in-the-Loop:**
- OF blocks fully automated messaging (high ban risk)
- Chrome Extension reads messages, AI generates reply
- Human clicks "Insert" to send — looks organic

**Architecture:**
```
Chrome Extension (content.js)
        ↓ reads messages
Backend API (/extension/generate)
        ↓ AI generates reply
Extension shows suggestion
        ↓ human clicks "Insert"
Extension injects text
        ↓ human clicks "Send"
Message sent via OF native UI
```

**Tasks:**
- [ ] Test Chrome Extension with OF test account
- [ ] Add OF chats view in Dashboard (read-only mirror)
- [ ] Extension settings page in Dashboard
- [ ] Extension status indicator (connected/disconnected)
- [ ] AI reply preview in Dashboard

**Key Files:**
- `/root/OF/chrome-extension/content.js` — DOM manipulation
- `/root/OF/chrome-extension/background.js` — API communication
- `/root/OF/docs/onlyfans-dom-research.md` — DOM selectors

**Fanvue vs OnlyFans:**
| Feature | Fanvue | OnlyFans |
|---------|--------|----------|
| API | ✅ Official OAuth | ❌ No API |
| Integration | Server-side | Extension only |
| Auto-send | ✅ Yes | ❌ Human required |
| Risk | Zero | Medium (ToS) |

---

### Backlog (Nice to Have)
- [ ] AI generates 3-5 response options (not just 1)
- [ ] Pinecone Vector DB setup (chat memory)

---

## 🏗️ PROJECT STRUCTURE

```
/root/OF/
├── backend/           # Express API ✅
│   └── src/
│       ├── routes/
│       ├── services/
│       ├── workers/   # Auto-reply worker
│       └── middleware/
├── dashboard/         # React frontend ✅
│   └── src/
│       ├── components/
│       ├── pages/
│       └── services/
├── chrome-extension/  # OF integration ✅
├── config/
│   └── personas/      # AI persona JSONs ✅
├── docs/              # Documentation
│   ├── AUTO-REPLY-WORKER.md  # NEW
│   ├── DASHBOARD-PLAN.md
│   └── fanvue-api-research.md
└── research/          # Analysis files
```

---

## 📁 KEY FILES

### Backend
| File | Purpose |
|------|---------|
| `src/workers/autoReplyWorker.ts` | Auto-reply logic |
| `src/services/fanvueService.ts` | Fanvue API calls |
| `src/services/aiService.ts` | AI generation via n8n |
| `src/routes/dashboard.ts` | Dashboard stats endpoint |
| `src/routes/models.ts` | Models CRUD + auto-reply toggle |

### Dashboard
| File | Purpose |
|------|---------|
| `src/pages/DashboardPage.tsx` | Home with stats |
| `src/pages/ModelsPage.tsx` | Models list |
| `src/pages/chats/ChatsPage.tsx` | Fanvue chats |
| `src/pages/chats/ChatDetailPage.tsx` | Chat messages |
| `src/services/api.ts` | API client |

---

## 🐛 KNOWN ISSUES / FIXES

### Dec 31: Fanvue API Limitations ⚠️ NEW
**Documented:** `/root/OF/docs/fanvue-api-research.md`

| Limitation | Impact | Workaround |
|------------|--------|------------|
| No media URLs in messages | Can't display images, only "📷 Image attached" | None (by design) |
| Broadcast messages not in chat API | Message count differs from Fanvue UI | None (API limit) |
| Can't send to non-subscribers | 400 error "Invalid user UUID" | Lock chat input, show "Subscribe to send" |
| No "subscribe required" flag | UX is reactive, not proactive | Cache failed sends in localStorage |

### Dec 30: Dashboard Not Mobile Responsive ✅ FIXED
**Problem:** Dashboard UI не адаптирован под мобильные устройства
**Impact:** Плохой UX на телефонах, Аллен заметил при демонстрации
**Fixed:** ✅ Mobile responsive implemented (Dec 31), tested on Android

### Dec 29: Dashboard Active Models = 0
**Problem:** Dashboard showed 0 active models even though Fanvue connected
**Cause:** `req.agencyId` should be `req.user?.agencyId` in dashboard.ts
**Fixed:** ✅

### Dec 29: Auto-reply not finding fan messages
**Problem:** Worker couldn't identify messages from fans
**Cause:** Fanvue uses `sender.uuid` not `senderUuid`, and no separate chat ID
**Fixed:** ✅ Updated logic to use `sender.uuid` and `user.uuid` as chat ID

---

## 📝 NOTES FOR FUTURE

### Auto-Reply System Refactoring (Priority)
When scaling to production:
1. Move to Redis-based job queue (Bull/BullMQ)
2. Add per-model rate limiting
3. Implement retry with exponential backoff
4. Add distributed locking for multi-instance
5. Persist processed messages to Redis (not in-memory)

### OnlyFans Integration
Currently Chrome Extension only. When OF releases official API:
1. Similar OAuth flow to Fanvue
2. Add to auto-reply worker
3. Unified chat inbox in dashboard

---

**Last Updated:** December 31, 2025 @ 18:00 MSK
**Next Review:** After OF Integration testing
