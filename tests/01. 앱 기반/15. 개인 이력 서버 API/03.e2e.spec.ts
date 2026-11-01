import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import {
  authenticate,
  foreignOrigin,
  historyPost,
  snapshot,
} from "../../__util__";

test("3. 외부 Origin의 개인 이력 저장 요청을 거부한다", async ({
  page,
  context,
}) => {
  // Given: 로그인했지만 공격자 Origin에서 저장을 시도한다.
  // When: 정상 스냅샷을 교차 출처로 POST한다.
  // Then: CSRF 경계에서 403으로 차단한다.
  await authenticate(context);
  const response = await historyPost(
    page,
    { eventId: crypto.randomUUID(), snapshot: snapshot() },
    foreignOrigin,
  );

  expect(response.status()).toBe(403);
  expect(response.ok()).toBe(false);
  expect(response.headers()["content-type"]).toContain("application/json");
});
