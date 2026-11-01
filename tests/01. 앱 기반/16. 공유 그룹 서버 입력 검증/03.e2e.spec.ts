import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { authenticate, origin } from "../../__util__";

test("3. 깨진 JSON 공유 생성 요청을 400으로 거부한다", async ({
  page,
  context,
}) => {
  // Given: 인증 사용자가 문법이 깨진 JSON을 준비한다.
  // When: 공유 생성 API에 전송한다.
  // Then: 서버 오류 대신 400 입력 오류를 반환한다.
  await authenticate(context);
  const response = await page.request.post("/api/groups/share", {
    headers: { ...origin, "Content-Type": "application/json" },
    data: "{",
  });

  expect(response.status()).toBe(400);
  expect(response.ok()).toBe(false);
  expect(response.headers()["content-type"]).toContain("application/json");
});
