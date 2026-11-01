import { createHmac } from "node:crypto";

import { expect, test } from "@playwright/test";

import { gatewayHeaders } from "../../__fixture__";

test("9. 원본 공유 토큰만으로는 프런트 검증 증명 없이 BFF에 참여할 수 없다", async ({
  request,
}) => {
  const id = "shared-" + crypto.randomUUID();
  const token =
    id +
    "." +
    createHmac("sha256", "test-auth-secret")
      .update("group-share:" + id)
      .digest("base64url");
  const body = JSON.stringify({ token });
  const headers = gatewayHeaders("/api/groups/join", "POST", body, {
    id: "unattested-" + crypto.randomUUID(),
    nickname: "Unattested",
  });
  const response = await request.post("http://127.0.0.1:3102/api/groups/join", {
    data: body,
    headers,
    maxRedirects: 0,
  });
  expect(response.status()).toBe(400);
  expect(response.ok()).toBe(false);
  expect(await response.json()).toEqual({ error: "Invalid share link" });
  expect(response.headers()["set-cookie"]).toBeUndefined();
  expect(response.headers()["location"]).toBeUndefined();
  expect(response.status()).not.toBe(503);
});
