import { expect } from "@playwright/test";

import { gatewayHeaders, sharingTest as test } from "../../__fixture__";
import { getApi } from "../../__util__/request";
import { changeSharedNote } from "./__util__";

test("3. 알람 변경 API는 인증과 동일 출처를 검증하고 다른 사용자의 알람 읽음을 변경하지 않는다", async ({
  browser,
  sharing: { owner, guest, id },
}) => {
  await changeSharedNote(guest, id, "Isolated unread alarm");
  const notifications = (
    await (await getApi(owner.request, "/api/groups/notifications")).json()
  ).notifications;
  const alarm = notifications.find((n: { summary: string }) =>
    n.summary.includes("Isolated unread alarm"),
  );
  expect(alarm.unread).toBe(true);
  const anonymous = await browser.newContext();
  try {
    expect(
      (
        await anonymous.request.delete(
          "http://127.0.0.1:3102/api/groups/notifications",
          { headers: gatewayHeaders("/api/groups/notifications", "DELETE") },
        )
      ).status(),
    ).toBe(401);
  } finally {
    await anonymous.close();
  }
  expect(
    (
      await owner.request.delete("/api/groups/notifications", {
        headers: { origin: "https://example.invalid" },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await owner.request.post("/api/groups/notifications/read", {
        headers: { origin: "https://example.invalid" },
        data: { id: alarm.id },
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await owner.request.post("/api/groups/notifications/read", {
        data: { id: -1 },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await guest.request.post("/api/groups/notifications/read", {
        data: { id: alarm.id },
      })
    ).ok(),
  ).toBe(true);
  const remaining = (
    await (await getApi(owner.request, "/api/groups/notifications")).json()
  ).notifications;
  expect(remaining.find((n: { id: number }) => n.id === alarm.id).unread).toBe(
    true,
  );
});
