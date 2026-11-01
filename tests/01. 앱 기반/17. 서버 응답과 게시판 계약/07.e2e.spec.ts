import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { authenticate, origin } from "../../__util__";

test("7. 0 이하의 알림 ID를 읽음 처리하지 않는다", async ({
  page,
  context,
}) => {
  // Given: 알림 ID 경계값 0을 준비한다.
  // When: 인증된 읽음 API에 전송한다.
  // Then: 양수가 아닌 ID를 400으로 거부한다.
  await authenticate(context);
  const response = await page.request.post("/api/groups/notifications/read", {
    headers: origin,
    data: { id: 0 },
  });

  expect(response.status()).toBe(400);
  expect(response.ok()).toBe(false);
  expect(response.headers()["content-type"]).toContain("application/json");
});
