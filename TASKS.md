## Fase P0 — Forberedelse & Hygiejne (lav risiko, stor effekt)

- [x] REPO-001: Fjern dubletter og genererede filer
  - Formål: Eliminér filkollisioner og forvirring mellem `src/**` og rodkopier.
  - Ændringer: Slet/arkivér bl.a. `App.js`, `components/*.js`, `hooks/useProjectManager.js`, `index-1.tsx`, tom `index.tsx`, `types.js`, `metadata*.json` (eller flyt til `docs/`), `tmp_patch.py`, `setup-db.sql` (i roden), `-1.gitignore`.
  - Test (TDD):
    1) `npm run test`
    2) `npm run lint`
    3) `npm run build`
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

## Fase P8 - Stabilitetsforbedringer (før RM)

- [x] ST-001: Testbaseline for frontend og backend
  - Formål: Sikre automatiseret regressionskontrol før roadmapets næste features.
  - ændringer: Tilføj `Vitest` + `@testing-library/react` til frontend og `Vitest` + `supertest` til backend; opret basis-tests for `useProjectManager` og `workspaceService`; tilføj scripts `npm run test`, `npm run test --prefix backend`, `npm run test:services --prefix backend`, `npm run test:api --prefix backend`; dokumenter testsetup i README/CONTRIBUTING.
  - Test (TDD):
    1) `npm run test`
    2) `npm run test --prefix backend`
    3) `npm run lint`
  - Accept: Begge test-suites kører grønt lokalt og i CI; mindst én service- og én hook-test dækker eksisterende kerneflow.
  - Afhængigheder: CI-003, BE-007.
  - Status: Vitest og automatiske tests kører for frontend (`useProjectManager`) og backend (`loadFullWorkspace` + API-healthcheck).

- [x] ST-002: Centraliseret config-modul
  - Formål: Valider miljøvariabler ét sted og styre featureflags sikkert.
  - ændringer: Opret Backend/config/index.js med Zod-validering og typed exports; refaktorer middleware/services til at bruge modulet; tilføj fallback for testmiljø; opdater README med nye nøgler.
  - Test (TDD):
    1) 
pm run test --prefix backend
    2) 
pm run lint --prefix backend
  - Accept: Alle process.env-slag er erstattet af config-importer; serverstart fejler med klar fejl ved manglende env.
  - Afhængigheder: ST-001.
  - Status: Konfiguration centraliseret; middleware, scripts og dokumentation bruger nu typed config.
- [x] ST-003: Udvidet input-validering
  - Formål: Blokere ugyldige payloads på alle muterende endpoints, inden RM-API'et udvider fladen.
  - ændringer: Tilføj Zod-schemas til users, projects, setup m.fl.; centralisér fejlformat; opdater controller-tests.
  - Test (TDD):
    1) 
pm run test:api --prefix backend
    2) 
pm run lint --prefix backend
  - Accept: Alle muterende endpoints returnerer 400 med konsistent fejlrespons ved ugyldige body/params/query.
  - Afhængigheder: ST-001, ST-002.
  - Status: Setup- og bruger-APIet validerer nu payloads med Zod og dækkes af nye validator-tests.
- [x] ST-004: Transaktionsaudit i services
  - Formål: Sikre dataintegritet for komplekse skriveoperationer inden ressourceaggregationen tilføjes.
  - ændringer: Gennemgå workspaceService, usersService, projectsService; introducer transaction-helper; dæk rollback-scenarier med service- og integrationstests.
  - Test (TDD):
    1) 
pm run test:services --prefix backend
    2) 
pm run test:api --prefix backend
  - Accept: Alle multi-step writes bruger transaktioner; tests bekræfter korrekt rollback ved fejl.
  - Afhængigheder: ST-003.
  - Status: Transaction-helper indført og brugt i auth/setup/projects; vitest dækker commit/rollback.
- [x] ST-005: Aktiv�r strict TypeScript
  - Form�l: Fange typefejl tidligt og g�re frontendkoden klar til nye moduler.
  - �ndringer: S�t `"strict": true` (m.fl.) i `tsconfig.json`; fjern `any`-smuthuller i `src/**`; opdater hooks/components og tests til at opfylde stricte typer.
  - Test (TDD):
    1) `npm run lint`
    2) `npm run test`
    3) `npm run build`
  - Accept: Frontend bygger i strict-mode uden typefejl; lint/test passerer uden at sl�kke reglerne.
  - Afh�ngigheder: ST-001, ST-004.

