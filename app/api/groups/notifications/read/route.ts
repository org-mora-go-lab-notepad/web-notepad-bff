import { NextResponse } from "next/server";

import { withGateway } from "@/src/server";

import { currentGroupUser, isSameOrigin } from "../../_lib/request";
import { markSharedNotificationsRead } from "../../_lib/shared-store";

async function handlePOST(request: Request) {
  const user = await currentGroupUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOrigin(request))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const body = await request.text();
    let id: number | undefined;
    if (body) {
      let payload;
      try {
        payload = JSON.parse(body);
      } catch {
        return NextResponse.json(
          { error: "Invalid notification" },
          { status: 400 },
        );
      }
      id = payload?.id;
      if (!Number.isSafeInteger(id) || (id ?? 0) < 1)
        return NextResponse.json(
          { error: "Invalid notification" },
          { status: 400 },
        );
    }
    await markSharedNotificationsRead(user.id, id);
    return NextResponse.json({ read: true });
  } catch {
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 503 },
    );
  }
}

export const POST = withGateway(handlePOST);
