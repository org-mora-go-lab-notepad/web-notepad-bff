import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { authenticate, origin } from "../../__util__";

test("10. shared UUID 형식이 아닌 그룹 나가기 요청을 거부한다", async ({
  page,
  context,
}) => {
  // Given: 존재하지 않는 공유 그룹 ID를 준비한다.
  // When: 공유 그룹 나가기 API를 호출한다.
  // Then: 유효한 참여 관계가 없어 400으로 거부한다.
  await authenticate(context);
  const response = await page.request.post("/api/groups/leave", {
    headers: origin,
    data: { id: "shared-invalid" },
  });

  expect(response.status()).toBe(400);
  expect(response.ok()).toBe(false);
  expect(response.headers()["content-type"]).toContain("application/json");
});
