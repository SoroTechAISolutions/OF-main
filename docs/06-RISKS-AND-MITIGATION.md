# 06 - RISKS & MITIGATION STRATEGIES

**Last Updated:** November 24, 2025

## Risk Assessment Framework

Each risk is evaluated on:
- **Probability:** Low / Medium / High
- **Impact:** Low / Medium / High / Critical
- **Mitigation Status:** Planned / In Progress / Mitigated

---

## CRITICAL RISKS (Showstoppers)

### Risk 1: Chrome Extension Banned by OnlyFans

**Probability:** Medium
**Impact:** Critical (entire project fails)
**Status:** Planned

**Description:**
- OF detects automated behavior (message injection)
- Account gets banned/restricted
- OF updates their DOM structure making scraping impossible
- OF implements CAPTCHA or other anti-bot measures

**Mitigation Strategies:**

1. **Anti-Detection Measures (Phase 1 - MVP)**
   ```javascript
   // Human-like typing speed
   const humanType = async (element, text) => {
     for (let char of text) {
       const delay = 50 + Math.random() * 100; // 50-150ms per char
       await sleep(delay);
       element.value += char;
       element.dispatchEvent(new Event('input', { bubbles: true }));
     }
   };

   // Random delays between actions
   const randomDelay = (min, max) => {
     return Math.random() * (max - min) + min;
   };

   // Rate limiting
   let lastActionTime = 0;
   const rateLimitAction = async () => {
     const now = Date.now();
     const timeSinceLastAction = now - lastActionTime;
     if (timeSinceLastAction < 5000) {
       await sleep(5000 - timeSinceLastAction);
     }
     lastActionTime = Date.now();
   };
   ```

2. **MVP Scope: Working Chrome Extension Included**

   **⚠️ Important Commitment:**
   - **MVP includes a fully working Chrome Extension** - this is the core deliverable
   - Basic scraping + message sending must work reliably
   - There is NO "way back to manual" mode in MVP scope
   - If automation breaks during MVP development, we MUST find a technical solution

   **Team Resources:**
   - **Ivan (Project Lead):** Responsible for MVP development and implementation. Capable of handling n8n workflows, API integrations, Chrome Extension basics, and project management
   - **Development Team:** In-house developers and technical advisors participate in MVP development
   - **External Specialists:** Available on contract if MVP encounters complex technical roadblocks

   **MVP Problem-Solving Approach:**

   **During MVP Development (Weeks 1-10):**
   - If OF changes CSS classes → In-house team fixes within 1-2 days
   - If OF changes DOM structure → In-house team reverse engineers and adapts
   - If basic anti-detection needed → Implement human-like delays, random timing
   - If Extension breaks → Debug and fix with in-house team + external help if needed
   - **All Extension fixes are INCLUDED in MVP budget ($9,500)**

   **Example MVP Scenarios:**

   | Problem | Solution Level | Timeline | Included in MVP? |
   |---------|----------------|----------|------------------|
   | OF changes CSS classes | In-house team | 4-8 hours | ✅ Yes |
   | OF changes DOM structure | In-house team | 1-2 days | ✅ Yes |
   | Need to add random delays | In-house team | 4-6 hours | ✅ Yes |
   | Extension bug/crash | In-house + external help | 2-3 days | ✅ Yes |

   **Post-MVP: Advanced Anti-Detection (Separate Phase)**

   Advanced anti-bot challenges are considered **Post-MVP enhancements**:
   - Sophisticated fingerprint detection
   - OF implements aggressive rate limiting
   - OF adds CAPTCHA challenges
   - OF deploys advanced behavioral analysis

   These scenarios would be handled in **Post-MVP Phase** with separate budget and timeline.

3. **Testing Strategy (Conservative Approach)**
   - **Week 1-2:** Test on throwaway accounts only (20-30 messages total)
   - **Week 3-4:** Test on Allen's test accounts, non-revenue models (50-100 messages)
   - **Week 5-6:** Limited production testing (10 messages/day per model)
   - **Week 7-8:** Gradual ramp-up (20 → 50 → 100 messages/day)
   - **Week 9+:** Full production (if no bans detected for 2+ weeks)

   **If any warnings/bans detected:**
   - STOP immediately on that account
   - Analyze what triggered the detection
   - Hire contractor to implement better anti-detection
   - Test fix on throwaway accounts for 1 week
   - Resume cautiously