- [x] ST-006: Kontrol af timelog-inputs i modal
  - Form�l: Sikre at felterne for planlagte/faktiske timer altid viser senest kendte data efter bulk-udfyldning eller synkronisering.
  - �ndringer: G�r inputs i `TimeLogModal` kontrollerede (`value` + lokal state) og synkronis�r dem med `member.timeEntries`; ryd op i eventh�ndtere, s� de ikke bruger `defaultValue`.
  - Test (TDD):
    1) Tilf�j Vitest/RTL-test i `src/components/__tests__/ProjectOrganizationChart.test.tsx`, der simulerer prop-opdatering og forventer opdateret inputv�rdi.
    2) `npm run test`
    3) `npm run lint`
  - Accept: Tests viser at inputv�rdier f�lger props efter bulk-opdatering; manuel QA bekr�fter at felterne opdateres uden at lukke modal.
  - Afh�ngigheder: ST-005.

- [x] ST-007: Synkron state i TimeLogModal
  - Form�l: Forhindre stale data ved at modalens totals og liste afspejler det seneste medlemssnapshot mens den er �ben.
  - �ndringer: Gem kun `timeLogMemberId` i komponentstate og udled medlem/medarbejder via `members`-props, eller synkronis�r objektet via `useEffect`; opdater afledte `useMemo` hooks.
  - Test (TDD):
    1) Udvid samme testfil med case hvor totals �ndres efter en prop-opdatering, og forvent at summerne opdateres i UI'et.
    2) `npm run test`
    3) `npm run lint`
  - Accept: Tests bekr�fter at totals og r�kker reflekterer seneste data uden at gen�bne modal; manuel QA viser korrekt sum efter backend-respons.
  - Afh�ngigheder: ST-006.

- [x] ST-008: Ret dansk label i organisationskort
  - Form�l: Eliminere stavefejl i UI (manglende `�`) og forhindre regressioner.
  - �ndringer: Opdater teksten til `Tilf�j medlem` i `ProjectOrganizationChart.tsx`; tilf�j en simpel render-test, der sikrer at knappen indeholder korrekt streng.
  - Test (TDD):
    1) Tilf�j en RTL-test der renderer komponenten og forventer `Tilf�j medlem` i output.
    2) `npm run test`
    3) `npm run lint`
  - Accept: Tests best�r, og UI viser korrekt dansk label.
  - Afh�ngigheder: ST-006.

---

## Fase P9 - Frontend struktur og DX

- [x] DX-001: Modularisér `useProjectManager`
  - Formål: Reducere kompleksitet og gøre state-håndtering testbar før yderligere features.
  - ændringer: Opdel hooken i domænespecifikke hooks/contexts (auth, projekter, medarbejdere); opdater komponenter og tests; dokumenter ny arkitektur.
  - Test (TDD):
    1) `npm run test`
    2) `npm run lint`
  - Accept: `useProjectManager`-filen er reduceret markant (<500 linjer) og tests dækker de nye hooks.
  - Afhængigheder: ST-001, ST-005.

- [x] DX-002: Introducer TanStack Query
  - Form�l: Forenkle server-state management og f� caching/retry out-of-the-box.
  - �ndringer: Installer `@tanstack/react-query`; opret `QueryClientProvider` i `main.tsx`; migrer centrale fetches (login/workspace) til queries/mutations; opdater fejlh�ndtering/toasts.
  - Delplan:
    1) Introducer `QueryClientProvider` i appen med en basiskonfiguration (ingen migrering endnu).
    2) Migrer initial `getWorkspace`-load til `useQuery` og erstat manuel loading/error-state.
    3) Flyt `login`/`logout` og `saveWorkspace` til `useMutation` + cache-opdateringer; just�r autosave.
    4) Udvid gradvist til �vrige endpoints (`getUsers`, time-log), ryd op i legacy effects og tests.
  - Test (TDD):
    1) `npm run test`
    2) `npm run lint`
    3) `npm run build`
  - Accept: Serverkald håndteres via React Query med bevaret UX; tests d�kker query-hooks.
  - Afhængigheder: DX-001, ST-003.

- [x] DX-003: Opdel storkomponenter
  - Formål: øge vedligeholdbarhed og løsbarhed i UI-laget.
  - ændringer: Bryd `App.tsx` op i ruter/layouts med lazy-loading; del `ProjectOrganizationChart` m.fl. i mindre komponenter; opdater imports og tests.
  - Test (TDD):
  - Accept: Ingen enkeltkomponent overstiger 500 linjer; bundle-splitting bevarer funktionalitet.
  - Afhængigheder: DX-001, DX-002.

---

## Fase P10 - Ressourcestyring (RM)

- [x] RM-001: Feature flag og skeleton-navigation
  - Formål: Gate ressourcemodulet bag et env-flag og forberede UI/route-stubs uden funktionel ændring.
  - ændringer: Tilføj `RESOURCES_ANALYTICS_ENABLED` til frontend/backend config, render navigation/placeholder kun når flag er sandt, opret tom ``/analytics/resources``-route med 501-respons og dokumenter togglen.
  - Test (TDD):
    1) `npm run lint --prefix backend`
  - Accept: Med flag `false` vises ingen nye links eller API-responser; med flag `true` vises en "Coming soon"-placeholder uden dataadgang.
  - Afhængigheder: FE-001, BE-007.

