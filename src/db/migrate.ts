import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import path from "path";
import fs from "fs";

// Fallback to load .env.local if DATABASE_URL is not in the environment
if (!process.env.DATABASE_URL) {
  const envPath = path.join(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    }
  }
}

const MAX_RETRIES = 10;
const RETRY_DELAY_MS = 3000;

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    // max: 1 forces a single connection and allows the script to exit cleanly
    const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });
    const db = drizzle(migrationClient);

    try {
      console.log(`⏳ Running database migrations (attempt ${attempt}/${MAX_RETRIES})...`);

      await migrate(db, {
        migrationsFolder: path.join(process.cwd(), "drizzle/migrations"),
      });

      console.log("✅ Migrations complete.");
      await migrationClient.end();
      return;
    } catch (err: any) {
      await migrationClient.end({ timeout: 1 }).catch(() => {});

      const isStartingUp =
        err?.code === "57P03" ||
        err?.cause?.code === "57P03" ||
        err?.message?.includes("the database system is starting up") ||
        err?.cause?.message?.includes("the database system is starting up") ||
        err?.code === "ECONNREFUSED" ||
        err?.cause?.code === "ECONNREFUSED";

      if (isStartingUp && attempt < MAX_RETRIES) {
        console.warn(`⚠️ Database is starting up or temporarily unavailable. Retrying in ${RETRY_DELAY_MS / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        continue;
      }

      throw err;
    }
  }
}

runMigrations().catch((err) => {
  console.error("❌ Migration failed:", err);
  process.exit(1);
});