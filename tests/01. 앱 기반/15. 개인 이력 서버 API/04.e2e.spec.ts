import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { authenticate, origin } from "../../__util__";

test("4. 깨진 JSON 개인 이력 요청을 400으로 거부한다", async ({
  page,
  context,
}) => {
  // Given: 인증된 사용자가 깨진 JSON 본문을 준비한다.
  // When: 개인 이력 저장 API에 전송한다.
  // Then: 서버 오류 대신 입력 오류 400을 반환한다.
  await authenticate(context);
  const response = await page.request.post("/api/notepad/history", {
    headers: { ...origin, "Content-Type": "application/json" },
    data: "{",
  });

  expect(response.status()).toBe(400);
  expect(response.ok()).toBe(false);
  expect(response.headers()["content-type"]).toContain("application/json");
});
