import { expect } from "@playwright/test";

import {
  apiTest as test,
  SESSION_COOKIE,
  signedSession,
} from "@/tests/__fixture__";

import { getApi } from "../../__util__";

test("9. role admin 쿼리는 게시판 응답에 관리자 권한을 추가하지 않는다", async ({
  page,
}) => {
  await test.step(
    "시나리오: 9. role admin 쿼리는 게시판 응답에 관리자 권한을 추가하지 않는다 — 준비 조건부터 공개 UI 또는 API 실행과 사용자 결과 검증까지 독립적으로 추적한다",
    async () => {
      const token = signedSession({
        id: "admin-query-reader",
        nickname: "Reader",
        expiresAt: Date.now() + 60_000,
      });
      const response = await getApi(page.request, "/api/board?role=admin", {
        headers: { Cookie: SESSION_COOKIE + "=" + token },
      });

      const payload = await response.json();

      const posts = payload.posts as Record<string, unknown>[];

      await test.step(
        "검증 1: 9. role admin 쿼리는 게시판 응답에 관리자 권한을 추가하지 않는다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(response.status()).toBe(200);
        },
        { box: true },
      );

      await test.step(
        "검증 2: 9. role admin 쿼리는 게시판 응답에 관리자 권한을 추가하지 않는다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(Array.isArray(posts)).toBe(true);
        },
        { box: true },
      );

      await test.step(
        "검증 3: 9. role admin 쿼리는 게시판 응답에 관리자 권한을 추가하지 않는다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(posts.every((post) => !("admin" in post))).toBe(true);
        },
        { box: true },
      );

      await test.step(
        "검증 4: 9. role admin 쿼리는 게시판 응답에 관리자 권한을 추가하지 않는다 — PRD에 기록된 사용자 결과를 이 파일의 assertion으로 직접 확인한다",
        async () => {
          expect(posts.every((post) => !("role" in post))).toBe(true);
        },
        { box: true },
      );
    },
    { box: true },
  );
});
