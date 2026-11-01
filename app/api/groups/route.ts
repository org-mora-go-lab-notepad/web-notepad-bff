import { NextResponse } from "next/server";

import { withGateway } from "@/src/server";

import { currentGroupUser } from "./_lib/request";
import { listSharedGroups } from "./_lib/shared-store";

async function handleGET() {
  const user = await currentGroupUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(
      { groups: await listSharedGroups(user.id) },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 503 },
    );
  }
}

export const GET = withGateway(handleGET);
