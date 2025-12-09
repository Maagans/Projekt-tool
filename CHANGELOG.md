# Changelog
All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.14.0] - 2025-12-09
### Added
- **Frontend:** 4 nye domæne-hooks til modulær arkitektur (ARCH-001):
  - `workspaceUtils.ts` - Delte typer og utilities
  - `useEmployeeMutations.ts` - Employee CRUD operationer
  - `useProjectMutations.ts` - Project CRUD med debounced sync
  - `useMemberMutations.ts` - Projektmedlem operationer
- **Backend:** Repository-lag for workspace-operationer (ARCH-002):
  - `workspaceRepository.js` - Alle workspace SQL queries
  - `loadWorkspaceService.js` - Data loading via repository
  - `workspacePermissions.js` - Tilladelseskontrol
- **Frontend:** `src/api/index.ts` samler API-moduler (ARCH-003)

### Changed
- Frontendmoduler følger nu domæneopdelt arkitektur (~960 linjer ekstraheret)
- Backend følger 3-lags arkitektur: Controller → Service → Repository
- Ingen breaking changes - originale filer bevaret for gradvis migration

## [1.13.0] - 2025-12-09
### Added
- Password reset via email-link med Microsoft Graph API og dev-mock til lokal test (AUTH-001).
- `auth_provider` felt på users-tabellen til hybrid auth (local/Azure AD) forberedt til SSO.
- Nye frontend-sider: `ForgotPasswordPage` med Azure AD-bruger-detection og `ResetPasswordPage`.
- "Glemt password?" link på login-siden.
- Azure setup guide i `docs/azure-mail-setup-guide.md`.

### Changed
- Backend følger 3-layer arkitektur: controller, service, repository for password reset.
- Config udvidet med Azure Mail og password reset miljøvariabler.

## [1.9.1] - 2025-12-02
### Added
- Ny `usePmoWorkload` hook med tilhørende Vitest-suite der udtrækker og tester PMO-belastningslogikken separat fra UI-laget.

### Fixed
- PMO-siden bruger nu hooken i stedet for en stor `useMemo`, så komponenten holdes ren og nem at vedligeholde.
- MilestonePlan linter rent igen efter oprydning af ubrugte variabler og manglende `useEffect`-afhængigheder i `DeliverableDetailModal`.

## [1.12.0] - 2025-11-27
### Added
- Mulighed for at tilføje eksterne projektmedlemmer via navn/email; backend opretter automatisk medarbejder og returnerer både medlem og ny employee.

### Changed
- Ressourceanalytics udelader medarbejdere med afdeling "Ekstern" fra kapacitet/planlagt/faktisk og fikser SQL-parametrering for projektvisning.
- Ressourcepanelet på projekter viser kun planlagt/faktisk (kapacitet og over-allokerede uger skjult) og invaliderer analytics efter timelog-opdateringer.
- Projektmedlems-sletning er idempotent, så fjern-kald fejler ikke hvis medlemmet allerede er væk.

## [1.11.0] - 2025-11-24
### Added
- Auth/setup flyttet til repository-lag (LEG-004): nyt `usersRepository`, UUID-defaults for employees, services bruger Zod + transaktioner.
- MilestonePlan: auto-opretter første rapport for nye projekter, så tidsplanen ikke loader tomt.

### Changed
- Workspace-sync skriver ikke længere projekter (LEG-005); projekt-CRUD går kun via projekt-API, så start-/slutdatoer og status ikke bliver overskrevet ved sync.
- Fasefarver clampes til den faste palette (ingen lave kontrastfarver) og nye faser seedes med pastel-blå default.

## [1.10.0] - 2025-11-24
### Added
- Risk repository-lag for projekt-risici (LEG-001) med service-integration; services bruger ikke længere direkte SQL.
- Demo-seed opdateret til ny rapport-/risikoarkitektur: workstreams, snapshots, projekt-risici, gyldige locations og aktuelle tidsregistreringer (2025-W44..W47); seed kører med `--reset`.

