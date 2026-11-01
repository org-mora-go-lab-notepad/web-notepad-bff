import { createClient } from "@libsql/client";
import { expect } from "@playwright/test";

import { sharingTest as test } from "../../__fixture__";
import { getApi } from "../../__util__";

test("5. 공유 탭 제거 전 원본을 별도 백업에 보관한다", async ({
  sharing: { owner, id },
}) => {
  const record = (
    await (await getApi(owner.request, "/api/groups")).json()
  ).groups.find((item: { id: string }) => item.id === id);
  const removed = await owner.request.post("/api/groups/update", {
    data: {
      id,
      baseRevision: record.revision,
      data: { ...record.data, tabs: [], bookmarks: [] },
      deletedTabIds: record.data.tabs.map((tab: { id: string }) => tab.id),
      confirmedDeletion: true,
    },
  });
  expect(removed.ok()).toBe(true);
  // Fixed local E2E database: never read production credentials in this test.
  const database = createClient({ url: "file:test-results/notepad-e2e.db" });
  try {
    const backup = await database.execute({
      sql: "SELECT snapshot FROM notepad_removal_backups WHERE scope = ? AND revision = ?",
      args: [`shared:${id}`, String(record.revision)],
    });
    expect(backup.rows).toHaveLength(1);
    expect(JSON.parse(String(backup.rows[0].snapshot)).tabs).toEqual(
      record.data.tabs,
    );
    expect(JSON.parse(String(backup.rows[0].snapshot)).bookmarks).toEqual(
      record.data.bookmarks,
    );
  } finally {
    database.close();
  }
});
