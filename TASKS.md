## Fase P0 â€” Forberedelse & Hygiejne (lav risiko, stor effekt)

- [x] REPO-001: Fjern dubletter og genererede filer
  - FormÃ¥l: EliminÃ©r filkollisioner og forvirring mellem `src/**` og rodkopier.
  - Ã†ndringer: Slet/arkivÃ©r bl.a. `App.js`, `components/*.js`, `hooks/useProjectManager.js`, `index-1.tsx`, tom `index.tsx`, `types.js`, `metadata*.json` (eller flyt til `docs/`), `tmp_patch.py`, `setup-db.sql` (i roden), `-1.gitignore`.
  - Test (TDD):
    1) `npm run test`
    2) `npm run lint`
    3) `npm run build`
    2) `rg -n "src\\(components|hooks|types)" -S` viser, at kun TypeScript-kilder bruges.
  - Accept: Dev og build virker; ingen ubrugte .js-duplikater parallelt med .tsx.
  - PRD: Â§4 Stabilitet og PÃ¥lidelighed (grundlag for projekt- og ressourcestyring i Â§3.1â€“Â§3.3).
  - AfhÃ¦ngigheder: Ingen.

- [x] REPO-002: NormalisÃ©r filkodning og lokalisering
  - FormÃ¥l: UndgÃ¥ â€œï¿½â€-tegn i UI og sikre konsistent UTF-8.
  - Ã†ndringer: TilfÃ¸j `.editorconfig`; ret mis-encodede strenge (fx â€œSkÃ¦lskÃ¸râ€ i `src/types.ts`).
  - Test (TDD): Ã…bn UI; verificÃ©r danske tegn (Ã¦Ã¸Ã¥) vises korrekt i titler og labels.
  - Accept: Alle danske strenge gengives korrekt i browseren og i build-output.
  - PRD: Â§4 Performance & Responsivitet (lokaliseret UI fra Â§3.1 og Â§3.2 uden encoding-fejl).
  - AfhÃ¦ngigheder: REPO-001 (anbefalet).

- [x] REPO-003: ESLint/Prettier baseline for TS/React
  - FormÃ¥l: Fange fejl tidligt og standardisere stil.
  - Ã†ndringer: TilfÃ¸j `.eslintrc.cjs` + `.prettierrc.json`, installer `eslint-plugin-react`, ryd op i ubrugte imports og kÃ¸r `npm run lint`.
  - Test (TDD): `npm run lint` returnerer 0 fejl; CI konfigureres senere til at kÃ¸re lint.
  - Accept: Ingen lint-fejl i `src/**`.
  - PRD: Â§4 Stabilitet og PÃ¥lidelighed (kodekvalitet understÃ¸tter kernefunktioner i Â§3.1â€“Â§3.3).
  - AfhÃ¦ngigheder: Ingen.

---

## Fase P1 â€” Frontend konfiguration og build-hÃ¦rdning

- [x] FE-001: Env-baseret API-base + Vite-proxy
  - FormÃ¥l: UndgÃ¥ hardcoded URL'er og CORS-problemer i dev.
  - Ã†ndringer: OpsÃ¦t `VITE_API_BASE_URL` i `src/api.ts`, tilfÃ¸j proxy i `vite.config.ts`, opret `.env.example`, opdater README.
  - Test (TDD):
    1) `npm run lint`.
    2) `npm run build`.
  - Accept: Login/workspace fungerer i dev uden CORS-justeringer og kan pege mod eksternt API via `.env`.
  - PRD: Â§3.1 Kernefunktioner (stabil driftsopsÃ¦tning) & Â§4 Stabilitet og PÃ¥lidelighed (miljÃ¸fleksibilitet).
  - AfhÃ¦ngigheder: Ingen.

- [x] FE-002: Fjern importmap i `index.html` (CDN Tailwind beholdes midlertidigt)
  - FormÃ¥l: Deterministiske builds uden eksterne importmaps.
  - Ã†ndringer: Fjernede importmap-blokken og rettede title-encoding i `index.html`.
  - Test (TDD):
    1) `npm run lint`.
    2) `npm run build`.
  - Accept: Ingen runtime-fejl pga. manglende imports; konsol er ren.

