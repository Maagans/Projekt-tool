# MVP Roadmap: Projekt-Tool PMO

## Executive Summary

PRD indeholder 7 moduler med ~35 features. Baseret på nuværende implementation og nye UX-krav fra PMO anbefales opdeling i 3 faser.

> [!IMPORTANT]
> **Strategisk Skift:** "Project Overview" bliver til et "Stamkort" (Project Charter) – en statisk forsidebeskrivelse af projektet i stedet for et dynamisk dashboard. "Project Organization" omdøbes til "Project Resources" (Projektressourcer).

---

## Nuværende Implementation (Baseline)

| Feature | Status |
|---------|--------|
| User roles | ✅ Admin, Projektleder, Teammedlem |
| Locations | ✅ 5 hardcoded (Sano Aarhus/Middelfart/Skælskør, Dansk Gigthospital, Sekretariatet) |
| Employee capacity | ✅ maxCapacityHoursWeek |
| Projects | ✅ CRUD, status (active/hold/completed) |
| Project members | ✅ Med timeregistrering |
| Reports | ✅ Ugebaseret med risici, faser, milestones |
| Resource analytics | ✅ Kapacitet vs. planlagt/faktisk |
| **Workspace Foundation** | ✅ **KOMPLET** (se Phase 1 nedenfor) |

---

## MVP 1.0 - Foundation & Core UX (Igangværende)

> [!IMPORTANT]
> Fokus: Multi-workspace fuldendt + **Project Charter UX-redesign** + RBAC forbedringer

### 1.1 Workspace Foundation ✅ KOMPLET

| Feature | Status | Notes |
|---------|--------|-------|
| `workspace_id` på alle entiteter | ✅ Done | TD-4 migration |
| Workspace-tabel (id, name, type) | ✅ Done | Repository + routes |
| Bruger-workspace relation | ✅ Done | JWT payload inkluderer workspaceId |
| Data isolation i queries | ✅ Done | Alle list-queries filtrerer |
| Admin UI: workspace dropdown | ✅ Done | User create/edit |
| Frontend: workspaceId i context | ✅ Done | AuthProvider/useProjectManager |

### 1.2 3rd Workspace for Cross-Cutting Projects (NY)

| Feature | Complexity | Status |
|---------|------------|--------|
| Opret "Strategiske Projekter" workspace | Low | ⬜ TODO |
| Seed data med 3 workspaces | Low | ⬜ TODO |
| Dokumentation af context-switching workflow | Low | ⬜ TODO |

> **Arkitektur-beslutning:** I stedet for multi-tenant projekter, oprettes et dedikeret 3. workspace til tværgående projekter (M365, ERP, etc.). Brugere skifter kontekst for at tilgå dette.

### 1.2.1 Workspace Switcher UI (NY)

| Feature | Complexity | Status |
|---------|------------|--------|
| Dropdown i header til workspace-valg | Medium | ⬜ TODO |
| Gem valgt workspace i session/localStorage | Low | ⬜ TODO |
| Refetch projekter/medarbejdere ved skift | Low | ⬜ TODO |

**UI Mockup:**
```
┌─────────────────────────────────────────────┐
│  🏢 Vælg Workspace: [▼ Sekretariatet     ]  │
│     ○ Sekretariatet                         │
│     ○ Behandlingsstederne                   │
│     ○ Cross-Workspace (Strategiske)         │
└─────────────────────────────────────────────┘
```

### 1.2.2 Employee → Workspace Auto-Mapping (NY)

| Feature | Complexity | Status |
|---------|------------|--------|
| `deriveWorkspace(location)` helper | Low | ⬜ TODO |
| Auto-sæt workspace ved CSV-import | Low | ⬜ TODO |
| Auto-sæt workspace ved manuel oprettelse | Low | ⬜ TODO |

**Mapping:**
| Location | Workspace |
|----------|-----------|
| Sano Aarhus, Sano Middelfart, Sano Skælskør, Dansk Gigthospital | Behandlingsstederne |
| Sekretariatet | Sekretariatet |

### 1.2.3 Analytics: Medarbejder-Baseret Model (NY)

| Feature | Complexity | Status |
|---------|------------|--------|
| Ændre analytics query til `WHERE employee.workspace_id = ?` | Medium | ⬜ TODO |
| PMO ser timer for egne folk - uanset projektets workspace | Medium | ⬜ TODO |

> **Nøgle-princip:** "Timer tæller i medarbejderens workspace, ikke projektets." Dette giver hver PMO fuldt overblik over egne folks kapacitet.

### 1.3 Project Charter (Stamkort) - UX REDESIGN (NY)

| Feature | Complexity | PRD Ref |
|---------|------------|---------|
| **Omdøbning:** "Project Organization" → "Project Resources" | Low | - |
| **Fjern:** Hero Image + Capacity Overview fra Project Overview | Low | - |
| **Ny Top Sektion:** | | |
| - Strategisk Ambition/Mål (tekstfelt) | Medium | - |
| - Styringsudvalg & Projektgruppe (avatar-visning) | Medium | - |
| - "Projektplan" knap (link/upload) | Low | - |
| **Nyt Indhold:** | | |
| - Formål (bullet points) | Low | - |
| - Business Case (kort resumé) | Low | - |
| - Placeholders for: Gevinster, Interessenter, Dokumenter | Low | MVP 1.5 |
| **Ny Sidebar:** | | |
| - Top 3 Risici (eksisterende) | ✅ Eksisterer | - |
| - Gevinstpåvirkning (trafiklysstatus) | Medium | - |
| - Næste Skridt (6-måneders horisont) | Low | - |

