import { expect, test } from "@playwright/test";

import { gatewayHeaders } from "../../__fixture__";

test("5. 다른 HTTP 메서드에 발급한 서명을 재사용할 수 없다", async ({
  request,
}) => {
  const headers = gatewayHeaders("/api/notepad/history", "GET");
  const response = await request.fetch(
    "http://127.0.0.1:3102/api/notepad/history",
    {
      method: "POST",
      headers,
      data: "{}",
    },
  );

  expect(
    response.status(),
    "다른 HTTP 메서드에 발급한 서명을 재사용할 수 없다",
  ).toBe(401);
  expect(response.ok()).toBe(false);
  const payload = await response.json();
  expect(payload.error).toBe("Unauthorized gateway");
  expect(response.headers()["set-cookie"]).toBeUndefined();
  expect(response.headers()["location"]).toBeUndefined();
  expect(response.status()).not.toBe(500);
  expect(payload).not.toHaveProperty("latest");
  expect(payload).not.toHaveProperty("saved");
});
