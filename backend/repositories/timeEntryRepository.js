export const findMemberById = async (client, memberId) => {
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
    `,
    [memberId],
  );

  return rows[0] ?? null;
};

export const isProjectLeadForEmployee = async (client, projectId, employeeId) => {
  if (!employeeId) return false;
  const result = await client.query(
    `
      SELECT 1
      FROM project_members
      WHERE project_id = $1::uuid
        AND employee_id = $2::uuid
        AND is_project_lead = true
      LIMIT 1
    `,
    [projectId, employeeId],
  );
  return result.rowCount > 0;
};

export const getTimeEntryForWeek = async (client, memberId, weekKey) => {
  const { rows } = await client.query(
    `
      SELECT
        planned_hours::float AS "plannedHours",
        actual_hours::float AS "actualHours"
      FROM project_member_time_entries
      WHERE project_member_id = $1::uuid
        AND week_key = $2
      LIMIT 1
    `,
    [memberId, weekKey],
  );

  return rows[0] ?? null;
};

export const upsertTimeEntry = async (client, { memberId, weekKey, plannedHours, actualHours }) => {
  await client.query(
    `
      INSERT INTO project_member_time_entries (project_member_id, week_key, planned_hours, actual_hours)
      VALUES ($1::uuid, $2, $3, $4)
      ON CONFLICT (project_member_id, week_key)
      DO UPDATE SET planned_hours = EXCLUDED.planned_hours, actual_hours = EXCLUDED.actual_hours
    `,
    [memberId, weekKey, plannedHours, actualHours],
  );
};

export const listTimeEntriesForMember = async (client, memberId) => {
  const { rows } = await client.query(
    `
      SELECT
        week_key AS "weekKey",
        planned_hours::float AS "plannedHours",
        actual_hours::float AS "actualHours"
      FROM project_member_time_entries
      WHERE project_member_id = $1::uuid
      ORDER BY week_key ASC
    `,
    [memberId],
  );

  return rows.map((row) => ({
    weekKey: row.weekKey,
    plannedHours: Number(row.plannedHours ?? 0),
    actualHours: Number(row.actualHours ?? 0),
  }));
};