4. **Monitoring & Early Warning**
   - Check OF email notifications daily (automated email parsing if possible)
   - Monitor account health in OF dashboard
   - Track any unusual warnings, restrictions, or rate limits
   - Log every automation action (timestamp, account, action type)
   - Weekly review of all accounts with Allen

   **Red Flags to Watch:**
   - "Suspicious activity" emails from OF
   - Account temporary restrictions
   - Messages not sending
   - Sudden CAPTCHA requests
   - Changed account settings without user action

5. **Emergency Response Plan**
   - **If 1 account gets warning:** Pause automation on that account, analyze logs, adjust approach
   - **If 2+ accounts get warnings:** PAUSE ALL automation, emergency contractor call, implement fixes
   - **If account banned:** Document everything, analyze what went wrong, hire senior contractor ASAP

**Decision Point:** Week 7-8
- ✅ **If automation works reliably:** Keep scaling carefully
- ⚠️ **If issues detected:** PAUSE → Debug → Fix → Resume (NOT manual fallback)
- 🚨 **If critical ban risk:** Hire senior contractor immediately to implement advanced stealth techniques

---

### Risk 2: OpenAI Rate Limits / API Downtime

**Probability:** Low
**Impact:** High (AI suggestions stop working)
**Status:** Planned

**Description:**
- OpenAI API hits rate limits (10,000 req/min)
- API downtime (rare but possible)
- Cost explosion if usage spikes

**Mitigation Strategies:**

1. **Rate Limiting on Our End**
   ```javascript
   // Queue requests if approaching rate limit
   const requestQueue = new Queue();

   const generateAIResponse = async (context) => {
     await requestQueue.add(async () => {
       return await openai.chat.completions.create({...});
     });
   };
   ```

2. **Retry Logic with Exponential Backoff**
   ```javascript
   const MAX_RETRIES = 3;
   let attempt = 0;

   while (attempt < MAX_RETRIES) {
     try {
       return await openai.chat.completions.create({...});
     } catch (error) {
       if (error.status === 429) {
         await sleep(2000 * Math.pow(2, attempt)); // 2s, 4s, 8s
         attempt++;
       } else {
         throw error;
       }
     }
   }
   ```

3. **Fallback Responses**
   ```javascript
   const FALLBACK_RESPONSES = {
     greeting: ["Hey babe! 😘", "Hi there! 💕", "Miss you!"],
     generic: ["That's so sweet!", "Tell me more!", "You're amazing!"]
   };

   const getFallbackResponse = (messageType) => {
     const options = FALLBACK_RESPONSES[messageType] || FALLBACK_RESPONSES.generic;
     return options[Math.floor(Math.random() * options.length)];
   };
   ```

4. **Backup AI Provider (Claude)**
   - Have Claude API integration ready
   - Switch if OpenAI has extended downtime
   - Cost: $0.015/$0.075 (vs $0.01/$0.03 for GPT-4)

5. **Cost Monitoring**
   - Set alerts at $50, $100, $200 spend
   - Track spend per model/operator
   - Optimize prompts to reduce token usage

---

### Risk 3: Database Performance Bottleneck

**Probability:** Medium (if scale to 1000+ fans)
**Impact:** Medium (slow dashboard, API timeouts)
**Status:** Planned

**Description:**
- PostgreSQL struggles with high read/write load
- Slow queries cause API timeouts
- Dashboard becomes sluggish

**Mitigation Strategies:**

1. **Database Indexing**
   ```sql
   -- Index on commonly queried fields
   CREATE INDEX idx_messages_fan_id ON messages(fan_id);
   CREATE INDEX idx_messages_model_id ON messages(model_id);
   CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
   CREATE INDEX idx_fans_spending_tier ON fans(spending_tier);

   -- Composite index for common query patterns
   CREATE INDEX idx_messages_fan_model ON messages(fan_id, model_id, created_at DESC);
   ```

2. **Query Optimization**
   ```javascript
   // BAD: Fetch all messages then filter in code
   const allMessages = await db.messages.findMany();
   const filtered = allMessages.filter(m => m.fanId === fanId);

   // GOOD: Filter in database
   const messages = await db.messages.findMany({
     where: { fanId },
     orderBy: { createdAt: 'desc' },
     take: 20
   });
   ```

3. **Pagination**
   ```javascript
   // Always paginate large result sets
   const getMessages = async (page = 1, limit = 50) => {
     const skip = (page - 1) * limit;

     return await db.messages.findMany({
       skip,
       take: limit,
       orderBy: { createdAt: 'desc' }
     });
   };
   ```

4. **Redis Caching**
   ```javascript
   const getCachedMessages = async (fanId) => {
     const cacheKey = `messages:${fanId}`;

     // Check cache first
     const cached = await redis.get(cacheKey);
     if (cached) return JSON.parse(cached);

     // Fetch from DB if not cached
     const messages = await db.messages.findMany({
       where: { fanId },
       take: 20
     });

     // Cache for 5 minutes
     await redis.setex(cacheKey, 300, JSON.stringify(messages));

     return messages;
   };
   ```

