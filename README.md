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
2. Create a database user and grant ownership of the project database (adjust names and passwords as needed):
   ```sql
   CREATE ROLE cs WITH LOGIN PASSWORD 'changeme';
   CREATE DATABASE "projekt-tool" OWNER cs;
   ```
   If you already have a user, grant it privileges on the database instead.
3. Create the database from the CLI if you did not do it in the SQL step:
   ```bash
   createdb -U cs projekt-tool
   ```
   _If `createdb` is unavailable, run `psql -U cs -c 'CREATE DATABASE "projekt-tool";'` instead._

## 3. Configure the backend
Create `backend/.env` with your database connection string and a JWT secret:
```env
DATABASE_URL=postgresql://cs:changeme@localhost:5432/projekt-tool
JWT_SECRET=replace_this_with_a_random_64_char_hex
CORS_ORIGIN=http://localhost:5173
```
Generate a strong JWT secret, for example:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
For production, set `CORS_ORIGIN` to a comma-separated list of allowed origins (e.g., your deployed frontend URLs).

## 4. Run database migrations
```bash
cd backend
npm run migrate
```
This creates the schema, constraints, and required extensions (`uuid-ossp`, `pgcrypto`) inside the configured database.

## 5. Seed the administrator account
```bash
cd backend
npm run seed:admin
```
The script prompts for admin name, email, and password if the corresponding `ADMIN_*` environment variables are missing.

## 6. Run the backend API
```bash
cd backend
npm run dev
```
The server listens on `http://localhost:3001` and exposes endpoints for authentication, project management, and time tracking.

## 7. Run the frontend
In a separate terminal, from the project root:
```bash
npm run dev
```
Vite serves the React client on `http://localhost:5173` by default and proxies API calls to the backend.
To target a different API endpoint, copy `.env.example` to `.env` and set `VITE_API_BASE_URL`.

## Roles and permissions
- **Administrator**: Full access. Can view and edit every project, manage users, and change settings.
- **Projektleder**: Can edit projects where they are marked as project lead and can view other projects in read-only mode.
- **Teammedlem**: Can view projects they are assigned to and log their own actual hours; planned hours remain read-only.

Use the administrator account you created during seeding to sign in first. From there you can invite or promote additional users via the admin panel.

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
5. Run migrations and seed an admin:
   ```bash
   cd backend
   npm run migrate
   npm run seed:admin
   ```
6. Start the backend (`npm run dev` in `backend/`) and the frontend (`npm run dev` in the root).

## Production Runbook
This runbook describes how to promote the application from local development to an organisation-hosted production environment (for example, a site such as `https://projects.example.com`). Use it as the baseline standard operating procedure for deployments and ongoing operations.

### Quick Start Overview (for project owners)
- Decide on the production web address you want (e.g., `https://projects.example.com`) and share it with your IT/hosting team.
- Hand over the latest project zip or GitHub link plus this README.
- Ask the IT team to follow the deployment steps below and confirm when the site is reachable over HTTPS.
- When you get the confirmation email, log in with the administrator account that was created during database setup and add the remaining users.

### 1. Architecture Overview
- **Frontend**: Vite/React bundle served as static assets behind an HTTPS reverse proxy (nginx/IIS/Apache).
- **Backend API**: Express/Node.js 18+ process running as a managed service (systemd/PM2/Windows Service).
- **Database**: PostgreSQL 13+ with `uuid-ossp` and `pgcrypto` extensions enabled.
- **Secrets**: Environment variables (`backend/.env`) stored in a secure secrets vault or encrypted configuration store.

