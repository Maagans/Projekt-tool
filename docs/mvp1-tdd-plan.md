# MVP 1.0 TDD Implementation Plan

## Overview
MVP 1.0 fokuserer på 3 områder: Workspace Foundation, Forbedret RBAC, og Projekt-liste UX.

**TDD Workflow per feature:**
1. ❌ Skriv failing test
2. ✅ Implementer kode til test passerer
3. 🔄 Refactor

---

## Design Decisions & Open Questions

| Spørgsmål | Beslutning | Begrundelse |
|-----------|------------|-------------|
| 1. **Admin scope:** Skal admin se alt på tværs af workspaces, eller kun sin egen? | Workspace-scoped | Forenkler repository logic - ingen `if(admin) fjern_filter`. Admin er "Gud i sit rum". |
| 2. **PMO permissions:** Skal PMO kunne redigere projekter, eller kun se? | | |
| 3. **Project leader:** Kan et projekt have flere ledere, eller kun én? | Én primær `leader_id` | O(1) check i `canEditProject()` - ingen join på project_members. |
| 4. **Employee-Workspace Constraint:** Skal man kun kunne tilknytte medarbejdere fra samme workspace til et projekt? (Kan en PL i SEK kun vælge medarbejdere fra SEK?) | | |
| 5. **Cross-Workspace Employees:** Må medarbejdere (f.eks. IT) være medlem af flere workspaces samtidig? | | |
| 6. **Multi-tenant Projects:** Skal der være projekter der går på tværs af workspaces? (F.eks. "M365 Implementering" der berører hele organisationen). | | |
| **Workspace strategi** | Strict (database-level) | Kræver workspace_id i alle queries - crasher hellere end lækker data. |

### Reflections: Workspace & Employee Model

#### 4. Employee-Workspace Constraint
**"Skal man kun kunne tilknytte medarbejdere fra samme workspace til et projekt?"**

| Fordele | Ulemper |
|---------|---------|
| ✅ Simpel implementation – Én `WHERE workspace_id = ?` | ❌ Ufleksibelt – Kan ikke invitere eksperter fra andre afdelinger |
| ✅ Klar data-isolation – Ingen risiko for at se "fremmede" | ❌ Dublettering – IT-folk skal oprettes i flere workspaces |
| ✅ Hurtig UI – Dropdown viser kun relevante medarbejdere | ❌ Inkonsistent data – Samme person med forskellige kapaciteter |

> **MVP Anbefaling:** Start med strict constraint, tilføj "gæste-invitation" i v2.

#### 5. Cross-Workspace Employees
**"Må medarbejdere (f.eks. IT) være medlem af flere workspaces?"**

| Fordele | Ulemper |
|---------|---------|
| ✅ Realistisk modellering – IT/HR arbejder på tværs | ❌ Kompleks datamodel – Kræver `employee_workspaces` junction-tabel |
| ✅ Én sandhed – Medarbejderens stamdata ét sted | ❌ Kapacitets-split – Hvordan fordeles 37t/uge mellem workspaces? |
| ✅ Bedre analytics – Samlet overblik over en persons tid | ❌ Permission-rod – Kan admin i SEK redigere en IT-medarbejder? |

> **MVP Anbefaling:** Medarbejdere har én `primary_workspace_id`. Cross-workspace i v2.

#### 6. Multi-tenant Projects
**"Skal der være projekter der går på tværs af workspaces?"**

| Fordele | Ulemper |
|---------|---------|
| ✅ Virkeligheds-tro – Store projekter (M365, ERP) berører alle | ❌ Ødelægger isolation – Hvem "ejer" projektet? |
| ✅ Samlet rapportering – Én statusrapport for hele org | ❌ Permissions-mareridt – Hvem kan redigere? Se? |
| ✅ Undgår dubletter – Ét projekt i stedet for 3 kopier | ❌ Analytics-forurening – Timer fra SEK tæller i Behandling |

> **MVP Anbefaling:** Nej. Opret projektet i "IT" eller "Fælles" workspace. Tilføj `visibility: 'organization'` flag i v2.

### Samlet MVP 1 Strategi