5. **Read Replicas (Future)**
   - Add PostgreSQL read replica
   - Route read queries to replica
   - Keep writes on primary

---

## HIGH RISKS (Major Issues)

### Risk 4: OnlyFans Changes DOM Structure

**Probability:** Medium
**Impact:** High (Extension breaks)
**Status:** Planned

**Description:**
- OF updates their UI
- CSS selectors no longer work
- Extension can't scrape messages

**Mitigation Strategies:**

1. **Multiple Fallback Selectors**
   ```javascript
   const MESSAGE_SELECTORS = [
     '.message-container',           // Primary selector
     '[data-testid="message"]',      // Fallback 1
     '.chat-message',                // Fallback 2
     'div[class*="message"]'         // Fallback 3 (partial match)
   ];

   const findMessageElements = () => {
     for (const selector of MESSAGE_SELECTORS) {
       const elements = document.querySelectorAll(selector);
       if (elements.length > 0) return elements;
     }
     throw new Error('No message elements found');
   };
   ```

2. **Structure Change Detection**
   ```javascript
   const verifyDOMStructure = () => {
     const requiredElements = {
       messageContainer: '.message-container',
       messageInput: '[data-testid="message-input"]',
       sendButton: '[data-testid="send-button"]'
     };

     for (const [key, selector] of Object.entries(requiredElements)) {
       if (!document.querySelector(selector)) {
         console.error(`Missing element: ${key}`);
         notifyBackend({ error: 'DOM_STRUCTURE_CHANGED', element: key });
         return false;
       }
     }

     return true;
   };

   // Run check every 5 minutes
   setInterval(verifyDOMStructure, 300000);
   ```

3. **Quick Update Process**
   - Keep Extension code modular (easy to update selectors)
   - Document OF DOM structure (screenshots + code)
   - Chrome Web Store update process: 2-3 days
   - Have unpacked extension ready (manual install if needed)

4. **Alert System**
   ```javascript
   const notifyBackend = async (error) => {
     await fetch('https://api.our-platform.com/alerts', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         type: 'EXTENSION_ERROR',
         message: error.error,
         userAgent: navigator.userAgent,
         timestamp: new Date().toISOString()
       })
     });
   };
   ```

---

### Risk 5: Security Breach / Data Leak

**Probability:** Low
**Impact:** Critical (legal liability, reputation damage)
**Status:** Planned

**Description:**
- Hacker gains access to database
- Fan/model data leaked
- Credentials stolen

**Mitigation Strategies:**

1. **Authentication & Authorization**
   ```javascript
   // JWT with short expiration
   const generateToken = (userId) => {
     return jwt.sign({ userId }, process.env.JWT_SECRET, {
       expiresIn: '24h'
     });
   };

   // Verify token on every request
   const authMiddleware = async (req, res, next) => {
     const token = req.headers.authorization?.replace('Bearer ', '');
     if (!token) return res.status(401).json({ error: 'No token' });

     try {
       const decoded = jwt.verify(token, process.env.JWT_SECRET);
       req.userId = decoded.userId;
       next();
     } catch (error) {
       return res.status(401).json({ error: 'Invalid token' });
     }
   };
   ```

2. **Password Security**
   ```javascript
   // Bcrypt with 10 rounds
   const hashPassword = async (password) => {
     return await bcrypt.hash(password, 10);
   };

   const verifyPassword = async (password, hash) => {
     return await bcrypt.compare(password, hash);
   };
   ```

3. **SQL Injection Prevention**
   - Use TypeORM (parameterized queries)
   - Never concatenate user input into queries
   ```javascript
   // BAD
   const query = `SELECT * FROM users WHERE email = '${email}'`;

   // GOOD (TypeORM)
   const user = await db.users.findOne({ where: { email } });
   ```

