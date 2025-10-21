import bcrypt from 'bcryptjs';
import pg from 'pg';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { config } from '../config/index.js';

const { Pool } = pg;

const normalize = (value) => (typeof value === 'string' ? value.trim() : '');
const normalizeEmail = (value) => normalize(value).toLowerCase();

let rl;

const closePrompt = () => {
  if (rl) {
    rl.close();
    rl = undefined;
  }
};

const ensureInteractive = () => {
  if (!input.isTTY || !output.isTTY) {
    console.error(
      'Paakraevede ADMIN_* variabler mangler og kan ikke indtastes interaktivt (ingen TTY tilgaengelig).',
    );
    process.exit(1);
  }
  if (!rl) {
    rl = readline.createInterface({ input, output });
  }
  return rl;
};

const promptUntilValid = async (question, { validate, transform } = {}) => {
  const iface = ensureInteractive();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const answer = await iface.question(question);
    const trimmed = normalize(answer);
    const error = validate ? validate(trimmed, answer) : null;
    if (!error) {
      return transform ? transform(trimmed, answer) : trimmed;
    }
    console.log(error);
  }
};

async function resolveAdminValues(initialValues) {
  const values = { ...initialValues };
  const hasTTY = Boolean(input.isTTY && output.isTTY);

  if (!values.adminName) {
    if (!hasTTY) {
      console.error('ADMIN_NAME mangler.');
      process.exit(1);
    }
    values.adminName = await promptUntilValid('Administrator navn: ', {
      validate: (trimmed) => (trimmed ? null : 'Navnet maa ikke vaere tomt.'),
    });
  }

  if (!values.adminEmail) {
    if (!hasTTY) {
      console.error('ADMIN_EMAIL mangler.');
      process.exit(1);
    }
    const emailValues = await promptUntilValid('Administrator e-mail: ', {
      validate: (_, raw) => (normalizeEmail(raw) ? null : 'Indtast en gyldig e-mail.'),
      transform: (trimmed, raw) => ({
        raw: trimmed,
        normalized: normalizeEmail(raw),
      }),
    });
    values.adminEmailRaw = emailValues.raw;
    values.adminEmail = emailValues.normalized;
  }

  if (!values.adminPassword || values.adminPassword.length < 6) {
    if (!hasTTY) {
      console.error('ADMIN_PASSWORD skal vaere mindst 6 tegn.');
      process.exit(1);
    }
    values.adminPassword = await promptUntilValid('Administrator kodeord (min. 6 tegn): ', {
      validate: (trimmed) =>
        trimmed.length >= 6 ? null : 'Kodeordet skal vaere mindst 6 tegn.',
    });
  }

  if (!values.adminEmailRaw && values.adminEmail) {
    values.adminEmailRaw = values.adminEmail;
  }

  return values;
}

async function main() {
  const {
    databaseUrl,
    adminSeed: { name: adminNameEnv, email: adminEmailEnv, password: adminPasswordEnv, forceReset: adminForceResetEnv },
  } = config;

  if (!databaseUrl) {
    console.error('DATABASE_URL mangler. Angiv forbindelse til databasen.');
    process.exit(1);
  }

  const adminValues = await resolveAdminValues({
    adminName: normalize(adminNameEnv ?? ''),
    adminEmailRaw: normalize(adminEmailEnv ?? ''),
    adminEmail: normalizeEmail(adminEmailEnv ?? ''),
    adminPassword: normalize(adminPasswordEnv ?? ''),
  });

  closePrompt();

  const pool = new Pool({ connectionString: databaseUrl });
  let client;
  const { adminName, adminEmail, adminEmailRaw, adminPassword } = adminValues;
  const forceReset = adminForceResetEnv ?? true;
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  try {
    client = await pool.connect();
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
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Kunne ikke oprette/opdatere administrator:', error.message);
    process.exitCode = 1;
  } finally {
    closePrompt();
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

main().catch((error) => {
  closePrompt();
  console.error('Uventet fejl:', error.message);
  process.exit(1);
});

