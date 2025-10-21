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


- [X] BE-003: Central error handler
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

- [x] DEV-001: `dev:all` – start FE+BE samtidig
  - Formål: Hurtigere lokal udvikling.
  - Ændringer: Tilføjet `concurrently`-opsætning samt scripts `npm run dev:backend` og `npm run dev:all` i roden.
  - Test (TDD): `npm run dev:all` starter begge processer.
  - Accept: Ét kommando-flow til lokal udvikling.
  - Afhængigheder: FE-001, BE-001.

- [x] CI-003: Husky + lint-staged (pre-commit)
  - Formål: Fang issues før commit.
  - Ændringer: Opsat Husky `pre-commit` hook med `lint-staged`, som kører `npm run lint` og `npm run lint --prefix backend` på berørte filer.
  - Test (TDD): Commit med lint-fejl blokeres; rettelse tillader commit.
  - Accept: Hooks kører konsistent på alle maskiner.
  - Afhængigheder: REPO-003.

---

## Fase P4 — Database og migrations

- [x] DB-001: `citext` til e-mails + unikke indeks
  - Formål: Indbygget case-insensitive håndtering af emails.
  - Ændringer: Migration aktiverer `citext`, konverterer `users.email`/`employees.email` til `citext` og erstatter `LOWER(...)`-indeks med native constraints.
  - Test (TDD): Opret to brugere med `Admin@Example.com` og `admin@example.com` → 2. fejler på unikhed.
  - Accept: Login/registrering virker fortsat; unikhed håndhæves.
  - Afhængigheder: CI-002.

- [x] DB-002: Kapacitetsfelter (ressource-roadmap)
  - Formål: Forberede ressourcestyring (RM-roadmap).
  - Ændringer: Migration tilføjer `employees.max_capacity_hours_week NUMERIC(6,2) NOT NULL DEFAULT 0` + non-negativ check; backend/frontend opdateret til at sende/læse feltet.
  - Test (TDD): Migration opdaterer schema; API kan læse feltet uden fejl.
  - Accept: `npm run migrate` okay; ingen brud i eksisterende flows.
  - Afhængigheder: CI-002.

- [x] DB-003: Azure SSO felter (forberedelse til ROADMAP)
  - Formål: Understøt senere Azure Graph sync/SSO.
  - Ændringer: Migration tilføjede `azure_ad_id`, `department`, `job_title`, `account_enabled`, `synced_at` samt unik index på `azure_ad_id`.
  - Test (TDD): Migration og rollback kører; ingen effekt på eksisterende data.
  - Accept: Schema udvidet uden regressions.
  - Afhængigheder: CI-002.

---

## Fase P5 — Backend struktur og modulopdeling

- [X] BE-007: Opdel `backend/index.js` i routers og services
  - Formål: Vedligeholdbarhed + testbarhed.
  - Ændringer: Opret `routes/auth.js`, `routes/workspace.js`, `routes/users.js`, `routes/projects.js`; flyt forretningslogik til `services/*`.
  - Test (TDD): Smoke: Alle eksisterende endpoints svarer som før (200/401/403/404 og JSON-formater uændret).
  - Accept: Ingen ændring i API-kontrakter; kode kompileres og kører.
  - Afhængigheder: BE-003, BE-004.

---

## Fase P6 — Valgfri hardening og DX-forbedringer

- [x] SEC-001: JWT i HttpOnly-cookie (i stedet for localStorage)
  - Formål: Mindre XSS-eksponering.
  - Ændringer: Udskift bearer-flow med `Set-Cookie` HttpOnly + CSRF-beskyttelse; hold samme payload/TTL.
  - Test (TDD): Login sætter cookie; API-kald virker; CSRF-test blokkerer cross-site POST.
  - Accept: Funktionelt login/logout uden localStorage token.
  - Plan:
    1) Opdater backend-login til at sætte HttpOnly JWT + generere CSRF-cookie.
    2) Tilføj CSRF-middleware og kræv tokens på muterende ruter.
    3) Opdater frontend `fetch` til `credentials: 'include'` og sende `X-CSRF-Token`.
    4) Ryd op i localStorage-håndtering, kør lint/build og login/logout smoke.
  - Status: HttpOnly cookies + CSRF middleware implementeret; lint/build kørt (SEC-001).
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