| Spørgsmål | MVP 1 (simpelt) | v2 (avanceret) |
|-----------|-----------------|----------------|
| Employee constraint | ✅ Strict – kun egen workspace | Tilføj "gæste-invitation" |
| Cross-workspace employees | ❌ Nej – én primary workspace | Junction-tabel med allocation |
| Multi-tenant projects | ❌ Nej – opret i fælles workspace | `visibility: 'organization'` flag |

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
backend/tests/repositories/workspaceRepository.test.js
- [x] loadEmployees filters by workspace_id when provided
- [x] loadEmployees returns all when no workspaceId (backwards compat)
- [x] loadProjects filters by workspace_id when provided
- [x] loadProjects returns all when no workspaceId (backwards compat)
```

**Implementation:**
- [x] Migration: `workspace_id` columns (✅ Done in TD-4)
- [x] `workspaceRepository.loadEmployees(executor, workspaceId)` → workspace filter ✅
- [x] `workspaceRepository.loadProjects(executor, workspaceId)` → workspace filter ✅
- [x] `loadWorkspaceService.loadFullWorkspace(client, workspaceId)` → passes filter ✅
- [x] `workspaceService.loadFullWorkspace(client, workspaceId)` → workspace filter ✅
- [x] `workspaceService.buildWorkspaceForUser()` → passes user.workspaceId ✅

### 1.3 User-Workspace Assignment

**Tests først:**
```
backend/tests/services/authService.test.js
- [x] login returns user.workspaceId in response ✅
- [x] includes workspaceId in JWT payload ✅
- [x] handles null workspaceId gracefully ✅

backend/tests/authMiddleware.test.js
- [x] sets req.user.workspaceId from JWT token ✅
- [x] allows tokens without workspaceId (backwards compat) ✅
```

**Implementation:**
- [x] `userRepository.findByEmail()` → returns workspace_id ✅
- [x] `userRepository.findById()` → returns workspace_id ✅
- [x] Migration: seed users with workspace_id
- [x] `authService.login()` → includes workspaceId in response ✅
- [x] JWT payload → includes workspaceId ✅
- [x] Auth middleware → passes workspaceId through (already worked) ✅
- [x] Migration TD-4 → backfills existing users with workspace_id ✅
- [x] **Frontend:** User interface includes workspaceId ✅

### 1.4 Data Isolation

**Tests først:**
```
backend/tests/integration/workspaceIsolation.test.js
- user in Workspace A cannot see projects from Workspace B
- user in Workspace A cannot see employees from Workspace B
- admin in Workspace A cannot see Workspace B data (admin is scoped)
```

**Implementation:**
- [x] Add workspace filter to all list queries ✅ (Phase 1.2)
- [x] Add workspace validation on create/update operations ✅
- [x] **Admin UI:** Add workspace dropdown when creating/editing users ✅
- [x] **API:** Update user create/update to accept workspaceId ✅

---

## Phase 2: Forbedret RBAC (1-1.5 uger)

### 2.1 PMO Role

**Tests først:**
```
backend/tests/utils/permissions.test.js
- isPMO returns true for PMO role
- isPMO returns false for regular User
- PMO can view all projects in workspace
- PMO cannot edit projects (read-only)
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

backend/tests/services/projectsService.test.js (mock repository)
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
- Admin can edit all projects in own workspace
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

### 3.3 Error Handling (NEW: Gemini feedback)

**Tests først:**
```
src/app/pages/projects/__tests__/ProjectListPage.test.tsx
- shows friendly error message on 403 Forbidden
- shows friendly error message on 500 Server Error
```

**Implementation:**
- [ ] Add error boundary/state for RBAC rejections
- [ ] Display user-friendly "Ingen adgang" message

---

## Test Coverage Summary

| Phase | New Tests | Est. Time |
|-------|-----------|-----------|
| 1.1-1.2 | 6 tests | 2 days |
| 1.3-1.4 | 10 tests | 2 days |
| 2.1-2.3 | 10 tests | 3 days |
| 3.1-3.3 | 8 tests | 2 days |
| **Total** | **~34 tests** | **9 days** |

---

## Definition of Done

- [ ] All new tests passing
- [ ] TypeScript check clean
- [ ] ESLint clean
- [ ] Existing tests still pass
- [ ] Manual verification: login → see workspace-filtered data
- [ ] Committed and pushed

---

## Notes from Review

> [!TIP]
> **Gemini Review Highlights:**
> - Service tests should mock repository layer (fast tests, no DB)
> - Middleware must reject JWT without workspaceId
> - Frontend AuthProvider needs to store workspaceId
> - Location tables in MVP 1.5 need workspace_id too
