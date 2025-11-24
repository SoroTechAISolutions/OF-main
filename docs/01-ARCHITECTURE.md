# 01 - SYSTEM ARCHITECTURE

**Last Updated:** November 24, 2025

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  OPERATOR'S BROWSER                      │
│  ┌────────────────────┐  ┌──────────────────────────┐  │
│  │ Chrome Extension   │  │  React Dashboard         │  │
│  │ (OF Integration)   │  │  (localhost:3001)        │  │
│  └────────┬───────────┘  └──────────┬───────────────┘  │
│           │                          │                   │
└───────────┼──────────────────────────┼───────────────────┘
            │ HTTPS                    │ HTTPS + WebSocket
            │                          │
┌───────────▼──────────────────────────▼───────────────────┐
│              BACKEND API SERVER (Node.js)                │
│                   (localhost:3000)                       │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Express + TypeScript                            │  │
│  │  - REST API endpoints                            │  │
│  │  - WebSocket server (Socket.io)                  │  │
│  │  - Authentication (JWT)                          │  │
│  │  - Business logic                                │  │
│  │  - Rate limiting                                 │  │
│  └──────────┬─────────────────┬─────────────────────┘  │
└─────────────┼─────────────────┼────────────────────────┘
              │                 │
              │                 │
    ┌─────────▼─────────┐  ┌───▼──────────────────┐
    │  PostgreSQL DB    │  │   AI Service Layer   │
    │  (localhost:5432) │  │   ┌──────────────┐   │
    │                   │  │   │  LangChain   │   │
    │  - Users          │  │   │  + GPT-4     │   │
    │  - Models         │  │   └──────┬───────┘   │
    │  - Fans           │  │          │           │
    │  - Messages       │  │   ┌──────▼───────┐   │
    │  - Analytics      │  │   │  Pinecone    │   │
    │                   │  │   │  Vector DB   │   │
    └───────────────────┘  │   └──────────────┘   │
                           └──────────────────────┘
    ┌───────────────────┐
    │   Redis Cache     │
    │  (localhost:6379) │
    │  - Sessions       │
    │  - Rate limits    │
    │  - Message queue  │
    └───────────────────┘
```

## Component Details

### 1. Chrome Extension (OF Integration)

**Purpose:** Bridge between OnlyFans web interface and our platform

**Architecture:**
```
Extension Structure:
├── manifest.json        # Extension config
├── content-script.js    # Injected into OF pages
├── background.js        # Service worker
├── popup/               # Extension UI
│   ├── popup.html
│   └── popup.js
└── utils/
    ├── scraper.js       # DOM scraping logic
    ├── api-client.js    # Backend API calls
    └── auth.js          # Authentication
```

**Key Functions:**
1. **Message Scraping (Read)**
   - MutationObserver watches OF DOM for new messages
   - Extracts: fan name, message text, timestamp, media
   - Sends to Backend API via REST

2. **Message Sending (Write)**
   - Receives AI suggestions from Backend
   - Injects message into OF chat input
   - Simulates human behavior (typing delays, mouse movements)
   - Clicks send button programmatically

3. **Anti-Detection**
   - Random delays between actions (500-2000ms)
   - Human-like typing speed (50-150ms per char)
   - No rapid API calls (max 1 req/sec)
   - Respects OF rate limits

**Tech Stack:**
- Vanilla JavaScript (lightweight)
- Chrome Extension Manifest V3
- LocalStorage for settings
- Fetch API for Backend communication

---

### 2. Backend API Server

**Purpose:** Core business logic, data persistence, AI orchestration

**Architecture:**
```
Backend Structure:
src/
├── index.ts              # Entry point
├── config/               # Configuration
│   ├── database.ts
│   ├── redis.ts
│   └── env.ts
├── middleware/           # Express middleware
│   ├── auth.ts           # JWT verification
│   ├── rate-limit.ts     # Rate limiting
│   └── error-handler.ts
├── routes/               # API routes
│   ├── auth.routes.ts    # Login/logout
│   ├── messages.routes.ts
│   ├── fans.routes.ts
│   ├── models.routes.ts
│   └── analytics.routes.ts
├── controllers/          # Business logic
│   ├── messages.controller.ts
│   ├── ai.controller.ts
│   └── analytics.controller.ts
├── services/             # External integrations
│   ├── ai.service.ts     # LangChain + GPT-4
│   ├── pinecone.service.ts
│   └── websocket.service.ts
├── models/               # Database models (TypeORM)
│   ├── User.ts
│   ├── Model.ts
│   ├── Fan.ts
│   └── Message.ts
└── utils/
    ├── logger.ts
    └── validators.ts
