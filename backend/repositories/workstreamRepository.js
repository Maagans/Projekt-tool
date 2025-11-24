
export const getIdsByProjectId = async (client, projectId) => {
    const result = await client.query(
        'SELECT id::text FROM project_workstreams WHERE project_id = $1::uuid',
        [projectId]
    );
    return result.rows.map((row) => row.id);
};

export const upsert = async (client, projectId, { id, name, order }) => {
    await client.query(
        `
        INSERT INTO project_workstreams (id, project_id, name, sort_order)
        VALUES ($1::uuid, $2::uuid, $3, $4)
        ON CONFLICT (id)
        DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, updated_at = NOW()
        `,
        [id, projectId, name, order]
    );
};

export const deleteByIds = async (client, projectId, ids) => {
    await client.query(
        'DELETE FROM project_workstreams WHERE project_id = $1::uuid AND id = ANY($2::uuid[])',
        [projectId, ids]
    );
};
