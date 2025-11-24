## Fase P0 � Forberedelse & Hygiejne (lav risiko, stor effekt)
- [x] REPO-001: Fjern dubletter og genererede filer
  - Form�l: Elimin�r filkollisioner og forvirring mellem `src/**` og rodkopier.
  - �ndringer: Slet/arkiv�r bl.a. `App.js`, `components/*.js`, `hooks/useProjectManager.js`, `index-1.tsx`, tom `index.tsx`, `types.js`, `metadata*.json` (eller flyt til `docs/`), `tmp_patch.py`, `setup-db.sql` (i roden), `-1.gitignore`.
  - Test (TDD):
    1) `npm run test`
    2) `npm run lint`
    3) `npm run build`
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


- [X] BE-003: Central error handler
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

- [X] BE-007: Opdel `backend/index.js` i routers og services
  - Form�l: Vedligeholdbarhed + testbarhed.
  - �ndringer: Opret `routes/auth.js`, `routes/workspace.js`, `routes/users.js`, `routes/projects.js`; flyt forretningslogik til `services/*`.
  - Test (TDD): Smoke: Alle eksisterende endpoints svarer som f�r (200/401/403/404 og JSON-formater u�ndret).
  - Accept: Ingen �ndring i API-kontrakter; kode kompileres og k�rer.
  - Afh�ngigheder: BE-003, BE-004.

---

## Fase P6 � Valgfri hardening og DX-forbedringer

- [x] SEC-001: JWT i HttpOnly-cookie (i stedet for localStorage)
  - Form�l: Mindre XSS-eksponering.
  - �ndringer: Udskift bearer-flow med `Set-Cookie` HttpOnly + CSRF-beskyttelse; hold samme payload/TTL.
  - Test (TDD): Login s�tter cookie; API-kald virker; CSRF-test blokkerer cross-site POST.
  - Accept: Funktionelt login/logout uden localStorage token.
  - Plan:
    1) Opdater backend-login til at s�tte HttpOnly JWT + generere CSRF-cookie.
    2) Tilf�j CSRF-middleware og kr�v tokens p� muterende ruter.
    3) Opdater frontend `fetch` til `credentials: 'include'` og sende `X-CSRF-Token`.
    4) Ryd op i localStorage-h�ndtering, k�r lint/build og login/logout smoke.
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
  - �ndringer: Indf�r "once"-guard eller redirect til login uden hard reload.
  - Test (TDD): Invalider token; app g�r til login uden uendelig reload.
  - Accept: Stabil recovery fra 401.
  - Afh�ngigheder: FE-004.
  - Status: `fetchWithAuth` h�ndterer 401 med engangs-redirect til `/login` (FE-006).



---

## Fase P7 � Dokumentation

- [X] DOC-001: Opdater README + backend/README med nye flows
  - Form�l: Hold dokumentation i sync.
  - �ndringer: API-base via env, CORS/helmet, dev:all, CI badges.
  - Test (TDD): F�lg README �fra nul� i et rent milj� ? alt virker.
  - Accept: En udvikler kan komme fra 0 ? k�rende milj� via docs.
  - Afh�ngigheder: P0�P3 prim�rt.


---

## Fase P8 - Stabilitetsforbedringer (f�r RM)

- [x] ST-001: Testbaseline for frontend og backend
  - Form�l: Sikre automatiseret regressionskontrol f�r roadmapets n�ste features.
  - �ndringer: Tilf�j `Vitest` + `@testing-library/react` til frontend og `Vitest` + `supertest` til backend; opret basis-tests for `useProjectManager` og `workspaceService`; tilf�j scripts `npm run test`, `npm run test --prefix backend`, `npm run test:services --prefix backend`, `npm run test:api --prefix backend`; dokumenter testsetup i README/CONTRIBUTING.
  - Test (TDD):
    1) `npm run test`
    2) `npm run test --prefix backend`
    3) `npm run lint`
  - Accept: Begge test-suites k�rer gr�nt lokalt og i CI; mindst �n service- og �n hook-test d�kker eksisterende kerneflow.
  - Afh�ngigheder: CI-003, BE-007.
  - Status: Vitest og automatiske tests k�rer for frontend (`useProjectManager`) og backend (`loadFullWorkspace` + API-healthcheck).

- [x] ST-002: Centraliseret config-modul
  - Form�l: Valider milj�variabler �t sted og styre featureflags sikkert.
  - �ndringer: Opret Backend/config/index.js med Zod-validering og typed exports; refaktorer middleware/services til at bruge modulet; tilf�j fallback for testmilj�; opdater README med nye n�gler.
  - Test (TDD):
    1) 
pm run test --prefix backend
    2) 
pm run lint --prefix backend
  - Accept: Alle process.env-slag er erstattet af config-importer; serverstart fejler med klar fejl ved manglende env.
  - Afh�ngigheder: ST-001.
  - Status: Konfiguration centraliseret; middleware, scripts og dokumentation bruger nu typed config.
- [x] ST-003: Udvidet input-validering
  - Form�l: Blokere ugyldige payloads p� alle muterende endpoints, inden RM-API'et udvider fladen.
  - �ndringer: Tilf�j Zod-schemas til users, projects, setup m.fl.; centralis�r fejlformat; opdater controller-tests.
  - Test (TDD):
    1) 
pm run test:api --prefix backend
    2) 
pm run lint --prefix backend
  - Accept: Alle muterende endpoints returnerer 400 med konsistent fejlrespons ved ugyldige body/params/query.
  - Afh�ngigheder: ST-001, ST-002.
  - Status: Setup- og bruger-APIet validerer nu payloads med Zod og d�kkes af nye validator-tests.
- [x] ST-004: Transaktionsaudit i services
  - Form�l: Sikre dataintegritet for komplekse skriveoperationer inden ressourceaggregationen tilf�jes.
  - �ndringer: Gennemg� workspaceService, usersService, projectsService; introducer transaction-helper; d�k rollback-scenarier med service- og integrationstests.
  - Test (TDD):
    1) 
pm run test:services --prefix backend
    2) 
pm run test:api --prefix backend
  - Accept: Alle multi-step writes bruger transaktioner; tests bekr�fter korrekt rollback ved fejl.
  - Afh�ngigheder: ST-003.
  - Status: Transaction-helper indf�rt og brugt i auth/setup/projects; vitest d�kker commit/rollback.
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

- [x] DX-001: Modularis�r `useProjectManager`
  - Form�l: Reducere kompleksitet og g�re state-h�ndtering testbar f�r yderligere features.
  - �ndringer: Opdel hooken i dom�nespecifikke hooks/contexts (auth, projekter, medarbejdere); opdater komponenter og tests; dokumenter ny arkitektur.
  - Test (TDD):
    1) `npm run test`
    2) `npm run lint`
  - Accept: `useProjectManager`-filen er reduceret markant (<500 linjer) og tests d�kker de nye hooks.
  - Afh�ngigheder: ST-001, ST-005.

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
  - Accept: Serverkald h�ndteres via React Query med bevaret UX; tests d?kker query-hooks.
  - Afh�ngigheder: DX-001, ST-003.

