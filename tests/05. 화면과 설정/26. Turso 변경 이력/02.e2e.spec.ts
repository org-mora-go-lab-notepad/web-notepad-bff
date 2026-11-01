import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { signedSession } from "../../__fixture__";
import { authenticateBrowser } from "../../__util__";
import { readCloudHistory } from "./__util__";

const snapshot = (content: string) =>
  JSON.stringify({
    nextTabNumber: 2,
    groups: [
      {
        id: "ungrouped",
        name: "Ungrouped",
        tabs: [
          {
            id: "tab-1",
            title: content,
            content,
            open: true,
          },
        ],
        bookmarks: [],
      },
    ],
    activeGroupId: "ungrouped",
    closedTabs: [],
    settings: { language: "en", fontScale: 0.9 },
  });

test("2. 최신 스냅샷을 조회해도 이전 복구 이력을 유지한다", async ({
  page,
  context,
}) => {
  await authenticateBrowser(
    context,
    signedSession({
      id: `cloud-retention-${crypto.randomUUID()}`,
      nickname: "Cloud User",
      expiresAt: Date.now() + 60_000,
    }),
  );
  const firstEventId = crypto.randomUUID();
  const first = await page.request.post("/api/notepad/history", {
    headers: { Origin: "http://localhost:3000" },
    data: { eventId: firstEventId, snapshot: snapshot("첫 번째 복구 스냅샷") },
  });
  expect(first.ok()).toBe(true);
  const secondEventId = crypto.randomUUID();
  const second = await page.request.post("/api/notepad/history", {
    headers: { Origin: "http://localhost:3000" },
    data: {
      eventId: secondEventId,
      snapshot: snapshot("두 번째 복구 스냅샷"),
      baseEventId: firstEventId,
    },
  });
  expect(second.ok()).toBe(true);

  const history = await readCloudHistory(page);
  expect(history.count).toBe(2);
  expect(history.latest?.eventId).toBe(secondEventId);
  expect(history.latest?.snapshot).toContain("두 번째 복구 스냅샷");
});
