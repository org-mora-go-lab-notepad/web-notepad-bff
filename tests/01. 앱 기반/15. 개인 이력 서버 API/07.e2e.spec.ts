import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { authenticate, historyPost, snapshot } from "../../__util__";

test("7. 현재 세션과 다른 userId의 저장 요청을 거부한다", async ({
  page,
  context,
}) => {
  // Given: 현재 세션과 다른 userId를 본문에 삽입한다.
  // When: 정상 스냅샷 저장을 요청한다.
  // Then: 본문으로 소유자를 위조하지 못하고 403을 반환한다.
  await authenticate(context);
  const response = await historyPost(page, {
    eventId: crypto.randomUUID(),
    snapshot: snapshot(),
    userId: "another-user",
  });

  expect(response.status()).toBe(403);
  expect(response.ok()).toBe(false);
  expect(response.headers()["content-type"]).toContain("application/json");
});
