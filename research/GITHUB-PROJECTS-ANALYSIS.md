# GitHub Open-Source Projects Analysis

**Date:** November 27, 2025
**Purpose:** Analysis of existing OnlyFans automation tools for our Muse AI project

---

## Актуальность репозиториев

| Репозиторий | Обновление | Статус | Ценность |
|-------------|------------|--------|----------|
| **DATAHOARDERS/dynamic-rules** | 25 Nov 2025 | ✅ АКТУАЛЕН | ⭐⭐⭐ API signing |
| **datawhores/OF-Scraper** | 20 Oct 2025 | ✅ АКТУАЛЕН | ⭐⭐⭐ DB schema + API |
| **PatchFlick/onlyfans-downloader** | 20 Jun 2025 | ✅ Актуален | ⭐⭐ MV3 patterns |
| jfrazier-eth/of | Oct 2023 | ⚠️ Устарел | ⭐⭐⭐ Sign header код! |
| Barklim/onlyfExtension | Oct 2023 | ⚠️ Устарел | ⭐ Базовый туториал |
| **Barklim/onlyfClient** | Dec 2023 | ⚠️ Устарел | ⭐⭐ React frontend |
| M-rcus/OnlyFans-Cookie-Helper | - | - | ⭐ Cookie extraction |
| UltimaScraper | Oct 2023 | ⚠️ Устарел | ⭐ Похож на OF-Scraper |

---

# КРИТИЧЕСКИ ВАЖНОЕ

## 1. Sign Header Implementation (TypeScript)

**Источник:** jfrazier-eth/of (`src/lib/sites/of/utils/sign-req.ts`)

```typescript
import sha1 from "sha1";

interface OFDynamicParams {
  staticParam: string;
  start: string;
  end: string;
  checksumConstant: number;
  checksumIndexes: number[];
  appToken: string;
}

/**
 * Generates OF `sign` header for API requests
 * Based on: deviint/onlyfans-dynamic-rules, datawhores/OF-Scraper
 */
export const signReq = async (
  url: URL,
  time: number,
  dynamicParams: OFDynamicParams,
  authId = "0"
) => {
  let urlPart = url.searchParams.size === 0
    ? url.pathname
    : `${url.pathname}${url.search}`;

  const msg = [dynamicParams.staticParam, time, urlPart, authId].join("\n");
  const hexHash = await sha1(msg);

  let encoder = new TextEncoder();
  let asciiHash = encoder.encode(hexHash);

  let checksum = dynamicParams.checksumIndexes.reduce(
    (sum, checksumIndex) => sum + asciiHash[checksumIndex],
    dynamicParams.checksumConstant
  );

  const sign = [
    dynamicParams.start,
    hexHash,
    Math.abs(checksum).toString(16),
    dynamicParams.end,
  ].join(":");

  return { sign };
};
```

---

## 2. Dynamic Rules (актуальные на 25.11.2025)

**Источник:** DATAHOARDERS/dynamic-rules (`onlyfans.json`)

```json
{
  "static_param": "IiBcqwjnqCXYXDoadqKT8AcziEoXbimu",
  "format": "50859:{}:{:x}:692466bc",
  "checksum_indexes": [32,3,16,7,2,29,15,24,16,14,36,27,7,19,36,23,2,31,7,5,8,28,32,6,11,23,21,16,35,3,30,23],
  "checksum_constant": -1025,
  "app_token": "33d57ade8c02dbc5a333db99ff9ae26a"
}
```

**Маппинг для TypeScript:**
```typescript
const dynamicParams: OFDynamicParams = {
  staticParam: "IiBcqwjnqCXYXDoadqKT8AcziEoXbimu",
  start: "50859",           // из format до первого :
  end: "692466bc",          // из format после последнего :
  checksumConstant: -1025,
  checksumIndexes: [32,3,16,7,2,29,15,24,16,14,36,27,7,19,36,23,2,31,7,5,8,28,32,6,11,23,21,16,35,3,30,23],
  appToken: "33d57ade8c02dbc5a333db99ff9ae26a"
};
```

---

## 3. OF API Endpoints

**Источник:** datawhores/OF-Scraper (`ofscraper/utils/of_env/values/url/url.py`)

```python
# Messages
messagesEP = "https://onlyfans.com/api2/v2/chats/{}/messages?limit=100&order=desc"
messagesNextEP = "https://onlyfans.com/api2/v2/chats/{}/messages?limit=100&id={}&order=desc"

# User
meEP = "https://onlyfans.com/api2/v2/users/me"
profileEP = "https://onlyfans.com/api2/v2/users/{}"

# Init
initEP = "https://onlyfans.com/api2/v2/init"
```

---

## 4. DOM Selectors (подтверждены)

**Источники:** PatchFlick, наш DOM research

```javascript
// Messages
'.b-chat__messages-wrapper'    // Container
'.b-chat__item-message'        // Message item
'.b-chat__message'             // Message wrapper
'.b-chat__message.m-from-me'   // Outgoing
'.b-chat__message__body'       // Text content

// Media types
'.m-photo', '.m-video', '.m-audio'
'.m-purchase'                  // PPV
'.m-not-paid-yet'             // Unpaid PPV

// Input
'[contenteditable].tiptap.ProseMirror'
'.b-chat__btn-submit'

// Username (fallback chain)
const usernameSelectors = [
  'h1.g-page-title span.g-user-name',
  '.g-user-name',
  '.chat-header .username',
  '[data-username]',
  '.user-info .name'
];
```

---

## 5. setNativeValue для React inputs

**Источник:** jfrazier-eth/of

