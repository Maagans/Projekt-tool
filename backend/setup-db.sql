-- backend/setup-db.sql
-- Titel: Installation af DB til Projektværktøj (relationsmodel)
-- Kør med fx:
--   psql -U myuser -d projekt-tool -a -f setup-db.sql

\set ON_ERROR_STOP on

\echo ''
\echo '---------------------------------------------'
\echo 'Administratoropsætning'
\echo 'Angiv oplysninger til den første administrator-konto.'
\prompt 'Administrator navn: ' admin_name
SELECT trim(:'admin_name') AS admin_name_trimmed \gset
\if :'admin_name_trimmed' = ''
  \echo 'Navn kan ikke være tomt. Afbryder.'
  \quit 1
\endif
\prompt 'Administrator e-mail: ' admin_email
SELECT trim(:'admin_email') AS admin_email_trimmed \gset
\if :'admin_email_trimmed' = ''
  \echo 'E-mail kan ikke være tom. Afbryder.'
  \quit 1
\endif
\prompt 'Administrator adgangskode (mindst 6 tegn): ' admin_password
\if :admin_password = ''
  \echo 'Adgangskode kan ikke være tom. Afbryder.'
  \quit 1
\endif
SELECT length(:'admin_password') AS admin_password_length \gset
\if :admin_password_length < 6
  \echo 'Adgangskoden skal være mindst 6 tegn. Afbryder.'
  \quit 1
\endif
\echo 'Tak. Adgangskoden bliver automatisk hashet før den gemmes.'
\echo '---------------------------------------------'

BEGIN;

-- Udvidelser
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Ryd op i gamle objekter
DROP TABLE IF EXISTS report_kanban_tasks CASCADE;
DROP TABLE IF EXISTS report_deliverables CASCADE;
DROP TABLE IF EXISTS report_milestones CASCADE;
DROP TABLE IF EXISTS report_phases CASCADE;
DROP TABLE IF EXISTS report_risks CASCADE;
DROP TABLE IF EXISTS report_main_table_rows CASCADE;
DROP TABLE IF EXISTS report_challenge_items CASCADE;
DROP TABLE IF EXISTS report_status_items CASCADE;
DROP TABLE IF EXISTS project_member_time_entries CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TYPE IF EXISTS user_role;

-- ENUM til roller
CREATE TYPE user_role AS ENUM ('Administrator', 'Projektleder', 'Teammedlem');

-- Master data
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    location TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_project_dates CHECK (start_date <= end_date),
    CONSTRAINT chk_project_status CHECK (status IN ('active', 'completed', 'on-hold'))
);

CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    member_group TEXT NOT NULL DEFAULT 'unassigned',
    is_project_lead BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_member_group CHECK (member_group IN ('styregruppe','projektgruppe','partnere','referencegruppe','unassigned')),
    UNIQUE (project_id, employee_id)
);


CREATE TABLE project_member_time_entries (
    project_member_id UUID NOT NULL REFERENCES project_members(id) ON DELETE CASCADE,
    week_key VARCHAR(10) NOT NULL,
    planned_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
    actual_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
    CONSTRAINT chk_non_negative_hours CHECK (planned_hours >= 0 AND actual_hours >= 0),
    PRIMARY KEY (project_member_id, week_key)
);


CREATE TABLE reports (
    id BIGSERIAL PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    week_key VARCHAR(10) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (project_id, week_key)
);

CREATE INDEX idx_reports_project_id ON reports(project_id);

CREATE TABLE report_status_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id BIGINT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    content TEXT NOT NULL
);


CREATE TABLE report_challenge_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id BIGINT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    content TEXT NOT NULL
);


CREATE TABLE report_main_table_rows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id BIGINT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    position INTEGER NOT NULL DEFAULT 0,
    title TEXT NOT NULL,
    status TEXT NOT NULL,
    note TEXT,
    CONSTRAINT chk_main_row_status CHECK (status IN ('green', 'yellow', 'red'))
);


CREATE TABLE report_risks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id BIGINT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    probability SMALLINT NOT NULL,
    consequence SMALLINT NOT NULL,
    CONSTRAINT chk_probability_range CHECK (probability BETWEEN 1 AND 5),
    CONSTRAINT chk_consequence_range CHECK (consequence BETWEEN 1 AND 5)
);


CREATE TABLE report_phases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id BIGINT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    start_percentage NUMERIC(5,2) NOT NULL,
    end_percentage NUMERIC(5,2) NOT NULL,
    highlight TEXT NOT NULL,
    CONSTRAINT chk_phase_range CHECK (start_percentage BETWEEN 0 AND 100 AND end_percentage BETWEEN 0 AND 100 AND start_percentage <= end_percentage)
);


CREATE TABLE report_milestones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id BIGINT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    position_percentage NUMERIC(5,2) NOT NULL,
    CONSTRAINT chk_milestone_range CHECK (position_percentage BETWEEN 0 AND 100)
);


CREATE TABLE report_deliverables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id BIGINT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    position_percentage NUMERIC(5,2) NOT NULL,
    CONSTRAINT chk_deliverable_range CHECK (position_percentage BETWEEN 0 AND 100)
);


CREATE TABLE report_kanban_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    report_id BIGINT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    status TEXT NOT NULL,
    CONSTRAINT chk_kanban_status CHECK (status IN ('todo', 'doing', 'done'))
);


-- Brugere
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL,
    employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_users_email_unique_ci ON users (LOWER(email));
CREATE UNIQUE INDEX idx_employees_email_unique_ci ON employees (LOWER(email));

-- Trigger til auto-opdatering af projects.updated_at
CREATE OR REPLACE FUNCTION trigger_set_project_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_projects_set_updated
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_project_timestamp();

-- Skab initial administrator som også oprettes som medarbejder
WITH new_employee AS (
    INSERT INTO employees (name, email)
    VALUES (:'admin_name_trimmed', :'admin_email_trimmed')
    RETURNING id
)
INSERT INTO users (name, email, password_hash, role, employee_id)
SELECT :'admin_name_trimmed', LOWER(:'admin_email_trimmed'), crypt(:'admin_password', gen_salt('bf')), 'Administrator', id
FROM new_employee;

COMMIT;

\echo '---------------------------------------------'
\echo 'Databaseopsætning fuldført.'
\echo 'Administrator oprettet:'
\echo '- ' :'admin_email_trimmed'
\echo 'Log ind med den angivne adgangskode.'
\echo '---------------------------------------------'


