export const ensureProjectExists = async (client, projectId) => {
    const result = await client.query(
        'SELECT id::text FROM projects WHERE id = $1::uuid LIMIT 1',
        [projectId],
    );
    return result.rowCount > 0;
};

export const isProjectMember = async (client, projectId, employeeId) => {
    const result = await client.query(
        `
          SELECT is_project_lead
          FROM project_members
          WHERE project_id = $1::uuid AND employee_id = $2::uuid
          LIMIT 1
        `,
        [projectId, employeeId],
    );
    if (result.rowCount === 0) {
        return { isMember: false, isLead: false };
    }
    const isLead = result.rows[0].is_project_lead === true;
    return { isMember: true, isLead };
};

export const fetchRiskById = async (client, riskId) => {
    const result = await client.query(
        `
          SELECT
            r.id::text AS id,
            r.project_id::text AS project_id,
            r.title,
            r.description,
            r.probability::int,
            r.impact::int,
            r.score::int,
            r.mitigation_plan_a,
            r.mitigation_plan_b,
            r.owner_id::text AS owner_id,
            e.name AS owner_name,
            e.email AS owner_email,
            r.follow_up_notes,
            r.follow_up_frequency,
            r.category,
            r.last_follow_up_at,
            r.due_date,
            r.status,
            r.is_archived,
            r.created_by::text AS created_by,
            r.updated_by::text AS updated_by,
            r.created_at,
            r.updated_at
          FROM project_risks r
          LEFT JOIN employees e ON e.id = r.owner_id
          WHERE r.id = $1::uuid
          LIMIT 1
        `,
        [riskId],
    );
    return result.rows[0] ?? null;
};

const buildListFilters = (projectId, filters = {}) => {
    const clauses = ["r.project_id = $1::uuid"];
    const params = [projectId];
    let index = 2;

    if (!filters.includeArchived) {
        clauses.push("r.is_archived = false");
    }

    if (filters.status) {
        clauses.push(`r.status = $${index++}`);
        params.push(filters.status);
    }

    if (filters.ownerId) {
        clauses.push(`r.owner_id = $${index++}::uuid`);
        params.push(filters.ownerId);
    }

    if (filters.category) {
        clauses.push(`r.category = $${index++}`);
        params.push(filters.category);
    }

    if (filters.overdue) {
        clauses.push("r.due_date IS NOT NULL AND r.due_date < CURRENT_DATE AND r.status <> 'closed'");
    }

    return { whereClause: clauses.join(" AND "), params };
};

export const listProjectRisks = async (client, { projectId, filters = {} }) => {
    const { whereClause, params } = buildListFilters(projectId, filters);
    const queryText = `
      SELECT
        r.id::text AS id,
        r.project_id::text AS project_id,
        r.title,
        r.description,
        r.probability::int,
        r.impact::int,
        r.score::int,
        r.mitigation_plan_a,
        r.mitigation_plan_b,
        r.owner_id::text AS owner_id,
        e.name AS owner_name,
        e.email AS owner_email,
        r.follow_up_notes,
        r.follow_up_frequency,
        r.category,
        r.last_follow_up_at,
        r.due_date,
        r.status,
        r.is_archived,
        r.created_by::text AS created_by,
        r.updated_by::text AS updated_by,
        r.created_at,
        r.updated_at
      FROM project_risks r
      LEFT JOIN employees e ON e.id = r.owner_id
      WHERE ${whereClause}
      ORDER BY r.updated_at DESC
    `;
    const result = await client.query(queryText, params);
    return result.rows;
};

