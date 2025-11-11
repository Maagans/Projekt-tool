## Fase P0 ï¿½ Forberedelse & Hygiejne (lav risiko, stor effekt)

- [x] REPO-001: Fjern dubletter og genererede filer
  - Formï¿½l: Eliminï¿½r filkollisioner og forvirring mellem `src/**` og rodkopier.
  - ï¿½ndringer: Slet/arkivï¿½r bl.a. `App.js`, `components/*.js`, `hooks/useProjectManager.js`, `index-1.tsx`, tom `index.tsx`, `types.js`, `metadata*.json` (eller flyt til `docs/`), `tmp_patch.py`, `setup-db.sql` (i roden), `-1.gitignore`.
  - Test (TDD):
    1) `npm run test`
    2) `npm run lint`
    3) `npm run build`
    2) `rg -n "src\\(components|hooks|types)" -S` viser, at kun TypeScript-kilder bruges.
  - Accept: Dev og build virker; ingen ubrugte .js-duplikater parallelt med .tsx.
  - PRD: ï¿½4 Stabilitet og Pï¿½lidelighed (grundlag for projekt- og ressourcestyring i ï¿½3.1ï¿½ï¿½3.3).
  - Afhï¿½ngigheder: Ingen.

- [x] REPO-002: Normalisï¿½r filkodning og lokalisering
  - Formï¿½l: Undgï¿½ ï¿½?ï¿½-tegn i UI og sikre konsistent UTF-8.
  - ï¿½ndringer: Tilfï¿½j `.editorconfig`; ret mis-encodede strenge (fx ï¿½Skï¿½lskï¿½rï¿½ i `src/types.ts`).
  - Test (TDD): ï¿½bn UI; verificï¿½r danske tegn (ï¿½ï¿½ï¿½) vises korrekt i titler og labels.
  - Accept: Alle danske strenge gengives korrekt i browseren og i build-output.
  - PRD: ï¿½4 Performance & Responsivitet (lokaliseret UI fra ï¿½3.1 og ï¿½3.2 uden encoding-fejl).
  - Afhï¿½ngigheder: REPO-001 (anbefalet).

- [x] REPO-003: ESLint/Prettier baseline for TS/React
  - Formï¿½l: Fange fejl tidligt og standardisere stil.
  - ï¿½ndringer: Tilfï¿½j `.eslintrc.cjs` + `.prettierrc.json`, installer `eslint-plugin-react`, ryd op i ubrugte imports og kï¿½r `npm run lint`.
  - Test (TDD): `npm run lint` returnerer 0 fejl; CI konfigureres senere til at kï¿½re lint.
  - Accept: Ingen lint-fejl i `src/**`.
  - PRD: ï¿½4 Stabilitet og Pï¿½lidelighed (kodekvalitet understï¿½tter kernefunktioner i ï¿½3.1ï¿½ï¿½3.3).
  - Afhï¿½ngigheder: Ingen.

---

## Fase P1 ï¿½ Frontend konfiguration og build-hï¿½rdning

- [x] FE-001: Env-baseret API-base + Vite-proxy
  - Formï¿½l: Undgï¿½ hardcoded URL'er og CORS-problemer i dev.
  - ï¿½ndringer: Opsï¿½t `VITE_API_BASE_URL` i `src/api.ts`, tilfï¿½j proxy i `vite.config.ts`, opret `.env.example`, opdater README.
  - Test (TDD):
    1) `npm run lint`.
    2) `npm run build`.
  - Accept: Login/workspace fungerer i dev uden CORS-justeringer og kan pege mod eksternt API via `.env`.
  - PRD: ï¿½3.1 Kernefunktioner (stabil driftsopsï¿½tning) & ï¿½4 Stabilitet og Pï¿½lidelighed (miljï¿½fleksibilitet).
  - Afhï¿½ngigheder: Ingen.

- [x] FE-002: Fjern importmap i `index.html` (CDN Tailwind beholdes midlertidigt)
  - Formï¿½l: Deterministiske builds uden eksterne importmaps.
  - ï¿½ndringer: Fjernede importmap-blokken og rettede title-encoding i `index.html`.
  - Test (TDD):
    1) `npm run lint`.
    2) `npm run build`.
  - Accept: Ingen runtime-fejl pga. manglende imports; konsol er ren.

- [x] FE-003: Strammere TS-importer (ingen .ts/.tsx endelser)
  - Formï¿½l: Konsistente imports og nemmere refaktor.
  - ï¿½ndringer: Sat `allowImportingTsExtensions=false`, `allowJs=false` i tsconfig og fjernede alle `.ts`/`.tsx`-endelser i imports.
  - Test (TDD):
    1) `npm run lint`.
    2) `npm run build`.
  - Accept: Build og dev fungerer uden TS-endelser i imports.
  - PRD: ï¿½4 Stabilitet og Dataintegritet (tydelige moduler til rapport- og ressourceflows i ï¿½3.1ï¿½ï¿½3.2).
  - Afhï¿½ngigheder: REPO-003.


- [x] FE-005: Bundt Tailwind lokalt
  - Formï¿½l: Eliminï¿½r CDN-afhï¿½ngighed for CSS og fï¿½ prod-kontrol.
  - ï¿½ndringer: Installerede Tailwind/PostCSS lokalt, tilfï¿½jede `tailwind.config.js`, `postcss.config.js`, `src/index.css`, importerede CSS i `main.tsx`, fjernede CDN fra `index.html`.
  - Test (TDD):
    1) `npm run lint`.
    2) `npm run build`.
  - Accept: Ingen visuelle regressioner og ingen CDN-kald i prod.
  - Afhï¿½ngigheder: FE-002.

  - Afhï¿½ngigheder: FE-002.

---

## Fase P2 ï¿½ Backend sikkerhed og robusthed

- [x] BE-001: `helmet` + stram CORS via env
  - Formï¿½l: Basal sikkerhed og kontrolleret origin-adgang.
  - ï¿½ndringer: Tilfï¿½jede Helmet, CORS-whitelist styret af `CORS_ORIGIN` med udviklingsfallback og dokumenterede env-feltet.
  - Test (TDD):
    1) `npm run lint`.
    2) `npm run build`.
  - Accept: CORS kun tilladt fra whitelisted origin; security-headere sat.

  - PRD: ï¿½3.3 Bruger- og adgangsstyring & ï¿½4 Sikkerhed/Kryptering (beskyt loginflow).
  - Afhï¿½ngigheder: Ingen.


