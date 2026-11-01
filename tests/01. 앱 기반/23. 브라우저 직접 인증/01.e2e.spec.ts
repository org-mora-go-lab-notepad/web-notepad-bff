import { expect, test } from "@playwright/test";

import { browserToken } from "../../__fixture__";
import { getApi } from "../../__util__/request";

test("1. 서명된 단기 토큰으로 BFF를 직접 읽는다", async ({ request }) => {
  const origin = "http://localhost:3000";
  const preflight = await request.fetch("http://127.0.0.1:3102/api/board", {
    method: "OPTIONS",
    headers: {
      Origin: origin,
      "Access-Control-Request-Method": "GET",
      "Access-Control-Request-Headers": "authorization",
    },
  });
  expect(preflight.status()).toBe(204);
  expect(preflight.headers()["access-control-allow-origin"]).toBe(origin);
  const response = await getApi(request, "http://127.0.0.1:3102/api/board", {
    headers: {
      Authorization: "Bearer " + browserToken(),
      Origin: origin,
      "x-user-id": "forged-owner",
    },
  });
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  expect(response.headers()["access-control-allow-origin"]).toBe(origin);
  expect(response.headers()["vary"]).toContain("Origin");
  expect(response.headers()["set-cookie"]).toBeUndefined();
  const payload = await response.json();
  expect(Array.isArray(payload.posts)).toBe(true);
  expect(payload).not.toHaveProperty("error");
  expect(payload).not.toHaveProperty("secret");
  expect(payload).not.toHaveProperty("user");
});
