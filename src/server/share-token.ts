import { createHmac, timingSafeEqual } from "node:crypto";
function sign(value: string) {
  const secret =
    process.env.SHARE_TOKEN_SECRET ??
    (process.env.NODE_ENV === "development"
      ? "web-notepad-local-development-session"
      : undefined);
  if (!secret) throw new Error("SHARE_TOKEN_SECRET is not configured");
  return createHmac("sha256", secret).update(value).digest("base64url");
}
export function createGroupShareToken(groupId: string, version = 0) {
  const payload = version ? groupId + "." + version : groupId;
  return payload + "." + sign("group-share:" + payload);
}

export function readGroupShareToken(token: string) {
  const parts = token.split(".");
  if (parts.length !== 2 && parts.length !== 3) return null;
  const groupId = parts[0],
    signature = parts.at(-1)!;
  if (!/^shared-[0-9a-f-]{36}$/i.test(groupId) || !signature) return null;
  if (
    parts.length === 3 &&
    (!/^[1-9][0-9]*$/.test(parts[1]) || !Number.isSafeInteger(Number(parts[1])))
  )
    return null;
  const payload = parts.slice(0, -1).join(".");
  const expected = Buffer.from(sign("group-share:" + payload)),
    received = Buffer.from(signature);
  return expected.length === received.length &&
    timingSafeEqual(expected, received)
    ? groupId
    : null;
}

export function groupShareVersion(token: string) {
  return token.split(".").length === 3 ? Number(token.split(".")[1]) : 0;
}
