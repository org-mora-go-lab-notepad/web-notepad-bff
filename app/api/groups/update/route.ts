import { NextResponse } from "next/server";

import type { SharedGroupData } from "@/src/4-entity/notepad";
import { withGateway } from "@/src/server";

import {
  currentGroupUser,
  isSameOrigin,
  readGroupPayload,
} from "../_lib/request";
import { saveSharedGroup } from "../_lib/shared-store";

async function handlePOST(request: Request) {
  const user = await currentGroupUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOrigin(request))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const payload = await readGroupPayload(request);
  const input =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};
  const data = input.data as SharedGroupData | undefined;
  const deletedTabIds = input.deletedTabIds ?? [];
  const emptyClosedTabIds = input.emptyClosedTabIds ?? [];
  const movedTabIds = input.movedTabIds ?? [];
  const movedTabs = input.movedTabs ?? [];
  const confirmedDeletion = input.confirmedDeletion ?? false;
  if (
    typeof input.id !== "string" ||
    !/^shared-[0-9a-f-]{36}$/i.test(input.id) ||
    !Number.isSafeInteger(input.baseRevision) ||
    Number(input.baseRevision) < 0 ||
    !data ||
    data.id !== input.id ||
    typeof data.name !== "string" ||
    data.name.length > 60 ||
    !Array.isArray(data.tabs) ||
    !Array.isArray(data.bookmarks) ||
    !Array.isArray(deletedTabIds) ||
    deletedTabIds.length > 1_000 ||
    !deletedTabIds.every(
      (tabId) => typeof tabId === "string" && tabId.length <= 200,
    ) ||
    !Array.isArray(emptyClosedTabIds) ||
    emptyClosedTabIds.length > 1_000 ||
    !emptyClosedTabIds.every(
      (id) => typeof id === "string" && deletedTabIds.includes(id),
    ) ||
    !Array.isArray(movedTabIds) ||
    typeof confirmedDeletion !== "boolean" ||
    !Array.isArray(movedTabs) ||
    JSON.stringify(movedTabs).length > 5_000_000 ||
    !movedTabs.every(
      (tab) =>
        tab &&
        typeof tab.id === "string" &&
        typeof tab.content === "string" &&
        movedTabIds.includes(tab.id),
    ) ||
    movedTabIds.length > 1_000 ||
    !movedTabIds.every(
      (tabId) => typeof tabId === "string" && deletedTabIds.includes(tabId),
    ) ||
    !data.tabs.every(
      (tab) =>
        tab && typeof tab.id === "string" && typeof tab.content === "string",
    )
  ) {
    return NextResponse.json({ error: "Invalid update" }, { status: 400 });
  }
  try {
    const result = await saveSharedGroup(
      user,
      input.id,
      Number(input.baseRevision),
      data,
      deletedTabIds,
      movedTabIds,
      confirmedDeletion,
      movedTabs,
      emptyClosedTabIds,
    );
    if (result.kind === "forbidden")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (result.kind === "missing")
      return NextResponse.json({ error: "Group unavailable" }, { status: 404 });
    if (result.kind === "destination-pending")
      return NextResponse.json(
        { error: "Tab destination is not saved yet" },
        { status: 503 },
      );
    if (result.kind === "conflict")
      return NextResponse.json({ group: result.record }, { status: 409 });
    if (result.kind === "unsafe")
      return NextResponse.json(
        { group: result.record, reset: true },
        { status: 409 },
      );
    return NextResponse.json({ group: result.record });
  } catch {
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 503 },
    );
  }
}

export const POST = withGateway(handlePOST);
