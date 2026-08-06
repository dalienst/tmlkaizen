import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Initialize the standard postgres client
const client = postgres(process.env.DATABASE_URL!);

export const db = drizzle(client, { schema });