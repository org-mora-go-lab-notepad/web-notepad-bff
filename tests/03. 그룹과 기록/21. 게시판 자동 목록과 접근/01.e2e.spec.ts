import { expect } from "@playwright/test";

import { boardTest as test } from "../../__fixture__";
import { getApi } from "../../__util__/request";

test("1. 게시판 쓰기 API는 role 파라미터와 관계없이 제공하지 않는다", async ({
  request,
  boardPost,
}) => {
  for (const suffix of ["", "?role=admin"])
    for (const method of ["POST", "PATCH", "DELETE"]) {
      const response = await request.fetch("/api/board" + suffix, {
        method,
        data: { id: boardPost.id, title: "Changed" },
      });
      expect(response.status()).toBe(405);
    }
  const { posts } = await (await getApi(request, "/api/board")).json();
  expect(
    posts.find((post: { id: string }) => post.id === boardPost.id).title,
  ).toBe(boardPost.title);
});