### Changed
- Rapportservice validerer projekt-eksistens før oprettelse/listing og undgår FK-fejl på stale projectIds.
- Projektservice normaliserer datoer med `toDateOnly` for at undgå dagsforskydning ved status-opdatering.
- ProjectReportsPage og PmoPage robusthed: fejlhåndtering for rapport-load og fix for grouped locations i PMO.
- Seedede projektperioder justeret til 2025-2026 for at matche nuværende datoer; locations begrænset til godkendte afdelinger.

## [1.9.0] - 2025-11-24
### Added
- Ny MilestonePlan-fane (`/projects/:id/plan`) med dedikeret MilestonePlan-komponent, Gantt-/listevisning, modaler for workstreams/faser/milepæle/leverancer, `readOnly`-tilstand og lucide-ikoner (MP-002).
- RTL/Vitest-dækning for MilestonePlan-flowet og nye modal-hooks samt opdateret ProjectLayout-route til planen.

### Changed
- Timeline/plan-arbejdsgange er samlet i MilestonePlan-komponenten og bundet til `projectActions`, så CRUD-resultater toastes og autosave/fejlmeldinger er konsistente.
- Workstream- og rapport-synkronisering er udtrukket til dedikerede repositories, så milestone-plan logik følger Controller → Service → Repository-arkitekturen (REF-001).

## [1.8.1] - 2025-11-19
### Added
- `Agents.md` og `Hardeningplan.md` dokumenterer layer-arkitektur og hardening-plan for nye features.
- Centralt konstantlag for roller (`backend/constants/roles.js`) og projektstatus (`backend/constants/projectStatus.js`) samt dedikerede repositories for projekter og medarbejdere.

### Changed
- `projectService` og `employeesService` benytter nu repositories + Zod-validering; alle SQL-kald er trukket ud, og permissions/sanitetslogik er bevaret i services.
- Auth- og bruger-services validerer nu login/register + rolleændringer via Zod, og passwords/emails normaliseres før brug.
- Frontend-typer (`src/types.ts`) er strammet så UserRole/ProjectStatus/ProjectConfig matcher backend-kontrakterne (inkl. `null`-felter og `PhaseStatus` med `Pending`).

## [1.7.0] - 2025-11-17
### Added
- Projektindstillinger har fået felterne projektmål, business case og samlet budget inkl. backend-migration, API-typer og RichText/nummerfelter i UI'et (UX-018).
- Dedikeret Overblik-side som standardlanding i ProjectLayout med grid-skelet, tom-states og CTA'er til rapporter/indstillinger (UX-019).
### Changed
- ProjectLayout-tabs starter nu på Overblik og eksportknappen vises kun på rapportfanen; navigation fra dashboard og PMO fører til den nye landing.
- Dashboard- og PMO-listerne guider brugere til overblikket, så rapportfanen kun vælges når man aktivt klikker videre.

## [1.6.1] - 2025-11-17
### Added
- Bubble-menu rich text editor til status-/udfordrings-/næste skridt-kortene med TipTap og inline toolbar.
- Nyt 
extStepItems-felt i rapporter inkl. backend-migration, seed-data og CRUD-manager i projektmodulet.
### Changed
- Rapportsidekortene har fået Notion-lignende layout, farvekodede ikoner og dynamisk historiksidebar.
- Kanban kolonner og "Tilføj opgave"-knapper har ensartet spacing/bredde og respekterer fuld bredde layoutet.
- AppShell og ProjectLayout opdateret til fuldbredde og kompakt historik med collapsible navigation.
- Tekstfelter/knapper gennemgået for korrekt dansk encoding (æ/ø/å) efter editor-rework.

