import { db } from "./index";
import { sql } from "drizzle-orm";

async function main() {
  const result = await db.execute(sql`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name IN ('users', 'hr_locations', 'gm_locations', 'managers_departments')
  `);
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch(console.error);