- [x] RM-002: `rresourceAnalyticsService` aggregation
  - Formål: Beregne kapacitet, planlagte og faktiske timer pr. uge for department- og project-scopes.
  - ændringer: Opret `services/`rresourceAnalyticsService`.js`, brug eksisterende tabeller + `max_capacity_hours_week`, tilføj fixtures og automatiske tests i `backend/tests/`rresourceAnalyticsService`.test.js`, opret npm-script `test:services`.
  - Test (TDD):
    1) `npm run test:services --prefix backend`
    2) `npm run lint --prefix backend`
  - Accept: Testdata viser korrekt summering af capacity/planned/actual og identificerer over-allocated weeks.
  - Afhængigheder: DB-002, DB-003.

- [x] RM-003: GET ``/analytics/resources`` endpoint
  - Formål: Eksponere aggregationerne via et sikkert API med input-validering og rolle-tjek.
  - ændringer: Opret validator (Zod) til scope/ugeparametre, ny controller/route `routes/analyticsRoutes.js`, opdater `routes/index.js`, tilf�j integrationstests med Supertest og npm-script `test:api`.
  - Test (TDD):
    1) `npm run test:services --prefix backend`
    2) `npm run test:api --prefix backend`
    3) `npm run lint --prefix backend`
  - Accept: Admin før 200 med series-data; ikke-autoriserede får 403/401; ugyldige parametre giver 400.
  - Afhængigheder: RM-002, SEC-001, BE-003, BE-007.

- [x] RM-004: Frontend dataclient + Vitest-setup
  - Formål: Hente ressource-data via den nye API og stabilisere data-modeller på klienten.
  - ændringer: Tilføj `vitest` og `@testing-library/react` som dev-deps, opret `npm run test`, implementer `fetchResourceAnalytics` i `src/api.ts` og `useResourceAnalytics` hook med Vitest-mocks.
  - Test (TDD):
    1) `npm run test -- --runInBand`
  - Accept: Hook returnerer normaliserede serier og håndterer fejl/401 med eksisterende error boundary.
  - Afhængigheder: RM-003, FE-004, FE-006.

- [x] RM-005: PMO ressourcemodul (Admin)
  - Formål: Bygge Ressource Analytics-side med department-filter og line chart.
  - ændringer: Installer `recharts`, opret side-komponent + filterpanel, integrer hook og feature-flag, tilf�j screenshot i docs.
  - Test (TDD):
  - Accept: Med flag aktiveret kan Admin skifte department og se kapacitet/plan/aktuel-linjer med tooltips og over-allocation-markering.
  - Afhængigheder: RM-004.

- [x] RM-006: Projekt-dashboard panel

- [x] PMO-010: Integrer Ressource Analytics som fane i PMO
  - Form�l: Samle alle ressourcerelaterede indsigter under PMO-sektionen og reducere navigation mellem sider.
  - �ndringer:
    - Tilf�j tab-navigation p� PMO-siden og flyt nuv�rende Ressource Analytics-komponent ind som `resources`-fane.
    - Opret redirect fra `/resources` til PMO-siden (fx `/pmo?view=resources`), s� eksisterende dybe links bevares.
    - S�rg for at fanen respekterer feature-flag og rolle-adgang som i den nuv�rende standalone-side.
  - Test (TDD):
    1) Vitest: udvid `PmoPage` tests til at d�kke fane-navigation, redirect og rollebeskyttelse.
    2) Evt. integrationstest/route-test der verificerer redirect og feature-flag (React Testing Library).
  - Accept:
    - Bruger kan �bne PMO-siden, skifte til Ressource Analytics-fanen og f� vist de samme serier som f�r.
    - Direkte bes�g p� `/resources` lander i PMO med korrekt fane valgt.
    - Feature-flag/roller virker som tidligere (kun administratorer ser fanen).
  - Afh�ngigheder: RM-005, RM-007.

- [x] RM-009: Synkroniser `location` og `department`
  - Form�l: Sikre at medarbejderens afdeling og lokation altid matcher, s� ressourcemodulet kan bygge p� �t felt.
  - �ndringer: Tilf�j helper i backend der spejler felterne ved read/write, opdater persist/import/sync-flow, og lav valgfri migration/backfill.
  - Test (TDD):
    1) unit-test for helperen, der viser location ? department synkronisering i begge retninger.
    2) integrationstest af workspace API (POST/GET) der bekr�fter at begge felter matches efter gem.
  - Accept: API-responser returnerer `department === location`, nye/�ndrede medarbejdere gemmes i sync, eksisterende data backfilles.
  - Afh�ngigheder: RM-005, RM-007.
  - Formål: Vise projekt-specifikt ressourceoverblik for Projektleder.
  - ændringer: Tilføj panel på projekt-dashboard, brug `scope=project`, vis badges når planned/actual > capacity, respekter adgangsroller.
  - Test (TDD):
  - Accept: Projektleder ser panelet på egne projekter; Admin ser samme; Teammedlem ser ikke panelet.
  - Afhængigheder: RM-005, FE-006.

