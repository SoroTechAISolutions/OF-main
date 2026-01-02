# Auto-Reply Worker Documentation

**Created:** December 29, 2025
**Status:** MVP Implementation (will likely be rewritten)
**Location:** `/root/OF/backend/src/workers/autoReplyWorker.ts`

---

## Overview

Fully automated AI response system for Fanvue. The worker runs every 30 seconds, checks for unread messages from fans, generates AI responses, and sends them automatically via Fanvue API.

**IMPORTANT:** This is MVP implementation. Will need refactoring for:
- Better error handling
- Rate limiting per model
- Queue-based processing (Redis/Bull)
- Configurable reply delays per model
- Support for OnlyFans (when API available)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Auto-Reply Worker                         │
│                   (runs every 30 sec)                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Get models with auto_reply_enabled = true               │
│     AND fanvue_access_token IS NOT NULL                     │
│     AND fanvue_user_uuid IS NOT NULL                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. For each model: GET /chats?filter=unread                │
│     via Fanvue API                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. For each unread chat:                                   │
│     - Skip BROADCAST messages                               │
│     - Skip AUTOMATED_* messages                             │
│     - Skip if last message is from model (already replied)  │
│     - Skip if replied recently (delay check)                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Generate AI response via n8n webhook                    │
│     - Uses model's persona_id                               │
│     - Passes fan's message text                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  5. Send response via Fanvue API                            │
│     POST /chats/{fanUserUuid}/message                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  6. Log to ai_responses table (unified with webhooks)       │
│     via logAIResponse() service                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Models Table (new columns)
```sql
ALTER TABLE models ADD COLUMN auto_reply_enabled BOOLEAN DEFAULT false;
ALTER TABLE models ADD COLUMN auto_reply_delay_seconds INTEGER DEFAULT 30;
```

### AI Responses Table (unified logging)
```sql
-- Both webhook and worker log here via logAIResponse()
INSERT INTO ai_responses (
  model_id, input_text, output_text,
  latency_ms
) VALUES ($1, $2, $3, $4);
```

---

## API Endpoint

### Enable/Disable Auto-Reply
```
PUT /api/models/:id/auto-reply
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "enabled": true,
  "delaySeconds": 30  // optional, default 30
}
```

**Response:**
```json
{
  "success": true,
  "data": { "model": {...} },
  "message": "Auto-reply enabled"
}
```

---

## Fanvue API Integration

### Chat Structure (from Fanvue)
```json
{
  "createdAt": "2025-12-20T13:06:20.228Z",
  "lastMessageAt": "2025-12-29T12:27:56.568Z",
  "isRead": false,
  "unreadMessagesCount": 1,
  "isMuted": false,
  "user": {
    "uuid": "d5cc048d-e2f3-46b5-82ef-19abc0d888ad",
    "handle": "elena.rae",
    "displayName": "Elena Rae",
    "avatarUrl": "https://media.fanvue.com/..."
  },
  "lastMessage": {
    "sentAt": "2025-12-29T12:27:56.568Z",
    "text": "Hey cutie!",
    "hasMedia": false,
    "type": "SINGLE_RECIPIENT",  // or BROADCAST, AUTOMATED_NEW_FOLLOWER
    "uuid": "0e01b4d4-a23b-4a4d-a925-60df1bf92499",
    "senderUuid": "d5cc048d-e2f3-46b5-82ef-19abc0d888ad"
  }
}
```

### Message Structure (from GET /chats/{uuid}/messages)
```json
{
  "uuid": "79dcb1ac-e634-4435-afc7-07d692623f8a",
  "text": "Message content here",
  "sentAt": "2025-12-20T12:50:52.675Z",
  "sender": {
    "uuid": "4c4a01f2-6b7c-4d58-9780-fa5cad987dfa",
    "handle": "maria05"
  },
  "recipient": {
    "uuid": "d5d6f403-d3c9-4c22-bbc0-994f08aa730c",
    "handle": "musevues"
  },
  "hasMedia": false,
  "mediaType": null,
  "type": "SINGLE_RECIPIENT"  // AUTOMATED_NEW_FOLLOWER, BROADCAST, etc.
}
```

