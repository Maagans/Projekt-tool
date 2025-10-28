/**
 * @type {import("node-pg-migrate").ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import("node-pg-migrate").MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    WITH resolved AS (
      SELECT
        id,
        COALESCE(NULLIF(TRIM(location), ''), NULLIF(TRIM(department), '')) AS value
      FROM employees
    )
    UPDATE employees e
    SET
      location = resolved.value,
      department = resolved.value
    FROM resolved
    WHERE e.id = resolved.id
      AND (
        e.location IS DISTINCT FROM resolved.value
        OR e.department IS DISTINCT FROM resolved.value
      );
  `);
};

/**
 * @param pgm {import("node-pg-migrate").MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.sql(`
    UPDATE employees
    SET department = NULL
  `);
};