## [1.6.0] - 2025-11-17
### Changed
- `ProjectManagerProvider` memoiserer nu Auth/Workspace/Admin-contexts + de aggregerede hooks, s? nedstr?ms komponenter ikke re-rendrer n?r deres data ikke ?ndrer sig (DX-013).
- ProjectReportsPage viser ikke l?ngere en duplikeret leveranceliste; tidslinjen er eneste kilde til deliverables (UX-012).
- Timeline-panelet har f?et klik-baseret inspector med tekst-, dato-, farve- og slet-kontroller, s? alle redigeringer samles ?t sted og hover-ikoner er fjernet (UX-013).
- Timeline-drag bruger nu lokalt preview og kalder kun `updateTimelineItem` ved mouseup, hvilket g?r tr?koplevelsen glattere og undg?r un?dvendige re-renders (PERF-011).
- Deliverable-lanes beregnes deterministisk uden `ResizeObserver`, s? kortene ikke hopper eller overlapper ved zoom/resize (UX-014).
- Rapportfanen har f?et et nyt headerkort med projektstatus, rapportuge og hurtige KPI'er for risici/faser/milep?le/leverancer/opgaver (UX-015).
- Kanban-opgaver kan nu ?bnes i et detaljepanel med ansvarlig, deadline og noter; data gemmes i backend og erstatter den tidligere opf?lgningsliste (UX-016).
- Kanban-boardet har f?et en "Vis opgaveliste"-toggle, der ?bner en sorteret task-liste baseret p? nye `createdAt`-felter i backend (UX-017).
- Opdatering af rapporter/kanban-opgaver ?ndrer ikke l?ngere projektets start-/slutdato i backend - leverancedatoer forbliver stabile ved hver synkronisering (bugfix).

## [1.5.1] - 2025-11-17
### Changed
- AppShell skelner mellem bootstrap og baggrundsopdateringer; AppHeader viser nu når workspace-data refetches uden at afbryde brugeren (UX-011).
- ProjectRiskMatrix har ikke længere et separat højre-detalje panel, så rapportens snapshot-sektion er eneste kilde til risikodetaljer; risikoknapperne angiver arkiverede datoer i deres tooltip.
- Risikomatrixens aksemærker er opdateret, så Sandsynlighed-pegen viser opad og Konsekvens er centreret under heatmap’et; de tidligere score-legender er fjernet for et renere layout.

## [1.5.0] - 2025-11-14
### Added
- Nye dedikerede backend-services for projekter, projektmedlemmer, medarbejdere og workspace-indstillinger, så alle mutationer kører via granulære repos uden `mutateWorkspace` (PERF-010).
- Frontend/Backend helper-tests for `snapshotToProjectRisk`/`projectRiskToReportState`, som sikrer at ejernavn/e-mail følger rapport-snapshots (RISK-008).
- Vitest-konfiguration i backend (`backend/vitest.config.js`), så server-tests kører i Node-miljø uden Vite-støj.
### Changed
- `PATCH /api/projects/:id` og `POST /api/projects` returnerer igen komplette projekter (inkl. config, members og reports) hvilket stabiliserer ProjectLayout og lokale caches.
- Rapport-snapshots skriver igen owner-info til databasen, og ProjectReportsPage viser ejernavn/e-mail efter synkronisering.
- `workspaceController` bruger nu målrettede services i stedet for `mutateWorkspace`, og `workspaceMutator.js` er fjernet.
### Fixed
- Projektopdateringer kan ikke længere skrive `NULL` i `start_date`/`end_date`; datoer normaliseres med fallback til eksisterende værdier.
- Tidslinje-/rapportsynkronisering overlever alle felter (bl.a. report tasks) fordi `syncProjectReports` kaldes eksplicit ved create/update.

