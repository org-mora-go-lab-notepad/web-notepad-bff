import { expect } from "@playwright/test";

import { sharingTest as test } from "../../__fixture__";
import { getApi } from "../../__util__/request";

test("2. 짧거나 빈 공유 탭도 명시적 삭제 의도 없이는 서버에서 보존한다", async ({
  sharing: { owner, id },
}) => {
  const groups = await (await getApi(owner.request, "/api/groups")).json();
  const record = groups.groups.find((group: { id: string }) => group.id === id);
  const originalTab = record.data.tabs[0];

  for (const content of ["a", "ab", ""]) {
    const response = await owner.request.post("/api/groups/update", {
      data: {
        id,
        baseRevision: record.revision,
        data: {
          ...record.data,
          tabs: [{ ...originalTab, content }],
        },
        deletedTabIds: [],
      },
    });
    expect(response.ok()).toBe(true);
    const saved = (await response.json()).group;
    expect(saved.data.tabs).toHaveLength(1);
    expect(saved.data.tabs[0].id).toBe(originalTab.id);
    expect(saved.data.tabs[0].content).toBe(content);
    record.revision = saved.revision;
    record.data = saved.data;
  }
});
