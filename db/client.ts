import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

function isLocalDatabase(url: string) {
  return url.includes("localhost") || url.includes("127.0.0.1");
}

export function createDb(databaseUrl: string) {
  if (isLocalDatabase(databaseUrl)) {
    const client = postgres(databaseUrl);
    return drizzlePostgres(client, { schema });
  }

  const sql = neon(databaseUrl);
  return drizzleNeon(sql, { schema });
}
