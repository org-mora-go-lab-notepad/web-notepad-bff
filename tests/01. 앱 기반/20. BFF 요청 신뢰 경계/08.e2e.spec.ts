import { expect, test } from "@playwright/test";

import { gatewayHeaders } from "../../__fixture__";

test("8. 서명된 익명 요청에 사용자 헤더를 추가해도 개인 이력을 볼 수 없다", async ({
  request,
}) => {
  const headers = {
    ...gatewayHeaders("/api/notepad/history", "GET"),
    "x-user-id": "owner",
    Cookie: "web-notepad-session=forged",
  };
  const response = await request.fetch(
    "http://127.0.0.1:3102/api/notepad/history",
    {
      method: "GET",
      headers,
      maxRedirects: 0,
    },
  );

  expect(
    response.status(),
    "서명된 익명 요청에 사용자 헤더를 추가해도 개인 이력을 볼 수 없다",
  ).toBe(401);
  expect(response.ok()).toBe(false);
  const payload = await response.json();
  expect(payload.error).toBe("Unauthorized");
  expect(response.headers()["set-cookie"]).toBeUndefined();
  expect(response.headers()["location"]).toBeUndefined();
  expect(response.status()).not.toBe(500);
  expect(payload).not.toHaveProperty("latest");
  expect(payload).not.toHaveProperty("saved");
});