- [x] DX-003: Opdel storkomponenter
  - Form�l: �ge vedligeholdbarhed og l�sbarhed i UI-laget.
  - �ndringer: Bryd `App.tsx` op i ruter/layouts med lazy-loading; del `ProjectOrganizationChart` m.fl. i mindre komponenter; opdater imports og tests.
  - Test (TDD):
  - Accept: Ingen enkeltkomponent overstiger 500 linjer; bundle-splitting bevarer funktionalitet.
  - Afh�ngigheder: DX-001, DX-002.

---

## Fase P10 - Ressourcestyring (RM)

- [x] RM-001: Feature flag og skeleton-navigation
  - Form�l: Gate ressourcemodulet bag et env-flag og forberede UI/route-stubs uden funktionel �ndring.
  - �ndringer: Tilf�j `RESOURCES_ANALYTICS_ENABLED` til frontend/backend config, render navigation/placeholder kun n�r flag er sandt, opret tom ``/analytics/resources``-route med 501-respons og dokumenter togglen.
  - Test (TDD):
    1) `npm run lint --prefix backend`
  - Accept: Med flag `false` vises ingen nye links eller API-responser; med flag `true` vises en "Coming soon"-placeholder uden dataadgang.
  - Afh�ngigheder: FE-001, BE-007.

- [x] RM-002: `rresourceAnalyticsService` aggregation
  - Form�l: Beregne kapacitet, planlagte og faktiske timer pr. uge for department- og project-scopes.
  - �ndringer: Opret `services/`rresourceAnalyticsService`.js`, brug eksisterende tabeller + `max_capacity_hours_week`, tilf�j fixtures og automatiske tests i `backend/tests/`rresourceAnalyticsService`.test.js`, opret npm-script `test:services`.
  - Test (TDD):
    1) `npm run test:services --prefix backend`
    2) `npm run lint --prefix backend`
  - Accept: Testdata viser korrekt summering af capacity/planned/actual og identificerer over-allocated weeks.
  - Afh�ngigheder: DB-002, DB-003.

- [x] RM-003: GET ``/analytics/resources`` endpoint
  - Form�l: Eksponere aggregationerne via et sikkert API med input-validering og rolle-tjek.
  - �ndringer: Opret validator (Zod) til scope/ugeparametre, ny controller/route `routes/analyticsRoutes.js`, opdater `routes/index.js`, tilf?j integrationstests med Supertest og npm-script `test:api`.
  - Test (TDD):
    1) `npm run test:services --prefix backend`
    2) `npm run test:api --prefix backend`
    3) `npm run lint --prefix backend`
  - Accept: Admin f�r 200 med series-data; ikke-autoriserede f�r 403/401; ugyldige parametre giver 400.
  - Afh�ngigheder: RM-002, SEC-001, BE-003, BE-007.

- [x] RM-004: Frontend dataclient + Vitest-setup
  - Form�l: Hente ressource-data via den nye API og stabilisere data-modeller p� klienten.
  - �ndringer: Tilf�j `vitest` og `@testing-library/react` som dev-deps, opret `npm run test`, implementer `fetchResourceAnalytics` i `src/api.ts` og `useResourceAnalytics` hook med Vitest-mocks.
  - Test (TDD):
    1) `npm run test -- --runInBand`
  - Accept: Hook returnerer normaliserede serier og h�ndterer fejl/401 med eksisterende error boundary.
  - Afh�ngigheder: RM-003, FE-004, FE-006.

- [x] RM-005: PMO ressourcemodul (Admin)
  - Form�l: Bygge Ressource Analytics-side med department-filter og line chart.
  - �ndringer: Installer `recharts`, opret side-komponent + filterpanel, integrer hook og feature-flag, tilf?j screenshot i docs.
  - Test (TDD):
  - Accept: Med flag aktiveret kan Admin skifte department og se kapacitet/plan/aktuel-linjer med tooltips og over-allocation-markering.
  - Afh�ngigheder: RM-004.

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
  - Form�l: Vise projekt-specifikt ressourceoverblik for Projektleder.
  - �ndringer: Tilf�j panel p� projekt-dashboard, brug `scope=project`, vis badges n�r planned/actual > capacity, respekter adgangsroller.
  - Test (TDD):
  - Accept: Projektleder ser panelet p� egne projekter; Admin ser samme; Teammedlem ser ikke panelet.
  - Afh�ngigheder: RM-005, FE-006.

- [x] RM-007: Performance & eksport
  - Form�l: Optimere svartid og muligg�re CSV-eksport.
  - �ndringer: Tilf�j in-memory caching (TTL) i service, implementer `?format=csv`, skriv tests for cache-hit og CSV-generator, dokumenter interaction med rate-limit.
  - Test (TDD):
    1) `npm run test:services --prefix backend`
    2) `npm run test`
    3) `npm run lint --prefix backend`
    4) `npm run lint`
  - Accept: F�rste kald beregner data, efterf�lgende inden for TTL bruger cache; CSV-download giver korrekte kolonner med danske feltnavne.
  - Afh�ngigheder: RM-003, RM-005.

- [x] RM-008: Dokumentation & release notes
  - Form�l: Holde README, ROADMAP og CHANGELOG ajour med ressourcemodulet.
  - �ndringer: Opdater README med nye milj�variable og UI-flow, ROADMAP-status, CHANGELOG-version bump og screenshots.
  - Test (TDD):
    1) `npm run lint`
    2) `npm run build`
  - Accept: Dokumentation beskriver feature flag, API-endpoint og frontend-flows; release-notes stemmer med implementeret funktionalitet.
  - Afh�ngigheder: RM-007, DOC-001.

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
  - Form�l: Give PMO mulighed for at s�tte en samlet baseline (timer/uge) der gemmes i workspace-ops�tningen.
  - �ndringer:
    - Oprettede workspace_settings-migration og backend-persist/autosave af pmoBaselineHoursWeek.
    - Udvidede frontend store/types samt PMO-siden med valideret baseline-input og feedback.
  - Test (TDD):
    1) npm run migrate
    2) npm run test
  - Accept: Baseline gemmes i databasen og vises/valideres i PMO-overblikket.
  - Afh�ngigheder: RM-011b.

- [x] RM-012b: Aggregation af samlet projektbelastning
  - Form�l: Udvide /analytics/resources s� hver uge indeholder stacked planlagt/faktisk belastning pr. projekt + totaler.
  - �ndringer:
    - Udvidede resourceAnalyticsService til at levere projectStackPlan/projectStackActual, totals og baseline-data fra workspace-settings.
    - Opdaterede API-svaret og typer til at inkludere baseline pr. uge, totale summer og nye felter til kommende frontend-hooks.
  - Test (TDD):
    1) npm run test
  - Afh�ngigheder: RM-012a.

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
## Fase P11 � Arkitektonisk Finpudsning og Oprydning