export const insertProjectRisk = async (client, insertPayload) => {
    const result = await client.query(
        `
          WITH inserted AS (
            INSERT INTO project_risks (
              project_id, title, description, probability, impact, score,
              mitigation_plan_a, mitigation_plan_b, owner_id,
              follow_up_notes, follow_up_frequency, category,
              last_follow_up_at, due_date, status, created_by, updated_by
            )
            VALUES (
              $1::uuid, $2, $3, $4, $5, $6,
              $7, $8, $9::uuid,
              $10, $11, $12,
              $13, $14, $15, $16::uuid, $16::uuid
            )
            RETURNING *
          )
          SELECT
            r.id::text AS id,
            r.project_id::text AS project_id,
            r.title,
            r.description,
            r.probability::int,
            r.impact::int,
            r.score::int,
            r.mitigation_plan_a,
            r.mitigation_plan_b,
            r.owner_id::text AS owner_id,
            e.name AS owner_name,
            e.email AS owner_email,
            r.follow_up_notes,
            r.follow_up_frequency,
            r.category,
            r.last_follow_up_at,
            r.due_date,
            r.status,
            r.is_archived,
            r.created_by::text AS created_by,
            r.updated_by::text AS updated_by,
            r.created_at,
            r.updated_at
          FROM inserted r
          LEFT JOIN employees e ON e.id = r.owner_id
        `,
        [
            insertPayload.projectId,
            insertPayload.title,
            insertPayload.description,
            insertPayload.probability,
            insertPayload.impact,
            insertPayload.score,
            insertPayload.mitigationPlanA,
            insertPayload.mitigationPlanB,
            insertPayload.ownerId,
            insertPayload.followUpNotes,
            insertPayload.followUpFrequency,
            insertPayload.category,
            insertPayload.lastFollowUpAt,
            insertPayload.dueDate,
            insertPayload.status,
            insertPayload.createdBy,
        ],
    );
    return result.rows[0] ?? null;
};

const COLUMN_MAP = {
    mitigationPlanA: "mitigation_plan_a",
    mitigationPlanB: "mitigation_plan_b",
    ownerId: "owner_id",
    followUpNotes: "follow_up_notes",
    followUpFrequency: "follow_up_frequency",
    lastFollowUpAt: "last_follow_up_at",
    dueDate: "due_date",
    isArchived: "is_archived",
    updatedBy: "updated_by",
};

const buildUpdateColumns = (updates = {}) => {
    const sets = [];
    const params = [];
    let index = 1;
    Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined) {
            return;
        }
        const column = COLUMN_MAP[key] ?? key;
        const needsUuidCast = key === "ownerId" || key === "updatedBy";
        sets.push(`${column} = $${index++}${needsUuidCast ? "::uuid" : ""}`);
        params.push(value);
    });
    sets.push("updated_at = NOW()");
    return { sets, params };
};

export const updateProjectRisk = async (client, { riskId, updates }) => {
    const { sets, params } = buildUpdateColumns(updates);
    const query = `
      WITH updated AS (
        UPDATE project_risks r
        SET ${sets.join(", ")}
        WHERE r.id = $${params.length + 1}::uuid
        RETURNING *
      )
      SELECT
        r.id::text AS id,
        r.project_id::text AS project_id,
        r.title,
        r.description,
        r.probability::int,
        r.impact::int,
        r.score::int,
        r.mitigation_plan_a,
        r.mitigation_plan_b,
        r.owner_id::text AS owner_id,
        e.name AS owner_name,
        e.email AS owner_email,
        r.follow_up_notes,
        r.follow_up_frequency,
        r.category,
        r.last_follow_up_at,
        r.due_date,
        r.status,
        r.is_archived,
        r.created_by::text AS created_by,
        r.updated_by::text AS updated_by,
        r.created_at,
        r.updated_at
      FROM updated r
      LEFT JOIN employees e ON e.id = r.owner_id
    `;
    const result = await client.query(query, [...params, riskId]);
    return result.rows[0] ?? null;
};

export const archiveProjectRisk = async (client, riskId, userId) => {
    await client.query(
        `
          UPDATE project_risks
          SET is_archived = true, status = 'closed',
              updated_by = $1::uuid, updated_at = NOW()
          WHERE id = $2::uuid
        `,
        [userId ?? null, riskId],
    );
};