- [x] FE-003: Strammere TS-importer (ingen .ts/.tsx endelser)
  - FormÃ¥l: Konsistente imports og nemmere refaktor.
  - Ã†ndringer: Sat `allowImportingTsExtensions=false`, `allowJs=false` i tsconfig og fjernede alle `.ts`/`.tsx`-endelser i imports.
  - Test (TDD):
    1) `npm run lint`.
    2) `npm run build`.
  - Accept: Build og dev fungerer uden TS-endelser i imports.
  - PRD: Â§4 Stabilitet og Dataintegritet (tydelige moduler til rapport- og ressourceflows i Â§3.1â€“Â§3.2).
  - AfhÃ¦ngigheder: REPO-003.


- [x] FE-005: Bundt Tailwind lokalt
  - FormÃ¥l: EliminÃ©r CDN-afhÃ¦ngighed for CSS og fÃ¥ prod-kontrol.
  - Ã†ndringer: Installerede Tailwind/PostCSS lokalt, tilfÃ¸jede `tailwind.config.js`, `postcss.config.js`, `src/index.css`, importerede CSS i `main.tsx`, fjernede CDN fra `index.html`.
  - Test (TDD):
    1) `npm run lint`.
    2) `npm run build`.
  - Accept: Ingen visuelle regressioner og ingen CDN-kald i prod.
  - AfhÃ¦ngigheder: FE-002.

  - AfhÃ¦ngigheder: FE-002.

---

## Fase P2 â€” Backend sikkerhed og robusthed

- [x] BE-001: `helmet` + stram CORS via env
  - FormÃ¥l: Basal sikkerhed og kontrolleret origin-adgang.
  - Ã†ndringer: TilfÃ¸jede Helmet, CORS-whitelist styret af `CORS_ORIGIN` med udviklingsfallback og dokumenterede env-feltet.
  - Test (TDD):
    1) `npm run lint`.
    2) `npm run build`.
  - Accept: CORS kun tilladt fra whitelisted origin; security-headere sat.

  - PRD: Â§3.3 Bruger- og adgangsstyring & Â§4 Sikkerhed/Kryptering (beskyt loginflow).
  - AfhÃ¦ngigheder: Ingen.


- [X] BE-003: Central error handler
  - FormÃ¥l: En ensartet 500-respons og mindre duplikeret try/catch.
  - Ã†ndringer: TilfÃ¸j `app.use((err, req, res, next) => { ... })`; skift lokale catch til `next(err)`.
  - Test (TDD): Tving en fejl (fx kast i en route); respons er 500 med ensartet JSON.
  - Accept: Konsistente fejlbeskeder/logs; ingen utilsigtede 200â€™er ved fejl.
  - PRD: Â§4 Stabilitet og PÃ¥lidelighed (kontrollerede fejl for rapportering i Â§3.1â€“Â§3.2).
  - AfhÃ¦ngigheder: BE-001.

- [x] BE-004: Inputvalidering (login/register/time-entries)
  - FormÃ¥l: Forudsigelige 400-fejl ved dÃ¥rlige inputs.
  - Ã†ndringer: `zod`/`joi` skemaer for body/params; indsÃ¦t i relevante ruter.
  - Test (TDD): Send ugyldige felter/typer; 400 med forklarende fejl.
  - Accept: Alle validerede ruter afviser dÃ¥rlige inputs konsistent.
  - PRD: Â§3.1â€“Â§3.3 Dataintegritet (forhindrer forkerte data i projekter, rapporter og brugere).
  - AfhÃ¦ngigheder: BE-003.

- [x] BE-005: `/health` endpoint
  - FormÃ¥l: Drift/overvÃ¥gning; enkel liveness/readiness.
  - Ã†ndringer: TilfÃ¸jede `GET /health` med DB ping og dokumenterede endpoint i README/backend-README.
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

## Fase P3 â€” CI/CD, kvalitet og dev-oplevelse

- [x] CI-001: GitHub Actions â€“ build/lint for root + backend
  - FormÃ¥l: Automatisk kvalitetstjek ved PR.
  - Ã†ndringer: Workflow der kÃ¸rer `npm ci`, `npm run lint`, `npm run build` (root) og tilsvarende i `backend/`.
  - Test (TDD): Ã…bn PR; workflow passerer grÃ¸nt.
  - Accept: Alle PRâ€™er kÃ¸rer pipeline; fejl blokkerer merge.
  - AfhÃ¦ngigheder: REPO-003.

