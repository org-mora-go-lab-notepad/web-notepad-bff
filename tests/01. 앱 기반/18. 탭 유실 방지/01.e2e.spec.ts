import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { authenticate, getApi, historyPost, snapshot } from "../../__util__";

test("1. 누락된 개인 탭은 baseEventId 유무와 관계없이 삭제되지 않는다", async ({
  page,
  context,
}) => {
  await authenticate(context);
  const original = JSON.parse(snapshot(["", "ㅎㅎ", "닫힌 원문"]));
  original.groups[0].tabs[2].open = false;
  const eventId = crypto.randomUUID();
  expect(
    (
      await historyPost(page, { eventId, snapshot: JSON.stringify(original) })
    ).ok(),
  ).toBe(true);
  const missing = { ...original, groups: [] };
  for (const base of [{}, { baseEventId: eventId }]) {
    const rejected = await historyPost(page, {
      ...base,
      eventId: crypto.randomUUID(),
      snapshot: JSON.stringify(missing),
    });
    expect(rejected.status()).toBe(409);
    expect((await rejected.json()).protectedTabIds).toEqual([
      "tab-1",
      "tab-2",
      "tab-3",
    ]);
  }
  const saved = await (
    await getApi(page.request, "/api/notepad/history")
  ).json();
  expect(saved.latest.eventId).toBe(eventId);
  expect(JSON.parse(saved.latest.snapshot).groups).toEqual(original.groups);
  expect(saved.count).toBe(1);
});
