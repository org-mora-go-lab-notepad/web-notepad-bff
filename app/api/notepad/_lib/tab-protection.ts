import "server-only";

import type { Transaction } from "@libsql/client";

type Tab = { id: string; content: string };
type Snapshot = {
  groups: { id: string; tabs: Tab[] }[];
  closedTabs: { tab: Tab }[];
};

export function snapshotTabs(snapshot: string): Tab[] {
  const state = JSON.parse(snapshot) as Snapshot;
  return [
    ...state.groups.flatMap((group) => group.tabs),
    ...state.closedTabs.map((entry) => entry.tab),
  ];
}

// A move may remove the source only after the destination is durable. Read
// through the same write transaction so concurrent saves cannot invalidate it.
export async function hasSavedDestination(
  transaction: Transaction,
  userId: string,
  tab: Tab,
  sourceGroupId?: string,
) {
  const tables = await transaction.execute(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('shared_groups', 'notepad_update_history')",
  );
  const names = new Set(tables.rows.map((row) => String(row.name)));
  if (names.has("shared_groups")) {
    const shared = await transaction.execute({
      sql: `SELECT g.id, g.snapshot FROM shared_groups g JOIN shared_group_members m ON m.group_id = g.id WHERE m.user_id = ? AND g.id <> ?`,
      args: [userId, sourceGroupId ?? ""],
    });
    for (const row of shared.rows) {
      const data = JSON.parse(String(row.snapshot)) as { tabs: Tab[] };
      if (
        data.tabs.some(
          (saved) =>
            (saved.id === tab.id || saved.id === `${row.id}-${tab.id}`) &&
            saved.content === tab.content,
        )
      )
        return true;
    }
  }
  if (sourceGroupId && names.has("notepad_update_history")) {
    const personal = await transaction.execute({
      sql: "SELECT snapshot FROM notepad_update_history WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 1",
      args: [userId],
    });
    if (
      personal.rows[0] &&
      snapshotTabs(String(personal.rows[0].snapshot)).some(
        (saved) => saved.id === tab.id && saved.content === tab.content,
      )
    )
      return true;
  }
  return false;
}

export async function backupBeforeRemoval(
  transaction: Transaction,
  scope: string,
  revision: string,
  snapshot: string,
) {
  // Independent of the rolling edit history. Never prune recovery copies as
  // part of an ordinary save, move, or explicitly confirmed deletion.
  await transaction.execute(`CREATE TABLE IF NOT EXISTS notepad_removal_backups (
    scope TEXT NOT NULL, revision TEXT NOT NULL, snapshot TEXT NOT NULL,
    created_at INTEGER NOT NULL, PRIMARY KEY(scope, revision)
  )`);
  await transaction.execute({
    sql: "INSERT OR IGNORE INTO notepad_removal_backups (scope, revision, snapshot, created_at) VALUES (?, ?, ?, ?)",
    args: [scope, revision, snapshot, Date.now()],
  });
}
