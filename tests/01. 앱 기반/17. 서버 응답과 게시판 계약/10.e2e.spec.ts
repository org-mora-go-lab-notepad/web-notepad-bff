import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

test("10. 게시판은 지원하지 않는 POST 메서드를 405로 거부한다", async ({
  request,
}) => {
  await test.step(
    "시나리오: 10. 게시판은 지원하지 않는 POST 메서드를 405로 거부한다 — 준비 조건부터 공개 UI 또는 API 실행과 사용자 결과 검증까지 독립적으로 추적한다",
    async () => {
      const response = await request.post("/api/board");

      const body = await response.text();

      await test.step(
        "검증 1: 10. 게시판은 지원하지 않는 POST 메서드를 405로 거부한다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(response.status()).toBe(405);
        },
        { box: true },
      );

      await test.step(
        "검증 2: 10. 게시판은 지원하지 않는 POST 메서드를 405로 거부한다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(response.ok()).toBe(false);
        },
        { box: true },
      );

      await test.step(
        "검증 3: 10. 게시판은 지원하지 않는 POST 메서드를 405로 거부한다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(body).toBe("");
        },
        { box: true },
      );

      await test.step(
        "검증 4: 10. 게시판은 지원하지 않는 POST 메서드를 405로 거부한다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(response.headers()["cache-control"]).toBeUndefined();
        },
        { box: true },
      );
    },
    { box: true },
  );
});
