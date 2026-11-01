import { expect } from "@playwright/test";

import { sharingTest as test } from "../../__fixture__";
import { getApi, historyPost, snapshot } from "../../__util__";

test("4. 공유 탭 이동은 대상 DB 저장 완료까지 원본을 보존한다", async ({
  sharing: { owner, id },
}) => {
  const records = await (await getApi(owner.request, "/api/groups")).json();
  const record = records.groups.find((item: { id: string }) => item.id === id);
  const tab = record.data.tabs[0];
  const payload = {
    id,
    baseRevision: record.revision,
    data: { ...record.data, tabs: [] },
    deletedTabIds: [tab.id],
    movedTabIds: [tab.id],
  };
  const premature = await owner.request.post("/api/groups/update", {
    data: payload,
  });
  expect(premature.status()).toBe(503);
  const blocked = (
    await (await getApi(owner.request, "/api/groups")).json()
  ).groups.find((item: { id: string }) => item.id === id);
  expect(blocked.data.tabs).toEqual(record.data.tabs);
  const destination = JSON.parse(snapshot());
  destination.groups[0].tabs = [tab];
  expect(
    (
      await historyPost(owner, {
        eventId: crypto.randomUUID(),
        snapshot: JSON.stringify(destination),
      })
    ).ok(),
  ).toBe(true);
  const completed = await owner.request.post("/api/groups/update", {
    data: payload,
  });
  expect(completed.ok()).toBe(true);
  expect((await completed.json()).group.data.tabs).toEqual([]);
  const saved = await (
    await getApi(owner.request, "/api/notepad/history")
  ).json();
  expect(JSON.parse(saved.latest.snapshot).groups[0].tabs).toEqual([tab]);
});
