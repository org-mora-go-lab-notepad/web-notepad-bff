import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { createGroupFixture, createTabFixture } from "../../__fixture__";
import { authenticate, getApi, historyPost, snapshot } from "../../__util__";

test("3. 저장된 공유 그룹으로 전환할 때만 개인 원본 제외를 허용한다", async ({
  page,
  context,
}) => {
  await authenticate(context);
  const original = JSON.parse(snapshot());
  const group = createGroupFixture("convert", "전환 그룹", [
    createTabFixture("original", "공유할 원본"),
  ]);
  original.groups.push(group);
  const eventId = crypto.randomUUID();
  expect(
    (
      await historyPost(page, { eventId, snapshot: JSON.stringify(original) })
    ).ok(),
  ).toBe(true);
  group.tabs[0].content = "공유 직전 수정한 본문";
  const sharing = await page.request.post("/api/groups/share", {
    data: { group },
  });
  expect(sharing.ok()).toBe(true);
  const { group: shared } = await sharing.json();
  expect(shared.tabs[0].content).toBe("공유 직전 수정한 본문");
  const response = await historyPost(page, {
    eventId: crypto.randomUUID(),
    baseEventId: eventId,
    snapshot: snapshot(),
    movedTabs: [{ id: "original", content: "공유 직전 수정한 본문" }],
  });
  expect(response.ok()).toBe(true);
  const groups = (await (await getApi(page.request, "/api/groups")).json())
    .groups;
  expect(
    groups.find((item: { id: string }) => item.id === shared.id).data.tabs[0],
  ).toMatchObject({
    id: `${shared.id}-original`,
    content: "공유 직전 수정한 본문",
  });
});