- [X] BE-003: Central error handler
  - Formï¿½l: En ensartet 500-respons og mindre duplikeret try/catch.
  - ï¿½ndringer: Tilfï¿½j `app.use((err, req, res, next) => { ... })`; skift lokale catch til `next(err)`.
  - Test (TDD): Tving en fejl (fx kast i en route); respons er 500 med ensartet JSON.
  - Accept: Konsistente fejlbeskeder/logs; ingen utilsigtede 200ï¿½er ved fejl.
  - PRD: ï¿½4 Stabilitet og Pï¿½lidelighed (kontrollerede fejl for rapportering i ï¿½3.1ï¿½ï¿½3.2).
  - Afhï¿½ngigheder: BE-001.

- [x] BE-004: Inputvalidering (login/register/time-entries)
  - Formï¿½l: Forudsigelige 400-fejl ved dï¿½rlige inputs.
  - ï¿½ndringer: `zod`/`joi` skemaer for body/params; indsï¿½t i relevante ruter.
  - Test (TDD): Send ugyldige felter/typer; 400 med forklarende fejl.
  - Accept: Alle validerede ruter afviser dï¿½rlige inputs konsistent.
  - PRD: ï¿½3.1ï¿½ï¿½3.3 Dataintegritet (forhindrer forkerte data i projekter, rapporter og brugere).
  - Afhï¿½ngigheder: BE-003.

- [x] BE-005: `/health` endpoint
  - Formï¿½l: Drift/overvï¿½gning; enkel liveness/readiness.
  - ï¿½ndringer: Tilfï¿½jede `GET /health` med DB ping og dokumenterede endpoint i README/backend-README.
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

## Fase P3 ï¿½ CI/CD, kvalitet og dev-oplevelse

- [x] CI-001: GitHub Actions ï¿½ build/lint for root + backend
  - Formï¿½l: Automatisk kvalitetstjek ved PR.
  - ï¿½ndringer: Workflow der kï¿½rer `npm ci`, `npm run lint`, `npm run build` (root) og tilsvarende i `backend/`.
  - Test (TDD): ï¿½bn PR; workflow passerer grï¿½nt.
  - Accept: Alle PRï¿½er kï¿½rer pipeline; fejl blokkerer merge.
  - Afhï¿½ngigheder: REPO-003.

- [x] CI-002: Postgres-service + migration smoke test
  - Formï¿½l: Fang DB/migration-fejl tidligt.
  - ï¿½ndringer: Actions-job med Postgres service, `backend/npm run migrate` mod test-DB.
  - Test (TDD): Workflow passerer; migrations anvendes uden fejl.
  - Accept: Stabil migrationskï¿½rsel i CI.
  - Afhï¿½ngigheder: CI-001.

- [x] DEV-001: `dev:all` ï¿½ start FE+BE samtidig
  - Formï¿½l: Hurtigere lokal udvikling.
  - ï¿½ndringer: Tilfï¿½jet `concurrently`-opsï¿½tning samt scripts `npm run dev:backend` og `npm run dev:all` i roden.
  - Test (TDD): `npm run dev:all` starter begge processer.
  - Accept: ï¿½t kommando-flow til lokal udvikling.
  - Afhï¿½ngigheder: FE-001, BE-001.

- [x] CI-003: Husky + lint-staged (pre-commit)
  - Formï¿½l: Fang issues fï¿½r commit.
  - ï¿½ndringer: Opsat Husky `pre-commit` hook med `lint-staged`, som kï¿½rer `npm run lint` og `npm run lint --prefix backend` pï¿½ berï¿½rte filer.
  - Test (TDD): Commit med lint-fejl blokeres; rettelse tillader commit.
  - Accept: Hooks kï¿½rer konsistent pï¿½ alle maskiner.
  - Afhï¿½ngigheder: REPO-003.

---

## Fase P4 ï¿½ Database og migrations

- [x] DB-001: `citext` til e-mails + unikke indeks
  - Formï¿½l: Indbygget case-insensitive hï¿½ndtering af emails.
  - ï¿½ndringer: Migration aktiverer `citext`, konverterer `users.email`/`employees.email` til `citext` og erstatter `LOWER(...)`-indeks med native constraints.
  - Test (TDD): Opret to brugere med `Admin@Example.com` og `admin@example.com` ? 2. fejler pï¿½ unikhed.
  - Accept: Login/registrering virker fortsat; unikhed hï¿½ndhï¿½ves.
  - Afhï¿½ngigheder: CI-002.

- [x] DB-002: Kapacitetsfelter (ressource-roadmap)
  - Formï¿½l: Forberede ressourcestyring (RM-roadmap).
  - ï¿½ndringer: Migration tilfï¿½jer `employees.max_capacity_hours_week NUMERIC(6,2) NOT NULL DEFAULT 0` + non-negativ check; backend/frontend opdateret til at sende/lï¿½se feltet.
  - Test (TDD): Migration opdaterer schema; API kan lï¿½se feltet uden fejl.
  - Accept: `npm run migrate` okay; ingen brud i eksisterende flows.
  - Afhï¿½ngigheder: CI-002.

- [x] DB-003: Azure SSO felter (forberedelse til ROADMAP)
  - Formï¿½l: Understï¿½t senere Azure Graph sync/SSO.
  - ï¿½ndringer: Migration tilfï¿½jede `azure_ad_id`, `department`, `job_title`, `account_enabled`, `synced_at` samt unik index pï¿½ `azure_ad_id`.
  - Test (TDD): Migration og rollback kï¿½rer; ingen effekt pï¿½ eksisterende data.
  - Accept: Schema udvidet uden regressions.
  - Afhï¿½ngigheder: CI-002.

---

## Fase P5 ï¿½ Backend struktur og modulopdeling

- [X] BE-007: Opdel `backend/index.js` i routers og services
  - Formï¿½l: Vedligeholdbarhed + testbarhed.
  - ï¿½ndringer: Opret `routes/auth.js`, `routes/workspace.js`, `routes/users.js`, `routes/projects.js`; flyt forretningslogik til `services/*`.
  - Test (TDD): Smoke: Alle eksisterende endpoints svarer som fï¿½r (200/401/403/404 og JSON-formater uï¿½ndret).
  - Accept: Ingen ï¿½ndring i API-kontrakter; kode kompileres og kï¿½rer.
  - Afhï¿½ngigheder: BE-003, BE-004.

---

## Fase P6 ï¿½ Valgfri hardening og DX-forbedringer

