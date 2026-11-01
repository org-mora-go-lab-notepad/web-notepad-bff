import { expect } from "@playwright/test";

import { sharingTest as test } from "../../__fixture__";
import { getApi } from "../../__util__/request";
test("1. 삭제된 탭의 이전 수정 알림과 삭제 알림은 목록에서 제외한다", async ({
  sharing: { owner, guest, id },
}) => {
  let record = (
    await (await getApi(guest.request, "/api/groups")).json()
  ).groups.find((g: { id: string }) => g.id === id);
  const old = record.data.tabs[0];
  const other = {
    ...old,
    id: old.id + "-other",
    title: "Remaining note",
    content: "Remaining note",
  };
  let response = await guest.request.post("/api/groups/update", {
    data: {
      id,
      baseRevision: record.revision,
      data: {
        ...record.data,
        tabs: [
          {
            ...old,
            content: "Edited before removal",
            title: "Edited before removal",
          },
          other,
        ],
      },
    },
  });
  expect(response.ok()).toBe(true);
  record = (await response.json()).group;
  expect(
    (
      await (await getApi(owner.request, "/api/groups/notifications")).json()
    ).notifications.some((n: { tabId: string }) => n.tabId === old.id),
  ).toBe(true);
  response = await guest.request.post("/api/groups/update", {
    data: {
      id,
      baseRevision: record.revision,
      data: { ...record.data, tabs: [other] },
      deletedTabIds: [old.id],
      confirmedDeletion: true,
    },
  });
  expect(response.ok()).toBe(true);
  const result = await (
    await getApi(owner.request, "/api/groups/notifications")
  ).json();
  expect(result.notifications).toEqual([]);
});
