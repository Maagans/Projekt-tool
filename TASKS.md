# TDD-roadmap og opgaveliste (incrementel, testbar)

Denne liste opdeler anbefalingerne i faser med små, testbare opgaver (TDD-tankegang). Hver opgave har et entydigt ID, formål, foreslåede ændringer, testtrin og acceptkriterier. Tag én opgave ad gangen, verificér med testen, og kryds af, før du går videre.

Legend: [ ] = Ikke startet, [x] = Færdig

Hvordan bruges den
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

- [X] FE-001: Env-baseret API-base + Vite-proxy
  - Formål: Undgå hardcoded URL’er og CORS-problemer i dev.
  - Ændringer: 
    - Skift `src/api.ts` til at bruge `import.meta.env.VITE_API_BASE_URL || '/api'`.
    - Tilføj `server.proxy` i `vite.config.ts` for `'/api' -> 'http://localhost:3001'`.
    - Tilføj `frontend/.env.example` med `VITE_API_BASE_URL=http://localhost:3001`.
  - Test (TDD):
    1) Start backend (`backend/npm run dev`) og frontend (`npm run dev`).
    2) Log ind i UI uden CORS-fejl; API-kald går via `/api`.
  - Accept: Login/arbejdsrum indlæses i dev uden CORS eller URL-ændringer.
  - PRD: §3.1 Kernefunktioner (stabil driftsopsætning) & §4 Stabilitet og Pålidelighed (miljøfleksibilitet).
  - Afhængigheder: Ingen.

- [ ] FE-002: Fjern importmap/CDN i `index.html` (lad Vite bundte alt)
  - Formål: Deterministiske builds uden eksterne CDN/importmaps.
  - Ændringer: Fjern `<script type="importmap">...`-blokken; behold Tailwind midlertidigt via CDN (flyttes i FE-005).
  - Test (TDD): `npm run build` genererer `dist/` uden errors; app kører på `vite preview`.
  - Accept: Ingen runtime-fejl pga. manglende imports; konsol er ren.
  - PRD: §4 Performance & Responsivitet (forudsigelige builds til kerneflows i §3.1).
  - Afhængigheder: FE-001 (anbefalet).

- [ ] FE-003: Strammere TS-importer (ingen .ts/.tsx endelser)
  - Formål: Konsistente imports og nemmere refaktor.
  - Ændringer: 
    - Sæt `allowImportingTsExtensions: false`, `allowJs: false` i `tsconfig.json`.
    - Opdater imports som `import App from './App'` (uden `.tsx`).
  - Test (TDD): `npm run build` lykkes; ingen module resolution-fejl.
  - Accept: Build og dev fungerer uden TS-endelser i imports.
  - PRD: §4 Stabilitet og Dataintegritet (tydelige moduler til rapport- og ressourceflows i §3.1–§3.2).
  - Afhængigheder: REPO-003.

- [ ] FE-004: Global Error Boundary + API-fejlvisning
  - Formål: Robust fejloplevelse og hurtigere fejlfinding.
  - Ændringer: Tilføj simpel `ErrorBoundary` og en global toast/notifikation, når `api.ts` fejler (401/5xx).
  - Test (TDD): Stop backend; UI viser pæn fejl og recovery (fx “Prøv igen”).
  - Accept: Ingen “blanke sider”; fejl vises konsistent.
  - PRD: §3.1 Projektrapportering (pålidelig UX) & §4 Stabilitet (graceful degradation).
  - Afhængigheder: FE-001.

- [ ] FE-005: Bundt Tailwind lokalt
  - Formål: Eliminér CDN-afhængighed for CSS og få prod-kontrol.
  - Ændringer: Opsæt `tailwind.config.js`, `postcss.config.js`, `index.css` med `@tailwind`-direktiver; fjern CDN i `index.html`.
  - Test (TDD): `npm run build`; UI-styles matcher dev.
  - Accept: Ingen visuelle regressioner og ingen CDN-kald i prod.
  - PRD: §4 Performance & Responsivitet (ensartet UI for funktioner i §3.1–§3.2).
  - Afhængigheder: FE-002.

---

## Fase P2 — Backend sikkerhed og robusthed

