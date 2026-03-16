# SFOACC Apps — NX Monorepo

Church management platform for **Saints Francis of Assisi Catholic Church (SFOACC)**.

---

## Prerequisites

- Node.js 20+
- Yarn 1.x (`npm install -g yarn`)

---

## Getting Started

### 1. Install dependencies

```bash
yarn
```

### 2. Configure environment

Create a `.env` file in `apps/church-management-app/`:

```bash
cp apps/church-management-app/.env.example apps/church-management-app/.env
```

Or create it manually:

```env
VITE_API_URL=http://localhost:8000
```

> For production, point this to your deployed backend URL.

### 3. Run the dev server

```bash
yarn nx dev church-management-app
```

App will be available at **http://localhost:4200**

---

## Available Commands

| Command | Description |
|---|---|
| `yarn nx dev church-management-app` | Start dev server (hot reload) |
| `yarn nx build church-management-app` | Production build |
| `yarn nx preview church-management-app` | Preview production build locally |

---

## Project Structure

```
sfoacc-apps/
├── apps/
│   └── church-management-app/       # Main React app
│       ├── src/
│       │   ├── main.tsx              # App entry point
│       │   ├── tailwind.css          # Global styles
│       │   └── app/
│       │       ├── app.tsx           # Routes
│       │       ├── contexts/
│       │       │   ├── AuthContext.tsx   # Auth state
│       │       │   └── SDKContext.tsx    # API client provider
│       │       ├── layouts/
│       │       │   ├── AppLayout.tsx    # Sidebar + topbar shell
│       │       │   └── AuthLayout.tsx   # Login screen shell
│       │       └── pages/
│       │           ├── Dashboard.tsx
│       │           ├── Members.tsx
│       │           ├── Events.tsx
│       │           ├── Sacraments.tsx
│       │           ├── Finance.tsx
│       │           └── LoginPage.tsx
│       ├── tailwind.config.js
│       └── postcss.config.js
└── libs/
    └── sfoacc-sdk/                  # TypeScript SDK (synced from backend)
        └── src/
            ├── index.ts
            ├── types.ts             # All API types
            ├── client.ts            # SFOACCClient class
            └── hooks.ts             # React Query hooks
```

---

## SDK Usage

The SDK lives in `libs/sfoacc-sdk/` and is kept in sync with the backend (`sfoacc-db-backend/sdk/`).

### Using the client directly

```tsx
import { useSDK } from '../contexts/SDKContext';

const client = useSDK();
const result = await client.login(email, password);
```

### Using React Query hooks

```tsx
import { useParishioners, useSocieties, useParish } from '@sfoacc/sdk';
import { useSDK } from '../contexts/SDKContext';

const client = useSDK();
const { data, isLoading } = useParishioners(client, { limit: 20, search: 'John' });
```

### Keeping the SDK in sync

The SDK source of truth is `libs/sfoacc-sdk/src/`. When the backend regenerates the SDK, copy the updated files here:

```bash
cp ../sfoacc-db-backend/sdk/*.ts libs/sfoacc-sdk/src/
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Build tool | Vite 7 |
| Monorepo | NX 22 |
| Styling | Tailwind CSS 3 |
| Routing | React Router v6 |
| Data fetching | TanStack React Query v5 |
| Notifications | Sonner |
| Fonts | Cinzel · EB Garamond · Inter |
