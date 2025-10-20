- [x] BE-002: Rate limiting p� auth/setup-ruter
  - Form�l: Beskyt mod brute-force.
  - �ndringer: Tilf�jede `express-rate-limit` og rate-limiter middleware for login/register/setup + env-variabler.
  - Test (TDD):
    1) `npm run lint`.
    2) `npm run build`.
  - Accept: 429 ved overskridelse; legitime brugere kan stadig logge ind under normal brug.
- [x] BE-003: Central error handler
  - Form�l: En ensartet 500-respons og mindre duplikeret try/catch.
  - �ndringer: Tilf�jede global createAppError helper, central error middleware og opdaterede auth/workspace/time-entry routes til at bruge 
ext(createAppError(...)).
  - Test (TDD):
    1) 
pm run lint.
    2) 
pm run build.
  - Accept: Konsistente fejlbeskeder/logs; ingen utilsigtede 200'er ved fejl.
- Start fra den f�rste fase og bev�g dig nedad; faserne reducerer risiko ved at sikre stabilt grundlag f�rst.
- Hver opgave beskriver �Red-Green-Refactor� i praksis via konkrete testtrin og klare acceptkriterier.
- Hvor der foresl�s nye v�rkt�jer (lint/CI/test), opret dem i sm� commits og valider i pipeline, f�r du forts�tter.

---

## Fase P0 � Forberedelse & Hygiejne (lav risiko, stor effekt)

- [x] REPO-001: Fjern dubletter og genererede filer
  - Form�l: Elimin�r filkollisioner og forvirring mellem `src/**` og rodkopier.
  - �ndringer: Slet/arkiv�r bl.a. `App.js`, `components/*.js`, `hooks/useProjectManager.js`, `index-1.tsx`, tom `index.tsx`, `types.js`, `metadata*.json` (eller flyt til `docs/`), `tmp_patch.py`, `setup-db.sql` (i roden), `-1.gitignore`.
  - Test (TDD):
    1) `npm run dev` (frontend) starter uden importfejl.
    2) `rg -n "src\\(components|hooks|types)" -S` viser, at kun TypeScript-kilder bruges.
  - Accept: Dev og build virker; ingen ubrugte .js-duplikater parallelt med .tsx.
  - PRD: �4 Stabilitet og P�lidelighed (grundlag for projekt- og ressourcestyring i �3.1��3.3).
  - Afh�ngigheder: Ingen.

- [x] REPO-002: Normalis�r filkodning og lokalisering
  - Form�l: Undg� �?�-tegn i UI og sikre konsistent UTF-8.
  - �ndringer: Tilf�j `.editorconfig`; ret mis-encodede strenge (fx �Sk�lsk�r� i `src/types.ts`).
  - Test (TDD): �bn UI; verific�r danske tegn (���) vises korrekt i titler og labels.
  - Accept: Alle danske strenge gengives korrekt i browseren og i build-output.
  - PRD: �4 Performance & Responsivitet (lokaliseret UI fra �3.1 og �3.2 uden encoding-fejl).
  - Afh�ngigheder: REPO-001 (anbefalet).

- [x] REPO-003: ESLint/Prettier baseline for TS/React
  - Form�l: Fange fejl tidligt og standardisere stil.
  - �ndringer: Tilf�j `.eslintrc.cjs` + `.prettierrc.json`, installer `eslint-plugin-react`, ryd op i ubrugte imports og k�r `npm run lint`.
  - Test (TDD): `npm run lint` returnerer 0 fejl; CI konfigureres senere til at k�re lint.
  - Accept: Ingen lint-fejl i `src/**`.
  - PRD: �4 Stabilitet og P�lidelighed (kodekvalitet underst�tter kernefunktioner i �3.1��3.3).
  - Afh�ngigheder: Ingen.

---

## Fase P1 � Frontend konfiguration og build-h�rdning