- [x] CI-002: Postgres-service + migration smoke test
  - FormÃ¥l: Fang DB/migration-fejl tidligt.
  - Ã†ndringer: Actions-job med Postgres service, `backend/npm run migrate` mod test-DB.
  - Test (TDD): Workflow passerer; migrations anvendes uden fejl.
  - Accept: Stabil migrationskÃ¸rsel i CI.
  - AfhÃ¦ngigheder: CI-001.

- [x] DEV-001: `dev:all` â€“ start FE+BE samtidig
  - FormÃ¥l: Hurtigere lokal udvikling.
  - Ã†ndringer: TilfÃ¸jet `concurrently`-opsÃ¦tning samt scripts `npm run dev:backend` og `npm run dev:all` i roden.
  - Test (TDD): `npm run dev:all` starter begge processer.
  - Accept: Ã‰t kommando-flow til lokal udvikling.
  - AfhÃ¦ngigheder: FE-001, BE-001.

- [x] CI-003: Husky + lint-staged (pre-commit)
  - FormÃ¥l: Fang issues fÃ¸r commit.
  - Ã†ndringer: Opsat Husky `pre-commit` hook med `lint-staged`, som kÃ¸rer `npm run lint` og `npm run lint --prefix backend` pÃ¥ berÃ¸rte filer.
  - Test (TDD): Commit med lint-fejl blokeres; rettelse tillader commit.
  - Accept: Hooks kÃ¸rer konsistent pÃ¥ alle maskiner.
  - AfhÃ¦ngigheder: REPO-003.

---

## Fase P4 â€” Database og migrations

- [x] DB-001: `citext` til e-mails + unikke indeks
  - FormÃ¥l: Indbygget case-insensitive hÃ¥ndtering af emails.
  - Ã†ndringer: Migration aktiverer `citext`, konverterer `users.email`/`employees.email` til `citext` og erstatter `LOWER(...)`-indeks med native constraints.
  - Test (TDD): Opret to brugere med `Admin@Example.com` og `admin@example.com` â†’ 2. fejler pÃ¥ unikhed.
  - Accept: Login/registrering virker fortsat; unikhed hÃ¥ndhÃ¦ves.
  - AfhÃ¦ngigheder: CI-002.

- [x] DB-002: Kapacitetsfelter (ressource-roadmap)
  - FormÃ¥l: Forberede ressourcestyring (RM-roadmap).
  - Ã†ndringer: Migration tilfÃ¸jer `employees.max_capacity_hours_week NUMERIC(6,2) NOT NULL DEFAULT 0` + non-negativ check; backend/frontend opdateret til at sende/lÃ¦se feltet.
  - Test (TDD): Migration opdaterer schema; API kan lÃ¦se feltet uden fejl.
  - Accept: `npm run migrate` okay; ingen brud i eksisterende flows.
  - AfhÃ¦ngigheder: CI-002.

- [x] DB-003: Azure SSO felter (forberedelse til ROADMAP)
  - FormÃ¥l: UnderstÃ¸t senere Azure Graph sync/SSO.
  - Ã†ndringer: Migration tilfÃ¸jede `azure_ad_id`, `department`, `job_title`, `account_enabled`, `synced_at` samt unik index pÃ¥ `azure_ad_id`.
  - Test (TDD): Migration og rollback kÃ¸rer; ingen effekt pÃ¥ eksisterende data.
  - Accept: Schema udvidet uden regressions.
  - AfhÃ¦ngigheder: CI-002.

---

## Fase P5 â€” Backend struktur og modulopdeling

- [X] BE-007: Opdel `backend/index.js` i routers og services
  - FormÃ¥l: Vedligeholdbarhed + testbarhed.
  - Ã†ndringer: Opret `routes/auth.js`, `routes/workspace.js`, `routes/users.js`, `routes/projects.js`; flyt forretningslogik til `services/*`.
  - Test (TDD): Smoke: Alle eksisterende endpoints svarer som fÃ¸r (200/401/403/404 og JSON-formater uÃ¦ndret).
  - Accept: Ingen Ã¦ndring i API-kontrakter; kode kompileres og kÃ¸rer.
  - AfhÃ¦ngigheder: BE-003, BE-004.

---

## Fase P6 â€” Valgfri hardening og DX-forbedringer

