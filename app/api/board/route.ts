import { NextResponse } from "next/server";

import {
  type BoardPost,
  DEFAULT_SETTINGS,
  getTabStatus,
  hasBoardVisibleSharedContent,
  type SharedGroupData,
} from "@/src/4-entity/notepad";
import { gatewayOptions } from "@/src/server";
import { withGateway } from "@/src/server";

import { sharedDatabase } from "../groups/_lib/database";
import { currentGroupUser } from "../groups/_lib/request";

async function handleGET() {
  try {
    const user = await currentGroupUser();
    const database = await sharedDatabase();
    const result = await database.execute({
      sql: `SELECT g.id, g.owner_id, owner.display_name AS owner_name, viewer.user_id AS viewer_id, g.snapshot, g.updated_at, COALESCE(a.token_version, 0) AS token_version,
      (SELECT COUNT(*) FROM shared_group_members m WHERE m.group_id = g.id) AS member_count
      FROM shared_groups g LEFT JOIN shared_group_access a ON a.group_id = g.id
      LEFT JOIN shared_group_members owner ON owner.group_id = g.id AND owner.user_id = g.owner_id
      LEFT JOIN shared_group_members viewer ON viewer.group_id = g.id AND viewer.user_id = ?
      WHERE COALESCE(a.enabled, 1) = 1 ORDER BY g.updated_at DESC, g.id`,
      args: [user?.id ?? ""],
    });
    const posts: (Omit<BoardPost, "inviteUrl"> & {
      shareLink: { groupId: string; version: number };
    })[] = result.rows.map((row) => {
      const group = JSON.parse(String(row.snapshot)) as SharedGroupData;
      const tabs = group.tabs.filter((tab) =>
        hasBoardVisibleSharedContent(tab.content),
      );
      return {
        id: String(row.id),
        viewerRole: row.viewer_id
          ? String(row.owner_id) === user?.id
            ? "owner"
            : "member"
          : null,
        groupName: group.name,
        ownerName: String(row.owner_name ?? ""),
        title: group.name,
        description: "",
        noteCount: group.tabs.filter((tab) => tab.content.trim()).length,
        bookmarkCount: tabs.filter((tab) => tab.bookmarked).length,
        notes: tabs.map((tab) => ({
          id: tab.id,
          title: tab.title,
          content: tab.content,
          bookmarked: tab.bookmarked,
          selectedLines: tab.selectedLines,
          updatedAt: tab.updatedAt,
          dashboardStatus: getTabStatus(tab, DEFAULT_SETTINGS.tabColorCycle),
          tabColor: tab.tabColor,
        })),
        memberCount: Number(row.member_count),
        updatedAt: Number(row.updated_at),
        shareLink: {
          groupId: String(row.id),
          version: Number(row.token_version),
        },
      };
    });
    return NextResponse.json(
      { posts },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 503 },
    );
  }
}

export const GET = withGateway(handleGET);

export const OPTIONS = gatewayOptions;
