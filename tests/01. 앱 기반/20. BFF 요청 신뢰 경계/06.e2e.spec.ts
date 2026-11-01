import { expect, test } from "@playwright/test";

import { gatewayHeaders } from "../../__fixture__";

test("6. 서명 이후 변경된 본문을 저장하지 않는다", async ({ request }) => {
  const headers = gatewayHeaders("/api/notepad/history", "POST", "original", {
    id: "signed-user",
    nickname: "Signer",
  });
  const response = await request.fetch(
    "http://127.0.0.1:3102/api/notepad/history",
    {
      method: "POST",
      headers,
      data: "changed",
    },
  );

  expect(response.status(), "서명 이후 변경된 본문을 저장하지 않는다").toBe(
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
