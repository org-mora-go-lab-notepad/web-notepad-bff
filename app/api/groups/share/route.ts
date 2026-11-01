import { NextResponse } from "next/server";

import type { GroupEntry } from "@/src/4-entity/notepad";
import { withGateway } from "@/src/server";
import { createGroupShareToken } from "@/src/server";

import {
  currentGroupUser,
  isSameOrigin,
  readGroupPayload,
} from "../_lib/request";
import { createOrGetSharedGroup } from "../_lib/shared-store";

async function handlePOST(request: Request) {
  const user = await currentGroupUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOrigin(request))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const payload = await readGroupPayload(request);
  const group = (
    payload && typeof payload === "object"
      ? (payload as { group?: unknown }).group
      : null
  ) as GroupEntry | null;
  if (
    !group ||
    typeof group.id !== "string" ||
    !/^[a-zA-Z0-9_-]{1,128}$/.test(group.id) ||
    group.id === "ungrouped" ||
    typeof group.name !== "string" ||
    group.name.length > 60 ||
    !Array.isArray(group.tabs) ||
    !Array.isArray(group.bookmarks) ||
    !group.tabs.every(
      (tab) =>
        tab && typeof tab.id === "string" && typeof tab.content === "string",
    )
  ) {
    return NextResponse.json({ error: "Invalid group" }, { status: 400 });
  }
  try {
    const shared = await createOrGetSharedGroup(user, group);
    if (!shared)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const url = new URL("/", request.url);
    url.searchParams.set(
      "share",
      createGroupShareToken(shared.record.id, shared.record.shareVersion),
    );
    return NextResponse.json({
      url: url.toString(),
      group: shared.group,
      revision: shared.record.revision,
    });
  } catch {
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 503 },
    );
  }
}

export const POST = withGateway(handlePOST);
