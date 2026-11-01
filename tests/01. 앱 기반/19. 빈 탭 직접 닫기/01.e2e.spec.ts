import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { authenticate, getApi, historyPost, snapshot } from "../../__util__";

test("1. 빈 탭 직접 닫기에도 오래된 개인 저장 기준으로는 삭제할 수 없다", async ({
  page,
  context,
}) => {
  await authenticate(context);
  const initialId = crypto.randomUUID();
  expect(
    (
      await historyPost(page, {
        eventId: initialId,
        snapshot: snapshot(["원문"]),
      })
    ).ok(),
  ).toBe(true);
  const latestId = crypto.randomUUID();
  expect(
    (
      await historyPost(page, {
        eventId: latestId,
        baseEventId: initialId,
        snapshot: snapshot(["다른 기기 최신 본문"]),
      })
    ).ok(),
  ).toBe(true);
  const removed = JSON.parse(snapshot([]));
  const response = await historyPost(page, {
    eventId: crypto.randomUUID(),
    baseEventId: initialId,
    snapshot: JSON.stringify(removed),
    emptyClosedTabIds: ["tab-1"],
  });
  expect(response.status()).toBe(409);
  const { latest } = await (
    await getApi(page.request, "/api/notepad/history")
  ).json();
  expect(latest.eventId).toBe(latestId);
  expect(JSON.parse(latest.snapshot).groups[0].tabs[0].content).toBe(
    "다른 기기 최신 본문",
  );
  expect(JSON.parse(latest.snapshot).groups[0].tabs[0].id).toBe("tab-1");
});
