import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "node:fs";
import path from "node:path";
import * as schema from "./schema";

const DB_PATH = process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "liaxis.db");

type Db = ReturnType<typeof drizzle<typeof schema>>;

declare global {
  var __liaxisDb: Db | undefined;
}

function createDb(): Db {
  mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db;
}

/**
 * Next.js imports route modules (and therefore this file) at build time to
 * collect page metadata, without ever calling a handler — merely importing
 * this module must not touch the filesystem. The connection is opened (and
 * migrations run) lazily, on first actual query, and cached on `global` so
 * dev's hot-reload doesn't reopen the file on every edit.
 */
export const db: Db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const instance = globalThis.__liaxisDb ?? (globalThis.__liaxisDb = createDb());
    return Reflect.get(instance as object, prop, receiver);
  },
});