- [x] SEC-001: JWT i HttpOnly-cookie (i stedet for localStorage)
  - FormÃ¥l: Mindre XSS-eksponering.
  - Ã†ndringer: Udskift bearer-flow med `Set-Cookie` HttpOnly + CSRF-beskyttelse; hold samme payload/TTL.
  - Test (TDD): Login sÃ¦tter cookie; API-kald virker; CSRF-test blokkerer cross-site POST.
  - Accept: Funktionelt login/logout uden localStorage token.
  - Plan:
    1) Opdater backend-login til at sÃ¦tte HttpOnly JWT + generere CSRF-cookie.
    2) TilfÃ¸j CSRF-middleware og krÃ¦v tokens pÃ¥ muterende ruter.
    3) Opdater frontend `fetch` til `credentials: 'include'` og sende `X-CSRF-Token`.
    4) Ryd op i localStorage-hÃ¥ndtering, kÃ¸r lint/build og login/logout smoke.
  - Status: HttpOnly cookies + CSRF middleware implementeret; lint/build kÃ¸rt (SEC-001).
- [x] FE-004: Global Error Boundary + API-fejlvisning
  - FormÃ¥l: Robust fejloplevelse og hurtigere fejlfinding.
  - Ã†ndringer: TilfÃ¸jede `ErrorBoundary`, globale toasts (`StatusToast`) og hÃ¥ndterer 401/5xx fra API med brugerbesked.
  - Test (TDD):
    1) Stop backend/server og bekrÃ¦ft at UI viser toast og recovery i stedet for blank side.
    2) `npm run lint` & `npm run build`.
  - Accept: Ingen blanke sider; fejl vises konsistent og kan lukkes.
  - PRD: Â§3.1 Projektrapportering (pÃ¥lidelig UX) & Â§4 Stabilitet (graceful degradation).
  - AfhÃ¦ngigheder: FE-001.

  - Dependencies: BE-006.

- [x] FE-006: Beskyt mod reload-loops ved 401 i `api.ts`
  - FormÃ¥l: UndgÃ¥ gentagne `window.location.reload()`-loops.
  - Ã¦ndringer: IndfÃ¸r "once"-guard eller redirect til login uden hard reload.
  - Test (TDD): Invalider token; app gÃ¸r til login uden uendelig reload.
  - Accept: Stabil recovery fra 401.
  - AfhÃ¦ngigheder: FE-004.
  - Status: `fetchWithAuth` hÃ¥ndterer 401 med engangs-redirect til `/login` (FE-006).



---

## Fase P7 â€” Dokumentation

- [X] DOC-001: Opdater README + backend/README med nye flows
  - FormÃ¥l: Hold dokumentation i sync.
  - Ã†ndringer: API-base via env, CORS/helmet, dev:all, CI badges.
  - Test (TDD): FÃ¸lg README â€œfra nulâ€ i et rent miljÃ¸ â†’ alt virker.
  - Accept: En udvikler kan komme fra 0 â†’ kÃ¸rende miljÃ¸ via docs.
  - AfhÃ¦ngigheder: P0â€“P3 primÃ¦rt.


---

## Fase P8 - Stabilitetsforbedringer (fÃ¸r RM)

- [x] ST-001: Testbaseline for frontend og backend
  - FormÃ¥l: Sikre automatiseret regressionskontrol fÃ¸r roadmapets nÃ¦ste features.
  - Ã¦ndringer: TilfÃ¸j `Vitest` + `@testing-library/react` til frontend og `Vitest` + `supertest` til backend; opret basis-tests for `useProjectManager` og `workspaceService`; tilfÃ¸j scripts `npm run test`, `npm run test --prefix backend`, `npm run test:services --prefix backend`, `npm run test:api --prefix backend`; dokumenter testsetup i README/CONTRIBUTING.
  - Test (TDD):
    1) `npm run test`
    2) `npm run test --prefix backend`
    3) `npm run lint`
  - Accept: Begge test-suites kÃ¸rer grÃ¸nt lokalt og i CI; mindst Ã©n service- og Ã©n hook-test dÃ¦kker eksisterende kerneflow.
  - AfhÃ¦ngigheder: CI-003, BE-007.
  - Status: Vitest og automatiske tests kÃ¸rer for frontend (`useProjectManager`) og backend (`loadFullWorkspace` + API-healthcheck).

- [x] ST-002: Centraliseret config-modul
  - FormÃ¥l: Valider miljÃ¸variabler Ã©t sted og styre featureflags sikkert.
  - Ã¦ndringer: Opret Backend/config/index.js med Zod-validering og typed exports; refaktorer middleware/services til at bruge modulet; tilfÃ¸j fallback for testmiljÃ¸; opdater README med nye nÃ¸gler.
  - Test (TDD):
    1) 
