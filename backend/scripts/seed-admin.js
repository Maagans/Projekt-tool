import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const { Pool } = pg;

const normalize = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeEmail = (value) => normalize(value).toLowerCase();

async function main() {
  const { DATABASE_URL, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FORCE_RESET } = process.env;

  if (!DATABASE_URL) {
    console.error('DATABASE_URL mangler. Angiv forbindelse til databasen.');
    process.exit(1);
  }

  const adminName = normalize(ADMIN_NAME);
  const adminEmailRaw = normalize(ADMIN_EMAIL);
  const adminEmail = normalizeEmail(ADMIN_EMAIL);
  const adminPassword = normalize(ADMIN_PASSWORD);

  if (!adminName) {
    console.error('ADMIN_NAME mangler.');
    process.exit(1);
  }
  if (!adminEmail) {
    console.error('ADMIN_EMAIL mangler.');
    process.exit(1);
  }
  if (adminPassword.length < 6) {
    console.error('ADMIN_PASSWORD skal vaere mindst 6 tegn.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: DATABASE_URL });
  const client = await pool.connect();

  const forceReset = String(ADMIN_FORCE_RESET ?? 'true').toLowerCase() !== 'false';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  try {
    await client.query('BEGIN');

    const employeeLookup = await client.query(
      'SELECT id, name FROM employees WHERE LOWER(email) = LOWER($1)',
      [adminEmail],
    );

    let employeeId;
    if (employeeLookup.rowCount > 0) {
      employeeId = employeeLookup.rows[0].id;
      await client.query(
        'UPDATE employees SET name = $1, email = $2 WHERE id = $3',
        [adminName, adminEmailRaw || adminEmail, employeeId],
      );
    } else {
      const insertEmployee = await client.query(
        'INSERT INTO employees (name, email) VALUES ($1, $2) RETURNING id',
        [adminName, adminEmailRaw || adminEmail],
      );
      employeeId = insertEmployee.rows[0].id;
    }

    const userLookup = await client.query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [adminEmail],
    );

    if (userLookup.rowCount > 0) {
      const params = [adminName, adminEmail, 'Administrator', employeeId, userLookup.rows[0].id];
      let query = 'UPDATE users SET name = $1, email = $2, role = $3, employee_id = $4';
      if (forceReset) {
        query += ', password_hash = $5 WHERE id = $6';
        params.splice(4, 0, passwordHash);
      } else {
        query += ' WHERE id = $5';
      }
      await client.query(query, params);
      console.log('Administrator-bruger opdateret.');
    } else {
      await client.query(
        'INSERT INTO users (name, email, password_hash, role, employee_id) VALUES ($1, $2, $3, $4, $5)',
        [adminName, adminEmail, passwordHash, 'Administrator', employeeId],
      );
      console.log('Administrator-bruger oprettet.');
    }

    await client.query('COMMIT');
    console.log('Admin-seed gennemfoert for', adminEmail);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Kunne ikke oprette/opdatere administrator:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error('Uventet fejl:', error.message);
  process.exit(1);
});
