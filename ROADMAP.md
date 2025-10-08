# Azure AD SSO + Employee Sync Roadmap

This document outlines goals, prerequisites, milestones, and an incremental delivery plan to add Microsoft Entra ID (Azure AD) Single Sign-On and employee synchronization via Microsoft Graph.

## Objectives
- Enable SSO with Azure AD using OpenID Connect (OIDC) Authorization Code Flow.
- Synchronize employees from Microsoft Graph into the local PostgreSQL database.
- Keep the rollout safe and incremental using feature flags and dry-run modes.

## Scope
- In-scope: Backend OIDC sign-in, Graph-based employee sync, minimal FE login button.
- Out-of-scope (initially): Full user provisioning beyond employees, SCIM, advanced RBAC UIs.

## Prerequisites

### Azure roles and access
- Can create app registrations: Application Administrator, Cloud Application Administrator, or Global Administrator.
- Can grant admin consent for Graph application permissions: Global Administrator or Privileged Role Administrator.

### App registrations (recommended: 2)
- Web/SSO app (OIDC) for user sign-in via Authorization Code Flow (+ PKCE).
- Daemon/sync app for Graph client-credentials.
- Configure redirect URIs (HTTPS) for backend callback, and enable "ID tokens" on the Web platform.
- Use a client secret or certificate (certificate preferred for daemon).

### Microsoft Graph permissions
- Application permissions (daemon sync):
  - `User.Read.All` (read users)
  - `Group.Read.All` or `GroupMember.Read.All` (if filtering by group / reading memberships)
  - Optionally `Directory.Read.All` (broader read)
- Delegated permissions (SSO):
  - `openid`, `profile`, `email`, `offline_access`
  - Optional group claims in ID token (or call `/me/memberOf` after login)

### Tenant decisions
- Single-tenant vs multi-tenant app (default: single-tenant).
- Decide on public backend base URL and redirect URI (e.g., `https://app.example.dk/api/auth/ms/callback`).
- Identity mapping strategy: primary `oid` (object id), fallback `mail`/`userPrincipalName`.
- Role mapping: via AD groups (supply GUIDs) or default local role on first sign-in.

### Infrastructure & networking
- Outbound HTTPS from backend to `login.microsoftonline.com` and `graph.microsoft.com`.
- Public HTTPS base URL for backend callback.
- Clock sync (NTP) to avoid token clock skew.

### Secrets & configuration
- Store secrets safely (Key Vault/CI secrets). Backend `.env` will include:
  - `AZURE_SSO_ENABLED=false`
  - `AZURE_TENANT_ID=`
  - `AZURE_CLIENT_ID=`
  - `AZURE_CLIENT_SECRET=` (or certificate path/config)
  - `AZURE_GRAPH_SCOPE=https://graph.microsoft.com/.default`
  - `AZURE_SYNC_PAGE_SIZE=50`
  - Optional: `AZURE_SYNC_GROUP_ID=<GUID>`
  - Optional: `AZURE_ADMIN_GROUP_ID`, `AZURE_PROJECTLEAD_GROUP_ID`

### Database additions (migration)
- Extend `employees` with:
  - `azure_ad_id text UNIQUE NULL`
  - `department text`
  - `job_title text`
  - `account_enabled boolean`
  - `synced_at timestamptz`
- Unique index on `azure_ad_id` (NULL allowed).

---

## Milestones

### Milestone 0 ? Prep & Feature Flags
- Add deps: `openid-client`, `undici` (or `node-fetch`).
- Add env flags to `.env.example` as listed above.
- Acceptance: App behaves unchanged when `AZURE_SSO_ENABLED=false`.

### Milestone 1 ? DB schema for Azure fields
- Migration adds new columns/index to `employees`.
- Acceptance: `npm run migrate` succeeds; existing data unaffected.

### Milestone 2 ? Graph client (no writes, dry-run)
- Implement `backend/scripts/lib/azure-graph.js` (client credentials):
  - Acquire token and fetch `/users` with `$select=id,displayName,mail,userPrincipalName,department,jobTitle,accountEnabled&$top={PAGE_SIZE}`.
  - Follow `@odata.nextLink` for paging.
- Add `npm run sync:azure:dry` to print a summary plan, no DB writes.
- Acceptance: Dry-run shows counts and samples; respects paging.

