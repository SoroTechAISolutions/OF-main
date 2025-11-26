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

---

## Change Log

| Date | Variable | Change | By |
|------|----------|--------|-----|
| 2025-11-25 | Initial | Created document | Dev Team |

---

**REMINDER:** Update this document whenever adding new variables or secrets!