- [x] SEC-001: JWT i HttpOnly-cookie (i stedet for localStorage)
  - Formï¿½l: Mindre XSS-eksponering.
  - ï¿½ndringer: Udskift bearer-flow med `Set-Cookie` HttpOnly + CSRF-beskyttelse; hold samme payload/TTL.
  - Test (TDD): Login sï¿½tter cookie; API-kald virker; CSRF-test blokkerer cross-site POST.
  - Accept: Funktionelt login/logout uden localStorage token.
  - Plan:
    1) Opdater backend-login til at sï¿½tte HttpOnly JWT + generere CSRF-cookie.
    2) Tilfï¿½j CSRF-middleware og krï¿½v tokens pï¿½ muterende ruter.
    3) Opdater frontend `fetch` til `credentials: 'include'` og sende `X-CSRF-Token`.
    4) Ryd op i localStorage-hï¿½ndtering, kï¿½r lint/build og login/logout smoke.
  - Status: HttpOnly cookies + CSRF middleware implementeret; lint/build kï¿½rt (SEC-001).
- [x] FE-004: Global Error Boundary + API-fejlvisning
  - Formï¿½l: Robust fejloplevelse og hurtigere fejlfinding.
  - ï¿½ndringer: Tilfï¿½jede `ErrorBoundary`, globale toasts (`StatusToast`) og hï¿½ndterer 401/5xx fra API med brugerbesked.
  - Test (TDD):
    1) Stop backend/server og bekrï¿½ft at UI viser toast og recovery i stedet for blank side.
    2) `npm run lint` & `npm run build`.
  - Accept: Ingen blanke sider; fejl vises konsistent og kan lukkes.
  - PRD: ï¿½3.1 Projektrapportering (pï¿½lidelig UX) & ï¿½4 Stabilitet (graceful degradation).
  - Afhï¿½ngigheder: FE-001.

  - Dependencies: BE-006.

- [x] FE-006: Beskyt mod reload-loops ved 401 i `api.ts`
  - Formï¿½l: Undgï¿½ gentagne `window.location.reload()`-loops.
  - ï¿½ndringer: Indfï¿½r "once"-guard eller redirect til login uden hard reload.
  - Test (TDD): Invalider token; app gï¿½r til login uden uendelig reload.
  - Accept: Stabil recovery fra 401.
  - Afhï¿½ngigheder: FE-004.
  - Status: `fetchWithAuth` hï¿½ndterer 401 med engangs-redirect til `/login` (FE-006).



---

## Fase P7 ï¿½ Dokumentation

- [X] DOC-001: Opdater README + backend/README med nye flows
  - Formï¿½l: Hold dokumentation i sync.
  - ï¿½ndringer: API-base via env, CORS/helmet, dev:all, CI badges.
  - Test (TDD): Fï¿½lg README ï¿½fra nulï¿½ i et rent miljï¿½ ? alt virker.
  - Accept: En udvikler kan komme fra 0 ? kï¿½rende miljï¿½ via docs.
  - Afhï¿½ngigheder: P0ï¿½P3 primï¿½rt.


---

## Fase P8 - Stabilitetsforbedringer (fï¿½r RM)

- [x] ST-001: Testbaseline for frontend og backend
  - Formï¿½l: Sikre automatiseret regressionskontrol fï¿½r roadmapets nï¿½ste features.
  - ï¿½ndringer: Tilfï¿½j `Vitest` + `@testing-library/react` til frontend og `Vitest` + `supertest` til backend; opret basis-tests for `useProjectManager` og `workspaceService`; tilfï¿½j scripts `npm run test`, `npm run test --prefix backend`, `npm run test:services --prefix backend`, `npm run test:api --prefix backend`; dokumenter testsetup i README/CONTRIBUTING.
  - Test (TDD):
    1) `npm run test`
    2) `npm run test --prefix backend`
    3) `npm run lint`
  - Accept: Begge test-suites kï¿½rer grï¿½nt lokalt og i CI; mindst ï¿½n service- og ï¿½n hook-test dï¿½kker eksisterende kerneflow.
  - Afhï¿½ngigheder: CI-003, BE-007.
  - Status: Vitest og automatiske tests kï¿½rer for frontend (`useProjectManager`) og backend (`loadFullWorkspace` + API-healthcheck).

- [x] ST-002: Centraliseret config-modul
  - Formï¿½l: Valider miljï¿½variabler ï¿½t sted og styre featureflags sikkert.
  - ï¿½ndringer: Opret Backend/config/index.js med Zod-validering og typed exports; refaktorer middleware/services til at bruge modulet; tilfï¿½j fallback for testmiljï¿½; opdater README med nye nï¿½gler.
  - Test (TDD):
    1) 
pm run test --prefix backend
    2) 
pm run lint --prefix backend
  - Accept: Alle process.env-slag er erstattet af config-importer; serverstart fejler med klar fejl ved manglende env.
  - Afhï¿½ngigheder: ST-001.
  - Status: Konfiguration centraliseret; middleware, scripts og dokumentation bruger nu typed config.
- [x] ST-003: Udvidet input-validering
  - Formï¿½l: Blokere ugyldige payloads pï¿½ alle muterende endpoints, inden RM-API'et udvider fladen.
  - ï¿½ndringer: Tilfï¿½j Zod-schemas til users, projects, setup m.fl.; centralisï¿½r fejlformat; opdater controller-tests.
  - Test (TDD):
    1) 
pm run test:api --prefix backend
    2) 
pm run lint --prefix backend
  - Accept: Alle muterende endpoints returnerer 400 med konsistent fejlrespons ved ugyldige body/params/query.
  - Afhï¿½ngigheder: ST-001, ST-002.
  - Status: Setup- og bruger-APIet validerer nu payloads med Zod og dï¿½kkes af nye validator-tests.
- [x] ST-004: Transaktionsaudit i services
  - Formï¿½l: Sikre dataintegritet for komplekse skriveoperationer inden ressourceaggregationen tilfï¿½jes.
  - ï¿½ndringer: Gennemgï¿½ workspaceService, usersService, projectsService; introducer transaction-helper; dï¿½k rollback-scenarier med service- og integrationstests.
  - Test (TDD):
    1) 
pm run test:services --prefix backend
    2) 
pm run test:api --prefix backend
  - Accept: Alle multi-step writes bruger transaktioner; tests bekrï¿½fter korrekt rollback ved fejl.
  - Afhï¿½ngigheder: ST-003.
  - Status: Transaction-helper indfï¿½rt og brugt i auth/setup/projects; vitest dï¿½kker commit/rollback.
