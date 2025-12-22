export const existsById = async (client, projectId) => {
  const result = await client.query(
    'SELECT 1 FROM projects WHERE id = $1::uuid',
    [projectId],
  );
  return result.rowCount > 0;
};

export const create = async (client, project) => {
  const {
    id,
    name,
    startDate,
    endDate,
    status,
    description,
    projectGoal,
    businessCase,
    totalBudget,
    heroImageUrl,
    workspaceId,
  } = project;

  const { rows } = await client.query(
    `
      INSERT INTO projects (id, name, start_date, end_date, status, description, project_goal, business_case, total_budget, hero_image_url, workspace_id)
      VALUES ($1::uuid, $2, $3::date, $4::date, $5, $6, $7, $8, $9, $10, $11::uuid)
      RETURNING id::text
    `,
    [id, name, startDate, endDate, status, description, projectGoal, businessCase, totalBudget, heroImageUrl, workspaceId],
  );
  return rows[0] ?? null;
};

export const findByIdForUpdate = async (client, projectId) => {
  const result = await client.query(
    `
      SELECT name, start_date, end_date, status, description, project_goal, business_case, total_budget, hero_image_url
      FROM projects
      WHERE id = $1::uuid
      LIMIT 1
    `,
    [projectId],
  );
  return result.rows[0] ?? null;
};

export const update = async (client, project) => {
  const {
    projectId,
    name,
    startDate,
    endDate,
    status,
    description,
    projectGoal,
    businessCase,
    totalBudget,
    heroImageUrl,
  } = project;

  const result = await client.query(
    `
      UPDATE projects
      SET name = $1,
          start_date = $2::date,
          end_date = $3::date,
          status = $4,
          description = $5,
          project_goal = $6,
          business_case = $7,
          total_budget = $8,
          hero_image_url = $9
      WHERE id = $10::uuid
      RETURNING id::text
    `,
    [name, startDate, endDate, status, description, projectGoal, businessCase, totalBudget, heroImageUrl, projectId],
  );

  return result.rows[0] ?? null;
};

export const deleteById = async (client, projectId) => {
  const result = await client.query('DELETE FROM projects WHERE id = $1::uuid', [projectId]);
  return result.rowCount > 0;
};

export const isProjectLead = async (client, projectId, employeeId) => {
  const result = await client.query(
    `
      SELECT 1
      FROM project_members
      WHERE project_id = $1::uuid AND employee_id = $2::uuid AND is_project_lead = true
      LIMIT 1
    `,
    [projectId, employeeId],
  );
  return result.rowCount > 0;
};

export const addProjectLeadMember = async (client, { id, projectId, employeeId }) => {
  await client.query(
    `
      INSERT INTO project_members (id, project_id, employee_id, role, member_group, is_project_lead)
      VALUES ($1::uuid, $2::uuid, $3::uuid, 'Projektleder', 'projektgruppe', true)
      ON CONFLICT DO NOTHING
    `,
    [id, projectId, employeeId],
  );
};
