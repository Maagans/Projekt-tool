# Projektvaerktoej Backend

Node.js/Express API med PostgreSQL til projektvaerktoej-appen.

## Forudsaetninger
- Node.js 18 eller nyere
- PostgreSQL 14 eller nyere (server-adgang med en bruger der maa oprette tabeller)

## Installation
1. Installer dependencies:
   ```bash
   npm install
   ```
2. Kopier `.env.example` til `.env` og opdater variablerne:
   - `DATABASE_URL` skal pege paa din PostgreSQL database.
   - `JWT_SECRET` skal vaere en lang tilfaeldig streng (se eksempel i filen).
   - `PORT` er valgfri (standard er 3001).
   - `CORS_ORIGIN` er valgfri komma-separeret liste af tilladte origins (standard `http://localhost:5173` i udvikling).
   - `PG_BACKUP_DIR` er valgfri og styrer hvor backups gemmes (standard `backups`).

## Database migrationer
Projektet bruger [node-pg-migrate](https://salsita.github.io/node-pg-migrate/) til schema-opdateringer. Alle SQL-aendringer ligger i `backend/migrations`.

### Koer alle pending migrationer
```bash
npm run migrate
```
CLI'en bruger `DATABASE_URL` fra `.env`.

### Vise status
```bash
npm run migrate:status
```

### Rulle seneste migration tilbage (brug kun til fejlretning)
```bash
npm run migrate:down
```

### Opret en ny migration
```bash
npm run migrate:create -- add-new-table
```
Dette genererer en tom fil i `backend/migrations`. Udfyld `exports.up` og `exports.down`. Koer `npm run migrate` lokalt og skriv eventuelle data-migrationer (INSERT/UPDATE) i samme fil. Alle filer skal vaere idempotente og reversible hvor det er muligt.

## Seed af administrator
Scriptet `npm run seed:admin` opretter eller opdaterer en administrator-bruger sammen med en tilhoerende medarbejder.

### Hurtig brug uden at gemme kodeord i .env
```bash
ADMIN_NAME='Din Admin' \
ADMIN_EMAIL='admin@example.com' \
ADMIN_PASSWORD='midlertidig-kode' \
npm run seed:admin
```
- Scriptet opdaterer eksisterende bruger hvis e-mailen findes.
- Hvis du saetter `ADMIN_FORCE_RESET=false`, bevares eksisterende kodeord.

### Brug af .env (fx i testmiljo)
Tilfoej felterne i `.env` og koer derefter `npm run seed:admin`. Fjern kodeordet igen efter brug, hvis filen deles.

## Backup af database
- Koer `npm run backup` for at gemme en dump-fil (format=custom) via `pg_dump`.
- Backups gemmes i `backend/backups` eller den sti du angiver i `PG_BACKUP_DIR`.
- Krav: `pg_dump` fra PostgreSQL klientvaerktoeer skal vaere installeret og paa PATH.

## Lokal udvikling
- Start backend med auto-reload: `npm run dev`.
- Start backend til produktionstest: `npm start` (forventer at migrationerne allerede er koert).

## Arbejdsgang til produktion
1. Tag backup af databasen.
2. Deploy ny kode (fx via git pull eller CI).
3. Koer `npm install --omit=dev` (eller tilsvarende) hvis dependencies er aendret.
4. Koer `npm run migrate` mod produktionsdatabasen.
5. Seed eller opdater admin efter behov: `npm run seed:admin`.
6. Koer `npm run backup` hvis du vil tage en frisk dump efter migrationerne.
7. Genstart processen/service der koerer backend (pm2/systemd/docker osv.).
8. Overvaag logs og koer `npm run migrate:status` for at bekraefte at alt er opdateret.

## Bedste praksis for fremtidige aendringer
- Alle database-aendringer skal ske via nye migrationsfiler.
- Beskriv nye migrations i CHANGELOG eller i pull request beskrivelsen.
- Hold migrationer saa smaa og afproevede som muligt (skriv tests/skripter til data rettelser).
- Brug `migrate:status` som en del af smoke-tests efter deployment.

## Legacy setup-db.sql
Filen `setup-db.sql` findes stadig til reference, men den er afloest af migrationssystemet og boer ikke bruges i nye miljoer.