- [x] RM-007: Performance & eksport
  - Formål: Optimere svartid og muliggøre CSV-eksport.
  - ændringer: Tilføj in-memory caching (TTL) i service, implementer `?format=csv`, skriv tests for cache-hit og CSV-generator, dokumenter interaction med rate-limit.
  - Test (TDD):
    1) `npm run test:services --prefix backend`
    2) `npm run test`
    3) `npm run lint --prefix backend`
    4) `npm run lint`
  - Accept: Første kald beregner data, efterfølgende inden for TTL bruger cache; CSV-download giver korrekte kolonner med danske feltnavne.
  - Afhængigheder: RM-003, RM-005.

- [x] RM-008: Dokumentation & release notes
  - Formål: Holde README, ROADMAP og CHANGELOG ajour med ressourcemodulet.
  - ændringer: Opdater README med nye miljøvariable og UI-flow, ROADMAP-status, CHANGELOG-version bump og screenshots.
  - Test (TDD):
    1) `npm run lint`
    2) `npm run build`
  - Accept: Dokumentation beskriver feature flag, API-endpoint og frontend-flows; release-notes stemmer med implementeret funktionalitet.
  - Afhængigheder: RM-007, DOC-001.

- [x] RM-010a: Backend projektfordeling
    - Form�l: Udvide ressourcemodulets data med projektsum pr. afdeling, s� frontend kan vise fordelingen.
    - �ndringer:
      - Udvid `/analytics/resources` (department scope) til at levere projectBreakdown med planlagt/faktisk timer pr. aktivt projekt.
      - Opdater caching/tests i resourceAnalyticsService og API-controllerens svar.
    - Test (TDD):
      1) Vitest: `calcDepartmentSeries` returnerer breakdown og cache-tests d�kker ekstra query.
      2) Supertest: `/api/analytics/resources` svarer med feltet og respekterer feature-flag/roller.
    - Accept: Endpointet returnerer eksisterende data + breakdown uden regressions.
    - Afh�ngigheder: RM-005, RM-007.

- [x] RM-010b: Frontend hook & typer
    - Form�l: Eksponere projektfordelingen til PMO-fanen via hooks/API-klient.
    - �ndringer:
      - Udvid `ResourceAnalyticsPayload`/api.fetchResourceAnalytics og useResourceAnalytics med projectBreakdown.
      - Normaliser data (sortering, fallback til tomt array) og eksponer totals i hook-resultatet.
    - Test (TDD):
      1) Vitest: hooken normaliserer data korrekt, inkl. tom input og sortering.
      2) Enhedstest for API-normalisering (validerer typekontrakt).
    - Accept: Hooken returnerer eksisterende struktur + projektfordeling uden at bryde kaldere.
    - Afh�ngigheder: RM-010a.

- [x] RM-010c: PMO UI donutdiagrammer
    - Form�l: Visualisere projektfordelingen i Ressource Analytics-fanen.
    - �ndringer:
      - Tilf�j toggle og to donut-diagrammer (planlagt/faktisk) i PMO-varianten, kun for admin scope.
      - Hover-tooltip skal vise projektnavn, procent og timer.
    - Test (TDD):
      1) Vitest/RTL: komponenten viser diagrammer, toggle virker, og tom tilstand h�ndteres.
    - Accept: N�r hook returnerer data, ser brugeren to cirkeldiagrammer; toggle kan skjule sektionen.
    - Afh�ngigheder: RM-010b.

- [x] RM-010d: Dokumentation & artefakter
    - Form�l: Opdatere dokumentation, release-notes og screenshots til den nye visualisering.
    - �ndringer:
      - Opdater README/CHANGELOG/ROADMAP med projektfordeling samt beskrive togglen.
      - Tilf�j eller opdater screenshot i docs/screenshots.
    - Test (TDD): Ikke-kode; peer review.
    - Accept: Dokumentation og artefakter afspejler den nye funktion.
    - Afh�ngigheder: RM-010c.

Noter
- Opgaverne er designet, så hver kan merges isoleret og verificeres med minimale, reproducerbare trin.
- Ved større refaktoreringer (BE-007) anbefales flag/feature toggles og små commits med hyppige smoke-tests.




