- [x] ST-005: Aktiv?r strict TypeScript
  - Form?l: Fange typefejl tidligt og g?re frontendkoden klar til nye moduler.
  - ?ndringer: S?t `"strict": true` (m.fl.) i `tsconfig.json`; fjern `any`-smuthuller i `src/**`; opdater hooks/components og tests til at opfylde stricte typer.
  - Test (TDD):
    1) `npm run lint`
    2) `npm run test`
    3) `npm run build`
  - Accept: Frontend bygger i strict-mode uden typefejl; lint/test passerer uden at sl?kke reglerne.
  - Afh?ngigheder: ST-001, ST-004.

- [x] ST-006: Kontrol af timelog-inputs i modal
  - Form?l: Sikre at felterne for planlagte/faktiske timer altid viser senest kendte data efter bulk-udfyldning eller synkronisering.
  - ?ndringer: G?r inputs i `TimeLogModal` kontrollerede (`value` + lokal state) og synkronis?r dem med `member.timeEntries`; ryd op i eventh?ndtere, s? de ikke bruger `defaultValue`.
  - Test (TDD):
    1) Tilf?j Vitest/RTL-test i `src/components/__tests__/ProjectOrganizationChart.test.tsx`, der simulerer prop-opdatering og forventer opdateret inputv?rdi.
    2) `npm run test`
    3) `npm run lint`
  - Accept: Tests viser at inputv?rdier f?lger props efter bulk-opdatering; manuel QA bekr?fter at felterne opdateres uden at lukke modal.
  - Afh?ngigheder: ST-005.

- [x] ST-007: Synkron state i TimeLogModal
  - Form?l: Forhindre stale data ved at modalens totals og liste afspejler det seneste medlemssnapshot mens den er ?ben.
  - ?ndringer: Gem kun `timeLogMemberId` i komponentstate og udled medlem/medarbejder via `members`-props, eller synkronis?r objektet via `useEffect`; opdater afledte `useMemo` hooks.
  - Test (TDD):
    1) Udvid samme testfil med case hvor totals ?ndres efter en prop-opdatering, og forvent at summerne opdateres i UI'et.
    2) `npm run test`
    3) `npm run lint`
  - Accept: Tests bekr?fter at totals og r?kker reflekterer seneste data uden at gen?bne modal; manuel QA viser korrekt sum efter backend-respons.
  - Afh?ngigheder: ST-006.

- [x] ST-008: Ret dansk label i organisationskort
  - Form?l: Eliminere stavefejl i UI (manglende `?`) og forhindre regressioner.
  - ?ndringer: Opdater teksten til `Tilf?j medlem` i `ProjectOrganizationChart.tsx`; tilf?j en simpel render-test, der sikrer at knappen indeholder korrekt streng.
  - Test (TDD):
    1) Tilf?j en RTL-test der renderer komponenten og forventer `Tilf?j medlem` i output.
    2) `npm run test`
    3) `npm run lint`
  - Accept: Tests best?r, og UI viser korrekt dansk label.
  - Afh?ngigheder: ST-006.

---

## Fase P9 - Frontend struktur og DX

- [x] DX-001: Modularisï¿½r `useProjectManager`
  - Formï¿½l: Reducere kompleksitet og gï¿½re state-hï¿½ndtering testbar fï¿½r yderligere features.
  - ï¿½ndringer: Opdel hooken i domï¿½nespecifikke hooks/contexts (auth, projekter, medarbejdere); opdater komponenter og tests; dokumenter ny arkitektur.
  - Test (TDD):
    1) `npm run test`
    2) `npm run lint`
  - Accept: `useProjectManager`-filen er reduceret markant (<500 linjer) og tests dï¿½kker de nye hooks.
  - Afhï¿½ngigheder: ST-001, ST-005.

- [x] DX-002: Introducer TanStack Query
  - Form?l: Forenkle server-state management og f? caching/retry out-of-the-box.
  - ?ndringer: Installer `@tanstack/react-query`; opret `QueryClientProvider` i `main.tsx`; migrer centrale fetches (login/workspace) til queries/mutations; opdater fejlh?ndtering/toasts.
  - Delplan:
    1) Introducer `QueryClientProvider` i appen med en basiskonfiguration (ingen migrering endnu).
    2) Migrer initial `getWorkspace`-load til `useQuery` og erstat manuel loading/error-state.
    3) Flyt `login`/`logout` og `saveWorkspace` til `useMutation` + cache-opdateringer; just?r autosave.
    4) Udvid gradvist til ?vrige endpoints (`getUsers`, time-log), ryd op i legacy effects og tests.
  - Test (TDD):
    1) `npm run test`
    2) `npm run lint`
    3) `npm run build`
  - Accept: Serverkald hï¿½ndteres via React Query med bevaret UX; tests d?kker query-hooks.
  - Afhï¿½ngigheder: DX-001, ST-003.

- [x] DX-003: Opdel storkomponenter
  - Formï¿½l: ï¿½ge vedligeholdbarhed og lï¿½sbarhed i UI-laget.
  - ï¿½ndringer: Bryd `App.tsx` op i ruter/layouts med lazy-loading; del `ProjectOrganizationChart` m.fl. i mindre komponenter; opdater imports og tests.
  - Test (TDD):
  - Accept: Ingen enkeltkomponent overstiger 500 linjer; bundle-splitting bevarer funktionalitet.
  - Afhï¿½ngigheder: DX-001, DX-002.

---

## Fase P10 - Ressourcestyring (RM)

- [x] RM-001: Feature flag og skeleton-navigation
  - Formï¿½l: Gate ressourcemodulet bag et env-flag og forberede UI/route-stubs uden funktionel ï¿½ndring.
  - ï¿½ndringer: Tilfï¿½j `RESOURCES_ANALYTICS_ENABLED` til frontend/backend config, render navigation/placeholder kun nï¿½r flag er sandt, opret tom ``/analytics/resources``-route med 501-respons og dokumenter togglen.
  - Test (TDD):
    1) `npm run lint --prefix backend`
  - Accept: Med flag `false` vises ingen nye links eller API-responser; med flag `true` vises en "Coming soon"-placeholder uden dataadgang.
  - Afhï¿½ngigheder: FE-001, BE-007.

- [x] RM-002: `rresourceAnalyticsService` aggregation
  - Formï¿½l: Beregne kapacitet, planlagte og faktiske timer pr. uge for department- og project-scopes.
  - ï¿½ndringer: Opret `services/`rresourceAnalyticsService`.js`, brug eksisterende tabeller + `max_capacity_hours_week`, tilfï¿½j fixtures og automatiske tests i `backend/tests/`rresourceAnalyticsService`.test.js`, opret npm-script `test:services`.
  - Test (TDD):
    1) `npm run test:services --prefix backend`
    2) `npm run lint --prefix backend`
  - Accept: Testdata viser korrekt summering af capacity/planned/actual og identificerer over-allocated weeks.
  - Afhï¿½ngigheder: DB-002, DB-003.

