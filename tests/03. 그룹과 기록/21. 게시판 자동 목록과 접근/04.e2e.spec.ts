import { expect } from "@playwright/test";

import {
  boardTest as test,
  SESSION_COOKIE,
  signedSession,
} from "../../__fixture__";
import { getApi } from "../../__util__/request";

test("4. 게시판은 참여 중인 사용자에게만 공유 그룹을 반환한다", async ({
  request,
  boardPost,
}) => {
  const token = signedSession({
    id: crypto.randomUUID(),
    nickname: "Board member",
    expiresAt: Date.now() + 60_000,
  });
  const headers = { Cookie: SESSION_COOKIE + "=" + token };
  const findPost = async () => {
    const response = await getApi(request, "/api/board", { headers });
    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"]).toContain("no-store");
    const { posts } = await response.json();
    return posts.find((post: { id: string }) => post.id === boardPost.id);
  };
  expect(await findPost()).toBeUndefined();
  const invite = new URL(boardPost.inviteUrl).searchParams.get("share");
  const join = await request.post("/api/groups/join", {
    headers,
    data: { token: invite },
  });
  expect(join.ok()).toBe(true);
  expect(await findPost()).toMatchObject({
    viewerRole: "member",
    notes: boardPost.notes,
  });
  const leave = await request.post("/api/groups/leave", {
    headers,
    data: { id: boardPost.id },
  });
  expect(leave.ok()).toBe(true);
  expect(await findPost()).toBeUndefined();
});
