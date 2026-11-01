import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { getApi } from "../../__util__";

test("1. 비로그인 사용자는 개인 이력을 조회할 수 없다", async ({ request }) => {
  await test.step(
    "시나리오: 1. 비로그인 사용자는 개인 이력을 조회할 수 없다 — 준비 조건부터 공개 UI 또는 API 실행과 사용자 결과 검증까지 독립적으로 추적한다",
    async () => {
      const response = await getApi(request, "/api/notepad/history");

      await test.step(
        "검증 1: 1. 비로그인 사용자는 개인 이력을 조회할 수 없다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(response.status()).toBe(401);
        },
        { box: true },
      );

      await test.step(
        "검증 2: 1. 비로그인 사용자는 개인 이력을 조회할 수 없다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(response.ok()).toBe(false);
        },
        { box: true },
      );

      await test.step(
        "검증 3: 1. 비로그인 사용자는 개인 이력을 조회할 수 없다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(response.headers()["content-type"]).toContain(
            "application/json",
          );
        },
        { box: true },
      );

      const payload = await response.json();

      await test.step(
        "검증 4: 1. 비로그인 사용자는 개인 이력을 조회할 수 없다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(payload).toBeTruthy();
        },
        { box: true },
      );

      await test.step(
        "검증 5: 1. 비로그인 사용자는 개인 이력을 조회할 수 없다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(payload).not.toHaveProperty("latest");
        },
        { box: true },
      );
    },
    { box: true },
  );
});