### 1.4 Forbedret RBAC

| Feature | Complexity | Status |
|---------|------------|--------|
| Ny rolle: "Mellemleder" (PMO) | Low | ⬜ TODO |
| PL read-all, write-own | Medium | ⬜ TODO |
| Projektleder-felt på projekt (`leader_id`) | Low | ⬜ TODO |

### 1.5 Projekt-liste UX

| Feature | Status |
|---------|--------|
| Default filter: kun "Aktiv" | ⬜ TODO |
| "Mine Projekter" sektion | ⬜ TODO |
| Status-filter toggle | ⬜ TODO |

**Estimat:** 4-6 uger | **Risiko:** Medium (UI-redesign)

---

## MVP 1.5 - The Project Toolbox (Næste)

> [!TIP]
> Fokus: Master Data + CRUD-moduler til Charter

### 1.5.1 Organisationshierarki
| Feature | Complexity |
|---------|------------|
| Organisation-tabel | Low |
| Location-tabel (erstatter hardcoded) | Medium |
| Afdeling/Team-tabel | Low |
| Hierarki: PMO → Org → Lok → Afd | Medium |

### 1.5.2 Charter Data Modules (NY)
| Feature | Complexity | Notes |
|---------|------------|-------|
| **Gevinster (Benefits)** - CRUD tabel | Medium | Erstatter placeholder fra MVP 1.0 |
| **Interessenter (Stakeholders)** - CRUD tabel | Medium | Erstatter placeholder fra MVP 1.0 |
| **Dokumentlinks** - CRUD tabel | Low | Erstatter placeholder fra MVP 1.0 |

### 1.5.3 Workflow Forbedringer
| Feature | Complexity |
|---------|------------|
| Risk Snapshot til rapporter (eliminer dobbelt-indtastning) | Medium |
| Job Roles master data | Low |
| Medarbejder status (aktiv/inaktiv/orlov) | Medium |

**Estimat:** 3-4 uger | **Risiko:** Lav

---

## MVP 2.0 - The Analytics Engine

> [!WARNING]
> Fokus: Avanceret ressourcestyring - kræver MVP 1.5

### 2.0.1 Brutto-til-Netto
| Feature | Complexity |
|---------|------------|
| Baseline kapacitet | ✅ Eksisterer |
| Fradrag (drift, ferie, compliance) | High |
| Netto projekt-tid beregning | High |

### 2.0.2 Person-level Filtering (NY)
| Feature | Complexity |
|---------|------------|
| Projekt-filter i grafer | Medium |
| Person-filter i ressource charts | Medium |
| Drill-down (Org → Lok → Afd) | High |

### 2.0.3 Dashboard Forbedringer
| Feature | Complexity |
|---------|------------|
| 85% threshold linje | Low |
| Overbooking highlighting | Medium |

**Estimat:** 4-6 uger | **Risiko:** Høj

---

## Backlog (Post-MVP)

| Feature | Priority |
|---------|----------|
| Dokumenthåndtering (full upload) | Medium |
| Sprint/Agil proces | Low |
| Notifikationsmodul | Medium |
| KPI vs. strategiske mål | Medium |
| Generic Resources (rolle-baseret planlægning) | High |

---

## Anbefalet Rækkefølge

| Fase | Feature | Estimat | Status |
|------|---------|---------|--------|
| **MVP 1.0** | Workspace Foundation | ✅ Done | ✅ |
| | 3rd Workspace Config | 3 dage | ⬜ TODO |
| | Project Charter UX | 2 uger | ⬜ TODO |
| | Renaming (Org→Resources) | 2 dage | ⬜ TODO |
| | RBAC (leader_id) | 1 uge | ⬜ TODO |
| | Projekt-liste UX | 1 uge | ⬜ TODO |
| **MVP 1.5** | Org Hierarki | 2 uger | ⬜ Backlog |
| | Benefits CRUD | 1 uge | ⬜ Backlog |
| | Stakeholders CRUD | 1 uge | ⬜ Backlog |
| | Documents CRUD | 3 dage | ⬜ Backlog |
| | Risk Snapshots | 1 uge | ⬜ Backlog |
| **MVP 2.0** | Brutto-Netto | 2 uger | ⬜ Backlog |
| | Person Filtering | 2 uger | ⬜ Backlog |
| | Dashboard Polish | 1 uge | ⬜ Backlog |

**Total estimat:** ~12-14 uger

---

## Beslutninger (Løst)

| Spørgsmål | Beslutning | Begrundelse |
|-----------|------------|-------------|
| **Workspace strategi** | Strict (database-level) | Crasher hellere end lækker data |
| **Cross-Org Projects** | 3. Workspace | Undgår multi-tenant kompleksitet |
| **Admin scope** | Workspace-scoped | Admin er "Gud i sit rum" |
| **Project leader** | Én primær `leader_id` | O(1) permission check |

## Open Questions (Afventer PMO)

| Spørgsmål | Status |
|-----------|--------|
| Skal man kun kunne tilknytte medarbejdere fra samme workspace? | ⏳ Afventer |
| Må medarbejdere (IT) være i flere workspaces? | ⏳ Afventer |
| PMO permissions: read-only eller redigering? | ⏳ Afventer |
