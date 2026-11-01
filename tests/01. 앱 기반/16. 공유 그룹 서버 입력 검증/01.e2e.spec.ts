import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { invalidGroupBase, origin } from "../../__util__";

test("1. 비로그인 공유 생성 요청을 거부한다", async ({ request }) => {
  await test.step(
    "시나리오: 1. 비로그인 공유 생성 요청을 거부한다 — 준비 조건부터 공개 UI 또는 API 실행과 사용자 결과 검증까지 독립적으로 추적한다",
    async () => {
      const response = await request.post("/api/groups/share", {
        headers: origin,
        data: invalidGroupBase,
      });

      await test.step(
        "검증 1: 1. 비로그인 공유 생성 요청을 거부한다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(response.status()).toBe(401);
        },
        { box: true },
      );

      await test.step(
        "검증 2: 1. 비로그인 공유 생성 요청을 거부한다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(response.ok()).toBe(false);
        },
        { box: true },
      );

      await test.step(
        "검증 3: 1. 비로그인 공유 생성 요청을 거부한다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(response.headers()["content-type"]).toContain(
            "application/json",
          );
        },
        { box: true },
      );

      await test.step(
        "검증 4: 1. 비로그인 공유 생성 요청을 거부한다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(await response.json()).toBeTruthy();
        },
        { box: true },
      );
    },
    { box: true },
  );
});
