import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// drizzle-kit does NOT read Next's .env.local automatically — `dotenv/config`
// above loads `.env`, so keep DATABASE_URL in `.env` (and mirror it in .env.local
// for the Next runtime).
export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  strict: true,
  verbose: true,
});
