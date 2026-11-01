import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { authenticate, origin } from "../../__util__";

test("8. 서명이 잘못된 공유 참여 토큰을 거부한다", async ({
  page,
  context,
}) => {
  // Given: 인증 사용자가 서명되지 않은 초대 토큰을 가진다.
  // When: 공유 그룹 참여 API를 호출한다.
  // Then: 토큰 검증 단계에서 400으로 거부한다.
  await authenticate(context);
  const response = await page.request.post("/api/groups/join", {
    headers: origin,
    data: { token: "invalid.token" },
  });

  expect(response.status()).toBe(400);
  expect(response.ok()).toBe(false);
  expect(response.headers()["content-type"]).toContain("application/json");
});
