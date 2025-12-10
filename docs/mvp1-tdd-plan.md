# MVP 1.0 TDD Implementation Plan

## Overview
MVP 1.0 fokuserer på 3 områder: Workspace Foundation, Forbedret RBAC, og Projekt-liste UX.

**TDD Workflow per feature:**
1. ❌ Skriv failing test
2. ✅ Implementer kode til test passerer
3. 🔄 Refactor

---

## Phase 1: Workspace Foundation (1.5-2 uger)

### 1.1 Workspace Table & CRUD

**Tests først:**
```
backend/tests/repositories/workspacesRepository.test.js
- getWorkspaceById returns workspace
- listWorkspaces returns all workspaces
- getUserWorkspace returns user's workspace
```

**Implementation:**
- [x] Migration: `workspaces` table (✅ Done in TD-4)
- [x] Repository: `workspacesRepository.js` (✅ Done)
- [x] Routes: `/api/workspaces` (✅ Done)

### 1.2 Workspace ID on Core Entities

**Tests først:**
```
backend/tests/repositories/projectRepository.test.js
- getProjectsByWorkspace filters by workspace_id
- createProject sets workspace_id from user

backend/tests/services/employeeService.test.js
- getEmployees filters by user's workspace_id
```

**Implementation:**
- [x] Migration: `workspace_id` columns (✅ Done in TD-4)
- [ ] Update `projectRepository.getAll()` → add workspace filter
- [ ] Update `employeeService.getEmployees()` → add workspace filter
- [ ] Update `workspaceService.loadFullWorkspace()` → filter by workspace

### 1.3 User-Workspace Assignment

**Tests først:**
```
backend/tests/services/authService.test.js
- login returns user.workspaceId in JWT/response
- user record includes workspaceId

backend/tests/middleware/auth.test.js
- req.user contains workspaceId from token
```

**Implementation:**
- [ ] Migration: seed users with workspace_id
- [ ] Update `authService.login()` → include workspaceId in response
- [ ] Update JWT payload → add workspaceId
- [ ] Update auth middleware → set req.user.workspaceId

### 1.4 Data Isolation

**Tests først:**
```
backend/tests/integration/workspaceIsolation.test.js
- user in Workspace A cannot see projects from Workspace B
- user in Workspace A cannot see employees from Workspace B
- admin sees all (or admin is workspace-scoped too?)
```

**Implementation:**
- [ ] Add workspace filter to all list queries
- [ ] Add workspace validation on create/update operations

---

## Phase 2: Forbedret RBAC (1-1.5 uger)

### 2.1 PMO Role

**Tests først:**
```
backend/tests/utils/permissions.test.js
- isPMO returns true for PMO role
- isPMO returns false for regular User
- PMO can view all projects in workspace
- PMO can edit project settings (not content?)
```

**Implementation:**
- [ ] Add `'PMO'` to `USER_ROLES` constant
- [ ] Add `isPMO()` function to `permissions.js`
- [ ] Migration: seed PMO role or update existing user

### 2.2 Project Leader Field

**Tests først:**
```
backend/tests/repositories/projectRepository.test.js
- createProject sets leaderId
- getProject returns leader info
- updateLeader updates leaderId

backend/tests/services/projectsService.test.js  
- isProjectLeader correctly identifies leader
```

**Implementation:**
- [ ] Migration: add `leader_id` column to projects
- [ ] Update project create/update to set leaderId
- [ ] Add `isLeaderOf(userId, projectId)` to permissions

### 2.3 PL Read-All, Write-Own

**Tests først:**
```
backend/tests/utils/permissions.test.js
- PL can read all projects in workspace
- PL can only edit own projects (where leaderId = userId)
- Admin can edit all projects
```

**Implementation:**
- [ ] Update `canEditProject()` → check leaderId OR admin
- [ ] Update `canViewProject()` → PL sees all in workspace

---

## Phase 3: Projekt-liste UX (0.5-1 uge)

### 3.1 Default Filter: Active Only

**Tests først:**
```
src/app/pages/projects/__tests__/ProjectListPage.test.tsx
- default shows only active projects
- toggle shows completed/hold projects
- filter state persists in URL params
```

**Implementation:**
- [ ] Add `status` query param to project list API
- [ ] Frontend: default filter = 'active'
- [ ] Frontend: filter toggle UI

### 3.2 "Mine Projekter" Sektion

**Tests først:**
```
src/app/pages/projects/__tests__/ProjectListPage.test.tsx
- shows "Mine Projekter" section when user is PL
- "Mine Projekter" contains only projects where leaderId = currentUser
- other projects shown in "Alle Projekter" section
```

**Implementation:**
- [ ] Group projects by `myProjects` vs `allProjects`
- [ ] UI: two sections with headers
- [ ] Highlight current user's projects

---

## Test Coverage Summary

| Phase | New Tests | Est. Time |
|-------|-----------|-----------|
| 1.1-1.2 | 6 tests | 2 days |
| 1.3-1.4 | 8 tests | 2 days |
| 2.1-2.3 | 10 tests | 3 days |
| 3.1-3.2 | 6 tests | 2 days |
| **Total** | **~30 tests** | **9 days** |

---

## Definition of Done

- [ ] All new tests passing
- [ ] TypeScript check clean
- [ ] ESLint clean
- [ ] Existing tests still pass
- [ ] Manual verification: login → see workspace-filtered data
- [ ] Committed and pushed

---

## Decision Points

> [!IMPORTANT]
> Beslutninger påkrævet før implementation:

1. **Admin scope:** Skal admin se alt på tværs af workspaces, eller kun sin egen?
2. **PMO permissions:** Skal PMO kunne redigere projekter, eller kun se?
3. **Project leader:** Kan et projekt have flere ledere, eller kun én?
