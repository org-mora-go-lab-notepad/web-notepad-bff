import { expect, test } from "@playwright/test";

import {
  createGroupFixture,
  createTabFixture,
  gatewayHeaders,
} from "../../__fixture__";

test("10. BFF는 기존 인증 키 없이 공유 링크 서명에 필요한 ID와 버전만 반환한다", async ({
  request,
}) => {
  const group = createGroupFixture(
    "descriptor-" + crypto.randomUUID(),
    "Descriptor",
    [createTabFixture("note", "Preserved body")],
  );
  const body = JSON.stringify({ group });
  const response = await request.post(
    "http://127.0.0.1:3102/api/groups/share",
    {
      data: body,
      headers: gatewayHeaders("/api/groups/share", "POST", body, {
        id: "descriptor-owner-" + crypto.randomUUID(),
        nickname: "Owner",
      }),
      maxRedirects: 0,
    },
  );
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.shareLink.groupId).toBe(data.group.id);
  expect(data.shareLink.version).toBe(0);
  expect(data.group.tabs[0].content).toBe("Preserved body");
  expect(data).not.toHaveProperty("url");
  expect(data).not.toHaveProperty("token");
  expect(data).not.toHaveProperty("AUTH_SECRET");
  expect(data).not.toHaveProperty("SHARE_TOKEN_SECRET");
  expect(response.headers()["set-cookie"]).toBeUndefined();
});