```

**Key Endpoints:**
```
POST   /api/auth/login              # Operator login
POST   /api/auth/logout             # Operator logout

GET    /api/messages                # Get all messages (paginated)
POST   /api/messages                # Create new message (from Extension)
GET    /api/messages/:id            # Get single message
PUT    /api/messages/:id/read       # Mark as read

POST   /api/ai/suggest              # Generate AI response suggestions
POST   /api/ai/learn                # Update personality profile

GET    /api/fans                    # Get all fans (with filters)
GET    /api/fans/:id                # Get fan details + history
PUT    /api/fans/:id                # Update fan notes/tags

GET    /api/models                  # Get all models
POST   /api/models                  # Add new model
PUT    /api/models/:id/personality  # Update personality profile

GET    /api/analytics/revenue       # Revenue stats
GET    /api/analytics/performance   # Operator performance

WebSocket: /ws                      # Real-time updates
```

**Tech Stack:**
- Node.js 20 LTS
- Express 4.x
- TypeScript 5.x
- TypeORM (PostgreSQL ORM)
- Socket.io (WebSocket)
- Redis for caching
- JWT for authentication

---

### 3. AI Service Layer

**Purpose:** Generate contextual, personalized responses using GPT-4

**Architecture:**
```
AI Pipeline:
1. Receive message context from Backend
2. Retrieve conversation history from Pinecone
3. Load model personality profile
4. Generate prompt with LangChain
5. Call GPT-4 Turbo API
6. Post-process and validate response
7. Return 3-5 variations to Backend
```

**Prompt Structure:**
```
System: You are a flirty, engaging OnlyFans model named [MODEL_NAME].
Personality: [PERSONALITY_TRAITS]
Context: Last 10 messages with this fan
Fan Profile: [SPENDING_TIER, PREFERENCES, TAGS]
Current Message: [FAN_MESSAGE]

Task: Generate 3-5 engaging response options.
Constraints:
- Keep responses under 200 characters
- Match model's tone and style
- Suggest PPV if fan is a whale and context is appropriate
- Be flirty but not explicit (OF content policy)
```

**Tech Stack:**
- LangChain (orchestration framework)
- OpenAI GPT-4 Turbo API
- Pinecone Vector DB (conversation memory)
- Embeddings: OpenAI text-embedding-3-small

**Key Features:**
1. **Context Awareness**
   - Remembers last 20 messages with each fan
   - Understands conversation flow
   - Avoids repetition

2. **Personality Matching**
   - Each model has a personality profile
   - AI mimics writing style, tone, emoji usage
   - Learns from operator edits (future)

3. **PPV Intelligence**
   - Detects when fan is likely to purchase
   - Suggests appropriate PPV content
   - Considers fan spending tier

---

### 4. React Dashboard

**Purpose:** Operator interface for managing conversations

**Architecture:**
```
Dashboard Structure:
src/
├── App.tsx                # Main app component
├── pages/
│   ├── Login.tsx          # Login page
│   ├── Inbox.tsx          # Main inbox (WhatsApp-style)
│   ├── FanProfile.tsx     # Fan details page
│   └── Analytics.tsx      # Analytics dashboard
├── components/
│   ├── ChatList.tsx       # Left sidebar with all chats
│   ├── ChatWindow.tsx     # Center panel with messages
│   ├── AISuggestions.tsx  # AI response options
│   ├── FanCRM.tsx         # Right sidebar with fan info
│   └── QuickActions.tsx   # PPV/Teaser/Follow-up buttons
├── hooks/
│   ├── useWebSocket.ts    # WebSocket connection
│   ├── useMessages.ts     # Message state management
│   └── useAuth.ts         # Authentication
├── services/
│   ├── api.ts             # Backend API client
│   └── websocket.ts       # WebSocket client
└── styles/
    └── tailwind.css       # Tailwind CSS
```

**Key Features:**
1. **Real-time Updates**
   - WebSocket connection for instant message delivery
   - Auto-scroll to new messages
   - Desktop notifications

2. **Priority Queue**
   - Chats sorted by fan spending tier
   - VIP/Whale tags highlighted
   - Unread counter per chat

3. **One-Click AI**
   - Click message → fetch AI suggestions
   - Display 3-5 options
   - Edit → Send in one flow

**Tech Stack:**
- React 18
- TypeScript
- Tailwind CSS
- Zustand (state management)
- React Query (data fetching)
- Socket.io-client (WebSocket)

---

### 5. PostgreSQL Database

**Schema Design:**
```sql
-- Users (Operators)
users:
  - id (UUID, PK)
  - email (VARCHAR, UNIQUE)
  - password_hash (VARCHAR)
  - role (ENUM: admin, operator)
  - created_at, updated_at

