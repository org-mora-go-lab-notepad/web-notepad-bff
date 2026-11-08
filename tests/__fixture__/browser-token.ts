import { createHmac } from "node:crypto";
export function browserToken(
  expiresAt = Date.now() + 60000,
  user: { id: string; nickname: string } | null = null,
) {
  const payload = Buffer.from(
    JSON.stringify({
      audience: "notepad-browser",
      origin: "http://localhost:3000",
      expiresAt,
      user,
    }),
  ).toString("base64url");
  return (
    payload +
    "." +
    createHmac("sha256", "test-bff-secret")
      .update("browser:" + payload)
      .digest("base64url")
  );
}
