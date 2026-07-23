import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "liaxis.db");

declare global {
  var __liaxisDb: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

function createDb() {
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

// Next.js dev server hot-reloads modules; cache the connection on `global`
// so we don't reopen the SQLite file (and rerun migrations) on every request.
export const db = globalThis.__liaxisDb ?? createDb();
if (process.env.NODE_ENV !== "production") {
  globalThis.__liaxisDb = db;
}