- [ ] BE-001: `helmet` + stram CORS via env
  - Formål: Basal sikkerhed og kontrolleret origin-adgang.
  - Ændringer: `app.use(helmet())`; `cors({ origin: CORS_ORIGIN, credentials: true })` med `CORS_ORIGIN` i `backend/.env`.
  - Test (TDD):
    1) `curl` med tilladt `Origin` = 200; med forkert `Origin` = 403/afvist preflight.
    2) UI fungerer fra den konfigurerede origin.
  - Accept: CORS kun tilladt fra whitelisted origin; security-headere sat.
  - PRD: §3.3 Bruger- og adgangsstyring & §4 Sikkerhed/Kryptering (beskyt loginflow).
  - Afhængigheder: Ingen.

- [ ] BE-002: Rate limiting på auth/setup-ruter
  - Formål: Beskyt mod brute-force.
  - Ændringer: `express-rate-limit` på `POST /api/login`, `POST /api/register`, `POST /api/setup/*` (f.eks. 5/min pr. IP).
  - Test (TDD): 6. anmodning inden for interval resulterer i 429; normaliserer efter cooldown.
  - Accept: 429 ved overskridelse; legitime brugere kan stadig logge ind under normal brug.
  - PRD: §3.3 Login & Roller samt §4 Sikkerhed (begrænser brute-force mod konti).
  - Afhængigheder: BE-001 (anbefalet).

- [ ] BE-003: Central error handler
  - Formål: En ensartet 500-respons og mindre duplikeret try/catch.
  - Ændringer: Tilføj `app.use((err, req, res, next) => { ... })`; skift lokale catch til `next(err)`.
  - Test (TDD): Tving en fejl (fx kast i en route); respons er 500 med ensartet JSON.
  - Accept: Konsistente fejlbeskeder/logs; ingen utilsigtede 200’er ved fejl.
  - PRD: §4 Stabilitet og Pålidelighed (kontrollerede fejl for rapportering i §3.1–§3.2).
  - Afhængigheder: BE-001.

- [ ] BE-004: Inputvalidering (login/register/time-entries)
  - Formål: Forudsigelige 400-fejl ved dårlige inputs.
  - Ændringer: `zod`/`joi` skemaer for body/params; indsæt i relevante ruter.
  - Test (TDD): Send ugyldige felter/typer; 400 med forklarende fejl.
  - Accept: Alle validerede ruter afviser dårlige inputs konsistent.
  - PRD: §3.1–§3.3 Dataintegritet (forhindrer forkerte data i projekter, rapporter og brugere).
  - Afhængigheder: BE-003.

- [ ] BE-005: `/health` endpoint
  - Formål: Drift/overvågning; enkel liveness/readiness.
  - Ændringer: `GET /health` returnerer `{ status: 'ok' }` og evt. DB ping.
  - Test (TDD): `curl /health` = 200; kan sondres i load balancer.
  - Accept: Endpoint stabilt i dev/prod.
  - PRD: §4 Stabilitet og Pålidelighed (driftsmonitorering for funktionerne i §3).
  - Afhængigheder: Ingen.

- [ ] BE-006: Log-hærdning (ingen PII; struktureret logging)
  - Formål: Bedre drift; undgå følsomme data i logs.
  - Ændringer: Skift konsol-logs til pino/structured og fjern email i fejl-logs ved login.
  - Test (TDD): Login-fejl logger uden email; struktur kan parses.
  - Accept: Logs indeholder ikke PII og er maskinlæsbare.
  - Afhængigheder: BE-003.

---

## Fase P3 — CI/CD, kvalitet og dev-oplevelse

- [ ] CI-001: GitHub Actions – build/lint for root + backend
  - Formål: Automatisk kvalitetstjek ved PR.
  - Ændringer: Workflow der kører `npm ci`, `npm run lint`, `npm run build` (root) og tilsvarende i `backend/`.
  - Test (TDD): Åbn PR; workflow passerer grønt.
  - Accept: Alle PR’er kører pipeline; fejl blokkerer merge.
  - Afhængigheder: REPO-003.

- [ ] CI-002: Postgres-service + migration smoke test
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
  - Afhængigheder: BE-001, BE-003, FE-004.

- [ ] OPS-001: Pino + central log-formatter
  - Formål: Strukturerede logs til drift.
  - Ændringer: Pino logger med miljøstyret log-niveau; redaktion af PII.
  - Test (TDD): Loglinjer er JSON; ingen emails i fejl.
  - Accept: Logs kan forbruges i aggregationsværktøjer.
  - Afhængigheder: BE-006.

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