4. **HTTPS Everywhere**
   - Nginx with SSL certificate (Let's Encrypt)
   - Force HTTPS redirect
   - HSTS header

5. **Rate Limiting**
   ```javascript
   const rateLimit = require('express-rate-limit');

   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // 100 requests per window
     message: 'Too many requests'
   });

   app.use('/api/', limiter);
   ```

6. **Input Validation**
   ```javascript
   const { z } = require('zod');

   const messageSchema = z.object({
     fanId: z.string().uuid(),
     content: z.string().min(1).max(5000),
     modelId: z.string().uuid()
   });

   app.post('/api/messages', async (req, res) => {
     try {
       const validated = messageSchema.parse(req.body);
       // Process validated data
     } catch (error) {
       return res.status(400).json({ error: 'Invalid input' });
     }
   });
   ```

7. **Database Backups**
   - Daily automated backups
   - Encrypted backup storage
   - Test restore process monthly

---

### Risk 6: Chrome Web Store Rejection

**Probability:** Low
**Impact:** Medium (distribution issue)
**Status:** Planned

**Description:**
- Chrome Web Store rejects Extension
- Violates store policies
- Manual installation required

**Mitigation Strategies:**

1. **Policy Compliance**
   - Clear privacy policy
   - No obfuscated code
   - Request only necessary permissions
   - Transparent about data usage

2. **Privacy Policy (Draft)**
   ```
   OF Manager Extension Privacy Policy

   Data Collection:
   - We collect messages from OnlyFans (with your consent)
   - Data is sent to our secure servers
   - We do NOT sell or share your data

   Permissions Used:
   - activeTab: To read/write messages on OnlyFans
   - storage: To save settings locally

   Data Storage:
   - Messages stored on our servers (encrypted)
   - You can delete your data anytime

   Contact: privacy@our-platform.com
   ```

3. **Fallback: Unpacked Extension**
   - If store rejection: users load manually
   - Instructions for developer mode installation
   - Less convenient but still works

---

## MEDIUM RISKS (Manageable)

### Risk 7: AI Generates Inappropriate Content

**Probability:** Low
**Impact:** Medium (brand damage, OF policy violation)
**Status:** Planned

**Mitigation:**
- Content filter on AI responses (see 05-AI-INTEGRATION.md)
- Operator review before sending
- Logging of all AI suggestions

---

### Risk 8: Operator Training / Adoption Issues

**Probability:** Medium
**Impact:** Medium (slow adoption)
**Status:** Planned

**Mitigation:**
- Comprehensive operator manual
- Video tutorials
- Onboarding flow in Dashboard
- Allen's team training session

---

### Risk 9: WebSocket Connection Issues

**Probability:** Medium
**Impact:** Medium (delayed messages)
**Status:** Planned

**Mitigation:**
- Automatic reconnection logic
- Fallback to polling if WebSocket fails
- Message queue for offline periods

```javascript
const socket = io('https://api.our-platform.com', {
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000
});

socket.on('disconnect', () => {
  console.log('WebSocket disconnected, falling back to polling');
  startPolling();
});

socket.on('reconnect', () => {
  console.log('WebSocket reconnected, stopping polling');
  stopPolling();
});
```

---

### Risk 10: Vendor Lock-in (OpenAI, Pinecone)

**Probability:** Low
**Impact:** Medium (dependency risk)
**Status:** Planned

**Mitigation:**
- Abstraction layer for AI service
- Can swap OpenAI → Claude
- Can swap Pinecone → Weaviate or ChromaDB
- Keep interfaces generic

```javascript
// AI Service Interface
class AIService {
  async generateResponse(context) {
    throw new Error('Not implemented');
  }
}

// OpenAI Implementation
class OpenAIService extends AIService {
  async generateResponse(context) {
    return await openai.chat.completions.create({...});
  }
}

// Claude Implementation (backup)
class ClaudeService extends AIService {
  async generateResponse(context) {
    return await anthropic.messages.create({...});
  }
}

// Use abstraction
const aiService = new OpenAIService(); // Easy to swap
```

---

## Risk Monitoring Dashboard

**Metrics to Track:**

1. **Extension Health**
   - Successful message scrapes per hour
   - DOM structure verification failures
   - Account warnings/bans

2. **AI Performance**
   - Response generation time (avg)
   - OpenAI API errors
   - Cost per day

3. **System Health**
   - API response times (p50, p95, p99)
   - Database query times
   - WebSocket connection uptime
   - Error rates

4. **Security Alerts**
   - Failed login attempts
   - Rate limit violations
   - Unusual API usage patterns

**Implementation:**
- Real-time monitoring dashboard
- Email/Slack alerts for critical issues
- Weekly risk review meeting

---

## Emergency Procedures

### IF Chrome Extension is Banned:
1. Immediately switch to Manual Bridge mode
2. Notify all operators
3. Update dashboard with manual workflow
4. Continue providing AI + CRM value

### IF OpenAI API is Down:
1. Switch to fallback responses
2. Queue requests for retry
3. Consider temporary Claude migration
4. Notify operators of degraded AI quality

### IF Database is Compromised:
1. Immediately shut down API
2. Restore from latest backup
3. Change all credentials
4. Audit access logs
5. Notify Allen + affected users
6. Implement additional security measures

---

## n8n-SPECIFIC RISKS (Hybrid Architecture)

### Risk 11: n8n Workflow Versioning Issues

**Probability:** Medium
**Impact:** Medium
**Status:** Planned

**Description:**
- n8n workflows stored in UI, not Git
- Hard to track changes and rollback
- Accidental workflow modification can break production
- No clear diff/merge for collaboration

**Mitigation:**
1. **Manual Workflow Export (Weekly)**
   - Export all workflows as JSON
   - Store in `/root/OF/n8n-workflows/` directory
   - Commit to Git with descriptive messages
   - Example: `n8n-workflows/process-message-v1.2.json`

2. **Workflow Documentation**
   - Document each workflow purpose in comments
   - Keep screenshots of workflow diagrams
   - Maintain changelog for workflow updates

3. **Testing Environment**
   - Duplicate workflows for testing (suffix: `-test`)
   - Never modify production workflows directly
   - Test in `-test` workflow first, then copy to production

4. **Backup Before Changes**
   - Always export current workflow before editing
   - Keep last 3 versions as backups
   - Label with date: `process-message-2025-11-24.json`

**Rollback Plan:**
- Import previous workflow JSON via n8n UI
- Activate restored workflow
- Deactivate broken workflow

---

### Risk 12: n8n Server Downtime

**Probability:** Low
**Impact:** High (AI suggestions stop working)
**Status:** Planned

**Description:**
- n8n Docker container crashes
- n8n UI becomes unresponsive
- Webhook endpoints return 500 errors
- AI processing pipeline halts

**Mitigation:**
1. **Docker Auto-Restart**
   ```yaml
   # docker-compose.yml
   n8n:
     restart: always
   ```

2. **Health Check Endpoint**
   - n8n has built-in health endpoint: `http://localhost:5678/healthz`
   - Monitor every 60 seconds
   - Alert if down for > 2 minutes

3. **Fallback to Backend API**
   - Chrome Extension detects n8n webhook failure
   - Falls back to direct Backend API call
   - Backend returns cached/default responses
   - Operator manually writes message (degraded mode)

4. **Quick Recovery**
   ```bash
   # Emergency restart
   docker-compose restart n8n
   # Check logs
   docker-compose logs -f n8n
   ```

---

### Risk 13: n8n Workflow Complexity Limits

**Probability:** Medium (post-MVP)
**Impact:** Medium
**Status:** Planned

**Description:**
- As AI logic grows, n8n workflows become unwieldy
- Hard to debug complex multi-branch workflows
- Performance degradation with too many nodes
- Limited error handling compared to pure code

**Mitigation:**
1. **Keep Workflows Simple**
   - One workflow = one main purpose
   - Break complex logic into sub-workflows
   - Use Function nodes for JavaScript logic (max 50 lines)

2. **Migration Path to Pure Code**
   - After MVP, if workflows become too complex:
   - Migrate AI logic to Node.js Backend
   - Use LangChain/LangGraph for advanced features
   - Keep n8n for simple scheduled tasks only

3. **Performance Monitoring**
   - Track n8n webhook response times
   - If > 5 seconds average → optimize or migrate
   - Use n8n built-in execution logs for debugging

**Decision Point:** Post-MVP (Week 12+)
- If n8n workflows work well → keep using
- If too complex/slow → migrate to pure Node.js

---

## Decision Matrix

| Risk | Probability | Impact | Priority | Status |
|------|-------------|--------|----------|--------|
| Extension Ban | Medium | Critical | P0 | Planned |
| OpenAI Rate Limit | Low | High | P1 | Planned |
| DB Performance | Medium | Medium | P2 | Planned |
| DOM Changes | Medium | High | P1 | Planned |
| Security Breach | Low | Critical | P0 | Planned |
| Web Store Rejection | Low | Medium | P3 | Planned |
| Inappropriate AI | Low | Medium | P2 | Planned |
| Operator Adoption | Medium | Medium | P3 | Planned |
| WebSocket Issues | Medium | Medium | P3 | Planned |
| Vendor Lock-in | Low | Medium | P4 | Planned |
| **n8n Workflow Versioning** | **Medium** | **Medium** | **P2** | **Planned** |
| **n8n Server Downtime** | **Low** | **High** | **P1** | **Planned** |
| **n8n Complexity Limits** | **Medium** | **Medium** | **P3** | **Planned** |

**Priority Levels:**
- P0: Must address before launch
- P1: Address during MVP
- P2: Address in post-MVP
- P3: Monitor and address if needed
- P4: Low priority

---

**Status:** Risk management framework established
**Next Review:** Weekly during development
