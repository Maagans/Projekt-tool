- [x] BE-002: Rate limiting på auth/setup-ruter
  - Formål: Beskyt mod brute-force.
  - Ændringer: Tilføjede `express-rate-limit` og rate-limiter middleware for login/register/setup + env-variabler.
  - Test (TDD):
    1) `npm run lint`.
    2) `npm run build`.
  - Accept: 429 ved overskridelse; legitime brugere kan stadig logge ind under normal brug.
- [x] BE-003: Central error handler
  - Formål: En ensartet 500-respons og mindre duplikeret try/catch.
  - Ændringer: Tilføjede global createAppError helper, central error middleware og opdaterede auth/workspace/time-entry routes til at bruge 
ext(createAppError(...)).
  - Test (TDD):
    1) 
pm run lint.
    2) 
pm run build.
  - Accept: Konsistente fejlbeskeder/logs; ingen utilsigtede 200'er ved fejl.
- Start fra den første fase og bevæg dig nedad; faserne reducerer risiko ved at sikre stabilt grundlag først.
- Hver opgave beskriver “Red-Green-Refactor” i praksis via konkrete testtrin og klare acceptkriterier.
- Hvor der foreslås nye værktøjer (lint/CI/test), opret dem i små commits og valider i pipeline, før du fortsætter.

---

## Fase P0 — Forberedelse & Hygiejne (lav risiko, stor effekt)

- [x] REPO-001: Fjern dubletter og genererede filer
  - Formål: Eliminér filkollisioner og forvirring mellem `src/**` og rodkopier.
  - Ændringer: Slet/arkivér bl.a. `App.js`, `components/*.js`, `hooks/useProjectManager.js`, `index-1.tsx`, tom `index.tsx`, `types.js`, `metadata*.json` (eller flyt til `docs/`), `tmp_patch.py`, `setup-db.sql` (i roden), `-1.gitignore`.
  - Test (TDD):
    1) `npm run dev` (frontend) starter uden importfejl.
    2) `rg -n "src\\(components|hooks|types)" -S` viser, at kun TypeScript-kilder bruges.
  - Accept: Dev og build virker; ingen ubrugte .js-duplikater parallelt med .tsx.
  - PRD: §4 Stabilitet og Pålidelighed (grundlag for projekt- og ressourcestyring i §3.1–§3.3).
  - Afhængigheder: Ingen.

- [x] REPO-002: Normalisér filkodning og lokalisering
  - Formål: Undgå “�”-tegn i UI og sikre konsistent UTF-8.
  - Ændringer: Tilføj `.editorconfig`; ret mis-encodede strenge (fx “Skælskør” i `src/types.ts`).
  - Test (TDD): Åbn UI; verificér danske tegn (æøå) vises korrekt i titler og labels.
  - Accept: Alle danske strenge gengives korrekt i browseren og i build-output.
  - PRD: §4 Performance & Responsivitet (lokaliseret UI fra §3.1 og §3.2 uden encoding-fejl).
  - Afhængigheder: REPO-001 (anbefalet).

- [x] REPO-003: ESLint/Prettier baseline for TS/React
  - Formål: Fange fejl tidligt og standardisere stil.
  - Ændringer: Tilføj `.eslintrc.cjs` + `.prettierrc.json`, installer `eslint-plugin-react`, ryd op i ubrugte imports og kør `npm run lint`.
  - Test (TDD): `npm run lint` returnerer 0 fejl; CI konfigureres senere til at køre lint.
  - Accept: Ingen lint-fejl i `src/**`.
  - PRD: §4 Stabilitet og Pålidelighed (kodekvalitet understøtter kernefunktioner i §3.1–§3.3).
  - Afhængigheder: Ingen.

---

## Fase P1 — Frontend konfiguration og build-hærdning

- [x] FE-001: Env-baseret API-base + Vite-proxy
  - Formål: Undgå hardcoded URL'er og CORS-problemer i dev.
  - Ændringer: Opsæt `VITE_API_BASE_URL` i `src/api.ts`, tilføj proxy i `vite.config.ts`, opret `.env.example`, opdater README.
  - Test (TDD):
    1) `npm run lint`.
    2) `npm run build`.
  - Accept: Login/workspace fungerer i dev uden CORS-justeringer og kan pege mod eksternt API via `.env`.
  - PRD: §3.1 Kernefunktioner (stabil driftsopsætning) & §4 Stabilitet og Pålidelighed (miljøfleksibilitet).
  - Afhængigheder: Ingen.

- [x] FE-002: Fjern importmap i `index.html` (CDN Tailwind beholdes midlertidigt)
  - Formål: Deterministiske builds uden eksterne importmaps.
  - Ændringer: Fjernede importmap-blokken og rettede title-encoding i `index.html`.
  - Test (TDD):
    1) `npm run lint`.
    2) `npm run build`.
  - Accept: Ingen runtime-fejl pga. manglende imports; konsol er ren.

