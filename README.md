# Vault Ops CRM — Frontend

Security operations cockpit built on top of [Vaultwarden](https://github.com/dani-garcia/vaultwarden).
Bloomberg Terminal meets Raycast — tactical dark aesthetic, zero UI frameworks.

## Stack

- **Next.js 14** (App Router)
- **Zustand** — client state (auth + vault)
- **CSS Modules** — custom properties only, no Tailwind/MUI
- **Web Crypto API** — PBKDF2 key derivation in-browser (never sends raw password)
- **TypeScript** throughout

## Screens

| Route | Description |
|---|---|
| `/login` | Vault unlock — derives master key, authenticates via Vaultwarden |
| `/vault` | 3-panel browser: projects sidebar / cipher list / detail + share modal |
| `/operations` | Financial obligations tracker (subscriptions, licenses) |
| `/audit` | Event timeline — all CRM audit events |
| `/share/[token]` | Public share viewer — no auth required |

## Setup

### Prerequisites

- Node.js 18+
- [Vault Ops CRM Backend](https://github.com/aerbaser/vaultwarden-ops-crm-backend) running on port 3001
- Vaultwarden instance (backend proxies to it)

### Install & Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm start          # serve production build
```

### Environment

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

The backend exposes:
- `/api/vault/*` — Vaultwarden proxy (auth, sync, TOTP)
- `/api/projects` — CRM projects
- `/api/obligations` — financial obligations
- `/api/audit/events` — audit log
- `/api/share/from-vault` — create share link
- `/api/share/open` — redeem share token

## Architecture

```
app/
  login/          PBKDF2 → vault token → CRM session
  vault/          /sync → cipher list; share modal → from-vault
  operations/     CRUD obligations
  audit/          read-only event log
  share/[token]/  public, no auth
lib/
  api.ts          fetch wrappers (CSRF via sessionStorage)
  crypto.ts       PBKDF2 + HMAC key derivation
  store.ts        Zustand: AuthState, VaultState
components/ui/    Button, Input, Badge
```

## Design Tokens

```css
--bg-0: #07080c      /* near-black base */
--amber: #d4a853     /* primary accent */
--teal: #3dd9c4      /* success / login badge */
--danger: #e05252    /* overdue / expired */
--font-mono: 'JetBrains Mono'
--font-sans: 'Plus Jakarta Sans'
```
