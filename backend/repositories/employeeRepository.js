const EMPLOYEE_SELECT_FIELDS = `
  id::text,
  name,
  email,
  COALESCE(location, '') AS location,
  COALESCE(department, '') AS department,
  COALESCE(max_capacity_hours_week, 0)::float AS max_capacity_hours_week,
  azure_ad_id,
  job_title,
  account_enabled,
  synced_at
`;

export const getAll = async (client) => {
  const { rows } = await client.query(
    `
      SELECT ${EMPLOYEE_SELECT_FIELDS}
      FROM employees
      ORDER BY name ASC
    `,
  );
  return rows;
};

export const findById = async (client, employeeId) => {
  const result = await client.query(
    `
      SELECT ${EMPLOYEE_SELECT_FIELDS}
      FROM employees
      WHERE id = $1::uuid
      LIMIT 1
    `,
    [employeeId],
  );
  return result.rows[0] ?? null;
};

export const findByEmail = async (client, email) => {
  const result = await client.query(
    `
      SELECT ${EMPLOYEE_SELECT_FIELDS}
      FROM employees
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
    `,
    [email],
  );
  return result.rows[0] ?? null;
};

export const findByUserId = async (client, userId) => {
  const result = await client.query(
    `
      SELECT ${EMPLOYEE_SELECT_FIELDS}
      FROM employees
      WHERE id = (
        SELECT employee_id
        FROM users
        WHERE id = $1::uuid
      )
      LIMIT 1
    `,
    [userId],
  );
  return result.rows[0] ?? null;
};

export const create = async (client, employee) => {
  const {
    id,
    name,
    email,
    location,
    department,
    maxCapacityHoursWeek,
  } = employee;

  const { rows } = await client.query(
    `
      INSERT INTO employees (id, name, email, location, department, max_capacity_hours_week)
      VALUES ($1::uuid, $2, LOWER($3), NULLIF($4, ''), NULLIF($5, ''), $6::numeric)
      RETURNING ${EMPLOYEE_SELECT_FIELDS}
    `,
    [id, name, email, location ?? "", department ?? "", maxCapacityHoursWeek],
  );
  return rows[0] ?? null;
};

export const update = async (client, employeeId, setStatements, params) => {
  const { rows } = await client.query(
    `
      UPDATE employees
      SET ${setStatements.join(", ")}
      WHERE id = $${params.length + 1}::uuid
      RETURNING ${EMPLOYEE_SELECT_FIELDS}
    `,
    [...params, employeeId],
  );
  return rows[0] ?? null;
};

export const deleteById = async (client, employeeId) => {
  await client.query(`DELETE FROM project_members WHERE employee_id = $1::uuid`, [employeeId]);
  const result = await client.query(`DELETE FROM employees WHERE id = $1::uuid`, [employeeId]);
  return result.rowCount > 0;
};

export const linkUserToEmployee = async (client, userId, employeeId) => {
  await client.query(
    `
      UPDATE users
      SET employee_id = $1::uuid
      WHERE id = $2::uuid
    `,
    [employeeId, userId],
  );
};

export const findProjectsWhereLead = async (client, employeeId, targetEmployeeId) => {
  const result = await client.query(
    `
      SELECT 1
      FROM project_members target
      INNER JOIN project_members lead
        ON lead.project_id = target.project_id
      WHERE target.employee_id = $1::uuid
        AND lead.employee_id = $2::uuid
        AND lead.is_project_lead = true
      LIMIT 1
    `,
    [targetEmployeeId, employeeId],
  );
  return result.rowCount > 0;
};
