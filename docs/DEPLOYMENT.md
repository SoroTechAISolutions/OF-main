# DEPLOYMENT GUIDE

**Last Updated:** November 24, 2025

---

## Overview

This document describes:
1. **Development Setup** (Ivan's server) - shared infrastructure
2. **Production Deployment** (Allen's server) - standalone stack
3. **Migration Process** from dev to production

---

## Development Environment (Ivan's Server)

### Architecture

**Shared Infrastructure Strategy:**
- Uses existing n8n stack from `/root/n8n/docker-compose.yml`
- Shared PostgreSQL container (separate database: `of_agency_db`)
- Shared n8n container (workflows isolated by naming convention)
- Shared Docker network: `n8n-network`
- OF project adds: Redis + Backend API

**Why This Approach:**
- ✅ Resource-efficient (no duplicate PostgreSQL/n8n)
- ✅ Faster development (existing infrastructure)
- ✅ Easy to migrate (all OF resources isolated)

### Current Infrastructure

**Existing Services** (from `/root/n8n/docker-compose.yml`):
```yaml
- postgres:5432 (container: postgres)
  - Database: learnmate_db (existing - DO NOT TOUCH)
  - Database: of_agency_db (NEW - for OF project)
  - User: learnmate
  - Password: 564321

- n8n:5678 (container: n8n)
  - Used for both LearnMate and OF workflows
  - OF workflows prefixed with "OF_" for easy identification

- latex-renderer:3001 (LearnMate service - ignore)
```

**Network:**
```
n8n-network (bridge)
```

### OF Project Services

**New Services Added:**

1. **Redis** (Session Management)
   - Port: `6379`
   - Container: `of-redis`
   - Network: `n8n-network`

2. **Backend API** (Express + TypeScript)
   - Port: `3000`
   - Container: `of-backend`
   - Network: `n8n-network`
   - Connects to: `postgres:5432` (database: `of_agency_db`)
   - Connects to: `of-redis:6379`

### File Structure

```
/root/OF/                          # Main project directory
├── backend/                       # Express API
│   ├── src/
│   ├── Dockerfile
│   └── package.json
├── extension/                     # Chrome Extension
│   ├── manifest.json
│   ├── content-script.js
│   └── background.js
├── frontend/                      # React Dashboard (later)
├── n8n-workflows/                 # n8n workflow exports (JSON)
│   ├── OF_process_message.json
│   ├── OF_generate_response.json
│   └── README.md
├── docker-compose.dev.yml         # Dev setup (uses shared infra)
├── docker-compose.production.yml  # Production setup (standalone)
├── .env.example                   # Environment variables template
└── docs/
    ├── DEPLOYMENT.md              # This file
    └── ...
```

### Environment Variables

**Development `.env`:**
```bash
# Database (shared PostgreSQL)
DB_HOST=postgres
DB_PORT=5432
DB_NAME=of_agency_db
DB_USER=learnmate
DB_PASSWORD=564321

# Redis
REDIS_HOST=of-redis
REDIS_PORT=6379

# Backend API
API_PORT=3000
JWT_SECRET=your-dev-jwt-secret-change-in-production

# n8n
N8N_URL=https://n8n.sorotech.ru
N8N_WEBHOOK_URL=https://n8n.sorotech.ru/webhook

# OpenAI (configured in n8n UI)
# OPENAI_API_KEY=(set in n8n)

# Pinecone (configured in n8n UI)
# PINECONE_API_KEY=(set in n8n)
```

---

## Production Environment (Allen's Server)

### Architecture

**Standalone Stack:**
- Own PostgreSQL container
- Own n8n container
- Own Redis container
- Backend API
- All isolated from other services

**Why Standalone:**
- ✅ Full isolation (no dependencies on other projects)
- ✅ Easy to scale independently
- ✅ Clear resource allocation
- ✅ Simple security model

### Services

**Production Docker Compose** (`docker-compose.production.yml`):

```yaml
services:
  postgres:
    image: postgres:15
    container_name: of-postgres
    environment:
      POSTGRES_DB: of_agency_db
      POSTGRES_USER: of_agency_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}  # Set in .env
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - of-network

  redis:
    image: redis:7-alpine
    container_name: of-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - of-network

  n8n:
    image: n8nio/n8n
    container_name: of-n8n
    environment:
      - N8N_HOST=${N8N_HOST}
      - N8N_PORT=5678
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=${N8N_WEBHOOK_URL}
    ports:
      - "5678:5678"
    volumes:
      - n8n_data:/home/node/.n8n
    networks:
      - of-network
    depends_on:
      - postgres

  backend:
    build: ./backend
    container_name: of-backend
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=of_agency_db
      - DB_USER=of_agency_user
      - DB_PASSWORD=${DB_PASSWORD}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - JWT_SECRET=${JWT_SECRET}
    ports:
      - "3000:3000"
    networks:
      - of-network
    depends_on:
      - postgres
      - redis

networks:
  of-network:
    driver: bridge

volumes:
  postgres_data:
  redis_data:
  n8n_data:
```

---

## Migration Process (Dev → Production)

### Step 1: Prepare Data for Export

**On Ivan's Server:**

1. **Export Database:**
   ```bash
   cd /root/OF
   docker exec postgres pg_dump -U learnmate -d of_agency_db > of_agency_backup.sql
   ```

2. **Export n8n Workflows:**
   - Open n8n UI: `https://n8n.sorotech.ru`
   - Go to "Workflows"
   - Export each workflow starting with "OF_" prefix:
     - `OF_process_message` → save to `/root/OF/n8n-workflows/OF_process_message.json`
     - `OF_generate_response` → save to `/root/OF/n8n-workflows/OF_generate_response.json`
     - etc.

3. **Commit to Git:**
   ```bash
   cd /root/OF
   git add .
   git commit -m "Pre-migration: database backup and n8n workflows"
   git push origin main
   ```

### Step 2: Prepare Allen's Server

**On Allen's Server:**

1. **Install Docker + Docker Compose:**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo apt install docker-compose-plugin
   ```

2. **Clone Repository:**
   ```bash
   git clone https://github.com/SoroTechAISolutions/OF-main.git /opt/of-agency
   cd /opt/of-agency
   ```

3. **Create Production `.env`:**
   ```bash
   cp .env.example .env
   nano .env  # Edit with production credentials
   ```

   **Production `.env`:**
   ```bash
   # Database
   DB_PASSWORD=STRONG_PASSWORD_HERE
   DB_USER=of_agency_user
   DB_NAME=of_agency_db

   # JWT
   JWT_SECRET=STRONG_JWT_SECRET_HERE

   # n8n
   N8N_HOST=allen-server-domain.com
   N8N_WEBHOOK_URL=https://allen-server-domain.com/webhook

   # OpenAI
   OPENAI_API_KEY=sk-...

   # Pinecone
   PINECONE_API_KEY=...
   ```

### Step 3: Deploy Production Stack

**On Allen's Server:**

1. **Start Services:**
   ```bash
   cd /opt/of-agency
   docker-compose -f docker-compose.production.yml up -d
   ```

2. **Import Database:**
   ```bash
   docker exec -i of-postgres psql -U of_agency_user -d of_agency_db < of_agency_backup.sql
   ```

3. **Import n8n Workflows:**
   - Open n8n UI: `http://allen-server-ip:5678`
   - Go to "Workflows" → "Import from File"
   - Import each JSON file from `/opt/of-agency/n8n-workflows/`

4. **Configure n8n Credentials:**
   - Add OpenAI API credentials
   - Add Pinecone API credentials
   - Update webhook URLs if needed

5. **Verify Services:**
   ```bash
   docker ps  # All containers should be running
   curl http://localhost:3000/health  # Backend health check
   ```

### Step 4: Update Chrome Extension

**On Allen's Machine (or operator machines):**

1. Update Extension `config.js`:
   ```javascript
   const API_URL = "https://allen-server-domain.com/api";
   ```

2. Reload Extension in Chrome

### Step 5: Configure Nginx/Reverse Proxy (Optional)

**On Allen's Server:**

If using domain name (recommended):

```nginx
# /etc/nginx/sites-available/of-agency
server {
    listen 80;
    server_name allen-server-domain.com;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /webhook {
        proxy_pass http://localhost:5678;
        proxy_set_header Host $host;
    }
}
```

Then:
```bash
sudo ln -s /etc/nginx/sites-available/of-agency /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Rollback Plan

If migration fails:

1. **Keep Ivan's server running** (don't stop services)
2. **Debug on Allen's server** without downtime
3. **Operators use Ivan's server URL** until Allen's server is stable

---

## Health Checks

**After Migration:**

1. **Backend API:**
   ```bash
   curl https://allen-server-domain.com/api/health
   # Expected: {"status": "ok"}
   ```

2. **Database Connection:**
   ```bash
   docker exec of-backend npm run db:test
   # Expected: "Database connected"
   ```

3. **n8n Workflows:**
   - Open n8n UI
   - Test each workflow manually
   - Verify OpenAI/Pinecone credentials work

4. **Chrome Extension:**
   - Open OF in browser
   - Verify messages are scraped
   - Check Backend API receives messages

---

## Maintenance

### Backup Schedule (Allen's Server)

**Daily Database Backup:**
```bash
# Add to crontab: crontab -e
0 2 * * * docker exec of-postgres pg_dump -U of_agency_user of_agency_db > /backups/of_agency_$(date +\%Y\%m\%d).sql
```

**Weekly n8n Workflow Export:**
- Manual export every Sunday
- Commit to Git

### Logs

**View Logs:**
```bash
docker logs of-backend -f     # Backend logs
docker logs of-n8n -f         # n8n logs
docker logs of-postgres -f    # Database logs
```

---

## Troubleshooting

### Issue: Backend can't connect to PostgreSQL

**Solution:**
```bash
# Check if containers are on same network
docker network inspect of-network

# Verify DB credentials
docker exec of-backend env | grep DB_
```

### Issue: n8n workflows not triggering

**Solution:**
1. Check webhook URLs in n8n UI
2. Verify CORS settings
3. Check n8n logs: `docker logs of-n8n`

### Issue: Chrome Extension can't reach Backend

**Solution:**
1. Verify Backend API URL in Extension config
2. Check CORS settings in Backend
3. Check Nginx proxy config (if using domain)

---

## Security Checklist (Production)

- [ ] Change all default passwords
- [ ] Use strong JWT secret (32+ characters)
- [ ] Enable HTTPS (Let's Encrypt recommended)
- [ ] Configure firewall (allow only 80, 443, 22)
- [ ] Restrict PostgreSQL access (no public port)
- [ ] Use environment variables (never hardcode secrets)
- [ ] Enable Docker log rotation
- [ ] Setup automated backups
- [ ] Monitor disk space

---

## Contact

**Questions?** Contact Ivan (SoroTech AI Solutions)
