import { expect } from "@playwright/test";

import {
  apiTest as test,
  createGroupFixture,
  createTabFixture,
  SESSION_COOKIE,
  signedSession,
} from "../../__fixture__";
import { getApi } from "../../__util__/request";

test("2. Notes는 닫힌 탭을 포함해 다섯 상태의 전체 카드를 합산한다", async ({
  request,
}) => {
  const token = signedSession({
    id: crypto.randomUUID(),
    nickname: "Count test",
    expiresAt: Date.now() + 300000,
  });
  const headers = { Cookie: SESSION_COOKIE + "=" + token };
  const source = createGroupFixture("count-source", "All status count", [
    createTabFixture("note", "N", { dashboardStatus: "icebox" }),
    createTabFixture("todo", "Todo note", { dashboardStatus: "todo" }),
    createTabFixture("ready", "Ready note", { dashboardStatus: "ready" }),
    createTabFixture("doing", "Doing note", {
      dashboardStatus: "in-progress",
      open: false,
    }),
    createTabFixture("done", "Done note", {
      dashboardStatus: "done",
      open: false,
    }),
    createTabFixture("empty", ""),
  ]);
  const created = await request.post("/api/groups/share", {
    headers,
    data: { group: source },
  });
  expect(created.ok()).toBeTruthy();
  const { group } = await created.json();
  try {
    const before = await (
      await getApi(request, "/api/groups", { headers })
    ).json();
    const original = before.groups.find(
      (item: { id: string }) => item.id === group.id,
    );
    const response = await getApi(request, "/api/board", { headers });
    expect(response.status()).toBe(200);
    const { posts } = await response.json();
    const post = posts.find((item: { id: string }) => item.id === group.id);
    expect(post.noteCount).toBe(5);
    const unchanged = await getApi(request, "/api/groups", {
      headers,
    });
    expect(unchanged.ok()).toBeTruthy();
    const saved = await unchanged.json();
    expect(
      saved.groups.find((item: { id: string }) => item.id === group.id).data
        .tabs,
    ).toEqual(original.data.tabs);
  } finally {
    await request.post("/api/groups/revoke", {
      headers,
      data: { id: group.id },
    });
  }
});
