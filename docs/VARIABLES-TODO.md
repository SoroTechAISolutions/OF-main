# VARIABLES & SECRETS TO UPDATE

**IMPORTANT:** This document tracks all variables, secrets, and configurations that need attention.
**Status:** Must be reviewed before production deployment.

---

## Critical Security Variables (MUST CHANGE for Production)

### 1. JWT Secret
**Location:** `/root/OF/.env`, `/root/OF/docker-compose.dev.yml`
**Current Value:** `dev-jwt-secret-change-in-production`
**Action Required:** Generate strong random secret (32+ characters)
**When:** Before any real user authentication
**How to generate:**
```bash
openssl rand -hex 32
```

### 2. Database Password
**Location:** `/root/OF/.env`, `/root/OF/docker-compose.dev.yml`
**Current Value:** `564321` (shared with LearnMate)
**Action Required:** Create dedicated user for OF project in production
**When:** Before deploying to Allen's server
**Production Setup:**
```sql
CREATE USER of_agency_user WITH PASSWORD 'STRONG_PASSWORD_HERE';
GRANT ALL PRIVILEGES ON DATABASE of_agency_db TO of_agency_user;
```

---

## Configuration Variables (Review Before Production)

### 3. API Port
**Location:** `/root/OF/.env`
**Current Value:** `3000`
**Action Required:** May need to change if port conflict
**Status:** OK for development

### 4. n8n Webhook URL
**Location:** `/root/OF/.env`
**Current Value:** `https://n8n.sorotech.ru/webhook`
**Action Required:** Update to Allen's server URL when migrating
**When:** During migration to production

### 5. CORS Origins
**Location:** `/root/OF/backend/src/index.ts` (not yet configured)
**Current Value:** `*` (allow all - via cors() middleware)
**Action Required:** Restrict to specific domains in production
**When:** Before production deployment
**Example:**
```typescript
app.use(cors({
  origin: ['https://allens-domain.com', 'chrome-extension://...']
}));
```

---

## API Keys (To Be Added)

### 6. OpenAI API Key
**Location:** n8n UI (Credentials section)
**Current Value:** Not configured yet
**Action Required:** Allen needs to provide or create
**When:** Week 2-3 (AI integration phase)
**Owner:** Allen

### 7. Pinecone API Key (Optional)
**Location:** n8n UI (Credentials section)
**Current Value:** Not configured yet
**Action Required:** Decide if using Pinecone for vector storage
**When:** Week 3-4 (if implementing RAG)
**Owner:** Allen

### 8. Extension API Key ⚠️ NEW
**Location:**
- Backend: `/root/OF/backend/src/routes/extension.ts` (line 15)
- Extension: `/root/OF/chrome-extension/background.js` (line 10)
**Current Value:** `muse-alpha-2025` (DEVELOPMENT PLACEHOLDER)
**Action Required:** Generate unique API key for production
**When:** Before giving extension to Allen or any real users
**How to generate:**
```bash
openssl rand -hex 24
```
**Note:** This is a simple API key for alpha testing. In production, should be per-agency keys stored in database.

---

## Fanvue Integration Variables ⚠️ NEW (December 16, 2025)

### 9. Fanvue OAuth Credentials
**Location:** `/root/OF/.env.fanvue`
**Developer Portal:** https://fanvue.com/developers/apps
**Status:** ✅ Client ID obtained, waiting for Client Secret

| Variable | Value | Status |
|----------|-------|--------|
| `FANVUE_CLIENT_ID` | `b6f59ca2-dafe-4a94-9908-5cfa0c356e01` | ✅ Set |
| `FANVUE_CLIENT_SECRET` | `PASTE_YOUR_SECRET_HERE` | ⚠️ NEEDED |
| `FANVUE_REDIRECT_URI` | `https://sorotech.ru/of-api/oauth/fanvue/callback` | ✅ Set |
| `FANVUE_SCOPES` | `read:self read:chat write:chat read:fan read:insights` | ✅ Set |
| `FANVUE_WEBHOOK_SECRET` | TBD | ⚠️ Get from Fanvue |

**Action Required:**
1. Copy Client Secret from Fanvue Developer Portal
2. Paste into `/root/OF/.env.fanvue`
3. Configure webhook endpoints in Fanvue Portal

