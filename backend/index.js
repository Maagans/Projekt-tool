import logger from "./logger.js";
import { createApp } from "./app.js";
import { config } from "./config/index.js";

const missingEnv = [
  { name: "JWT_SECRET", value: config.jwtSecret },
  { name: "DATABASE_URL", value: config.databaseUrl },
]
  .filter(({ value }) => {
    if (typeof value !== "string") {
      return true;
    }
    return value.trim().length === 0;
  })
  .map(({ name }) => name);

if (missingEnv.length > 0) {
  logger.fatal({ missingEnv }, "Missing required environment variables");
  process.exit(1);
}

const app = createApp();

app.listen(config.port, () => {
  logger.info({ port: config.port }, "Backend server is running");
});
