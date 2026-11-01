import { expect } from "@playwright/test";

import {
  apiTest as test,
  createGroupFixture,
  createTabFixture,
  signedSession,
} from "../../__fixture__";
import { getApi, sessionHeaders, snapshot } from "../../__util__";

test("1. 개인과 공유 그룹을 동시에 저장해도 잠금 오류 없이 모든 원문을 보존한다", async ({
  request,
}) => {
  const users = Array.from({ length: 12 }, (_, index) => ({
    headers: sessionHeaders(
      signedSession({
        id: "concurrent-" + crypto.randomUUID(),
        nickname: "Writer " + index,
        expiresAt: Date.now() + 60_000,
      }),
    ),
    eventId: crypto.randomUUID(),
    content: "Concurrent note " + index,
    group: createGroupFixture("parallel-" + crypto.randomUUID(), "Parallel", [
      createTabFixture("note", "Shared original " + index),
    ]),
  }));
  const results = await Promise.all(
    users.map(async (user) => {
      const [personal, shared, personalRead, sharedRead] = await Promise.all([
        request.post("/api/notepad/history", {
          headers: user.headers,
          data: { eventId: user.eventId, snapshot: snapshot([user.content]) },
        }),
        request.post("/api/groups/share", {
          headers: user.headers,
          data: { group: user.group },
        }),
        getApi(request, "/api/notepad/history", { headers: user.headers }),
        getApi(request, "/api/groups", { headers: user.headers }),
      ]);
      return {
        personal: personal.status(),
        shared: shared.status(),
        personalRead: personalRead.status(),
        sharedRead: sharedRead.status(),
      };
    }),
  );
  expect(results).toEqual(
    users.map(() => ({
      personal: 200,
      shared: 200,
      personalRead: 200,
      sharedRead: 200,
    })),
  );
  for (const user of users) {
    const history = await getApi(request, "/api/notepad/history", {
      headers: user.headers,
    });
    const groups = await getApi(request, "/api/groups", {
      headers: user.headers,
    });
    expect(history.status()).toBe(200);
    expect(groups.status()).toBe(200);
    const { latest } = await history.json();
    expect(latest.eventId).toBe(user.eventId);
    expect(JSON.parse(latest.snapshot).groups[0].tabs[0].content).toBe(
      user.content,
    );
    expect((await groups.json()).groups[0].data.tabs[0].content).toBe(
      user.group.tabs[0].content,
    );
  }
});
