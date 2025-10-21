import pg from "pg";
import { config } from "./config/index.js";

const { Pool } = pg;

const pool = new Pool({
  connectionString: config.databaseUrl,
});

pool.on("connect", () => {
  console.log("Connected to the database");
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

export default pool;