### 2. Provisioning Checklist
- Server or container host with outbound internet access for npm installs and certificate renewal.
- DNS entry for the chosen production hostname pointing to the reverse proxy/public load balancer.
- TLS certificate (Let's Encrypt via ACME or organisation-issued) with automatic renewal scheduled.
- Hardened firewall rules: expose only HTTPS (443) and optionally HTTP (80) for ACME; keep PostgreSQL internal.
- System users or service accounts with least-privilege access to filesystem, database, and logs.

### 3. Deployment Steps
1. **Prepare host**
   - Install Node.js 18 LTS and npm.
   - Install PostgreSQL or connect to managed instance; create database and user.
2. **Clone & install**
   ```bash
   git clone https://github.com/Maagans/Projekt-tool.git /opt/projekt-tool
   cd /opt/projekt-tool
   npm install
   cd backend
   npm install
   ```
   _Run the four commands above inside the server's terminal (PowerShell on Windows or Bash on Linux/Mac). Run them one line at a time._

3. **Configure environment**
   - Copy `backend/.env.example` to `backend/.env` and set production values for `DATABASE_URL` and `JWT_SECRET`.
   - Run the database migrations once:
     ```bash
     cd backend
     npm run migrate
     ```
   - Seed the administrator account (either set `ADMIN_*` variables in `.env` or answer the prompts):
     ```bash
     npm run seed:admin
     ```
   - Record the administrator credentials for later logins.
4. **Build frontend**
   ```bash
   cd /opt/projekt-tool
   npm run build
   ```
   This creates production assets in `dist/`.
5. **Deploy backend**
   - Configure process manager (example systemd unit):
     ```ini
     [Unit]
     Description=Projekt Tool API
     After=network.target

     [Service]
     WorkingDirectory=/opt/projekt-tool/backend
     EnvironmentFile=/opt/projekt-tool/backend/.env
     ExecStart=/usr/bin/node index.js
     Restart=always
     User=www-data

     [Install]
     WantedBy=multi-user.target
     ```
   - Reload daemon (`systemctl daemon-reload`) and enable service (`systemctl enable --now projekt-tool`).
6. **Serve frontend**
   - Copy `dist/` contents to web root (e.g., `/var/www/projekt-tool`).
   - Configure reverse proxy to serve static files and proxy `/api` to `http://127.0.0.1:3001`.

### 4. Post-Deployment Verification
- Browse to the production URL over HTTPS; confirm assets load without console errors.
- Log in with the admin account created during bootstrap.
- Create a test project and ensure data persists in PostgreSQL.
- Review reverse proxy and API logs for warnings or 5xx responses.

### 5. Operations & Monitoring
- **Logging**: Ship backend logs to central logging (e.g., rsyslog, ELK, CloudWatch) with retention policy.
- **Metrics**: Monitor CPU, memory, disk, PostgreSQL connections, and HTTP response times.
- **Health checks**: Add `/health` endpoint (if desired) or use `/api/workspace` authentication flow for synthetic monitoring.
- **Alerts**: Create alerts for API downtime, high error rate, or low disk space.

### 6. Backup & Recovery
- Schedule nightly PostgreSQL dumps (`pg_dump`) and store securely with rotation (e.g., 7 daily, 4 weekly, 12 monthly).
- Document restoration test procedure: restore dump into staging, run migrations/setup, verify login + data.
- Backup `.env` (or secrets store) separately; never commit secrets to Git.

### 7. Security & Access Control
- Use HTTPS everywhere; redirect HTTP requests to HTTPS.
- Rotate `JWT_SECRET` periodically and on incident response.
- Restrict SSH/admin access via bastion/VPN; use MFA where possible.
- Limit database user to required privileges (`CREATE`, `INSERT`, `UPDATE`, `DELETE`, `SELECT`).
- Review admin accounts in the application quarterly; disable unused logins.

### 8. Maintenance Cadence
- **Monthly**: Apply OS/Node/PostgreSQL security patches, review logs.
- **Quarterly**: Update npm dependencies (`npm outdated`), test in staging, then deploy.
- **Annually**: Re-run disaster recovery drill, rotate TLS certificates if not automated.

### 9. Incident Response
- Maintain on-call contact list and escalation path.
- For critical outages: capture logs, restart services via process manager, communicate status to stakeholders.
- After resolution: perform root-cause analysis, document follow-up actions, and update this runbook if needed.

### 10. Change Management
- Use feature branches + pull requests; enforce reviews for production changes.
- Tag releases (e.g., `v1.0.0`) and record deployment date/time.
- Keep a CHANGELOG summarising user-facing updates and schema changes.

---
## Troubleshooting
- `FATAL: database "projekt-tool" does not exist`: Make sure you created the database before running `npm run migrate`.
- `Authentication failed: Token is invalid`: Clear your browser's local storage after resetting the database so the frontend requests a fresh session.
- Need to rebuild everything? Re-run `npm run migrate` followed by `npm run seed:admin`. A legacy `setup-db.sql` script still exists for special cases, but the migration workflow is the supported path.

Happy reporting!