- [x] FE-006: Beskyt mod reload-loops ved 401 i `api.ts`
  - Formål: Undgå gentagne `window.location.reload()`-loops.
  - ændringer: Indfør "once"-guard eller redirect til login uden hard reload.
  - Test (TDD): Invalider token; app gør til login uden uendelig reload.
  - Accept: Stabil recovery fra 401.
  - Afhængigheder: FE-004.
  - Status: `fetchWithAuth` håndterer 401 med engangs-redirect til `/login` (FE-006).



---

## Fase P7 — Dokumentation

- [X] DOC-001: Opdater README + backend/README med nye flows
  - Formål: Hold dokumentation i sync.
  - Ændringer: API-base via env, CORS/helmet, dev:all, CI badges.
  - Test (TDD): Følg README “fra nul” i et rent miljø → alt virker.
  - Accept: En udvikler kan komme fra 0 → kørende miljø via docs.
  - Afhængigheder: P0–P3 primært.


---

## Fase P8 � Stabilitetsforbedringer (f�r RM)

- [ ] ST-001: Testbaseline for frontend og backend
  - Form�l: Sikre automatiseret regressionskontrol f�r roadmapets n�ste features.
  - �ndringer: Tilf�j `Vitest` + `@testing-library/react` til frontend og `Vitest` + `supertest` til backend; opret basis-tests for `useProjectManager` og `workspaceService`; tilf�j scripts `npm run test`, `npm run test --prefix backend`, `npm run test:services --prefix backend`, `npm run test:api --prefix backend`; dokumenter testsetup i README/CONTRIBUTING.
  - Test (TDD):
    1) `npm run test`
    2) `npm run test --prefix backend`
    3) `npm run lint`
  - Accept: Begge test-suites k�rer gr�nt lokalt og i CI; mindst �n service- og �n hook-test d�kker eksisterende kerneflow.
  - Afh�ngigheder: CI-003, BE-007.

- [ ] ST-002: Centraliseret config-modul
  - Form�l: Valider milj�variabler �t sted og styre featureflags sikkert.
  - �ndringer: Opret `backend/config/index.js` med Zod-validering og typed exports; refaktorer middleware/services til at bruge modulet; tilf�j fallback for testmilj�; opdater README med nye n�gler.
  - Test (TDD):
    1) `npm run test --prefix backend`
    2) `npm run lint --prefix backend`
  - Accept: Alle `process.env`-slag er erstattet af config-importer; serverstart fejler med klar fejl ved manglende env.
  - Afh�ngigheder: ST-001.

- [ ] ST-003: Udvidet input-validering
  - Form�l: Blokere ugyldige payloads p� alle muterende endpoints, inden RM-API�et udvider fladen.
  - �ndringer: Udvid Zod-schemas til `users`, `projects`, `setup` m.fl.; centralis�r fejlformat; opdater controller-tests.
  - Test (TDD):
    1) `npm run test:api --prefix backend`
    2) `npm run lint --prefix backend`
  - Accept: Alle muterende endpoints returnerer 400 med konsistent fejlrespons ved ugyldige body/params/query.
  - Afh�ngigheder: ST-001, ST-002.

- [ ] ST-004: Transaktionsaudit i services
  - Form�l: Sikre dataintegritet for komplekse skriveoperationer inden ressourceaggregationen tilf�jes.
  - �ndringer: Gennemg� `workspaceService`, `usersService`, `projectsService`; introducer transaction-helper; d�k rollback-scenarier med service- og integrationstests.
  - Test (TDD):
    1) `npm run test:services --prefix backend`
    2) `npm run test:api --prefix backend`
  - Accept: Alle multi-step writes bruger transaktioner; tests bekr�fter korrekt rollback ved fejl.
  - Afh�ngigheder: ST-003.

