# Dashboard Implementation Guide

**Created:** December 25, 2025
**Status:** MVP Phase 1 Complete
**Stack:** React 18 + Vite + TypeScript + Tailwind CSS

---

## Table of Contents

1. [Project Structure](#project-structure)
2. [Tech Stack & Dependencies](#tech-stack--dependencies)
3. [Architecture](#architecture)
4. [API Integration](#api-integration)
5. [Authentication Flow](#authentication-flow)
6. [Pages & Components](#pages--components)
7. [State Management](#state-management)
8. [Styling System](#styling-system)
9. [Running the Project](#running-the-project)
10. [Common Issues & Solutions](#common-issues--solutions)

---

## Project Structure

```
/root/OF/dashboard/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx       # Left navigation + user info
│   │   │   ├── MainLayout.tsx    # Protected route wrapper
│   │   │   └── index.ts          # Barrel export
│   │   └── ui/                   # Reusable UI components (future)
│   │
│   ├── pages/
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx     # Login form
│   │   │   ├── RegisterPage.tsx  # Registration form
│   │   │   └── index.ts
│   │   ├── dashboard/
│   │   │   ├── DashboardPage.tsx # Home with stats
│   │   │   └── index.ts
│   │   └── models/
│   │       ├── ModelsPage.tsx       # Models list (grid)
│   │       ├── ModelFormPage.tsx    # Create/Edit model
│   │       ├── FanvueConnectPage.tsx # OAuth connection
│   │       └── index.ts
│   │
│   ├── services/
│   │   └── api.ts                # Axios wrapper for backend
│   │
│   ├── stores/
│   │   └── authStore.ts          # Zustand auth state
│   │
│   ├── hooks/                    # Custom React hooks (future)
│   ├── utils/                    # Helper functions (future)
│   │
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   │
│   ├── App.tsx                   # Router setup
│   ├── main.tsx                  # Entry point
│   └── index.css                 # Tailwind + custom styles
│
├── tailwind.config.js            # Tailwind configuration
├── postcss.config.js             # PostCSS configuration
├── vite.config.ts                # Vite configuration
├── tsconfig.json                 # TypeScript configuration
├── package.json                  # Dependencies
├── .env                          # Environment variables
└── .env.example                  # Environment template
```

---

## Tech Stack & Dependencies

### Core
| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.0 | UI framework |
| react-dom | ^19.2.0 | React DOM renderer |
| react-router-dom | ^7.x | Client-side routing |
| typescript | ~5.9.3 | Type safety |
| vite | ^7.2.4 | Build tool & dev server |

### State & Data
| Package | Version | Purpose |
|---------|---------|---------|
| zustand | ^5.x | State management |
| @tanstack/react-query | ^5.x | Server state & caching |
| axios | ^1.x | HTTP client |

### UI
| Package | Version | Purpose |
|---------|---------|---------|
| tailwindcss | ^3.x | Utility-first CSS |
| lucide-react | ^0.x | Icons |

### Installation
```bash
cd /root/OF/dashboard
npm install
```

---

## Architecture

### Data Flow
```
┌─────────────────────────────────────────────────────────────┐
│                        React App                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Pages     │───▶│   Stores    │───▶│  Services   │     │
│  │ (UI + Logic)│    │  (Zustand)  │    │  (api.ts)   │     │
│  └─────────────┘    └─────────────┘    └──────┬──────┘     │
│                                                │             │
└────────────────────────────────────────────────┼─────────────┘
                                                 │
                                                 ▼
                              ┌─────────────────────────────┐
                              │   Backend API               │
                              │   https://sorotech.ru/of-api│
                              └─────────────────────────────┘
```

### Protected Routes Pattern
```tsx
// MainLayout wraps all authenticated routes
<Route element={<MainLayout />}>
  <Route path="/" element={<DashboardPage />} />
  <Route path="/models" element={<ModelsPage />} />
  // ...
</Route>

// MainLayout checks auth and redirects if needed
function MainLayout() {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return <Loader />;
  if (!isAuthenticated) return <Navigate to="/login" />;

  return (
    <div className="flex">
      <Sidebar />
      <main><Outlet /></main>
    </div>
  );
}
```

---

## API Integration

### Base Configuration (`src/services/api.ts`)

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://sorotech.ru/of-api';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: { 'Content-Type': 'application/json' },
    });

    // Add auth token to all requests
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle 401 errors globally
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }
}
```

### API Response Normalization

The backend API has specific response formats that differ from frontend expectations:

| Backend Response | Frontend Expectation | Normalization |
|-----------------|---------------------|---------------|
| `{ data: { accessToken, refreshToken } }` | `{ data: { token } }` | Map `accessToken` to `token` |
| `{ data: { items: [], total, page } }` | `{ data: [] }` | Extract `items` array |
| `display_name` | `name` | Use `display_name` in UI |
| `id` (UUID string) | `id` (number) | Use string IDs everywhere |

### Available Endpoints

```typescript
// Auth
api.login({ email, password })        // POST /auth/login
api.register({ email, password, name, agency_name })
api.getProfile()                      // GET /auth/profile

// Models
api.getModels()                       // GET /models
api.getModel(id)                      // GET /models/:id
api.createModel(data)                 // POST /models
api.updateModel(id, data)             // PUT /models/:id
api.deleteModel(id)                   // DELETE /models/:id

// Personas
api.getPersonas()                     // GET /personas

// Fanvue
api.startFanvueAuth(modelId)          // POST /fanvue/auth/start
api.getFanvueStatus(modelId)          // GET /fanvue/status/:id
api.disconnectFanvue(modelId)         // POST /fanvue/disconnect
api.getFanvueChats(modelId)           // GET /fanvue/chats/:id
api.sendFanvueMessage(modelId, fanId, message)
```

---

## Authentication Flow

### Login Process

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  User    │     │ LoginPage│     │ authStore│     │   API    │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                │
     │  Submit form   │                │                │
     │───────────────▶│                │                │
     │                │  login(data)   │                │
     │                │───────────────▶│                │
     │                │                │  POST /login   │
     │                │                │───────────────▶│
     │                │                │                │
     │                │                │  { accessToken,│
     │                │                │    user }      │
     │                │                │◀───────────────│
     │                │                │                │
     │                │                │ Store token    │
     │                │                │ in localStorage│
     │                │                │ + zustand      │
     │                │◀───────────────│                │
     │  Navigate to / │                │                │
     │◀───────────────│                │                │
```

### Session Persistence

```typescript
// authStore.ts - persist only token
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // ... state and actions
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token }), // Only persist token
    }
  )
);

// On app load, checkAuth() validates token with backend
useEffect(() => {
  checkAuth();
}, []);
```

---

## Pages & Components

### LoginPage (`src/pages/auth/LoginPage.tsx`)

**Features:**
- Email/password form with validation
- Show/hide password toggle
- Error message display
- Auto-redirect if already authenticated
- Demo credentials hint

**Key Code:**
```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsLoading(true);
  try {
    await login({ email, password });
    navigate('/');
  } catch (err) {
    setError(err.message);
  } finally {
    setIsLoading(false);
  }
};
```

### ModelsPage (`src/pages/models/ModelsPage.tsx`)

**Features:**
- Grid layout of model cards
- Persona badge with color coding
- Platform indicator (OnlyFans/Fanvue/Both)
- AI enabled status indicator
- Fanvue connection status
- Dropdown menu (Edit/Delete/Connect Fanvue)

**Persona Color Mapping:**
```typescript
const PERSONAS = {
  gfe_sweet: { name: 'GFE Sweet', color: 'bg-pink-500' },
  dominant: { name: 'Dominant', color: 'bg-purple-500' },
  gamer_girl: { name: 'Gamer Girl', color: 'bg-green-500' },
  milf: { name: 'MILF', color: 'bg-red-500' },
  luxury: { name: 'Luxury', color: 'bg-yellow-500' },
};
```

### ModelFormPage (`src/pages/models/ModelFormPage.tsx`)

**Features:**
- Create or Edit mode (detected by URL param)
- Platform selection (radio-style buttons)
- Persona selection (list with descriptions)
- Status toggle (for edit mode)
- Form validation

**Route Detection:**
```tsx
const { id } = useParams();
const isEdit = Boolean(id);
```

### FanvueConnectPage (`src/pages/models/FanvueConnectPage.tsx`)

**Features:**
- Connection status display
- OAuth flow initiation
- Polling for connection completion
- Disconnect functionality

**OAuth Flow:**
```typescript
const handleConnect = async () => {
  const response = await api.startFanvueAuth(modelId);
  if (response.data?.authUrl) {
    // Open OAuth popup
    window.open(response.data.authUrl, '_blank', 'width=600,height=700');
    // Start polling for completion
    pollStatus();
  }
};
```

---

## State Management

### Zustand Store Pattern

```typescript
// stores/authStore.ts
interface AuthStore {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (data: LoginRequest) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (data) => {
        const response = await api.login(data);
        set({
          user: response.data.user,
          token: response.data.token,
          isAuthenticated: true
        });
      },

      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false });
      },
    }),
    { name: 'auth-storage' }
  )
);
```

### Usage in Components

```tsx
function SomeComponent() {
  const { user, logout, isAuthenticated } = useAuthStore();

  return (
    <div>
      {isAuthenticated && <span>Hello, {user.name}</span>}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

---

## Styling System

### Tailwind Configuration

```javascript
// tailwind.config.js
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          // ... shades 100-900
          500: '#0ea5e9',  // Main primary color
        },
        dark: {
          50: '#f8fafc',
          // ... shades 100-950
          950: '#020617',  // Background color
        }
      }
    },
  },
};
```

### Custom Component Classes

```css
/* index.css */
@layer components {
  .btn {
    @apply px-4 py-2 rounded-lg font-medium transition-colors;
  }

  .btn-primary {
    @apply bg-primary-600 text-white hover:bg-primary-700;
  }

  .input {
    @apply w-full px-4 py-2 bg-dark-800 border border-dark-600
           rounded-lg text-dark-100 focus:ring-2 focus:ring-primary-500;
  }

  .card {
    @apply bg-dark-800 rounded-xl border border-dark-700 p-6;
  }

  .sidebar-link {
    @apply flex items-center gap-3 px-4 py-3 text-dark-300
           hover:text-dark-100 hover:bg-dark-800 rounded-lg;
  }
}
```

---

## Running the Project

### Development

```bash
cd /root/OF/dashboard

# Install dependencies
npm install

# Start dev server (with HMR)
npm run dev

# Start on specific host/port
npm run dev -- --host 0.0.0.0 --port 5173
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Output directory: dist/
```

### Environment Variables

```bash
# .env
VITE_API_URL=https://sorotech.ru/of-api
```

---

## Common Issues & Solutions

### Issue: "Invalid email or password" on login

**Cause:** Demo user password was not set correctly in database.

**Solution:**
```bash
# Generate bcrypt hash
docker exec of-backend node -e "
const bcrypt = require('bcryptjs');
console.log(bcrypt.hashSync('password123', 10));
"

# Update password in database
docker exec postgres psql -U learnmate -d of_agency_db -c \
  "UPDATE users SET password_hash = '<hash>' WHERE email = 'test@example.com';"
```

### Issue: Models page crashes / shows empty

**Cause:** API response format mismatch.

**Solution:** The API returns paginated data `{ items: [], total, page }` but frontend expected just an array. Fixed in `api.ts`:

```typescript
async getModels() {
  const response = await this.client.get('/models');
  // Normalize paginated response to array
  if (response.data.success && response.data.data?.items) {
    response.data.data = response.data.data.items;
  }
  return response.data;
}
```

### Issue: TypeScript errors with IDs

**Cause:** Backend uses UUID strings, frontend was typed for numbers.

**Solution:** Updated all ID types to `string`:
```typescript
interface Model {
  id: string;  // UUID, not number
  // ...
}

async getModel(id: string) { ... }
async deleteModel(id: string) { ... }
```

### Issue: Field name mismatches

**Cause:** Backend uses `display_name`, `ai_enabled`; frontend used `name`, `status`.

**Solution:** Updated types and components to use backend field names:
- `model.name` → `model.display_name`
- `model.status === 'active'` → `model.ai_enabled`
- `model.fanvue_connected` → `model.fanvue_user_uuid`

---

## Next Steps (Phase 2)

- [ ] Chats page - View Fanvue conversations
- [ ] Send message functionality
- [ ] Analytics page with charts (Recharts)
- [ ] Settings page
- [ ] Team management
- [ ] Production deployment (nginx proxy)

---

**Last Updated:** December 25, 2025
