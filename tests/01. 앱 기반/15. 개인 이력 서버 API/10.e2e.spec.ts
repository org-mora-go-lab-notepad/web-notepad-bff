import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { authenticate, historyPost, snapshot } from "../../__util__";

test("10. 잘못된 기준 event ID는 최신 이력을 포함한 409를 반환한다", async ({
  page,
  context,
}) => {
  // Given: 서버 최신 eventId와 다른 baseEventId를 준비한다.
  // When: 오래된 기준으로 새 스냅샷을 저장한다.
  // Then: 409와 실제 최신 이벤트를 반환해 충돌을 알린다.
  await authenticate(context);
  const first = crypto.randomUUID();
  await historyPost(page, {
    eventId: first,
    snapshot: snapshot(["first"]),
  });
  const conflict = await historyPost(page, {
    eventId: crypto.randomUUID(),
    snapshot: snapshot(["second"]),
    baseEventId: crypto.randomUUID(),
  });
  const payload = await conflict.json();

  expect(conflict.status()).toBe(409);
  expect(payload.latest.eventId).toBe(first);
});
