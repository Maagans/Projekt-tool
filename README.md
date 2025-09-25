# Project Status & Reporting Tool

A full-stack project and report management tool powered by a PostgreSQL relational database, an Express backend, and a Vite/React frontend. This guide walks through setting the system up from scratch on a local machine.

## Prerequisites
- Node.js 18+
- npm (bundled with Node.js)
- PostgreSQL 13 or newer
- `psql` command-line client available on your PATH

## 1. Install dependencies
```bash
# Frontend dependencies (run from the project root)
npm install

# Backend dependencies
cd backend
npm install
```

## 2. Prepare PostgreSQL
1. Ensure PostgreSQL is running and that you can connect with `psql`.
2. Create a database user and the target database (adjust names and passwords as needed):
   ```sql
   CREATE ROLE cs WITH LOGIN PASSWORD 'changeme';
   CREATE DATABASE "projekt-tool" OWNER cs;
   ```
3. From the `backend` directory, run the setup script. It prompts you for the first administrator's name, email, and password and then builds the entire schema:
   ```bash
   cd backend
   psql -U cs -d "projekt-tool" -a -f setup-db.sql
   ```
   - The script enables required extensions (`uuid-ossp`, `pgcrypto`), recreates all tables, links users to employees, and seeds only the administrator you provide.
   - Keep the credentials you enter — you will use them to log in to the app after start-up.

## 3. Configure the backend
Create `backend/.env` with your database connection string and a JWT secret:
```env
DATABASE_URL=postgresql://cs:changeme@localhost:5432/projekt-tool
JWT_SECRET=replace_this_with_a_random_64_char_hex
```
Generate a strong JWT secret, for example:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 4. Run the backend API
```bash
cd backend
npm run dev
```
The server listens on `http://localhost:3001` and exposes endpoints for authentication, project management, and time tracking.

## 5. Run the frontend
In a separate terminal, from the project root:
```bash
npm run dev
```
Vite serves the React client on `http://localhost:5173` by default and proxies API calls to the backend.

## Roles and permissions
- **Administrator**: Full access. Can view and edit every project, manage users, and change settings.
- **Projektleder**: Can edit projects where they are marked as project lead and can view other projects in read-only mode.
- **Teammedlem**: Can view projects they are assigned to and log their own actual hours; planned hours remain read-only.

Use the administrator account you created during the database setup to sign in first. From there you can invite or promote additional users via the admin panel.

## Sharing the project with others
If you need to hand the project to another developer, share a clean archive without bundled dependencies.

### Create the archive (PowerShell on Windows)
```powershell
# Run from the project root
tar.exe -acf projekt-tool-share.zip --exclude='node_modules' --exclude='*/node_modules' .
```
- The command relies on the built-in `tar` shipped with Windows 10/11.
- The resulting `projekt-tool-share.zip` contains everything except any `node_modules` folders.

### What the recipient must do
1. Unzip the archive.
2. Run `npm install` in the project root (frontend).
3. Run `npm install` inside `backend/`.
4. Copy `backend/.env.example` to `backend/.env` and update `DATABASE_URL` and `JWT_SECRET`.
5. Execute the database setup script from `backend/`:
   ```bash
   psql -U <db_user> -d <database> -a -f setup-db.sql
   ```
6. Start the backend (`npm run dev` in `backend/`) and the frontend (`npm run dev` in the root).

---
## Troubleshooting
- `FATAL: database "projekt-tool" does not exist`: Make sure you created the database before running `setup-db.sql`.
- `Authentication failed: Token is invalid`: Clear your browser's local storage after resetting the database so the frontend requests a fresh session.
- Re-run `psql -U cs -d "projekt-tool" -a -f setup-db.sql` whenever you need to rebuild the schema; it is safe to execute multiple times.

Happy reporting!