- [x] FE-007 (Kritisk): Soft 401-h�ndtering (Client-side Navigation)
  - Form�l: Erstatte den nuv�rende "hard reload" (window.location.href) ved 401-fejl for at undg� at miste al app-state.
  - �ndringer:
    - Fjern window.location.href = '/login' fra fetchWithAuth-logikken i src/api.ts.
    - Lad i stedet 401-fejlen boble op fra fetchWithAuth.
    - Ops�t en global onError-handler p� QueryClient (src/main.tsx).
    - Handleren skal fange fejlen, tjekke error.status === 401 og kalde en central logout-funktion (fx useAuthManager).
    - Logout-state skal trigge en client-side <Navigate to="/login" /> (fx i AppShell.tsx eller App.tsx).
  - Test (TDD):
    1) Opret Vitest/RTL-test med QueryClientProvider og MemoryRouter (brug createMemoryHistory for at kunne asserte location).
    2) Mock api.getWorkspace til at returnere 401.
    3) Spy p� logout-funktionen (fx fra useAuthManager) og bekr�ft at den kaldes.
    4) Bekr�ft at window.location.reload/.href ikke kaldes, og at history.location.pathname ender p� "/login".
  - Accept: 401-fejl sender brugeren til login via React Router uden fuld browser-reload.
  - Afh�ngigheder: FE-006, DX-002.

- [x] FE-008 (Arkitektur): Granul�re Mutationer (F�rdigg�r DX-002)
  - Form�l: Erstatte api.saveWorkspace med specifikke mutationer for bedre performance og f�rre race conditions.
  - �ndringer:
    - **FE-008a Backend API** (f�rdig): eksponer medarbejder/projekt/indstillinger-ruter.
    - **FE-008b Frontend API-adapter** (f�rdig): udvid src/api.ts med nye endpoints og sanitizing helper.
    - **FE-008c Hooks & State** (f�rdig): refaktorer useWorkspaceModule til dedikerede mutationer, fjern autosave, h�ndter query invalidation.
      - Done: workspaceQuery hydrerer nu projects/employees/settings og styrer isLoading/apiError, s� hooks arbejder p� server-konsistent data.
      - Done: projekt-organization handlinger (assign/update/delete) rammer nu nye /api/projects/:id/members-endpoints via egne useMutation-hooks med invalidateQueries.
      - Done: autosave-helperen `setProjectAndSync` er udfaset; projektkonfig/status/report-�ndringer bruger nu eksplicitte mutationer (partial PATCH) med lokal optimisme og efterf�lgende invalidation.
    - **FE-008d UI-integration** (f�rdig): alle v�sentlige UI�er er nu koblet p� mutation-hooks og viser tydelig status.
      - EmployeePage, ProjectSettingsPage, ProjectOrganizationPage/Chart og ProjectReportsPage bruger SyncStatusPill og l�ser inputs/handlinger under igangv�rende mutationer.
      - Dashboard-tekst beskriver ikke l�ngere autosave men backend-synkronisering.
    - **FE-008e Test & oprydning** (i gang): tilf�j Vitest/RTL-tests for nye mutationer og fjern api.saveWorkspace-stubs.
      - Done: useProjectManager-tests d�kker nu employee-/project-mutationerne (inkl. cache-invalidation); backendens gamle `saveWorkspace`-route + validator er fjernet, s� ingen stubs er tilbage.
      - Optional: udvid evt. med yderligere mutation-tests (fx project members/time logging), men kritiske stier er d�kket.
    - **FE-008f UX Polish** (f�rdig): Optim�r mutationsflowet s� UI ikke "hopper til toppen".
      - Done: ProjectReportsPage viser nu en �Gem tidslinje�-badge, n�r der foretages drag/tilf�jelser i Timeline; �ndringer holdes lokalt, og brugeren gemmer/fortryder eksplicit (ingen auto-flush midt i interaktionen).
      - Done: useWorkspaceModule underst�tter targeted `reportsManager.replaceState`, s� QueryClient opdateres stille uden at nulstille scroll, mens save-knappen bruger samme mutation-flow som resten af projekthandlingerne.
      - Optional: Tilf�j evt. en Vitest/RTL-interaktionstest, der simulerer timeline-drag og bekr�fter at dirty-state + gem-knap opf�rer sig korrekt, samt at andre rapportsektioner stadig synker mod serveren.
  - Test (TDD):
    1) Opret Vitest/RTL-test for redigering af medarbejder.
    2) Mock api.updateEmployee og bekr�ft korrekt payload.
    3) F� fat i den QueryClient, der bruges i testen, og spy p� queryClient.invalidateQueries for at sikre at den kaldes efter succes.
    4) Tilf�j tilsvarende tests for de �vrige mutation-hooks (fx updateProjectConfig) der bekr�fter payload og invalidateQueries-kald.
  - Accept: saveWorkspace er fjernet; alle dataskrivninger bruger specifikke mutationer.
  - Afh�ngigheder: DX-002.

- [x] DX-004 (Optimering): Opdel 'God Component' (ResourceAnalyticsPage)
  - Resultat: ResourceAnalyticsPage.tsx er nu 298 linjer og fungerer som tynd orchestrator oven p� udbrudte komponenter + utils.
  - �ndringer:
    - Utility-funktioner er flyttet til `src/utils/date.ts` og `src/utils/format.ts`, s� andre dom�ner kan genbruge uge-/timeformatteringen.
    - En ny komponentmappe (`src/app/pages/resources/components/`) rummer nu alle cards, states og layouts (fx `StackedProjectsCard`, `ProjectBreakdownSection`, `AnalyticsContent`).
    - ResourceAnalyticsPage importerer kun de n�dvendige byggeklodser og h�ndterer range/department-state; logikken deles mellem `constants.ts` og `types.ts`.
    - Nye smoke-tests (`StackedProjectsCard.test.tsx`, `ProjectBreakdownSection.test.tsx`) sikrer at de vigtigste komponenter kan rendre isoleret i testmilj�et (med ResizeObserver-mock).
  - Tests:
    - `npm run lint`
    - `npm run test -- src/app/pages/resources/ResourceAnalyticsPage.test.tsx src/app/pages/resources/components/__tests__/StackedProjectsCard.test.tsx src/app/pages/resources/components/__tests__/ProjectBreakdownSection.test.tsx`
    - `npm run build`
  - Opf�lgning:
    - Underst�t evt. flere smoke-tests (fx StackedLegend) og filtr�r Recharts/React Router warnings i tests for at holde logs rene.
  - Afh�ngigheder: DX-003, RM-005.

- [x] BE-008 (Optimering): Konsekvent Backend Logging (Ryd op i db.js)
  - Form�l: Erstatte console.log/error i database-laget med den centraliserede logger.
  - �ndringer:
    - Importer logger fra ../logger.js i backend/db.js.
    - Erstat console.log('Connected to the database') med logger.info('Connected to the database').
    - Erstat console.error('Unexpected error on idle client', err) med logger.error(err, 'Unexpected error on idle client').
  - Test (TDD):
    1) K�r npm run dev:backend og verificer JSON-formatet log output.
    2) npm run lint --prefix backend.
    3) Skriv en hurtig Vitest-enhedstest der stubber loggeren og bekr�fter at logger.info/logger.error kaldes.
  - Accept: Ingen console.log/error i db.js; loggeren bruges konsekvent.
  - Afh�ngigheder: BE-006.

