# Changelog
All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/).
## [Unreleased]
### Changed
- Refaktorerede backend'en til modulær struktur med services, controllere og routers for at gøre `index.js` til et tyndt entrypoint (BE-007).
## [1.0.12] - 2025-10-20
### Fixed
- Hardened backend login, register og time-entry endpoints med Zod-validering, s? ugyldige inputs giver ensartede 400-fejl (BE-004).
### Added
- Opsatte GitHub Actions-pipeline der k??rer install, lint og build for b?de frontend og backend p? push/PR (CI-001).
- Udvidede backend CI-jobbet med Postgres-service og migration smoke-test, s? `npm run migrate` k??rer mod en midlertidig database (CI-002).
- Tilf??jede `npm run dev:all`/`npm run dev:backend` scripts baseret p? `concurrently`, s? frontend og backend kan startes samlet (DEV-001).
- Opsatte Husky + lint-staged pre-commit hook der lint'er staged frontend- og backend-filer, s? commits blokeres ved lint-fejl (CI-003).
### Changed
- Konverterede `users.email` og `employees.email` til `citext` og erstattede `LOWER(email)`-indeks med native unique constraints for case-insensitive e-mailh?ndtering (DB-001).
- Tilf??jede `employees.max_capacity_hours_week` (NUMERIC(6,2) ?%? 0) og eksponerede feltet i API/types for kommende ressourcestyring (DB-002).
- Udvidede `employees`-skemaet med Azure AD felter (`azure_ad_id`, `department`, `job_title`, `account_enabled`, `synced_at`) og unik indeks p? `azure_ad_id` som forberedelse til SSO/sync (DB-003).
## [1.0.8] - 2025-10-20
### Fixed
- Rettede mis-encodede danske tegn i UI, dokumentation og metadata, s? ??/??/? vises korrekt i rapportmodulet (hotfix).
## [1.0.7] - 2025-10-20
### Added
- Local Tailwind/PostCSS build pipeline and global error handling UI (FE-002??"FE-004).
- /health endpoint with database ping for monitoring.
### Changed
- Frontend API configuration now driven by environment variables and proxy (FE-001, FE-003).
- Backend security tightened with Helmet, rate limiting, and centralized error responses (BE-001??"BE-003).
- Structured logging via Pino without exposing PII (BE-006).
## [1.0.6] - 2025-10-20
### Changed
- Ryddet op i ??ldre duplikatfiler og flyttet legacy-metadata til `docs/`, s? TypeScript-kilder er den eneste sandhed.
- Tilf??jet `.editorconfig`, ESLint og Prettier-konfiguration samt lint-fixes i frontend-komponenter.
- Pinned TypeScript til 5.5.4 for at matche @typescript-eslint og fjerne v??rkt??jsadvarsler.
## [1.0.5] - 2025-10-08
### Fixed
- Rettede `node-pg-migrate`-konfigurationen til at bruge JSON og ESM-kompatible migrationer, saa `npm run migrate` virker paa nye installationer.
- Opdaterede admin seeding-scriptet til at prompt'e interaktivt for manglende `ADMIN_*` variabler og haandtere ikke-interaktive miljoeer sikkert.
### Changed
- Opdaterede README med ny installationsproces baseret paa `npm run migrate` og `npm run seed:admin` i stedet for det gamle `setup-db.sql`.
## [1.0.4] - 2025-10-01
### Fixed
- Rettede fejl i rapport-tidslinjen hvor milepaele kunne overlappe leverancer ved brede skaerme.
## [1.0.3] - 2025-09-26
### Added
- Tilfoejet eksempeldata til nye rapporter (faser, deliverables, risici og kanbanopgaver) for hurtigere opstart.
- Leverance-bokse i tidslinjen har nu stoerre hoejde, automatisk tekstombrydning og ekstra afstand mellem raekker.
## [1.0.2] - 2025-09-26
### Changed
- Gjort synkroniseringsindikatoren mere synlig og tilfoejet animation, naar forbindelsen til databasen mistes.
## [1.0.1] - 2025-09-26
### Fixed
- Fixed new report creation failing because fresh report rows re-used duplicate IDs; synchronization now hydrates existing IDs and updates caches as rows are inserted.
- Standardised frontend ID handling to use string UUIDs across status tables, rich text lists, and timeline components.
- Added default project permissions and Node type definitions so builds succeed out of the box.
## [1.0.0] - 2025-09-26
### Added
- Initial public release of the Projekt Tool application combining a Vite/React frontend with an Express/Node.js backend backed by PostgreSQL.
- Role-based access model with Administrator, Projektleder, and Teammedlem permissions.
- Workspace storage backed by JSONB including projects, employees, and time tracking data.
- Database bootstrap script (`backend/setup-db.sql`) that provisions schema, extensions, and first administrator account.
- Environment-driven configuration for API (`backend/.env`) and frontend (`.env.local`).
- Local development scripts for running backend (`npm run dev` in `backend/`) and frontend (`npm run dev`).
