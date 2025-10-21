import pino from "pino";
import { config, isProduction } from "./config/index.js";

const logger = pino({
  level: config.logLevel,
  transport: !isProduction
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          singleLine: true,
        },
      }
    : undefined,
});

export default logger;
