# Risk Analysis & Matrix Revamp – Solution Design

_Last updated: 2025-11-11_

## 1. Problem & Vision
- Current risk handling lets report authors add ad-hoc risks directly in the report module. This causes divergent risk definitions, duplicated entries per project, and makes it impossible to manage owners/mitigation centrally.
- The existing risk matrix UI shares layout rows with other widgets, feels dated, and cannot be interacted with (no drag/drop, badges, accessibility support).
- Vision (per product owner):
  - Each project gets a **“Risikovurdering”** tab where risks are authored and curated.
  - Every risk has title, description, owner/responsible, follow-up cadence, and **two mitigation plans (Plan A / Plan B)**.
  - The report module simply references these curated risks. The matrix should never create new risks.
  - The matrix UI is modernised: full-width row, scoring badges, drag/drop along probability/impact axes, and responsive styling.

## 2. Scope & Non-Goals
**In scope**
- Backend domain model + migrations for project risks and (optional) history/snapshots.
- Feature-flagged APIs/services for CRUD, scoring helper, and report integration.
- Frontend: new project tab with list/editor, improved matrix, reporting integration, documentation.

**Out of scope (initial pass)**
- Portfolio/aggregate risk dashboards.
- Automated alerts/reminders (incl. overdue risk notifications) and workflow automation.
- Advanced RBAC beyond existing Administrator/Projektleder roles.

## 3. Personas & Core Flows
| Persona | Goals |
| --- | --- |
| Projektleder | Capture project risks, assign responsibility, keep mitigation strategies up to date. |
| PMO/Controller | Review risk posture across portfolio, ensure reports reference latest curated risks. |
| Teammedlem | Read-only visibility in reports; cannot edit risks. |

Primary flows:
1. **Authoring:** Projektleder opens Risikovurdering tab → adds/edits risks with Plan A/B, owner, due date, follow-up notes, status.
2. **Matrix management:** Drag cards in matrix to adjust probability/impact. Changes auto-save via specific mutation endpoint.
3. **Reporting:** When building a weekly report, user selects which curated risks to include. Matrix in report renders exactly those, no ad-hoc additions.

## 4. Functional Requirements
### 4.1 Risk Authoring Tab
- Accessible via `/projects/:id/risks` (guarded by feature flag).
 - List view with filters (status, owner, category, overdue state).
- Drawer/modal editor containing:
  - Title (required) and description (plain text to start; rich text can come later if needed).
  - Probability & impact (confirmed 1–5 scale; labels like “Lav”, “Middel”, “Høj” are copy only).
  - Status (e.g. Open, Monitoring, Closed).
  - Owner (employee selector), due date, free-text follow-up cadence (e.g. “hver 2. uge”), and “Sidst fulgt op” timestamp that updates when man registrerer en opfølgning.
- Kategori-tag vælges fra standardlisten (se §5.3) og bestemmer badge-farve i UI.
  - MitigationPlanA (primary strategy) + MitigationPlanB (fallback), both plain text fields.
  - Notes for last follow-up.
- Activity history toggle (if history table enabled).

### 4.2 Matrix UX
- Dedicated full-width row on report page and optionally inside project tab preview.
- Cards show title, status badge, owner initials, probability × impact score, category chip, and “sidst opdateret” timestamp tooltip.
- Drag/drop (primary interaction) + keyboard support to move cards; updates probability/impact via PATCH.
- Touch-friendly hit targets and “snap” to cells; focus is on making drag feel smooth and the UI visually clean rather than meeting formal WCAG metrics upfront.
- Visual cues for heatmap (low/medium/high).

### 4.3 Reporting Integration
- Report builder fetches risks via `/projects/:id/risks` and allows selecting subset per report.
- When selected, create immutable snapshot (`report_risk_snapshots`) capturing probability, impact, mitigation plans, owner, status at report time.
- Matrix component in report uses snapshot data; no inline editing or creation.
- Show badge if snapshot references a risk that is now archived/closed (“Arkiveret siden uge X”).

### 4.4 Feature Flag & Access
- Env flag `PROJECT_RISK_ANALYSIS_ENABLED`.
- When disabled: existing legacy behaviour remains (matrix remains read-only but data entry disabled).
- Permissions:
  - Administrator & Projektleder: full CRUD.
  - Teammedlem: read-only (can view tab/matrix).
  - Non-authenticated: no access.

## 5. Domain & Data Model
### 5.1 Tables
`project_risks`
| Column | Type | Notes |
| --- | --- | --- |
| id | uuid PK |
| project_id | uuid FK → projects |
| title | text |
| description | text |
| probability | int2 (1–5) |
| impact | int2 (1–5) |
| score | int2 (generated probability*impact or stored) |
| mitigation_plan_a | text |
| mitigation_plan_b | text |
| owner_id | uuid FK → employees (nullable) |
| follow_up_notes | text |
| follow_up_frequency | text |
| category | text (e.g. “Teknisk”, “Ressourcer”) |
| last_follow_up_at | timestamptz |
| due_date | date |
| status | text enum (open/monitoring/closed/etc) |
| is_archived | bool default false |
| created_at / updated_at | timestamptz |
| created_by / updated_by | uuid FK → users |