- [x] FE-001: Env-baseret API-base + Vite-proxy
  - Form�l: Undg� hardcoded URL'er og CORS-problemer i dev.
  - �ndringer: Ops�t `VITE_API_BASE_URL` i `src/api.ts`, tilf�j proxy i `vite.config.ts`, opret `.env.example`, opdater README.
  - Test (TDD):
    1) `npm run lint`.
    2) `npm run build`.
  - Accept: Login/workspace fungerer i dev uden CORS-justeringer og kan pege mod eksternt API via `.env`.
  - PRD: �3.1 Kernefunktioner (stabil driftsops�tning) & �4 Stabilitet og P�lidelighed (milj�fleksibilitet).
  - Afh�ngigheder: Ingen.

- [x] FE-002: Fjern importmap i `index.html` (CDN Tailwind beholdes midlertidigt)
  - Form�l: Deterministiske builds uden eksterne importmaps.
  - �ndringer: Fjernede importmap-blokken og rettede title-encoding i `index.html`.
  - Test (TDD):
    1) `npm run lint`.
    2) `npm run build`.
  - Accept: Ingen runtime-fejl pga. manglende imports; konsol er ren.

- [x] FE-003: Strammere TS-importer (ingen .ts/.tsx endelser)
  - Form�l: Konsistente imports og nemmere refaktor.
  - �ndringer: Sat `allowImportingTsExtensions=false`, `allowJs=false` i tsconfig og fjernede alle `.ts`/`.tsx`-endelser i imports.
  - Test (TDD):
    1) `npm run lint`.
    2) `npm run build`.
  - Accept: Build og dev fungerer uden TS-endelser i imports.
  - PRD: �4 Stabilitet og Dataintegritet (tydelige moduler til rapport- og ressourceflows i �3.1��3.2).
  - Afh�ngigheder: REPO-003.


- [x] FE-005: Bundt Tailwind lokalt
  - Form�l: Elimin�r CDN-afh�ngighed for CSS og f� prod-kontrol.
  - �ndringer: Installerede Tailwind/PostCSS lokalt, tilf�jede `tailwind.config.js`, `postcss.config.js`, `src/index.css`, importerede CSS i `main.tsx`, fjernede CDN fra `index.html`.
  - Test (TDD):
    1) `npm run lint`.
    2) `npm run build`.
  - Accept: Ingen visuelle regressioner og ingen CDN-kald i prod.
  - Afh�ngigheder: FE-002.

  - Afh�ngigheder: FE-002.

---

## Fase P2 � Backend sikkerhed og robusthed

- [x] BE-001: `helmet` + stram CORS via env
  - Form�l: Basal sikkerhed og kontrolleret origin-adgang.
  - �ndringer: Tilf�jede Helmet, CORS-whitelist styret af `CORS_ORIGIN` med udviklingsfallback og dokumenterede env-feltet.
  - Test (TDD):
    1) `npm run lint`.
    2) `npm run build`.
  - Accept: CORS kun tilladt fra whitelisted origin; security-headere sat.

  - PRD: �3.3 Bruger- og adgangsstyring & �4 Sikkerhed/Kryptering (beskyt loginflow).
  - Afh�ngigheder: Ingen.


- [ ] BE-003: Central error handler
  - Form�l: En ensartet 500-respons og mindre duplikeret try/catch.
  - �ndringer: Tilf�j `app.use((err, req, res, next) => { ... })`; skift lokale catch til `next(err)`.
  - Test (TDD): Tving en fejl (fx kast i en route); respons er 500 med ensartet JSON.
  - Accept: Konsistente fejlbeskeder/logs; ingen utilsigtede 200�er ved fejl.
  - PRD: �4 Stabilitet og P�lidelighed (kontrollerede fejl for rapportering i �3.1��3.2).
  - Afh�ngigheder: BE-001.

- [x] BE-004: Inputvalidering (login/register/time-entries)
  - Form�l: Forudsigelige 400-fejl ved d�rlige inputs.
  - �ndringer: `zod`/`joi` skemaer for body/params; inds�t i relevante ruter.
  - Test (TDD): Send ugyldige felter/typer; 400 med forklarende fejl.
  - Accept: Alle validerede ruter afviser d�rlige inputs konsistent.
  - PRD: �3.1��3.3 Dataintegritet (forhindrer forkerte data i projekter, rapporter og brugere).
  - Afh�ngigheder: BE-003.