pm run test --prefix backend
    2) 
pm run lint --prefix backend
  - Accept: Alle process.env-slag er erstattet af config-importer; serverstart fejler med klar fejl ved manglende env.
  - AfhÃ¦ngigheder: ST-001.
  - Status: Konfiguration centraliseret; middleware, scripts og dokumentation bruger nu typed config.
- [x] ST-003: Udvidet input-validering
  - FormÃ¥l: Blokere ugyldige payloads pÃ¥ alle muterende endpoints, inden RM-API'et udvider fladen.
  - Ã¦ndringer: TilfÃ¸j Zod-schemas til users, projects, setup m.fl.; centralisÃ©r fejlformat; opdater controller-tests.
  - Test (TDD):
    1) 
pm run test:api --prefix backend
    2) 
pm run lint --prefix backend
  - Accept: Alle muterende endpoints returnerer 400 med konsistent fejlrespons ved ugyldige body/params/query.
  - AfhÃ¦ngigheder: ST-001, ST-002.
  - Status: Setup- og bruger-APIet validerer nu payloads med Zod og dÃ¦kkes af nye validator-tests.
- [x] ST-004: Transaktionsaudit i services
  - FormÃ¥l: Sikre dataintegritet for komplekse skriveoperationer inden ressourceaggregationen tilfÃ¸jes.
  - Ã¦ndringer: GennemgÃ¥ workspaceService, usersService, projectsService; introducer transaction-helper; dÃ¦k rollback-scenarier med service- og integrationstests.
  - Test (TDD):
    1) 
pm run test:services --prefix backend
    2) 
pm run test:api --prefix backend
  - Accept: Alle multi-step writes bruger transaktioner; tests bekrÃ¦fter korrekt rollback ved fejl.
  - AfhÃ¦ngigheder: ST-003.
  - Status: Transaction-helper indfÃ¸rt og brugt i auth/setup/projects; vitest dÃ¦kker commit/rollback.
- [x] ST-005: Aktivér strict TypeScript
  - Formål: Fange typefejl tidligt og gøre frontendkoden klar til nye moduler.
  - Ændringer: Sæt `"strict": true` (m.fl.) i `tsconfig.json`; fjern `any`-smuthuller i `src/**`; opdater hooks/components og tests til at opfylde stricte typer.
  - Test (TDD):
    1) `npm run lint`
    2) `npm run test`
    3) `npm run build`
  - Accept: Frontend bygger i strict-mode uden typefejl; lint/test passerer uden at slække reglerne.
  - Afhængigheder: ST-001, ST-004.

- [x] ST-006: Kontrol af timelog-inputs i modal
  - Formål: Sikre at felterne for planlagte/faktiske timer altid viser senest kendte data efter bulk-udfyldning eller synkronisering.
  - Ændringer: Gør inputs i `TimeLogModal` kontrollerede (`value` + lokal state) og synkronisér dem med `member.timeEntries`; ryd op i eventhåndtere, så de ikke bruger `defaultValue`.
  - Test (TDD):
    1) Tilføj Vitest/RTL-test i `src/components/__tests__/ProjectOrganizationChart.test.tsx`, der simulerer prop-opdatering og forventer opdateret inputværdi.
    2) `npm run test`
    3) `npm run lint`
  - Accept: Tests viser at inputværdier følger props efter bulk-opdatering; manuel QA bekræfter at felterne opdateres uden at lukke modal.
  - Afhængigheder: ST-005.

- [x] ST-007: Synkron state i TimeLogModal
  - Formål: Forhindre stale data ved at modalens totals og liste afspejler det seneste medlemssnapshot mens den er åben.
  - Ændringer: Gem kun `timeLogMemberId` i komponentstate og udled medlem/medarbejder via `members`-props, eller synkronisér objektet via `useEffect`; opdater afledte `useMemo` hooks.
  - Test (TDD):
    1) Udvid samme testfil med case hvor totals ændres efter en prop-opdatering, og forvent at summerne opdateres i UI'et.
    2) `npm run test`
    3) `npm run lint`
  - Accept: Tests bekræfter at totals og rækker reflekterer seneste data uden at genåbne modal; manuel QA viser korrekt sum efter backend-respons.
  - Afhængigheder: ST-006.

