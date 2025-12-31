# Fanvue API - Complete Integration Guide

**Date:** December 16, 2025
**API Docs:** https://api.fanvue.com/docs
**Developer Portal:** https://fanvue.com/developers/apps
**Status:** ✅ Credentials obtained, ready for implementation

---

## Executive Summary

Fanvue has an **official public API** with OAuth 2.0 authentication. Unlike OnlyFans (which requires DOM scraping via Chrome Extension), Fanvue offers clean server-side integration.

### Platform Comparison

| Aspect | OnlyFans | Fanvue |
|--------|----------|--------|
| **API** | None (DOM scraping) | Official OAuth 2.0 |
| **Integration** | Chrome Extension | Server-side API |
| **Risk Level** | Medium (ToS gray area) | Zero (official API) |
| **Real-time** | MutationObserver | Webhooks |
| **Stability** | DOM can change | Versioned API |
| **Rate Limits** | Self-imposed | 100 req/60 sec |

---

## Our Credentials

```env
FANVUE_CLIENT_ID=b6f59ca2-dafe-4a94-9908-5cfa0c356e01
FANVUE_CLIENT_SECRET=*** (see /root/OF/.env.fanvue)
FANVUE_REDIRECT_URI=https://sorotech.ru/of-api/oauth/fanvue/callback
```

---

## Authentication

### OAuth 2.0 with PKCE

**Authorization Endpoint:** `https://auth.fanvue.com/oauth2/auth`
**Token Endpoint:** `https://auth.fanvue.com/oauth2/token`

### Available Scopes

| Scope | Description | We Use |
|-------|-------------|--------|
| `read:self` | User profile info | ✅ |
| `read:chat` | Read conversations, messages | ✅ |
| `write:chat` | Send messages, create chats | ✅ |
| `read:fan` | Fan information | ✅ |
| `read:insights` | Analytics, earnings | ✅ |
| `read:creator` | Creator profiles | ❌ |
| `write:creator` | Modify creator data | ❌ |
| `read:media` | Access media files | ❌ |
| `write:media` | Upload media | ❌ |
| `write:post` | Create posts | ❌ |

### OAuth Flow (PKCE Required)

```
1. Generate code_verifier (random string)
2. Generate code_challenge = SHA256(code_verifier)
3. Redirect to auth endpoint with code_challenge
4. User authorizes on Fanvue
5. Fanvue redirects with authorization_code
6. Exchange code + code_verifier for tokens
7. Use access_token for API calls
8. Refresh with refresh_token when expired
```

### Required Headers for API Calls

```http
Authorization: Bearer <access_token>
X-Fanvue-API-Version: 2025-06-26
Content-Type: application/json
```

---

## Rate Limits

- **100 requests per 60 seconds** (token bucket, refills each minute)
- Headers returned: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

---

## API Endpoints

**Base URL:** `https://api.fanvue.com`

### Users

#### GET /users/me — Current User Profile
**Scope:** `read:self`

```json
{
  "uuid": "...",
  "handle": "creator_handle",
  "displayName": "Creator Name",
  "avatarUrl": "https://..."
}
```

---

### Chats

#### GET /chats — List All Chats
**Scope:** `read:chat`

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | number | 1 | Page number |
| `size` | number | 15 | Items per page (1-50) |
| `filter` | array | - | `unread`, `online`, `subscribers`, etc. |
| `sortBy` | string | `most_recent_messages` | Sort order |
| `search` | string | - | Search by name/handle |
| `smartListIds` | array | - | Filter by smart lists |
| `customListId` | UUID | - | Filter by custom list |

**Response:**
```json
{
  "data": [
    {
      "createdAt": "2025-12-01T10:00:00Z",
      "lastMessageAt": "2025-12-16T15:30:00Z",
      "isRead": false,
      "isMuted": false,
      "unreadMessagesCount": 3,
      "user": {
        "uuid": "fan-uuid",
        "handle": "fan_username",
        "displayName": "Fan Name",
        "nickname": null,
        "isTopSpender": true,
        "avatarUrl": "https://...",
        "registeredAt": "2025-01-15T00:00:00Z"
      },
      "lastMessage": {
        "uuid": "msg-uuid",
        "text": "Hey! Love your content",
        "type": "CHAT_TEXT_*",
        "sentAt": "2025-12-16T15:30:00Z",
        "hasMedia": false,
        "mediaType": null,
        "senderUuid": "..."
      }
    }
  ],
  "pagination": {
    "page": 1,
    "size": 15,
    "hasMore": true
  }
}
```

---

#### GET /chats/{userUuid}/messages — Get Messages in Chat
**Scope:** `read:chat`

**Path Parameters:**
- `userUuid` (UUID) — Fan's UUID

**Query Parameters:**
| Parameter | Type | Default |
|-----------|------|---------|
| `page` | number | 1 |
| `size` | number | 15 (max 50) |

