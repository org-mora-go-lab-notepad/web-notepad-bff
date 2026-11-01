import type { BoardPost } from "@/src/4-entity/notepad";

import { getApi } from "../__util__/request";
import { apiTest as base } from "./api";
import { SESSION_COOKIE, signedSession } from "./auth";
import { createGroupFixture, createTabFixture } from "./notepad-state";

export const boardTest = base.extend<{
  boardPost: BoardPost;
  boardOwnerToken: string;
}>({
  boardOwnerToken: async ({}, provide) => {
    await provide(
      signedSession({
        id: crypto.randomUUID(),
        nickname: "Board owner",
        expiresAt: Date.now() + 300_000,
      }),
    );
  },
  boardPost: async ({ request, boardOwnerToken }, provide) => {
    const suffix = crypto.randomUUID(),
      title = "Community " + suffix;
    const headers = { Cookie: SESSION_COOKIE + "=" + boardOwnerToken };
    const shared = await request.post("/api/groups/share", {
      headers,
      data: {
        group: createGroupFixture("board-" + suffix, title, [
          createTabFixture(
            "note-" + suffix,
            "Private shared note body\nSelected shared line\nFinal shared line",
            { selectedLines: [1] },
          ),
          createTabFixture(
            "follow-up-" + suffix,
            "Follow-up shared note body",
            {
              bookmarked: true,
            },
          ),
          createTabFixture("empty-" + suffix, ""),
          createTabFixture("one-character-" + suffix, "-"),
          createTabFixture("two-characters-" + suffix, "ab"),
          createTabFixture("three-characters-" + suffix, "abc"),
          createTabFixture(
            "overflow-" + suffix,
            [
              "Overflow verification shared note with a deliberately long title",
              ...Array.from(
                { length: 48 },
                (_, index) => `Scrollable shared note line ${index + 1}`,
              ),
            ].join("\n"),
          ),
        ]),
      },
    });
    if (!shared.ok())
      throw Error("Cannot prepare shared group: " + shared.status());
    const { group } = await shared.json();
    const { posts } = (await (await getApi(request, "/api/board")).json()) as {
      posts: BoardPost[];
    };
    const post = posts.find((item) => item.id === group.id);
    if (!post) throw Error("Shared group is missing from the board");
    try {
      await provide(post);
    } finally {
      await request.post("/api/groups/revoke", {
        headers,
        data: { id: group.id },
      });
    }
  },
});
