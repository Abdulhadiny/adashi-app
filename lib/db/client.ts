import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Node-only. Never import this from middleware / auth.config / client components.
// A single pooled postgres.js client is cached on globalThis so Next dev HMR
// doesn't open a new pool on every reload.
const globalForDb = globalThis as unknown as {
  __adashiPg?: ReturnType<typeof postgres>;
};

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set (check .env.local / .env)");
}

const client = globalForDb.__adashiPg ?? postgres(connectionString, { max: 10 });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__adashiPg = client;
}

export const db = drizzle(client, { schema });
export { schema };
