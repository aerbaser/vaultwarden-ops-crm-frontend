# Vault Ops CRM Frontend Design

**Date:** 2026-03-05
**Status:** Approved

## Architecture Decision

Pure client-side rendering for all authenticated routes. Next.js 14 App Router provides routing; all data fetching happens client-side on mount. Web Crypto API (browser-only) drives all cryptographic operations.

## Tech Stack

- Next.js 14 App Router + TypeScript
- CSS custom properties only (dark theme, no Tailwind/MUI)
- Zustand (vanilla) for state
- Web Crypto API for Vaultwarden key derivation + cipher decryption
- Vitest + React Testing Library for unit tests

## Crypto Pipeline (lib/crypto.ts)

Three-stage pipeline all using Web Crypto API:

1. **Login** — PBKDF2(password, email, KdfIterations) → master key → HMAC-SHA256 hash → password hash for API
2. **Key unwrap** — AES-CBC decrypt `profile.Key` using master key → raw symmetric enc key
3. **Field decrypt** — parse `2.<iv_b64>|<ct_b64>|<mac_b64>` format → AES-CBC decrypt with enc key → UTF-8. Fallback: `[encrypted]` on any error.

## State (lib/store.ts — Zustand)

```
auth slice:
  email, userId, csrfToken, vaultToken, masterKey (Uint8Array), encKey (CryptoKey), locked

vault slice:
  projects[], folders[], ciphers[], selectedProjectId, selectedFolderId

ui slice:
  loading, error
```

masterKey + encKey persist in sessionStorage (cleared on lock/tab close).
csrfToken persists in sessionStorage.

## API Layer (lib/api.ts)

`apiFetch(path, options)` wrapper:
- Reads csrfToken from sessionStorage → adds `x-csrf-token` header on POST/PUT/DELETE
- Reads vaultToken from sessionStorage → adds `Authorization: Bearer` for `/api/vault/*`
- On 401 → dispatches lock action

## Screens

| Route | Auth | Description |
|---|---|---|
| `/login` | None | PBKDF2 login flow → CRM session → redirect |
| `/vault` | Session | Sidebar + cipher list + share modal |
| `/vault/[projectId]/[folderId]/access` | Session | Access group designer |
| `/share/[token]` | None | Public credential viewer |
| `/operations` | Session | Obligations board |
| `/audit` | Session | Audit event timeline |

## CSS Design System

CSS custom properties dark theme:
```css
--bg-primary: #0f1117
--bg-secondary: #1a1d27
--bg-elevated: #242736
--border: #2e3347
--text-primary: #e8eaf0
--text-muted: #8892a4
--accent: #6c8ef5
--accent-hover: #8aa5ff
--success: #4caf7d
--danger: #f05c6b
--warning: #f0a050
```

## Project Structure

```
app/
  layout.tsx
  page.tsx              → redirect to /vault or /login
  globals.css
  login/page.tsx
  vault/
    page.tsx
    [projectId]/[folderId]/access/page.tsx
  share/[token]/page.tsx
  operations/page.tsx
  audit/page.tsx
components/
  auth/LoginForm.tsx
  vault/Sidebar.tsx, CipherList.tsx, CipherCard.tsx, ShareModal.tsx
  operations/ObligationsBoard.tsx, AddObligationForm.tsx
  audit/AuditTimeline.tsx
  ui/Button.tsx, Input.tsx, Modal.tsx, CopyButton.tsx
lib/
  api.ts, crypto.ts, store.ts
tests/unit/
  auth/login-form.spec.tsx
  vault/cipher-list.spec.tsx
  share/share-viewer.spec.tsx
```

## Delivery Requirements

1. `npm run dev` starts on port 3000 without errors
2. All 6 screens render at minimum working skeleton
3. Login flow works with Vaultwarden (http://localhost:8222 via proxy)
4. Share viewer works without auth
5. `npm test` passes
6. GitHub repo `aerbaser/vaultwarden-ops-crm-frontend` pushed
7. README.md with setup instructions
8. `openclaw` notification sent on completion