- [x] RM-003: GET ``/analytics/resources`` endpoint
  - Formï¿½l: Eksponere aggregationerne via et sikkert API med input-validering og rolle-tjek.
  - ï¿½ndringer: Opret validator (Zod) til scope/ugeparametre, ny controller/route `routes/analyticsRoutes.js`, opdater `routes/index.js`, tilf?j integrationstests med Supertest og npm-script `test:api`.
  - Test (TDD):
    1) `npm run test:services --prefix backend`
    2) `npm run test:api --prefix backend`
    3) `npm run lint --prefix backend`
  - Accept: Admin fï¿½r 200 med series-data; ikke-autoriserede fï¿½r 403/401; ugyldige parametre giver 400.
  - Afhï¿½ngigheder: RM-002, SEC-001, BE-003, BE-007.

- [x] RM-004: Frontend dataclient + Vitest-setup
  - Formï¿½l: Hente ressource-data via den nye API og stabilisere data-modeller pï¿½ klienten.
  - ï¿½ndringer: Tilfï¿½j `vitest` og `@testing-library/react` som dev-deps, opret `npm run test`, implementer `fetchResourceAnalytics` i `src/api.ts` og `useResourceAnalytics` hook med Vitest-mocks.
  - Test (TDD):
    1) `npm run test -- --runInBand`
  - Accept: Hook returnerer normaliserede serier og hï¿½ndterer fejl/401 med eksisterende error boundary.
  - Afhï¿½ngigheder: RM-003, FE-004, FE-006.

- [x] RM-005: PMO ressourcemodul (Admin)
  - Formï¿½l: Bygge Ressource Analytics-side med department-filter og line chart.
  - ï¿½ndringer: Installer `recharts`, opret side-komponent + filterpanel, integrer hook og feature-flag, tilf?j screenshot i docs.
  - Test (TDD):
  - Accept: Med flag aktiveret kan Admin skifte department og se kapacitet/plan/aktuel-linjer med tooltips og over-allocation-markering.
  - Afhï¿½ngigheder: RM-004.

- [x] RM-006: Projekt-dashboard panel

- [x] PMO-010: Integrer Ressource Analytics som fane i PMO
  - Form?l: Samle alle ressourcerelaterede indsigter under PMO-sektionen og reducere navigation mellem sider.
  - ?ndringer:
    - Tilf?j tab-navigation p? PMO-siden og flyt nuv?rende Ressource Analytics-komponent ind som `resources`-fane.
    - Opret redirect fra `/resources` til PMO-siden (fx `/pmo?view=resources`), s? eksisterende dybe links bevares.
    - S?rg for at fanen respekterer feature-flag og rolle-adgang som i den nuv?rende standalone-side.
  - Test (TDD):
    1) Vitest: udvid `PmoPage` tests til at d?kke fane-navigation, redirect og rollebeskyttelse.
    2) Evt. integrationstest/route-test der verificerer redirect og feature-flag (React Testing Library).
  - Accept:
    - Bruger kan ?bne PMO-siden, skifte til Ressource Analytics-fanen og f? vist de samme serier som f?r.
    - Direkte bes?g p? `/resources` lander i PMO med korrekt fane valgt.
    - Feature-flag/roller virker som tidligere (kun administratorer ser fanen).
  - Afh?ngigheder: RM-005, RM-007.

- [x] RM-009: Synkroniser `location` og `department`
  - Form?l: Sikre at medarbejderens afdeling og lokation altid matcher, s? ressourcemodulet kan bygge p? ?t felt.
  - ?ndringer: Tilf?j helper i backend der spejler felterne ved read/write, opdater persist/import/sync-flow, og lav valgfri migration/backfill.
  - Test (TDD):
    1) unit-test for helperen, der viser location ? department synkronisering i begge retninger.
    2) integrationstest af workspace API (POST/GET) der bekr?fter at begge felter matches efter gem.
  - Accept: API-responser returnerer `department === location`, nye/?ndrede medarbejdere gemmes i sync, eksisterende data backfilles.
  - Afh?ngigheder: RM-005, RM-007.
  - Formï¿½l: Vise projekt-specifikt ressourceoverblik for Projektleder.
  - ï¿½ndringer: Tilfï¿½j panel pï¿½ projekt-dashboard, brug `scope=project`, vis badges nï¿½r planned/actual > capacity, respekter adgangsroller.
  - Test (TDD):
  - Accept: Projektleder ser panelet pï¿½ egne projekter; Admin ser samme; Teammedlem ser ikke panelet.
  - Afhï¿½ngigheder: RM-005, FE-006.

- [x] RM-007: Performance & eksport
  - Formï¿½l: Optimere svartid og muliggï¿½re CSV-eksport.
  - ï¿½ndringer: Tilfï¿½j in-memory caching (TTL) i service, implementer `?format=csv`, skriv tests for cache-hit og CSV-generator, dokumenter interaction med rate-limit.
  - Test (TDD):
    1) `npm run test:services --prefix backend`
    2) `npm run test`
    3) `npm run lint --prefix backend`
    4) `npm run lint`
  - Accept: Fï¿½rste kald beregner data, efterfï¿½lgende inden for TTL bruger cache; CSV-download giver korrekte kolonner med danske feltnavne.
  - Afhï¿½ngigheder: RM-003, RM-005.

- [x] RM-008: Dokumentation & release notes
  - Formï¿½l: Holde README, ROADMAP og CHANGELOG ajour med ressourcemodulet.
  - ï¿½ndringer: Opdater README med nye miljï¿½variable og UI-flow, ROADMAP-status, CHANGELOG-version bump og screenshots.
  - Test (TDD):
    1) `npm run lint`
    2) `npm run build`
  - Accept: Dokumentation beskriver feature flag, API-endpoint og frontend-flows; release-notes stemmer med implementeret funktionalitet.
  - Afhï¿½ngigheder: RM-007, DOC-001.

- [x] RM-010a: Backend projektfordeling
    - Form?l: Udvide ressourcemodulets data med projektsum pr. afdeling, s? frontend kan vise fordelingen.
    - ?ndringer:
      - Udvid `/analytics/resources` (department scope) til at levere projectBreakdown med planlagt/faktisk timer pr. aktivt projekt.
      - Opdater caching/tests i 
