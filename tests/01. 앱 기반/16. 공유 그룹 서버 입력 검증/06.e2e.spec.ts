import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { authenticate, invalidGroupBase, origin } from "../../__util__";

test("6. 60자를 초과한 공유 그룹 이름을 거부한다", async ({
  page,
  context,
}) => {
  // Given: 60자를 넘는 그룹명을 준비한다.
  // When: 인증된 공유 생성 API에 전송한다.
  // Then: 그룹 스키마 검증에서 400으로 거부한다.
  await authenticate(context);
  const group = structuredClone(invalidGroupBase.group);
  group.name = "x".repeat(61);
  const response = await page.request.post("/api/groups/share", {
    headers: origin,
    data: { group },
  });

  expect(response.status()).toBe(400);
  expect(response.ok()).toBe(false);
  expect(response.headers()["content-type"]).toContain("application/json");
});