- [ ] ST-005: Aktiv�r strict TypeScript
  - Form�l: Fange typefejl tidligt og g�re frontendkoden klar til nye moduler.
  - �ndringer: S�t `"strict": true` (m.fl.) i `tsconfig.json`; fjern `any`-smuthuller i `src/**`; opdater hooks/components og tests til at opfylde stricte typer.
  - Test (TDD):
    1) `npm run lint`
    2) `npm run test`
    3) `npm run build`
  - Accept: Frontend bygger i strict-mode uden typefejl; lint/test passerer uden at sl�kke reglerne.
  - Afh�ngigheder: ST-001, ST-004.

---

## Fase P9 - Frontend struktur og DX

- [ ] DX-001: Modularis�r `useProjectManager`
  - Form�l: Reducere kompleksitet og g�re state-h�ndtering testbar f�r yderligere features.
  - �ndringer: Opdel hooken i dom�nespecifikke hooks/contexts (auth, projekter, medarbejdere); opdater komponenter og tests; dokumenter ny arkitektur.
  - Test (TDD):
    1) `npm run test -- --runInBand`
    2) `npm run lint`
  - Accept: `useProjectManager`-filen er reduceret markant (<500 linjer) og tests d�kker de nye hooks.
  - Afh�ngigheder: ST-001, ST-005.

- [ ] DX-002: Introducer TanStack Query
  - Form�l: Forenkle server-state management og f� caching/retry out-of-the-box.
  - �ndringer: Installer `@tanstack/react-query`; opret `QueryClientProvider` i `main.tsx`; migrer centrale fetches (login/workspace) til queries/mutations; opdater fejlh�ndtering/toasts.
  - Test (TDD):
    1) `npm run test`
    2) `npm run lint`
    3) `npm run build`
  - Accept: Serverkald h�ndteres via React Query med bevaret UX; tests d�kker query-hooks.
  - Afh�ngigheder: DX-001, ST-003.

- [ ] DX-003: Opdel storkomponenter
  - Form�l: �ge vedligeholdbarhed og l�sbarhed i UI-laget.
  - �ndringer: Bryd `App.tsx` op i ruter/layouts med lazy-loading; del `ProjectOrganizationChart` m.fl. i mindre komponenter; opdater imports og tests.
  - Test (TDD):
    1) `npm run test`
    2) `npm run lint`
    3) `npm run build`
  - Accept: Ingen enkeltkomponent overstiger 500 linjer; bundle-splitting bevarer funktionalitet.
  - Afh�ngigheder: DX-001, DX-002.

---

## Fase P10 - Ressourcestyring (RM)

- [ ] RM-001: Feature flag og skeleton-navigation
  - Form�l: Gate ressourcemodulet bag et env-flag og forberede UI/route-stubs uden funktionel �ndring.
  - �ndringer: Tilf�j `RESOURCES_ANALYTICS_ENABLED` til frontend/backend config, render navigation/placeholder kun n�r flag er sandt, opret tom `/analytics/resources`-route med 501-respons og dokumenter togglen.
  - Test (TDD):
    1) `npm run lint --prefix backend`
    2) `npm run lint`
    3) `npm run build`
  - Accept: Med flag `false` vises ingen nye links eller API-responser; med flag `true` vises en "Coming soon"-placeholder uden dataadgang.
  - Afh�ngigheder: FE-001, BE-007.

- [ ] RM-002: ResourceAnalyticsService aggregation
  - Form�l: Beregne kapacitet, planlagte og faktiske timer pr. uge for department- og project-scopes.
  - �ndringer: Opret `services/resourceAnalyticsService.js`, brug eksisterende tabeller + `max_capacity_hours_week`, tilf�j fixtures og automatiske tests i `backend/tests/resourceAnalyticsService.test.js`, opret npm-script `test:services`.
  - Test (TDD):
    1) `npm run test:services --prefix backend`
    2) `npm run lint --prefix backend`
  - Accept: Testdata viser korrekt summering af capacity/planned/actual og identificerer over-allocated weeks.
  - Afh�ngigheder: DB-002, DB-003.

