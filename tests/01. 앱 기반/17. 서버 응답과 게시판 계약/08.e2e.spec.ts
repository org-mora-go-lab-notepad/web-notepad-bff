import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { getApi } from "../../__util__";

test("8. 익명 게시판 조회는 401로 거부한다", async ({ request }) => {
  const response = await getApi(request, "/api/board");
  await test.step("인증 없이 게시판에 접근할 수 없다", async () => {
    expect(response.status()).toBe(401);
    expect(response.ok()).toBe(false);
  });
  await test.step("실패 응답에 공유 그룹 데이터가 없다", async () => {
    const payload = await response.json();
    expect(payload).toEqual({ error: "Unauthorized" });
    expect(payload).not.toHaveProperty("posts");
  });
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["set-cookie"]).toBeUndefined();
  expect(response.headers()["location"]).toBeUndefined();
});
