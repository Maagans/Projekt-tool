# Hardeningplan – Produktionsklar Arkitektur

**Vigtigt:** Hele denne plan skal gennemføres, før vi starter på nye features (fx MP-001).

---

## Fase 1 – Project Service (højeste prioritet)
**Mål:** Refaktorer `projectService.js` til en ren 3-lags arkitektur.

- [X] **TASK-H1 – Project Repository**  
  - Opret `backend/repositories/projectRepository.js`.  
  - Flyt alle `client.query`-kald fra `projectService.js` til repoet.  
  - Implementér metoder: `create`, `update`, `delete`, `findById`, `checkProjectLead`.  
  - *Agent prompt:* “Extract all SQL queries from `projectService.js` into a new `projectRepository.js`. Keep the service logic intact but call the repo methods.”

- [X] **TASK-H2 – Zod til Projekter**  
  - Opret/udbyg `backend/validators/projectValidators.js`.  
  - Tilføj `createProjectSchema` og `updateProjectSchema`.  
  - Erstat `sanitizeProjectPayload` og `stripHtml` med `schema.parse(...)`.  
  - *Agent prompt:* “Replace manual sanitization in `projectService.js` with Zod schemas defined in `projectValidators.js`.”

- [X] **TASK-H3 – Rens Service**  
  - Fjern ubrugte imports/helperfunktioner i `projectService.js`.  
  - Brug `USER_ROLES`-konstanter i stedet for hardcodede strenge.

---

## Fase 2 – Medarbejdere & Auth (sikkerhed)

- [x] **TASK-H4 – Employee Repository**  
  - Samme proces som H1, men for `employeesService.js`.  
  - Kritisk, da rettighedsstyring bor her.

- [X] **TASK-H5 – Zod for Auth/Users**  
  - Valider login/register payloads med Zod i `authController.js` / `authService.js`.  
  - Beskyt API’et mod “bad data” helt fra indgangen.

---

## Fase 3 – Frontend Types (TypeScript Sync)

- [X] **TASK-H6 – Synkroniser Types**  
  - Opdater `src/types.ts`, så de matcher de nye Zod-schemas fra backend.  
  - Garanterer at frontend ikke sender data, som backend afviser.

---

## Definition of Done
- Ingen `client.query(...)` i service-filer.
- Ingen `stripHtml` eller regex-hacks i services.
- Alle endpoints validerer input med Zod.
- `npm test` passerer grønt.