- [ ] RM-003: GET `/analytics/resources` endpoint
  - Form�l: Eksponere aggregationerne via et sikkert API med input-validering og rolle-tjek.
  - �ndringer: Opret validator (Zod) til scope/ugeparametre, ny controller/route `routes/analyticsRoutes.js`, opdater `routes/index.js`, tilf�j integrationstests med Supertest og npm-script `test:api`.
  - Test (TDD):
    1) `npm run test:services --prefix backend`
    2) `npm run test:api --prefix backend`
    3) `npm run lint --prefix backend`
  - Accept: Admin f�r 200 med series-data; ikke-autoriserede f�r 403/401; ugyldige parametre giver 400.
  - Afh�ngigheder: RM-002, SEC-001, BE-003, BE-007.

- [ ] RM-004: Frontend dataclient + Vitest-setup
  - Form�l: Hente ressource-data via den nye API og stabilisere data-modeller p� klienten.
  - �ndringer: Tilf�j `vitest` og `@testing-library/react` som dev-deps, opret `npm run test`, implementer `fetchResourceAnalytics` i `src/api.ts` og `useResourceAnalytics` hook med Vitest-mocks.
  - Test (TDD):
    1) `npm run test -- --runInBand`
    2) `npm run lint`
  - Accept: Hook returnerer normaliserede serier og h�ndterer fejl/401 med eksisterende error boundary.
  - Afh�ngigheder: RM-003, FE-004, FE-006.

- [ ] RM-005: PMO ressourcemodul (Admin)
  - Form�l: Bygge Ressource Analytics-side med department-filter og line chart.
  - �ndringer: Installer `recharts`, opret side-komponent + filterpanel, integrer hook og feature-flag, tilf�j screenshot i docs.
  - Test (TDD):
    1) `npm run test`
    2) `npm run lint`
    3) `npm run build`
  - Accept: Med flag aktiveret kan Admin skifte department og se kapacitet/plan/aktuel-linjer med tooltips og over-allocation-markering.
  - Afh�ngigheder: RM-004.

- [ ] RM-006: Projekt-dashboard panel
  - Form�l: Vise projekt-specifikt ressourceoverblik for Projektleder.
  - �ndringer: Tilf�j panel p� projekt-dashboard, brug `scope=project`, vis badges n�r planned/actual > capacity, respekter adgangsroller.
  - Test (TDD):
    1) `npm run test`
    2) `npm run lint`
    3) `npm run build`
  - Accept: Projektleder ser panelet p� egne projekter; Admin ser samme; Teammedlem ser ikke panelet.
  - Afh�ngigheder: RM-005, FE-006.

- [ ] RM-007: Performance & eksport
  - Form�l: Optimere svartid og muligg�re CSV-eksport.
  - �ndringer: Tilf�j in-memory caching (TTL) i service, implementer `?format=csv`, skriv tests for cache-hit og CSV-generator, dokumenter interaction med rate-limit.
  - Test (TDD):
    1) `npm run test:services --prefix backend`
    2) `npm run test`
    3) `npm run lint --prefix backend`
    4) `npm run lint`
  - Accept: F�rste kald beregner data, efterf�lgende inden for TTL bruger cache; CSV-download giver korrekte kolonner med danske feltnavne.
  - Afh�ngigheder: RM-003, RM-005.

- [ ] RM-008: Dokumentation & release notes
  - Form�l: Holde README, ROADMAP og CHANGELOG ajour med ressourcemodulet.
  - �ndringer: Opdater README med nye milj�variable og UI-flow, ROADMAP-status, CHANGELOG-version bump og screenshots.
  - Test (TDD):
    1) `npm run lint`
    2) `npm run build`
  - Accept: Dokumentation beskriver feature flag, API-endpoint og frontend-flows; release-notes stemmer med implementeret funktionalitet.
  - Afh�ngigheder: RM-007, DOC-001.

Noter
- Opgaverne er designet, s� hver kan merges isoleret og verificeres med minimale, reproducerbare trin.
- Ved st�rre refaktoreringer (BE-007) anbefales flag/feature toggles og sm� commits med hyppige smoke-tests.
