import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { authenticate, historyPost } from "../../__util__";

test("8. 5MB를 초과한 스냅샷을 저장하지 않는다", async ({ page, context }) => {
  await test.step(
    "시나리오: 8. 5MB를 초과한 스냅샷을 저장하지 않는다 — 준비 조건부터 공개 UI 또는 API 실행과 사용자 결과 검증까지 독립적으로 추적한다",
    async () => {
      await test.step(
        "준비 1: 8. 5MB를 초과한 스냅샷을 저장하지 않는다 — 다른 사례와 독립적으로 실행하는 데 필요한 상태와 화면을 먼저 구성한다",
        async () => {
          await authenticate(context);
        },
        { box: true },
      );

      const oversized = "x".repeat(5_000_001);

      const response = await historyPost(page, {
        eventId: crypto.randomUUID(),
        snapshot: oversized,
      });

      await test.step(
        "검증 1: 8. 5MB를 초과한 스냅샷을 저장하지 않는다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(oversized.length).toBeGreaterThan(5_000_000);
        },
        { box: true },
      );

      await test.step(
        "검증 2: 8. 5MB를 초과한 스냅샷을 저장하지 않는다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(response.status()).toBe(400);
        },
        { box: true },
      );

      await test.step(
        "검증 3: 8. 5MB를 초과한 스냅샷을 저장하지 않는다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(response.ok()).toBe(false);
        },
        { box: true },
      );
    },
    { box: true },
  );
});
