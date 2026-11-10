# Staffmate frontend

The primary application is the unified SPA in `frontend/app`. It provides one sign-in, MFA, password reset, and invitation flow, then shows Admin and/or CRM sections according to server-side permissions.

`frontend/admin` and `frontend/crm` are retained temporarily for rollback. Prefer `staffmate-app` for new work.

## Requirements

- Node.js `^20.19.0` or `>=22.12.0`
- npm workspaces (npm 10 or newer)

## Install

From `frontend/`:

```bash
npm install
```

Do not write the lockfile by hand.

## Run the unified application

```bash
npm run dev:app
```

Open `http://app.localhost:5173`. The Vite server listens on `127.0.0.1` and accepts that host name. Do not use bare `localhost` for the SPA; keep the cookie on `app.localhost`.

The app proxies `/api`, `/sanctum`, `/login`, `/logout`, `/forgot-password`, `/reset-password`, `/two-factor-challenge`, `/user`, and `/email` to `http://127.0.0.1` (Sail port 80) while preserving the original `Host` header.

## Build and lint

```bash
npm run build:app
npm run lint
```

Legacy packages:

```bash
npm run dev:admin
npm run dev:crm
npm run build:admin
npm run build:crm
```

## Layout

```text
frontend/
  app/                   Unified Staffmate SPA (primary)
    src/
      auth/              Shared Fortify/Sanctum session client
      components/
      pages/             Sign-in, MFA, Admin, CRM
      theme.ts
      App.tsx
  admin/                 Rollback Admin SPA
  crm/                   Rollback CRM SPA
```

Authorization is enforced by Laravel. React navigation only reflects `sections` and permissions returned by the API.
