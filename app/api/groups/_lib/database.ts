import "server-only";

import type { Client } from "@libsql/client";

import { createDatabaseClient } from "@/src/server";

let client: Client | undefined;
let schemaReady: Promise<void> | undefined;

export async function sharedDatabase() {
  const url =
    process.env.TURSO_DATABASE_URL ??
    (process.env.NODE_ENV === "development"
      ? "file:web-notepad-local.db"
      : undefined);
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || (!url.startsWith("file:") && !authToken)) {
    throw new Error("Turso database credentials are not configured.");
  }
  const database = (client ??= createDatabaseClient(url, authToken));
  schemaReady ??= database
    .batch(
      [
        `CREATE TABLE IF NOT EXISTS shared_groups (
      id TEXT PRIMARY KEY,
      owner_id TEXT NOT NULL,
      owner_local_id TEXT NOT NULL,
      snapshot TEXT NOT NULL,
      revision INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL,
      UNIQUE(owner_id, owner_local_id)
    )`,
        `CREATE TABLE IF NOT EXISTS shared_group_access (
      group_id TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1,
      token_version INTEGER NOT NULL DEFAULT 0
    )`,
        `CREATE TABLE IF NOT EXISTS shared_group_members (
      group_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      last_seen_event_id INTEGER NOT NULL DEFAULT 0,
      joined_at INTEGER NOT NULL,
      PRIMARY KEY(group_id, user_id)
    )`,
        `CREATE TABLE IF NOT EXISTS shared_group_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id TEXT NOT NULL,
      revision INTEGER NOT NULL,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      summary TEXT NOT NULL,
      tab_id TEXT,
      created_at INTEGER NOT NULL
    )`,
        `CREATE TABLE IF NOT EXISTS shared_group_notification_states (
      user_id TEXT NOT NULL,
      event_id INTEGER NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      dismissed INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY(user_id, event_id)
    )`,
        "CREATE INDEX IF NOT EXISTS shared_group_events_group_id ON shared_group_events(group_id, id)",
      ],
      "write",
    )
    .then(async () => {
      const eventColumns = await database.execute(
        "PRAGMA table_info(shared_group_events)",
      );
      if (!eventColumns.rows.some((column) => column.name === "tab_id"))
        await database.execute(
          "ALTER TABLE shared_group_events ADD COLUMN tab_id TEXT",
        );
      const columns = await database.execute(
        "PRAGMA table_info(shared_group_access)",
      );
      if (!columns.rows.some((column) => column.name === "token_version")) {
        await database.execute(
          "ALTER TABLE shared_group_access ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0",
        );
      }
    })
    .catch((error: unknown) => {
      schemaReady = undefined;
      throw error;
    });
  await schemaReady;
  return database;
}
