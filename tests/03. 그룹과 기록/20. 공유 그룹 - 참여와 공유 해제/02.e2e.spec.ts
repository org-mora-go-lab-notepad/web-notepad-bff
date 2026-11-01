import { expect } from "@playwright/test";

import { getApi } from "../../__util__/request";
import { sharingTest as test } from "./__fixture__";

test("2. 나가기와 공유 취소는 인증과 소유권 및 요청 출처를 검사한다", async ({
  sharing: { owner, guest, id },
  request,
}) => {
  for (const action of ["leave", "revoke"])
    expect(
      (await request.post("/api/groups/" + action, { data: { id } })).status(),
    ).toBe(401);
  expect(
    (await owner.request.post("/api/groups/leave", { data: { id } })).status(),
  ).toBe(403);
  expect(
    (await guest.request.post("/api/groups/revoke", { data: { id } })).status(),
  ).toBe(403);
  expect(
    (
      await owner.request.post("/api/groups/revoke", {
        headers: { Origin: "https://other.example" },
        data: { id },
      })
    ).status(),
  ).toBe(403);
  const groups = (await (await getApi(guest.request, "/api/groups")).json())
    .groups;
  expect(
    (
      await guest.request.post("/api/groups/share", {
        data: { group: { ...groups[0].data, pinned: false } },
      })
    ).status(),
  ).toBe(403);
});
