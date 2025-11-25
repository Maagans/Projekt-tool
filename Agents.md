# AGENTS.md – AI Development Guidelines

## Critical Instruction for AI Agents
**Before implementing any new feature or refactoring code, read and follow this document.**  
Goal: Transition from “fat services” to a strict layered architecture to improve testability, security, and scalability.

---

## 1. Core Architectural Pattern – 3 Layer Model
For all **new** features (Milestone Plan, Workstreams, etc.) do **not** use the old “service = SQL + logic” pattern.

### Layer 1: Controller / Route (`backend/routes/`)
- **Responsibility:** Handle HTTP request/response, extract params, call service.
- **Rule:** No business logic. No SQL.

```ts
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

```ts
import { milestoneSchema } from '../../validators/milestoneSchema.js';
import * as milestoneRepo from '../../repositories/milestoneRepository.js';

export const create = async (user, payload) => {
  const data = milestoneSchema.parse(payload);       // validate input
  if (user.role !== USER_ROLES.PROJECT_LEADER) throw new Error('Forbidden');
  return milestoneRepo.insert(data);                 // delegate to repository
};
```

### Layer 3: Repository (`backend/repositories/`)
- **Responsibility:** Execute SQL queries only.
- **Rule:** No business logic or permission checks.

```ts
import pool from '../db.js';

export const insert = async (data) => {
  const { rows } = await pool.query('INSERT INTO ... RETURNING *', [data.title]);
  return rows[0];
};
```

---

## 2. Coding Standards & “Must Haves”
### Security & Validation
- Zod schemas are **mandatory** for all frontend inputs (service layer).
- No manual sanitization: rely on strict Zod types (`z.string().uuid()`, etc.).
- Use shared constants (e.g., `USER_ROLES.ADMIN`) instead of literal strings.

### Testing (TDD)
- Write the failing test first (see `backend/tests/`).
- Services should mock repositories; repositories should be tested separately.

### Frontend (React/TypeScript)
- Parse API responses with Zod in `src/api.ts` for runtime safety.
- Keep components small; move complex logic into hooks (e.g., `useMilestonePlan`).

---

## 3. Workflow for New Features (example: `MP-001`)
1. **Analyze** the task and decide which layer(s) to touch.  
2. **Schema first:** define validators in `backend/validators/`.  
3. **Repository:** write the SQL wrapper in `backend/repositories/`.  
4. **Service:** implement logic that ties validation + repository calls together.  
5. **Route:** expose functionality via Express.  
6. **Frontend:** wire up via `src/api.ts` and consume through typed hooks/components.

> ⚠️ Do **not** refactor legacy monolithic services (e.g., `projectService.js`) unless explicitly requested. Apply these rules to **newly written** code.

## 4. Note on workspaceService (LEG-005)
- `workspaceService` er nu read-only for projekter: projekt-CRUD (navn/status/dato/budget mv.) må kun ske via projekt-ruterne og `projectsService`/`projectRepository`.
- Workstreams, projektmedlemmer og rapporter kan stadig sync'es via workspace, men må ikke oprette/opdatere projekter direkte med SQL i service-laget.
