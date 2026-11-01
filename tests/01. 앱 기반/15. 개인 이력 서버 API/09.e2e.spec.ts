import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { authenticate, getApi, historyPost, snapshot } from "../../__util__";

test("9. 개인 이력 서버는 짧은 탭과 긴 탭을 임의로 제거하지 않고 모두 보존한다", async ({
  page,
  context,
}) => {
  // Given: 1자와 3자 탭이 함께 있는 스냅샷을 만든다.
  // When: 저장 후 최신 이력을 다시 조회한다.
  // Then: 글자 수와 관계없이 두 탭이 모두 DB 스냅샷에 남는다.
  await authenticate(context);
  const eventId = crypto.randomUUID();
  const save = await historyPost(page, {
    eventId,
    snapshot: snapshot(["a", "abc"]),
  });
  const response = await getApi(page.request, "/api/notepad/history");
  const latest = (await response.json()).latest;
  const contents = JSON.parse(latest.snapshot).groups[0].tabs.map(
    (tab: { content: string }) => tab.content,
  );

  expect(save.ok()).toBe(true);
  expect(latest.eventId).toBe(eventId);
  expect(contents).toEqual(["a", "abc"]);
});