resourceAnalyticsService og API-controllerens svar.
    - Test (TDD):
      1) Vitest: `calcDepartmentSeries` returnerer breakdown og cache-tests d?kker ekstra query.
      2) Supertest: `/api/analytics/resources` svarer med feltet og respekterer feature-flag/roller.
    - Accept: Endpointet returnerer eksisterende data + breakdown uden regressions.
    - Afh?ngigheder: RM-005, RM-007.

- [x] RM-010b: Frontend hook & typer
    - Form?l: Eksponere projektfordelingen til PMO-fanen via hooks/API-klient.
    - ?ndringer:
      - Udvid `ResourceAnalyticsPayload`/api.fetchResourceAnalytics og useResourceAnalytics med projectBreakdown.
      - Normaliser data (sortering, fallback til tomt array) og eksponer totals i hook-resultatet.
    - Test (TDD):
      1) Vitest: hooken normaliserer data korrekt, inkl. tom input og sortering.
      2) Enhedstest for API-normalisering (validerer typekontrakt).
    - Accept: Hooken returnerer eksisterende struktur + projektfordeling uden at bryde kaldere.
    - Afh?ngigheder: RM-010a.

- [x] RM-010c: PMO UI donutdiagrammer
    - Form?l: Visualisere projektfordelingen i Ressource Analytics-fanen.
    - ?ndringer:
      - Tilf?j toggle og to donut-diagrammer (planlagt/faktisk) i PMO-varianten, kun for admin scope.
      - Hover-tooltip skal vise projektnavn, procent og timer.
    - Test (TDD):
      1) Vitest/RTL: komponenten viser diagrammer, toggle virker, og tom tilstand h?ndteres.
    - Accept: N?r hook returnerer data, ser brugeren to cirkeldiagrammer; toggle kan skjule sektionen.
    - Afh?ngigheder: RM-010b.

- [x] RM-010d: Dokumentation & artefakter
    - Form?l: Opdatere dokumentation, release-notes og screenshots til den nye visualisering.
    - ?ndringer:
      - Opdater README/CHANGELOG/ROADMAP med projektfordeling samt beskrive togglen.
      - Tilf?j eller opdater screenshot i docs/screenshots.
    - Test (TDD): Ikke-kode; peer review.
    - Accept: Dokumentation og artefakter afspejler den nye funktion.
    - Afh?ngigheder: RM-010c.


- [x] RM-011a: Arbejdskapacitet i workspace & CSV
  - Form?l: Normalisere og gemme medarbejderkapacitet ved indl?sning, autosave og CSV-import.
  - ?ndringer:
    - Rensning og default-v?rdi (37,5) i `useWorkspaceModule` ved load/update.
    - CSV-import accepterer (valgfri) kapacitetskolonne og opdaterer eksisterende medarbejdere.
  - Test (TDD):
    1) `npm run test`.
  - Accept: Autosave gemmer kapacitets?ndringer, og CSV-importen kan opdatere/tilf?je kapacitet.
  - Afh?ngigheder: RM-009.

- [x] RM-011b: Medarbejderdatabase UI
  - Form?l: Give administratorer mulighed for at redigere og oprette medarbejderkapacitet i UI.
  - ?ndringer:
    - Ny kolonne i `EmployeePage` med validerede kapacitetsfelter og inline-fejl.
    - Ny medarbejderr?kke inkluderer kapacitetsfelt; knapper resetter/gemmer u?ndrede v?rdier.
  - Test (TDD):
    1) `npm run test`.
  - Accept: UI viser kapacitet i tabellen, invalide input nulstilles og valideringsfejl vises.
  - Afh?ngigheder: RM-011a.

- [x] RM-011c: Testd?kning
  - Form?l: Sikre regressionstests for den nye kapacitetslogik.
  - ?ndringer:
    - Nye Vitest-suiter for `EmployeePage` (UI-interaktioner) og `useProjectManager.capacity` (hook-scenarier).
  - Test (TDD):
    1) `npm run test`.
  - Accept: Testene d?kker kapacitetsredigering, CSV-import og defaults uden fejl.
  - Afh?ngigheder: RM-011a, RM-011b.

- [x] RM-011d: Dokumentation & release-notes
  - Form?l: Synligg?re kapacitetsredigeringen i dokumentationen.
  - ?ndringer:
    - README indeholder instruktioner om kapacitetsfelter/CSV.
    - CHANGELOG [Unreleased] opdateret med UI + CSV ?ndringer.
    - TASKS opdateret med RM-011.
  - Test (TDD): Ikke-kode.
  - Accept: Dokumentation beskriver kapacitetsflowet for b?de UI og import.
  - Afh?ngigheder: RM-011b, RM-011c.

- [x] RM-012a: PMO-baseline for projektkapacitet
  - Formï¿½l: Give PMO mulighed for at sï¿½tte en samlet baseline (timer/uge) der gemmes i workspace-opsï¿½tningen.
  - ï¿½ndringer:
    - Oprettede workspace_settings-migration og backend-persist/autosave af pmoBaselineHoursWeek.
    - Udvidede frontend store/types samt PMO-siden med valideret baseline-input og feedback.
  - Test (TDD):
    1) npm run migrate
    2) npm run test
  - Accept: Baseline gemmes i databasen og vises/valideres i PMO-overblikket.
  - Afhï¿½ngigheder: RM-011b.

- [x] RM-012b: Aggregation af samlet projektbelastning
  - Formï¿½l: Udvide /analytics/resources sï¿½ hver uge indeholder stacked planlagt/faktisk belastning pr. projekt + totaler.
  - ï¿½ndringer:
    - Udvidede resourceAnalyticsService til at levere projectStackPlan/projectStackActual, totals og baseline-data fra workspace-settings.
    - Opdaterede API-svaret og typer til at inkludere baseline pr. uge, totale summer og nye felter til kommende frontend-hooks.
  - Test (TDD):
    1) npm run test
  - Afhï¿½ngigheder: RM-012a.

- [x] RM-012c: Hook & modeller til stacked data
  - Formaal: Eksponere baseline og stacked projektdata til frontend-komponenter.
  - Aendringer:
    - `useResourceAnalytics` normaliserer nu projectStackPlan/-Actual til `projectStackSeries` og `projectStackTotals` sammen med baseline-tal.
    - ResourceAnalyticsPage viser baseline-kort, baseline reference line og opdaterede afvigelser; ResourceSummaryCard fik ny baseline-tone.
    - Hook- og side-tests opdateret til at daekke nye felter og baseline-fallback.
  - Test (TDD):
    1) npm run build
    2) npm run test
  - Afhaengigheder: RM-012b.
  - Afh?ngigheder: RM-012b.

