import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { authenticate, getApi } from "../../__util__";

test("2. 공유 그룹 목록은 인증 후 private no-store 배열로 반환한다", async ({
  page,
  context,
}) => {
  // Given: 유효한 사용자 세션으로 인증한다.
  // When: 자신의 그룹 목록을 조회한다.
  // Then: 배열을 반환하고 개인 캐시 금지 정책을 적용한다.
  await authenticate(context);
  const response = await getApi(page.request, "/api/groups");
  const payload = await response.json();

  expect(response.status()).toBe(200);
  expect(response.ok()).toBe(true);
  expect(response.headers()["cache-control"]).toBe("private, no-store");
  expect(Array.isArray(payload.groups)).toBe(true);
});
