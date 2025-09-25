-- backend/setup-db.sql
-- Titel: Installation af DB til Projektværktøj
-- Kør med fx:
--   psql -U myuser -d projekt-tool -a -f setup-db.sql

\set ON_ERROR_STOP on

BEGIN;

-- Udvidelser
-- uuid-ossp bruges til uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ryd op i eksisterende objekter (i korrekt rækkefølge)
DROP TRIGGER IF EXISTS set_timestamp ON workspaces;
DROP FUNCTION IF EXISTS trigger_set_timestamp();
DROP TABLE IF EXISTS workspaces;
DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS user_role;

-- ENUM til roller
CREATE TYPE user_role AS ENUM ('Administrator', 'Projektleder', 'Teammedlem');

-- Brugertabel
CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name          VARCHAR(255)       NOT NULL,
    email         VARCHAR(255)       NOT NULL,
    password_hash VARCHAR(255)       NOT NULL,
    role          user_role          NOT NULL DEFAULT 'Teammedlem',
    created_at    TIMESTAMPTZ        NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Stores user accounts and authentication information.';

-- Gør emails unikke case-insensitivt (lower(email))
CREATE UNIQUE INDEX users_email_unique_ci ON users (LOWER(email));

-- Workspace pr. bruger (1-til-1)
CREATE TABLE workspaces (
    id         SERIAL PRIMARY KEY,
    user_id    UUID UNIQUE NOT NULL,
    data       JSONB       NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT fk_user
        FOREIGN KEY (user_id)
        REFERENCES users (id)
        ON DELETE CASCADE
);

COMMENT ON TABLE workspaces IS 'Stores the main application data (projects, employees) for each user.';

-- Trigger til auto-opdatering af updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp
BEFORE UPDATE ON workspaces
FOR EACH ROW
EXECUTE PROCEDURE trigger_set_timestamp();

-- Seed standardbrugere
-- Begge har adgangskoden 'password' (bcrypt, cost=10)
INSERT INTO users (name, email, password_hash, role) VALUES
  ('Admin User',        'admin@example.com',      '$2a$10$fPL029s57pBf02a6WT2sN.Mf3Ucb0SSc1yVF.08s6tSy285v/O6vW', 'Administrator'),
  ('Demo Projektleder', 'projektleder@sano.dk',   '$2a$10$fPL029s57pBf02a6WT2sN.Mf3Ucb0SSc1yVF.08s6tSy285v/O6vW', 'Projektleder');

COMMIT;

\echo '---------------------------------------------'
\echo 'Databaseopsætning fuldført.'
\echo 'Standardbrugere oprettet:'
\echo '- admin@example.com (Administrator)'
\echo '- projektleder@sano.dk (Projektleder)'
\echo 'Adgangskoden for begge er: password'
\echo '---------------------------------------------'