- [x] RM-012d: PMO-stacked chart
  - Formaal: Visualisere baseline kontra planlagt/faktisk belastning pr. projekt i PMO-fanen.
  - Aendringer:
    - Nyt stacked projektkort i den indlejrede analytics-visning med baseline reference line, badges for uger over baseline og custom tooltip.
    - Tilfoejede helper-funktioner til farvepalet og datastruktur (`resourceAnalyticsStacking`) med Vitest-daekning.
    - RTL-tests opdateret til embedded visningen og Recharts-mock udvidet til AreaChart.
  - Test (TDD):
    1) npm run lint
    2) npm run test
    3) npm run build
  - Afhaengigheder: RM-012c.
- [x] RM-012e: Dokumentation & release-notes
  - Purpose: Document the PMO baseline concept and the stacked capacity chart.
  - Changes:
    - README and CHANGELOG updated with baseline guidance; screenshot checklist refreshed.
    - Task list marked complete with reminders on adjusting the baseline and interpreting the chart.
  - Test (TDD): Not applicable (docs only).
  - Dependencies: RM-012d.
## Fase P11 – Arkitektonisk Finpudsning og Oprydning

- [x] FE-007 (Kritisk): Soft 401-håndtering (Client-side Navigation)
  - Formål: Erstatte den nuværende "hard reload" (window.location.href) ved 401-fejl for at undgå at miste al app-state.
  - Ændringer:
    - Fjern window.location.href = '/login' fra fetchWithAuth-logikken i src/api.ts.
    - Lad i stedet 401-fejlen boble op fra fetchWithAuth.
    - Opsæt en global onError-handler på QueryClient (src/main.tsx).
    - Handleren skal fange fejlen, tjekke error.status === 401 og kalde en central logout-funktion (fx useAuthManager).
    - Logout-state skal trigge en client-side <Navigate to="/login" /> (fx i AppShell.tsx eller App.tsx).
  - Test (TDD):
    1) Opret Vitest/RTL-test med QueryClientProvider og MemoryRouter (brug createMemoryHistory for at kunne asserte location).
    2) Mock api.getWorkspace til at returnere 401.
    3) Spy på logout-funktionen (fx fra useAuthManager) og bekræft at den kaldes.
    4) Bekræft at window.location.reload/.href ikke kaldes, og at history.location.pathname ender på "/login".
  - Accept: 401-fejl sender brugeren til login via React Router uden fuld browser-reload.
  - Afhængigheder: FE-006, DX-002.

- [x] FE-008 (Arkitektur): Granulære Mutationer (Færdiggør DX-002)
  - Formål: Erstatte api.saveWorkspace med specifikke mutationer for bedre performance og færre race conditions.
  - Ændringer:
    - **FE-008a Backend API** (færdig): eksponer medarbejder/projekt/indstillinger-ruter.
    - **FE-008b Frontend API-adapter** (færdig): udvid src/api.ts med nye endpoints og sanitizing helper.
    - **FE-008c Hooks & State** (færdig): refaktorer useWorkspaceModule til dedikerede mutationer, fjern autosave, håndter query invalidation.
      - Done: workspaceQuery hydrerer nu projects/employees/settings og styrer isLoading/apiError, så hooks arbejder på server-konsistent data.
      - Done: projekt-organization handlinger (assign/update/delete) rammer nu nye /api/projects/:id/members-endpoints via egne useMutation-hooks med invalidateQueries.
      - Done: autosave-helperen `setProjectAndSync` er udfaset; projektkonfig/status/report-ændringer bruger nu eksplicitte mutationer (partial PATCH) med lokal optimisme og efterfølgende invalidation.
    - **FE-008d UI-integration** (færdig): alle væsentlige UI’er er nu koblet på mutation-hooks og viser tydelig status.
      - EmployeePage, ProjectSettingsPage, ProjectOrganizationPage/Chart og ProjectReportsPage bruger SyncStatusPill og låser inputs/handlinger under igangværende mutationer.
      - Dashboard-tekst beskriver ikke længere autosave men backend-synkronisering.
    - **FE-008e Test & oprydning** (i gang): tilføj Vitest/RTL-tests for nye mutationer og fjern api.saveWorkspace-stubs.
      - Done: useProjectManager-tests dækker nu employee-/project-mutationerne (inkl. cache-invalidation); backendens gamle `saveWorkspace`-route + validator er fjernet, så ingen stubs er tilbage.
      - Optional: udvid evt. med yderligere mutation-tests (fx project members/time logging), men kritiske stier er dækket.
    - **FE-008f UX Polish** (færdig): Optimér mutationsflowet så UI ikke "hopper til toppen".
      - Done: ProjectReportsPage viser nu en “Gem tidslinje”-badge, når der foretages drag/tilføjelser i Timeline; ændringer holdes lokalt, og brugeren gemmer/fortryder eksplicit (ingen auto-flush midt i interaktionen).
      - Done: useWorkspaceModule understøtter targeted `reportsManager.replaceState`, så QueryClient opdateres stille uden at nulstille scroll, mens save-knappen bruger samme mutation-flow som resten af projekthandlingerne.
      - Optional: Tilføj evt. en Vitest/RTL-interaktionstest, der simulerer timeline-drag og bekræfter at dirty-state + gem-knap opfører sig korrekt, samt at andre rapportsektioner stadig synker mod serveren.
  - Test (TDD):
    1) Opret Vitest/RTL-test for redigering af medarbejder.
    2) Mock api.updateEmployee og bekræft korrekt payload.
    3) Få fat i den QueryClient, der bruges i testen, og spy på queryClient.invalidateQueries for at sikre at den kaldes efter succes.
    4) Tilføj tilsvarende tests for de øvrige mutation-hooks (fx updateProjectConfig) der bekræfter payload og invalidateQueries-kald.
  - Accept: saveWorkspace er fjernet; alle dataskrivninger bruger specifikke mutationer.
  - Afhængigheder: DX-002.