```javascript
function setNativeValue(element, value) {
  const { set: valueSetter } = Object.getOwnPropertyDescriptor(element, "value") || {};
  const prototype = Object.getPrototypeOf(element);
  const { set: prototypeValueSetter } = Object.getOwnPropertyDescriptor(prototype, "value") || {};

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else if (valueSetter) {
    valueSetter.call(element, value);
  }
  element.dispatchEvent(new Event("input", { bubbles: true }));
}
```

---

## 6. Shadow DOM Button Injection

**Источник:** PatchFlick/onlyfans-downloader-extension

```javascript
createButtonContainer() {
  const container = document.createElement('div');
  container.className = this.uniqueClass;
  const shadow = container.attachShadow({ mode: 'closed' });
  // Styles isolated from page CSS
  return container;
}
```

---

## 7. URL Pattern для Chat ID

**Источник:** jfrazier-eth/of

```javascript
function extractUid(url) {
  const pattern = /my\/chats\/chat\/(\d+)/;
  const items = url.match(pattern);
  return items ? { matches: true, uid: items[1] } : { matches: false };
}
```

---

# Клонированные репо

```
/root/OF/research/github-repos/
├── dynamic-rules/              # ⭐ API signing rules (АКТУАЛЕН Nov 2025)
├── OF-Scraper/                 # ⭐ DB schema + API (АКТУАЛЕН Oct 2025)
├── onlyfans-downloader-extension/  # MV3 patterns (Jun 2025)
├── of/                         # Sign header code (Oct 2023)
├── onlyfExtension/             # Базовый туториал (Oct 2023)
├── onlyfClient/                # React frontend (Dec 2023) - NEW
├── UltimaScraper/              # Scraper (Oct 2023)
└── OnlyFans-Cookie-Helper/     # Cookie extraction
```

---

# Database Schema Analysis (Dec 2, 2025)

## OF-Scraper SQLite Schema (Актуален Oct 2025)

**Источник:** `OF-Scraper/ofscraper/db/operations_/`

### messages table
```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY,
    post_id INTEGER NOT NULL,      -- OF message ID
    text VARCHAR,
    price INTEGER,                 -- PPV price
    paid BOOLEAN,                  -- Was PPV unlocked
    archived BOOLEAN,
    created_at TIMESTAMP,
    user_id INTEGER,               -- Sender ID
    model_id INTEGER,
    UNIQUE (post_id, model_id)
);
```

### medias table
```sql
CREATE TABLE medias (
    id INTEGER PRIMARY KEY,
    media_id INTEGER,
    post_id INTEGER NOT NULL,
    link VARCHAR,                  -- CDN URL
    media_type VARCHAR,            -- image, video, audio, gif
    duration VARCHAR,              -- Video duration
    unlocked BOOL,                 -- PPV unlocked
    hash VARCHAR,                  -- File hash for dedup
    model_id INTEGER,
    UNIQUE (media_id, model_id, post_id)
);
```

### posts table
```sql
CREATE TABLE posts (
    id INTEGER PRIMARY KEY,
    post_id INTEGER NOT NULL,
    text VARCHAR,
    price INTEGER,
    paid INTEGER,
    archived BOOLEAN,
    pinned BOOLEAN,
    stream BOOLEAN,                -- Live stream
    opened BOOLEAN,                -- Was viewed
    created_at TIMESTAMP,
    model_id INTEGER,
    UNIQUE (post_id, model_id)
);
```

### Что мы взяли для нашей схемы:
- `unlocked` поле для PPV сообщений
- `paid` статус
- Концепция `model_id` привязки

---

## onlyfClient Frontend Entities (Dec 2023)

**Источник:** `onlyfClient/src/entities/`

### Profile entity
```typescript
interface Profile {
    id?: string;
    username?: string;
    avatar?: string;
    stopWords?: string;           // Стоп-слова для чата
    verified?: boolean;
    countViolations?: number;     // Нарушения чаттера
    countActiveDialogs?: number;  // Активные диалоги
}
```

### User entity
```typescript
interface User {
    id: string;
    username: string;
    email?: string;
    profileId: string;
    online: boolean;
    avatar?: string;
    roles?: UserRole[];
}
```

**Примечание:** Бэкенд с БД отсутствует в репо, только фронтенд.

---

# Архитектурные паттерны

## Extension Architecture (MV3)
```
content.js  → DOM only, no server calls
background.js → All API communication
popup.js    → User interface
```

## Communication Pattern
```javascript
// content.js
chrome.runtime.sendMessage({ type: 'new_message', data: {...} });

// background.js
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  // Handle API calls here
});
```

---

# Risk Assessment

| Approach | Risk | Notes |
|----------|------|-------|
| DOM scraping | LOW | Standard extension |
| Human-in-the-loop | VERY LOW | AI suggests, human sends |
| OF API calls | HIGH | Requires sign header |

---

# Наша финальная схема БД

**Применена:** December 2, 2025
**База:** PostgreSQL `of_agency_db`

## Таблицы (9 шт)

| Таблица | Назначение | Уникально для нас |
|---------|------------|-------------------|
| `agencies` | Агентства (multi-tenancy) | ✅ Да |
| `users` | Пользователи системы | - |
| `models` | OF аккаунты креаторов | - |
| `chats` | Чаты с фанами | - |
| `messages` | История сообщений | - |
| `ai_responses` | Логи AI генерации | ✅ Да |
| `sessions` | JWT сессии | - |
| `fan_stats` | Аналитика фанов | ✅ Да |
| `media_attachments` | Вложения к сообщениям | - |

## Миграции

1. `001_initial_schema.sql` - базовая схема (7 таблиц)
2. `002_schema_optimization.sql` - оптимизация после ресерча (+2 таблицы, новые поля)

**Документация:** `/root/OF/research/DATABASE-RESEARCH.md`

---

**Last Updated:** December 2, 2025