- [x] BE-009 (Robusthed): 'Fail-Fast' ved Serveropstart
  - Form�l: Stoppe serveren tidligt hvis kritiske env-variabler mangler.
  - �ndringer:
    - Tjek config.jwtSecret og config.databaseUrl ved opstart i backend/index.js.
    - Log logger.fatal med manglende variabler og kald process.exit(1).
  - Test (TDD):
    1) K�r `cross-env JWT_SECRET= DATABASE_URL= npm run dev:backend` for at udl�se fatal log og sikre at processen stopper.
    2) npm run test --prefix backend.
  - Accept: Serveren n�gter at starte uden kritiske env-variabler og logger tydeligt hvorfor.
  - Afh�ngigheder: ST-002, BE-006.

## Fase P12 � Risikoanalyse & Matrix (se docs/risk-matrix-sdd.md)

- [x] RISK-001: Data Model & Migration
  - Form�l: Opret `project_risks` (+ optional history) og ryd legacy rapport-risici.
  - �ndringer: Migrationer, kategori-enum, defaults (score, last_follow_up_at, category=other).
  - Test (TDD): Vitest migrations (up/down), helper-unit test for kategorimapping, seed-script sanity.
  - Accept: `npm run migrate` opretter tabellerne og `down` ruller clean tilbage.
  - Afh�ngigheder: SDD godkendt.

- [x] RISK-002: Backend Services & APIs
  - Form�l: CRUD-service + REST-endpoints (liste, create, patch, archive) med adgangskontrol.
  - �ndringer: `projectRiskService`, routes (`GET/POST /projects/:id/risks`, `PATCH/DELETE /risks/:id`), filterparams, category metadata.
  - Test (TDD): Vitest service-tests (filters, validations, drag updates), Supertest suite (flag on), role-guard tests, snapshot assertions.
  - Accept: API returnerer forventede felter og respekterer feature flag + roller.
  - Afh�ngigheder: RISK-001.

- [x] RISK-003: Feature Flag & Config
  - Form�l: Styre nye endpoints via `PROJECT_RISK_ANALYSIS_ENABLED` + dokument�r ops�tning.
  - �ndringer: Config parsing, README/.env.example note, middleware der lukker ruter n�r flag er false.
  - Test (TDD): Config-unit test for defaults, Supertest der viser 404/409 ved flag off.
  - Accept: N�r flag er false, eksponeres ingen nye ruter; docs beskriver flagget.
  - Afh�ngigheder: RISK-002.

- [x] RISK-004: Frontend Risikovurderingstab
  - Form�l: Ny route `/projects/:id/risks` med liste, filtrering og drawer-editor (Plan A/B, kategori, owner, follow-up).
  - �ndringer: React Query hooks (`useProjectRisks*`), komponenter for liste + editor, badges for �sidst fulgt op�.
  - Test (TDD): RTL for liste (filtre + badges) og drawer (valideringer, Plan A/B submit), hook-tests med mocked fetch.
  - Accept: Projektleder kan oprette/redigere risici fra fanen; Teammedlem ser read-only.
  - Afh�ngigheder: RISK-002, RISK-003.

- [x] RISK-005: Moderniseret Risiko Matrix
  - Form�l: Full-width matrix med drag/drop + kategori-badges og keyboard fallback.
  - �ndringer: Ny matrixkomponent (@dnd-kit), helper til koordinater/farver, responsive layout.
  - Test (TDD): RTL/user-event for drag/kb-interaktioner, unit-test for heatmap helper, visuel kontrol (Storybook/Chromatic hvis muligt).
  - Accept: Cards kan flyttes mellem celler med mutationer; UI matcher designkrav.
  - Afh�ngigheder: RISK-004.

- [x] RISK-006: Rapport & Snapshot Integration
  - Form�l: Rapportmodulet refererer kuraterede risici og gemmer snapshots inkl. badges for arkiverede.
  - �ndringer: `POST /reports/:id/risks`, snapshot-tabeller, rapport-UI for valg og matrix-rendering (snapshot mode), eksport-opdateringer.
  - Test (TDD): Supertest for snapshot endpoints, RTL for rapport-editor/matrix, unit-tests for eksport (CSV/PDF) med nye felter.
  - Accept: Rapportens matrix bruger snapshot-data og viser "Arkiveret siden uge X" n�r relevant.
  - Afh�ngigheder: RISK-002, RISK-005.

- [x] RISK-007: QA, UAT & Dokumentation
  - Form�l: Sikre end-to-end kvalitet, UAT og release-noter.
  - �ndringer: Cypress/Playwright smoke-scenarie, README + CHANGELOG, UAT-script.
  - Test (TDD): E2E-flow (create risk ? drag i matrix ? tilf�j til rapport), evt. jest-axe sanity, dokumentationsreview.
  - Accept: PMO/Projektleder tester accepteret; release-notes klar.
  - Afh�ngigheder: Alle foreg�ende RISK-ops.
## Fase P13 - Kode-review fund (november 2025)

- [x] PERF-010: Trim server-workspace mutationer
  - Form�l: Undg� at hver CRUD-operation henter/kloner hele workspace, s� responstid og transaktionsl�ngde ikke vokser med datam�ngden.
  - �ndringer:
    1) Skriv m�lrettede repository-funktioner i backend (employees/projects/settings mv.), der kun l�ser/skriver relevante tabeller.
    2) Opdat�r controllers til at kalde de nye funktioner i stedet for `mutateWorkspace`.
    3) Indf�r query-scopes der begr�nser hvilke projekter/medarbejdere der hentes for ikke-admins.
    - Status 14/11: Employees-controller er refaktoreret til ny `employeesService`, PATCH `/workspace/settings` bruger nu `workspaceSettingsService`, og projekt-CRUD/medlems-CRUD/time entries bruger `projects/*Service` uden `mutateWorkspace`. N�ste trin: kvarst�ende projekt-relaterede flows (reports/drag actions) + oprydning af `mutateWorkspace`.
  - Test (TDD):
    1) Vitest/Supertest, der d�kker de nye repository-funktioner og sikrer at en projektleder kun ser/�ndrer egne projekter.
    2) Belastningstest (f.eks. k�r 200 opdateringer i parallel) og dokument�r forbedret latency.
  - Accept: Enkeltmutationer k�rer uden at serialisere hele workspace; ikke-admins f�r ikke l�ngere fuldt datas�t fra backend.
  - Afh�ngigheder: FE-008, BE-007.

- [X] RISK-008: Medtag owner-info i rapport-snapshots
  - Form�l: S�rge for at ProjectReportsPage viser navn/e-mail p� risiko-ejer efter snapshots er knyttet til en rapport.
  - �ndringer: Udvid `snapshotToProjectRisk` til at bygge `owner` objekt fra `owner_name`/`owner_email`, og v�r sikker p� at backend inkluderer felterne i API-svaret (JSON casing).
  - Test (TDD):
    1) RTL-test der tilf�jer en risiko til rapporten og bekr�fter at owner-badge renderes.
    2) Vitest for helperen der mapper snapshot -> ProjectRisk.
  - Accept: Risikotab og rapportmatrix viser igen hvem der ejer risikoen efter snapshot-synkronisering.
  - Afh�ngigheder: RISK-006.

