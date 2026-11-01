import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { authenticate, invalidGroupBase, origin } from "../../__util__";

test("5. 공백이 포함된 잘못된 로컬 그룹 ID를 거부한다", async ({
  page,
  context,
}) => {
  // Given: 공백이 포함된 잘못된 그룹 ID를 준비한다.
  // When: 인증된 공유 생성 API에 전송한다.
  // Then: 그룹 스키마 검증에서 400으로 거부한다.
  await authenticate(context);
  const group = structuredClone(invalidGroupBase.group);
  group.id = "invalid group id";
  const response = await page.request.post("/api/groups/share", {
    headers: origin,
    data: { group },
  });

  expect(response.status()).toBe(400);
  expect(response.ok()).toBe(false);
  expect(response.headers()["content-type"]).toContain("application/json");
});
