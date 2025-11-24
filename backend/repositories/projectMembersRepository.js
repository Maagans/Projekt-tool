export const listByProject = async (client, projectId) => {
  const { rows } = await client.query(
    `
      SELECT
        id::text,
        project_id::text,
        employee_id::text,
        role,
        member_group,
        is_project_lead
      FROM project_members
      WHERE project_id = $1::uuid
    `,
    [projectId],
  );
  return rows;
};

export const findById = async (client, memberId) => {
  const { rows } = await client.query(
    `
      SELECT
        id::text,
        project_id::text,
        employee_id::text,
        role,
        member_group,
        is_project_lead
      FROM project_members
      WHERE id = $1::uuid
      LIMIT 1
    `,
    [memberId],
  );
  return rows[0] ?? null;
};

export const existsForProjectEmployee = async (client, projectId, employeeId) => {
  const result = await client.query(
    `
      SELECT id::text
      FROM project_members
      WHERE project_id = $1::uuid AND employee_id = $2::uuid
      LIMIT 1
    `,
    [projectId, employeeId],
  );
  return result.rows[0] ?? null;
};

export const isLeadForProjectEmployee = async (client, projectId, employeeId) => {
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

export const insertMember = async (client, { id, projectId, employeeId, role, group, isProjectLead }) => {
  await client.query(
    `
      INSERT INTO project_members (id, project_id, employee_id, role, member_group, is_project_lead)
      VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5, $6)
      ON CONFLICT (id)
      DO UPDATE SET role = EXCLUDED.role, member_group = EXCLUDED.member_group, is_project_lead = EXCLUDED.is_project_lead
    `,
    [id, projectId, employeeId, role, group, isProjectLead],
  );
};

export const updateMember = async (client, { projectId, memberId, role, group, isProjectLead }) => {
  const result = await client.query(
    `
      UPDATE project_members
      SET role = COALESCE($1, role),
          member_group = COALESCE($2, member_group),
          is_project_lead = COALESCE($3, is_project_lead)
      WHERE id = $4::uuid AND project_id = $5::uuid
      RETURNING id::text
    `,
    [role, group, isProjectLead, memberId, projectId],
  );
  return result.rowCount > 0;
};

export const deleteMember = async (client, projectId, memberId) => {
  const result = await client.query(
    `DELETE FROM project_members WHERE id = $1::uuid AND project_id = $2::uuid`,
    [memberId, projectId],
  );
  return result.rowCount > 0;
};

export const deleteMissing = async (client, projectId, idsToKeep = []) => {
  if (!idsToKeep.length) {
    await client.query('DELETE FROM project_members WHERE project_id = $1::uuid', [projectId]);
    return;
  }
  await client.query(
    'DELETE FROM project_members WHERE project_id = $1::uuid AND id <> ALL($2::uuid[])',
    [projectId, idsToKeep],
  );
};