- [x] BE-005: `/health` endpoint
  - Form�l: Drift/overv�gning; enkel liveness/readiness.
  - �ndringer: Tilf�jede `GET /health` med DB ping og dokumenterede endpoint i README/backend-README.
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

## Fase P3 � CI/CD, kvalitet og dev-oplevelse

- [x] CI-001: GitHub Actions � build/lint for root + backend
  - Form�l: Automatisk kvalitetstjek ved PR.
  - �ndringer: Workflow der k�rer `npm ci`, `npm run lint`, `npm run build` (root) og tilsvarende i `backend/`.
  - Test (TDD): �bn PR; workflow passerer gr�nt.
  - Accept: Alle PR�er k�rer pipeline; fejl blokkerer merge.
  - Afh�ngigheder: REPO-003.

- [x] CI-002: Postgres-service + migration smoke test
  - Form�l: Fang DB/migration-fejl tidligt.
  - �ndringer: Actions-job med Postgres service, `backend/npm run migrate` mod test-DB.
  - Test (TDD): Workflow passerer; migrations anvendes uden fejl.
  - Accept: Stabil migrationsk�rsel i CI.
  - Afh�ngigheder: CI-001.

- [x] DEV-001: `dev:all` � start FE+BE samtidig
  - Form�l: Hurtigere lokal udvikling.
  - �ndringer: Tilf�jet `concurrently`-ops�tning samt scripts `npm run dev:backend` og `npm run dev:all` i roden.
  - Test (TDD): `npm run dev:all` starter begge processer.
  - Accept: �t kommando-flow til lokal udvikling.
  - Afh�ngigheder: FE-001, BE-001.

- [x] CI-003: Husky + lint-staged (pre-commit)
  - Form�l: Fang issues f�r commit.
  - �ndringer: Opsat Husky `pre-commit` hook med `lint-staged`, som k�rer `npm run lint` og `npm run lint --prefix backend` p� ber�rte filer.
  - Test (TDD): Commit med lint-fejl blokeres; rettelse tillader commit.
  - Accept: Hooks k�rer konsistent p� alle maskiner.
  - Afh�ngigheder: REPO-003.

---

## Fase P4 � Database og migrations

- [x] DB-001: `citext` til e-mails + unikke indeks
  - Form�l: Indbygget case-insensitive h�ndtering af emails.
  - �ndringer: Migration aktiverer `citext`, konverterer `users.email`/`employees.email` til `citext` og erstatter `LOWER(...)`-indeks med native constraints.
  - Test (TDD): Opret to brugere med `Admin@Example.com` og `admin@example.com` ? 2. fejler p� unikhed.
  - Accept: Login/registrering virker fortsat; unikhed h�ndh�ves.
  - Afh�ngigheder: CI-002.

- [x] DB-002: Kapacitetsfelter (ressource-roadmap)
  - Form�l: Forberede ressourcestyring (RM-roadmap).
  - �ndringer: Migration tilf�jer `employees.max_capacity_hours_week NUMERIC(6,2) NOT NULL DEFAULT 0` + non-negativ check; backend/frontend opdateret til at sende/l�se feltet.
  - Test (TDD): Migration opdaterer schema; API kan l�se feltet uden fejl.
  - Accept: `npm run migrate` okay; ingen brud i eksisterende flows.
  - Afh�ngigheder: CI-002.

- [x] DB-003: Azure SSO felter (forberedelse til ROADMAP)
  - Form�l: Underst�t senere Azure Graph sync/SSO.
  - �ndringer: Migration tilf�jede `azure_ad_id`, `department`, `job_title`, `account_enabled`, `synced_at` samt unik index p� `azure_ad_id`.
  - Test (TDD): Migration og rollback k�rer; ingen effekt p� eksisterende data.
  - Accept: Schema udvidet uden regressions.
  - Afh�ngigheder: CI-002.

---

## Fase P5 � Backend struktur og modulopdeling

