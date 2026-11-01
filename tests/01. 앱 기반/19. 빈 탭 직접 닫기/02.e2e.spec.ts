import { expect } from "@playwright/test";

import { sharingTest as test } from "../../__fixture__";
import { getApi } from "../../__util__";

test("2. 공유 빈 탭 닫기도 다른 사용자의 최신 수정이 있으면 거부한다", async ({
  sharing: { owner, id },
}) => {
  const { groups } = await (await getApi(owner.request, "/api/groups")).json();
  const base = groups.find((record: { id: string }) => record.id === id);
  const tabId = base.data.tabs[0].id;
  const updated = {
    ...base.data,
    tabs: [{ ...base.data.tabs[0], content: "다른 사용자의 최신 본문" }],
  };
  expect(
    (
      await owner.request.post("/api/groups/update", {
        data: { id, baseRevision: base.revision, data: updated },
      })
    ).ok(),
  ).toBe(true);
  const rejected = await owner.request.post("/api/groups/update", {
    data: {
      id,
      baseRevision: base.revision,
      data: { ...base.data, tabs: [] },
      deletedTabIds: [tabId],
      emptyClosedTabIds: [tabId],
    },
  });
  expect(rejected.status()).toBe(409);
  const latest = (
    await (await getApi(owner.request, "/api/groups")).json()
  ).groups.find((record: { id: string }) => record.id === id);
  expect(latest.data.tabs).toHaveLength(1);
  expect(latest.data.tabs[0].id).toBe(tabId);
  expect(latest.data.tabs[0].content).toBe("다른 사용자의 최신 본문");
});
