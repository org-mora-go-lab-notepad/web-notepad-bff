import { expect } from "@playwright/test";

import { sharingTest as test } from "../../__fixture__";
import { getApi } from "../../__util__/request";

test("1. 삭제 의도가 없는 오래된 요청은 공유 탭을 지우지 못한다", async ({
  sharing: { owner, id },
}) => {
  const record = (
    await (await getApi(owner.request, "/api/groups")).json()
  ).groups.find((group: { id: string }) => group.id === id);
  const tab = record.data.tabs[0];
  const emptyData = { ...record.data, tabs: [], bookmarks: [] };

  const staleUpdate = await owner.request.post("/api/groups/update", {
    data: {
      id,
      baseRevision: record.revision,
      data: emptyData,
    },
  });
  expect(staleUpdate.status()).toBe(409);
  const rejected = await staleUpdate.json();
  expect(rejected.reset).toBe(true);
  expect(
    rejected.group.data.tabs.map((item: { id: string }) => item.id),
  ).toEqual([tab.id]);

  const legacyDeleteIntent = await owner.request.post("/api/groups/update", {
    data: {
      id,
      baseRevision: record.revision,
      data: emptyData,
      deletedTabIds: [tab.id],
    },
  });
  expect(legacyDeleteIntent.status()).toBe(409);
  expect((await legacyDeleteIntent.json()).group.data.tabs).toEqual(
    record.data.tabs,
  );
  const explicitDelete = await owner.request.post("/api/groups/update", {
    data: {
      id,
      baseRevision: record.revision,
      data: emptyData,
      deletedTabIds: [tab.id],
      confirmedDeletion: true,
    },
  });
  expect(explicitDelete.ok()).toBe(true);
  expect((await explicitDelete.json()).group.data.tabs).toEqual([]);
});
