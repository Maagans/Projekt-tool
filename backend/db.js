import pg from "pg";
import { config } from "./config/index.js";
import logger from "./logger.js";

const { Pool } = pg;

const pool = new Pool({
  connectionString: config.databaseUrl,
});

pool.on("connect", () => {
  logger.info("Connected to the database");
});

pool.on("error", (err) => {
  logger.error(err, "Unexpected error on idle client");
  process.exit(-1);
});

export default pool;