- [x] UX-011: Differentier bootstrap-loading og baggrundsfetch
  - Form�l: Forhindre at hele appen viser spinner hver gang workspace-query refetcher i baggrunden.
  - �ndringer: Introducer `isBootstrapping` i useAuthModule/useWorkspaceModule, brug `workspaceQuery.isFetching` lokalt i komponenter i stedet for global `isLoading`.
  - Status 15/11: AppShell viser kun loader n�r brugeren bootstrapper eller logger ind, mens AppHeader nu markerer baggrundsopdateringer via `isWorkspaceFetching`.
  - Test (TDD):
    1) Enhedstest af hook der verificerer at `isBootstrapping` kun er sand f�rste gang.
    2) RTL-test hvor en mutation triggere invalidateQueries og sikrer at hovedlayout ikke bliver udskiftet med loader.
  - Accept: AppShell viser kun fuldsk�rms-spinner under initial login/bootstrap; efterf�lgende fetch viser kun lokale indikatorer.
  - Afh�ngigheder: FE-008.

- [ ] DX-012: Robust CSV-import af medarbejdere
  - Form�l: Underst�tte navne/afdelinger med kommaer og citat-tegn samt stabil lokationsmatching i importen.
  - �ndringer: Erstat manuel `split(',')` med en CSV-parser (f.eks. PapaParse) eller backend-endpoint; map lokationer gennem `locations` konstanten og giv fejlrapport pr. r�kke.
  - Test (TDD):
    1) Unit-test for parser-helperen med cases med citater/kommaer.
    2) RTL-test p� EmployeePage der uploader en kompleks CSV og forventer korrekt resultat/alert.
  - Accept: Import accepterer gyldige danske navne/afdelinger uden at springe r�kker over; fejl vises med pr�cise beskeder.
  - Afh�ngigheder: PERF-010 (valgfri hvis endpoint flyttes).

- [x] DX-013: Memoiser ProjectManager-contexts
  - Form�l: Reducere un�dvendige re-renders ved at stabilisere v�rdierne fra Auth/Workspace/Admin-context.
  - �ndringer: Pak `authValue`, `workspaceValue`, `adminValue` og `useProjectManager` i `useMemo` baseret p� specifikke afh�ngigheder; overvej at splitte providerne fysisk for at minimere cascading renders.
  - Status 17/11: Provider-v�rdier memoiseres, auth-modulets login/logout er `useCallback`, og `useProjectManager` returnerer et memoiseret mix.
  - Test (TDD):
    1) Profil�r (React Profiler eller vitest-snapshot) f�r/efter og dokument�r f�rre renders p� Dashboard/ProjectReportsPage.
    2) Unit-test der sikrer at memoization ikke deler stale referencer (fx �ndring i `projects` opdaterer WorkspaceContext).
  - Accept: Store sider (dashboard, rapporter) viser f�rre renders ved simple interaktioner; ingen regressions i context-data.
  - Afh�ngigheder: FE-008.

- [ ] AFK-010: Afklar behov for finere-granulerede workspace-endpoints
  - Form�l: Beslutte om vi skal bryde `/api/workspace`/`mutateWorkspace` op i mindre ruter og hvordan adgang skal styres.
  - Aktiviteter: Workshop med backend/FE, proof-of-concept p� projekt/employee scoping, estimat for migrering.
  - Accept: Beslutningsreferat med forslag og estimeret impact.

## Fase P14 - Projekt overblik & dashboards

- [x] UX-018: Projektmaal, business case og budgetfelter
  - Formal: Berige projektkonfigurationen med "hvorfor/hvor meget"-data, s� Overblik-siden kan gengive en �gte one-pager.
  - �ndringer:
    1) Backend-migration der tilf�jer project_goal TEXT, business_case TEXT og total_budget NUMERIC(12,2) til projects + opdaterer services/controllers til at l�se/skrive felterne.
    2) Udvid ProjectConfiguration/ProjectState/API-typerne i src/types.ts og useProjectManager til at inkludere projectGoal, businessCase og totalBudget.
    3) Tilf�j tre kort i ProjectSettingsPage.tsx: RichTextInlineEditor til projektm�l/business case samt et number-input (DKK) til samlet budget; mutationerne skal sende de nye felter.
  - Test (TDD):
    1) npm run migrate --prefix backend (up/down) + Vitest/Supertest for projektservice.
    2) RTL-test for SettingsPage hvor felterne redigeres og gemmes optimistisk.
    3) npm run build.
  - Accept: Felterne kan gemmes/vises fra settings og indg�r i API/typer uden at bryde eksisterende flows.
  - Afh�ngigheder: PERF-010 (services), DX-013 (memoiseret context).

- [x] UX-019: Overblik-navigation og side-skelet
  - Formal: Introducere en dedikeret "Overblik"-fane i ProjectLayout som landing page.
  - �ndringer:
    1) Tilf�j Overblik-tab i ProjectLayout.tsx (f�rste tab, path '' med end: true) og s�rg for at default-route peger hertil.
    2) Opret ProjectOverviewPage.tsx der henter projekt + seneste rapport eller viser en placeholder hvis ingen rapporter findes.
    3) Layout: grid grid-cols-1 lg:grid-cols-3 gap-6 med cards/empty-states ("Berig projektet med rapporter for at se KPI'er").
  - Test (TDD):
    1) RTL-test der klikker p� tabs og bekr�fter navigation/render uden rapporter.
    2) Snapshot/RTL for case med data.
    3) npm run lint && npm run build.
  - Accept: Brugere lander p� Overblik; siden viser konfig/empty-states uden fejl.
  - Afh�ngigheder: UX-018, FE-008.

- [x] UX-020: Overblik-widgets (KPI, milep�le, team, risici)
  - Formal: Vise live "Hvorfor/Hvad/Hvorn�r/Hvem" data og give genveje til uddybningsfaner.
  - �ndringer:
    1) Projektm�l/business case-kort (kolonne 1) med read-only RichText-render + CTA/link til settings n�r tekst mangler.
    2) KPI-kort (kolonne 2) med Budget (faktiske timer * standard timesats / totalBudget), Fremdrift (closedTasks/totalTasks) og Tid (dage til projectEndDate) samt empty-state hvis data mangler.
    3) Kommende milep�le (kolonne 2): sorter milestones + deliverables efter dato, vis n�ste 3-5 og link til tidslinjen.
    4) Projektteam (kolonne 3): list project.members (navn + rolle) og link til organisationsfanen.
    5) Top risici (kolonne 3): brug useProjectRisks til at hente listen, sorter efter score og vis 3-5 stk. med link til risikofanen.
    6) Hvert kort har en lille action (ikon/"Se detaljer") der navigerer til den relevante fane.
  - Test (TDD):
    1) Helper/unit-tests der beregner KPI'er og sorterer milep�le/risici korrekt.
    2) RTL-test for ProjectOverviewPage med mocked data + empty state.
    3) Manuel QA: klik p� kort-links og bekr�ft navigation.
  - Accept: Dashboardet viser aktuelle data eller guider brugeren til at berige projektet; links fungerer.
  - Afh�ngigheder: UX-019, UX-018, RISK-006, Kanban/tidslinje-modulerne.

