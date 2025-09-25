# Projektværktøj Backend

This directory contains the Node.js, Express, and PostgreSQL backend for the project management tool.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [PostgreSQL](https://www.postgresql.org/download/) installed and running.

## Setup Instructions

### 1. Install Dependencies

Navigate to this directory in your terminal and run:

```bash
npm install
```

### 2. Set up the Database

This project uses PostgreSQL for data storage.

1.  **Create a database and user:**
    First, you need to create a PostgreSQL database and a user with privileges on that database. You can do this by running the following commands in your `psql` shell:

    ```sql
    -- Replace 'myuser' and 'mypassword' with your desired username and a secure password.
    CREATE USER myuser WITH PASSWORD 'mypassword';

    -- Replace 'projekt-tool' with your desired database name.
    CREATE DATABASE "projekt-tool" WITH OWNER = myuser;
    ```

2.  **Run the Setup Script:**
    A setup script named `setup-db.sql` is included in this `backend` directory. This script will create the necessary tables (`users`, `workspaces`) with the correct structure.

    Run the script against your database using a command like this in your terminal. Remember to replace `myuser` and `projekt-tool` with your actual username and database name:

    ```bash
    psql -U myuser -d projekt-tool -a -f setup-db.sql
    ```
    
    After running the script, the database will be ready but **empty**.

### 3. Configure Environment Variables

1.  Create a new file named `.env` in this `backend` directory.
2.  Add the `DATABASE_URL` and `JWT_SECRET` variables.
    -   **Update `DATABASE_URL`**: Make sure the connection string matches your PostgreSQL setup.
        -   Format: `postgresql://[user]:[password]@[host]:[port]/[database]`
        -   Example: `DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/projekt-tool"`
    -   **Update `JWT_SECRET`**: Replace the placeholder with a long, random, and secret string. You can generate a secure secret by running this command in your terminal:
        ```bash
        node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
        ```

### 4. Run the Server and Complete Setup

1.  **Start the backend server**:
    For development (recommended), this will use `nodemon` to automatically restart the server when you make changes.
    ```bash
    npm run dev
    ```
    For production:
    ```bash
    npm start
    ```
    The server will start on `http://localhost:3001`.

2.  **Start the frontend application** (from the root directory):
    ```bash
    npm run dev
    ```

3.  **Create the First User**:
    When you open the application in your browser for the first time, it will detect that the database is empty and present you with a **setup page**. Use this page to create your first administrator account. After that, you will be redirected to the normal login page.
