# Database Schema Research

**Date:** December 2, 2025
**Purpose:** Analyze competitor database schemas to optimize our OF Agency Platform schema

---

## Sources Analyzed

| Source | Type | Last Updated | Value |
|--------|------|--------------|-------|
| **OF-Scraper** | Python/SQLite | Oct 2025 | High - production-ready schema |
| **OnlyFansAPI.com** | Third-party API docs | 2025 | High - API response structures |
| **Barklim/onlyfExtension** | Chrome Extension | Oct 2023 | Low - basic tutorial only |
| **UltimaScraper** | Python scraper | Nov 2025 | Medium - similar to OF-Scraper |

---

## OF-Scraper Database Schema (SQLite)

### Tables Found:

#### 1. `profiles` - User/Creator profiles
```sql
CREATE TABLE profiles (
    id INTEGER NOT NULL PRIMARY KEY,
    user_id INTEGER NOT NULL,      -- OF user ID
    username VARCHAR NOT NULL,
    UNIQUE (user_id, username)
);
```

#### 2. `models` - Model tracking
```sql
CREATE TABLE models (
    id INTEGER NOT NULL PRIMARY KEY,
    model_id INTEGER NOT NULL UNIQUE
);
```

#### 3. `messages` - Chat messages
```sql
CREATE TABLE messages (
    id INTEGER NOT NULL PRIMARY KEY,
    post_id INTEGER NOT NULL,      -- OF message ID
    text VARCHAR,
    price INTEGER,                 -- PPV price
    paid BOOLEAN,                  -- Was PPV unlocked
    archived BOOLEAN,
    created_at TIMESTAMP,
    user_id INTEGER,               -- Sender ID (fromUser)
    model_id INTEGER,
    UNIQUE (post_id, model_id)
);
```

#### 4. `posts` - Timeline posts
```sql
CREATE TABLE posts (
    id INTEGER NOT NULL PRIMARY KEY,
    post_id INTEGER NOT NULL,
    text VARCHAR,
    price INTEGER,
    paid INTEGER,
    archived BOOLEAN,
    pinned BOOLEAN,
    stream BOOLEAN,                -- Live stream post
    opened BOOLEAN,                -- Was viewed
    created_at TIMESTAMP,
    model_id INTEGER,
    UNIQUE (post_id, model_id)
);
```

#### 5. `medias` - Media files
```sql
CREATE TABLE medias (
    id INTEGER NOT NULL PRIMARY KEY,
    media_id INTEGER,
    post_id INTEGER NOT NULL,
    link VARCHAR,                  -- CDN URL
    directory VARCHAR,             -- Local save path
    filename VARCHAR,
    size INTEGER,
    api_type VARCHAR,              -- posts, messages, stories, etc.
    media_type VARCHAR,            -- image, video, audio, gif
    preview INTEGER,               -- Preview available
    linked BOOL,
    downloaded BOOL,
    created_at TIMESTAMP,
    posted_at TIMESTAMP,
    duration VARCHAR,              -- Video duration
    unlocked BOOL,                 -- PPV unlocked
    hash VARCHAR,                  -- File hash for dedup
    model_id INTEGER,
    UNIQUE (media_id, model_id, post_id)
);
```

#### 6. `stories` - Stories/Highlights
```sql
CREATE TABLE stories (
    id INTEGER NOT NULL PRIMARY KEY,
    post_id INTEGER NOT NULL,
    text VARCHAR,
    price INTEGER,
    paid INTEGER,
    archived BOOLEAN,
    created_at TIMESTAMP,
    model_id INTEGER,
    UNIQUE (post_id, model_id)
);
```

#### 7. `labels` - Post labels/categories
```sql
CREATE TABLE labels (
    id INTEGER NOT NULL PRIMARY KEY,
    label_id INTEGER,
    name VARCHAR,
    type VARCHAR,
    post_id INTEGER,
    model_id INTEGER,
    UNIQUE (post_id, label_id, model_id)
);
```

#### 8. `products` - Digital products
```sql
CREATE TABLE products (
    id INTEGER NOT NULL PRIMARY KEY,
    post_id INTEGER NOT NULL,
    text VARCHAR,
    price INTEGER,
    paid INTEGER,
    archived BOOLEAN,
    created_at TIMESTAMP,
    title VARCHAR,
    model_id INTEGER,
    UNIQUE (post_id, model_id)
);
```

#### 9. `others` - Other content types
```sql
CREATE TABLE others (
    id INTEGER NOT NULL PRIMARY KEY,
    post_id INTEGER NOT NULL,
    text VARCHAR,
    price INTEGER,
    paid INTEGER,
    archived BOOLEAN,
    created_at TIMESTAMP,
    model_id INTEGER,
    UNIQUE (post_id, model_id)
);
```

#### 10. `schema_flags` - Migration tracking
```sql
CREATE TABLE schema_flags (
    flag_name TEXT PRIMARY KEY,
    flag_value TEXT
);
```

---

## OF Model Class Properties (from API)

From `OF-Scraper/ofscraper/classes/of/models.py`:

```python
# User/Model properties from OF API response:
- id                    # OF user ID
- username              # @handle
- avatar                # Avatar URL
- header                # Header/banner URL
- currentSubscribePrice # Current subscription price
- subscribedByData      # Subscription info object
- subscribedByExpireDate
- subscribePrice        # Regular price
- promotions[]          # Array of promo offers
  - price
  - canClaim
- lastSeen              # Last activity timestamp
- isRealPerformer       # Verified performer
- isRestricted          # Restricted account
```

