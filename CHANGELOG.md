# Changelog
All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]
### Added
- Ny project_risks + project_risk_history schema inkl. standardkategorier og helper-moduler til risikoskalaer (RISK-001).
- Backend CRUD-service, validators og REST-endpoints for projekt-risici inkl. tests og Supertest-suiter (RISK-002).
- Feature-flag `PROJECT_RISK_ANALYSIS_ENABLED` der styrer eksponering af risk routes + dokumentation i .env (RISK-003).
- Frontend Risikovurderingstab med liste, filtre, oprettelses-drawer og React Query-integration til de granulære mutationer (RISK-004).
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