- [x] FE-003: Strammere TS-importer (ingen .ts/.tsx endelser)
  - Formål: Konsistente imports og nemmere refaktor.
  - Ændringer: Sat `allowImportingTsExtensions=false`, `allowJs=false` i tsconfig og fjernede alle `.ts`/`.tsx`-endelser i imports.
  - Test (TDD):
    1) `npm run lint`.
    2) `npm run build`.
  - Accept: Build og dev fungerer uden TS-endelser i imports.
  - PRD: §4 Stabilitet og Dataintegritet (tydelige moduler til rapport- og ressourceflows i §3.1–§3.2).
  - Afhængigheder: REPO-003.


- [x] FE-005: Bundt Tailwind lokalt
  - Formål: Eliminér CDN-afhængighed for CSS og få prod-kontrol.
  - Ændringer: Installerede Tailwind/PostCSS lokalt, tilføjede `tailwind.config.js`, `postcss.config.js`, `src/index.css`, importerede CSS i `main.tsx`, fjernede CDN fra `index.html`.
  - Test (TDD):
    1) `npm run lint`.
    2) `npm run build`.
  - Accept: Ingen visuelle regressioner og ingen CDN-kald i prod.
  - Afhængigheder: FE-002.

  - Afhængigheder: FE-002.

---

## Fase P2 — Backend sikkerhed og robusthed

- [x] BE-001: `helmet` + stram CORS via env
  - Formål: Basal sikkerhed og kontrolleret origin-adgang.
  - Ændringer: Tilføjede Helmet, CORS-whitelist styret af `CORS_ORIGIN` med udviklingsfallback og dokumenterede env-feltet.
  - Test (TDD):
    1) `npm run lint`.
    2) `npm run build`.
  - Accept: CORS kun tilladt fra whitelisted origin; security-headere sat.

  - PRD: §3.3 Bruger- og adgangsstyring & §4 Sikkerhed/Kryptering (beskyt loginflow).
  - Afhængigheder: Ingen.


- [ ] BE-003: Central error handler
  - Formål: En ensartet 500-respons og mindre duplikeret try/catch.
  - Ændringer: Tilføj `app.use((err, req, res, next) => { ... })`; skift lokale catch til `next(err)`.
  - Test (TDD): Tving en fejl (fx kast i en route); respons er 500 med ensartet JSON.
  - Accept: Konsistente fejlbeskeder/logs; ingen utilsigtede 200’er ved fejl.
  - PRD: §4 Stabilitet og Pålidelighed (kontrollerede fejl for rapportering i §3.1–§3.2).
  - Afhængigheder: BE-001.

- [x] BE-004: Inputvalidering (login/register/time-entries)
  - Formål: Forudsigelige 400-fejl ved dårlige inputs.
  - Ændringer: `zod`/`joi` skemaer for body/params; indsæt i relevante ruter.
  - Test (TDD): Send ugyldige felter/typer; 400 med forklarende fejl.
  - Accept: Alle validerede ruter afviser dårlige inputs konsistent.
  - PRD: §3.1–§3.3 Dataintegritet (forhindrer forkerte data i projekter, rapporter og brugere).
  - Afhængigheder: BE-003.

- [x] BE-005: `/health` endpoint
  - Formål: Drift/overvågning; enkel liveness/readiness.
  - Ændringer: Tilføjede `GET /health` med DB ping og dokumenterede endpoint i README/backend-README.
  - Test (TDD):
    1) `npm run lint`.
    2) `npm run build`.
  - Accept: `curl /health` = 200; kan sondres i load balancer.


- [x] BE-006: Log-hardening (no PII; structured logging)
  - Purpose: Improve operations; avoid sensitive data in logs.
  - Changes: Added Pino logger, centralized error handling logging, scrubbed login email output, and documented `LOG_LEVEL`.
  - Test (TDD):
    1) `npm run lint`.
    2) `npm run build`.
  - Acceptance: Logs contain no PII and remain machine-readable.
---

## Fase P3 — CI/CD, kvalitet og dev-oplevelse

- [x] CI-001: GitHub Actions – build/lint for root + backend
  - Formål: Automatisk kvalitetstjek ved PR.
  - Ændringer: Workflow der kører `npm ci`, `npm run lint`, `npm run build` (root) og tilsvarende i `backend/`.
  - Test (TDD): Åbn PR; workflow passerer grønt.
  - Accept: Alle PR’er kører pipeline; fejl blokkerer merge.
  - Afhængigheder: REPO-003.

- [x] CI-002: Postgres-service + migration smoke test
  - Formål: Fang DB/migration-fejl tidligt.
  - Ændringer: Actions-job med Postgres service, `backend/npm run migrate` mod test-DB.
  - Test (TDD): Workflow passerer; migrations anvendes uden fejl.
  - Accept: Stabil migrationskørsel i CI.
  - Afhængigheder: CI-001.

- [ ] DEV-001: `dev:all` – start FE+BE samtidig
  - Formål: Hurtigere lokal udvikling.
  - Ændringer: Tilføj `concurrently` i root scripts til at køre `vite` + `backend:nodemon`.
  - Test (TDD): `npm run dev:all` starter begge processer.
  - Accept: Ét kommando-flow til lokal udvikling.
  - Afhængigheder: FE-001, BE-001.

