import { spawn } from "child_process";
import { mkdirSync } from "fs";
import { join, resolve } from "path";
import { config } from "../config/index.js";

function normalizeDir(value) {
  if (typeof value !== "string" || value.trim() === "") {
    return "backups";
  }
  return value.trim();
}

function buildTimestamp() {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-");
}

async function main() {
  const { databaseUrl, directories } = config;

  if (!databaseUrl || databaseUrl.trim() === "") {
    console.error("DATABASE_URL mangler. Sæt den i .env eller som miljøvariabel.");
    process.exit(1);
  }

  const directory = resolve(process.cwd(), normalizeDir(directories.backup));

  try {
    mkdirSync(directory, { recursive: true });
  } catch (error) {
    console.error("Kunne ikke oprette backup-mappe:", error.message);
    process.exit(1);
  }

  const filename = `backup-${buildTimestamp()}.dump`;
  const filepath = join(directory, filename);
  const args = ["--format=custom", `--file=${filepath}`, `--dbname=${databaseUrl}`];

  console.log("Kører pg_dump ...");
  const child = spawn("pg_dump", args, { stdio: "inherit" });

  child.on("exit", (code) => {
    if (code === 0) {
      console.log(`Backup gennemført: ${filepath}`);
    } else {
      console.error(`pg_dump fejlede med exit code ${code}`);
    }
  });
}

main().catch((error) => {
  console.error("Uventet fejl under backup:", error);
  process.exit(1);
});
