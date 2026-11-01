import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { getApi } from "../../__util__/request";

test("1. 비로그인 사용자는 이력을 조회하거나 저장할 수 없다", async ({
  request,
}) => {
  await test.step(
    "시나리오: 3. 비로그인 사용자는 이력을 조회하거나 저장할 수 없다 — 준비 조건부터 공개 UI 또는 API 실행과 사용자 결과 검증까지 독립적으로 추적한다",
    async () => {
      const read = await getApi(request, "/api/notepad/history");

      await test.step(
        "검증 1: 3. 비로그인 사용자는 이력을 조회하거나 저장할 수 없다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(read.status()).toBe(401);
        },
        { box: true },
      );

      const write = await request.post("/api/notepad/history", {
        data: { eventId: crypto.randomUUID(), snapshot: "{}" },
      });

      await test.step(
        "검증 2: 3. 비로그인 사용자는 이력을 조회하거나 저장할 수 없다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(write.status()).toBe(401);
        },
        { box: true },
      );
    },
    { box: true },
  );
});