### Milestone 3 ? Upsert employees (idempotent)
- Add `backend/scripts/sync-azure.js` with `--dry-run` and `--limit`:
  - Match by `azure_ad_id`; fallback by lowercased email.
  - Upsert `name`, `email` (prefer `mail`, fallback `UPN`), `department`, `job_title`, `account_enabled`, `synced_at=now()`.
  - Avoid overwriting local-only fields.
- Output summary: created/updated/skipped/disabled.
- Acceptance: Second consecutive run yields zero changes; dry-run matches planned changes.

### Milestone 4 ? OIDC login flow (backend)
- Routes:
  - `GET /auth/ms/login` ? redirect to Microsoft (PKCE, `state`, `nonce`).
  - `GET /auth/ms/callback` ? validate ID token via `openid-client`.
- Mapping:
  - Find user by `azure_ad_id` or email; create local user + employee if missing.
  - Issue app JWT (keep current auth middleware).
- Feature flag controlled by `AZURE_SSO_ENABLED`.
- Acceptance: End-to-end login returns valid app JWT; first sign-in provisions/links user.

### Milestone 5 ? Role mapping (optional)
- If `AZURE_*_GROUP_ID` set, determine roles from AD groups (`groups` claim or `/me/memberOf`).
- Default new users to `Teammedlem` when no mapping match.
- Acceptance: Users in configured groups get expected roles; re-login updates role.

### Milestone 6 ? Frontend login UX (minimal)
- Add "Sign in with Microsoft" button linking to `/auth/ms/login`.
- Optional: hide local login when `AZURE_SSO_ENABLED=true`.
- Acceptance: Button completes SSO; JWT works with existing API calls.

### Milestone 7 ? Scheduling & Ops
- Add `npm run sync:azure` for writes (keep `:dry` for verification).
- Document scheduling (cron/Task Scheduler/CI) and add 429 backoff + jitter.
- Acceptance: Scheduled job completes with concise logs and safe retries.

---

## Environment variables (summary)
```
AZURE_SSO_ENABLED=false
AZURE_TENANT_ID=
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
AZURE_GRAPH_SCOPE=https://graph.microsoft.com/.default
AZURE_SYNC_PAGE_SIZE=50
AZURE_SYNC_GROUP_ID=
AZURE_ADMIN_GROUP_ID=
AZURE_PROJECTLEAD_GROUP_ID=
```

## Security & compliance
- Validate tokens (issuer, audience, signature, expiry). Use JWKS from discovery doc.
- Store secrets in a secure vault; rotate client secrets per policy.
- Keep `seed:admin` as break-glass if SSO is unavailable.
- Log minimally; avoid PII in logs. Redact tokens and secrets.

## Rate limits & resilience
- Implement retries with exponential backoff and jitter on Graph 429/5xx.
- Cap pages per run (`--limit`) for safe initial tests.
- Use dry-run before enabling writes.

## Testing strategy
- Unit: token validation helpers, Graph paging.
- Integration: dry-run sync against mocked Graph.
- E2E (staging): OIDC login + limited sync (`--limit 20`).
- Idempotency: two consecutive writes produce zero changes on second run.

## Rollout plan
- Dev: enable `AZURE_SSO_ENABLED` in dev only after Dry-run passes.
- Staging: test end-to-end with a subset of users/groups.
- Prod: enable sync (writes) on a schedule; enable SSO after first successful dry-run + limited write run.
- Back-out: disable `AZURE_SSO_ENABLED` and stop scheduled sync; use local admin login as fallback.

## Ops runbook (summary)
- Dry-run: `npm run sync:azure:dry`
- Write: `npm run sync:azure`
- Common failures:
  - 401/403 ? check tenant/app permissions and consent.
  - 429 ? verify backoff; reduce `AZURE_SYNC_PAGE_SIZE`.
  - Mapping conflicts ? ensure `azure_ad_id` unique; verify email fallbacks.

## Appendix: example `.env`
```
AZURE_SSO_ENABLED=false
AZURE_TENANT_ID=<tenant-guid>
AZURE_CLIENT_ID=<app-client-id>
AZURE_CLIENT_SECRET=<secret>
AZURE_GRAPH_SCOPE=https://graph.microsoft.com/.default
AZURE_SYNC_PAGE_SIZE=50
AZURE_ADMIN_GROUP_ID=
AZURE_PROJECTLEAD_GROUP_ID=
AZURE_SYNC_GROUP_ID=
```
