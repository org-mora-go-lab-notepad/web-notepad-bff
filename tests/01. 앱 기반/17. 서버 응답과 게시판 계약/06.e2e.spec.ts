import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { authenticate, origin } from "../../__util__";

test("6. 깨진 JSON 알림 읽음 요청을 거부한다", async ({ page, context }) => {
  await test.step(
    "시나리오: 6. 깨진 JSON 알림 읽음 요청을 거부한다 — 준비 조건부터 공개 UI 또는 API 실행과 사용자 결과 검증까지 독립적으로 추적한다",
    async () => {
      await test.step(
        "준비 1: 6. 깨진 JSON 알림 읽음 요청을 거부한다 — 다른 사례와 독립적으로 실행하는 데 필요한 상태와 화면을 먼저 구성한다",
        async () => {
          await authenticate(context);
        },
        { box: true },
      );

      const response = await page.request.post(
        "/api/groups/notifications/read",
        {
          headers: { ...origin, "Content-Type": "application/json" },
          data: "{",
        },
      );

      await test.step(
        "검증 1: 6. 깨진 JSON 알림 읽음 요청을 거부한다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(response.status()).toBe(400);
        },
        { box: true },
      );

      await test.step(
        "검증 2: 6. 깨진 JSON 알림 읽음 요청을 거부한다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(response.ok()).toBe(false);
        },
        { box: true },
      );

      await test.step(
        "검증 3: 6. 깨진 JSON 알림 읽음 요청을 거부한다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(response.headers()["content-type"]).toContain(
            "application/json",
          );
        },
        { box: true },
      );
    },
    { box: true },
  );
});
