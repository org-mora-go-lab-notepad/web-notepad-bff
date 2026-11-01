import { type BrowserContext, type Page } from "@playwright/test";

import { signedSession } from "../__fixture__";
import { authenticateBrowser } from "./auth";

export const origin = { Origin: "http://localhost:3000" };
export const foreignOrigin = { Origin: "https://attacker.example" };

export function sessionToken(id = `server-${crypto.randomUUID()}`) {
  return signedSession({
    id,
    nickname: "Server Tester",
    expiresAt: Date.now() + 300_000,
  });
}

export async function authenticate(context: BrowserContext, id?: string) {
  await authenticateBrowser(context, sessionToken(id));
}

export function snapshot(contents = ["server note"]) {
  return JSON.stringify({
    nextTabNumber: contents.length + 1,
    groups: [
      {
        id: "ungrouped",
        name: "Ungrouped",
        tabs: contents.map((content, index) => ({
          id: `tab-${index + 1}`,
          title: content,
          content,
          open: true,
        })),
        bookmarks: [],
      },
    ],
    activeGroupId: "ungrouped",
    closedTabs: [],
    settings: { language: "en", fontScale: 0.9 },
  });
}

export async function historyPost(
  page: Page,
  body: Record<string, unknown>,
  headers = origin,
) {
  return page.request.post("/api/notepad/history", {
    headers,
    data: body,
  });
}

export const invalidGroupBase = {
  group: {
    id: "local-group",
    name: "Server Group",
    tabs: [{ id: "tab-1", content: "valid content" }],
    bookmarks: [],
  },
};