`project_risk_history` (optional)
- Tracks change log per risk (probability/impact/status/owner).

`report_risk_snapshots`
- `id, report_id, project_risk_id, probability, impact, score, status, title, mitigation_plan_a, mitigation_plan_b, owner_snapshot, archived_at`.

### 5.2 Derived Data
- Score = probability × impact (cap 25). Could store for faster sorting/filtering.
- Matrix coordinates computed from probability/impact (1–5). For UI we need helper `mapRiskToCell(probability, impact) -> {row, column}`.

### 5.3 Default Risk Categories
| Key | Label | Description | Badge Color |
| --- | --- | --- | --- |
| `technical` | Teknisk | Arkitektur, systemfejl, integrationer, performance. | Slate / blågrå |
| `resource` | Ressourcer | Manglende bemanding, nøglepersoner, kompetencegab. | Orange |
| `scope` | Scope & krav | Skiftende krav, uklar scope, prioritering. | Indigo |
| `timeline` | Tidsplan | Deadlines, afhængigheder, eksterne leverancer. | Emerald |
| `budget` | Økonomi | Budgetafvigelser, funding, eksterne kontrakter. | Rose |
| `compliance` | Compliance & sikkerhed | GDPR, sikkerhed, audits, kontrakter. | Red |
| `other` | Andet | Bruges hvis ovenstående ikke passer. | Gray |

- Kategorier gemmes som enum/text i DB med default `other`.
- Frontend viser chips med definerede farver (Tailwind shades) og tillader ikke arbitrære custom tags i første version.

## 6. API Design
### 6.1 Routes
- `GET /projects/:projectId/risks` – list (filters via query params: `status`, `ownerId`, `category`, `overdue=true`, `includeArchived`).
- `POST /projects/:projectId/risks` – create. Validates fields incl. Plan A/B, category, follow-up cadence, last_follow_up_at.
- `PATCH /risks/:riskId` – update fields; used for editing & matrix drag updates (probability/impact) plus updating follow-up metadata and category.
- `DELETE /risks/:riskId` – soft delete (sets `is_archived=true`).
- `POST /reports/:reportId/risks` – attach curated risks to report (body: array riskIds). Server copies to snapshots table.
- `GET /reports/:reportId/risks` – fetch snapshot for rendering/export.

### 6.2 Validation & Errors
- Zod schemas for create/update.
- Probability/impact constrained to allowed scale. Return 422 with helpful message if validation fails.
- Ownership requires employee to belong to same org (existing employees table).

### 6.3 Feature Flag Enforcement
- Middleware checks `PROJECT_RISK_ANALYSIS_ENABLED`. If disabled, routes return 404 or helpful 409 (configurable).

## 7. Frontend Architecture
### 7.1 Project Risk Tab
- React route `/projects/:id/risks`.
- Uses React Query (`useProjectRisksQuery`, `useCreateRiskMutation`, etc.).
- Layout:
  - Left: table/list with filtering/sorting (status, owner, category dropdown using §5.3 options, overdue/archived toggles) and badges for “sidst fulgt op”.
  - Right: matrix preview or empty state instructions.
  - “Ny risiko” button opens drawer with form fields described above.
- Form validations mirrored i frontend (Yup/Zod) for instant feedback, inklusive krav om kategori (fra standardlisten) og ISO parsing for last_follow_up_at.

### 7.2 Matrix Component
- Shared component used both in Risikovurdering tab and Reports.
- Accepts `mode="interactive"` (project tab) vs `mode="snapshot"` (report).
- Implements drag/drop via accessible library (e.g. @dnd-kit). On drop: call `updateRisk({ probability, impact })`.
- Keyboard interactions: arrow keys move selection; Enter opens details.
- Styling: Tailwind grid occupying entire row (12 cols). Contextual colours.

### 7.3 Report Module
- When editing a report, user selects which risks to include (checkbox list referencing curated list).
- Snapshot creation mutation triggered on save. Matrix render uses snapshot data; includes archived badge logic.

## 8. Testing Strategy (TDD Hooks)
- **Backend**
  - Unit tests (Vitest) for scoring helper, permission checks, feature flag.
  - Supertest suite for CRUD endpoints, snapshot creation, drag updates.
  - Migration tests to ensure down migration restores state.
- **Frontend**
  - RTL tests for risk form (validation, Plan A/B fields, owner picker).
  - Matrix interaction tests (drag/drop simulated, ensures mutation called with new coordinates).
  - Report builder tests verifying snapshot badge rendering.
- **End-to-end (optional)**
  - Cypress smoke: create risk → move in matrix → include in report.

