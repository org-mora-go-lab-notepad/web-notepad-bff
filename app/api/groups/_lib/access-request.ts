import { NextResponse } from "next/server";

import { currentGroupUser, isSameOrigin, readGroupPayload } from "./request";
import { changeSharedGroupAccess } from "./shared-store";

export async function changeGroupAccess(
  request: Request,
  action: "leave" | "revoke",
) {
  const user = await currentGroupUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isSameOrigin(request))
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const payload = await readGroupPayload(request);
  const id =
    payload && typeof payload === "object"
      ? (payload as { id?: unknown }).id
      : null;
  if (typeof id !== "string" || !/^shared-[0-9a-f-]{36}$/i.test(id))
    return NextResponse.json({ error: "Invalid group" }, { status: 400 });
  try {
    const result = await changeSharedGroupAccess(user.id, id, action);
    if (result !== "changed")
      return NextResponse.json(
        { error: result },
        { status: result === "missing" ? 404 : 403 },
      );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Database unavailable" },
      { status: 503 },
    );
  }
}
