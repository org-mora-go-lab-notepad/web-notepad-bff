import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { authenticate, foreignOrigin, invalidGroupBase } from "../../__util__";

test("2. 외부 Origin의 공유 생성 요청을 거부한다", async ({
  page,
  context,
}) => {
  // Given: 로그인 사용자가 외부 Origin에서 공유를 시도한다.
  // When: 정상 그룹을 공유 생성 API에 전송한다.
  // Then: CSRF 경계가 요청을 403으로 차단한다.
  await authenticate(context);
  const response = await page.request.post("/api/groups/share", {
    headers: foreignOrigin,
    data: invalidGroupBase,
  });

  expect(response.status()).toBe(403);
  expect(response.ok()).toBe(false);
  expect(response.headers()["content-type"]).toContain("application/json");
});
