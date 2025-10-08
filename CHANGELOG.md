# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
