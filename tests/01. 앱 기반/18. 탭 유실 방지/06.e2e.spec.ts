import { createClient } from "@libsql/client";
import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { createClosedTabFixture, createTabFixture } from "../../__fixture__";
import { authenticate, getApi, historyPost, snapshot } from "../../__util__";

test("6. 보관 탭은 확인된 삭제 ID가 있을 때만 제거하고 백업한다", async ({
  page,
  context,
}) => {
  const userId = `archive-${crypto.randomUUID()}`;
  await authenticate(context, userId);
  const original = JSON.parse(snapshot());
  original.closedTabs.push(
    createClosedTabFixture(
      "entry",
      "ungrouped",
      createTabFixture("archived", "보관 원문"),
    ),
  );
  const eventId = crypto.randomUUID();
  expect(
    (
      await historyPost(page, { eventId, snapshot: JSON.stringify(original) })
    ).ok(),
  ).toBe(true);
  const omitted = {
    eventId: crypto.randomUUID(),
    baseEventId: eventId,
    snapshot: snapshot(),
  };
  expect((await historyPost(page, omitted)).status()).toBe(409);
  expect(
    (await historyPost(page, { ...omitted, deletedTabIds: ["archived"] })).ok(),
  ).toBe(true);
  const saved = await (
    await getApi(page.request, "/api/notepad/history")
  ).json();
  expect(JSON.parse(saved.latest.snapshot).closedTabs).toEqual([]);
  const database = createClient({ url: "file:test-results/notepad-e2e.db" });
  try {
    const backup = await database.execute({
      sql: "SELECT snapshot FROM notepad_removal_backups WHERE scope = ? AND revision = ?",
      args: [`personal:${userId}`, eventId],
    });
    expect(backup.rows).toHaveLength(1);
    expect(JSON.parse(String(backup.rows[0].snapshot)).closedTabs).toEqual(
      original.closedTabs,
    );
  } finally {
    database.close();
  }
});
