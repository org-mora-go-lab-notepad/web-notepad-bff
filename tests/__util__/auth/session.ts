import type { BrowserContext } from "@playwright/test";

import { authProfile, SESSION_COOKIE, signedSession } from "../../__fixture__";

export const sessionHeaders = (token = signedSession()) => ({
  Cookie: `${SESSION_COOKIE}=${token}`,
});

export async function authenticateBrowser(
  context: BrowserContext,
  token = signedSession({
    ...authProfile,
    id: "browser-" + crypto.randomUUID(),
    expiresAt: Date.now() + 300_000,
  }),
) {
  await context.addCookies([
    { name: SESSION_COOKIE, value: token, url: "http://localhost:3000" },
  ]);
}
