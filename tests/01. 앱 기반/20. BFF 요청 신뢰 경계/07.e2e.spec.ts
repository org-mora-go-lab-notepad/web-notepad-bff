import { expect, test } from "@playwright/test";

import { gatewayHeaders } from "../../__fixture__";

test("7. BFF는 카카오 OAuth 엔드포인트를 제공하지 않는다", async ({
  request,
}) => {
  const headers = gatewayHeaders("/api/auth/oauth/kakao", "GET");
  const response = await request.fetch(
    "http://127.0.0.1:3102/api/auth/oauth/kakao",
    {
      method: "GET",
      headers,
      maxRedirects: 0,
    },
  );

  expect(
    response.status(),
    "BFF는 카카오 OAuth 엔드포인트를 제공하지 않는다",
  ).toBe(404);
  expect(response.ok()).toBe(false);
  const content = await response.text();
  expect(content).not.toContain("kauth.kakao.com/oauth/authorize");
  expect(response.headers()["set-cookie"]).toBeUndefined();
  expect(response.headers()["location"]).toBeUndefined();
  expect(response.status()).not.toBe(500);
  expect(response.status()).not.toBe(302);
  expect(response.status()).not.toBe(307);
});