- [x] ST-008: Ret dansk label i organisationskort
  - Formål: Eliminere stavefejl i UI (manglende `ø`) og forhindre regressioner.
  - Ændringer: Opdater teksten til `Tilføj medlem` i `ProjectOrganizationChart.tsx`; tilføj en simpel render-test, der sikrer at knappen indeholder korrekt streng.
  - Test (TDD):
    1) Tilføj en RTL-test der renderer komponenten og forventer `Tilføj medlem` i output.
    2) `npm run test`
    3) `npm run lint`
  - Accept: Tests består, og UI viser korrekt dansk label.
  - Afhængigheder: ST-006.

---

## Fase P9 - Frontend struktur og DX

- [x] DX-001: ModularisÃ©r `useProjectManager`
  - FormÃ¥l: Reducere kompleksitet og gÃ¸re state-hÃ¥ndtering testbar fÃ¸r yderligere features.
  - Ã¦ndringer: Opdel hooken i domÃ¦nespecifikke hooks/contexts (auth, projekter, medarbejdere); opdater komponenter og tests; dokumenter ny arkitektur.
  - Test (TDD):
    1) `npm run test`
    2) `npm run lint`
  - Accept: `useProjectManager`-filen er reduceret markant (<500 linjer) og tests dÃ¦kker de nye hooks.
  - AfhÃ¦ngigheder: ST-001, ST-005.

- [x] DX-002: Introducer TanStack Query
  - Formål: Forenkle server-state management og få caching/retry out-of-the-box.
  - Ændringer: Installer `@tanstack/react-query`; opret `QueryClientProvider` i `main.tsx`; migrer centrale fetches (login/workspace) til queries/mutations; opdater fejlhåndtering/toasts.
  - Delplan:
    1) Introducer `QueryClientProvider` i appen med en basiskonfiguration (ingen migrering endnu).
    2) Migrer initial `getWorkspace`-load til `useQuery` og erstat manuel loading/error-state.
    3) Flyt `login`/`logout` og `saveWorkspace` til `useMutation` + cache-opdateringer; justér autosave.
    4) Udvid gradvist til øvrige endpoints (`getUsers`, time-log), ryd op i legacy effects og tests.
  - Test (TDD):
    1) `npm run test`
    2) `npm run lint`
    3) `npm run build`
  - Accept: Serverkald hÃ¥ndteres via React Query med bevaret UX; tests dï¿½kker query-hooks.
  - AfhÃ¦ngigheder: DX-001, ST-003.

- [x] DX-003: Opdel storkomponenter
  - FormÃ¥l: Ã¸ge vedligeholdbarhed og lÃ¸sbarhed i UI-laget.
  - Ã¦ndringer: Bryd `App.tsx` op i ruter/layouts med lazy-loading; del `ProjectOrganizationChart` m.fl. i mindre komponenter; opdater imports og tests.
  - Test (TDD):
  - Accept: Ingen enkeltkomponent overstiger 500 linjer; bundle-splitting bevarer funktionalitet.
  - AfhÃ¦ngigheder: DX-001, DX-002.

---

## Fase P10 - Ressourcestyring (RM)

- [x] RM-001: Feature flag og skeleton-navigation
  - FormÃ¥l: Gate ressourcemodulet bag et env-flag og forberede UI/route-stubs uden funktionel Ã¦ndring.
  - Ã¦ndringer: TilfÃ¸j `RESOURCES_ANALYTICS_ENABLED` til frontend/backend config, render navigation/placeholder kun nÃ¥r flag er sandt, opret tom `/analytics/resources`-route med 501-respons og dokumenter togglen.
  - Test (TDD):
    1) `npm run lint --prefix backend`
  - Accept: Med flag `false` vises ingen nye links eller API-responser; med flag `true` vises en "Coming soon"-placeholder uden dataadgang.
  - AfhÃ¦ngigheder: FE-001, BE-007.

- [x] RM-002: ResourceAnalyticsService aggregation
  - FormÃ¥l: Beregne kapacitet, planlagte og faktiske timer pr. uge for department- og project-scopes.
  - Ã¦ndringer: Opret `services/resourceAnalyticsService.js`, brug eksisterende tabeller + `max_capacity_hours_week`, tilfÃ¸j fixtures og automatiske tests i `backend/tests/resourceAnalyticsService.test.js`, opret npm-script `test:services`.
  - Test (TDD):
    1) `npm run test:services --prefix backend`
    2) `npm run lint --prefix backend`
  - Accept: Testdata viser korrekt summering af capacity/planned/actual og identificerer over-allocated weeks.
  - AfhÃ¦ngigheder: DB-002, DB-003.