### 10. Fanvue API Configuration (Static)
**Location:** `/root/OF/.env.fanvue`
**Status:** ✅ Ready (don't change these)

| Variable | Value |
|----------|-------|
| `FANVUE_AUTH_URL` | `https://auth.fanvue.com/oauth2/auth` |
| `FANVUE_TOKEN_URL` | `https://auth.fanvue.com/oauth2/token` |
| `FANVUE_API_BASE_URL` | `https://api.fanvue.com` |
| `FANVUE_API_VERSION` | `2025-06-26` |

### 11. Fanvue Webhook Endpoints
**Location:** Fanvue Developer Portal → Webhooks section
**Status:** ⚠️ Need to configure in portal

| Event | Endpoint URL |
|-------|--------------|
| Message Received | `https://sorotech.ru/of-api/webhooks/fanvue/message` |
| New Subscriber | `https://sorotech.ru/of-api/webhooks/fanvue/subscriber` |
| Tip Received | `https://sorotech.ru/of-api/webhooks/fanvue/tip` |

---

## Environment-Specific Variables

### Development (Ivan's Server)
| Variable | Value | Notes |
|----------|-------|-------|
| DB_HOST | `postgres` | Container name |
| DB_NAME | `of_agency_db` | Shared PostgreSQL |
| DB_USER | `learnmate` | Shared user |
| REDIS_HOST | `redis` | Container name |
| N8N_WEBHOOK_URL | `https://n8n.sorotech.ru/webhook` | Ivan's n8n |

### Production (Allen's Server)
| Variable | Value | Notes |
|----------|-------|-------|
| DB_HOST | `postgres` or `of-postgres` | Own container |
| DB_NAME | `of_agency_db` | Dedicated PostgreSQL |
| DB_USER | `of_agency_user` | Dedicated user |
| REDIS_HOST | `redis` or `of-redis` | Own container |
| N8N_WEBHOOK_URL | `https://allens-domain.com/webhook` | TBD |

---

## Files That Contain Sensitive Variables

1. `/root/OF/.env` - Main environment file (NOT in git)
2. `/root/OF/.env.example` - Template (in git, no real secrets)
3. `/root/OF/docker-compose.dev.yml` - Dev compose (has defaults)
4. `/root/OF/docker-compose.production.yml` - Prod compose (to be created)

---

## Auto-Reply Worker Configuration ⚠️ NEW (December 29, 2025)

### 12. Worker Interval
**Location:** `/root/OF/backend/src/workers/autoReplyWorker.ts` (line 222)
**Current Value:** `30` seconds
**Action Required:** Adjust based on Fanvue API rate limits
**Status:** OK for development

### 13. Processed Messages Cache Size
**Location:** `/root/OF/backend/src/workers/autoReplyWorker.ts` (line 20)
**Current Value:** `10000` entries
**Action Required:** Move to Redis in production (MVP uses in-memory)
**Status:** ⚠️ Will be lost on restart

### 14. Per-Model Auto-Reply Settings
**Location:** Database `models` table
**Columns Added:**
| Column | Type | Default | Notes |
|--------|------|---------|-------|
| `auto_reply_enabled` | BOOLEAN | `false` | Enable/disable per model |
| `auto_reply_delay_seconds` | INTEGER | `30` | Min seconds between replies to same chat |

**Action Required:** Configure per model via API or dashboard
**API Endpoint:** `PUT /api/models/:id/auto-reply`

### 15. n8n Webhook for AI Generation
**Location:** `/root/OF/backend/src/services/aiService.ts`
**Current Value:** `https://n8n.sorotech.ru/webhook/muse-chat`
**Action Required:** Update to Allen's n8n URL when migrating
**When:** During migration to production

---

## Checklist Before Production

- [ ] Generate new JWT_SECRET (32+ chars)
- [ ] Create dedicated database user
- [ ] Update database password
- [ ] Configure CORS for specific domains
- [ ] Setup OpenAI API key in n8n
- [ ] Update N8N_WEBHOOK_URL to production
- [ ] Enable HTTPS on all endpoints
- [ ] Remove any hardcoded development values
- [ ] Review all console.log statements (remove sensitive data logging)
- [ ] Verify Fanvue credentials are set in production
- [ ] Configure Fanvue webhooks with production URLs
- [ ] Configure auto-reply delay per model (default: 30s)
- [ ] Migrate processed messages cache to Redis
- [ ] Update n8n webhook URL for AI generation

---

## Change Log

| Date | Variable | Change | By |
|------|----------|--------|-----|
| 2025-11-25 | Initial | Created document | Dev Team |
| 2025-12-04 | EXTENSION_API_KEY | Added Extension API Key placeholder | Dev Team |
| 2025-12-16 | FANVUE_* | Added Fanvue OAuth credentials | Dev Team |
| 2025-12-29 | AUTO_REPLY_* | Added auto-reply worker configuration | Dev Team |

---

**REMINDER:** Update this document whenever adding new variables or secrets!