## [1.4.0] - 2025-11-12
### Added
- Ny project_risks + project_risk_history schema inkl. standardkategorier og helper-moduler til risikoskalaer (RISK-001).
- Backend CRUD-service, validators og REST-endpoints for projekt-risici inkl. tests og Supertest-suiter (RISK-002).
- Feature-flag `PROJECT_RISK_ANALYSIS_ENABLED` der styrer eksponering af risk routes + dokumentation i .env (RISK-003).
- Frontend Risikovurderingstab med liste, filtre, oprettelses-drawer og React Query-integration til de granulære mutationer (RISK-004).
- Moderniseret risikomatrix med varmefarver, drag/drop og tastaturnavigation, koblet til de nye backend-mutationer (RISK-005).
- Rapportmodulet synkroniserer nu kuraterede risici som snapshots; matrixen viser arkiveringsbadges og kan opdateres direkte via PATCH `/api/reports/:id/risks/:snapshotId` (RISK-006).
- QA/UAT playbook (`docs/risk-analysis-qa.md`), permanente risk-flags og dokumenterede smoke-scripts til regressionskontrol (RISK-007).
### Removed
- Fjernet den gamle /api/workspace POST-route, tilhørende validator og Supertest-suite, så backend nu kun understøtter de granulære mutationer fra FE-008.

## [1.3.0] - 2025-11-11
### Added
- Employee-databasen viser nu kapacitet (timer/uge) med validering og fornuftige defaults.
- Nye Vitest-suiter dækker kapacitetsflowet i EmployeePage og useProjectManager.
- PMO workspace settings gemmer baseline (timer/uge) og bruger den i stacked chart med reference og overload-markører.
- Resource Analytics har en sticky filter-sidebar med time-horizon-toggle, så PMO kan inspicere op til 52 uger uden at scrolle til toppen.
- Backend eksponerer granulære employees-/projects-ruter med `workspaceMutator`, validators og seed-script, så FE-008 kan sende præcise payloads.
- Frontenden har dedikerede React Query mutationer + `SyncStatusPill` og "Gem tidslinje"-CTA, der holder ændringer lokalt indtil brugeren gemmer.
- ResourceAnalyticsPage har fået udbrudte komponenter + utils og tilhørende smoke-tests for nøglevyer (DX-004).
### Changed
- CSV-import accepterer en valgfri kapacitetskolonne og normaliserer værdier under autosave.
- README og screenshot-guide forklarer nu baseline-konceptet og hvordan det støtter PMO stacked chart.
- PMO baseline-kortet i dashboardet har fået en poleret gradient med inline-hjælp til admins og seere.
- Hele workspace-flowet er migreret væk fra `api.saveWorkspace` til granulære mutationer med targeted cache-invalidation, så siderne ikke hopper ved drag/drop (FE-008).
- ResourceAnalyticsPage er reduceret til <300 linjer og orkestrerer de nye komponenter i `src/app/pages/resources/components/` (DX-004).
### Fixed
- Risikomatrixen bruger nu en dedikeret `position`-kolonne + migration, så risici ikke bytter pladser efter redigering.
- Leverance- og timeline-ændringer respekterer lokale drafts og udløser ikke længere utilsigtede dato-justeringer eller store scroll-jumps.


## [1.2.8] - 2025-11-04
### Added
- Ressource Analytics er nu indlejret som en fane i PMO med delt komponent og Vitest-daekning for tab-navigation og adgangsregler (PMO-010).
### Changed
- Direkte rute til `/resources` redirecter til PMO med korrekt fane, og dashboardet viser ikke længere det gamle Ressource Analytics-link.

## [1.2.7] - 2025-10-28
### Added
- Mulighed for at skifte mellem ugentlig, opsummeret og kumulativ visning i ressourcediagrammerne med totaler, gennemsnit og visuelle sammenligninger.
### Changed
- Ressourceoverblikket p? projekter er flyttet fra rapportfanen til projektorganisationen for at samle relaterede data et sted.
- Dashboard har nu venstrestillet og kollapsbart navigation med mindre vandrette margener.
- Ressource Analytics har nu en Tilbage til Dashboard-knap for hurtig navigation.

## [1.2.6] - 2025-10-28
### Changed
- Synkroniserer nu `employees.location` og `employees.department` via backend helper, backfill-migration og ekstra tests, s? ressourcemodulet kan regne p? et felt (RM-009).

