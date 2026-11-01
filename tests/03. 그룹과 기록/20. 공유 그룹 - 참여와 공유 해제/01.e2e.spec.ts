import { expect } from "@playwright/test";

import { getApi } from "../../__util__/request";
import { sharingTest as test } from "./__fixture__";

test("1. 취소 후 다시 공유하면 새 초대 링크만 사용할 수 있다", async ({
  sharing: { owner, guest, id, token, group },
}) => {
  expect(
    (await owner.request.post("/api/groups/revoke", { data: { id } })).ok(),
  ).toBe(true);
  const previous = (await (await getApi(owner.request, "/api/groups")).json())
    .groups[0];
  const reshared = await owner.request.post("/api/groups/share", {
    data: { group: { ...group, ...previous.data } },
  });
  expect(reshared.ok()).toBe(true);
  const next = await reshared.json();
  const nextToken = new URL(next.url).searchParams.get("share");
  expect(nextToken).not.toBe(token);
  expect(
    (
      await guest.request.post("/api/groups/join", { data: { token } })
    ).status(),
  ).toBe(404);
  expect(
    (
      await guest.request.post("/api/groups/join", {
        data: { token: nextToken },
      })
    ).ok(),
  ).toBe(true);
  expect(next.group.tabs[0].content).toBe("Keep this note");
});
