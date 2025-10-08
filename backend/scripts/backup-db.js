import "dotenv/config";
import { spawn } from "child_process";
import { mkdirSync } from "fs";
import { join, resolve } from "path";

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
  const { DATABASE_URL, PG_BACKUP_DIR } = process.env;

  if (!DATABASE_URL || DATABASE_URL.trim() === "") {
    console.error("DATABASE_URL mangler. Saet den i .env eller som miljoevariabel.");
    process.exit(1);
  }

  const directory = resolve(process.cwd(), normalizeDir(PG_BACKUP_DIR));

  try {
    mkdirSync(directory, { recursive: true });
  } catch (error) {
    console.error("Kunne ikke oprette backup-mappe:", error.message);
    process.exit(1);
  }

  const filename = `backup-${buildTimestamp()}.dump`;
  const filepath = join(directory, filename);
  const args = ["--format=custom", `--file=${filepath}`, `--dbname=${DATABASE_URL}`];

  console.log("Koerer pg_dump ...");
  const child = spawn("pg_dump", args, { stdio: "inherit" });

  child.on("error", (error) => {
    console.error("Kunne ikke starte pg_dump. Er PostgreSQL klientvaerktoejerne installeret og paa PATH?", error.message);
    process.exit(1);
  });

  child.on("exit", (code) => {
    if (code === 0) {
      console.log(`Backup gemt: ${filepath}`);
    } else {
      console.error(`pg_dump fejlede med exit code ${code}`);
      process.exit(code ?? 1);
    }
  });
}

main().catch((error) => {
  console.error("Uventet fejl under backup:", error.message);
  process.exit(1);
});