## 9. Rollout & Migration Plan
1. Ship migrations + feature-flagged backend (RISK-001/002/003). Flag off in prod.
2. Implement FE tab + matrix behind same flag (RISK-004/005).
3. Build report integration + snapshot (RISK-006).
4. QA/UAT with PMO & selected Projektledere (RISK-007). Provide SSO/test tenant data if needed.
5. Toggle flag for pilot projects. Monitor logs/metrics (API latency, number of risks, snapshot success).
6. Deprecate legacy report risk creation once all projects migrated; existing legacy risk rows can be dropped because they only contain test data.

## 10. Open Questions
- **Resolved**:
  1. Probability/impact stays on a 1–5 scale; labels are copy only.
  2. Mitigation plans launch as plain text.
  3. Follow-up cadence is a free-text field.
  4. No notifications/alerts in this iteration (explicitly out of scope).
  5. Accessibility requirement is “pleasant + easy drag/drop”; no extra WCAG targets for now.
  6. Legacy report risk data can be deleted (test data only).
- **Outstanding**: _None at this time._

## 11. TDD Plan by Milestone
### RISK-001 – Data Model & Migration
- **Goal:** Introduce `project_risks`, optional `project_risk_history`, and remove legacy report risk rows.
- **Tests**
  - Vitest migration test to ensure `down` reverts schema (using `node-pg-migrate` helpers).
  - Unit test for helper that maps category keys and validates probability/impact bounds.
  - Seed-verify script that inserts sample risk and asserts defaults (`is_archived=false`, `category='other'`).

### RISK-002 – Backend Services & APIs
- **Goal:** CRUD service + endpoints with feature flag + role guard.
- **Tests**
  - Service unit tests (Vitest) for `createRisk`, `updateRisk`, `archiveRisk`, `listRisks` filters (status, owner, category, overdue).
  - Supertest suite covering:
    - `GET /projects/:id/risks` with filters/query params.
    - `POST` validation (missing plan, invalid category, probability out of range).
    - `PATCH` for Plan A/B, last_follow_up_at update, drag update of probability/impact.
    - `DELETE` sets `is_archived` and hides from default list.
    - Feature flag disabled => 404/409.
    - Role guard (Projektleder OK, Teammedlem 403).
  - Snapshot tests for API responses (ensuring category chip metadata returned).

### RISK-003 – Feature Flag & Config
- **Goal:** Wire `PROJECT_RISK_ANALYSIS_ENABLED` through config/docs.
- **Tests**
  - Config unit tests verifying default false, env parsing.
  - Supertest verifying routes short-circuit when flag off.
  - README/task lint step? (Manual check; no automated test needed beyond mention).

### RISK-004 – Frontend Risk Tab
- **Goal:** React route, list, drawer editor.
- **Tests**
  - RTL tests for `ProjectRiskList`:
    - Filters by status/category.
    - Shows “sidst fulgt op” badge/timestamp.
  - RTL tests for `RiskEditorDrawer`:
    - Validates required fields (title, category, probability, impact).
    - Submits Plan A/B plain text, owner selection.
    - Updates `last_follow_up_at` when “Registrer opfølgning” knap trykkes.
  - Hook tests (`useProjectRisks`) verifying query/mutation calls (mock fetch).
  - Storybook interaction (optional) for QA preview.

### RISK-005 – Modern Risk Matrix UX
- **Goal:** Rebuild matrix component with drag/drop, statuses, categories.
- **Tests**
  - RTL + @testing-library/user-event to simulate dragging (or fallback: programmatically call handler) ensuring mutation invoked with new probability/impact.
  - Keyboard navigation test (arrow keys move selection, Enter focuses card).
  - Visual regression optional (Chromatic) to ensure full-width layout.
  - Unit test for helper converting probability/impact to grid coordinates & heatmap color.

### RISK-006 – Reporting & Snapshot Integration
- **Goal:** Report builder selects curated risks, creates snapshots, matrix renders snapshot data.
- **Tests**
  - Backend: Supertest for `POST /reports/:id/risks` (snapshot creation) verifying immutable copy stored.
  - Backend: Ensure snapshots include category + last_follow_up info and show archived badge when original risk archived later.
  - Frontend: RTL test for report editor:
    - Selecting risks from list populates matrix preview.
    - Snapshot badge “Arkiveret siden uge X” shows when backend marks archived.
  - Export tests: verify CSV/PDF generator includes mitigation plans, owner, category (unit tests with fixtures).

### RISK-007 – QA, UAT & Docs
- **Goal:** Regression coverage + documentation.
- **Tests / Activities**
  - E2E (Cypress or Playwright) scenario: create risk → drag in matrix → include in report → verify snapshot.
  - Accessibility sanity: tab order + focus ring check (manual + jest-axe optional).
  - README/CHANGELOG updates reviewed.
  - UAT checklist: confirm flows for Administrator & Projektleder roles.

---

Next step: review/approve this SDD, then break into milestone tickets with concrete TDD plans per module.
