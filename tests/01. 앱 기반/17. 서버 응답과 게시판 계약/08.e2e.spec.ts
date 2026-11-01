import { expect } from "@playwright/test";

import { apiTest as test } from "@/tests/__fixture__";

import { getApi } from "../../__util__";

test("8. 익명 게시판 조회는 no-store posts 배열을 반환한다", async ({
  request,
}) => {
  await test.step(
    "시나리오: 8. 익명 게시판 조회는 no-store posts 배열을 반환한다 — 준비 조건부터 공개 UI 또는 API 실행과 사용자 결과 검증까지 독립적으로 추적한다",
    async () => {
      const response = await getApi(request, "/api/board");

      const payload = await response.json();

      await test.step(
        "검증 1: 8. 익명 게시판 조회는 no-store posts 배열을 반환한다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(response.status()).toBe(200);
        },
        { box: true },
      );

      await test.step(
        "검증 2: 8. 익명 게시판 조회는 no-store posts 배열을 반환한다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(response.ok()).toBe(true);
        },
        { box: true },
      );

      await test.step(
        "검증 3: 8. 익명 게시판 조회는 no-store posts 배열을 반환한다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(response.headers()["cache-control"]).toBe("no-store");
        },
        { box: true },
      );

      await test.step(
        "검증 4: 8. 익명 게시판 조회는 no-store posts 배열을 반환한다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(Array.isArray(payload.posts)).toBe(true);
        },
        { box: true },
      );

      await test.step(
        "검증 5: 8. 익명 게시판 조회는 no-store posts 배열을 반환한다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(payload).not.toHaveProperty("user");
        },
        { box: true },
      );
    },
    { box: true },
  );
});
