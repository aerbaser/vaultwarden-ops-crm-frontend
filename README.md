# Vault Ops CRM Frontend MVP

Next.js 14 App Router frontend for the Vault Ops CRM MVP.

## Prerequisites

- Node.js 20+
- npm 10+
- Backend API running at `http://localhost:3001` (or another URL via env)

## Environment Setup

Copy `.env.example` values into your local environment:

```bash
cp .env.example .env.local
```

Required variable:

- `NEXT_PUBLIC_API_URL`: Base URL for backend API

Optional variable:

- `NEXT_PUBLIC_E2E_MODE`: Set to `true` for deterministic e2e share handoff behavior

## Local Development

```bash
npm install
npm run dev
```

Application entry routes:

1. `/login`
2. `/vault`
3. `/vault/[projectId]/[folderId]/access`
4. `/share/[token]`
5. `/operations`
6. `/audit`

## Verification Commands

```bash
npm run lint
npm run typecheck
npm run test:unit
NEXT_PUBLIC_API_URL=http://localhost:3001 npm run test:e2e -- --grep "login create share"
npm run build
```

## Testing

- Unit tests: `npm run test:unit`
- Unit watch mode: `npm run test:unit:watch`
- E2E tests: `npm run test:e2e`

## Known MVP Non-Goals

The following domains are intentionally out of this MVP scope:

- Member lifecycle automation
- Archive/restore management UX
- Favorites and personalization workflows
- Record version history UX
- Full operations create/edit lifecycle forms (read-first board only)