**Response:**
```json
{
  "data": [
    {
      "uuid": "message-uuid",
      "text": "Message content",
      "sentAt": "2025-12-16T15:30:00Z",
      "sender": {
        "uuid": "sender-uuid",
        "handle": "sender_handle"
      },
      "recipient": {
        "uuid": "recipient-uuid",
        "handle": "recipient_handle"
      },
      "hasMedia": false,
      "mediaType": null,
      "type": "CHAT_TEXT_*"
    }
  ],
  "pagination": { "page": 1, "size": 15, "hasMore": false }
}
```

**Message Types:**
- `AUTOMATED_*` — Automated messages
- `BROADCAST` — Mass messages
- `CHAT_TEXT_*` — Regular chat
- `TIP` — Tip notification
- `LOCKED_MESSAGE_UNLOCKED` — PPV unlocked
- `VOICE_CALL` — Voice call
- `SINGLE_RECIPIENT` — Direct message

---

#### POST /chats/{userUuid}/message — Send Message
**Scope:** `write:chat`

**Request Body:**
```json
{
  "text": "Hello! Thanks for subscribing!",
  "mediaUuids": [],
  "price": null,
  "templateUuid": null
}
```

| Field | Type | Description |
|-------|------|-------------|
| `text` | string/null | Message text |
| `mediaUuids` | array | Media UUIDs to attach |
| `price` | number/null | PPV price in cents (min $2.00 = 200) |
| `templateUuid` | UUID/null | Use saved template |

**Response (201 Created):**
```json
{
  "messageUuid": "new-message-uuid"
}
```

---

#### POST /chats/mass-messages — Send Mass Message
**Scope:** `write:chat`, `read:fan`

**Request Body:**
```json
{
  "text": "Hey everyone! New content dropping today!",
  "mediaUuids": [],
  "price": null,
  "includedLists": {
    "smartListIds": ["subscribers", "top_spenders"],
    "customListIds": []
  },
  "excludedLists": {
    "smartListIds": [],
    "customListIds": []
  }
}
```

**Smart List IDs:**
- `all_fans` — All followers
- `subscribers` — Active subscriptions
- `expired_subscribers` — Lapsed subscriptions
- `top_spenders` — Highest spenders

**Response:**
```json
{
  "messageId": "...",
  "recipientCount": 150,
  "createdAt": "..."
}
```

---

### Subscribers

#### GET /subscribers — List Subscribers
**Scope:** `read:fan`

**Query Parameters:**
| Parameter | Type | Default |
|-----------|------|---------|
| `page` | number | 1 |
| `size` | number | 15 (max 50) |

**Response:**
```json
{
  "data": [
    {
      "uuid": "subscriber-uuid",
      "handle": "fan_handle",
      "displayName": "Fan Name",
      "nickname": null,
      "isTopSpender": true,
      "avatarUrl": "https://...",
      "registeredAt": "2025-01-15T00:00:00Z"
    }
  ],
  "pagination": { "page": 1, "size": 15, "hasMore": true }
}
```

---

## Webhooks

Configure in Developer Portal: https://fanvue.com/developers/apps

### Available Events

| Event | Description | Our Endpoint |
|-------|-------------|--------------|
| `message.received` | New fan message | `/webhooks/fanvue/message` |
| `subscriber.new` | New subscription | `/webhooks/fanvue/subscriber` |
| `tip.received` | Tip received | `/webhooks/fanvue/tip` |
| `follower.new` | New follower | (not using) |
| `purchase.received` | PPV purchased | (not using) |

### Webhook Payload Structure (Expected)

```json
{
  "event": "message.received",
  "timestamp": "2025-12-16T15:30:00Z",
  "data": {
    "messageUuid": "...",
    "chatUserUuid": "...",
    "text": "Fan message here",
    "senderHandle": "fan_name"
  }
}
```

*Note: Exact payload structure to be confirmed during implementation*

---

## Integration Architecture

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    FANVUE INTEGRATION                        │
│                                                              │
│  Fan sends message on Fanvue                                │
│          ↓                                                   │
│  Fanvue Webhook → POST /webhooks/fanvue/message             │
│          ↓                                                   │
│  Backend receives, saves to PostgreSQL                      │
│          ↓                                                   │
│  n8n AI Workflow generates response                         │
│          ↓                                                   │
│  Backend calls POST /chats/{uuid}/message                   │
│          ↓                                                   │
│  Response appears in Fanvue chat                            │
└─────────────────────────────────────────────────────────────┘
```

### Comparison: OnlyFans vs Fanvue Flow

**OnlyFans (Extension-based):**
```
Chrome Extension → Scrape DOM → Backend → n8n AI → Extension → Inject to DOM
```

**Fanvue (API-based):**
```
Webhook → Backend → n8n AI → API Call → Done
```

---

## Database Changes

### New Fields for Multi-Platform

```sql
-- Add platform field to existing tables
ALTER TABLE models ADD COLUMN platform VARCHAR(20) DEFAULT 'onlyfans';
ALTER TABLE models ADD COLUMN fanvue_user_uuid UUID;
ALTER TABLE models ADD COLUMN fanvue_access_token TEXT;
ALTER TABLE models ADD COLUMN fanvue_refresh_token TEXT;
ALTER TABLE models ADD COLUMN fanvue_token_expires_at TIMESTAMP;