- [x] RM-003: GET `/analytics/resources` endpoint
  - FormÃ¥l: Eksponere aggregationerne via et sikkert API med input-validering og rolle-tjek.
  - Ã¦ndringer: Opret validator (Zod) til scope/ugeparametre, ny controller/route `routes/analyticsRoutes.js`, opdater `routes/index.js`, tilfï¿½j integrationstests med Supertest og npm-script `test:api`.
  - Test (TDD):
    1) `npm run test:services --prefix backend`
    2) `npm run test:api --prefix backend`
    3) `npm run lint --prefix backend`
  - Accept: Admin fÃ¸r 200 med series-data; ikke-autoriserede fÃ¥r 403/401; ugyldige parametre giver 400.
  - AfhÃ¦ngigheder: RM-002, SEC-001, BE-003, BE-007.

- [x] RM-004: Frontend dataclient + Vitest-setup
  - FormÃ¥l: Hente ressource-data via den nye API og stabilisere data-modeller pÃ¥ klienten.
  - Ã¦ndringer: TilfÃ¸j `vitest` og `@testing-library/react` som dev-deps, opret `npm run test`, implementer `fetchResourceAnalytics` i `src/api.ts` og `useResourceAnalytics` hook med Vitest-mocks.
  - Test (TDD):
    1) `npm run test -- --runInBand`
  - Accept: Hook returnerer normaliserede serier og hÃ¥ndterer fejl/401 med eksisterende error boundary.
  - AfhÃ¦ngigheder: RM-003, FE-004, FE-006.

- [x] RM-005: PMO ressourcemodul (Admin)
  - FormÃ¥l: Bygge Ressource Analytics-side med department-filter og line chart.
  - Ã¦ndringer: Installer `recharts`, opret side-komponent + filterpanel, integrer hook og feature-flag, tilfï¿½j screenshot i docs.
  - Test (TDD):
  - Accept: Med flag aktiveret kan Admin skifte department og se kapacitet/plan/aktuel-linjer med tooltips og over-allocation-markering.
  - AfhÃ¦ngigheder: RM-004.

- [x] RM-006: Projekt-dashboard panel
  - FormÃ¥l: Vise projekt-specifikt ressourceoverblik for Projektleder.
  - Ã¦ndringer: TilfÃ¸j panel pÃ¥ projekt-dashboard, brug `scope=project`, vis badges nÃ¥r planned/actual > capacity, respekter adgangsroller.
  - Test (TDD):
  - Accept: Projektleder ser panelet pÃ¥ egne projekter; Admin ser samme; Teammedlem ser ikke panelet.
  - AfhÃ¦ngigheder: RM-005, FE-006.

- [ ] RM-007: Performance & eksport
  - FormÃ¥l: Optimere svartid og muliggÃ¸re CSV-eksport.
  - Ã¦ndringer: TilfÃ¸j in-memory caching (TTL) i service, implementer `?format=csv`, skriv tests for cache-hit og CSV-generator, dokumenter interaction med rate-limit.
  - Test (TDD):
    1) `npm run test:services --prefix backend`
    2) `npm run test`
    3) `npm run lint --prefix backend`
    4) `npm run lint`
  - Accept: FÃ¸rste kald beregner data, efterfÃ¸lgende inden for TTL bruger cache; CSV-download giver korrekte kolonner med danske feltnavne.
  - AfhÃ¦ngigheder: RM-003, RM-005.

- [ ] RM-008: Dokumentation & release notes
  - FormÃ¥l: Holde README, ROADMAP og CHANGELOG ajour med ressourcemodulet.
  - Ã¦ndringer: Opdater README med nye miljÃ¸variable og UI-flow, ROADMAP-status, CHANGELOG-version bump og screenshots.
  - Test (TDD):
    1) `npm run lint`
    2) `npm run build`
  - Accept: Dokumentation beskriver feature flag, API-endpoint og frontend-flows; release-notes stemmer med implementeret funktionalitet.
  - AfhÃ¦ngigheder: RM-007, DOC-001.

Noter
- Opgaverne er designet, sÃ¥ hver kan merges isoleret og verificeres med minimale, reproducerbare trin.
- Ved stÃ¸rre refaktoreringer (BE-007) anbefales flag/feature toggles og smÃ¥ commits med hyppige smoke-tests.


















