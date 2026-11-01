import "server-only";

import {
  backupBeforeRemoval,
  hasSavedDestination,
} from "@/app/api/notepad/_lib/tab-protection";
import type { GroupEntry, SharedGroupData } from "@/src/4-entity/notepad";
import {
  applySharedGroupData,
  namespaceGroup,
  normalizeSharedGroupData,
  toSharedGroupData,
} from "@/src/4-entity/notepad";
import type { GatewayUser as KakaoUser } from "@/src/server";

import { sharedDatabase } from "./database";
import { describeGroupUpdate } from "./summary";

export type SharedRecord = {
  id: string;
  ownerId: string;
  revision: number;
  data: SharedGroupData;
  updatedAt: number;
  sharingActive: boolean;
  shareVersion: number;
};

function fromRow(row: Record<string, unknown>): SharedRecord {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    revision: Number(row.revision),
    data: normalizeSharedGroupData(
      JSON.parse(String(row.snapshot)) as SharedGroupData,
    ),
    updatedAt: Number(row.updated_at),
    sharingActive: Number(row.invite_enabled ?? 1) !== 0,
    shareVersion: Number(row.token_version ?? 0),
  };
}

export async function createOrGetSharedGroup(
  user: KakaoUser,
  group: GroupEntry,
) {
  const database = await sharedDatabase();
  const existing = await database.execute({
    sql: `SELECT * FROM shared_groups WHERE (owner_id = ? AND owner_local_id = ?) OR id = ? LIMIT 1`,
    args: [user.id, group.id, group.id],
  });
  const row = existing.rows[0];
  if (row) {
    const record = fromRow(row);
    const member = await database.execute({
      sql: "SELECT 1 FROM shared_group_members WHERE group_id = ? AND user_id = ?",
      args: [record.id, user.id],
    });
    if (!member.rows.length || record.ownerId !== user.id) return null;
    const access = await database.execute({
      sql: "SELECT enabled, token_version FROM shared_group_access WHERE group_id = ?",
      args: [record.id],
    });
    record.shareVersion = Number(access.rows[0]?.token_version ?? 0);
    if (Number(access.rows[0]?.enabled ?? 1) === 0) {
      await database.execute({
        sql: "UPDATE shared_group_access SET enabled = 1 WHERE group_id = ?",
        args: [record.id],
      });
    }
    return {
      record,
      group: applySharedGroupData(
        group.id === record.id
          ? group
          : namespaceGroup(group, record.id.slice(7)),
        record.data,
      ),
    };
  }

  const id = `shared-${crypto.randomUUID()}`;
  const namespaced = namespaceGroup(group, id.slice(7));
  const data = toSharedGroupData(namespaced);
  const now = Date.now();
  await database.batch(
    [
      {
        sql: "INSERT INTO shared_groups (id, owner_id, owner_local_id, snapshot, revision, updated_at) VALUES (?, ?, ?, ?, 0, ?)",
        args: [id, user.id, group.id, JSON.stringify(data), now],
      },
      {
        sql: "INSERT INTO shared_group_members (group_id, user_id, display_name, joined_at) VALUES (?, ?, ?, ?)",
        args: [id, user.id, user.nickname, now],
      },
    ],
    "write",
  );
  return {
    record: {
      id,
      ownerId: user.id,
      revision: 0,
      data,
      updatedAt: now,
      sharingActive: true,
      shareVersion: 0,
    },
    group: namespaced,
  };
}

export async function joinSharedGroup(
  user: KakaoUser,
  id: string,
  shareVersion = 0,
) {
  const database = await sharedDatabase();
  const transaction = await database.transaction("write");
  try {
    const found = await transaction.execute({
      sql: "SELECT g.*, COALESCE(a.enabled, 1) AS invite_enabled, COALESCE(a.token_version, 0) AS token_version FROM shared_groups g LEFT JOIN shared_group_access a ON a.group_id = g.id WHERE g.id = ?",
      args: [id],
    });
    if (
      !found.rows[0] ||
      Number(found.rows[0].invite_enabled) === 0 ||
      Number(found.rows[0].token_version) !== shareVersion
    )
      return null;
    const lastEvent = await transaction.execute({
      sql: "SELECT COALESCE(MAX(id), 0) AS id FROM shared_group_events WHERE group_id = ?",
      args: [id],
    });
    await transaction.execute({
      sql: "INSERT OR IGNORE INTO shared_group_members (group_id, user_id, display_name, last_seen_event_id, joined_at) VALUES (?, ?, ?, ?, ?)",
      args: [
        id,
        user.id,
        user.nickname,
        Number(lastEvent.rows[0]?.id ?? 0),
        Date.now(),
      ],
    });
    await transaction.commit();
    return fromRow(found.rows[0]);
  } finally {
    transaction.close();
  }
}