---

## OnlyFans API Response Structures (Third-Party Docs)

### Chat/Message Structure:
```json
{
  "text": "Message content",
  "mediaFiles": ["ofapi_media_123", 3866342509],
  "price": 5,
  "rfTag": [user_ids]  // Tag other creators
}
```

### User Profile Fields:
- `id`, `username`, `displayName`, `avatar`
- `followersCount`, `postsCount`
- `isVerified`, `subscriptionPrice`
- `lastSeen`

---

## Comparison: Our Schema vs OF-Scraper

| Feature | Our Schema | OF-Scraper | Action Needed |
|---------|------------|------------|---------------|
| Agency multi-tenancy | Yes (agencies table) | No | Keep |
| User roles | Yes (owner/admin/chatter) | No | Keep |
| Fan tracking | Basic (fan_of_id, username) | Basic (user_id) | Enhance |
| Message direction | Yes (direction field) | Yes (user_id = sender) | OK |
| PPV tracking | Basic (is_ppv, price) | Yes (paid, price, unlocked) | Add `unlocked` |
| Media files | No separate table | Yes (medias table) | Consider adding |
| Posts/Stories | No | Yes | Not needed for chat tool |
| Labels/Tags | Basic (tags array) | Yes (labels table) | OK for now |
| AI response tracking | Yes (ai_responses) | No | Keep - unique to us! |
| Session management | Yes (sessions) | No | Keep |
| Subscription tracking | No | Has in model class | Consider for analytics |

---

## Recommendations for Schema Optimization

### 1. Add to `messages` table:
```sql
-- Missing fields:
unlocked BOOLEAN DEFAULT FALSE,     -- PPV was unlocked by fan
read_at TIMESTAMP,                  -- When message was read
```

### 2. Add to `chats` table:
```sql
-- Missing fields:
fan_avatar_url TEXT,                -- Fan's avatar for UI
subscription_active BOOLEAN,        -- Is fan currently subscribed
subscription_price DECIMAL(10,2),   -- What fan pays
first_message_at TIMESTAMP,         -- For fan journey tracking
```

### 3. Add to `models` table:
```sql
-- Missing fields:
of_user_id BIGINT,                  -- Numeric OF ID for API calls
header_url TEXT,                    -- Banner image
subscription_price DECIMAL(10,2),   -- Current price
is_verified BOOLEAN DEFAULT FALSE,
last_seen_at TIMESTAMP,
```

### 4. Consider new table: `media_attachments`
```sql
CREATE TABLE media_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id),
    of_media_id BIGINT,             -- OF media ID
    media_type VARCHAR(50),         -- image, video, audio, gif
    url TEXT,                       -- CDN URL (temporary)
    thumbnail_url TEXT,
    duration INTEGER,               -- Seconds for video
    is_preview BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Consider new table: `fan_stats` (for analytics)
```sql
CREATE TABLE fan_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chat_id UUID REFERENCES chats(id),
    total_tips DECIMAL(10,2) DEFAULT 0,
    total_ppv_purchased DECIMAL(10,2) DEFAULT 0,
    messages_sent INTEGER DEFAULT 0,
    messages_received INTEGER DEFAULT 0,
    avg_response_time_seconds INTEGER,
    last_purchase_at TIMESTAMP,
    engagement_score INTEGER,       -- Calculated score
    updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Priority Changes (Immediate)

### High Priority:
1. Add `unlocked` to messages (PPV tracking)
2. Add `of_user_id` to models (API compatibility)
3. Add `subscription_active` to chats (fan status)

### Medium Priority:
4. Add `fan_avatar_url` to chats (UI)
5. Add media_attachments table (if storing media refs)

### Low Priority (Phase 2):
6. Fan stats table (analytics)
7. Subscription tracking

---

## Migration Script

```sql
-- 002_schema_optimization.sql

-- Add missing message fields
ALTER TABLE messages ADD COLUMN IF NOT EXISTS unlocked BOOLEAN DEFAULT FALSE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;

-- Add missing chat fields
ALTER TABLE chats ADD COLUMN IF NOT EXISTS fan_avatar_url TEXT;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS subscription_active BOOLEAN DEFAULT TRUE;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS first_message_at TIMESTAMP;

-- Add missing model fields
ALTER TABLE models ADD COLUMN IF NOT EXISTS of_user_id BIGINT;
ALTER TABLE models ADD COLUMN IF NOT EXISTS header_url TEXT;
ALTER TABLE models ADD COLUMN IF NOT EXISTS subscription_price DECIMAL(10,2);
ALTER TABLE models ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE models ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP;

-- Create index for of_user_id
CREATE INDEX IF NOT EXISTS idx_models_of_user_id ON models(of_user_id);
```

---

## Key Insights

1. **OF-Scraper is content-focused** (downloading media), we are **chat-focused** (AI responses)
2. **Our ai_responses table is unique** - no competitor tracks AI generation metrics
3. **Multi-tenancy is our differentiator** - agencies table allows proper B2B model
4. **We don't need media storage** - just references for context
5. **Fan analytics will be valuable** - track spending patterns for AI personalization

---

## Sources

- [OnlyFansAPI.com Documentation](https://docs.onlyfansapi.com/introduction)
- [OF-API Documentation](https://www.of-api.com/documentation)
- [OF-Scraper GitHub](https://github.com/datawhores/OF-Scraper)
- Local clone: `/root/OF/research/github-repos/OF-Scraper/`

---

**Last Updated:** December 2, 2025
