# Implementation Plan: Split api.ts into Domain Modules

## Problem
`src/api.ts` is 647 lines - a God Object containing all API functions.

## Key Insight: Avoiding Circular Dependencies
**Risk:** If `index.ts` exports `fetchWithAuth` AND imports domain modules, those modules can't import from `index.ts` without creating a cycle.

**Solution:** Extract core utilities into a separate `client.ts` that all modules depend on.

```
Dependency Graph:
client.ts <── authApi.ts
client.ts <── projectsApi.ts  
client.ts <── employeesApi.ts
client.ts <── index.ts ──re-exports──> all modules
```

---

## Proposed Structure

```
src/api/
├── client.ts             # Core: fetchWithAuth, HttpError, toErrorMessage
├── index.ts              # Re-exports + backward compat api object
├── authApi.ts            # Authentication & setup
├── employeesApi.ts       # Employee CRUD
├── projectsApi.ts        # Project + member CRUD + time entries
├── riskApi.ts            # Project risks + report risk snapshots
├── analyticsApi.ts       # Resource analytics + normalizers
├── adminApi.ts           # User management (getUsers, updateUserRole)
├── workspaceApi.ts       # Workspace settings
├── reportApi.ts          # ✅ Already exists
├── planApi.ts            # ✅ Already exists
├── organizationsApi.ts   # ✅ Already exists
├── workspacesApi.ts      # ✅ Already exists
```

---

## File Breakdown

| Module | Functions | ~Lines |
|--------|-----------|--------|
| `client.ts` | fetchWithAuth, HttpError, toErrorMessage, AUTH_USER_STORAGE_KEY, resolveUrl, getCookie, shouldIncludeCsrf, buildHttpError | 90 |
| `authApi.ts` | checkSetupStatus, createFirstUser, login, register, logout, getAuthenticatedUser, forgotPassword, resetPassword | 100 |
| `employeesApi.ts` | createEmployee, updateEmployee, deleteEmployee | 30 |
| `projectsApi.ts` | createProject, updateProject, deleteProject, sanitizeProjectPayload, addProjectMember, updateProjectMember, deleteProjectMember, logTimeEntry | 80 |
| `riskApi.ts` | getProjectRisks, createProjectRisk, updateProjectRisk, archiveProjectRisk, attachReportRisks, updateReportRiskSnapshot, sanitizeRiskPayload | 100 |
| `analyticsApi.ts` | fetchResourceAnalytics, normalizeStackEntries, normalizeResourceAnalyticsPayload | 150 |
| `adminApi.ts` | getUsers, updateUserRole | 20 |
| `workspaceApi.ts` | getWorkspace, updateWorkspaceSettings | 20 |
| `index.ts` | Re-exports + combined `api` object | 40 |

---

## Implementation Steps

### Step 1: Create `client.ts`
Extract core utilities that all modules depend on:
- `fetchWithAuth`
- `HttpError` type
- `toErrorMessage`
- `AUTH_USER_STORAGE_KEY`
- Helper functions (resolveUrl, getCookie, shouldIncludeCsrf, buildHttpError)

### Step 2: Create domain modules
Each imports from `./client`, NOT from `./index`:
```ts
import { fetchWithAuth, toErrorMessage, AUTH_USER_STORAGE_KEY } from './client';
```

### Step 3: Update `index.ts`
```ts
// Re-export core utilities
export * from './client';

// Re-export domain modules
export { authApi } from './authApi';
export { projectsApi } from './projectsApi';
// ... etc

// Backward compat: combined api object
export const api = {
  ...authApi,
  ...projectsApi,
  ...employeesApi,
  ...workspaceApi,
  ...analyticsApi,
  ...riskApi,
  ...adminApi,
};
```

### Step 4: Update `src/api.ts`
```ts
// Backward compat redirect
export * from './api/index';
```

---

## Backward Compatibility
Existing imports continue to work:
```ts
import { api, fetchWithAuth } from './api';  // ✅ Works
import { api } from '../api';                // ✅ Works
```

---

## Verification
1. TypeScript: `npx tsc --noEmit`
2. ESLint: `npm run lint`
3. Frontend tests: `npx vitest --run`
4. Manual: Verify login, project CRUD, employee CRUD work

---

## Estimate
~2-3 hours
