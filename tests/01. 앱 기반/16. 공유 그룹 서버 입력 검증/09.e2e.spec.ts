import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { authenticate, origin } from "../../__util__";

test("9. shared UUID 형식이 아닌 그룹 업데이트를 거부한다", async ({
  page,
  context,
}) => {
  // Given: 로컬 그룹 ID와 빈 공유 데이터를 준비한다.
  // When: 공유 그룹 업데이트 API를 호출한다.
  // Then: 공유 ID 경계를 확인해 400으로 거부한다.
  await authenticate(context);
  const response = await page.request.post("/api/groups/update", {
    headers: origin,
    data: { id: "local", baseRevision: 0, data: {} },
  });

  expect(response.status()).toBe(400);
  expect(response.ok()).toBe(false);
  expect(response.headers()["content-type"]).toContain("application/json");
});