### Key Logic Points
1. **Chat ID = user.uuid** - Fanvue doesn't have separate chat IDs, uses fan's UUID
2. **Message direction** - Compare `sender.uuid` with model's `fanvue_user_uuid`
3. **Skip broadcasts** - `lastMessage.type === 'BROADCAST'`
4. **Skip automated** - `type.startsWith('AUTOMATED')`

---

## Files

| File | Purpose |
|------|---------|
| `src/workers/autoReplyWorker.ts` | Main worker logic |
| `src/services/fanvueService.ts` | Fanvue API calls (getChats, getChatMessages, sendMessage) |
| `src/services/aiService.ts` | AI generation via n8n |
| `src/routes/models.ts` | API endpoint for enable/disable |
| `src/services/modelService.ts` | setAutoReply function |

---

## Configuration

### Environment Variables
```bash
# n8n webhook for AI generation
N8N_WEBHOOK_URL=https://n8n.sorotech.ru/webhook/muse-chat
```

### Worker Settings
```typescript
// In autoReplyWorker.ts
const WORKER_INTERVAL_SECONDS = 30;  // How often worker runs
const MAX_PROCESSED_CACHE = 10000;   // Cache size for processed message IDs
```

### Per-Model Settings
```sql
-- In models table
auto_reply_enabled = true/false
auto_reply_delay_seconds = 30  -- Min seconds between replies to same chat
```

---

## Logs

Worker logs to console with `[AutoReply]` prefix:
```
[AutoReply] Processing 1 models with auto-reply enabled
[AutoReply] Model testmodel: 8 unread chats
[AutoReply] Processing message from elena.rae: "Hey cutie!..."
[AutoReply] Generated response: "Hey there, gorgeous!..."
[AutoReply] ✓ Sent response to elena.rae
[AutoReply] ✓ Sent 1 auto-replies this tick
```

---

## Known Limitations (MVP)

1. **No queue** - Direct processing, no retry on failure
2. **In-memory cache** - Processed messages lost on restart
3. **Single instance only** - No distributed locking
4. **No rate limiting** - Could hit Fanvue API limits
5. **Fixed interval** - 30 sec for all models

---

## Future Improvements

### Phase 1: Stability
- [ ] Redis-based processed message cache
- [ ] Retry logic with exponential backoff
- [ ] Better error handling per chat

### Phase 2: Scalability
- [ ] Bull/BullMQ job queue
- [ ] Per-model rate limiting
- [ ] Distributed locking (Redis)

### Phase 3: Features
- [ ] Configurable reply delay per model
- [ ] Working hours (don't reply at night)
- [ ] Message filtering (keywords, length)
- [ ] OnlyFans support (when API available)

### Phase 4: Intelligence
- [ ] Chat history context (Pinecone)
- [ ] Fan sentiment analysis
- [ ] Auto-upsell triggers
- [ ] A/B testing responses

---

## Testing

### Manual Enable
```bash
docker exec postgres psql -U learnmate -d of_agency_db -c "
  UPDATE models
  SET auto_reply_enabled = true
  WHERE id = 'd28611ae-23d7-4160-a476-5d59b7ff1d8c'
"
```

### Check Logs
```bash
docker logs of-backend --tail 50 | grep AutoReply
```

### Check Stats
```bash
docker exec postgres psql -U learnmate -d of_agency_db -c "
  SELECT COUNT(*) as total,
         COUNT(*) FILTER (WHERE was_used = true) as auto_sent
  FROM ai_responses
  WHERE created_at > NOW() - INTERVAL '24 hours'
"
```

---

## Troubleshooting

### Worker not running
```bash
# Check if backend is running
docker ps | grep of-backend

# Restart backend
docker restart of-backend

# Check logs
docker logs of-backend --tail 100
```

### No responses being sent
1. Check `auto_reply_enabled = true` for model
2. Check `fanvue_access_token` is not null
3. Check `fanvue_user_uuid` is not null
4. Check if messages are BROADCAST or AUTOMATED (skipped)
5. Check if model already replied (last message from model)

### AI not generating
```bash
# Test n8n webhook directly
curl -X POST https://n8n.sorotech.ru/webhook/muse-chat \
  -H "Content-Type: application/json" \
  -d '{"chatInput": "hey babe", "systemMessage": "You are a flirty model"}'
```
