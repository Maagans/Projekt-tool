# AGENTS.md – AI Development Guidelines

## Critical Instruction for AI Agents
**Before implementing any new feature or refactoring code, read and follow this document.**  
Goal: Transition from "fat services" to a strict layered architecture to improve testability, security, and scalability.

---

## 1. Core Architectural Pattern – 3 Layer Model
For all **new** features do **not** use the old "service = SQL + logic" pattern.

### Layer 1: Controller / Route (`backend/routes/`)
- **Responsibility:** Handle HTTP request/response, extract params, call service.
- **Rule:** No business logic. No SQL.

```js
router.post('/', async (req, res, next) => {
  try {
    const result = await milestoneService.create(req.user, req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
});
```

### Layer 2: Service + Validation (`backend/services/` + `backend/validators/`)
- **Responsibility:** Validate with Zod, check permissions, orchestrate data flow.
- **Rule:** No `client.query(...)` calls.
- **Rule:** Use `backend/utils/permissions.js` for role checks.

```js
import { milestoneSchema } from '../../validators/milestoneSchema.js';
import * as milestoneRepo from '../../repositories/milestoneRepository.js';
import { isAdmin, canEditProject } from '../../utils/permissions.js';

export const create = async (user, payload) => {
  const data = milestoneSchema.parse(payload);
  if (!canEditProject(user, { projectMembers: [...] })) throw new Error('Forbidden');
  return milestoneRepo.insert(data);
};
```

### Layer 3: Repository (`backend/repositories/`)
- **Responsibility:** Execute SQL queries only.
- **Rule:** No business logic or permission checks.

```js
import pool from '../db.js';

export const insert = async (data) => {
  const { rows } = await pool.query('INSERT INTO ... RETURNING *', [data.title]);
  return rows[0];
};
```

---

## 2. Permission System (`backend/utils/permissions.js`)
**IMPORTANT:** Do NOT use `user.role === 'Administrator'` directly. Use centralized functions:

```js
import { isAdmin, isPMO, isProjectLeader, canEditProject } from '../utils/permissions.js';

// ❌ BAD
if (user.role === 'Administrator') { ... }

// ✅ GOOD
if (isAdmin(user)) { ... }
if (canEditProject(user, project)) { ... }
```

Available functions:
- `isAdmin(user)` - Check admin role
- `isPMO(user)` - Check admin or PMO access
- `isProjectLeader(user)` - Check project leader role
- `canEditProject(user, project)` - Check if user can edit specific project
- `canViewProject(user, project)` - Check if user can view project
- `assertAdmin(user)` - Throws 403 if not admin

---

## 3. Multi-Tenancy & Workspaces
The system supports multiple workspaces (Sekretariatet, Behandlingsstederne).

### Database Structure
- `workspaces` table with `id`, `name`, `type`, `config`
- Core entities have `workspace_id` column: `projects`, `employees`, `users`

### Usage Pattern
```js
// When querying, filter by workspace_id
const projects = await pool.query(
  'SELECT * FROM projects WHERE workspace_id = $1',
  [user.workspaceId]
);
```

### Workspace Types
- `sekretariat` - Monthly time tracking mode
- `behandling` - Weekly time tracking mode (higher granularity)

---

## 4. Master Data Structure
### Organizations & Locations
- `organizations` table: Sano, Dansk Gigthospital, Sekretariatet
- `locations` table: Linked to organizations (e.g., Sano → Aarhus/Middelfart/Skælskør)
- **Note:** Dansk Gigthospital has no locations (Org → Afdeling direct)

### Employee References
```js
// Employees have both legacy location (text) and new foreign keys
employee.location        // Legacy: "Sano Aarhus"
employee.organizationId  // New: UUID reference
employee.locationId      // New: UUID reference (nullable for DGH/SEK)
```

---

## 5. Frontend API Modules (`src/api/`)

### Core Architecture
```
src/api/
├── client.ts         # Core: fetchWithAuth, HttpError, toErrorMessage
├── index.ts          # Re-exports + backward-compat api object
├── authApi.ts        # login, logout, register
├── employeesApi.ts   # Employee CRUD
├── projectsApi.ts    # Project + members CRUD
├── riskApi.ts        # Risk management
├── analyticsApi.ts   # Resource analytics
├── adminApi.ts       # User management
├── workspaceApi.ts   # Workspace settings
├── reportApi.ts      # Report CRUD
├── planApi.ts        # Project plan snapshots
├── organizationsApi.ts
└── workspacesApi.ts
```

### Import Pattern
```ts
// New pattern: import from specific modules
import { authApi } from './api/authApi';
import { fetchWithAuth } from './api/client';

// Backward compat: combined api object still works
import { api } from './api';
api.login(...);
```

### Creating New API Modules
1. Create `src/api/[domain]Api.ts`
2. Import `fetchWithAuth` from `./client` (NOT from `./index`)
3. Export named object (e.g., `export const domainApi = { ... }`)
4. Add re-export in `src/api/index.ts`

---

## 6. Coding Standards

### Security & Validation
- Zod schemas are **mandatory** for all frontend inputs (service layer).
- Use shared constants (`USER_ROLES.*`) via `backend/constants/roles.js`.
- Use permission functions from `backend/utils/permissions.js`.

### Testing (TDD)
- Write the failing test first (see `backend/tests/`).
- Services should mock repositories; repositories should be tested separately.

### Frontend (React/TypeScript)
- Parse API responses with Zod in `src/api.ts` for runtime safety.
- Keep components small; move complex logic into hooks.
- Domain hooks in `src/hooks/projectManager/` (e.g., `useEmployeeMutations.ts`).

---

## 7. Workflow for New Features
1. **Analyze** the task and decide which layer(s) to touch.  
2. **Schema first:** define validators in `backend/validators/`.  
3. **Repository:** write the SQL wrapper in `backend/repositories/`.  
4. **Service:** implement logic (permissions + validation + repository calls).  
5. **Route:** expose functionality via Express.  
6. **Frontend API:** add to appropriate `src/api/*Api.ts` module.
7. **Frontend hook/component:** consume via typed hooks.

> ⚠️ Do **not** refactor legacy monolithic services (e.g., `workspaceService.js`) unless explicitly requested.

---

## 8. Legacy Notes

### workspaceService (LEG-005)
- `workspaceService` is read-only for projects: CRUD must use `projectsService`/`projectRepository`.
- Workstreams, project members, and reports can still sync via workspace.
- Do NOT insert/update projects directly with SQL in the service layer.

### Hardcoded Locations (DEPRECATED)
The `locations` array in `src/types.ts` is legacy. New code should fetch from `/api/organizations/all/locations`.
```