-- Models (OF Creators)
models:
  - id (UUID, PK)
  - name (VARCHAR)
  - of_username (VARCHAR, UNIQUE)
  - personality_profile (JSONB)
  - created_at, updated_at

-- Fans (OF Subscribers)
fans:
  - id (UUID, PK)
  - of_user_id (VARCHAR, UNIQUE)
  - username (VARCHAR)
  - spending_tier (ENUM: whale, regular, low)
  - total_spent (DECIMAL)
  - tags (JSONB)
  - notes (TEXT)
  - model_id (UUID, FK → models)
  - created_at, updated_at

-- Messages
messages:
  - id (UUID, PK)
  - fan_id (UUID, FK → fans)
  - model_id (UUID, FK → models)
  - direction (ENUM: incoming, outgoing)
  - content (TEXT)
  - media_url (VARCHAR, nullable)
  - is_read (BOOLEAN)
  - is_ai_generated (BOOLEAN)
  - operator_id (UUID, FK → users, nullable)
  - created_at

-- Analytics (Aggregated)
revenue_stats:
  - id (UUID, PK)
  - model_id (UUID, FK → models)
  - date (DATE)
  - tips_total (DECIMAL)
  - ppv_total (DECIMAL)
  - subscriptions_total (DECIMAL)
  - messages_sent (INTEGER)
```

---

### 6. Redis Cache

**Purpose:** Fast caching and session management

**Use Cases:**
1. **Session Storage**
   - JWT tokens and user sessions
   - TTL: 24 hours

2. **Rate Limiting**
   - Track API requests per user/IP
   - Prevent abuse

3. **Message Queue**
   - Queue AI processing requests
   - Handle async tasks

---

## Data Flow Examples

### Flow 1: New Message from Fan
```
1. Fan sends message on OF
2. Extension detects new message (MutationObserver)
3. Extension scrapes message content
4. Extension → POST /api/messages (Backend)
5. Backend saves to PostgreSQL
6. Backend → WebSocket broadcast to Dashboard
7. Dashboard displays new message + notification
8. Operator clicks message
9. Dashboard → POST /api/ai/suggest (Backend)
10. Backend → AI Service generates 3-5 options
11. Backend returns suggestions to Dashboard
12. Operator selects/edits option → clicks Send
13. Dashboard → Extension (via Background Script)
14. Extension types message into OF input
15. Extension clicks Send button
16. Message appears on OF
```

### Flow 2: Operator Sends Message
```
1. Operator types/selects AI suggestion in Dashboard
2. Dashboard → POST /api/messages (Backend)
3. Backend saves to PostgreSQL
4. Backend → Extension (via WebSocket or polling)
5. Extension injects message into OF chat
6. Extension simulates user interaction
7. Extension clicks Send on OF
8. Message delivered to fan
9. Extension confirms delivery → Backend
10. Backend updates message status
```

---

## Deployment Architecture

### Development (Current - Ivan's Server)
```
Docker Compose Setup:
- backend: Node.js API (port 3000)
- frontend: React dev server (port 3001)
- postgres: PostgreSQL (port 5432)
- redis: Redis (port 6379)
- nginx: Reverse proxy (port 80/443)
```

### Production (Future - Allen's Server)
```
Same Docker Compose setup
Migration: Export Docker images + PostgreSQL dump
Deploy: docker-compose up on new server
Update: DNS + Extension API endpoint
```

---

## Security Considerations

1. **Authentication**
   - JWT tokens with short expiration (24h)
   - Refresh token rotation
   - Password hashing (bcrypt, 10 rounds)

2. **API Security**
   - Rate limiting (100 req/min per user)
   - CORS whitelist
   - Input validation on all endpoints
   - SQL injection prevention (TypeORM parameterized queries)

3. **Data Privacy**
   - HTTPS everywhere
   - Encrypted database backups
   - No logging of message content in prod
   - GDPR compliance (data deletion endpoints)

4. **OF Integration**
   - No credentials stored in Extension
   - All API calls through Backend (auth tokens in Backend only)
   - Extension permissions: minimal (activeTab, storage)

---

**Next:** See `02-TECH-STACK.md` for detailed technology choices.
