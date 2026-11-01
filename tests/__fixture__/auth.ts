import { createHmac } from "node:crypto";

// Independent wire-format fixture: requests still pass through the real route and verifier.
export const SESSION_COOKIE = "web-notepad-session";
export const OAUTH_COOKIE = "web-notepad-kakao-state";
export const authProfile = { id: "e2e-user", nickname: "테스트 사용자" };

export function signedSession(
  payload: unknown = { ...authProfile, expiresAt: Date.now() + 60_000 },
) {
  return signedSessionText(JSON.stringify(payload));
}

export function signedSessionText(value: string) {
  const encoded = Buffer.from(value).toString("base64url");
  const signature = createHmac("sha256", "test-auth-secret")
    .update(encoded)
    .digest("base64url");
  return `${encoded}.${signature}`;
}