- [ ] DX-012: Robust CSV-import af medarbejdere
  - Form�l: Underst�tte navne/afdelinger med kommaer og citat-tegn samt stabil lokationsmatching i importen.
  - �ndringer: Erstat manuel `split(',')` med en CSV-parser (f.eks. PapaParse) eller backend-endpoint; map lokationer gennem `locations` konstanten og giv fejlrapport pr. r�kke.
  - Test (TDD):
    1) Unit-test for parser-helperen med cases med citater/kommaer.
    2) RTL-test p� EmployeePage der uploader en kompleks CSV og forventer korrekt resultat/alert.
  - Accept: Import accepterer gyldige danske navne/afdelinger uden at springe r�kker over; fejl vises med pr�cise beskeder.
  - Afh�ngigheder: PERF-010 (valgfri hvis endpoint flyttes).

- [x] DX-013: Memoiser ProjectManager-contexts
  - Form�l: Reducere un�dvendige re-renders ved at stabilisere v�rdierne fra Auth/Workspace/Admin-context.
  - �ndringer: Pak `authValue`, `workspaceValue`, `adminValue` og `useProjectManager` i `useMemo` baseret p� specifikke afh�ngigheder; overvej at splitte providerne fysisk for at minimere cascading renders.
  - Status 17/11: Provider-v�rdier memoiseres, auth-modulets login/logout er `useCallback`, og `useProjectManager` returnerer et memoiseret mix.
  - Test (TDD):
    1) Profil�r (React Profiler eller vitest-snapshot) f�r/efter og dokument�r f�rre renders p� Dashboard/ProjectReportsPage.
    2) Unit-test der sikrer at memoization ikke deler stale referencer (fx �ndring i `projects` opdaterer WorkspaceContext).
  - Accept: Store sider (dashboard, rapporter) viser f�rre renders ved simple interaktioner; ingen regressions i context-data.
  - Afh�ngigheder: FE-008.

- [ ] AFK-010: Afklar behov for finere-granulerede workspace-endpoints
  - Form�l: Beslutte om vi skal bryde `/api/workspace`/`mutateWorkspace` op i mindre ruter og hvordan adgang skal styres.
  - Aktiviteter: Workshop med backend/FE, proof-of-concept p� projekt/employee scoping, estimat for migrering.
  - Accept: Beslutningsreferat + plan (eller fravalg) inkl. estimeret scope for PERF-010.
  - Afh�ngigheder: PERF-010 (input).

- [ ] AFK-011: Vurd�r server-side CSV-import
  - Form�l: Afklare om CSV-import skal flyttes til backend for bedre validering/logning/audit.
  - Aktiviteter: Unders�g databeskyttelseskrav, performance og DX; sammenlign med DX-012-l�sningen og lav anbefaling.
  - Accept: Notat i docs/TASKS med anbefaling og evt. opf�lgningsopgave (implementering eller fravalg).
  - Afh�ngigheder: DX-012.
- [x] PERF-011: Optimer tr�k-performance i tidslinjen
  - Form�l: Fjerne lag og un�dvendige re-renders n�r faser, milep�le eller leverancer tr�kkes.
  - �ndringer: `Timeline.tsx` har f�et lokalt `dragPreview`, s� `handleMouseMove` kun manipulerer visuelle v�rdier (start/end eller position). `handleMouseUp` laver �t enkelt `updateTimelineItem`-kald, hvilket betyder at draft-state/isTimelineDirty f�rst �ndres ved drop.
  - Test (TDD):
    1) `npm run build` (tsc + Vite) for at fange regressions i drag-preview logikken.
    2) `npm run test` (Vitest) for at sikre at eksisterende FE/BE-tests fortsat er gr�nne efter refaktoren.
    3) Manuel QA i rapportens tidslinje: drag-flyt + resize uden blink; "Gem tidslinje"-badge dukker f�rst efter drop.
  - Accept: Tr�k er silkebl�dt og "Gem tidslinje"-indikatoren t�nder f�rst efter afsluttet drag.
  - Afh�ngigheder: FE-008f.

- [x] UX-012: Fjern redundant leveranceliste
  - Form�l: Rapportens tidslinje er prim�r kilde, s� den ekstra liste skaber st�j.
  - �ndringer: Fjern `<DeliverablesList />`-sektionen fra `ProjectReportsPage.tsx` (b�de for ny og legacy visning).
  - Status 17/11: Leverancelisterne er fjernet fra begge branches, layoutet er justeret til ren matrix/risikovisning.
  - Test (TDD): Manuel QA - bekr�ft at rapporten loader, tidslinjen fungerer, og listen er v�k.
  - Accept: Rapportsiden er kortere uden at miste funktionalitet.
  - Afh�ngigheder: Ingen.

- [x] UX-013: Centraliser tidslinje-redigering (Inspector Panel)
  - Form�l: Erstatte hover-ikoner med et klik-aktiveret "Inspector"-panel til redigering.
  - �ndringer: `Timeline.tsx` har f�et `selectedItem`-state + drag-threshold, hover-handles er fjernet, og et nyt `TimelineInspectorPanel` h�ndterer tekst, datoer, farver og slet med �t samlet UI.
  - Test (TDD): `npm run build` (tsc + Vite) for at sikre type-sikkerhed; manuel QA af klik/drag-flow og inspector.
  - Accept: Redigering sker via panelet, UI er mere ryddeligt.
  - Afh�ngigheder: PERF-011 (perf-optimering f�lger senere, men panelet er klar til det).

- [x] UX-014: Stabiliser leverance-layout
  - Form�l: Leverancer m� ikke hoppe/overlappe ved resize eller zoom.
  - �ndringer: `Timeline.tsx` bruger nu en deterministisk, data-drevet beregning af lanes (baseret p� positioner og zoomScale) i stedet for `ResizeObserver`. Lane-antal og sektionens h�jde udregnes af samme helper, s� UI ikke springer ved zoom eller vindues-resize.
  - Test (TDD):
    1) `npm run build` (tsc + Vite) og `npm run test` (Vitest) for at sikre regressionsfri refaktor.
    2) Manuel QA: Drag/zoom/resize uden at leverancer overlapper eller skifter lane uforudsigeligt.
  - Accept: Leverancer forbliver stabile og overlapper ikke.
  - Afh�ngigheder: UX-012.

- [x] UX-015: Rapportheader med KPI�er
  - Form�l: Give �jeblikkeligt overblik over projektstatus, aktiv rapportuge og n�glestatistikker.
  - �ndringer: Nyt `ProjectReportHeader`-kort i `ProjectReportsPage`, der viser projektnavn, status, rapportuge, projektperiode, timeline-draft-indikator og sm� KPI-kort (risici, faser, milep�le, leverancer, opgaver).
  - Test (TDD): `npm run build` efter implementering; manuel QA af rapportfanen (valg af uge, dirty timeline) for at sikre korrekt badges og t�llere.
  - Accept: Rapportfanen viser et tydeligt headerkort f�r �vrige moduler.
  - Afh�ngigheder: UX-013 (for at genbruge timeline-dirty status).

