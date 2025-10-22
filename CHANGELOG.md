# Changelog
All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [1.1.7] - 2025-10-21
### Changed
- Aktiverede strict TypeScript i frontendens build og tilføjede supplerende sikkerhedsflag (`strict`, `noImplicitOverride`, m.fl.) for at fange typefejl tidligt (ST-005).
- Refaktorerede `useProjectManager` til en delt provider/intern hook-struktur og opdaterede relaterede komponenter/tests, så strict-mode gennemføres uden `any`-smuthuller (ST-005).
- Strammere typer i UI-komponenter og PMO-overblik, herunder typed rapportmodal, tidslinje-drag og organisationskort uden `any`-afhængigheder (ST-005).


## [1.1.5] - 2025-10-21
### Added
- Vitest + Testing Library til frontend samt Vitest + Supertest til backend med eksempeltests for `useProjectManager`, `loadFullWorkspace` og `/health` (ST-001).
- Fælles test-setup (`src/setupTests.ts`) og dokumenterede testkommandoer i README.
### Changed
- Centraliseret backend-konfiguration (`backend/config/index.js`) der validerer miljøvariabler med Zod og eksporterer typed defaults (ST-002).
- Middleware, scripts og services opdateret til at bruge config-modulet (auth, rate limiting, database, logger, cookies, backup/seed-scripts m.fl.).\n- Udvidet input-validering for setup- og bruger-API'et med nye Zod-schemas og validator-tests (ST-003).\n- Transaktionshelper introduceret og brugt i auth/setup/projects services samt nye rollback-tests (ST-004).

## [1.1.4] - 2025-10-21
### Added
- Feature flag `RESOURCES_ANALYTICS_ENABLED` med backend-placeholder (501) og frontend-navigation/preview-side for Ressource Analytics (RM-001).
### Changed
- README og miljøfiler opdateret med instruktioner til at aktivere ressourcemodulets preview.

## [1.0.12] - 2025-10-20
### Fixed
- Hardened backend login, register og time-entry endpoints med Zod-validering, så ugyldige inputs giver ensartede 400-fejl (BE-004).
### Added
- GitHub Actions pipeline der kører install, lint og build for frontend og backend på push/PR (CI-001).
- Postgres-service i CI og migration smoke-test (`npm run migrate`) (CI-002).
- `npm run dev:all` / `npm run dev:backend` scripts baseret på `concurrently` (DEV-001).
- Husky + lint-staged pre-commit hook der lint'er staged frontend- og backend-filer (CI-003).
### Changed
- `users.email` og `employees.email` konverteret til `citext` med native unikhed (DB-001).
- Tilføjede `employees.max_capacity_hours_week` og eksponerede feltet i API/types (DB-002).
- Udvidede `employees`-skemaet med Azure AD felter og unik indeks til SSO/sync (DB-003).

## [1.0.8] - 2025-10-20
### Fixed
- Rettede mis-encodede danske tegn i UI, dokumentation og metadata.

## [1.0.7] - 2025-10-20
### Added
- Lokal Tailwind/PostCSS pipeline og global error handling UI (FE-002–FE-004).
- `/health` endpoint med database-ping.
### Changed
- Frontend API-konfiguration nu miljødrevet (FE-001, FE-003).
- Backend security strammet med Helmet, rate limiting og centraliseret error handling (BE-001–BE-003).
- Struktureret logging via Pino uden PII (BE-006).

## [1.0.6] - 2025-10-20
### Changed
- Ryddede op i duplikatfiler og flyttede legacy-metadata til `docs/`.
- Tilføjede `.editorconfig`, ESLint og Prettier-konfiguration samt lint-fixes.
- Pinned TypeScript 5.5.4 for at matche @typescript-eslint.

## [1.0.5] - 2025-10-08
### Fixed
- Rettede `node-pg-migrate`-konfigurationen til at bruge JSON og ESM-kompatible migrationer.
- Opdaterede admin seeding-scriptet til at håndtere interaktive/non-interaktive miljøer sikkert.
### Changed
- Opdaterede README med ny installationsproces (`npm run migrate`, `npm run seed:admin`).

## [1.0.4] - 2025-10-01
### Fixed
- Rettede rapport-tidslinjen hvor milepæle kunne overlappe leverancer på brede skærme.

## [1.0.3] - 2025-09-26
### Added
- Eksempeldata til nye rapporter (faser, deliverables, risici og kanban-opgaver) for hurtigere opstart.
- Justerede leveranceboksene i tidslinjen med mere plads og automatisk ombrydning.

## [1.0.2] - 2025-09-26
### Changed
- Synkroniseringsindikatoren gjort mere synlig og animeret ved tabt forbindelser.

## [1.0.1] - 2025-09-26
### Fixed
- Rettede oprettelse af nye rapporter, så duplikerede IDs undgås og caches opdateres korrekt.
- Standardiserede frontend-ID-håndtering til string UUIDs.
- Tilføjede default projektpermissions og Node type definitions.

## [1.0.0] - 2025-09-26
### Added
- Første offentlige release af Projekt Tool med Vite/React frontend og Express/PostgreSQL backend.
- Rollebaseret adgang (Administrator, Projektleder, Teammedlem).
- JSONB-baseret workspace-lagring for projekter, medarbejdere og time tracking.
- Database-bootstrap script (`backend/setup-db.sql`) og miljøbaseret konfiguration.
- Lokale udviklingsscripts til backend (`npm run dev` i `backend/`) og frontend (`npm run dev`).


