# RP-001 – Rapportrefaktor, dataflow og acceptance

## Mål og kontekst
- Formål: Kortlægge rapportfunktionalitet (timeline/deliverables, risici, kanban, statusfelter, snapshots) som grundlag for RP-002..004 og AGENTS.md-arkitekturen.
- Nu: `ProjectReportsPage.tsx` (~1.200 linjer) blander UI, state, mutationer og formatering. Kun rapport-risikodelen bruger et særskilt API (`api.attachReportRisks`, `api.updateReportRiskSnapshot`); resten muterer `projectActions.reportsManager` direkte.

## Data- og modeloverblik (fra src/types.ts)
- Report: `{ id?, weekKey, state: ProjectState }`.
- ProjectState felter:
  - Narratives/status: `statusItems`, `challengeItems`, `nextStepItems`, `mainTableRows`.
  - Timeline: `phases { id, text, start/end %, highlight, workstreamId?, startDate?, endDate?, status? }`, `milestones { id, text, position %, date?, status?, workstreamId? }`, `deliverables { id, text, position %, milestoneId?, status?, owner?, ownerId?, description?, notes?, startDate?, endDate?, progress?, checklist[] }`, `workstreams? { id, name, order }`.
  - Risks: `risks` (ProjectRisk snapshot, mapped fra Risk: probability `s`, impact `k`, status, categoryKey, owner, mitigation, follow-up, archived, updatedAt).
  - Kanban: `kanbanTasks { id, content, status todo|doing|done, assignee?, dueDate?, notes?, createdAt }`.
- Projekt: `{ id, config, reports[], projectMembers[], workstreams? }` (projectMembers har employeeId, role, group, timeEntries).

## Nuværende flows (uddrag fra ProjectReportsPage.tsx)
- Datakilde: `useProjectRouteContext()` leverer `project` + `projectManager.projectActions(project.id, weekKey)`.
- Week lifecycle: `reportsManager.createNext/delete`, `activeWeekKey` sættes til seneste ved load; timeline-dirty gating (`isTimelineDraftActive`, `resetTimelineDraft`, `handleSaveTimeline` skriver til reportsManager).
- Timeline/deliverables: al mutation via `reportsManager.replaceState` med lokal draft-state; ingen dedikerede API-kald.
- Risici:
  - `attachRisksMutation` → `api.attachReportRisks(reportId, riskIds)` POST `/api/reports/:id/risks`; normaliserer snapshots, opdaterer state via `reportsManager.replaceState`.
  - `updateReportSnapshotMutation` → `api.updateReportRiskSnapshot(reportId, snapshotId, { probability, impact })` PATCH `/api/reports/:id/risks/:snapshotId`.
  - Lokal selection: `selectedReportRiskIds`, `selectedSnapshotRiskId`, error-state for selector.
- Kanban: `activeReportState.kanbanTasks`; toggles for liste/inspektør; mutationer sker via `projectActions` (ikke via API).
- Narratives/statuskort: felter i `activeReportState` (`statusItems`, `challengeItems`, `nextStepItems`, `mainTableRows`); gemmes via `projectActions`.
- UI tilstand: `isTimelineDirty`, `isTimelineDraftActive`, `isHistoryCollapsed`, `SyncStatusPill`, `ProjectReportHeader`.
- Eksisterende API-brug er begrænset til risiko-attach/snapshot; resten kører gennem workspace/projectActions.

## Identificerede problemer (som RP-002..004 adresserer)
- Ingen 3-lags separation for rapporter; services indeholder både domænelogik og datahåndtering via workspace.
- Ingen Zod-validering for rapport-payloads i frontend; ingen Zod i backend-ruter (ud over risiko-attach/snapshot).
- Monolitisk komponent (`ProjectReportsPage.tsx`) kombinerer data-fetch, mutationer, formatering og rendering.
- Mutationer sker optimistisk via shared state (`projectActions`) uden dedikerede API-endpoints; svært at teste og versionere.

## Acceptance/tjekliste til de næste trin
- RP-002 (backend):
  - Ruter: list/detail/create/update/delete report + sektioner (timeline/deliverables, risks, kanban, narratives/statuskort).
  - Zod-schemas for alle payloads; 400 ved ugyldig input, 403 ved manglende adgang.
  - Services uden SQL; repositories kun SQL; transaktioner for multi-step writes.
- RP-003 (frontend API/hooks):
  - Zod-parse af list/detail/sektion-responser.
  - React Query hooks pr. sektion med error-toasts og rollback for optimistic updates.
  - Ingen komponent taler direkte med fetch eller `projectActions`.
- RP-004 (UI-opdeling):
  - `ProjectReportsPage` opdelt i shell + paneler; paneler bruger hooks fra RP-003.
  - RTL tests for paneler + integrationstest for samlet side (ugevalg, timeline, risk selection, kanban toggle/inspektør).
  - Lint/test grønt; funktionalitet matcher eller forbedrer nuværende flow.