- [x] UX-016: Kanban opgaveinspekt�r
  - Form�l: G�re det muligt at tilf�je flere detaljer (ansvarlig, deadline, noter) til hver Kanban-opgave via et klik fremfor en ekstra liste.
  - �ndringer: `KanbanTask`-data er udvidet med `assignee`, `dueDate`, `notes`; KanbanBoard kan nu �bne et nyt `KanbanTaskInspector`-panel med editable felter. Backend rapport-tabellen (`report_kanban_tasks`) er migreret til at gemme de nye felter, og workspace-synkronisering l�ser/skrver dem.
  - Test (TDD): `npm run build`; manuel QA af Kanban (klik p� kort, redig�r felter, tilf�j/slet) for at bekr�fte at v�rdierne gemmes og at timeline-draft-regler fortsat respekteres.
  - Accept: N�r man klikker p� en Kanban-opgave �bner et detaljepanel under boardet med felter for ansvarlig, deadline og noter.
  - Afh�ngigheder: UX-015 (layout), eksisterende Kanban-funktionalitet.

- [x] UX-017: Kanban opgaveliste med toggle
  - Form�l: Give et hurtigt overblik over alle opgaver i en sorteret liste uden at erstatte boardet permanent.
  - �ndringer: Kanban-opgaver har f�et `createdAt`; boardets header har en �Vis opgaveliste�-toggle, som viser en ny `KanbanTaskList` (sorteret efter oprettelse) med status, ansvarlig og deadlines. Backend f�r tilsvarende `created_at`-kolonne + migration.
  - Test (TDD): `npm run build`; manuel QA (toggle liste, klik p� r�kker, rediger i inspector). Migration `20251117000202_add_created_at_to_report_tasks` skal k�re p� databasen.
  - Accept: Standardvisning er u�ndret (kun board); n�r togglen aktiveres, vises listen med de samme data.
  - Afh�ngigheder: UX-016 (detaljepanel & udvidede datafelter).

## Fase P4 � Milep�lsplan & tidslinje

- [x] MP-001: Datamodel og backend-API for Milep�lsplan
  - Form�l: Udvide ProjectState og databasen med workstreams, udvidede faser/milep�le og leverancer inkl. checklister, s� b�de frontend og rapporter deler samme sandhed.
  - �ndringer: Tilf�j nye tabeller/kolonner (`project_workstreams`, `report_deliverables`, `report_deliverable_checklist`, ekstra felter p� `report_phases` og `report_milestones`), opdater `workspaceService` load/sync, introduc�r nye `projectActions` i `useWorkspaceModule`.
  - Test (TDD): `npm run lint`, `npm run test`, `npm run migrate`, samt en Supertest-suite der verificerer at GET `/workspace` returnerer workstreams/milestones/deliverables.
  - Accept: Backend kan skabe/l�se plan-data uden regressioner p� eksisterende projekter; migrations kan k�re p� tom og udfyldt DB.
  - PRD: ?.2 Visualisering & rapportering (Milep�le) + ? Stabilitet.
  - Afh�ngigheder: MP-0 arkitekturopgaver jf. roadmap (typer/deps) + BE-001..003.

- [x] REF-001: Refaktorér Milepælsplan til 3-lags arkitektur (AGENTS.md compliance)
  - Formål: Sikre at den nye kode overholder `AGENTS.md` ved at separere SQL fra forretningslogik, før vi bygger videre.
  - Ændringer: 
    - Udtræk SQL fra `syncProjectWorkstreams`, `syncReportState` m.fl. i `workspaceService.js` til nye repositories: `backend/repositories/workstreamRepository.js` og `backend/repositories/reportRepository.js`.
    - Sørg for at services kun indeholder validering og orkestrering, ingen direkte `client.query`.
  - Test (TDD): `npm run test` (eksisterende tests skal stadig passere grønt efter refaktorering).
  - Accept: Ingen direkte SQL-kald i services relateret til MP-001; arkitekturen følger Controller -> Service -> Repository.
  - Afhængigheder: MP-001.

- [x] MP-002: Ny MilestonePlan-fane med CRUD og modaler
  - Form�l: Give projektledere et dedikeret UI (`/projects/:id/plan`) med Gantt-/listevisning, modal-flow og workstreamstyring.
  - �ndringer: Flyt/omd�b `TimelineView` ? `MilestonePlan`, tilf�j `readOnly`-prop, implement�r ny side/route i `ProjectLayout`, bind modaler til `projectActions`, installer `lucide-react`, dokument�r afh�ngigheder.
  - Test (TDD): `npm run lint`, `npm run test`, Vitest/RTL for plan-hooks og komponenter, manuelle sanity: opret fase?workstream?milep�l?leverance og persister.
  - Accept: Administrator/Projektleder kan fuldt redigere planen; sejr-scenarie og fejlscenarier (API-fejl) h�ndteres med toasts.
  - PRD: ?.2 Visualisering & rapportering, ? UX (ensartet Tailwind-styling).
  - Status 24/11: Ny `/plan`-fane med MilestonePlan-komponent, modaler for workstream/fase/milep?l/leverance, `readOnly`-tilstand og lucide-ikoner er ude; flowet er bundet til `projectActions` med toasts for fejl/succes.
  - Afh�ngigheder: MP-001 backend, FE-005 Tailwind, eksisterende projektlayout.

- [ ] MP-003: Read-only integration p� rapporter og migrationscutover
  - Form�l: Erstatte den gamle tidslinje p� rapportsiden med `MilestonePlan` i `readOnly`, s� rapporter altid afspejler den nye plan uden redigering.
  - �ndringer: Import�r `MilestonePlan` i rapportsiden, pass�r `readOnly` og skjul alle CTA�er, koble/uploade draft-logik eller disable �Gem tidslinje�; tilf�j datakonverteringsscript for legacy timeline-felter.
  - Test (TDD): `npm run lint`, `npm run test`, targeted RTL-test for rapportsiden + manuel regression (skift rapport, verific�r at planen matcher fanen og kan ikke redigeres).
  - Accept: Rapportvisning viser korrekt timelineudsnit uden redigeringsmuligheder; konverterede projekter mister ikke historiske data.
  - PRD: ?.1 Kernerapportering, ? Stabilitet & dataintegritet.
  - Afh�ngigheder: MP-001, MP-002, eksisterende rapport-draftflow.





## Fase P15 ? Projektrapporter (refaktor til 3-lag + hooks)

- [x] RP-001: Kortlæg rapportflow og domæne-typer
  - Formål: Få et fuldt overblik over rapportdata (timeline/deliverables, risici, kanban, statusfelter, snapshots) før vi refaktorerer.
  - Ændringer: Dokumentér alle felter og kald i `ProjectReportsPage.tsx`, skitser domænemodeller (Report, Phase, Milestone, Deliverable, Risk, KanbanTask, StatusCard) og endpoints, definér acceptance for hvert modul (timeline, risk, kanban, statuskort, rapport-CRUD).
  - Test (TDD): Ingen kode endnu; lever en tjekliste/diagram der bruges som acceptance for RP-002..004.
  - Accept: Samlet notat/diagram over dataflow + acceptance-kriterier for hver sektion; identificer eksisterende afhængigheder til `projectActions`/workspace.
  - Status 24/11: Mapping documented in docs/rp-001-report-refactor.md (dataflow + acceptance for RP-002..004).
  - Afhængigheder: Ingen.