## [1.2.5] - 2025-10-28
### Added
- CSV-eksport (`?format=csv`) af resource analytics API med metadata og data-r?kker (RM-007).
- In-memory caching af aggregationsresultater med TTL for at aflaste databasen og forbedre svartid (RM-007).

## [1.2.4] - 2025-10-28
### Added
- Projekt-dashboard panel med ressourceoverblik p? projektsiden inkl. Recharts-visualisering, over-allokeringsmarkering og rangevalg (RM-006).
- Vitest-d?kning for projektpanelet samt genbrug af resource analytics hook til projekt-scope.


## [1.2.0] - 2025-10-28
### Added
- Router-baseret `AppShell` med lazy-loaded sider for dashboard, projekter, PMO, medarbejdere og administration; nye delte komponenter (`AppHeader`, `GlobalErrorScreen`) og konstanter under `src/app/` (DX-003).
- Dashboard-hilsen der tiltaler den aktuelle bruger og diskret hj?lpetooltip for hurtigt overblik.

### Changed
- Migreret session-, workspace- og autosave-h?ndtering til TanStack Query med mutations/invalidations i auth- og workspace-modulerne; relaterede tests opdateret til at k?re via `QueryClientProvider` (DX-002).
- Omlagt projektvisningen til nested routes med kontekstbaseret actions, hvilket reducerer filst?rrelser og g?r rapport-/organisation-/indstillingssider uafh?ngige (DX-003).
- Frontend afh?ngigheder opdateret med `react-router-dom` og ?vrige filer tilpasset den nye struktur.

## [1.1.9] - 2025-10-27
### Changed
- Modulariseret useProjectManager til dedikerede auth-, workspace- og admin-moduler med f?lles store, s? hooken er under 500 linjer (DX-001).
- Flyttet hj?lpefunktioner (generateId, getWeekKey, m.fl.) til projectManager/utils og forbedret autosave-/stateh?ndtering gennem de nye moduler.

### Added
- Separate modulfiler (useAuthModule, useWorkspaceModule, useAdminModule, store) med fortsat Vitest-d?kning for kerneflow.
## [1.1.7] - 2025-10-21
### Added
- Mulighed for at slette projekter direkte fra dashboardet med bekr?ftelse, hvilket samtidig fjerner tilh?rende rapportdata.

### Changed
- Aktiverede strict TypeScript i frontendens build og tilf?jede supplerende sikkerhedsflag (`strict`, `noImplicitOverride`, m.fl.) for at fange typefejl tidligt (ST-005).
- Refaktorerede `useProjectManager` til en delt provider/intern hook-struktur og opdaterede relaterede komponenter/tests, s? strict-mode gennemf?res uden `any`-smuthuller (ST-005).
- Strammere typer i UI-komponenter og PMO-overblik, herunder typed rapportmodal, tidslinje-drag og organisationskort uden `any`-afh?ngigheder (ST-005).


## [1.1.5] - 2025-10-21
### Added
- Vitest + Testing Library til frontend samt Vitest + Supertest til backend med eksempeltests for `useProjectManager`, `loadFullWorkspace` og `/health` (ST-001).
- F?lles test-setup (`src/setupTests.ts`) og dokumenterede testkommandoer i README.
### Changed
- Centraliseret backend-konfiguration (`backend/config/index.js`) der validerer milj?variabler med Zod og eksporterer typed defaults (ST-002).
- Middleware, scripts og services opdateret til at bruge config-modulet (auth, rate limiting, database, logger, cookies, backup/seed-scripts m.fl.).\n- Udvidet input-validering for setup- og bruger-API'et med nye Zod-schemas og validator-tests (ST-003).\n- Transaktionshelper introduceret og brugt i auth/setup/projects services samt nye rollback-tests (ST-004).

