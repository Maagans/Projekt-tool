# Risikoanalyse QA & UAT Playbook

Denne note samler de vigtigste verificeringer for RISK-006/007 før go-live. Dokumentet dækker automatiske checks, manuel smoke-test og et kort UAT-script til PMO/Projektledere.

## 1. Automatiske checks

| Script | Beskrivelse |
| --- | --- |
| `npm run test -- ProjectRiskMatrix` | Sikrer at den nye matrix-komponent kan rendere risici, håndtere valg/drag og vise arkiveringsbadges. |
| `npm run test --prefix backend -- --run tests/services/reportRiskSnapshotService.test.js` | Verificerer snapshot-service (attach og opdatering af probability/impact). |
| `npm run test --prefix backend -- --run tests/api/reportRiskRoutes.test.js` | Supertest-suiter for `POST` og `PATCH /api/reports/:id/risks` inkl. flag/validering/CSRF. |

> **Note:** Kør disse scripts inden UAT for at fange regressions tidligt.

## 2. Manuel smoke-test

1. **Kurateret risiko**
   - Gå til `Projekter → {projekt} → Risikovurdering`.
   - Opret en ny risiko med Plan A/B, kategori og ansvarlig.
   - Bekræft at risikoen vises i listen og kan redigeres uden fejl.

2. **Drag i projekttab**
   - Vælg risiko i matrixen og træk til ny celle.
   - Kontroller at sandsynlighed/konsekvens badges opdateres, og at ændringen består efter refresh.

3. **Synkroniser til rapport**
   - Skift til fanen “Rapporter”, vælg aktuel uge og åbne risikovælgeren.
   - Tilføj den kuraterede risiko → matrixen skal vise snapshot-badges.

4. **Drag i rapport**
   - Træk snapshot-cirklen til en ny S/K.
   - Bekræft at cirklen forbliver i den nye celle efter reload (PATCH kaldes, score badge ændres).

5. **Arkivering**
   - Arkivér risikoen fra risikotab og synkroniser igen.
   - Rapportmatrixen skal vise “Arkiveret siden …”-badge.

## 3. UAT-script (PMO/Projektleder)

| Step | Hvad skal bekræftes? | Resultat |
| --- | --- | --- |
| 1 | Kan oprette/ændre risiko inkl. Plan A/B og ansvarlig | ☐ |
| 2 | Drag/drop i projekttab gemmes og deles korrekt | ☐ |
| 3 | Synkronisering til rapport fungerer og viser detaljer | ☐ |
| 4 | Drag/drop i rapportmatrix gemmes uden refresh | ☐ |
| 5 | Arkiveret risiko markeres korrekt i rapporter | ☐ |

Når alle felter er markeret “OK”, kan RISK-007 sign-off dokumenteres i CHANGELOG/Release notes.