ALTER TABLE chats ADD COLUMN platform VARCHAR(20) DEFAULT 'onlyfans';
ALTER TABLE chats ADD COLUMN fanvue_chat_user_uuid UUID;

ALTER TABLE messages ADD COLUMN platform VARCHAR(20) DEFAULT 'onlyfans';
ALTER TABLE messages ADD COLUMN fanvue_message_uuid UUID;
```

---

## Backend Implementation Plan

### New Files to Create

| File | Purpose |
|------|---------|
| `src/services/fanvueService.ts` | Fanvue API client |
| `src/services/fanvueOAuthService.ts` | OAuth flow handling |
| `src/routes/fanvue.ts` | Fanvue API routes |
| `src/routes/fanvueWebhooks.ts` | Webhook handlers |
| `migrations/004_fanvue_integration.sql` | DB schema updates |

### API Endpoints to Add

```
OAuth:
  GET  /api/oauth/fanvue/authorize    - Start OAuth flow
  GET  /api/oauth/fanvue/callback     - OAuth callback
  POST /api/oauth/fanvue/refresh      - Refresh tokens

Fanvue:
  GET  /api/fanvue/chats              - List chats (proxy)
  GET  /api/fanvue/chats/:uuid/messages - Get messages
  POST /api/fanvue/chats/:uuid/message  - Send message
  GET  /api/fanvue/subscribers        - List subscribers

Webhooks:
  POST /webhooks/fanvue/message       - New message webhook
  POST /webhooks/fanvue/subscriber    - New subscriber webhook
  POST /webhooks/fanvue/tip           - Tip received webhook
```

---

## Estimated Implementation Time

| Task | Time |
|------|------|
| OAuth flow + token storage | 2-3 hours |
| Fanvue API service | 2-3 hours |
| Webhook handlers | 1-2 hours |
| Database migration | 1 hour |
| Testing & debugging | 2-3 hours |
| **Total** | **8-12 hours** (~1.5 days) |

---

## Resources

- **API Docs:** https://api.fanvue.com/docs
- **Developer Portal:** https://fanvue.com/developers/apps
- **Starter Kit:** https://github.com/fanvue/fanvue-app-starter
- **Chatbot Example:** https://github.com/fanvue/fanvue-chatbot-example
- **Our Credentials:** `/root/OF/.env.fanvue`

---

## ⚠️ Known API Limitations (Discovered Dec 31, 2025)

### 1. No Media URLs in Messages

**Problem:** The `/chats/{userUuid}/messages` endpoint returns `hasMedia: true` and `mediaType: "image"` but **does NOT provide the actual media URL**.

**Impact:** We can only show a placeholder like "📷 Image attached" - cannot display actual images in dashboard.

**Example Response:**
```json
{
  "uuid": "8b4f8ef1-...",
  "text": "heyy thanks for subscribing...",
  "hasMedia": true,
  "mediaType": "image",
  // NO mediaUrl field!
}
```

**Workaround:** None. This is by design - Fanvue protects creator content.

---

### 2. Broadcast Messages Not in Chat API

**Problem:** Mass/broadcast messages sent by creators appear in the Fanvue UI chat, but are **NOT returned** by the `/chats/{userUuid}/messages` endpoint.

**Example:** Creator sends "Merryyyy Christmas babe" as mass DM. It shows in Fanvue chat UI, but API only returns automated/direct messages.

**Impact:** Message count in dashboard may differ from what's shown on Fanvue.

**Message types affected:**
- `BROADCAST` - Mass messages to fans
- Possibly some `AUTOMATED_*` subtypes

**Workaround:** None. API limitation.

---

### 3. Cannot Send to Non-Subscribers

**Problem:** Calling `POST /chats/{userUuid}/message` for a non-subscriber returns:
```json
HTTP 400: {"message": "Invalid user UUID"}
```

**Impact:** If a fan followed but didn't subscribe, creator cannot message them first.

**Dashboard behavior:** We detect this error and lock the chat input with "Subscribe to send messages".

---

### 4. No "Subscribe Required" Flag

**Problem:** API doesn't tell us upfront if we can message a user. We only find out when send fails.

**Impact:** UX is reactive (error after attempt) rather than proactive (show locked state immediately).

**Workaround:** Cache failed send attempts in localStorage to show locked state on subsequent visits.

---

## Next Steps

1. ✅ Get OAuth credentials from Developer Portal
2. ⏳ Implement OAuth flow in Backend
3. ⏳ Create Fanvue API service
4. ⏳ Setup webhook endpoints
5. ⏳ Update database schema
6. ⏳ Test with real Fanvue account
7. ⏳ Integrate with n8n AI workflow

---

**Last Updated:** December 16, 2025