- [x] DX-004 (Optimering): Opdel 'God Component' (ResourceAnalyticsPage)
  - Resultat: ResourceAnalyticsPage.tsx er nu 298 linjer og fungerer som tynd orchestrator oven på udbrudte komponenter + utils.
  - Ændringer:
    - Utility-funktioner er flyttet til `src/utils/date.ts` og `src/utils/format.ts`, så andre domæner kan genbruge uge-/timeformatteringen.
    - En ny komponentmappe (`src/app/pages/resources/components/`) rummer nu alle cards, states og layouts (fx `StackedProjectsCard`, `ProjectBreakdownSection`, `AnalyticsContent`).
    - ResourceAnalyticsPage importerer kun de nødvendige byggeklodser og håndterer range/department-state; logikken deles mellem `constants.ts` og `types.ts`.
    - Nye smoke-tests (`StackedProjectsCard.test.tsx`, `ProjectBreakdownSection.test.tsx`) sikrer at de vigtigste komponenter kan rendre isoleret i testmiljøet (med ResizeObserver-mock).
  - Tests:
    - `npm run lint`
    - `npm run test -- src/app/pages/resources/ResourceAnalyticsPage.test.tsx src/app/pages/resources/components/__tests__/StackedProjectsCard.test.tsx src/app/pages/resources/components/__tests__/ProjectBreakdownSection.test.tsx`
    - `npm run build`
  - Opfølgning:
    - Understøt evt. flere smoke-tests (fx StackedLegend) og filtrér Recharts/React Router warnings i tests for at holde logs rene.
  - Afhængigheder: DX-003, RM-005.

- [x] BE-008 (Optimering): Konsekvent Backend Logging (Ryd op i db.js)
  - Formål: Erstatte console.log/error i database-laget med den centraliserede logger.
  - Ændringer:
    - Importer logger fra ../logger.js i backend/db.js.
    - Erstat console.log('Connected to the database') med logger.info('Connected to the database').
    - Erstat console.error('Unexpected error on idle client', err) med logger.error(err, 'Unexpected error on idle client').
  - Test (TDD):
    1) Kør npm run dev:backend og verificer JSON-formatet log output.
    2) npm run lint --prefix backend.
    3) Skriv en hurtig Vitest-enhedstest der stubber loggeren og bekræfter at logger.info/logger.error kaldes.
  - Accept: Ingen console.log/error i db.js; loggeren bruges konsekvent.
  - Afhængigheder: BE-006.

- [x] BE-009 (Robusthed): 'Fail-Fast' ved Serveropstart
  - Formål: Stoppe serveren tidligt hvis kritiske env-variabler mangler.
  - Ændringer:
    - Tjek config.jwtSecret og config.databaseUrl ved opstart i backend/index.js.
    - Log logger.fatal med manglende variabler og kald process.exit(1).
  - Test (TDD):
    1) Kør `cross-env JWT_SECRET= DATABASE_URL= npm run dev:backend` for at udløse fatal log og sikre at processen stopper.
    2) npm run test --prefix backend.
  - Accept: Serveren nægter at starte uden kritiske env-variabler og logger tydeligt hvorfor.
  - Afhængigheder: ST-002, BE-006.

## Fase P12 – Risikoanalyse & Matrix (se docs/risk-matrix-sdd.md)

- [x] RISK-001: Data Model & Migration
  - Formål: Opret `project_risks` (+ optional history) og ryd legacy rapport-risici.
  - Ændringer: Migrationer, kategori-enum, defaults (score, last_follow_up_at, category=other).
  - Test (TDD): Vitest migrations (up/down), helper-unit test for kategorimapping, seed-script sanity.
  - Accept: `npm run migrate` opretter tabellerne og `down` ruller clean tilbage.
  - Afhængigheder: SDD godkendt.

- [x] RISK-002: Backend Services & APIs
  - Formål: CRUD-service + REST-endpoints (liste, create, patch, archive) med adgangskontrol.
  - Ændringer: `projectRiskService`, routes (`GET/POST /projects/:id/risks`, `PATCH/DELETE /risks/:id`), filterparams, category metadata.
  - Test (TDD): Vitest service-tests (filters, validations, drag updates), Supertest suite (flag on), role-guard tests, snapshot assertions.
  - Accept: API returnerer forventede felter og respekterer feature flag + roller.
  - Afhængigheder: RISK-001.

- [ ] RISK-003: Feature Flag & Config
  - Formål: Styre nye endpoints via `PROJECT_RISK_ANALYSIS_ENABLED` + dokumentér opsætning.
  - Ændringer: Config parsing, README/.env.example note, middleware der lukker ruter når flag er false.
  - Test (TDD): Config-unit test for defaults, Supertest der viser 404/409 ved flag off.
  - Accept: Når flag er false, eksponeres ingen nye ruter; docs beskriver flagget.
  - Afhængigheder: RISK-002.

- [ ] RISK-004: Frontend Risikovurderingstab
  - Formål: Ny route `/projects/:id/risks` med liste, filtrering og drawer-editor (Plan A/B, kategori, owner, follow-up).
  - Ændringer: React Query hooks (`useProjectRisks*`), komponenter for liste + editor, badges for “sidst fulgt op”.
  - Test (TDD): RTL for liste (filtre + badges) og drawer (valideringer, Plan A/B submit), hook-tests med mocked fetch.
  - Accept: Projektleder kan oprette/redigere risici fra fanen; Teammedlem ser read-only.
  - Afhængigheder: RISK-002, RISK-003.

- [ ] RISK-005: Moderniseret Risiko Matrix
  - Formål: Full-width matrix med drag/drop + kategori-badges og keyboard fallback.
  - Ændringer: Ny matrixkomponent (@dnd-kit), helper til koordinater/farver, responsive layout.
  - Test (TDD): RTL/user-event for drag/kb-interaktioner, unit-test for heatmap helper, visuel kontrol (Storybook/Chromatic hvis muligt).
  - Accept: Cards kan flyttes mellem celler med mutationer; UI matcher designkrav.
  - Afhængigheder: RISK-004.

- [ ] RISK-006: Rapport & Snapshot Integration
  - Formål: Rapportmodulet refererer kuraterede risici og gemmer snapshots inkl. badges for arkiverede.
  - Ændringer: `POST /reports/:id/risks`, snapshot-tabeller, rapport-UI for valg og matrix-rendering (snapshot mode), eksport-opdateringer.
  - Test (TDD): Supertest for snapshot endpoints, RTL for rapport-editor/matrix, unit-tests for eksport (CSV/PDF) med nye felter.
  - Accept: Rapportens matrix bruger snapshot-data og viser “Arkiveret siden uge X” når relevant.
  - Afhængigheder: RISK-002, RISK-005.

- [ ] RISK-007: QA, UAT & Dokumentation
  - Formål: Sikre end-to-end kvalitet, UAT og release-noter.
  - Ændringer: Cypress/Playwright smoke-scenarie, README + CHANGELOG, UAT-script.
  - Test (TDD): E2E-flow (create risk → drag i matrix → tilføj til rapport), evt. jest-axe sanity, dokumentationsreview.
  - Accept: PMO/Projektleder tester accepteret; release-notes klar.
  - Afhængigheder: Alle foregående RISK-ops.