- [x] BE-007: Opdel `backend/index.js` i routers og services
  - Form�l: Vedligeholdbarhed + testbarhed.
  - �ndringer: Opret `routes/auth.js`, `routes/workspace.js`, `routes/users.js`, `routes/projects.js`; flyt forretningslogik til `services/*`.
  - Test (TDD): Smoke: Alle eksisterende endpoints svarer som f�r (200/401/403/404 og JSON-formater u�ndret).
  - Accept: Ingen �ndring i API-kontrakter; kode kompileres og k�rer.
  - Afh�ngigheder: BE-003, BE-004.
  - Plan (WIP):
    1) Flyt hj�lpefunktioner (`utils/helpers.js`, `utils/errors.js`) og opret Zod-validatorer pr. omr�de.
    2) Udtr�k service-lag (`services/*`) med eksisterende forretningslogik.
    3) Tilf�j tynde controllere og dedikerede routers, opdater `index.js` til kun at montere ruter + global error handler.
    4) K�r lint og smoke-test API�et; opdater changelog n�r alt er gr�nt.
  - Status: ESM-services, controllere og routers erstatter den monolitiske `index.js`; lint/migrate OK og API-stier u�ndrede.

---

## Fase P6 � Valgfri hardening og DX-forbedringer

- [x] SEC-001: JWT i HttpOnly-cookie (i stedet for localStorage)
  - Form�l: Mindre XSS-eksponering.
  - �ndringer: Udskift bearer-flow med `Set-Cookie` HttpOnly + CSRF-beskyttelse; hold samme payload/TTL.
  - Test (TDD): Login s�tter cookie; API-kald virker; CSRF-test blokkerer cross-site POST.
  - Accept: Funktionelt login/logout uden localStorage token.
  - Plan (WIP):
    1) Opdater backend-login til at s?tte HttpOnly JWT + generere CSRF-cookie.
    2) Tilf?j CSRF-middleware og kr?v tokens p? muterende ruter.
    3) Opdat?r frontend `fetch` til `credentials: 'include'` og sende `X-CSRF-Token`.
    4) Ryd op i localStorage-h?ndtering, k?r lint/build og login/logout smoke.
  - Status: HttpOnly cookies + CSRF middleware implementeret; lint/build k�rt (SEC-001).
- [x] FE-004: Global Error Boundary + API-fejlvisning
  - Form�l: Robust fejloplevelse og hurtigere fejlfinding.
  - �ndringer: Tilf�jede `ErrorBoundary`, globale toasts (`StatusToast`) og h�ndterer 401/5xx fra API med brugerbesked.
  - Test (TDD):
    1) Stop backend/server og bekr�ft at UI viser toast og recovery i stedet for blank side.
    2) `npm run lint` & `npm run build`.
  - Accept: Ingen blanke sider; fejl vises konsistent og kan lukkes.
  - PRD: �3.1 Projektrapportering (p�lidelig UX) & �4 Stabilitet (graceful degradation).
  - Afh�ngigheder: FE-001.

  - Dependencies: BE-006.

- [x] FE-006: Beskyt mod reload-loops ved 401 i `api.ts`
  - Form�l: Undg� gentagne `window.location.reload()`-loops.
  - �ndringer: Indf�r �once� guard/flag eller redirect til login uden hard reload.
  - Test (TDD): Invalider token; app g�r til login uden uendelig reload.
  - Accept: Stabil recovery fra 401.
  - Afh�ngigheder: FE-004.
  - Plan (WIP):
    1) Track 401-h�ndtering i `fetchWithAuth` s� reload kun sker en enkel gang.
    2) Opdat�r login-guard til at vise redirect/fejl i stedet for loop.
    3) Lint/build og manuelle smoke-tests (login -> expiry -> redirect).

---

## Fase P7 � Dokumentation

- [x] DOC-001: Opdater README + backend/README med nye flows
  - Form�l: Hold dokumentation i sync.
  - �ndringer: API-base via env, CORS/helmet, dev:all, CI badges.
  - Test (TDD): F�lg README �fra nul� i et rent milj� ? alt virker.
  - Accept: En udvikler kan komme fra 0 ? k�rende milj� via docs.
  - Status: README (root + backend) er opdateret med nye flows, dev:all og CI-noter.
  - Afh�ngigheder: P0�P3 prim�rt.


Noter
- Opgaverne er designet, s� hver kan merges isoleret og verificeres med minimale, reproducerbare trin.
- Ved st�rre refaktoreringer (BE-007) anbefales flag/feature toggles og sm� commits med hyppige smoke-tests.
