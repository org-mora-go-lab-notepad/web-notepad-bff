import { expect, test } from "@playwright/test";

import { gatewayHeaders } from "../../__fixture__";

test("2. 서명 컨텍스트를 변조하면 요청을 거부한다", async ({ request }) => {
  const headers = gatewayHeaders("/api/board", "GET");
  headers["x-notepad-context"] += "a";
  const response = await request.fetch("http://127.0.0.1:3102/api/board", {
    method: "GET",
    headers,
    maxRedirects: 0,
  });

  expect(response.status(), "서명 컨텍스트를 변조하면 요청을 거부한다").toBe(
    401,
  );
  expect(response.ok()).toBe(false);
  const payload = await response.json();
  expect(payload.error).toBe("Unauthorized gateway");
  expect(response.headers()["set-cookie"]).toBeUndefined();
  expect(response.headers()["location"]).toBeUndefined();
  expect(response.status()).not.toBe(500);
  expect(payload).not.toHaveProperty("latest");
  expect(payload).not.toHaveProperty("saved");
});