- [x] RP-002: Backend ruter, validatorer og services for rapporter (AGENTS.md)
  - Formål: Flytte rapport-CRUD og sektioner til 3-lags arkitektur (Controller -> Service -> Repository) med Zod-validering og permissions.
  - Ændringer: Nye ruter `backend/routes/reports.js` (list/detail/create/update/delete), Zod-schemas i `backend/validators/reportSchemas.js`, service `reportService` med adgangskontrol/orkestrering, repo-filer (fx `reportRepository.js`/`reportSnapshotRepository.js`) med SQL kun; midlertidig feature-flag for legacy endpoints. Udgangspunkt: mapping/acceptance fra `docs/rp-001-report-refactor.md`.
  - Test (TDD):
    1) Supertest: GET liste/detail 200, POST/PATCH/DELETE 200/400/403.
    2) Repo-unit-tests: insert/update timeline/deliverables/risici/kanban + rollback-scenarier.
    3) Service-tests: permissions + transaktioner (mock repo).
  - Accept: Ingen services med direkte SQL; alle payloads valideres med Zod; endpoints returnerer typed data og fejler korrekt på 400/403.
  - Status 24/11: RP-002 gennemført med dokumenterede Supertest-scenarier og `npm test --prefix backend` → 19 filer/79 tests grønt (se den lokale log).
  - Afhængigheder: RP-001, ST-002 (config/validering), BE-007 (routerstruktur).

- [x] RP-003: Frontend API-klient og domænehooks for rapporter
  - Formål: Erstatte direkte workspace-mutationer med typed API-lag og React Query hooks.
  - Ændringer: Opret `src/api/report.ts` med Zod-parsere for list/detail + sektion-mutationer (timeline, risici, kanban, statusfelter) med udgangspunkt i `docs/rp-001-report-refactor.md` og RP-002-endpoints; nye hooks `useProjectReports`, `useReportDetail`, `useReportTimelineMutation`, `useReportRiskMatrix`, `useReportKanban`, `useReportStatusCards` (React Query + toasts).
  - Test (TDD):
    1) Zod-parser tests for responses og fejl.
    2) Hook-tests (Vitest/RTL/MSW): fetch success/error, optimistic update + rollback for timeline/kanban, error-toasts.
  - Accept: Hooks eksponerer typed data/mutationer; fejl giver toasts; ingen komponenter taler direkte til fetch/`projectActions`.
  - Status 25/11: RP-003 gennemført; API-klient/hooks + tests grønne (Vitest + tsc/vite build) med normaliseret ProjectState/risk-parsing.
  - Afhængigheder: RP-001 (mapping), RP-002 (API-kontrakt), DX-002 (React Query), ST-005 (strict TS).

- [x] RP-004: Opdel ProjectReportsPage i paneler og brug nye hooks
  - Formål: Fjerne spaghetti og gå til ren komponentstruktur med props-baseret rendering.
  - Ændringer: Split i `ReportPageShell`, `ReportHeader`, `ReportTimelinePanel`, `ReportRiskPanel`, `ReportKanbanPanel`, `ReportStatusCards`, `ReportWeekSelector`; hver bruger hooks fra RP-003; fjern legacy `projectActions`-koblinger for rapporter; introducer evt. feature-flag til cutover. Udgangspunkt: domænemapping i `docs/rp-001-report-refactor.md` og RP-002/003-typer.
  - Test (TDD):
    1) RTL: hvert panel render + interaktion (valg af uge, add/edit timeline, select risk, kanban toggle/inspektør).
    2) Integration: render samlet side med mocked hooks, verificer toasts og state-udveksling.
    3) `npm run lint` + `npm run test` + manuelt sanity (load rapport, opdater timeline/risiko/kanban).
  - Accept: Projekt-rapportside er opdelt i mindre komponenter uden direkte API-kald; hooks driver data; UI bevarer eksisterende funktionalitet eller bedre.
  - Afhængigheder: RP-001 (mapping), RP-002, RP-003.


## Fase P16 – 3-lags oprydning (legacy)

- [x] LEG-001: Flyt project_risks (riskService) til repo + zod
  - Formål: Fjerne direkte SQL i `backend/services/risk/riskService.js`.
  - Ændringer: Nyt repository for `project_risks` + history; service kun orkestrering/validering; zod-validators for CRUD-ruter.
  - Test (TDD): Unit-tests for repo (insert/update/archive), service-mock-tests for permissions/validation, Supertest for ruter.
  - Afhængigheder: ST-002 (config/validering).

- [ ] LEG-002: Refaktorér timeEntriesService til repo-lag
  - Formål: Eliminere `client.query` i `backend/services/projects/timeEntriesService.js`.
  - Ændringer: Nyt repository for time entries; service bruger repo + zod; håndtér lead lookup via repo.
  - Test (TDD): Repo-tests (CRUD + conflicts), service-tests (validation/edge-cases), API-test for tidsregistrering.
  - Afhængigheder: ST-002.

- [ ] LEG-003: Udskille projectMembers/Workspace til repos
  - Formål: Slanke `workspaceService` og `projectMembersService` (fjerner direkte SQL).
  - Ændringer: Repos for projekter, medlemmer, time entries; service-lag kun orchestration/validering; opdater relaterede controller-tests.
  - Test (TDD): Repo-tests (create/update/delete), service-tests (transaktioner/permissions), workspace-route Supertest.
  - Afhængigheder: LEG-002 (time entries repo kan genbruges).

- [ ] LEG-004: Auth/Setup repos (users/employees)
  - Formål: Flytte direkte queries ud af `authService` og `setupService`.
  - Ændringer: Repos for users/employees bootstrap; zod-validering på payloads; service orkestrerer hashing/creation.
  - Test (TDD): Repo-tests (unik email), service-tests (hash, duplicate handling), API-tests for setup.
  - Afhængigheder: ST-002.

- [ ] LEG-005: Flyt projekt-opdateringer ud af workspaceService (dato-hygiejne)
  - Formål: Undgå dato-forskydninger og blandet ansvar ved at lade projekt-API’et (controller/service/repo) stå for alle projekt-skriveoperationer.
  - Ændringer: Fjern/feature-flag projekt-persistens fra `workspaceService` sync; sørg for at frontend bruger projekt-API til status/dato/goal/budget osv.; behold kun read i workspace-load. Normalisér datoer til `YYYY-MM-DD` begge veje.
  - Test (TDD): API-tests for projekt-CRUD (status/dato/budget) med timezone-sensitive datoer; end-to-end workspace load uden at mutere projekter; regressionstest for “skift status ændrer ikke start/slutdato”.
  - Afhængigheder: LEG-002/003 (projektrepo/relationer), AGENTS.md 3-lags krav.