export async function listSharedGroups(userId: string) {
  const database = await sharedDatabase();
  const result = await database.execute({
    sql: `SELECT g.*, COALESCE(a.enabled, 1) AS invite_enabled, COALESCE(a.token_version, 0) AS token_version FROM shared_groups g JOIN shared_group_members m ON m.group_id = g.id
      LEFT JOIN shared_group_access a ON a.group_id = g.id
      WHERE m.user_id = ? ORDER BY g.updated_at DESC`,
    args: [userId],
  });
  return result.rows.map(fromRow);
}

export async function saveSharedGroup(
  user: KakaoUser,
  id: string,
  baseRevision: number,
  data: SharedGroupData,
  deletedTabIds: string[],
  movedTabIds: string[] = [],
  confirmedDeletion = false,
  movedTabs: { id: string; content: string }[] = [],
  emptyClosedTabIds: string[] = [],
) {
  data = normalizeSharedGroupData(data);
  const database = await sharedDatabase();
  const transaction = await database.transaction("write");
  try {
    const membership = await transaction.execute({
      sql: "SELECT 1 FROM shared_group_members WHERE group_id = ? AND user_id = ?",
      args: [id, user.id],
    });
    if (!membership.rows.length) return { kind: "forbidden" as const };
    const result = await transaction.execute({
      sql: "SELECT * FROM shared_groups WHERE id = ?",
      args: [id],
    });
    const row = result.rows[0];
    if (!row) return { kind: "missing" as const };
    const current = fromRow(row);
    if (current.revision !== baseRevision)
      return { kind: "conflict" as const, record: current };
    const nextTabIds = new Set(data.tabs.map((tab) => tab.id));
    // Older clients emitted deletedTabIds for closing/moving tabs. That list
    // alone must never authorize a destructive write after this deployment.
    const approvedDeletes = new Set(
      confirmedDeletion
        ? deletedTabIds
        : [...movedTabIds, ...emptyClosedTabIds],
    );
    if (
      current.data.tabs.some(
        (tab) => !nextTabIds.has(tab.id) && !approvedDeletes.has(tab.id),
      )
    )
      return { kind: "unsafe" as const, record: current };
    const removed = current.data.tabs.filter((tab) => !nextTabIds.has(tab.id));
    for (const tab of removed) {
      if (
        movedTabIds.includes(tab.id) &&
        !(await hasSavedDestination(
          transaction,
          user.id,
          movedTabs.find((moved) => moved.id === tab.id) ?? tab,
          id,
        ))
      ) {
        return { kind: "destination-pending" as const };
      }
    }
    if (JSON.stringify(current.data) === JSON.stringify(data))
      return { kind: "saved" as const, record: current };
    const revision = current.revision + 1;
    const now = Date.now();
    if (removed.length)
      await backupBeforeRemoval(
        transaction,
        `shared:${id}`,
        String(current.revision),
        String(row.snapshot),
      );
    await transaction.execute({
      sql: "UPDATE shared_groups SET snapshot = ?, revision = ?, updated_at = ? WHERE id = ?",
      args: [JSON.stringify(data), revision, now, id],
    });
    const previousTabs = new Map(current.data.tabs.map((tab) => [tab.id, tab]));
    const changedTab =
      data.tabs.find((tab) => {
        const previous = previousTabs.get(tab.id);
        return (
          !previous ||
          previous.content !== tab.content ||
          previous.tabColor !== tab.tabColor ||
          previous.dashboardStatus !== tab.dashboardStatus
        );
      }) ??
      current.data.tabs.find(
        (tab) => !data.tabs.some((next) => next.id === tab.id),
      ) ??
      data.tabs.find((tab) => tab.open) ??
      data.tabs[0];
    await transaction.execute({
      sql: `INSERT INTO shared_group_events (group_id, revision, actor_id, actor_name, summary, created_at, tab_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        revision,
        user.id,
        user.nickname,
        describeGroupUpdate(current.data, data),
        now,
        changedTab?.id ?? null,
      ],
    });
    await transaction.commit();
    return {
      kind: "saved" as const,
      record: { ...current, revision, data, updatedAt: now },
    };
  } finally {
    transaction.close();
  }
}

export async function listSharedNotifications(userId: string) {
  const database = await sharedDatabase();
  const result = await database.execute({
    sql: `SELECT e.id, e.group_id, e.tab_id, e.actor_id, e.actor_name, e.summary, e.created_at,
      g.snapshot, m.last_seen_event_id, n.is_read
      FROM shared_group_events e
      JOIN shared_group_members m ON m.group_id = e.group_id AND m.user_id = ?
      JOIN shared_groups g ON g.id = e.group_id
      LEFT JOIN shared_group_notification_states n ON n.event_id = e.id AND n.user_id = m.user_id
      WHERE e.actor_id <> ? AND COALESCE(n.dismissed, 0) = 0 ORDER BY e.id DESC LIMIT 30`,
    args: [userId, userId],
  });
  return result.rows.flatMap((row) => {
    const group = JSON.parse(String(row.snapshot)) as SharedGroupData;
    const tabId =
      typeof row.tab_id === "string"
        ? row.tab_id
        : (group.tabs.find((tab) => tab.open)?.id ?? null);
    if (
      !tabId ||
      !group.tabs.some((tab) => tab.id === tabId) ||
      String(row.summary).startsWith("글 삭제:")
    )
      return [];
    return [
      {
        id: Number(row.id),
        groupId: String(row.group_id),
        tabId,
        groupName: group.name,
        actorId: String(row.actor_id),
        actorName: String(row.actor_name),
        summary: String(row.summary),
        createdAt: Number(row.created_at),
        unread:
          Number(row.id) > Number(row.last_seen_event_id) &&
          !Number(row.is_read),
      },
    ];
  });
}

export async function markSharedNotificationsRead(
  userId: string,
  eventId?: number,
) {
  const database = await sharedDatabase();
  if (eventId !== undefined) {
    await database.execute({
      sql: `INSERT INTO shared_group_notification_states (user_id, event_id, is_read)
        SELECT ?, e.id, 1 FROM shared_group_events e
        JOIN shared_group_members m ON m.group_id = e.group_id AND m.user_id = ?
        WHERE e.id = ? AND e.actor_id <> ?
        ON CONFLICT(user_id, event_id) DO UPDATE SET is_read = 1`,
      args: [userId, userId, eventId, userId],
    });
    return;
  }
  await database.execute({
    sql: `UPDATE shared_group_members SET last_seen_event_id = COALESCE(
      (SELECT MAX(id) FROM shared_group_events WHERE group_id = shared_group_members.group_id), 0
    ) WHERE user_id = ?`,
    args: [userId],
  });
}

export async function clearSharedNotifications(userId: string) {
  const database = await sharedDatabase();
  await database.execute({
    sql: `INSERT INTO shared_group_notification_states (user_id, event_id, dismissed)
      SELECT ?, e.id, 1 FROM shared_group_events e
      JOIN shared_group_members m ON m.group_id = e.group_id AND m.user_id = ?
      WHERE e.actor_id <> ?
      ON CONFLICT(user_id, event_id) DO UPDATE SET dismissed = 1`,
    args: [userId, userId, userId],
  });
}

export async function changeSharedGroupAccess(
  userId: string,
  id: string,
  action: "leave" | "revoke",
) {
  const database = await sharedDatabase();
  const transaction = await database.transaction("write");
  try {
    const result = await transaction.execute({
      sql: "SELECT owner_id FROM shared_groups WHERE id = ?",
      args: [id],
    });
    const ownerId = result.rows[0]?.owner_id;
    if (!ownerId) return "missing" as const;
    if (action === "revoke") {
      if (String(ownerId) !== userId) return "forbidden" as const;
      await transaction.execute({
        sql: "INSERT INTO shared_group_access (group_id, enabled, token_version) VALUES (?, 0, 1) ON CONFLICT(group_id) DO UPDATE SET token_version = CASE WHEN shared_group_access.enabled = 1 THEN shared_group_access.token_version + 1 ELSE shared_group_access.token_version END, enabled = 0",
        args: [id],
      });
      await transaction.execute({
        sql: "DELETE FROM shared_group_members WHERE group_id = ? AND user_id <> ?",
        args: [id, userId],
      });
    } else {
      if (String(ownerId) === userId) return "forbidden" as const;
      const removed = await transaction.execute({
        sql: "DELETE FROM shared_group_members WHERE group_id = ? AND user_id = ?",
        args: [id, userId],
      });
      if (!removed.rowsAffected) return "forbidden" as const;
    }
    await transaction.commit();
    return "changed" as const;
  } finally {
    transaction.close();
  }
}