- [ ] CI-003: Husky + lint-staged (pre-commit)
  - Formål: Fang issues før commit.
  - Ændringer: Opsæt pre-commit, der kører lint/format på staged filer.
  - Test (TDD): Commit med lint-fejl blokeres; rettelse tillader commit.
  - Accept: Hooks kører konsistent på alle maskiner.
  - Afhængigheder: REPO-003.

---

## Fase P4 — Database og migrations

- [ ] DB-001: `citext` til e-mails + unikke indeks
  - Formål: Indbygget case-insensitive håndtering af emails.
  - Ændringer: Migration: `CREATE EXTENSION IF NOT EXISTS citext;` og ændr brugte email-kolonner til `citext`; erstat `LOWER(...)`-indeks.
  - Test (TDD): Opret to brugere med `Admin@Example.com` og `admin@example.com` → 2. fejler på unikhed.
  - Accept: Login/registrering virker fortsat; unikhed håndhæves.
  - Afhængigheder: CI-002.

- [ ] DB-002: Kapacitetsfelter (ressource-roadmap)
  - Formål: Forberede ressourcestyring (RM-roadmap).
  - Ændringer: Migration der tilføjer `employees.max_capacity_hours_week numeric(6,2) NOT NULL DEFAULT 0`.
  - Test (TDD): Migration opdaterer schema; API kan læse feltet uden fejl.
  - Accept: `npm run migrate` okay; ingen brud i eksisterende flows.
  - Afhængigheder: CI-002.

- [ ] DB-003: Azure SSO felter (forberedelse til ROADMAP)
  - Formål: Understøt senere Azure Graph sync/SSO.
  - Ændringer: Migration med felter som beskrevet i `ROADMAP.md` (fx `azure_ad_id`, `department`, `job_title`, `account_enabled`, `synced_at`).
  - Test (TDD): Migration og rollback kører; ingen effekt på eksisterende data.
  - Accept: Schema udvidet uden regressions.
  - Afhængigheder: CI-002.

---

## Fase P5 — Backend struktur og modulopdeling

- [ ] BE-007: Opdel `backend/index.js` i routers og services
  - Formål: Vedligeholdbarhed + testbarhed.
  - Ændringer: Opret `routes/auth.js`, `routes/workspace.js`, `routes/users.js`, `routes/projects.js`; flyt forretningslogik til `services/*`.
  - Test (TDD): Smoke: Alle eksisterende endpoints svarer som før (200/401/403/404 og JSON-formater uændret).
  - Accept: Ingen ændring i API-kontrakter; kode kompileres og kører.
  - Afhængigheder: BE-003, BE-004.

---

## Fase P6 — Valgfri hardening og DX-forbedringer

- [ ] SEC-001: JWT i HttpOnly-cookie (i stedet for localStorage)
  - Formål: Mindre XSS-eksponering.
  - Ændringer: Udskift bearer-flow med `Set-Cookie` HttpOnly + CSRF-beskyttelse; hold samme payload/TTL.
  - Test (TDD): Login sætter cookie; API-kald virker; CSRF-test blokkerer cross-site POST.
  - Accept: Funktionelt login/logout uden localStorage token.
- [x] FE-004: Global Error Boundary + API-fejlvisning
  - Formål: Robust fejloplevelse og hurtigere fejlfinding.
  - Ændringer: Tilføjede `ErrorBoundary`, globale toasts (`StatusToast`) og håndterer 401/5xx fra API med brugerbesked.
  - Test (TDD):
    1) Stop backend/server og bekræft at UI viser toast og recovery i stedet for blank side.
    2) `npm run lint` & `npm run build`.
  - Accept: Ingen blanke sider; fejl vises konsistent og kan lukkes.
  - PRD: §3.1 Projektrapportering (pålidelig UX) & §4 Stabilitet (graceful degradation).
  - Afhængigheder: FE-001.

  - Dependencies: BE-006.

- [ ] FE-006: Beskyt mod reload-loops ved 401 i `api.ts`
  - Formål: Undgå gentagne `window.location.reload()`-loops.
  - Ændringer: Indfør “once” guard/flag eller redirect til login uden hard reload.
  - Test (TDD): Invalider token; app går til login uden uendelig reload.
  - Accept: Stabil recovery fra 401.
  - Afhængigheder: FE-004.

---

## Fase P7 — Dokumentation

- [ ] DOC-001: Opdater README + backend/README med nye flows
  - Formål: Hold dokumentation i sync.
  - Ændringer: API-base via env, CORS/helmet, dev:all, CI badges.
  - Test (TDD): Følg README “fra nul” i et rent miljø → alt virker.
  - Accept: En udvikler kan komme fra 0 → kørende miljø via docs.
  - Afhængigheder: P0–P3 primært.


Noter
- Opgaverne er designet, så hver kan merges isoleret og verificeres med minimale, reproducerbare trin.
- Ved større refaktoreringer (BE-007) anbefales flag/feature toggles og små commits med hyppige smoke-tests.
