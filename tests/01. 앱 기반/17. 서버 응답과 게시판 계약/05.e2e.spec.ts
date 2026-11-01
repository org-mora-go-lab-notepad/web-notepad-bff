import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { authenticate, foreignOrigin } from "../../__util__";

test("5. 외부 Origin의 알림 전체 삭제를 거부한다", async ({
  page,
  context,
}) => {
  // Given: 로그인 사용자가 외부 Origin에서 알림 삭제를 시도한다.
  // When: 알림 DELETE API를 호출한다.
  // Then: CSRF 경계에서 403으로 차단한다.
  await authenticate(context);
  const response = await page.request.delete("/api/groups/notifications", {
    headers: foreignOrigin,
  });

  expect(response.status()).toBe(403);
  expect(response.ok()).toBe(false);
  expect(response.headers()["content-type"]).toContain("application/json");
  expect(await response.json()).toBeTruthy();
});
