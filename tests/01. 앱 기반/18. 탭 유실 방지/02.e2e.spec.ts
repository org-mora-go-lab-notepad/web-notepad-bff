import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { createGroupFixture, createTabFixture } from "../../__fixture__";
import { authenticate, getApi, historyPost, snapshot } from "../../__util__";

test("2. 그룹 이동 저장은 이동 탭과 다른 그룹의 기록을 모두 유지한다", async ({
  page,
  context,
}) => {
  await authenticate(context);
  const original = JSON.parse(snapshot(["남길 원문", "ㅎㅎ"]));
  original.groups.push(
    createGroupFixture("target", "mora", [
      createTabFixture("keep", "기존 mora", { open: false }),
    ]),
  );
  const eventId = crypto.randomUUID();
  expect(
    (
      await historyPost(page, { eventId, snapshot: JSON.stringify(original) })
    ).ok(),
  ).toBe(true);
  const moved = structuredClone(original);
  moved.groups[1].tabs.push(moved.groups[0].tabs.pop());
  const response = await historyPost(page, {
    eventId: crypto.randomUUID(),
    baseEventId: eventId,
    snapshot: JSON.stringify(moved),
  });
  expect(response.ok()).toBe(true);
  const saved = await (
    await getApi(page.request, "/api/notepad/history")
  ).json();
  const groups = JSON.parse(saved.latest.snapshot).groups;
  expect(groups[0].tabs).toEqual(original.groups[0].tabs.slice(0, 1));
  expect(groups[1].tabs).toEqual([
    ...original.groups[1].tabs,
    original.groups[0].tabs[1],
  ]);
});
