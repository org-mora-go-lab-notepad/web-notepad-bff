import { expect, type Page } from "@playwright/test";

import { getApi } from "../../../__util__/request";

export async function changeSharedNote(
  page: Page,
  id: string,
  content: string,
) {
  const record = (
    await (await getApi(page.request, "/api/groups")).json()
  ).groups.find((group: { id: string }) => group.id === id);
  const result = await page.request.post("/api/groups/update", {
    data: {
      id,
      baseRevision: record.revision,
      data: {
        ...record.data,
        tabs: record.data.tabs.map((tab: { content: string }) => ({
          ...tab,
          content,
          title: content,
        })),
      },
    },
  });
  expect(result.ok()).toBe(true);
}