## [1.1.4] - 2025-10-21
### Added
- Feature flag `RESOURCES_ANALYTICS_ENABLED` med backend-placeholder (501) og frontend-navigation/preview-side for Ressource Analytics (RM-001).
### Changed
- README og milj?filer opdateret med instruktioner til at aktivere ressourcemodulets preview.

## [1.0.12] - 2025-10-20
### Fixed
- Hardened backend login, register og time-entry endpoints med Zod-validering, s? ugyldige inputs giver ensartede 400-fejl (BE-004).
### Added
- GitHub Actions pipeline der k?rer install, lint og build for frontend og backend p? push/PR (CI-001).
- Postgres-service i CI og migration smoke-test (`npm run migrate`) (CI-002).
- `npm run dev:all` / `npm run dev:backend` scripts baseret p? `concurrently` (DEV-001).
- Husky + lint-staged pre-commit hook der lint'er staged frontend- og backend-filer (CI-003).
### Changed
- `users.email` og `employees.email` konverteret til `citext` med native unikhed (DB-001).
- Tilf?jede `employees.max_capacity_hours_week` og eksponerede feltet i API/types (DB-002).
- Udvidede `employees`-skemaet med Azure AD felter og unik indeks til SSO/sync (DB-003).

## [1.0.8] - 2025-10-20
### Fixed
- Rettede mis-encodede danske tegn i UI, dokumentation og metadata.

## [1.0.7] - 2025-10-20
### Added
- Lokal Tailwind/PostCSS pipeline og global error handling UI (FE-002?FE-004).
- `/health` endpoint med database-ping.
### Changed
- Frontend API-konfiguration nu milj?drevet (FE-001, FE-003).
- Backend security strammet med Helmet, rate limiting og centraliseret error handling (BE-001?BE-003).
- Struktureret logging via Pino uden PII (BE-006).

## [1.0.6] - 2025-10-20
### Changed
- Ryddede op i duplikatfiler og flyttede legacy-metadata til `docs/`.
- Tilf?jede `.editorconfig`, ESLint og Prettier-konfiguration samt lint-fixes.
- Pinned TypeScript 5.5.4 for at matche @typescript-eslint.

## [1.0.5] - 2025-10-08
### Fixed
- Rettede `node-pg-migrate`-konfigurationen til at bruge JSON og ESM-kompatible migrationer.
- Opdaterede admin seeding-scriptet til at h?ndtere interaktive/non-interaktive milj?er sikkert.
### Changed
- Opdaterede README med ny installationsproces (`npm run migrate`, `npm run seed:admin`).

## [1.0.4] - 2025-10-01
### Fixed
- Rettede rapport-tidslinjen hvor milep?le kunne overlappe leverancer p? brede sk?rme.

## [1.0.3] - 2025-09-26
### Added
- Eksempeldata til nye rapporter (faser, deliverables, risici og kanban-opgaver) for hurtigere opstart.
- Justerede leveranceboksene i tidslinjen med mere plads og automatisk ombrydning.

## [1.0.2] - 2025-09-26
### Changed
- Synkroniseringsindikatoren gjort mere synlig og animeret ved tabt forbindelser.

## [1.0.1] - 2025-09-26
### Fixed
- Rettede oprettelse af nye rapporter, s? duplikerede IDs undg?s og caches opdateres korrekt.
- Standardiserede frontend-ID-h?ndtering til string UUIDs.
- Tilf?jede default projektpermissions og Node type definitions.

## [1.0.0] - 2025-09-26
### Added
- F?rste offentlige release af Projekt Tool med Vite/React frontend og Express/PostgreSQL backend.
- Rollebaseret adgang (Administrator, Projektleder, Teammedlem).
- JSONB-baseret workspace-lagring for projekter, medarbejdere og time tracking.
- Database-bootstrap script (`backend/setup-db.sql`) og milj?baseret konfiguration.
- Lokale udviklingsscripts til backend (`npm run dev` i `backend/`) og frontend (`npm run dev`).




















