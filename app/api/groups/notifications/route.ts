import { NextResponse } from "next/server";

import { withGateway } from "@/src/server";

import { currentGroupUser, isSameOrigin } from "../_lib/request";
import {
  clearSharedNotifications,
  listSharedNotifications,
} from "../_lib/shared-store";

async function handleGET() {
  const user = await currentGroupUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(
      { notifications: await listSharedNotifications(user.id) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 503 },
    );
  }
}

async function handleDELETE(request: Request) {
  const user = await currentGroupUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOrigin(request))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  try {
    await clearSharedNotifications(user.id);
    return NextResponse.json({ cleared: true });
  } catch {
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 503 },
    );
  }
}

export const GET = withGateway(handleGET);
export const DELETE = withGateway(handleDELETE);
